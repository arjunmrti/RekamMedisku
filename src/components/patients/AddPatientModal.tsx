import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";

type AddPatientModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (patient: PatientListItem) => void;
};

const doctors = ["dr. Budi Santoso, Sp.N", "dr. Sari Dewi, Sp.N"];
const rooms = ["3A", "3B", "4A"];

export default function AddPatientModal({
  open,
  onClose,
  onSubmit,
}: AddPatientModalProps) {
  const [name, setName] = useState("");
  const [rm, setRm] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] =
    useState<PatientListItem["gender"]>("Laki-laki");
  const [doctor, setDoctor] = useState(doctors[0]);
  const [room, setRoom] = useState(rooms[0]);
  const [bed, setBed] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const resetForm = () => {
    setName("");
    setRm("");
    setAge("");
    setGender("Laki-laki");
    setDoctor(doctors[0]);
    setRoom(rooms[0]);
    setBed("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAge = Number(age);
    if (!name.trim() || !rm.trim() || !parsedAge || !bed.trim()) return;

    onSubmit({
      id: "p-" + rm.trim(),
      name: name.trim(),
      age: parsedAge,
      gender,
      rm: rm.trim(),
      room,
      bed: bed.trim(),
      doctor,
      lastFollowUp: "Belum ada follow-up",
      followUpNumber: 0,
      status: "Aktif",
    });

    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-patient-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="add-patient-title" className="text-lg font-bold text-slate-900">
              Tambah Pasien Baru
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Masukkan data pasien pada stase Neurologi.
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
              <select
                value={doctor}
                onChange={(event) => setDoctor(event.target.value)}
                className="field-control"
              >
                {doctors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ruangan / Bangsal">
              <select
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                className="field-control"
              >
                {rooms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
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
              Simpan Pasien
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
