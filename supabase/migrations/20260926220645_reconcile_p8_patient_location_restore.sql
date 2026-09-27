-- Package 8 — Patient location model
-- Cloud restore RPC updated to persist current/admission patient location.
-- The RPC keeps backward compatibility with backups that only have legacy
-- room/bed fields.

CREATE OR REPLACE FUNCTION public.restore_workspace_backup_v2(p_backup jsonb)
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
  location_item jsonb;
  template_item jsonb;
  remote_rotation_id uuid;
  remote_patient_id uuid;
  remote_follow_up_id uuid;
  remote_location_id uuid;
  remote_template_id uuid;
  current_remote_location_id uuid;
  admission_remote_location_id uuid;
  active_remote_rotation_id uuid;
  default_remote_template_id uuid;
  default_template_local_id text;
  rotation_map jsonb;
  patient_map jsonb;
  follow_up_map jsonb;
  exam_map jsonb;
  location_map jsonb;
  rotation_count integer := 0;
  patient_count integer := 0;
  follow_up_count integer := 0;
  exam_count integer := 0;
  slaberan_location_count integer := 0;
  slaberan_template_count integer := 0;
  follow_up_time text;
  replace_locations boolean := jsonb_typeof(p_backup->'slaberanLocations') = 'array';
  replace_templates boolean := jsonb_typeof(p_backup->'slaberanTemplates') = 'array';
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

  CREATE TEMP TABLE restore_location_map (
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

  IF replace_templates THEN
    DELETE FROM public.slaberan_templates
    WHERE user_id = current_user_id;
  END IF;

  IF replace_locations THEN
    DELETE FROM public.slaberan_locations
    WHERE user_id = current_user_id
      AND parent_id IS NOT NULL;

    DELETE FROM public.slaberan_locations
    WHERE user_id = current_user_id
      AND parent_id IS NULL;
  END IF;

  IF replace_locations THEN
    FOR location_item IN
      SELECT value
      FROM jsonb_array_elements(p_backup->'slaberanLocations')
      WHERE NULLIF(value->>'parentId', '') IS NULL
      ORDER BY
        COALESCE((value->>'sortOrder')::integer, 0),
        value->>'name'
    LOOP
      INSERT INTO public.slaberan_locations (
        user_id,
        parent_id,
        type,
        name,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        current_user_id,
        NULL,
        location_item->>'type',
        location_item->>'name',
        COALESCE((location_item->>'sortOrder')::integer, 0),
        COALESCE((location_item->>'isActive')::boolean, true),
        COALESCE(NULLIF(location_item->>'createdAt', '')::timestamptz, now()),
        COALESCE(NULLIF(location_item->>'updatedAt', '')::timestamptz, now())
      )
      RETURNING id INTO remote_location_id;

      INSERT INTO restore_location_map(local_id, remote_id)
      VALUES (location_item->>'id', remote_location_id);

      slaberan_location_count := slaberan_location_count + 1;
    END LOOP;

    FOR location_item IN
      SELECT value
      FROM jsonb_array_elements(p_backup->'slaberanLocations')
      WHERE NULLIF(value->>'parentId', '') IS NOT NULL
      ORDER BY
        COALESCE((value->>'sortOrder')::integer, 0),
        value->>'name'
    LOOP
      SELECT remote_id
      INTO remote_location_id
      FROM restore_location_map
      WHERE local_id = location_item->>'parentId';

      IF remote_location_id IS NULL THEN
        RAISE EXCEPTION
          'Lokasi % merujuk ke parent yang tidak ada di backup.',
          location_item->>'name';
      END IF;

      INSERT INTO public.slaberan_locations (
        user_id,
        parent_id,
        type,
        name,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        current_user_id,
        remote_location_id,
        location_item->>'type',
        location_item->>'name',
        COALESCE((location_item->>'sortOrder')::integer, 0),
        COALESCE((location_item->>'isActive')::boolean, true),
        COALESCE(NULLIF(location_item->>'createdAt', '')::timestamptz, now()),
        COALESCE(NULLIF(location_item->>'updatedAt', '')::timestamptz, now())
      )
      RETURNING id INTO remote_location_id;

      INSERT INTO restore_location_map(local_id, remote_id)
      VALUES (location_item->>'id', remote_location_id);

      slaberan_location_count := slaberan_location_count + 1;
    END LOOP;
  END IF;

  IF replace_templates THEN
    FOR template_item IN
      SELECT value
      FROM jsonb_array_elements(p_backup->'slaberanTemplates')
      ORDER BY value->>'name'
    LOOP
      IF COALESCE((template_item->>'isDefault')::boolean, false) THEN
        IF default_template_local_id IS NOT NULL THEN
          RAISE EXCEPTION 'Backup memiliki lebih dari satu template Slaberan default.';
        END IF;

        default_template_local_id := template_item->>'id';
      END IF;

      INSERT INTO public.slaberan_templates (
        user_id,
        name,
        doctor,
        specialty,
        hospital,
        opening,
        show_empty_rooms,
        blocks,
        settings,
        schema_version,
        is_default,
        created_at,
        updated_at
      )
      VALUES (
        current_user_id,
        template_item->>'name',
        COALESCE(template_item->>'doctor', ''),
        COALESCE(template_item->>'specialty', ''),
        COALESCE(template_item->>'hospital', ''),
        COALESCE(template_item->>'opening', ''),
        COALESCE((template_item->>'showEmptyRooms')::boolean, true),
        COALESCE(template_item->'blocks', '[]'::jsonb),
        COALESCE(template_item->'settings', '{}'::jsonb),
        COALESCE((template_item->>'schemaVersion')::integer, 1),
        false,
        COALESCE(NULLIF(template_item->>'createdAt', '')::timestamptz, now()),
        COALESCE(NULLIF(template_item->>'updatedAt', '')::timestamptz, now())
      )
      RETURNING id INTO remote_template_id;

      slaberan_template_count := slaberan_template_count + 1;

      IF default_template_local_id = template_item->>'id' THEN
        default_remote_template_id := remote_template_id;
      END IF;
    END LOOP;

    IF default_remote_template_id IS NOT NULL THEN
      UPDATE public.slaberan_templates
      SET is_default = true,
          updated_at = now()
      WHERE id = default_remote_template_id
        AND user_id = current_user_id;
    END IF;
  END IF;

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

    current_remote_location_id := NULL;
    admission_remote_location_id := NULL;

    IF NULLIF(patient_item #>> '{currentLocation,locationId}', '') IS NOT NULL THEN
      SELECT remote_id
      INTO current_remote_location_id
      FROM restore_location_map
      WHERE local_id = patient_item #>> '{currentLocation,locationId}';

      IF replace_locations AND current_remote_location_id IS NULL THEN
        RAISE EXCEPTION
          'Lokasi aktif pasien % tidak ditemukan di backup.',
          patient_item->>'name';
      END IF;
    END IF;

    IF NULLIF(patient_item #>> '{admissionLocation,locationId}', '') IS NOT NULL THEN
      SELECT remote_id
      INTO admission_remote_location_id
      FROM restore_location_map
      WHERE local_id = patient_item #>> '{admissionLocation,locationId}';

      IF replace_locations AND admission_remote_location_id IS NULL THEN
        RAISE EXCEPTION
          'Lokasi masuk pasien % tidak ditemukan di backup.',
          patient_item->>'name';
      END IF;
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
      current_location_id,
      current_location_type,
      current_location_name,
      created_at,
      admission_date,
      admission_complaint,
      admission_location_id,
      admission_location_type,
      admission_location_name,
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
      current_remote_location_id,
      COALESCE(
        NULLIF(patient_item #>> '{currentLocation,type}', ''),
        CASE
          WHEN lower(btrim(patient_item->>'room')) IN ('icu', 'igd', 'cvcu/iccu', 'cvcu', 'iccu')
            THEN 'special'
          ELSE 'ward'
        END
      ),
      COALESCE(
        NULLIF(patient_item #>> '{currentLocation,name}', ''),
        NULLIF(btrim(patient_item->>'room'), '')
      ),
      COALESCE(NULLIF(patient_item->>'createdAt', '')::timestamptz, now()),
      NULLIF(patient_item->>'admissionDate', '')::date,
      NULLIF(patient_item->>'admissionComplaint', ''),
      admission_remote_location_id,
      NULLIF(patient_item #>> '{admissionLocation,type}', ''),
      NULLIF(patient_item #>> '{admissionLocation,name}', ''),
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
  INTO location_map
  FROM restore_location_map;

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
    'supportingExamCount', exam_count,
    'slaberanLocationCount', slaberan_location_count,
    'slaberanTemplateCount', slaberan_template_count,
    'slaberanLocationIds', location_map
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_workspace_backup_v2(jsonb) TO authenticated;
