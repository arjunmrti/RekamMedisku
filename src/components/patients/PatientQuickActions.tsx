import Icon from "../ui/Icon";

type PatientQuickActionsProps = {
  onAddPatient: () => void;
  onNavigate: (label: string) => void;
};

export default function PatientQuickActions({
  onAddPatient,
  onNavigate,
}: PatientQuickActionsProps) {
  const actions = [
    {
      label: "Follow-Up Baru",
      icon: "plus-user" as const,
      primary: true,
      onClick: () => onNavigate("Follow-Up Baru"),
    },
    {
      label: "Buat Laporan",
      icon: "document" as const,
      primary: false,
      onClick: () => onNavigate("Semua Laporan"),
    },
    {
      label: "Tambah Pasien",
      icon: "plus-user" as const,
      primary: false,
      onClick: onAddPatient,
    },
    {
      label: "Lihat Semua Pasien",
      icon: "users" as const,
      primary: false,
      onClick: () => onNavigate("Daftar Pasien"),
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="bolt" className="h-4 w-4 text-[#1677FF]" />
        <h2 className="text-sm font-bold text-slate-900">Aksi Cepat</h2>
      </div>

      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors " +
              (action.primary
                ? "bg-[#1677FF] text-white shadow-sm shadow-blue-200 hover:bg-blue-700"
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
