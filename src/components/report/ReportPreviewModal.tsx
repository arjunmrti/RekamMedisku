import { useEffect } from "react";
import type { ReportTemplateType } from "../../types/report";

type Props = {
  open: boolean;
  text: string;
  template: ReportTemplateType;
  loading?: boolean;
  error?: string;
  diagnostics?: string[];
  templateMetadata?: string;
  onTemplateChange: (value: ReportTemplateType) => void;
  onCopy: () => void;
  onClose: () => void;
};

export default function ReportPreviewModal({
  open,
  text,
  template,
  loading = false,
  error = "",
  diagnostics = [],
  onTemplateChange,
  onCopy,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-preview-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="report-preview-title" className="text-base font-bold text-slate-900">Preview Laporan</h2>
            <p className="mt-1 text-xs text-slate-400">Periksa laporan sebelum disalin. Format hanya mengubah tampilan laporan.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup preview laporan" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          {diagnostics.length > 0 ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Beberapa bagian laporan belum dapat diisi: {diagnostics.join(", ")}</div> : null}
          <label className="block text-xs font-semibold text-slate-700">Template laporan
            <select value={template} onChange={(event) => onTemplateChange(event.target.value as ReportTemplateType)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
              <option value="Neurologi">Neurologi</option>
              <option value="Ilmu Penyakit Dalam">Ilmu Penyakit Dalam</option>
            </select>
          </label>
          {loading && <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700">Membuat preview...</p>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <textarea readOnly value={text} aria-label="Teks laporan" className="min-h-[360px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none" />
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Tutup</button>
          <button type="button" onClick={onCopy} disabled={!text || loading || diagnostics.length > 0} className="rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Salin Laporan</button>
        </footer>
      </section>
    </div>
  );
}
