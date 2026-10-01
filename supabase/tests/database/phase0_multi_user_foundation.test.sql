-- Phase 0 — cross-user database isolation contract
--
-- Intended command:
--   supabase test db
--
-- NOTE:
-- The repository contains incremental application migrations that assume
-- an existing Supabase baseline schema. CI supplies an isolated tenant
-- fixture before applying the complete checked-in migration chain. Full
-- execution still requires the fixture's legacy helper functions (for
-- example rls_auto_enable) to exist in that baseline.

CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(44);

-- ---------------------------------------------------------------------------
-- Structural contract
-- ---------------------------------------------------------------------------
SELECT has_table(
  'public',
  'templates',
  'templates table exists'
);

SELECT has_table(
  'public',
  'template_versions',
  'template_versions table exists'
);

SELECT has_column(
  'public',
  'profiles',
  'student_id',
  'profiles.student_id exists'
);

SELECT has_column(
  'public',
  'profiles',
  'program',
  'profiles.program exists'
);

SELECT has_column(
  'public',
  'profiles',
  'institution',
  'profiles.institution exists'
);

SELECT has_column(
  'public',
  'templates',
  'user_id',
  'templates.user_id exists'
);

SELECT has_column(
  'public',
  'template_versions',
  'user_id',
  'template_versions.user_id exists'
);

SELECT is(
  has_table_privilege(
    'authenticated',
    'public.template_versions',
    'UPDATE'
  ),
  false,
  'authenticated clients cannot update template versions'
);

SELECT is(
  has_table_privilege(
    'authenticated',
    'public.template_versions',
    'DELETE'
  ),
  false,
  'authenticated clients cannot delete template versions directly'
);

-- ---------------------------------------------------------------------------
-- Existing tenant contract regression checks
-- ---------------------------------------------------------------------------
SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.profiles'::regclass
  ),
  'public.profiles keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.rotations'::regclass
  ),
  'public.rotations keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.patients'::regclass
  ),
  'public.patients keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.follow_ups'::regclass
  ),
  'public.follow_ups keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.supporting_exams'::regclass
  ),
  'public.supporting_exams keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.slaberan_locations'::regclass
  ),
  'public.slaberan_locations keeps RLS enabled'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    WHERE c.oid = 'public.slaberan_templates'::regclass
  ),
  'public.slaberan_templates keeps RLS enabled'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.patients'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.rotations'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.patients'::regclass
           AND attname = 'rotation_id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.patients'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.rotations'::regclass
           AND attname = 'id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.rotations'::regclass
           AND attname = 'user_id')
      ]::smallint[]
  ),
  'patients keeps composite rotation/user tenant FK'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.follow_ups'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.patients'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.follow_ups'::regclass
           AND attname = 'patient_id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.follow_ups'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.patients'::regclass
           AND attname = 'id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.patients'::regclass
           AND attname = 'user_id')
      ]::smallint[]
  ),
  'follow_ups keeps composite patient/user tenant FK'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.supporting_exams'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.follow_ups'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.supporting_exams'::regclass
           AND attname = 'follow_up_id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.supporting_exams'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.follow_ups'::regclass
           AND attname = 'id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.follow_ups'::regclass
           AND attname = 'user_id')
      ]::smallint[]
  ),
  'supporting_exams keeps composite follow-up/user tenant FK'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.slaberan_locations'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.slaberan_locations'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.slaberan_locations'::regclass
           AND attname = 'parent_id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.slaberan_locations'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.slaberan_locations'::regclass
           AND attname = 'id'),
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.slaberan_locations'::regclass
           AND attname = 'user_id')
      ]::smallint[]
  ),
  'slaberan_locations keeps composite parent/user tenant FK'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE
        'FOREIGN KEY (id) REFERENCES auth.users(id)%'
  ),
  'profiles keeps auth.users identity FK'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.templates'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.templates'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass
           AND attname = 'id')
      ]::smallint[]
  ),
  'templates ownership points to the provisioned application profile'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.template_versions'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND c.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.template_versions'::regclass
           AND attname = 'user_id')
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass
           AND attname = 'id')
      ]::smallint[]
  ),
  'template_versions ownership points to the provisioned application profile'
);

