import React, { useState, useMemo, useEffect } from 'react';
import {
  FuelStockInputRecord,
  FuelTransferRecord,
  FuelDistributionRecord,
  OutFieldFuelRecord,
  OilDistributionRecord,
  InventoryPeriodBalance,
  UserAccount,
} from '../../types';
import { exportFuelOilTransactionsToPDF } from '../../utils/pdfGenerator';
import {
  X,
  FileDown,
  Printer,
  Calendar,
  Fuel,
  Droplet,
  Truck,
  Building2,
  CheckCircle2,
  ArrowRightLeft,
  Search,
  Filter,
  Layers,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface ExportFuelOilReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelStockInputs: FuelStockInputRecord[];
  fuelTransfers: FuelTransferRecord[];
  fuelDistributions: FuelDistributionRecord[];
  outFieldFuelRecords: OutFieldFuelRecord[];
  oilDistributions: OilDistributionRecord[];
  periodBalance?: InventoryPeriodBalance;
  currentUser: UserAccount;
  defaultCategory?: 'ALL' | 'TANGKI_UTAMA' | 'FUEL_TRUCK' | 'SPBU_LUAR' | 'OLI_PER_TIPE';
}

const STORAGE_KEY_CHECKER = 'bkwa_report_checker_fog_name_v1';
const STORAGE_KEY_KTT = 'bkwa_report_ktt_name_v1';

