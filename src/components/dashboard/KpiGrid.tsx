import KpiCard from "./KpiCard";

const cards = [
  {
    title: "Pasien Aktif",
    value: "6",
    description: "dari total 18 pasien",
    icon: "users",
    iconClassName: "bg-blue-50 text-blue-600",
    hoverIconClassName: "group-hover:text-blue-500",
  },
  {
    title: "Follow-Up Hari Ini",
    value: "4",
    description: "dari total 6 follow-up",
    icon: "calendar",
    iconClassName: "bg-emerald-50 text-emerald-600",
    hoverIconClassName: "group-hover:text-emerald-500",
  },
  {
    title: "Perlu Ditindaklanjuti",
    value: "2",
    description: "follow-up menunggu",
    icon: "alert",
    iconClassName: "bg-amber-50 text-amber-500",
    hoverIconClassName: "group-hover:text-amber-500",
  },
  {
    title: "Pasien Diarsipkan",
    value: "12",
    description: "dari total 18",
    icon: "archive",
    iconClassName: "bg-purple-50 text-purple-600",
    hoverIconClassName: "group-hover:text-purple-500",
  },
] as const;

export default function KpiGrid() {
  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </section>
  );
}
