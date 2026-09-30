import { useMemo } from "react";
import Icon from "../ui/Icon";
import type { FollowUpTemplateAnswers, FollowUpTemplateDefinition, FollowUpTemplateField } from "../../types/followUpTemplate";

type FollowUpTemplateRendererProps = {
  definition: FollowUpTemplateDefinition;
  answers: FollowUpTemplateAnswers;
  onChange: (answers: FollowUpTemplateAnswers) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
};

function readValue(field: FollowUpTemplateField, answers: FollowUpTemplateAnswers) {
  const value = answers[field.id];
  if (field.type === "multiselect") return Array.isArray(value) ? value : [];
  if (field.type === "checkbox") return value === true;
  return value ?? "";
}

export default function FollowUpTemplateRenderer({ definition, answers, onChange, openSections, onToggleSection }: FollowUpTemplateRendererProps) {
  const fieldCount = useMemo(() => definition.sections.reduce((count, section) => count + section.fields.length, 0), [definition]);
  const setFieldValue = (fieldId: string, value: string | number | boolean | string[] | null) => onChange({ ...answers, [fieldId]: value });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1677FF] shadow-sm"><Icon name="document" className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">Template Follow-Up</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Form ini dirender dari template yang dipilih pada stase aktif. {fieldCount} field tersedia.</p>
          </div>
        </div>
      </div>
      {definition.sections.map((section, index) => {
        const open = openSections[section.id] ?? true;
        const filled = section.fields.filter((field) => {
          const value = readValue(field, answers);
          return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : Boolean(value);
        }).length;
        return (
          <section key={section.id} id={"follow-up-template-section-" + section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
            <button type="button" onClick={() => onToggleSection(section.id)} className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 text-left sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">{String(index + 1).padStart(2, "0")}</span><h3 className="text-sm font-bold text-slate-900">{section.title}</h3></div>
                {section.description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{section.description}</p> : null}
              </div>
              <span className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-slate-400">{filled}/{section.fields.length}<Icon name="chevron" className={"h-4 w-4 transition-transform " + (open ? "rotate-180" : "")} /></span>
            </button>
            {open ? <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {section.fields.map((field) => {
                const value = readValue(field, answers);
                const describedBy = field.helpText ? "template-help-" + section.id + "-" + field.id : undefined;
                return (
                  <div key={field.id} className={
                      field.type === "textarea" ||
                      field.type === "multiselect" ||
                      field.type === "radio"
                        ? "block sm:col-span-2"
                        : "block"
                    }>
                    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">{field.label}{field.required ? <span className="text-rose-500">*</span> : null}{field.unit ? <span className="font-medium text-slate-400">({field.unit})</span> : null}</span>
                    {field.type === "textarea" ? <textarea required={field.required} value={String(value)} rows={field.rows ?? 4} placeholder={field.placeholder} aria-describedby={describedBy} onChange={(event) => setFieldValue(field.id, event.target.value)} className="field-control min-h-28 resize-y" /> : field.type === "select" ? <select required={field.required} value={String(value)} onChange={(event) => setFieldValue(field.id, event.target.value)} className="field-control"><option value="">{field.placeholder ?? "Pilih..."}</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "radio" ? <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">{(field.options ?? []).map((option) => { const selected = value === option.value; return <label key={option.value} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><input type="radio" name={"template-" + section.id + "-" + field.id} value={option.value} checked={selected} onChange={() => setFieldValue(field.id, option.value)} className="h-4 w-4 border-slate-300 text-[#1677FF] focus:ring-[#1677FF]" />{option.label}</label>; })}</div> : field.type === "multiselect" ? <div className="space-y-2 rounded-xl border border-slate-200 p-3">{(field.options ?? []).map((option) => { const selected = Array.isArray(value) && value.includes(option.value); return <label key={option.value} className="flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={selected} onChange={() => { const current = Array.isArray(value) ? value : []; setFieldValue(field.id, selected ? current.filter((item) => item !== option.value) : [...current, option.value]); }} className="h-4 w-4 rounded border-slate-300 text-[#1677FF] focus:ring-[#1677FF]" />{option.label}</label>; })}</div> : field.type === "checkbox" ? <div className="flex min-h-11 items-center rounded-xl border border-slate-200 px-3.5 py-2.5"><label className="flex items-center gap-3 text-xs font-medium text-slate-700"><input type="checkbox" checked={Boolean(value)} onChange={(event) => setFieldValue(field.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#1677FF] focus:ring-[#1677FF]" />{field.placeholder ?? "Ya"}</label></div> : <input
                        required={field.required}
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "date"
                              ? "date"
                              : field.type === "time"
                                ? "time"
                                : "text"
                        }
                        value={String(value)}
                        placeholder={field.placeholder}
                        aria-describedby={describedBy}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (field.type === "number") {
                            setFieldValue(field.id, raw === "" ? null : Number(raw));
                            return;
                          }
                          setFieldValue(field.id, raw);
                        }}
                        className="field-control"
                      />}
                    {field.helpText ? <span id={describedBy} className="mt-1.5 block text-[10px] leading-relaxed text-slate-400">{field.helpText}</span> : null}
                  </div>
                );
              })}
            </div> : null}
          </section>
        );
      })}
    </div>
  );
}
