-- Harden template validator and append-only template version ACLs.
BEGIN;

REVOKE ALL ON FUNCTION public.validate_follow_up_template_definition(jsonb)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.template_versions FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.template_versions TO authenticated;

COMMIT;
