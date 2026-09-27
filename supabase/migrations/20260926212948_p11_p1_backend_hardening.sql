-- P11 — P1 backend hardening
-- Atomic follow-up persistence, atomic Slaberan location reorder,
-- and RPC execution hardening.

CREATE OR REPLACE FUNCTION public.save_follow_up_with_exams(
  p_follow_up_id uuid,
  p_expected_updated_at timestamptz,
  p_follow_up jsonb,
  p_supporting_exams jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  remote_follow_up_id uuid;
  existing_updated_at timestamptz;
  remote_patient_id uuid;
  exam_item jsonb;
  remote_exam_id uuid;
  supporting_exam_ids jsonb := '{}'::jsonb;
  incoming_status text;
  incoming_number integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF jsonb_typeof(p_follow_up) <> 'object' THEN
    RAISE EXCEPTION 'Data follow-up tidak valid.';
  END IF;

  IF jsonb_typeof(p_supporting_exams) <> 'array' THEN
    RAISE EXCEPTION 'Daftar pemeriksaan pendukung tidak valid.';
  END IF;

  IF NULLIF(p_follow_up->>'patient_id', '') IS NULL THEN
    RAISE EXCEPTION 'Pasien follow-up wajib ditentukan.';
  END IF;

  remote_patient_id := (p_follow_up->>'patient_id')::uuid;

  IF NOT EXISTS (
    SELECT 1
    FROM public.patients
    WHERE id = remote_patient_id
      AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Pasien tidak ditemukan dalam workspace pengguna.';
  END IF;

  incoming_number := (p_follow_up->>'number')::integer;
  IF incoming_number IS NULL OR incoming_number <= 0 THEN
    RAISE EXCEPTION 'Nomor follow-up tidak valid.';
  END IF;

  incoming_status := p_follow_up->>'status';
  IF incoming_status NOT IN ('Tersimpan', 'Draf') THEN
    RAISE EXCEPTION 'Status follow-up tidak valid.';
  END IF;

  IF p_follow_up_id IS NOT NULL THEN
    SELECT follow_ups.updated_at
      INTO existing_updated_at
    FROM public.follow_ups
    WHERE follow_ups.id = p_follow_up_id
      AND follow_ups.user_id = current_user_id
    FOR UPDATE;

    IF existing_updated_at IS NULL THEN
      RAISE EXCEPTION 'Follow-up yang dipilih tidak ditemukan.';
    END IF;

    IF p_expected_updated_at IS NULL
      OR existing_updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION
        'Data follow-up sudah berubah di browser lain. Muat ulang data terbaru sebelum menyimpan.';
    END IF;

    remote_follow_up_id := p_follow_up_id;

    UPDATE public.follow_ups
    SET
      patient_id = remote_patient_id,
      number = incoming_number,
      date = (p_follow_up->>'date')::date,
      iso_date = (p_follow_up->>'iso_date')::date,
      time = (p_follow_up->>'time')::time,
      status = incoming_status,
      template_type = NULLIF(p_follow_up->>'template_type', ''),
      assessment_codes = ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_follow_up->'assessment_codes', '[]'::jsonb)
        )
      )::text[],
      planning = NULLIF(p_follow_up->>'planning', ''),
      instruction = NULLIF(p_follow_up->>'instruction', ''),
      subjective = COALESCE(p_follow_up->>'subjective', ''),
      objective = COALESCE(p_follow_up->>'objective', ''),
      assessment = COALESCE(p_follow_up->>'assessment', ''),
      plan = COALESCE(p_follow_up->>'plan', ''),
      summary = COALESCE(p_follow_up->>'summary', ''),
      updated_at = now()
    WHERE follow_ups.id = remote_follow_up_id
      AND follow_ups.user_id = current_user_id;
  ELSE
    INSERT INTO public.follow_ups (
      user_id, patient_id, number, date, iso_date, time, status,
      template_type, assessment_codes, planning, instruction,
      subjective, objective, assessment, plan, summary
    )
    VALUES (
      current_user_id,
      remote_patient_id,
      incoming_number,
      (p_follow_up->>'date')::date,
      (p_follow_up->>'iso_date')::date,
      (p_follow_up->>'time')::time,
      incoming_status,
      NULLIF(p_follow_up->>'template_type', ''),
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_follow_up->'assessment_codes', '[]'::jsonb)
        )
      )::text[],
      NULLIF(p_follow_up->>'planning', ''),
      NULLIF(p_follow_up->>'instruction', ''),
      COALESCE(p_follow_up->>'subjective', ''),
      COALESCE(p_follow_up->>'objective', ''),
      COALESCE(p_follow_up->>'assessment', ''),
      COALESCE(p_follow_up->>'plan', ''),
      COALESCE(p_follow_up->>'summary', '')
    )
    RETURNING id INTO remote_follow_up_id;
  END IF;

  DELETE FROM public.supporting_exams
  WHERE follow_up_id = remote_follow_up_id
    AND user_id = current_user_id;

  FOR exam_item IN
    SELECT value
    FROM jsonb_array_elements(p_supporting_exams)
  LOOP
    IF NULLIF(exam_item->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'ID pemeriksaan pendukung wajib diisi.';
    END IF;

    remote_exam_id := gen_random_uuid();

    INSERT INTO public.supporting_exams (
      id, user_id, follow_up_id, name, exam_type, exam_date, result,
      attachment_name, attachment_id, attachment_type,
      attachment_size, attachment_count, icon
    )
    VALUES (
      remote_exam_id,
      current_user_id,
      remote_follow_up_id,
      COALESCE(exam_item->>'name', ''),
      NULLIF(exam_item->>'exam_type', ''),
      (exam_item->>'exam_date')::date,
      NULLIF(exam_item->>'result', ''),
      NULLIF(exam_item->>'attachment_name', ''),
      NULLIF(exam_item->>'attachment_id', ''),
      NULLIF(exam_item->>'attachment_type', ''),
      NULLIF(exam_item->>'attachment_size', '')::bigint,
      NULLIF(exam_item->>'attachment_count', '')::integer,
      COALESCE(exam_item->>'icon', 'lab')
    );

    supporting_exam_ids :=
      supporting_exam_ids ||
      jsonb_build_object(exam_item->>'id', remote_exam_id::text);
  END LOOP;

  RETURN jsonb_build_object(
    'followUpId', remote_follow_up_id::text,
    'supportingExamIds', supporting_exam_ids
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.swap_slaberan_locations(
  p_location_id uuid,
  p_target_location_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_parent_id uuid;
  target_parent_id uuid;
  current_type text;
  target_type text;
  current_sort integer;
  target_sort integer;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF p_location_id = p_target_location_id THEN
    RETURN;
  END IF;

  PERFORM 1
  FROM public.slaberan_locations
  WHERE id IN (p_location_id, p_target_location_id)
    AND user_id = current_user_id
  ORDER BY id
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.slaberan_locations
    WHERE id IN (p_location_id, p_target_location_id)
      AND user_id = current_user_id
  ) <> 2 THEN
    RAISE EXCEPTION 'Lokasi yang dipindahkan tidak ditemukan dalam workspace pengguna.';
  END IF;

  SELECT parent_id, type, sort_order
    INTO current_parent_id, current_type, current_sort
  FROM public.slaberan_locations
  WHERE id = p_location_id;

  SELECT parent_id, type, sort_order
    INTO target_parent_id, target_type, target_sort
  FROM public.slaberan_locations
  WHERE id = p_target_location_id;

  IF current_type <> target_type
    OR COALESCE(current_parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> COALESCE(target_parent_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'Lokasi hanya dapat ditukar dengan saudara dalam hierarki yang sama.';
  END IF;

  UPDATE public.slaberan_locations
  SET sort_order = target_sort, updated_at = now()
  WHERE id = p_location_id
    AND user_id = current_user_id;

  UPDATE public.slaberan_locations
  SET sort_order = current_sort, updated_at = now()
  WHERE id = p_target_location_id
    AND user_id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_follow_up_with_exams(
  uuid,timestamptz,jsonb,jsonb
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.swap_slaberan_locations(uuid,uuid)
  TO authenticated;

ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_patient_with_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_patient_with_history(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_workspace_backup_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_workspace_backup_v2(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.activate_rotation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_rotation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_rotation_with_activation(
  uuid,timestamptz,text,text,date,date,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_rotation_with_activation(
  uuid,timestamptz,text,text,date,date,text
) TO authenticated;

REVOKE ALL ON FUNCTION public.save_follow_up_with_exams(
  uuid,timestamptz,jsonb,jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_follow_up_with_exams(
  uuid,timestamptz,jsonb,jsonb
) TO authenticated;

REVOKE ALL ON FUNCTION public.swap_slaberan_locations(uuid,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swap_slaberan_locations(uuid,uuid)
  TO authenticated;
