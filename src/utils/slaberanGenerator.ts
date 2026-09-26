import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { SlaberanTemplate } from "../types/slaberan";
import type { SlaberanLocation } from "../types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";
import { renderSlaberanTemplate } from "./slaberanEngine";
import {
  formatSlaberanDate,
  getDiagnosisSummary,
  getLatestFollowUp,
  getSlaberanDoctorOptions,
  normalizeSlaberanDoctorName,
} from "./slaberanFacts";

export {
  formatSlaberanDate,
  getDiagnosisSummary,
  getLatestFollowUp,
  getSlaberanDoctorOptions,
  normalizeSlaberanDoctorName,
};

function legacyTemplateToRecord(
  template: SlaberanTemplate,
): SlaberanTemplateRecord {
  const now = new Date().toISOString();

  return {
    id: template.id,
    name: template.name,
    doctor: "",
    specialty: template.specialty,
    hospital: template.hospital,
    opening: template.opening,
    showEmptyRooms: template.showEmptyRooms,
    blocks: [
      {
        id: "opening",
        type: "opening",
        label: "Pembuka",
        enabled: true,
        config: {},
      },
      {
        id: "header",
        type: "header",
        label: "Header",
        enabled: true,
        config: {
          showTitle: true,
          showHospital: true,
          showDate: true,
        },
      },
      {
        id: "wards",
        type: "ward-summary",
        label: "Ringkasan Bangsal",
        enabled: true,
        config: {
          showEmptyRooms: template.showEmptyRooms,
          highlightOccupied: true,
        },
      },
      {
        id: "patients",
        type: "patient-list",
        label: "Daftar Pasien",
        enabled: true,
        config: {
          fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
        },
      },
      {
        id: "special",
        type: "special-unit-list",
        label: "Unit Khusus",
        enabled: true,
        config: {
          showEmptyRooms: template.showEmptyRooms,
          highlightOccupied: true,
          fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
        },
      },
      {
        id: "summary",
        type: "summary",
        label: "Keterangan",
        enabled: true,
        config: {
          showDoctorCount: true,
          showTotalPatients: true,
        },
      },
    ],
    settings: {},
    schemaVersion: 1,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSlaberanReport(
  template: SlaberanTemplate | SlaberanTemplateRecord,
  options: {
    doctor: string;
    date: string;
    patients: PatientListItem[];
    followUpsByPatient: Record<string, FollowUpEntry[]>;
    locations?: SlaberanLocation[];
  },
) {
  const record =
    "blocks" in template ? template : legacyTemplateToRecord(template);

  return renderSlaberanTemplate({
    template: record,
    doctor: options.doctor,
    date: options.date,
    patients: options.patients,
    followUpsByPatient: options.followUpsByPatient,
    locations: options.locations ?? [],
  });
}