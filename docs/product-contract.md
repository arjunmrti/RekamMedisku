# RekamMedisku — Product Contract

Status: **Baseline / Locked for implementation**
Version: **PC-1**
Scope: **Personal Workspace + User-Specific Clinical Configuration**

## 1. Product identity

RekamMedisku is a personal clinical documentation workspace.

The core product model is:

```
1 Account
  ↓
1 Personal Workspace
  ↓
User-specific clinical configuration
  ↓
Clinical data
```

The product does **not** require collaborative/team workspaces, workspace membership, RBAC, invitations, or shared tenants for the current product scope.

A user may have different documentation needs across rotations, institutions, and work contexts. The application must adapt to those differences without specialty-specific hardcoding.

## 2. Core domain rules

| Concept | Contract |
| --- | --- |
| Account | Supabase Auth user |
| Personal Workspace | The user's private application/data boundary |
| Rotation | Clinical context / active stase; not a template |
| Institution | Optional context/metadata attached to the relevant rotation/workflow; not a tenant |
| Clinical Document Template | User-owned configuration that defines document structure |
| Template Version | Immutable definition once referenced by persisted clinical history |
| Template Binding | Association between a rotation/context and the template/version used by new documents |
| Follow-Up | A persisted clinical document instance |
| Objective | A configurable structured section of Follow-Up |
| Answers | User-entered values keyed by stable field IDs |
| Snapshot | Exact template definition/version captured with the Follow-Up |
| Report | Presentation/output layer consuming persisted clinical data |
| Slaberan | Separate domain configuration using shared configuration primitives where appropriate |

## 3. Personal workspace ownership

The current ownership model remains user-scoped:

```
auth.uid()
  ↓
personal workspace
  ↓
user-owned resources
```

For the current product scope, `user_id` remains the tenant/ownership boundary.

Do not introduce `workspace_members`, organization tenants, invitations, or collaborative roles unless product scope explicitly changes.

## 4. Configuration principle

The application must not assume that a specialty uniquely determines a clinical form.

This is prohibited as a product rule:

```text
specialty = Neurologi
    ↓
hardcoded Neurologi form
```

The target behavior is:

```text
Personal Workspace
    ↓
Rotation / context
    ↓
Selected documentation template
    ↓
Template version
    ↓
Schema-driven renderer
```

A template is a starting point for a user's workflow, not a universal clinical standard.

## 5. Clinical document model

A Follow-Up template is a document definition:

```text
Clinical Document Template
└── Version
    └── Definition
        └── Sections
            └── Fields
```

A Follow-Up instance is separate from the template:

```text
Template v3
    ↓
Follow-Up instance
    ↓
Answers / clinical data
```

Changing a template must never rewrite historical Follow-Up content.

## 6. Follow-Up structure

The engine must support configurable Follow-Up sections.

The conceptual structure is:

```text
Follow-Up Template
├── Subjective
├── Objective
├── Assessment
├── Plan
└── Optional custom sections
```

Objective is a first-class structured section, not merely a single free-text field.

Example:

```text
Objective
├── Status Kesadaran
├── GCS
│   ├── Eye
│   ├── Verbal
│   └── Motorik
├── N. Cranialis
├── Motorik
└── Sensorik
```

Other sections may remain free-text or become structured according to the selected template. The engine must not force every section to use the same field structure.

## 7. Core/system vs configurable boundary

### System/Core — must remain available to the application

- patient reference
- Follow-Up identity
- date
- time
- rotation/context reference
- ownership
- persistence identifiers
- sync metadata
- historical template identity/version
- historical template snapshot

These are application integrity fields and must not be destructible through the template editor.

### Configurable — may be changed by the user

- clinical section presence
- section title/description
- field label
- field type
- placeholder
- help text
- unit
- ordering
- select/multi-select options
- whether a clinical field is required
- structured Objective content

## 8. Stable identity contract

Display labels are not identifiers.

Required distinction:

```text
field_id = stable identity
label    = editable presentation
```

Example:

```json
{
  "id": "gcs_eye",
  "label": "GCS Eye"
}
```

The label may later become:

```text
Glasgow Coma Scale — Eye
```

without changing the field identity.

