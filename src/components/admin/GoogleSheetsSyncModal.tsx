import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Lock, 
  Check, 
  Database,
  ArrowRight,
  LogOut,
  Info
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  initGoogleAuth, 
  signInWithGoogle, 
  signOutGoogle, 
  getCachedAccessToken 
} from '../../services/googleAuth';
import { 
  getSavedSpreadsheetId, 
  setSavedSpreadsheetId, 
  createBkwaSpreadsheet, 
  syncAllDataToGoogleSheets,
  getLastSyncTime 
} from '../../services/googleSheets';
import { 
  AssetUnit, 
  ManpowerData, 
  BreakdownRecord, 
  SupplierRecord, 
  FuelStockInputRecord, 
  FuelTransferRecord, 
  OilStockInputRecord, 
  FuelDistributionRecord, 
  OilDistributionRecord,
  P2HRecord,
} from '../../types';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: AssetUnit[];
  manpower: ManpowerData[];
  breakdowns: BreakdownRecord[];
  suppliers: SupplierRecord[];
  fuelStocks: FuelStockInputRecord[];
  fuelTransfers: FuelTransferRecord[];
  oilStocks: OilStockInputRecord[];
  fuelDistributions: FuelDistributionRecord[];
  oilDistributions: OilDistributionRecord[];
  p2hRecords?: P2HRecord[];
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  units,
  manpower,
  breakdowns,
  suppliers,
  fuelStocks,
  fuelTransfers,
  oilStocks,
  fuelDistributions,
  oilDistributions,
  p2hRecords = [],
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [customIdInput, setCustomIdInput] = useState<string>('');
  const [isCreatingSheet, setIsCreatingSheet] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Mandatory confirmation dialog for mutating external Google Sheets data
  const [showConfirmSync, setShowConfirmSync] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved sheet ID & last sync time
    const savedId = getSavedSpreadsheetId();
    if (savedId) {
      setSpreadsheetId(savedId);
      setCustomIdInput(savedId);
    }
    const savedLastSync = getLastSyncTime();
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync).toLocaleString('id-ID'));
    }

    // Check Google Auth state
    const token = getCachedAccessToken();
    setHasToken(!!token);

    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasToken(!!token);
      },
      () => {
        setHasToken(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      setHasToken(true);
      
      const currentSavedId = spreadsheetId || getSavedSpreadsheetId();
      if (!currentSavedId) {
        // Otomatis buat spreadsheet baru di Google Drive pengguna dan lakukan sinkronisasi pertama
        setIsCreatingSheet(true);
        setStatusMessage({ 
          type: 'info', 
          text: `Akun Google ${res.user.email} terhubung! Sedang otomatis membuat file 'BKWA Maintenance & Logistik Database' di Google Drive Anda...` 
        });

        const newId = await createBkwaSpreadsheet('BKWA Maintenance & Logistik Database');
        setSpreadsheetId(newId);
        setCustomIdInput(newId);
        setSavedSpreadsheetId(newId);
        
        setIsCreatingSheet(false);
        setIsSyncing(true);
        setStatusMessage({ 
          type: 'info', 
          text: `File Google Sheet baru berhasil dibuat di Google Drive! Sedang menyinkronkan seluruh data aplikasi ke dalam spreadsheet...` 
        });

        const syncResult = await syncAllDataToGoogleSheets(newId, {
          units,
          manpower,
          breakdowns,
          suppliers,
          fuelStocks,
          fuelTransfers,
          oilStocks,
          fuelDistributions,
          oilDistributions,
        });

        setLastSync(syncResult.timestamp);
        setStatusMessage({ 
          type: 'success', 
          text: `Selamat! File 'BKWA Maintenance & Logistik Database' telah aktif di Google Drive akun ${res.user.email} dan ${syncResult.syncedCount} baris data berhasil disinkronkan!` 
        });
      } else {
        setStatusMessage({ 
          type: 'success', 
          text: `Berhasil terhubung dengan Google Account: ${res.user.email}. ID Spreadsheet aktif: ${currentSavedId}` 
        });
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Gagal masuk Google: ${err.message || 'Izin ditolak atau popup dibatalkan.'}` 
      });
    } finally {
      setIsSigningIn(false);
      setIsCreatingSheet(false);
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setHasToken(false);
    setStatusMessage({ type: 'info', text: 'Koneksi Google telah diputuskan.' });
  };

  const handleCreateNewSheet = async () => {
    if (!hasToken) {
      setStatusMessage({ type: 'error', text: 'Silakan Login dengan Akun Google terlebih dahulu.' });
      return;
    }
    setIsCreatingSheet(true);
    setStatusMessage(null);
    try {
      const newId = await createBkwaSpreadsheet('BKWA Maintenance & Logistik Database');
      setSpreadsheetId(newId);
      setCustomIdInput(newId);
      setStatusMessage({ 
        type: 'success', 
        text: 'File Google Spreadsheet baru berhasil dibuat di Google Drive Anda!' 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: `Gagal membuat spreadsheet: ${err.message}` 
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSaveCustomId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdInput.trim()) return;
    setSpreadsheetId(customIdInput.trim());
    setSavedSpreadsheetId(customIdInput.trim());
    setStatusMessage({ type: 'success', text: 'ID Google Spreadsheet berhasil disimpan.' });
  };

  // Perform full sync after explicit confirmation
  const handleExecuteSync = async () => {
    setShowConfirmSync(false);
    if (!hasToken) {
      setStatusMessage({ type: 'error', text: 'Silakan Login Akun Google terlebih dahulu.' });
      return;
    }
    if (!spreadsheetId) {
      setStatusMessage({ type: 'error', text: 'Pilih atau Buat Google Spreadsheet terlebih dahulu.' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const result = await syncAllDataToGoogleSheets(spreadsheetId, {
        units,
        manpower,
        breakdowns,
        suppliers,
        fuelStocks,
        fuelTransfers,
        oilStocks,
        fuelDistributions,
        oilDistributions,
        p2hRecords,
      });

      setLastSync(result.timestamp);
      setStatusMessage({ 
        type: 'success', 
        text: `Berhasil! ${result.syncedCount} total baris data (Asset, Manpower, Breakdown, BBM, Oli & P2H) telah disinkronkan ke Google Spreadsheet.` 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: `Sinkronisasi gagal: ${err.message}` 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalDataCount = 
    units.length + 
    manpower.length + 
    breakdowns.length + 
    suppliers.length + 
    fuelStocks.length + 
    fuelTransfers.length + 
    oilStocks.length + 
    fuelDistributions.length + 
    oilDistributions.length +
    (p2hRecords?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 font-mono tracking-tight flex items-center gap-2">
                Integrasi Google Sheets & Drive
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Resmi Google Workspace
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Penyimpanan dan pencatatan seluruh data aplikasi ke Google Spreadsheet akun Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Panduan Akun & Google Drive */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-stone-300 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono uppercase tracking-wide">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Penting: Mengapa File Belum Ada di Google Drive Anda?</span>
            </div>
            <p className="leading-relaxed">
              Pemberian izin di sistem Cloud telah selesai, namun file Spreadsheet baru akan <strong>dibuat di dalam Google Drive akun Anda</strong> setelah Anda menekan tombol <strong>&ldquo;Sign in with Google&rdquo;</strong> di bawah ini (1x klik).
            </p>
            <div className="p-2.5 rounded-lg bg-stone-900/90 border border-stone-800 space-y-1.5">
              <p className="font-semibold text-stone-200">Cara Mengaktifkan File ke Drive Akun Anda:</p>
              <ol className="list-decimal list-inside space-y-1 text-stone-400 pl-1">
                <li>Klik tombol putih <strong className="text-stone-100">&ldquo;Sign in with Google&rdquo;</strong> pada Langkah 1 di bawah.</li>
                <li>Pilih akun Google Anda (misal: <strong className="text-amber-300 font-mono">bkwa.maintenance2026@gmail.com</strong>).</li>
                <li>Aplikasi akan <strong>otomatis langsung membuat file &ldquo;BKWA Maintenance &amp; Logistik Database&rdquo;</strong> di Google Drive Anda dan menyinkronkan seluruh data!</li>
              </ol>
            </div>
          </div>

          {/* Status Feedback Banner */}
          {statusMessage && (
            <div 
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-200' 
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-700/50 text-rose-200'
                  : 'bg-blue-950/50 border-blue-700/50 text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
              <div className="flex-1 leading-relaxed font-medium">{statusMessage.text}</div>
            </div>
          )}

          {/* STEP 1: Google Account Authentication */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">1</span>
                <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                  Koneksi Akun Google
                </h3>
              </div>
              {hasToken ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3" /> Terhubung
                </span>
              ) : (
                <span className="text-[11px] text-stone-400">Belum Terhubung</span>
              )}
            </div>

            {hasToken && googleUser ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-stone-900 border border-stone-800">
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img 
                      src={googleUser.photoURL} 
                      alt="Google Profile" 
                      className="w-9 h-9 rounded-full border border-stone-700" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 font-bold text-xs">
                      {googleUser.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-stone-200">
                      {googleUser.displayName || 'Akun Google Terhubung'}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {googleUser.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan Koneksi</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-stone-900/80 border border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-stone-400 leading-relaxed">
                  Hubungkan dengan akun Google Anda (misal: <span className="text-amber-400 font-mono">bkwa.maintenance2026@gmail.com</span>) untuk memberikan izin pencatatan ke Google Drive & Sheets.
                </p>

                {/* Official "Sign in with Google" button style as per skill */}
                <button
                  id="btn-google-signin"
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleSignIn}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs shadow-md transition active:scale-95 shrink-0 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Spreadsheet Target & Drive File */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">2</span>
                <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                  File Google Spreadsheet Target
                </h3>
              </div>
              {spreadsheetId ? (
                <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <Database className="w-3 h-3" /> Siap Digunakan
                </span>
              ) : (
                <span className="text-[11px] text-stone-500">Belum Ada Spreadsheet</span>
              )}
            </div>

            {spreadsheetId ? (
              <div className="p-3.5 rounded-lg bg-stone-900 border border-stone-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      BKWA Maintenance & Logistik Database
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono break-all mt-0.5">
                      ID: {spreadsheetId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition shrink-0 shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Buka Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="https://drive.google.com/drive/my-drive"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 transition shrink-0"
                    >
                      <span>Buka Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800 flex items-center justify-between">
                  <span>Status: Terhubung ke Google Drive</span>
                  {lastSync && (
                    <span className="text-stone-300">
                      Sinkronisasi Terakhir: <strong className="text-amber-400">{lastSync}</strong>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-stone-900 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-200">
                    Buat Spreadsheet Otomatis
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Sistem akan otomatis membuat file Google Sheets baru dengan tab lengkap (Asset, Manpower, Breakdown, BBM & Oli) langsung di Google Drive Anda.
                  </p>
                </div>

                <button
                  id="btn-create-spreadsheet"
                  type="button"
                  disabled={!hasToken || isCreatingSheet}
                  onClick={handleCreateNewSheet}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingSheet ? 'Membuat File...' : 'Buat Spreadsheet Baru'}</span>
                </button>
              </div>
            )}

            {/* Opsi masukkan ID manual jika sudah punya */}
            <details className="text-xs text-stone-400 pt-1">
              <summary className="cursor-pointer hover:text-stone-200 font-medium select-none">
                Gunakan ID Google Spreadsheet Yang Sudah Ada
              </summary>
              <form onSubmit={handleSaveCustomId} className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Tempel ID Spreadsheet Google di sini..."
                  value={customIdInput}
                  onChange={(e) => setCustomIdInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700"
                >
                  Tautkan
                </button>
              </form>
            </details>
          </div>

          {/* STEP 3: Data Ringkasan Yang Siap Disinkronkan */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">3</span>
                <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                  Data Yang Siap Disimpan Ke Google Sheets
                </h3>
              </div>
              <span className="text-[11px] font-bold font-mono text-amber-400">
                Total: {totalDataCount} Baris Record
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Modul 1: Asset Unit</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{units.length} Unit</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Modul 2: Manpower</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{manpower.length} Orang</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Modul 3: Breakdown</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{breakdowns.length} SPK Kasus</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Supplier & Vendor</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{suppliers.length} Vendor</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Stok Masuk Solar</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{fuelStocks.length} Record DO</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Transfer Solar FT</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{fuelTransfers.length} Record</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Stok Masuk Oli</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{oilStocks.length} Record</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Distribusi Solar Unit</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{fuelDistributions.length} Pengisian</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase font-mono">Distribusi Oli Unit</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{oilDistributions.length} Pengisian</div>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-amber-800/40">
                <div className="text-[10px] text-amber-400 uppercase font-mono">Modul 5: P2H Unit</div>
                <div className="text-sm font-bold text-stone-100 mt-0.5">{p2hRecords.length} Form Terisi</div>
              </div>
            </div>
          </div>

          {/* SINKRONISASI ACTION BUTTON */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-stone-400">
              Setiap kali Anda klik sinkronisasi, data terbaru di Google Sheets akan langsung diperbarui rapi.
            </div>

            <button
              id="btn-trigger-sync"
              type="button"
              disabled={!hasToken || !spreadsheetId || isSyncing}
              onClick={() => setShowConfirmSync(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan ke Google Sheets...' : 'Sinkronkan Semua Data Sekarang'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-semibold text-stone-200 transition"
          >
            Tutup
          </button>
        </div>

        {/* MANDATORY CONFIRMATION DIALOG (Workspace skill requirement for data updates) */}
        {showConfirmSync && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-100 font-mono">
                  Konfirmasi Sinkronisasi Google Sheets
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Apakah Anda yakin ingin memperbarui file Google Spreadsheet target dengan <strong className="text-emerald-400">{totalDataCount} baris data terkini</strong> dari aplikasi BKWA Maintenance?
                </p>
              </div>

              <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-400 text-left space-y-1">
                <div>• Target: <span className="font-mono text-stone-200">BKWA Maintenance & Logistik Database</span></div>
                <div>• Akun: <span className="font-mono text-stone-200">{googleUser?.email || 'Google Account'}</span></div>
                <div>• Tab: Ringkasan, Asset, Manpower, Breakdown, Suplier, dan Stok/Distribusi BBM & Oli</div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSync(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-sheets-sync"
                  type="button"
                  onClick={handleExecuteSync}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Ya, Sinkronkan Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
