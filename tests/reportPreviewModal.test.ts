import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRenderContext,
  buildWhatsAppReport,
  resolveTag,
} from "../src/utils/reportGenerator";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";

const patient: PatientListItem = {
  id: "p-preview-test",
  rotationId: "rotation-neuro",
  name: "Pasien Preview",
  age: 35,
  gender: "Perempuan",
  rm: "RM-999",
  room: "Dahlia",
  bed: "02",
  doctor: "dr. Preview",
  lastFollowUp: "02 Oktober 2026 · 14.00",
  followUpNumber: 3,
  admissionDate: "2026-10-01",
  admissionComplaint: "Nyeri kepala kronik.",
  status: "Aktif",
};

const followUp: FollowUpEntry = {
  id: "fu-preview-1",
  number: 3,
  date: "02 Oktober 2026",
  isoDate: "2026-10-02",
  time: "14.00",
  status: "Tersimpan",
  templateType: "Neurologi",
  subjective: "Nyeri berkurang dengan terapi.",
  objective: "TD: 110/70, N: 72 x/menit, Kesadaran: Baik",
  assessment: "Nyeri kepala respons baik terhadap terapi.",
  plan: "Lanjut terapi.",
  planning: "Lanjut terapi sesuai protokol.",
  instruction: "Minum obat rutin, istirahat cukup.",
  summary: "Pasien membaik.",
  supportingExams: [
    {
      id: "exam-preview-1",
      name: "MRI Kepala",
      date: "02 Oktober 2026",
      result: "Tidak ada kelainan struktural.",
      icon: "scan",
    },
  ],
};

const identity = {
  name: "dr. Pemreviu",
  studentId: "STB-99999",
  program: "PPT",
  institution: "Rumah Sakit Preview",
};

test("buildRenderContext menangani missing values dengan fallback kosong", () => {
  const context = buildRenderContext(patient, followUp, "Neurologi", identity);
  assert.equal(context.patient.name, "Pasien Preview");
  assert.equal(context.followUp.instruction, "Minum obat rutin, istirahat cukup.");
  assert.equal(context.report.rotation, "Neurologi");
});

test("buildWhatsAppReport menghasilkan laporan konsisten untuk preview", () => {
  const report = buildWhatsAppReport(patient, followUp, "Neurologi", {
    rotationName: "Neurologi",
    reportIdentity: identity,
  });
  assert.ok(report.includes("Pasien Preview"));
  assert.ok(report.includes("RM-999"));
  assert.ok(report.includes("Nyeri berkurang dengan terapi."));
  assert.ok(report.includes("MRI Kepala"));
});

test("resolveTag mengembalikan string kosong untuk tag tidak dikenal", () => {
  const context = buildRenderContext(patient, followUp, "Neurologi", identity);
  assert.equal(resolveTag("patient.unknown", context), "");
  assert.equal(resolveTag("report.missing", context), "");
});

test("buildRenderContext menangani coreObjective JSON serialization", () => {
  const followUpWithCore: FollowUpEntry = {
    ...followUp,
    coreObjective: {
      generalCondition: "Baik",
      consciousness: "Compos mentis",
      gcsEye: "4",
      gcsVerbal: "5",
      gcsMotor: "6",
      systolic: "110",
      diastolic: "70",
      pulse: "72",
      respiratoryRate: "18",
      temperature: "36.5",
      spo2: "98",
      oxygenVia: "",
      weight: "",
      height: "",
      bmi: "",
      nutritionStatus: "",
      headNeck: "",
      thorax: "",
      abdomen: "",
      extremities: "",
      painNrs: "",
      otherFindings: "",
    },
  };
  const context = buildRenderContext(patient, followUpWithCore, "Neurologi", identity);
  assert.ok(context.followUp.coreObjective.includes("generalCondition"));
});
