import { workspaceStorageKey } from "./workspaceStorage";
import type {
  BackupHistoryEntry,
  BackupOperationStatus,
  BackupOperationType,
} from "../types/backup";

const HISTORY_KEY = "backup-history";
const SNAPSHOT_KEY = "backup-snapshot";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(workspaceStorageKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function isValidBackupHistoryEntry(
  entry: unknown,
): entry is BackupHistoryEntry {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return false;
  }

  const candidate = entry as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.timestamp === "string" &&
    !Number.isNaN(Date.parse(candidate.timestamp)) &&
    (candidate.type === "Export" || candidate.type === "Restore") &&
    (candidate.status === "Berhasil" ||
      candidate.status === "Sebagian" ||
      candidate.status === "Gagal") &&
    typeof candidate.fileName === "string" &&
    candidate.fileName.trim().length > 0 &&
    typeof candidate.fileSizeBytes === "number" &&
    Number.isSafeInteger(candidate.fileSizeBytes) &&
    candidate.fileSizeBytes >= 0 &&
    typeof candidate.note === "string"
  );
}

export function loadBackupHistory(): BackupHistoryEntry[] {
  const parsed = readJson<unknown>(HISTORY_KEY, null);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(isValidBackupHistoryEntry)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 30);
}

export function appendBackupHistory(entry: BackupHistoryEntry) {
  const current = loadBackupHistory();
  window.localStorage.setItem(
    workspaceStorageKey(HISTORY_KEY),
    JSON.stringify([entry, ...current].slice(0, 30)),
  );
}

export function saveBackupSnapshot(exportedAt: string) {
  window.localStorage.setItem(
    workspaceStorageKey(SNAPSHOT_KEY),
    JSON.stringify({ exportedAt }),
  );
}

export function createBackupHistoryEntry(
  type: BackupOperationType,
  status: BackupOperationStatus,
  fileName: string,
  fileSizeBytes: number,
  note: string,
): BackupHistoryEntry {
  return {
    id: "backup-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    type,
    status,
    fileName,
    fileSizeBytes,
    note,
  };
}

export function getLastSuccessfulBackup(): BackupHistoryEntry | null {
  return (
    loadBackupHistory().find(
      (entry) => entry.type === "Export" && entry.status === "Berhasil",
    ) ?? null
  );
}
