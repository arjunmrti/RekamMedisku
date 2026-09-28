import { useEffect, useMemo, useState } from "react";
import SlaberanPage from "./SlaberanPage";
import ReportHubPage from "./ReportHubPage";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import ReportPatientContext from "../../components/report/ReportPatientContext";
import ReportPreview from "../../components/report/ReportPreview";
import ReportStepTracker from "../../components/report/ReportStepTracker";
import ReportSummaryCard from "../../components/report/ReportSummaryCard";
import ReportTemplateSelector from "../../components/report/ReportTemplateSelector";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { loadActiveRotation, loadRotations } from "../../data/localRotations";
import { buildWhatsAppReport } from "../../utils/reportGenerator";
import {
  getReportTemplateVersion,
  listReportTemplates,
} from "../../data/reportTemplates";
import { DEFAULT_REPORT_TEMPLATE_DEFINITION } from "../../data/systemReportTemplate";
import type {
  ReportTemplate,
  ReportTemplateSummary,
} from "../../types/reportTemplate";
import type { PatientListItem } from "../../types/patient";
import type { ReportMode, ReportStep } from "../../types/report";
import Icon from "../../components/ui/Icon";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import {
  APPLICATION_PROFILE_EVENT,
  loadApplicationProfile,
} from "../../data/applicationProfile";
import type { ReportIdentity } from "../../utils/reportGenerator";

type ReportGeneratorPageProps = NavigationProps & {
  patient?: PatientListItem;
  availablePatients?: PatientListItem[];
  mode?: ReportMode;
  onModeChange?: (mode: ReportMode) => void;
  onPatientChange?: (patientId: string) => void;
};

type FollowUpReportGeneratorPageProps = NavigationProps & {
  patient?: PatientListItem;
  availablePatients?: PatientListItem[];
  onPatientChange?: (patientId: string) => void;
};

function ReportBackLink({ onNavigate }: Pick<NavigationProps, "onNavigate">) {
  return (
    <button
      type="button"
      onClick={() => onNavigate("Semua Laporan")}
      className="inline-flex items-center gap-2 text-xs font-semibold text-[#1677FF] transition hover:text-blue-700"
    >
      <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
      Semua Laporan
    </button>
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

const SYSTEM_REPORT_TEMPLATE_ID = "__system_report_template__";

type ActiveReportTemplate = {
  id: string;
  name: string;
  description: string;
  version: number;
  isSystem: boolean;
  definition: ReportTemplate["latestDefinition"];
};

const SYSTEM_REPORT_TEMPLATE: ActiveReportTemplate = {
  id: SYSTEM_REPORT_TEMPLATE_ID,
  name: "Laporan Follow-Up Standar",
  description:
    "Format laporan generik RekamMedisku untuk data follow-up tersimpan.",
  version: 1,
  isSystem: true,
  definition: DEFAULT_REPORT_TEMPLATE_DEFINITION,
};

function getFollowUps(patientId: string) {
  const local = loadSavedFollowUps()[patientId] ?? [];

  return [...local]
    .filter((entry, index, entries) => {
      return entries.findIndex((candidate) => candidate.id === entry.id) === index;
    })
    .filter((entry) => entry.status === "Tersimpan")
    .sort((a, b) => (b.isoDate + b.time).localeCompare(a.isoDate + a.time));
}

function toActiveReportTemplate(
  template: ReportTemplate,
): ActiveReportTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    version: template.latestVersion,
    isSystem: false,
    definition: template.latestDefinition,
  };
}

