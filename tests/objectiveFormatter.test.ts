import test from "node:test";
import assert from "node:assert/strict";
import { buildBasicObjectiveLines } from "../src/utils/objectiveFormatter";
import type { FollowUpFormValues } from "../src/types/followUpForm";

const baseObjective: FollowUpFormValues["objective"] = {
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
};

test("vital kosong tidak menghasilkan nilai palsu", () => {
  assert.deepEqual(buildBasicObjectiveLines(baseObjective), []);
});

test("tekanan darah hanya disimpan lengkap jika sistol dan diastol tersedia", () => {
  assert.deepEqual(
    buildBasicObjectiveLines({
      ...baseObjective,
      systolic: "120",
      diastolic: "80",
    }),
    ["TD: 120/80 mmHg"],
  );

  assert.deepEqual(
    buildBasicObjectiveLines({
      ...baseObjective,
      systolic: "120",
    }),
    ["TD Sistol: 120 mmHg"],
  );

  assert.deepEqual(
    buildBasicObjectiveLines({
      ...baseObjective,
      diastolic: "80",
    }),
    ["TD Diastol: 80 mmHg"],
  );
});

test("vital yang terisi tetap menyimpan unit tanpa membuat nilai kosong", () => {
  assert.deepEqual(
    buildBasicObjectiveLines({
      ...baseObjective,
      pulse: "80",
      respiratoryRate: "18",
      temperature: "36.5",
      spo2: "98",
      oxygenVia: "Room air",
      painNrs: "2",
    }),
    [
      "Nadi: 80 x/menit",
      "RR: 18 x/menit",
      "Suhu: 36.5 °C",
      "SpO₂: 98 %",
      "Oksigen via: Room air",
      "NRS: 2",
    ],
  );
});

test("temuan non-vital kosong juga tidak menghasilkan label kosong", () => {
  assert.deepEqual(
    buildBasicObjectiveLines({
      ...baseObjective,
      generalCondition: "Baik",
      physicalFindings: "Tidak ada kelainan bermakna",
      supportingExamText: "Hb 13 g/dL",
    }),
    [
      "Keadaan Umum: Baik",
      "Pemeriksaan/Temuan Fisik: Tidak ada kelainan bermakna",
      "Hasil Penunjang: Hb 13 g/dL",
    ],
  );
});
