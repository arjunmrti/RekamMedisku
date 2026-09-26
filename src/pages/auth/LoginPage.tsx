import { useState } from "react";
import type { FormEvent } from "react";
import Icon from "../../components/ui/Icon";
import { supabase } from "../../utils/supabase";

function getLoginErrorMessage(message: string) {
  if (
    message.toLowerCase().includes("invalid login credentials") ||
    message.toLowerCase().includes("invalid email or password")
  ) {
    return "Email atau password salah.";
  }

  return "Gagal masuk. Coba lagi beberapa saat.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(getLoginErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#E5EAF1] bg-white p-6 shadow-[0_18px_50px_-28px_rgba(16,42,86,0.28)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1677FF] text-white shadow-sm shadow-blue-500/20">
            <Icon name="pulse" className="h-6 w-6" strokeWidth={2.5} />
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1677FF]">
              Ruang Pribadi
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Masuk ke RekamMedisku
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Masuk untuk membuka workspace dan data medis pribadi kamu.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                required
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-600"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#1677FF] px-4 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
