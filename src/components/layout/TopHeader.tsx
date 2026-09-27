import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Icon from "../ui/Icon";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../utils/supabase";

type TopHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchEnabled: boolean;
  activeItem: string;
  onMenuClick: () => void;
};

export default function TopHeader({
  searchValue,
  onSearchChange,
  searchEnabled,
  activeItem,
  onMenuClick,
}: TopHeaderProps) {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  useEffect(() => {
    if (!profileOpen && !notificationOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }

      if (!notificationRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen, notificationOpen]);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Supabase sign out failed:", error);
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Gagal keluar dari akun. Coba lagi.",
      );
      setIsSigningOut(false);
    }
  };

  const metadata =
    user?.user_metadata &&
    typeof user.user_metadata === "object" &&
    !Array.isArray(user.user_metadata)
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const metadataName =
    typeof metadata.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim()
        ? metadata.name.trim()
        : "";

  const displayName =
    metadataName ||
    user?.email?.split("@")[0] ||
    "Pengguna RekamMedisku";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(2, "P")
    .slice(0, 2);

  const accountLabel =
    typeof metadata.role === "string" && metadata.role.trim()
      ? metadata.role.trim()
      : "Akun RekamMedisku";

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E5EAF1] bg-white px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0 xl:h-[72px] xl:gap-6 xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Buka menu navigasi"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        {!searchEnabled ? (
          <div className="min-w-0 flex-1 lg:hidden">
            <p className="truncate text-sm font-bold text-slate-800 sm:text-base">
              {activeItem}
            </p>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">
              Workspace dokumentasi klinis pribadi
            </p>
          </div>
        ) : (
          <div className="min-w-0 flex-1 sm:hidden">
            <p className="truncate text-sm font-bold text-slate-800">{activeItem}</p>
          </div>
        )}

        {searchEnabled ? (
          <label className="relative hidden min-w-0 w-full max-w-md sm:block">
            <span className="sr-only">Cari pasien</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={handleChange}
              placeholder="Cari nama pasien, RM, atau kata kunci..."
              className="h-10 w-full rounded-xl border border-[#D7E3F2] bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
        ) : null}
      </div>

      {searchEnabled ? (
        <label className="order-3 relative block w-full sm:hidden">
          <span className="sr-only">Cari pasien</span>
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={handleChange}
            placeholder="Cari pasien, RM, atau kata kunci..."
            className="h-10 w-full rounded-xl border border-[#D7E3F2] bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#1677FF] focus:ring-2 focus:ring-blue-500/10"
          />
        </label>
      ) : null}

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 lg:gap-4 xl:gap-6">
        <div className="hidden items-center gap-2 text-xs font-medium text-slate-600 xl:flex">
          <Icon name="calendar" className="h-4 w-4 text-slate-400" />
          <span>{today}</span>
        </div>

        <div ref={notificationRef} className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => {
              setNotificationOpen((current) => !current);
              setProfileOpen(false);
            }}
            aria-label="Buka notifikasi"
            aria-haspopup="menu"
            aria-expanded={notificationOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
          >
            <Icon name="bell" className="h-5 w-5" />
          </button>

          {notificationOpen ? (
            <div
              role="menu"
              aria-label="Notifikasi"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-22px_rgba(15,23,42,0.3)]"
            >
              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-bold text-slate-800">Notifikasi</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Pembaruan workspace akan muncul di sini.
                </p>
              </div>
              <div className="px-4 py-8 text-center">
                <Icon name="bell" className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Belum ada notifikasi
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Tidak ada pembaruan baru untuk saat ini.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div ref={profileRef} className="relative border-l border-slate-200 pl-2 sm:pl-3">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 sm:gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#60708A] text-[11px] font-semibold text-white sm:h-10 sm:w-10">
              {initials}
            </div>
            <div className="hidden min-w-0 lg:block">
              <span className="block truncate text-sm font-bold leading-tight text-slate-800">
                {displayName}
              </span>
              <span className="block text-[11px] font-medium text-slate-400">
                {accountLabel}
              </span>
            </div>
            <Icon
              name="chevron"
              className={
                "hidden h-4 w-4 text-slate-400 transition-transform lg:block " +
                (profileOpen ? "rotate-180" : "")
              }
            />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              aria-label="Menu akun"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-22px_rgba(15,23,42,0.3)]"
            >
              <div className="border-b border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#60708A] text-[11px] font-semibold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      Akun RekamMedisku
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {signOutError ? (
                  <div
                    role="alert"
                    className="mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[11px] leading-relaxed text-rose-700"
                  >
                    {signOutError}
                  </div>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon name="arrow" className="h-4 w-4 rotate-180 text-rose-500" />
                  {isSigningOut ? "Keluar..." : "Keluar dari Akun"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
