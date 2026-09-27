import { loadRotations } from "../../data/localRotations";
import Icon from "../ui/Icon";
import type { RotationStatus } from "../../types/rotation";

function formatPeriod(startDate: string, endDate: string) {
  const start = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(startDate + "T00:00:00"));
  const end = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(endDate + "T00:00:00"));

  return start + " — " + end;
}

function getNode(status: RotationStatus) {
  return status === "Selesai" ? "done" : "active";
}

export default function RotationHistory() {
  const rotations = loadRotations()
    .filter((rotation) => rotation.status !== "Mendatang")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="document" className="h-5 w-5 text-slate-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Riwayat Stase</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Stase yang pernah dan sedang dijalani
            </p>
          </div>
        </div>
      </div>

      {rotations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
          Belum ada riwayat stase.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute bottom-3 left-2.5 top-3 w-px bg-slate-200" />
          <div className="space-y-1">
            {rotations.map((rotation) => {
              const node = getNode(rotation.status);
              const active = rotation.status === "Aktif";

              return (
                <div
                  key={rotation.id}
                  className={
                    "relative flex items-center justify-between gap-4 rounded-lg px-1 py-2.5 " +
                    (active ? "bg-blue-50/70" : "")
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {node === "done" ? (
                      <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className={
                        "truncate text-xs " +
                        (active ? "font-bold text-blue-700" : "font-semibold text-slate-800")
                      }>
                        {rotation.name}
                      </h4>
                      <span className={
                        "text-[11px] font-medium " +
                        (active ? "text-blue-600" : "text-emerald-600")
                      }>
                        {rotation.status}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400">
                    {formatPeriod(rotation.startDate, rotation.endDate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
