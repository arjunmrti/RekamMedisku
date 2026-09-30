export type RotationStatus = "Aktif" | "Selesai" | "Mendatang";

export type RotationSpecialty =
  | "Neurologi"
  | "Ilmu Penyakit Dalam"
  | "Bedah"
  | "Pediatri"
  | "Obgyn"
  | "Lainnya";

export type Rotation = {
  id: string;
  name: string;
  specialty: RotationSpecialty;
  startDate: string;
  endDate: string;
  status: RotationStatus;
  followUpTemplateId?: string;
  followUpTemplateVersion?: number;
  reportTemplateId?: string;
  reportTemplateVersion?: number;
  slaberanTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};
