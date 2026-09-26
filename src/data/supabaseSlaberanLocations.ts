import type {
  SlaberanLocation,
  SlaberanLocationType,
} from "../types/slaberanLocation";
import { replaceSlaberanLocations } from "./localSlaberanLocations";
import { supabase } from "../utils/supabase";
import { getAuthenticatedUserId } from "../utils/authenticatedUser";

type SlaberanLocationRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  type: SlaberanLocationType;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toLocation(row: SlaberanLocationRow): SlaberanLocation {
  return {
    id: row.id,
    type: row.type,
    parentId: row.parent_id ?? undefined,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
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
  return "Gagal menyimpan struktur lokasi Slaberan.";
}

export async function syncSlaberanLocationsWithSupabase(): Promise<
  SlaberanLocation[]
> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("slaberan_locations")
    .select(
      "id,user_id,parent_id,type,name,sort_order,is_active,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(getErrorMessage(error));

  const locations = ((data ?? []) as SlaberanLocationRow[]).map(toLocation);
  replaceSlaberanLocations(locations);
  return locations;
}

export async function createSlaberanLocation(input: {
  type: SlaberanLocationType;
  name: string;
  parentId?: string;
  sortOrder?: number;
}): Promise<SlaberanLocation[]> {
  const userId = await getCurrentUserId();

  if (!input.name.trim()) throw new Error("Nama lokasi wajib diisi.");

  const { error } = await supabase.from("slaberan_locations").insert({
    user_id: userId,
    parent_id: input.parentId ?? null,
    type: input.type,
    name: input.name.trim(),
    sort_order: input.sortOrder ?? 0,
  });

  if (error) throw new Error(getErrorMessage(error));
  return syncSlaberanLocationsWithSupabase();
}

export async function updateSlaberanLocation(
  locationId: string,
  input: Partial<{
    type: SlaberanLocationType;
    name: string;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<SlaberanLocation[]> {
  const userId = await getCurrentUserId();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.type !== undefined) update.type = input.type;
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("Nama lokasi wajib diisi.");
    update.name = input.name.trim();
  }
  if (input.parentId !== undefined) update.parent_id = input.parentId;
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
  if (input.isActive !== undefined) update.is_active = input.isActive;

  const { error } = await supabase
    .from("slaberan_locations")
    .update(update)
    .eq("id", locationId)
    .eq("user_id", userId);

  if (error) throw new Error(getErrorMessage(error));
  return syncSlaberanLocationsWithSupabase();
}

export async function swapSlaberanLocations(
  locationId: string,
  targetLocationId: string,
): Promise<SlaberanLocation[]> {
  await getCurrentUserId();

  const { error } = await supabase.rpc("swap_slaberan_locations", {
    p_location_id: locationId,
    p_target_location_id: targetLocationId,
  });

  if (error) throw new Error(getErrorMessage(error));
  return syncSlaberanLocationsWithSupabase();
}

export async function deleteSlaberanLocation(
  locationId: string,
): Promise<SlaberanLocation[]> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("slaberan_locations")
    .delete()
    .eq("id", locationId)
    .eq("user_id", userId);

  if (error) throw new Error(getErrorMessage(error));
  return syncSlaberanLocationsWithSupabase();
}
