import type { FollowUpEntry } from "../../types/followUp";
import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";

type ReportPatientContextProps = {
  patient: PatientListItem;
  followUps: FollowUpEntry[];
  selectedFollowUp: FollowUpEntry;
  onFollowUpChange: (id: string) => void;
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

export default function ReportPatientContext({
  patient,
  followUps,
  selectedFollowUp,
  onFollowUpChange,
}: ReportPatientContextProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-[#1677FF]">
            {getInitials(patient.name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{patient.name}</h2>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {patient.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              RM {patient.rm} · {patient.age} tahun
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>Ruangan {patient.room} · Bed {patient.bed}</span>
              <span>DPJP: {patient.doctor}</span>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-slate-100 pt-4 lg:w-[360px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <Icon name="calendar" className="h-3.5 w-3.5 text-[#1677FF]" />
            Follow-Up yang dilaporkan
          </div>

          <select
            value={selectedFollowUp.id}
            onChange={(event) => onFollowUpChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1677FF] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
          >
            {followUps.map((entry) => (
              <option key={entry.id} value={entry.id}>
                Follow-Up #{entry.number} · {entry.date} · {entry.time}
              </option>
            ))}
          </select>

          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Data laporan diambil dari follow-up yang sudah tersimpan sehingga
            pengguna tidak perlu menginput ulang data klinis.
          </p>
        </div>
      </div>
    </section>
  );
}
