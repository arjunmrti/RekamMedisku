import type { FollowUpEntry, SupportingExam } from "../types/followUp";

export const mockFollowUps: FollowUpEntry[] = [
  {
    id: "fu-4",
    number: 4,
    date: "26 September 2026",
    isoDate: "2026-09-26",
    time: "09.30",
    status: "Tersimpan",
    subjective:
      "Keluhan utama: kelemahan ekstremitas kanan sejak 3 hari yang lalu memberat mendadak saat beraktivitas pagi. Pasien juga mengeluhkan bicara pelo ringan.",
    objective:
      "Kesadaran compos mentis, GCS 15 (E4M6V5), TD 140/90 mmHg, HR 82x/m, RR 18x/m, Tax 36.6°C. Motorik ekstremitas kanan 4/5, ekstremitas kiri 5/5. Refleks fisiologis biseps/triseps +2/+2.",
    assessment: "Suspek stroke iskemik (dd: TIA)",
    plan:
      "CT Scan kepala non-kontras, kontrol vital sign per 4 jam, cek laboratorium rutin lengkap, terapi medikamentosa antiplatelet dan neuroprotektor sesuai instruksi DPJP.",
    summary:
      "Keluhan utama: kelemahan ekstremitas kanan ...",
  },
  {
    id: "fu-3",
    number: 3,
    date: "24 September 2026",
    isoDate: "2026-09-24",
    time: "08.40",
    status: "Tersimpan",
    subjective: "Evaluasi progres kondisi pasien.",
    objective: "Pemeriksaan lanjutan dicatat pada kunjungan.",
    assessment: "Evaluasi progres.",
    plan: "Lanjutkan terapi sesuai instruksi DPJP.",
    summary: "Evaluasi progres, lanjutkan terapi ...",
  },
  {
    id: "fu-2",
    number: 2,
    date: "22 September 2026",
    isoDate: "2026-09-22",
    time: "10.15",
    status: "Draf",
    subjective: "Pasien masih mengeluh pusing.",
    objective: "Observasi dan pemeriksaan dicatat.",
    assessment: "Assessment belum difinalkan.",
    plan: "Rencana tindak lanjut masih berupa draft.",
    summary: "Pasien masih mengeluh pusing ...",
  },
  {
    id: "fu-1",
    number: 1,
    date: "18 September 2026",
    isoDate: "2026-09-18",
    time: "09.20",
    status: "Tersimpan",
    subjective: "Keluhan awal pasien dicatat.",
    objective: "Dilakukan pemeriksaan awal.",
    assessment: "Assessment awal dicatat.",
    plan: "Rencana tindak lanjut awal dicatat.",
    summary: "Keluhan awal, dilakukan pemeriksaan ...",
  },
];

export const mockSupportingExams: SupportingExam[] = [
  { id: "exam-lab", name: "Laboratorium", date: "26 Sep 2026", icon: "lab" },
  { id: "exam-ct", name: "CT Scan", date: "25 Sep 2026", icon: "scan" },
  { id: "exam-xray", name: "Rontgen", date: "20 Sep 2026", icon: "image" },
  { id: "exam-eeg", name: "EEG", date: "18 Sep 2026", icon: "eeg" },
];
