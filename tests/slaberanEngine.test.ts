import test from "node:test";
import assert from "node:assert/strict";
import type { FollowUpEntry } from "../src/types/followUp";
import type { PatientListItem } from "../src/types/patient";
import type { SlaberanLocation } from "../src/types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../src/types/slaberanTemplate";
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