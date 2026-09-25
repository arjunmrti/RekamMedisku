import FormSection from "./FormSection";
import type { FollowUpFormValues } from "../../types/followUpForm";

type SubjectiveSectionProps = {
  open: boolean;
  onToggle: () => void;
  value: FollowUpFormValues["subjective"];
  onChange: (value: FollowUpFormValues["subjective"]) => void;
};

const fields = [
  ["keluhan", "Keluhan / Perkembangan", "Tuliskan keluhan atau perkembangan keluhan pada tanggal follow-up ini...", true, 1000, 4],
  ["riwayatKeluhanSerupa", "Riwayat Keluhan Serupa", "Tuliskan riwayat keluhan serupa atau jika disangkal...", false, 800, 3],
  ["pastHistory", "Riwayat Penyakit Dahulu (RPD)", "Contoh: hipertensi, DM, stroke, penyakit jantung...", false, 500, 3],
  ["medicationHistory", "Riwayat Penggunaan Obat (RPO)", "Nama obat rutin, dosis, atau pengobatan sebelumnya...", false, 500, 3],
  ["allergies", "Riwayat Alergi", "Alergi obat, makanan, atau disangkal...", false, 500, 3],
  ["otherHistory", "Riwayat Lain-lain", "Trauma, tindakan/operasi sebelumnya, kebiasaan, atau informasi relevan lain...", false, 800, 3],
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
    <FormSection number="01" title="Subjective (S/)" icon="S" open={open} onToggle={onToggle}>
      <div className="space-y-4">
        <p className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          Catat keluhan dan riwayat berdasarkan informasi yang Anda peroleh saat follow-up. Field di bawah mengikuti pola CPPT dan tetap disimpan sebagai bagian dari satu Follow-Up.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map(([key, label, placeholder, required, maxLength, rows]) => (
            <label
              key={key}
              className={key === "keluhan" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}
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
      </div>
    </FormSection>
  );
}