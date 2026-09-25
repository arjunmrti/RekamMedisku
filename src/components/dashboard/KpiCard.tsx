import Icon, { type IconName } from "../ui/Icon";

type KpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: IconName;
  iconClassName: string;
  hoverIconClassName: string;
};

export default function KpiCard({
  title,
  value,
  description,
  icon,
  iconClassName,
  hoverIconClassName,
}: KpiCardProps) {
  return (
    <button
      type="button"
      className="group w-full rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_10px_28px_-14px_rgba(16,42,86,0.18)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={"flex h-10 w-10 items-center justify-center rounded-full " + iconClassName}>
          <Icon name={icon} className="h-5 w-5" />
        </div>

        {value !== "12" && (
          <Icon
            name="arrow"
            className={"h-4 w-4 text-slate-300 transition-colors " + hoverIconClassName}
          />
        )}
      </div>

      <p className="mb-1 text-xs font-semibold text-slate-600">{title}</p>
      <span className="text-[28px] font-extrabold leading-none tracking-tight text-slate-900 sm:text-[30px]">
        {value}
      </span>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </button>
  );
}
