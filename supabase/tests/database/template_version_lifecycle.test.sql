BEGIN;

SELECT plan(8);

SELECT has_table_privilege(
  'authenticated',
  'public.template_versions',
  'SELECT'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.template_versions',
    'INSERT'
  ),
  'authenticated cannot insert template_versions directly'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.template_versions',
    'UPDATE'
  ),
  'authenticated cannot update template_versions directly'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.template_versions',
    'DELETE'
  ),
  'authenticated cannot delete template_versions directly'
);

SELECT has_function_privilege(
  'authenticated',
  'public.create_follow_up_template(text,text,jsonb,integer,jsonb)',
  'EXECUTE'
);

SELECT has_function_privilege(
  'authenticated',
  'public.append_follow_up_template_version(uuid,integer,integer,jsonb)',
  'EXECUTE'
);

SELECT has_function_privilege(
  'authenticated',
  'public.validate_follow_up_template_definition(jsonb)',
  'EXECUTE'
) IS FALSE;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'validate_follow_up_template_definition'
  ),
  'template definition validator exists'
);

SELECT * FROM finish();

ROLLBACK;
