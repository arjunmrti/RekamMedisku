BEGIN;

SELECT plan(7);

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.template_versions',
    'SELECT'
  ),
  'authenticated can read template_versions'
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

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.create_follow_up_template(text,text,jsonb,integer,jsonb)',
    'EXECUTE'
  ),
  'authenticated can create templates through the RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.append_follow_up_template_version(uuid,integer,integer,jsonb)',
    'EXECUTE'
  ),
  'authenticated can append versions through the canonical RPC'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.validate_follow_up_template_definition(jsonb)',
    'EXECUTE'
  ),
  'internal validator is not callable by authenticated clients'
);

SELECT * FROM finish();

ROLLBACK;
