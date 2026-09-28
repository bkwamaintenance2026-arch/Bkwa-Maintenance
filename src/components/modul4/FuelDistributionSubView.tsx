import React, { useState, useEffect, useMemo } from 'react';
import { 
  FuelDistributionRecord, 
  HeavyEquipment, 
  AssetUnit,
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Flame, 
  Plus, 
  Search, 
  Gauge, 
  Calendar, 
  Clock, 
  User, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  FileSpreadsheet,
  CheckCircle2,
  Tractor,
  Activity,
  Layers,
  MapPin,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { TimeInput24Hour } from '../common/TimeInput24Hour';

interface FuelDistributionSubViewProps {
  fuelDistributions: FuelDistributionRecord[];
  equipmentList: (HeavyEquipment | AssetUnit)[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<FuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelDistributionRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const FuelDistributionSubView: React.FC<FuelDistributionSubViewProps> = ({
  fuelDistributions,
  equipmentList,
  manpowerList,
  currentUser,
  onSave,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // State Form Sesuai Permintaan Spesifikasi:
  // 1. No Bon dibuat Manual
  // 2. Tanggal dibuat pemilihan tanggal seperti di Gform
  // 3. Jam Pengisian dibuat saja 24 jam jangan AM/PM
  // 4. Jenis (berdasarkan "JENIS" di modul 1)
  // 5. CN_NEW (Pilihan dikelompokkan berdasarkan pilihan pada JENIS)
  // 6. Nama Operator (DropDown semua Jabatan)
  // Sisa nya: HM, Flowmeter Start, Flowmeter Stop, Qty (Stop - Start), dsb.
  const [noBon, setNoBon] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('08:00');
  const [selectedJenis, setSelectedJenis] = useState('');
  const [cnAlat, setCnAlat] = useState('');
  const [namaAlat, setNamaAlat] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorJabatan, setOperatorJabatan] = useState('');
  const [hmPengisian, setHmPengisian] = useState<number | ''>('');
  const [flowmeterStart, setFlowmeterStart] = useState<number | ''>('');
  const [flowmeterStop, setFlowmeterStop] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>('');
  const [driverFtName, setDriverFtName] = useState('');
  const [picFogName, setPicFogName] = useState('');
  const [lokasi, setLokasi] = useState('Tambang -Front Pit');
  const [remark, setRemark] = useState('');

  // Helper mendapatkan CN unit dari AssetUnit (cnNew) atau fallback codeNumber
  const getUnitCn = (u: any): string => {
    return u?.cnNew || u?.codeNumber || '';
  };

  // Helper mendapatkan Nama Alat
  const getUnitName = (u: any): string => {
    if (u?.namaAlat) return u.namaAlat;
    const brand = u?.brandMerk || u?.brand || '';
    const model = u?.modelUnit || u?.model || '';
    const full = `${brand} ${model}`.trim();
    return full || getUnitCn(u) || 'Alat Berat';
  };

  // 1. Daftar Jenis Alat berdasarkan "JENIS" di Modul 1
  const availableJenisList = useMemo(() => {
    const set = new Set<string>();
    equipmentList.forEach((u: any) => {
      const j = (u.jenis || u.category || '').trim();
      if (j) set.add(j);
    });
    if (set.size === 0) {
      return ['Excavator', 'Dump Truck', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support Truck'];
    }
    return Array.from(set).sort();
  }, [equipmentList]);

  // 2. Daftar Unit yang terfilter berdasarkan Jenis yang dipilih
  const availableUnitsForSelectedJenis = useMemo(() => {
    if (!selectedJenis) return equipmentList;
    return equipmentList.filter((u: any) => {
      const j = (u.jenis || u.category || '').trim();
      return j.toLowerCase() === selectedJenis.trim().toLowerCase();
    });
  }, [equipmentList, selectedJenis]);

  // 3. DropDown Nama Operator dari SEMUA Jabatan di Modul 2
  const allOperatorsList = useMemo(() => {
    if (!manpowerList || manpowerList.length === 0) {
      return [
        { id: 'mp-demo-1', nama: 'Budi Santoso', jabatan: 'OPERATOR EXCA' },
        { id: 'mp-demo-2', nama: 'Agus Setiawan', jabatan: 'SOPIR LOKASI' },
        { id: 'mp-demo-3', nama: 'Joko Prabowo', jabatan: 'MEKANIK' },
        { id: 'mp-demo-4', nama: 'Rudi Hartono', jabatan: 'HELPER MEKANIK' },
      ];
    }
    return [...manpowerList].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [manpowerList]);

  // Helper memformat tanggal ala Google Form (e.g. "Senin, 28 September 2026")
  const formatGformDate = (dStr: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  // Handler saat memilih Jenis
  const handleSelectJenis = (j: string) => {
    setSelectedJenis(j);
    if (j) {
      const matchUnits = equipmentList.filter(
        (u: any) => (u.jenis || u.category || '').trim().toLowerCase() === j.trim().toLowerCase()
      );
      if (matchUnits.length > 0) {
        const isCurrentMatched = matchUnits.some((m) => getUnitCn(m) === cnAlat);
        if (!isCurrentMatched) {
          const first = matchUnits[0];
          setCnAlat(getUnitCn(first));
          setNamaAlat(getUnitName(first));
          if ((first as any).currentHours) {
            setHmPengisian((first as any).currentHours);
          }
        }
      }
    }
  };

  // Handler saat memilih CN Alat
  const handleCnAlatChange = (selectedCn: string) => {
    setCnAlat(selectedCn);
    const foundEq = equipmentList.find((e: any) => getUnitCn(e) === selectedCn);
    if (foundEq) {
      setNamaAlat(getUnitName(foundEq));
      if (foundEq.jenis) {
        setSelectedJenis(foundEq.jenis);
      }
      if ((foundEq as any).currentHours && (!hmPengisian || hmPengisian === 0)) {
        setHmPengisian((foundEq as any).currentHours);
      }
    }
  };

  // Handler saat memilih Operator (semua jabatan)
  const handleSelectOperator = (name: string) => {
    setOperatorName(name);
    const found = allOperatorsList.find((m) => m.nama === name);
    if (found) {
      setOperatorJabatan(found.jabatan || '');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    // 1. No Bon dibuat Manual: dikosongkan agar pengguna mengetik no bon manual
    setNoBon('');

    // 2. Tanggal & Jam Pengisian 24 jam (default hari ini & jam sekarang 24 jam)
    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setJam(`${hh}:${mm}`);

    // 3. Jenis & CN_NEW
    if (availableJenisList.length > 0) {
      const initialJenis = availableJenisList[0];
      setSelectedJenis(initialJenis);
      const matchUnits = equipmentList.filter(
        (u: any) => (u.jenis || u.category || '').trim().toLowerCase() === initialJenis.trim().toLowerCase()
      );
      if (matchUnits.length > 0) {
        setCnAlat(getUnitCn(matchUnits[0]));
        setNamaAlat(getUnitName(matchUnits[0]));
        setHmPengisian((matchUnits[0] as any).currentHours || 1200);
      } else if (equipmentList.length > 0) {
        setCnAlat(getUnitCn(equipmentList[0]));
        setNamaAlat(getUnitName(equipmentList[0]));
        setHmPengisian((equipmentList[0] as any).currentHours || 1200);
      } else {
        setCnAlat('');
        setNamaAlat('');
        setHmPengisian('');
      }
    } else {
      setSelectedJenis('');
      setCnAlat('');
      setNamaAlat('');
      setHmPengisian('');
    }

    // 4. Nama Operator (semua jabatan)
    if (allOperatorsList.length > 0) {
      setOperatorName(allOperatorsList[0].nama);
      setOperatorJabatan(allOperatorsList[0].jabatan || '');
    } else {
      setOperatorName('');
      setOperatorJabatan('');
    }

    const defaultDriver = manpowerList.find(m => m.jabatan.toLowerCase().includes('driver')) || manpowerList[0];
    setDriverFtName(defaultDriver?.nama || '');

    const defaultPic = manpowerList[0];
    setPicFogName(defaultPic?.nama || currentUser.fullName || currentUser.username);

    setFlowmeterStart('');
    setFlowmeterStop('');
    setQty('');
    setLokasi('Tambang -Front Pit');
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: FuelDistributionRecord) => {
    setEditingId(item.id);
    setNoBon(item.noBon);
    setCnAlat(item.cnAlat);
    setNamaAlat(item.namaAlat);
    setSelectedJenis(item.jenisAlat || '');
    setOperatorName(item.operatorName);
    setOperatorJabatan(item.operatorJabatan || '');
    setHmPengisian(item.hmPengisian ?? item.hm ?? '');
    setTanggal(item.tanggal);
    setJam(item.jam || '08:00');
    setFlowmeterStart(item.flowmeterStart);
    setFlowmeterStop(item.flowmeterStop);
    setQty(item.qty);
    setDriverFtName(item.driverFtName || '');
    setPicFogName(item.picFogName || '');
    setLokasi(item.lokasi || 'Tambang -Front Pit');
    setRemark(item.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFlowmeterChange = (startVal: number | '', stopVal: number | '') => {
    setFlowmeterStart(startVal);
    setFlowmeterStop(stopVal);
    if (typeof startVal === 'number' && typeof stopVal === 'number') {
      const diff = stopVal - startVal;
      if (diff >= 0) {
        setQty(diff);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noBon.trim()) {
      setErrorMsg('1. No Bon (Manual) wajib diisi!');
      return;
    }
    if (!tanggal) {
      setErrorMsg('Tanggal pengisian wajib dipilih!');
      return;
    }
    if (!jam.trim()) {
      setErrorMsg('Jam pengisian (24 Jam) wajib diisi!');
      return;
    }
    if (!cnAlat.trim()) {
      setErrorMsg('CN Alat wajib dipilih dari Modul 1 Asset!');
      return;
    }
    if (!operatorName.trim()) {
      setErrorMsg('Operator Name wajib dipilih!');
      return;
    }
    if (hmPengisian === '' || Number(hmPengisian) < 0) {
      setErrorMsg('HM Pengisian wajib diisi angka valid!');
      return;
    }
    if (qty === '' || Number(qty) <= 0) {
      setErrorMsg('Qty Pengisian harus lebih dari 0 Liter!');
      return;
    }

    const res = onSave(
      {
        noBon: noBon.trim(),
        cnAlat,
        namaAlat,
        jenisAlat: selectedJenis,
        operatorName: operatorName.trim(),
        operatorJabatan,
        hm: Number(hmPengisian),
        hmPengisian: Number(hmPengisian),
        tanggal,
        jam,
        flowmeterStart: Number(flowmeterStart) || 0,
        flowmeterStop: Number(flowmeterStop) || 0,
        qty: Number(qty),
        driverFtName,
        picFogName,
        lokasi,
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

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const filteredList = fuelDistributions.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.noBon.toLowerCase().includes(q) ||
      item.cnAlat.toLowerCase().includes(q) ||
      item.namaAlat.toLowerCase().includes(q) ||
      (item.jenisAlat || '').toLowerCase().includes(q) ||
      item.operatorName.toLowerCase().includes(q) ||
      (item.lokasi || '').toLowerCase().includes(q)
    );
  });

  const totalFuelDistributed = fuelDistributions.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                5. DISTRIBUTION FUEL (DISPENSING KE UNIT ALAT)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pencatatan pengisian solar ke unit alat berat (Excavator, Dump Truck, Loader, Genset) menggunakan No Bon Manual & Flowmeter.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari No Bon, CN Alat, Operator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-orange-500/50 w-56 sm:w-64"
            />
          </div>

          <button
            id="btn-add-fuel-distribution"
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 font-bold text-xs shadow-lg shadow-orange-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Bon Pengisian Fuel</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Total Distribusi Fuel Unit</div>
            <div className="text-lg font-black font-mono text-orange-400">
              {(totalFuelDistributed ?? 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Liter</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Total Bon Diterbitkan</div>
            <div className="text-lg font-black font-mono text-stone-100">
              {fuelDistributions.length} <span className="text-xs font-normal text-stone-400">Lembar Bon</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Tractor className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Rata-rata Konsumsi / Unit</div>
            <div className="text-lg font-black font-mono text-emerald-400">
              {fuelDistributions.length > 0 ? Math.round((totalFuelDistributed ?? 0) / fuelDistributions.length).toLocaleString('id-ID') : 0} <span className="text-xs font-normal text-stone-400">Ltr/Bon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Data Distribusi Fuel */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            LOG TRANSAKSI PENGISIAN FUEL KE UNIT ALAT (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">1. No Bon</th>
                <th className="py-3 px-3">Tanggal &amp; Jam (24 Jam)</th>
                <th className="py-3 px-3">Unit (Jenis, CN &amp; Nama Alat)</th>
                <th className="py-3 px-3">Operator &amp; Jabatan</th>
                <th className="py-3 px-3 text-right">HM</th>
                <th className="py-3 px-3 font-mono">Flowmeter (Start - Stop)</th>
                <th className="py-3 px-3 text-right">Qty (Ltr)</th>
                <th className="py-3 px-3">Lokasi Pit</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono font-bold text-orange-400 whitespace-nowrap">
                    {item.noBon}
                  </td>
                  <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold text-stone-200">
                      <Calendar className="w-3 h-3 text-orange-400" />
                      <span>{item.tanggal}</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>{item.jam} (24 Jam)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-100 font-mono flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                        {item.cnAlat}
                      </span>
                      {item.jenisAlat && (
                        <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700 text-[10px] font-sans">
                          {item.jenisAlat}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{item.namaAlat}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-200">{item.operatorName}</div>
                    <div className="text-[10px] text-blue-400 font-mono">{item.operatorJabatan || 'Semua Jabatan'}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-stone-200 text-right">
                    {(item.hmPengisian ?? item.hm ?? 0).toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">HM</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    {(item.flowmeterStart ?? 0).toLocaleString('id-ID')} → {(item.flowmeterStop ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-orange-400 text-right text-sm">
                    {(item.qty ?? 0).toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-800 text-emerald-400 border border-stone-700">
                      {item.lokasi || 'Tambang -Front Pit'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                        title="Edit Data Bon"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition"
                        title="Hapus Data Bon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500">
                    Belum ada data transaksi bon pengisian fuel untuk unit alat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT DISTRIBUSI FUEL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Bon Pengisian Fuel' : 'Form Pengisian Fuel Unit Alat (No Bon)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Baris 1: 1. No Bon (Manual) & Tanggal (Gform style) & Jam (24 Jam) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. No Bon dibuat Manual */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span>1. No Bon (Input Manual) <span className="text-amber-400">*</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        const randomBon = `BON-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
                        setNoBon(randomBon);
                      }}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline font-mono"
                      title="Klik untuk mengisi saran format No Bon otomatis"
                    >
                      + Contoh No Bon
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ketik No Bon Manual (cth: BON-001)..."
                    value={noBon}
                    onChange={(e) => setNoBon(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500/60 placeholder:text-stone-600"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Input manual nomor bon fisik / voucher solar di lapangan.
                  </p>
                </div>

                {/* 2. Tanggal dibuat pemilihan tanggal seperti di Gform */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tanggal Pengisian <span className="text-amber-400">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-orange-500/60 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1.5">
                    <div className="text-[10px] font-mono text-amber-300/90 truncate max-w-[130px]" title={formatGformDate(tanggal)}>
                      {formatGformDate(tanggal) || 'Pilih tanggal'}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setTanggal(new Date().toISOString().split('T')[0])}
                        className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const y = new Date();
                          y.setDate(y.getDate() - 1);
                          setTanggal(y.toISOString().split('T')[0]);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"
                      >
                        Kemarin
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Jam Pengisian dibuat saja 24 jam jangan AM/PM */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Jam Pengisian (24 Jam) <span className="text-amber-400">*</span></span>
                  </label>
                  <TimeInput24Hour
                    value={jam}
                    onChange={(val) => setJam(val)}
                    placeholder="08:00"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Format 24 jam (00:00 - 23:59) tanpa AM/PM.
                  </p>
                </div>
              </div>

              {/* Baris 2: Jenis (berdasarkan "JENIS" di Modul 1) & CN_NEW (dikelompokkan berdasarkan JENIS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-950/70 rounded-xl border border-stone-800">
                {/* 4. Jenis (berdasarkan "JENIS" di modul 1) */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jenis (Reff "JENIS" Modul 1)</span>
                    </span>
                    <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={selectedJenis}
                    onChange={(e) => handleSelectJenis(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                    {availableJenisList.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Mengelompokkan dan memfilter pilihan CN_NEW di sebelah kanan.
                  </p>
                </div>

                {/* 5. CN_NEW (Pilihan di kelompok kan berdasarkan pilihan pada JENIS) */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-teal-400" />
                      <span>CN_NEW (Dikelompokkan Sesuai JENIS)</span>
                    </span>
                    <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={cnAlat}
                    onChange={(e) => handleCnAlatChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    <option value="">
                      {selectedJenis 
                        ? `-- Pilih CN_NEW (Kelompok: ${selectedJenis}) --` 
                        : '-- Pilih CN_NEW (Dikelompokkan Sesuai JENIS) --'}
                    </option>
                    {selectedJenis ? (
                      availableUnitsForSelectedJenis.length > 0 ? (
                        availableUnitsForSelectedJenis.map((u: any) => (
                          <option key={u.id} value={getUnitCn(u)}>
                            {getUnitCn(u)} — {getUnitName(u)} [{u.jenis || selectedJenis}]
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>(Belum ada unit terdaftar di Modul 1 untuk {selectedJenis})</option>
                      )
                    ) : (
                      availableJenisList.map((j) => {
                        const matchUnits = equipmentList.filter(
                          (u: any) => (u.jenis || u.category || '').trim().toLowerCase() === j.toLowerCase()
                        );
                        if (matchUnits.length === 0) return null;
                        return (
                          <optgroup key={j} label={`Kelompok JENIS: ${j}`}>
                            {matchUnits.map((u: any) => (
                              <option key={u.id} value={getUnitCn(u)}>
                                {getUnitCn(u)} — {getUnitName(u)}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    )}
                  </select>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Atau ketik CN_NEW manual..."
                      value={cnAlat}
                      onChange={(e) => handleCnAlatChange(e.target.value)}
                      className="w-full px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-stone-200 font-mono text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-stone-600"
                    />
                    {namaAlat && (
                      <span className="text-[10px] text-stone-400 truncate max-w-[170px] font-mono shrink-0">
                        {namaAlat}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Baris 3: 6. Nama Operator (DropDown semua Jabatan) & HM Pengisian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 6. Nama Operator (DropDown) semua Jabatan */}
                <div className="space-y-1">
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>6. Nama Operator (DropDown Semua Jabatan)</span>
                    </span>
                    <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={operatorName}
                    onChange={(e) => handleSelectOperator(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-semibold focus:outline-none focus:border-orange-500/60"
                  >
                    <option value="">-- Pilih Operator / Personil (Semua Jabatan Modul 2) --</option>
                    {allOperatorsList.map((m) => (
                      <option key={m.id || m.nama} value={m.nama}>
                        {m.nama} — [{m.jabatan || 'KARYAWAN'}]
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-mono text-stone-400">Jabatan:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10.5px] font-mono font-bold">
                        {operatorJabatan || 'Semua Jabatan'}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Atau ketik nama manual..."
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-44 px-2 py-0.5 bg-stone-900 border border-stone-800 rounded-lg text-stone-300 text-[11px] focus:outline-none focus:border-orange-500/60 placeholder:text-stone-600"
                    />
                  </div>
                </div>

                {/* HM Pengisian Unit */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    HM Pengisian Unit <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Contoh: 1450.5"
                    value={hmPengisian}
                    onChange={(e) => setHmPengisian(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold focus:outline-none focus:border-orange-500/60"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Angka meteran jam kerja (Hour Meter) unit saat diisi.
                  </p>
                </div>
              </div>

              {/* Baris 4: Flowmeter & Qty */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase text-orange-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Nozzel Dispenser FT / Fuel Station</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Flowmeter Start
                    </label>
                    <input
                      type="number"
                      placeholder="Start angka meter"
                      value={flowmeterStart}
                      onChange={(e) => handleFlowmeterChange(e.target.value === '' ? '' : Number(e.target.value), flowmeterStop)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Flowmeter Stop
                    </label>
                    <input
                      type="number"
                      placeholder="Stop angka meter"
                      value={flowmeterStop}
                      onChange={(e) => handleFlowmeterChange(flowmeterStart, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Qty Pengisian (Liter) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Qty (Stop - Start)"
                      value={qty}
                      onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-orange-500/50 rounded-xl text-orange-400 font-mono font-black text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-stone-500 block">
                  *Qty dihitung otomatis dari Flowmeter Stop dikurangi Flowmeter Start.
                </span>
              </div>

              {/* Baris 5: Driver FT, PIC FOG & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Driver Fuel Truck
                  </label>
                  <select
                    value={driverFtName}
                    onChange={(e) => setDriverFtName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60"
                  >
                    {manpowerList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — [{m.jabatan}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    PIC FOG Petugas
                  </label>
                  <select
                    value={picFogName}
                    onChange={(e) => setPicFogName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60"
                  >
                    {manpowerList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — [{m.jabatan}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Lokasi Kerja / Pengisian
                  </label>
                  <select
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-emerald-400 font-semibold focus:outline-none focus:border-orange-500/60"
                  >
                    <option value="Tambang -Front Pit">Tambang -Front Pit</option>
                    <option value="Pabrik-Crusher">Pabrik-Crusher</option>
                    <option value="Workshop Quarry">Workshop Quarry</option>
                    <option value="Other - Area Lain">Other - Area Lain</option>
                  </select>
                  {lokasi === 'Other - Area Lain' && (
                    <input
                      type="text"
                      placeholder="Ketik lokasi kerja spesifik..."
                      onChange={(e) => setLokasi(e.target.value || 'Other - Area Lain')}
                      className="w-full mt-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-orange-500/60"
                    />
                  )}
                </div>
              </div>

              {/* Baris 6: Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi tangki alat, filter solar, target pengisian, dll"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-orange-500/60"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 font-black text-xs shadow-lg shadow-orange-500/20"
                >
                  {editingId ? 'Simpan Perubahan' : 'Terbitkan Bon Pengisian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Bon Distribusi Fuel?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data bon ini akan dihapus dan mempengaruhi total pengeluaran solar unit alat berat.
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
                onClick={() => handleDelete(deleteConfirmId)}
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
