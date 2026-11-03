# Rencana Implementasi: Sinkronisasi Modul 3, Fix Hapus Laporan, Laporan History Berbasis Kartu No MO, dan Integrasi Part ke Modul 6

## Ringkasan Eksekutif
Berdasarkan kebutuhan operasional dan konfirmasi alur kerja:
1. **Perbaikan Sinkronisasi Sub Modul 1 (Input) & Sub Modul 2 (Update) di Modul 3**: Memastikan data selalu *real-time* dan *up-to-date* tanpa tersangkut pada *state* lama.
2. **Perbaikan Fitur Hapus Laporan Breakdown**: Menghapus tuntas dari `localStorage` dan Firestore dengan multi-ID deletion & sistem *tombstone* agar laporan yang dihapus tidak pernah muncul kembali (*resurrect*).
3. **Laporan History Kerusakan Berbasis Kartu No MO (Print & Preview)**: Ketika filter unit dipilih, sistem menampilkan Kartu No Reff MO dengan tabel rincian update harian (tanggal, jam, progress, teknisi, tindakan perbaikan) dan tabel part yang digunakan, baik pada UI pratinjau maupun ekspor dokumen PDF resmi.
4. **Integrasi Otomatis Kebutuhan Part ke Modul 6 (Monitoring Supply & Outstanding Part)**: Saat update breakdown disimpan dan teknisi memasukkan kebutuhan part, part tersebut otomatis langsung tercatat ke daftar Monitoring Supply Modul 6 dengan No MO yang sama untuk kontrol kiriman dari Malang.

---

## 1. Analisis Akar Masalah (Root Causes) & Solusi

### A. Masalah Sinkronisasi Sub Modul 1 (Input) & Sub Modul 2 (Update)
- **Akar Masalah**:
  1. `MaintenanceDatabaseView` menyimpan objek referensi `selectedBreakdownForUpdate` secara statis, sehingga saat data di-update atau ditambah dari Sub Modul 1, objek di Sub Modul 2 tetap merujuk ke memori lama (*stale object*).
  2. `UpdateBreakdownSubView` memiliki `useEffect` yang mengunci form ke `selectedBreakdownToUpdate` lama dan menolak beralih ke record yang baru dibuat atau diubah.
  3. Saat pendaftaran breakdown untuk unit yang sudah breakdown aktif diperbarui di `registerBreakdown`, sistem belum memanggil `syncItemToFirestore`.
- **Solusi**:
  - Ganti penyimpanan objek statis dengan `selectedBreakdownIdForUpdate: string | null`. Ambil data record *fresh* langsung dari state `breakdowns`.
  - Bersihkan siklus `useEffect` di `UpdateBreakdownSubView` agar form selalu memuat data terbaru dari `breakdowns.find(b => b.id === selectedId)`.
  - Panggil `syncItemToFirestore('breakdowns', updatedRecord.id, updatedRecord)` saat update aktif disimpan.
  - Urutkan (*sort*) tabel di kedua sub modul secara seragam (terbaru/terkini di atas).

### B. Masalah Kegagalan Hapus Laporan Breakdown
- **Akar Masalah**:
  1. `deleteBreakdown` di `src/utils/storage.ts` memanggil `deleteItemFromFirestore('breakdowns', id)` tanpa mengirimkan data item `target`. Akibatnya Firestore mencari ID mentah (misal `bd-173...`), padahal dokumen Firestore disimpan dengan ID deterministik (misal `bd_260001`). Dokumen di Cloud Firestore tidak terhapus.
  2. Saat Firestore *real-time listener* atau fungsi *pull* berjalan, dokumen yang masih ada di Firestore ditarik kembali dan di-merge ke `localStorage`, membuat laporan yang sudah dihapus "hidup kembali".
  3. `canUserDeleteModule` hanya mengizinkan tier DEVELOPER dan menolak role/tier ADMIN.
  4. Di `InputBreakdownSubView`, tombol hapus dibatasi `isDev` murni dan menggunakan `confirm()` browser sederhana.
