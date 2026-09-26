export type PatientStatus = "Aktif" | "Diarsipkan";

export type PatientLocationType = "ward" | "special";

export type PatientLocation = {
  type: PatientLocationType;
  name: string;
  bed: string;
};

export type PatientAdmissionLocation = {
  type: PatientLocationType;
  name: string;
};

export type PatientListItem = {
  id: string;
  rotationId: string;
  name: string;
  age: number;
  gender: "Laki-laki" | "Perempuan";
  /** Legacy room field kept for backward compatibility with existing UI/data. */
  room: string;
  /** Current patient location used by the next Slaberan location model. */
  currentLocation?: PatientLocation;
  /** Optional place where the patient first entered the hospital. */
  admissionLocation?: PatientAdmissionLocation;
  bed: string;
  rm: string;
  doctor: string;
  lastFollowUp: string;
  followUpNumber: number;
  lastFollowUpAt?: string;
  /** Remote updated_at used for optimistic concurrency control. */
  updatedAt?: string;
  createdAt?: string;
  admissionDate?: string;
  /** Initial presenting complaint recorded as persistent patient context. */
  admissionComplaint?: string;
  status: PatientStatus;
};
