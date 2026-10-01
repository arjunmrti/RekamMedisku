import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { ReportTemplateType } from "../types/report";
import type { RotationSpecialty } from "../types/rotation";
import type { ApplicationProfile } from "../types/profile";
import { formatFollowUpTemplateAnswers } from "./followUpTemplateRuntime";

function cleanBlock(value: string) {
  const text = value.trim();
  return text || "Belum ada catatan.";
}

export function formatReportDate(date: string) {
  return date || "Tanggal belum tersedia";
}

const REPORT_MONTH_SUFFIX =
  /\s*[\(\[\{]?\s*(?:\d{4}\s+)?(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)(?:\s+\d{4})?\s*[\)\]\}]?\s*$/i;

export function formatReportRotationName(
  rotationName: string | undefined,
  fallback: string,
) {
  const source = rotationName?.trim() || fallback;
  const compact = source.replace(/\s+/g, " ").trim();

  const withoutMonthSuffix = compact.replace(REPORT_MONTH_SUFFIX, "").trim();

  const withoutRolePrefix = withoutMonthSuffix
    .replace(/^(?:Rotasi|Stase)\s+/i, "")
    .trim();

  return withoutRolePrefix || fallback;
}

function formatAdmissionDate(date: string | undefined) {
  if (!date) return "";

  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
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
    ...new Set(lines.filter((line) => prefixes.some((prefix) => line.startsWith(prefix)))),
  ];
}

function getObjectiveWithoutTemplateSection(
  objective: string,
  templateType: ReportTemplateType,
) {
  const templateLines = new Set(
    getTemplateObjective(objective, templateType),
  );

  return objective
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !templateLines.has(line))
    .join("\n");
}

export type ReportIdentity = Pick<
  ApplicationProfile,
  "name" | "studentId" | "program" | "institution"
>;

type BuildWhatsAppReportOptions = {
  rotationName?: string;
  generatedAt?: Date;
  reportIdentity: ReportIdentity;
};

function formatReportIdentity(
  identity: ReportIdentity,
  rotationName: string,
) {
  const name = identity.name.trim() || "Pengguna RekamMedisku";
  const details = [
    identity.studentId?.trim() ? "dengan Stambuk " + identity.studentId.trim() : "",
    identity.program?.trim() ? identity.program.trim() : "",
    identity.institution?.trim() ? "dari " + identity.institution.trim() : "",
  ].filter(Boolean);

  const detailBlock = details.length > 0 ? " " + details.join(" ") : "";

  return (
    "Perkenalkan saya " +
    name +
    detailBlock +
    " Stase " +
    rotationName +
    ". Mohon izin melaporkan follow-up pasien:"
  );
}

export function buildWhatsAppReport(
  patient: PatientListItem,
  followUp: FollowUpEntry,
  templateType: ReportTemplateType,
  options: BuildWhatsAppReportOptions,
) {
  const exams = followUp.supportingExams ?? [];
  const rotationName = options.rotationName?.trim() || templateType;
  const planning =
    followUp.planning?.trim() ||
    followUp.plan?.trim() ||
    "Belum ada planning.";
  const instruction = followUp.instruction?.trim();

  const planBlock = [
    "P: " + planning,
    instruction ? "I: " + instruction : "",
  ]
    .filter(Boolean)
    .join("\n");

  const subjectiveBlock = [
    patient.admissionComplaint?.trim()
      ? "Keluhan Masuk: " + patient.admissionComplaint.trim()
      : "",
    followUp.subjective.trim()
      ? "Keluhan / Perkembangan Hari Ini: " + followUp.subjective.trim()
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const supportingBlock =
    exams.length > 0
      ? exams
          .map((exam) => {
            const result = exam.result?.trim();
            const attachment = exam.attachmentName?.trim();

            return [
              "- " + exam.name + " · " + exam.date,
              result ? "  " + result : "",
              attachment ? "  Lampiran: " + attachment : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n")
      : followUp.objective.includes("Hasil Penunjang:")
        ? "Data pemeriksaan penunjang mengikuti catatan pada follow-up."
        : "Belum ada pemeriksaan penunjang.";

  const hasGenericTemplate = Boolean(
    followUp.templateSnapshot && followUp.templateAnswers,
  );
  const templateObjective = hasGenericTemplate
    ? []
    : getTemplateObjective(followUp.objective, templateType);
  const generalObjective = hasGenericTemplate
    ? followUp.objective
    : getObjectiveWithoutTemplateSection(followUp.objective, templateType);
  const templateHeading =
    templateType === "Neurologi"
      ? "Pemeriksaan neurologis:"
      : "Pemeriksaan sistemik Ilmu Penyakit Dalam:";
  const templateBlock =
    followUp.templateSnapshot && followUp.templateAnswers
      ? cleanBlock(
          formatFollowUpTemplateAnswers(
            followUp.templateSnapshot,
            followUp.templateAnswers,
          ),
        )
      : templateHeading +
        "\n" +
        (templateObjective.length > 0
          ? templateObjective.map((line) => "- " + line).join("\n")
          : "Belum ada catatan.");

  return [
    "Assalamualaikum warahmatullahi wabarakatuh dok. Tabe dok, mohon izin dok. " +
      formatReportIdentity(options.reportIdentity, rotationName),
    "",
    "Nama: " + patient.name,
    "Umur: " + patient.age + " tahun",
    "RM: " + patient.rm,
    "Ruangan: " + patient.room,
    "Bed: " + patient.bed,
    "DPJP: " + patient.doctor,
    "Stase: " + rotationName,
    "Tanggal Masuk: " + formatAdmissionDate(patient.admissionDate),
    "Tanggal Follow-Up: " + formatReportDate(followUp.date),
    "",
    "S:",
    cleanBlock(subjectiveBlock),
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
    planBlock,
    "",
    "Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻",
  ].join("\n");
}
