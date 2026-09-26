import { loadFollowUpDraft, loadSavedFollowUps } from "./localFollowUps";
import {
  deleteAttachment,
  deleteAttachments,
  loadAllAttachments,
} from "./localAttachments";
import type { FollowUpEntry, SupportingExam } from "../types/followUp";
import type { FollowUpFormValues } from "../types/followUpForm";

function addExamAttachmentIds(
  ids: Set<string>,
  exams: SupportingExam[] | undefined,
) {
  for (const exam of exams ?? []) {
    if (exam.attachmentId) ids.add(exam.attachmentId);
  }
}

function addFormExamAttachmentIds(
  ids: Set<string>,
  exams: FollowUpFormValues["supportingExams"] | undefined,
) {
  for (const exam of exams ?? []) {
    if (exam.attachmentId) ids.add(exam.attachmentId);
  }
}

export function getSavedFollowUpAttachmentIds(): Set<string> {
  const ids = new Set<string>();

  for (const entries of Object.values(loadSavedFollowUps())) {
    for (const entry of entries) {
      addExamAttachmentIds(ids, entry.supportingExams);
    }
  }

  return ids;
}

export function getDraftFollowUpAttachmentIds(): Set<string> {
  const ids = new Set<string>();

  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith("rekammedisku:follow-up-draft:")) continue;

    const patientId = key.slice("rekammedisku:follow-up-draft:".length);
    const draft = loadFollowUpDraft(patientId);
    addFormExamAttachmentIds(ids, draft?.supportingExams);
  }

  return ids;
}

export function getReferencedAttachmentIds(
  additionalExams: SupportingExam[] | undefined = undefined,
  additionalFormExams: FollowUpFormValues["supportingExams"] | undefined = undefined,
): Set<string> {
  const ids = getSavedFollowUpAttachmentIds();

  for (const id of getDraftFollowUpAttachmentIds()) {
    ids.add(id);
  }

  addExamAttachmentIds(ids, additionalExams);
  addFormExamAttachmentIds(ids, additionalFormExams);

  return ids;
}

export function getUnreferencedAttachmentIds(
  attachmentIds: Iterable<string>,
  additionalExams: SupportingExam[] | undefined = undefined,
  additionalFormExams: FollowUpFormValues["supportingExams"] | undefined = undefined,
): string[] {
  const referenced = getReferencedAttachmentIds(
    additionalExams,
    additionalFormExams,
  );

  return [...new Set(attachmentIds)].filter((id) => !referenced.has(id));
}

export async function deleteAttachmentIfUnreferenced(
  attachmentId: string,
  additionalExams: SupportingExam[] | undefined = undefined,
  additionalFormExams: FollowUpFormValues["supportingExams"] | undefined = undefined,
): Promise<boolean> {
  if (
    getReferencedAttachmentIds(additionalExams, additionalFormExams).has(
      attachmentId,
    )
  ) {
    return false;
  }

  await deleteAttachment(attachmentId);
  return true;
}

export async function cleanupUnreferencedAttachments(
  additionalExams: SupportingExam[] | undefined = undefined,
  additionalFormExams: FollowUpFormValues["supportingExams"] | undefined = undefined,
): Promise<string[]> {
  const attachments = await loadAllAttachments();
  const unreferencedIds = getUnreferencedAttachmentIds(
    attachments.map((attachment) => attachment.id),
    additionalExams,
    additionalFormExams,
  );

  if (unreferencedIds.length) {
    await deleteAttachments(unreferencedIds);
  }

  return unreferencedIds;
}

export function getAttachmentIdsFromFollowUps(
  followUps: FollowUpEntry[],
): Set<string> {
  const ids = new Set<string>();

  for (const entry of followUps) {
    addExamAttachmentIds(ids, entry.supportingExams);
  }

  return ids;
}
