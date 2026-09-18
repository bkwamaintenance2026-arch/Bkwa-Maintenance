import React, { useState, useEffect } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  ManpowerData, 
  ModuleInfo, 
  UserAccount,
  SupplierRecord,
  FuelStockInputRecord,
  FuelTransferRecord,
  OilStockInputRecord,
  FuelDistributionRecord,
  OilDistributionRecord,
  InventoryPeriodBalance,
} from './types';
import { 
  getCurrentUser, 
  setCurrentUser, 
  getAllUnits, 
  registerUnit, 
  updateUnit, 
  deleteUnit,
  getAllManpower,
  registerManpower,
  updateManpower,
  deleteManpower,
  getAllBreakdowns,
  registerBreakdown,
  updateBreakdownActivity,
  deleteBreakdown,
  getAllSuppliers,
  addOrUpdateSupplier,
  deleteSupplier,
  getAllFuelStockInputs,
  addOrUpdateFuelStockInput,
  deleteFuelStockInput,
  getAllFuelTransfers,
  addOrUpdateFuelTransfer,
  deleteFuelTransfer,
  getAllOilStockInputs,
  addOrUpdateOilStockInput,
  deleteOilStockInput,
  getAllFuelDistributions,
  addOrUpdateFuelDistribution,
  deleteFuelDistribution,
  getAllOilDistributions,
  addOrUpdateOilDistribution,
  deleteOilDistribution,
  getInventoryPeriodBalance,
  saveInventoryPeriodBalance,
  getAvailableOilTypes,
  addCustomOilType,
} from './utils/storage';
import { INITIAL_MODULES } from './data/mockUnits';
import { Navbar } from './components/Navbar';
import { ModuleTabs } from './components/ModuleTabs';
import { AssetRegistrationView } from './components/modul1/AssetRegistrationView';
import { ManpowerView } from './components/modul2/ManpowerView';
import { MaintenanceDatabaseView } from './components/modul3/MaintenanceDatabaseView';
import { InventoryManagementView } from './components/modul4/InventoryManagementView';
import { LoginModal } from './components/LoginModal';
import { BkwaLogo } from './components/BkwaLogo';

