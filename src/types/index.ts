export type UserRole = 'ADMIN' | 'KARYAWAN';

// 4 Tingkatan Akun Resmi BKWA Sesuai Spesifikasi:
// 1. DEVELOPER: Full access semua modul, form registrasi aset, otorisasi, export, dsb.
// 2. ADMIN: Bisa Input dan Export modul 3, 4, & 5.
// 3. KHUSUS: Bisa Export modul 1 (Daftar Aset Unit), modul 2 (Daftar Manpower), export modul 3, 4, & 5.
// 4. MEMBER: Hanya Viewer modul 3 dan Input modul 5 (P2H).
export type AccountTier = 'DEVELOPER' | 'ADMIN' | 'KHUSUS' | 'MEMBER';

// Otorisasi Hak Akses: Bisa Mengisi (Input & Edit) vs Hanya View (Lihat Saja)
export type UserAccessLevel = 'BISA_MENGISI' | 'HANYA_VIEW';

export interface UserModulePermissions {
  modul1Asset?: boolean;        // Hak input Modul 1: Registrasi Asset (Hanya Developer)
  modul2Manpower?: boolean;     // Hak input Modul 2: Data Manpower
  modul3Maintenance?: boolean;  // Hak input Modul 3: Maintenance Database
  modul4Inventory?: boolean;    // Hak input Modul 4: FOG (Fuel, Oil & Grease)
  modul5P2H?: boolean;          // Hak input Modul 5: Input Form P2H
  modul6SparePart?: boolean;    // Hak input Modul 6: Inventory Management (Spare Part)
  modul7Tyre?: boolean;         // Hak input Modul 7: Tyre Management System
  canExportModul1?: boolean;
  canExportModul2?: boolean;
  canExportModul3?: boolean;
  canExportModul4?: boolean;
  canExportModul5?: boolean;
  canExportModul6?: boolean;
  canExportModul7?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  email?: string;                 // Email resmi untuk login di HP karyawan
  fullName: string;
  role: UserRole;
  accountTier?: AccountTier;      // 'DEVELOPER' | 'ADMIN' | 'KHUSUS' | 'MEMBER'
  password?: string;
  department?: string;
  jabatan?: string;
  manpowerId?: string;
  phone?: string;
  status: 'AKTIF' | 'NONAKTIF';
  accessLevel?: UserAccessLevel; // 'BISA_MENGISI' (Editor) | 'HANYA_VIEW' (Viewer)
  modulePermissions?: UserModulePermissions;
  createdAt: string;
  lastLogin?: string;
}

export type OperationalStatus = 
  | 'Operasi Etika 05'
  | 'Operasi Etika 09'
  | 'Breakdown'
  | 'Stanby'
  | 'OPERASI'
  | 'STANDBY'
  | 'BREAKDOWN'
  | 'MAINTENANCE'
  | string;

export const ASSET_STATUS_OPTIONS = [
  'Operasi Etika 05',
  'Operasi Etika 09',
  'Breakdown',
  'Stanby',
] as const;

export type UnitCategory = string;

export interface ActivityLog {
  id: string;
  tanggal: string;
  aksi: 'REGISTRASI' | 'UPDATE' | 'HAPUS' | 'STATUS_CHANGE';
  user: string;
  role: UserRole;
  keterangan: string;
  detailUnit?: string;
}

export interface AssetUnit {
  id: string;
  // Field-field resmi Modul 1 Registrasi Asset sesuai spesifikasi:
  cnNew: string;           // CN_NEW (Wajib)
  namaAlat: string;        // NAMA ALAT (Wajib)
  jenis: string;           // JENIS (e.g. Excavator, Dump Truck, Stone Crusher, dsb.)
  classUnit: string;       // CLASS (e.g. Heavy Duty, Medium, Light, Plant)
  loc: string;             // LOC (Lokasi: Pit Purwosari, Crusher Plant, Workshop, dsb.)
  status: OperationalStatus; // STATUS (OPERASI, STANDBY, BREAKDOWN, MAINTENANCE)
  brandMerk: string;       // BRAND/MERK (Komatsu, Caterpillar, Hino, Shanbao, dll.)
  snUnit: string;          // SN UNIT (Serial Number Unit / No Rangka)
  modelUnit: string;       // MODEL UNIT (PC200-8, 320D, FM 260, dll.)
  engineModel: string;     // ENGINE MODEL (SAA6D107E, C4.4, J08E, dll.)
  snEngine: string;        // SN ENGINE (Serial Number Mesin)
  merkEngine: string;      // MERK ENGINE (Komatsu, CAT, Hino, Perkins, dll.)

