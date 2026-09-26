import { useMemo, useState } from "react";
import SlaberanPage from "./SlaberanPage";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import ReportPatientContext from "../../components/report/ReportPatientContext";
import ReportPreview from "../../components/report/ReportPreview";
import ReportStepTracker from "../../components/report/ReportStepTracker";
import ReportSummaryCard from "../../components/report/ReportSummaryCard";
import ReportTemplateSelector from "../../components/report/ReportTemplateSelector";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { loadActiveRotation, loadRotations } from "../../data/localRotations";
import {
  buildWhatsAppReport,
  getReportTemplateForSpecialty,
} from "../../utils/reportGenerator";
import type { PatientListItem } from "../../types/patient";
import type { ReportStep, ReportTemplateType } from "../../types/report";
import Icon from "../../components/ui/Icon";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";

export type ReportMode = "follow-up" | "slaberan";

type ReportGeneratorPageProps = NavigationProps & {
  patient?: PatientListItem;
  mode?: ReportMode;
  onModeChange?: (mode: ReportMode) => void;
};

function ReportModeSwitch({
  mode,
  onModeChange,
}: {
  mode: ReportMode;
  onModeChange?: (mode: ReportMode) => void;
}) {
  if (!onModeChange) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onModeChange("follow-up")}
        className={
          mode === "follow-up"
            ? "rounded-lg bg-[#1677FF] px-3 py-2 text-[11px] font-semibold text-white"
            : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1677FF]"
        }
      >
        Follow-Up
      </button>
      <button
        type="button"
        onClick={() => onModeChange("slaberan")}
        className={
          mode === "slaberan"
            ? "rounded-lg bg-[#1677FF] px-3 py-2 text-[11px] font-semibold text-white"
            : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1677FF]"
        }
      >
        Slaberan
      </button>
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the legacy DOM copy path when the modern API is unavailable
      // or rejected by browser permissions/context.
    }
  }

  if (typeof document.execCommand !== "function") {
    throw new Error("Clipboard API tidak tersedia.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    if (!document.execCommand("copy")) {
      throw new Error("Perintah copy ditolak browser.");
    }
  } finally {
    textarea.remove();
  }
}

function getFollowUps(
  patientId: string,
  fallbackTemplate: ReportTemplateType,
) {
  const local = loadSavedFollowUps()[patientId] ?? [];

  return [...local]
    .filter((entry, index, entries) => {
      return entries.findIndex((candidate) => candidate.id === entry.id) === index;
    })
    .filter((entry) => entry.status === "Tersimpan")
    .map((entry) => ({
      ...entry,
      templateType: entry.templateType ?? fallbackTemplate,
    }))
    .sort((a, b) => (b.isoDate + b.time).localeCompare(a.isoDate + a.time));
}

