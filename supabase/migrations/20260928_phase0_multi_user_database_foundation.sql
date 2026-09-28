-- Phase 0 — Multi-user database foundation
-- Purpose:
--   1. Make application profiles a backend-provisioned tenant identity row.
--   2. Add user-owned application identity fields needed by future report generation.
--   3. Introduce generic user-owned template + versioned definition storage.
--   4. Enforce template tenant ownership with RLS and a composite foreign key.
--
-- IMPORTANT:
--   This migration deliberately does NOT bind rotations/follow-ups to the new
--   template tables yet. That belongs to the template workflow phase so the
--   current production flow remains backward-compatible.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Profile contract preflight
-- ---------------------------------------------------------------------------
-- public.profiles is already part of the live application schema. We refuse
-- to guess its legacy contract. This makes the migration fail early instead
-- of partially provisioning users against an unknown profile shape.
DO $$
DECLARE
  required_without_default text;
  profiles_has_pk boolean;
  profiles_has_auth_fk boolean;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION
      'Phase 0 stopped: public.profiles does not exist. Reconcile the base schema before applying this migration.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE c.contype = 'p'
      AND n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.conkey = ARRAY[
        (
          SELECT a.attnum
          FROM pg_attribute a
          WHERE a.attrelid = t.oid
            AND a.attname = 'id'
            AND NOT a.attisdropped
        )
      ]
  )
  INTO profiles_has_pk;

  IF NOT profiles_has_pk THEN
    RAISE EXCEPTION
      'Phase 0 stopped: public.profiles.id must be the primary key because it is the application identity root.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class child_table
      ON child_table.oid = c.conrelid
    JOIN pg_namespace child_schema
      ON child_schema.oid = child_table.relnamespace
    JOIN pg_class parent_table
      ON parent_table.oid = c.confrelid
    JOIN pg_namespace parent_schema
      ON parent_schema.oid = parent_table.relnamespace
    WHERE c.contype = 'f'
      AND child_schema.nspname = 'public'
      AND child_table.relname = 'profiles'
      AND parent_schema.nspname = 'auth'
      AND parent_table.relname = 'users'
      AND c.conkey = ARRAY[
        (
          SELECT a.attnum
          FROM pg_attribute a
          WHERE a.attrelid = child_table.oid
            AND a.attname = 'id'
            AND NOT a.attisdropped
        )
      ]
      AND c.confkey = ARRAY[
        (
          SELECT a.attnum
          FROM pg_attribute a
          WHERE a.attrelid = parent_table.oid
            AND a.attname = 'id'
            AND NOT a.attisdropped
        )
      ]
  )
  INTO profiles_has_auth_fk;

  IF NOT profiles_has_auth_fk THEN
    RAISE EXCEPTION
      'Phase 0 stopped: public.profiles.id must reference auth.users.id before profile provisioning can become database-owned.';
  END IF;

  -- Never silently invent values for an unknown required legacy column. A
  -- project-specific required field must be consciously added to the
  -- provisioning contract before this migration can proceed.
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO required_without_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND is_nullable = 'NO'
    AND column_default IS NULL
    AND is_identity = 'NO'
    AND column_name NOT IN (
      'id',
      'name',
      'username',
      'student_id',
      'program',
      'institution'
    );

  IF required_without_default IS NOT NULL THEN
    RAISE EXCEPTION
      'Phase 0 stopped: public.profiles has required column(s) without defaults that provisioning does not know how to populate: %',
      required_without_default;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'name'
  ) THEN
    RAISE EXCEPTION
      'Phase 0 stopped: public.profiles.name is required by the current application identity contract.';
  END IF;
END
$$;

-- Application identity belongs in public.profiles. Authentication remains
-- owned by Supabase Auth.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS student_id text,
  ADD COLUMN IF NOT EXISTS program text,
  ADD COLUMN IF NOT EXISTS institution text;

COMMENT ON COLUMN public.profiles.username IS
  'Application username/display handle. Authentication identity remains owned by Supabase Auth.';

COMMENT ON COLUMN public.profiles.student_id IS
  'Student identifier/stambuk used by user-owned reports.';

COMMENT ON COLUMN public.profiles.program IS
  'Academic/professional program context used by user-owned reports.';

COMMENT ON COLUMN public.profiles.institution IS
  'Institution context used by user-owned reports.';

-- Backfill only from the matching Auth user. Existing non-empty application
-- values always win; no unrelated user's metadata is consulted.
UPDATE public.profiles p
SET
  username = COALESCE(
    NULLIF(BTRIM(p.username), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'username'), ''),
    'user_' || LEFT(REPLACE(u.id::text, '-', ''), 8)
  ),
  student_id = COALESCE(
    NULLIF(BTRIM(p.student_id), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'student_id'), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'stambuk'), '')
  ),
  program = COALESCE(
    NULLIF(BTRIM(p.program), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'program'), '')
  ),
  institution = COALESCE(
    NULLIF(BTRIM(p.institution), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'institution'), '')
  ),
  name = COALESCE(
    NULLIF(BTRIM(p.name), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'name'), ''),
    NULLIF(BTRIM(split_part(COALESCE(u.email, ''), '@', 1)), ''),
    p.name
  )
