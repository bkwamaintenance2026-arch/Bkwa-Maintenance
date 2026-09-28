import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  HeavyEquipment, 
  ManpowerData, 
  TyreInstallRecord, 
  TyreRegistration, 
  TYRE_JENIS_OPTIONS, 
  TYRE_POSITION_OPTIONS, 
  TyreJenis, 
  UserAccount 
} from '../../types';
import { isDeveloper } from '../../utils/storage';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Lock, 
  Calendar, 
  Clock, 
  Truck, 
  Disc, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileSpreadsheet, 
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface TyreInstallSubViewProps {
  units: (AssetUnit | HeavyEquipment)[];
  manpowerList: ManpowerData[];
  tyreRegistrations: TyreRegistration[];
  tyreInstalls: TyreInstallRecord[];
  currentUser: UserAccount;
  onSaveInstall: (
    data: Omit<TyreInstallRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: TyreInstallRecord };
  onDeleteInstall: (id: string) => { success: boolean; message: string };
  onBackToMainMenu?: () => void;
}

// Helper deteksi unit beroda (bukan crawler/track)
export function isWheeledUnit(u: any): boolean {
  if (!u) return false;
  const j = (u.jenis || u.category || '').toLowerCase();
  const cn = (u.cnNew || u.codeNumber || u.kodeUnit || '').toLowerCase();

  // Exclude crawler/track units
  if (j.includes('excavator') || j.includes('exca') || cn.startsWith('ex') || cn.startsWith('pc')) return false;
  if (j.includes('bulldozer') || j.includes('dozer') || cn.startsWith('bd') || cn.startsWith('dz')) return false;
  if (j.includes('crusher') || j.includes('stone') || cn.startsWith('cr')) return false;

  return true;
}

