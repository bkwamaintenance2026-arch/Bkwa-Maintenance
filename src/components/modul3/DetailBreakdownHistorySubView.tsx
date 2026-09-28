import React, { useState, useMemo, useEffect } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  BreakdownComponentOption, 
  BREAKDOWN_COMPONENT_OPTIONS,
  UserAccount,
  SparePartTransaction
} from '../../types';
import { getAllSparePartTransactions, isDeveloper } from '../../utils/storage';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  Wrench, 
  Package, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Eye, 
  FileSpreadsheet, 
  Printer, 
  X, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Truck,
  Hash,
  ArrowRight,
  Trash2
} from 'lucide-react';

interface DetailBreakdownHistorySubViewProps {
  units: AssetUnit[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onNavigateToUpdate?: (record: BreakdownRecord) => void;
  onDeleteBreakdown?: (id: string) => { success: boolean; message: string };
}

export const DetailBreakdownHistorySubView: React.FC<DetailBreakdownHistorySubViewProps> = ({
  units,
  breakdowns,
  currentUser,
  onNavigateToUpdate,
  onDeleteBreakdown,
}) => {
  const isDev = isDeveloper(currentUser);
  // Transaksi Spare Part dari Modul 6 (Inventory Management)
  const [sparePartTrxList, setSparePartTrxList] = useState<SparePartTransaction[]>([]);

  useEffect(() => {
    try {
      const trx = getAllSparePartTransactions();
      setSparePartTrxList(trx);
    } catch (e) {
      console.error('Failed to load spare part transactions', e);
    }
  }, []);

  // Filter States
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'BREAKDOWN' | 'LIMIT OPERASI'>('ALL');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modal State
  const [activeModalRecord, setActiveModalRecord] = useState<BreakdownRecord | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'PARTS' | 'PROBLEM' | 'TIMELINE' | 'WAREHOUSE'>('PARTS');

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedUnit('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setComponentFilter('');
    setSearchKeyword('');
  };

  // Quick Date Setters
  const setQuickDate = (period: 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'ALL') => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (period === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (period === 'THIS_MONTH') {
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    } else if (period === 'LAST_3_MONTHS') {
      const past = new Date();
      past.setMonth(past.getMonth() - 3);
      const pastYyyy = past.getFullYear();
      const pastMm = String(past.getMonth() + 1).padStart(2, '0');
      setStartDate(`${pastYyyy}-${pastMm}-01`);
      setEndDate(todayStr);
    } else if (period === 'THIS_YEAR') {
      setStartDate(`${yyyy}-01-01`);
      setEndDate(todayStr);
    }
  };

  // Helper untuk mengekstrak seluruh part & jasa yang pernah diganti pada suatu BreakdownRecord
  const extractAllPartsFromRecord = (b: BreakdownRecord): BreakdownPartJasaItem[] => {
    const list: BreakdownPartJasaItem[] = [];
    const seen = new Set<string>();

    const addItems = (items?: BreakdownPartJasaItem[]) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach((item) => {
        const key = `${item.jenis}-${(item.partNumber || '').trim().toLowerCase()}-${(item.namaPart || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      });
    };

    // 1. Dari record level teratas
    addItems(b.partsJasa);

    // 2. Dari riwayat update harian jika ada
    if (b.riwayatUpdate && Array.isArray(b.riwayatUpdate)) {
      b.riwayatUpdate.forEach((entry) => {
        addItems(entry.partsJasa);
      });
    }

    return list;
  };

  // Helper untuk mencari transaksi gudang Modul 6 yang mereferensikan record breakdown ini
  const findWarehouseTransactionsForRecord = (b: BreakdownRecord) => {
    const mo = (b.noMaintenanceOrder || b.noNotifikasi || '').trim().toLowerCase();
    const unitNo = (b.noUnit || '').trim().toLowerCase();

    return sparePartTrxList.filter((trx) => {
      const trxMo = (trx.noMaintenanceOrder || '').trim().toLowerCase();
      const trxUnit = (trx.noUnit || '').trim().toLowerCase();
      return (mo && trxMo === mo) || (unitNo && trxUnit === unitNo && trxMo === mo);
    });
  };

  // Filtered Breakdowns
  const filteredBreakdowns = useMemo(() => {
    return breakdowns.filter((b) => {
      // 1. Filter Unit
      if (selectedUnit) {
        const matchUnit =
          b.noUnit.toLowerCase().trim() === selectedUnit.toLowerCase().trim() ||
          (b.namaAlat && b.namaAlat.toLowerCase().trim() === selectedUnit.toLowerCase().trim());
        if (!matchUnit) return false;
      }

      // 2. Filter Status
      if (statusFilter !== 'ALL') {
        const currentStatus = (b.statusUnit || 'BREAKDOWN').toUpperCase().trim();
        if (currentStatus !== statusFilter) return false;
      }

      // 3. Filter Komponen
      if (componentFilter) {
        if ((b.component || '').toLowerCase() !== componentFilter.toLowerCase()) return false;
      }

      // 4. Filter Rentang Tanggal
      const bDate = b.tanggal || b.startJob || '';
      if (startDate && bDate && bDate < startDate) return false;
      if (endDate && bDate && bDate > endDate) return false;

      // 5. Filter Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const mo = (b.noMaintenanceOrder || b.noNotifikasi || '').toLowerCase();
        const unit = (b.noUnit || '').toLowerCase();
        const alat = (b.namaAlat || b.noLama || '').toLowerCase();
        const problem = (b.detailProblem || '').toLowerCase();
        const kerusakan = (b.detailKerusakan || '').toLowerCase();
        const comp = (b.component || '').toLowerCase();
        const pic = `${b.pelapor || ''} ${b.pic1 || ''} ${b.pic2 || ''} ${b.pic3 || ''}`.toLowerCase();
        
        // Cek juga di nama part / part number
        const parts = extractAllPartsFromRecord(b);
        const matchParts = parts.some(
          (p) =>
            (p.namaPart || '').toLowerCase().includes(kw) ||
            (p.partNumber || '').toLowerCase().includes(kw)
        );

        const matchDirect =
          mo.includes(kw) ||
          unit.includes(kw) ||
          alat.includes(kw) ||
          problem.includes(kw) ||
          kerusakan.includes(kw) ||
          comp.includes(kw) ||
          pic.includes(kw);

        if (!matchDirect && !matchParts) return false;
      }

      return true;
    });
  }, [breakdowns, selectedUnit, statusFilter, componentFilter, startDate, endDate, searchKeyword]);

  // Statistik Agregasi untuk Data yang Terfilter
  const stats = useMemo(() => {
    const totalRecords = filteredBreakdowns.length;
    const readyCount = filteredBreakdowns.filter(
      (b) => (b.statusUnit || '').toUpperCase().trim() === 'READY'
    ).length;
    const activeCount = totalRecords - readyCount;

    // Total part terpasang
    let totalPartsReplaced = 0;
    const partFrequencyMap: Record<string, { nama: string; pn: string; count: number; satuan: string }> = {};

    filteredBreakdowns.forEach((b) => {
      const parts = extractAllPartsFromRecord(b);
      parts.forEach((p) => {
        const qtyNum = Number(p.qty) || 1;
        totalPartsReplaced += qtyNum;
        const key = (p.namaPart || p.partNumber || 'Part').trim().toUpperCase();
        if (!partFrequencyMap[key]) {
          partFrequencyMap[key] = {
            nama: p.namaPart || '-',
            pn: p.partNumber || '-',
            count: 0,
            satuan: p.satuan || 'Pcs',
          };
        }
        partFrequencyMap[key].count += qtyNum;
      });
    });

    const topParts = Object.values(partFrequencyMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRecords,
      readyCount,
      activeCount,
      totalPartsReplaced,
      topParts,
    };
  }, [filteredBreakdowns]);

  // Ekspor ke CSV
  const handleExportCSV = () => {
    if (filteredBreakdowns.length === 0) return;

    const headers = [
      'No. Maintenance Order',
      'No. Unit (CN New)',
      'Nama Alat',
      'Jenis Alat',
      'Tanggal Breakdown',
      'Start Job',
      'Komponen',
      'Problem Awal',
      'Detail Pekerjaan Terkini',
      'Status Unit',
      'Progress',
      'PIC Teknisi',
      'Part & Jasa Diganti',
    ];

    const rows = filteredBreakdowns.map((b) => {
      const parts = extractAllPartsFromRecord(b);
      const partsStr = parts.length > 0
        ? parts.map((p) => `[${p.jenis}] ${p.namaPart} (PN: ${p.partNumber || '-'}) ${p.qty} ${p.satuan}`).join('; ')
        : 'Tidak ada part/jasa tercatat';

      const pics = [b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || b.pelapor || '-';

      return [
        `"${b.noMaintenanceOrder || b.noNotifikasi || '-'}"`,
        `"${b.noUnit || '-'}"`,
        `"${b.namaAlat || b.noLama || '-'}"`,
        `"${b.jenis || '-'}"`,
        `"${b.tanggal || '-'}"`,
        `"${b.startJob || '-'}"`,
        `"${b.component || '-'}"`,
        `"${(b.detailProblem || '').replace(/"/g, '""')}"`,
        `"${(b.detailKerusakan || '').replace(/"/g, '""')}"`,
        `"${b.statusUnit || 'BREAKDOWN'}"`,
        `"${b.progress || 'On Progress'}"`,
        `"${pics}"`,
        `"${partsStr.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Riwayat_Detail_Breakdown_${selectedUnit || 'Semua_Unit'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cetak Riwayat Modal
  const handlePrintModal = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER SUB MODUL 4 */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Sub Modul 4
                </span>
                <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                  Riwayat &amp; Detail Breakdown Unit
                </h2>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Pencarian historis kerusakan unit terdahulu, filter tanggal &amp; unit, referensi Maintenance Order (MO), serta rincian spare part yang pernah diganti.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredBreakdowns.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-mono font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download Data ke Format CSV Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Filter &amp; Parameter Riwayat Breakdown</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-amber-400 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Filter No Unit */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Pilih Unit (CN New / Nama Alat):
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">-- Semua Unit Alat Berat --</option>
              {units.map((u) => (
                <option key={u.id} value={u.cnNew || u.namaAlat}>
                  {u.cnNew} {u.namaAlat ? `- ${u.namaAlat}` : ''} ({u.jenis || '-'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Rentang Tanggal Mulai */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Dari Tanggal:
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Filter Rentang Tanggal Selesai */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Sampai Tanggal:
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Filter Status Unit */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Status Unit:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">Semua Status (READY &amp; Breakdown)</option>
              <option value="READY">READY (Sudah Selesai Diperbaiki)</option>
              <option value="BREAKDOWN">BREAKDOWN (Sedang Perbaikan)</option>
              <option value="LIMIT OPERASI">LIMIT OPERASI (Operasi Terbatas)</option>
            </select>
          </div>
        </div>

        {/* Baris Kedua Filter: Komponen, Keyword Search, & Quick Period Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-1">
          {/* Komponen Rusak */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Komponen Rusak:
            </label>
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Semua Komponen</option>
              {BREAKDOWN_COMPONENT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Keyword */}
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Cari (No MO / Part / Problem / PIC):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Contoh: 260001, Filter Oli, Radiator, Joko, Engine..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="lg:col-span-4 flex flex-col justify-end">
            <label className="block text-[11px] font-mono text-stone-400 mb-1">
              Pilihan Cepat Waktu:
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate('THIS_MONTH')}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-mono transition"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('LAST_3_MONTHS')}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-mono transition"
              >
                3 Bulan
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('THIS_YEAR')}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-mono transition"
              >
                Tahun Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('ALL')}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-[11px] font-mono transition font-bold"
              >
                Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATS KARTU RINGKASAN DATA TERFILTER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-stone-400 mb-1 text-xs font-mono">
            <span>TOTAL KEJADIAN</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-stone-100">
            {stats.totalRecords}
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
            Kerusakan Tercatat
          </p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-stone-400 mb-1 text-xs font-mono">
            <span>SELESAI (READY)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {stats.readyCount}
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
            Unit Siap Operasi
          </p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-stone-400 mb-1 text-xs font-mono">
            <span>SEDANG PROSES</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {stats.activeCount}
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
            Masih Breakdown
          </p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-stone-400 mb-1 text-xs font-mono">
            <span>PART PERNAH DIGANTI</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {stats.totalPartsReplaced}
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
            Total Item Part Terpasang
          </p>
        </div>
      </div>

      {/* JIKA MEMILIH UNIT SPESIFIK: TAMPILKAN KARTU HISTORIS UNIT TERPILIH */}
      {selectedUnit && (
        <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black font-mono text-base">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    KARTU RIWAYAT UNIT
                  </span>
                  <h3 className="text-base font-black text-stone-100 font-mono">
                    {selectedUnit}
                  </h3>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Ditemukan {filteredBreakdowns.length} riwayat pekerjaan perbaikan untuk unit ini.
                </p>
              </div>
            </div>

            {/* Top Spare Part untuk Unit Terpilih */}
            {stats.topParts.length > 0 && (
              <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800">
                <span className="text-[10px] font-mono text-stone-400 block mb-1">
                  TOP PART PALING SERING DIGANTI:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {stats.topParts.slice(0, 3).map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-stone-900 text-stone-200 border border-stone-800"
                    >
                      <strong className="text-amber-400">{p.nama}</strong>: {p.count} {p.satuan}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABEL DETAIL RIWAYAT BREAKDOWN & PART YANG PERNAH DIGANTI */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Daftar Riwayat Breakdown &amp; Spare Part Terpasang</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Menampilkan {filteredBreakdowns.length} order perbaikan sesuai kriteria pencarian Anda.
            </p>
          </div>
        </div>

        {filteredBreakdowns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-800 rounded-xl bg-stone-950/40">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-stone-200 font-mono font-bold">
              Tidak Ada Data Riwayat Kerusakan yang Cocok
            </p>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
              Tidak ditemukan data breakdown dengan kriteria filter saat ini. Silakan ubah filter tanggal atau pilih &quot;Semua Unit&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Reff No. MO</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Unit &amp; Alat</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Tanggal &amp; Lokasi</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Komponen &amp; Problem</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Status Unit</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">Part yang Pernah Diganti</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">PIC Teknisi</th>
                  <th className="px-3.5 py-3.5 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                {filteredBreakdowns.map((b) => {
                  const parts = extractAllPartsFromRecord(b);
                  const isReady = (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() === 'READY';
                  const isLimit = (b.statusUnit || '').toUpperCase().trim() === 'LIMIT OPERASI';
                  const moNumber = b.noMaintenanceOrder || b.noNotifikasi || '-';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-stone-800/40 transition group cursor-pointer"
                      onClick={() => setActiveModalRecord(b)}
                    >
                      {/* 1. Reff No. Maintenance Order */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="font-black text-amber-400 group-hover:underline">
                            {moNumber}
                          </span>
                        </div>
                        <span className="text-[9px] text-stone-500 block pl-3.5">
                          Notif: {b.noNotifikasi}
                        </span>
                      </td>

                      {/* 2. Unit & Alat */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-bold text-stone-100">{b.noUnit}</div>
                        <div className="text-[10px] text-stone-400">
                          {b.namaAlat || b.noLama || '-'}
                        </div>
                        <div className="text-[9px] text-stone-500 font-sans">{b.jenis || '-'}</div>
                      </td>

                      {/* 3. Tanggal & Lokasi */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="text-stone-200">{b.tanggal || '-'}</div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[120px]" title={b.lokasi}>
                          {b.lokasi || '-'}
                        </div>
                      </td>

                      {/* 4. Komponen & Problem Awal */}
                      <td className="px-3.5 py-3 max-w-[220px]">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/50 mb-1">
                          {b.component || 'Other'}
                        </span>
                        <div className="text-stone-300 font-sans line-clamp-2 text-[11px]" title={b.detailProblem}>
                          {b.detailProblem || '-'}
                        </div>
                      </td>

                      {/* 5. Status Unit */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isLimit
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>{b.statusUnit || 'BREAKDOWN'}</span>
                        </span>
                        <span className="text-[10px] text-stone-400 block mt-1">
                          {b.progress || 'On Progress'}
                        </span>
                      </td>

                      {/* 6. Part yang Pernah Diganti */}
                      <td className="px-3.5 py-3 min-w-[240px]">
                        {parts.length === 0 ? (
                          <span className="text-stone-500 italic text-[10px] font-sans">
                            Tidak ada part tercatat (Jasa/Inspeksi)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {parts.slice(0, 3).map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] bg-stone-950 text-stone-300 border border-stone-800 flex items-center gap-1"
                                title={`PN: ${p.partNumber || '-'} (${p.qty} ${p.satuan})`}
                              >
                                <Package className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span className="font-semibold text-stone-200 truncate max-w-[130px]">
                                  {p.namaPart}
                                </span>
                                <span className="text-amber-400 font-bold">
                                  x{p.qty}
                                </span>
                              </span>
                            ))}
                            {parts.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-bold">
                                +{parts.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. PIC Teknisi */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-sans">
                        <div className="text-stone-200 font-medium">
                          {[b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || b.pelapor || '-'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {b.jabatan || 'Teknisi'}
                        </div>
                      </td>

                      {/* 8. Tombol Detail */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveModalRecord(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 font-mono text-[11px] font-bold border border-stone-700 transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL KOMPREHENSIF: DETAIL BREAKDOWN & RIWAYAT PART */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-800 flex items-start justify-between gap-4 bg-stone-950/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      MO: {activeModalRecord.noMaintenanceOrder || activeModalRecord.noNotifikasi}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${
                        (activeModalRecord.statusUnit || '').toUpperCase().trim() === 'READY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {activeModalRecord.statusUnit || 'BREAKDOWN'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-stone-100 font-mono mt-1">
                    {activeModalRecord.noUnit} {activeModalRecord.namaAlat ? `- ${activeModalRecord.namaAlat}` : ''} ({activeModalRecord.jenis || '-'})
                  </h3>
                  <p className="text-xs text-stone-400">
                    Tanggal Breakdown: {activeModalRecord.tanggal || '-'} | HM: {activeModalRecord.hm || '-'} | Lokasi: {activeModalRecord.lokasi || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintModal}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                  title="Cetak Laporan MO Ini"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalRecord(null)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-rose-900/60 hover:text-rose-300 text-stone-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-stone-800 bg-stone-900 font-mono text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveModalTab('PARTS')}
                className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold transition whitespace-nowrap ${
                  activeModalTab === 'PARTS'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Rincian Spare Part &amp; Jasa Diganti ({extractAllPartsFromRecord(activeModalRecord).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('PROBLEM')}
                className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold transition whitespace-nowrap ${
                  activeModalTab === 'PROBLEM'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Detail Problem &amp; Kerusakan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('TIMELINE')}
                className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold transition whitespace-nowrap ${
                  activeModalTab === 'TIMELINE'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Timeline Progress Harian</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('WAREHOUSE')}
                className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold transition whitespace-nowrap ${
                  activeModalTab === 'WAREHOUSE'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Transaksi Gudang Part (Modul 6)</span>
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: RINCIAN SPARE PART & JASA */}
              {activeModalTab === 'PARTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold font-mono text-stone-200 uppercase tracking-wide">
                        Daftar Spare Part &amp; Pekerjaan Jasa Terpasang
                      </h4>
                      <p className="text-xs text-stone-400">
                        Histori suku cadang yang digunakan untuk memperbaiki unit dengan No MO {activeModalRecord.noMaintenanceOrder || activeModalRecord.noNotifikasi}
                      </p>
                    </div>
                  </div>

                  {extractAllPartsFromRecord(activeModalRecord).length === 0 ? (
                    <div className="py-10 text-center rounded-2xl bg-stone-950/40 border border-dashed border-stone-800">
                      <Package className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                      <p className="text-xs text-stone-300 font-mono font-bold">
                        Belum Ada Spare Part yang Dicatat pada MO Ini.
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Perbaikan mungkin hanya berupa pekerjaan jasa, penyetelan, atau pengelasan tanpa pergantian suku cadang.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-800">
                      <table className="w-full text-left text-xs text-stone-300">
                        <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                          <tr>
                            <th className="px-3 py-3 w-10 text-center">No</th>
                            <th className="px-3 py-3 w-20">Jenis</th>
                            <th className="px-3 py-3">Nama Spare Part / Jasa</th>
                            <th className="px-3 py-3">Part Number</th>
                            <th className="px-3 py-3 text-right">Qty</th>
                            <th className="px-3 py-3">Satuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60 font-mono">
                          {extractAllPartsFromRecord(activeModalRecord).map((item, idx) => (
                            <tr key={idx} className="hover:bg-stone-800/30">
                              <td className="px-3 py-3 text-center text-stone-500">{idx + 1}</td>
                              <td className="px-3 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.jenis === 'Part'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {item.jenis}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-bold text-stone-100 font-sans text-xs">
                                {item.namaPart}
                              </td>
                              <td className="px-3 py-3 text-amber-400 font-mono">
                                {item.partNumber || '-'}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-stone-100">
                                {item.qty}
                              </td>
                              <td className="px-3 py-3 text-stone-400">
                                {item.satuan}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DETAIL PROBLEM & KERUSAKAN */}
              {activeModalTab === 'PROBLEM' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] text-stone-500 block uppercase">KOMPONEN UTAMA RUSAK</span>
                      <div className="text-base font-bold text-rose-400">
                        {activeModalRecord.component || 'Other'}
                      </div>
                    </div>

                    <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] text-stone-500 block uppercase">PELAPOR &amp; JABATAN</span>
                      <div className="text-sm font-bold text-stone-200">
                        {activeModalRecord.pelapor || '-'}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {activeModalRecord.jabatan || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-stone-500 block uppercase">PROBLEM AWAL SAAT LAPORAN DIBUAT</span>
                    <p className="text-stone-300 font-sans leading-relaxed text-sm whitespace-pre-wrap">
                      {activeModalRecord.detailProblem || '-'}
                    </p>
                  </div>

                  <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-stone-500 block uppercase">DETAIL KERUSAKAN &amp; TINDAKAN PERBAIKAN</span>
                    <p className="text-stone-300 font-sans leading-relaxed text-sm whitespace-pre-wrap">
                      {activeModalRecord.detailKerusakan || 'Belum ada catatan detail tindakan perbaikan lanjutan.'}
                    </p>
                  </div>

                  {activeModalRecord.remark && (
                    <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] text-stone-500 block uppercase">CATATAN KHUSUS / REMARK</span>
                      <p className="text-amber-300 font-sans leading-relaxed text-sm">
                        {activeModalRecord.remark}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-500 block">MEKANIK PIC 1:</span>
                      <span className="text-stone-200 font-bold">{activeModalRecord.pic1 || '-'}</span>
                    </div>
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-500 block">MEKANIK PIC 2:</span>
                      <span className="text-stone-200 font-bold">{activeModalRecord.pic2 || '-'}</span>
                    </div>
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-500 block">MEKANIK PIC 3:</span>
                      <span className="text-stone-200 font-bold">{activeModalRecord.pic3 || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TIMELINE PROGRESS HARIAN */}
              {activeModalTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-stone-200 uppercase tracking-wide">
                      Kronologi &amp; Riwayat Update Pekerjaan
                    </h4>
                    <p className="text-xs text-stone-400">
                      Catatan perkembangan perbaikan hari demi hari sampai unit berstatus READY
                    </p>
                  </div>

                  {(!activeModalRecord.riwayatUpdate || activeModalRecord.riwayatUpdate.length === 0) ? (
                    <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 text-xs font-mono space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <Clock className="w-4 h-4" />
                        <span>Update Terkini (Sub Modul 2)</span>
                      </div>
                      <p className="text-stone-300 font-sans">
                        Start Job: {activeModalRecord.startJob || activeModalRecord.tanggal || '-'}
                        {(activeModalRecord.jamStart || activeModalRecord.jamFinish) && (
                          <span className="text-amber-300 font-mono ml-2">
                            ({activeModalRecord.jamStart || '--:--'} - {activeModalRecord.jamFinish || '--:--'})
                          </span>
                        )}{' '}
                        | Progress: {activeModalRecord.progress || 'On Progress'} | Status: {activeModalRecord.statusUnit || 'BREAKDOWN'}
                      </p>
                      <p className="text-stone-400 font-sans text-xs">
                        {activeModalRecord.detailKerusakan || 'Pekerjaan perbaikan langsung diselesaikan dalam satu siklus pengerjaan.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-stone-800">
                      {activeModalRecord.riwayatUpdate.map((entry, idx) => (
                        <div key={idx} className="relative flex items-start gap-3.5 pl-2">
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-stone-900 shrink-0 mt-1 z-10" />
                          <div className="flex-1 bg-stone-950 border border-stone-800 rounded-xl p-3.5 space-y-1.5 font-mono text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-400">
                                  {entry.startJob || '-'}
                                </span>
                                {(entry.jamStart || entry.jamFinish) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                                    ⏱️ {entry.jamStart || '--:--'} - {entry.jamFinish || '--:--'}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  entry.statusUnit === 'READY'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {entry.statusUnit} ({entry.progress})
                              </span>
                            </div>
                            <p className="text-stone-300 font-sans text-xs">
                              {entry.detailKerusakan || '-'}
                            </p>
                            {entry.partsJasa && entry.partsJasa.length > 0 && (
                              <div className="pt-1 text-[11px] text-stone-400">
                                <span className="text-stone-500">Part/Jasa: </span>
                                {entry.partsJasa.map((p) => `${p.namaPart} (${p.qty} ${p.satuan})`).join(', ')}
                              </div>
                            )}
                            <div className="pt-1 text-[10px] text-stone-500 flex items-center justify-between">
                              <span>Oleh: {entry.updatedBy || '-'}</span>
                              <span>PIC: {[entry.pic1, entry.pic2, entry.pic3].filter(Boolean).join(', ') || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRANSAKSI GUDANG PART (MODUL 6) */}
              {activeModalTab === 'WAREHOUSE' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-stone-200 uppercase tracking-wide">
                      Pengeluaran Suku Cadang dari Gudang (Modul 6)
                    </h4>
                    <p className="text-xs text-stone-400">
                      Transaksi pengambilan barang logistik yang terhubung dengan No MO {activeModalRecord.noMaintenanceOrder || activeModalRecord.noNotifikasi}
                    </p>
                  </div>

                  {findWarehouseTransactionsForRecord(activeModalRecord).length === 0 ? (
                    <div className="py-10 text-center rounded-2xl bg-stone-950/40 border border-dashed border-stone-800">
                      <Layers className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                      <p className="text-xs text-stone-300 font-mono font-bold">
                        Belum Ada Transaksi Gudang Suku Cadang Terkait
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1 max-w-md mx-auto">
                        Pengeluaran spare part fisik di gudang dapat dicatat melalui Modul 6 (Transaksi Spare Part) dengan mereferensikan Maintenance Order ini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {findWarehouseTransactionsForRecord(activeModalRecord).map((trx) => (
                        <div key={trx.id} className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-amber-400">{trx.noTransaksi}</span>
                            <span className="text-stone-400">{trx.tanggal} {trx.jam}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs font-mono">
                              <thead>
                                <tr className="text-stone-500 text-[10px] border-b border-stone-800">
                                  <th className="py-1">Part Number</th>
                                  <th className="py-1">Nama Barang</th>
                                  <th className="py-1 text-right">Qty Diminta</th>
                                  <th className="py-1 text-right">Qty Keluar</th>
                                  <th className="py-1">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-800/40 text-[11px]">
                                {trx.items.map((it, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1.5 text-stone-400">{it.partNumber || '-'}</td>
                                    <td className="py-1.5 text-stone-200 font-bold">{it.namaBarang}</td>
                                    <td className="py-1.5 text-right">{it.qtyDiminta} {it.satuan}</td>
                                    <td className="py-1.5 text-right text-emerald-400 font-bold">
                                      {it.qtyDikeluarkan} {it.satuan}
                                    </td>
                                    <td className="py-1.5">
                                      <span className="text-[10px] text-stone-400">{it.statusKetersediaan}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between gap-3">
              <div>
                {isDev && onDeleteBreakdown && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus laporan breakdown ${activeModalRecord.noNotifikasi} (Unit ${activeModalRecord.noUnit})?`)) {
                        onDeleteBreakdown(activeModalRecord.id);
                        setActiveModalRecord(null);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs font-bold transition"
                    title="Hapus Laporan Breakdown (Developer Only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Laporan</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToUpdate && (activeModalRecord.statusUnit || '').toUpperCase().trim() !== 'READY' && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = activeModalRecord;
                      setActiveModalRecord(null);
                      onNavigateToUpdate(rec);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-mono font-bold text-xs uppercase hover:bg-amber-400 transition"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Lanjutkan Update</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModalRecord(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
