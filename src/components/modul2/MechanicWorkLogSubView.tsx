import React, { useState, useMemo } from 'react';
import { 
  MechanicWorkLogRecord, 
  MechanicJobCategory, 
  MECHANIC_JOB_CATEGORIES, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock3, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  Check, 
  Lock,
  Building,
  Zap,
  Truck,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { canUserEdit, canUserExportModule } from '../../utils/storage';

interface MechanicWorkLogSubViewProps {
  workLogs: MechanicWorkLogRecord[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSaveWorkLog: (
    data: Omit<MechanicWorkLogRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: MechanicWorkLogRecord };
  onDeleteWorkLog: (id: string) => { success: boolean; message: string };
}

const EMPTY_LOG_FORM = {
  tanggal: new Date().toISOString().split('T')[0],
  jamMulai: '08:00',
  jamSelesai: '17:00',
  manpowerId: '',
  namaMekanik: '',
  jabatan: 'MEKANIK',
  kategoriPekerjaan: 'NON_UNIT' as MechanicJobCategory,
  lokasiPekerjaan: 'Workshop Quarry',
  uraianPekerjaan: '',
  statusPekerjaan: 'DALAM_PROSES' as 'DALAM_PROSES' | 'SELESAI' | 'TERTUNDA',
  supervisorPic: '',
  catatanTambahan: '',
};

export const MechanicWorkLogSubView: React.FC<MechanicWorkLogSubViewProps> = ({
  workLogs,
  manpowerList,
  currentUser,
  onSaveWorkLog,
  onDeleteWorkLog,
}) => {
  const canEdit = canUserEdit(currentUser, 2);
  const canExport = canUserExportModule(currentUser, 2);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MechanicWorkLogRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState(EMPTY_LOG_FORM);

  // Daftar nama karyawan khusus jabatan Mekanik, Helper Mekanik, PKL, Magang
  // Ditempatkan di urutan teratas, diikuti seluruh personil manpower lainnya
  const mechanicCandidates = useMemo(() => {
    const isMechanicOrIntern = (j: string) => {
      const s = (j || '').toUpperCase();
      return (
        s.includes('MEKANIK') ||
        s.includes('HELPER') ||
        s.includes('PKL') ||
        s.includes('MAGANG') ||
        s.includes('WORKSHOP')
      );
    };

    const primary = manpowerList.filter((m) => isMechanicOrIntern(m.jabatan || ''));
    const secondary = manpowerList.filter((m) => !isMechanicOrIntern(m.jabatan || ''));

    return {
      mechanics: primary.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id')),
      others: secondary.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id')),
      all: [...primary, ...secondary],
    };
  }, [manpowerList]);

  // Metrics KPI
  const metrics = useMemo(() => {
    const totalLogs = workLogs.length;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = workLogs.filter((w) => w.tanggal === today).length;
    const nonUnitLogs = workLogs.filter((w) => w.kategoriPekerjaan === 'NON_UNIT').length;
    const selesaiLogs = workLogs.filter((w) => w.statusPekerjaan === 'SELESAI').length;
    const prosesLogs = workLogs.filter((w) => w.statusPekerjaan === 'DALAM_PROSES').length;

    return {
      totalMekanik: mechanicCandidates.mechanics.length,
      totalLogs,
      todayLogs,
      nonUnitLogs,
      selesaiLogs,
      prosesLogs,
    };
  }, [workLogs, mechanicCandidates]);

  // Filtered List
  const filteredList = useMemo(() => {
    return workLogs.filter((log) => {
      const matchSearch =
        (log.namaMekanik || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.uraianPekerjaan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.lokasiPekerjaan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.supervisorPic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.jabatan || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'ALL' || log.kategoriPekerjaan === filterCategory;
      const matchStatus = filterStatus === 'ALL' || log.statusPekerjaan === filterStatus;
      const matchDate = !filterDate || log.tanggal === filterDate;

      return matchSearch && matchCategory && matchStatus && matchDate;
    });
  }, [workLogs, searchTerm, filterCategory, filterStatus, filterDate]);

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null);
    const defaultMekanik = mechanicCandidates.mechanics[0] || manpowerList[0];
    setFormData({
      ...EMPTY_LOG_FORM,
      tanggal: new Date().toISOString().split('T')[0],
      manpowerId: defaultMekanik?.id || '',
      namaMekanik: defaultMekanik?.nama || '',
      jabatan: defaultMekanik?.jabatan || 'MEKANIK',
      supervisorPic: currentUser.fullName || currentUser.username || 'Kabag Workshop',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (record: MechanicWorkLogRecord) => {
    if (!canEdit) return;
    setEditingId(record.id);
    setFormData({
      tanggal: record.tanggal || '',
      jamMulai: record.jamMulai || '08:00',
      jamSelesai: record.jamSelesai || '17:00',
      manpowerId: record.manpowerId || '',
      namaMekanik: record.namaMekanik || '',
      jabatan: record.jabatan || 'MEKANIK',
      kategoriPekerjaan: record.kategoriPekerjaan || 'NON_UNIT',
      lokasiPekerjaan: record.lokasiPekerjaan || '',
      uraianPekerjaan: record.uraianPekerjaan || '',
      statusPekerjaan: record.statusPekerjaan || 'DALAM_PROSES',
      supervisorPic: record.supervisorPic || '',
      catatanTambahan: record.catatanTambahan || '',
    });
    setShowModal(true);
  };

  const handleMekanikSelect = (nama: string) => {
    const selected = manpowerList.find((m) => m.nama === nama);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        namaMekanik: selected.nama,
        manpowerId: selected.id,
        jabatan: selected.jabatan || 'MEKANIK',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        namaMekanik: nama,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!formData.namaMekanik.trim() || !formData.uraianPekerjaan.trim()) {
      setFeedback({
        type: 'error',
        message: 'Mohon isi nama personil mekanik/magang dan uraian pekerjaan yang dilakukan!',
      });
      return;
    }

    const payload: Omit<MechanicWorkLogRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      tanggal: formData.tanggal,
      jamMulai: formData.jamMulai,
      jamSelesai: formData.jamSelesai,
      manpowerId: formData.manpowerId,
      namaMekanik: formData.namaMekanik.trim(),
      jabatan: formData.jabatan.trim() || 'MEKANIK',
      kategoriPekerjaan: formData.kategoriPekerjaan,
      lokasiPekerjaan: formData.lokasiPekerjaan.trim() || 'Workshop',
      uraianPekerjaan: formData.uraianPekerjaan.trim(),
      statusPekerjaan: formData.statusPekerjaan,
      supervisorPic: formData.supervisorPic.trim() || 'Kabag Workshop',
      catatanTambahan: formData.catatanTambahan.trim(),
    };

    const res = onSaveWorkLog(payload, editingId || undefined);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setShowModal(false);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDelete = (id: string) => {
    const res = onDeleteWorkLog(id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setDeleteConfirmId(null);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data pekerjaan mekanik untuk di-export.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Jam Mulai',
      'Jam Selesai',
      'Nama Mekanik / Magang',
      'Jabatan',
      'Kategori Pekerjaan',
      'Lokasi Pekerjaan',
      'Uraian Remark Pekerjaan',
      'Status Pekerjaan',
      'Supervisor / PIC',
      'Catatan Tambahan',
    ];

    const rows = filteredList.map((log, idx) => [
      idx + 1,
      `"${log.tanggal || ''}"`,
      `"${log.jamMulai || ''}"`,
      `"${log.jamSelesai || ''}"`,
      `"${log.namaMekanik || ''}"`,
      `"${log.jabatan || ''}"`,
      `"${log.kategoriPekerjaan || ''}"`,
      `"${(log.lokasiPekerjaan || '').replace(/"/g, '""')}"`,
      `"${(log.uraianPekerjaan || '').replace(/"/g, '""')}"`,
      `"${log.statusPekerjaan || ''}"`,
      `"${(log.supervisorPic || '').replace(/"/g, '""')}"`,
      `"${(log.catatanTambahan || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      `"PT BATU KALI WELANG AMPUH - LAPORAN AKTIVITAS & REMARK PEKERJAAN MEKANIK"\r\n` +
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredList.length}"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Remark_Pekerjaan_Mekanik_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (cat: MechanicJobCategory) => {
    const found = MECHANIC_JOB_CATEGORIES.find((c) => c.value === cat);
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
          found?.badgeColor || 'bg-stone-800 text-stone-300 border-stone-700'
        }`}
      >
        {found?.label || cat}
      </span>
    );
  };

  const getStatusBadge = (status: 'DALAM_PROSES' | 'SELESAI' | 'TERTUNDA') => {
    if (status === 'SELESAI') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>SELESAI</span>
        </span>
      );
    }
    if (status === 'DALAM_PROSES') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
          <Clock3 className="w-3 h-3 text-amber-400 animate-spin" />
          <span>PROSES</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        <span>TERTUNDA</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                SUB-MODUL WORKSHOP &amp; MEKANIK
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Monitoring Aktivitas &amp; Remark Non-Unit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide flex items-center gap-2.5">
              <Wrench className="w-6 h-6 text-blue-400" />
              <span>REMARK &amp; PEKERJAAN JABATAN MEKANIK</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Pencatatan aktivitas harian tim mekanik, helper, dan anak magang (PKL) untuk pekerjaan non-unit (genset, pompa tambang, crusher plant, fabrikasi, sarana quarry, dll.) serta pemeliharaan sarana penunjang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 text-xs font-mono font-bold transition shadow-md"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            )}

            {canEdit ? (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-stone-950 text-xs font-mono font-black uppercase tracking-wider transition shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Pekerjaan Mekanik</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800/60 text-stone-500 text-xs font-mono border border-stone-800 cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>Input Dibatasi</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Cards Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Tim Mekanik</span>
            <div className="text-lg font-mono font-bold text-stone-100 mt-0.5">
              {metrics.totalMekanik} <span className="text-xs text-stone-500 font-normal">Personil</span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono mt-1 block truncate">
              Mekanik, Helper &amp; Magang
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-amber-400 block">Pekerjaan Non-Unit</span>
            <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">
              {metrics.nonUnitLogs} <span className="text-xs text-stone-500 font-normal">Tugas</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
              Genset, Crusher &amp; Pompa
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-blue-400 block">Sedang Dikerjakan</span>
            <div className="text-lg font-mono font-bold text-blue-300 mt-0.5">
              {metrics.prosesLogs} <span className="text-xs text-stone-500 font-normal">Aktif</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
              Status Dalam Proses
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-emerald-400 block">Tugas Selesai</span>
            <div className="text-lg font-mono font-bold text-emerald-300 mt-0.5">
              {metrics.selesaiLogs} <span className="text-xs text-stone-500 font-normal">Selesai</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
              Dari {metrics.totalLogs} catatan kerja
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded text-stone-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar & Search */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Cari nama mekanik, uraian remark pekerjaan, lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
            >
              <option value="ALL">Semua Kategori Pekerjaan</option>
              {MECHANIC_JOB_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
            >
              <option value="ALL">Semua Status</option>
              <option value="DALAM_PROSES">Dalam Proses</option>
              <option value="SELESAI">Selesai</option>
              <option value="TERTUNDA">Tertunda</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
              title="Filter Tanggal Spesifik"
            />

            {(searchTerm || filterCategory !== 'ALL' || filterStatus !== 'ALL' || filterDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('ALL');
                  setFilterStatus('ALL');
                  setFilterDate('');
                }}
                className="px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono transition"
                title="Reset Semua Filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono text-stone-500 flex items-center justify-between pt-1 border-t border-stone-800/60">
          <span>
            Menampilkan {filteredList.length} dari {workLogs.length} catatan aktivitas mekanik
          </span>
          <span className="text-blue-400">
            * Kategori Non-Unit mencakup sarana quarry, genset, dan fasilitas luar unit
          </span>
        </div>
      </div>

      {/* Table Daftar Pekerjaan Mekanik */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-stone-950/80 text-stone-400 border-b border-stone-800 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">Tanggal &amp; Jam</th>
                <th className="py-3 px-3.5">Personil Mekanik</th>
                <th className="py-3 px-3.5">Kategori Pekerjaan</th>
                <th className="py-3 px-3.5">Lokasi</th>
                <th className="py-3 px-3.5 min-w-[240px]">Remark Uraian Pekerjaan</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Supervisor PIC</th>
                <th className="py-3 px-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredList.map((log, index) => (
                <tr key={log.id} className="hover:bg-stone-850/60 transition group">
                  <td className="py-3 px-3.5 text-center text-stone-500 font-bold">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="text-stone-200 font-bold">{log.tanggal}</div>
                    <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{log.jamMulai || '-'} s/d {log.jamSelesai || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="text-stone-100 font-bold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>{log.namaMekanik}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                      [{log.jabatan || 'MEKANIK'}]
                    </span>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {getCategoryBadge(log.kategoriPekerjaan)}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap text-stone-300">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                      <span>{log.lokasiPekerjaan || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-stone-300">
                    <p className="line-clamp-2 text-xs font-sans text-stone-200 leading-relaxed">
                      {log.uraianPekerjaan}
                    </p>
                    {log.catatanTambahan && (
                      <span className="text-[10px] text-stone-500 italic block mt-0.5 font-sans truncate">
                        Catatan: {log.catatanTambahan}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {getStatusBadge(log.statusPekerjaan)}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap text-stone-400 text-[11px]">
                    {log.supervisorPic || '-'}
                  </td>
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingRecord(log)}
                        className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700 transition"
                        title="Lihat Detail Pekerjaan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 rounded-lg bg-stone-800 text-blue-400 hover:text-blue-300 hover:bg-stone-700 transition"
                            title="Edit Pekerjaan Mekanik"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(log.id)}
                            className="p-1.5 rounded-lg bg-stone-800 text-rose-400 hover:text-rose-300 hover:bg-stone-700 transition"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500">
                    <Wrench className="w-8 h-8 mx-auto text-stone-600 mb-2 opacity-50" />
                    <p className="font-semibold text-stone-400">Belum ada catatan pekerjaan mekanik</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Klik tombol &ldquo;+ Catat Pekerjaan Mekanik&rdquo; di atas untuk menambahkan tugas harian tim mekanik dan magang.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT PEKERJAAN MEKANIK */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-stone-100 uppercase">
                    {editingId ? 'Edit Remark Pekerjaan Mekanik' : 'Input Remark Pekerjaan Mekanik / Magang'}
                  </h3>
                  <span className="text-[11px] text-stone-400 font-mono">
                    Monitoring Tugas Non-Unit &amp; Maintenance Fasilitas Quarry
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {/* Tanggal & Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Tanggal Pekerjaan <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.jamMulai}
                    onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.jamSelesai}
                    onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Nama Personil Mekanik / Magang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Personil Mekanik / Magang <span className="text-blue-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.namaMekanik}
                    onChange={(e) => handleMekanikSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono text-xs"
                  >
                    <option value="">-- Pilih Mekanik / Anak Magang --</option>
                    <optgroup label="⭐ Tim Mekanik, Helper & Magang">
                      {mechanicCandidates.mechanics.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} — [{m.jabatan || 'MEKANIK'}]
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Personil Lainnya">
                      {mechanicCandidates.others.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} — [{m.jabatan || 'Karyawan'}]
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jabatan Tertera
                  </label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                    placeholder="MEKANIK / HELPER / PKL / MAGANG"
                  />
                </div>
              </div>

              {/* Kategori Pekerjaan & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Kategori Pekerjaan <span className="text-blue-400">*</span>
                  </label>
                  <select
                    value={formData.kategoriPekerjaan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategoriPekerjaan: e.target.value as MechanicJobCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono text-xs"
                  >
                    {MECHANIC_JOB_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Lokasi Pekerjaan <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lokasiPekerjaan}
                    onChange={(e) => setFormData({ ...formData, lokasiPekerjaan: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                    placeholder="Contoh: Workshop, Crusher Plant, Rumah Genset, Pit Tambang"
                  />
                </div>
              </div>

              {/* Uraian Pekerjaan / Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Uraian / Remark Pekerjaan Yang Dilakukan <span className="text-blue-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.uraianPekerjaan}
                  onChange={(e) => setFormData({ ...formData, uraianPekerjaan: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-sans text-xs"
                  placeholder="Jelaskan detail apa yang dikerjakan mekanik/magang. Contoh: Memperbaiki jalur starter genset 150 kVA crusher, mengganti bearing pompa air sedot pit tambang, mengelas dudukan hopper..."
                />
              </div>

              {/* Status Pekerjaan & Supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Status Pekerjaan
                  </label>
                  <select
                    value={formData.statusPekerjaan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statusPekerjaan: e.target.value as 'DALAM_PROSES' | 'SELESAI' | 'TERTUNDA',
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono text-xs"
                  >
                    <option value="DALAM_PROSES">DALAM PROSES (Sedang Dikerjakan)</option>
                    <option value="SELESAI">SELESAI (Tuntas)</option>
                    <option value="TERTUNDA">TERTUNDA (Menunggu Part / Jadwal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Supervisor / PIC Workshop
                  </label>
                  <input
                    type="text"
                    value={formData.supervisorPic}
                    onChange={(e) => setFormData({ ...formData, supervisorPic: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                    placeholder="Contoh: Bpk. Slamet / Kabag Workshop"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.catatanTambahan}
                  onChange={(e) => setFormData({ ...formData, catatanTambahan: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-sans"
                  placeholder="Keterangan tambahan, kendala, atau kebutuhan tindak lanjut..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-stone-950 text-xs font-mono font-bold transition shadow-lg shadow-blue-500/20"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Remark Pekerjaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW DETAIL PEKERJAAN */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-stone-100 uppercase">Detail Pekerjaan Mekanik</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Nama Personil:</span>
                  <span className="text-stone-100 font-bold">{viewingRecord.namaMekanik}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Jabatan:</span>
                  <span className="text-blue-400">{viewingRecord.jabatan || 'MEKANIK'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tanggal &amp; Jam:</span>
                  <span className="text-stone-300">
                    {viewingRecord.tanggal} ({viewingRecord.jamMulai || '-'} s/d {viewingRecord.jamSelesai || '-'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Kategori:</span>
                  <div>{getCategoryBadge(viewingRecord.kategoriPekerjaan)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Lokasi:</span>
                  <span className="text-stone-200">{viewingRecord.lokasiPekerjaan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status Tugas:</span>
                  <div>{getStatusBadge(viewingRecord.statusPekerjaan)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Supervisor PIC:</span>
                  <span className="text-stone-300">{viewingRecord.supervisorPic || '-'}</span>
                </div>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">Uraian / Remark Pekerjaan:</span>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 font-sans text-xs leading-relaxed">
                  {viewingRecord.uraianPekerjaan}
                </div>
              </div>

              {viewingRecord.catatanTambahan && (
                <div>
                  <span className="text-stone-400 font-bold block mb-1">Catatan Tambahan:</span>
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 font-sans text-xs">
                    {viewingRecord.catatanTambahan}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-stone-100">Konfirmasi Hapus</h3>
            </div>
            <p className="text-stone-300">
              Apakah Anda yakin ingin menghapus catatan pekerjaan mekanik ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
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
