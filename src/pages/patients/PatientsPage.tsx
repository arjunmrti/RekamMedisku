import { useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import PatientListHeader from "../../components/patients/PatientListHeader";
import PatientListToolbar from "../../components/patients/PatientListToolbar";
import PatientListTable from "../../components/patients/PatientListTable";
import PatientQuickActions from "../../components/patients/PatientQuickActions";
import PatientSummaryPanel from "../../components/patients/PatientSummaryPanel";
import PatientTips from "../../components/patients/PatientTips";
import AddPatientModal from "../../components/patients/AddPatientModal";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients, savePatients } from "../../data/localPatients";
import type { PatientListItem } from "../../types/patient";

type PatientsPageProps = NavigationProps & {
  onOpenPatientProfile: (patient: PatientListItem) => void;
};

type PatientSort = "newest" | "oldest" | "name" | "bed";

const monthIndexes: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  Mei: 4,
  Jun: 5,
  Jul: 6,
  Agu: 7,
  Sep: 8,
  Okt: 9,
  Nov: 10,
  Des: 11,
};

function getPatientTimestamp(patient: PatientListItem) {
  if (patient.lastFollowUpAt) {
    const timestamp = new Date(patient.lastFollowUpAt).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const match = patient.lastFollowUp.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+·\s+(\d{2})[:.](\d{2})$/,
  );

  if (match) {
    const [, day, month, year, hour, minute] = match;
    const monthIndex = monthIndexes[month];
    if (monthIndex !== undefined) {
      return new Date(
        Number(year),
        monthIndex,
        Number(day),
        Number(hour),
        Number(minute),
      ).getTime();
    }
  }

  if (patient.createdAt) {
    const created = new Date(patient.createdAt).getTime();
    if (Number.isFinite(created)) return created;
  }

  return 0;
}

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
  const [room, setRoom] = useState("Semua");
  const [sort, setSort] = useState<PatientSort>("newest");
  const activeRotation = loadActiveRotation();
  const [patients, setPatients] = useState(() => loadPatients());
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(() =>
      loadPatients().find((patient) => patient.rotationId === activeRotation.id) ??
      null,
    );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientListItem | null>(null);

  const activeRotationPatients = useMemo(
    () => patients.filter((patient) => patient.rotationId === activeRotation.id),
    [activeRotation.id, patients],
  );

  const availableRooms = useMemo(
    () =>
      Array.from(
        new Set(activeRotationPatients.map((patient) => patient.room).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [activeRotationPatients],
  );

  const filteredPatients = useMemo(() => {
    const query = (globalSearch + " " + filterSearch).trim().toLowerCase();

    const result = activeRotationPatients.filter((patient) => {
      const searchable = [
        patient.name,
        patient.rm,
        patient.age,
        patient.gender,
        patient.room,
        patient.bed,
        patient.doctor,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = status === "Semua" || patient.status === status;
      const matchesRoom = room === "Semua" || patient.room === room;

      return matchesSearch && matchesStatus && matchesRoom;
    });

    return [...result].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "bed") {
        return a.bed.localeCompare(b.bed, undefined, { numeric: true });
      }

      const aTime = getPatientTimestamp(a);
      const bTime = getPatientTimestamp(b);

      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [
    activeRotationPatients,
    filterSearch,
    globalSearch,
    room,
    sort,
    status,
  ]);

  const visibleSelectedPatient =
    selectedPatient &&
    filteredPatients.some((patient) => patient.id === selectedPatient.id)
      ? selectedPatient
      : filteredPatients[0] ?? null;

  const resetFilters = () => {
    setGlobalSearch("");
    setFilterSearch("");
    setStatus("Semua");
    setRoom("Semua");
    setSort("newest");
  };

  const openAddPatient = () => {
    setEditingPatient(null);
    setModalOpen(true);
  };

  const openEditPatient = (patient: PatientListItem) => {
    setEditingPatient(patient);
    setModalOpen(true);
  };

  const handlePatientSubmit = (patient: PatientListItem) => {
    const duplicate = patients.some(
      (item) =>
        item.id !== patient.id &&
        item.rotationId === patient.rotationId &&
        item.rm.trim().toLowerCase() === patient.rm.trim().toLowerCase(),
    );

    if (duplicate) {
      return "Nomor RM tersebut sudah digunakan pada stase ini.";
    }

    const exists = patients.some((item) => item.id === patient.id);
    const next = exists
      ? patients.map((item) => (item.id === patient.id ? patient : item))
      : [patient, ...patients];

    savePatients(next);
    setPatients(next);
    setSelectedPatient(patient);
    setEditingPatient(null);
    return null;
  };

  const handleToggleArchive = (patient: PatientListItem) => {
    const nextStatus: PatientListItem["status"] =
      patient.status === "Aktif" ? "Diarsipkan" : "Aktif";
    const action = nextStatus === "Diarsipkan" ? "Arsipkan" : "Pulihkan";

    const confirmed = window.confirm(
      action +
        " pasien " +
        patient.name +
        "? Riwayat follow-up tetap tersimpan dan tidak akan dihapus.",
    );

    if (!confirmed) return;

    const next = patients.map((item) =>
      item.id === patient.id ? { ...item, status: nextStatus } : item,
    );

    savePatients(next);
    setPatients(next);

    setSelectedPatient((current) =>
      current?.id === patient.id ? { ...current, status: nextStatus } : current,
    );
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
                <PatientListHeader
                  rotation={activeRotation}
                  totalPatients={activeRotationPatients.length}
                  activePatients={
                    activeRotationPatients.filter(
                      (patient) => patient.status === "Aktif",
                    ).length
                  }
                  archivedPatients={
                    activeRotationPatients.filter(
                      (patient) => patient.status === "Diarsipkan",
                    ).length
                  }
                  onAddPatient={openAddPatient}
                />

                <PatientListToolbar
                  searchValue={filterSearch}
                  status={status}
                  room={room}
                  rooms={availableRooms}
                  sort={sort}
                  onSearchChange={setFilterSearch}
                  onStatusChange={setStatus}
                  onRoomChange={setRoom}
                  onSortChange={setSort}
                  onReset={resetFilters}
                />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredPatients.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-700">
                      {activeRotationPatients.length}
                    </span>{" "}
                    pasien pada stase {activeRotation.name}.
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
                  onEditPatient={openEditPatient}
                  onToggleArchive={handleToggleArchive}
                />
              </section>

              <aside className="space-y-5 xl:col-span-3">
                <PatientQuickActions
                  onAddPatient={openAddPatient}
                  onNavigate={onNavigate}
                />
                <PatientSummaryPanel
                  patient={visibleSelectedPatient}
                  rotation={activeRotation}
                  onOpenProfile={onOpenPatientProfile}
                  onEditPatient={openEditPatient}
                  onToggleArchive={handleToggleArchive}
                />
                <PatientTips />
              </aside>
            </div>
          </div>
        </main>
      </AppShell>

      <AddPatientModal
        key={(editingPatient?.id ?? "new") + ":" + modalOpen}
        open={modalOpen}
        rotation={activeRotation}
        patient={editingPatient}
        onClose={() => {
          setModalOpen(false);
          setEditingPatient(null);
        }}
        onSubmit={handlePatientSubmit}
      />
    </>
  );
}
