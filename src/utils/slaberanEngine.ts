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
import { normalizePatientLocationType } from "./patientLocation";
import { APPROVED_REPORT_TAGS, extractTagsFromText, resolveTag, type RenderContext } from "./reportGenerator";

export const SLABERAN_SHARED_FIELD_REGISTRY = [...APPROVED_REPORT_TAGS, "followUp.templateAnswers", "followUp.structuredCoreObjective"] as const;

export function validateSlaberanVariables(text: string, context?: RenderContext) {
  const unknown: string[] = [];
  for (const tag of extractTagsFromText(text)) {
    const dynamic = tag.startsWith("template.field.");
    const known = (SLABERAN_SHARED_FIELD_REGISTRY as readonly string[]).includes(tag) || tag.startsWith("core.") || (dynamic && Boolean(context?.templateFields && Object.prototype.hasOwnProperty.call(context.templateFields, tag.slice(15))));
    if (!known && !unknown.includes(tag)) unknown.push(tag);
  }
  return unknown;
}

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

function getPatientLocationType(patient: PatientListItem) {
  const current = patient.currentLocation;
  return normalizePatientLocationType(
    current?.type,
    current?.name ?? patient.room,
  );
}

function isSpecialUnitPatient(patient: PatientListItem) {
  return getPatientLocationType(patient) === "special";
}

function patientLine(
  context: PatientContext,
  index: number,
  fields: SlaberanPatientField[],
  config: SlaberanTemplateBlockConfig,
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

  const selected: SlaberanPatientField[] =
    fields.length ? fields : ["name", "age", "rm"];
  const separator = config.patientSeparator ?? "/";
  const prefix = config.patientPrefix ?? "";
  const showPatientIndex = config.showPatientIndex ?? true;
  const body = selected
    .map((field) => values[field])
    .filter(Boolean)
    .join(separator);

  return (
    (showPatientIndex ? String(index) + ". " : "") +
    prefix +
    body
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
      getPatientLocationType(patient) ===
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

  const legacyGroups = (
    (block.config as { legacyGroups?: unknown }).legacyGroups ?? []
  ) as Array<{ label?: unknown; rooms?: unknown }>;

  if (floors.length === 0 && wards.length === 0 && legacyGroups.length > 0) {
    const assignedLegacyPatients = new Set<string>();

    for (const group of legacyGroups) {
      const label = typeof group.label === "string" ? group.label : "";
      const rooms = Array.isArray(group.rooms)
        ? group.rooms.filter((room): room is string => typeof room === "string")
        : [];

      if (!label || rooms.length === 0) continue;

      if (lines.length > 0) lines.push("");
      lines.push("*" + label + "*");

      for (const room of rooms) {
        const roomPatients = patientContexts.filter((context) => {
          if (assignedLegacyPatients.has(context.patient.id)) return false;

          return (
            normalize(
              context.patient.currentLocation?.name ?? context.patient.room,
            ) === normalize(room) &&
            !isSpecialUnitPatient(context.patient)
          );
        });

        roomPatients.forEach((context) =>
          assignedLegacyPatients.add(context.patient.id),
        );

        if (!showEmptyRooms && roomPatients.length === 0) continue;

        lines.push(
          highlightOccupied && roomPatients.length > 0
            ? "*" + room + " (" + roomPatients.length + ")*"
            : room + " (" + roomPatients.length + ")",
        );
      }
    }

    return;
  }

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
  const sourcePatients =
    config.includeSpecialUnitPatients === true
      ? patientContexts
      : patientContexts.filter(
          (context) => !isSpecialUnitPatient(context.patient),
        );
  const fields =
    config.fields ?? ["name", "age", "rm", "doctor", "bed", "diagnosis"];

  if (sourcePatients.length === 0) {
    lines.push(config.emptyText ?? "Belum ada pasien.");
    return;
  }

  sourcePatients.forEach((context, index) => {
    lines.push(patientLine(context, index + 1, fields, config));
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

  const legacyRooms = Array.isArray(config.legacyRooms)
    ? config.legacyRooms
    : [];

  if (specials.length === 0 && legacyRooms.length > 0) {
    for (const room of legacyRooms) {
      const unitPatients = patientContexts.filter(
        (context) =>
          normalize(context.patient.currentLocation?.name ?? context.patient.room) ===
          normalize(room),
      );

      if (!showEmptyRooms && unitPatients.length === 0) continue;

      if (lines.length > 0) lines.push("");
      lines.push(
        highlightOccupied && unitPatients.length > 0
          ? "*" + room + " (" + unitPatients.length + ")*"
          : room + " (" + unitPatients.length + ")",
      );

      unitPatients.forEach((context, index) => {
        lines.push(patientLine(context, index + 1, fields, config));
      });
    }

    return;
  }

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
      lines.push(patientLine(context, index + 1, fields, config));
    });
  }
}

function replaceVariables(
  text: string,
  context: RenderContext,
) {
  return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, rawKey: string) =>
    resolveTag(rawKey.trim(), context),
  );
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
            const textContext: RenderContext = {
              report: {
                date: formatSlaberanDate(options.date),
                rotation: options.template.specialty,
                specialty: options.template.specialty,
                hospital: options.template.hospital,
                doctor: normalizedDoctor,
                rotationMeta: { name: options.template.specialty, specialty: options.template.specialty },
              },
              patient: { name: "", age: "", rm: "", room: "", bed: "", dpjp: "" },
              followUp: { subjective: "", objective: "", assessment: "", plan: "", instruction: "", supportingExams: "", coreObjective: "" },
              identity: { name: "", studentId: "", program: "", institution: "" },
              templateType: options.template.specialty as RenderContext["templateType"],
              admissionDate: "",
              admissionComplaint: "",
              summary: { doctorCount: String(patientContexts.length), totalPatients: String(patientContexts.length) },
              templateFields: {},
              core: {},
            };
            lines.push(replaceVariables(text.trim(), textContext));
          }
          break;
        }
      }
    });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}