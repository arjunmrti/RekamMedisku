import test from "node:test";
import assert from "node:assert/strict";
import {
  derivePatientFollowUpSummary,
  derivePatientFollowUpSummaryFromRemote,
} from "../src/data/patientFollowUpSummary";

test("summary pasien mengambil follow-up tersimpan paling baru berdasarkan tanggal dan waktu", () => {
  const summary = derivePatientFollowUpSummary([
    {
      number: 1,
      isoDate: "2026-09-25",
      time: "16.00",
      status: "Tersimpan",
    },
    {
      number: 2,
      isoDate: "2026-09-26",
      time: "08.30",
      status: "Tersimpan",
    },
  ]);

  assert.deepEqual(summary, {
    lastFollowUp: "26 September 2026 · 08.30",
    followUpNumber: 2,
    lastFollowUpAt: "2026-09-26T08:30:00",
  });
});

test("draft tidak menjadi follow-up terakhir pasien", () => {
  const summary = derivePatientFollowUpSummary([
    {
      number: 2,
      isoDate: "2026-09-26",
      time: "12.00",
      status: "Draf",
    },
    {
      number: 1,
      isoDate: "2026-09-25",
      time: "08.00",
      status: "Tersimpan",
    },
  ]);

  assert.deepEqual(summary, {
    lastFollowUp: "25 September 2026 · 08.00",
    followUpNumber: 1,
    lastFollowUpAt: "2026-09-25T08:00:00",
  });
});

test("summary kosong saat pasien tidak memiliki follow-up tersimpan", () => {
  assert.deepEqual(
    derivePatientFollowUpSummary([
      {
        number: 1,
        isoDate: "2026-09-26",
        time: "09.00",
        status: "Draf",
      },
    ]),
    {
      lastFollowUp: "Belum ada follow-up",
      followUpNumber: 0,
      lastFollowUpAt: undefined,
    },
  );
});

test("summary remote memakai relasi patient -> follow_ups", () => {
  assert.equal(
    derivePatientFollowUpSummaryFromRemote([
      {
        number: 3,
        iso_date: "2026-09-26",
        time: "14:15:00",
        status: "Tersimpan",
      },
    ]).lastFollowUp,
    "26 September 2026 · 14.15",
  );
});
