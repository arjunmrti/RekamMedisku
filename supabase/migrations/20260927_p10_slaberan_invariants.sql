-- Package 10 — harden Slaberan hierarchy and default-template invariants
-- Prevent invalid parent types/cycles and make database-side default selection safe.

CREATE OR REPLACE FUNCTION public.validate_slaberan_location_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

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
AS $$
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
$$;

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
