import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// Helper sanitasi: Firestore menolak field bernilai `undefined`, ubah ke `null` atau buang
export function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        sanitized[key] = sanitizeForFirestore(val);
      } else {
        sanitized[key] = null;
      }
    }
    return sanitized;
  }
  return data;
}

export interface SyncStatus {
  connected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
  totalSyncedItems: number;
}

let currentSyncStatus: SyncStatus = {
  connected: false,
  isSyncing: false,
  lastSyncTime: null,
  error: null,
  totalSyncedItems: 0,
};

const listeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeSyncStatus(fn: (status: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(currentSyncStatus);
  return () => {
    listeners.delete(fn);
  };
}

function updateStatus(updates: Partial<SyncStatus>) {
  currentSyncStatus = { ...currentSyncStatus, ...updates };
  listeners.forEach((fn) => fn(currentSyncStatus));
}

// Helper penentu Document ID deterministik untuk mencegah data ganda (duplikat) di Firestore
export function getDeterministicDocId(collectionName: string, item: any): string {
  if (!item) return String(Date.now());
  
  if (collectionName === 'units') {
    // Normalisasi CN unit: 'DT-01', 'DT 01', 'dt01' -> 'dt01'
    const rawCn = (item.cnNew || item.nomorLambung || item.kodeUnit || item.namaAlat || item.id || '').toString();
    const cleanCn = rawCn.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanCn ? `unit_${cleanCn}` : String(item.id || Date.now());
  }

  if (collectionName === 'manpower') {
    const nik = (item.nik || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    let wa = (item.noWa || '').toString().replace(/\D/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    const name = (item.nama || item.id || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nik) return `mp_nik_${nik}`;
    if (wa) return `mp_wa_${wa}`;
    return name ? `mp_nama_${name}` : String(item.id || Date.now());
  }

  if (collectionName === 'users') {
    const username = (item.username || '').toString().trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return username ? `user_${username}` : String(item.id || Date.now());
  }

  if (collectionName === 'breakdowns') {
    const no = (item.noNotifikasi || item.noMaintenanceOrder || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `bd_${no}` : String(item.id || Date.now());
  }

  if (collectionName === 'p2h_records') {
    const no = (item.noP2H || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `p2h_${no}` : String(item.id || Date.now());
  }

  // Modul 4: Sub-modul FOG
  if (collectionName === 'out_field_fuel') {
    const no = (item.noTransaksi || item.noBon || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `off_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'fuel_distributions') {
    const no = (item.noBon || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `fdist_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'oil_distributions') {
    const no = (item.noBon || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `odist_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'fuel_stocks') {
    const no = (item.snReffNo || item.noSuratJalan || item.noPo || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `fstock_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'oil_stocks') {
    const no = (item.noSuratJalan || item.noPo || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `ostock_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'fuel_transfers') {
    const no = (item.noTransfer || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `ftrf_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'suppliers') {
    const name = (item.namaDistributor || item.namaSupplier || item.nama || item.kodeSupplier || item.id || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return name ? `supp_${name}` : String(item.id || Date.now());
  }
  if (collectionName === 'grease_stocks') {
    const no = (item.noSuratJalan || item.noPo || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `gstock_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'grease_distributions') {
    const no = (item.noBon || item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `gdist_${no}` : String(item.id || Date.now());
  }
  if (collectionName === 'mechanic_work_logs') {
    const no = (item.id || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return no ? `mwl_${no}` : String(Date.now());
  }

  return String(item.id || Date.now());
}

// Push 1 item ke koleksi Firestore secara realtime (dengan ID deterministik)
export async function syncItemToFirestore(collectionName: string, rawId: string, data: any): Promise<void> {
  if (!data) return;
  try {
    const docId = getDeterministicDocId(collectionName, data);
    const docRef = doc(db, collectionName, docId);
    const cleanData = sanitizeForFirestore({
      ...data,
      id: data.id || rawId || docId,
      _firestoreDocId: docId,
      _updatedAtServer: new Date().toISOString()
    });
    await setDoc(docRef, cleanData, { merge: true });
    updateStatus({ connected: true, lastSyncTime: new Date().toLocaleTimeString('id-ID') });
  } catch (err) {
    console.error(`Gagal sync ke Firestore [${collectionName}/${rawId}]:`, err);
  }
}

// Hapus 1 item dari Firestore
export async function deleteItemFromFirestore(collectionName: string, rawId: string, itemData?: any): Promise<void> {
  try {
    const docId = itemData ? getDeterministicDocId(collectionName, itemData) : String(rawId);
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    updateStatus({ connected: true, lastSyncTime: new Date().toLocaleTimeString('id-ID') });
  } catch (err) {
    console.error(`Gagal hapus di Firestore [${collectionName}/${rawId}]:`, err);
  }
}

// Helper cerdas pembersih & penggabung data duplikat lokal (Deduplication Engine)
export function deduplicateEntityList(collectionName: string, list: any[]): any[] {
  if (!Array.isArray(list) || list.length <= 1) return list || [];

  if (collectionName === 'units') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      // Normalisasi cerdas: 'DT-01', 'DT 01', 'dt01' -> 'dt01'
      const rawCn = (item.cnNew || item.nomorLambung || item.kodeUnit || item.namaAlat || item.id || '').toString();
      const key = rawCn.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      // Jika sudah ada, pilih data yang lebih baru / lebih lengkap
      if (map.has(key)) {
        const existing = map.get(key);
        const existingDate = existing.terakhirDiperbarui || existing.tanggalRegistrasi || '';
        const itemDate = item.terakhirDiperbarui || item.tanggalRegistrasi || '';
        if (itemDate >= existingDate) {
          map.set(key, { ...existing, ...item });
        } else {
          map.set(key, { ...item, ...existing });
        }
      } else {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }

  if (collectionName === 'manpower') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const nikKey = (item.nik || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      let waKey = (item.noWa || '').toString().replace(/\D/g, '');
      if (waKey.startsWith('0')) waKey = '62' + waKey.slice(1);
      const nameKey = (item.nama || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const primaryKey = nikKey ? `nik_${nikKey}` : (waKey ? `wa_${waKey}` : `name_${nameKey}`);
      if (!primaryKey || primaryKey === 'name_') return;

      if (map.has(primaryKey)) {
        const existing = map.get(primaryKey);
        map.set(primaryKey, { ...existing, ...item, noWa: item.noWa || existing.noWa });
      } else {
        map.set(primaryKey, item);
      }
    });
    return Array.from(map.values());
  }

  if (collectionName === 'users') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.username || item.id || '').toString().trim().toLowerCase();
      if (!key) return;
      if (map.has(key)) {
        const existing = map.get(key);
        // Pertahankan status dan password terbaru
        map.set(key, { ...existing, ...item });
      } else {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }

  if (collectionName === 'breakdowns') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.noNotifikasi || item.noMaintenanceOrder || item.id || '').toString().trim();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  if (collectionName === 'p2h_records') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.noP2H || item.id || '').toString().trim();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  // Modul 4: Sub-modul FOG
  if (collectionName === 'out_field_fuel') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.noTransaksi || item.noBon || item.id || '').toString().trim().toLowerCase();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  if (collectionName === 'fuel_distributions' || collectionName === 'oil_distributions' || collectionName === 'grease_distributions') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.noBon || item.id || '').toString().trim().toLowerCase();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  if (collectionName === 'fuel_stocks' || collectionName === 'oil_stocks' || collectionName === 'grease_stocks') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.snReffNo || item.noSuratJalan || item.noPo || item.id || '').toString().trim().toLowerCase();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  if (collectionName === 'fuel_transfers') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.noTransfer || item.id || '').toString().trim().toLowerCase();
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  if (collectionName === 'suppliers') {
    const map = new Map<string, any>();
    list.forEach((item) => {
      if (!item) return;
      const key = (item.namaDistributor || item.namaSupplier || item.nama || item.kodeSupplier || item.id || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  // Default: deduplikasi berdasarkan id
  const map = new Map<string, any>();
  list.forEach((item) => {
    if (item && item.id) {
      map.set(String(item.id), item);
    }
  });
  return Array.from(map.values());
}

// Pembersihan otomatis data lokal jika sebelumnya ada duplikasi di browser
export function cleanLocalDuplicates(): void {
  try {
    const cleanKey = (storageKey: string, entityType: string) => {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const deduped = deduplicateEntityList(entityType, parsed);
        if (deduped.length !== parsed.length) {
          localStorage.setItem(storageKey, JSON.stringify(deduped));
          console.log(`[Clean] Membersihkan ${parsed.length - deduped.length} data duplikat di [${storageKey}].`);
        }
      }
    };

    // 1. Bersihkan Units (Modul 1)
    cleanKey('bkwa_asset_units_v2', 'units');

    // 2. Bersihkan Manpower (Modul 2)
    cleanKey('bkwa_manpower_list_v1', 'manpower');

    // 3. Bersihkan Users
    cleanKey('bkwa_users_list_v4', 'users');

    // 4. Bersihkan Breakdowns (Modul 3)
    cleanKey('bkwa_breakdown_records_v1', 'breakdowns');

    // 5. Bersihkan FOG (Modul 4)
    cleanKey('bkwa_inventory_out_field_fuel_v1', 'out_field_fuel');
    cleanKey('bkwa_inventory_fuel_dist_v2', 'fuel_distributions');
    cleanKey('bkwa_inventory_oil_dist_v2', 'oil_distributions');
    cleanKey('bkwa_inventory_fuel_stock_v2', 'fuel_stocks');
    cleanKey('bkwa_inventory_oil_stock_v2', 'oil_stocks');
    cleanKey('bkwa_inventory_fuel_transfer_v2', 'fuel_transfers');
    cleanKey('bkwa_inventory_suppliers_v2', 'suppliers');
    cleanKey('bkwa_inventory_grease_stocks_v1', 'grease_stocks');
    cleanKey('bkwa_inventory_grease_dist_v1', 'grease_distributions');
  } catch (e) {
    console.warn('Error saat membersihkan duplikat lokal:', e);
  }
}

// Fungsi Khusus: Reset data lokal Modul 1, 2, 4 di Laptop (Pertahankan Modul 3 Breakdown di laptop ini)
// Sesuai permintaan: data Modul 1, 2, 4 berasal dari PC Kantor (Live Cloud), sedangkan Modul 3 dari Laptop ini
export function clearLocalModules124Keep3(): void {
  try {
    // Kosongkan cache lokal Modul 1 & Modul 2
    localStorage.removeItem('bkwa_asset_units_v2');
    localStorage.removeItem('bkwa_manpower_list_v1');

    // Kosongkan cache lokal Modul 4 (FOG)
    localStorage.removeItem('bkwa_inventory_out_field_fuel_v1');
    localStorage.removeItem('bkwa_inventory_fuel_dist_v2');
    localStorage.removeItem('bkwa_inventory_oil_dist_v2');
    localStorage.removeItem('bkwa_inventory_fuel_stock_v2');
    localStorage.removeItem('bkwa_inventory_oil_stock_v2');
    localStorage.removeItem('bkwa_inventory_fuel_transfer_v2');
    localStorage.removeItem('bkwa_inventory_suppliers_v2');
    localStorage.removeItem('bkwa_inventory_grease_stocks_v1');
    localStorage.removeItem('bkwa_inventory_grease_dist_v1');
    localStorage.removeItem('bkwa_fog_distribution_v1');
    localStorage.removeItem('bkwa_fog_stock_inputs_v1');
    localStorage.removeItem('bkwa_fog_oil_distribution_v1');

    console.log('[Sync] Data lokal Modul 1, 2, 4 berhasil di-reset. Data Modul 3 (Maintenance Breakdown) tetap aman.');
  } catch (err) {
    console.error('Error clearing local modules 1, 2, 4:', err);
  }
}

// Jalankan pembersihan awal saat script dimuat
cleanLocalDuplicates();

// Unggah SEMUA modul (Modul 1 s/d Modul 7 lengkap) ke Cloud Firestore secara menyeluruh
export async function uploadAllLocalDataToFirestore(): Promise<{ success: boolean; message: string; count: number }> {
  updateStatus({ isSyncing: true, error: null });
  let count = 0;

  try {
    // Helper uploader koleksi
    const uploadCollectionFromKey = async (localStorageKey: string, firestoreCol: string, entityType: string) => {
      const raw = localStorage.getItem(localStorageKey);
      if (!raw) return;
      try {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Bersihkan duplikat terlebih dahulu
          parsed = deduplicateEntityList(entityType, parsed);
          localStorage.setItem(localStorageKey, JSON.stringify(parsed));
          for (const item of parsed) {
            if (item) {
              const docId = getDeterministicDocId(firestoreCol, item);
              await syncItemToFirestore(firestoreCol, docId, item);
              count++;
            }
          }
        }
      } catch (err) {
        console.warn(`Gagal parse & upload ${localStorageKey}:`, err);
      }
    };

    // 1. Akun Pengguna
    await uploadCollectionFromKey('bkwa_users_list_v4', 'users', 'users');

    // 2. Modul 1: Asset Units
    await uploadCollectionFromKey('bkwa_asset_units_v2', 'units', 'units');

    // 3. Modul 2: Manpower
    await uploadCollectionFromKey('bkwa_manpower_list_v1', 'manpower', 'manpower');

    // 4. Modul 3: Breakdown Records
    await uploadCollectionFromKey('bkwa_breakdown_records_v1', 'breakdowns', 'breakdowns');

    // 5. Modul 4: FOG (LENGKAP SEMUA SUB-MODUL & OUT FIELD FUEL)
    await uploadCollectionFromKey('bkwa_inventory_out_field_fuel_v1', 'out_field_fuel', 'out_field_fuel');
    await uploadCollectionFromKey('bkwa_inventory_fuel_dist_v2', 'fuel_distributions', 'fuel_distributions');
    await uploadCollectionFromKey('bkwa_inventory_oil_dist_v2', 'oil_distributions', 'oil_distributions');
    await uploadCollectionFromKey('bkwa_inventory_fuel_stock_v2', 'fuel_stocks', 'fuel_stocks');
    await uploadCollectionFromKey('bkwa_inventory_oil_stock_v2', 'oil_stocks', 'oil_stocks');
    await uploadCollectionFromKey('bkwa_inventory_fuel_transfer_v2', 'fuel_transfers', 'fuel_transfers');
    await uploadCollectionFromKey('bkwa_inventory_suppliers_v2', 'suppliers', 'suppliers');
    await uploadCollectionFromKey('bkwa_inventory_grease_stocks_v1', 'grease_stocks', 'grease_stocks');
    await uploadCollectionFromKey('bkwa_inventory_grease_dist_v1', 'grease_distributions', 'grease_distributions');
    await uploadCollectionFromKey('bkwa_fog_distribution_v1', 'fog_fuel_distributions', 'fog_fuel_distributions');
    await uploadCollectionFromKey('bkwa_fog_stock_inputs_v1', 'fog_stock_inputs', 'fog_stock_inputs');
    await uploadCollectionFromKey('bkwa_fog_oil_distribution_v1', 'fog_oil_distributions', 'fog_oil_distributions');

    // 6. Modul 5: P2H Records
    await uploadCollectionFromKey('bkwa_p2h_records_v1', 'p2h_records', 'p2h_records');

    // 7. Modul 6: Spare Parts & Purchase Requests
    await uploadCollectionFromKey('bkwa_spare_parts_v1', 'spare_parts', 'spare_parts');
    await uploadCollectionFromKey('bkwa_sp_transactions_v1', 'spare_part_transactions', 'spare_part_transactions');
    await uploadCollectionFromKey('bkwa_purchase_requests_v1', 'purchase_requests', 'purchase_requests');

    // 8. Modul 7: Tyre Management System
    await uploadCollectionFromKey('bkwa_tyre_registrations_v1', 'tyre_records', 'tyre_records');
    await uploadCollectionFromKey('bkwa_tyre_installs_v1', 'tyre_installs', 'tyre_installs');
    await uploadCollectionFromKey('bkwa_tyre_removes_v1', 'tyre_removes', 'tyre_removes');

    // 9. Activity Logs
    await uploadCollectionFromKey('bkwa_activity_logs_v2', 'activity_logs', 'activity_logs');

    updateStatus({
      connected: true,
      isSyncing: false,
      lastSyncTime: new Date().toLocaleTimeString('id-ID'),
      totalSyncedItems: count,
    });

    return {
      success: true,
      message: `Berhasil menyinkronkan seluruh modul (Modul 1 s/d 7, total ${count} data) ke Cloud Firebase Firestore secara terpusat!`,
      count,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    updateStatus({ isSyncing: false, error: errMsg });
    return {
      success: false,
      message: `Gagal upload ke Firestore: ${errMsg}`,
      count,
    };
  }
}

// Tarik (Download/Fetch) SELURUH data dari Cloud Firestore ke browser ini secara instan
export async function downloadAllFirestoreDataToLocal(): Promise<{ 
  success: boolean; 
  message: string; 
  count: number; 
  breakdown: Record<string, number> 
}> {
  updateStatus({ isSyncing: true, error: null });
  let totalCount = 0;
  const breakdown: Record<string, number> = {};

  const pullCollection = async (collectionName: string, localStorageKey: string, entityType: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      const docsData: any[] = [];
      snap.forEach((d) => docsData.push(d.data()));
      breakdown[collectionName] = docsData.length;

      if (docsData.length > 0) {
        const localRaw = localStorage.getItem(localStorageKey);
        const localData = localRaw ? JSON.parse(localRaw) : [];
        const combined = [...(Array.isArray(localData) ? localData : []), ...docsData];
        const deduped = deduplicateEntityList(entityType, combined);
        localStorage.setItem(localStorageKey, JSON.stringify(deduped));
        totalCount += docsData.length;
      }
    } catch (e) {
      console.warn(`Gagal menarik koleksi ${collectionName}:`, e);
      breakdown[collectionName] = 0;
    }
  };

  try {
    // 1. Akun Pengguna & Hak Akses
    await pullCollection('users', 'bkwa_users_list_v4', 'users');

    // 2. Modul 1: Asset Units
    await pullCollection('units', 'bkwa_asset_units_v2', 'units');

    // 3. Modul 2: Manpower
    await pullCollection('manpower', 'bkwa_manpower_list_v1', 'manpower');

    // 4. Modul 3: Breakdown Records
    await pullCollection('breakdowns', 'bkwa_breakdown_records_v1', 'breakdowns');

    // 5. Modul 4: FOG (Semua Sub-Modul)
    await pullCollection('out_field_fuel', 'bkwa_inventory_out_field_fuel_v1', 'out_field_fuel');
    await pullCollection('fuel_distributions', 'bkwa_inventory_fuel_dist_v2', 'fuel_distributions');
    await pullCollection('oil_distributions', 'bkwa_inventory_oil_dist_v2', 'oil_distributions');
    await pullCollection('fuel_stocks', 'bkwa_inventory_fuel_stock_v2', 'fuel_stocks');
    await pullCollection('oil_stocks', 'bkwa_inventory_oil_stock_v2', 'oil_stocks');
    await pullCollection('fuel_transfers', 'bkwa_inventory_fuel_transfer_v2', 'fuel_transfers');
    await pullCollection('suppliers', 'bkwa_inventory_suppliers_v2', 'suppliers');
    await pullCollection('grease_stocks', 'bkwa_inventory_grease_stocks_v1', 'grease_stocks');
    await pullCollection('grease_distributions', 'bkwa_inventory_grease_dist_v1', 'grease_distributions');
    await pullCollection('fog_fuel_distributions', 'bkwa_fog_distribution_v1', 'fog_fuel_distributions');
    await pullCollection('fog_stock_inputs', 'bkwa_fog_stock_inputs_v1', 'fog_stock_inputs');
    await pullCollection('fog_oil_distributions', 'bkwa_fog_oil_distribution_v1', 'fog_oil_distributions');

    // 6. Modul 5: P2H Records
    await pullCollection('p2h_records', 'bkwa_p2h_records_v1', 'p2h_records');

    // 7. Modul 6: Spare Parts & PR
    await pullCollection('spare_parts', 'bkwa_spare_parts_v1', 'spare_parts');
    await pullCollection('spare_part_transactions', 'bkwa_sp_transactions_v1', 'spare_part_transactions');
    await pullCollection('purchase_requests', 'bkwa_purchase_requests_v1', 'purchase_requests');

    // 8. Modul 7: Tyre Management System
    await pullCollection('tyre_records', 'bkwa_tyre_registrations_v1', 'tyre_records');
    await pullCollection('tyre_installs', 'bkwa_tyre_installs_v1', 'tyre_installs');
    await pullCollection('tyre_removes', 'bkwa_tyre_removes_v1', 'tyre_removes');

    // 9. Activity Logs
    await pullCollection('activity_logs', 'bkwa_activity_logs_v2', 'activity_logs');

    updateStatus({
      connected: true,
      isSyncing: false,
      lastSyncTime: new Date().toLocaleTimeString('id-ID'),
      totalSyncedItems: totalCount,
    });

    window.dispatchEvent(new CustomEvent('bkwa-firestore-synced', { detail: { action: 'pullAll' } }));

    return {
      success: true,
      message: `Berhasil menarik total ${totalCount} data dari Cloud Firestore ke browser ini!`,
      count: totalCount,
      breakdown,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    updateStatus({ isSyncing: false, error: errMsg });
    return {
      success: false,
      message: `Gagal menarik data dari Firestore: ${errMsg}`,
      count: totalCount,
      breakdown,
    };
  }
}

// Cek jumlah data riil yang ada di Cloud Firestore saat ini untuk setiap modul
export async function checkFirestoreDatabaseCounts(): Promise<{
  categories: { module: string; name: string; count: number; collection: string; status: 'ready' | 'empty' }[];
  total: number;
}> {
  const collectionList = [
    { module: 'Modul 1', name: 'Asset Alat Berat & Armada', collection: 'units' },
    { module: 'Modul 2', name: 'Manpower Tim Workshop', collection: 'manpower' },
    { module: 'Modul 3', name: 'Breakdown & Maintenance Order', collection: 'breakdowns' },
    { module: 'Modul 4', name: 'Out Field Fuel (SPBU Luar)', collection: 'out_field_fuel' },
    { module: 'Modul 4', name: 'Distribusi Solar Harian', collection: 'fuel_distributions' },
    { module: 'Modul 4', name: 'Stok Solar Masuk Tangki', collection: 'fuel_stocks' },
    { module: 'Modul 4', name: 'Transfer Tangki Induk ke FT', collection: 'fuel_transfers' },
    { module: 'Modul 4', name: 'Distribusi Pelumas Oli', collection: 'oil_distributions' },
    { module: 'Modul 4', name: 'Stok Pelumas Oli Masuk', collection: 'oil_stocks' },
    { module: 'Modul 4', name: 'Pemakaian Grease Pelumas', collection: 'grease_distributions' },
    { module: 'Modul 4', name: 'Stok Grease Masuk', collection: 'grease_stocks' },
    { module: 'Modul 4', name: 'Daftar Suplier & Distributor FOG', collection: 'suppliers' },
    { module: 'Modul 5', name: 'Pemeriksaan P2H Harian Unit', collection: 'p2h_records' },
    { module: 'Modul 6', name: 'Inventory Master Spare Part', collection: 'spare_parts' },
    { module: 'Modul 6', name: 'Purchase Request (PR)', collection: 'purchase_requests' },
    { module: 'Modul 7', name: 'Registrasi Master Tyre (Ban)', collection: 'tyre_records' },
    { module: 'Sistem', name: 'Akun Pengguna & Hak Akses', collection: 'users' },
  ];

  let total = 0;
  const categories: { module: string; name: string; count: number; collection: string; status: 'ready' | 'empty' }[] = [];

  for (const item of collectionList) {
    try {
      const snap = await getDocs(collection(db, item.collection));
      const count = snap.size;
      total += count;
      categories.push({
        ...item,
        count,
        status: count > 0 ? 'ready' : 'empty'
      });
    } catch (_) {
      categories.push({
        ...item,
        count: 0,
        status: 'empty'
      });
    }
  }

  return { categories, total };
}

// Pasang Real-Time onSnapshot listener ke Firestore untuk multi-user / multi-device realtime update
export function setupRealtimeFirestoreListeners(onUpdateCallback?: (collection: string) => void): () => void {
  const unsubscribes: (() => void)[] = [];

  const attachListener = (collectionName: string, localStorageKey: string, entityType: string) => {
    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (snapshot.empty && !localStorage.getItem(localStorageKey)) return;
          
          const docsData: any[] = [];
          snapshot.forEach((docSnap) => {
            docsData.push(docSnap.data());
          });

          if (docsData.length > 0) {
            // Ambil data lokal saat ini
            const localRaw = localStorage.getItem(localStorageKey);
            const localData = localRaw ? JSON.parse(localRaw) : [];
            
            // Gabungkan data Firestore ke data lokal dengan deduplikasi cerdas
            const combined = [...(Array.isArray(localData) ? localData : []), ...docsData];
            const deduped = deduplicateEntityList(entityType, combined);

            localStorage.setItem(localStorageKey, JSON.stringify(deduped));
            
            updateStatus({ 
              connected: true, 
              lastSyncTime: new Date().toLocaleTimeString('id-ID'),
              totalSyncedItems: deduped.length
            });

            if (onUpdateCallback) {
              onUpdateCallback(collectionName);
            }
            window.dispatchEvent(new CustomEvent('bkwa-firestore-synced', { detail: { collection: collectionName } }));
          }
        },
        (error) => {
          console.warn(`Firestore listener notice pada [${collectionName}]:`, error);
          if (error.code === 'permission-denied') {
            try {
              handleFirestoreError(error, OperationType.LIST, collectionName);
            } catch (_) {}
          }
        }
      );
      unsubscribes.push(unsub);
    } catch (e) {
      console.warn(`Gagal subscribe koleksi ${collectionName}:`, e);
    }
  };

  // 1. Akun Pengguna
  attachListener('users', 'bkwa_users_list_v4', 'users');

  // 2. Modul 1: Asset Units
  attachListener('units', 'bkwa_asset_units_v2', 'units');

  // 3. Modul 2: Manpower
  attachListener('manpower', 'bkwa_manpower_list_v1', 'manpower');

  // 4. Modul 3: Breakdown
  attachListener('breakdowns', 'bkwa_breakdown_records_v1', 'breakdowns');

  // 5. Modul 4: FOG (LENGKAP SEMUA SUB-MODUL & OUT FIELD FUEL)
  attachListener('out_field_fuel', 'bkwa_inventory_out_field_fuel_v1', 'out_field_fuel');
  attachListener('fuel_distributions', 'bkwa_inventory_fuel_dist_v2', 'fuel_distributions');
  attachListener('oil_distributions', 'bkwa_inventory_oil_dist_v2', 'oil_distributions');
  attachListener('fuel_stocks', 'bkwa_inventory_fuel_stock_v2', 'fuel_stocks');
  attachListener('oil_stocks', 'bkwa_inventory_oil_stock_v2', 'oil_stocks');
  attachListener('fuel_transfers', 'bkwa_inventory_fuel_transfer_v2', 'fuel_transfers');
  attachListener('suppliers', 'bkwa_inventory_suppliers_v2', 'suppliers');
  attachListener('grease_stocks', 'bkwa_inventory_grease_stocks_v1', 'grease_stocks');
  attachListener('grease_distributions', 'bkwa_inventory_grease_dist_v1', 'grease_distributions');
  attachListener('fog_fuel_distributions', 'bkwa_fog_distribution_v1', 'fog_fuel_distributions');
  attachListener('fog_stock_inputs', 'bkwa_fog_stock_inputs_v1', 'fog_stock_inputs');
  attachListener('fog_oil_distributions', 'bkwa_fog_oil_distribution_v1', 'fog_oil_distributions');

  // 6. Modul 5: P2H Records
  attachListener('p2h_records', 'bkwa_p2h_records_v1', 'p2h_records');

  // 7. Modul 6: Spare Parts & PR
  attachListener('spare_parts', 'bkwa_spare_parts_v1', 'spare_parts');
  attachListener('spare_part_transactions', 'bkwa_sp_transactions_v1', 'spare_part_transactions');
  attachListener('purchase_requests', 'bkwa_purchase_requests_v1', 'purchase_requests');

  // 8. Modul 7: Tyre Management System
  attachListener('tyre_records', 'bkwa_tyre_registrations_v1', 'tyre_records');
  attachListener('tyre_installs', 'bkwa_tyre_installs_v1', 'tyre_installs');
  attachListener('tyre_removes', 'bkwa_tyre_removes_v1', 'tyre_removes');

  // 9. Activity Logs
  attachListener('activity_logs', 'bkwa_activity_logs_v2', 'activity_logs');

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
