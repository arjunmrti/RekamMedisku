-- Add optional institution context to each rotation.
ALTER TABLE public.rotations ADD COLUMN IF NOT EXISTS institution text;

DROP FUNCTION IF EXISTS public.upsert_rotation_with_activation(
  uuid, timestamptz, text, text, text, date, date, text, uuid, integer, uuid, integer
);

CREATE OR REPLACE FUNCTION public.upsert_rotation_with_activation(
  p_rotation_id uuid,
  p_expected_updated_at timestamptz,
  p_name text,
  p_specialty text,
  p_institution text DEFAULT NULL,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE,
  p_status text DEFAULT 'Mendatang',
  p_follow_up_template_id uuid DEFAULT NULL,
  p_follow_up_template_version integer DEFAULT NULL,
  p_report_template_id uuid DEFAULT NULL,
  p_report_template_version integer DEFAULT NULL,
  p_slaberan_template_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  specialty text,
   institution text,
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
       institution = NULLIF(btrim(p_institution), ''),
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
     rotations.institution,
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
  uuid, timestamptz, text, text, text, date, date, text, uuid, integer, uuid, integer, uuid
) TO authenticated;

COMMIT;


