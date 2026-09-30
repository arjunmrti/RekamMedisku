import assert from "node:assert/strict";
import test from "node:test";
import {
  validateReportTemplateDefinition,
  validateReportTemplateMetadata,
} from "../src/utils/reportTemplate";

test("report template menerima section tanpa judul untuk block struktural", () => {
  const definition = validateReportTemplateDefinition({
    schema_version: 1,
    sections: [
      {
        id: "opening",
        title: "",
        blocks: [
          {
            id: "intro",
            type: "text",
            text: "Pembuka",
          },
        ],
      },
    ],
  });

  assert.equal(definition.sections[0].title, "");
});

test("report template menerima sumber value yang sudah dikontrol", () => {
  const definition = validateReportTemplateDefinition({
    schema_version: 1,
    sections: [
      {
        id: "patient",
        title: "Pasien",
        blocks: [
          {
            id: "name",
            type: "value",
            source: "patient.name",
            label: "Nama",
          },
          {
            id: "answers",
            type: "template_answers",
          },
          {
            id: "exams",
            type: "supporting_exams",
            includeAttachments: true,
          },
        ],
      },
    ],
  });

  assert.equal(definition.sections[0].blocks.length, 3);
});

test("report template menolak source yang tidak terdaftar", () => {
  assert.throws(
    () =>
      validateReportTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "section",
            title: "Section",
            blocks: [
              {
                id: "bad",
                type: "value",
                source: "patient.secret",
              },
            ],
          },
        ],
      }),
    /source harus merupakan sumber value laporan yang didukung/,
  );
});

test("report template menolak block type yang tidak dikenal", () => {
  assert.throws(
    () =>
      validateReportTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "section",
            title: "Section",
            blocks: [
              {
                id: "bad",
                type: "unknown",
              },
            ],
          },
        ],
      }),
    /type harus salah satu dari/,
  );
});

test("report template menolak block ID duplikat dalam section", () => {
  assert.throws(
    () =>
      validateReportTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "section",
            title: "Section",
            blocks: [
              { id: "same", type: "text", text: "A" },
              { id: "same", type: "text", text: "B" },
            ],
          },
        ],
      }),
    /block ID harus unik/,
  );
});

test("report template menolak section ID duplikat", () => {
  assert.throws(
    () =>
      validateReportTemplateDefinition({
        schema_version: 1,
        sections: [
          {
            id: "same",
            title: "Satu",
            blocks: [{ id: "aa", type: "text", text: "A" }],
          },
          {
            id: "same",
            title: "Dua",
            blocks: [{ id: "bb", type: "text", text: "B" }],
          },
        ],
      }),
    /section ID duplikat/,
  );
});

test("report template menolak schema version di masa depan", () => {
  assert.throws(
    () =>
      validateReportTemplateDefinition({
        schema_version: 99,
        sections: [
          {
            id: "section",
            title: "Section",
            blocks: [{ id: "a", type: "text", text: "A" }],
          },
        ],
      }),
    /schema_version 99 belum didukung/,
  );
});

test("metadata report template harus object", () => {
  assert.deepEqual(validateReportTemplateMetadata(undefined), {});
  assert.deepEqual(
    validateReportTemplateMetadata({ specialty: "Neurologi" }),
    { specialty: "Neurologi" },
  );
  assert.throws(
    () => validateReportTemplateMetadata([]),
    /metadata harus berupa object JSON/,
  );
});
