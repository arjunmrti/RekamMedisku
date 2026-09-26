import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";

function block(
  id: string,
  type: SlaberanTemplateRecord["blocks"][number]["type"],
  label: string,
  config: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    label,
    enabled: true,
    config,
  };
}

export function createStarterSlaberanTemplate(): SlaberanTemplateRecord {
  const now = new Date().toISOString();

  return {
    id: "starter-neurologi",
    name: "Slaberan Neurologi — Template Dasar",
    doctor: "",
    specialty: "Neurologi",
    hospital: "RSUD Sawerigading Palopo",
    opening:
      "Assalamualaikum warahmatullahi wabarakatuh dok, tabe dok, mohon izin mengirimkan slaberan hari ini dok",
    showEmptyRooms: true,
    blocks: [
      block("opening", "opening", "Pembuka"),
      block("header", "header", "Header", {
        showTitle: true,
        showHospital: true,
        showSpecialty: true,
        showDoctor: true,
        showDate: true,
      }),
      block("wards", "ward-summary", "Ringkasan Bangsal", {
        showEmptyRooms: true,
        highlightOccupied: true,
      }),
      block("patients", "patient-list", "Daftar Pasien", {
        fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
      }),
      block("special", "special-unit-list", "Unit Khusus", {
        showEmptyRooms: true,
        highlightOccupied: true,
        fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
      }),
      block("summary", "summary", "Keterangan", {
        showDoctorCount: true,
        showTotalPatients: true,
      }),
    ],
    settings: {},
    schemaVersion: 1,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneSlaberanTemplate(
  template: SlaberanTemplateRecord,
  name = template.name + " — Salinan",
): SlaberanTemplateRecord {
  const now = new Date().toISOString();

  return {
    ...template,
    id: "template-copy-" + Date.now(),
    name,
    isDefault: false,
    blocks: template.blocks.map((item, index) => ({
      ...item,
      id: item.id + "-copy-" + Date.now() + "-" + index,
      config: { ...item.config },
    })),
    createdAt: now,
    updatedAt: now,
  };
}