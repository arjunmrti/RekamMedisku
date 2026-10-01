import {
  clearAllFollowUpDrafts,
  loadFollowUpDraft,
  loadSavedFollowUps,
  saveFollowUpDraft,
  replaceSavedFollowUps,
} from "../data/localFollowUps";
import { loadPatients, replacePatients } from "../data/localPatients";
import {
  getStoredAttachment,
  loadAllAttachments,
  replaceAllAttachments,
  type StoredAttachment,
} from "../data/localAttachments";
import {
  loadActiveRotationId,
  loadRotations,
  saveRotations,
  setActiveRotationId,
} from "../data/localRotations";
import {
  loadSlaberanLocations,
  replaceSlaberanLocations,
} from "../data/localSlaberanLocations";
import type {
  BackupAttachment,
  BackupPayload,
} from "../types/backup";
import type { FollowUpEntry } from "../types/followUp";
import type { FollowUpFormValues } from "../types/followUpForm";
import type { PatientListItem } from "../types/patient";
import type { Rotation } from "../types/rotation";
import type { SlaberanLocation } from "../types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";
import {
  normalizePatientAdmissionLocation,
  normalizePatientLocation,
} from "./patientLocation";
import {
  isValidDisplayTime,
  isValidIsoDate,
  isValidIsoDateTime,
  isValidTimeInput,
} from "./date";

function mergeFollowUps(
  patientId: string,
  saved: Record<string, FollowUpEntry[]>,
): FollowUpEntry[] {
  const merged = [...(saved[patientId] ?? [])];
  const seen = new Set<string>();

  return merged.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
export const MAX_BACKUP_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBlob(dataBase64: string, type: string): Blob {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type });
}

function collectAttachmentIds(
  followUpsByPatient: Record<string, FollowUpEntry[]>,
  followUpDrafts: Record<string, FollowUpFormValues>,
): Set<string> {
  const ids = new Set<string>();

  for (const entries of Object.values(followUpsByPatient)) {
    for (const entry of entries) {
      for (const exam of entry.supportingExams ?? []) {
        if (exam.attachmentId) {
          ids.add(exam.attachmentId);
        }
      }
    }
  }

  for (const draft of Object.values(followUpDrafts)) {
    for (const exam of draft.supportingExams) {
      if (exam.attachmentId) {
        ids.add(exam.attachmentId);
      }
    }
  }

  return ids;
}

async function buildBackupAttachments(
  followUpsByPatient: Record<string, FollowUpEntry[]>,
  followUpDrafts: Record<string, FollowUpFormValues>,
): Promise<BackupAttachment[]> {
  const attachments: BackupAttachment[] = [];
  const attachmentIds = collectAttachmentIds(
    followUpsByPatient,
    followUpDrafts,
  );

  for (const id of attachmentIds) {
    const stored = await getStoredAttachment(id);

    if (!stored) {
      throw new Error(
        "Lampiran " + id + " tidak ditemukan di penyimpanan browser.",
      );
    }

    if (stored.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(
        "Lampiran " + stored.name + " melebihi batas ukuran 2 MB.",
      );
    }

    attachments.push({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      size: stored.size,
      dataBase64: await blobToBase64(stored.blob),
    });
  }

  return attachments;
}

export function buildBackupPayload(
  patients: PatientListItem[],
  options: { slaberanTemplates?: SlaberanTemplateRecord[] } = {},
): BackupPayload {
  const savedFollowUps = loadSavedFollowUps();
  const followUpsByPatient: Record<string, FollowUpEntry[]> = {};
  const followUpDrafts: Record<string, FollowUpFormValues> = {};

  for (const patient of patients) {
    followUpsByPatient[patient.id] = mergeFollowUps(
      patient.id,
      savedFollowUps,
    );

    const draft = loadFollowUpDraft(patient.id);
    if (draft) {
      followUpDrafts[patient.id] = draft;
    }
  }

  return {
    schemaVersion: 2,
    product: "RekamMedisku",
    exportedAt: new Date().toISOString(),
    patients,
    followUpsByPatient,
    followUpDrafts,
    attachments: undefined,
    rotations: loadRotations(),
    activeRotationId: loadActiveRotationId(),
    slaberanLocations: loadSlaberanLocations(),
    slaberanTemplates: options.slaberanTemplates ?? [],
  };
}

