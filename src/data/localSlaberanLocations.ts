import type { SlaberanLocation } from "../types/slaberanLocation";

const LOCATIONS_KEY = "rekammedisku:slaberan-locations";

function readJson<T>(fallback: T): T {
  try {
    const raw = window.localStorage.getItem(LOCATIONS_KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadSlaberanLocations(): SlaberanLocation[] {
  const value = readJson<unknown>([]);

  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is SlaberanLocation =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SlaberanLocation).id === "string" &&
      typeof (item as SlaberanLocation).name === "string" &&
      typeof (item as SlaberanLocation).type === "string",
  );
}

export function saveSlaberanLocations(locations: SlaberanLocation[]) {
  window.localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
}

export function replaceSlaberanLocations(locations: SlaberanLocation[]) {
  saveSlaberanLocations(locations);
}
