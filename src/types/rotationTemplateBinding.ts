import type { FollowUpTemplateFieldType } from "./followUpTemplate";

export type RotationTemplateBindingDocumentType = "follow_up" | "report";

export type RotationTemplateBinding = {
  id: string;
  userId: string;
  rotationId: string;
  templateId: string;
  templateVersion: number;
  documentType: RotationTemplateBindingDocumentType;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RotationTemplateBindingInput = {
  id?: string;
  rotationId: string;
  documentType: RotationTemplateBindingDocumentType;
  templateId: string;
  templateVersion: number;
  isDefault?: boolean;
  sortOrder?: number;
  expectedUpdatedAt?: string;
};
