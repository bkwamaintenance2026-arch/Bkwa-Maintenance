import React, { useState, useMemo } from 'react';
import { 
  NonUnitPurchaseRequest, 
  NonUnitPurchaseRequestItem, 
  NonUnitCategory,
  NON_UNIT_CATEGORY_OPTIONS,
  UserAccount, 
  ManpowerData 
} from '../../types';
import { getAllManpower } from '../../utils/storage';
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
  Wrench,
  Package,
  Building,
  User,
  Users
} from 'lucide-react';
import { BkwaLogo } from '../BkwaLogo';

interface NonUnitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  manpowerList?: ManpowerData[];
  onSubmitPR: (data: Omit<NonUnitPurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'updatedAt' | 'statusSupply' | 'statusPengajuan'>) => {
    success: boolean;
    message: string;
    request?: NonUnitPurchaseRequest;
  };
}

export const NonUnitRequestModal: React.FC<NonUnitRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  manpowerList: propManpowerList,
  onSubmitPR,
}) => {
  // Ambil data manpower untuk pembuat & pemeriksa
  const availableManpower = useMemo(() => {
    if (propManpowerList && propManpowerList.length > 0) return propManpowerList;
    return getAllManpower();
  }, [propManpowerList]);

  // Filter personil Administrasi Modul 2
  const adminCandidates = useMemo(() => {
    return availableManpower.filter((m) => {
      const jab = (m.jabatan || '').toUpperCase();
      return jab.includes('ADMIN') || jab.includes('LOGISTIK') || jab.includes('INVENTORY');
    });
  }, [availableManpower]);

  const defaultAdmin1 = adminCandidates[0]?.nama || currentUser.fullName || currentUser.username;
  const defaultAdmin2 = adminCandidates[1]?.nama || adminCandidates[0]?.nama || 'Administrasi Workshop';

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jam: new Date().toTimeString().slice(0, 5),
    kategori: 'TOOLS_ALAT_KERJA' as NonUnitCategory,
    pemohon: currentUser.fullName || currentUser.username,
    jabatanPemohon: currentUser.department || 'Administrasi Workshop',
    urgensi: 'NORMAL' as 'NORMAL' | 'URGENT' | 'EMERGENCY',
    alasanPermintaan: 'Kebutuhan peralatan kerja dan penunjang operasional bengkel site.',
    dibuatOleh: defaultAdmin1,
    diperiksaOleh: defaultAdmin2,
    disetujuiOleh: 'Dodik Mariyadi',
  });

  const [items, setItems] = useState<Array<{
    namaBarang: string;
    spesifikasi: string;
    qtyDiminta: number;
    satuan: string;
    keterangan: string;
  }>>([
    {
      namaBarang: '',
      spesifikasi: '',
      qtyDiminta: 1,
      satuan: 'Pcs',
      keterangan: 'Kebutuhan operasional workshop',
    },
  ]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; prNo?: string } | null>(null);
  const [createdPR, setCreatedPR] = useState<NonUnitPurchaseRequest | null>(null);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        namaBarang: '',
        spesifikasi: '',
        qtyDiminta: 1,
        satuan: 'Pcs',
        keterangan: 'Kebutuhan workshop',
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

    const validItems = items.filter((it) => it.namaBarang.trim().length > 0);
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: 'Minimal harus ada 1 item barang yang diisi namanya!' });
      return;
    }

    const payload = {
      tanggal: formData.tanggal,
      jam: formData.jam,
      kategori: formData.kategori,
      pemohon: formData.pemohon,
      jabatanPemohon: formData.jabatanPemohon,
      urgensi: formData.urgensi,
      alasanPermintaan: formData.alasanPermintaan,
      dibuatOleh: formData.dibuatOleh,
      diperiksaOleh: formData.diperiksaOleh,
      disetujuiOleh: formData.disetujuiOleh,
      items: validItems.map((it, idx) => ({
        no: idx + 1,
        namaBarang: it.namaBarang.trim(),
        spesifikasi: it.spesifikasi.trim(),
        qtyDiminta: Number(it.qtyDiminta) || 1,
        satuan: it.satuan.trim() || 'Pcs',
        keterangan: it.keterangan.trim(),
      })),
    };

    const res = onSubmitPR(payload);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
        prNo: res.request?.noPermintaan,
      });
      if (res.request) {
        setCreatedPR(res.request);
      }
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black print:rounded-none">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                  NON-UNIT
                </span>
                <span className="text-xs text-stone-400 font-mono">PT. Bukit Kencana Workshop</span>
              </div>
              <h3 className="text-base font-mono font-bold text-stone-100">
                Surat Permintaan Barang (SPB) Khusus Non Unit
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {createdPR && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak SPB</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 rounded-xl hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`px-6 py-3 text-xs font-mono font-bold flex items-center justify-between print:hidden ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            {feedback.prNo && (
              <span className="bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 border border-emerald-700/50">
                No: {feedback.prNo}
              </span>
            )}
          </div>
        )}

        {/* FORM CONTENT / PRINT VIEW */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-200 print:text-black print:p-6 print:overflow-visible">
          
          {/* PRINTABLE HEADER LEMBAR SPB */}
          <div className="border border-stone-800 rounded-2xl p-5 bg-stone-950/50 print:bg-white print:border-black print:p-4 print:rounded-none">
            <div className="flex items-start justify-between border-b-2 border-stone-800 pb-4 print:border-black">
              <div className="flex items-center gap-3">
                <BkwaLogo size={48} className="print:invert" />
                <div>
                  <h4 className="text-base font-bold font-mono text-stone-100 print:text-black">
                    PT. BUKIT KENCANA WAHANA ALAM
                  </h4>
                  <p className="text-xs text-stone-400 print:text-black">
                    PLANT &amp; WORKSHOP DEPARTMENT - SITE OPERATION
                  </p>
                  <p className="text-[10px] font-mono text-amber-400 print:text-black mt-0.5">
                    FORMULIR SURAT PERMINTAAN BARANG NON-UNIT KE LOGISTIK MALANG
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <div className="text-stone-400 print:text-black text-[10px]">Nomor Dokumen:</div>
                <div className="font-bold text-amber-400 print:text-black text-sm">
                  {createdPR ? createdPR.noPermintaan : '[Auto Generated: SPB-NU-XXXX]'}
                </div>
                <div className="text-stone-400 print:text-black text-[11px] mt-1">
                  Tanggal: {formData.tanggal} ({formData.jam})
                </div>
              </div>
            </div>

            {/* FORM INPUT INFORMASI UMUM */}
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                {/* Kategori SPB Non-Unit */}
                <div>
                  <label className="block text-[11px] text-stone-400 print:text-black font-bold mb-1">
                    Kategori Kebutuhan *
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as NonUnitCategory })}
                    disabled={!!createdPR}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 print:bg-white print:text-black print:border-black text-xs focus:ring-1 focus:ring-amber-500 font-bold"
                  >
                    {NON_UNIT_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-stone-500 print:hidden mt-0.5 block">
                    {NON_UNIT_CATEGORY_OPTIONS.find((c) => c.value === formData.kategori)?.desc}
                  </span>
                </div>

                {/* Urgensi */}
                <div>
                  <label className="block text-[11px] text-stone-400 print:text-black font-bold mb-1">
                    Tingkat Urgensi *
                  </label>
                  <select
                    value={formData.urgensi}
                    onChange={(e) => setFormData({ ...formData, urgensi: e.target.value as any })}
                    disabled={!!createdPR}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 print:bg-white print:text-black print:border-black text-xs focus:ring-1 focus:ring-amber-500 font-bold"
                  >
                    <option value="NORMAL">NORMAL (Pengadaan Reguler)</option>
                    <option value="URGENT">URGENT (Penting Operasional Bengkel)</option>
                    <option value="EMERGENCY">EMERGENCY (Kritis / Mendesak)</option>
                  </select>
                </div>

                {/* Pemohon */}
                <div>
                  <label className="block text-[11px] text-stone-400 print:text-black font-bold mb-1">
                    Nama Pemohon
                  </label>
                  <input
                    type="text"
                    value={formData.pemohon}
                    onChange={(e) => setFormData({ ...formData, pemohon: e.target.value })}
                    disabled={!!createdPR}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 print:bg-white print:text-black print:border-black text-xs"
                    placeholder="Nama mekanik / admin pemohon"
                  />
                </div>
              </div>

              {/* Alasan Permintaan */}
              <div>
                <label className="block text-[11px] text-stone-400 print:text-black font-bold mb-1 font-mono">
                  Alasan / Keterangan Kebutuhan Barang
                </label>
                <input
                  type="text"
                  value={formData.alasanPermintaan}
                  onChange={(e) => setFormData({ ...formData, alasanPermintaan: e.target.value })}
                  disabled={!!createdPR}
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 print:bg-white print:text-black print:border-black text-xs font-mono"
                  placeholder="Contoh: Kebutuhan kawat las dan WD-40 untuk fabrikasi bracket workshop"
                />
              </div>

              {/* TABEL RINCIAN BARANG */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-mono font-bold text-amber-400 print:text-black uppercase">
                    Rincian Barang / Alat yang Diminta
                  </h5>
                  {!createdPR && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-mono font-bold border border-stone-700 print:hidden transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-800 print:border-black">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-stone-800/80 text-stone-300 print:bg-stone-100 print:text-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-center w-12">No</th>
                        <th className="px-3 py-2">Nama Barang / Deskripsi *</th>
                        <th className="px-3 py-2">Spesifikasi / Merk / Ukuran</th>
                        <th className="px-3 py-2 text-center w-24">Qty *</th>
                        <th className="px-3 py-2 w-24">Satuan *</th>
                        <th className="px-3 py-2">Keterangan</th>
                        {!createdPR && <th className="px-3 py-2 text-center w-12 print:hidden">Hapus</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 print:divide-black text-stone-200 print:text-black bg-stone-900/60 print:bg-white">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-stone-800/30 print:hover:bg-white">
                          <td className="px-3 py-2 text-center text-stone-400 print:text-black font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2">
                            {createdPR ? (
                              <span className="font-bold">{it.namaBarang}</span>
                            ) : (
                              <input
                                type="text"
                                value={it.namaBarang}
                                onChange={(e) => handleItemChange(idx, 'namaBarang', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-1 focus:ring-amber-500"
                                placeholder="Misal: Kunci Pas Ring 24mm, Majun, APD"
                                required
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {createdPR ? (
                              <span>{it.spesifikasi || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                value={it.spesifikasi}
                                onChange={(e) => handleItemChange(idx, 'spesifikasi', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                                placeholder="Merk / Tipe / Ukuran"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {createdPR ? (
                              <span className="font-bold">{it.qtyDiminta}</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={it.qtyDiminta}
                                onChange={(e) => handleItemChange(idx, 'qtyDiminta', Number(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-center rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                                required
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {createdPR ? (
                              <span>{it.satuan}</span>
                            ) : (
                              <select
                                value={it.satuan}
                                onChange={(e) => handleItemChange(idx, 'satuan', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                              >
                                <option value="Pcs">Pcs</option>
                                <option value="Set">Set</option>
                                <option value="Box">Box</option>
                                <option value="Roll">Roll</option>
                                <option value="Ltr">Ltr</option>
                                <option value="Pail">Pail</option>
                                <option value="Drum">Drum</option>
                                <option value="Mtr">Mtr</option>
                                <option value="Pack">Pack</option>
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {createdPR ? (
                              <span>{it.keterangan || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                value={it.keterangan}
                                onChange={(e) => handleItemChange(idx, 'keterangan', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                                placeholder="Catatan kegunaan"
                              />
                            )}
                          </td>
                          {!createdPR && (
                            <td className="px-3 py-2 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={items.length <= 1}
                                className="p-1 text-stone-500 hover:text-rose-400 disabled:opacity-30 transition"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STRUKTUR PENGESAHAN 3 PIHAK STANDAR MODUL 3 & MODUL 6 */}
              <div className="pt-4 border-t border-stone-800 print:border-black">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-amber-400 print:text-black" />
                  <span className="text-xs font-mono font-bold text-stone-300 print:text-black uppercase">
                    Lembar Pengesahan Permintaan Barang (3 Pihak)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-stone-950/70 border border-stone-800 print:bg-white print:border-black font-mono text-center">
                  {/* Di Buat Oleh */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 print:text-black uppercase block font-bold">
                      Di Buat Oleh
                    </span>
                    <span className="text-[10px] text-stone-500 print:text-black block mb-4">
                      Administrasi Modul 2
                    </span>
                    {createdPR ? (
                      <div className="font-bold text-stone-100 print:text-black text-xs underline">
                        {formData.dibuatOleh}
                      </div>
                    ) : (
                      <select
                        value={formData.dibuatOleh}
                        onChange={(e) => setFormData({ ...formData, dibuatOleh: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold print:bg-white print:text-black"
                      >
                        {adminCandidates.map((m) => (
                          <option key={m.id} value={m.nama}>
                            {m.nama} ({m.jabatan})
                          </option>
                        ))}
                        {!adminCandidates.some((m) => m.nama === formData.dibuatOleh) && (
                          <option value={formData.dibuatOleh}>{formData.dibuatOleh}</option>
                        )}
                      </select>
                    )}
                  </div>

                  {/* Diperiksa Oleh */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 print:text-black uppercase block font-bold">
                      Diperiksa Oleh
                    </span>
                    <span className="text-[10px] text-stone-500 print:text-black block mb-4">
                      Administrasi Modul 2
                    </span>
                    {createdPR ? (
                      <div className="font-bold text-stone-100 print:text-black text-xs underline">
                        {formData.diperiksaOleh}
                      </div>
                    ) : (
                      <select
                        value={formData.diperiksaOleh}
                        onChange={(e) => setFormData({ ...formData, diperiksaOleh: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold print:bg-white print:text-black"
                      >
                        {adminCandidates.map((m) => (
                          <option key={m.id} value={m.nama}>
                            {m.nama} ({m.jabatan})
                          </option>
                        ))}
                        {!adminCandidates.some((m) => m.nama === formData.diperiksaOleh) && (
                          <option value={formData.diperiksaOleh}>{formData.diperiksaOleh}</option>
                        )}
                      </select>
                    )}
                  </div>

                  {/* Disetujui Oleh */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 print:text-black uppercase block font-bold">
                      Disetujui Oleh
                    </span>
                    <span className="text-[10px] text-stone-500 print:text-black block mb-4">
                      Kabag Workshop
                    </span>
                    <div className="font-bold text-stone-100 print:text-black text-xs underline pt-1.5">
                      Dodik Mariyadi
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {!createdPR && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800 print:hidden">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs font-bold shadow-lg shadow-amber-500/20 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Ajukan &amp; Simpan SPB Non-Unit</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
