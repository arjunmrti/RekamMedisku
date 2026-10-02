import { useEffect, useState, type FormEvent } from "react";
import Icon from "../ui/Icon";
import type {
  Rotation,
  RotationSpecialty,
  RotationStatus,
} from "../../types/rotation";
import type { FollowUpTemplateSummary } from "../../types/followUpTemplate";
import type { ReportTemplateSummary } from "../../types/reportTemplate";
import type { SystemFollowUpTemplateSummary } from "../../data/followUpTemplates";
import type { SlaberanTemplateRecord } from "../../types/slaberanTemplate";
import { loadSlaberanTemplates } from "../../data/localSlaberanTemplates";

type RotationFormModalProps = {
  open: boolean;
  rotation: Rotation | null;
  onClose: () => void;
  onSubmit: (input: {
    id?: string;
    updatedAt?: string;
    name: string;
    specialty: RotationSpecialty;
    institution?: string | null;
    startDate: string;
    endDate: string;
    status: RotationStatus;
    followUpTemplateId?: string;
    followUpTemplateVersion?: number;
    defaultReportTemplateId?: string;
    defaultReportTemplateVersion?: number;
    slaberanTemplateId?: string;
  }) => void | Promise<void>;
  followUpTemplates: FollowUpTemplateSummary[];
  reportTemplates?: ReportTemplateSummary[];
  systemFollowUpTemplates?: SystemFollowUpTemplateSummary[];
  onCloneSystemTemplate?: (templateId: string, name?: string) => Promise<{ templateId: string; version: number }>;
  onDuplicateTemplate?: (templateId: string) => Promise<{ templateId: string; name: string }>;
  onCreateTemplate: () => void;
};

const specialties: RotationSpecialty[] = [
  "Neurologi",
  "Ilmu Penyakit Dalam",
  "Bedah",
  "Pediatri",
  "Obgyn",
  "Lainnya",
];

const statuses: RotationStatus[] = ["Aktif", "Selesai", "Mendatang"];

