import React, { useState, useMemo, useEffect } from 'react';
import { 
  OilDistributionRecord, 
  OilStockInputRecord, 
  HeavyEquipment, 
  ManpowerData, 
  UserAccount, 
  InventoryPeriodBalance 
} from '../../types';
import { resolveOilSummarySignatories } from '../../utils/reportSignatories';
import { generateOilSummaryReportPDF, exportOilSummaryReportToPDF } from '../../utils/pdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { BkwaLogo } from '../BkwaLogo';
import { 
  Droplet, 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  FileDown, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  User, 
  Layers, 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Warehouse, 
  Truck, 
  Clock, 
  X, 
  ChevronRight, 
  Check, 
  Edit3,
  Save
} from 'lucide-react';

interface OilSummaryReportSubViewProps {
  oilDistributions: OilDistributionRecord[];
  oilStockInputs: OilStockInputRecord[];
  periodBalance: InventoryPeriodBalance;
  availableOilTypes: string[];
  equipmentList: HeavyEquipment[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
}

const STORAGE_KEY_PIC_FOG = 'bkwa_oil_report_pic_fog';
const STORAGE_KEY_PIC_FOG_JABATAN = 'bkwa_oil_report_pic_fog_jabatan';
const STORAGE_KEY_INVENTORY = 'bkwa_oil_report_inventory';
const STORAGE_KEY_INVENTORY_JABATAN = 'bkwa_oil_report_inventory_jabatan';
const STORAGE_KEY_KABAG = 'bkwa_oil_report_kabag';
const STORAGE_KEY_KABAG_JABATAN = 'bkwa_oil_report_kabag_jabatan';

export const OilSummaryReportSubView: React.FC<OilSummaryReportSubViewProps> = ({
  oilDistributions,
  oilStockInputs,
  periodBalance,
  availableOilTypes,
  equipmentList,
  manpowerList,
  currentUser,
}) => {
  // 1. Initial date presets (Default: Bulan Berjalan)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const todayStr = today.toISOString().split('T')[0];
  const firstDayOfMonthStr = `${yyyy}-${mm}-01`;

  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedOilType, setSelectedOilType] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GROUPED'>('TABLE');

  // 2. Signatories (Validasi 3 Pihak)
  const resolvedSignatories = useMemo(() => {
    return resolveOilSummarySignatories(manpowerList, currentUser);
  }, [manpowerList, currentUser]);

