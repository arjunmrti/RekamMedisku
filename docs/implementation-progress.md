# RekamMedisku — Foundation Implementation Progress

Branch: `feat/personal-workspace-clinical-config-foundation`

## Scope

This branch implements the dependency-ordered foundation:

```
00 Product Contract
↓
01 Template Foundation
↓
02 Version + Lifecycle
↓
03 Rotation + Binding
↓
04 Starter Template
↓
05 Renderer Contract
```

## Status

### SECTION 00 — Product Contract

Status: **Implemented**

- Added `docs/product-contract.md`
- Locked Personal Workspace + User-Specific Clinical Configuration.
- Locked Core/System vs Configurable boundary.
- Locked stable field/section identity.
- Locked hybrid relational + JSONB strategy.
- Locked immutable historical template version behavior.
- Locked template binding semantics.
- Locked starter-template cloning.
- Locked renderer value contract.

### SECTION 01 — Template Foundation

Status: **Implemented / foundation hardened**

- Existing `templates` and `template_versions` model retained.
- Existing definition validator hardened at the database boundary.
- Client definition validation now enforces boolean `required`.
- Template CRUD service includes create/read/list/archive/delete/metadata update/duplicate.
- Stable field IDs and controlled MVP field types remain enforced.
- Added additional unit-test coverage.

### SECTION 02 — Version + Lifecycle

Status: **Implemented / validation pending**

- Template versions remain append-only.
- Direct authenticated INSERT/UPDATE/DELETE on `template_versions` is revoked.
- Canonical creation path is the template RPC.
- Follow-Up template snapshot protection already present in existing migrations remains the historical guard.
- Added database privilege regression tests.

### SECTION 03 — Rotation + Binding

Status: **Implemented / validation pending**

- Added `rotation_template_bindings`.
- One rotation can hold multiple templates per document type.
- Binding pins an explicit template version for the context.
- Default template is constrained to one per rotation/document type.
- Existing rotation template columns remain as compatibility mirrors.
- Existing rotation mutations are mirrored into bindings.
- Added authenticated RPCs for binding upsert/delete with ownership and optimistic concurrency checks.
- Added client-side binding domain type and data service.
- Added database regression tests.

### SECTION 04 — Starter Template

Status: **Implemented / validation pending**

- Added starter Follow-Up template library.
- Starter definitions are validated against schema_version=1.
- Current examples are derived from existing application clinical form structure.
- Selecting a starter in the existing builder clones the definition into a personal template.
- Added personal-template duplication service.
- Starter changes cannot mutate existing personal copies.

### SECTION 05 — Renderer Contract

Status: **Implemented / validation pending**

- Added renderer contract documentation.
- Formalized answer shapes per field type.
- Numeric empty state is `null`.
- Added answer shape validation.
- Added answer normalization.
- Select/multiselect formatting uses human-readable labels.
- Checkbox false values are omitted from compatibility formatted text.
- Added runtime regression tests.

## Current compatibility boundary

The current Follow-Up page still contains legacy fixed clinical sections and
the schema-driven template renderer is currently embedded inside Objective.

This is intentional at this stage.

No specialty-specific legacy form should be expanded.

The eventual migration is:

```
Follow-Up Template
  ↓
Schema-driven sections
  ↓
Renderer
  ↓
Typed answers
  ↓
Persisted snapshot
```

The hardcoded form is not deprecated until the replacement path passes
backward-compatibility and regression gates.

## Validation note

GitHub Actions is currently failing immediately with zero executed steps on this
feature branch. The same immediate no-step failure is also present on the current
`main` commit, so the observed failure is not evidence that these new code
changes are broken.

Local npm execution is not available from the current working environment
because the Windows repository is not mounted here.

Therefore this branch is **implementation-complete for Sections 00–05 but not
yet validation-green**. The next engineering action is to restore/verify CI
execution, then use the resulting test/build output as the gate before moving
to Section 06.
