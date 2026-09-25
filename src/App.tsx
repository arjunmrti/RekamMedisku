import { useState } from "react";
import DashboardPage from "./pages/dashboard/DashboardPage";
import PatientsPage from "./pages/patients/PatientsPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function App() {
  const [activeItem, setActiveItem] = useState("Beranda");

  const handleNavigate = (label: string) => {
    setActiveItem(label === "Pasien" ? "Daftar Pasien" : label);
  };

  const navigationProps = {
    activeItem,
    onNavigate: handleNavigate,
  };

  if (activeItem === "Daftar Pasien") {
    return <PatientsPage {...navigationProps} />;
  }

  if (activeItem === "Semua Laporan") {
    return <PlaceholderPage title="Semua Laporan" {...navigationProps} />;
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
