import React, { useState, useMemo } from 'react';
import { TyreRegistration, UserAccount } from '../../types';
import { isDeveloper } from '../../utils/storage';
import { 
  Disc, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Lock, 
  Calendar, 
  Clock, 
  Tag, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  RotateCcw,
  Truck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface TyreRegistrationSubViewProps {
  tyreRegistrations: TyreRegistration[];
  currentUser: UserAccount;
  onSaveRegistration: (
    data: Omit<TyreRegistration, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: TyreRegistration };
  onDeleteRegistration: (id: string) => { success: boolean; message: string };
  generateNextCode: () => string;
  onNavigateToInstall?: (kodeTyre: string) => void;
  selectedTyreToEdit?: TyreRegistration | null;
  onClearSelectedToEdit?: () => void;
}

const COMMON_BRANDS = [
  'Bridgestone',
  'Giti',
  'Michelin',
  'GoodYear',
  'Advance',
  'Triangle',
  'Double Coin',
  'Aeolus',
  'Sailun',
  'Yokohama',
  'Dunlop',
  'Techking',
  'Westlake',
  'Otani'
];

const COMMON_SIZES = [
  '11.00R20',
  '12.00R20',
  '12.00R24',
  '14.00R24',
  '14.00-24',
  '23.5R25',
  '26.5R25',
  '29.5R25',
  '10.00-20',
  '7.50-16',
  '7.50R16',
  '8.25-16',
  '265/65R17',
  '265/70R16'
];

export const TyreRegistrationSubView: React.FC<TyreRegistrationSubViewProps> = ({
  tyreRegistrations,
  currentUser,
  onSaveRegistration,
  onDeleteRegistration,
  generateNextCode,
  onNavigateToInstall,
  selectedTyreToEdit,
  onClearSelectedToEdit,
}) => {
  const isDev = isDeveloper(currentUser);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [kodeTyre, setKodeTyre] = useState('');
  const [merkTyre, setMerkTyre] = useState('');
  const [ukuranTyre, setUkuranTyre] = useState('');
  const [codeExpired, setCodeExpired] = useState('');
  const [initialDepthThread, setInitialDepthThread] = useState<number | ''>(25);
  const [catatan, setCatatan] = useState('');

  // Open Create Modal
  const handleOpenCreate = () => {
    const nextCode = generateNextCode();
    setEditingId(null);
    setKodeTyre(nextCode);
    setMerkTyre('Bridgestone');
    setUkuranTyre('12.00R24');
    setCodeExpired('4827');
    setInitialDepthThread(25);
    setCatatan('');
    setErrorMsg('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: TyreRegistration) => {
    setEditingId(item.id);
    setKodeTyre(item.kodeTyre);
    setMerkTyre(item.merkTyre);
    setUkuranTyre(item.ukuranTyre);
    setCodeExpired(item.codeExpired);
    setInitialDepthThread(item.initialDepthThread ?? 25);
    setCatatan(item.catatan || '');
    setErrorMsg('');
    setShowModal(true);
  };

  React.useEffect(() => {
    if (selectedTyreToEdit) {
      handleOpenEdit(selectedTyreToEdit);
      if (onClearSelectedToEdit) onClearSelectedToEdit();
    }
  }, [selectedTyreToEdit]);

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!kodeTyre.trim()) {
      setErrorMsg('Kode Tyre wajib diisi!');
      return;
    }
    if (!merkTyre.trim()) {
      setErrorMsg('Merk Tyre wajib diisi!');
      return;
    }
    if (!ukuranTyre.trim()) {
      setErrorMsg('Ukuran Tyre wajib diisi!');
      return;
    }
    if (!codeExpired.trim()) {
      setErrorMsg('Code Expired wajib diisi!');
      return;
    }

    const currentTarget = editingId ? tyreRegistrations.find((t) => t.id === editingId) : null;
    const initialDepth = initialDepthThread === '' ? 25 : Number(initialDepthThread);

    const res = onSaveRegistration(
      {
        kodeTyre: kodeTyre.trim().toUpperCase(),
        merkTyre: merkTyre.trim(),
        ukuranTyre: ukuranTyre.trim(),
        codeExpired: codeExpired.trim(),
        initialDepthThread: initialDepth,
        status: currentTarget?.status || 'AVAILABLE',
        currentUnit: currentTarget?.currentUnit,
        currentPosisi: currentTarget?.currentPosisi,
        currentDepthThread: currentTarget?.currentDepthThread ?? initialDepth,
        catatan: catatan.trim(),
        createdBy: currentUser.fullName || currentUser.username,
      },
      editingId || undefined
    );

    if (res.success) {
      setShowModal(false);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return tyreRegistrations.filter((t) => {
      const matchSearch =
        t.kodeTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merkTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ukuranTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.currentUnit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.codeExpired || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'AVAILABLE' && t.status === 'AVAILABLE') ||
        (filterStatus === 'INSTALLED' && t.status === 'INSTALLED') ||
        (filterStatus === 'SCRAP' && t.status === 'SCRAP');

      return matchSearch && matchStatus;
    });
  }, [tyreRegistrations, searchTerm, filterStatus]);

  // Status counts
  const availableCount = tyreRegistrations.filter((t) => t.status === 'AVAILABLE').length;
  const installedCount = tyreRegistrations.filter((t) => t.status === 'INSTALLED').length;
  const scrapCount = tyreRegistrations.filter((t) => t.status === 'SCRAP').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Disc className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono flex items-center gap-2">
                <span>SUB MODUL 1: REGISTRASI MASTER TYRE</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  KODE ET09
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pendaftaran identitas ban (Kode Tyre otomatis ET09-xxxx, Merk, Ukuran, &amp; Code Expired) sebelum dipasang ke unit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-tambah-registrasi-tyre"
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrasi Tyre Baru</span>
            </button>
          </div>
        </div>

        {/* Status Counter Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-800/80">
          <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="text-[10px] font-mono text-stone-500 uppercase">Total Registrasi</div>
            <div className="text-lg font-bold font-mono text-stone-100 mt-0.5">
              {tyreRegistrations.length} <span className="text-xs font-normal text-stone-500">Ban</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
            <div className="text-[10px] font-mono text-emerald-400 uppercase">Ready di Gudang</div>
            <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
              {availableCount} <span className="text-xs font-normal text-emerald-500">Available</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-800/30">
            <div className="text-[10px] font-mono text-blue-400 uppercase">Terpasang di Unit</div>
            <div className="text-lg font-bold font-mono text-blue-300 mt-0.5">
              {installedCount} <span className="text-xs font-normal text-blue-500">Installed</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/30">
            <div className="text-[10px] font-mono text-rose-400 uppercase">Afkir / Scrap</div>
            <div className="text-lg font-bold font-mono text-rose-300 mt-0.5">
              {scrapCount} <span className="text-xs font-normal text-rose-500">Scrap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Privilege Info Banner */}
      <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${isDev ? 'text-amber-400' : 'text-stone-500'}`} />
          <span>
            {isDev ? (
              <span className="text-amber-300 font-semibold font-mono">
                Akun Developer Aktif: Anda memiliki akses penuh untuk Edit dan Delete data registrasi tyre.
              </span>
            ) : (
              <span>Akses Edit &amp; Delete dibatasi khusus untuk Akun Developer.</span>
            )}
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
          User: {currentUser.fullName || currentUser.username} ({currentUser.accountTier || 'Member'})
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-900 border border-stone-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Cari Kode Tyre (ET09-...), Merk, Ukuran, atau CN Unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-emerald-500/60 font-mono"
          >
            <option value="ALL">Semua Status ({tyreRegistrations.length})</option>
            <option value="AVAILABLE">Ready Gudang ({availableCount})</option>
            <option value="INSTALLED">Terpasang Fleet ({installedCount})</option>
            <option value="SCRAP">Scrap / Afkir ({scrapCount})</option>
          </select>
        </div>
      </div>

      {/* Table Data Registrasi Tyre */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">Kode Tyre</th>
                <th className="py-3 px-3">Merk Tyre</th>
                <th className="py-3 px-3">Ukuran Tyre</th>
                <th className="py-3 px-3">Code Expired</th>
                <th className="py-3 px-3 text-right">Initial Tread</th>
                <th className="py-3 px-3 text-center">Status Ban</th>
                <th className="py-3 px-3">Unit / Posisi Terpasang</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500 font-mono text-xs">
                    Tidak ada data registrasi tyre yang sesuai filter / pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((t, index) => {
                  const isInstalled = t.status === 'INSTALLED';
                  const isAvailable = t.status === 'AVAILABLE';
                  const isScrap = t.status === 'SCRAP';

                  return (
                    <tr key={t.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3 text-stone-500 font-mono">{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400">
                          <Disc className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.kodeTyre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-200">
                        {t.merkTyre}
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-300">
                        <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                          {t.ukuranTyre}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-300">
                        {t.codeExpired}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-stone-300">
                        {t.initialDepthThread ?? 25} mm
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isInstalled && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            TERPASANG
                          </span>
                        )}
                        {isAvailable && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            READY GUDANG
                          </span>
                        )}
                        {isScrap && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            SCRAP
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isInstalled ? (
                          <div className="font-mono text-xs">
                            <span className="font-bold text-amber-400 mr-1.5">{t.currentUnit}</span>
                            <span className="px-1.5 py-0.2 rounded bg-stone-800 text-teal-300 border border-stone-700 text-[10px]">
                              Pos: {t.currentPosisi}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-1.5">
                              (Sisa: {t.currentDepthThread ?? t.initialDepthThread} mm)
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-500 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Install Langsung jika Status Available */}
                          {isAvailable && onNavigateToInstall && (
                            <button
                              type="button"
                              onClick={() => onNavigateToInstall(t.kodeTyre)}
                              title="Pasang Ban ini ke Unit Fleet"
                              className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/40 transition"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol EDIT: Khusus Akun Developer */}
                          {isDev ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(t)}
                              title="Edit Data Registrasi Tyre (Developer Only)"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Edit Khusus Akun Developer"
                              className="p-1.5 rounded-lg bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol DELETE: Khusus Akun Developer */}
                          {isDev ? (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(t.id)}
                              title="Hapus Data Registrasi Tyre (Developer Only)"
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Hapus Khusus Akun Developer"
                              className="p-1.5 rounded-lg bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM REGISTRASI TYRE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold text-stone-100">
                  {editingId ? 'EDIT REGISTRASI TYRE' : 'REGISTRASI TYRE BARU (ET09)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {/* Kode Tyre (Generate Otomatis ET09-xxxx) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                  <span>1. Kode Tyre (Otomatis ET09-xxxx) <span className="text-amber-400">*</span></span>
                  <button
                    type="button"
                    onClick={() => setKodeTyre(generateNextCode())}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
                    title="Klik untuk generate nomor urut ET09 baru"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Ulang</span>
                  </button>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ET09-0001"
                  value={kodeTyre}
                  onChange={(e) => setKodeTyre(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/60"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Format baku penomoran ban PT BKWA Quarry (ET09-xxxx).
                </p>
              </div>

              {/* Merk Tyre & Ukuran Tyre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    2. Merk Tyre <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="brand-suggestions"
                    placeholder="Bridgestone, Giti..."
                    value={merkTyre}
                    onChange={(e) => setMerkTyre(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60"
                  />
                  <datalist id="brand-suggestions">
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    3. Ukuran Tyre <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="size-suggestions"
                    placeholder="12.00R24, 23.5R25..."
                    value={ukuranTyre}
                    onChange={(e) => setUkuranTyre(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60"
                  />
                  <datalist id="size-suggestions">
                    {COMMON_SIZES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Code Expired & Initial Depth Thread */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    4. Code Expired <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: 4827 atau 12/2028"
                    value={codeExpired}
                    onChange={(e) => setCodeExpired(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-300 font-bold focus:outline-none focus:border-emerald-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Kode minggu/tahun atau tanggal expired dari pabrik ban.
                  </p>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Initial Depth Thread (mm) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    placeholder="25"
                    value={initialDepthThread}
                    onChange={(e) => setInitialDepthThread(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-bold focus:outline-none focus:border-emerald-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Ketebalan kembangan awal ban baru (acuan % keausan di dashboard).
                  </p>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi ban, serial number pabrik, nomor PO pembelian, dll..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60 placeholder:text-stone-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Daftarkan Tyre'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE CONFIRM */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">
                Hapus Registrasi Tyre?
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                Data master tyre ini akan dihapus permanen. Aksi ini khusus akun Developer.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRegistration(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
