function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toLocalIsoDate(date = new Date()) {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );
}

export function toLocalTimeInput(date = new Date()) {
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

export function toLocalIsoDateTime(date = new Date()) {
  return toLocalIsoDate(date) + "T" + toLocalTimeInput(date) + ":00";
}

export function formatLocalDateForFile(date = new Date()) {
  return toLocalIsoDate(date);
}
