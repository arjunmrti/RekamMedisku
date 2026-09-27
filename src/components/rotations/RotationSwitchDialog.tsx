import Icon from "../ui/Icon";
import type { Rotation } from "../../types/rotation";

type RotationSwitchDialogProps = {
  rotation: Rotation | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function RotationSwitchDialog({
  rotation,
  onCancel,
  onConfirm,
}: RotationSwitchDialogProps) {
  if (!rotation) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:p-4 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-rotation-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1677FF]">
            <Icon
              name={rotation.specialty === "Neurologi" ? "brain" : "stethoscope"}
              className="h-5 w-5"
            />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1677FF]">
              Ganti Stase
            </p>
            <h2
              id="switch-rotation-title"
              className="mt-1 text-lg font-bold text-slate-900"
            >
              Pindah ke stase {rotation.name}?
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Data stase sebelumnya tetap tersimpan dan tidak akan dihapus.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
          Pasien, follow-up, dan riwayat stase lain tetap berada di workspace
          dan tidak tercampur dengan stase yang dipilih.
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
          >
            Pindah Stase
          </button>
        </div>
      </div>
    </div>
  );
}
