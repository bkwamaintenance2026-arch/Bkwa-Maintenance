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
  DEFAULT_FOG_NAMA_BARANG
} from '../../types';
import { SupplierSubView } from './SupplierSubView';
import { FuelStockInputSubView } from './FuelStockInputSubView';
import { FuelTransferSubView } from './FuelTransferSubView';
import { OilStockInputSubView } from './OilStockInputSubView';
import { FuelDistributionSubView } from './FuelDistributionSubView';
import { OilDistributionSubView } from './OilDistributionSubView';
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
  Pencil
} from 'lucide-react';

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
  // 6 Sub-Modul Navigasi:
  // 1 = Data Suplier
  // 2 = Input Stock (FUEL)
  // 3 = Data Transfer Fuel (Tangki-FT)
  // 4 = Input Stock Oli
  // 5 = Distribution Fuel
  // 6 = Distribution Oli
  const [activeSubModule, setActiveSubModule] = useState<1 | 2 | 3 | 4 | 5 | 6>(2);
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
  // Logic: "nah untuk menentukan kapasitas (Fuel & Oli) ambil dari Data Input ditambah sisa periode sebelum nya."
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

  const subModuleTabs = [
    {
      id: 1 as const,
      label: '1. Data Suplier',
      sublabel: 'Mitra & Vendor',
      icon: Building2,
      count: suppliers.length,
      color: 'hover:text-amber-400',
      activeColor: 'bg-amber-500 text-stone-950 shadow-amber-500/20',
    },
    {
      id: 2 as const,
      label: '2. Input Stock (Fuel)',
      sublabel: 'Tangki Utama Solar',
      icon: Fuel,
      count: fuelStockInputs.length,
      color: 'hover:text-amber-400',
      activeColor: 'bg-amber-500 text-stone-950 shadow-amber-500/20',
    },
    {
      id: 3 as const,
      label: '3. Transfer Fuel (Tangki-FT)',
      sublabel: 'Penyaluran ke FT-01',
      icon: ArrowRightLeft,
      count: fuelTransfers.length,
      color: 'hover:text-blue-400',
      activeColor: 'bg-blue-500 text-stone-950 shadow-blue-500/20',
    },
    {
      id: 4 as const,
      label: '4. Input Stock Oli',
      sublabel: 'Penerimaan Gudang',
      icon: Droplet,
      count: oilStockInputs.length,
      color: 'hover:text-emerald-400',
      activeColor: 'bg-emerald-500 text-stone-950 shadow-emerald-500/20',
    },
    {
      id: 5 as const,
      label: '5. Distribution Fuel',
      sublabel: 'Dispensing Unit Alat',
      icon: Flame,
      count: fuelDistributions.length,
      color: 'hover:text-orange-400',
      activeColor: 'bg-orange-500 text-stone-950 shadow-orange-500/20',
    },
    {
      id: 6 as const,
      label: '6. Distribution Oli',
      sublabel: 'Perbaikan & Mekanik',
      icon: Wrench,
      count: oilDistributions.length,
      color: 'hover:text-amber-400',
      activeColor: 'bg-amber-500 text-stone-950 shadow-amber-500/20',
    },
  ];

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
            Modul 4: Inventory Management (FOG & Workshop)
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER: REAL-TIME INVENTORY GAUGES & STOCK CAPACITY CALCULATION */}
      {/* Rule: Kapasitas dihitung dari (Data Input + Sisa Periode Sebelumnya) */}
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
                  <h1 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                    MODUL 4: FOG (FUEL, OIL & GREASE)
                  </h1>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Monitoring Stok Real-Time Fuel (Solar) & Oli Pelumas Quarry Purwosari • Rumus: <span className="text-amber-400 font-mono font-semibold">Stok = (Data Input + Sisa Periode Sebelumnya) - Pengeluaran</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenBalanceModal}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 text-xs font-semibold shadow-sm transition active:scale-95"
                title="Atur Sisa Periode Sebelumnya & Kapasitas Manual Tangki Solar untuk kalkulasi real-time"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Kalibrasi Saldo & Kapasitas Tangki</span>
              </button>
            </div>
          </div>

          {/* 3 Real-time Inventory Gauge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tangki Utama (Fuel Solar) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                      Tangki Utama Solar
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {computation.tangkiUtama.persentase}%
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
                        title="Ubah Kapasitas Tangki Solar Utama Manual (karena rencana penggantian tangki baru)"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Ubah Manual</span>
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
              </div>

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Periode Lalu:</span>
                  <span className="text-stone-300 font-semibold">{(computation?.tangkiUtama?.sisaPeriodeLalu ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Data Input Masuk:</span>
                  <span className="text-emerald-400 font-semibold">+{(computation?.tangkiUtama?.totalMasuk ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>- Transfer ke FT:</span>
                  <span className="text-rose-400 font-semibold">-{(computation?.tangkiUtama?.totalKeluarKeFT ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
              </div>
            </div>

            {/* Card 2: Fuel Truck (FT-01) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                      Fuel Truck (FT-01)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {computation?.fuelTruck?.persentase ?? 0}%
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl sm:text-2xl font-black font-mono text-stone-100">
                      {(computation?.fuelTruck?.stokAkhir ?? 0).toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-stone-400 ml-1">Ltr</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-500">
                      Kapasitas: {(computation?.fuelTruck?.kapasitasMaksimal ?? 0).toLocaleString('id-ID')} Ltr
                    </div>
                  </div>

                  {/* Visual Bar Gauge */}
                  <div className="w-full bg-stone-800 h-2.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (computation?.fuelTruck?.persentase ?? 0) > 50
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          : (computation?.fuelTruck?.persentase ?? 0) > 20
                          ? 'bg-blue-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${computation?.fuelTruck?.persentase ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Periode Lalu FT:</span>
                  <span className="text-stone-300 font-semibold">{(computation?.fuelTruck?.sisaPeriodeLalu ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Transfer Masuk Tangki:</span>
                  <span className="text-cyan-400 font-semibold">+{(computation?.fuelTruck?.totalTransferMasuk ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>- Distribusi Bon Unit:</span>
                  <span className="text-orange-400 font-semibold">-{(computation?.fuelTruck?.totalDistribusiUnit ?? 0).toLocaleString('id-ID')} Ltr</span>
                </div>
              </div>
            </div>

            {/* Card 3: Gudang Oli & Pelumas (Semua Varian) */}
            <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Droplet className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold font-mono text-stone-200 uppercase">
                      Gudang Oli & Pelumas
                    </span>
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

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 flex justify-between items-center">
                <span>Total Pelumas Siap Pakai:</span>
                <span className="text-emerald-400 font-bold text-xs">{(computation?.totalOliLiters ?? 0).toLocaleString('id-ID')} Ltr</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 SUB MODUL TABS NAVIGATION */}
      {/* 1. Data Suplier */}
      {/* 2. Input Stock (FUEL) */}
      {/* 3. Data Transfer Fuel (Tangki-FT) */}
      {/* 4. Input STock Oli */}
      {/* 5. Distribution Fuel */}
      {/* 6. Distribution Oli */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {subModuleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubModule === tab.id;
          return (
            <button
              id={`tab-submodule-${tab.id}`}
              key={tab.id}
              type="button"
              onClick={() => setActiveSubModule(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono tracking-tight transition-all duration-200 shrink-0 border ${
                isActive
                  ? `${tab.activeColor} border-transparent shadow-lg scale-105`
                  : 'bg-stone-900/80 hover:bg-stone-800/90 text-stone-300 border-stone-800/90 hover:border-stone-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <div className="text-left">
                <div className="leading-tight">{tab.label}</div>
                <div className={`text-[10px] font-normal ${isActive ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>
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
        {activeSubModule === 1 && (
          <SupplierSubView
            suppliers={suppliers}
            currentUser={currentUser}
            onSave={onSaveSupplier}
            onDelete={onDeleteSupplier}
          />
        )}

        {activeSubModule === 2 && (
          <FuelStockInputSubView
            fuelStockInputs={fuelStockInputs}
            suppliers={suppliers}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelStockInput}
            onDelete={onDeleteFuelStockInput}
          />
        )}

        {activeSubModule === 3 && (
          <FuelTransferSubView
            fuelTransfers={fuelTransfers}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelTransfer}
            onDelete={onDeleteFuelTransfer}
          />
        )}

        {activeSubModule === 4 && (
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

        {activeSubModule === 5 && (
          <FuelDistributionSubView
            fuelDistributions={fuelDistributions}
            equipmentList={units}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSave={onSaveFuelDistribution}
            onDelete={onDeleteFuelDistribution}
          />
        )}

        {activeSubModule === 6 && (
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
                      required
                      min={1}
                      value={editKapasitasTangkiUtama}
                      onChange={(e) => setEditKapasitasTangkiUtama(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-950 border border-amber-500/50 rounded-xl text-stone-100 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="Contoh: 15000, 20000, 30000"
                    />
                    <span className="absolute right-3 top-2 text-stone-500 font-mono">
                      Liter
                    </span>
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-400 mr-1">Pilihan Cepat:</span>
                    {[10000, 15000, 20000, 25000, 30000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditKapasitasTangkiUtama(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                          editKapasitasTangkiUtama === preset
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                            : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                        }`}
                      >
                        {(preset / 1000)}k L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kapasitas Fuel Truck */}
                <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                  <label className="block text-stone-200 font-bold font-mono text-[11px] text-blue-400">
                    Kapasitas Armada Fuel Truck FT-01 (Liter):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      value={editKapasitasFT}
                      onChange={(e) => setEditKapasitasFT(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-950 border border-blue-500/40 rounded-xl text-stone-100 font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Contoh: 5000"
                    />
                    <span className="absolute right-3 top-2 text-stone-500 font-mono">
                      Liter
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* BAGIAN B: SISA PERIODE SEBELUMNYA (SALDO AWAL) */}
              {/* ========================================================= */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-2 text-stone-300 font-mono font-bold text-xs uppercase">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  <span>B. Sisa Periode Sebelumnya (Saldo Awal)</span>
                </div>

                {/* Input Sisa Periode Tangki Utama */}
                <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 space-y-2">
                  <label className="block text-stone-200 font-bold font-mono uppercase text-[11px] text-amber-400">
                    1. Sisa Periode Lalu Fuel Tangki Utama (Liter)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editFuelTangki}
                    onChange={(e) => setEditFuelTangki(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-sm focus:outline-none focus:border-amber-500/60"
                    placeholder="Contoh: 0 atau 12000"
                  />
                  <span className="text-[10px] text-stone-500">
                    Saldo fisik solar di tangki timbun utama dari penutupan buku periode sebelumnya.
                  </span>
                </div>

                {/* Input Sisa Periode Fuel Truck FT-01 */}
                <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 space-y-2">
                  <label className="block text-stone-200 font-bold font-mono uppercase text-[11px] text-blue-400">
                    2. Sisa Periode Lalu Fuel Truck FT-01 (Liter)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editFuelFT}
                    onChange={(e) => setEditFuelFT(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-sm focus:outline-none focus:border-blue-500/60"
                    placeholder="Contoh: 0 atau 2500"
                  />
                  <span className="text-[10px] text-stone-500">
                    Saldo solar yang masih tersisa di dalam tangki armada Fuel Truck dari shift/periode sebelumnya.
                  </span>
                </div>

                {/* Input Sisa Periode Oli per Varian */}
                <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 space-y-3">
                  <label className="block text-stone-200 font-bold font-mono uppercase text-[11px] text-emerald-400">
                    3. Sisa Periode Lalu Oli & Pelumas Gudang (Liter)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableOilTypes.map((oilName) => (
                      <div key={oilName} className="flex items-center justify-between gap-3 bg-stone-900/60 p-2 rounded-lg border border-stone-800/80">
                        <span className="text-xs font-mono font-semibold text-stone-300 truncate max-w-[200px]">
                          {oilName}
                        </span>
                        <div className="flex items-center gap-1.5 w-32">
                          <input
                            type="number"
                            min={0}
                            value={editOliBalance[oilName] ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditOliBalance((prev) => ({
                                ...prev,
                                [oilName]: val,
                              }));
                            }}
                            className="w-full px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 font-mono font-bold text-xs text-right focus:outline-none focus:border-emerald-500/60"
                          />
                          <span className="text-[10px] text-stone-500 font-mono">Ltr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  Simpan Konfigurasi & Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MODAL: UBAH MANUAL KAPASITAS TANGKI SOLAR UTAMA (LANGSUNG DARI CARD) */}
      {/* ========================================================================= */}
      {showQuickCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Ubah Kapasitas Tangki Solar Utama
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCapacityModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCapacity} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-stone-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-[11px]">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>KAPASITAS MANUAL (PENGGANTIAN TANGKI)</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Masukkan volume total kapasitas maksimal tangki solar baru Anda. Sistem akan langsung memperbarui kalkulasi persentase (%) dan batas daya tampung solar utama.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-stone-200 font-bold font-mono text-[11px]">
                  Kapasitas Maksimal Tangki Baru (Liter)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={quickCapacityVal}
                    onChange={(e) => setQuickCapacityVal(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-stone-950 border border-amber-500/50 rounded-xl text-stone-100 font-mono font-black text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Contoh: 15000, 20000, 30000"
                    autoFocus
                  />
                  <span className="absolute right-3 top-3 text-stone-500 font-mono font-semibold">
                    Liter
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="text-[10px] text-stone-400 py-0.5">Pilihan:</span>
                  {[10000, 15000, 20000, 25000, 30000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickCapacityVal(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition ${
                        quickCapacityVal === preset
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                      }`}
                    >
                      {(preset / 1000)}k L
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowQuickCapacityModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  Simpan Kapasitas Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
