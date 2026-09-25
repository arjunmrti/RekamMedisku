import type { FollowUpEntry, SupportingExam } from "../types/followUp";

const neurologyFollowUps: FollowUpEntry[] = [
  {
    id: "fu-4",
    number: 4,
    date: "26 September 2026",
    isoDate: "2026-09-26",
    time: "09.30",
    status: "Tersimpan",
    templateType: "Neurologi",
    subjective:
      "Keluhan utama dan perkembangan kondisi pasien dicatat oleh pengguna.",
    objective:
      "Hasil observasi dan pemeriksaan yang dicatat oleh pengguna.",
    assessment:
      "Assessment yang diinput pengguna.",
    plan:
      "Rencana atau instruksi lanjutan yang diinput pengguna.",
    summary:
      "Keluhan utama dan perkembangan kondisi pasien dicatat oleh pengguna.",
  },
  {
    id: "fu-3",
    number: 3,
    date: "24 September 2026",
    isoDate: "2026-09-24",
    time: "08.40",
    status: "Tersimpan",
    subjective: "Perkembangan kondisi pasien dicatat oleh pengguna.",
    objective: "Observasi dan pemeriksaan lanjutan dicatat oleh pengguna.",
    assessment: "Assessment yang diinput pengguna.",
    plan: "Rencana lanjutan yang diinput pengguna.",
    summary: "Evaluasi progres dan catatan lanjutan tersimpan.",
  },
  {
    id: "fu-2",
    number: 2,
    date: "22 September 2026",
    isoDate: "2026-09-22",
    time: "10.15",
    status: "Draf",
    templateType: "Neurologi",
    subjective: "Keluhan saat ini yang masih dalam proses pencatatan.",
    objective: "Observasi dan pemeriksaan yang masih berupa draft.",
    assessment: "Assessment belum difinalkan.",
    plan: "Rencana tindak lanjut masih berupa draft.",
    summary: "Catatan follow-up masih dalam status draf.",
  },
  {
    id: "fu-1",
    number: 1,
    date: "18 September 2026",
    isoDate: "2026-09-18",
    time: "09.20",
    status: "Tersimpan",
    subjective: "Keluhan awal pasien dicatat oleh pengguna.",
    objective: "Pemeriksaan awal dicatat oleh pengguna.",
    assessment: "Assessment awal dicatat oleh pengguna.",
    plan: "Rencana tindak lanjut awal dicatat oleh pengguna.",
    summary: "Catatan follow-up awal pasien tersimpan.",
  },
];

const otherPatientFollowUps: FollowUpEntry[] = [
  {
    id: "fu-demo-1",
    number: 1,
    date: "25 September 2026",
    isoDate: "2026-09-25",
    time: "14.20",
    status: "Tersimpan",
    templateType: "Neurologi",
    subjective: "Keluhan dan perkembangan pasien dicatat oleh pengguna.",
    objective: "Hasil pemeriksaan dicatat oleh pengguna.",
    assessment: "Assessment yang diinput pengguna.",
    plan: "Rencana atau instruksi lanjutan yang diinput pengguna.",
    summary: "Catatan follow-up pertama tersimpan.",
  },
];

export const mockFollowUpsByPatient: Record<string, FollowUpEntry[]> = {
  "p-24012601": neurologyFollowUps,
  "p-24012602": otherPatientFollowUps,
  "p-24012603": [],
  "p-24012604": [],
  "p-24012605": [],
  "p-24012606": [],
};

export const mockFollowUps = neurologyFollowUps;

const neurologySupportingExams: SupportingExam[] = [
  { id: "exam-lab", name: "Laboratorium", date: "26 Sep 2026", icon: "lab" },
  { id: "exam-ct", name: "CT Scan", date: "25 Sep 2026", icon: "scan" },
  { id: "exam-xray", name: "Rontgen", date: "20 Sep 2026", icon: "image" },
  { id: "exam-eeg", name: "EEG", date: "18 Sep 2026", icon: "eeg" },
];

export const mockSupportingExamsByPatient: Record<string, SupportingExam[]> = {
  "p-24012601": neurologySupportingExams,
  "p-24012602": [],
  "p-24012603": [],
  "p-24012604": [],
  "p-24012605": [],
  "p-24012606": [],
};

export const mockSupportingExams = neurologySupportingExams;
