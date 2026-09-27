# RekamMedisku

Personal clinical documentation workspace for medical students and co-assistants.

RekamMedisku is a product-oriented web application designed to simplify clinical rotation documentation by bringing patient management, follow-up records, examination findings, report generation, and data backup into a single workspace.

The project emphasizes a responsive user experience, structured clinical workflows, reliable data handling, and a practical local-first architecture with Supabase synchronization.

> **Scope:** RekamMedisku is a personal documentation workspace. It is not a hospital EMR, official medical record system, or institutional clinical information system.

## Product Overview

Clinical documentation during rotations often involves maintaining patient context, recording repeated follow-ups, attaching supporting examinations, and preparing reports across different workflows.

RekamMedisku addresses this workflow with a focused workspace built around:

- Rotation-based patient organization
- Structured follow-up documentation
- Patient timelines and history
- Supporting examinations and file attachments
- Report generation
- Backup and restore
- Authenticated cloud synchronization

The interface is designed for repeated daily use, with an emphasis on clear hierarchy, responsive layouts, and predictable interaction patterns.

## Core Features

### Rotation Management

Manage clinical rotations and establish an active rotation as the current workspace context. Patient data is isolated by rotation to reduce accidental cross-rotation access.

### Patient Management

Create, edit, archive, restore, and permanently delete patients while preserving associated documentation and enforcing rotation-level uniqueness for medical record numbers.

### Clinical Follow-Up

Record structured follow-ups using SOAP-style workflows with rotation-specific examination templates, draft states, follow-up numbering, and chronological history.

### Supporting Examinations

Create and manage supporting examination records with image and PDF attachments, including client-side validation and Supabase Storage integration.

### Report Generation

Generate reports directly from saved follow-up data, preview the generated output, make temporary edits, regenerate from the latest source data, and copy the result without modifying the original clinical record.

### Backup and Restore

Export workspace data as JSON and restore validated backups with schema, relationship, and integrity checks designed to prevent partial or inconsistent restores.

### Cloud Synchronization

Use Supabase for authentication, PostgreSQL persistence, realtime updates, and file storage while maintaining local workspace data for responsive interaction and offline-tolerant behavior.

## Technical Architecture

```text
                         RekamMedisku
                              |
                 +------------+------------+
                 |                         |
                 v                         v
        React + TypeScript          Local Workspace
             + Vite                 localStorage / IndexedDB
                 |                         |
                 +------------+------------+
                              |
                         Sync Engine
                              |
                              v
                         Supabase
            +----------------+----------------+
            |                |                |
            v                v                v
          Auth           PostgreSQL        Storage
                              |
                              v
                          Realtime
```

The application separates UI concerns, local persistence, remote data access, synchronization, and domain-specific utilities. Supabase acts as the cloud data layer for supported entities, while local storage provides fast workspace access and a resilient client-side cache.

## Technology Stack

| Area | Technology |
| --- | --- |
| UI | React 19 |
| Language | TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| File Storage | Supabase Storage |
| Local Persistence | localStorage + IndexedDB |
| Linting | Oxlint |
| Testing | Node.js test runner |
| CI | GitHub Actions |

## Engineering Highlights

- Rotation-aware data isolation and patient context handling
- Local-to-cloud synchronization and reconciliation
- Optimistic local state with cloud persistence
- Conflict-aware patient updates using version timestamps
- Atomic database operations for critical mutations
- Attachment lifecycle and storage cleanup handling
- Validated backup and restore workflows
- Automated linting, tests, and production builds in CI
- Responsive UI behavior across desktop, tablet, and mobile layouts

## Quality Assurance

The repository includes both automated and manual verification.

### Automated

```bash
npm run lint
npm run test
npm run build
```

Or run the complete quality gate:

```bash
npm run qa
```

GitHub Actions runs the same core checks on pushes and pull requests targeting `main`.

### Manual

The project includes a QA checklist covering:

- Rotation isolation
- Patient CRUD and lifecycle
- Follow-up workflows
- Supporting examinations
- Attachment handling
- Timeline and history
- Report generation
- Backup and restore
- Responsive behavior
- Keyboard accessibility
- Data safety

## Database Migrations

Database changes are versioned in:

```text
supabase/migrations/
```

The migration history covers workspace safety, follow-up integrity, attachment storage, atomic mutations, patient lifecycle handling, patient location modelling, and related domain changes.

Keeping migrations in source control makes the database structure reproducible across environments and supports a controlled production deployment process.

## Project Structure

```text
RekamMedisku/
├── src/
│   ├── components/       # Reusable UI components
│   ├── data/             # Local persistence and Supabase data access
│   ├── hooks/            # React hooks and application state
│   ├── pages/            # Feature and workflow pages
│   ├── types/            # Shared domain types
│   └── utils/            # Backup, reporting, formatting, and helpers
├── supabase/
│   └── migrations/       # Database migrations
├── scripts/               # Project and test scripts
├── tests/                 # Automated tests
└── .github/
    └── workflows/         # CI configuration
```

## Getting Started

### Requirements

- Node.js 22+
- npm
- A configured Supabase project for authentication and cloud-backed features

### Installation

```bash
git clone https://github.com/arjunmrti/RekamMedisku.git
cd RekamMedisku
npm ci
```

### Environment Variables

Create a local environment file containing:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Quality Gate

```bash
npm run qa
```

## Deployment

The application produces a standard Vite production build and is suitable for frontend platforms such as Vercel, Cloudflare Pages, or Netlify.

Recommended production topology:

```text
GitHub
   |
   v
Vercel
   |
   v
React + Vite
   |
   +------> Supabase Auth
   +------> Supabase PostgreSQL
   +------> Supabase Realtime
   +------> Supabase Storage
```

Before production release, the deployment should use the intended Supabase project, verified migrations, configured authentication settings, and tested database and storage access policies.

## Data Safety

Because the application may process sensitive clinical documentation, development and demonstration environments should use dummy or anonymized data.

Backup files should be treated as sensitive data. Production access policies, authentication, database authorization, and storage rules should be validated before real-world use.

## Project Status

**Production-oriented MVP — pre-deployment**

The core application workflows, synchronization layer, database migrations, automated quality checks, and responsive interface are implemented. The remaining work is focused on final production verification, deployment configuration, and launch readiness.

## Author

**Arjuna Murti**

RekamMedisku is a portfolio project focused on product-oriented frontend engineering, healthcare workflow design, data persistence, synchronization, and application reliability.

---

For portfolio review, the most relevant areas of the codebase are the data layer, Supabase synchronization engine, clinical documentation workflows, backup/restore validation, and CI/QA setup.
