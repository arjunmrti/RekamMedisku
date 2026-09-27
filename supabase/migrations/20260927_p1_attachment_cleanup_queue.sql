-- P1 storage cleanup
-- Queue attachment references removed from cloud DB records and expose a
-- durable, user-scoped cleanup flow for the private Storage bucket.

CREATE TABLE IF NOT EXISTS public.attachment_cleanup_queue (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attachment_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attachment_id)
);

CREATE INDEX IF NOT EXISTS attachment_cleanup_queue_created_at_idx
  ON public.attachment_cleanup_queue (created_at);

ALTER TABLE public.attachment_cleanup_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attachment_cleanup_queue_select_own
  ON public.attachment_cleanup_queue;
CREATE POLICY attachment_cleanup_queue_select_own
  ON public.attachment_cleanup_queue
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS attachment_cleanup_queue_insert_own
  ON public.attachment_cleanup_queue;
CREATE POLICY attachment_cleanup_queue_insert_own
  ON public.attachment_cleanup_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS attachment_cleanup_queue_delete_own
  ON public.attachment_cleanup_queue;
CREATE POLICY attachment_cleanup_queue_delete_own
  ON public.attachment_cleanup_queue
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enqueue_attachment_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  IF OLD.user_id = current_user_id
    AND NULLIF(OLD.attachment_id, '') IS NOT NULL THEN
    INSERT INTO public.attachment_cleanup_queue (
      user_id,
      attachment_id
    )
    VALUES (
      current_user_id,
      OLD.attachment_id
    )
    ON CONFLICT (user_id, attachment_id) DO NOTHING;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_attachment_cleanup
  ON public.supporting_exams;

CREATE TRIGGER trg_enqueue_attachment_cleanup
  AFTER DELETE ON public.supporting_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_attachment_cleanup();

CREATE OR REPLACE FUNCTION public.list_pending_attachment_cleanup()
RETURNS TABLE (
  attachment_id text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT q.attachment_id
  FROM public.attachment_cleanup_queue q
  WHERE q.user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1
      FROM public.supporting_exams se
      WHERE se.user_id = q.user_id
        AND se.attachment_id = q.attachment_id
    )
  ORDER BY q.created_at ASC, q.attachment_id ASC;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_attachment_cleanup(
  p_attachment_ids text[]
)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.attachment_cleanup_queue q
    WHERE q.user_id = auth.uid()
      AND q.attachment_id = ANY(COALESCE(p_attachment_ids, ARRAY[]::text[]))
      AND NOT EXISTS (
        SELECT 1
        FROM public.supporting_exams se
        WHERE se.user_id = q.user_id
          AND se.attachment_id = q.attachment_id
      )
    RETURNING 1
  )
  SELECT count(*)::integer
  FROM deleted;
$$;

GRANT EXECUTE
  ON FUNCTION public.enqueue_attachment_cleanup(),
  public.list_pending_attachment_cleanup(),
  public.acknowledge_attachment_cleanup(text[])
  TO authenticated;
