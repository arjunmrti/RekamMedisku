import Icon from "../ui/Icon";

type QuickActionsProps = {
  onNavigate: (label: string) => void;
};

const secondaryActions = [
  {
    label: "Buat Laporan",
    helper: "Ubah follow-up tersimpan",
    icon: "document" as const,
    target: "Semua Laporan",
  },
  {
    label: "Tambah Pasien",
    helper: "Masukkan pasien ke stase",
    icon: "plus-user" as const,
    target: "Daftar Pasien",
  },
  {
    label: "Lihat Pasien",
    helper: "Buka seluruh daftar",
    icon: "users" as const,
    target: "Daftar Pasien",
  },
];

export default function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-18px_rgba(16,42,86,0.18)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#1677FF]">
            <Icon name="bolt" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Aksi Cepat</h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Shortcut untuk workflow utama
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => onNavigate("Follow-Up Baru")}
          className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-[#1677FF] p-4 text-left text-white shadow-[0_12px_28px_-16px_rgba(22,119,255,0.7)] transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_16px_34px_-18px_rgba(22,119,255,0.75)] active:translate-y-0"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon name="plus-user" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold">Follow-Up Baru</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-blue-100">
                Catat perkembangan pasien hari ini.
              </span>
            </span>
          </span>
          <Icon
            name="arrow"
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {secondaryActions.slice(0, 2).map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.target)}
              className="group min-h-[86px] rounded-xl border border-slate-200 bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-[#1677FF]">
                <Icon name={action.icon} className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-[11px] font-bold text-slate-800">
                {action.label}
              </span>
              <span className="mt-1 block text-[9px] leading-relaxed text-slate-400">
                {action.helper}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onNavigate("Daftar Pasien")}
          className="group mt-2.5 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-left transition duration-200 hover:border-blue-200 hover:bg-blue-50/40"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
              <Icon name="users" className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[11px] font-bold text-slate-800">
                {secondaryActions[2].label}
              </span>
              <span className="block text-[9px] text-slate-400">
                {secondaryActions[2].helper}
              </span>
            </span>
          </span>
          <Icon
            name="chevron"
            className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </section>
  