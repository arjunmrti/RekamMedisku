import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_REPORT_TEMPLATE_DEFINITION } from "../src/data/systemReportTemplate";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";
import type { ReportTemplateDefinition } from "../src/types/reportTemplate";
import {
  buildWhatsAppReport,
  formatReportDate,
  formatReportRotationName,
  getReportGreeting,
} from "../src/utils/reportGenerator";

const patient: PatientListItem = {
  id: "p-test",
  rotationId: "rotation-custom",
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

const reportIdentity = {
  name: "Dr. Arjuna Murti",
  studentId: "STB-12345",
  program: "MPPD",
  institution: "Universitas Uji",
};

const followUp: FollowUpEntry = {
  id: "fu-1",
  number: 2,
  date: "26 September 2026",
  isoDate: "2026-09-26",
  time: "10.00",
  status: "Tersimpan",
  templateType: "Template Klinis Saya",
  templateId: "template-follow-up",
  templateVersion: 2,
  templateSchemaVersion: 1,
  templateSnapshot: {
    schema_version: 1,
    sections: [
      {
        id: "clinical",
        title: "Catatan Klinis",
        fields: [
          {
            id: "pain",
            label: "Nyeri",
            type: "number",
            required: false,
          },
          {
            id: "progress",
            label: "Perkembangan",
            type: "textarea",
            required: false,
          },
        ],
      },
    ],
  },
  templateAnswers: {
    pain: 7,
    progress: "Keluhan membaik.",
  },
  subjective: "Sakit kepala berkurang.",
  objective: [
    "Keadaan Umum: Baik",
    "TD: 120/80 mmHg",
    "Nyeri: 7",
    "Perkembangan: Keluhan membaik.",
  ].join("\n"),
  assessment: "Cephalgia membaik.",
  plan: "Observasi.",
  planning: "Lanjut observasi.",
  instruction: "Kontrol bila memburuk.",
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

const customDefinition: ReportTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "header",
      title: "",
      blocks: [
        {
          id: "intro",
          type: "value",
          source: "identity.report_introduction",
        },
      ],
    },
    {
      id: "patient",
      title: "Pasien:",
      blocks: [
        {
          id: "patient-name",
          type: "value",
          source: "patient.name",
          label: "Nama",
        },
        {
          id: "rotation-name",
          type: "value",
          source: "rotation.name",
          label: "Rotasi",
        },
      ],
    },
    {
      id: "clinical",
      title: "Catatan:",
      blocks: [
        {
          id: "subjective",
          type: "value",
          source: "follow_up.subjective",
        },
        {
          id: "answers",
          type: "template_answers",
          title: "Jawaban Template",
        },
      ],
    },
    {
      id: "supporting",
      title: "Penunjang:",
      blocks: [
        {
          id: "exams",
          type: "supporting_exams",
          includeAttachments: true,
        },
      ],
    },
    {
      id: "closing",
      title: "",
      blocks: [
        {
          id: "custom-close",
          type: "text",
          text: "Mohon arahan dokter.",
        },
      ],
    },
  ],
};

test("report renderer menerima template definition generik tanpa specialty", () => {
  const report = buildWhatsAppReport(patient, followUp, customDefinition, {
    rotationName: "Bedah Digestif",
    reportIdentity,
  });

  assert.match(
    report,
    /Perkenalkan saya Dr\. Arjuna Murti dengan Stambuk STB-12345 MPPD dari Universitas Uji Stase Bedah Digestif/,
  );
  assert.match(report, /Pasien:\nNama: Pasien Uji\nRotasi: Bedah Digestif/);
  assert.match(report, /Catatan:\nSakit kepala berkurang\./);
  assert.match(report, /Jawaban Template\nCatatan Klinis\nNyeri: 7\nPerkembangan: Keluhan membaik\./);
  assert.match(
    report,
    /Penunjang:\n- Rontgen · 26 September 2026\n  Tidak tampak kelainan akut\.\n  Lampiran: rontgen\.png/,
  );
  assert.match(report, /Mohon arahan dokter\.$/);
  assert.equal(report.includes("Pemeriksaan neurologis:"), false);
  assert.equal(report.includes("Pemeriksaan sistemik Ilmu Penyakit Dalam:"), false);
});

test("default system report tetap generik dan membaca data template follow-up", () => {
  const report = buildWhatsAppReport(patient, followUp, DEFAULT_REPORT_TEMPLATE_DEFINITION, {
    rotationName: "Neurologi",
    reportIdentity,
  });

  assert.match(report, /Nama: Pasien Uji/);
  assert.match(report, /RM: RM-001/);
  assert.match(report, /Stase: Neurologi/);
  assert.match(report, /Keluhan Masuk: Sakit kepala sejak 3 hari sebelum masuk\./);
  assert.match(report, /Keluhan / Perkembangan Hari Ini: Sakit kepala berkurang\./);
  assert.match(report, /O:\nKeadaan Umum: Baik\nTD: 120\/80 mmHg/);
  assert.match(report, /Data Template Follow-Up\nCatatan Klinis\nNyeri: 7\nPerkembangan: Keluhan membaik\./);
  assert.match(report, /A:\nCephalgia membaik\./);
  assert.match(report, /P: Lanjut observasi\./);
  assert.match(report, /I: Kontrol bila memburuk\./);
});

test("legacy follow-up tanpa snapshot template tetap dapat dirender", () => {
  const legacyFollowUp: FollowUpEntry = {
    ...followUp,
    templateId: undefined,
    templateVersion: undefined,
    templateSchemaVersion: undefined,
    templateSnapshot: undefined,
    templateAnswers: undefined,
    objective: "Tekanan darah 120/80 mmHg\nKesadaran compos mentis",
  };

  const report = buildWhatsAppReport(
    patient,
    legacyFollowUp,
    customDefinition,
    {
      rotationName: "Stase Lama",
      reportIdentity,
    },
  );

  assert.match(
    report,
    /Tekanan darah 120\/80 mmHg\nKesadaran compos mentis/,
  );
  assert.equal(report.includes("Jawaban Template\nData tidak tersedia"), false);
});

test("nama stase dibersihkan dari prefix dan bulan tanpa mengubah nama inti", () => {
  const cases = [
    ["Neurologi September", "Neurologi"],
    ["Rotasi Neurologi September 2026", "Neurologi"],
    ["Ilmu Penyakit Dalam Agustus", "Ilmu Penyakit Dalam"],
    ["Bedah Oktober 2026", "Bedah"],
    ["Stase Mata Januari", "Mata"],
    ["Bedah Digestif", "Bedah Digestif"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(formatReportRotationName(input, "Stase"), expected);
  }

  assert.equal(formatReportRotationName(undefined, "Stase"), "Stase");
  assert.equal(formatReportRotationName("", "Stase"), "Stase");
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

test("tanggal kosong memakai fallback yang aman", () => {
  assert.equal(formatReportDate(""), "Tanggal belum tersedia");
  assert.equal(formatReportDate("26 September 2026"), "26 September 2026");
});
