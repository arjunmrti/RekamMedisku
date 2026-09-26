import { useState, type FormEvent } from "react";
import Icon from "../ui/Icon";
import type {
  Rotation,
  RotationSpecialty,
  RotationStatus,
} from "../../types/rotation";

type RotationFormModalProps = {
  open: boolean;
  rotation: Rotation | null;
  onClose: () => void;
  onSubmit: (input: {
    id?: string;
    name: string;
    specialty: RotationSpecialty;
    startDate: string;
    endDate: string;
    status: RotationStatus;
  }) => void | Promise<void>;
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
}: RotationFormModalProps) {
  const [name, setName] = useState(() => rotation?.name ?? "");
  const [specialty, setSpecialty] =
    useState<RotationSpecialty>(() => rotation?.specialty ?? "Neurologi");
  const [startDate, setStartDate] = useState(
    () => rotation?.startDate ?? "2026-09-01",
  );
  const [endDate, setEndDate] = useState(
    () => rotation?.endDate ?? "2026-09-30",
  );
  const [status, setStatus] = useState<RotationStatus>(
    () => rotation?.status ?? "Mendatang",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isActiveRotation = rotation?.status === "Aktif";

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

    setErrorMessage("");
    setSubmitting(true);

    try {
      await onSubmit({
        id: rotation?.id,
        name,
        specialty,
        startDate,
        endDate,
        status,
      });

      onClose();
    } catch {
      setErrorMessage("Stase belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotation-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Status
            </span>
            <select
              value={status}
              disabled={isActiveRotation}
              onChange={(event) =>
                setStatus(event.target.value as RotationStatus)
              }
              className="field-control disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          {isActiveRotation ? (
            <p className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Stase aktif harus tetap berstatus Aktif. Pilih stase lain dari halaman Stase Saya untuk berpindah konteks.
            </p>
          ) : null}

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
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
