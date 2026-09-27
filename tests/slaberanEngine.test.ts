import test from "node:test";
import assert from "node:assert/strict";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";
import type { SlaberanLocation } from "../src/types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../src/types/slaberanTemplate";
import { buildSlaberanReport } from "../src/utils/slaberanGenerator";
import { createStarterSlaberanTemplate } from "../src/utils/slaberanTemplate";
import { renderSlaberanTemplate } from "../src/utils/slaberanEngine";

const patient = (
  id: string,
  name: string,
  locationId: string,
  locationName: string,
): PatientListItem => ({
  id,
  rotationId: "r-1",
  name,
  age: 23,
  gender: "Laki-laki",
  room: locationName,
  currentLocation: {
    locationId,
    type: "ward",
    name: locationName,
    bed: "15",
  },
  bed: "15",
  rm: "2012391",
  doctor: "dr. Supardi",
  lastFollowUp: "Belum ada follow-up",
  followUpNumber: 0,
  status: "Aktif",
});

const locations: SlaberanLocation[] = [
  {
    id: "floor-1",
    type: "floor",
    name: "Lantai 1",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "floor-2",
    type: "floor",
    name: "Lantai 2",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "ward-1-anggrek",
    type: "ward",
    parentId: "floor-1",
    name: "Anggrek",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "ward-2-anggrek",
    type: "ward",
    parentId: "floor-2",
    name: "Anggrek",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "special-icu",
    type: "special",
    name: "ICU",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
];

const followUps: Record<string, FollowUpEntry[]> = {};

const template: SlaberanTemplateRecord = {
  id: "t-1",
  name: "Test",
  doctor: "",
  specialty: "Neurologi",
  hospital: "RSUD Test",
  opening: "Pembuka",
  showEmptyRooms: true,
  blocks: [
    {
      id: "header",
      type: "header",
      label: "Header",
      enabled: true,
      config: { showTitle: true, showHospital: true, showDate: true },
    },
    {
      id: "wards",
      type: "ward-summary",
      label: "Bangsal",
      enabled: true,
      config: { showEmptyRooms: true, highlightOccupied: true },
    },
    {
      id: "patients",
      type: "patient-list",
      label: "Pasien",
      enabled: true,
      config: { fields: ["name", "age", "rm"] },
    },
    {
      id: "special",
      type: "special-unit-list",
      label: "Unit Khusus",
      enabled: true,
      config: { showEmptyRooms: true, highlightOccupied: true },
    },
  ],
  settings: {},
  schemaVersion: 1,
  isDefault: true,
  createdAt: "2026-09-27T00:00:00.000Z",
  updatedAt: "2026-09-27T00:00:00.000Z",
};

test("lokasi dengan nama sama tetap terpisah berdasarkan locationId", () => {
  const report = renderSlaberanTemplate({
    template,
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [
      patient("p-1", "Bima", "ward-1-anggrek", "Anggrek"),
      patient("p-2", "Citra", "ward-2-anggrek", "Anggrek"),
    ],
    followUpsByPatient: followUps,
    locations,
  });

  assert.match(report, /\*Lantai 1\*[\s\S]*\*Anggrek \(1\)\*/);
  assert.match(report, /\*Lantai 2\*[\s\S]*\*Anggrek \(1\)\*/);
  assert.equal((report.match(/\*Anggrek \(1\)\*/g) ?? []).length, 2);
});

test("urutan template memisahkan ringkasan bangsal dari daftar pasien", () => {
  const report = renderSlaberanTemplate({
    template,
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [patient("p-1", "Bima", "ward-1-anggrek", "Anggrek")],
    followUpsByPatient: followUps,
    locations,
  });

  const wardIndex = report.indexOf("*Anggrek (1)*");
  const patientIndex = report.indexOf("1. Bima/23 Tahun/RM 2012391");

  assert.ok(wardIndex >= 0);
  assert.ok(patientIndex > wardIndex);
  assert.match(report, /ICU \(0\)/);
});

test("format baris pasien mengikuti konfigurasi template", () => {
  const customTemplate: SlaberanTemplateRecord = {
    ...template,
    blocks: [
      {
        id: "patients-custom",
        type: "patient-list",
        label: "Pasien",
        enabled: true,
        config: {
          fields: ["name", "age", "diagnosis"],
          patientSeparator: " | ",
          patientPrefix: "• ",
          showPatientIndex: false,
          emptyText: "Kosong",
        },
      },
    ],
  };

  const report = renderSlaberanTemplate({
    template: customTemplate,
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [patient("p-1", "Bima", "ward-1-anggrek", "Anggrek")],
    followUpsByPatient: {
      "p-1": [
        {
          id: "fu-1",
          number: 1,
          date: "27 September 2026",
          isoDate: "2026-09-27",
          time: "08.00",
          status: "Tersimpan",
          subjective: "",
          objective: "",
          assessment: "Vertigo",
          plan: "",
          summary: "",
        },
      ],
    },
    locations,
  });

  assert.equal(report, "• Bima | 23 Tahun | Vertigo");
});

test("blok nonaktif benar-benar tidak menghasilkan output", () => {
  const disabledTemplate: SlaberanTemplateRecord = {
    ...template,
    blocks: [
      ...template.blocks.map((block) => ({
        ...block,
        enabled: block.type !== "ward-summary",
      })),
    ],
  };

  const report = renderSlaberanTemplate({
    template: disabledTemplate,
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [patient("p-1", "Bima", "ward-1-anggrek", "Anggrek")],
    followUpsByPatient: followUps,
    locations,
  });

  assert.equal(report.includes("Lantai 1"), false);
  assert.equal(report.includes("Anggrek (1)"), false);
  assert.match(report, /Bima/);
});


test("pasien Unit Khusus tidak duplikat di Patient List secara default", () => {
  const report = renderSlaberanTemplate({
    template,
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [
      patient("p-1", "Bima", "ward-1-anggrek", "Anggrek"),
      {
        ...patient("p-icu", "Citra", "special-icu", "ICU"),
        currentLocation: {
          locationId: "special-icu",
          type: "special",
          name: "ICU",
          bed: "04",
        },
        room: "ICU",
      },
    ],
    followUpsByPatient: followUps,
    locations,
  });

  assert.equal((report.match(/Citra/g) ?? []).length, 1);
  assert.match(report, /\*ICU \(1\)\*[\s\S]*Citra/);
  assert.match(report, /Bima/);
});

test("starter template tetap dapat menghasilkan bangsal legacy tanpa registry lokasi", () => {
  const report = buildSlaberanReport(createStarterSlaberanTemplate(), {
    doctor: "dr. Supardi",
    date: "2026-09-27",
    patients: [patient("p-1", "Bima", "ward-1-anggrek", "Anggrek")],
    followUpsByPatient: followUps,
  });

  assert.match(report, /\*Lantai 1\*/);
  assert.match(report, /Anggrek \(1\)/);
  assert.match(report, /\*Lantai 2\*/);
});
