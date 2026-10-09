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
  UserModulePermissions,
  AccountTier,
  P2HRecord,
  P2HCheckItem,
  P2HKelayakanStatus,
  FleetSettingRecord,
  SparePartItem,
  SparePartTransaction,
  SparePartTransactionItem,
  PurchaseRequest,
  PurchaseRequestItem,
  TyreRegistration,
  TyreInstallRecord,
  TyreRemoveRecord,
  TyreStatus,
  TyreJenis,
  OutFieldFuelRecord,
  OutFieldFuelJobType,
  GranularUserPermissions,
  ModulePermissionSet,
  GreaseStockRecord,
  GreaseDistributionRecord
} from '../types';
import {
  INITIAL_ADMIN_USER,
  INITIAL_ASSET_UNITS,
  INITIAL_KARYAWAN_USERS,
  INITIAL_MANPOWER_LIST,
} from '../data/mockUnits';
import { syncItemToFirestore, deleteItemFromFirestore } from '../services/firestoreSync';

const STORAGE_KEYS = {
  CURRENT_USER: 'bkwa_current_user',
  USERS: 'bkwa_users_list_v4', // updated to ensure clean migration to Admin BKWA and Manpower logins
  UNITS: 'bkwa_asset_units_v2', // updated version key to guarantee clean state
  MANPOWER: 'bkwa_manpower_list_v1', // storage key for Modul 2 Manpower
  BREAKDOWN: 'bkwa_breakdown_records_v1', // storage key for Modul 3 Breakdown records
  BREAKDOWN_COUNTER: 'bkwa_breakdown_counter_v1', // persistent counter for notification numbering
  FOG_STOCK: 'bkwa_fog_stock_inputs_v1', // storage key for Modul 4 FOG Input Stock (Tangki Utama)
  FOG_DISTRIBUTION: 'bkwa_fog_distribution_v1', // storage key for Modul 4 FOG Fuel Distribution
  FOG_OIL_DISTRIBUTION: 'bkwa_fog_oil_distribution_v1', // storage key for Modul 4 FOG Oil Distribution
  FOG_CUSTOM_OIL_ITEMS: 'bkwa_fog_custom_oil_items_v1', // storage key for custom oil types
  // Modul 4 Refined Sub-Modules & Out Field Fuel:
  SUPPLIERS: 'bkwa_inventory_suppliers_v2',
  FUEL_STOCK: 'bkwa_inventory_fuel_stock_v2',
  FUEL_TRANSFER: 'bkwa_inventory_fuel_transfer_v2',
  OIL_STOCK: 'bkwa_inventory_oil_stock_v2',
  FUEL_DISTRIBUTION: 'bkwa_inventory_fuel_dist_v2',
  OIL_DISTRIBUTION: 'bkwa_inventory_oil_dist_v2',
  GREASE_STOCKS: 'bkwa_inventory_grease_stocks_v1',
  GREASE_DISTRIBUTIONS: 'bkwa_inventory_grease_dist_v1',
  OUT_FIELD_FUEL: 'bkwa_inventory_out_field_fuel_v1',
  STANDARD_SOLAR_PRICE: 'bkwa_standard_solar_price_v1',
  PERIOD_BALANCE: 'bkwa_inventory_period_balance_v2',
  KAPASITAS_TANGKI_UTAMA: 'bkwa_kapasitas_tangki_utama_v1', // storage key kapasitas tangki timbun solar utama
  KAPASITAS_FUEL_TRUCK: 'bkwa_kapasitas_fuel_truck_v1', // storage key kapasitas armada fuel truck
  // Modul 5 Divisi Operation (P2H & Setting Fleet)
  P2H_RECORDS: 'bkwa_p2h_records_v1',
  P2H_COUNTER: 'bkwa_p2h_counter_v1',
  FLEET_SETTINGS: 'bkwa_fleet_settings_v1',
  // Modul 6 Inventory Management (Spare Part & Transaksi)
  SPARE_PARTS: 'bkwa_spare_parts_v1',
  SPARE_PART_TRANSACTIONS: 'bkwa_sp_transactions_v1',
  PURCHASE_REQUESTS: 'bkwa_purchase_requests_v1',
  PURCHASE_REQUEST_COUNTER: 'bkwa_pr_counter_v1',
  // Modul 7 Tyre Management System
  TYRE_REGISTRATIONS: 'bkwa_tyre_registrations_v1',
  TYRE_INSTALLS: 'bkwa_tyre_installs_v1',
  TYRE_REMOVES: 'bkwa_tyre_removes_v1',
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
    let parsed: UserAccount[] = [];
    let modified = false;

    if (!data) {
      parsed = [INITIAL_ADMIN_USER, ...INITIAL_KARYAWAN_USERS];
      modified = true;
    } else {
      parsed = JSON.parse(data);
    }

    // Pastikan akun Developer selalu ada dengan username Admin BKWA, password Etika09, tier DEVELOPER
    const devIdx = parsed.findIndex(
      (u) =>
        u.accountTier === 'DEVELOPER' ||
        (u.username && u.username.toLowerCase().includes('admin'))
    );
    if (devIdx !== -1) {
      parsed[devIdx].accountTier = 'DEVELOPER';
      parsed[devIdx].username = 'Admin BKWA';
      parsed[devIdx].password = 'Etika09';
      parsed[devIdx].fullName = 'Developer BKWA';
      parsed[devIdx].role = 'ADMIN';
      parsed[devIdx].status = 'AKTIF';
      parsed[devIdx].accessLevel = 'BISA_MENGISI';
      parsed[devIdx].permissions = {
        modul1: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul2: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul3: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul4: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul5: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul6: { viewer: true, input: true, edit: true, delete: true, export: true },
        modul7: { viewer: true, input: true, edit: true, delete: true, export: true },
      };
      modified = true;
    } else {
      parsed.unshift(INITIAL_ADMIN_USER);
      modified = true;
    }

    // Sinkronisasi akun karyawan yang memiliki No HP di Modul 2 Manpower
    // Sesuai aturan: Karyawan tanpa No HP tidak memiliki akses ke sistem
    try {
      const mpData = localStorage.getItem(STORAGE_KEYS.MANPOWER);
      if (mpData) {
        const mpList: ManpowerData[] = JSON.parse(mpData);
        mpList.forEach((mp) => {
          const rawWa = (mp.noWa || '').trim();
          const cleanWa = rawWa.replace(/[^0-9]/g, '');

          // JIKA TIDAK MEMILIKI NO HP: Karyawan tidak memiliki akses login
          if (!cleanWa) {
            return;
          }

          const loginUsername = cleanWa;
          const cleanNik = (mp.nik || '').trim();
          const existingIdx = parsed.findIndex(
            (u) =>
              u.manpowerId === mp.id ||
              (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanWa) ||
              (u.username && u.username.replace(/[^0-9]/g, '') === cleanWa)
          );

          if (existingIdx !== -1) {
            // Pertahankan password dan izin yang telah diatur oleh Developer atau diubah oleh user!
            const currentPassword = parsed[existingIdx].password || cleanNik || 'bkwa123';
            parsed[existingIdx].username = loginUsername;
            parsed[existingIdx].phone = cleanWa;
            parsed[existingIdx].password = currentPassword;
            parsed[existingIdx].fullName = mp.nama || parsed[existingIdx].fullName || cleanWa;
            parsed[existingIdx].manpowerId = mp.id;
            parsed[existingIdx].department = mp.jabatan || parsed[existingIdx].department || 'Operasional';
            parsed[existingIdx].jabatan = mp.jabatan || parsed[existingIdx].jabatan;
            parsed[existingIdx].role = 'KARYAWAN';
            parsed[existingIdx].status = parsed[existingIdx].status || 'AKTIF';
            modified = true;
          } else {
            // Default Hak Akses Seluruh Karyawan: Viewer Dulu Secara Default
            parsed.push({
              id: `usr-mp-${mp.id}`,
              username: loginUsername,
              fullName: mp.nama || cleanWa,
              role: 'KARYAWAN',
              accountTier: 'MEMBER',
              password: cleanNik || 'bkwa123',
              department: mp.jabatan || 'Operasional',
              jabatan: mp.jabatan,
              phone: cleanWa,
              status: 'AKTIF',
              accessLevel: 'HANYA_VIEW', // Default Viewer
              manpowerId: mp.id,
              modulePermissions: {
                modul1Asset: false,
                modul2Manpower: false,
                modul3Maintenance: false,
                modul4Inventory: false,
                modul5P2H: false,
                modul6SparePart: false,
                modul7Tyre: false,
              },
              permissions: {
                modul1: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul2: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul3: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul4: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul5: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul6: { viewer: true, input: false, edit: false, delete: false, export: false },
                modul7: { viewer: true, input: false, edit: false, delete: false, export: false },
              },
              createdAt: mp.createdAt || new Date().toISOString(),
            });
            modified = true;
          }
        });
      }
    } catch (e) {
      console.error('Error syncing manpower accounts', e);
    }

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

// Simpan Pengaturan Hak Akses oleh Developer & Update Real-Time ke Cloud Firestore
export async function saveAccessControlSettings(
  users: UserAccount[]
): Promise<{ success: boolean; message: string }> {
  try {
    saveUsers(users);
    // Sinkronkan seluruh data user ke Cloud Firestore secara realtime
    for (const u of users) {
      if (u.id) {
        await syncItemToFirestore('users', u.id, u);
      }
    }
    window.dispatchEvent(new CustomEvent('bkwa-users-updated'));
    return {
      success: true,
      message: 'Pengaturan hak akses berhasil disimpan dan langsung aktif secara realtime!',
    };
  } catch (err: any) {
    console.error('Error saving access control settings:', err);
    return {
      success: false,
      message: `Gagal menyimpan hak akses: ${err?.message || 'Error koneksi'}`,
    };
  }
}

// ============================================================
// ATURAN OTORISASI AKUN RESMI BKWA:
// 1. Akun Developer: Full access ke semua fitur, database, edit, delete, export.
//    Username: "Admin BKWA", Password: "Etika09"
// 2. Akun Karyawan: Didaftarkan oleh Akun Developer di Modul 2.
//    Username: No WA, Password: NIK.
//    Pilihan centang per modul: Viewer (Hide jika tidak dicentang), Input, Edit, Delete, Export.
// ============================================================

// Helper universal: Cek apakah user adalah Akun Developer
export function isDeveloper(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  const username = (user.username || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  return (
    user.accountTier === 'DEVELOPER' ||
    username === 'admin bkwa' ||
    username === 'adminbkwa' ||
    username === 'adminbkwa09' ||
    email === 'developer@bkwa.co.id'
  );
}

// Poin 9: Cek apakah user boleh mengakses Form Registrasi Unit (Hanya Developer)
export function canAccessRegistrationForm(user: UserAccount | null): boolean {
  if (!user) return false;
  return isDeveloper(user);
}

// Cek apakah user berhak melihat/membuka modul tertentu (Jika false -> HIDE MODUL dari menu & launcher!)
export function canUserViewModule(user: UserAccount | null | undefined, moduleId: number): boolean {
  if (!user) return false;
  if (isDeveloper(user)) return true; // Akun Developer melihat semua modul 1-7

  // Cek matriks izin granular per modul
  const modKey = `modul${moduleId}` as keyof GranularUserPermissions;
  if (user.permissions && user.permissions[modKey]) {
    return Boolean(user.permissions[modKey]?.viewer); // Jika false -> HIDE modul!
  }

  // Fallback backwards-compatibility
  const tier = user.accountTier || (user.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');
  if (tier === 'DEVELOPER' || tier === 'ADMIN' || tier === 'KHUSUS') return true;
  if (tier === 'MEMBER') {
    return moduleId === 3 || moduleId === 5;
  }
  return true;
}

// Cek apakah user berhak menginput/menambah data di modul tertentu
export function canUserInsertModule(user: UserAccount | null | undefined, moduleId: number): boolean {
  if (!user || user.status === 'NONAKTIF') return false;
  if (isDeveloper(user)) return true; // Developer full access

  const modKey = `modul${moduleId}` as keyof GranularUserPermissions;
  if (user.permissions && user.permissions[modKey]) {
    return Boolean(user.permissions[modKey]?.input);
  }

  const tier = user.accountTier || (user.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');
  if (tier === 'ADMIN') return [3, 4, 5, 6, 7].includes(moduleId);
  if (tier === 'MEMBER') return moduleId === 5;
  return false;
}

// Cek apakah user berhak mengedit data di modul tertentu
export function canUserEditModule(user: UserAccount | null | undefined, moduleId?: number): boolean {
  if (!user || user.status === 'NONAKTIF') return false;
  if (isDeveloper(user)) return true; // Developer full access edit semua data

  if (!moduleId) return false;
  const modKey = `modul${moduleId}` as keyof GranularUserPermissions;
  if (user.permissions && user.permissions[modKey]) {
    return Boolean(user.permissions[modKey]?.edit);
  }

  const tier = user.accountTier || (user.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');
  if (tier === 'ADMIN') return [3, 4, 5, 6, 7].includes(moduleId);
  return false;
}

// Backwards-compatible alias for existing code
export function canUserEdit(user: UserAccount | null, moduleId?: number): boolean {
  return canUserEditModule(user, moduleId);
}

// Cek apakah user berhak menghapus data di modul tertentu
export function canUserDeleteModule(user: UserAccount | null | undefined, moduleId: number): boolean {
  if (!user || user.status === 'NONAKTIF') return false;
  if (isDeveloper(user)) return true; // Developer full access delete semua data

  const modKey = `modul${moduleId}` as keyof GranularUserPermissions;
  if (user.permissions && user.permissions[modKey]) {
    return Boolean(user.permissions[modKey]?.delete);
  }

  return false;
}

// Cek apakah user berhak melakukan Export data pada modul tertentu
export function canUserExportModule(user: UserAccount | null | undefined, moduleId: number): boolean {
  if (!user || user.status === 'NONAKTIF') return false;
  if (isDeveloper(user)) return true; // Developer full export semua data

  const modKey = `modul${moduleId}` as keyof GranularUserPermissions;
  if (user.permissions && user.permissions[modKey]) {
    return Boolean(user.permissions[modKey]?.export);
  }

  const tier = user.accountTier || (user.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');
  if (tier === 'ADMIN') return [3, 4, 5, 6, 7].includes(moduleId);
  if (tier === 'KHUSUS') return [1, 2, 3, 4, 5, 6, 7].includes(moduleId);
  return false;
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
  syncItemToFirestore('users', userRecord.id, userRecord);

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
  syncItemToFirestore('users', id, users[index]);
  return true;
}

export function updateUserPassword(id: string, newPassword: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, message: 'User tidak ditemukan' };
  }

  users[index].password = newPassword.trim();
  saveUsers(users);
  syncItemToFirestore('users', id, users[index]);

  logActivity({
    aksi: 'UPDATE',
    keterangan: `Developer mengubah password akun: ${users[index].fullName} (@${users[index].username})`,
  });

  return { success: true, message: `Password akun ${users[index].fullName} berhasil diperbarui!` };
}

// Sinkronisasi personil Manpower ke Akun Pengguna:
// - Hanya personil dengan No HP terdaftar yang mendapatkan akun login
// - Seluruh Karyawan: Default "HANYA_VIEW" (Viewer)
export function syncAllManpowerToUserAccounts(): {
  success: boolean;
  createdCount: number;
  updatedCount: number;
  message: string;
} {
  const manpowerList = getAllManpower();
  const users = getAllUsers();

  let createdCount = 0;
  let updatedCount = 0;

  manpowerList.forEach((mp) => {
    const rawWa = (mp.noWa || '').trim();
    const cleanWa = rawWa.replace(/[^0-9]/g, '');

    // JIKA TIDAK MEMILIKI NO HP: Tidak memiliki akses!
    if (!cleanWa) {
      return;
    }

    const loginUsername = cleanWa;
    const existingIndex = users.findIndex(
      (u) => 
        (u.manpowerId && u.manpowerId === mp.id) ||
        (u.phone && u.phone.replace(/[^0-9]/g, '') === cleanWa) ||
        (u.username && u.username.replace(/[^0-9]/g, '') === cleanWa)
    );

    if (existingIndex !== -1) {
      // Update data yang sudah ada jika bukan ADMIN Developer
      if (users[existingIndex].role !== 'ADMIN') {
        users[existingIndex].manpowerId = mp.id;
        users[existingIndex].username = loginUsername;
        users[existingIndex].phone = cleanWa;
        users[existingIndex].jabatan = mp.jabatan;
        users[existingIndex].department = mp.jabatan || 'Workshop & Quarry';
        users[existingIndex].role = 'KARYAWAN';
        // Password yang sudah dibuat/diubah user/admin tidak boleh ditimpa
        users[existingIndex].password = users[existingIndex].password || (mp.nik ? mp.nik.trim() : 'bkwa123');
        updatedCount++;
      }
    } else {
      const newUser: UserAccount = {
        id: `usr-mp-${mp.id}`,
        manpowerId: mp.id,
        username: loginUsername,
        email: `${loginUsername}@bkwa.co.id`,
        fullName: mp.nama || cleanWa,
        role: 'KARYAWAN',
        accountTier: 'MEMBER',
        password: mp.nik ? mp.nik.trim() : 'bkwa123',
        department: mp.jabatan || 'Operasional',
        jabatan: mp.jabatan,
        phone: cleanWa,
        status: 'AKTIF',
        accessLevel: 'HANYA_VIEW', // Default Viewer untuk seluruh karyawan
        modulePermissions: {
          modul1Asset: false,
          modul2Manpower: false,
          modul3Maintenance: false,
          modul4Inventory: false,
          modul5P2H: false,
          modul6SparePart: false,
          modul7Tyre: false,
        },
        permissions: {
          modul1: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul2: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul3: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul4: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul5: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul6: { viewer: true, input: false, edit: false, delete: false, export: false },
          modul7: { viewer: true, input: false, edit: false, delete: false, export: false },
        },
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      createdCount++;
    }
  });

  saveUsers(users);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Sinkronisasi akun dari data Manpower: ${createdCount} dibuat baru, ${updatedCount} diperbarui. (Administrasi: Bisa Mengisi, Owner & Karyawan lain: Hanya View).`,
  });

  return {
    success: true,
    createdCount,
    updatedCount,
    message: `Berhasil menyinkronkan data Manpower ke Akun Login (${createdCount} akun baru dibuat, ${updatedCount} akun disesuaikan).`,
  };
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
  deleteItemFromFirestore('users', id);
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
  syncItemToFirestore('units', newUnit.id, newUnit);

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
  syncItemToFirestore('units', id, updatedUnit);

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
  deleteItemFromFirestore('units', id);

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
  syncItemToFirestore('manpower', newRecord.id, newRecord);

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
  syncItemToFirestore('manpower', id, updatedRecord);

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
  deleteItemFromFirestore('manpower', id);

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
    const parsed: BreakdownRecord[] = JSON.parse(data);
    return parsed.map((r) => ({
      ...r,
      noMaintenanceOrder: r.noMaintenanceOrder || r.noNotifikasi,
      namaAlat: r.namaAlat || r.noLama,
    }));
  } catch (e) {
    console.error('Error reading breakdown records', e);
    return [];
  }
}

export function saveBreakdownList(records: BreakdownRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.BREAKDOWN, JSON.stringify(records));
}

/**
 * Generate No Maintenance Order / No Notifikasi dengan aturan:
 * 2 digit tahun dan 4 digit no urut (Contoh: 260001)
 */
export function generateNextNotificationNumber(dateStr?: string): string {
  // Ambil tahun dari tanggal input atau hari ini
  let year2Digits = '26';

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length >= 1) {
      year2Digits = parts[0].slice(-2);
    }
  } else {
    const now = new Date();
    year2Digits = String(now.getFullYear()).slice(-2);
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

  // Pastikan tidak duplikat dengan record yang sudah ada (4 digit no urut)
  const existingRecords = getAllBreakdowns();
  while (
    existingRecords.some(
      (r) =>
        r.noNotifikasi === `${year2Digits}${String(currentCounter).padStart(4, '0')}` ||
        r.noMaintenanceOrder === `${year2Digits}${String(currentCounter).padStart(4, '0')}`
    )
  ) {
    currentCounter++;
  }

  localStorage.setItem(STORAGE_KEYS.BREAKDOWN_COUNTER, String(currentCounter));

  // Format 4 digit nomor urut: 0001 -> 260001
  const serial4Digits = String(currentCounter).padStart(4, '0');

  return `${year2Digits}${serial4Digits}`;
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
  const currentUser = getCurrentUser();

  // CEK APAKAH UNIT INI MEMILIKI BREAKDOWN AKTIF YANG BELUM READY
  // Sesuai SOP: Jika unit masih BREAKDOWN, jangan buat no MO baru, melainkan tetap referensikan No Maintenance Order sebelumnya!
  // No Maintenance Order baru HANYA di-generate jika unit sebelumnya sudah 'READY'.
  const norm = (s: string = '') => s.toLowerCase().replace(/[\s\-_]/g, '').trim();
  const targetNorm = norm(data.noUnit);
  const existingActive = records.find(
    (r) =>
      Boolean(r.noUnit) &&
      (norm(r.noUnit) === targetNorm || r.noUnit.toLowerCase().trim() === data.noUnit.toLowerCase().trim()) &&
      (r.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
  );

  if (existingActive) {
    const mo = existingActive.noMaintenanceOrder || existingActive.noNotifikasi;
    const newStatus = data.statusUnit || existingActive.statusUnit || 'BREAKDOWN';

    // Buat entri update pekerjaan baru pada riwayat
    const newUpdateEntry: BreakdownUpdateEntry = {
      id: `upd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      startJob: today,
      detailKerusakan: data.detailProblem || 'Update Pekerjaan Lanjutan',
      progress: data.progress || existingActive.progress || 'On Progress',
      statusUnit: newStatus,
      pic1: data.pic1 || existingActive.pic1 || '',
      pic2: data.pic2 || existingActive.pic2 || '',
      pic3: data.pic3 || existingActive.pic3 || '',
      partsJasa: data.partsJasa || existingActive.partsJasa || [],
      remark: data.remark || existingActive.remark || `Update pekerjaan tanggal ${today}`,
      updatedBy: data.pelapor || currentUser?.fullName || 'Operator / Mekanik',
      createdAt: now,
    };

    // Hitung downtime jika status berubah menjadi READY atau LIMIT OPERASI
    let downtimeHours = existingActive.downtimeHours;
    let completedAt = existingActive.completedAt;

    if (newStatus === 'READY' || newStatus === 'LIMIT OPERASI') {
      if (!completedAt) {
        completedAt = now;
        const startMs = new Date(existingActive.tanggal).getTime();
        const endMs = new Date(now).getTime();
        const diffHours = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
        downtimeHours = diffHours;
      }
    }

    const index = records.findIndex((r) => r.id === existingActive.id);
    const updatedRecord: BreakdownRecord = {
      ...existingActive,
      noMaintenanceOrder: mo,
      noNotifikasi: mo,
      hm: data.hm ? (Number(data.hm) || data.hm) : existingActive.hm,
      component: data.component || existingActive.component,
      detailProblem: data.detailProblem || existingActive.detailProblem,
      detailKerusakan: data.detailProblem || existingActive.detailKerusakan,
      progress: data.progress || existingActive.progress,
      statusUnit: newStatus,
      downtimeHours,
      completedAt,
      riwayatUpdate: [newUpdateEntry, ...(existingActive.riwayatUpdate || [])],
      updatedAt: now,
    };

    records[index] = updatedRecord;
    saveBreakdownList(records);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Pekerjaan Breakdown [${mo}] Unit ${updatedRecord.noUnit}: Tetap Reff MO ${mo} (Status: ${newStatus}, Progress: ${updatedRecord.progress})`,
      detailUnit: updatedRecord.noUnit,
    });

    return {
      success: true,
      message: `Update pekerjaan unit ${updatedRecord.noUnit} berhasil disimpan! Tetap mereferensikan Maintenance Order: ${mo} (karena unit masih berstatus ${existingActive.statusUnit}).`,
      record: updatedRecord,
    };
  }

  // JIKA UNIT BELUM ADA DI DAFTAR BREAKDOWN ATAU STATUS SEBELUMNYA SUDAH 'READY':
  // GENERATE NO MAINTENANCE ORDER BARU
  const noMaintenanceOrder = generateNextNotificationNumber(today);
  const noNotifikasi = noMaintenanceOrder;

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
    noMaintenanceOrder,
    namaAlat: data.namaAlat || data.noLama,
    statusUnit: data.statusUnit || 'BREAKDOWN',
    riwayatUpdate: [initialUpdateEntry],
    createdAt: now,
    updatedAt: now,
  };

  records.unshift(newRecord);
  saveBreakdownList(records);
  syncItemToFirestore('breakdowns', newRecord.id, newRecord);

  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Input Breakdown Baru No: ${noNotifikasi} (MO: ${noMaintenanceOrder}) - Unit ${newRecord.noUnit} (${newRecord.component}: ${newRecord.detailProblem})`,
    detailUnit: newRecord.noUnit,
  });

  return {
    success: true,
    message: `Laporan Breakdown baru berhasil disimpan! No Maintenance Order: ${noMaintenanceOrder}`,
    record: newRecord,
  };
}

export function updateBreakdownActivity(
  id: string,
  updateData: {
    startJob?: string;
    jamStart?: string;
    jamFinish?: string;
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
    jamStart: updateData.jamStart || target.jamStart || '',
    jamFinish: updateData.jamFinish || target.jamFinish || '',
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
    jamStart: updateData.jamStart !== undefined ? updateData.jamStart : target.jamStart,
    jamFinish: updateData.jamFinish !== undefined ? updateData.jamFinish : target.jamFinish,
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
  syncItemToFirestore('breakdowns', id, updatedRecord);

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
  deleteItemFromFirestore('breakdowns', id);

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
    const parsed: FogFuelDistributionRecord[] = JSON.parse(data);
    return parsed.map((item) => ({
      ...item,
      hmPengisian: Number(item.hmPengisian ?? (item as any).hm ?? 0),
      qty: Number(item.qty) || 0,
    }));
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
    syncItemToFirestore('fog_records', idToEdit, updatedRecord);

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
    syncItemToFirestore('fog_records', newRecord.id, newRecord);

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
  deleteItemFromFirestore('fog_records', id);

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
export const INITIAL_SUPPLIERS: SupplierRecord[] = [];

export function getAllSuppliers(): SupplierRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify([]));
      return [];
    }
    const parsed: SupplierRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['sup-1', 'sup-2', 'sup-3', 'sup-4'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error loading suppliers', e);
    return [];
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


// --- INITIAL PERIOD BALANCE & KAPASITAS TANGKI ---
export const INITIAL_PERIOD_BALANCE: InventoryPeriodBalance = {
  sisaPeriodeLaluFuelTangki: 0,
  sisaPeriodeLaluFuelFT: 0,
  sisaPeriodeLaluOli: {},
  kapasitasTangkiUtama: 20000,
  kapasitasFuelTruck: 5000,
};

export function getKapasitasTangkiUtama(): number {
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.KAPASITAS_TANGKI_UTAMA);
    if (custom) {
      const num = Number(custom);
      if (!isNaN(num) && num > 0) return num;
    }
    const balance = getInventoryPeriodBalance();
    if (balance.kapasitasTangkiUtama && balance.kapasitasTangkiUtama > 0) {
      return balance.kapasitasTangkiUtama;
    }
    return 20000;
  } catch {
    return 20000;
  }
}

export function setKapasitasTangkiUtama(kapasitas: number): void {
  try {
    const valid = Math.max(1, Number(kapasitas) || 20000);
    localStorage.setItem(STORAGE_KEYS.KAPASITAS_TANGKI_UTAMA, String(valid));
    const current = getInventoryPeriodBalance();
    updateInventoryPeriodBalance({
      ...current,
      kapasitasTangkiUtama: valid,
    });
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Kapasitas Manual Tangki Solar Utama: ${valid.toLocaleString('id-ID')} Liter`,
    });
  } catch (e) {
    console.error('Error saving kapasitas tangki utama', e);
  }
}

export function getKapasitasFuelTruck(): number {
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.KAPASITAS_FUEL_TRUCK);
    if (custom) {
      const num = Number(custom);
      if (!isNaN(num) && num > 0) return num;
    }
    const balance = getInventoryPeriodBalance();
    if (balance.kapasitasFuelTruck && balance.kapasitasFuelTruck > 0) {
      return balance.kapasitasFuelTruck;
    }
    return 5000;
  } catch {
    return 5000;
  }
}

export function setKapasitasFuelTruck(kapasitas: number): void {
  try {
    const valid = Math.max(1, Number(kapasitas) || 5000);
    localStorage.setItem(STORAGE_KEYS.KAPASITAS_FUEL_TRUCK, String(valid));
    const current = getInventoryPeriodBalance();
    updateInventoryPeriodBalance({
      ...current,
      kapasitasFuelTruck: valid,
    });
  } catch (e) {
    console.error('Error saving kapasitas fuel truck', e);
  }
}

export function getInventoryPeriodBalance(): InventoryPeriodBalance {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PERIOD_BALANCE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PERIOD_BALANCE, JSON.stringify(INITIAL_PERIOD_BALANCE));
      return INITIAL_PERIOD_BALANCE;
    }
    const parsed = JSON.parse(data);
    // Bersihkan nilai dummy bawaan 8500 / 1500 jika belum pernah diubah oleh user secara riil
    if (parsed.sisaPeriodeLaluFuelTangki === 8500 && parsed.sisaPeriodeLaluFuelFT === 1500) {
      const cleanBalance: InventoryPeriodBalance = {
        sisaPeriodeLaluFuelTangki: 0,
        sisaPeriodeLaluFuelFT: 0,
        sisaPeriodeLaluOli: {},
        kapasitasTangkiUtama: parsed.kapasitasTangkiUtama || 20000,
        kapasitasFuelTruck: parsed.kapasitasFuelTruck || 5000,
      };
      localStorage.setItem(STORAGE_KEYS.PERIOD_BALANCE, JSON.stringify(cleanBalance));
      return cleanBalance;
    }

    // Pastikan kapasitas manual terisi
    if (!parsed.kapasitasTangkiUtama) {
      const savedKap = localStorage.getItem(STORAGE_KEYS.KAPASITAS_TANGKI_UTAMA);
      parsed.kapasitasTangkiUtama = savedKap ? Number(savedKap) || 20000 : 20000;
    }
    if (!parsed.kapasitasFuelTruck) {
      const savedFt = localStorage.getItem(STORAGE_KEYS.KAPASITAS_FUEL_TRUCK);
      parsed.kapasitasFuelTruck = savedFt ? Number(savedFt) || 5000 : 5000;
    }

    return parsed;
  } catch (e) {
    console.error('Error loading inventory period balance', e);
    return INITIAL_PERIOD_BALANCE;
  }
}

export function updateInventoryPeriodBalance(
  balance: InventoryPeriodBalance
): { success: boolean; message: string; balance: InventoryPeriodBalance } {
  try {
    // Sinkronkan juga key persistent kapasitas jika disediakan
    if (balance.kapasitasTangkiUtama && balance.kapasitasTangkiUtama > 0) {
      localStorage.setItem(STORAGE_KEYS.KAPASITAS_TANGKI_UTAMA, String(balance.kapasitasTangkiUtama));
    }
    if (balance.kapasitasFuelTruck && balance.kapasitasFuelTruck > 0) {
      localStorage.setItem(STORAGE_KEYS.KAPASITAS_FUEL_TRUCK, String(balance.kapasitasFuelTruck));
    }

    localStorage.setItem(STORAGE_KEYS.PERIOD_BALANCE, JSON.stringify(balance));
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Saldo & Kapasitas FOG: Tangki Utama ${balance.sisaPeriodeLaluFuelTangki}L (Kapasitas: ${balance.kapasitasTangkiUtama || 20000}L), FT ${balance.sisaPeriodeLaluFuelFT}L`,
    });
    return { success: true, message: 'Konfigurasi kapasitas & sisa stok berhasil diperbarui!', balance };
  } catch (e) {
    return { success: false, message: 'Gagal memperbarui konfigurasi sisa stok & kapasitas.', balance };
  }
}

