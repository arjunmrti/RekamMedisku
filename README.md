# RekamMedisku

> A personal clinical documentation workspace designed to help medical students organize rotations, patient notes, follow-ups, clinical findings, and reports in one focused workspace.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/) [![License](https://img.shields.io/badge/License-Private-lightgrey)](#)

## Overview

RekamMedisku is a personal clinical documentation application built for medical students and co-assistants who need a practical way to manage day-to-day documentation during clinical rotations.

The project focuses on reducing friction between **patient management, follow-up documentation, clinical history, report preparation, and backup** while keeping the interface simple enough for repeated use in a busy clinical workflow.

The application uses a **local-first data layer with Supabase synchronization**, allowing the workspace to remain responsive while supporting authenticated cloud persistence, realtime updates, and attachment storage.

> **Scope:** RekamMedisku is a personal documentation workspace and is not intended to replace a hospital EMR, official medical record system, or institutional clinical information system.

## Key Features

### 🏥 Rotation Management
- Create and manage clinical rotations.
- Define an active rotation as the current workspace context.
- Keep patient data isolated by rotation.

### 👤 Patient Management
- Add, edit, archive, restore, and permanently delete patients.
- Prevent duplicate medical record numbers within the same rotation.
- Preserve patient history across profile updates and status changes.

### 📝 Follow-Up Documentation
- Structured follow-up workflow based on SOAP-style documentation.
- Rotation-specific examination templates.
- Support for neurology and internal medicine documentation flows.
- Draft and saved follow-up states.
- Follow-up numbering and chronological patient history.

### 📎 Supporting Examinations & Attachments
- Store supporting examination records.
- Attach images or PDF files.
- Validate attachment size before upload.
- Integrate attachment references with Supabase Storage.

### 🧾 Report Generator
- Generate reports from saved follow-up data.
- Support different report templates.
- Preview, edit, regenerate, and copy generated reports.
- Keep report editing separate from the original saved follow-up.

### 💾 Backup & Restore
- Export workspace data to JSON.
- Restore validated backups.
- Validate schema version and data relationships.
- Include backup history and data integrity checks.

### 🔄 Cloud Sync
- Supabase Authentication.
- PostgreSQL-backed workspace persistence.
- Realtime synchronization for workspace changes.
- Storage integration for attachments.
- Local cache + cloud reconciliation flow.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 |
| Language | TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend / Database | Supabase + PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| File Storage | Supabase Storage |
| Local Persistence | localStorage + IndexedDB |
| Linting | Oxlint |
| Testing | Node.js test runner |
| CI | GitHub Actions |

## Architecture

```text
┌──────────────────────────────────────────────┐
│                 React + Vite                 │
│                    Frontend                  │
├──────────────────────────────────────────────┤
│ Pages • Components • Hooks • Data Access     │
└──────────────────────┬───────────────────────┘
                       │
             Local-first workspace
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
   localStorage                IndexedDB
          │                         │
          └────────────┬────────────┘
                       │
                 Sync / Reconcile
                       │
                       ▼
              ┌─────────────────┐
              │    Supabase     │
              ├─────────────────┤
              │ Auth            │
              │ PostgreSQL      │
              │ Realtime        │
              │ Storage         │
              └─────────────────┘
```

The application is designed so the UI can work with local workspace state while synchronized cloud data acts as the authoritative source for supported remote entities.

## Quality & Reliability

The project includes automated checks through GitHub Actions.

```bash
npm run qa
```

The QA command covers:

1. Linting
2. Automated tests
3. Production build

The repository also contains a manual QA checklist covering:

- rotation isolation
- patient CRUD
- follow-up workflows
- supporting examinations
- attachment handling
- patient timeline
- report generation
- backup & restore
- responsive layouts
- keyboard accessibility
- data safety scenarios

## Database & Migrations

Database changes are versioned under:

```text
supabase/migrations/
```

The migration history includes work for:

- workspace safety
- follow-up integrity
- attachment storage
- atomic follow-up saves
- rotation atomicity
- patient storage cleanup
- patient admission data
- patient location modelling
- Slaberan-related data and templates

This keeps the application data model reproducible across development and production environments.

## Project Structure

```text
RekamMedisku/
├── src/
│   ├── components/     # Reusable UI components
│   ├── data/           # Local persistence and Supabase data access
│   ├── hooks/          # React hooks and workspace state
│   ├── pages/          # Application pages
│   ├── types/          # Shared TypeScript types
│   └── utils/          # Formatting, backup, reporting, and helpers
├── supabase/
│   └── migrations/     # Database migrations
├── scripts/            # Test and project scripts
├── tests/              # Automated tests
└── .github/
    └── workflows/      # CI / QA workflow
```

## Getting Started

### Requirements

- Node.js 22+
- npm
- A configured Supabase project for authenticated/cloud features

### Installation

```bash
git clone https://github.com/arjunmrti/RekamMedisku.git
cd RekamMedisku
npm ci
```

### Environment Variables

Create a local environment file based on the example configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Run Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Run QA

```bash
npm run qa
```

## Deployment

The frontend is structured as a standard Vite production build and can be deployed to modern static/frontend platforms such as **Vercel, Cloudflare Pages, or Netlify**.

Recommended production architecture:

```text
GitHub
   │
   └── main
        │
        ▼
     Vercel
        │
        ▼
  React + Vite App
        │
        └──────────────► Supabase
                         ├── Auth
                         ├── PostgreSQL
                         ├── Realtime
                         └── Storage
```

Production deployment should only use the intended Supabase project, verified migrations, correct authentication configuration, and tested Row Level Security / Storage policies.

## Data Safety

RekamMedisku handles documentation that may contain sensitive clinical information. The project is therefore designed with explicit data-safety boundaries:

- Use dummy or anonymized data for development and demonstrations.
- Treat exported backup files as sensitive data.
- Keep Supabase authorization and database policies configured for the deployed environment.
- Do not position the application as an official hospital medical record system.

## Current Status

**Production-oriented MVP — pre-deployment**

The core application workflows, cloud synchronization layer, database migrations, automated QA, and responsive UI are in place. The current focus is final production verification, deployment configuration, and launch readiness.

## Author

**Arjuna Murti**

Built as a personal product/project exploring practical healthcare workflow software, frontend engineering, data persistence, and product-oriented UX.

---

⭐ If you are reviewing this project as part of my portfolio, the most relevant areas to explore are the **data architecture, Supabase synchronization, clinical documentation flows, backup/restore validation, and automated QA setup**.