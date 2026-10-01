-- Phase 2 — system starter catalog, clone isolation, and privilege regression coverage.
-- Run with: supabase test db
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT no_plan();

SELECT has_column('public','templates','is_system_owned','system ownership marker exists');
SELECT has_function('public','clone_system_follow_up_template',ARRAY['uuid','text'],'clone RPC exists');
SELECT ok((SELECT p.prosecdef FROM pg_proc p WHERE p.oid='public.clone_system_follow_up_template(uuid,text)'::regprocedure),'clone RPC is SECURITY DEFINER');
SELECT ok((SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public'] FROM pg_proc p WHERE p.oid='public.clone_system_follow_up_template(uuid,text)'::regprocedure),'clone RPC pins search_path');
SELECT is(has_function_privilege('public','public.clone_system_follow_up_template(uuid,text)','EXECUTE'),false,'PUBLIC cannot execute clone RPC');
SELECT is(has_function_privilege('anon','public.clone_system_follow_up_template(uuid,text)','EXECUTE'),false,'anon cannot execute clone RPC');
SELECT is(has_function_privilege('authenticated','public.clone_system_follow_up_template(uuid,text)','EXECUTE'),true,'authenticated can execute clone RPC');
SELECT is(has_table_privilege('anon','public.templates','SELECT'),false,'anon has no template access');
SELECT is(has_table_privilege('anon','public.template_versions','SELECT'),false,'anon has no version access');
SELECT is(has_table_privilege('authenticated','public.templates','SELECT'),true,'authenticated can read templates');
SELECT is(has_table_privilege('authenticated','public.templates','INSERT'),true,'authenticated can create templates');
SELECT is(has_table_privilege('authenticated','public.templates','UPDATE'),true,'authenticated has template update privilege');
SELECT is(has_table_privilege('authenticated','public.templates','DELETE'),true,'authenticated has template delete privilege');
SELECT is(has_table_privilege('authenticated','public.template_versions','SELECT'),true,'authenticated can read versions');
SELECT is(has_table_privilege('authenticated','public.template_versions','INSERT'),true,'authenticated can append versions');
SELECT is(has_table_privilege('authenticated','public.template_versions','UPDATE'),false,'authenticated cannot update versions');
SELECT is(has_table_privilege('authenticated','public.template_versions','DELETE'),false,'authenticated cannot delete versions');

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-0000-0000-0000000200a1','phase2-a@test.invalid','{}'),
('00000000-0000-0000-0000-0000000200b2','phase2-b@test.invalid','{}');

INSERT INTO public.templates (id,user_id,type,name,description,metadata,is_system_owned) VALUES
('00000000-0000-0000-0000-0000000200d1',NULL,'follow_up','Phase2 Starter','immutable starter','{"source":"phase2-test"}',true);
INSERT INTO public.template_versions (id,user_id,template_id,version,schema_version,definition) VALUES
('00000000-0000-0000-0000-0000000200d2',NULL,'00000000-0000-0000-0000-0000000200d1',1,1,'{"schema_version":1,"sections":[{"id":"s","title":"S","fields":[{"id":"f","label":"F","type":"text"}]}]}'::jsonb);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub"='00000000-0000-0000-0000-0000000200a1';
SELECT lives_ok($q$ UPDATE public.templates SET name='tampered' WHERE id='00000000-0000-0000-0000-0000000200d1' $q$,'User A cannot update system starter');
SELECT lives_ok($q$ DELETE FROM public.templates WHERE id='00000000-0000-0000-0000-0000000200d1' $q$,'User A cannot delete system starter');
SELECT throws_ok($q$ UPDATE public.template_versions SET definition='{}'::jsonb WHERE template_id='00000000-0000-0000-0000-0000000200d1' $q$,'42501',NULL,'User A cannot update system starter version');
SELECT throws_ok($q$ DELETE FROM public.template_versions WHERE template_id='00000000-0000-0000-0000-0000000200d1' $q$,'42501',NULL,'User A cannot delete system starter version');
SELECT is((SELECT name FROM public.templates WHERE id='00000000-0000-0000-0000-0000000200d1'),'Phase2 Starter','starter name remains unchanged');
SELECT is((SELECT definition FROM public.template_versions WHERE template_id='00000000-0000-0000-0000-0000000200d1' AND version=1),'{"schema_version":1,"sections":[{"id":"s","title":"S","fields":[{"id":"f","label":"F","type":"text"}]}]}'::jsonb,'starter definition remains unchanged');

SELECT lives_ok($q$ SELECT public.clone_system_follow_up_template('00000000-0000-0000-0000-0000000200d1',NULL) $q$,'User A can clone starter');
SELECT is((SELECT count(*)::int FROM public.templates WHERE user_id=auth.uid() AND name='Phase2 Starter'),1,'clone belongs to User A');
SELECT is((SELECT count(*)::int FROM public.template_versions v JOIN public.templates t ON t.id=v.template_id WHERE t.user_id=auth.uid() AND v.version=1),1,'clone starts at version 1');
SELECT is((SELECT metadata->>'source' FROM public.templates WHERE user_id=auth.uid() AND name='Phase2 Starter'),'phase2-test','clone preserves source metadata');
SELECT throws_ok($q$ SELECT public.clone_system_follow_up_template('00000000-0000-0000-0000-0000000200d1','Phase2 Starter') $q$,'23505',NULL,'duplicate clone name is rejected');

SET LOCAL "request.jwt.claim.sub"='00000000-0000-0000-0000-0000000200b2';
SELECT is((SELECT count(*)::int FROM public.templates WHERE user_id=auth.uid()),0,'User B cannot read User A templates');
SELECT lives_ok($q$ UPDATE public.templates SET name='B takeover' WHERE user_id='00000000-0000-0000-0000-0000000200a1' $q$,'User B update attempt is rejected by RLS');
RESET ROLE;
SELECT is((SELECT name FROM public.templates WHERE user_id='00000000-0000-0000-0000-0000000200a1' AND name='Phase2 Starter'),'Phase2 Starter','User B cannot update User A template');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub"='00000000-0000-0000-0000-0000000200b2';
SELECT lives_ok($q$ DELETE FROM public.templates WHERE user_id='00000000-0000-0000-0000-0000000200a1' $q$,'User B delete attempt is rejected by RLS');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.templates WHERE user_id='00000000-0000-0000-0000-0000000200a1' AND name='Phase2 Starter'),1,'User B cannot delete User A template');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub"='00000000-0000-0000-0000-0000000200b2';
SELECT lives_ok($q$ SELECT public.clone_system_follow_up_template('00000000-0000-0000-0000-0000000200d1','B starter') $q$,'User B can clone starter independently');
SELECT is((SELECT count(*)::int FROM public.templates WHERE user_id='00000000-0000-0000-0000-0000000200b2' AND name='B starter'),1,'User B clone is owned by User B');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
