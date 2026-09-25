import { useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiGrid from "../../components/dashboard/KpiGrid";
import PatientTable from "../../components/dashboard/PatientTable";
import RotationHistory from "../../components/dashboard/RotationHistory";
import QuickActions from "../../components/dashboard/QuickActions";
import type { Patient } from "../../types/dashboard";

const patients: Patient[] = [
  {
    name: "Muhammad Fadel",
    rm: "24012601",
    room: "3A",
    bed: "12",
    doctor: "dr. Budi Santoso, Sp.N",
    lastFollowUp: "26 Sep 2026 · 09:30",
    status: "Aktif",
  },
  {
    name: "Budi Santoso",
    rm: "24012602",
    room: "3A",
    bed: "14",
    doctor: "dr. Budi Santoso, Sp.N",
    lastFollowUp: "25 Sep 2026 · 14:20",
    status: "Aktif",
  },
  {
    name: "Citra Lestari",
    rm: "24012603",
    room: "3B",
    bed: "07",
    doctor: "dr. Sari Dewi, Sp.N",
    lastFollowUp: "25 Sep 2026 · 10:15",
    status: "Aktif",
  },
  {
    name: "Dewi Anggraini",
    rm: "24012604",
    room: "3B",
    bed: "08",
    doctor: "dr. Sari Dewi, Sp.N",
    lastFollowUp: "24 Sep 2026 · 16:45",
    status: "Aktif",
  },
  {
    name: "Eko Prasetyo",
    rm: "24012605",
    room: "4A",
    bed: "03",
    doctor: "dr. Budi Santoso, Sp.N",
    lastFollowUp: "24 Sep 2026 · 11:30",
    status: "Aktif",
  },
];

export default function DashboardPage({
  activeItem,
  onNavigate,
}: NavigationProps) {
  const [searchValue, setSearchValue] = useState("");

  const filteredPatients = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return patients;
    }

    return patients.filter((patient) =>
      (
        patient.name +
        " " +
        patient.rm +
        " " +
        patient.room +
        " " +
        patient.bed +
        " " +
        patient.doctor
      )
        .toLowerCase()
        .includes(query),
    );
  }, [searchValue]);

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
    >
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
        <div className="mx-auto w-full max-w-[1400px]">
          <DashboardHeader />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="min-w-0 space-y-6 lg:col-span-9">
              <KpiGrid />

              <PatientTable
                patients={filteredPatients}
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
