import Icon from "../ui/Icon";

export type ReportTemplateOption = {
  id: string;
  name: string;
  description: string;
  version: number;
  isSystem?: boolean;
};

type ReportTemplateSelectorProps = {
  selectedId: string;
  templates: ReportTemplateOption[];
  loading?: boolean;
  error?: string;
  onChange: (templateId: string) => void;
  onCreateTemplate?: () => void;
};

export default function ReportTemplateSelector({
  selectedId,
  templates,
  loading = false,
  error = "",
  onChange,
  onCreateTemplate,
}: ReportTemplateSelectorProps) {
  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Pilih Template Laporan
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Template menentukan susunan output laporan tanpa mengubah data follow-up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:inline-flex">
            {templates.length} template
          </span>
          {onCreateTemplate ? (
            <button
              type="button"
              onClick={onCreateTemplate}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-[#1677FF] transition hover:bg-blue-100"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Buat Template
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-xs text-slate-400">
          Memuat template laporan...
        </div>
      ) : templates.length === 0 ? (

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-xs text-slate-400">
          Belum ada template laporan yang dapat digunakan.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((template) => {
            const active = template.id === selectedId;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onChange(template.id)}
                className={
                  "relative rounded-2xl border p-4 text-left transition-all " +
                  (active
                    ? "border-blue-400 bg-blue-50/70 shadow-[0_10px_30px_-20px_rgba(22,119,255,0.5)] ring-2 ring-blue-500/10"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30")
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
                    <Icon name="document" className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    {template.isSystem ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        Sistem
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-400 shadow-sm">
                      v{template.version}
                    </span>
                    {active ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1677FF] text-white">
                        <Icon
                          name="check"
                          className="h-3.5 w-3.5"
                          strokeWidth={2.5}
                        />
                      </span>
                    ) : null}
                  </div>
                </div>

                <h3 className="mt-4 text-xs font-bold text-slate-900">
                  {template.name}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
      {error ? (
        <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
