import FormSection from "./FormSection";

type PlanSectionProps = {
  open: boolean;
  onToggle: () => void;
  value: string;
  onChange: (value: string) => void;
};

export default function PlanSection({
  open,
  onToggle,
  value,
  onChange,
}: PlanSectionProps) {
  return (
    <FormSection number="05" title="Plan / Instruction" icon="P" open={open} onToggle={onToggle}>
      <div className="space-y-1.5">
        <div className="relative">
          <textarea
            maxLength={1000}
            rows={5}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Catat rencana, edukasi, dan instruksi lanjutan..."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 pb-8 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
          <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-slate-400">
            {value.length}/1000
          </span>
        </div>
      </div>
    </FormSection>
  );
}