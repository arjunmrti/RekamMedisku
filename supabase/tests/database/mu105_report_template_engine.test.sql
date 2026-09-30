-- MU-105 — User-owned report template definition and versioning.
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(11);

SELECT has_function(
  'public',
  'validate_report_template_definition',
  ARRAY['jsonb'],
  'report definition validator exists'
);

SELECT has_function(
  'public',
  'create_report_template',
  ARRAY['text','text','jsonb','integer','jsonb'],
  'atomic report template creation exists'
);

SELECT has_function(
  'public',
  'append_report_template_version',
  ARRAY['uuid','integer','integer','jsonb'],
  'append report template version RPC exists'
);

INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
) VALUES
(
  '00000000-0000-0000-0000-0000000050a1',
  'mu105-a@test.invalid',
  '{"full_name":"MU105 A"}'::jsonb
),
(
  '00000000-0000-0000-0000-0000000050b1',
  'mu105-b@test.invalid',
  '{"full_name":"MU105 B"}'::jsonb
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000050a1';

SELECT lives_ok(
  $q$ SELECT public.create_report_template(
    'Laporan Standar',
    'Template laporan user A',
    '{}'::jsonb,
    1,
    '{
      "schema_version":1,
      "sections":[
        {
          "id":"identitas",
          "title":"Identitas Pasien",
          "blocks":[
            {
              "id":"patient-name",
              "type":"value",
              "source":"patient.name",
              "label":"Nama"
            },
            {
              "id":"closing",
              "type":"text",
              "text":"Mohon arahan dokter."
            }
          ]
        },
        {
          "id":"subjective",
          "title":"S:",
          "blocks":[
            {
              "id":"subjective",
              "type":"value",
              "source":"follow_up.subjective"
            }
          ]
        }
      ]
    }'::jsonb
  ); $q$,
  'valid report template is created for user A'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.templates
    WHERE user_id = '00000000-0000-0000-0000-0000000050a1'::uuid
      AND type = 'report'
  ),
  1,
  'report template belongs to user A'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.template_versions tv
    JOIN public.templates t
      ON t.id = tv.template_id
     AND t.user_id = tv.user_id
    WHERE tv.user_id = '00000000-0000-0000-0000-0000000050a1'::uuid
      AND t.type = 'report'
      AND tv.version = 1
  ),
  1,
  'report template receives version 1'
);

SELECT throws_ok(
  $q$ SELECT public.create_report_template(
    'Invalid Source',
    '',
    '{}'::jsonb,
    1,
    '{
      "schema_version":1,
      "sections":[
        {
          "id":"section",
          "title":"Section",
          "blocks":[
            {
              "id":"bad",
              "type":"value",
              "source":"follow_up.not_a_real_source"
            }
          ]
        }
      ]
    }'::jsonb
  ); $q$,
  'P0001',
  NULL,
  'unsupported report value source is rejected'
);

SELECT throws_ok(
  $q$ SELECT public.create_report_template(
    'Invalid Type',
    '',
    '{}'::jsonb,
    1,
    '{
      "schema_version":1,
      "sections":[
        {
          "id":"section",
          "title":"Section",
          "blocks":[
            {
              "id":"bad",
              "type":"unknown"
            }
          ]
        }
      ]
    }'::jsonb
  ); $q$,
  'P0001',
  NULL,
  'unsupported report block type is rejected'
);

SELECT lives_ok(
  $q$
    SELECT public.append_report_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000050a1'::uuid
          AND type = 'report'
          AND name = 'Laporan Standar'
      ),
      1,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"identitas",
            "title":"Identitas Pasien",
            "blocks":[
              {
                "id":"patient-name",
                "type":"value",
                "source":"patient.name",
                "label":"Nama"
              },
              {
                "id":"patient-rm",
                "type":"value",
                "source":"patient.rm",
                "label":"RM"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $q$,
  'user A can append report template version 2'
);

SELECT throws_ok(
  $q$
    SELECT public.append_report_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000050a1'::uuid
          AND type = 'report'
          AND name = 'Laporan Standar'
      ),
      1,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"identitas",
            "title":"Identitas Pasien",
            "blocks":[
              {
                "id":"patient-name",
                "type":"value",
                "source":"patient.name"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $q$,
  'P0001',
  NULL,
  'stale report template version is rejected'
);

SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000050b1';

SELECT throws_ok(
  $q$
    SELECT public.append_report_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000050a1'::uuid
          AND type = 'report'
          AND name = 'Laporan Standar'
      ),
      2,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"identitas",
            "title":"Identitas Pasien",
            "blocks":[
              {
                "id":"patient-name",
                "type":"value",
                "source":"patient.name"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $q$,
  'P0001',
  NULL,
  'user B cannot append user A report template'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
