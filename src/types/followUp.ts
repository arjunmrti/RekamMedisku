import type { FollowUpTemplateDefinition } from "./followUpTemplate";

export type FollowUpStatus = "Tersimpan" | "Draf";

export type SupportingExam = {
  id: string;
  name: string;
  examType?: string;
  date: string;
  /** Original ISO date kept for reliable Supabase date synchronization. */
  isoDate?: string;
  result?: string;
  attachmentName?: string;
  attachmentId?: string;
  /** Legacy field kept so existing local data can still be opened. */
  attachmentDataUrl?: string;
  attachmentType?: string;
  attachmentSize?: number;
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
  /** Remote updated_at used for optimistic concurrency control. */
  updatedAt?: string;
  templateType?: "Neurologi" | "Ilmu Penyakit Dalam";
  /** User-owned follow-up template pinned when this entry was saved. */
  templateId?: string;
  /** Immutable user-facing version pinned by this follow-up. */
  templateVersion?: number;
  /** Definition schema version of the pinned template snapshot. */
  templateSchemaVersion?: number;
  /** Exact template definition used when this follow-up was saved. */
  templateSnapshot?: FollowUpTemplateDefinition;
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
