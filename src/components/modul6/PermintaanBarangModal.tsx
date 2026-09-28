import React, { useState } from 'react';
import { PurchaseRequest, PurchaseRequestItem, UserAccount } from '../../types';
import { 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Printer,
  Calendar,
  Clock,
  Truck,
  Hash
} from 'lucide-react';
import { BkwaLogo } from '../BkwaLogo';

interface PermintaanBarangModalProps {
  isOpen: boolean;
  onClose: () => void;
  noMaintenanceOrder?: string;
  noUnit?: string;
  namaAlat?: string;
  initialItems?: Array<{
    partNumber: string;
    namaBarang: string;
    qtyDiminta: number;
    satuan: string;
    keterangan?: string;
  }>;
  currentUser: UserAccount;
  onSubmitPR: (data: Omit<PurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'status'>) => {
    success: boolean;
    message: string;
    request?: PurchaseRequest;
  };
}

export const PermintaanBarangModal: React.FC<PermintaanBarangModalProps> = ({
  isOpen,
  onClose,
  noMaintenanceOrder = '',
  noUnit = '',
  namaAlat = '',
  initialItems = [],
  currentUser,
  onSubmitPR,
}) => {
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jam: new Date().toTimeString().slice(0, 5),
    noMaintenanceOrder,
    noUnit,
    namaAlat,
    pemohon: currentUser.fullName || currentUser.username,
    jabatanPemohon: currentUser.department || 'Mekanik / Logistik',
    urgensi: 'NORMAL' as 'NORMAL' | 'URGENT' | 'EMERGENCY',
    alasanPermintaan: 'Stok gudang tidak mencukupi untuk perbaikan breakdown unit.',
  });

  const [items, setItems] = useState<Array<{
    partNumber: string;
    namaBarang: string;
    qtyDiminta: number;
    satuan: string;
    keterangan: string;
  }>>(
    initialItems.length > 0
      ? initialItems.map((i) => ({
          partNumber: i.partNumber || '',
          namaBarang: i.namaBarang || '',
          qtyDiminta: i.qtyDiminta || 1,
          satuan: i.satuan || 'Pcs',
          keterangan: i.keterangan || 'Stok Gudang Kosong',
        }))
      : [
          {
            partNumber: '',
            namaBarang: '',
            qtyDiminta: 1,
            satuan: 'Pcs',
            keterangan: 'Stok Kosong',
          },
        ]
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; prNo?: string } | null>(null);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        partNumber: '',
        namaBarang: '',
        qtyDiminta: 1,
        satuan: 'Pcs',
        keterangan: 'Kebutuhan breakdown unit',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some((i) => !i.namaBarang.trim())) {
      setFeedback({ type: 'error', message: 'Semua baris barang wajib mengisi Nama Part/Barang!' });
      return;
    }

    const payloadItems: PurchaseRequestItem[] = items.map((it, idx) => ({
      no: idx + 1,
      partNumber: it.partNumber.trim(),
      namaBarang: it.namaBarang.trim(),
      qtyDiminta: Number(it.qtyDiminta) || 1,
      satuan: it.satuan.trim() || 'Pcs',
      keterangan: it.keterangan.trim(),
    }));

    const res = onSubmitPR({
      tanggal: formData.tanggal,
      jam: formData.jam,
      noMaintenanceOrder: formData.noMaintenanceOrder,
      noUnit: formData.noUnit,
      namaAlat: formData.namaAlat,
      pemohon: formData.pemohon,
      jabatanPemohon: formData.jabatanPemohon,
      urgensi: formData.urgensi,
      alasanPermintaan: formData.alasanPermintaan,
      items: payloadItems,
    });

    if (res.success && res.request) {
      setFeedback({
        type: 'success',
        message: res.message,
        prNo: res.request.noPermintaan,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Gagal mengajukan formulir permintaan barang.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-mono font-bold text-stone-100 flex items-center gap-2">
                FORM PERMINTAAN BARANG / SPARE PART (SPB)
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Pengadaan suku cadang karena stok gudang tidak mencukupi untuk Maintenance Order
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
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
                <div>
                  <p className="text-xs font-bold font-mono">{feedback.message}</p>
                  {feedback.prNo && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-stone-300">Nomor Form SPB:</span>
                      <span className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-mono font-black text-xs">
                        {feedback.prNo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (feedback.type === 'success') {
                    onClose();
                  } else {
                    setFeedback(null);
                  }
                }}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form */}
          <form id="form-permintaan-barang" onSubmit={handleSubmit} className="space-y-5">
            {/* Informasi Referensi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-stone-950/60 border border-stone-800 text-xs font-mono">
              <div>
                <label className="text-stone-400 block text-[10px] uppercase font-bold mb-1">
                  Reff No. Maintenance Order
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 border border-amber-500/40 text-amber-400 font-bold">
                  <Hash className="w-3.5 h-3.5 text-amber-500" />
                  <span>{formData.noMaintenanceOrder || '-'}</span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 block text-[10px] uppercase font-bold mb-1">
                  No. Unit (CN New)
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-bold">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  <span>{formData.noUnit || '-'}</span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 block text-[10px] uppercase font-bold mb-1">
                  Nama Alat
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.namaAlat || '-'}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-stone-400 block text-[10px] uppercase font-bold mb-1">
                  Tingkat Urgensi
                </label>
                <select
                  value={formData.urgensi}
                  onChange={(e) => setFormData({ ...formData, urgensi: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="NORMAL">NORMAL (Stok Penunjang)</option>
                  <option value="URGENT">URGENT (Unit Stop Operasi)</option>
                  <option value="EMERGENCY">EMERGENCY (Kritis / Proyek Utama)</option>
                </select>
              </div>
            </div>

            {/* Pemohon & Alasan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Nama Pemohon / Mekanik <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pemohon}
                  onChange={(e) => setFormData({ ...formData, pemohon: e.target.value })}
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Jabatan / Bagian
                </label>
                <input
                  type="text"
                  value={formData.jabatanPemohon}
                  onChange={(e) => setFormData({ ...formData, jabatanPemohon: e.target.value })}
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-mono font-bold block mb-1">
                  Alasan Permintaan
                </label>
                <input
                  type="text"
                  value={formData.alasanPermintaan}
                  onChange={(e) => setFormData({ ...formData, alasanPermintaan: e.target.value })}
                  placeholder="Keterangan urgensi suku cadang"
                  className="w-full bg-stone-800/80 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* TABEL LIST BARANG YANG DIMINTA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>Daftar Suku Cadang yang Diajukan</span>
                  <span className="px-2 py-0.5 rounded-full bg-stone-800 text-[10px] text-stone-300">
                    {items.length} item
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/40 text-xs font-mono font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">No</th>
                      <th className="px-3 py-2.5 w-44">Part Number (PN)</th>
                      <th className="px-3 py-2.5">Nama Part / Komponen <span className="text-rose-400">*</span></th>
                      <th className="px-3 py-2.5 w-24">Qty</th>
                      <th className="px-3 py-2.5 w-28">Satuan</th>
                      <th className="px-3 py-2.5">Keterangan / Spesifikasi</th>
                      <th className="px-3 py-2.5 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-800/40">
                        <td className="px-3 py-2 text-center text-stone-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.partNumber}
                            onChange={(e) => handleItemChange(idx, 'partNumber', e.target.value)}
                            placeholder="cth: 600-185-5100"
                            className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            required
                            value={item.namaBarang}
                            onChange={(e) => handleItemChange(idx, 'namaBarang', e.target.value)}
                            placeholder="cth: Filter Solar Primary"
                            className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.qtyDiminta}
                            onChange={(e) => handleItemChange(idx, 'qtyDiminta', Number(e.target.value))}
                            className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-center text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.satuan}
                            onChange={(e) => handleItemChange(idx, 'satuan', e.target.value)}
                            placeholder="Pcs/Set/Unit"
                            className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.keterangan}
                            onChange={(e) => handleItemChange(idx, 'keterangan', e.target.value)}
                            placeholder="Untuk penggantian breakdown"
                            className="w-full bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className={`p-1.5 rounded-lg text-stone-400 transition ${
                              items.length <= 1
                                ? 'opacity-30 cursor-not-allowed'
                                : 'hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tombol Simpan & Submit */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-mono font-bold transition"
              >
                Batal
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-mono font-black shadow-lg shadow-amber-500/20 transition"
              >
                <Send className="w-4 h-4" />
                <span>Ajukan Form Permintaan Barang</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
