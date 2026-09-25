import KpiCard from "./KpiCard";
import type { IconName } from "../ui/Icon";

type KpiCardData = {
  title: string;
  value: string;
  description: string;
  icon: IconName;
  iconClassName: string;
};

type KpiGridProps = {
  cards: KpiCardData[];
};

export default function KpiGrid({ cards }: KpiGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </section>
  );
}
