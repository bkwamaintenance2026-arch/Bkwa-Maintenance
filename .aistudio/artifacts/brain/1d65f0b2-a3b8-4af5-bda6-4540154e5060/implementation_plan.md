# Perombakan & Penyederhanaan Modul 3: Dashboard Maintenance PT BKWA

Menyederhanakan arsitektur dan antarmuka Modul 3 menjadi 4 sub-menu terfokus dengan menggabungkan pembaruan pekerjaan perbaikan langsung ke dalam tabel Monitoring melalui sistem baris bertingkat (*collapsible/expandable* tanda `+`), menyediakan pembaruan jam-ke-jam secara *inline*, serta fitur cetak WYSIWYG dan cetak per No Maintenance Order (MO).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi preferensi yang telah disetujui:
> 1. **Struktur 4 Sub-Menu Utama**:
>    - **Sub Modul 1: Input BD**: Formulir input laporan awal kerusakan unit saat mulai breakdown di Quarry Purwosari (tetap dipertahankan tanpa perubahan alur).
>    - **Sub Modul 2: Dashboard Maintenance**: Tabel monitoring breakdown aktif dengan baris bertingkat (tanda `+`), pembaruan pekerjaan harian jam-ke-jam secara langsung (*inline*), tombol Simpan, update status `READY` seketika yang mengarsipkan unit, dan tombol Print Preview WYSIWYG.
>    - **Sub Modul 3: History Breakdown**: Pencarian dan pelacakan seluruh arsip unit yang telah selesai diperbaiki (`READY`) beserta riwayat lengkap penggantian spare part dan jasa.
>    - **Sub Modul 4: Pareto Analisis PA & MTBF**: Grafik pareto komponen kerusakan, analisis ketersediaan fisik unit (*Physical Availability* standar MOHH 240 jam/bulan PT BKWA), MTBF, dan MTTR.
> 2. **Sistem Baris Bertingkat (*Expandable Row* / Tanda `+`)**:
>    - Baris utama menampilkan ringkasan unit (*Main Problem*, No MO, No Unit, Downtime berjalan, Status).
>    - Saat tanda `+` diklik, muncul sub-tabel di bawah baris tersebut (konsep seperti tabel kebutuhan Part):
>      - Baris input ringkas di atas: Tanggal, Jam Start, Jam Finish, Tindakan/Pekerjaan, Progress %, Status Unit, PIC Mekanik (dropdown Modul 2), Remark, dan tombol **"Simpan Update"**.
>      - Tabel runtutan pekerjaan di bawahnya dalam 1 No MO: pekerjaan terbaru selalu berada di **baris paling atas**.
> 3. **Penyelesaian Unit (`READY`)**:
>    - Begitu status diubah menjadi `READY` dan disimpan, unit otomatis keluar dari tabel Dashboard Maintenance (monitoring breakdown aktif) dan langsung tersimpan aman ke database riwayat (dapat diakses kapan saja di *History Breakdown*).
> 4. **Fitur Cetak & Print Preview WYSIWYG**:
>    - **Tombol Print Preview di atas tabel**: Mencetak seluruh breakdown aktif sesuai apa yang terlihat di layar (*What You See Is What You Get*). Baris yang di-expand akan tercetak beserta runtutan pekerjaannya; baris yang di-collapse hanya tercetak ringkasannya.
>    - **Klik No Reff MO**: Membuka preview cetak resmi untuk **1 unit** tersebut (Surat Perintah Kerja & Log Pekerjaan Perbaikan).

---

## 1. Overview & Core Concept

### Masalah yang Diselesaikan
Sebelumnya Modul 3 memiliki 6 sub-menu terpisah (Input Breakdown, Update Breakdown, Dashboard Maintenance, Detail Breakdown & History Part, Laporan Harian, dan Monitoring Breakdown). Mekanik dan staf administrasi harus bolak-balik berpindah menu untuk menginput kerusakan, mengupdate jam pengerjaan, dan mencetak laporan harian.

