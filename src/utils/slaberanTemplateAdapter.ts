import type { SlaberanTemplate } from "../types/slaberan";
import type { SlaberanLocation } from "../types/slaberanLocation";
import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";

type TemplateSettings = {
  locationGroups?: unknown;
  specialRooms?: unknown;
};

function parseLocationGroups(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (group): group is { label: string; rooms: string[] } =>
      typeof group === "object" &&
      group !== null &&
      typeof (group as { label?: unknown }).label === "string" &&
      Array.isArray((group as { rooms?: unknown }).rooms) &&
      (group as { rooms: unknown[] }).rooms.every(
        (room) => typeof room === "string" && room.trim().length > 0,
      ),
  );
}

function parseSpecialRooms(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (room): room is string => typeof room === "string" && room.trim().length > 0,
  );
}

function deriveLocations(locations: SlaberanLocation[]) {
  const activeLocations = locations
    .filter((location) => location.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const floors = activeLocations.filter((location) => location.type === "floor");
  const groups = floors
    .map((floor) => ({
      label: floor.name,
      rooms: activeLocations
        .filter(
          (location) =>
            location.parentId === floor.id && location.type === "ward",
        )
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        )
        .map((location) => location.name),
    }))
    .filter((group) => group.rooms.length > 0);

  const rootWards = activeLocations
    .filter((location) => location.type === "ward" && !location.parentId)
    .map((location) => location.name);

  if (rootWards.length > 0) {
    groups.push({
      label: "Ruangan",
      rooms: rootWards,
    });
  }

  const specialRooms = activeLocations
    .filter((location) => location.type === "special")
    .map((location) => location.name);

  return { groups, specialRooms };
}

export function adaptSlaberanTemplateRecord(
  record: SlaberanTemplateRecord,
  locations: SlaberanLocation[],
  fallback: SlaberanTemplate,
): SlaberanTemplate {
  const settings =
    record.settings && typeof record.settings === "object"
      ? (record.settings as TemplateSettings)
      : {};

  const derived = deriveLocations(locations);
  const configuredGroups = parseLocationGroups(settings.locationGroups);
  const configuredSpecialRooms = parseSpecialRooms(settings.specialRooms);

  return {
    id: record.id,
    name: record.name,
    specialty: record.specialty || fallback.specialty,
    hospital: record.hospital || fallback.hospital,
    opening: record.opening || fallback.opening,
    showEmptyRooms: record.showEmptyRooms,
    locationGroups:
      configuredGroups.length > 0
        ? configuredGroups
        : derived.groups.length > 0
          ? derived.groups
          : fallback.locationGroups,
    specialRooms:
      configuredSpecialRooms.length > 0
        ? configuredSpecialRooms
        : derived.specialRooms.length > 0
          ? derived.specialRooms
          : fallback.specialRooms,
  };
}
