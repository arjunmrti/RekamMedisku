import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyTemplateDefinition,
  validateFollowUpTemplateDefinition,
} from "../src/utils/followUpTemplate";

test("follow-up template accepts controlled field types", () => {
  const definition = validateFollowUpTemplateDefinition({
    schema_version: 1,
    sections: [
      {
        id: "objective",
        title: "Objective",
        fields: [
          {
            id: "consciousness",
            label: "Kesadaran",
            type: "select",
            required: true,
            options: [
              { value: "cm", label: "Compos mentis" },
              { value: "somnolence", label: "Somnolen" },
            ],
          },
          {
            id: "gcs",
            label: "GCS",
            type: "number",
            unit: "score",
          },
          {
            id: "notes",
            label: "Catatan",
            type: "textarea",
            rows: 4,
          },
          {
            id: "flag",
            label: "Flag",
            type: "checkbox",
          },
        ],
      },
    ],
  });

  assert.equal(definition.sections[0].fields.length, 4);
});

test("follow-up template rejects unknown field types", () => {
  assert.throws(
    () =>
      validateFollowUpTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "objective",
            title: "Objective",
            fields: [
              {
                id: "custom",
                label: "Custom",
                type: "rich_text",
              },
            ],
          },
        ],
      }),
    /type harus salah satu/,
  );
});

test("follow-up template rejects duplicate field ids", () => {
  assert.throws(
    () =>
      validateFollowUpTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "one",
            title: "One",
            fields: [{ id: "same", label: "A", type: "text" }],
          },
          {
            id: "two",
            title: "Two",
            fields: [{ id: "same", label: "B", type: "text" }],
          },
        ],
      }),
    /field ID harus unik/,
  );
});

test("follow-up template rejects options on non-select fields", () => {
  assert.throws(
    () =>
      validateFollowUpTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "objective",
            title: "Objective",
            fields: [
              {
                id: "notes",
                label: "Notes",
                type: "textarea",
                options: [{ value: "x", label: "X" }],
              },
            ],
          },
        ],
      }),
    /options hanya boleh/,
  );
});

test("empty starter definition is valid and has a stable schema version", () => {
  const definition = createEmptyTemplateDefinition();

  assert.equal(definition.schema_version, 1);
  assert.equal(definition.sections[0].id, "objective");
});
