import React, { useState } from 'react';
import { 
  BreakdownRecord, 
  SparePartItem, 
  SparePartTransaction, 
  SparePartTransactionItem,
  UserAccount 
} from '../../types';
import { 
  Package, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShoppingCart, 
  FileText,
  Calendar,
  Clock,
  User,
  Hash,
  Truck,
  Wrench,
  Search
} from 'lucide-react';

interface OrderPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: BreakdownRecord | null;
  availableSpareParts: SparePartItem[];
  currentUser: UserAccount;
  onRecordTransaction: (data: Omit<SparePartTransaction, 'id' | 'noTransaksi' | 'createdAt' | 'status'>) => {
    success: boolean;
    message: string;
    transaction?: SparePartTransaction;
    shortageItems?: SparePartTransactionItem[];
  };
  onRequestPermintaanBarang: (params: {
    noMaintenanceOrder: string;
    noUnit: string;
    namaAlat?: string;
    items: Array<{
      partNumber: string;
      namaBarang: string;
      qtyDiminta: number;
      satuan: string;
      keterangan?: string;
    }>;
  }) => void;
}

export const OrderPartModal: React.FC<OrderPartModalProps> = ({
  isOpen,
  onClose,
  breakdown,
  availableSpareParts,
  currentUser,
  onRecordTransaction,
  onRequestPermintaanBarang,
}) => {
  if (!isOpen || !breakdown) return null;

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jam, setJam] = useState(new Date().toTimeString().slice(0, 5));
  const [pemohonMekanik, setPemohonMekanik] = useState(currentUser.fullName || currentUser.username);
  const [catatan, setCatatan] = useState('');

  // Items table
  const [orderItems, setOrderItems] = useState<Array<{
    partNumber: string;
    namaBarang: string;
    qtyDiminta: number;
    satuan: string;
    keterangan: string;
  }>>([
    {
      partNumber: '',
      namaBarang: '',
      qtyDiminta: 1,
      satuan: 'Pcs',
      keterangan: '',
    },
  ]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    shortageItems?: SparePartTransactionItem[];
    trxNo?: string;
  } | null>(null);

  // Helper untuk mencari data part di inventory
  const findPartInfo = (pn: string, name: string) => {
    return availableSpareParts.find(
      (p) =>
        (pn && p.partNumber.trim().toLowerCase() === pn.trim().toLowerCase()) ||
        (name && p.namaBarang.trim().toLowerCase() === name.trim().toLowerCase())
    );
  };

  const handleSelectCatalogPart = (index: number, partId: string) => {
    const selected = availableSpareParts.find((p) => p.id === partId);
    if (!selected) return;

    setOrderItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        partNumber: selected.partNumber,
        namaBarang: selected.namaBarang,
        satuan: selected.satuan,
        qtyDiminta: copy[index].qtyDiminta || 1,
      };
      return copy;
    });
  };

  const handleAddItemRow = () => {
    setOrderItems((prev) => [
      ...prev,
      {
        partNumber: '',
        namaBarang: '',
        qtyDiminta: 1,
        satuan: 'Pcs',
        keterangan: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (orderItems.length <= 1) return;
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setOrderItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.some((i) => !i.namaBarang.trim() && !i.partNumber.trim())) {
      setFeedback({
        type: 'error',
        message: 'Mohon lengkapi Part Number (PN) atau Nama Part pada setiap baris order!',
      });
      return;
    }

    const payloadItems: SparePartTransactionItem[] = orderItems.map((item, idx) => ({
      no: idx + 1,
      partNumber: item.partNumber.trim(),
      namaBarang: item.namaBarang.trim(),
      qtyDiminta: Number(item.qtyDiminta) || 1,
      qtyDikeluarkan: 0,
      satuan: item.satuan.trim() || 'Pcs',
      statusKetersediaan: 'TERSEDIA',
      keterangan: item.keterangan.trim(),
    }));

    const result = onRecordTransaction({
      tanggal,
      jam,
      noMaintenanceOrder: breakdown.noMaintenanceOrder || breakdown.noNotifikasi,
      noUnit: breakdown.noUnit,
      namaAlat: breakdown.namaAlat || breakdown.noLama,
      jenisAlat: breakdown.jenis,
      detailProblem: breakdown.detailProblem,
      pemohonMekanik,
      items: payloadItems,
      catatan,
      createdBy: currentUser.fullName || currentUser.username,
    });

    if (result.success) {
      if (result.shortageItems && result.shortageItems.length > 0) {
        setFeedback({
          type: 'warning',
          message: result.message,
          shortageItems: result.shortageItems,
          trxNo: result.transaction?.noTransaksi,
        });
      } else {
        setFeedback({
          type: 'success',
          message: result.message,
          trxNo: result.transaction?.noTransaksi,
        });
      }
    } else {
      setFeedback({
        type: 'error',
        message: result.message || 'Gagal memproses Order Part.',
      });
    }
  };

  const handleOpenPermintaanBarang = () => {
    const shortage = feedback?.shortageItems || orderItems.map((it) => {
      const existing = findPartInfo(it.partNumber, it.namaBarang);
      const stock = existing ? existing.qty : 0;
      return {
        partNumber: it.partNumber,
        namaBarang: it.namaBarang,
        qtyDiminta: stock < it.qtyDiminta ? it.qtyDiminta - stock : it.qtyDiminta,
        satuan: it.satuan,
        keterangan: stock <= 0 ? 'Stok Gudang Kosong' : `Stok Kurang (Sisa ${stock})`,
      };
    });

    onRequestPermintaanBarang({
      noMaintenanceOrder: breakdown.noMaintenanceOrder || breakdown.noNotifikasi,
      noUnit: breakdown.noUnit,
      namaAlat: breakdown.namaAlat || breakdown.noLama,
      items: shortage,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-mono font-bold text-stone-100 flex items-center gap-2">
                <span>FORM ORDER PART / PENGELUARAN SUKU CADANG</span>
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Pengambilan spare part workshop untuk perbaikan unit breakdown
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Banner Feedback */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start justify-between gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-bold font-mono">{feedback.message}</p>
                  {feedback.trxNo && (
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="text-stone-400">No. Transaksi:</span>
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-100 font-mono font-bold">
                        {feedback.trxNo}
                      </span>
                    </div>
                  )}

                  {/* Jika ada item yang kurang / tidak ada stok -> beri tombol aksi Buat Permintaan Barang */}
                  {feedback.shortageItems && feedback.shortageItems.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-stone-900/90 border border-amber-500/30">
                      <p className="text-[11px] font-bold text-amber-300 mb-2">
                        Item berikut tidak memiliki stok mencukupi di inventory:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-300 font-mono">
                        {feedback.shortageItems.map((sh, idx) => (
                          <li key={idx}>
                            <span className="font-bold text-amber-400">{sh.partNumber || '-'}</span>: {sh.namaBarang} (Kurang {sh.qtyDiminta} {sh.satuan})
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleOpenPermintaanBarang}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-mono font-bold shadow-md transition"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Buatkan Form Permintaan Barang Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono self-start"
              >
                ✕
              </button>
            </div>
          )}

          {/* Reference Card: Unit Breakdown & Maintenance Order */}
          <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-stone-500 block uppercase font-bold">
                No. Maintenance Order
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-amber-400 text-sm">
                <Hash className="w-4 h-4 text-amber-500" />
                <span>{breakdown.noMaintenanceOrder || breakdown.noNotifikasi}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-stone-500 block uppercase font-bold">
                No. Unit (CN New)
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-stone-100 text-sm">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>{breakdown.noUnit}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-stone-500 block uppercase font-bold">
                Nama Alat (Reff Modul 1)
              </span>
              <span className="text-stone-200 font-bold block mt-0.5">
                {breakdown.namaAlat || breakdown.noLama || '-'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-stone-500 block uppercase font-bold">
                Kerusakan / Problem Awal
              </span>
              <span className="text-rose-300 font-sans block truncate mt-0.5" title={breakdown.detailProblem}>
                [{breakdown.component}] {breakdown.detailProblem}
              </span>
            </div>
          </div>

          {/* Form Order */}
          <form id="form-order-part" onSubmit={handleSubmit} className="space-y-5">
            {/* Header Form: Tanggal, Mekanik & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Tanggal Order <span className="text-amber-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Mekanik / Teknisi Pemohon <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pemohonMekanik}
                  onChange={(e) => setPemohonMekanik(e.target.value)}
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Catatan Penggantian
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Misal: Penggantian rutin breakdown"
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* TABEL ORDER PART: No, PN, Nama Part, Qty, Satuan, Ketersediaan Stok */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                    Daftar Order Part (Suku Cadang yang Diambil)
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Pilih part dari katalog atau ketik langsung PN & Nama Part. Stok akan dipotong otomatis jika tersedia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/40 text-xs font-mono font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Part</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">No</th>
                      <th className="px-3 py-2.5 w-48">Pilih dari Master Stok</th>
                      <th className="px-3 py-2.5 w-36">Part Number (PN)</th>
                      <th className="px-3 py-2.5">Nama Part</th>
                      <th className="px-3 py-2.5 w-20 text-center">Qty</th>
                      <th className="px-3 py-2.5 w-24">Satuan</th>
                      <th className="px-3 py-2.5 w-44">Status Stok Gudang</th>
                      <th className="px-3 py-2.5 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono">
                    {orderItems.map((item, idx) => {
                      const matchedStock = findPartInfo(item.partNumber, item.namaBarang);
                      const currentQty = matchedStock ? matchedStock.qty : 0;
                      const hasStock = currentQty >= (Number(item.qtyDiminta) || 1);
                      const isZero = currentQty <= 0;

                      return (
                        <tr key={idx} className="hover:bg-stone-800/40">
                          <td className="px-3 py-2 text-center text-stone-400 font-bold">{idx + 1}</td>
                          
                          {/* Dropdown Master */}
                          <td className="px-3 py-2">
                            <select
                              onChange={(e) => handleSelectCatalogPart(idx, e.target.value)}
                              className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2 py-1.5 text-[11px] text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">-- Cari di Master --</option>
                              {availableSpareParts.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.partNumber} ({sp.qty} {sp.satuan}) - {sp.namaBarang}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* PN */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.partNumber}
                              onChange={(e) => handleItemChange(idx, 'partNumber', e.target.value)}
                              placeholder="PN Part..."
                              className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* Nama Part */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={item.namaBarang}
                              onChange={(e) => handleItemChange(idx, 'namaBarang', e.target.value)}
                              placeholder="Nama spare part..."
                              className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* Qty */}
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.qtyDiminta}
                              onChange={(e) => handleItemChange(idx, 'qtyDiminta', Number(e.target.value))}
                              className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-center text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* Satuan */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.satuan}
                              onChange={(e) => handleItemChange(idx, 'satuan', e.target.value)}
                              placeholder="Pcs"
                              className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* Status Stok */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            {matchedStock ? (
                              isZero ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Habis (0 {matchedStock.satuan})</span>
                                </div>
                              ) : hasStock ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Tersedia: {currentQty} {matchedStock.satuan}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Kurang (Ada {currentQty} dari {item.qtyDiminta})</span>
                                </div>
                              )
                            ) : (
                              <span className="text-[11px] text-stone-500 italic">
                                Belum di Master (0 Stok)
                              </span>
                            )}
                          </td>

                          {/* Aksi Remove */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={orderItems.length <= 1}
                              className={`p-1.5 rounded-lg text-stone-400 transition ${
                                orderItems.length <= 1
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aksi Bawah */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPermintaanBarang}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition"
                  title="Langsung buka form Permintaan Barang jika part tidak ada di gudang"
                >
                  <FileText className="w-4 h-4" />
                  <span>Form Permintaan Barang</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-mono font-bold transition"
                >
                  Tutup
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-mono font-black shadow-lg shadow-amber-500/20 transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Simpan Order & Kurangi Stok</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
