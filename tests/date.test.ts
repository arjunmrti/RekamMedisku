import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidDisplayTime,
  isValidIsoDate,
  isValidIsoDateTime,
  isValidTimeInput,
  toLocalIsoDate,
  toLocalIsoDateTime,
  toLocalTimeInput,
} from "../src/utils/date";

test("tanggal dan waktu memakai timezone lokal, bukan UTC", () => {
  const date = new Date("2026-09-25T17:30:00.000Z");

  assert.equal(toLocalIsoDate(date), "2026-09-26");
  assert.equal(toLocalTimeInput(date), "01:30");
  assert.equal(toLocalIsoDateTime(date), "2026-09-26T01:30:00");
});

test("validator tanggal ISO menolak tanggal yang secara kalender tidak valid", () => {
  assert.equal(isValidIsoDate("2026-02-30"), false);
  assert.equal(isValidIsoDate("2026-04-31"), false);
  assert.equal(isValidIsoDate("2026-09-26"), true);
});

test("validator waktu menolak jam dan menit di luar rentang", () => {
  assert.equal(isValidTimeInput("23:59"), true);
  assert.equal(isValidTimeInput("24:00"), false);
  assert.equal(isValidTimeInput("12:60"), false);

  assert.equal(isValidDisplayTime("23.59"), true);
  assert.equal(isValidDisplayTime("24.00"), false);
  assert.equal(isValidDisplayTime("12.60"), false);
});

test("validator datetime ISO memvalidasi tanggal dan waktu sekaligus", () => {
  assert.equal(isValidIsoDateTime("2026-09-26T10:15:00.000Z"), true);
  assert.equal(isValidIsoDateTime("2026-09-26T10:15:00"), true);
  assert.equal(isValidIsoDateTime("2026-02-30T10:15:00.000Z"), false);
  assert.equal(isValidIsoDateTime("2026-09-26T24:15:00.000Z"), false);
});
