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
import { workspaceStorageKey } from "./workspaceStorage";

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

const ROTATION_ID_MAP_KEY = "supabase-rotation-ids";

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
    const raw = window.localStorage.getItem(workspaceStorageKey(ROTATION_ID_MAP_KEY));
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
  window.localStorage.setItem(workspaceStorageKey(ROTATION_ID_MAP_KEY), JSON.stringify(map));
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

  // Discard mappings for remote rotations that no longer exist before
  // matching current rows. This lets a recreated rotation reuse its local ID
  // instead of being treated as a brand-new workspace.
  for (const [localId, remoteId] of Object.entries(idMap)) {
    if (!remoteIds.has(remoteId)) {
      delete idMap[localId];
    }
  }

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
  } else {
    setActiveRotationId("");
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
  let remoteCommitted = false;

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

    const idMap = readIdMap();
    const remoteId = getRemoteId(localId, idMap);

    const { data, error } = await supabase.rpc(
      "upsert_rotation_with_activation",
      {
        p_rotation_id: remoteId,
        p_expected_updated_at:
          input.updatedAt ??
          previousRotations.find((rotation) => rotation.id === localId)
            ?.updatedAt ??
          null,
        p_name: nextRotation.name,
        p_specialty: nextRotation.specialty,
        p_start_date: nextRotation.startDate,
        p_end_date: nextRotation.endDate,
        p_status: nextRotation.status,
      },
    );

    if (error) throw error;

    remoteCommitted = true;

    const rows = (data ?? []) as RotationRow[];

    if (!rows.length) {
      throw new Error(
        "Supabase tidak mengembalikan data stase setelah penyimpanan.",
      );
    }

    let nextLocal: Rotation[] = [];

    for (const row of rows) {
      const localRotationId =
        Object.entries(idMap).find(
          ([, mappedRemoteId]) => mappedRemoteId === row.id,
        )?.[0] ??
        (row.id === remoteId ? localId : row.id);

      idMap[localRotationId] = row.id;
      nextLocal = mergeRotationIntoLocal(
        nextLocal,
        toRotation(row, localRotationId),
      );
    }

    saveRotations(nextLocal);

    const activeRemoteRow =
      rows.find((row) => normalizeStatus(row.status) === "Aktif") ?? null;

    if (activeRemoteRow) {
      const activeLocalId =
        Object.entries(idMap).find(
          ([, mappedRemoteId]) => mappedRemoteId === activeRemoteRow.id,
        )?.[0] ?? activeRemoteRow.id;

      setActiveRotationId(activeLocalId);
    } else {
      setActiveRotationId("");
    }

    try {
      saveIdMap(idMap);
    } catch (mapError) {
      console.warn(
        "Rotation ID mapping could not be persisted; the next workspace sync will recover it.",
        mapError,
      );
    }

    return nextLocal;
  } catch (error) {
    if (!remoteCommitted) {
      saveRotations(previousRotations);
      setActiveRotationId(previousActiveId);
    } else {
      console.warn(
        "Cloud rotation mutation committed, but a later local step failed. Keeping the local state instead of rolling it back.",
        error,
      );
    }

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
  let remoteCommitted = false;

  try {
    const target = previousRotations.find(
      (rotation) => rotation.id === rotationId,
    );

    if (!target) {
      throw new Error("Stase yang dipilih tidak ditemukan.");
    }

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

    const { data: activatedRows, error: activationError } =
      await supabase.rpc("activate_rotation", {
        target_rotation_id: remoteId,
      });

    if (activationError) throw activationError;

    remoteCommitted = true;

    const rows = (activatedRows ?? []) as RotationRow[];
    let nextLocal = previousRotations;

    if (rows.length) {
      for (const row of rows) {
        const localId =
          Object.entries(idMap).find(
            ([, mappedRemoteId]) => mappedRemoteId === row.id,
          )?.[0] ?? row.id;

        idMap[localId] = row.id;
        nextLocal = mergeRotationIntoLocal(
          nextLocal,
          toRotation(row, localId),
        );
      }
    } else {
      nextLocal = mergeRotationIntoLocal(
        nextLocal,
        toRotation(
          {
            ...target,
            id: remoteId,
            user_id: "",
            created_at: target.createdAt ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
            start_date: target.startDate,
            end_date: target.endDate,
          },
          rotationId,
        ),
      );
    }

    saveRotations(nextLocal);
    saveLocalActiveRotation(rotationId);

    try {
      saveIdMap(idMap);
    } catch (mapError) {
      console.warn(
        "Rotation ID mapping could not be persisted.",
        mapError,
      );
    }

    return nextLocal;
  } catch (error) {
    if (!remoteCommitted) {
      saveRotations(previousRotations);
      setActiveRotationId(previousActiveId);
    } else {
      console.warn(
        "Cloud rotation activation committed, but a local follow-up step failed. Keeping the local state instead of rolling it back.",
        error,
      );
    }

    throw new Error(getErrorMessage(error));
  }
}
