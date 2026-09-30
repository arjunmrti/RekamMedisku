-- SECTION 03 — Rotation template binding foundation
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(13);

SELECT has_table(
  'public',
  'rotation_template_bindings',
  'rotation template binding table exists'
);

SELECT has_column(
  'public',
  'rotation_template_bindings',
  'rotation_id',
  'binding stores rotation context'
);

SELECT has_column(
  'public',
  'rotation_template_bindings',
  'template_version',
  'binding stores pinned template version'
);

SELECT ok(
  has_index(
    'public',
    'rotation_template_bindings_one_default_idx',
    'partial unique default binding index exists'
  ),
  'one default template per rotation and document type is constrained'
);

SELECT has_function(
  'public',
  'upsert_rotation_template_binding',
  ARRAY['uuid','uuid','text','uuid','integer','boolean','integer','timestamptz'],
  'binding upsert RPC exists'
);

SELECT has_function(
  'public',
  'delete_rotation_template_binding',
  ARRAY['uuid','timestamptz'],
  'binding delete RPC exists'
);

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-0000-0000-0000000031a1','mu031-a@test.invalid','{"full_name":"MU031 A"}'::jsonb),
('00000000-0000-0000-0000-0000000031b2','mu031-b@test.invalid','{"full_name":"MU031 B"}'::jsonb);

INSERT INTO public.templates (id,user_id,type,name,description) VALUES
('00000000-0000-0000-0000-0000000031c3','00000000-0000-0000-0000-0000000031a1'::uuid,'follow_up','Binding Template A','A'),
('00000000-0000-0000-0000-0000000031d4','00000000-0000-0000-0000-0000000031a1'::uuid,'follow_up','Binding Template B','B');

INSERT INTO public.template_versions (id,user_id,template_id,version,schema_version,definition) VALUES
('00000000-0000-0000-0000-0000000031e5','00000000-0000-0000-0000-0000000031a1'::uuid,'00000000-0000-0000-0000-0000000031c3'::uuid,1,1,
'{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"note","label":"Note","type":"text"}]}]}'::jsonb),
('00000000-0000-0000-0000-0000000031f6','00000000-0000-0000-0000-0000000031a1'::uuid,'00000000-0000-0000-0000-0000000031d4'::uuid,1,1,
'{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"note","label":"Note","type":"text"}]}]}'::jsonb);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000031a1';

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU031 Neurologi','Neurologi',CURRENT_DATE,CURRENT_DATE+30,'Aktif',
    '00000000-0000-0000-0000-0000000031c3'::uuid,1,NULL,NULL
  ); $q$,
  'active rotation can be created through the existing rotation RPC'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rotation_template_bindings b
    WHERE b.rotation_id = (
      SELECT id FROM public.rotations
      WHERE user_id='00000000-0000-0000-0000-0000000031a1'::uuid
        AND name='MU031 Neurologi'
    )
      AND b.document_type='follow_up'
      AND b.is_default
  ),
  1,
  'existing rotation template columns are mirrored into one default binding'
);

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_template_binding(
    NULL,
    (SELECT id FROM public.rotations WHERE name='MU031 Neurologi'),
    'follow_up',
    '00000000-0000-0000-0000-0000000031d4'::uuid,
    1,
    false,
    1,
    NULL
  ); $q$,
  'user can add a second non-default template binding'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rotation_template_bindings b
    WHERE b.rotation_id = (SELECT id FROM public.rotations WHERE name='MU031 Neurologi')
      AND b.document_type='follow_up'
  ),
  2,
  'one rotation can hold multiple follow-up bindings'
);

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_template_binding(
    (
      SELECT id FROM public.rotation_template_bindings
      WHERE rotation_id = (SELECT id FROM public.rotations WHERE name='MU031 Neurologi')
        AND template_id='00000000-0000-0000-0000-0000000031d4'::uuid
    ),
    (SELECT id FROM public.rotations WHERE name='MU031 Neurologi'),
    'follow_up',
    '00000000-0000-0000-0000-0000000031d4'::uuid,
    1,
    true,
    0,
    (
      SELECT updated_at FROM public.rotation_template_bindings
      WHERE rotation_id = (SELECT id FROM public.rotations WHERE name='MU031 Neurologi')
        AND template_id='00000000-0000-0000-0000-0000000031d4'::uuid
    )
  ); $q$,
  'user can promote another binding to default'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rotation_template_bindings b
    WHERE b.rotation_id = (SELECT id FROM public.rotations WHERE name='MU031 Neurologi')
      AND b.document_type='follow_up'
      AND b.is_default
  ),
  1,
  'a rotation keeps exactly one default follow-up binding'
);

SELECT is(
  (
    SELECT r.follow_up_template_id
    FROM public.rotations r
    WHERE r.name='MU031 Neurologi'
  ),
  '00000000-0000-0000-0000-0000000031d4'::uuid,
  'legacy rotation template column mirrors the selected default'
);

SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000031b2';

SELECT throws_ok(
  $q$ SELECT * FROM public.upsert_rotation_template_binding(
    NULL,
    (SELECT id FROM public.rotations WHERE name='MU031 Neurologi'),
    'follow_up',
    '00000000-0000-0000-0000-0000000031c3'::uuid,
    1,
    true,
    0,
    NULL
  ); $q$,
  'P0001',
  'Stase yang dipilih tidak ditemukan.',
  'another user cannot bind a template into User A rotation'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
