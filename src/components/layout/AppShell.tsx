import type { ReactNode } from "react";
import { useState } from "react";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import Icon, { type IconName } from "../ui/Icon";

export type NavigationProps = {
  activeItem: string;
  onNavigate: (label: string) => void;
};

type AppShellProps = NavigationProps & {
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
};

export default function AppShell({
  activeItem,
  onNavigate,
  searchValue,
  onSearchChange,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (label: string) => {
    onNavigate(label);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar activeItem={activeItem} onNavigate={navigate} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          {children}
        </div>
      </div>

      <MobileBottomNav activeItem={activeItem} onNavigate={navigate} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-900/20"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative h-full w-[280px] max-w-[86vw] border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-5 flex items-center justify-between px-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Navigasi
                </p>
                <p className="text-base font-bold text-slate-900">
                  RekamMedisku
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu navigasi"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-lg text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {[
                { label: "Beranda", icon: "home" as IconName },
                { label: "Daftar Pasien", icon: "users" as IconName },
                { label: "Semua Laporan", icon: "document" as IconName },
                { label: "Cadangan & Data", icon: "database" as IconName },
                { label: "Pengaturan", icon: "settings" as IconName },
              ].map((item) => {
                const active = activeItem === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.label)}
                    className={"flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm " + (
                      active
                        ? "bg-blue-50 font-semibold text-blue-600"
                        : "font-medium text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon
                      name={item.icon}
                      className={"h-5 w-5 " + (
                        active ? "text-blue-600" : "text-slate-400"
                      )}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
