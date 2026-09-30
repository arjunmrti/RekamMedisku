-- MU-103 — Rotation -> template binding and tenant safety
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(13);

SELECT has_column('public','rotations','follow_up_template_id','rotation stores follow-up template ID');
SELECT has_column('public','rotations','follow_up_template_version','rotation stores follow-up template version');
SELECT has_column('public','rotations','report_template_id','rotation stores report template ID');
SELECT has_function('public','upsert_rotation_with_activation',ARRAY['uuid','timestamptz','text','text','date','date','text','uuid','integer','uuid','integer','uuid'],'rotation upsert RPC accepts template bindings');
SELECT has_function('public','activate_rotation',ARRAY['uuid'],'activation RPC remains available');

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-0000-0000-0000000030a1','mu103-a@test.invalid','{"full_name":"MU103 A"}'::jsonb),
('00000000-0000-0000-0000-0000000030b2','mu103-b@test.invalid','{"full_name":"MU103 B"}'::jsonb);

INSERT INTO public.templates (id,user_id,type,name,description) VALUES
('00000000-0000-0000-0000-0000000030c3','00000000-0000-0000-0000-0000000030a1'::uuid,'follow_up','MU103 Template A','A');

INSERT INTO public.template_versions (id,user_id,template_id,version,schema_version,definition) VALUES
('00000000-0000-0000-0000-0000000030d4','00000000-0000-0000-0000-0000000030a1'::uuid,'00000000-0000-0000-0000-0000000030c3'::uuid,1,1,
'{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"note","label":"Note","type":"text"}]}]}'::jsonb);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000030a1';

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU103 Aktif','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Aktif',
    '00000000-0000-0000-0000-0000000030c3'::uuid,1,NULL,NULL
  ); $q$,
  'User A can create an active rotation bound to its template'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rotations
   WHERE user_id='00000000-0000-0000-0000-0000000030a1'::uuid
     AND status='Aktif'
     AND follow_up_template_id='00000000-0000-0000-0000-0000000030c3'::uuid),
  1,
  'active rotation keeps its template binding'
);

SELECT is(
  (SELECT follow_up_template_version FROM public.rotations
   WHERE user_id='00000000-0000-0000-0000-0000000030a1'::uuid AND status='Aktif'),
  1,
  'active rotation pins the selected version'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rotations
   WHERE user_id='00000000-0000-0000-0000-0000000030a1'::uuid AND status='Aktif'),
  1,
  'User A has at most one active rotation'
);

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU103 Mendatang','Lainnya',CURRENT_DATE+31,CURRENT_DATE+60,'Mendatang',
    NULL,NULL,NULL,NULL
  ); $q$,
  'future rotation may exist without a template'
);

SELECT throws_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    (SELECT id FROM public.rotations WHERE name='MU103 Mendatang'),
    (SELECT updated_at FROM public.rotations WHERE name='MU103 Mendatang'),
    'MU103 Mendatang','Lainnya',CURRENT_DATE+31,CURRENT_DATE+60,'Aktif',
    NULL,NULL,NULL,NULL
  ); $q$,
  'P0001',
  'Template follow-up stase harus diisi lengkap.',
  'activation requires a follow-up template'
);

SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000030b2';

SELECT throws_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU103 B','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Aktif',
    '00000000-0000-0000-0000-0000000030c3'::uuid,1,NULL,NULL
  ); $q$,
  'P0001',
  'Template follow-up yang dipilih tidak tersedia pada workspace pengguna.',
  'User B cannot bind User A template'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.rotations WHERE name='MU103 Aktif'),
  1,
  'cross-user attempt did not create another rotation'
);

SELECT * FROM finish();
ROLLBACK;
