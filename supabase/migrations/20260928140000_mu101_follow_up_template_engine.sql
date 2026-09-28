-- MU-101 — Follow-Up Template Engine foundation
-- Establish a controlled, user-owned template contract on top of the Phase 0
-- generic templates/template_versions catalog.
--
-- Scope:
--   1. Remove the legacy Neurologi/IPD-only CHECK on follow_ups.template_type.
--   2. Define a controlled JSON schema for follow-up templates.
--   3. Provide transactional create + append-version RPCs with optimistic
--      concurrency.
--
-- MU-102/103/104 will consume this foundation when follow-ups and rotations
-- become explicitly bound to template IDs/versions and the renderer moves
-- from specialty branches to definition-driven rendering.

BEGIN;

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS template_type text;

DO $$
DECLARE
  constraint_row record;
  definition text;
BEGIN
  FOR constraint_row IN
    SELECT
      c.conname,
      pg_get_constraintdef(c.oid) AS constraint_definition
    FROM pg_constraint c
    WHERE c.conrelid = 'public.follow_ups'::regclass
      AND c.contype = 'c'
  LOOP
    definition := lower(constraint_row.constraint_definition);

    -- Only remove the known two-specialty allow-list. Unrelated CHECK
    -- constraints must remain untouched.
    IF position('template_type' IN definition) > 0
      AND position('neurologi' IN definition) > 0
      AND position('ilmu penyakit dalam' IN definition) > 0 THEN
      EXECUTE format(
        'ALTER TABLE public.follow_ups DROP CONSTRAINT %I',
        constraint_row.conname
      );
    END IF;
  END LOOP;
END
$$;

COMMENT ON COLUMN public.follow_ups.template_type IS
  'Legacy display label kept for backwards compatibility. New follow-up template identity should use a user-owned template definition and version.';

