import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type {
  ReportReporterProfile,
  ReportTemplateType,
} from "../types/report";
import type { RotationSpecialty } from "../types/rotation";

function cleanBlock(value: string) {
  const text = value.trim();
  return text || "Belum ada catatan.";
}

function cleanOptional(value: string | undefined) {
  return value?.trim() ?? "";
}

function formatIsoDateForReport(date: string | undefined) {
  if (!date) return "";
  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function formatReportDate(date: string) {
  return date || "Tanggal belum tersedia";
}

export function getReportGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 11) return "Selamat pagi Dok";
  if (hour < 15) return "Selamat siang Dok";
  if (hour < 18) return "Selamat sore Dok";
  return "Selamat malam Dok";
}

export function getReportTemplateForSpecialty(
  specialty: RotationSpecialty | undefined,
): ReportTemplateType | null {
  if (specialty === "Neurologi") return "Neurologi";
  if (specialty === "Ilmu Penyakit Dalam") return "Ilmu Penyakit Dalam";
  return null;
}

function getTemplateObjective(
  objective: string,
  templateType: ReportTemplateType,
) {
  const lines = objective
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const neurologyPrefixes = [
    "Kesadaran:",
    "GCS E/M/V:",
    "FKL:",
    "N. Cranialis:",
    "Pupil:",
    "Kaku Kuduk:",
    "Brudzinski I & II:",
    "Kernig:",
    "Pergerakan:",
    "Tonus:",
    "Sensorik:",
    "Kekuatan Ekstremitas Superior:",
    "Kekuatan Ekstremitas Inferior:",
    "Refleks Fisiologis:",
    "Refleks Patologis:",
    "Otonom BAB/BAK:",
    "Tes Provokasi Saraf:",
  ];

  const internalMedicinePrefixes = [
    "Keadaan Umum:",
    "Kesadaran:",
    "Kepala & Leher:",
    "Thoraks:",
    "Abdomen:",
    "Ekstremitas:",
    "Temuan Sistemik Relevan:",
  ];

  const prefixes =
    templateType === "Neurologi"
      ? neurologyPrefixes
      : internalMedicinePrefixes;

  return [
    ...new Set(
      lines.filter((line) =>
        prefixes.some((prefix) => line.startsWith(prefix)),
      ),
    ),
  ];
}

function getObjectiveWithoutTemplateSection(
  objective: string,
  templateType: ReportTemplateType,
) {
  const templateLines = new Set(getTemplateObjective(objective, templateType));

  return objective
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !templateLines.has(line))
    .join("\n");
}

type BuildWhatsAppReportOptions = {
  rotationName?: string;
  reporter?: ReportReporterProfile;
};

function buildOpening(
  rotationName: string,
  reporter?: ReportReporterProfile,
) {
  if (
    reporter &&
    cleanOptional(reporter.name) &&
    cleanOptional(reporter.stambuk) &&
    cleanOptional(reporter.program)
  ) {
    return [
      "Assalamualaikum warahmatullahi wabarakatuh dok. Tabe dok, mohon izin dok.",
      "Perkenalkan saya " +
        reporter.name.trim() +
        " dengan Stambuk " +
        reporter.stambuk.trim() +
        " " +
        reporter.program.trim() +
        " Stase " +
        rotationName +
        ".",
      "Mohon izin melaporkan follow-up pasien:",
    ].join(" ");
  }

  return [
    "Assalamualaikum warahmatullahi wabarakatuh dok. Tabe dok, mohon izin dok.",
    "Mohon izin melaporkan follow-up pasien:",
  ].join(" ");
}

export function buildWhatsAppReport(
  patient: PatientListItem,
  followUp: FollowUpEntry,
  templateType: ReportTemplateType,
  options: BuildWhatsAppReportOptions = {},
) {
  const exams = followUp.supportingExams ?? [];
  const rotationName = options.rotationName?.trim() || templateType;
  const planning =
    followUp.planning?.trim() ||
    followUp.plan?.trim() ||
    "Belum ada catatan.";
  const instruction = followUp.instruction?.trim() || "Belum ada catatan.";

  const templateObjective = getTemplateObjective(
    followUp.objective,
    templateType,
  );
  const generalObjective = getObjectiveWithoutTemplateSection(
    followUp.objective,
    templateType,
  );

  const templateHeading =
    templateType === "Neurologi"
      ? "Pemeriksaan neurologis:"
      : "Pemeriksaan sistemik Ilmu Penyakit Dalam:";

  const templateBlock =
    templateObjective.length > 0
      ? templateHeading +
        "\n" +
        templateObjective.map((line) => "- " + line).join("\n")
      : templateHeading + "\nBelum ada catatan.";

  const supportingBlock =
    exams.length > 0
      ? exams
          .map((exam) => "- " + exam.name + " · " + exam.date)
          .join("\n")
      : "Belum ada pemeriksaan penunjang.";

  return [
    buildOpening(rotationName, options.reporter),
    "",
    "Nama: " + patient.name,
    "Umur: " + patient.age + " tahun",
    "RM: " + patient.rm,
    "Ruangan: " + patient.room,
    "Bed: " + patient.bed,
    "DPJP: " + patient.doctor,
    "Stase: " + rotationName,
    "Tanggal Masuk: " + formatIsoDateForReport(patient.admissionDate),
    "Tanggal Follow-Up: " + formatReportDate(followUp.date),
    "",
    "S:",
    cleanBlock(followUp.subjective),
    "",
    "O:",
    cleanBlock(generalObjective),
    "",
    templateBlock,
    "",
    "Pemeriksaan penunjang:",
    supportingBlock,
    "",
    "A:",
    cleanBlock(followUp.assessment),
    "",
    "P: " + planning,
    "I: " + instruction,
    "",
    "Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻",
  ]
    .filter((line, index, lines) => {
      if (line !== "") return true;
      return lines[index - 1] !== "";
    })
    .join("\n");
}
