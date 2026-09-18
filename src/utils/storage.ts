import { 
  ActivityLog, 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownUpdateEntry, 
  BreakdownProgressOption,
  BreakdownStatusUnitOption,
  BreakdownPartJasaItem,
  FogStockInputRecord,
  FogFuelDistributionRecord,
  FogOilDistributionRecord,
  SupplierRecord,
  FuelStockInputRecord,
  FuelTransferRecord,
  OilStockInputRecord,
  FuelDistributionRecord,
  OilDistributionRecord,
  InventoryPeriodBalance,
  DEFAULT_FOG_NAMA_BARANG,
  ManpowerData, 
  UserAccount,
  UserAccessLevel,
  UserModulePermissions 
} from '../types';
import {
  INITIAL_ADMIN_USER,
  INITIAL_ASSET_UNITS,
  INITIAL_KARYAWAN_USERS,
  INITIAL_MANPOWER_LIST,
} from '../data/mockUnits';

const STORAGE_KEYS = {
  CURRENT_USER: 'bkwa_current_user',
  USERS: 'bkwa_users_list',
  UNITS: 'bkwa_asset_units_v2', // updated version key to guarantee clean state
  MANPOWER: 'bkwa_manpower_list_v1', // storage key for Modul 2 Manpower
  BREAKDOWN: 'bkwa_breakdown_records_v1', // storage key for Modul 3 Breakdown records
  BREAKDOWN_COUNTER: 'bkwa_breakdown_counter_v1', // persistent counter for notification numbering
  FOG_STOCK: 'bkwa_fog_stock_inputs_v1', // storage key for Modul 4 FOG Input Stock (Tangki Utama)
  FOG_DISTRIBUTION: 'bkwa_fog_distribution_v1', // storage key for Modul 4 FOG Fuel Distribution
  FOG_OIL_DISTRIBUTION: 'bkwa_fog_oil_distribution_v1', // storage key for Modul 4 FOG Oil Distribution
  FOG_CUSTOM_OIL_ITEMS: 'bkwa_fog_custom_oil_items_v1', // storage key for custom oil types
  // Modul 4 Refined 6 Sub-Modules:
  SUPPLIERS: 'bkwa_inventory_suppliers_v2',
  FUEL_STOCK: 'bkwa_inventory_fuel_stock_v2',
  FUEL_TRANSFER: 'bkwa_inventory_fuel_transfer_v2',
  OIL_STOCK: 'bkwa_inventory_oil_stock_v2',
  FUEL_DISTRIBUTION: 'bkwa_inventory_fuel_dist_v2',
  OIL_DISTRIBUTION: 'bkwa_inventory_oil_dist_v2',
  PERIOD_BALANCE: 'bkwa_inventory_period_balance_v2',
  ACTIVITY_LOGS: 'bkwa_activity_logs_v2',
  CUSTOM_LOGO: 'bkwa_company_custom_logo',
};

// --- LOGO STORAGE MANAGEMENT (Menjaga custom logo ref yang dipilih pengguna) ---
export function getCustomLogo(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO);
  } catch {
    return null;
  }
}

export function setCustomLogo(logoDataUrl: string | null): void {
  try {
    if (logoDataUrl) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, logoDataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_LOGO);
    }
    window.dispatchEvent(new Event('bkwa-logo-updated'));
  } catch (e) {
    console.error('Error saving custom logo', e);
  }
}

// --- USER SESSION MANAGEMENT ---
export function getCurrentUser(): UserAccount | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading current user', e);
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

// --- USER ACCOUNTS MANAGEMENT ---
export function getAllUsers(): UserAccount[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      const initialUsers = [INITIAL_ADMIN_USER, ...INITIAL_KARYAWAN_USERS];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    const parsed: UserAccount[] = JSON.parse(data);
    let modified = false;

    // Ensure admin user matches adminbkwa09 and always has full access
    const adminIdx = parsed.findIndex((u) => u.role === 'ADMIN');
    if (adminIdx !== -1) {
      if (parsed[adminIdx].username !== 'adminbkwa09') {
        parsed[adminIdx].username = 'adminbkwa09';
        parsed[adminIdx].password = 'bkwa09';
        parsed[adminIdx].fullName = 'Developer BKWA';
        modified = true;
      }
      if (parsed[adminIdx].accessLevel !== 'BISA_MENGISI') {
        parsed[adminIdx].accessLevel = 'BISA_MENGISI';
        modified = true;
      }
    } else {
      parsed.unshift(INITIAL_ADMIN_USER);
      modified = true;
    }

    // Ensure all users have accessLevel and modulePermissions defined
    parsed.forEach((user) => {
      if (!user.accessLevel) {
        user.accessLevel = user.role === 'ADMIN' ? 'BISA_MENGISI' : 'BISA_MENGISI';
        modified = true;
      }
      if (!user.modulePermissions) {
        const canFill = user.accessLevel === 'BISA_MENGISI';
        user.modulePermissions = {
          modul1Asset: canFill,
          modul2Manpower: canFill,
          modul3Maintenance: canFill,
          modul4Inventory: canFill,
        };
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Error reading users', e);
    return [INITIAL_ADMIN_USER, ...INITIAL_KARYAWAN_USERS];
  }
}

export function saveUsers(users: UserAccount[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// Otorisasi Helper: Mengecek apakah pengguna memiliki hak akses untuk mengisi/mengedit form
export function canUserEdit(user: UserAccount | null, moduleId?: number): boolean {
  if (!user) return false;
  // Akun Developer (ADMIN) selalu memiliki hak penuh (Full Access)
  if (user.role === 'ADMIN') return true;
  if (user.status === 'NONAKTIF') return false;

  // Level global
  const level = user.accessLevel || 'BISA_MENGISI';
  if (level === 'HANYA_VIEW') return false;

  // Level spesifik modul jika diberikan
  if (moduleId && user.modulePermissions) {
    if (moduleId === 1 && user.modulePermissions.modul1Asset === false) return false;
    if (moduleId === 2 && user.modulePermissions.modul2Manpower === false) return false;
    if (moduleId === 3 && user.modulePermissions.modul3Maintenance === false) return false;
    if (moduleId === 4 && user.modulePermissions.modul4Inventory === false) return false;
  }

  return true;
}

// Update Otorisasi Hak Akses Pengguna (Hanya dapat dipanggil oleh Developer)
export function updateUserAccessLevel(
  userId: string,
  accessLevel: UserAccessLevel,
  modulePermissions?: UserModulePermissions
): { success: boolean; message: string } {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Pengguna tidak ditemukan.' };
  }

  if (users[index].role === 'ADMIN') {
    return { success: false, message: 'Akun Developer selalu berstatus Full Access (Bisa Mengisi).' };
  }

  users[index].accessLevel = accessLevel;
  if (modulePermissions) {
    users[index].modulePermissions = modulePermissions;
  } else if (accessLevel === 'BISA_MENGISI') {
    users[index].modulePermissions = {
      modul1Asset: true,
      modul2Manpower: true,
      modul3Maintenance: true,
      modul4Inventory: true,
    };
  } else {
    users[index].modulePermissions = {
      modul1Asset: false,
      modul2Manpower: false,
      modul3Maintenance: false,
      modul4Inventory: false,
    };
  }

  saveUsers(users);

  // Jika user yang diubah sedang login, sinkronisasikan session
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser({
      ...currentUser,
      accessLevel: users[index].accessLevel,
      modulePermissions: users[index].modulePermissions,
    });
  }

  logActivity({
    aksi: 'UPDATE',
    keterangan: `Hak akses ${users[index].fullName} diatur menjadi: ${
      accessLevel === 'BISA_MENGISI' ? 'BISA MENGISI (Editor)' : 'HANYA VIEW (Viewer)'
    }`,
  });

  return {
    success: true,
    message: `Hak akses ${users[index].fullName} berhasil diubah menjadi: ${
      accessLevel === 'BISA_MENGISI' ? 'BISA MENGISI (Editor)' : 'HANYA VIEW (Viewer)'
    }`,
  };
}

export function registerKaryawanUser(newUser: Omit<UserAccount, 'id' | 'createdAt'>): {
  success: boolean;
  message: string;
  user?: UserAccount;
} {
  const users = getAllUsers();
  
  const exists = users.some(
    (u) => u.username.toLowerCase().trim() === newUser.username.toLowerCase().trim()
  );
  if (exists) {
    return { success: false, message: 'Username sudah digunakan oleh akun lain' };
  }

  const accessLevel = newUser.accessLevel || 'BISA_MENGISI';
  const defaultModulePerms = newUser.modulePermissions || {
    modul1Asset: accessLevel === 'BISA_MENGISI',
    modul2Manpower: accessLevel === 'BISA_MENGISI',
    modul3Maintenance: accessLevel === 'BISA_MENGISI',
    modul4Inventory: accessLevel === 'BISA_MENGISI',
  };

  const userRecord: UserAccount = {
    ...newUser,
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    role: 'KARYAWAN',
    accessLevel,
    modulePermissions: defaultModulePerms,
    createdAt: new Date().toISOString(),
    status: newUser.status || 'AKTIF',
  };

  users.push(userRecord);
  saveUsers(users);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Mendaftarkan user baru: ${userRecord.fullName} (@${userRecord.username}) dengan hak akses: ${
      accessLevel === 'BISA_MENGISI' ? 'Bisa Mengisi' : 'Hanya View'
    }`,
  });

  return { success: true, message: 'Akun karyawan berhasil didaftarkan!', user: userRecord };
}

export function updateUserAccount(id: string, updates: Partial<UserAccount>): boolean {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return false;

  if (users[index].role === 'ADMIN' && updates.role && updates.role !== 'ADMIN') {
    return false;
  }

  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return true;
}

export function deleteUserAccount(id: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { success: false, message: 'User tidak ditemukan' };
  if (target.role === 'ADMIN') {
    return { success: false, message: 'Akun Admin Developer tidak dapat dihapus!' };
  }

  const updated = users.filter((u) => u.id !== id);
  saveUsers(updated);
  return { success: true, message: `Akun ${target.fullName} berhasil dihapus.` };
}

// --- ASSET UNITS (MODUL 1: REGISTRASI ASSET) ---
export function getAllUnits(): AssetUnit[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.UNITS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(INITIAL_ASSET_UNITS));
      return INITIAL_ASSET_UNITS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading units', e);
    return INITIAL_ASSET_UNITS;
  }
}

export function saveUnits(units: AssetUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
}

// Modul 1: Add Unit Baru
export function registerUnit(unitData: Omit<AssetUnit, 'id' | 'tanggalRegistrasi' | 'terakhirDiperbarui'>): {
  success: boolean;
  message: string;
  unit?: AssetUnit;
} {
  const units = getAllUnits();

  // CN_NEW harus unik
  const exists = units.some(
    (u) => u.cnNew.toLowerCase().trim() === unitData.cnNew.toLowerCase().trim()
  );
  if (exists) {
    return {
      success: false,
      message: `CN_NEW "${unitData.cnNew}" sudah terdaftar dalam sistem!`,
    };
  }

  const now = new Date().toISOString().split('T')[0];
  const currentUser = getCurrentUser();

  const newUnit: AssetUnit = {
    ...unitData,
    id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    tanggalRegistrasi: now,
    terakhirDiperbarui: now,
    riwayatLog: [
      {
        id: `log-${Date.now()}`,
        tanggal: now,
        aksi: 'REGISTRASI',
        user: currentUser?.fullName || 'Sistem',
        role: currentUser?.role || 'KARYAWAN',
        keterangan: `Registrasi Asset: CN_NEW ${unitData.cnNew} - ${unitData.namaAlat}`,
        detailUnit: unitData.cnNew,
      },
    ],
  };

  units.unshift(newUnit);
  saveUnits(units);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Add Unit baru: [${newUnit.cnNew}] ${newUnit.namaAlat}`,
    detailUnit: newUnit.cnNew,
  });

  return { success: true, message: `Unit CN_NEW "${newUnit.cnNew}" berhasil ditambahkan!`, unit: newUnit };
}

