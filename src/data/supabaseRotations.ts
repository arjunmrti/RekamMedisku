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

  const rows = (remoteRows ?? []) as RotationRow[];
  const remoteIds = new Set(rows.map((row) => row.id));

  // Supabase is the source of truth once the account has cloud data.
  // Rebuild the browser cache from remote rows so stale rotations cannot
  // resurrect after they were removed or changed elsewhere.
  let nextLocal: Rotation[] = [];

  for (const row of rows) {
    let localId =
      Object.entries(idMap).find(([, remoteId]) => remoteId === row.id)?.[0] ??
      null;

    if (!localId) {
      const matchingLocal = localRotations.find(
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

  // An empty cloud workspace stays empty.
  // Rotations are created explicitly from Stase Saya; stale local data is
  // never promoted back to Supabase automatically.
  for (const [localId, remoteId] of Object.entries(idMap)) {
    if (!remoteIds.has(remoteId)) {
      delete idMap[localId];
    }
  }

  saveIdMap(idMap);
  saveRotations(nextLocal);

  const activeRemoteRow =
    rows.find((row) => normalizeStatus(row.status) === "Aktif") ?? null;

  if (activeRemoteRow) {
    const activeLocalId =
      Object.entries(idMap).find(
        ([, remoteId]) => remoteId === activeRemoteRow.id,
      )?.[0] ?? activeRemoteRow.id;

    setActiveRotationId(activeLocalId);
  } else if (nextLocal.length) {
    const currentActiveId = loadActiveRotationId();

    setActiveRotationId(
      nextLocal.some((rotation) => rotation.id === currentActiveId)
        ? currentActiveId
        : nextLocal[0].id,
    );
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
  updatedAt?: string;
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
      const expectedUpdatedAt =
        input.updatedAt ??
        previousRotations.find((rotation) => rotation.id === localId)?.updatedAt;

      if (!expectedUpdatedAt) {
        throw new Error(
          "Versi data stase tidak tersedia. Muat ulang stase sebelum menyimpan perubahan.",
        );
      }

      const nextUpdatedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("rotations")
        .update({
          name: nextRotation.name,
          specialty: nextRotation.specialty,
          start_date: nextRotation.startDate,
          end_date: nextRotation.endDate,
          status: nextRotation.status,
          updated_at: nextUpdatedAt,
        })
        .eq("id", remoteId)
        .eq("user_id", userId)
        .eq("updated_at", expectedUpdatedAt)
        .select()
        .maybeSingle<RotationRow>();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Data stase sudah berubah di browser lain. Muat ulang data terbaru sebelum menyimpan perubahan.",
        );
      }

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
      const { error: activateError } = await supabase.rpc("activate_rotation", {
        target_rotation_id: remoteRow.id,
      });

      if (activateError) throw activateError;
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

    const { error: activationError } = await supabase.rpc("activate_rotation", {
      target_rotation_id: remoteId,
    });

    if (activationError) throw activationError;

    saveLocalActiveRotation(rotationId);

    return await syncRotationsWithSupabase();
  } catch (error) {
    saveRotations(previousRotations);
    setActiveRotationId(previousActiveId);
    throw new Error(getErrorMessage(error));
  }
}
