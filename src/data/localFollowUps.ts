import type { FollowUpEntry } from "../types/followUp";
import { mockFollowUpsByPatient } from "./mockFollowUps";
import type { FollowUpFormValues } from "../types/followUpForm";

const DRAFT_PREFIX = "rekammedisku:follow-up-draft:";
const SAVED_KEY = "rekammedisku:follow-ups";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadFollowUpDraft(patientId: string): FollowUpFormValues | null {
  return readJson<FollowUpFormValues | null>(DRAFT_PREFIX + patientId, null);
}

export function saveFollowUpDraft(
  patientId: string,
  values: FollowUpFormValues,
) {
  window.localStorage.setItem(
    DRAFT_PREFIX + patientId,
    JSON.stringify(values),
  );
}

export function clearFollowUpDraft(patientId: string) {
  window.localStorage.removeItem(DRAFT_PREFIX + patientId);
}

export function loadSavedFollowUps(): Record<string, FollowUpEntry[]> {
  const stored = window.localStorage.getItem(SAVED_KEY);

  if (!stored) {
    const seeded = JSON.parse(JSON.stringify(mockFollowUpsByPatient)) as Record<
      string,
      FollowUpEntry[]
    >;
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(seeded));
    return seeded;
  }

  return readJson<Record<string, FollowUpEntry[]>>(SAVED_KEY, {});
}

export function appendSavedFollowUp(
  patientId: string,
  followUp: FollowUpEntry,
) {
  const current = loadSavedFollowUps();
  const next = [followUp, ...(current[patientId] ?? [])];
  window.localStorage.setItem(
    SAVED_KEY,
    JSON.stringify({ ...current, [patientId]: next }),
  );
}
export function replaceSavedFollowUps(
  followUpsByPatient: Record<string, FollowUpEntry[]>,
) {
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(followUpsByPatient));
}

export function clearAllFollowUpDrafts() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(DRAFT_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));
}
