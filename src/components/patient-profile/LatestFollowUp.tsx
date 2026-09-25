import type { FollowUpEntry } from "../../types/followUp";
import Icon from "../ui/Icon";

type LatestFollowUpProps = {
  followUp: FollowUpEntry;
  onDetail: () => void;
};

export default function LatestFollowUp({ followUp, onDetail }: LatestFollowUpProps) {
  const rows = [
    ["Subjective", followUp.subjective],
    ["Objective", followUp.objective],
    ["Assessment", followUp.assessment],
    ["Plan", followUp.plan],
  ] as const;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1677FF]">
            <Icon name="document" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Follow-Up Terakhir</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>{followUp.date} · {followUp.time}</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-700">Follow-up #{followUp.number}</span>
              <span className="rounded-full border border-emerald-200/50 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {followUp.status}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDetail}
          className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1677FF] transition hover:bg-blue-100 sm:self-auto"
        >
          Lihat Detail
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3.5 text-xs">
        {rows.map(([label, text]) => (
          <div key={label} className="grid grid-cols-1 gap-1.5 sm:grid-cols-12 sm:gap-3 sm:items-baseline">
            <span className="font-bold uppercase tracking-wide text-slate-700 sm:col-span-2">{label}</span>
            <p className={"leading-relaxed sm:col-span-10 " + (label === "Assessment" ? "font-semibold text-slate-800" : "text-slate-600")}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
