import { useMemo, useRef, useState, type ChangeEvent } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import {
  appendBackupHistory,
  createBackupHistoryEntry,
  loadBackupHistory,
  saveBackupSnapshot,
} from "../../data/backupHistory";
import { loadPatients } from "../../data/localPatients";
import { loadRotations } from "../../data/localRotations";
import type { BackupHistoryEntry, BackupPayload } from "../../types/backup";
import {
  buildBackupPayload,
  buildBackupPayloadWithAttachments,
  formatBackupDate,
  formatBytes,
  getPatientRotation,
  parseBackupText,
  restoreBackupPayload,
  serializeBackup,
  triggerJsonDownload,
} from "../../utils/backup";
import type { PatientListItem } from "../../types/patient";
import { toLocalIsoDate } from "../../utils/date";
import Icon from "../../components/ui/Icon";

type BackupDataPageProps = NavigationProps;

type DataScope = "Semua" | "Pasien" | "Follow-Up" | "Draf";
type OperationFilter = "Semua" | "Export" | "Restore";
type RotationFilter = "Semua" | string;
type StatusFilter = "Semua" | "Aktif" | "Diarsipkan";

type RestoreState =
  | { status: "idle"; fileName: ""; size: 0; data: null; error: "" }
  | { status: "invalid"; fileName: string; size: number; data: null; error: string }
  | {
      status: "valid";
      fileName: string;
      size: number;
      data: BackupPayload;
      error: "";
    };

