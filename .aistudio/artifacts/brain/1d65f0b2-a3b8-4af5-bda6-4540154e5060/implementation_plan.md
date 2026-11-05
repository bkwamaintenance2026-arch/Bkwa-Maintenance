# Rencana Penyempurnaan Sistem Maintenance PT Batu Kali Welang Ampuh (Modul 3 & Modul 2)

Rencana ini merinci penambahan fitur **Breakdown Type** (SCHEDULE, UNSCHEDULE, ACCIDENT), pemisahan kolom **Tanggal, Jam Mulai, dan Jam Selesai** secara independen pada Kartu MO, sinkronisasi akurat tindakan dan PIC mekanik murni tanpa pelapor fallback, fitur **Inline Editing** baris riwayat pekerjaan, **Monitoring Realtime Downtime Unit Breakdown Aktif** di Sub Modul 6, dokumen cetak **Print Riwayat Unit (Semua MO)**, serta penyesuaian jam kerja Full day (07.00 - 16.00) dan opsi Alpha pada Modul 2 Manpower.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan penting yang telah dikonfirmasi melalui sesi klarifikasi:
> - **Breakdown Type**: Wajib dipilih saat input breakdown dengan nilai baku awal **`UNSCHEDULE`** (pilihan: `SCHEDULE`, `UNSCHEDULE`, `ACCIDENT`). Tersedia di form input, kartu MO, tabel ringkas, serta dokumen PDF resmi.
> - **Pemisahan Kolom Riwayat Update**: Pada tabel update harian Kartu MO dan Pratinjau PDF, kolom **Tanggal**, **Jam Mulai**, dan **Jam Selesai** dipisahkan menjadi kolom mandiri (bukan digabung rentang teks) untuk kemudahan kontrol dan audit.
> - **PIC Mekanik & Remark**: Kolom PIC mekanik secara ketat menampilkan teknisi pelaksana perbaikan dari update harian (tanpa mengambil pelapor input awal) beserta catatan Remark terkini.
> - **Inline Editing**: Pengguna dapat langsung mengedit tanggal, jam mulai, jam selesai, tindakan perbaikan, progress, status, PIC teknisi, dan remark langsung pada baris tabel (inline) dengan tombol Simpan dan Batal.
> - **Print Unit vs Print MO**: Membedakan dokumen cetak 1 MO spesifik (**Print MO**) dengan buku rangkuman riwayat terpadu seluruh MO yang pernah dialami unit terpilih (**Print Unit**).
> - **Monitoring Breakdown Aktif**: Tersedia di tab tersendiri (Sub Modul 6) dengan penghitung downtime dinamis berjalan (Hari, Jam, Menit) dari saat breakdown hingga realtime saat ini.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**:
  1. **Modul 3 - Input Breakdown (Sub Modul 1)**: Menambahkan input wajib `Breakdown Type` dengan pilihan `SCHEDULE`, `UNSCHEDULE`, `ACCIDENT` (default: `UNSCHEDULE`).
  2. **Modul 3 - Kartu No MO & Riwayat (Sub Modul 4)**:
     - Header kartu tersinkronisasi dengan tanggal, jam pengerjaan, dan status dari update harian terakhir.
     - Tabel riwayat harian memisahkan kolom: `No`, `Tanggal`, `Jam Mulai`, `Jam Selesai`, `Tindakan / Detail Perbaikan`, `Progress`, `Status Unit`, `PIC Mekanik (Murni)`, `Remark`, dan `Aksi`.
     - Fitur **Inline Editing** pada setiap baris untuk melengkapi atau memperbaiki jam/tanggal kosong langsung di tempat.
     - Tombol **Print MO** (khusus 1 insiden MO) dan **Print Unit** (seluruh MO unit terpilih) berformat landscape PDF resmi lengkap dengan pengesahan 3 pihak.
  3. **Modul 3 - Monitoring Breakdown Aktif & Realtime Downtime (Sub Modul 6)**:
     - Tab dedikasi untuk unit berstatus `BREAKDOWN` dan `LIMIT OPERASI`.
     - Timer realtime (interval 60 detik) menghitung durasi breakdown berjalan dari `tanggal` dan `jamBreakdown` awal hingga saat ini.
     - Menampilkan unit, pekerjaan terakhir, teknisi yang bertugas, badge downtime warna-warni, serta pintasan cepat ke Update dan Detail.
  4. **Modul 2 - Catatan Harian Manpower**:
     - Tombol toggle Fullday otomatis menetapkan jam kerja `07:00` s/d `16:00`.
     - Header/pilihan keterangan menambahkan opsi `Alpha / Tanpa Keterangan` dan menghapus opsi `Ijin`.

---

## 2. User Experience & Visual Design

### Alur Antarmuka Pengguna (User Flows)
1. **Pencatatan Breakdown**:
   - Di Sub Modul 1, form input menyediakan tombol pilihan atau dropdown `Breakdown Type`: `UNSCHEDULE` (terpilih otomatis), `SCHEDULE`, dan `ACCIDENT`.
   - Data tersimpan dan tersinkronisasi ke Firestore dan daftar monitoring.
