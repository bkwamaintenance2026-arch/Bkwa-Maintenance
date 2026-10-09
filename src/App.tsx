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
  P2HRecord,
  OutFieldFuelRecord,
  GreaseStockRecord,
  GreaseDistributionRecord,
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
  getAllOutFieldFuelRecords,
  addOrUpdateOutFieldFuelRecord,
  deleteOutFieldFuelRecord,
  getStandardSolarPrice,
  setStandardSolarPrice,
  getAllGreaseStockRecords,
  addOrUpdateGreaseStockRecord,
  deleteGreaseStockRecord,
  getAllGreaseDistributionRecords,
  addOrUpdateGreaseDistributionRecord,
  deleteGreaseDistributionRecord,
  getInventoryPeriodBalance,
  saveInventoryPeriodBalance,
  getAvailableOilTypes,
  addCustomOilType,
  getAllUsers,
  getAllP2HRecords,
  saveP2HRecord,
  deleteP2HRecord,
  canUserViewModule,
} from './utils/storage';
import { INITIAL_MODULES } from './data/mockUnits';
import { Navbar } from './components/Navbar';
import { ModuleTabs } from './components/ModuleTabs';
import { AssetRegistrationView } from './components/modul1/AssetRegistrationView';
import { ManpowerView } from './components/modul2/ManpowerView';
import { MaintenanceDatabaseView } from './components/modul3/MaintenanceDatabaseView';
import { InventoryManagementView as FOGInventoryView } from './components/modul4/InventoryManagementView';
import { InventoryManagementView as SparePartInventoryView } from './components/modul6/InventoryManagementView';
import { DivisiOperationView } from './components/modul5/DivisiOperationView';
import { TyreManagementView } from './components/modul7/TyreManagementView';
import { MenuUtamaLauncher } from './components/MenuUtamaLauncher';
import { LoginModal } from './components/LoginModal';
import { BkwaLogo } from './components/BkwaLogo';
import { AccessControlModal } from './components/admin/AccessControlModal';
import { GoogleSheetsSyncModal } from './components/admin/GoogleSheetsSyncModal';
import { CloudSyncModal } from './components/admin/CloudSyncModal';
import { setupRealtimeFirestoreListeners, cleanLocalDuplicates } from './services/firestoreSync';
import { getSavedSpreadsheetId } from './services/googleSheets';

