export const REPORT_TEMPLATE_SCHEMA_VERSION = 1 as const;

export type ReportTemplateSection = {
  id: string;
  enabled: boolean;
  label: string;
  body: string;
};

export type ReportTemplateDefinition = {
  schema_version: number;
  greeting?: string;
  sections: ReportTemplateSection[];
  closing?: string;
};

export type ReportTemplateMetadata = {
  specialty?: string;
  institution?: string;
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
