# Product Requirements Document (PRD)
# RekamMedisku — Personal Workspace + User-Specific Clinical Configuration

**Dokumen:** PRD Produk, UX, dan Arsitektur Fungsional  
**Status:** Draft — Product & Architecture Baseline  
**Tanggal:** 30 September 2026  
**Produk:** RekamMedisku  
**Platform:** Web Application  

---

## 0. Executive Summary

RekamMedisku adalah aplikasi dokumentasi klinis personal yang dirancang dengan prinsip:

> **1 akun = 1 Personal Workspace.**

Setiap workspace memiliki kebutuhan, stase, jenis follow-up, format laporan, format slaberan, dan kebiasaan dokumentasi yang dapat berbeda. Perbedaan tersebut tidak boleh diselesaikan dengan membuat banyak form hardcoded di frontend.

RekamMedisku menggunakan pendekatan:

```text
Personal Workspace
      ↓
Active Rotation / Stase
      ↓
Clinical Configuration
      ↓
Clinical Document Template
      ↓
Template Version
      ↓
Follow-Up Instance
      ↓
Clinical Answers / Snapshot
```

Fokus produk bukan collaborative/team workspace. Setiap akun tetap memiliki workspace personal yang terisolasi. Fleksibilitas diberikan melalui **User-Specific Clinical Configuration**.

User harus dapat memulai dengan template default, lalu menyesuaikannya secara bertahap tanpa harus memahami konsep teknis seperti schema, version, binding, sync queue, atau snapshot.

Prinsip UX utama:

> **Use first, configure when needed.**

Kompleksitas configuration engine harus berada di belakang layar. Di sisi user, RekamMedisku harus terasa seperti aplikasi yang sudah mengikuti workflow mereka.

---

# 1. Visi Produk

Membangun personal clinical workspace yang membantu user mencatat, memantau, dan menghasilkan dokumentasi klinis dengan format yang dapat mengikuti cara kerja mereka.

Target pengalaman:

> **"Aplikasi mengikuti workflow saya, bukan saya yang mengikuti format aplikasi."**

Produk harus mampu mengakomodasi variasi format dokumentasi berdasarkan:

- stase/rotation;
- rumah sakit atau institusi;
- konteks pelayanan atau jenis follow-up;
- kebutuhan pemeriksaan;
- kebiasaan user;
- kebutuhan laporan;
- kebutuhan slaberan.

RekamMedisku tidak berusaha mendefinisikan satu format follow-up universal untuk semua user.

---

# 2. Problem Statement

## 2.1 Format follow-up tidak universal

Format follow-up pasien dapat berbeda antar stase dan institusi. Bahkan pada stase yang sama, user dapat mempunyai cara dokumentasi yang berbeda.

Contoh konseptual:

```text
User A
└── Neurologi
    └── Follow-Up format A

User B
└── Neurologi
    └── Follow-Up format B
```

Kesamaan nama stase tidak berarti struktur dokumentasi harus sama.

## 2.2 Objective membutuhkan struktur yang fleksibel

Pemeriksaan Objective sering terdiri dari bagian dan field yang berbeda sesuai konteks pemeriksaan.

Contoh:

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

User dapat membutuhkan struktur lain untuk stase atau konteks berbeda.

## 2.3 Hardcoded form tidak scalable

Pendekatan seperti:

```text
if specialty === "Neurologi" → renderNeurologyForm()
if specialty === "IPD"       → renderIPDForm()
```

membuat UI dan domain logic semakin bergantung pada daftar specialty. Penambahan format baru akan membutuhkan perubahan kode dan deployment.

## 2.4 Kebebasan penuh dari halaman kosong juga buruk untuk UX

Membuat semua user membangun format dari nol akan menambah beban onboarding.

Produk membutuhkan **starter/default templates** sebagai starting point.

## 2.5 Perubahan konfigurasi tidak boleh mengubah histori

Ketika user memperbarui template, follow-up lama harus tetap merepresentasikan struktur yang digunakan pada saat follow-up tersebut dibuat.

---

# 3. Product Positioning

RekamMedisku diposisikan sebagai:

```text
Personal Clinical Workspace
          +
Clinical Configuration Engine
          +
Clinical Data Management
```

Bukan:

```text
Generic form builder
```

dan bukan:

```text
One-format-for-everyone clinical app
```

Juga bukan collaborative/team SaaS pada fase ini.

---

# 4. Mental Model Produk

Mental model utama:

```text
                     ACCOUNT
                        │
                        ▼
              PERSONAL WORKSPACE
                        │
                ┌───────┴────────┐
                ▼                ▼
           STASE / ROTATION   PREFERENCES
                │
                ▼
       DOCUMENTATION FORMAT
                │
       ┌────────┼─────────┐
       ▼        ▼         ▼
  Follow-Up   Report   Slaberan
   Template   Template  Template
       │
       ▼
  Template Version
       │
       ▼
  Clinical Document
       │
       ▼
     Snapshot
```

User tidak perlu mengetahui implementasi teknis di balik mental model tersebut.

---

# 5. Target User Model

Target utama adalah pengguna individual yang membutuhkan pencatatan klinis personal dan workflow dokumentasi yang dapat berubah mengikuti stase dan konteks kerja.

Contoh:

```text
User A
└── Personal Workspace
    ├── Neurologi @ RS A
    │   ├── Follow-Up Harian
    │   └── Follow-Up Jaga
    └── IPD @ RS B
        └── Follow-Up Harian

User B
└── Personal Workspace
    └── Neurologi @ RS A
        └── Format berbeda dari User A
```

Satu user dapat memiliki beberapa rotation dan beberapa template pada rotation yang sama.

---

# 6. Prinsip Produk

## P1 — Personal by default

Satu akun mendapatkan satu personal workspace. Data dan konfigurasi utama terisolasi dalam workspace tersebut.

## P2 — Configurable, bukan hardcoded

Format clinical documentation dibaca dari konfigurasi dan dirender oleh schema-driven UI.

## P3 — Use first, configure when needed

User harus dapat langsung bekerja menggunakan starter template tanpa melakukan konfigurasi kompleks saat onboarding.

## P4 — Default adalah starting point

Default template membantu memulai, tetapi bukan standar klinis universal. Setelah dicopy, personal template menjadi independen.

## P5 — Template ≠ clinical data

Template menentukan struktur input. Follow-up menyimpan hasil klinis pada waktu tertentu.

## P6 — Used template versions are immutable