-- ---------------------------------------------------------------------------
-- Two test identities
-- ---------------------------------------------------------------------------
-- The whole test is transactional, so these rows disappear on ROLLBACK.
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
)
VALUES
  (
    '00000000-0000-0000-0000-0000000000a1',
    'phase0-user-a@test.invalid',
    '{"full_name":"Phase 0 User A","username":"phase0_a"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-0000000000b2',
    'phase0-user-b@test.invalid',
    '{"full_name":"Phase 0 User B","username":"phase0_b"}'::jsonb
  );

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiles
    WHERE id IN (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      '00000000-0000-0000-0000-0000000000b2'::uuid
    )
  ),
  2,
  'new auth users automatically receive application profiles'
);

SELECT is(
  (
    SELECT name
    FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'Phase 0 User A',
  'provisioned profile uses the authenticated user metadata'
);

INSERT INTO public.templates (
  id,
  user_id,
  type,
  name,
  description
)
VALUES
  (
    '10000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-0000000000a1'::uuid,
    'follow_up',
    'User A Follow-Up',
    ''
  ),
  (
    '10000000-0000-0000-0000-0000000000b2',
    '00000000-0000-0000-0000-0000000000b2'::uuid,
    'report',
    'User B Report',
    ''
  );

INSERT INTO public.template_versions (
  user_id,
  template_id,
  version,
  definition
)
VALUES (
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '10000000-0000-0000-0000-0000000000a1'::uuid,
  1,
  '{"schema":"phase0-test"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- User A
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiles
  ),
  1,
  'User A can only see User A profile'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  1,
  'User A can only see User A template'
);

SELECT lives_ok(
  $test$
    INSERT INTO public.templates (
      type,
      name
    )
    VALUES (
      'follow_up',
      'User A Own Insert'
    );
  $test$,
  'User A can insert a template using the authenticated owner default'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  2,
  'User A owns both seeded and newly inserted templates'
);

-- ---------------------------------------------------------------------------
-- User B
-- ---------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiles
  ),
  1,
  'User B can only see User B profile'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000000b2'::uuid
  ),
  1,
  'User B can only see User B template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.template_versions v
    JOIN public.templates t ON t.id = v.template_id
    WHERE t.user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot see User A template versions'
);

SELECT lives_ok(
  $test$
    UPDATE public.templates
    SET name = 'User B attempted update'
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update of User A template does not raise an error'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid
      AND name = 'User A Follow-Up'
  ),
  1,
  'User B update cannot change User A template'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT lives_ok(
  $test$
    DELETE FROM public.templates
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B delete of User A template does not raise an error'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid
  ),
  1,
  'User B delete cannot remove User A template'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT throws_ok(
  $test$
    INSERT INTO public.templates (
      user_id,
      type,
      name
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      'follow_up',
      'User B Spoof'
    );
  $test$,
  '42501',
  NULL,
  'User B cannot insert a template owned by User A'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.template_versions (
      user_id,
      template_id,
      version,
      definition
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '10000000-0000-0000-0000-0000000000a1'::uuid,
      2,
      '{"schema":"cross-tenant-attempt"}'::jsonb
    );
  $test$,
  '23503',
  NULL,
  'User B cannot pair its owner key with User A template through the composite FK'
);

SELECT lives_ok(
  $test$
    UPDATE public.profiles
    SET name = 'User B attempted profile rewrite'
    WHERE id = '00000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B profile update statement is accepted but affects no visible row'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-0000000000a1'::uuid
      AND name = 'Phase 0 User A'
  ),
  1,
  'User B cannot change User A application identity'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A templates through the tenant policy'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.template_versions
    WHERE user_id = '00000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A template versions through the tenant policy'
);

-- Schema invariants.
RESET ROLE;

SELECT throws_ok(
  $test$
    INSERT INTO public.templates (
      user_id,
      type,
      name
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      'unsupported',
      'Invalid Type'
    );
  $test$,
  '23514',
  NULL,
  'template type is restricted to supported families'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.template_versions (
      user_id,
      template_id,
      version,
      definition
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      '10000000-0000-0000-0000-0000000000a1'::uuid,
      1,
      '{"schema":"duplicate-version"}'::jsonb
    );
  $test$,
  '23505',
  NULL,
  'a template cannot have two rows with the same version'
);

SELECT * FROM finish();

ROLLBACK;
