import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  HeavyEquipment, 
  ManpowerData, 
  TyreRegistration, 
  TyreRemoveRecord, 
  TYRE_JENIS_OPTIONS, 
  TYRE_POSITION_OPTIONS, 
  TyreJenis, 
  UserAccount 
} from '../../types';
import { isDeveloper } from '../../utils/storage';
import { 
  RotateCcw, 
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
  ShieldAlert, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { isWheeledUnit } from './TyreInstallSubView';

interface TyreRemoveSubViewProps {
  units: (AssetUnit | HeavyEquipment)[];
  manpowerList: ManpowerData[];
  tyreRegistrations: TyreRegistration[];
  tyreRemoves: TyreRemoveRecord[];
  currentUser: UserAccount;
  onSaveRemove: (
    data: Omit<TyreRemoveRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: TyreRemoveRecord };
  onDeleteRemove: (id: string) => { success: boolean; message: string };
}

export const TyreRemoveSubView: React.FC<TyreRemoveSubViewProps> = ({
  units,
  manpowerList,
  tyreRegistrations,
  tyreRemoves,
  currentUser,
  onSaveRemove,
  onDeleteRemove,
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
  const [jenisTyre, setJenisTyre] = useState<TyreJenis>('Used');
  const [kodeTyre, setKodeTyre] = useState('');
  const [posisi, setPosisi] = useState('FL');
  const [depthThread, setDepthThread] = useState<number | ''>(5);
  const [pic, setPic] = useState('');
  const [picJabatan, setPicJabatan] = useState('');
  const [remark, setRemark] = useState('');
  const [statusSetelahDilepas, setStatusSetelahDilepas] = useState<'SCRAP' | 'USED_READY' | 'SEND_VULKANISIR'>('SCRAP');

  // Filter unit yang HANYA menggunakan Tyre/Ban dari Modul 1
  const wheeledUnits = useMemo(() => {
    const filtered = units.filter(isWheeledUnit);
    if (filtered.length > 0) return filtered;
    return units;
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
    setJenisTyre('Used');

    // Cek apakah ada tyre yang terpasang di unit ini
    const installedOnThisUnit = tyreRegistrations.filter(
      (t) => t.status === 'INSTALLED' && t.currentUnit === initialCn
    );
    if (installedOnThisUnit.length > 0) {
      setKodeTyre(installedOnThisUnit[0].kodeTyre);
      setPosisi(installedOnThisUnit[0].currentPosisi || 'FL');
      setDepthThread(installedOnThisUnit[0].currentDepthThread ?? 4);
    } else {
      const anyInstalled = tyreRegistrations.filter((t) => t.status === 'INSTALLED');
      if (anyInstalled.length > 0) {
        setKodeTyre(anyInstalled[0].kodeTyre);
        setPosisi(anyInstalled[0].currentPosisi || 'FL');
        setDepthThread(anyInstalled[0].currentDepthThread ?? 4);
      } else {
        setKodeTyre('ET09-0001');
        setPosisi('FL');
        setDepthThread(4);
      }
    }

    const defaultPic = mechanicsList[0];
    setPic(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicJabatan(defaultPic?.jabatan || 'MEKANIK');

    setStatusSetelahDilepas('SCRAP');
    setRemark('Kembangan ban aus tipis di bawah batas standar pit, diganti baru');
    setErrorMsg('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: TyreRemoveRecord) => {
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
    setStatusSetelahDilepas(item.statusSetelahDilepas || 'SCRAP');
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

    // Auto switch to tyre installed on this unit
    const tyreOnUnit = tyreRegistrations.find(
      (t) => t.status === 'INSTALLED' && t.currentUnit === cn
    );
    if (tyreOnUnit) {
      setKodeTyre(tyreOnUnit.kodeTyre);
      if (tyreOnUnit.currentPosisi) setPosisi(tyreOnUnit.currentPosisi);
      if (tyreOnUnit.currentDepthThread) setDepthThread(tyreOnUnit.currentDepthThread);
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
      setErrorMsg('Tanggal pelepasan wajib dipilih!');
      return;
    }
    if (!kodeTyre.trim()) {
      setErrorMsg('Kode Tyre wajib dipilih atau diisi!');
      return;
    }
    if (depthThread === '' || Number(depthThread) < 0) {
      setErrorMsg('Depth Thread sisa (mm) wajib diisi!');
      return;
    }
    if (!pic.trim()) {
      setErrorMsg('PIC Mekanik wajib dipilih!');
      return;
    }

    const res = onSaveRemove(
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
        statusSetelahDilepas,
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
    return tyreRemoves.filter((item) => {
      const matchSearch =
        item.cnNew.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kodeTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.namaAlat || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.posisi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pic.toLowerCase().includes(searchTerm.toLowerCase());

      const matchUnit = filterUnit === 'ALL' || item.cnNew === filterUnit;

      return matchSearch && matchUnit;
    });
  }, [tyreRemoves, searchTerm, filterUnit]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono flex items-center gap-2">
                <span>SUB MODUL 2.B: REMOVE / PELEPASAN TYRE</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  PELEPASAN BAN
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pencatatan pelepasan ban dari unit (akibat aus tipis, pecah samping, robek, atau rotasi ban), mengupdate status master tyre.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-tambah-remove-tyre"
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pelepasan Tyre</span>
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
                Akses Developer: Anda berhak mengedit dan menghapus riwayat pelepasan tyre.
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
            className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60"
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
            className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-orange-500/60 font-mono"
          >
            <option value="ALL">Semua Unit ({tyreRemoves.length})</option>
            {wheeledUnits.map((u) => (
              <option key={getUnitCn(u)} value={getUnitCn(u)}>
                {getUnitCn(u)} — {getUnitName(u)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Riwayat Pelepasan Tyre */}
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
                <th className="py-3 px-3 text-right">Sisa Depth</th>
                <th className="py-3 px-3 text-center">Status Akhir</th>
                <th className="py-3 px-3">PIC Mekanik</th>
                <th className="py-3 px-3">Alasan / Remark</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-500 font-mono text-xs">
                    Belum ada riwayat pelepasan tyre yang tercatat.
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
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
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
                    <td className="py-3 px-3 font-mono text-right font-bold text-rose-400">
                      {item.depthThread} mm
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.statusSetelahDilepas === 'SCRAP' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          SCRAP
                        </span>
                      )}
                      {item.statusSetelahDilepas === 'USED_READY' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          USED READY
                        </span>
                      )}
                      {item.statusSetelahDilepas === 'SEND_VULKANISIR' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VULKANISIR
                        </span>
                      )}
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
                            title="Edit Data Pelepasan (Developer Only)"
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
                            title="Hapus Data Pelepasan (Developer Only)"
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

      {/* MODAL INPUT / EDIT PELEPASAN TYRE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-mono font-bold text-stone-100">
                  {editingId ? 'EDIT DATA PELEPASAN TYRE' : 'INPUT PELEPASAN TYRE (REMOVE)'}
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
                    <span>CN New (List Modul 1 - Unit Beroda) <span className="text-amber-400">*</span></span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">Hanya Unit Beroda</span>
                </label>
                <select
                  required
                  value={cnNew}
                  onChange={(e) => handleCnChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-orange-500/60"
                >
                  <option value="">-- Pilih Unit Fleet Beroda --</option>
                  {wheeledUnits.map((u) => (
                    <option key={getUnitCn(u)} value={getUnitCn(u)}>
                      {getUnitCn(u)} — {getUnitName(u)}
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
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-bold focus:outline-none focus:border-orange-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Angka meteran unit saat ban dilepas.
                  </p>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tanggal Pelepasan <span className="text-amber-400">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60 cursor-pointer"
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
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    {TYRE_JENIS_OPTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Kode Tyre <span className="text-amber-400">*</span></span>
                    <span className="text-[10px] text-emerald-400">Pilih Ban</span>
                  </label>
                  <select
                    required
                    value={kodeTyre}
                    onChange={(e) => {
                      setKodeTyre(e.target.value);
                      const reg = tyreRegistrations.find((t) => t.kodeTyre === e.target.value);
                      if (reg) {
                        if (reg.currentPosisi) setPosisi(reg.currentPosisi);
                        if (reg.currentDepthThread) setDepthThread(reg.currentDepthThread);
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    <option value="">-- Pilih Kode Tyre (ET09) --</option>
                    {tyreRegistrations.map((t) => (
                      <option key={t.id} value={t.kodeTyre}>
                        {t.kodeTyre} — {t.merkTyre} {t.ukuranTyre} [{t.currentUnit ? `Terpasang ${t.currentUnit}` : t.status}]
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Atau ketik Kode Tyre..."
                    value={kodeTyre}
                    onChange={(e) => setKodeTyre(e.target.value.toUpperCase())}
                    className="w-full mt-1.5 px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-orange-500/60"
                  />
                </div>
              </div>

              {/* Posisi & Depth Thread */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Posisi Pelepasan <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={posisi}
                    onChange={(e) => setPosisi(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-orange-300 font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    {TYRE_POSITION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Depth Thread Sisa (mm) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="4"
                    value={depthThread}
                    onChange={(e) => setDepthThread(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-rose-300 font-bold focus:outline-none focus:border-orange-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Ketebalan kembangan sisa saat dilepas.
                  </p>
                </div>
              </div>

              {/* Status Setelah Dilepas */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Status Ban Setelah Dilepas <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusSetelahDilepas('SCRAP')}
                    className={`py-2 px-2.5 rounded-xl border text-center transition font-bold text-[11px] ${
                      statusSetelahDilepas === 'SCRAP'
                        ? 'bg-rose-950/70 border-rose-600 text-rose-300 shadow-md shadow-rose-950/50'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    Afkir / Scrap
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusSetelahDilepas('USED_READY')}
                    className={`py-2 px-2.5 rounded-xl border text-center transition font-bold text-[11px] ${
                      statusSetelahDilepas === 'USED_READY'
                        ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 shadow-md shadow-emerald-950/50'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    Used (Masih Layak)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusSetelahDilepas('SEND_VULKANISIR')}
                    className={`py-2 px-2.5 rounded-xl border text-center transition font-bold text-[11px] ${
                      statusSetelahDilepas === 'SEND_VULKANISIR'
                        ? 'bg-amber-950/70 border-amber-600 text-amber-300 shadow-md shadow-amber-950/50'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    Kirim Vulkanisir
                  </button>
                </div>
              </div>

              {/* PIC Mekanik (List Mekanik di Modul 2) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-400" />
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
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-bold focus:outline-none focus:border-orange-500/60"
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
                    className="w-full px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-orange-500/60"
                  />
                  {picJabatan && (
                    <span className="text-[10px] font-mono text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 shrink-0">
                      {picJabatan}
                    </span>
                  )}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Remark / Alasan Pelepasan
                </label>
                <textarea
                  rows={2}
                  placeholder="Kondisi tapak aus tipis, robek akibat batuan tajam, pecah dinding samping, rotasi roda..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60 placeholder:text-stone-600"
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
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Catat Pelepasan'}</span>
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
                Hapus Catatan Pelepasan Tyre?
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                Data riwayat pelepasan ban ini akan dihapus. Aksi ini khusus akun Developer.
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
                  onDeleteRemove(deleteConfirmId);
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
