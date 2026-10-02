import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppReport,
  buildRenderContext,
  formatReportDate,
  formatReportRotationName,
  getReportGreeting,
  getReportTemplateForSpecialty,
  resolveTag,
  renderReportTemplate,
  validateReportTemplateDefinitionWithSnapshot,
  APPROVED_REPORT_TAGS,
  extractTagsFromText,
  validateReportTemplateDefinition,
} from "../src/utils/reportGenerator";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";
import type { ReportTemplateDefinition } from "../src/types/reportTemplate";
import { formatCoreObjective, formatTemplateAnswers, formatSupportingExams } from "../src/utils/reportFormatters";

test("structured report formatters preserve order and omit empty values", () => {
  assert.match(formatCoreObjective({ generalCondition: "Baik", consciousness: "Compos mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6", systolic: "120", diastolic: "80", pulse: "", respiratoryRate: "", temperature: "", spo2: "", oxygenVia: "", weight: "", height: "", bmi: "", nutritionStatus: "", headNeck: "", thorax: "", abdomen: "", extremities: "", painNrs: "", otherFindings: "" }), /GCS E\/M\/V: 4\/5\/6/);
  assert.equal(formatCoreObjective(undefined), "");
  assert.equal(formatTemplateAnswers({ schema_version: 1, sections: [{ id: "s", title: "Klinis", fields: [{ id: "f", label: "Nyeri", type: "text" }] }] }, { f: "ringan" }), "Klinis:\nNyeri: ringan");
  assert.match(formatSupportingExams([{ id: "e", name: "Lab", examType: "Darah", date: "2026-10-02", result: "Normal", icon: "lab" }]), /Lab \(Darah\).*Hasil: Normal/s);
});

const patient: PatientListItem = {
  id: "p-test",
  rotationId: "rotation-interna",
  name: "Pasien Uji",
  age: 42,
  gender: "Laki-laki",
  rm: "RM-001",
  room: "Melati",
  bed: "03",
  doctor: "dr. Penguji",
  lastFollowUp: "26 September 2026 · 10.00",
  followUpNumber: 2,
  admissionDate: "2026-09-01",
  admissionComplaint: "Sakit kepala sejak 3 hari sebelum masuk.",
  status: "Aktif",
};

const neurologyFollowUp: FollowUpEntry = {
  id: "fu-neuro-1",
  number: 2,
  date: "26 September 2026",
  isoDate: "2026-09-26",
  time: "10.00",
  status: "Tersimpan",
  templateType: "Neurologi",
  subjective: "Sakit kepala berkurang.",
  objective: [
    "Keadaan Umum: Baik",
    "TD: 120/80 mmHg",
    "Nadi: 80 x/menit",
    "Kesadaran: Compos mentis",
    "GCS E/M/V: 456",
    "N. Cranialis: Dalam batas normal",
    "Hasil Penunjang: Tidak ada",
  ].join("\n"),
  assessment: "Cephalgia membaik.",
  plan: "Observasi.",
  planning: "Lanjut observasi.",
  instruction: "Kontrol keluhan bila memburuk.",
  summary: "Sakit kepala berkurang.",
  supportingExams: [
    {
      id: "exam-1",
      name: "Rontgen",
      examType: "Rontgen",
      date: "26 September 2026",
      result: "Tidak tampak kelainan akut.",
      attachmentName: "rontgen.png",
      icon: "image",
    },
  ],
};

const reportIdentity = {
  name: "Dr. Arjuna Murti",
  studentId: "STB-12345",
  program: "MPPD",
  institution: "Universitas Uji",
};

const internalMedicineFollowUp: FollowUpEntry = {
  id: "fu-interna-1",
  number: 3,
  date: "26 September 2026",
  isoDate: "2026-09-26",
  time: "18.00",
  status: "Tersimpan",
  templateType: "Ilmu Penyakit Dalam",
  subjective: "Mual berkurang.",
  objective: [
    "Keadaan Umum: Baik",
    "TD: 120/80 mmHg",
    "Nadi: 80 x/menit",
    "Keadaan Umum: Baik",
    "Kesadaran: Compos mentis",
    "Kepala & Leher: Tidak ada kelainan",
    "Hasil Penunjang: Hb normal",
  ].join("\n"),
  assessment: "Dispepsia membaik.",
  plan: "Observasi.",
  planning: "Lanjut observasi.",
  instruction: "Diet sesuai toleransi.",
  summary: "Mual berkurang.",
};