Version yang sudah digunakan oleh follow-up tidak boleh berubah secara retroaktif.

## P7 — Stable identity

Field menggunakan identifier stabil; label adalah atribut yang dapat diubah.

## P8 — Simplicity at the surface

UI harian harus sederhana walaupun engine di belakangnya sophisticated.

## P9 — Progressive disclosure

Pengaturan sederhana ditampilkan terlebih dahulu; konfigurasi lanjutan hanya muncul ketika dibutuhkan.

## P10 — Offline/sync safe

Configuration dan clinical data harus tetap konsisten pada local persistence, sync, backup, dan restore.

## P11 — Clinical data integrity

Perubahan configuration tidak boleh menghapus atau menafsirkan ulang histori clinical data.

## P12 — System structure vs user structure

Field/metadata inti yang dibutuhkan sistem tetap aman; bagian clinical yang memang dimaksudkan untuk dikustomisasi dapat diubah user.

---

# 7. Scope Produk

## 7.1 In Scope

1. Personal workspace per account.
2. Rotation/stase context.
3. User-specific clinical configuration.
4. Clinical Document Template.
5. Configurable Follow-Up structure.
6. Structured Objective fields.
7. Basic field schema dan field types.
8. Default/starter template library.
9. Clone default menjadi personal template.
10. Multiple templates per rotation.
11. Template binding ke rotation/context.
12. Immutable template versioning.
13. Follow-up snapshot terhadap template version.
14. Configurable report template.
15. Configurable slaberan template dan location.
16. Local persistence untuk configuration dan clinical data.
17. Sync dan recovery untuk configuration.
18. Backup/restore configuration bersama clinical data.
19. Responsive UI/UX desktop, tablet, dan mobile.
20. Simple customization dan advanced configuration bertahap.
21. Reusable components sebagai future capability.
22. Conditional field logic sebagai future capability.

## 7.2 Out of Scope Fase Ini

1. Collaborative workspace.
2. Multi-user membership dalam satu workspace.
3. Invitation anggota.
4. Owner/editor/viewer antar user.
5. Billing/subscription.
6. Organization/clinic sebagai tenant bersama.
7. Enterprise administration.
8. Cross-user analytics.
9. Advanced conditional logic sebagai MVP requirement.
10. Reusable component marketplace.

---

# 8. Information Architecture (IA)

Sidebar harus tetap sederhana dan berorientasi pekerjaan.

```text
BERANDA

PASIEN
└── Daftar Pasien

LAPORAN
└── Semua Laporan

DATA
└── Cadangan & Data

PENGATURAN
├── Format Dokumentasi
└── Preferensi

──────────────────
STASE AKTIF
Neurologi ▼
```

## 8.1 Prinsip IA

- Template tidak perlu menjadi menu utama terpisah.
- Schema/field builder tidak boleh tampil sebagai terminologi teknis pada navigasi utama.
- Semua pengaturan dokumentasi dikumpulkan di **Format Dokumentasi**.
- Active Stase harus selalu mudah terlihat.
- User harus selalu tahu konteks kerja yang sedang aktif.

---

# 9. Workspace Context

Urutan konteks aplikasi:

```text
CURRENT USER
    ↓
PERSONAL WORKSPACE
    ↓
ACTIVE ROTATION / STASE
    ↓
SELECTED PATIENT
    ↓
DOCUMENTATION TEMPLATE
```

Perubahan active stase harus mempengaruhi data dan template yang ditampilkan sesuai context, tanpa mengubah ownership workspace.

---

# 10. Clinical Configuration Engine

Clinical Configuration Engine adalah mekanisme untuk memisahkan:

```text
clinical data
```

dari:

```text
cara clinical data diinput, diorganisasi, dan disajikan.
```

Arsitektur:

```text
Personal Workspace
      ↓
Rotation / Stase
      ↓
Clinical Document Template
      ↓
Sections
      ↓
Fields
      ↓
Template Version
      ↓
Document Instance
      ↓
Answers / Snapshot
```

Engine harus dapat menambah format baru tanpa menambah branch specialty-specific di seluruh React application.

---

# 11. Clinical Document Template

## 11.1 Definisi

Clinical Document Template adalah definisi struktur dokumen yang digunakan untuk suatu konteks dokumentasi.

Contoh:

```text
Template: Neurologi — Follow-Up Harian
Context: Rotation Neurologi
Owner: Personal Workspace User A
```

User lain dapat memiliki template dengan nama/context sama tetapi struktur berbeda.

## 11.2 Template bukan specialty

Specialty/stase adalah context. Template menentukan struktur dokumentasi sebenarnya.

Jangan mengasumsikan:

```text
Neurologi = 1 template universal
```

## 11.3 Multiple template per stase

Satu rotation dapat memiliki beberapa template:

```text
Neurologi
├── Follow-Up Harian
├── Follow-Up Jaga
├── Follow-Up Konsulen
└── Pemeriksaan Khusus
```

---

# 12. Follow-Up sebagai Clinical Document

Follow-Up adalah document instance yang dibuat menggunakan template tertentu.

Struktur dapat berupa:

```text
Follow-Up
├── Subjective
├── Objective
├── Assessment
└── Plan
```

atau:

```text
Follow-Up
├── Keluhan
├── Pemeriksaan Fisik
├── Pemeriksaan Penunjang
├── Assessment
├── Plan
├── Edukasi
└── Follow-Up Berikutnya
```

### Requirement penting

Mesin konfigurasi harus memungkinkan user mengatur section yang memang diperbolehkan configurable, bukan hanya Objective.

---

# 13. Objective sebagai Structured Examination

Objective adalah bagian utama yang dapat menggunakan structured fields.

Contoh:

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

### Tujuan

User dapat mengisi pemeriksaan melalui field yang sesuai dengan template tanpa kehilangan konsep bahwa hasil tersebut adalah bagian dari **Objective** pada Follow-Up.

### Sumber data

Structured answers menjadi source of truth untuk bagian pemeriksaan. UI dapat merender kembali jawaban dalam bentuk terstruktur dan/atau teks yang readable sesuai kebutuhan laporan/documentation output.

---

# 14. Field Schema

Setiap configurable field memiliki identity yang stabil.

Contoh konseptual:

```json
{
  "field_id": "uuid",
  "label": "Status Kesadaran",
  "type": "textarea",
  "placeholder": "Compos mentis / ...",
  "required": false,
  "order": 1
}
```

`field_id` tidak boleh diganti hanya karena label berubah.

