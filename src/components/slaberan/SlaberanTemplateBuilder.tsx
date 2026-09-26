import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../ui/Icon";
import {
  createSlaberanTemplate,
  deleteSlaberanTemplate,
  syncSlaberanTemplatesWithSupabase,
  updateSlaberanTemplate,
} from "../../data/supabaseSlaberanTemplates";
import { loadSlaberanTemplates } from "../../data/localSlaberanTemplates";
import {
  SLABERAN_PATIENT_FIELDS,
  SLABERAN_VARIABLES,
  type SlaberanPatientField,
  type SlaberanTemplateBlock,
  type SlaberanTemplateBlockConfig,
  type SlaberanTemplateBlockType,
  type SlaberanTemplateRecord,
} from "../../types/slaberanTemplate";
import {
  cloneSlaberanTemplate,
  createStarterSlaberanTemplate,
} from "../../utils/slaberanTemplate";

type Props = {
  onBack: () => void;
};

const BLOCK_META: Record<
  SlaberanTemplateBlockType,
  { label: string; description: string }
> = {
  opening: {
    label: "Pembuka",
    description: "Kalimat pembuka sebelum isi laporan.",
  },
  header: {
    label: "Header",
    description: "Judul, rumah sakit, dokter, dan tanggal.",
  },
  "ward-summary": {
    label: "Ringkasan Bangsal",
    description: "Menampilkan lantai dan jumlah pasien per bangsal.",
  },
  "patient-list": {
    label: "Daftar Pasien",
    description: "Daftar pasien global setelah ringkasan bangsal.",
  },
  "special-unit-list": {
    label: "Unit Khusus",
    description: "ICU, IGD, CVCU/ICCU, dan unit khusus lain.",
  },
  summary: {
    label: "Keterangan",
    description: "Ringkasan jumlah pasien.",
  },
  divider: {
    label: "Pemisah",
    description: "Menambahkan garis atau teks pemisah.",
  },
  text: {
    label: "Teks Custom",
    description: "Blok teks bebas dengan variabel.",
  },
};

function newBlock(type: SlaberanTemplateBlockType): SlaberanTemplateBlock {
  const id = type + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

  const defaults: Record<SlaberanTemplateBlockType, Record<string, unknown>> = {
    opening: {},
    header: {
      showTitle: true,
      showHospital: true,
      showSpecialty: false,
      showDoctor: false,
      showDate: true,
    },
    "ward-summary": {
      showEmptyRooms: true,
      highlightOccupied: true,
    },
    "patient-list": {
      fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
      patientSeparator: "/",
      showPatientIndex: true,
      emptyText: "Belum ada pasien.",
    },
    "special-unit-list": {
      showEmptyRooms: true,
      highlightOccupied: true,
      fields: ["name", "age", "rm", "doctor", "bed", "diagnosis"],
      patientSeparator: "/",
      showPatientIndex: true,
      emptyText: "Belum ada pasien.",
    },
    summary: {
      showDoctorCount: true,
      showTotalPatients: true,
    },
    divider: {
      separator: "—",
    },
    text: {
      text: "",
    },
  };

  return {
    id,
    type,
    label: BLOCK_META[type].label,
    enabled: true,
    config: defaults[type],
  };
}

function cloneDraft(template: SlaberanTemplateRecord): SlaberanTemplateRecord {
  return {
    ...template,
    blocks: template.blocks.map((block) => ({
      ...block,
      config: { ...block.config },
    })),
    settings: { ...template.settings },
  };
}

function asConfig(block: SlaberanTemplateBlock) {
  return block.config as SlaberanTemplateBlockConfig;
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10";
}

