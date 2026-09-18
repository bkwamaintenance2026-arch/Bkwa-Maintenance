import { AssetUnit, ManpowerData, ModuleInfo, UserAccount } from '../types';

export const INITIAL_MODULES: ModuleInfo[] = [
  {
    id: 1,
    code: 'MOD-01',
    title: 'Modul 1: Registrasi Asset',
    subtitle: 'Registrasi Unit & Heavy Equipment',
    description: 'Pendaftaran Unit baru (CN_NEW, NAMA ALAT, spesifikasi teknis), update status & lokasi, serta manajemen data asset.',
    status: 'AKTIF',
    badge: 'AKTIF',
  },
  {
    id: 2,
    code: 'MOD-02',
    title: 'Modul 2: Data Manpower',
    subtitle: 'Data Tenaga Kerja & Personil Workshop',
    description: 'Pencatatan NIK, Nama, Jabatan, No WA, Status Karyawan (Tetap, Kontrak, Harian Lepas, Kemitraan, Magang), Tanggal Masuk Kerja, & Keterangan.',
    status: 'AKTIF',
    badge: 'AKTIF',
  },
  {
    id: 3,
    code: 'MOD-03',
    title: 'Modul 3: Data Base Maintenance',
    subtitle: 'Input Breakdown & Monitoring Progress Unit',
    description: 'Sub Modul 1 Input Breakdown (Problem, Kerusakan, Progress, PIC, Remark) & Sub Modul 2 Dashboard Breakdown dengan No Notifikasi otomatis (260900000001) dan Update Activity.',
    status: 'AKTIF',
    badge: 'AKTIF',
  },
  {
    id: 4,
    code: 'MOD-04',
    title: 'Modul 4: Inventory Management',
    subtitle: 'FOG (Fuel, Oil & Grease) & Sparepart',
    description: 'Sub Modul 1 FOG (Input Stock & Distribution terintegrasi Asset Modul 1 dan Manpower Modul 2).',
    status: 'AKTIF',
    badge: 'AKTIF',
  },
];

export const INITIAL_ADMIN_USER: UserAccount = {
  id: 'usr-admin-01',
  username: 'adminbkwa09',
  fullName: 'Developer BKWA',
  role: 'ADMIN',
  password: 'bkwa09',
  department: 'System Developer & Maintenance Management',
  phone: '0812-3456-7890',
  status: 'AKTIF',
  accessLevel: 'BISA_MENGISI',
  createdAt: '2026-01-01T08:00:00Z',
  lastLogin: new Date().toISOString(),
};

export const INITIAL_KARYAWAN_USERS: UserAccount[] = [
  {
    id: 'usr-kary-01',
    username: 'karyawan01',
    fullName: 'Budi Santoso',
    role: 'KARYAWAN',
    password: 'user123',
    department: 'Mekanik Heavy Equipment',
    phone: '0821-4567-8901',
    status: 'AKTIF',
    accessLevel: 'BISA_MENGISI',
    modulePermissions: {
      modul1Asset: true,
      modul2Manpower: true,
      modul3Maintenance: true,
      modul4Inventory: true,
    },
    createdAt: '2026-01-15T09:30:00Z',
    lastLogin: '2026-09-12T14:20:00Z',
  },
  {
    id: 'usr-kary-02',
    username: 'karyawan02',
    fullName: 'Agus Setiawan',
    role: 'KARYAWAN',
    password: 'user123',
    department: 'Staff Pengawas Workshop',
    phone: '0857-9876-5432',
    status: 'AKTIF',
    accessLevel: 'HANYA_VIEW',
    modulePermissions: {
      modul1Asset: false,
      modul2Manpower: false,
      modul3Maintenance: false,
      modul4Inventory: false,
    },
    createdAt: '2026-02-01T10:00:00Z',
    lastLogin: '2026-09-13T16:45:00Z',
  },
];

// Data awal dikosongkan agar sistem benar-benar Clear untuk diuji coba langsung oleh pengguna
export const INITIAL_ASSET_UNITS: AssetUnit[] = [];

// Data awal manpower juga dikosongkan agar bersih
export const INITIAL_MANPOWER_LIST: ManpowerData[] = [];
