import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../ui/Icon";
import {
  type ReportTemplateBlock,
  type ReportTemplateBlockType,
  type ReportTemplateSection,
  type ReportTemplateSource,
} from "../../types/reportTemplate";
import { createReportTemplate } from "../../data/reportTemplates";
import { validateReportTemplateDefinition } from "../../utils/reportTemplate";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string) => void;
};

const BLOCK_TYPES: ReportTemplateBlockType[] = [
  "value",
  "text",
  "template_answers",
  "supporting_exams",
];

const SOURCE_OPTIONS: Array<{ value: ReportTemplateSource; label: string }> = [
  { value: "identity.report_introduction", label: "Pembuka laporan" },
  { value: "patient.name", label: "Nama pasien" },
  { value: "patient.age", label: "Umur" },
  { value: "patient.gender", label: "Jenis kelamin" },
  { value: "patient.rm", label: "Nomor RM" },
  { value: "patient.room", label: "Ruangan" },
  { value: "patient.bed", label: "Bed" },
  { value: "patient.doctor", label: "DPJP" },
  { value: "patient.admission_date", label: "Tanggal masuk" },
  { value: "patient.admission_complaint", label: "Keluhan masuk" },
  { value: "rotation.name", label: "Nama stase/rotasi" },
  { value: "follow_up.date", label: "Tanggal follow-up" },
  { value: "follow_up.subjective", label: "Subjective" },
  { value: "follow_up.objective", label: "Objective" },
  { value: "follow_up.assessment", label: "Assessment" },
  { value: "follow_up.plan", label: "Plan" },
  { value: "follow_up.planning", label: "Planning" },
  { value: "follow_up.instruction", label: "Instruction" },
  { value: "follow_up.summary", label: "Ringkasan" },
];

function slugify(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return normalized || fallback;
}

function makeBlock(index: number): ReportTemplateBlock {
  return {
    id: "block-" + (index + 1),
    type: "value",
    source: "patient.name",
    emptyText: "Belum ada data.",
  };
}

function makeSection(index: number): ReportTemplateSection {
  return {
    id: "section-" + (index + 1),
    title: "Section " + (index + 1),
    blocks: [makeBlock(0)],
  };
}

