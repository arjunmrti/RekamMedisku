import test from "node:test";
import assert from "node:assert/strict";
import { toLocalIsoDate, toLocalIsoDateTime, toLocalTimeInput } from "../src/utils/date";

test("tanggal dan waktu memakai timezone lokal, bukan UTC", () => {
  const date = new Date("2026-09-25T17:30:00.000Z");

  assert.equal(toLocalIsoDate(date), "2026-09-26");
  assert.equal(toLocalTimeInput(date), "01:30");
  assert.equal(toLocalIsoDateTime(date), "2026-09-26T01:30:00");
});
