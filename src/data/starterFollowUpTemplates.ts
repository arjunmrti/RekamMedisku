import type {
  FollowUpTemplateDefinition,
  FollowUpTemplateField,
} from "../types/followUpTemplate";

export type StarterFollowUpTemplate = {
  id: string;
  name: string;
  description: string;
  metadata: {
    specialty: string;
    source: "starter";
  };
  definition: FollowUpTemplateDefinition;
};

function textarea(
  id: string,
  label: string,
  placeholder?: string,
  required = false,
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "textarea",
    rows: 3,
    ...(placeholder ? { placeholder } : {}),
    ...(required ? { required: true } : {}),
  };
}

function text(
  id: string,
  label: string,
  placeholder?: string,
  required = false,
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "text",
    ...(placeholder ? { placeholder } : {}),
    ...(required ? { required: true } : {}),
  };
}

function number(id: string, label: string, unit?: string): FollowUpTemplateField {
  return {
    id,
    label,
    type: "number",
    ...(unit ? { unit } : {}),
  };
}

function select(
  id: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  required = false,
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "select",
    options,
    ...(required ? { required: true } : {}),
  };
}

const neurologyDefinition: FollowUpTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "subjective",
      title: "Subjective",
      fields: [
        textarea("chief_complaint", "Keluhan / Perkembangan Hari Ini", "Catat perubahan kondisi pasien.", true),
        textarea("similar_history", "Riwayat Keluhan Serupa"),
        textarea("past_history", "Riwayat Penyakit Dahulu"),
        textarea("medication_history", "Riwayat Pengobatan"),
        textarea("allergy_history", "Riwayat Alergi"),
        textarea("other_history", "Riwayat Lain-lain"),
      ],
    },
    {
      id: "objective",
      title: "Objective",
      description: "Pemeriksaan dasar dan pemeriksaan neurologis. Template ini hanya titik awal dan dapat diubah oleh pengguna.",
      fields: [
        text("general_condition", "Keadaan Umum (KU)", "Catat keadaan umum pasien."),
        number("systolic", "TD Sistol", "mmHg"),
        number("diastolic", "TD Diastol", "mmHg"),
        number("pulse", "Nadi", "x/menit"),
        number("respiratory_rate", "RR", "x/menit"),
        number("temperature", "Suhu", "°C"),
        number("spo2", "SpO₂", "%"),
        text("oxygen_via", "Oksigen via"),
        number("pain_nrs", "NRS", "0–10"),
        textarea("physical_findings", "Pemeriksaan / Temuan Fisik Lain"),
        select("gcs_eye", "GCS: Eye", [
          { value: "4", label: "4 — Spontan" },
          { value: "3", label: "3 — Terhadap suara" },
          { value: "2", label: "2 — Terhadap nyeri" },
          { value: "1", label: "1 — Tidak ada respons" },
        ]),
        select("gcs_motor", "GCS: Motorik", [
          { value: "6", label: "6 — Mengikuti perintah" },
          { value: "5", label: "5 — Melokalisir nyeri" },
          { value: "4", label: "4 — Menghindar nyeri" },
          { value: "3", label: "3 — Fleksi abnormal" },
          { value: "2", label: "2 — Ekstensi abnormal" },
          { value: "1", label: "1 — Tidak ada respons" },
        ]),
        select("gcs_verbal", "GCS: Verbal", [
          { value: "5", label: "5 — Orientasi baik" },
          { value: "4", label: "4 — Bingung" },
          { value: "3", label: "3 — Kata tidak sesuai" },
          { value: "2", label: "2 — Mengerang" },
          { value: "1", label: "1 — Tidak ada respons" },
          { value: "X", label: "X — Afasia / ETT" },
        ]),
        text("consciousness", "Status Kesadaran", "Catat sesuai pemeriksaan."),
        textarea("cortical_function", "Fungsi Kortikal Luhur (FKL)"),
        textarea("cranial_nerves", "N. Cranialis (I–XII)"),
        textarea("pupil", "Pupil"),
        textarea("meningeal_sign", "Meningeal Sign"),
        textarea("movement", "Pergerakan"),
        textarea("tone", "Tonus"),
        textarea("sensory", "Sensorik"),
        textarea("upper_strength", "Kekuatan Ekstremitas Superior"),
        textarea("lower_strength", "Kekuatan Ekstremitas Inferior"),
        textarea("physiologic_reflex", "Refleks Fisiologis"),
        textarea("pathologic_reflex", "Refleks Patologis"),
        textarea("autonomic", "Otonom: BAB & BAK"),
        textarea("nerve_provocation", "Tes Provokasi Saraf"),
      ],
    },
    {
      id: "assessment",
      title: "Assessment",
      fields: [textarea("assessment", "Assessment / Diagnosis Kerja")],
    },
    {
      id: "plan",
      title: "Plan",
      fields: [
        textarea("planning", "Planning"),
        textarea("instruction", "Instruction"),
      ],
    },
  ],
};

