import type { FollowUpEntry } from "../types/followUp";
import type { PatientListItem } from "../types/patient";
import type { ReportTemplateType } from "../types/report";

function cleanBlock(value: string) {
  const text = value.trim();
  return text || "Belum ada catatan.";
}

export function formatReportDate(date: string) {
  return date || "Tanggal belum tersedia";
}

export function buildWhatsAppReport(
  patient: PatientListItem,
  followUp: FollowUpEntry,
  templateType: ReportTemplateType,
) {
  const exams = followUp.supportingExams ?? [];
  const planning =
    followUp.planning?.trim() ||
    followUp.plan?.trim() ||
    "Belum ada planning.";
  const instruction = followUp.instruction?.trim();

  const planBlock = [
    "P: " + planning,
    instruction ? "I: " + instruction : "",
  ]
    .filter(Boolean)
    .join("\n");

  const supportingBlock =
    exams.length > 0
      ? exams
          .map((exam) => {
            const result = exam.result?.trim();
            const attachment = exam.attachmentName?.trim();

            return [
              "- " + exam.name + " · " + exam.date,
              result ? "  " + result : "",
              attachment ? "  Lampiran: " + attachment : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n")
      : followUp.objective.includes("Hasil Penunjang:")
        ? "Data pemeriksaan penunjang mengikuti catatan pada follow-up."
        : "Belum ada pemeriksaan penunjang.";

  return [
    "Selamat pagi Dok, izin melaporkan follow-up pasien:",
    "",
    "Nama: " + patient.name,
    "Umur: " + patient.age + " tahun",
    "RM: " + patient.rm,
    "Ruangan: " + patient.room,
    "Bed: " + patient.bed,
    "DPJP: " + patient.doctor,
    "Stase: " + templateType,
    "Follow-Up #" +
      followUp.number +
      " · " +
      formatReportDate(followUp.date) +
      " · " +
      followUp.time,
    "",
    "S:",
    cleanBlock(followUp.subjective),
    "",
    "O:",
    cleanBlock(followUp.objective),
    "",
    "Pemeriksaan penunjang:",
    supportingBlock,
    "",
    "A:",
    cleanBlock(followUp.assessment),
    "",
    planBlock,
    "",
    "Mohon arahan lebih lanjut, Dok.",
    "Terima kasih.",
  ].join("\n");
}
