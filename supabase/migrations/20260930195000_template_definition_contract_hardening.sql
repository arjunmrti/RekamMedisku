-- Template definition contract hardening
-- Keeps schema_version=1 stable while making the database validator enforce
-- the same optional field contract as the application validator.
-- This is a forward-only reconciliation; earlier migrations remain untouched.

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_follow_up_template_definition(
  p_definition jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $fn$
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
  section_description text;
  placeholder text;
  help_text text;
  unit text;
  rows_value integer;
  required_value boolean;
  seen_section_ids text[] := ARRAY[]::text[];
  seen_field_ids text[] := ARRAY[]::text[];
  seen_option_values text[];
BEGIN
  IF jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Template follow-up tidak valid: root harus berupa object.';
  END IF;

  BEGIN
    schema_version := (p_definition->>'schema_version')::integer;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: schema_version harus berupa integer.';
  END;

  IF schema_version IS NULL OR schema_version < 1 THEN
    RAISE EXCEPTION
      'Template follow-up tidak valid: schema_version harus positif.';
  END IF;

  IF schema_version > 1 THEN
    RAISE EXCEPTION
      'Template follow-up tidak valid: schema_version % belum didukung aplikasi.',
      schema_version;
  END IF;

  IF jsonb_typeof(p_definition->'sections') <> 'array' THEN
    RAISE EXCEPTION
      'Template follow-up tidak valid: sections harus berupa array.';
  END IF;

  IF jsonb_array_length(p_definition->'sections') < 1
    OR jsonb_array_length(p_definition->'sections') > 30 THEN
    RAISE EXCEPTION
      'Template follow-up tidak valid: jumlah section harus 1-30.';
  END IF;

  FOR section_item IN
    SELECT value
    FROM jsonb_array_elements(p_definition->'sections')
  LOOP
    section_index := section_index + 1;

    IF jsonb_typeof(section_item) <> 'object' THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: sections[%] harus berupa object.',
        section_index;
    END IF;

    section_id := btrim(section_item->>'id');

    IF section_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: section ID "%" tidak valid.',
        section_id;
    END IF;

    IF section_id = ANY(seen_section_ids) THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: section ID "%" duplikat.',
        section_id;
    END IF;

    seen_section_ids := array_append(seen_section_ids, section_id);

    IF NULLIF(btrim(section_item->>'title'), '') IS NULL THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: title section "%" wajib diisi.',
        section_id;
    END IF;

    section_description := section_item->>'description';
    IF section_item ? 'description' THEN
      IF section_description IS NULL THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: description section "%" harus berupa teks.',
          section_id;
      END IF;

      section_description := btrim(section_description);

      IF length(section_description) > 400 THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: description section "%" terlalu panjang.',
          section_id;
      END IF;
    END IF;

    IF jsonb_typeof(section_item->'fields') <> 'array' THEN
      RAISE EXCEPTION
        'Template follow-up tidak valid: fields section "%" harus berupa array.',
        section_id;
    END IF;

    FOR field_item IN
      SELECT value
      FROM jsonb_array_elements(section_item->'fields')
    LOOP
      field_count := field_count + 1;

      IF field_count > 150 THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: jumlah field melebihi 150.';
      END IF;

      IF jsonb_typeof(field_item) <> 'object' THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: field pada section "%" harus berupa object.',
          section_id;
      END IF;

      field_id := btrim(field_item->>'id');

      IF field_id !~ '^[a-z][a-z0-9_-]{1,63}$' THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: field ID "%" tidak valid.',
          field_id;
      END IF;

      IF field_id = ANY(seen_field_ids) THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: field ID "%" duplikat.',
          field_id;
      END IF;

      seen_field_ids := array_append(seen_field_ids, field_id);

      IF NULLIF(btrim(field_item->>'label'), '') IS NULL THEN
        RAISE EXCEPTION
          'Template follow-up tidak valid: label field "%" wajib diisi.',
          field_id;
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

      IF field_item ? 'required' THEN
        IF jsonb_typeof(field_item->'required') <> 'boolean' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: required field "%" harus berupa boolean.',
            field_id;
        END IF;

        required_value := (field_item->>'required')::boolean;

        IF field_type = 'checkbox' AND required_value THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: checkbox tidak mendukung required=true pada field "%".',
            field_id;
        END IF;
      END IF;

      IF field_item ? 'placeholder' THEN
        placeholder := field_item->>'placeholder';
        IF placeholder IS NULL THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: placeholder field "%" harus berupa teks.',
            field_id;
        END IF;

        placeholder := btrim(placeholder);

        IF placeholder = '' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: placeholder field "%" tidak boleh kosong.',
            field_id;
        END IF;

        IF length(placeholder) > 240 THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: placeholder field "%" terlalu panjang.',
            field_id;
        END IF;
      END IF;

      IF field_item ? 'helpText' THEN
        help_text := field_item->>'helpText';
        IF help_text IS NULL THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: helpText field "%" harus berupa teks.',
            field_id;
        END IF;

        help_text := btrim(help_text);

        IF help_text = '' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: helpText field "%" tidak boleh kosong.',
            field_id;
        END IF;

        IF length(help_text) > 300 THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: helpText field "%" terlalu panjang.',
            field_id;
        END IF;
      END IF;

      IF field_item ? 'unit' THEN
        unit := field_item->>'unit';
        IF unit IS NULL THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: unit field "%" harus berupa teks.',
            field_id;
        END IF;

        unit := btrim(unit);

        IF unit = '' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: unit field "%" tidak boleh kosong.',
            field_id;
        END IF;

        IF length(unit) > 40 THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: unit field "%" terlalu panjang.',
            field_id;
        END IF;
      END IF;

      IF field_item ? 'rows' THEN
        IF jsonb_typeof(field_item->'rows') <> 'number' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: rows field "%" harus berupa number.',
            field_id;
        END IF;

        BEGIN
          rows_value := (field_item->>'rows')::integer;
        EXCEPTION
          WHEN invalid_text_representation THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: rows field "%" harus berupa integer.',
              field_id;
        END;

        IF rows_value < 1 OR rows_value > 12
          OR rows_value::numeric <> (field_item->>'rows')::numeric THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: rows field "%" harus integer 1-12.',
            field_id;
        END IF;
      END IF;

      IF field_type IN ('select', 'multiselect') THEN
        IF jsonb_typeof(field_item->'options') <> 'array' THEN
          RAISE EXCEPTION
            'Template follow-up tidak valid: field "%" membutuhkan options.',
            field_id;
        END IF;
      ELSIF field_item ? 'options' THEN
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

          IF length(option_value) > 120
            OR length(btrim(option_item->>'label')) > 160 THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: option field "%" melebihi batas panjang.',
              field_id;
          END IF;

          IF option_value = ANY(seen_option_values) THEN
            RAISE EXCEPTION
              'Template follow-up tidak valid: option value "%" duplikat pada field "%".',
              option_value,
              field_id;
          END IF;

          seen_option_values := array_append(seen_option_values, option_value);
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_follow_up_template_definition(jsonb)
FROM PUBLIC, anon, authenticated;

COMMIT;