## 14.1 Basic field types

```text
Text
Textarea
Number
Select
Multi-select
Radio
Checkbox
Date
Time
Section
```

Tipe baru dapat ditambahkan tanpa mengubah model clinical workflow secara keseluruhan.

## 14.2 Future field capabilities

- unit;
- min/max validation;
- default value;
- reusable field;
- conditional visibility;
- calculated field, bila kelak diperlukan dan dinilai aman untuk use case produk.

---

# 15. System/Core Field vs Configurable Clinical Field

## 15.1 System/Core

Contoh:

- patient reference;
- follow-up identity;
- date/time;
- rotation reference;
- internal status;
- ownership metadata;
- synchronization metadata.

Field/system metadata ini harus dijaga agar integritas aplikasi tidak rusak.

## 15.2 Configurable Clinical Content

Contoh:

- Status Kesadaran;
- GCS;
- N. Cranialis;
- Motorik;
- Sensorik;
- pemeriksaan tambahan;
- custom clinical sections.

---

# 16. Default Template Library

Default/starter templates digunakan untuk mempercepat onboarding.

Konsep:

```text
DEFAULT / STARTER TEMPLATE
             │
             │ Clone
             ▼
       PERSONAL TEMPLATE
             │
             ▼
        User modifies
```

Personal copy harus independen dari source template.

Default template tidak boleh diposisikan UI sebagai satu-satunya format klinis yang benar.

---

# 17. Template Lifecycle

Lifecycle yang disarankan:

```text
Discover Starter
      ↓
Use / Clone
      ↓
Personal Template
      ↓
Use in Follow-Up
      ↓
Edit
      ↓
New Template Version
      ↓
Use for New Follow-Ups
```

Template yang belum digunakan dapat memiliki perubahan tanpa membuat version baru bila implementasi menentukan demikian. Begitu sebuah version telah menjadi referensi histori, version tersebut harus immutable secara logis.

---

# 18. Template Versioning

Contoh:

```text
Template Neurologi
├── v1
│   ├── GCS
│   ├── Motorik
│   └── Sensorik
│
└── v2
    ├── GCS
    ├── N. Cranialis
    ├── Motorik
    ├── Sensorik
    └── Refleks
```

Aturan:

1. Version yang telah digunakan tidak dimutasi retroaktif.
2. Edit terhadap used version menghasilkan version baru.
3. Follow-up menyimpan reference ke version yang digunakan.
4. Histori dapat dibaca walaupun template aktif telah berubah.

---

# 19. Follow-Up Snapshot

Ketika follow-up dibuat:

```text
Template v3
    ↓
Create Follow-Up
    ↓
Snapshot / Binding v3
    ↓
User fills answers
```

Follow-up lama tidak boleh mengikuti perubahan template baru.

```text
Follow-Up #001 → v3
Follow-Up #002 → v4
```

Snapshot minimal harus menyimpan informasi yang diperlukan untuk mempertahankan interpretasi historis field/section yang digunakan saat instance dibuat.

---

# 20. Template Binding dan Rotation Context

Rotation/stase adalah context penggunaan. Template adalah dokumen configuration.

```text
Workspace
│
├── Rotation Neurologi
│   ├── Template Binding A
│   └── Template Binding B
│
└── Rotation IPD
    └── Template Binding C
```

Satu template dapat direuse pada lebih dari satu rotation/context apabila aturan produk mengizinkan.

Binding harus menjawab setidaknya:

- template apa yang digunakan;
- context/rotation mana yang menggunakannya;
- apakah template aktif/default untuk context tersebut;
- periode berlaku bila diperlukan.

---

# 21. Rumah Sakit / Institusi sebagai Context

Rumah sakit/institusi bukan tenant boundary pada product model saat ini.

Informasi institusi dapat menjadi metadata/context rotation.

Contoh:

```text
Personal Workspace
│
├── Rotation Neurologi
│   ├── Institution: RS A
│   └── Template: Neurologi RS A
│
└── Rotation IPD
    ├── Institution: RS B
    └── Template: IPD RS B
```

Hal ini memungkinkan workflow berbeda tanpa membuat organization/tenant layer bersama.

---

# 22. Report Configuration

Report generator harus dapat menggunakan structured clinical data tanpa mengunci satu format laporan.

```text
Follow-Up Data
      ↓
Report Template
      ↓
Generated Report
```

Report template adalah presentation/configuration layer dan tidak boleh mengubah source clinical data.

---

# 23. Slaberan Configuration

Slaberan mengikuti prinsip konfigurasi yang sama:

```text
Personal Workspace
└── Slaberan Configuration
    ├── Locations
    └── Templates
```

Format dan struktur dapat berbeda menurut kebutuhan user/context.

---

# 24. Reusable Components — Future Capability

Arsitektur harus memungkinkan:

```text
Reusable Field
Reusable Section
Reusable Examination Block
```

Contoh:

```text
GCS
N. Cranialis
Motorik
Sensorik
```

dapat digunakan pada lebih dari satu template.

Fitur ini bukan MVP requirement, tetapi schema harus memungkinkan evolusinya.

---

# 25. Conditional / Advanced Field Logic — Future Capability

Fase lanjutan dapat mendukung:

```text
Jika Field A = X
→ tampilkan Field B
```

atau:

```text
Jika pemeriksaan tertentu dipilih
→ tampilkan pemeriksaan lanjutan
```

MVP hanya memerlukan field types dasar, section, ordering, dan validation sederhana.

---

# 26. UX Strategy

## 26.1 UX Goal

Target pengalaman:

> **User merasa sedang mengisi catatan klinis, bukan sedang memakai form builder.**

Engine konfigurasi harus powerful, tetapi tidak boleh membebani workflow harian.

## 26.2 Core UX Principle

```text
Use first
   ↓
Configure when needed
   ↓
Refine over time
```

Bukan:

```text
Configure everything
   ↓
baru boleh menggunakan aplikasi
```

## 26.3 Progressive Disclosure

Basic configuration tampil langsung.

Advanced configuration disimpan di:

```text
Pengaturan lanjutan ▾
```

Tujuan: menjaga tampilan tetap ringan untuk user yang tidak membutuhkan fitur advanced.

---

# 27. UX Information Architecture

Navigasi utama:

```text
Beranda
Daftar Pasien
Semua Laporan
Cadangan & Data
Pengaturan
```

Pengaturan:

```text
Pengaturan
├── Format Dokumentasi
└── Preferensi
```

Active Stase:

