export type ReportTemplateType = "Neurologi" | "Ilmu Penyakit Dalam";

export type ReportReporterProfile = {
  name: string;
  stambuk: string;
  program: string;
};

export type ReportTemplate = {
  type: ReportTemplateType;
  title: string;
  description: string;
  availableFor: ReportTemplateType;
};

export type ReportStep = 1 | 2 | 3 | 4 | 5 | 6;