test("template tersedia untuk semua stase", () => {
  assert.equal(getReportTemplateForSpecialty("Neurologi"), "Neurologi");
  assert.equal(
    getReportTemplateForSpecialty("Ilmu Penyakit Dalam"),
    "Ilmu Penyakit Dalam",
  );
  assert.equal(getReportTemplateForSpecialty("Bedah"), "Bedah");
  assert.equal(getReportTemplateForSpecialty("Pediatri"), "Pediatri");
  assert.equal(getReportTemplateForSpecialty(undefined), null);
});

test("nama stase laporan selalu tanpa embel-embel bulan", () => {
  const cases = [
    ["Neurologi September", "Neurologi"],
    ["Rotasi Neurologi September 2026", "Neurologi"],
    ["Ilmu Penyakit Dalam Agustus", "Ilmu Penyakit Dalam"],
    ["Bedah Oktober 2026", "Bedah"],
    ["Pediatri November", "Pediatri"],
    ["Obgyn Desember 2026", "Obgyn"],
    ["Stase Mata Januari", "Mata"],
    ["Neurologi", "Neurologi"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(formatReportRotationName(input, "Neurologi"), expected);
  }

  assert.equal(formatReportRotationName(undefined, "Neurologi"), "Neurologi");
  assert.equal(formatReportRotationName("", "Neurologi"), "Neurologi");
});

test("sapaan laporan mengikuti waktu lokal pengguna", () => {
  assert.equal(
    getReportGreeting(new Date(2026, 8, 26, 10, 0)),
    "Selamat pagi Dok",
  );
  assert.equal(
    getReportGreeting(new Date(2026, 8, 26, 11, 0)),
    "Selamat siang Dok",
  );
  assert.equal(
    getReportGreeting(new Date(2026, 8, 26, 15, 0)),
    "Selamat sore Dok",
  );
  assert.equal(
    getReportGreeting(new Date(2026, 8, 26, 18, 0)),
    "Selamat malam Dok",
  );
});

test("laporan Neurologi mengambil konteks klinis, penunjang, dan nama stase", () => {
  const report = buildWhatsAppReport(
    patient,
    neurologyFollowUp,
    "Neurologi",
    {
      rotationName: "Neurologi",
      reportIdentity,
      generatedAt: new Date(2026, 8, 26, 19, 0),
    },
  );

  assert.match(
    report,
    /^Assalamualaikum warahmatullahi wabarakatuh dok\. Tabe dok, mohon izin dok\. Perkenalkan saya Dr\. Arjuna Murti dengan Stambuk STB-12345 MPPD dari Universitas Uji Stase Neurologi\. Mohon izin melaporkan follow-up pasien:/,
  );
  assert.match(report, /Stase: Neurologi/);
  assert.match(report, /Tanggal Masuk: 01 September 2026/);
  assert.match(report, /Tanggal Follow-Up: 26 September 2026/);
  assert.match(report, /Keluhan Masuk: Sakit kepala sejak 3 hari sebelum masuk./);
  assert.match(report, /Pemeriksaan neurologis:/);
  assert.match(report, /- Kesadaran: Compos mentis/);
  assert.match(report, /- GCS E\/M\/V: 456/);
  assert.match(report, /- N\. Cranialis: Dalam batas normal/);
  assert.match(report, /- Rontgen · 26 September 2026/);
  assert.match(report, /  Tidak tampak kelainan akut\./);
  assert.match(report, /  Lampiran: rontgen\.png/);
  assert.match(report, /P: Lanjut observasi\./);
  assert.match(report, /I: Kontrol keluhan bila memburuk\./);
  assert.match(
    report,
    /Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻$/,
  );
});

test("laporan Neurologi mempertahankan output snapshot", () => {
  const report = buildWhatsAppReport(
    patient,
    neurologyFollowUp,
    "Neurologi",
    { rotationName: "Neurologi", reportIdentity },
  );

  assert.equal(
    report,
    `Assalamualaikum warahmatullahi wabarakatuh dok. Tabe dok, mohon izin dok. Perkenalkan saya Dr. Arjuna Murti dengan Stambuk STB-12345 MPPD dari Universitas Uji Stase Neurologi. Mohon izin melaporkan follow-up pasien:

Nama: Pasien Uji
Umur: 42 tahun
RM: RM-001
Ruangan: Melati
Bed: 03
DPJP: dr. Penguji
Stase: Neurologi
Tanggal Masuk: 01 September 2026
Tanggal Follow-Up: 26 September 2026

S:
Keluhan Masuk: Sakit kepala sejak 3 hari sebelum masuk.\nKeluhan / Perkembangan Hari Ini: Sakit kepala berkurang.

O:
Keadaan Umum: Baik
TD: 120/80 mmHg
Nadi: 80 x/menit
Hasil Penunjang: Tidak ada

Pemeriksaan neurologis:
- Kesadaran: Compos mentis
- GCS E/M/V: 456
- N. Cranialis: Dalam batas normal

Pemeriksaan penunjang:
- Rontgen · 26 September 2026
  Tidak tampak kelainan akut.
  Lampiran: rontgen.png

A:
Cephalgia membaik.

P: Lanjut observasi.
I: Kontrol keluhan bila memburuk.

Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻`,
  );
});

test("universal custom template path supports Bedah without specialty branching", () => {
  const followUp = { ...internalMedicineFollowUp, templateSnapshot: { schema_version: 1, sections: [{ id: "s", title: "Bedah", fields: [{ id: "wound", label: "Luka", type: "text" as const }] }] }, templateAnswers: { wound: "Bersih" } };
  const report = buildWhatsAppReport(patient, followUp, "Bedah", { rotationName: "Bedah", reportIdentity });
  assert.match(report, /Bedah/);
  assert.match(report, /Luka: Bersih/);
  assert.doesNotMatch(report, /Pemeriksaan neurologis|Pemeriksaan sistemik Ilmu Penyakit Dalam/);
});

test("laporan Ilmu Penyakit Dalam tidak menggandakan Keadaan Umum", () => {
  const report = buildWhatsAppReport(
    patient,
    internalMedicineFollowUp,
    "Ilmu Penyakit Dalam",
    {
      rotationName: "Ilmu Penyakit Dalam",
      reportIdentity,
      generatedAt: new Date(2026, 8, 26, 12, 0),
    },
  );

  assert.match(
    report,
    /^Assalamualaikum warahmatullahi wabarakatuh dok\. Tabe dok, mohon izin dok\. Perkenalkan saya Dr\. Arjuna Murti dengan Stambuk STB-12345 MPPD dari Universitas Uji Stase Ilmu Penyakit Dalam\. Mohon izin melaporkan follow-up pasien:/,
  );
  assert.match(report, /Stase: Ilmu Penyakit Dalam/);
  assert.match(report, /Tanggal Masuk: 01 September 2026/);
  assert.match(report, /Tanggal Follow-Up: 26 September 2026/);
  assert.match(report, /Pemeriksaan sistemik Ilmu Penyakit Dalam:/);

  const generalConditionMatches = report.match(/- Keadaan Umum: Baik/g) ?? [];
  assert.equal(generalConditionMatches.length, 1);

  const objectiveSection = report.split("\nPemeriksaan sistemik Ilmu Penyakit Dalam:")[0];
  assert.equal(objectiveSection.includes("\nKeadaan Umum: Baik"), false);
  assert.match(report, /- Kesadaran: Compos mentis/);
  assert.match(report, /- Kepala & Leher: Tidak ada kelainan/);
});

test("identitas laporan berasal dari profile yang diberikan", () => {
  const report = buildWhatsAppReport(
    patient,
    neurologyFollowUp,
    "Neurologi",
    { rotationName: "Neurologi", reportIdentity },
  );

  assert.match(
    report,
    /Perkenalkan saya Dr\. Arjuna Murti dengan Stambuk STB-12345 MPPD dari Universitas Uji Stase Neurologi/,
  );
  assert.equal(report.includes("Muh. Fadel"), false);
  assert.equal(report.includes("11120252020"), false);
});

test("tanggal kosong memakai fallback yang aman", () => {
  assert.equal(formatReportDate(""), "Tanggal belum tersedia");
  assert.equal(formatReportDate("26 September 2026"), "26 September 2026");
});

test("APPROVED_REPORT_TAGS contains whitelist of expected keys", () => {
  assert.equal(APPROVED_REPORT_TAGS.length, 20);
  assert.ok(APPROVED_REPORT_TAGS.includes("patient.name"));
  assert.ok(APPROVED_REPORT_TAGS.includes("report.rotation"));
  assert.ok(APPROVED_REPORT_TAGS.includes("followUp.coreObjective"));
});

test("resolveTag supports dynamic template and core tags", () => {
  const context = {
    report: { date: "", rotation: "", specialty: "", hospital: "", doctor: "", rotationMeta: { name: "", specialty: "" } },
    patient: { name: "", age: "", rm: "", room: "", bed: "", dpjp: "" },
    followUp: { subjective: "", objective: "", assessment: "", plan: "", instruction: "", supportingExams: "", coreObjective: "" },
    identity: { name: "", studentId: "", program: "", institution: "" },
    templateType: "Neurologi" as const,
    admissionDate: "",
    admissionComplaint: "",
    summary: { doctorCount: "", totalPatients: "" },
    templateFields: { "field-001": "nilai field" },
    core: { generalCondition: "Baik" },
  };
  assert.equal(resolveTag("template.field.field-001", context), "nilai field");
  assert.equal(resolveTag("core.generalCondition", context), "Baik");
  assert.equal(resolveTag("template.field.unknown", context), "");
});

test("renderReportTemplate renders enabled sections and omits disabled sections", () => {
  const context = {
    report: { date: "2026-10-02", rotation: "Rotasi A", specialty: "Neurologi", hospital: "RS Uji", doctor: "dr. DPJP", rotationMeta: { name: "Rotasi A", specialty: "Neurologi" } },
    patient: { name: "Pasien Uji", age: "40", rm: "RM-1", room: "A", bed: "1", dpjp: "dr. DPJP" },
    followUp: { subjective: "S", objective: "O", assessment: "A", plan: "P", instruction: "I", supportingExams: "", coreObjective: "" },
    identity: { name: "", studentId: "", program: "", institution: "" }, templateType: "Neurologi" as const,
    admissionDate: "", admissionComplaint: "", summary: { doctorCount: "", totalPatients: "" }, templateFields: { "field-1": "Jawaban" }, core: {},
  };
  const definition: ReportTemplateDefinition = {
    schema_version: 1, greeting: "Halo {{patient.name}}",
    sections: [
      { id: "enabled", label: "Aktif", enabled: true, body: "{{template.field.field-1}}" },
      { id: "disabled", label: "Nonaktif", enabled: false, body: "JANGAN TAMPIL" },
    ], closing: "Selesai {{report.specialty}}",
  };
  validateReportTemplateDefinitionWithSnapshot(definition, { sections: [{ fields: [{ id: "field-1" }] }] });
  assert.equal(renderReportTemplate(definition, context), "Halo Pasien Uji\n\nJawaban\n\nSelesai Neurologi");
});

test("renderReportTemplate reports missing dynamic fields and unknown tags", () => {
  const context = {
    report: { date: "", rotation: "", specialty: "", hospital: "", doctor: "", rotationMeta: { name: "", specialty: "" } },
    patient: { name: "", age: "", rm: "", room: "", bed: "", dpjp: "" }, followUp: { subjective: "", objective: "", assessment: "", plan: "", instruction: "", supportingExams: "", coreObjective: "" },
    identity: { name: "", studentId: "", program: "", institution: "" }, templateType: "Neurologi" as const, admissionDate: "", admissionComplaint: "", summary: { doctorCount: "", totalPatients: "" }, templateFields: {}, core: {},
  };
  const result = renderReportTemplate({ schema_version: 1, sections: [{ id: "s", label: "S", enabled: true, body: "{{template.field.missing}} {{not.allowed}}" }] }, context, true);
  assert.equal(typeof result, "object");
  if (typeof result !== "string") {
    assert.ok(result.unresolved.includes("template.field.missing"));
    assert.ok(result.unknown.includes("not.allowed"));
  }
});

test("snapshot validation accepts known and rejects unknown dynamic fields", () => {
  const snapshot = { sections: [{ fields: [{ id: "known-field" }] }] };
  const valid: ReportTemplateDefinition = { schema_version: 1, sections: [{ id: "s", label: "S", enabled: true, body: "{{template.field.known-field}}" }] };
  assert.doesNotThrow(() => validateReportTemplateDefinitionWithSnapshot(valid, snapshot));
  const invalid: ReportTemplateDefinition = { schema_version: 1, sections: [{ id: "s", label: "S", enabled: true, body: "{{template.field.unknown-field}}" }] };
  assert.throws(() => validateReportTemplateDefinitionWithSnapshot(invalid, snapshot), /Unknown dynamic tag/);
});

test("validateReportTemplateDefinition accepts valid approved tags", () => {
  const validDef: ReportTemplateDefinition = {
    schema_version: 1,
    greeting: "Salam {{report.doctor}}",
    sections: [
      {
        id: "s1",
        label: "Identitas Pasien",
        enabled: true,
        body: "Nama: {{patient.name}}, Usia: {{patient.age}}, RM: {{patient.rm}}",
      },
      {
        id: "s2",
        label: "Follow Up",
        enabled: true,
        body: "S: {{followUp.subjective}}\nO: {{followUp.objective}}",
      },
    ],
    closing: "Terima kasih dari {{report.hospital}}.",
  };

  assert.doesNotThrow(() => validateReportTemplateDefinition(validDef));
});

test("validateReportTemplateDefinition accepts repeated tags and plain text", () => {
  const repeatedDef: ReportTemplateDefinition = {
    schema_version: 1,
    sections: [
      {
        id: "s1",
        label: "Summary",
        enabled: true,
        body: "Pasien {{patient.name}} (nama: {{patient.name}}) kamar {{patient.room}} bed {{patient.bed}}.",
      },
      {
        id: "s2",
        label: "Just text",
        enabled: true,
        body: "Hanya teks tanpa tag sama sekali.",
      },
    ],
  };

  assert.doesNotThrow(() => validateReportTemplateDefinition(repeatedDef));
});

test("validateReportTemplateDefinition rejects unknown tags in section body", () => {
  const invalidDef: ReportTemplateDefinition = {
    schema_version: 1,
    sections: [
      {
        id: "s1",
        label: "Test Invalid",
        enabled: true,
        body: "Nama: {{patient.unknown_field}}, DPJP: {{patient.dpjp}}",
      },
    ],
  };

  assert.throws(
    () => validateReportTemplateDefinition(invalidDef),
    /Unknown tag in section "Test Invalid": \{\{patient\.unknown_field\}\}/,
  );
});

test("extractTagsFromText extracts tags embedded inside surrounding text", () => {
  const text = "Info: {{ patient.name }} ada di kamar {{patient.room}} / {{patient.bed}}.";
  const tags = extractTagsFromText(text);
  assert.deepEqual(tags, ["patient.name", "patient.room", "patient.bed"]);
});

test("report formatter snapshot preserves core order, labels, and grouped GCS", () => {
  const output = formatCoreObjective({
    generalCondition: "Baik", consciousness: "Compos mentis", gcsEye: "4", gcsVerbal: "5", gcsMotor: "6",
    systolic: "120", diastolic: "80", pulse: "", respiratoryRate: "", temperature: "", spo2: "",
    oxygenVia: "", weight: "", height: "", bmi: "", nutritionStatus: "", headNeck: "", thorax: "",
    abdomen: "", extremities: "", painNrs: "", otherFindings: "Temuan lain",
  });
  assert.equal(output, [
    "GCS E/M/V: 4/5/6", "Keadaan Umum (generalCondition): Baik", "Kesadaran: Compos mentis", "TD: 120/80 mmHg", "Temuan Lain: Temuan lain",
  ].join("\n"));
});

test("template answers snapshot preserves field order and multi-value labels", () => {
  const definition = { schema_version: 1, sections: [{ id: "s", title: "Klinis", fields: [
    { id: "first", label: "Keluhan", type: "text" }, { id: "multi", label: "Pilihan", type: "multiselect" },
  ] }] } as import("../src/types/followUpTemplate").FollowUpTemplateDefinition;
  assert.equal(formatTemplateAnswers(definition, { multi: ["A", "B"], first: "Nyeri" }), "Klinis:\nKeluhan: Nyeri\nPilihan: A, B");
  assert.equal(formatTemplateAnswers(undefined, { first: "ignored" }), "");
});

test("render context preserves explicit specialty, metadata, doctor, admission, and core fallback", () => {
  const context = buildRenderContext(patient, neurologyFollowUp, "Rotasi Lama", reportIdentity, { name: "Rotasi Baru", specialty: "Neurologi" });
  assert.equal(context.report.specialty, "Neurologi");
  assert.deepEqual(context.report.rotationMeta, { name: "Rotasi Baru", specialty: "Neurologi" });
  assert.equal(context.report.doctor, patient.doctor);
  assert.equal(context.admissionComplaint, patient.admissionComplaint);
  assert.ok(context.followUp.coreObjective.length > 0);
});

test("resolver edge cases stay empty and malformed tags remain unresolved", () => {
  const context = { report: { date: "", rotation: "", specialty: "", hospital: "", doctor: "", rotationMeta: { name: "", specialty: "" } }, patient: { name: "", age: "", rm: "", room: "", bed: "", dpjp: "" }, followUp: { subjective: "", objective: "", assessment: "", plan: "", instruction: "", supportingExams: "", coreObjective: "" }, identity: { name: "", studentId: "", program: "", institution: "" }, templateType: "Neurologi" as const, admissionDate: "", admissionComplaint: "", summary: { doctorCount: "", totalPatients: "" }, templateFields: {}, core: {} };
  assert.equal(resolveTag("template.field.missing", context), "");
  assert.equal(resolveTag("core.generalCondition", context), "");
  assert.equal(resolveTag("template.field.field-1", { ...context, templateFields: { "field-1": "Jawaban label-rename" } }), "Jawaban label-rename");
  assert.deepEqual(extractTagsFromText("{{nested.{{bad}}}} {{unclosed"), ["bad"]);
});

