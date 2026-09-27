import { useEffect, useMemo, useRef, useState } from "react";
import type { FollowUpEntry } from "../../types/followUp";
import type { PatientListItem } from "../../types/patient";
import Icon from "../ui/Icon";

type ReportPatientContextProps = {
  patient: PatientListItem;
  availablePatients: PatientListItem[];
  followUps: FollowUpEntry[];
  selectedFollowUp: FollowUpEntry;
  onPatientChange: (patientId: string) => void;
  onFollowUpChange: (id: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPatientLocation(patient: PatientListItem) {
  const locationName = patient.currentLocation?.name || patient.room;
  const bed = patient.currentLocation?.bed || patient.bed;

  return `${locationName} · Bed ${bed}`;
}

export default function ReportPatientContext({
  patient,
  availablePatients,
  followUps,
  selectedFollowUp,
  onPatientChange,
  onFollowUpChange,
}: ReportPatientContextProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return availablePatients;

    return availablePatients.filter((candidate) =>
      [
        candidate.name,
        candidate.rm,
        candidate.doctor,
        candidate.currentLocation?.name,
        candidate.room,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [availablePatients, searchQuery]);

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pickerOpen]);

  const selectPatient = (patientId: string) => {
    if (patientId === patient.id) {
      setPickerOpen(false);
      return;
    }

    onPatientChange(patientId);
    setPickerOpen(false);
    setSearchQuery("");
  };

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-[#1677FF]">
            {getInitials(patient.name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{patient.name}</h2>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {patient.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              RM {patient.rm} · {patient.age} tahun
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>Ruangan {getPatientLocation(patient)}</span>
              <span>DPJP: {patient.doctor}</span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[420px]">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4 lg:border-0 lg:bg-transparent lg:p-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <Icon name="user" className="h-3.5 w-3.5 text-[#1677FF]" />
                  Pasien laporan
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Ganti pasien tanpa meninggalkan Report Generator.
                </p>
              </div>

              <div className="relative shrink-0" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((current) => !current)}
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#1677FF] focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <Icon name="users" className="h-3.5 w-3.5" />
                  Ganti pasien
                  <Icon
                    name="chevron"
                    className={`h-3.5 w-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {pickerOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_-20px_rgba(15,23,42,0.28)]">
                    <div className="border-b border-slate-100 p-3">
                      <label className="sr-only" htmlFor="report-patient-search">
                        Cari pasien
                      </label>
                      <div className="relative">
                        <Icon
                          name="search"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="report-patient-search"
                          autoFocus
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Cari nama, RM, ruangan, atau DPJP..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1677FF] focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>

                    <div
                      className="max-h-72 overflow-y-auto p-2"
                      role="listbox"
                      aria-label="Daftar pasien aktif"
                    >
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((candidate) => {
                          const isSelected = candidate.id === patient.id;

                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => selectPatient(candidate.id)}
                              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[10px] font-bold text-[#1677FF]">
                                {getInitials(candidate.name)}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="truncate text-xs font-bold text-slate-800">
                                    {candidate.name}
                                  </span>
                                  {isSelected && (
                                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-[#1677FF]">
                                      Terpilih
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block truncate text-[10px] font-medium text-slate-400">
                                  RM {candidate.rm} · {getPatientLocation(candidate)} · DPJP{" "}
                                  {candidate.doctor}
                                </span>
                              </span>

                              {isSelected && (
                                <Icon
                                  name="check"
                                  className="mt-0.5 h-4 w-4 shrink-0 text-[#1677FF]"
                                />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Icon
                            name="users"
                            className="mx-auto h-5 w-5 text-slate-300"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            Pasien tidak ditemukan
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            Coba cari berdasarkan nama, nomor RM, ruangan, atau DPJP.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-3 lg:border-t lg:pt-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <Icon name="calendar" className="h-3.5 w-3.5 text-[#1677FF]" />
                Follow-Up yang dilaporkan
              </div>

              <select
                value={selectedFollowUp.id}
                onChange={(event) => onFollowUpChange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
              >
                {followUps.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    Follow-Up #{entry.number} · {entry.date} · {entry.time}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Data laporan diambil dari follow-up yang sudah tersimpan sehingga
                pengguna tidak perlu menginput ulang data klinis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
