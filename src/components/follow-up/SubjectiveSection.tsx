import FormSection from "./FormSection";
import type { FollowUpFormValues } from "../../types/followUpForm";

type SubjectiveSectionProps = {
  open: boolean;
  onToggle: () => void;
  value: FollowUpFormValues["subjective"];
  onChange: (value: FollowUpFormValues["subjective"]) => void;
  admissionComplaint?: string;
};

const historyFields = [
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
  admissionComplaint,
}: SubjectiveSectionProps) {
  const update = (key: keyof typeof value, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <FormSection number="01" title="Subjective (S/)" icon="S" open={open} onToggle={onToggle}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-[#1677FF] shadow-sm">
                  S/
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">Keluhan Saat Masuk</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">Konteks awal pasien · tersimpan di data pasien</p>
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-blue-100 bg-white px-2 py-1 text-[9px] font-semibold text-[#1677FF]">
              Konteks awal
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5">
            {admissionComplaint?.trim() ? (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {admissionComplaint.trim()}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-400">
                Belum dicatat. Tambahkan dari Edit Data Pasien agar konteks ini muncul di setiap Follow-Up.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Keluhan / Perkembangan Hari Ini</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">Fokus pada perubahan sejak follow-up terakhir.</p>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-slate-400">
              {value.keluhan.length}/1000
            </span>
          </div>
          <textarea
            required
            maxLength={1000}
            rows={4}
            value={value.keluhan}
            onChange={(event) => update("keluhan", event.target.value)}
            placeholder="Contoh: sakit kepala berkurang sejak pagi, tidak ada muntah, nafsu makan membaik..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {historyFields.map(([key, label, placeholder, required, maxLength, rows]) => (
            <label key={key} className="space-y-1.5">
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