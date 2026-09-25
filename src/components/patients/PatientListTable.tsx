import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientListTableProps = {
  patients: PatientListItem[];
  onSelectPatient: (patient: PatientListItem) => void;
  onEditPatient: (patient: PatientListItem) => void;
  onToggleArchive: (patient: PatientListItem) => void;
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

function PatientIdentity({ patient }: { patient: PatientListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
        {getInitials(patient.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-800">
          {patient.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
          <GenderMarker gender={patient.gender} />
          {patient.gender}
        </p>
      </div>
    </div>
  );
}

export default function PatientListTable({
  patients,
  onSelectPatient,
  onEditPatient,
  onToggleArchive,
}: PatientListTableProps) {
  if (patients.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
            <Icon name="users" className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Belum ada pasien pada filter ini.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tambahkan pasien atau ubah filter untuk melihat data lain.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="text-xs font-semibold text-slate-500">
          Menampilkan {patients.length} pasien
        </span>
        <button
          type="button"
          onClick={() => onSelectPatient(patients[0])}
          className="hidden min-h-10 px-2 text-xs font-semibold text-[#1677FF] lg:block"
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
                  <PatientIdentity patient={patient} />
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
                <td className="px-3 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditPatient(patient);
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleArchive(patient);
                      }}
                      className={
                        "rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition hover:bg-slate-50 " +
                        (patient.status === "Aktif"
                          ? "border-rose-100 text-rose-600"
                          : "border-emerald-100 text-emerald-600")
                      }
                    >
                      {patient.status === "Aktif" ? "Arsip" : "Pulihkan"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {patients.map((patient) => (
          <div key={patient.id} className="p-4">
            <button
              type="button"
              onClick={() => onSelectPatient(patient)}
              className="block min-h-[44px] w-full text-left"
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

            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onEditPatient(patient)}
                className="min-h-10 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onToggleArchive(patient)}
                className={
                  "min-h-10 flex-1 rounded-lg border px-3 text-xs font-semibold hover:bg-slate-50 " +
                  (patient.status === "Aktif"
                    ? "border-rose-100 text-rose-600"
                    : "border-emerald-100 text-emerald-600")
                }
              >
                {patient.status === "Aktif" ? "Arsipkan" : "Pulihkan"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
