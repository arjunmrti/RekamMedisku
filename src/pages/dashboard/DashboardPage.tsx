import { useEffect, useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiGrid from "../../components/dashboard/KpiGrid";
import PatientTable from "../../components/dashboard/PatientTable";
import RotationHistory from "../../components/dashboard/RotationHistory";
import QuickActions from "../../components/dashboard/QuickActions";
import DashboardStatusPanel from "../../components/dashboard/DashboardStatusPanel";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import { loadSavedFollowUps } from "../../data/localFollowUps";
import {
  APPLICATION_PROFILE_EVENT,
  loadApplicationProfile,
} from "../../data/applicationProfile";
import type { PatientListItem } from "../../types/patient";
import type { FollowUpEntry } from "../../types/followUp";
import { toLocalIsoDate } from "../../utils/date";
import {
  getCompletedFollowUps,
  hasCompletedFollowUpToday,
} from "../../utils/dashboardFollowUp";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";

function getFollowUps(patientId: string): FollowUpEntry[] {
  return getCompletedFollowUps(loadSavedFollowUps()[patientId] ?? []);
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
  const syncVersion = useWorkspaceSyncVersion();
  const [searchValue, setSearchValue] = useState("");
  const [profileName, setProfileName] = useState<string>("Dokter");
  const activeRotation = loadActiveRotation();
  const patients = loadPatients();

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const profile = await loadApplicationProfile();
        if (!cancelled && profile?.name) {
          setProfileName(profile.name);
        }
      } catch {
        // Safe fallback
      }
    };

    void fetchProfile();

    const handleProfileUpdate = () => {
      void fetchProfile();
    };

    window.addEventListener(APPLICATION_PROFILE_EVENT, handleProfileUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(APPLICATION_PROFILE_EVENT, handleProfileUpdate);
    };
  }, [syncVersion]);

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
    const today = toLocalIsoDate();

    return activePatients.filter(
      (patient) =>
        !hasCompletedFollowUpToday(getFollowUps(patient.id), today),
    ).length;
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
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-8 md:pb-8 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <DashboardHeader
            userName={profileName}
            rotation={activeRotation}
            onChangeRotation={() => onNavigate("Stase Saya")}
          />

          <div className="space-y-6">
            <KpiGrid cards={kpis} />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <section className="min-w-0 space-y-6 lg:col-span-8">
                <PatientTable
                  patients={filteredPatients}
                  onOpenPatient={onOpenPatientProfile}
                  onViewAll={() => onNavigate("Daftar Pasien")}
                />

                <RotationHistory />
              </section>

              <aside className="min-w-0 space-y-6 lg:col-span-4">
                <QuickActions onNavigate={onNavigate} />
                <DashboardStatusPanel
                  activePatients={activePatients.length}
                  followUpsToday={followUpsToday}
                  pendingFollowUps={pendingFollowUps}
                  archivedPatients={archivedPatientCount}
                />
              </aside>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
