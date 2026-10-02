import { useEffect, useMemo, useState, type FormEvent } from "react";
import Icon from "../ui/Icon";
import type { FollowUpTemplateDefinition, FollowUpTemplateField, FollowUpTemplateFieldType, FollowUpTemplateSection } from "../../types/followUpTemplate";
import { createFollowUpTemplate } from "../../data/followUpTemplates";
import { validateFollowUpTemplateDefinition } from "../../utils/followUpTemplate";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string) => void;
};

const fieldTypes: FollowUpTemplateFieldType[] = ["text","textarea","number","select","multiselect","checkbox"];

function slugify(value: string, fallback: string) {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return normalized || fallback;
}

function makeField(index: number): FollowUpTemplateField {
  return { id: "field-" + (index + 1), label: "Field " + (index + 1), type: "text", required: false };
}

function makeSection(index: number): FollowUpTemplateSection {
  return { id: "section-" + (index + 1), title: "Section " + (index + 1), fields: [makeField(0)] };
}

export default function FollowUpTemplateBuilderModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<FollowUpTemplateSection[]>([makeSection(0)]);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setSections([makeSection(0)]);
    setErrorMessage("");
    setSubmitting(false);
  }, [open]);

  const fieldCount = useMemo(() => sections.reduce((sum, section) => sum + section.fields.length, 0), [sections]);

  const updateSection = (sectionId: string, updater: (section: FollowUpTemplateSection) => FollowUpTemplateSection) => setSections((current) => current.map((section) => section.id === sectionId ? updater(section) : section));
  const addSection = () => setSections((current) => [...current, makeSection(current.length)]);
  const removeSection = (sectionId: string) => setSections((current) => current.length <= 1 ? current : current.filter((section) => section.id !== sectionId));
  const addField = (sectionId: string) => updateSection(sectionId, (section) => ({ ...section, fields: [...section.fields, makeField(section.fields.length)] }));
  const removeField = (sectionId: string, fieldId: string) => updateSection(sectionId, (section) => ({ ...section, fields: section.fields.length <= 1 ? section.fields : section.fields.filter((field) => field.id !== fieldId) }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setErrorMessage("");
    try {
      if (!name.trim()) throw new Error("Nama template wajib diisi.");
      const normalizedSections = sections.map((section) => ({
        ...section,
        id: slugify(section.id, "section-" + (sections.indexOf(section) + 1)),
        title: section.title.trim(),
        fields: section.fields.map((field, fieldIndex) => ({
          ...field,
          id: slugify(field.id, "field-" + (fieldIndex + 1)),
          label: field.label.trim(),
          ...(field.type === "select" || field.type === "multiselect" ? {
            options: (field.options ?? []).map((option) => ({ value: slugify(option.value, "option"), label: option.label.trim() })).filter((option) => option.label && option.value),
          } : { options: undefined }),
        })),
      }));
      const definition: FollowUpTemplateDefinition = validateFollowUpTemplateDefinition({ schema_version: 1, sections: normalizedSections });
      setSubmitting(true);
      const result = await createFollowUpTemplate({ name, description, definition });
      onCreated(result.templateId);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Template gagal dibuat.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-template-builder-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:max-w-4xl md:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">Template Builder</p><h2 id="follow-up-template-builder-title" className="mt-1 text-lg font-bold text-slate-900">Buat Template Follow-Up</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Susun field berdasarkan kebutuhan Anda. Tidak ada field klinis yang dikunci oleh specialty tertentu.</p></div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50">×</button>
        </div>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Nama template</span><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Contoh: Follow-Up Harian" className="field-control" required /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Deskripsi</span><input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Konteks penggunaan template" className="field-control" /></label>
          </div>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Struktur Template</h3><p className="mt-1 text-[11px] text-slate-400">{sections.length} section · {fieldCount} field</p></div><button type="button" onClick={addSection} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Icon name="plus" className="h-4 w-4" />Tambah Section</button></div>
          <div className="space-y-4">
            {sections.map((section) => <section key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input value={section.id} onChange={(e)=>updateSection(section.id, (s)=>({...s,id:e.target.value}))} className="field-control" aria-label="Section ID" placeholder="section-id" />
                  <input value={section.title} onChange={(e)=>updateSection(section.id, (s)=>({...s,title:e.target.value}))} className="field-control" aria-label="Judul section" placeholder="Judul section" />
                </div>
                <button type="button" onClick={()=>removeSection(section.id)} disabled={sections.length<=1} className="h-10 rounded-xl px-3 text-xs font-semibold text-slate-400 hover:bg-slate-50 disabled:opacity-40">Hapus</button>
              </div>
              <input value={section.description ?? ""} onChange={(e)=>updateSection(section.id,(s)=>({...s,description:e.target.value}))} className="field-control mt-3" placeholder="Deskripsi section (opsional)" />
              <div className="mt-4 space-y-3">
                {section.fields.map((field, fieldIndex) => <div key={field.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.2fr_180px_auto]">
                    <input value={field.id} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,id:e.target.value}:f)}))} className="field-control" placeholder="field-id" aria-label={"ID field "+(fieldIndex+1)} />
                    <input value={field.label} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,label:e.target.value}:f)}))} className="field-control" placeholder="Label field" aria-label={"Label field "+(fieldIndex+1)} />
                    <select value={field.type} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,type:e.target.value as FollowUpTemplateFieldType}:f)}))} className="field-control" aria-label={"Tipe field "+(fieldIndex+1)}>{fieldTypes.map((type)=><option key={type} value={type}>{type}</option>)}</select>
                    <button type="button" onClick={()=>removeField(section.id,field.id)} disabled={section.fields.length<=1} className="h-11 rounded-xl px-3 text-xs font-semibold text-slate-400 hover:bg-white disabled:opacity-40">Hapus</button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input value={field.placeholder ?? ""} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,placeholder:e.target.value}:f)}))} className="field-control" placeholder="Placeholder" />
                    <input value={field.unit ?? ""} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,unit:e.target.value}:f)}))} className="field-control" placeholder="Unit, mis. mmHg" />
                    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(field.required)} onChange={(e)=>updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,required:e.target.checked}:f)}))} className="h-4 w-4 rounded border-slate-300 text-[#1677FF] focus:ring-[#1677FF]" />Wajib diisi</label>
                  </div>
                  {(field.type==="select" || field.type==="multiselect") ? <input value={(field.options ?? []).map((option)=>option.label).join(", ")} onChange={(e)=>{ const labels=e.target.value.split(",").map((item)=>item.trim()).filter(Boolean); updateSection(section.id,(s)=>({...s,fields:s.fields.map(f=>f.id===field.id?{...f,options:labels.map((label)=>({label,value:slugify(label,"option")}))}:f)})); }} className="field-control mt-3" placeholder="Opsi, pisahkan dengan koma" /> : null}
                </div>)}
                <button type="button" onClick={()=>addField(section.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white"><Icon name="plus" className="h-4 w-4" />Tambah Field</button>
              </div>
            </section>)}
          </div>
          {errorMessage ? <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700">{errorMessage}</div> : null}
          <div className="-mx-5 sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
            <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Icon name="check" className="h-4 w-4" />{submitting ? "Membuat..." : "Buat Template"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
