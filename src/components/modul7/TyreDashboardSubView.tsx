import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  HeavyEquipment, 
  TyreInstallRecord, 
  TyreRegistration, 
  TyreRemoveRecord, 
  UserAccount 
} from '../../types';
import { isDeveloper } from '../../utils/storage';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Disc, 
  Calendar, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Lock, 
  Download, 
  Printer, 
  Layers, 
  ShieldAlert, 
  ArrowRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Clock,
  Gauge
} from 'lucide-react';

interface TyreDashboardSubViewProps {
  units: (AssetUnit | HeavyEquipment)[];
  tyreRegistrations: TyreRegistration[];
  tyreInstalls: TyreInstallRecord[];
  tyreRemoves: TyreRemoveRecord[];
  currentUser: UserAccount;
  onEditTyre?: (tyre: TyreRegistration) => void;
  onDeleteTyre?: (id: string) => { success: boolean; message: string };
  onNavigateToInstall?: (kodeTyre?: string, unitCn?: string) => void;
  onNavigateToRemove?: (kodeTyre?: string, unitCn?: string) => void;
}

export const TyreDashboardSubView: React.FC<TyreDashboardSubViewProps> = ({
  units,
  tyreRegistrations,
  tyreInstalls,
  tyreRemoves,
  currentUser,
  onEditTyre,
  onDeleteTyre,
  onNavigateToInstall,
  onNavigateToRemove,
}) => {
  const isDev = isDeveloper(currentUser);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SAFE'>('ALL');
  const [selectedUnitCn, setSelectedUnitCn] = useState<string>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper CN & Nama Alat
  const getUnitCn = (u: any): string => u?.cnNew || u?.codeNumber || u?.kodeUnit || '';
  const getUnitName = (u: any): string => {
    if (u?.namaAlat) return u.namaAlat;
    const b = u?.brandMerk || u?.brand || '';
    const m = u?.modelUnit || u?.model || '';
    return `${b} ${m}`.trim() || getUnitCn(u) || 'Heavy Equipment';
  };

  // Kalkulasi detail persentase sisa ketebalan dan keausan untuk setiap ban
  const tyreMonitoringList = useMemo(() => {
    return tyreRegistrations.map((t) => {
      const initial = t.initialDepthThread && t.initialDepthThread > 0 ? t.initialDepthThread : 25;
      const current = t.currentDepthThread !== undefined ? t.currentDepthThread : initial;

      // Hitung persentase sisa kembangan (Remaining Thread %)
      const remainingPercent = Math.max(0, Math.min(100, Math.round((current / initial) * 100)));
      // Hitung persentase keausan (Wear %)
      const wearPercent = 100 - remainingPercent;

      // Urgensi penggantian ban:
      // Kritis: Sisa <= 25% (Wear >= 75%)
      // Warning: Sisa 26% - 40% (Wear 60% - 74%)
      // Safe: Sisa > 40% (Wear < 60%)
      let urgency: 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE';
      let urgencyLabel = 'KONDISI AMAN';
      let actionRecommendation = 'Kondisi tapak ban masih tebal dan layak beroperasi normal di pit.';

      if (remainingPercent <= 25) {
        urgency = 'CRITICAL';
        urgencyLabel = 'SEGERA DIGANTI';
        actionRecommendation = '🚨 SEGERA GANTI: Persiapkan ban baru di workshop dan jadwal penarikan unit!';
      } else if (remainingPercent <= 40) {
        urgency = 'WARNING';
        urgencyLabel = 'SIAPKAN PENGGANTI';
        actionRecommendation = '⚠️ PERINGATAN: Tapak menipis, pantau tekanan angin & siapkan stok cadangan.';
      }

      // Cari tanggal pasang terakhir
      const lastInstall = tyreInstalls
        .filter((inst) => inst.kodeTyre.toUpperCase() === t.kodeTyre.toUpperCase())
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];

      return {
        ...t,
        initialDepth: initial,
        currentDepth: current,
        remainingPercent,
        wearPercent,
        urgency,
        urgencyLabel,
        actionRecommendation,
        lastInstall,
      };
    });
  }, [tyreRegistrations, tyreInstalls]);

  // Tyre yang terpasang di unit fleet
  const installedTyres = useMemo(() => {
    return tyreMonitoringList.filter((t) => t.status === 'INSTALLED' && t.currentUnit);
  }, [tyreMonitoringList]);

  // Statistik Kritis & Penggantian
  const criticalCount = installedTyres.filter((t) => t.urgency === 'CRITICAL').length;
  const warningCount = installedTyres.filter((t) => t.urgency === 'WARNING').length;
  const safeCount = installedTyres.filter((t) => t.urgency === 'SAFE').length;
  const availableStockCount = tyreMonitoringList.filter((t) => t.status === 'AVAILABLE').length;

  // Daftar Unit yang memiliki ban terpasang
  const unitsWithTyres = useMemo(() => {
    const set = new Set<string>();
    installedTyres.forEach((t) => {
      if (t.currentUnit) set.add(t.currentUnit);
    });
    return Array.from(set).sort();
  }, [installedTyres]);

  // Filtered List untuk Tabel Monitoring (Diurutkan dari Sisa % Terendah / Paling Kritis ke Atas)
  const filteredMonitoringList = useMemo(() => {
    return installedTyres
      .filter((t) => {
        const matchSearch =
          t.kodeTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.merkTyre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.currentUnit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.currentPosisi || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchPriority =
          priorityFilter === 'ALL' ||
          (priorityFilter === 'CRITICAL' && t.urgency === 'CRITICAL') ||
          (priorityFilter === 'WARNING' && t.urgency === 'WARNING') ||
          (priorityFilter === 'SAFE' && t.urgency === 'SAFE');

        const matchUnit = selectedUnitCn === 'ALL' || t.currentUnit === selectedUnitCn;

        return matchSearch && matchPriority && matchUnit;
      })
      .sort((a, b) => a.remainingPercent - b.remainingPercent); // Urutkan sisa % dari yang paling rendah
  }, [installedTyres, searchTerm, priorityFilter, selectedUnitCn]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Kode Tyre',
      'Unit (CN New)',
      'Nama Alat',
      'Posisi',
      'Merk Tyre',
      'Ukuran Tyre',
      'Tread Awal (mm)',
      'Tread Sisa (mm)',
      'Sisa Tread (%)',
      'Keausan (%)',
      'Status Urgensi',
      'Rekomendasi Tindakan',
      'Tanggal Pasang',
    ];

    const rows = filteredMonitoringList.map((t, idx) => [
      idx + 1,
      t.kodeTyre,
      t.currentUnit || '-',
      getUnitName(units.find((u) => getUnitCn(u) === t.currentUnit)),
      t.currentPosisi || '-',
      t.merkTyre,
      t.ukuranTyre,
      t.initialDepth,
      t.currentDepth,
      `${t.remainingPercent}%`,
      `${t.wearPercent}%`,
      t.urgencyLabel,
      `"${t.actionRecommendation.replace(/"/g, '""')}"`,
      t.lastInstall?.tanggal || '-',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MONITORING_TYRE_BKWA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Visual Wheel Position Map untuk Unit Terpilih
  const activeInspectionUnit = selectedUnitCn !== 'ALL' ? selectedUnitCn : (unitsWithTyres[0] || 'DT01');
  const tyresForInspectionUnit = installedTyres.filter((t) => t.currentUnit === activeInspectionUnit);

  const getTyreAtPos = (pos: string) => {
    return tyresForInspectionUnit.find(
      (t) => (t.currentPosisi || '').toUpperCase() === pos.toUpperCase()
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Gauge className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono flex items-center gap-2">
                <span>SUB MODUL 2.C: DASHBOARD TYRE MANAGEMENT</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  MONITORING KEAUSAN
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Monitoring persentase keausan ban terpasang agar Anda dapat menentukan ban mana yang harus segera dipersiapkan untuk diganti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold shadow-md transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold shadow-md transition"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Cetak Radar</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Persentase Keausan Ban */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-800/80">
          {/* Kartu 1: Kritis Segera Ganti */}
          <div 
            onClick={() => setPriorityFilter('CRITICAL')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              priorityFilter === 'CRITICAL'
                ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/60'
                : 'bg-rose-950/20 border-rose-800/40 hover:bg-rose-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span>SEGERA GANTI (&le; 25%)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                Prioritas 1
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-300 mt-1">
              {criticalCount} <span className="text-xs font-normal text-rose-400">Ban Kritis</span>
            </div>
            <p className="text-[10px] text-rose-400/80 mt-1">
              Harus segera disiapkan ban baru &amp; jadwal servis.
            </p>
          </div>

          {/* Kartu 2: Siapkan Pengganti / Warning */}
          <div 
            onClick={() => setPriorityFilter('WARNING')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              priorityFilter === 'WARNING'
                ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-950/60'
                : 'bg-amber-950/20 border-amber-800/40 hover:bg-amber-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>SIAPKAN BAN (26 - 40%)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                Pantauan
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
              {warningCount} <span className="text-xs font-normal text-amber-400">Ban Menipis</span>
            </div>
            <p className="text-[10px] text-amber-400/80 mt-1">
              Tapak mendekati batas aman operasional pit.
            </p>
          </div>

          {/* Kartu 3: Kondisi Aman */}
          <div 
            onClick={() => setPriorityFilter('SAFE')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              priorityFilter === 'SAFE'
                ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950/60'
                : 'bg-emerald-950/20 border-emerald-800/40 hover:bg-emerald-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>KONDISI AMAN (&gt; 40%)</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Normal
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
              {safeCount} <span className="text-xs font-normal text-emerald-400">Ban Prima</span>
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-1">
              Kembangan tebal dan aman untuk hauling tambang.
            </p>
          </div>

          {/* Kartu 4: Total Terpasang & Stok Gudang */}
          <div 
            onClick={() => setPriorityFilter('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              priorityFilter === 'ALL'
                ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-950/60'
                : 'bg-stone-950/60 border-stone-800 hover:bg-stone-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-400 uppercase">
                TOTAL FLEET &amp; GUDANG
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                Semua
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-stone-100 mt-1">
              {installedTyres.length} <span className="text-xs font-normal text-blue-400">Terpasang</span>
            </div>
            <p className="text-[10px] text-emerald-400 mt-1 font-mono">
              + {availableStockCount} Ban Ready di Gudang
            </p>
          </div>
        </div>
      </div>

      {/* Developer Notice */}
      <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${isDev ? 'text-amber-400' : 'text-stone-500'}`} />
          <span>
            {isDev ? (
              <span className="text-amber-300 font-semibold font-mono">
                Akun Developer: Anda memiliki otoritas Edit &amp; Delete penuh untuk seluruh data tyre di dashboard.
              </span>
            ) : (
              <span>Akses Edit &amp; Delete di dashboard dikunci khusus untuk Akun Developer.</span>
            )}
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
          User: {currentUser.fullName || currentUser.username} ({currentUser.accountTier || 'Member'})
        </span>
      </div>

      {/* Visual Unit Chassis Tyre Map (Peta Ban Unit) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-stone-100">
                DIAGRAM POSISI BAN UNIT (CHASSIS TYRE MAP)
              </h3>
              <p className="text-[11px] text-stone-400">
                Pilih unit fleet untuk melihat posisi ban terpasang, persentase sisa kembangan, dan alarm kondisi ban.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-mono">Pilih Unit:</span>
            <select
              value={activeInspectionUnit}
              onChange={(e) => setSelectedUnitCn(e.target.value)}
              className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500/60"
            >
              {unitsWithTyres.length === 0 ? (
                <option value="ALL">Tidak ada unit terpasang</option>
              ) : (
                unitsWithTyres.map((cn) => (
                  <option key={cn} value={cn}>
                    Unit {cn} — {getUnitName(units.find((u) => getUnitCn(u) === cn))}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Chassis Layout Grid */}
        <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800/80">
          <div className="text-center mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-stone-800 text-stone-200 border border-stone-700">
              DEPAN UNIT (KABIN / ENGINE)
            </span>
          </div>

          {/* Roda Depan (Front Axle) */}
          <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto my-3">
            {/* Front Left (FL) */}
            {(() => {
              const fl = getTyreAtPos('FL') || getTyreAtPos('POS-1');
              return (
                <div
                  className={`p-3 rounded-xl border transition ${
                    !fl
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : fl.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50'
                      : fl.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-950 text-stone-300 border border-stone-800">
                      FL (Depan Kiri)
                    </span>
                    {fl && (
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                        fl.urgency === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : fl.urgency === 'WARNING' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {fl.urgencyLabel}
                      </span>
                    )}
                  </div>
                  {fl ? (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-mono font-bold text-stone-100 flex items-center justify-between">
                        <span>{fl.kodeTyre}</span>
                        <span className="text-amber-400 font-bold">{fl.remainingPercent}% Sisa</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {fl.merkTyre} {fl.ukuranTyre} &bull; {fl.currentDepth} mm
                      </div>
                      <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all ${
                            fl.urgency === 'CRITICAL' ? 'bg-rose-500' : fl.urgency === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fl.remainingPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono py-2 text-center text-stone-600">
                      (Kosong / Belum Ada Ban Terpasang)
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Front Right (FR) */}
            {(() => {
              const fr = getTyreAtPos('FR') || getTyreAtPos('POS-2');
              return (
                <div
                  className={`p-3 rounded-xl border transition ${
                    !fr
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : fr.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50'
                      : fr.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-950 text-stone-300 border border-stone-800">
                      FR (Depan Kanan)
                    </span>
                    {fr && (
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                        fr.urgency === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : fr.urgency === 'WARNING' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {fr.urgencyLabel}
                      </span>
                    )}
                  </div>
                  {fr ? (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-mono font-bold text-stone-100 flex items-center justify-between">
                        <span>{fr.kodeTyre}</span>
                        <span className="text-amber-400 font-bold">{fr.remainingPercent}% Sisa</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {fr.merkTyre} {fr.ukuranTyre} &bull; {fr.currentDepth} mm
                      </div>
                      <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all ${
                            fr.urgency === 'CRITICAL' ? 'bg-rose-500' : fr.urgency === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fr.remainingPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono py-2 text-center text-stone-600">
                      (Kosong / Belum Ada Ban Terpasang)
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sasis Tengah */}
          <div className="w-16 h-8 mx-auto border-l-2 border-r-2 border-stone-800 my-1 opacity-60" />

          {/* Roda Belakang (Rear Dual Axle / Tandem) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto my-3">
            {/* RL1: Rear Left Out */}
            {(() => {
              const rl1 = getTyreAtPos('RL1') || getTyreAtPos('POS-3');
              return (
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    !rl1
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : rl1.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500'
                      : rl1.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-stone-400">RL1 (Kiri Luar)</div>
                  {rl1 ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-mono font-bold text-emerald-400">{rl1.kodeTyre}</div>
                      <div className="text-[10px] font-mono text-stone-300 font-bold">{rl1.remainingPercent}% Sisa</div>
                      <div className="text-[9px] text-stone-500 font-mono">{rl1.currentDepth} mm</div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-600 py-1">-</div>
                  )}
                </div>
              );
            })()}

            {/* RL2: Rear Left In */}
            {(() => {
              const rl2 = getTyreAtPos('RL2');
              return (
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    !rl2
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : rl2.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500'
                      : rl2.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-stone-400">RL2 (Kiri Dalam)</div>
                  {rl2 ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-mono font-bold text-emerald-400">{rl2.kodeTyre}</div>
                      <div className="text-[10px] font-mono text-stone-300 font-bold">{rl2.remainingPercent}% Sisa</div>
                      <div className="text-[9px] text-stone-500 font-mono">{rl2.currentDepth} mm</div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-600 py-1">-</div>
                  )}
                </div>
              );
            })()}

            {/* RR2: Rear Right In */}
            {(() => {
              const rr2 = getTyreAtPos('RR2');
              return (
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    !rr2
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : rr2.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500'
                      : rr2.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-stone-400">RR2 (Kanan Dalam)</div>
                  {rr2 ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-mono font-bold text-emerald-400">{rr2.kodeTyre}</div>
                      <div className="text-[10px] font-mono text-stone-300 font-bold">{rr2.remainingPercent}% Sisa</div>
                      <div className="text-[9px] text-stone-500 font-mono">{rr2.currentDepth} mm</div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-600 py-1">-</div>
                  )}
                </div>
              );
            })()}

            {/* RR1: Rear Right Out */}
            {(() => {
              const rr1 = getTyreAtPos('RR1') || getTyreAtPos('POS-4');
              return (
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    !rr1
                      ? 'bg-stone-900/40 border-dashed border-stone-800 text-stone-600'
                      : rr1.urgency === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-500'
                      : rr1.urgency === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500'
                      : 'bg-emerald-950/30 border-emerald-500/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold text-stone-400">RR1 (Kanan Luar)</div>
                  {rr1 ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-mono font-bold text-emerald-400">{rr1.kodeTyre}</div>
                      <div className="text-[10px] font-mono text-stone-300 font-bold">{rr1.remainingPercent}% Sisa</div>
                      <div className="text-[9px] text-stone-500 font-mono">{rr1.currentDepth} mm</div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-stone-600 py-1">-</div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="text-center mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-stone-800 text-stone-400 border border-stone-700">
              BELAKANG UNIT (VESSEL / DUMP BODY)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar untuk Tabel Monitoring */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-900 border border-stone-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Cari CN Unit, Kode Tyre (ET09-...), Posisi, atau Merk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-rose-500/60"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Prioritas:</span>
          </span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none focus:border-rose-500/60 font-mono"
          >
            <option value="ALL">Semua Prioritas ({installedTyres.length})</option>
            <option value="CRITICAL">🚨 Segera Ganti (&le; 25%) ({criticalCount})</option>
            <option value="WARNING">⚠️ Siapkan Pengganti (26-40%) ({warningCount})</option>
            <option value="SAFE"> Kondisi Aman (&gt; 40%) ({safeCount})</option>
          </select>
        </div>
      </div>

      {/* Tabel Monitoring Prioritas Penggantian Ban */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">Prioritas / Urgensi</th>
                <th className="py-3 px-3">Unit Fleet</th>
                <th className="py-3 px-3">Posisi Ban</th>
                <th className="py-3 px-3">Kode Tyre</th>
                <th className="py-3 px-3">Merk &amp; Ukuran</th>
                <th className="py-3 px-3 text-right">Tread (Sisa / Awal)</th>
                <th className="py-3 px-3 min-w-[160px]">Prosentase Sisa (%)</th>
                <th className="py-3 px-3 text-right">Keausan (%)</th>
                <th className="py-3 px-3">Rekomendasi Tindakan</th>
                <th className="py-3 px-3 text-center">Aksi (Dev Only)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredMonitoringList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500 font-mono text-xs">
                    Tidak ada ban terpasang yang sesuai kriteria monitoring.
                  </td>
                </tr>
              ) : (
                filteredMonitoringList.map((t) => {
                  const isCritical = t.urgency === 'CRITICAL';
                  const isWarning = t.urgency === 'WARNING';

                  return (
                    <tr 
                      key={t.id} 
                      className={`transition ${
                        isCritical 
                          ? 'bg-rose-950/20 hover:bg-rose-950/30' 
                          : isWarning 
                          ? 'bg-amber-950/10 hover:bg-amber-950/20' 
                          : 'hover:bg-stone-800/40'
                      }`}
                    >
                      {/* Badge Urgensi */}
                      <td className="py-3 px-3">
                        {isCritical && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>SEGERA GANTI</span>
                          </span>
                        )}
                        {isWarning && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>SIAPKAN BAN</span>
                          </span>
                        )}
                        {!isCritical && !isWarning && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>KONDISI AMAN</span>
                          </span>
                        )}
                      </td>

                      {/* CN Unit */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-amber-400 font-mono text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t.currentUnit}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[130px]">
                          {getUnitName(units.find((u) => getUnitCn(u) === t.currentUnit))}
                        </div>
                      </td>

                      {/* Posisi */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-stone-800 text-teal-300 border border-stone-700">
                          {t.currentPosisi}
                        </span>
                      </td>

                      {/* Kode Tyre */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {t.kodeTyre}
                      </td>

                      {/* Merk & Ukuran */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-stone-200">{t.merkTyre}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{t.ukuranTyre}</div>
                      </td>

                      {/* Tread mm */}
                      <td className="py-3 px-3 font-mono text-right">
                        <span className={`font-bold ${isCritical ? 'text-rose-400 text-sm' : isWarning ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {t.currentDepth} mm
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          / {t.initialDepth} mm
                        </span>
                      </td>

                      {/* Prosentase Sisa Bar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className={`font-bold ${isCritical ? 'text-rose-400 font-extrabold' : isWarning ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}`}>
                            {t.remainingPercent}% Sisa
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {100 - t.wearPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isCritical ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${t.remainingPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Keausan % */}
                      <td className="py-3 px-3 font-mono text-right text-stone-300 font-bold">
                        <span className={isCritical ? 'text-rose-400 font-bold' : 'text-stone-300'}>
                          {t.wearPercent}% Aus
                        </span>
                      </td>

                      {/* Rekomendasi Tindakan */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <p className={`text-[11px] leading-tight ${isCritical ? 'text-rose-300 font-medium' : isWarning ? 'text-amber-200' : 'text-stone-400'}`}>
                          {t.actionRecommendation}
                        </p>
                      </td>

                      {/* Aksi Khusus Akun Developer */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDev ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditTyre && onEditTyre(t)}
                                title="Edit Data Tyre (Developer Only)"
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(t.id)}
                                title="Hapus Data Tyre (Developer Only)"
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Edit & Hapus Khusus Akun Developer"
                              className="p-1.5 rounded-lg bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">
                Hapus Data Tyre Ini?
              </h4>
              <p className="text-xs text-stone-400 mt-1">
                Data master dan monitoring tyre ini akan dihapus dari sistem. Khusus akun Developer.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTyre) onDeleteTyre(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
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
