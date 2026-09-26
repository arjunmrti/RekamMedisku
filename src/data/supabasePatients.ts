import type { PatientListItem, PatientStatus } from "../types/patient";
import { deletePatient, loadPatients, savePatients } from "./localPatients";
import { syncRotationsWithSupabase } from "./supabaseRotations";
import { supabase } from "../utils/supabase";

type PatientRow = {
  id: string;
  user_id: string;
  rotation_id: string;
  name: string;
  age: number;
  gender: string;
  rm: string;
  room: string;
  bed: string;
  doctor: string;
  created_at: string;
  admission_date: string | null;
  status: string;
};

type PatientIdMap = Record<string, string>;

const PATIENT_ID_MAP_KEY = "rekammedisku:supabase-patient-ids";
const ROTATION_ID_MAP_KEY = "rekammedisku:supabase-rotation-ids";

function readMap(key: string): Record<string, string> {
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

function saveMap(key: string, map: Record<string, string>) {
  window.localStorage.setItem(key, JSON.stringify(map));
}

function normalizeStatus(value: string): PatientStatus {
  return value === "Diarsipkan" ? "Diarsipkan" : "Aktif";
}

function normalizeGender(value: string): PatientListItem["gender"] {
  return value === "Perempuan" ? "Perempuan" : "Laki-laki";
}

function toPatient(
  row: PatientRow,
  localId: string,
  existingPatient?: PatientListItem,
): PatientListItem {
  return {
    id: localId,
    rotationId: row.rotation_id,
    name: row.name,
    age: row.age,
    gender: normalizeGender(row.gender),
    rm: row.rm,
    room: row.room,
    bed: row.bed,
    doctor: row.doctor,
    lastFollowUp:
      existingPatient?.lastFollowUp ?? "Belum ada follow-up",
    followUpNumber: existingPatient?.followUpNumber ?? 0,
    lastFollowUpAt: existingPatient?.lastFollowUpAt,
    createdAt: row.created_at,
    admissionDate: row.admission_date ?? undefined,
    status: normalizeStatus(row.status),
  };
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

function mergePatientIntoLocal(
  patients: PatientListItem[],
  nextPatient: PatientListItem,
) {
  const index = patients.findIndex((patient) => patient.id === nextPatient.id);

  if (index === -1) {
    return [...patients, nextPatient];
  }

  return patients.map((patient, currentIndex) =>
    currentIndex === index ? nextPatient : patient,
  );
}

function patientPayload(patient: PatientListItem, remoteRotationId: string) {
  return {
    rotation_id: remoteRotationId,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    rm: patient.rm,
    room: patient.room,
    bed: patient.bed,
    doctor: patient.doctor,
    created_at: patient.createdAt ?? new Date().toISOString(),
    admission_date: patient.admissionDate ?? null,
    status: patient.status,
  };
}

export function getSupabasePatientErrorMessage(
  error: unknown,
  fallback = "Gagal memuat data pasien dari Supabase.",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (candidate.code === "23505") {
      return "Nomor RM tersebut sudah digunakan pada stase ini.";
    }

    if (candidate.code === "23503") {
      return "Penghapusan pasien belum dapat diselesaikan. Pastikan migrasi Package 2 untuk relasi riwayat pasien sudah diterapkan di Supabase.";
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

  return fallback;
}

function getErrorMessage(error: unknown) {
  return getSupabasePatientErrorMessage(
    error,
    "Gagal menyimpan perubahan pasien ke Supabase.",
  );
}

export async function syncPatientsWithSupabase(): Promise<PatientListItem[]> {
  const userId = await getCurrentUserId();
  await syncRotationsWithSupabase();

  const localPatients = loadPatients();
  const patientMap: PatientIdMap = readMap(PATIENT_ID_MAP_KEY);
  const rotationMap = readMap(ROTATION_ID_MAP_KEY);

  const { data: remoteRows, error } = await supabase
    .from("patients")
    .select(
      "id,user_id,rotation_id,name,age,gender,rm,room,bed,doctor,created_at,admission_date,status",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (remoteRows ?? []) as PatientRow[];
  const remoteIds = new Set(rows.map((row) => row.id));

  // Supabase is the source of truth for synced patient data. Rebuild the
  // local cache from remote rows so stale browser entries cannot resurrect.
  let nextLocal: PatientListItem[] = [];

  for (const row of rows) {
    let localId =
      Object.entries(patientMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      null;

    if (!localId) {
      const localRotationId =
        Object.entries(rotationMap).find(
          ([, remoteId]) => remoteId === row.rotation_id,
        )?.[0] ?? null;

      const matchingLocal = localPatients.find(
        (patient) =>
          !patientMap[patient.id] &&
          patient.rm.trim().toLowerCase() === row.rm.trim().toLowerCase() &&
          patient.rotationId === localRotationId,
      );

      localId = matchingLocal?.id ?? row.id;
      patientMap[localId] = row.id;
    }

    const localRotationId =
      Object.entries(rotationMap).find(
        ([, remoteId]) => remoteId === row.rotation_id,
      )?.[0] ?? row.rotation_id;

    const existingPatient = localPatients.find(
      (patient) => patient.id === localId,
    );

    nextLocal = mergePatientIntoLocal(nextLocal, {
      ...toPatient(row, localId, existingPatient),
      rotationId: localRotationId,
    });
  }

  // Remove mappings for patients that no longer exist in the cloud.
  for (const [localId, remoteId] of Object.entries(patientMap)) {
    if (!remoteIds.has(remoteId)) {
      delete patientMap[localId];
    }
  }

  saveMap(PATIENT_ID_MAP_KEY, patientMap);
  savePatients(nextLocal);

  return nextLocal;
}

export async function upsertPatientWithSupabase(
  patient: PatientListItem,
): Promise<PatientListItem[]> {
  const previousPatients = loadPatients();

  try {
    const userId = await getCurrentUserId();
    const rotationMap = readMap(ROTATION_ID_MAP_KEY);
    const patientMap = readMap(PATIENT_ID_MAP_KEY);
    const remoteRotationId = rotationMap[patient.rotationId];

    if (!remoteRotationId) {
      throw new Error("Stase pasien belum tersinkron ke Supabase.");
    }

    const localExists = previousPatients.some(
      (item) => item.id === patient.id,
    );
    const localNext = localExists
      ? previousPatients.map((item) =>
          item.id === patient.id ? patient : item,
        )
      : [patient, ...previousPatients];

    savePatients(localNext);

    const remotePatientId = patientMap[patient.id];
    let remoteRow: PatientRow;

    if (remotePatientId) {
      const { data, error } = await supabase
        .from("patients")
        .update(patientPayload(patient, remoteRotationId))
        .eq("id", remotePatientId)
        .eq("user_id", userId)
        .select()
        .single<PatientRow>();

      if (error) throw error;
      remoteRow = data;
    } else {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          user_id: userId,
          ...patientPayload(patient, remoteRotationId),
        })
        .select()
        .single<PatientRow>();

      if (error) throw error;
      remoteRow = data;
    }

    patientMap[patient.id] = remoteRow.id;
    saveMap(PATIENT_ID_MAP_KEY, patientMap);

    return await syncPatientsWithSupabase();
  } catch (error) {
    savePatients(previousPatients);
    throw new Error(getErrorMessage(error));
  }
}

export async function setPatientStatusWithSupabase(
  patient: PatientListItem,
  status: PatientStatus,
): Promise<PatientListItem[]> {
  return upsertPatientWithSupabase({
    ...patient,
    status,
  });
}

export async function deletePatientWithSupabase(
  patient: PatientListItem,
): Promise<boolean> {
  const previousPatients = loadPatients();
  const patientMap = readMap(PATIENT_ID_MAP_KEY);

  try {
    const userId = await getCurrentUserId();
    let remotePatientId = patientMap[patient.id];

    if (!remotePatientId) {
      await syncPatientsWithSupabase();
      remotePatientId = readMap(PATIENT_ID_MAP_KEY)[patient.id];
    }

    if (!remotePatientId) {
      throw new Error("Pasien belum tersinkron ke Supabase.");
    }

    /*
     * Package 2 membuat relasi follow-up dan supporting exam memakai
     * ON DELETE CASCADE. Satu DELETE pada parent patient menjadi operasi
     * sumber kebenaran untuk seluruh riwayat pasien di cloud.
     */
    const { data: deletedRows, error: deleteError } = await supabase
      .from("patients")
      .delete()
      .eq("id", remotePatientId)
      .eq("user_id", userId)
      .select()
      .returns<PatientRow[]>();

    if (deleteError) throw deleteError;

    if (deletedRows.length !== 1) {
      throw new Error("Pasien tidak ditemukan di Supabase.");
    }

    try {
      const localDeleted = await deletePatient(patient.id);

      if (!localDeleted) {
        throw new Error("Pasien tidak ditemukan pada penyimpanan lokal.");
      }
    } catch (localError) {
      /*
       * Penghapusan cloud sudah berhasil. Kembalikan cache lokal ke snapshot
       * sebelumnya agar state UI tidak terlihat setengah terhapus; sync berikutnya
       * akan menyelaraskannya kembali dengan Supabase.
       */
      savePatients(previousPatients);
      throw localError;
    }

    delete patientMap[patient.id];
    saveMap(PATIENT_ID_MAP_KEY, patientMap);
    return true;
  } catch (error) {
    savePatients(previousPatients);
    throw new Error(getErrorMessage(error));
  }
}
