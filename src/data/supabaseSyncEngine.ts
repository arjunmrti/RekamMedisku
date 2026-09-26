import { supabase } from "../utils/supabase";
import { syncFollowUpsWithSupabase } from "./supabaseFollowUps";

const SYNC_INTERVAL_MS = 15_000;
const WORKSPACE_SYNC_EVENT = "rekammedisku:workspace-synced";

let syncInFlight: Promise<void> | null = null;
let activeCleanup: (() => void) | null = null;

function notifyWorkspaceSynced() {
  window.dispatchEvent(new Event(WORKSPACE_SYNC_EVENT));
}

export function getWorkspaceSyncEventName() {
  return WORKSPACE_SYNC_EVENT;
}

export async function syncWorkspaceWithSupabase(): Promise<void> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    await syncFollowUpsWithSupabase();
    notifyWorkspaceSynced();
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export function startWorkspaceSync(userId: string): () => void {
  if (activeCleanup) return activeCleanup;

  let disposed = false;
  let intervalId: number | null = null;

  const sync = () => {
    if (disposed) return;

    void syncWorkspaceWithSupabase().catch((error) => {
      console.error("Supabase background sync failed:", error);
    });
  };

  const handleFocus = () => sync();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") sync();
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);
  intervalId = window.setInterval(sync, SYNC_INTERVAL_MS);

  const channel = supabase
    .channel("rekammedisku-workspace-sync-" + userId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rotations",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "patients",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "follow_ups",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "supporting_exams",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(
          "Supabase Realtime unavailable; polling/focus sync remains active.",
        );
      }
    });

  activeCleanup = () => {
    disposed = true;

    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);

    if (intervalId !== null) {
      window.clearInterval(intervalId);
    }

    void supabase.removeChannel(channel);
    activeCleanup = null;
  };

  return activeCleanup;
}
