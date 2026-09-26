import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePatientAdmissionLocation,
  normalizePatientLocation,
} from "../src/utils/patientLocation";

test("legacy ICU room is normalized as a special current location", () => {
  const location = normalizePatientLocation(undefined, "ICU", "04");

  assert.deepEqual(location, {
    type: "special",
    name: "ICU",
    bed: "04",
  });
});

test("legacy ward room is normalized as a ward current location", () => {
  const location = normalizePatientLocation(undefined, "Anggrek", "15");

  assert.deepEqual(location, {
    type: "ward",
    name: "Anggrek",
    bed: "15",
  });
});

test("preserves explicit current location ID", () => {
  const location = normalizePatientLocation(
    {
      locationId: "loc-123",
      type: "ward",
      name: "Anggrek",
      bed: "15",
    },
    "ICU",
    "04",
  );

  assert.deepEqual(location, {
    locationId: "loc-123",
    type: "ward",
    name: "Anggrek",
    bed: "15",
  });
});

test("explicit current location wins over legacy room", () => {
  const location = normalizePatientLocation(
    {
      type: "special",
      name: "IGD",
      bed: "02",
    },
    "Anggrek",
    "15",
  );

  assert.deepEqual(location, {
    type: "special",
    name: "IGD",
    bed: "02",
  });
});

test("admission location stays separate from current location", () => {
  const location = normalizePatientAdmissionLocation({
    type: "special",
    name: "IGD",
    locationId: "loc-igd",
  });

  assert.deepEqual(location, {
    type: "special",
    name: "IGD",
    locationId: "loc-igd",
  });
});

test("empty admission location stays undefined", () => {
  assert.equal(
    normalizePatientAdmissionLocation({
      type: "ward",
      name: "   ",
    }),
    undefined,
  );
});
