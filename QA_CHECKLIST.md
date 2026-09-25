# QA Checklist — RekamMedisku MVP

Checklist manual ini mengikuti alur dan acceptance criteria MVP pada PRD.

## P0 — Build & quality gate

- [ ] `npm run lint` selesai tanpa error.
- [ ] `npm run build` selesai tanpa TypeScript error.
- [ ] `npm run qa` menjalankan lint lalu build sampai selesai.

## P1 — Stase

### Rotation isolation
1. [ ] Buka Stase Saya.
2. [ ] Pastikan Neurologi berstatus Aktif.
3. [ ] Pastikan pasien Neurologi hanya muncul di Daftar Pasien.
4. [ ] Pindah ke Ilmu Penyakit Dalam.
5. [ ] Pastikan pasien Interna yang tersedia hanya berasal dari rotation-id Interna.
6. [ ] Kembali ke Neurologi.
7. [ ] Pastikan pasien Neurologi dan riwayatnya tetap tersedia.
8. [ ] Pastikan perpindahan stase tidak menghapus data stase sebelumnya.

### Patient CRUD
- [ ] Tambah pasien.
- [ ] Tambah pasien dengan RM yang sama pada stase yang sama harus ditolak.
- [ ] RM yang sama pada stase berbeda dapat dibuat sebagai entity berbeda.
- [ ] Edit identitas pasien.
- [ ] Arsipkan pasien.
- [ ] Pulihkan pasien.
- [ ] Pastikan follow-up tidak hilang setelah edit/arsip.

## P2 — Follow-Up

### Neurologi
- [ ] Buka Follow-Up Baru dari pasien Neurologi.
- [ ] Pastikan field neurologi/GCS tampil.
- [ ] Simpan draf.
- [ ] Keluar dan buka kembali.
- [ ] Pastikan draf masih ada.
- [ ] Simpan follow-up.
- [ ] Pastikan nomor follow-up bertambah.
- [ ] Pastikan tanggal/waktu terakhir pada pasien ikut berubah.

### Ilmu Penyakit Dalam
- [ ] Buka Follow-Up Baru dari pasien Interna.
- [ ] Pastikan field Kepala & Leher, Thoraks, Abdomen, Ekstremitas, dan Temuan Sistemik tampil.
- [ ] Pastikan field neurologi/GCS tidak menjadi template utama.
- [ ] Simpan follow-up.
- [ ] Pastikan template tersimpan sebagai Ilmu Penyakit Dalam.

### Supporting exam
- [ ] Tambah pemeriksaan.
- [ ] Edit pemeriksaan.
- [ ] Hapus pemeriksaan.
- [ ] Tambah lampiran gambar/PDF <= 2 MB.
- [ ] Pastikan nama file tersimpan.
- [ ] Pastikan lampiran dapat dibuka/diunduh kembali.
- [ ] Coba file > 2 MB dan pastikan ditolak dengan pesan yang jelas.

## P3 — Timeline & history

- [ ] Follow-up tampil kronologis.
- [ ] Follow-up lama dapat dibuka.
- [ ] Follow-up baru tidak mengubah isi follow-up lama.
- [ ] Filter Semua bekerja.
- [ ] Filter Minggu Ini mengikuti tanggal perangkat.
- [ ] Filter Bulan Ini mengikuti tanggal perangkat.
- [ ] Filter Tanggal hanya menampilkan tanggal yang dipilih.
- [ ] Riwayat hasil pemeriksaan menampilkan seluruh exam tersimpan, bukan hanya exam terakhir.

## P4 — Report Generator

- [ ] Masuk dari profil pasien.
- [ ] Pilih follow-up tersimpan.
- [ ] Belum klik Generate: preview masih kosong.
- [ ] Klik Generate Laporan.
- [ ] Preview terisi dari data follow-up tanpa input ulang.
- [ ] Template Neurologi menghasilkan bagian pemeriksaan neurologis.
- [ ] Template Interna menghasilkan bagian pemeriksaan sistemik.
- [ ] Edit draft tidak mengubah follow-up tersimpan.
- [ ] Salin laporan ke clipboard.
- [ ] Generate Ulang membuat output dari data tersimpan terbaru.
- [ ] Tidak ada direct WhatsApp API/automatic sending.

## P5 — Backup & restore

- [ ] Export JSON berhasil.
- [ ] Export mencakup pasien, follow-up, draf, rotasi, dan active rotation.
- [ ] Filter hanya memengaruhi tampilan/ringkasan dan tidak membuat export parsial tanpa penjelasan.
- [ ] File non-RekamMedisku ditolak.
- [ ] Schema version yang tidak didukung ditolak.
- [ ] Backup dengan duplicate patient ID ditolak.
- [ ] Backup dengan duplicate follow-up ID ditolak.
- [ ] Backup dengan patient rotation yang tidak ada ditolak.
- [ ] Backup dengan lebih dari satu rotation Aktif ditolak.
- [ ] Backup dengan activeRotationId yang tidak aktif ditolak.
- [ ] Restore berhasil dan data kembali sama.
- [ ] Simulasi kegagalan restore tidak meninggalkan partial data.

## Responsive & interaction

- [ ] Desktop.
- [ ] Tablet.
- [ ] Mobile.
- [ ] Tidak ada horizontal overflow yang tidak disengaja.
- [ ] Mobile navigation menyediakan akses ke Stase.
- [ ] Tombol yang terlihat aktif memiliki aksi nyata atau memang disabled.
- [ ] Search header hanya muncul pada halaman yang memang punya konteks pencarian.
- [ ] Modal dapat ditutup dengan tombol X, klik backdrop bila sesuai, dan Escape bila didukung.
- [ ] Focus-visible terlihat pada keyboard navigation.

## Data safety

- [ ] Gunakan dummy/anonymized data untuk prototype.
- [ ] Jangan masukkan data pasien nyata ke environment demo.
- [ ] Anggap file backup JSON sebagai data sensitif.
- [ ] Jangan memosisikan aplikasi sebagai rekam medis resmi rumah sakit.
