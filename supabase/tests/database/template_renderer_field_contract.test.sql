-- SECTION 01/05 — Template schema contract acceptance
CREATE EXTENSION IF NOT EXISTS pgtap;
BEGIN;
SELECT plan(4);

SELECT lives_ok(
  $$SELECT public.validate_follow_up_template_definition(
    '{
      "schema_version":1,
      "sections":[
        {
          "id":"objective",
          "title":"Objective",
          "fields":[
            {"id":"notes","label":"Catatan","type":"text"},
            {"id":"score","label":"Skor","type":"number"},
            {"id":"choice","label":"Pilihan","type":"select","options":[{"value":"a","label":"A"}]},
            {"id":"multi","label":"Multi","type":"multiselect","options":[{"value":"a","label":"A"}]},
            {"id":"radio","label":"Radio","type":"radio","options":[{"value":"a","label":"A"}]},
            {"id":"checked","label":"Checklist","type":"checkbox"},
            {"id":"date","label":"Tanggal","type":"date"},
            {"id":"time","label":"Waktu","type":"time"}
          ]
        }
      ]
    }'::jsonb
  )$$,
  'schema_version=1 accepts the complete MVP renderer field set'
);

SELECT throws_ok(
  $$SELECT public.validate_follow_up_template_definition(
    '{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"unsupported","label":"Unsupported","type":"rich_text"}]}]}'::jsonb
  )$$,
  'P0001',
  'Template follow-up tidak valid: type field "rich_text" tidak didukung.',
  'unsupported renderer field types are rejected'
);

SELECT throws_ok(
  $$SELECT public.validate_follow_up_template_definition(
    '{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"date","label":"Tanggal","type":"date","options":[{"value":"x","label":"X"}]}]}]}'::jsonb
  )$$,
  'P0001',
  'Template follow-up tidak valid: options hanya boleh untuk select/multiselect/radio pada field "date".',
  'options are rejected on non-option field types'
);

SELECT throws_ok(
  $$SELECT public.validate_follow_up_template_definition(
    '{"schema_version":1,"sections":[{"id":"objective","title":"Objective","fields":[{"id":"radio","label":"Radio","type":"radio"}]}]}'::jsonb
  )$$,
  'P0001',
  'Template follow-up tidak valid: field "radio" membutuhkan options.',
  'radio fields require an option catalog'
);

SELECT * FROM finish();
ROLLBACK;
