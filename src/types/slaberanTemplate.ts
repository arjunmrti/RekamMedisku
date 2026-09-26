export type SlaberanTemplateBlockType =
  | "opening"
  | "header"
  | "ward-summary"
  | "patient-list"
  | "special-unit-list"
  | "summary"
  | "divider"
  | "text";

export type SlaberanPatientField =
  | "name"
  | "age"
  | "rm"
  | "doctor"
  | "bed"
  | "diagnosis";

export type SlaberanTemplateBlock = {
  id: string;
  type: SlaberanTemplateBlockType;
  label: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

export type SlaberanTemplateRecord = {
  id: string;
  name: string;
  doctor: string;
  specialty: string;
  hospital: string;
  opening: string;
  showEmptyRooms: boolean;
  blocks: SlaberanTemplateBlock[];
  settings: Record<string, unknown>;
  schemaVersion: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SlaberanBlockFieldOption = {
  key: SlaberanPatientField;
  label: string;
  example: string;
};

export const SLABERAN_PATIENT_FIELDS: SlaberanBlockFieldOption[] = [
  { key: "name", label: "Nama", example: "Bima" },
  { key: "age", label: "Umur", example: "23 Tahun" },
  { key: "rm", label: "No. RM", example: "2012391" },
  { key: "doctor", label: "Dokter", example: "dr. Supardi" },
  { key: "bed", label: "Bed", example: "15" },
  { key: "diagnosis", label: "Diagnosis", example: "Belum ada diagnosis" },
];

export const SLABERAN_VARIABLES = [
  { key: "{{report.specialty}}", label: "Spesialisasi" },
  { key: "{{report.doctor}}", label: "Dokter" },
  { key: "{{report.hospital}}", label: "Rumah sakit" },
  { key: "{{report.date}}", label: "Tanggal laporan" },
  { key: "{{summary.doctor_count}}", label: "Jumlah pasien dokter" },
  { key: "{{summary.total_patients}}", label: "Total pasien" },
] as const;

export type SlaberanTemplateBlockConfig = {
  fields?: SlaberanPatientField[];
  showEmptyRooms?: boolean;
  highlightOccupied?: boolean;
  showDoctorCount?: boolean;
  showTotalPatients?: boolean;
  text?: string;
  separator?: string;
  showTitle?: boolean;
  showHospital?: boolean;
  showSpecialty?: boolean;
  showDoctor?: boolean;
  showDate?: boolean;
  patientSeparator?: string;
  patientPrefix?: string;
  showPatientIndex?: boolean;
  emptyText?: string;
  includeSpecialUnitPatients?: boolean;
  legacyGroups?: Array<{ label: string; rooms: string[] }>;
  legacyRooms?: string[];
};