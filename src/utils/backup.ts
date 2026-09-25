import {
  clearAllFollowUpDrafts,
  loadFollowUpDraft,
  loadSavedFollowUps,
  saveFollowUpDraft,
  replaceSavedFollowUps,
} from "../data/localFollowUps";
import { loadPatients, replacePatients } from "../data/localPatients";
import {
  loadActiveRotationId,
  loadRotations,
  saveRotations,
  setActiveRotationId,
} from "../data/localRotations";
import type { BackupPayload } from "../types/backup";
import type { FollowUpEntry } from "../types/followUp";
import type { FollowUpFormValues } from "../types/followUpForm";
import type { PatientListItem } from "../types/patient";
import type { Rotation } from "../types/rotation";

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

export function buildBackupPayload(
  patients: PatientListItem[],
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
    schemaVersion: 1,
    product: "RekamMedisku",
    exportedAt: new Date().toISOString(),
    patients,
    followUpsByPatient,
    followUpDrafts,
    rotations: loadRotations(),
    activeRotationId: loadActiveRotationId(),
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
  return value === undefined || value === "Neurologi" || value === "Ilmu Penyakit Dalam";
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
    typeof value.time === "string" &&
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

  const rotationId =
    typeof value.rotationId === "string" && value.rotationId.trim()
      ? value.rotationId
      : "rotation-neurologi";

  const followUpNumber =
    typeof value.followUpNumber === "number" &&
    Number.isInteger(value.followUpNumber) &&
    value.followUpNumber >= 0
      ? value.followUpNumber
      : 0;

  return {
    id: value.id,
    rotationId,
    name: value.name,
    age: value.age,
    gender: value.gender,
    rm: value.rm,
    room: value.room,
    bed: value.bed,
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
    /^\d{4}-\d{2}-\d{2}$/.test(value.startDate) &&
    typeof value.endDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.endDate) &&
    new Date(value.startDate + "T00:00:00").getTime() <=
      new Date(value.endDate + "T00:00:00").getTime();

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    specialties.includes(value.specialty as string) &&
    validDates &&
    statuses.includes(value.status as string) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
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
    for (const entry of entries) {
      if (
        !isFollowUp(entry) ||
        seen.has(entry.id) ||
        allEntryIds.has(entry.id)
      ) {
        return false;
      }
      seen.add(entry.id);
      allEntryIds.add(entry.id);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.isoDate) ||
        entry.time.trim().length === 0
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
    typeof value.result === "string" &&
    typeof value.attachmentName === "string" &&
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

function validateDraftMap(
  value: unknown,
  patientIds: Set<string>,
): value is Record<string, FollowUpFormValues> {
  if (!isRecord(value)) return false;

  for (const [patientId, draft] of Object.entries(value)) {
    if (!patientIds.has(patientId) || !isRecord(draft)) return false;
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.followUpDate)) {
      return false;
    }
    if (!/^\d{2}:\d{2}$/.test(draft.followUpTime)) {
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

    if (parsed.schemaVersion !== 1) {
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

    if (!validateDraftMap(parsed.followUpDrafts, patientIds)) {
      return { ok: false, error: "Struktur data draf tidak valid." };
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
        schemaVersion: 1,
        product: "RekamMedisku",
        exportedAt:
          typeof parsed.exportedAt === "string"
            ? parsed.exportedAt
            : new Date().toISOString(),
        patients,
        followUpsByPatient: parsed.followUpsByPatient,
        followUpDrafts: parsed.followUpDrafts,
        rotations,
        activeRotationId:
          typeof parsed.activeRotationId === "string"
            ? parsed.activeRotationId
            : undefined,
      },
    };
  } catch {
    return { ok: false, error: "File JSON tidak dapat dibaca." };
  }
}

export function restoreBackupPayload(payload: BackupPayload) {
  const previousPatients = loadPatients();
  const previousFollowUps = loadSavedFollowUps();
  const previousRotations = loadRotations();
  const previousActiveRotationId = loadActiveRotationId();
  const previousDrafts: Record<string, FollowUpFormValues> = {};

  for (const patient of previousPatients) {
    const draft = loadFollowUpDraft(patient.id);
    if (draft) {
      previousDrafts[patient.id] = draft;
    }
  }

  try {
    replacePatients(payload.patients);
    replaceSavedFollowUps(payload.followUpsByPatient);

    if (payload.rotations && payload.rotations.length > 0) {
      saveRotations(payload.rotations);
      if (payload.activeRotationId) {
        setActiveRotationId(payload.activeRotationId);
      }
    }

    clearAllFollowUpDrafts();

    for (const [patientId, draft] of Object.entries(payload.followUpDrafts)) {
      saveFollowUpDraft(patientId, draft);
    }
  } catch (error) {
    try {
      replacePatients(previousPatients);
      replaceSavedFollowUps(previousFollowUps);
      saveRotations(previousRotations);
      setActiveRotationId(previousActiveRotationId);
      clearAllFollowUpDrafts();

      for (const [patientId, draft] of Object.entries(previousDrafts)) {
        saveFollowUpDraft(patientId, draft);
      }
    } catch {
      // Preserve the original restore error when rollback itself fails.
    }

    throw error;
  }

  return {
    patientCount: payload.patients.length,
    followUpCount: Object.values(payload.followUpsByPatient).reduce(
      (total, entries) => total + entries.length,
      0,
    ),
    draftCount: Object.keys(payload.followUpDrafts).length,
  };
}

export function triggerJsonDownload(
  content: string,
  fileName: string,
): number {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
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
