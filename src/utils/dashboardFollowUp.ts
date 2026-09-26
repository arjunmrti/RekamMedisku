import type { FollowUpEntry } from "../types/followUp";

export function getCompletedFollowUps(
  entries: FollowUpEntry[],
): FollowUpEntry[] {
  return [...entries]
    .filter((entry) => entry.status === "Tersimpan")
    .filter((entry, index, allEntries) => {
      return allEntries.findIndex((candidate) => candidate.id === entry.id) === index;
    })
    .sort((a, b) => (b.isoDate + b.time).localeCompare(a.isoDate + a.time));
}

export function hasCompletedFollowUpToday(
  entries: FollowUpEntry[],
  today: string,
): boolean {
  return entries.some(
    (entry) => entry.status === "Tersimpan" && entry.isoDate === today,
  );
}
