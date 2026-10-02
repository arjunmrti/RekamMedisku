import type {
  FollowUpTemplateAnswers,
  FollowUpTemplateDefinition,
} from "./followUpTemplate";
import type { CoreObjective } from "./coreObjective";


export type SupportingExamForm = {
  id: string;
  examType: string;
  date: string;
  result: string;
  attachmentName: string;
  attachmentId?: string;
  /** Legacy field kept so existing local data can still be opened. */
  attachmentDataUrl?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

export type NeurologyFormValues = {
  generalCondition: string;
  consciousness: string;
  gcsEye: string;
  gcsMotor: string;
  gcsVerbal: string;
  fkl: string;
  cranialNerve: string;
  pupil: string;
  neckStiffness: string;
  brudzinski: string;
  kernig: string;
  movement: string;
  tone: string;
  sensory: string;
  upperStrength: string;
  lowerStrength: string;
  physiologicReflex: string;
  pathologicReflex: string;
  autonomic: string;
  provocation: string;
};

export type InternalMedicineFormValues = {
  generalCondition: string;
  consciousness: string;
  headNeck: string;
  thorax: string;
  abdomen: string;
  extremities: string;
  relevantSystemicFindings: string;
};

export type FollowUpFormValues = {
  /** Local workspace context for this draft. */
  rotationId?: string;
  /** Template selected for the draft; persisted with the follow-up at save time. */
  templateId?: string;
  templateVersion?: number;
  templateSchemaVersion?: number;
  templateSnapshot?: FollowUpTemplateDefinition;
  templateAnswers?: FollowUpTemplateAnswers;
  followUpDate: string;
  followUpTime: string;
  subjective: {
    keluhan: string;
    riwayatKeluhanSerupa: string;
    pastHistory: string;
    medicationHistory: string;
    allergies: string;
    otherHistory: string;
  };
  objective: {
    generalCondition: string;
    systolic: string;
    diastolic: string;
    pulse: string;
    respiratoryRate: string;
    temperature: string;
    spo2: string;
    oxygenVia: string;
    painNrs: string;
    physicalFindings: string;
    supportingExamText: string;
  };
  neurology: NeurologyFormValues;
  internalMedicine: InternalMedicineFormValues;
  supportingExams: SupportingExamForm[];
  assessments: string[];
  assessmentCodes: string[];
  planning: string;
  instruction: string;
  coreObjective?: CoreObjective;
};
