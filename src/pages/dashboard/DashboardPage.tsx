import { useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiGrid from "../../components/dashboard/KpiGrid";
import PatientTable from "../../components/dashboard/PatientTable";
import RotationHistory from "../../components/dashboard/RotationHistory";
import QuickActions from "../../components/dashboard/QuickActions";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import type { PatientListItem } from "../../types/patient";
import type { FollowUpEntry } from "../../types/followUp";
import { toLocalIsoDate } from "../../utils/date";

function getFollowUps(patientId: string): FollowUpEntry[] {
  const local = loadSavedFollowUps()[patientId] ?? [];

  return [...local]
    .filter((entry, index, entries) => {
      return entries.findIndex((candidate) => candidate.id === entry.id) === index;
    })
    .sort((a, b) => (b.isoDate + b.time).localeCompare(a.isoDate + a.time));
}

function enrichPatient(
  patient: PatientListItem,
  followUps: FollowUpEntry[],
): PatientListItem {
  const latest = followUps[0];

  return {
    ...patient,
    lastFollowUp: latest
      ? latest.date + " · " + latest.time
      : "Belum ada follow-up",
    followUpNumber: latest?.number ?? 0,
    lastFollowUpAt: latest
      ? latest.isoDate + "T" + latest.time.replace(".", ":") + ":00"
      : patient.lastFollowUpAt,
  };
}

export default function DashboardPage({
  activeItem,
  onNavigate,
  onOpenPatientProfile,
}: NavigationProps & {
  onOpenPatientProfile: (patient: PatientListItem) => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const activeRotation = loadActiveRotation();
  const patients = loadPatients();

  const activePatients = useMemo(
    () =>
      patients
        .filter(
          (patient) =>
            patient.rotationId === activeRotation.id &&
            patient.status === "Aktif",
        )
        .map((patient) => enrichPatient(patient, getFollowUps(patient.id))),
    [activeRotation.id, patients],
  );

  const archivedPatientCount = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.rotationId === activeRotation.id &&
          patient.status === "Diarsipkan",
      ).length,
    [activeRotation.id, patients],
  );

  const followUpsToday = useMemo(() => {
    const today = toLocalIsoDate();

    return activePatients.reduce(
      (total, patient) =>
        total +
        getFollowUps(patient.id).filter(
          (entry) => entry.status === "Tersimpan" && entry.isoDate === today,
        ).length,
      0,
    );
  }, [activePatients]);

  const pendingFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return activePatients.filter((patient) => {
      const latest = getFollowUps(patient.id)[0];
      return !latest || latest.isoDate !== today;
    }).length;
  }, [activePatients]);

  const filteredPatients = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const sorted = [...activePatients].sort((a, b) => {
      const aTime = a.lastFollowUpAt
        ? new Date(a.lastFollowUpAt).getTime()
        : 0;
      const bTime = b.lastFollowUpAt
        ? new Date(b.lastFollowUpAt).getTime()
        : 0;
      return bTime - aTime;
    });

    if (!query) return sorted.slice(0, 6);

    return sorted
      .filter((patient) =>
        [
          patient.name,
          patient.rm,
          patient.room,
          patient.bed,
          patient.doctor,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6);
  }, [activePatients, searchValue]);

  const kpis = [
    {
      title: "Pasien Aktif",
      value: String(activePatients.length),
      description: "pada stase aktif",
      icon: "users" as const,
      iconClassName: "bg-blue-50 text-blue-600",
    },
    {
      title: "Follow-Up Hari Ini",
      value: String(followUpsToday),
      description: "catatan tersimpan hari ini",
      icon: "calendar" as const,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Perlu Ditindaklanjuti",
      value: String(pendingFollowUps),
      description: "pasien belum follow-up hari ini",
      icon: "alert" as const,
      iconClassName: "bg-amber-50 text-amber-500",
    },
    {
      title: "Pasien Diarsipkan",
      value: String(archivedPatientCount),
      description: "pada stase aktif",
      icon: "archive" as const,
      iconClassName: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <DashboardHeader
            rotation={activeRotation}
            onChangeRotation={() => onNavigate("Stase Saya")}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="min-w-0 space-y-6 lg:col-span-9">
              <KpiGrid cards={kpis} />

              <PatientTable
                patients={filteredPatients}
                onOpenPatient={onOpenPatientProfile}
                onViewAll={() => onNavigate("Daftar Pasien")}
              />

              <RotationHistory />
            </section>

            <aside className="lg:col-span-3">
              <QuickActions onNavigate={onNavigate} />
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
