import { useEffect, useMemo, useRef, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import FollowUpTimeline from "../../components/patient-profile/FollowUpTimeline";
import LatestFollowUp from "../../components/patient-profile/LatestFollowUp";
import PatientInfoCards from "../../components/patient-profile/PatientInfoCards";
import PatientProfileHeader from "../../components/patient-profile/PatientProfileHeader";
import ProfileTabs, { type ProfileTab } from "../../components/patient-profile/ProfileTabs";
import SupportingExams from "../../components/patient-profile/SupportingExams";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import { loadRotations } from "../../data/localRotations";
import type { PatientListItem } from "../../types/patient";
import Icon from "../../components/ui/Icon";
import type { FollowUpEntry, SupportingExam } from "../../types/followUp";
import { getAttachment } from "../../data/localAttachments";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";

type PatientProfilePageProps = NavigationProps & {
  patient: PatientListItem;
};

function sortFollowUps(entries: FollowUpEntry[]) {
  return [...entries].sort((a, b) => {
    const dateTimeA = a.isoDate + "T" + a.time.replace(".", ":");
    const dateTimeB = b.isoDate + "T" + b.time.replace(".", ":");
    const dateTimeCompare = dateTimeB.localeCompare(dateTimeA);

    if (dateTimeCompare !== 0) return dateTimeCompare;
    return b.number - a.number;
  });
}

function SupportingExamAttachment({ exam }: { exam: SupportingExam }) {
  const [attachmentUrl, setAttachmentUrl] = useState(exam.attachmentDataUrl ?? "");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "missing">(
    exam.attachmentDataUrl ? "ready" : exam.attachmentId ? "loading" : "idle",
  );

  useEffect(() => {
    if (!exam.attachmentId || exam.attachmentDataUrl) {
      setAttachmentUrl(exam.attachmentDataUrl ?? "");
      setLoadState(exam.attachmentDataUrl ? "ready" : "idle");
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    setAttachmentUrl("");
    setLoadState("loading");

    void getAttachment(exam.attachmentId)
      .then((blob) => {
        if (cancelled) return;

        if (!blob) {
          setLoadState("missing");
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setAttachmentUrl(objectUrl);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("missing");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [exam.attachmentDataUrl, exam.attachmentId]);

  if (loadState === "idle") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Tidak ada file lampiran yang tersimpan untuk pemeriksaan ini.
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">
        Menyiapkan lampiran...
      </div>
    );
  }

  if (loadState === "missing") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        Metadata lampiran tersedia, tetapi file tidak ditemukan di penyimpanan
        perangkat ini.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold text-slate-700">
          {exam.attachmentName || "Lampiran"}
        </p>
        {exam.attachmentName ? (
          <a
            href={attachmentUrl}
            download={exam.attachmentName}
            className="shrink-0 text-xs font-semibold text-[#1677FF] hover:underline"
          >
            Unduh
          </a>
        ) : null}
      </div>

      {exam.attachmentType?.startsWith("image/") ? (
        <img
          src={attachmentUrl}
          alt={exam.attachmentName || "Lampiran pemeriksaan"}
          className="mt-4 max-h-[420px] w-full rounded-xl border border-slate-200 object-contain"
        />
      ) : (
        <iframe
          src={attachmentUrl}
          title={exam.attachmentName || "Lampiran pemeriksaan"}
          className="mt-4 h-[420px] w-full rounded-xl border border-slate-200"
        />
      )}
    </div>
  );
}

export default function PatientProfilePage({
  activeItem,
  onNavigate,
  patient,
}: PatientProfilePageProps) {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const [activeTab, setActiveTab] = useState<ProfileTab>("Ringkasan");
  const [selectedExam, setSelectedExam] = useState<SupportingExam | null>(null);
  const rotation =
    loadRotations().find((item) => item.id === patient.rotationId) ?? null;
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const examsRef = useRef<HTMLDivElement | null>(null);
  const followUpRef = useRef<HTMLDivElement | null>(null);
  const [followUps, setFollowUps] = useState(() =>
    loadSavedFollowUps()[patient.id] ?? [],
  );

  useEffect(() => {
    if (workspaceSyncVersion === 0) return;

    setFollowUps(loadSavedFollowUps()[patient.id] ?? []);
  }, [workspaceSyncVersion, patient.id]);

  const orderedFollowUps = useMemo(() => sortFollowUps(followUps), [followUps]);
  const latestFollowUp =
    orderedFollowUps.find((entry) => entry.status === "Tersimpan") ?? null;

  const allSupportingExams = useMemo(() => {
    const seen = new Set<string>();

    return orderedFollowUps
      .flatMap((entry) => entry.supportingExams ?? [])
      .filter((exam) => {
        if (seen.has(exam.id)) return false;
        seen.add(exam.id);
        return true;
      });
  }, [orderedFollowUps]);

  const latestSupportingExams = latestFollowUp?.supportingExams ?? [];

  const hydratedSelectedExam = useMemo(() => {
    if (!selectedExam) return null;

    return (
      allSupportingExams.find((exam) => exam.id === selectedExam.id) ??
      selectedExam
    );
  }, [allSupportingExams, selectedExam]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);

    window.setTimeout(() => {
      if (tab === "Riwayat Follow-Up") {
        timelineRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      if (tab === "Riwayat Hasil Pemeriksaan") {
        examsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 0);
  };

  const handleOpenLatest = () => {
    if (!latestFollowUp) return;

    setActiveTab("Ringkasan");
    window.setTimeout(() => {
      followUpRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleFollowUp = () => {
    onNavigate("Follow-Up Baru");
  };

  const handleReport = () => {
    onNavigate("Semua Laporan");
  };

  const handleExamSelect = (exam: SupportingExam) => {
    setSelectedExam(exam);
  };

  return (
    <>
      <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue=""
      onSearchChange={() => undefined}
      searchEnabled={false}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <PatientProfileHeader
            patient={patient}
            rotation={rotation}
            onBack={() => onNavigate("Daftar Pasien")}
            onFollowUp={handleFollowUp}
            onReport={handleReport}
          />

          <ProfileTabs activeTab={activeTab} onChange={handleTabChange} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
            <section className="min-w-0 space-y-6 xl:col-span-8">
              <PatientInfoCards
                patient={patient}
                rotation={rotation}
                latestFollowUp={latestFollowUp}
                onOpenLatest={handleOpenLatest}
              />

              <div ref={followUpRef}>
                <LatestFollowUp
                  followUp={latestFollowUp}
                  onDetail={handleOpenLatest}
                />
              </div>

              <div ref={examsRef}>
                <SupportingExams
                  exams={latestSupportingExams}
                  onSelect={handleExamSelect}
                  onViewAll={() => handleTabChange("Riwayat Hasil Pemeriksaan")}
                />
              </div>

              {activeTab === "Riwayat Follow-Up" ? (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Riwayat Follow-Up
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">
                        {followUps.length} catatan tersimpan pada pasien ini.
                      </p>
                    </div>
                    <Icon name="clock" className="h-5 w-5 text-[#1677FF]" />
                  </div>

                  {followUps.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                      Belum ada riwayat follow-up untuk pasien ini.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {orderedFollowUps.map((entry) => (
                        <button
                          type="button"
                          key={entry.id}
                          onClick={() => {
                            setActiveTab("Ringkasan");
                            setTimeout(() => {
                              document
                                .getElementById("patient-timeline")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }, 0);
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Follow-up #{entry.number}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {entry.status}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {entry.date} · {entry.time}
                          </p>
                          <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                            {entry.summary}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {activeTab === "Riwayat Hasil Pemeriksaan" ? (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Icon
                      name="stethoscope"
                      className="h-4 w-4 text-[#1677FF]"
                    />
                    <h2 className="text-sm font-bold text-slate-900">
                      Riwayat Hasil Pemeriksaan
                    </h2>
                  </div>

                  {allSupportingExams.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                      Belum ada hasil pemeriksaan penunjang yang tersimpan.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {allSupportingExams.map((exam) => (
                        <button
                          type="button"
                          key={exam.id}
                          onClick={() => handleExamSelect(exam)}
                          className="flex w-full items-center justify-between gap-4 py-3 text-left first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1677FF]">
                              <Icon
                                name={
                                  exam.icon === "lab"
                                    ? "stethoscope"
                                    : exam.icon === "scan"
                                      ? "document"
                                      : exam.icon === "image"
                                        ? "archive"
                                        : "pulse"
                                }
                                className="h-4 w-4"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800">
                                {exam.name}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {exam.date}
                              </span>
                            </span>
                          </div>
                          <Icon
                            name="arrow"
                            className="h-4 w-4 shrink-0 text-slate-300"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
            </section>

            <div
              id="patient-timeline"
              ref={timelineRef}
              className="min-w-0 xl:col-span-4"
            >
              <FollowUpTimeline
                entries={orderedFollowUps}
                onOpenDetail={handleOpenLatest}
              />
            </div>
          </div>

          <section className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            RekamMedisku merupakan workspace dokumentasi pribadi, bukan rekam medis resmi rumah sakit. Data pada halaman ini adalah data contoh untuk prototype.
          </section>
        </div>
      </main>
      </AppShell>

      {hydratedSelectedExam ? (
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-detail-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedExam(null);
        }}
      >
        <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl">
          <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur sm:px-6 sm:pt-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
                Pemeriksaan Penunjang
              </p>
              <h2 id="exam-detail-title" className="mt-1 text-lg font-bold text-slate-900">
                {hydratedSelectedExam.name}
              </h2>
              <p className="mt-1 text-xs text-slate-400">{hydratedSelectedExam.date}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedExam(null)}
              aria-label="Tutup detail pemeriksaan"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Hasil yang dicatat
              </p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {hydratedSelectedExam.result || "Tidak ada hasil yang dicatat."}
              </p>
            </div>

            <SupportingExamAttachment exam={hydratedSelectedExam} />
          </div>
        </div>
      </div>
      ) : null}
    </>
  );
}
