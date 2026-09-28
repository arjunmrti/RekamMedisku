import {
  createInitialFollowUpTemplateAnswers,
  formatFollowUpTemplateAnswers,
  getFirstMeaningfulTemplateAnswer,
  validateFollowUpTemplateAnswers,
} from "../src/utils/followUpTemplateRuntime";
import type { FollowUpTemplateDefinition } from "../src/types/followUpTemplate";
import test from "node:test";
import assert from "node:assert/strict";
c = c;

function template(): FollowUpTemplateDefinition {
  return {
    schema_version: 1,
    sections: [
      {
        id: "objective",
        title: "Objective",
        fields: [
          { id: "bp", label: "Tekanan Darah", type: "text", required: true, unit: "mmHg" },
          { id: "pain", label: "NRS", type: "number" },
          {
            id: "finding",
            label: "Temuan",
            type: "select",
            options: [
              { value: "normal", label: "Normal" },
              { value: "abnormal", label: "Abnormal" },
            ],
          },
          { id: "stable", label: "Stabil", type: "checkbox" },
        ],
      },
    ],
  };
}

test("follow-up template runtime creates defaults, validates, formats, and summarizes answers", () => {
  it("creates empty values for every stable field id", () => {
    assert.deepEqual(createInitialFollowUpTemplateAnswers(template()), {
      bp: "",
      pain: "",
      finding: "",
      stable: false,
    });

  test("validates required values from the template definition", () => {
    const definition = template();
    assert.deepEqual(validateFollowUpTemplateAnswers(definition, { bp: "", pain: 3, finding: "", stable: false }), ["Tekanan Darah"]);
    assert.deepEqual(validateFollowUpTemplateAnswers(definition, { bp: "120/80", pain: 3, finding: "", stable: false }), []);
  });

  test("formats answers without hardcoded specialty knowledge", () => {
    const formatted = formatFollowUpTemplateAnswers(template(), { bp: "120/80", pain: 3, finding: "normal", stable: true });
    assert.match(formatted, /Tekanan Darah: 120\/80 mmHg/);
    assert.match(formatted, /Stabil: true/);
  });

  test("finds a meaningful answer for fallback summary", () => {
    assert.equal(getFirstMeaningfulTemplateAnswer(template(), { bp: "", pain: 5, finding: "", stable: false }), "5");
  });
});
