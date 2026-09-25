import Icon from "../ui/Icon";

const rotations = [
  {
    name: "Ilmu Penyakit Dalam",
    status: "Selesai",
    date: "1 Agu – 31 Agu 2026",
    type: "done",
  },
  {
    name: "Neurologi",
    status: "Aktif",
    date: "1 Sep – 30 Sep 2026",
    type: "active",
  },
] as const;

export default function RotationHistory() {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="document" className="h-5 w-5 text-slate-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Stase
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Stase yang pernah dan sedang dijalani
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute bottom-3 left-2.5 top-3 w-px bg-slate-200" />

        <div className="space-y-1">
          {rotations.map((rotation) => (
            <div
              key={rotation.name}
              className={
                "relative flex items-center justify-between gap-4 rounded-lg px-1 py-2.5 " +
                (rotation.type === "active" ? "bg-blue-50/70" : "")
              }
            >
              <div className="flex min-w-0 items-center gap-3">
                {rotation.type === "done" && (
                  <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}

                {rotation.type === "active" && (
                  <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  </div>
                )}

                <div className="min-w-0">
                  <h4
                    className={
                      "truncate text-xs " +
                      (rotation.type === "active"
                        ? "font-bold text-blue-700"
                        : "font-semibold text-slate-800")
                    }
                  >
                    {rotation.name}
                  </h4>
                  <span
                    className={
                      "text-[10px] font-medium " +
                      (rotation.type === "done"
                        ? "text-emerald-600"
                        : "text-blue-600")
                    }
                  >
                    {rotation.status}
                  </span>
                </div>
              </div>

              <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-slate-400">
                {rotation.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