  // Metadata sistem
  tanggalRegistrasi: string;
  terakhirDiperbarui: string;
  catatan?: string;
  riwayatLog?: ActivityLog[];
}

// --- MODUL 2: DATA MANPOWER ---
export type ManpowerJabatan = 
  | 'OWNER'
  | 'DIREKTUR / MANAGEMENT'
  | 'KABAG WORKSHOP'
  | 'ADMINISTRASI'
  | 'MEKANIK'
  | 'HELPER MEKANIK'
  | 'OPERATOR LOADER'
  | 'OPERATOR EXCA'
  | 'SOPIR LOKASI'
  | 'DRIVER FUEL TRUCK'
  | 'PETUGAS FOG'
  | 'PKL';

export const MANPOWER_JABATAN_OPTIONS: ManpowerJabatan[] = [
  'OWNER',
  'DIREKTUR / MANAGEMENT',
  'KABAG WORKSHOP',
  'ADMINISTRASI',
  'MEKANIK',
  'HELPER MEKANIK',
  'OPERATOR LOADER',
  'OPERATOR EXCA',
  'SOPIR LOKASI',
  'DRIVER FUEL TRUCK',
  'PETUGAS FOG',
  'PKL',
];

export type StatusKaryawan = 
  | 'TETAP'
  | 'KONTRAK'
  | 'HARIAN LEPAS'
  | 'KEMITRAAN'
  | 'MAGANG';

export const STATUS_KARYAWAN_OPTIONS: StatusKaryawan[] = [
  'TETAP',
  'KONTRAK',
  'HARIAN LEPAS',
  'KEMITRAAN',
  'MAGANG',
];

export interface ManpowerData {
  id: string;
  nik: string;               // NIK (Tidak wajib saat ini, opsional)
  nama: string;              // NAMA (Opsional)
  jabatan: ManpowerJabatan | string; // JABATAN (Pilihan dropdown)
  noWa: string;              // NO WA (Opsional)
  statusKaryawan: StatusKaryawan | string; // STATUS KARYAWAN (TETAP, KONTRAK, HARIAN LEPAS, KEMITRAAN, MAGANG)
  tglMasukKerja: string;     // TGL. MASUK KERJA (Opsional, format YYYY-MM-DD atau DD/MM/YYYY)
  keterangan: string;        // KETERANGAN (Opsional)
  createdAt: string;
  updatedAt: string;
}

export interface ModuleInfo {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'AKTIF' | 'MENUNGGU_MODUL';
  badge: string;
}

// --- MODUL 3: DASHBOARD MAINTENANCE ---

export type BreakdownComponentOption =
  | 'Engine'
  | 'Transmisi'
  | 'Torque Converter'
  | 'Clutch Mechanism'
  | 'Propeller & Join'
  | 'Differential & Hub'
  | 'Hydraulic'
  | 'Air System'
  | 'Electric System'
  | 'Fuel System'
  | 'Pneumatic System'
  | 'Under Carriage'
  | 'Attachment'
  | 'Cabin'
  | 'Other';

export const BREAKDOWN_COMPONENT_OPTIONS: BreakdownComponentOption[] = [
  'Engine',
  'Transmisi',
  'Torque Converter',
  'Clutch Mechanism',
  'Propeller & Join',
  'Differential & Hub',
  'Hydraulic',
  'Air System',
  'Electric System',
  'Fuel System',
  'Pneumatic System',
  'Under Carriage',
  'Attachment',
  'Cabin',
  'Other',
];

export type BreakdownProgressOption =
  | 'On Progress'
  | 'Waiting Mechanic'
  | 'Waiting Part'
  | 'Rest Time'
  | 'Waiting Instruksi'
  | 'Waiting Transportasi'
  | 'Cuaca Buruk';

