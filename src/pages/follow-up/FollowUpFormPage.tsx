import { useEffect, useMemo, useState } from "react";
import AppShell, { type NavigationProps } from "../../components/layout/AppShell";
import AssessmentSection from "../../components/follow-up/AssessmentSection";
import ObjectiveSection from "../../components/follow-up/ObjectiveSection";
import PatientContextCard from "../../components/follow-up/PatientContextCard";
import PlanSection from "../../components/follow-up/PlanSection";
import SubjectiveSection from "../../components/follow-up/SubjectiveSection";
import SupportingExamSection from "../../components/follow-up/SupportingExamSection";
import {
  appendSavedFollowUp,
  clearFollowUpDraft,
  loadFollowUpDraft,
  loadSavedFollowUps,
  saveFollowUpDraft,
} from "../../data/localFollowUps";
import { mockFollowUpsByPatient } from "../../data/mockFollowUps";
import type { FollowUpEntry, SupportingExam } from "../../types/followUp";
import type { FollowUpFormValues } from "../../types/followUpForm";
import type { PatientListItem } from "../../types/patient";
import Icon from "../../components/ui/Icon";

type FollowUpFormPageProps = NavigationProps & {
  patient: PatientListItem;
};

type SectionKey =
  | "subjective"
  | "objective"
  | "supportingExams"
  | "assessment"
  | "plan";

const emptyForm = (): FollowUpFormValues => ({
  followUpDate: "2026-09-26",
  followUpTime: "09:30",
  subjective: {
    keluhan: "",
    riwayatKeluhanSerupa: "",
    pastHistory: "",
    medicationHistory: "",
    allergies: "",
    otherHistory: "",
  },
  objective: {
    generalCondition: "",
    systolic: "",
    diastolic: "",
    pulse: "",
    respiratoryRate: "",
    temperature: "",
    spo2: "",
    oxygenVia: "",
    painNrs: "",
    physicalFindings: "",
    supportingExamText: "",
  },
  neurology: {
    generalCondition: "",
    consciousness: "",
    gcsEye: "",
    gcsMotor: "",
    gcsVerbal: "",
    fkl: "",
    cranialNerve: "",
    pupil: "",
    neckStiffness: "",
    brudzinski: "",
    kernig: "",
    movement: "",
    tone: "",
    sensory: "",
    upperStrength: "",
    lowerStrength: "",
    physiologicReflex: "",
    pathologicReflex: "",
    autonomic: "",
    provocation: "",
  },
  internalMedicine: {
    generalCondition: "",
    consciousness: "",
    headNeck: "",
    thorax: "",
    abdomen: "",
    extremities: "",
    relevantSystemicFindings: "",
  },
  supportingExams: [],
  assessments: [""],
  assessmentCodes: [],
  planning: "",
  instruction: "",
});function buildFollowUpEntry(
  values: FollowUpFormValues,
  number: number,
): FollowUpEntry {
  const subjective = [
    "Keluhan: " + values.subjective.keluhan,
    "Riwayat Keluhan Serupa: " + values.subjective.riwayatKeluhanSerupa,
    "RPD: " + values.subjective.pastHistory,
    "RPO: " + values.subjective.medicationHistory,
    "Riwayat Alergi: " + values.subjective.allergies,
    "Riwayat Lain-lain: " + values.subjective.otherHistory,
  ]
    .filter((item) => !item.endsWith(": "))
    .join("\n");

  const gcs = [values.neurology.gcsEye, values.neurology.gcsMotor, values.neurology.gcsVerbal]
    .every(Boolean)
    ? values.neurology.gcsEye + values.neurology.gcsMotor + values.neurology.gcsVerbal
    : "";

  const objective = [
    "Keadaan Umum: " + values.objective.generalCondition,
    "TD: " + values.objective.systolic + "/" + values.objective.diastolic + " mmHg",
    "Nadi: " + values.objective.pulse + " x/menit",
    "RR: " + values.objective.respiratoryRate + " x/menit",
    "Suhu: " + values.objective.temperature + " °C",
    "SpO₂: " + values.objective.spo2 + "%",
    "Oksigen via: " + values.objective.oxygenVia,
    "NRS: " + values.objective.painNrs,
    "Pemeriksaan/Temuan Fisik: " + values.objective.physicalFindings,
    "GCS E/M/V: " + gcs,
    "FKL: " + values.neurology.fkl,
    "N. Cranialis: " + values.neurology.cranialNerve,
    "Pupil: " + values.neurology.pupil,
    "Kaku Kuduk: " + values.neurology.neckStiffness,
    "Brudzinski I & II: " + values.neurology.brudzinski,
    "Kernig: " + values.neurology.kernig,
    "Pergerakan: " + values.neurology.movement,
    "Tonus: " + values.neurology.tone,
    "Sensorik: " + values.neurology.sensory,
    "Kekuatan Ekstremitas Superior: " + values.neurology.upperStrength,
    "Kekuatan Ekstremitas Inferior: " + values.neurology.lowerStrength,
    "Refleks Fisiologis: " + values.neurology.physiologicReflex,
    "Refleks Patologis: " + values.neurology.pathologicReflex,
    "Otonom BAB/BAK: " + values.neurology.autonomic,
    "Tes Provokasi Saraf: " + values.neurology.provocation,
    "Hasil Penunjang: " + values.objective.supportingExamText,
  ]
    .filter((item) => !item.endsWith(": "))
    .join("\n");

  const assessment = values.assessments.filter((item) => item.trim()).join("\n");

  const supportingExams: SupportingExam[] = values.supportingExams.map((exam) => ({
    id: exam.id,
    name: exam.examType,
    examType: exam.examType,
    date: formatDate(exam.date),
    result: exam.result,
    attachmentName: exam.attachmentName,
    icon:
      exam.examType === "CT Scan"
        ? "scan"
        : exam.examType === "Rontgen"
          ? "image"
          : exam.examType === "EEG"
            ? "eeg"
            : "lab",
  }));

  return {
    id: "fu-" + Date.now(),
    number,
    date: formatDate(values.followUpDate),
    isoDate: values.followUpDate,
    time: formatTime(values.followUpTime),
    status: "Tersimpan",
    templateType: "Neurologi",
    assessmentCodes: values.assessmentCodes,
    planning: values.planning,
    instruction: values.instruction,
    subjective,
    objective,
    assessment,
    plan: values.instruction,
    summary: values.subjective.keluhan || "Follow-up baru tersimpan.",
    supportingExams,
  };
}}