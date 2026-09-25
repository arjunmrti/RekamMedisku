import { useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import PatientListHeader from "../../components/patients/PatientListHeader";
import PatientListToolbar from "../../components/patients/PatientListToolbar";
import PatientListTable from "../../components/patients/PatientListTable";
import PatientQuickActions from "../../components/patients/PatientQuickActions";
import PatientSummaryPanel from "../../components/patients/PatientSummaryPanel";
import PatientTips from "../../components/patients/PatientTips";
import AddPatientModal from "../../components/patients/AddPatientModal";
import { loadPatients, savePatients } from "../../data/localPatients";
import type { PatientListItem } from "../../types/patient";

type PatientsPageProps = NavigationProps & {
  onOpenPatientProfile: (patient: PatientListItem) => void;
};

export default function PatientsPage({
  activeItem,
  onNavigate,
  onOpenPatientProfile,
}: PatientsPageProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [status, setStatus] = useState<
    "Semua" | "Aktif" | "Diarsipkan"
  >("Semua");
  const [room, setRoom] = useState<"Semua" | "3A" | "3B" | "4A">("Semua");
  const [sort, setSort] = useState<
    "newest" | "oldest" | "name" | "bed"
  >("newest");
  const [patients, setPatients] = useState(() => loadPatients());
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(() => loadPatients()[0] ?? null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    const query = (globalSearch + " " + filterSearch).trim().toLowerCase();

    const result = patients.filter((patient) => {
      const searchable =
        patient.name +
        " " +
        patient.rm +
        " " +
        patient.age +
        " " +
        patient.gender +
        " " +
        patient.room +
        " " +
        patient.bed +
        " " +
        patient.doctor;

      const matchesSearch = !query || searchable.toLowerCase().includes(query);
      const matchesStatus = status === "Semua" || patient.status === status;
      const matchesRoom = room === "Semua" || patient.room === room;

      return matchesSearch && matchesStatus && matchesRoom;
    });

    return [...result].sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sort === "bed") {
        return a.bed.localeCompare(b.bed, undefined, { numeric: true });
      }
      if (sort === "oldest") {
        return b.lastFollowUp.localeCompare(a.lastFollowUp);
      }
      return a.lastFollowUp.localeCompare(b.lastFollowUp);
    });
  }, [filterSearch, globalSearch, patients, room, sort, status]);

  const resetFilters = () => {
    setGlobalSearch("");
    setFilterSearch("");
    setStatus("Semua");
    setRoom("Semua");
    setSort("newest");
  };

  const handleAddPatient = (patient: PatientListItem) => {
    setPatients((current) => {
      const next = [patient, ...current];
      savePatients(next);
      return next;
    });
    setSelectedPatient(patient);
  };

  return (
    <>
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue={globalSearch}
        onSearchChange={setGlobalSearch}
      >
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <section className="min-w-0 space-y-5 xl:col-span-9">
                <PatientListHeader onAddPatient={() => setModalOpen(true)} />

                <PatientListToolbar
                  searchValue={filterSearch}
                  status={status}
                  room={room}
                  sort={sort}
                  onSearchChange={setFilterSearch}
                  onStatusChange={setStatus}
                  onRoomChange={setRoom}
                  onSortChange={setSort}
                  onReset={resetFilters}
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredPatients.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-700">
                      {patients.length}
                    </span>{" "}
                    pasien
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="hidden min-h-10 px-2 text-xs font-medium text-[#1677FF] hover:underline lg:block"
                  >
                    Reset Filter
                  </button>
                </div>

                <PatientListTable
                  patients={filteredPatients}
                  onSelectPatient={setSelectedPatient}
                />
              </section>

              <aside className="space-y-5 xl:col-span-3">
                <PatientQuickActions
                  onAddPatient={() => setModalOpen(true)}
                />
                <PatientSummaryPanel
                  patient={selectedPatient}
                  onOpenProfile={onOpenPatientProfile}
                />
                <PatientTips />
              </aside>
            </div>
          </div>
        </main>
      </AppShell>

      <AddPatientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddPatient}
      />
    </>
  );
}
