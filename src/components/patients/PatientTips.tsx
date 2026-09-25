import Icon from "../ui/Icon";

export default function PatientTips() {
  return (
    <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <Icon name="lightbulb" className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <div className="text-xs leading-5 text-blue-900">
        <h3 className="mb-1 font-bold">Tips Hari Ini</h3>
        <p>
          Pastikan untuk selalu menyimpan follow-up setelah selesai mengisi
          form, agar data tidak hilang.
        </p>
      </div>
    </section>
  );
}
