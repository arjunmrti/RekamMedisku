import { useEffect, useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import ReportPreview from "../../components/report/ReportPreview";
import { getDefaultSlaberanTemplate } from "../../data/slaberanTemplates";
import { loadSlaberanLocations } from "../../data/localSlaberanLocations";
import { loadSlaberanTemplates } from "../../data/localSlaberanTemplates";
import { adaptSlaberanTemplateRecord } from "../../utils/slaberanTemplateAdapter";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { toLocalIsoDate } from "../../utils/date";
import {
  buildSlaberanReport,
  getDiagnosisSummary,
  getSlaberanDoctorOptions,
} from "../../utils/slaberanGenerator";
import Icon from "../../components/ui/Icon";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";

type SlaberanPageProps = NavigationProps;

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy clipboard path.
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

export default function SlaberanPage({
  activeItem,
  onNavigate,
}: SlaberanPageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const activeRotation = loadActiveRotation();
  const cloudTemplate = useMemo(() => {
    const templates = loadSlaberanTemplates();
    const record = templates.find((item) => item.isDefault) ?? templates[0];
    return record
      ? adaptSlaberanTemplateRecord(
          record,
          loadSlaberanLocations(),
          getDefaultSlaberanTemplate(),
        )
      : null;
  }, [workspaceSyncVersion]);
  const template = cloudTemplate ?? getDefaultSlaberanTemplate();
  const allPatients = useMemo(
    () =>
      loadPatients().filter(
        (patient) =>
          patient.rotationId === activeRotation.id &&
          patient.status === "Aktif",
      ),
    [activeRotation.id, workspaceSyncVersion],
  );
  const followUpsByPatient = useMemo(
    () => loadSavedFollowUps(),
    [workspaceSyncVersion],
  );

  const doctors = useMemo(
    () => getSlaberanDoctorOptions(allPatients),
    [allPatients],
  );
  const [doctor, setDoctor] = useState(doctors[0] ?? "");
  const [date, setDate] = useState(toLocalIsoDate());
  const [reportText, setReportText] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPatients = useMemo(
    () =>
      allPatients.filter(
        (patient) =>
          patient.doctor.replace(/\s*\(konsul\)\s*$/i, "").trim() ===
          doctor,
      ),
    [allPatients, doctor],
  );

  useEffect(() => {
    if (!doctors.length) {
      setDoctor("");
      return;
    }

    if (!doctors.includes(doctor)) {
      setDoctor(doctors[0]);
      setReportText("");
      setCopied(false);
    }
  }, [doctor, doctors]);

  const diagnosisCount = useMemo(
    () =>
      selectedPatients.filter((patient) =>
        Boolean(getDiagnosisSummary(followUpsByPatient[patient.id])),
      ).length,
    [followUpsByPatient, selectedPatients],
  );

  const generate = () => {
    if (!doctor) {
      setErrorMessage("Belum ada dokter yang tersedia pada pasien aktif.");
      return;
    }

    setReportText(
      buildSlaberanReport(template, {
        doctor,
        date,
        patients: allPatients,
        followUpsByPatient,
      }),
    );
    setEditing(false);
    setCopied(false);
    setErrorMessage("");
  };

  const handleCopy = async () => {
    if (!reportText) return;

    try {
      await copyTextToClipboard(reportText);
      setCopied(true);
      setErrorMessage("");
    } catch {
      setCopied(false);
      setErrorMessage(
        "Laporan gagal disalin otomatis. Pilih teks laporan lalu salin secara manual.",
      );
    }
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
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate("Semua Laporan")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1677FF]"
              >
                Follow-Up
              </button>
              <span className="rounded-lg bg-[#1677FF] px-3 py-2 text-[11px] font-semibold text-white">
                Slaberan
              </span>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                P4 · WhatsApp Report Generator
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Buat Slaberan
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                Generate census pasien harian dari data pasien aktif pada stase
                sekarang menggunakan template Slaberan Neurologi yang sedang diuji.
              </p>
            </div>
          </header>

          {activeRotation.specialty !== "Neurologi" ? (
            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Template awal ini khusus Neurologi. Stase aktif saat ini adalah{" "}
                  <span className="font-semibold">{activeRotation.name}</span>.
                  Ganti stase bila ingin menguji format Slaberan Neurologi.
                </p>
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Sumber Slaberan
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Pilih dokter dan tanggal. Pasien diambil dari daftar pasien
                      aktif pada stase sekarang.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#1677FF]">
                    {allPatients.length} pasien aktif
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Dokter
                    </span>
                    <select
                      value={doctor}
                      onChange={(event) => {
                        setDoctor(event.target.value);
                        setReportText("");
                        setCopied(false);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
                    >
                      {doctors.length === 0 ? (
                        <option value="">Belum ada dokter</option>
                      ) : (
                        doctors.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Tanggal Slaberan
                    </span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setReportText("");
                        setCopied(false);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#1677FF]">
                      <Icon name="document" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">
                        {template.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {template.hospital} · {template.specialty}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Template awal tanpa emoji. Struktur Lantai 1, Lantai 2,
                        CVCU/ICCU, ICU, dan IGD tetap dipertahankan.
                      </p>
                    </div>
                  </div>
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={generate}
                  disabled={!doctor}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  <Icon name="bolt" className="h-3.5 w-3.5" />
                  Generate Slaberan
                </button>
              </section>

              <ReportPreview
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

            <aside className="space-y-5 xl:sticky xl:top-20">
              <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    Ringkasan
                  </h2>
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                      (copied
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : reportText
                          ? "border-blue-100 bg-blue-50 text-[#1677FF]"
                          : "border-slate-200 bg-slate-50 text-slate-400")
                    }
                  >
                    {copied ? "Tersalin" : reportText ? "Draft siap" : "Belum dibuat"}
                  </span>
                </div>

                <div className="space-y-3 pt-4 text-[11px]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Dokter</span>
                    <span className="text-right font-semibold text-slate-700">
                      {doctor || "—"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Pasien dokter</span>
                    <span className="text-right font-semibold text-slate-700">
                      {selectedPatients.length}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Dengan diagnosis</span>
                    <span className="text-right font-semibold text-slate-700">
                      {diagnosisCount}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Template</span>
                    <span className="text-right font-semibold text-slate-700">
                      {template.name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!reportText}
                  className={
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-sm transition " +
                    (copied
                      ? "bg-emerald-600"
                      : reportText
                        ? "bg-[#1677FF] hover:bg-blue-700"
                        : "cursor-not-allowed bg-slate-200 text-slate-400")
                  }
                >
                  <Icon
                    name={copied ? "check" : "document"}
                    className="h-4 w-4"
                  />
                  {copied ? "Tersalin ke Clipboard" : "Salin Slaberan"}
                </button>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#1677FF]">
                    <Icon name="alert" className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Diagnosis ringkas pada prototype ini diambil dari assessment
                    follow-up terakhir pasien. Sistem tidak membuat diagnosis baru
                    dan tidak mengirim WhatsApp otomatis.
                  </p>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
