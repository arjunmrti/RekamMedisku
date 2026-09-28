-- MU-005 — automated cross-user isolation contract
--
-- Scope:
--   A creates representative workspace data.
--   B must not read, update, delete, or insert records against A's tenant.
--   B must not pair its own foreign key with A-owned parent IDs.
--   Storage SELECT is exercised as the authorization boundary used by
--   authenticated downloads from the private bucket.

CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(43);

-- ---------------------------------------------------------------------------
-- Two identities + representative A-owned workspace
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
)
VALUES
  (
    '00000000-0000-0000-0000-0000000000a1',
    'mu005-user-a@test.invalid',
    '{"full_name":"MU005 User A","username":"mu005_a"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-0000000000b2',
    'mu005-user-b@test.invalid',
    '{"full_name":"MU005 User B","username":"mu005_b"}'::jsonb
  );

INSERT INTO public.rotations (
  id, user_id, name, specialty, start_date, end_date, status
)
VALUES (
  '10000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'MU005 A Rotation',
  'Neurologi',
  CURRENT_DATE,
  CURRENT_DATE + 30,
  'Aktif'
);

INSERT INTO public.slaberan_locations (
  id, user_id, type, name
)
VALUES (
  '20000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'floor',
  'MU005 A Floor'
);

INSERT INTO public.slaberan_locations (
  id, user_id, parent_id, type, name
)
VALUES (
  '20000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '20000000-0000-0000-0000-0000000000a1'::uuid,
  'ward',
  'MU005 A Ward'
);

INSERT INTO public.patients (
  id, user_id, rotation_id, name, rm, current_location_id
)
VALUES (
  '30000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '10000000-0000-0000-0000-0000000000a1'::uuid,
  'MU005 A Patient',
  'MU005-A',
  '20000000-0000-0000-0000-0000000000a2'::uuid
);

INSERT INTO public.follow_ups (
  id, user_id, patient_id, number, status, subjective
)
VALUES (
  '40000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '30000000-0000-0000-0000-0000000000a1'::uuid,
  1,
  'Tersimpan',
  'MU005 A Subjective'
);

INSERT INTO public.supporting_exams (
  id, user_id, follow_up_id, name, attachment_id
)
VALUES (
  '50000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '40000000-0000-0000-0000-0000000000a1'::uuid,
  'MU005 A Exam',
  'mu005-a-attachment'
);

INSERT INTO public.slaberan_templates (
  id, user_id, name, hospital
)
VALUES (
  '60000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'MU005 A Slaberan',
  'Hospital A'
);

INSERT INTO storage.objects (
  id,
  bucket_id,
  name,
  owner_id
)
VALUES (
  '70000000-0000-0000-0000-0000000000a1'::uuid,
  'rekammedisku-attachments',
  '00000000-0000-0000-0000-0000000000a1/mu005-a.pdf',
  '00000000-0000-0000-0000-0000000000a1'
);

-- ---------------------------------------------------------------------------
-- User A can read its own workspace and its own private attachment metadata.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (SELECT count(*)::integer FROM public.rotations),
  1,
  'User A can read its own rotation'
);

SELECT is(
  (SELECT count(*)::integer FROM public.patients),
  1,
  'User A can read its own patient'
);

SELECT is(
  (SELECT count(*)::integer FROM public.follow_ups),
  1,
  'User A can read its own follow-up'
);

SELECT is(
  (SELECT count(*)::integer FROM public.supporting_exams),
  1,
  'User A can read its own supporting exam'
);

SELECT is(
  (SELECT count(*)::integer FROM public.slaberan_locations),
  2,
  'User A can read its own Slaberan locations'
);

SELECT is(
  (SELECT count(*)::integer FROM public.slaberan_templates),
  1,
  'User A can read its own Slaberan template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'rekammedisku-attachments'
      AND name = '00000000-0000-0000-0000-0000000000a1/mu005-a.pdf'
  ),
  1,
  'User A can read its own private attachment object'
);

-- ---------------------------------------------------------------------------
-- User B cannot read A-owned workspace data.
-- ---------------------------------------------------------------------------
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rotations
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A rotation'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.patients
    WHERE id = '30000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A patient'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.follow_ups
    WHERE id = '40000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A follow-up'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.supporting_exams
    WHERE id = '50000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A supporting exam'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.slaberan_locations
    WHERE id = '20000000-0000-0000-0000-0000000000a2'::uuid
  ),
  0,
  'User B cannot read User A Slaberan location'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.slaberan_templates
    WHERE id = '60000000-0000-0000-0000-0000000000a1'::uuid
  ),
  0,
  'User B cannot read User A Slaberan template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'rekammedisku-attachments'
      AND name = '00000000-0000-0000-0000-0000000000a1/mu005-a.pdf'
  ),
  0,
  'User B cannot read the Storage object used for User A downloads'
);

-- ---------------------------------------------------------------------------
-- User B cannot mutate A-owned rows. RLS makes these statements no-ops.
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  $test$
    UPDATE public.rotations
    SET name = 'MU005 B rewrite'
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update against A rotation is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE public.patients
    SET name = 'MU005 B rewrite'
    WHERE id = '30000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update against A patient is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE public.follow_ups
    SET subjective = 'MU005 B rewrite'
    WHERE id = '40000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update against A follow-up is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE public.supporting_exams
    SET result = 'MU005 B rewrite'
    WHERE id = '50000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update against A supporting exam is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE public.slaberan_locations
    SET name = 'MU005 B rewrite'
    WHERE id = '20000000-0000-0000-0000-0000000000a2'::uuid;
  $test$,
  'User B update against A Slaberan location is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE public.slaberan_templates
    SET name = 'MU005 B rewrite'
    WHERE id = '60000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B update against A Slaberan template is rejected by RLS without an error'
);