```text
──────────────────
STASE AKTIF
Neurologi ▼
──────────────────
```

Configuration terminology seperti `schema`, `field builder`, dan `template engine` tidak boleh menjadi label navigasi utama.

---

# 28. UX Flow — First-Time User

Flow awal:

```text
SIGN UP
   ↓
PILIH STASE
   ↓
PILIH TEMPLATE STARTER
   ↓
WORKSPACE SIAP
   ↓
TAMBAH PASIEN
   ↓
BUAT FOLLOW-UP
```

User tidak dipaksa menyelesaikan seluruh configuration sebelum dapat bekerja.

## 28.1 Pilih Stase

UI:

```text
Pilih stase

[ Neurologi ]
[ IPD ]
[ Bedah ]
[ Anak ]
[ Obgyn ]
[ Lainnya ]
```

`Lainnya` harus tersedia agar sistem tidak bergantung pada daftar specialty hardcoded.

## 28.2 Pilih Template Starter

Contoh:

```text
Template Neurologi Dasar
✓ GCS
✓ Status Kesadaran
✓ N. Cranialis
✓ Motorik
✓ Sensorik

[ Gunakan Template ]
```

Alternatif:

```text
[ Gunakan Template Contoh ]
[ Buat dari Kosong ]
[ Gunakan Template Saya ]
```

---

# 29. UX Flow — Daily Workspace

Beranda harus berorientasi pada pekerjaan yang sedang dilakukan, bukan analytics yang terlalu ramai.

Contoh struktur:

```text
Selamat pagi, User.
Neurologi
30 September 2026

[ + Follow-Up ]   [ + Pasien ]

Hari ini
4 pasien perlu follow-up
2 follow-up masih draft
3 laporan belum selesai

Pasien Terbaru
────────────────────────
Andi Pratama     [ Buka ]
Siti Rahma       [ Buka ]

Aktivitas Terakhir
────────────────────────
Follow-Up Andi
Follow-Up Siti
Laporan Andi
```

Prioritas dashboard:

1. pekerjaan yang perlu dilakukan;
2. akses cepat ke patient/follow-up;
3. context stase aktif;
4. aktivitas terbaru.

Dashboard tidak boleh penuh dengan metric yang tidak membantu workflow harian.

---

# 30. UX Flow — Active Stase

Active Stase harus selalu terlihat.

Klik stase aktif membuka selector:

```text
Stase Aktif

● Neurologi
  01 Sep – 30 Sep 2026

  IPD
  01 Oct – 30 Nov 2026

+ Tambah Stase
```

Perpindahan stase harus:

- jelas secara visual;
- tidak menghilangkan data;
- memperbarui context patient/template secara konsisten;
- tidak mengubah template ownership.

---

# 31. UX Flow — Patient List

Patient List harus berorientasi pencarian dan tindakan cepat.

Komponen inti:

```text
Cari nama pasien, RM, atau kata kunci...

Filter Stase
Filter Status

Patient Row/Card
├── Name
├── RM
├── Age/Gender
├── Room/Bed bila tersedia
├── Status
└── Quick Action
```

Search dapat berkembang untuk menemukan clinical note/relevant keyword dari workspace yang sedang aktif, dengan perhatian pada performance dan privacy.

---

# 32. UX Flow — Patient Detail

Patient detail menjadi command center untuk satu pasien.

Struktur konseptual:

```text
← Daftar Pasien

Andi Pratama                         Aktif
RM 002341 · 24 tahun · Laki-laki
Neurologi · Bed 12

[ + Follow-Up ] [ Laporan ] [ More ]

Ringkasan | Follow-Up | Pemeriksaan | Laporan
```

Primary action harus jelas:

> **+ Follow-Up**

Karena follow-up merupakan salah satu pekerjaan utama dalam workspace.

---

# 33. UX Flow — Follow-Up Entry

Follow-Up harus terasa seperti mengisi catatan klinis, bukan wizard multi-step.

Contoh:

```text
Follow-Up
Andi Pratama
30 September 2026 · 18:42

SUBJECTIVE
────────────────────────────
Keluhan utama
[..........................]

Perubahan sejak follow-up terakhir
[..........................]

OBJECTIVE
────────────────────────────
GCS
Eye      [ E4 ▼ ]
Motorik  [ M6 ▼ ]
Verbal   [ V5 ▼ ]

Status Kesadaran
[ Compos mentis............. ]

N. Cranialis
[.......................... ]

Motorik
[.......................... ]

Sensorik
[.......................... ]

+ Tambah Pemeriksaan

ASSESSMENT
[..........................]

PLAN
[..........................]

          [ Simpan Draft ]
          [ Simpan Follow-Up ]
```

UI final mengikuti template yang sedang aktif.

---

# 34. UX Flow — Objective Customization

Objective memiliki dua mode.

## 34.1 Work Mode

User hanya melihat field yang sudah dikonfigurasi:

```text
GCS
Status Kesadaran
N. Cranialis
Motorik
Sensorik
```

## 34.2 Configuration Mode

User dapat membuka:

```text
⚙ Atur Pemeriksaan
```

Kemudian:

```text
Atur Pemeriksaan Objective

☰ GCS
☰ Status Kesadaran
☰ N. Cranialis
☰ Motorik
☰ Sensorik

[ + Tambah Field ]
```

Work Mode dan Configuration Mode harus dipisahkan agar UI harian tetap bersih.

---

# 35. UX Flow — Add Field

Ketika user memilih `+ Tambah Pemeriksaan`:

```text
Tambah Pemeriksaan

Nama pemeriksaan
[ Kekuatan Ekstremitas Superior ]

Jenis input
○ Text
● Text Area
○ Pilihan
○ Angka
○ Checkbox

Placeholder
[ Contoh: 5/5 kanan dan kiri ]

[ Batal ]       [ Tambahkan ]
```

Advanced settings:

```text
Pengaturan lanjutan ▾
```

Contoh isi:

- required;
- unit;
- options;
- default value;
- validation sederhana.

---

# 36. UX Flow — Quick Customization During Follow-Up

User yang sedang bekerja dapat menambahkan pemeriksaan tanpa harus meninggalkan workflow.

Flow:

```text
Follow-Up
   ↓
+ Tambah Pemeriksaan
   ↓
Field ditambahkan ke follow-up saat ini
   ↓
Prompt optional:
"Simpan juga ke template?"
   ↓
Ya → New Template Version
Tidak → hanya follow-up ini
```

