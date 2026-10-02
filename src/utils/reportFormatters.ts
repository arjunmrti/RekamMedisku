import type { CoreObjective } from "../types/coreObjective";
import type { SupportingExam } from "../types/followUp";
import type { FollowUpTemplateDefinition, FollowUpTemplateAnswers } from "../types/followUpTemplate";

export function formatCoreObjective(coreObjective: CoreObjective | undefined): string {
  if (!coreObjective) return "";

  const lines: string[] = [];
  const c = coreObjective;

  // GCS grouped
  const gcsEye = c.gcsEye?.trim();
  const gcsVerbal = c.gcsVerbal?.trim();
  const gcsMotor = c.gcsMotor?.trim();
  if (gcsEye || gcsVerbal || gcsMotor) {
    lines.push(`GCS E/M/V: ${gcsEye || "-"}/${gcsVerbal || "-"}/${gcsMotor || "-"}`);
  }

  if (c.generalCondition?.trim()) lines.push(`Keadaan Umum (generalCondition): ${c.generalCondition.trim()}`);
  if (c.consciousness?.trim()) lines.push(`Kesadaran: ${c.consciousness.trim()}`);

  // Vitals
  const systolic = c.systolic?.trim();
  const diastolic = c.diastolic?.trim();
  if (systolic && diastolic) {
    lines.push(`TD: ${systolic}/${diastolic} mmHg`);
  } else if (systolic || diastolic) {
    lines.push(`TD: ${systolic || "?"}/${diastolic || "?"} mmHg`);
  }

  if (c.pulse?.trim()) lines.push(`Nadi: ${c.pulse.trim()} x/menit`);
  if (c.respiratoryRate?.trim()) lines.push(`RR: ${c.respiratoryRate.trim()} x/menit`);
  if (c.temperature?.trim()) lines.push(`Suhu: ${c.temperature.trim()} °C`);
  if (c.spo2?.trim()) {
    const via = c.oxygenVia?.trim();
    lines.push(via ? `SpO₂: ${c.spo2.trim()} (${via})` : `SpO₂: ${c.spo2.trim()}`);
  }

  // Anthropometry
  if (c.weight?.trim()) lines.push(`BB: ${c.weight.trim()} kg`);
  if (c.height?.trim()) lines.push(`TB: ${c.height.trim()} cm`);
  if (c.bmi?.trim()) lines.push(`BMI: ${c.bmi.trim()}`);
  if (c.nutritionStatus?.trim()) lines.push(`Status Nutrisi: ${c.nutritionStatus.trim()}`);

  // Physical exam
  if (c.headNeck?.trim()) lines.push(`Kepala & Leher: ${c.headNeck.trim()}`);
  if (c.thorax?.trim()) lines.push(`Thoraks: ${c.thorax.trim()}`);
  if (c.abdomen?.trim()) lines.push(`Abdomen: ${c.abdomen.trim()}`);
  if (c.extremities?.trim()) lines.push(`Ekstremitas: ${c.extremities.trim()}`);
  if (c.painNrs?.trim()) lines.push(`Nyeri (NRS): ${c.painNrs.trim()}`);
  if (c.otherFindings?.trim()) lines.push(`Temuan Lain: ${c.otherFindings.trim()}`);

  return lines.join("\n");
}

export function formatTemplateAnswers(
  snapshot: FollowUpTemplateDefinition | undefined,
  answers: FollowUpTemplateAnswers | undefined,
): string {
  if (!snapshot?.sections || !answers) return "";

  const lines: string[] = [];

  for (const section of snapshot.sections) {
    const sectionLines: string[] = [];

    for (const field of section.fields) {
      const value = answers[field.id];
      if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue;

      const label = field.label.trim();
      const unit = field.unit?.trim();

      if (Array.isArray(value)) {
        sectionLines.push(`${label}: ${value.join(", ")}`);
      } else if (typeof value === "boolean") {
        sectionLines.push(`${label}: ${value ? "Ya" : "Tidak"}`);
      } else {
        const formatted = unit ? `${value} ${unit}` : String(value);
        sectionLines.push(`${label}: ${formatted}`);
      }
    }

    if (sectionLines.length > 0) {
      if (lines.length > 0) lines.push("");
      if (section.title?.trim()) lines.push(`${section.title}:`);
      lines.push(...sectionLines);
    }
  }

  return lines.join("\n");
}

export function formatSupportingExams(exams: SupportingExam[] | undefined): string {
  if (!exams || exams.length === 0) return "";

  const lines: string[] = [];

  for (const exam of exams) {
    const parts: string[] = [];
    parts.push(exam.name.trim());

    if (exam.examType?.trim()) parts.push(`(${exam.examType.trim()})`);
    if (exam.date?.trim()) parts.push(`· ${exam.date.trim()}`);

    lines.push(parts.join(" "));

    if (exam.result?.trim()) {
      lines.push(`  Hasil: ${exam.result.trim()}`);
    }

    if (exam.attachmentName?.trim()) {
      lines.push(`  Lampiran: ${exam.attachmentName.trim()}`);
    }
  }

  return lines.join("\n");
}
