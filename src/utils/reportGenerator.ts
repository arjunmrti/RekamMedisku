import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { ApplicationProfile } from "../types/profile";
import type { ReportTemplateDefinition } from "../types/reportTemplate";
import { renderReportTemplate } from "./reportRenderer";
import {
  formatReportDate,
  formatReportRotationName,
} from "./reportFormatting";

export { formatReportDate, formatReportRotationName };

export function getReportGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 11) return "Selamat pagi Dok";
  if (hour < 15) return "Selamat siang Dok";
  if (hour < 18) return "Selamat sore Dok";
  return "Selamat malam Dok";
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

export function buildWhatsAppReport(
  patient: PatientListItem,
  followUp: FollowUpEntry,
  templateDefinition: ReportTemplateDefinition,
  options: BuildWhatsAppReportOptions,
) {
  return renderReportTemplate(templateDefinition, {
    patient,
    followUp,
    rotationName:
      options.rotationName?.trim() ||
      followUp.templateType?.trim() ||
      "Stase",
    reportIdentity: options.reportIdentity,
    generatedAt: options.generatedAt,
  });
}
