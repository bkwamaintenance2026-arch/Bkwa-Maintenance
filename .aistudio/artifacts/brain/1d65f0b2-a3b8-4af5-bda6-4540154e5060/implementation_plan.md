# Integrasi Kebutuhan Part Modul 3 ke Modul 6: Monitoring Supply & Outstanding Part

Integrasi otomatis daftar kebutuhan suku cadang dari Modul 3 (Update Breakdown) ke Modul 6 (Inventory Management) berbasis No MO / No Notifikasi yang sama, dilengkapi Sub-Modul baru untuk monitoring supply barang dari Malang, checklist pemenuhan langsung per baris, serta Form & Summary Surat Permintaan Barang (SPB) Khusus Non Unit.

## User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan hasil klarifikasi kebutuhan yang telah dikonfirmasi dan disepakati:

- **Struktur Menu & Lokasi Sub-Modul**: Ditambahkan Sub-Modul ke-3 pada Modul 6: **"3. Monitoring Supply & Outstanding Part"** (berdampingan dengan Sub-Modul 1: Input Spare Part dan Sub-Modul 2: Transaksi & Order Part).
- **Alur Checklist Pemenuhan Supply Malang**: Checklist status langsung pada baris tabel outstanding (klik centang/status untuk update pemenuhan: *Belum Supply*, *Sebagian / Parsial*, atau *Terpenuhi / Selesai*, disertai catatan tanggal tiba & no surat jalan/DO Malang).
- **Kategori Form SPB Non Unit**: Form khusus Surat Permintaan Barang Non Unit dengan pilihan kategori: **Tools & Alat Kerja**, **Konsumabel Workshop**, dan **Fasilitas Umum**, yang terpisah dari unit breakdown namun tersentralisasi di summary Modul 6.
- **Konsistensi No Referensi**: Seluruh kebutuhan part unit secara otomatis menggunakan No Maintenance Order (No MO) / No Notifikasi yang identik dari Modul 3, mencegah duplikasi entri atau inkonsistensi nomor dokumen.

---

## 1. Overview & Core Concept

- **What It Does**: 
  1. Menarik seluruh data kebutuhan suku cadang (`partsJasa`) dari setiap unit yang sedang mengalami breakdown di Modul 3 ke dalam dashboard monitoring Modul 6 secara *real-time*.
  2. Menyediakan rekapitulasi status supply barang yang dikirim dari kantor/gudang logistik Malang ke workshop site: membedakan part yang *Sudah Terpenuhi*, *Dalam Pengiriman/Parsial*, dan *Outstanding (Belum Terpenuhi)*.
  3. Memungkinkan tim logistik dan workshop melakukan checklist penerimaan supply langsung pada tabel tanpa harus berpindah modul atau membuka form berulang-ulang.
  4. Menyediakan Form Permintaan Barang Khusus Non-Unit (keperluan operasional bengkel seperti grease pump, kunci pas, kawat las, APD, majun, lampu kerja bengkel) dan menggabungkan ringkasannya ke dalam tab monitoring terpadu.

- **Target Audience / Persona**:
  - **Petugas Inventory & Logistik Site**: Memantau kedatangan barang dari Malang dan mencatat item yang sudah diterima.
  - **Mekanik / Supervisor / Kabag Workshop**: Mengetahui kepastian ketersediaan suku cadang untuk unit breakdown dan membuat SPB Non-Unit untuk peralatan kerja bengkel.
  - **Administrasi Workshop**: Memastikan No MO sinkron antara pelaporan breakdown di Modul 3 dan pengadaan di Modul 6.

- **Key Value**:
  - Mengeliminasi *double-entry* (tidak perlu mengetik ulang daftar part breakdown di Modul 6).
  - Visibilitas penuh terhadap *backlog* / *lead time* suku cadang dari Malang sehingga target unit *ready* dapat diprediksi secara akurat.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Alur Kebutuhan Part Unit (Otomatis dari Modul 3)**:
   - Mekanik/Admin menginput kebutuhan part di Modul 3 saat mengupdate breakdown unit (misal: Komatsu PC200, MO: `260012`).
   - Sistem secara otomatis mencatatkan kebutuhan part tersebut ke Modul 6 Sub-Modul 3 di tab **"Part Breakdown Unit"**.
   - Ketika kiriman dari Malang tiba di workshop, petugas logistik membuka Sub-Modul 3, mencari No MO `260012`, dan menekan tombol checklist atau dropdown status pada baris part untuk mengubah status menjadi **"Terpenuhi"** atau **"Parsial"** (memasukkan Qty Diterima dan No DO/Resi Malang jika ada).
   - Progres pemenuhan per unit langsung terkalkulasi (contoh: `3 dari 4 item terpenuhi - 75%`).

