import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientListTableProps = {
  patients: PatientListItem[];
  selectedPatientId: string | null;
  onSelectPatient: (patient: PatientListItem) => void;
  onEditPatient: (patient: PatientListItem) => void;
  onToggleArchive: (patient: PatientListItem) => void;
  onDeletePatient: (patient: PatientListItem) => void | Promise<void>;
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
        {getInitials(patient.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-800">
          {patient.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
          <GenderMarker gender={patient.gender} />
          {patient.gender} · {patient.age} tahun
        </p>
      </div>
    </div>
  );
}

export default function PatientListTable({
  patients,
  selectedPatientId,
  onSelectPatient,
  onEditPatient,
  onToggleArchive,
  onDeletePatient,
}: PatientListTableProps) {
  if (patients.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">Pasien dalam stase aktif</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Klik baris untuk melihat ringkasan pasien.
            </p>
          </div>
          <span className="hidden rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:inline-flex">
            {patients.length} pasien
          </span>
        </div>
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              <th className="min-w-[220px] px-5 py-3.5 font-bold xl:px-6">Nama Pasien</th>
              <th className="w-[110px] px-3 py-3.5 font-bold">No. RM</th>
              <th className="w-[135px] px-3 py-3.5 font-bold">Lokasi</th>
              <th className="min-w-[150px] px-3 py-3.5 font-bold">DPJP</th>
              <th className="min-w-[170px] px-3 py-3.5 font-bold">Follow-Up Terakhir</th>
              <th className="w-[100px] px-3 py-3.5 font-bold">Status</th>
              <th className="w-[150px] px-3 py-3.5 text-right font-bold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {patients.map((patient) => {
              const selected = patient.id === selectedPatientId;

              return (
                <tr
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  aria-selected={selected}
                  className={
                    "cursor-pointer transition-colors " +
                    (selected
                      ? "bg-blue-50/70 hover:bg-blue-50"
                      : "hover:bg-slate-50/80")
                  }
                >
                  <td className="relative px-5 py-3.5 xl:px-6">
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 w-1 bg-[#1677FF]" />
                    ) : null}
                    <PatientIdentity patient={patient} />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3.5 text-xs font-medium text-slate-500">
                    {patient.rm}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3.5">
                    <p className="text-xs font-semibold text-slate-700">
                      {patient.currentLocation?.name || patient.room || "—"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Bed {patient.bed || "—"}
                    </p>
                  </td>

                  <td className="px-3 py-3.5 text-xs text-slate-700">
                    <span className="block max-w-[180px] truncate">
                      {patient.doctor || "—"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3.5">
                    <p className="text-[11px] font-semibold text-slate-800">
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditPatient(patient);
                        }}
                        className="rounded-lg px-2.5 py-2 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white hover:text-[#1677FF]"
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
                          "rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors hover:bg-white " +
                          (patient.status === "Aktif"
                            ? "text-rose-500 hover:text-rose-600"
                            : "text-emerald-600 hover:text-emerald-700")
                        }
                      >
                        {patient.status === "Aktif" ? "Arsip" : "Pulihkan"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onDeletePatient(patient);
                        }}
                        className="rounded-lg px-2 py-2 text-[10px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 xl:hidden">
        {patients.map((patient) => (
          <div key={patient.id} className="p-4">
            <button
              type="button"
              onClick={() => onSelectPatient(patient)}
              className={
                "block min-h-[44px] w-full rounded-xl p-2.5 text-left transition-colors sm:p-2 " +
                (patient.id === selectedPatientId
                  ? "bg-blue-50/70"
                  : "hover:bg-slate-50")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <PatientIdentity patient={patient} />
                <StatusBadge status={patient.status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:gap-4">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    No. RM
                  </p>
                  <p className="font-semibold text-slate-700">{patient.rm}</p>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Lokasi
                  </p>
                  <p className="font-semibold text-slate-700">
                    {patient.currentLocation?.name || patient.room} · Bed {patient.bed}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    DPJP
                  </p>
                  <p className="font-medium text-slate-600">{patient.doctor}</p>
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Follow-Up Terakhir
                  </p>
                  <p className="font-medium text-slate-600">{patient.lastFollowUp}</p>
                </div>
              </div>
            </button>

            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onEditPatient(patient)}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onToggleArchive(patient)}
                className={
                  "min-h-10 rounded-lg border px-3 text-xs font-semibold hover:bg-slate-50 " +
                  (patient.status === "Aktif"
                    ? "border-rose-100 text-rose-600"
                    : "border-emerald-100 text-emerald-600")
                }
              >
                {patient.status === "Aktif" ? "Arsipkan" : "Pulihkan"}
              </button>
              <button
                type="button"
                onClick={() => void onDeletePatient(patient)}
                className="min-h-10 rounded-lg border border-rose-100 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