// Modul 1: Update Data Unit
export function updateUnit(
  id: string,
  updates: Partial<Omit<AssetUnit, 'id' | 'tanggalRegistrasi'>>
): { success: boolean; message: string; unit?: AssetUnit } {
  const units = getAllUnits();
  const index = units.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, message: 'Data Unit tidak ditemukan!' };
  }

  // Jika CN_NEW diubah, pastikan tidak duplikat
  if (updates.cnNew) {
    const duplicate = units.some(
      (u) => u.id !== id && u.cnNew.toLowerCase().trim() === updates.cnNew?.toLowerCase().trim()
    );
    if (duplicate) {
      return {
        success: false,
        message: `CN_NEW "${updates.cnNew}" sudah digunakan oleh unit lain!`,
      };
    }
  }

  const currentUser = getCurrentUser();
  const today = new Date().toISOString().split('T')[0];
  const oldUnit = units[index];

  const updatedUnit: AssetUnit = {
    ...oldUnit,
    ...updates,
    terakhirDiperbarui: today,
  };

  const historyLog: ActivityLog = {
    id: `log-${Date.now()}`,
    tanggal: today,
    aksi: 'UPDATE',
    user: currentUser?.fullName || 'Sistem',
    role: currentUser?.role || 'ADMIN',
    keterangan: `Update data unit [${updatedUnit.cnNew}] ${updatedUnit.namaAlat}`,
    detailUnit: updatedUnit.cnNew,
  };

  updatedUnit.riwayatLog = [historyLog, ...(oldUnit.riwayatLog || [])].slice(0, 15);

  units[index] = updatedUnit;
  saveUnits(units);

  logActivity({
    aksi: 'UPDATE',
    keterangan: `Update data unit CN_NEW: ${updatedUnit.cnNew} (${updatedUnit.namaAlat})`,
    detailUnit: updatedUnit.cnNew,
  });

  return { success: true, message: `Data unit [${updatedUnit.cnNew}] berhasil diperbarui!`, unit: updatedUnit };
}

