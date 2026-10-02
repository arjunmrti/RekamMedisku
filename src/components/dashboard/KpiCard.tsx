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
    <section className="group relative flex min-h-[158px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_28px_-18px_rgba(16,42,86,0.22)] sm:min-h-[168px] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " + iconClassName}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-xs font-semibold text-slate-600 sm:text-[13px]">{title}</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[34px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[38px]">
            {value}
          </span>
        </div>
        <p className="mt-2 max-w-[18rem] text-[11px] font-medium leading-relaxed text-slate-400 sm:text-xs">
          {description}
        </p>
      </div>
    </section>
  );
}
