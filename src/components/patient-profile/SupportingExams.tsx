import type { SupportingExam } from "../../types/followUp";
import Icon, { type IconName } from "../ui/Icon";

type SupportingExamsProps = {
  exams: SupportingExam[];
  onSelect: (exam: SupportingExam) => void;
};

const iconMap: Record<SupportingExam["icon"], IconName> = {
  lab: "stethoscope",
  scan: "document",
  image: "archive",
  eeg: "pulse",
};

export default function SupportingExams({
  exams,
  onSelect,
}: SupportingExamsProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon name="stethoscope" className="h-4 w-4 text-[#1677FF]" />
          <h2 className="text-sm font-bold text-slate-800">
            Pemeriksaan Penunjang Terakhir
          </h2>
        </div>
        <button
          type="button"
          disabled={exams.length === 0}
          className="inline-flex items-center gap-1 self-start text-xs font-semibold text-[#1677FF] hover:text-blue-700 disabled:cursor-default disabled:opacity-40"
        >
          Lihat Semua
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
          <p className="text-xs font-semibold text-slate-700">
            Belum ada pemeriksaan penunjang tersimpan.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Data pemeriksaan akan muncul setelah dicatat pada follow-up.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {exams.map((exam) => (
            <button
              type="button"
              key={exam.id}
              onClick={() => onSelect(exam)}
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition hover:border-blue-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1677FF]">
                <Icon name={iconMap[exam.icon]} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-800">{exam.name}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{exam.date}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