export async function buildBackupPayloadWithAttachments(
  patients: PatientListItem[],
  slaberanTemplates: SlaberanTemplateRecord[] = [],
): Promise<BackupPayload> {
  const payload = buildBackupPayload(patients, { slaberanTemplates });
  const attachments = await buildBackupAttachments(
    payload.followUpsByPatient,
    payload.followUpDrafts,
  );

  return {
    ...payload,
    attachments,
  };
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFollowUpStatus(value: unknown): value is FollowUpEntry["status"] {
  return value === "Tersimpan" || value === "Draf";
}

function isTemplateType(
  value: unknown,
): value is FollowUpEntry["templateType"] {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isSupportingExam(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const validIcon =
    value.icon === "lab" ||
    value.icon === "scan" ||
    value.icon === "image" ||
    value.icon === "eeg";

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.examType === undefined || typeof value.examType === "string") &&
    typeof value.date === "string" &&
    (value.result === undefined || typeof value.result === "string") &&
    (value.attachmentName === undefined ||
      typeof value.attachmentName === "string") &&
    (value.attachmentId === undefined ||
      (typeof value.attachmentId === "string" &&
        value.attachmentId.trim().length > 0)) &&
    (value.attachmentType === undefined ||
      typeof value.attachmentType === "string") &&
    (value.attachmentSize === undefined ||
      (typeof value.attachmentSize === "number" &&
        Number.isFinite(value.attachmentSize) &&
        value.attachmentSize >= 0)) &&
    (value.attachmentDataUrl === undefined ||
      (typeof value.attachmentDataUrl === "string" &&
        (value.attachmentDataUrl.startsWith("data:image/") ||
          value.attachmentDataUrl.startsWith("data:application/pdf")))) &&
    validIcon
  );
}


function isFollowUp(value: unknown): value is FollowUpEntry {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.number === "number" &&
    Number.isInteger(value.number) &&
    value.number >= 0 &&
    typeof value.date === "string" &&
    typeof value.isoDate === "string" &&
    isValidIsoDate(value.isoDate) &&
    typeof value.time === "string" &&
    isValidDisplayTime(value.time) &&
    isFollowUpStatus(value.status) &&
    isTemplateType(value.templateType) &&
    typeof value.subjective === "string" &&
    typeof value.objective === "string" &&
    typeof value.assessment === "string" &&
    typeof value.plan === "string" &&
    typeof value.summary === "string" &&
    (value.assessmentCodes === undefined || Array.isArray(value.assessmentCodes)) &&
    (value.planning === undefined || typeof value.planning === "string") &&
    (value.instruction === undefined || typeof value.instruction === "string") &&
    (value.supportingExams === undefined ||
      (Array.isArray(value.supportingExams) &&
        value.supportingExams.every(isSupportingExam)))
  );
}

function normalizePatient(value: unknown): PatientListItem | null {
  if (!isRecord(value)) return null;

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.rm !== "string" ||
    typeof value.status !== "string" ||
    typeof value.age !== "number" ||
    typeof value.gender !== "string" ||
    typeof value.room !== "string" ||
    typeof value.bed !== "string" ||
    typeof value.doctor !== "string"
  ) {
    return null;
  }

  if (value.status !== "Aktif" && value.status !== "Diarsipkan") {
    return null;
  }

  if (value.gender !== "Laki-laki" && value.gender !== "Perempuan") {
    return null;
  }

  if (
    value.lastFollowUpAt !== undefined &&
    (typeof value.lastFollowUpAt !== "string" ||
      !isValidIsoDateTime(value.lastFollowUpAt))
  ) {
    return null;
  }

  if (
    value.createdAt !== undefined &&
    (typeof value.createdAt !== "string" ||
      !isValidIsoDateTime(value.createdAt))
  ) {
    return null;
  }

  if (
    value.admissionDate !== undefined &&
    (typeof value.admissionDate !== "string" ||
      !isValidIsoDate(value.admissionDate))
  ) {
    return null;
  }

  const rotationId =
    typeof value.rotationId === "string" && value.rotationId.trim()
      ? value.rotationId
      : null;

  if (!rotationId) {
    return null;
  }

  const followUpNumber =
    typeof value.followUpNumber === "number" &&
    Number.isInteger(value.followUpNumber) &&
    value.followUpNumber >= 0
      ? value.followUpNumber
      : 0;

  const currentLocation = normalizePatientLocation(
    isRecord(value.currentLocation)
      ? {
          type:
            value.currentLocation.type === "special"
              ? "special"
              : value.currentLocation.type === "ward"
                ? "ward"
                : undefined,
          name:
            typeof value.currentLocation.name === "string"
              ? value.currentLocation.name
              : undefined,
          bed:
            typeof value.currentLocation.bed === "string"
              ? value.currentLocation.bed
              : undefined,
        }
      : undefined,
    value.room,
    value.bed,
  );

  const admissionLocation = normalizePatientAdmissionLocation(
    isRecord(value.admissionLocation)
      ? {
          type:
            value.admissionLocation.type === "special"
              ? "special"
              : "ward",
          name:
            typeof value.admissionLocation.name === "string"
              ? value.admissionLocation.name
              : "",
        }
      : undefined,
  );

  return {
    id: value.id,
    rotationId,
    name: value.name,
    age: value.age,
    gender: value.gender,
    rm: value.rm,
    room: currentLocation.name,
    currentLocation,
    admissionLocation,
    bed: currentLocation.bed,
    doctor: value.doctor,
    lastFollowUp:
      typeof value.lastFollowUp === "string"
        ? value.lastFollowUp
        : "Belum ada follow-up",
    followUpNumber,
    lastFollowUpAt:
      typeof value.lastFollowUpAt === "string"
        ? value.lastFollowUpAt
        : undefined,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    admissionDate:
      typeof value.admissionDate === "string" ? value.admissionDate : undefined,
    admissionComplaint:
      typeof value.admissionComplaint === "string"
        ? value.admissionComplaint
        : undefined,
    status: value.status,
  };
}

