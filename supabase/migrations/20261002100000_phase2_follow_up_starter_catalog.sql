-- Phase 2: system-owned starter catalog and atomic user clone.
BEGIN;

ALTER TABLE public.templates ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.template_versions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS is_system_owned boolean NOT NULL DEFAULT false;

ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_system_owner_check;
ALTER TABLE public.templates ADD CONSTRAINT templates_system_owner_check
  CHECK (is_system_owned OR user_id IS NOT NULL);

DROP INDEX IF EXISTS public.templates_user_type_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS templates_user_type_name_unique
  ON public.templates (user_id, type, lower(btrim(name)))
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS templates_system_type_name_unique
  ON public.templates (type, lower(btrim(name)))
  WHERE is_system_owned;

DROP POLICY IF EXISTS templates_select_own ON public.templates;
CREATE POLICY templates_select_own ON public.templates FOR SELECT TO authenticated
  USING (is_system_owned OR (select auth.uid()) = user_id);
DROP POLICY IF EXISTS templates_insert_own ON public.templates;
CREATE POLICY templates_insert_own ON public.templates FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND NOT is_system_owned);
DROP POLICY IF EXISTS templates_update_own ON public.templates;
CREATE POLICY templates_update_own ON public.templates FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND NOT is_system_owned)
  WITH CHECK ((select auth.uid()) = user_id AND NOT is_system_owned);
DROP POLICY IF EXISTS templates_delete_own ON public.templates;
CREATE POLICY templates_delete_own ON public.templates FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND NOT is_system_owned);

DROP POLICY IF EXISTS template_versions_select_own ON public.template_versions;
CREATE POLICY template_versions_select_own ON public.template_versions FOR SELECT TO authenticated
  USING (user_id IS NULL OR (select auth.uid()) = user_id);
DROP POLICY IF EXISTS template_versions_insert_own ON public.template_versions;
CREATE POLICY template_versions_insert_own ON public.template_versions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Stable, immutable system starter. It is intentionally not bindable to a rotation
-- until cloned into the authenticated user's workspace.
INSERT INTO public.templates (id, user_id, type, name, description, metadata, is_system_owned)
VALUES ('00000000-0000-0000-0000-000000000201', NULL, 'follow_up', 'Starter follow-up', 'System starter follow-up template', '{"source":"system"}', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.template_versions (id, user_id, template_id, version, schema_version, definition)
VALUES ('00000000-0000-0000-0000-000000000202', NULL, '00000000-0000-0000-0000-000000000201', 1, 1,
'{"schema_version":1,"sections":[{"id":"general","title":"General","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb)
ON CONFLICT (template_id, version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.clone_system_follow_up_template(
  p_template_id uuid, p_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE uid uuid := auth.uid(); src public.templates; ver public.template_versions; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.'; END IF;
  SELECT * INTO src FROM public.templates WHERE id=p_template_id AND is_system_owned AND type='follow_up' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Starter template follow-up tidak ditemukan.'; END IF;
  SELECT * INTO ver FROM public.template_versions WHERE template_id=src.id AND version=1 FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Starter template follow-up tidak memiliki versi.'; END IF;
  IF NULLIF(btrim(COALESCE(p_name, src.name)), '') IS NULL THEN RAISE EXCEPTION 'Nama template follow-up wajib diisi.'; END IF;
  INSERT INTO public.templates(user_id,type,name,description,metadata) VALUES(uid,src.type,btrim(COALESCE(p_name,src.name)),src.description,src.metadata) RETURNING id INTO new_id;
  INSERT INTO public.template_versions(user_id,template_id,version,schema_version,definition) VALUES(uid,new_id,1,ver.schema_version,ver.definition);
  RETURN jsonb_build_object('templateId',new_id::text,'version',1,'schemaVersion',ver.schema_version);
END; $fn$;
REVOKE ALL ON FUNCTION public.clone_system_follow_up_template(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_system_follow_up_template(uuid,text) TO authenticated;
COMMIT;
