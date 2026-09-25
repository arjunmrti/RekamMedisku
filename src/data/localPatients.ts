import { mockPatients } from "./mockPatients";
import type { PatientListItem } from "../types/patient";

const PATIENTS_KEY = "rekammedisku:patients";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadPatients(): PatientListItem[] {
  return readJson<PatientListItem[]>(PATIENTS_KEY, mockPatients).map((patient) => ({
    ...patient,
    rotationId: patient.rotationId ?? "rotation-neurologi",
  }));
}

export function savePatients(patients: PatientListItem[]) {
  window.localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function replacePatients(patients: PatientListItem[]) {
  window.localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}
