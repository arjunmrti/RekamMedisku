import Icon from "../ui/Icon";

type TipsWidgetProps = {
  activePatientCount: number;
  pendingFollowUps: number;
  followUpsToday: number;
};

function getTipContent({
  activePatientCount,
  pendingFollowUps,
  followUpsToday,
}: TipsWidgetProps) {
  if (activePatientCount === 0) {
    return {
      title: "Workspace Masih Kosong",
      body: "Tambahkan pasien ke stase aktif untuk mulai mencatat perjalanan klinismu.",
    };
  }

  if (pendingFollowUps > 0) {
    return {
      title: "Fokus Hari Ini",
      body: `${pendingFollowUps} pasien belum memiliki follow-up hari ini. Prioritaskan pemeriksaan dan simpan catatannya setelah selesai.`,
    };
  }

  if (followUpsToday > 0) {
    return {
      title: "Catatan Hari Ini",
      body: "Follow-up hari ini sudah tercatat. Cek kembali bagian Assessment dan Plan sebelum menutup sesi.",
    };
  }

  return {
    title: "Tips Hari Ini",
    body: "Pastikan follow-up pasien disimpan setelah selesai mengisi form, agar catatan tetap tersedia untuk ditinjau kembali.",
  };
}

export default function TipsWidget(props: TipsWidgetProps) {
  const tip = getTipContent(props);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
          <Icon name="lightbulb" className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Pendamping Klinik
          </p>
          <h4 className="text-xs font-bold text-slate-800">{tip.title}</h4>
        </div>
      </div>
      <p className="pl-10 text-[11px] leading-[1.7] text-slate-500">
        {tip.body}
      </p>
    </section>
  );
}
