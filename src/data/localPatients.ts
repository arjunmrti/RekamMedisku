import { mockPatients } from "./mockPatients";
import type { PatientListItem, PatientStatus } from "../types/patient";

const PATIENTS_KEY = "rekammedisku:patients";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizePatient(patient: PatientListItem): PatientListItem {
  return {
    ...patient,
    rotationId: patient.rotationId ?? "rotation-neurologi",
    lastFollowUpAt: patient.lastFollowUpAt ?? undefined,
    createdAt: patient.createdAt ?? undefined,
    admissionDate: patient.admissionDate ?? undefined,
  };
}

export function loadPatients(): PatientListItem[] {
  const stored = window.localStorage.getItem(PATIENTS_KEY);

  if (!stored) {
    const seeded = mockPatients.map(normalizePatient);
    savePatients(seeded);
    return seeded;
  }

  return readJson<PatientListItem[]>(PATIENTS_KEY, []).map(normalizePatient);
}

export function savePatients(patients: PatientListItem[]) {
  window.localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function replacePatients(patients: PatientListItem[]) {
  savePatients(patients);
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
