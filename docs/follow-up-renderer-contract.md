# Follow-Up Renderer Contract

Status: Baseline / Locked for schema_version=1

## Purpose

The Follow-Up renderer consumes a validated template definition and produces an input experience without specialty-specific React branches.

```text
Template Definition
  ↓
Renderer
  ↓
Field Controls
  ↓
Typed Answers
```

## Supported field types

| Template type | UI control | Answer shape |
| --- | --- | --- |
| text | text input | string or null |
| textarea | textarea | string or null |
| number | numeric input | number or null |
| select | select | string; empty string means not selected |
| multiselect | checkbox list | string[] |
| radio | radio group | string; empty string means not selected |
| checkbox | checkbox | boolean |
| date | date input | string; empty string means not selected |
| time | time input | string; empty string means not selected |

The empty numeric value is represented as `null`, not an empty string.

## Stable identity

The renderer reads and writes answers by `field.id`.

```text
field.id = stable identity
field.label = display label
```

The UI must never use the label as the answer key.

## Validation contract

The runtime validates:

- field type/value shape
- finite numeric values
- select values against the template option catalog
- multiselect values against the option catalog
- duplicate multiselect selections
- boolean checkbox values
- required-field completeness through the existing required-field validator

Unknown answer keys may remain in persisted payloads for compatibility, but the renderer only resolves fields declared by the active template definition.

## Formatting contract

When creating the compatibility Objective text:

- select values are rendered using their human-readable option labels;
- multiselect values are rendered using their human-readable option labels;
- units are appended from the field definition;
- empty values are omitted;
- no specialty-specific branch may be required to format a template answer.

## Historical rendering

A persisted Follow-Up must render from its pinned template snapshot/version. The renderer must not resolve historical forms from the latest template.

## Migration boundary

The current Follow-Up page still contains legacy fixed sections and a dynamic template renderer inside Objective. That is an intentional compatibility stage.

The final migration target is:

```text
Follow-Up Template
  ↓
schema-driven sections
  ↓
renderer
  ↓
typed answers
```

Legacy specialty-specific Objective structures must not be expanded. They are scheduled for deprecation only after the schema-driven path passes regression and historical compatibility gates.