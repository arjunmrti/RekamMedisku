import Icon, { type IconName } from "../ui/Icon";
import { loadActiveRotation } from "../../data/localRotations";

type SidebarProps = {
  activeItem: string;
  onNavigate: (label: string) => void;
};

const groups: Array<{ label: string; item: string; icon: IconName }> = [
  { label: "Pasien", item: "Daftar Pasien", icon: "users" },
  { label: "Laporan", item: "Semua Laporan", icon: "document" },
  { label: "Data", item: "Cadangan & Data", icon: "database" },
];

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors " +
        (active
          ? "bg-[#EAF4FF] font-semibold text-[#1677FF]"
          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900")
      }
    >
      <Icon
        name={icon}
        className={
          "h-[18px] w-[18px] " +
          (active ? "text-[#1677FF]" : "text-slate-400")
        }
      />
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const activeRotation = loadActiveRotation();

  return (
    <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col overflow-hidden border-r border-[#E5EAF1] bg-[#F8FBFF] lg:flex">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex h-[72px] items-center gap-3 px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1677FF] text-white shadow-sm shadow-blue-500/20">
            <Icon name="pulse" className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="block text-[17px] font-bold leading-tight tracking-tight text-[#102A56]">
              RekamMedisku
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-slate-400">
              Catat · Pantau · Laporkan
            </span>
          </div>
        </div>

        <nav className="space-y-4 px-3 py-3" aria-label="Navigasi utama">
          <NavButton
            label="Beranda"
            icon="home"
            active={activeItem === "Beranda"}
            onClick={() => onNavigate("Beranda")}
          />

          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {group.label}
              </div>
              <NavButton
                label={group.item}
                icon={group.icon}
                active={
                  activeItem === group.item ||
                  (group.item === "Daftar Pasien" &&
                    ["Profil Pasien", "Follow-Up Baru"].includes(activeItem))
                }
                onClick={() => onNavigate(group.item)}
              />
            </div>
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-[#E5EAF1] bg-[#F8FBFF] p-3">
        <button
          type="button"
          onClick={() => onNavigate("Stase Saya")}
          className={
            "flex min-h-[58px] w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors " +
            (activeItem === "Stase Saya"
              ? "border-blue-200 bg-blue-50"
              : "border-blue-100 bg-blue-50/70 hover:bg-blue-100/60")
          }
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Icon
                name={
                  activeRotation.specialty === "Neurologi"
                    ? "brain"
                    : "stethoscope"
                }
                className="h-4 w-4"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase leading-none tracking-wider text-slate-400">
                Stase Aktif
              </span>
              <span className="text-xs font-bold tracking-tight text-slate-800">
                {activeRotation.name}
              </span>
            </div>
          </div>
          <Icon name="chevron" className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}