export default function ReportGeneratorPage({
  activeItem,
  onNavigate,
  patient,
  availablePatients = [],
  mode = "hub",
  onModeChange,
  onPatientChange,
}: ReportGeneratorPageProps) {
  if (mode === "hub") {
    return (
      <ReportHubPage
        activeItem={activeItem}
        onNavigate={onNavigate}
        onSelectMode={(nextMode) => onModeChange?.(nextMode)}
      />
    );
  }

  if (mode === "slaberan") {
    return (
      <SlaberanPage
        activeItem={activeItem}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <FollowUpReportGeneratorPage
      activeItem={activeItem}
      onNavigate={onNavigate}
      patient={patient}
      availablePatients={availablePatients}
      onPatientChange={onPatientChange}
    />
  );
}

function FollowUpReportGeneratorPage({
  activeItem,
  onNavigate,
  patient,
  availablePatients = [],
  onPatientChange,
}: FollowUpReportGeneratorPageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const [reportIdentity, setReportIdentity] = useState<ReportIdentity | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");

      try {
        const profile = await loadApplicationProfile();

        if (cancelled) return;

        setReportIdentity({
          name: profile.name,
          studentId: profile.studentId,
          program: profile.program,
          institution: profile.institution,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("Application profile load failed:", error);
        setReportIdentity(null);
        setProfileError(
          error instanceof Error
            ? error.message
            : "Profil aplikasi gagal dimuat.",
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    const handleProfileUpdated = () => {
      void loadProfile();
    };

    void loadProfile();
    window.addEventListener(APPLICATION_PROFILE_EVENT, handleProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(
        APPLICATION_PROFILE_EVENT,
        handleProfileUpdated,
      );
    };
  }, []);

  const activeRotation = loadActiveRotation();
  const patientRotation = patient
    ? loadRotations().find((rotation) => rotation.id === patient.rotationId)
    : undefined;
  const patientMatchesRotation = Boolean(
    patient && patient.rotationId === activeRotation.id,
  );

  const followUps = useMemo(
    () => getFollowUps(patient?.id ?? ""),
    [patient?.id, workspaceSyncVersion],
  );
  const initialFollowUp = followUps[0] ?? null;

  const [selectedFollowUpId, setSelectedFollowUpId] = useState(
    initialFollowUp?.id ?? "",
  );
  const [reportTemplates, setReportTemplates] = useState<ReportTemplateSummary[]>(
    [],
  );
  const [selectedReportTemplate, setSelectedReportTemplate] =
    useState<ActiveReportTemplate>(SYSTEM_REPORT_TEMPLATE);
  const [reportTemplateLoading, setReportTemplateLoading] = useState(true);
  const [reportTemplateError, setReportTemplateError] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [reportText, setReportText] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  const selectedFollowUp =
    followUps.find((entry) => entry.id === selectedFollowUpId) ??
    initialFollowUp;

  useEffect(() => {
    let cancelled = false;

    const loadReportTemplateWorkspace = async () => {
      setReportTemplateLoading(true);
      setReportTemplateError("");

      try {
        const summaries = await listReportTemplates();

        if (cancelled) return;

        setReportTemplates(summaries);

        const boundId = activeRotation.reportTemplateId;
        const boundVersion = activeRotation.reportTemplateVersion;

        if (boundId && boundVersion) {
          const boundTemplate = await getReportTemplateVersion(
            boundId,
            boundVersion,
          );

          if (cancelled) return;

          if (!boundTemplate) {
            setSelectedReportTemplate(SYSTEM_REPORT_TEMPLATE);
            setReportTemplateError(
              "Template laporan yang terikat pada stase tidak ditemukan. Template sistem digunakan sebagai fallback.",
            );
          } else {
            setSelectedReportTemplate(
              toActiveReportTemplate(boundTemplate),
            );
          }
        } else {
          setSelectedReportTemplate(SYSTEM_REPORT_TEMPLATE);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Report template load failed:", error);
        setReportTemplates([]);
        setSelectedReportTemplate(SYSTEM_REPORT_TEMPLATE);
        setReportTemplateError(
          error instanceof Error
            ? error.message
            : "Template laporan gagal dimuat.",
        );
      } finally {
        if (!cancelled) {
          setReportTemplateLoading(false);
        }
      }
    };

    void loadReportTemplateWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    activeRotation.id,
    activeRotation.reportTemplateId,
    activeRotation.reportTemplateVersion,
    workspaceSyncVersion,
  ]);

  const activeStep: ReportStep = copied
    ? 6
    : editing
      ? 5
      : reportText
        ? 4
        : 2;

  const generateReport = () => {
    if (!patient || !selectedFollowUp || !reportIdentity) return;

    setReportText(
      buildWhatsAppReport(
        patient,
        selectedFollowUp,
        selectedReportTemplate.definition,
        {
          rotationName: patientRotation?.name || "Stase",
          reportIdentity,
        },
      ),
    );

    setGeneratedKey(
      selectedFollowUp.id +
        ":" +
        selectedReportTemplate.id +
        ":v" +
        selectedReportTemplate.version +
        ":" +
        Date.now(),
    );
    setEditing(false);
    setCopied(false);
    setCopyError("");
  };

  const handleReportTemplateChange = async (templateId: string) => {
    if (templateId === SYSTEM_REPORT_TEMPLATE_ID) {
      setSelectedReportTemplate(SYSTEM_REPORT_TEMPLATE);
      setReportText("");
      setGeneratedKey("");
      setEditing(false);
      setCopied(false);
      setCopyError("");
      setReportTemplateError("");
      return;
    }

    const summary = reportTemplates.find((template) => template.id === templateId);

    if (!summary) {
      setReportTemplateError("Template laporan yang dipilih tidak ditemukan.");
      return;
    }

    try {
      setReportTemplateLoading(true);
      setReportTemplateError("");

      const template = await getReportTemplateVersion(
        summary.id,
        summary.latestVersion,
      );

      if (!template) {
        throw new Error("Versi template laporan yang dipilih tidak ditemukan.");
      }

      setSelectedReportTemplate(toActiveReportTemplate(template));
      setReportText("");
      setGeneratedKey("");
      setEditing(false);
      setCopied(false);
      setCopyError("");
    } catch (error) {
      setReportTemplateError(
        error instanceof Error
          ? error.message
          : "Template laporan gagal dimuat.",
      );
    } finally {
      setReportTemplateLoading(false);
    }
  };

  const handleFollowUpChange = (id: string) => {
    const next = followUps.find((entry) => entry.id === id);
    if (!next) return;

    setSelectedFollowUpId(id);
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

  if (!patient) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
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

  if (!patientMatchesRotation) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto mb-5 w-full max-w-xl">
            <ReportBackLink onNavigate={onNavigate} />
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
            <ReportBackLink onNavigate={onNavigate} />
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
              <div className="mt-6 flex justify-center">
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
            <ReportBackLink onNavigate={onNavigate} />

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
            availablePatients={availablePatients}
            followUps={followUps}
            selectedFollowUp={selectedFollowUp}
            onPatientChange={onPatientChange ?? (() => undefined)}
            onFollowUpChange={handleFollowUpChange}
          />

          <ReportStepTracker activeStep={activeStep} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <ReportTemplateSelector
                selectedId={selectedReportTemplate.id}
                templates={[
                  {
                    id: SYSTEM_REPORT_TEMPLATE_ID,
                    name: SYSTEM_REPORT_TEMPLATE.name,
                    description: SYSTEM_REPORT_TEMPLATE.description,
                    version: SYSTEM_REPORT_TEMPLATE.version,
                    isSystem: true,
                  },
                  ...reportTemplates.map((template) => ({
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    version: template.latestVersion,
                    isSystem: false,
                  })),
                ]}
                loading={reportTemplateLoading}
                error={reportTemplateError}
                onChange={handleReportTemplateChange}
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
                {profileError ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    {profileError}
                  </p>
                ) : (
                  <p className="mt-3 text-[10px] text-slate-400">
                    Identitas laporan diambil dari profil aplikasi akun aktif.
                  </p>
                )}

                  <button
                    type="button"
                    onClick={generateReport}
                    disabled={
                      profileLoading ||
                      reportTemplateLoading ||
                      !reportIdentity
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <Icon name="bolt" className="h-3.5 w-3.5" />
                    {profileLoading ? "Memuat profil..." : "Generate Laporan"}
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
