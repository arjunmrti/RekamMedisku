import test from "node:test";
import assert from "node:assert/strict";
import { resolveBoundReportDefinition, type BoundReportTemplate } from "../src/utils/reportTemplateBinding";

const template = (version: number): BoundReportTemplate => ({ latestVersion: 2, latestSchemaVersion: 1, latestDefinition: { schema_version: 1, sections: [{ id: "v2", enabled: true, label: "V2", body: "new" }] }, versions: [{ version: 1, schemaVersion: 1, definition: { schema_version: 1, sections: [{ id: "v1", enabled: true, label: "V1", body: "old" }] } }, { version, schemaVersion: 1, definition: { schema_version: 1, sections: [] } }] });

test("bound report version remains active after newer version exists", () => {
  const resolved = resolveBoundReportDefinition(template(2), 1);
  assert.equal(resolved?.version, 1);
  assert.equal(resolved?.definition?.sections[0]?.body, "old");
});

test("unversioned legacy binding uses latest report version", () => {
  const resolved = resolveBoundReportDefinition(template(2));
  assert.equal(resolved?.version, 2);
  assert.equal(resolved?.definition?.sections[0]?.body, "new");
});
