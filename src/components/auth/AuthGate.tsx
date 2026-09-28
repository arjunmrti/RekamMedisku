import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  getWorkspaceUserId,
  setWorkspaceUserId,
} from "../../data/workspaceStorage";
import LoginPage from "../../pages/auth/LoginPage";
import {
  startWorkspaceSync,
  stopWorkspaceSync,
  syncWorkspaceWithSupabase,
  waitForWorkspaceSyncIdle,
} from "../../data/supabaseSyncEngine";

type AuthGateProps = {
  children: ReactNode;
};

const WORKSPACE_HYDRATION_TIMEOUT_MS = 8_000;

function getWorkspaceSyncErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    if (
      candidate.code === "PGRST204" &&
      typeof candidate.message === "string" &&
      /admission_complaint/i.test(candidate.message)
    ) {
      return "Kolom admission_complaint belum tersedia di Supabase. Jalankan migration Package 7 pada database Supabase lalu muat ulang halaman.";
    }

    if (typeof candidate.message === "string" && candidate.message) {
      const parts = [candidate.message];

      if (typeof candidate.code === "string" && candidate.code) {
        parts.push("Kode: " + candidate.code);
      }

      if (typeof candidate.details === "string" && candidate.details) {
        parts.push("Detail: " + candidate.details);
      }

      if (typeof candidate.hint === "string" && candidate.hint) {
        parts.push("Petunjuk: " + candidate.hint);
      }

      return parts.join(" · ");
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Gagal memuat data cloud RekamMedisku.";
}

export default function AuthGate({ children }: AuthGateProps) {
  const { session, loading } = useAuth();
  const [workspaceUserId, setWorkspaceUserIdState] = useState<string | null>(
    () => getWorkspaceUserId(),
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    const nextUserId = session?.user.id ?? null;
    let cancelled = false;

    // Stop realtime immediately on every auth transition. Any in-flight
    // hydration is then drained before the active workspace user changes so
    // that its local writes cannot land in the next user's namespace.
    stopWorkspaceSync();

    async function transitionWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError("");

      await waitForWorkspaceSyncIdle();

      if (cancelled) return;

      setWorkspaceUserId(nextUserId);
      setWorkspaceUserIdState(nextUserId);

      if (!nextUserId) {
        setWorkspaceLoading(false);
        return;
      }

      let timeoutId: number | null = null;

      try {
        const hydrationPromise = syncWorkspaceWithSupabase(nextUserId);

        // Keep the underlying request handled even when the UI falls back to
        // local data after the timeout.
        void hydrationPromise
          .then(() => {
            if (!cancelled) {
              setWorkspaceError("");
            }
          })
          .catch((error) => {
            console.error("Supabase workspace hydration failed:", error);

            if (!cancelled) {
              setWorkspaceError(getWorkspaceSyncErrorMessage(error));
            }
          });

        await Promise.race([
          hydrationPromise,
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              reject(
                new Error(
                  "Sinkronisasi cloud belum selesai dalam 8 detik. RekamMedisku melanjutkan dengan cache lokal dan akan mencoba sinkronisasi di latar belakang.",
                ),
              );
            }, WORKSPACE_HYDRATION_TIMEOUT_MS);
          }),
        ]);
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(getWorkspaceSyncErrorMessage(error));
        }
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }

        if (!cancelled) {
          // The realtime/watchdog sync becomes the recovery path even when the
          // initial hydration times out or fails.
          startWorkspaceSync(nextUserId);
          setWorkspaceLoading(false);
        }
      }
    }

    void transitionWorkspace();

    return () => {
      cancelled = true;
      stopWorkspaceSync();
    };
  }, [session?.user.id]);

  if (loading || workspaceLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1677FF]"
          />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {loading
              ? "Memuat RekamMedisku..."
              : "Menyiapkan workspace RekamMedisku..."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Menutup sesi lama dan memuat data akun aktif.
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <>
      {workspaceError ? (
        <div
          role="status"
          className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                Sinkronisasi cloud tertunda
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Data lokal tetap tersedia. RekamMedisku akan mencoba sinkronisasi
                ulang secara otomatis.
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-amber-700/80">
                {workspaceError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-9 shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      ) : null}
      <Fragment key={workspaceUserId ?? "logged-out"}>{children}</Fragment>
    </>
  );
}