const internalMedicineDefinition: FollowUpTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "subjective",
      title: "Subjective",
      fields: [
        textarea("chief_complaint", "Keluhan / Perkembangan Hari Ini", "Catat perubahan kondisi pasien.", true),
        textarea("similar_history", "Riwayat Keluhan Serupa"),
        textarea("past_history", "Riwayat Penyakit Dahulu"),
        textarea("medication_history", "Riwayat Pengobatan"),
        textarea("allergy_history", "Riwayat Alergi"),
        textarea("other_history", "Riwayat Lain-lain"),
      ],
    },
    {
      id: "objective",
      title: "Objective",
      description: "Pemeriksaan dasar dan temuan sistemik. Template ini hanya titik awal dan dapat diubah oleh pengguna.",
      fields: [
        text("general_condition", "Keadaan Umum (KU)", "Catat keadaan umum pasien."),
        number("systolic", "TD Sistol", "mmHg"),
        number("diastolic", "TD Diastol", "mmHg"),
        number("pulse", "Nadi", "x/menit"),
        number("respiratory_rate", "RR", "x/menit"),
        number("temperature", "Suhu", "°C"),
        number("spo2", "SpO₂", "%"),
        text("oxygen_via", "Oksigen via"),
        number("pain_nrs", "NRS", "0–10"),
        textarea("physical_findings", "Pemeriksaan / Temuan Fisik Lain"),
        text("consciousness", "Kesadaran", "Catat sesuai pemeriksaan."),
        textarea("head_neck", "Kepala & Leher"),
        textarea("thorax", "Thoraks"),
        textarea("abdomen", "Abdomen"),
        textarea("extremities", "Ekstremitas"),
        textarea("systemic_findings", "Temuan Sistemik Relevan"),
      ],
    },
    {
      id: "assessment",
      title: "Assessment",
      fields: [textarea("assessment", "Assessment / Diagnosis Kerja")],
    },
    {
      id: "plan",
      title: "Plan",
      fields: [
        textarea("planning", "Planning"),
        textarea("instruction", "Instruction"),
      ],
    },
  ],
};

export const STARTER_FOLLOW_UP_TEMPLATES: StarterFollowUpTemplate[] = [
  {
    id: "starter-neurology",
    name: "Neurologi — Contoh",
    description: "Contoh format Follow-Up dengan pemeriksaan neurologis. Gunakan sebagai titik awal dan sesuaikan dengan kebutuhan Anda.",
    metadata: {
      specialty: "Neurologi",
      source: "starter",
    },
    definition: neurologyDefinition,
  },
  {
    id: "starter-internal-medicine",
    name: "Ilmu Penyakit Dalam — Contoh",
    description: "Contoh format Follow-Up dengan pemeriksaan sistemik. Gunakan sebagai titik awal dan sesuaikan dengan kebutuhan Anda.",
    metadata: {
      specialty: "Ilmu Penyakit Dalam",
      source: "starter",
    },
    definition: internalMedicineDefinition,
  },
];

export function getStarterFollowUpTemplate(starterId: string) {
  return (
    STARTER_FOLLOW_UP_TEMPLATES.find((template) => template.id === starterId) ??
    null
  );
}
