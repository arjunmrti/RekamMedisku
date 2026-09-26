import type { SlaberanTemplateRecord } from "../types/slaberanTemplate";
import { replaceSlaberanTemplates } from "./localSlaberanTemplates";
import { supabase } from "../utils/supabase";

type SlaberanTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  doctor: string;
  specialty: string;
  hospital: string;
  opening: string;
  show_empty_rooms: boolean;
  blocks: unknown;
  settings: unknown;
  schema_version: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (typeof candidate.message === "string" && candidate.message) {
      const parts = [candidate.message];

      if (typeof candidate.code === "string" && candidate.code) {
        parts.push("Kode: " + candidate.code);
      }

      if (typeof candidate.details === "string" && candidate.details) {
        parts.push("Detail: " + candidate.details);
      }

      if (typeof candidate.hint === "string" && candidate.hint) {
        parts.push("Petunjuk: " + candidate.hint);
      }

      return parts.join(" · ");
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "Gagal menyimpan template Slaberan.";
}

function parseBlocks(value: unknown): SlaberanTemplateRecord["blocks"] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is SlaberanTemplateRecord["blocks"][number] =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { id?: unknown }).id === "string" &&
      typeof (item as { type?: unknown }).type === "string" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { enabled?: unknown }).enabled === "boolean" &&
      typeof (item as { config?: unknown }).config === "object" &&
      (item as { config?: unknown }).config !== null,
  );
}

function toTemplate(row: SlaberanTemplateRow): SlaberanTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    doctor: row.doctor,
    specialty: row.specialty,
    hospital: row.hospital,
    opening: row.opening,
    showEmptyRooms: row.show_empty_rooms,
    blocks: parseBlocks(row.blocks),
    settings:
      typeof row.settings === "object" &&
      row.settings !== null &&
      !Array.isArray(row.settings)
        ? (row.settings as Record<string, unknown>)
        : {},
    schemaVersion: row.schema_version,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Sesi RekamMedisku tidak ditemukan.");

  return user.id;
}

async function clearDefaultTemplate(userId: string, excludedId?: string) {
  let query = supabase
    .from("slaberan_templates")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  if (excludedId) query = query.neq("id", excludedId);

  const { error } = await query;

  if (error) throw new Error(getErrorMessage(error));
}

export async function syncSlaberanTemplatesWithSupabase(): Promise<
  SlaberanTemplateRecord[]
> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("slaberan_templates")
    .select(
      "id,user_id,name,doctor,specialty,hospital,opening,show_empty_rooms,blocks,settings,schema_version,is_default,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(getErrorMessage(error));

  const templates = ((data ?? []) as SlaberanTemplateRow[]).map(toTemplate);
  replaceSlaberanTemplates(templates);
  return templates;
}

export async function createSlaberanTemplate(
  input: Omit<SlaberanTemplateRecord, "id" | "createdAt" | "updatedAt">,
): Promise<SlaberanTemplateRecord> {
  const userId = await getCurrentUserId();

  if (input.isDefault) {
    await clearDefaultTemplate(userId);
  }

  const { data, error } = await supabase
    .from("slaberan_templates")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      doctor: input.doctor.trim(),
      specialty: input.specialty.trim(),
      hospital: input.hospital.trim(),
      opening: input.opening,
      show_empty_rooms: input.showEmptyRooms,
      blocks: input.blocks,
      settings: input.settings,
      schema_version: input.schemaVersion,
      is_default: input.isDefault,
    })
    .select(
      "id,user_id,name,doctor,specialty,hospital,opening,show_empty_rooms,blocks,settings,schema_version,is_default,created_at,updated_at",
    )
    .single<SlaberanTemplateRow>();

  if (error) throw new Error(getErrorMessage(error));

  const createdTemplate = toTemplate(data);
  await syncSlaberanTemplatesWithSupabase();
  return createdTemplate;
}

export async function updateSlaberanTemplate(
  templateId: string,
  input: Partial<Omit<SlaberanTemplateRecord, "id" | "createdAt" | "updatedAt">>,
): Promise<SlaberanTemplateRecord> {
  const userId = await getCurrentUserId();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.doctor !== undefined) update.doctor = input.doctor.trim();
  if (input.specialty !== undefined) update.specialty = input.specialty.trim();
  if (input.hospital !== undefined) update.hospital = input.hospital.trim();
  if (input.opening !== undefined) update.opening = input.opening;
  if (input.showEmptyRooms !== undefined) {
    update.show_empty_rooms = input.showEmptyRooms;
  }
  if (input.blocks !== undefined) update.blocks = input.blocks;
  if (input.settings !== undefined) update.settings = input.settings;
  if (input.schemaVersion !== undefined) {
    update.schema_version = input.schemaVersion;
  }
  if (input.isDefault !== undefined) update.is_default = input.isDefault;

  if (input.isDefault === true) {
    await clearDefaultTemplate(userId, templateId);
  }

  const { data, error } = await supabase
    .from("slaberan_templates")
    .update(update)
    .eq("id", templateId)
    .eq("user_id", userId)
    .select(
      "id,user_id,name,doctor,specialty,hospital,opening,show_empty_rooms,blocks,settings,schema_version,is_default,created_at,updated_at",
    )
    .single<SlaberanTemplateRow>();

  if (error) throw new Error(getErrorMessage(error));

  const updatedTemplate = toTemplate(data);
  await syncSlaberanTemplatesWithSupabase();
  return updatedTemplate;
}

export async function deleteSlaberanTemplate(
  templateId: string,
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("slaberan_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) throw new Error(getErrorMessage(error));
  await syncSlaberanTemplatesWithSupabase();
}