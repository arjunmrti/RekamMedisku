import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { ApplicationProfile } from "../types/profile";
import type {
  ReportTemplateDefinition,
  ReportTemplateSource,
} from "../types/reportTemplate";
import { formatFollowUpTemplateAnswers } from "./followUpTemplateRuntime";
import { formatReportDate, formatReportRotationName } from "./reportFormatting";

export type ReportRenderContext = {
  patient: PatientListItem;
  followUp: FollowUpEntry;
  rotationName: string;
  reportIdentity: Pick<
    ApplicationProfile,
    "name" | "studentId" | "program" | "institution"
  >;
  generatedAt?: Date;
};

function clean(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function formatDateForReport(value: string | undefined) {
  return value ? formatReportDate(value) : "";
}

function getCoreObjective(followUp: FollowUpEntry) {
  const objective = clean(followUp.objective);

  if (
    !objective ||
    !followUp.templateSnapshot ||
    !followUp.templateAnswers
  ) {
    return objective;
  }

  const formattedTemplate = formatFollowUpTemplateAnswers(
    followUp.templateSnapshot,
    followUp.templateAnswers,
  );

  if (!formattedTemplate) return objective;

  const templateLines = new Set(
    formattedTemplate.split("\n").map((line) => line.trim()),
  );

  return objective
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !templateLines.has(line))
    .join("\n");
}

function getSourceValue(
  source: ReportTemplateSource,
  context: ReportRenderContext,
) {
  const { patient, followUp, rotationName, reportIdentity } = context;

  switch (source) {
    case "identity.report_introduction": {
      const name = clean(reportIdentity.name) || "Pengguna RekamMedisku";
      const details = [
        reportIdentity.studentId?.trim()
          ? "dengan Stambuk " + reportIdentity.studentId.trim()
          : "",
        reportIdentity.program?.trim() ? reportIdentity.program.trim() : "",
        reportIdentity.institution?.trim()
          ? "dari " + reportIdentity.institution.trim()
          : "",
      ].filter(Boolean);

      return (
        "Assalamualaikum warahmatullahi wabarakatuh dok. Tabe dok, mohon izin dok. " +
        "Perkenalkan saya " +
        name +
        (details.length ? " " + details.join(" ") : "") +
        " Stase " +
        formatReportRotationName(rotationName, "Stase") +
        ". Mohon izin melaporkan follow-up pasien:"
      );
    }
    case "patient.name":
      return patient.name;
    case "patient.age":
      return patient.age > 0 ? patient.age + " tahun" : "";
    case "patient.gender":
      return patient.gender;
    case "patient.rm":
      return patient.rm;
    case "patient.room":
      return patient.room;
    case "patient.bed":
      return patient.bed;
    case "patient.doctor":
      return patient.doctor;
    case "patient.admission_date":
      return patient.admissionDate
        ? formatAdmissionDate(patient.admissionDate)
        : "";
    case "patient.admission_complaint":
      return clean(patient.admissionComplaint);
    case "rotation.name":
      return rotationName;
    case "follow_up.date":
      return formatDateForReport(followUp.date);
    case "follow_up.subjective":
      return clean(followUp.subjective);
    case "follow_up.objective":
      return getCoreObjective(followUp);
    case "follow_up.assessment":
      return clean(followUp.assessment);
    case "follow_up.plan":
      return clean(followUp.plan);
    case "follow_up.planning":
      return clean(followUp.planning) || clean(followUp.plan);
    case "follow_up.instruction":
      return clean(followUp.instruction);
    case "follow_up.summary":
      return clean(followUp.summary);
    case "follow_up.template_answers":
    case "follow_up.supporting_exams":
      return "";
  }
}

function formatAdmissionDate(date: string) {
  const parsed = new Date(date + "T00:00:00");

  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function renderSupportingExams(
  followUp: FollowUpEntry,
  includeAttachments: boolean,
  emptyText: string,
) {
  const exams = followUp.supportingExams ?? [];

  if (!exams.length) return emptyText;

  return exams
    .map((exam) => {
      const result = clean(exam.result);
      const attachment = clean(exam.attachmentName);

      return [
        "- " + exam.name + " · " + exam.date,
        result ? "  " + result : "",
        includeAttachments && attachment
          ? "  Lampiran: " + attachment
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function renderTemplateAnswers(
  followUp: FollowUpEntry,
  emptyText: string,
) {
  if (!followUp.templateSnapshot || !followUp.templateAnswers) {
    return emptyText;
  }

  const formatted = formatFollowUpTemplateAnswers(
    followUp.templateSnapshot,
    followUp.templateAnswers,
  );

  return formatted || emptyText;
}

function normalizeBlockOutput(
  block: Extract<
    ReportTemplateDefinition["sections"][number]["blocks"][number],
    { type: "value" }
  >,
  value: string,
) {
  const text = clean(value);

  if (!text) {
    return block.emptyText?.trim() ?? "";
  }

  return [block.label?.trim(), text].filter(Boolean).join(": ");
}

export function renderReportTemplate(
  definition: ReportTemplateDefinition,
  context: ReportRenderContext,
) {
  const lines: string[] = [];

  for (const section of definition.sections) {
    const sectionLines: string[] = [];

    for (const block of section.blocks) {
      if (block.type === "text") {
        sectionLines.push(block.text.trim());
        continue;
      }

      if (block.type === "value") {
        const value = getSourceValue(block.source, context);
        const rendered = normalizeBlockOutput(block, value ?? "");

        if (rendered) sectionLines.push(rendered);
        continue;
      }

      if (block.type === "template_answers") {
        const rendered = renderTemplateAnswers(
          context.followUp,
          block.emptyText?.trim() || "Belum ada jawaban template.",
        );

        if (block.title?.trim() && rendered) {
          sectionLines.push(block.title.trim());
          sectionLines.push(rendered);
        } else if (rendered) {
          sectionLines.push(rendered);
        }

        continue;
      }

      const rendered = renderSupportingExams(
        context.followUp,
        block.includeAttachments !== false,
        block.emptyText?.trim() || "Belum ada pemeriksaan penunjang.",
      );

      if (block.title?.trim() && rendered) {
        sectionLines.push(block.title.trim());
      }
      if (rendered) sectionLines.push(rendered);
    }

    const title = section.title.trim();

    if (title) lines.push(title);

    if (sectionLines.length) {
      lines.push(sectionLines.join("\n"));
    }

    if (title || sectionLines.length) {
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
