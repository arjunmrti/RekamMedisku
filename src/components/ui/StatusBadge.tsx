type StatusBadgeProps = {
  status: "Aktif" | "Diarsipkan" | "Selesai" | "Mendatang";
};

const statusStyles: Record<StatusBadgeProps["status"], string> = {
  Aktif: "border-emerald-100 bg-emerald-50 text-emerald-600",
  Diarsipkan: "border-slate-200 bg-slate-100 text-slate-500",
  Selesai: "border-emerald-100 bg-emerald-50 text-emerald-600",
  Mendatang: "border-slate-200 bg-slate-50 text-slate-500",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
