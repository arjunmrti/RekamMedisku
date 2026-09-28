# Phase 0 — Multi-User Database Foundation

## Tujuan

Phase 0 menyiapkan **tenant boundary database** RekamMedisku tanpa membongkar flow aplikasi yang sudah berjalan.

Baseline audit 28 September 2026 menyatakan bahwa fondasi RLS, ownership predicate, private Storage, LocalStorage per-user, optimistic concurrency, dan sync/realtime sudah ada, tetapi kesiapan multi-user masih terganggu oleh profile provisioning yang belum menjadi invariant, identitas aplikasi yang terbelah antara Auth metadata dan \`public.profiles\`, serta belum adanya automated cross-user isolation test. fileciteturn157file0

Karena itu phase ini fokus pada **database contract**, bukan redesign frontend.

## Prinsip arsitektur

### Auth bukan application profile

Supabase Auth tetap menjadi sumber:
- credentials
- session
- authentication identity

\`public.profiles\` menjadi sumber:
- nama aplikasi
- username
- student_id / stambuk
- program
- institution
- field identity aplikasi lain yang akan dibutuhkan report

Provisioning dibuat di database melalui trigger \`auth.users -> public.profiles\`.

### Tenant adalah user_id

Untuk scope saat ini:
- satu Supabase project;
- banyak user;
- setiap user mempunyai workspace sendiri;
- tidak ada sharing workspace antar-user;
- hospital/doctor/specialty hanya metadata/context, bukan tenant identity.

### Template adalah data milik user

Phase 0 memperkenalkan primitive:
- \`templates\`: identitas template milik user;
- \`template_versions\`: definisi versi template milik user.

Template version menyimpan \`definition JSONB\`. Isi klinis tetap user-defined; database hanya menjaga ownership, version identity, dan relasi tenant.

### Composite FK adalah defense-in-depth

\`template_versions(template_id, user_id)\` menunjuk ke \`templates(id, user_id)\`.

Artinya:
1. RLS membatasi apa yang dapat dilihat/ditulis user.
2. Foreign key memastikan kombinasi ID template + owner key tidak dapat menyilang antar-tenant.

## Perubahan database

### 1. Profile provisioning

Migration akan:
- memvalidasi \`public.profiles\` yang sudah ada;
- berhenti lebih awal bila kontrak dasar profile tidak sesuai;
- menambahkan \`username\`, \`student_id\`, \`program\`, \`institution\`;
- melakukan backfill dari metadata Auth user yang sama;
- membuat trigger \`rekammedisku_handle_new_user_profile\`;
- menjaga function provisioning tetap tidak dapat dieksekusi langsung oleh client roles.

Backfill bersifat konservatif: nilai profile yang sudah ada tidak ditimpa metadata Auth.

### 2. Template catalog

\`public.templates\`:
- \`id\`
- \`user_id\`
- \`type\`: \`follow_up\` atau \`report\`
- \`name\`
- \`description\`
- \`metadata JSONB\`
- \`is_archived\`
- timestamps

\`metadata\` sengaja generik. Contoh context:
\`hospital\`, \`doctor\`, \`specialty\`, \`unit\`.

Tidak ada hierarki organization/hospital pada phase ini.

### 3. Template versions

\`public.template_versions\`:
- \`id\`
- \`user_id\`
- \`template_id\`
- \`version\`
- \`schema_version\`
- \`definition JSONB\`
- \`created_at\`

Ada unique constraint pada \`(template_id, version)\`.

**Catatan penting:** Phase 0 belum memaksa row version menjadi immutable secara database. Policy UPDATE/DELETE masih tersedia. Append-only history enforcement masuk saat saved follow-up history benar-benar direlasikan ke version pada fase template workflow.

### 4. RLS

Templates dan versions:
- RLS aktif;
- akses hanya untuk role \`authenticated\`;
- \`SELECT/INSERT/UPDATE/DELETE\` masing-masing punya policy;
- owner ditentukan oleh \`(select auth.uid()) = user_id\`;
- \`anon\` tidak diberi table grant.

Pattern ini konsisten dengan ownership model yang sudah dipakai pada entity existing.

## Yang sengaja tidak dilakukan

Supaya risiko migration tetap kecil, Phase 0 **tidak**:
- mengubah \`follow_ups.template_type\`;
- menambahkan \`follow_up.template_id/template_version\`;
- memaksa rotation memilih template;
- mengganti renderer hardcoded Neurologi/IPD;
- memindahkan Slaberan ke generic template catalog;
- mengubah IndexedDB;
- mengubah logout/session transition;
- mengubah UI profile;
- menghapus template lama.

Audit sendiri menempatkan binding template, dynamic renderer, report engine, account lifecycle, storage hardening, dan local tenant safety di fase setelah fondasi ini. fileciteturn157file0

## Test contract

File pgTAP memverifikasi:
- signup menghasilkan profile;
- profile A/B terisolasi;
- template A/B terisolasi;
- A dapat membuat template sendiri;
- B tidak dapat meng-update/delete template A;
- B tidak dapat spoof \`user_id\` A saat insert;
- B tidak dapat membuat \`template_versions\` milik B menunjuk ke template A;
- B tidak dapat mengubah profile A;
- type template invalid ditolak;
- duplicate template version ditolak.

Semua test dibungkus transaction dan diakhiri \`ROLLBACK\`.

## Kenapa test belum dimasukkan ke CI

Repository saat ini memiliki migration yang bersifat incremental, tetapi belum memiliki baseline migration/config yang dapat membangun schema legacy lengkap dari nol.

Karena itu menjalankan \`supabase test db\` otomatis di CI sekarang akan berisiko menguji database yang berbeda dari database aplikasi sebenarnya.

**Kita tidak akan membuat fake baseline hanya agar CI terlihat hijau.**

Exit gate untuk mengaktifkan CI database test:
1. baseline schema/test environment dapat direproduksi;
2. migration Phase 0 berhasil di database test;
3. pgTAP cross-user suite PASS;
4. existing application QA tetap PASS;
5. baru setelah itu workflow GitHub Actions ditambah.

## Deployment gate — production

Jangan apply migration ke production sebelum:

1. database backup terbaru tersedia;
2. migration berhasil pada database test/staging;
3. profile preflight tidak gagal;
4. signup test menghasilkan satu profile;
5. User A/B isolation test PASS;
6. composite FK cross-tenant test PASS;
7. existing application smoke test PASS.

Migration ini **belum dianggap applied ke production** hanya karena file sudah ada di repository.

## Exit criteria Phase 0

Phase 0 selesai secara engineering setelah:
- profile provisioning menjadi invariant database;
- application profile menjadi identity source;
- user-owned templates + versions tersedia;
- RLS + tenant FK contract aktif;
- cross-user database regression suite PASS;
- tidak ada regression pada data/workflow existing.

Phase berikutnya baru boleh memakai \`template_id/template_version\` dari primitive ini.
