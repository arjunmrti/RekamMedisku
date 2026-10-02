import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientContextCardProps = {
  patient: PatientListItem;
  rotation: Rotation;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function PatientContextCard({
  patient,
  rotation,
  date,
  time,
  onDateChange,
  onTimeChange,
}: PatientContextCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-lg font-bold text-[#1677FF]">
            {getInitials(patient.name)}
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
              <StatusBadge status={patient.status} />
            </div>

            <p className="text-xs font-medium text-slate-500">
              RM {patient.rm} <span className="mx-1">·</span> {patient.age} tahun
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="archive" className="h-3.5 w-3.5 text-slate-400" />
                Ruangan {patient.room} · Bed {patient.bed}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
                DPJP: {patient.doctor}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  name="layers"
                  className="h-3.5 w-3.5 text-slate-400"
                />
                {rotation.name}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-sm xl:w-auto">
          <label className="block">
            <span className="sr-only">Tanggal follow-up</span>
            <span className="relative block">
              <Icon name="calendar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1677FF] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
            </span>
          </label>

          <label className="block">
            <span className="sr-only">Waktu follow-up</span>
            <span className="relative block">
              <Icon name="clock" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="time"
                value={time}
                onChange={(event) => onTimeChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1677FF] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}