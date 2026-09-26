-- P2 follow-up numbering safety
-- Prevent two concurrent browsers from creating the same follow-up number
-- for the same patient.

DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT count(*)
    INTO duplicate_groups
  FROM (
    SELECT patient_id, number
    FROM public.follow_ups
    GROUP BY patient_id, number
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'P2 migration stopped: % duplicate follow-up number group(s) exist. Reconcile duplicate rows before applying the unique index.',
      duplicate_groups;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS follow_ups_patient_number_unique
  ON public.follow_ups (patient_id, number);
