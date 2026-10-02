BEGIN;

ALTER TABLE public.rotations
  ADD COLUMN IF NOT EXISTS default_report_template_id uuid,
  ADD COLUMN IF NOT EXISTS default_report_template_version integer;

ALTER TABLE public.rotations
  DROP CONSTRAINT IF EXISTS rotations_default_report_template_binding_check;
ALTER TABLE public.rotations
  ADD CONSTRAINT rotations_default_report_template_binding_check CHECK (
    (default_report_template_id IS NULL AND default_report_template_version IS NULL)
    OR (default_report_template_id IS NOT NULL AND default_report_template_version IS NOT NULL AND default_report_template_version > 0)
  );

CREATE OR REPLACE FUNCTION public.upsert_rotation_with_activation(
  p_rotation_id uuid, p_expected_updated_at timestamptz, p_name text,
  p_specialty text, p_institution text DEFAULT NULL,
  p_start_date date DEFAULT CURRENT_DATE, p_end_date date DEFAULT CURRENT_DATE,
  p_status text DEFAULT 'Mendatang', p_follow_up_template_id uuid DEFAULT NULL,
  p_follow_up_template_version integer DEFAULT NULL, p_report_template_id uuid DEFAULT NULL,
  p_report_template_version integer DEFAULT NULL, p_slaberan_template_id uuid DEFAULT NULL,
  p_default_report_template_id uuid DEFAULT NULL, p_default_report_template_version integer DEFAULT NULL
) RETURNS TABLE (
  id uuid, user_id uuid, name text, specialty text, institution text,
  start_date date, end_date date, status text, follow_up_template_id uuid,
  follow_up_template_version integer, report_template_id uuid, report_template_version integer,
  default_report_template_id uuid, default_report_template_version integer,
  slaberan_template_id uuid, created_at timestamptz, updated_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE uid uuid := auth.uid(); rid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.'; END IF;
  IF p_status NOT IN ('Aktif', 'Selesai', 'Mendatang') THEN RAISE EXCEPTION 'Status stase tidak valid.'; END IF;
  IF NULLIF(btrim(p_name), '') IS NULL OR p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN RAISE EXCEPTION 'Data stase tidak valid.'; END IF;
  IF p_default_report_template_id IS NOT NULL AND (p_default_report_template_version IS NULL OR p_default_report_template_version <= 0) THEN RAISE EXCEPTION 'Versi template report default tidak valid.'; END IF;
  IF p_rotation_id IS NULL THEN
    INSERT INTO public.rotations(user_id,name,specialty,institution,start_date,end_date,status,follow_up_template_id,follow_up_template_version,report_template_id,report_template_version,default_report_template_id,default_report_template_version,slaberan_template_id)
    VALUES(uid,btrim(p_name),p_specialty,p_institution,p_start_date,p_end_date,p_status,p_follow_up_template_id,p_follow_up_template_version,p_report_template_id,p_report_template_version,p_default_report_template_id,p_default_report_template_version,p_slaberan_template_id) RETURNING rotations.id INTO rid;
  ELSE
    UPDATE public.rotations SET name=btrim(p_name), specialty=p_specialty, institution=p_institution, start_date=p_start_date, end_date=p_end_date, status=p_status, follow_up_template_id=p_follow_up_template_id, follow_up_template_version=p_follow_up_template_version, report_template_id=p_report_template_id, report_template_version=p_report_template_version, default_report_template_id=p_default_report_template_id, default_report_template_version=p_default_report_template_version, slaberan_template_id=p_slaberan_template_id, updated_at=now() WHERE rotations.id=p_rotation_id AND rotations.user_id=uid AND (p_expected_updated_at IS NULL OR rotations.updated_at=p_expected_updated_at) RETURNING rotations.id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Stase tidak ditemukan atau sudah berubah.'; END IF;
  END IF;
  RETURN QUERY SELECT r.id,r.user_id,r.name,r.specialty,r.institution,r.start_date,r.end_date,r.status,r.follow_up_template_id,r.follow_up_template_version,r.report_template_id,r.report_template_version,r.default_report_template_id,r.default_report_template_version,r.slaberan_template_id,r.created_at,r.updated_at FROM public.rotations r WHERE r.id=rid;
END; $fn$;

COMMIT;