CREATE OR REPLACE FUNCTION public.validate_follow_up_template_definition(
  p_definition jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  section_item jsonb;
  field_item jsonb;
  option_item jsonb;
  section_index integer := 0;
  field_count integer := 0;
  option_count integer;
  schema_version integer;
  section_id text;
  field_id text;
  field_type text;
  option_value text;
  seen_section_ids text[] := ARRAY[]::text[];
  seen_field_ids text[] := ARRAY[]::text[];
  seen_option_values text[] := ARRAY[]::text[];
BEGIN
  IF jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: root harus berupa object.';
  END IF;

  BEGIN
    schema_version := (p_definition->>'schema_version')::integer;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: schema_version harus berupa integer.';
  END;

  IF schema_version IS NULL OR schema_version < 1 THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: schema_version harus positif.';
  END IF;

  IF schema_version > 1 THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: schema_version % belum didukung aplikasi.', schema_version;
  END IF;

  IF jsonb_typeof(p_definition->'sections') <> 'array' THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: sections harus berupa array.';
  END IF;

  IF jsonb_array_length(p_definition->'sections') < 1
    OR jsonb_array_length(p_definition->'sections') > 30 THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: jumlah section harus 1-30.';
  END IF;

  FOR section_item IN
    SELECT value
    FROM jsonb_array_elements(p_definition->'sections')
  LOOP
    section_index := section_index + 1;

    IF jsonb_typeof(section_item) <> 'object' THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: sections[%] harus berupa object.', section_index;
    END IF;

    section_id := btrim(section_item->>'id');

    IF section_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: section ID "%" tidak valid.', section_id;
    END IF;

    IF section_id = ANY(seen_section_ids) THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: section ID "%" duplikat.', section_id;
    END IF;

    seen_section_ids := array_append(seen_section_ids, section_id);

    IF NULLIF(btrim(section_item->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: title section "%" wajib diisi.', section_id;
    END IF;

    IF jsonb_typeof(section_item->'fields') <> 'array' THEN
      RAISE EXCEPTION 'Template follow-up tidak valid: fields section "%" harus berupa array.', section_id;
    END IF;

    FOR field_item IN
      SELECT value
      FROM jsonb_array_elements(section_item->'fields')
    LOOP
      field_count := field_count + 1;

      IF field_count > 150 THEN
        RAISE EXCEPTION 'Template follow-up tidak valid: jumlah field melebihi 150.';
      END IF;

      IF jsonb_typeof(field_item) <> 'object' THEN
        RAISE EXCEPTION 'Template follow-up tidak valid: field pada section "%" harus berupa object.', section_id;
      END IF;

      field_id := btrim(field_item->>'id');

      IF field_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
        RAISE EXCEPTION 'Template follow-up tidak valid: field ID "%" tidak valid.', field_id;
      END IF;

      IF field_id = ANY(seen_field_ids) THEN
        RAISE EXCEPTION 'Template follow-up tidak valid: field ID "%" duplikat.', field_id;
      END IF;

      seen_field_ids := array_append(seen_field_ids, field_id);

      IF NULLIF(btrim(field_item->>'label'), '') IS NULL THEN
        RAISE EXCEPTION 'Template follow-up tidak valid: label field "%" wajib diisi.', field_id;
      END IF;

      field_type := field_item->>'type';

      IF field_type NOT IN (
        'text',
        'textarea',
        'number',
        'select',
        'multiselect',
        'checkbox'
      ) THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: type field "%" tidak didukung.',
          field_type;
      END IF;

      IF (field_type IN ('select', 'multiselect'))
        AND jsonb_typeof(field_item->'options') <> 'array' THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: field "%" membutuhkan options.',
          field_id;
      END IF;

      IF field_type NOT IN ('select', 'multiselect')
        AND field_item ? 'options' THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: options hanya boleh untuk select/multiselect pada field "%".',
          field_id;
      END IF;

      IF jsonb_typeof(field_item->'options') = 'array' THEN
        option_count := jsonb_array_length(field_item->'options');

        IF option_count < 1 OR option_count > 100 THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: options field "%" harus berisi 1-100 item.',
            field_id;
        END IF;

        seen_option_values := ARRAY[]::text[];

        FOR option_item IN
          SELECT value
          FROM jsonb_array_elements(field_item->'options')
        LOOP
          IF jsonb_typeof(option_item) <> 'object' THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: option field "%" harus berupa object.',
              field_id;
          END IF;

          option_value := btrim(option_item->>'value');

          IF NULLIF(option_value, '') IS NULL
            OR NULLIF(btrim(option_item->>'label'), '') IS NULL THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: option field "%" membutuhkan value dan label.',
              field_id;
          END IF;

          IF option_value = ANY(seen_option_values) THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: option value "%" duplikat pada field "%".',
              option_value,
              field_id
            ;
          END IF;

          seen_option_values := array_append(seen_option_values, option_value);
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_follow_up_template_definition(jsonb)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_follow_up_template(
  p_name text,
  p_description text,
  p_metadata jsonb,
  p_schema_version integer,
  p_definition jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $
DECLARE
  current_user_id uuid := auth.uid();
  new_template_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama template follow-up wajib diisi.';
  END IF;

  IF length(btrim(p_name)) > 200 THEN
    RAISE EXCEPTION 'Nama template follow-up terlalu panjang.';
  END IF;

  IF p_description IS NOT NULL AND length(p_description) > 1000 THEN
    RAISE EXCEPTION 'Deskripsi template follow-up terlalu panjang.';
  END IF;

  IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Metadata template follow-up harus berupa object JSON.';
  END IF;

  PERFORM public.validate_follow_up_template_definition(p_definition);

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
    'follow_up',
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
$$;

REVOKE ALL ON FUNCTION public.create_follow_up_template(
  text,text,jsonb,integer,jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_follow_up_template(
  text,text,jsonb,integer,jsonb
) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_follow_up_template_version(
  p_template_id uuid,
  p_expected_version integer,
  p_schema_version integer,
  p_definition jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $
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
    RAISE EXCEPTION 'Versi template yang diharapkan tidak valid.';
  END IF;

  PERFORM public.validate_follow_up_template_definition(p_definition);

  IF p_schema_version <> (p_definition->>'schema_version')::integer THEN
    RAISE EXCEPTION 'schema_version tidak sesuai dengan definition.';
  END IF;

  SELECT user_id
  INTO template_user_id
  FROM public.templates
  WHERE id = p_template_id
    AND user_id = current_user_id
    AND type = 'follow_up'
    AND NOT is_archived
  FOR UPDATE;

  IF template_user_id IS NULL THEN
    RAISE EXCEPTION 'Template follow-up tidak ditemukan dalam workspace pengguna.';
  END IF;

  SELECT COALESCE(MAX(version), 0)
  INTO current_version
  FROM public.template_versions
  WHERE template_id = p_template_id
    AND user_id = current_user_id;

  IF current_version <> p_expected_version THEN
    RAISE EXCEPTION
      'Template sudah berubah di browser lain. Muat ulang versi terbaru sebelum menyimpan perubahan.';
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
    AND user_id = current_user_id;

  RETURN jsonb_build_object(
    'templateId', p_template_id::text,
    'version', next_version,
    'schemaVersion', p_schema_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.append_follow_up_template_version(
  uuid,integer,integer,jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.append_follow_up_template_version(
  uuid,integer,integer,jsonb
) TO authenticated;

COMMIT;
