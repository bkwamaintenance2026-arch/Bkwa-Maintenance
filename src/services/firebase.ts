import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore Database (Wajib menyertakan firestoreDatabaseId dari config)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Error Handling Enum & Interfaces sesuai standar Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Uji coba koneksi ke server Firestore saat aplikasi startup
export async function testConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    // Coba simpan atau ambil status koneksi
    await setDoc(testDocRef, {
      status: 'connected',
      timestamp: new Date().toISOString(),
      appName: 'PT BKWA Maintenance System'
    }, { merge: true });
    
    await getDocFromServer(testDocRef);
    console.log('✅ Firebase Firestore Terhubung Sukses (Database ID:', firebaseConfig.firestoreDatabaseId, ')');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firebase Client Offline, data lokal akan digunakan sementara.');
    } else {
      console.error('⚠️ Firebase Connection Check Error:', error);
    }
    return false;
  }
}

// Jalankan tes koneksi saat modul diload
testConnection().catch((err) => console.warn('Koneksi Firestore awal:', err));
