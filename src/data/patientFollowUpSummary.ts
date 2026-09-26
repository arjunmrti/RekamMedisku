import type { PatientListItem } from "../types/patient";
import type { FollowUpEntry } from "../types/followUp";

export type RemoteFollowUpSummaryRow = {
  number: number;
  iso_date: string;
  time: string;
  status?: string | null;
};

export type PatientFollowUpSummary = Pick<
  PatientListItem,
  "lastFollowUp" | "followUpNumber" | "lastFollowUpAt"
>;

function sortKey(item: {
  isoDate: string;
  time: string;
}) {
  return item.isoDate + "T" + item.time.replace(".", ":");
}

function isSavedFollowUp(status?: string | null) {
  return status === undefined || status === null || status === "Tersimpan";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value + "T00:00:00"));
}

function formatTime(value: string) {
  return value.slice(0, 5).replace(":", ".");
}

export function derivePatientFollowUpSummary(
  entries: Pick<FollowUpEntry, "number" | "isoDate" | "time" | "status">[],
): PatientFollowUpSummary {
  const latest = [...entries]
    .filter((entry) => isSavedFollowUp(entry.status))
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))[0];

  if (!latest) {
    return {
      lastFollowUp: "Belum ada follow-up",
      followUpNumber: 0,
      lastFollowUpAt: undefined,
    };
  }

  return {
    lastFollowUp: formatDate(latest.isoDate) + " · " + formatTime(latest.time),
    followUpNumber: latest.number,
    lastFollowUpAt:
      latest.isoDate + "T" + latest.time.replace(".", ":").slice(0, 8),
  };
}

export function derivePatientFollowUpSummaryFromRemote(
  rows: RemoteFollowUpSummaryRow[],
): PatientFollowUpSummary {
  return derivePatientFollowUpSummary(
    rows.map((row) => ({
      number: row.number,
      isoDate: row.iso_date,
      time: row.time,
      status: row.status as FollowUpEntry["status"] | undefined,
    })),
  );
}
