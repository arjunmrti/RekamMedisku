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

  let nextLocal = [...localPatients];
  const remoteIds = new Set((remoteRows ?? []).map((row) => row.id));

  for (const row of (remoteRows ?? []) as PatientRow[]) {
    let localId =
      Object.entries(patientMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      null;

    if (!localId) {
      const localRotationId =
        Object.entries(rotationMap).find(
          ([, remoteId]) => remoteId === row.rotation_id,
        )?.[0] ?? null;

      const matchingLocal = nextLocal.find(
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

    const existingPatient = nextLocal.find(
      (patient) => patient.id === localId,
    );

    nextLocal = mergePatientIntoLocal(nextLocal, {
      ...toPatient(row, localId, existingPatient),
      rotationId: localRotationId,
    });
  }

  for (const localPatient of localPatients) {
    const mappedRemoteId = patientMap[localPatient.id];

    if (mappedRemoteId && remoteIds.has(mappedRemoteId)) {
      continue;
    }

    const remoteRotationId = rotationMap[localPatient.rotationId];

    if (!remoteRotationId) {
      throw new Error(
        "Ada pasien dengan stase yang belum tersinkron ke Supabase.",
      );
    }

    const { data, error: insertError } = await supabase
      .from("patients")
      .insert({
        user_id: userId,
        ...patientPayload(localPatient, remoteRotationId),
      })
      .select()
      .single<PatientRow>();

    if (insertError) throw insertError;

    patientMap[localPatient.id] = data.id;
    nextLocal = mergePatientIntoLocal(
      nextLocal,
      toPatient(data, localPatient.id, localPatient),
    );
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
  let remotePatientDeleted = false;

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

    const { data: remoteFollowUps, error: followUpReadError } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("patient_id", remotePatientId)
      .eq("user_id", userId);

    if (followUpReadError) throw followUpReadError;

    const followUpRows = (remoteFollowUps ?? []) as Array<FollowUpRow>;
    const followUpIds = followUpRows.map((row) => row.id);

    let supportingExamRows: SupportingExamRow[] = [];

    if (followUpIds.length) {
      const { data, error } = await supabase
        .from("supporting_exams")
        .select("*")
        .in("follow_up_id", followUpIds)
        .eq("user_id", userId);

      if (error) throw error;
      supportingExamRows = (data ?? []) as SupportingExamRow[];
    }

    if (supportingExamRows.length) {
      const { error } = await supabase
        .from("supporting_exams")
        .delete()
        .in(
          "id",
          supportingExamRows.map((exam) => exam.id),
        )
        .eq("user_id", userId);

      if (error) throw error;
    }

    if (followUpRows.length) {
      const { error } = await supabase
        .from("follow_ups")
        .delete()
        .in(
          "id",
          followUpRows.map((followUp) => followUp.id),
        )
        .eq("user_id", userId);

      if (error) throw error;
    }

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

    remotePatientDeleted = true;

    try {
      const localDeleted = await deletePatient(patient.id);

      if (!localDeleted) {
        throw new Error("Pasien tidak ditemukan pada penyimpanan lokal.");
      }
    } catch (localError) {
      const rotationMap = readMap(ROTATION_ID_MAP_KEY);
      const remoteRotationId =
        rotationMap[patient.rotationId] ?? patient.rotationId;

      const { error: restorePatientError } = await supabase
        .from("patients")
        .upsert(
          {
            id: remotePatientId,
            user_id: userId,
            ...patientPayload(patient, remoteRotationId),
          },
          { onConflict: "id" },
        );

      if (restorePatientError) {
        savePatients(previousPatients);
        throw new Error(
          "Penghapusan gagal dan pemulihan pasien di Supabase juga gagal.",
        );
      }

      if (followUpRows.length) {
        const { error: restoreFollowUpsError } = await supabase
          .from("follow_ups")
          .upsert(followUpRows, { onConflict: "id" });

        if (restoreFollowUpsError) {
          savePatients(previousPatients);
          throw new Error(
            "Penghapusan gagal dan pemulihan riwayat follow-up di Supabase juga gagal.",
          );
        }
      }

      if (supportingExamRows.length) {
        const { error: restoreExamsError } = await supabase
          .from("supporting_exams")
          .upsert(supportingExamRows, { onConflict: "id" });

        if (restoreExamsError) {
          savePatients(previousPatients);
          throw new Error(
            "Penghapusan gagal dan pemulihan lampiran pemeriksaan di Supabase juga gagal.",
          );
        }
      }

      throw localError;
    }

    delete patientMap[patient.id];
    saveMap(PATIENT_ID_MAP_KEY, patientMap);
    return true;
  } catch (error) {
    if (remotePatientDeleted) {
      // The local rollback above already attempts to restore remote data.
      // Keep this catch focused on restoring the local patient snapshot.
      savePatients(previousPatients);
    } else {
      savePatients(previousPatients);
    }

    throw new Error(getErrorMessage(error));
  }
}