Tujuan flow ini adalah memungkinkan user memperbaiki workflow sambil bekerja.

**Default behavior tidak boleh mengubah template secara otomatis.**

---

# 37. UX Flow — Template Editor

Template editor hanya digunakan ketika user memang ingin mengatur format.

Desktop target:

```text
┌─────────────────────────────────────────────────────┐
│ Edit Template                          [ Simpan ]   │
├──────────────┬───────────────────────┬──────────────┤
│ STRUKTUR     │ PREVIEW               │ PROPERTI     │
│              │                       │              │
│ Objective    │ Status Kesadaran      │ Label        │
│  ├ GCS       │ [................]    │ [ Status... ]│
│  ├ Kesadaran │                       │              │
│  ├ Motorik   │ GCS                   │ Type         │
│  └ Sensorik  │ Eye [ E4 ▼ ]          │ [ Textarea ] │
│              │ Motor [ M6 ▼ ]        │              │
│ + Section    │ Verbal [ V5 ▼ ]       │              │
└──────────────┴───────────────────────┴──────────────┘
```

Desktop dapat menggunakan tiga panel:

```text
Structure | Preview | Properties
```

Mobile harus berubah menjadi alur bertahap/stacked:

```text
Structure
↓
Preview
↓
Properties
```

---

# 38. UX Flow — Template Duplicate

User dapat membuat variasi tanpa membangun dari nol.

Contoh:

```text
Neurologi — Follow-Up Bangsal
        ↓
Duplicate Template
        ↓
Neurologi — Follow-Up Jaga
        ↓
Edit seperlunya
```

Duplicate harus mempertahankan struktur yang dipilih user, lalu menghasilkan personal template/lineage baru sesuai model data.

---

# 39. UX Flow — Template History

User tidak perlu memahami istilah teknis version ID.

UI dapat menampilkan:

```text
Template Pemeriksaan Neurologi

Digunakan sejak:
30 September 2026

Riwayat Template
────────────────────────
30 Sep
Versi saat ini

28 Sep
Tambah pemeriksaan Refleks

20 Sep
Tambah GCS
```

Detail version identifier tetap dapat disimpan di backend tanpa harus ditampilkan sebagai primary UI language.

---

# 40. UX — Safe Template Update

Ketika template yang sudah digunakan diedit, user harus diberi konteks:

```text
Template ini telah digunakan oleh 12 follow-up.

Perubahan akan diterapkan pada follow-up baru.
Follow-up yang sudah dibuat tetap menggunakan format sebelumnya.

[ Batal ]        [ Lanjutkan ]
```

Tujuannya adalah mencegah user mengira histori akan ikut berubah.

---

# 41. UX — Empty States

Empty state harus memberi tindakan berikutnya, bukan sekadar status kosong.

Contoh template:

```text
Belum ada format pemeriksaan khusus.

Mulai dari template contoh atau buat format sendiri.

[ Gunakan Template Contoh ]
[ Buat Sendiri ]
```

Contoh pasien:

```text
Belum ada pasien di stase Neurologi.

[ + Tambah Pasien ]
```

---

# 42. UX — Mobile, Tablet, Desktop

Responsive behavior harus dipikirkan sebagai workflow berbeda, bukan sekadar mengecilkan desktop.

## 42.1 Desktop

Prioritas:

- persistent sidebar;
- main workspace luas;
- template editor multi-panel;
- table/list bila cocok;
- keyboard-friendly interactions.

## 42.2 Tablet

Prioritas:

- sidebar dapat dipadatkan;
- patient detail tetap mudah dibaca;
- form field tidak terlalu rapat;
- sticky action tetap terlihat.

## 42.3 Mobile

Prioritas:

- top bar sederhana;
- active stase mudah diakses;
- content satu kolom;
- editor multi-panel menjadi stacked/drawer;
- primary save action mudah dijangkau.

Follow-up mobile harus tetap usable tanpa zoom horizontal.

---

# 43. UX — Navigation and Actions

Primary action harus jelas dan konsisten:

```text
Beranda
→ + Follow-Up / + Pasien

Patient Detail
→ + Follow-Up

Objective
→ + Tambah Pemeriksaan

Format Dokumentasi
→ Edit / Duplicate / Use Template
```

Secondary/advanced actions dapat berada di `More`, contextual menu, drawer, atau advanced settings.

---

# 44. UX — Feedback, Autosave, dan Sync State

UI harus memberi feedback yang cukup tanpa mengganggu workflow.

State minimal:

```text
Saved
Saving...
Saved locally
Syncing...
Synced
Sync error
Offline
```

Feedback tidak boleh menutupi tindakan utama atau membuat user ragu apakah data sudah tersimpan.

Untuk operasi klinis penting, status penyimpanan harus dapat diverifikasi.

---

# 45. UX — Error Handling dan Recovery

Error harus menjelaskan:

1. apa yang gagal;
2. apakah data lokal tetap aman;
3. apa tindakan yang dapat dilakukan user.

Contoh:

```text
Follow-Up tersimpan di perangkat.
Sinkronisasi ke cloud belum berhasil.

[ Coba Lagi ]
```

Error teknis seperti RPC name, Postgres code, atau stack trace tidak ditampilkan sebagai primary user message.

---

# 46. UX — Accessibility dan Usability

Target minimum:

- keyboard-accessible controls pada desktop;
- visible focus state;
- label field jelas;
- validation error dekat dengan field terkait;
- tidak menggunakan warna sebagai satu-satunya penanda status;
- touch target yang cukup pada mobile;
- typography dan spacing mendukung scanning cepat;
- hierarchy visual konsisten.

---

# 47. UI Design Direction

Visual RekamMedisku harus mempertahankan karakter:

- clean;
- professional;
- calm;
- medical/productive;
- information-dense tetapi tidak padat;
- modern tanpa terasa seperti dashboard template generik;
- responsif.

Prinsip visual:

```text
Content first
Clinical context second
Configuration third
```

Bukan:

```text
Decoration first
Dashboard metrics first
Configuration everywhere
```

---

# 48. UI Copy / Product Language

Bahasa UI harus memakai istilah yang mudah dipahami user.

Gunakan:

```text
Format Dokumentasi
Atur Pemeriksaan
Tambah Pemeriksaan
Template Contoh
Gunakan Template
Duplikasi
Riwayat Template
Pengaturan Lanjutan
```

Hindari sebagai primary UI language:

```text
Schema Builder
JSON Editor
Template Binding
Document Configuration Engine
Field Definition
```

