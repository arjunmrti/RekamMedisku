import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import type {
  FollowUpTemplateDefinition,
  FollowUpTemplateFieldType,
  FollowUpTemplateOption,
} from "../../types/followUpTemplate";
import type { QuickFollowUpFieldInput } from "../../utils/followUpQuickCustomization";

type Props = {
  open: boolean;
  definition: FollowUpTemplateDefinition;
  submitting?: boolean;
  onClose: () => void;
  onApply: (
    mode: "follow_up_only" | "template",
    input: QuickFollowUpFieldInput,
  ) => Promise<void> | void;
};

const fieldTypes: Array<{
  value: FollowUpTemplateFieldType;
  label: string;
}> = [
  { value: "text", label: "Teks singkat" },
  { value: "textarea", label: "Catatan panjang" },
  { value: "number", label: "Angka" },
  { value: "select", label: "Pilihan tunggal" },
  { value: "multiselect", label: "Pilihan jamak" },
  { value: "checkbox", label: "Checklist" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function FollowUpQuickCustomization({
  open,
  definition,
  submitting = false,
  onClose,
  onApply,
}: Props) {
  const [sectionId, setSectionId] = useState(definition.sections[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FollowUpTemplateFieldType>("text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [unit, setUnit] = useState("");
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const needsOptions = type === "select" || type === "multiselect";

  const reset = () => {
    setSectionId(definition.sections[0]?.id ?? "");
    setLabel("");
    setType("text");
    setRequired(false);
    setPlaceholder("");
    setUnit("");
    setOptionsText("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const buildOptions = (): FollowUpTemplateOption[] | undefined => {
    if (!needsOptions) return undefined;

    const labels = optionsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!labels.length) {
      throw new Error("Tambahkan minimal satu opsi.");
    }

    const seen = new Set<string>();

    return labels.map((item, index) => {
      const value = slugify(item) || "option-" + (index + 1);
      let uniqueValue = value;
      let suffix = 2;

      while (seen.has(uniqueValue)) {
        uniqueValue = value + "-" + suffix;
        suffix += 1;
      }

      seen.add(uniqueValue);
      return { value: uniqueValue, label: item };
    });
  };

  const submit = async (mode: "follow_up_only" | "template") => {
    try {
      const trimmedLabel = label.trim();
      if (!trimmedLabel) throw new Error("Nama pemeriksaan wajib diisi.");

      await onApply(mode, {
        sectionId,
        label: trimmedLabel,
        type,
        required,
        placeholder: placeholder.trim() || undefined,
        unit: unit.trim() || undefined,
        options: buildOptions(),
      });
      reset();
    } catch {
      // Parent owns the user-facing error state.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-quick-customization-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90dvh] sm:max-w-xl md:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Quick Customization
            </p>
            <h2 id="follow-up-quick-customization-title" className="mt-1 text-lg font-bold text-slate-900">
              Tambah Pemeriksaan
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Tambahkan field tanpa mengubah template secara tidak sengaja.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Tutup"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Bagian
            </span>
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className="field-control"
              disabled={submitting}
            >
              {definition.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nama pemeriksaan
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Contoh: Tanda rangsang meningeal"
                className="field-control"
                disabled={submitting}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tipe
              </span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as FollowUpTemplateFieldType)
                }
                className="field-control"
                disabled={submitting}
              >
                {fieldTypes.map((fieldType) => (
                  <option key={fieldType.value} value={fieldType.value}>
                    {fieldType.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Placeholder
              </span>
              <input
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                placeholder="Opsional"
                className="field-control"
                disabled={submitting}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Satuan
              </span>
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="Mis. mmHg"
                className="field-control"
                disabled={submitting}
              />
            </label>
          </div>

          {needsOptions ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Opsi
              </span>
              <input
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder="Normal, Meningkat, Menurun"
                className="field-control"
                disabled={submitting}
              />
              <span className="mt-1.5 block text-[10px] text-slate-400">
                Pisahkan dengan koma.
              </span>
            </label>
          ) : null}

          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-slate-300 text-[#1677FF] focus:ring-[#1677FF]"
            />
            Wajib diisi
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
            <strong className="text-slate-800">Hanya Follow-Up ini</strong>{" "}
            menambah field ke catatan yang sedang dibuat saja.{" "}
            <strong className="text-slate-800">Simpan ke Template</strong>{" "}
            membuat versi template baru tanpa menulis ulang versi lama.
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void submit("follow_up_only")}
            disabled={submitting || !label.trim() || !sectionId}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {submitting ? "Menyimpan..." : "Hanya Follow-Up ini"}
          </button>
          <button
            type="button"
            onClick={() => void submit("template")}
            disabled={submitting || !label.trim() || !sectionId}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
          >
            <Icon name="check" className="h-4 w-4" />
            Simpan ke Template
          </button>
        </footer>
      </div>
    </div>
  );
}
