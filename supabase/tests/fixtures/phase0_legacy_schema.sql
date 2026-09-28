-- Phase 0 CI fixture
--
-- This is NOT a production baseline and must never be deployed to a real
-- Supabase project. It models only the legacy objects that Phase 0 explicitly
-- depends on or regression-tests. Keeping the fixture outside supabase/
-- migrations means production deploys cannot accidentally pick it up.
--
-- The CI workflow copies this file into an isolated temporary Supabase project
-- as the first migration, then applies the real Phase 0 migration on top.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The Supabase local stack supplies the auth schema, auth.users table, roles,
-- and auth.uid() helper. The fixture intentionally does not modify that
-- protected schema.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Application identity root.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Existing tenant-owned application entities. Only their structural tenant
-- contract is needed by the Phase 0 regression suite.
CREATE TABLE public.rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  UNIQUE (id, user_id)
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rotation_id uuid NOT NULL,
  UNIQUE (id, user_id),
  FOREIGN KEY (rotation_id, user_id)
    REFERENCES public.rotations(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  UNIQUE (id, user_id),
  FOREIGN KEY (patient_id, user_id)
    REFERENCES public.patients(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.supporting_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL,
  UNIQUE (id, user_id),
  FOREIGN KEY (follow_up_id, user_id)
    REFERENCES public.follow_ups(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.slaberan_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid,
  UNIQUE (id, user_id),
  FOREIGN KEY (parent_id, user_id)
    REFERENCES public.slaberan_locations(id, user_id)
    ON DELETE CASCADE
);

CREATE TABLE public.slaberan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  UNIQUE (id, user_id)
);

ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slaberan_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slaberan_templates ENABLE ROW LEVEL SECURITY;
