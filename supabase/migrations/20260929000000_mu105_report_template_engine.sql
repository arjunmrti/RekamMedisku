-- MU-105 — User-owned report template definition + renderer contract.
-- The generic Phase 0 templates/template_versions catalog already supports
-- type='report'. This migration adds report-specific definition validation and
-- atomic create/append-version RPCs without changing existing follow-up data.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_report_template_definition(
  p_definition jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $fn$
DECLARE
  section_item jsonb;
  block_item jsonb;
  schema_version integer;
  section_index integer := 0;
  block_count integer := 0;
  section_id text;
  block_id text;
  block_type text;
  block_source text;
  seen_section_ids text[] := ARRAY[]::text[];
  seen_block_ids text[];
BEGIN
  IF jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Template laporan tidak valid: root harus berupa object.';
  END IF;

  BEGIN
    schema_version := (p_definition->>'schema_version')::integer;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Template laporan tidak valid: schema_version harus berupa integer.';
  END;

  IF schema_version IS NULL OR schema_version < 1 THEN
    RAISE EXCEPTION 'Template laporan tidak valid: schema_version harus positif.';
  END IF;

  IF schema_version > 1 THEN
    RAISE EXCEPTION
      'Template laporan tidak valid: schema_version % belum didukung aplikasi.',
      schema_version;
  END IF;

  IF jsonb_typeof(p_definition->'sections') <> 'array' THEN
    RAISE EXCEPTION
      'Template laporan tidak valid: sections harus berupa array.';
  END IF;

  IF jsonb_array_length(p_definition->'sections') < 1
    OR jsonb_array_length(p_definition->'sections') > 30 THEN
    RAISE EXCEPTION
      'Template laporan tidak valid: jumlah section harus 1-30.';
  END IF;

  FOR section_item IN
    SELECT value
    FROM jsonb_array_elements(p_definition->'sections')
  LOOP
    section_index := section_index + 1;

    IF jsonb_typeof(section_item) <> 'object' THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: sections[%] harus berupa object.',
        section_index;
    END IF;

    section_id := btrim(section_item->>'id');

    IF section_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: section ID "%" tidak valid.',
        section_id;
    END IF;

    IF section_id = ANY(seen_section_ids) THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: section ID "%" duplikat.',
        section_id;
    END IF;

    seen_section_ids := array_append(seen_section_ids, section_id);

    IF NULLIF(btrim(section_item->>'title'), '') IS NULL THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: title section "%" wajib diisi.',
        section_id;
    END IF;

    IF jsonb_typeof(section_item->'blocks') <> 'array' THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: blocks section "%" harus berupa array.',
        section_id;
    END IF;

    IF jsonb_array_length(section_item->'blocks') < 1 THEN
      RAISE EXCEPTION
        'Template laporan tidak valid: section "%" harus memiliki minimal satu block.',
        section_id;
    END IF;

    seen_block_ids := ARRAY[]::text[];

    FOR block_item IN
      SELECT value
      FROM jsonb_array_elements(section_item->'blocks')
    LOOP
      block_count := block_count + 1;

      IF block_count > 150 THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: jumlah block melebihi 150.';
      END IF;

      IF jsonb_typeof(block_item) <> 'object' THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: block pada section "%" harus berupa object.',
          section_id;
      END IF;

      block_id := btrim(block_item->>'id');

      IF block_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: block ID "%" tidak valid.',
          block_id;
      END IF;

      IF block_id = ANY(seen_block_ids) THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: block ID "%" duplikat pada section "%".',
          block_id,
          section_id;
      END IF;

      seen_block_ids := array_append(seen_block_ids, block_id);

      block_type := block_item->>'type';

      IF block_type NOT IN (
        'text',
        'value',
        'template_answers',
        'supporting_exams'
      ) THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: type block "%" tidak didukung.',
          block_type;
      END IF;

      IF block_type = 'text' THEN
        IF NULLIF(btrim(block_item->>'text'), '') IS NULL THEN
          RAISE EXCEPTION
            'Template laporan tidak valid: block text "%" membutuhkan text.',
            block_id;
        END IF;

        IF length(block_item->>'text') > 2000 THEN
          RAISE EXCEPTION
            'Template laporan tidak valid: text block "%" terlalu panjang.',
            block_id;
        END IF;
      ELSIF block_type = 'value' THEN
        block_source := block_item->>'source';

        IF block_source NOT IN (
          'identity.report_introduction',
          'patient.name',
          'patient.age',
          'patient.gender',
          'patient.rm',
          'patient.room',
          'patient.bed',
          'patient.doctor',
          'patient.admission_date',
          'patient.admission_complaint',
          'rotation.name',
          'follow_up.date',
          'follow_up.subjective',
          'follow_up.objective',
          'follow_up.assessment',
          'follow_up.plan',
          'follow_up.planning',
          'follow_up.instruction',
          'follow_up.summary'
        ) THEN
          RAISE EXCEPTION
            'Template laporan tidak valid: source "%" tidak didukung.',
            block_source;
        END IF;
      ELSIF block_type = 'supporting_exams' THEN
        IF block_item ? 'includeAttachments'
          AND jsonb_typeof(block_item->'includeAttachments') <> 'boolean' THEN
          RAISE EXCEPTION
            'Template laporan tidak valid: includeAttachments harus boolean pada block "%".',
            block_id;
        END IF;
      END IF;

      IF block_item ? 'label'
        AND length(COALESCE(block_item->>'label', '')) > 160 THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: label block "%" terlalu panjang.',
          block_id;
      END IF;

      IF block_item ? 'emptyText'
        AND length(COALESCE(block_item->>'emptyText', '')) > 240 THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: emptyText block "%" terlalu panjang.',
          block_id;
      END IF;

      IF block_item ? 'title'
        AND length(COALESCE(block_item->>'title', '')) > 160 THEN
        RAISE EXCEPTION
          'Template laporan tidak valid: title block "%" terlalu panjang.',
          block_id;
      END IF;
    END LOOP;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_report_template_definition(jsonb)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_report_template(
  p_name text,
  p_description text,
  p_metadata jsonb,
  p_schema_version integer,
  p_definition jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  new_template_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama template laporan wajib diisi.';
  END IF;

  IF length(btrim(p_name)) > 200 THEN
    RAISE EXCEPTION 'Nama template laporan terlalu panjang.';
  END IF;

  IF p_description IS NOT NULL AND length(p_description) > 1000 THEN
    RAISE EXCEPTION 'Deskripsi template laporan terlalu panjang.';
  END IF;

  IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Metadata template laporan harus berupa object JSON.';
  END IF;

  PERFORM public.validate_report_template_definition(p_definition);

  IF p_schema_version <> (p_definition->>'schema_version')::integer THEN
    RAISE EXCEPTION 'schema_version tidak sesuai dengan definition.';
  END IF;

  INSERT INTO public.templates (
    user_id,
    type,
    name,
    description,
    metadata
  )
  VALUES (
    current_user_id,
    'report',
    btrim(p_name),
    COALESCE(p_description, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_template_id;

  INSERT INTO public.template_versions (
    user_id,
    template_id,
    version,
    schema_version,
    definition
  )
  VALUES (
    current_user_id,
    new_template_id,
    1,
    p_schema_version,
    p_definition
  );

  RETURN jsonb_build_object(
    'templateId', new_template_id::text,
    'version', 1,
    'schemaVersion', p_schema_version
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_report_template(
  text,text,jsonb,integer,jsonb
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_report_template(
  text,text,jsonb,integer,jsonb
)
TO authenticated;

CREATE OR REPLACE FUNCTION public.append_report_template_version(
  p_template_id uuid,
  p_expected_version integer,
  p_schema_version integer,
  p_definition jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  template_user_id uuid;
  current_version integer;
  next_version integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Versi template laporan yang diharapkan tidak valid.';
  END IF;

  PERFORM public.validate_report_template_definition(p_definition);

  IF p_schema_version <> (p_definition->>'schema_version')::integer THEN
    RAISE EXCEPTION 'schema_version tidak sesuai dengan definition.';
  END IF;

  SELECT user_id
  INTO template_user_id
  FROM public.templates
  WHERE id = p_template_id
    AND type = 'report';

  IF NOT FOUND OR template_user_id <> current_user_id THEN
    RAISE EXCEPTION 'Template laporan tidak berada dalam workspace pengguna.';
  END IF;

  SELECT COALESCE(MAX(version), 0)
  INTO current_version
  FROM public.template_versions
  WHERE template_id = p_template_id
    AND user_id = current_user_id;

  IF current_version <> p_expected_version THEN
    RAISE EXCEPTION
      'Versi template laporan sudah berubah. Muat ulang template sebelum menyimpan versi baru.';
  END IF;

  next_version := current_version + 1;

  INSERT INTO public.template_versions (
    user_id,
    template_id,
    version,
    schema_version,
    definition
  )
  VALUES (
    current_user_id,
    p_template_id,
    next_version,
    p_schema_version,
    p_definition
  );

  UPDATE public.templates
  SET updated_at = now()
  WHERE id = p_template_id
    AND user_id = current_user_id
    AND type = 'report';

  RETURN jsonb_build_object(
    'templateId', p_template_id::text,
    'version', next_version,
    'schemaVersion', p_schema_version
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.append_report_template_version(
  uuid,integer,integer,jsonb
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.append_report_template_version(
  uuid,integer,integer,jsonb
)
TO authenticated;

COMMIT;
