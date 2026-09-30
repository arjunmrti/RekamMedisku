import type { FollowUpEntry, SupportingExam } from "../types/followUp";
import { replaceSavedFollowUps } from "./localFollowUps";
import { updatePatient } from "./localPatients";
import { syncPatientsWithSupabase } from "./supabasePatients";
import { supabase } from "../utils/supabase";
import { workspaceStorageKey } from "./workspaceStorage";
import type { FollowUpTemplateAnswers, FollowUpTemplateDefinition } from "../types/followUpTemplate";
import { validateFollowUpTemplateDefinition } from "../utils/followUpTemplate";
import { derivePatientFollowUpSummary } from "./patientFollowUpSummary";
import {
  deleteAttachments,
  getAttachment,
  saveStoredAttachment,
} from "./localAttachments";
import {
  getDraftFollowUpAttachmentIds,
  getSavedFollowUpAttachmentIds,
  getAttachmentIdsFromFollowUps,
} from "./attachmentReferences";
import {
  deleteAttachmentsWithSupabase,
  downloadAttachmentWithSupabase,
  flushPendingAttachmentCleanupWithSupabase,
  uploadAttachmentWithSupabase,
} from "./supabaseAttachments";

type FollowUpRow = {
  id: string;
  user_id: string;
  patient_id: string;
  number: number;
  date: string;
  iso_date: string;
  time: string;
  status: string;
  template_type: string | null;
  template_id: string | null;
  template_version: number | null;
  template_schema_version: number | null;
  template_snapshot: unknown;
  answers: unknown;
  assessment_codes: string[];
  planning: string | null;
  instruction: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type SupportingExamRow = {
  id: string;
  user_id: string;
  follow_up_id: string;
  name: string;
  exam_type: string | null;
  exam_date: string;
  result: string | null;
  attachment_name: string | null;
  attachment_id: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_count: number | null;
  icon: string;
  created_at: string;
  updated_at: string;
};

type IdMap = Record<string, string>;

type AtomicFollowUpSaveResult = {
  followUpId: string;
  supportingExamIds: Record<string, string>;
};

const FOLLOW_UP_ID_MAP_KEY = "supabase-follow-up-ids";
const SUPPORTING_EXAM_ID_MAP_KEY = "supabase-supporting-exam-ids";
const PATIENT_ID_MAP_KEY = "supabase-patient-ids";

const ID_MONTHS: Record<string, string> = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

function readMap(key: string): IdMap {
  try {
    const raw = window.localStorage.getItem(workspaceStorageKey(key));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([localId, remoteId]) =>
          Boolean(localId) &&
          typeof remoteId === "string" &&
          remoteId.length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function saveMap(key: string, map: IdMap) {
  window.localStorage.setItem(workspaceStorageKey(key), JSON.stringify(map));
}

function toIsoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zà-ÿ]+)\s+(\d{4})$/);

  if (!match) {
    throw new Error("Tanggal follow-up tidak dikenali: " + value);
  }

  const month = ID_MONTHS[match[2]];
  if (!month) {
    throw new Error("Bulan tanggal follow-up tidak dikenali: " + value);
  }

  return match[3] + "-" + month + "-" + match[1].padStart(2, "0");
}

function toDbTime(value: string) {
  const normalized = value.trim().replace(".", ":");
  return normalized.length === 5 ? normalized + ":00" : normalized;
}

function toDisplayDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value + "T00:00:00"));
}

function toDisplayTime(value: string) {
  return value.slice(0, 5).replace(":", ".");
}

function normalizeStatus(value: string): FollowUpEntry["status"] {
  return value === "Tersimpan" ? "Tersimpan" : "Draf";
}

function normalizeTemplate(
  value: string | null,
): FollowUpEntry["templateType"] {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeTemplateSnapshot(
  value: unknown,
): FollowUpTemplateDefinition | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  try {
    return validateFollowUpTemplateDefinition(value);
  } catch {
    return undefined;
  }
}

function normalizeIcon(value: string): SupportingExam["icon"] {
  return value === "scan" || value === "image" || value === "eeg"
    ? value
    : "lab";
}

function toSupportingExam(
  row: SupportingExamRow,
  localId: string,
): SupportingExam {
  return {
    id: localId,
    name: row.name,
    examType: row.exam_type ?? undefined,
    date: toDisplayDate(row.exam_date),
    isoDate: row.exam_date,
    result: row.result ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentId: row.attachment_id ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
    attachmentSize: row.attachment_size ?? undefined,
    attachmentCount: row.attachment_count ?? undefined,
    icon: normalizeIcon(row.icon),
  };
}

