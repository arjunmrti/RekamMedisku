import type { FollowUpEntry } from "./followUp";
import type { FollowUpFormValues } from "./followUpForm";
import type { PatientListItem } from "./patient";

export type BackupOperationType = "Export" | "Restore";
export type BackupOperationStatus = "Berhasil" | "Gagal";

export type BackupHistoryEntry = {
  id: string;
  timestamp: string;
  type: BackupOperationType;
  status: BackupOperationStatus;
  fileName: string;
  fileSizeBytes: number;
  note: string;
};

export type BackupPayload = {
  schemaVersion: 1;
  product: "RekamMedisku";
  exportedAt: string;
  patients: PatientListItem[];
  followUpsByPatient: Record<string, FollowUpEntry[]>;
  followUpDrafts: Record<string, FollowUpFormValues>;
};
