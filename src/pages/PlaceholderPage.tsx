import AppShell, { type NavigationProps } from "../components/layout/AppShell";

type PlaceholderPageProps = NavigationProps & {
  title: string;
};

export default function PlaceholderPage({
  title,
  activeItem,
  onNavigate,
}: PlaceholderPageProps) {
  return (
    <AppShell
      activeItem={activeItem}
      onNavigate={onNavigate}
      searchValue=""
      onSearchChange={() => undefined}
    >
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1677FF]">
            RekamMedisku
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Halaman ini belum masuk implementasi pada checkpoint saat ini.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