export const TyreInstallSubView: React.FC<TyreInstallSubViewProps> = ({
  units,
  manpowerList,
  tyreRegistrations,
  tyreInstalls,
  currentUser,
  onSaveInstall,
  onDeleteInstall,
}) => {
  const isDev = isDeveloper(currentUser);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields (Sesuai instruksi: CN New, HM/KM, Tanggal, Jenis Tyre, Kode Tyre, Posisi, Depth Thread, PIC, Remark)
  const [cnNew, setCnNew] = useState('');
  const [namaAlat, setNamaAlat] = useState('');
  const [hmKm, setHmKm] = useState<number | ''>('');
  const [tanggal, setTanggal] = useState('');
  const [jenisTyre, setJenisTyre] = useState<TyreJenis>('New');
  const [kodeTyre, setKodeTyre] = useState('');
  const [posisi, setPosisi] = useState('FL');
  const [depthThread, setDepthThread] = useState<number | ''>(25);
  const [pic, setPic] = useState('');
  const [picJabatan, setPicJabatan] = useState('');
  const [remark, setRemark] = useState('');

  // Filter unit yang HANYA menggunakan Tyre/Ban dari Modul 1
  const wheeledUnits = useMemo(() => {
    const filtered = units.filter(isWheeledUnit);
    if (filtered.length > 0) return filtered;
    return units; // fallback jika belum ada data jenis spesifik
  }, [units]);

  // List Mekanik dari Modul 2
  const mechanicsList = useMemo(() => {
    const list = manpowerList.filter(
      (m) =>
        m.jabatan.toUpperCase().includes('MEKANIK') ||
        m.jabatan.toUpperCase().includes('HELPER') ||
        m.jabatan.toUpperCase().includes('WORKSHOP')
    );
    return list.length > 0 ? list : manpowerList;
  }, [manpowerList]);

  // Helper CN & Nama Alat
  const getUnitCn = (u: any): string => u?.cnNew || u?.codeNumber || u?.kodeUnit || '';
  const getUnitName = (u: any): string => {
    if (u?.namaAlat) return u.namaAlat;
    const b = u?.brandMerk || u?.brand || '';
    const m = u?.modelUnit || u?.model || '';
    return `${b} ${m}`.trim() || getUnitCn(u) || 'Heavy Equipment';
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    const firstUnit = wheeledUnits[0];
    const initialCn = firstUnit ? getUnitCn(firstUnit) : '';
    setCnNew(initialCn);
    setNamaAlat(firstUnit ? getUnitName(firstUnit) : '');
    setHmKm((firstUnit as any)?.hourMeter || (firstUnit as any)?.currentHours || 1000);
    setTanggal(new Date().toISOString().split('T')[0]);
    setJenisTyre('New');

    // Default ke tyre yang ready di gudang jika ada
    const readyTyres = tyreRegistrations.filter((t) => t.status === 'AVAILABLE');
    if (readyTyres.length > 0) {
      setKodeTyre(readyTyres[0].kodeTyre);
      setDepthThread(readyTyres[0].initialDepthThread ?? 25);
    } else if (tyreRegistrations.length > 0) {
      setKodeTyre(tyreRegistrations[0].kodeTyre);
      setDepthThread(tyreRegistrations[0].initialDepthThread ?? 25);
    } else {
      setKodeTyre('ET09-0001');
      setDepthThread(25);
    }

    setPosisi('FL');

    const defaultPic = mechanicsList[0];
    setPic(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicJabatan(defaultPic?.jabatan || 'MEKANIK');

    setRemark('Pemasangan ban baru di workshop quarry');
    setErrorMsg('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: TyreInstallRecord) => {
    setEditingId(item.id);
    setCnNew(item.cnNew);
    setNamaAlat(item.namaAlat || '');
    setHmKm(item.hmKm);
    setTanggal(item.tanggal);
    setJenisTyre(item.jenisTyre);
    setKodeTyre(item.kodeTyre);
    setPosisi(item.posisi);
    setDepthThread(item.depthThread);
    setPic(item.pic);
    setPicJabatan(item.picJabatan || '');
    setRemark(item.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  // CN Unit Change Handler
  const handleCnChange = (cn: string) => {
    setCnNew(cn);
    const found = units.find((u) => getUnitCn(u) === cn);
    if (found) {
      setNamaAlat(getUnitName(found));
      if ((found as any).hourMeter) {
        setHmKm((found as any).hourMeter);
      }
    }
  };

  // Kode Tyre Change Handler
  const handleKodeTyreChange = (code: string) => {
    setKodeTyre(code);
    const reg = tyreRegistrations.find((t) => t.kodeTyre === code);
    if (reg) {
      if (reg.currentDepthThread) {
        setDepthThread(reg.currentDepthThread);
      } else if (reg.initialDepthThread) {
        setDepthThread(reg.initialDepthThread);
      }
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cnNew.trim()) {
      setErrorMsg('CN New wajib dipilih dari List Modul 1!');
      return;
    }
    if (hmKm === '' || Number(hmKm) < 0) {
      setErrorMsg('HM/KM unit wajib diisi angka valid!');
      return;
    }
    if (!tanggal) {
      setErrorMsg('Tanggal pemasangan wajib dipilih!');
      return;
    }
    if (!kodeTyre.trim()) {
      setErrorMsg('Kode Tyre wajib dipilih atau diisi!');
      return;
    }
    if (depthThread === '' || Number(depthThread) <= 0) {
      setErrorMsg('Depth Thread (mm) wajib diisi angka lebih dari 0!');
      return;
    }
    if (!pic.trim()) {
      setErrorMsg('PIC Mekanik wajib dipilih!');
      return;
    }

    const res = onSaveInstall(
      {
        cnNew: cnNew.trim(),
        namaAlat: namaAlat || getUnitName(units.find((u) => getUnitCn(u) === cnNew)),
        hmKm: Number(hmKm),
        tanggal,
        jenisTyre,
        kodeTyre: kodeTyre.trim().toUpperCase(),
        posisi,
        depthThread: Number(depthThread),
        pic: pic.trim(),
        picJabatan,
        remark: remark.trim(),
      },
      editingId || undefined
    );

    if (res.success) {
      setShowModal(false);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Filtered Installs
  const filteredList = useMemo(() => {
    return tyreInstalls.filter((item) => {
      const matchSearch =
        item.cnNew.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kodeTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.namaAlat || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.posisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pic.toLowerCase().includes(searchTerm.toLowerCase());

      const matchUnit = filterUnit === 'ALL' || item.cnNew === filterUnit;

      return matchSearch && matchUnit;
    });
  }, [tyreInstalls, searchTerm, filterUnit]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono flex items-center gap-2">
                <span>SUB MODUL 2.A: INSTALL / PEMASANGAN TYRE</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PEMASANGAN
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pencatatan pemasangan ban baru, used, atau vulkanisir pada Unit Beroda Fleet Quarry (Dump Truck, Loader, Support Truck).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-tambah-install-tyre"
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pemasangan Tyre</span>
            </button>
          </div>
        </div>
      </div>

      {/* Developer Notice */}
      <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${isDev ? 'text-amber-400' : 'text-stone-500'}`} />
          <span>
            {isDev ? (
              <span className="text-amber-300 font-semibold font-mono">
                Akses Developer: Anda berhak mengedit dan menghapus riwayat pemasangan tyre.
              </span>
            ) : (
              <span>Fitur Edit &amp; Delete riwayat khusus untuk Akun Developer.</span>
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
            placeholder="Cari CN Unit, Kode Tyre, Posisi, atau Mekanik..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-blue-500/60"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Unit Fleet:</span>
          </span>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-blue-500/60 font-mono"
          >
            <option value="ALL">Semua Unit ({tyreInstalls.length})</option>
            {wheeledUnits.map((u) => (
              <option key={getUnitCn(u)} value={getUnitCn(u)}>
                {getUnitCn(u)} — {getUnitName(u)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Riwayat Pemasangan Tyre */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">CN Unit</th>
                <th className="py-3 px-3">Posisi</th>
                <th className="py-3 px-3">Kode Tyre</th>
                <th className="py-3 px-3">Jenis Tyre</th>
                <th className="py-3 px-3 text-right">HM / KM</th>
                <th className="py-3 px-3 text-right">Depth (mm)</th>
                <th className="py-3 px-3">PIC Mekanik</th>
                <th className="py-3 px-3">Remark</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500 font-mono text-xs">
                    Belum ada riwayat pemasangan tyre yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                      {item.tanggal}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-amber-400 font-mono">{item.cnNew}</div>
                      <div className="text-[10px] text-stone-500 truncate max-w-[130px]">
                        {item.namaAlat}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {item.posisi}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {item.kodeTyre}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                        {item.jenisTyre}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-stone-300">
                      {item.hmKm?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-emerald-300">
                      {item.depthThread} mm
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-200">{item.pic}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{item.picJabatan}</div>
                    </td>
                    <td className="py-3 px-3 text-stone-400 max-w-[180px] truncate" title={item.remark}>
                      {item.remark || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isDev ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Pemasangan (Developer Only)"
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

                        {isDev ? (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Hapus Data Pemasangan (Developer Only)"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT PEMASANGAN TYRE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-mono font-bold text-stone-100">
                  {editingId ? 'EDIT DATA PEMASANGAN TYRE' : 'INPUT PEMASANGAN TYRE (INSTALL)'}
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
              {/* CN New (Hanya Unit Beroda / Tyre di Modul 1) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span>CN New (List Modul 1 - Unit Beroda / Tyre) <span className="text-amber-400">*</span></span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">Hanya Unit Beroda</span>
                </label>
                <select
                  required
                  value={cnNew}
                  onChange={(e) => handleCnChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-blue-500/60"
                >
                  <option value="">-- Pilih Unit Fleet Beroda --</option>
                  {wheeledUnits.map((u) => (
                    <option key={getUnitCn(u)} value={getUnitCn(u)}>
                      {getUnitCn(u)} — {getUnitName(u)} ({(u as any).jenis || 'Wheeled'})
                    </option>
                  ))}
                </select>
                {namaAlat && (
                  <p className="text-[10px] text-stone-400 mt-1 font-sans">
                    Nama Unit: <span className="text-stone-200 font-semibold">{namaAlat}</span>
                  </p>
                )}
              </div>

              {/* HM / KM & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    HM / KM Unit <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="4200"
                    value={hmKm}
                    onChange={(e) => setHmKm(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-bold focus:outline-none focus:border-blue-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Angka meteran unit saat ban dipasang.
                  </p>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tanggal Pemasangan <span className="text-amber-400">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 cursor-pointer"
                  />
                </div>
              </div>

              {/* Jenis Tyre & Kode Tyre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jenis Tyre <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={jenisTyre}
                    onChange={(e) => setJenisTyre(e.target.value as TyreJenis)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-bold focus:outline-none focus:border-blue-500/60"
                  >
                    {TYRE_JENIS_OPTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Kode Tyre <span className="text-amber-400">*</span></span>
                    <span className="text-[10px] text-emerald-400">Reff Sub Modul 1</span>
                  </label>
                  <select
                    required
                    value={kodeTyre}
                    onChange={(e) => handleKodeTyreChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="">-- Pilih Kode Tyre (ET09) --</option>
                    {tyreRegistrations.map((t) => (
                      <option key={t.id} value={t.kodeTyre}>
                        {t.kodeTyre} — {t.merkTyre} {t.ukuranTyre} [{t.status}]
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Atau ketik Kode Tyre..."
                    value={kodeTyre}
                    onChange={(e) => handleKodeTyreChange(e.target.value.toUpperCase())}
                    className="w-full mt-1.5 px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-blue-500/60"
                  />
                </div>
              </div>

              {/* Posisi & Depth Thread */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Posisi Pemasangan <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={posisi}
                    onChange={(e) => setPosisi(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-teal-300 font-bold focus:outline-none focus:border-blue-500/60"
                  >
                    {TYRE_POSITION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-500 mt-1">
                    FL, FR, RL1 (Luar), RL2 (Dalam), RR1, RR2, Pos 1-4.
                  </p>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Depth Thread (mm) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    placeholder="25"
                    value={depthThread}
                    onChange={(e) => setDepthThread(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-bold focus:outline-none focus:border-blue-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Ketebalan kembangan ban saat dipasang.
                  </p>
                </div>
              </div>

              {/* PIC Mekanik (List Mekanik di Modul 2) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>PIC (List Mekanik di Modul 2) <span className="text-amber-400">*</span></span>
                  </span>
                  <span className="text-[10px] text-stone-500">Workshop Manpower</span>
                </label>
                <select
                  required
                  value={pic}
                  onChange={(e) => {
                    setPic(e.target.value);
                    const f = mechanicsList.find((m) => m.nama === e.target.value);
                    if (f) setPicJabatan(f.jabatan);
                  }}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-bold focus:outline-none focus:border-blue-500/60"
                >
                  <option value="">-- Pilih PIC Mekanik --</option>
                  {mechanicsList.map((m) => (
                    <option key={m.id || m.nama} value={m.nama}>
                      {m.nama} — [{m.jabatan}]
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Atau ketik nama PIC manual..."
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    className="w-full px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-blue-500/60"
                  />
                  {picJabatan && (
                    <span className="text-[10px] font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 shrink-0">
                      {picJabatan}
                    </span>
                  )}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Remark / Catatan Pemasangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Kondisi baut roda, tekanan psi ban, rotasi ban, dll..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 placeholder:text-stone-600"
                />
              </div>

              {/* Modal Actions */}
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Catat Pemasangan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">
                Hapus Catatan Pemasangan Tyre?
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                Data pemasangan ban ini akan dihapus. Aksi ini khusus akun Developer.
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
                  onDeleteInstall(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
