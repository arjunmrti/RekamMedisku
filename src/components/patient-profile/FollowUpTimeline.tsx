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
}