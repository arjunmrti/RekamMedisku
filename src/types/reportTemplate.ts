export const REPORT_TEMPLATE_SCHEMA_VERSION = 1 as const;

export const REPORT_TEMPLATE_BLOCK_TYPES = [
  "text",
  "value",
  "template_answers",
  "supporting_exams",
] as const;

export type ReportTemplateBlockType =
  (typeof REPORT_TEMPLATE_BLOCK_TYPES)[number];

export const REPORT_TEMPLATE_SOURCES = [
  "identity.report_introduction",
  "patient.name",
  "patient.age",
  "patient.gender",
  "patient.rm",
  "patient.room",
  "patient.bed",
  "patient.doctor",
  "patient.admission_date",
  "patient.admission_complaint",
  "rotation.name",
  "follow_up.date",
  "follow_up.subjective",
  "follow_up.objective",
  "follow_up.assessment",
  "follow_up.plan",
  "follow_up.planning",
  "follow_up.instruction",
  "follow_up.summary",
  "follow_up.template_answers",
  "follow_up.supporting_exams",
] as const;

export type ReportTemplateSource =
  (typeof REPORT_TEMPLATE_SOURCES)[number];

export type ReportTemplateBlock =
  | {
      id: string;
      type: "text";
      text: string;
    }
  | {
      id: string;
      type: "value";
      source: ReportTemplateSource;
      label?: string;
      emptyText?: string;
    }
  | {
      id: string;
      type: "template_answers";
      title?: string;
      emptyText?: string;
    }
  | {
      id: string;
      type: "supporting_exams";
      title?: string;
      emptyText?: string;
      includeAttachments?: boolean;
    };

export type ReportTemplateSection = {
  id: string;
  title: string;
  description?: string;
  blocks: ReportTemplateBlock[];
};

export type ReportTemplateDefinition = {
  schema_version: number;
  sections: ReportTemplateSection[];
};

export type ReportTemplateMetadata = {
  specialty?: string;
  hospital?: string;
  doctor?: string;
  unit?: string;
  [key: string]: unknown;
};

export type ReportTemplate = {
  id: string;
  userId: string;
  name: string;
  description: string;
  metadata: ReportTemplateMetadata;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  latestSchemaVersion: number;
  latestDefinition: ReportTemplateDefinition;
};

export type ReportTemplateSummary = {
  id: string;
  userId: string;
  name: string;
  description: string;
  metadata: ReportTemplateMetadata;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  latestSchemaVersion: number;
};
