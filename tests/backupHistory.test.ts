import test from "node:test";
import assert from "node:assert/strict";
import { isValidBackupHistoryEntry } from "../src/data/backupHistory";

const validEntry = {
  id: "backup-1",
  timestamp: "2026-09-27T00:00:00.000Z",
  type: "Export" as const,
  status: "Berhasil" as const,
  fileName: "rekammedisku-backup.json",
  fileSizeBytes: 1200,
  note: "Backup berhasil.",
};

test("backup history menerima entry valid", () => {
  assert.equal(isValidBackupHistoryEntry(validEntry), true);
});

test("backup history menolak status yang tidak dikenal", () => {
  assert.equal(
    isValidBackupHistoryEntry({
      ...validEntry,
      status: "UNKNOWN",
    }),
    false,
  );
});

test("backup history menolak ukuran file negatif atau pecahan", () => {
  assert.equal(
    isValidBackupHistoryEntry({
      ...validEntry,
      fileSizeBytes: -1,
    }),
    false,
  );
  assert.equal(
    isValidBackupHistoryEntry({
      ...validEntry,
      fileSizeBytes: 1.5,
    }),
    false,
  );
});

test("backup history menolak timestamp invalid", () => {
  assert.equal(
    isValidBackupHistoryEntry({
      ...validEntry,
      timestamp: "bukan-tanggal",
    }),
    false,
  );
});
