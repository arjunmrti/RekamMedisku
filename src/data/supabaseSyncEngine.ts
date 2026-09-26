import { supabase } from "../utils/supabase";
import { syncFollowUpsWithSupabase } from "./supabaseFollowUps";
import { syncSlaberanLocationsWithSupabase } from "./supabaseSlaberanLocations";
import { syncSlaberanTemplatesWithSupabase } from "./supabaseSlaberanTemplates";

const WORKSPACE_SYNC_EVENT = "rekammedisku:workspace-synced";
const REALTIME_WATCHDOG_INTERVAL_MS = 60_000;
const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

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
    await syncSlaberanLocationsWithSupabase();
    await syncSlaberanTemplatesWithSupabase();
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
  let consecutiveFailures = 0;
  let nextRetryAt = 0;

  const sync = () => {
    if (disposed || Date.now() < nextRetryAt) return;

    void syncWorkspaceWithSupabase()
      .then(() => {
        consecutiveFailures = 0;
        nextRetryAt = 0;
      })
      .catch((error) => {
        const delayIndex = Math.min(
          consecutiveFailures,
          SYNC_RETRY_DELAYS_MS.length - 1,
        );
        const delay = SYNC_RETRY_DELAYS_MS[delayIndex];
        consecutiveFailures += 1;
        nextRetryAt = Date.now() + delay;

        console.error(
          "Supabase workspace sync failed; backing off before the next automatic retry.",
          error,
        );
      });
  };

  let watchdogTimer: number | null = null;

  const stopWatchdog = () => {
    if (watchdogTimer === null) return;
    window.clearInterval(watchdogTimer);
    watchdogTimer = null;
  };

  const startWatchdog = () => {
    if (disposed || watchdogTimer !== null) return;

    watchdogTimer = window.setInterval(() => {
      // Keep a low-frequency authoritative refresh even while Realtime says
      // SUBSCRIBED. This closes the "silent/stuck channel" gap where no status
      // error is emitted even though events stop arriving.
      sync();
    }, REALTIME_WATCHDOG_INTERVAL_MS);
  };

  startWatchdog();

  const channel = supabase
    .channel("rekammedisku-workspace-sync-" + userId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "slaberan_locations",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "slaberan_templates",
        filter: "user_id=eq." + userId,
      },
      sync,
    )
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
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        console.warn(
          "Supabase Realtime unavailable; the sync watchdog will keep refreshing the workspace.",
        );
        sync();
      }
    });

  activeCleanup = () => {
    disposed = true;
    stopWatchdog();
    void supabase.removeChannel(channel);
    activeCleanup = null;
  };

  return activeCleanup;
}
