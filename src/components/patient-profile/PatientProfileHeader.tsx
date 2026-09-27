import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

type PatientProfileHeaderProps = {
  patient: PatientListItem;
  rotation: Rotation | null;
  onBack: () => void;
  onFollowUp: () => void;
  onReport: () => void;
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

export default function PatientProfileHeader({
  patient,
  rotation,
  onBack,
  onFollowUp,
  onReport,
}: PatientProfileHeaderProps) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1677FF] transition hover:text-blue-700"
      >
        <span aria-hidden="true">←</span>
        Kembali ke Daftar Pasien
      </button>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-lg font-bold text-blue-600 sm:h-16 sm:w-16 sm:text-xl">
              {getInitials(patient.name)}
            </div>

            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {patient.name}
                </h1>
                <StatusBadge status={patient.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-500">
                <span className="text-slate-600">{patient.age} tahun</span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span>RM {patient.rm}</span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="archive" className="h-3.5 w-3.5 text-slate-400" />
                  Ruangan {patient.currentLocation?.name || patient.room} · Bed {patient.bed}
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
                  DPJP: {patient.doctor}
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                {rotation ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon
                      name={
                        rotation.specialty === "Neurologi"
                          ? "brain"
                          : "stethoscope"
                      }
                      className="h-3.5 w-3.5 text-slate-400"
                    />
                    Stase: {rotation.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 xl:shrink-0">
            {patient.status === "Aktif" ? (
              <button
                type="button"
                onClick={onFollowUp}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition hover:bg-blue-700"
              >
                <span className="text-base leading-none">+</span>
                Follow-Up Baru
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReport}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Icon name="document" className="h-4 w-4 text-slate-500" />
              Buat Laporan
            </button>
            <span className="hidden h-10 w-10 xl:block" aria-hidden="true" />
          </div>
        </div>
      </section>
    </div>
  );
}
