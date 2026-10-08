import React, { useState, useMemo } from 'react';
import { 
  HeavyEquipment, 
  ManpowerData, 
  UserAccount,
  SupplierRecord,
  FuelStockInputRecord,
  FuelTransferRecord,
  OilStockInputRecord,
  FuelDistributionRecord,
  OilDistributionRecord,
  InventoryPeriodBalance,
  DEFAULT_FOG_NAMA_BARANG,
  OutFieldFuelRecord,
  GreaseStockRecord,
  GreaseDistributionRecord
} from '../../types';
import { SupplierSubView } from './SupplierSubView';
import { FuelStockInputSubView } from './FuelStockInputSubView';
import { FuelTransferSubView } from './FuelTransferSubView';
import { OilStockInputSubView } from './OilStockInputSubView';
import { FuelDistributionSubView } from './FuelDistributionSubView';
import { OilDistributionSubView } from './OilDistributionSubView';
import { OutFieldFuelSubView } from './OutFieldFuelSubView';
import { GreaseSubView } from './GreaseSubView';
import { calculateInventoryStockLevels } from '../../utils/storage';
import { 
  Fuel, 
  Droplet, 
  Truck, 
  ArrowRightLeft, 
  Building2, 
  Wrench, 
  Flame, 
  Gauge, 
  Settings2, 
  CheckCircle2, 
  SlidersHorizontal,
  X,
  Plus,
  Layers,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Warehouse,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Package,
  Sparkles
} from 'lucide-react';

export type FogCategoryColumn = 'ALL' | 'FUEL' | 'OIL' | 'GREASE' | 'SUPPLIER';
export type FogSubModuleTab = 
  | 'out_field_fuel'
  | 'fuel_stock'
  | 'fuel_transfer'
  | 'fuel_dist'
  | 'oil_stock'
  | 'oil_dist'
  | 'grease'
  | 'supplier';