export default function App() {
  const [currentUser, setLocalCurrentUser] = useState<UserAccount | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<number>(0);
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
  const [periodBalance, setPeriodBalance] = useState<InventoryPeriodBalance>(() => getInventoryPeriodBalance());
  const [availableOilTypes, setAvailableOilTypes] = useState<string[]>([]);
  const [outFieldFuelRecords, setOutFieldFuelRecords] = useState<OutFieldFuelRecord[]>([]);
  const [standardSolarPrice, setStandardSolarPriceState] = useState<number>(() => getStandardSolarPrice());
  const [greaseStocks, setGreaseStocks] = useState<GreaseStockRecord[]>([]);
  const [greaseDistributions, setGreaseDistributions] = useState<GreaseDistributionRecord[]>([]);
  
  // Modul 5: P2H Records State
  const [p2hRecords, setP2HRecords] = useState<P2HRecord[]>([]);

  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);
  const [isGoogleSheetsSyncOpen, setIsGoogleSheetsSyncOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);
  const [originalAdminUser, setOriginalAdminUser] = useState<UserAccount | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Initial load and Realtime Cloud Firestore sync
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setLocalCurrentUser(user);
    }
    cleanLocalDuplicates();
    refreshAllData();

    // Aktifkan Real-Time Listener Cloud Firestore (Multi-Device Sync)
    const unsubFirestore = setupRealtimeFirestoreListeners(() => {
      refreshAllData();
    });

    return () => {
      unsubFirestore();
    };
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
    setOutFieldFuelRecords(getAllOutFieldFuelRecords());
    setStandardSolarPriceState(getStandardSolarPrice());
    setGreaseStocks(getAllGreaseStockRecords());
    setGreaseDistributions(getAllGreaseDistributionRecords());
    setPeriodBalance(getInventoryPeriodBalance());
    setAvailableOilTypes(getAvailableOilTypes());
    setP2HRecords(getAllP2HRecords());
    setUsersList(getAllUsers());
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setLocalCurrentUser(user);
    refreshAllData();
    setActiveModuleId(0); // Buka Menu Utama Launcher
    const greetingName = user.role === 'ADMIN' ? 'Developer' : (user.fullName || user.username);
    showToast(`Selamat datang, ${greetingName}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalCurrentUser(null);
    setOriginalAdminUser(null);
    setActiveModuleId(0);
    showToast('Anda telah keluar dari sistem.', 'info');
  };

  // Simulasi Pengguna oleh Developer
  const handleSwitchUser = (targetUser: UserAccount) => {
    if (currentUser?.role === 'ADMIN') {
      setOriginalAdminUser(currentUser);
      setLocalCurrentUser(targetUser);
      setCurrentUser(targetUser);
      setIsAccessControlOpen(false);
      showToast(`Beralih tampilan simulasi: ${targetUser.fullName || targetUser.username}`, 'info');
    }
  };

  const handleExitSimulation = () => {
    if (originalAdminUser) {
      setLocalCurrentUser(originalAdminUser);
      setCurrentUser(originalAdminUser);
      setOriginalAdminUser(null);
      showToast('Kembali ke akun Developer utama.', 'success');
    }
  };

  // Tombol Kembali ke Menu Home / Menu Utama
  const handleGoHome = () => {
    setActiveModuleId(0);
    showToast('Kembali ke Menu Utama', 'info');
  };

  // Navigasi modul dengan validasi hak akses RBAC
  const handleSelectModule = (moduleId: number) => {
    if (!canUserViewModule(currentUser, moduleId)) {
      showToast('Akses dibatasi untuk tingkatan akun Anda pada modul ini.', 'error');
      return;
    }
    setActiveModuleId(moduleId);
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
      jamStart?: string;
      jamFinish?: string;
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

  // 7. Out Field Fuel Used (SPBU Luar)
  const handleSaveOutFieldFuelRecord = (
    data: Omit<OutFieldFuelRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateOutFieldFuelRecord(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteOutFieldFuelRecord = (id: string) => {
    const res = deleteOutFieldFuelRecord(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleUpdateSolarPrice = (newPrice: number) => {
    setStandardSolarPrice(newPrice);
    setStandardSolarPriceState(newPrice);
    showToast(`Harga standar solar berhasil diperbarui: Rp ${newPrice.toLocaleString('id-ID')}/Ltr`, 'success');
  };

  // 8. Grease Stock & Distribution
  const handleSaveGreaseStock = (
    data: Omit<GreaseStockRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateGreaseStockRecord(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteGreaseStock = (id: string) => {
    const res = deleteGreaseStockRecord(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleSaveGreaseDistribution = (
    data: Omit<GreaseDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateGreaseDistributionRecord(data, idToEdit);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteGreaseDistribution = (id: string) => {
    const res = deleteGreaseDistributionRecord(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  // =================== MODUL 5: INPUT FORM P2H UNIT ===================
  const handleSaveP2H = (
    data: Omit<P2HRecord, 'id' | 'noP2H' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => {
    const res = saveP2HRecord(data, existingId);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
  };

  const handleDeleteP2H = (id: string) => {
    const res = deleteP2HRecord(id);
    if (res.success) {
      refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
    return res;
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
        onOpenAccessControl={() => setIsAccessControlOpen(true)}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        isSimulating={!!originalAdminUser}
        onExitSimulation={handleExitSimulation}
      />

      {/* 2. Tombol 5 Modul Besar Terintegrasi */}
      <ModuleTabs
        activeModuleId={activeModuleId}
        onSelectModule={handleSelectModule}
        modules={modules}
        totalAssetCount={units.length}
        totalManpowerCount={manpowerList.length}
        totalBreakdownCount={breakdowns.filter((b) => b.statusUnit !== 'COMPLETED').length}
        totalP2HCount={p2hRecords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeModuleId === 0 ? (
          /* Tampilan Menu Utama (Dashboard Launcher & Ringkasan Modul) */
          <MenuUtamaLauncher
            currentUser={currentUser}
            units={units}
            manpowerList={manpowerList}
            breakdowns={breakdowns}
            p2hRecords={p2hRecords}
            onSelectModule={handleSelectModule}
            onOpenSheetsSync={() => setIsGoogleSheetsSyncOpen(true)}
            onOpenAccessControl={() => setIsAccessControlOpen(true)}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
            sheetsConnected={!!getSavedSpreadsheetId()}
          />
        ) : activeModuleId === 1 ? (
          /* Modul 1: Registrasi Asset (Materi Script Dipertahankan Utuh dan Tidak Dirubah) */
          <AssetRegistrationView
            units={units}
            currentUser={currentUser}
            onSaveUnit={handleSaveUnit}
            onDeleteUnit={handleDeleteUnit}
            onBackToMainMenu={handleGoHome}
          />
        ) : activeModuleId === 2 ? (
          /* Modul 2: Data Manpower (NIK, NAMA, JABATAN pilihan, TGL. MASUK KERJA, KETERANGAN, tombol Simpan & aksi View, Edit, Deleted) */
          <ManpowerView
            manpowerList={manpowerList}
            currentUser={currentUser}
            onSaveManpower={handleSaveManpower}
            onDeleteManpower={handleDeleteManpower}
            onBackToMainMenu={handleGoHome}
          />
        ) : activeModuleId === 3 ? (
          <MaintenanceDatabaseView
            units={units}
            manpowerList={manpowerList}
            breakdowns={breakdowns}
            p2hRecords={p2hRecords}
            currentUser={currentUser}
            onSaveBreakdown={handleSaveBreakdown}
            onUpdateActivity={handleUpdateBreakdownActivity}
            onDeleteBreakdown={handleDeleteBreakdown}
            onBackToMainMenu={handleGoHome}
            onNavigateToP2H={() => setActiveModuleId(5)}
          />
        ) : activeModuleId === 4 ? (
          /* Modul 4: FOG (Kolom Fuel, Oil, Grease, & Data Suplier termasuk Out Field Fuel SPBU Luar) */
          <FOGInventoryView
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
            outFieldFuelRecords={outFieldFuelRecords}
            onSaveOutFieldFuelRecord={handleSaveOutFieldFuelRecord}
            onDeleteOutFieldFuelRecord={handleDeleteOutFieldFuelRecord}
            standardSolarPrice={standardSolarPrice}
            onUpdateSolarPrice={handleUpdateSolarPrice}
            greaseStocks={greaseStocks}
            greaseDistributions={greaseDistributions}
            onSaveGreaseStock={handleSaveGreaseStock}
            onDeleteGreaseStock={handleDeleteGreaseStock}
            onSaveGreaseDistribution={handleSaveGreaseDistribution}
            onDeleteGreaseDistribution={handleDeleteGreaseDistribution}
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
            onBackToMainMenu={handleGoHome}
          />
        ) : activeModuleId === 5 ? (
          /* Modul 5: Divisi Operation (Sub Modul 1: Form P2H Unit & Sub Modul 2: Setting Fleet) */
          <DivisiOperationView
            units={units}
            manpowerList={manpowerList}
            p2hRecords={p2hRecords}
            currentUser={currentUser}
            onSaveP2H={handleSaveP2H}
            onDeleteP2H={handleDeleteP2H}
            onBackToMainMenu={handleGoHome}
          />
        ) : activeModuleId === 6 ? (
          /* Modul 6: Inventory Management (Spare Part & Transaksi Order Part) */
          <SparePartInventoryView
            breakdowns={breakdowns}
            currentUser={currentUser}
            onRefreshData={refreshAllData}
          />
        ) : (
          /* Modul 7: Tyre Management System */
          <TyreManagementView
            units={units}
            manpowerList={manpowerList}
            currentUser={currentUser}
            onBackToMainMenu={handleGoHome}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-800/80 bg-stone-900/60 py-6 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BkwaLogo size="sm" variant="card" />
            <div>
              <p className="font-bold text-stone-200">PT BATU KALI WELANG AMPUH</p>
              <p className="text-[11px] text-stone-500">
                Alamat Quarry: Purwosari • Divisi Maintenance & Alat Berat
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-stone-500">
            <p>Sistem Maintenance Terintegrasi • 6 Modul</p>
            <p className="text-amber-500/80 font-mono mt-0.5">
              Akun Aktif: {currentUser.role === 'ADMIN' ? 'Developer' : (currentUser.fullName || currentUser.username)} ({currentUser.accountTier || 'Member'})
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Otorisasi Pengguna (Developer) */}
      <AccessControlModal
        isOpen={isAccessControlOpen}
        onClose={() => setIsAccessControlOpen(false)}
        users={usersList}
        currentUser={originalAdminUser || currentUser}
        onRefreshUsers={refreshAllData}
        onSwitchUser={handleSwitchUser}
      />

      {/* Modal Sinkronisasi Google Sheets & Drive */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsSyncOpen}
        onClose={() => setIsGoogleSheetsSyncOpen(false)}
        units={units}
        manpower={manpowerList}
        breakdowns={breakdowns}
        suppliers={suppliers}
        fuelStocks={fuelStockInputs}
        fuelTransfers={fuelTransfers}
        oilStocks={oilStockInputs}
        fuelDistributions={fuelDistributions}
        oilDistributions={oilDistributions}
        p2hRecords={p2hRecords}
      />

      {/* Modal Server Cloud Firebase Firestore & Panduan Vercel */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onDataRefreshed={refreshAllData}
      />
    </div>
  );
}
