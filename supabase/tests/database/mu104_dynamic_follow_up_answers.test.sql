-- MU-104 — Definition-driven answer persistence
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(8);

SELECT has_column('public','follow_ups','answers','follow-up stores dynamic template answers');
SELECT has_function('public','save_follow_up_with_exams',ARRAY['uuid','timestamptz','jsonb','jsonb'],'atomic follow-up save accepts dynamic answer payloads');

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-0000-0000-0000000040a1','mu104-a@test.invalid','{"full_name":"MU104 A"}'::jsonb);

INSERT INTO public.rotations (id,user_id,name,specialty,start_date,end_date,status)
VALUES ('00000000-0000-0000-0000-0000000040b2','00000000-0000-0000-0000-0000000040a1'::uuid,'MU104','Lainnya',CURRENT_DATE,CURRENT_DATE+30,'Aktif');

INSERT INTO public.patients (id,user_id,rotation_id,name,rm)
VALUES ('00000000-0000-0000-0000-0000000040c3','00000000-0000-0000-0000-0000000040a1'::uuid,'00000000-0000-0000-0000-0000000040b2'::uuid,'Pasien MU104','RM-MU104');

INSERT INTO public.templates (id,user_id,type,name,description)
VALUES ('00000000-0000-0000-0000-0000000040d4','00000000-0000-0000-0000-0000000040a1'::uuid,'follow_up','MU104 Template','dynamic answers');

INSERT INTO public.template_versions (id,user_id,template_id,version,schema_version,definition)
VALUES ('00000000-0000-0000-0000-0000000040e5','00000000-0000-0000-0000-0000000040a1'::uuid,'00000000-0000-0000-0000-0000000040d4'::uuid,1,1,
'{"schema_version":1,"sections":[{"id":"subjective","title":"Subjective","fields":[{"id":"pain","label":"Pain","type":"number","required":true}]}]}'::jsonb);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000040a1';

SELECT lives_ok(
  $q$ SELECT public.save_follow_up_with_exams(
    NULL,NULL,
    jsonb_build_object(
      'patient_id','00000000-0000-0000-0000-0000000040c3',
      'number',1,'date',CURRENT_DATE::text,'iso_date',CURRENT_DATE::text,'time','09:00:00',
      'status','Tersimpan',
      'template_id','00000000-0000-0000-0000-0000000040d4',
      'template_version',1,
      'answers',jsonb_build_object('pain',7),
      'subjective','Keluhan','objective','','assessment','','plan','','summary','Dynamic'
    ),
    '[]'::jsonb
  ); $q$,
  'follow-up save persists template answers'
);

SELECT is(
  (SELECT answers->>'pain' FROM public.follow_ups WHERE user_id='00000000-0000-0000-0000-0000000040a1'::uuid LIMIT 1),
  '7',
  'answer value is keyed by stable field ID'
);

SELECT is(
  (SELECT template_version FROM public.follow_ups WHERE user_id='00000000-0000-0000-0000-0000000040a1'::uuid LIMIT 1),
  1,
  'template version remains pinned with the answer'
);

SELECT throws_ok(
  $q$ SELECT public.save_follow_up_with_exams(
    NULL,NULL,
    jsonb_build_object(
      'patient_id','00000000-0000-0000-0000-0000000040c3',
      'number',2,'date',CURRENT_DATE::text,'iso_date',CURRENT_DATE::text,'time','10:00:00',
      'status','Tersimpan','answers',to_jsonb(ARRAY[1,2]),
      'subjective','','objective','','assessment','','plan','','summary','Bad'
    ),
    '[]'::jsonb
  ); $q$,
  'P0001',
  'Jawaban template follow-up harus berupa object JSON.',
  'answers payload must be an object'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
