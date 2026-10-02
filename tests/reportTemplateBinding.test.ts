import test from "node:test";
import assert from "node:assert/strict";

test("rotation default report template binding takes priority", () => {
  const rotation = {
    id: "r1",
    defaultReportTemplateId: "default-tpl",
    reportTemplateId: "legacy-tpl",
  };
  const templates = [
    { id: "default-tpl", name: "Default", latestVersion: 2, latestDefinition: { schema_version: 1, sections: [] } },
    { id: "legacy-tpl", name: "Legacy", latestVersion: 1, latestDefinition: { schema_version: 1, sections: [] } },
  ];
  const boundId = rotation.defaultReportTemplateId ?? rotation.reportTemplateId;
  const selected = templates.find((t) => t.id === boundId);
  assert.equal(selected?.id, "default-tpl");
});

test("rotation falls back to reportTemplateId when defaultReportTemplateId missing", () => {
  const rotation = { id: "r1", reportTemplateId: "legacy-tpl" };
  const templates = [{ id: "legacy-tpl", name: "Legacy", latestVersion: 1 }];
  const boundId = rotation.reportTemplateId;
  const selected = templates.find((t) => t.id === boundId);
  assert.equal(selected?.id, "legacy-tpl");
});

test("rotation without any binding uses undefined", () => {
  const rotation: { id: string; defaultReportTemplateId?: string; reportTemplateId?: string } = { id: "r1" };
  const boundId = rotation.defaultReportTemplateId ?? rotation.reportTemplateId;
  assert.equal(boundId, undefined);
});
