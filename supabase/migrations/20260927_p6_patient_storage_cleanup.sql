-- P6 storage cleanup
-- Patient deletion removes DB metadata through ON DELETE CASCADE. Return only
-- attachment IDs that become unreferenced so the client can delete the matching
-- private Storage objects without touching files still referenced elsewhere.

DROP FUNCTION IF EXISTS public.delete_patient_with_history(uuid);

CREATE FUNCTION public.delete_patient_with_history(
  target_patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  deleted_count integer;
  candidate_attachment_ids text[] := ARRAY[]::text[];
  cleanup_attachment_ids text[] := ARRAY[]::text[];
  attachment_id_item text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  SELECT COALESCE(
    array_agg(DISTINCT se.attachment_id)
      FILTER (WHERE se.attachment_id IS NOT NULL),
    ARRAY[]::text[]
  )
  INTO candidate_attachment_ids
  FROM public.follow_ups fu
  JOIN public.supporting_exams se
    ON se.follow_up_id = fu.id
   AND se.user_id = current_user_id
  WHERE fu.patient_id = target_patient_id
    AND fu.user_id = current_user_id;

  DELETE FROM public.patients
  WHERE id = target_patient_id
    AND user_id = current_user_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count <> 1 THEN
    RETURN jsonb_build_object(
      'deleted', false,
      'attachmentIds', '[]'::jsonb
    );
  END IF;

  FOREACH attachment_id_item IN ARRAY candidate_attachment_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.supporting_exams
      WHERE user_id = current_user_id
        AND attachment_id = attachment_id_item
    ) THEN
      cleanup_attachment_ids := array_append(
        cleanup_attachment_ids,
        attachment_id_item
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'deleted', true,
    'attachmentIds', to_jsonb(cleanup_attachment_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_patient_with_history(uuid)
TO authenticated;
