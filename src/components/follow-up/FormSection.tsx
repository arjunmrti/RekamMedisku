import type { ReactNode } from "react";

type FormSectionProps = {
  number: string;
  title: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  action?: ReactNode;
  meta?: string;
};

export default function FormSection({
  number,
  title,
  icon,
  open,
  onToggle,
  children,
  action,
  meta,
}: FormSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#1677FF]">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
                {number}
              </span>
              <span className="truncate text-sm font-bold text-slate-800">
                {title}
              </span>
            </span>
            {meta ? (
              <span className="mt-1 block text-[10px] font-medium text-slate-400">
                {meta}
              </span>
            ) : null}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            aria-label={open ? "Tutup bagian" : "Buka bagian"}
          >
            <span className={"text-base transition-transform " + (open ? "rotate-180" : "")}>
             ⌄
            </span>
          </button>
        </div>
      </div>

      {open ? <div className="p-5 sm:p-6">{children}</div> : null}
    </section>
  );
}