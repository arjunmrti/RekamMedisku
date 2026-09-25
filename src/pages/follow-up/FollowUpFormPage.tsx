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
import { loadActiveRotation } from "../../data/localRotations";
import { updatePatient } from "../../data/localPatients";
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

function emptyForm(): FollowUpFormValues {
  return {
    followUpDate: getTodayIsoDate(),
    followUpTime: getCurrentTime(),
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
  };
}

function getInitialValues(patientId: string) {
  const draft = loadFollowUpDraft(patientId);

  if (
    draft &&
    "keluhan" in draft.subjective &&
    "planning" in draft &&
    "instruction" in draft
  ) {
    return draft;
  }

  return emptyForm();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  if (!value) return "Tanggal belum diisi";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value + "T00:00:00"));
}

function formatTime(value: string) {
  return value ? value.replace(":", ".") : "—";
}

function countFilled(values: Record<string, unknown>) {
  return Object.values(values).filter((value) =>
    typeof value === "string" ? value.trim().length > 0 : Boolean(value),
  ).length;
}

function buildFollowUpEntry(
  values: FollowUpFormValues,
  number: number,
  templateType: FollowUpEntry["templateType"],
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

  const gcs = [
    values.neurology.gcsEye,
    values.neurology.gcsMotor,
    values.neurology.gcsVerbal,
  ].every(Boolean)
    ? values.neurology.gcsEye +
      values.neurology.gcsMotor +
      values.neurology.gcsVerbal
    : "";

  const templateObjective =
    templateType === "Ilmu Penyakit Dalam"
      ? [
          "Keadaan Umum: " + values.internalMedicine.generalCondition,
          "Kesadaran: " + values.internalMedicine.consciousness,
          "Kepala & Leher: " + values.internalMedicine.headNeck,
          "Thoraks: " + values.internalMedicine.thorax,
          "Abdomen: " + values.internalMedicine.abdomen,
          "Ekstremitas: " + values.internalMedicine.extremities,
          "Temuan Sistemik Relevan: " +
            values.internalMedicine.relevantSystemicFindings,
        ]
      : [
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
        ];

  const objective = [
    "Keadaan Umum: " + values.objective.generalCondition,
    "TD: " +
      values.objective.systolic +
      "/" +
      values.objective.diastolic +
      " mmHg",
    "Nadi: " + values.objective.pulse + " x/menit",
    "RR: " + values.objective.respiratoryRate + " x/menit",
    "Suhu: " + values.objective.temperature + " °C",
    "SpO₂: " + values.objective.spo2 + "%",
    "Oksigen via: " + values.objective.oxygenVia,
    "NRS: " + values.objective.painNrs,
    "Pemeriksaan/Temuan Fisik: " + values.objective.physicalFindings,
    ...templateObjective,
    "Hasil Penunjang: " + values.objective.supportingExamText,
  ]
    .filter((item) => !item.endsWith(": "))
    .join("\n");

  const assessment = values.assessments
    .filter((item) => item.trim())
    .join("\n");

  const supportingExams: SupportingExam[] = values.supportingExams.map(
    (exam) => ({
      id: exam.id,
      name: exam.examType,
      examType: exam.examType,
      date: formatDate(exam.date),
      result: exam.result,
      attachmentName: exam.attachmentName,
      attachmentDataUrl: exam.attachmentDataUrl,
      attachmentType: exam.attachmentType,
      attachmentSize: exam.attachmentSize,
      icon:
        exam.examType === "CT Scan"
          ? "scan"
          : exam.examType === "Rontgen"
            ? "image"
            : exam.examType === "EEG"
              ? "eeg"
              : "lab",
    }),
  );

  return {
    id: "fu-" + Date.now(),
    number,
    date: formatDate(values.followUpDate),
    isoDate: values.followUpDate,
    time: formatTime(values.followUpTime),
    status: "Tersimpan",
    templateType,
    assessmentCodes: values.assessmentCodes,
    planning: values.planning,
    instruction: values.instruction,
    subjective,
    objective,
    assessment,
    plan: [
      values.planning ? "P/: " + values.planning : "",
      values.instruction ? "I/: " + values.instruction : "",
    ]
      .filter(Boolean)
      .join("\n"),
    summary: values.subjective.keluhan || "Follow-up baru tersimpan.",
    supportingExams,
  };
}

