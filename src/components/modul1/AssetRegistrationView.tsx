import React, { useState, useEffect } from 'react';
import { AssetUnit, OperationalStatus, UserAccount } from '../../types';
import { 
  Save, 
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Eye,
  Edit3,
  Lock
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface AssetRegistrationViewProps {
  units: AssetUnit[];
  currentUser: UserAccount;
  onSaveUnit: (data: Omit<AssetUnit, 'id' | 'tanggalRegistrasi' | 'terakhirDiperbarui'>, existingId?: string | null) => {
    success: boolean;
    message: string;
    unit?: AssetUnit;
  };
  onDeleteUnit: (id: string) => { success: boolean; message: string };
}

const EMPTY_FORM = {
  cnNew: '',
  namaAlat: '',
  jenis: '',
  classUnit: '',
  loc: '',
  status: 'OPERASI' as OperationalStatus,
  brandMerk: '',
  snUnit: '',
  modelUnit: '',
  engineModel: '',
  snEngine: '',
  merkEngine: '',
  catatan: '',
};

export const AssetRegistrationView: React.FC<AssetRegistrationViewProps> = ({
  units,
  currentUser,
  onSaveUnit,
  onDeleteUnit,
}) => {
  // Cek otorisasi hak akses user untuk Modul 1
  const canEdit = canUserEdit(currentUser, 1);

  // Form state
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // View modal state
  const [viewingUnit, setViewingUnit] = useState<AssetUnit | null>(null);

  // Status feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Auto dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleResetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingUnitId(null);
  };

  // 1. SIMPAN (Save / Add / Update)
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda diatur sebagai "Hanya View". Hubungi Developer untuk mendapatkan hak akses pengisian data.' 
      });
      return;
    }

    // Wajib: CN_NEW dan NAMA ALAT
    if (!formData.cnNew.trim()) {
      setFeedback({ type: 'error', message: 'Field "CN_NEW" wajib diisi!' });
      return;
    }
    if (!formData.namaAlat.trim()) {
      setFeedback({ type: 'error', message: 'Field "NAMA ALAT" wajib diisi!' });
      return;
    }

    const payload = {
      cnNew: formData.cnNew.trim().toUpperCase(),
      namaAlat: formData.namaAlat.trim(),
      jenis: formData.jenis.trim(),
      classUnit: formData.classUnit.trim(),
      loc: formData.loc.trim(),
      status: formData.status,
      brandMerk: formData.brandMerk.trim(),
      snUnit: formData.snUnit.trim(),
      modelUnit: formData.modelUnit.trim(),
      engineModel: formData.engineModel.trim(),
      snEngine: formData.snEngine.trim(),
      merkEngine: formData.merkEngine.trim(),
      catatan: formData.catatan.trim(),
    };

    const res = onSaveUnit(payload, editingUnitId);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      handleResetForm();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // 2. VIEW ACTION (Buka modal detail)
  const handleView = (unit: AssetUnit) => {
    setViewingUnit(unit);
  };

  // 3. EDIT ACTION (Load ke form)
  const handleEdit = (unit: AssetUnit) => {
    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Pengeditan data dinonaktifkan.' 
      });
      return;
    }

    setEditingUnitId(unit.id);
    setFormData({
      cnNew: unit.cnNew || '',
      namaAlat: unit.namaAlat || '',
      jenis: unit.jenis || '',
      classUnit: unit.classUnit || '',
      loc: unit.loc || '',
      status: unit.status || 'OPERASI',
      brandMerk: unit.brandMerk || '',
      snUnit: unit.snUnit || '',
      modelUnit: unit.modelUnit || '',
      engineModel: unit.engineModel || '',
      snEngine: unit.snEngine || '',
      merkEngine: unit.merkEngine || '',
      catatan: unit.catatan || '',
    });
    setFeedback({
      type: 'info',
      message: `Sedang mengedit unit [${unit.cnNew}]. Silakan ubah data pada form di atas lalu klik "Simpan".`,
    });
    // Scroll smoothly to form
    const formEl = document.getElementById('form-registrasi-asset');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 4. DELETED ACTION
  const handleDelete = (unit: AssetUnit) => {
    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Penghapusan data dinonaktifkan.' 
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data unit [${unit.cnNew} - ${unit.namaAlat}]?`
    );
    if (!confirmDelete) return;

    const res = onDeleteUnit(unit.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      if (editingUnitId === unit.id) {
        handleResetForm();
      }
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Filtered list
  const filteredUnits = units.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.cnNew && u.cnNew.toLowerCase().includes(q)) ||
      (u.namaAlat && u.namaAlat.toLowerCase().includes(q)) ||
      (u.jenis && u.jenis.toLowerCase().includes(q)) ||
      (u.brandMerk && u.brandMerk.toLowerCase().includes(q)) ||
      (u.loc && u.loc.toLowerCase().includes(q)) ||
      (u.status && u.status.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'OPERASI':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'STANDBY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'MAINTENANCE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'BREAKDOWN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-stone-700 text-stone-300 border-stone-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
              : 'bg-amber-950/60 border-amber-800 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-stone-800/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FORM REGISTRASI ASSET */}
      <section 
        id="form-registrasi-asset"
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl relative"
      >
        {!canEdit && (
          <div className="mb-4 p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/70 text-sky-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>Mode Akses: Hanya View (Read-Only).</strong> Akun Anda hanya dapat melihat data unit asset. Pengisian dan pengeditan data dikunci oleh Developer.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900/60 border border-sky-700 text-sky-300 font-bold shrink-0">
              VIEW ONLY
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                MODUL 1
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide">
                FORM REGISTRASI ASSET
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Hanya field <strong className="text-amber-400">CN_NEW</strong> dan <strong className="text-amber-400">NAMA ALAT</strong> yang wajib diisi. Kolom lainnya dapat dilengkapi sesuai kebutuhan.
            </p>
          </div>

          {editingUnitId && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-300">
              <span>Mode Edit: <strong>{formData.cnNew}</strong></span>
              <button
                type="button"
                onClick={handleResetForm}
                className="underline hover:text-white font-bold ml-1"
              >
                Batal Edit
              </button>
            </div>
          )}
        </div>

        {/* Form Inputs Grid: 12 Field */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. CN_NEW (Wajib) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                CN_NEW <span className="text-rose-400">*Wajib</span>
              </label>
              <input
                id="field-cn-new"
                type="text"
                required
                value={formData.cnNew}
                onChange={(e) => setFormData({ ...formData, cnNew: e.target.value })}
                placeholder="Contoh: EXC-01, DT-09, CR-01"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 2. NAMA ALAT (Wajib) */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                NAMA ALAT <span className="text-rose-400">*Wajib</span>
              </label>
              <input
                id="field-nama-alat"
                type="text"
                required
                value={formData.namaAlat}
                onChange={(e) => setFormData({ ...formData, namaAlat: e.target.value })}
                placeholder="Contoh: Excavator Komatsu PC200-8M0 Heavy Duty"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              />
            </div>

            {/* 3. JENIS */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                JENIS
              </label>
              <input
                id="field-jenis"
                type="text"
                value={formData.jenis}
                onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                placeholder="Excavator / Dump Truck / Crusher"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 4. CLASS */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                CLASS
              </label>
              <input
                id="field-class"
                type="text"
                value={formData.classUnit}
                onChange={(e) => setFormData({ ...formData, classUnit: e.target.value })}
                placeholder="Heavy Duty / 20 Ton / 6x4"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 5. LOC */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                LOC
              </label>
              <input
                id="field-loc"
                type="text"
                value={formData.loc}
                onChange={(e) => setFormData({ ...formData, loc: e.target.value })}
                placeholder="Pit Purwosari / Plant Crusher"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 6. STATUS */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                STATUS
              </label>
              <select
                id="field-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as OperationalStatus })}
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="OPERASI">OPERASI (Ready/Aktif)</option>
                <option value="STANDBY">STANDBY (Siap Kerja)</option>
                <option value="MAINTENANCE">MAINTENANCE (Servis)</option>
                <option value="BREAKDOWN">BREAKDOWN (Rusak)</option>
              </select>
            </div>

            {/* 7. BRAND/MERK */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                BRAND/MERK
              </label>
              <input
                id="field-brand-merk"
                type="text"
                value={formData.brandMerk}
                onChange={(e) => setFormData({ ...formData, brandMerk: e.target.value })}
                placeholder="Komatsu / Caterpillar / Hino"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 8. SN UNIT */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                SN UNIT
              </label>
              <input
                id="field-sn-unit"
                type="text"
                value={formData.snUnit}
                onChange={(e) => setFormData({ ...formData, snUnit: e.target.value })}
                placeholder="No Seri Rangka / Chassis"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 9. MODEL UNIT */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                MODEL UNIT
              </label>
              <input
                id="field-model-unit"
                type="text"
                value={formData.modelUnit}
                onChange={(e) => setFormData({ ...formData, modelUnit: e.target.value })}
                placeholder="PC200-8M0 / 320D2 / FM 260 JD"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 10. ENGINE MODEL */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                ENGINE MODEL
              </label>
              <input
                id="field-engine-model"
                type="text"
                value={formData.engineModel}
                onChange={(e) => setFormData({ ...formData, engineModel: e.target.value })}
                placeholder="SAA6D107E-1 / C4.4 / J08E"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 11. SN ENGINE */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                SN ENGINE
              </label>
              <input
                id="field-sn-engine"
                type="text"
                value={formData.snEngine}
                onChange={(e) => setFormData({ ...formData, snEngine: e.target.value })}
                placeholder="Nomor Seri Mesin"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 12. MERK ENGINE */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                MERK ENGINE
              </label>
              <input
                id="field-merk-engine"
                type="text"
                value={formData.merkEngine}
                onChange={(e) => setFormData({ ...formData, merkEngine: e.target.value })}
                placeholder="Komatsu / Caterpillar / Hino / Perkins"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Optional Catatan */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400 mb-1">
                CATATAN (Opsional)
              </label>
              <input
                id="field-catatan"
                type="text"
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                placeholder="Keterangan tambahan unit..."
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* HANYA TOMBOL "SIMPAN" DI BAWAH MENU FORM INPUT */}
          <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {canEdit ? (
                <button
                  id="btn-action-simpan"
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              ) : (
                <button
                  id="btn-action-simpan"
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-stone-400 bg-stone-800 border border-stone-700 cursor-not-allowed opacity-80"
                  title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data."
                >
                  <Lock className="w-4 h-4 text-stone-400" />
                  <span>Pengisian Dikunci (Hanya View)</span>
                </button>
              )}

              {/* Reset form jika ada yang sedang diisi/diedit */}
              {canEdit && (editingUnitId || formData.cnNew || formData.namaAlat) && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
                  title="Kosongkan form input"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Form</span>
                </button>
              )}
            </div>

            {editingUnitId && (
              <span className="text-[11px] text-amber-400 font-mono">
                *Klik Simpan untuk memperbarui unit {formData.cnNew}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* LIST DI BAWAH FORM INPUT: VIEW, EDIT, DAN DELETED */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide">
                DAFTAR ASSET UNIT
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {units.length} Unit
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Daftar asset unit terdaftar. Gunakan kolom Aksi di samping kanan untuk <strong>View</strong>, <strong>Edit</strong>, atau <strong>Deleted</strong>.
            </p>
          </div>

          {/* Fast Search */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari CN_NEW / Nama Alat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Live Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-3">CN_NEW</th>
                <th className="py-3 px-3">NAMA ALAT</th>
                <th className="py-3 px-3">JENIS</th>
                <th className="py-3 px-3">CLASS</th>
                <th className="py-3 px-3">LOC</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3">BRAND/MERK</th>
                <th className="py-3 px-3">SN UNIT</th>
                <th className="py-3 px-3">MODEL UNIT</th>
                <th className="py-3 px-3">ENGINE MODEL</th>
                <th className="py-3 px-3">SN ENGINE</th>
                <th className="py-3 px-3">MERK ENGINE</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-stone-950/90 shadow-l">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredUnits.length > 0 ? (
                filteredUnits.map((u) => {
                  const isBeingEdited = editingUnitId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`transition ${
                        isBeingEdited
                          ? 'bg-amber-500/15 border-l-4 border-amber-500'
                          : 'hover:bg-stone-800/40'
                      }`}
                    >
                      {/* CN_NEW */}
                      <td className="py-3 px-3 font-mono font-black text-amber-400 whitespace-nowrap">
                        {u.cnNew}
                      </td>

                      {/* NAMA ALAT */}
                      <td className="py-3 px-3 font-bold text-stone-100 whitespace-nowrap">
                        {u.namaAlat}
                      </td>

                      {/* JENIS */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.jenis || '-'}
                      </td>

                      {/* CLASS */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.classUnit || '-'}
                      </td>

                      {/* LOC */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.loc || '-'}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                            u.status
                          )}`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* BRAND/MERK */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.brandMerk || '-'}
                      </td>

                      {/* SN UNIT */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {u.snUnit || '-'}
                      </td>

                      {/* MODEL UNIT */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.modelUnit || '-'}
                      </td>

                      {/* ENGINE MODEL */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {u.engineModel || '-'}
                      </td>

                      {/* SN ENGINE */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {u.snEngine || '-'}
                      </td>

                      {/* MERK ENGINE */}
                      <td className="py-3 px-3 text-stone-300 whitespace-nowrap">
                        {u.merkEngine || '-'}
                      </td>

                      {/* KOLOM AKSI: VIEW, EDIT, DAN DELETED */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-stone-900/95 shadow-l">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. VIEW */}
                          <button
                            id={`btn-view-${u.cnNew}`}
                            type="button"
                            onClick={() => handleView(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 hover:text-white border border-stone-700 transition"
                            title={`Lihat detail ${u.cnNew}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-400" />
                            <span>View</span>
                          </button>

                          {/* 2. EDIT */}
                          <button
                            id={`btn-edit-${u.cnNew}`}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleEdit(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title={canEdit ? `Edit data ${u.cnNew}` : 'Akun Anda dalam mode Hanya View (Edit dinonaktifkan)'}
                          >
                            {canEdit ? <Edit3 className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3 h-3 text-stone-500" />}
                            <span>Edit</span>
                          </button>

                          {/* 3. DELETED */}
                          <button
                            id={`btn-delete-${u.cnNew}`}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleDelete(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border-rose-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title={canEdit ? `Hapus data ${u.cnNew}` : 'Akun Anda dalam mode Hanya View (Hapus dinonaktifkan)'}
                          >
                            {canEdit ? <Trash2 className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3 h-3 text-stone-500" />}
                            <span>Deleted</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-stone-400 text-xs">
                    {units.length === 0 ? (
                      <div className="space-y-1">
                        <p className="font-bold text-stone-300">Belum ada data asset yang terdaftar.</p>
                        <p className="text-stone-500">
                          Silakan isi form di atas (wajib CN_NEW & NAMA ALAT) lalu klik tombol <strong>Simpan</strong>.
                        </p>
                      </div>
                    ) : (
                      'Tidak ada data yang cocok dengan pencarian Anda.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* VIEW DETAIL MODAL */}
      {viewingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xl text-amber-400">
                    {viewingUnit.cnNew}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                      viewingUnit.status
                    )}`}
                  >
                    {viewingUnit.status}
                  </span>
                </div>
                <p className="text-xs text-stone-300 font-semibold mt-0.5">
                  {viewingUnit.namaAlat}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingUnit(null)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Detail Spesifikasi Lengkap */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800 font-mono">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">CN_NEW:</span>
                  <strong className="text-amber-400 text-sm">{viewingUnit.cnNew}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">NAMA ALAT:</span>
                  <strong className="text-stone-100">{viewingUnit.namaAlat}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">JENIS:</span>
                  <span className="text-stone-200">{viewingUnit.jenis || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">CLASS:</span>
                  <span className="text-stone-200">{viewingUnit.classUnit || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">LOC (LOKASI):</span>
                  <span className="text-stone-200">{viewingUnit.loc || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">STATUS:</span>
                  <span className="text-stone-200">{viewingUnit.status}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">BRAND / MERK:</span>
                  <span className="text-stone-200">{viewingUnit.brandMerk || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">SN UNIT:</span>
                  <span className="text-stone-200">{viewingUnit.snUnit || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">MODEL UNIT:</span>
                  <span className="text-stone-200">{viewingUnit.modelUnit || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">ENGINE MODEL:</span>
                  <span className="text-stone-200">{viewingUnit.engineModel || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">SN ENGINE:</span>
                  <span className="text-stone-200">{viewingUnit.snEngine || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">MERK ENGINE:</span>
                  <span className="text-stone-200">{viewingUnit.merkEngine || '-'}</span>
                </div>
              </div>

              {viewingUnit.catatan && (
                <div className="p-3 bg-stone-800/60 rounded-xl border border-stone-800 text-stone-300">
                  <span className="text-[10px] text-stone-400 block uppercase font-mono mb-1">Catatan:</span>
                  <p>{viewingUnit.catatan}</p>
                </div>
              )}

              <div className="text-[10px] text-stone-400 font-mono flex justify-between pt-2 border-t border-stone-800">
                <span>Tanggal Registrasi: {viewingUnit.tanggalRegistrasi}</span>
                <span>Terakhir Update: {viewingUnit.terakhirDiperbarui}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-800 bg-stone-900/90">
              <button
                type="button"
                onClick={() => setViewingUnit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const unitToEdit = viewingUnit;
                  setViewingUnit(null);
                  handleEdit(unitToEdit);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Unit Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
