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
    <div className="overflow-x-auto border-b border-slate-200/90">
      <div className="flex min-w-max gap-7 text-sm font-semibold">
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              type="button"
              key={tab}
              onClick={() => onChange(tab)}
              className={
                "border-b-2 pb-3.5 pt-1 transition " +
                (active
                  ? "border-[#1677FF] text-[#1677FF]"
                  : "border-transparent text-slate-500 hover:text-slate-800")
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
