import Icon from "../ui/Icon";

type DashboardStatusPanelProps = {
  activePatients: number;
  followUpsToday: number;
  pendingFollowUps: number;
  archivedPatients: number;
};

export default function DashboardStatusPanel({
  activePatients,
  followUpsToday,
  pendingFollowUps,
  archivedPatients,
}: DashboardStatusPanelProps) {
  const completionRate =
    activePatients > 0
      ? Math.min(100, Math.round((followUpsToday / activePatients) * 100))
      : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon name="pulse" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Ringkasan Dashboard
            </p>
            <h2 className="text-sm font-bold text-slate-900">
              Kondisi Hari Ini
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                Progress follow-up
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {followUpsToday} dari {activePatients} pasien aktif tercatat hari ini
              </p>
            </div>
            <span className="text-lg font-extrabold leading-none text-blue-600">
              {completionRate}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              Selesai
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {followUpsToday}
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
              Pending
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {pendingFollowUps}
            </p>
          </div>

          <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-purple-600">
              Arsip
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">
              {archivedPatients}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-[10px] leading-[1.65] text-slate-500">
            {pendingFollowUps > 0
              ? `${pendingFollowUps} pasien masih perlu ditindaklanjuti hari ini.`
              : activePatients > 0
                ? "Semua pasien aktif sudah memiliki follow-up hari ini."
                : "Belum ada pasien aktif pada stase ini."}
          </p>
        </div>
      </div>
    </section>
  );
}
