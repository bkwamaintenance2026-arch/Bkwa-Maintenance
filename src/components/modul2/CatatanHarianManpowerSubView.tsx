import React, { useState, useMemo, useEffect } from 'react';
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
  UserCheck,
  ShieldCheck,
  CheckCheck,
  Check,
  Coffee,
  Sliders,
  Award
} from 'lucide-react';
import { canUserEdit, canUserExportModule } from '../../utils/storage';

// Helper hitung durasi lembur / jam kerja otomatis
export const calculateOvertimeDuration = (
  jamStart?: string,
  jamStop?: string,
  istirahatStr?: string
): { minutes: number; formatted: string; totalHoursDecimal: number } => {
  if (!jamStart || !jamStop) {
    return { minutes: 0, formatted: '-', totalHoursDecimal: 0 };
  }

  const [startH, startM] = jamStart.split(':').map((v) => parseInt(v, 10) || 0);
  const [stopH, stopM] = jamStop.split(':').map((v) => parseInt(v, 10) || 0);

  let startMinutes = startH * 60 + startM;
  let stopMinutes = stopH * 60 + stopM;

  // Jika stop lebih kecil dari start, diasumsikan lembur lintas malam (misal 20:00 - 02:00)
  if (stopMinutes < startMinutes) {
    stopMinutes += 24 * 60;
  }

  const grossMinutes = stopMinutes - startMinutes;

  // Parsing waktu istirahat
  let breakMinutes = 0;
  if (istirahatStr) {
    const s = istirahatStr.toLowerCase().trim();
    if (s === '-' || s === '' || s === '0' || s === 'tidak ada' || s === 'none') {
      breakMinutes = 0;
    } else if (s.includes('30') || s.includes('setengah')) {
      breakMinutes = 30;
    } else if (s.includes('1.5') || s.includes('1,5') || s.includes('90')) {
      breakMinutes = 90;
    } else if (s.includes('2') || s.includes('120')) {
      breakMinutes = 120;
    } else if (s.includes('1') || s.includes('60') || s.includes('satu')) {
      breakMinutes = 60;
    } else {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) {
        breakMinutes = num <= 4 ? num * 60 : num;
      }
    }
  }

  const netMinutes = Math.max(0, grossMinutes - breakMinutes);
  const hours = Math.floor(netMinutes / 60);
  const mins = netMinutes % 60;

  let formatted = '';
  if (hours > 0 && mins > 0) {
    formatted = `${hours} Jam ${mins} Mnt`;
  } else if (hours > 0) {
    formatted = `${hours} Jam`;
  } else if (mins > 0) {
    formatted = `${mins} Mnt`;
  } else {
    formatted = '0 Jam';
  }

  const totalHoursDecimal = parseFloat((netMinutes / 60).toFixed(1));
  return { minutes: netMinutes, formatted, totalHoursDecimal };
};

interface LemburSignatories {
  pembuatName: string;
  pembuatJabatan: string;
  diperiksaName: string;
  diperiksaJabatan: string;
  menyetujuiName: string;
  menyetujuiJabatan: string;
}

const LEMBUR_SIGNATORIES_STORAGE_KEY = 'bkwa_saved_lembur_signatories_v1';

interface CatatanHarianManpowerSubViewProps {
  logs: CatatanHarianManpowerRecord[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSaveLog: (
    data: Omit<CatatanHarianManpowerRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: CatatanHarianManpowerRecord };
  onDeleteLog: (id: string) => { success: boolean; message: string };
  onToggleApproveLog?: (id: string) => { success: boolean; message: string };
  onBatchApproveLogs?: (date: string) => { success: boolean; message: string; count?: number };
}

export const CatatanHarianManpowerSubView: React.FC<CatatanHarianManpowerSubViewProps> = ({
  logs,
  manpowerList,
  currentUser,
  onSaveLog,
  onDeleteLog,
  onToggleApproveLog,
  onBatchApproveLogs,
}) => {
  const canEdit = canUserEdit(currentUser, 2);
  const canExport = canUserExportModule(currentUser, 2);

  // Tanggal Catatan aktif (Default: Hari ini YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterAllDates, setFilterAllDates] = useState<boolean>(false);

  // Filter Personil Modul 2 yang berjabatan Administrasi
  const adminPersonnelList = useMemo(() => {
    return manpowerList.filter((m) =>
      (m.jabatan || '').toLowerCase().includes('admin')
    );
  }, [manpowerList]);

  // Nama default personil administrasi (otomatis mendeteksi akun login atau personil administrasi pertama)
  const defaultAdminName = useMemo(() => {
    const match = adminPersonnelList.find(
      (m) =>
        m.nama.toLowerCase() === (currentUser.namaLengkap || '').toLowerCase() ||
        m.nama.toLowerCase() === (currentUser.username || '').toLowerCase()
    );
    if (match) return match.nama;
    if (adminPersonnelList.length > 0) return adminPersonnelList[0].nama;
    return currentUser.namaLengkap || currentUser.username || 'Staf Administrasi';
  }, [adminPersonnelList, currentUser]);

  const kabagWorkshopName = 'Dodik Mariyadi';
  const kabagWorkshopLabel = 'Dodik Mariyadi (Kabag Workshop)';

  // Search & Filter state di tabel
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterKeterangan, setFilterKeterangan] = useState<string>('ALL');
  const [filterJabatanTable, setFilterJabatanTable] = useState<string>('ALL');
  const [filterApprovalTable, setFilterApprovalTable] = useState<string>('ALL'); // ALL | DISETUJUI | MENUNGGU_APPROVAL

