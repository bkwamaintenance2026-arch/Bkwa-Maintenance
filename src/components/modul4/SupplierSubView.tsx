import React, { useState } from 'react';
import { SupplierRecord, UserAccount } from '../../types';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  PackageCheck, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Truck,
  Lock
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface SupplierSubViewProps {
  suppliers: SupplierRecord[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: SupplierRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const SupplierSubView: React.FC<SupplierSubViewProps> = ({
  suppliers,
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

  // Form states:
  // a. Nama Distributor
  // b. Alamat
  // c. NO Tlp/WA
  // d. Email
  // e. Item Name
  const [namaDistributor, setNamaDistributor] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noTelpWa, setNoTelpWa] = useState('');
  const [email, setEmail] = useState('');
  const [itemName, setItemName] = useState('');

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null);
    setNamaDistributor('');
    setAlamat('');
    setNoTelpWa('');
    setEmail('');
    setItemName('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (sup: SupplierRecord) => {
    if (!canEdit) return;
    setEditingId(sup.id);
    setNamaDistributor(sup.namaDistributor);
    setAlamat(sup.alamat);
    setNoTelpWa(sup.noTelpWa);
    setEmail(sup.email);
    setItemName(sup.itemName);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg('Akses Ditolak: Akun Anda dalam mode "Hanya View". Penambahan/perubahan data suplier tidak diizinkan.');
      return;
    }
    if (!namaDistributor.trim()) {
      setErrorMsg('Nama Distributor wajib diisi!');
      return;
    }
    if (!itemName.trim()) {
      setErrorMsg('Item Name (barang yang disuplai) wajib diisi!');
      return;
    }

    const res = onSave(
      {
        namaDistributor: namaDistributor.trim(),
        alamat: alamat.trim(),
        noTelpWa: noTelpWa.trim(),
        email: email.trim(),
        itemName: itemName.trim(),
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

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.namaDistributor.toLowerCase().includes(q) ||
      s.itemName.toLowerCase().includes(q) ||
      s.alamat.toLowerCase().includes(q) ||
      s.noTelpWa.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                1. DATA SUPLIER / DISTRIBUTOR
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Master data mitra vendor & penyedia BBM Solar, Pelumas Oli & Spareparts untuk Quarry Purwosari.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari distributor atau item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50 w-56 sm:w-64"
            />
          </div>

          {canEdit ? (
            <button
              id="btn-add-supplier"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Suplier</span>
            </button>
          ) : (
            <button
              id="btn-add-supplier"
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-500 border border-stone-700 font-bold text-xs cursor-not-allowed opacity-75"
              title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data."
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>+ Tambah Suplier (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Cards Suplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => (
          <div
            key={sup.id}
            className="bg-stone-900/90 border border-stone-800 hover:border-stone-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-400 group-hover:bg-amber-500/10 transition">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-100 font-mono leading-tight">
                      {sup.namaDistributor}
                    </h3>
                    <span className="inline-block mt-0.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {sup.itemName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-stone-800/80 text-xs text-stone-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-stone-400 leading-relaxed">
                    {sup.alamat || '-'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-mono text-stone-300">
                    {sup.noTelpWa || '-'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-[11px] font-mono text-stone-400 truncate">
                    {sup.email || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-stone-800/60">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => handleOpenEdit(sup)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                  canEdit
                    ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                    : 'bg-stone-900/60 text-stone-500 border-stone-800 cursor-not-allowed opacity-60'
                }`}
                title={canEdit ? 'Edit suplier' : 'Akun Anda dalam mode Hanya View'}
              >
                {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-500" />}
                <span>Edit</span>
              </button>

              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setDeleteConfirmId(sup.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                  canEdit
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300'
                    : 'bg-stone-900/60 text-stone-500 border-stone-800 cursor-not-allowed opacity-60'
                }`}
                title={canEdit ? 'Hapus suplier' : 'Akun Anda dalam mode Hanya View'}
              >
                {canEdit ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-500" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        ))}

        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-stone-500 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-600" />
            <p className="text-sm font-bold text-stone-400">Tidak ada data Suplier yang sesuai.</p>
            <p className="text-xs text-stone-500 mt-1">Klik "+ Tambah Suplier" untuk menambahkan distributor baru.</p>
          </div>
        )}
      </div>

      {/* MODAL INPUT / EDIT DATA SUPLIER */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Data Suplier' : 'Tambah Data Suplier Baru'}
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

              {/* a. Nama Distributor */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  a. Nama Distributor <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Pertamina Patra Niaga"
                  value={namaDistributor}
                  onChange={(e) => setNamaDistributor(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* e. Item Name */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  e. Item Name (Komoditas / Jenis Barang) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BBM Solar Industri B35 / Oli Turalik 52"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* b. Alamat */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  b. Alamat
                </label>
                <textarea
                  rows={2}
                  placeholder="Alamat kantor / gudang distributor"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* c. NO Tlp/WA */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    c. NO Tlp/WA
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={noTelpWa}
                    onChange={(e) => setNoTelpWa(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                {/* d. Email */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    d. Email
                  </label>
                  <input
                    type="email"
                    placeholder="kontak@distributor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
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
                  {editingId ? 'Simpan Perubahan' : 'Tambah Suplier'}
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
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Data Suplier?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data suplier ini akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
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