2. **Alur Surat Permintaan Barang (SPB) Non Unit**:
   - Di Sub-Modul 3 Modul 6, pengguna menekan tombol **"+ Buat SPB Non-Unit"**.
   - Terbuka modal form khusus dengan opsi kategori:
     - *Tools & Alat Kerja* (misal: Impact Wrench, Torque Wrench, Jack Stand, Multimeter).
     - *Konsumabel Workshop* (misal: WD-40, Majun/Kain Lap, Kawat Las, Oksigen Las, Sabun Cuci Komponen).
     - *Fasilitas Umum* (misal: Lampu Penerangan Bay Workshop, Terpal, Selang Angin Kompresor, APD).
   - Setelah disimpan, sistem menerbitkan nomor unik (contoh: `SPB-NU-260001`), dan otomatis muncul di sub-tab **"Permintaan Non-Unit"** dengan status monitoring supply dari Malang.

3. **Alur Summary & Filter Monitoring**:
   - Tab navigasi segmented: **[Semua Part Outstanding]** · **[Per Unit Breakdown (No MO)]** · **[Non-Unit Workshop]**.
   - Quick Filter: Status (*Belum Disupply*, *Parsial*, *Terpenuhi*), Periode Tanggal, dan Pencarian No MO/Nama Part.
   - Ekspor ringkasan ke format Excel/Printable PDF untuk laporan mingguan ke Manajemen Malang.

### Visual Identity & Theme

- **Aesthetic Direction**: Utilitarian industrial dashboard selaras dengan tema gelap BKWA Workshop (`bg-stone-900`, `bg-stone-950/80`, aksen `amber-500` dan `amber-400`).
- **Color Discipline (Status Pemenuhan)**:
  - *Belum Supply / Outstanding*: Text merah bata (`text-rose-400 bg-rose-500/10 border-rose-500/20`), indikator bahwa unit menunggu part dari Malang.
  - *Parsial / Sebagian*: Text kuning amber (`text-amber-400 bg-amber-500/10 border-amber-500/20`), sebagian item telah diterima.
  - *Terpenuhi / Selesai*: Text hijau emerald (`text-emerald-400 bg-emerald-500/10 border-emerald-500/20`), suku cadang lengkap siap pasang.
- **Tabular Data Presentation**:
  - Seluruh angka kuantitas, tanggal, dan nomor referensi menggunakan `font-mono tabular-nums`.
  - Baris tabel compact dengan tinggi proporsional, hover highlight halus, dan aksi inline satu sentuhan (*1-click fulfillment toggle*).

---

## 3. Key Product Decisions & Trade-Offs

- **Sinkronisasi Data Otomatis vs Tombol Import Manual**:
  - *Keputusan*: Otomatis sinkron via pembacaan terpadu dari `BreakdownRecord` Modul 3 dan data supply tracking di `localStorage` / Firebase.
  - *Alasan*: Pengguna tidak perlu menekan tombol import berulang kali; setiap perubahan part di Modul 3 langsung terlihat di Modul 6.
  
- **Skema Penyimpanan Data Pemenuhan Supply**:
  - *Keputusan*: Membuat struktur data `PartSupplyTracking` yang mengaitkan `breakdownId`, `noMaintenanceOrder`, `itemPartIndex / partKey`, `statusSupply`, `qtySupplied`, `tanggalSupply`, `catatanMalang`, dan `noSuratJalanMalang`.
  - *Alasan*: Tidak merusak struktur `BreakdownRecord` yang sudah berjalan stabil di Modul 3, sekaligus memungkinkan Modul 6 menyimpan detail riwayat penerimaan barang dari Malang secara spesifik.

- **Pemisahan vs Penyatuan Tabel Unit dan Non-Unit**:
  - *Keputusan*: Disatukan dalam satu Sub-Modul 3 dengan filter tab (*All*, *Unit Breakdown*, *Non-Unit Workshop*).
  - *Alasan*: Memudahkan petugas logistik memeriksa seluruh kiriman paket/koli yang tiba dari Malang dalam satu pintu pengawasan, tanpa harus membuka menu yang terpisah-pisah.

---

## 4. Technical Architecture & Data Strategy

