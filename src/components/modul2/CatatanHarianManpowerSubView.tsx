import React, { useState, useMemo } from 'react';
import { 
  ManpowerData, 
  MANPOWER_JABATAN_OPTIONS, 
  CatatanHarianManpowerRecord, 
  KeteranganCatatanManpower,
  KETERANGAN_CATATAN_MANPOWER_OPTIONS,
  UserAccount 
} from '../../types';
import { 
  Calendar, 
  Clock, 
  Save, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Briefcase, 
  Sun, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  FileText,
  UserCheck
} from 'lucide-react';
import { canUserEdit, canUserExportModule } from '../../utils/storage';

interface CatatanHarianManpowerSubViewProps {
  logs: CatatanHarianManpowerRecord[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSaveLog: (
    data: Omit<CatatanHarianManpowerRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: CatatanHarianManpowerRecord };
  onDeleteLog: (id: string) => { success: boolean; message: string };
}

export const CatatanHarianManpowerSubView: React.FC<CatatanHarianManpowerSubViewProps> = ({
  logs,
  manpowerList,
  currentUser,
  onSaveLog,
  onDeleteLog,
}) => {
  const canEdit = canUserEdit(currentUser, 2);
  const canExport = canUserExportModule(currentUser, 2);

  // Tanggal Catatan aktif (Default: Hari ini YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterAllDates, setFilterAllDates] = useState<boolean>(false);

  // Search & Filter state di tabel
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterKeterangan, setFilterKeterangan] = useState<string>('ALL');
  const [filterJabatanTable, setFilterJabatanTable] = useState<string>('ALL');

  // Form State
  const [selectedJabatan, setSelectedJabatan] = useState<string>('');
  const [selectedNama, setSelectedNama] = useState<string>('');
  const [isFullday, setIsFullday] = useState<boolean>(true);
  const [jamStart, setJamStart] = useState<string>('07:00');
  const [jamStop, setJamStop] = useState<string>('17:00');
  const [keterangan, setKeterangan] = useState<KeteranganCatatanManpower>('Hadir');
  const [catatan, setCatatan] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [validatorKiri, setValidatorKiri] = useState<string>(currentUser.namaLengkap || currentUser.username || 'Pengawas Lapangan');
  const [validatorKanan, setValidatorKanan] = useState<string>('Kepala Tehnik Tambang (KTT)');

  // Feedback alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Daftar opsi jabatan (gabungan opsi standar & yang ada di database manpower)
  const availableJabatanOptions = useMemo(() => {
    const set = new Set<string>(MANPOWER_JABATAN_OPTIONS);
    manpowerList.forEach((m) => {
      if (m.jabatan && m.jabatan.trim()) {
        set.add(m.jabatan.trim());
      }
    });
    return Array.from(set).sort();
  }, [manpowerList]);

  // Filter daftar nama personil berdasarkan Jabatan yang dipilih
  const filteredManpowerByNameAndJabatan = useMemo(() => {
    if (!selectedJabatan || selectedJabatan === '') {
      return manpowerList;
    }
    return manpowerList.filter(
      (m) => (m.jabatan || '').toLowerCase().trim() === selectedJabatan.toLowerCase().trim()
    );
  }, [manpowerList, selectedJabatan]);

  // Navigasi Tanggal Stepper
  const handleStepDate = (days: number) => {
    try {
      const cur = new Date(selectedDate);
      cur.setDate(cur.getDate() + days);
      const nextStr = cur.toISOString().split('T')[0];
      setSelectedDate(nextStr);
    } catch {
      setSelectedDate(todayStr);
    }
  };

