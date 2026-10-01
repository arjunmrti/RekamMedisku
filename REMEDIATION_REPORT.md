# RekamMedisku — Remediation Report

**Date:** 2026-10-01  
**Project:** RekamMedisku  

## Phase 3 Result

### Fixed
- **DB-004:** Updated `supabase/tests/database/phase0_multi_user_foundation.test.sql` so its header matches the actual CI contract: isolated tenant fixture plus the complete checked-in migration chain, while explicitly documenting the legacy helper prerequisite.

### Disproven
- None newly disproven in Phase 3. Existing evidence for REPORT-001 remains valid.

### Open
- **PAT-001:** SQL delete RPC is user-scoped/transactional, but local cache failure and Storage cleanup failure paths lack runtime fault-injection coverage.
- **EXAM-001:** Local reference-count tests pass; binary upload followed by DB failure and cleanup retry remain unverified.
- **HIST-001:** Multi-tab/stale timeline behavior lacks browser fault-injection coverage.
- **LOCAL-001:** Storage quota/security exceptions are not covered across all persistence writers.
- **SYNC-001:** In-flight deduplication exists; entity conflict and browser-restart reconciliation remain unverified.
- **SYNC-002:** Post-mount retry failures are logged rather than represented by durable/user-visible pending state.
- **RT-001:** Reconnect/flapping and duplicate subscription behavior require a live Realtime server.
- **UI-002:** Main bundle remains ~863 kB; code splitting is an optimization, not a reproduced functional defect.
- **UI-003:** 30 non-fatal lint warnings remain; broad effect rewrites are not justified without reproducing a functional regression.

### Blocked / Partially Verified
- **DB-005:** Local isolated DB is available, but destructive attachment-cleanup lifecycle testing remains unrun.
- **RLS-001:** Static Realtime channel filters and lifecycle cleanup are verified; live two-client WebSocket isolation remains untested.
- **ROT-001:** Sequential one-active invariant and unique-index protection pass locally; a true concurrent-client race test remains unrun.
- **FU-001:** Local RPC validation/transaction boundary coverage passes; deliberate child-operation failure injection remains unrun.
- Remote destructive verification remains prohibited.

### Verified Runtime Evidence
- Isolated local Supabase reset: PASS.
- RLS/Storage pgTAP: 8 suites, 156 tests, PASS.
- Template privilege hardening: PASS; validator execution revoked from client roles and template versions limited to SELECT/INSERT.
- Backup/restore failure behavior: local unit tests PASS, including rollback on cloud restore failure and committed-response error handling.
- Realtime service is running locally, but no two-client WebSocket isolation harness exists yet.

## Phase 3 Verification

- **Lint:** PASS — 0 errors, 30 warnings.
- **Tests:** PASS — 110/110.
- **Build:** PASS — 0 errors; existing ~863 kB chunk warning remains.
- **QA:** PASS — `npm run qa` exit code 0.
- **E2E:** PASS — 5/5 Chromium tests; tablet/mobile/accessibility matrix is not configured and remains OPEN.
- **DB:** BLOCKED — isolated local Supabase bootstrap failure described above.
- **RLS:** BLOCKED — no local Postgres runtime.
- **Realtime:** BLOCKED — no local Realtime runtime.
- **Concurrency:** BLOCKED — no local Postgres runtime for concurrent activation/failure injection.
- **Restore:** BLOCKED for remote transaction/failure injection; local payload validation remains passing.

## Existing Fixed Work Retained

DB-001, DB-002, DB-003, CI-001/UI-001, TEMPLATE-001, and AUTH-001 remain FIXED and were not reworked.
