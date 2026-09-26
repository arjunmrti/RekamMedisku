import { useEffect, useMemo, useRef, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import PatientListHeader from "../../components/patients/PatientListHeader";
import PatientListToolbar from "../../components/patients/PatientListToolbar";
import PatientListTable from "../../components/patients/PatientListTable";
import PatientSummaryPanel from "../../components/patients/PatientSummaryPanel";
import AddPatientModal from "../../components/patients/AddPatientModal";
import { loadActiveRotation } from "../../data/localRotations";
import { loadPatients } from "../../data/localPatients";
import {
  deletePatientWithSupabase,
  getSupabasePatientErrorMessage,
  setPatientStatusWithSupabase,
  upsertPatientWithSupabase,
} from "../../data/supabasePatients";
import type { PatientListItem } from "../../types/patient";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import { syncWorkspaceWithSupabase } from "../../data/supabaseSyncEngine";
import { isSamePatientIdentity } from "../../data/patientIdentity";

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
  const workspaceSyncVersion = useWorkspaceSyncVersion();
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
  const [syncing, setSyncing] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const deletingPatientRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function syncWorkspace() {
      setSyncing(true);
      setErrorMessage("");

      try {
        await syncWorkspaceWithSupabase();
        const nextPatients = loadPatients();

        if (cancelled) return;

        setPatients(nextPatients);
        setSelectedPatient(
          (current) =>
            nextPatients.find(
              (patient) =>
                patient.id === current?.id &&
                patient.rotationId === activeRotation.id,
            ) ??
            nextPatients.find(
              (patient) => patient.rotationId === activeRotation.id,
            ) ??
            null,
        );
      } catch (error) {
        console.error("Supabase patient sync failed:", error);

        if (!cancelled) {
          setErrorMessage(getSupabasePatientErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void syncWorkspace();

    return () => {
      cancelled = true;
    };
  }, [activeRotation.id]);

  useEffect(() => {
    if (workspaceSyncVersion === 0) return;

    const latestPatients = loadPatients();
    setPatients(latestPatients);
    setSelectedPatient((current) => {
      if (current) {
        return (
          latestPatients.find(
            (patient) => patient.id === current.id && patient.rotationId === activeRotation.id,
          ) ?? null
        );
      }

      return (
        latestPatients.find(
          (patient) => patient.rotationId === activeRotation.id,
        ) ?? null
      );
    });
  }, [workspaceSyncVersion, activeRotation.id]);

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
    const query = filterSearch.trim().toLowerCase();

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

  const handlePatientSubmit = async (
    patient: PatientListItem,
  ): Promise<string | null> => {
    const duplicate = patients.some(
      (item) =>
        item.id !== patient.id &&
        isSamePatientIdentity(
          item.rotationId,
          item.rm,
          patient.rotationId,
          patient.rm,
        ),
    );

    if (duplicate) {
      return "Nomor RM tersebut sudah digunakan pada stase ini.";
    }

    try {
      const next = await upsertPatientWithSupabase(patient);
      setPatients(next);
      setSelectedPatient(patient);
      setEditingPatient(null);
      setErrorMessage("");
      return null;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data pasien.",
      );
      return "Pasien belum tersimpan. Periksa koneksi lalu coba lagi.";
    }
  };

  const handleToggleArchive = async (patient: PatientListItem) => {
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

    setErrorMessage("");

    try {
      const next = await setPatientStatusWithSupabase(patient, nextStatus);
      setPatients(next);
      setSelectedPatient(
        (current) =>
          current?.id === patient.id
            ? next.find((item) => item.id === patient.id) ?? current
            : current,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah status pasien.",
      );
      window.alert("Status pasien belum berubah. Silakan coba lagi.");
    }
  };

  const handleDeletePatient = async (patient: PatientListItem) => {
    if (deletingPatientRef.current) return;

    const confirmed = window.confirm(
      "Hapus permanen pasien " +
        patient.name +
        "? Semua data pasien, riwayat follow-up, draft, dan lampiran terkait akan dihapus dan tidak dapat dipulihkan.",
    );

    if (!confirmed) return;

    deletingPatientRef.current = true;

    try {
      const deleted = await deletePatientWithSupabase(patient);

      if (!deleted) return;

      const nextPatients = loadPatients();
      setPatients(nextPatients);
      setSelectedPatient(
        (current) =>
          current?.id === patient.id
            ? nextPatients.find((item) => item.rotationId === activeRotation.id) ??
              null
            : current,
      );
    } catch {
      window.alert(
        "Pasien belum dihapus karena proses penghapusan data gagal. Silakan coba lagi.",
      );
    } finally {
      deletingPatientRef.current = false;
    }
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
        <main className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 sm:px-5 sm:py-5 md:px-6 lg:px-8 lg:py-7 lg:pb-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="space-y-4 sm:space-y-5">
              <section className="min-w-0 space-y-4 sm:space-y-5">
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

                {syncing ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-[11px] font-medium text-slate-500">
                    Menyinkronkan data pasien...
                  </div>
                ) : null}

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] leading-relaxed text-rose-700"
                  >
                    {errorMessage}
                  </div>
                ) : null}

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

                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-xs text-slate-500">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredPatients.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-700">
                      {activeRotationPatients.length}
                    </span>{" "}
                    pasien
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="hidden min-h-10 px-1 text-xs font-semibold text-[#1677FF] hover:underline lg:block"
                  >
                    Reset Filter
                  </button>
                </div>

                <PatientSummaryPanel
                  patient={visibleSelectedPatient}
                  rotation={activeRotation}
                  onOpenProfile={onOpenPatientProfile}
                  onEditPatient={openEditPatient}
                  onToggleArchive={handleToggleArchive}
                  onDeletePatient={handleDeletePatient}
                />

                <PatientListTable
                  patients={filteredPatients}
                  selectedPatientId={visibleSelectedPatient?.id ?? null}
                  onSelectPatient={setSelectedPatient}
                  onEditPatient={openEditPatient}
                  onToggleArchive={handleToggleArchive}
                  onDeletePatient={handleDeletePatient}
                />
              </section>
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
