import { useState } from "react";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PatientProfilePage from "./pages/patient-profile/PatientProfilePage";
import FollowUpFormPage from "./pages/follow-up/FollowUpFormPage";
import ReportGeneratorPage from "./pages/reports/ReportGeneratorPage";
import PatientsPage from "./pages/patients/PatientsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import BackupDataPage from "./pages/backup/BackupDataPage";
import RotationManagementPage from "./pages/rotations/RotationManagementPage";
import { loadActiveRotation } from "./data/localRotations";
import { loadPatients } from "./data/localPatients";
import type { Rotation } from "./types/rotation";
import type { PatientListItem } from "./types/patient";

type View =
  | "Beranda"
  | "Daftar Pasien"
  | "Profil Pasien"
  | "Follow-Up Baru"
  | "Semua Laporan"
  | "Cadangan & Data"
  | "Stase Saya"
  | "Pengaturan";

function getInitialPatient() {
  const activeRotation = loadActiveRotation();

  return (
    loadPatients().find(
      (patient) =>
        patient.rotationId === activeRotation.id && patient.status === "Aktif",
    ) ?? null
  );
}

function App() {
  const [activeItem, setActiveItem] = useState<View>("Beranda");
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(() => getInitialPatient());

  const refreshSelectedPatient = () => {
    setSelectedPatient((current) => {
      if (!current) return current;

      return (
        loadPatients().find((patient) => patient.id === current.id) ??
        current
      );
    });
  };

  const handleNavigate = (label: string) => {
    if (label === "Pasien") {
      setActiveItem("Daftar Pasien");
      return;
    }

    if (
      label === "Beranda" ||
      label === "Daftar Pasien" ||
      label === "Semua Laporan" ||
      label === "Cadangan & Data" ||
      label === "Stase Saya" ||
      label === "Pengaturan"
    ) {
      if (label === "Semua Laporan") {
        refreshSelectedPatient();
      }
      setActiveItem(label);
      return;
    }

    if (label === "Profil Pasien") {
      refreshSelectedPatient();
      setActiveItem("Profil Pasien");
      return;
    }

    if (label === "Follow-Up Baru") {
      if (!selectedPatient) {
        setActiveItem("Daftar Pasien");
        return;
      }

      setActiveItem("Follow-Up Baru");
      return;
    }

    setActiveItem("Beranda");
  };

  const navigationActiveItem =
    activeItem === "Profil Pasien" || activeItem === "Follow-Up Baru"
      ? "Daftar Pasien"
      : activeItem;

  const navigationProps = {
    activeItem: navigationActiveItem,
    onNavigate: handleNavigate,
  };

  if (activeItem === "Follow-Up Baru" && selectedPatient) {
    return (
      <FollowUpFormPage
        key={selectedPatient.id}
        {...navigationProps}
        patient={selectedPatient}
      />
    );
  }

  if (activeItem === "Profil Pasien" && selectedPatient) {
    return (
      <PatientProfilePage
        {...navigationProps}
        patient={selectedPatient}
      />
    );
  }

  if (activeItem === "Daftar Pasien") {
    return (
      <PatientsPage
        {...navigationProps}
        onOpenPatientProfile={(patient) => {
          setSelectedPatient(patient);
          setActiveItem("Profil Pasien");
        }}
      />
    );
  }

  if (activeItem === "Semua Laporan" && selectedPatient) {
    return (
      <ReportGeneratorPage
        key={selectedPatient.id}
        {...navigationProps}
        patient={selectedPatient}
      />
    );
  }

  if (activeItem === "Cadangan & Data") {
    return <BackupDataPage {...navigationProps} />;
  }

  if (activeItem === "Stase Saya") {
    return (
      <RotationManagementPage
        {...navigationProps}
        onRotationChange={(rotation: Rotation) => {
          const nextPatient =
            loadPatients().find(
              (patient) =>
                patient.rotationId === rotation.id &&
                patient.status === "Aktif",
            ) ?? null;

          setSelectedPatient(nextPatient);
        }}
      />
    );
  }

  if (activeItem === "Pengaturan") {
    return <PlaceholderPage title="Pengaturan" {...navigationProps} />;
  }

  return (
    <DashboardPage
      {...navigationProps}
      onOpenPatientProfile={(patient) => {
        setSelectedPatient(patient);
        setActiveItem("Profil Pasien");
      }}
    />
  );
}

export default App;
