# RekamMedisku

Personal clinical documentation workspace for medical students and co-assistants.

RekamMedisku is a web application for organizing clinical rotations, patient records, follow-up documentation, supporting examinations, report generation, and backups in one workspace.

> RekamMedisku is a personal documentation workspace. It is not a hospital EMR or an official medical record system.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![CI](https://github.com/arjunmrti/RekamMedisku/actions/workflows/qa.yml/badge.svg)](https://github.com/arjunmrti/RekamMedisku/actions/workflows/qa.yml)

## Features

- Rotation-based patient management
- Structured SOAP-style follow-up documentation
- Rotation-specific examination templates
- Patient timeline and clinical history
- Supporting examination records and attachments
- Report generation from saved follow-ups
- JSON backup and restore with validation
- Supabase authentication and cloud synchronization
- Realtime workspace updates
- Local persistence with localStorage and IndexedDB
- User-scoped workspace data for multi-user isolation
- User-owned follow-up and report template foundations

## Architecture

```text
React + TypeScript + Vite
          |
          +----------------------+
          |                      |
          v                      v
   Local Workspace          Sync Engine
localStorage / IndexedDB         |
          |                      v
          +--------------->   Supabase
                              |  |  |
                              |  |  +-- Storage
                              |  +----- PostgreSQL
                              +-------- Auth / Realtime
```

The application separates UI components, page-level workflows, domain types, local persistence, remote data access, synchronization, and shared utilities.

The local data layer provides fast client-side access, while Supabase provides authentication, synchronized cloud data, realtime updates, and file storage.

## Multi-User Direction

The current development focus is **multi-user readiness without unnecessary architectural changes**.

The existing architecture is intentionally preserved around:

- Supabase Auth for account and session handling
- PostgreSQL RLS and `auth.uid()` ownership boundaries
- Application profile data as the source of report identity
- User-scoped local persistence
- User-scoped IndexedDB attachment storage
- Private Supabase Storage with user-based object paths
- Immutable historical template snapshots
- Definition-driven follow-up and report rendering
- Atomic database operations for critical mutations
- Realtime sync with watchdog, retry, and reconciliation behavior

The goal is to strengthen tenant isolation, personalization, account lifecycle, storage lifecycle, synchronization reliability, and automated regression coverage for a practical multi-user deployment.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19 |
| Language | TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Local Persistence | localStorage + IndexedDB |
| Unit / Integration Testing | Node.js test runner |
| Browser E2E | Playwright |
| Linting | Oxlint |
| CI | GitHub Actions |

## Engineering

The project includes:

- Rotation-aware data isolation
- Tenant-aware local workspace persistence
- Local-to-cloud synchronization and reconciliation
- Version-aware patient updates
- Atomic database operations for critical mutations
- Attachment lifecycle handling
- Backup schema and relationship validation
- Definition-driven follow-up and report templates
- Historical template snapshot support
- Automated CI quality checks
- Responsive desktop, tablet, and mobile layouts

## Quality & Testing

### QA

Run the application quality gate:

```bash
npm run qa
```

Equivalent checks:

```bash
npm run lint
npm run test
npm run build
```

### Browser E2E

Browser flows use Playwright and the repository configuration at `e2e/playwright.config.ts`.

Run:

```bash
npx playwright test --config=e2e/playwright.config.ts
```

Current verified browser coverage includes:

- Full workspace flow
- Report identity isolation
- Attachment IndexedDB isolation
- No-workspace attachment protection
- User-to-user workspace transition

### Database Tests

Database regression tests use Supabase CLI and pgTAP in an isolated local environment.

```bash
npx supabase test db
```

Local database tests require Docker and a reproducible Supabase local database environment.

The database test contract covers tenant isolation, RLS ownership, cross-user relationship protection, template ownership, versioning, and concurrency-sensitive mutations.

### Verification Policy

A check is considered successful only when the test actually executes and produces a verifiable result.

Environment failures, unavailable runners, missing local services, or setup failures are tracked separately from application/test failures.

## Database

Database migrations are versioned in:

```text
supabase/migrations/
```

The migration history covers workspace safety, follow-up integrity, attachment storage, atomic mutations, patient lifecycle handling, and related application features.

Database tests are kept isolated from production data and must not use destructive operations against the remote production project.

## Project Structure

```text
RekamMedisku/
├── src/
│   ├── components/    # Shared UI components
│   ├── data/          # Local and Supabase data access
│   ├── hooks/         # React hooks and state
│   ├── pages/         # Application workflows
│   ├── types/         # Domain types
│   └── utils/         # Shared utilities
├── supabase/
│   ├── migrations/    # Database migrations
│   └── tests/         # Database / pgTAP tests
├── e2e/               # Browser E2E tests
├── scripts/            # Project scripts
├── tests/              # Automated unit/integration tests
└── .github/
    └── workflows/      # CI configuration
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- Supabase project

For local database testing:

- Docker Desktop
- WSL 2 on Windows

### Installation

```bash
git clone https://github.com/arjunmrti/RekamMedisku.git
cd RekamMedisku
npm ci
```

### Environment

Create a local environment file:

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

## Deployment

The application produces a standard Vite production build and can be deployed to Vercel, Cloudflare Pages, or Netlify.

Recommended topology:

```text
GitHub
  |
  v
Vercel
  |
  v
React + Vite
  |
  +----> Supabase Auth
  +----> Supabase PostgreSQL
  +----> Supabase Realtime
  +----> Supabase Storage
```

Before production release, verify migrations, authentication settings, database policies, storage policies, Storage lifecycle behavior, and production environment variables.

## Data Safety

Use dummy or anonymized data for development and demonstrations.

Backup files should be treated as sensitive data. Production authorization and storage policies should be reviewed before using the application with real clinical information.

For multi-user use, tenant isolation must be verified at both the cloud and local-browser layers before broader release.

## Current Status

**Production-oriented MVP — multi-user hardening / pre-deployment verification**

Current work is focused on:

- Multi-user tenant isolation
- Application profile and report identity
- User-owned follow-up/report templates
- Historical report compatibility
- Sync and storage consistency
- Automated Browser E2E
- Database regression testing with pgTAP
- Final production QA and deployment verification

The project should not be considered production-ready until the required application, browser, database, and environment verification gates have produced reproducible results.

## Author

**Arjuna Murti**

This project is part of my portfolio and reflects work across frontend engineering, product-oriented UX, data persistence, synchronization, and application reliability.
