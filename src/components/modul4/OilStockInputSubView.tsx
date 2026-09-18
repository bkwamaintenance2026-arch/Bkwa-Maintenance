import React, { useState } from 'react';
import { 
  OilStockInputRecord, 
  SupplierRecord, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Droplet, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  Package,
  Layers,
  Lock
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface OilStockInputSubViewProps {
  oilStockInputs: OilStockInputRecord[];
  suppliers: SupplierRecord[];
  manpowerList: ManpowerData[];
  availableOilTypes: string[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<OilStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OilStockInputRecord };
  onDelete: (id: string) => { success: boolean; message: string };
  onAddCustomOilType: (newOilName: string) => void;
}

export const OilStockInputSubView: React.FC<OilStockInputSubViewProps> = ({
  oilStockInputs,
  suppliers,
  manpowerList,
  availableOilTypes,
  currentUser,
  onSave,
  onDelete,
  onAddCustomOilType,
}) => {
  const canEdit = canUserEdit(currentUser, 4);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAddOilModal, setShowAddOilModal] = useState(false);
  const [newOilNameInput, setNewOilNameInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states:
  // a. Distributor (Dropdown reff by "Data SUplier")
  // b. Tanggal dan jam input
  // c. Nama Oli
  // d. Qty
  // e. PIC Gudang Material
  // f. Remark
  const [distributor, setDistributor] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [namaOli, setNamaOli] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [satuan, setSatuan] = useState('Ltr');
  const [picGudangMaterial, setPicGudangMaterial] = useState('');
  const [picGudangJabatan, setPicGudangJabatan] = useState('');
  const [remark, setRemark] = useState('');

  // Filter suplier oli/pelumas
  const oilSuppliers = suppliers.filter(
    (s) => s.itemName.toLowerCase().includes('oli') || 
           s.itemName.toLowerCase().includes('pelumas') || 
           s.itemName.toLowerCase().includes('lubricant')
  );
  const effectiveSuppliers = oilSuppliers.length > 0 ? oilSuppliers : suppliers;

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null);
    setDistributor(effectiveSuppliers[0]?.namaDistributor || suppliers[0]?.namaDistributor || '');
    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));
    setNamaOli(availableOilTypes[0] || 'TURALIK 52 PERTAMINA');
    setQty('');
    setSatuan('Ltr');

    const defaultPic = manpowerList.find((m) => 
      m.jabatan.toLowerCase().includes('logistik') || 
      m.jabatan.toLowerCase().includes('admin') || 
      m.jabatan.toLowerCase().includes('gudang')
    ) || manpowerList[0];

    setPicGudangMaterial(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicGudangJabatan(defaultPic?.jabatan || 'Staff Gudang Material');
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: OilStockInputRecord) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setDistributor(item.distributor);
    setTanggal(item.tanggal);
    setJam(item.jam);
    setNamaOli(item.namaOli);
    setQty(item.qty);
    setSatuan(item.satuan || 'Ltr');
    setPicGudangMaterial(item.picGudangMaterial);
    setPicGudangJabatan(item.picGudangJabatan || '');
    setRemark(item.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handlePicChange = (nama: string) => {
    setPicGudangMaterial(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicGudangJabatan(found.jabatan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg('Akses Ditolak: Akun Anda dalam mode "Hanya View". Penambahan/perubahan input stock oli tidak diizinkan.');
      return;
    }
    if (!distributor) {
      setErrorMsg('Distributor wajib dipilih!');
      return;
    }
    if (!namaOli) {
      setErrorMsg('Nama Oli wajib dipilih!');
      return;
    }
    if (qty === '' || Number(qty) <= 0) {
      setErrorMsg('Qty stok oli harus lebih dari 0!');
      return;
    }
    if (!picGudangMaterial) {
      setErrorMsg('PIC Gudang Material wajib dipilih!');
      return;
    }

    const res = onSave(
      {
        distributor,
        tanggal,
        jam,
        namaOli,
        qty: Number(qty),
        satuan,
        picGudangMaterial,
        picGudangJabatan,
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

  const handleAddNewOil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!newOilNameInput.trim()) return;
    onAddCustomOilType(newOilNameInput.trim());
    setNamaOli(newOilNameInput.trim().toUpperCase());
    setNewOilNameInput('');
    setShowAddOilModal(false);
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const filteredList = oilStockInputs.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.namaOli.toLowerCase().includes(q) ||
      item.distributor.toLowerCase().includes(q) ||
      item.picGudangMaterial.toLowerCase().includes(q) ||
      (item.remark || '').toLowerCase().includes(q)
    );
  });

  const totalOliMasuk = oilStockInputs.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                4. INPUT STOCK OLI (GUDANG MATERIAL)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pencatatan penerimaan pelumas & oli (Hidrolik, Transmisi, Engine, ATF) dari distributor ke Gudang.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari jenis oli, distributor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50 w-56 sm:w-64"
            />
          </div>

          {canEdit ? (
            <button
              id="btn-add-oil-stock"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Stock Oli</span>
            </button>
          ) : (
            <button
              id="btn-add-oil-stock"
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-500 border border-stone-700 font-bold text-xs cursor-not-allowed opacity-75"
              title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data."
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>+ Input Stock Oli (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Total Oli Masuk Tercatat</div>
            <div className="text-lg font-black font-mono text-emerald-400">
              {totalOliMasuk.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Liter</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Varian Jenis Oli</div>
            <div className="text-lg font-black font-mono text-stone-100">
              {availableOilTypes.length} <span className="text-xs font-normal text-stone-400">Jenis Terdaftar</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Total Transaksi Penerimaan</div>
            <div className="text-lg font-black font-mono text-purple-400">
              {oilStockInputs.length} <span className="text-xs font-normal text-stone-400">Penerimaan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Data Input Stock Oli */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            DAFTAR PENERIMAAN STOCK OLI GUDANG (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">b. Tanggal & Jam</th>
                <th className="py-3 px-3">a. Distributor</th>
                <th className="py-3 px-3">c. Nama Oli</th>
                <th className="py-3 px-3 text-right">d. Qty</th>
                <th className="py-3 px-3">e. PIC Gudang Material</th>
                <th className="py-3 px-3">f. Remark</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      <span>{item.tanggal}</span>
                      <span className="text-stone-500">{item.jam}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-200">{item.distributor}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.namaOli}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right text-sm">
                    {item.qty.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-stone-400">{item.satuan || 'Ltr'}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-stone-200 font-semibold">{item.picGudangMaterial}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.picGudangJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                    {item.remark || '-'}
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
                  <td colSpan={7} className="py-8 text-center text-stone-500">
                    Belum ada data penerimaan stok oli yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM INPUT STOCK OLI */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Input Stock Oli' : 'Form Penerimaan Stock Oli Gudang'}
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

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* a. Distributor */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  a. Distributor (Dropdown Reff: Data Suplier) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.namaDistributor}>
                      {s.namaDistributor} — {s.itemName}
                    </option>
                  ))}
                </select>
              </div>

              {/* b. Tanggal dan jam input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    b. Tanggal Input <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60 font-mono"
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
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                </div>
              </div>

              {/* c. Nama Oli */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-300 font-semibold">
                    c. Nama Oli <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddOilModal(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-mono font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Jenis Oli Lain</span>
                  </button>
                </div>
                <select
                  value={namaOli}
                  onChange={(e) => setNamaOli(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60 font-mono font-bold"
                >
                  {availableOilTypes.map((oil) => (
                    <option key={oil} value={oil}>
                      {oil}
                    </option>
                  ))}
                </select>
              </div>

              {/* d. Qty & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    d. Qty <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Contoh: 200"
                    value={qty}
                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold focus:outline-none focus:border-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Satuan
                  </label>
                  <select
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60 font-mono"
                  >
                    <option value="Ltr">Ltr (Liter)</option>
                    <option value="Drum">Drum (200 Ltr)</option>
                    <option value="Pail">Pail (20 Ltr)</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              {/* e. PIC Gudang Material */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  e. PIC Gudang Material (Reff: Manpower Modul 2) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={picGudangMaterial}
                  onChange={(e) => handlePicChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500/60"
                >
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — {m.jabatan}
                    </option>
                  ))}
                </select>
                {picGudangJabatan && (
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    Jabatan Terpilih: {picGudangJabatan}
                  </span>
                )}
              </div>

              {/* f. Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  f. Remark (Catatan Tambahan)
                </label>
                <textarea
                  rows={2}
                  placeholder="Nomor drum, segel, kondisi kemasan vendor"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500/60"
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
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  {editingId ? 'Simpan Perubahan' : 'Catat Stok Oli Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADD JENIS OLI LAIN */}
      {showAddOilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black font-mono uppercase text-stone-100">
                  Tambah Jenis Oli / Pelumas Baru
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddOilModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewOil} className="space-y-3">
              <div>
                <label className="block text-stone-300 font-semibold mb-1 text-xs">
                  Nama Jenis Oli Baru
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MEDITRAN SX 15W-40"
                  value={newOilNameInput}
                  onChange={(e) => setNewOilNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono uppercase focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOilModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Simpan Jenis Oli
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
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Catatan Stok Oli?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data penerimaan ini akan dihapus dan mempengaruhi saldo stock oli di gudang material.
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
