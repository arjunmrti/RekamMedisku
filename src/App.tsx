import { useState } from "react";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PatientProfilePage from "./pages/patient-profile/PatientProfilePage";
import FollowUpFormPage from "./pages/follow-up/FollowUpFormPage";
import ReportGeneratorPage from "./pages/reports/ReportGeneratorPage";
import PatientsPage from "./pages/patients/PatientsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { mockPatients } from "./data/mockPatients";
import type { PatientListItem } from "./types/patient";

type View =
  | "Beranda"
  | "Daftar Pasien"
  | "Profil Pasien"
  | "Follow-Up Baru"
  | "Semua Laporan"
  | "Cadangan & Data"
  | "Pengaturan";

function App() {
  const [activeItem, setActiveItem] = useState<View>("Beranda");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(
    mockPatients[0] ?? null,
  );

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
      label === "Pengaturan"
    ) {
      setActiveItem(label);
      return;
    }

    if (label === "Follow-Up Baru") {
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
    return <PlaceholderPage title="Cadangan & Data" {...navigationProps} />;
  }

  if (activeItem === "Pengaturan") {
    return <PlaceholderPage title="Pengaturan" {...navigationProps} />;
  }

  return <DashboardPage {...navigationProps} />;
}

export default App;