export const saveInventoryPeriodBalance = updateInventoryPeriodBalance;


// --- 2. INPUT STOCK (FUEL) ---
export const INITIAL_FUEL_STOCK_INPUTS: FuelStockInputRecord[] = [];

export function getAllFuelStockInputs(): FuelStockInputRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_STOCK);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_STOCK, JSON.stringify([]));
      return [];
    }
    const parsed: FuelStockInputRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['fsi-1', 'fsi-2'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.FUEL_STOCK, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error loading fuel stock inputs', e);
    return [];
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
export const INITIAL_FUEL_TRANSFERS: FuelTransferRecord[] = [];

export function getAllFuelTransfers(): FuelTransferRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_TRANSFER);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_TRANSFER, JSON.stringify([]));
      return [];
    }
    const parsed: FuelTransferRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['ftr-1', 'ftr-2'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.FUEL_TRANSFER, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error loading fuel transfers', e);
    return [];
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
export const INITIAL_OIL_STOCK_INPUTS: OilStockInputRecord[] = [];

export function getAllOilStockInputs(): OilStockInputRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OIL_STOCK);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.OIL_STOCK, JSON.stringify([]));
      return [];
    }
    const parsed: OilStockInputRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['osi-1', 'osi-2', 'osi-3'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.OIL_STOCK, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error loading oil stock inputs', e);
    return [];
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
export const INITIAL_FUEL_DISTRIBUTIONS: FuelDistributionRecord[] = [];

export function getAllFuelDistributions(): FuelDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL_DISTRIBUTION);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FUEL_DISTRIBUTION, JSON.stringify([]));
      return [];
    }
    const parsed: FuelDistributionRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['fdist-1', 'fdist-2', 'fdist-3'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.FUEL_DISTRIBUTION, JSON.stringify(userOnly));
    }
    return userOnly.map((item) => ({
      ...item,
      hm: Number(item.hm) || Number(item.hmPengisian) || 0,
      hmPengisian: Number(item.hmPengisian ?? item.hm ?? 0),
      flowmeterStart: Number(item.flowmeterStart) || 0,
      flowmeterStop: Number(item.flowmeterStop) || 0,
      qty: Number(item.qty) || 0,
    }));
  } catch (e) {
    console.error('Error loading fuel distributions', e);
    return [];
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
export const INITIAL_OIL_DISTRIBUTIONS: OilDistributionRecord[] = [];

export function getAllOilDistributions(): OilDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OIL_DISTRIBUTION);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.OIL_DISTRIBUTION, JSON.stringify([]));
      return [];
    }
    const parsed: OilDistributionRecord[] = JSON.parse(data);
    const userOnly = parsed.filter((item) => !['odist-1', 'odist-2'].includes(item.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.OIL_DISTRIBUTION, JSON.stringify(userOnly));
    }
    return userOnly.map((item) => ({
      ...item,
      hmUnit: Number(item.hmUnit ?? (item as any).hm ?? 0),
      qty: Number(item.qty) || 0,
    }));
  } catch (e) {
    console.error('Error loading oil distributions', e);
    return [];
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
  // Kapasitas Tangki Solar Utama dibuat manual (dinamis sesuai kebutuhan penggantian tangki baru)
  const manualTangki = Number(periodBalance?.kapasitasTangkiUtama);
  const KAPASITAS_TANGKI_UTAMA = manualTangki > 0 ? manualTangki : getKapasitasTangkiUtama();

  // Kapasitas Fuel Truck FT-01 Manual
  const manualFT = Number(periodBalance?.kapasitasFuelTruck);
  const KAPASITAS_FUEL_TRUCK = manualFT > 0 ? manualFT : getKapasitasFuelTruck();

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

// ==========================================
// MODUL 5: STORAGE METHODS UNTUK P2H UNIT
// ==========================================

export const INITIAL_P2H_RECORDS: P2HRecord[] = [];

export function getAllP2HRecords(): P2HRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.P2H_RECORDS);
    if (!data) return [];
    const parsed: P2HRecord[] = JSON.parse(data);
    // Hapus data dummy initial, pertahankan 100% data yang diinput oleh pengguna
    const userOnly = parsed.filter(
      (r) => !r.id.startsWith('p2h-init') && !r.noP2H?.startsWith('P2H-2609-000')
    );
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.P2H_RECORDS, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error loading P2H records', e);
    return [];
  }
}

