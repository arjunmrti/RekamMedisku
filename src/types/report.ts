export type ReportMode = "hub" | "follow-up" | "slaberan";

export type ReportTemplateType = string;

export type ReportTemplate = {
  type: ReportTemplateType;
  title: string;
  description: string;
  availableFor: string | null;
};

export type ReportStep = 1 | 2 | 3 | 4 | 5 | 6;
