import type { PatientListItem, PatientStatus } from "../types/patient";
import { deleteFollowUpsForPatient } from "./localFollowUps";
import { deletePatient, loadPatients, savePatients } from "./localPatients";
import { loadSlaberanLocations } from "./localSlaberanLocations";
import { syncRotationsWithSupabase } from "./supabaseRotations";
import { supabase } from "../utils/supabase";
import { workspaceStorageKey } from "./workspaceStorage";
import { derivePatientFollowUpSummaryFromRemote } from "./patientFollowUpSummary";
import { deleteAttachmentsWithSupabase } from "./supabaseAttachments";
import {
  normalizePatientAdmissionLocation,
  normalizePatientLocation,
} from "../utils/patientLocation";

type PatientRow = {
  id: string;
  user_id: string;
  rotation_id: string;
  name: string;
  age: number;
  gender: string;
  rm: string;
  room: string;
  current_location_id: string | null;
  current_location_type: string | null;
  current_location_name: string | null;
  bed: string;
  doctor: string;
  admission_location_id: string | null;
  admission_location_type: string | null;
  admission_location_name: string | null;
  created_at: string;
  updated_at: string;
  admission_date: string | null;
  admission_complaint: string | null;
  status: string;
  follow_ups?: Array<{
    number: number;
    iso_date: string;
    time: string;
    status: string | null;
  }>;
};

type PatientIdMap = Record<string, string>;

type DeletePatientRemoteResult = {
  deleted?: boolean;
  attachmentIds?: unknown;
};

const PATIENT_ID_MAP_KEY = "supabase-patient-ids";
const ROTATION_ID_MAP_KEY = "supabase-rotation-ids";

