import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientSummaryPanelProps = {
  patient: PatientListItem | null;
  onOpenProfile: (patient: PatientListItem) => void;
};

export default function PatientSummaryPanel({
  patient,
  onOpenProfile,
}: PatientSummaryPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <h2 className="mb-4 text-sm font-bold text-slate-900">
        Ringkasan Pasien
      </h2>

      {!patient ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-xs font-semibold text-slate-600">
            Pilih pasien untuk melihat ringkasan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
              {patient.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                {patient.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                RM {patient.rm} · {patient.age} tahun · {patient.gender}
              </p>
              <div className="mt-2">
                <StatusBadge status={patient.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ruangan
              </p>
              <p className="mt-1 font-semibold text-slate-700">
                {patient.room}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Bed
              </p>
              <p className="mt-1 font-semibold text-slate-700">
                {patient.bed}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                DPJP
              </p>
              <p className="mt-1 font-medium text-slate-700">
                {patient.doctor}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
            <Metric label="Follow-Up" value={String(patient.followUpNumber)} />
            <Metric label="Stase" value="Neurologi" icon="brain" />
            <Metric
              label="Terakhir"
              value={
                patient.lastFollowUp === "Belum ada follow-up"
                  ? "—"
                  : patient.lastFollowUp.split("·")[0].trim()
              }
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenProfile(patient)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Buka Profil Pasien
            <Icon name="arrow" className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: "brain";
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      {icon ? (
        <Icon name={icon} className="mb-1 h-3.5 w-3.5 text-blue-600" />
      ) : null}
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}
