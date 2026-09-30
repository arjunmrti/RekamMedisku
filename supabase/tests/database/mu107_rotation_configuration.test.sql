-- MU-107 — Section 08 rotation configuration binding.
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(9);

SELECT has_column('public','rotations','slaberan_template_id','rotation stores Slaberan template ID');
SELECT has_index('public','rotations','rotations_one_active_per_user_idx','rotation enforces one active row per user');
SELECT has_function('public','upsert_rotation_with_activation',ARRAY['uuid','timestamptz','text','text','date','date','text','uuid','integer','uuid','integer','uuid'],'rotation upsert RPC accepts Slaberan binding');
SELECT has_function('public','activate_rotation',ARRAY['uuid'],'activation RPC remains available');

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-0000-0000-0000000070a1','mu107-a@test.invalid','{"full_name":"MU107 A"}'::jsonb),
('00000000-0000-0000-0000-0000000070b2','mu107-b@test.invalid','{"full_name":"MU107 B"}'::jsonb);

INSERT INTO public.slaberan_templates (
  id,user_id,name,doctor,specialty,hospital,opening,show_empty_rooms,blocks,settings,schema_version,is_default
) VALUES (
 '00000000-0000-0000-0000-0000000070c3',
 '00000000-0000-0000-0000-0000000070a1'::uuid,
 'MU107 Slaberan A','','Lainnya','','',true,'[]'::jsonb,'{}'::jsonb,1,false
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000070a1';

SELECT lives_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU107 Aktif','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Aktif',
    NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-0000000070c3'::uuid
  ); $q$,
  'User A can save a rotation bound to its Slaberan template'
);

SELECT is(
  (SELECT slaberan_template_id FROM public.rotations
   WHERE user_id='00000000-0000-0000-0000-0000000070a1'::uuid AND name='MU107 Aktif'),
  '00000000-0000-0000-0000-0000000070c3'::uuid,
  'rotation persists the Slaberan binding'
);

SELECT throws_ok(
  $q$ INSERT INTO public.rotations (
    user_id,name,specialty,start_date,end_date,status
  ) VALUES (
    '00000000-0000-0000-0000-0000000070a1'::uuid,
    'MU107 Duplicate Active','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Aktif'
  ); $q$,
  '23505',
  NULL,
  'database invariant blocks a second active rotation for the same user'
);

SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000070b2';

SELECT throws_ok(
  $q$ SELECT * FROM public.upsert_rotation_with_activation(
    NULL,NULL,'MU107 B','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Mendatang',
    NULL,NULL,NULL,NULL,'00000000-0000-0000-0000-0000000070c3'::uuid
  ); $q$,
  'P0001',
  'Template Slaberan yang dipilih tidak tersedia pada workspace pengguna.',
  'User B cannot bind User A Slaberan template'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.rotations
   WHERE user_id='00000000-0000-0000-0000-0000000070a1'::uuid AND status='Aktif'),
  1,
  'User A has exactly one active rotation'
);

SELECT * FROM finish();
ROLLBACK;
