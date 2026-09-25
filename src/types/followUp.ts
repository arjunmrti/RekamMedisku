export type FollowUpStatus = "Tersimpan" | "Draf";

export type SupportingExam = {
  id: string;
  name: string;
  examType?: string;
  date: string;
  result?: string;
  attachmentName?: string;
  attachmentCount?: number;
  icon: "lab" | "scan" | "image" | "eeg";
};

export type FollowUpEntry = {
  id: string;
  number: number;
  date: string;
  isoDate: string;
  time: string;
  status: FollowUpStatus;
  templateType?: "Neurologi" | "Ilmu Penyakit Dalam";
  assessmentCodes?: string[];
  planning?: string;
  instruction?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summary: string;
  supportingExams?: SupportingExam[];
};