2. **Monitoring Realtime Downtime (Sub Modul 6)**:
   - Pengguna membuka Sub Modul 6 di Modul 3.
   - Tabel menampilkan daftar unit alat yang saat ini belum READY.
   - Badge downtime menyala dinamis: misal `2 Hari 5 Jam 14 Menit` yang terus terhitung otomatis.
3. **Pemeriksaan & Inline Edit Kartu MO (Sub Modul 4)**:
   - Pengguna mencari unit atau MO tertentu.
   - Kartu menampilkan tanggal & jam pengerjaan terkini di header.
   - Pada tabel riwayat pekerjaan, kolom Tanggal, Jam Mulai, dan Jam Selesai berdiri sendiri.
   - Pengguna mengklik tombol **Pensil** di baris tertentu: baris berubah menjadi input interaktif. Pengguna memperbaiki jam kosong lalu menekan tombol centang **Simpan**.
4. **Cetak Dokumen**:
   - Klik **Print MO**: Pratinjau PDF khusus riwayat pengerjaan 1 MO tersebut.
   - Klik **Print Unit**: Pratinjau PDF buku riwayat unit yang merangkum seluruh kartu MO masa lalu untuk unit bersangkutan.

### Bahasa Desain Industri & Visual Theme
- **Nuansa**: Dark Industrial Workshop Quarry (`stone-950`, `stone-900`, `border-stone-800`).
- **Aksen**: Amber emas (`amber-400`, `amber-500`) untuk nomor MO, Emerald (`emerald-400`) untuk status READY, Rose (`rose-500`) untuk BREAKDOWN/ACCIDENT, dan Blue/Indigo untuk fitur Riwayat Unit.
- **Tipografi**: Kode MO dan jam kerja menggunakan `font-mono`, sedangkan uraian tindakan menggunakan `font-sans` proporsional dengan keterbacaan tinggi.

---

## 3. Key Product Decisions & Trade-Offs

- **Pemisahan Kolom Tanggal & Jam**:
  - *Keputusan*: Memisahkan menjadi kolom `Tanggal`, `Jam Mulai` (HH:mm), dan `Jam Selesai` (HH:mm) daripada string gabungan.
  - *Alasan*: Menjamin presisi waktu kerja teknisi, memudahkan sorting, dan mempermudah pengisian bagian jam yang sebelumnya kosong.
- **PIC Mekanik Tanpa Pelapor Fallback**:
  - *Keputusan*: Jika update belum memiliki teknisi, kolom menampilkan tanda strip (`-`), tidak meminjam nama pelapor kerusakan. Pelapor tetap ditampilkan secara terpisah di bagian info awal.
  - *Alasan*: Pelapor seringkali merupakan sopir/operator, bukan mekanik workshop yang mengeksekusi perbaikan.
- **Inline Editing vs Modal**:
  - *Keputusan*: Menggunakan inline row edit di tabel kartu MO.
  - *Alasan*: Pengguna tidak perlu bolak-balik berpindah tab atau menutup modal saat ingin mengoreksi jam atau tanggal yang terlewat.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DASHBOARD MAINTENANCE (MODUL 3)                      │
├──────────────────┬───────────────────┬─────────────────────────────────┤
│ Sub Modul 1:     │ Sub Modul 4:      │ Sub Modul 6:                    │
│ Input Breakdown  │ Detail & Kartu MO │ Monitoring Breakdown Aktif      │
│  - Breakdown Type│  - Split Tanggal  │  - Realtime Downtime Counter    │
│    (SCHED/UNSCHED│    & Jam Kerja    │  - Unit, Problem, Tindakan Terkini│
│    /ACCIDENT)    │  - Strict PIC Mek │  - PIC Mekanik Bertugas         │
│                  │  - Inline Edit Row│  - Quick Action to Update       │
│                  │  - Print MO/Unit  │                                 │
└────────┬─────────┴─────────┬─────────┴────────────────┬────────────────┘
         │                   │                          │
         ▼                   ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       STORAGE & SYNCHRONIZATION                        │
│  - storage.ts (updateBreakdownHistoryEntry, deleteBreakdownHistoryEntry)│
│  - pdfGenerator.ts (generateDetailHistoryPDF, generateUnitHistoryPDF)   │
│  - firestore.rules & firebaseSync.ts (Firestore Cloud Sync)           │
└────────────────────────────────────────────────────────────────────────┘
```

### Entitas Data yang Dimutakhirkan
1. `BreakdownRecord`:
   - `breakdownType?: 'SCHEDULE' | 'UNSCHEDULE' | 'ACCIDENT'` (default: `'UNSCHEDULE'`).
2. `BreakdownUpdateEntry`:
   - `startJob: string` (Tanggal)
   - `jamStart?: string` (Jam Mulai)
   - `jamFinish?: string` (Jam Selesai)
   - `detailKerusakan: string` (Tindakan)
   - `pic1?: string`, `pic2?: string`, `pic3?: string` (Teknisi Workshop)
   - `remark?: string`
3. `CatatanHarianManpower`:
   - Fullday default: `07:00` - `16:00`.
   - Opsi `Alpha / Tanpa Keterangan` menggantikan opsi `Ijin`.
