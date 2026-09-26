# RekamMedisku

RekamMedisku adalah **personal clinical documentation workspace** untuk mahasiswa kedokteran/co-assistant. Aplikasi ini membantu mengelola stase, pasien, catatan follow-up, timeline klinis, pembuatan laporan, serta backup data secara lokal di browser.

> RekamMedisku bukan sistem rekam medis rumah sakit dan bukan pengganti EMR resmi. Data aplikasi MVP disimpan secara lokal pada browser pengguna.

## Fitur utama

- **Rotation Management** — mengelola daftar stase, status stase, dan stase aktif.
- **Patient Management** — menambah, melihat, mengubah, serta menghapus pasien secara permanen.
- **Follow-up Documentation** — mencatat follow-up pasien menggunakan struktur SOAP dan field pemeriksaan yang relevan.
- **Patient Timeline & Profile** — melihat riwayat dokumentasi pasien secara terstruktur.
- **Report Generator** — menyusun catatan menjadi format laporan yang dapat dibagikan.
- **Backup & Restore** — export dan restore data aplikasi beserta riwayat operasi backup.
- **Local-first storage** — data utama menggunakan `localStorage` dan IndexedDB tanpa backend/auth pada MVP.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
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

Project menyediakan satu command QA yang menjalankan seluruh pemeriksaan utama:

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

## Struktur utama

```text
src/
├─ data/          # persistence, backup, attachment, dan data access layer
├─ pages/         # halaman utama aplikasi
├─ types/         # TypeScript types
└─ ...
tests/             # automated tests
scripts/            # test runner
.github/workflows/  # GitHub Actions QA
```

## Catatan data lokal

Karena MVP bersifat local-first, data aplikasi melekat pada browser/device yang digunakan. Menghapus site data, storage browser, atau menggunakan browser/device berbeda dapat membuat data lokal tidak tersedia.

Untuk deployment production, mekanisme backup/restore dan validasi data lokal perlu dipertahankan sebagai bagian dari alur penggunaan.

## Status

RekamMedisku saat ini berada pada tahap **MVP / production-oriented frontend** dengan fokus pada stabilitas alur dokumentasi klinis, cleanup data demo, dan quality checks otomatis.
