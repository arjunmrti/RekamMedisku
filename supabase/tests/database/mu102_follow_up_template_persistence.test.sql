-- MU-102 — Follow-Up template identity + immutable snapshot contract

CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(16);

SELECT has_column(
  'public',
  'follow_ups',
  'template_id',
  'follow-up stores pinned template ID'
);

SELECT has_column(
  'public',
  'follow_ups',
  'template_version',
  'follow-up stores pinned template version'
);

SELECT has_column(
  'public',
  'follow_ups',
  'template_snapshot',
  'follow-up stores immutable template snapshot'
);

SELECT has_function(
  'public',
  'save_follow_up_with_exams',
  ARRAY['uuid','timestamptz','jsonb','jsonb'],
  'atomic follow-up save RPC supports template metadata'
);

INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data
)
VALUES
  (
    '00000000-0000-0000-0000-0000000020a1',
    'mu102-user-a@test.invalid',
    '{"full_name":"MU102 User A","username":"mu102_a"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-0000000020b2',
    'mu102-user-b@test.invalid',
    '{"full_name":"MU102 User B","username":"mu102_b"}'::jsonb
  );

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000020a1';

INSERT INTO public.rotations (
  id,
  user_id,
  name,
  specialty,
  start_date,
  end_date,
  status
)
VALUES (
  '00000000-0000-0000-0000-0000000020c3'::uuid,
  '00000000-0000-0000-0000-0000000020a1'::uuid,
  'MU102 Stase',
  'Template Bebas',
  CURRENT_DATE,
  CURRENT_DATE + 30,
  'Aktif'
);

INSERT INTO public.patients (
  id,
  user_id,
  rotation_id,
  name,
  rm
)
VALUES (
  '00000000-0000-0000-0000-0000000020d4'::uuid,
  '00000000-0000-0000-0000-0000000020a1'::uuid,
  '00000000-0000-0000-0000-0000000020c3'::uuid,
  'Pasien MU102 A',
  'RM-MU102-A'
);

SELECT lives_ok(
  $test$
    SELECT public.create_follow_up_template(
      'Template MU102',
      'Template untuk kontrak persistence.',
      '{"specialty":"Template Bebas"}'::jsonb,
      1,
      '{
        "schema_version":1,
        "sections":[
          {
            "id":"objective",
            "title":"Objective",
            "fields":[
              {
                "id":"catatan",
                "label":"Catatan",
                "type":"textarea"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'User A creates a template used by follow-up persistence'
);

SELECT lives_ok(
  $test$
    SELECT public.save_follow_up_with_exams(
      NULL,
      NULL,
      jsonb_build_object(
        'patient_id',
        '00000000-0000-0000-0000-0000000020d4',
        'number',
        1,
        'date',
        CURRENT_DATE::text,
        'iso_date',
        CURRENT_DATE::text,
        'time',
        '09:15:00',
        'status',
        'Tersimpan',
        'template_id',
        (
          SELECT id::text
          FROM public.templates
          WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
            AND type = 'follow_up'
            AND name = 'Template MU102'
        ),
        'template_version',
        1,
        'subjective',
        'Keluhan',
        'objective',
        'Objective',
        'assessment',
        'Assessment',
        'plan',
        'Plan',
        'summary',
        'Snapshot test'
      ),
      '[]'::jsonb
    );
  $test$,
  'follow-up save pins the requested template version'
);

SELECT is(
  (
    SELECT template_version
    FROM public.follow_ups
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
  ),
  1,
  'saved follow-up is pinned to template version 1'
);

SELECT is(
  (
    SELECT template_schema_version
    FROM public.follow_ups
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
  ),
  1,
  'saved follow-up stores the definition schema version'
);

SELECT is(
  (
    SELECT template_snapshot
    FROM public.follow_ups
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
  ),
  (
    SELECT definition
    FROM public.template_versions
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
      AND version = 1
  ),
  'saved follow-up snapshot matches authoritative template version 1'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.follow_ups
    WHERE template_id = (
      SELECT id
      FROM public.templates
      WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
        AND type = 'follow_up'
        AND name = 'Template MU102'
    )
  ),
  1,
  'follow-up references User A template'
);

SELECT lives_ok(
  $test$
    SELECT public.append_follow_up_template_version(
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
          AND type = 'follow_up'
          AND name = 'Template MU102'
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
                "id":"catatan",
                "label":"Catatan",
                "type":"textarea"
              },
              {
                "id":"tambahan",
                "label":"Tambahan",
                "type":"text"
              }
            ]
          }
        ]
      }'::jsonb
    );
  $test$,
  'template can append version 2 after follow-up was saved'
);

