import React, { useState } from 'react';
import { SparePartItem, UserAccount } from '../../types';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  ArrowUpDown,
  Boxes,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';

interface InputSparePartSubViewProps {
  spareParts: SparePartItem[];
  currentUser: UserAccount;
  canEdit: boolean;
  onAddOrUpdatePart: (
    data: Omit<SparePartItem, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => { success: boolean; message: string; item?: SparePartItem };
  onAddStock: (
    partId: string,
    qtyToAdd: number,
    keterangan?: string
  ) => { success: boolean; message: string; updatedItem?: SparePartItem };
  onDeletePart: (id: string) => { success: boolean; message: string };
}

export const InputSparePartSubView: React.FC<InputSparePartSubViewProps> = ({
  spareParts,
  currentUser,
  canEdit,
  onAddOrUpdatePart,
  onAddStock,
  onDeletePart,
}) => {
  // Form State untuk registrasi / edit part baru
  const [formData, setFormData] = useState({
    partNumber: '',
    namaBarang: '',
    qty: 0,
    satuan: 'Pcs',
    kategori: 'Filter',
    lokasiRak: 'Rak A-01',
    minStock: 2,
    keterangan: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  // Modal Tambah Stok (+)
  const [selectedStockPart, setSelectedStockPart] = useState<SparePartItem | null>(null);
  const [incomingQty, setIncomingQty] = useState<number>(1);
  const [incomingNote, setIncomingNote] = useState('');

  // Feedback Notification
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Daftar Kategori Umum
  const KATEGORI_OPTIONS = [
    'Filter',
    'Engine',
    'Hidrolik',
    'Undercarriage & GET',
    'Brake System',
    'Electrical',
    'Seal & O-Ring',
    'Hose & Fitting',
    'Baut & Mur',
    'Lainnya',
  ];

  const SATUAN_OPTIONS = ['Pcs', 'Set', 'Unit', 'Roll', 'Box', 'Meter', 'Liter', 'Kg'];

  const handleResetForm = () => {
    setFormData({
      partNumber: '',
      namaBarang: '',
      qty: 0,
      satuan: 'Pcs',
      kategori: 'Filter',
      lokasiRak: 'Rak A-01',
      minStock: 2,
      keterangan: '',
    });
    setEditingId(null);
  };

  const handleEditClick = (item: SparePartItem) => {
    setEditingId(item.id);
    setFormData({
      partNumber: item.partNumber,
      namaBarang: item.namaBarang,
      qty: item.qty,
      satuan: item.satuan,
      kategori: item.kategori || 'Filter',
      lokasiRak: item.lokasiRak || 'Rak A-01',
      minStock: item.minStock || 2,
      keterangan: item.keterangan || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partNumber.trim()) {
      setFeedback({ type: 'error', message: 'Part Number (PN) wajib diisi!' });
      return;
    }
    if (!formData.namaBarang.trim()) {
      setFeedback({ type: 'error', message: 'Nama Barang / Komponen wajib diisi!' });
      return;
    }

    const payload = {
      partNumber: formData.partNumber.trim().toUpperCase(),
      namaBarang: formData.namaBarang.trim(),
      qty: Number(formData.qty) || 0,
      satuan: formData.satuan.trim() || 'Pcs',
      kategori: formData.kategori,
      lokasiRak: formData.lokasiRak.trim(),
      minStock: Number(formData.minStock) || 0,
      keterangan: formData.keterangan.trim(),
    };

    const res = onAddOrUpdatePart(payload, editingId || undefined);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      handleResetForm();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Submit Modal Tambah Stok (+)
  const handleConfirmAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockPart) return;

    if (incomingQty <= 0) {
      setFeedback({ type: 'error', message: 'Kuantitas penambahan stok harus lebih dari 0!' });
      return;
    }

    const res = onAddStock(selectedStockPart.id, incomingQty, incomingNote);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setSelectedStockPart(null);
      setIncomingQty(1);
      setIncomingNote('');
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Filter Parts
  const filteredParts = spareParts.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.partNumber.toLowerCase().includes(q) ||
      item.namaBarang.toLowerCase().includes(q) ||
      (item.kategori && item.kategori.toLowerCase().includes(q)) ||
      (item.lokasiRak && item.lokasiRak.toLowerCase().includes(q));

    const matchCategory =
      categoryFilter === 'ALL' || item.kategori === categoryFilter;

    let matchStockStatus = true;
    if (stockStatusFilter === 'HABIS') {
      matchStockStatus = item.qty <= 0;
    } else if (stockStatusFilter === 'KRITIS') {
      matchStockStatus = item.qty > 0 && item.qty <= (item.minStock || 2);
    } else if (stockStatusFilter === 'AMAN') {
      matchStockStatus = item.qty > (item.minStock || 2);
    }

    return matchSearch && matchCategory && matchStockStatus;
  });

  return (
    <div className="space-y-6">
      {/* Banner Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-bold font-mono">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-200 text-sm font-mono px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORM INPUT SPARE PART / INCOMING COMPONENT */}
      {canEdit && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-mono font-bold text-stone-100 uppercase tracking-wide">
                  {editingId ? 'Edit Data Spare Part' : 'Input Spare Part (Incoming Part / Component)'}
                </h3>
                <p className="text-xs text-stone-400 font-sans">
                  Registrasi suku cadang workshop dengan PN, Nama barang, Qty stok awal & Satuan
                </p>
              </div>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-mono"
              >
                <X className="w-4 h-4" />
                <span>Batal Edit</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Part Number (PN) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Part Number (PN) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  placeholder="Contoh: 600-185-5100"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono font-bold placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
                <p className="text-[10px] text-stone-500 mt-1">Kode unik Part Number pabrikan</p>
              </div>

              {/* Nama Barang */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                  Nama Barang / Komponen <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.namaBarang}
                  onChange={(e) => setFormData({ ...formData, namaBarang: e.target.value })}
                  placeholder="Contoh: Oil Filter Engine (Komatsu PC200/D85)"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">Nama lengkap komponen suku cadang</p>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {KATEGORI_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Klasifikasi part workshop</p>
              </div>

              {/* Qty (Jumlah Stok) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Qty (Jumlah Stok) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-center text-amber-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">Stok kuantitas barang di gudang</p>
              </div>

              {/* Satuan */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                  Satuan <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.satuan}
                  onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {SATUAN_OPTIONS.map((sat) => (
                    <option key={sat} value={sat}>
                      {sat}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Pcs / Set / Unit / Roll dll</p>
              </div>

              {/* Lokasi Rak / Bin */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                  Lokasi Rak / Bin
                </label>
                <input
                  type="text"
                  value={formData.lokasiRak}
                  onChange={(e) => setFormData({ ...formData, lokasiRak: e.target.value })}
                  placeholder="Contoh: Rak A-02 / Bin 4"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">Posisi fisik part di gudang</p>
              </div>

              {/* Min Stock */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                  Batas Min. Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-center text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">Peringatan saat stok menipis</p>
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-200 mb-1">
                Keterangan / Spesifikasi
              </label>
              <input
                type="text"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Contoh: Cocok untuk unit PC200-8 dan Bulldozer D85ESS-2"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-mono transition"
              >
                Reset
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-mono font-black shadow-lg shadow-amber-500/20 transition"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan Part' : 'Registrasi Part Baru'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INVENTORY STOCK TABLE */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-mono font-bold text-stone-100 uppercase tracking-wide">
                Inventory Stock Spare Part ({filteredParts.length} Item)
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Katalog persediaan suku cadang. Gunakan tombol <strong className="text-amber-400 font-mono">[+]</strong> untuk menambah stok masuk secara cepat.
              </p>
            </div>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari PN / Nama Barang..."
                className="w-full pl-9 pr-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Kategori</option>
              {KATEGORI_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Status Stok</option>
              <option value="AMAN">Stok Aman (&gt; Min)</option>
              <option value="KRITIS">Stok Menipis (≤ Min)</option>
              <option value="HABIS">Stok Habis (0)</option>
            </select>
          </div>
        </div>

        {/* Tabel */}
        {filteredParts.length === 0 ? (
          <div className="py-12 text-center text-stone-500 font-mono text-xs">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-stone-400" />
            <p>Tidak ada data spare part yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">No</th>
                  <th className="px-3 py-3 w-40">Part Number (PN)</th>
                  <th className="px-3 py-3">Nama Barang / Komponen</th>
                  <th className="px-3 py-3 w-32">Kategori</th>
                  <th className="px-3 py-3 w-28">Lokasi Rak</th>
                  <th className="px-3 py-3 w-32 text-center">Qty (Stock)</th>
                  <th className="px-3 py-3 w-24">Satuan</th>
                  <th className="px-3 py-3 w-28 text-center">Status</th>
                  <th className="px-3 py-3 w-32 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {filteredParts.map((item, idx) => {
                  const isZero = item.qty <= 0;
                  const isLow = !isZero && item.qty <= (item.minStock || 2);

                  return (
                    <tr key={item.id} className="hover:bg-stone-800/40 transition">
                      <td className="px-3 py-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                      <td className="px-3 py-3 font-bold text-amber-400 whitespace-nowrap">
                        {item.partNumber}
                      </td>
                      <td className="px-3 py-3 font-sans">
                        <div className="font-semibold text-stone-100">{item.namaBarang}</div>
                        {item.keterangan && (
                          <div className="text-[10px] text-stone-400 truncate max-w-xs">{item.keterangan}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-stone-300 font-sans whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-[11px] text-stone-300">
                          {item.kategori || 'General'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-stone-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-500" />
                          <span>{item.lokasiRak || '-'}</span>
                        </div>
                      </td>

                      {/* QTY & Tombol Tambah Stok (+) */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-sm ${
                              isZero
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {item.qty}
                          </span>

                          {/* Tombol + untuk Menambah STOCK (Sesuai Permintaan User) */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStockPart(item);
                                setIncomingQty(1);
                                setIncomingNote('');
                              }}
                              className="p-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow transition active:scale-95"
                              title={`Tambah stok untuk ${item.namaBarang}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-stone-300 font-bold whitespace-nowrap">{item.satuan}</td>

                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isZero
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isZero ? 'HABIS' : isLow ? 'MENIPIS' : 'AMAN'}
                        </span>
                      </td>

                      {/* Aksi Edit & Hapus */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {canEdit ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(item)}
                              className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 hover:bg-stone-700 transition"
                              title="Edit spesifikasi part"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus [${item.partNumber}] ${item.namaBarang}?`)) {
                                  const res = onDeletePart(item.id);
                                  if (res.success) {
                                    setFeedback({ type: 'success', message: res.message });
                                  } else {
                                    setFeedback({ type: 'error', message: res.message });
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-rose-400 hover:bg-stone-700 transition"
                              title="Hapus part"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-500">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL POPUP TAMBAH STOK (+) */}
      {selectedStockPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-mono font-bold text-stone-100 uppercase">
                  Tambah Stok Suku Cadang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStockPart(null)}
                className="text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">PART NUMBER:</span>
                <span className="text-amber-400 font-bold">{selectedStockPart.partNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">NAMA BARANG:</span>
                <span className="text-stone-200 font-semibold text-right max-w-[200px] truncate">
                  {selectedStockPart.namaBarang}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">STOK SAAT INI:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedStockPart.qty} {selectedStockPart.satuan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">LOKASI RAK:</span>
                <span className="text-stone-300">{selectedStockPart.lokasiRak || '-'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmAddStock} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-stone-300 font-bold mb-1">
                  Jumlah Tambah Stok ({selectedStockPart.satuan}) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={incomingQty}
                  onChange={(e) => setIncomingQty(Number(e.target.value))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">
                  Keterangan / No. Surat Jalan / Supplier (Opsional)
                </label>
                <input
                  type="text"
                  value={incomingNote}
                  onChange={(e) => setIncomingNote(e.target.value)}
                  placeholder="Contoh: DO-2026/09/88 dari PT United Tractors"
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px]">
                Stok setelah penambahan: <strong>{selectedStockPart.qty + (incomingQty || 0)} {selectedStockPart.satuan}</strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setSelectedStockPart(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-black shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Konfirmasi Tambah Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
