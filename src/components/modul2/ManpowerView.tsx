import React, { useState, useEffect } from 'react';
import { 
  ManpowerData, 
  MANPOWER_JABATAN_OPTIONS, 
  STATUS_KARYAWAN_OPTIONS,
  StatusKaryawan,
  UserAccount 
} from '../../types';
import { 
  Save, 
  Trash2, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Eye, 
  Edit3, 
  Users,
  Phone,
  Calendar,
  Briefcase,
  Search,
  Lock
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface ManpowerViewProps {
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSaveManpower: (
    data: Omit<ManpowerData, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => { success: boolean; message: string; manpower?: ManpowerData };
  onDeleteManpower: (id: string) => { success: boolean; message: string };
}

const EMPTY_FORM = {
  nik: '',
  nama: '',
  jabatan: '',
  noWa: '',
  statusKaryawan: '',
  tglMasukKerja: '',
  keterangan: '',
};

export const ManpowerView: React.FC<ManpowerViewProps> = ({
  manpowerList,
  currentUser,
  onSaveManpower,
  onDeleteManpower,
}) => {
  // Cek otorisasi hak akses user untuk Modul 2
  const canEdit = canUserEdit(currentUser, 2);

  // Form state - Sesuai aturan: tidak semua wajib diisi, fleksibel untuk diupdate sewaktu-waktu
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View modal state
  const [viewingData, setViewingData] = useState<ManpowerData | null>(null);

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
    setEditingId(null);
  };

  // 1. SIMPAN (Save / Add / Update)
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Pengisian data manpower dinonaktifkan.' 
      });
      return;
    }

    // Aturan: Form tidak harus semua diisi (fleksibel). Namun setidaknya ada data yang dimasukkan
    if (
      !formData.nik.trim() &&
      !formData.nama.trim() &&
      !formData.jabatan.trim() &&
      !formData.noWa.trim() &&
      !formData.statusKaryawan.trim() &&
      !formData.tglMasukKerja.trim() &&
      !formData.keterangan.trim()
    ) {
      setFeedback({
        type: 'error',
        message: 'Silakan isi setidaknya salah satu kolom sebelum menyimpan data manpower.',
      });
      return;
    }

    const payload = {
      nik: formData.nik.trim(),
      nama: formData.nama.trim(),
      jabatan: formData.jabatan.trim(),
      noWa: formData.noWa.trim(),
      statusKaryawan: formData.statusKaryawan.trim(),
      tglMasukKerja: formData.tglMasukKerja.trim(),
      keterangan: formData.keterangan.trim(),
    };

    const res = onSaveManpower(payload, editingId);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      handleResetForm();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // 2. VIEW ACTION (Buka modal detail)
  const handleView = (mp: ManpowerData) => {
    setViewingData(mp);
  };

  // 3. EDIT ACTION (Load ke form)
  const handleEdit = (mp: ManpowerData) => {
    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Pengeditan data manpower dinonaktifkan.' 
      });
      return;
    }

    setEditingId(mp.id);
    setFormData({
      nik: mp.nik || '',
      nama: mp.nama || '',
      jabatan: mp.jabatan || '',
      noWa: mp.noWa || '',
      statusKaryawan: mp.statusKaryawan || '',
      tglMasukKerja: mp.tglMasukKerja || '',
      keterangan: mp.keterangan || '',
    });
    setFeedback({
      type: 'info',
      message: `Sedang mengedit data personil [${mp.nama || mp.nik || 'Manpower'}]. Silakan lakukan pembaruan lalu klik "Simpan".`,
    });
    // Smooth scroll to form
    const formEl = document.getElementById('form-data-manpower');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 4. DELETED ACTION
  const handleDelete = (mp: ManpowerData) => {
    if (!canEdit) {
      setFeedback({ 
        type: 'error', 
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Penghapusan data manpower dinonaktifkan.' 
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data personil [${mp.nama || mp.nik || 'Manpower'}]?`
    );
    if (!confirmDelete) return;

    const res = onDeleteManpower(mp.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      if (editingId === mp.id) {
        handleResetForm();
      }
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Format visual tanggal agar mudah dibaca seperti Google Form (e.g. 15 Sep 2024 atau 15/09/2024)
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Filtered list
  const filteredList = manpowerList.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      (m.nik && m.nik.toLowerCase().includes(q)) ||
      (m.nama && m.nama.toLowerCase().includes(q)) ||
      (m.jabatan && m.jabatan.toLowerCase().includes(q)) ||
      (m.noWa && m.noWa.toLowerCase().includes(q)) ||
      (m.statusKaryawan && m.statusKaryawan.toLowerCase().includes(q)) ||
      (m.tglMasukKerja && m.tglMasukKerja.toLowerCase().includes(q)) ||
      (m.keterangan && m.keterangan.toLowerCase().includes(q))
    );
  });

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

      {/* FORM DATA MANPOWER */}
      <section 
        id="form-data-manpower"
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl relative"
      >
        {!canEdit && (
          <div className="mb-4 p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/70 text-sky-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>Mode Akses: Hanya View (Read-Only).</strong> Akun Anda hanya dapat melihat data manpower. Pengisian dan pengeditan data dikunci oleh Developer.
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
                MODUL 2
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>FORM DATA MANPOWER</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Input data tenaga kerja personil workshop & operasional quarry. Kolom formulir bersifat fleksibel (tidak wajib diisi semua) sehingga dapat dilengkapi atau di-update sewaktu-waktu.
            </p>
          </div>

          {editingId && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-300">
              <span>Mode Edit: <strong>{formData.nama || formData.nik || 'Personil'}</strong></span>
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

        {/* Form Inputs Grid: NIK, NAMA, JABATAN, NO WA, STATUS KARYAWAN, TGL. MASUK KERJA, KETERANGAN */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. NIK */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                NIK
              </label>
              <input
                id="field-manpower-nik"
                type="text"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                placeholder="Contoh: BKWA-2024-001 / NIK KTP"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 2. NAMA */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                NAMA
              </label>
              <input
                id="field-manpower-nama"
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Nama Lengkap Personil / Karyawan"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 3. JABATAN (Pilihan Sesuai Aturan User) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                JABATAN
              </label>
              <select
                id="field-manpower-jabatan"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Pilih Jabatan --</option>
                {MANPOWER_JABATAN_OPTIONS.map((jabatan) => (
                  <option key={jabatan} value={jabatan}>
                    {jabatan}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. NO WA (Nomor WhatsApp) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                NO WA
              </label>
              <div className="relative">
                <input
                  id="field-manpower-nowa"
                  type="text"
                  value={formData.noWa}
                  onChange={(e) => setFormData({ ...formData, noWa: e.target.value })}
                  placeholder="Contoh: 0812-3456-7890 / 62812..."
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* 5. STATUS KARYAWAN (TETAP, KONTRAK, HARIAN LEPAS, KEMITRAAN, MAGANG) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                STATUS KARYAWAN
              </label>
              <div className="relative">
                <select
                  id="field-manpower-status"
                  value={formData.statusKaryawan}
                  onChange={(e) => setFormData({ ...formData, statusKaryawan: e.target.value })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Status Karyawan --</option>
                  {STATUS_KARYAWAN_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <Briefcase className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 6. TGL. MASUK KERJA (Date Picker Google Form Style) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300">
                  TGL. MASUK KERJA
                </label>
                {formData.tglMasukKerja && (
                  <span className="text-[10px] text-amber-400 font-mono">
                    {formatDisplayDate(formData.tglMasukKerja)}
                  </span>
                )}
              </div>
              <div 
                className="relative cursor-pointer group"
                onClick={() => {
                  const input = document.getElementById('field-manpower-tgl-masuk') as HTMLInputElement | null;
                  if (input) {
                    try {
                      if (typeof input.showPicker === 'function') {
                        input.showPicker();
                      } else {
                        input.focus();
                      }
                    } catch {
                      input.focus();
                    }
                  }
                }}
              >
                <input
                  id="field-manpower-tgl-masuk"
                  type="date"
                  value={formData.tglMasukKerja}
                  onChange={(e) => setFormData({ ...formData, tglMasukKerja: e.target.value })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer [color-scheme:dark]"
                />
                <Calendar className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 absolute left-3 top-2.5 pointer-events-none transition" />
              </div>
            </div>

            {/* 7. KETERANGAN */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                KETERANGAN
              </label>
              <input
                id="field-manpower-keterangan"
                type="text"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Catatan keahlian, shift kerja, lokasi penugasan, atau informasi penting lainnya..."
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* HANYA TOMBOL "SIMPAN" DI BAWAH MENU FORM INPUT */}
          <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {canEdit ? (
                <button
                  id="btn-manpower-simpan"
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              ) : (
                <button
                  id="btn-manpower-simpan"
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-stone-400 bg-stone-800 border border-stone-700 cursor-not-allowed opacity-80"
                  title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data manpower."
                >
                  <Lock className="w-4 h-4 text-stone-400" />
                  <span>Pengisian Dikunci (Hanya View)</span>
                </button>
              )}

              {/* Reset form jika ada yang sedang diisi/diedit */}
              {canEdit && (editingId || formData.nik || formData.nama || formData.jabatan || formData.noWa || formData.statusKaryawan) && (
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

            {editingId && (
              <span className="text-[11px] text-amber-400 font-mono">
                *Klik Simpan untuk memperbarui data personil ini
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
                DAFTAR DATA MANPOWER
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {manpowerList.length} Personil
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Daftar seluruh personil yang telah diinput. Gunakan kolom Aksi untuk <strong>View</strong>, <strong>Edit</strong>, atau <strong>Deleted</strong>.
            </p>
          </div>

          {/* Fast Search */}
          <div className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari NIK / Nama / WA / Status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Live Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-3">NIK</th>
                <th className="py-3 px-3">NAMA</th>
                <th className="py-3 px-3">JABATAN</th>
                <th className="py-3 px-3">NO WA</th>
                <th className="py-3 px-3">STATUS KARYAWAN</th>
                <th className="py-3 px-3">TGL. MASUK</th>
                <th className="py-3 px-3">KETERANGAN</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-stone-950/90 shadow-l">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredList.length > 0 ? (
                filteredList.map((mp) => {
                  const isBeingEdited = editingId === mp.id;

                  // Styling badge untuk status karyawan
                  const getStatusBadge = (status?: string) => {
                    if (!status) return '-';
                    let colorClass = 'bg-stone-800 border-stone-700 text-stone-200';
                    if (status === 'TETAP') {
                      colorClass = 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300';
                    } else if (status === 'KONTRAK') {
                      colorClass = 'bg-blue-950/50 border-blue-700/60 text-blue-300';
                    } else if (status === 'HARIAN LEPAS') {
                      colorClass = 'bg-amber-950/50 border-amber-700/60 text-amber-300';
                    } else if (status === 'KEMITRAAN') {
                      colorClass = 'bg-purple-950/50 border-purple-700/60 text-purple-300';
                    } else if (status === 'MAGANG') {
                      colorClass = 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300';
                    }
                    return (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${colorClass}`}>
                        {status}
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={mp.id}
                      className={`transition ${
                        isBeingEdited
                          ? 'bg-amber-500/15 border-l-4 border-amber-500'
                          : 'hover:bg-stone-800/40'
                      }`}
                    >
                      {/* NIK */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {mp.nik || '-'}
                      </td>

                      {/* NAMA */}
                      <td className="py-3 px-3 font-bold text-stone-100 whitespace-nowrap">
                        {mp.nama || '-'}
                      </td>

                      {/* JABATAN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {mp.jabatan ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-800 border border-stone-700 text-stone-200">
                            {mp.jabatan}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* NO WA */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {mp.noWa ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Phone className="w-3 h-3 shrink-0" />
                            {mp.noWa}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* STATUS KARYAWAN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(mp.statusKaryawan)}
                      </td>

                      {/* TGL. MASUK KERJA */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {formatDisplayDate(mp.tglMasukKerja)}
                      </td>

                      {/* KETERANGAN */}
                      <td className="py-3 px-3 text-stone-300 max-w-xs truncate">
                        {mp.keterangan || '-'}
                      </td>

                      {/* KOLOM AKSI: VIEW, EDIT, DAN DELETED */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-stone-900/95 shadow-l">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. VIEW */}
                          <button
                            id={`btn-view-mp-${mp.id}`}
                            type="button"
                            onClick={() => handleView(mp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 hover:text-white border border-stone-700 transition"
                            title={`Lihat detail ${mp.nama || mp.nik}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-400" />
                            <span>View</span>
                          </button>

                          {/* 2. EDIT */}
                          <button
                            id={`btn-edit-mp-${mp.id}`}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleEdit(mp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title={canEdit ? `Edit data ${mp.nama || mp.nik}` : 'Akun Anda dalam mode Hanya View (Edit dinonaktifkan)'}
                          >
                            {canEdit ? <Edit3 className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3 h-3 text-stone-500" />}
                            <span>Edit</span>
                          </button>

                          {/* 3. DELETED */}
                          <button
                            id={`btn-delete-mp-${mp.id}`}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleDelete(mp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border-rose-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title={canEdit ? `Hapus data ${mp.nama || mp.nik}` : 'Akun Anda dalam mode Hanya View (Hapus dinonaktifkan)'}
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
                  <td colSpan={8} className="py-12 text-center text-stone-400 text-xs">
                    {manpowerList.length === 0 ? (
                      <div className="space-y-1">
                        <p className="font-bold text-stone-300">Belum ada data manpower yang terdaftar.</p>
                        <p className="text-stone-500">
                          Silakan isi form di atas lalu klik tombol <strong>Simpan</strong> untuk menambahkan data tenaga kerja.
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
      {viewingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
              <div>
                <span className="font-mono font-black text-lg text-amber-400">
                  DETAIL MANPOWER
                </span>
                <p className="text-xs text-stone-300 font-semibold mt-0.5">
                  {viewingData.nama || viewingData.nik || 'Data Personil'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingData(null)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-3 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">NIK:</span>
                  <strong className="text-amber-400 font-mono text-sm">{viewingData.nik || '-'}</strong>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">NAMA:</span>
                  <strong className="text-stone-100 text-sm">{viewingData.nama || '-'}</strong>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">JABATAN:</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-bold text-amber-300 text-xs">
                    {viewingData.jabatan || '-'}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">NO WA:</span>
                  <span className="text-emerald-400 font-mono font-bold">{viewingData.noWa || '-'}</span>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">STATUS KARYAWAN:</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-bold text-stone-200 text-xs">
                    {viewingData.statusKaryawan || '-'}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400 uppercase font-mono text-[10px]">TGL. MASUK KERJA:</span>
                  <span className="text-stone-200 font-mono">{formatDisplayDate(viewingData.tglMasukKerja)}</span>
                </div>

                <div className="pt-1">
                  <span className="text-stone-400 uppercase font-mono text-[10px] block mb-1">KETERANGAN:</span>
                  <p className="text-stone-200 bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 whitespace-pre-wrap">
                    {viewingData.keterangan || 'Tidak ada keterangan tambahan.'}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-stone-400 font-mono flex justify-between pt-1">
                <span>Dibuat: {viewingData.createdAt}</span>
                <span>Terakhir Update: {viewingData.updatedAt}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-800 bg-stone-900/90">
              <button
                type="button"
                onClick={() => setViewingData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const dataToEdit = viewingData;
                  setViewingData(null);
                  handleEdit(dataToEdit);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Data Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
