import type {
  PatientAdmissionLocation,
  PatientLocation,
  PatientLocationType,
} from "../types/patient";

const SPECIAL_LOCATION_NAMES = new Set([
  "icu",
  "igd",
  "cvcu/iccu",
  "cvcu",
  "iccu",
]);

export function normalizePatientLocationType(
  value: unknown,
  fallbackName = "",
): PatientLocationType {
  if (value === "special" || value === "ward") {
    return value;
  }

  return SPECIAL_LOCATION_NAMES.has(fallbackName.trim().toLowerCase())
    ? "special"
    : "ward";
}

export function normalizePatientLocation(
  value: Partial<PatientLocation> | null | undefined,
  fallbackName = "",
  fallbackBed = "",
): PatientLocation {
  const name = (value?.name ?? fallbackName).trim();
  const type = normalizePatientLocationType(value?.type, name);
  const bed = (value?.bed ?? fallbackBed).trim();

  return {
    type,
    name,
    bed,
    ...(value?.locationId?.trim()
      ? { locationId: value.locationId.trim() }
      : {}),
  };
}

export function normalizePatientAdmissionLocation(
  value: Partial<PatientAdmissionLocation> | null | undefined,
): PatientAdmissionLocation | undefined {
  const name = value?.name?.trim() ?? "";
  if (!name) return undefined;

  return {
    type: normalizePatientLocationType(value?.type, name),
    name,
    ...(value?.locationId?.trim()
      ? { locationId: value.locationId.trim() }
      : {}),
  };
}
