import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { setWorkspaceUserId } from "../../data/workspaceStorage";
import LoginPage from "../../pages/auth/LoginPage";
import {
  startWorkspaceSync,
  syncWorkspaceWithSupabase,
} from "../../data/supabaseSyncEngine";

type AuthGateProps = {
  children: ReactNode;
};

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
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    setWorkspaceUserId(session?.user.id ?? null);

    if (!session) {
      setWorkspaceLoading(false);
      setWorkspaceError("");
      return;
    }

    let cancelled = false;

    const authenticatedUserId = session.user.id;
    let stopWorkspaceSync: (() => void) | null = null;

    async function hydrateWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError("");

      try {
        // Hydrate the cloud workspace before rendering the app so a fresh
        // browser starts from the authenticated Supabase state.
        await syncWorkspaceWithSupabase();

        if (cancelled) return;

        // Keep the local cache fresh from other browsers/tabs. Realtime
        // triggers immediate refreshes when available; the sync watchdog
        // provides a low-frequency safety net for silent/stuck channels.
        stopWorkspaceSync = startWorkspaceSync(authenticatedUserId);
      } catch (error) {
        console.error("Supabase workspace hydration failed:", error);

        if (!cancelled) {
          setWorkspaceError(getWorkspaceSyncErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void hydrateWorkspace();

    return () => {
      cancelled = true;
      stopWorkspaceSync?.();
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
              : "Menyinkronkan data RekamMedisku..."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Menyiapkan workspace dari Supabase.
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  if (workspaceError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(16,42,86,0.28)] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">
            Sinkronisasi Workspace Gagal
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Data cloud belum berhasil dimuat
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            RekamMedisku tidak akan menampilkan workspace sebelum data Supabase
            berhasil dibaca. Periksa koneksi dan konfigurasi Supabase lalu muat
            ulang halaman.
          </p>
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700">
            {workspaceError}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-11 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-600"
          >
            Muat Ulang
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
