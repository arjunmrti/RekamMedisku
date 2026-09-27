import type { IconName } from "../components/ui/Icon";
import type { ReportMode } from "../types/report";

export type ReportHubMode = Exclude<ReportMode, "hub">;

export type ReportHubCatalogItem = {
  mode: ReportHubMode;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: IconName;
  featured?: boolean;
};

export const REPORT_HUB_CATALOG: ReportHubCatalogItem[] = [
  {
    mode: "follow-up",
    badge: "Follow-Up",
    title: "Laporan Follow-Up",
    description:
      "Ubah follow-up pasien yang sudah tersimpan menjadi laporan yang siap ditinjau, diedit, dan disalin.",
    actionLabel: "Buat Laporan Follow-Up",
    icon: "document",
  },
  {
    mode: "slaberan",
    badge: "Slaberan",
    title: "Buat Slaberan",
    description:
      "Generate laporan harian dari template dokter, pasien aktif, lokasi, dan follow-up yang sudah tersimpan.",
    actionLabel: "Buka Slaberan",
    icon: "layers",
    featured: true,
  },
];