export function saveAllP2HRecords(records: P2HRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.P2H_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving P2H records', e);
  }
}

export function getNextP2HNumber(): string {
  try {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `P2H-${yy}${mm}`;

    const currentCounterStr = localStorage.getItem(STORAGE_KEYS.P2H_COUNTER);
    let counter = 1;
    if (currentCounterStr) {
      const parsed = JSON.parse(currentCounterStr);
      if (parsed.prefix === prefix) {
        counter = parsed.counter + 1;
      }
    }

    localStorage.setItem(
      STORAGE_KEYS.P2H_COUNTER,
      JSON.stringify({ prefix, counter })
    );

    const seqStr = String(counter).padStart(4, '0');
    return `${prefix}-${seqStr}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `P2H-${Date.now().toString().slice(-4)}-${random}`;
  }
}

export function saveP2HRecord(
  data: Omit<P2HRecord, 'id' | 'noP2H' | 'createdAt' | 'updatedAt'>,
  existingId?: string | null
): { success: boolean; message: string; record?: P2HRecord } {
  try {
    const records = getAllP2HRecords();
    const nowIso = new Date().toISOString();

    if (existingId) {
      const index = records.findIndex((r) => r.id === existingId);
      if (index === -1) {
        return { success: false, message: 'Data P2H tidak ditemukan untuk diperbarui.' };
      }

      const updatedRecord: P2HRecord = {
        ...records[index],
        ...data,
        updatedAt: nowIso,
      };

      records[index] = updatedRecord;
      saveAllP2HRecords(records);
      syncItemToFirestore('p2h_records', existingId, updatedRecord);

      logActivity({
        aksi: 'UPDATE',
        keterangan: `Update Pemeriksaan P2H No. ${updatedRecord.noP2H} (Unit: ${updatedRecord.noUnit})`,
      });

      return {
        success: true,
        message: `Laporan P2H No. ${updatedRecord.noP2H} berhasil diperbarui.`,
        record: updatedRecord,
      };
    } else {
      const newNoP2H = getNextP2HNumber();
      const newRecord: P2HRecord = {
        ...data,
        id: `p2h-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        noP2H: newNoP2H,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      records.unshift(newRecord);
      saveAllP2HRecords(records);
      syncItemToFirestore('p2h_records', newRecord.id, newRecord);

      logActivity({
        aksi: 'REGISTRASI',
        keterangan: `Input Laporan P2H No. ${newNoP2H} (Unit: ${newRecord.noUnit}, Operator: ${newRecord.operatorName}) - Status: ${newRecord.statusKelayakan}`,
      });

      return {
        success: true,
        message: `Laporan P2H No. ${newNoP2H} berhasil disimpan. Status: ${
          newRecord.statusKelayakan === 'LAYAK_OPERASI' ? 'Layak Operasi' : 'Tidak Layak / Perlu Perbaikan'
        }.`,
        record: newRecord,
      };
    }
  } catch (e: any) {
    return { success: false, message: `Gagal menyimpan data P2H: ${e?.message || 'Error sistem'}` };
  }
}