// Modul 1: Delete Unit
export function deleteUnit(
  id: string,
  actingUserRole: string
): { success: boolean; message: string } {
  const units = getAllUnits();
  const target = units.find((u) => u.id === id);
  if (!target) {
    return { success: false, message: 'Data Unit tidak ditemukan!' };
  }

  const filtered = units.filter((u) => u.id !== id);
  saveUnits(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Delete unit [${target.cnNew}] ${target.namaAlat}`,
    detailUnit: target.cnNew,
  });

  return {
    success: true,
    message: `Unit [${target.cnNew}] berhasil dihapus.`,
  };
}

// Clear all asset units (Menghapus semua data uji coba agar bersih)
export function clearAllUnits(): void {
  localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify([]));
  logActivity({
    aksi: 'HAPUS',
    keterangan: 'Pembersihan seluruh data unit asset (Clear Data)',
  });
}

// --- MODUL 2: DATA MANPOWER STORAGE MANAGEMENT ---
export function getAllManpower(): ManpowerData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MANPOWER);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.MANPOWER, JSON.stringify(INITIAL_MANPOWER_LIST));
      return INITIAL_MANPOWER_LIST;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading manpower', e);
    return INITIAL_MANPOWER_LIST;
  }
}

export function saveManpowerList(list: ManpowerData[]): void {
  localStorage.setItem(STORAGE_KEYS.MANPOWER, JSON.stringify(list));
}

export function registerManpower(data: Omit<ManpowerData, 'id' | 'createdAt' | 'updatedAt'>): {
  success: boolean;
  message: string;
  manpower?: ManpowerData;
} {
  const list = getAllManpower();
  const now = new Date().toISOString().split('T')[0];

  // Aturan: Form tidak harus semua diisi (fleksibel untuk diupdate nanti)
  const newRecord: ManpowerData = {
    ...data,
    id: `mp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now,
  };

  list.unshift(newRecord);
  saveManpowerList(list);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Add Manpower baru: ${newRecord.nama || 'Tanpa Nama'} (${newRecord.jabatan || '-'})`,
  });

  return {
    success: true,
    message: `Data manpower ${newRecord.nama ? `"${newRecord.nama}"` : ''} berhasil disimpan!`,
    manpower: newRecord,
  };
}

export function updateManpower(
  id: string,
  updates: Partial<Omit<ManpowerData, 'id' | 'createdAt'>>
): {
  success: boolean;
  message: string;
  manpower?: ManpowerData;
} {
  const list = getAllManpower();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) {
    return { success: false, message: 'Data Manpower tidak ditemukan!' };
  }

  const now = new Date().toISOString().split('T')[0];
  const updatedRecord: ManpowerData = {
    ...list[index],
    ...updates,
    updatedAt: now,
  };

  list[index] = updatedRecord;
  saveManpowerList(list);

  logActivity({
    aksi: 'UPDATE',
    keterangan: `Update Manpower: ${updatedRecord.nama || updatedRecord.nik || id}`,
  });

  return {
    success: true,
    message: `Data manpower berhasil diperbarui!`,
    manpower: updatedRecord,
  };
}

export function deleteManpower(id: string): { success: boolean; message: string } {
  const list = getAllManpower();
  const target = list.find((m) => m.id === id);
  if (!target) {
    return { success: false, message: 'Data Manpower tidak ditemukan!' };
  }

  const filtered = list.filter((m) => m.id !== id);
  saveManpowerList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Delete Manpower: ${target.nama || target.nik || id}`,
  });

  return {
    success: true,
    message: `Data manpower ${target.nama ? `[${target.nama}]` : ''} berhasil dihapus.`,
  };
}

// --- ACTIVITY LOGS ---
export function getActivityLogs(): ActivityLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function logActivity(
  log: Omit<ActivityLog, 'id' | 'tanggal' | 'user' | 'role'> & {
    user?: string;
    role?: 'ADMIN' | 'KARYAWAN';
  }
): void {
  const current = getCurrentUser();
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    tanggal: new Date().toLocaleString('id-ID'),
    aksi: log.aksi,
    user: log.user || current?.fullName || 'User BKWA',
    role: log.role || current?.role || 'KARYAWAN',
    keterangan: log.keterangan,
    detailUnit: log.detailUnit,
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs.slice(0, 50)));
}

// --- MODUL 3: DATA BASE MAINTENANCE (BREAKDOWN SYSTEM) ---

export function getAllBreakdowns(): BreakdownRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BREAKDOWN);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BREAKDOWN, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading breakdown records', e);
    return [];
  }
}

export function saveBreakdownList(records: BreakdownRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.BREAKDOWN, JSON.stringify(records));
}

/**
 * Generate No Laporan Kerusakan / No Notifikasi dengan aturan:
 * 2 digit tahun, 2 digit bulan dan 5 no urut Notifikasi (Contoh: 260900001)
 */
export function generateNextNotificationNumber(dateStr?: string): string {
  // Ambil tahun dan bulan dari tanggal input atau hari ini
  let year2Digits = '26';
  let month2Digits = '09';

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      year2Digits = parts[0].slice(-2);
      month2Digits = parts[1].padStart(2, '0');
    }
  } else {
    const now = new Date();
    year2Digits = String(now.getFullYear()).slice(-2);
    month2Digits = String(now.getMonth() + 1).padStart(2, '0');
  }

  // Ambil persistent counter
  let currentCounter = 1;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BREAKDOWN_COUNTER);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) currentCounter = num + 1;
    }
  } catch {
    currentCounter = 1;
  }

  // Pastikan tidak duplikat dengan record yang sudah ada (5 digit urut)
  const existingRecords = getAllBreakdowns();
  while (existingRecords.some(r => r.noNotifikasi.endsWith(String(currentCounter).padStart(5, '0')))) {
    currentCounter++;
  }

  localStorage.setItem(STORAGE_KEYS.BREAKDOWN_COUNTER, String(currentCounter));

  // Format 5 digit nomor urut: 00001
  const serial5Digits = String(currentCounter).padStart(5, '0');

  return `${year2Digits}${month2Digits}${serial5Digits}`;
}

export function registerBreakdown(
  data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
): {
  success: boolean;
  message: string;
  record?: BreakdownRecord;
} {
  const records = getAllBreakdowns();
  const now = new Date().toISOString();
  const today = data.tanggal || now.split('T')[0];

  const noNotifikasi = generateNextNotificationNumber(today);
  const currentUser = getCurrentUser();

  const initialUpdateEntry: BreakdownUpdateEntry = {
    id: `upd-${Date.now()}`,
    startJob: today,
    detailKerusakan: data.detailProblem || 'Laporan Awal Kerusakan',
    progress: data.progress || 'On Progress',
    statusUnit: data.statusUnit || 'BREAKDOWN',
    pic1: data.pic1 || '',
    pic2: data.pic2 || '',
    pic3: data.pic3 || '',
    partsJasa: data.partsJasa || [],
    remark: data.remark || '',
    updatedBy: currentUser?.fullName || 'Operator',
    createdAt: now,
  };

  const newRecord: BreakdownRecord = {
    ...data,
    id: `bd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    noNotifikasi,
    statusUnit: data.statusUnit || 'BREAKDOWN',
    riwayatUpdate: [initialUpdateEntry],
    createdAt: now,
    updatedAt: now,
  };

  records.unshift(newRecord);
  saveBreakdownList(records);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Input Breakdown No: ${noNotifikasi} - Unit ${newRecord.noUnit} (${newRecord.component}: ${newRecord.detailProblem})`,
    detailUnit: newRecord.noUnit,
  });

  return {
    success: true,
    message: `Data Breakdown berhasil disimpan! No Laporan Kerusakan: ${noNotifikasi}`,
    record: newRecord,
  };
}

