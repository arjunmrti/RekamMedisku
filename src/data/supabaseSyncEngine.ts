import { supabase } from "../utils/supabase";
import { getWorkspaceUserId } from "./workspaceStorage";
import { syncFollowUpsWithSupabase } from "./supabaseFollowUps";
import { syncSlaberanLocationsWithSupabase } from "./supabaseSlaberanLocations";
import { syncSlaberanTemplatesWithSupabase } from "./supabaseSlaberanTemplates";
import { flushPendingAttachmentCleanupWithSupabase } from "./supabaseAttachments";

const WORKSPACE_SYNC_EVENT = "rekammedisku:workspace-synced";
const REALTIME_WATCHDOG_INTERVAL_MS = 5 * 60_000;
const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

type InFlightSync = {
  userId: string;
  promise: Promise<void>;
};

let syncInFlight: InFlightSync | null = null;
let activeCleanup: (() => void) | null = null;
let activeSyncUserId: string | null = null;

function notifyWorkspaceSynced() {
  window.dispatchEvent(new Event(WORKSPACE_SYNC_EVENT));
}

function assertWorkspaceUser(userId: string) {
  if (getWorkspaceUserId() !== userId) {
    throw new Error(
      "Sinkronisasi workspace dibatalkan karena sesi pengguna telah berubah.",
    );
  }
}

export function getWorkspaceSyncEventName() {
  return WORKSPACE_SYNC_EVENT;
}

export async function waitForWorkspaceSyncIdle(): Promise<void> {
  const current = syncInFlight?.promise;

  if (!current) return;

  try {
    await current;
  } catch {
    // The transition only needs the previous sync to settle. The original
    // error is already handled by the sync caller/UI.
  }
}

export async function syncWorkspaceWithSupabase(
  expectedUserId?: string,
): Promise<void> {
  const userId = expectedUserId ?? getWorkspaceUserId();

  if (!userId) {
    throw new Error("Workspace pengguna aktif tidak ditemukan.");
  }

  assertWorkspaceUser(userId);

  if (syncInFlight) {
    if (syncInFlight.userId === userId) {
      return syncInFlight.promise;
    }

    await waitForWorkspaceSyncIdle();
    assertWorkspaceUser(userId);
  }

  const promise = (async () => {
    assertWorkspaceUser(userId);

    await syncSlaberanLocationsWithSupabase();
    assertWorkspaceUser(userId);

    await syncSlaberanTemplatesWithSupabase();
    assertWorkspaceUser(userId);

    await syncFollowUpsWithSupabase();
    assertWorkspaceUser(userId);

    try {
      await flushPendingAttachmentCleanupWithSupabase();
      assertWorkspaceUser(userId);
    } catch (cleanupError) {
      if (getWorkspaceUserId() !== userId) {
        throw new Error(
          "Sinkronisasi workspace dibatalkan karena sesi pengguna telah berubah.",
        );
      }

      console.warn(
        "Workspace sync berhasil, tetapi cleanup attachment cloud tertunda.",
        cleanupError,
      );
    }

    assertWorkspaceUser(userId);
    notifyWorkspaceSynced();
  })();

  const trackedPromise = promise.finally(() => {
    if (syncInFlight?.promise === trackedPromise) {
      syncInFlight = null;
    }
  });

  syncInFlight = {
    userId,
    promise: trackedPromise,
  };

  return trackedPromise;
}

export function stopWorkspaceSync() {
  activeCleanup?.();
}

export function startWorkspaceSync(userId: string): () => void {
  if (getWorkspaceUserId() !== userId) {
    return () => undefined;
  }

  if (activeCleanup) {
    if (activeSyncUserId === userId) return activeCleanup;
    activeCleanup();
  }

  let disposed = false;
  let consecutiveFailures = 0;
  let nextRetryAt = 0;

  const sync = () => {
    if (
      disposed ||
      Date.now() < nextRetryAt ||
      getWorkspaceUserId() !== userId
    ) {
      return;
    }

    void syncWorkspaceWithSupabase(userId)
      .then(() => {
        consecutiveFailures = 0;
        nextRetryAt = 0;
      })
      .catch((error) => {
        if (disposed || getWorkspaceUserId() !== userId) return;

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
      // Keep an infrequent authoritative refresh even while Realtime says
      // SUBSCRIBED. Realtime remains the primary cross-browser path; the
      // watchdog is only a fallback for a silent/stuck channel.
      sync();
    }, REALTIME_WATCHDOG_INTERVAL_MS);
  };

  startWatchdog();

  const handleConnectivityRecovery = () => {
    if (getWorkspaceUserId() !== userId) return;
    nextRetryAt = 0;
    sync();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      handleConnectivityRecovery();
    }
  };

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

  window.addEventListener("online", handleConnectivityRecovery);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  activeSyncUserId = userId;
  const cleanup = () => {
    disposed = true;
    stopWatchdog();
    window.removeEventListener("online", handleConnectivityRecovery);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    void supabase.removeChannel(channel);

    if (activeCleanup === cleanup) {
      activeCleanup = null;
      activeSyncUserId = null;
    }
  };

  activeCleanup = cleanup;
  return cleanup;
}
