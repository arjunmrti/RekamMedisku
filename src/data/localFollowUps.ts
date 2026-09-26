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

function getStoredFollowUps(): Record<string, FollowUpEntry[]> {
  const parsed = readJson<unknown>(SAVED_KEY, null);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(([, entries]) => Array.isArray(entries)),
  ) as Record<string, FollowUpEntry[]>;
}

function getDraftAttachmentIds(patientId: string): string[] {
  const draft = loadFollowUpDraft(patientId);

  return (draft?.supportingExams ?? [])
    .map((exam) => exam.attachmentId)
    .filter((attachmentId): attachmentId is string => Boolean(attachmentId));
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

  return getStoredFollowUps();
}

export function getPatientFollowUpAttachmentIds(patientId: string): string[] {
  const followUps = getStoredFollowUps()[patientId] ?? [];
  const savedAttachmentIds = followUps
    .flatMap((entry) => entry.supportingExams ?? [])
    .map((exam) => exam.attachmentId)
    .filter((attachmentId): attachmentId is string => Boolean(attachmentId));

  return [...new Set([...savedAttachmentIds, ...getDraftAttachmentIds(patientId)])];
}

export function getOtherPatientFollowUpAttachmentIds(
  patientId: string,
): Set<string> {
  const attachmentIds = new Set<string>();
  const followUpsByPatient = getStoredFollowUps();

  for (const [otherPatientId, entries] of Object.entries(followUpsByPatient)) {
    if (otherPatientId === patientId) continue;

    for (const entry of entries) {
      for (const exam of entry.supportingExams ?? []) {
        if (exam.attachmentId) {
          attachmentIds.add(exam.attachmentId);
        }
      }
    }
  }

  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith(DRAFT_PREFIX)) continue;

    const draftPatientId = key.slice(DRAFT_PREFIX.length);
    if (draftPatientId === patientId) continue;

    for (const attachmentId of getDraftAttachmentIds(draftPatientId)) {
      attachmentIds.add(attachmentId);
    }
  }

  return attachmentIds;
}

function restoreStorageValue(key: string, rawValue: string | null) {
  if (rawValue === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, rawValue);
  }
}

export function deleteFollowUpsForPatient(patientId: string): () => void {
  const draftKey = DRAFT_PREFIX + patientId;
  const previousSavedFollowUps = window.localStorage.getItem(SAVED_KEY);
  const previousDraft = window.localStorage.getItem(draftKey);
  const current = getStoredFollowUps();

  delete current[patientId];

  const rollback = () => {
    restoreStorageValue(SAVED_KEY, previousSavedFollowUps);
    restoreStorageValue(draftKey, previousDraft);
  };

  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(current));
    window.localStorage.removeItem(draftKey);
  } catch (error) {
    try {
      rollback();
    } catch {
      // Preserve the original localStorage failure.
    }
    throw error;
  }

  return rollback;
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