function toFollowUpEntry(
  row: FollowUpRow,
  localId: string,
  supportingExams: SupportingExam[],
): FollowUpEntry {
  return {
    id: localId,
    number: row.number,
    date: toDisplayDate(row.iso_date),
    isoDate: row.iso_date,
    time: toDisplayTime(row.time),
    status: normalizeStatus(row.status),
    templateType: normalizeTemplate(row.template_type),
    templateId: row.template_id ?? undefined,
    templateVersion: row.template_version ?? undefined,
    templateSchemaVersion: row.template_schema_version ?? undefined,
    templateSnapshot: normalizeTemplateSnapshot(row.template_snapshot),
    templateAnswers:
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as FollowUpTemplateAnswers)
        : undefined,
    assessmentCodes: row.assessment_codes ?? [],
    planning: row.planning ?? undefined,
    instruction: row.instruction ?? undefined,
    subjective: row.subjective,
    objective: row.objective,
    assessment: row.assessment,
    plan: row.plan,
    summary: row.summary,
    updatedAt: row.updated_at,
    supportingExams,
  };
}

function followUpPayload(entry: FollowUpEntry, remotePatientId: string) {
  const isoDate = toIsoDate(entry.isoDate);

  return {
    patient_id: remotePatientId,
    number: entry.number,
    date: isoDate,
    iso_date: isoDate,
    time: toDbTime(entry.time),
    status: entry.status,
    template_type: entry.templateType ?? null,
    template_id: entry.templateId ?? null,
    template_version: entry.templateVersion ?? null,
    template_schema_version: entry.templateSchemaVersion ?? null,
    template_snapshot: entry.templateSnapshot ?? null,
    answers: entry.templateAnswers ?? null,
    assessment_codes: entry.assessmentCodes ?? [],
    planning: entry.planning ?? null,
    instruction: entry.instruction ?? null,
    subjective: entry.subjective,
    objective: entry.objective,
    assessment: entry.assessment,
    plan: entry.plan,
    summary: entry.summary,
  };
}

async function ensureRemoteAttachment(
  exam: SupportingExam,
  onNewUpload: (attachmentId: string) => void,
) {
  if (!exam.attachmentId) return;

  const blob = await getAttachment(exam.attachmentId);

  if (!blob) {
    throw new Error(
      "Lampiran " +
        (exam.attachmentName ?? exam.attachmentId) +
        " tidak tersedia di perangkat. Pulihkan backup atau lampiran lokal terlebih dahulu.",
    );
  }

  // Only mark an attachment for rollback when it did not exist in cloud
  // before this save. A replacement of an existing attachment must never
  // delete the pre-existing object if the DB transaction later fails.
  const existing = await downloadAttachmentWithSupabase(exam.attachmentId);

  if (existing) return;

  onNewUpload(exam.attachmentId);
  await uploadAttachmentWithSupabase(
    exam.attachmentId,
    blob,
    exam.attachmentType ?? blob.type,
  );
}

async function hydrateRemoteAttachment(row: SupportingExamRow) {
  if (!row.attachment_id) return;

  const existing = await getAttachment(row.attachment_id);
  if (existing) return;

  try {
    const blob = await downloadAttachmentWithSupabase(row.attachment_id);
    if (!blob) return;

    if (
      row.attachment_size !== null &&
      Number.isFinite(row.attachment_size) &&
      blob.size !== row.attachment_size
    ) {
      console.warn(
        "Ukuran lampiran cloud tidak sesuai metadata:",
        row.attachment_id,
      );
      return;
    }

    await saveStoredAttachment({
      id: row.attachment_id,
      name: row.attachment_name ?? row.attachment_id,
      type: row.attachment_type ?? blob.type,
      size: row.attachment_size ?? blob.size,
      blob,
    });
  } catch (error) {
    // A missing legacy object must not prevent unrelated cloud records from
    // syncing. The UI will show the attachment as unavailable until repaired.
    console.warn("Gagal memulihkan lampiran cloud ke browser:", error);
  }
}