export default function SlaberanTemplateBuilder({ onBack }: Props) {
  const [templates, setTemplates] = useState<SlaberanTemplateRecord[]>(
    loadSlaberanTemplates(),
  );
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SlaberanTemplateRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [variable, setVariable] = useState<string>(
    SLABERAN_VARIABLES[0]?.key ?? "{{report.specialty}}",
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setErrorMessage("");
    try {
      const next = await syncSlaberanTemplatesWithSupabase();
      setTemplates(next);
      setSelectedId(
        (current) =>
          current ||
          next.find((item) => item.isDefault)?.id ||
          next[0]?.id ||
          "",
      );
    } catch (error) {
      const fallback = loadSlaberanTemplates();
      setTemplates(fallback);
      setSelectedId(
        (current) =>
          current ||
          fallback.find((item) => item.isDefault)?.id ||
          fallback[0]?.id ||
          "",
      );
      if (!fallback.length) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Template belum dapat dimuat dari Supabase.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) return;

    const selected = templates.find((template) => template.id === selectedId);

    setDraft((current) => {
      if (!selected) {
        return current?.id === selectedId ? null : current;
      }

      // Do not overwrite an in-progress editor when a background sync refreshes
      // the template list. The current draft remains the user's source of truth
      // until they explicitly save or switch templates.
      if (current?.id === selectedId) return current;

      return cloneDraft(selected);
    });
  }, [selectedId, templates]);

  const isUnsaved = Boolean(draft && !templates.some((item) => item.id === draft.id));

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId),
    [selectedId, templates],
  );

  const mutateDraft = (updates: Partial<SlaberanTemplateRecord>) => {
    setDraft((current) => (current ? { ...current, ...updates } : current));
  };

  const updateBlock = (
    blockId: string,
    updates: Partial<SlaberanTemplateBlock>,
  ) => {
    setDraft((current) => {
      if (!current) return null;

      return {
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block,
        ),
      };
    });
  };

  const updateBlockConfig = (
    blockId: string,
    updates: Partial<SlaberanTemplateBlockConfig>,
  ) => {
    setDraft((current) => {
      if (!current) return null;

      return {
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                config: { ...block.config, ...updates },
              }
            : block,
        ),
      };
    });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return null;

      const target = index + direction;
      if (target < 0 || target >= current.blocks.length) return current;

      const blocks = [...current.blocks];
      const [moved] = blocks.splice(index, 1);
      blocks.splice(target, 0, moved);

      return { ...current, blocks };
    });
  };

  const deleteBlock = (blockId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.filter((block) => block.id !== blockId),
          }
        : current,
    );
  };

  const addBlock = (type: SlaberanTemplateBlockType) => {
    setDraft((current) =>
      current ? { ...current, blocks: [...current.blocks, newBlock(type)] } : current,
    );
  };

  const startNew = () => {
    setSelectedId("");
    setDraft({
      ...createStarterSlaberanTemplate(),
      id: "draft-" + Date.now(),
      name: "Template Slaberan Baru",
      isDefault: false,
    });
    setErrorMessage("");
  };

  const startStarter = () => {
    setSelectedId("");
    setDraft(createStarterSlaberanTemplate());
    setErrorMessage("");
  };

  const handleSave = async () => {
    if (!draft) return;

    if (!draft.name.trim()) {
      setErrorMessage("Nama template wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      if (isUnsaved) {
        const created = await createSlaberanTemplate({
          name: draft.name.trim(),
          doctor: draft.doctor.trim(),
          specialty: draft.specialty.trim(),
          hospital: draft.hospital.trim(),
          opening: draft.opening,
          showEmptyRooms: draft.showEmptyRooms,
          blocks: draft.blocks,
          settings: draft.settings,
          schemaVersion: draft.schemaVersion,
          isDefault: draft.isDefault,
        });

        setTemplates(loadSlaberanTemplates());
        setSelectedId(created.id);
      } else {
        await updateSlaberanTemplate(draft.id, {
          name: draft.name.trim(),
          doctor: draft.doctor.trim(),
          specialty: draft.specialty.trim(),
          hospital: draft.hospital.trim(),
          opening: draft.opening,
          showEmptyRooms: draft.showEmptyRooms,
          blocks: draft.blocks,
          settings: draft.settings,
          schemaVersion: draft.schemaVersion,
          isDefault: draft.isDefault,
        });

        await refresh();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Template gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!draft || saving) return;

    setSaving(true);
    setErrorMessage("");
    try {
      const copy = cloneSlaberanTemplate(draft);
      const created = await createSlaberanTemplate({
        name: copy.name,
        doctor: copy.doctor,
        specialty: copy.specialty,
        hospital: copy.hospital,
        opening: copy.opening,
        showEmptyRooms: copy.showEmptyRooms,
        blocks: copy.blocks,
        settings: copy.settings,
        schemaVersion: copy.schemaVersion,
        isDefault: false,
      });
      await refresh();
      setSelectedId(created.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Template gagal diduplikasi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft || isUnsaved || saving) return;
    if (!window.confirm('Hapus template "' + draft.name + '"?')) return;

    setSaving(true);
    setErrorMessage("");
    try {
      await deleteSlaberanTemplate(draft.id);
      setDraft(null);
      setSelectedId("");
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Template gagal dihapus.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!draft) return;

    const payload = {
      product: "RekamMedisku",
      type: "slaberan-template",
      schemaVersion: draft.schemaVersion,
      exportedAt: new Date().toISOString(),
      template: {
        ...draft,
        isDefault: false,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download =
      draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "slaberan-template";
    link.download += ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const handleImport = async (file: File) => {
    setSaving(true);
    setErrorMessage("");

    try {
      const parsed = JSON.parse(await file.text()) as unknown;

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        (parsed as { product?: unknown }).product !== "RekamMedisku" ||
        (parsed as { type?: unknown }).type !== "slaberan-template"
      ) {
        throw new Error("File bukan template Slaberan RekamMedisku yang valid.");
      }

      const candidate = (parsed as { template?: unknown }).template;

      if (
        typeof candidate !== "object" ||
        candidate === null ||
        typeof (candidate as { name?: unknown }).name !== "string" ||
        typeof (candidate as { specialty?: unknown }).specialty !== "string" ||
        typeof (candidate as { hospital?: unknown }).hospital !== "string" ||
        typeof (candidate as { opening?: unknown }).opening !== "string" ||
        typeof (candidate as { showEmptyRooms?: unknown }).showEmptyRooms !==
          "boolean" ||
        !Array.isArray((candidate as { blocks?: unknown }).blocks)
      ) {
        throw new Error("Struktur template JSON tidak lengkap.");
      }

      const blocks = (candidate as { blocks: unknown[] }).blocks.filter(
        (block): block is SlaberanTemplateBlock =>
          typeof block === "object" &&
          block !== null &&
          typeof (block as { id?: unknown }).id === "string" &&
          typeof (block as { type?: unknown }).type === "string" &&
          Object.prototype.hasOwnProperty.call(
            BLOCK_META,
            (block as { type: string }).type,
          ) &&
          typeof (block as { label?: unknown }).label === "string" &&
          typeof (block as { enabled?: unknown }).enabled === "boolean" &&
          typeof (block as { config?: unknown }).config === "object" &&
          (block as { config?: unknown }).config !== null,
      );

      if (!blocks.length) {
        throw new Error("Template harus memiliki minimal satu blok.");
      }

      const source = candidate as SlaberanTemplateRecord;
      const baseName = source.name.trim() || "Template Slaberan Import";
      const existingNames = new Set(
        templates.map((template) => template.name.trim().toLowerCase()),
      );
      let importedName = baseName;
      let suffix = 2;

      while (existingNames.has(importedName.toLowerCase())) {
        importedName = baseName + " (" + suffix + ")";
        suffix += 1;
      }

      const created = await createSlaberanTemplate({
        name: importedName,
        doctor: typeof source.doctor === "string" ? source.doctor : "",
        specialty: source.specialty.trim(),
        hospital: source.hospital.trim(),
        opening: source.opening,
        showEmptyRooms: source.showEmptyRooms,
        blocks: blocks.map((block, index) => ({
          ...block,
          id: block.id + "-import-" + Date.now() + "-" + index,
          config: { ...block.config },
        })),
        settings:
          typeof source.settings === "object" &&
          source.settings !== null &&
          !Array.isArray(source.settings)
            ? { ...source.settings }
            : {},
        schemaVersion:
          typeof source.schemaVersion === "number" ? source.schemaVersion : 1,
        isDefault: false,
      });

      await refresh();
      setSelectedId(created.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Template JSON gagal diimpor.",
      );
    } finally {
      setSaving(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleSetDefault = async () => {
    if (!draft || isUnsaved || saving) return;

    setSaving(true);
    setErrorMessage("");
    try {
      await updateSlaberanTemplate(draft.id, { isDefault: true });
      await refresh();
      setSelectedId(draft.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Template default gagal diubah.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (
    block: SlaberanTemplateBlock,
    field: SlaberanPatientField,
  ) => {
    const current = asConfig(block).fields ?? [];
    const next = current.includes(field)
      ? current.filter((item) => item !== field)
      : [...current, field];

    updateBlockConfig(block.id, { fields: next });
  };

  const insertVariable = () => {
    const currentTextBlock = draft?.blocks.find(
      (block) => block.type === "text" && block.enabled,
    );

    if (!currentTextBlock) {
      setErrorMessage("Tambahkan blok Teks Custom terlebih dahulu.");
      return;
    }

    const config = asConfig(currentTextBlock);
    updateBlockConfig(currentTextBlock.id, {
      text: (config.text ?? "") + variable,
    });
  };

  const renderBlockConfig = (block: SlaberanTemplateBlock) => {
    const config = asConfig(block);

    if (block.type === "opening") {
      return (
        <p className="text-[10px] leading-relaxed text-slate-400">
          Menggunakan isi <span className="font-semibold">Pembuka</span> pada
          informasi template di atas.
        </p>
      );
    }

    if (block.type === "header") {
      const options: Array<[keyof SlaberanTemplateBlockConfig, string]> = [
        ["showTitle", "Judul Slaberan"],
        ["showHospital", "Rumah sakit"],
        ["showSpecialty", "Spesialisasi"],
        ["showDoctor", "Dokter"],
        ["showDate", "Tanggal"],
      ];

      return (
        <div className="flex flex-wrap gap-2">
          {options.map(([key, label]) => (
            <label
              key={key}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
            >
              <input
                type="checkbox"
                checked={Boolean(config[key])}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    [key]: event.target.checked,
                  } as Partial<SlaberanTemplateBlockConfig>)
                }
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      );
    }

    if (block.type === "ward-summary") {
      return (
        <div className="flex flex-wrap gap-2">
          {([
            ["showEmptyRooms", "Tampilkan bangsal kosong"],
            ["highlightOccupied", "Tebalkan bangsal berisi pasien"],
          ] as Array<[keyof SlaberanTemplateBlockConfig, string]>).map(([key, label]) => (
            <label
              key={key}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
            >
              <input
                type="checkbox"
                checked={Boolean(config[key as keyof SlaberanTemplateBlockConfig])}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    [key]: event.target.checked,
                  } as Partial<SlaberanTemplateBlockConfig>)
                }
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      );
    }

    if (
      block.type === "patient-list" ||
      block.type === "special-unit-list"
    ) {
      const fields =
        config.fields ?? ["name", "age", "rm", "doctor", "bed", "diagnosis"];

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SLABERAN_PATIENT_FIELDS.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => toggleField(block, field.key)}
                className={
                  "rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition " +
                  (fields.includes(field.key)
                    ? "border-blue-200 bg-blue-50 text-[#1677FF]"
                    : "border-slate-200 bg-white text-slate-400")
                }
                title={field.example}
              >
                {field.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Separator field
              </span>
              <input
                value={config.patientSeparator ?? "/"}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    patientSeparator: event.target.value,
                  })
                }
                className={inputClass()}
                maxLength={4}
              />
            </label>

            <label>
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Prefix pasien
              </span>
              <input
                value={config.patientPrefix ?? ""}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    patientPrefix: event.target.value,
                  })
                }
                className={inputClass()}
                placeholder="Contoh: • "
                maxLength={8}
              />
            </label>

            <label>
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Teks kosong
              </span>
              <input
                value={config.emptyText ?? "Belum ada pasien."}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    emptyText: event.target.value,
                  })
                }
                className={inputClass()}
              />
            </label>
          </div>

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={config.showPatientIndex ?? true}
              onChange={(event) =>
                updateBlockConfig(block.id, {
                  showPatientIndex: event.target.checked,
                })
              }
              className="rounded border-slate-300"
            />
            Tampilkan nomor urut pasien
          </label>

          {block.type === "patient-list" ? (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={config.includeSpecialUnitPatients ?? false}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    includeSpecialUnitPatients: event.target.checked,
                  })
                }
                className="rounded border-slate-300"
              />
              Sertakan pasien Unit Khusus di daftar global
            </label>
          ) : null}

          {block.type === "special-unit-list" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ["showEmptyRooms", "Tampilkan unit kosong"],
                ["highlightOccupied", "Tebalkan unit berisi pasien"],
              ] as Array<[keyof SlaberanTemplateBlockConfig, string]>).map(([key, label]) => (
                <label
                  key={key}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      config[key as keyof SlaberanTemplateBlockConfig],
                    )}
                    onChange={(event) =>
                      updateBlockConfig(block.id, {
                        [key]: event.target.checked,
                      } as Partial<SlaberanTemplateBlockConfig>)
                    }
                    className="rounded border-slate-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (block.type === "summary") {
      return (
        <div className="flex flex-wrap gap-2">
          {([
            ["showDoctorCount", "Jumlah pasien dokter"],
            ["showTotalPatients", "Total pasien"],
          ] as Array<[keyof SlaberanTemplateBlockConfig, string]>).map(([key, label]) => (
            <label
              key={key}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600"
            >
              <input
                type="checkbox"
                checked={Boolean(config[key as keyof SlaberanTemplateBlockConfig])}
                onChange={(event) =>
                  updateBlockConfig(block.id, {
                    [key]: event.target.checked,
                  } as Partial<SlaberanTemplateBlockConfig>)
                }
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      );
    }

    if (block.type === "divider") {
      return (
        <input
          value={config.separator ?? ""}
          onChange={(event) =>
            updateBlockConfig(block.id, { separator: event.target.value })
          }
          placeholder="Contoh: ──────────"
          className={inputClass()}
        />
      );
    }

    return (
      <div className="space-y-3">
        <textarea
          value={config.text ?? ""}
          onChange={(event) =>
            updateBlockConfig(block.id, { text: event.target.value })
          }
          rows={4}
          placeholder="Contoh: {{report.doctor}} — {{summary.total_patients}} pasien"
          className={inputClass() + " resize-y leading-5"}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={variable}
            onChange={(event) => setVariable(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 outline-none"
          >
            {SLABERAN_VARIABLES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} · {item.key}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={insertVariable}
            className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-semibold text-[#1677FF]"
          >
            Sisipkan variabel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[#1677FF]"
          >
            <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
            Kembali ke Slaberan
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
            Workspace Slaberan · Template Builder
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Bangun format laporanmu
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Atur metadata, urutan blok, field pasien, dan bagian khusus. Format
            dokter tidak lagi dikunci di generator.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Template Baru
          </button>
          <button
            type="button"
            onClick={startStarter}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1677FF] px-3 py-2.5 text-[11px] font-semibold text-white shadow-sm shadow-blue-500/20"
          >
            Gunakan Template Dasar
          </button>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] leading-relaxed text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-bold text-slate-900">Template</p>
              <p className="text-[10px] text-slate-400">
                {templates.length} tersimpan
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-[#1677FF]">
              Supabase
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-400">
                Memuat template...
              </div>
            ) : null}

            {!loading && templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-700">
                  Belum ada template
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  Mulai dari Template Dasar lalu sesuaikan dengan format dokter.
                </p>
              </div>
            ) : null}

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={
                  "w-full rounded-xl border p-3 text-left transition " +
                  (selectedId === template.id
                    ? "border-blue-200 bg-blue-50/70"
                    : "border-slate-200 bg-white hover:border-blue-100 hover:bg-slate-50")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-bold text-slate-800">
                    {template.name}
                  </p>
                  {template.isDefault ? (
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-bold text-[#1677FF]">
                      DEFAULT
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {template.doctor || "Semua dokter"} · {template.specialty || "Tanpa spesialisasi"}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
          {!draft ? (
            <div className="flex min-h-[520px] items-center justify-center text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
                  <Icon name="document" className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Pilih atau buat template
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Template menyimpan aturan format, bukan data klinis. Data pasien
                  tetap berasal dari workspace saat laporan dibuat.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {draft.name || "Template tanpa nama"}
                    </h3>
                    {isUnsaved ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">
                        BELUM DISIMPAN
                      </span>
                    ) : selectedTemplate?.isDefault ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-[#1677FF]">
                        TEMPLATE DEFAULT
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Metadata + blocks = satu konfigurasi laporan yang bisa dipakai
                    ulang.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleImport(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                  >
                    Import JSON
                  </button>
                  {!isUnsaved ? (
                    <>
                      <button
                        type="button"
                        onClick={handleDuplicate}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                      >
                        Duplikat
                      </button>
                      {!draft.isDefault ? (
                        <button
                          type="button"
                          onClick={handleSetDefault}
                          disabled={saving}
                          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-[#1677FF] disabled:opacity-40"
                        >
                          Jadikan Default
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        className="rounded-lg border border-rose-100 px-3 py-2 text-[10px] font-semibold text-rose-600 disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!draft || saving}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                  >
                    Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1677FF] px-3 py-2 text-[10px] font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Icon name="check" className="h-3.5 w-3.5" />
                    {saving ? "Menyimpan..." : "Simpan Template"}
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-900">Informasi template</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Doctor boleh dikosongkan untuk membuat template umum.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold text-slate-500">
                      Nama template
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) => mutateDraft({ name: event.target.value })}
                      className={inputClass()}
                      placeholder="Contoh: Slaberan dr. Supardi"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold text-slate-500">
                      Dokter spesifik
                    </span>
                    <input
                      value={draft.doctor}
                      onChange={(event) => mutateDraft({ doctor: event.target.value })}
                      className={inputClass()}
                      placeholder="Kosongkan untuk semua dokter"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold text-slate-500">
                      Spesialisasi
                    </span>
                    <input
                      value={draft.specialty}
                      onChange={(event) => mutateDraft({ specialty: event.target.value })}
                      className={inputClass()}
                      placeholder="Neurologi"
                    />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-[10px] font-semibold text-slate-500">
                      Rumah sakit
                    </span>
                    <input
                      value={draft.hospital}
                      onChange={(event) => mutateDraft({ hospital: event.target.value })}
                      className={inputClass()}
                      placeholder="RSUD Sawerigading Palopo"
                    />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[10px] font-semibold text-slate-500">
                    Pembuka
                  </span>
                  <textarea
                    value={draft.opening}
                    onChange={(event) => mutateDraft({ opening: event.target.value })}
                    rows={3}
                    className={inputClass() + " resize-y leading-5"}
                    placeholder="Assalamualaikum..."
                  />
                </label>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={draft.showEmptyRooms}
                    onChange={(event) =>
                      mutateDraft({ showEmptyRooms: event.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-[10px] font-semibold text-slate-600">
                    Default: tampilkan lokasi kosong
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Susunan laporan
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Geser blok ke atas/bawah untuk menentukan urutan output WhatsApp.
                    </p>
                  </div>

                  <select
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      addBlock(event.target.value as SlaberanTemplateBlockType);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600 outline-none focus:border-[#1677FF]"
                  >
                    <option value="">+ Tambah blok</option>
                    {(Object.keys(BLOCK_META) as SlaberanTemplateBlockType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {BLOCK_META[type].label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="mt-4 space-y-3">
                  {draft.blocks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-[10px] text-slate-400">
                      Template belum memiliki blok. Tambahkan blok di atas.
                    </div>
                  ) : null}

                  {draft.blocks.map((block, index) => (
                    <article
                      key={block.id}
                      className={
                        "rounded-2xl border p-4 " +
                        (block.enabled
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-50 opacity-60")
                      }
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[10px] font-bold text-slate-400">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={block.label}
                                onChange={(event) =>
                                  updateBlock(block.id, {
                                    label: event.target.value,
                                  })
                                }
                                className="min-w-[180px] flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs font-bold text-slate-800 outline-none hover:border-slate-200 focus:border-blue-200 focus:bg-white"
                              />
                              <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-[#1677FF]">
                                {BLOCK_META[block.type].label}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                              {BLOCK_META[block.type].description}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(index, -1)}
                            disabled={index === 0}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 disabled:opacity-30"
                            aria-label="Naikkan blok"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(index, 1)}
                            disabled={index === draft.blocks.length - 1}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 disabled:opacity-30"
                            aria-label="Turunkan blok"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBlock(block.id, {
                                enabled: !block.enabled,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"
                          >
                            {block.enabled ? "Aktif" : "Nonaktif"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBlock(block.id)}
                            className="rounded-lg border border-rose-100 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        {renderBlockConfig(block)}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