  // Form State
  const [selectedJabatan, setSelectedJabatan] = useState<string>('');
  const [selectedNama, setSelectedNama] = useState<string>('');
  const [isFullday, setIsFullday] = useState<boolean>(true);
  const [jamStart, setJamStart] = useState<string>('07:00');
  const [jamStop, setJamStop] = useState<string>('16:00');
  const [istirahat, setIstirahat] = useState<string>('1 Jam');
  const [keterangan, setKeterangan] = useState<KeteranganCatatanManpower>('Hadir');
  const [catatan, setCatatan] = useState<string>('');
  const [dibuatOleh, setDibuatOleh] = useState<string>(defaultAdminName);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Perhitungan durasi aktif di form input secara realtime
  const activeDuration = useMemo(() => {
    return calculateOvertimeDuration(
      isFullday ? '07:00' : jamStart,
      isFullday ? '16:00' : jamStop,
      istirahat
    );
  }, [isFullday, jamStart, jamStop, istirahat]);

  // Sync default admin name saat manpower list berubah
  useEffect(() => {
    if (!dibuatOleh || dibuatOleh === 'Staf Administrasi') {
      setDibuatOleh(defaultAdminName);
    }
  }, [defaultAdminName]);

  // =========================================================================
  // SETUP VALIDASI 3 PIHAK: Dibuat Oleh, Diperiksa Oleh, Menyetujui (HRD)
  // =========================================================================
  const defaultSignatories = useMemo<LemburSignatories>(() => {
    // Cari personil HRD / Management dari master manpower jika ada
    const hrdPerson = manpowerList.find((m) =>
      (m.jabatan || '').toLowerCase().includes('hrd') ||
      (m.jabatan || '').toLowerCase().includes('personalia') ||
      (m.jabatan || '').toLowerCase().includes('management')
    );

    return {
      pembuatName: defaultAdminName,
      pembuatJabatan: 'Administrasi Workshop',
      diperiksaName: kabagWorkshopName,
      diperiksaJabatan: 'Kabag Workshop',
      menyetujuiName: hrdPerson?.nama || 'HRD / Management',
      menyetujuiJabatan: hrdPerson?.jabatan || 'HRD & GA Dept.',
    };
  }, [defaultAdminName, manpowerList]);

  const [signatories, setSignatories] = useState<LemburSignatories>(() => {
    try {
      const saved = localStorage.getItem(LEMBUR_SIGNATORIES_STORAGE_KEY);
      if (saved) {
        return { ...defaultSignatories, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultSignatories;
  });

  const [showValidationSetup, setShowValidationSetup] = useState<boolean>(false);
  const [validationSavedNotice, setValidationSavedNotice] = useState<boolean>(false);

  const handleSaveSignatories = () => {
    try {
      localStorage.setItem(LEMBUR_SIGNATORIES_STORAGE_KEY, JSON.stringify(signatories));
      setValidationSavedNotice(true);
      setTimeout(() => setValidationSavedNotice(false), 2500);
    } catch {}
  };

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printFilterOnlyOvertime, setPrintFilterOnlyOvertime] = useState<boolean>(false);

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
    setJamStop('16:00');
    setIstirahat('1 Jam');
    setKeterangan('Hadir');
    setCatatan('');
    setDibuatOleh(defaultAdminName);
    setEditingId(null);
  };

  // Toggle Fullday
  const handleToggleFullday = (enabled: boolean) => {
    setIsFullday(enabled);
    if (enabled) {
      setJamStart('07:00');
      setJamStop('16:00');
      setIstirahat('1 Jam');
    }
  };

  // Handle Pilih Jabatan
  const handleJabatanChange = (newJabatan: string) => {
    setSelectedJabatan(newJabatan);
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

    const actualStart = isFullday ? '07:00' : jamStart;
    const actualStop = isFullday ? '16:00' : jamStop;
    const calculated = calculateOvertimeDuration(actualStart, actualStop, istirahat);

    const payload = {
      tanggal: selectedDate,
      jabatan: selectedJabatan.trim() || (matchedPerson?.jabatan || 'UMUM'),
      nama: selectedNama.trim(),
      manpowerId: matchedPerson?.id,
      nik: matchedPerson?.nik,
      isFullday,
      jamStart: actualStart,
      jamStop: actualStop,
      istirahat: istirahat.trim() || '-',
      durasiLembur: calculated.formatted,
      keterangan,
      catatan: catatan.trim(),
      dibuatOleh: dibuatOleh.trim() || defaultAdminName,
      disetujuiOleh: kabagWorkshopLabel,
      statusApproval: editingId 
        ? (logs.find((l) => l.id === editingId)?.statusApproval || 'MENUNGGU_APPROVAL') 
        : 'MENUNGGU_APPROVAL',
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
    setJamStop(record.jamStop || '16:00');
    setIstirahat(record.istirahat || '1 Jam');
    setKeterangan((record.keterangan as KeteranganCatatanManpower) || 'Hadir');
    setCatatan(record.catatan || '');
    setDibuatOleh(record.dibuatOleh || defaultAdminName);

    setFeedback({
      type: 'info',
      message: `Sedang mengedit catatan [${record.nama}]. Silakan perbarui lalu klik Simpan.`,
    });

    const formEl = document.getElementById('form-catatan-harian-manpower');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Approval Handlers (Kabag Workshop)
  const handleToggleApprove = (record: CatatanHarianManpowerRecord) => {
    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah status approval.',
      });
      return;
    }

    if (onToggleApproveLog) {
      const res = onToggleApproveLog(record.id);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    }
  };

