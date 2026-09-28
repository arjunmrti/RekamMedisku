export const TEMPLATE_SCHEMA_VERSION = 1 as const;

export const FOLLOW_UP_TEMPLATE_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "multiselect",
  "checkbox",
] as const;

export type FollowUpTemplateFieldType =
  (typeof FOLLOW_UP_TEMPLATE_FIELD_TYPES)[number];

export type FollowUpTemplateOption = {
  value: string;
  label: string;
};

export type FollowUpTemplateField = {
  id: string;
  label: string;
  type: FollowUpTemplateFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  unit?: string;
  rows?: number;
  options?: FollowUpTemplateOption[];
};

export type FollowUpTemplateSection = {
  id: string;
  title: string;
  description?: string;
  fields: FollowUpTemplateField[];
};

export type FollowUpTemplateDefinition = {
  schema_version: number;
  sections: FollowUpTemplateSection[];
};

export type FollowUpTemplateMetadata = {
  specialty?: string;
  hospital?: string;
  doctor?: string;
  unit?: string;
  [key: string]: unknown;
};

export type FollowUpTemplate = {
  id: string;
  userId: string;
  name: string;
  description: string;
  metadata: FollowUpTemplateMetadata;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  latestSchemaVersion: number;
  latestDefinition: FollowUpTemplateDefinition;
};

export type FollowUpTemplateSummary = {
  id: string;
  userId: string;
  name: string;
  description: string;
  metadata: FollowUpTemplateMetadata;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  latestSchemaVersion: number;
};

export type TemplateValue = string | number | boolean | string[] | null;
export type FollowUpTemplateAnswers = Record<string, TemplateValue>;
