import test from "node:test";
import assert from "node:assert/strict";
import {
  STARTER_FOLLOW_UP_TEMPLATES,
  getStarterFollowUpTemplate,
} from "../src/data/starterFollowUpTemplates";
import { validateFollowUpTemplateDefinition } from "../src/utils/followUpTemplate";

test("starter follow-up templates use the supported schema contract", () => {
  assert.ok(STARTER_FOLLOW_UP_TEMPLATES.length >= 2);

  for (const starter of STARTER_FOLLOW_UP_TEMPLATES) {
    const validated = validateFollowUpTemplateDefinition(starter.definition);

    assert.equal(validated.schema_version, 1);
    assert.ok(validated.sections.length >= 1);
  }
});

test("starter template IDs are unique", () => {
  const ids = STARTER_FOLLOW_UP_TEMPLATES.map((starter) => starter.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("starter lookup returns the requested starter", () => {
  const starter = getStarterFollowUpTemplate("starter-neurology");

  assert.equal(starter?.id, "starter-neurology");
  assert.equal(starter?.metadata.source, "starter");
});

test("starter definitions are treated as source definitions, not mutable instances", () => {
  const starter = getStarterFollowUpTemplate("starter-neurology");
  assert.ok(starter);

  const originalLabel = starter.definition.sections[0].fields[0].label;
  const cloned = structuredClone(starter.definition);
  cloned.sections[0].fields[0].label = "Label pribadi";

  assert.equal(starter.definition.sections[0].fields[0].label, originalLabel);
});
