-- Legacy application baseline schema
-- 
-- This migration captures the pre-existing production schema that was deployed
-- before migration tracking began. Subsequent migrations (p3, p5, p8+) assume
-- these tables already exist.
--
-- IMPORTANT: This is a local-only migration to enable `supabase start` from a
-- clean state. The remote Supabase project already has these tables and must
-- NOT apply this migration. Use `supabase db push --include-all` with caution.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Legacy trigger helper whose privilege is tightened by p11 hardening.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$ BEGIN RETURN; END; $$;

CREATE OR REPLACE FUNCTION public.delete_patient_with_history(target_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$ BEGIN RETURN jsonb_build_object('deleted', false); END; $$;

CREATE OR REPLACE FUNCTION public.restore_workspace_backup_v2(p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$ BEGIN RETURN '{}'::jsonb; END; $$;

CREATE OR REPLACE FUNCTION public.upsert_rotation_with_activation(
  p_rotation_id uuid, p_expected_updated_at timestamptz, p_name text,
  p_specialty text, p_start_date date, p_end_date date, p_status text
)
RETURNS TABLE (
  id uuid, user_id uuid, name text, specialty text,
  start_date date, end_date date, status text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$ BEGIN RETURN; END; $$;

CREATE OR REPLACE FUNCTION public.swap_slaberan_locations(p_location_id uuid, p_target_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$ BEGIN RETURN; END; $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Application identity root (already exists in production via earlier deploy)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Rotations table (required by p5_rotation_atomicity_sync and later migrations)
CREATE TABLE IF NOT EXISTS public.rotations (
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

ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rotations_select_own" ON public.rotations;
CREATE POLICY rotations_select_own
  ON public.rotations
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rotations_insert_own" ON public.rotations;
CREATE POLICY rotations_insert_own
  ON public.rotations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rotations_update_own" ON public.rotations;
CREATE POLICY rotations_update_own
  ON public.rotations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rotations_delete_own" ON public.rotations;
CREATE POLICY rotations_delete_own
  ON public.rotations
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Patients table (required by p8_patient_location_restore and later migrations)
CREATE TABLE IF NOT EXISTS public.patients (
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

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY patients_select_own
  ON public.patients
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "patients_insert_own" ON public.patients;
CREATE POLICY patients_insert_own
  ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY patients_update_own
  ON public.patients
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "patients_delete_own" ON public.patients;
CREATE POLICY patients_delete_own
  ON public.patients
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Follow-ups table (required by p4, p8, and mu104+ migrations)
CREATE TABLE IF NOT EXISTS public.follow_ups (
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

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_ups_select_own" ON public.follow_ups;
CREATE POLICY follow_ups_select_own
  ON public.follow_ups
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "follow_ups_insert_own" ON public.follow_ups;
CREATE POLICY follow_ups_insert_own
  ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "follow_ups_update_own" ON public.follow_ups;
CREATE POLICY follow_ups_update_own
  ON public.follow_ups
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "follow_ups_delete_own" ON public.follow_ups;
CREATE POLICY follow_ups_delete_own
  ON public.follow_ups
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Supporting exams table (required by p4 atomic save)
CREATE TABLE IF NOT EXISTS public.supporting_exams (
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

ALTER TABLE public.supporting_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supporting_exams_select_own" ON public.supporting_exams;
CREATE POLICY supporting_exams_select_own
  ON public.supporting_exams
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "supporting_exams_insert_own" ON public.supporting_exams;
CREATE POLICY supporting_exams_insert_own
  ON public.supporting_exams
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "supporting_exams_update_own" ON public.supporting_exams;
CREATE POLICY supporting_exams_update_own
  ON public.supporting_exams
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "supporting_exams_delete_own" ON public.supporting_exams;
CREATE POLICY supporting_exams_delete_own
  ON public.supporting_exams
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.profiles,
     public.rotations,
     public.patients,
     public.follow_ups,
     public.supporting_exams
  TO authenticated;

COMMENT ON TABLE public.rotations IS 
  'Legacy baseline: pre-existing production table captured for local Supabase development.';
