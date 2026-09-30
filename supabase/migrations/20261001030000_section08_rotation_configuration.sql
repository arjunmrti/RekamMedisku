-- Section 08 — rotation configuration binding hardening.
-- Adds explicit Slaberan template binding and a database invariant of one
-- active rotation per user. Keeps existing Follow-Up/Report bindings intact.

BEGIN;

ALTER TABLE public.rotations
  ADD COLUMN IF NOT EXISTS slaberan_template_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.slaberan_templates'::regclass
      AND conname = 'slaberan_templates_id_user_key'
  ) THEN
    ALTER TABLE public.slaberan_templates
      ADD CONSTRAINT slaberan_templates_id_user_key UNIQUE (id, user_id);
  END IF;
END;
$$;

ALTER TABLE public.rotations
  DROP CONSTRAINT IF EXISTS rotations_slaberan_template_user_fkey;

ALTER TABLE public.rotations
  ADD CONSTRAINT rotations_slaberan_template_user_fkey
  FOREIGN KEY (slaberan_template_id, user_id)
  REFERENCES public.slaberan_templates(id, user_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS rotations_user_slaberan_template_idx
  ON public.rotations(user_id, slaberan_template_id);

CREATE UNIQUE INDEX IF NOT EXISTS rotations_one_active_per_user_idx
  ON public.rotations(user_id)
  WHERE status = 'Aktif';

COMMENT ON COLUMN public.rotations.slaberan_template_id IS
  'User-owned Slaberan template selected as the reporting format for this rotation.';

DROP FUNCTION IF EXISTS public.validate_rotation_template_bindings(
  uuid, uuid, integer, uuid, integer, boolean
);

CREATE OR REPLACE FUNCTION public.validate_rotation_template_bindings(
  p_user_id uuid,
  p_follow_up_template_id uuid,
  p_follow_up_template_version integer,
  p_report_template_id uuid,
  p_report_template_version integer,
  p_require_follow_up boolean,
  p_slaberan_template_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  IF p_follow_up_template_id IS NULL
    AND p_follow_up_template_version IS NULL
    AND NOT p_require_follow_up THEN
    NULL;
  ELSIF p_follow_up_template_id IS NULL
    OR p_follow_up_template_version IS NULL THEN
    RAISE EXCEPTION 'Template follow-up stase harus diisi lengkap.';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.templates t
      JOIN public.template_versions tv
        ON tv.template_id = t.id
       AND tv.user_id = t.user_id
       AND tv.version = p_follow_up_template_version
      WHERE t.id = p_follow_up_template_id
        AND t.user_id = p_user_id
        AND t.type = 'follow_up'
        AND NOT t.is_archived
    ) THEN
      RAISE EXCEPTION 'Template follow-up yang dipilih tidak tersedia pada workspace pengguna.';
    END IF;
  END IF;

  IF p_report_template_id IS NULL
    AND p_report_template_version IS NULL THEN
    NULL;
  ELSIF p_report_template_id IS NULL
    OR p_report_template_version IS NULL THEN
    RAISE EXCEPTION 'Template laporan stase harus diisi lengkap.';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.templates t
      JOIN public.template_versions tv
        ON tv.template_id = t.id
       AND tv.user_id = t.user_id
       AND tv.version = p_report_template_version
      WHERE t.id = p_report_template_id
        AND t.user_id = p_user_id
        AND t.type = 'report'
        AND NOT t.is_archived
    ) THEN
      RAISE EXCEPTION 'Template laporan yang dipilih tidak tersedia pada workspace pengguna.';
    END IF;
  END IF;

  IF p_slaberan_template_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.slaberan_templates st
      WHERE st.id = p_slaberan_template_id
        AND st.user_id = p_user_id
    ) THEN
    RAISE EXCEPTION 'Template Slaberan yang dipilih tidak tersedia pada workspace pengguna.';
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_rotation_template_bindings(
  uuid, uuid, integer, uuid, integer, boolean, uuid
) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.validate_rotation_template_bindings(
  uuid, uuid, integer, uuid, integer, boolean
);