function isRotation(value: unknown): value is Rotation {
  if (!isRecord(value)) return false;

  const specialties = [
    "Neurologi",
    "Ilmu Penyakit Dalam",
    "Bedah",
    "Pediatri",
    "Obgyn",
    "Lainnya",
  ];
  const statuses = ["Aktif", "Selesai", "Mendatang"];

  const validDates =
    typeof value.startDate === "string" &&
    isValidIsoDate(value.startDate) &&
    typeof value.endDate === "string" &&
    isValidIsoDate(value.endDate) &&
    new Date(value.startDate + "T00:00:00").getTime() <=
      new Date(value.endDate + "T00:00:00").getTime();

  const validTimestamps =
    typeof value.createdAt === "string" &&
    isValidIsoDateTime(value.createdAt) &&
    typeof value.updatedAt === "string" &&
    isValidIsoDateTime(value.updatedAt);

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    specialties.includes(value.specialty as string) &&
    validDates &&
    validTimestamps &&
    statuses.includes(value.status as string)
  );
}

function validateFollowUpMap(
  value: unknown,
  patientIds: Set<string>,
): value is Record<string, FollowUpEntry[]> {
  if (!isRecord(value)) return false;

  const allEntryIds = new Set<string>();

  for (const [patientId, entries] of Object.entries(value)) {
    if (!patientIds.has(patientId) || !Array.isArray(entries)) return false;

    const seen = new Set<string>();
    const seenNumbers = new Set<number>();
    for (const entry of entries) {
      if (
        !isFollowUp(entry) ||
        seen.has(entry.id) ||
        allEntryIds.has(entry.id) ||
        entry.number <= 0 ||
        seenNumbers.has(entry.number)
      ) {
        return false;
      }
      seen.add(entry.id);
      allEntryIds.add(entry.id);
      seenNumbers.add(entry.number);

      if (
        !isValidIsoDate(entry.isoDate) ||
        !isValidDisplayTime(entry.time)
      ) {
        return false;
      }

      if (entry.assessmentCodes && !entry.assessmentCodes.every((code) => typeof code === "string")) {
        return false;
      }
    }
  }

  return true;
}

function isSupportingExamForm(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.examType === "string" &&
    typeof value.date === "string" &&
    isValidIsoDate(value.date) &&
    typeof value.result === "string" &&
    typeof value.attachmentName === "string" &&
    (value.attachmentId === undefined ||
      (typeof value.attachmentId === "string" &&
        value.attachmentId.trim().length > 0)) &&
    (value.attachmentType === undefined ||
      typeof value.attachmentType === "string") &&
    (value.attachmentSize === undefined ||
      (typeof value.attachmentSize === "number" &&
        Number.isFinite(value.attachmentSize) &&
        value.attachmentSize >= 0)) &&
    (value.attachmentDataUrl === undefined ||
      (typeof value.attachmentDataUrl === "string" &&
        (value.attachmentDataUrl === "" ||
          value.attachmentDataUrl.startsWith("data:image/") ||
          value.attachmentDataUrl.startsWith("data:application/pdf"))))
  );
}

