import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownProgressOption,
  BreakdownStatusUnitOption,
  BREAKDOWN_PROGRESS_OPTIONS,
  BREAKDOWN_STATUS_UNIT_OPTIONS,
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Truck, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Eye, 
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
  ExternalLink,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

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
      detailKerusakan?: string;
      progress?: BreakdownProgressOption | string;
      statusUnit?: BreakdownStatusUnitOption | string;
      pic1?: string;
      pic2?: string;
      pic3?: string;
      remark?: string;
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
    tanggal: string;
    jamStart: string;
    jamFinish: string;
    detailKerusakan: string;
    progress: BreakdownProgressOption | string;
    statusUnit: BreakdownStatusUnitOption | string;
    pic1: string;
    pic2: string;
    remark: string;
  }

  const [formInputs, setFormInputs] = useState<Record<string, InlineFormState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Print Preview Laporan Monitoring (WYSIWYG: prints what's on screen)
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
        formatted += `${days} Hari `;
      }
      formatted += `${remainingHours} Jam ${remainingMinutes} Mnt`;

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

  // Daftar Komponen Unik
  const componentOptions = useMemo(() => {
    const set = new Set<string>();
    activeBreakdowns.forEach((b) => {
      if (b.component) set.add(b.component);
    });
    return Array.from(set).sort();
  }, [activeBreakdowns]);

  // Daftar Mekanik dari Manpower
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

    return [...mechanics.sort(), ...others.sort()];
  }, [manpowerList]);

  // Helper inisialisasi / get state inline form untuk unit tertentu
  const getInlineForm = (b: BreakdownRecord): InlineFormState => {
    if (formInputs[b.id]) {
      return formInputs[b.id];
    }
    const latest = getLatestBreakdownUpdate(b);
    return {
      tanggal: getTodayDateString(),
      jamStart: getCurrentTimeString(),
      jamFinish: '',
      detailKerusakan: '',
      progress: latest?.progress || b.progress || 'On Progress',
      statusUnit: latest?.statusUnit || b.statusUnit || 'BREAKDOWN',
      pic1: latest?.pic1 || '',
      pic2: latest?.pic2 || '',
      remark: '',
    };
  };

  const updateInlineFormField = (bId: string, field: keyof InlineFormState, value: string) => {
    setFormInputs((prev) => {
      const b = breakdowns.find((x) => x.id === bId);
      const current = prev[bId] || (b ? getInlineForm(b) : {
        tanggal: getTodayDateString(),
        jamStart: getCurrentTimeString(),
        jamFinish: '',
        detailKerusakan: '',
        progress: 'On Progress',
        statusUnit: 'BREAKDOWN',
        pic1: '',
        pic2: '',
        remark: '',
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
        startJob: form.tanggal || getTodayDateString(),
        jamStart: form.jamStart || '08:00',
        jamFinish: form.jamFinish || '',
        detailKerusakan: form.detailKerusakan.trim(),
        progress: form.progress,
        statusUnit: form.statusUnit,
        pic1: form.pic1.trim(),
        pic2: form.pic2.trim(),
        remark: form.remark.trim(),
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
      // Jika semua sudah terbuka, tutup semua
      setExpandedMoIds(new Set());
    } else {
      // Buka semua
      const allIds = new Set(sortedBreakdowns.map((b) => b.id));
      setExpandedMoIds(allIds);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
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
      <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                LIVE REALTIME MONITORING &amp; UPDATE BER уровня
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                Auto-Refresh: 60 dtk
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono ml-1">
                <span className="text-stone-500 font-bold">Tipe:</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold" title="Schedule">SC = Schedule</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold" title="Unschedule">Uns = Unschedule</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold" title="Accident">Acc = Accident</span>
              </div>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-mono text-stone-100 tracking-wide mt-1.5 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              <span>DASHBOARD MAINTENANCE &amp; MONITORING BREAKDOWN</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Tabel bertingkat terpadu: monitor downtime berjalan, update perbaikan jam ke jam langsung di bawah No. MO (tanda +), dan cetak laporan sesuai tampilan monitor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Tombol Print & Preview Laporan Monitoring (WYSIWYG) */}
            <button
              id="btn-print-preview-monitoring"
              type="button"
              onClick={() => setShowMonitoringPrintModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
              title="Print dan Preview Laporan Harian Monitoring Breakdown sesuai tampilan layar"
            >
              <Printer className="w-4 h-4" />
              <span>Print Preview Laporan</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTime(Date.now())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow cursor-pointer"
              title="Perbarui Waktu Sekarang"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Timer</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkasan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-stone-800/80 mt-5">
          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-stone-400 block mb-1">TOTAL UNIT BREAKDOWN</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-100">{stats.total}</span>
              <span className="text-[11px] font-mono text-rose-400 font-bold">Unit Aktif</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-amber-400 block mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>DOWNTIME &gt; 24 JAM</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-300">{stats.criticalCount}</span>
              <span className="text-[11px] font-mono text-stone-500">Unit</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-rose-400 block mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>KRITIS (&gt; 72 JAM)</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-400">{stats.severeCount}</span>
              <span className="text-[11px] font-mono text-stone-500">Unit</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-blue-400 block mb-1">RATA-RATA DOWNTIME</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-blue-400">{stats.avgHours}</span>
              <span className="text-[11px] font-mono text-stone-500">Jam / Unit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Kontrol Pencarian, dan Tombol Expand/Collapse All */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Unit, No MO, Problem, Tindakan, atau PIC..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-amber-300 text-xs font-mono font-bold transition cursor-pointer"
            title={expandedMoIds.size === sortedBreakdowns.length ? "Tutup semua rincian update" : "Buka semua rincian update"}
          >
            {expandedMoIds.size === sortedBreakdowns.length ? (
              <>
                <Minus className="w-3.5 h-3.5 text-amber-400" />
                <span>Tutup Semua (-)</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Buka Semua (+)</span>
              </>
            )}
          </button>

          <select
            value={filterKomponen}
            onChange={(e) => setFilterKomponen(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Komponen</option>
            {componentOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="DOWNTIME_DESC">Urutkan: Downtime Terlama</option>
            <option value="DOWNTIME_ASC">Urutkan: Downtime Terpendek</option>
            <option value="UNIT">Urutkan: Nomor Unit</option>
          </select>
        </div>
      </div>

      {/* Tabel Bertingkat Dashboard Maintenance & Monitoring Breakdown */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {sortedBreakdowns.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-stone-800 m-5 rounded-2xl bg-stone-950/40">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-mono font-bold text-stone-100">Semua Unit Dalam Kondisi READY</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
              Tidak ada unit yang sedang mengalami breakdown atau keterbatasan operasi saat ini. Seluruh riwayat tersimpan rapi di menu History Breakdown.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-2.5 py-3.5 w-10 text-center">Buka</th>
                  <th className="px-2.5 py-3.5 w-8 text-center">No</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Unit Alat</th>
                  <th className="px-2 py-3.5 text-center whitespace-nowrap" title="Breakdown Type: SC = Schedule, Uns = Unschedule, Acc = Accident">Tipe</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Reff No. MO (Klik Print)</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Mulai Breakdown</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Komponen &amp; Problem</th>
                  <th className="px-3.5 py-3.5 min-w-[180px]">Pekerjaan Terakhir</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">PIC Mekanik</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Realtime Downtime</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">Status Unit</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">Aksi</th>
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
                  const typeLabel = typeRaw === 'SCHEDULE' ? 'Schedule' : typeRaw === 'ACCIDENT' ? 'Accident' : 'Unschedule';
                  const typeColor =
                    typeRaw === 'SCHEDULE'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : typeRaw === 'ACCIDENT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  const inlineForm = getInlineForm(b);

                  return (
                    <React.Fragment key={b.id}>
                      {/* Baris Utama (Level 1) */}
                      <tr className={`hover:bg-stone-800/40 transition group ${isExpanded ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : ''}`}>
                        {/* 1. Tombol Collapse / Expand (+) */}
                        <td className="px-2.5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(b.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                              isExpanded
                                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                                : 'bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700'
                            }`}
                            title={isExpanded ? "Tutup Rincian Update" : "Buka Update Pekerjaan (+)"}
                          >
                            {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* 2. No */}
                        <td className="px-2.5 py-3 text-center text-stone-500">
                          {idx + 1}
                        </td>

                        {/* 3. Unit Alat */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-stone-100 text-xs">
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            <span>{b.noUnit}</span>
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {b.namaAlat || b.noLama || '-'}
                          </div>
                          <div className="text-[9px] text-stone-500 font-sans">
                            {b.jenis || '-'}
                          </div>
                        </td>

                        {/* 4. Tipe Breakdown (SC, Uns, Acc) */}
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${typeColor} shadow-sm inline-block`}
                            title={`Tipe Breakdown: ${typeLabel} (${typeShort})`}
                          >
                            {typeShort}
                          </span>
                        </td>

                        {/* 5. Reff No MO (Klik untuk Cetak Single Unit MO) */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSinglePrintRecord(b)}
                            className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group/btn cursor-pointer"
                            title="Klik untuk cetak SPK & Log Perbaikan Unit ini"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-500 group-hover/btn:scale-110 transition" />
                            <span className="underline decoration-dotted underline-offset-2">
                              {b.noMaintenanceOrder || b.noNotifikasi || '-'}
                            </span>
                          </button>
                          <span className="text-[9px] text-stone-500 block">
                            Notif: {b.noNotifikasi}
                          </span>
                        </td>

                        {/* 6. Tanggal & Jam Mulai Breakdown */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-stone-200">{b.tanggal}</div>
                          <div className="text-[10px] text-amber-400/90 font-bold">
                            Jam {b.jamBreakdown || '-'}
                          </div>
                        </td>

                        {/* 7. Komponen & Problem Awal */}
                        <td className="px-3 py-3 max-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/50">
                              {b.component || 'Other'}
                            </span>
                          </div>
                          <div className="text-stone-300 font-sans line-clamp-2 text-[11px]" title={b.detailProblem}>
                            {b.detailProblem || '-'}
                          </div>
                        </td>

                        {/* 8. Pekerjaan Terakhir (Hasil Update Terkini) */}
                        <td className="px-3.5 py-3 max-w-[220px]">
                          <div className="font-sans text-stone-100 line-clamp-2 text-xs" title={lastJob}>
                            {lastJob}
                          </div>
                          {latestUpdate?.tanggal && (
                            <span className="text-[9px] text-stone-500 font-mono mt-0.5 block">
                              Upd: {latestUpdate.tanggal} {latestUpdate.jamStart ? `(${latestUpdate.jamStart})` : ''}
                            </span>
                          )}
                        </td>

                        {/* 9. PIC Mekanik yang Mengerjakan */}
                        <td className="px-3 py-3 whitespace-nowrap font-sans">
                          <div className="text-stone-200 font-semibold text-xs">
                            {mechanics}
                          </div>
                          <div className="text-[9px] text-stone-500 font-mono">
                            {rawPics ? 'Teknisi Update' : 'Belum Ditugaskan'}
                          </div>
                        </td>

                        {/* 10. Realtime Downtime Counter */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-mono font-bold inline-flex items-center gap-1 ${
                              isSevere
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse'
                                : isCritical
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{dt.formatted}</span>
                          </span>
                          <span className="text-[9px] text-stone-500 block mt-0.5 font-mono">
                            Total: {dt.totalHours} Jam
                          </span>
                        </td>

                        {/* 11. Status Unit & Progress */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              currentStatus === 'LIMIT OPERASI'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {currentStatus}
                          </span>
                          <div className="text-[10px] text-stone-400 mt-1">
                            {currentProgress}
                          </div>
                        </td>

                        {/* 12. Aksi */}
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1 font-sans">
                            <button
                              type="button"
                              onClick={() => toggleExpand(b.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                                isExpanded
                                  ? 'bg-amber-500 text-stone-950'
                                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30'
                              }`}
                              title="Buka form input update pekerjaan bertingkat"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>{isExpanded ? 'Tutup' : 'Update'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSinglePrintRecord(b)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition cursor-pointer"
                              title="Print SPK & Log Unit ini"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Baris Bertingkat (Level 2: Form Inline Quick Update & Tabel Runtutan Update) */}
                      {isExpanded && (
                        <tr className="bg-stone-950/95 border-b border-stone-800">
                          <td colSpan={12} className="p-4 sm:p-5">
                            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-5 border-l-4 border-l-amber-500">
                              {/* Header Bagian Rincian */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                                    <Wrench className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold font-mono text-stone-100 flex items-center gap-2">
                                      <span>UPDATE PROGRES PERBAIKAN: {b.noUnit} ({b.namaAlat || '-'})</span>
                                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        MO: {b.noMaintenanceOrder || b.noNotifikasi}
                                      </span>
                                    </h4>
                                    <p className="text-[11px] text-stone-400 mt-0.5">
                                      Problem Awal: <span className="text-rose-300 font-semibold">{b.detailProblem || '-'}</span> ({b.component || 'Other'}) • Downtime Berjalan: <span className="text-amber-400 font-bold">{dt.formatted}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSinglePrintRecord(b)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-stone-300 hover:text-amber-300 text-xs font-mono font-bold transition cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print SPK Unit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(b.id)}
                                    className="p-1.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200"
                                    title="Tutup Panel Ini"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Form Cepat Input Update Progress (Konsep Tabel Kebutuhan Part) */}
                              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                                    <Save className="w-3.5 h-3.5" />
                                    <span>INPUT PEKERJAAN TERBARU (UPDATE BERJALAN)</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-stone-500">
                                    *Paling atas di tabel bawah adalah pekerjaan terakhir
                                  </span>
                                </div>

                                {/* Form Grid Input Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                  {/* Tanggal */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      Tanggal Update
                                    </label>
                                    <input
                                      type="date"
                                      value={inlineForm.tanggal}
                                      onChange={(e) => updateInlineFormField(b.id, 'tanggal', e.target.value)}
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>

                                  {/* Jam Start */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      Jam Mulai (24 Jam)
                                    </label>
                                    <input
                                      type="time"
                                      value={inlineForm.jamStart}
                                      onChange={(e) => updateInlineFormField(b.id, 'jamStart', e.target.value)}
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>

                                  {/* Jam Finish */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      Jam Selesai (Opsional)
                                    </label>
                                    <input
                                      type="time"
                                      value={inlineForm.jamFinish}
                                      onChange={(e) => updateInlineFormField(b.id, 'jamFinish', e.target.value)}
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    />
                                  </div>

                                  {/* Progress */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      Progress Pekerjaan
                                    </label>
                                    <select
                                      value={inlineForm.progress}
                                      onChange={(e) => updateInlineFormField(b.id, 'progress', e.target.value)}
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    >
                                      {BREAKDOWN_PROGRESS_OPTIONS.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Status Unit (BREAKDOWN / LIMIT OPERASI / READY) */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1 font-bold">
                                      Status Unit
                                    </label>
                                    <select
                                      value={inlineForm.statusUnit}
                                      onChange={(e) => updateInlineFormField(b.id, 'statusUnit', e.target.value)}
                                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:outline-none ${
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

                                  {/* PIC Mekanik 1 */}
                                  <div>
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      PIC Mekanik 1
                                    </label>
                                    <select
                                      value={inlineForm.pic1}
                                      onChange={(e) => updateInlineFormField(b.id, 'pic1', e.target.value)}
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                    >
                                      <option value="">-- Pilih Mekanik --</option>
                                      {mechanicOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Baris 2 Form: Tindakan, Remark & Tombol Simpan */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
                                  {/* Tindakan / Detail Kerusakan */}
                                  <div className="lg:col-span-6">
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1 font-semibold">
                                      Tindakan / Detail Pekerjaan Dilakukan *
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={inlineForm.detailKerusakan}
                                      onChange={(e) => updateInlineFormField(b.id, 'detailKerusakan', e.target.value)}
                                      placeholder="Contoh: Bongkar pompa hidrolik, cek seal, flushing oli, penggantian filter..."
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none font-sans"
                                    />
                                  </div>

                                  {/* Remark / Catatan Tambahan */}
                                  <div className="lg:col-span-4">
                                    <label className="text-[10px] font-mono text-stone-400 block mb-1">
                                      Catatan Tambahan / Remark
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={inlineForm.remark}
                                      onChange={(e) => updateInlineFormField(b.id, 'remark', e.target.value)}
                                      placeholder="Catatan part yang dibutuhkan atau kendala lapangan..."
                                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none font-sans"
                                    />
                                  </div>

                                  {/* Tombol Simpan */}
                                  <div className="lg:col-span-2 flex flex-col justify-end">
                                    <button
                                      type="button"
                                      disabled={savingId === b.id}
                                      onClick={() => handleSaveInlineUpdate(b)}
                                      className={`w-full py-2.5 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer ${
                                        inlineForm.statusUnit === 'READY'
                                          ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                                          : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                                      }`}
                                    >
                                      {savingId === b.id ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Menyimpan...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Save className="w-3.5 h-3.5" />
                                          <span>{inlineForm.statusUnit === 'READY' ? 'Simpan & READY' : 'Simpan Update'}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Banner Peringatan jika Status Diubah Menjadi READY */}
                                {inlineForm.statusUnit === 'READY' && (
                                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs font-mono text-emerald-300">
                                    <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold block">PENTING: UNIT AKAN DINYATAKAN READY</span>
                                      <p className="text-[11px] text-emerald-400/80 font-sans mt-0.5">
                                        Ketika disimpan dengan status READY, durasi downtime unit akan otomatis dihitung dan dikunci, unit akan hilang dari monitoring aktif Dashboard ini, dan riwayat pekerjaan perbaikan tersimpan permanen di menu History Breakdown.
                                      </p>
                                    </div>
                                  </div>
                                )}
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
                                  <div className="text-center py-6 border border-dashed border-stone-800 rounded-xl bg-stone-950/50 text-xs font-mono text-stone-500">
                                    Belum ada log update pekerjaan. Silakan input update pertama pada form di atas.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto border border-stone-800 rounded-xl">
                                    <table className="w-full text-left text-xs text-stone-300">
                                      <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                                        <tr>
                                          <th className="px-3 py-2 w-16 text-center">Urutan</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Tanggal &amp; Jam</th>
                                          <th className="px-3 py-2 min-w-[240px]">Tindakan / Detail Pekerjaan</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Progress</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Status Unit</th>
                                          <th className="px-3 py-2 whitespace-nowrap">PIC Mekanik</th>
                                          <th className="px-3 py-2 min-w-[150px]">Remark</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Diinput Oleh</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                                        {sortedUpdates.map((upd, uIdx) => {
                                          const isLatest = uIdx === 0;
                                          const pics = [upd.pic1, upd.pic2, upd.pic3].filter(Boolean).join(', ') || '-';
                                          const jobDesc = upd.detailKerusakan || upd.detailPekerjaan || '-';

                                          return (
                                            <tr
                                              key={upd.id || `${b.id}_upd_${uIdx}`}
                                              className={isLatest ? 'bg-amber-950/25 font-semibold' : 'hover:bg-stone-800/30'}
                                            >
                                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                                {isLatest ? (
                                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    #Terbaru
                                                  </span>
                                                ) : (
                                                  <span className="text-stone-500">
                                                    #{sortedUpdates.length - uIdx}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-stone-200">{upd.tanggal || upd.startJob}</div>
                                                <div className="text-[10px] text-amber-400">
                                                  {upd.jamStart || '-'} {upd.jamFinish ? `s/d ${upd.jamFinish}` : ''}
                                                </div>
                                              </td>
                                              <td className="px-3 py-2 font-sans text-stone-100 text-xs">
                                                {jobDesc}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="text-stone-300 text-[10px]">
                                                  {upd.progress || '-'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                <span
                                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                                              <td className="px-3 py-2 whitespace-nowrap font-sans text-stone-200">
                                                {pics}
                                              </td>
                                              <td className="px-3 py-2 font-sans text-stone-400 text-[10px]">
                                                {upd.remark || '-'}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap text-[10px] text-stone-500">
                                                {upd.updatedBy || 'Staff'}
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
          </div>
        )}
      </div>

      {/* ================= MODAL WYSIWYG PRINT & PREVIEW LAPORAN MONITORING ================= */}
      {showMonitoringPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-mono text-stone-100">
                    PRINT PREVIEW LAPORAN MONITORING BREAKDOWN &amp; DOWNTIME
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Prinsip WYSIWYG: Hanya rincian unit yang sedang dibuka (Expand) yang akan tercetak rincian update nya.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonitoringPrintModal(false)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Printable Sheet */}
            <div className="p-6 overflow-y-auto bg-stone-950 text-stone-200 font-sans space-y-5 print:p-0 print:bg-white print:text-black">
              {/* Kop Surat PT BUKIT KHATULISTIWA WAHANA */}
              <div className="border-b-2 border-stone-700 pb-3 text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase font-mono text-stone-100 print:text-black">
                  PT. BUKIT KHATULISTIWA WAHANA
                </h2>
                <h3 className="text-xs sm:text-sm font-bold font-mono text-amber-400 print:text-black">
                  LAPORAN MONITORING UNIT BREAKDOWN &amp; REALTIME DOWNTIME ALAT BERAT
                </h3>
                <p className="text-[10px] text-stone-400 print:text-stone-600">
                  Quarry Purwosari, Pasuruan - Jawa Timur • Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} pk {getCurrentTimeString()} WIB
                </p>
              </div>

              {/* KPI Ringkasan */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">TOTAL UNIT BD</span>
                  <span className="font-bold text-stone-100">{stats.total} Unit</span>
                </div>
                <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-amber-400 block">&gt; 24 JAM</span>
                  <span className="font-bold text-amber-300">{stats.criticalCount} Unit</span>
                </div>
                <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-rose-400 block">KRITIS (&gt; 72 JAM)</span>
                  <span className="font-bold text-rose-300">{stats.severeCount} Unit</span>
                </div>
                <div className="p-2 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-blue-400 block">RATA-RATA DOWNTIME</span>
                  <span className="font-bold text-blue-300">{stats.avgHours} Jam</span>
                </div>
              </div>

              {/* Tabel Cetak */}
              <div className="border border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-900 text-[10px] font-mono uppercase text-stone-300 border-b border-stone-800">
                    <tr>
                      <th className="p-2 w-8 text-center">No</th>
                      <th className="p-2">Unit Alat</th>
                      <th className="p-2 text-center">Tipe</th>
                      <th className="p-2">No. MO</th>
                      <th className="p-2">Mulai Breakdown</th>
                      <th className="p-2">Komponen &amp; Problem</th>
                      <th className="p-2">Pekerjaan Terakhir</th>
                      <th className="p-2">PIC Mekanik</th>
                      <th className="p-2">Downtime</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-[11px] font-mono">
                    {sortedBreakdowns.map((b, idx) => {
                      const dt = calculateDowntime(b.tanggal, b.jamBreakdown);
                      const latest = getLatestBreakdownUpdate(b);
                      const isExpanded = expandedMoIds.has(b.id);
                      const sortedUpdates = getSortedUpdates(b);

                      return (
                        <React.Fragment key={`prn_${b.id}`}>
                          <tr className={isExpanded ? 'bg-stone-900/40' : ''}>
                            <td className="p-2 text-center">{idx + 1}</td>
                            <td className="p-2 font-bold text-stone-100">
                              {b.noUnit} ({b.namaAlat || '-'})
                            </td>
                            <td className="p-2 text-center">
                              {b.breakdownType === 'SCHEDULE' ? 'SC' : b.breakdownType === 'ACCIDENT' ? 'Acc' : 'Uns'}
                            </td>
                            <td className="p-2 font-bold text-amber-400">
                              {b.noMaintenanceOrder || b.noNotifikasi}
                            </td>
                            <td className="p-2">
                              {b.tanggal} pk {b.jamBreakdown || '-'}
                            </td>
                            <td className="p-2">
                              <span className="font-bold">[{b.component || 'Other'}]</span> {b.detailProblem || '-'}
                            </td>
                            <td className="p-2 font-sans">
                              {latest?.detailKerusakan || latest?.detailPekerjaan || b.detailKerusakan || '-'}
                            </td>
                            <td className="p-2 font-sans">
                              {[latest?.pic1, latest?.pic2].filter(Boolean).join(', ') || '-'}
                            </td>
                            <td className="p-2 font-bold text-amber-300">
                              {dt.formatted}
                            </td>
                            <td className="p-2 font-bold">
                              {latest?.statusUnit || b.statusUnit || 'BREAKDOWN'}
                            </td>
                          </tr>

                          {/* Jika unit di-expand, ikut ter-print runtutan update nya */}
                          {isExpanded && sortedUpdates.length > 0 && (
                            <tr className="bg-stone-900/60">
                              <td colSpan={10} className="p-3 pl-8">
                                <div className="text-[10px] font-mono font-bold text-amber-400 mb-1">
                                  Runtutan Update Pengerjaan ({b.noUnit} - MO: {b.noMaintenanceOrder || b.noNotifikasi}):
                                </div>
                                <table className="w-full text-left text-[10px] font-mono border border-stone-800">
                                  <thead className="bg-stone-950 text-stone-400">
                                    <tr>
                                      <th className="p-1.5 w-16">Urutan</th>
                                      <th className="p-1.5">Waktu</th>
                                      <th className="p-1.5">Tindakan / Detail Perbaikan</th>
                                      <th className="p-1.5">Progress</th>
                                      <th className="p-1.5">Status</th>
                                      <th className="p-1.5">PIC</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-800">
                                    {sortedUpdates.map((u, ui) => (
                                      <tr key={u.id || ui}>
                                        <td className="p-1.5 font-bold text-emerald-400">
                                          {ui === 0 ? '#Terbaru' : `#${sortedUpdates.length - ui}`}
                                        </td>
                                        <td className="p-1.5">{u.tanggal} {u.jamStart || ''}</td>
                                        <td className="p-1.5 font-sans">{u.detailKerusakan || u.detailPekerjaan || '-'}</td>
                                        <td className="p-1.5">{u.progress || '-'}</td>
                                        <td className="p-1.5 font-bold">{u.statusUnit || '-'}</td>
                                        <td className="p-1.5 font-sans">{[u.pic1, u.pic2].filter(Boolean).join(', ') || '-'}</td>
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

              {/* Tanda Tangan */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs font-mono">
                <div>
                  <span className="text-stone-400 block mb-12">Dibuat Oleh: Pengawas Maintenance</span>
                  <div className="border-t border-stone-700 w-48 mx-auto pt-1 font-bold">
                    ( {currentUser?.nama || 'Pengawas Lapangan'} )
                  </div>
                </div>
                <div>
                  <span className="text-stone-400 block mb-12">Diketahui Oleh: Kepala Bengkel / Supervisor</span>
                  <div className="border-t border-stone-700 w-48 mx-auto pt-1 font-bold">
                    ( DODIK MARIYADI )
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK PER UNIT (SINGLE MO SPK & LOG) ================= */}
      {singlePrintRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-mono text-stone-100">
                    SURAT PERINTAH KERJA (SPK) &amp; LOG PERBAIKAN UNIT
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans">
                    No. MO: {singlePrintRecord.noMaintenanceOrder || singlePrintRecord.noNotifikasi} • Unit: {singlePrintRecord.noUnit}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSinglePrintRecord(null)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="p-6 overflow-y-auto bg-stone-950 text-stone-200 font-sans space-y-5 print:p-0 print:bg-white print:text-black">
              {/* Kop Surat */}
              <div className="border-b-2 border-stone-700 pb-3 text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase font-mono text-stone-100 print:text-black">
                  PT. BUKIT KHATULISTIWA WAHANA - QUARRY PURWOSARI
                </h2>
                <h3 className="text-xs sm:text-sm font-bold font-mono text-amber-400 print:text-black">
                  LEMBAR SPK &amp; HISTORI REPAIR PERBAIKAN ALAT BERAT
                </h3>
              </div>

              {/* Data Unit & Kerusakan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-900/60 p-4 rounded-xl border border-stone-800 font-mono text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">NO. REFF MO</span>
                  <span className="font-bold text-amber-400">{singlePrintRecord.noMaintenanceOrder || singlePrintRecord.noNotifikasi}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">UNIT ALAT</span>
                  <span className="font-bold text-stone-100">{singlePrintRecord.noUnit} ({singlePrintRecord.namaAlat || '-'})</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">TIPE BREAKDOWN</span>
                  <span className="font-bold text-rose-300">{singlePrintRecord.breakdownType || 'UNSCHEDULE'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">WAKTU BREAKDOWN</span>
                  <span className="font-bold text-stone-200">{singlePrintRecord.tanggal} pk {singlePrintRecord.jamBreakdown || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-400 block text-[10px]">KOMPONEN &amp; PROBLEM AWAL</span>
                  <span className="font-bold text-stone-200">[{singlePrintRecord.component || 'Other'}] {singlePrintRecord.detailProblem || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-400 block text-[10px]">DOWNTIME BERJALAN</span>
                  <span className="font-bold text-amber-400">{calculateDowntime(singlePrintRecord.tanggal, singlePrintRecord.jamBreakdown).formatted}</span>
                </div>
              </div>

              {/* Runtutan Log Perbaikan */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-400">
                  RUNTUTAN TINDAKAN &amp; LOG PERBAIKAN MEKANIK (Terbaru di Atas):
                </h4>
                {getSortedUpdates(singlePrintRecord).length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-stone-800 rounded-xl text-stone-500 font-mono text-xs">
                    Belum ada catatan update perbaikan.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-mono border border-stone-800 rounded-xl overflow-hidden">
                    <thead className="bg-stone-900 text-[10px] uppercase text-stone-400">
                      <tr>
                        <th className="p-2 w-12 text-center">Urutan</th>
                        <th className="p-2">Waktu Pengerjaan</th>
                        <th className="p-2">Tindakan / Uraian Pekerjaan</th>
                        <th className="p-2">Progress</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Teknisi / PIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 text-[11px]">
                      {getSortedUpdates(singlePrintRecord).map((upd, idx) => (
                        <tr key={upd.id || idx}>
                          <td className="p-2 text-center font-bold text-emerald-400">
                            {idx === 0 ? '#Terbaru' : `#${getSortedUpdates(singlePrintRecord).length - idx}`}
                          </td>
                          <td className="p-2">
                            {upd.tanggal} pk {upd.jamStart || '-'} {upd.jamFinish ? `s/d ${upd.jamFinish}` : ''}
                          </td>
                          <td className="p-2 font-sans text-stone-200">{upd.detailKerusakan || upd.detailPekerjaan || '-'}</td>
                          <td className="p-2">{upd.progress || '-'}</td>
                          <td className="p-2 font-bold">{upd.statusUnit || '-'}</td>
                          <td className="p-2 font-sans">{[upd.pic1, upd.pic2].filter(Boolean).join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tanda Tangan */}
              <div className="pt-8 grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div>
                  <span className="text-stone-400 block mb-12">Teknisi / Mekanik:</span>
                  <div className="border-t border-stone-700 w-36 mx-auto pt-1 font-bold">
                    ( ............................ )
                  </div>
                </div>
                <div>
                  <span className="text-stone-400 block mb-12">Pengawas Lapangan:</span>
                  <div className="border-t border-stone-700 w-36 mx-auto pt-1 font-bold">
                    ( {currentUser?.nama || 'Pengawas'} )
                  </div>
                </div>
                <div>
                  <span className="text-stone-400 block mb-12">Kabag Workshop:</span>
                  <div className="border-t border-stone-700 w-36 mx-auto pt-1 font-bold">
                    ( DODIK MARIYADI )
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
