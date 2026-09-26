import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppReport,
  formatReportDate,
  formatReportRotationName,
  getReportGreeting,
  getReportTemplateForSpecialty,
} from "../src/utils/reportGenerator";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";

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

test("template hanya tersedia untuk stase MVP yang didukung", () => {
  assert.equal(getReportTemplateForSpecialty("Neurologi"), "Neurologi");
  assert.equal(
    getReportTemplateForSpecialty("Ilmu Penyakit Dalam"),
    "Ilmu Penyakit Dalam",
  );
  assert.equal(getReportTemplateForSpecialty("Bedah"), null);
  assert.equal(getReportTemplateForSpecialty("Pediatri"), null);
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
      generatedAt: new Date(2026, 8, 26, 19, 0),
    },
  );

  assert.match(
    report,
    /^Assalamualaikum warahmatullahi wabarakatuh dok\. Tabe dok, mohon izin dok\. Perkenalkan saya Muh\. Fadel dengan Stambuk 11120252020 MPPD Stase Neurologi\. Mohon izin melaporkan follow-up pasien:/,
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

test("laporan Ilmu Penyakit Dalam tidak menggandakan Keadaan Umum", () => {
  const report = buildWhatsAppReport(
    patient,
    internalMedicineFollowUp,
    "Ilmu Penyakit Dalam",
    {
      rotationName: "Ilmu Penyakit Dalam",
      generatedAt: new Date(2026, 8, 26, 12, 0),
    },
  );

  assert.match(
    report,
    /^Assalamualaikum warahmatullahi wabarakatuh dok\. Tabe dok, mohon izin dok\. Perkenalkan saya Muh\. Fadel dengan Stambuk 11120252020 MPPD Stase Ilmu Penyakit Dalam\. Mohon izin melaporkan follow-up pasien:/,
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

test("tanggal kosong memakai fallback yang aman", () => {
  assert.equal(formatReportDate(""), "Tanggal belum tersedia");
  assert.equal(formatReportDate("26 September 2026"), "26 September 2026");
});
