const STORAGE_PREFIX = "rekammedisku:user:";
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
  if (!activeUserId) {
    return "rekammedisku:" + normalizedKey;
  }

  return STORAGE_PREFIX + activeUserId + ":" + normalizedKey;
}