export default function BackupDataPage({
  activeItem,
  onNavigate,
}: BackupDataPageProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [patients, setPatients] = useState<PatientListItem[]>(() => loadPatients());
  const [history, setHistory] = useState<BackupHistoryEntry[]>(() =>
    loadBackupHistory(),
  );
  const [rotations, setRotations] = useState(() => loadRotations());
  const [dataScope, setDataScope] = useState<DataScope>("Semua");
  const [rotationFilter, setRotationFilter] =
    useState<RotationFilter>("Semua");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua");
  const [operationFilter, setOperationFilter] =
    useState<OperationFilter>("Semua");

  const [historySearch, setHistorySearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreState, setRestoreState] = useState<RestoreState>({
    status: "idle",
    fileName: "",
    size: 0,
    data: null,
    error: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lastSuccessfulBackup = useMemo(
    () =>
      history.find(
        (entry) => entry.type === "Export" && entry.status === "Berhasil",
      ) ?? null,
    [history],
  );

  const filteredPatients = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();

    return patients.filter((patient) => {
      const searchable = [
        patient.name,
        patient.rm,
        patient.id,
        patient.room,
        patient.bed,
        patient.doctor,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesRotation =
        rotationFilter === "Semua" ||
        getPatientRotation(patient.rotationId) === rotationFilter;
      const matchesStatus =
        statusFilter === "Semua" || patient.status === statusFilter;

      return matchesSearch && matchesRotation && matchesStatus;
    });
  }, [globalSearch, patients, rotationFilter, statusFilter]);

  const backupPreview = useMemo(
    () => buildBackupPayload(filteredPatients),
    [filteredPatients],
  );

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return history
      .filter((entry) => {
        const matchesSearch =
          !query ||
          [
            entry.fileName,
            entry.note,
            entry.type,
            entry.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        return (
          matchesSearch &&
          (operationFilter === "Semua" || entry.type === operationFilter)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [history, historySearch, operationFilter]);

  const summary = {
    patients:
      dataScope === "Follow-Up"
        ? 0
        : backupPreview.patients.length,
    followUps:
      dataScope === "Pasien" || dataScope === "Draf"
        ? 0
        : Object.values(backupPreview.followUpsByPatient).reduce(
            (total, entries) => total + entries.length,
            0,
          ),
    drafts:
      dataScope === "Pasien" || dataScope === "Follow-Up"
        ? 0
        : Object.keys(backupPreview.followUpDrafts).length,
  };

  const refreshPageData = () => {
    setPatients(loadPatients());
  };

  const handleExport = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const currentPatients = loadPatients();
      const payload = await buildBackupPayloadWithAttachments(currentPatients);
      const content = serializeBackup(payload);
      const fileName =
        "rekammedisku-backup-" + toLocalIsoDate() + ".json";
      const size = triggerJsonDownload(content, fileName);

      saveBackupSnapshot(payload.exportedAt);
      const entry = createBackupHistoryEntry(
        "Export",
        "Berhasil",
        fileName,
        size,
        "Backup JSON berhasil dibuat dari data workspace.",
      );
      appendBackupHistory(entry);
      setHistory((current) => [entry, ...current].slice(0, 30));
      setPatients(currentPatients);
      setToast("Data berhasil diekspor · " + fileName);
    } catch {
      const entry = createBackupHistoryEntry(
        "Export",
        "Gagal",
        "rekammedisku-backup.json",
        0,
        "Export gagal dilakukan pada perangkat ini.",
      );
      appendBackupHistory(entry);
      setHistory((current) => [entry, ...current].slice(0, 30));
      setToast("Export gagal. Coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRestore = () => {
    setRestoreState({
      status: "idle",
      fileName: "",
      size: 0,
      data: null,
      error: "",
    });
    setRestoreOpen(true);
  };

  const readRestoreFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setRestoreState({
        status: "invalid",
        fileName: file.name,
        size: file.size,
        data: null,
        error: "Ukuran file melebihi batas 25 MB.",
      });
      return;
    }

    try {
      const text = await file.text();
      const result = parseBackupText(text);

      if (!result.ok) {
        setRestoreState({
          status: "invalid",
          fileName: file.name,
          size: file.size,
          data: null,
          error: result.error,
        });
        return;
      }

      setRestoreState({
        status: "valid",
        fileName: file.name,
        size: file.size,
        data: result.data,
        error: "",
      });
    } catch {
      setRestoreState({
        status: "invalid",
        fileName: file.name,
        size: file.size,
        data: null,
        error: "File JSON gagal dibaca.",
      });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void readRestoreFile(file);
    }
    event.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (restoreState.status !== "valid" || isProcessing) return;

    setIsProcessing(true);

    try {
      const counts = await restoreBackupPayload(restoreState.data);
      const entry = createBackupHistoryEntry(
        "Restore",
        "Berhasil",
        restoreState.fileName,
        restoreState.size,
        "Restore selesai: " +
          counts.patientCount +
          " pasien, " +
          counts.followUpCount +
          " follow-up, " +
          counts.draftCount +
          " draf, " +
          counts.attachmentCount +
          " lampiran.",
      );

      appendBackupHistory(entry);
      setHistory((current) => [entry, ...current].slice(0, 30));
      refreshPageData();
      setRotations(loadRotations());
      setRotationFilter("Semua");
      setRestoreOpen(false);
      setToast("Data berhasil dipulihkan dari " + restoreState.fileName);
    } catch {
      const entry = createBackupHistoryEntry(
        "Restore",
        "Gagal",
        restoreState.fileName,
        restoreState.size,
        "Restore gagal diterapkan ke penyimpanan lokal.",
      );
      appendBackupHistory(entry);
      setHistory((current) => [entry, ...current].slice(0, 30));
      setToast("Restore gagal. Data belum diubah.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHistoryAction = (entry: BackupHistoryEntry) => {
    if (entry.status === "Gagal") {
      if (entry.type === "Export") {
        handleExport();
      } else {
        openRestore();
      }
      return;
    }

    setToast(entry.fileName + " · " + entry.note);
  };

  return (
    <>
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue={globalSearch}
        onSearchChange={setGlobalSearch}
      >
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
          <div className="mx-auto w-full max-w-[1420px] space-y-6">
            <header className="space-y-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
                    P5 · Backup &amp; Data Management
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Cadangan &amp; Data
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    Kelola pencadangan workspace dan pulihkan data JSON saat
                    dibutuhkan.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                  Backup JSON adalah data sensitif. Simpan file di tempat yang
                  aman.
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                    <Icon name="arrow" className="h-6 w-6 rotate-[-90deg]" />
                  </span>
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Export Data
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Unduh pasien, follow-up tersimpan, dan draf sebagai satu
                    file backup JSON.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={isProcessing}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1677FF] px-4 text-xs font-semibold text-[#1677FF] transition hover:bg-blue-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="arrow" className="h-4 w-4 rotate-[-90deg]" />
                  Export JSON
                </button>
              </div>

              <div className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                    <Icon name="arrow" className="h-6 w-6 rotate-90" />
                  </span>
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Restore Data
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Impor file backup JSON yang valid untuk memulihkan data
                    workspace di perangkat ini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openRestore}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1677FF] px-4 text-xs font-semibold text-[#1677FF] transition hover:bg-blue-50 active:scale-[0.99]"
                >
                  <Icon name="arrow" className="h-4 w-4 rotate-90" />
                  Restore JSON
                </button>
              </div>

              <div className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                    <Icon name="database" className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Keamanan Data
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Workspace ini menggunakan penyimpanan lokal untuk prototype.
                    Backup JSON tetap harus diperlakukan sebagai data sensitif.
                  </p>
                </div>
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
                  Gunakan data dummy/anonymized selama prototype dan pengujian.
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] xl:col-span-8">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="clock" className="h-5 w-5 text-slate-700" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Riwayat Cadangan
                      </h2>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Aktivitas export dan restore pada perangkat ini.
                      </p>
                    </div>
                  </div>

                  <label className="relative block w-full sm:w-56">
                    <span className="sr-only">Cari riwayat cadangan</span>
                    <Icon
                      name="search"
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder="Cari riwayat..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
                  {(["Semua", "Export", "Restore"] as OperationFilter[]).map(
                    (filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setOperationFilter(filter)}
                        className={
                          "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition " +
                          (operationFilter === filter
                            ? "bg-[#1677FF] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                        }
                      >
                        {filter}
                      </button>
                    ),
                  )}
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <Icon name="clock" className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-800">
                      Belum ada riwayat backup
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                      Setelah export atau restore dilakukan, aktivitasnya akan
                      muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="px-5 py-3.5">Tanggal &amp; Waktu</th>
                          <th className="px-4 py-3.5">Jenis</th>
                          <th className="px-4 py-3.5">Ukuran</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Keterangan</th>
                          <th className="px-4 py-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredHistory.map((entry) => (
                          <tr key={entry.id} className="transition hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                              {formatBackupDate(entry.timestamp)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={
                                  "inline-flex items-center gap-1.5 font-semibold " +
                                  (entry.type === "Export"
                                    ? "text-[#1677FF]"
                                    : "text-violet-600")
                                }
                              >
                                <Icon
                                  name="document"
                                  className="h-4 w-4"
                                />
                                {entry.type}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                              {entry.fileSizeBytes
                                ? formatBytes(entry.fileSizeBytes)
                                : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={
                                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold " +
                                  (entry.status === "Berhasil"
                                    ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                                    : "border-rose-100 bg-rose-50 text-rose-600")
                                }
                              >
                                <Icon
                                  name={entry.status === "Berhasil" ? "check" : "alert"}
                                  className="h-3 w-3"
                                  strokeWidth={2.5}
                                />
                                {entry.status}
                              </span>
                            </td>
                            <td className="max-w-[220px] px-4 py-4 text-slate-500">
                              <span className="block truncate">{entry.note}</span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleHistoryAction(entry)}
                                className={
                                  "rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition " +
                                  (entry.status === "Gagal"
                                    ? "border-blue-200 text-[#1677FF] hover:bg-blue-50"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50")
                                }
                              >
                                {entry.status === "Gagal"
                                  ? "Coba Lagi"
                                  : "Detail"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="space-y-5 xl:col-span-4">
                <section className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                    <Icon name="database" className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      Status Backup
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Terakhir export berhasil
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {lastSuccessfulBackup
                        ? formatBackupDate(lastSuccessfulBackup.timestamp)
                        : "Belum pernah dicadangkan"}
                    </p>
                  </div>
                </section>

                <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon name="database" className="h-4 w-4 text-slate-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Filter Data
                      </h3>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      Cari dan batasi cakupan data workspace yang ditampilkan.
                    </p>
                  </div>

                  <fieldset className="space-y-2.5">
                    <legend className="text-xs font-semibold text-slate-700">
                      Jenis Data
                    </legend>
                    {(["Semua", "Pasien", "Follow-Up", "Draf"] as DataScope[]).map(
                      (scope) => (
                        <label
                          key={scope}
                          className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-600"
                        >
                          <input
                            type="radio"
                            name="data-scope"
                            checked={dataScope === scope}
                            onChange={() => setDataScope(scope)}
                            className="h-4 w-4 border-slate-300 text-[#1677FF] focus:ring-blue-500"
                          />
                          <span
                            className={
                              dataScope === scope
                                ? "font-semibold text-slate-800"
                                : ""
                            }
                          >
                            {scope}
                          </span>
                        </label>
                      ),
                    )}
                  </fieldset>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      Stase
                    </span>
                    <select
                      value={rotationFilter}
                      onChange={(event) =>
                        setRotationFilter(event.target.value as RotationFilter)
                      }
                      className="field-control !min-h-10 !bg-slate-50/70 !text-xs"
                    >
                      <option value="Semua">Semua stase</option>
                      {rotations.map((rotation) => (
                        <option key={rotation.id} value={rotation.name}>
                          {rotation.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                      Status Pasien
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as StatusFilter)
                      }
                      className="field-control !min-h-10 !bg-slate-50/70 !text-xs"
                    >
                      <option value="Semua">Semua status</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Diarsipkan">Diarsipkan</option>
                    </select>
                  </label>

                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                    Filter di panel ini hanya mengatur tampilan dan ringkasan. Export JSON tetap mencadangkan seluruh workspace agar proses restore tetap utuh.
                  </p>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{summary.patients}</p>
                        <p className="text-[9px] font-medium text-slate-400">Pasien</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{summary.followUps}</p>
                        <p className="text-[9px] font-medium text-slate-400">Follow-Up</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{summary.drafts}</p>
                        <p className="text-[9px] font-medium text-slate-400">Draf</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGlobalSearch("");
                      setDataScope("Semua");
                      setRotationFilter("Semua");
                      setStatusFilter("Semua");
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset Filter
                  </button>
                </section>

                <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                  <div className="flex items-center gap-2">
                    <Icon name="alert" className="h-4 w-4 text-[#1677FF]" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Informasi Penting
                    </h3>
                  </div>

                  <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                    <li>• Backup JSON berisi data workspace dan perlu disimpan secara aman.</li>
                    <li>• Restore hanya menerima struktur backup RekamMedisku versi MVP yang valid.</li>
                    <li>• Prototype menggunakan data dummy/anonymized, bukan rekam medis resmi rumah sakit.</li>
                    <li>• Tidak ada sinkronisasi Google Drive atau pengiriman data otomatis pada MVP.</li>
                  </ul>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </AppShell>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-20 left-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg sm:left-6 lg:bottom-6"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-emerald-950">
              {toast}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800">
              Aktivitas sudah dicatat pada riwayat backup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="p-1 text-emerald-700 transition hover:text-emerald-950"
          >
            ×
          </button>
        </div>
      ) : null}

      {restoreOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
                  Restore JSON
                </p>
                <h2 id="restore-title" className="mt-1 text-lg font-bold text-slate-900">
                  Pulihkan Data Cadangan
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Pilih file backup JSON RekamMedisku dari perangkat ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestoreOpen(false)}
                aria-label="Tutup modal restore"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/60"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1677FF]">
                <Icon name="arrow" className="h-6 w-6 rotate-90" />
              </span>
              <span className="mt-3 block text-xs font-bold text-slate-800">
                Klik untuk memilih file JSON
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">
                Maksimal 25 MB · backup RekamMedisku versi MVP
              </span>
            </button>

            {restoreState.status === "valid" ? (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[10px] font-bold text-emerald-700">
                      JSON
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {restoreState.fileName}
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-600">
                        ✓ Valid · {restoreState.data.patients.length} pasien ·{" "}
                        {Object.values(restoreState.data.followUpsByPatient).reduce(
                          (total, entries) => total + entries.length,
                          0,
                        )}{" "}
                        follow-up
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-slate-400">
                    {formatBytes(restoreState.size)}
                  </span>
                </div>
              </div>
            ) : null}

            {restoreState.status === "invalid" ? (
              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3.5">
                <p className="text-xs font-bold text-rose-800">
                  File tidak valid
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-700">
                  {restoreState.error}
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
              <div className="flex items-start gap-2.5">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-relaxed">
                  <span className="font-bold">Perhatian:</span> restore akan
                  mengganti data pasien, follow-up, dan draf yang tersimpan
                  secara lokal pada perangkat ini. Pastikan backup terbaru sudah
                  diamankan sebelum melanjutkan.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRestoreOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={restoreState.status !== "valid" || isProcessing}
                onClick={() => void handleConfirmRestore()}
                className="rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Konfirmasi Restore
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
