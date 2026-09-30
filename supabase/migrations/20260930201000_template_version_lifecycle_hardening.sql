-- Template version lifecycle hardening
-- Version rows are append-only through the authenticated template RPCs.
-- Direct client INSERT is revoked so callers cannot bypass the canonical
-- validation/concurrency path.

BEGIN;

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.template_versions
FROM authenticated;

GRANT SELECT
ON TABLE public.template_versions
TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_follow_up_template(
  text, text, jsonb, integer, jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.append_follow_up_template_version(
  uuid, integer, integer, jsonb
) TO authenticated;

COMMIT;
