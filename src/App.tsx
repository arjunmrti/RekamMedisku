import { useEffect, useState } from "react";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PatientProfilePage from "./pages/patient-profile/PatientProfilePage";
import FollowUpFormPage from "./pages/follow-up/FollowUpFormPage";
import ReportGeneratorPage, { type ReportMode } from "./pages/reports/ReportGeneratorPage";
import SlaberanPage from "./pages/reports/SlaberanPage";
import PatientsPage from "./pages/patients/PatientsPage";
import BackupDataPage from "./pages/backup/BackupDataPage";
import RotationManagementPage from "./pages/rotations/RotationManagementPage";
import { loadActiveRotation } from "./data/localRotations";
import { loadPatients } from "./data/localPatients";
import type { Rotation } from "./types/rotation";
import type { PatientListItem } from "./types/patient";
import { useWorkspaceSyncVersion } from "./hooks/useWorkspaceSync";
import { isActivePatientInRotation } from "./utils/patientContext";

type View =
  | "Beranda"
  | "Daftar Pasien"
  | "Profil Pasien"
  | "Follow-Up Baru"
  | "Semua Laporan"
  | "Slaberan"
  | "Cadangan & Data"
  | "Stase Saya";

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
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const [activeItem, setActiveItem] = useState<View>(() =>
    loadActiveRotation().id ? "Beranda" : "Stase Saya",
  );
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(() => getInitialPatient());
  const [reportMode, setReportMode] = useState<ReportMode>("follow-up");

  useEffect(() => {
    if (workspaceSyncVersion === 0) return;

    const activeRotation = loadActiveRotation();
    const patients = loadPatients();

    setSelectedPatient((current) => {
      if (!current) {
        return (
          patients.find(
            (patient) =>
              patient.rotationId === activeRotation.id &&
              patient.status === "Aktif",
          ) ?? null
        );
      }

      const refreshed =
        patients.find(
          (patient) =>
            patient.id === current.id &&
            isActivePatientInRotation(patient, activeRotation.id),
        ) ?? null;

      if (!refreshed) {
        setActiveItem((currentItem) =>
          currentItem === "Profil Pasien" ||
          currentItem === "Follow-Up Baru" ||
          currentItem === "Semua Laporan"
            ? "Daftar Pasien"
            : currentItem,
        );
        return null;
      }

      return refreshed;
    });
  }, [workspaceSyncVersion]);
  const handleNavigate = (label: string) => {
    if (label === "Pasien") {
      setActiveItem("Daftar Pasien");
      return;
    }

    if (
      label === "Beranda" ||
      label === "Daftar Pasien" ||
      label === "Semua Laporan" ||
      label === "Slaberan" ||
      label === "Cadangan & Data" ||
      label === "Stase Saya"
    ) {
      if (label === "Semua Laporan") {
        const activeRotation = loadActiveRotation();
        const patients = loadPatients();
        const currentPatient =
          selectedPatient &&
          selectedPatient.rotationId === activeRotation.id &&
          selectedPatient.status === "Aktif"
            ? patients.find(
                (patient) =>
                  patient.id === selectedPatient.id &&
                  patient.rotationId === activeRotation.id &&
                  patient.status === "Aktif",
              ) ?? null
            : null;
        const nextPatient =
          currentPatient ??
          patients.find(
            (patient) =>
              patient.rotationId === activeRotation.id &&
              patient.status === "Aktif",
          ) ??
          null;

        if (!nextPatient) {
          setSelectedPatient(null);
          setActiveItem("Daftar Pasien");
          return;
        }

        setSelectedPatient(nextPatient);
        setActiveItem("Semua Laporan");
        return;
      }

      if (label === "Beranda" && !loadActiveRotation().id) {
        setActiveItem("Stase Saya");
        return;
      }

      setActiveItem(label);
      return;
    }

    if (label === "Profil Pasien") {
      const activeRotation = loadActiveRotation();
      const patients = loadPatients();
      const currentPatient =
        selectedPatient &&
        selectedPatient.rotationId === activeRotation.id &&
        selectedPatient.status === "Aktif"
          ? patients.find(
              (patient) =>
                patient.id === selectedPatient.id &&
                patient.rotationId === activeRotation.id &&
                patient.status === "Aktif",
            ) ?? null
          : null;

      if (!currentPatient) {
        setSelectedPatient(null);
        setActiveItem("Daftar Pasien");
        return;
      }

      setSelectedPatient(currentPatient);
      setActiveItem("Profil Pasien");
      return;
    }

    if (label === "Follow-Up Baru") {
      const activeRotation = loadActiveRotation();
      const patients = loadPatients();
      const currentPatient =
        selectedPatient &&
        selectedPatient.rotationId === activeRotation.id &&
        selectedPatient.status === "Aktif"
          ? patients.find(
              (patient) =>
                patient.id === selectedPatient.id &&
                patient.rotationId === activeRotation.id &&
                patient.status === "Aktif",
            ) ?? null
          : null;
      const nextPatient =
        currentPatient ??
        patients.find(
          (patient) =>
            patient.rotationId === activeRotation.id &&
            patient.status === "Aktif",
        ) ??
        null;

      if (!nextPatient) {
        setSelectedPatient(null);
        setActiveItem("Daftar Pasien");
        return;
      }

      setSelectedPatient(nextPatient);
      setActiveItem("Follow-Up Baru");
      return;
    }

    setActiveItem("Beranda");
  };

  const navigationProps = {
    activeItem,
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

  if (activeItem === "Semua Laporan") {
    return (
      <ReportGeneratorPage
        key={selectedPatient?.id ?? reportMode}
        {...navigationProps}
        patient={selectedPatient}
        mode={reportMode}
        onModeChange={setReportMode}
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