function readMap(key: string): Record<string, string> {
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

function saveMap(key: string, map: Record<string, string>) {
  window.localStorage.setItem(workspaceStorageKey(key), JSON.stringify(map));
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
  locations = loadSlaberanLocations(),
): PatientListItem {
  const followUpSummary = derivePatientFollowUpSummaryFromRemote(
    row.follow_ups ?? [],
  );
  const currentLocation = normalizePatientLocation(
    {
      locationId: row.current_location_id ?? undefined,
      type:
        row.current_location_type === "special"
          ? "special"
          : row.current_location_type === "ward"
            ? "ward"
            : undefined,
      name: row.current_location_name ?? "",
      bed: row.bed,
    },
    row.room,
    row.bed,
  );
  const canonicalLocation = currentLocation.locationId
    ? locations.find((location) => location.id === currentLocation.locationId)
    : undefined;
  const resolvedCurrentLocation = canonicalLocation
    ? {
        ...currentLocation,
        name: canonicalLocation.name,
      }
    : currentLocation;

  return {
    id: localId,
    rotationId: row.rotation_id,
    name: row.name,
    age: row.age,
    gender: normalizeGender(row.gender),
    rm: row.rm,
    room: resolvedCurrentLocation.name || row.room,
    currentLocation: resolvedCurrentLocation,
    bed: row.bed,
    doctor: row.doctor,
    admissionLocation: normalizePatientAdmissionLocation(
      row.admission_location_name
        ? {
            locationId: row.admission_location_id ?? undefined,
            type:
              row.admission_location_type === "special"
                ? "special"
                : "ward",
            name: row.admission_location_name,
          }
        : undefined,
    ),
    ...followUpSummary,
    createdAt: row.created_at,
    admissionDate: row.admission_date ?? undefined,
    admissionComplaint: row.admission_complaint ?? undefined,
    updatedAt: row.updated_at,
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
  const currentLocation = normalizePatientLocation(
    patient.currentLocation,
    patient.room,
    patient.bed,
  );
  const canonicalLocation = currentLocation.locationId
    ? loadSlaberanLocations().find(
        (location) => location.id === currentLocation.locationId,
      )
    : undefined;
  const resolvedCurrentLocation = canonicalLocation
    ? {
        ...currentLocation,
        name: canonicalLocation.name,
      }
    : currentLocation;

  return {
    rotation_id: remoteRotationId,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    rm: patient.rm,
    room: resolvedCurrentLocation.name,
    bed: resolvedCurrentLocation.bed,
    doctor: patient.doctor,
    current_location_id: resolvedCurrentLocation.locationId ?? null,
    current_location_type: resolvedCurrentLocation.type,
    current_location_name: resolvedCurrentLocation.name,
    created_at: patient.createdAt ?? new Date().toISOString(),
    admission_date: patient.admissionDate ?? null,
    admission_complaint: patient.admissionComplaint?.trim() || null,
    admission_location_id: patient.admissionLocation?.locationId ?? null,
    admission_location_type: patient.admissionLocation?.type ?? null,
    admission_location_name: patient.admissionLocation?.name ?? null,
    status: patient.status,
  };
}

export function getSupabasePatientErrorMessage(
  error: unknown,
  fallback = "Gagal memuat data pasien dari Supabase.",
) {
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

    if (candidate.code === "PGRST202") {
      return "Fitur hapus pasien belum aktif di Supabase. Jalankan migration Package 3 terlebih dahulu.";
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
  const locations = loadSlaberanLocations();
  const patientMap: PatientIdMap = readMap(PATIENT_ID_MAP_KEY);
  const rotationMap = readMap(ROTATION_ID_MAP_KEY);

  const { data: remoteRows, error } = await supabase
    .from("patients")
    .select(
      "id,user_id,rotation_id,name,age,gender,rm,room,current_location_id,current_location_type,current_location_name,bed,doctor,created_at,admission_date,admission_complaint,admission_location_id,admission_location_type,admission_location_name,status,follow_ups(number,iso_date,time,status)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (remoteRows ?? []) as PatientRow[];
  const remoteIds = new Set(rows.map((row) => row.id));

  // Drop stale remote mappings before resolving local IDs. Without this,
  // a patient recreated in Supabase could bypass the matching local patient
  // and receive a new local ID, detaching its local follow-up history.
  for (const [localId, remoteId] of Object.entries(patientMap)) {
    if (!remoteIds.has(remoteId)) {
      delete patientMap[localId];
    }
  }

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

    nextLocal = mergePatientIntoLocal(nextLocal, {
      ...toPatient(row, localId, locations),
      rotationId: localRotationId,
    });
  }

  saveMap(PATIENT_ID_MAP_KEY, patientMap);
  savePatients(nextLocal);

  return nextLocal;
}

export async function upsertPatientWithSupabase(
  patient: PatientListItem,
): Promise<PatientListItem[]> {
  const previousPatients = loadPatients();
  let remoteCommitted = false;

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
      if (!patient.updatedAt) {
        throw new Error(
          "Versi data pasien tidak tersedia. Muat ulang data pasien sebelum menyimpan perubahan.",
        );
      }

      const nextUpdatedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("patients")
        .update({
          ...patientPayload(patient, remoteRotationId),
          updated_at: nextUpdatedAt,
        })
        .eq("id", remotePatientId)
        .eq("user_id", userId)
        .eq("updated_at", patient.updatedAt)
        .select()
        .maybeSingle<PatientRow>();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Data pasien sudah berubah di browser lain. Muat ulang data terbaru sebelum menyimpan perubahan.",
        );
      }

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

    remoteCommitted = true;

    const persistedPatient: PatientListItem = {
      ...toPatient(remoteRow, patient.id),
      rotationId: patient.rotationId,
    };

    const persistedPatients = localExists
      ? previousPatients.map((item) =>
          item.id === patient.id ? persistedPatient : item,
        )
      : [persistedPatient, ...previousPatients];

    savePatients(persistedPatients);

    try {
      patientMap[patient.id] = remoteRow.id;
      saveMap(PATIENT_ID_MAP_KEY, patientMap);
    } catch (mapError) {
      console.warn(
        "Patient ID mapping could not be persisted; the next workspace sync will recover it.",
        mapError,
      );
    }

    return persistedPatients;
  } catch (error) {
    if (!remoteCommitted) {
      savePatients(previousPatients);
    } else {
      console.warn(
        "Cloud patient mutation committed, but a follow-up local step failed. Keeping the local state instead of rolling it back.",
        error,
      );
    }

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
  let remoteCommitted = false;

  try {
    await getCurrentUserId();
    let remotePatientId = patientMap[patient.id];

    if (!remotePatientId) {
      await syncPatientsWithSupabase();
      remotePatientId = readMap(PATIENT_ID_MAP_KEY)[patient.id];
    }

    if (!remotePatientId) {
      throw new Error("Pasien belum tersinkron ke Supabase.");
    }

    /*
     * Package 3 memusatkan penghapusan cloud di satu RPC. Fungsi database
     * menjalankan DELETE parent patient dalam satu transaksi PostgreSQL;
     * follow-up dan supporting exam ikut terhapus lewat ON DELETE CASCADE.
     */
    const { data: deleteResult, error: deleteError } = await supabase.rpc(
      "delete_patient_with_history",
      { target_patient_id: remotePatientId },
    );

    if (deleteError) throw deleteError;

    const remoteDelete =
      typeof deleteResult === "boolean"
        ? { deleted: deleteResult, attachmentIds: [] }
        : (deleteResult as DeletePatientRemoteResult | null);

    if (!remoteDelete?.deleted) {
      throw new Error("Pasien tidak ditemukan di Supabase.");
    }

    remoteCommitted = true;

    const attachmentIdsToDelete = Array.isArray(remoteDelete.attachmentIds)
      ? remoteDelete.attachmentIds.filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        )
      : [];

    if (attachmentIdsToDelete.length) {
      try {
        await deleteAttachmentsWithSupabase(attachmentIdsToDelete);
      } catch (storageError) {
        // The patient DB deletion is already committed. Storage cleanup is
        // intentionally best-effort so a transient Storage failure cannot
        // resurrect the deleted patient locally.
        console.warn(
          "Data pasien sudah terhapus dari cloud, tetapi sebagian lampiran Storage belum bisa dibersihkan.",
          storageError,
        );
      }
    } else if (typeof deleteResult === "boolean") {
      console.warn(
        "RPC hapus pasien masih mengembalikan format lama; jalankan migration P6 agar lampiran Storage ikut dibersihkan.",
      );
    }

    try {
      await deletePatient(patient.id);
    } catch (localError) {
      // Cloud deletion already committed. Do not restore the patient locally.
      // Remove the visible patient/follow-up cache as a best-effort reconciliation.
      console.warn(
        "Cloud patient deletion committed, but local cleanup failed. Reconciling local cache without rollback.",
        localError,
      );

      try {
        deleteFollowUpsForPatient(patient.id);
      } catch (followUpError) {
        console.warn(
          "Local follow-up cleanup after patient deletion failed.",
          followUpError,
        );
      }

      savePatients(previousPatients.filter((item) => item.id !== patient.id));
    }

    try {
      delete patientMap[patient.id];
      saveMap(PATIENT_ID_MAP_KEY, patientMap);
    } catch (mapError) {
      console.warn(
        "Patient ID mapping cleanup could not be persisted.",
        mapError,
      );
    }

    return true;
  } catch (error) {
    if (!remoteCommitted) {
      savePatients(previousPatients);
    } else {
      console.warn(
        "Cloud patient deletion committed, but a local cleanup step failed.",
        error,
      );
    }

    throw new Error(getErrorMessage(error));
  }
}
