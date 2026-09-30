import {
  FOLLOW_UP_TEMPLATE_FIELD_TYPES,
  TEMPLATE_SCHEMA_VERSION,
  type FollowUpTemplateDefinition,
  type FollowUpTemplateField,
  type FollowUpTemplateFieldType,
  type FollowUpTemplateOption,
  type FollowUpTemplateSection,
  type FollowUpTemplateMetadata,
} from "../types/followUpTemplate";

const ID_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;
const MAX_SECTIONS = 30;
const MAX_FIELDS = 150;
const MAX_OPTIONS = 100;

function fail(message: string): never {
  throw new Error("Template follow-up tidak valid: " + message);
}

function readNonEmptyString(value: unknown, fieldName: string, maxLength = 200) {
  if (typeof value !== "string" || !value.trim()) {
    fail(fieldName + " wajib diisi.");
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    fail(fieldName + " terlalu panjang.");
  }

  return normalized;
}

function readId(value: unknown, fieldName: string) {
  const id = readNonEmptyString(value, fieldName, 64);

  if (!ID_PATTERN.test(id)) {
    fail(fieldName + " harus berupa ID stabil: huruf kecil, angka, '-' atau '_'.");
  }

  return id;
}

function readOptionalString(
  value: unknown,
  fieldName: string,
  maxLength = 500,
) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") fail(fieldName + " harus berupa teks.");

  const normalized = value.trim();
  if (!normalized) return undefined;

  if (normalized.length > maxLength) {
    fail(fieldName + " terlalu panjang.");
  }

  return normalized;
}

function readOptions(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    fail(fieldName + " wajib berupa array.");
  }

  if (value.length === 0 || value.length > MAX_OPTIONS) {
    fail(fieldName + " harus memiliki 1-" + MAX_OPTIONS + " opsi.");
  }

  const seen = new Set<string>();
  const options: FollowUpTemplateOption[] = value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(fieldName + "[" + index + "] harus berupa object.");
    }

    const option = item as Record<string, unknown>;
    const optionValue = readNonEmptyString(
      option.value,
      fieldName + "[" + index + "].value",
      120,
    );
    const label = readNonEmptyString(
      option.label,
      fieldName + "[" + index + "].label",
      160,
    );

    if (seen.has(optionValue)) {
      fail(fieldName + " memiliki value duplikat: " + optionValue);
    }

    seen.add(optionValue);
    return { value: optionValue, label };
  });

  return options;
}

function normalizeField(value: unknown, fieldName: string): FollowUpTemplateField {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(fieldName + " harus berupa object.");
  }

  const field = value as Record<string, unknown>;
  const id = readId(field.id, fieldName + ".id");
  const label = readNonEmptyString(field.label, fieldName + ".label", 160);
  const type = field.type;

  if (
    typeof type !== "string" ||
    !FOLLOW_UP_TEMPLATE_FIELD_TYPES.includes(type as FollowUpTemplateFieldType)
  ) {
    fail(
      fieldName +
        ".type harus salah satu dari: " +
        FOLLOW_UP_TEMPLATE_FIELD_TYPES.join(", "),
    );
  }

  const normalizedType = type as FollowUpTemplateFieldType;

  let required: boolean | undefined;
  if (field.required !== undefined) {
    if (typeof field.required !== "boolean") {
      fail(fieldName + ".required harus berupa boolean.");
    }

    required = field.required;
  }

  const placeholder = readOptionalString(
    field.placeholder,
    fieldName + ".placeholder",
    240,
  );
  const helpText = readOptionalString(
    field.helpText,
    fieldName + ".helpText",
    300,
  );
  const unit = readOptionalString(field.unit, fieldName + ".unit", 40);

  let rows: number | undefined;
  if (field.rows !== undefined) {
    if (
      typeof field.rows !== "number" ||
      !Number.isInteger(field.rows) ||
      field.rows < 1 ||
      field.rows > 12
    ) {
      fail(fieldName + ".rows harus berupa integer 1-12.");
    }

    rows = field.rows;
  }

  let options: FollowUpTemplateOption[] | undefined;
  if (normalizedType === "select" || normalizedType === "multiselect" || normalizedType === "radio") {
    options = readOptions(field.options, fieldName + ".options");
  } else if (field.options !== undefined) {
    fail(fieldName + ".options hanya boleh digunakan pada select/multiselect/radio.");
  }

  if (normalizedType === "checkbox" && field.required === true) {
    fail(fieldName + ".required tidak didukung untuk checkbox.");
  }

  return {
    id,
    label,
    type: normalizedType,
    ...(required === undefined ? {} : { required }),
    ...(placeholder ? { placeholder } : {}),
    ...(helpText ? { helpText } : {}),
    ...(unit ? { unit } : {}),
    ...(rows === undefined ? {} : { rows }),
    ...(options ? { options } : {}),
  };
}