interface InventoryManagementViewProps {
  units: HeavyEquipment[];
  manpowerList: ManpowerData[];
  suppliers: SupplierRecord[];
  fuelStockInputs: FuelStockInputRecord[];
  fuelTransfers: FuelTransferRecord[];
  oilStockInputs: OilStockInputRecord[];
  fuelDistributions: FuelDistributionRecord[];
  oilDistributions: OilDistributionRecord[];
  periodBalance: InventoryPeriodBalance;
  availableOilTypes: string[];
  currentUser: UserAccount;
  // Out Field Fuel (SPBU Luar)
  outFieldFuelRecords?: OutFieldFuelRecord[];
  onSaveOutFieldFuelRecord?: (
    data: Omit<OutFieldFuelRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OutFieldFuelRecord };
  onDeleteOutFieldFuelRecord?: (id: string) => { success: boolean; message: string };
  standardSolarPrice?: number;
  onUpdateSolarPrice?: (newPrice: number) => void;
  // Grease
  greaseStocks?: GreaseStockRecord[];
  greaseDistributions?: GreaseDistributionRecord[];
  onSaveGreaseStock?: (
    data: Omit<GreaseStockRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseStockRecord };
  onDeleteGreaseStock?: (id: string) => { success: boolean; message: string };
  onSaveGreaseDistribution?: (
    data: Omit<GreaseDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseDistributionRecord };
  onDeleteGreaseDistribution?: (id: string) => { success: boolean; message: string };
  // Standar CRUD
  onSaveSupplier: (
    data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: SupplierRecord };
  onDeleteSupplier: (id: string) => { success: boolean; message: string };
  onSaveFuelStockInput: (
    data: Omit<FuelStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelStockInputRecord };
  onDeleteFuelStockInput: (id: string) => { success: boolean; message: string };
  onSaveFuelTransfer: (
    data: Omit<FuelTransferRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelTransferRecord };
  onDeleteFuelTransfer: (id: string) => { success: boolean; message: string };
  onSaveOilStockInput: (
    data: Omit<OilStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OilStockInputRecord };
  onDeleteOilStockInput: (id: string) => { success: boolean; message: string };
  onSaveFuelDistribution: (
    data: Omit<FuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelDistributionRecord };
  onDeleteFuelDistribution: (id: string) => { success: boolean; message: string };
  onSaveOilDistribution: (
    data: Omit<OilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OilDistributionRecord };
  onDeleteOilDistribution: (id: string) => { success: boolean; message: string };
  onSavePeriodBalance: (balance: InventoryPeriodBalance) => { success: boolean; message: string };
  onAddCustomOilType: (newOilName: string) => void;
  onBackToMainMenu?: () => void;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  units,
  manpowerList,
  suppliers,
  fuelStockInputs,
  fuelTransfers,
  oilStockInputs,
  fuelDistributions,
  oilDistributions,
  periodBalance,
  availableOilTypes,
  currentUser,
  outFieldFuelRecords = [],
  onSaveOutFieldFuelRecord = () => ({ success: false, message: 'Tidak didukung' }),
  onDeleteOutFieldFuelRecord = () => ({ success: false, message: 'Tidak didukung' }),
  standardSolarPrice = 6800,
  onUpdateSolarPrice = () => {},
  greaseStocks = [],
  greaseDistributions = [],
  onSaveGreaseStock = () => ({ success: false, message: 'Tidak didukung' }),
  onDeleteGreaseStock = () => ({ success: false, message: 'Tidak didukung' }),
  onSaveGreaseDistribution = () => ({ success: false, message: 'Tidak didukung' }),
  onDeleteGreaseDistribution = () => ({ success: false, message: 'Tidak didukung' }),
  onSaveSupplier,
  onDeleteSupplier,
  onSaveFuelStockInput,
  onDeleteFuelStockInput,
  onSaveFuelTransfer,
  onDeleteFuelTransfer,
  onSaveOilStockInput,
  onDeleteOilStockInput,
  onSaveFuelDistribution,
  onDeleteFuelDistribution,
  onSaveOilDistribution,
  onDeleteOilDistribution,
  onSavePeriodBalance,
  onAddCustomOilType,
  onBackToMainMenu,
}) => {
  // Category Filter & Active Sub-Modul
  const [selectedCategory, setSelectedCategory] = useState<FogCategoryColumn>('ALL');
  const [activeSubModule, setActiveSubModule] = useState<FogSubModuleTab>('out_field_fuel');

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showQuickCapacityModal, setShowQuickCapacityModal] = useState(false);
  const [quickCapacityVal, setQuickCapacityVal] = useState<number>(20000);

  // Form states untuk kalibrasi Sisa Periode Sebelumnya & Kapasitas Tangki Manual
  const [editFuelTangki, setEditFuelTangki] = useState<number>(periodBalance.sisaPeriodeLaluFuelTangki || 0);
  const [editFuelFT, setEditFuelFT] = useState<number>(periodBalance.sisaPeriodeLaluFuelFT || 0);
  const [editKapasitasTangkiUtama, setEditKapasitasTangkiUtama] = useState<number>(
    periodBalance.kapasitasTangkiUtama || 20000
  );
  const [editKapasitasFT, setEditKapasitasFT] = useState<number>(
    periodBalance.kapasitasFuelTruck || 5000
  );
  const [editOliBalance, setEditOliBalance] = useState<Record<string, number>>(
    periodBalance.sisaPeriodeLaluOli || {}
  );
  const [balanceSavedMsg, setBalanceSavedMsg] = useState('');

  // Sinkronisasi modal state saat periodBalance berubah
  React.useEffect(() => {
    setEditFuelTangki(periodBalance.sisaPeriodeLaluFuelTangki || 0);
    setEditFuelFT(periodBalance.sisaPeriodeLaluFuelFT || 0);
    setEditKapasitasTangkiUtama(periodBalance.kapasitasTangkiUtama || 20000);
    setEditKapasitasFT(periodBalance.kapasitasFuelTruck || 5000);
    setEditOliBalance(periodBalance.sisaPeriodeLaluOli || {});
  }, [periodBalance]);

  // Kalkulasi Stok & Kapasitas Real-Time
  const computation = useMemo(() => {
    return calculateInventoryStockLevels(
      periodBalance,
      fuelStockInputs,
      fuelTransfers,
      oilStockInputs,
      fuelDistributions,
      oilDistributions,
      availableOilTypes
    );
  }, [
    periodBalance,
    fuelStockInputs,
    fuelTransfers,
    oilStockInputs,
    fuelDistributions,
    oilDistributions,
    availableOilTypes,
  ]);

  // Ringkasan Out Field Fuel
  const totalOutFieldLiter = useMemo(() => {
    return outFieldFuelRecords.reduce((acc, r) => acc + (Number(r.jmlLtr) || 0), 0);
  }, [outFieldFuelRecords]);

  const totalOutFieldNominal = useMemo(() => {
    return outFieldFuelRecords.reduce((acc, r) => acc + (Number(r.totalNominal) || 0), 0);
  }, [outFieldFuelRecords]);

  const totalOutFieldCashSopir = useMemo(() => {
    return outFieldFuelRecords.reduce((acc, r) => acc + (Number(r.nominalCashSopir) || 0), 0);
  }, [outFieldFuelRecords]);

  const totalOutFieldSisaCash = useMemo(() => {
    return outFieldFuelRecords.reduce((acc, r) => acc + (Number(r.sisaSelisihCash) || 0), 0);
  }, [outFieldFuelRecords]);

  // Ringkasan Grease
  const totalGreaseStockKg = useMemo(() => {
    return greaseStocks.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  }, [greaseStocks]);

  const totalGreaseDistKg = useMemo(() => {
    return greaseDistributions.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  }, [greaseDistributions]);

  const handleOpenBalanceModal = () => {
    setEditFuelTangki(periodBalance.sisaPeriodeLaluFuelTangki || 0);
    setEditFuelFT(periodBalance.sisaPeriodeLaluFuelFT || 0);
    setEditKapasitasTangkiUtama(periodBalance.kapasitasTangkiUtama || 20000);
    setEditKapasitasFT(periodBalance.kapasitasFuelTruck || 5000);
    setEditOliBalance({ ...(periodBalance.sisaPeriodeLaluOli || {}) });
    setBalanceSavedMsg('');
    setShowBalanceModal(true);
  };

  const handleSaveBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: InventoryPeriodBalance = {
      sisaPeriodeLaluFuelTangki: Number(editFuelTangki) || 0,
      sisaPeriodeLaluFuelFT: Number(editFuelFT) || 0,
      sisaPeriodeLaluOli: { ...editOliBalance },
      kapasitasTangkiUtama: Number(editKapasitasTangkiUtama) > 0 ? Number(editKapasitasTangkiUtama) : 20000,
      kapasitasFuelTruck: Number(editKapasitasFT) > 0 ? Number(editKapasitasFT) : 5000,
    };
    const res = onSavePeriodBalance(updated);
    if (res.success) {
      setBalanceSavedMsg(res.message);
      setTimeout(() => {
        setShowBalanceModal(false);
        setBalanceSavedMsg('');
      }, 1200);
    }
  };

  const handleSaveQuickCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(1, Number(quickCapacityVal) || 20000);
    const updated: InventoryPeriodBalance = {
      ...periodBalance,
      kapasitasTangkiUtama: val,
    };
    const res = onSavePeriodBalance(updated);
    if (res.success) {
      setShowQuickCapacityModal(false);
    }
  };

  // Definisi Lengkap Sub-Modul yang dikelompokkan dalam Kolom Fuel, Oil, Grease, dan Suplier
  const allSubModuleTabs = [
    // KOLOM FUEL (Bahan Bakar Solar)
    {
      id: 'out_field_fuel' as const,
      category: 'FUEL' as const,
      label: 'Out Field Fuel Used (SPBU Luar)',
      sublabel: 'Pengisian SPBU Luar & Ritase Job',
      categoryLabel: 'KOLOM FUEL',
      icon: Fuel,
      count: outFieldFuelRecords.length,
      isPrimary: true,
      color: 'hover:text-amber-400',
      activeColor: 'bg-amber-500 text-stone-950 shadow-amber-500/30',
      badge: 'SPBU Luar',
    },
    {
      id: 'fuel_stock' as const,
      category: 'FUEL' as const,
      label: 'Input Stock (Fuel)',
      sublabel: 'Penerimaan Tangki Utama Solar',
      categoryLabel: 'KOLOM FUEL',
      icon: Fuel,
      count: fuelStockInputs.length,
      color: 'hover:text-amber-400',
      activeColor: 'bg-amber-500 text-stone-950 shadow-amber-500/20',
      badge: 'Tangki Utama',
    },
    {
      id: 'fuel_transfer' as const,
      category: 'FUEL' as const,
      label: 'Transfer Fuel (Tangki-FT)',
      sublabel: 'Penyaluran ke FT-01',
      categoryLabel: 'KOLOM FUEL',
      icon: ArrowRightLeft,
      count: fuelTransfers.length,
      color: 'hover:text-blue-400',
      activeColor: 'bg-blue-500 text-stone-950 shadow-blue-500/20',
      badge: 'Transfer FT',
    },
    {
      id: 'fuel_dist' as const,
      category: 'FUEL' as const,
      label: 'Distribution Fuel',
      sublabel: 'Dispensing Unit Alat Quarry',
      categoryLabel: 'KOLOM FUEL',
      icon: Flame,
      count: fuelDistributions.length,
      color: 'hover:text-orange-400',
      activeColor: 'bg-orange-500 text-stone-950 shadow-orange-500/20',
      badge: 'Dispensing Unit',
    },

    // KOLOM OIL (Pelumas & Oli)
    {
      id: 'oil_stock' as const,
      category: 'OIL' as const,
      label: 'Input Stock Oli',
      sublabel: 'Penerimaan Gudang Pelumas',
      categoryLabel: 'KOLOM OIL',
      icon: Droplet,
      count: oilStockInputs.length,
      color: 'hover:text-emerald-400',
      activeColor: 'bg-emerald-500 text-stone-950 shadow-emerald-500/20',
      badge: 'Stok Gudang',
    },
    {
      id: 'oil_dist' as const,
      category: 'OIL' as const,
      label: 'Distribution Oli',
      sublabel: 'Perbaikan & Servis Mekanik',
      categoryLabel: 'KOLOM OIL',
      icon: Wrench,
      count: oilDistributions.length,
      color: 'hover:text-emerald-400',
      activeColor: 'bg-emerald-500 text-stone-950 shadow-emerald-500/20',
      badge: 'Pemakaian Unit',
    },

    // KOLOM GREASE (Gemuk Pelumas Padat)
    {
      id: 'grease' as const,
      category: 'GREASE' as const,
      label: 'Manajemen Grease (Gemuk)',
      sublabel: 'Stok Drum & Bon Pelumasan',
      categoryLabel: 'KOLOM GREASE',
      icon: Package,
      count: greaseDistributions.length + greaseStocks.length,
      color: 'hover:text-yellow-400',
      activeColor: 'bg-yellow-500 text-stone-950 shadow-yellow-500/20',
      badge: 'Greasing Fleet',
    },

    // KOLOM SUPLIER / VENDOR
    {
      id: 'supplier' as const,
      category: 'SUPPLIER' as const,
      label: 'Data Suplier & Vendor',
      sublabel: 'Mitra Pengadaan FOG',
      categoryLabel: 'DATA SUPLIER',
      icon: Building2,
      count: suppliers.length,
      color: 'hover:text-purple-400',
      activeColor: 'bg-purple-500 text-stone-950 shadow-purple-500/20',
      badge: 'Mitra Vendor',
    },
  ];

  // Filter Sub-Modul sesuai Kategori / Kolom yang dipilih
  const filteredSubModules = useMemo(() => {
    if (selectedCategory === 'ALL') return allSubModuleTabs;
    return allSubModuleTabs.filter((t) => t.category === selectedCategory);
  }, [allSubModuleTabs, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Top Back to Main Menu */}
      {onBackToMainMenu && (
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-menu-modul4"
            type="button"
            onClick={onBackToMainMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Kembali ke Menu Utama</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500">
            Modul 4: FOG (Fuel, Oil & Grease) • Terorganisir Sesuai Kolom
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 REAL-TIME CATEGORY COLUMNS OVERVIEW CARDS: FUEL, OIL & GREASE */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Background Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Title & Sisa Periode Button */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase flex items-center gap-2">
                    <span>MODUL 4: FOG (FUEL, OIL & GREASE)</span>
                  </h1>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Monitoring Stok Real-Time & Pengeluaran Bahan Bakar, Pelumas, Gemuk serta SPBU Luar Quarry Purwosari.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenBalanceModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 text-xs font-semibold shadow-sm transition active:scale-95"
                title="Atur Sisa Periode Sebelumnya & Kapasitas Manual Tangki Solar"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Kalibrasi Saldo & Kapasitas Tangki</span>
              </button>
            </div>
          </div>

          {/* 3 Real-time Inventory Gauge Cards: FUEL, OIL, GREASE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: KOLOM FUEL (Solar: Tangki Utama + FT-01 + SPBU Luar) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                        KOLOM FUEL (SOLAR)
                      </span>
                      <span className="block text-[10px] text-amber-400 font-mono">Tangki & SPBU Luar</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {computation.tangkiUtama.persentase}% Level
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl sm:text-2xl font-black font-mono text-stone-100">
                      {(computation?.tangkiUtama?.stokAkhir ?? 0).toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-stone-400 ml-1">Ltr</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1.5">
                      <span>Kapasitas: <strong className="text-stone-200 font-bold">{(computation?.tangkiUtama?.kapasitasMaksimal ?? 20000).toLocaleString('id-ID')}</strong> Ltr</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCapacityVal(computation?.tangkiUtama?.kapasitasMaksimal || 20000);
                          setShowQuickCapacityModal(true);
                        }}
                        className="px-1.5 py-0.5 rounded bg-stone-800/90 hover:bg-amber-500/20 text-stone-400 hover:text-amber-300 border border-stone-700/60 transition inline-flex items-center gap-1 text-[10px] font-sans"
                        title="Ubah Kapasitas Tangki Solar Utama Manual"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Ubah</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Bar Gauge */}
                  <div className="w-full bg-stone-800 h-2.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (computation?.tangkiUtama?.persentase ?? 0) > 60
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                          : (computation?.tangkiUtama?.persentase ?? 0) > 25
                          ? 'bg-amber-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${computation?.tangkiUtama?.persentase ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Sub info FT & Out Field Fuel */}
                <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Fuel Truck (FT-01):</span>
                    <span className="text-blue-400 font-semibold">{(computation?.fuelTruck?.stokAkhir ?? 0).toLocaleString('id-ID')} Ltr</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-stone-800/50">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      SPBU Luar:
                    </span>
                    <span className="text-amber-400 font-bold">
                      {totalOutFieldLiter.toLocaleString('id-ID')} Ltr (Rp {totalOutFieldNominal.toLocaleString('id-ID')})
                    </span>
                  </div>
                  {outFieldFuelRecords.length > 0 && (
                    <div className="flex justify-between text-[10px] text-stone-400 pt-0.5">
                      <span>Cash Sopir / Sisa:</span>
                      <span className={totalOutFieldSisaCash >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        Rp {totalOutFieldCashSopir.toLocaleString('id-ID')} / {totalOutFieldSisaCash >= 0 ? '+' : ''}Rp {totalOutFieldSisaCash.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Jump Button to Out Field Fuel */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('FUEL');
                  setActiveSubModule('out_field_fuel');
                }}
                className="mt-3 w-full py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <span>⛽ Buka Sub Modul Out Field Fuel (SPBU Luar)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 2: KOLOM OIL (Pelumas & Oli Mesin/Hydraulic) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Droplet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                        KOLOM OIL (PELUMAS)
                      </span>
                      <span className="block text-[10px] text-emerald-400 font-mono">Gudang & Pemakaian</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {(computation?.totalOliLiters ?? 0).toLocaleString('id-ID')} Ltr
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-mono font-semibold text-stone-300 mb-1">
                    Stok per Jenis Pelumas:
                  </div>

                  {/* List mini stok per jenis oli */}
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {computation?.oliPerJenis && Object.entries(computation.oliPerJenis).slice(0, 4).map(([oilName, data]: [string, any]) => (
                      <div key={oilName} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-400 truncate max-w-[150px]">{oilName}:</span>
                        <span className={`font-bold ${(data?.stokAkhir ?? 0) > 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {(data?.stokAkhir ?? 0).toLocaleString('id-ID')} Ltr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                <span className="text-[11px] text-stone-400 font-mono">Total Bon Oli:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{oilDistributions.length} Bon Terbit</span>
              </div>
            </div>

            {/* Card 3: KOLOM GREASE (Gemuk Pelumas Padat) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-400" />
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                        KOLOM GREASE (GEMUK)
                      </span>
                      <span className="block text-[10px] text-yellow-400 font-mono">Chassis & Bucket Pin</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                    {totalGreaseStockKg} Kg Total
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Total Stok Masuk:</span>
                      <span className="text-stone-200 font-bold">{totalGreaseStockKg} Kg ({greaseStocks.length} Batch)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Pemakaian Greasing:</span>
                      <span className="text-amber-400 font-bold">{totalGreaseDistKg} Kg ({greaseDistributions.length} Bon)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Mencakup varian Chassis EP-2, MP-3, Lithium Complex untuk link arm excavator & loader.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('GREASE');
                  setActiveSubModule('grease');
                }}
                className="mt-3 w-full py-1.5 px-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <span>🧈 Buka Manajemen Grease</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER KOLOM UTAMA: FUEL, OIL, GREASE & DATA SUPLIER */}
      {/* ========================================================================= */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold px-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>PILIH KOLOM:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
            }`}
          >
            Semua Sub-Modul (8)
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('FUEL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'FUEL'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-900 text-amber-400 hover:text-amber-300 border border-stone-800'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>KOLOM FUEL (4)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('OIL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'OIL'
                ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                : 'bg-stone-900 text-emerald-400 hover:text-emerald-300 border border-stone-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>KOLOM OIL (2)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('GREASE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'GREASE'
                ? 'bg-yellow-500 text-stone-950 shadow-md shadow-yellow-500/20'
                : 'bg-stone-900 text-yellow-400 hover:text-yellow-300 border border-stone-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>KOLOM GREASE (1)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('SUPPLIER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'SUPPLIER'
                ? 'bg-purple-500 text-stone-950 shadow-md shadow-purple-500/20'
                : 'bg-stone-900 text-purple-400 hover:text-purple-300 border border-stone-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>DATA SUPLIER (1)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-stone-500 px-2">
          Aktif: <strong className="text-amber-400">{allSubModuleTabs.find(t => t.id === activeSubModule)?.label}</strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB MODUL NAVIGATION TABS SESUAI KOLOM */}
      {/* Termasuk Out Field Fuel Used (SPBU Luar) & Grease */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {filteredSubModules.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubModule === tab.id;
          return (
            <button
              id={`tab-submodule-${tab.id}`}
              key={tab.id}
              type="button"
              onClick={() => setActiveSubModule(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono tracking-tight transition-all duration-200 shrink-0 border relative ${
                isActive
                  ? `${tab.activeColor} border-transparent shadow-xl scale-105 z-10`
                  : 'bg-stone-900/90 hover:bg-stone-800/90 text-stone-300 border-stone-800 hover:border-stone-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="leading-tight">{tab.label}</span>
                  {tab.isPrimary && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-400 text-stone-950 rounded">
                      SPBU Luar
                    </span>
                  )}
                </div>
                <div className={`text-[10px] font-normal ${isActive ? 'text-stone-900 font-semibold' : 'text-stone-500'}`}>
                  {tab.sublabel} ({tab.count})
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUB MODUL CONTENT SWITCHER */}
      {/* ========================================================================= */}
      <div className="min-h-[500px]">
        {/* 1. OUT FIELD FUEL USED (SPBU LUAR) */}
        {activeSubModule === 'out_field_fuel' && (
          <OutFieldFuelSubView
            units={units}
            manpowerList={manpowerList}
            outFieldFuelRecords={outFieldFuelRecords}
            currentUser={currentUser}
            onSaveRecord={onSaveOutFieldFuelRecord}
            onDeleteRecord={onDeleteOutFieldFuelRecord}
            standardSolarPrice={standardSolarPrice}
            onUpdateSolarPrice={onUpdateSolarPrice}
          />
        )}

        {/* 2. INPUT STOCK (FUEL TANGKI UTAMA) */}
        {activeSubModule === 'fuel_stock' && (
          <FuelStockInputSubView
            fuelStockInputs={fuelStockInputs}
            suppliers={suppliers}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelStockInput}
            onDelete={onDeleteFuelStockInput}
          />
        )}

        {/* 3. TRANSFER FUEL (TANGKI KE FT-01) */}
        {activeSubModule === 'fuel_transfer' && (
          <FuelTransferSubView
            fuelTransfers={fuelTransfers}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelTransfer}
            onDelete={onDeleteFuelTransfer}
          />
        )}

        {/* 4. DISTRIBUTION FUEL (DISPENSING UNIT ALAT) */}
        {activeSubModule === 'fuel_dist' && (
          <FuelDistributionSubView
            fuelDistributions={fuelDistributions}
            equipmentList={units}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelDistribution}
            onDelete={onDeleteFuelDistribution}
          />
        )}

        {/* 5. INPUT STOCK OLI (GUDANG) */}
        {activeSubModule === 'oil_stock' && (
          <OilStockInputSubView
            oilStockInputs={oilStockInputs}
            suppliers={suppliers}
            manpowerList={manpowerList}
            availableOilTypes={availableOilTypes}
            currentUser={currentUser}
            onSave={onSaveOilStockInput}
            onDelete={onDeleteOilStockInput}
            onAddCustomOilType={onAddCustomOilType}
          />
        )}

        {/* 6. DISTRIBUTION OLI (MEKANIK & SERVIS) */}
        {activeSubModule === 'oil_dist' && (
          <OilDistributionSubView
            oilDistributions={oilDistributions}
            equipmentList={units}
            manpowerList={manpowerList}
            availableOilTypes={availableOilTypes}
            currentUser={currentUser}
            onSave={onSaveOilDistribution}
            onDelete={onDeleteOilDistribution}
          />
        )}

        {/* 7. MANAJEMEN GREASE (GEMUK PELUMAS) */}
        {activeSubModule === 'grease' && (
          <GreaseSubView
            units={units}
            manpowerList={manpowerList}
            suppliers={suppliers}
            greaseStocks={greaseStocks}
            greaseDistributions={greaseDistributions}
            currentUser={currentUser}
            onSaveStock={onSaveGreaseStock}
            onDeleteStock={onDeleteGreaseStock}
            onSaveDistribution={onSaveGreaseDistribution}
            onDeleteDistribution={onDeleteGreaseDistribution}
          />
        )}

        {/* 8. DATA SUPLIER & VENDOR MITRA */}
        {activeSubModule === 'supplier' && (
          <SupplierSubView
            suppliers={suppliers}
            currentUser={currentUser}
            onSave={onSaveSupplier}
            onDelete={onDeleteSupplier}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: KALIBRASI SISA PERIODE & KONFIGURASI MANUAL KAPASITAS TANGKI */}
      {/* ========================================================================= */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Kalibrasi Saldo Periode Lalu & Kapasitas Tangki
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBalanceModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBalanceSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {balanceSavedMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{balanceSavedMsg}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* BAGIAN A: KONFIGURASI MANUAL KAPASITAS TANGKI UTAMA & FT */}
              {/* ========================================================= */}
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-black font-mono text-xs">
                    <Fuel className="w-4 h-4" />
                    <span>A. KAPASITAS MANUAL TANGKI SOLAR UTAMA</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Bisa Diubah Manual
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Kapasitas ini dibuat manual agar fleksibel disesuaikan saat <strong>penggantian unit tangki solar baru</strong> di lapangan. Persentase gauge level stok otomatis menyesuaikan dengan kapasitas baru ini.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-stone-200 font-bold font-mono text-[11px]">
                    Kapasitas Maksimal Tangki Solar Utama (Liter):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={editKapasitasTangkiUtama}
                      onChange={(e) => setEditKapasitasTangkiUtama(Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-stone-400 font-mono text-xs">Liter</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-stone-200 font-bold font-mono text-[11px]">
                    Kapasitas Maksimal Armada Fuel Truck (FT-01) (Liter):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={editKapasitasFT}
                      onChange={(e) => setEditKapasitasFT(Number(e.target.value))}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-stone-400 font-mono text-xs">Liter</span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* BAGIAN B: SISA PERIODE SEBELUMNYA (FUEL) */}
              {/* ========================================================= */}
              <div className="p-4 bg-stone-950/60 rounded-2xl border border-stone-800 space-y-3">
                <div className="text-amber-400 font-black font-mono text-xs flex items-center gap-2">
                  <Fuel className="w-4 h-4" />
                  <span>B. SISA PERIODE SEBELUMNYA (FUEL SOLAR)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-400 text-[11px] mb-1">
                      Tangki Utama Solar (Ltr)
                    </label>
                    <input
                      type="number"
                      value={editFuelTangki}
                      onChange={(e) => setEditFuelTangki(Number(e.target.value))}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 text-[11px] mb-1">
                      Fuel Truck FT-01 (Ltr)
                    </label>
                    <input
                      type="number"
                      value={editFuelFT}
                      onChange={(e) => setEditFuelFT(Number(e.target.value))}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* BAGIAN C: SISA PERIODE SEBELUMNYA (OLI & PELUMAS) */}
              {/* ========================================================= */}
              <div className="p-4 bg-stone-950/60 rounded-2xl border border-stone-800 space-y-3">
                <div className="text-emerald-400 font-black font-mono text-xs flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  <span>C. SISA PERIODE SEBELUMNYA (OLI & PELUMAS)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {Array.from(new Set([...DEFAULT_FOG_NAMA_BARANG, ...availableOilTypes])).map((oilName) => (
                    <div key={oilName}>
                      <label className="block text-stone-400 text-[10px] mb-1 truncate" title={oilName}>
                        {oilName} (Ltr)
                      </label>
                      <input
                        type="number"
                        value={editOliBalance[oilName] ?? 0}
                        onChange={(e) =>
                          setEditOliBalance({
                            ...editOliBalance,
                            [oilName]: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 bg-stone-800"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono transition shadow-lg shadow-amber-500/20"
                >
                  Simpan Kalibrasi & Kapasitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: Ganti Kapasitas Manual Tangki Utama */}
      {showQuickCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-xs font-bold font-mono text-stone-100 uppercase flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <span>Ubah Kapasitas Tangki Solar</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCapacityModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCapacity} className="space-y-3">
              <p className="text-[11px] text-stone-300">
                Ubah kapasitas tangki solar utama jika terjadi pergantian unit tangki di quarry:
              </p>
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Kapasitas Baru (Liter):
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  required
                  value={quickCapacityVal}
                  onChange={(e) => setQuickCapacityVal(Number(e.target.value))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCapacityModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs font-mono"
                >
                  Simpan Kapasitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
