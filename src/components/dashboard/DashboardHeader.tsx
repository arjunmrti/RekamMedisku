import type { Rotation } from "../../types/rotation";
import Icon from "../ui/Icon";

type DashboardHeaderProps = {
  rotation: Rotation;
  onChangeRotation: () => void;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function formatPeriod(startDate: string, endDate: string) {
  const start = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(startDate + "T00:00:00"));
  const end = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(endDate + "T00:00:00"));

  return start + " — " + end;
}

export default function DashboardHeader({
  rotation,
  onChangeRotation,
}: DashboardHeaderProps) {
  return (
    <section className="mb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
            Workspace Klinik
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[28px] lg:text-[30px]">
              {getGreeting()}, Muhammad Fadel
            </h1>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
              Hari ini
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Ringkasan aktivitas dan catatan follow-up pada stase {rotation.name}.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onChangeRotation}
            className="group flex min-h-[58px] min-w-[240px] items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-left shadow-sm shadow-blue-100/40 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100/70 hover:shadow-md"
            aria-label="Buka manajemen stase"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Icon
                  name={rotation.specialty === "Neurologi" ? "brain" : "stethoscope"}
                  className="h-4 w-4"
                />
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase leading-none tracking-wider text-slate-400">
                  Stase Aktif
                </span>
                <span className="block text-sm font-bold tracking-tight text-blue-700">
                  {rotation.name}
                </span>
                <span className="block text-[10px] font-medium text-slate-400">
                  {rotation.specialty} · {formatPeriod(rotation.startDate, rotation.endDate)}
                </span>
              </div>
            </div>
            <Icon
              name="chevron"
              className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>

          <button
            type="button"
            onClick={onChangeRotation}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
          >
            Ganti Stase
          </button>
        </div>
      </div>
    </section>
  );
}
