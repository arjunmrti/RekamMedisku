import Icon from "../ui/Icon";

export default function DashboardHeader() {
  return (
    <section className="mb-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[28px] lg:text-[30px]">
            Selamat pagi, Muhammad Fadel
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Semangat untuk hari yang produktif!
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            className="flex min-h-11 min-w-[220px] items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-2.5 text-left transition-colors hover:bg-blue-100/70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Icon name="brain" className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase leading-none tracking-wider text-slate-400">
                  Stase Aktif
                </span>
                <span className="text-sm font-bold tracking-tight text-blue-700">
                  Neurologi
                </span>
              </div>
            </div>
            <Icon name="chevron" className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Ganti Stase
          </button>
        </div>
      </div>
    </section>
  );
}