export function deleteP2HRecord(id: string): { success: boolean; message: string } {
  try {
    const records = getAllP2HRecords();
    const target = records.find((r) => r.id === id);
    if (!target) {
      return { success: false, message: 'Data P2H tidak ditemukan.' };
    }

    const filtered = records.filter((r) => r.id !== id);
    saveAllP2HRecords(filtered);
    deleteItemFromFirestore('p2h_records', id);

    logActivity({
      aksi: 'HAPUS',
      keterangan: `Hapus Laporan P2H No. ${target.noP2H} (${target.noUnit})`,
    });

    return { success: true, message: `Laporan P2H No. ${target.noP2H} berhasil dihapus.` };
  } catch (e: any) {
    return { success: false, message: `Gagal menghapus data P2H: ${e?.message || 'Error'}` };
  }
}

// ==========================================
// MODUL 5: SUB MODUL 2 - SETTING FLEET
// Alokasi No Unit, Nama Operator, Lokasi Kerja
// Input Manual & Opsi Sinkronisasi Otomatis dari P2H
// ==========================================

export function getAllFleetSettings(): FleetSettingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FLEET_SETTINGS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading fleet settings', e);
    return [];
  }
}

export function saveAllFleetSettings(records: FleetSettingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FLEET_SETTINGS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving fleet settings', e);
  }
}

export function addOrUpdateFleetSetting(
  data: Omit<FleetSettingRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: FleetSettingRecord } {
  try {
    const current = getAllFleetSettings();
    const nowIso = new Date().toISOString();

    if (idToEdit) {
      const idx = current.findIndex((f) => f.id === idToEdit);
      if (idx === -1) {
        return { success: false, message: 'Data setting fleet tidak ditemukan!' };
      }
      const updated: FleetSettingRecord = {
        ...current[idx],
        ...data,
        updatedAt: nowIso,
      };
      current[idx] = updated;
      saveAllFleetSettings(current);

      logActivity({
        aksi: 'UPDATE',
        keterangan: `Update Setting Fleet Unit ${updated.noUnit} (Operator: ${updated.namaOperator}, Lokasi: ${updated.lokasiKerja})`,
        detailUnit: updated.noUnit,
      });

      return {
        success: true,
        message: `Setting fleet unit ${updated.noUnit} berhasil diperbarui!`,
        record: updated,
      };
    } else {
      const newRecord: FleetSettingRecord = {
        ...data,
        id: `fleet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      current.unshift(newRecord);
      saveAllFleetSettings(current);

      logActivity({
        aksi: 'REGISTRASI',
        keterangan: `Input Setting Fleet Unit ${newRecord.noUnit} (Operator: ${newRecord.namaOperator}, Lokasi: ${newRecord.lokasiKerja}) [${newRecord.source}]`,
        detailUnit: newRecord.noUnit,
      });

      return {
        success: true,
        message: `Setting fleet unit ${newRecord.noUnit} berhasil ditambahkan!`,
        record: newRecord,
      };
    }
  } catch (e: any) {
    return { success: false, message: `Gagal menyimpan setting fleet: ${e?.message || 'Error'}` };
  }
}

export function deleteFleetSetting(id: string): { success: boolean; message: string } {
  try {
    const current = getAllFleetSettings();
    const target = current.find((f) => f.id === id);
    if (!target) {
      return { success: false, message: 'Data setting fleet tidak ditemukan!' };
    }
    const filtered = current.filter((f) => f.id !== id);
    saveAllFleetSettings(filtered);

    logActivity({
      aksi: 'HAPUS',
      keterangan: `Hapus Setting Fleet Unit ${target.noUnit} (Operator: ${target.namaOperator})`,
      detailUnit: target.noUnit,
    });

    return { success: true, message: `Setting fleet unit ${target.noUnit} berhasil dihapus.` };
  } catch (e: any) {
    return { success: false, message: `Gagal menghapus setting fleet: ${e?.message || 'Error'}` };
  }
}

export function syncFleetFromP2H(
  targetDate?: string,
  targetShift: string = 'Shift 1',
  targetLokasiDefault: string = 'Pit Tambang Purwosari'
): { 
  success: boolean; 
  message: string; 
  addedCount: number; 
  updatedCount: number; 
  totalP2H: number 
} {
  try {
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const allP2H = getAllP2HRecords();
    const allUnits = getAllUnits();
    const currentFleet = getAllFleetSettings();

    // Filter P2H berdasarkan tanggal terpilih
    const p2hTarget = allP2H.filter((p) => p.tanggal === todayStr);

    if (p2hTarget.length === 0) {
      return {
        success: false,
        message: `Tidak ada data pengisian P2H yang ditemukan untuk tanggal ${todayStr}. Operator belum mengisi checklist P2H pada tanggal tersebut.`,
        addedCount: 0,
        updatedCount: 0,
        totalP2H: 0,
      };
    }

    let addedCount = 0;
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    p2hTarget.forEach((p2h) => {
      const matchedUnit = allUnits.find(
        (u) => u.cnNew.toLowerCase().trim() === p2h.noUnit.toLowerCase().trim()
      );

      const lokasi = matchedUnit?.loc || targetLokasiDefault;
      const statusFleet = p2h.statusKelayakan === 'LAYAK_OPERASI' ? 'OPERASI' : 'BREAKDOWN';

      // Cek apakah sudah ada setting fleet untuk unit ini pada tanggal dan shift yang sama
      const existingIdx = currentFleet.findIndex(
        (f) => f.tanggal === todayStr && f.noUnit.toLowerCase().trim() === p2h.noUnit.toLowerCase().trim() && f.shift === targetShift
      );

      if (existingIdx !== -1) {
        currentFleet[existingIdx] = {
          ...currentFleet[existingIdx],
          jamStartOperasi: currentFleet[existingIdx].jamStartOperasi || '07:00',
          jamFinishOperasi: currentFleet[existingIdx].jamFinishOperasi || '17:00',
          jenisAlat: p2h.jenisAlat || matchedUnit?.jenis || currentFleet[existingIdx].jenisAlat || 'Heavy Equipment',
          namaOperator: p2h.operatorName || currentFleet[existingIdx].namaOperator,
          operatorJabatan: p2h.operatorJabatan || currentFleet[existingIdx].operatorJabatan,
          statusFleet,
          source: 'SYNC_P2H',
          p2hRefId: p2h.id,
          p2hNo: p2h.noP2H,
          updatedAt: nowIso,
        };
        updatedCount++;
      } else {
        const newFleet: FleetSettingRecord = {
          id: `fleet-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tanggal: todayStr,
          jamStartOperasi: '07:00',
          jamFinishOperasi: '17:00',
          shift: targetShift,
          noUnit: p2h.noUnit,
          namaAlat: p2h.namaAlat || matchedUnit?.namaAlat || p2h.noUnit,
          jenisAlat: p2h.jenisAlat || matchedUnit?.jenis || 'Heavy Equipment',
          namaOperator: p2h.operatorName,
          operatorJabatan: p2h.operatorJabatan || 'Operator Lapangan',
          lokasiKerja: lokasi,
          fleetGroup: 'Fleet Operasi',
          statusFleet,
          catatan: `Disinkronkan otomatis dari form P2H No. ${p2h.noP2H} (HM: ${p2h.hmKm})`,
          source: 'SYNC_P2H',
          p2hRefId: p2h.id,
          p2hNo: p2h.noP2H,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        currentFleet.unshift(newFleet);
        addedCount++;
      }
    });

    saveAllFleetSettings(currentFleet);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Sinkronisasi Fleet dari P2H Tanggal ${todayStr}: +${addedCount} unit baru, ${updatedCount} unit diperbarui`,
    });

    return {
      success: true,
      message: `Sinkronisasi selesai! Berhasil menambahkan ${addedCount} unit baru dan memperbarui ${updatedCount} unit dari ${p2hTarget.length} laporan P2H.`,
      addedCount,
      updatedCount,
      totalP2H: p2hTarget.length,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Gagal melakukan sinkronisasi: ${e?.message || 'Error sistem'}`,
      addedCount: 0,
      updatedCount: 0,
      totalP2H: 0,
    };
  }
}

