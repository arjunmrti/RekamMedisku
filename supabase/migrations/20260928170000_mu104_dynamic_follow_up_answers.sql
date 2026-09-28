-- MU-104 — Persist definition-driven follow-up answers.
-- Answers are user-owned data keyed by stable field IDs from the pinned
-- follow-up template snapshot.

BEGIN;

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS answers jsonb;

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_answers_object_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_answers_object_check
  CHECK (
    answers IS NULL
    OR jsonb_typeof(answers) = 'object'
  );

COMMENT ON COLUMN public.follow_ups.answers IS
  'User-entered values keyed by stable field IDs from template_snapshot.';

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
AS $fn$
DECLARE
  current_user_id uuid := auth.uid();
  remote_follow_up_id uuid;
  remote_exam_id uuid;
  existing_follow_up record;
  exam_item jsonb;
  exam_map jsonb := '{}'::jsonb;
  resolved_template_id uuid;
  resolved_template_version integer;
  resolved_answers jsonb;
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

  IF p_follow_up ? 'answers'
    AND p_follow_up->'answers' IS NOT NULL
    AND jsonb_typeof(p_follow_up->'answers') <> 'object' THEN
    RAISE EXCEPTION 'Jawaban template follow-up harus berupa object JSON.';
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

    resolved_template_id := COALESCE(
      NULLIF(p_follow_up->>'template_id', '')::uuid,
      existing_follow_up.template_id
    );

    resolved_template_version := COALESCE(
      NULLIF(p_follow_up->>'template_version', '')::integer,
      existing_follow_up.template_version
    );

    resolved_answers := CASE
      WHEN p_follow_up ? 'answers'
        THEN p_follow_up->'answers'
      ELSE existing_follow_up.answers
    END;

    UPDATE public.follow_ups
    SET
      patient_id = NULLIF(p_follow_up->>'patient_id', '')::uuid,
      number = (p_follow_up->>'number')::integer,
      date = (p_follow_up->>'date')::date,
      iso_date = (p_follow_up->>'iso_date')::date,
      time = (p_follow_up->>'time')::time,
      status = p_follow_up->>'status',
      template_type = NULLIF(p_follow_up->>'template_type', ''),
      template_id = resolved_template_id,
      template_version = resolved_template_version,
      answers = resolved_answers,
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
    resolved_template_id := NULLIF(p_follow_up->>'template_id', '')::uuid;
    resolved_template_version := NULLIF(p_follow_up->>'template_version', '')::integer;
    resolved_answers := CASE
      WHEN p_follow_up ? 'answers'
        THEN p_follow_up->'answers'
      ELSE NULL
    END;

    INSERT INTO public.follow_ups (
      user_id,
      patient_id,
      number,
      date,
      iso_date,
      time,
      status,
      template_type,
      template_id,
      template_version,
      answers,
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
      resolved_template_id,
      resolved_template_version,
      resolved_answers,
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
$fn$;

GRANT EXECUTE ON FUNCTION public.save_follow_up_with_exams(
  uuid,
  timestamptz,
  jsonb,
  jsonb
) TO authenticated;

COMMIT;
