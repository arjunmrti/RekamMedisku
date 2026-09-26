import type { PatientListItem } from "../types/patient";

export function isActivePatientInRotation(
  patient: PatientListItem | null,
  activeRotationId: string,
): patient is PatientListItem {
  return Boolean(
    patient &&
      activeRotationId &&
      patient.rotationId === activeRotationId &&
      patient.status === "Aktif",
  );
}
