import Icon from "../ui/Icon";
import type { Rotation, RotationStatus } from "../../types/rotation";

type RotationCardProps = {
  rotation: Rotation;
  patientCount: number;
  lastActivity: string;
  onUse: (rotation: Rotation) => void;
  onEdit: (rotation: Rotation) => void;
};

function getStatusClass(status: RotationStatus) {
  if (status === "Aktif") {
    return "border-emerald-100 bg-emerald-50 text-emerald-600";
  }

  if (status === "Selesai") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-blue-100 bg-blue-50 text-[#1677FF]";
}

function getIconName(rotation: Rotation) {
  return rotation.specialty === "Neurologi" ? "brain" : "stethoscope";
}

function formatPeriod(startDate: string, endDate: string) {
  const start = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(startDate + "T00:00:00"));
  const end = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(endDate + "T00:00:00"));

  return start + " — " + end;
}

export default function RotationCard({
  rotation,
  patientCount,
  lastActivity,
  onUse,
  onEdit,
}: RotationCardProps) {
  const active = rotation.status === "Aktif";

  return (
    <article className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(16,42,86,0.14)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_32px_-12px_rgba(16,42,86,0.24)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1677FF]">
            <Icon name={getIconName(rotation)} className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                {rotation.name}
              </h3>
              {active ? (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1677FF]">
                  Stase aktif
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              {formatPeriod(rotation.startDate, rotation.endDate)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEdit(rotation)}
          aria-label={"Edit stase " + rotation.name}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <Icon name="edit" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <span
          className={
            "rounded-full border px-2.5 py-1 text-[10px] font-semibold " +
            getStatusClass(rotation.status)
          }
        >
          {rotation.status}
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {rotation.specialty}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Pasien
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {patientCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Aktivitas terakhir
          </p>
          <p className="mt-1 truncate text-[10px] font-semibold text-slate-700">
            {lastActivity}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={active}
        onClick={() => onUse(rotation)}
        className={
          "mt-5 w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition " +
          (active
            ? "cursor-default border border-emerald-100 bg-emerald-50 text-emerald-600"
            : "border border-[#1677FF] text-[#1677FF] hover:bg-blue-50")
        }
      >
        {active ? "Sedang Digunakan" : "Gunakan Stase Ini"}
      </button>
    </article>
  );
}
