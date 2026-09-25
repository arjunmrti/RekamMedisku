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
      className="group w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon name={icon} className="h-5 w-5" />
        </div>

        {value !== "12" && (
          <Icon
            name="arrow"
            className={`h-4 w-4 text-slate-300 transition-colors ${hoverIconClassName}`}
          />
        )}
      </div>

      <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
      <span className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </span>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </button>
  );
}
