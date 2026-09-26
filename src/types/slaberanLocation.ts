export type SlaberanLocationType = "floor" | "ward" | "special";

export type SlaberanLocation = {
  id: string;
  type: SlaberanLocationType;
  parentId?: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
