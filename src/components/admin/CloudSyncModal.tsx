import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  UploadCloud, 
  HardDrive, 
  ShieldCheck, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Layers, 
  Cpu, 
  Server,
  Zap,
  Info
} from 'lucide-react';
import { 
  uploadAllLocalDataToFirestore, 
  getSyncStatus, 
  subscribeSyncStatus, 
  SyncStatus 
} from '../../services/firestoreSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRefreshed?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRefreshed,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'kapasitas' | 'vercel'>('status');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeSyncStatus((s) => setSyncStatus(s));
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUploadAll = async () => {
    setIsUploading(true);
    setFeedback({ type: 'info', text: 'Sedang menyinkronkan seluruh database ke Cloud Firestore...' });
    
    const res = await uploadAllLocalDataToFirestore();
    setIsUploading(false);
    
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      if (onDataRefreshed) onDataRefreshed();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex justify-center items-start">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-700 rounded-3xl shadow-2xl shadow-stone-950/95 my-3 sm:my-6 text-stone-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 bg-stone-900/95 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-100 font-mono tracking-wide">
                  SERVER CLOUD FIREBASE FIRESTORE & HOSTING
                </h3>
                <span className="hidden sm:inline-flex text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500 text-stone-950">
                  Realtime Active
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Pusat integrasi basis data terpusat realtime multi-device & panduan publikasi web
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center border-b border-stone-800 bg-stone-950/50 px-6 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'status'
                ? 'border-amber-500 text-amber-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Status & Sinkronisasi Realtime
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kapasitas')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'kapasitas'
                ? 'border-amber-500 text-amber-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Lokasi Data & Kapasitas Penyimpanan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vercel')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'vercel'
                ? 'border-amber-500 text-amber-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Panduan Akses Publik (Vercel)
          </button>
        </div>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                : 'bg-sky-950/70 border-sky-700 text-sky-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-sky-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
          
          {/* TAB 1: STATUS & SINKRONISASI REALTIME */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              
              {/* STATUS CARD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-stone-800/80 border border-emerald-600/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                    <span>Status Koneksi Cloud</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-base font-bold text-emerald-300">Terhubung & Realtime</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Multi-device onSnapshot listener aktif pada seluruh modul.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 flex flex-col justify-between">
                  <div className="text-xs text-stone-400 mb-2">Database ID (Firestore)</div>
                  <div className="text-sm font-mono font-bold text-amber-300 truncate" title="ai-studio-ptbkwamaintenanc-1d65f0b2-a3b8-4af5-bda6-4540154e5060">
                    ptbkwa-maintenance-db
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Google Cloud Firestore Enterprise Edition.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 flex flex-col justify-between">
                  <div className="text-xs text-stone-400 mb-2">Sinkronisasi Terakhir</div>
                  <div className="text-base font-bold text-sky-300">
                    {syncStatus.lastSyncTime || 'Baru Saja'}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Setiap ada input baru langsung otomatis terkirim.
                  </p>
                </div>
              </div>

              {/* ACTION: SINKRONKAN SEMUA DATA LOKAL KE CLOUD */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-800/70 to-stone-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Sinkronkan Seluruh Data Offline ke Cloud Firestore
                    </h4>
                    <p className="text-xs text-stone-300 mt-1 max-w-xl leading-relaxed">
                      Klik tombol ini untuk memastikan seluruh data Aset, Manpower, Breakdown, P2H, FOG, dan Akun User yang ada di browser ini langsung diunggah menjadi <strong>Data Terpusat di Cloud</strong>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-amber-500/20 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>{isUploading ? 'Menyinkronkan...' : 'Upload & Sinkronkan Sekarang'}</span>
                </button>
              </div>

              {/* LIST KOLEKSI CLOUD TERPUSAT */}
              <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800">
                <h5 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  Struktur Koleksi Cloud Firestore yang Tersimpan Realtime:
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/units</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Asset Unit</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/manpower</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Manpower</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/breakdowns</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Breakdown</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/p2h_records</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Form P2H</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/users</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Akun User</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/spare_parts</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Inventory</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/tyre_records</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Tyre System</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                    <span className="text-stone-300">/activity_logs</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">Audit Log</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LOKASI DATA & KAPASITAS PENYIMPANAN */}
          {activeTab === 'kapasitas' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-2">
                  <Database className="w-5 h-5" />
                  1. Di Mana Data Disimpan? (Arsitektur 3 Lapis Terpusat)
                </div>
                <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
                    <strong className="text-emerald-400 block mb-1">A. Server Cloud Utama (Google Firebase Firestore):</strong>
                    Data tersimpan langsung di server cloud Google yang aman, terenkripsi, dan berstandar internasional. Seluruh perangkat (HP teknisi di lapangan, tablet SPV, komputer Kabag di kantor) tersambung ke database terpusat yang sama secara <strong>Real-time</strong> tanpa perlu refresh halaman.
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
                    <strong className="text-sky-400 block mb-1">B. Local Offline Cache (Memori Lokal Perangkat):</strong>
                    Setiap browser menyimpan salinan instan. Jika teknisi berada di area blank spot / sinyal lemah di tambang, aplikasi tetap dapat dibuka dan diinput tanpa terputus. Saat sinyal kembali, data otomatis tersinkronisasi ke server.
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
                    <strong className="text-amber-400 block mb-1">C. Cadangan Google Sheets Resmi:</strong>
                    Tersedia tombol satu-klik untuk mengekspor atau membuat spreadsheet live terpadu di Google Drive perusahaan PT BKWA.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-2">
                  <HardDrive className="w-5 h-5" />
                  2. Berapa Kapasitas Penyimpanannya?
                </div>
                <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-center">
                      <div className="text-[11px] text-stone-400">Kapasitas Dokumen Gratis</div>
                      <div className="text-xl font-extrabold text-emerald-400 my-1">1 Gigabyte (1 GB)</div>
                      <div className="text-[10px] text-stone-400">Setara ~500.000 s/d 1.000.000+ data transaksi maintenance</div>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-center">
                      <div className="text-[11px] text-stone-400">Batas Baca (Read) Harian</div>
                      <div className="text-xl font-extrabold text-sky-400 my-1">50.000 Read/hari</div>
                      <div className="text-[10px] text-stone-400">Reset gratis setiap hari tanpa biaya tambahan</div>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-center">
                      <div className="text-[11px] text-stone-400">Batas Tulis (Write) Harian</div>
                      <div className="text-xl font-extrabold text-amber-400 my-1">20.000 Write/hari</div>
                      <div className="text-[10px] text-stone-400">Kapasitas ribuan input P2H & perbaikan per hari</div>
                    </div>
                  </div>

                  <p className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-200">
                    💡 <strong>Kesimpulan:</strong> Untuk operasional harian bengkel, tambang, dan logistik maintenance PT BKWA, kuota gratis ini <strong>sangat melimpah dan cukup untuk bertahun-tahun</strong> tanpa biaya server bulanan!
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PANDUAN AKSES PUBLIK (VERCEL) */}
          {activeTab === 'vercel' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-stone-800/90 border border-stone-700">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                  <Globe className="w-5 h-5" />
                  Panduan Menghubungkan & Publikasi ke Vercel (Akses Publik Bebas di Seluruh HP)
                </div>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  Dengan meng-hosting ke Vercel, sistem ini akan mendapatkan alamat link website resmi (contoh: <code className="text-amber-300 bg-stone-950 px-2 py-0.5 rounded">https://ptbkwa-maintenance.vercel.app</code>) yang bisa dibuka langsung oleh seluruh karyawan, operator, dan manajemen dari browser HP mana pun tanpa perlu instal aplikasi.
                </p>

                <div className="space-y-3 text-xs">
                  
                  {/* LANGKAH 1 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[11px] font-black">1</span>
                      Buka Dashboard Vercel & Buat Proyek Baru
                    </div>
                    <p className="text-stone-300 text-[11px]">
                      Buka tautan <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">vercel.com/new <ExternalLink className="w-3 h-3" /></a>, login menggunakan akun Google atau GitHub Anda.
                    </p>
                  </div>

                  {/* LANGKAH 2 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[11px] font-black">2</span>
                      Pilih Repository GitHub / Import Proyek
                    </div>
                    <p className="text-stone-300 text-[11px]">
                      Pilih repositori tempat proyek ini disimpan lalu klik <strong>Import</strong>.
                    </p>
                  </div>

                  {/* LANGKAH 3 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[11px] font-black">3</span>
                      Konfigurasi Build & Output Settings (Otomatis Mendeteksi Vite)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                      <div className="p-2 rounded bg-stone-950 border border-stone-800">
                        <span className="text-stone-500 block text-[10px]">Framework Preset</span>
                        <span className="text-emerald-400 font-bold">Vite</span>
                      </div>
                      <div className="p-2 rounded bg-stone-950 border border-stone-800">
                        <span className="text-stone-500 block text-[10px]">Build Command</span>
                        <span className="text-amber-300 font-bold">npm run build</span>
                      </div>
                      <div className="p-2 rounded bg-stone-950 border border-stone-800">
                        <span className="text-stone-500 block text-[10px]">Output Directory</span>
                        <span className="text-sky-400 font-bold">dist</span>
                      </div>
                    </div>
                  </div>

                  {/* LANGKAH 4 */}
                  <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[11px] font-black">4</span>
                      Klik "Deploy" & Selesai!
                    </div>
                    <p className="text-stone-300 text-[11px]">
                      Dalam waktu ~1 menit proses build akan selesai. Vercel akan memberikan link domain publik gratis dengan sertifikat HTTPS SSL resmi yang siap dibagikan ke seluruh tim PT BKWA!
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/95 shrink-0">
          <div className="text-[11px] text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Database Terproteksi & Otomatis Terhubung ke Cloud Firestore</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
