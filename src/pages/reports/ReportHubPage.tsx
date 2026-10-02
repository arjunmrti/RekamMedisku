import { useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import Icon from "../../components/ui/Icon";
import ReportHubCard, {
  type ReportHubStat,
} from "../../components/report/ReportHubCard";
import { REPORT_HUB_CATALOG, type ReportHubMode } from "../../data/reportHubCatalog";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { loadSlaberanLocations } from "../../data/localSlaberanLocations";
import { loadSlaberanTemplates } from "../../data/localSlaberanTemplates";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import type { ReportMode } from "../../types/report";
import ReportTemplateEditor from "../../components/report/ReportTemplateEditor";

type ReportHubPageProps = NavigationProps & {
  onSelectMode: (mode: Exclude<ReportMode, "hub">) => void;
};

export default function ReportHubPage({
  activeItem,
  onNavigate,
  onSelectMode,
}: ReportHubPageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const activeRotation = loadActiveRotation();
  const patients = loadPatients();
  const [editorOpen, setEditorOpen] = useState(false);

  const activePatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.rotationId === activeRotation.id &&
          patient.status === "Aktif",
      ),
    [activeRotation.id, patients, workspaceSyncVersion],
  );

  const reportStats = useMemo<Record<ReportHubMode, ReportHubStat[]>>(() => {
    const savedFollowUps = loadSavedFollowUps();

    const storedFollowUpCount = activePatients.reduce(
      (total, patient) =>
        total +
        (savedFollowUps[patient.id] ?? []).filter(
          (entry) => entry.status === "Tersimpan",
        ).length,
      0,
    );

    const storedTemplates = loadSlaberanTemplates();
    const activeLocationCount = loadSlaberanLocations().filter(
      (location) => location.isActive,
    ).length;

    return {
      "follow-up": [
        {
          label: "Follow-Up tersimpan",
          value: storedFollowUpCount,
        },
        {
          label: "Pasien aktif",
          value: activePatients.length,
        },
      ],
      slaberan: [
        {
          label: "Pasien aktif",
          value: activePatients.length,
        },
        {
          label: "Template tersedia",
          value: storedTemplates.length > 0 ? storedTemplates.length : 1,
        },
        {
          label: "Lokasi aktif",
          value: activeLocationCount,
        },
      ],
    };
  }, [activePatients, workspaceSyncVersion]);

  const handleSelectReport = (mode: ReportHubMode) => {
    onSelectMode(mode);
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
        <div className="mx-auto w-full max-w-[1180px] space-y-8">
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

            <div className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm sm:w-auto">
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
            className="space-y-5"
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
              {REPORT_HUB_CATALOG.map((item) => (
                <ReportHubCard
                  key={item.mode}
                  item={item}
                  stats={reportStats[item.mode]}
                  warning={
                    item.mode === "follow-up" && activePatients.length === 0
                      ? "Belum ada pasien aktif. Tambahkan pasien terlebih dahulu agar laporan Follow-Up bisa dibuat."
                      : undefined
                  }
                  onAction={() => handleSelectReport(item.mode)}
                />
              ))}
            </div>
          </section>

          <button type="button" onClick={() => setEditorOpen(true)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-[#1677FF] hover:bg-blue-100">Kelola Template Laporan</button>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-100">
              <Icon name="lightbulb" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
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
      {editorOpen && <ReportTemplateEditor onClose={() => setEditorOpen(false)} />}
    </AppShell>
  );
}
