import type { BackupPayload } from "../types/backup";
import { supabase } from "../utils/supabase";
import { uploadBackupAttachmentsWithSupabase } from "./supabaseAttachments";

const ROTATION_ID_MAP_KEY = "rekammedisku:supabase-rotation-ids";
const PATIENT_ID_MAP_KEY = "rekammedisku:supabase-patient-ids";
const FOLLOW_UP_ID_MAP_KEY = "rekammedisku:supabase-follow-up-ids";
const SUPPORTING_EXAM_ID_MAP_KEY =
  "rekammedisku:supabase-supporting-exam-ids";

type RestoreWorkspaceResult = {
  rotationIds: Record<string, string>;
  patientIds: Record<string, string>;
  followUpIds: Record<string, string>;
  supportingExamIds: Record<string, string>;
  activeRotationId: string | null;
  rotationCount: number;
  patientCount: number;
  followUpCount: number;
  supportingExamCount: number;
};

function isStringMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (remoteId) => typeof remoteId === "string" && remoteId.length > 0,
  );
}

function getSupabaseErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
    };

    if (candidate.code === "PGRST202") {
      return "Fitur restore cloud belum aktif di Supabase. Jalankan migration P1 workspace safety terlebih dahulu.";
    }

    if (typeof candidate.message === "string" && candidate.message) {
      return candidate.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Restore workspace ke Supabase gagal.";
}

function saveIdMap(key: string, value: Record<string, string>) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function validateRestoreResult(data: unknown): RestoreWorkspaceResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Respons restore workspace dari Supabase tidak valid.");
  }

  const result = data as Partial<RestoreWorkspaceResult>;

  if (
    !isStringMap(result.rotationIds) ||
    !isStringMap(result.patientIds) ||
    !isStringMap(result.followUpIds) ||
    !isStringMap(result.supportingExamIds) ||
    (result.activeRotationId !== null &&
      typeof result.activeRotationId !== "string")
  ) {
    throw new Error("Pemetaan ID hasil restore dari Supabase tidak valid.");
  }

  return {
    rotationIds: result.rotationIds,
    patientIds: result.patientIds,
    followUpIds: result.followUpIds,
    supportingExamIds: result.supportingExamIds,
    activeRotationId: result.activeRotationId ?? null,
    rotationCount:
      typeof result.rotationCount === "number" ? result.rotationCount : 0,
    patientCount:
      typeof result.patientCount === "number" ? result.patientCount : 0,
    followUpCount:
      typeof result.followUpCount === "number" ? result.followUpCount : 0,
    supportingExamCount:
      typeof result.supportingExamCount === "number"
        ? result.supportingExamCount
        : 0,
  };
}

export async function restoreWorkspaceBackupWithSupabase(
  payload: BackupPayload,
): Promise<RestoreWorkspaceResult> {
  if (!payload.rotations) {
    throw new Error(
      "Backup versi lama tanpa data stase tidak dapat dipulihkan ke workspace cloud. Buat backup baru terlebih dahulu.",
    );
  }

  const cloudPayload = {
    schemaVersion: payload.schemaVersion,
    product: payload.product,
    exportedAt: payload.exportedAt,
    patients: payload.patients,
    followUpsByPatient: payload.followUpsByPatient,
    rotations: payload.rotations,
    activeRotationId: payload.activeRotationId ?? "",
  };

  // Upload binary attachments before replacing the cloud database snapshot.
  // The RPC only stores attachment metadata, so Storage must be populated first.
  await uploadBackupAttachmentsWithSupabase(payload.attachments);

  const { data, error } = await supabase.rpc("restore_workspace_backup", {
    p_backup: cloudPayload,
  });

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  const result = validateRestoreResult(data);

  // The RPC replaces the user's entire synced workspace in one transaction.
  // Refresh local ID maps immediately so any Realtime event can resolve remote
  // rows back to the IDs used by this backup.
  saveIdMap(ROTATION_ID_MAP_KEY, result.rotationIds);
  saveIdMap(PATIENT_ID_MAP_KEY, result.patientIds);
  saveIdMap(FOLLOW_UP_ID_MAP_KEY, result.followUpIds);
  saveIdMap(SUPPORTING_EXAM_ID_MAP_KEY, result.supportingExamIds);

  return result;
}
