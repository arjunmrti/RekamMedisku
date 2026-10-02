-- System-owned follow-up starter catalog: generic and specialty-specific optional fields.
BEGIN;

INSERT INTO public.templates (id, user_id, type, name, description, metadata, is_system_owned)
VALUES
  ('00000000-0000-0000-0000-000000000210', NULL, 'follow_up', 'Generic Clinical Baseline', 'Optional general clinical follow-up fields.', '{"source":"system","catalog":"core-objective-compatible"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000211', NULL, 'follow_up', 'Pediatri', 'Optional pediatric follow-up fields.', '{"source":"system","catalog":"specialty"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000212', NULL, 'follow_up', 'Ilmu Penyakit Dalam', 'Optional internal medicine follow-up fields.', '{"source":"system","catalog":"specialty"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000213', NULL, 'follow_up', 'Pulmonologi', 'Optional pulmonology follow-up fields.', '{"source":"system","catalog":"specialty"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000214', NULL, 'follow_up', 'Neurologi', 'Optional neurology follow-up fields.', '{"source":"system","catalog":"specialty"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000215', NULL, 'follow_up', 'Bedah', 'Optional surgery follow-up fields.', '{"source":"system","catalog":"specialty"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.template_versions (id, user_id, template_id, version, schema_version, definition)
VALUES
  ('00000000-0000-0000-0000-000000000220', NULL, '00000000-0000-0000-0000-000000000210', 1, 1,
   '{"schema_version":1,"sections":[{"id":"general-notes","title":"General Notes","fields":[{"id":"additional-findings","label":"Additional Findings","type":"textarea","required":false}]}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000221', NULL, '00000000-0000-0000-0000-000000000211', 1, 1,
   '{"schema_version":1,"sections":[{"id":"pediatric","title":"Pediatric Additional Fields","fields":[{"id":"growth-development","label":"Growth and Development","type":"textarea","required":false},{"id":"immunization","label":"Immunization","type":"textarea","required":false},{"id":"pediatric-additional-findings","label":"Additional Findings","type":"textarea","required":false}]},{"id":"general-notes","title":"General Notes","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000222', NULL, '00000000-0000-0000-0000-000000000212', 1, 1,
   '{"schema_version":1,"sections":[{"id":"internal-medicine","title":"Internal Medicine Additional Fields","fields":[{"id":"fluid-balance","label":"Fluid Balance","type":"textarea","required":false},{"id":"systemic-review","label":"Systemic Review","type":"textarea","required":false},{"id":"internal-additional-findings","label":"Additional Findings","type":"textarea","required":false}]},{"id":"general-notes","title":"General Notes","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000223', NULL, '00000000-0000-0000-0000-000000000213', 1, 1,
   '{"schema_version":1,"sections":[{"id":"pulmonology","title":"Pulmonology Additional Fields","fields":[{"id":"respiratory-support","label":"Respiratory Support","type":"textarea","required":false},{"id":"sputum","label":"Sputum","type":"textarea","required":false},{"id":"pulmonary-additional-findings","label":"Additional Findings","type":"textarea","required":false}]},{"id":"general-notes","title":"General Notes","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000224', NULL, '00000000-0000-0000-0000-000000000214', 1, 1,
   '{"schema_version":1,"sections":[{"id":"neurology","title":"Neurology Additional Fields","fields":[{"id":"neurologic-change","label":"Neurologic Change","type":"textarea","required":false},{"id":"seizure","label":"Seizure Activity","type":"textarea","required":false},{"id":"neurologic-additional-findings","label":"Additional Findings","type":"textarea","required":false}]},{"id":"general-notes","title":"General Notes","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000225', NULL, '00000000-0000-0000-0000-000000000215', 1, 1,
   '{"schema_version":1,"sections":[{"id":"surgery","title":"Surgery Additional Fields","fields":[{"id":"wound","label":"Wound","type":"textarea","required":false},{"id":"drain","label":"Drain","type":"textarea","required":false},{"id":"surgical-additional-findings","label":"Additional Findings","type":"textarea","required":false}]},{"id":"general-notes","title":"General Notes","fields":[{"id":"notes","label":"Notes","type":"textarea","required":false}]}]}'::jsonb)
ON CONFLICT (template_id, version) DO NOTHING;

COMMIT;