export default function ReportTemplateBuilderModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<ReportTemplateSection[]>([
    makeSection(0),
  ]);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setSections([makeSection(0)]);
    setErrorMessage("");
    setSubmitting(false);
  }, [open]);

  const blockCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.blocks.length, 0),
    [sections],
  );

  const updateSection = (
    sectionId: string,
    updater: (section: ReportTemplateSection) => ReportTemplateSection,
  ) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? updater(section) : section,
      ),
    );
  };

  const updateBlock = (
    sectionId: string,
    blockId: string,
    updater: (block: ReportTemplateBlock) => ReportTemplateBlock,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      blocks: section.blocks.map((block) =>
        block.id === blockId ? updater(block) : block,
      ),
    }));
  };

  const addSection = () =>
    setSections((current) => [...current, makeSection(current.length)]);

  const removeSection = (sectionId: string) =>
    setSections((current) =>
      current.length <= 1
        ? current
        : current.filter((section) => section.id !== sectionId),
    );

  const addBlock = (sectionId: string) =>
    updateSection(sectionId, (section) => ({
      ...section,
      blocks: [...section.blocks, makeBlock(section.blocks.length)],
    }));

  const removeBlock = (sectionId: string, blockId: string) =>
    updateSection(sectionId, (section) => ({
      ...section,
      blocks:
        section.blocks.length <= 1
          ? section.blocks
          : section.blocks.filter((block) => block.id !== blockId),
    }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setErrorMessage("");

    try {
      if (!name.trim()) {
        throw new Error("Nama template wajib diisi.");
      }

      const normalizedSections = sections.map((section, sectionIndex) => ({
        id: slugify(section.id, "section-" + (sectionIndex + 1)),
        title: section.title.trim(),
        description: section.description?.trim() || undefined,
        blocks: section.blocks.map((block, blockIndex) => {
          const id = slugify(
            block.id,
            "block-" + (blockIndex + 1),
          );

          if (block.type === "value") {
            return {
              id,
              type: "value" as const,
              source: block.source,
              label: block.label?.trim() || undefined,
              emptyText: block.emptyText?.trim() || undefined,
            };
          }

          if (block.type === "text") {
            return {
              id,
              type: "text" as const,
              text: block.text.trim(),
            };
          }

          if (block.type === "template_answers") {
            return {
              id,
              type: "template_answers" as const,
              title: block.title?.trim() || undefined,
              emptyText: block.emptyText?.trim() || undefined,
            };
          }

          return {
            id,
            type: "supporting_exams" as const,
            title: block.title?.trim() || undefined,
            emptyText: block.emptyText?.trim() || undefined,
            includeAttachments: block.includeAttachments !== false,
          };
        }),
      }));

      const definition = validateReportTemplateDefinition({
        schema_version: 1,
        sections: normalizedSections,
      });

      setSubmitting(true);

      const result = await createReportTemplate({
        name,
        description,
        definition,
      });

      onCreated(result.templateId);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Template laporan gagal dibuat.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:max-w-5xl md:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
              Template Builder
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Buat Template Laporan
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Susun output laporan dari data sistem dan blok statis. Template
              tidak bergantung pada specialty tertentu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nama template
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Laporan Harian Saya"
                className="field-control"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Deskripsi
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Konteks penggunaan template"
                className="field-control"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Struktur Template
              </h3>
              <p className="mt-1 text-[11px] text-slate-400">
                {sections.length} section · {blockCount} block
              </p>
            </div>
            <button
              type="button"
              onClick={addSection}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Icon name="plus" className="h-4 w-4" />
              Tambah Section
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <section
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={section.id}
                      onChange={(event) =>
                        updateSection(section.id, (current) => ({
                          ...current,
                          id: event.target.value,
                        }))
                      }
                      className="field-control"
                      aria-label={"ID section " + (sectionIndex + 1)}
                      placeholder="section-id"
                    />
                    <input
                      value={section.title}
                      onChange={(event) =>
                        updateSection(section.id, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="field-control"
                      aria-label={"Judul section " + (sectionIndex + 1)}
                      placeholder="Judul section (opsional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    disabled={sections.length <= 1}
                    className="h-10 rounded-xl px-3 text-xs font-semibold text-slate-400 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Hapus
                  </button>
                </div>

                <input
                  value={section.description ?? ""}
                  onChange={(event) =>
                    updateSection(section.id, (current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="field-control mt-3"
                  placeholder="Deskripsi section (opsional)"
                />

                <div className="mt-4 space-y-3">
                  {section.blocks.map((block, blockIndex) => (
                    <div
                      key={block.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
                        <input
                          value={block.id}
                          onChange={(event) =>
                            updateBlock(section.id, block.id, (current) => ({
                              ...current,
                              id: event.target.value,
                            }))
                          }
                          className="field-control"
                          aria-label={
                            "ID block " + (blockIndex + 1)
                          }
                          placeholder="block-id"
                        />
                        <select
                          value={block.type}
                          onChange={(event) => {
                            const nextType =
                              event.target.value as ReportTemplateBlockType;

                            updateBlock(section.id, block.id, () => {
                              if (nextType === "value") {
                                return {
                                  id: block.id,
                                  type: "value",
                                  source: "patient.name",
                                  emptyText: "Belum ada data.",
                                };
                              }

                              if (nextType === "text") {
                                return {
                                  id: block.id,
                                  type: "text",
                                  text: "Teks statis",
                                };
                              }

                              if (nextType === "template_answers") {
                                return {
                                  id: block.id,
                                  type: "template_answers",
                                  title: "Jawaban Template Follow-Up",
                                  emptyText: "Belum ada jawaban template.",
                                };
                              }

                              return {
                                id: block.id,
                                type: "supporting_exams",
                                title: "Pemeriksaan Penunjang",
                                emptyText: "Belum ada pemeriksaan penunjang.",
                                includeAttachments: true,
                              };
                            });
                          }}
                          className="field-control"
                          aria-label={"Tipe block " + (blockIndex + 1)}
                        >
                          {BLOCK_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeBlock(section.id, block.id)}
                          disabled={section.blocks.length <= 1}
                          className="h-11 rounded-xl px-3 text-xs font-semibold text-slate-400 hover:bg-white disabled:opacity-40"
                        >
                          Hapus
                        </button>
                      </div>

                      {block.type === "value" ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input
                            value={block.label ?? ""}
                            onChange={(event) =>
                              updateBlock(section.id, block.id, (current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            className="field-control"
                            aria-label="Label output"
                            placeholder="Label output, mis. Nama"
                          />
                          <input
                            value={block.emptyText ?? ""}
                            onChange={(event) =>
                              updateBlock(section.id, block.id, (current) => ({
                                ...current,
                                emptyText: event.target.value,
                              }))
                            }
                            className="field-control"
                            aria-label="Teks kosong"
                            placeholder="Teks saat data kosong"
                          />
                          <select
                            value={block.source}
                            onChange={(event) =>
                              updateBlock(section.id, block.id, (current) => ({
                                ...current,
                                source: event.target.value as ReportTemplateSource,
                              }))
                            }
                            className="field-control md:col-span-2"
                            aria-label="Sumber data laporan"
                          >
                            {SOURCE_OPTIONS.map((source) => (
                              <option key={source.value} value={source.value}>
                                {source.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {block.type === "text" ? (
                        <textarea
                          value={block.text}
                          onChange={(event) =>
                            updateBlock(section.id, block.id, (current) => ({
                              ...current,
                              text: event.target.value,
                            }))
                          }
                          rows={3}
                          className="field-control mt-3 resize-y"
                          aria-label="Teks statis"
                          placeholder="Teks yang selalu ditampilkan"
                        />
                      ) : null}

                      {block.type === "template_answers" ||
                      block.type === "supporting_exams" ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input
                            value={block.title ?? ""}
                            onChange={(event) =>
                              updateBlock(section.id, block.id, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            className="field-control"
                            aria-label="Judul block"
                            placeholder="Judul block"
                          />
                          <input
                            value={block.emptyText ?? ""}
                            onChange={(event) =>
                              updateBlock(section.id, block.id, (current) => ({
                                ...current,
                                emptyText: event.target.value,
                              }))
                            }
                            className="field-control"
                            aria-label="Teks kosong block"
                            placeholder="Teks saat tidak ada data"
                          />
                          {block.type === "supporting_exams" ? (
                            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-2">
                              <input
                                type="checkbox"
                                checked={block.includeAttachments !== false}
                                onChange={(event) =>
                                  updateBlock(section.id, block.id, (current) => ({
                                    ...current,
                                    includeAttachments: event.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#1677FF] focus:ring-[#1677FF]"
                              />
                              Sertakan nama lampiran pada output
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addBlock(section.id)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Tambah Block
                  </button>
                </div>
              </section>
            ))}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="-mx-5 sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="check" className="h-4 w-4" />
              {submitting ? "Membuat..." : "Buat Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