export default function ReportGeneratorPage({
  activeItem,
  onNavigate,
  patient,
  mode = "follow-up",
  onModeChange,
}: ReportGeneratorPageProps) {
  if (mode === "slaberan") {
    return (
      <SlaberanPage
        activeItem={activeItem}
        onNavigate={onNavigate}
      />
    );
  }

  if (!patient) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 items-center justify-center px-4 py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto mb-5 w-full max-w-xl">
            <ReportModeSwitch mode={mode} onModeChange={onModeChange} />
          </div>
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_-30px_rgba(16,42,86,0.24)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
              <Icon name="document" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Report Generator
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Pilih pasien terlebih dahulu
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              Laporan Follow-Up dibuat dari pasien aktif pada stase yang sedang
              digunakan.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("Daftar Pasien")}
              className="mt-6 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700"
            >
              Buka Daftar Pasien
            </button>
          </section>
        </main>
      </AppShell>
    );
  }

  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const activeRotation = loadActiveRotation();
  const patientRotation = loadRotations().find(
    (rotation) => rotation.id === patient.rotationId,
  );
  const patientMatchesRotation = patient.rotationId === activeRotation.id;
  const reportTemplate = getReportTemplateForSpecialty(
    patientRotation?.specialty,
  );
  const fallbackTemplate: ReportTemplateType = reportTemplate ?? "Neurologi";

  const followUps = useMemo(
    () => getFollowUps(patient.id, fallbackTemplate),
    [fallbackTemplate, patient.id, workspaceSyncVersion],
  );
  const initialFollowUp = followUps[0] ?? null;
  const initialTemplate: ReportTemplateType =
    initialFollowUp?.templateType ?? "Neurologi";

  const [selectedFollowUpId, setSelectedFollowUpId] = useState(
    initialFollowUp?.id ?? "",
  );
  const [templateType, setTemplateType] =
    useState<ReportTemplateType>(initialTemplate);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [reportText, setReportText] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  const selectedFollowUp =
    followUps.find((entry) => entry.id === selectedFollowUpId) ??
    initialFollowUp;

  const sourceTemplate: ReportTemplateType =
    selectedFollowUp?.templateType ?? "Neurologi";

  const activeStep: ReportStep = copied
    ? 6
    : editing
      ? 5
      : reportText
        ? 4
        : 2;

  const generateReport = (nextTemplate: ReportTemplateType = templateType) => {
    if (!selectedFollowUp) return;
    setReportText(
      buildWhatsAppReport(patient, selectedFollowUp, nextTemplate, {
        rotationName:
          patientRotation?.specialty !== "Lainnya"
            ? patientRotation?.specialty
            : patientRotation?.name,
      }),
    );
    setTemplateType(nextTemplate);
    setGeneratedKey(
      selectedFollowUp.id + ":" + nextTemplate + ":" + Date.now(),
    );
    setEditing(false);
    setCopied(false);
    setCopyError("");
  };

  const handleFollowUpChange = (id: string) => {
    const next = followUps.find((entry) => entry.id === id);
    if (!next) return;

    const nextTemplate = next.templateType ?? "Neurologi";
    setSelectedFollowUpId(id);
    setTemplateType(nextTemplate);
    setReportText("");
    setGeneratedKey("");
    setEditing(false);
    setCopied(false);
    setCopyError("");
  };

  const handleCopy = async () => {
    if (!reportText) return;

    try {
      await copyTextToClipboard(reportText);
      setCopied(true);
      setEditing(false);
      setCopyError("");
    } catch {
      setCopied(false);
      setCopyError(
        "Laporan gagal disalin otomatis. Pilih teks laporan lalu salin secara manual.",
      );
    }
  };

  if (!patientMatchesRotation) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 items-center justify-center px-4 py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto mb-5 w-full max-w-xl">
            <ReportModeSwitch mode={mode} onModeChange={onModeChange} />
          </div>
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_-30px_rgba(16,42,86,0.24)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Icon name="alert" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">
              Konteks Stase Berubah
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Pasien tidak berada pada stase aktif
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              Laporan hanya dapat dibuat dari pasien pada stase aktif agar
              konteks laporan tetap sesuai dengan workspace saat ini.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("Daftar Pasien")}
              className="mt-6 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700"
            >
              Kembali ke Daftar Pasien
            </button>
          </section>
        </main>
      </AppShell>
    );
  }

  if (!patientRotation || !reportTemplate) {
    const title = patientRotation
      ? "Report Generator untuk stase ini belum tersedia"
      : "Stase pasien tidak ditemukan";
    const description = patientRotation
      ? `MVP RekamMedisku saat ini menyediakan template laporan untuk Neurologi dan Ilmu Penyakit Dalam. Stase ${patientRotation.name} tetap dapat digunakan sebagai rotasi tanpa menghapus data pasien atau riwayat.`
      : "Data rotasi pasien tidak ditemukan. Periksa kembali data stase sebelum membuat laporan.";

    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 items-center justify-center px-4 py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto mb-5 w-full max-w-xl">
            <ReportModeSwitch mode={mode} onModeChange={onModeChange} />
          </div>
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_-30px_rgba(16,42,86,0.24)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
              <Icon name="document" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Report Generator
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              {title}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              {description}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("Stase Saya")}
              className="mt-6 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Kembali ke Stase
            </button>
          </section>
        </main>
      </AppShell>
    );
  }

  if (!selectedFollowUp) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto mb-5 w-full max-w-xl">
            <ReportModeSwitch mode={mode} onModeChange={onModeChange} />
          </div>
          <div className="mx-auto flex min-h-[70vh] w-full max-w-[900px] items-center justify-center">
            <section className="w-full rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-[0_16px_50px_-30px_rgba(16,42,86,0.24)] sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                <Icon name="document" className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                Report Generator
              </p>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                Belum ada follow-up tersimpan
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-500">
                Report Generator menggunakan data yang sudah disimpan pada
                timeline pasien. Buat follow-up terlebih dahulu agar laporan
                dapat dibuat tanpa input ulang.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onNavigate("Profil Pasien")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Kembali ke Profil
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("Follow-Up Baru")}
                  className="rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  + Buat Follow-Up
                </button>
              </div>
            </section>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue=""
      onSearchChange={() => undefined}
      searchEnabled={false}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <header className="space-y-3">
            <ReportModeSwitch mode={mode} onModeChange={onModeChange} />

            <button
              type="button"
              onClick={() => onNavigate("Profil Pasien")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#1677FF] transition hover:text-blue-700"
            >
              <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
              Kembali ke Profil Pasien
            </button>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                  P4 · WhatsApp Report Generator
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Buat Laporan Follow-Up
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                  Ubah follow-up tersimpan menjadi draft laporan yang siap
                  ditinjau, diedit, dan disalin ke WhatsApp.
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] font-medium text-slate-500">
                <span className="font-bold text-[#1677FF]">Sumber:</span>{" "}
                Follow-Up tersimpan
              </div>
            </div>
          </header>

          <ReportPatientContext
            patient={patient}
            followUps={followUps}
            selectedFollowUp={selectedFollowUp}
            onFollowUpChange={handleFollowUpChange}
          />

          <ReportStepTracker activeStep={activeStep} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <ReportTemplateSelector
                selected={templateType}
                sourceTemplate={sourceTemplate}
                onChange={setTemplateType}
              />

              <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-white p-4 shadow-[0_8px_30px_-22px_rgba(22,119,255,0.4)] sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#1677FF]">
                      <Icon name="bolt" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Draft laporan siap dibuat
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Sistem memformat data follow-up #{selectedFollowUp.number}
                        {" "}tanpa meminta input klinis ulang.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => generateReport()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <Icon name="bolt" className="h-3.5 w-3.5" />
                    Generate Laporan
                  </button>
                </div>
              </section>

              <ReportPreview
                key={generatedKey}
                text={reportText}
                editing={editing}
                onToggleEdit={() => {
                  setEditing((current) => !current);
                  setCopied(false);
                }}
                onTextChange={(value) => {
                  setReportText(value);
                  setCopied(false);
                }}
                onFinishEdit={() => setEditing(false)}
              />
            </div>

            <ReportSummaryCard
              patient={patient}
              followUp={selectedFollowUp}
              templateType={templateType}
              copied={copied}
              hasReport={Boolean(reportText)}
              copyError={copyError}
              onCopy={handleCopy}
              onRegenerate={() => generateReport()}
            />
          </div>

          <section className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            RekamMedisku hanya mengubah data follow-up tersimpan menjadi draft
            laporan. Tidak ada direct WhatsApp API atau automatic sending;
            pengguna tetap meninjau, menyalin, lalu mengirim secara manual.
          </section>
        </div>
      </main>
    </AppShell>
  );
}
