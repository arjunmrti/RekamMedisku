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
import type {
  BackupAttachment,
  BackupPayload,
} from "../types/backup";
import type { FollowUpEntry } from "../types/followUp";
import type { FollowUpFormValues } from "../types/followUpForm";
import type { PatientListItem } from "../types/patient";
import type { Rotation } from "../types/rotation";
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
    attachments: undefined,
    rotations: loadRotations(),
    activeRotationId: loadActiveRotationId(),
  };
}

export async function buildBackupPayloadWithAttachments(
  patients: PatientListItem[],
): Promise<BackupPayload> {
  const payload = buildBackupPayload(patients);
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

    if (!validateDraftMap(parsed.followUpDrafts, patients)) {
      return {
        ok: false,
        error: "Struktur data draf atau konteks stase tidak valid.",
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
        schemaVersion: 1,
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
      },
    };
  } catch {
    return { ok: false, error: "File JSON tidak dapat dibaca." };
  }
}

export type RestoreBackupOptions = {
  persistRemote: (payload: BackupPayload) => Promise<unknown>;
  syncRemote: () => Promise<unknown>;
};

export async function restoreBackupPayload(
  payload: BackupPayload,
  options: RestoreBackupOptions,
) {
  if (!payload.rotations) {
    throw new Error(
      "Backup tanpa data stase tidak dapat dipulihkan ke workspace cloud. Buat backup baru terlebih dahulu.",
    );
  }

  const previousPatients = loadPatients();
  const previousFollowUps = loadSavedFollowUps();
  const previousRotations = loadRotations();
  const previousActiveRotationId = loadActiveRotationId();
  const previousDrafts: Record<string, FollowUpFormValues> = {};
  const shouldReplaceAttachments = payload.attachments !== undefined;
  const previousAttachments = shouldReplaceAttachments
    ? await loadAllAttachments()
    : [];

  for (const patient of previousPatients) {
    const draft = loadFollowUpDraft(patient.id);
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
      await replaceAllAttachments(restoredAttachments);
    }

    replacePatients(payload.patients);
    replaceSavedFollowUps(payload.followUpsByPatient);
    saveRotations(payload.rotations);
    setActiveRotationId(payload.activeRotationId ?? "");

    clearAllFollowUpDrafts();

    for (const [patientId, draft] of Object.entries(payload.followUpDrafts)) {
      saveFollowUpDraft(patientId, draft);
    }

    // Now replace the synced cloud snapshot atomically.
    await options.persistRemote(payload);
    remoteRestored = true;

    // Reconcile local derived fields and notify the rest of the app from the
    // authoritative cloud snapshot before returning success.
    await options.syncRemote();
  } catch (error) {
    try {
      if (shouldReplaceAttachments) {
        await replaceAllAttachments(previousAttachments);
      }

      replacePatients(previousPatients);
      replaceSavedFollowUps(previousFollowUps);
      saveRotations(previousRotations);
      setActiveRotationId(previousActiveRotationId);
      clearAllFollowUpDrafts();

      for (const [patientId, draft] of Object.entries(previousDrafts)) {
        saveFollowUpDraft(patientId, draft);
      }

      // Supabase remains the source of truth when its atomic restore succeeded.
      // A sync here repairs local state if a browser-local write or refresh failed.
      if (remoteRestored) {
        await options.syncRemote();
      }
    } catch {
      // Preserve the original restore error when local rollback/reconciliation fails.
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
    attachmentCount: payload.attachments?.length ?? 0,
  };
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
