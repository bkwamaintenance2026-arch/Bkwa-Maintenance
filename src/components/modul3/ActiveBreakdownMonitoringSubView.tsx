import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
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
  Layers,
  ArrowRight
} from 'lucide-react';

interface ActiveBreakdownMonitoringSubViewProps {
  units: AssetUnit[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onNavigateToUpdate: (record: BreakdownRecord) => void;
  onNavigateToDetail?: (record: BreakdownRecord) => void;
}

export const ActiveBreakdownMonitoringSubView: React.FC<ActiveBreakdownMonitoringSubViewProps> = ({
  units,
  breakdowns,
  currentUser,
  onNavigateToUpdate,
  onNavigateToDetail,
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

  // Helper hitung downtime realtime dari awal breakdown
  const calculateDowntime = (tanggal: string, jamBreakdown?: string) => {
    if (!tanggal) {
      return { totalHours: 0, days: 0, remainingHours: 0, minutes: 0, formatted: '-' };
    }

    try {
      // Format tanggal YYYY-MM-DD dan Jam HH:mm
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Widget Live Monitoring */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                LIVE REALTIME MONITORING
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                Interval: 60 dtk
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
              <span>MONITORING UNIT BREAKDOWN &amp; REALTIME DOWNTIME</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Memantau seluruh unit alat berat yang sedang tidak beroperasi (belum READY), pekerjaan perbaikan terakhir, teknisi bertugas, dan durasi downtime berjalan secara aktual.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setCurrentTime(Date.now())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow"
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

      {/* Filter & Kontrol Pencarian */}
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

      {/* Tabel Sederhana Monitoring Breakdown Aktif */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {sortedBreakdowns.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-stone-800 m-5 rounded-2xl bg-stone-950/40">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-mono font-bold text-stone-100">Semua Unit Dalam Kondisi READY</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
              Tidak ada unit yang sedang mengalami breakdown atau keterbatasan operasi saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3.5 py-3.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Unit Alat</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap" title="Breakdown Type: SC = Schedule, Uns = Unschedule, Acc = Accident">Tipe</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Reff No. MO</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Mulai Breakdown</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Komponen &amp; Problem</th>
                  <th className="px-3.5 py-3.5 min-w-[200px]">Pekerjaan Terakhir</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">PIC Teknisi</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Realtime Downtime</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Status Unit</th>
                  <th className="px-3.5 py-3.5 text-center whitespace-nowrap">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                {sortedBreakdowns.map((b, idx) => {
                  const dt = calculateDowntime(b.tanggal, b.jamBreakdown);
                  const isSevere = dt.totalHours >= 72;
                  const isCritical = dt.totalHours >= 24 && dt.totalHours < 72;

                  // Ambil data mutakhir strictly dari riwayatUpdate breakdown terakhir
                  const latestUpdate = getLatestBreakdownUpdate(b);

                  const lastJob = latestUpdate
                    ? (latestUpdate.detailKerusakan || latestUpdate.detailPekerjaan || '-')
                    : (b.detailKerusakan || b.detailProblem || '-');

                  // PIC Teknisi strictly dari update breakdown terakhir (tidak mengambil PIC Pelapor input)
                  const rawPics = latestUpdate
                    ? [latestUpdate.pic1, latestUpdate.pic2, latestUpdate.pic3].filter((p) => Boolean(p && p.trim())).join(', ')
                    : '';
                  const mechanics = rawPics || '-';

                  const currentProgress = latestUpdate?.progress || b.progress || 'On Progress';

                  // Status Unit strictly dari update breakdown terakhir
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

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-stone-800/40 transition group"
                    >
                      {/* 1. No */}
                      <td className="px-3.5 py-3.5 text-center text-stone-500">
                        {idx + 1}
                      </td>

                      {/* 2. Unit Alat */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
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

                      {/* 3. Tipe Breakdown (SC, Uns, Acc) */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-black border ${typeColor} shadow-sm inline-block`}
                          title={`Tipe Breakdown: ${typeLabel} (${typeShort})`}
                        >
                          {typeShort}
                        </span>
                      </td>

                      {/* 4. Reff No MO */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-amber-400 block">
                          {b.noMaintenanceOrder || b.noNotifikasi || '-'}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          Notif: {b.noNotifikasi}
                        </span>
                      </td>

                      {/* 5. Tanggal & Jam Mulai Breakdown */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <div className="text-stone-200">{b.tanggal}</div>
                        <div className="text-[10px] text-amber-400/90 font-bold">
                          Jam {b.jamBreakdown || '-'}
                        </div>
                      </td>

                      {/* 6. Komponen & Problem Awal */}
                      <td className="px-3.5 py-3.5 max-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/50">
                            {b.component || 'Other'}
                          </span>
                        </div>
                        <div className="text-stone-300 font-sans line-clamp-2 text-[11px]" title={b.detailProblem}>
                          {b.detailProblem || '-'}
                        </div>
                      </td>

                      {/* 7. Pekerjaan Terakhir (Hasil Update Terkini) */}
                      <td className="px-3.5 py-3.5 max-w-[260px]">
                        <div className="font-sans text-stone-100 line-clamp-2 text-xs" title={lastJob}>
                          {lastJob}
                        </div>
                        {latestUpdate?.tanggal && (
                          <span className="text-[9px] text-stone-500 font-mono mt-0.5 block">
                            Update: {latestUpdate.tanggal} {latestUpdate.startJob ? `(${latestUpdate.startJob})` : ''}
                          </span>
                        )}
                      </td>

                      {/* 8. PIC Mekanik yang Mengerjakan (Strict Update Terakhir) */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap font-sans">
                        <div className="text-stone-200 font-semibold text-xs">
                          {mechanics}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {rawPics ? 'Teknisi Update Terkini' : 'Belum Ada Penugasan'}
                        </div>
                      </td>

                      {/* 9. Realtime Downtime Counter */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold inline-flex items-center gap-1.5 ${
                            isSevere
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{dt.formatted}</span>
                        </span>
                        <span className="text-[9px] text-stone-500 block mt-0.5 font-mono">
                          Total: {dt.totalHours} Jam
                        </span>
                      </td>

                      {/* 10. Status Unit & Progress (Strict Update Terakhir) */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
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

                      {/* 10. Aksi Cepat */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => onNavigateToUpdate(b)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30 text-xs font-bold font-mono transition cursor-pointer"
                            title="Lanjutkan update breakdown unit ini"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Update</span>
                          </button>

                          {onNavigateToDetail && (
                            <button
                              type="button"
                              onClick={() => onNavigateToDetail(b)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition cursor-pointer"
                              title="Buka Kartu Riwayat Detail MO"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
  );
};
