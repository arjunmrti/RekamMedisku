-- MU-101 — Follow-Up Template Engine database contract

CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(19);

SELECT has_function(
  'public',
  'validate_follow_up_template_definition',
  ARRAY['jsonb'],
  'controlled template definition validator exists'
);

SELECT has_function(
  'public',
  'create_follow_up_template',
  ARRAY['text','text','jsonb','integer','jsonb'],
  'atomic follow-up template create RPC exists'
);

SELECT has_function(
  'public',
  'append_follow_up_template_version',
  ARRAY['uuid','integer','integer','jsonb'],
  'append template version RPC exists'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.validate_follow_up_template_definition(jsonb)',
    'EXECUTE'
  ),
  false,
  'template validator is not directly callable by clients'
);

INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
)
VALUES
  (
    '00000000-0000-0000-0000-0000000010a1',
    'mu101-user-a@test.invalid',
    '{"full_name":"MU101 User A","username":"mu101_a"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-0000000010b2',
    'mu101-user-b@test.invalid',
    '{"full_name":"MU101 User B","username":"mu101_b"}'::jsonb
  );

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiles
    WHERE id IN (
      '00000000-0000-0000-0000-0000000010a1'::uuid,
      '00000000-0000-0000-0000-0000000010b2'::uuid
    )
  ),
  2,
  'MU-101 test identities receive profiles'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000010a1';

SELECT lives_ok(
  $test$
    SELECT public.create_follow_up_template(
      'Neurologi Pribadi',
      'Starter template untuk workspace pengguna.',
      '{"specialty":"Neurologi"}'::jsonb,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {
                "id":"consciousness",
                "label":"Kesadaran",
                "type":"select",
                "options":[
                  {"value":"cm","label":"Compos mentis"},
                  {"value":"somnolent","label":"Somnolen"}
                ]
              },
              {
                "id":"gcs",
                "label":"GCS",
                "type":"number",
                "unit":"score"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'User A can atomically create a controlled follow-up template'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
      AND type = 'follow_up'
  ),
  1,
  'created follow-up template is owned by User A'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.template_versions tv
    WHERE tv.user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
      AND tv.version = 1
      AND jsonb_array_length(tv.definition->'sections') = 1
  ),
  1,
  'template creation also creates version 1'
);

SELECT lives_ok(
  $test$
    UPDATE public.follow_ups
    SET template_type = 'Template Bebas'
    WHERE false;
  $test$,
  'legacy follow-up template_type no longer has the two-specialty hard limit'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_constraint c
    WHERE c.conrelid = 'public.follow_ups'::regclass
      AND c.contype = 'c'
      AND lower(pg_get_constraintdef(c.oid)) LIKE '%template_type%'
      AND lower(pg_get_constraintdef(c.oid)) LIKE '%neurologi%'
      AND lower(pg_get_constraintdef(c.oid)) LIKE '%ilmu penyakit dalam%'
  ),
  0,
  'legacy two-specialty template_type CHECK is removed'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE type = 'follow_up'
      AND user_id <> '00000000-0000-0000-0000-0000000010a1'::uuid
  ),
  0,
  'User A sees no follow-up template owned by another test user'
);

SELECT throws_ok(
  $test$
    SELECT public.create_follow_up_template(
      'Invalid Template',
      '',
      '{}'::jsonb,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {"id":"rich","label":"Rich text","type":"rich_text"}
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'P0001',
  NULL,
  'validator rejects unsupported field types'
);

SELECT is(
  (
    SELECT max(tv.version)::integer
    FROM public.template_versions tv
    WHERE tv.user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
  ),
  1,
  'initial template has version 1'
);

SELECT lives_ok(
  $test$
    SELECT public.append_follow_up_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
          AND type = 'follow_up'
        LIMIT 1
      ),
      1,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {
                "id":"consciousness",
                "label":"Kesadaran",
                "type":"select",
                "options":[
                  {"value":"cm","label":"Compos mentis"},
                  {"value":"stupor","label":"Stupor"}
                ]
              }
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'User A can append version 2'
);

SELECT is(
  (
    SELECT max(tv.version)::integer
    FROM public.template_versions tv
    WHERE tv.user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
  ),
  2,
  'template version history is append-only'
);

SELECT throws_ok(
  $test$
    SELECT public.append_follow_up_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
          AND type = 'follow_up'
        LIMIT 1
      ),
      1,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {"id":"notes","label":"Catatan","type":"textarea"}
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'P0001',
  NULL,
  'stale expected version is rejected'
);

SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000010b2';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE type = 'follow_up'
      AND user_id = '00000000-0000-0000-0000-0000000010a1'::uuid
  ),
  0,
  'User B cannot read User A follow-up templates'
);

SELECT throws_ok(
  $test$
    SELECT public.append_follow_up_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE id = (
          SELECT id
          FROM public.templates
          ORDER BY created_at
          LIMIT 1
        )
        LIMIT 1
      ),
      2,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {"id":"notes","label":"Catatan","type":"textarea"}
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'P0001',
  NULL,
  'User B cannot append a version to User A template'
);

SELECT throws_ok(
  $test$
    SELECT public.create_follow_up_template(
      'Template Duplikat Section',
      '',
      '{}'::jsonb,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[]
          },
          {
            "id":"objective",
            "title":"Duplicate",
            "fields":[]
          }
        ]
      }'::jsonb
    );
  $test$,
  'P0001',
  NULL,
  'validator rejects duplicate section IDs'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;