Section IDs must follow the same principle.

IDs must remain unique within the relevant template definition.

## 9. Supported MVP field types

The first renderer contract remains intentionally small:

```text
text
textarea
number
select
multiselect
checkbox
```

Date, time, radio, repeatable groups, conditional logic, calculated fields, and other advanced controls are not part of the first implementation contract unless they are explicitly added through a new contract version.

The current repository already uses the controlled field catalog above; the first migration should extend that foundation rather than introduce an unrelated schema.

## 10. Data model strategy

The current product contract uses a **hybrid relational + JSONB model**.

### Relational

Used for:

- template identity
- ownership
- template type
- archival state
- version identity
- version number
- relationships to rotation/context
- relationships to Follow-Up history

### JSONB

Used for:

- template definition
- structured section/field configuration
- Follow-Up answers
- historical template snapshot

This preserves relational integrity for ownership/history while allowing user-specific document structure to evolve without adding a database column for every clinical field.

## 11. Answer storage

Structured answers are keyed by stable field ID:

```json
{
  "gcs_eye": "4",
  "gcs_verbal": "5",
  "gcs_motor": "6",
  "motorik": "5/5 kanan, 5/5 kiri"
}
```

The answer payload is data, not template definition.

A field label changing must not invalidate existing answers.

The renderer reads the template definition and resolves values using stable field IDs.

## 12. Historical snapshot contract

When a Follow-Up is persisted with a template:

```text
Template identity
+ template version
+ schema version
+ exact template definition snapshot
+ answers
```

must be preserved with the Follow-Up.

Historical Follow-Up rendering must use the pinned snapshot, not the current template.

Example:

```text
Follow-Up #001 → Template v3
Template now → v7

Follow-Up #001 must continue to render as v3.
```

The current repository already establishes this snapshot direction and it must remain the historical source of truth.

## 13. Template lifecycle

Conceptual lifecycle:

```text
Draft / being prepared
      ↓
Available
      ↓
Used by a Follow-Up
      ↓
Immutable historical version
      ↓
Archived when no longer offered
```

Critical rule:

> A template version that has been referenced by persisted clinical history must not be edited in place.

A change creates a new version.

Version numbering is monotonic per template:

```text
v1 → v2 → v3 → ...
```

Optimistic concurrency must prevent two browser sessions from silently creating conflicting next versions.

## 14. Template binding contract

Rotation is context. Template is configuration.

The selection contract is:

```text
Active Rotation
    ↓
Available templates
    ↓
Selected template/version
    ↓
New Follow-Up
```

A rotation may support more than one documentation template over its lifecycle, for example:

```text
Neurologi
├── Follow-Up Harian
├── Follow-Up Jaga
└── Follow-Up Konsulen
```

The system must not collapse a rotation into exactly one permanent template.

The binding model must preserve the selected template/version for the context that created the Follow-Up.

## 15. Starter template contract

A starter template is a convenience mechanism.

```text
Starter template
    ↓ clone
Personal template
```

After cloning, the personal template is independent.

Changes to the starter must not silently modify the user's personal template.

Starter templates are examples / starting points, not universal clinical standards.

A user must also be able to start from an empty template when appropriate.

## 16. Customization UX contract

Primary product principle:

> **Use first, configure when needed, refine over time.**

Users should be able to work immediately from a starter template.

The normal Follow-Up screen must not expose implementation concepts such as:

- JSON schema
- version IDs
- database IDs
- binding records
- synchronization internals

Customization happens through user-facing language such as:

- Format Dokumentasi
- Tambah Pemeriksaan
- Tambah Section
- Edit Template
- Duplikat Template
- Riwayat Template

## 17. Quick customization contract

While writing a Follow-Up, the user may add a field without leaving the clinical workflow.

The result is explicitly one of:

```text
+ Tambah Pemeriksaan
    ├── Hanya Follow-Up ini
    └── Simpan ke Template
                 ↓
             New Version
```

Adding a field to one Follow-Up must not automatically mutate the active template.

## 18. Report contract

Report is a presentation layer.

```text
Persisted Follow-Up data
        ↓
Report Template
        ↓
Generated Report
```

Report formatting must not become the source of truth for clinical data.

