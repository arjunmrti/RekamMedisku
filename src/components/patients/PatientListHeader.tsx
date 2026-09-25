import Icon from "../ui/Icon";

type PatientListHeaderProps = {
  onAddPatient: () => void;
};

export default function PatientListHeader({
  onAddPatient,
}: PatientListHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-slate-900 lg:text-[30px]">
          Daftar Pasien
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Kelola pasien pada stase aktif. Lihat status, follow-up terakhir, dan
          kelola data pasien.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddPatient}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 active:bg-blue-800"
      >
        <Icon name="plus-user" className="h-4 w-4" strokeWidth={2.5} />
        <span>Tambah Pasien</span>
      </button>
    </div>
  );
}
