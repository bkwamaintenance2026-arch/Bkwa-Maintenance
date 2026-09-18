import React, { useState, useEffect } from 'react';
import { AssetUnit, OperationalStatus, UnitCategory, UserAccount } from '../../types';
import { 
  X, 
  Save, 
  PlusCircle, 
  Wrench, 
  MapPin, 
  Clock, 
  User, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AssetUnit, 'id' | 'tanggalRegistrasi' | 'terakhirDiperbarui'>) => void;
  initialData?: AssetUnit | null;
  currentUser: UserAccount;
}

const CATEGORIES: UnitCategory[] = [
  'Excavator',
  'Dump Truck',
  'Wheel Loader',
  'Stone Crusher Plant',
  'Bulldozer',
  'Genset & Power',
  'Vibro Roller',
  'Support & Utility',
];

const STATUSES: { value: OperationalStatus; label: string; color: string }[] = [
  { value: 'OPERASI', label: 'OPERASI (Ready/Bekerja)', color: 'text-emerald-400' },
  { value: 'STANDBY', label: 'STANDBY (Siap Operasi)', color: 'text-blue-400' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE (Servis/Perawatan)', color: 'text-amber-400' },
  { value: 'BREAKDOWN', label: 'BREAKDOWN (Kerusakan)', color: 'text-rose-400' },
];

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  currentUser,
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    kodeUnit: '',
    namaUnit: '',
    kategori: 'Excavator' as UnitCategory,
    merkModel: '',
    noSeriRangka: '',
    noMesin: '',
    tahunPembuatan: new Date().getFullYear(),
    statusOperasional: 'OPERASI' as OperationalStatus,
    lokasiKerja: 'Pit Tambang Kali Welang',
    hourMeter: 0,
    picOperator: '',
    catatan: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        kodeUnit: initialData.kodeUnit || '',
        namaUnit: initialData.namaUnit || '',
        kategori: initialData.kategori || 'Excavator',
        merkModel: initialData.merkModel || '',
        noSeriRangka: initialData.noSeriRangka || '',
        noMesin: initialData.noMesin || '',
        tahunPembuatan: initialData.tahunPembuatan || new Date().getFullYear(),
        statusOperasional: initialData.statusOperasional || 'OPERASI',
        lokasiKerja: initialData.lokasiKerja || 'Pit Tambang Kali Welang',
        hourMeter: initialData.hourMeter || 0,
        picOperator: initialData.picOperator || '',
        catatan: initialData.catatan || '',
      });
    } else {
      setFormData({
        kodeUnit: '',
        namaUnit: '',
        kategori: 'Excavator',
        merkModel: '',
        noSeriRangka: '',
        noMesin: '',
        tahunPembuatan: new Date().getFullYear(),
        statusOperasional: 'OPERASI',
        lokasiKerja: 'Pit Tambang Kali Welang',
        hourMeter: 0,
        picOperator: '',
        catatan: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kodeUnit.trim()) {
      setError('Kode Unit / No Lambung wajib diisi (contoh: EXC-01, DT-05)');
      return;
    }
    if (!formData.namaUnit.trim()) {
      setError('Nama Unit / Tipe Alat wajib diisi');
      return;
    }
    if (formData.hourMeter < 0) {
      setError('Hour Meter (HM) tidak boleh bernilai negatif');
      return;
    }

    onSubmit({
      kodeUnit: formData.kodeUnit.trim().toUpperCase(),
      namaUnit: formData.namaUnit.trim(),
      kategori: formData.kategori,
      merkModel: formData.merkModel.trim() || formData.namaUnit.trim(),
      noSeriRangka: formData.noSeriRangka.trim() || '-',
      noMesin: formData.noMesin.trim() || '-',
      tahunPembuatan: Number(formData.tahunPembuatan) || new Date().getFullYear(),
      statusOperasional: formData.statusOperasional,
      lokasiKerja: formData.lokasiKerja.trim() || 'Area Tambang Welang',
      hourMeter: Number(formData.hourMeter) || 0,
      picOperator: formData.picOperator.trim() || 'Belum Ditentukan',
      catatan: formData.catatan.trim() || '-',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              {isEditing ? <Wrench className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-mono">
                {isEditing ? `UPDATE UNIT: ${initialData?.kodeUnit}` : 'REGISTRASI UNIT BARU BKWA'}
              </h2>
              <p className="text-xs text-stone-400">
                {isEditing
                  ? 'Perbarui data spesifikasi, jam kerja (HM), atau status operasional'
                  : 'Input data spesifikasi alat berat / plant baru armada PT BKWA'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identitas Pokok Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Kode / No Lambung Unit <span className="text-amber-400">*</span>
              </label>
              <input
                id="input-kode-unit"
                type="text"
                required
                value={formData.kodeUnit}
                onChange={(e) => setFormData({ ...formData, kodeUnit: e.target.value })}
                placeholder="misal: EXC-03, DT-06, CR-02"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Kategori Asset <span className="text-amber-400">*</span>
              </label>
              <select
                id="select-kategori-unit"
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value as UnitCategory })}
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Nama & Tipe Lengkap Unit <span className="text-amber-400">*</span>
              </label>
              <input
                id="input-nama-unit"
                type="text"
                required
                value={formData.namaUnit}
                onChange={(e) => setFormData({ ...formData, namaUnit: e.target.value })}
                placeholder="misal: Excavator Komatsu PC200-8M0 Heavy Duty"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 2: Spesifikasi & Nomor Seri Mesin/Rangka */}
          <div className="pt-2 border-t border-stone-800/80">
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400/90 mb-3 font-mono">
              Spesifikasi Pabrikan & Identifikasi Teknis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Merk / Model Detail
                </label>
                <input
                  type="text"
                  value={formData.merkModel}
                  onChange={(e) => setFormData({ ...formData, merkModel: e.target.value })}
                  placeholder="Komatsu PC200-8"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  No. Seri Rangka (Chassis/VIN)
                </label>
                <input
                  type="text"
                  value={formData.noSeriRangka}
                  onChange={(e) => setFormData({ ...formData, noSeriRangka: e.target.value })}
                  placeholder="KMT-PC200-8921..."
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  No. Mesin (Engine No)
                </label>
                <input
                  type="text"
                  value={formData.noMesin}
                  onChange={(e) => setFormData({ ...formData, noMesin: e.target.value })}
                  placeholder="SAA6D107E-..."
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Tahun Pembuatan
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={formData.tahunPembuatan}
                  onChange={(e) => setFormData({ ...formData, tahunPembuatan: Number(e.target.value) })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Hour Meter (HM / Jam Kerja)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={formData.hourMeter}
                  onChange={(e) => setFormData({ ...formData, hourMeter: Number(e.target.value) })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold text-amber-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Status Operasional
                </label>
                <select
                  value={formData.statusOperasional}
                  onChange={(e) =>
                    setFormData({ ...formData, statusOperasional: e.target.value as OperationalStatus })
                  }
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:ring-2 focus:ring-amber-500"
                >
                  {STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Penempatan & Catatan Operasi */}
          <div className="pt-2 border-t border-stone-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Lokasi Penempatan Kerja
                </label>
                <input
                  type="text"
                  value={formData.lokasiKerja}
                  onChange={(e) => setFormData({ ...formData, lokasiKerja: e.target.value })}
                  placeholder="Pit Tambang Kali Welang / Plant Crusher / Workshop"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Operator / Penanggung Jawab Unit
                </label>
                <input
                  type="text"
                  value={formData.picOperator}
                  onChange={(e) => setFormData({ ...formData, picOperator: e.target.value })}
                  placeholder="Nama Operator / Kepala Regu"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Catatan Teknis / Kondisi Unit
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Catatan kondisi undercarriage, rem, kebocoran oli hidrolik, jadwal servis berkala berikutnya..."
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-800">
            <div className="text-[11px] text-stone-400">
              Dicatat oleh: <span className="font-semibold text-amber-400">{currentUser.fullName}</span> ({currentUser.role})
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
              >
                Batal
              </button>
              <button
                id="btn-submit-asset-form"
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Daftarkan Unit'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
