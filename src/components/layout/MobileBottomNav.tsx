import Icon, { type IconName } from "../ui/Icon";

type MobileBottomNavProps = {
  activeItem: string;
  onNavigate: (label: string) => void;
};

const items: Array<{
  label: string;
  target: string;
  icon: IconName;
  match: string[];
}> = [
  { label: "Beranda", target: "Beranda", icon: "home", match: ["Beranda"] },
  {
    label: "Pasien",
    target: "Daftar Pasien",
    icon: "users",
    match: ["Pasien", "Daftar Pasien", "Profil Pasien", "Follow-Up Baru"],
  },
  {
    label: "Laporan",
    target: "Semua Laporan",
    icon: "document",
    match: ["Laporan", "Semua Laporan"],
  },
  {
    label: "Data",
    target: "Cadangan & Data",
    icon: "database",
    match: ["Data", "Cadangan & Data"],
  },
  { label: "Stase", target: "Stase Saya", icon: "layers", match: ["Stase Saya"] },
];

export default function MobileBottomNav({
  activeItem,
  onNavigate,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-1.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.match.includes(activeItem);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.target)}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors " +
                (active
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")
              }
            >
              <Icon
                name={item.icon}
                className="h-[18px] w-[18px]"
                strokeWidth={active ? 2.25 : 2}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
