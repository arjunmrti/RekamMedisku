import type { PatientListItem, PatientStatus } from "../types/patient";

const PATIENTS_KEY = "rekammedisku:patients";

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
  return {
    ...patient,
    rotationId: patient.rotationId ?? "rotation-neurologi",
    lastFollowUpAt: patient.lastFollowUpAt ?? undefined,
    createdAt: patient.createdAt ?? undefined,
    admissionDate: patient.admissionDate ?? undefined,
  };
}

function removeLegacyDemoPatients(patients: PatientListItem[]) {
  return patients.filter((patient) => !LEGACY_DEMO_PATIENT_IDS.has(patient.id));
}

export function loadPatients(): PatientListItem[] {
  const stored = window.localStorage.getItem(PATIENTS_KEY);

  if (!stored) {
    return [];
  }

  const parsed = readJson<unknown>(PATIENTS_KEY, null);

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