FROM auth.users u
WHERE u.id = p.id;

-- ---------------------------------------------------------------------------
-- 1. Database-owned profile provisioning
-- ---------------------------------------------------------------------------
-- The trigger is intentionally SECURITY DEFINER with an empty search_path.
-- Client roles receive no execute privilege on the function. The Auth INSERT
-- event is the provisioning point, so every new account gets its application
-- identity row before the session is used by the app.
CREATE OR REPLACE FUNCTION public.handle_new_rekammedisku_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_name text;
  profile_username text;
  profile_student_id text;
  profile_program text;
  profile_institution text;
BEGIN
  profile_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(BTRIM(split_part(COALESCE(NEW.email, ''), '@', 1)), ''),
    'Pengguna RekamMedisku'
  );

  profile_username := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    'user_' || LEFT(REPLACE(NEW.id::text, '-', ''), 8)
  );

  profile_student_id := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'student_id'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'stambuk'), '')
  );

  profile_program := NULLIF(
    BTRIM(NEW.raw_user_meta_data ->> 'program'),
    ''
  );

  profile_institution := NULLIF(
    BTRIM(NEW.raw_user_meta_data ->> 'institution'),
    ''
  );

  INSERT INTO public.profiles (
    id,
    name,
    username,
    student_id,
    program,
    institution
  )
  VALUES (
    NEW.id,
    profile_name,
    profile_username,
    profile_student_id,
    profile_program,
    profile_institution
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_rekammedisku_user()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rekammedisku_handle_new_user_profile
  ON auth.users;

CREATE TRIGGER rekammedisku_handle_new_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_rekammedisku_user();

-- ---------------------------------------------------------------------------
-- 2. Generic user-owned template catalog
-- ---------------------------------------------------------------------------
-- Template type is intentionally a CHECK over text, not a PostgreSQL enum.
-- That lets later phases add a new template family without an enum migration.
-- metadata is context only (for example hospital/doctor/specialty/unit), never
-- the tenant boundary.
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('follow_up', 'report')),
  name text NOT NULL
    CHECK (length(BTRIM(name)) > 0),
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS templates_user_type_name_unique
  ON public.templates (
    user_id,
    type,
    lower(btrim(name))
  );

CREATE INDEX IF NOT EXISTS templates_user_updated_idx
  ON public.templates (
    user_id,
    updated_at DESC
  );

COMMENT ON TABLE public.templates IS
  'User-owned template catalog. Definitions live in template_versions so saved history can remain pinned to a specific version.';

COMMENT ON COLUMN public.templates.metadata IS
  'Optional user-owned context such as hospital, doctor, specialty, unit, or other template metadata.';

-- ---------------------------------------------------------------------------
-- 3. Versioned template definitions
-- ---------------------------------------------------------------------------
-- A version row carries the same user_id as its parent template. The composite
-- FK prevents a valid template UUID from being paired with another user's
-- ownership key. Both template levels reference public.profiles so application
-- data has an explicit dependency on the provisioned tenant identity.
CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  template_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  definition jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(definition) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version),
  UNIQUE (id, user_id),
  CONSTRAINT template_versions_template_user_fkey
    FOREIGN KEY (template_id, user_id)
    REFERENCES public.templates(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS template_versions_user_template_version_idx
  ON public.template_versions (
    user_id,
    template_id,
    version DESC
  );

COMMENT ON TABLE public.template_versions IS
  'Versioned, user-owned template definitions. Later phases should append a new version instead of rewriting historical definitions.';

COMMENT ON COLUMN public.template_versions.definition IS
  'Controlled template schema consumed by the future renderer/engine; clinical field semantics are user-defined.';

COMMENT ON COLUMN public.template_versions.schema_version IS
  'Application contract version for template definition format, distinct from the user-facing template version.';

-- ---------------------------------------------------------------------------
-- 4. RLS + grants
-- ---------------------------------------------------------------------------
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_versions FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.templates
  TO authenticated;

-- Template versions are append-only for client/API roles. Editing a template
-- creates the next version; deleting the parent template may still cascade
-- through the foreign key. This keeps version history stable without requiring
-- a trigger that would interfere with cascading deletes.
GRANT SELECT, INSERT
  ON TABLE public.template_versions
  TO authenticated;

DROP POLICY IF EXISTS templates_select_own ON public.templates;
CREATE POLICY templates_select_own
  ON public.templates
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS templates_insert_own ON public.templates;
CREATE POLICY templates_insert_own
  ON public.templates
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS templates_update_own ON public.templates;
CREATE POLICY templates_update_own
  ON public.templates
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS templates_delete_own ON public.templates;
CREATE POLICY templates_delete_own
  ON public.templates
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS template_versions_select_own ON public.template_versions;
CREATE POLICY template_versions_select_own
  ON public.template_versions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS template_versions_insert_own ON public.template_versions;
CREATE POLICY template_versions_insert_own
  ON public.template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_templates_set_updated_at
  ON public.templates;

CREATE TRIGGER trg_templates_set_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
