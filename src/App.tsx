import { lazy, Suspense, useEffect, useState } from "react";
import type { ReportMode } from "./types/report";
import type { Rotation } from "./types/rotation";
import type { PatientListItem } from "./types/patient";

const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const PatientProfilePage = lazy(() => import("./pages/patient-profile/PatientProfilePage"));
const FollowUpFormPage = lazy(() => import("./pages/follow-up/FollowUpFormPage"));
const ReportGeneratorPage = lazy(() => import("./pages/reports/ReportGeneratorPage"));
const PatientsPage = lazy(() => import("./pages/patients/PatientsPage"));
const BackupDataPage = lazy(() => import("./pages/backup/BackupDataPage"));
const RotationManagementPage = lazy(() => import("./pages/rotations/RotationManagementPage"));
import { loadActiveRotation } from "./data/localRotations";
import { loadPatients } from "./data/localPatients";
import { useWorkspaceSyncVersion } from "./hooks/useWorkspaceSync";
import { isActivePatientInRotation } from "./utils/patientContext";

type View =
  | "Beranda"
  | "Daftar Pasien"
  | "Profil Pasien"
  | "Follow-Up Baru"
  | "Semua Laporan"
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

export default function App() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <AppContent />
    </Suspense>
  );
}

function AppLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500 mx-auto mb-4"></div>
        <p className="text-sm text-slate-600">Memuat halaman...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const workspaceSyncVersion = useWorkspaceSyncVersion();
  const [activeItem, setActiveItem] = useState<View>(() =>
    loadActiveRotation().id ? "Beranda" : "Stase Saya",
  );
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(() => getInitialPatient());
  const [reportMode, setReportMode] = useState<ReportMode>("hub");
  const activeRotationId = loadActiveRotation().id;
  const reportPatients = loadPatients().filter((candidate) =>
    isActivePatientInRotation(candidate, activeRotationId),
  );

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
          (currentItem === "Semua Laporan" && reportMode !== "hub")
            ? "Daftar Pasien"
            : currentItem,
        );
        return null;
      }

      return refreshed;
    });
  }, [workspaceSyncVersion, reportMode]);
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
      if (label === "Slaberan") {
        setReportMode("slaberan");
        setActiveItem("Semua Laporan");
        return;
      }

      if (label === "Semua Laporan") {
        setReportMode("hub");
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
        patient={selectedPatient ?? undefined}
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
        key={`${selectedPatient?.id ?? "none"}:${reportMode}`}
        {...navigationProps}
        patient={selectedPatient ?? undefined}
        availablePatients={reportPatients}
        mode={reportMode}
        onPatientChange={(patientId) => {
          const nextPatient = reportPatients.find(
            (candidate) => candidate.id === patientId,
          );

          if (nextPatient) {
            setSelectedPatient(nextPatient);
          }
        }}
        onModeChange={(nextMode) => {
          if (nextMode === "follow-up" && !selectedPatient) {
            const activeRotation = loadActiveRotation();
            const fallbackPatient =
              loadPatients().find(
                (patient) =>
                  patient.rotationId === activeRotation.id &&
                  patient.status === "Aktif",
              ) ?? null;

            if (fallbackPatient) {
              setSelectedPatient(fallbackPatient);
            }
          }

          setReportMode(nextMode);
        }}
      />    );
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