export const ExportFuelOilReportModal: React.FC<ExportFuelOilReportModalProps> = ({
  isOpen,
  onClose,
  fuelStockInputs,
  fuelTransfers,
  fuelDistributions,
  outFieldFuelRecords,
  oilDistributions,
  periodBalance,
  currentUser,
  defaultCategory = 'ALL',
}) => {
  // Category tab
  const [reportCategory, setReportCategory] = useState<
    'ALL' | 'TANGKI_UTAMA' | 'FUEL_TRUCK' | 'SPBU_LUAR' | 'OLI_PER_TIPE'
  >(defaultCategory);

  // Sync category if defaultCategory changes when opening
  useEffect(() => {
    if (isOpen) {
      setReportCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  // Signatories state (Persisted in localStorage)
  const [petugasChecker, setPetugasChecker] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CHECKER);
    return saved || currentUser?.fullName || currentUser?.username || 'Petugas Checker Tambang';
  });

  const [kttName, setKttName] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_KTT);
    return saved || 'Kepala Tehnik Tambang (KTT)';
  });

  // Save signatory edits to localStorage
  useEffect(() => {
    if (petugasChecker) {
      localStorage.setItem(STORAGE_KEY_CHECKER, petugasChecker);
    }
  }, [petugasChecker]);

  useEffect(() => {
    if (kttName) {
      localStorage.setItem(STORAGE_KEY_KTT, kttName);
    }
  }, [kttName]);

  // Search filter inside preview table
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'tangki' | 'ft' | 'spbu' | 'oli'>('tangki');

  // Quick Date Preset Handlers
  const handleSetPreset = (preset: 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'all') => {
    setActiveDatePreset(preset);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 29);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(curYear, curMonth, 1);
      const lastDay = new Date(curYear, curMonth + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(curYear, curMonth - 1, 1);
      const lastDayLastMonth = new Date(curYear, curMonth, 0);
      setStartDate(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDate(lastDayLastMonth.toISOString().split('T')[0]);
    } else {
      // all
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setActiveDatePreset('all');
    setPreviewSearch('');
  };

  // Helper date checker
  const matchDate = (tgl?: string) => {
    if (!tgl) return true;
    const cleanTgl = tgl.trim().split('T')[0];
    if (startDate && cleanTgl < startDate) return false;
    if (endDate && cleanTgl > endDate) return false;
    return true;
  };

  // Filtered Datasets
  const filteredStockInputs = useMemo(() => {
    return fuelStockInputs.filter((r) => matchDate(r.tanggal));
  }, [fuelStockInputs, startDate, endDate]);

  const filteredTransfers = useMemo(() => {
    return fuelTransfers.filter((r) => matchDate(r.tanggal));
  }, [fuelTransfers, startDate, endDate]);

  const filteredDistributions = useMemo(() => {
    return fuelDistributions.filter((r) => matchDate(r.tanggal));
  }, [fuelDistributions, startDate, endDate]);

  const filteredOutField = useMemo(() => {
    return outFieldFuelRecords.filter((r) => matchDate(r.tanggal));
  }, [outFieldFuelRecords, startDate, endDate]);

  const filteredOilDist = useMemo(() => {
    return oilDistributions.filter((r) => matchDate(r.tanggal));
  }, [oilDistributions, startDate, endDate]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalMasukTangki = filteredStockInputs.reduce(
      (acc, r) => acc + (Number(r.actualQtyFlowmeter) || Number(r.qtySupplier) || 0),
      0
    );
    const totalTransferFT = filteredTransfers.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const totalDistribusiFT = filteredDistributions.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const totalOutFieldLiter = filteredOutField.reduce((acc, r) => acc + (Number(r.jmlLtr) || 0), 0);
    const totalOutFieldNominal = filteredOutField.reduce(
      (acc, r) => acc + (Number(r.totalNominal) || Number(r.nominalFuelSetelahPembulatan) || 0),
      0
    );
    const totalKonsumsiSolarQuarry = totalDistribusiFT + totalOutFieldLiter;

    // Rekapitulasi per tipe oli
    const oliPerTipeMap = new Map<string, { totalLiter: number; count: number }>();
    filteredOilDist.forEach((r) => {
      const tipe = (r.jenisOli || 'LAINNYA').trim();
      const cur = oliPerTipeMap.get(tipe) || { totalLiter: 0, count: 0 };
      cur.totalLiter += Number(r.qty) || 0;
      cur.count += 1;
      oliPerTipeMap.set(tipe, cur);
    });
    const totalSemuaOliLiter = Array.from(oliPerTipeMap.values()).reduce((acc, v) => acc + v.totalLiter, 0);

    return {
      totalMasukTangki,
      totalTransferFT,
      totalDistribusiFT,
      totalOutFieldLiter,
      totalOutFieldNominal,
      totalKonsumsiSolarQuarry,
      totalSemuaOliLiter,
      oliPerTipeList: Array.from(oliPerTipeMap.entries()),
    };
  }, [filteredStockInputs, filteredTransfers, filteredDistributions, filteredOutField, filteredOilDist]);

  // Handle Export PDF
  const handleExportPDF = () => {
    exportFuelOilTransactionsToPDF({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      reportCategory,
      petugasChecker,
      kttName,
      currentUser,
      fuelStockInputs,
      fuelTransfers,
      fuelDistributions,
      outFieldFuelRecords,
      oilDistributions,
      periodBalance,
    });
  };

  // Handle Native Browser Print Preview
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-800/80 bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 font-mono tracking-tight flex items-center gap-2">
                <span>EXPORT LAPORAN PDF BAHAN BAKAR & PELUMAS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                  Resmi PT BKWA
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pelaporan Pemakaian Solar (Tangki Utama &amp; Fuel Truck), Pembelian SPBU Luar &amp; Penggunaan Oli per Tipe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ========================================================================= */}
          {/* 1. FILTER TANGGAL (DATE PICKER & PRESETS) */}
          {/* ========================================================================= */}
          <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-200 font-mono uppercase tracking-wider">
                  Filter Berdasarkan Tanggal
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                    activeDatePreset === 'all'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Semua Data
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('today')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                    activeDatePreset === 'today'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('7days')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                    activeDatePreset === '7days'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('this_month')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                    activeDatePreset === 'this_month'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('last_month')}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                    activeDatePreset === 'last_month'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Bulan Lalu
                </button>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[10px] text-rose-400 hover:bg-rose-500/10 transition"
                    title="Reset Filter Tanggal"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Tanggal Mulai (Dari):
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs font-mono focus:border-amber-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Tanggal Selesai (Sampai):
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs font-mono focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-1">
              <span>
                Status Rentang:{' '}
                <strong className="text-amber-400">
                  {startDate && endDate
                    ? startDate === endDate
                      ? `Tunggal (${startDate})`
                      : `${startDate} s/d ${endDate}`
                    : startDate
                    ? `Sejak ${startDate}`
                    : endDate
                    ? `Hingga ${endDate}`
                    : 'Semua Riwayat Tanggal'}
                </strong>
              </span>
              <span className="text-stone-500">
                Filter otomatis diterapkan ke 4 kategori transaksi
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. PILIH KATEGORI LAPORAN YANG DI-EXPORT */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-bold text-stone-300 font-mono mb-2 uppercase tracking-wide">
              Pilih Ruang Lingkup Dokumen Laporan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setReportCategory('ALL')}
                className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                  reportCategory === 'ALL'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">Semua Kategori</span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-stone-400 line-clamp-1">
                  Lengkap: Tangki, FT, SPBU &amp; Oli
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportCategory('TANGKI_UTAMA');
                  setPreviewTab('tangki');
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                  reportCategory === 'TANGKI_UTAMA'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">1. Tangki Utama</span>
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] text-stone-400 line-clamp-1">
                  Solar Masuk &amp; Transfer FT
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportCategory('FUEL_TRUCK');
                  setPreviewTab('ft');
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                  reportCategory === 'FUEL_TRUCK'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">2. Fuel Truck</span>
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-[10px] text-stone-400 line-clamp-1">
                  Distribusi Solar ke Unit
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportCategory('SPBU_LUAR');
                  setPreviewTab('spbu');
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                  reportCategory === 'SPBU_LUAR'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">3. Solar Luar</span>
                  <Building2 className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className="text-[10px] text-stone-400 line-clamp-1">
                  SPBU Luar &amp; Ritase DT
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReportCategory('OLI_PER_TIPE');
                  setPreviewTab('oli');
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition ${
                  reportCategory === 'OLI_PER_TIPE'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold font-mono">4. Oli per Tipe</span>
                  <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[10px] text-stone-400 line-clamp-1">
                  Rekapitulasi Varian Oli
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. LIVE SUMMARY KPI CARDS SESUAI FILTER TANGGAL */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Solar Masuk Tangki */}
            <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  SOLAR MASUK TANGKI
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-mono font-black text-stone-100">
                    {metrics.totalMasukTangki.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Ltr</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-400 flex justify-between">
                <span>{filteredStockInputs.length} Penerimaan</span>
                <span className="text-blue-400">Tf FT: {metrics.totalTransferFT.toLocaleString('id-ID')} L</span>
              </div>
            </div>

            {/* Card 2: Solar FT ke Unit */}
            <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                  SOLAR FT KE ALAT BERAT
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-mono font-black text-stone-100">
                    {metrics.totalDistribusiFT.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Ltr</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-400 flex justify-between">
                <span>{filteredDistributions.length} Bon Unit</span>
                <span className="text-stone-300">Quarry Fleet</span>
              </div>
            </div>

            {/* Card 3: Solar SPBU Luar */}
            <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider">
                  PEMBELIAN SPBU LUAR
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-mono font-black text-stone-100">
                    {metrics.totalOutFieldLiter.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Ltr</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-400 flex justify-between">
                <span className="text-rose-300 font-bold">
                  Rp {metrics.totalOutFieldNominal.toLocaleString('id-ID')}
                </span>
                <span>{filteredOutField.length} Transaksi</span>
              </div>
            </div>

            {/* Card 4: Penggunaan Oli */}
            <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  PENGGUNAAN OLI PER TIPE
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-mono font-black text-stone-100">
                    {metrics.totalSemuaOliLiter.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-mono text-stone-400">Ltr</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-stone-800 text-[10px] font-mono text-stone-400 flex justify-between">
                <span>{metrics.oliPerTipeList.length} Varian Oli</span>
                <span>{filteredOilDist.length} Bon Servis</span>
              </div>
            </div>
          </div>

          {/* Banner Total Konsumsi Solar Quarry */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-stone-900 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-stone-950">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                  TOTAL KONSUMSI SOLAR KESELURUHAN (FUEL TRUCK + SPBU LUAR):
                </span>
                <p className="text-[11px] text-stone-400">
                  Total pengeluaran bahan bakar solar operasional pada rentang tanggal terpilih
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-amber-400">
                {metrics.totalKonsumsiSolarQuarry.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-mono text-stone-300 font-bold">LITER</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. FORM FORMAT TANDA TANGAN (2 PIHAK PENGESAHAN SESUAI PERMINTAAN USER) */}
          {/* Petugas Checker Tambang (Kiri) & Kepala Tehnik Tambang (KTT) (Kanan) */}
          {/* ========================================================================= */}
          <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-800/60 pb-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-stone-200 font-mono uppercase tracking-wider">
                Pengesahan Lembar Dokumen (2 Pihak Tanda Tangan)
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Format tanda tangan dokumen kini hanya menampilkan 2 pihak pengesahan. Anda dapat mengetik manual nama kedua petugas di bawah ini:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Pihak 1: Petugas Checker Tambang (Kiri) */}
              <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800">
                <label className="block text-[11px] font-mono font-bold text-stone-200 mb-0.5">
                  1. Petugas Checker Tambang (Ketik Manual):
                </label>
                <p className="text-[10px] text-stone-400 mb-2">
                  Kiri — Checker Lapangan / Tallyman / Petugas FOG
                </p>
                <input
                  type="text"
                  value={petugasChecker}
                  onChange={(e) => setPetugasChecker(e.target.value)}
                  placeholder="Ketik nama Checker Tambang yang bertugas..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs font-mono focus:border-amber-500 outline-none transition"
                />
              </div>

              {/* Pihak 2: Kepala Tehnik Tambang (KTT) (Kanan) */}
              <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800">
                <label className="block text-[11px] font-mono font-bold text-stone-200 mb-0.5">
                  2. Mengetahui &amp; Menyetujui: KTT (Ketik Manual):
                </label>
                <p className="text-[10px] text-stone-400 mb-2">
                  Kanan — Kepala Tehnik Tambang (KTT)
                </p>
                <input
                  type="text"
                  value={kttName}
                  onChange={(e) => setKttName(e.target.value)}
                  placeholder="Ketik nama Kepala Tehnik Tambang (KTT)..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs font-mono focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. PRATINJAU DATA TABEL SEBELUM DI-EXPORT (LIVE PREVIEW) */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-300 font-mono uppercase tracking-wide">
                  Pratinjau Data Dokumen:
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  (Klik tab untuk melihat rincian baris)
                </span>
              </div>

              {/* Tabs Pratinjau */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setPreviewTab('tangki')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                    previewTab === 'tangki'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  Tangki Utama ({filteredStockInputs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('ft')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                    previewTab === 'ft'
                      ? 'bg-blue-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  Fuel Truck ({filteredDistributions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('spbu')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                    previewTab === 'spbu'
                      ? 'bg-rose-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  SPBU Luar ({filteredOutField.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('oli')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                    previewTab === 'oli'
                      ? 'bg-emerald-500 text-stone-950'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  Oli per Tipe ({filteredOilDist.length})
                </button>
              </div>
            </div>

            {/* Kontainer Tabel Pratinjau */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              {previewTab === 'tangki' && (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-stone-900 text-stone-300 sticky top-0 border-b border-stone-800">
                    <tr>
                      <th className="py-2 px-3">Tanggal &amp; Jam</th>
                      <th className="py-2 px-3">No DO / Reff</th>
                      <th className="py-2 px-3">Supplier</th>
                      <th className="py-2 px-3">Driver / Plat</th>
                      <th className="py-2 px-3 text-right">Qty Flowmeter</th>
                      <th className="py-2 px-3">Sounding Tangki</th>
                      <th className="py-2 px-3">PIC FOG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900 text-stone-300">
                    {filteredStockInputs.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-stone-900/40">
                        <td className="py-2 px-3 text-stone-400">
                          {r.tanggal} {r.jam && `(${r.jam})`}
                        </td>
                        <td className="py-2 px-3 font-bold text-amber-400">{r.snReffNo || '-'}</td>
                        <td className="py-2 px-3">{r.distributor || '-'}</td>
                        <td className="py-2 px-3">
                          {r.platNomor} {r.driverName ? `• ${r.driverName}` : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-400">
                          {(Number(r.actualQtyFlowmeter) || Number(r.qtySupplier) || 0).toLocaleString('id-ID')} L
                        </td>
                        <td className="py-2 px-3">{r.hasilUkurStickSebelum || r.hasilUkurTangkiUtama || '-'}</td>
                        <td className="py-2 px-3">{r.picFogName || '-'}</td>
                      </tr>
                    ))}
                    {filteredStockInputs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-stone-500 italic">
                          Tidak ada data penerimaan solar tangki utama pada rentang tanggal ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {previewTab === 'ft' && (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-stone-900 text-stone-300 sticky top-0 border-b border-stone-800">
                    <tr>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">No Bon</th>
                      <th className="py-2 px-3">CN Unit</th>
                      <th className="py-2 px-3">Nama Alat</th>
                      <th className="py-2 px-3">Operator</th>
                      <th className="py-2 px-3 text-right">HM Unit</th>
                      <th className="py-2 px-3 text-right">Qty Solar (L)</th>
                      <th className="py-2 px-3">Driver FT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900 text-stone-300">
                    {filteredDistributions.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-stone-900/40">
                        <td className="py-2 px-3 text-stone-400">{r.tanggal}</td>
                        <td className="py-2 px-3 font-bold text-blue-400">{r.noBon || '-'}</td>
                        <td className="py-2 px-3 font-bold text-stone-100">{r.cnAlat}</td>
                        <td className="py-2 px-3">{r.namaAlat}</td>
                        <td className="py-2 px-3">{r.operatorName || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          {(Number(r.hm) || Number(r.hmPengisian) || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-400">
                          {(Number(r.qty) || 0).toLocaleString('id-ID')} L
                        </td>
                        <td className="py-2 px-3">{r.driverFtName || '-'}</td>
                      </tr>
                    ))}
                    {filteredDistributions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-stone-500 italic">
                          Tidak ada data distribusi fuel truck ke unit pada rentang tanggal ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {previewTab === 'spbu' && (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-stone-900 text-stone-300 sticky top-0 border-b border-stone-800">
                    <tr>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">No Transaksi</th>
                      <th className="py-2 px-3">Kode SPBU</th>
                      <th className="py-2 px-3">CN Unit</th>
                      <th className="py-2 px-3 text-right">Qty (Ltr)</th>
                      <th className="py-2 px-3 text-right">Total Biaya (Rp)</th>
                      <th className="py-2 px-3">Job / Ritase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900 text-stone-300">
                    {filteredOutField.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-stone-900/40">
                        <td className="py-2 px-3 text-stone-400">{r.tanggal}</td>
                        <td className="py-2 px-3 font-bold text-rose-400">{r.noTransaksi || '-'}</td>
                        <td className="py-2 px-3">{r.kodeSpbu || '-'}</td>
                        <td className="py-2 px-3 font-bold text-stone-100">{r.cnNew || '-'}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {(Number(r.jmlLtr) || 0).toLocaleString('id-ID')} L
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-400">
                          Rp {(Number(r.totalNominal) || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3">{r.job || '-'}</td>
                      </tr>
                    ))}
                    {filteredOutField.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-stone-500 italic">
                          Tidak ada data pembelian solar SPBU luar pada rentang tanggal ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {previewTab === 'oli' && (
                <div className="p-3 space-y-4">
                  {/* Rekapitulasi Varian */}
                  <div>
                    <h4 className="text-[11px] font-bold text-emerald-400 mb-2 uppercase">
                      Rekapitulasi Penggunaan per Varian Oli:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {metrics.oliPerTipeList.map(([tipe, val]) => (
                        <div
                          key={tipe}
                          className="bg-stone-900 p-2.5 rounded-xl border border-stone-800 flex justify-between items-center"
                        >
                          <div>
                            <span className="text-xs font-bold text-stone-200 block truncate" title={tipe}>
                              {tipe}
                            </span>
                            <span className="text-[10px] text-stone-400">{val.count} Bon Pengisian</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {val.totalLiter.toLocaleString('id-ID')} Ltr
                          </span>
                        </div>
                      ))}
                      {metrics.oliPerTipeList.length === 0 && (
                        <div className="text-stone-500 italic text-xs col-span-3">
                          Belum ada varian oli yang digunakan pada tanggal ini.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rincian Bon */}
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-300 mb-1.5 uppercase">
                      Daftar Bon Pengeluaran Oli ({filteredOilDist.length} Transaksi):
                    </h4>
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead className="bg-stone-900 text-stone-400">
                        <tr>
                          <th className="py-1.5 px-2">Tanggal</th>
                          <th className="py-1.5 px-2">No Bon</th>
                          <th className="py-1.5 px-2">CN Unit</th>
                          <th className="py-1.5 px-2">Tipe Oli</th>
                          <th className="py-1.5 px-2 text-right">Qty (L)</th>
                          <th className="py-1.5 px-2">Kerusakan / Kompartemen</th>
                          <th className="py-1.5 px-2">Mekanik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-900 text-stone-300">
                        {filteredOilDist.slice(0, 15).map((r, idx) => (
                          <tr key={r.id || idx}>
                            <td className="py-1.5 px-2 text-stone-400">{r.tanggal || '-'}</td>
                            <td className="py-1.5 px-2 font-bold text-emerald-400">{r.noBon || '-'}</td>
                            <td className="py-1.5 px-2 font-bold">{r.noUnit || '-'}</td>
                            <td className="py-1.5 px-2">{r.jenisOli}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-emerald-400">
                              {(Number(r.qty) || 0).toLocaleString('id-ID')} L
                            </td>
                            <td className="py-1.5 px-2 text-stone-400 truncate max-w-[120px]">
                              {r.rincianKerusakan || '-'}
                            </td>
                            <td className="py-1.5 px-2">{r.picMekanik || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Siap Cetak PDF: <strong className="text-stone-200">{filteredStockInputs.length + filteredTransfers.length + filteredDistributions.length + filteredOutField.length + filteredOilDist.length}</strong> total baris transaksi
            </span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs font-mono transition"
            >
              Batal
            </button>

            <button
              id="btn-print-laporan-fog"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-xs font-mono transition shadow-sm"
              title="Buka dialog cetak browser (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-stone-400" />
              <span>Print Dokumen</span>
            </button>

            <button
              id="btn-export-pdf-fuel-oil-transactions"
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs font-mono transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF Resmi (.pdf)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
