import { useState } from "react";
import FormSection from "./FormSection";
import Icon from "../ui/Icon";
import { toLocalIsoDate } from "../../utils/date";
import type { SupportingExamForm } from "../../types/followUpForm";

type SupportingExamSectionProps = {
  open: boolean;
  onToggle: () => void;
  exams: SupportingExamForm[];
  onChange: (value: SupportingExamForm[]) => void;
};

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;

const emptyExam = (): SupportingExamForm => ({
  id: "exam-" + Date.now(),
  examType: "Laboratorium",
  date: toLocalIsoDate(),
  result: "",
  attachmentName: "",
  attachmentDataUrl: "",
  attachmentType: "",
  attachmentSize: 0,
});

export default function SupportingExamSection({
  open,
  onToggle,
  exams,
  onChange,
}: SupportingExamSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SupportingExamForm>(emptyExam());
  const [attachmentError, setAttachmentError] = useState("");

  const resetDraft = () => {
    setDraft(emptyExam());
    setEditingId(null);
    setAdding(false);
    setAttachmentError("");
  };

  const addExam = () => {
    if (!draft.examType.trim() || !draft.date) return;
    if (attachmentError) return;
    if (editingId) {
      onChange(
        exams.map((exam) =>
          exam.id === editingId ? { ...draft, id: editingId } : exam,
        ),
      );
    } else {
      onChange([...exams, draft]);
    }
    resetDraft();
  };

  const removeExam = (id: string) => {
    onChange(exams.filter((exam) => exam.id !== id));
  };

  return (
    <FormSection
      number="03"
      title="Pemeriksaan Penunjang"
      icon="P"
      open={open}
      onToggle={onToggle}
      action={
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="hidden rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-[#1677FF] transition hover:bg-blue-50 sm:inline-flex sm:items-center sm:gap-1.5"
        >
          <span>+</span>
          Tambah Pemeriksaan
        </button>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-[#1677FF] sm:hidden"
        >
          <span>+</span>
          Tambah Pemeriksaan
        </button>

        {adding ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Jenis Pemeriksaan</span>
                <select
                  value={draft.examType}
                  onChange={(event) => setDraft({ ...draft, examType: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1677FF]"
                >
                  <option>Laboratorium</option>
                  <option>Imaging</option>
                  <option>CT Scan</option>
                  <option>Rontgen</option>
                  <option>EEG</option>
                  <option>Lainnya</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Tanggal</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1677FF]"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">Hasil</span>
                <input
                  value={draft.result}
                  onChange={(event) => setDraft({ ...draft, result: event.target.value })}
                  placeholder="Masukkan hasil yang dicatat pengguna..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#1677FF] placeholder:text-slate-400"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2 xl:col-span-3">
                <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
                  <span>Lampiran (opsional)</span>
                  <span className="font-normal text-slate-400">maks. 2 MB</span>
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setAttachmentError("");

                    if (!file) {
                      setDraft({
                        ...draft,
                        attachmentName: "",
                        attachmentDataUrl: "",
                        attachmentType: "",
                        attachmentSize: 0,
                      });
                      return;
                    }

                    if (file.size > MAX_ATTACHMENT_SIZE) {
                      setAttachmentError("Ukuran lampiran maksimal 2 MB.");
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                      setDraft((current) => ({
                        ...current,
                        attachmentName: file.name,
                        attachmentDataUrl:
                          typeof reader.result === "string" ? reader.result : "",
                        attachmentType: file.type,
                        attachmentSize: file.size,
                      }));
                    };
                    reader.onerror = () => {
                      setAttachmentError("Lampiran gagal dibaca.");
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1677FF]"
                />
                {draft.attachmentName ? (
                  <p className="text-[10px] text-slate-500">
                    Terpilih: <span className="font-semibold">{draft.attachmentName}</span>
                  </p>
                ) : null}
                {attachmentError ? (
                  <p role="alert" className="text-[10px] font-medium text-rose-600">
                    {attachmentError}
                  </p>
                ) : null}
              </label>

              <div className="flex items-end gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={resetDraft}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={addExam}
                  className="rounded-xl bg-[#1677FF] px-3 py-2.5 text-xs font-semibold text-white"
                >
                  Tambahkan
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
            <p className="text-xs font-semibold text-slate-600">Belum ada pemeriksaan penunjang.</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Tambahkan hasil pemeriksaan yang relevan sebagai bagian terstruktur follow-up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1677FF]">
                      <Icon name="stethoscope" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{exam.examType}</span>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#1677FF]">
                          Pemeriksaan
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{exam.date}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {exam.result || "Hasil belum diisi."}
                      </p>
                      {exam.attachmentName ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-400">
                            Lampiran: {exam.attachmentName}
                          </span>
                          {exam.attachmentDataUrl ? (
                            <a
                              href={exam.attachmentDataUrl}
                              download={exam.attachmentName}
                              onClick={(event) => event.stopPropagation()}
                              className="font-semibold text-[#1677FF] hover:underline"
                            >
                              Unduh
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(exam);
                        setEditingId(exam.id);
                        setAdding(true);
                        setAttachmentError("");
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1677FF] hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExam(exam.id)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}