### Konsep Inti
Mengintegrasikan seluruh siklus hidup unit yang sedang breakdown ke dalam **Dashboard Maintenance** tunggal:
1. Saat No MO terbit dari Input BD, unit langsung muncul di tabel Dashboard Maintenance.
2. Setiap progres jam kerja diperbarui langsung pada baris unit tersebut melalui tanda `+` tanpa membuka formulir atau halaman baru.
3. Begitu unit dinyatakan siap operasi (`READY`), status diubah dan unit seketika diarsipkan ke **History Breakdown**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MODUL 3: MAINTENANCE                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼─────────────┐       ┌─────────▼───────────────┐       ┌───────▼─────────────┐
│ 1. Input BD     │       │ 2. Dashboard Maintenance│       │ 3. History Breakdown│
│ • Registrasi MO │──────►│ • Tabel Bertingkat (+)  │──────►│ • Arsip Unit READY  │
│ • Problem Awal  │       │ • Update Jam ke Jam     │       │ • Filter Pencarian  │
│ • Penugasan Awal│       │ • Status READY ─────────┼─┐     │ • Riwayat Part/Jasa │
└─────────────────┘       │ • Cetak WYSIWYG         │ │     └─────────────────────┘
                          └─────────────────────────┘ │
                                                      │     ┌─────────────────────┐
                                                      │     │ 4. Pareto PA & MTBF │
                                                      └────►│ • PA Unit (MOHH)    │
                                                            │ • Pareto Komponen   │
                                                            │ • MTBF & MTTR       │
                                                            └─────────────────────┘
```

---

## 2. User Experience & Visual Design

### A. Tampilan Navigasi 4 Sub-Menu Utama
- Menggantikan 6 tab sebelumnya menjadi 4 tab rapi dan elegan berlatar dark industrial (`stone-900`, `stone-950`, aksen `amber-400`, `rose-400`, dan `emerald-400`):
  1. `Sub Modul 1: Input BD` (Ikon Wrench)
  2. `Sub Modul 2: Dashboard Maintenance` (Ikon Activity/Layers dengan indikator jumlah unit aktif)
  3. `Sub Modul 3: History Breakdown` (Ikon History)
  4. `Sub Modul 4: Pareto Analisis PA & MTBF` (Ikon BarChart3)

### B. Tampilan Tabel Bertingkat (Dashboard Maintenance)
- **Baris Utama (Level 1 - Main Problem)**:
  - Tombol Expand/Collapse (`+` / `-` dengan animasi rotasi halus).
  - No. Reff MO (bisa diklik untuk cetak per unit).
  - Identitas Unit (CN New, Jenis, Nama Alat).
  - Waktu Mulai Breakdown (Tanggal & Jam).
  - Problem Awal Kerusakan.
  - Downtime Berjalan Real-Time (dihitung otomatis jam:menit).
  - Progress Terkini (% dan tahapan).
  - Status Unit (`BREAKDOWN` merah, `LIMIT OPERASI` amber).
  - Ringkasan Jumlah Update Catatan.
- **Sub-Tabel Bertingkat (Level 2 - Expandable Detail)**:
  - **Baris Input Cepat (Quick Update Row)**:
    - Input Tanggal & Jam Mulai s/d Jam Selesai (format 24 jam).
    - Textarea ringkas: Tindakan / Detail Pekerjaan.
    - Dropdown Progress (`25%`, `50%`, `75%`, `100%`, `On Progress`, `Waiting Part`, `Waiting Mechanic`).
    - Dropdown Status (`BREAKDOWN`, `LIMIT OPERASI`, `READY`).
    - Dropdown PIC Mekanik (terkoneksi database Manpower Modul 2).
    - Tombol **"Simpan Update"** berwarna amber dengan ikon Save.
  - **Daftar Runtutan Catatan Harian**:
    - Disusun urut dari **pekerjaan terbaru di posisi paling atas** (#Terbaru).
    - Menampilkan kolom: No, Tanggal, Jam Kerja, Tindakan/Pekerjaan, Progress, Status Unit, PIC Mekanik, dan Remark.

### C. Mekanisme Cetak (Print & Preview)
1. **Tombol Cetak WYSIWYG (Header Tabel)**:
   - Tombol "Print Preview Laporan Monitoring".
   - Mencetak data persis sesuai kondisi layar saat ini: jika baris `EX-71` sedang dibuka (+), maka seluruh runtutan pembaruan pekerjaan unit tersebut ikut tercetak. Unit yang dalam keadaan tertutup hanya dicetak ringkasan barisnya.
   - Dilengkapi kustomisasi kop surat PT Bukit Kencana Wahana Agro dan validasi tanda tangan standar (Dibuat Oleh Mekanik/Admin, Disetujui Kabag Workshop, Diketahui KTT).
2. **Cetak Satuan per Unit (Klik No Reff MO)**:
   - Membuka modal preview cetak satu unit (Surat Perintah Kerja & Berita Acara Kerusakan Unit) siap cetak/simpan PDF.

---

## 3. Key Product Decisions & Trade-Offs

- **Penyatuan Sub Modul 2 & 3**:
  - *Keputusan*: Menghilangkan sub-menu Update Breakdown mandiri dan memindahkannya menjadi sub-tabel bertingkat langsung di Dashboard Maintenance.
  - *Alasan*: Menghilangkan kebutuhan mekanik untuk memilih kembali No Unit di dropdown terpisah; alur kerja pembaruan jam ke jam menjadi instan langsung di bawah baris unit yang bersangkutan.
- **Penghapusan Sub-Menu Laporan Harian Terpisah**:
  - *Keputusan*: Fitur cetak laporan harian dijadikan fitur Print Preview WYSIWYG langsung pada tabel Dashboard Maintenance.
  - *Alasan*: Mencegah duplikasi data dan memastikan apa yang dicetak selalu mencerminkan kondisi riil di lapangan pada saat tombol ditekan.
- **Retensi Data Riwayat Lengkap**:
  - *Keputusan*: Ketika unit diubah menjadi status `READY`, unit tidak dihapus melainkan statusnya diperbarui, downtime dikunci, dan unit berpindah ke *History Breakdown*.
  - *Alasan*: Riwayat perbaikan dan penggantian part tetap tersimpan permanen untuk kebutuhan audit, analisis masa pakai part, dan klaim garansi.

---

## 4. Technical Architecture & Implementation Steps

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ALUR DATA & KOMPONEN                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────┐
│ MaintenanceDatabaseView.tsx           │   │ ActiveBreakdownMonitoringSubView  │
│ • State activeSubModule (1, 2, 3, 4)  │──►│ • Tabel Bertingkat (Expandable +) │
│ • 4 Tab Navigasi Bersih               │   │ • Inline Quick Update Row         │
│ • Routing ke sub-view yang sesuai     │   │ • WYSIWYG Print Preview Modal     │
└───────────────────────────────────────┘   │ • Single MO Print Preview Modal   │
                                            └─────────────────┬─────────────────┘
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                   ▼
                               ┌─────────────────────────┐         ┌─────────────────────────┐
                               │ storage.ts              │         │ Cloud Firestore         │
                               │ • updateBreakdownAct... │◄───────►│ • collection('breakd...')│
                               │ • unshift to top        │         │ • Realtime multi-device │
                               │ • Auto-calculate downt..│         │ • Persist & Audit trail │
                               └─────────────────────────┘         └─────────────────────────┘
```

