import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialFollowUpTemplateAnswers,
  formatFollowUpTemplateAnswers,
  getFirstMeaningfulTemplateAnswer,
  normalizeFollowUpTemplateAnswers,
  validateFollowUpTemplateAnswers,
  validateFollowUpTemplateAnswerShape,
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
          {
            id: "flags",
            label: "Tanda",
            type: "multiselect",
            options: [
              { value: "red", label: "Merah" },
              { value: "yellow", label: "Kuning" },
            ],
          },
          { id: "stable", label: "Stabil", type: "checkbox" },
        ],
      },
    ],
  };
}

test("follow-up template runtime creates type-safe empty defaults", () => {
  assert.deepEqual(createInitialFollowUpTemplateAnswers(template()), {
    bp: "",
    pain: null,
    finding: "",
    flags: [],
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
      flags: [],
      stable: false,
    }),
    ["Tekanan Darah"],
  );

  assert.deepEqual(
    validateFollowUpTemplateAnswers(definition, {
      bp: "120/80",
      pain: 3,
      finding: "",
      flags: [],
      stable: false,
    }),
    [],
  );
});

test("renderer answer contract accepts the value type for each field", () => {
  assert.deepEqual(
    validateFollowUpTemplateAnswerShape(template(), {
      bp: "120/80",
      pain: 3,
      finding: "normal",
      flags: ["red"],
      stable: true,
    }),
    [],
  );
});

test("renderer answer contract rejects invalid number and select values", () => {
  assert.deepEqual(
    validateFollowUpTemplateAnswerShape(template(), {
      bp: "120/80",
      pain: "3" as never,
      finding: "unknown",
      flags: [],
      stable: true,
    }),
    [
      "Field \"NRS\" harus berupa angka.",
      "Field \"Temuan\" memiliki pilihan yang tidak tersedia.",
    ],
  );
});

test("renderer answer contract rejects invalid multiselect and checkbox values", () => {
  assert.deepEqual(
    validateFollowUpTemplateAnswerShape(template(), {
      bp: "120/80",
      pain: null,
      finding: "",
      flags: ["red", "red"],
      stable: "yes" as never,
    }),
    [
      "Field \"Tanda\" memiliki pilihan duplikat.",
      "Field \"Stabil\" harus berupa pilihan ya/tidak.",
    ],
  );
});

test("runtime normalization converts an empty number to null", () => {
  assert.deepEqual(
    normalizeFollowUpTemplateAnswers(template(), {
      bp: "",
      pain: "" as never,
      finding: "",
      flags: [],
      stable: false,
    }),
    {
      bp: "",
      pain: null,
      finding: "",
      flags: [],
      stable: false,
    },
  );
});

test("follow-up template runtime formats labels instead of internal option values", () => {
  const formatted = formatFollowUpTemplateAnswers(template(), {
    bp: "120/80",
    pain: 3,
    finding: "normal",
    flags: ["red", "yellow"],
    stable: true,
  });

  assert.match(formatted, /Tekanan Darah: 120\/80 mmHg/);
  assert.match(formatted, /Temuan: Normal/);
  assert.match(formatted, /Tanda: Merah, Kuning/);
  assert.match(formatted, /Stabil: true/);
});


test("formatter omits false checkbox values", () => {
  const formatted = formatFollowUpTemplateAnswers(template(), {
    bp: "120/80",
    pain: 3,
    finding: "normal",
    flags: [],
    stable: false,
  });

  assert.doesNotMatch(formatted, /Stabil: false/);
});

test("follow-up template runtime finds a meaningful display label", () => {
  assert.equal(
    getFirstMeaningfulTemplateAnswer(template(), {
      bp: "",
      pain: null,
      finding: "abnormal",
      flags: [],
      stable: false,
    }),
    "Abnormal",
  );
});
