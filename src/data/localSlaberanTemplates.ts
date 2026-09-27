import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";
import { workspaceStorageKey } from "./workspaceStorage";

const TEMPLATES_KEY = "slaberan-templates";

function getStorageKey() {
  return workspaceStorageKey(TEMPLATES_KEY);
}

function readTemplates(): SlaberanTemplateRecord[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is SlaberanTemplateRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SlaberanTemplateRecord).id === "string" &&
        typeof (item as SlaberanTemplateRecord).name === "string" &&
        Array.isArray((item as SlaberanTemplateRecord).blocks),
    );
  } catch {
    return [];
  }
}

export function loadSlaberanTemplates(): SlaberanTemplateRecord[] {
  return readTemplates();
}

export function saveSlaberanTemplates(
  templates: SlaberanTemplateRecord[],
) {
  window.localStorage.setItem(
    getStorageKey(),
    JSON.stringify(templates),
  );
}

export function replaceSlaberanTemplates(
  templates: SlaberanTemplateRecord[],
) {
  saveSlaberanTemplates(templates);
}