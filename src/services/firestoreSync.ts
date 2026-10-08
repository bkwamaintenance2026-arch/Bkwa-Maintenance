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

// Push 1 item ke koleksi Firestore secara realtime
export async function syncItemToFirestore(collectionName: string, id: string, data: any): Promise<void> {
  if (!id) return;
  try {
    const docRef = doc(db, collectionName, String(id));
    const cleanData = sanitizeForFirestore({
      ...data,
      _updatedAtServer: new Date().toISOString()
    });
    await setDoc(docRef, cleanData, { merge: true });
    updateStatus({ connected: true, lastSyncTime: new Date().toLocaleTimeString('id-ID') });
  } catch (err) {
    console.error(`Gagal sync ke Firestore [${collectionName}/${id}]:`, err);
    // Jangan crash UI jika koneksi sedang offline
  }
}

// Hapus 1 item dari Firestore
export async function deleteItemFromFirestore(collectionName: string, id: string): Promise<void> {
  if (!id) return;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
    updateStatus({ connected: true, lastSyncTime: new Date().toLocaleTimeString('id-ID') });
  } catch (err) {
    console.error(`Gagal hapus di Firestore [${collectionName}/${id}]:`, err);
  }
}

// Unggah semua database lokal (localStorage) ke Cloud Firestore secara menyeluruh
export async function uploadAllLocalDataToFirestore(): Promise<{ success: boolean; message: string; count: number }> {
  updateStatus({ isSyncing: true, error: null });
  let count = 0;

  try {
    // 1. Users
    const usersStr = localStorage.getItem('bkwa_users_list_v4');
    if (usersStr) {
      const users = JSON.parse(usersStr);
      if (Array.isArray(users)) {
        for (const u of users) {
          if (u.id) {
            await syncItemToFirestore('users', u.id, u);
            count++;
          }
        }
      }
    }

    // 2. Asset Units
    const unitsStr = localStorage.getItem('bkwa_asset_units_v2');
    if (unitsStr) {
      const units = JSON.parse(unitsStr);
      if (Array.isArray(units)) {
        for (const unit of units) {
          if (unit.id) {
            await syncItemToFirestore('units', unit.id, unit);
            count++;
          }
        }
      }
    }

    // 3. Manpower
    const mpStr = localStorage.getItem('bkwa_manpower_list_v1');
    if (mpStr) {
      const mps = JSON.parse(mpStr);
      if (Array.isArray(mps)) {
        for (const mp of mps) {
          if (mp.id) {
            await syncItemToFirestore('manpower', mp.id, mp);
            count++;
          }
        }
      }
    }

    // 4. Breakdown
    const bdStr = localStorage.getItem('bkwa_breakdown_records_v1');
    if (bdStr) {
      const bds = JSON.parse(bdStr);
      if (Array.isArray(bds)) {
        for (const bd of bds) {
          if (bd.id) {
            await syncItemToFirestore('breakdowns', bd.id, bd);
            count++;
          }
        }
      }
    }

    // 5. P2H Records
    const p2hStr = localStorage.getItem('bkwa_p2h_records_v1');
    if (p2hStr) {
      const p2hs = JSON.parse(p2hStr);
      if (Array.isArray(p2hs)) {
        for (const p of p2hs) {
          if (p.id) {
            await syncItemToFirestore('p2h_records', p.id, p);
            count++;
          }
        }
      }
    }

    // 6. Spare Parts
    const spStr = localStorage.getItem('bkwa_spare_parts_v1');
    if (spStr) {
      const sps = JSON.parse(spStr);
      if (Array.isArray(sps)) {
        for (const sp of sps) {
          if (sp.id) {
            await syncItemToFirestore('spare_parts', sp.id, sp);
            count++;
          }
        }
      }
    }

    // 7. Tyre Records
    const tyreStr = localStorage.getItem('bkwa_tyre_registrations_v1');
    if (tyreStr) {
      const tyres = JSON.parse(tyreStr);
      if (Array.isArray(tyres)) {
        for (const t of tyres) {
          if (t.id) {
            await syncItemToFirestore('tyre_records', t.id, t);
            count++;
          }
        }
      }
    }

    updateStatus({
      connected: true,
      isSyncing: false,
      lastSyncTime: new Date().toLocaleTimeString('id-ID'),
      totalSyncedItems: count,
    });

    return {
      success: true,
      message: `Berhasil menyinkronkan ${count} data ke Cloud Firebase Firestore secara terpusat!`,
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

// Pasang Real-Time onSnapshot listener ke Firestore untuk multi-user / multi-device realtime update
export function setupRealtimeFirestoreListeners(onUpdateCallback?: (collection: string) => void): () => void {
  const unsubscribes: (() => void)[] = [];

  const attachListener = (collectionName: string, localStorageKey: string) => {
    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (snapshot.empty && !localStorage.getItem(localStorageKey)) return;
          
          const docsData: any[] = [];
          snapshot.forEach((doc) => {
            docsData.push(doc.data());
          });

          if (docsData.length > 0) {
            // Gabungkan atau perbarui ke localStorage
            const localRaw = localStorage.getItem(localStorageKey);
            const localData = localRaw ? JSON.parse(localRaw) : [];
            
            // Map berdasarkan ID
            const map = new Map<string, any>();
            if (Array.isArray(localData)) {
              localData.forEach((item) => {
                if (item && item.id) map.set(item.id, item);
              });
            }
            docsData.forEach((item) => {
              if (item && item.id) map.set(item.id, item);
            });

            const merged = Array.from(map.values());
            localStorage.setItem(localStorageKey, JSON.stringify(merged));
            
            updateStatus({ 
              connected: true, 
              lastSyncTime: new Date().toLocaleTimeString('id-ID'),
              totalSyncedItems: merged.length
            });

            if (onUpdateCallback) {
              onUpdateCallback(collectionName);
            }
            window.dispatchEvent(new CustomEvent('bkwa-firestore-synced', { detail: { collection: collectionName } }));
          }
        },
        (error) => {
          console.warn(`Firestore listener error pada [${collectionName}]:`, error);
          // Tangani dengan handler standar jika error izin
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

  attachListener('users', 'bkwa_users_list_v4');
  attachListener('units', 'bkwa_asset_units_v2');
  attachListener('manpower', 'bkwa_manpower_list_v1');
  attachListener('breakdowns', 'bkwa_breakdown_records_v1');
  attachListener('p2h_records', 'bkwa_p2h_records_v1');
  attachListener('spare_parts', 'bkwa_spare_parts_v1');
  attachListener('tyre_records', 'bkwa_tyre_registrations_v1');
  attachListener('fog_records', 'bkwa_fog_distribution_v1');
  attachListener('activity_logs', 'bkwa_activity_logs_v2');

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
