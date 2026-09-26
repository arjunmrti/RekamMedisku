export type SlaberanLocationGroup = {
  label: string;
  rooms: string[];
};

export type SlaberanTemplate = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  opening: string;
  showEmptyRooms: boolean;
  locationGroups: SlaberanLocationGroup[];
  specialRooms: string[];
};

export type SlaberanReportOptions = {
  doctor: string;
  date: string;
  patients: import("./patient").PatientListItem[];
  followUpsByPatient: Record<
    string,
    import("./followUp").FollowUpEntry[]
  >;
};