SELECT is(
  (
    SELECT template_version
    FROM public.follow_ups
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
  ),
  1,
  'editing the template does not rewrite follow-up version'
);

SELECT is(
  (
    SELECT template_snapshot->'sections'->0->'fields'
    FROM public.follow_ups
    WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
  ),
  (
    SELECT definition->'sections'->0->'fields'
    FROM public.template_versions
    WHERE user_id = '00000000-0000-0000-0000000020a1'::uuid
      AND version = 1
  ),
  'follow-up snapshot remains the original version 1 definition'
);

SELECT throws_ok(
  $test$
    UPDATE public.follow_ups
    SET template_version = 2
    WHERE user_id = '00000000-0000-0000-0000000020a1'::uuid;
  $test$,
  'P0001',
  'Identitas template follow-up yang sudah tersimpan bersifat immutable.',
  'saved follow-up cannot be repointed to template version 2'
);

SELECT throws_ok(
  $test$
    UPDATE public.follow_ups
    SET template_snapshot = '{"schema_version":1,"sections":[]}'::jsonb
    WHERE user_id = '00000000-0000-0000-0000000020a1'::uuid;
  $test$,
  'P0001',
  'Identitas template follow-up yang sudah tersimpan bersifat immutable.',
  'saved follow-up snapshot cannot be mutated'
);

SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000020b2';

INSERT INTO public.rotations (
  id,
  user_id,
  name,
  specialty,
  start_date,
  end_date,
  status
)
VALUES (
  '00000000-0000-0000-0000-0000000020e5'::uuid,
  '00000000-0000-0000-0000-0000000020b2'::uuid,
  'MU102 Stase B',
  'Template Bebas',
  CURRENT_DATE,
  CURRENT_DATE + 30,
  'Aktif'
);

INSERT INTO public.patients (
  id,
  user_id,
  rotation_id,
  name,
  rm
)
VALUES (
  '00000000-0000-0000-0000-0000000020f6'::uuid,
  '00000000-0000-0000-0000-0000000020b2'::uuid,
  '00000000-0000-0000-0000-0000000020e5'::uuid,
  'Pasien MU102 B',
  'RM-MU102-B'
);

SELECT throws_ok(
  $test$
    INSERT INTO public.follow_ups (
      user_id,
      patient_id,
      number,
      date,
      iso_date,
      time,
      status,
      subjective,
      objective,
      assessment,
      plan,
      summary,
      template_id,
      template_version
    )
    VALUES (
      '00000000-0000-0000-0000-0000000020b2'::uuid,
      '00000000-0000-0000-0000-0000000020f6'::uuid,
      1,
      CURRENT_DATE,
      CURRENT_DATE,
      '10:00:00',
      'Tersimpan',
      '',
      '',
      '',
      '',
      '',
      (
        SELECT id
        FROM public.templates
        WHERE user_id = '00000000-0000-0000-0000-0000000020a1'::uuid
          AND type = 'follow_up'
          AND name = 'Template MU102'
      ),
      1
    );
  $test$,
  'P0001',
  'Template follow-up atau versinya tidak berada dalam workspace pengguna.',
  'User B cannot attach User A template to a follow-up'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
