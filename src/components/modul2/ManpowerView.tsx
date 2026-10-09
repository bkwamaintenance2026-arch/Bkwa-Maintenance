import React, { useState, useEffect, useMemo } from 'react';
import { 
  ManpowerData, 
  MANPOWER_JABATAN_OPTIONS, 
  STATUS_KARYAWAN_OPTIONS,
  StatusKaryawan,
  StatusKerjaKaryawan,
  STATUS_KERJA_OPTIONS,
  MechanicWorkLogRecord,
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
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  ArrowLeft,
  Wrench,
  Clock,
  Clock3,
  FileText,
  Filter,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { 
  canUserEdit, 
  canUserExportModule,
  getAllMechanicWorkLogs,
  registerMechanicWorkLog,
  updateMechanicWorkLog,
  deleteMechanicWorkLog
} from '../../utils/storage';
import { MechanicWorkLogSubView } from './MechanicWorkLogSubView';

interface ManpowerViewProps {
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSaveManpower: (
    data: Omit<ManpowerData, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => { success: boolean; message: string; manpower?: ManpowerData };
  onDeleteManpower: (id: string) => { success: boolean; message: string };
  onBackToMainMenu?: () => void;
}

const EMPTY_FORM = {
  nik: '',
  nama: '',
  jabatan: '',
  noWa: '',
  statusKaryawan: '',
  tglMasukKerja: '',
  keterangan: '',
  statusKerja: 'NORMAL' as StatusKerjaKaryawan,
  catatanKerja: '',
};

export const ManpowerView: React.FC<ManpowerViewProps> = ({
  manpowerList,
  currentUser,
  onSaveManpower,
  onDeleteManpower,
  onBackToMainMenu,
}) => {
  // Cek otorisasi hak akses user untuk Modul 2
  const canEdit = canUserEdit(currentUser, 2);
  const canExport = canUserExportModule(currentUser, 2);

  // Sub-Modul Tab State: Data Karyawan vs Remark Pekerjaan Mekanik
  const [activeSubModule, setActiveSubModule] = useState<'data_karyawan' | 'pekerjaan_mekanik'>('data_karyawan');
  const [mechanicWorkLogs, setMechanicWorkLogs] = useState<MechanicWorkLogRecord[]>(() => getAllMechanicWorkLogs());

  // Quick Note / Attendance Status Modal
  const [quickNoteModalTarget, setQuickNoteModalTarget] = useState<ManpowerData | null>(null);
  const [quickNoteStatus, setQuickNoteStatus] = useState<StatusKerjaKaryawan>('NORMAL');
  const [quickNoteText, setQuickNoteText] = useState('');

  // Sorting state untuk header tabel data manpower
  const [sortField, setSortField] = useState<keyof ManpowerData>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof ManpowerData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Form state - Sesuai aturan: tidak semua wajib diisi, fleksibel untuk diupdate sewaktu-waktu
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View modal state
  const [viewingData, setViewingData] = useState<ManpowerData | null>(null);

  // Status feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Search filter & Status Kerja filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatusKerja, setFilterStatusKerja] = useState<string>('ALL');

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
      !formData.keterangan.trim() &&
      !formData.catatanKerja.trim()
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
      statusKerja: formData.statusKerja || 'NORMAL',
      catatanKerja: formData.catatanKerja.trim(),
      tglCatatan: new Date().toISOString().split('T')[0],
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
      statusKerja: (mp.statusKerja as StatusKerjaKaryawan) || 'NORMAL',
      catatanKerja: mp.catatanKerja || '',
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

  // Quick Attendance Note Handler
  const handleOpenQuickNote = (mp: ManpowerData) => {
    setQuickNoteModalTarget(mp);
    setQuickNoteStatus((mp.statusKerja as StatusKerjaKaryawan) || 'NORMAL');
    setQuickNoteText(mp.catatanKerja || '');
  };

  const handleSaveQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteModalTarget) return;

    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Pengeditan catatan dinonaktifkan.',
      });
      return;
    }

    const payload: Omit<ManpowerData, 'id' | 'createdAt' | 'updatedAt'> = {
      nik: quickNoteModalTarget.nik || '',
      nama: quickNoteModalTarget.nama || '',
      jabatan: quickNoteModalTarget.jabatan || '',
      noWa: quickNoteModalTarget.noWa || '',
      statusKaryawan: quickNoteModalTarget.statusKaryawan || '',
      tglMasukKerja: quickNoteModalTarget.tglMasukKerja || '',
      keterangan: quickNoteModalTarget.keterangan || '',
      statusKerja: quickNoteStatus,
      catatanKerja: quickNoteText.trim(),
      tglCatatan: new Date().toISOString().split('T')[0],
    };

    const res = onSaveManpower(payload, quickNoteModalTarget.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Catatan kerja personil [${quickNoteModalTarget.nama || quickNoteModalTarget.nik}] berhasil disimpan!`,
      });
      setQuickNoteModalTarget(null);
      setQuickNoteText('');
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Sub-Modul 2 Handlers: Remark Pekerjaan Mekanik
  const handleSaveWorkLog = (
    data: Omit<MechanicWorkLogRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    let res;
    if (idToEdit) {
      res = updateMechanicWorkLog(idToEdit, data);
    } else {
      res = registerMechanicWorkLog(data);
    }
    if (res.success) {
      setMechanicWorkLogs(getAllMechanicWorkLogs());
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    return res;
  };

  const handleDeleteWorkLog = (id: string) => {
    const res = deleteMechanicWorkLog(id);
    if (res.success) {
      setMechanicWorkLogs(getAllMechanicWorkLogs());
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    return res;
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

  // Helper badge warna untuk Status Kerja (Hadir, Tukar Shift, Dinas Luar, Cuti, Izin, Sakit, Standby)
  const getStatusKerjaBadge = (status?: string) => {
    const key = (status || 'NORMAL') as StatusKerjaKaryawan;
    const opt = STATUS_KERJA_OPTIONS.find((o) => o.value === key) || STATUS_KERJA_OPTIONS[0];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${opt.color}`}>
        {opt.label}
      </span>
    );
  };

  // Export CSV handler for authorized users (Akun Khusus & Developer)
  const handleExportCSV = () => {
    if (sortedList.length === 0) {
      alert('Tidak ada data manpower untuk di-export.');
      return;
    }
    const headers = [
      'NIK',
      'NAMA LENGKAP',
      'JABATAN',
      'NO WHATSAPP',
      'STATUS KARYAWAN',
      'STATUS PRESENSI / KERJA',
      'CATATAN STATUS KERJA',
      'TGL MASUK KERJA',
      'KETERANGAN'
    ];
    const rows = sortedList.map((m) => [
      `"${m.nik || ''}"`,
      `"${(m.nama || '').replace(/"/g, '""')}"`,
      `"${(m.jabatan || '').replace(/"/g, '""')}"`,
      `"${m.noWa || ''}"`,
      `"${m.statusKaryawan || ''}"`,
      `"${m.statusKerja || 'NORMAL'}"`,
      `"${(m.catatanKerja || '').replace(/"/g, '""')}"`,
      `"${m.tglMasukKerja || ''}"`,
      `"${(m.keterangan || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + 
      `"PT BATU KALI WELANG AMPUH - DATA MANPOWER & PERSONIL WORKSHOP"\r\n` +
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Personil: ${sortedList.length} Orang"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Manpower_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Ringkasan Status Presensi & Kerja
  const manpowerStats = useMemo(() => {
    const total = manpowerList.length;
    const normal = manpowerList.filter((m) => !m.statusKerja || m.statusKerja === 'NORMAL').length;
    const tukarShift = manpowerList.filter((m) => m.statusKerja === 'TUKAR_SHIFT').length;
    const dinasLuar = manpowerList.filter((m) => m.statusKerja === 'DINAS_LUAR').length;
    const cutiIzinSakit = manpowerList.filter((m) => ['CUTI', 'IZIN', 'SAKIT'].includes(m.statusKerja as string)).length;
    const standby = manpowerList.filter((m) => m.statusKerja === 'STANDBY').length;
    return { total, normal, tukarShift, dinasLuar, cutiIzinSakit, standby };
  }, [manpowerList]);

  // Filtered & Sorted list
  const sortedList = useMemo(() => {
    const filtered = manpowerList.filter((m) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (m.nik && m.nik.toLowerCase().includes(q)) ||
        (m.nama && m.nama.toLowerCase().includes(q)) ||
        (m.jabatan && m.jabatan.toLowerCase().includes(q)) ||
        (m.noWa && m.noWa.toLowerCase().includes(q)) ||
        (m.statusKaryawan && m.statusKaryawan.toLowerCase().includes(q)) ||
        (m.tglMasukKerja && m.tglMasukKerja.toLowerCase().includes(q)) ||
        (m.keterangan && m.keterangan.toLowerCase().includes(q)) ||
        (m.catatanKerja && m.catatanKerja.toLowerCase().includes(q)) ||
        (m.statusKerja && m.statusKerja.toLowerCase().includes(q));

      const curStatus = m.statusKerja || 'NORMAL';
      const matchStatus = filterStatusKerja === 'ALL' || curStatus === filterStatusKerja;

      return matchSearch && matchStatus;
    });

    return [...filtered].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [manpowerList, searchTerm, filterStatusKerja, sortField, sortOrder]);

  const renderSortHeader = (label: string, field: keyof ManpowerData) => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="py-3 px-3 cursor-pointer hover:bg-stone-900 transition select-none group text-left"
        title={`Klik untuk mengurutkan (Sort by ${label})`}
      >
        <div className="flex items-center gap-1.5 justify-start">
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-amber-400" />
            ) : (
              <ArrowDown className="w-3 h-3 text-amber-400" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-stone-600 group-hover:text-stone-400 transition" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Back to Menu Button */}
      {onBackToMainMenu && (
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-menu-modul2"
            type="button"
            onClick={onBackToMainMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Kembali ke Menu Utama</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500">
            Modul 2: Database Data Manpower & Personil
          </span>
        </div>
      )}

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

      {/* SUB-MODUL NAVIGATOR TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-2.5 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubModule('data_karyawan')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition shadow-sm ${
              activeSubModule === 'data_karyawan'
                ? 'bg-amber-500 text-stone-950 shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Data Karyawan & Presensi</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
              activeSubModule === 'data_karyawan' ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-stone-900 text-amber-400'
            }`}>
              {manpowerList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubModule('pekerjaan_mekanik')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition shadow-sm ${
              activeSubModule === 'pekerjaan_mekanik'
                ? 'bg-amber-500 text-stone-950 shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>2. Remark Pekerjaan Mekanik</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
              activeSubModule === 'pekerjaan_mekanik' ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-stone-900 text-amber-400'
            }`}>
              {mechanicWorkLogs.length} Log
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-stone-400 hidden sm:block">
          {activeSubModule === 'data_karyawan'
            ? 'Kelola personil, tukar jam kerja, dinas luar, cuti & sakit'
            : 'Monitoring pekerjaan non-unit, workshop & sarana mekanik/magang'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODUL 2: REMARK PEKERJAAN MEKANIK & ANAK MAGANG */}
      {/* ========================================================================= */}
      {activeSubModule === 'pekerjaan_mekanik' ? (
        <MechanicWorkLogSubView
          workLogs={mechanicWorkLogs}
          manpowerList={manpowerList}
          currentUser={currentUser}
          onSaveWorkLog={handleSaveWorkLog}
          onDeleteWorkLog={handleDeleteWorkLog}
        />
      ) : (
        /* ======================================================================= */
        /* SUB-MODUL 1: DATA KARYAWAN & PRESENSI KERJA */
        /* ======================================================================= */
        <>
          {/* KPI SUMMARY BAR PRESENSI & STATUS KERJA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block mb-1">
                TOTAL PERSONIL
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-stone-100">{manpowerStats.total}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                HADIR NORMAL
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-emerald-400">{manpowerStats.normal}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
                TUKAR SHIFT
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-amber-400">{manpowerStats.tukarShift}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
                DINAS LUAR
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-blue-400">{manpowerStats.dinasLuar}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block mb-1">
                CUTI / IZIN / SAKIT
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-purple-400">{manpowerStats.cutiIzinSakit}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>

            <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block mb-1">
                STANDBY
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-stone-300">{manpowerStats.standby}</span>
                <span className="text-xs font-mono text-stone-500">Orang</span>
              </div>
            </div>
          </div>

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
                    <span>FORM DATA MANPOWER &amp; PRESENSI</span>
                  </h2>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Input data tenaga kerja workshop &amp; operasional quarry beserta status presensi harian (tukar jam kerja, dinas luar, cuti, izin, sakit). Kolom formulir bersifat fleksibel dapat dilengkapi sewaktu-waktu.
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

            {/* Form Inputs Grid */}
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

                {/* 3. JABATAN */}
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

                {/* 4. NO WA */}
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

                {/* 5. STATUS KARYAWAN */}
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

                {/* 6. TGL. MASUK KERJA */}
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

                {/* 7. STATUS KERJA / PRESENSI */}
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                    STATUS KERJA / PRESENSI
                  </label>
                  <select
                    id="field-manpower-status-kerja"
                    value={formData.statusKerja}
                    onChange={(e) => setFormData({ ...formData, statusKerja: e.target.value as StatusKerjaKaryawan })}
                    className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STATUS_KERJA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 8. CATATAN STATUS KERJA */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                    CATATAN STATUS KERJA (TUKAR SHIFT / DINAS / CUTI / SAKIT)
                  </label>
                  <input
                    id="field-manpower-catatan-kerja"
                    type="text"
                    value={formData.catatanKerja}
                    onChange={(e) => setFormData({ ...formData, catatanKerja: e.target.value })}
                    placeholder="Contoh: Tukar shift malam dgn Budi, dinas luar belanja part, cuti tahunan, sakit surat dokter..."
                    className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 9. KETERANGAN TAMBAHAN */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                    KETERANGAN TAMBAHAN
                  </label>
                  <input
                    id="field-manpower-keterangan"
                    type="text"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Catatan keahlian, shift kerja tetap, lokasi penugasan, atau informasi penting lainnya..."
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
                  {canEdit && (editingId || formData.nik || formData.nama || formData.jabatan || formData.noWa || formData.statusKaryawan || formData.catatanKerja) && (
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
            <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-900">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide">
                    DAFTAR DATA MANPOWER &amp; PRESENSI
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {manpowerList.length} Personil
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Daftar seluruh personil yang telah diinput. Kolom <strong>Status &amp; Catatan</strong> menampilkan catatan tukar shift, dinas luar, cuti, izin, atau sakit.
                </p>
              </div>

              {/* Fast Search, Status Filter & Export */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Status Kerja */}
                <select
                  value={filterStatusKerja}
                  onChange={(e) => setFilterStatusKerja(e.target.value)}
                  className="bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">Semua Status Presensi</option>
                  {STATUS_KERJA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {canExport && (
                  <button
                    id="btn-export-modul2-csv"
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md whitespace-nowrap"
                    title="Export data personil manpower ke format CSV / Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                )}

                <div className="w-full sm:w-60">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari NIK / Nama / WA / Catatan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
                  <tr>
                    {renderSortHeader('NIK', 'nik')}
                    {renderSortHeader('NAMA', 'nama')}
                    {renderSortHeader('JABATAN', 'jabatan')}
                    {renderSortHeader('NO WA', 'noWa')}
                    {renderSortHeader('STATUS KARYAWAN', 'statusKaryawan')}
                    {renderSortHeader('STATUS & CATATAN KERJA', 'statusKerja')}
                    {renderSortHeader('TGL. MASUK', 'tglMasukKerja')}
                    {renderSortHeader('KETERANGAN', 'keterangan')}
                    <th className="py-3 px-3 text-center sticky right-0 bg-stone-950/90 shadow-l">
                      AKSI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {sortedList.length > 0 ? (
                    sortedList.map((mp) => {
                      const isBeingEdited = editingId === mp.id;

                      // Styling badge untuk status karyawan
                      const getStatusBadge = (status?: string) => {
                        if (!status) return '-';
                        let colorClass = 'bg-stone-800 border-stone-700 text-stone-200';
                        if (status === 'Etika 05 Sby' || status.includes('Etika 05')) {
                          colorClass = 'bg-amber-950/70 border-amber-500/70 text-amber-300 shadow-sm';
                        } else if (status === 'TETAP') {
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

                          {/* STATUS & CATATAN KERJA */}
                          <td className="py-3 px-3 min-w-[200px]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                {getStatusKerjaBadge(mp.statusKerja)}
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickNote(mp)}
                                  className="text-stone-500 hover:text-amber-400 p-0.5 rounded transition"
                                  title="Ubah Cepat Status & Catatan Kerja"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                              {mp.catatanKerja ? (
                                <p className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-900/40 rounded px-2 py-1 max-w-xs whitespace-pre-wrap" title={mp.catatanKerja}>
                                  {mp.catatanKerja}
                                </p>
                              ) : (
                                <span className="text-[10px] text-stone-600 italic block">Tidak ada catatan</span>
                              )}
                            </div>
                          </td>

                          {/* TGL. MASUK KERJA */}
                          <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                            {formatDisplayDate(mp.tglMasukKerja)}
                          </td>

                          {/* KETERANGAN */}
                          <td className="py-3 px-3 text-stone-300 max-w-xs truncate">
                            {mp.keterangan || '-'}
                          </td>

                          {/* KOLOM AKSI: VIEW, EDIT, CATAT, DAN DELETED */}
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

                              {/* 2. CATAT STATUS CEPAT */}
                              <button
                                type="button"
                                onClick={() => handleOpenQuickNote(mp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 transition"
                                title={`Catat cepat tukar shift, dinas luar, cuti, izin, sakit [${mp.nama || mp.nik}]`}
                              >
                                <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                                <span>Catat</span>
                              </button>

                              {/* 3. EDIT */}
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

                              {/* 4. DELETED */}
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
                      <td colSpan={9} className="py-12 text-center text-stone-400 text-xs">
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

          {/* QUICK NOTE MODAL (Tukar Shift, Dinas Luar, Cuti, Izin, Sakit) */}
          {quickNoteModalTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-amber-400 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-400" />
                      <span>CATAT STATUS &amp; PRESENSI KERJA</span>
                    </h3>
                    <p className="text-xs text-stone-300 font-semibold mt-0.5">
                      {quickNoteModalTarget.nama || quickNoteModalTarget.nik} — {quickNoteModalTarget.jabatan || 'Personil'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickNoteModalTarget(null)}
                    className="text-stone-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveQuickNote} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-stone-400 mb-1">
                      Status Presensi / Kehadiran:
                    </label>
                    <select
                      value={quickNoteStatus}
                      onChange={(e) => setQuickNoteStatus(e.target.value as StatusKerjaKaryawan)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {STATUS_KERJA_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-400 mb-1">
                      Catatan Khusus (Tukar Shift / Dinas Luar / Cuti / Izin / Sakit):
                    </label>
                    <textarea
                      rows={3}
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Contoh: Tukar shift malam dengan Budi; Dinas luar beli sparepart ke bengkel bubut; Cuti 2 hari; Sakit surat dokter terlampir..."
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setQuickNoteModalTarget(null)}
                      className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs hover:bg-stone-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs font-mono hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
                    >
                      Simpan Catatan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                      <span className="text-stone-400 uppercase font-mono text-[10px]">STATUS PRESENSI &amp; KERJA:</span>
                      <span>{getStatusKerjaBadge(viewingData.statusKerja)}</span>
                    </div>

                    {viewingData.catatanKerja && (
                      <div className="flex justify-between border-b border-stone-800 pb-2">
                        <span className="text-stone-400 uppercase font-mono text-[10px]">CATATAN KHUSUS:</span>
                        <span className="text-amber-200 font-medium text-right max-w-[240px] whitespace-pre-wrap">{viewingData.catatanKerja}</span>
                      </div>
                    )}

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
        </>
      )}
    </div>
  );
};
