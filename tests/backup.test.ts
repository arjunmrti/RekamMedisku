import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBackupText,
  restoreBackupPayload,
  serializeBackup,
  type RestoreBackupLocalState,
} from "../src/utils/backup";
import type { BackupPayload } from "../src/types/backup";
import type { FollowUpFormValues } from "../src/types/followUpForm";
import type { Rotation } from "../src/types/rotation";
import type { StoredAttachment } from "../src/data/localAttachments";
import type { PatientListItem } from "../src/types/patient";
import type { FollowUpEntry } from "../src/types/followUp";

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

const validRotation: Rotation = {
  id: "rotation-neurologi",
  name: "Neurologi",
  specialty: "Neurologi",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  status: "Aktif",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const secondRotation: Rotation = {
  ...validRotation,
  id: "rotation-ilmu-penyakit-dalam",
  name: "Ilmu Penyakit Dalam",
  specialty: "Ilmu Penyakit Dalam",
  status: "Selesai",
};

function withRotations(
  payload: BackupPayload = basePayload,
  rotations: Rotation[] = [validRotation],
): BackupPayload {
  return {
    ...payload,
    rotations,
    activeRotationId: rotations.find((rotation) => rotation.status === "Aktif")?.id,
  };
}

function createRestoreLocalState(
  initialPatients: PatientListItem[] = [{ ...patient, name: "Pasien Lama" }],
  initialRotations: Rotation[] = [secondRotation],
): {
  state: RestoreBackupLocalState;
  getSnapshot: () => {
    patients: PatientListItem[];
    followUps: Record<string, FollowUpEntry[]>;
    rotations: Rotation[];
    activeRotationId: string;
    drafts: Record<string, FollowUpFormValues>;
    attachments: StoredAttachment[];
  };
} {
  let patients = initialPatients;
  let followUps: Record<string, FollowUpEntry[]> = { [patient.id]: [] };
  let rotations = initialRotations;
  let activeRotationId = initialRotations.find(
    (rotation) => rotation.status === "Aktif",
  )?.id ?? "";
  let drafts: Record<string, FollowUpFormValues> = {};
  let attachments: StoredAttachment[] = [];

  const state: RestoreBackupLocalState = {
    loadPatients: () => patients,
    replacePatients: (value) => {
      patients = value;
    },
    loadSavedFollowUps: () => followUps,
    replaceSavedFollowUps: (value) => {
      followUps = value;
    },
    loadRotations: () => rotations,
    saveRotations: (value) => {
      rotations = value;
    },
    loadActiveRotationId: () => activeRotationId,
    setActiveRotationId: (value) => {
      activeRotationId = value;
    },
    loadFollowUpDraft: (patientId) => drafts[patientId] ?? null,
    saveFollowUpDraft: (patientId, value) => {
      drafts[patientId] = value;
    },
    clearAllFollowUpDrafts: () => {
      drafts = {};
    },
    loadAllAttachments: async () => attachments,
    replaceAllAttachments: async (value) => {
      attachments = value;
    },
  };

  return {
    state,
    getSnapshot: () => ({
      patients,
      followUps,
      rotations,
      activeRotationId,
      drafts,
      attachments,
    }),
  };
}

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

test("backup menolak ID pasien yang duplikat", () => {
  const payload: BackupPayload = {
    ...basePayload,
    patients: [
      patient,
      {
        ...patient,
        name: "Pasien Duplikat",
      },
    ],
    followUpsByPatient: {
      [patient.id]: [],
    },
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak ID stase yang duplikat", () => {
  const payload = withRotations(basePayload, [
    validRotation,
    { ...secondRotation, id: validRotation.id },
  ]);

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak lebih dari satu stase Aktif", () => {
  const payload = withRotations(basePayload, [
    validRotation,
    { ...secondRotation, status: "Aktif" },
  ]);

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak activeRotationId yang tidak menunjuk ke stase", () => {
  const payload = {
    ...withRotations(),
    activeRotationId: "rotation-tidak-ada",
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak activeRotationId yang menunjuk ke stase nonaktif", () => {
  const payload = {
    ...withRotations(basePayload, [validRotation, secondRotation]),
    activeRotationId: secondRotation.id,
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("backup menolak pasien yang merujuk ke stase yang tidak ada", () => {
  const payload = {
    ...withRotations(),
    patients: [
      {
        ...patient,
        rotationId: "rotation-tidak-ada",
      },
    ],
  };

  const result = parseBackupText(serializeBackup(payload));

  assert.equal(result.ok, false);
});

test("restore mempertahankan local baru ketika cloud sudah sukses tetapi sync gagal", async () => {
  const payload = withRotations({
    ...basePayload,
    patients: [{ ...patient, name: "Pasien Baru" }],
  });

  const { state, getSnapshot } = createRestoreLocalState();
  let persistCalls = 0;
  let syncCalls = 0;

  const result = await restoreBackupPayload(payload, {
    localState: state,
    persistRemote: async () => {
      persistCalls += 1;
    },
    syncRemote: async () => {
      syncCalls += 1;
      throw new Error("sync gagal");
    },
  });

  const snapshot = getSnapshot();

  assert.equal(result.syncStatus, "partial");
  assert.equal(persistCalls, 1);
  assert.equal(syncCalls, 1);
  assert.equal(snapshot.patients[0]?.name, "Pasien Baru");
  assert.equal(snapshot.rotations[0]?.id, validRotation.id);
  assert.equal(snapshot.activeRotationId, validRotation.id);
});

test("restore rollback local jika cloud restore gagal", async () => {
  const payload = withRotations({
    ...basePayload,
    patients: [{ ...patient, name: "Pasien Baru" }],
  });

  const { state, getSnapshot } = createRestoreLocalState();
  let syncCalls = 0;

  await assert.rejects(
    restoreBackupPayload(payload, {
      localState: state,
      persistRemote: async () => {
        throw new Error("restore cloud gagal");
      },
      syncRemote: async () => {
        syncCalls += 1;
      },
    }),
    /restore cloud gagal/,
  );

  const snapshot = getSnapshot();

  assert.equal(syncCalls, 0);
  assert.equal(snapshot.patients[0]?.name, "Pasien Lama");
  assert.equal(snapshot.rotations[0]?.id, secondRotation.id);
  assert.equal(snapshot.activeRotationId, "");
});

test("restore sukses melaporkan status synced setelah persist dan sync berhasil", async () => {
  const payload = withRotations({
    ...basePayload,
    patients: [{ ...patient, name: "Pasien Baru" }],
  });

  const { state, getSnapshot } = createRestoreLocalState();

  const result = await restoreBackupPayload(payload, {
    localState: state,
    persistRemote: async () => {},
    syncRemote: async () => {},
  });

  const snapshot = getSnapshot();

  assert.equal(result.syncStatus, "synced");
  assert.equal(snapshot.patients[0]?.name, "Pasien Baru");
  assert.equal(snapshot.rotations[0]?.id, validRotation.id);
});
