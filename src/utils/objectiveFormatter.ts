import type { FollowUpFormValues } from "../types/followUpForm";

type BasicObjective = FollowUpFormValues["objective"];

function clean(value: string) {
  return value.trim();
}

function withUnit(label: string, value: string, unit: string) {
  const normalized = clean(value);
  return normalized ? label + ": " + normalized + (unit ? " " + unit : "") : "";
}

export function buildBasicObjectiveLines(objective: BasicObjective): string[] {
  const lines: string[] = [];

  const generalCondition = clean(objective.generalCondition);
  if (generalCondition) {
    lines.push("Keadaan Umum: " + generalCondition);
  }

  const systolic = clean(objective.systolic);
  const diastolic = clean(objective.diastolic);

  if (systolic && diastolic) {
    lines.push("TD: " + systolic + "/" + diastolic + " mmHg");
  } else if (systolic) {
    lines.push("TD Sistol: " + systolic + " mmHg");
  } else if (diastolic) {
    lines.push("TD Diastol: " + diastolic + " mmHg");
  }

  const vitalFields: Array<[keyof BasicObjective, string, string]> = [
    ["pulse", "Nadi", "x/menit"],
    ["respiratoryRate", "RR", "x/menit"],
    ["temperature", "Suhu", "°C"],
    ["spo2", "SpO₂", "%"],
    ["oxygenVia", "Oksigen via", ""],
    ["painNrs", "NRS", ""],
  ];

  for (const [key, label, unit] of vitalFields) {
    const line = withUnit(label, objective[key], unit);
    if (line) lines.push(line);
  }

  const physicalFindings = clean(objective.physicalFindings);
  if (physicalFindings) {
    lines.push("Pemeriksaan/Temuan Fisik: " + physicalFindings);
  }

  const supportingExamText = clean(objective.supportingExamText);
  if (supportingExamText) {
    lines.push("Hasil Penunjang: " + supportingExamText);
  }

  return lines;
}
