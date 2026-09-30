import type { ReportTemplateDefinition } from "../types/reportTemplate";

export const DEFAULT_REPORT_TEMPLATE_DEFINITION: ReportTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "opening",
      title: "",
      blocks: [
        {
          id: "introduction",
          type: "value",
          source: "identity.report_introduction",
        },
      ],
    },
    {
      id: "patient",
      title: "Identitas Pasien",
      blocks: [
        { id: "name", type: "value", source: "patient.name", label: "Nama" },
        { id: "age", type: "value", source: "patient.age", label: "Umur", },
        { id: "gender", type: "value", source: "patient.gender", label: "Jenis Kelamin" },
        { id: "rm", type: "value", source: "patient.rm", label: "RM" },
        { id: "room", type: "value", source: "patient.room", label: "Ruangan" },
        { id: "bed", type: "value", source: "patient.bed", label: "Bed" },
        { id: "doctor", type: "value", source: "patient.doctor", label: "DPJP" },
        { id: "rotation", type: "value", source: "rotation.name", label: "Stase" },
        { id: "admission-date", type: "value", source: "patient.admission_date", label: "Tanggal Masuk" },
        { id: "follow-up-date", type: "value", source: "follow_up.date", label: "Tanggal Follow-Up" },
      ],
    },
    {
      id: "subjective",
      title: "S:",
      blocks: [
        {
          id: "admission-complaint",
          type: "value",
          source: "patient.admission_complaint",
          label: "Keluhan Masuk",
        },
        {
          id: "subjective",
          type: "value",
          source: "follow_up.subjective",
          label: "Keluhan / Perkembangan Hari Ini",
        },
      ],
    },
    {
      id: "objective",
      title: "O:",
      blocks: [
        {
          id: "objective",
          type: "value",
          source: "follow_up.objective",
          emptyText: "Belum ada catatan.",
        },
        {
          id: "template-answers",
          type: "template_answers",
          title: "Data Template Follow-Up",
          emptyText: "Belum ada jawaban template.",
        },
      ],
    },
    {
      id: "supporting-exams",
      title: "Pemeriksaan penunjang:",
      blocks: [
        {
          id: "supporting-exams",
          type: "supporting_exams",
          emptyText: "Belum ada pemeriksaan penunjang.",
          includeAttachments: true,
        },
      ],
    },
    {
      id: "assessment",
      title: "A:",
      blocks: [
        {
          id: "assessment",
          type: "value",
          source: "follow_up.assessment",
        },
      ],
    },
    {
      id: "plan",
      title: "",
      blocks: [
        {
          id: "planning",
          type: "value",
          source: "follow_up.planning",
          label: "P",
        },
        {
          id: "instruction",
          type: "value",
          source: "follow_up.instruction",
          label: "I",
        },
      ],
    },
    {
      id: "closing",
      title: "",
      blocks: [
        {
          id: "closing-text",
          type: "text",
          text: "Terimakasih sebelumnya dokter, Mohon arahan dan bimbingannya dok🙏🏻",
        },
      ],
    },
  ],
};
