-- MU security hardening — restrict SECURITY DEFINER RPC execution to signed-in users.
-- This migration is part of the remote migration history and contains no
-- application data changes.
BEGIN;

REVOKE ALL ON FUNCTION public.activate_rotation(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_rotation(uuid)
TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_rotation_with_activation(
  uuid,
  timestamptz,
  text,
  text,
  date,
  date,
  text,
  uuid,
  integer,
  uuid,
  integer
)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rotation_with_activation(
  uuid,
  timestamptz,
  text,
  text,
  date,
  date,
  text,
  uuid,
  integer,
  uuid,
  integer
)
TO authenticated;

REVOKE ALL ON FUNCTION public.create_follow_up_template(
  text,
  text,
  jsonb,
  integer,
  jsonb
)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_follow_up_template(
  text,
  text,
  jsonb,
  integer,
  jsonb
)
TO authenticated;

REVOKE ALL ON FUNCTION public.append_follow_up_template_version(
  uuid,
  integer,
  integer,
  jsonb
)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_follow_up_template_version(
  uuid,
  integer,
  integer,
  jsonb
)
TO authenticated;

COMMIT;