function isBackupAttachment(value: unknown): value is BackupAttachment {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.size === "number" &&
    Number.isInteger(value.size) &&
    value.size >= 0 &&
    value.size <= MAX_ATTACHMENT_SIZE &&
    typeof value.dataBase64 === "string" &&
    value.dataBase64.length % 4 === 0 &&
    BASE64_PATTERN.test(value.dataBase64)
  );
}


function isSlaberanLocation(value: unknown): value is SlaberanLocation {
  if (!isRecord(value)) return false;

  const validType =
    value.type === "floor" ||
    value.type === "ward" ||
    value.type === "special";

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    validType &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.sortOrder === "number" &&
    Number.isInteger(value.sortOrder) &&
    typeof value.isActive === "boolean" &&
    typeof value.createdAt === "string" &&
    isValidIsoDateTime(value.createdAt) &&
    typeof value.updatedAt === "string" &&
    isValidIsoDateTime(value.updatedAt) &&
    (value.parentId === undefined || typeof value.parentId === "string")
  );
}

function isSlaberanTemplateBlock(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const validType = [
    "opening",
    "header",
    "ward-summary",
    "patient-list",
    "special-unit-list",
    "summary",
    "divider",
    "text",
  ].includes(value.type as string);

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    validType &&
    typeof value.label === "string" &&
    typeof value.enabled === "boolean" &&
    isRecord(value.config)
  );
}

function isSlaberanTemplate(value: unknown): value is SlaberanTemplateRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.doctor === "string" &&
    typeof value.specialty === "string" &&
    typeof value.hospital === "string" &&
    typeof value.opening === "string" &&
    typeof value.showEmptyRooms === "boolean" &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isSlaberanTemplateBlock) &&
    isRecord(value.settings) &&
    typeof value.schemaVersion === "number" &&
    Number.isInteger(value.schemaVersion) &&
    value.schemaVersion > 0 &&
    typeof value.isDefault === "boolean" &&
    typeof value.createdAt === "string" &&
    isValidIsoDateTime(value.createdAt) &&
    typeof value.updatedAt === "string" &&
    isValidIsoDateTime(value.updatedAt)
  );
}

function validateSlaberanData(
  locationsValue: unknown,
  templatesValue: unknown,
): boolean {
  if (locationsValue !== undefined) {
    if (!Array.isArray(locationsValue)) return false;

    const ids = new Set<string>();
    for (const location of locationsValue) {
      if (!isSlaberanLocation(location) || ids.has(location.id)) {
        return false;
      }
      ids.add(location.id);
    }

    for (const location of locationsValue) {
      if (
        location.parentId !== undefined &&
        location.parentId !== "" &&
        !ids.has(location.parentId)
      ) {
        return false;
      }
    }
  }

  if (templatesValue !== undefined) {
    if (!Array.isArray(templatesValue)) return false;

    const ids = new Set<string>();
    let defaultCount = 0;

    for (const template of templatesValue) {
      if (!isSlaberanTemplate(template) || ids.has(template.id)) {
        return false;
      }
      ids.add(template.id);
      if (template.isDefault) defaultCount += 1;
    }

    if (defaultCount > 1) return false;
  }

  return true;
}

function validateAttachments(
  value: unknown,
  followUpsByPatient: Record<string, FollowUpEntry[]>,
  followUpDrafts: Record<string, FollowUpFormValues>,
): value is BackupAttachment[] | undefined {
  if (value === undefined) {
    return collectAttachmentIds(followUpsByPatient, followUpDrafts).size === 0;
  }
  if (!Array.isArray(value)) return false;

  const attachmentIds = new Set<string>();
  for (const attachment of value) {
    if (!isBackupAttachment(attachment) || attachmentIds.has(attachment.id)) {
      return false;
    }
    attachmentIds.add(attachment.id);
  }

  for (const id of collectAttachmentIds(followUpsByPatient, followUpDrafts)) {
    if (!attachmentIds.has(id)) {
      return false;
    }
  }

  return true;
}

