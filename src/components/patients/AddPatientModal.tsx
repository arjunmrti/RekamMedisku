import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { PatientListItem } from "../../types/patient";
import type { Rotation } from "../../types/rotation";
import { createPatientId } from "../../data/localPatients";
import Icon from "../ui/Icon";

type AddPatientModalProps = {
  open: boolean;
  onClose: () => void;
  rotation: Rotation;
  patient?: PatientListItem | null;
  onSubmit: (patient: PatientListItem) => string | null;
};

export default function AddPatientModal({
  open,
  onClose,
  rotation,
  patient = null,
  onSubmit,
}: AddPatientModalProps) {
  const editing = Boolean(patient);
  const [name, setName] = useState(() => patient?.name ?? "");
  const [rm, setRm] = useState(() => patient?.rm ?? "");
  const [age, setAge] = useState(() => (patient?.age ? String(patient.age) : ""));
  const [gender, setGender] = useState<PatientListItem["gender"]>(
    () => patient?.gender ?? "Laki-laki",
  );
  const [doctor, setDoctor] = useState(() => patient?.doctor ?? "");
  const [room, setRoom] = useState(() => patient?.room ?? "");
  const [bed, setBed] = useState(() => patient?.bed ?? "");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAge = Number(age);
    if (!name.trim() || !rm.trim() || !Number.isFinite(parsedAge) || parsedAge < 0) {
      setErrorMessage("Nama, nomor RM, dan usia harus diisi dengan benar.");
      return;
    }

    if (!room.trim() || !bed.trim()) {
      setErrorMessage("Ruangan dan nomor bed wajib diisi.");
      return;
    }

    const result = onSubmit({
      id: patient?.id ?? createPatientId(rotation.id, rm),
      rotationId: patient?.rotationId ?? rotation.id,
      name: name.trim(),
      age: parsedAge,
      gender,
      rm: rm.trim(),
      room: room.trim(),
      bed: bed.trim(),
      doctor: doctor.trim() || "Belum ditentukan",
      lastFollowUp: patient?.lastFollowUp ?? "Belum ada follow-up",
      followUpNumber: patient?.followUpNumber ?? 0,
      lastFollowUpAt: patient?.lastFollowUpAt,
      createdAt: patient?.createdAt ?? new Date().toISOString(),
      admissionDate: patient?.admissionDate ?? new Date().toISOString().slice(0, 10),
      status: patient?.status ?? "Aktif",
    });

    if (result) {
      setErrorMessage(result);
      return;
    }

    setErrorMessage("");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
              {editing ? "Edit Pasien" : "Pasien Baru"}
            </p>
            <h2 id="patient-form-title" className="mt-1 text-lg font-bold text-slate-900">
              {editing ? "Edit Data Pasien" : "Tambah Pasien Baru"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {editing
                ? "Perbarui identitas pasien tanpa mengubah riwayat follow-up."
                : "Masukkan data pasien pada stase " + rotation.name + "."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Nama Lengkap Pasien">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Bima Pratama"
              className="field-control"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="No. Rekam Medis (RM)">
              <input
                required
                value={rm}
                onChange={(event) => setRm(event.target.value)}
                placeholder="Contoh: 24012607"
                className="field-control"
              />
            </Field>

            <Field label="Usia (Tahun)">
              <input
                required
                min="0"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Contoh: 24"
                type="number"
                className="field-control"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Jenis Kelamin">
              <select
                value={gender}
                onChange={(event) =>
                  setGender(event.target.value as PatientListItem["gender"])
                }
                className="field-control"
              >
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </Field>

            <Field label="DPJP (Dokter Spesialis)">
              <input
                required
                value={doctor}
                onChange={(event) => setDoctor(event.target.value)}
                placeholder="Contoh: dr. Nama, Sp.X"
                className="field-control"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ruangan / Bangsal">
              <input
                required
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="Contoh: 3A / ICU / Anggrek"
                className="field-control"
              />
            </Field>

            <Field label="Nomor Bed">
              <input
                required
                value={bed}
                onChange={(event) => setBed(event.target.value)}
                placeholder="Contoh: 15"
                className="field-control"
              />
            </Field>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Icon name="check" className="h-4 w-4" />
              {editing ? "Simpan Perubahan" : "Simpan Pasien"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
