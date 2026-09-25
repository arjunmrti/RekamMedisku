export type Patient = {
  name: string;
  rm: string;
  room: string;
  bed: string;
  doctor: string;
  lastFollowUp: string;
  status: "Aktif" | "Diarsipkan";
};
