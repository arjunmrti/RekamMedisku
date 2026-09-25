import { useMemo, useRef, useState } from "react";
import type { FollowUpEntry } from "../../types/followUp";
import Icon from "../ui/Icon";

type TimelineFilter = "Semua" | "Minggu Ini" | "Bulan Ini" | "Tanggal";

type FollowUpTimelineProps = {
  entries: FollowUpEntry[];
  onOpenDetail: () => void;
};

export default function FollowUpTimeline({
  entries,
  onOpenDetail,
}: FollowUpTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("Semua");
  const [expandedId, setExpandedId] = useState(entries[0]?.id ?? "");
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  const filteredEntries = useMemo(() => {
    if (filter === "Semua") return entries;

    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    if (filter === "Tanggal") {
      return selectedDate
        ? entries.filter((entry) => entry.isoDate === selectedDate)
        : entries;
    }

    if (filter === "Minggu Ini") {
      const day = todayDate.getDay();
      const distanceFromMonday = day === 0 ? 6 : day - 1;
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() - distanceFromMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      return entries.filter((entry) => {
        const date = new Date(entry.isoDate + "T00:00:00");
        return date >= weekStart && date <= weekEnd;
      });
    }

    return entries.filter((entry) => {
      const date = new Date(entry.isoDate + "T00:00:00");
      return (
        date.getFullYear() === todayDate.getFullYear() &&
        date.getMonth() === todayDate.getMonth()
      );
    });
  }, [entries, filter, selectedDate]);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-6px_rgba(16,42,86,0.12)] xl:sticky xl:top-[92px]">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon name="clock" className="h-4 w-4 text-[#1677FF]" />
        Riwayat Follow-Up
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {(["Semua", "Minggu Ini", "Bulan Ini"] as const).map((value) => {
          const active = filter === value;
          return (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={
                "rounded-full px-3 py-1 text-xs font-semibold transition " +
                (active
                  ? "bg-[#1677FF] text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {value}
            </button>
          );
        })}

        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200">
          <Icon name="calendar" className="h-3 w-3 text-slate-500" />
          Pilih Tanggal
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setFilter("Tanggal");
            }}
            className="sr-only"
          />
        </label>
      </div>

      <div className="relative mt-5 pl-6">
        <div className="absolute bottom-2 left-2 top-2 w-px bg-slate-200" />

        <div className="space-y-5">
          {filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-xs font-semibold text-slate-700">
                Tidak ada follow-up pada filter ini.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter("Semua");
                  setSelectedDate("");
                }}
                className="mt-2 text-xs font-semibold text-[#1677FF]"
              >
                Tampilkan semua
              </button>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const expanded = expandedId === entry.id;

              return (
                <div key={entry.id} className="relative">
                  <span
                    className={
                      "absolute -left-[25px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white " +
                      (index === 0 ? "border-[#1677FF]" : "border-slate-300")
                    }
                  >
                    {index === 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1677FF]" />
                    ) : null}
                  </span>

                  <p className="mb-2.5 text-[11px] font-bold text-slate-400">
                    {entry.date}
                  </p>

                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? "" : entry.id)}
                    className={
                      "w-full rounded-xl border p-3.5 text-left transition " +
                      (expanded
                        ? "border-blue-200 bg-blue-50/40"
                        : "border-slate-200 bg-white hover:border-slate-300")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Follow-up #{entry.number}
                        </span>
                        <span
                          className={
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                            (entry.status === "Draf"
                              ? "border-amber-200/60 bg-amber-50 text-amber-700"
                              : "border-emerald-200/50 bg-emerald-50 text-emerald-700")
                          }
                        >
                          {entry.status}
                        </span>
                      </div>
                      <span
                        className={
                          "shrink-0 text-sm " +
                          (expanded ? "text-[#1677FF]" : "text-slate-400")
                        }
                      >
                        {expanded ? "⌄" : "›"}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                      {entry.time}
                    </p>

                    {expanded ? (
                      <div className="mt-2.5 space-y-1 border-t border-blue-100 pt-2.5 text-[11px] text-slate-600">
                        <p>
                          <span className="font-bold text-slate-800">S</span>
                          &nbsp; {entry.subjective}
                        </p>
                        <p>
                          <span className="font-bold text-slate-800">O</span>
                          &nbsp; {entry.objective}
                        </p>
                        <p>
                          <span className="font-bold text-slate-800">A</span>
                          &nbsp; {entry.assessment}
                        </p>
                        <p>
                          <span className="font-bold text-slate-800">P</span>
                          &nbsp; {entry.plan}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">S O A P</span>
                        <br />
                        {entry.summary}
                      </p>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Lihat follow-up terbaru
      </button>
    </section>
  );
}
