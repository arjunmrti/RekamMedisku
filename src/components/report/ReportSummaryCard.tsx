import type { FollowUpEntry } from "../../types/followUp";
import type { PatientListItem } from "../../types/patient";
import type { ReportTemplateType } from "../../types/report";
import Icon from "../ui/Icon";

type ReportSummaryCardProps = {
  patient: PatientListItem;
  followUp: FollowUpEntry;
  templateType: ReportTemplateType;
  copied: boolean;
  hasReport: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
};

export default function ReportSummaryCard({
  patient,
  followUp,
  templateType,
  copied,
  hasReport,
  onCopy,
  onRegenerate,
}: ReportSummaryCardProps) {
  const items = [
    ["Pasien", patient.name],
    ["RM", patient.rm],
    ["Follow-Up", "#" + followUp.number + " · " + followUp.date],
    ["Template", templateType],
  ];

  return (
    <div className="space-y-5 xl:sticky xl:top-20">
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Ringkasan Laporan
          </h2>
          <span
            className={
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
              (copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : hasReport
                  ? "border-blue-100 bg-blue-50 text-[#1677FF]"
                  : "border-slate-200 bg-slate-50 text-slate-400")
            }
          >
            {copied ? "Tersalin" : hasReport ? "Draft siap" : "Belum dibuat"}
          </span>
        </div>

        <div className="space-y-2.5 pt-4">
          <p className="text-[13px] font-bold text-slate-800">
            Laporan Follow-Up {templateType}
          </p>

          <div className="space-y-2.5 text-[11px]">
            {items.map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-slate-400">{label}</span>
                <span className="text-right font-semibold text-slate-700">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          disabled={!hasReport}
          className={
            "mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 " +
            (copied
              ? "bg-emerald-600 shadow-emerald-500/20"
              : hasReport
                ? "bg-[#1677FF] shadow-blue-500/20 hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none hover:translate-y-0")
          }
        >
          <Icon
            name={copied ? "check" : "document"}
            className="h-4 w-4"
            strokeWidth={copied ? 2.6 : 2}
          />
          {copied
            ? "Tersalin ke Clipboard"
            : hasReport
              ? "Salin Laporan"
              : "Generate laporan terlebih dahulu"}
        </button>

        <button
          type="button"
          onClick={onRegenerate}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1677FF]"
        >
          <Icon name="bolt" className="h-3.5 w-3.5" />
          Generate Ulang
        </button>

        {copied ? (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-[11px] leading-relaxed text-emerald-800">
            <p className="font-bold">Laporan berhasil disalin.</p>
            <p className="mt-0.5">
              Tempelkan hasilnya ke WhatsApp dan kirim secara manual.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Alur:</span>{" "}
            Review → Generate → Preview → Edit bila perlu → Salin.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <h2 className="text-sm font-bold tracking-tight text-slate-900">
          Checklist Workflow
        </h2>

        <div className="mt-4 space-y-4">
          {[
            ["Follow-Up tersimpan", true, "Sumber data sudah tersedia."],
            ["Review", true, "Follow-up dipilih untuk dilaporkan."],
            ["Generate", hasReport, hasReport ? "Draft dibuat dari data tersimpan." : "Belum dibuat; klik Generate Laporan."],
            ["Preview", hasReport, hasReport ? "Hasil dapat ditinjau sebelum disalin." : "Preview tersedia setelah laporan dibuat."],
            ["Edit", hasReport, hasReport ? "Opsional dan hanya mengubah draft laporan." : "Tersedia setelah laporan dibuat."],
            ["Salin", copied, "Copy ke clipboard untuk paste manual."],
          ].map(([title, done, description]) => (
            <div key={title as string} className="flex items-start gap-3">
              <span
                className={
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] " +
                  (done
                    ? "bg-[#1677FF] text-white"
                    : "border border-slate-300 bg-white text-slate-400")
                }
              >
                {done ? (
                  <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                ) : (
                  "·"
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#1677FF]">
            <Icon name="alert" className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] leading-relaxed text-slate-500">
            RekamMedisku hanya memformat data input pengguna. Tidak ada
            pengiriman WhatsApp otomatis, diagnosis otomatis, interpretasi
            hasil, atau rekomendasi terapi.
          </p>
        </div>
      </section>
    </div>
  );
}
