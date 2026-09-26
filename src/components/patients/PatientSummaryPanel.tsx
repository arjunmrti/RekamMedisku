import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientSummaryPanelProps = {
  patient: PatientListItem | null;
  rotation: Rotation;
  onOpenProfile: (patient: PatientListItem) => void;
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

function formatLastFollowUp(value: string) {
  if (value === "Belum ada follow-up") {
    return { date: "Belum ada follow-up", time: "" };
  }

  const [date, time] = value.split("·").map((part) => part.trim());
  return { date: date || value, time: time || "" };
}

export default function PatientSummaryPanel({
  patient,
  rotation,
  onOpenProfile,
  onEditPatient,
  onToggleArchive,
}: PatientSummaryPanelProps) {
  const followUp = patient ? formatLastFollowUp(patient.lastFollowUp) : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-18px_rgba(16,42,86,0.28)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Pasien Terpilih
        </p>
        <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">
          Ringkasan Pasien
        </h2>
      </div>

      {!patient ? (
        <div className="p-5">
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
              <Icon name="users" className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Pilih pasien dari daftar
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Informasi pasien, perawatan, dan follow-up terbaru akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-[#1677FF]">
              {getInitials(patient.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[17px] font-bold leading-tight tracking-tight text-slate-900">
                {patient.name}
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                RM {patient.rm}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {patient.age} tahun · {patient.gender}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <StatusBadge status={patient.status} />
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#1677FF]">
                  {rotation.name}
                </span>
              </div>
            </div>
          </div>

          <div className="my-5 h-px bg-slate-100" />

          <section>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Perawatan
              </p>
              <Icon name="stethoscope" className="h-4 w-4 text-slate-300" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
              <Detail label="Ruangan" value={patient.room || "—"} />
              <Detail label="Bed" value={patient.bed || "—"} />
              <div className="col-span-2">
                <Detail label="DPJP" value={patient.doctor || "—"} />
              </div>
            </div>
          </section>

          <div className="my-5 h-px bg-slate-100" />

          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Aktivitas Klinis
            </p>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1677FF] shadow-sm">
                    <Icon name="document" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {patient.followUpNumber > 0
                        ? "Follow-Up #" + patient.followUpNumber
                        : "Belum ada follow-up"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {patient.followUpNumber > 0
                        ? "Catatan klinis terbaru"
                        : "Belum ada catatan tersimpan"}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-500">
                  {patient.followUpNumber} catatan
                </span>
              </div>

              {followUp?.date ? (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Terakhir diperbarui
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {followUp.date}
                    {followUp.time ? " · " + followUp.time : ""}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => onOpenProfile(patient)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl bg-[#1677FF] px-4 py-3 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              <span>Buka Profil Pasien</span>
              <Icon name="arrow" className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onEditPatient(patient)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Edit Pasien
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleArchive(patient)}
            className={
              "mt-3 w-full px-2 py-2 text-[10px] font-semibold transition-colors " +
              (patient.status === "Aktif"
                ? "text-rose-500 hover:text-rose-600"
                : "text-emerald-600 hover:text-emerald-700")
            }
          >
            {patient.status === "Aktif"
              ? "Arsipkan Pasien"
              : "Pulihkan Pasien"}
          </button>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}
