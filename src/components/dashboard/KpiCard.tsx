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
    <section className="w-full rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <div className={"flex h-10 w-10 items-center justify-center rounded-full " + iconClassName}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>

      <p className="mb-1 text-xs font-semibold text-slate-600">{title}</p>
      <span className="text-[28px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[30px]">
        {value}
      </span>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </section>
  );
}
