import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialFollowUpTemplateAnswers,
  formatFollowUpTemplateAnswers,
  getFirstMeaningfulTemplateAnswer,
  validateFollowUpTemplateAnswers,
} from "../src/utils/followUpTemplateRuntime";
import type { FollowUpTemplateDefinition } from "../src/types/followUpTemplate";

function template(): FollowUpTemplateDefinition {
  return {
    schema_version: 1,
    sections: [
      {
        id: "objective",
        title: "Objective",
        fields: [
          {
            id: "bp",
            label: "Tekanan Darah",
            type: "text",
            required: true,
            unit: "mmHg",
          },
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

test("follow-up template runtime creates stable defaults", () => {
  assert.deepEqual(createInitialFollowUpTemplateAnswers(template()), {
    bp: "",
    pain: "",
    finding: "",
    stable: false,
  });
});

test("follow-up template runtime validates required values", () => {
  const definition = template();

  assert.deepEqual(
    validateFollowUpTemplateAnswers(definition, {
      bp: "",
      pain: 3,
      finding: "",
      stable: false,
    }),
    ["Tekanan Darah"],
  );

  assert.deepEqual(
    validateFollowUpTemplateAnswers(definition, {
      bp: "120/80",
      pain: 3,
      finding: "",
      stable: false,
    }),
    [],
  );
});

test("follow-up template runtime formats answers without specialty branches", () => {
  const formatted = formatFollowUpTemplateAnswers(template(), {
    bp: "120/80",
    pain: 3,
    finding: "normal",
    stable: true,
  });

  assert.match(formatted, /Tekanan Darah: 120\/80 mmHg/);
  assert.match(formatted, /Stabil: true/);
});

test("follow-up template runtime finds a meaningful answer for summary fallback", () => {
  assert.equal(
    getFirstMeaningfulTemplateAnswer(template(), {
      bp: "",
      pain: 5,
      finding: "",
      stable: false,
    }),
    "5",
  );
});