// ==========================================
// MODUL 6: INVENTORY MANAGEMENT (SPARE PART)
// Sub Modul 1: Input Spare Part (Incoming Part/Component, Stock PN, Qty & Satuan)
// Sub Modul 2: Transaksi Spare Part (List Unit Breakdown & Reff MO, Order Part, Kurangi Stok / Permintaan Barang)
// ==========================================

export const INITIAL_SPARE_PARTS: SparePartItem[] = [];

export function getAllSpareParts(): SparePartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPARE_PARTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SPARE_PARTS, JSON.stringify([]));
      return [];
    }
    const parsed: SparePartItem[] = JSON.parse(raw);
    const dummyIds = [
      'sp-01', 'sp-02', 'sp-03', 'sp-04', 'sp-05', 'sp-06',
      'sp-07', 'sp-08', 'sp-09', 'sp-10', 'sp-11', 'sp-12'
    ];
    // Singkirkan data dummy bawaan, pertahankan 100% data yang diinput oleh user
    const userOnly = parsed.filter((p) => !dummyIds.includes(p.id));
    if (userOnly.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.SPARE_PARTS, JSON.stringify(userOnly));
    }
    return userOnly;
  } catch (e) {
    console.error('Error reading spare parts', e);
    return [];
  }
}

export function saveSpareParts(items: SparePartItem[]): void {
  localStorage.setItem(STORAGE_KEYS.SPARE_PARTS, JSON.stringify(items));
}

export function addOrUpdateSparePart(
  data: Omit<SparePartItem, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): { success: boolean; message: string; item?: SparePartItem } {
  try {
    const parts = getAllSpareParts();
    const now = new Date().toISOString();

    if (id) {
      const idx = parts.findIndex((p) => p.id === id);
      if (idx === -1) return { success: false, message: 'Spare part tidak ditemukan.' };
      parts[idx] = {
        ...parts[idx],
        ...data,
        updatedAt: now,
      };
      saveSpareParts(parts);
      logActivity({
        aksi: 'UPDATE',
        keterangan: `Update Spare Part [PN: ${data.partNumber}] ${data.namaBarang}`,
      });
      return { success: true, message: 'Data spare part berhasil diperbarui.', item: parts[idx] };
    } else {
      // Periksa apakah PN sudah ada
      const existing = parts.find(
        (p) => p.partNumber.trim().toLowerCase() === data.partNumber.trim().toLowerCase()
      );
      if (existing) {
        return {
          success: false,
          message: `Part Number (PN) "${data.partNumber}" sudah terdaftar dengan nama "${existing.namaBarang}". Gunakan tombol Tambah Stok untuk menambah kuantitas.`,
        };
      }

      const newItem: SparePartItem = {
        ...data,
        id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      parts.unshift(newItem);
      saveSpareParts(parts);
      logActivity({
        aksi: 'REGISTRASI',
        keterangan: `Registrasi Spare Part Baru [PN: ${newItem.partNumber}] ${newItem.namaBarang} (Stok: ${newItem.qty} ${newItem.satuan})`,
      });
      return { success: true, message: 'Spare part baru berhasil ditambahkan.', item: newItem };
    }
  } catch (e: any) {
    return { success: false, message: `Gagal menyimpan spare part: ${e?.message || 'Error'}` };
  }
}

export function addSparePartStock(
  partId: string,
  qtyToAdd: number,
  keterangan?: string
): { success: boolean; message: string; updatedItem?: SparePartItem } {
  try {
    if (qtyToAdd <= 0) {
      return { success: false, message: 'Jumlah kuantitas penambahan stok harus lebih dari 0.' };
    }
    const parts = getAllSpareParts();
    const idx = parts.findIndex((p) => p.id === partId);
    if (idx === -1) {
      return { success: false, message: 'Spare part tidak ditemukan.' };
    }

    const prevQty = parts[idx].qty;
    parts[idx].qty += Number(qtyToAdd);
    parts[idx].updatedAt = new Date().toISOString();
    saveSpareParts(parts);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Incoming Stock [PN: ${parts[idx].partNumber}] ${parts[idx].namaBarang}: +${qtyToAdd} ${parts[idx].satuan} (Stok: ${prevQty} -> ${parts[idx].qty}). ${keterangan || ''}`,
    });

    return {
      success: true,
      message: `Stok [PN: ${parts[idx].partNumber}] ${parts[idx].namaBarang} bertambah +${qtyToAdd} ${parts[idx].satuan} (Total sekarang: ${parts[idx].qty} ${parts[idx].satuan}).`,
      updatedItem: parts[idx],
    };
  } catch (e: any) {
    return { success: false, message: `Gagal menambah stok: ${e?.message || 'Error'}` };
  }
}

export function deleteSparePart(id: string): { success: boolean; message: string } {
  try {
    const parts = getAllSpareParts();
    const target = parts.find((p) => p.id === id);
    if (!target) return { success: false, message: 'Item tidak ditemukan.' };

    const filtered = parts.filter((p) => p.id !== id);
    saveSpareParts(filtered);

    logActivity({
      aksi: 'HAPUS',
      keterangan: `Hapus Spare Part [PN: ${target.partNumber}] ${target.namaBarang}`,
    });

    return { success: true, message: `Spare part ${target.namaBarang} berhasil dihapus.` };
  } catch (e: any) {
    return { success: false, message: `Gagal menghapus spare part: ${e?.message || 'Error'}` };
  }
}

// --- TRANSAKSI SPARE PART ---

export function getAllSparePartTransactions(): SparePartTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPARE_PART_TRANSACTIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading transactions', e);
    return [];
  }
}

export function saveSparePartTransactions(trxs: SparePartTransaction[]): void {
  localStorage.setItem(STORAGE_KEYS.SPARE_PART_TRANSACTIONS, JSON.stringify(trxs));
}

export function recordSparePartTransaction(
  data: Omit<SparePartTransaction, 'id' | 'noTransaksi' | 'createdAt' | 'status'>
): {
  success: boolean;
  message: string;
  transaction?: SparePartTransaction;
  shortageItems?: SparePartTransactionItem[];
} {
  try {
    const parts = getAllSpareParts();
    const transactions = getAllSparePartTransactions();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const year2Digits = String(now.getFullYear()).slice(-2);
    const trxCounter = transactions.length + 1;
    const noTransaksi = `TRX-${year2Digits}${String(trxCounter).padStart(4, '0')}`;

    const processedItems: SparePartTransactionItem[] = [];
    const shortageItems: SparePartTransactionItem[] = [];

    // Iterasi item permintaan part
    for (const reqItem of data.items) {
      const partIdx = parts.findIndex(
        (p) =>
          p.partNumber.trim().toLowerCase() === reqItem.partNumber.trim().toLowerCase() ||
          p.namaBarang.trim().toLowerCase() === reqItem.namaBarang.trim().toLowerCase()
      );

      const requestedQty = Number(reqItem.qtyDiminta);
      let releasedQty = 0;
      let statusKetersediaan: 'TERSEDIA' | 'SEBAGIAN' | 'HABIS' = 'HABIS';

      if (partIdx !== -1) {
        const available = parts[partIdx].qty;
        if (available >= requestedQty) {
          releasedQty = requestedQty;
          parts[partIdx].qty -= requestedQty;
          parts[partIdx].updatedAt = now.toISOString();
          statusKetersediaan = 'TERSEDIA';
        } else if (available > 0) {
          releasedQty = available;
          parts[partIdx].qty = 0;
          parts[partIdx].updatedAt = now.toISOString();
          statusKetersediaan = 'SEBAGIAN';
          shortageItems.push({
            ...reqItem,
            qtyDiminta: requestedQty - available,
            qtyDikeluarkan: 0,
            statusKetersediaan: 'HABIS',
            keterangan: `Kurang ${requestedQty - available} ${reqItem.satuan}`,
          });
        } else {
          releasedQty = 0;
          statusKetersediaan = 'HABIS';
          shortageItems.push({
            ...reqItem,
            qtyDiminta: requestedQty,
            qtyDikeluarkan: 0,
            statusKetersediaan: 'HABIS',
            keterangan: `Stok Gudang Habis`,
          });
        }
      } else {
        // Part tidak ada dalam master inventory
        releasedQty = 0;
        statusKetersediaan = 'HABIS';
        shortageItems.push({
          ...reqItem,
          qtyDiminta: requestedQty,
          qtyDikeluarkan: 0,
          statusKetersediaan: 'HABIS',
          keterangan: `Item belum ada di master inventory`,
        });
      }

      processedItems.push({
        ...reqItem,
        qtyDiminta: requestedQty,
        qtyDikeluarkan: releasedQty,
        statusKetersediaan,
      });
    }

    // Tentukan status transaksi
    let trxStatus: 'SELESAI' | 'SEBAGIAN' | 'PERMINTAAN_BARANG' = 'SELESAI';
    if (shortageItems.length > 0) {
      trxStatus = processedItems.some((i) => i.qtyDikeluarkan > 0)
        ? 'SEBAGIAN'
        : 'PERMINTAAN_BARANG';
    }

    const newTransaction: SparePartTransaction = {
      ...data,
      id: `trx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      noTransaksi,
      tanggal: data.tanggal || dateStr,
      jam: data.jam || timeStr,
      items: processedItems,
      status: trxStatus,
      createdAt: now.toISOString(),
    };

    transactions.unshift(newTransaction);
    saveSparePartTransactions(transactions);
    saveSpareParts(parts); // Simpan perubahan stok

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Transaksi Spare Part [${noTransaksi}] Reff MO ${data.noMaintenanceOrder} Unit ${data.noUnit} (${processedItems.length} item, status: ${trxStatus})`,
      detailUnit: data.noUnit,
    });

    let message = `Transaksi Spare Part [${noTransaksi}] berhasil dicatat!`;
    if (shortageItems.length > 0) {
      message += ` Terdapat ${shortageItems.length} item part yang stoknya kurang/habis di gudang. Silakan buat Form Permintaan Barang.`;
    } else {
      message += ` Seluruh stok part mencukupi dan kuantitas di inventory otomatis terpotong.`;
    }

    return {
      success: true,
      message,
      transaction: newTransaction,
      shortageItems,
    };
  } catch (e: any) {
    return { success: false, message: `Gagal memproses transaksi spare part: ${e?.message || 'Error'}` };
  }
}

// --- FORM PERMINTAAN BARANG (PURCHASE / MATERIAL REQUEST) ---

export function getAllPurchaseRequests(): PurchaseRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASE_REQUESTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading purchase requests', e);
    return [];
  }
}

export function savePurchaseRequests(requests: PurchaseRequest[]): void {
  localStorage.setItem(STORAGE_KEYS.PURCHASE_REQUESTS, JSON.stringify(requests));
}

export function createPurchaseRequest(
  data: Omit<PurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'status'>
): {
  success: boolean;
  message: string;
  request?: PurchaseRequest;
} {
  try {
    const requests = getAllPurchaseRequests();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const year2Digits = String(now.getFullYear()).slice(-2);
    const counter = requests.length + 1;
    const noPermintaan = `SPB-${year2Digits}${String(counter).padStart(4, '0')}`;

    const newRequest: PurchaseRequest = {
      ...data,
      id: `pr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      noPermintaan,
      tanggal: data.tanggal || dateStr,
      jam: data.jam || timeStr,
      status: 'DIAJUKAN',
      createdAt: now.toISOString(),
    };

    requests.unshift(newRequest);
    savePurchaseRequests(requests);

    logActivity({
      aksi: 'REGISTRASI',
      keterangan: `Form Permintaan Barang [${noPermintaan}] Reff MO ${data.noMaintenanceOrder || '-'} Unit ${data.noUnit || '-'} (${data.items.length} item part diajukan)`,
      detailUnit: data.noUnit,
    });

    return {
      success: true,
      message: `Form Permintaan Barang [${noPermintaan}] berhasil dibuat dan diajukan ke Pengadaan/Logistik!`,
      request: newRequest,
    };
  } catch (e: any) {
    return { success: false, message: `Gagal membuat form permintaan barang: ${e?.message || 'Error'}` };
  }
}

