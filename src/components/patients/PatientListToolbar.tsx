import Icon from "../ui/Icon";

type PatientListToolbarProps = {
  searchValue: string;
  status: "Semua" | "Aktif" | "Diarsipkan";
  room: string;
  rooms: string[];
  sort: "newest" | "oldest" | "name" | "bed";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "Semua" | "Aktif" | "Diarsipkan") => void;
  onRoomChange: (value: string) => void;
  onSortChange: (value: "newest" | "oldest" | "name" | "bed") => void;
  onReset: () => void;
};

export default function PatientListToolbar({
  searchValue,
  status,
  room,
  rooms,
  sort,
  onSearchChange,
  onStatusChange,
  onRoomChange,
  onSortChange,
  onReset,
}: PatientListToolbarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1 lg:min-w-[260px]">
          <span className="sr-only">Cari pasien</span>
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            placeholder="Cari nama pasien, RM, atau kata kunci..."
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#1677FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </label>

        <div className="hidden h-7 w-px bg-slate-200 lg:block" />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:flex lg:shrink-0">
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(
                event.target.value as "Semua" | "Aktif" | "Diarsipkan",
              )
            }
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 lg:min-h-10 lg:w-[150px] focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter status"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Diarsipkan">Diarsipkan</option>
          </select>

          <select
            value={room}
            onChange={(event) => onRoomChange(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter ruangan"
          >
            <option value="Semua">Semua Ruangan</option>
            {rooms.map((item) => (
              <option key={item} value={item}>
                Ruang {item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) =>
              onSortChange(
                event.target.value as "newest" | "oldest" | "name" | "bed",
              )
            }
            className="col-span-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-blue-500 md:col-span-1 lg:min-h-10 lg:w-[170px]"
            aria-label="Urutkan pasien"
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="oldest">Urutkan: Terlama</option>
            <option value="name">Urutkan: Nama (A-Z)</option>
            <option value="bed">Urutkan: No Bed</option>
          </select>
        </div>
      </div>

      <div className="mt-2.5 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={onReset}
          className="min-h-10 px-2 text-xs font-semibold text-[#1677FF]"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}
