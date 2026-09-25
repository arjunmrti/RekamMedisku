import Icon, { type IconName } from "../ui/Icon";

type QuickActionsProps = {
  onNavigate: (label: string) => void;
};

const actions: Array<{
  label: string;
  icon: IconName;
  target: string;
  primary: boolean;
}> = [
  {
    label: "Follow-Up Baru",
    icon: "plus-user",
    target: "Daftar Pasien",
    primary: true,
  },
  {
    label: "Buat Laporan",
    icon: "document",
    target: "Semua Laporan",
    primary: false,
  },
  {
    label: "Tambah Pasien",
    icon: "plus-user",
    target: "Daftar Pasien",
    primary: false,
  },
  {
    label: "Lihat Semua Pasien",
    icon: "users",
    target: "Daftar Pasien",
    primary: false,
  },
];

export default function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="bolt" className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-bold text-slate-900">Aksi Cepat</h2>
      </div>

      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onNavigate(action.target)}
            className={
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors " +
              (action.primary
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:bg-blue-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            <Icon name={action.icon} className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
