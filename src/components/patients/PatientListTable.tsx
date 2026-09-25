import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientListTableProps = {
  patients: PatientListItem[];
  onSelectPatient: (patient: PatientListItem) => void;
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

function GenderMarker({ gender }: { gender: PatientListItem["gender"] }) {
  return (
    <span className={gender === "Perempuan" ? "text-pink-400" : "text-blue-400"}>
      {gender === "Perempuan" ? "♀" : "♂"}
    </span>
  );
}

export default function PatientListTable({
  patients,
  onSelectPatient,
}: PatientListTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="text-xs font-semibold text-slate-500">
          Menampilkan {patients.length} pasien
        </span>
        <button
          type="button"
          onClick={() => onSelectPatient(patients[0])}
          disabled={patients.length === 0}
          className="hidden min-h-10 px-2 text-xs font-semibold text-[#1677FF] disabled:cursor-not-allowed disabled:opacity-40 lg:block"
        >
          Lihat Ringkasan
        </button>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:text-[11px]">
              <th className="px-5 py-3 font-bold xl:px-6">Nama Pasien</th>
              <th className="px-3 py-3 font-bold">RM</th>
              <th className="px-3 py-3 font-bold">Usia</th>
              <th className="px-3 py-3 font-bold">Ruangan</th>
              <th className="px-3 py-3 font-bold">Bed</th>
              <th className="px-3 py-3 font-bold">DPJP</th>
              <th className="px-3 py-3 font-bold">Follow-Up Terakhir</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 text-center font-bold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="cursor-pointer font-medium transition-colors hover:bg-slate-50/80"
              >
                <td className="px-5 py-3.5 xl:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
                      {getInitials(patient.name)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {patient.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                        <GenderMarker gender={patient.gender} />
                        {patient.gender}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 font-medium text-slate-500">
                  {patient.rm}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                  {patient.age} th
                </td>
                <td className="px-3 py-3.5 font-medium text-slate-600">
                  {patient.room}
                </td>
                <td className="px-3 py-3.5 text-slate-600">{patient.bed}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">
                  {patient.doctor}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <p className="text-[11px] font-medium text-slate-800">
                    {patient.lastFollowUp}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {patient.followUpNumber > 0
                      ? "Follow-up #" + patient.followUpNumber
                      : "Belum ada follow-up"}
                  </p>
                </td>
                <td className="px-3 py-3.5">
                  <StatusBadge status={patient.status} />
                </td>
                <td className="px-3 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPatient(patient);
                    }}
                    aria-label={"Lihat opsi " + patient.name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-base tracking-[0.2em] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <span aria-hidden="true">•••</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {patients.map((patient) => (
          <button
            type="button"
            key={patient.id}
            onClick={() => onSelectPatient(patient)}
            className="block min-h-[44px] w-full p-4 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                  {getInitials(patient.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {patient.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    RM {patient.rm} · {patient.age} th
                  </p>
                </div>
              </div>
              <StatusBadge status={patient.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ruangan / Bed
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {patient.room} / {patient.bed}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Follow-Up
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {patient.followUpNumber > 0
                    ? "#" + patient.followUpNumber + " · " + patient.lastFollowUp
                    : "Belum ada"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  DPJP
                </p>
                <p className="mt-1 truncate text-xs font-medium text-slate-600">
                  {patient.doctor}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#1677FF]">
              Buka ringkasan
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>

      {patients.length === 0 && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada pasien pada stase ini.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tambahkan pasien untuk mulai membuat dokumentasi follow-up.
          </p>
        </div>
      )}
    </section>
  );
}
