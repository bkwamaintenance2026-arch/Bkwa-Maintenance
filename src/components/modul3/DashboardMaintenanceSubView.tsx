import React, { useState, useMemo } from 'react';
import { 
  BreakdownRecord, 
  AssetUnit, 
  BREAKDOWN_COMPONENT_OPTIONS, 
  BREAKDOWN_PROGRESS_OPTIONS 
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
  TrendingDown
} from 'lucide-react';

interface DashboardMaintenanceSubViewProps {
  breakdowns: BreakdownRecord[];
  units: AssetUnit[];
}

export const DashboardMaintenanceSubView: React.FC<DashboardMaintenanceSubViewProps> = ({
  breakdowns,
  units,
}) => {
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

          <button
            type="button"
            onClick={handleResetFilter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-700 text-xs font-mono transition self-start lg:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
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