Terminologi teknis tetap dapat muncul pada developer documentation, bukan sebagai bahasa utama end-user.

---

# 49. Data Model — Target Konseptual

Model minimum:

```text
User / Profile
    │
    └── Personal Workspace
            │
            ├── Rotations
            │
            ├── Templates
            │      └── Template Versions
            │
            ├── Template Bindings
            │
            ├── Patients
            │      └── Follow-Ups
            │              └── Supporting Exams
            │
            ├── Report Templates
            │
            └── Slaberan Templates
```

Configuration engine secara konseptual:

```text
Template
 └── Version
      └── Sections
           └── Fields
```

Follow-up:

```text
Follow-Up
 ├── System Metadata
 ├── Template Version Reference
 ├── Snapshot / schema context
 └── Answers
```

Skema relational/JSON/hybrid belum menjadi keputusan final dalam PRD ini.

---

# 50. Data Integrity Rules

1. `field_id` tidak bergantung pada label.
2. Used template version immutable.
3. Follow-up menyimpan reference/snapshot yang cukup untuk histori.
4. Configuration tidak boleh menghapus clinical data historis.
5. Delete/archive template harus mempertimbangkan reference dari existing follow-ups.
6. Label/placeholder/ordering pada version baru tidak boleh mengubah interpretation of old snapshots.
7. System/core fields tidak boleh terhapus melalui configuration UI.

---

# 51. Offline-First dan Synchronization

Configuration harus dianggap sebagai first-class local/sync data.

Local persistence secara konseptual:

```text
Local Store
├── Workspace
├── Rotations
├── Templates
├── Template Versions
├── Template Bindings
├── Patients
├── Follow-Ups
└── Supporting Exams
```

Skenario wajib:

```text
Offline
↓
Template v3 tersedia lokal
↓
User membuat Follow-Up
↓
Follow-Up menyimpan context v3
↓
User online
↓
Sync configuration/data
```

Sync tidak boleh mengganti version reference follow-up secara salah.

Configuration sync failure tidak boleh otomatis menghapus local clinical work yang valid.

---

# 52. Realtime

Realtime tetap berada di boundary personal workspace.

Realtime bukan collaboration mechanism pada fase ini.

Perubahan konfigurasi dapat memicu refresh/invalidation terhadap resource lokal yang sesuai. Di masa depan, sistem dapat beralih dari full workspace refresh menuju targeted invalidation apabila kebutuhan performance meningkat.

---

# 53. Backup dan Restore

Backup personal workspace harus mencakup:

```text
Clinical Data
+
Template Definitions
+
Template Versions
+
Template Bindings
+
Configuration Metadata
```

Restore harus mempertahankan:

- template identity;
- version identity;
- snapshot/reference follow-up;
- answer data;
- relationship antar entities.

Restore failure pada satu bagian tidak boleh membuat user mengira seluruh workspace berhasil dipulihkan apabila sebenarnya belum lengkap.

---

# 54. Security & Ownership

Model utama:

```text
Auth User
   ↓
Personal Workspace
   ↓
Workspace-owned data
```

Database-level authorization tetap menjadi source of enforcement.

Frontend tidak boleh menjadi satu-satunya security boundary.

RLS/RPC/storage policies harus memastikan account hanya dapat mengakses resource milik workspace personal-nya.

Fungsi sensitif harus memiliki privilege/execute grant yang eksplisit dan sesuai role yang diperlukan.

---

# 55. Existing Architecture Alignment

RekamMedisku saat ini telah memiliki fondasi:

- Supabase Auth;
- profile;
- ownership melalui `user_id`;
- RLS;
- rotations;
- patients;
- follow-ups;
- supporting exams;
- template/versioning;
- local persistence;
- sync engine;
- backup/restore;
- attachments/storage.

Arsitektur sekarang secara praktis merupakan personal cloud application dengan user sebagai ownership boundary.

Target update ini bukan mengubah produk menjadi team collaboration SaaS.

Targetnya adalah memperluas application model menjadi:

```text
User
 ↓
Personal Workspace
 ↓
User-Specific Clinical Configuration
 ↓
Versioned Templates
 ↓
Stable Clinical History
```

Fondasi existing dipertahankan dan diadaptasi secara bertahap.

---

# 56. Migration Principles

Migration tidak boleh berupa rewrite total.

Urutan yang direkomendasikan:

```text
1. Finalisasi requirement
       ↓
2. Definisikan document/template schema
       ↓
3. Definisikan core vs configurable fields
       ↓
4. Implementasikan template structure
       ↓
5. Implementasikan immutable versioning
       ↓
6. Implementasikan binding ke rotation/context
       ↓
7. Implementasikan schema-driven renderer
       ↓
8. Integrasikan Objective structured storage
       ↓
9. Migrasikan follow-up existing
       ↓
10. Adapt local persistence + sync
       ↓
11. Adapt backup/restore
       ↓
12. Adapt report + slaberan
       ↓
13. Deprecate hardcoded clinical forms
```

Backward compatibility terhadap data existing harus menjadi requirement migration.

---

# 57. Functional Requirements

### FR-001 — Personal Workspace

Setiap account memiliki satu personal workspace.

### FR-002 — Workspace Isolation

Clinical data dan configuration milik account tidak dapat diakses account lain.

### FR-003 — Rotation Context

User dapat membuat dan memilih rotation/stase sebagai context kerja.

### FR-004 — Institution Context

User dapat menyimpan informasi institusi sebagai metadata/context bila diperlukan.

### FR-005 — Clinical Document Template

User dapat membuat template dokumen klinis personal.

### FR-006 — Configurable Sections

User dapat mengelola section yang ditetapkan configurable.

### FR-007 — Configurable Fields

User dapat menambah, mengedit, menghapus, dan mengurutkan field configurable.

### FR-008 — Basic Field Types

Sistem mendukung tipe field dasar yang ditentukan schema engine.

### FR-009 — Objective Structure

Objective dapat memiliki structured examination fields dan tetap disimpan sebagai bagian dari Objective pada Follow-Up.

### FR-010 — Default Templates

Sistem menyediakan starter/default templates.

### FR-011 — Personal Clone

User dapat clone default menjadi personal template independen.

### FR-012 — Multiple Templates Per Rotation

Satu rotation dapat memiliki lebih dari satu template.

### FR-013 — Template Binding

Template dapat dibind ke rotation/context.

### FR-014 — Template Versioning

Used template version tidak dapat diubah secara retroaktif.

