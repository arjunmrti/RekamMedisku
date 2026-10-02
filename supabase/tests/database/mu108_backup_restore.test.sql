-- MU-108 — Section 11 cloud backup restore binding contract.
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(12);

SELECT has_function(
  'public',
  'restore_workspace_backup_v2',
  ARRAY['jsonb'],
  'backup restore RPC is available'
);

SELECT has_column(
  'public',
  'rotations',
  'slaberan_template_id',
  'rotation retains Slaberan template binding'
);

INSERT INTO auth.users (id,email,raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-0000000080a1',
  'mu108-a@test.invalid',
  '{"full_name":"MU108 A"}'::jsonb
);

INSERT INTO public.templates (
  id,user_id,type,name,description
)
VALUES
(
  '00000000-0000-0000-0000-0000000080f1',
  '00000000-0000-0000-0000-0000000080a1'::uuid,
  'follow_up',
  'MU108 Follow-Up',
  'Restore binding'
),
(
  '00000000-0000-0000-0000-0000000080f2',
  '00000000-0000-0000-0000-0000000080a1'::uuid,
  'report',
  'MU108 Report',
  'Restore binding'
);

INSERT INTO public.template_versions (
  id,user_id,template_id,version,schema_version,definition
)
VALUES
(
  '00000000-0000-0000-0000-0000000080f3',
  '00000000-0000-0000-0000-0000000080a1'::uuid,
  '00000000-0000-0000-0000-0000000080f1'::uuid,
  1,
  1,
  '{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"note","label":"Note","type":"text"}]}]}'::jsonb
),
(
  '00000000-0000-0000-0000-0000000080f4',
  '00000000-0000-0000-0000-0000000080a1'::uuid,
  '00000000-0000-0000-0000-0000000080f2'::uuid,
  1,
  1,
  '{"schema_version":1,"sections":[{"id":"summary","title":"Summary","fields":[{"id":"note","label":"Note","type":"text"}]}]}'::jsonb
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" =
  '00000000-0000-0000-0000-0000000080a1';

CREATE TEMP TABLE restore_result (
  result jsonb NOT NULL
);

INSERT INTO restore_result(result)
SELECT public.restore_workspace_backup_v2(
  '{
    "schemaVersion":2,
    "product":"RekamMedisku",
    "exportedAt":"2026-10-01T00:00:00.000Z",
    "patients":[{
      "id":"patient-local",
      "rotationId":"rotation-local",
      "name":"MU108 Patient",
      "age":30,
      "gender":"Laki-laki",
      "rm":"MU108-RM",
      "room":"Bangsal",
      "bed":"1",
      "doctor":"dr. Uji",
      "status":"Aktif"
    }],
    "followUpsByPatient":{"patient-local":[]},
    "followUpDrafts":{},
    "rotations":[{
      "id":"rotation-local",
      "name":"MU108 Aktif",
      "specialty":"Neurologi",
      "startDate":"2026-10-01",
      "endDate":"2026-10-31",
      "status":"Aktif",
      "followUpTemplateId":"00000000-0000-0000-0000-0000000080f1",
      "followUpTemplateVersion":1,
      "reportTemplateId":"00000000-0000-0000-0000-0000000080f2",
      "reportTemplateVersion":1,
      "slaberanTemplateId":"slaberan-local",
      "createdAt":"2026-10-01T00:00:00.000Z",
      "updatedAt":"2026-10-01T00:00:00.000Z"
    }],
    "activeRotationId":"rotation-local",
    "slaberanLocations":[],
    "slaberanTemplates":[{
      "id":"slaberan-local",
      "name":"MU108 Slaberan",
      "doctor":"dr. Uji",
      "specialty":"Neurologi",
      "hospital":"RS Uji",
      "opening":"Mohon izin",
      "showEmptyRooms":true,
      "blocks":[],
      "settings":{},
      "schemaVersion":1,
      "isDefault":true,
      "createdAt":"2026-10-01T00:00:00.000Z",
      "updatedAt":"2026-10-01T00:00:00.000Z"
    }]
  }'::jsonb
);

SELECT is(
  (
    SELECT follow_up_template_id
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  '00000000-0000-0000-0000-0000000080f1'::uuid,
  'restored rotation keeps follow-up template binding'
);

SELECT is(
  (
    SELECT follow_up_template_version
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  1,
  'restored rotation keeps follow-up template version'
);

SELECT is(
  (
    SELECT report_template_id
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  '00000000-0000-0000-0000-0000000080f2'::uuid,
  'restored rotation keeps report template binding'
);

SELECT ok(
  (
    SELECT slaberan_template_id IS NOT NULL
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  'restored rotation receives a Slaberan template ID'
);

SELECT ok(
  (
    SELECT slaberan_template_id::text <> 'slaberan-local'
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  'Slaberan binding is remapped to the restored remote template ID'
);

SELECT is(
  (
    SELECT (result->'slaberanTemplateIds'->>'slaberan-local')::uuid
    FROM restore_result
  ),
  (
    SELECT slaberan_template_id
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  'restore response exposes the Slaberan ID mapping'
);

SELECT ok(
  (
    SELECT (result->'rotationIds'->>'rotation-local') IS NOT NULL
    FROM restore_result
  ),
  'restore response exposes the rotation ID mapping'
);

SELECT ok(
  (
    SELECT status = 'Aktif'
    FROM public.rotations
    WHERE name = 'MU108 Aktif'
  ),
  'restored active rotation remains active'
);

SELECT ok(
  (
    SELECT EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.rotations r
        ON r.id = p.rotation_id
       AND r.user_id = p.user_id
      WHERE p.name = 'MU108 Patient'
        AND r.name = 'MU108 Aktif'
    )
  ),
  'restored patient points to the remapped rotation'
);

SELECT * FROM finish();
ROLLBACK;
