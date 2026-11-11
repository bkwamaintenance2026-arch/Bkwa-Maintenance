import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownProgressOption,
  BreakdownStatusUnitOption,
  BreakdownComponentOption,
  BreakdownPartJasaItem,
  PartSatuanOption,
  PART_SATUAN_OPTIONS,
  BREAKDOWN_PROGRESS_OPTIONS,
  BREAKDOWN_STATUS_UNIT_OPTIONS,
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  resolveReportSignatories, 
  getSavedReportSignatories, 
  saveReportSignatories 
} from '../../utils/reportSignatories';
import { 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Truck, 
  Search, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert,
  Printer,
  Save,
  X,
  FileText,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Package,
  Trash2,
  User,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Daftar label komponen khusus update pekerjaan sesuai permintaan user
export const WORK_COMPONENT_OPTIONS: string[] = [
  'Engine',
  'Transmisi',
  'Differential & Axel',
  'clutch & PTO',
  'Hydraulic',
  'Electric',
  'Steering System',
  'Brake System',
  'Tyre',
  'Undercurriage',
  'attachment',
];

interface ActiveBreakdownMonitoringSubViewProps {
  units: AssetUnit[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  manpowerList: ManpowerData[];
  onUpdateActivity: (
    id: string,
    updateData: {
      startJob?: string;
      jamStart?: string;
      jamFinish?: string;
      endDate?: string;
      detailKerusakan?: string;
      progress?: BreakdownProgressOption | string;
      statusUnit?: BreakdownStatusUnitOption | string;
      pic1?: string;
      pic2?: string;
      pic3?: string;
      remark?: string;
      partsJasa?: BreakdownPartJasaItem[];
      component?: BreakdownComponentOption | string;
    }
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onDeleteBreakdown?: (id: string) => { success: boolean; message: string };
  onNavigateToHistory?: (record?: BreakdownRecord) => void;
  initialExpandedId?: string | null;
}

export const ActiveBreakdownMonitoringSubView: React.FC<ActiveBreakdownMonitoringSubViewProps> = ({
  units,
  breakdowns,
  currentUser,
  manpowerList,
  onUpdateActivity,
  onDeleteBreakdown,
  onNavigateToHistory,
  initialExpandedId,
}) => {
  // Timer realtime untuk update kalkulasi downtime setiap 60 detik secara otomatis
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // 1 menit
    return () => clearInterval(timer);
  }, []);

  // Filter Search & Sorting
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterKomponen, setFilterKomponen] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DOWNTIME_DESC' | 'DOWNTIME_ASC' | 'UNIT'>('DOWNTIME_DESC');

  // State Expand / Collapse per No MO Unit
  const [expandedMoIds, setExpandedMoIds] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (initialExpandedId) {
      initialSet.add(initialExpandedId);
    }
    return initialSet;
  });

  // Jika initialExpandedId berubah dari luar (misal setelah Input Breakdown)
  useEffect(() => {
    if (initialExpandedId) {
      setExpandedMoIds((prev) => {
        const next = new Set(prev);
        next.add(initialExpandedId);
        return next;
      });
    }
  }, [initialExpandedId]);

  // Toggle satu row MO
  const toggleExpand = (id: string) => {
    setExpandedMoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // State Form Inline Quick Update keyed by breakdown id
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getCurrentTimeString = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  interface InlineFormState {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    component: string;
    detailKerusakan: string;
    progress: BreakdownProgressOption | string;
    statusUnit: BreakdownStatusUnitOption | string;
    pic1: string;
    pic2: string;
    pic3: string;
    remark: string;
    partsJasa: BreakdownPartJasaItem[];
    // Sub-form input penambahan part baru
    newPart: {
      jenis: 'Part' | 'Jasa';
      namaPart: string;
      partNumber: string;
      qty: number | string;
      satuan: PartSatuanOption;
      remark: string;
    };
  }

  const [formInputs, setFormInputs] = useState<Record<string, InlineFormState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Setup Validasi Pengesahan Manual (Dibuat Oleh, Diperiksa Oleh, Disetujui Oleh)
  const resolvedSig = useMemo(() => {
    return resolveReportSignatories(manpowerList, currentUser);
  }, [manpowerList, currentUser]);

  const savedSigConfig = useMemo(() => getSavedReportSignatories(), []);

  const [signatories, setSignatories] = useState({
    pembuatName: savedSigConfig?.pembuatName || resolvedSig.pembuatName || currentUser.nama || 'Administrasi',
    pembuatJabatan: savedSigConfig?.pembuatJabatan || resolvedSig.pembuatJabatan || 'Administrasi',
    diperiksaName: savedSigConfig?.diperiksaName || resolvedSig.diperiksaName || 'Staff Administrasi',
    diperiksaJabatan: savedSigConfig?.diperiksaJabatan || resolvedSig.diperiksaJabatan || 'Administrasi',
    disetujuiName: savedSigConfig?.disetujuiName || resolvedSig.disetujuiName || 'DODIK MARIYADI',
    disetujuiJabatan: savedSigConfig?.disetujuiJabatan || resolvedSig.disetujuiJabatan || 'Kabag Workshop',
  });

  const [showSignatorySetup, setShowSignatorySetup] = useState<boolean>(false);
  const [saveSigSuccess, setSaveSigSuccess] = useState<boolean>(false);

  const handleSaveSignatories = () => {
    saveReportSignatories({
      pembuatName: signatories.pembuatName,
      pembuatJabatan: signatories.pembuatJabatan,
      diperiksaName: signatories.diperiksaName,
      diperiksaJabatan: signatories.diperiksaJabatan,
      disetujuiName: signatories.disetujuiName,
      disetujuiJabatan: signatories.disetujuiJabatan,
    });
    setSaveSigSuccess(true);
    setTimeout(() => setSaveSigSuccess(false), 3000);
  };

  // Modal Print Preview Laporan Monitoring (WYSIWYG)
  const [showMonitoringPrintModal, setShowMonitoringPrintModal] = useState<boolean>(false);

  // Modal Print Per Unit (Single MO)
  const [singlePrintRecord, setSinglePrintRecord] = useState<BreakdownRecord | null>(null);

  // Helper hitung downtime realtime dari awal breakdown
  const calculateDowntime = (tanggal: string, jamBreakdown?: string) => {
    if (!tanggal) {
      return { totalHours: 0, days: 0, remainingHours: 0, minutes: 0, formatted: '-' };
    }

    try {
      const jamStr = jamBreakdown && jamBreakdown.includes(':') ? jamBreakdown : '07:00';
      const [year, month, day] = tanggal.split('-').map(Number);
      const [hour, min] = jamStr.split(':').map(Number);
      const startMs = new Date(year, (month || 1) - 1, day || 1, hour || 0, min || 0).getTime();

      const diffMs = Math.max(0, currentTime - startMs);
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      const remainingMinutes = totalMinutes % 60;

      let formatted = '';
      if (days > 0) {
        formatted += `${days}h `;
      }
      formatted += `${remainingHours}j ${remainingMinutes}m`;

      return {
        totalHours,
        days,
        remainingHours,
        minutes: remainingMinutes,
        formatted,
      };
    } catch {
      return { totalHours: 0, days: 0, remainingHours: 0, minutes: 0, formatted: '-' };
    }
  };

  // Helper hitung durasi jam kerja dari Start Date + Start Time sampai End Date + End Time
  const calculateWorkDuration = (startDate: string, startTime: string, endDate: string, endTime: string): string | null => {
    if (!startDate || !startTime || !endDate || !endTime) return null;
    try {
      const [sY, sM, sD] = startDate.split('-').map(Number);
      const [sH, sMin] = startTime.split(':').map(Number);
      const [eY, eM, eD] = endDate.split('-').map(Number);
      const [eH, eMin] = endTime.split(':').map(Number);

      const startMs = new Date(sY, (sM || 1) - 1, sD || 1, sH || 0, sMin || 0).getTime();
      const endMs = new Date(eY, (eM || 1) - 1, eD || 1, eH || 0, eMin || 0).getTime();

      const diffMs = endMs - startMs;
      if (diffMs <= 0) return null;

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;

      if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
      if (hours > 0) return `${hours} Jam`;
      return `${mins} Menit`;
    } catch {
      return null;
    }
  };

  // Helper mencari update breakdown paling mutakhir
  const getLatestBreakdownUpdate = (b: BreakdownRecord) => {
    const updates = b.riwayatUpdate;
    if (!updates || updates.length === 0) return null;
    if (updates.length === 1) return updates[0];
    return [...updates].sort((x, y) => {
      const timeX = x.createdAt || `${x.startJob || x.tanggal || ''} ${x.jamStart || '00:00'}`;
      const timeY = y.createdAt || `${y.startJob || y.tanggal || ''} ${y.jamStart || '00:00'}`;
      return timeY.localeCompare(timeX);
    })[0];
  };

  // Helper mendapatkan runtutan update dengan pekerjaan terakhir di urutan teratas (#Terbaru)
  const getSortedUpdates = (b: BreakdownRecord) => {
    if (!b.riwayatUpdate || b.riwayatUpdate.length === 0) return [];
    return [...b.riwayatUpdate].sort((x, y) => {
      const timeX = x.createdAt || `${x.startJob || x.tanggal || ''} ${x.jamStart || '00:00'}`;
      const timeY = y.createdAt || `${y.startJob || y.tanggal || ''} ${y.jamStart || '00:00'}`;
      return timeY.localeCompare(timeX); // descending: terbaru di paling atas
    });
  };

  // Unit yang sedang aktif breakdown (status unit dari update breakdown terakhir !== 'READY')
  const activeBreakdowns = useMemo(() => {
    return breakdowns.filter((b) => {
      const latest = getLatestBreakdownUpdate(b);
      const effectiveStatus = (latest?.statusUnit || b.statusUnit || 'BREAKDOWN').toUpperCase().trim();
      return effectiveStatus !== 'READY';
    });
  }, [breakdowns]);

  // Filter & Search data
  const filteredActiveBreakdowns = useMemo(() => {
    return activeBreakdowns.filter((b) => {
      if (filterKomponen !== 'ALL' && (b.component || '') !== filterKomponen) {
        return false;
      }

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase().trim();
        const unit = (b.noUnit || '').toLowerCase();
        const alat = (b.namaAlat || b.noLama || '').toLowerCase();
        const mo = (b.noMaintenanceOrder || b.noNotifikasi || '').toLowerCase();
        const problem = (b.detailProblem || '').toLowerCase();
        const comp = (b.component || '').toLowerCase();
        const bType = (b.breakdownType || '').toLowerCase();

        // Cari juga di rincian update pekerjaan terakhir & mekanik
        const latestUpdate = getLatestBreakdownUpdate(b);
        const job = (latestUpdate?.detailKerusakan || latestUpdate?.detailPekerjaan || '').toLowerCase();
        const pics = `${latestUpdate?.pic1 || ''} ${latestUpdate?.pic2 || ''} ${latestUpdate?.pic3 || ''}`.toLowerCase();

        return (
          unit.includes(kw) ||
          alat.includes(kw) ||
          mo.includes(kw) ||
          problem.includes(kw) ||
          comp.includes(kw) ||
          bType.includes(kw) ||
          job.includes(kw) ||
          pics.includes(kw)
        );
      }

      return true;
    });
  }, [activeBreakdowns, filterKomponen, searchTerm]);

  // Urutkan data berdasarkan kriteria terpilih
  const sortedBreakdowns = useMemo(() => {
    return [...filteredActiveBreakdowns].sort((a, b) => {
      const dtA = calculateDowntime(a.tanggal, a.jamBreakdown).totalHours;
      const dtB = calculateDowntime(b.tanggal, b.jamBreakdown).totalHours;

      if (sortBy === 'DOWNTIME_DESC') {
        return dtB - dtA; // Terlama di atas
      } else if (sortBy === 'DOWNTIME_ASC') {
        return dtA - dtB;
      } else {
        return (a.noUnit || '').localeCompare(b.noUnit || '');
      }
    });
  }, [filteredActiveBreakdowns, sortBy, currentTime]);

  // Statistik Ringkasan Unit Aktif
  const stats = useMemo(() => {
    const total = activeBreakdowns.length;
    let criticalCount = 0; // > 24 jam
    let severeCount = 0;   // > 72 jam
    let sumHours = 0;

    activeBreakdowns.forEach((b) => {
      const dt = calculateDowntime(b.tanggal, b.jamBreakdown);
      sumHours += dt.totalHours;
      if (dt.totalHours >= 24) criticalCount++;
      if (dt.totalHours >= 72) severeCount++;
    });

    const avgHours = total > 0 ? (sumHours / total).toFixed(1) : '0';

    return { total, criticalCount, severeCount, avgHours };
  }, [activeBreakdowns, currentTime]);

  // Daftar Komponen Unik untuk filter
  const componentOptions = useMemo(() => {
    const set = new Set<string>();
    WORK_COMPONENT_OPTIONS.forEach((c) => set.add(c));
    activeBreakdowns.forEach((b) => {
      if (b.component) set.add(b.component);
    });
    return Array.from(set).sort();
  }, [activeBreakdowns]);

  // Daftar Mekanik dari Manpower + "Mekanik Luar"
  const mechanicOptions = useMemo(() => {
    const mechanics: string[] = [];
    const others: string[] = [];

    manpowerList.forEach((m) => {
      if (!m.nama) return;
      const jab = (m.jabatan || '').toUpperCase();
      if (jab.includes('MEKANIK') || jab.includes('HELPER') || jab.includes('WELDER') || jab.includes('PKL') || jab.includes('MAGANG')) {
        mechanics.push(`${m.nama} (${m.jabatan})`);
      } else {
        others.push(`${m.nama} (${m.jabatan})`);
      }
    });

    return {
      topOptions: ['Mekanik Luar'],
      mechanics: mechanics.sort(),
      others: others.sort(),
    };
  }, [manpowerList]);

  // Helper inisialisasi / get state inline form untuk unit tertentu
  const getInlineForm = (b: BreakdownRecord): InlineFormState => {
    if (formInputs[b.id]) {
      return formInputs[b.id];
    }
    const latest = getLatestBreakdownUpdate(b);
    return {
      startDate: getTodayDateString(),
      startTime: getCurrentTimeString(),
      endDate: getTodayDateString(),
      endTime: '',
      component: b.component || 'Engine',
      detailKerusakan: '',
      progress: latest?.progress || b.progress || 'On Progress',
      statusUnit: latest?.statusUnit || b.statusUnit || 'BREAKDOWN',
      pic1: latest?.pic1 || '',
      pic2: latest?.pic2 || '',
      pic3: latest?.pic3 || '',
      remark: '',
      partsJasa: [],
      newPart: {
        jenis: 'Part',
        namaPart: '',
        partNumber: '',
        qty: 1,
        satuan: 'Pcs',
        remark: '',
      },
    };
  };

  const updateInlineFormField = <K extends keyof InlineFormState>(
    bId: string, 
    field: K, 
    value: InlineFormState[K]
  ) => {
    setFormInputs((prev) => {
      const b = breakdowns.find((x) => x.id === bId);
      const current = prev[bId] || (b ? getInlineForm(b) : {
        startDate: getTodayDateString(),
        startTime: getCurrentTimeString(),
        endDate: getTodayDateString(),
        endTime: '',
        component: 'Engine',
        detailKerusakan: '',
        progress: 'On Progress',
        statusUnit: 'BREAKDOWN',
        pic1: '',
        pic2: '',
        pic3: '',
        remark: '',
        partsJasa: [],
        newPart: {
          jenis: 'Part',
          namaPart: '',
          partNumber: '',
          qty: 1,
          satuan: 'Pcs',
          remark: '',
        },
      });

      return {
        ...prev,
        [bId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Handler tambah Spare Part ke tabel inline unit
  const handleAddPartToForm = (bId: string) => {
    const b = breakdowns.find((x) => x.id === bId);
    if (!b) return;
    const form = getInlineForm(b);
    const { newPart, partsJasa } = form;

    if (!newPart.namaPart.trim()) {
      alert('Mohon masukkan Nama Part / Jasa terlebih dahulu!');
      return;
    }

    const newItem: BreakdownPartJasaItem = {
      no: partsJasa.length + 1,
      jenis: newPart.jenis,
      namaPart: newPart.namaPart.trim(),
      partNumber: newPart.partNumber.trim(),
      qty: Number(newPart.qty) > 0 ? Number(newPart.qty) : 1,
      satuan: newPart.satuan,
      remark: newPart.remark.trim(),
    };

    const updatedParts = [...partsJasa, newItem];

    setFormInputs((prev) => ({
      ...prev,
      [bId]: {
        ...form,
        partsJasa: updatedParts,
        newPart: {
          jenis: 'Part',
          namaPart: '',
          partNumber: '',
          qty: 1,
          satuan: 'Pcs',
          remark: '',
        },
      },
    }));
  };

  // Handler hapus Spare Part dari tabel inline unit
  const handleRemovePartFromForm = (bId: string, itemIdx: number) => {
    const b = breakdowns.find((x) => x.id === bId);
    if (!b) return;
    const form = getInlineForm(b);
    const updated = form.partsJasa.filter((_, idx) => idx !== itemIdx).map((item, idx) => ({
      ...item,
      no: idx + 1,
    }));

    updateInlineFormField(bId, 'partsJasa', updated);
  };

  // Handler Submit Quick Update
  const handleSaveInlineUpdate = (b: BreakdownRecord) => {
    const form = getInlineForm(b);
    if (!form.detailKerusakan.trim()) {
      alert('Mohon isi uraian tindakan / detail pekerjaan perbaikan!');
      return;
    }

    setSavingId(b.id);

    try {
      const res = onUpdateActivity(b.id, {
        startJob: form.startDate || getTodayDateString(),
        jamStart: form.startTime || '08:00',
        endDate: form.endDate || form.startDate || getTodayDateString(),
        jamFinish: form.endTime || '',
        component: form.component || b.component || 'Engine',
        detailKerusakan: form.detailKerusakan.trim(),
        progress: form.progress,
        statusUnit: form.statusUnit,
        pic1: form.pic1.trim(),
        pic2: form.pic2.trim(),
        pic3: form.pic3.trim(),
        remark: form.remark.trim(),
        partsJasa: form.partsJasa.length > 0 ? form.partsJasa : undefined,
      });

      if (res.success) {
        // Reset form input untuk unit ini
        setFormInputs((prev) => {
          const next = { ...prev };
          delete next[b.id];
          return next;
        });

        if (form.statusUnit === 'READY') {
          setToastMessage({
            text: `Unit ${b.noUnit} telah diupdate menjadi READY dan otomatis tersimpan di History Breakdown!`,
            type: 'success',
          });
        } else {
          setToastMessage({
            text: `Update pekerjaan untuk ${b.noUnit} (MO: ${b.noMaintenanceOrder || b.noNotifikasi}) berhasil disimpan!`,
            type: 'success',
          });
        }

        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(res.message || 'Gagal menyimpan update breakdown.');
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err?.message || 'Gagal menyimpan'}`);
    } finally {
      setSavingId(null);
    }
  };

  // Handler Expand All / Collapse All
  const handleToggleExpandAll = () => {
    if (expandedMoIds.size === sortedBreakdowns.length) {
      setExpandedMoIds(new Set());
    } else {
      const allIds = new Set(sortedBreakdowns.map((b) => b.id));
      setExpandedMoIds(allIds);
    }
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
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8.5px; font-weight: bold; border: 1px solid #aaa; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 6px; margin-bottom: 8px; }
            .header h2 { margin: 0; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
            .header h3 { margin: 3px 0 0 0; font-size: 12px; font-weight: bold; }
            .header p { margin: 2px 0 0 0; font-size: 9px; color: #555; }
            .kpi-row { display: flex; gap: 8px; margin-bottom: 8px; }
            .kpi-col { flex: 1; border: 1px solid #666; padding: 4px; text-align: center; border-radius: 4px; }
            .kpi-label { font-size: 8px; color: #555; font-weight: bold; }
            .kpi-value { font-size: 12px; font-weight: bold; }
            .sub-timeline { background: #f9fafb; margin: 4px 0; border: 1px dashed #888; padding: 4px; }
            .signatures { margin-top: 25px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
            .sign-box { width: 200px; }
            .sign-title { font-size: 9px; color: #444; display: block; }
            .sign-job { font-size: 9.5px; font-weight: bold; color: #222; display: block; margin-top: 1px; }
            .sign-space { height: 48px; }
            .sign-name { border-top: 1px solid #333; padding-top: 3px; font-weight: bold; font-size: 10px; }
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

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-900 border border-emerald-500/50 text-emerald-300 shadow-2xl shadow-emerald-500/10 font-mono text-xs animate-slide-up">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-stone-400 hover:text-stone-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Widget Live Monitoring */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                LIVE REALTIME MONITORING
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                PT BATU KALI WELANG AMPUH (ETIKA09)
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-stone-500 font-bold">Tipe:</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold" title="Schedule">SC</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold" title="Unschedule">Uns</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold" title="Accident">Acc</span>
              </div>
            </div>
            <h2 className="text-base sm:text-lg font-black font-mono text-stone-100 tracking-wide mt-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>DASHBOARD MAINTENANCE &amp; MONITORING BREAKDOWN</span>
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5 max-w-2xl">
              Tracking downtime aktual, update Start/End Date-Time, Komponen sistem, penugasan PIC (Mekanik Luar), input Spare Part langsung di bawah No. MO (+), dan setup validasi 3 pihak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Tombol Print & Preview Laporan Monitoring (WYSIWYG) */}
            <button
              id="btn-print-preview-monitoring"
              type="button"
              onClick={() => setShowMonitoringPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
              title="Print dan Preview Laporan Harian Monitoring Breakdown sesuai tampilan layar"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview Laporan</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTime(Date.now())}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-mono font-bold transition cursor-pointer"
              title="Perbarui Waktu Sekarang"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkasan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-4 border-t border-stone-800/80 mt-4">
          <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[9px] font-mono text-stone-400 block mb-0.5">TOTAL UNIT BREAKDOWN</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-stone-100">{stats.total}</span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">Unit Aktif</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[9px] font-mono text-amber-400 block mb-0.5 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
              <span>DOWNTIME &gt; 24 JAM</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-amber-300">{stats.criticalCount}</span>
              <span className="text-[10px] font-mono text-stone-500">Unit</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[9px] font-mono text-rose-400 block mb-0.5 flex items-center gap-1">
              <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
              <span>KRITIS (&gt; 72 JAM)</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-rose-400">{stats.severeCount}</span>
              <span className="text-[10px] font-mono text-stone-500">Unit</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[9px] font-mono text-blue-400 block mb-0.5">RATA-RATA DOWNTIME</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-blue-400">{stats.avgHours}</span>
              <span className="text-[10px] font-mono text-stone-500">Jam / Unit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Kontrol Pencarian, dan Tombol Expand/Collapse All */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Unit, No MO, Problem, PIC..."
              className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-amber-300 text-xs font-mono font-bold transition cursor-pointer"
            title={expandedMoIds.size === sortedBreakdowns.length ? "Tutup semua rincian update" : "Buka semua rincian update"}
          >
            {expandedMoIds.size === sortedBreakdowns.length ? (
              <>
                <Minus className="w-3 h-3 text-amber-400" />
                <span>Tutup Semua (-)</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 text-amber-400" />
                <span>Buka Semua (+)</span>
              </>
            )}
          </button>

          <select
            value={filterKomponen}
            onChange={(e) => setFilterKomponen(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Komponen</option>
            {componentOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="DOWNTIME_DESC">Downtime Terlama</option>
            <option value="DOWNTIME_ASC">Downtime Terpendek</option>
            <option value="UNIT">Nomor Unit</option>
          </select>
        </div>
      </div>

      {/* Tabel Bertingkat Dashboard Maintenance & Monitoring Breakdown */}
      {/* Dibuat pas layar laptop/PC tanpa geser scrollbar horizontal */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl shadow-xl overflow-hidden w-full">
        {sortedBreakdowns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-800 m-4 rounded-xl bg-stone-950/40">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-mono font-bold text-stone-100">Semua Unit Dalam Kondisi READY</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto font-sans">
              Tidak ada unit yang sedang mengalami breakdown saat ini. Seluruh riwayat tersimpan permanen di menu History Breakdown.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-stone-300 table-auto sm:table-fixed">
            <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
              <tr>
                <th className="p-2 w-8 text-center">+</th>
                <th className="p-2 w-7 text-center">No</th>
                <th className="p-2 w-28">Unit &amp; Tipe</th>
                <th className="p-2 w-28">Reff No. MO</th>
                <th className="p-2 w-24">Mulai BD</th>
                <th className="p-2 w-48">Problem &amp; Komponen</th>
                <th className="p-2 w-48">Pekerjaan Terakhir</th>
                <th className="p-2 w-28">PIC Mekanik</th>
                <th className="p-2 w-24">Downtime</th>
                <th className="p-2 w-24">Status</th>
                <th className="p-2 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
              {sortedBreakdowns.map((b, idx) => {
                const isExpanded = expandedMoIds.has(b.id);
                const dt = calculateDowntime(b.tanggal, b.jamBreakdown);
                const isSevere = dt.totalHours >= 72;
                const isCritical = dt.totalHours >= 24 && dt.totalHours < 72;

                // Ambil data mutakhir strictly dari riwayatUpdate breakdown terakhir
                const latestUpdate = getLatestBreakdownUpdate(b);
                const sortedUpdates = getSortedUpdates(b);

                const lastJob = latestUpdate
                  ? (latestUpdate.detailKerusakan || latestUpdate.detailPekerjaan || '-')
                  : (b.detailKerusakan || b.detailProblem || '-');

                const rawPics = latestUpdate
                  ? [latestUpdate.pic1, latestUpdate.pic2, latestUpdate.pic3].filter((p) => Boolean(p && p.trim())).join(', ')
                  : '';
                const mechanics = rawPics || '-';

                const currentProgress = latestUpdate?.progress || b.progress || 'On Progress';
                const currentStatus = (latestUpdate?.statusUnit || b.statusUnit || 'BREAKDOWN').toUpperCase().trim();

                // Tipe Breakdown: Schedule : SC, Unschedule : Uns, Accident : Acc
                const typeRaw = (b.breakdownType || 'UNSCHEDULE').toUpperCase().trim();
                const typeShort = typeRaw === 'SCHEDULE' ? 'SC' : typeRaw === 'ACCIDENT' ? 'Acc' : 'Uns';
                const typeColor =
                  typeRaw === 'SCHEDULE'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : typeRaw === 'ACCIDENT'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                const inlineForm = getInlineForm(b);
                const workDurationPreview = calculateWorkDuration(
                  inlineForm.startDate,
                  inlineForm.startTime,
                  inlineForm.endDate,
                  inlineForm.endTime
                );

                return (
                  <React.Fragment key={b.id}>
                    {/* Baris Utama (Level 1) */}
                    <tr className={`hover:bg-stone-800/40 transition group ${isExpanded ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : ''}`}>
                      {/* 1. Tombol Collapse / Expand (+) */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(b.id)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition cursor-pointer mx-auto ${
                            isExpanded
                              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                              : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700'
                          }`}
                          title={isExpanded ? "Tutup Rincian Update" : "Buka Update Pekerjaan (+)"}
                        >
                          {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* 2. No */}
                      <td className="p-2 text-center text-stone-500 text-[10px]">
                        {idx + 1}
                      </td>

                      {/* 3. Unit Alat & Tipe */}
                      <td className="p-2">
                        <div className="flex items-center gap-1.5 font-bold text-stone-100 text-xs">
                          <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{b.noUnit}</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold border ${typeColor}`}>
                            {typeShort}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[110px]" title={b.namaAlat || b.noLama || '-'}>
                          {b.namaAlat || b.noLama || '-'}
                        </div>
                      </td>

                      {/* 4. Reff No MO */}
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => setSinglePrintRecord(b)}
                          className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] cursor-pointer"
                          title="Klik untuk cetak SPK & Log Perbaikan Unit ini"
                        >
                          <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="underline decoration-dotted underline-offset-2 truncate">
                            {b.noMaintenanceOrder || b.noNotifikasi}
                          </span>
                        </button>
                        <span className="text-[9px] text-stone-500 block">
                          Notif: {b.noNotifikasi}
                        </span>
                      </td>

                      {/* 5. Mulai Breakdown */}
                      <td className="p-2">
                        <div className="text-stone-200 text-[10px]">{b.tanggal}</div>
                        <div className="text-[9px] text-amber-400/90 font-bold">
                          pk {b.jamBreakdown || '-'}
                        </div>
                      </td>

                      {/* 6. Komponen & Problem Awal */}
                      <td className="p-2">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/50 mb-0.5">
                          {b.component || 'Other'}
                        </span>
                        <div className="text-stone-300 font-sans line-clamp-2 text-[10px] leading-tight" title={b.detailProblem}>
                          {b.detailProblem || '-'}
                        </div>
                      </td>

                      {/* 7. Pekerjaan Terakhir */}
                      <td className="p-2">
                        <div className="font-sans text-stone-100 line-clamp-2 text-[10px] leading-tight" title={lastJob}>
                          {lastJob}
                        </div>
                        {latestUpdate?.tanggal && (
                          <span className="text-[9px] text-stone-500 font-mono mt-0.5 block truncate">
                            Upd: {latestUpdate.tanggal} {latestUpdate.jamStart ? `pk ${latestUpdate.jamStart}` : ''}
                          </span>
                        )}
                      </td>

                      {/* 8. PIC Mekanik */}
                      <td className="p-2 font-sans">
                        <div className="text-stone-200 font-semibold text-[10px] truncate max-w-[110px]" title={mechanics}>
                          {mechanics}
                        </div>
                      </td>

                      {/* 9. Realtime Downtime Counter */}
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                            isSevere
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>{dt.formatted}</span>
                        </span>
                      </td>

                      {/* 10. Status Unit & Progress */}
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold block w-fit ${
                            currentStatus === 'LIMIT OPERASI'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {currentStatus}
                        </span>
                        <div className="text-[9px] text-stone-400 mt-0.5 truncate max-w-[90px]">
                          {currentProgress}
                        </div>
                      </td>

                      {/* 11. Aksi */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(b.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                              isExpanded
                                ? 'bg-amber-500 text-stone-950'
                                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30'
                            }`}
                            title="Buka form input update pekerjaan bertingkat"
                          >
                            <span>{isExpanded ? 'Tutup' : 'Update'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSinglePrintRecord(b)}
                            className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition cursor-pointer"
                            title="Print SPK & Log Unit ini"
                          >
                            <Printer className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Baris Bertingkat (Level 2: Form Inline Quick Update & Tabel Runtutan Update) */}
                    {isExpanded && (
                      <tr className="bg-stone-950/95 border-b border-stone-800">
                        <td colSpan={11} className="p-3 sm:p-4">
                          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-2xl space-y-4 border-l-4 border-l-amber-500 w-full">
                            {/* Header Bagian Rincian */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                                  <Wrench className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold font-mono text-stone-100 flex items-center gap-2 flex-wrap">
                                    <span>UPDATE PROGRES PERBAIKAN: {b.noUnit} ({b.namaAlat || '-'})</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      MO: {b.noMaintenanceOrder || b.noNotifikasi}
                                    </span>
                                  </h4>
                                  <p className="text-[10px] text-stone-400 mt-0.5 font-sans">
                                    Problem Awal: <span className="text-rose-300 font-semibold">{b.detailProblem || '-'}</span> ({b.component || 'Other'}) • Downtime Berjalan: <span className="text-amber-400 font-bold">{dt.formatted}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSinglePrintRecord(b)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-stone-300 hover:text-amber-300 text-[10px] font-mono font-bold transition cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print SPK Unit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(b.id)}
                                  className="p-1 rounded-lg bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200"
                                  title="Tutup Panel Ini"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Form Cepat Input Update Progress */}
                            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                                  <Save className="w-3.5 h-3.5" />
                                  <span>FORM UPDATE PEKERJAAN &amp; PENUGASAN PIC</span>
                                </span>
                                {workDurationPreview && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    ⏱ Durasi Kerja: {workDurationPreview}
                                  </span>
                                )}
                              </div>

                              {/* BARIS 1: Start Date, Start Time, End Date, End Time */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {/* Start Date */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    Start Date <span className="text-amber-400">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={inlineForm.startDate}
                                    onChange={(e) => updateInlineFormField(b.id, 'startDate', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>

                                {/* Start Time (24 Jam) */}
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[9px] font-mono text-amber-400 font-bold">
                                      Start Time (24 Jam) *
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => updateInlineFormField(b.id, 'startTime', getCurrentTimeString())}
                                      className="text-[9px] font-mono text-stone-500 hover:text-amber-300"
                                    >
                                      Sekarang
                                    </button>
                                  </div>
                                  <input
                                    type="time"
                                    value={inlineForm.startTime}
                                    onChange={(e) => updateInlineFormField(b.id, 'startTime', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>

                                {/* End Date */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={inlineForm.endDate}
                                    onChange={(e) => updateInlineFormField(b.id, 'endDate', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>

                                {/* End Time (24 Jam) */}
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[9px] font-mono text-amber-400 font-bold">
                                      End Time (24 Jam)
                                    </label>
                                    <div className="flex items-center gap-1 text-[9px] font-mono">
                                      <button
                                        type="button"
                                        onClick={() => updateInlineFormField(b.id, 'endTime', getCurrentTimeString())}
                                        className="text-stone-500 hover:text-amber-300"
                                      >
                                        Sekarang
                                      </button>
                                      {inlineForm.endTime && (
                                        <button
                                          type="button"
                                          onClick={() => updateInlineFormField(b.id, 'endTime', '')}
                                          className="text-rose-400 hover:text-rose-300"
                                        >
                                          Clr
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="time"
                                    value={inlineForm.endTime}
                                    onChange={(e) => updateInlineFormField(b.id, 'endTime', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* BARIS 2: Komponen Sistem, PIC 1, PIC 2, PIC 3, Progress & Status Unit */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                                {/* Komponen Sistem (Permintaan 3: Engine, Transmisi, Differential & Axel, clutch & PTO, Hydraulic, Electric, Steering System, Brake System, Tyre, Undercurriage, attachment) */}
                                <div>
                                  <label className="text-[9px] font-mono text-amber-400 block mb-0.5 font-bold">
                                    Komponen Sistem *
                                  </label>
                                  <select
                                    value={inlineForm.component}
                                    onChange={(e) => updateInlineFormField(b.id, 'component', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  >
                                    {WORK_COMPONENT_OPTIONS.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                    {inlineForm.component && !WORK_COMPONENT_OPTIONS.includes(inlineForm.component) && (
                                      <option value={inlineForm.component}>{inlineForm.component}</option>
                                    )}
                                  </select>
                                </div>

                                {/* PIC 1 */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5 font-bold">
                                    PIC 1 (Lead Mekanik)
                                  </label>
                                  <select
                                    value={inlineForm.pic1}
                                    onChange={(e) => updateInlineFormField(b.id, 'pic1', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  >
                                    <option value="">-- Pilih PIC 1 --</option>
                                    <option value="Mekanik Luar">🔧 Mekanik Luar (Pihak Ke-3 / Vendor)</option>
                                    <optgroup label="Teknisi & Mekanik Internal">
                                      {mechanicOptions.mechanics.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </optgroup>
                                    {mechanicOptions.others.length > 0 && (
                                      <optgroup label="Manpower Lainnya">
                                        {mechanicOptions.others.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* PIC 2 */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    PIC 2 (Mekanik / Helper)
                                  </label>
                                  <select
                                    value={inlineForm.pic2}
                                    onChange={(e) => updateInlineFormField(b.id, 'pic2', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  >
                                    <option value="">-- Pilih PIC 2 --</option>
                                    <option value="Mekanik Luar">🔧 Mekanik Luar (Pihak Ke-3 / Vendor)</option>
                                    <optgroup label="Teknisi & Mekanik Internal">
                                      {mechanicOptions.mechanics.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </optgroup>
                                    {mechanicOptions.others.length > 0 && (
                                      <optgroup label="Manpower Lainnya">
                                        {mechanicOptions.others.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* PIC 3 */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    PIC 3 (Helper / PKL)
                                  </label>
                                  <select
                                    value={inlineForm.pic3}
                                    onChange={(e) => updateInlineFormField(b.id, 'pic3', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  >
                                    <option value="">-- Pilih PIC 3 --</option>
                                    <option value="Mekanik Luar">🔧 Mekanik Luar (Pihak Ke-3 / Vendor)</option>
                                    <optgroup label="Teknisi & Mekanik Internal">
                                      {mechanicOptions.mechanics.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </optgroup>
                                    {mechanicOptions.others.length > 0 && (
                                      <optgroup label="Manpower Lainnya">
                                        {mechanicOptions.others.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* Progress */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    Progress Pekerjaan
                                  </label>
                                  <select
                                    value={inlineForm.progress}
                                    onChange={(e) => updateInlineFormField(b.id, 'progress', e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                  >
                                    {BREAKDOWN_PROGRESS_OPTIONS.map((p) => (
                                      <option key={p} value={p}>{p}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Status Unit (BREAKDOWN / LIMIT OPERASI / READY) */}
                                <div>
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5 font-bold">
                                    Status Unit
                                  </label>
                                  <select
                                    value={inlineForm.statusUnit}
                                    onChange={(e) => updateInlineFormField(b.id, 'statusUnit', e.target.value)}
                                    className={`w-full border rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:outline-none ${
                                      inlineForm.statusUnit === 'READY'
                                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 focus:ring-emerald-400'
                                        : inlineForm.statusUnit === 'LIMIT OPERASI'
                                        ? 'bg-amber-950/80 text-amber-300 border-amber-500 focus:ring-amber-400'
                                        : 'bg-rose-950/80 text-rose-300 border-rose-500 focus:ring-rose-400'
                                    }`}
                                  >
                                    {BREAKDOWN_STATUS_UNIT_OPTIONS.map((st) => (
                                      <option key={st} value={st}>{st}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* BARIS 3: Tindakan & Remark */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                                <div className="lg:col-span-7">
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5 font-semibold">
                                    Tindakan / Detail Pekerjaan Dilakukan *
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={inlineForm.detailKerusakan}
                                    onChange={(e) => updateInlineFormField(b.id, 'detailKerusakan', e.target.value)}
                                    placeholder="Contoh: Penggantian filter solar, perbaikan silinder hidrolik, bleeding sistem..."
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none font-sans"
                                  />
                                </div>

                                <div className="lg:col-span-5">
                                  <label className="text-[9px] font-mono text-stone-400 block mb-0.5">
                                    Catatan Tambahan / Remark
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={inlineForm.remark}
                                    onChange={(e) => updateInlineFormField(b.id, 'remark', e.target.value)}
                                    placeholder="Catatan tambahan, instruksi keselamatan, atau kendala lapangan..."
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none font-sans"
                                  />
                                </div>
                              </div>

                              {/* ================= TABEL PENAMBAHAN SPARE PART LANGSUNG ================= */}
                              <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-mono font-bold text-amber-400">
                                      PENAMBAHAN SPARE PART &amp; JASA (INPUT LANGSUNG SAAT PEKERJAAN)
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-stone-400">
                                    {inlineForm.partsJasa.length} Item Ditambahkan
                                  </span>
                                </div>

                                {/* Form Input Baris Baru Part */}
                                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                                  <div className="sm:col-span-2">
                                    <label className="text-[9px] font-mono text-stone-400 block mb-0.5">Jenis</label>
                                    <select
                                      value={inlineForm.newPart.jenis}
                                      onChange={(e) => {
                                        const np = { ...inlineForm.newPart, jenis: e.target.value as 'Part' | 'Jasa' };
                                        updateInlineFormField(b.id, 'newPart', np);
                                      }}
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      <option value="Part">Part</option>
                                      <option value="Jasa">Jasa</option>
                                    </select>
                                  </div>

                                  <div className="sm:col-span-4">
                                    <label className="text-[9px] font-mono text-stone-400 block mb-0.5">Nama Part / Jasa</label>
                                    <input
                                      type="text"
                                      value={inlineForm.newPart.namaPart}
                                      onChange={(e) => {
                                        const np = { ...inlineForm.newPart, namaPart: e.target.value };
                                        updateInlineFormField(b.id, 'newPart', np);
                                      }}
                                      placeholder="Contoh: Filter Oli / Rekondisi Silinder"
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="text-[9px] font-mono text-stone-400 block mb-0.5">Part Number</label>
                                    <input
                                      type="text"
                                      value={inlineForm.newPart.partNumber}
                                      onChange={(e) => {
                                        const np = { ...inlineForm.newPart, partNumber: e.target.value };
                                        updateInlineFormField(b.id, 'newPart', np);
                                      }}
                                      placeholder="P/N (opsional)"
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-mono placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>

                                  <div className="sm:col-span-1">
                                    <label className="text-[9px] font-mono text-stone-400 block mb-0.5">Qty</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={inlineForm.newPart.qty}
                                      onChange={(e) => {
                                        const np = { ...inlineForm.newPart, qty: e.target.value };
                                        updateInlineFormField(b.id, 'newPart', np);
                                      }}
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                                    />
                                  </div>

                                  <div className="sm:col-span-1">
                                    <label className="text-[9px] font-mono text-stone-400 block mb-0.5">Satuan</label>
                                    <select
                                      value={inlineForm.newPart.satuan}
                                      onChange={(e) => {
                                        const np = { ...inlineForm.newPart, satuan: e.target.value as PartSatuanOption };
                                        updateInlineFormField(b.id, 'newPart', np);
                                      }}
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-1 py-1 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      {PART_SATUAN_OPTIONS.map((sat) => (
                                        <option key={sat} value={sat}>{sat}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-2 sm:col-span-2 flex items-end">
                                    <button
                                      type="button"
                                      onClick={() => handleAddPartToForm(b.id)}
                                      className="w-full py-1.5 px-2 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Tambah Part</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Tabel List Part yang Ditambahkan */}
                                {inlineForm.partsJasa.length > 0 && (
                                  <div className="border border-stone-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead className="bg-stone-950 text-[9px] uppercase text-stone-400 border-b border-stone-800">
                                        <tr>
                                          <th className="p-1.5 w-8 text-center">No</th>
                                          <th className="p-1.5 w-16">Jenis</th>
                                          <th className="p-1.5">Nama Part / Jasa</th>
                                          <th className="p-1.5">Part Number</th>
                                          <th className="p-1.5 text-right w-14">Qty</th>
                                          <th className="p-1.5 w-16">Satuan</th>
                                          <th className="p-1.5 text-center w-12">Hapus</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-800 text-[10px]">
                                        {inlineForm.partsJasa.map((item, pIdx) => (
                                          <tr key={pIdx} className="hover:bg-stone-800/40">
                                            <td className="p-1.5 text-center text-stone-500">{pIdx + 1}</td>
                                            <td className="p-1.5">
                                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                item.jenis === 'Part' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                                              }`}>
                                                {item.jenis}
                                              </span>
                                            </td>
                                            <td className="p-1.5 font-bold text-stone-100">{item.namaPart}</td>
                                            <td className="p-1.5 text-stone-400">{item.partNumber || '-'}</td>
                                            <td className="p-1.5 text-right font-bold text-amber-300">{item.qty}</td>
                                            <td className="p-1.5 text-stone-300">{item.satuan}</td>
                                            <td className="p-1.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePartFromForm(b.id, pIdx)}
                                                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                                                title="Hapus Part"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Tombol Simpan & Banner Peringatan READY */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                <div className="text-[10px] font-mono text-stone-400">
                                  {inlineForm.statusUnit === 'READY' ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Unit akan dinyatakan READY, downtime selesai, dan diarsipkan ke History Breakdown.
                                    </span>
                                  ) : (
                                    <span>*Data perbaikan dan part akan langsung tersimpan ke log unit ini.</span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={savingId === b.id}
                                  onClick={() => handleSaveInlineUpdate(b)}
                                  className={`py-2 px-5 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                                    inlineForm.statusUnit === 'READY'
                                      ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                                  }`}
                                >
                                  {savingId === b.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Menyimpan Update...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      <span>{inlineForm.statusUnit === 'READY' ? 'Simpan & Nyatakan READY' : 'Simpan Update Pekerjaan'}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Tabel Runtutan Riwayat Update Pekerjaan (Paling Atas = Terakhir / #Terbaru) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-stone-300 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span>RUNTUTAN RIWAYAT UPDATE PEKERJAAN (Paling Atas = Pekerjaan Terakhir)</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-400">
                                  Total: {sortedUpdates.length} Kali Update
                                </span>
                              </div>

                              {sortedUpdates.length === 0 ? (
                                <div className="text-center py-5 border border-dashed border-stone-800 rounded-xl bg-stone-950/50 text-xs font-mono text-stone-500">
                                  Belum ada log update pekerjaan. Silakan input update pertama pada form di atas.
                                </div>
                              ) : (
                                <div className="border border-stone-800 rounded-xl overflow-hidden">
                                  <table className="w-full text-left text-xs text-stone-300 font-mono">
                                    <thead className="bg-stone-950 text-[10px] uppercase text-stone-400 border-b border-stone-800">
                                      <tr>
                                        <th className="p-2 w-16 text-center">Urutan</th>
                                        <th className="p-2 w-32">Waktu Pengerjaan</th>
                                        <th className="p-2">Tindakan / Detail Pekerjaan</th>
                                        <th className="p-2 w-24">Progress</th>
                                        <th className="p-2 w-24">Status</th>
                                        <th className="p-2 w-32">PIC Teknisi</th>
                                        <th className="p-2">Remark &amp; Part</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-800/60 text-[10px]">
                                      {sortedUpdates.map((upd, uIdx) => {
                                        const isLatest = uIdx === 0;
                                        const pics = [upd.pic1, upd.pic2, upd.pic3].filter(Boolean).join(', ') || '-';
                                        const jobDesc = upd.detailKerusakan || upd.detailPekerjaan || '-';
                                        const hasParts = upd.partsJasa && upd.partsJasa.length > 0;

                                        return (
                                          <tr
                                            key={upd.id || `${b.id}_upd_${uIdx}`}
                                            className={isLatest ? 'bg-amber-950/25 font-semibold' : 'hover:bg-stone-800/30'}
                                          >
                                            <td className="p-2 text-center whitespace-nowrap">
                                              {isLatest ? (
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                  #Terbaru
                                                </span>
                                              ) : (
                                                <span className="text-stone-500">
                                                  #{sortedUpdates.length - uIdx}
                                                </span>
                                              )}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                              <div className="text-stone-200">{upd.tanggal || upd.startJob}</div>
                                              <div className="text-[9px] text-amber-400">
                                                {upd.jamStart || '-'} {upd.jamFinish ? `s/d ${upd.jamFinish}` : ''}
                                              </div>
                                              {upd.endDate && upd.endDate !== upd.startJob && (
                                                <div className="text-[8.5px] text-stone-500">
                                                  s/d {upd.endDate}
                                                </div>
                                              )}
                                            </td>
                                            <td className="p-2 font-sans text-stone-100 text-xs">
                                              {jobDesc}
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                              <span className="text-stone-300 text-[10px]">
                                                {upd.progress || '-'}
                                              </span>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                              <span
                                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                  upd.statusUnit === 'READY'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                    : upd.statusUnit === 'LIMIT OPERASI'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                }`}
                                              >
                                                {upd.statusUnit || 'BREAKDOWN'}
                                              </span>
                                            </td>
                                            <td className="p-2 font-sans text-stone-200 text-[10px]">
                                              {pics}
                                            </td>
                                            <td className="p-2 font-sans text-[10px]">
                                              {upd.remark && (
                                                <div className="text-stone-400 mb-0.5">{upd.remark}</div>
                                              )}
                                              {hasParts && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                  <span className="text-[9px] font-mono text-amber-400 font-bold">Part:</span>
                                                  {upd.partsJasa?.map((pj, pjIdx) => (
                                                    <span key={pjIdx} className="px-1 py-0.2 rounded bg-stone-800 text-stone-200 border border-stone-700 text-[9px] font-mono">
                                                      {pj.namaPart} ({pj.qty} {pj.satuan})
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL WYSIWYG PRINT & PREVIEW LAPORAN MONITORING ================= */}
      {showMonitoringPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print-backdrop">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950 no-print flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-stone-100">
                    PRINT PREVIEW LAPORAN MONITORING BREAKDOWN &amp; DOWNTIME
                  </h3>
                  <p className="text-[10px] text-stone-400 font-sans">
                    PT BATU KALI WELANG AMPUH (ETIKA09) • Prinsip WYSIWYG
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol Setup Validasi Manual */}
                <button
                  type="button"
                  onClick={() => setShowSignatorySetup(!showSignatorySetup)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                    showSignatorySetup 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                      : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-amber-500/50'
                  }`}
                  title="Atur penandatangan Dibuat Oleh, Diperiksa Oleh, dan Disetujui Oleh"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Setup Validasi</span>
                  {showSignatorySetup ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectPrintElement('printable-monitoring-report-area', 'Laporan_Monitoring_Breakdown_PT_BATU_KALI_WELANG_AMPUH_ETIKA09')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonitoringPrintModal(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Form Setup Validasi Manual */}
            {showSignatorySetup && (
              <div className="p-3.5 bg-stone-950 border-b border-stone-800 space-y-3 no-print animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" />
                    <span>SETUP VALIDASI LAPORAN (PILIH DARI MANPOWER MODUL 2)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {saveSigSuccess && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Tersimpan ke Sistem!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveSignatories}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition"
                    >
                      <Save className="w-3 h-3" />
                      <span>Simpan Setup</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Dibuat Oleh */}
                  <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-stone-300 block">
                      1. Dibuat Oleh (Pengawas / Admin)
                    </span>
                    <select
                      value={signatories.pembuatName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          pembuatName: e.target.value,
                          pembuatJabatan: chosen?.jabatan || prev.pembuatJabatan || 'Administrasi',
                        }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                      placeholder="Jabatan (cth: Pengawas Maintenance)"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-[11px] text-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* 2. Diperiksa Oleh */}
                  <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-stone-300 block">
                      2. Diperiksa Oleh (Supervisor / Planner)
                    </span>
                    <select
                      value={signatories.diperiksaName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          diperiksaName: e.target.value,
                          diperiksaJabatan: chosen?.jabatan || prev.diperiksaJabatan || 'Supervisor Maintenance',
                        }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                      placeholder="Jabatan (cth: Supervisor Maintenance)"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-[11px] text-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* 3. Disetujui Oleh */}
                  <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-stone-300 block">
                      3. Disetujui Oleh (Kabag Workshop)
                    </span>
                    <select
                      value={signatories.disetujuiName}
                      onChange={(e) => {
                        const chosen = manpowerList.find((m) => m.nama === e.target.value);
                        setSignatories((prev) => ({
                          ...prev,
                          disetujuiName: e.target.value,
                          disetujuiJabatan: chosen?.jabatan || prev.disetujuiJabatan || 'Kabag Workshop',
                        }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                      value={signatories.disetujuiJabatan}
                      onChange={(e) => setSignatories((prev) => ({ ...prev, disetujuiJabatan: e.target.value }))}
                      placeholder="Jabatan (cth: Kabag Workshop)"
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-[11px] text-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document Printable Sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-stone-950 text-stone-200 font-sans space-y-4 printable-report-modal">
              <div id="printable-monitoring-report-area" className="space-y-4 bg-white text-stone-950 p-4 rounded-xl">
                {/* Kop Surat PT BATU KALI WELANG AMPUH (ETIKA09) */}
                <div className="header text-center border-b-2 border-stone-800 pb-2 space-y-0.5">
                  <h2 className="text-base font-black tracking-wider uppercase font-mono text-stone-900">
                    PT. BATU KALI WELANG AMPUH (ETIKA09)
                  </h2>
                  <h3 className="text-xs font-bold font-mono text-amber-700">
                    LAPORAN MONITORING UNIT BREAKDOWN &amp; REALTIME DOWNTIME ALAT BERAT
                  </h3>
                  <p className="text-[9px] text-stone-600 font-mono">
                    Quarry Purwosari, Pasuruan - Jawa Timur • Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} pk {getCurrentTimeString()} WIB
                  </p>
                </div>

                {/* KPI Ringkasan */}
                <div className="kpi-row grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="kpi-col p-1.5 rounded border border-stone-400 bg-stone-50">
                    <span className="kpi-label text-[9px] text-stone-600 block">TOTAL UNIT BD</span>
                    <span className="kpi-value font-bold text-stone-900">{stats.total} Unit</span>
                  </div>
                  <div className="kpi-col p-1.5 rounded border border-stone-400 bg-stone-50">
                    <span className="kpi-label text-[9px] text-amber-700 block">&gt; 24 JAM</span>
                    <span className="kpi-value font-bold text-amber-800">{stats.criticalCount} Unit</span>
                  </div>
                  <div className="kpi-col p-1.5 rounded border border-stone-400 bg-stone-50">
                    <span className="kpi-label text-[9px] text-rose-700 block">KRITIS (&gt; 72 JAM)</span>
                    <span className="kpi-value font-bold text-rose-800">{stats.severeCount} Unit</span>
                  </div>
                  <div className="kpi-col p-1.5 rounded border border-stone-400 bg-stone-50">
                    <span className="kpi-label text-[9px] text-blue-700 block">RATA-RATA DOWNTIME</span>
                    <span className="kpi-value font-bold text-blue-900">{stats.avgHours} Jam</span>
                  </div>
                </div>

                {/* Tabel Cetak */}
                <div className="border border-stone-400 rounded overflow-hidden">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-stone-100 text-[9px] font-mono uppercase text-stone-800 border-b border-stone-400">
                      <tr>
                        <th className="p-1.5 w-7 text-center">No</th>
                        <th className="p-1.5">Unit Alat</th>
                        <th className="p-1.5 text-center w-10">Tipe</th>
                        <th className="p-1.5">No. MO</th>
                        <th className="p-1.5">Mulai Breakdown</th>
                        <th className="p-1.5">Komponen &amp; Problem</th>
                        <th className="p-1.5">Pekerjaan Terakhir</th>
                        <th className="p-1.5">PIC Mekanik</th>
                        <th className="p-1.5">Downtime</th>
                        <th className="p-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300 text-[10px] font-mono">
                      {sortedBreakdowns.map((b, idx) => {
                        const dt = calculateDowntime(b.tanggal, b.jamBreakdown);
                        const latest = getLatestBreakdownUpdate(b);
                        const isExpanded = expandedMoIds.has(b.id);
                        const sortedUpdates = getSortedUpdates(b);

                        return (
                          <React.Fragment key={`prn_${b.id}`}>
                            <tr className={isExpanded ? 'bg-amber-50/40' : ''}>
                              <td className="p-1.5 text-center text-stone-600">{idx + 1}</td>
                              <td className="p-1.5 font-bold text-stone-900">
                                {b.noUnit} ({b.namaAlat || '-'})
                              </td>
                              <td className="p-1.5 text-center">
                                <span className="badge">
                                  {b.breakdownType === 'SCHEDULE' ? 'SC' : b.breakdownType === 'ACCIDENT' ? 'Acc' : 'Uns'}
                                </span>
                              </td>
                              <td className="p-1.5 font-bold text-stone-900">
                                {b.noMaintenanceOrder || b.noNotifikasi}
                              </td>
                              <td className="p-1.5">
                                {b.tanggal} pk {b.jamBreakdown || '-'}
                              </td>
                              <td className="p-1.5 font-sans">
                                <strong>[{b.component || 'Other'}]</strong> {b.detailProblem || '-'}
                              </td>
                              <td className="p-1.5 font-sans">
                                {latest?.detailKerusakan || latest?.detailPekerjaan || b.detailKerusakan || '-'}
                              </td>
                              <td className="p-1.5 font-sans">
                                {[latest?.pic1, latest?.pic2, latest?.pic3].filter(Boolean).join(', ') || '-'}
                              </td>
                              <td className="p-1.5 font-bold text-stone-900">
                                {dt.formatted}
                              </td>
                              <td className="p-1.5 font-bold">
                                {latest?.statusUnit || b.statusUnit || 'BREAKDOWN'}
                              </td>
                            </tr>

                            {/* Jika unit di-expand, ikut ter-print runtutan update nya */}
                            {isExpanded && sortedUpdates.length > 0 && (
                              <tr className="bg-stone-50">
                                <td colSpan={10} className="p-2 pl-6">
                                  <div className="text-[9px] font-mono font-bold text-amber-800 mb-1">
                                    Runtutan Log Update Pekerjaan ({b.noUnit} - MO: {b.noMaintenanceOrder || b.noNotifikasi}):
                                  </div>
                                  <table className="w-full text-left text-[9px] font-mono border border-stone-300">
                                    <thead className="bg-stone-100 text-stone-700">
                                      <tr>
                                        <th className="p-1 w-14">Urutan</th>
                                        <th className="p-1 w-24">Waktu</th>
                                        <th className="p-1">Tindakan / Detail Perbaikan</th>
                                        <th className="p-1 w-20">Progress</th>
                                        <th className="p-1 w-16">Status</th>
                                        <th className="p-1 w-24">PIC</th>
                                        <th className="p-1">Part / Remark</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-300">
                                      {sortedUpdates.map((u, ui) => (
                                        <tr key={u.id || ui}>
                                          <td className="p-1 font-bold">
                                            {ui === 0 ? '#Terbaru' : `#${sortedUpdates.length - ui}`}
                                          </td>
                                          <td className="p-1">{u.tanggal} {u.jamStart || ''}</td>
                                          <td className="p-1 font-sans">{u.detailKerusakan || u.detailPekerjaan || '-'}</td>
                                          <td className="p-1">{u.progress || '-'}</td>
                                          <td className="p-1 font-bold">{u.statusUnit || '-'}</td>
                                          <td className="p-1 font-sans">{[u.pic1, u.pic2, u.pic3].filter(Boolean).join(', ') || '-'}</td>
                                          <td className="p-1 font-sans">
                                            {u.partsJasa && u.partsJasa.length > 0 ? (
                                              <span>{u.partsJasa.map(p => `${p.namaPart} (${p.qty} ${p.satuan})`).join(', ')}</span>
                                            ) : (
                                              u.remark || '-'
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan 3 Pihak Sesuai Setup Validasi */}
                <div className="signatures pt-4 grid grid-cols-3 gap-3 text-center text-xs font-mono">
                  <div className="sign-box">
                    <span className="sign-title">Dibuat Oleh:</span>
                    <span className="sign-job">{signatories.pembuatJabatan || 'Administrasi'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-36 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.pembuatName || '....................'} )
                    </div>
                  </div>
                  <div className="sign-box">
                    <span className="sign-title">Diperiksa Oleh:</span>
                    <span className="sign-job">{signatories.diperiksaJabatan || 'Supervisor Maintenance'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-36 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.diperiksaName || '....................'} )
                    </div>
                  </div>
                  <div className="sign-box">
                    <span className="sign-title">Disetujui Oleh:</span>
                    <span className="sign-job">{signatories.disetujuiJabatan || 'Kabag Workshop'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-36 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.disetujuiName || 'DODIK MARIYADI'} )
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK PER UNIT (SINGLE MO SPK & LOG) ================= */}
      {singlePrintRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print-backdrop">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-stone-100">
                    SURAT PERINTAH KERJA (SPK) &amp; LOG PERBAIKAN UNIT
                  </h3>
                  <p className="text-[10px] text-stone-400 font-sans">
                    PT BATU KALI WELANG AMPUH (ETIKA09) • No. MO: {singlePrintRecord.noMaintenanceOrder || singlePrintRecord.noNotifikasi} • Unit: {singlePrintRecord.noUnit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectPrintElement('printable-single-mo-area', `SPK_MO_${singlePrintRecord.noMaintenanceOrder || singlePrintRecord.noNotifikasi}_Unit_${singlePrintRecord.noUnit}_PT_BATU_KALI_WELANG_AMPUH_ETIKA09`)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSinglePrintRecord(null)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-stone-950 text-stone-200 font-sans space-y-4 printable-report-modal">
              <div id="printable-single-mo-area" className="space-y-4 bg-white text-stone-950 p-4 rounded-xl">
                {/* Kop Surat PT BATU KALI WELANG AMPUH (ETIKA09) */}
                <div className="header border-b-2 border-stone-800 pb-2 text-center space-y-0.5">
                  <h2 className="text-base font-black tracking-wider uppercase font-mono text-stone-900">
                    PT. BATU KALI WELANG AMPUH (ETIKA09)
                  </h2>
                  <h3 className="text-xs font-bold font-mono text-amber-700">
                    LEMBAR SPK &amp; HISTORI REPAIR PERBAIKAN ALAT BERAT
                  </h3>
                  <p className="text-[9px] text-stone-600 font-mono">
                    Quarry Purwosari, Pasuruan - Jawa Timur
                  </p>
                </div>

                {/* Data Unit & Kerusakan */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-3 rounded border border-stone-300 font-mono text-xs">
                  <div>
                    <span className="text-stone-600 block text-[9px]">NO. REFF MO</span>
                    <span className="font-bold text-stone-900">{singlePrintRecord.noMaintenanceOrder || singlePrintRecord.noNotifikasi}</span>
                  </div>
                  <div>
                    <span className="text-stone-600 block text-[9px]">UNIT ALAT</span>
                    <span className="font-bold text-stone-900">{singlePrintRecord.noUnit} ({singlePrintRecord.namaAlat || '-'})</span>
                  </div>
                  <div>
                    <span className="text-stone-600 block text-[9px]">TIPE BREAKDOWN</span>
                    <span className="font-bold text-stone-900">{singlePrintRecord.breakdownType || 'UNSCHEDULE'}</span>
                  </div>
                  <div>
                    <span className="text-stone-600 block text-[9px]">WAKTU BREAKDOWN</span>
                    <span className="font-bold text-stone-900">{singlePrintRecord.tanggal} pk {singlePrintRecord.jamBreakdown || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-600 block text-[9px]">KOMPONEN &amp; PROBLEM AWAL</span>
                    <span className="font-bold text-stone-900">[{singlePrintRecord.component || 'Other'}] {singlePrintRecord.detailProblem || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-600 block text-[9px]">DOWNTIME BERJALAN</span>
                    <span className="font-bold text-amber-800">{calculateDowntime(singlePrintRecord.tanggal, singlePrintRecord.jamBreakdown).formatted}</span>
                  </div>
                </div>

                {/* Runtutan Log Perbaikan */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-stone-900">
                    RUNTUTAN TINDAKAN &amp; LOG PERBAIKAN MEKANIK (Terbaru di Atas):
                  </h4>
                  {getSortedUpdates(singlePrintRecord).length === 0 ? (
                    <div className="p-3 text-center border border-dashed border-stone-300 rounded text-stone-500 font-mono text-xs">
                      Belum ada catatan update perbaikan.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono border border-stone-400 rounded overflow-hidden">
                      <thead className="bg-stone-100 text-[9px] uppercase text-stone-700">
                        <tr>
                          <th className="p-1.5 w-12 text-center">Urutan</th>
                          <th className="p-1.5 w-28">Waktu Pengerjaan</th>
                          <th className="p-1.5">Tindakan / Uraian Pekerjaan</th>
                          <th className="p-1.5 w-20">Progress</th>
                          <th className="p-1.5 w-20">Status</th>
                          <th className="p-1.5 w-28">Teknisi / PIC</th>
                          <th className="p-1.5">Part / Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-300 text-[10px]">
                        {getSortedUpdates(singlePrintRecord).map((upd, idx) => (
                          <tr key={upd.id || idx}>
                            <td className="p-1.5 text-center font-bold">
                              {idx === 0 ? '#Terbaru' : `#${getSortedUpdates(singlePrintRecord).length - idx}`}
                            </td>
                            <td className="p-1.5">
                              {upd.tanggal} pk {upd.jamStart || '-'} {upd.jamFinish ? `s/d ${upd.jamFinish}` : ''}
                              {upd.endDate && upd.endDate !== upd.tanggal && ` (${upd.endDate})`}
                            </td>
                            <td className="p-1.5 font-sans text-stone-900">{upd.detailKerusakan || upd.detailPekerjaan || '-'}</td>
                            <td className="p-1.5">{upd.progress || '-'}</td>
                            <td className="p-1.5 font-bold">{upd.statusUnit || '-'}</td>
                            <td className="p-1.5 font-sans">{[upd.pic1, upd.pic2, upd.pic3].filter(Boolean).join(', ') || '-'}</td>
                            <td className="p-1.5 font-sans">
                              {upd.partsJasa && upd.partsJasa.length > 0 ? (
                                <span>{upd.partsJasa.map(p => `${p.namaPart} (${p.qty} ${p.satuan})`).join(', ')}</span>
                              ) : (
                                upd.remark || '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Tanda Tangan 3 Pihak Sesuai Setup Validasi */}
                <div className="signatures pt-4 grid grid-cols-3 gap-3 text-center text-xs font-mono">
                  <div className="sign-box">
                    <span className="sign-title">Dibuat Oleh:</span>
                    <span className="sign-job">{signatories.pembuatJabatan || 'Administrasi'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-32 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.pembuatName || '....................'} )
                    </div>
                  </div>
                  <div className="sign-box">
                    <span className="sign-title">Diperiksa Oleh:</span>
                    <span className="sign-job">{signatories.diperiksaJabatan || 'Supervisor Maintenance'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-32 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.diperiksaName || '....................'} )
                    </div>
                  </div>
                  <div className="sign-box">
                    <span className="sign-title">Disetujui Oleh:</span>
                    <span className="sign-job">{signatories.disetujuiJabatan || 'Kabag Workshop'}</span>
                    <div className="sign-space h-12" />
                    <div className="sign-name border-t border-stone-600 w-32 mx-auto pt-1 font-bold text-[10px]">
                      ( {signatories.disetujuiName || 'DODIK MARIYADI'} )
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
