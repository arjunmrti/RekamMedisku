import { useEffect, useRef } from "react";
import Icon from "../ui/Icon";

type ReportPreviewProps = {
  text: string;
  editing: boolean;
  onToggleEdit: () => void;
  onTextChange: (value: string) => void;
  onFinishEdit: () => void;
};

export default function ReportPreview({
  text,
  editing,
  onToggleEdit,
  onTextChange,
  onFinishEdit,
}: ReportPreviewProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Preview Laporan
          </h2>
          <p className="mt-1 text-[10px] text-slate-400">
            Tinjau format laporan sebelum disalin ke WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleEdit}
          disabled={!text}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] font-semibold text-[#1677FF] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-50/60"
        >
          <Icon name="document" className="h-3.5 w-3.5" />
          {editing ? "Tutup Edit" : "Edit Laporan"}
        </button>
      </div>

      <div className="bg-[#F8FAFC] p-4 sm:p-6">
        {editing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              rows={24}
              aria-label="Edit draft laporan"
              className="min-h-[420px] w-full sm:min-h-[560px] md:min-h-[620px] resize-y rounded-xl border border-blue-200 bg-white p-4 font-mono text-[11px] leading-6 text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onFinishEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
                Selesai Mengedit
              </button>
            </div>
          </div>
        ) : text ? (
          <div className="max-h-[560px] overflow-y-auto sm:max-h-[680px] rounded-xl border border-slate-200 bg-white p-5 shadow-inner sm:p-6">
            <div className="whitespace-pre-wrap font-mono text-[11px] leading-6 text-slate-700">
              {text}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                <Icon name="document" className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-700">
                Preview belum dibuat
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Pilih follow-up, pastikan template sesuai, lalu klik Generate
                Laporan untuk membuat draft.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-3 text-[10px] leading-relaxed text-slate-400 sm:px-6">
        Edit hanya mengubah draft laporan yang akan disalin. Data follow-up tersimpan tetap tidak berubah.
      </div>
    </section>
  );
}
