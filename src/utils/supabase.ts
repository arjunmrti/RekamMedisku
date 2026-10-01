import { createClient } from "@supabase/supabase-js";
import { isValidSupabaseConfiguration } from "./supabaseConfig";

export { isValidSupabaseConfiguration };

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
const supabaseKey = typeof rawKey === "string" ? rawKey.trim() : "";

export const isSupabaseConfigured = isValidSupabaseConfiguration(
  supabaseUrl,
  supabaseKey,
);

export const supabaseConfigError = !isSupabaseConfigured
  ? "Konfigurasi server RekamMedisku belum lengkap atau tidak valid."
  : null;

// Use a safe placeholder client when environment variables are missing so the
// application can mount, render the error boundary / login warning gracefully,
// and avoid unhandled startup crashes.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.local",
  supabaseKey || "placeholder-publishable-key",
);
