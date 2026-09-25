import { useMemo, useRef, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import FollowUpTimeline from "../../components/patient-profile/FollowUpTimeline";
import LatestFollowUp from "../../components/patient-profile/LatestFollowUp";
import PatientInfoCards from "../../components/patient-profile/PatientInfoCards";
import PatientProfileHeader from "../../components/patient-profile/PatientProfileHeader";
import ProfileTabs, { type ProfileTab } from "../../components/patient-profile/ProfileTabs";
import SupportingExams from "../../components/patient-profile/SupportingExams";
import {
  mockFollowUpsByPatient,
  mockSupportingExamsByPatient,
} from "../../data/mockFollowUps";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import type { PatientListItem } from "../../types/patient";
import Icon from "../../components/ui/Icon";
import type { SupportingExam } from "../../types/followUp";

type PatientProfilePageProps = NavigationProps & {
  patient: PatientListItem;
};

export default function PatientProfilePage({
  activeItem,
  onNavigate,
  patient,
}: PatientProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Ringkasan");
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const examsRef = useRef<HTMLDivElement | null>(null);
  const followUpRef = useRef<HTMLDivElement | null>(null);

  const followUps = useMemo(() => {
    const mock = mockFollowUpsByPatient[patient.id] ?? [];
    const local = loadSavedFollowUps()[patient.id] ?? [];
    const seen = new Set<string>();

    return [...local, ...mock]
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .sort((a, b) =>
        (b.isoDate + b.time).localeCompare(a.isoDate + a.time),
      );
  }, [patient.id]);

  const supportingExams = useMemo(() => {
    const latestSavedExams = followUps.flatMap(
      (entry) => entry.supportingExams ?? [],
    );

    if (latestSavedExams.length > 0) {
      return latestSavedExams;
    }

    return mockSupportingExamsByPatient[patient.id] ?? [];
  }, [followUps, patient.id]);
  const latestFollowUp = followUps[0] ?? null;

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
    window.alert(exam.name + " · " + exam.date);
  };

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue=""
      onSearchChange={() => undefined}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <PatientProfileHeader
            patient={patient}
            onBack={() => onNavigate("Daftar Pasien")}
            onFollowUp={handleFollowUp}
            onReport={handleReport}
          />

          <ProfileTabs activeTab={activeTab} onChange={handleTabChange} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
            <section className="min-w-0 space-y-6 xl:col-span-8">
              <PatientInfoCards
                patient={patient}
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
                  exams={supportingExams}
                  onSelect={handleExamSelect}
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
                      {followUps.map((entry) => (
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

                  {supportingExams.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                      Belum ada hasil pemeriksaan penunjang yang tersimpan.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {supportingExams.map((exam) => (
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
                entries={followUps}
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
  );
}
