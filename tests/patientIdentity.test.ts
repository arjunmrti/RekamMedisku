import test from "node:test";
import assert from "node:assert/strict";
import {
  isSamePatientIdentity,
  normalizePatientRm,
} from "../src/data/patientIdentity";

test("menormalisasi No. RM dengan trim dan lowercase", () => {
  assert.equal(normalizePatientRm("  RM-ABC-01  "), "rm-abc-01");
});

test("menganggap RM sama bila hanya berbeda kapitalisasi atau spasi", () => {
  assert.equal(
    isSamePatientIdentity("rotation-neurologi", " RM-24012607 ", "rotation-neurologi", "rm-24012607"),
    true,
  );
});

test("membedakan RM yang sama pada stase berbeda", () => {
  assert.equal(
    isSamePatientIdentity("rotation-neurologi", "24012607", "rotation-interna", "24012607"),
    false,
  );
});

test("membedakan No. RM yang memang berbeda", () => {
  assert.equal(
    isSamePatientIdentity("rotation-neurologi", "24012607", "rotation-neurologi", "24012608"),
    false,
  );
});