export default function App() {
  const [currentUser, setLocalCurrentUser] = useState<UserAccount | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<number>(1);
  const [modules] = useState<ModuleInfo[]>(INITIAL_MODULES);
  
  // Asset units list (Modul 1)
  const [units, setUnits] = useState<AssetUnit[]>([]);

  // Manpower list (Modul 2)
  const [manpowerList, setManpowerList] = useState<ManpowerData[]>([]);

  // Breakdown records (Modul 3)
  const [breakdowns, setBreakdowns] = useState<BreakdownRecord[]>([]);

  // Modul 4: Inventory Management Sub-Modules State
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [fuelStockInputs, setFuelStockInputs] = useState<FuelStockInputRecord[]>([]);
  const [fuelTransfers, setFuelTransfers] = useState<FuelTransferRecord[]>([]);
  const [oilStockInputs, setOilStockInputs] = useState<OilStockInputRecord[]>([]);
  const [fuelDistributions, setFuelDistributions] = useState<FuelDistributionRecord[]>([]);
  const [oilDistributions, setOilDistributions] = useState<OilDistributionRecord[]>([]);
  const [periodBalance, setPeriodBalance] = useState<InventoryPeriodBalance>({
    sisaPeriodeLaluFuelTangki: 12000,
    sisaPeriodeLaluFuelFT: 2500,
    sisaPeriodeLaluOli: {}
  });
  const [availableOilTypes, setAvailableOilTypes] = useState<string[]>([]);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Initial load
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setLocalCurrentUser(user);
    }
    refreshAllData();
  }, []);

  const refreshAllData = () => {
    setUnits(getAllUnits());
    setManpowerList(getAllManpower());
    setBreakdowns(getAllBreakdowns());
    setSuppliers(getAllSuppliers());
    setFuelStockInputs(getAllFuelStockInputs());
    setFuelTransfers(getAllFuelTransfers());
    setOilStockInputs(getAllOilStockInputs());
    setFuelDistributions(getAllFuelDistributions());
    setOilDistributions(getAllOilDistributions());
    setPeriodBalance(getInventoryPeriodBalance());
    setAvailableOilTypes(getAvailableOilTypes());
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setLocalCurrentUser(user);
    refreshAllData();
    const greetingName = user.role === 'ADMIN' ? 'Developer' : (user.fullName || user.username);
    showToast(`Selamat datang, ${greetingName}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalCurrentUser(null);
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Tombol Kembali ke Menu Home / Menu Utama
  const handleGoHome = () => {
    setActiveModuleId(1);
    showToast('Kembali ke Menu Utama (Modul 1: Registrasi Asset)', 'info');
  };

  // =================== MODUL 1: REGISTRASI ASSET ===================
  const handleSaveUnit = (
    data: Omit<AssetUnit, 'id' | 'tanggalRegistrasi' | 'terakhirDiperbarui'>,
    existingId?: string | null
  ) => {
    let res;
    if (existingId) {
      res = updateUnit(existingId, data);
    } else {
      res = registerUnit(data);
    }
    if (res.success) {
      refreshAllData();
    }
    return res;
  };

  const handleDeleteUnit = (id: string) => {
    const role = currentUser?.role || 'KARYAWAN';
    const res = deleteUnit(id, role);
    if (res.success) {
      refreshAllData();
    }
    return res;
  };

  // =================== MODUL 2: DATA MANPOWER ===================
  const handleSaveManpower = (
    data: Omit<ManpowerData, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => {
    let res;
    if (existingId) {
      res = updateManpower(existingId, data);
    } else {
      res = registerManpower(data);
    }
    if (res.success) {
      refreshAllData();
    }
    return res;
  };

  const handleDeleteManpower = (id: string) => {
    const res = deleteManpower(id);
    if (res.success) {
      refreshAllData();
    }
    return res;
  };

  // Modul 3: Breakdown handlers
  const handleSaveBreakdown = (
    data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
  ) => {
    const res = registerBreakdown(data);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleUpdateBreakdownActivity = (
    id: string,
    updateData: {
      startJob?: string;
      detailKerusakan?: string;
      progress?: import('./types').BreakdownProgressOption | string;
      statusUnit?: import('./types').BreakdownStatusUnitOption | string;
      pic1?: string;
      pic2?: string;
      pic3?: string;
      remark?: string;
      partsJasa?: import('./types').BreakdownPartJasaItem[];
    }
  ) => {
    const res = updateBreakdownActivity(id, updateData);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteBreakdown = (id: string) => {
    const res = deleteBreakdown(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // =================== MODUL 4: INVENTORY MANAGEMENT (6 SUB-MODUL) ===================
  // 1. Data Suplier
  const handleSaveSupplier = (
    data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateSupplier(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteSupplier = (id: string) => {
    const res = deleteSupplier(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // 2. Input Stock (Fuel)
  const handleSaveFuelStockInput = (
    data: Omit<FuelStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateFuelStockInput(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteFuelStockInput = (id: string) => {
    const res = deleteFuelStockInput(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // 3. Transfer Fuel (Tangki-FT)
  const handleSaveFuelTransfer = (
    data: Omit<FuelTransferRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateFuelTransfer(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteFuelTransfer = (id: string) => {
    const res = deleteFuelTransfer(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // 4. Input Stock Oli
  const handleSaveOilStockInput = (
    data: Omit<OilStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateOilStockInput(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteOilStockInput = (id: string) => {
    const res = deleteOilStockInput(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // 5. Distribution Fuel
  const handleSaveFuelDistribution = (
    data: Omit<FuelDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateFuelDistribution(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteFuelDistribution = (id: string) => {
    const res = deleteFuelDistribution(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // 6. Distribution Oli
  const handleSaveOilDistribution = (
    data: Omit<OilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateOilDistribution(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteOilDistribution = (id: string) => {
    const res = deleteOilDistribution(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // Kalibrasi Sisa Periode Sebelumnya (Saldo Awal)
  const handleSavePeriodBalance = (balance: InventoryPeriodBalance) => {
    const res = saveInventoryPeriodBalance(balance);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleAddCustomOilType = (newOilName: string) => {
    const res = addCustomOilType(newOilName);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  // If user is not logged in, render the LoginModal (Tampilan awal tetap dipertahankan utuh)
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-600 selection:text-white font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-700'
              : 'bg-stone-900 text-stone-200 border-stone-700'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header Clean: Logo + "Maintenance Management System" + PT Batu Kaliwelang Ampuh + Quarry Purwosari + Tombol Menu Utama + Sapaan Sesuai User/Developer */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onGoHome={handleGoHome}
      />

      {/* 2. Tombol 4 Modul Besar Terintegrasi */}
      <ModuleTabs
        activeModuleId={activeModuleId}
        onSelectModule={(id) => setActiveModuleId(id)}
        modules={modules}
        totalAssetCount={units.length}
        totalManpowerCount={manpowerList.length}
        totalBreakdownCount={breakdowns.filter((b) => b.statusUnit !== 'COMPLETED').length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeModuleId === 1 ? (
          /* Modul 1: Registrasi Asset (Materi Script Dipertahankan Utuh dan Tidak Dirubah) */
          <AssetRegistrationView
            units={units}
            currentUser={currentUser}
            onSaveUnit={handleSaveUnit}
            onDeleteUnit={handleDeleteUnit}
          />
        ) : activeModuleId === 2 ? (
          /* Modul 2: Data Manpower (NIK, NAMA, JABATAN pilihan, TGL. MASUK KERJA, KETERANGAN, tombol Simpan & aksi View, Edit, Deleted) */
          <ManpowerView
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSaveManpower={handleSaveManpower}
            onDeleteManpower={handleDeleteManpower}
          />
        ) : activeModuleId === 3 ? (
          /* Modul 3: Data Base Maintenance (Sub Modul 1 Input Breakdown, Sub Modul 2 Update Breakdown, Sub Modul 3 Dashboard Maintenance) */
          <MaintenanceDatabaseView
            units={units}
            manpowerList={manpowerList}
            breakdowns={breakdowns}
            currentUser={currentUser}
            onSaveBreakdown={handleSaveBreakdown}
            onUpdateActivity={handleUpdateBreakdownActivity}
            onDeleteBreakdown={handleDeleteBreakdown}
          />
        ) : (
          /* Modul 4: Inventory Management (6 Sub-Modul: Data Suplier, Input Stock Fuel + Top 5, Transfer Fuel Tangki-FT, Input Stock Oli, Distribution Fuel, Distribution Oli) */
          <InventoryManagementView
            units={units}
            manpowerList={manpowerList}
            suppliers={suppliers}
            fuelStockInputs={fuelStockInputs}
            fuelTransfers={fuelTransfers}
            oilStockInputs={oilStockInputs}
            fuelDistributions={fuelDistributions}
            oilDistributions={oilDistributions}
            periodBalance={periodBalance}
            availableOilTypes={availableOilTypes}
            currentUser={currentUser}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSaveFuelStockInput={handleSaveFuelStockInput}
            onDeleteFuelStockInput={handleDeleteFuelStockInput}
            onSaveFuelTransfer={handleSaveFuelTransfer}
            onDeleteFuelTransfer={handleDeleteFuelTransfer}
            onSaveOilStockInput={handleSaveOilStockInput}
            onDeleteOilStockInput={handleDeleteOilStockInput}
            onSaveFuelDistribution={handleSaveFuelDistribution}
            onDeleteFuelDistribution={handleDeleteFuelDistribution}
            onSaveOilDistribution={handleSaveOilDistribution}
            onDeleteOilDistribution={handleDeleteOilDistribution}
            onSavePeriodBalance={handleSavePeriodBalance}
            onAddCustomOilType={handleAddCustomOilType}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-800/80 bg-stone-900/60 py-6 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BkwaLogo size="sm" variant="card" />
            <div>
              <p className="font-bold text-stone-200">PT Batu Kaliwelang Ampuh</p>
              <p className="text-[11px] text-stone-500">
                Alamat Quarry: Purwosari • Divisi Maintenance & Alat Berat
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-stone-500">
            <p>Sistem Maintenance Terintegrasi • 4 Modul</p>
            <p className="text-amber-500/80 font-mono mt-0.5">
              Akun Aktif: {currentUser.role === 'ADMIN' ? 'Developer' : currentUser.fullName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
