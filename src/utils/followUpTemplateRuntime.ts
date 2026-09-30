import type {
  FollowUpTemplateAnswers,
  FollowUpTemplateDefinition,
  FollowUpTemplateField,
} from "../types/followUpTemplate";

export function getInitialFollowUpTemplateFieldValue(
  field: FollowUpTemplateField,
) {
  if (field.type === "multiselect") return [] as string[];
  if (field.type === "checkbox") return false;
  return "";
}

export function createInitialFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
): FollowUpTemplateAnswers {
  return Object.fromEntries(
    definition.sections.flatMap((section) =>
      section.fields.map((field) => [
        field.id,
        getInitialFollowUpTemplateFieldValue(field),
      ]),
    ),
  );
}

export function mergeFollowUpTemplateAnswersForDefinition(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
): FollowUpTemplateAnswers {
  const next = { ...answers };

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!(field.id in next)) {
        next[field.id] = getInitialFollowUpTemplateFieldValue(field);
      }
    }
  }

  return next;
}

export function validateFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  const missing: string[] = [];

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;

      const value = answers[field.id];
      const empty =
        Array.isArray(value)
          ? value.length === 0
          : typeof value === "string"
            ? value.trim().length === 0
            : value === null || value === undefined;

      if (empty) missing.push(field.label);
    }
  }

  return missing;
}

export function formatFollowUpTemplateAnswers(
  definition: FollowUpTemplateDefinition,
  answers: FollowUpTemplateAnswers,
) {
  return definition.sections
    .flatMap((section) => {
      const lines = section.fields.flatMap((field) => {
        const value = answers[field.id];
        const empty =
          Array.isArray(value)
            ? value.length === 0
            : typeof value === "string"
              ? value.trim().length === 0
              : value === null || value === undefined || value === false;

        if (empty) return [];

        const rendered = Array.isArray(value)
          ? value.join(", ")
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

      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
      if (Array.isArray(value) && value.length) return value.join(", ");
      if (value === true) return field.label;
    }
  }

  return "";
}
