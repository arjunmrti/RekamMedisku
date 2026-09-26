import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  searchEnabled?: boolean;
  children: ReactNode;
};

export default function AppShell({
  activeItem,
  onNavigate,
  searchValue,
  onSearchChange,
  searchEnabled = true,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (label: string) => {
    onNavigate(label);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar activeItem={activeItem} onNavigate={navigate} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchEnabled={searchEnabled}
            activeItem={activeItem}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
          {children}
        </div>
      </div>

      <MobileBottomNav activeItem={activeItem} onNavigate={navigate} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-900/20"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative flex h-full w-[300px] max-w-[88vw] flex-col border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-5 flex items-center justify-between px-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1677FF] text-white shadow-sm shadow-blue-500/20">
                  <Icon name="pulse" className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Navigasi
                  </p>
                  <p className="truncate text-base font-bold text-slate-900">
                    RekamMedisku
                  </p>
                </div>
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

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {[
                { label: "Beranda", icon: "home" as IconName },
                { label: "Daftar Pasien", icon: "users" as IconName },
                { label: "Semua Laporan", icon: "document" as IconName },
                { label: "Cadangan & Data", icon: "database" as IconName },
                { label: "Stase Saya", icon: "brain" as IconName },
              ].map((item) => {
                const active = activeItem === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.label)}
                    className={
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm " +
                      (active
                        ? "bg-blue-50 font-semibold text-blue-600"
                        : "font-medium text-slate-600 hover:bg-slate-50")
                    }
                  >
                    <Icon
                      name={item.icon}
                      className={
                        "h-5 w-5 " + (active ? "text-blue-600" : "text-slate-400")
                      }
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate("Stase Saya")}
                className={
                  "flex min-h-14 w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors " +
                  (activeItem === "Stase Saya"
                    ? "border-blue-200 bg-blue-50"
                    : "border-blue-100 bg-blue-50/70 hover:bg-blue-100/60")
                }
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Icon name="brain" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase leading-none tracking-wider text-slate-400">
                      Stase Aktif
                    </span>
                    <span className="block truncate text-xs font-bold tracking-tight text-slate-800">
                      Buka Stase Saya
                    </span>
                  </div>
                </div>
                <Icon name="chevron" className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
