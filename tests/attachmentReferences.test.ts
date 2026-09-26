import test from "node:test";
import assert from "node:assert/strict";
import {
  getReferencedAttachmentIds,
  getUnreferencedAttachmentIds,
} from "../src/data/attachmentReferences";

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
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
  },
});

function exam(attachmentId: string) {
  return {
    id: "exam-" + attachmentId,
    name: "CT Scan",
    date: "26 September 2026",
    attachmentId,
    icon: "scan" as const,
  };
}

function draft(attachmentId: string) {
  return {
    followUpDate: "2026-09-26",
    followUpTime: "09:00",
    subjective: {},
    objective: {},
    neurology: {},
    internalMedicine: {},
    supportingExams: [
      {
        id: "exam-draft-" + attachmentId,
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

test("attachment yang dipakai follow-up dan draft tetap dianggap ter-referensi", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:follow-ups",
    JSON.stringify({
      "patient-a": [
        {
          id: "fu-a",
          number: 1,
          date: "26 September 2026",
          isoDate: "2026-09-26",
          time: "09.00",
          status: "Tersimpan",
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
          summary: "",
          supportingExams: [exam("att-saved")],
        },
      ],
    }),
  );
  storage.setItem(
    "rekammedisku:follow-up-draft:patient-b",
    JSON.stringify(draft("att-draft")),
  );

  assert.deepEqual(
    [...getReferencedAttachmentIds()].sort(),
    ["att-draft", "att-saved"],
  );
});

test("attachment pada form yang sedang aktif dapat dipertahankan sebagai referensi sementara", () => {
  storage.clear();

  assert.ok(
    getReferencedAttachmentIds(undefined, [
      {
        id: "exam-current",
        examType: "CT Scan",
        date: "2026-09-26",
        result: "",
        attachmentName: "current.pdf",
        attachmentId: "att-current",
      },
    ]).has("att-current"),
  );
});

test("attachment yang masih pending di form tetap dianggap ter-referensi", () => {
  storage.clear();

  assert.ok(
    getReferencedAttachmentIds(
      undefined,
      undefined,
      ["att-pending"],
    ).has("att-pending"),
  );

  assert.deepEqual(
    getUnreferencedAttachmentIds(
      ["att-pending", "att-orphan"],
      undefined,
      undefined,
      ["att-pending"],
    ),
    ["att-orphan"],
  );
});

test("hanya attachment yang tidak direferensikan yang masuk kandidat cleanup", () => {
  storage.clear();
  storage.setItem(
    "rekammedisku:follow-ups",
    JSON.stringify({
      "patient-a": [
        {
          id: "fu-a",
          number: 1,
          date: "26 September 2026",
          isoDate: "2026-09-26",
          time: "09.00",
          status: "Tersimpan",
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
          summary: "",
          supportingExams: [exam("att-used")],
        },
      ],
    }),
  );

  assert.deepEqual(
    getUnreferencedAttachmentIds(["att-used", "att-orphan"]),
    ["att-orphan"],
  );
});
