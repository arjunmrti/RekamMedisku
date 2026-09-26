import Icon from "../ui/Icon";

export default function EncouragementBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50 via-[#F7FAFF] to-indigo-50 p-0">
      <div className="flex min-h-[148px] items-center">
        <div className="w-[46%] shrink-0 self-stretch overflow-hidden">
          <img
            src="/illustrations/koas-notebook.svg"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center px-4 py-5 pr-5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-400">
              Daily Companion
            </p>
            <p className="mt-1.5 text-xs font-bold leading-[1.55] text-[#17458B]">
              Jaga kesehatan,
              <br />
              terus belajar,
              <br />
              semoga sukses koasnya!
            </p>
            <div className="mt-2 flex items-center gap-1 text-blue-500">
              <Icon name="smile" className="h-4 w-4" />
              <span className="text-[10px] font-semibold text-blue-500">
                Pelan-pelan, yang penting konsisten.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
