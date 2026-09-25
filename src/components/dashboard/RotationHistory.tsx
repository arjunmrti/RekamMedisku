import Icon from "../ui/Icon";

const rotations = [
  { name: "Ilmu Penyakit Dalam", status: "Selesai", date: "1 Agu – 31 Agu 2026", type: "done" },
  { name: "Neurologi", status: "Aktif", date: "1 Sep – 30 Sep 2026", type: "active" },
  { name: "Bedah", status: "Mendatang", date: "1 Okt – 31 Okt 2026", type: "upcoming" },
  { name: "Pediatri", status: "Mendatang", date: "1 Nov – 30 Nov 2026", type: "upcoming" },
  { name: "Obgyn", status: "Mendatang", date: "1 Des – 31 Des 2026", type: "upcoming" },
] as const;

export default function RotationHistory() {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="document" className="h-5 w-5 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900">Riwayat Stase</h3>
      </div>

      <div className="relative">
        <div className="absolute bottom-3 left-2.5 top-3 w-px bg-slate-200" />

        <div className="space-y-1">
          {rotations.map((rotation) => (
            <div
              key={rotation.name}
              className={"relative flex items-center justify-between gap-4 rounded-lg px-1 py-2 " + (rotation.type === "active" ? "bg-blue-50/70" : "")}
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
                {rotation.type === "upcoming" && (
                  <div className="relative z-10 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
                )}

                <div className="min-w-0">
                  <h4 className={"truncate text-xs " + (rotation.type === "active" ? "font-bold text-blue-700" : "font-semibold text-slate-800")}>
                    {rotation.name}
                  </h4>
                  <span className={"text-[10px] font-medium " + (
                    rotation.type === "done"
                      ? "text-emerald-600"
                      : rotation.type === "active"
                        ? "text-blue-600"
                        : "text-slate-400"
                  )}>
                    {rotation.status}
                  </span>
                </div>
              </div>

              <span className={"shrink-0 whitespace-nowrap text-[10px] font-medium " + (rotation.type === "active" ? "text-blue-600/80" : "text-slate-400")}>
                {rotation.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
