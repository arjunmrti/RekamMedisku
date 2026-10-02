BEGIN;
CREATE OR REPLACE FUNCTION public.append_report_template_version(
  p_template_id uuid, p_expected_version integer, p_schema_version integer, p_definition jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE uid uuid := auth.uid(); current_version integer; next_version integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.'; END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'Versi template tidak valid.'; END IF;
  IF p_schema_version <> (p_definition->>'schema_version')::integer THEN RAISE EXCEPTION 'schema_version tidak sesuai dengan definition.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.templates WHERE id=p_template_id AND user_id=uid AND type='report' AND NOT is_archived) THEN RAISE EXCEPTION 'Template report tidak ditemukan dalam workspace pengguna.'; END IF;
  SELECT COALESCE(MAX(version),0) INTO current_version FROM public.template_versions WHERE template_id=p_template_id AND user_id=uid;
  IF current_version <> p_expected_version THEN RAISE EXCEPTION 'Template sudah berubah. Muat ulang versi terbaru.'; END IF;
  next_version := current_version + 1;
  INSERT INTO public.template_versions(user_id,template_id,version,schema_version,definition) VALUES(uid,p_template_id,next_version,p_schema_version,p_definition);
  UPDATE public.templates SET updated_at=now() WHERE id=p_template_id AND user_id=uid;
  RETURN jsonb_build_object('templateId',p_template_id::text,'version',next_version,'schemaVersion',p_schema_version);
END; $fn$;
REVOKE ALL ON FUNCTION public.append_report_template_version(uuid,integer,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_report_template_version(uuid,integer,integer,jsonb) TO authenticated;
COMMIT;
