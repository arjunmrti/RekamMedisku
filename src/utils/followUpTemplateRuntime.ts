import type {
  FollowUpTemplateAnswers,
  FollowUpTemplateDefinition,
  FollowUpTemplateField,
  TemplateValue,
} from "../types/followUpTemplate";

function emptyValue(field: FollowUpTemplateField): TemplateValue {
  if (field.type === "multiselect") return [];
  if (field.type === "checkbox") return false;
  if (field.type === "number") return null;
  return "";
}

function getOptionValues(field: FollowUpTemplateField) {
  return new Set((field.options ?? []).map((option) => option.value));
}

function isEmptyAnswer(value: TemplateValue) {
  return Array.isArray(value)
    ? value.length === 0
    : typeof value === "string"
      ? value.trim().length === 0
      : value === null || value === undefined;
}

function readFieldLabel(field: FollowUpTemplateField) {
  return 'Field "' + field.label + '"';
}

export function createInitialFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
): FollowUpTemplateAnswers {
  return Object.fromEntries(
    definition.sections.flatMap((section) =>
      section.fields.map((field) => [field.id, emptyValue(field)]),
    ),
  );
}

export function validateFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  const missing: string[] = [];

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;

      const value = answers[field.id] ?? emptyValue(field);

      if (isEmptyAnswer(value)) {
        missing.push(field.label);
      }
    }
  }

  return missing;
}

/**
 * Validates the runtime value shape without mutating the answer object.
 * This is the renderer/persistence contract: field type determines answer type,
 * and select values must exist in the template's option catalog.
 */
export function validateFollowUpTemplateAnswerShape(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  const errors: string[] = [];

  for (const section of definition.sections) {
    for (const field of section.fields) {
      const value = answers[field.id] ?? emptyValue(field);

      switch (field.type) {
        case "text":
        case "textarea":
          if (value !== null && typeof value !== "string") {
            errors.push(readFieldLabel(field) + " harus berupa teks.");
          }
          break;

        case "number":
          if (
            value !== null &&
            (typeof value !== "number" || !Number.isFinite(value))
          ) {
            errors.push(readFieldLabel(field) + " harus berupa angka.");
          }
          break;

        case "select": {
          if (value !== null && typeof value !== "string") {
            errors.push(readFieldLabel(field) + " harus berupa satu pilihan.");
            break;
          }

          if (
            typeof value === "string" &&
            value !== "" &&
            !getOptionValues(field).has(value)
          ) {
            errors.push(
              readFieldLabel(field) + " memiliki pilihan yang tidak tersedia.",
            );
          }
          break;
        }

        case "multiselect": {
          if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
            errors.push(
              readFieldLabel(field) + " harus berupa daftar pilihan.",
            );
            break;
          }

          if (new Set(value).size !== value.length) {
            errors.push(readFieldLabel(field) + " memiliki pilihan duplikat.");
          }

          const optionValues = getOptionValues(field);
          if (value.some((item) => !optionValues.has(item))) {
            errors.push(
              readFieldLabel(field) + " memiliki pilihan yang tidak tersedia.",
            );
          }
          break;
        }

        case "checkbox":
          if (typeof value !== "boolean") {
            errors.push(readFieldLabel(field) + " harus berupa pilihan ya/tidak.");
          }
          break;
      }
    }
  }

  return errors;
}

export function normalizeFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  const normalized: FollowUpTemplateAnswers = { ...answers };

  for (const section of definition.sections) {
    for (const field of section.fields) {
      const rawValue = answers[field.id];

      if (rawValue === undefined) {
        normalized[field.id] = emptyValue(field);
        continue;
      }

      if (field.type === "number" && rawValue === "") {
        normalized[field.id] = null;
      }
    }
  }

  return normalized;
}

export function formatFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  return definition.sections
    .flatMap((section) => {
      const lines = section.fields.flatMap((field) => {
        const value = answers[field.id];

        if (isEmptyAnswer(value)) return [];

        const optionLabels = new Map(
          (field.options ?? []).map((option) => [option.value, option.label]),
        );

        const rendered = Array.isArray(value)
          ? value.map((item) => optionLabels.get(item) ?? item).join(", ")
          : field.type === "select"
            ? optionLabels.get(String(value)) ?? String(value)
            : String(value);

        return [
          field.label +
            ": " +
            rendered +
            (field.unit ? " " + field.unit : ""),
        ];
      });

      return lines.length ? [section.title, ...lines] : [];
    })
    .join("\n");
}

export function getFirstMeaningfulTemplateAnswer(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  for (const section of definition.sections) {
    for (const field of section.fields) {
      const value = answers[field.id];

      if (isEmptyAnswer(value)) continue;

      if (Array.isArray(value)) {
        const labels = new Map(
          (field.options ?? []).map((option) => [option.value, option.label]),
        );
        return value.map((item) => labels.get(item) ?? item).join(", ");
      }

      if (field.type === "select") {
        const label =
          (field.options ?? []).find((option) => option.value === value)?.label ??
          String(value);
        return label;
      }

      return String(value);
    }
  }

  return "";
}
