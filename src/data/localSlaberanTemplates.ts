import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";
import { workspaceStorageKey } from "./workspaceStorage";

const TEMPLATES_KEY = "slaberan-templates";

function getStorageKey() {
  return workspaceStorageKey(TEMPLATES_KEY);
}

function readJson<T>(fallback: T): T {
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadSlaberanTemplates(): SlaberanTemplateRecord[] {
  const value = readJson<unknown>([]);

  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is SlaberanTemplateRecord =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SlaberanTemplateRecord).id === "string" &&
      typeof (item as SlaberanTemplateRecord).name === "string" &&
      typeof (item as SlaberanTemplateRecord).specialty === "string",
  );
}

export function replaceSlaberanTemplates(
  templates: SlaberanTemplateRecord[],
) {
  window.localStorage.setItem(getStorageKey(), JSON.stringify(templates));
}
