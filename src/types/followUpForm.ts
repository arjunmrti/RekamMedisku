export type SupportingExamForm = {
  id: string;
  examType: string;
  date: string;
  result: string;
  attachmentName: string;
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
};