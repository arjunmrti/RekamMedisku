import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { ReportTemplateType } from "../types/report";
import type { ReportTemplateDefinition } from "../types/reportTemplate";
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

export type RenderContext = {
  report: {
    date: string;
    rotation: string;
    hospital: string;
    doctor: string;
  };
  patient: {
    name: string;
    age: string;
    rm: string;
    room: string;
    bed: string;
    dpjp: string;
  };
  followUp: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    instruction: string;
    supportingExams: string;
    coreObjective: string;
  };
  identity: ReportIdentity;
  templateType: ReportTemplateType;
  admissionDate: string;
  admissionComplaint: string;
  summary: {
    doctorCount: string;
    totalPatients: string;
  };
};

export function buildRenderContext(
  patient: PatientListItem,
  followUp: FollowUpEntry,
  rotation: string,
  profile: ReportIdentity,
): RenderContext {
  return {
    report: {
      date: formatReportDate(followUp.date),
      rotation,
      hospital: profile.institution?.trim() ?? "",
      doctor: patient.doctor,
    },
    patient: {
      name: patient.name,
      age: String(patient.age),
      rm: patient.rm,
      room: patient.room,
      bed: patient.bed,
      dpjp: patient.doctor,
    },
    followUp: {
      subjective: followUp.subjective,
      objective: followUp.objective,
      assessment: followUp.assessment,
      plan: followUp.planning?.trim() || followUp.plan?.trim() || "Belum ada planning.",
      instruction: followUp.instruction?.trim() ?? "",
      supportingExams: (followUp.supportingExams ?? []).map((exam) => exam.name).join(", "),
      coreObjective: followUp.coreObjective ? JSON.stringify(followUp.coreObjective) : "",
    },
    identity: profile,
    templateType: rotation as ReportTemplateType,
    admissionDate: formatAdmissionDate(patient.admissionDate),
    admissionComplaint: patient.admissionComplaint?.trim() ?? "",
    summary: { doctorCount: "", totalPatients: "" },
  };
}

export const APPROVED_REPORT_TAGS = [
  "report.date",
  "report.rotation",
  "report.specialty",
  "report.hospital",
  "report.doctor",
  "patient.name",
  "patient.age",
  "patient.rm",
  "patient.room",
  "patient.bed",
  "patient.dpjp",
  "followUp.subjective",
  "followUp.objective",
  "followUp.assessment",
  "followUp.plan",
  "followUp.instruction",
  "followUp.supportingExams",
  "followUp.coreObjective",
  "summary.doctor_count",
  "summary.total_patients",
] as const;

const APPROVED_REPORT_TAG_SET = new Set<string>(APPROVED_REPORT_TAGS);
const REPORT_TAG_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function resolveTag(key: string, context: RenderContext): string {
  const values: Record<string, string> = {
    "report.date": context.report.date,
    "report.rotation": context.report.rotation,
    "report.specialty": context.report.rotation,
    "report.hospital": context.report.hospital,
    "report.doctor": context.report.doctor,
    "patient.name": context.patient.name,
    "patient.age": context.patient.age,
    "patient.rm": context.patient.rm,
    "patient.room": context.patient.room,
    "patient.bed": context.patient.bed,
    "patient.dpjp": context.patient.dpjp,
    "followUp.subjective": context.followUp.subjective,
    "followUp.objective": context.followUp.objective,
    "followUp.assessment": context.followUp.assessment,
    "followUp.plan": context.followUp.plan,
    "followUp.instruction": context.followUp.instruction,
    "followUp.supportingExams": context.followUp.supportingExams,
    "followUp.coreObjective": context.followUp.coreObjective,
    "summary.doctor_count": context.summary.doctorCount,
    "summary.total_patients": context.summary.totalPatients,
  };
  return values[key] ?? "";
}

export function extractTagsFromText(text: string): string[] {
  const tags: string[] = [];
  const matches = text.matchAll(REPORT_TAG_PATTERN);
  for (const match of matches) {
    tags.push(match[1].trim());
  }
  return tags;
}

export function validateReportTemplateDefinition(
  definition: ReportTemplateDefinition,
): void {
  const errors: string[] = [];

  if (definition.greeting) {
    const greetingTags = extractTagsFromText(definition.greeting);
    for (const tag of greetingTags) {
      if (!APPROVED_REPORT_TAG_SET.has(tag)) {
        errors.push(`Unknown tag in greeting: {{${tag}}}`);
      }
    }
  }

  for (const section of definition.sections) {
    const bodyTags = extractTagsFromText(section.body);
    for (const tag of bodyTags) {
      if (!APPROVED_REPORT_TAG_SET.has(tag)) {
        errors.push(`Unknown tag in section "${section.label}": {{${tag}}}`);
      }
    }
  }

  if (definition.closing) {
    const closingTags = extractTagsFromText(definition.closing);
    for (const tag of closingTags) {
      if (!APPROVED_REPORT_TAG_SET.has(tag)) {
        errors.push(`Unknown tag in closing: {{${tag}}}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error("Template validation failed: " + errors.join(", "));
  }
}

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
  const rotationName = options.rotationName?.trim() || templateType;
  const context = buildRenderContext(
    patient,
    followUp,
    rotationName,
    options.reportIdentity,
  );
  const exams = followUp.supportingExams ?? [];
  const planning = context.followUp.plan;
  const instruction = context.followUp.instruction;

  const planBlock = [
    "P: " + planning,
    instruction ? "I: " + instruction : "",
  ]
    .filter(Boolean)
    .join("\n");

  const subjectiveBlock = [
    context.admissionComplaint
      ? "Keluhan Masuk: " + context.admissionComplaint
      : "",
    context.followUp.subjective.trim()
      ? "Keluhan / Perkembangan Hari Ini: " + context.followUp.subjective.trim()
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
      formatReportIdentity(context.identity, resolveTag("report.rotation", context)),
    "",
    "Nama: " + resolveTag("patient.name", context),
    "Umur: " + resolveTag("patient.age", context) + " tahun",
    "RM: " + resolveTag("patient.rm", context),
    "Ruangan: " + resolveTag("patient.room", context),
    "Bed: " + resolveTag("patient.bed", context),
    "DPJP: " + resolveTag("patient.dpjp", context),
    "Stase: " + resolveTag("report.rotation", context),
    "Tanggal Masuk: " + context.admissionDate,
    "Tanggal Follow-Up: " + resolveTag("report.date", context),
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
    cleanBlock(resolveTag("followUp.assessment", context)),
    "",
    planBlock,
    "",
    "Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻",
  ].join("\n");
}
