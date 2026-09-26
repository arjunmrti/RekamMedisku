import Icon from "../ui/Icon";

export default function TipsWidget() {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="lightbulb" className="h-4 w-4 text-amber-500" />
        <h4 className="text-xs font-bold text-slate-800">Tips Hari Ini</h4>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Pastikan untuk selalu menyimpan follow-up setelah selesai mengisi form,
        agar data tidak hilang.
      </p>
    </section>
  );
}
