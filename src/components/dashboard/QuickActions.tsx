import Icon from "../ui/Icon";

const actions = [
  { label: "Follow-Up Baru", icon: "plus-user", primary: true },
  { label: "Buat Laporan", icon: "document", primary: false },
  { label: "Tambah Pasien", icon: "plus-user", primary: false },
  { label: "Lihat Semua Pasien", icon: "users", primary: false },
] as const;

export default function QuickActions() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="bolt" className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">Aksi Cepat</h3>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => (
          <button
            type="button"
            key={action.label}
            className={`flex min-h-11 items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              action.primary
                ? "justify-center bg-blue-600 text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:bg-blue-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon name={action.icon} className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