  // Format tanggal ke Bahasa Indonesia (e.g. Senin, 12 Oktober 2026)
  const formatDisplayDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setSelectedJabatan('');
    setSelectedNama('');
    setIsFullday(true);
    setJamStart('07:00');
    setJamStop('17:00');
    setKeterangan('Hadir');
    setCatatan('');
    setEditingId(null);
  };

  // Toggle Fullday
  const handleToggleFullday = (enabled: boolean) => {
    setIsFullday(enabled);
    if (enabled) {
      setJamStart('07:00');
      setJamStop('17:00');
    }
  };

  // Handle Pilih Jabatan
  const handleJabatanChange = (newJabatan: string) => {
    setSelectedJabatan(newJabatan);
    // Jika nama yang terpilih saat ini tidak cocok dengan jabatan baru, reset nama
    if (selectedNama && newJabatan) {
      const match = manpowerList.find(
        (m) =>
          (m.nama || '').toLowerCase() === selectedNama.toLowerCase() &&
          (m.jabatan || '').toLowerCase().trim() === newJabatan.toLowerCase().trim()
      );
      if (!match) {
        setSelectedNama('');
      }
    }
  };

  // Handle Pilih Nama Karyawan
  const handleNamaChange = (newNama: string) => {
    setSelectedNama(newNama);
    if (!newNama) return;

    // Otomatis isi Jabatan jika personil ditemukan di data Modul 2
    const person = manpowerList.find(
      (m) => (m.nama || '').toLowerCase().trim() === newNama.toLowerCase().trim()
    );
    if (person && person.jabatan) {
      setSelectedJabatan(person.jabatan);
    }
  };

  // Simpan / Tambah Catatan Harian
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View". Pengisian catatan dinonaktifkan.',
      });
      return;
    }

    if (!selectedNama.trim()) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih Nama Karyawan terlebih dahulu.',
      });
      return;
    }

    const matchedPerson = manpowerList.find(
      (m) => (m.nama || '').toLowerCase().trim() === selectedNama.toLowerCase().trim()
    );

    const payload = {
      tanggal: selectedDate,
      jabatan: selectedJabatan.trim() || (matchedPerson?.jabatan || 'UMUM'),
      nama: selectedNama.trim(),
      manpowerId: matchedPerson?.id,
      nik: matchedPerson?.nik,
      isFullday,
      jamStart: isFullday ? '07:00' : jamStart,
      jamStop: isFullday ? '17:00' : jamStop,
      keterangan,
      catatan: catatan.trim(),
    };

    const res = onSaveLog(payload, editingId || undefined);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      handleResetForm();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Edit action
  const handleEdit = (record: CatatanHarianManpowerRecord) => {
    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View".',
      });
      return;
    }

    setEditingId(record.id);
    setSelectedDate(record.tanggal);
    setSelectedJabatan(record.jabatan || '');
    setSelectedNama(record.nama || '');
    setIsFullday(record.isFullday ?? true);
    setJamStart(record.jamStart || '07:00');
    setJamStop(record.jamStop || '17:00');
    setKeterangan((record.keterangan as KeteranganCatatanManpower) || 'Hadir');
    setCatatan(record.catatan || '');

    setFeedback({
      type: 'info',
      message: `Sedang mengedit catatan [${record.nama}]. Silakan perbarui lalu klik Simpan.`,
    });

    const formEl = document.getElementById('form-catatan-harian-manpower');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Delete action
  const handleDelete = (record: CatatanHarianManpowerRecord) => {
    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Akun Anda dalam mode "Hanya View".',
      });
      return;
    }

    const confirm = window.confirm(
      `Hapus catatan harian personil [${record.nama}] tanggal ${record.tanggal}?`
    );
    if (!confirm) return;

    const res = onDeleteLog(record.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      if (editingId === record.id) {
        handleResetForm();
      }
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Data Tabel Terfilter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter Tanggal
      if (!filterAllDates && log.tanggal !== selectedDate) {
        return false;
      }

      // Filter Keterangan
      if (filterKeterangan !== 'ALL' && log.keterangan !== filterKeterangan) {
        return false;
      }

      // Filter Jabatan
      if (filterJabatanTable !== 'ALL' && (log.jabatan || '').toLowerCase() !== filterJabatanTable.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNama = (log.nama || '').toLowerCase().includes(q);
        const matchJabatan = (log.jabatan || '').toLowerCase().includes(q);
        const matchCatatan = (log.catatan || '').toLowerCase().includes(q);
        const matchNik = (log.nik || '').toLowerCase().includes(q);
        const matchKet = (log.keterangan || '').toLowerCase().includes(q);
        if (!matchNama && !matchJabatan && !matchCatatan && !matchNik && !matchKet) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedDate, filterAllDates, filterKeterangan, filterJabatanTable, searchTerm]);

  // Ringkasan KPI Harian pada tanggal yang dipilih
  const dailyStats = useMemo(() => {
    const listForDate = logs.filter((l) => l.tanggal === selectedDate);
    const total = listForDate.length;
    const hadir = listForDate.filter((l) => l.keterangan === 'Hadir').length;
    const sakit = listForDate.filter((l) => l.keterangan === 'Sakit').length;
    const ijin = listForDate.filter((l) => l.keterangan === 'Ijin').length;
    const cuti = listForDate.filter((l) => l.keterangan === 'Cuti').length;
    const dinasLuar = listForDate.filter((l) => l.keterangan === 'Dinas Luar').length;
    const tukarJam = listForDate.filter((l) => l.keterangan === 'Tukar jam').length;
    const lembur = listForDate.filter((l) => l.keterangan === 'Lembur').length;

    return { total, hadir, sakit, ijin, cuti, dinasLuar, tukarJam, lembur };
  }, [logs, selectedDate]);

  // Helper Badge Keterangan
  const renderKeteranganBadge = (ket?: string) => {
    const opt = KETERANGAN_CATATAN_MANPOWER_OPTIONS.find(
      (o) => o.value.toLowerCase() === (ket || '').toLowerCase()
    );
    const badgeClass = opt ? opt.badgeClass : 'bg-stone-800 text-stone-300 border-stone-700';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badgeClass}`}>
        {ket || 'Hadir'}
      </span>
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data catatan harian untuk di-export.');
      return;
    }

    const headers = [
      'NO',
      'TANGGAL',
      'JABATAN',
      'NAMA PERSONIL',
      'NIK',
      'JAM START',
      'JAM STOP',
      'STATUS FULLDAY',
      'KETERANGAN',
      'CATATAN'
    ];

    const rows = filteredLogs.map((item, idx) => [
      `"${idx + 1}"`,
      `"${item.tanggal}"`,
      `"${(item.jabatan || '').replace(/"/g, '""')}"`,
      `"${(item.nama || '').replace(/"/g, '""')}"`,
      `"${item.nik || ''}"`,
      `"${item.jamStart || ''}"`,
      `"${item.jamStop || ''}"`,
      `"${item.isFullday ? 'YA (FULLDAY)' : 'TIDAK'}"`,
      `"${item.keterangan || ''}"`,
      `"${(item.catatan || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      `"PT BATU KALI WELANG AMPUH (ETIKA) - LAPORAN CATATAN HARIAN MANPOWER"\r\n` +
      `"Tanggal Dipilih: ${selectedDate} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Data: ${filteredLogs.length} Baris"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Catatan_Harian_Manpower_PT_BKWA_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg transition animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/80 border border-rose-800 text-rose-200'
              : 'bg-amber-950/80 border border-amber-800 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
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
            className="text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. KONTROL TANGGAL CATATAN (DATE PICKER & STEPPER) */}
      {/* ========================================================================= */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DATE PICKER
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>TANGGAL CATATAN HARIAN</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400">
              Pilih tanggal untuk melihat dan mencatat kehadiran, tukar jam, lembur, serta status dinas personil.
            </p>
          </div>

          {/* Date Picker Interactive Widget */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-950/80 border border-stone-800 p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => handleStepDate(-1)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-stone-900 border border-amber-500/40 rounded-xl">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                id="input-picker-tanggal-catatan"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-amber-300 focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            <button
              type="button"
              onClick={() => handleStepDate(1)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition border ${
                selectedDate === todayStr
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm'
                  : 'bg-stone-900 text-stone-300 hover:text-white border-stone-800'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setFilterAllDates(!filterAllDates)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition border ${
                filterAllDates
                  ? 'bg-cyan-500 text-stone-950 border-cyan-400 font-black'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
              title="Tampilkan catatan semua tanggal"
            >
              {filterAllDates ? 'Semua Tanggal Aktif' : 'Semua Tanggal'}
            </button>
          </div>
        </div>

        {/* Selected Date Header Ribbon */}
        <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Tanggal Aktif:</span>
            <strong className="text-amber-300 font-bold text-sm">
              {formatDisplayDateIndo(selectedDate)}
            </strong>
            <span className="text-stone-600">({selectedDate})</span>
          </div>

          <span className="text-stone-400 hidden sm:inline">
            Tercatat <strong className="text-stone-200">{dailyStats.total}</strong> personil pada tanggal ini
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. KPI SUMMARY BAR KEHADIRAN HARIAN */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block mb-1">
            TOTAL
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-stone-100">{dailyStats.total}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            HADIR
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-emerald-400">{dailyStats.hadir}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block mb-1">
            SAKIT
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-rose-400">{dailyStats.sakit}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-1">
            IJIN
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-cyan-400">{dailyStats.ijin}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block mb-1">
            CUTI
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-purple-400">{dailyStats.cuti}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
            DINAS LUAR
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-blue-400">{dailyStats.dinasLuar}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
            TUKAR JAM
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-amber-400">{dailyStats.tukarJam}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block mb-1">
            LEMBUR
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-orange-400">{dailyStats.lembur}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FORM INPUT CATATAN HARIAN MANPOWER */}
      {/* ========================================================================= */}
      <section
        id="form-catatan-harian-manpower"
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                FORM CATATAN
              </span>
              <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <span>INPUT CATATAN HARIAN PERSONIL</span>
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Pilih <strong>Jabatan</strong> untuk memfilter daftar <strong>Nama</strong>, atur jam kerja / Fullday, tentukan status keterangan dan catatan.
            </p>
          </div>

          {editingId && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-300">
              <span>Mode Edit: <strong>{selectedNama || 'Personil'}</strong></span>
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

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. TANGGAL CATATAN */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                TANGGAL CATATAN
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 [color-scheme:dark]"
                />
                <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. JABATAN (DROPDOWN DARI MODUL 2) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                JABATAN (DARI MODUL 2)
              </label>
              <div className="relative">
                <select
                  id="select-catatan-jabatan"
                  value={selectedJabatan}
                  onChange={(e) => handleJabatanChange(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Semua / Pilih Jabatan --</option>
                  {availableJabatanOptions.map((jab) => (
                    <option key={jab} value={jab}>
                      {jab}
                    </option>
                  ))}
                </select>
                <Briefcase className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. NAMA (DROPDOWN DARI FILTER JABATAN) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                NAMA PERSONIL (FILTER JABATAN)
              </label>
              <div className="relative">
                <select
                  id="select-catatan-nama"
                  value={selectedNama}
                  onChange={(e) => handleNamaChange(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Pilih Nama Karyawan --</option>
                  {filteredManpowerByNameAndJabatan.map((mp) => (
                    <option key={mp.id} value={mp.nama}>
                      {mp.nama} {mp.jabatan ? `(${mp.jabatan})` : ''}
                    </option>
                  ))}
                  {filteredManpowerByNameAndJabatan.length === 0 && (
                    <option value="" disabled>
                      (Tidak ada personil dengan jabatan ini di Modul 2)
                    </option>
                  )}
                </select>
                <Users className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 4. JAM START - JAM STOP & FITUR FULLDAY */}
            <div className="sm:col-span-2 lg:col-span-2 bg-stone-950/70 border border-stone-800 p-3.5 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>JAM START — JAM STOP</span>
                </label>

                {/* FITUR TOGGLE / BUTTON FULLDAY */}
                <button
                  type="button"
                  onClick={() => handleToggleFullday(!isFullday)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold transition border ${
                    isFullday
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-stone-800 text-stone-400 hover:text-white border-stone-700'
                  }`}
                  title="Klik untuk mengaktifkan / menonaktifkan jam Fullday kerja (07:00 - 17:00)"
                >
                  <Sun className={`w-3.5 h-3.5 ${isFullday ? 'text-stone-950 fill-stone-950' : 'text-stone-400'}`} />
                  <span>Fitur Fullday: {isFullday ? 'AKTIF (07:00 - 17:00)' : 'NONAKTIF (Kustom Jam)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-mono text-stone-400 mb-1">Jam Start:</span>
                  <input
                    type="time"
                    value={jamStart}
                    disabled={isFullday}
                    onChange={(e) => setJamStart(e.target.value)}
                    className={`w-full bg-stone-800 border rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [color-scheme:dark] ${
                      isFullday
                        ? 'border-amber-500/40 text-amber-300 bg-amber-950/20 cursor-not-allowed'
                        : 'border-stone-700 text-stone-100'
                    }`}
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-stone-400 mb-1">Jam Stop:</span>
                  <input
                    type="time"
                    value={jamStop}
                    disabled={isFullday}
                    onChange={(e) => setJamStop(e.target.value)}
                    className={`w-full bg-stone-800 border rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [color-scheme:dark] ${
                      isFullday
                        ? 'border-amber-500/40 text-amber-300 bg-amber-950/20 cursor-not-allowed'
                        : 'border-stone-700 text-stone-100'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 5. KETERANGAN (DROPDOWN: Hadir, Sakit, Ijin, Cuti, Dinas Luar, Tukar jam, Lembur) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                KETERANGAN
              </label>
              <select
                id="select-catatan-keterangan"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value as KeteranganCatatanManpower)}
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {KETERANGAN_CATATAN_MANPOWER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. CATATAN */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                CATATAN
              </label>
              <input
                id="field-catatan-teks"
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Tukar shift malam dengan Budi; Izin urusan keluarga; Dinas luar beli filter solar; Lembur perbaikan bucket loader..."
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!canEdit}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                  canEdit
                    ? 'text-stone-950 bg-amber-500 hover:bg-amber-400 shadow-amber-500/20 active:scale-95'
                    : 'text-stone-500 bg-stone-800 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan' : 'Simpan Catatan'}</span>
              </button>

              {(editingId || selectedNama || selectedJabatan || catatan) && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {editingId && (
              <span className="text-[11px] text-amber-400 font-mono">
                *Sedang mengedit catatan personil
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* 4. TABEL CATATAN HARIAN MANPOWER */}
      {/* ========================================================================= */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-900">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide">
                TABEL CATATAN HARIAN MANPOWER
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {filteredLogs.length} Data
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Menampilkan catatan kehadiran, shift, lembur, dan status dinas personil {filterAllDates ? '(Semua Tanggal)' : `pada tanggal ${selectedDate}`}.
            </p>
          </div>

          {/* Quick Filters, Export, Print, Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Keterangan */}
            <select
              value={filterKeterangan}
              onChange={(e) => setFilterKeterangan(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Keterangan</option>
              {KETERANGAN_CATATAN_MANPOWER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Filter Jabatan di Tabel */}
            <select
              value={filterJabatanTable}
              onChange={(e) => setFilterJabatanTable(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Jabatan</option>
              {availableJabatanOptions.map((jab) => (
                <option key={jab} value={jab}>
                  {jab}
                </option>
              ))}
            </select>

            {/* Tombol Cetak Dokumen */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow-md whitespace-nowrap"
              title="Cetak lembar dokumen catatan harian manpower"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>

            {/* Tombol Export Excel */}
            {canExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md whitespace-nowrap"
                title="Export catatan harian ke format CSV / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            )}

            {/* Fast Search */}
            <div className="w-full sm:w-56">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari Nama / Jabatan / Catatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">NO</th>
                <th className="py-3 px-3">TANGGAL</th>
                <th className="py-3 px-3">JABATAN</th>
                <th className="py-3 px-3">NAMA PERSONIL</th>
                <th className="py-3 px-3">JAM START — STOP</th>
                <th className="py-3 px-3">KETERANGAN</th>
                <th className="py-3 px-3">CATATAN</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-stone-950/90 shadow-l">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item, idx) => {
                  const isBeingEdited = editingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        isBeingEdited
                          ? 'bg-amber-500/15 border-l-4 border-amber-500'
                          : 'hover:bg-stone-800/40'
                      }`}
                    >
                      {/* NO */}
                      <td className="py-3 px-3 text-center font-mono text-stone-500">
                        {idx + 1}
                      </td>

                      {/* TANGGAL */}
                      <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                        {item.tanggal}
                      </td>

                      {/* JABATAN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-800 border border-stone-700 text-stone-200">
                          {item.jabatan || '-'}
                        </span>
                      </td>

                      {/* NAMA PERSONIL */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-stone-100">
                        <div>
                          <span>{item.nama}</span>
                          {item.nik && (
                            <span className="block text-[10px] font-mono text-stone-500 font-normal">
                              NIK: {item.nik}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* JAM START - JAM STOP & FULLDAY */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-stone-200 font-semibold">
                            {item.jamStart || '07:00'} - {item.jamStop || '17:00'}
                          </span>
                          {item.isFullday && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Sun className="w-2.5 h-2.5" />
                              <span>FULLDAY</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* KETERANGAN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderKeteranganBadge(item.keterangan)}
                      </td>

                      {/* CATATAN */}
                      <td className="py-3 px-3 min-w-[220px]">
                        {item.catatan ? (
                          <p className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-900/30 rounded-lg px-2.5 py-1 whitespace-pre-wrap">
                            {item.catatan}
                          </p>
                        ) : (
                          <span className="text-stone-600 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-stone-900/95 shadow-l">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleEdit(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title="Edit Catatan Harian"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleDelete(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              canEdit
                                ? 'text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border-rose-800/60'
                                : 'text-stone-500 bg-stone-900/60 border-stone-800 cursor-not-allowed opacity-60'
                            }`}
                            title="Hapus Catatan Harian"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-stone-300">
                        Belum ada catatan harian manpower {filterAllDates ? '' : `untuk tanggal ${selectedDate}`}.
                      </p>
                      <p className="text-stone-500">
                        Gunakan form di atas untuk mencatat kehadiran, jam kerja, atau status personil.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. MODAL CETAK LEMBAR DOKUMEN CATATAN HARIAN MANPOWER */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white text-stone-950 border border-stone-300 rounded-2xl w-full max-w-4xl shadow-2xl my-8 overflow-hidden font-sans">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900 font-mono">
                  PREVIEW CETAK: CATATAN HARIAN MANPOWER
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-stone-500 hover:text-stone-800 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form Validasi Label Manual sebelum Cetak */}
            <div className="p-4 bg-stone-50 border-b border-stone-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Pengesahan Kiri (Pengawas / Checker):
                </label>
                <input
                  type="text"
                  value={validatorKiri}
                  onChange={(e) => setValidatorKiri(e.target.value)}
                  placeholder="Nama Pengawas Lapangan"
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Pengesahan Kanan (KTT / Kabag):
                </label>
                <input
                  type="text"
                  value={validatorKanan}
                  onChange={(e) => setValidatorKanan(e.target.value)}
                  placeholder="Nama Kepala Tehnik Tambang"
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Print Paper Content */}
            <div id="print-area-catatan-harian" className="p-8 space-y-5 text-xs bg-white text-stone-900">
              {/* Kop Resmi PT BATU KALI WELANG AMPUH (ETIKA) */}
              <div className="border-b-2 border-stone-900 pb-3 flex justify-between items-center">
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-wider text-stone-900 uppercase">
                    PT BATU KALI WELANG AMPUH (ETIKA)
                  </h1>
                  <p className="text-[11px] text-stone-600 font-medium">
                    DIVISI OPERATION &amp; WORKSHOP — PENGAWASAN KEGIATAN &amp; TENAGA KERJA
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    Site Quarry: Ds. Welang, Kec. Kraton, Kab. Pasuruan, Jawa Timur
                  </p>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <span className="px-2.5 py-1 bg-stone-100 border border-stone-400 font-bold rounded">
                    FORM: MANPOWER-DAILY
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Tgl Cetak: {new Date().toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center py-1">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-stone-950 underline decoration-2">
                  LAPORAN CATATAN HARIAN MANPOWER
                </h2>
                <p className="text-xs text-stone-600 font-mono mt-0.5">
                  Tanggal: {formatDisplayDateIndo(selectedDate)} ({selectedDate})
                </p>
              </div>

              {/* Ringkasan Kehadiran */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-[10px] font-mono">
                <div className="p-1.5 bg-stone-50 border border-stone-300 rounded">
                  <span className="text-stone-500 block">Total</span>
                  <strong className="text-stone-900 text-xs">{dailyStats.total}</strong>
                </div>
                <div className="p-1.5 bg-emerald-50 border border-emerald-300 rounded">
                  <span className="text-emerald-800 block">Hadir</span>
                  <strong className="text-emerald-700 text-xs">{dailyStats.hadir}</strong>
                </div>
                <div className="p-1.5 bg-rose-50 border border-rose-300 rounded">
                  <span className="text-rose-800 block">Sakit</span>
                  <strong className="text-rose-700 text-xs">{dailyStats.sakit}</strong>
                </div>
                <div className="p-1.5 bg-cyan-50 border border-cyan-300 rounded">
                  <span className="text-cyan-800 block">Ijin</span>
                  <strong className="text-cyan-700 text-xs">{dailyStats.ijin}</strong>
                </div>
                <div className="p-1.5 bg-purple-50 border border-purple-300 rounded">
                  <span className="text-purple-800 block">Cuti</span>
                  <strong className="text-purple-700 text-xs">{dailyStats.cuti}</strong>
                </div>
                <div className="p-1.5 bg-blue-50 border border-blue-300 rounded">
                  <span className="text-blue-800 block">Dinas</span>
                  <strong className="text-blue-700 text-xs">{dailyStats.dinasLuar}</strong>
                </div>
                <div className="p-1.5 bg-amber-50 border border-amber-300 rounded">
                  <span className="text-amber-800 block">Tukar/Lembur</span>
                  <strong className="text-amber-700 text-xs">{dailyStats.tukarJam + dailyStats.lembur}</strong>
                </div>
              </div>

              {/* Tabel Cetak */}
              <div className="border border-stone-400 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] divide-y divide-stone-300">
                  <thead className="bg-stone-100 text-stone-800 font-mono font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">No</th>
                      <th className="py-2 px-2">Jabatan</th>
                      <th className="py-2 px-2">Nama Personil</th>
                      <th className="py-2 px-2">Jam Kerja</th>
                      <th className="py-2 px-2">Keterangan</th>
                      <th className="py-2 px-2">Catatan Khusus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredLogs.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'}>
                        <td className="py-2 px-2 text-center font-mono text-stone-600">{idx + 1}</td>
                        <td className="py-2 px-2 font-semibold text-stone-800">{item.jabatan || '-'}</td>
                        <td className="py-2 px-2 font-bold text-stone-900">{item.nama}</td>
                        <td className="py-2 px-2 font-mono text-stone-700 whitespace-nowrap">
                          {item.jamStart} - {item.jamStop} {item.isFullday ? '(Fullday)' : ''}
                        </td>
                        <td className="py-2 px-2 font-bold text-stone-800">{item.keterangan || 'Hadir'}</td>
                        <td className="py-2 px-2 text-stone-700">{item.catatan || '-'}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-stone-500 italic">
                          Tidak ada catatan manpower untuk tanggal ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dua Kolom Validasi Tanda Tangan */}
              <div className="pt-8 grid grid-cols-2 gap-12 text-center font-mono text-xs">
                <div>
                  <p className="text-stone-600 mb-1">Dibuat &amp; Dilaporkan Oleh:</p>
                  <p className="font-bold text-stone-900">Petugas / Pengawas Lapangan</p>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <p className="font-bold text-stone-900 border-t border-stone-800 pt-1 mt-1">
                    {validatorKiri || '( ........................................ )'}
                  </p>
                </div>

                <div>
                  <p className="text-stone-600 mb-1">Mengetahui &amp; Menyetujui:</p>
                  <p className="font-bold text-stone-900">Kepala Tehnik Tambang (KTT)</p>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan &amp; Cap )</span>
                  </div>
                  <p className="font-bold text-stone-900 border-t border-stone-800 pt-1 mt-1">
                    {validatorKanan || '( ........................................ )'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-100">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-200 hover:bg-stone-300 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Dokumen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
