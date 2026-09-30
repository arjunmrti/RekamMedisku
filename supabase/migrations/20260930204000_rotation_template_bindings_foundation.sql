-- SECTION 03 — Rotation template bindings
-- Introduces a dedicated binding layer so one rotation can have multiple
-- documentation templates while keeping the existing rotation template
-- columns as a backward-compatible mirror for the current application.
--
-- The binding row pins a template version for the context. A new template
-- version does not silently change a rotation's active format; the user must
-- explicitly switch the binding.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rotation_template_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  rotation_id uuid NOT NULL,
  template_id uuid NOT NULL,
  template_version integer NOT NULL CHECK (template_version > 0),
  document_type text NOT NULL
    CHECK (document_type IN ('follow_up', 'report')),
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
    CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  UNIQUE (
    rotation_id,
    document_type,
    template_id,
    template_version
  ),
  CONSTRAINT rotation_template_bindings_rotation_user_fkey
    FOREIGN KEY (rotation_id, user_id)
    REFERENCES public.rotations(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT rotation_template_bindings_template_user_fkey
    FOREIGN KEY (template_id, user_id)
    REFERENCES public.templates(id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT rotation_template_bindings_template_version_fkey
    FOREIGN KEY (template_id, template_version)
    REFERENCES public.template_versions(template_id, version)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS rotation_template_bindings_rotation_idx
  ON public.rotation_template_bindings(
    rotation_id,
    document_type,
    sort_order,
    created_at
  );

CREATE INDEX IF NOT EXISTS rotation_template_bindings_user_idx
  ON public.rotation_template_bindings(
    user_id,
    rotation_id,
    document_type
  );

CREATE UNIQUE INDEX IF NOT EXISTS rotation_template_bindings_one_default_idx
  ON public.rotation_template_bindings(rotation_id, document_type)
  WHERE is_default = true;

COMMENT ON TABLE public.rotation_template_bindings IS
  'User-owned template selections available in a rotation/context. Each binding pins a template version for new documents.';

COMMENT ON COLUMN public.rotation_template_bindings.template_version IS
  'Version explicitly selected for this rotation binding. New template versions do not silently replace the pinned context.';

COMMENT ON COLUMN public.rotation_template_bindings.is_default IS
  'The template automatically selected for the corresponding document type in this rotation.';

COMMENT ON COLUMN public.rotation_template_bindings.sort_order IS
  'User-defined display order for templates within the same rotation and document type.';

ALTER TABLE public.rotation_template_bindings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rotation_template_bindings
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.rotation_template_bindings
TO authenticated;

DROP POLICY IF EXISTS rotation_template_bindings_select_own
  ON public.rotation_template_bindings;

CREATE POLICY rotation_template_bindings_select_own
  ON public.rotation_template_bindings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_rotation_template_bindings_set_updated_at
  ON public.rotation_template_bindings;

CREATE TRIGGER trg_rotation_template_bindings_set_updated_at
  BEFORE UPDATE ON public.rotation_template_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Backfill compatibility bindings from the template columns already stored
-- on rotations.
-- ---------------------------------------------------------------------------

INSERT INTO public.rotation_template_bindings (
  user_id,
  rotation_id,
  template_id,
  template_version,
  document_type,
  is_default,
  sort_order
)
SELECT
  r.user_id,
  r.id,
  r.follow_up_template_id,
  r.follow_up_template_version,
  'follow_up',
  true,
  0
FROM public.rotations r
WHERE r.follow_up_template_id IS NOT NULL
  AND r.follow_up_template_version IS NOT NULL
ON CONFLICT (
  rotation_id,
  document_type,
  template_id,
  template_version
) DO UPDATE
SET
  is_default = true,
  updated_at = now();

INSERT INTO public.rotation_template_bindings (
  user_id,
  rotation_id,
  template_id,
  template_version,
  document_type,
  is_default,
  sort_order
)
SELECT
  r.user_id,
  r.id,
  r.report_template_id,
  r.report_template_version,
  'report',
  true,
  0
FROM public.rotations r
WHERE r.report_template_id IS NOT NULL
  AND r.report_template_version IS NOT NULL
ON CONFLICT (
  rotation_id,
  document_type,
  template_id,
  template_version
) DO UPDATE
SET
  is_default = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Compatibility mirror.
-- The existing rotation columns remain a supported mirror for the current
-- application. Binding mutations update these columns; direct rotation
-- mutations are mirrored back into the binding layer.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_rotation_template_bindings_from_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  -- Follow-up default.
  UPDATE public.rotation_template_bindings
  SET
    is_default = false,
    updated_at = now()
  WHERE rotation_id = NEW.id
    AND user_id = NEW.user_id
    AND document_type = 'follow_up'
    AND is_default = true;

  IF NEW.follow_up_template_id IS NOT NULL
    AND NEW.follow_up_template_version IS NOT NULL THEN
    INSERT INTO public.rotation_template_bindings (
      user_id,
      rotation_id,
      template_id,
      template_version,
      document_type,
      is_default,
      sort_order
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      NEW.follow_up_template_id,
      NEW.follow_up_template_version,
      'follow_up',
      true,
      0
    )
    ON CONFLICT (
      rotation_id,
      document_type,
      template_id,
      template_version
    ) DO UPDATE
    SET
      is_default = true,
      updated_at = now();
  ELSE
    DELETE FROM public.rotation_template_bindings
    WHERE rotation_id = NEW.id
      AND user_id = NEW.user_id
      AND document_type = 'follow_up'
      AND is_default = false
      AND template_id IS NULL;
  END IF;

  -- Report default.
  UPDATE public.rotation_template_bindings
  SET
    is_default = false,
    updated_at = now()
  WHERE rotation_id = NEW.id
    AND user_id = NEW.user_id
    AND document_type = 'report'
    AND is_default = true;

  IF NEW.report_template_id IS NOT NULL
    AND NEW.report_template_version IS NOT NULL THEN
    INSERT INTO public.rotation_template_bindings (
      user_id,
      rotation_id,
      template_id,
      template_version,
      document_type,
      is_default,
      sort_order
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      NEW.report_template_id,
      NEW.report_template_version,
      'report',
      true,
      0
    )
    ON CONFLICT (
      rotation_id,
      document_type,
      template_id,
      template_version
    ) DO UPDATE
    SET
      is_default = true,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.sync_rotation_template_bindings_from_columns()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_rotation_template_bindings_from_columns
  ON public.rotations;

CREATE TRIGGER trg_sync_rotation_template_bindings_from_columns
  AFTER INSERT OR UPDATE OF
    follow_up_template_id,
    follow_up_template_version,
    report_template_id,
    report_template_version
  ON public.rotations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_rotation_template_bindings_from_columns();

-- ---------------------------------------------------------------------------
-- Canonical binding mutation RPC.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_rotation_template_binding(
  p_binding_id uuid,
  p_rotation_id uuid,
  p_document_type text,
  p_template_id uuid,
  p_template_version integer,
  p_is_default boolean DEFAULT false,
  p_sort_order integer DEFAULT 0,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  rotation_id uuid,
  template_id uuid,
  template_version integer,
  document_type text,
  is_default boolean,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  existing record;
  target_template_type text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF p_document_type NOT IN ('follow_up', 'report') THEN
    RAISE EXCEPTION 'Jenis dokumentasi template tidak valid.';
  END IF;

  IF p_rotation_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.rotations r
      WHERE r.id = p_rotation_id
        AND r.user_id = current_user_id
    ) THEN
    RAISE EXCEPTION 'Stase yang dipilih tidak ditemukan.';
  END IF;

  IF p_template_id IS NULL OR p_template_version IS NULL OR p_template_version < 1 THEN
    RAISE EXCEPTION 'Template dan versinya wajib diisi.';
  END IF;

  IF p_sort_order < 0 THEN
    RAISE EXCEPTION 'Urutan template tidak valid.';
  END IF;

  SELECT t.type
  INTO target_template_type
  FROM public.templates t
  JOIN public.template_versions tv
    ON tv.template_id = t.id
   AND tv.user_id = t.user_id
   AND tv.version = p_template_version
  WHERE t.id = p_template_id
    AND t.user_id = current_user_id
    AND NOT t.is_archived;

  IF target_template_type IS NULL THEN
    RAISE EXCEPTION 'Template yang dipilih tidak tersedia pada workspace pengguna.';
  END IF;

  IF target_template_type <> p_document_type THEN
    RAISE EXCEPTION 'Jenis template tidak sesuai dengan jenis binding.';
  END IF;

  IF p_binding_id IS NOT NULL THEN
    SELECT *
    INTO existing
    FROM public.rotation_template_bindings b
    WHERE b.id = p_binding_id
      AND b.user_id = current_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Binding template tidak ditemukan.';
    END IF;

    IF existing.rotation_id <> p_rotation_id
      OR existing.document_type <> p_document_type THEN
      RAISE EXCEPTION 'Binding template tidak sesuai dengan context yang dipilih.';
    END IF;

    IF p_expected_updated_at IS NULL
      OR existing.updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION
        'Binding template sudah berubah. Muat ulang context terbaru sebelum menyimpan perubahan.';
    END IF;

    UPDATE public.rotation_template_bindings b
    SET
      template_id = p_template_id,
      template_version = p_template_version,
      is_default = p_is_default,
      sort_order = p_sort_order,
      updated_at = now()
    WHERE b.id = p_binding_id
      AND b.user_id = current_user_id;
  ELSE
    SELECT *
    INTO existing
    FROM public.rotation_template_bindings b
    WHERE b.user_id = current_user_id
      AND b.rotation_id = p_rotation_id
      AND b.document_type = p_document_type
      AND b.template_id = p_template_id
      AND b.template_version = p_template_version
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.rotation_template_bindings b
      SET
        is_default = p_is_default,
        sort_order = p_sort_order,
        updated_at = now()
      WHERE b.id = existing.id
        AND b.user_id = current_user_id;
      p_binding_id := existing.id;
    ELSE
      INSERT INTO public.rotation_template_bindings (
        user_id,
        rotation_id,
        template_id,
        template_version,
        document_type,
        is_default,
        sort_order
      )
      VALUES (
        current_user_id,
        p_rotation_id,
        p_template_id,
        p_template_version,
        p_document_type,
        p_is_default,
        p_sort_order
      )
      RETURNING rotation_template_bindings.id
      INTO p_binding_id;
    END IF;
  END IF;

  IF p_is_default THEN
    UPDATE public.rotation_template_bindings
    SET
      is_default = false,
      updated_at = now()
    WHERE user_id = current_user_id
      AND rotation_id = p_rotation_id
      AND document_type = p_document_type
      AND id <> p_binding_id;

    UPDATE public.rotations r
    SET
      follow_up_template_id = CASE
        WHEN p_document_type = 'follow_up' THEN p_template_id
        ELSE r.follow_up_template_id
      END,
      follow_up_template_version = CASE
        WHEN p_document_type = 'follow_up' THEN p_template_version
        ELSE r.follow_up_template_version
      END,
      report_template_id = CASE
        WHEN p_document_type = 'report' THEN p_template_id
        ELSE r.report_template_id
      END,
      report_template_version = CASE
        WHEN p_document_type = 'report' THEN p_template_version
        ELSE r.report_template_version
      END,
      updated_at = now()
    WHERE r.id = p_rotation_id
      AND r.user_id = current_user_id;
  ELSE
    SELECT *
    INTO existing
    FROM public.rotation_template_bindings b
    WHERE b.id = p_binding_id
      AND b.user_id = current_user_id;

    IF existing.is_default THEN
      UPDATE public.rotations r
      SET
        follow_up_template_id = CASE
          WHEN p_document_type = 'follow_up' THEN NULL
          ELSE r.follow_up_template_id
        END,
        follow_up_template_version = CASE
          WHEN p_document_type = 'follow_up' THEN NULL
          ELSE r.follow_up_template_version
        END,
        report_template_id = CASE
          WHEN p_document_type = 'report' THEN NULL
          ELSE r.report_template_id
        END,
        report_template_version = CASE
          WHEN p_document_type = 'report' THEN NULL
          ELSE r.report_template_version
        END,
        updated_at = now()
      WHERE r.id = p_rotation_id
        AND r.user_id = current_user_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    b.rotation_id,
    b.template_id,
    b.template_version,
    b.document_type,
    b.is_default,
    b.sort_order,
    b.created_at,
    b.updated_at
  FROM public.rotation_template_bindings b
  WHERE b.id = p_binding_id
    AND b.user_id = current_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.upsert_rotation_template_binding(
  uuid, uuid, text, uuid, integer, boolean, integer, timestamptz
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_rotation_template_binding(
  uuid, uuid, text, uuid, integer, boolean, integer, timestamptz
) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_rotation_template_binding(
  p_binding_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  binding record;
  rotation_status text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  SELECT b.*, r.status
  INTO binding
  FROM public.rotation_template_bindings b
  JOIN public.rotations r
    ON r.id = b.rotation_id
   AND r.user_id = b.user_id
  WHERE b.id = p_binding_id
    AND b.user_id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Binding template tidak ditemukan.';
  END IF;

  rotation_status := binding.status;

  IF p_expected_updated_at IS NULL
    OR binding.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION
      'Binding template sudah berubah. Muat ulang context terbaru sebelum menghapus.';
  END IF;

  IF binding.is_default
    AND binding.document_type = 'follow_up'
    AND rotation_status = 'Aktif' THEN
    RAISE EXCEPTION
      'Template follow-up default pada stase aktif tidak dapat dihapus sebelum template pengganti dipilih.';
  END IF;

  DELETE FROM public.rotation_template_bindings
  WHERE id = p_binding_id
    AND user_id = current_user_id;

  IF binding.is_default THEN
    UPDATE public.rotations r
    SET
      follow_up_template_id = CASE
        WHEN binding.document_type = 'follow_up' THEN NULL
        ELSE r.follow_up_template_id
      END,
      follow_up_template_version = CASE
        WHEN binding.document_type = 'follow_up' THEN NULL
        ELSE r.follow_up_template_version
      END,
      report_template_id = CASE
        WHEN binding.document_type = 'report' THEN NULL
        ELSE r.report_template_id
      END,
      report_template_version = CASE
        WHEN binding.document_type = 'report' THEN NULL
        ELSE r.report_template_version
      END,
      updated_at = now()
    WHERE r.id = binding.rotation_id
      AND r.user_id = current_user_id;
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.delete_rotation_template_binding(
  uuid, timestamptz
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.delete_rotation_template_binding(
  uuid, timestamptz
) TO authenticated;

COMMIT;
