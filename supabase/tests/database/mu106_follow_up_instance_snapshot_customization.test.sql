-- MU-106 — Follow-Up instance snapshot customisation contract
CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;
SELECT plan(7);

SELECT has_function(
  'public',
  'save_follow_up_with_exams',
  ARRAY['uuid','timestamptz','jsonb','jsonb'],
  'atomic follow-up save accepts instance snapshot metadata'
);

SELECT has_column(
  'public',
  'follow_ups',
  'template_snapshot',
  'follow-up stores an instance snapshot'
);

INSERT INTO auth.users (id,email,raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-0000000060a1',
  'mu106-a@test.invalid',
  '{"full_name":"MU106 A"}'::jsonb
);

INSERT INTO public.rotations (
  id,user_id,name,specialty,start_date,end_date,status
)
VALUES (
  '00000000-0000-0000-0000-0000000060b2',
  '00000000-0000-0000-0000-0000000060a1'::uuid,
  'MU106',
  'Lainnya',
  CURRENT_DATE,
  CURRENT_DATE + 30,
  'Aktif'
);

INSERT INTO public.patients (
  id,user_id,rotation_id,name,age,gender,rm,room,bed,doctor
)
VALUES (
  '00000000-0000-0000-0000-0000000060c3',
  '00000000-0000-0000-0000-0000000060a1'::uuid,
  '00000000-0000-0000-0000-0000000060b2'::uuid,
  'Pasien MU106',
  30,
  'Laki-laki',
  'RM-MU106',
  'Ward A',
  '1',
  'Dokter MU106'
);

INSERT INTO public.templates (
  id,user_id,type,name,description
)
VALUES (
  '00000000-0000-0000-0000-0000000060d4',
  '00000000-0000-0000-0000-0000000060a1'::uuid,
  'follow_up',
  'MU106 Template',
  'instance snapshot test'
);

INSERT INTO public.template_versions (
  id,user_id,template_id,version,schema_version,definition
)
VALUES (
  '00000000-0000-0000-0000-0000000060e5',
  '00000000-0000-0000-0000-0000000060a1'::uuid,
  '00000000-0000-0000-0000-0000000060d4'::uuid,
  1,
  1,
  '{
    "schema_version":1,
    "sections":[
      {
        "id":"objective",
        "title":"Objective",
        "fields":[
          {"id":"kesadaran","label":"Kesadaran","type":"text"}
        ]
      }
    ]
  }'::jsonb
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000060a1';

SELECT lives_ok(
  $q$
    SELECT public.save_follow_up_with_exams(
      NULL,
      NULL,
      '{
        "patient_id":"00000000-0000-0000-0000-0000000060c3",
        "number":1,
        "date":"2030-01-01",
        "iso_date":"2030-01-01",
        "time":"09:00:00",
        "status":"Tersimpan",
        "template_id":"00000000-0000-0000-0000-0000000060d4",
        "template_version":1,
        "template_schema_version":1,
        "template_snapshot":{
          "schema_version":1,
          "sections":[
            {
              "id":"objective",
              "title":"Objective",
              "fields":[
                {"id":"kesadaran","label":"Kesadaran","type":"text"},
                {"id":"pupil","label":"Pupil","type":"text"}
              ]
            }
          ]
        },
        "answers":{"kesadaran":"Compos mentis","pupil":"Isokor"},
        "subjective":"Keluhan",
        "objective":"",
        "assessment":"",
        "plan":"",
        "summary":"Custom"
      }'::jsonb,
      '[]'::jsonb
    );
  $q$,
  'custom snapshot can be saved through the atomic RPC'
);

SELECT is(
  (
    SELECT template_version
    FROM public.follow_ups
    WHERE user_id='00000000-0000-0000-0000-0000000060a1'::uuid
  ),
  1,
  'custom snapshot keeps the source template version'
);

SELECT is(
  (
    SELECT template_snapshot->'sections'->0->'fields'->1->>'id'
    FROM public.follow_ups
    WHERE user_id='00000000-0000-0000-0000-0000000060a1'::uuid
  ),
  'pupil',
  'custom snapshot is preserved instead of being replaced by the template definition'
);

SELECT is(
  (
    SELECT answers->>'pupil'
    FROM public.follow_ups
    WHERE user_id='00000000-0000-0000-0000-0000000060a1'::uuid
  ),
  'Isokor',
  'answers remain keyed to the customized field'
);

SELECT throws_ok(
  $q$
    UPDATE public.follow_ups
    SET template_snapshot='{
      "schema_version":1,
      "sections":[
        {
          "id":"objective",
          "title":"Objective",
          "fields":[]
        }
      ]
    }'::jsonb
    WHERE user_id='00000000-0000-0000-0000-0000000060a1'::uuid;
  $q$,
  'P0001',
  'Identitas template follow-up yang sudah tersimpan bersifat immutable.',
  'saved custom snapshot remains immutable'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
