import React, { useState, useEffect } from 'react';
import { 
  FuelDistributionRecord, 
  HeavyEquipment, 
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
  Activity
} from 'lucide-react';

interface FuelDistributionSubViewProps {
  fuelDistributions: FuelDistributionRecord[];
  equipmentList: HeavyEquipment[];
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

  // Sesuai Instruksi User:
  // 1. No Bon
  // 2. CN alat (Dropdown sesuai CN di Modul 1)
  // 3. Nama ALat (Otomatis dari CN di Modul 1)
  // 4. Operator Name
  // 5. HM
  // 6. Tanggal dan Jam
  // 7. Flowmeter Start
  // 8. Flowmeter Stop
  // 9. Qty (Stop - Start)
  const [noBon, setNoBon] = useState('');
  const [cnAlat, setCnAlat] = useState('');
  const [namaAlat, setNamaAlat] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorJabatan, setOperatorJabatan] = useState('');
  const [hmPengisian, setHmPengisian] = useState<number | ''>('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [flowmeterStart, setFlowmeterStart] = useState<number | ''>('');
  const [flowmeterStop, setFlowmeterStop] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>('');
  const [driverFtName, setDriverFtName] = useState('');
  const [picFogName, setPicFogName] = useState('');
  const [lokasi, setLokasi] = useState('Tambang');
  const [remark, setRemark] = useState('');

  // List operator/driver dari manpower
  const operators = manpowerList.filter((m) => 
    m.jabatan.toLowerCase().includes('operator') || 
    m.jabatan.toLowerCase().includes('driver')
  );
  const effectiveOperators = operators.length > 0 ? operators : manpowerList;

  // Auto set nama alat ketika CN alat dipilih
  const handleCnAlatChange = (selectedCn: string) => {
    setCnAlat(selectedCn);
    const foundEq = equipmentList.find((e) => e.codeNumber === selectedCn);
    if (foundEq) {
      setNamaAlat(`${foundEq.brand || ''} ${foundEq.model} (${foundEq.category})`.trim());
      // Jika ada HM terakhir di equipment, jadikan acuan
      if (foundEq.currentHours && (!hmPengisian || hmPengisian === 0)) {
        setHmPengisian(foundEq.currentHours);
      }
    } else {
      setNamaAlat('');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const randomBon = `BON-BBM-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
    setNoBon(randomBon);

    const firstEq = equipmentList[0];
    if (firstEq) {
      setCnAlat(firstEq.codeNumber);
      setNamaAlat(`${firstEq.brand || ''} ${firstEq.model} (${firstEq.category})`.trim());
      setHmPengisian(firstEq.currentHours || 1200);
    } else {
      setCnAlat('');
      setNamaAlat('');
      setHmPengisian('');
    }

    const defaultOp = effectiveOperators[0];
    setOperatorName(defaultOp?.nama || '');
    setOperatorJabatan(defaultOp?.jabatan || 'Operator Alat Berat');

    const defaultDriver = manpowerList.find(m => m.jabatan.toLowerCase().includes('driver')) || manpowerList[0];
    setDriverFtName(defaultDriver?.nama || '');

    const defaultPic = manpowerList[0];
    setPicFogName(defaultPic?.nama || currentUser.fullName || currentUser.username);

    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));
    setFlowmeterStart('');
    setFlowmeterStop('');
    setQty('');
    setLokasi('Tambang');
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: FuelDistributionRecord) => {
    setEditingId(item.id);
    setNoBon(item.noBon);
    setCnAlat(item.cnAlat);
    setNamaAlat(item.namaAlat);
    setOperatorName(item.operatorName);
    setOperatorJabatan(item.operatorJabatan || '');
    setHmPengisian(item.hmPengisian);
    setTanggal(item.tanggal);
    setJam(item.jam);
    setFlowmeterStart(item.flowmeterStart);
    setFlowmeterStop(item.flowmeterStop);
    setQty(item.qty);
    setDriverFtName(item.driverFtName || '');
    setPicFogName(item.picFogName || '');
    setLokasi(item.lokasi || 'Tambang');
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
      setErrorMsg('1. No Bon wajib diisi!');
      return;
    }
    if (!cnAlat.trim()) {
      setErrorMsg('2. CN Alat wajib dipilih dari Modul 1 Asset!');
      return;
    }
    if (!operatorName.trim()) {
      setErrorMsg('4. Operator Name wajib diisi/dipilih!');
      return;
    }
    if (hmPengisian === '' || Number(hmPengisian) < 0) {
      setErrorMsg('5. HM Pengisian wajib diisi angka valid!');
      return;
    }
    if (qty === '' || Number(qty) <= 0) {
      setErrorMsg('9. Qty Pengisian harus lebih dari 0 Liter!');
      return;
    }

    const res = onSave(
      {
        noBon: noBon.trim(),
        cnAlat,
        namaAlat,
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
                Pencatatan pengisian solar ke unit alat berat (Excavator, Dump Truck, Loader, Genset) menggunakan No Bon & Flowmeter.
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
              {totalFuelDistributed.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Liter</span>
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
              {fuelDistributions.length > 0 ? Math.round(totalFuelDistributed / fuelDistributions.length).toLocaleString('id-ID') : 0} <span className="text-xs font-normal text-stone-400">Ltr/Bon</span>
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
                <th className="py-3 px-3">6. Tanggal & Jam</th>
                <th className="py-3 px-3">2 & 3. Unit (CN & Nama Alat)</th>
                <th className="py-3 px-3">4. Operator</th>
                <th className="py-3 px-3 text-right">5. HM</th>
                <th className="py-3 px-3 font-mono">7 & 8. Flowmeter (Start - Stop)</th>
                <th className="py-3 px-3 text-right">9. Qty (Ltr)</th>
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
                    <div>{item.tanggal}</div>
                    <div className="text-[10px] text-stone-500">{item.jam}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-100 font-mono flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                        {item.cnAlat}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{item.namaAlat}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-200">{item.operatorName}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.operatorJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-stone-200 text-right">
                    {item.hmPengisian.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">HM</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    {item.flowmeterStart.toLocaleString('id-ID')} → {item.flowmeterStop.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-orange-400 text-right text-sm">
                    {item.qty.toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                      {item.lokasi || 'Tambang'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition"
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

              {/* Baris 1: 1. No Bon & 6. Tanggal/Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    1. No Bon Pengisian <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={noBon}
                    onChange={(e) => setNoBon(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold focus:outline-none focus:border-orange-500/60"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    6. Tanggal <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-orange-500/60"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Pengisian <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-orange-500/60"
                  />
                </div>
              </div>

              {/* Baris 2: 2. CN Alat & 3. Nama Alat (Otomatis) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-950/70 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    2. CN Alat (Dropdown Reff: Modul 1 Asset) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={cnAlat}
                    onChange={(e) => handleCnAlatChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 font-mono font-bold focus:outline-none focus:border-orange-500/60"
                  >
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.codeNumber}>
                        {eq.codeNumber} — {eq.brand || ''} {eq.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    3. Nama Alat (Otomatis Terisi)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={namaAlat}
                    className="w-full px-3 py-2 bg-stone-900/60 border border-stone-800/80 rounded-xl text-stone-300 font-medium cursor-not-allowed"
                    placeholder="Nama alat terpilih dari CN"
                  />
                </div>
              </div>

              {/* Baris 3: 4. Operator Name & 5. HM Pengisian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    4. Operator Name (Reff: Manpower) <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={operatorName}
                      onChange={(e) => {
                        setOperatorName(e.target.value);
                        const f = manpowerList.find(m => m.nama === e.target.value);
                        if (f) setOperatorJabatan(f.jabatan);
                      }}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60"
                    >
                      {manpowerList.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} ({m.jabatan})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    5. HM Pengisian Unit <span className="text-amber-400">*</span>
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
                      7. Flowmeter Start
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
                      8. Flowmeter Stop
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
                      9. Qty Pengisian (Liter) <span className="text-amber-400">*</span>
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
                        {m.nama}
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
                        {m.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Lokasi Pengisian
                  </label>
                  <select
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-orange-500/60 font-mono"
                  >
                    <option value="Tambang">Tambang / Front Pit</option>
                    <option value="Pabrik">Pabrik / Crusher</option>
                    <option value="Workshop">Workshop Quarry</option>
                    <option value="Other">Other / Area Lain</option>
                  </select>
                </div>
              </div>

              {/* Baris 6: Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi tangki alat, filter solar, dll"
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
