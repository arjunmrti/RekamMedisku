-- Report template persistence — system-owned starters for common report types.
BEGIN;

INSERT INTO public.templates (id, user_id, type, name, description, metadata, is_system_owned)
VALUES
  ('00000000-0000-0000-0000-000000000301', NULL, 'report', 'Laporan Follow-up Ringkas', 'Compact follow-up report format: Subjective, Objective, Assessment, Plan, Instruction.', '{"source":"system","catalog":"report"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000302', NULL, 'report', 'Laporan Follow-up Lengkap', 'Extended follow-up report with patient context, detailed findings, and clinical reasoning.', '{"source":"system","catalog":"report"}'::jsonb, true),
  ('00000000-0000-0000-0000-000000000303', NULL, 'report', 'Laporan Pasien Baru', 'New patient intake report: identity, admission context, clinical presentation, and baseline assessment.', '{"source":"system","catalog":"report"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.template_versions (id, user_id, template_id, version, schema_version, definition)
VALUES
  ('00000000-0000-0000-0000-000000000311', NULL, '00000000-0000-0000-0000-000000000301', 1, 1,
   '{"schema_version":1,"greeting":"LAPORAN FOLLOW-UP PASIEN","sections":[{"id":"subjective","enabled":true,"label":"Subjective (S)","body":"Keluhan dan riwayat yang dilaporkan pasien atau keluarga."},{"id":"objective","enabled":true,"label":"Objective (O)","body":"Hasil pemeriksaan fisik dan temuan penunjang."},{"id":"assessment","enabled":true,"label":"Assessment (A)","body":"Diagnosis dan penilaian klinis."},{"id":"plan","enabled":true,"label":"Plan (P)","body":"Rencana tindakan dan terapi."},{"id":"instruction","enabled":true,"label":"Instruction (I)","body":"Instruksi monitoring, edukasi, dan follow-up."}],"closing":"Laporan dibuat untuk keperluan dokumentasi klinis."}'::jsonb),
  ('00000000-0000-0000-0000-000000000312', NULL, '00000000-0000-0000-0000-000000000302', 1, 1,
   '{"schema_version":1,"greeting":"LAPORAN FOLLOW-UP PASIEN (LENGKAP)","sections":[{"id":"patient-identity","enabled":true,"label":"Identitas Pasien","body":"Nama, nomor RM, usia, jenis kelamin, ruangan, dokter DPJP."},{"id":"clinical-context","enabled":true,"label":"Konteks Klinis","body":"Diagnosis utama, riwayat penyakit sekarang, faktor risiko."},{"id":"subjective","enabled":true,"label":"Subjective","body":"Keluhan dan perkembangan sejak kunjungan sebelumnya."},{"id":"objective","enabled":true,"label":"Objective","body":"Tanda vital, pemeriksaan fisik sistemik, hasil laboratorium dan imaging."},{"id":"assessment","enabled":true,"label":"Assessment","body":"Analisis klinis, penilaian respons terapi, permasalahan klinis yang sedang dihadapi."},{"id":"plan","enabled":true,"label":"Plan","body":"Rencana terapi, pemeriksaan lanjutan, konsultasi spesialis."},{"id":"instruction","enabled":true,"label":"Instruction","body":"Instruksi monitoring, edukasi pasien keluarga, follow-up."}],"closing":"Laporan dibuat oleh tenaga medis untuk keperluan dokumentasi klinis dan continuity of care."}'::jsonb),
  ('00000000-0000-0000-0000-000000000313', NULL, '00000000-0000-0000-0000-000000000303', 1, 1,
   '{"schema_version":1,"greeting":"LAPORAN PASIEN BARU","sections":[{"id":"patient-identity","enabled":true,"label":"Identitas Pasien","body":"Nama lengkap, nomor RM, tanggal lahir, usia, jenis kelamin, alamat, nomor kontak."},{"id":"admission","enabled":true,"label":"Informasi Masuk","body":"Tanggal masuk, cara masuk (rawat jalan/darurat/pindahan), ruangan/bangsal, dokter DPJP."},{"id":"chief-complaint","enabled":true,"label":"Keluhan Utama & Riwayat Penyakit Sekarang","body":"Keluhan yang membawa pasien dan kronologi penyakit."},{"id":"past-history","enabled":true,"label":"Riwayat Penyakit & Pengobatan Lalu","body":"Riwayat penyakit dahulu, riwayat pengobatan, alergi, kebiasaan."},{"id":"physical-exam","enabled":true,"label":"Pemeriksaan Fisik","body":"Keadaan umum, tanda vital, pemeriksaan sistem."},{"id":"initial-assessment","enabled":true,"label":"Diagnosis Awal & Penilaian","body":"Diagnosis kerja/diagnosis banding, penilaian keparahan, faktor risiko."},{"id":"initial-plan","enabled":true,"label":"Rencana Awal","body":"Rencana diagnostik, terapi, monitoring awal."}],"closing":"Laporan intake pasien baru dibuat untuk keperluan manajemen klinis dan dokumentasi rawat inap."}'::jsonb)
ON CONFLICT (template_id, version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.clone_system_report_template(
  p_template_id uuid, p_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE uid uuid := auth.uid(); src public.templates; ver public.template_versions; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sesi RekamMedisku tidak ditemukan.'; END IF;
  SELECT * INTO src FROM public.templates WHERE id=p_template_id AND is_system_owned AND type='report' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Starter template report tidak ditemukan.'; END IF;
  SELECT * INTO ver FROM public.template_versions WHERE template_id=src.id AND version=1 FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Starter template report tidak memiliki versi.'; END IF;
  IF NULLIF(btrim(COALESCE(p_name, src.name)), '') IS NULL THEN RAISE EXCEPTION 'Nama template report wajib diisi.'; END IF;
  INSERT INTO public.templates(user_id,type,name,description,metadata) VALUES(uid,src.type,btrim(COALESCE(p_name,src.name)),src.description,src.metadata) RETURNING id INTO new_id;
  INSERT INTO public.template_versions(user_id,template_id,version,schema_version,definition) VALUES(uid,new_id,1,ver.schema_version,ver.definition);
  RETURN jsonb_build_object('templateId',new_id::text,'version',1,'schemaVersion',ver.schema_version);
END; $fn$;

REVOKE ALL ON FUNCTION public.clone_system_report_template(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_system_report_template(uuid,text) TO authenticated;

COMMIT;
