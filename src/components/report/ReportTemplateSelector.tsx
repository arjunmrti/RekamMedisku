import { reportTemplates } from "../../data/reportTemplates";
import type { ReportTemplateType } from "../../types/report";
import Icon from "../ui/Icon";

type ReportTemplateSelectorProps = {
  selected: ReportTemplateType;
  sourceTemplate: ReportTemplateType;
  onChange: (template: ReportTemplateType) => void;
};

export default function ReportTemplateSelector({
  selected,
  sourceTemplate,
  onChange,
}: ReportTemplateSelectorProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Pilih Template Laporan
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Template mengikuti konteks stase dan tipe follow-up yang dipilih.
          </p>
        </div>
        <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-[#1677FF] sm:inline-flex">
          {sourceTemplate}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reportTemplates.map((template) => {
          const available = template.type === sourceTemplate;
          const active = selected === template.type;

          return (
            <button
              key={template.type}
              type="button"
              disabled={!available}
              onClick={() => onChange(template.type)}
              className={
                "relative rounded-2xl border p-4 text-left transition-all " +
                (active
                  ? "border-blue-400 bg-blue-50/70 shadow-[0_10px_30px_-20px_rgba(22,119,255,0.5)] ring-2 ring-blue-500/10"
                  : available
                    ? "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30"
                    : "cursor-not-allowed border-slate-200 bg-slate-50/70 opacity-60")
              }
              aria-pressed={active}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-xl " +
                    (active
                      ? "bg-blue-100 text-[#1677FF]"
                      : "bg-slate-100 text-slate-500")
                  }
                >
                  <Icon
                    name={template.type === "Neurologi" ? "brain" : "stethoscope"}
                    className="h-5 w-5"
                  />
                </div>

                {active ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1677FF] text-white">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 text-xs font-bold text-slate-900">
                {template.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {template.description}
              </p>

              {!available ? (
                <p className="mt-3 rounded-lg bg-white/80 px-2.5 py-2 text-[10px] font-medium text-slate-400">
                  Tidak aktif untuk follow-up {sourceTemplate} yang dipilih.
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