- **Solusi**:
  - Terapkan sistem **Tombstone** (`bkwa_deleted_tombstones_v1`) pada `firestoreSync.ts`. Dokumen yang sudah dihapus akan diblokir dari proses merge snapshot Firestore.
  - Hapus semua variasi ID di Firestore: `target.id`, `_firestoreDocId`, `bd_${noNotifikasi}`, `bd_${noMaintenanceOrder}`, dan ID deterministik.
  - Perbarui `canUserDeleteModule` agar role `ADMIN` dan tier `ADMIN` dapat menghapus data breakdown.
  - Sediakan modal konfirmasi hapus interaktif dengan detail No MO dan Unit baik di Sub Modul 1 maupun Sub Modul 2.

### C. Laporan History Kerusakan Berbasis Kartu No MO
- **Konsep Tampilan**:
  - Sesuai konfirmasi: **Format Kartu No MO dengan tabel rincian update harian di dalamnya**.
  - **Header Kartu**: No Reff MO, Unit (CN & Nama Alat), Tanggal Breakdown, Problem Awal, Komponen, Status Terkini, dan Total Jam Downtime.
  - **Tabel 1 (Riwayat Pekerjaan Harian)**: Kolom No, Tanggal Update, Jam Kerja (Start - Finish & Durasi), Detail Pekerjaan / Tindakan Perbaikan, Progress, Status Unit, PIC Mekanik (1, 2, 3), dan Catatan/Remark.
  - **Tabel 2 (Part & Jasa Digunakan)**: Kolom No, Jenis, Nama Part, Part Number (PN), Qty, Satuan.
- **Cetak & Preview**:
  - Modal Pratinjau Interaktif di Sub Modul 4 dengan tombol *Print* dan *Export PDF*.
  - Generator PDF (`generateDetailHistoryPDF`) di `src/utils/pdfGenerator.ts` disusun ulang dalam bentuk kartu per No MO dengan sub-tabel update harian dan tabel part, lengkap dengan lembar pengesahan resmi 3 pihak.

### D. Integrasi Otomatis Kebutuhan Part ke Modul 6 (Monitoring Supply)
- **Alur Kerja**:
  - Di `UpdateBreakdownSubView`, saat mekanik menginput part pada tabel Part & Jasa dan klik "Simpan Update Breakdown":
    1. Part otomatis disimpan ke `partsJasa` dan riwayat update record breakdown.
    2. Sistem secara otomatis menjalankan `syncBreakdownPartsToSupplyTrackings` ke `PartSupplyItemTracking` Modul 6.
    3. Di Modul 6 Sub Modul **Monitoring Supply & Outstanding Part**, item part langsung muncul dengan No MO yang sama, No Unit, Nama Part, PN, Qty Diminta, Status default `PENDING` (Belum Terpenuhi).
    4. Tim gudang/workshop dapat memantau kedatangan barang dari Malang dan melakukan checklist pemenuhan (1-klik checklist atau input No Surat Jalan Malang).

---

## 2. Rincian Perubahan File & Arsitektur

### 1. `src/services/firestoreSync.ts`
- Tambahkan pelacak `recordTombstone`, `removeTombstone`, dan `isTombstoned`.
- Perbarui `deleteItemFromFirestore` untuk menghapus seluruh kandidat docId (`rawId`, `bd_...`, `_firestoreDocId`, No MO) dan mencatat tombstone.
- Perbarui `pullCollection` dan `attachListener` untuk memfilter dokumen yang telah di-tombstone sehingga tidak pernah me-restore item yang telah dihapus.
- Hapus tanda tombstone di `syncItemToFirestore` saat item baru sengaja disimpan.

### 2. `src/utils/storage.ts`
- Perbarui `canUserDeleteModule(user, 3)` untuk mengizinkan role/tier `ADMIN`.
- Perbarui `registerBreakdown`:
  - Panggil `syncItemToFirestore` saat unit existing breakdown diperbarui.
  - Panggil `syncBreakdownPartsToSupplyTrackings` otomatis setelah breakdown berhasil disimpan/diupdate.
- Perbarui `updateBreakdownActivity`:
  - Panggil `syncBreakdownPartsToSupplyTrackings` otomatis saat update aktivitas selesai disimpan.
- Perbarui `deleteBreakdown`:
  - Bersihkan seluruh variasi record lokal dengan ID atau No MO yang sama.
  - Kirimkan objek `target` lengkap ke `deleteItemFromFirestore`.
