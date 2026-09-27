import Icon from "../ui/Icon";
import type { ReportHubCatalogItem } from "../../data/reportHubCatalog";

export type ReportHubStat = {
  label: string;
  value: string | number;
};

type ReportHubCardProps = {
  item: ReportHubCatalogItem;
  stats: ReportHubStat[];
  warning?: string;
  onAction: () => void;
};

export default function ReportHubCard({
  item,
  stats,
  warning,
  onAction,
}: ReportHubCardProps) {
  const cardClass = item.featured
    ? "border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white shadow-[0_8px_30px_-22px_rgba(22,119,255,0.28)] hover:border-blue-200 hover:shadow-[0_18px_42px_-24px_rgba(22,119,255,0.24)]"
    : "border-slate-200/90 bg-white shadow-[0_8px_30px_-22px_rgba(16,42,86,0.22)] hover:border-blue-200 hover:shadow-[0_18px_42px_-24px_rgba(22,119,255,0.22)]";

  const iconClass = item.featured
    ? "bg-blue-100"
    : "bg-blue-50";

  const badgeClass = item.featured
    ? "border-blue-100 bg-white/80 text-[#1677FF]"
    : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <article
      className={
        "group flex min-h-[360px] flex-col overflow-hidden rounded-2xl border p-6 transition duration-200 hover:-translate-y-1 sm:p-7 " +
        cardClass
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={
            "flex h-12 w-12 items-center justify-center rounded-2xl text-[#1677FF] " +
            iconClass
          }
        >
          <Icon name={item.icon} className="h-5 w-5" strokeWidth={2.25} />
        </div>

        <span
          className={
            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider " +
            badgeClass
          }
        >
          {item.badge}
        </span>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          {item.title}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {item.description}
        </p>
      </div>

      {stats.length > 0 ? (
        <div
          className={
            "mt-6 grid gap-3 " +
            (stats.length >= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")
          }
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={
                "min-h-[78px] rounded-xl border p-3.5 " +
                (item.featured
                  ? "border-blue-100/80 bg-white/80"
                  : "border-slate-100 bg-slate-50/80")
              }
            >
              <p className="text-[10px] font-semibold text-slate-400">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-bold leading-none text-slate-900">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-7">
        <div className="space-y-2.5">
          {warning ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
              <Icon
                name="alert"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
              />
              <p className="text-[11px] leading-relaxed text-amber-800">
                {warning}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25"
          >
            {item.actionLabel}
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