export function updatePurchaseRequestStatus(
  id: string,
  status: PurchaseRequest['status'],
  approver?: string
): { success: boolean; message: string } {
  try {
    const requests = getAllPurchaseRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return { success: false, message: 'Permintaan tidak ditemukan.' };

    requests[idx].status = status;
    if (approver) requests[idx].disetujuiOleh = approver;
    savePurchaseRequests(requests);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Status Permintaan Barang [${requests[idx].noPermintaan}] diubah menjadi ${status}`,
    });

    return { success: true, message: `Status permintaan [${requests[idx].noPermintaan}] diperbarui menjadi ${status}.` };
  } catch (e: any) {
    return { success: false, message: `Gagal mengupdate status: ${e?.message || 'Error'}` };
  }
}

// Aliases for Spare Part Storage APIs
export const getStoredSpareParts = getAllSpareParts;
export const saveSparePartItem = addOrUpdateSparePart;
export const deleteSparePartItem = deleteSparePart;
export const getStoredSparePartTransactions = getAllSparePartTransactions;
export const getStoredPurchaseRequests = getAllPurchaseRequests;

// ============================================================
// MODUL 7: TYRE MANAGEMENT SYSTEM STORAGE
// ============================================================

// Sample Initial Tyres untuk demonstrasi Dashboard & Monitoring Keausan
export const INITIAL_TYRE_REGISTRATIONS: TyreRegistration[] = [
  {
    id: 'tyre-reg-001',
    kodeTyre: 'ET09-0001',
    merkTyre: 'Bridgestone',
    ukuranTyre: '12.00R24',
    codeExpired: '4827',
    initialDepthThread: 25,
    status: 'INSTALLED',
    currentUnit: 'DT01',
    currentPosisi: 'FL',
    currentDepthThread: 5, // 5mm / 25mm = 20% (KRITIS - Segera ganti)
    catatan: 'Ban depan kiri DT01, kembangan menipis akibat medan batu pit',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-002',
    kodeTyre: 'ET09-0002',
    merkTyre: 'Bridgestone',
    ukuranTyre: '12.00R24',
    codeExpired: '4827',
    initialDepthThread: 25,
    status: 'INSTALLED',
    currentUnit: 'DT01',
    currentPosisi: 'FR',
    currentDepthThread: 6, // 6mm / 25mm = 24% (KRITIS - Segera ganti)
    catatan: 'Ban depan kanan DT01, tread sisa tipis perlu persiapan ban baru',
    createdAt: '2026-02-01T08:30:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-003',
    kodeTyre: 'ET09-0003',
    merkTyre: 'Giti',
    ukuranTyre: '12.00R24',
    codeExpired: '2228',
    initialDepthThread: 25,
    status: 'INSTALLED',
    currentUnit: 'DT01',
    currentPosisi: 'RL1',
    currentDepthThread: 8, // 8mm / 25mm = 32% (PERINGATAN - Siapkan ban)
    catatan: 'Ban belakang kiri luar, keausan wajar muatan overburden',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-09-15T11:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-004',
    kodeTyre: 'ET09-0004',
    merkTyre: 'Giti',
    ukuranTyre: '12.00R24',
    codeExpired: '2228',
    initialDepthThread: 25,
    status: 'INSTALLED',
    currentUnit: 'DT01',
    currentPosisi: 'RL2',
    currentDepthThread: 18, // 18mm / 25mm = 72% (AMAN)
    catatan: 'Ban belakang kiri dalam, kondisi sangat baik',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-09-10T14:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-005',
    kodeTyre: 'ET09-0005',
    merkTyre: 'Michelin',
    ukuranTyre: '23.5R25',
    codeExpired: '1228',
    initialDepthThread: 30,
    status: 'INSTALLED',
    currentUnit: 'WL01',
    currentPosisi: 'POS-1',
    currentDepthThread: 7, // 7mm / 30mm = 23% (KRITIS - Segera ganti)
    catatan: 'Ban depan kiri Wheel Loader WL01, tapak ban sering slip di loading point',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-09-22T09:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-006',
    kodeTyre: 'ET09-0006',
    merkTyre: 'Michelin',
    ukuranTyre: '23.5R25',
    codeExpired: '1228',
    initialDepthThread: 30,
    status: 'INSTALLED',
    currentUnit: 'WL01',
    currentPosisi: 'POS-2',
    currentDepthThread: 24, // 24mm / 30mm = 80% (AMAN)
    catatan: 'Ban depan kanan Wheel Loader WL01, kondisi prima',
    createdAt: '2026-04-10T11:00:00Z',
    updatedAt: '2026-09-22T09:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-007',
    kodeTyre: 'ET09-0007',
    merkTyre: 'GoodYear',
    ukuranTyre: '11.00R20',
    codeExpired: '3028',
    initialDepthThread: 22,
    status: 'AVAILABLE',
    currentDepthThread: 22,
    catatan: 'Stock ban baru di Gudang Workshop BKWA',
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
    createdBy: 'Developer BKWA',
  },
  {
    id: 'tyre-reg-008',
    kodeTyre: 'ET09-0008',
    merkTyre: 'Advance',
    ukuranTyre: '12.00R24',
    codeExpired: '1528',
    initialDepthThread: 25,
    status: 'AVAILABLE',
    currentDepthThread: 25,
    catatan: 'Stock ban baru di Gudang Workshop BKWA siap pasang',
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
    createdBy: 'Developer BKWA',
  },
];

export const INITIAL_TYRE_INSTALLS: TyreInstallRecord[] = [
  {
    id: 'tyre-inst-001',
    cnNew: 'DT01',
    namaAlat: 'Dump Truck Hino 500',
    hmKm: 4200,
    tanggal: '2026-02-01',
    jenisTyre: 'New',
    kodeTyre: 'ET09-0001',
    posisi: 'FL',
    depthThread: 25,
    pic: 'Joko Prabowo',
    picJabatan: 'MEKANIK',
    remark: 'Pemasangan ban baru Bridgestone di roda depan kiri',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'tyre-inst-002',
    cnNew: 'DT01',
    namaAlat: 'Dump Truck Hino 500',
    hmKm: 4200,
    tanggal: '2026-02-01',
    jenisTyre: 'New',
    kodeTyre: 'ET09-0002',
    posisi: 'FR',
    depthThread: 25,
    pic: 'Joko Prabowo',
    picJabatan: 'MEKANIK',
    remark: 'Pemasangan ban baru Bridgestone di roda depan kanan',
    createdAt: '2026-02-01T08:30:00Z',
    updatedAt: '2026-02-01T08:30:00Z',
  },
  {
    id: 'tyre-inst-003',
    cnNew: 'WL01',
    namaAlat: 'Wheel Loader Komatsu WA380',
    hmKm: 6150,
    tanggal: '2026-01-15',
    jenisTyre: 'New',
    kodeTyre: 'ET09-0005',
    posisi: 'POS-1',
    depthThread: 30,
    pic: 'Rudi Hartono',
    picJabatan: 'HELPER MEKANIK',
    remark: 'Pemasangan ban baru Michelin 23.5R25 depan kiri',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z',
  },
];

export const INITIAL_TYRE_REMOVES: TyreRemoveRecord[] = [
  {
    id: 'tyre-rem-001',
    cnNew: 'DT01',
    namaAlat: 'Dump Truck Hino 500',
    hmKm: 4200,
    tanggal: '2026-02-01',
    jenisTyre: 'Used',
    kodeTyre: 'ET09-OLD01',
    posisi: 'FL',
    depthThread: 3,
    pic: 'Joko Prabowo',
    picJabatan: 'MEKANIK',
    remark: 'Ban lama botak dan ada sobekan di side wall',
    statusSetelahDilepas: 'SCRAP',
    createdAt: '2026-02-01T07:45:00Z',
    updatedAt: '2026-02-01T07:45:00Z',
  },
];

// 1. Get All Tyre Registrations
export function getAllTyreRegistrations(): TyreRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TYRE_REGISTRATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TYRE_REGISTRATIONS, JSON.stringify(INITIAL_TYRE_REGISTRATIONS));
      return INITIAL_TYRE_REGISTRATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading tyre registrations', e);
    return INITIAL_TYRE_REGISTRATIONS;
  }
}

// Save Tyre Registrations
export function saveTyreRegistrations(list: TyreRegistration[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TYRE_REGISTRATIONS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving tyre registrations', e);
  }
}

// Generate Next Kode Tyre Otomatis (ET09-xxxx)
export function generateNextTyreCode(): string {
  const currentList = getAllTyreRegistrations();
  let maxNum = 0;
  currentList.forEach((t) => {
    const match = t.kodeTyre.match(/^ET09-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `ET09-${String(nextNum).padStart(4, '0')}`;
}

// Add or Update Tyre Registration
export function addOrUpdateTyreRegistration(
  data: Omit<TyreRegistration, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: TyreRegistration } {
  const currentList = getAllTyreRegistrations();
  const now = new Date().toISOString();

  // Cek duplikasi kode tyre
  const duplicate = currentList.find(
    (t) => t.kodeTyre.trim().toUpperCase() === data.kodeTyre.trim().toUpperCase() && t.id !== idToEdit
  );
  if (duplicate) {
    return { success: false, message: `Kode Tyre "${data.kodeTyre}" sudah terdaftar!` };
  }

  if (idToEdit) {
    const idx = currentList.findIndex((t) => t.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data registrasi tyre tidak ditemukan.' };
    }
    const updated: TyreRegistration = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = updated;
    saveTyreRegistrations(currentList);

    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Registrasi Tyre: ${data.kodeTyre} (${data.merkTyre} ${data.ukuranTyre})`,
      detailUnit: data.currentUnit || '-',
    });

    return {
      success: true,
      message: `Registrasi Tyre ${data.kodeTyre} berhasil diperbarui!`,
      record: updated,
    };
  } else {
    const newRecord: TyreRegistration = {
      id: `tyre-reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(newRecord);
    saveTyreRegistrations(currentList);

    logActivity({
      aksi: 'CREATE',
      keterangan: `Registrasi Tyre Baru: ${data.kodeTyre} (${data.merkTyre} ${data.ukuranTyre}) Exp: ${data.codeExpired}`,
      detailUnit: data.currentUnit || '-',
    });

    return {
      success: true,
      message: `Registrasi Tyre ${data.kodeTyre} berhasil ditambahkan!`,
      record: newRecord,
    };
  }
}

// Delete Tyre Registration
export function deleteTyreRegistration(id: string): { success: boolean; message: string } {
  const currentList = getAllTyreRegistrations();
  const target = currentList.find((t) => t.id === id);
  if (!target) {
    return { success: false, message: 'Data registrasi tyre tidak ditemukan.' };
  }

  const filtered = currentList.filter((t) => t.id !== id);
  saveTyreRegistrations(filtered);

  logActivity({
    aksi: 'DELETE',
    keterangan: `Hapus Registrasi Tyre: ${target.kodeTyre} (${target.merkTyre})`,
    detailUnit: target.currentUnit || '-',
  });

  return { success: true, message: `Tyre ${target.kodeTyre} berhasil dihapus!` };
}

// 2. Get All Tyre Installs
export function getAllTyreInstalls(): TyreInstallRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TYRE_INSTALLS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TYRE_INSTALLS, JSON.stringify(INITIAL_TYRE_INSTALLS));
      return INITIAL_TYRE_INSTALLS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading tyre installs', e);
    return INITIAL_TYRE_INSTALLS;
  }
}

// Save Tyre Installs
export function saveTyreInstalls(list: TyreInstallRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TYRE_INSTALLS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving tyre installs', e);
  }
}

// Add or Update Tyre Install
export function addOrUpdateTyreInstall(
  data: Omit<TyreInstallRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: TyreInstallRecord } {
  const currentList = getAllTyreInstalls();
  const now = new Date().toISOString();

  let savedRecord: TyreInstallRecord;
  if (idToEdit) {
    const idx = currentList.findIndex((t) => t.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data pemasangan tyre tidak ditemukan.' };
    }
    savedRecord = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = savedRecord;
  } else {
    savedRecord = {
      id: `tyre-inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(savedRecord);
  }

  saveTyreInstalls(currentList);

  // Otomatis update status Master Registrasi Tyre jika ada
  const tyreRegistrations = getAllTyreRegistrations();
  const regIdx = tyreRegistrations.findIndex(
    (t) => t.kodeTyre.trim().toUpperCase() === data.kodeTyre.trim().toUpperCase()
  );
  if (regIdx !== -1) {
    tyreRegistrations[regIdx] = {
      ...tyreRegistrations[regIdx],
      status: 'INSTALLED',
      currentUnit: data.cnNew,
      currentPosisi: data.posisi,
      currentDepthThread: data.depthThread,
      updatedAt: now,
    };
    saveTyreRegistrations(tyreRegistrations);
  }

  logActivity({
    aksi: idToEdit ? 'UPDATE' : 'CREATE',
    keterangan: `${idToEdit ? 'Update' : 'Pemasangan'} Tyre [${data.kodeTyre}] pada Unit ${data.cnNew} Posisi ${data.posisi} (${data.depthThread}mm)`,
    detailUnit: data.cnNew,
  });

  return {
    success: true,
    message: `Data pemasangan Tyre ${data.kodeTyre} pada ${data.cnNew} berhasil disimpan!`,
    record: savedRecord,
  };
}

