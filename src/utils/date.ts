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

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_INPUT_PATTERN = /^(\d{2}):(\d{2})$/;
const DISPLAY_TIME_PATTERN = /^(\d{2})\.(\d{2})$/;
const ISO_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z?$/;

export function isValidIsoDate(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTimeInput(value: string) {
  const match = TIME_INPUT_PATTERN.exec(value);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function isValidDisplayTime(value: string) {
  const match = DISPLAY_TIME_PATTERN.exec(value);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function isValidIsoDateTime(value: string) {
  const match = ISO_DATETIME_PATTERN.exec(value);
  if (!match) return false;

  const datePart = match[1] + "-" + match[2] + "-" + match[3];
  const timePart = match[4] + ":" + match[5];

  return isValidIsoDate(datePart) && isValidTimeInput(timePart);
}
