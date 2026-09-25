type ProfileTab = "Ringkasan" | "Riwayat Follow-Up" | "Riwayat Hasil Pemeriksaan";

type ProfileTabsProps = {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
};

export type { ProfileTab };

export default function ProfileTabs({ activeTab, onChange }: ProfileTabsProps) {
  const tabs: ProfileTab[] = [
    "Ringkasan",
    "Riwayat Follow-Up",
    "Riwayat Hasil Pemeriksaan",
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5">
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              type="button"
              key={tab}
              onClick={() => onChange(tab)}
              className={
                "rounded-xl px-3.5 py-2.5 text-xs font-bold transition duration-200 sm:px-4 sm:text-sm " +
                (active
                  ? "bg-white text-[#1677FF] shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800")
              }
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
