import type { FollowUpEntry } from "./followUp";
import type { FollowUpFormValues } from "./followUpForm";
import type { PatientListItem } from "./patient";
import type { Rotation } from "./rotation";
import type { SlaberanLocation } from "./slaberanLocation";
import type { SlaberanTemplateRecord } from "./slaberanTemplate";

export type BackupOperationType = "Export" | "Restore";
export type BackupOperationStatus = "Berhasil" | "Sebagian" | "Gagal";

export type BackupHistoryEntry = {
  id: string;
  timestamp: string;
  type: BackupOperationType;
  status: BackupOperationStatus;
  fileName: string;
  fileSizeBytes: number;
  note: string;
};

export type BackupAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataBase64: string;
};

export type BackupPayload = {
  schemaVersion: 1 | 2;
  product: "RekamMedisku";
  exportedAt: string;
  patients: PatientListItem[];
  followUpsByPatient: Record<string, FollowUpEntry[]>;
  followUpDrafts: Record<string, FollowUpFormValues>;
  /**
   * Optional so older MVP backups remain restorable.
   * New exports always include this field, even when empty.
   */
  attachments?: BackupAttachment[];
  rotations?: Rotation[];
  activeRotationId?: string;
  /** Optional in legacy v1 backups; always present in new v2 exports. */
  slaberanLocations?: SlaberanLocation[];
  /** Optional in legacy v1 backups; always present in new v2 exports. */
  slaberanTemplates?: SlaberanTemplateRecord[];
};
