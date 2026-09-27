const STORAGE_PREFIX = "rekammedisku:user:";
const FALLBACK_USER_SCOPE = "anonymous";

let activeUserId: string | null = null;

export function setWorkspaceUserId(userId: string | null | undefined) {
  const normalized = typeof userId === "string" ? userId.trim() : "";
  activeUserId = normalized || null;
}

export function getWorkspaceUserId() {
  return activeUserId;
}

export function workspaceStorageKey(baseKey: string) {
  const normalizedKey = baseKey.replace(/^rekammedisku:/, "");
  const userScope = activeUserId ?? FALLBACK_USER_SCOPE;
  return STORAGE_PREFIX + userScope + ":" + normalizedKey;
}
