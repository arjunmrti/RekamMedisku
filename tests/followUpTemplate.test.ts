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
            id: "choice",
            label: "Pilihan",
            type: "radio",
            options: [
              { value: "one", label: "Satu" },
              { value: "two", label: "Dua" },
            ],
          },
          {
            id: "visit_date",
            label: "Tanggal",
            type: "date",
          },
          {
            id: "visit_time",
            label: "Waktu",
            type: "time",
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

  assert.equal(definition.sections[0].fields.length, 7);
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

test("template optional properties are normalized and preserved", () => {
  const definition = validateFollowUpTemplateDefinition({
    schema_version: 1,
    sections: [
      {
        id: "objective",
        title: "Objective",
        description: "Pemeriksaan objektif pasien.",
        fields: [
          {
            id: "blood_pressure",
            label: "Tekanan Darah",
            type: "number",
            placeholder: "120",
            helpText: "Masukkan nilai sistolik.",
            unit: "mmHg",
            rows: 1,
          },
        ],
      },
    ],
  });

  const field = definition.sections[0].fields[0];
  assert.equal(definition.sections[0].description, "Pemeriksaan objektif pasien.");
  assert.equal(field.placeholder, "120");
  assert.equal(field.helpText, "Masukkan nilai sistolik.");
  assert.equal(field.unit, "mmHg");
  assert.equal(field.rows, 1);
});

test("template rejects invalid rows", () => {
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
                label: "Catatan",
                type: "textarea",
                rows: 13,
              },
            ],
          },
        ],
      }),
    /rows harus berupa integer 1-12/,
  );
});

test("template rejects non-boolean required values", () => {
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
                label: "Catatan",
                type: "text",
                required: "yes",
              },
            ],
          },
        ],
      }),
    /required.*boolean/,
  );
});

test("template rejects required checkbox fields", () => {
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
                id: "flag",
                label: "Flag",
                type: "checkbox",
                required: true,
              },
            ],
          },
        ],
      }),
    /required tidak didukung untuk checkbox/,
  );
});

test("empty starter definition is valid and has a stable schema version", () => {
  const definition = createEmptyTemplateDefinition();

  assert.equal(definition.schema_version, 1);
  assert.equal(definition.sections[0].id, "objective");
});