// Delete Tyre Install
export function deleteTyreInstall(id: string): { success: boolean; message: string } {
  const currentList = getAllTyreInstalls();
  const target = currentList.find((t) => t.id === id);
  if (!target) {
    return { success: false, message: 'Data pemasangan tyre tidak ditemukan.' };
  }

  const filtered = currentList.filter((t) => t.id !== id);
  saveTyreInstalls(filtered);

  logActivity({
    aksi: 'DELETE',
    keterangan: `Hapus Catatan Pemasangan Tyre: ${target.kodeTyre} pada Unit ${target.cnNew}`,
    detailUnit: target.cnNew,
  });

  return { success: true, message: `Catatan pemasangan tyre ${target.kodeTyre} berhasil dihapus!` };
}

// 3. Get All Tyre Removes
export function getAllTyreRemoves(): TyreRemoveRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TYRE_REMOVES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TYRE_REMOVES, JSON.stringify(INITIAL_TYRE_REMOVES));
      return INITIAL_TYRE_REMOVES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading tyre removes', e);
    return INITIAL_TYRE_REMOVES;
  }
}

// Save Tyre Removes
export function saveTyreRemoves(list: TyreRemoveRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TYRE_REMOVES, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving tyre removes', e);
  }
}

// Add or Update Tyre Remove
export function addOrUpdateTyreRemove(
  data: Omit<TyreRemoveRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: TyreRemoveRecord } {
  const currentList = getAllTyreRemoves();
  const now = new Date().toISOString();

  let savedRecord: TyreRemoveRecord;
  if (idToEdit) {
    const idx = currentList.findIndex((t) => t.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data pelepasan tyre tidak ditemukan.' };
    }
    savedRecord = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = savedRecord;
  } else {
    savedRecord = {
      id: `tyre-rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(savedRecord);
  }

  saveTyreRemoves(currentList);

  // Otomatis update status Master Registrasi Tyre jika ada
  const tyreRegistrations = getAllTyreRegistrations();
  const regIdx = tyreRegistrations.findIndex(
    (t) => t.kodeTyre.trim().toUpperCase() === data.kodeTyre.trim().toUpperCase()
  );
  if (regIdx !== -1) {
    tyreRegistrations[regIdx] = {
      ...tyreRegistrations[regIdx],
      status: data.statusSetelahDilepas || 'USED_READY',
      currentUnit: undefined,
      currentPosisi: undefined,
      currentDepthThread: data.depthThread,
      updatedAt: now,
    };
    saveTyreRegistrations(tyreRegistrations);
  }

  logActivity({
    aksi: idToEdit ? 'UPDATE' : 'CREATE',
    keterangan: `${idToEdit ? 'Update' : 'Pelepasan'} Tyre [${data.kodeTyre}] dari Unit ${data.cnNew} Posisi ${data.posisi} (Sisa ${data.depthThread}mm)`,
    detailUnit: data.cnNew,
  });

  return {
    success: true,
    message: `Data pelepasan Tyre ${data.kodeTyre} dari ${data.cnNew} berhasil disimpan!`,
    record: savedRecord,
  };
}

// Delete Tyre Remove
export function deleteTyreRemove(id: string): { success: boolean; message: string } {
  const currentList = getAllTyreRemoves();
  const target = currentList.find((t) => t.id === id);
  if (!target) {
    return { success: false, message: 'Data pelepasan tyre tidak ditemukan.' };
  }

  const filtered = currentList.filter((t) => t.id !== id);
  saveTyreRemoves(filtered);

  logActivity({
    aksi: 'DELETE',
    keterangan: `Hapus Catatan Pelepasan Tyre: ${target.kodeTyre} dari Unit ${target.cnNew}`,
    detailUnit: target.cnNew,
  });

  return { success: true, message: `Catatan pelepasan tyre ${target.kodeTyre} berhasil dihapus!` };
}

// ============================================================
// MODUL 4: SUB MODUL OUT FIELD FUEL USED (SPBU LUAR)
// ============================================================

export function getStandardSolarPrice(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.STANDARD_SOLAR_PRICE);
    if (!val) return 6800; // Harga default Solar Subsidi / Biosolar B35
    const num = Number(val);
    return isNaN(num) || num <= 0 ? 6800 : num;
  } catch {
    return 6800;
  }
}

export function setStandardSolarPrice(price: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STANDARD_SOLAR_PRICE, String(price));
  } catch (e) {
    console.error('Error saving solar price', e);
  }
}

export const INITIAL_OUT_FIELD_RECORDS: OutFieldFuelRecord[] = [
  {
    id: 'off-demo-01',
    noTransaksi: 'OFF-0001',
    tanggal: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    jam: '08:15',
    jenisAlat: 'Dump Truck',
    kodeSpbu: 'SPBU 44.571.01 (Purwosari)',
    cnNew: 'DT-08',
    namaAlat: 'Hino 500 FM 260 JD',
    jmlLtr: 85,
    job: 'Batu Baik',
    ritaseBatuBaik: 6,
    ritaseBatuPecelan: 0,
    ritaseImbalTanah: 0,
    ritaseImbalPlant: 0,
    ritaseLokasian: 0,
    ritaseTotal: 6,
    hargaSolarPerLiter: 6800,
    nominalPembelianFuel: 578000,
    angkaPembulatan: 0,
    nominalFuelSetelahPembulatan: 578000,
    lainLain: 'Tol & Parkir SPBU',
    nominalLainLain: 15000,
    totalNominal: 593000,
    nominalCashSopir: 600000,
    sisaSelisihCash: 7000,
    namaOperator: 'Slamet Riyadi',
    jabatanOperator: 'SOPIR LOKASI',
    catatan: 'Pengisian solar ritase batu baik ke crusher',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'off-demo-02',
    noTransaksi: 'OFF-0002',
    tanggal: new Date().toISOString().split('T')[0],
    jam: '10:30',
    jenisAlat: 'Dump Truck',
    kodeSpbu: 'SPBU 44.571.08 (Jl. Raya Quarry)',
    cnNew: 'DT-12',
    namaAlat: 'Mitsubishi Fuso FN527ML',
    jmlLtr: 112.5,
    job: 'Imbal Tanah',
    ritaseBatuBaik: 0,
    ritaseBatuPecelan: 0,
    ritaseImbalTanah: 7,
    ritaseImbalPlant: 0,
    ritaseLokasian: 0,
    ritaseTotal: 7,
    hargaSolarPerLiter: 6800,
    nominalPembelianFuel: 765000,
    angkaPembulatan: 1000,
    nominalFuelSetelahPembulatan: 766000,
    lainLain: 'Tambah Angin Ban',
    nominalLainLain: 10000,
    totalNominal: 776000,
    nominalCashSopir: 800000,
    sisaSelisihCash: 24000,
    namaOperator: 'Budi Santoso',
    jabatanOperator: 'SOPIR LOKASI',
    catatan: 'Ada pembulatan struk SPBU +Rp 1.000, sisa cash sopir Rp 24.000 disetor kasir',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'off-demo-03',
    noTransaksi: 'OFF-0003',
    tanggal: new Date().toISOString().split('T')[0],
    jam: '13:45',
    jenisAlat: 'Dump Truck',
    kodeSpbu: 'SPBU Pertamina Simpang',
    cnNew: 'DT-05',
    namaAlat: 'Nissan Quester CWE 280',
    jmlLtr: 147,
    job: 'Batu Pecelan',
    ritaseBatuBaik: 0,
    ritaseBatuPecelan: 5,
    ritaseImbalTanah: 0,
    ritaseImbalPlant: 0,
    ritaseLokasian: 0,
    ritaseTotal: 5,
    hargaSolarPerLiter: 6800,
    nominalPembelianFuel: 999600,
    angkaPembulatan: 400,
    nominalFuelSetelahPembulatan: 1000000,
    lainLain: '',
    nominalLainLain: 0,
    totalNominal: 1000000,
    nominalCashSopir: 1000000,
    sisaSelisihCash: 0,
    namaOperator: 'Joko Susilo',
    jabatanOperator: 'SOPIR LOKASI',
    catatan: 'Pembulatan struk SPBU Rp 400 sehingga total pas Rp 1.000.000 klop dengan kasbon sopir',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export function getAllOutFieldFuelRecords(): OutFieldFuelRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OUT_FIELD_FUEL);
    if (!data) {
      saveAllOutFieldFuelRecords(INITIAL_OUT_FIELD_RECORDS);
      return INITIAL_OUT_FIELD_RECORDS;
    }
    const parsed: OutFieldFuelRecord[] = JSON.parse(data);
    return parsed.map((item) => {
      const jmlLtr = Number(item.jmlLtr) || 0;
      const hargaSolar = Number(item.hargaSolarPerLiter) || 6800;
      const subtotalFuel = Number(item.nominalPembelianFuel) !== undefined && Number(item.nominalPembelianFuel) > 0
        ? Number(item.nominalPembelianFuel)
        : (jmlLtr * hargaSolar);
      const pembulatan = Number(item.angkaPembulatan) || 0;
      const fuelNet = Number(item.nominalFuelSetelahPembulatan) !== undefined && !isNaN(Number(item.nominalFuelSetelahPembulatan))
        ? Number(item.nominalFuelSetelahPembulatan)
        : (subtotalFuel + pembulatan);
      const lain = Number(item.nominalLainLain) || 0;
      const totNominal = Number(item.totalNominal) !== undefined && Number(item.totalNominal) > 0
        ? Number(item.totalNominal)
        : (fuelNet + lain);
      const cashSopir = Number(item.nominalCashSopir) || 0;
      const selisih = Number(item.sisaSelisihCash) !== undefined && !isNaN(Number(item.sisaSelisihCash))
        ? Number(item.sisaSelisihCash)
        : (cashSopir - totNominal);

      return {
        ...item,
        jmlLtr,
        ritaseBatuBaik: Number(item.ritaseBatuBaik) || 0,
        ritaseBatuPecelan: Number(item.ritaseBatuPecelan) || 0,
        ritaseImbalTanah: Number(item.ritaseImbalTanah) || 0,
        ritaseImbalPlant: Number(item.ritaseImbalPlant) || 0,
        ritaseLokasian: Number(item.ritaseLokasian) || 0,
        ritaseTotal: Number(item.ritaseTotal) || 0,
        hargaSolarPerLiter: hargaSolar,
        nominalPembelianFuel: subtotalFuel,
        angkaPembulatan: pembulatan,
        nominalFuelSetelahPembulatan: fuelNet,
        nominalLainLain: lain,
        totalNominal: totNominal,
        nominalCashSopir: cashSopir,
        sisaSelisihCash: selisih,
      };
    });
  } catch (e) {
    console.error('Error loading out field fuel records', e);
    return [];
  }
}

export function saveAllOutFieldFuelRecords(records: OutFieldFuelRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OUT_FIELD_FUEL, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving out field fuel records', e);
  }
}

export function generateNextOutFieldFuelNo(): string {
  const list = getAllOutFieldFuelRecords();
  let maxNum = 0;
  list.forEach((item) => {
    const match = item.noTransaksi.match(/^OFF-(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `OFF-${String(maxNum + 1).padStart(4, '0')}`;
}

export function addOrUpdateOutFieldFuelRecord(
  data: Omit<OutFieldFuelRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: OutFieldFuelRecord } {
  const currentList = getAllOutFieldFuelRecords();
  const now = new Date().toISOString();

  if (idToEdit) {
    const idx = currentList.findIndex((item) => item.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data Out Field Fuel tidak ditemukan!' };
    }
    const updated: OutFieldFuelRecord = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = updated;
    saveAllOutFieldFuelRecords(currentList);
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Out Field Fuel: ${updated.noTransaksi} Unit ${updated.cnNew} ${updated.jmlLtr} Ltr (SPBU ${updated.kodeSpbu})`,
      detailUnit: updated.cnNew,
    });
    return {
      success: true,
      message: `Data Out Field Fuel ${updated.noTransaksi} berhasil diperbarui!`,
      record: updated,
    };
  }

  const newRecord: OutFieldFuelRecord = {
    ...data,
    id: `off-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now,
  };
  currentList.unshift(newRecord);
  saveAllOutFieldFuelRecords(currentList);
  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Input Out Field Fuel Baru: ${newRecord.noTransaksi} Unit ${newRecord.cnNew} ${newRecord.jmlLtr} Ltr Total Rp ${newRecord.totalNominal.toLocaleString('id-ID')}`,
    detailUnit: newRecord.cnNew,
  });
  return {
    success: true,
    message: `Data Out Field Fuel ${newRecord.noTransaksi} berhasil disimpan!`,
    record: newRecord,
  };
}

