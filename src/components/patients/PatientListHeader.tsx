import type { Rotation } from "../../types/rotation";
import Icon from "../ui/Icon";

type PatientListHeaderProps = {
  rotation: Rotation;
  totalPatients: number;
  activePatients: number;
  archivedPatients: number;
  onAddPatient: () => void;
};

export default function PatientListHeader({
  rotation,
  totalPatients,
  activePatients,
  archivedPatients,
  onAddPatient,
}: PatientListHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
            Stase Aktif · {rotation.name}
          </p>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1677FF]">
            {rotation.specialty}
          </span>
        </div>
        <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-slate-900 lg:text-[30px]">
          Daftar Pasien
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Kelola pasien, status, dan riwayat follow-up dalam satu workspace stase.
        </p>

        <div className="mt-4 grid w-full max-w-[360px] grid-cols-3 gap-2 sm:flex sm:max-w-none sm:flex-wrap">
          {[
            ["Total", totalPatients, "bg-white border-slate-200 text-slate-700"],
            ["Aktif", activePatients, "bg-emerald-50 border-emerald-100 text-emerald-700"],
            ["Diarsipkan", archivedPatients, "bg-slate-50 border-slate-200 text-slate-500"],
          ].map(([label, value, className]) => (
            <span
              key={label as string}
              className={"flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-semibold sm:inline-flex sm:justify-start sm:px-3 " + (className as string)}
            >
              <span className="text-base font-bold leading-none text-slate-900">{value as number}</span>
              <span>{label as string}</span>
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onAddPatient}
        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold md:w-auto text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 active:bg-blue-800"
      >
        <Icon name="plus-user" className="h-4 w-4" strokeWidth={2.5} />
        <span>Tambah Pasien</span>
      </button>
    </div>
  );
}
