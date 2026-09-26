import test from "node:test";
import assert from "node:assert/strict";
import {
  getCompletedFollowUps,
  hasCompletedFollowUpToday,
} from "../src/utils/dashboardFollowUp";
import type { FollowUpEntry } from "../src/types/followUp";

function entry(
  id: string,
  status: FollowUpEntry["status"],
  isoDate: string,
  time: string,
): FollowUpEntry {
  return {
    id,
    number: 1,
    date: isoDate,
    isoDate,
    time,
    status,
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    summary: "",
  };
}

test("draft hari ini tidak dianggap follow-up selesai", () => {
  const draftToday = entry("draft-1", "Draf", "2026-09-26", "10.00");

  assert.deepEqual(getCompletedFollowUps([draftToday]), []);
  assert.equal(
    hasCompletedFollowUpToday([draftToday], "2026-09-26"),
    false,
  );
});

test("follow-up tersimpan hari ini tetap dihitung walau ada draft yang lebih baru", () => {
  const savedToday = entry("saved-1", "Tersimpan", "2026-09-26", "08.00");
  const draftLater = entry("draft-1", "Draf", "2026-09-26", "12.00");

  const completed = getCompletedFollowUps([draftLater, savedToday]);

  assert.deepEqual(completed.map((item) => item.id), ["saved-1"]);
  assert.equal(
    hasCompletedFollowUpToday([draftLater, savedToday], "2026-09-26"),
    true,
  );
});

test("follow-up tersimpan kemarin membuat pasien tetap pending hari ini", () => {
  const savedYesterday = entry("saved-1", "Tersimpan", "2026-09-25", "16.00");

  assert.equal(
    hasCompletedFollowUpToday([savedYesterday], "2026-09-26"),
    false,
  );
});

test("duplikat entry tidak menggandakan data dashboard", () => {
  const saved = entry("saved-1", "Tersimpan", "2026-09-26", "09.00");

  assert.equal(
    getCompletedFollowUps([saved, { ...saved }]).length,
    1,
  );
});