export function updateBreakdownActivity(
  id: string,
  updateData: {
    startJob?: string;
    detailKerusakan?: string;
    progress?: BreakdownProgressOption | string;
    statusUnit?: BreakdownStatusUnitOption | string;
    pic1?: string;
    pic2?: string;
    pic3?: string;
    remark?: string;
    partsJasa?: BreakdownPartJasaItem[];
  }
): {
  success: boolean;
  message: string;
  record?: BreakdownRecord;
} {
  const records = getAllBreakdowns();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return { success: false, message: 'Data Breakdown tidak ditemukan!' };
  }

  const currentUser = getCurrentUser();
  const now = new Date().toISOString();
  const today = updateData.startJob || now.split('T')[0];

  const target = records[index];
  const newStatus = updateData.statusUnit || target.statusUnit;

  // Hitung downtime hours jika unit selesai (READY / LIMIT OPERASI)
  let downtimeHours = target.downtimeHours;
  let completedAt = target.completedAt;

  if (newStatus === 'READY' || newStatus === 'LIMIT OPERASI') {
    if (!completedAt) {
      completedAt = now;
      const startMs = new Date(target.tanggal).getTime();
      const endMs = new Date(now).getTime();
      const diffHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
      downtimeHours = diffHours;
    }
  }

  const newEntry: BreakdownUpdateEntry = {
    id: `upd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    startJob: today,
    detailKerusakan: updateData.detailKerusakan || target.detailKerusakan || target.detailProblem || '',
    progress: updateData.progress || target.progress || 'On Progress',
    statusUnit: newStatus,
    pic1: updateData.pic1 !== undefined ? updateData.pic1 : target.pic1,
    pic2: updateData.pic2 !== undefined ? updateData.pic2 : target.pic2,
    pic3: updateData.pic3 !== undefined ? updateData.pic3 : target.pic3,
    partsJasa: updateData.partsJasa || target.partsJasa || [],
    remark: updateData.remark !== undefined ? updateData.remark : target.remark,
    updatedBy: currentUser?.fullName || 'Mekanik BKWA',
    createdAt: now,
  };

  const updatedRecord: BreakdownRecord = {
    ...target,
    startJob: updateData.startJob || target.startJob,
    detailKerusakan: updateData.detailKerusakan || target.detailKerusakan,
    progress: updateData.progress || target.progress,
    statusUnit: newStatus,
    pic1: updateData.pic1 !== undefined ? updateData.pic1 : target.pic1,
    pic2: updateData.pic2 !== undefined ? updateData.pic2 : target.pic2,
    pic3: updateData.pic3 !== undefined ? updateData.pic3 : target.pic3,
    remark: updateData.remark !== undefined ? updateData.remark : target.remark,
    partsJasa: updateData.partsJasa !== undefined ? updateData.partsJasa : target.partsJasa,
    downtimeHours,
    completedAt,
    riwayatUpdate: [newEntry, ...(target.riwayatUpdate || [])],
    updatedAt: now,
  };

  records[index] = updatedRecord;
  saveBreakdownList(records);

  const isCompletedOrReady = newStatus === 'READY' || newStatus === 'LIMIT OPERASI';

  logActivity({
    aksi: 'UPDATE',
    keterangan: `Update Breakdown [${target.noNotifikasi}] Unit ${target.noUnit}: Status ${newStatus}, Progress ${updateData.progress || target.progress}`,
    detailUnit: target.noUnit,
  });

  return {
    success: true,
    message: isCompletedOrReady
      ? `Update berhasil! Unit ${target.noUnit} berstatus ${newStatus} dan kini dipindahkan dari daftar unit yang sedang breakdown.`
      : `Update data breakdown unit ${target.noUnit} (No: ${target.noNotifikasi}) berhasil disimpan!`,
    record: updatedRecord,
  };
}

export function deleteBreakdown(id: string): { success: boolean; message: string } {
  const records = getAllBreakdowns();
  const target = records.find((r) => r.id === id);
  if (!target) {
    return { success: false, message: 'Data Breakdown tidak ditemukan!' };
  }

  const filtered = records.filter((r) => r.id !== id);
  saveBreakdownList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Delete Breakdown [${target.noNotifikasi}] Unit ${target.noUnit}`,
    detailUnit: target.noUnit,
  });

  return {
    success: true,
    message: `Data Breakdown [${target.noNotifikasi}] berhasil dihapus.`,
  };
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.MANPOWER, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BREAKDOWN, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FOG_STOCK, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FOG_DISTRIBUTION, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FOG_OIL_DISTRIBUTION, JSON.stringify([]));
  localStorage.removeItem(STORAGE_KEYS.FOG_CUSTOM_OIL_ITEMS);
  localStorage.removeItem(STORAGE_KEYS.BREAKDOWN_COUNTER);
  logActivity({
    aksi: 'STATUS_CHANGE',
    keterangan: 'Clear data unit asset, manpower, breakdown, & FOG inventory',
  });
}

// ==========================================
// MODUL 4: INVENTORY MANAGEMENT - FOG STORAGE
// Sub Modul 1: FOG
//   Kategori 1: Input Stock
//   Kategori 2: Distribution
// ==========================================

export function getAllFogStockInputs(): FogStockInputRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOG_STOCK);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading FOG stock inputs', e);
    return [];
  }
}

export function saveFogStockInputList(list: FogStockInputRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.FOG_STOCK, JSON.stringify(list));
}

export function addOrUpdateFogStockInput(
  data: Omit<FogStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FogStockInputRecord } {
  const currentList = getAllFogStockInputs();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Stock FOG tidak ditemukan!' };
    }
    const updatedRecord: FogStockInputRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFogStockInputList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Penerimaan Stock FOG [Doc: ${data.dokumenNumber || '-'}] Qty: ${data.qty} ${data.satuan}`,
    });

    return {
      success: true,
      message: `Penerimaan Stock FOG berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FogStockInputRecord = {
      id: `fog-stock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFogStockInputList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Input Stock FOG [Doc: ${data.dokumenNumber || '-'}] dari ${data.lokasiDari} ke ${data.lokasiKe} Qty: ${data.qty} ${data.satuan}`,
    });

    return {
      success: true,
      message: `Data Input Stock FOG berhasil disimpan!`,
      record: newRecord,
    };
  }
}