  const handleBatchApproveCurrentDate = () => {
    if (!canEdit) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Anda tidak memiliki wewenang untuk mengubah status approval.',
      });
      return;
    }

    const pendingItems = logs.filter(
      (l) => l.tanggal === selectedDate && l.statusApproval !== 'DISETUJUI'
    );
    if (pendingItems.length === 0) {
      setFeedback({
        type: 'info',
        message: `Semua catatan harian tanggal ${selectedDate} sudah disetujui oleh Kabag Workshop (${kabagWorkshopName}).`,
      });
      return;
    }

    if (onBatchApproveLogs) {
      const res = onBatchApproveLogs(selectedDate);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
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

      // Filter Status Approval
      if (filterApprovalTable !== 'ALL') {
        const status = log.statusApproval || 'MENUNGGU_APPROVAL';
        if (status !== filterApprovalTable) {
          return false;
        }
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNama = (log.nama || '').toLowerCase().includes(q);
        const matchJabatan = (log.jabatan || '').toLowerCase().includes(q);
        const matchCatatan = (log.catatan || '').toLowerCase().includes(q);
        const matchNik = (log.nik || '').toLowerCase().includes(q);
        const matchKet = (log.keterangan || '').toLowerCase().includes(q);
        const matchDibuat = (log.dibuatOleh || '').toLowerCase().includes(q);
        const matchApprove = (log.disetujuiOleh || '').toLowerCase().includes(q);
        if (!matchNama && !matchJabatan && !matchCatatan && !matchNik && !matchKet && !matchDibuat && !matchApprove) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedDate, filterAllDates, filterKeterangan, filterJabatanTable, filterApprovalTable, searchTerm]);

  // Data yang akan dicetak pada Modal Print Preview
  const printItems = useMemo(() => {
    const base = logs.filter((l) => l.tanggal === selectedDate);
    if (printFilterOnlyOvertime) {
      return base.filter((l) => (l.keterangan || '').toLowerCase() === 'lembur');
    }
    return base;
  }, [logs, selectedDate, printFilterOnlyOvertime]);

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
    const disetujuiCount = listForDate.filter((l) => l.statusApproval === 'DISETUJUI').length;
    const pendingApprovalCount = listForDate.filter((l) => (l.statusApproval || 'MENUNGGU_APPROVAL') !== 'DISETUJUI').length;

    // Total jam lembur kumulatif
    let totalLemburMinutes = 0;
    listForDate.forEach((item) => {
      if (item.keterangan === 'Lembur') {
        const dur = calculateOvertimeDuration(item.jamStart, item.jamStop, item.istirahat);
        totalLemburMinutes += dur.minutes;
      }
    });
    const totalLemburHoursDecimal = (totalLemburMinutes / 60).toFixed(1);

    return { 
      total, 
      hadir, 
      sakit, 
      ijin, 
      cuti, 
      dinasLuar, 
      tukarJam, 
      lembur, 
      disetujuiCount, 
      pendingApprovalCount,
      totalLemburHoursDecimal
    };
  }, [logs, selectedDate]);

  // Helper Badge Keterangan
  const renderKeteranganBadge = (ket?: string) => {
    const opt = KETERANGAN_CATATAN_MANPOWER_OPTIONS.find(
      (o) => o.value.toLowerCase() === (ket || '').toLowerCase()
    );
    const badgeClass = opt ? opt.badgeClass : 'bg-stone-800 text-stone-300 border-stone-700';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badgeClass}`}>
        {ket || 'Hadir'}
      </span>
    );
  };

  // Helper Cetak Langsung melalui Hidden iFrame (100% Anti-Blank & Bebas Konflik CSS Media Print)
  const handleDirectPrintElement = (containerId: string, docTitle: string) => {
    const targetEl = document.getElementById(containerId);
    if (!targetEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 10px; background: #fff; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #333; padding: 4.5px 6px; text-align: left; vertical-align: middle; }
            th { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 9.5px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 6px; margin-bottom: 8px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
            .header h3 { margin: 3px 0 0 0; font-size: 13px; font-weight: bold; }
            .header p { margin: 2px 0 0 0; font-size: 9px; color: #555; }
            .summary-box { display: flex; gap: 8px; margin-bottom: 8px; }
            .summary-item { flex: 1; border: 1px solid #777; padding: 4px 6px; text-align: center; border-radius: 4px; background: #fafafa; }
            .summary-label { font-size: 8px; color: #555; font-weight: bold; text-transform: uppercase; }
            .summary-value { font-size: 11px; font-weight: bold; color: #111; }
            .signatures { margin-top: 25px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
            .sign-box { width: 220px; }
            .sign-title { font-size: 9px; color: #444; display: block; }
            .sign-job { font-size: 9.5px; font-weight: bold; color: #222; display: block; margin-top: 1px; }
            .sign-space { height: 50px; }
            .sign-name { border-top: 1px solid #333; padding-top: 3px; font-weight: bold; font-size: 10px; }
            .sign-col-box { height: 36px; border: 1px dashed #aaa; border-radius: 3px; }
          </style>
        </head>
        <body>
          ${targetEl.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }, 250);
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
      'JAM MULAI',
      'JAM SELESAI',
      'ISTIRAHAT',
      'DURASI LEMBUR / KERJA',
      'STATUS FULLDAY',
      'KETERANGAN',
      'CATATAN',
      'DIBUAT OLEH (ADMINISTRASI)',
      'APPROVAL (KABAG WORKSHOP)',
      'STATUS APPROVAL',
      'TANGGAL APPROVAL'
    ];

    const rows = filteredLogs.map((item, idx) => {
      const dur = calculateOvertimeDuration(item.jamStart, item.jamStop, item.istirahat);
      return [
        `"${idx + 1}"`,
        `"${item.tanggal}"`,
        `"${(item.jabatan || '').replace(/"/g, '""')}"`,
        `"${(item.nama || '').replace(/"/g, '""')}"`,
        `"${item.nik || ''}"`,
        `"${item.jamStart || ''}"`,
        `"${item.jamStop || ''}"`,
        `"${item.istirahat || '-'}"`,
        `"${dur.formatted}"`,
        `"${item.isFullday ? 'YA (FULLDAY)' : 'TIDAK'}"`,
        `"${item.keterangan || ''}"`,
        `"${(item.catatan || '').replace(/"/g, '""')}"`,
        `"${(item.dibuatOleh || 'Staf Administrasi').replace(/"/g, '""')}"`,
        `"${(item.disetujuiOleh || kabagWorkshopLabel).replace(/"/g, '""')}"`,
        `"${item.statusApproval === 'DISETUJUI' ? 'DISETUJUI' : 'MENUNGGU_APPROVAL'}"`,
        `"${item.tglApproval || '-'}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      `"PT. BATU KALI WELANG AMPUH (ETIKA09) - SURAT PERINTAH LEMBUR & CATATAN HARIAN"\r\n` +
      `"Tanggal Dipilih: ${selectedDate} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Data: ${filteredLogs.length} Baris"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Surat_Perintah_Lembur_PT_BKWA_${selectedDate}.csv`
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
                <span>TANGGAL CATATAN &amp; LEMBUR MANPOWER</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400">
              Pilih tanggal untuk melihat, mencatat penugasan lembur, shift kerja, dan mencetak <strong>Surat Perintah Lembur</strong>.
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

          <div className="flex items-center gap-3">
            <span className="text-stone-400 hidden sm:inline">
              Tercatat <strong className="text-stone-200">{dailyStats.total}</strong> personil ({dailyStats.lembur} Lembur)
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. KPI SUMMARY BAR KEHADIRAN & LEMBUR HARIAN */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
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
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-400" />
            LEMBUR
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-orange-400">{dailyStats.lembur}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
          <span className="text-[10px] text-orange-300/80 font-mono block mt-0.5">
            {dailyStats.totalLemburHoursDecimal} Jam
          </span>
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
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
            TUKAR JAM
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-amber-400">{dailyStats.tukarJam}</span>
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
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-1">
            IJIN
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-cyan-400">{dailyStats.ijin}</span>
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
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block mb-1">
            CUTI
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-purple-400">{dailyStats.cuti}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        {/* Status Approval KPI */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            DISETUJUI
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-emerald-300">{dailyStats.disetujuiCount}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            MENUNGGU
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-amber-300">{dailyStats.pendingApprovalCount}</span>
            <span className="text-[10px] font-mono text-stone-500">Org</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FORM INPUT CATATAN HARIAN & SURAT PERINTAH LEMBUR */}
      {/* ========================================================================= */}
      <section
        id="form-catatan-harian-manpower"
        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                FORM CATATAN &amp; LEMBUR
              </span>
              <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <span>INPUT CATATAN HARIAN / PENUGASAN LEMBUR</span>
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Dibuat oleh <strong>Administrasi</strong>, diperiksa oleh <strong>Kabag Workshop</strong>, disetujui oleh <strong>HRD</strong>. Durasi lembur dihitung otomatis.
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
                TANGGAL CATATAN / LEMBUR
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>JAM MULAI — JAM SELESAI</span>
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
                  title="Klik untuk mengaktifkan / menonaktifkan jam Fullday kerja (07:00 - 16:00)"
                >
                  <Sun className={`w-3.5 h-3.5 ${isFullday ? 'text-stone-950 fill-stone-950' : 'text-stone-400'}`} />
                  <span>Fitur Fullday: {isFullday ? 'AKTIF (07:00 - 16:00)' : 'NONAKTIF (Kustom Jam)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <span className="block text-[10px] font-mono text-stone-400 mb-1">Jam Mulai:</span>
                  <input
                    type="time"
                    value={isFullday ? '07:00' : jamStart}
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
                  <span className="block text-[10px] font-mono text-stone-400 mb-1">Jam Selesai:</span>
                  <input
                    type="time"
                    value={isFullday ? '16:00' : jamStop}
                    disabled={isFullday}
                    onChange={(e) => setJamStop(e.target.value)}
                    className={`w-full bg-stone-800 border rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [color-scheme:dark] ${
                      isFullday
                        ? 'border-amber-500/40 text-amber-300 bg-amber-950/20 cursor-not-allowed'
                        : 'border-stone-700 text-stone-100'
                    }`}
                  />
                </div>

                {/* ISTIRAHAT */}
                <div>
                  <span className="block text-[10px] font-mono text-stone-400 mb-1 flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-amber-400" />
                    <span>Istirahat:</span>
                  </span>
                  <select
                    value={istirahat}
                    onChange={(e) => setIstirahat(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="-">- (Tanpa Istirahat)</option>
                    <option value="30 Menit">30 Menit</option>
                    <option value="1 Jam">1 Jam (Standar)</option>
                    <option value="1.5 Jam">1.5 Jam</option>
                    <option value="2 Jam">2 Jam</option>
                  </select>
                </div>

                {/* DURASI OTOMATIS */}
                <div className="bg-stone-900 border border-amber-500/30 rounded-xl p-2 text-center">
                  <span className="block text-[9px] font-mono text-amber-400 font-bold uppercase">
                    DURASI DIHITUNG
                  </span>
                  <span className="text-sm font-black font-mono text-amber-300">
                    {activeDuration.formatted}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. KETERANGAN (DROPDOWN: Hadir, Sakit, Ijin, Cuti, Dinas Luar, Tukar jam, Lembur) */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                KETERANGAN STATUS
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
              {keterangan === 'Lembur' && (
                <span className="text-[10px] text-orange-400 font-mono mt-1 block font-bold">
                  * Kategori Lembur: Otomatis masuk ke lembar Surat Perintah Lembur
                </span>
              )}
            </div>

            {/* 6. CATATAN / URAIAN PEKERJAAN */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                CATATAN / URAIAN PEKERJAAN LEMBUR
              </label>
              <input
                id="field-catatan-teks"
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Lembur perbaikan sistem hidrolik Excavator PC200; Tukar shift malam dengan Budi; Penggantian seal cylinder..."
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 7. DIBUAT OLEH (ADMINISTRASI) & 8. APPROVAL (KABAG WORKSHOP) */}
            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-stone-950/80 border border-stone-800 rounded-2xl">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>DIBUAT OLEH: ADMINISTRASI (MODUL 2)</span>
                </label>
                <div className="relative">
                  <select
                    id="select-catatan-dibuat-oleh"
                    value={dibuatOleh}
                    onChange={(e) => setDibuatOleh(e.target.value)}
                    className="w-full bg-stone-800/90 border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-sky-100 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {adminPersonnelList.map((admin) => (
                      <option key={admin.id} value={admin.nama}>
                        {admin.nama} ({admin.jabatan || 'Administrasi'})
                      </option>
                    ))}
                    {!adminPersonnelList.some((a) => a.nama.toLowerCase() === dibuatOleh.toLowerCase()) && (
                      <option value={dibuatOleh}>
                        {dibuatOleh} (Staf Administrasi)
                      </option>
                    )}
                  </select>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block font-mono">
                  * Otomatis memuat personil berjabatan Administrasi dari Modul 2
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DIPERIKSA: KABAG WORKSHOP</span>
                </label>
                <div className="flex items-center justify-between bg-stone-800/90 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs">
                  <span className="font-bold text-emerald-200">
                    {kabagWorkshopLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Penanggung Jawab
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block font-mono">
                  * Otoritas pengesahan operasional workshop
                </span>
              </div>
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
                <span>{editingId ? 'Simpan Perubahan' : 'Simpan Catatan / Lembur'}</span>
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
      {/* 4. TABEL CATATAN HARIAN & LEMBUR MANPOWER */}
      {/* ========================================================================= */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-900">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-stone-100 font-mono tracking-wide">
                TABEL CATATAN HARIAN &amp; LEMBUR MANPOWER
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

            {/* Filter Status Approval */}
            <select
              value={filterApprovalTable}
              onChange={(e) => setFilterApprovalTable(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Status Approval</option>
              <option value="DISETUJUI">Disetujui Kabag Workshop</option>
              <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
            </select>

            {/* Tombol Setujui Semua (Batch Approve per Tanggal) */}
            {canEdit && dailyStats.pendingApprovalCount > 0 && !filterAllDates && (
              <button
                type="button"
                onClick={handleBatchApproveCurrentDate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md whitespace-nowrap"
                title={`Setujui seluruh ${dailyStats.pendingApprovalCount} catatan tanggal ${selectedDate} sebagai Kabag Workshop`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Setujui Semua ({dailyStats.pendingApprovalCount})</span>
              </button>
            )}

            {/* Tombol Cetak Dokumen SURAT PERINTAH LEMBUR */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow-md whitespace-nowrap"
              title="Cetak Surat Perintah Lembur & Catatan Harian Manpower"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Surat Perintah Lembur</span>
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
                <th className="py-3 px-3">JAM MULAI — SELESAI</th>
                <th className="py-3 px-3 text-center">ISTIRAHAT</th>
                <th className="py-3 px-3 text-center">DURASI</th>
                <th className="py-3 px-3">KETERANGAN</th>
                <th className="py-3 px-3">CATATAN / URAIAN</th>
                <th className="py-3 px-3">DIBUAT OLEH</th>
                <th className="py-3 px-3">APPROVAL KABAG</th>
                <th className="py-3 px-3 text-center sticky right-0 bg-stone-950/90 shadow-l">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item, idx) => {
                  const isBeingEdited = editingId === item.id;
                  const isApproved = item.statusApproval === 'DISETUJUI';
                  const durationObj = calculateOvertimeDuration(item.jamStart, item.jamStop, item.istirahat);

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

                      {/* JAM MULAI - SELESAI */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-stone-200 font-semibold">
                            {item.jamStart || '07:00'} - {item.jamStop || '16:00'}
                          </span>
                          {item.isFullday && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Sun className="w-2.5 h-2.5" />
                              <span>FULLDAY</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ISTIRAHAT */}
                      <td className="py-3 px-3 text-center font-mono text-stone-300 whitespace-nowrap">
                        {item.istirahat || '-'}
                      </td>

                      {/* DURASI */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-300 whitespace-nowrap">
                        {item.durasiLembur || durationObj.formatted}
                      </td>

                      {/* KETERANGAN */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderKeteranganBadge(item.keterangan)}
                      </td>

                      {/* CATATAN / URAIAN */}
                      <td className="py-3 px-3 min-w-[180px]">
                        {item.catatan ? (
                          <p className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-900/30 rounded-lg px-2.5 py-1 whitespace-pre-wrap">
                            {item.catatan}
                          </p>
                        ) : (
                          <span className="text-stone-600 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* DIBUAT OLEH (ADMINISTRASI) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sky-200 text-xs">
                            {item.dibuatOleh || 'Staf Administrasi'}
                          </span>
                        </div>
                      </td>

                      {/* APPROVAL (KABAG WORKSHOP) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {isApproved ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>DISETUJUI</span>
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleApprove(item)}
                                  className="text-[10px] text-stone-400 hover:text-rose-400 underline font-mono"
                                  title="Batalkan approval Kabag Workshop"
                                >
                                  Batal
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>MENUNGGU</span>
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleApprove(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                                  title="Setujui catatan harian ini sebagai Kabag Workshop (Dodik Mariyadi)"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Setujui</span>
                                </button>
                              )}
                            </div>
                          )}
                          <span className="text-[10px] text-stone-500 block font-mono">
                            {isApproved
                              ? `${item.disetujuiOleh || kabagWorkshopName} (${item.tglApproval || item.tanggal})`
                              : `Kabag: ${kabagWorkshopName}`}
                          </span>
                        </div>
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
                  <td colSpan={12} className="py-12 text-center text-stone-400 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-stone-300">
                        Belum ada catatan harian / penugasan lembur {filterAllDates ? '' : `untuk tanggal ${selectedDate}`}.
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
      {/* 5. MODAL CETAK LEMBAR DOKUMEN: SURAT PERINTAH LEMBUR */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm overflow-y-auto no-print-backdrop">
          <div className="bg-white text-stone-950 border border-stone-300 rounded-2xl w-full max-w-5xl shadow-2xl my-6 overflow-hidden font-sans flex flex-col max-h-[92vh]">
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 bg-stone-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 font-mono tracking-wide uppercase">
                    PREVIEW CETAK: SURAT PERINTAH LEMBUR
                  </h3>
                  <span className="text-[11px] text-stone-600 font-mono">
                    PT. BATU KALI WELANG AMPUH (ETIKA09) • Tanggal: {formatDisplayDateIndo(selectedDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol Buka Setup Validasi */}
                <button
                  type="button"
                  onClick={() => setShowValidationSetup(!showValidationSetup)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition border ${
                    showValidationSetup
                      ? 'bg-amber-500 text-stone-950 border-amber-600 shadow'
                      : 'bg-stone-200 text-stone-800 hover:bg-stone-300 border-stone-300'
                  }`}
                  title="Atur penandatangan Dibuat Oleh, Diperiksa Oleh, dan Menyetujui (HRD)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Setup Validasi 3 Pihak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="text-stone-500 hover:text-stone-800 p-1.5 rounded-lg hover:bg-stone-200 transition"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Collapsible Setup Validasi 3 Pihak */}
            {showValidationSetup && (
              <div className="p-4 bg-stone-900 text-stone-100 border-b border-stone-800 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>KONFIGURASI SETUP VALIDASI PENANDATANGAN SURAT PERINTAH LEMBUR</span>
                  </div>
                  {validationSavedNotice && (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                      Tersimpan!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  {/* 1. Dibuat Oleh */}
                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-sky-400 uppercase block">
                      1. Dibuat Oleh (Administrasi Workshop)
                    </span>
                    <select
                      value={signatories.pembuatName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          pembuatName: e.target.value,
                          pembuatJabatan: chosen?.jabatan || prev.pembuatJabatan || 'Administrasi Workshop',
                        }));
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih dari Manpower --</option>
                      {manpowerList.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} ({m.jabatan})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={signatories.pembuatJabatan}
                      onChange={(e) => setSignatories((prev) => ({ ...prev, pembuatJabatan: e.target.value }))}
                      placeholder="Jabatan Pembuat"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-[11px] text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* 2. Diperiksa Oleh */}
                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                      2. Diperiksa Oleh (Kabag Workshop)
                    </span>
                    <select
                      value={signatories.diperiksaName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          diperiksaName: e.target.value,
                          diperiksaJabatan: chosen?.jabatan || prev.diperiksaJabatan || 'Kabag Workshop',
                        }));
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih dari Manpower --</option>
                      {manpowerList.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} ({m.jabatan})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={signatories.diperiksaJabatan}
                      onChange={(e) => setSignatories((prev) => ({ ...prev, diperiksaJabatan: e.target.value }))}
                      placeholder="Jabatan Pemeriksa"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-[11px] text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* 3. Menyetujui (HRD) */}
                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-400 uppercase block">
                      3. Menyetujui (HRD / Management)
                    </span>
                    <select
                      value={signatories.menyetujuiName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          menyetujuiName: e.target.value,
                          menyetujuiJabatan: chosen?.jabatan || prev.menyetujuiJabatan || 'HRD / Management',
                        }));
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih dari Manpower --</option>
                      {manpowerList.map((m) => (
                        <option key={m.id} value={m.nama}>
                          {m.nama} ({m.jabatan})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={signatories.menyetujuiJabatan}
                      onChange={(e) => setSignatories((prev) => ({ ...prev, menyetujuiJabatan: e.target.value }))}
                      placeholder="Jabatan Menyetujui (HRD)"
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-[11px] text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSignatories}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Setup Validasi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Toolbar: Filter Bar for Print Content */}
            <div className="px-6 py-2.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-stone-600 font-semibold">Tampilkan di Dokumen:</span>
                <button
                  type="button"
                  onClick={() => setPrintFilterOnlyOvertime(false)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold transition text-xs border ${
                    !printFilterOnlyOvertime
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Semua Catatan ({dailyStats.total} Org)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFilterOnlyOvertime(true)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold transition text-xs border ${
                    printFilterOnlyOvertime
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  Hanya Karyawan Lembur ({dailyStats.lembur} Org)
                </button>
              </div>

              <div className="font-mono text-stone-600 text-[11px]">
                Total Jam Lembur Kumulatif: <strong className="text-orange-700">{dailyStats.totalLemburHoursDecimal} Jam</strong>
              </div>
            </div>

            {/* Document Printable Sheet Scroll Container */}
            <div className="p-6 overflow-y-auto bg-stone-200/70 font-sans printable-report-modal flex-1">
              {/* Paper Element to be Printed */}
              <div
                id="printable-lembur-area"
                className="bg-white text-stone-950 p-7 rounded-xl shadow-md border border-stone-300 space-y-4 max-w-4xl mx-auto"
              >
                {/* Kop Surat PT. BATU KALI WELANG AMPUH (ETIKA09) */}
                <div className="header text-center border-b-2 border-stone-900 pb-3 space-y-0.5">
                  <h2 className="text-base sm:text-lg font-black tracking-wider uppercase font-mono text-stone-950">
                    PT. BATU KALI WELANG AMPUH (ETIKA09)
                  </h2>
                  <h3 className="text-sm font-black font-mono text-stone-900 uppercase tracking-wide">
                    SURAT PERINTAH LEMBUR
                  </h3>
                  <p className="text-[10px] text-stone-600 font-mono">
                    DIVISI OPERATION &amp; WORKSHOP — QUARRY PURWOSARI, PASURUAN • Tanggal: {formatDisplayDateIndo(selectedDate)} ({selectedDate})
                  </p>
                </div>

                {/* Ringkasan Informasi Dokumen Lembur */}
                <div className="summary-box grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="summary-item p-2 rounded border border-stone-300 bg-stone-50">
                    <span className="summary-label text-[9px] text-stone-600 block">TANGGAL PENUGASAN</span>
                    <span className="summary-value font-bold text-stone-900">{selectedDate}</span>
                  </div>
                  <div className="summary-item p-2 rounded border border-stone-300 bg-stone-50">
                    <span className="summary-label text-[9px] text-stone-600 block">TOTAL PERSONIL</span>
                    <span className="summary-value font-bold text-stone-900">{printItems.length} Orang</span>
                  </div>
                  <div className="summary-item p-2 rounded border border-orange-300 bg-orange-50">
                    <span className="summary-label text-[9px] text-orange-800 block">PERSONIL LEMBUR</span>
                    <span className="summary-value font-bold text-orange-900">{dailyStats.lembur} Orang</span>
                  </div>
                  <div className="summary-item p-2 rounded border border-orange-300 bg-orange-50">
                    <span className="summary-label text-[9px] text-orange-800 block">TOTAL JAM LEMBUR</span>
                    <span className="summary-value font-bold text-orange-900">{dailyStats.totalLemburHoursDecimal} Jam</span>
                  </div>
                </div>

                {/* Tabel Rapih Kolom: No, Nama Karyawan, Jam Mulai, Jam Selesai, Istirahat, Durasi, Keterangan, Tandatangan */}
                <div className="border border-stone-400 rounded overflow-hidden">
                  <table className="w-full text-left text-[10.5px] border-collapse">
                    <thead className="bg-stone-100 text-stone-900 font-mono font-bold uppercase text-[9.5px] border-b border-stone-400">
                      <tr>
                        <th className="py-2 px-2 text-center w-8">NO</th>
                        <th className="py-2 px-3">NAMA KARYAWAN</th>
                        <th className="py-2 px-2 text-center w-20">JAM MULAI</th>
                        <th className="py-2 px-2 text-center w-20">JAM SELESAI</th>
                        <th className="py-2 px-2 text-center w-16">ISTIRAHAT</th>
                        <th className="py-2 px-2 text-center w-24">DURASI</th>
                        <th className="py-2 px-3">KETERANGAN / PEKERJAAN</th>
                        <th className="py-2 px-3 text-center w-28">TANDATANGAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300 text-[10px]">
                      {printItems.map((item, idx) => {
                        const dur = calculateOvertimeDuration(item.jamStart, item.jamStop, item.istirahat);
                        const isLembur = (item.keterangan || '').toLowerCase() === 'lembur';

                        return (
                          <tr
                            key={item.id}
                            className={idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'}
                          >
                            {/* NO */}
                            <td className="py-2 px-2 text-center font-mono text-stone-600 font-bold">
                              {idx + 1}
                            </td>

                            {/* NAMA KARYAWAN */}
                            <td className="py-2 px-3">
                              <span className="font-bold text-stone-950 block text-[11px]">{item.nama}</span>
                              <span className="text-[9px] text-stone-600 font-mono block">
                                {item.jabatan || 'Workshop'} {item.nik ? `• NIK: ${item.nik}` : ''}
                              </span>
                            </td>

                            {/* JAM MULAI */}
                            <td className="py-2 px-2 text-center font-mono text-stone-900 whitespace-nowrap">
                              {item.jamStart || '07:00'}
                            </td>

                            {/* JAM SELESAI */}
                            <td className="py-2 px-2 text-center font-mono text-stone-900 whitespace-nowrap">
                              {item.jamStop || '16:00'}
                            </td>

                            {/* ISTIRAHAT */}
                            <td className="py-2 px-2 text-center font-mono text-stone-700 whitespace-nowrap">
                              {item.istirahat || '-'}
                            </td>

                            {/* DURASI (OTOMATIS HITUNG) */}
                            <td className="py-2 px-2 text-center font-mono font-bold text-stone-950 whitespace-nowrap bg-stone-50">
                              {item.durasiLembur || dur.formatted}
                            </td>

                            {/* KETERANGAN */}
                            <td className="py-2 px-3">
                              <div className="space-y-0.5">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                  isLembur ? 'bg-orange-100 text-orange-900 border border-orange-300' : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {item.keterangan || 'Lembur'}
                                </span>
                                {item.catatan ? (
                                  <p className="text-[9.5px] text-stone-800 whitespace-pre-wrap leading-tight mt-0.5">
                                    {item.catatan}
                                  </p>
                                ) : (
                                  <span className="text-stone-400 italic text-[9px] block">-</span>
                                )}
                              </div>
                            </td>

                            {/* TANDATANGAN (KOLOM TTD KARYAWAN) */}
                            <td className="py-2 px-2 text-center align-middle">
                              <div className="sign-col-box flex items-center justify-center border border-dashed border-stone-300 rounded h-9 bg-white">
                                <span className="text-[8px] text-stone-400 font-mono italic">Paraf ({idx + 1})</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {printItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                            Tidak ada personil catatan harian / lembur untuk tanggal {selectedDate}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tiga Kolom Validasi Pengesahan: Dibuat Oleh, Diperiksa Oleh, Menyetujui (HRD) */}
                <div className="signatures pt-6 grid grid-cols-3 gap-6 text-center font-mono text-xs">
                  {/* Dibuat Oleh */}
                  <div className="sign-box">
                    <span className="sign-title text-stone-600">Dibuat Oleh:</span>
                    <span className="sign-job font-bold text-stone-900">
                      {signatories.pembuatJabatan || 'Administrasi Workshop'}
                    </span>
                    <div className="sign-space h-14 flex items-end justify-center">
                      <span className="text-[9px] text-stone-400 italic">( Tanda Tangan )</span>
                    </div>
                    <p className="sign-name font-bold text-stone-900 border-t border-stone-800 pt-1 mt-1">
                      {signatories.pembuatName || defaultAdminName}
                    </p>
                  </div>

                  {/* Diperiksa Oleh */}
                  <div className="sign-box">
                    <span className="sign-title text-stone-600">Diperiksa Oleh:</span>
                    <span className="sign-job font-bold text-stone-900">
                      {signatories.diperiksaJabatan || 'Kabag Workshop'}
                    </span>
                    <div className="sign-space h-14 flex items-end justify-center">
                      <span className="text-[9px] text-stone-400 italic">( Tanda Tangan )</span>
                    </div>
                    <p className="sign-name font-bold text-stone-900 border-t border-stone-800 pt-1 mt-1">
                      {signatories.diperiksaName || kabagWorkshopName}
                    </p>
                  </div>

                  {/* Menyetujui (HRD) */}
                  <div className="sign-box">
                    <span className="sign-title text-stone-600">Menyetujui:</span>
                    <span className="sign-job font-bold text-stone-900">
                      {signatories.menyetujuiJabatan || 'HRD / Management'}
                    </span>
                    <div className="sign-space h-14 flex items-end justify-center">
                      <span className="text-[9px] text-stone-400 italic">( Tanda Tangan &amp; Cap HRD )</span>
                    </div>
                    <p className="sign-name font-bold text-stone-900 border-t border-stone-800 pt-1 mt-1">
                      {signatories.menyetujuiName || 'HRD & GA'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-stone-200 bg-stone-100 shrink-0">
              <span className="text-xs text-stone-600 font-mono hidden sm:inline">
                * Dokumen akan dicetak dalam format lanskap resmi PT. BATU KALI WELANG AMPUH (ETIKA09)
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-200 hover:bg-stone-300 transition"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDirectPrintElement(
                      'printable-lembur-area',
                      `Surat_Perintah_Lembur_PT_BATU_KALI_WELANG_AMPUH_ETIKA09_${selectedDate}`
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Surat Perintah Lembur</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
