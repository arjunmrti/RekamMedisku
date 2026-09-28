const REPORT_MONTH_SUFFIX =
  /\s*[([{]?\s*(?:\d{4}\s+)?(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)(?:\s+\d{4})?\s*[)\]}]?\s*$/i;

export function formatReportDate(date: string) {
  return date || "Tanggal belum tersedia";
}

export function formatReportRotationName(
  rotationName: string | undefined,
  fallback: string,
) {
  const source = rotationName?.trim() || fallback;
  const compact = source.replace(/\s+/g, " ").trim();
  const withoutMonthSuffix = compact.replace(REPORT_MONTH_SUFFIX, "").trim();
  const withoutRolePrefix = withoutMonthSuffix
    .replace(/^(?:Rotasi|Stase)\s+/i, "")
    .trim();

  return withoutRolePrefix || fallback;
}
