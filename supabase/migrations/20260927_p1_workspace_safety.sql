-- P1 workspace safety
-- QA-12: make active-rotation switching atomic.
-- P1 restore: restore the synced workspace in one database transaction.

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

  UPDATE public.rotations
  SET
    status = CASE
      WHEN rotations.id = target_rotation_id THEN 'Aktif'
      ELSE 'Selesai'
    END,
    updated_at = now()
  WHERE rotations.user_id = current_user_id;

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

CREATE OR REPLACE FUNCTION public.restore_workspace_backup(p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  rotation_item jsonb;
  patient_item jsonb;
  follow_up_pair record;
  follow_up_item jsonb;
  exam_item jsonb;
  remote_rotation_id uuid;
  remote_patient_id uuid;
  remote_follow_up_id uuid;
  active_remote_rotation_id uuid;
  rotation_map jsonb;
  patient_map jsonb;
  follow_up_map jsonb;
  exam_map jsonb;
  rotation_count integer := 0;
  patient_count integer := 0;
  follow_up_count integer := 0;
  exam_count integer := 0;
  follow_up_time text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.';
  END IF;

  IF jsonb_typeof(p_backup->'rotations') <> 'array' THEN
    RAISE EXCEPTION 'Backup yang dipulihkan harus membawa data stase.';
  END IF;

  IF jsonb_typeof(p_backup->'patients') <> 'array' THEN
    RAISE EXCEPTION 'Struktur pasien pada backup tidak valid.';
  END IF;

  IF jsonb_typeof(p_backup->'followUpsByPatient') <> 'object' THEN
    RAISE EXCEPTION 'Struktur follow-up pada backup tidak valid.';
  END IF;

  CREATE TEMP TABLE restore_rotation_map (
    local_id text PRIMARY KEY,
    remote_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE restore_patient_map (
    local_id text PRIMARY KEY,
    remote_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE restore_follow_up_map (
    local_id text PRIMARY KEY,
    remote_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE restore_exam_map (
    local_id text PRIMARY KEY,
    remote_id uuid NOT NULL
  ) ON COMMIT DROP;

  -- The JSON backup is an authoritative workspace snapshot. Replace all
  -- synced rows for this user inside the same transaction.
  DELETE FROM public.supporting_exams
  WHERE user_id = current_user_id;

  DELETE FROM public.follow_ups
  WHERE user_id = current_user_id;

  DELETE FROM public.patients
  WHERE user_id = current_user_id;

  DELETE FROM public.rotations
  WHERE user_id = current_user_id;

  FOR rotation_item IN
    SELECT value
    FROM jsonb_array_elements(p_backup->'rotations')
  LOOP
    INSERT INTO public.rotations (
      user_id,
      name,
      specialty,
      start_date,
      end_date,
      status,
      created_at,
      updated_at
    )
    VALUES (
      current_user_id,
      rotation_item->>'name',
      rotation_item->>'specialty',
      (rotation_item->>'startDate')::date,
      (rotation_item->>'endDate')::date,
      rotation_item->>'status',
      COALESCE(NULLIF(rotation_item->>'createdAt', '')::timestamptz, now()),
      COALESCE(NULLIF(rotation_item->>'updatedAt', '')::timestamptz, now())
    )
    RETURNING id INTO remote_rotation_id;

    INSERT INTO restore_rotation_map(local_id, remote_id)
    VALUES (rotation_item->>'id', remote_rotation_id);

    rotation_count := rotation_count + 1;
  END LOOP;

  FOR patient_item IN
    SELECT value
    FROM jsonb_array_elements(p_backup->'patients')
  LOOP
    SELECT remote_id
    INTO remote_rotation_id
    FROM restore_rotation_map
    WHERE local_id = patient_item->>'rotationId';

    IF remote_rotation_id IS NULL THEN
      RAISE EXCEPTION
        'Pasien % merujuk ke stase yang tidak ada di backup.',
        patient_item->>'name';
    END IF;

    INSERT INTO public.patients (
      user_id,
      rotation_id,
      name,
      age,
      gender,
      rm,
      room,
      bed,
      doctor,
      created_at,
      admission_date,
      status
    )
    VALUES (
      current_user_id,
      remote_rotation_id,
      patient_item->>'name',
      (patient_item->>'age')::integer,
      patient_item->>'gender',
      patient_item->>'rm',
      patient_item->>'room',
      patient_item->>'bed',
      patient_item->>'doctor',
      COALESCE(NULLIF(patient_item->>'createdAt', '')::timestamptz, now()),
      NULLIF(patient_item->>'admissionDate', '')::date,
      patient_item->>'status'
    )
    RETURNING id INTO remote_patient_id;

    INSERT INTO restore_patient_map(local_id, remote_id)
    VALUES (patient_item->>'id', remote_patient_id);

    patient_count := patient_count + 1;
  END LOOP;

  FOR follow_up_pair IN
    SELECT *
    FROM jsonb_each(COALESCE(p_backup->'followUpsByPatient', '{}'::jsonb))
  LOOP
    SELECT remote_id
    INTO remote_patient_id
    FROM restore_patient_map
    WHERE local_id = follow_up_pair.key;

    IF remote_patient_id IS NULL THEN
      RAISE EXCEPTION
        'Follow-up merujuk ke pasien % yang tidak ada di backup.',
        follow_up_pair.key;
    END IF;

    FOR follow_up_item IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(follow_up_pair.value, '[]'::jsonb))
    LOOP
      follow_up_time := replace(follow_up_item->>'time', '.', ':');
      IF length(follow_up_time) = 5 THEN
        follow_up_time := follow_up_time || ':00';
      END IF;

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
        remote_patient_id,
        (follow_up_item->>'number')::integer,
        (follow_up_item->>'isoDate')::date,
        (follow_up_item->>'isoDate')::date,
        follow_up_time::time,
        follow_up_item->>'status',
        NULLIF(follow_up_item->>'templateType', ''),
        ARRAY(
          SELECT jsonb_array_elements_text(
            COALESCE(follow_up_item->'assessmentCodes', '[]'::jsonb)
          )
        )::text[],
        NULLIF(follow_up_item->>'planning', ''),
        NULLIF(follow_up_item->>'instruction', ''),
        follow_up_item->>'subjective',
        follow_up_item->>'objective',
        follow_up_item->>'assessment',
        follow_up_item->>'plan',
        follow_up_item->>'summary'
      )
      RETURNING id INTO remote_follow_up_id;

      INSERT INTO restore_follow_up_map(local_id, remote_id)
      VALUES (follow_up_item->>'id', remote_follow_up_id);

      follow_up_count := follow_up_count + 1;

      FOR exam_item IN
        SELECT value
        FROM jsonb_array_elements(
          COALESCE(follow_up_item->'supportingExams', '[]'::jsonb)
        )
      LOOP
        IF NULLIF(exam_item->>'isoDate', '') IS NULL THEN
          RAISE EXCEPTION
            'Pemeriksaan pendukung % tidak memiliki tanggal ISO.',
            exam_item->>'name';
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
          NULLIF(exam_item->>'examType', ''),
          (exam_item->>'isoDate')::date,
          NULLIF(exam_item->>'result', ''),
          NULLIF(exam_item->>'attachmentName', ''),
          NULLIF(exam_item->>'attachmentId', ''),
          NULLIF(exam_item->>'attachmentType', ''),
          NULLIF(exam_item->>'attachmentSize', '')::integer,
          NULLIF(exam_item->>'attachmentCount', '')::integer,
          exam_item->>'icon'
        )
        RETURNING id INTO remote_rotation_id;

        INSERT INTO restore_exam_map(local_id, remote_id)
        VALUES (exam_item->>'id', remote_rotation_id);

        exam_count := exam_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  IF NULLIF(p_backup->>'activeRotationId', '') IS NOT NULL THEN
    SELECT remote_id
    INTO active_remote_rotation_id
    FROM restore_rotation_map
    WHERE local_id = p_backup->>'activeRotationId';

    IF active_remote_rotation_id IS NULL THEN
      RAISE EXCEPTION 'Stase aktif pada backup tidak ditemukan.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.rotations
      WHERE id = active_remote_rotation_id
        AND user_id = current_user_id
        AND status = 'Aktif'
    ) THEN
      RAISE EXCEPTION 'Stase aktif pada backup harus berstatus Aktif.';
    END IF;
  END IF;

  SELECT COALESCE(jsonb_object_agg(local_id, remote_id::text), '{}'::jsonb)
  INTO rotation_map
  FROM restore_rotation_map;

  SELECT COALESCE(jsonb_object_agg(local_id, remote_id::text), '{}'::jsonb)
  INTO patient_map
  FROM restore_patient_map;

  SELECT COALESCE(jsonb_object_agg(local_id, remote_id::text), '{}'::jsonb)
  INTO follow_up_map
  FROM restore_follow_up_map;

  SELECT COALESCE(jsonb_object_agg(local_id, remote_id::text), '{}'::jsonb)
  INTO exam_map
  FROM restore_exam_map;

  RETURN jsonb_build_object(
    'rotationIds', rotation_map,
    'patientIds', patient_map,
    'followUpIds', follow_up_map,
    'supportingExamIds', exam_map,
    'activeRotationId',
      CASE
        WHEN active_remote_rotation_id IS NULL THEN NULL
        ELSE active_remote_rotation_id::text
      END,
    'rotationCount', rotation_count,
    'patientCount', patient_count,
    'followUpCount', follow_up_count,
    'supportingExamCount', exam_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_workspace_backup(jsonb) TO authenticated;
