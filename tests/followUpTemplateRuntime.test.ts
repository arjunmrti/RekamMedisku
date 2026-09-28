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

describe("followUpTemplateRuntime", () => {
  it("creates empty values for every stable field id", () => {
    expect(createInitialFollowUpTemplateAnswers(template())).toEqual({
      bp: "",
      pain: "",
      finding: "",
      stable: false,
    });
  });

  it("validates required values from the template definition", () => {
    const definition = template();
    expect(validateFollowUpTemplateAnswers(definition, { bp: "", pain: 3, finding: "", stable: false })).toEqual([
      "Tekanan Darah",
    ]);
    expect(validateFollowUpTemplateAnswers(definition, { bp: "120/80", pain: 3, finding: "", stable: false })).toEqual([]);
  });

  it("formats answers without hardcoded specialty knowledge", () => {
    expect(
      formatFollowUpTemplateAnswers(template(), {
        bp: "120/80",
        pain: 3,
        finding: "normal",
        stable: true,
      }),
    ).toContain("Tekanan Darah: 120/80 mmHg");
    expect(
      formatFollowUpTemplateAnswers(template(), {
        bp: "120/80",
        pain: 3,
        finding: "normal",
        stable: true,
      }),
    ).toContain("Stabil: true");
  });

  it("finds a meaningful answer for fallback summary", () => {
    expect(
      getFirstMeaningfulTemplateAnswer(template(), {
        bp: "",
        pain: 5,
        finding: "",
        stable: false,
      }),
    ).toBe("5");
  });
});
