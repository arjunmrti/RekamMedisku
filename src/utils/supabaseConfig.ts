export function isValidSupabaseConfiguration(
  url: unknown,
  key: unknown,
): boolean {
  if (typeof url !== "string" || typeof key !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    const isLocalHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    const isRemoteHttps = parsed.protocol === "https:";
    return (
      (isRemoteHttps || isLocalHttp) &&
      Boolean(parsed.host) &&
      !parsed.host.includes("placeholder.supabase.local") &&
      Boolean(key.trim()) &&
      key.trim() !== "placeholder-publishable-key"
    );
  } catch {
    return false;
  }
}
