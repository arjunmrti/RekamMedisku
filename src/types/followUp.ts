export type FollowUpStatus = "Tersimpan" | "Draf";

export type FollowUpEntry = {
  id: string;
  number: number;
  date: string;
  isoDate: string;
  time: string;
  status: FollowUpStatus;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summary: string;
};

export type SupportingExam = {
  id: string;
  name: string;
  date: string;
  icon: "lab" | "scan" | "image" | "eeg";
};
