-- SECTION 03 — Rotation binding safety reconciliation
-- Corrects lifecycle edge cases in the binding mutation introduced by the
-- initial binding foundation. The original migration remains immutable.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_rotation_template_bindings_from_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
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
  END IF;

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
  existing_was_default boolean := false;
  target_template_type text;
  target_rotation_status text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF p_document_type NOT IN ('follow_up', 'report') THEN
    RAISE EXCEPTION 'Jenis dokumentasi template tidak valid.';
  END IF;

  SELECT r.status
  INTO target_rotation_status
  FROM public.rotations r
  WHERE r.id = p_rotation_id
    AND r.user_id = current_user_id;

  IF target_rotation_status IS NULL THEN
    RAISE EXCEPTION 'Stase yang dipilih tidak ditemukan.';
  END IF;

  IF p_template_id IS NULL
    OR p_template_version IS NULL
    OR p_template_version < 1 THEN
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

    existing_was_default := existing.is_default;

    IF existing_was_default
      AND NOT p_is_default
      AND p_document_type = 'follow_up'
      AND target_rotation_status = 'Aktif' THEN
      RAISE EXCEPTION
        'Template follow-up default pada stase aktif tidak dapat dinonaktifkan sebelum template pengganti dipilih.';
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
      existing_was_default := existing.is_default;

      IF existing_was_default
        AND NOT p_is_default
        AND p_document_type = 'follow_up'
        AND target_rotation_status = 'Aktif' THEN
        RAISE EXCEPTION
          'Template follow-up default pada stase aktif tidak dapat dinonaktifkan sebelum template pengganti dipilih.';
      END IF;

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
  ELSIF existing_was_default THEN
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

COMMIT;