function getErrorMessage(
  error: unknown,
  fallback = "Gagal menyimpan follow-up ke Supabase.",
) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      hint?: unknown;
    };

    if (
      candidate.code === "23505" &&
      typeof candidate.message === "string" &&
      candidate.message.includes("follow_ups_patient_number_unique")
    ) {
      return "Nomor follow-up tersebut sudah digunakan. Muat ulang data terbaru sebelum menyimpan.";
    }

    if (typeof candidate.message === "string" && candidate.message) {
      const parts = [candidate.message];

      if (typeof candidate.code === "string" && candidate.code) {
        parts.push("Kode: " + candidate.code);
      }

      if (typeof candidate.hint === "string" && candidate.hint) {
        parts.push("Petunjuk: " + candidate.hint);
      }

      return parts.join(" · ");
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function mergeEntry(
  entries: FollowUpEntry[],
  nextEntry: FollowUpEntry,
): FollowUpEntry[] {
  const index = entries.findIndex((entry) => entry.id === nextEntry.id);

  if (index === -1) {
    return [nextEntry, ...entries];
  }

  return entries.map((entry, currentIndex) =>
    currentIndex === index ? nextEntry : entry,
  );
}

function refreshPatientFollowUpSummary(
  patientId: string,
  entries: FollowUpEntry[],
) {
  updatePatient(patientId, derivePatientFollowUpSummary(entries));
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) {
    throw new Error("Sesi RekamMedisku tidak ditemukan.");
  }

  return user.id;
}

async function ensurePatientMap() {
  await syncPatientsWithSupabase();
  return readMap(PATIENT_ID_MAP_KEY);
}

let followUpWriteQueue: Promise<void> = Promise.resolve();

async function withFollowUpWriteLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous = followUpWriteQueue;
  let release!: () => void;

  followUpWriteQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