### Rincian Perubahan File:
1. **`src/components/modul3/MaintenanceDatabaseView.tsx`**:
   - Memperbarui tab navigasi menjadi 4 sub-menu:
     - 1: `Input BD` (`InputBreakdownSubView`)
     - 2: `Dashboard Maintenance` (`ActiveBreakdownMonitoringSubView`)
     - 3: `History Breakdown` (`DetailBreakdownHistorySubView`)
     - 4: `Pareto Analisis PA & MTBF` (`DashboardMaintenanceSubView`)
   - Membersihkan impor sub-menu yang tidak lagi digunakan secara mandiri.
2. **`src/components/modul3/ActiveBreakdownMonitoringSubView.tsx`**:
   - Menambahkan state `expandedMoIds: Set<string>` untuk mengontrol baris yang terbuka.
   - Merancang baris bertingkat (*collapsible row*):
     - Form input cepat inline dengan validasi jam 24 jam Indonesia.
     - Sub-tabel runtutan pekerjaan dalam 1 No MO (terbaru di posisi atas).
     - Tombol Simpan Update dengan pembaruan status `READY` yang otomatis mengarsipkan unit.
   - Menambahkan modal Print Preview WYSIWYG (mencetak unit dan rincian pekerjaan yang sedang terbuka di layar).
   - Menambahkan handler klik No Reff MO untuk cetak per unit.
3. **`src/utils/storage.ts`**:
   - Memastikan `updateBreakdownActivity` mengunci downtime saat status `READY` dan menyimpan urutan riwayat terbaru di baris pertama (`unshift`).
4. **Verifikasi & Uji**:
   - Menjalankan `compile_applet` dan `lint_applet` untuk menjamin tidak ada kesalahan sintaks maupun dependensi.
