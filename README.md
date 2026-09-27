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
| Testing | Node.js test runner |
| Linting | Oxlint |
| CI | GitHub Actions |

## Engineering

The project includes:

- Rotation-aware data isolation
- Local-to-cloud synchronization and reconciliation
- Version-aware patient updates
- Atomic database operations for critical mutations
- Attachment lifecycle handling
- Backup schema and relationship validation
- Automated CI quality checks
- Responsive desktop, tablet, and mobile layouts

## Quality

Run the full quality gate:

```bash
npm run qa
```

Equivalent checks:

```bash
npm run lint
npm run test
npm run build
```

GitHub Actions runs these checks for pushes and pull requests targeting `main`.

Manual QA coverage includes rotation isolation, patient lifecycle, follow-ups, attachments, history, reports, backup/restore, responsive behavior, accessibility, and data safety.

## Database

Database migrations are versioned in:

```text
supabase/migrations/
```

The migration history covers workspace safety, follow-up integrity, attachment storage, atomic mutations, patient lifecycle handling, and related application features.

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
│   └── migrations/    # Database migrations
├── scripts/            # Project scripts
├── tests/              # Automated tests
└── .github/
    └── workflows/      # CI configuration
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- Supabase project

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

Before production release, verify migrations, authentication settings, database policies, storage policies, and production environment variables.

## Data Safety

Use dummy or anonymized data for development and demonstrations.

Backup files should be treated as sensitive data. Production authorization and storage policies should be reviewed before using the application with real clinical information.

## Status

**Production-oriented MVP — pre-deployment**

Core application workflows, Supabase integration, database migrations, automated QA, and responsive UI are implemented. Current work is focused on final production verification and deployment.

## Author

**Arjuna Murti**

This project is part of my portfolio and reflects work across frontend engineering, product-oriented UX, data persistence, synchronization, and application reliability.
