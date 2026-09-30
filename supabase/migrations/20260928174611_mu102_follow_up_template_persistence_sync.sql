-- MU-102 — Follow-Up template identity + immutable snapshot persistence
-- Follow-ups may pin a user-owned template version. The snapshot is copied
-- from the authoritative template_versions row inside PostgreSQL so the client
-- cannot forge or mutate the historical template definition.
--
-- Legacy follow-ups remain valid with NULL template metadata. MU-103 will make
-- rotation-bound new follow-ups template-first and MU-104 will render from the
-- pinned snapshot.

BEGIN;

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS template_schema_version integer,
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb;

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_reference_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_reference_check
  CHECK (
    (
      template_id IS NULL
      AND template_version IS NULL
      AND template_schema_version IS NULL
      AND template_snapshot IS NULL
    )
    OR (
      template_id IS NOT NULL
      AND template_version IS NOT NULL
      AND template_schema_version IS NOT NULL
      AND template_snapshot IS NOT NULL
    )
  );

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_version_positive_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_version_positive_check
  CHECK (
    template_version IS NULL
    OR template_version > 0
  );

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_schema_version_positive_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_schema_version_positive_check
  CHECK (
    template_schema_version IS NULL
    OR template_schema_version > 0
  );

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_snapshot_object_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_snapshot_object_check
  CHECK (
    template_snapshot IS NULL
    OR jsonb_typeof(template_snapshot) = 'object'
  );

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_user_fkey;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_user_fkey
  FOREIGN KEY (template_id, user_id)
  REFERENCES public.templates (id, user_id)
  ON DELETE RESTRICT;

ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_template_version_fkey;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_template_version_fkey
  FOREIGN KEY (template_id, template_version)
  REFERENCES public.template_versions (template_id, version)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS follow_ups_user_template_version_idx
  ON public.follow_ups (
    user_id,
    template_id,
    template_version
  );

COMMENT ON COLUMN public.follow_ups.template_id IS
  'User-owned follow-up template identity pinned when the follow-up was saved.';

COMMENT ON COLUMN public.follow_ups.template_version IS
  'Immutable user-facing version of template_id used by this follow-up.';

COMMENT ON COLUMN public.follow_ups.template_schema_version IS
  'Definition contract version copied from template_versions at save time.';

COMMENT ON COLUMN public.follow_ups.template_snapshot IS
  'Authoritative immutable copy of the exact template definition used by this follow-up.';

CREATE OR REPLACE FUNCTION public.pin_follow_up_template_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  expected_schema_version integer;
  expected_definition jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.template_id IS NOT NULL THEN
    IF NEW.template_id IS DISTINCT FROM OLD.template_id
      OR NEW.template_version IS DISTINCT FROM OLD.template_version
      OR NEW.template_schema_version IS DISTINCT FROM OLD.template_schema_version
      OR NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot THEN
      RAISE EXCEPTION
        'Identitas template follow-up yang sudah tersimpan bersifat immutable.';
    END IF;

    NEW.template_id := OLD.template_id;
    NEW.template_version := OLD.template_version;
    NEW.template_schema_version := OLD.template_schema_version;
    NEW.template_snapshot := OLD.template_snapshot;

    RETURN NEW;
  END IF;

  IF NEW.template_id IS NULL
    AND (
      NEW.template_version IS NOT NULL
      OR NEW.template_schema_version IS NOT NULL
      OR NEW.template_snapshot IS NOT NULL
    ) THEN
    RAISE EXCEPTION
      'Metadata template follow-up harus diisi lengkap atau seluruhnya kosong.';
  END IF;

  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    tv.schema_version,
    tv.definition
  INTO
    expected_schema_version,
    expected_definition
  FROM public.template_versions tv
  JOIN public.templates t
    ON t.id = tv.template_id
   AND t.user_id = tv.user_id
   AND t.type = 'follow_up'
  WHERE tv.template_id = NEW.template_id
    AND tv.version = NEW.template_version
    AND tv.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Template follow-up atau versinya tidak berada dalam workspace pengguna.';
  END IF;

  NEW.template_schema_version := expected_schema_version;
  NEW.template_snapshot := expected_definition;

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.pin_follow_up_template_snapshot()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pin_follow_up_template_snapshot
  ON public.follow_ups;

CREATE TRIGGER trg_pin_follow_up_template_snapshot
  BEFORE INSERT OR UPDATE
  ON public.follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_follow_up_template_snapshot();

-- Keep the existing atomic follow-up + supporting-exam transaction, but let it
-- receive a template identity. The trigger above resolves the authoritative
-- snapshot from template_versions and makes it immutable thereafter.
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

    resolved_template_id := COALESCE(
      NULLIF(p_follow_up->>'template_id', '')::uuid,
      existing_follow_up.template_id
    );

    resolved_template_version := COALESCE(
      NULLIF(p_follow_up->>'template_version', '')::integer,
      existing_follow_up.template_version
    );

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
