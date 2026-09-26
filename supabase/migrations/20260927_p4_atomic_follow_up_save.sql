-- P4 sync safety
-- Make follow-up + supporting-exam persistence atomic so a partial exam write
-- can never leave the cloud follow-up half-updated.

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
  remote_exam_id uuid;
  existing_follow_up record;
  exam_item jsonb;
  exam_map jsonb := '{}'::jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF jsonb_typeof(p_follow_up) <> 'object' THEN
    RAISE EXCEPTION 'Struktur follow-up yang disimpan tidak valid.';
  END IF;

  IF jsonb_typeof(p_supporting_exams) <> 'array' THEN
    RAISE EXCEPTION 'Struktur pemeriksaan penunjang yang disimpan tidak valid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.patients
    WHERE id = NULLIF(p_follow_up->>'patient_id', '')::uuid
      AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Pasien yang dipilih tidak ditemukan.';
  END IF;

  IF p_follow_up_id IS NOT NULL THEN
    SELECT *
    INTO existing_follow_up
    FROM public.follow_ups
    WHERE id = p_follow_up_id
      AND user_id = current_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Follow-up yang dipilih tidak ditemukan.';
    END IF;

    IF p_expected_updated_at IS NULL
      OR existing_follow_up.updated_at <> p_expected_updated_at THEN
      RAISE EXCEPTION
        'Data follow-up sudah berubah di browser lain. Muat ulang data terbaru sebelum menyimpan perubahan.';
    END IF;

    UPDATE public.follow_ups
    SET
      patient_id = NULLIF(p_follow_up->>'patient_id', '')::uuid,
      number = (p_follow_up->>'number')::integer,
      date = (p_follow_up->>'date')::date,
      iso_date = (p_follow_up->>'iso_date')::date,
      time = (p_follow_up->>'time')::time,
      status = p_follow_up->>'status',
      template_type = NULLIF(p_follow_up->>'template_type', ''),
      assessment_codes = ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_follow_up->'assessment_codes', '[]'::jsonb)
        )
      ),
      planning = p_follow_up->>'planning',
      instruction = p_follow_up->>'instruction',
      subjective = COALESCE(p_follow_up->>'subjective', ''),
      objective = COALESCE(p_follow_up->>'objective', ''),
      assessment = COALESCE(p_follow_up->>'assessment', ''),
      plan = COALESCE(p_follow_up->>'plan', ''),
      summary = COALESCE(p_follow_up->>'summary', ''),
      updated_at = now()
    WHERE id = p_follow_up_id
      AND user_id = current_user_id
    RETURNING id INTO remote_follow_up_id;
  ELSE
    INSERT INTO public.follow_ups (
      user_id,
      patient_id,
      number,
      date,
      iso_date,
      time,
      status,
      template_type,
      assessment_codes,
      planning,
      instruction,
      subjective,
      objective,
      assessment,
      plan,
      summary
    )
    VALUES (
      current_user_id,
      NULLIF(p_follow_up->>'patient_id', '')::uuid,
      (p_follow_up->>'number')::integer,
      (p_follow_up->>'date')::date,
      (p_follow_up->>'iso_date')::date,
      (p_follow_up->>'time')::time,
      p_follow_up->>'status',
      NULLIF(p_follow_up->>'template_type', ''),
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(p_follow_up->'assessment_codes', '[]'::jsonb)
        )
      ),
      p_follow_up->>'planning',
      p_follow_up->>'instruction',
      COALESCE(p_follow_up->>'subjective', ''),
      COALESCE(p_follow_up->>'objective', ''),
      COALESCE(p_follow_up->>'assessment', ''),
      COALESCE(p_follow_up->>'plan', ''),
      COALESCE(p_follow_up->>'summary', '')
    )
    RETURNING id INTO remote_follow_up_id;
  END IF;

  -- Replace the complete supporting-exam set inside the same transaction.
  -- This makes update/insert/delete of exams all-or-nothing with the follow-up.
  DELETE FROM public.supporting_exams
  WHERE follow_up_id = remote_follow_up_id
    AND user_id = current_user_id;

  FOR exam_item IN
    SELECT value
    FROM jsonb_array_elements(p_supporting_exams)
  LOOP
    IF NULLIF(exam_item->>'id', '') IS NULL THEN
      RAISE EXCEPTION 'Pemeriksaan penunjang tidak memiliki ID lokal.';
    END IF;

    INSERT INTO public.supporting_exams (
      user_id,
      follow_up_id,
      name,
      exam_type,
      exam_date,
      result,
      attachment_name,
      attachment_id,
      attachment_type,
      attachment_size,
      attachment_count,
      icon
    )
    VALUES (
      current_user_id,
      remote_follow_up_id,
      exam_item->>'name',
      NULLIF(exam_item->>'exam_type', ''),
      (exam_item->>'exam_date')::date,
      NULLIF(exam_item->>'result', ''),
      NULLIF(exam_item->>'attachment_name', ''),
      NULLIF(exam_item->>'attachment_id', ''),
      NULLIF(exam_item->>'attachment_type', ''),
      NULLIF(exam_item->>'attachment_size', '')::integer,
      NULLIF(exam_item->>'attachment_count', '')::integer,
      COALESCE(NULLIF(exam_item->>'icon', ''), 'lab')
    )
    RETURNING id INTO remote_exam_id;

    exam_map := jsonb_set(
      exam_map,
      ARRAY[exam_item->>'id'],
      to_jsonb(remote_exam_id::text),
      true
    );
  END LOOP;

  RETURN jsonb_build_object(
    'followUpId',
    remote_follow_up_id::text,
    'supportingExamIds',
    exam_map
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_follow_up_with_exams(
  uuid,
  timestamptz,
  jsonb,
  jsonb
) TO authenticated;