export default function FollowUpFormPage({
  activeItem,
  onNavigate,
  patient,
}: FollowUpFormPageProps) {
  const activeRotation = loadActiveRotation();
  const templateAvailable =
    activeRotation.specialty === "Neurologi" ||
    activeRotation.specialty === "Ilmu Penyakit Dalam";
  const templateType: FollowUpEntry["templateType"] =
    activeRotation.specialty === "Ilmu Penyakit Dalam"
      ? "Ilmu Penyakit Dalam"
      : "Neurologi";

  const [values, setValues] = useState<FollowUpFormValues>(() =>
    getInitialValues(patient.id),
  );
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState(
    loadFollowUpDraft(patient.id)
      ? "Draf sebelumnya tersedia."
      : "Belum ada perubahan tersimpan.",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [openSections, setOpenSections] =
    useState<Record<SectionKey, boolean>>({
      subjective: true,
      objective: true,
      supportingExams: true,
      assessment: true,
      plan: true,
    });

  const previousFollowUps = useMemo(() => {
    const local = loadSavedFollowUps()[patient.id] ?? [];
    const mock = mockFollowUpsByPatient[patient.id] ?? [];
    const seen = new Set<string>();

    return [...local, ...mock]
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .sort((a, b) =>
        (b.isoDate + b.time).localeCompare(a.isoDate + a.time),
      );
  }, [patient.id]);

  const latestFollowUp = previousFollowUps[0] ?? null;

  const sectionStats = useMemo(() => {
    const subjectiveFilled = countFilled(values.subjective);
    const templateFilled =
      templateType === "Ilmu Penyakit Dalam"
        ? countFilled(values.internalMedicine)
        : countFilled(values.neurology);
    const objectiveFilled = countFilled(values.objective) + templateFilled;
    const assessmentFilled = values.assessments.filter((item) =>
      item.trim(),
    ).length;
    const planFilled = [values.planning, values.instruction].filter((item) =>
      item.trim(),
    ).length;
    const supportingFilled = values.supportingExams.length > 0 ? 1 : 0;

    const stats = {
      subjective: {
        filled: subjectiveFilled,
        total: Object.keys(values.subjective).length,
      },
      objective: {
        filled: objectiveFilled,
        total:
          Object.keys(values.objective).length +
          (templateType === "Ilmu Penyakit Dalam"
            ? Object.keys(values.internalMedicine).length
            : Object.keys(values.neurology).length),
      },
      supportingExams: { filled: supportingFilled, total: 1 },
      assessment: {
        filled: assessmentFilled,
        total: Math.max(1, values.assessments.length),
      },
      plan: { filled: planFilled, total: 2 },
    };

    const filled = Object.values(stats).reduce(
      (sum, stat) => sum + stat.filled,
      0,
    );
    const total = Object.values(stats).reduce(
      (sum, stat) => sum + stat.total,
      0,
    );

    return {
      stats,
      filled,
      total,
      percent: total ? Math.round((filled / total) * 100) : 0,
    };
  }, [templateType, values]);

  const sectionNav: Array<{
    key: SectionKey;
    label: string;
    number: string;
  }> = [
    { key: "subjective", label: "Subjective", number: "01" },
    { key: "objective", label: "Objective", number: "02" },
    { key: "supportingExams", label: "Penunjang", number: "03" },
    { key: "assessment", label: "Assessment", number: "04" },
    { key: "plan", label: "P & I", number: "05" },
  ];

  const jumpToSection = (section: SectionKey) => {
    setOpenSections((current) => ({ ...current, [section]: true }));
    window.requestAnimationFrame(() => {
      document
        .getElementById("follow-up-section-" + section)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!dirty) return;

    const timer = window.setTimeout(() => {
      saveFollowUpDraft(patient.id, values);
      setSaveMessage(
        "Draf tersimpan otomatis pukul " +
          new Intl.DateTimeFormat("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date()),
      );
      setDirty(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [dirty, patient.id, values]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const updateValues = (next: FollowUpFormValues) => {
    setValues(next);
    setDirty(true);
    setSaveMessage("Perubahan belum disimpan.");
    setErrorMessage("");
  };

  const toggleSection = (section: SectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const canLeave = () => {
    if (!dirty) return true;
    return window.confirm(
      "Ada perubahan yang belum disimpan. Tetap tinggalkan form?",
    );
  };

  const guardedNavigate = (label: string) => {
    if (canLeave()) {
      onNavigate(label);
    }
  };

  const handleSaveDraft = () => {
    saveFollowUpDraft(patient.id, values);
    setDirty(false);
    setSaveMessage(
      "Draf tersimpan pukul " +
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
    );
    setErrorMessage("");
  };

  const handleSaveFollowUp = () => {
    if (!values.subjective.keluhan.trim()) {
      setErrorMessage(
        "Keluhan Pagi Ini wajib diisi sebelum follow-up disimpan.",
      );
      setOpenSections((current) => ({ ...current, subjective: true }));
      return;
    }

    if (!values.followUpDate || !values.followUpTime) {
      setErrorMessage("Tanggal dan waktu follow-up wajib diisi.");
      return;
    }

    const nextNumber =
      Math.max(0, ...previousFollowUps.map((entry) => entry.number)) + 1;
    const entry = buildFollowUpEntry(values, nextNumber, templateType);

    updatePatient(patient.id, {
      lastFollowUp: entry.date + " · " + entry.time,
      followUpNumber: entry.number,
      lastFollowUpAt:
        entry.isoDate + "T" + entry.time.replace(".", ":") + ":00",
    });
    appendSavedFollowUp(patient.id, entry);
    clearFollowUpDraft(patient.id);
    setDirty(false);
    setErrorMessage("");
    setSaveMessage("✓ Follow-up berhasil disimpan.");

    window.setTimeout(() => {
      onNavigate("Profil Pasien");
    }, 600);
  };

  if (!templateAvailable) {
    return (
      <AppShell
        activeItem={activeItem}
        onNavigate={onNavigate}
        searchValue=""
        onSearchChange={() => undefined}
        searchEnabled={false}
      >
        <main className="flex flex-1 items-center justify-center px-4 py-10 pb-24">
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_-30px_rgba(16,42,86,0.24)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
              <Icon name="document" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Template Belum Tersedia
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Follow-Up {activeRotation.name} belum didukung
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              MVP RekamMedisku saat ini menyediakan template klinis untuk
              Neurologi dan Ilmu Penyakit Dalam. Data stase lain tetap dapat
              disimpan sebagai rotasi tanpa menghapus riwayat.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("Stase Saya")}
              className="mt-6 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700"
            >
              Kembali ke Stase
            </button>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={guardedNavigate}
      searchValue=""
      onSearchChange={() => undefined}
      searchEnabled={false}
    >
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 items-start xl:grid-cols-[minmax(0,1040px)_320px]">
          <main className="min-w-0 space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => guardedNavigate("Profil Pasien")}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#1677FF] transition hover:text-blue-700"
              >
                <span aria-hidden="true">←</span>
                Kembali ke Profil Pasien
              </button>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Follow-Up Baru
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Catat perkembangan pasien berdasarkan temuan follow-up pada
                    tanggal ini.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 sm:px-4 sm:text-xs"
                  >
                    Simpan Draf
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFollowUp}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1677FF] px-3 py-2.5 text-[11px] font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:px-4 sm:text-xs"
                  >
                    <span className="text-sm">✓</span>
                    Simpan Follow-Up
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_8px_30px_-18px_rgba(22,119,255,0.25)]">
              <div className="bg-gradient-to-r from-[#F4F9FF] via-white to-white px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#1677FF]">
                      <Icon name="document" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                        Workspace Follow-Up
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                        {sectionStats.filled} field terisi dari {sectionStats.total}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 lg:w-[320px]">
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      <span className="font-semibold text-slate-500">
                        Progress pengisian
                      </span>
                      <span className="font-bold text-[#1677FF]">
                        {sectionStats.percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#1677FF] transition-[width] duration-500 ease-out"
                        style={{ width: sectionStats.percent + "%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4">
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {sectionNav.map((item) => {
                    const stat = sectionStats.stats[item.key];
                    const isOpen = openSections[item.key];

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => jumpToSection(item.key)}
                        className={
                          "group flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition " +
                          (isOpen
                            ? "border-blue-200 bg-blue-50 text-[#1677FF]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-blue-100 hover:bg-blue-50/50")
                        }
                      >
                        <span
                          className={
                            "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold " +
                            (stat.filled > 0
                              ? "bg-blue-100 text-[#1677FF]"
                              : "bg-slate-100 text-slate-400")
                          }
                        >
                          {item.number}
                        </span>
                        <span>
                          <span className="block text-[11px] font-bold">
                            {item.label}
                          </span>
                          <span className="block text-[9px] font-medium text-slate-400">
                            {stat.filled}/{stat.total} terisi
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <PatientContextCard
              patient={patient}
              date={values.followUpDate}
              time={values.followUpTime}
              onDateChange={(followUpDate) =>
                updateValues({ ...values, followUpDate })
              }
              onTimeChange={(followUpTime) =>
                updateValues({ ...values, followUpTime })
              }
            />

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="space-y-4">
              <div
                id="follow-up-section-subjective"
                className="scroll-mt-24 transition-all duration-300"
              >
                <SubjectiveSection
                  open={openSections.subjective}
                  onToggle={() => toggleSection("subjective")}
                  value={values.subjective}
                  onChange={(subjective) =>
                    updateValues({ ...values, subjective })
                  }
                />
              </div>

              <div
                id="follow-up-section-objective"
                className="scroll-mt-24 transition-all duration-300"
              >
                <ObjectiveSection
                  open={openSections.objective}
                  onToggle={() => toggleSection("objective")}
                  objective={values.objective}
                  neurology={values.neurology}
                  internalMedicine={values.internalMedicine}
                  templateType={templateType}
                  onObjectiveChange={(objective) =>
                    updateValues({ ...values, objective })
                  }
                  onNeurologyChange={(neurology) =>
                    updateValues({ ...values, neurology })
                  }
                  onInternalMedicineChange={(internalMedicine) =>
                    updateValues({ ...values, internalMedicine })
                  }
                />
              </div>

              <div
                id="follow-up-section-supportingExams"
                className="scroll-mt-24 transition-all duration-300"
              >
                <SupportingExamSection
                  open={openSections.supportingExams}
                  onToggle={() => toggleSection("supportingExams")}
                  exams={values.supportingExams}
                  onChange={(supportingExams) =>
                    updateValues({ ...values, supportingExams })
                  }
                />
              </div>

              <div
                id="follow-up-section-assessment"
                className="scroll-mt-24 transition-all duration-300"
              >
                <AssessmentSection
                  open={openSections.assessment}
                  onToggle={() => toggleSection("assessment")}
                  values={values.assessments}
                  codes={values.assessmentCodes}
                  onChange={(assessments) =>
                    updateValues({ ...values, assessments })
                  }
                  onCodesChange={(assessmentCodes) =>
                    updateValues({ ...values, assessmentCodes })
                  }
                />
              </div>

              <div
                id="follow-up-section-plan"
                className="scroll-mt-24 transition-all duration-300"
              >
                <PlanSection
                  open={openSections.plan}
                  onToggle={() => toggleSection("plan")}
                  planning={values.planning}
                  instruction={values.instruction}
                  onPlanningChange={(planning) =>
                    updateValues({ ...values, planning })
                  }
                  onInstructionChange={(instruction) =>
                    updateValues({ ...values, instruction })
                  }
                />
              </div>
            </div>

            <section className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
              RekamMedisku hanya menyimpan dan memformat input pengguna. Sistem
              tidak melakukan diagnosis otomatis dan bukan pengganti rekam medis
              resmi rumah sakit.
            </section>

            <div className="sticky bottom-[68px] z-20 -mx-4 border-t border-slate-200/80 bg-[#F7F9FC]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:-mx-8 lg:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400">
                  <Icon
                    name={saveMessage.startsWith("✓") ? "check" : "clock"}
                    className={
                      "h-3.5 w-3.5 " +
                      (saveMessage.startsWith("✓")
                        ? "text-emerald-500"
                        : "text-slate-400")
                    }
                  />
                  <span className="truncate">{saveMessage}</span>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => guardedNavigate("Profil Pasien")}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
                  >
                    Simpan Draf
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFollowUp}
                    className="flex-1 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 sm:flex-none"
                  >
                    Simpan Follow-Up
                  </button>
                </div>
              </div>
            </div>
          </main>

          <aside className="hidden border-l border-slate-200 bg-[#F7F9FC] p-6 xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto">
            <div className="space-y-5">
              <h2 className="text-sm font-bold tracking-tight text-slate-800">
                Ringkasan Pasien
              </h2>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#1677FF]">
                      {getInitials(patient.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-bold text-slate-900">
                        {patient.name}
                      </h3>
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        Stase aktif · {activeRotation.name}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    {patient.status}
                  </span>
                </div>

                <div className="space-y-3 pt-4 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Usia</span>
                    <span className="font-semibold text-slate-700">
                      {patient.age} tahun
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">RM</span>
                    <span className="font-semibold text-slate-700">
                      {patient.rm}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Ruangan / Bed</span>
                    <span className="font-semibold text-slate-700">
                      {patient.room} · {patient.bed}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-slate-400">DPJP</span>
                    <span className="text-right font-semibold text-slate-700">
                      {patient.doctor}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Follow-Up Terakhir
                  </span>

                  {latestFollowUp ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSaveMessage(
                          "Detail follow-up lama dapat dibuka kembali dari profil pasien.",
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <span className="block text-[11px] text-slate-500">
                        {latestFollowUp.date} · {latestFollowUp.time}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-[#1677FF]">
                        Follow-Up #{latestFollowUp.number}
                      </span>
                    </button>
                  ) : (
                    <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-400">
                      Belum ada follow-up sebelumnya.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1677FF]">
                    <Icon name="alert" className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Catatan
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Data hanya berasal dari input pengguna. Simpan sebagai
                      draf atau follow-up agar perubahan tidak hilang.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Template klinis saat ini:{" "}
                  <strong className="text-slate-700">{templateType}</strong>.
                  Struktur Follow-Up tetap sama; field tambahan mengikuti
                  kebutuhan stase.
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
