import type { Patient } from "../../types/dashboard";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientTableProps = {
  patients: Patient[];
  onViewAll?: () => void;
};

function PatientIdentity({ patient }: { patient: Patient }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon name="user" className="h-4 w-4" />
      </div>
      <p className="truncate text-xs font-semibold text-slate-800">
        {patient.name}
      </p>
    </div>
  );
}

export default function PatientTable({
  patients,
  onViewAll,
}: PatientTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon name="people" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Pasien Terbaru
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Pasien pada stase aktif
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="flex min-h-10 shrink-0 items-center gap-1 px-2 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
        >
          Lihat Semua
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-[#F7FAFE] text-[10px] font-semibold text-slate-400 xl:text-[11px]">
              <th className="px-5 py-3 font-semibold xl:px-6">Nama Pasien</th>
              <th className="px-3 py-3 font-semibold">RM</th>
              <th className="px-3 py-3 font-semibold">Ruangan</th>
              <th className="px-3 py-3 font-semibold">Bed</th>
              <th className="hidden px-3 py-3 font-semibold lg:table-cell">
                DPJP
              </th>
              <th className="hidden px-3 py-3 font-semibold xl:table-cell">
                Follow-Up Terakhir
              </th>
              <th className="px-5 py-3 text-right font-semibold xl:px-6">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {patients.map((patient) => (
              <tr
                key={patient.rm}
                className="transition-colors hover:bg-slate-50/70"
              >
                <td className="px-5 py-3 xl:px-6">
                  <PatientIdentity patient={patient} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-500">
                  {patient.rm}
                </td>
                <td className="px-3 py-3 text-xs font-medium text-slate-500">
                  {patient.room}
                </td>
                <td className="px-3 py-3 text-xs font-medium text-slate-500">
                  {patient.bed}
                </td>
                <td className="hidden px-3 py-3 text-xs font-medium text-slate-600 lg:table-cell">
                  {patient.doctor}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-slate-500 xl:table-cell">
                  {patient.lastFollowUp}
                </td>
                <td className="px-5 py-3 text-right xl:px-6">
                  <StatusBadge status={patient.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {patients.map((patient) => (
          <button
            type="button"
            key={patient.rm}
            onClick={onViewAll}
            className="block w-full p-4 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <PatientIdentity patient={patient} />
              <StatusBadge status={patient.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ruangan / Bed
                </p>
                <p className="font-semibold text-slate-700">
                  {patient.room} / {patient.bed}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Follow-Up
                </p>
                <p className="font-medium text-slate-600">
                  {patient.lastFollowUp}
                </p>
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  DPJP
                </p>
                <p className="font-medium text-slate-600">{patient.doctor}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {patients.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada pasien pada stase ini.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tambahkan pasien untuk mulai membuat dokumentasi follow-up.
          </p>
          <button
            type="button"
            onClick={onViewAll}
            className="mt-4 min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white"
          >
            Lihat Daftar Pasien
          </button>
        </div>
      )}
    </section>
  );
}
