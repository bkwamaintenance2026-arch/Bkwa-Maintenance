import React, { useState } from 'react';
import { 
  FuelStockInputRecord, 
  SupplierRecord, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Fuel, 
  Plus, 
  Search, 
  History, 
  FileText, 
  Gauge, 
  Calendar, 
  Clock, 
  User, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  TrendingDown,
  Building2,
  Ruler,
  Lock
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface FuelStockInputSubViewProps {
  fuelStockInputs: FuelStockInputRecord[];
  suppliers: SupplierRecord[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<FuelStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelStockInputRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const FuelStockInputSubView: React.FC<FuelStockInputSubViewProps> = ({
  fuelStockInputs,
  suppliers,
  manpowerList,
  currentUser,
  onSave,
  onDelete,
}) => {
  const canEdit = canUserEdit(currentUser, 4);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states sesuai instruksi:
  // a. Distributor (Dropdown reff by "Data SUplier")
  // b. SN/Reff No
  // c. Plat Nomor
  // d. Driver Name
  // e. qty (Suplier)
  // f. Flowmeter Start
  // g. Flowmeter End
  // h. Actual Qty Flowmeter
  // i. Hasil Ukur Stick (Sebelum)
  // j. Hasil Ukur Stick (Sesudah)
  // k. PIC FOG Name : (dropdown reff nama Manpower di modul 2)
  // l. Tanggal dan jam Input
  // m. Remark
  const [distributor, setDistributor] = useState('');
  const [snReffNo, setSnReffNo] = useState('');
  const [platNomor, setPlatNomor] = useState('');
  const [driverName, setDriverName] = useState('');
  const [qtySupplier, setQtySupplier] = useState<number | ''>('');
  const [flowmeterStart, setFlowmeterStart] = useState<number | ''>('');
  const [flowmeterEnd, setFlowmeterEnd] = useState<number | ''>('');
  const [actualQtyFlowmeter, setActualQtyFlowmeter] = useState<number | ''>('');
  const [hasilUkurStickSebelum, setHasilUkurStickSebelum] = useState<string>('');
  const [hasilUkurStickSesudah, setHasilUkurStickSesudah] = useState<string>('');
  const [picFogName, setPicFogName] = useState('');
  const [picFogJabatan, setPicFogJabatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [remark, setRemark] = useState('');

  // Filter distributor yang relevan dengan BBM / Solar
  const fuelSuppliers = suppliers.filter(
    (s) => s.itemName.toLowerCase().includes('solar') || s.itemName.toLowerCase().includes('bbm') || s.namaDistributor.toLowerCase().includes('pertamina')
  );
  const effectiveSuppliers = fuelSuppliers.length > 0 ? fuelSuppliers : suppliers;

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null);
    setDistributor(effectiveSuppliers[0]?.namaDistributor || '');
    setSnReffNo(`DO-BBM-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`);
    setPlatNomor('');
    setDriverName('');
    setQtySupplier('');
    setFlowmeterStart('');
    setFlowmeterEnd('');
    setActualQtyFlowmeter('');
    setHasilUkurStickSebelum('');
    setHasilUkurStickSesudah('');
    
    // Default PIC dari manpower
    const defaultPic = manpowerList[0];
    setPicFogName(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicFogJabatan(defaultPic?.jabatan || 'Staff Logistik');

    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (record: FuelStockInputRecord) => {
    if (!canEdit) return;
    setEditingId(record.id);
    setDistributor(record.distributor);
    setSnReffNo(record.snReffNo);
    setPlatNomor(record.platNomor);
    setDriverName(record.driverName);
    setQtySupplier(record.qtySupplier);
    setFlowmeterStart(record.flowmeterStart);
    setFlowmeterEnd(record.flowmeterEnd);
    setActualQtyFlowmeter(record.actualQtyFlowmeter);
    setHasilUkurStickSebelum(record.hasilUkurStickSebelum?.toString() || '');
    setHasilUkurStickSesudah(record.hasilUkurStickSesudah?.toString() || '');
    setPicFogName(record.picFogName);
    setPicFogJabatan(record.picFogJabatan || '');
    setTanggal(record.tanggal);
    setJam(record.jam);
    setRemark(record.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  // Auto calculate Actual Qty Flowmeter saat Start dan End terisi
  const handleFlowmeterChange = (startVal: number | '', endVal: number | '') => {
    setFlowmeterStart(startVal);
    setFlowmeterEnd(endVal);
    if (typeof startVal === 'number' && typeof endVal === 'number') {
      const diff = endVal - startVal;
      if (diff >= 0) {
        setActualQtyFlowmeter(diff);
      }
    }
  };

  const handlePicChange = (nama: string) => {
    setPicFogName(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicFogJabatan(found.jabatan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg('Akses Ditolak: Akun Anda dalam mode "Hanya View". Penambahan/perubahan input stock BBM tidak diizinkan.');
      return;
    }
    if (!distributor) {
      setErrorMsg('Distributor wajib dipilih!');
      return;
    }
    if (!snReffNo.trim()) {
      setErrorMsg('SN/Reff No (Surat Jalan / DO) wajib diisi!');
      return;
    }
    if (qtySupplier === '' || Number(qtySupplier) <= 0) {
      setErrorMsg('Qty (Suplier) harus berupa angka lebih dari 0!');
      return;
    }
    if (actualQtyFlowmeter === '' || Number(actualQtyFlowmeter) <= 0) {
      setErrorMsg('Actual Qty Flowmeter wajib diisi atau dihitung!');
      return;
    }

    const res = onSave(
      {
        distributor,
        snReffNo: snReffNo.trim(),
        platNomor: platNomor.trim(),
        driverName: driverName.trim(),
        qtySupplier: Number(qtySupplier),
        flowmeterStart: Number(flowmeterStart) || 0,
        flowmeterEnd: Number(flowmeterEnd) || 0,
        actualQtyFlowmeter: Number(actualQtyFlowmeter),
        hasilUkurStickSebelum: hasilUkurStickSebelum.trim(),
        hasilUkurStickSesudah: hasilUkurStickSesudah.trim(),
        picFogName,
        picFogJabatan,
        tanggal,
        jam,
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
    if (!canEdit) return;
    onDelete(id);
    setDeleteConfirmId(null);
  };

  // ==========================================
  // TOP 5 LAST TRANSAKSI INPUT STOCK
  // Berisi: Tanggal, Nama Distributor, Flowmeter Start-End, Qty(Suplier), Actual Qty Flowmeter
  // ==========================================
  const top5LastTransactions = [...fuelStockInputs]
    .sort((a, b) => {
      const tA = new Date(`${a.tanggal}T${a.jam || '00:00'}`).getTime();
      const tB = new Date(`${b.tanggal}T${b.jam || '00:00'}`).getTime();
      return tB - tA;
    })
    .slice(0, 5);

  const filteredList = fuelStockInputs.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.distributor.toLowerCase().includes(q) ||
      item.snReffNo.toLowerCase().includes(q) ||
      item.platNomor.toLowerCase().includes(q) ||
      item.driverName.toLowerCase().includes(q) ||
      item.picFogName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                2. INPUT STOCK (FUEL) - TANGKI UTAMA
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Penerimaan BBM Solar industri ke Tangki Timbun Utama Quarry Purwosari.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari Reff, Distributor, Plat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50 w-56 sm:w-64"
            />
          </div>

          {canEdit ? (
            <button
              id="btn-add-fuel-stock"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Stock Fuel</span>
            </button>
          ) : (
            <button
              id="btn-add-fuel-stock"
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-500 border border-stone-700 font-bold text-xs cursor-not-allowed opacity-75"
              title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data."
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>+ Input Stock Fuel (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET: TOP 5 LAST TRANSAKSI INPUT STOCK */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
              TOP 5 LAST TRANSAKSI INPUT STOCK (FUEL)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
            5 Transaksi Penerimaan Solar Terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/80 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-2.5 px-3">Tanggal & Jam</th>
                <th className="py-2.5 px-3">Nama Distributor</th>
                <th className="py-2.5 px-3">Flowmeter Start - End</th>
                <th className="py-2.5 px-3 text-right">Qty (Suplier)</th>
                <th className="py-2.5 px-3 text-right">Actual Qty Flowmeter</th>
                <th className="py-2.5 px-3 text-center">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {top5LastTransactions.map((tx, idx) => {
                const diff = (Number(tx.actualQtyFlowmeter) || 0) - (Number(tx.qtySupplier) || 0);
                return (
                  <tr key={tx.id || idx} className="hover:bg-stone-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-stone-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>{tx.tanggal}</span>
                        <span className="text-stone-500">{tx.jam}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>{tx.distributor}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block">
                        Reff: {tx.snReffNo} • Plat: {tx.platNomor || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-300">
                      {tx.flowmeterStart.toLocaleString('id-ID')} → {tx.flowmeterEnd.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-200 text-right">
                      {tx.qtySupplier.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">Ltr</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-right">
                      {tx.actualQtyFlowmeter.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">Ltr</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          diff === 0
                            ? 'bg-stone-800 text-stone-300'
                            : diff > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff} Ltr
                      </span>
                    </td>
                  </tr>
                );
              })}

              {top5LastTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    Belum ada riwayat transaksi Input Stock Fuel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DAFTAR LENGKAP INPUT STOCK (FUEL) */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            SEMUA DATA PENERIMAAN STOCK FUEL (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">Tanggal / Jam</th>
                <th className="py-3 px-3">Distributor / Reff</th>
                <th className="py-3 px-3">Armada & Supir</th>
                <th className="py-3 px-3">Stick Ukur (Sblm / Ssdh)</th>
                <th className="py-3 px-3">Flowmeter (Start / End)</th>
                <th className="py-3 px-3 text-right">Qty Suplier</th>
                <th className="py-3 px-3 text-right">Actual Flowmeter</th>
                <th className="py-3 px-3">PIC FOG</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                    <div>{item.tanggal}</div>
                    <div className="text-[10px] text-stone-500">{item.jam}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-amber-400">{item.distributor}</div>
                    <div className="text-[10px] font-mono text-stone-400">SN: {item.snReffNo}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-stone-200">Plat: {item.platNomor || '-'}</div>
                    <div className="text-stone-400">Supir: {item.driverName || '-'}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    <div className="flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-stone-500" />
                      <span>{item.hasilUkurStickSebelum || '-'} cm → {item.hasilUkurStickSesudah || '-'} cm</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    <div>Start: {item.flowmeterStart.toLocaleString('id-ID')}</div>
                    <div>End: {item.flowmeterEnd.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-stone-200 text-right">
                    {item.qtySupplier.toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right">
                    {item.actualQtyFlowmeter.toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-stone-200 font-semibold">{item.picFogName}</div>
                    <div className="text-[10px] text-stone-500">{item.picFogJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleOpenEdit(item)}
                        className={`p-1.5 rounded-lg transition border ${
                          canEdit
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Edit Record' : 'Akun Anda dalam mode Hanya View'}
                      >
                        {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setDeleteConfirmId(item.id)}
                        className={`p-1.5 rounded-lg transition border ${
                          canEdit
                            ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-300'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Hapus Record' : 'Akun Anda dalam mode Hanya View'}
                      >
                        {canEdit ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500">
                    Tidak ada catatan Input Stock Fuel yang sesuai filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL INPUT / EDIT INPUT STOCK (FUEL) */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Input Stock (Fuel)' : 'Form Input Stock (Fuel) Tangki Utama'}
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

              {/* Baris 1: a. Distributor & b. SN/Reff No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    a. Distributor (Reff: Data Suplier) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={distributor}
                    onChange={(e) => setDistributor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60"
                  >
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.namaDistributor}>
                        {sup.namaDistributor} ({sup.itemName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    b. SN/Reff No (Surat Jalan / DO) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SJ-PTM-2026/09/088"
                    value={snReffNo}
                    onChange={(e) => setSnReffNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Baris 2: c. Plat Nomor & d. Driver Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    c. Plat Nomor Armada Pengirim
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: L 9821 UA"
                    value={platNomor}
                    onChange={(e) => setPlatNomor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    d. Driver Name (Pengemudi Truk Tangki)
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Supir Tangki Vendor"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Baris 3: e. qty (Suplier) & f, g Flowmeter */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Kalkulasi Volume & Flowmeter Tangki Utama</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      e. Qty (Suplier) - Ltr <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Volume DO Vendor"
                      value={qtySupplier}
                      onChange={(e) => setQtySupplier(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      f. Flowmeter Start
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Awal"
                      value={flowmeterStart}
                      onChange={(e) => handleFlowmeterChange(e.target.value === '' ? '' : Number(e.target.value), flowmeterEnd)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      g. Flowmeter End
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Akhir"
                      value={flowmeterEnd}
                      onChange={(e) => handleFlowmeterChange(flowmeterStart, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>

                {/* h. Actual Qty Flowmeter */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    h. Actual Qty Flowmeter (Liter) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Hasil kalkulasi Flowmeter End - Start"
                    value={actualQtyFlowmeter}
                    onChange={(e) => setActualQtyFlowmeter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-amber-500/40 rounded-xl text-amber-400 font-mono font-black text-sm focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    *Otomatis terhitung dari selisih Flowmeter End dikurangi Flowmeter Start.
                  </span>
                </div>
              </div>

              {/* Baris 4: i. Hasil Ukur Stick (Sebelum) & j. Hasil Ukur Stick (Sesudah) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    i. Hasil Ukur Stick (Sebelum)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 45 cm / level awal"
                    value={hasilUkurStickSebelum}
                    onChange={(e) => setHasilUkurStickSebelum(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    j. Hasil Ukur Stick (Sesudah)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 185 cm / level akhir"
                    value={hasilUkurStickSesudah}
                    onChange={(e) => setHasilUkurStickSesudah(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Baris 5: k. PIC FOG Name (Dropdown Reff Manpower Modul 2) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  k. PIC FOG Name (Reff: Manpower Modul 2) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={picFogName}
                  onChange={(e) => handlePicChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60"
                >
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — {m.jabatan} ({m.nik})
                    </option>
                  ))}
                </select>
                {picFogJabatan && (
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    Jabatan Terpilih: {picFogJabatan}
                  </span>
                )}
              </div>

              {/* Baris 6: l. Tanggal dan jam Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    l. Tanggal Input <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Input <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Baris 7: m. Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Remark / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi BBM solar, density, segel transportir dll"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
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
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingId ? 'Simpan Perubahan' : 'Catat Input Stock Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Transaksi Penerimaan Fuel?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data penerimaan ini akan dihapus dan mempengaruhi total perhitungan stock tangki utama.
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
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
