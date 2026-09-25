import FormSection from "./FormSection";
import type { FollowUpFormValues } from "../../types/followUpForm";

type SubjectiveSectionProps = {
  open: boolean;
  onToggle: () => void;
  value: FollowUpFormValues["subjective"];
  onChange: (value: FollowUpFormValues["subjective"]) => void;
};

const fields = [
  ["chiefComplaint", "Keluhan Utama", "Contoh: nyeri kepala, pusing, atau keluhan utama pasien...", true, 500, 3],
  ["currentComplaints", "Keluhan Saat Ini", "Jelaskan keluhan saat ini secara detail...", false, 1000, 3],
  ["presentIllness", "Riwayat Penyakit Sekarang", "Kapan mulai, bagaimana perjalanan penyakit, faktor terkait...", false, 1000, 3],
  ["pastHistory", "Riwayat Penyakit Dahulu", "Riwayat penyakit sebelumnya...", false, 500, 2],
  ["medicationHistory", "Riwayat Pengobatan", "Obat yang sedang atau pernah dikonsumsi...", false, 500, 2],
  ["allergies", "Alergi", "Alergi obat, makanan, atau lainnya...", false, 500, 2],
  ["other", "Informasi Lainnya", "Informasi tambahan yang relevan...", false, 500, 2],
] as const;

export default function SubjectiveSection({
  open,
  onToggle,
  value,
  onChange,
}: SubjectiveSectionProps) {
  const update = (key: keyof typeof value, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <FormSection number="01" title="Subjective" icon="S" open={open} onToggle={onToggle}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map(([key, label, placeholder, required, maxLength, rows]) => (
          <label
            key={key}
            className={key === "other" ? "space-y-1.5 md:col-span-2 xl:col-span-3" : "space-y-1.5"}
          >
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
              <span>
                {label} {required ? <em className="not-italic text-rose-500">*</em> : null}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-slate-400">
                {value[key].length}/{maxLength}
              </span>
            </span>
            <textarea
              required={required}
              maxLength={maxLength}
              rows={rows}
              value={value[key]}
              onChange={(event) => update(key, event.target.value)}
              placeholder={placeholder}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
          </label>
        ))}
      </div>
    </FormSection>
  );
}