import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientInfoCardsProps = {
  patient: PatientListItem;
  onOpenLatest: () => void;
};

export default function PatientInfoCards({
  patient,
  onOpenLatest,
}: PatientInfoCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-purpose="patient-meta-grid">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-800">
          <Icon name="user" className="h-4 w-4 text-[#1677FF]" />
          Informasi Pasien
        </div>
        <div className="space-y-2.5 text-xs">
          <InfoRow label="Nama Lengkap" value={patient.name} align="right" />
          <InfoRow label="Usia" value={String(patient.age) + " tahun"} />
          <InfoRow label="Nomor RM" value={patient.rm} />
          <InfoRow label="Jenis Kelamin" value={patient.gender} />
          <InfoRow label="Tanggal Masuk" value="1 Sep 2026" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-400">Status</span>
          <StatusBadge status={patient.status} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-800">
          <Icon name="database" className="h-4 w-4 text-[#1677FF]" />
          Informasi Perawatan
        </div>
        <div className="space-y-2.5 text-xs">
          <InfoRow label="Ruangan" value={patient.room} />
          <InfoRow label="Bed" value={patient.bed} />
          <InfoRow label="DPJP" value={patient.doctor} align="right" />
          <InfoRow label="Stase" value="Neurologi" />
          <InfoRow label="Tanggal Masuk" value="1 Sep 2026" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-800">
          <Icon name="check" className="h-4 w-4 text-emerald-600" />
          Status Pasien
        </div>
        <StatusBadge status={patient.status} />
        <button
          type="button"
          onClick={onOpenLatest}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-100 hover:bg-blue-50/50"
        >
          <span className="flex items-center gap-2.5">
            <Icon name="calendar" className="h-4 w-4 shrink-0 text-[#1677FF]" />
            <span>
              <span className="block text-[10px] font-medium text-slate-400">Follow-up Terakhir</span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-800">26 Sep 2026 · 09.30</span>
              <span className="mt-0.5 block text-[10px] font-medium text-[#1677FF]">Follow-up #4</span>
            </span>
          </span>
          <span className="text-slate-400">›</span>
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-700">Ringkasan Kondisi</span>
          <br />
          Pasien dalam evaluasi neurologis dengan keluhan utama kelemahan ekstremitas ...
        </p>
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onOpenLatest}
            className="text-xs font-semibold text-[#1677FF] hover:text-blue-700"
          >
            Lihat detail
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align?: "right";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={"font-medium text-slate-700 " + (align === "right" ? "text-right" : "")}>{value}</span>
    </div>
  );
}
