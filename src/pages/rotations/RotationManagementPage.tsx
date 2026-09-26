import { useEffect, useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import RotationCard from "../../components/rotations/RotationCard";
import RotationFormModal from "../../components/rotations/RotationFormModal";
import RotationSwitchDialog from "../../components/rotations/RotationSwitchDialog";
import {
  loadActiveRotation,
  loadRotations,
} from "../../data/localRotations";
import {
  activateRotationWithSupabase,
  syncRotationsWithSupabase,
  upsertRotationWithSupabase,
} from "../../data/supabaseRotations";
import { loadPatients } from "../../data/localPatients";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
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
  const [patients] = useState<PatientListItem[]>(() => loadPatients());
  const [switchTarget, setSwitchTarget] = useState<Rotation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function syncWorkspace() {
      setSyncing(true);
      setErrorMessage("");

      try {
        const nextRotations = await syncRotationsWithSupabase();

        if (cancelled) return;

        setRotations(nextRotations);
        setActiveRotation(loadActiveRotation());
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat data stase dari Supabase.",
          );
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void syncWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (workspaceSyncVersion === 0) return;

    setRotations(loadRotations());
    setActiveRotation(loadActiveRotation());
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

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Icon name="plus" className="h-4 w-4" />
                Tambah Stase
              </button>
            </header>

            {syncing ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-[11px] font-medium text-slate-500">
                Menyinkronkan data stase...
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
                          name={
                            activeRotation.specialty === "Neurologi"
                              ? "brain"
                              : "stethoscope"
                          }
                          className="h-7 w-7"
                        />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1677FF]">
                          STASE AKTIF
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

                    <span className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
                      Aktif
                    </span>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Pasien
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {patientCounts[activeRotation.id] ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Specialty
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-800">
                        {activeRotation.specialty}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
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

                  <button
                    type="button"
                    disabled
                    className="mt-5 min-h-11 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-600"
                  >
                    Gunakan Stase Ini
                  </button>
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
              sebelumnya. Template klinis MVP saat ini tersedia untuk Neurologi
              dan Ilmu Penyakit Dalam; stase lain dapat disimpan sebagai rotasi
              tetapi template khususnya belum termasuk scope MVP.
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
        key={
          (formOpen ? "open:" : "closed:") +
          (editingRotation?.id ?? "new")
        }
        open={formOpen}
        rotation={editingRotation}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSaveRotation}
      />
    </>
  );
}
