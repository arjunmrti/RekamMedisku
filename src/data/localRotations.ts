import type { Rotation, RotationStatus, RotationSpecialty } from "../types/rotation";
import { workspaceStorageKey } from "./workspaceStorage";

const ROTATIONS_KEY = "rotations";
const ACTIVE_ROTATION_KEY = "active-rotation";

const LEGACY_DEMO_ROTATION_IDS = new Set([
  "rotation-neurologi",
  "rotation-interna",
  "rotation-bedah",
  "rotation-pediatri",
  "rotation-obgyn",
]);

export const DEFAULT_ROTATIONS: Rotation[] = [];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadRotations(): Rotation[] {
  const raw = window.localStorage.getItem(workspaceStorageKey(ROTATIONS_KEY));

  if (!raw) {
    return [];
  }

  const stored = readJson<unknown>(workspaceStorageKey(ROTATIONS_KEY), null);

  if (Array.isArray(stored) && stored.length > 0) {
    const migrationsApplied = stored.filter(
      (rotation): rotation is Rotation =>
        typeof rotation === "object" &&
        rotation !== null &&
        !LEGACY_DEMO_ROTATION_IDS.has(
          (rotation as { id?: unknown }).id as string,
        ),
    ) as Rotation[];

    if (migrationsApplied.length !== stored.length) {
      saveRotations(migrationsApplied);
      return migrationsApplied;
    }

    return migrationsApplied;
  }

  return [];
}

export function saveRotations(rotations: Rotation[]) {
  window.localStorage.setItem(workspaceStorageKey(ROTATIONS_KEY), JSON.stringify(rotations));
}

export function loadActiveRotationId(): string {
  const storedId = window.localStorage.getItem(workspaceStorageKey(ACTIVE_ROTATION_KEY));
  const rotations = loadRotations();

  const storedRotation = rotations.find((rotation) => rotation.id === storedId);
  if (storedRotation?.status === "Aktif") {
    return storedRotation.id;
  }

  return rotations.find((rotation) => rotation.status === "Aktif")?.id ?? "";
}

export function loadActiveRotation(): Rotation {
  const rotations = loadRotations();
  const activeId = loadActiveRotationId();

  return (
    rotations.find((rotation) => rotation.id === activeId) ??
    {
      id: "",
      name: "Belum ada stase",
      specialty: "Lainnya",
      startDate: "",
      endDate: "",
      status: "Mendatang",
      followUpTemplateId: undefined,
      followUpTemplateVersion: undefined,
      reportTemplateId: undefined,
      reportTemplateVersion: undefined,
      createdAt: "",
      updatedAt: "",
    }
  );
}

export function setActiveRotationId(rotationId: string) {
  window.localStorage.setItem(workspaceStorageKey(ACTIVE_ROTATION_KEY), rotationId);
}

export function activateRotation(rotationId: string): Rotation[] {
  const rotations = loadRotations();
  const now = new Date().toISOString();

  const target = rotations.find((rotation) => rotation.id === rotationId);
  if (!target) return rotations;

  const updated = rotations.map((rotation) => {
    if (rotation.id === rotationId) {
      return {
        ...rotation,
        status: "Aktif" as RotationStatus,
        updatedAt: now,
      };
    }

    if (rotation.status === "Aktif") {
      return {
        ...rotation,
        status: "Selesai" as RotationStatus,
        updatedAt: now,
      };
    }

    return rotation;
  });

  saveRotations(updated);
  setActiveRotationId(rotationId);
  return updated;
}

export function upsertRotation(input: {
  id?: string;
  name: string;
  specialty: RotationSpecialty;
  startDate: string;
  endDate: string;
  status: RotationStatus;
  followUpTemplateId?: string;
  followUpTemplateVersion?: number;
  reportTemplateId?: string;
  reportTemplateVersion?: number;
}): Rotation[] {
  const rotations = loadRotations();
  const now = new Date().toISOString();
  const id = input.id ?? "rotation-" + Date.now();

  const existing = rotations.find((rotation) => rotation.id === id);
  const activeId = loadActiveRotationId();
  if (!input.name.trim() || !input.startDate || !input.endDate) {
    return rotations;
  }

  const next: Rotation = {
    id,
    name: input.name.trim(),
    specialty: input.specialty,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    followUpTemplateId: input.followUpTemplateId,
    followUpTemplateVersion: input.followUpTemplateVersion,
    reportTemplateId: input.reportTemplateId,
    reportTemplateVersion: input.reportTemplateVersion,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const exists = rotations.some((rotation) => rotation.id === id);
  const updated = exists
    ? rotations.map((rotation) => (rotation.id === id ? next : rotation))
    : [...rotations, next];

  if (next.status === "Aktif") {
    const normalized = updated.map((rotation) =>
      rotation.id === next.id
        ? rotation
        : rotation.status === "Aktif"
          ? { ...rotation, status: "Selesai" as RotationStatus, updatedAt: now }
          : rotation,
    );
    saveRotations(normalized);
    setActiveRotationId(next.id);
    return normalized;
  }

  saveRotations(updated);

  if (id === activeId) {
    setActiveRotationId("");
  }

  return updated;
}

export function removeRotation(rotationId: string) {
  const rotations = loadRotations();
  const activeId = loadActiveRotationId();

  if (rotationId === activeId) return rotations;

  const updated = rotations.filter((rotation) => rotation.id !== rotationId);
  saveRotations(updated);
  return updated;
}