export function deleteFogStockInput(id: string): { success: boolean; message: string } {
  const currentList = getAllFogStockInputs();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Stock FOG tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFogStockInputList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Input Stock FOG [Doc: ${target.dokumenNumber || '-'}] Qty: ${target.qty} ${target.satuan}`,
  });

  return { success: true, message: 'Data Input Stock FOG berhasil dihapus.' };
}

// 2. FOG Distribution Fuel Storage Operations
export function getAllFogDistributions(): FogFuelDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOG_DISTRIBUTION);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading FOG distributions', e);
    return [];
  }
}

export function saveFogDistributionList(list: FogFuelDistributionRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.FOG_DISTRIBUTION, JSON.stringify(list));
}

export function addOrUpdateFogDistribution(
  data: Omit<FogFuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FogFuelDistributionRecord } {
  const currentList = getAllFogDistributions();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Distribusi Fuel tidak ditemukan!' };
    }
    const updatedRecord: FogFuelDistributionRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFogDistributionList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Pengisian Fuel Unit ${data.noUnit} (Operator: ${data.namaOperator}) Qty: ${data.qty} ${data.satuan}`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Distribusi Fuel untuk Unit ${data.noUnit} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FogFuelDistributionRecord = {
      id: `fog-fuel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFogDistributionList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Distribusi Fuel ke Unit ${data.noUnit} HM: ${data.hmPengisian} Lokasi: ${data.lokasi} Driver FT: ${data.driverFt} Qty: ${data.qty} ${data.satuan}`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Data Distribusi Fuel untuk Unit ${data.noUnit} berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteFogDistribution(id: string): { success: boolean; message: string } {
  const currentList = getAllFogDistributions();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Distribusi Fuel tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFogDistributionList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Distribusi Fuel Unit ${target.noUnit} Qty: ${target.qty} ${target.satuan}`,
    detailUnit: target.noUnit,
  });

  return { success: true, message: `Data Distribusi Fuel Unit ${target.noUnit} berhasil dihapus.` };
}

// 3. FOG Distribusi Oil Storage Operations
export function getAllFogOilDistributions(): FogOilDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOG_OIL_DISTRIBUTION);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading FOG oil distributions', e);
    return [];
  }
}

export function saveFogOilDistributionList(list: FogOilDistributionRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.FOG_OIL_DISTRIBUTION, JSON.stringify(list));
}

export function addOrUpdateFogOilDistribution(
  data: Omit<FogOilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FogOilDistributionRecord } {
  const currentList = getAllFogOilDistributions();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Distribusi Oli tidak ditemukan!' };
    }
    const updatedRecord: FogOilDistributionRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFogOilDistributionList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Pengeluaran Oli ${data.jenisOli} Unit ${data.noUnit} (Petugas: ${data.petugas}) Qty: ${data.qty} ${data.satuan}`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Distribusi Oli untuk Unit ${data.noUnit} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FogOilDistributionRecord = {
      id: `fog-oil-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFogOilDistributionList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Distribusi Oli ${data.jenisOli} ke Unit ${data.noUnit} Petugas Admin: ${data.petugas} Qty: ${data.qty} ${data.satuan}`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Data Distribusi Oli untuk Unit ${data.noUnit} berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteFogOilDistribution(id: string): { success: boolean; message: string } {
  const currentList = getAllFogOilDistributions();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Distribusi Oli tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFogOilDistributionList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Distribusi Oli ${target.jenisOli} Unit ${target.noUnit} Qty: ${target.qty} ${target.satuan}`,
    detailUnit: target.noUnit,
  });

  return { success: true, message: `Data Distribusi Oli Unit ${target.noUnit} berhasil dihapus.` };
}

// 4. Custom Jenis Oli Options Management
export function getAvailableOilTypes(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FOG_CUSTOM_OIL_ITEMS);
    if (!data) return DEFAULT_FOG_NAMA_BARANG;
    const customList: string[] = JSON.parse(data);
    const combined = Array.from(new Set([...DEFAULT_FOG_NAMA_BARANG, ...customList]));
    return combined;
  } catch (e) {
    console.error('Error loading custom oil types', e);
    return DEFAULT_FOG_NAMA_BARANG;
  }
}

export function addCustomOilType(newOilName: string): { success: boolean; message: string; list: string[] } {
  const trimmed = newOilName.trim().toUpperCase();
  if (!trimmed) {
    return { success: false, message: 'Nama jenis oli tidak boleh kosong!', list: getAvailableOilTypes() };
  }
  const current = getAvailableOilTypes();
  if (current.includes(trimmed)) {
    return { success: false, message: `Jenis oli "${trimmed}" sudah terdaftar!`, list: current };
  }
  const updated = [...current, trimmed];
  localStorage.setItem(STORAGE_KEYS.FOG_CUSTOM_OIL_ITEMS, JSON.stringify(updated));
  
  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Tambah Jenis Oli / Pelumas Baru: ${trimmed}`,
  });

  return { success: true, message: `Jenis oli "${trimmed}" berhasil ditambahkan ke daftar!`, list: updated };
}

// =========================================================================
// MODUL 4: REFINED 6 SUB-MODULES INVENTORY MANAGEMENT LOGIC & STORAGE
// =========================================================================

// --- 1. DATA SUPLIER ---
export const INITIAL_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'sup-1',
    namaDistributor: 'PT Pertamina Patra Niaga',
    alamat: 'Jl. Ahmad Yani No. 100, Surabaya, Jawa Timur',
    noTelpWa: '0812-3456-7890',
    email: 'sales.surabaya@pertaminapatraniaga.co.id',
    itemName: 'BBM Solar Industri (Biosolar B35)',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sup-2',
    namaDistributor: 'PT United Tractors Pandu Engineering',
    alamat: 'Kawasan Industri Rungkut Blok B-12, Surabaya',
    noTelpWa: '0811-9876-5432',
    email: 'logistics.service@patria.co.id',
    itemName: 'Oli Hidrolik, Transmisi & Komponen Alat Berat',
    createdAt: '2026-09-01T08:30:00.000Z',
    updatedAt: '2026-09-01T08:30:00.000Z',
  },
  {
    id: 'sup-3',
    namaDistributor: 'PT Pertamina Lubricants',
    alamat: 'Jl. Kramat Raya No. 59, Jakarta Pusat',
    noTelpWa: '0812-8899-0011',
    email: 'cs@pertaminalubricants.com',
    itemName: 'Turalik 52, Rored HDA SAE 90, Meditran SX 15W-40, ATF',
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
  },
  {
    id: 'sup-4',
    namaDistributor: 'PT Shell Lubricants Indonesia',
    alamat: 'Gedung Bursa Efek Tower 1, Lt. 22, Jakarta',
    noTelpWa: '0813-2233-4455',
    email: 'orders.indonesia@shell.com',
    itemName: 'Shell Tellus S2 M 68, Rimula R4X 15W-40, Spirax',
    createdAt: '2026-09-02T09:30:00.000Z',
    updatedAt: '2026-09-02T09:30:00.000Z',
  },
];

export function getAllSuppliers(): SupplierRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
      return INITIAL_SUPPLIERS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading suppliers', e);
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliersList(list: SupplierRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving suppliers', e);
  }
}

export function addOrUpdateSupplier(
  data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: SupplierRecord } {
  const currentList = getAllSuppliers();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Suplier tidak ditemukan!' };
    }
    const updatedRecord: SupplierRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveSuppliersList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Data Suplier: ${data.namaDistributor}`,
    });

    return {
      success: true,
      message: `Data Suplier ${data.namaDistributor} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: SupplierRecord = {
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveSuppliersList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Tambah Suplier Baru: ${data.namaDistributor} (${data.itemName})`,
    });

    return {
      success: true,
      message: `Data Suplier ${data.namaDistributor} berhasil ditambahkan!`,
      record: newRecord,
    };
  }
}

export function deleteSupplier(id: string): { success: boolean; message: string } {
  const currentList = getAllSuppliers();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Suplier tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveSuppliersList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Suplier: ${target.namaDistributor}`,
  });

  return { success: true, message: `Data Suplier ${target.namaDistributor} berhasil dihapus.` };
}


// --- INITIAL PERIOD BALANCE ---
export const INITIAL_PERIOD_BALANCE: InventoryPeriodBalance = {
  sisaPeriodeLaluFuelTangki: 8500, // Ltr di Tangki Utama
  sisaPeriodeLaluFuelFT: 1500,     // Ltr di Fuel Truck (FT)
  sisaPeriodeLaluOli: {
    'TURALIK 52 PERTAMINA': 400,
    'RORED HDA SAE 90': 250,
    'SAE 15W 40': 350,
    'ATF': 120,
  },
};

export function getInventoryPeriodBalance(): InventoryPeriodBalance {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PERIOD_BALANCE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PERIOD_BALANCE, JSON.stringify(INITIAL_PERIOD_BALANCE));
      return INITIAL_PERIOD_BALANCE;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading inventory period balance', e);
    return INITIAL_PERIOD_BALANCE;
  }
}

