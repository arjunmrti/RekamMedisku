import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type {
  SlaberanReportOptions,
  SlaberanTemplate,
} from "../types/slaberan";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

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

export function getLatestFollowUp(
  entries: FollowUpEntry[] | undefined,
) {
  if (!entries?.length) return null;

  return [...entries]
    .filter((entry) => entry.status === "Tersimpan")
    .sort((a, b) =>
      (b.isoDate + b.time).localeCompare(a.isoDate + a.time),
    )[0] ?? null;
}

export function getDiagnosisSummary(
  entries: FollowUpEntry[] | undefined,
) {
  const latest = getLatestFollowUp(entries);
  if (!latest?.assessment?.trim()) return "";

  const firstLine = latest.assessment
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "";

  return firstLine.replace(/^\d+[.)]\s*/, "").trim();
}

function formatSlaberanDate(date: string) {
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

function groupPatientsByRoom(
  patients: PatientListItem[],
  room: string,
) {
  const target = normalizeText(room);

  return patients.filter(
    (patient) => normalizeText(patient.room) === target,
  );
}

function patientMatchesDoctor(
  patient: PatientListItem,
  doctor: string,
) {
  return normalizeSlaberanDoctorName(patient.doctor) === doctor;
}

function buildPatientLine(
  patient: PatientListItem,
  index: number,
  followUpsByPatient: Record<string, FollowUpEntry[]>,
) {
  const diagnosis =
    getDiagnosisSummary(followUpsByPatient[patient.id]) || "Belum ada diagnosis";

  return (
    String(index) +
    ". " +
    patient.name +
    "/" +
    patient.age +
    " Tahun/RM " +
    patient.rm +
    "/" +
    patient.doctor +
    "/" +
    patient.bed +
    "/" +
    diagnosis
  );
}

function appendRoom(
  lines: string[],
  room: string,
  patients: PatientListItem[],
  showEmptyRooms: boolean,
  followUpsByPatient: Record<string, FollowUpEntry[]>,
) {
  const roomPatients = groupPatientsByRoom(patients, room);

  if (!showEmptyRooms && roomPatients.length === 0) return;

  lines.push(
    roomPatients.length > 0
      ? "*" + room + " (" + roomPatients.length + ")*"
      : room + " (0)",
  );

  roomPatients.forEach((patient, index) => {
    lines.push(buildPatientLine(patient, index + 1, followUpsByPatient));
  });
}

export function buildSlaberanReport(
  template: SlaberanTemplate,
  options: SlaberanReportOptions,
) {
  const normalizedDoctor = normalizeSlaberanDoctorName(options.doctor);
  const filteredPatients = options.patients.filter((patient) =>
    patientMatchesDoctor(patient, normalizedDoctor),
  );

  const lines = [
    template.opening,
    "",
    "*" +
      "Slaberan Pasien " +
      template.specialty +
      " (" +
      normalizedDoctor +
      ")*",
    "*" + template.hospital + "*",
    formatSlaberanDate(options.date),
    "",
  ];

  template.locationGroups.forEach((group, groupIndex) => {
    if (groupIndex > 0) lines.push("");
    lines.push("*" + group.label + "*");

    group.rooms.forEach((room) => {
      appendRoom(
        lines,
        room,
        filteredPatients,
        template.showEmptyRooms,
        options.followUpsByPatient,
      );
    });
  });

  lines.push("");

  template.specialRooms.forEach((room) => {
    appendRoom(
      lines,
      room,
      filteredPatients,
      template.showEmptyRooms,
      options.followUpsByPatient,
    );
  });

  lines.push("");
  lines.push("Keterangan:");
  lines.push(normalizedDoctor + " = " + filteredPatients.length);
  lines.push("Total pasien = " + filteredPatients.length);

  return lines.join("\n");
}
