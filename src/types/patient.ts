export type PatientStatus = "Aktif" | "Diarsipkan";

export type PatientListItem = {
  id: string;
  rotationId: string;
  name: string;
  age: number;
  gender: "Laki-laki" | "Perempuan";
  rm: string;
  room: string;
  bed: string;
  doctor: string;
  lastFollowUp: string;
  followUpNumber: number;
  lastFollowUpAt?: string;
  createdAt?: string;
  /** Remote updated_at used for optimistic concurrency control. */
  updatedAt?: string;
  admissionDate?: string;
  status: PatientStatus;
};
