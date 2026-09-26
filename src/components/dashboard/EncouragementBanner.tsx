import Icon from "../ui/Icon";

export default function EncouragementBanner() {
  return (
    <section className="flex items-center gap-3.5 overflow-hidden rounded-2xl border border-blue-100/60 bg-blue-50 p-4">
      <div className="relative flex h-14 w-12 shrink-0 rotate-[-4deg] flex-col justify-center rounded-lg border border-blue-100 bg-white px-2 shadow-sm">
        <div className="mb-1.5 h-1 w-full rounded bg-blue-100" />
        <div className="mb-1.5 h-1 w-4/5 rounded bg-slate-100" />
        <div className="mb-1.5 h-1 w-3/4 rounded bg-slate-100" />
        <div className="h-1 w-1/2 rounded bg-slate-100" />
        <div className="absolute -right-2 top-2 h-10 w-1.5 rotate-12 rounded-full bg-blue-500 shadow-sm" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight text-slate-800">
          Jaga kesehatan, terus belajar, semoga sukses koasnya!
        </p>
        <div className="mt-1 flex items-center gap-1 text-blue-600">
          <Icon name="smile" className="h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}