Report generation must continue to support historical Follow-Up snapshots.

## 19. Slaberan contract

Slaberan remains a separate domain.

It may reuse generic configuration primitives, but its business semantics must not be forced into the Follow-Up schema.

The architecture should permit:

```text
Shared configuration primitives
├── template
├── version
├── section
├── field
└── binding

Domain implementations
├── Follow-Up
├── Report
└── Slaberan
```

## 20. Offline and synchronization contract

Configuration is first-class workspace data.

The local application must be capable of retaining the configuration needed to create and edit Follow-Ups offline.

At minimum, the offline graph must preserve:

```text
Rotation
Template
Template Version
Template selection/binding
Follow-Up
Answers
Snapshot
```

A Follow-Up created offline must remain pinned to the template version that was actually used.

A later online template update must not rewrite the historical reference.

Sync failures must fail safely without discarding valid local clinical work.

## 21. Backup / restore contract

A valid workspace backup must preserve both configuration and clinical data.

Conceptually:

```text
Workspace snapshot
├── profile / workspace metadata
├── rotations
├── templates
├── template versions
├── template bindings
├── patients
├── Follow-Ups
├── supporting exams
├── report configuration
└── relevant attachment references
```

Restore must preserve relationships and historical template references.

A restore operation must not report success after a partial configuration/history restore.

## 22. UX architecture principles

The application should hide configuration complexity.

### Daily work

Primary flow:

```text
Active Stase
   ↓
Patient
   ↓
+ Follow-Up
   ↓
Template-driven form
   ↓
Save
```

### Configuration

Secondary flow:

```text
Pengaturan
   ↓
Format Dokumentasi
   ↓
Template
   ↓
Edit / Duplicate / History
```

The two flows are intentionally separated.

The daily clinical workflow must remain fast even when the configuration engine is sophisticated.

## 23. Responsive product contract

The same product logic must work on desktop, tablet, and mobile.

Desktop may use:

```text
Structure | Preview | Properties
```

for template editing.

Mobile should use a stacked or drawer-based experience.

Clinical entry screens should prioritize:

- readable field hierarchy
- touch-friendly controls
- reachable save actions
- clear active-stase context
- no unintended horizontal overflow

## 24. Explicit non-goals for current scope

Not part of this product contract:

- collaborative workspaces
- workspace membership
- RBAC for multiple members
- invitations
- shared tenant administration
- billing/subscription
- universal hospital templates
- specialty-specific hardcoded renderers
- advanced form-builder logic before the MVP contract is stable

## 25. Migration principle

The existing RekamMedisku implementation already contains an important part of the target foundation:

- user-owned templates
- versioned template definitions
- rotation/template references
- Follow-Up template snapshots
- structured JSONB answers
- definition-driven Follow-Up rendering

Therefore, implementation must **extend and harden the existing foundation** rather than recreate the same system under new names.

Existing working behavior remains protected until the replacement path is verified.

## 26. Acceptance gates for this contract

Section 00 is complete when all of the following are true at the product-contract level:

- 1 account = 1 personal workspace is unambiguous.
- Rotation is context, not template.
- Clinical Document Template is the configuration abstraction.
- Objective is a structured configurable section.
- Core/system fields are separated from configurable clinical content.
- Field and section identity is stable and independent from labels.
- The relational + JSONB hybrid strategy is accepted.
- Answers are keyed by stable field IDs.
- Used template versions are immutable.
- Follow-Up history is pinned to a template snapshot/version.
- Multiple documentation templates can exist for one rotation/context.
- Starter templates clone into independent personal templates.
- Quick customization does not silently mutate a template.
- Offline/sync and backup/restore preserve configuration/history relationships.
- Report and Slaberan remain separate domains.
- No new specialty-specific renderer is introduced.

## 27. Implementation gate

No broad schema migration should begin until this contract is committed to the repository and the implementation tasks below can reference it as the baseline.

Next dependency:

```text
PRODUCT CONTRACT
      ↓
TEMPLATE FOUNDATION
      ↓
VERSION + LIFECYCLE
      ↓
ROTATION + BINDING
      ↓
STARTER TEMPLATE
      ↓
RENDERER CONTRACT
```
