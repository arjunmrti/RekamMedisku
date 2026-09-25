import FormSection from "./FormSection";

type AssessmentSectionProps = {
  open: boolean;
  onToggle: () => void;
  values: string[];
  onChange: (values: string[]) => void;
};

export default function AssessmentSection({
  open,
  onToggle,
  values,
  onChange,
}: AssessmentSectionProps) {
  const updateValue = (index: number, value: string) => {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addAssessment = () => onChange([...values, ""]);

  const removeAssessment = (index: number) => {
    const next = values.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length ? next : [""]);
  };

  return (
    <FormSection
      number="04"
      title="Assessment"
      icon="A"
      open={open}
      onToggle={onToggle}
      action={
        <button
          type="button"
          onClick={addAssessment}
          className="hidden rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-[#1677FF] transition hover:bg-blue-50 sm:inline-flex"
        >
          + Assessment
        </button>
      }
    >
      <div className="space-y-4">
        {values.map((value, index) => (
          <div key={index} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Assessment{values.length > 1 ? " " + (index + 1) : ""}
              </label>
              {values.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeAssessment(index)}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <div className="relative">
              <textarea
                maxLength={1000}
                rows={4}
                value={value}
                onChange={(event) => updateValue(index, event.target.value)}
                placeholder="Masukkan assessment / diagnosis berdasarkan data yang dicatat..."
                className="w-full resize-none rounded-xl border border-slate-200 p-3 pb-8 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-slate-400">
                {value.length}/1000
              </span>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAssessment}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-[#1677FF] sm:hidden"
        >
          + Tambah Assessment
        </button>

        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          RekamMedisku hanya menyimpan dan memformat input Anda. Sistem tidak melakukan diagnosis otomatis.
        </p>
      </div>
    </FormSection>
  );
}