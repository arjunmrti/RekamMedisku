import FormSection from "./FormSection";
import type { FollowUpFormValues } from "../../types/followUpForm";

type ObjectiveSectionProps = {
  open: boolean;
  onToggle: () => void;
  objective: FollowUpFormValues["objective"];
  neurology: FollowUpFormValues["neurology"];
  onObjectiveChange: (value: FollowUpFormValues["objective"]) => void;
  onNeurologyChange: (value: FollowUpFormValues["neurology"]) => void;
};

const vitalFields = [
  ["bloodPressure", "Tekanan Darah", "mmHg"],
  ["pulse", "Nadi", "/menit"],
  ["respiratoryRate", "Frekuensi Napas", "/menit"],
  ["temperature", "Suhu", "°C"],
  ["spo2", "SpO₂", "%"],
] as const;

const neurologyFields = [
  ["gcs", "GCS", "Contoh: 15 (E4M6V5)"],
  ["pupil", "Pupil", "Catat temuan pupil yang relevan..."],
  ["motoric", "Motorik", "Catat pemeriksaan motorik..."],
  ["sensory", "Sensorik", "Catat pemeriksaan sensorik..."],
  ["reflex", "Refleks", "Catat refleks fisiologis/patologis..."],
  ["cranialNerve", "Saraf Kranialis", "Catat pemeriksaan saraf kranialis..."],
  ["neurologicalStatus", "Status Neurologis", "Ringkasan status neurologis yang diinput pengguna..."],
] as const;

export default function ObjectiveSection({
  open,
  onToggle,
  objective,
  neurology,
  onObjectiveChange,
  onNeurologyChange,
}: ObjectiveSectionProps) {
  return (
    <FormSection number="02" title="Objective" icon="O" open={open} onToggle={onToggle}>
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Tanda Vital</h3>
            <span className="text-[10px] text-slate-400">Input manual</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {vitalFields.map(([key, label, unit]) => (
              <label key={key} className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-600">{label}</span>
                <span className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-blue-500/10">
                  <input
                    value={objective[key]}
                    onChange={(event) => onObjectiveChange({ ...objective, [key]: event.target.value })}
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
                    placeholder="—"
                  />
                  <span className="flex items-center bg-slate-50 px-2 text-[10px] font-medium text-slate-400">{unit}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="text-[#1677FF]">◉</span>
                Template Neurologi
              </h3>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Field tambahan mengikuti template stase tanpa mengubah struktur inti follow-up.
              </p>
            </div>
            <span className="w-fit rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[#1677FF]">
              Neurologi aktif
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {neurologyFields.map(([key, label, placeholder]) => (
              <label key={key} className={key === "neurologicalStatus" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <span className="block text-[11px] font-semibold text-slate-600">{label}</span>
                <textarea
                  rows={key === "neurologicalStatus" ? 2 : 1}
                  value={neurology[key]}
                  onChange={(event) => onNeurologyChange({ ...neurology, [key]: event.target.value })}
                  placeholder={placeholder}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="space-y-1.5">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>Pemeriksaan Fisik</span>
            <span className="text-[10px] font-medium text-slate-400">
              {objective.physicalExam.length}/2000
            </span>
          </span>
          <textarea
            maxLength={2000}
            rows={4}
            value={objective.physicalExam}
            onChange={(event) => onObjectiveChange({ ...objective, physicalExam: event.target.value })}
            placeholder="Hasil pemeriksaan fisik secara sistematis yang Anda catat..."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>
      </div>
    </FormSection>
  );
}