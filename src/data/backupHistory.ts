import type {
  BackupHistoryEntry,
  BackupOperationStatus,
  BackupOperationType,
} from "../types/backup";

const HISTORY_KEY = "rekammedisku:backup-history";
const SNAPSHOT_KEY = "rekammedisku:backup-snapshot";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadBackupHistory(): BackupHistoryEntry[] {
  const parsed = readJson<unknown>(HISTORY_KEY, null);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (entry): entry is BackupHistoryEntry =>
      typeof entry === "object" && entry !== null,
  ); 
}

export function appendBackupHistory(entry: BackupHistoryEntry) {
  const current = loadBackupHistory();
  window.localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([entry, ...current].slice(0, 30)),
  );
}

export function saveBackupSnapshot(exportedAt: string) {
  window.localStorage.setItem(
    SNAPSHOT_KEY,
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