SELECT lives_ok(
  $test$
    UPDATE storage.objects
    SET name = '00000000-0000-0000-0000-0000000000b2/mu005-b.pdf'
    WHERE id = '70000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot update User A Storage object'
);

-- ---------------------------------------------------------------------------
-- User B cannot delete A-owned rows.
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  $test$
    DELETE FROM public.rotations
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot delete User A rotation'
);

SELECT lives_ok(
  $test$
    DELETE FROM public.patients
    WHERE id = '30000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot delete User A patient'
);

SELECT lives_ok(
  $test$
    DELETE FROM public.follow_ups
    WHERE id = '40000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot delete User A follow-up'
);

SELECT lives_ok(
  $test$
    DELETE FROM public.supporting_exams
    WHERE id = '50000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot delete User A supporting exam'
);

SELECT lives_ok(
  $test$
    DELETE FROM public.slaberan_locations
    WHERE id = '20000000-0000-0000-0000-0000000000a2'::uuid;
  $test$,
  'User B cannot delete User A Slaberan location'
);

SELECT lives_ok(
  $test$
    DELETE FROM public.slaberan_templates
    WHERE id = '60000000-0000-0000-0000-0000000000a1'::uuid;
  $test$,
  'User B cannot delete User A Slaberan template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'RekamMedisku attachment delete'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1,
  'Storage delete policy is present for authenticated tenant access'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Confirm B's attempts did not alter or remove A-owned data.
-- ---------------------------------------------------------------------------
SELECT is(
  (
    SELECT name
    FROM public.rotations
    WHERE id = '10000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'MU005 A Rotation',
  'User A rotation remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT name
    FROM public.patients
    WHERE id = '30000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'MU005 A Patient',
  'User A patient remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT subjective
    FROM public.follow_ups
    WHERE id = '40000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'MU005 A Subjective',
  'User A follow-up remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT name
    FROM public.supporting_exams
    WHERE id = '50000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'MU005 A Exam',
  'User A supporting exam remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT name
    FROM public.slaberan_locations
    WHERE id = '20000000-0000-0000-0000-0000000000a2'::uuid
  ),
  'MU005 A Ward',
  'User A Slaberan location remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT name
    FROM public.slaberan_templates
    WHERE id = '60000000-0000-0000-0000-0000000000a1'::uuid
  ),
  'MU005 A Slaberan template',
  'User A Slaberan template remains unchanged after User B mutation attempts'
);

SELECT is(
  (
    SELECT name
    FROM storage.objects
    WHERE id = '70000000-0000-0000-0000-0000000000a1'::uuid
  ),
  '00000000-0000-0000-0000-0000000000a1/mu005-a.pdf',
  'User A Storage object remains unchanged after User B mutation attempts'
);

-- ---------------------------------------------------------------------------
-- Cross-user inserts: foreign IDs from A must not become reachable by B.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000b2';

SELECT throws_ok(
  $test$
    INSERT INTO public.rotations (user_id, name)
    VALUES (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      'MU005 B spoofed rotation'
    );
  $test$,
  '42501',
  NULL,
  'User B cannot insert a rotation owned by User A'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.patients (
      user_id, rotation_id, name, rm
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '10000000-0000-0000-0000-0000000000a1'::uuid,
      'MU005 B foreign rotation',
      'MU005-B-ROT'
    );
  $test$,
  '23503',
  NULL,
  'User B cannot attach a patient to User A rotation'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.follow_ups (
      user_id, patient_id, number, subjective
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '30000000-0000-0000-0000-0000000000a1'::uuid,
      1,
      'MU005 B foreign patient'
    );
  $test$,
  '23503',
  NULL,
  'User B cannot attach a follow-up to User A patient'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.supporting_exams (
      user_id, follow_up_id, name
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '40000000-0000-0000-0000-0000000000a1'::uuid,
      'MU005 B foreign follow-up'
    );
  $test$,
  '23503',
  NULL,
  'User B cannot attach a supporting exam to User A follow-up'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.slaberan_locations (
      user_id, parent_id, type, name
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '20000000-0000-0000-0000-0000000000a1'::uuid,
      'ward',
      'MU005 B foreign floor'
    );
  $test$,
  '23503',
  NULL,
  'User B cannot attach a Slaberan location to User A parent'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.patients (
      user_id, rotation_id, name, rm, current_location_id
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000b2'::uuid,
      '10000000-0000-0000-0000-0000000000a1'::uuid,
      'MU005 B foreign location',
      'MU005-B-LOC',
      '20000000-0000-0000-0000-0000000000a2'::uuid
    );
  $test$,
  '42501',
  NULL,
  'User B cannot reference a User A location from its patient workspace'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.slaberan_templates (
      user_id, name
    )
    VALUES (
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      'MU005 B spoofed Slaberan template'
    );
  $test$,
  '42501',
  NULL,
  'User B cannot insert a Slaberan template owned by User A'
);

RESET ROLE;

-- A can still read the object after B's attempted download/mutations.
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'rekammedisku-attachments'
      AND name = '00000000-0000-0000-0000-0000000000a1/mu005-a.pdf'
  ),
  1,
  'User A retains access to its private attachment download boundary'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
