import test from "node:test";
import assert from "node:assert/strict";
import { isActivePatientInRotation } from "../src/utils/patientContext";
import type { PatientListItem } from "../src/types/patient";

const basePatient: PatientListItem = {
  id: "patient-1",
  rotationId: "rotation-1",
  name: "Pasien Uji",
  age: 30,
  gender: "Laki-laki",
  rm: "RM-001",
  room: "A",
  bed: "1",
  doctor: "Dokter Uji",
  lastFollowUp: "",
  followUpNumber: 0,
  status: "Aktif",
};

test("patient context valid hanya untuk active rotation", () => {
  assert.equal(isActivePatientInRotation(basePatient, "rotation-1"), true);
  assert.equal(isActivePatientInRotation(basePatient, "rotation-2"), false);
});

test("patient context invalid untuk pasien yang diarsipkan", () => {
  assert.equal(
    isActivePatientInRotation(
      { ...basePatient, status: "Diarsipkan" },
      "rotation-1",
    ),
    false,
  );
});

test("patient context menolak active rotation kosong", () => {
  assert.equal(isActivePatientInRotation(basePatient, ""), false);
});
