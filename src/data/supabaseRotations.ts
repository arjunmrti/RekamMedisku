import type {
  Rotation,
  RotationSpecialty,
  RotationStatus,
} from "../types/rotation";
import {
  activateRotation as saveLocalActiveRotation,
  loadActiveRotationId,
  loadRotations,
  saveRotations,
  setActiveRotationId,
  upsertRotation as saveLocalRotation,
} from "./localRotations";
import { supabase } from "../utils/supabase";

type RotationRow = {
  id: string;
  user_id: string;
  name: string;
  specialty: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RotationIdMap = Record<string, string>;

const ROTATION_ID_MAP_KEY = "rekammedisku:supabase-rotation-ids";

const ROTATION_SPECIALTIES: RotationSpecialty[] = [
  "Neurologi",
  "Ilmu Penyakit Dalam",
  "Bedah",
  "Pediatri",
  "Obgyn",
  "Lainnya",
];

const ROTATION_STATUSES: RotationStatus[] = [
  "Aktif",
  "Selesai",
  "Mendatang",
];

function readIdMap(): RotationIdMap {
  try {
    const raw = window.localStorage.getItem(ROTATION_ID_MAP_KEY);
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

function saveIdMap(map: RotationIdMap) {
  window.localStorage.setItem(ROTATION_ID_MAP_KEY, JSON.stringify(map));
}

function getRemoteId(localId: string, map: RotationIdMap) {
  return map[localId] ?? null;
}

function normalizeSpecialty(value: string): RotationSpecialty {
  return ROTATION_SPECIALTIES.includes(value as RotationSpecialty)
    ? (value as RotationSpecialty)
    : "Lainnya";
}

function normalizeStatus(value: string): RotationStatus {
  return ROTATION_STATUSES.includes(value as RotationStatus)
    ? (value as RotationStatus)
    : "Mendatang";
}

function toRotation(row: RotationRow, localId: string): Rotation {
  return {
    id: localId,
    name: row.name,
    specialty: normalizeSpecialty(row.specialty),
    startDate: row.start_date,
    endDate: row.end_date,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isSameRotation(a: Rotation, b: RotationRow) {
  return (
    a.name === b.name &&
    a.specialty === normalizeSpecialty(b.specialty) &&
    a.startDate === b.start_date &&
    a.endDate === b.end_date
  );
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

async function insertLocalRotation(
  rotation: Rotation,
  userId: string,
  idMap: RotationIdMap,
) {
  const { data, error } = await supabase
    .from("rotations")
    .insert({
      user_id: userId,
      name: rotation.name,
      specialty: rotation.specialty,
      start_date: rotation.startDate,
      end_date: rotation.endDate,
      status: rotation.status,
    })
    .select()
    .single<RotationRow>();

  if (error) throw error;

  idMap[rotation.id] = data.id;
  return data;
}

function mergeRotationIntoLocal(
  rotations: Rotation[],
  nextRotation: Rotation,
): Rotation[] {
  const existingIndex = rotations.findIndex(
    (rotation) => rotation.id === nextRotation.id,
  );

  if (existingIndex === -1) {
    return [...rotations, nextRotation];
  }

  return rotations.map((rotation, index) =>
    index === existingIndex ? nextRotation : rotation,
  );
}

/**
 * Sync the local rotation workspace with the authenticated user's Supabase
 * rows while keeping the app's existing local IDs stable.
 */
export async function syncRotationsWithSupabase(): Promise<Rotation[]> {
  const userId = await getCurrentUserId();
  const localRotations = loadRotations();
  const idMap = readIdMap();

  const { data: remoteRows, error } = await supabase
    .from("rotations")
    .select(
      "id,user_id,name,specialty,start_date,end_date,status,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  let nextLocal = [...localRotations];
  const remoteIds = new Set((remoteRows ?? []).map((row) => row.id));

  for (const row of (remoteRows ?? []) as RotationRow[]) {
    let localId =
      Object.entries(idMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      null;

    if (!localId) {
      const matchingLocal = nextLocal.find(
        (rotation) =>
          !getRemoteId(rotation.id, idMap) && isSameRotation(rotation, row),
      );

      localId = matchingLocal?.id ?? row.id;
      idMap[localId] = row.id;
    }

    nextLocal = mergeRotationIntoLocal(
      nextLocal,
      toRotation(row, localId),
    );
  }

  for (const localRotation of localRotations) {
    const mappedRemoteId = getRemoteId(localRotation.id, idMap);

    if (mappedRemoteId && remoteIds.has(mappedRemoteId)) {
      continue;
    }

    const insertedRow = await insertLocalRotation(
      localRotation,
      userId,
      idMap,
    );

    nextLocal = mergeRotationIntoLocal(
      nextLocal,
      toRotation(insertedRow as RotationRow, localRotation.id),
    );
  }

  saveIdMap(idMap);
  saveRotations(nextLocal);

  const activeId = loadActiveRotationId();
  if (nextLocal.some((rotation) => rotation.id === activeId)) {
    setActiveRotationId(activeId);
  }

  return nextLocal;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Gagal menyimpan perubahan stase ke Supabase.";
}

/**
 * Save a rotation locally first, then persist the same change remotely.
 * Restore the previous local state when the remote write fails.
 */
export async function upsertRotationWithSupabase(input: {
  id?: string;
  name: string;
  specialty: RotationSpecialty;
  startDate: string;
  endDate: string;
  status: RotationStatus;
}): Promise<Rotation[]> {
  const previousRotations = loadRotations();
  const previousActiveId = loadActiveRotationId();
  const localId = input.id ?? "rotation-" + Date.now();

  try {
    const localResult = saveLocalRotation({
      ...input,
      id: localId,
    });

    const nextRotation = localResult.find(
      (rotation) => rotation.id === localId,
    );

    if (!nextRotation) {
      throw new Error("Stase gagal disiapkan untuk disimpan.");
    }

    const userId = await getCurrentUserId();
    const idMap = readIdMap();
    const remoteId = getRemoteId(localId, idMap);

    let remoteRow: RotationRow;

    if (remoteId) {
      const { data, error } = await supabase
        .from("rotations")
        .update({
          name: nextRotation.name,
          specialty: nextRotation.specialty,
          start_date: nextRotation.startDate,
          end_date: nextRotation.endDate,
          status: nextRotation.status,
        })
        .eq("id", remoteId)
        .eq("user_id", userId)
        .select()
        .single<RotationRow>();

      if (error) throw error;
      remoteRow = data;
    } else {
      remoteRow = (await insertLocalRotation(
        nextRotation,
        userId,
        idMap,
      )) as RotationRow;
    }

    idMap[localId] = remoteRow.id;
    saveIdMap(idMap);

    if (nextRotation.status === "Aktif") {
      const { error: deactivateError } = await supabase
        .from("rotations")
        .update({ status: "Selesai" })
        .eq("user_id", userId)
        .eq("status", "Aktif")
        .neq("id", remoteRow.id);

      if (deactivateError) throw deactivateError;
    }

    return await syncRotationsWithSupabase();
  } catch (error) {
    saveRotations(previousRotations);
    setActiveRotationId(previousActiveId);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Change the active rotation both locally and remotely.
 */
export async function activateRotationWithSupabase(
  rotationId: string,
): Promise<Rotation[]> {
  const previousRotations = loadRotations();
  const previousActiveId = loadActiveRotationId();

  try {
    const target = previousRotations.find(
      (rotation) => rotation.id === rotationId,
    );

    if (!target) {
      throw new Error("Stase yang dipilih tidak ditemukan.");
    }

    const userId = await getCurrentUserId();
    const idMap = readIdMap();
    let remoteId = getRemoteId(rotationId, idMap);

    if (!remoteId) {
      await syncRotationsWithSupabase();
      Object.assign(idMap, readIdMap());
      remoteId = getRemoteId(rotationId, idMap);
    }

    if (!remoteId) {
      throw new Error("Stase belum tersinkron ke Supabase.");
    }

    const { error: activateError } = await supabase
      .from("rotations")
      .update({ status: "Aktif" })
      .eq("id", remoteId)
      .eq("user_id", userId);

    if (activateError) throw activateError;

    const { error: deactivateError } = await supabase
      .from("rotations")
      .update({ status: "Selesai" })
      .eq("user_id", userId)
      .eq("status", "Aktif")
      .neq("id", remoteId);

    if (deactivateError) throw deactivateError;

    saveLocalActiveRotation(rotationId);

    return await syncRotationsWithSupabase();
  } catch (error) {
    saveRotations(previousRotations);
    setActiveRotationId(previousActiveId);
    throw new Error(getErrorMessage(error));
  }
}
