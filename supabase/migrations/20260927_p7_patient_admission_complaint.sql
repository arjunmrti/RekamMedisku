-- Package 7 — Persistent admission complaint context
-- Stores the patient's initial presenting complaint separately from daily follow-up complaints.
-- Existing rows remain valid because the new field is nullable.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS admission_complaint text;
