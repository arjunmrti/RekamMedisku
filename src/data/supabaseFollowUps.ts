import type { FollowUpEntry, SupportingExam } from "../types/followUp";
import { replaceSavedFollowUps } from "./localFollowUps";
import { updatePatient } from "./localPatients";
import { syncPatientsWithSupabase } from "./supabasePatients";
import { supabase } from "../utils/supabase";
import { derivePatientFollowUpSummary } from "./patientFollowUpSummary";
import { deleteAttachments } from "./localAttachments";
import {
  getDraftFollowUpAttachmentIds,
  getSavedFollowUpAttachmentIds,
  getAttachmentIdsFromFollowUps,
} from "./attachmentReferences";

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

const FOLLOW_UP_ID_MAP_KEY = "rekammedisku:supabase-follow-up-ids";
const SUPPORTING_EXAM_ID_MAP_KEY = "rekammedisku:supabase-supporting-exam-ids";
const PATIENT_ID_MAP_KEY = "rekammedisku:supabase-patient-ids";

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
    const raw = window.localStorage.getItem(key);
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
  window.localStorage.setItem(key, JSON.stringify(map));
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
  if (value === "Neurologi" || value === "Ilmu Penyakit Dalam") {
    return value;
  }

  return undefined;
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
    assessmentCodes: row.assessment_codes ?? [],
    planning: row.planning ?? undefined,
    instruction: row.instruction ?? undefined,
    subjective: row.subjective,
    objective: row.objective,
    assessment: row.assessment,
    plan: row.plan,
    summary: row.summary,
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

function examPayload(exam: SupportingExam, remoteFollowUpId: string) {
  const isoDate =
    exam.isoDate ?? toIsoDate(exam.date);

  return {
    follow_up_id: remoteFollowUpId,
    name: exam.name,
    exam_type: exam.examType ?? null,
    exam_date: isoDate,
    result: exam.result ?? null,
    attachment_name: exam.attachmentName ?? null,
    attachment_id: exam.attachmentId ?? null,
    attachment_type: exam.attachmentType ?? null,
    attachment_size: exam.attachmentSize ?? null,
    attachment_count: exam.attachmentCount ?? null,
    icon: exam.icon,
  };
}

function getErrorMessage(
  error: unknown,
  fallback = "Gagal menyimpan follow-up ke Supabase.",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      hint?: unknown;
    };

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
  let insertedFollowUpId: string | null = null;
  const insertedExamIds: string[] = [];

  try {
    let remoteRow: FollowUpRow | null = null;

    if (remoteFollowUpId) {
      const { data, error } = await supabase
        .from("follow_ups")
        .update(followUpPayload(entry, remotePatientId))
        .eq("id", remoteFollowUpId)
        .eq("user_id", userId)
        .select()
        .maybeSingle<FollowUpRow>();

      if (error) throw error;

      if (data) {
        remoteRow = data;
      } else {
        // The local ID map can point to a row that was removed manually.
        // Fall back to the logical patient + follow-up number identity.
        delete followUpMap[entry.id];
        remoteFollowUpId = null;
      }
    }

    if (!remoteFollowUpId) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("patient_id", remotePatientId)
        .eq("number", entry.number)
        .eq("user_id", userId)
        .maybeSingle<FollowUpRow>();

      if (existingRowError) throw existingRowError;

      if (existingRow) {
        remoteRow = existingRow;
        remoteFollowUpId = existingRow.id;
        followUpMap[entry.id] = existingRow.id;
      } else {
        const { data, error } = await supabase
          .from("follow_ups")
          .insert({
            user_id: userId,
            ...followUpPayload(entry, remotePatientId),
          })
          .select()
          .single<FollowUpRow>();

        if (error) throw error;
        remoteRow = data;
        insertedFollowUpId = data.id;
        followUpMap[entry.id] = data.id;
      }
    }

    if (!remoteRow) {
      throw new Error("Follow-up tidak berhasil ditemukan atau disimpan.");
    }

    if (insertedFollowUpId) {
      for (const exam of entry.supportingExams ?? []) {
        const { data, error } = await supabase
          .from("supporting_exams")
          .insert({
            user_id: userId,
            ...examPayload(exam, remoteRow.id),
          })
          .select()
          .single<SupportingExamRow>();

        if (error) throw error;

        examMap[exam.id] = data.id;
        insertedExamIds.push(data.id);
      }
    }

    if (!insertedFollowUpId) {
      const { data: existingExams, error: existingExamsError } = await supabase
        .from("supporting_exams")
        .select("id")
        .eq("follow_up_id", remoteRow.id)
        .eq("user_id", userId);

      if (existingExamsError) throw existingExamsError;

      const currentExamIds = new Set<string>();

      for (const exam of entry.supportingExams ?? []) {
        const mappedExamId = examMap[exam.id];

        if (mappedExamId) {
          const { error } = await supabase
            .from("supporting_exams")
            .update(examPayload(exam, remoteRow.id))
            .eq("id", mappedExamId)
            .eq("follow_up_id", remoteRow.id)
            .eq("user_id", userId);

          if (error) throw error;

          currentExamIds.add(mappedExamId);
          continue;
        }

        const { data, error } = await supabase
          .from("supporting_exams")
          .insert({
            user_id: userId,
            ...examPayload(exam, remoteRow.id),
          })
          .select()
          .single<SupportingExamRow>();

        if (error) throw error;

        examMap[exam.id] = data.id;
        currentExamIds.add(data.id);
      }

      const staleExamIds = (existingExams ?? [])
        .map((exam) => exam.id)
        .filter((id) => !currentExamIds.has(id));

      if (staleExamIds.length) {
        const { error } = await supabase
          .from("supporting_exams")
          .delete()
          .in("id", staleExamIds)
          .eq("user_id", userId);

        if (error) throw error;
      }
    }

    saveMap(FOLLOW_UP_ID_MAP_KEY, followUpMap);
    saveMap(SUPPORTING_EXAM_ID_MAP_KEY, examMap);
  } catch (error) {
    if (insertedFollowUpId) {
      if (insertedExamIds.length) {
        await supabase
          .from("supporting_exams")
          .delete()
          .in("id", insertedExamIds)
          .eq("user_id", userId);
      }

      await supabase
        .from("follow_ups")
        .delete()
        .eq("id", insertedFollowUpId)
        .eq("user_id", userId);
    }

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
      "id,user_id,patient_id,number,date,iso_date,time,status,template_type,assessment_codes,planning,instruction,subjective,objective,assessment,plan,summary,created_at,updated_at",
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

  if (staleSavedAttachmentIds.length) {
    await deleteAttachments(staleSavedAttachmentIds);
  }

  saveMap(FOLLOW_UP_ID_MAP_KEY, followUpMap);
  saveMap(SUPPORTING_EXAM_ID_MAP_KEY, examMap);
  replaceSavedFollowUps(nextLocal);

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
