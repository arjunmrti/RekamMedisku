import { supabase } from "./supabase";

export async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Sesi RekamMedisku tidak ditemukan.");
  }

  return userId;
}
