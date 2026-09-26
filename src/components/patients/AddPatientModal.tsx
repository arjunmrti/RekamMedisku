import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  PatientListItem,
  PatientLocationType,
} from "../../types/patient";
import {
  normalizePatientAdmissionLocation,
  normalizePatientLocation,
} from "../../utils/patientLocation";
import type { Rotation } from "../../types/rotation";
import { createPatientId } from "../../data/localPatients";
import {
  loadSlaberanLocations,
  saveSlaberanLocations,
} from "../../data/localSlaberanLocations";
import { syncSlaberanLocationsWithSupabase } from "../../data/supabaseSlaberanLocations";
import { toLocalIsoDate } from "../../utils/date";
import Icon from "../ui/Icon";

type AddPatientModalProps = {
  open: boolean;
  onClose: () => void;
  rotation: Rotation;
  patient?: PatientListItem | null;
  onSubmit: (patient: PatientListItem) => string | null | Promise<string | null>;
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
  const initialCurrentLocation = normalizePatientLocation(
    patient?.currentLocation,
    patient?.room,
    patient?.bed,
  );
  const [currentLocationType, setCurrentLocationType] =
    useState<PatientLocationType>(() => initialCurrentLocation.type);
  const [currentLocationId, setCurrentLocationId] = useState(
    () => initialCurrentLocation.locationId ?? "",
  );
  const [currentLocationName, setCurrentLocationName] =
    useState(() => initialCurrentLocation.name);
  const [bed, setBed] = useState(() => initialCurrentLocation.bed);
  const [locations, setLocations] = useState(() => loadSlaberanLocations());
  const initialAdmissionLocation = normalizePatientAdmissionLocation(
    patient?.admissionLocation,
  );
  const [admissionLocationType, setAdmissionLocationType] =
    useState<PatientLocationType | "">(
      () => initialAdmissionLocation?.type ?? "",
    );
  const [admissionLocationId, setAdmissionLocationId] = useState(
    () => initialAdmissionLocation?.locationId ?? "",
  );
  const [admissionLocationName, setAdmissionLocationName] = useState(
    () => initialAdmissionLocation?.name ?? "",
  );
  const [admissionDate, setAdmissionDate] = useState(
    () => patient?.admissionDate ?? toLocalIsoDate(),
  );
  const [admissionComplaint, setAdmissionComplaint] = useState(
    () => patient?.admissionComplaint ?? "",
  );
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

    let cancelled = false;

    void syncSlaberanLocationsWithSupabase()
      .then((nextLocations) => {
        if (cancelled) return;
        setLocations(nextLocations);
      })
      .catch(() => {
        if (!cancelled) {
          setLocations(loadSlaberanLocations());
        }
      });

    setAdmissionDate(patient?.admissionDate ?? toLocalIsoDate());
    const currentLocation = normalizePatientLocation(
      patient?.currentLocation,
      patient?.room,
      patient?.bed,
    );
    setCurrentLocationType(currentLocation.type);
    setCurrentLocationId(currentLocation.locationId ?? "");
    setCurrentLocationName(currentLocation.name);
    setBed(currentLocation.bed);
    const admissionLocation = normalizePatientAdmissionLocation(
      patient?.admissionLocation,
    );
    setAdmissionLocationType(admissionLocation?.type ?? "");
    setAdmissionLocationId(admissionLocation?.locationId ?? "");
    setAdmissionLocationName(admissionLocation?.name ?? "");
  }, [open, patient?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    const parsedAge = Number(age);
    if (!name.trim() || !rm.trim() || !Number.isFinite(parsedAge) || parsedAge < 0) {
      setErrorMessage("Nama, nomor RM, dan usia harus diisi dengan benar.");
      return;
    }

    if (!currentLocationName.trim() || !bed.trim()) {
      setErrorMessage("Lokasi pasien saat ini dan nomor bed wajib diisi.");
      return;
    }

    if (!admissionDate) {
      setErrorMessage("Tanggal masuk pasien wajib diisi.");
      return;
    }

    const selectedCurrentLocation = locations.find(
      (location) => location.id === currentLocationId,
    );
    const selectedAdmissionLocation = locations.find(
      (location) => location.id === admissionLocationId,
    );

    setErrorMessage("");
    setSubmitting(true);

    try {
      const result = await onSubmit({
        id: patient?.id ?? createPatientId(rotation.id, rm),
      rotationId: patient?.rotationId ?? rotation.id,
      name: name.trim(),
      age: parsedAge,
      gender,
      rm: rm.trim(),
      doctor: doctor.trim() || "Belum ditentukan",
      lastFollowUp: patient?.lastFollowUp ?? "Belum ada follow-up",
      followUpNumber: patient?.followUpNumber ?? 0,
      lastFollowUpAt: patient?.lastFollowUpAt,
      createdAt: patient?.createdAt ?? new Date().toISOString(),
      updatedAt: patient?.updatedAt,
      admissionDate,
      admissionComplaint: admissionComplaint.trim() || undefined,
      currentLocation: {
        ...(currentLocationId ? { locationId: currentLocationId } : {}),
        type: selectedCurrentLocation?.type ?? currentLocationType,
        name: selectedCurrentLocation?.name ?? currentLocationName.trim(),
        bed: bed.trim(),
      },
      room: currentLocationName.trim(),
      bed: bed.trim(),
      admissionLocation:
        admissionLocationType && admissionLocationName.trim()
          ? {
              ...(admissionLocationId ? { locationId: admissionLocationId } : {}),
              type: selectedAdmissionLocation?.type ?? admissionLocationType,
              name:
                selectedAdmissionLocation?.name ??
                admissionLocationName.trim(),
            }
          : undefined,
      status: patient?.status ?? "Aktif",
      });

      if (result) {
        setErrorMessage(result);
        return;
      }

      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pasien belum tersimpan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentLocationOptions = useMemo(
    () => locations.filter((location) => location.type === currentLocationType && location.type !== "floor"),
    [currentLocationType, locations],
  );

  const specialLocationOptions = useMemo(
    () => locations.filter((location) => location.type === "special"),
    [locations],
  );

  const formatLocationOption = (locationId: string) => {
    const location = locations.find((item) => item.id === locationId);
    if (!location) return "";
    if (!location.parentId) return location.name;

    const parent = locations.find((item) => item.id === location.parentId);
    return parent ? parent.name + " · " + location.name : location.name;
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
            disabled={submitting}
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

          <Field label="Tanggal Masuk">
            <input
              required
              type="date"
              value={admissionDate}
              onChange={(event) => setAdmissionDate(event.target.value)}
              className="field-control"
            />
          </Field>

          <Field label="Keluhan Saat Masuk">
            <textarea
              maxLength={1000}
              rows={3}
              value={admissionComplaint}
              onChange={(event) => setAdmissionComplaint(event.target.value)}
              placeholder="Keluhan utama saat pertama masuk rumah sakit..."
              className="field-control min-h-24 resize-none leading-relaxed"
            />
            <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
              Disimpan sebagai konteks awal pasien dan akan tampil otomatis pada setiap Follow-Up.
            </span>
          </Field>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-800">
                Lokasi Pasien Saat Ini
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Menentukan lokasi aktif pasien untuk kebutuhan Slaberan dan
                perpindahan pasien berikutnya.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Jenis Lokasi">
                <select
                  value={currentLocationType}
                  onChange={(event) =>
                    setCurrentLocationType(
                      event.target.value as PatientLocationType,
                    )
                  }
                  className="field-control"
                >
                  <option value="ward">Bangsal / Ruangan</option>
                  <option value="special">Unit Khusus</option>
                </select>
              </Field>

              <Field
                label={
                  currentLocationType === "special"
                    ? "Nama Unit"
                    : "Nama Bangsal / Ruangan"
                }
              >
                {currentLocationOptions.length > 0 ? (
                  <select
                    required
                    value={currentLocationId}
                    onChange={(event) => {
                      const location = locations.find(
                        (item) => item.id === event.target.value,
                      );
                      setCurrentLocationId(event.target.value);
                      setCurrentLocationType(
                        location?.type === "special" ? "special" : "ward",
                      );
                      setCurrentLocationName(location?.name ?? "");
                    }}
                    className="field-control"
                  >
                    <option value="">Pilih lokasi</option>
                    {currentLocationOptions.map((location) => (
                      <option key={location.id} value={location.id}>
                        {formatLocationOption(location.id)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={currentLocationName}
                    onChange={(event) => {
                      setCurrentLocationId("");
                      setCurrentLocationName(event.target.value);
                    }}
                    placeholder={
                      currentLocationType === "special"
                        ? "Contoh: ICU / IGD / CVCU/ICCU"
                        : "Contoh: Anggrek"
                    }
                    className="field-control"
                  />
                )}
              </Field>
            </div>

            <div className="mt-4">
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-800">
                Lokasi Masuk Pertama
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Opsional. Ini mencatat pasien pertama kali masuk dari lokasi
                mana dan tidak mengubah lokasi pasien saat ini.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Jenis Lokasi Masuk">
                <select
                  value={admissionLocationType}
                  onChange={(event) =>
                    setAdmissionLocationType(
                      event.target.value as PatientLocationType | "",
                    )
                  }
                  className="field-control"
                >
                  <option value="">Belum diisi</option>
                  <option value="ward">Bangsal / Ruangan</option>
                  <option value="special">Unit Khusus</option>
                </select>
              </Field>

              <Field label="Nama Lokasi Masuk">
                {admissionLocationType &&
                (admissionLocationType === "special"
                  ? specialLocationOptions
                  : locations.filter((location) => location.type === "ward")).length > 0 ? (
                  <select
                    value={admissionLocationId}
                    onChange={(event) => {
                      const location = locations.find(
                        (item) => item.id === event.target.value,
                      );
                      setAdmissionLocationId(event.target.value);
                      setAdmissionLocationType(location?.type ?? "ward");
                      setAdmissionLocationName(location?.name ?? "");
                    }}
                    disabled={!admissionLocationType}
                    className="field-control disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Pilih lokasi</option>
                    {locations
                      .filter((location) => location.type === admissionLocationType)
                      .map((location) => (
                        <option key={location.id} value={location.id}>
                          {formatLocationOption(location.id)}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    value={admissionLocationName}
                    onChange={(event) => {
                      setAdmissionLocationId("");
                      setAdmissionLocationName(event.target.value);
                    }}
                    placeholder="Contoh: IGD"
                    disabled={!admissionLocationType}
                    className="field-control disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                )}
              </Field>
            </div>
          </section>

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
              disabled={submitting}
              className="min-h-11 rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Icon name="check" className="h-4 w-4" />
              {submitting
                ? "Menyimpan..."
                : editing
                  ? "Simpan Perubahan"
                  : "Simpan Pasien"}
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
