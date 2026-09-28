import type { ApplicationProfile, ApplicationProfileInput } from "../types/profile";
import { supabase } from "../utils/supabase";

export const APPLICATION_PROFILE_EVENT = "rekammedisku:application-profile-updated";

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeProfile(row: Record<string, unknown>): ApplicationProfile | null {
  if (typeof row.id !== "string" || !row.id.trim()) {
    return null;
  }

  const name = normalizeOptionalText(row.name);

  if (!name) {
    return null;
  }

  return {
    id: row.id,
    name,
    username: normalizeOptionalText(row.username),
    studentId: normalizeOptionalText(row.student_id),
    program: normalizeOptionalText(row.program),
    institution: normalizeOptionalText(row.institution),
  };
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) {
    throw new Error("Sesi RekamMedisku tidak ditemukan.");
  }

  return user.id;
}

export async function loadApplicationProfile(userId?: string) {
  const authenticatedUserId = await getAuthenticatedUserId();
  const expectedUserId = userId?.trim() || authenticatedUserId;

  if (expectedUserId !== authenticatedUserId) {
    throw new Error("Workspace profil tidak cocok dengan sesi pengguna aktif.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,username,student_id,program,institution")
    .eq("id", authenticatedUserId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Profil aplikasi belum tersedia untuk akun ini. Muat ulang atau periksa provisioning profile di Supabase.",
    );
  }

  const profile = normalizeProfile(data as Record<string, unknown>);

  if (!profile) {
    throw new Error(
      "Profil aplikasi belum memiliki nama yang valid. Lengkapi profil sebelum membuat laporan.",
    );
  }

  return profile;
}

export async function updateApplicationProfile(
  input: ApplicationProfileInput,
  userId?: string,
) {
  const authenticatedUserId = await getAuthenticatedUserId();
  const expectedUserId = userId?.trim() || authenticatedUserId;

  if (expectedUserId !== authenticatedUserId) {
    throw new Error("Workspace profil tidak cocok dengan sesi pengguna aktif.");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Nama wajib diisi.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name,
      username: normalizeOptionalText(input.username),
      student_id: normalizeOptionalText(input.studentId),
      program: normalizeOptionalText(input.program),
      institution: normalizeOptionalText(input.institution),
    })
    .eq("id", authenticatedUserId)
    .select("id,name,username,student_id,program,institution")
    .single();

  if (error) throw error;

  const profile = normalizeProfile(data as Record<string, unknown>);

  if (!profile) {
    throw new Error("Profil aplikasi gagal divalidasi setelah disimpan.");
  }

  window.dispatchEvent(new Event(APPLICATION_PROFILE_EVENT));

  return profile;
}
