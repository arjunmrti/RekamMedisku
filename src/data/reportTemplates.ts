import type { ReportTemplate } from "../types/report";

export const reportTemplates: ReportTemplate[] = [
  {
    type: "Neurologi",
    title: "Laporan Follow-Up Neurologi",
    description: "Format laporan untuk follow-up pada stase Neurologi.",
    availableFor: "Neurologi",
  },
  {
    type: "Ilmu Penyakit Dalam",
    title: "Laporan Follow-Up Penyakit Dalam",
    description: "Format laporan untuk follow-up pada stase Ilmu Penyakit Dalam.",
    availableFor: "Ilmu Penyakit Dalam",
  },
];
