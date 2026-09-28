-- MU-005 CI fixture
--
-- Isolated test schema for tenant-boundary regression tests. This is NOT a
-- production baseline and must never be deployed to a real Supabase project.
-- It models the tenant contract that the live application relies on, then CI
-- applies the production Phase 0 and Storage migrations on top.
--
-- The fixture intentionally defines the existing application tables locally
-- because the repository does not contain a single reproducible baseline for
-- the legacy database schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Mendatang',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX rotations_one_active_per_user
  ON public.rotations (user_id)
  WHERE status = 'Aktif';

CREATE TABLE public.slaberan_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid,
  type text NOT NULL CHECK (type IN ('floor', 'ward', 'special')),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (parent_id, user_id)
    REFERENCES public.slaberan_locations(id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rotation_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  age integer,
  gender text,
  rm text NOT NULL DEFAULT '',
  room text,
  bed text,
  doctor text,
  current_location_id uuid,
  admission_location_id uuid,
  current_location_type text,
  current_location_name text,
  admission_location_type text,
  admission_location_name text,
  status text NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now(),
  admission_date date,
  admission_complaint text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (rotation_id, user_id)
    REFERENCES public.rotations(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  number integer NOT NULL DEFAULT 1,
  date date NOT NULL DEFAULT CURRENT_DATE,
  iso_date date NOT NULL DEFAULT CURRENT_DATE,
  time time NOT NULL DEFAULT CURRENT_TIME,
  status text NOT NULL DEFAULT 'Draf',
  template_type text,
  assessment_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  planning text,
  instruction text,
  subjective text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (patient_id, user_id)
    REFERENCES public.patients(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.supporting_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  exam_type text,
  exam_date date,
  result text,
  attachment_name text,
  attachment_id text,
  attachment_type text,
  attachment_size bigint,
  attachment_count integer,
  icon text NOT NULL DEFAULT 'lab',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (follow_up_id, user_id)
    REFERENCES public.follow_ups(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.slaberan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
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
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

-- Keep location references tenant-safe just like the live Slaberan migration.
CREATE OR REPLACE FUNCTION public.validate_patient_slaberan_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.slaberan_locations location_row
    WHERE location_row.id = NEW.current_location_id
      AND location_row.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Lokasi aktif pasien tidak berada dalam workspace pengguna.';
  END IF;

  IF NEW.admission_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.slaberan_locations location_row
    WHERE location_row.id = NEW.admission_location_id
      AND location_row.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Lokasi masuk pasien tidak berada dalam workspace pengguna.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_patient_slaberan_locations
  BEFORE INSERT OR UPDATE OF user_id, current_location_id, admission_location_id
  ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_patient_slaberan_locations();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slaberan_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slaberan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY rotations_select_own
  ON public.rotations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY rotations_insert_own
  ON public.rotations
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY rotations_update_own
  ON public.rotations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY rotations_delete_own
  ON public.rotations
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY slaberan_locations_select_own
  ON public.slaberan_locations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY slaberan_locations_insert_own
  ON public.slaberan_locations
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY slaberan_locations_update_own
  ON public.slaberan_locations
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY slaberan_locations_delete_own
  ON public.slaberan_locations
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY patients_select_own
  ON public.patients
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY patients_insert_own
  ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY patients_update_own
  ON public.patients
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY patients_delete_own
  ON public.patients
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY follow_ups_select_own
  ON public.follow_ups
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY follow_ups_insert_own
  ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY follow_ups_update_own
  ON public.follow_ups
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY follow_ups_delete_own
  ON public.follow_ups
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY supporting_exams_select_own
  ON public.supporting_exams
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY supporting_exams_insert_own
  ON public.supporting_exams
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY supporting_exams_update_own
  ON public.supporting_exams
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY supporting_exams_delete_own
  ON public.supporting_exams
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY slaberan_templates_select_own
  ON public.slaberan_templates
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY slaberan_templates_insert_own
  ON public.slaberan_templates
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY slaberan_templates_update_own
  ON public.slaberan_templates
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY slaberan_templates_delete_own
  ON public.slaberan_templates
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.profiles,
     public.rotations,
     public.slaberan_locations,
     public.patients,
     public.follow_ups,
     public.supporting_exams,
     public.slaberan_templates
  TO authenticated;

-- The local Supabase stack ships storage.objects already. Storage policies are
-- intentionally replaced in this isolated test database so the production
-- RekamMedisku Storage migration is the only authorization layer under test.
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      policy_name
    );
  END LOOP;
END;
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON storage.objects
  TO authenticated;
