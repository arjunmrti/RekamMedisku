-- P5 rotation atomicity
-- Keep rotation activation safe and enforce at most one active rotation per user.

DO $$
DECLARE
  duplicate_groups integer;
BEGIN
  SELECT count(*)
  INTO duplicate_groups
  FROM (
    SELECT user_id
    FROM public.rotations
    WHERE status = 'Aktif'
    GROUP BY user_id
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'P5 migration stopped: % user(s) currently have more than one Aktif rotation. Reconcile duplicate active rotations before applying the constraint.',
      duplicate_groups;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS rotations_one_active_per_user
  ON public.rotations (user_id)
  WHERE status = 'Aktif';

CREATE OR REPLACE FUNCTION public.activate_rotation(target_rotation_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  specialty text,
  start_date date,
  end_date date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rotations
    WHERE rotations.id = target_rotation_id
      AND rotations.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Stase yang dipilih tidak ditemukan.';
  END IF;

  -- Keep future/completed rotations as they are. Only an existing active
  -- rotation is demoted when switching the active context.
  UPDATE public.rotations
  SET
    status = 'Selesai',
    updated_at = now()
  WHERE rotations.user_id = current_user_id
    AND rotations.status = 'Aktif'
    AND rotations.id <> target_rotation_id;

  UPDATE public.rotations
  SET
    status = 'Aktif',
    updated_at = now()
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
    rotations.created_at,
    rotations.updated_at
  FROM public.rotations
  WHERE rotations.user_id = current_user_id
  ORDER BY rotations.start_date DESC, rotations.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_rotation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_rotation_with_activation(
  p_rotation_id uuid,
  p_expected_updated_at timestamptz,
  p_name text,
  p_specialty text,
  p_start_date date,
  p_end_date date,
  p_status text
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  specialty text,
  start_date date,
  end_date date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  remote_rotation_id uuid;
  existing_updated_at timestamptz;
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

    -- When activating, keep the target non-active until existing active rows
    -- have been demoted in this same transaction.
    UPDATE public.rotations
    SET
      name = btrim(p_name),
      specialty = p_specialty,
      start_date = p_start_date,
      end_date = p_end_date,
      status = CASE WHEN p_status = 'Aktif' THEN 'Selesai' ELSE p_status END,
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
      status
    )
    VALUES (
      current_user_id,
      btrim(p_name),
      p_specialty,
      p_start_date,
      p_end_date,
      CASE WHEN p_status = 'Aktif' THEN 'Selesai' ELSE p_status END
    )
    RETURNING rotations.id INTO remote_rotation_id;
  END IF;

  IF p_status = 'Aktif' THEN
    UPDATE public.rotations
    SET
      status = 'Selesai',
      updated_at = now()
    WHERE rotations.user_id = current_user_id
      AND rotations.status = 'Aktif'
      AND rotations.id <> remote_rotation_id;

    UPDATE public.rotations
    SET
      status = 'Aktif',
      updated_at = now()
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
    rotations.created_at,
    rotations.updated_at
  FROM public.rotations
  WHERE rotations.user_id = current_user_id
  ORDER BY rotations.start_date DESC, rotations.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_rotation_with_activation(
  uuid,
  timestamptz,
  text,
  text,
  date,
  date,
  text
) TO authenticated;