  const [picFog, setPicFog] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PIC_FOG) || resolvedSignatories.picFogName || 'Staff Administrasi FOG';
  });
  const [picFogJabatan, setPicFogJabatan] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PIC_FOG_JABATAN) || resolvedSignatories.picFogJabatan || 'Administrasi';
  });

  const [inventoryUser, setInventoryUser] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_INVENTORY) || resolvedSignatories.inventoryName || 'Staff Administrasi Inventory';
  });
  const [inventoryJabatan, setInventoryJabatan] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_INVENTORY_JABATAN) || resolvedSignatories.inventoryJabatan || 'Administrasi';
  });

  const [kabagWorkshop, setKabagWorkshop] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_KABAG) || resolvedSignatories.kabagWorkshopName || 'Dodik Mariyadi';
  });
  const [kabagWorkshopJabatan, setKabagWorkshopJabatan] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_KABAG_JABATAN) || resolvedSignatories.kabagWorkshopJabatan || 'Kabag Workshop';
  });

  const [customPicFog, setCustomPicFog] = useState(false);
  const [customInventory, setCustomInventory] = useState(false);
  const [customKabag, setCustomKabag] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (picFog) localStorage.setItem(STORAGE_KEY_PIC_FOG, picFog);
    if (picFogJabatan) localStorage.setItem(STORAGE_KEY_PIC_FOG_JABATAN, picFogJabatan);
    if (inventoryUser) localStorage.setItem(STORAGE_KEY_INVENTORY, inventoryUser);
    if (inventoryJabatan) localStorage.setItem(STORAGE_KEY_INVENTORY_JABATAN, inventoryJabatan);
    if (kabagWorkshop) localStorage.setItem(STORAGE_KEY_KABAG, kabagWorkshop);
    if (kabagWorkshopJabatan) localStorage.setItem(STORAGE_KEY_KABAG_JABATAN, kabagWorkshopJabatan);
  }, [picFog, picFogJabatan, inventoryUser, inventoryJabatan, kabagWorkshop, kabagWorkshopJabatan]);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const handleSaveSignatories = () => {
    if (picFog) localStorage.setItem(STORAGE_KEY_PIC_FOG, picFog);
    if (picFogJabatan) localStorage.setItem(STORAGE_KEY_PIC_FOG_JABATAN, picFogJabatan);
    if (inventoryUser) localStorage.setItem(STORAGE_KEY_INVENTORY, inventoryUser);
    if (inventoryJabatan) localStorage.setItem(STORAGE_KEY_INVENTORY_JABATAN, inventoryJabatan);
    if (kabagWorkshop) localStorage.setItem(STORAGE_KEY_KABAG, kabagWorkshop);
    if (kabagWorkshopJabatan) localStorage.setItem(STORAGE_KEY_KABAG_JABATAN, kabagWorkshopJabatan);

    setSaveSuccessMsg('Pengesahan Disimpan!');
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3500);
  };

  // Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');

  // Quick Date Setters
  const setQuickDate = (preset: 'TODAY' | 'LAST_7' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL') => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = String(now.getMonth() + 1).padStart(2, '0');
    const curD = String(now.getDate()).padStart(2, '0');
    const tStr = `${curY}-${curM}-${curD}`;

    if (preset === 'TODAY') {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (preset === 'LAST_7') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(tStr);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(`${curY}-${curM}-01`);
      setEndDate(tStr);
    } else if (preset === 'LAST_MONTH') {
      const prevMonth = new Date(curY, now.getMonth() - 1, 1);
      const prevY = prevMonth.getFullYear();
      const prevM = String(prevMonth.getMonth() + 1).padStart(2, '0');
      const lastDayPrevMonth = new Date(curY, now.getMonth(), 0).getDate();
      setStartDate(`${prevY}-${prevM}-01`);
      setEndDate(`${prevY}-${prevM}-${String(lastDayPrevMonth).padStart(2, '0')}`);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${curY}-01-01`);
      setEndDate(tStr);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // 3. Helper filter tanggal
  const matchDate = (tgl?: string) => {
    if (!tgl) return true;
    const cleanTgl = tgl.trim().split('T')[0];
    if (startDate && cleanTgl < startDate) return false;
    if (endDate && cleanTgl > endDate) return false;
    return true;
  };

  const isBeforeStart = (tgl?: string) => {
    if (!startDate || !tgl) return false;
    const cleanTgl = tgl.trim().split('T')[0];
    return cleanTgl < startDate;
  };

  // 4. Koleksi semua tipe oli unik
  const defaultTypes = [
    'TURALIK 52 PERTAMINA',
    'RORED HDA SAE 90',
    'SAE 15W 40',
    'MEDITRAN SX 15W-40',
    'TURALIK 48',
    'RORED HDA SAE 140',
    'ATF AUTOMATIC TRANSMISSION',
    'HYDRAULIC OIL ISO VG 68',
  ];

  const allDistinctOilTypes = useMemo(() => {
    const set = new Set<string>();
    availableOilTypes.forEach((t) => t && set.add(t.trim().toUpperCase()));
    oilStockInputs.forEach((i) => i.namaOli && set.add(i.namaOli.trim().toUpperCase()));
    oilDistributions.forEach((d) => d.jenisOli && set.add(d.jenisOli.trim().toUpperCase()));
    defaultTypes.forEach((t) => set.add(t.trim().toUpperCase()));
    return Array.from(set).filter(Boolean);
  }, [availableOilTypes, oilStockInputs, oilDistributions]);

  // 5. Perhitungan Saldo per Tipe Oli
  const oilStockSummary = useMemo(() => {
    const list = allDistinctOilTypes.map((tipe) => {
      const tipeUpper = tipe.trim().toUpperCase();

      // Saldo baseline
      const baseline = Number(periodBalance?.sisaPeriodeLaluOli?.[tipe]) || 0;

      // Mutasi sebelum startDate (untuk menghitung saldo awal periode yang akurat)
      const priorMasuk = oilStockInputs
        .filter((i) => i.namaOli?.trim().toUpperCase() === tipeUpper && isBeforeStart(i.tanggal))
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const priorKeluar = oilDistributions
        .filter((d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && isBeforeStart(d.tanggal))
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const saldoAwal = Math.max(0, baseline + priorMasuk - priorKeluar);

      // Mutasi dalam periode
      const masuk = oilStockInputs
        .filter((i) => i.namaOli?.trim().toUpperCase() === tipeUpper && matchDate(i.tanggal))
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const keluar = oilDistributions
        .filter((d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && matchDate(d.tanggal))
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const saldoAkhir = Math.max(0, saldoAwal + masuk - keluar);

      // Hitung unit unik yang menggunakan oli ini
      const distInPeriod = oilDistributions.filter(
        (d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && matchDate(d.tanggal)
      );
      const uniqueUnits = new Set(distInPeriod.map((d) => d.noUnit).filter(Boolean)).size;
      const bonCount = distInPeriod.length;

      let status: 'AMAN' | 'MENIPIS' | 'KRITIS' | 'KOSONG' = 'AMAN';
      if (saldoAkhir === 0) status = 'KOSONG';
      else if (saldoAkhir < 20) status = 'KRITIS';
      else if (saldoAkhir < 50) status = 'MENIPIS';

      return {
        tipe,
        saldoAwal,
        masuk,
        keluar,
        saldoAkhir,
        bonCount,
        uniqueUnits,
        status,
      };
    });

    // Urutkan: yang memiliki aktivitas penggunaan atau stok terbanyak di atas
    return list.sort((a, b) => b.keluar - a.keluar || b.saldoAkhir - a.saldoAkhir);
  }, [allDistinctOilTypes, oilStockInputs, oilDistributions, periodBalance, startDate, endDate]);

  // 6. Ringkasan Total Semua Oli
  const totalSaldoAwal = useMemo(() => oilStockSummary.reduce((acc, c) => acc + c.saldoAwal, 0), [oilStockSummary]);
  const totalMasuk = useMemo(() => oilStockSummary.reduce((acc, c) => acc + c.masuk, 0), [oilStockSummary]);
  const totalKeluar = useMemo(() => oilStockSummary.reduce((acc, c) => acc + c.keluar, 0), [oilStockSummary]);
  const totalSaldoAkhir = useMemo(() => oilStockSummary.reduce((acc, c) => acc + c.saldoAkhir, 0), [oilStockSummary]);

  // 7. Filter Rincian Distribusi Oli
  const filteredDistributions = useMemo(() => {
    return oilDistributions.filter((d) => {
      if (!matchDate(d.tanggal)) return false;

      if (selectedOilType !== 'ALL') {
        if (d.jenisOli?.trim().toUpperCase() !== selectedOilType.trim().toUpperCase()) {
          return false;
        }
      }

      if (selectedUnit !== 'ALL') {
        if (d.noUnit?.trim().toUpperCase() !== selectedUnit.trim().toUpperCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noUnit = (d.noUnit || '').toLowerCase();
        const namaAlat = (d.namaAlat || d.namaUnit || '').toLowerCase();
        const noBon = (d.noBon || '').toLowerCase();
        const jenisOli = (d.jenisOli || '').toLowerCase();
        const mekanik = (d.picMekanik || '').toLowerCase();
        const picGudang = (d.picGudangMaterial || '').toLowerCase();
        const rincian = (d.rincianKerusakan || '').toLowerCase();
        const remark = (d.remark || '').toLowerCase();

        return (
          noUnit.includes(q) ||
          namaAlat.includes(q) ||
          noBon.includes(q) ||
          jenisOli.includes(q) ||
          mekanik.includes(q) ||
          picGudang.includes(q) ||
          rincian.includes(q) ||
          remark.includes(q)
        );
      }

      return true;
    });
  }, [oilDistributions, startDate, endDate, selectedOilType, selectedUnit, searchQuery]);

  // Grouped by Oil Type for Grouped View
  const groupedDistributions = useMemo(() => {
    const map = new Map<string, OilDistributionRecord[]>();
    filteredDistributions.forEach((d) => {
      const t = d.jenisOli || 'Lainnya';
      const cur = map.get(t) || [];
      cur.push(d);
      map.set(t, cur);
    });
    return map;
  }, [filteredDistributions]);

  // 8. Handler Preview & Export PDF
  const handlePreviewPDF = () => {
    try {
      const result = generateOilSummaryReportPDF({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedOilType: selectedOilType !== 'ALL' ? selectedOilType : undefined,
        picFogName: picFog,
        picFogJabatan: picFogJabatan,
        inventoryName: inventoryUser,
        inventoryJabatan: inventoryJabatan,
        kabagWorkshopName: kabagWorkshop,
        kabagWorkshopJabatan: kabagWorkshopJabatan,
        currentUser,
        oilDistributions,
        oilStockInputs,
        periodBalance,
        availableOilTypes,
      });

      setPreviewPdfUrl(result.blobUrl);
      setPreviewFilename(result.filename);
      setShowPdfPreview(true);
    } catch (e) {
      console.error('Error generating Oil Summary PDF Preview', e);
      setShowPrintModal(true);
    }
  };

  const handleExportPDF = () => {
    try {
      exportOilSummaryReportToPDF({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedOilType: selectedOilType !== 'ALL' ? selectedOilType : undefined,
        picFogName: picFog,
        picFogJabatan: picFogJabatan,
        inventoryName: inventoryUser,
        inventoryJabatan: inventoryJabatan,
        kabagWorkshopName: kabagWorkshop,
        kabagWorkshopJabatan: kabagWorkshopJabatan,
        currentUser,
        oilDistributions,
        oilStockInputs,
        periodBalance,
        availableOilTypes,
      });
    } catch (e) {
      console.error('Error exporting Oil Summary PDF', e);
      setShowPrintModal(true);
    }
  };

  // Browser Direct Print
  const handlePrintBrowser = () => {
    window.print();
  };

  // Periode label
  const periodeLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} s/d ${endDate}`;
    if (startDate) return `Mulai ${startDate}`;
    if (endDate) return `Sampai ${endDate}`;
    return 'Semua Periode Transaksi';
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER: SUB MODUL REPORT SUMMARY PENGGUNAAN OLI */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SUB MODUL REPORT OLI
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-800 text-stone-400 border border-stone-700">
                PT BKWA Pasuruan
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-stone-100 font-mono tracking-wide uppercase flex items-center gap-2.5">
              <Droplet className="w-6 h-6 text-emerald-400" />
              <span>REPORT SUMMARY PENGGUNAAN OLI SETIAP TYPE / KATEGORI</span>
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-3xl leading-relaxed">
              Monitoring mutasi &amp; informasi <strong>Saldo Awal</strong>, <strong>Penerimaan Masuk</strong>, <strong>Distribusi Unit</strong>, serta <strong>Saldo Akhir</strong> untuk setiap jenis oli pelumas alat berat Quarry Purwosari. Dilengkapi lembar pengesahan 3 pihak (PIC FOG, Inventory, dan Kabag Workshop).
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-preview-print-oil-summary"
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-mono font-semibold transition shadow-sm active:scale-95"
              title="Buka Lembar Pratinjau Cetak Lengkap (Kop Surat Resmi)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Preview Print (Cetak)</span>
            </button>

            <button
              id="btn-preview-pdf-oil-summary"
              type="button"
              onClick={handlePreviewPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition shadow-sm active:scale-95"
              title="Buka Pratinjau PDF interaktif untuk cek data sebelum download"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Pratinjau PDF (Preview)</span>
            </button>

            <button
              id="btn-export-pdf-oil-summary"
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-stone-950 text-xs font-mono font-black transition shadow-lg shadow-emerald-500/25 active:scale-95"
              title="Download Dokumen Resmi PDF ke Komputer (.pdf)"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF Resmi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD METRIK SALDO OLI UTAMA (4 STATISTIK) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Awal */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">
              TOTAL SALDO AWAL
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-stone-100">
              {totalSaldoAwal.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-mono text-stone-400">Liter</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-1 font-mono">
            Sisa stok fisik sebelum tanggal {startDate || 'Awal'}
          </p>
        </div>

        {/* Card 2: Total Penerimaan Masuk */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              TOTAL PENERIMAAN (MASUK)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-400">
              +{totalMasuk.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-mono text-stone-400">Liter</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-1 font-mono">
            Drop pengadaan oli baru ke gudang
          </p>
        </div>

        {/* Card 3: Total Penggunaan Keluar */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400">
              TOTAL DISTRIBUSI (KELUAR)
            </span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-orange-400">
              -{totalKeluar.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-mono text-stone-400">Liter</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-1 font-mono">
            Dipakai servis pada {filteredDistributions.length} bon unit
          </p>
        </div>

        {/* Card 4: Total Saldo Akhir */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400">
              TOTAL SALDO AKHIR
            </span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-stone-100">
              {totalSaldoAkhir.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-mono text-stone-400">Liter</span>
          </div>
          <p className="text-[10px] text-emerald-400 mt-1 font-mono">
            Stok fisik aktif di drum &amp; gudang FOG
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER TANGGAL, TIPE OLI, UNIT & PENCARIAN */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-100 font-mono uppercase tracking-wider">
              Filter Parameter Laporan
            </h3>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-stone-400 uppercase">Cepat:</span>
            {[
              { id: 'TODAY', label: 'Hari Ini' },
              { id: 'LAST_7', label: '7 Hari' },
              { id: 'THIS_MONTH', label: 'Bulan Ini' },
              { id: 'LAST_MONTH', label: 'Bulan Lalu' },
              { id: 'THIS_YEAR', label: 'Tahun Ini' },
              { id: 'ALL', label: 'Semua' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setQuickDate(p.id as any)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Tanggal Mulai */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-stone-400 mb-1">
              Tanggal Mulai
            </label>
            <div className="relative">
              <input
                id="filter-oil-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
              />
              <Calendar className="w-3.5 h-3.5 text-stone-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Tanggal Selesai */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-stone-400 mb-1">
              Tanggal Selesai
            </label>
            <div className="relative">
              <input
                id="filter-oil-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
              />
              <Calendar className="w-3.5 h-3.5 text-stone-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Filter Tipe Oli */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-emerald-400 mb-1">
              Jenis / Tipe Oli
            </label>
            <select
              id="filter-oil-type"
              value={selectedOilType}
              onChange={(e) => setSelectedOilType(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">-- Semua Jenis Oli ({allDistinctOilTypes.length}) --</option>
              {allDistinctOilTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Kata Kunci */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase text-stone-400 mb-1">
              Cari Transaksi / Unit
            </label>
            <div className="relative">
              <input
                id="filter-oil-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="No Unit / Bon / Mekanik..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar Filter Aktif */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono text-stone-400">
          <div className="flex items-center gap-2">
            <span>Periode: <strong className="text-emerald-400">{periodeLabel}</strong></span>
            <span>•</span>
            <span>Tipe: <strong className="text-stone-200">{selectedOilType === 'ALL' ? 'Semua Tipe' : selectedOilType}</strong></span>
            <span>•</span>
            <span>Ditemukan: <strong className="text-stone-200">{filteredDistributions.length}</strong> bon distribusi</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setStartDate(firstDayOfMonthStr);
              setEndDate(todayStr);
              setSelectedOilType('ALL');
              setSelectedUnit('ALL');
              setSearchQuery('');
            }}
            className="flex items-center gap-1 text-[10px] font-mono text-stone-500 hover:text-stone-300 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. VALIDASI 3 PIHAK (PIC FOG, INVENTORY, KABAG WORKSHOP DODIK MARIYADI) */}
      {/* Sesuai spesifikasi prompt user: Dropdown Manpower jabatan Administrasi */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-100 font-mono uppercase tracking-wider">
              Validasi &amp; Lembar Pengesahan Laporan (3 Pihak)
            </h3>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {saveSuccessMsg && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-bold animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                {saveSuccessMsg}
              </span>
            )}
            <button
              id="btn-simpan-penandatangan-oil-summary"
              type="button"
              onClick={handleSaveSignatories}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-mono font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
              title="Simpan pilihan pejabat penandatangan"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pengesahan</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PIHAK 1: DI BUAT OLEH (DROPDOWN MODUL 2 JABATAN ADMINISTRASI) */}
          <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono font-bold text-emerald-400 uppercase">
                1. Di Buat Oleh
              </label>
              <button
                type="button"
                onClick={() => setCustomPicFog(!customPicFog)}
                className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1"
                title="Ganti ke input manual"
              >
                <Edit3 className="w-3 h-3" />
                <span>{customPicFog ? 'Dropdown' : 'Ketik Manual'}</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-400 leading-tight">
              Dropdown modul 2 jabatan administrasi
            </p>

            {!customPicFog ? (
              <select
                id="select-pic-fog-admin"
                value={picFog}
                onChange={(e) => {
                  const val = e.target.value;
                  setPicFog(val);
                  const found = manpowerList.find((m) => m.nama === val);
                  if (found?.jabatan) setPicFogJabatan(found.jabatan);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-emerald-500 outline-none cursor-pointer"
              >
                {resolvedSignatories.administrasiList.length > 0 && (
                  <optgroup label="Manpower Berjabatan Administrasi">
                    {resolvedSignatories.administrasiList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan || 'Administrasi'}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Semua Personil Manpower">
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan || 'Manpower'})
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : (
              <input
                id="input-pic-fog-manual"
                type="text"
                value={picFog}
                onChange={(e) => setPicFog(e.target.value)}
                placeholder="Nama Pembuat Laporan..."
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-emerald-500 outline-none"
              />
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-0.5">
              <span>Jabatan:</span>
              <span className="text-emerald-400 font-semibold">{picFogJabatan || 'Administrasi'}</span>
            </div>
          </div>

          {/* PIHAK 2: DIPERIKSA OLEH (DROPDOWN MODUL 2 JABATAN ADMINISTRASI) */}
          <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono font-bold text-blue-400 uppercase">
                2. Diperiksa Oleh
              </label>
              <button
                type="button"
                onClick={() => setCustomInventory(!customInventory)}
                className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1"
                title="Ganti ke input manual"
              >
                <Edit3 className="w-3 h-3" />
                <span>{customInventory ? 'Dropdown' : 'Ketik Manual'}</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-400 leading-tight">
              Dropdown modul 2 jabatan administrasi
            </p>

            {!customInventory ? (
              <select
                id="select-inventory-admin"
                value={inventoryUser}
                onChange={(e) => {
                  const val = e.target.value;
                  setInventoryUser(val);
                  const found = manpowerList.find((m) => m.nama === val);
                  if (found?.jabatan) setInventoryJabatan(found.jabatan);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-blue-500 outline-none cursor-pointer"
              >
                {resolvedSignatories.administrasiList.length > 0 && (
                  <optgroup label="Manpower Berjabatan Administrasi">
                    {resolvedSignatories.administrasiList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan || 'Administrasi'}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Semua Personil Manpower">
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan || 'Manpower'})
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : (
              <input
                id="input-inventory-manual"
                type="text"
                value={inventoryUser}
                onChange={(e) => setInventoryUser(e.target.value)}
                placeholder="Nama Pemeriksa Laporan..."
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-blue-500 outline-none"
              />
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-0.5">
              <span>Jabatan:</span>
              <span className="text-blue-400 font-semibold">{inventoryJabatan || 'Administrasi'}</span>
            </div>
          </div>

          {/* PIHAK 3: DISETUJUI OLEH (KABAG WORKSHOP DODIK MARIYADI) */}
          <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono font-bold text-amber-400 uppercase">
                3. Disetujui Oleh
              </label>
              <button
                type="button"
                onClick={() => setCustomKabag(!customKabag)}
                className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1"
                title="Ganti ke input manual"
              >
                <Edit3 className="w-3 h-3" />
                <span>{customKabag ? 'Dropdown' : 'Ketik Manual'}</span>
              </button>
            </div>
            <p className="text-[10px] text-stone-400 leading-tight">
              Kabag Workshop (Dodik Mariyadi)
            </p>

            {!customKabag ? (
              <select
                id="select-kabag-dodik"
                value={kabagWorkshop}
                onChange={(e) => {
                  const val = e.target.value;
                  setKabagWorkshop(val);
                  const found = manpowerList.find((m) => m.nama === val);
                  if (found?.jabatan) setKabagWorkshopJabatan(found.jabatan);
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-500 outline-none cursor-pointer"
              >
                <option value="Dodik Mariyadi">Dodik Mariyadi — Kabag Workshop</option>
                {manpowerList
                  .filter((m) => m.nama !== 'Dodik Mariyadi')
                  .map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan || 'Manpower'})
                    </option>
                  ))}
              </select>
            ) : (
              <input
                id="input-kabag-dodik-manual"
                type="text"
                value={kabagWorkshop}
                onChange={(e) => setKabagWorkshop(e.target.value)}
                placeholder="Dodik Mariyadi"
                className="w-full px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs font-mono focus:border-amber-500 outline-none"
              />
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-0.5">
              <span>Jabatan:</span>
              <span className="text-amber-400 font-semibold">{kabagWorkshopJabatan || 'Kabag Workshop'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TABEL REKAPITULASI INFORMASI SALDO OLI SETIAP TYPE / KATEGORI */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                BAGIAN 1
              </span>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono tracking-wide uppercase">
                INFORMASI SALDO &amp; MUTASI OLI SETIAP TYPE / KATEGORI
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Rangkuman saldo awal, penerimaan masuk dari supplier, total distribusi ke unit, dan saldo akhir siap pakai.
            </p>
          </div>

          <div className="text-[11px] font-mono text-stone-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{oilStockSummary.length} Varian Oli Terdata</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-4">Jenis / Varian Oli</th>
                <th className="py-3 px-3 text-right">Saldo Awal</th>
                <th className="py-3 px-3 text-right text-emerald-400">Masuk (Terima)</th>
                <th className="py-3 px-3 text-right text-orange-400">Keluar (Pakai)</th>
                <th className="py-3 px-3 text-right text-teal-300">Saldo Akhir</th>
                <th className="py-3 px-3 text-center">% Beban</th>
                <th className="py-3 px-3 text-center">Bon Trx</th>
                <th className="py-3 px-3 text-center">Status Stok</th>
                <th className="py-3 px-3 text-center">Filter Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {oilStockSummary.map((item, idx) => {
                const pct = totalKeluar > 0 ? ((item.keluar / totalKeluar) * 100).toFixed(1) : '0';
                const isSelected = selectedOilType === item.tipe;

                return (
                  <tr
                    key={item.tipe}
                    className={`hover:bg-stone-800/40 transition ${
                      isSelected ? 'bg-emerald-950/20 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-stone-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-200">{item.tipe}</div>
                      <div className="text-[10px] text-stone-500">{item.uniqueUnits} unit alat berat pernah diisi</div>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-300 font-bold">
                      {item.saldoAwal.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500">L</span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      +{item.masuk.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500">L</span>
                    </td>
                    <td className="py-3 px-3 text-right text-orange-400 font-bold">
                      -{item.keluar.toLocaleString('id-ID')} <span className="text-[10px] text-stone-500">L</span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-stone-100">
                      <span className={item.saldoAkhir === 0 ? 'text-rose-400' : item.saldoAkhir < 20 ? 'text-amber-400' : 'text-teal-300'}>
                        {item.saldoAkhir.toLocaleString('id-ID')}
                      </span>{' '}
                      <span className="text-[10px] text-stone-500">L</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px]">
                        {pct} %
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-stone-300">
                      {item.bonCount} Bon
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          item.status === 'AMAN'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'MENIPIS'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.status === 'KRITIS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                            : 'bg-stone-800 text-stone-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOilType(isSelected ? 'ALL' : item.tipe)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                          isSelected
                            ? 'bg-emerald-500 text-stone-950 font-black'
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {isSelected ? 'Terpilih' : 'Rincian'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* TFOOT TOTAL KESELURUHAN */}
            <tfoot className="bg-stone-950 font-bold text-stone-100 border-t-2 border-stone-700">
              <tr>
                <td colSpan={2} className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-amber-400">
                  TOTAL KESELURUHAN (SEMUA OLI)
                </td>
                <td className="py-3.5 px-3 text-right text-stone-200">
                  {totalSaldoAwal.toLocaleString('id-ID')} L
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400">
                  +{totalMasuk.toLocaleString('id-ID')} L
                </td>
                <td className="py-3.5 px-3 text-right text-orange-400">
                  -{totalKeluar.toLocaleString('id-ID')} L
                </td>
                <td className="py-3.5 px-3 text-right text-teal-300 text-sm font-black">
                  {totalSaldoAkhir.toLocaleString('id-ID')} L
                </td>
                <td className="py-3.5 px-3 text-center text-stone-300">100 %</td>
                <td className="py-3.5 px-3 text-center text-stone-300">{filteredDistributions.length} Bon</td>
                <td colSpan={2} className="py-3.5 px-3 text-center text-stone-500 text-[10px]">
                  Semua Varian Oli Terakumulasi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. RINCIAN DISTRIBUSI PENGGUNAAN OLI PER MASING-MASING JENIS OLI */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden space-y-3">
        <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                BAGIAN 2
              </span>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono tracking-wide uppercase">
                RINCIAN DISTRIBUSI PENGGUNAAN OLI KE UNIT ALAT BERAT
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Daftar bon pengeluaran oli: no unit alat berat, HM saat pengisian, nama mekanik, kompartemen, dan PIC gudang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                viewMode === 'TABLE'
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Tabel Lengkap
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GROUPED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                viewMode === 'GROUPED'
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Group per Tipe Oli
            </button>
          </div>
        </div>

        {viewMode === 'TABLE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3 text-center w-10">No</th>
                  <th className="py-3 px-3">Tanggal &amp; Jam</th>
                  <th className="py-3 px-3">No Bon</th>
                  <th className="py-3 px-3">Jenis Oli</th>
                  <th className="py-3 px-3">CN Unit</th>
                  <th className="py-3 px-3">Nama Alat</th>
                  <th className="py-3 px-3 text-right">HM Unit</th>
                  <th className="py-3 px-3 text-right text-orange-400">Qty (Ltr)</th>
                  <th className="py-3 px-3">Rincian Kompartemen / Problem</th>
                  <th className="py-3 px-3">PIC Mekanik</th>
                  <th className="py-3 px-3">PIC Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredDistributions.length > 0 ? (
                  filteredDistributions.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-stone-800/40 transition">
                      <td className="py-2.5 px-3 text-center text-stone-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 text-stone-300">
                        <div>{r.tanggal || '-'}</div>
                        {r.jam && <div className="text-[10px] text-stone-500">{r.jam}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-400">{r.noBon || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {r.jenisOli}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-100">{r.noUnit || '-'}</td>
                      <td className="py-2.5 px-3 text-stone-300">{r.namaAlat || r.namaUnit || '-'}</td>
                      <td className="py-2.5 px-3 text-right text-stone-400">
                        {(Number(r.hmUnit) || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-orange-400">
                        {(Number(r.qty) || 0).toLocaleString('id-ID')} L
                      </td>
                      <td className="py-2.5 px-3 text-stone-300 max-w-[200px] truncate" title={r.rincianKerusakan}>
                        {r.rincianKerusakan || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-stone-300">{r.picMekanik || '-'}</td>
                      <td className="py-2.5 px-3 text-stone-400">{r.picGudangMaterial || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-stone-500 font-mono">
                      Tidak ada transaksi distribusi oli yang sesuai dengan filter tanggal &amp; jenis oli.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* GROUPED VIEW PER TIPE OLI */
          <div className="p-4 space-y-4">
            {Array.from(groupedDistributions.entries()).map(([tipe, records]) => {
              const subTotalLiter = records.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
              return (
                <div key={tipe} className="bg-stone-950/80 rounded-2xl border border-stone-800 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm text-stone-100 font-mono">{tipe}</span>
                      <span className="text-xs text-stone-400 font-mono">({records.length} Bon)</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-orange-400">
                      Total: {subTotalLiter.toLocaleString('id-ID')} Liter
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="text-[10px] text-stone-500 uppercase border-b border-stone-900">
                        <tr>
                          <th className="py-2 px-2">Tanggal</th>
                          <th className="py-2 px-2">No Bon</th>
                          <th className="py-2 px-2">No Unit</th>
                          <th className="py-2 px-2">Nama Alat</th>
                          <th className="py-2 px-2 text-right">HM</th>
                          <th className="py-2 px-2 text-right">Liter</th>
                          <th className="py-2 px-2">Kompartemen</th>
                          <th className="py-2 px-2">Mekanik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-900">
                        {records.map((r, i) => (
                          <tr key={i} className="hover:bg-stone-900/40">
                            <td className="py-1.5 px-2 text-stone-400">{r.tanggal}</td>
                            <td className="py-1.5 px-2 text-amber-400 font-bold">{r.noBon || '-'}</td>
                            <td className="py-1.5 px-2 font-bold text-stone-200">{r.noUnit}</td>
                            <td className="py-1.5 px-2 text-stone-300">{r.namaAlat || r.namaUnit}</td>
                            <td className="py-1.5 px-2 text-right text-stone-400">
                              {(Number(r.hmUnit) || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-1.5 px-2 text-right font-black text-orange-400">
                              {(Number(r.qty) || 0).toLocaleString('id-ID')} L
                            </td>
                            <td className="py-1.5 px-2 text-stone-300">{r.rincianKerusakan || '-'}</td>
                            <td className="py-1.5 px-2 text-stone-400">{r.picMekanik || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. MODAL PREVIEW PRINT RESMI (PRINT PREVIEW WITH LETTERHEAD & SIGNATURES) */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Dialog */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-stone-100 font-mono text-sm uppercase">
                  PRATINJAU CETAK DOKUMEN RESMI SUMMARY PENGGUNAAN OLI
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-stone-950 font-black text-xs font-mono transition flex items-center gap-1.5 shadow"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBrowser}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs font-mono transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Browser</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Printable Sheet Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-950 print:bg-white print:text-black">
              <div className="max-w-4xl mx-auto bg-stone-900 print:bg-white text-stone-100 print:text-black p-6 sm:p-8 rounded-2xl border border-stone-800 print:border-none shadow-xl space-y-6">
                
                {/* Kop Surat PT BKWA */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-stone-700 print:border-black">
                  <div className="flex items-center gap-3.5">
                    <BkwaLogo size="md" variant="card" />
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-wider text-stone-100 print:text-black font-mono">
                        PT BATU KALI WELANG AMPUH
                      </h2>
                      <p className="text-xs text-emerald-400 print:text-gray-700 font-bold uppercase tracking-widest">
                        Mining, Quarry Stone Crusher &amp; Heavy Equipment Maintenance
                      </p>
                      <p className="text-[10px] text-stone-400 print:text-gray-600">
                        Jalan Raya Kali Welang Pasuruan - Jawa Timur • Divisi FOG (BBM &amp; Pelumas)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-stone-400 print:text-black">
                    <p className="font-bold text-emerald-400 print:text-black">LAPORAN SUMMARY OLI</p>
                    <p>Periode: {periodeLabel}</p>
                    <p>Tipe: {selectedOilType === 'ALL' ? 'Semua Varian' : selectedOilType}</p>
                  </div>
                </div>

                {/* Subtitle Dokumen */}
                <div className="text-center space-y-1">
                  <h3 className="text-sm sm:text-base font-black font-mono uppercase tracking-wide">
                    REKAPITULASI PENGGUNAAN OLI &amp; INFORMASI SALDO SETIAP TYPE
                  </h3>
                  <p className="text-xs text-stone-400 print:text-gray-600 font-mono">
                    Quarry Purwosari • Tanggal Cetak: {new Date().toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Ringkasan Saldo Print Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase text-emerald-400 print:text-black">
                    1. Rangkuman Saldo Awal, Penerimaan &amp; Penggunaan per Tipe Oli
                  </h4>
                  <table className="w-full text-left text-xs font-mono border-collapse border border-stone-700 print:border-black">
                    <thead className="bg-stone-800 print:bg-gray-200 text-stone-200 print:text-black text-[10px]">
                      <tr>
                        <th className="border border-stone-700 print:border-black p-1.5 text-center">No</th>
                        <th className="border border-stone-700 print:border-black p-1.5">Jenis / Varian Oli</th>
                        <th className="border border-stone-700 print:border-black p-1.5 text-right">Saldo Awal</th>
                        <th className="border border-stone-700 print:border-black p-1.5 text-right">Masuk</th>
                        <th className="border border-stone-700 print:border-black p-1.5 text-right">Keluar</th>
                        <th className="border border-stone-700 print:border-black p-1.5 text-right">Saldo Akhir</th>
                        <th className="border border-stone-700 print:border-black p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oilStockSummary.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-stone-700 print:border-black p-1.5 text-center">{i + 1}</td>
                          <td className="border border-stone-700 print:border-black p-1.5 font-bold">{item.tipe}</td>
                          <td className="border border-stone-700 print:border-black p-1.5 text-right">
                            {item.saldoAwal.toLocaleString('id-ID')} L
                          </td>
                          <td className="border border-stone-700 print:border-black p-1.5 text-right">
                            +{item.masuk.toLocaleString('id-ID')} L
                          </td>
                          <td className="border border-stone-700 print:border-black p-1.5 text-right">
                            -{item.keluar.toLocaleString('id-ID')} L
                          </td>
                          <td className="border border-stone-700 print:border-black p-1.5 text-right font-bold">
                            {item.saldoAkhir.toLocaleString('id-ID')} L
                          </td>
                          <td className="border border-stone-700 print:border-black p-1.5 text-center">{item.status}</td>
                        </tr>
                      ))}
                      <tr className="font-black bg-stone-800/80 print:bg-gray-100">
                        <td colSpan={2} className="border border-stone-700 print:border-black p-1.5 uppercase text-amber-400 print:text-black">
                          TOTAL KESELURUHAN
                        </td>
                        <td className="border border-stone-700 print:border-black p-1.5 text-right">{totalSaldoAwal.toLocaleString('id-ID')} L</td>
                        <td className="border border-stone-700 print:border-black p-1.5 text-right">+{totalMasuk.toLocaleString('id-ID')} L</td>
                        <td className="border border-stone-700 print:border-black p-1.5 text-right">-{totalKeluar.toLocaleString('id-ID')} L</td>
                        <td className="border border-stone-700 print:border-black p-1.5 text-right">{totalSaldoAkhir.toLocaleString('id-ID')} L</td>
                        <td className="border border-stone-700 print:border-black p-1.5 text-center">Selesai</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Lembar Pengesahan Tanda Tangan 3 Pihak */}
                <div className="pt-6 border-t border-stone-800 print:border-black">
                  <div className="grid grid-cols-3 gap-6 text-center text-xs font-mono">
                    {/* 1. Di Buat Oleh */}
                    <div className="space-y-12">
                      <p className="text-stone-400 print:text-black">
                        Di Buat Oleh,<br />
                        <span className="text-[10px] text-stone-500 print:text-gray-600">{picFogJabatan || 'Administrasi'}</span>
                      </p>
                      <div>
                        <div className="font-bold underline text-stone-100 print:text-black">
                          ( {picFog || '.......................'} )
                        </div>
                        <p className="text-[10px] text-stone-400 print:text-gray-600">Administrasi Workshop / FOG</p>
                      </div>
                    </div>

                    {/* 2. Diperiksa Oleh */}
                    <div className="space-y-12">
                      <p className="text-stone-400 print:text-black">
                        Diperiksa Oleh,<br />
                        <span className="text-[10px] text-stone-500 print:text-gray-600">{inventoryJabatan || 'Administrasi'}</span>
                      </p>
                      <div>
                        <div className="font-bold underline text-stone-100 print:text-black">
                          ( {inventoryUser || '.......................'} )
                        </div>
                        <p className="text-[10px] text-stone-400 print:text-gray-600">Administrasi Workshop / Inventory</p>
                      </div>
                    </div>

                    {/* 3. Disetujui Oleh */}
                    <div className="space-y-12">
                      <p className="text-stone-400 print:text-black">
                        Disetujui Oleh,<br />
                        <span className="text-[10px] text-stone-500 print:text-gray-600">{kabagWorkshopJabatan || 'Kabag Workshop'}</span>
                      </p>
                      <div>
                        <div className="font-bold underline text-stone-100 print:text-black">
                          ( {kabagWorkshop || 'Dodik Mariyadi'} )
                        </div>
                        <p className="text-[10px] text-stone-400 print:text-gray-600">Kabag Workshop PT BKWA</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL PRATINJAU PDF RESMI SEBELUM DOWNLOAD (UNIVERSAL PDF PREVIEW) */}
      {/* ========================================================================= */}
      <PdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title="PRATINJAU PDF - REPORT SUMMARY PENGGUNAAN OLI PER TIPE"
        subtitle="PT BATU KALI WELANG AMPUH • Site Quarry Purwosari"
        pdfBlobUrl={previewPdfUrl}
        filename={previewFilename}
        onDownload={handleExportPDF}
        signatoriesSummary={{
          pembuat: `${picFog} (${picFogJabatan})`,
          diperiksa: `${inventoryUser} (${inventoryJabatan})`,
          diketahui: `${kabagWorkshop} (${kabagWorkshopJabatan})`,
        }}
      />
    </div>
  );
};
