import test from "node:test";
import assert from "node:assert/strict";
import { adaptSlaberanTemplateRecord } from "../src/utils/slaberanTemplateAdapter";
import type { SlaberanTemplate } from "../src/types/slaberan";
import type { SlaberanLocation } from "../src/types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../src/types/slaberanTemplate";

const fallback: SlaberanTemplate = {
  id: "fallback",
  name: "Fallback",
  specialty: "Neurologi",
  hospital: "RS Fallback",
  opening: "Mohon izin dok",
  showEmptyRooms: true,
  locationGroups: [{ label: "Lantai 1", rooms: ["Anggrek"] }],
  specialRooms: ["ICU"],
};

const locations: SlaberanLocation[] = [
  {
    id: "floor-1",
    type: "floor",
    name: "Lantai A",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "ward-1",
    type: "ward",
    name: "Anggrek",
    parentId: "floor-1",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
  {
    id: "icu",
    type: "special",
    name: "ICU",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  },
];

const cloudTemplate: SlaberanTemplateRecord = {
  id: "cloud-template",
  name: "Template Cloud",
  doctor: "dr. Cloud",
  specialty: "Neurologi",
  hospital: "RS Cloud",
  opening: "Pembukaan cloud",
  showEmptyRooms: false,
  blocks: [],
  settings: {},
  schemaVersion: 1,
  isDefault: true,
  createdAt: "2026-09-27T00:00:00.000Z",
  updatedAt: "2026-09-27T00:00:00.000Z",
};

test("cloud template uses cloud metadata and canonical Slaberan locations", () => {
  const result = adaptSlaberanTemplateRecord(
    cloudTemplate,
    locations,
    fallback,
  );

  assert.equal(result.name, "Template Cloud");
  assert.equal(result.hospital, "RS Cloud");
  assert.equal(result.opening, "Pembukaan cloud");
  assert.equal(result.showEmptyRooms, false);
  assert.deepEqual(result.locationGroups, [
    { label: "Lantai A", rooms: ["Anggrek"] },
  ]);
  assert.deepEqual(result.specialRooms, ["ICU"]);
});

test("cloud template settings can explicitly define location groups", () => {
  const result = adaptSlaberanTemplateRecord(
    {
      ...cloudTemplate,
      settings: {
        locationGroups: [{ label: "Custom", rooms: ["Custom Ward"] }],
        specialRooms: ["CVCU/ICCU"],
      },
    },
    [],
    fallback,
  );

  assert.deepEqual(result.locationGroups, [
    { label: "Custom", rooms: ["Custom Ward"] },
  ]);
  assert.deepEqual(result.specialRooms, ["CVCU/ICCU"]);
});
