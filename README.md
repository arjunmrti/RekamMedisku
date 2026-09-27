# RekamMedisku

RekamMedisku adalah **personal clinical documentation workspace** untuk mahasiswa kedokteran/co-assistant. Aplikasi ini membantu mengelola stase, pasien, catatan follow-up, timeline klinis, pembuatan laporan, workspace Slaberan, serta backup data.

> RekamMedisku bukan sistem rekam medis rumah sakit dan bukan pengganti EMR resmi. Data aplikasi digunakan untuk dokumentasi pribadi dan dapat tersimpan secara lokal pada browser serta tersinkron ke Supabase setelah pengguna login.

## Fitur utama

- **Rotation Management** — mengelola daftar stase, status stase, dan stase aktif.
- **Patient Management** — menambah, melihat, mengubah, mengarsipkan, serta menghapus pasien.
- **Follow-up Documentation** — mencatat follow-up pasien menggunakan struktur SOAP dan pemeriksaan penunjang.
- **Patient Timeline & Profile** — melihat riwayat dokumentasi pasien secara terstruktur.
- **Report Generator** — menyusun catatan menjadi format laporan yang dapat dibagikan.
- **Slaberan Workspace** — mengatur lokasi bangsal/unit dan template laporan yang dapat diekspor atau diimpor.
- **Backup & Restore** — export dan restore data aplikasi, termasuk lampiran dan konfigurasi workspace.
- **Local-first cache** — browser tetap menjadi cache kerja utama sehingga workspace masih dapat dibuka saat sinkronisasi cloud sedang bermasalah.
- **Supabase sync** — data workspace tersinkron untuk akun terautentikasi dengan RLS, optimistic concurrency, dan background recovery.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase JS
- Supabase PostgreSQL / Auth / Storage / Realtime
- Oxlint
- Node.js test runner
- localStorage + IndexedDB

## Menjalankan project

Pastikan Node.js dan npm sudah tersedia.

```bash
npm ci
npm run dev
```

Aplikasi development tersedia pada alamat yang ditampilkan oleh Vite.

## Quality checks

Project menyediakan satu command QA yang menjalankan pemeriksaan utama:

```bash
npm run qa
```

Command tersebut menjalankan:

1. `npm run lint`
2. `npm run test`
3. `npm run build`

Build production dapat diverifikasi secara terpisah dengan:

```bash
npm run build
```

Workflow GitHub Actions juga menjalankan lint, test, dan build untuk push serta pull request.

## Struktur utama

```text
src/
├─ components/     # auth, UI, workspace, dan form
├─ data/           # persistence, Supabase sync, backup, attachment
├─ hooks/           # auth dan workspace sync hooks
├─ pages/           # halaman utama aplikasi
├─ types/           # TypeScript types
└─ utils/           # validation, generator, backup, dan helper

supabase/
└─ migrations/      # perubahan schema, RLS, RPC, dan Storage policy

tests/              # automated tests
scripts/            # test runner
.github/workflows/  # GitHub Actions QA
```

## Data dan sinkronisasi

Workspace menggunakan pendekatan **local-first + cloud sync**.

- Cache browser dipakai untuk menjaga UI tetap responsif.
- Setelah login, Supabase menjadi sumber data cloud untuk workspace tersinkron.
- Realtime memicu refresh saat ada perubahan.
- Watchdog melakukan refresh berkala untuk menutup celah Realtime yang macet atau diam.
- Saat jaringan kembali online atau tab kembali aktif, sinkronisasi dipicu lagi.
- Kegagalan sync tidak lagi memblokir seluruh UI; aplikasi dapat melanjutkan dari cache lokal sambil mencoba recovery di background.

## Backup

Backup memakai JSON dengan `schemaVersion` terpusat dan validasi struktur sebelum restore.

- Maksimal ukuran file backup: **25 MB**.
- Lampiran individual dibatasi **2 MB**.
- Restore memverifikasi relasi pasien, follow-up, stase, workspace Slaberan, dan lampiran sebelum mengubah snapshot lokal.
- Template Slaberan yang diimpor harus memakai schema yang didukung dan melewati validasi blok serta ID.

## Catatan keamanan Supabase

Database exposed menggunakan RLS, ownership checks, dan RPC `SECURITY INVOKER` untuk operasi sensitif.

Password protection terhadap password yang pernah bocor perlu diaktifkan pada **Auth settings** project Supabase. Pengaturan ini merupakan konfigurasi platform, bukan migration database.

## Status

RekamMedisku saat ini berada pada tahap **MVP / production-oriented frontend + Supabase workspace sync**, dengan fokus pada stabilitas dokumentasi klinis, integritas data, backup/restore, dan recovery saat layanan cloud mengalami gangguan.
