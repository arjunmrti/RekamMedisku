-- Package 10 — harden Slaberan hierarchy and default-template invariants
-- Prevent invalid parent types/cycles and make database-side default selection safe.

CREATE OR REPLACE FUNCTION public.validate_slaberan_location_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $slaberan$
DECLARE
  ancestor_id uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    IF NEW.type = 'ward' THEN
      RAISE EXCEPTION 'Bangsal harus berada di bawah lantai.';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.slaberan_locations parent
    WHERE parent.id = NEW.parent_id
      AND parent.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Parent lokasi tidak ditemukan dalam workspace pengguna.';
  END IF;

  IF NEW.type = 'floor' THEN
    RAISE EXCEPTION 'Lantai tidak boleh memiliki parent.';
  END IF;

  IF NEW.type = 'special' THEN
    RAISE EXCEPTION 'Unit khusus harus berada di level teratas.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.slaberan_locations parent
    WHERE parent.id = NEW.parent_id
      AND parent.type = 'floor'
  ) THEN
    RAISE EXCEPTION 'Bangsal hanya dapat berada di bawah lantai.';
  END IF;

  ancestor_id := NEW.parent_id;

  WHILE ancestor_id IS NOT NULL LOOP
    IF ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Hierarki lokasi tidak boleh membentuk siklus.';
    END IF;

    SELECT parent_id
      INTO ancestor_id
    FROM public.slaberan_locations
    WHERE id = ancestor_id;
  END LOOP;

  RETURN NEW;
END;
$slaberan$;

DROP TRIGGER IF EXISTS trg_validate_slaberan_location_parent
  ON public.slaberan_locations;

CREATE TRIGGER trg_validate_slaberan_location_parent
  BEFORE INSERT OR UPDATE OF parent_id, user_id, type
  ON public.slaberan_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_slaberan_location_parent();

-- Deleting a floor with children should fail instead of cascading the entire
-- location tree. Patient links still use ON DELETE SET NULL.
ALTER TABLE public.slaberan_locations
  DROP CONSTRAINT IF EXISTS slaberan_locations_parent_id_fkey;

ALTER TABLE public.slaberan_locations
  ADD CONSTRAINT slaberan_locations_parent_id_fkey
  FOREIGN KEY (parent_id)
  REFERENCES public.slaberan_locations(id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.enforce_slaberan_single_default_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $slaberan$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.slaberan_templates
    SET is_default = false,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$slaberan$;

DROP TRIGGER IF EXISTS trg_enforce_slaberan_single_default_template
  ON public.slaberan_templates;

CREATE TRIGGER trg_enforce_slaberan_single_default_template
  BEFORE INSERT OR UPDATE OF is_default, user_id
  ON public.slaberan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_slaberan_single_default_template();

GRANT EXECUTE
  ON FUNCTION
    public.validate_slaberan_location_parent(),
    public.enforce_slaberan_single_default_template()
  TO authenticated;

-- Harden pre-existing public trigger functions and avoid exposing the
-- SECURITY DEFINER event-trigger helper through the Data API.
ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Cover the existing supporting-exams ownership foreign key.
CREATE INDEX IF NOT EXISTS supporting_exams_user_id_idx
  ON public.supporting_exams (user_id);

CREATE INDEX IF NOT EXISTS patients_current_location_id_idx
  ON public.patients (current_location_id);

CREATE INDEX IF NOT EXISTS patients_admission_location_id_idx
  ON public.patients (admission_location_id);

CREATE INDEX IF NOT EXISTS slaberan_locations_parent_id_idx
  ON public.slaberan_locations (parent_id);

-- Evaluate auth.uid() once per statement rather than once per row.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view own rotations" ON public.rotations;
CREATE POLICY "Users can view own rotations"
  ON public.rotations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own rotations" ON public.rotations;
CREATE POLICY "Users can insert own rotations"
  ON public.rotations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own rotations" ON public.rotations;
CREATE POLICY "Users can update own rotations"
  ON public.rotations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own rotations" ON public.rotations;
CREATE POLICY "Users can delete own rotations"
  ON public.rotations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
CREATE POLICY "Users can view own patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
CREATE POLICY "Users can insert own patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
CREATE POLICY "Users can update own patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;
CREATE POLICY "Users can delete own patients"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own follow ups" ON public.follow_ups;
CREATE POLICY "Users can view own follow ups"
  ON public.follow_ups
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own follow ups" ON public.follow_ups;
CREATE POLICY "Users can insert own follow ups"
  ON public.follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own follow ups" ON public.follow_ups;
CREATE POLICY "Users can update own follow ups"
  ON public.follow_ups
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own follow ups" ON public.follow_ups;
CREATE POLICY "Users can delete own follow ups"
  ON public.follow_ups
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own supporting exams" ON public.supporting_exams;
CREATE POLICY "Users can view own supporting exams"
  ON public.supporting_exams
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own supporting exams" ON public.supporting_exams;
CREATE POLICY "Users can insert own supporting exams"
  ON public.supporting_exams
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own supporting exams" ON public.supporting_exams;
CREATE POLICY "Users can update own supporting exams"
  ON public.supporting_exams
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own supporting exams" ON public.supporting_exams;
CREATE POLICY "Users can delete own supporting exams"
  ON public.supporting_exams
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
