import type {
  FollowUpTemplateDefinition,
  FollowUpTemplateField,
  FollowUpTemplateOption,
  FollowUpTemplateFieldType,
} from "../types/followUpTemplate";
import { cloneFollowUpTemplateDefinition } from "./followUpTemplate";

export type QuickFollowUpFieldInput = {
  sectionId: string;
  label: string;
  type: FollowUpTemplateFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  unit?: string;
  rows?: number;
  options?: FollowUpTemplateOption[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createUniqueFieldId(
  definition: FollowUpTemplateDefinition,
  label: string,
) {
  const existing = new Set(
    definition.sections.flatMap((section) =>
      section.fields.map((field) => field.id),
    ),
  );

  const base = "custom-" + (slugify(label) || "field");
  let candidate = base;
  let suffix = 2;

  while (existing.has(candidate)) {
    candidate = base + "-" + suffix;
    suffix += 1;
  }

  return candidate;
}

export function addFollowUpTemplateField(
  definition: FollowUpTemplateDefinition,
  input: QuickFollowUpFieldInput,
) {
  const nextDefinition = cloneFollowUpTemplateDefinition(definition);
  const section = nextDefinition.sections.find(
    (candidate) => candidate.id === input.sectionId,
  );

  if (!section) {
    throw new Error("Bagian template yang dipilih tidak ditemukan.");
  }

  const label = input.label.trim();
  if (!label) {
    throw new Error("Nama pemeriksaan wajib diisi.");
  }

  const field: FollowUpTemplateField = {
    id: createUniqueFieldId(nextDefinition, label),
    label,
    type: input.type,
    required: input.required || undefined,
    ...(input.placeholder?.trim()
      ? { placeholder: input.placeholder.trim() }
      : {}),
    ...(input.helpText?.trim() ? { helpText: input.helpText.trim() } : {}),
    ...(input.unit?.trim() ? { unit: input.unit.trim() } : {}),
    ...(input.rows ? { rows: input.rows } : {}),
    ...(input.options?.length ? { options: input.options } : {}),
  };

  section.fields.push(field);

  return {
    definition: nextDefinition,
    fieldId: field.id,
  };
}
