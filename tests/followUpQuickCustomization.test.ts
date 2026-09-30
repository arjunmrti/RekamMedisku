import test from "node:test";
import assert from "node:assert/strict";
import {
  addFollowUpTemplateField,
} from "../src/utils/followUpQuickCustomization";
import {
  createInitialFollowUpTemplateAnswers,
  mergeFollowUpTemplateAnswersForDefinition,
  validateFollowUpTemplateAnswers,
  formatFollowUpTemplateAnswers,
} from "../src/utils/followUpTemplateRuntime";
import type { FollowUpTemplateDefinition } from "../src/types/followUpTemplate";

function definition(): FollowUpTemplateDefinition {
  return {
    schema_version: 1,
    sections: [
      {
        id: "objective",
        title: "Objective",
        fields: [
          {
            id: "kesadaran",
            label: "Kesadaran",
            type: "text",
            required: true,
          },
        ],
      },
    ],
  };
}

test("quick customization menambahkan field tanpa memutasi definition asal", () => {
  const original = definition();

  const result = addFollowUpTemplateField(original, {
    sectionId: "objective",
    label: "Tanda Rangsang Meningeal",
    type: "text",
    required: false,
  });

  assert.equal(original.sections[0].fields.length, 1);
  assert.equal(result.definition.sections[0].fields.length, 2);
  assert.equal(result.definition.sections[0].fields[1].label, "Tanda Rangsang Meningeal");
  assert.match(result.fieldId, /^custom-tanda-rangsang-meningeal(?:-\d+)?$/);
});

test("quick customization membuat field ID unik ketika label bentrok", () => {
  const original: FollowUpTemplateDefinition = {
    ...definition(),
    sections: [
      {
        ...definition().sections[0],
        fields: [
          ...definition().sections[0].fields,
          {
            id: "custom-refleks",
            label: "Refleks",
            type: "text",
          },
        ],
      },
    ],
  };

  const result = addFollowUpTemplateField(original, {
    sectionId: "objective",
    label: "Refleks",
    type: "text",
    required: false,
  });

  assert.equal(result.fieldId, "custom-refleks-2");
});

test("jawaban baru mempertahankan jawaban lama dan mengisi default field baru", () => {
  const original = definition();
  const { definition: next } = addFollowUpTemplateField(original, {
    sectionId: "objective",
    label: "NRS",
    type: "number",
    required: false,
  });

  const answers = mergeFollowUpTemplateAnswersForDefinition(next, {
    kesadaran: "Compos mentis",
  });

  assert.equal(answers.kesadaran, "Compos mentis");
  assert.equal(answers["custom-nrs"], "");
});

test("required field dari quick customization ikut divalidasi", () => {
  const { definition: next } = addFollowUpTemplateField(definition(), {
    sectionId: "objective",
    label: "Temuan Khusus",
    type: "textarea",
    required: true,
  });

  assert.deepEqual(
    validateFollowUpTemplateAnswers(next, {
      kesadaran: "Compos mentis",
      "custom-temuan-khusus": "",
    }),
    ["Temuan Khusus"],
  );
});

test("format jawaban mengikuti exact definition yang digunakan follow-up", () => {
  const { definition: next } = addFollowUpTemplateField(definition(), {
    sectionId: "objective",
    label: "Pupil",
    type: "select",
    required: false,
    options: [
      { value: "isokor", label: "Isokor" },
      { value: "anisokor", label: "Anisokor" },
    ],
  });

  const answers = createInitialFollowUpTemplateAnswers(next);
  answers.kesadaran = "Compos mentis";
  answers["custom-pupil"] = "isokor";

  const formatted = formatFollowUpTemplateAnswers(next, answers);

  assert.match(formatted, /Kesadaran: Compos mentis/);
  assert.match(formatted, /Pupil: isokor/);
});