### FR-015 — Follow-Up Snapshot

Follow-up mempertahankan template version dan context yang digunakan.

### FR-016 — Stable Field ID

Field memiliki identifier stabil yang tidak bergantung pada label.

### FR-017 — Quick Add Examination

User dapat menambahkan pemeriksaan dari workflow Follow-Up.

### FR-018 — Optional Save to Template

User dapat memilih apakah quick-added field hanya berlaku untuk follow-up saat ini atau disimpan ke template melalui version baru.

### FR-019 — Template Duplicate

User dapat duplicate personal template untuk membuat variasi.

### FR-020 — Report Template

Report dapat memiliki template/configuration terpisah.

### FR-021 — Slaberan Template

Slaberan dapat memiliki configuration terpisah.

### FR-022 — Offline Configuration

Template dan version yang relevan harus tersedia dalam local persistence.

### FR-023 — Sync Integrity

Sync tidak boleh merusak template/version reference pada clinical history.

### FR-024 — Backup/Restore Configuration

Configuration dan versioning ikut dalam backup/restore.

### FR-025 — Responsive UI

Workflow utama usable di desktop, tablet, dan mobile.

### FR-026 — Progressive Disclosure

Advanced configuration tidak ditampilkan sebagai beban pada workflow dasar.

### FR-027 — Human-readable Feedback

Error/save/sync state disampaikan dalam bahasa yang dapat dipahami user.

---

# 58. Non-Functional Requirements

### NFR-001 — Security

Authorization harus ditegakkan pada database/storage boundary.

### NFR-002 — Data Isolation

Workspace antar account harus terisolasi.

### NFR-003 — Reliability

Perubahan configuration tidak boleh merusak histori.

### NFR-004 — Performance

Schema-driven rendering harus responsif untuk ukuran template yang realistis.

### NFR-005 — Maintainability

Penambahan template atau tipe field baru tidak memerlukan branching specialty-specific di seluruh frontend.

### NFR-006 — Responsive Design

UI harus usable di desktop/tablet/mobile.

### NFR-007 — Usability

User utama dapat membuat dan menggunakan follow-up tanpa harus memahami configuration engine.

### NFR-008 — Accessibility

Basic keyboard, focus, labeling, validation, dan touch usability harus diperhatikan.

### NFR-009 — Recoverability

Local clinical work harus tetap dapat dipulihkan ketika cloud sync gagal.

### NFR-010 — Traceability

Perubahan template yang relevan dapat ditelusuri melalui version/history.

---

# 59. UX Acceptance Criteria

1. User baru dapat masuk ke workspace dan mulai membuat follow-up tanpa wajib membuka template editor.
2. User selalu dapat melihat stase aktif.
3. User dapat menggunakan starter template tanpa membuat form dari nol.
4. User dapat menambah field Objective dari workflow follow-up.
5. User dapat memilih apakah field baru hanya digunakan pada follow-up saat ini atau disimpan ke template.
6. User dapat membuka Format Dokumentasi dan mengedit template dengan UI visual sederhana.
7. Template editor tidak mengharuskan user memahami schema teknis.
8. Desktop menampilkan editor yang efektif untuk structure/preview/properties.
9. Mobile mengubah editor menjadi layout stacked/drawer yang usable.
10. Empty states menyediakan next action.
11. Save/sync/offline state terlihat jelas tetapi tidak mengganggu.
12. Error memberi recovery action yang masuk akal.
13. Perubahan template memberi informasi bahwa follow-up lama tetap aman.

---

# 60. Product Acceptance Criteria

Produk memenuhi arah arsitektur ini apabila:

1. Dua user dengan stase yang sama dapat mempunyai struktur follow-up berbeda.
2. Satu user dapat mempunyai beberapa template dalam satu stase.
3. User dapat menambah field Objective tanpa perubahan kode/deployment.
4. User dapat mengubah label tanpa kehilangan identity field.
5. Default template dapat dicopy menjadi personal template.
6. Perubahan default tidak mengubah personal copy secara otomatis.
7. Follow-up lama tidak berubah setelah template diperbarui.
8. Follow-up menyimpan context/version yang digunakan saat dibuat.
9. Configuration tersedia pada offline flow yang relevan.
10. Sync tidak mengganti histori dengan template terbaru secara salah.
11. Backup/restore membawa configuration dan clinical history yang diperlukan.
12. Report dan slaberan dapat berkembang dengan prinsip configuration yang konsisten.
13. Format clinical baru tidak membutuhkan `if specialty === ...` baru di banyak tempat.
14. User dapat menggunakan sistem tanpa memahami konsep schema, binding, version ID, atau snapshot.

---

# 61. Risks & Mitigations

## R1 — Configuration terlalu kompleks

**Risiko:** user merasa sedang memakai generic form builder.

**Mitigasi:** starter templates, basic customization, progressive disclosure, advanced configuration bertahap.

## R2 — Template proliferation

**Risiko:** terlalu banyak template serupa.

**Mitigasi:** naming, context, last-used indicator, duplicate, archive, dan histori yang jelas.

## R3 — Template mutation merusak histori

**Risiko:** follow-up lama berubah setelah template diedit.

**Mitigasi:** immutable used versions + snapshot/reference.

## R4 — Dynamic schema memperumit sync

**Risiko:** configuration dan answers tidak sinkron.

**Mitigasi:** stable IDs, explicit version references, configuration sebagai first-class sync data, recovery test.

## R5 — Default dianggap sebagai clinical standard

**Risiko:** user menganggap starter template sebagai format universal.

**Mitigasi:** copy sebagai starting point, wording yang tepat, dan personal customization.

## R6 — User membuat field yang terlalu bebas

**Risiko:** struktur data sulit digunakan ulang atau diekspor.

**Mitigasi:** field types yang terkontrol, simple validation, dan core/configurable boundary.

## R7 — Hardcoded logic kembali muncul

**Risiko:** konfigurasi akhirnya dikendalikan oleh specialty-specific branches.

**Mitigasi:** schema-driven renderer dan central field registry.

## R8 — Quick customization tidak sengaja mengubah template

**Risiko:** field tambahan pada satu follow-up mengubah workflow permanen tanpa persetujuan.

**Mitigasi:** default hanya apply ke instance saat ini; template update selalu explicit dan membuat version baru.

## R9 — Backup tidak membawa konfigurasi

**Risiko:** answers ada tetapi konteks field hilang.

**Mitigasi:** configuration/version/binding menjadi bagian wajib backup.

