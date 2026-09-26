-- Package 2 — Patient Management
-- QA-03: allow deleting a patient together with synced history.
-- QA-04: enforce unique medical-record number per user + rotation.

-- Do not silently discard existing duplicate patients. Stop the migration and
-- let the owner reconcile those records first.
DO $$
DECLARE
  duplicate_groups integer;
  null_user_rows integer;
BEGIN
  SELECT count(*)
    INTO duplicate_groups
  FROM (
    SELECT user_id, rotation_id, lower(btrim(rm))
    FROM public.patients
    GROUP BY user_id, rotation_id, lower(btrim(rm))
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Package 2 migration stopped: % duplicate patient identity group(s) exist. Reconcile duplicate rows before applying the unique index.',
      duplicate_groups;
  END IF;

  SELECT count(*)
    INTO null_user_rows
  FROM public.patients
  WHERE user_id IS NULL;

  IF null_user_rows > 0 THEN
    RAISE EXCEPTION
      'Package 2 migration stopped: % patient row(s) have NULL user_id. Assign the correct authenticated user before applying the constraint.',
      null_user_rows;
  END IF;
END
$$;

ALTER TABLE public.patients
  ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patients_user_rotation_rm_unique
  ON public.patients (user_id, rotation_id, lower(btrim(rm)));

-- Follow-ups must disappear with their patient.
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name
    INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.constraint_schema = tc.constraint_schema
  WHERE tc.constraint_schema = 'public'
    AND tc.table_name = 'follow_ups'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'patient_id'
  ORDER BY tc.constraint_name
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.follow_ups DROP CONSTRAINT %I',
      fk_name
    );
  END IF;

  ALTER TABLE public.follow_ups
    DROP CONSTRAINT IF EXISTS follow_ups_patient_id_fkey;

  ALTER TABLE public.follow_ups
    ADD CONSTRAINT follow_ups_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;
END
$$;

-- Supporting exams must disappear with their follow-up.
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name
    INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.constraint_schema = tc.constraint_schema
  WHERE tc.constraint_schema = 'public'
    AND tc.table_name = 'supporting_exams'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'follow_up_id'
  ORDER BY tc.constraint_name
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.supporting_exams DROP CONSTRAINT %I',
      fk_name
    );
  END IF;

  ALTER TABLE public.supporting_exams
    DROP CONSTRAINT IF EXISTS supporting_exams_follow_up_id_fkey;

  ALTER TABLE public.supporting_exams
    ADD CONSTRAINT supporting_exams_follow_up_id_fkey
    FOREIGN KEY (follow_up_id)
    REFERENCES public.follow_ups(id)
    ON DELETE CASCADE;
END
$$;