- Sempurnakan `syncBreakdownPartsToSupplyTrackings`:
  - Pindai part baik dari `b.partsJasa` maupun dari seluruh item di `b.riwayatUpdate?.flatMap(u => u.partsJasa || [])`.

### 3. `src/components/modul3/MaintenanceDatabaseView.tsx`
- Ganti `selectedBreakdownForUpdate: BreakdownRecord | null` dengan `selectedBreakdownIdForUpdate: string | null`.
- Hitung `selectedBreakdownForUpdate` secara dinamis dari `breakdowns.find(b => b.id === selectedBreakdownIdForUpdate)`.
- Sinkronkan navigasi antar Sub Modul 1, 2, dan 4.

### 4. `src/components/modul3/InputBreakdownSubView.tsx`
- Urutkan tabel riwayat breakdown berdasarkan tanggal/jam/update terbaru di bagian atas.
- Sediakan tombol Hapus untuk user yang berhak (`canUserDeleteModule(currentUser, 3)` atau developer).
- Ganti browser `confirm()` dengan modal konfirmasi hapus profesional yang aman.

### 5. `src/components/modul3/UpdateBreakdownSubView.tsx`
- Perbaiki `useEffect` pemuatan record agar mengambil data segar (*fresh*) dari state `breakdowns`.
- Urutkan daftar unit breakdown yang aktif secara kronologis terbaru.
- Setelah penyimpanan update breakdown berhasil, pastikan pesan konfirmasi menginfokan bahwa kebutuhan part telah otomatis diteruskan ke Modul 6.

### 6. `src/components/modul3/DetailBreakdownHistorySubView.tsx`
- Perbarui tampilan antarmuka riwayat kerusakan menjadi **Format Kartu No MO**:
  - Kotak ringkasan No MO dengan status dan problem awal.
  - Tabel rincian pekerjaan update harian di dalam masing-masing kartu No MO.
  - Tabel part & jasa yang digunakan pada No MO tersebut.
- Sediakan tombol Cetak Cepat dan Pratinjau PDF.

### 7. `src/utils/pdfGenerator.ts` (`generateDetailHistoryPDF`)
- Format ulang struktur dokumen PDF laporan riwayat kerusakan:
  - Header kop surat resmi PT BATU KALI WELANG AMPUH.
  - Pengelompokan berbasis Kartu No MO per halaman/blok.
  - Sub-tabel riwayat update harian untuk setiap No MO.
  - Sub-tabel part & material yang digunakan.
  - Lembar pengesahan 3 pihak resmi (Dibuat Oleh, Diperiksa Oleh, Disetujui Kabag Workshop).

---

## 3. Rencana Verifikasi & Testing
1. **Verifikasi Sinkronisasi Sub Modul 1 & 2**:
   - Input laporan breakdown baru di Sub Modul 1 -> Buka Sub Modul 2 -> Pastikan langsung muncul di dropdown dan tabel unit existing breakdown.
   - Lakukan update pekerjaan di Sub Modul 2 -> Buka Sub Modul 1 -> Pastikan status dan data terbaru langsung ter-update di tabel Sub Modul 1.
2. **Verifikasi Hapus Laporan**:
   - Hapus laporan breakdown -> Pastikan langsung hilang dari Sub Modul 1 dan Sub Modul 2.
   - Refresh halaman dan periksa status Firestore -> Pastikan data tidak muncul kembali (*zero resurrection*).
3. **Verifikasi Laporan History Kerusakan (Kartu No MO)**:
   - Pilih filter unit tertentu (misal EX-01 atau DT-01).
   - Pastikan muncul kartu-kartu No MO dengan tabel rincian update harian di bawahnya.
   - Buka Pratinjau PDF dan verifikasi tata letak kartu No MO, update harian, daftar part, dan tanda tangan 3 pihak.
4. **Verifikasi Integrasi Part ke Modul 6**:
   - Masukkan part pada form Update Breakdown di Modul 3 dan simpan.
   - Buka Modul 6 -> Sub Modul Monitoring Supply & Outstanding Part -> Pastikan part langsung tercantum dengan No MO yang sesuai.
   - Uji toggle checklist pemenuhan supply.
5. **Lint & Build**:
   - Jalankan `lint_applet` dan `compile_applet` untuk menjamin tidak ada kesalahan sintaks atau TypeScript.