export const BREAKDOWN_PROGRESS_OPTIONS: BreakdownProgressOption[] = [
  'On Progress',
  'Waiting Mechanic',
  'Waiting Part',
  'Rest Time',
  'Waiting Instruksi',
  'Waiting Transportasi',
  'Cuaca Buruk',
];

export type BreakdownStatusUnitOption = 'BREAKDOWN' | 'READY' | 'LIMIT OPERASI';

export const BREAKDOWN_STATUS_UNIT_OPTIONS: BreakdownStatusUnitOption[] = [
  'BREAKDOWN',
  'READY',
  'LIMIT OPERASI',
];

export type PartSatuanOption = 'Pcs' | 'Set' | 'Ltr' | 'Drum' | 'Pail' | 'Mtr' | 'Pack';

export const PART_SATUAN_OPTIONS: PartSatuanOption[] = [
  'Pcs',
  'Set',
  'Ltr',
  'Drum',
  'Pail',
  'Mtr',
  'Pack',
];

export interface BreakdownPartJasaItem {
  no: number;
  jenis: 'Part' | 'Jasa';
  namaPart: string;
  partNumber: string;
  qty: number | string;
  satuan: PartSatuanOption | string;
}

export interface BreakdownUpdateEntry {
  id: string;
  startJob: string; // Tanggal mulai pekerjaan perbaikan
  jamStart?: string; // Jam mulai pekerjaan (format 24 jam HH:mm, cth: 08:00, 14:30)
  jamFinish?: string; // Jam selesai pekerjaan (format 24 jam HH:mm, cth: 17:00, 22:15)
  detailKerusakan: string; // Detail kerusakan perbaikan
  progress: BreakdownProgressOption | string;
  statusUnit: BreakdownStatusUnitOption | string;
  pic1?: string;
  pic2?: string;
  pic3?: string;
  remark?: string;
  partsJasa?: BreakdownPartJasaItem[];
  kebutuhanPart?: string; // Teks ringkasan jika ada
  updatedBy: string;
  createdAt: string;
}

export interface BreakdownRecord {
  id: string;
  noNotifikasi: string; // Format otomatis nomor laporan (Contoh: 260001)
  noMaintenanceOrder?: string; // Format: 2 digit th + 4 digit no urut (Contoh: 260001)
  
  // Sub Modul 1 Fields
  tanggal: string;      // Tanggal Unit mulai Breakdown
  jamBreakdown?: string; // Jam mulai breakdown (format 24 jam HH:mm)
  hm?: string | number; // Hours Meter
  jenis: string;        // JENIS alat berat (dari Modul 1)
  noUnit: string;       // NO UNIT (CN_NEW terpilih dari dropdown berdasar JENIS)
  namaAlat?: string;    // NAMA ALAT (reff Modul 1)
  noLama: string;       // NO LAMA / NAMA ALAT
  lokasi: string;       // Lokasi breakdown (Text bebas)
  pelapor: string;      // PELAPOR (dari DATA Manpower di Modul 2)
  jabatan: string;      // Jabatan (muncul otomatis saat pelapor dipilih)
  component: BreakdownComponentOption | string; // Pilihan component yang rusak
  detailProblem: string; // Detail Problem awal (Text bebas, read-only saat update)
  
  // Sub Modul 2 Fields (Update Breakdown terkini)
  startJob?: string;
  jamStart?: string;    // Jam mulai pekerjaan (format 24 jam HH:mm)
  jamFinish?: string;   // Jam selesai pekerjaan (format 24 jam HH:mm)
  detailKerusakan?: string;
  progress?: BreakdownProgressOption | string;
  statusUnit: BreakdownStatusUnitOption | string; // BREAKDOWN | READY | LIMIT OPERASI
  pic1?: string;
  pic2?: string;
  pic3?: string;
  remark?: string;
  partsJasa?: BreakdownPartJasaItem[];

  // Downtime tracking
  downtimeHours?: number; // Jam dunia downtime
  completedAt?: string;   // Timestamp saat status beralih ke READY / LIMIT OPERASI