function normalizeSection(
  value: unknown,
  sectionIndex: number,
): FollowUpTemplateSection {
  const fieldName = "sections[" + sectionIndex + "]";

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(fieldName + " harus berupa object.");
  }

  const section = value as Record<string, unknown>;
  const id = readId(section.id, fieldName + ".id");
  const title = readNonEmptyString(section.title, fieldName + ".title", 160);
  const description = readOptionalString(
    section.description,
    fieldName + ".description",
    400,
  );

  if (!Array.isArray(section.fields)) {
    fail(fieldName + ".fields wajib berupa array.");
  }

  const fields = section.fields.map((field, fieldIndex) =>
    normalizeField(field, fieldName + ".fields[" + fieldIndex + "]"),
  );

  return {
    id,
    title,
    ...(description ? { description } : {}),
    fields,
  };
}

export function validateFollowUpTemplateDefinition(
  value: unknown,
): FollowUpTemplateDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("root harus berupa object.");
  }

  const definition = value as Record<string, unknown>;
  const schemaVersion = definition.schema_version;

  if (
    typeof schemaVersion !== "number" ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    fail("schema_version harus berupa integer positif.");
  }

  if (schemaVersion > TEMPLATE_SCHEMA_VERSION) {
    fail(
      "schema_version " +
        schemaVersion +
        " belum didukung aplikasi ini (maksimal " +
        TEMPLATE_SCHEMA_VERSION +
        ").",
    );
  }

  if (!Array.isArray(definition.sections)) {
    fail("sections wajib berupa array.");
  }

  if (
    definition.sections.length === 0 ||
    definition.sections.length > MAX_SECTIONS
  ) {
    fail("template harus memiliki 1-" + MAX_SECTIONS + " section.");
  }

  const sections = definition.sections.map((section, index) =>
    normalizeSection(section, index),
  );

  const sectionIds = new Set<string>();
  const fieldIds = new Set<string>();
  let fieldCount = 0;

  for (const section of sections) {
    if (sectionIds.has(section.id)) {
      fail("section ID duplikat: " + section.id);
    }

    sectionIds.add(section.id);

    for (const field of section.fields) {
      if (fieldIds.has(field.id)) {
        fail("field ID harus unik dalam satu template: " + field.id);
      }

      fieldIds.add(field.id);
      fieldCount += 1;
    }
  }

  if (fieldCount > MAX_FIELDS) {
    fail("jumlah field melebihi batas " + MAX_FIELDS + ".");
  }

  return {
    schema_version: schemaVersion,
    sections,
  };
}

export function validateFollowUpTemplateMetadata(
  value: unknown,
): FollowUpTemplateMetadata {
  if (value === undefined || value === null) return {};

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Metadata template follow-up harus berupa object JSON.");
  }

  return value as FollowUpTemplateMetadata;
}

export function cloneFollowUpTemplateDefinition(
  definition: FollowUpTemplateDefinition,
) {
  return JSON.parse(JSON.stringify(definition)) as FollowUpTemplateDefinition;
}

export function createEmptyTemplateDefinition(): FollowUpTemplateDefinition {
  return {
    schema_version: TEMPLATE_SCHEMA_VERSION,
    sections: [
      {
        id: "objective",
        title: "Objective",
        fields: [],
      },
    ],
  };
}