function validateDraftMap(
  value: unknown,
  patients: PatientListItem[],
): value is Record<string, FollowUpFormValues> {
  if (!isRecord(value)) return false;

  const patientIds = new Set(patients.map((patient) => patient.id));
  const rotationIdsByPatient = new Map(
    patients.map((patient) => [patient.id, patient.rotationId]),
  );

  for (const [patientId, draft] of Object.entries(value)) {
    if (!patientIds.has(patientId) || !isRecord(draft)) return false;

    if (
      draft.rotationId !== undefined &&
      (typeof draft.rotationId !== "string" ||
        draft.rotationId !== rotationIdsByPatient.get(patientId))
    ) {
      return false;
    }
    if (
      typeof draft.followUpDate !== "string" ||
      typeof draft.followUpTime !== "string" ||
      !isRecord(draft.subjective) ||
      !isRecord(draft.objective) ||
      !isRecord(draft.neurology) ||
      (draft.internalMedicine !== undefined &&
        !isRecord(draft.internalMedicine)) ||
      !Array.isArray(draft.supportingExams) ||
      !Array.isArray(draft.assessments) ||
      !Array.isArray(draft.assessmentCodes) ||
      typeof draft.planning !== "string" ||
      typeof draft.instruction !== "string"
    ) {
      return false;
    }

    if (!draft.assessments.every((item) => typeof item === "string")) {
      return false;
    }
    if (!draft.assessmentCodes.every((item) => typeof item === "string")) {
      return false;
    }

    if (!draft.supportingExams.every(isSupportingExamForm)) {
      return false;
    }

    if (!isValidIsoDate(draft.followUpDate)) {
      return false;
    }
    if (!isValidTimeInput(draft.followUpTime)) {
      return false;
    }
  }

  return true;
}

export function parseBackupText(
  text: string,
): { ok: true; data: BackupPayload } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text) as Partial<BackupPayload>;

    if (parsed.product !== "RekamMedisku") {
      return { ok: false, error: "File bukan backup RekamMedisku yang valid." };
    }

    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
      return {
        ok: false,
        error: "Versi backup tidak didukung oleh MVP saat ini.",
      };
    }

    if (!Array.isArray(parsed.patients)) {
      return { ok: false, error: "Struktur data pasien tidak valid." };
    }

    const patients = parsed.patients
      .map(normalizePatient)
      .filter((patient): patient is PatientListItem => patient !== null);

    if (patients.length !== parsed.patients.length) {
      return { ok: false, error: "Ada data pasien yang tidak lengkap atau tidak valid." };
    }

    const patientIds = new Set(patients.map((patient) => patient.id));
    if (patientIds.size !== patients.length) {
      return { ok: false, error: "Backup memiliki ID pasien yang duplikat." };
    }

    if (!validateFollowUpMap(parsed.followUpsByPatient, patientIds)) {
      return { ok: false, error: "Struktur data follow-up tidak valid." };
    }

    if (!validateDraftMap(parsed.followUpDrafts, patients)) {
      return {
        ok: false,
        error: "Struktur data draf atau konteks stase tidak valid.",
      };
    }

    if (
      !validateSlaberanData(parsed.slaberanLocations, parsed.slaberanTemplates)
    ) {
      return {
        ok: false,
        error: "Struktur data Slaberan pada backup tidak valid.",
      };
    }

    if (
      parsed.exportedAt !== undefined &&
      (typeof parsed.exportedAt !== "string" ||
        !isValidIsoDateTime(parsed.exportedAt))
    ) {
      return { ok: false, error: "Tanggal ekspor backup tidak valid." };
    }

    if (
      !validateAttachments(
        parsed.attachments,
        parsed.followUpsByPatient,
        parsed.followUpDrafts,
      )
    ) {
      return {
        ok: false,
        error: "Struktur data lampiran tidak valid atau tidak lengkap.",
      };
    }

    let rotations: Rotation[] | undefined;
    if (parsed.rotations !== undefined) {
      if (!Array.isArray(parsed.rotations) || !parsed.rotations.every(isRotation)) {
        return { ok: false, error: "Struktur data stase tidak valid." };
      }

      const rotationIds = new Set(parsed.rotations.map((rotation) => rotation.id));
      if (rotationIds.size !== parsed.rotations.length) {
        return { ok: false, error: "Backup memiliki ID stase yang duplikat." };
      }

      const activeRotations = parsed.rotations.filter(
        (rotation) => rotation.status === "Aktif",
      );

      if (activeRotations.length > 1) {
        return {
          ok: false,
          error: "Backup tidak boleh memiliki lebih dari satu stase Aktif.",
        };
      }

      if (
        parsed.activeRotationId !== undefined &&
        !rotationIds.has(parsed.activeRotationId)
      ) {
        return { ok: false, error: "Stase aktif pada backup tidak ditemukan." };
      }

      if (
        parsed.activeRotationId !== undefined &&
        parsed.rotations.find((rotation) => rotation.id === parsed.activeRotationId)
          ?.status !== "Aktif"
      ) {
        return {
          ok: false,
          error: "Stase aktif pada backup harus berstatus Aktif.",
        };
      }

      for (const patient of patients) {
        if (!rotationIds.has(patient.rotationId)) {
          return {
            ok: false,
            error: "Ada pasien yang merujuk ke stase yang tidak ada di backup.",
          };
        }
      }

      rotations = parsed.rotations;
    }

    return {
      ok: true,
      data: {
        schemaVersion: parsed.schemaVersion,
        product: "RekamMedisku",
        exportedAt:
          typeof parsed.exportedAt === "string"
            ? parsed.exportedAt
            : new Date().toISOString(),
        patients,
        followUpsByPatient: parsed.followUpsByPatient,
        followUpDrafts: parsed.followUpDrafts,
        attachments: parsed.attachments,
        rotations,
        activeRotationId:
          typeof parsed.activeRotationId === "string"
            ? parsed.activeRotationId
            : undefined,
        slaberanLocations: parsed.slaberanLocations,
        slaberanTemplates: parsed.slaberanTemplates,
      },
    };
  } catch {
    return { ok: false, error: "File JSON tidak dapat dibaca." };
  }
}

