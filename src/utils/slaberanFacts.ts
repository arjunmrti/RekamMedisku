import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";

export function normalizeSlaberanDoctorName(value: string) {
  return value.replace(/\s*\(konsul\)\s*$/i, "").trim();
}

export function getSlaberanDoctorOptions(patients: PatientListItem[]) {
  return Array.from(
    new Set(
      patients
        .map((patient) => normalizeSlaberanDoctorName(patient.doctor))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "id"));
}

export function getLatestFollowUp(entries: FollowUpEntry[] | undefined) {
  if (!entries?.length) return null;

  return (
    [...entries]
      .filter((entry) => entry.status === "Tersimpan")
      .sort((a, b) =>
        (b.isoDate + b.time).localeCompare(a.isoDate + a.time),
      )[0] ?? null
  );
}

export function getDiagnosisSummary(entries: FollowUpEntry[] | undefined) {
  const latest = getLatestFollowUp(entries);
  if (!latest?.assessment?.trim()) return "";

  const firstLine = latest.assessment
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.replace(/^\d+[.)]\s*/, "").trim() : "";
}

export function formatSlaberanDate(date: string) {
  if (!date) return "Tanggal belum diisi";

  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return "Tanggal belum diisi";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}