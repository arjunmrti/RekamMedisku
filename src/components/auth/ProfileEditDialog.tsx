import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import Icon from "../ui/Icon";
import { supabase } from "../../utils/supabase";

type ProfileEditDialogProps = {
  user: User;
  open: boolean;
  onClose: () => void;
};

function getInitialUsername(user: User) {
  const metadata =
    user.user_metadata &&
    typeof user.user_metadata === "object" &&
    !Array.isArray(user.user_metadata)
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  if (typeof metadata.username === "string" && metadata.username.trim()) {
    return metadata.username.trim();
  }

  if (typeof metadata.full_name === "string" && metadata.full_name.trim()) {
    return metadata.full_name.trim().replace(/\s+/g, "_").toLowerCase();
  }

  if (typeof metadata.name === "string" && metadata.name.trim()) {
    return metadata.name.trim().replace(/\s+/g, "_").toLowerCase();
  }

  return user.email?.split("@")[0] ?? "";
}

function validateUsername(value: string) {
  const normalized = value.trim();

  if (!normalized) return "Username wajib diisi.";
  if (normalized.length < 3) return "Username minimal 3 karakter.";
  if (normalized.length > 30) return "Username maksimal 30 karakter.";
  if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    return "Gunakan hanya huruf, angka, titik, underscore, atau tanda hubung.";
  }

  return "";
}

export default function ProfileEditDialog({
  user,
  open,
  onClose,
}: ProfileEditDialogProps) {
  const [username, setUsername] = useState(() => getInitialUsername(user));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;

    setUsername(getInitialUsername(user));
    setErrorMessage("");
    setSaved(false);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const normalizedUsername = username.trim();
    const validationError = validateUsername(normalizedUsername);

    if (validationError) {
      setErrorMessage(validationError);
      setSaved(false);
      return;
    }

    const currentMetadata =
      user.user_metadata &&
      typeof user.user_metadata === "object" &&
      !Array.isArray(user.user_metadata)
        ? (user.user_metadata as Record<string, unknown>)
        : {};

    setSaving(true);
    setErrorMessage("");
    setSaved(false);

    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        username: normalizedUsername,
      },
    });

    if (error) {
      console.error("Supabase username update failed:", error);
      setErrorMessage("Username gagal diperbarui. Coba lagi beberapa saat.");
      setSaving(false);
      return;
    }

    setUsername(normalizedUsername);
    setSaved(true);
    setSaving(false);

    window.setTimeout(() => {
      onClose();
    }, 700);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.38)] sm:max-h-[92dvh] sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-slate-50/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Profil Akun
            </p>
            <h2
              id="profile-edit-title"
              className="mt-1 text-base font-bold text-slate-900"
            >
              Edit username
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Nama ini akan tampil di header workspace RekamMedisku.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup edit profil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor="profile-username"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-slate-400">
                @
              </span>
              <input
                id="profile-username"
                name="username"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrorMessage("");
                  setSaved(false);
                }}
                maxLength={30}
                disabled={saving}
                placeholder="contoh: juna_med"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#1677FF] focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              3–30 karakter. Huruf, angka, titik, underscore, dan tanda hubung.
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Email akun
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email ?? ""}
              readOnly
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-500 outline-none"
            />
            <p className="mt-1.5 text-[10px] text-slate-400">
              Email tetap sama. Fitur ini hanya mengubah username.
            </p>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700"
            >
              {errorMessage}
            </div>
          ) : null}

          {saved ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-700"
            >
              <Icon name="check" className="h-4 w-4" />
              Username berhasil diperbarui.
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              {saving ? "Menyimpan..." : "Simpan perubahan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