  // Riwayat pembaruan progres
  riwayatUpdate: BreakdownUpdateEntry[];

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODUL 4: INVENTORY MANAGEMENT
// Sub Modul:
// 1. Data Suplier
// 2. Input Stock (FUEL) + Top 5 Last Transaksi
// 3. Data Transfer Fuel (Tangki-FT)
// 4. Input Stock Oli
// 5. Distribution Fuel
// 6. Distribution Oli
// ==========================================

export type FogSatuanOption = 'Ltr' | 'Kg' | 'Drum' | 'Pail';
export const FOG_SATUAN_OPTIONS: FogSatuanOption[] = ['Ltr', 'Kg', 'Drum', 'Pail'];

export const DEFAULT_FOG_NAMA_BARANG: string[] = [
  'SOLAR',
  'TURALIK 52 PERTAMINA',
  'RORED HDA SAE 90',
  'SAE 15W 40',
  'ATF',
];

// 1. Data Suplier
export interface SupplierRecord {
  id: string;
  namaDistributor: string; // a. Nama Distributor
  alamat: string;          // b. Alamat
  noTelpWa: string;        // c. NO Tlp/WA
  email: string;           // d. Email
  itemName: string;        // e. Item Name (e.g. Solar B35, Oli Hidrolik Turalik 52, dll)
  createdAt: string;
  updatedAt: string;
}

// 2. Input Stock (FUEL)
export interface FuelStockInputRecord {
  id: string;
  distributor: string;            // a. Distributor (Dropdown reff by "Data SUplier")
  snReffNo: string;               // b. SN/Reff No
  platNomor: string;              // c. Plat Nomor
  driverName: string;             // d. Driver Name
  qtySupplier: number;            // e. qty (Suplier)
  flowmeterStart: number;         // f. Flowmeter Start
  flowmeterEnd: number;           // g. Flowmeter End
  actualQtyFlowmeter: number;     // h. Actual Qty Flowmeter (End - Start)
  hasilUkurStickSebelum: number | string; // i. Hasil Ukur Stick (Sebelum)
  hasilUkurStickSesudah: number | string; // j. Hasil Ukur Stick (Sesudah)
  picFogName: string;             // k. PIC FOG Name : (dropdown reff nama Manpower di modul 2)
  picFogJabatan?: string;
  tanggal: string;                // l. Tanggal
  jam: string;                    //    dan jam Input
  remark?: string;                // j/m. Remark
  createdAt: string;
  updatedAt: string;
}

// 3. Data Transfer Fuel (Tangki-FT)
export interface FuelTransferRecord {
  id: string;
  tanggal: string;                // a. Tanggal
  jam: string;                    //    & jam
  namaDriverFt: string;           // b. Nama Driver FT (dropdown reff nama Manpower di modul 2)
  driverFtJabatan?: string;
  picFog: string;                 // c. PIC FOG (dropdown reff nama Manpower di modul 2)
  picFogJabatan?: string;
  flowmeterStart: number;         // d. Flowmeter Start
  flowmeterStop: number;          // e. Flowmeter STop
  qty: number;                    // f. Qty (Stop - Start)
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// 4. Input Stock Oli
export interface OilStockInputRecord {
  id: string;
  distributor: string;            // a. Distributor (Dropdown reff by "Data SUplier")
  tanggal: string;                // b. Tanggal
  jam: string;                    //    dan jam input
  namaOli: string;                // c. Nama Oli (TURALIK 52 PERTAMINA, RORED HDA SAE 90, SAE 15W 40, ATF, dll)
  qty: number;                    // d. Qty
  satuan?: FogSatuanOption | string;
  picGudangMaterial: string;      // e. PIC Gudang Material (dropdown reff Manpower)
  picGudangJabatan?: string;
  remark?: string;                // f. Remark
  createdAt: string;
  updatedAt: string;
}

// 5. Distribution Fuel
export interface FuelDistributionRecord {
  id: string;
  noBon: string;                  // 1. No Bon
  cnAlat: string;                 // 2. CN alat (Dropdown Modul 1)
  namaAlat: string;               // 3. Nama ALat (Otomatis dari CN)
  jenisAlat?: string;             // Jenis Alat Modul 1
  operatorName: string;           // 4. Operator Name
  operatorJabatan?: string;
  hm: number;                     // 5. HM
  hmPengisian?: number;
  tanggal: string;                // 6. Tanggal
  jam: string;                    //    dan Jam
  flowmeterStart: number;         // 7. Flowmeter Start
  flowmeterStop: number;          // 8. Flowmeter Stop
  qty: number;                    // 9. Qty (Stop - Start)
  driverFtName?: string;
  picFogName?: string;
  lokasi?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// 6. Distribution Oli
export interface OilDistributionRecord {
  id: string;
  noBon?: string;
  noUnit: string;                 // 1. No Unit (Dropdown sesuai CN di Modul 1)
  namaUnit?: string;              // Nama Alat Modul 1
  namaAlat?: string;              // Nama Alat Modul 1
  hmUnit: number;                 // 2. HM unit
  jenisOli: string;               // 3. Jenis Oli (dropdown TURALIK 52 PERTAMINA, RORED HDA SAE 90, SAE 15W 40, ATF, dll)
  qty: number;                    // 4. Qty
  satuan?: FogSatuanOption | string;
  rincianKerusakan: string;       // 5. Rincian Kerusakan
  picMekanik: string;             // 6. PIC Mekanik (Manpower Modul 2)
  picMekanikJabatan?: string;
  picGudangMaterial: string;      // 7. PIC Gudang Material (Manpower Modul 2)
  picGudangJabatan?: string;
  tanggal?: string;
  jam?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type HeavyEquipment = AssetUnit;

// Sisa Periode Sebelumnya & Konfigurasi Kapasitas Tangki (Manual Setting)
export interface InventoryPeriodBalance {
  sisaPeriodeLaluFuelTangki: number; // Ltr
  sisaPeriodeLaluFuelFT: number;     // Ltr
  sisaPeriodeLaluOli: Record<string, number>; // per varian oli (Ltr)
  kapasitasTangkiUtama?: number;     // Kapasitas Tangki Solar Utama Manual (Ltr) - dapat diganti manual jika tangki diganti
  kapasitasFuelTruck?: number;       // Kapasitas Fuel Truck FT-01 Manual (Ltr)
}

// Legacy FOG Types for compatibility
export type FogDistributionLokasiOption = 'Pabrik' | 'Tambang' | 'Other';
export const FOG_DISTRIBUTION_LOKASI_OPTIONS: FogDistributionLokasiOption[] = ['Pabrik', 'Tambang', 'Other'];
export type FogJenisCategory = 'Fuel' | 'Oil' | 'Grease';
export const FOG_JENIS_CATEGORIES: FogJenisCategory[] = ['Fuel', 'Oil', 'Grease'];

export interface FogStockInputRecord {
  id: string;
  tanggal: string;
  jam: string;
  pic: string;
  picJabatan?: string;
  jenis: FogJenisCategory | string;
  namaBarang: string;
  lokasiDari: string;
  lokasiKe: string;
  flowmeterStart: number;
  flowmeterEnd: number;
  qty: number;
  satuan: FogSatuanOption | string;
  identitasTransportPengirim: string;
  identitasArmada: string;
  dokumenNumber: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FogFuelDistributionRecord {
  id: string;
  tanggal: string;
  jam?: string;
  jamPengisian: string;
  noUnit: string;
  namaAlat?: string;
  jenisUnit?: string;
  namaOperator: string;
  operatorJabatan?: string;
  hmPengisian: number;
  lokasi: FogDistributionLokasiOption | string;
  lokasiDetail?: string;
  driverFt: string;
  driverFtJabatan?: string;
  picFog: string;
  picFogJabatan?: string;
  flowmeterStart: number;
  flowmeterEnd: number;
  qty: number;
  satuan: FogSatuanOption | string;
  dokumenNumber: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FogOilDistributionRecord {
  id: string;
  tanggal: string;
  jam?: string;
  jamPengisian: string;
  petugas: string;
  petugasJabatan?: string;
  noUnit: string;
  namaAlat?: string;
  jenisUnit?: string;
  jenisBarang: string;
  jenisOli?: string;
  qty: number;
  satuan: FogSatuanOption | string;
  hmPengisian: number;
  dokumenNumber: string;
  lokasi?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type FogDistributionRecord = FogFuelDistributionRecord;

// ==========================================
// MODUL 5: INPUT FORM P2H UNIT
// Sub Modul & Struktur:
// Bagian 1: Informasi Umum (Operator, Timestamp, No Unit berdasar jenis, HM/KM)
// Bagian 2: Checklist Pemeriksaan:
//   a. WalkAround Check (6 items + Catatan & Upload Foto Kerusakan)
//   b. Pemeriksaan Kabin & Operational (3 items + Catatan & Upload Foto Kerusakan)
//   c. Pelaporan & Validasi Akhir (Layak Operasi / Tidak Layak, Tanda Tangan Konfirmasi)
//   d. Tombol Cepat Check All OK
// ==========================================

export type P2HCheckStatus = 'OK' | 'RUSAK_ABNORMAL' | 'TIDAK_ADA';
export type P2HKelayakanStatus = 'LAYAK_OPERASI' | 'TIDAK_LAYAK';

export interface P2HCheckItem {
  id: string;
  itemNo: number;
  category: 'WALKAROUND' | 'KABIN_OPERASIONAL';
  title: string;
  description: string;
  status: P2HCheckStatus;
  catatanKerusakan?: string;
  fotoKerusakan?: string; // Data URL Base64 image
}

export interface P2HRecord {
  id: string;
  noP2H: string; // Format otomatis: P2H-YYMM-00001
  timestamp: string; // Timestamp real-time saat pengisian
  tanggal: string;   // YYYY-MM-DD
  jam: string;       // HH:mm
  
  // Bagian 1: Informasi Umum
  operatorName: string;    // Dropdown dari Manpower
  operatorJabatan?: string;
  jenisAlat: string;       // Pilihan jenis dari Modul 1
  noUnit: string;          // CN_NEW terpilih
  namaAlat: string;        // Otomatis muncul
  brandMerk?: string;
  modelUnit?: string;
  hmKm: number | string;   // HM / KM (Type Number)

  // Bagian 2: Checklist Items
  items: P2HCheckItem[];

  // Bagian 2c: Pelaporan & Validasi Akhir
  statusKelayakan: P2HKelayakanStatus; // 'LAYAK_OPERASI' | 'TIDAK_LAYAK'
  catatanUmum?: string;
  persetujuanJujur: boolean; // Checkbox konfirmasi kejujuran
  operatorSignatureName: string;
  confirmedAt: string;

  // Metadata
  createdByUserId?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// Sub Modul 2: Setting Fleet (Alokasi No Unit, Nama Operator, Lokasi Kerja)
export interface FleetSettingRecord {
  id: string;
  tanggal: string;              // YYYY-MM-DD
  jamStartOperasi?: string;     // Jam Start Operasi (HH:mm)
  jamFinishOperasi?: string;    // Jam Finish Operasi (HH:mm)
  shift?: 'Shift 1' | 'Shift 2' | 'Non-Shift' | string;
  noUnit: string;               // CN_NEW Alat / No Unit (e.g. DT-01, EX-01)
  namaAlat?: string;            // Nama Alat (e.g. Dump Truck Hino 500)
  jenisAlat?: string;           // Kategori / JENIS (berdasarkan "JENIS" di modul 1)
  namaOperator: string;         // Nama Operator bertugas (Operator & Sopir saja)
  operatorJabatan?: string;     // Jabatan operator
  lokasiKerja: string;          // Lokasi Kerja (Pit Purwosari, Crusher Plant, dll)
  fleetGroup?: string;          // Kelompok Fleet (Fleet A, Fleet B, Fleet Crusher, dll)
  statusFleet?: 'OPERASI' | 'STANDBY' | 'BREAKDOWN' | string;
  catatan?: string;             // Catatan tugas / remark
  source: 'MANUAL' | 'SYNC_P2H'; // Indikator sumber: input manual atau sinkronisasi dari P2H
  p2hRefId?: string;            // Reff ID record P2H jika disinkronkan
  p2hNo?: string;               // No Dokumen P2H terkait jika hasil sinkronisasi
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODUL 6: INVENTORY MANAGEMENT (SPARE PART)
// Sub Modul 1: Input Spare Part (Incoming Part/Component, Stock PN, Qty & Satuan)
// Sub Modul 2: Transaksi Spare Part (List Unit Breakdown & Reff MO, Order Part, Kurangi Stok / Permintaan Barang)
// ==========================================

export interface SparePartItem {
  id: string;
  partNumber: string;       // PN (Part Number)
  namaBarang: string;       // Nama barang / komponen
  qty: number;              // Stock kuantitas
  satuan: string;           // Satuan (Pcs, Set, Box, Roll, Unit, dll)
  kategori?: string;        // Engine, Hidrolik, Filter, Undercarriage, Electrical, Baut, dll
  lokasiRak?: string;       // Lokasi Rak / Bin di Workshop
  minStock?: number;        // Batas stok minimum
  keterangan?: string;      // Keterangan spesifikasi
  createdAt: string;
  updatedAt: string;
}

export interface SparePartTransactionItem {
  no: number;
  partNumber: string;
  namaBarang: string;
  qtyDiminta: number;
  qtyDikeluarkan: number;
  satuan: string;
  statusKetersediaan: 'TERSEDIA' | 'SEBAGIAN' | 'HABIS';
  keterangan?: string;
}

export interface SparePartTransaction {
  id: string;
  noTransaksi: string;          // Contoh: TRX-260001
  tanggal: string;              // YYYY-MM-DD
  jam: string;                  // HH:mm
  noMaintenanceOrder: string;   // Reff No Maintenance Order (cth: 260001)
  noUnit: string;               // No Unit Breakdown (CN New)
  namaAlat?: string;            // Nama Alat
  jenisAlat?: string;           // Jenis Alat
  detailProblem?: string;       // Detail Problem / Kerusakan
  pemohonMekanik: string;       // Nama Mekanik / Teknisi Pemohon
  status: 'SELESAI' | 'SEBAGIAN' | 'PERMINTAAN_BARANG';
  items: SparePartTransactionItem[];
  catatan?: string;
  createdBy?: string;
  createdAt: string;
}

export interface PurchaseRequestItem {
  no: number;
  partNumber: string;
  namaBarang: string;
  qtyDiminta: number;
  satuan: string;
  keterangan?: string;
  estimasiHarga?: number;
}

export interface PurchaseRequest {
  id: string;
  noPermintaan: string;         // Contoh: SPB-260001 / PR-260001
  tanggal: string;
  jam: string;
  noMaintenanceOrder: string;   // Reff No Maintenance Order terkait
  noUnit: string;               // No Unit (CN New)
  namaAlat?: string;
  pemohon: string;              // Nama Pemohon / Mekanik
  jabatanPemohon?: string;
  urgensi: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  alasanPermintaan: string;     // Keterangan / Alasan Permintaan Barang
  items: PurchaseRequestItem[];
  status: 'DIAJUKAN' | 'DISETUJUI' | 'DIPROSES' | 'SELESAI';
  disetujuiOleh?: string;
  createdAt: string;
}

// ============================================================
// MODUL 7: TYRE MANAGEMENT SYSTEM
// ============================================================

export type TyreStatus = 'AVAILABLE' | 'INSTALLED' | 'SCRAP' | 'USED_READY' | 'VULKANISIR';
export type TyreJenis = 'New' | 'Used' | 'Vulkanisir';

// 1. Sub Modul 1: Registrasi Tyre
export interface TyreRegistration {
  id: string;
  kodeTyre: string;             // Generate otomatis ET09-xxxx (cth: ET09-0001)
  merkTyre: string;             // Merk ban (Bridgestone, Giti, Michelin, GoodYear, Advance, Triangle, dll)
  ukuranTyre: string;           // Ukuran ban (11.00R20, 12.00R24, 23.5R25, 26.5R25, 29.5R25, 10.00-20, dll)
  codeExpired: string;          // Code Expired (cth: 4825 atau YYYY-MM / tanggal expired)
  initialDepthThread?: number;  // Kedalaman kembangan awal mm (standar 25-30 mm)
  status: TyreStatus;           // Status: 'AVAILABLE' (Gudang) | 'INSTALLED' (Terpasang) | 'SCRAP' (Afkir)
  currentUnit?: string;         // CN New unit jika terpasang (cth: DT01)
  currentPosisi?: string;       // Posisi ban saat terpasang (FL, FR, RL1, RL2, RR1, RR2)
  currentDepthThread?: number;  // Kedalaman kembangan saat ini mm
  catatan?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 2. Sub Modul 2.a: Install / Pemasangan Tyre
export interface TyreInstallRecord {
  id: string;
  cnNew: string;                // Sesuai List di Modul 1 (hanya yang menggunakan Tyre/Ban)
  namaAlat?: string;            // Nama alat otomatis
  hmKm: number;                 // HM/KM unit saat pasang
  tanggal: string;              // Tanggal pemasangan (YYYY-MM-DD)
  jenisTyre: TyreJenis;         // New / Used / Vulkanisir
  kodeTyre: string;             // Kode Tyre (ET09-xxxx)
  posisi: string;               // Posisi ban (FL, FR, RL1, RL2, RR1, RR2, Posisi 1-4, dll)
  depthThread: number;          // Depth Thread (kedalaman kembangan mm saat pasang)
  pic: string;                  // PIC (List Mekanik di Modul 2)
  picJabatan?: string;
  remark: string;               // Catatan pemasangan
  createdAt: string;
  updatedAt: string;
}

// 2. Sub Modul 2.b: Remove / Pelepasan Tyre
export interface TyreRemoveRecord {
  id: string;
  cnNew: string;                // Sesuai List di Modul 1 (hanya yang menggunakan Tyre/Ban)
  namaAlat?: string;            // Nama alat otomatis
  hmKm: number;                 // HM/KM unit saat pelepasan
  tanggal: string;              // Tanggal pelepasan (YYYY-MM-DD)
  jenisTyre: TyreJenis;         // New / Used / Vulkanisir
  kodeTyre: string;             // Kode Tyre (ET09-xxxx)
  posisi: string;               // Posisi ban saat dilepas
  depthThread: number;          // Depth Thread (kedalaman kembangan mm sisa saat dilepas)
  pic: string;                  // PIC (List Mekanik di Modul 2)
  picJabatan?: string;
  remark: string;               // Catatan pelepasan (Aus tipis, Robek, Pecah, Ganti baru, Rotasi, dll)
  statusSetelahDilepas?: 'SCRAP' | 'USED_READY' | 'SEND_VULKANISIR';
  createdAt: string;
  updatedAt: string;
}

// Pilihan Posisi Ban Baku untuk Dump Truck, Wheel Loader, dan Support Fleet
export const TYRE_POSITION_OPTIONS = [
  { value: 'FL', label: 'FL - Front Left (Depan Kiri)', category: 'FRONT' },
  { value: 'FR', label: 'FR - Front Right (Depan Kanan)', category: 'FRONT' },
  { value: 'RL1', label: 'RL1 - Rear Left Out (Belakang Kiri Luar)', category: 'REAR' },
  { value: 'RL2', label: 'RL2 - Rear Left In (Belakang Kiri Dalam)', category: 'REAR' },
  { value: 'RR1', label: 'RR1 - Rear Right Out (Belakang Kanan Luar)', category: 'REAR' },
  { value: 'RR2', label: 'RR2 - Rear Right In (Belakang Kanan Dalam)', category: 'REAR' },
  { value: 'POS-1', label: 'Posisi 1 - Depan Kiri (Wheel Loader)', category: 'LOADER' },
  { value: 'POS-2', label: 'Posisi 2 - Depan Kanan (Wheel Loader)', category: 'LOADER' },
  { value: 'POS-3', label: 'Posisi 3 - Belakang Kiri (Wheel Loader)', category: 'LOADER' },
  { value: 'POS-4', label: 'Posisi 4 - Belakang Kanan (Wheel Loader)', category: 'LOADER' },
  { value: 'SPARE', label: 'SPARE - Ban Cadangan / Serep', category: 'SPARE' },
];

export const TYRE_JENIS_OPTIONS: TyreJenis[] = ['New', 'Used', 'Vulkanisir'];