export type RestoreBackupLocalState = {
  loadPatients: typeof loadPatients;
  replacePatients: typeof replacePatients;
  loadSavedFollowUps: typeof loadSavedFollowUps;
  replaceSavedFollowUps: typeof replaceSavedFollowUps;
  loadRotations: typeof loadRotations;
  saveRotations: typeof saveRotations;
  loadActiveRotationId: typeof loadActiveRotationId;
  setActiveRotationId: typeof setActiveRotationId;
  loadFollowUpDraft: typeof loadFollowUpDraft;
  saveFollowUpDraft: typeof saveFollowUpDraft;
  clearAllFollowUpDrafts: typeof clearAllFollowUpDrafts;
  loadAllAttachments: typeof loadAllAttachments;
  replaceAllAttachments: typeof replaceAllAttachments;
  loadSlaberanLocations: typeof loadSlaberanLocations;
  replaceSlaberanLocations: typeof replaceSlaberanLocations;
};

const defaultRestoreLocalState: RestoreBackupLocalState = {
  loadPatients,
  replacePatients,
  loadSavedFollowUps,
  replaceSavedFollowUps,
  loadRotations,
  saveRotations,
  loadActiveRotationId,
  setActiveRotationId,
  loadFollowUpDraft,
  saveFollowUpDraft,
  clearAllFollowUpDrafts,
  loadAllAttachments,
  replaceAllAttachments,
  loadSlaberanLocations,
  replaceSlaberanLocations,
};

export type RestoreBackupOptions = {
  persistRemote: (payload: BackupPayload) => Promise<unknown>;
  syncRemote: () => Promise<unknown>;
  localState?: RestoreBackupLocalState;
};

export type RestoreBackupResult = {
  patientCount: number;
  followUpCount: number;
  draftCount: number;
  attachmentCount: number;
  syncStatus: "synced" | "partial";
};

