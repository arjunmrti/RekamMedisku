-- Package 3 — Follow-Up Management
-- QA-13: centralize patient deletion so the cloud-side operation is atomic.
-- QA-17: patient follow-up summary is derived from the patient -> follow_ups
-- relationship instead of duplicated patient columns.

CREATE OR REPLACE FUNCTION public.delete_patient_with_history(
  target_patient_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.patients
  WHERE id = target_patient_id
    AND user_id = auth.uid();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_patient_with_history(uuid)
TO authenticated;
