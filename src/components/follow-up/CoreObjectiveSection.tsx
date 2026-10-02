import FormSection from "./FormSection";
import type { CoreObjective } from "../../types/coreObjective";

type CoreObjectiveSectionProps = {
  open: boolean;
  onToggle: () => void;
  value: CoreObjective;
  onChange: (value: CoreObjective) => void;
};

export default function CoreObjectiveSection({
  open,
  onToggle,
  value,
  onChange,
}: CoreObjectiveSectionProps) {
  const update = (key: keyof CoreObjective, next: string) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <FormSection number="02" title="Objective (O/)" icon="O" open={open} onToggle={onToggle}>
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Catat temuan objektif tanpa batasan specialty. Semua field opsional, isi yang relevan dengan kondisi pasien.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Keadaan Umum & Kesadaran
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Keadaan Umum</span>
              <input
                value={value.generalCondition}
                onChange={(e) => update("generalCondition", e.target.value)}
                placeholder="Tampak sakit sedang/ringan/berat"
                className="field-control"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Kesadaran</span>
              <input
                value={value.consciousness}
                onChange={(e) => update("consciousness", e.target.value)}
                placeholder="Compos mentis, somnolen, apatis, dll"
                className="field-control"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Glasgow Coma Scale (GCS)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Eye (E)</span>
              <input
                value={value.gcsEye}
                onChange={(e) => update("gcsEye", e.target.value)}
                placeholder="1-4"
                className="field-control"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Verbal (V)</span>
              <input
                value={value.gcsVerbal}
                onChange={(e) => update("gcsVerbal", e.target.value)}
                placeholder="1-5"
                className="field-control"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Motor (M)</span>
              <input
                value={value.gcsMotor}
                onChange={(e) => update("gcsMotor", e.target.value)}
                placeholder="1-6"
                className="field-control"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Tanda Vital
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Sistol</span>
              <div className="relative">
                <input
                  value={value.systolic}
                  onChange={(e) => update("systolic", e.target.value)}
                  placeholder="120"
                  className="field-control pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  mmHg
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Diastol</span>
              <div className="relative">
                <input
                  value={value.diastolic}
                  onChange={(e) => update("diastolic", e.target.value)}
                  placeholder="80"
                  className="field-control pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  mmHg
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Nadi</span>
              <div className="relative">
                <input
                  value={value.pulse}
                  onChange={(e) => update("pulse", e.target.value)}
                  placeholder="80"
                  className="field-control pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  x/m
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Pernapasan</span>
              <div className="relative">
                <input
                  value={value.respiratoryRate}
                  onChange={(e) => update("respiratoryRate", e.target.value)}
                  placeholder="20"
                  className="field-control pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  x/m
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Suhu</span>
              <div className="relative">
                <input
                  value={value.temperature}
                  onChange={(e) => update("temperature", e.target.value)}
                  placeholder="36.5"
                  className="field-control pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  °C
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">SpO₂</span>
              <div className="relative">
                <input
                  value={value.spo2}
                  onChange={(e) => update("spo2", e.target.value)}
                  placeholder="98"
                  className="field-control pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  %
                </span>
              </div>
            </label>
          </div>
          <label className="mt-4 block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Oksigen</span>
            <input
              value={value.oxygenVia}
              onChange={(e) => update("oxygenVia", e.target.value)}
              placeholder="Room air, nasal kanul 2 lpm, simple mask, dll"
              className="field-control"
            />
          </label>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Antropometri & Status Gizi
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Berat Badan</span>
              <div className="relative">
                <input
                  value={value.weight}
                  onChange={(e) => update("weight", e.target.value)}
                  placeholder="60"
                  className="field-control pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  kg
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Tinggi Badan</span>
              <div className="relative">
                <input
                  value={value.height}
                  onChange={(e) => update("height", e.target.value)}
                  placeholder="170"
                  className="field-control pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  cm
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">BMI</span>
              <div className="relative">
                <input
                  value={value.bmi}
                  onChange={(e) => update("bmi", e.target.value)}
                  placeholder="20.8"
                  className="field-control pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  kg/m²
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Status Gizi</span>
              <input
                value={value.nutritionStatus}
                onChange={(e) => update("nutritionStatus", e.target.value)}
                placeholder="Normo/kurang/buruk"
                className="field-control"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Pemeriksaan Fisik Sistematis
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Kepala & Leher</span>
              <textarea
                rows={3}
                value={value.headNeck}
                onChange={(e) => update("headNeck", e.target.value)}
                placeholder="Konjungtiva, sklera, leher, pembesaran KGB, JVP, dll"
                className="field-control resize-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Thorax</span>
              <textarea
                rows={3}
                value={value.thorax}
                onChange={(e) => update("thorax", e.target.value)}
                placeholder="Cor, pulmo, inspeksi, palpasi, perkusi, auskultasi"
                className="field-control resize-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Abdomen</span>
              <textarea
                rows={3}
                value={value.abdomen}
                onChange={(e) => update("abdomen", e.target.value)}
                placeholder="Inspeksi, auskultasi, palpasi, perkusi, nyeri tekan, dll"
                className="field-control resize-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Ekstremitas</span>
              <textarea
                rows={3}
                value={value.extremities}
                onChange={(e) => update("extremities", e.target.value)}
                placeholder="Edema, akral, CRT, sianosis, clubbing, dll"
                className="field-control resize-none"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Nyeri (NRS)</span>
            <input
              value={value.painNrs}
              onChange={(e) => update("painNrs", e.target.value)}
              placeholder="0-10"
              className="field-control"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Temuan Lain-lain</span>
            <input
              value={value.otherFindings}
              onChange={(e) => update("otherFindings", e.target.value)}
              placeholder="Temuan relevan lainnya"
              className="field-control"
            />
          </label>
        </div>
      </div>
    </FormSection>
  );
}
