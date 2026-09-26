import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import {
  createSlaberanLocation,
  deleteSlaberanLocation,
  swapSlaberanLocations,
  syncSlaberanLocationsWithSupabase,
  updateSlaberanLocation,
} from "../../data/supabaseSlaberanLocations";
import { loadSlaberanLocations } from "../../data/localSlaberanLocations";
import { useWorkspaceSyncVersion } from "../../hooks/useWorkspaceSync";
import { loadPatients } from "../../data/localPatients";
import type {
  SlaberanLocation,
  SlaberanLocationType,
} from "../../types/slaberanLocation";

type Props = {
  onBack: () => void;
};

const TYPE_LABELS: Record<SlaberanLocationType, string> = {
  floor: "Lantai",
  ward: "Bangsal / Ruangan",
  special: "Unit Khusus",
};

function sortLocations(locations: SlaberanLocation[]) {
  return [...locations].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name, "id"),
  );
}

export default function SlaberanLocationManager({ onBack }: Props) {
  const [locations, setLocations] = useState<SlaberanLocation[]>(
    sortLocations(loadSlaberanLocations()),
  );
  const [type, setType] = useState<SlaberanLocationType>("floor");
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const patients = useMemo(() => loadPatients(), []);

  const floors = useMemo(
    () =>
      sortLocations(
        locations.filter((location) => location.type === "floor"),
      ),
    [locations],
  );

  const rootSpecials = useMemo(
    () =>
      sortLocations(
        locations.filter(
          (location) => location.type === "special" && !location.parentId,
        ),
      ),
    [locations],
  );

  const refresh = useCallback(async () => {
    setErrorMessage("");
    try {
      const next = await syncSlaberanLocationsWithSupabase();
      setLocations(sortLocations(next));
    } catch (error) {
      setLocations(sortLocations(loadSlaberanLocations()));
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Struktur lokasi gagal dimuat dari Supabase.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, workspaceSyncVersion]);

  useEffect(() => {
    if (type !== "ward") {
      setParentId("");
      return;
    }

    if (!parentId && floors[0]) {
      setParentId(floors[0].id);
    }

    if (parentId && !floors.some((floor) => floor.id === parentId)) {
      setParentId(floors[0]?.id ?? "");
    }
  }, [floors, parentId, type]);

  const getPatientCount = (location: SlaberanLocation) =>
    patients.filter((patient) => {
      const current = patient.currentLocation;

      if (current?.locationId) {
        return current.locationId === location.id;
      }

      const normalizedPatientName = (
        current?.name ??
        patient.room
      ).trim().toLowerCase();

      return (
        normalizedPatientName === location.name.trim().toLowerCase() &&
        (location.type === "special"
          ? current?.type === "special"
          : current?.type !== "special")
      );
    }).length;

  const siblingLocations = (location: SlaberanLocation) =>
    sortLocations(
      locations.filter(
        (candidate) =>
          candidate.type === location.type &&
          (candidate.parentId ?? "") === (location.parentId ?? "") &&
          candidate.isActive,
      ),
    );

  const move = async (location: SlaberanLocation, direction: -1 | 1) => {
    const siblings = siblingLocations(location);
    const index = siblings.findIndex((item) => item.id === location.id);
    const target = siblings[index + direction];

    if (!target || busy) return;

    setBusy(true);
    setErrorMessage("");
    try {
      await swapSlaberanLocations(location.id, target.id);
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Urutan lokasi gagal diubah.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Nama lokasi wajib diisi.");
      return;
    }

    if (type === "ward" && !parentId) {
      setErrorMessage("Bangsal wajib berada di dalam lantai.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      await createSlaberanLocation({
        type,
        name: trimmedName,
        parentId: type === "ward" ? parentId : undefined,
        sortOrder: sortLocations(
          locations.filter(
            (location) =>
              location.type === type &&
              (location.parentId ?? "") === (parentId || ""),
          ),
        ).length,
      });
      setName("");
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Lokasi gagal dibuat.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (location: SlaberanLocation) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMessage("Nama lokasi wajib diisi.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      await updateSlaberanLocation(location.id, { name: trimmed });
      setEditingId("");
      setEditingName("");
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nama lokasi gagal diubah.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (location: SlaberanLocation) => {
    setBusy(true);
    setErrorMessage("");
    try {
      await updateSlaberanLocation(location.id, {
        isActive: !location.isActive,
      });
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Status lokasi gagal diubah.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (location: SlaberanLocation) => {
    const children = locations.filter(
      (candidate) => candidate.parentId === location.id,
    );

    if (children.length) {
      setErrorMessage(
        "Lantai ini masih memiliki " +
          children.length +
          " bangsal. Hapus atau pindahkan bangsal terlebih dahulu.",
      );
      return;
    }

    if (!window.confirm('Hapus lokasi "' + location.name + '"?')) return;

    setBusy(true);
    setErrorMessage("");
    try {
      await deleteSlaberanLocation(location.id);
      await refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Lokasi gagal dihapus.",
      );
    } finally {
      setBusy(false);
    }
  };

  const renderLocationRow = (location: SlaberanLocation, depth = 0) => {
    const childCount = locations.filter(
      (candidate) => candidate.parentId === location.id,
    ).length;

    return (
      <div
        key={location.id}
        className={
          "rounded-xl border border-slate-200 bg-white p-3 " +
          (depth ? "ml-5 border-l-2 border-l-blue-100" : "")
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " +
                (location.type === "floor"
                  ? "bg-blue-50 text-[#1677FF]"
                  : location.type === "special"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-slate-50 text-slate-500")
              }
            >
              <Icon
                name={
                  location.type === "floor"
                    ? "layers"
                    : location.type === "special"
                      ? "alert"
                      : "document"
                }
                className="h-4 w-4"
              />
            </div>
            <div className="min-w-0 flex-1">
              {editingId === location.id ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-blue-200 px-3 py-2 text-xs outline-none focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleRename(location)}
                    disabled={busy}
                    className="rounded-lg bg-[#1677FF] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId("")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {location.name}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                      {TYPE_LABELS[location.type]}
                    </span>
                    {!location.isActive ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                        Nonaktif
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {getPatientCount(location)} pasien terhubung
                    {childCount ? " · " + childCount + " anak" : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void move(location, -1)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              aria-label={"Naikkan " + location.name}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => void move(location, 1)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              aria-label={"Turunkan " + location.name}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(location.id);
                setEditingName(location.name);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleToggle(location)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              {location.isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(location)}
              disabled={busy}
              className="rounded-lg border border-rose-100 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[#1677FF]"
          >
            <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
            Kembali ke Slaberan
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1677FF]">
            Workspace Slaberan · Location Manager
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Struktur lokasi
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Bentuk hierarki yang dipakai generator: Lantai → Bangsal, sementara
            CVCU/ICCU, ICU, dan IGD tetap menjadi unit khusus terpisah.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[11px] leading-relaxed text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1677FF]">
            <Icon name="plus" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tambah lokasi</h3>
            <p className="text-[10px] text-slate-400">
              Tentukan tipe dan hubungan sebelum lokasi disimpan.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px_auto]">
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as SlaberanLocationType)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1677FF]"
          >
            <option value="floor">Lantai</option>
            <option value="ward">Bangsal / Ruangan</option>
            <option value="special">Unit Khusus</option>
          </select>

          {type === "ward" ? (
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1677FF]"
            >
              <option value="">Pilih lantai induk</option>
              {floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="hidden lg:block" />
          )}

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              type === "floor"
                ? "Contoh: Lantai 1"
                : type === "special"
                  ? "Contoh: ICU"
                  : "Contoh: Anggrek"
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-[#1677FF]"
          />

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy || (type === "ward" && !floors.length)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Tambah
          </button>
        </div>

        {type === "ward" && floors.length === 0 ? (
          <p className="mt-2 text-[10px] text-amber-600">
            Buat minimal satu lantai sebelum menambahkan bangsal.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        {floors.map((floor) => (
          <div key={floor.id} className="space-y-2">
            {renderLocationRow(floor)}
            {sortLocations(
              locations.filter((location) => location.parentId === floor.id),
            ).map((ward) => renderLocationRow(ward, 1))}
          </div>
        ))}

        {sortLocations(
          locations.filter(
            (location) =>
              (location.type === "ward" || location.type === "special") &&
              !location.parentId,
          ),
        ).map((location) => renderLocationRow(location))}

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Icon name="alert" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Unit khusus dipisahkan dari bangsal
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Unit seperti ICU, IGD, dan CVCU/ICCU tidak akan dipaksa masuk ke
                lantai. Generator akan mengambilnya dari blok Unit Khusus.
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {rootSpecials.length} unit khusus aktif/tersimpan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