export async function restoreBackupPayload(
  payload: BackupPayload,
  options: RestoreBackupOptions,
): Promise<RestoreBackupResult> {
  if (!payload.rotations) {
    throw new Error(
      "Backup tanpa data stase tidak dapat dipulihkan ke workspace cloud. Buat backup baru terlebih dahulu.",
    );
  }

  const local = options.localState ?? defaultRestoreLocalState;
  const previousPatients = local.loadPatients();
  const previousFollowUps = local.loadSavedFollowUps();
  const previousRotations = local.loadRotations();
  const previousActiveRotationId = local.loadActiveRotationId();
  const previousSlaberanLocations = local.loadSlaberanLocations();
  const previousDrafts: Record<string, FollowUpFormValues> = {};
  const shouldReplaceAttachments = payload.attachments !== undefined;
  const previousAttachments = shouldReplaceAttachments
    ? await local.loadAllAttachments()
    : [];

  for (const patient of previousPatients) {
    const draft = local.loadFollowUpDraft(patient.id);
    if (draft) {
      previousDrafts[patient.id] = draft;
    }
  }

  const restoredAttachments: StoredAttachment[] = [];

  if (shouldReplaceAttachments) {
    for (const attachment of payload.attachments ?? []) {
      const blob = base64ToBlob(attachment.dataBase64, attachment.type);

      if (blob.size !== attachment.size) {
        throw new Error(
          "Ukuran lampiran " + attachment.name + " tidak cocok dengan backup.",
        );
      }

      restoredAttachments.push({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        blob,
      });
    }
  }

  let remoteRestored = false;

  try {
    // Prepare the browser copy before changing the cloud snapshot. This makes
    // a browser storage failure recoverable without leaving cloud data pointing
    // at attachments that were never restored locally.
    if (shouldReplaceAttachments) {
      await local.replaceAllAttachments(restoredAttachments);
    }

    local.replacePatients(payload.patients);
    local.replaceSavedFollowUps(payload.followUpsByPatient);
    local.saveRotations(payload.rotations);
    if (payload.slaberanLocations !== undefined) {
      local.replaceSlaberanLocations(payload.slaberanLocations);
    }
    local.setActiveRotationId(payload.activeRotationId ?? "");

    local.clearAllFollowUpDrafts();

    for (const [patientId, draft] of Object.entries(payload.followUpDrafts)) {
      local.saveFollowUpDraft(patientId, draft);
    }

    // Replace the synced cloud snapshot only after the local snapshot is ready.
    await options.persistRemote(payload);
    remoteRestored = true;

    // Reconcile from the authoritative cloud snapshot. A failure here means
    // the cloud restore already committed, so the restored local snapshot must
    // stay in place instead of rolling back to pre-restore data.
    await options.syncRemote();

    return {
      patientCount: payload.patients.length,
      followUpCount: Object.values(payload.followUpsByPatient).reduce(
        (total, entries) => total + entries.length,
        0,
      ),
      draftCount: Object.keys(payload.followUpDrafts).length,
      attachmentCount: payload.attachments?.length ?? 0,
      syncStatus: "synced",
    };
  } catch (error) {
    if (
      remoteRestored ||
      (typeof error === "object" &&
        error !== null &&
        "remoteCommitted" in error &&
        (error as { remoteCommitted?: unknown }).remoteCommitted === true)
    ) {
      remoteRestored = true;
      // Cloud is already authoritative. Keep the restored local snapshot and
      // surface this as a partial success so the UI does not claim nothing
      // changed. The next explicit/realtime/polling sync can reconcile again.
      return {
        patientCount: payload.patients.length,
        followUpCount: Object.values(payload.followUpsByPatient).reduce(
          (total, entries) => total + entries.length,
          0,
        ),
        draftCount: Object.keys(payload.followUpDrafts).length,
        attachmentCount: payload.attachments?.length ?? 0,
        syncStatus: "partial",
      };
    }

    try {
      if (shouldReplaceAttachments) {
        await local.replaceAllAttachments(previousAttachments);
      }

      local.replacePatients(previousPatients);
      local.replaceSavedFollowUps(previousFollowUps);
      local.saveRotations(previousRotations);
      local.setActiveRotationId(previousActiveRotationId);
      if (payload.slaberanLocations !== undefined) {
        local.replaceSlaberanLocations(previousSlaberanLocations);
      }
      local.clearAllFollowUpDrafts();

      for (const [patientId, draft] of Object.entries(previousDrafts)) {
        local.saveFollowUpDraft(patientId, draft);
      }
    } catch {
      // Preserve the original restore error when local rollback fails.
    }

    throw error;
  }
}

export function triggerJsonDownload(
  content: string,
  fileName: string,
): number {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });

  if (blob.size > MAX_BACKUP_FILE_SIZE_BYTES) {
    throw new Error("Ukuran backup melebihi batas 25 MB.");
  }

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);

  return blob.size;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function formatBackupDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function getPatientRotation(rotationId: string): string {
  const rotations = loadRotations();
  return (
    rotations.find((rotation) => rotation.id === rotationId)?.name ??
    "Stase tidak ditemukan"
  );
}