## R10 — UI terlalu ramai

**Risiko:** daily workflow menjadi lambat.

**Mitigasi:** configuration dipisahkan dari work mode dan ditempatkan di Format Dokumentasi.

---

# 62. Future Capability

Setelah foundation stabil, kemampuan dapat dikembangkan ke:

```text
Reusable Examination Blocks
       ↓
Conditional Fields
       ↓
Advanced Validation
       ↓
Template Analytics / Usage
       ↓
Advanced Document Generation
```

Fitur tersebut tidak boleh mengganggu prinsip bahwa user dapat tetap menggunakan basic workflow dengan sederhana.

---

# 63. Roadmap Implementasi

## Phase 0 — Requirement & Schema Design

- finalisasi document model;
- core vs configurable fields;
- field schema;
- template schema;
- version semantics;
- binding semantics;
- snapshot semantics;
- migration strategy.

## Phase 1 — Configuration Foundation

- template model;
- sections;
- fields;
- basic field types;
- ordering;
- simple validation;
- template CRUD.

## Phase 2 — Starter Templates

- default/starter library;
- clone/import;
- independent personal copy;
- duplicate;
- version history.

## Phase 3 — Follow-Up Integration

- schema-driven renderer;
- Objective structured examination;
- snapshot/version reference;
- migrate current hardcoded follow-up UI secara bertahap.

## Phase 4 — UX Polish

- dashboard workflow;
- active stase selector;
- patient detail command center;
- quick add examination;
- template editor;
- responsive/mobile behavior;
- empty/error/sync states.

## Phase 5 — Local/Sync/Backup

- configuration local persistence;
- configuration sync;
- offline follow-up;
- backup/restore configuration;
- failure/recovery testing.

## Phase 6 — Report & Slaberan

- shared configuration primitives;
- report template integration;
- slaberan integration.

## Phase 7 — Advanced Configuration

- reusable blocks;
- conditional fields;
- advanced validation;
- additional field types.

---

# 64. Open Decisions Sebelum Migration Schema

Hal berikut harus diputuskan sebelum perubahan schema Supabase besar:

1. Apakah template disimpan sebagai relational entities, structured JSON, atau hybrid.
2. Bentuk exact section/field schema.
3. Bentuk answer storage untuk field dinamis.
4. Bagian follow-up mana yang system-owned dan mana yang fully configurable.
5. Kapan perubahan menghasilkan version baru.
6. Kapan sebuah version menjadi locked/immutable.
7. Bagaimana memilih active/default template bila satu rotation mempunyai banyak template.
8. Struktur template binding.
9. Isi minimum snapshot yang harus disimpan pada follow-up.
10. Strategi migrasi data follow-up existing.
11. Batas kompleksitas template untuk MVP.
12. Apakah institution context disimpan hanya sebagai metadata rotation atau memiliki entity tersendiri.
13. Pola rendering Objective menjadi human-readable output.
14. Integrasi template configuration dengan existing sync/backup engine.

---

# 65. Architectural Guardrails

Guardrails berikut harus dianggap sebagai constraint desain:

```text
DO
────────────────────────────────────────
✓ 1 user = 1 personal workspace
✓ configuration belongs to personal workspace
✓ rotation is context
✓ template is reusable/configurable
✓ objective is structured where useful
✓ used versions are immutable
✓ field IDs are stable
✓ history is preserved
✓ UI hides technical complexity
✓ starter templates reduce setup friction
✓ offline/sync respect version references
```

```text
DON'T
────────────────────────────────────────
✗ 1 specialty = 1 hardcoded React form
✗ 1 rotation = 1 mandatory template
✗ edit old template version in-place after use
✗ use field label as data identity
✗ auto-change templates from an incidental follow-up edit
✗ force every user through configuration before use
✗ treat hospital as a shared tenant
✗ expose schema/JSON concepts as primary UI
✗ let configuration mutation destroy historical data
✗ make collaboration/RBAC the core architecture of this phase
```

---

# 66. Definition of Success

RekamMedisku dapat dianggap berhasil mencapai arah ini ketika user dapat mengatakan, secara praktis:

> **"Saya bisa langsung pakai aplikasi ini di stase saya, dan kalau format saya berbeda, saya tinggal menyesuaikannya tanpa harus menunggu developer mengubah aplikasi."**

Dari sisi sistem, keberhasilan berarti:

```text
Personal Workspace
        ↓
User-Specific Configuration
        ↓
Flexible Templates
        ↓
Structured Clinical Data
        ↓
Immutable History
        ↓
Simple Daily UX
```

Dari sisi produk, fleksibilitas tidak boleh dibayar dengan kompleksitas UI harian.

---

# 67. Final Product Direction

RekamMedisku tidak mencoba memaksakan satu workflow klinis universal.

Produk menyediakan **personal configurable clinical workspace** tempat user dapat:

1. memilih stase/context;
2. mulai dari template contoh;
3. menyesuaikan format dokumentasi;
4. menambah field pemeriksaan sesuai kebutuhan;
5. menyimpan field tersebut sebagai bagian dari Objective ketika digunakan dalam Follow-Up;
6. membuat beberapa template dalam satu stase;
7. memperbarui template tanpa merusak histori;
8. bekerja secara sederhana tanpa memahami detail teknis configuration engine.

Arsitektur target:

```text
                         AUTH USER
                             │
                             ▼
                  ┌────────────────────┐
                  │ Personal Workspace │
                  └──────────┬─────────┘
                             │
                    Active Rotation
                             │
                             ▼
                Clinical Configuration
                             │
                  ┌──────────┼──────────┐
                  ▼          ▼          ▼
             Follow-Up    Report     Slaberan
              Template    Template   Template
                  │
                  ▼
             Template Version
                  │
                  ▼
            Follow-Up Instance
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   Subjective  Objective  Assessment/Plan
                  │
                  ▼
            Structured Answers
                  │
                  ▼
               Snapshot
```

**UX principle akhir:**

> **Powerful under the hood, simple on the surface.**

---

# 68. Document Status & Change Control

Dokumen ini menjadi baseline product/UX direction sebelum implementasi configuration engine.

Perubahan schema database, RPC, local storage, sync, atau UI besar harus mengacu pada requirement di PRD ini dan dicatat sebagai perubahan terkontrol.

PRD ini **tidak berarti perubahan production code atau database sudah dilakukan**. Dokumen hanya menetapkan target behavior, UX, architecture direction, dan acceptance criteria.

