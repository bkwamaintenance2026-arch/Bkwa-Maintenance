import React, { useState, useMemo } from 'react';
import { 
  BreakdownRecord, 
  AssetUnit, 
  BREAKDOWN_COMPONENT_OPTIONS, 
  BREAKDOWN_PROGRESS_OPTIONS,
  UserAccount 
} from '../../types';
import { 
  BarChart3, 
  Filter, 
  Clock, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  RotateCcw,
  Layers,
  Wrench,
  TrendingDown,
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  Lock,
  ArrowLeft,
  ClipboardCheck
} from 'lucide-react';
import { canUserExportModule } from '../../utils/storage';

interface DashboardMaintenanceSubViewProps {
  breakdowns: BreakdownRecord[];
  units: AssetUnit[];
  currentUser?: UserAccount;
  onBackToMainMenu?: () => void;
  onOpenLaporanHarian?: () => void;
}

export const DashboardMaintenanceSubView: React.FC<DashboardMaintenanceSubViewProps> = ({
  breakdowns,
  units,
  currentUser,
  onBackToMainMenu,
  onOpenLaporanHarian,
}) => {
  // Cek hak akses export untuk Modul 3: Developer, Admin, dan Khusus memiliki izin export.
  const canExport = canUserExportModule(currentUser || null, 3);

  // Filter Tanggal, Bulan, Tahun
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterBulan, setFilterBulan] = useState<string>(''); // MM
  const [filterTahun, setFilterTahun] = useState<string>(''); // YYYY

  // Reset Filter
  const handleResetFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterBulan('');
    setFilterTahun('');
  };

  // Data terfilter berdasarkan parameter waktu
  const filteredBreakdowns = useMemo(() => {
    return breakdowns.filter((b) => {
      const date = b.tanggal || b.startJob || '';
      if (!date) return true;

      // Filter Rentang Tanggal
      if (filterStartDate && date < filterStartDate) return false;
      if (filterEndDate && date > filterEndDate) return false;

      // Filter Bulan & Tahun
      const [y, m] = date.split('-');
      if (filterTahun && y !== filterTahun) return false;
      if (filterBulan && m !== filterBulan.padStart(2, '0')) return false;

      return true;
    });
  }, [breakdowns, filterStartDate, filterEndDate, filterBulan, filterTahun]);

  // 1. Perhitungan PA Unit (Physical Availability)
  // Rumus PA Standar Tambang/Heavy Equipment:
  // Total Jam Kalender Periode (contoh: 720 jam / bulan per unit)
  // PA (%) = ((Total Jam Kalender - Total Jam DownTime) / Total Jam Kalender) * 100
  const paStats = useMemo(() => {
    const totalUnitsCount = Math.max(1, units.length);
    // Asumsi jam operasional kalender per unit = 24 jam x 30 hari = 720 jam (atau estimasi terfilter)
    const standardCalendarHours = totalUnitsCount * 720;

    // Hitung total downtime hours dari data
    const totalDowntime = filteredBreakdowns.reduce((acc, curr) => {
      if (curr.downtimeHours && curr.downtimeHours > 0) {
        return acc + curr.downtimeHours;
      }
      // Jika masih BREAKDOWN aktif, hitung selisih jam dari tanggal mulai sampai sekarang
      const startMs = new Date(curr.tanggal).getTime();
      const endMs = curr.completedAt ? new Date(curr.completedAt).getTime() : Date.now();
      const diffHrs = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
      return acc + (isNaN(diffHrs) ? 8 : diffHrs);
    }, 0);

    const availableHours = Math.max(0, standardCalendarHours - totalDowntime);
    const paPercentage = Math.min(100, Math.max(0, (availableHours / standardCalendarHours) * 100));

    return {
      paPercentage: paPercentage.toFixed(1),
      totalDowntimeHours: totalDowntime,
      availableHours,
      standardCalendarHours,
    };
  }, [units, filteredBreakdowns]);

  // 2. PA per Unit (Individu)
  const unitPaList = useMemo(() => {
    return units.map((u) => {
      const unitBreakdowns = filteredBreakdowns.filter((b) => b.noUnit === u.cnNew);
      const unitDowntime = unitBreakdowns.reduce((acc, curr) => {
        if (curr.downtimeHours) return acc + curr.downtimeHours;
        const startMs = new Date(curr.tanggal).getTime();
        const endMs = curr.completedAt ? new Date(curr.completedAt).getTime() : Date.now();
        const diffHrs = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));
        return acc + (isNaN(diffHrs) ? 8 : diffHrs);
      }, 0);

      const calendarHours = 720;
      const pa = Math.min(100, Math.max(0, ((calendarHours - unitDowntime) / calendarHours) * 100));

      return {
        cn: u.cnNew,
        nama: u.namaAlat,
        jenis: u.jenis,
        breakdownCount: unitBreakdowns.length,
        downtimeHours: unitDowntime,
        pa: pa.toFixed(1),
        isBreakdownNow: unitBreakdowns.some((b) => b.statusUnit === 'BREAKDOWN'),
      };
    });
  }, [units, filteredBreakdowns]);

  // 3. Pareto Component (Data dari Component di Sub Modul 1)
  const paretoComponentData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBreakdowns.forEach((b) => {
      const comp = b.component || 'Other';
      counts[comp] = (counts[comp] || 0) + 1;
    });

    const totalCount = filteredBreakdowns.length || 1;
    const sorted = Object.entries(counts)
      .map(([component, count]) => ({
        component,
        count,
        percentage: ((count / totalCount) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return sorted;
  }, [filteredBreakdowns]);

  // 4. Bar Indicator (Bottleneck) Data dari "PROGRESS" di Sub Modul 2
  const bottleneckProgressData = useMemo(() => {
    const counts: Record<string, number> = {};
    BREAKDOWN_PROGRESS_OPTIONS.forEach((p) => {
      counts[p] = 0;
    });

    filteredBreakdowns.forEach((b) => {
      const prog = b.progress || 'On Progress';
      counts[prog] = (counts[prog] || 0) + 1;
    });

    const total = filteredBreakdowns.length || 1;
    return Object.entries(counts).map(([progress, count]) => ({
      progress,
      count,
      percentage: ((count / total) * 100).toFixed(1),
    }));
  }, [filteredBreakdowns]);

  // 5. Bar Indicator Data unit yang sering rusak by "JENIS" di Sub Modul 2
  const rusakByJenisData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBreakdowns.forEach((b) => {
      const j = b.jenis || 'Lainnya';
      counts[j] = (counts[j] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .map(([jenis, count]) => ({
        jenis,
        count,
        barPercent: Math.round((count / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBreakdowns]);

  // 6. Bar Indicator Data unit yang sering rusak by "NO UNIT" di Sub Modul 2
  const rusakByNoUnitData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBreakdowns.forEach((b) => {
      const u = b.noUnit || 'Unknown';
      counts[u] = (counts[u] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .map(([noUnit, count]) => ({
        noUnit,
        count,
        barPercent: Math.round((count / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 unit paling sering rusak
  }, [filteredBreakdowns]);

  // 1. PRINT HANDLER
  const handlePrint = () => {
    window.print();
  };

  // 2. EXPORT PDF HANDLER (Menggunakan print view beresolusi tinggi yang dapat langsung disimpan sebagai PDF)
  const handleExportPDF = () => {
    window.print();
  };

  // 3. EXPORT EXCEL HANDLER (.csv format kompatibel dengan Excel, Google Sheets, dll)
  const handleExportExcel = () => {
    if (!canExport) {
      alert('Akses Ditolak: Akun Anda dalam mode Hanya Viewer.');
      return;
    }
    const headers = [
      'No Notifikasi',
      'Tanggal',
      'Jam',
      'No Unit',
      'Nama Alat',
      'Jenis',
      'Model Unit',
      'Serial Number',
      'Komponen Rusak',
      'Detail Kerusakan',
      'Status Unit',
      'Progress',
      'Start Job',
      'Downtime Hours',
      'PIC 1',
      'PIC 2',
      'PIC 3',
      'Remark'
    ];
    const rows = filteredBreakdowns.map((b) => [
      `"${b.noNotifikasi || ''}"`,
      `"${b.tanggal || ''}"`,
      `"${b.jam || ''}"`,
      `"${b.noUnit || ''}"`,
      `"${(b.namaAlat || '').replace(/"/g, '""')}"`,
      `"${(b.jenis || '').replace(/"/g, '""')}"`,
      `"${(b.modelUnit || '').replace(/"/g, '""')}"`,
      `"${(b.snUnit || '').replace(/"/g, '""')}"`,
      `"${(b.komponenRusak || '').replace(/"/g, '""')}"`,
      `"${(b.detailKerusakan || '').replace(/"/g, '""')}"`,
      `"${b.statusUnit || ''}"`,
      `"${b.progress || ''}"`,
      `"${b.startJob || ''}"`,
      `"${b.downtimeHours ?? ''}"`,
      `"${(b.pic1 || '').replace(/"/g, '""')}"`,
      `"${(b.pic2 || '').replace(/"/g, '""')}"`,
      `"${(b.pic3 || '').replace(/"/g, '""')}"`,
      `"${(b.remark || '').replace(/"/g, '""')}"`,
    ]);

    const summary = [
      ['PT BATU KALI WELANG AMPUH'],
      ['LAPORAN REKAPITULASI MAINTENANCE & PHYSICAL AVAILABILITY (PA)'],
      [`Periode Filter:`, `${filterStartDate || 'Awal'} s/d ${filterEndDate || 'Kini'} | Bulan: ${filterBulan || 'Semua'} | Tahun: ${filterTahun || 'Semua'}`],
      [`Tanggal Export:`, `${new Date().toLocaleString('id-ID')}`],
      [`Diexport Oleh:`, `${currentUser?.nama || currentUser?.username || 'User'} (${currentUser?.accountTier || currentUser?.role})`],
      [],
      ['--- RINGKASAN METRIK KPI FLEET AVAILABILITY ---'],
      ['Rata-rata Physical Availability (PA %)', `${paStats.paPercentage}%`],
      ['Total Akumulasi Downtime (Jam)', `${paStats.totalDowntimeHours} Jam`],
      ['Total Jam Kalender Armada', `${paStats.standardCalendarHours} Jam`],
      ['Total Armada Terdaftar', `${units.length} Unit`],
      ['Total Kasus Breakdown', `${filteredBreakdowns.length} Kejadian`],
      [],
      ['--- DAFTAR DETAIL RIWAYAT BREAKDOWN MAINTENANCE ---']
    ];

    const csvContent = '\uFEFF' + 
      summary.map(s => s.join(',')).join('\r\n') + '\r\n' +
      headers.join(',') + '\r\n' +
      rows.map(r => r.join(',')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Dashboard_Maintenance_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. EXPORT WORD HANDLER (.doc format)
  const handleExportWord = () => {
    if (!canExport) {
      alert('Akses Ditolak: Akun Anda dalam mode Hanya Viewer.');
      return;
    }
    const dateStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Laporan Dashboard Maintenance - PT BATU KALI WELANG AMPUH</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; margin: 20px; }
          h1 { font-size: 16pt; color: #b45309; text-align: center; margin-bottom: 2px; }
          h2 { font-size: 12pt; color: #1e293b; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; margin-top: 16px; }
          p.subtitle { text-align: center; font-size: 9.5pt; color: #64748b; margin-top: 0; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 9pt; }
          th, td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; margin-bottom: 12px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>PT BATU KALI WELANG AMPUH</h1>
        <p class="subtitle"><strong>DIVISI ALAT BERAT & PERAWATAN ARMADA (MAINTENANCE)</strong><br>Laporan Eksekutif Dashboard Maintenance & Physical Availability (PA) Unit<br>Tanggal Cetak: ${dateStr}</p>
        
        <div class="kpi-card">
          <strong>RINGKASAN EKSEKUTIF KPI:</strong><br>
          • Rata-rata Physical Availability (PA): <strong>${paStats.paPercentage}%</strong><br>
          • Total Akumulasi Downtime: <strong>${paStats.totalDowntimeHours} Jam</strong><br>
          • Total Armada Terdaftar: <strong>${units.length} Unit</strong><br>
          • Kejadian Kerusakan Terfilter: <strong>${filteredBreakdowns.length} Kasus</strong><br>
          • Filter Periode: <strong>${filterStartDate || 'Semua'} s/d ${filterEndDate || 'Sekarang'} (Bulan: ${filterBulan || 'Semua'}, Tahun: ${filterTahun || 'Semua'})</strong>
        </div>

        <h2>1. Rekapitulasi Kasus Kerusakan per Jenis Alat</h2>
        <table>
          <thead>
            <tr><th>Jenis Alat</th><th>Jumlah Kasus Kerusakan</th></tr>
          </thead>
          <tbody>
            ${rusakByJenisData.map(j => `<tr><td>${j.jenis}</td><td>${j.count} Kasus</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>2. Rekapitulasi Kasus Kerusakan per Komponen</h2>
        <table>
          <thead>
            <tr><th>Komponen Unit</th><th>Jumlah Kasus</th><th>Persentase (%)</th></tr>
          </thead>
          <tbody>
            ${paretoComponentData.map(p => `<tr><td>${p.component}</td><td>${p.count}</td><td>${p.percentage}%</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>3. Detail Riwayat Breakdown & Penanganan</h2>
        <table>
          <thead>
            <tr>
              <th>No Notifikasi</th>
              <th>Tgl & Jam</th>
              <th>No Unit</th>
              <th>Nama Alat</th>
              <th>Komponen</th>
              <th>Status Unit</th>
              <th>Progress</th>
              <th>PIC</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBreakdowns.map(b => `
              <tr>
                <td>${b.noNotifikasi || '-'}</td>
                <td>${b.tanggal} ${b.jam || ''}</td>
                <td><strong>${b.noUnit}</strong></td>
                <td>${b.namaAlat}</td>
                <td>${b.komponenRusak || '-'}</td>
                <td>${b.statusUnit}</td>
                <td>${b.progress || '-'}</td>
                <td>${[b.pic1, b.pic2].filter(Boolean).join(', ') || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <br><br>
        <table style="border: none; margin-top: 30px;">
          <tr style="border: none;">
            <td style="border: none; width: 50%; text-align: center;">
              Dibuat Oleh,<br><br><br><br>
              <strong>(${currentUser?.nama || currentUser?.username || 'Staff Maintenance'})</strong><br>
              ${currentUser?.accountTier || currentUser?.role || 'Staff'}
            </td>
            <td style="border: none; width: 50%; text-align: center;">
              Mengetahui & Menyetujui,<br><br><br><br>
              <strong>( Kepala Workshop / Developer )</strong><br>
              PT BATU KALI WELANG AMPUH Quarry Purwosari
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\uFEFF' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Dashboard_Maintenance_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER TGL, BLN, TH (Hanya Menampilkan Data Saja) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono uppercase tracking-wider">
                Sub Modul 3: Dashboard Maintenance
              </h2>
              <p className="text-xs text-stone-400">
                Pusat visualisasi performa armada, ketersediaan fisik (PA), downtime, pareto komponen & indikator bottleneck.
              </p>
            </div>
          </div>

          {/* MENU EXPORT (PDF/Word/Excel) & PRINT */}
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <>
                {/* 1. PRINT BUTTON */}
                <button
                  id="btn-print-maintenance"
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition shadow"
                  title="Cetak Laporan Maintenance langsung"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print</span>
                </button>

                {/* 2. EXPORT PDF BUTTON */}
                <button
                  id="btn-export-pdf-maintenance"
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 text-rose-200 border border-rose-800 text-xs font-bold transition shadow"
                  title="Download / Simpan sebagai PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Export PDF</span>
                </button>

                {/* 3. EXPORT WORD BUTTON */}
                <button
                  id="btn-export-word-maintenance"
                  type="button"
                  onClick={handleExportWord}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 text-blue-200 border border-blue-800 text-xs font-bold transition shadow"
                  title="Download format Microsoft Word (.doc)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Word (.doc)</span>
                </button>

                {/* 4. EXPORT EXCEL BUTTON */}
                <button
                  id="btn-export-excel-maintenance"
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-800 text-xs font-bold transition shadow"
                  title="Download format Excel Spreadsheet (.csv / .xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Excel</span>
                </button>

                {/* 5. GOTO LAPORAN HARIAN (READY P2H & BREAKDOWN) */}
                {onOpenLaporanHarian && (
                  <button
                    id="btn-goto-laporan-harian"
                    type="button"
                    onClick={onOpenLaporanHarian}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-950/80 hover:bg-teal-900/90 text-teal-200 border border-teal-800 text-xs font-bold transition shadow"
                    title="Buka Menu Export Laporan Harian Unit Ready (P2H) & Breakdown"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Laporan Harian (P2H &amp; BD)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-400 text-xs font-mono">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Export Terbatas (Hanya View)</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetFilter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-700 bg-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-700 text-xs font-mono transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Panel Filter: Tanggal, Bulan, Tahun */}
        <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800">
          <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-amber-400">
            <Filter className="w-4 h-4" />
            <span>FILTER WAKTU & PERIODE ANALISIS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Filter Tanggal Mulai */}
            <div>
              <label className="block text-[10px] font-mono text-stone-400 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Filter Tanggal Sampai */}
            <div>
              <label className="block text-[10px] font-mono text-stone-400 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Filter Bulan */}
            <div>
              <label className="block text-[10px] font-mono text-stone-400 mb-1">Pilih Bulan</label>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Semua Bulan --</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>

            {/* Filter Tahun */}
            <div>
              <label className="block text-[10px] font-mono text-stone-400 mb-1">Pilih Tahun</label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Semua Tahun --</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS: PA UNIT & DOWNTIME (HOURS JAM DUNIA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PA Unit (Fleet Average) */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-stone-400">PA Unit (Fleet)</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">{paStats.paPercentage}%</span>
            <span className="text-xs text-stone-500 font-mono">Target: ≥ 85%</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">Physical Availability rata-rata seluruh armada</p>
        </div>

        {/* DownTime Unit (Hours Jam Dunia) */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-stone-400">DownTime Unit</span>
            <Clock className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-rose-400">{paStats.totalDowntimeHours}</span>
            <span className="text-xs text-stone-300 font-mono">Jam Dunia</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">Total durasi kerusakan alat selama periode</p>
        </div>

        {/* Total Insiden Breakdown */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-stone-400">Total Kerusakan</span>
            <Wrench className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-400">{filteredBreakdowns.length}</span>
            <span className="text-xs text-stone-400 font-mono">Laporan Kejadian</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">Jumlah insiden breakdown yang tercatat</p>
        </div>

        {/* Unit Breakdown Aktif Sekarang */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-stone-400">Breakdown Aktif</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-stone-100">
              {filteredBreakdowns.filter((b) => b.statusUnit === 'BREAKDOWN').length}
            </span>
            <span className="text-xs text-rose-400 font-mono">Unit Sedang Off</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">Unit yang belum kembali status READY</p>
        </div>
      </div>

      {/* BARIS UTAMA: PA PER UNIT & PARETO COMPONENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TABEL PA UNIT PER UNIT */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>PA Unit & Downtime per Unit</span>
              </h3>
              <p className="text-[11px] text-stone-400">Persentase Physical Availability dan jam downtime tiap alat</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 sticky top-0">
                <tr>
                  <th className="px-3 py-2">No Unit</th>
                  <th className="px-3 py-2">Nama Alat</th>
                  <th className="px-3 py-2 text-center">Incidents</th>
                  <th className="px-3 py-2 text-right">Downtime</th>
                  <th className="px-3 py-2 text-right">PA (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {unitPaList.map((item) => (
                  <tr key={item.cn} className="hover:bg-stone-800/40">
                    <td className="px-3 py-2 font-bold text-stone-100">{item.cn}</td>
                    <td className="px-3 py-2 font-sans text-stone-300 text-[11px]">{item.nama}</td>
                    <td className="px-3 py-2 text-center text-amber-400">{item.breakdownCount}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{item.downtimeHours} Jam</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          Number(item.pa) >= 85
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : Number(item.pa) >= 70
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {item.pa}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PARETO COMPONENT (Ambil Data dari Component di Sub Modul 1) */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Pareto Kerusakan Component (Sub Modul 1)</span>
              </h3>
              <p className="text-[11px] text-stone-400">Komponen sistem alat berat yang paling sering mengalami kerusakan</p>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {paretoComponentData.length === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-8">Belum ada data komponen kerusakan.</p>
            ) : (
              paretoComponentData.map((item) => (
                <div key={item.component} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-stone-200 font-semibold">{item.component}</span>
                    <span className="text-amber-400 font-bold">
                      {item.count} kasus ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3 BAR INDICATORS: BOTTLENECK, RUSAK BY JENIS, RUSAK BY NO UNIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BAR INDICATOR 1: BOTTLENECK DATA DARI "PROGRES" DI SUB MODUL 2 */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="pb-3 mb-3 border-b border-stone-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>Bottleneck Indikator (Progress Sub Modul 2)</span>
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Hambatan paling dominan yang menahan proses penyelesaian perbaikan
            </p>
          </div>

          <div className="space-y-3">
            {bottleneckProgressData.map((item) => (
              <div key={item.progress} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 text-[11px] truncate">{item.progress}</span>
                  <span className="text-rose-300 font-bold text-[11px]">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.progress.includes('Waiting') || item.progress.includes('Cuaca')
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BAR INDICATOR 2: DATA UNIT SERING RUSAK BY "JENIS" */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="pb-3 mb-3 border-b border-stone-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Kerusakan by Jenis Unit (Sub Modul 2)</span>
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Distribusi frekuensi insiden kerusakan berdasarkan kelompok jenis alat
            </p>
          </div>

          <div className="space-y-3">
            {rusakByJenisData.length === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-6">Belum ada data.</p>
            ) : (
              rusakByJenisData.map((item) => (
                <div key={item.jenis} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-stone-200 font-semibold">{item.jenis}</span>
                    <span className="text-blue-400 font-bold">{item.count} Unit</span>
                  </div>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.barPercent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BAR INDICATOR 3: DATA UNIT SERING RUSAK BY "NO UNIT" */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl">
          <div className="pb-3 mb-3 border-b border-stone-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-400" />
              <span>Kerusakan by No Unit (Top Frequency)</span>
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Unit alat berat yang paling sering mencatat laporan kerusakan
            </p>
          </div>

          <div className="space-y-3">
            {rusakByNoUnitData.length === 0 ? (
              <p className="text-xs text-stone-500 italic text-center py-6">Belum ada data.</p>
            ) : (
              rusakByNoUnitData.map((item) => (
                <div key={item.noUnit} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-stone-200 font-bold">{item.noUnit}</span>
                    <span className="text-purple-400 font-bold">{item.count} Kali</span>
                  </div>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.barPercent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