export function updateInventoryPeriodBalance(
  balance: InventoryPeriodBalance
): { success: boolean; message: string; balance: InventoryPeriodBalance } {
  try {
    localStorage.setItem(STORAGE_KEYS.PERIOD_BALANCE, JSON.stringify(balance));
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Sisa Periode Lalu: Tangki Utama ${balance.sisaPeriodeLaluFuelTangki}L, FT ${balance.sisaPeriodeLaluFuelFT}L`,
    });
    return { success: true, message: 'Sisa stok periode sebelumnya berhasil diperbarui!', balance };
  } catch (e) {
    return { success: false, message: 'Gagal memperbarui sisa stok periode sebelumnya.', balance };
  }
}

export const saveInventoryPeriodBalance = updateInventoryPeriodBalance;


// --- 2. INPUT STOCK (FUEL) ---
export const INITIAL_FUEL_STOCK_INPUTS: FuelStockInputRecord[] = [
  {
    id: 'fsi-1',
    distributor: 'PT Pertamina Patra Niaga',
    snReffNo: 'SJ-PTM-2026/09/014',
    platNomor: 'L 9821 UA',
    driverName: 'Bambang Sudibyo',
    qtySupplier: 8000,
    flowmeterStart: 124000,
    flowmeterEnd: 131980,
    actualQtyFlowmeter: 7980,
    hasilUkurStickSebelum: 45,
    hasilUkurStickSesudah: 185,
    picFogName: 'Danang Prasetyo',
    picFogJabatan: 'Staff Logistik / Admin',
    tanggal: '2026-09-12',
    jam: '09:30',
    remark: 'Penerimaan Solar B35 aman, segel utuh',
    createdAt: '2026-09-12T09:30:00.000Z',
    updatedAt: '2026-09-12T09:30:00.000Z',
  },
  {
    id: 'fsi-2',
    distributor: 'PT Pertamina Patra Niaga',
    snReffNo: 'SJ-PTM-2026/09/028',
    platNomor: 'W 8192 UZ',
    driverName: 'Heri Kurniawan',
    qtySupplier: 5000,
    flowmeterStart: 131980,
    flowmeterEnd: 136975,
    actualQtyFlowmeter: 4995,
    hasilUkurStickSebelum: 110,
    hasilUkurStickSesudah: 198,
    picFogName: 'Danang Prasetyo',
    picFogJabatan: 'Staff Logistik / Admin',
    tanggal: '2026-09-15',
    jam: '14:15',
    remark: 'Kondisi BBM jernih, density normal 0.840',
    createdAt: '2026-09-15T14:15:00.000Z',
    updatedAt: '2026-09-15T14:15:00.000Z',
  },
];

export function getAllFuelStockInputs(): FuelStockInputRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_STOCK);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_STOCK, JSON.stringify(INITIAL_FUEL_STOCK_INPUTS));
      return INITIAL_FUEL_STOCK_INPUTS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading fuel stock inputs', e);
    return INITIAL_FUEL_STOCK_INPUTS;
  }
}

export function saveFuelStockInputsList(list: FuelStockInputRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FUEL_STOCK, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving fuel stock inputs', e);
  }
}

export function addOrUpdateFuelStockInput(
  data: Omit<FuelStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FuelStockInputRecord } {
  const currentList = getAllFuelStockInputs();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Input Stock Fuel tidak ditemukan!' };
    }
    const updatedRecord: FuelStockInputRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFuelStockInputsList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Input Stock Fuel (${data.distributor}) Qty Suplier: ${data.qtySupplier} Ltr, Actual: ${data.actualQtyFlowmeter} Ltr`,
    });

    return {
      success: true,
      message: `Data Input Stock Fuel (${data.snReffNo}) berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FuelStockInputRecord = {
      id: `fsi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFuelStockInputsList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Input Stock Fuel Baru: Distributor ${data.distributor}, Reff ${data.snReffNo}, Qty Suplier ${data.qtySupplier} Ltr, Flowmeter ${data.actualQtyFlowmeter} Ltr`,
    });

    return {
      success: true,
      message: `Penerimaan Stock Fuel dari ${data.distributor} (${data.actualQtyFlowmeter} Ltr) berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteFuelStockInput(id: string): { success: boolean; message: string } {
  const currentList = getAllFuelStockInputs();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Input Stock Fuel tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFuelStockInputsList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Input Stock Fuel: ${target.distributor} Reff ${target.snReffNo}`,
  });

  return { success: true, message: `Data Input Stock Fuel ${target.snReffNo} berhasil dihapus.` };
}

// Top 5 Last Transaksi Input Stock (Tanggal, Nama Distributor, Flowmeter Start-End, Qty(Suplier), Actual Qty Flowmeter)
export function getTop5FuelStockInputs(): FuelStockInputRecord[] {
  const all = getAllFuelStockInputs();
  // Sort descending by tanggal & jam
  const sorted = [...all].sort((a, b) => {
    const timeA = new Date(`${a.tanggal}T${a.jam || '00:00'}`).getTime();
    const timeB = new Date(`${b.tanggal}T${b.jam || '00:00'}`).getTime();
    return timeB - timeA;
  });
  return sorted.slice(0, 5);
}


// --- 3. DATA TRANSFER FUEL (TANGKI-FT) ---
export const INITIAL_FUEL_TRANSFERS: FuelTransferRecord[] = [
  {
    id: 'ftr-1',
    tanggal: '2026-09-14',
    jam: '07:30',
    namaDriverFt: 'Agus Setiawan',
    driverFtJabatan: 'Driver DT & Dump Truck',
    picFog: 'Danang Prasetyo',
    picFogJabatan: 'Staff Logistik / Admin',
    flowmeterStart: 25400,
    flowmeterStop: 28400,
    qty: 3000,
    remark: 'Transfer dari Tangki Utama ke Fuel Truck FT-01 untuk suplai pit tambang',
    createdAt: '2026-09-14T07:30:00.000Z',
    updatedAt: '2026-09-14T07:30:00.000Z',
  },
  {
    id: 'ftr-2',
    tanggal: '2026-09-16',
    jam: '13:00',
    namaDriverFt: 'Agus Setiawan',
    driverFtJabatan: 'Driver DT & Dump Truck',
    picFog: 'Danang Prasetyo',
    picFogJabatan: 'Staff Logistik / Admin',
    flowmeterStart: 28400,
    flowmeterStop: 30400,
    qty: 2000,
    remark: 'Top-up FT-01 persiapan shift sore quarry',
    createdAt: '2026-09-16T13:00:00.000Z',
    updatedAt: '2026-09-16T13:00:00.000Z',
  },
];

export function getAllFuelTransfers(): FuelTransferRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_TRANSFER);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_TRANSFER, JSON.stringify(INITIAL_FUEL_TRANSFERS));
      return INITIAL_FUEL_TRANSFERS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading fuel transfers', e);
    return INITIAL_FUEL_TRANSFERS;
  }
}

export function saveFuelTransfersList(list: FuelTransferRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FUEL_TRANSFER, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving fuel transfers', e);
  }
}

export function addOrUpdateFuelTransfer(
  data: Omit<FuelTransferRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FuelTransferRecord } {
  const currentList = getAllFuelTransfers();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Transfer Fuel tidak ditemukan!' };
    }
    const updatedRecord: FuelTransferRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFuelTransfersList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Transfer Fuel Tangki-FT: Driver ${data.namaDriverFt}, Qty: ${data.qty} Ltr`,
    });

    return {
      success: true,
      message: `Data Transfer Fuel ke ${data.namaDriverFt} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FuelTransferRecord = {
      id: `ftr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFuelTransfersList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Transfer Fuel Tangki Utama ke FT: Driver ${data.namaDriverFt}, Qty ${data.qty} Ltr (Flowmeter: ${data.flowmeterStart} -> ${data.flowmeterStop})`,
    });

    return {
      success: true,
      message: `Transfer Fuel ${data.qty} Ltr ke Fuel Truck berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteFuelTransfer(id: string): { success: boolean; message: string } {
  const currentList = getAllFuelTransfers();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Transfer Fuel tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFuelTransfersList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Transfer Fuel Tangki-FT Driver: ${target.namaDriverFt} Qty: ${target.qty} Ltr`,
  });

  return { success: true, message: `Data Transfer Fuel berhasil dihapus.` };
}


// --- 4. INPUT STOCK OLI ---
export const INITIAL_OIL_STOCK_INPUTS: OilStockInputRecord[] = [
  {
    id: 'osi-1',
    distributor: 'PT Pertamina Lubricants',
    tanggal: '2026-09-10',
    jam: '10:00',
    namaOli: 'TURALIK 52 PERTAMINA',
    qty: 600,
    satuan: 'Ltr',
    picGudangMaterial: 'Danang Prasetyo',
    picGudangJabatan: 'Staff Logistik / Admin',
    remark: 'Penerimaan 3 Drum @200L, kondisi drum segel utuh',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'osi-2',
    distributor: 'PT United Tractors Pandu Engineering',
    tanggal: '2026-09-12',
    jam: '11:30',
    namaOli: 'SAE 15W 40',
    qty: 400,
    satuan: 'Ltr',
    picGudangMaterial: 'Danang Prasetyo',
    picGudangJabatan: 'Staff Logistik / Admin',
    remark: 'Oli mesin diesel alat berat, 2 Drum',
    createdAt: '2026-09-12T11:30:00.000Z',
    updatedAt: '2026-09-12T11:30:00.000Z',
  },
  {
    id: 'osi-3',
    distributor: 'PT Pertamina Lubricants',
    tanggal: '2026-09-14',
    jam: '14:00',
    namaOli: 'RORED HDA SAE 90',
    qty: 200,
    satuan: 'Ltr',
    picGudangMaterial: 'Danang Prasetyo',
    picGudangJabatan: 'Staff Logistik / Admin',
    remark: 'Oli gardan / gear oil, 1 Drum',
    createdAt: '2026-09-14T14:00:00.000Z',
    updatedAt: '2026-09-14T14:00:00.000Z',
  },
];

export function getAllOilStockInputs(): OilStockInputRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OIL_STOCK);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.OIL_STOCK, JSON.stringify(INITIAL_OIL_STOCK_INPUTS));
      return INITIAL_OIL_STOCK_INPUTS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading oil stock inputs', e);
    return INITIAL_OIL_STOCK_INPUTS;
  }
}

export function saveOilStockInputsList(list: OilStockInputRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OIL_STOCK, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving oil stock inputs', e);
  }
}

export function addOrUpdateOilStockInput(
  data: Omit<OilStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: OilStockInputRecord } {
  const currentList = getAllOilStockInputs();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Input Stock Oli tidak ditemukan!' };
    }
    const updatedRecord: OilStockInputRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveOilStockInputsList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Input Stock Oli: ${data.namaOli} Qty: ${data.qty} (${data.distributor})`,
    });

    return {
      success: true,
      message: `Data Input Stock Oli ${data.namaOli} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: OilStockInputRecord = {
      id: `osi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveOilStockInputsList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Input Stock Oli Baru: ${data.namaOli}, Suplier: ${data.distributor}, Qty: ${data.qty} ${data.satuan || 'Ltr'}, PIC: ${data.picGudangMaterial}`,
    });

    return {
      success: true,
      message: `Penerimaan Oli ${data.namaOli} (${data.qty} ${data.satuan || 'Ltr'}) berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteOilStockInput(id: string): { success: boolean; message: string } {
  const currentList = getAllOilStockInputs();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Input Stock Oli tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveOilStockInputsList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Input Stock Oli: ${target.namaOli} Qty ${target.qty}`,
  });

  return { success: true, message: `Data Input Stock Oli ${target.namaOli} berhasil dihapus.` };
}


// --- 5. DISTRIBUTION FUEL ---
export const INITIAL_FUEL_DISTRIBUTIONS: FuelDistributionRecord[] = [
  {
    id: 'fdist-1',
    noBon: 'BON-F-260901',
    cnAlat: 'EX-01',
    namaAlat: 'Excavator Kobelco SK330',
    operatorName: 'Slamet Raharjo',
    operatorJabatan: 'Operator Excavator',
    hm: 4820,
    tanggal: '2026-09-16',
    jam: '08:15',
    flowmeterStart: 18500,
    flowmeterStop: 18850,
    qty: 350,
    remark: 'Pengisian rutin awal shift pagi di Pit Tambang Batu',
    createdAt: '2026-09-16T08:15:00.000Z',
    updatedAt: '2026-09-16T08:15:00.000Z',
  },
  {
    id: 'fdist-2',
    noBon: 'BON-F-260902',
    cnAlat: 'WL-01',
    namaAlat: 'Wheel Loader Komatsu WA380',
    operatorName: 'Sugiono',
    operatorJabatan: 'Operator Wheel Loader',
    hm: 3650,
    tanggal: '2026-09-16',
    jam: '10:45',
    flowmeterStart: 18850,
    flowmeterStop: 19100,
    qty: 250,
    remark: 'Suplai Solar area Crusher Pabrik',
    createdAt: '2026-09-16T10:45:00.000Z',
    updatedAt: '2026-09-16T10:45:00.000Z',
  },
  {
    id: 'fdist-3',
    noBon: 'BON-F-260903',
    cnAlat: 'DT-01',
    namaAlat: 'Dump Truck Hino FM260JD',
    operatorName: 'Agus Setiawan',
    operatorJabatan: 'Driver DT & Dump Truck',
    hm: 5210,
    tanggal: '2026-09-17',
    jam: '07:30',
    flowmeterStart: 19100,
    flowmeterStop: 19300,
    qty: 200,
    remark: 'Pengisian solar hauling quarry ke crusher',
    createdAt: '2026-09-17T07:30:00.000Z',
    updatedAt: '2026-09-17T07:30:00.000Z',
  },
];

export function getAllFuelDistributions(): FuelDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_DISTRIBUTION);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_DISTRIBUTION, JSON.stringify(INITIAL_FUEL_DISTRIBUTIONS));
      return INITIAL_FUEL_DISTRIBUTIONS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading fuel distributions', e);
    return INITIAL_FUEL_DISTRIBUTIONS;
  }
}

export function saveFuelDistributionsList(list: FuelDistributionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FUEL_DISTRIBUTION, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving fuel distributions', e);
  }
}

export function addOrUpdateFuelDistribution(
  data: Omit<FuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FuelDistributionRecord } {
  const currentList = getAllFuelDistributions();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Distribusi Fuel tidak ditemukan!' };
    }
    const updatedRecord: FuelDistributionRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveFuelDistributionsList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Distribusi Fuel: Bon ${data.noBon} Unit ${data.cnAlat} Qty: ${data.qty} Ltr`,
      detailUnit: data.cnAlat,
    });

    return {
      success: true,
      message: `Data Distribusi Fuel Bon ${data.noBon} untuk ${data.cnAlat} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: FuelDistributionRecord = {
      id: `fdist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveFuelDistributionsList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Distribusi Fuel Baru: Bon ${data.noBon}, Unit ${data.cnAlat} (${data.namaAlat}), Operator ${data.operatorName}, HM ${data.hm}, Qty ${data.qty} Ltr`,
      detailUnit: data.cnAlat,
    });

    return {
      success: true,
      message: `Distribusi Fuel ${data.qty} Ltr ke unit ${data.cnAlat} berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteFuelDistribution(id: string): { success: boolean; message: string } {
  const currentList = getAllFuelDistributions();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Distribusi Fuel tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveFuelDistributionsList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Distribusi Fuel Bon ${target.noBon} Unit ${target.cnAlat} Qty ${target.qty} Ltr`,
    detailUnit: target.cnAlat,
  });

  return { success: true, message: `Data Distribusi Fuel Bon ${target.noBon} berhasil dihapus.` };
}


// --- 6. DISTRIBUTION OLI ---
export const INITIAL_OIL_DISTRIBUTIONS: OilDistributionRecord[] = [
  {
    id: 'odist-1',
    noUnit: 'EX-01',
    namaAlat: 'Excavator Kobelco SK330',
    hmUnit: 4820,
    jenisOli: 'TURALIK 52 PERTAMINA',
    qty: 40,
    satuan: 'Ltr',
    rincianKerusakan: 'Bocor pada seal hose boom cylinder hidrolik',
    picMekanik: 'Supriyanto',
    picMekanikJabatan: 'Mekanik Heavy Equipment',
    picGudangMaterial: 'Danang Prasetyo',
    picGudangJabatan: 'Staff Logistik / Admin',
    tanggal: '2026-09-15',
    jam: '11:00',
    remark: 'Penggantian oli hidrolik setelah ganti hose',
    createdAt: '2026-09-15T11:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
  },
  {
    id: 'odist-2',
    noUnit: 'DT-01',
    namaAlat: 'Dump Truck Hino FM260JD',
    hmUnit: 5210,
    jenisOli: 'SAE 15W 40',
    qty: 28,
    satuan: 'Ltr',
    rincianKerusakan: 'Service periodik berkala ganti oli mesin 250 jam',
    picMekanik: 'Rudi Hartono',
    picMekanikJabatan: 'Mekanik Heavy Equipment',
    picGudangMaterial: 'Danang Prasetyo',
    picGudangJabatan: 'Staff Logistik / Admin',
    tanggal: '2026-09-16',
    jam: '15:30',
    remark: 'Sudah termasuk penggantian filter oli engine',
    createdAt: '2026-09-16T15:30:00.000Z',
    updatedAt: '2026-09-16T15:30:00.000Z',
  },
];

export function getAllOilDistributions(): OilDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OIL_DISTRIBUTION);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.OIL_DISTRIBUTION, JSON.stringify(INITIAL_OIL_DISTRIBUTIONS));
      return INITIAL_OIL_DISTRIBUTIONS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading oil distributions', e);
    return INITIAL_OIL_DISTRIBUTIONS;
  }
}

export function saveOilDistributionsList(list: OilDistributionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OIL_DISTRIBUTION, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving oil distributions', e);
  }
}

export function addOrUpdateOilDistribution(
  data: Omit<OilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: OilDistributionRecord } {
  const currentList = getAllOilDistributions();
  const now = new Date().toISOString();

  if (idToEdit) {
    const index = currentList.findIndex((item) => item.id === idToEdit);
    if (index === -1) {
      return { success: false, message: 'Data Distribusi Oli tidak ditemukan!' };
    }
    const updatedRecord: OilDistributionRecord = {
      ...currentList[index],
      ...data,
      updatedAt: now,
    };
    currentList[index] = updatedRecord;
    saveOilDistributionsList(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Distribusi Oli ${data.jenisOli} Unit ${data.noUnit} Qty: ${data.qty} Ltr`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Distribusi Oli ${data.jenisOli} untuk Unit ${data.noUnit} berhasil diperbarui!`,
      record: updatedRecord,
    };
  } else {
    const newRecord: OilDistributionRecord = {
      id: `odist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveOilDistributionsList(currentList);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Distribusi Oli: Unit ${data.noUnit} (${data.namaAlat || ''}), Jenis: ${data.jenisOli}, Qty: ${data.qty} Ltr, HM: ${data.hmUnit}, Mekanik: ${data.picMekanik}, Gudang: ${data.picGudangMaterial}`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Distribusi Oli ${data.jenisOli} (${data.qty} Ltr) ke Unit ${data.noUnit} berhasil dicatat!`,
      record: newRecord,
    };
  }
}

