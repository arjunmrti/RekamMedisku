import { useEffect, useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import RotationCard from "../../components/rotations/RotationCard";
import RotationFormModal from "../../components/rotations/RotationFormModal";
import RotationSwitchDialog from "../../components/rotations/RotationSwitchDialog";
import FollowUpTemplateBuilderModal from "../../components/follow-up/FollowUpTemplateBuilderModal";
import {
  loadActiveRotation,
  loadRotations,
} from "../../data/localRotations";
import {
  activateRotationWithSupabase,
  upsertRotationWithSupabase,
} from "../../data/supabaseRotations";
import { loadPatients } from "../../data/localPatients";
import { cloneSystemFollowUpTemplate, duplicateFollowUpTemplate, listFollowUpTemplates, listSystemFollowUpTemplates, type SystemFollowUpTemplateSummary } from "../../data/followUpTemplates";
import { supabase } from "../../utils/supabase";
import type { ReportTemplateSummary } from "../../types/reportTemplate";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
import type { FollowUpTemplateSummary } from "../../types/followUpTemplate";
import Icon from "../../components/ui/Icon";

type RotationManagementPageProps = NavigationProps & {
  onRotationChange?: (rotation: Rotation) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value + "T00:00:00"));
}

function formatPeriod(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Belum ada periode";

  const start = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(startDate + "T00:00:00"));
  return start + " — " + formatDate(endDate);
}

function formatLastActivity(value: string) {
  if (!value) return "Belum ada aktivitas";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(".", ":");
}

