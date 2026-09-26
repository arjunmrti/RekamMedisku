import { supabase } from "../utils/supabase";
import { syncFollowUpsWithSupabase } from "./supabaseFollowUps";

const WORKSPACE_SYNC_EVENT = "rekammedisku:workspace-synced";
const REALTIME_FALLBACK_INTERVAL_MS = 30_000;

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

  const sync = () => {
    if (disposed) return;

    void syncWorkspaceWithSupabase().catch((error) => {
      console.error("Supabase workspace sync failed:", error);
      startPolling();
    });
  };

  let pollingTimer: number | null = null;

  const stopPolling = () => {
    if (pollingTimer === null) return;
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  };

  const startPolling = () => {
    if (disposed || pollingTimer !== null) return;

    sync();

    pollingTimer = window.setInterval(() => {
      sync();
    }, REALTIME_FALLBACK_INTERVAL_MS);
  };

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
      if (status === "SUBSCRIBED") {
        stopPolling();
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        console.warn(
          "Supabase Realtime unavailable; falling back to background polling.",
        );
        startPolling();
      }
    });

  activeCleanup = () => {
    disposed = true;
    stopPolling();
    void supabase.removeChannel(channel);
    activeCleanup = null;
  };

  return activeCleanup;
}