### Component Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ MODUL 3: BREAKDOWN MANAGEMENT                                         │
│ • UpdateBreakdownSubView (Input partsJasa[])                           │
│ • DetailBreakdownHistorySubView                                        │
│ • PartRequirementModal (No MO / No Notifikasi Reff)                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SHARED STORAGE & STATE LAYER (storage.ts / types.ts)                   │
│ • BreakdownRecord[] (Sumber kebutuhan part unit)                      │
│ • PartSupplyTracking[] (Pencatatan supply kedatangan dari Malang)      │
│ • NonUnitPurchaseRequest[] (SPB Non Unit: Tools, Konsumabel, Fasilitas)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ MODUL 6: INVENTORY MANAGEMENT                                          │
│ ├── Sub-Modul 1: Input Spare Part (Master & Stok Gudang Site)          │
│ ├── Sub-Modul 2: Transaksi & Order Part Unit                           │
│ └── Sub-Modul 3 (BARU): Monitoring Supply & Outstanding Part          │
│     ├── Stat Cards (Total Outstanding, Parsial, Terpenuhi, Non-Unit)   │
│     ├── Filter Bar (Cari No MO / Part, Kategori, Status Supply)        │
│     ├── Interactive Table with Inline Checklist / Quick Supply Modal   │
│     ├── Modal Form SPB Non Unit (Tools, Konsumabel, Fasilitas)         │
│     └── Export / Print Rekapitulasi Suku Cadang Kiriman Malang        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Extension (`src/types/index.ts`)

```typescript
// Status Pemenuhan Barang dari Malang
export type SupplyFulfillmentStatus = 'PENDING' | 'PARSIAL' | 'TERPENUHI';

// Pencatatan Supply Barang Per Item Part (Unit Breakdown)
export interface PartSupplyItemTracking {
  id: string;
  sourceType: 'UNIT_BREAKDOWN' | 'NON_UNIT';
  refNumber: string;               // No MO (cth: 260001) atau No SPB Non-Unit
  breakdownId?: string;
  noUnit?: string;
  namaAlat?: string;
  partNumber: string;
  namaPart: string;
  qtyDiminta: number;
  qtyDiterima: number;
  satuan: string;
  status: SupplyFulfillmentStatus;
  tanggalSupply?: string;          // YYYY-MM-DD kedatangan dari Malang
  noSuratJalanMalang?: string;     // No DO / Surat Jalan / Resi
  catatan?: string;
  updatedBy?: string;
  updatedAt: string;
}

// Form Permintaan Barang Khusus Non-Unit
export type NonUnitCategory = 'TOOLS_ALAT_KERJA' | 'KONSUMABEL_WORKSHOP' | 'FASILITAS_UMUM';

export interface NonUnitPurchaseRequest {
  id: string;
  noPermintaan: string;            // SPB-NU-260001
  tanggal: string;
  kategori: NonUnitCategory;
  pemohon: string;
  jabatanPemohon: string;
  urgensi: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  alasanPermintaan: string;
  items: Array<{
    no: number;
    namaBarang: string;
    spesifikasi?: string;
    qtyDiminta: number;
    satuan: string;
    keterangan?: string;
  }>;
  statusSupply: SupplyFulfillmentStatus;
  statusPengajuan: 'DIAJUKAN' | 'DISETUJUI' | 'SELESAI';
  disetujuiOleh?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Key Components to Add & Update

1. **`src/types/index.ts`**: Menambahkan interface `PartSupplyItemTracking`, `NonUnitPurchaseRequest`, dan enum status pemenuhan.
2. **`src/utils/storage.ts`**:
   - Menambahkan fungsi `getPartSupplyTrackings()`, `updatePartSupplyStatus()`, `batchUpdatePartSupply()`.
   - Menambahkan fungsi `getNonUnitPurchaseRequests()`, `saveNonUnitPurchaseRequest()`, `updateNonUnitSupplyStatus()`.
   - Mengintegrasikan agregasi otomatis: membaca `breakdowns` aktif dari Modul 3, mengekstrak `partsJasa`, lalu mencocokkan dengan data tracking pemenuhan.
3. **`src/components/modul6/MonitoringSupplySubView.tsx`** (Komponen Baru):
   - Tabel interaktif daftar suku cadang outstanding per No MO dan Non-Unit.
   - Tombol checklist langsung (Centang = Langsung tandai Terpenuhi / Form Cepat Penerimaan Malang).
   - Segmented filter (*Semua*, *Kebutuhan Unit Breakdown*, *Kebutuhan Non-Unit*).
   - Ringkasan KPI: Total item dibutuhkan, Total item disupply, Persentase pemenuhan.
4. **`src/components/modul6/NonUnitRequestModal.tsx`** (Komponen Baru):
   - Form modal pembuatan Surat Permintaan Barang Non-Unit dengan kategori Tools & Alat Kerja, Konsumabel Workshop, dan Fasilitas Umum.
   - Pilihan personil penandatangan / pemohon dari Manpower Modul 2.
5. **`src/components/modul6/InventoryManagementView.tsx`**:
   - Menambahkan tab navigasi ke-3: **"3. Monitoring Supply & Outstanding Part"**.
   - Menghubungkan state dan refresh handler antara Modul 3 dan Modul 6.
