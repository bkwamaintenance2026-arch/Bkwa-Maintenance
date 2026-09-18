export type UserRole = 'ADMIN' | 'KARYAWAN';

// Otorisasi Hak Akses: Bisa Mengisi (Input & Edit) vs Hanya View (Lihat Saja)
export type UserAccessLevel = 'BISA_MENGISI' | 'HANYA_VIEW';

export interface UserModulePermissions {
  modul1Asset?: boolean;        // Hak input Modul 1: Registrasi Asset
  modul2Manpower?: boolean;     // Hak input Modul 2: Data Manpower
  modul3Maintenance?: boolean;  // Hak input Modul 3: Maintenance Database
  modul4Inventory?: boolean;    // Hak input Modul 4: Inventory Management
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  department?: string;
  phone?: string;
  status: 'AKTIF' | 'NONAKTIF';
  accessLevel?: UserAccessLevel; // 'BISA_MENGISI' (Editor) | 'HANYA_VIEW' (Viewer)
  modulePermissions?: UserModulePermissions;
  createdAt: string;
  lastLogin?: string;
}

export type OperationalStatus = 'OPERASI' | 'STANDBY' | 'BREAKDOWN' | 'MAINTENANCE';
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
  | 'KABAG WORKSHOP'
  | 'ADMINISTRASI'
  | 'MEKANIK'
  | 'HELPER MEKANIK'
  | 'OPERATOR LOADER'
  | 'OPERATOR EXCA'
  | 'SOPIR LOKASI'
  | 'PKL';

export const MANPOWER_JABATAN_OPTIONS: ManpowerJabatan[] = [
  'KABAG WORKSHOP',
  'ADMINISTRASI',
  'MEKANIK',
  'HELPER MEKANIK',
  'OPERATOR LOADER',
  'OPERATOR EXCA',
  'SOPIR LOKASI',
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
  noNotifikasi: string; // Format otomatis: 2 digit tahun, 2 digit bulan, 5 digit urut (Contoh: 260900001)
  
  // Sub Modul 1 Fields
  tanggal: string;      // Tanggal Unit mulai Breakdown
  hm?: string | number; // Hours Meter
  jenis: string;        // JENIS alat berat (dari Modul 1)
  noUnit: string;       // NO UNIT (CN_NEW terpilih dari dropdown berdasar JENIS)
  namaAlat?: string;    // NAMA ALAT
  noLama: string;       // NO LAMA (muncul otomatis saat NO UNIT dipilih)
  lokasi: string;       // Lokasi breakdown (Text bebas)
  pelapor: string;      // PELAPOR (dari DATA Manpower di Modul 2)
  jabatan: string;      // Jabatan (muncul otomatis saat pelapor dipilih)
  component: BreakdownComponentOption | string; // Pilihan component yang rusak
  detailProblem: string; // Detail Problem awal (Text bebas, read-only saat update)
  
  // Sub Modul 2 Fields (Update Breakdown terkini)
  startJob?: string;
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

// Sisa Periode Sebelumnya (Untuk menentukan kapasitas Fuel & Oli dari Data Input + Sisa Periode Sebelumnya)
export interface InventoryPeriodBalance {
  sisaPeriodeLaluFuelTangki: number; // Ltr
  sisaPeriodeLaluFuelFT: number;     // Ltr
  sisaPeriodeLaluOli: Record<string, number>; // per varian oli (Ltr)
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

