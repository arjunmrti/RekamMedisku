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
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "textarea",
    rows: 3,
    ...(placeholder ? { placeholder } : {}),
  };
}

function text(
  id: string,
  label: string,
  placeholder?: string,
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "text",
    ...(placeholder ? { placeholder } : {}),
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
): FollowUpTemplateField {
  return {
    id,
    label,
    type: "select",
    options,
  };
}

const neurologyDefinition: FollowUpTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "objective",
      title: "Objective",
      description:
        "Contoh struktur pemeriksaan neurologis. Ini hanya titik awal dan dapat diubah sesuai kebutuhan Anda.",
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
  ],
};

const internalMedicineDefinition: FollowUpTemplateDefinition = {
  schema_version: 1,
  sections: [
    {
      id: "objective",
      title: "Objective",
      description:
        "Contoh struktur pemeriksaan sistemik. Ini hanya titik awal dan dapat diubah sesuai kebutuhan Anda.",
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
  ],
};

export const STARTER_FOLLOW_UP_TEMPLATES: StarterFollowUpTemplate[] = [
  {
    id: "starter-neurology",
    name: "Neurologi — Pemeriksaan Objective",
    description:
      "Contoh struktur Objective untuk Neurologi. Salin lalu sesuaikan dengan kebutuhan pemeriksaan Anda.",
    metadata: {
      specialty: "Neurologi",
      source: "starter",
    },
    definition: neurologyDefinition,
  },
  {
    id: "starter-internal-medicine",
    name: "Ilmu Penyakit Dalam — Pemeriksaan Objective",
    description:
      "Contoh struktur Objective untuk Ilmu Penyakit Dalam. Salin lalu sesuaikan dengan kebutuhan pemeriksaan Anda.",
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
