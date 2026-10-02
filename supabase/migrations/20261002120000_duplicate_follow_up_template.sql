-- Atomic personal follow-up template duplication with collision-safe naming.
BEGIN;

CREATE OR REPLACE FUNCTION public.duplicate_follow_up_template(
  p_source_template_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE
  uid uuid := auth.uid();
  src public.templates;
  ver public.template_versions;
  new_id uuid;
  new_name text;
  base_name text;
  suffix int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  SELECT * INTO src
  FROM public.templates
  WHERE id = p_source_template_id
    AND user_id = uid
    AND type = 'follow_up'
    AND NOT is_system_owned
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template follow-up tidak ditemukan atau bukan milik Anda.';
  END IF;

  SELECT * INTO ver
  FROM public.template_versions
  WHERE template_id = src.id
    AND user_id = uid
  ORDER BY version DESC
  LIMIT 1
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template follow-up tidak memiliki versi aktif.';
  END IF;

  base_name := btrim(src.name) || ' (Salinan)';
  new_name := base_name;

  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.templates
      WHERE user_id = uid
        AND type = 'follow_up'
        AND lower(btrim(name)) = lower(new_name)
    );
    suffix := suffix + 1;
    new_name := base_name || ' ' || suffix::text;
  END LOOP;

  INSERT INTO public.templates (user_id, type, name, description, metadata, is_archived, is_system_owned)
  VALUES (uid, src.type, new_name, src.description, src.metadata, false, false)
  RETURNING id INTO new_id;

  INSERT INTO public.template_versions (user_id, template_id, version, schema_version, definition)
  VALUES (uid, new_id, 1, ver.schema_version, ver.definition);

  RETURN jsonb_build_object('templateId', new_id::text, 'name', new_name, 'version', 1);
END;
$fn$;

REVOKE ALL ON FUNCTION public.duplicate_follow_up_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_follow_up_template(uuid) TO authenticated;

COMMIT;
