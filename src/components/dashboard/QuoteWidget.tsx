import Icon from "../ui/Icon";

export default function QuoteWidget() {
  return (
    <section className="rounded-2xl border border-blue-100/70 bg-blue-50/70 p-5">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100/80 text-blue-600">
        <Icon name="stethoscope" className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold italic leading-relaxed text-slate-800">
        “Catatan hari ini, untuk keputusan yang lebih baik esok hari.”
      </p>
      <span className="mt-2 block text-[11px] font-bold text-blue-600">
        RekamMedisku
      </span>
    </section>
  );
}