export function deleteOutFieldFuelRecord(id: string): { success: boolean; message: string } {
  const currentList = getAllOutFieldFuelRecords();
  const target = currentList.find((item) => item.id === id);
  if (!target) {
    return { success: false, message: 'Data Out Field Fuel tidak ditemukan!' };
  }
  const filtered = currentList.filter((item) => item.id !== id);
  saveAllOutFieldFuelRecords(filtered);
  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Out Field Fuel: ${target.noTransaksi} Unit ${target.cnNew}`,
    detailUnit: target.cnNew,
  });
  return {
    success: true,
    message: `Data Out Field Fuel ${target.noTransaksi} berhasil dihapus!`,
  };
}

// ==========================================
// MODUL 4: SUB MODUL GREASE (GEMUK PELUMAS)
// ==========================================
export function getAllGreaseStockRecords(): GreaseStockRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GREASE_STOCKS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading grease stock records', e);
    return [];
  }
}

export function saveAllGreaseStockRecords(records: GreaseStockRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GREASE_STOCKS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving grease stock records', e);
  }
}

export function addOrUpdateGreaseStockRecord(
  data: Omit<GreaseStockRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: GreaseStockRecord } {
  const currentList = getAllGreaseStockRecords();
  const now = new Date().toISOString();

  if (idToEdit) {
    const idx = currentList.findIndex((item) => item.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data stok grease tidak ditemukan!' };
    }
    const updated: GreaseStockRecord = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = updated;
    saveAllGreaseStockRecords(currentList);
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Stok Grease: ${updated.namaGrease} ${updated.qty} ${updated.satuan}`,
    });
    return {
      success: true,
      message: `Data stok grease [${updated.namaGrease}] berhasil diperbarui!`,
      record: updated,
    };
  }

  const newRecord: GreaseStockRecord = {
    ...data,
    id: `GRS-IN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  currentList.unshift(newRecord);
  saveAllGreaseStockRecords(currentList);
  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Input Stok Grease: ${newRecord.namaGrease} ${newRecord.qty} ${newRecord.satuan} dari ${newRecord.distributor}`,
  });
  return {
    success: true,
    message: `Penerimaan stok grease [${newRecord.namaGrease}] berhasil disimpan!`,
    record: newRecord,
  };
}

export function deleteGreaseStockRecord(id: string): { success: boolean; message: string } {
  const currentList = getAllGreaseStockRecords();
  const target = currentList.find((item) => item.id === id);
  if (!target) {
    return { success: false, message: 'Data stok grease tidak ditemukan!' };
  }
  const filtered = currentList.filter((item) => item.id !== id);
  saveAllGreaseStockRecords(filtered);
  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Stok Grease: ${target.namaGrease} ${target.qty} ${target.satuan}`,
  });
  return {
    success: true,
    message: `Data stok grease [${target.namaGrease}] berhasil dihapus!`,
  };
}

export function getAllGreaseDistributionRecords(): GreaseDistributionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GREASE_DISTRIBUTIONS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading grease distribution records', e);
    return [];
  }
}

export function saveAllGreaseDistributionRecords(records: GreaseDistributionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GREASE_DISTRIBUTIONS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving grease distribution records', e);
  }
}

export function addOrUpdateGreaseDistributionRecord(
  data: Omit<GreaseDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  idToEdit?: string
): { success: boolean; message: string; record?: GreaseDistributionRecord } {
  const currentList = getAllGreaseDistributionRecords();
  const now = new Date().toISOString();

  if (idToEdit) {
    const idx = currentList.findIndex((item) => item.id === idToEdit);
    if (idx === -1) {
      return { success: false, message: 'Data distribusi grease tidak ditemukan!' };
    }
    const updated: GreaseDistributionRecord = {
      ...currentList[idx],
      ...data,
      updatedAt: now,
    };
    currentList[idx] = updated;
    saveAllGreaseDistributionRecords(currentList);
    logActivity({
      aksi: 'UPDATE',
      keterangan: `Update Bon Pemakaian Grease: ${updated.noUnit} ${updated.namaGrease} ${updated.qty} ${updated.satuan}`,
      detailUnit: updated.noUnit,
    });
    return {
      success: true,
      message: `Data bon pemakaian grease unit [${updated.noUnit}] berhasil diperbarui!`,
      record: updated,
    };
  }

  const newRecord: GreaseDistributionRecord = {
    ...data,
    id: `GRS-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    noBon: data.noBon || `BON-GRS-${String(currentList.length + 1).padStart(4, '0')}`,
    createdAt: now,
    updatedAt: now,
  };
  currentList.unshift(newRecord);
  saveAllGreaseDistributionRecords(currentList);
  logActivity({
    aksi: 'REGISTRASI',
    keterangan: `Bon Pemakaian Grease: Unit ${newRecord.noUnit} ${newRecord.namaGrease} ${newRecord.qty} ${newRecord.satuan} (${newRecord.lokasiPelumasan})`,
    detailUnit: newRecord.noUnit,
  });
  return {
    success: true,
    message: `Bon pemakaian grease unit [${newRecord.noUnit}] berhasil disimpan!`,
    record: newRecord,
  };
}

export function deleteGreaseDistributionRecord(id: string): { success: boolean; message: string } {
  const currentList = getAllGreaseDistributionRecords();
  const target = currentList.find((item) => item.id === id);
  if (!target) {
    return { success: false, message: 'Data bon grease tidak ditemukan!' };
  }
  const filtered = currentList.filter((item) => item.id !== id);
  saveAllGreaseDistributionRecords(filtered);
  logActivity({
    aksi: 'HAPUS',
    keterangan: `Hapus Bon Pemakaian Grease: ${target.noUnit} ${target.namaGrease}`,
    detailUnit: target.noUnit,
  });
  return {
    success: true,
    message: `Bon pemakaian grease unit [${target.noUnit}] berhasil dihapus!`,
  };
}


