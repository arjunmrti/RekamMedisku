import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultSlaberanTemplate } from "../src/data/slaberanTemplates";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";
import {
  buildSlaberanReport,
  getDiagnosisSummary,
  getSlaberanDoctorOptions,
} from "../src/utils/slaberanGenerator";

const patients: PatientListItem[] = [
  {
    id: "p-1",
    rotationId: "r-neuro",
    name: "Yohanis Rappan",
    age: 54,
    gender: "Laki-laki",
    rm: "303832",
    room: "Geranium",
    bed: "B4/02",
    doctor: "dr. Deviyanty Syahmi S., Sp.N",
    lastFollowUp: "Belum ada follow-up",
    followUpNumber: 0,
    status: "Aktif",
  },
  {
    id: "p-2",
    rotationId: "r-neuro",
    name: "Adolpina Pasalu",
    age: 55,
    gender: "Perempuan",
    rm: "443904",
    room: "Geranium",
    bed: "B5/01",
    doctor: "dr. Deviyanty Syahmi S., Sp.N",
    lastFollowUp: "Belum ada follow-up",
    followUpNumber: 0,
    status: "Aktif",
  },
  {
    id: "p-3",
    rotationId: "r-neuro",
    name: "Tn. Paulus",
    age: 89,
    gender: "Laki-laki",
    rm: "264529",
    room: "ICU",
    bed: "04",
    doctor: "dr. Deviyanty Syahmi S., Sp.N (konsul)",
    lastFollowUp: "Belum ada follow-up",
    followUpNumber: 0,
    status: "Aktif",
  },
];

const followUpsByPatient: Record<string, FollowUpEntry[]> = {
  "p-1": [
    {
      id: "fu-1",
      number: 1,
      date: "25 September 2026",
      isoDate: "2026-09-25",
      time: "08.00",
      status: "Tersimpan",
      subjective: "Nyeri punggung",
      objective: "",
      assessment: "LBP",
      plan: "",
      summary: "Nyeri punggung",
    },
  ],
  "p-2": [
    {
      id: "fu-2",
      number: 1,
      date: "25 September 2026",
      isoDate: "2026-09-25",
      time: "08.30",
      status: "Tersimpan",
      subjective: "Lemah",
      objective: "",
      assessment: "Infark Cerebri",
      plan: "",
      summary: "Lemah",
    },
  ],
  "p-3": [
    {
      id: "fu-3",
      number: 1,
      date: "25 September 2026",
      isoDate: "2026-09-25",
      time: "09.00",
      status: "Tersimpan",
      subjective: "Penurunan kesadaran",
      objective: "",
      assessment: "Infark Cerebri",
      plan: "",
      summary: "Penurunan kesadaran",
    },
  ],
};

test("dokter konsul dinormalisasi untuk pemilihan dan ringkasan", () => {
  assert.deepEqual(getSlaberanDoctorOptions(patients), [
    "dr. Deviyanty Syahmi S., Sp.N",
  ]);
});

test("diagnosis ringkas mengambil assessment terbaru", () => {
  assert.equal(
    getDiagnosisSummary(followUpsByPatient["p-2"]),
    "Infark Cerebri",
  );
});

test("generator Slaberan menghasilkan struktur census tanpa emoji", () => {
  const report = buildSlaberanReport(getDefaultSlaberanTemplate(), {
    doctor: "dr. Deviyanty Syahmi S., Sp.N",
    date: "2026-09-25",
    patients,
    followUpsByPatient,
  });

  assert.match(
    report,
    /Slaberan Pasien Neurologi \(dr\. Deviyanty Syahmi S\., Sp\.N\)/,
  );
  assert.match(report, /\*Lantai 1\*/);
  assert.match(report, /\*Lantai 2\*/);
  assert.match(report, /\*Geranium \(2\)\*/);
  assert.match(report, /1\. Yohanis Rappan\/54 Tahun\/RM 303832/);
  assert.match(report, /2\. Adolpina Pasalu\/55 Tahun\/RM 443904/);
  assert.match(
    report,
    /Tn\. Paulus\/89 Tahun\/RM 264529\/dr\. Deviyanty Syahmi S\., Sp\.N \(konsul\)\/04\/Infark Cerebri/,
  );
  assert.match(report, /Keterangan:\ndr\. Deviyanty Syahmi S\., Sp\.N = 3/);
  assert.match(report, /Total pasien = 3/);
  assert.equal(/🌸|🏡|🫀|🛑|🚑/.test(report), false);
});
