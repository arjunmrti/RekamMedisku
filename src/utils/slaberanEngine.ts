import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { SlaberanLocation } from "../types/slaberanLocation";
import type {
  SlaberanPatientField,
  SlaberanTemplateBlock,
  SlaberanTemplateBlockConfig,
  SlaberanTemplateRecord,
} from "../types/slaberanTemplate";
import {
  formatSlaberanDate,
  getDiagnosisSummary,
  normalizeSlaberanDoctorName,
} from "./slaberanFacts";

type EngineOptions = {
  template: SlaberanTemplateRecord;
  doctor: string;
  date: string;
  patients: PatientListItem[];
  followUpsByPatient: Record<string, FollowUpEntry[]>;
  locations: SlaberanLocation[];
};

type PatientContext = {
  patient: PatientListItem;
  diagnosis: string;
};

function asConfig(block: SlaberanTemplateBlock): SlaberanTemplateBlockConfig {
  return block.config as SlaberanTemplateBlockConfig;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function patientMatchesDoctor(patient: PatientListItem, doctor: string) {
  return normalizeSlaberanDoctorName(patient.doctor) === doctor;
}

function patientLine(
  context: PatientContext,
  index: number,
  fields: SlaberanPatientField[],
) {
  const { patient, diagnosis } = context;

  const values: Record<SlaberanPatientField, string> = {
    name: patient.name,
    age: patient.age + " Tahun",
    rm: "RM " + patient.rm,
    doctor: patient.doctor,
    bed: patient.bed,
    diagnosis,
  };

  const selected = fields.length ? fields : ["name", "age", "rm"];
  return (
    String(index) +
    ". " +
    selected.map((field) => values[field]).filter(Boolean).join("/")
  );
}

function findPatientsForLocation(
  patients: PatientContext[],
  location: SlaberanLocation,
) {
  return patients.filter((context) => {
    const patient = context.patient;
    const current = patient.currentLocation;

    if (current?.locationId) return current.locationId === location.id;

    return (
      location.type !== "floor" &&
      normalize(current?.name ?? patient.room) === normalize(location.name) &&
      (current?.type ?? "ward") ===
        (location.type === "special" ? "special" : "ward")
    );
  });
}

function appendWardSummary(
  lines: string[],
  block: SlaberanTemplateBlock,
  locations: SlaberanLocation[],
  patientContexts: PatientContext[],
  fallbackShowEmpty: boolean,
) {
  const config = asConfig(block);
  const showEmptyRooms = config.showEmptyRooms ?? fallbackShowEmpty;
  const highlightOccupied = config.highlightOccupied ?? true;

  const floors = locations
    .filter((location) => location.type === "floor" && location.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const wards = locations
    .filter((location) => location.type === "ward" && location.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  for (const floor of floors) {
    const floorWards = wards.filter((ward) => ward.parentId === floor.id);

    if (floorWards.length === 0) continue;

    if (lines.length > 0) lines.push("");
    lines.push("*" + floor.name + "*");

    for (const ward of floorWards) {
      const wardPatients = findPatientsForLocation(patientContexts, ward);
      if (!showEmptyRooms && wardPatients.length === 0) continue;

      lines.push(
        highlightOccupied && wardPatients.length > 0
          ? "*" + ward.name + " (" + wardPatients.length + ")*"
          : ward.name + " (" + wardPatients.length + ")",
      );
    }
  }

  const rootWards = wards.filter((ward) => !ward.parentId);
  if (rootWards.length) {
    if (lines.length > 0) lines.push("");
    for (const ward of rootWards) {
      const wardPatients = findPatientsForLocation(patientContexts, ward);
      if (!showEmptyRooms && wardPatients.length === 0) continue;

      lines.push(
        highlightOccupied && wardPatients.length > 0
          ? "*" + ward.name + " (" + wardPatients.length + ")*"
          : ward.name + " (" + wardPatients.length + ")",
      );
    }
  }
}

function appendPatientList(
  lines: string[],
  block: SlaberanTemplateBlock,
  patientContexts: PatientContext[],
) {
  const config = asConfig(block);
  const fields =
    config.fields ?? ["name", "age", "rm", "doctor", "bed", "diagnosis"];

  if (patientContexts.length === 0) {
    lines.push("Belum ada pasien.");
    return;
  }

  patientContexts.forEach((context, index) => {
    lines.push(patientLine(context, index + 1, fields));
  });
}

function appendSpecialUnits(
  lines: string[],
  block: SlaberanTemplateBlock,
  locations: SlaberanLocation[],
  patientContexts: PatientContext[],
  fallbackShowEmpty: boolean,
) {
  const config = asConfig(block);
  const showEmptyRooms = config.showEmptyRooms ?? fallbackShowEmpty;
  const highlightOccupied = config.highlightOccupied ?? true;
  const fields =
    config.fields ?? ["name", "age", "rm", "doctor", "bed", "diagnosis"];

  const specials = locations
    .filter((location) => location.type === "special" && location.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  for (const unit of specials) {
    const unitPatients = findPatientsForLocation(patientContexts, unit);

    if (!showEmptyRooms && unitPatients.length === 0) continue;

    if (lines.length > 0) lines.push("");
    lines.push(
      highlightOccupied && unitPatients.length > 0
        ? "*" + unit.name + " (" + unitPatients.length + ")*"
        : unit.name + " (" + unitPatients.length + ")",
    );

    unitPatients.forEach((context, index) => {
      lines.push(patientLine(context, index + 1, fields));
    });
  }
}

function replaceVariables(
  text: string,
  template: SlaberanTemplateRecord,
  doctor: string,
  date: string,
  totalPatients: number,
) {
  return text
    .replaceAll("{{report.specialty}}", template.specialty)
    .replaceAll("{{report.doctor}}", doctor)
    .replaceAll("{{report.hospital}}", template.hospital)
    .replaceAll("{{report.date}}", formatSlaberanDate(date))
    .replaceAll("{{summary.doctor_count}}", String(totalPatients))
    .replaceAll("{{summary.total_patients}}", String(totalPatients));
}

function appendHeader(
  lines: string[],
  config: SlaberanTemplateBlockConfig,
  template: SlaberanTemplateRecord,
  doctor: string,
  date: string,
) {
  if (config.showTitle ?? true) {
    lines.push("*Slaberan Pasien " + template.specialty + " (" + doctor + ")*");
  }

  if (config.showHospital ?? true) lines.push("*" + template.hospital + "*");
  if (config.showSpecialty) lines.push("Spesialisasi: " + template.specialty);
  if (config.showDoctor) lines.push("Dokter: " + doctor);
  if (config.showDate ?? true) lines.push(formatSlaberanDate(date));
}

export function renderSlaberanTemplate(options: EngineOptions) {
  const normalizedDoctor = normalizeSlaberanDoctorName(options.doctor);
  const filteredPatients = options.patients.filter((patient) =>
    patientMatchesDoctor(patient, normalizedDoctor),
  );

  const patientContexts = filteredPatients.map((patient) => ({
    patient,
    diagnosis:
      getDiagnosisSummary(options.followUpsByPatient[patient.id]) ||
      "Belum ada diagnosis",
  }));

  const lines: string[] = [];

  options.template.blocks
    .filter((block) => block.enabled)
    .forEach((block, index) => {
      if (
        index > 0 &&
        block.type !== "divider" &&
        lines.length > 0
      ) {
        lines.push("");
      }

      switch (block.type) {
        case "opening":
          if (options.template.opening.trim()) {
            lines.push(options.template.opening.trim());
          }
          break;
        case "header":
          appendHeader(
            lines,
            asConfig(block),
            options.template,
            normalizedDoctor,
            options.date,
          );
          break;
        case "ward-summary":
          appendWardSummary(
            lines,
            block,
            options.locations,
            patientContexts,
            options.template.showEmptyRooms,
          );
          break;
        case "patient-list":
          appendPatientList(lines, block, patientContexts);
          break;
        case "special-unit-list":
          appendSpecialUnits(
            lines,
            block,
            options.locations,
            patientContexts,
            options.template.showEmptyRooms,
          );
          break;
        case "summary": {
          const config = asConfig(block);
          lines.push("Keterangan:");
          if (config.showDoctorCount ?? true) {
            lines.push(normalizedDoctor + " = " + patientContexts.length);
          }
          if (config.showTotalPatients ?? true) {
            lines.push("Total pasien = " + patientContexts.length);
          }
          break;
        }
        case "divider":
          lines.push(asConfig(block).separator ?? "");
          break;
        case "text": {
          const text = asConfig(block).text;
          if (typeof text === "string" && text.trim()) {
            lines.push(
              replaceVariables(
                text.trim(),
                options.template,
                normalizedDoctor,
                options.date,
                patientContexts.length,
              ),
            );
          }
          break;
        }
      }
    });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}