import { useMemo } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import Icon from "../../components/ui/Icon";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { loadSlaberanLocations } from "../../data/localSlaberanLocations";
import { loadSlaberanTemplates } from "../../data/localSlaberanTemplates";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";

type ReportHubPageProps = NavigationProps & {
  onSelectMode: (mode: "follow-up" | "slaberan") => void;
};

export default function ReportHubPage({
  activeItem,
  onNavigate,
  onSelectMode,
}: ReportHubPageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const activeRotation = loadActiveRotation();
  const patients = loadPatients();

  const activePatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.rotationId === activeRotation.id &&
          patient.status === "Aktif",
      ),
    [activeRotation.id, patients, workspaceSyncVersion],
  );

  const storedFollowUpCount = useMemo(() => {
    const saved = loadSavedFollowUps();

    return activePatients.reduce(
      (total, patient) =>
        total +
        (saved[patient.id] ?? []).filter(
          (entry) => entry.status === "Tersimpan",
        ).length,
      0,
    );
  }, [activePatients]);

  const slaberanStats = useMemo(() => {
    const storedTemplates = loadSlaberanTemplates();
    const activeLocations = loadSlaberanLocations().filter(
      (location) => location.isActive,
    );

    return {
      templateCount: storedTemplates.length > 0 ? storedTemplates.length : 1,
      activeLocationCount: activeLocations.length,
    };
  }, [workspaceSyncVersion]);

  const handleFollowUp = () => {
    onSelectMode("follow-up");
  };

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue=""
      onSearchChange={() => undefined}
      searchEnabled={false}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1180px] space-y-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                Workspace · Laporan
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Semua Laporan
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                Pilih jenis laporan yang ingin kamu kerjakan. Setiap workflow
                memiliki sumber data dan proses yang berbeda.
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Stase aktif
              </p>
              <p className="mt-0.5 max-w-[220px] truncate text-xs font-bold text-slate-800">
                {activeRotation.name}
              </p>
            </div>
          </header>

          <section
            aria-labelledby="report-options-title"
            className="space-y-4"
          >
            <div>
              <h2
                id="report-options-title"
                className="text-sm font-bold text-slate-900"
              >
                Pilih jenis laporan
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Mulai dari workflow yang sesuai dengan kebutuhanmu.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <article className="group flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_30px_-22px_rgba(16,42,86,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_36px_-22px_rgba(22,119,255,0.2)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1677FF]">
                    <Icon name="document" className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    Follow-Up
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    Laporan Follow-Up
                  </h3>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                    Ubah follow-up pasien yang sudah tersimpan menjadi laporan
                    yang siap ditinjau, diedit, dan disalin.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Follow-Up tersimpan
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {storedFollowUpCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Pasien aktif
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {activePatients.length}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-7">
                  <div className="space-y-2.5">
                    {!activePatients.length ? (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                        <Icon
                          name="alert"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                        />
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          Belum ada pasien aktif. Tambahkan pasien terlebih dahulu
                          agar laporan Follow-Up bisa dibuat.
                        </p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleFollowUp}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25"
                    >
                      Buat Laporan Follow-Up
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>

              <article className="group flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 shadow-[0_8px_30px_-22px_rgba(22,119,255,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_36px_-22px_rgba(22,119,255,0.24)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-[#1677FF]">
                    <Icon name="layers" className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-blue-100 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#1677FF]">
                    Slaberan
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    Buat Slaberan
                  </h3>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                    Generate laporan harian dari template dokter, pasien aktif,
                    lokasi, dan follow-up yang sudah tersimpan.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-blue-100/80 bg-white/80 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Pasien aktif
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {activePatients.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100/80 bg-white/80 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Template tersedia
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {slaberanStats.templateCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100/80 bg-white/80 p-3.5">
                    <p className="text-[10px] font-semibold text-slate-400">
                      Lokasi aktif
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {slaberanStats.activeLocationCount}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-7">
                  <button
                    type="button"
                    onClick={() => onSelectMode("slaberan")}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25"
                  >
                    Buka Slaberan
                    <Icon name="arrow" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              <Icon name="lightbulb" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Workflow tetap terpisah
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Follow-Up fokus pada laporan per pasien, sedangkan Slaberan
                memiliki workflow sendiri untuk template dan lokasi. Data klinis
                tetap berasal dari workspace aktif.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
