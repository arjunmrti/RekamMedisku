import type { ReportTemplateDefinition } from "../types/reportTemplate";
export type BoundReportTemplate = { latestVersion:number; latestSchemaVersion:number; latestDefinition?:ReportTemplateDefinition; versions?:{version:number;schemaVersion:number;definition:ReportTemplateDefinition}[] };
export function resolveBoundReportDefinition(template: BoundReportTemplate|undefined, boundVersion?: number) {
  if (!template) return undefined;
  const pinned = boundVersion == null ? undefined : template.versions?.find(v => v.version === boundVersion);
  if (pinned) return { definition: pinned.definition, version: pinned.version, schemaVersion: pinned.schemaVersion };
  return { definition: template.latestDefinition, version: template.latestVersion, schemaVersion: template.latestSchemaVersion };
}
