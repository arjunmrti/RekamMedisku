import FormSection from "./FormSection";

type PlanSectionProps = {
  open: boolean;
  onToggle: () => void;
  planning: string;
  instruction: string;
  onPlanningChange: (value: string) => void;
  onInstructionChange: (value: string) => void;
};

export default function PlanSection({
  open,
  onToggle,
  planning,
  instruction,
  onPlanningChange,
  onInstructionChange,
}: PlanSectionProps) {
  return (
    <FormSection
      number="05"
      title="Planning (P/) & Instruksi (I/)"
      icon="P"
      open={open}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>P/ · Planning Diagnostik / Evaluasi</span>
            <span className="text-[10px] font-medium text-slate-400">
              {planning.length}/1000
            </span>
          </span>
          <textarea
            maxLength={1000}
            rows={6}
            value={planning}
            onChange={(event) => onPlanningChange(event.target.value)}
            placeholder="Catat rencana diagnostik, evaluasi, pemeriksaan, atau tindak lanjut yang Anda input..."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>

        <label className="space-y-1.5">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>I/ · Instruksi Terapi / Obat / Perawatan</span>
            <span className="text-[10px] font-medium text-slate-400">
              {instruction.length}/1000
            </span>
          </span>
          <textarea
            maxLength={1000}
            rows={6}
            value={instruction}
            onChange={(event) => onInstructionChange(event.target.value)}
            placeholder="Catat instruksi terapi, obat, perawatan, atau edukasi sesuai yang Anda input..."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>
      </div>

      <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        P/ dan I/ disimpan terpisah agar format follow-up tetap dapat digunakan kembali untuk laporan tanpa mengubah struktur inti Follow-Up.
      </p>
    </FormSection>
  );
}