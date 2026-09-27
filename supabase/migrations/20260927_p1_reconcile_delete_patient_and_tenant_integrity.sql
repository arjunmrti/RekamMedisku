-- P1 reconciliation: database contract + tenant relationship integrity
-- Applied to the live RekamMedisku Supabase project as:
-- p1_reconcile_delete_patient_and_tenant_integrity

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
      cleanup_attachment_ids = array_append(
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

ALTER TABLE public.rotations
  DROP CONSTRAINT IF EXISTS rotations_id_user_unique;

ALTER TABLE public.rotations
  ADD CONSTRAINT rotations_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_id_user_unique;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_id_user_unique;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_rotation_user_fkey;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_rotation_user_fkey
  FOREIGN KEY (rotation_id, user_id)
  REFERENCES public.rotations (id, user_id)
  ON DELETE CASCADE;

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_patient_user_fkey;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_patient_user_fkey
  FOREIGN KEY (patient_id, user_id)
  REFERENCES public.patients (id, user_id)
  ON DELETE CASCADE;

ALTER TABLE public.supporting_exams
  DROP CONSTRAINT IF EXISTS supporting_exams_follow_up_user_fkey;

ALTER TABLE public.supporting_exams
  ADD CONSTRAINT supporting_exams_follow_up_user_fkey
  FOREIGN KEY (follow_up_id, user_id)
  REFERENCES public.follow_ups (id, user_id)
  ON DELETE CASCADE;

ALTER TABLE public.slaberan_locations
  DROP CONSTRAINT IF EXISTS slaberan_locations_id_user_unique;

ALTER TABLE public.slaberan_locations
  ADD CONSTRAINT slaberan_locations_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.slaberan_locations
  DROP CONSTRAINT IF EXISTS slaberan_locations_parent_id_fkey;

ALTER TABLE public.slaberan_locations
  DROP CONSTRAINT IF EXISTS slaberan_locations_parent_user_fkey;

ALTER TABLE public.slaberan_locations
  ADD CONSTRAINT slaberan_locations_parent_user_fkey
  FOREIGN KEY (parent_id, user_id)
  REFERENCES public.slaberan_locations (id, user_id)
  ON DELETE RESTRICT;
