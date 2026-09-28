-- Phase 0 — cross-user database isolation contract
--
-- Intended command:
--   supabase test db
--
-- NOTE:
-- The repository currently has incremental application migrations but does
-- not yet contain a reproducible base-schema migration/configuration for the
-- complete legacy database. This file is therefore the Phase 0 database
-- contract and should be executed against a complete test database. It is not
-- wired into CI until that environment is reproducible.

CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(24);

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
  ),
  1,
  'User B can only see User B template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.template_versions
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