async function persistFollowUpWithSupabaseInternal(
  patientId: string,
  entry: FollowUpEntry,
): Promise<void> {
  const userId = await getCurrentUserId();
  const patientMap = readMap(PATIENT_ID_MAP_KEY);
  let remotePatientId = patientMap[patientId];

  if (!remotePatientId) {
    const refreshedPatientMap = await ensurePatientMap();
    remotePatientId = refreshedPatientMap[patientId];
  }

  if (!remotePatientId) {
    throw new Error("Pasien belum tersinkron ke Supabase.");
  }

  const followUpMap = readMap(FOLLOW_UP_ID_MAP_KEY);
  const examMap = readMap(SUPPORTING_EXAM_ID_MAP_KEY);
  let remoteFollowUpId: string | null = followUpMap[entry.id] ?? null;

  try {
    // Resolve a possibly stale/missing follow-up mapping before the atomic save.
    if (remoteFollowUpId) {
      const { data: mappedRow, error: mappedRowError } = await supabase
        .from("follow_ups")
        .select("id,updated_at")
        .eq("id", remoteFollowUpId)
        .eq("user_id", userId)
        .maybeSingle<Pick<FollowUpRow, "id" | "updated_at">>();

      if (mappedRowError) throw mappedRowError;

      if (!mappedRow) {
        delete followUpMap[entry.id];
        remoteFollowUpId = null;
      } else if (entry.updatedAt && mappedRow.updated_at !== entry.updatedAt) {
        throw new Error(
          "Data follow-up sudah berubah di browser lain. Muat ulang data terbaru sebelum menyimpan perubahan.",
        );
      }
    }

    if (!remoteFollowUpId) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from("follow_ups")
        .select("id,updated_at")
        .eq("patient_id", remotePatientId)
        .eq("number", entry.number)
        .eq("user_id", userId)
        .maybeSingle<Pick<FollowUpRow, "id" | "updated_at">>();

      if (existingRowError) throw existingRowError;

      if (existingRow) {
        if (!entry.updatedAt || existingRow.updated_at !== entry.updatedAt) {
          throw new Error(
            "Data follow-up dengan nomor tersebut sudah ada atau sudah berubah. Muat ulang data terbaru sebelum menyimpan.",
          );
        }

        remoteFollowUpId = existingRow.id;
      }
    }

    const supportingExams = entry.supportingExams ?? [];
    const newlyUploadedAttachmentIds: string[] = [];

    try {
      // Storage is prepared before the DB transaction. If the DB RPC fails,
      // only objects created by this save attempt are rolled back.
      for (const exam of supportingExams) {
        await ensureRemoteAttachment(exam, (attachmentId) => {
          newlyUploadedAttachmentIds.push(attachmentId);
        });
      }

      const rpcSupportingExams = supportingExams.map((exam) => ({
      id: exam.id,
      name: exam.name,
      exam_type: exam.examType ?? null,
      exam_date: exam.isoDate ?? toIsoDate(exam.date),
      result: exam.result ?? null,
      attachment_name: exam.attachmentName ?? null,
      attachment_id: exam.attachmentId ?? null,
      attachment_type: exam.attachmentType ?? null,
      attachment_size: exam.attachmentSize ?? null,
      attachment_count: exam.attachmentCount ?? null,
        icon: exam.icon,
      }));

      const { data, error } = await supabase.rpc("save_follow_up_with_exams", {
      p_follow_up_id: remoteFollowUpId,
      p_expected_updated_at: entry.updatedAt ?? null,
      p_follow_up: followUpPayload(entry, remotePatientId),
      p_supporting_exams: rpcSupportingExams,
    });

      if (error) throw error;

      // save_follow_up_with_exams commits the follow-up and all supporting exams
    // in one PostgreSQL transaction. No local/cloud rollback is needed after
    // this point: the caller already has the same optimistic local entry.
    try {
      const result = data as AtomicFollowUpSaveResult;

      if (
        !result ||
        typeof result.followUpId !== "string" ||
        !result.followUpId ||
        !result.supportingExamIds ||
        typeof result.supportingExamIds !== "object"
      ) {
        throw new Error("Respons penyimpanan follow-up dari Supabase tidak valid.");
      }

      followUpMap[entry.id] = result.followUpId;

      for (const exam of supportingExams) {
        const remoteExamId = result.supportingExamIds[exam.id];
        if (typeof remoteExamId === "string" && remoteExamId) {
          examMap[exam.id] = remoteExamId;
        }
      }

      saveMap(FOLLOW_UP_ID_MAP_KEY, followUpMap);
      saveMap(SUPPORTING_EXAM_ID_MAP_KEY, examMap);
      try {
        await flushPendingAttachmentCleanupWithSupabase();
      } catch (cleanupQueueError) {
        console.warn(
          "Penyimpanan follow-up berhasil, tetapi cleanup lampiran cloud tertunda.",
          cleanupQueueError,
        );
      }

    } catch (postCommitError) {
      // DB commit already succeeded. A local mapping problem must never make
      // the caller restore the pre-save UI state; the next workspace sync can
      // reconstruct the mappings from Supabase.
        console.warn(
          "Follow-up cloud save committed, but local ID mapping could not be refreshed.",
          postCommitError,
        );
      }
    } catch (error) {
      if (newlyUploadedAttachmentIds.length) {
        try {
          await deleteAttachmentsWithSupabase(newlyUploadedAttachmentIds);
        } catch (cleanupError) {
          console.warn(
            "Gagal membersihkan lampiran follow-up yang ter-upload setelah penyimpanan cloud gagal.",
            cleanupError,
          );
        }
      }

      throw error;
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function syncFollowUpsWithSupabaseInternal(): Promise<
  Record<string, FollowUpEntry[]>
> {
  const userId = await getCurrentUserId();
  const patientMap = await ensurePatientMap();
  const followUpMap = readMap(FOLLOW_UP_ID_MAP_KEY);
  const examMap = readMap(SUPPORTING_EXAM_ID_MAP_KEY);

  const remoteToLocalPatientId = new Map(
    Object.entries(patientMap).map(([localId, remoteId]) => [remoteId, localId]),
  );

  const { data: remoteFollowUps, error: followUpError } = await supabase
    .from("follow_ups")
    .select(
      "id,user_id,patient_id,number,date,iso_date,time,status,template_type,template_id,template_version,template_schema_version,template_snapshot,answers,assessment_codes,planning,instruction,subjective,objective,assessment,plan,summary,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("iso_date", { ascending: false })
    .order("time", { ascending: false })
    .order("number", { ascending: false });

  if (followUpError) throw followUpError;

  const remoteFollowUpRows = (remoteFollowUps ?? []) as FollowUpRow[];
  const remoteIds = remoteFollowUpRows.map((row) => row.id);
  const remoteIdSet = new Set(remoteIds);
  let remoteExams: SupportingExamRow[] = [];

  if (remoteIds.length) {
    const { data, error } = await supabase
      .from("supporting_exams")
      .select(
        "id,user_id,follow_up_id,name,exam_type,exam_date,result,attachment_name,attachment_id,attachment_type,attachment_size,attachment_count,icon,created_at,updated_at",
      )
      .eq("user_id", userId)
      .in("follow_up_id", remoteIds);

    if (error) throw error;
    remoteExams = (data ?? []) as SupportingExamRow[];
  }

  const remoteExamIds = new Set(remoteExams.map((row) => row.id));

  for (const row of remoteExams) {
    await hydrateRemoteAttachment(row);
  }

  const examsByFollowUp = new Map<string, SupportingExam[]>();

  for (const row of remoteExams) {
    let localExamId =
      Object.entries(examMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      null;

    if (!localExamId) {
      localExamId = row.id;
    }

    examMap[localExamId] = row.id;

    const list = examsByFollowUp.get(row.follow_up_id) ?? [];
    list.push(toSupportingExam(row, localExamId));
    examsByFollowUp.set(row.follow_up_id, list);
  }

  // Supabase is authoritative for saved follow-ups. Rebuild the local cache
  // only from remote rows, preventing deleted/stale browser entries from
  // being resurrected during sync.
  const nextLocal: Record<string, FollowUpEntry[]> = {};

  for (const row of remoteFollowUpRows) {
    const localPatientId = remoteToLocalPatientId.get(row.patient_id);

    if (!localPatientId) continue;

    let localId =
      Object.entries(followUpMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      row.id;

    followUpMap[localId] = row.id;

    nextLocal[localPatientId] = mergeEntry(
      nextLocal[localPatientId] ?? [],
      toFollowUpEntry(row, localId, examsByFollowUp.get(row.id) ?? []),
    );
  }

  for (const [localId, remoteId] of Object.entries(followUpMap)) {
    if (!remoteIdSet.has(remoteId)) {
      delete followUpMap[localId];
    }
  }

  for (const [localId, remoteId] of Object.entries(examMap)) {
    if (!remoteExamIds.has(remoteId)) {
      delete examMap[localId];
    }
  }

  // Keep patient summary fields derived from the authoritative follow-up cache,
  // including clearing stale summaries when the patient's last follow-up is gone.
  for (const patientId of Object.keys(patientMap)) {
    refreshPatientFollowUpSummary(patientId, nextLocal[patientId] ?? []);
  }

  const previousSavedAttachmentIds = getSavedFollowUpAttachmentIds();
  const nextSavedAttachmentIds = getAttachmentIdsFromFollowUps(
    Object.values(nextLocal).flat(),
  );
  const draftAttachmentIds = getDraftFollowUpAttachmentIds();
  const staleSavedAttachmentIds = [...previousSavedAttachmentIds].filter(
    (id) => !nextSavedAttachmentIds.has(id) && !draftAttachmentIds.has(id),
  );

  saveMap(FOLLOW_UP_ID_MAP_KEY, followUpMap);
  saveMap(SUPPORTING_EXAM_ID_MAP_KEY, examMap);
  replaceSavedFollowUps(nextLocal);

  // Local attachment cleanup is derived from the authoritative cloud result.
  // Never make the whole workspace sync fail because IndexedDB cleanup fails.
  if (staleSavedAttachmentIds.length) {
    void deleteAttachments(staleSavedAttachmentIds).catch((cleanupError) => {
      console.warn(
        "Cleanup lampiran lokal setelah sync follow-up gagal dan akan dicoba lagi pada sync berikutnya.",
        cleanupError,
      );
    });
  }

  return nextLocal;
}

export async function persistFollowUpWithSupabase(
  patientId: string,
  entry: FollowUpEntry,
): Promise<void> {
  return withFollowUpWriteLock(() =>
    persistFollowUpWithSupabaseInternal(patientId, entry),
  );
}

export async function syncFollowUpsWithSupabase(): Promise<
  Record<string, FollowUpEntry[]>
> {
  return withFollowUpWriteLock(() => syncFollowUpsWithSupabaseInternal());
}

export async function syncFollowUpsForPatientWithSupabase(
  patientId: string,
): Promise<FollowUpEntry[]> {
  const all = await syncFollowUpsWithSupabase();
  return all[patientId] ?? [];
}

export function getSupabaseFollowUpErrorMessage(
  error: unknown,
  fallback = "Gagal memuat data follow-up dari Supabase.",
) {
  return getErrorMessage(error, fallback);
}
