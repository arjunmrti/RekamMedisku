import { deleteAttachments } from "./localAttachments";
import {
  deleteFollowUpsForPatient,
  getOtherPatientFollowUpAttachmentIds,
  getPatientFollowUpAttachmentIds,
} from "./localFollowUps";
import type { PatientListItem, PatientStatus } from "../types/patient";
import { workspaceStorageKey } from "./workspaceStorage";
import {
  normalizePatientAdmissionLocation,
  normalizePatientLocation,
} from "../utils/patientLocation";

const PATIENTS_KEY = "patients";

const LEGACY_DEMO_PATIENT_IDS = new Set([
  "p-rotation-interna-24012607-demo",
  "p-24012601",
  "p-24012602",
  "p-24012603",
  "p-24012604",
  "p-24012605",
  "p-24012606",
]);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizePatient(patient: PatientListItem): PatientListItem {
  // Never invent a rotation for legacy/incomplete local records. An empty
  // rotationId keeps the record isolated until an authoritative Supabase sync
  // supplies its real rotation context.
  const rotationId =
    typeof patient.rotationId === "string" ? patient.rotationId.trim() : "";
  const currentLocation = normalizePatientLocation(
    patient.currentLocation,
    patient.room,
    patient.bed,
  );
  const room = currentLocation.name || patient.room.trim();

  return {
    ...patient,
    rotationId,
    room,
    bed: currentLocation.bed,
    currentLocation: {
      ...currentLocation,
      name: room,
    },
    admissionLocation: normalizePatientAdmissionLocation(
      patient.admissionLocation,
    ),
    lastFollowUpAt: patient.lastFollowUpAt ?? undefined,
    createdAt: patient.createdAt ?? undefined,
    admissionDate: patient.admissionDate ?? undefined,
  };
}

function removeLegacyDemoPatients(patients: PatientListItem[]) {
  return patients.filter((patient) => !LEGACY_DEMO_PATIENT_IDS.has(patient.id));
}

export function loadPatients(): PatientListItem[] {
  const stored = window.localStorage.getItem(workspaceStorageKey(PATIENTS_KEY));

  if (!stored) {
    return [];
  }

  const parsed = readJson<unknown>(workspaceStorageKey(PATIENTS_KEY), null);

  if (!Array.isArray(parsed)) {
    return [];
  }

  const patients = parsed
    .filter(
      (patient): patient is PatientListItem =>
        typeof patient === "object" && patient !== null,
    )
    .map(normalizePatient);

  const cleanedPatients = removeLegacyDemoPatients(patients);

  if (cleanedPatients.length !== patients.length) {
    savePatients(cleanedPatients);
  }

  return cleanedPatients;
}

export function savePatients(patients: PatientListItem[]) {
  window.localStorage.setItem(workspaceStorageKey(PATIENTS_KEY), JSON.stringify(patients));
}

export function replacePatients(patients: PatientListItem[]) {
  savePatients(patients);
}

export async function deletePatient(patientId: string): Promise<boolean> {
  const patients = loadPatients();
  const patientExists = patients.some((patient) => patient.id === patientId);

  if (!patientExists) return false;

  const attachmentIds = getPatientFollowUpAttachmentIds(patientId);
  const sharedAttachmentIds = getOtherPatientFollowUpAttachmentIds(patientId);
  const deletableAttachmentIds = attachmentIds.filter(
    (attachmentId) => !sharedAttachmentIds.has(attachmentId),
  );
  const remainingPatients = patients.filter((patient) => patient.id !== patientId);
  const rollbackFollowUps = deleteFollowUpsForPatient(patientId);

  try {
    savePatients(remainingPatients);
    await deleteAttachments(deletableAttachmentIds);
  } catch (error) {
    try {
      savePatients(patients);
      rollbackFollowUps();
    } catch {
      throw new Error(
        "Penghapusan pasien gagal dan pemulihan data lokal juga gagal.",
      );
    }

    throw error;
  }

  return true;
}

export function updatePatient(
  patientId: string,
  updates: Partial<PatientListItem>,
): PatientListItem | null {
  const patients = loadPatients();
  const index = patients.findIndex((patient) => patient.id === patientId);

  if (index === -1) return null;

  const updatedPatient = {
    ...patients[index],
    ...updates,
  };

  patients[index] = updatedPatient;
  savePatients(patients);
  return updatedPatient;
}

export function setPatientStatus(
  patientId: string,
  status: PatientStatus,
): PatientListItem | null {
  return updatePatient(patientId, { status });
}

export function createPatientId(rotationId: string, rm: string): string {
  const normalizedRotation = rotationId.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  const normalizedRm = rm.trim().replace(/[^a-zA-Z0-9_-]/g, "-");

  return "p-" + normalizedRotation + "-" + normalizedRm + "-" + crypto.randomUUID();
}
