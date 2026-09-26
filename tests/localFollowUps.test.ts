import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteFollowUpsForPatient,
  getOtherPatientFollowUpAttachmentIds,
  getPatientFollowUpAttachmentIds,
} from "../src/data/localFollowUps";

class MemoryStorage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
    Object.defineProperty(this, key, {
      configurable: true,
      enumerable: true,
      value: String(value),
      writable: true,
    });
  }

  removeItem(key: string) {
    this.values.delete(key);
    delete (this as Record<string, unknown>)[key];
  }

  clear() {
    for (const key of [...this.values.keys()]) {
      this.removeItem(key);
    }
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
  },
});

function followUpWithAttachment(id: string, attachmentId: string) {
  return {
    id,
    number: 1,
    date: "26 September 2026",
    isoDate: "2026-09-26",
    time: "09.00",
    status: "Tersimpan" as const,
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    summary: "",
    supportingExams: [
      {
        id: "exam-" + id,
        name: "CT Scan",
        date: "26 September 2026",
        attachmentId,
        icon: "scan" as const,
      },
    ],
  };
}

function draftWithAttachment(attachmentId: string) {
  return {
    followUpDate: "2026-09-26",
    followUpTime: "09:00",
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
    supportingExams: [
      {
        id: "exam-draft",
        examType: "CT Scan",
        date: "2026-09-26",
        result: "",
        attachmentName: "scan.pdf",
        attachmentId,
      },
    ],
    assessments: [""],
    assessmentCodes: [],
    planning: "",
    instruction: "",
  };
}

test("attachment pasien menggabungkan follow-up dan draft tanpa duplikat", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:follow-ups",
    JSON.stringify({
      patient-a: [followUpWithAttachment("fu-a", "att-1")],
    }),
  );
  storage.setItem(
    "rekammedisku:follow-up-draft:patient-a",
    JSON.stringify(draftWithAttachment("att-1")),
  );

  assert.deepEqual(getPatientFollowUpAttachmentIds("patient-a"), ["att-1"]);
});

test("attachment yang masih direferensikan pasien lain tidak dianggap aman dihapus", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:follow-ups",
    JSON.stringify({
      patient-a: [followUpWithAttachment("fu-a", "att-shared")],
      patient-b: [followUpWithAttachment("fu-b", "att-shared")],
    }),
  );
  storage.setItem(
    "rekammedisku:follow-up-draft:patient-b",
    JSON.stringify(draftWithAttachment("att-draft-b")),
  );

  assert.deepEqual(
    [...getOtherPatientFollowUpAttachmentIds("patient-a")].sort(),
    ["att-draft-b", "att-shared"],
  );
});

test("penghapusan follow-up dan draft dapat di-rollback", () => {
  storage.clear();
  const originalFollowUps = {
    "patient-a": [followUpWithAttachment("fu-a", "att-1")],
    "patient-b": [followUpWithAttachment("fu-b", "att-2")],
  };
  const originalDraft = draftWithAttachment("att-draft");

  storage.setItem(
    "rekammedisku:follow-ups",
    JSON.stringify(originalFollowUps),
  );
  storage.setItem(
    "rekammedisku:follow-up-draft:patient-a",
    JSON.stringify(originalDraft),
  );

  const rollback = deleteFollowUpsForPatient("patient-a");

  const afterDelete = JSON.parse(
    storage.getItem("rekammedisku:follow-ups") ?? "{}",
  );
  assert.equal(afterDelete["patient-a"], undefined);
  assert.ok(afterDelete["patient-b"]);
  assert.equal(
    storage.getItem("rekammedisku:follow-up-draft:patient-a"),
    null,
  );

  rollback();

  assert.deepEqual(
    JSON.parse(storage.getItem("rekammedisku:follow-ups") ?? "{}"),
    originalFollowUps,
  );
  assert.deepEqual(
    JSON.parse(
      storage.getItem("rekammedisku:follow-up-draft:patient-a") ?? "{}",
    ),
    originalDraft,
  );
});