CREATE OR REPLACE FUNCTION public.validate_rotation_template_bindings(
  p_user_id uuid,
  p_follow_up_template_id uuid,
  p_follow_up_template_version integer,
  p_report_template_id uuid,
  p_report_template_version integer,
  p_require_follow_up boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  PERFORM public.validate_rotation_template_bindings(
    p_user_id,
    p_follow_up_template_id,
    p_follow_up_template_version,
    p_report_template_id,
    p_report_template_version,
    p_require_follow_up,
    NULL
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_rotation_template_bindings(
  uuid, uuid, integer, uuid, integer, boolean
) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.activate_rotation(uuid);

CREATE OR REPLACE FUNCTION public.activate_rotation(target_rotation_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  specialty text,
  start_date date,
  end_date date,
  status text,
  follow_up_template_id uuid,
  follow_up_template_version integer,
  report_template_id uuid,
  report_template_version integer,
  slaberan_template_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  target record;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  SELECT *
  INTO target
  FROM public.rotations
  WHERE rotations.id = target_rotation_id
    AND rotations.user_id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stase yang dipilih tidak ditemukan.';
  END IF;

  PERFORM public.validate_rotation_template_bindings(
    current_user_id,
    target.follow_up_template_id,
    target.follow_up_template_version,
    target.report_template_id,
    target.report_template_version,
    true,
    target.slaberan_template_id
  );

  UPDATE public.rotations
  SET status = 'Selesai', updated_at = now()
  WHERE rotations.user_id = current_user_id
    AND rotations.status = 'Aktif'
    AND rotations.id <> target_rotation_id;

  UPDATE public.rotations
  SET status = 'Aktif', updated_at = now()
  WHERE rotations.id = target_rotation_id
    AND rotations.user_id = current_user_id;

  RETURN QUERY
  SELECT
    rotations.id,
    rotations.user_id,
    rotations.name,
    rotations.specialty,
    rotations.start_date,
    rotations.end_date,
    rotations.status,
    rotations.follow_up_template_id,
    rotations.follow_up_template_version,
    rotations.report_template_id,
    rotations.report_template_version,
    rotations.slaberan_template_id,
    rotations.created_at,
    rotations.updated_at
  FROM public.rotations
  WHERE rotations.user_id = current_user_id
  ORDER BY rotations.start_date DESC, rotations.created_at ASC;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.activate_rotation(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.upsert_rotation_with_activation(
  uuid, timestamptz, text, text, date, date, text, uuid, integer, uuid, integer
);

CREATE OR REPLACE FUNCTION public.upsert_rotation_with_activation(
  p_rotation_id uuid,
  p_expected_updated_at timestamptz,
  p_name text,
  p_specialty text,
  p_start_date date,
  p_end_date date,
  p_status text,
  p_follow_up_template_id uuid,
  p_follow_up_template_version integer,
  p_report_template_id uuid DEFAULT NULL,
  p_report_template_version integer DEFAULT NULL,
  p_slaberan_template_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  specialty text,
  start_date date,
  end_date date,
  status text,
  follow_up_template_id uuid,
  follow_up_template_version integer,
  report_template_id uuid,
  report_template_version integer,
  slaberan_template_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  remote_rotation_id uuid;
  existing_updated_at timestamptz;
  require_follow_up boolean := p_status = 'Aktif';
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF p_status NOT IN ('Aktif', 'Selesai', 'Mendatang') THEN
    RAISE EXCEPTION 'Status stase tidak valid.';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama stase wajib diisi.';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Periode stase tidak valid.';
  END IF;

  PERFORM public.validate_rotation_template_bindings(
    current_user_id,
    p_follow_up_template_id,
    p_follow_up_template_version,
    p_report_template_id,
    p_report_template_version,
    require_follow_up,
    p_slaberan_template_id
  );

  IF p_rotation_id IS NOT NULL THEN
    SELECT rotations.updated_at
    INTO existing_updated_at
    FROM public.rotations
    WHERE rotations.id = p_rotation_id
      AND rotations.user_id = current_user_id
    FOR UPDATE;

    IF existing_updated_at IS NULL THEN
      RAISE EXCEPTION 'Stase yang dipilih tidak ditemukan.';
    END IF;

    IF p_expected_updated_at IS NULL
      OR existing_updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION
        'Data stase sudah berubah di browser lain. Muat ulang stase terbaru sebelum menyimpan perubahan.';
    END IF;

    remote_rotation_id := p_rotation_id;

    UPDATE public.rotations
    SET
      name = btrim(p_name),
      specialty = p_specialty,
      start_date = p_start_date,
      end_date = p_end_date,
      status = CASE WHEN p_status = 'Aktif' THEN 'Selesai' ELSE p_status END,
      follow_up_template_id = p_follow_up_template_id,
      follow_up_template_version = p_follow_up_template_version,
      report_template_id = p_report_template_id,
      report_template_version = p_report_template_version,
      slaberan_template_id = p_slaberan_template_id,
      updated_at = now()
    WHERE rotations.id = remote_rotation_id
      AND rotations.user_id = current_user_id;
  ELSE
    INSERT INTO public.rotations (
      user_id,
      name,
      specialty,
      start_date,
      end_date,
      status,
      follow_up_template_id,
      follow_up_template_version,
      report_template_id,
      report_template_version,
      slaberan_template_id
    )
    VALUES (
      current_user_id,
      btrim(p_name),
      p_specialty,
      p_start_date,
      p_end_date,
      CASE WHEN p_status = 'Aktif' THEN 'Selesai' ELSE p_status END,
      p_follow_up_template_id,
      p_follow_up_template_version,
      p_report_template_id,
      p_report_template_version,
      p_slaberan_template_id
    )
    RETURNING rotations.id INTO remote_rotation_id;
  END IF;

  IF p_status = 'Aktif' THEN
    UPDATE public.rotations
    SET status = 'Selesai', updated_at = now()
    WHERE rotations.user_id = current_user_id
      AND rotations.status = 'Aktif'
      AND rotations.id <> remote_rotation_id;

    UPDATE public.rotations
    SET status = 'Aktif', updated_at = now()
    WHERE rotations.id = remote_rotation_id
      AND rotations.user_id = current_user_id;
  END IF;

  RETURN QUERY
  SELECT
    rotations.id,
    rotations.user_id,
    rotations.name,
    rotations.specialty,
    rotations.start_date,
    rotations.end_date,
    rotations.status,
    rotations.follow_up_template_id,
    rotations.follow_up_template_version,
    rotations.report_template_id,
    rotations.report_template_version,
    rotations.slaberan_template_id,
    rotations.created_at,
    rotations.updated_at
  FROM public.rotations
  WHERE rotations.user_id = current_user_id
  ORDER BY rotations.start_date DESC, rotations.created_at ASC;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.upsert_rotation_with_activation(
  uuid, timestamptz, text, text, date, date, text, uuid, integer, uuid, integer, uuid
) TO authenticated;

COMMIT;
