import Icon, { type IconName } from "../ui/Icon";

type KpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: IconName;
  iconClassName: string;
};

export default function KpiCard({
  title,
  value,
  description,
  icon,
  iconClassName,
}: KpiCardProps) {
  return (
    <section className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_28px_-18px_rgba(16,42,86,0.22)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + iconClassName}>
          <Icon name={icon} className="h-5 w-5" />
        </div>

        <div className="rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Ringkas
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-600">{title}</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[32px]">
          {value}
        </span>
      </div>
      <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-400 sm:text-[11px]">
        {description}
      </p>
    </section>
  );
}
