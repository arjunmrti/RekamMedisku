export type SupportingExamForm = {
  id: string;
  examType: string;
  date: string;
  result: string;
  attachmentName: string;
};

export type NeurologyFormValues = {
  gcs: string;
  pupil: string;
  motoric: string;
  sensory: string;
  reflex: string;
  cranialNerve: string;
  neurologicalStatus: string;
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
    chiefComplaint: string;
    currentComplaints: string;
    presentIllness: string;
    pastHistory: string;
    medicationHistory: string;
    allergies: string;
    other: string;
  };
  objective: {
    bloodPressure: string;
    pulse: string;
    respiratoryRate: string;
    temperature: string;
    spo2: string;
    physicalExam: string;
  };
  neurology: NeurologyFormValues;
  internalMedicine: InternalMedicineFormValues;
  supportingExams: SupportingExamForm[];
  assessments: string[];
  plan: string;
};