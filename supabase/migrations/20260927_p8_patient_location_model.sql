-- Package 8 — Patient location model
-- Adds explicit current-location and admission-location context while keeping
-- the legacy room column as a compatibility field for existing UI/data.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS current_location_type text,
  ADD COLUMN IF NOT EXISTS current_location_name text,
  ADD COLUMN IF NOT EXISTS admission_location_type text,
  ADD COLUMN IF NOT EXISTS admission_location_name text;

UPDATE public.patients
SET
  current_location_name = COALESCE(
    NULLIF(btrim(current_location_name), ''),
    NULLIF(btrim(room), '')
  ),
  current_location_type = COALESCE(
    NULLIF(btrim(current_location_type), ''),
    CASE
      WHEN lower(btrim(room)) IN ('icu', 'igd', 'cvcu/iccu', 'cvcu', 'iccu')
        THEN 'special'
      ELSE 'ward'
    END
  )
WHERE current_location_name IS NULL
   OR btrim(current_location_name) = ''
   OR current_location_type IS NULL
   OR btrim(current_location_type) = '';

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_current_location_type_check;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_current_location_type_check
  CHECK (
    current_location_type IS NULL
    OR current_location_type IN ('ward', 'special')
  );

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_admission_location_type_check;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_admission_location_type_check
  CHECK (
    admission_location_type IS NULL
    OR admission_location_type IN ('ward', 'special')
  );

COMMENT ON COLUMN public.patients.room IS
  'Legacy room name kept for backward compatibility; current_location_name is authoritative for new writes.';

COMMENT ON COLUMN public.patients.current_location_type IS
  'Current location classification: ward or special.';

COMMENT ON COLUMN public.patients.current_location_name IS
  'Current ward/room or special unit name.';

COMMENT ON COLUMN public.patients.admission_location_type IS
  'Optional location classification where the patient first entered the hospital.';

COMMENT ON COLUMN public.patients.admission_location_name IS
  'Optional location where the patient first entered the hospital.';