export default function RotationFormModal({
  open,
  rotation,
  onClose,
  onSubmit,
  followUpTemplates,
  reportTemplates = [],
  systemFollowUpTemplates = [],
  onCloneSystemTemplate,
  onDuplicateTemplate,
  onCreateTemplate,
}: RotationFormModalProps) {
  const [name, setName] = useState(() => rotation?.name ?? "");
  const [specialty, setSpecialty] =
    useState<RotationSpecialty>(() => rotation?.specialty ?? "Neurologi");
  const [institution, setInstitution] = useState(() => rotation?.institution ?? "");
  const [startDate, setStartDate] = useState(
    () => rotation?.startDate ?? "2026-09-01",
  );
  const [endDate, setEndDate] = useState(
    () => rotation?.endDate ?? "2026-09-30",
  );
  const [status, setStatus] = useState<RotationStatus>(() => rotation?.status ?? "Mendatang");
  const [followUpTemplateId, setFollowUpTemplateId] = useState<string>(() => rotation?.followUpTemplateId ?? followUpTemplates[0]?.id ?? "");
  const [followUpTemplateVersion, setFollowUpTemplateVersion] = useState<number | undefined>(() => rotation?.followUpTemplateVersion ?? followUpTemplates[0]?.latestVersion);
  const [defaultReportTemplateId, setDefaultReportTemplateId] = useState<string>(() => rotation?.defaultReportTemplateId ?? "");
  const [defaultReportTemplateVersion, setDefaultReportTemplateVersion] = useState<number | undefined>(() => rotation?.defaultReportTemplateVersion);
  const [errorMessage, setErrorMessage] = useState("");
  const [slaberanTemplateId, setSlaberanTemplateId] = useState<string>(() => rotation?.slaberanTemplateId ?? "");
  const [slaberanTemplates, setSlaberanTemplates] = useState<SlaberanTemplateRecord[]>(() => loadSlaberanTemplates());
  const [submitting, setSubmitting] = useState(false);
  const [cloningTemplateId, setCloningTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(rotation?.name ?? "");
    setSpecialty(rotation?.specialty ?? "Neurologi");
    setInstitution(rotation?.institution ?? "");
    setStartDate(rotation?.startDate ?? "2026-09-01");
    setEndDate(rotation?.endDate ?? "2026-09-30");
    setStatus(rotation?.status ?? "Mendatang");
    setFollowUpTemplateId(rotation?.followUpTemplateId ?? "");
    setFollowUpTemplateVersion(rotation?.followUpTemplateVersion);
    setDefaultReportTemplateId(rotation?.defaultReportTemplateId ?? "");
    setDefaultReportTemplateVersion(rotation?.defaultReportTemplateVersion);
    setSlaberanTemplateId(rotation?.slaberanTemplateId ?? "");
    setSlaberanTemplates(loadSlaberanTemplates());
    setErrorMessage("");
  }, [open, rotation]);

  useEffect(() => {
    if (!open || rotation?.followUpTemplateId || followUpTemplateId || !followUpTemplates.length) return;
    const selected = followUpTemplates[0];
    setFollowUpTemplateId(selected.id);
    setFollowUpTemplateVersion(selected.latestVersion);
  }, [followUpTemplateId, followUpTemplates, open, rotation?.followUpTemplateId]);

  useEffect(() => {
    if (!followUpTemplateId) return;
    const selected = followUpTemplates.find((template) => template.id === followUpTemplateId);
    if (selected && (followUpTemplateVersion === undefined || selected.latestVersion < followUpTemplateVersion)) {
      setFollowUpTemplateVersion(selected.latestVersion);
    }
  }, [followUpTemplateId, followUpTemplateVersion, followUpTemplates]);

  const selectedTemplate = followUpTemplates.find((template) => template.id === followUpTemplateId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    if (!name.trim() || !startDate || !endDate) {
      setErrorMessage("Nama stase, tanggal mulai, dan tanggal selesai wajib diisi.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    if (status === "Aktif" && (!followUpTemplateId || !followUpTemplateVersion)) {
      setErrorMessage("Stase aktif wajib memiliki template follow-up.");
      return;
    }

    setErrorMessage("");
    setSubmitting(true);

    try {
      await onSubmit({
        id: rotation?.id,
        updatedAt: rotation?.updatedAt,
        name,
        specialty,
        institution: institution.trim() || null,
        startDate,
        endDate,
        status,
        followUpTemplateId: followUpTemplateId || undefined,
        followUpTemplateVersion: followUpTemplateVersion || undefined,
        defaultReportTemplateId: defaultReportTemplateId || undefined,
        defaultReportTemplateVersion: defaultReportTemplateVersion || undefined,
        slaberanTemplateId: slaberanTemplateId || undefined,
      });

      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Stase belum tersimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotation-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:max-w-xl md:max-w-2xl md:rounded-3xl">
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur sm:px-6 sm:pt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
              {rotation ? "Edit Stase" : "Stase Baru"}
            </p>
            <h2 id="rotation-form-title" className="mt-1 text-lg font-bold text-slate-900">
              {rotation ? "Edit Stase" : "Tambah Stase"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Atur detail rotasi tanpa mengubah data pasien pada stase lain.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form stase"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama stase
            </span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Neurologi"
              className="field-control"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Specialty
            </span>
            <select
              value={specialty}
              onChange={(event) =>
                setSpecialty(event.target.value as RotationSpecialty)
              }
              className="field-control"
            >
              {specialties.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Institution</span>
            <input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Nama institusi (opsional)" className="field-control" />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Start date
              </span>
              <input
                required
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="field-control"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                End date
              </span>
              <input
                required
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field-control"
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Template Follow-Up <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Template Saya</span>
            </span>
            <div className="flex gap-2">
              <select
                value={followUpTemplateId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const next = followUpTemplates.find((template) => template.id === nextId);
                  setFollowUpTemplateId(nextId);
                  setFollowUpTemplateVersion(next?.latestVersion);
                }}
                className="field-control min-w-0 flex-1"
                disabled={followUpTemplates.length === 0}
              >
                <option value="">{followUpTemplates.length ? "Pilih template saya..." : "Belum ada template saya"}</option>
                {followUpTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · v{template.latestVersion}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onCreateTemplate}
                className="shrink-0 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Buat
              </button>
            </div>
            {selectedTemplate ? (
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                {selectedTemplate.description || "Template user-owned"} · versi {followUpTemplateVersion ?? selectedTemplate.latestVersion}
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] leading-relaxed text-amber-600">
                {status === "Aktif" ? "Pilih, buat, atau salin starter sebelum stase dapat diaktifkan." : "Pilih dari Template Saya, atau salin dari starter di bawah."}
              </p>
            )}

            {followUpTemplates.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {followUpTemplates.map((template) => (
                  <li key={template.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{template.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{template.description || "Template pribadi"} · v{template.latestVersion}</p>
                    </div>
                    {onDuplicateTemplate ? (
                      <button
                        type="button"
                        disabled={cloningTemplateId !== null}
                        onClick={async () => {
                          if (cloningTemplateId) return;
                          setCloningTemplateId(template.id);
                          try {
                            const result = await onDuplicateTemplate(template.id);
                            setFollowUpTemplateId(result.templateId);
                            setFollowUpTemplateVersion(1);
                          } finally {
                            setCloningTemplateId(null);
                          }
                        }}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cloningTemplateId === template.id ? "Menyalin..." : "Duplikasi"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {systemFollowUpTemplates.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700">
                  Starter · hanya baca
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-amber-700/80">
                  Salin ke Template Saya untuk dipakai. Starter tidak bisa diedit atau diarsipkan.
                </p>
                <ul className="mt-2 space-y-2">
                  {systemFollowUpTemplates.map((template) => (
                    <li key={template.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{template.name}</p>
                        <p className="truncate text-[10px] text-slate-400">{template.description || "Template starter sistem"} · v{template.latestVersion}</p>
                      </div>
                      <button
                        type="button"
                        disabled={cloningTemplateId !== null}
                        onClick={async () => {
                          if (!onCloneSystemTemplate || cloningTemplateId) return;
                          setCloningTemplateId(template.id);
                          try {
                            const result = await onCloneSystemTemplate(template.id);
                            setFollowUpTemplateId(result.templateId);
                            setFollowUpTemplateVersion(result.version);
                          } finally {
                            setCloningTemplateId(null);
                          }
                        }}
                        className="shrink-0 rounded-lg bg-[#1677FF] px-2.5 py-2 text-[10px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cloningTemplateId === template.id ? "Menyalin..." : "Salin"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Template Report Default
            </span>
            <select
              value={defaultReportTemplateId}
              onChange={(event) => {
                const id = event.target.value;
                setDefaultReportTemplateId(id);
                setDefaultReportTemplateVersion(reportTemplates.find((template) => template.id === id)?.latestVersion);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700"
            >
              <option value="">Tidak ada</option>
              {reportTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.name} · v{template.latestVersion}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Template Slaberan
            </span>
            <select
              value={slaberanTemplateId}
              onChange={(event) => setSlaberanTemplateId(event.target.value)}
              className="field-control"
            >
              <option value="">Tanpa template Slaberan</option>
              {slaberanTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              Template Slaberan dipilih dari workspace akun ini.
            </p>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Status
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RotationStatus)
              }
              className="field-control"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>


          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="-mx-5 sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 sm:pb-1 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="check" className="h-4 w-4" />
              {submitting ? "Menyimpan..." : "Simpan Stase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