export function deleteOilDistribution(id: string): { success: boolean; message: string } {
  const currentList = getAllOilDistributions();
  const target = currentList.find((i) => i.id === id);
  if (!target) {
    return { success: false, message: 'Data Distribusi Oli tidak ditemukan!' };
  }
  const filtered = currentList.filter((i) => i.id !== id);
  saveOilDistributionsList(filtered);

  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Distribusi Oli ${target.jenisOli} Unit ${target.noUnit} Qty ${target.qty} Ltr`,
    detailUnit: target.noUnit,
  });

  return { success: true, message: `Data Distribusi Oli Unit ${target.noUnit} berhasil dihapus.` };
}


// --- 7. KALKULASI KAPASITAS & STOCK REAL-TIME (DATA INPUT + SISA PERIODE SEBELUMNYA) ---
export interface InventoryStockComputation {
  // Tangki Utama (Fuel)
  tangkiUtama: {
    sisaPeriodeLalu: number;
    totalMasuk: number;
    totalKeluarKeFT: number;
    stokAkhir: number;
    kapasitasMaksimal: number;
    persentase: number;
  };
  // Fuel Truck (FT)
  fuelTruck: {
    sisaPeriodeLalu: number;
    totalTransferMasuk: number;
    totalDistribusiUnit: number;
    stokAkhir: number;
    kapasitasMaksimal: number;
    persentase: number;
  };
  // Oli per jenis
  oliPerJenis: Record<string, {
    sisaPeriodeLalu: number;
    totalMasuk: number;
    totalKeluar: number;
    stokAkhir: number;
    satuan: string;
    persentase: number;
  }>;
  totalOliLiters: number;
}

export function calculateInventoryStockLevels(
  periodBalance: InventoryPeriodBalance,
  fuelStockInputs: FuelStockInputRecord[],
  fuelTransfers: FuelTransferRecord[],
  oilStockInputs: OilStockInputRecord[],
  fuelDistributions: FuelDistributionRecord[],
  oilDistributions: OilDistributionRecord[],
  availableOilTypes: string[]
): InventoryStockComputation {
  const KAPASITAS_TANGKI_UTAMA = 20000; // Standar tangki timbun solar 20.000 Liter
  const KAPASITAS_FUEL_TRUCK = 5000;   // Standar armada FT-01 5.000 Liter

  // 1. Tangki Utama
  // Total Masuk = Sum of Actual Qty Flowmeter from Input Stock (Fuel)
  const totalMasukFuel = fuelStockInputs.reduce((sum, item) => sum + (Number(item.actualQtyFlowmeter) || Number(item.qtySupplier) || 0), 0);
  // Total Keluar ke FT = Sum of Qty in Data Transfer Fuel (Tangki-FT)
  const totalKeluarKeFT = fuelTransfers.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const sisaTangkiLalu = Number(periodBalance.sisaPeriodeLaluFuelTangki) || 0;
  const stokAkhirTangki = Math.max(0, sisaTangkiLalu + totalMasukFuel - totalKeluarKeFT);
  const pctTangki = Math.min(100, Math.round((stokAkhirTangki / KAPASITAS_TANGKI_UTAMA) * 100));

  // 2. Fuel Truck (FT)
  // Masuk ke FT = Sum of Qty in Data Transfer Fuel (Tangki-FT)
  const sisaFTLalu = Number(periodBalance.sisaPeriodeLaluFuelFT) || 0;
  // Total Distribusi ke Unit = Sum of Qty in Distribution Fuel
  const totalDistribusiFuelUnit = fuelDistributions.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const stokAkhirFT = Math.max(0, sisaFTLalu + totalKeluarKeFT - totalDistribusiFuelUnit);
  const pctFT = Math.min(100, Math.round((stokAkhirFT / KAPASITAS_FUEL_TRUCK) * 100));

  // 3. Oli per Jenis
  const allOilTypes = Array.from(new Set([...availableOilTypes, ...DEFAULT_FOG_NAMA_BARANG]));
  const oliPerJenis: InventoryStockComputation['oliPerJenis'] = {};

  allOilTypes.forEach((oilName) => {
    const sisaLalu = Number(periodBalance.sisaPeriodeLaluOli?.[oilName]) || 0;
    const totalMasuk = oilStockInputs
      .filter((item) => item.namaOli.trim().toUpperCase() === oilName.trim().toUpperCase())
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const totalKeluar = oilDistributions
      .filter((item) => item.jenisOli.trim().toUpperCase() === oilName.trim().toUpperCase())
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const stokAkhir = Math.max(0, sisaLalu + totalMasuk - totalKeluar);
    const basisTarget = Math.max(1000, sisaLalu + totalMasuk);
    const persentase = Math.min(100, Math.round((stokAkhir / basisTarget) * 100));

    oliPerJenis[oilName] = {
      sisaPeriodeLalu: sisaLalu,
      totalMasuk,
      totalKeluar,
      stokAkhir,
      satuan: 'Ltr',
      persentase,
    };
  });

  const totalOliLiters = Object.values(oliPerJenis).reduce((acc, curr) => acc + curr.stokAkhir, 0);

  return {
    tangkiUtama: {
      sisaPeriodeLalu: sisaTangkiLalu,
      totalMasuk: totalMasukFuel,
      totalKeluarKeFT,
      stokAkhir: stokAkhirTangki,
      kapasitasMaksimal: KAPASITAS_TANGKI_UTAMA,
      persentase: pctTangki,
    },
    fuelTruck: {
      sisaPeriodeLalu: sisaFTLalu,
      totalTransferMasuk: totalKeluarKeFT,
      totalDistribusiUnit: totalDistribusiFuelUnit,
      stokAkhir: stokAkhirFT,
      kapasitasMaksimal: KAPASITAS_FUEL_TRUCK,
      persentase: pctFT,
    },
    oliPerJenis,
    totalOliLiters,
  };
}



