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

function withDraft(): BackupPayload {
  return {
    ...basePayload,
    followUpDrafts: {
      [patient.id]: {
        followUpDate: "2026-09-26",
        followUpTime: "09:30",
        subjective: {
          keluhan: "",
          riwayatKeluhanSerupa: "",
          pastHistory: "",
          medicationHistory: "",
          allergies: "",
          otherHistory: "",
        },
        objective: {
          generalCondition: "",
          systolic: "",
          diastolic: "",
          pulse: "",
          respiratoryRate: "",
          temperature: "",
          spo2: "",
          oxygenVia: "",
          painNrs: "",
          physicalFindings: "",
          supportingExamText: "",
        },
        neurology: {
          generalCondition: "",
          consciousness: "",
          gcsEye: "",
          gcsMotor: "",
          gcsVerbal: "",
          fkl: "",
          cranialNerve: "",
          pupil: "",
          neckStiffness: "",
          brudzinski: "",
          kernig: "",
          movement: "",
          tone: "",
          sensory: "",
          upperStrength: "",
          lowerStrength: "",
          physiologicReflex: "",
          pathologicReflex: "",
          autonomic: "",
          provocation: "",
        },
        internalMedicine: {
          generalCondition: "",
          consciousness: "",
          headNeck: "",
          thorax: "",
          abdomen: "",
          extremities: "",
          relevantSystemicFindings: "",
        },
        supportingExams: [],
        assessments: [""],
        assessmentCodes: [],
        planning: "",
        instruction: "",
      },
    },
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

test("backup lama tanpa attachment tetap ditolak jika masih mereferensikan attachment", () => {
  const payload = withAttachment("att-missing-legacy");
  payload.attachments = undefined;

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
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

test("backup menolak tanggal kalender follow-up yang tidak valid", () => {
  const payload = withAttachment("att-invalid-date");
  payload.followUpsByPatient[patient.id][0].isoDate = "2026-02-30";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak jam follow-up yang tidak valid", () => {
  const payload = withAttachment("att-invalid-time");
  payload.followUpsByPatient[patient.id][0].time = "24.61";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak tanggal draf yang tidak valid", () => {
  const payload = withDraft();
  payload.followUpDrafts[patient.id].followUpDate = "2026-04-31";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak jam draf yang tidak valid", () => {
  const payload = withDraft();
  payload.followUpDrafts[patient.id].followUpTime = "12:60";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});


test("backup menolak draf yang berasal dari stase lain", () => {
  const payload = withDraft();
  payload.followUpDrafts[patient.id].rotationId = "rotation-ilmu-penyakit-dalam";

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak pasien tanpa rotationId", () => {
  const payload: BackupPayload = {
    ...basePayload,
    patients: [{ ...patient, rotationId: "" }],
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak admissionDate pasien yang tidak valid", () => {
  const payload: BackupPayload = {
    ...basePayload,
    patients: [{ ...patient, admissionDate: "2026-02-30" }],
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak timestamp ekspor yang tidak valid", () => {
  const payload: BackupPayload = {
    ...basePayload,
    exportedAt: "2026-02-30T10:00:00.000Z",
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});
