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

const neurologyFields = [
  ["fkl", "Fungsi Kortikal Luhur (FKL)", "Contoh: normal / afasia motorik"],
  ["cranialNerve", "N. Cranialis (I–XII)", "Contoh: pupil isokor, refleks cahaya, parese saraf kranialis..."],
  ["pupil", "Pupil", "Ukuran, isokor/anisokor, dan refleks cahaya..."],
  ["movement", "Pergerakan", "Catat pergerakan atau temuan motorik yang relevan..."],
  ["tone", "Tonus", "Contoh: normotonus / spastik / flaccid"],
  ["sensory", "Sensorik", "Contoh: normal / hipoestesi pada sisi tertentu"],
  ["upperStrength", "Kekuatan Ekstremitas Superior", "Contoh: 5/5 kanan, 5/5 kiri"],
  ["lowerStrength", "Kekuatan Ekstremitas Inferior", "Contoh: 5/5 kanan, 5/5 kiri"],
  ["physiologicReflex", "Refleks Fisiologis", "Contoh: BPR +2/+2, TPR +2/+2, KPR +2/+2, APR +2/+2"],
  ["pathologicReflex", "Refleks Patologis", "Contoh: Hoffman/Tromner (-/-), Babinski (-/-)"],
  ["autonomic", "Otonom: BAB & BAK", "Contoh: BAB normal / BAK via kateter..."],
  ["provocation", "Tes Provokasi Saraf", "Contoh: Laseque (-/-), Patrick (-/-)..."],
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
    <FormSection number="02" title="Objective (O/)" icon="O" open={open} onToggle={onToggle}>
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <h3 className="text-xs font-bold text-slate-800">Pemeriksaan dasar</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Gunakan angka/temuan yang benar-benar Anda catat. Tidak ada interpretasi otomatis oleh sistem.
          </p>
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">Keadaan Umum (KU)</span>
          <input
            value={objective.generalCondition}
            onChange={(event) =>
              onObjectiveChange({ ...objective, generalCondition: event.target.value })
            }
            placeholder="Contoh: tampak sakit ringan / sedang / berat, lemah, baik"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Tanda Vital</h3>
            <span className="text-[10px] text-slate-400">Input manual</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {[
              ["systolic", "TD Sistol", "mmHg"],
              ["diastolic", "TD Diastol", "mmHg"],
              ["pulse", "Nadi", "x/menit"],
              ["respiratoryRate", "RR", "x/menit"],
              ["temperature", "Suhu", "°C"],
              ["spo2", "SpO₂", "%"],
              ["oxygenVia", "Oksigen via", ""],
              ["painNrs", "NRS", "0–10"],
            ].map(([key, label, unit]) => (
              <label key={key} className={key === "oxygenVia" ? "space-y-1.5 sm:col-span-2 xl:col-span-1" : "space-y-1.5"}>
                <span className="block text-[11px] font-semibold text-slate-600">{label}</span>
                <span className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-blue-500/10">
                  <input
                    value={objective[key]}
                    onChange={(event) =>
                      onObjectiveChange({ ...objective, [key]: event.target.value })
                    }
                    inputMode={key === "oxygenVia" ? "text" : "decimal"}
                    min={key === "painNrs" ? 0 : undefined}
                    max={key === "painNrs" ? 10 : undefined}
                    placeholder="—"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
                  />
                  {unit ? (
                    <span className="flex items-center bg-slate-50 px-2 text-[10px] font-medium text-slate-400">
                      {unit}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="space-y-1.5">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>Pemeriksaan / Temuan Fisik Lain</span>
            <span className="text-[10px] font-medium text-slate-400">
              {objective.physicalFindings.length}/2500
            </span>
          </span>
          <textarea
            maxLength={2500}
            rows={4}
            value={objective.physicalFindings}
            onChange={(event) =>
              onObjectiveChange({ ...objective, physicalFindings: event.target.value })
            }
            placeholder="Contoh: Cor/Pulmo..., Abdomen..., Ekstremitas..., dan temuan fisik lain yang relevan..."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Template Neurologi</h3>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Field tambahan mengikuti pola pemeriksaan neurologis pada form referensi, tetapi tetap menjadi bagian dari Objective.
              </p>
            </div>
            <span className="w-fit rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[#1677FF]">
              Neurologi aktif
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-600">GCS: Eye (1–4)</span>
              <select
                value={neurology.gcsEye}
                onChange={(event) => onNeurologyChange({ ...neurology, gcsEye: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#1677FF]"
              >
                <option value="">Pilih E</option>
                <option value="4">4 — Spontan</option>
                <option value="3">3 — Terhadap suara</option>
                <option value="2">2 — Terhadap nyeri</option>
                <option value="1">1 — Tidak ada respons</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-600">GCS: Motorik (1–6)</span>
              <select
                value={neurology.gcsMotor}
                onChange={(event) => onNeurologyChange({ ...neurology, gcsMotor: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#1677FF]"
              >
                <option value="">Pilih M</option>
                <option value="6">6 — Mengikuti perintah</option>
                <option value="5">5 — Melokalisir nyeri</option>
                <option value="4">4 — Menghindar nyeri</option>
                <option value="3">3 — Fleksi abnormal</option>
                <option value="2">2 — Ekstensi abnormal</option>
                <option value="1">1 — Tidak ada respons</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-600">GCS: Verbal (1–5 / X)</span>
              <select
                value={neurology.gcsVerbal}
                onChange={(event) => onNeurologyChange({ ...neurology, gcsVerbal: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#1677FF]"
              >
                <option value="">Pilih V</option>
                <option value="5">5 — Orientasi baik</option>
                <option value="4">4 — Bingung</option>
                <option value="3">3 — Kata tidak sesuai</option>
                <option value="2">2 — Mengerang</option>
                <option value="1">1 — Tidak ada respons</option>
                <option value="X">X — Afasia / ETT</option>
              </select>
            </label>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-600">Status Kesadaran</span>
              <input
                value={neurology.consciousness}
                onChange={(event) =>
                  onNeurologyChange({ ...neurology, consciousness: event.target.value })
                }
                placeholder="Contoh: compos mentis / somnolen / stupor"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#1677FF]"
              />
            </label>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="block text-[11px] font-semibold text-slate-600">GCS</span>
              <span className="mt-1 block text-xs font-bold text-[#1677FF]">
                {neurology.gcsEye && neurology.gcsMotor && neurology.gcsVerbal
                  ? neurology.gcsEye + neurology.gcsMotor + neurology.gcsVerbal
                  : "E / M / V belum lengkap"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {neurologyFields.map(([key, label, placeholder]) => (
              <label key={key} className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-600">{label}</span>
                <textarea
                  rows={key === "fkl" || key === "cranialNerve" || key === "physiologicReflex" || key === "pathologicReflex" ? 2 : 1}
                  value={neurology[key]}
                  onChange={(event) => onNeurologyChange({ ...neurology, [key]: event.target.value })}
                  placeholder={placeholder}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                />
              </label>
            ))}

            <label className="space-y-1.5 sm:col-span-2">
              <span className="block text-[11px] font-semibold text-slate-600">Meningeal Sign</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  value={neurology.neckStiffness}
                  onChange={(event) => onNeurologyChange({ ...neurology, neckStiffness: event.target.value })}
                  placeholder="Kaku Kuduk (-/+)"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#1677FF]"
                />
                <input
                  value={neurology.brudzinski}
                  onChange={(event) => onNeurologyChange({ ...neurology, brudzinski: event.target.value })}
                  placeholder="Brudzinski I & II (-/-)"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#1677FF]"
                />
                <input
                  value={neurology.kernig}
                  onChange={(event) => onNeurologyChange({ ...neurology, kernig: event.target.value })}
                  placeholder="Kernig (-/-)"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#1677FF]"
                />
              </div>
            </label>
          </div>
        </div>

        <label className="space-y-1.5">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>Hasil Pemeriksaan Penunjang (ringkasan)</span>
            <span className="text-[10px] text-slate-400">{objective.supportingExamText.length}/2000</span>
          </span>
          <textarea
            maxLength={2000}
            rows={3}
            value={objective.supportingExamText}
            onChange={(event) =>
              onObjectiveChange({ ...objective, supportingExamText: event.target.value })
            }
            placeholder="Catat ringkasan hasil laboratorium, radiologi, atau pemeriksaan lain yang sudah Anda peroleh."
            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </label>
      </div>
    </FormSection>
  );
}