export default function RotationManagementPage({
  activeItem,
  onNavigate,
  onRotationChange,
}: RotationManagementPageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const [rotations, setRotations] = useState<Rotation[]>(() => loadRotations());
  const [activeRotation, setActiveRotation] = useState<Rotation>(() =>
    loadActiveRotation(),
  );
  const [patients, setPatients] = useState<PatientListItem[]>(() => loadPatients());
  const [switchTarget, setSwitchTarget] = useState<Rotation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [followUpTemplates, setFollowUpTemplates] = useState<FollowUpTemplateSummary[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplateSummary[]>([]);
  const [systemFollowUpTemplates, setSystemFollowUpTemplates] = useState<SystemFollowUpTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null);
  const [templateToast, setTemplateToast] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    setRotations(loadRotations());
    setActiveRotation(loadActiveRotation());
    setPatients(loadPatients());

    let cancelled = false;
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const [followUp, starters, { data: reportData }] = await Promise.all([
          listFollowUpTemplates(),
          listSystemFollowUpTemplates(),
          supabase
            .from("templates")
            .select("id,user_id,name,description,metadata,is_archived,created_at,updated_at")
            .eq("type", "report")
            .order("name"),
        ]);
        if (!cancelled) {
          setFollowUpTemplates(followUp);
          setSystemFollowUpTemplates(starters);
          setReportTemplates(
            (reportData ?? []).map((row: any) => ({
              id: row.id,
              userId: row.user_id,
              name: row.name,
              description: row.description,
              metadata: row.metadata,
              isArchived: row.is_archived,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              latestVersion: 1,
              latestSchemaVersion: 1,
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Template gagal dimuat.");
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    };
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [workspaceSyncVersion]);

  const patientCounts = useMemo(() => {
    return rotations.reduce<Record<string, number>>((acc, rotation) => {
      acc[rotation.id] = patients.filter(
        (patient) =>
          (patient.rotationId ?? "rotation-neurologi") === rotation.id,
      ).length;
      return acc;
    }, {});
  }, [patients, rotations]);

  const lastActivityByRotation = useMemo(() => {
    return rotations.reduce<Record<string, string>>((acc, rotation) => {
      const rotationPatients = patients.filter(
        (patient) =>
          (patient.rotationId ?? "rotation-neurologi") === rotation.id,
      );

      const latestPatient = [...rotationPatients]
        .filter((patient) => patient.lastFollowUp !== "Belum ada follow-up")
        .sort((a, b) => {
          const aTime = a.lastFollowUpAt
            ? new Date(a.lastFollowUpAt).getTime()
            : 0;
          const bTime = b.lastFollowUpAt
            ? new Date(b.lastFollowUpAt).getTime()
            : 0;
          return bTime - aTime;
        })[0];

      if (latestPatient) {
        acc[rotation.id] = latestPatient.lastFollowUp;
      } else if (rotation.status === "Mendatang") {
        acc[rotation.id] = "Belum ada aktivitas";
      } else {
        acc[rotation.id] = rotation.updatedAt
          ? formatLastActivity(rotation.updatedAt)
          : "Belum ada aktivitas";
      }
      return acc;
    }, {});
  }, [patients, rotations]);

  const handleUseRotation = (rotation: Rotation) => {
    if (rotation.id === activeRotation.id) return;
    setSwitchTarget(rotation);
  };

  const confirmSwitch = async () => {
    if (!switchTarget) return;

    setErrorMessage("");

    try {
      const next = await activateRotationWithSupabase(switchTarget.id);
      const selected =
        next.find((rotation) => rotation.id === switchTarget.id) ??
        switchTarget;

      setRotations(next);
      setActiveRotation(selected);
      setSwitchTarget(null);
      onRotationChange?.(selected);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengganti stase.",
      );
    }
  };

  const handleSaveRotation = async (
    input: Parameters<typeof upsertRotationWithSupabase>[0],
  ) => {
    setErrorMessage("");

    try {
      const updated = await upsertRotationWithSupabase(input);
      setRotations(updated);

      const nextActive = loadActiveRotation();
      setActiveRotation(nextActive);

      if (nextActive.id === input.id || input.status === "Aktif") {
        onRotationChange?.(nextActive);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan stase.",
      );
      throw error;
    }
  };

  const openCreate = () => {
    setEditingRotation(null);
    setFormOpen(true);
  };

  const openEdit = (rotation: Rotation) => {
    setEditingRotation(rotation);
    setFormOpen(true);
  };

  return (
    <>
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
      >
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
                  Workspace · Rotation Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Stase Saya
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Kelola workspace berdasarkan rotasi klinik.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setTemplateBuilderOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Buat Template
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                  <Icon name="plus" className="h-4 w-4" />
                  Tambah Stase
                </button>
              </div>
            </header>

            {templatesLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
                Memuat template follow-up...
              </div>
            ) : null}

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] leading-relaxed text-rose-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white shadow-[0_10px_34px_-18px_rgba(22,119,255,0.35)]">
              <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1677FF] shadow-sm ring-1 ring-blue-100">
                        <Icon
                          name="layers"
                          className="h-7 w-7"
                        />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1677FF]">
                          {activeRotation.id ? "STASE AKTIF" : "BELUM ADA STASE AKTIF"}
                        </p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                          {activeRotation.name}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatPeriod(
                            activeRotation.startDate,
                            activeRotation.endDate,
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={
                        activeRotation.id
                          ? "w-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600"
                          : "w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500"
                      }
                    >
                      {activeRotation.id ? "Aktif" : "Belum dipilih"}
                    </span>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pasien
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {patientCounts[activeRotation.id] ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Specialty
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {activeRotation.specialty}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Status Workspace
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-600">
                        Data terpisah per stase
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between border-t border-blue-100 bg-white/70 p-6 lg:border-l lg:border-t-0 sm:p-8">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Workspace saat ini
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Semua pasien baru akan masuk ke stase aktif. Data dari
                      stase lain tetap tersimpan sebagai riwayat workspace.
                    </p>
                  </div>

                  {activeRotation.id ? (
                    <div
                      className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700"
                      role="status"
                    >
                      ✓ Sedang Aktif
                    </div>
                  ) : (
                    <div
                      className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500"
                      role="status"
                    >
                      Belum ada stase aktif
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Daftar Stase
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Pilih stase untuk mengubah konteks workspace.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                  {rotations.length} stase
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {rotations.map((rotation) => (
                  <RotationCard
                    key={rotation.id}
                    rotation={rotation}
                    patientCount={patientCounts[rotation.id] ?? 0}
                    lastActivity={
                      lastActivityByRotation[rotation.id] ??
                      "Belum ada aktivitas"
                    }
                    onUse={handleUseRotation}
                    onEdit={openEdit}
                  />
                ))}

                <button
                  type="button"
                  onClick={openCreate}
                  className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                    <Icon name="plus" className="h-5 w-5" />
                  </span>
                  <span className="mt-3 text-xs font-bold text-slate-700">
                    Tambah Stase
                  </span>
                  <span className="mt-1 max-w-[190px] text-[10px] leading-relaxed text-slate-400">
                    Simpan rotasi baru tanpa mengganggu data yang sudah ada.
                  </span>
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
              RekamMedisku menggunakan konteks stase untuk menjaga data pasien
              tetap terpisah. Berpindah stase tidak menghapus riwayat stase
              sebelumnya. Setiap stase memiliki konteks data dan format catatan
              masing-masing; berpindah stase tidak menghapus riwayat sebelumnya.
            </section>
          </div>
        </main>
      </AppShell>

      <RotationSwitchDialog
        rotation={switchTarget}
        onCancel={() => setSwitchTarget(null)}
        onConfirm={confirmSwitch}
      />

      <RotationFormModal
        reportTemplates={reportTemplates}
        key={
          (formOpen ? "open:" : "closed:") +
          (editingRotation?.id ?? "new")
        }
        open={formOpen}
        rotation={editingRotation}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSaveRotation}
        followUpTemplates={followUpTemplates}
        systemFollowUpTemplates={systemFollowUpTemplates}
        onCloneSystemTemplate={async (templateId) => {
          const result = await cloneSystemFollowUpTemplate({ templateId });
          setFollowUpTemplates(await listFollowUpTemplates());
          return result;
        }}
        onDuplicateTemplate={async (templateId) => {
          if (duplicatingTemplateId) throw new Error("Duplikasi template sedang berjalan. Tunggu hingga selesai.");
          setDuplicatingTemplateId(templateId);
          setTemplateToast(null);
          try {
            const result = await duplicateFollowUpTemplate(templateId);
            setFollowUpTemplates(await listFollowUpTemplates());
            setTemplateToast({ message: "Template \"" + result.name + "\" berhasil diduplikasi.", error: false });
            return result;
          } catch (error) {
            setTemplateToast({ message: error instanceof Error ? error.message : "Duplikasi template gagal. Periksa koneksi lalu coba lagi.", error: true });
            throw error;
          } finally {
            setDuplicatingTemplateId(null);
          }
        }}
        onCreateTemplate={() => setTemplateBuilderOpen(true)}
      />

      {templateToast ? (
        <div role="status" className={`fixed bottom-20 left-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg sm:left-6 md:bottom-6 ${templateToast.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {templateToast.message}
          <button type="button" onClick={() => setTemplateToast(null)} className="ml-3" aria-label="Tutup notifikasi">×</button>
        </div>
      ) : null}

      <FollowUpTemplateBuilderModal
        open={templateBuilderOpen}
        onClose={() => setTemplateBuilderOpen(false)}
        onCreated={async () => {
          try {
            const next = await listFollowUpTemplates();
            setFollowUpTemplates(next);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Template baru berhasil dibuat, tetapi daftar template gagal dimuat.");
          }
        }}
      />
    </>
  );
}
