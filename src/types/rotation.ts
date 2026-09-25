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
  createdAt: string;
  updatedAt: string;
};
