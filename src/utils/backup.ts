import {
  clearAllFollowUpDrafts,
  loadFollowUpDraft,
  loadSavedFollowUps,
  saveFollowUpDraft,
  replaceSavedFollowUps,
} from "../data/localFollowUps";
import { mockFollowUpsByPatient } from "../data/mockFollowUps";
import { replacePatients } from "../data/localPatients";
import type { BackupPayload } from "../types/backup";
import type { FollowUpEntry } from "../types/followUp";
import type { FollowUpFormValues } from "../types/followUpForm";
import type { PatientListItem } from "../types/patient";

function mergeFollowUps(
  patientId: string,
  saved: Record<string, FollowUpEntry[]>,
): FollowUpEntry[] {
  const merged = [
    ...(saved[patientId] ?? []),
    ...(mockFollowUpsByPatient[patientId] ?? []),
  ];
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
  };
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
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

    if (
      !parsed.followUpsByPatient ||
      typeof parsed.followUpsByPatient !== "object"
    ) {
      return { ok: false, error: "Struktur data follow-up tidak valid." };
    }

    if (
      !parsed.followUpDrafts ||
      typeof parsed.followUpDrafts !== "object"
    ) {
      return { ok: false, error: "Struktur data draf tidak valid." };
    }

    for (const patient of parsed.patients) {
      if (
        !patient ||
        typeof patient !== "object" ||
        typeof patient.id !== "string" ||
        typeof patient.name !== "string" ||
        typeof patient.rm !== "string" ||
        typeof patient.status !== "string"
      ) {
        return { ok: false, error: "Ada data pasien yang tidak lengkap." };
      }
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
        patients: parsed.patients as PatientListItem[],
        followUpsByPatient:
          parsed.followUpsByPatient as Record<string, FollowUpEntry[]>,
        followUpDrafts:
          parsed.followUpDrafts as Record<string, FollowUpFormValues>,
      },
    };
  } catch {
    return { ok: false, error: "File JSON tidak dapat dibaca." };
  }
}

export function restoreBackupPayload(payload: BackupPayload) {
  replacePatients(payload.patients);
  replaceSavedFollowUps(payload.followUpsByPatient);
  clearAllFollowUpDrafts();

  for (const [patientId, draft] of Object.entries(payload.followUpDrafts)) {
    saveFollowUpDraft(patientId, draft);
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

export function getPatientRotation(): "Neurologi" | "Ilmu Penyakit Dalam" {
  return "Neurologi";
}
