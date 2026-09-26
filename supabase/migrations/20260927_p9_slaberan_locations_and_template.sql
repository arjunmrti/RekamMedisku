-- Package 9 — Slaberan location workspace + template data model
-- Locations are user-owned and hierarchical:
--   floor -> ward
--   special units stay top-level.
-- Patient location IDs are optional for legacy rows but become authoritative
-- for new location-aware data.

CREATE TABLE IF NOT EXISTS public.slaberan_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.slaberan_locations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('floor', 'ward', 'special')),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slaberan_locations_user_parent_order_idx
  ON public.slaberan_locations (user_id, parent_id, sort_order, name);

CREATE UNIQUE INDEX IF NOT EXISTS slaberan_locations_user_root_unique
  ON public.slaberan_locations (user_id, type, lower(btrim(name)))
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS slaberan_locations_user_parent_unique
  ON public.slaberan_locations (user_id, parent_id, lower(btrim(name)))
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.slaberan_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slaberan_locations_select_own ON public.slaberan_locations;
CREATE POLICY slaberan_locations_select_own
  ON public.slaberan_locations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_locations_insert_own ON public.slaberan_locations;
CREATE POLICY slaberan_locations_insert_own
  ON public.slaberan_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_locations_update_own ON public.slaberan_locations;
CREATE POLICY slaberan_locations_update_own
  ON public.slaberan_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_locations_delete_own ON public.slaberan_locations;
CREATE POLICY slaberan_locations_delete_own
  ON public.slaberan_locations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Preserve existing patient records by creating a flat location record from
-- legacy room data where no explicit location record exists yet. The user can
-- later organize those locations into floors without inventing a historical floor.
INSERT INTO public.slaberan_locations (
  user_id,
  parent_id,
  type,
  name
)
SELECT DISTINCT
  p.user_id,
  NULL,
  CASE
    WHEN p.current_location_type = 'special' THEN 'special'
    ELSE 'ward'
  END,
  btrim(COALESCE(NULLIF(p.current_location_name, ''), p.room))
FROM public.patients p
WHERE p.user_id IS NOT NULL
  AND btrim(COALESCE(NULLIF(p.current_location_name, ''), p.room)) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS current_location_id uuid,
  ADD COLUMN IF NOT EXISTS admission_location_id uuid;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_current_location_id_fkey;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_current_location_id_fkey
  FOREIGN KEY (current_location_id)
  REFERENCES public.slaberan_locations(id)
  ON DELETE SET NULL;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_admission_location_id_fkey;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_admission_location_id_fkey
  FOREIGN KEY (admission_location_id)
  REFERENCES public.slaberan_locations(id)
  ON DELETE SET NULL;

UPDATE public.patients p
SET current_location_id = l.id
FROM public.slaberan_locations l
WHERE p.current_location_id IS NULL
  AND l.user_id = p.user_id
  AND lower(btrim(l.name)) =
      lower(btrim(COALESCE(NULLIF(p.current_location_name, ''), p.room)))
  AND l.type =
      CASE
        WHEN p.current_location_type = 'special' THEN 'special'
        ELSE 'ward'
      END;

UPDATE public.patients p
SET admission_location_id = l.id
FROM public.slaberan_locations l
WHERE p.admission_location_id IS NULL
  AND p.admission_location_name IS NOT NULL
  AND btrim(p.admission_location_name) <> ''
  AND l.user_id = p.user_id
  AND lower(btrim(l.name)) = lower(btrim(p.admission_location_name))
  AND l.type =
      CASE
        WHEN p.admission_location_type = 'special' THEN 'special'
        ELSE 'ward'
      END;

CREATE TABLE IF NOT EXISTS public.slaberan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  doctor text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT '',
  hospital text NOT NULL DEFAULT '',
  opening text NOT NULL DEFAULT '',
  show_empty_rooms boolean NOT NULL DEFAULT true,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS slaberan_templates_user_name_unique
  ON public.slaberan_templates (user_id, lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS slaberan_templates_user_default_unique
  ON public.slaberan_templates (user_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS slaberan_templates_user_updated_idx
  ON public.slaberan_templates (user_id, updated_at DESC);

ALTER TABLE public.slaberan_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slaberan_templates_select_own ON public.slaberan_templates;
CREATE POLICY slaberan_templates_select_own
  ON public.slaberan_templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_templates_insert_own ON public.slaberan_templates;
CREATE POLICY slaberan_templates_insert_own
  ON public.slaberan_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_templates_update_own ON public.slaberan_templates;
CREATE POLICY slaberan_templates_update_own
  ON public.slaberan_templates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS slaberan_templates_delete_own ON public.slaberan_templates;
CREATE POLICY slaberan_templates_delete_own
  ON public.slaberan_templates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.slaberan_locations, public.slaberan_templates
  TO authenticated;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO authenticated;
