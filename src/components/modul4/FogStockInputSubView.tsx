import React, { useState } from 'react';
import { 
  FogStockInputRecord, 
  FogSatuanOption, 
  FOG_SATUAN_OPTIONS, 
  FogJenisCategory,
  FOG_JENIS_CATEGORIES,
  DEFAULT_FOG_NAMA_BARANG,
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Fuel, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Gauge, 
  Truck, 
  FileText, 
  Save, 
  RotateCcw, 
  Search, 
  Eye, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle,
  X,
  Plus
} from 'lucide-react';

interface FogStockInputSubViewProps {
  manpowerList: ManpowerData[];
  fogStockInputs: FogStockInputRecord[];
  currentUser: UserAccount;
  availableOilTypes: string[];
  onSave: (
    data: Omit<FogStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FogStockInputRecord };
  onDelete: (id: string) => { success: boolean; message: string };
  onAddCustomOilType?: (name: string) => void;
}

export const FogStockInputSubView: React.FC<FogStockInputSubViewProps> = ({
  manpowerList,
  fogStockInputs,
  currentUser,
  availableOilTypes,
  onSave,
  onDelete,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().substring(0, 5);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(todayStr); // a. Tanggal
  const [jam, setJam] = useState<string>(nowTimeStr); // b. Jam
  const [pic, setPic] = useState<string>(''); // c. PIC - Drop down dari data manpower modul 2
  const [picJabatan, setPicJabatan] = useState<string>('');
  const [jenis, setJenis] = useState<FogJenisCategory>('Fuel'); // d. Jenis - Drop Down Fuel, Oil, Grease
  const [namaBarang, setNamaBarang] = useState<string>('SOLAR'); // e. Nama Barang : Drop Down
  const [lokasiDari, setLokasiDari] = useState<string>(''); // f. Lokasi - Dari .....................
  const [lokasiKe, setLokasiKe] = useState<string>('Tangki Utama'); //    ke .......................
  const [flowmeterStart, setFlowmeterStart] = useState<string>(''); // g. Flowmeter reading - Start............ (Type Number)
  const [flowmeterEnd, setFlowmeterEnd] = useState<string>(''); //                        End............. (Type Number)
  const [qty, setQty] = useState<string>(''); // h. Qty............ (type Number)
  const [satuan, setSatuan] = useState<FogSatuanOption>('Ltr'); // Ltr/Kg/Drum/Pail
  const [identitasTransportPengirim, setIdentitasTransportPengirim] = useState<string>(''); // i. Identitas Transport Pengirim ...................
  const [identitasArmada, setIdentitasArmada] = useState<string>('Tangki Utama'); // h. Identitas Armada.................
  const [dokumenNumber, setDokumenNumber] = useState<string>(''); // i. Dokumen Number
  const [remark, setRemark] = useState<string>('');

  // UI feedback & Search
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewDetailModalRecord, setViewDetailModalRecord] = useState<FogStockInputRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Menggabungkan pilihan nama barang default + custom
  const allNamaBarangOptions = Array.from(new Set([...DEFAULT_FOG_NAMA_BARANG, ...availableOilTypes]));

  // Saat PIC dipilih dari Manpower Modul 2, update jabatannya otomatis
  const handlePicChange = (picName: string) => {
    setPic(picName);
    const target = manpowerList.find((m) => m.nama === picName);
    if (target) {
      setPicJabatan(target.jabatan);
    } else {
      setPicJabatan('');
    }
  };

  // Saat Jenis berubah, set default Nama Barang yang cocok
  const handleJenisChange = (newJenis: FogJenisCategory) => {
    setJenis(newJenis);
    if (newJenis === 'Fuel') {
      setNamaBarang('SOLAR');
      setSatuan('Ltr');
    } else if (newJenis === 'Oil') {
      setNamaBarang('TURALIK 52 PERTAMINA');
      setSatuan('Ltr');
    } else if (newJenis === 'Grease') {
      setNamaBarang('GREASE CHASSIS EP-2');
      setSatuan('Drum');
    }
  };

  // Kalkulasi selisih flowmeter otomatis jika diisi
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
    setPic('');
    setPicJabatan('');
    setJenis('Fuel');
    setNamaBarang('SOLAR');
    setLokasiDari('');
    setLokasiKe('Tangki Utama');
    setFlowmeterStart('');
    setFlowmeterEnd('');
    setQty('');
    setSatuan('Ltr');
    setIdentitasTransportPengirim('');
    setIdentitasArmada('Tangki Utama');
    setDokumenNumber('');
    setRemark('');
  };

  const handleEditClick = (rec: FogStockInputRecord) => {
    setEditingId(rec.id);
    setTanggal(rec.tanggal);
    setJam(rec.jam || '08:00');
    setPic(rec.pic);
    setPicJabatan(rec.picJabatan || '');
    setJenis((rec.jenis as FogJenisCategory) || 'Fuel');
    setNamaBarang(rec.namaBarang || 'SOLAR');
    setLokasiDari(rec.lokasiDari);
    setLokasiKe(rec.lokasiKe);
    setFlowmeterStart(rec.flowmeterStart ? rec.flowmeterStart.toString() : '');
    setFlowmeterEnd(rec.flowmeterEnd ? rec.flowmeterEnd.toString() : '');
    setQty(rec.qty.toString());
    setSatuan((rec.satuan as FogSatuanOption) || 'Ltr');
    setIdentitasTransportPengirim(rec.identitasTransportPengirim);
    setIdentitasArmada(rec.identitasArmada);
    setDokumenNumber(rec.dokumenNumber);
    setRemark(rec.remark || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validasi
    if (!tanggal) {
      setStatusMessage({ type: 'error', text: 'Tanggal wajib diisi!' });
      return;
    }
    if (!pic) {
      setStatusMessage({ type: 'error', text: 'PIC wajib dipilih dari data Manpower Modul 2!' });
      return;
    }
    if (!namaBarang) {
      setStatusMessage({ type: 'error', text: 'Nama Barang wajib dipilih!' });
      return;
    }
    if (!lokasiDari.trim() || !lokasiKe.trim()) {
      setStatusMessage({ type: 'error', text: 'Lokasi (Dari & Ke) wajib diisi!' });
      return;
    }
    const numQty = parseFloat(qty);
    if (isNaN(numQty) || numQty <= 0) {
      setStatusMessage({ type: 'error', text: 'Qty penerimaan harus berupa angka yang valid dan lebih dari 0!' });
      return;
    }
    if (!identitasTransportPengirim.trim()) {
      setStatusMessage({ type: 'error', text: 'Identitas Transport Pengirim wajib diisi!' });
      return;
    }
    if (!identitasArmada.trim()) {
      setStatusMessage({ type: 'error', text: 'Identitas Armada wajib diisi!' });
      return;
    }
    if (!dokumenNumber.trim()) {
      setStatusMessage({ type: 'error', text: 'Dokumen Number (Surat Jalan/DO) wajib diisi!' });
      return;
    }

    const numFlowStart = parseFloat(flowmeterStart) || 0;
    const numFlowEnd = parseFloat(flowmeterEnd) || 0;

    const payload = {
      tanggal,
      jam: jam || '08:00',
      pic,
      picJabatan: picJabatan || '',
      jenis,
      namaBarang,
      lokasiDari: lokasiDari.trim(),
      lokasiKe: lokasiKe.trim(),
      flowmeterStart: numFlowStart,
      flowmeterEnd: numFlowEnd,
      qty: numQty,
      satuan,
      identitasTransportPengirim: identitasTransportPengirim.trim(),
      identitasArmada: identitasArmada.trim(),
      dokumenNumber: dokumenNumber.trim(),
      remark: remark.trim(),
      createdBy: currentUser.fullName || currentUser.username,
    };

    const result = onSave(payload, editingId || undefined);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      handleResetForm();
    } else {
      setStatusMessage({ type: 'error', text: result.message });
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

  // Filter list
  const filteredList = fogStockInputs.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.dokumenNumber.toLowerCase().includes(q) ||
      item.pic.toLowerCase().includes(q) ||
      (item.namaBarang || '').toLowerCase().includes(q) ||
      (item.jenis || '').toLowerCase().includes(q) ||
      item.lokasiDari.toLowerCase().includes(q) ||
      item.lokasiKe.toLowerCase().includes(q) ||
      item.identitasTransportPengirim.toLowerCase().includes(q) ||
      item.identitasArmada.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Form Input Stock FOG (Tangki Utama) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                {editingId ? 'EDIT DATA PENERIMAAN STOCK FOG' : 'FORM INPUT STOCK FOG (TANGKI UTAMA)'}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Input Stock Penerimaan FOG (Fuel, Oil & Grease) ke Tangki Utama / Main Storage Quarry Purwosari.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={handleResetForm}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Batal Edit (Buat Baru)</span>
            </button>
          )}
        </div>

        {/* Feedback Banner */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* a. Tanggal */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-tanggal" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                a. Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                id="fog-input-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                required
              />
            </div>

            {/* b. Jam */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-jam" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                b. Jam (WIB) <span className="text-rose-500">*</span>
              </label>
              <input
                id="fog-input-jam"
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                required
              />
            </div>

            {/* Dokumen Number */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-dokumen" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                i. Dokumen Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="fog-input-dokumen"
                type="text"
                value={dokumenNumber}
                onChange={(e) => setDokumenNumber(e.target.value)}
                placeholder="Contoh: DO/2026/09/FOG-0045"
                className="w-full bg-stone-950 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                required
              />
            </div>

            {/* c. PIC - Drop down dari data manpower modul 2 */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="fog-input-pic" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                c. PIC Penerima <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">
                  (Dropdown dari data Manpower Modul 2)
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  id="fog-input-pic"
                  value={pic}
                  onChange={(e) => handlePicChange(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Pilih PIC Manpower --</option>
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — [{m.jabatan}] ({m.nik})
                    </option>
                  ))}
                </select>

                <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-400">
                  <span className="text-stone-500 mr-2">Jabatan:</span>
                  <span className="font-bold text-amber-400">
                    {picJabatan || '(Otomatis dari Modul 2)'}
                  </span>
                </div>
              </div>
            </div>

            {/* d. Jenis - Drop Down Fuel, Oil, Grease */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-jenis" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                d. Jenis FOG <span className="text-rose-500">*</span>
              </label>
              <select
                id="fog-input-jenis"
                value={jenis}
                onChange={(e) => handleJenisChange(e.target.value as FogJenisCategory)}
                className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-bold focus:outline-none focus:border-amber-500"
                required
              >
                {FOG_JENIS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* e. Nama Barang : Drop Down */}
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="fog-input-nama-barang" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                e. Nama Barang <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">
                  (Pilihan Standar & Tambahan Jenis Oli)
                </span>
              </label>
              <select
                id="fog-input-nama-barang"
                value={namaBarang}
                onChange={(e) => setNamaBarang(e.target.value)}
                className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              >
                {allNamaBarangOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                {jenis === 'Grease' && !allNamaBarangOptions.includes('GREASE CHASSIS EP-2') && (
                  <option value="GREASE CHASSIS EP-2">GREASE CHASSIS EP-2</option>
                )}
              </select>
            </div>
          </div>

          {/* f. Lokasi - Dari ..................... ke ....................... */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <MapPin className="w-4 h-4" />
              <span>f. Lokasi Perpindahan / Penerimaan FOG</span>
              <span className="text-rose-500">*</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fog-input-lokasi-dari" className="block text-xs font-semibold text-stone-300">
                  Dari ................................................
                </label>
                <input
                  id="fog-input-lokasi-dari"
                  type="text"
                  value={lokasiDari}
                  onChange={(e) => setLokasiDari(e.target.value)}
                  placeholder="Contoh: Terminal BBM Pertamina Surabaya / Vendor PT Mitra"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="fog-input-lokasi-ke" className="block text-xs font-semibold text-stone-300">
                  Ke ..................................................
                </label>
                <input
                  id="fog-input-lokasi-ke"
                  type="text"
                  value={lokasiKe}
                  onChange={(e) => setLokasiKe(e.target.value)}
                  placeholder="Contoh: Tangki Utama Purwosari / Main Warehouse Oli"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* g & h. Flowmeter reading & Qty */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Gauge className="w-4 h-4" />
                <span>g. Flowmeter Reading & h. Qty Penerimaan</span>
              </div>
              <button
                type="button"
                onClick={handleCalculateFromFlowmeter}
                className="self-start text-[11px] font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
              >
                <span>Hitung Qty dari Flowmeter (End - Start)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Flowmeter Start */}
              <div className="space-y-1.5">
                <label htmlFor="fog-input-flow-start" className="block text-xs font-semibold text-stone-300">
                  Start ............ (Type Number)
                </label>
                <input
                  id="fog-input-flow-start"
                  type="number"
                  step="any"
                  value={flowmeterStart}
                  onChange={(e) => setFlowmeterStart(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Flowmeter End */}
              <div className="space-y-1.5">
                <label htmlFor="fog-input-flow-end" className="block text-xs font-semibold text-stone-300">
                  End ............. (Type Number)
                </label>
                <input
                  id="fog-input-flow-end"
                  type="number"
                  step="any"
                  value={flowmeterEnd}
                  onChange={(e) => setFlowmeterEnd(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* h. Qty & Satuan */}
              <div className="space-y-1.5">
                <label htmlFor="fog-input-qty" className="block text-xs font-semibold text-stone-300">
                  h. Qty ............ (Type Number) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="fog-input-qty"
                    type="number"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Jumlah"
                    className="flex-1 bg-stone-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                    required
                  />
                  <select
                    id="fog-input-satuan"
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

          {/* i & h. Identitas Transport Pengirim & Identitas Armada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* i. Identitas Transport Pengirim */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-pengirim" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                i. Identitas Transport Pengirim ................... <span className="text-rose-500">*</span>
              </label>
              <input
                id="fog-input-pengirim"
                type="text"
                value={identitasTransportPengirim}
                onChange={(e) => setIdentitasTransportPengirim(e.target.value)}
                placeholder="Contoh: Tangki Pertamina Nopol L 9876 AB / PT Trans Sumber Energi"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            {/* h. Identitas Armada */}
            <div className="space-y-1.5">
              <label htmlFor="fog-input-armada" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                h. Identitas Armada ................. <span className="text-rose-500">*</span>
              </label>
              <input
                id="fog-input-armada"
                type="text"
                value={identitasArmada}
                onChange={(e) => setIdentitasArmada(e.target.value)}
                placeholder="Contoh: Tangki Utama Purwosari / Fuel Truck FT-01"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-1.5">
            <label htmlFor="fog-input-remark" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              Keterangan Tambahan / Remark
            </label>
            <input
              id="fog-input-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Catatan kondisi fisik segel tangki, density bahan bakar, atau catatan DO..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Tombol Simpan & Batal */}
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
              <span>{editingId ? 'SIMPAN PERUBAHAN STOCK' : 'SIMPAN PENERIMAAN STOCK FOG'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Data Hasil Input Stock FOG */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide uppercase">
              DATA PENERIMAAN STOCK FOG (TANGKI UTAMA)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Total {fogStockInputs.length} catatan penerimaan stock tersimpan di sistem.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Dokumen / PIC / Nama Barang..."
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
                <th className="py-3 px-3">No Dokumen</th>
                <th className="py-3 px-3">Jenis</th>
                <th className="py-3 px-3">Nama Barang</th>
                <th className="py-3 px-3">Lokasi (Dari &rarr; Ke)</th>
                <th className="py-3 px-3">PIC (Modul 2)</th>
                <th className="py-3 px-3 text-right">Flowmeter (Start / End)</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3">Armada / Pengirim</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-stone-500 font-sans">
                    Belum ada data input stock FOG. Silakan lengkapi formulir di atas.
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
                    <td className="py-3 px-3 font-bold text-amber-400">
                      {rec.dokumenNumber}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.jenis === 'Fuel' ? 'bg-amber-500/20 text-amber-300' :
                        rec.jenis === 'Oil' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {rec.jenis || 'Fuel'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-200">
                      {rec.namaBarang || 'SOLAR'}
                    </td>
                    <td className="py-3 px-3 font-sans text-stone-300 max-w-[180px] truncate">
                      <div className="truncate text-stone-400 text-[11px]">Dari: {rec.lokasiDari}</div>
                      <div className="truncate text-emerald-400 text-[11px]">Ke: {rec.lokasiKe}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-stone-200">{rec.pic}</div>
                      <div className="text-[10px] text-stone-400">{rec.picJabatan}</div>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-400 text-[11px]">
                      {rec.flowmeterStart || rec.flowmeterEnd ? (
                        <span>
                          {rec.flowmeterStart} &rarr; {rec.flowmeterEnd}
                        </span>
                      ) : (
                        <span className="text-stone-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                      {rec.qty.toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-normal text-stone-400">{rec.satuan}</span>
                    </td>
                    <td className="py-3 px-3 font-sans text-stone-400 text-[11px]">
                      <div>{rec.identitasArmada}</div>
                      <div className="text-[10px] text-stone-500">Exp: {rec.identitasTransportPengirim}</div>
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

      {/* Modal View Detail Stock FOG */}
      {viewDetailModalRecord && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <h3 className="font-mono font-black text-stone-100 text-base">
                  DETAIL INPUT STOCK FOG
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
                <span className="text-stone-400">No Dokumen:</span>
                <span className="font-mono font-bold text-amber-400">{viewDetailModalRecord.dokumenNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Tanggal & Jam:</span>
                <span className="font-mono">{viewDetailModalRecord.tanggal} — {viewDetailModalRecord.jam} WIB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Jenis FOG:</span>
                <span className="font-bold text-amber-300">{viewDetailModalRecord.jenis || 'Fuel'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Nama Barang:</span>
                <span className="font-bold text-emerald-400 font-mono">{viewDetailModalRecord.namaBarang}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">PIC Penerima (Modul 2):</span>
                <span className="font-bold text-stone-100">{viewDetailModalRecord.pic} ({viewDetailModalRecord.picJabatan})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Lokasi Dari:</span>
                <span>{viewDetailModalRecord.lokasiDari}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Lokasi Ke:</span>
                <span>{viewDetailModalRecord.lokasiKe}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Flowmeter Reading:</span>
                <span className="font-mono">Start: {viewDetailModalRecord.flowmeterStart} | End: {viewDetailModalRecord.flowmeterEnd}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Qty Penerimaan:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {viewDetailModalRecord.qty} {viewDetailModalRecord.satuan}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Identitas Transport Pengirim:</span>
                <span>{viewDetailModalRecord.identitasTransportPengirim}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Identitas Armada:</span>
                <span>{viewDetailModalRecord.identitasArmada}</span>
              </div>
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
              Apakah Anda yakin ingin menghapus data penerimaan stock FOG ini dari sistem?
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
