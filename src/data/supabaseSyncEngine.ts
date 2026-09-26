import { supabase } from "../utils/supabase";
import { syncFollowUpsWithSupabase } from "./supabaseFollowUps";

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

  const sync = () => {
    if (disposed) return;

    void syncWorkspaceWithSupabase().catch((error) => {
      console.error("Supabase Realtime sync failed:", error);
    });
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
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(
          "Supabase Realtime unavailable; no background polling is active.",
        );
      }
    });

  activeCleanup = () => {
    disposed = true;
    void supabase.removeChannel(channel);
    activeCleanup = null;
  };

  return activeCleanup;
}
