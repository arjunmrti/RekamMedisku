export type SlaberanTemplateBlockType =
  | "opening"
  | "header"
  | "ward-summary"
  | "patient-list"
  | "special-unit-list"
  | "summary"
  | "divider"
  | "text";

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
