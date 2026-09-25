import Icon, { type IconName } from "../ui/Icon";

const activities: Array<{
  title: string;
  person: string;
  detail: string;
  time: string;
  icon: IconName;
  iconBg: string;
  titleColor: string;
}> = [
  {
    title: "Follow-up disimpan",
    person: "Andi Pratama",
    detail: "Follow-up #4",
    time: "Hari ini, 09:42",
    icon: "check",
    iconBg: "bg-emerald-50 text-emerald-600",
    titleColor: "text-blue-600",
  },
  {
    title: "Laporan dibuat",
    person: "Muhammad Rizky",
    detail: "Ilmu Penyakit Dalam · Follow-up #3",
    time: "Hari ini, 08:15",
    icon: "document",
    iconBg: "bg-blue-50 text-blue-600",
    titleColor: "text-blue-600",
  },
  {
    title: "Pasien baru ditambahkan",
    person: "Siti Nurhaliza",
    detail: "Neurologi",
    time: "Kemarin, 16:30",
    icon: "plus-user",
    iconBg: "bg-purple-50 text-purple-600",
    titleColor: "text-slate-800",
  },
  {
    title: "Follow-up disimpan",
    person: "Budi Santoso",
    detail: "Neurologi · Follow-up #2",
    time: "Kemarin, 13:20",
    icon: "check",
    iconBg: "bg-emerald-50 text-emerald-600",
    titleColor: "text-slate-800",
  },
];

export default function RecentActivity() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon name="clock" className="h-5 w-5 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h3>
        </div>

        <button type="button" className="flex items-center gap-1 text-xs font-semibold text-blue-600">
          Lihat Semua
          <Icon name="arrow" className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={`${activity.title}-${activity.time}`} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activity.iconBg}`}>
              <Icon name={activity.icon} className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h4 className={`text-xs font-bold ${activity.titleColor}`}>{activity.title}</h4>
                <span className="text-[10px] text-slate-400">{activity.time}</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-700">{activity.person}</p>
              <p className="text-[11px] text-slate-400">{activity.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
