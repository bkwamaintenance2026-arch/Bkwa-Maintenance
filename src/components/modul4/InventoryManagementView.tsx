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
  Warehouse
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

  // Form states untuk kalibrasi Sisa Periode Sebelumnya (Formula: Data Input + Sisa Periode Sebelumnya)
  const [editFuelTangki, setEditFuelTangki] = useState<number>(periodBalance.sisaPeriodeLaluFuelTangki || 0);
  const [editFuelFT, setEditFuelFT] = useState<number>(periodBalance.sisaPeriodeLaluFuelFT || 0);
  const [editOliBalance, setEditOliBalance] = useState<Record<string, number>>(
    periodBalance.sisaPeriodeLaluOli || {}
  );
  const [balanceSavedMsg, setBalanceSavedMsg] = useState('');

  // Sinkronisasi modal state saat periodBalance berubah
  React.useEffect(() => {
    setEditFuelTangki(periodBalance.sisaPeriodeLaluFuelTangki || 0);
    setEditFuelFT(periodBalance.sisaPeriodeLaluFuelFT || 0);
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
                    MODUL 4: INVENTORY MANAGEMENT (FOG & WORKSHOP)
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
                title="Atur Sisa Periode Sebelumnya untuk kalkulasi kapasitas real-time"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Kalibrasi Saldo Periode Lalu</span>
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
                      {computation.tangkiUtama.stokAkhir.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-stone-400 ml-1">Ltr</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-500">
                      Kapasitas: {computation.tangkiUtama.kapasitasMaksimal.toLocaleString('id-ID')} Ltr
                    </div>
                  </div>

                  {/* Visual Bar Gauge */}
                  <div className="w-full bg-stone-800 h-2.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        computation.tangkiUtama.persentase > 60
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                          : computation.tangkiUtama.persentase > 25
                          ? 'bg-amber-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${computation.tangkiUtama.persentase}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Periode Lalu:</span>
                  <span className="text-stone-300 font-semibold">{computation.tangkiUtama.sisaPeriodeLalu.toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Data Input Masuk:</span>
                  <span className="text-emerald-400 font-semibold">+{computation.tangkiUtama.totalMasuk.toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>- Transfer ke FT:</span>
                  <span className="text-rose-400 font-semibold">-{computation.tangkiUtama.totalKeluarKeFT.toLocaleString('id-ID')} Ltr</span>
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
                    {computation.fuelTruck.persentase}%
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl sm:text-2xl font-black font-mono text-stone-100">
                      {computation.fuelTruck.stokAkhir.toLocaleString('id-ID')}
                      <span className="text-xs font-normal text-stone-400 ml-1">Ltr</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-500">
                      Kapasitas: {computation.fuelTruck.kapasitasMaksimal.toLocaleString('id-ID')} Ltr
                    </div>
                  </div>

                  {/* Visual Bar Gauge */}
                  <div className="w-full bg-stone-800 h-2.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        computation.fuelTruck.persentase > 50
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          : computation.fuelTruck.persentase > 20
                          ? 'bg-blue-500'
                          : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${computation.fuelTruck.persentase}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Periode Lalu FT:</span>
                  <span className="text-stone-300 font-semibold">{computation.fuelTruck.sisaPeriodeLalu.toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Transfer Masuk Tangki:</span>
                  <span className="text-cyan-400 font-semibold">+{computation.fuelTruck.totalTransferMasuk.toLocaleString('id-ID')} Ltr</span>
                </div>
                <div className="flex justify-between">
                  <span>- Distribusi Bon Unit:</span>
                  <span className="text-orange-400 font-semibold">-{computation.fuelTruck.totalDistribusiUnit.toLocaleString('id-ID')} Ltr</span>
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
                    {computation.totalOliLiters.toLocaleString('id-ID')} Ltr
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-mono font-semibold text-stone-300 mb-1">
                    Stok per Jenis Pelumas:
                  </div>

                  {/* List mini stok per jenis oli */}
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {Object.entries(computation.oliPerJenis).slice(0, 4).map(([oilName, data]: [string, any]) => (
                      <div key={oilName} className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-400 truncate max-w-[150px]">{oilName}:</span>
                        <span className={`font-bold ${data.stokAkhir > 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {data.stokAkhir.toLocaleString('id-ID')} Ltr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rincian Rumus */}
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[10.5px] font-mono text-stone-400 flex justify-between items-center">
                <span>Total Pelumas Siap Pakai:</span>
                <span className="text-emerald-400 font-bold text-xs">{computation.totalOliLiters.toLocaleString('id-ID')} Ltr</span>
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
      {/* MODAL: KALIBRASI SISA PERIODE SEBELUMNYA */}
      {/* Rumus: Kapasitas dihitung dari (Data Input + Sisa Periode Sebelumnya) */}
      {/* ========================================================================= */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Kalibrasi Sisa Periode Sebelumnya (Saldo Awal)
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

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-stone-300 text-xs flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-400">Aturan Perhitungan Kapasitas:</span>
                  <p className="mt-0.5 text-stone-400">
                    Sesuai instruksi, kapasitas & level stok Fuel dan Oli ditentukan dari formula:
                    <br />
                    <span className="font-mono text-stone-200 font-semibold">
                      Level Stok = (Data Input Baru + Sisa Periode Sebelumnya) - Pengeluaran
                    </span>
                  </p>
                </div>
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
                  placeholder="Contoh: 12000"
                />
                <span className="text-[10px] text-stone-500">
                  Saldo fisik solar di tangki timbun utama dari penutupan buku periode lalu.
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
                  placeholder="Contoh: 2500"
                />
                <span className="text-[10px] text-stone-500">
                  Saldo solar yang masih tersisa di dalam tangki Fuel Truck dari shift/periode sebelumnya.
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
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Simpan Kalibrasi Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
