import React, { useState } from 'react';
import { 
  AssetUnit, 
  FogFuelDistributionRecord, 
  FogDistributionLokasiOption, 
  FOG_DISTRIBUTION_LOKASI_OPTIONS, 
  FogSatuanOption, 
  FOG_SATUAN_OPTIONS, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Truck, 
  User, 
  Clock, 
  Calendar, 
  Gauge, 
  MapPin, 
  Save, 
  RotateCcw, 
  Search, 
  Eye, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Fuel
} from 'lucide-react';

interface FogDistributionSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  fogDistributions: FogFuelDistributionRecord[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<FogFuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FogFuelDistributionRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const FogDistributionSubView: React.FC<FogDistributionSubViewProps> = ({
  units,
  manpowerList,
  fogDistributions,
  currentUser,
  onSave,
  onDelete,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().substring(0, 5);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(todayStr); // a. Tanggal
  const [jam, setJam] = useState<string>(nowTimeStr); // b. Jam Pengisian
  const [noUnit, setNoUnit] = useState<string>(''); // c. No unit
  const [namaAlat, setNamaAlat] = useState<string>('');
  const [jenisUnit, setJenisUnit] = useState<string>('');
  const [namaOperator, setNamaOperator] = useState<string>(''); // d. Nama Operator
  const [operatorJabatan, setOperatorJabatan] = useState<string>('');
  const [hmPengisian, setHmPengisian] = useState<string>(''); // e. HM Pengisian (Type Number)
  const [lokasi, setLokasi] = useState<FogDistributionLokasiOption>('Tambang'); // f. Lokasi - Drop Down Pabrik, Tambang, Other
  const [lokasiDetail, setLokasiDetail] = useState<string>('');
  const [driverFt, setDriverFt] = useState<string>(''); // g. Driver FT : pilih dari data Manpower
  const [driverFtJabatan, setDriverFtJabatan] = useState<string>('');
  const [picFog, setPicFog] = useState<string>(''); // h. PIC FOG : pilih dari data Manpower
  const [picFogJabatan, setPicFogJabatan] = useState<string>('');
  const [flowmeterStart, setFlowmeterStart] = useState<string>(''); // i. Flowmeter reading - Start............ (Type Number)
  const [flowmeterEnd, setFlowmeterEnd] = useState<string>(''); //                        End............. (Type Number)
  const [qty, setQty] = useState<string>(''); // j. Qty............ (type Number)
  const [satuan, setSatuan] = useState<FogSatuanOption>('Ltr'); // Ltr/Kg/Drum/Pail
  const [dokumenNumber, setDokumenNumber] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // UI state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewDetailModalRecord, setViewDetailModalRecord] = useState<FogFuelDistributionRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Saat No Unit dipilih, sinkronisasi Nama Alat dan Jenis dari Modul 1
  const handleUnitChange = (selectedNoUnit: string) => {
    setNoUnit(selectedNoUnit);
    const targetUnit = units.find(
      (u) => u.nomorUnit === selectedNoUnit || u.cnNew === selectedNoUnit
    );
    if (targetUnit) {
      setNamaAlat(targetUnit.namaAlat || '');
      setJenisUnit(targetUnit.jenis || '');
      if (targetUnit.hm && !hmPengisian) {
        setHmPengisian(targetUnit.hm.toString());
      }
    } else {
      setNamaAlat('');
      setJenisUnit('');
    }
  };

  // Saat Operator dipilih dari Manpower Modul 2
  const handleOperatorChange = (selectedName: string) => {
    setNamaOperator(selectedName);
    const target = manpowerList.find((m) => m.nama === selectedName);
    if (target) {
      setOperatorJabatan(target.jabatan);
    } else {
      setOperatorJabatan('');
    }
  };

  // Saat Driver FT dipilih
  const handleDriverFtChange = (selectedName: string) => {
    setDriverFt(selectedName);
    const target = manpowerList.find((m) => m.nama === selectedName);
    if (target) {
      setDriverFtJabatan(target.jabatan);
    } else {
      setDriverFtJabatan('');
    }
  };

  // Saat PIC FOG dipilih
  const handlePicFogChange = (selectedName: string) => {
    setPicFog(selectedName);
    const target = manpowerList.find((m) => m.nama === selectedName);
    if (target) {
      setPicFogJabatan(target.jabatan);
    } else {
      setPicFogJabatan('');
    }
  };

  // Kalkulasi selisih flowmeter
  const handleCalculateFromFlowmeter = () => {
    const start = parseFloat(flowmeterStart);
    const end = parseFloat(flowmeterEnd);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diff = Math.round((end - start) * 100) / 100;
      setQty(diff.toString());
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setTanggal(todayStr);
    setJam(new Date().toTimeString().substring(0, 5));
    setNoUnit('');
    setNamaAlat('');
    setJenisUnit('');
    setNamaOperator('');
    setOperatorJabatan('');
    setHmPengisian('');
    setLokasi('Tambang');
    setLokasiDetail('');
    setDriverFt('');
    setDriverFtJabatan('');
    setPicFog('');
    setPicFogJabatan('');
    setFlowmeterStart('');
    setFlowmeterEnd('');
    setQty('');
    setSatuan('Ltr');
    setDokumenNumber('');
    setRemark('');
  };

  const handleEditClick = (rec: FogFuelDistributionRecord) => {
    setEditingId(rec.id);
    setTanggal(rec.tanggal);
    setJam(rec.jam || '08:00');
    setNoUnit(rec.noUnit);
    setNamaAlat(rec.namaAlat || '');
    setJenisUnit(rec.jenisUnit || '');
    setNamaOperator(rec.namaOperator || '');
    setOperatorJabatan(rec.operatorJabatan || '');
    setHmPengisian(rec.hmPengisian !== undefined ? rec.hmPengisian.toString() : '');
    setLokasi((rec.lokasi as FogDistributionLokasiOption) || 'Tambang');
    setLokasiDetail(rec.lokasiDetail || '');
    setDriverFt(rec.driverFt || '');
    setDriverFtJabatan(rec.driverFtJabatan || '');
    setPicFog(rec.picFog || '');
    setPicFogJabatan(rec.picFogJabatan || '');
    setFlowmeterStart(rec.flowmeterStart !== undefined ? rec.flowmeterStart.toString() : '');
    setFlowmeterEnd(rec.flowmeterEnd !== undefined ? rec.flowmeterEnd.toString() : '');
    setQty(rec.qty.toString());
    setSatuan((rec.satuan as FogSatuanOption) || 'Ltr');
    setDokumenNumber(rec.dokumenNumber || '');
    setRemark(rec.remark || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!tanggal) {
      setStatusMessage({ type: 'error', text: 'Tanggal pengisian wajib diisi!' });
      return;
    }
    if (!noUnit) {
      setStatusMessage({ type: 'error', text: 'No Unit wajib dipilih dari Data Unit Modul 1!' });
      return;
    }
    if (!namaOperator) {
      setStatusMessage({ type: 'error', text: 'Nama Operator wajib diisi!' });
      return;
    }
    const numHm = parseFloat(hmPengisian);
    if (isNaN(numHm) || numHm < 0) {
      setStatusMessage({ type: 'error', text: 'HM Pengisian wajib berupa angka yang valid!' });
      return;
    }
    if (!driverFt) {
      setStatusMessage({ type: 'error', text: 'Driver FT wajib dipilih dari Data Manpower Modul 2!' });
      return;
    }
    if (!picFog) {
      setStatusMessage({ type: 'error', text: 'PIC FOG wajib dipilih dari Data Manpower Modul 2!' });
      return;
    }
    const numQty = parseFloat(qty);
    if (isNaN(numQty) || numQty <= 0) {
      setStatusMessage({ type: 'error', text: 'Qty penyaluran bahan bakar harus berupa angka lebih dari 0!' });
      return;
    }

    const numFlowStart = parseFloat(flowmeterStart) || 0;
    const numFlowEnd = parseFloat(flowmeterEnd) || 0;

    const payload = {
      tanggal,
      jam: jam || '08:00',
      noUnit,
      namaAlat,
      jenisUnit,
      namaOperator,
      operatorJabatan,
      hmPengisian: numHm,
      lokasi,
      lokasiDetail: lokasi === 'Other' ? lokasiDetail.trim() : undefined,
      driverFt,
      driverFtJabatan,
      picFog,
      picFogJabatan,
      flowmeterStart: numFlowStart,
      flowmeterEnd: numFlowEnd,
      qty: numQty,
      satuan,
      namaBarang: 'SOLAR',
      dokumenNumber: dokumenNumber.trim() || undefined,
      remark: remark.trim() || undefined,
      createdBy: currentUser.fullName || currentUser.username,
    };

    const res = onSave(payload, editingId || undefined);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      handleResetForm();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleDelete = (id: string) => {
    const res = onDelete(id);
    setDeleteConfirmId(null);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const filteredList = fogDistributions.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.noUnit.toLowerCase().includes(q) ||
      (item.namaAlat || '').toLowerCase().includes(q) ||
      (item.namaOperator || '').toLowerCase().includes(q) ||
      (item.driverFt || '').toLowerCase().includes(q) ||
      (item.picFog || '').toLowerCase().includes(q) ||
      (item.lokasi || '').toLowerCase().includes(q) ||
      (item.dokumenNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Form Distribution Fuel */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                {editingId ? 'EDIT DATA DISTRIBUTION FUEL' : 'FORM 2. DISTRIBUTION FUEL (PENGISIAN BBM UNIT)'}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Pencatatan pengisian bahan bakar (Fuel/Solar) dari Fuel Truck (FT) ke armada operasional di Pabrik, Tambang, atau Other.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={handleResetForm}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 text-xs sm:text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <div className="flex-1">{statusMessage.text}</div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Baris 1: a. Tanggal & b. Jam Pengisian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-tanggal" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                a. Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                id="fuel-dist-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-jam" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                b. Jam Pengisian <span className="text-rose-500">*</span>
              </label>
              <input
                id="fuel-dist-jam"
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-voucher" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                No. Voucher / Bon Fuel (Opsional)
              </label>
              <input
                id="fuel-dist-voucher"
                type="text"
                value={dokumenNumber}
                onChange={(e) => setDokumenNumber(e.target.value)}
                placeholder="Contoh: VCR-2026/09-089"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Baris 2: c. No unit & d. Nama Operator & e. HM Pengisian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* c. No unit */}
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-unit" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                c. No Unit <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Reff Modul 1)</span>
              </label>
              <select
                id="fuel-dist-unit"
                value={noUnit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-bold focus:outline-none focus:border-amber-500 font-mono"
                required
              >
                <option value="">-- Pilih No Unit --</option>
                {units.map((u) => {
                  const displayNo = u.nomorUnit || u.cnNew;
                  return (
                    <option key={u.id} value={displayNo}>
                      {displayNo} — {u.namaAlat} [{u.jenis}]
                    </option>
                  );
                })}
              </select>
              {namaAlat && (
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-1">
                  <span>Alat:</span>
                  <span className="font-semibold text-stone-200">{namaAlat}</span>
                  <span>({jenisUnit})</span>
                </div>
              )}
            </div>

            {/* d. Nama Operator */}
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-operator" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                d. Nama Operator <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <select
                  id="fuel-dist-operator-select"
                  value={namaOperator}
                  onChange={(e) => handleOperatorChange(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih dari Manpower Modul 2 --</option>
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — [{m.jabatan}]
                    </option>
                  ))}
                </select>
                <input
                  id="fuel-dist-operator-custom"
                  type="text"
                  value={namaOperator}
                  onChange={(e) => handleOperatorChange(e.target.value)}
                  placeholder="Atau ketik nama operator langsung..."
                  className="w-full bg-stone-950/60 border border-stone-800 rounded-xl px-3.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* e. HM Pengisian */}
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-hm" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                e. HM Pengisian <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Type Number)</span>
              </label>
              <input
                id="fuel-dist-hm"
                type="number"
                step="any"
                value={hmPengisian}
                onChange={(e) => setHmPengisian(e.target.value)}
                placeholder="Contoh: 1250.5"
                className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Baris 3: f. Lokasi (Drop Down Pabrik, Tambang, Other) */}
          <div className="space-y-1.5">
            <label htmlFor="fuel-dist-lokasi" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              f. Lokasi Pengisian <span className="text-rose-500">*</span>{' '}
              <span className="text-[11px] font-normal text-stone-400">(Drop Down Pabrik, Tambang, Other)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                id="fuel-dist-lokasi"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value as FogDistributionLokasiOption)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-bold focus:outline-none focus:border-amber-500"
                required
              >
                {FOG_DISTRIBUTION_LOKASI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {lokasi === 'Other' && (
                <div className="sm:col-span-2">
                  <input
                    id="fuel-dist-lokasi-detail"
                    type="text"
                    value={lokasiDetail}
                    onChange={(e) => setLokasiDetail(e.target.value)}
                    placeholder="Sebutkan lokasi spesifik (misal: Stockpile Barat, Workshop Crusher, dll)..."
                    className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Baris 4: g. Driver FT & h. PIC FOG (Pilih dari Data Manpower Modul 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-stone-950/50 p-4 rounded-xl border border-stone-800">
            {/* g. Driver FT */}
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-driver-ft" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                g. Driver FT <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Pilih dari data Manpower)</span>
              </label>
              <select
                id="fuel-dist-driver-ft"
                value={driverFt}
                onChange={(e) => handleDriverFtChange(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">-- Pilih Driver Fuel Truck --</option>
                {manpowerList.map((m) => (
                  <option key={m.id} value={m.nama}>
                    {m.nama} — [{m.jabatan}]
                  </option>
                ))}
              </select>
              {driverFtJabatan && (
                <p className="text-[11px] text-stone-400">Jabatan: <span className="text-stone-200 font-semibold">{driverFtJabatan}</span></p>
              )}
            </div>

            {/* h. PIC FOG */}
            <div className="space-y-1.5">
              <label htmlFor="fuel-dist-pic-fog" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                h. PIC FOG <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Pilih dari data Manpower)</span>
              </label>
              <select
                id="fuel-dist-pic-fog"
                value={picFog}
                onChange={(e) => handlePicFogChange(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">-- Pilih PIC FOG Lapangan --</option>
                {manpowerList.map((m) => (
                  <option key={m.id} value={m.nama}>
                    {m.nama} — [{m.jabatan}]
                  </option>
                ))}
              </select>
              {picFogJabatan && (
                <p className="text-[11px] text-stone-400">Jabatan: <span className="text-stone-200 font-semibold">{picFogJabatan}</span></p>
              )}
            </div>
          </div>

          {/* Baris 5: i. Flowmeter reading Start/End & j. Qty Ltr/Kg/Drum/Pail */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Gauge className="w-4 h-4" />
                <span>i. Flowmeter Reading & j. Qty Penyaluran Fuel</span>
              </div>
              <button
                type="button"
                onClick={handleCalculateFromFlowmeter}
                className="self-start text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
              >
                Hitung Qty dari Flowmeter (End - Start)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fuel-dist-flow-start" className="block text-xs font-semibold text-stone-300">
                  Start ............ (Type Number)
                </label>
                <input
                  id="fuel-dist-flow-start"
                  type="number"
                  step="any"
                  value={flowmeterStart}
                  onChange={(e) => setFlowmeterStart(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fuel-dist-flow-end" className="block text-xs font-semibold text-stone-300">
                  End ............. (Type Number)
                </label>
                <input
                  id="fuel-dist-flow-end"
                  type="number"
                  step="any"
                  value={flowmeterEnd}
                  onChange={(e) => setFlowmeterEnd(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fuel-dist-qty" className="block text-xs font-semibold text-stone-300">
                  j. Qty ............ (Type Number) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="fuel-dist-qty"
                    type="number"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Liter"
                    className="flex-1 bg-stone-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                  <select
                    id="fuel-dist-satuan"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value as FogSatuanOption)}
                    className="w-28 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {FOG_SATUAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-1.5">
            <label htmlFor="fuel-dist-remark" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              Remark / Catatan Pengisian
            </label>
            <input
              id="fuel-dist-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Catatan kondisi saat pengisian di lapangan..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 transition"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              className="px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'SIMPAN PERUBAHAN FUEL' : 'SIMPAN DISTRIBUTION FUEL'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Data Riwayat Distribution Fuel */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide uppercase">
              DATA DISTRIBUTION FUEL (PENGISIAN BBM UNIT)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Total {fogDistributions.length} catatan pengisian Fuel ke unit armada operasional.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Unit / Operator / Driver FT..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-stone-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-950/90 text-stone-400 font-mono uppercase text-[11px] border-b border-stone-800">
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">Tanggal & Jam</th>
                <th className="py-3 px-3">No Unit</th>
                <th className="py-3 px-3">Nama Operator</th>
                <th className="py-3 px-3 text-right">HM Pengisian</th>
                <th className="py-3 px-3">Lokasi</th>
                <th className="py-3 px-3">Driver FT</th>
                <th className="py-3 px-3">PIC FOG</th>
                <th className="py-3 px-3 text-right">Flowmeter</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-stone-500 font-sans">
                    Belum ada data distribusi fuel. Silakan isi form di atas.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-stone-850/50 transition">
                    <td className="py-3 px-3 text-stone-500">{idx + 1}</td>
                    <td className="py-3 px-3 text-stone-200">
                      <div>{rec.tanggal}</div>
                      <div className="text-[10px] text-stone-400">{rec.jam} WIB</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-amber-400">{rec.noUnit}</div>
                      <div className="text-[10px] font-sans text-stone-400">{rec.namaAlat}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-stone-200">{rec.namaOperator}</div>
                      <div className="text-[10px] text-stone-400">{rec.operatorJabatan}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-200">
                      {rec.hmPengisian.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-300">
                        {rec.lokasi}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-stone-300 text-[11px]">
                      <div>{rec.driverFt}</div>
                    </td>
                    <td className="py-3 px-3 font-sans text-stone-300 text-[11px]">
                      <div>{rec.picFog}</div>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-400 text-[11px]">
                      {rec.flowmeterStart || rec.flowmeterEnd ? (
                        <span>{rec.flowmeterStart} &rarr; {rec.flowmeterEnd}</span>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                      {rec.qty.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">{rec.satuan}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewDetailModalRecord(rec)}
                          title="Lihat Detail"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(rec)}
                          title="Edit"
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(rec.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Detail Distribution Fuel */}
      {viewDetailModalRecord && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <h3 className="font-mono font-black text-stone-100 text-base">
                  DETAIL DISTRIBUTION FUEL
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailModalRecord(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-300">
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">No Unit:</span>
                <span className="font-mono font-bold text-amber-400">
                  {viewDetailModalRecord.noUnit} — {viewDetailModalRecord.namaAlat}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Tanggal & Jam:</span>
                <span className="font-mono">{viewDetailModalRecord.tanggal} — {viewDetailModalRecord.jam} WIB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Nama Operator:</span>
                <span className="font-bold text-stone-100">{viewDetailModalRecord.namaOperator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">HM Pengisian:</span>
                <span className="font-mono font-bold text-emerald-400">{viewDetailModalRecord.hmPengisian}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Lokasi:</span>
                <span className="font-bold text-stone-200">
                  {viewDetailModalRecord.lokasi}
                  {viewDetailModalRecord.lokasiDetail ? ` (${viewDetailModalRecord.lokasiDetail})` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Driver FT:</span>
                <span className="font-bold text-stone-100">{viewDetailModalRecord.driverFt} ({viewDetailModalRecord.driverFtJabatan || '-'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">PIC FOG:</span>
                <span className="font-bold text-stone-100">{viewDetailModalRecord.picFog} ({viewDetailModalRecord.picFogJabatan || '-'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Flowmeter Reading:</span>
                <span className="font-mono">Start: {viewDetailModalRecord.flowmeterStart} | End: {viewDetailModalRecord.flowmeterEnd}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Qty Fuel Disalurkan:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {viewDetailModalRecord.qty} {viewDetailModalRecord.satuan}
                </span>
              </div>
              {viewDetailModalRecord.dokumenNumber && (
                <div className="flex justify-between py-1 border-b border-stone-800/60">
                  <span className="text-stone-400">No. Voucher:</span>
                  <span className="font-mono">{viewDetailModalRecord.dokumenNumber}</span>
                </div>
              )}
              {viewDetailModalRecord.remark && (
                <div className="pt-2">
                  <span className="text-stone-400 block mb-1">Catatan / Remark:</span>
                  <p className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300">
                    {viewDetailModalRecord.remark}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewDetailModalRecord(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Hapus */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-mono font-bold text-stone-100 text-sm">
                Konfirmasi Hapus Data
              </h3>
            </div>
            <p className="text-xs text-stone-400">
              Apakah Anda yakin ingin menghapus data pengisian fuel ini dari sistem?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold"
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
