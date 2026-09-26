import test from "node:test";
import assert from "node:assert/strict";
import { parseBackupText, serializeBackup } from "../src/utils/backup";
import type { BackupPayload } from "../src/types/backup";

const patient = {
  id: "p-test",
  rotationId: "rotation-neurologi",
  name: "Pasien Uji",
  age: 30,
  gender: "Laki-laki" as const,
  rm: "RM-001",
  room: "3A",
  bed: "12",
  doctor: "dr. Uji",
  lastFollowUp: "Belum ada follow-up",
  followUpNumber: 0,
  status: "Aktif" as const,
};

const basePayload: BackupPayload = {
  schemaVersion: 1,
  product: "RekamMedisku",
  exportedAt: "2026-09-26T00:00:00.000Z",
  patients: [patient],
  followUpsByPatient: {
    [patient.id]: [],
  },
  followUpDrafts: {},
};

function withAttachment(
  attachmentId: string,
): BackupPayload {
  return {
    ...basePayload,
    followUpsByPatient: {
      [patient.id]: [
        {
          id: "fu-test",
          number: 1,
          date: "26 September 2026",
          isoDate: "2026-09-26",
          time: "09.30",
          status: "Tersimpan",
          subjective: "Keluhan",
          objective: "Objektif",
          assessment: "Assessment",
          plan: "Plan",
          summary: "Ringkasan",
          supportingExams: [
            {
              id: "exam-test",
              name: "CT Scan",
              examType: "CT Scan",
              date: "26 September 2026",
              result: "Normal",
              attachmentName: "scan.pdf",
              attachmentId,
              attachmentType: "application/pdf",
              attachmentSize: 3,
              icon: "scan",
            },
          ],
        },
      ],
    },
    attachments: [
      {
        id: attachmentId,
        name: "scan.pdf",
        type: "application/pdf",
        size: 3,
        dataBase64: "YWJj",
      },
    ],
  };
}

test("backup lama tanpa field attachments tetap valid", () => {
  const result = parseBackupText(serializeBackup(basePayload));

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.attachments, undefined);
});

test("backup baru membawa attachment IndexedDB yang direferensikan follow-up", () => {
  const result = parseBackupText(
    serializeBackup(withAttachment("att-test")),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.attachments?.length, 1);
  assert.equal(result.data.attachments?.[0]?.id, "att-test");
});

test("backup ditolak jika attachment yang direferensikan tidak ikut dibawa", () => {
  const payload = withAttachment("att-missing");
  payload.attachments = [];

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup ditolak jika Base64 attachment tidak valid", () => {
  const payload = withAttachment("att-invalid");
  payload.attachments![0].dataBase64 = "not-base64";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});
