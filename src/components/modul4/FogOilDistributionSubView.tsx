import React, { useState } from 'react';
import { 
  AssetUnit, 
  FogOilDistributionRecord, 
  FogSatuanOption, 
  FOG_SATUAN_OPTIONS, 
  DEFAULT_FOG_NAMA_BARANG,
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Droplet, 
  User, 
  Clock, 
  Calendar, 
  Plus, 
  Save, 
  RotateCcw, 
  Search, 
  Eye, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Gauge
} from 'lucide-react';

interface FogOilDistributionSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  oilDistributions: FogOilDistributionRecord[];
  currentUser: UserAccount;
  availableOilTypes: string[];
  onSave: (
    data: Omit<FogOilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FogOilDistributionRecord };
  onDelete: (id: string) => { success: boolean; message: string };
  onAddCustomOilType: (newOilName: string) => void;
}

export const FogOilDistributionSubView: React.FC<FogOilDistributionSubViewProps> = ({
  units,
  manpowerList,
  oilDistributions,
  currentUser,
  availableOilTypes,
  onSave,
  onDelete,
  onAddCustomOilType,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().substring(0, 5);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [jam, setJam] = useState<string>(nowTimeStr);

  // a. Petugas pilih dari data Manpower jabatan Administrasi
  const [petugas, setPetugas] = useState<string>('');
  const [petugasJabatan, setPetugasJabatan] = useState<string>('');

  // b. No Unit
  const [noUnit, setNoUnit] = useState<string>('');
  const [namaAlat, setNamaAlat] = useState<string>('');
  const [jenisUnit, setJenisUnit] = useState<string>('');

  // c. Jenis Oli Drop Down (SOLAR, TURALIK 52 PERTAMINA, RORED HDA SAE 90, SAE 15W 40, ATF, dll)
  const [jenisOli, setJenisOli] = useState<string>('TURALIK 52 PERTAMINA');

  // Input Qty & Satuan
  const [qty, setQty] = useState<string>('');
  const [satuan, setSatuan] = useState<FogSatuanOption>('Ltr');
  const [hmPengisian, setHmPengisian] = useState<string>('');
  const [dokumenNumber, setDokumenNumber] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // Modal Tambah Jenis Oli Baru
  const [showAddOilModal, setShowAddOilModal] = useState<boolean>(false);
  const [newOilInput, setNewOilInput] = useState<string>('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // UI state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewDetailModalRecord, setViewDetailModalRecord] = useState<FogOilDistributionRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter personil administrasi dari data manpower Modul 2
  // Jika personil belum ada yang berjabatan persis "Administrasi", tampilkan seluruh manpower namun prioritaskan yang mengandung admin/staff/logistik
  const adminManpowerList = manpowerList.filter((m) =>
    (m.jabatan || '').toLowerCase().includes('admin') ||
    (m.jabatan || '').toLowerCase().includes('adm') ||
    (m.jabatan || '').toLowerCase().includes('staff') ||
    (m.jabatan || '').toLowerCase().includes('logistik') ||
    (m.jabatan || '').toLowerCase().includes('gudang')
  );

  const displayPetugasCandidates = adminManpowerList.length > 0 ? adminManpowerList : manpowerList;

  // Gabungan jenis oli standar + custom
  const combinedOilList = Array.from(new Set([...DEFAULT_FOG_NAMA_BARANG, ...availableOilTypes]));

  // Saat Petugas dipilih
  const handlePetugasChange = (selectedName: string) => {
    setPetugas(selectedName);
    const target = manpowerList.find((m) => m.nama === selectedName);
    if (target) {
      setPetugasJabatan(target.jabatan);
    } else {
      setPetugasJabatan('');
    }
  };

  // Saat No Unit dipilih
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

  const handleResetForm = () => {
    setEditingId(null);
    setTanggal(todayStr);
    setJam(new Date().toTimeString().substring(0, 5));
    setPetugas('');
    setPetugasJabatan('');
    setNoUnit('');
    setNamaAlat('');
    setJenisUnit('');
    setJenisOli('TURALIK 52 PERTAMINA');
    setQty('');
    setSatuan('Ltr');
    setHmPengisian('');
    setDokumenNumber('');
    setRemark('');
  };

  const handleEditClick = (rec: FogOilDistributionRecord) => {
    setEditingId(rec.id);
    setTanggal(rec.tanggal);
    setJam(rec.jam || '08:00');
    setPetugas(rec.petugas);
    setPetugasJabatan(rec.petugasJabatan || '');
    setNoUnit(rec.noUnit);
    setNamaAlat(rec.namaAlat || '');
    setJenisUnit(rec.jenisUnit || '');
    setJenisOli(rec.jenisOli);
    setQty(rec.qty.toString());
    setSatuan((rec.satuan as FogSatuanOption) || 'Ltr');
    setHmPengisian(rec.hmPengisian !== undefined ? rec.hmPengisian.toString() : '');
    setDokumenNumber(rec.dokumenNumber || '');
    setRemark(rec.remark || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!tanggal) {
      setStatusMessage({ type: 'error', text: 'Tanggal distribusi wajib diisi!' });
      return;
    }
    if (!petugas) {
      setStatusMessage({ type: 'error', text: 'Petugas Administrasi wajib dipilih dari data Manpower Modul 2!' });
      return;
    }
    if (!noUnit) {
      setStatusMessage({ type: 'error', text: 'No Unit tujuan wajib dipilih dari Data Unit Modul 1!' });
      return;
    }
    if (!jenisOli) {
      setStatusMessage({ type: 'error', text: 'Jenis Oli wajib dipilih!' });
      return;
    }
    const numQty = parseFloat(qty);
    if (isNaN(numQty) || numQty <= 0) {
      setStatusMessage({ type: 'error', text: 'Qty oli harus berupa angka lebih dari 0!' });
      return;
    }

    const payload = {
      tanggal,
      jam: jam || '08:00',
      petugas,
      petugasJabatan,
      noUnit,
      namaAlat,
      jenisUnit,
      jenisOli,
      qty: numQty,
      satuan,
      hmPengisian: hmPengisian ? parseFloat(hmPengisian) : undefined,
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

  const handleAddNewOilSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOilInput.trim()) {
      setModalFeedback('Nama jenis oli tidak boleh kosong!');
      return;
    }
    onAddCustomOilType(newOilInput.trim());
    setJenisOli(newOilInput.trim().toUpperCase());
    setNewOilInput('');
    setModalFeedback(null);
    setShowAddOilModal(false);
    setStatusMessage({ type: 'success', text: `Jenis oli baru berhasil ditambahkan!` });
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

  const filteredList = oilDistributions.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.noUnit.toLowerCase().includes(q) ||
      (item.namaAlat || '').toLowerCase().includes(q) ||
      item.jenisOli.toLowerCase().includes(q) ||
      item.petugas.toLowerCase().includes(q) ||
      (item.dokumenNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Form Distribusi Oil */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                {editingId ? 'EDIT DATA DISTRIBUSI OIL' : 'FORM 3. DISTRIBUSI OIL (PENGELUARAN PELUMAS UNIT)'}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Pencatatan pengeluaran pelumas/oli mesin, transmisi, hidrolik, dan grease oleh petugas Administrasi untuk unit armada.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Tombol Tambah Jenis Oli Lain */}
            <button
              type="button"
              onClick={() => setShowAddOilModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Jenis Oli Lain</span>
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Edit</span>
              </button>
            )}
          </div>
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
          {/* Baris 1: Tanggal, Jam & Petugas Administrasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-tanggal" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                Tanggal Pengeluaran <span className="text-rose-500">*</span>
              </label>
              <input
                id="oil-dist-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="oil-dist-jam" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                Jam Pengeluaran <span className="text-rose-500">*</span>
              </label>
              <input
                id="oil-dist-jam"
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            {/* a. Petugas pilih dari data Manpower jabatan Administrasi */}
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-petugas" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                a. Petugas Administrasi <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Jabatan Administrasi)</span>
              </label>
              <select
                id="oil-dist-petugas"
                value={petugas}
                onChange={(e) => handlePetugasChange(e.target.value)}
                className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">-- Pilih Petugas Administrasi --</option>
                {displayPetugasCandidates.map((m) => (
                  <option key={m.id} value={m.nama}>
                    {m.nama} — [{m.jabatan}] ({m.nik})
                  </option>
                ))}
              </select>
              {petugasJabatan && (
                <p className="text-[11px] text-stone-400">
                  Jabatan: <span className="text-stone-200 font-bold">{petugasJabatan}</span>
                </p>
              )}
            </div>
          </div>

          {/* Baris 2: b. No Unit & c. Jenis Oli Drop Down */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* b. No Unit */}
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-unit" className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                b. No Unit Penerima <span className="text-rose-500">*</span>{' '}
                <span className="text-[11px] font-normal text-stone-400">(Reff Modul 1)</span>
              </label>
              <select
                id="oil-dist-unit"
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

            {/* c. Jenis Oli Drop Down */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="oil-dist-jenis-oli" className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                  c. Jenis Oli / Pelumas <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddOilModal(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Tambah Jenis Baru</span>
                </button>
              </div>

              <select
                id="oil-dist-jenis-oli"
                value={jenisOli}
                onChange={(e) => setJenisOli(e.target.value)}
                className="w-full bg-stone-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-bold font-mono focus:outline-none focus:border-emerald-500"
                required
              >
                {combinedOilList.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 3: Qty, Satuan, HM, & Dokumen Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-stone-950/60 p-4 sm:p-5 rounded-xl border border-stone-800">
            {/* Qty & Satuan */}
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-qty" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                Qty Jumlah Oli <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="oil-dist-qty"
                  type="number"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Jumlah"
                  className="flex-1 bg-stone-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
                <select
                  id="oil-dist-satuan"
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value as FogSatuanOption)}
                  className="w-28 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                >
                  {FOG_SATUAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* HM Unit saat pengisian oli */}
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-hm" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                HM Unit (Opsional)
              </label>
              <input
                id="oil-dist-hm"
                type="number"
                step="any"
                value={hmPengisian}
                onChange={(e) => setHmPengisian(e.target.value)}
                placeholder="HM saat ganti/top up oli"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* No Bon Pengambilan / Permintaan */}
            <div className="space-y-1.5">
              <label htmlFor="oil-dist-dokumen" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                No. Bon / Form Pengeluaran
              </label>
              <input
                id="oil-dist-dokumen"
                type="text"
                value={dokumenNumber}
                onChange={(e) => setDokumenNumber(e.target.value)}
                placeholder="Contoh: BON-OLI/2026/09-012"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Remark */}
          <div className="space-y-1.5">
            <label htmlFor="oil-dist-remark" className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              Keterangan Penggantian / Top-Up Pelumas
            </label>
            <input
              id="oil-dist-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Contoh: Penggantian oli mesin berkala 250 jam / Top up oli hidrolik bocor hose..."
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
              className="px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'SIMPAN PERUBAHAN DISTRIBUSI OLI' : 'SIMPAN DISTRIBUSI OIL'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Data Riwayat Distribusi Oil */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide uppercase">
              DATA DISTRIBUSI OIL (PENGELUARAN PELUMAS UNIT)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Total {oilDistributions.length} catatan pengeluaran pelumas tersimpan.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Unit / Jenis Oli / Petugas..."
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
                <th className="py-3 px-3">Petugas (Administrasi)</th>
                <th className="py-3 px-3">No Unit</th>
                <th className="py-3 px-3">Jenis Oli</th>
                <th className="py-3 px-3 text-right">HM Unit</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3">No. Bon</th>
                <th className="py-3 px-3">Remark</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-500 font-sans">
                    Belum ada data distribusi oli. Silakan isi form di atas.
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
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-stone-200">{rec.petugas}</div>
                      <div className="text-[10px] text-emerald-400">{rec.petugasJabatan || 'Administrasi'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-amber-400">{rec.noUnit}</div>
                      <div className="text-[10px] font-sans text-stone-400">{rec.namaAlat}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                        {rec.jenisOli}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-300">
                      {rec.hmPengisian !== undefined ? rec.hmPengisian.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                      {rec.qty.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">{rec.satuan}</span>
                    </td>
                    <td className="py-3 px-3 text-stone-400 text-[11px]">
                      {rec.dokumenNumber || '-'}
                    </td>
                    <td className="py-3 px-3 font-sans text-stone-400 text-[11px] max-w-[150px] truncate">
                      {rec.remark || '-'}
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
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition"
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

      {/* Modal Add Jenis Oli Baru */}
      {showAddOilModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-mono font-black text-stone-100 text-base">
                  TAMBAH JENIS OLI / PELUMAS BARU
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOilModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewOilSubmit} className="space-y-4 text-xs">
              <p className="text-stone-400">
                Tambahkan spesifikasi atau merek pelumas baru yang digunakan di unit armada Quarry Purwosari.
              </p>

              {modalFeedback && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300">
                  {modalFeedback}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="new-oil-name-input" className="block text-stone-300 font-bold uppercase">
                  Nama / Spesifikasi Jenis Oli Baru:
                </label>
                <input
                  id="new-oil-name-input"
                  type="text"
                  value={newOilInput}
                  onChange={(e) => setNewOilInput(e.target.value)}
                  placeholder="Contoh: MEDITRAN SX 15W-40 / SHELL TELLUS S2 M 68"
                  className="w-full bg-stone-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 font-mono uppercase focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <p className="text-[11px] text-stone-500">Daftar Jenis Oli Yang Sudah Tersedia:</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-28 overflow-y-auto p-2 bg-stone-950/60 rounded-lg border border-stone-800/60">
                  {combinedOilList.map((item) => (
                    <span key={item} className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOilModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase"
                >
                  Simpan Jenis Oli
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Detail Distribution Oil */}
      {viewDetailModalRecord && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-mono font-black text-stone-100 text-base">
                  DETAIL DISTRIBUSI OLI
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
                <span className="text-stone-400">Petugas (Administrasi):</span>
                <span className="font-bold text-stone-100">{viewDetailModalRecord.petugas} ({viewDetailModalRecord.petugasJabatan || 'Administrasi'})</span>
              </div>
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
                <span className="text-stone-400">Jenis Oli / Pelumas:</span>
                <span className="font-mono font-bold text-emerald-400">{viewDetailModalRecord.jenisOli}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">Qty Pelumas:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {viewDetailModalRecord.qty} {viewDetailModalRecord.satuan}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-400">HM Unit:</span>
                <span className="font-mono">{viewDetailModalRecord.hmPengisian !== undefined ? viewDetailModalRecord.hmPengisian : '-'}</span>
              </div>
              {viewDetailModalRecord.dokumenNumber && (
                <div className="flex justify-between py-1 border-b border-stone-800/60">
                  <span className="text-stone-400">No. Bon / Form:</span>
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
              Apakah Anda yakin ingin menghapus data distribusi oli ini dari sistem?
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
