import React, { useState, useEffect } from 'react';
import { 
  BreakdownRecord, 
  SparePartItem, 
  SparePartTransaction, 
  SparePartTransactionItem,
  PurchaseRequest,
  UserAccount 
} from '../../types';
import { 
  getStoredSpareParts, 
  saveSparePartItem, 
  addSparePartStock, 
  deleteSparePartItem, 
  getStoredSparePartTransactions, 
  recordSparePartTransaction, 
  getStoredPurchaseRequests, 
  createPurchaseRequest, 
  updatePurchaseRequestStatus,
  canUserEditModule 
} from '../../utils/storage';
import { InputSparePartSubView } from './InputSparePartSubView';
import { TransaksiSparePartSubView } from './TransaksiSparePartSubView';
import { 
  Boxes, 
  Package, 
  ShoppingCart, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  RotateCcw
} from 'lucide-react';

interface InventoryManagementViewProps {
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onRefreshData?: () => void;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  breakdowns,
  currentUser,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'INPUT' | 'TRANSAKSI'>('INPUT');
  
  // State data inventory
  const [spareParts, setSpareParts] = useState<SparePartItem[]>([]);
  const [transactions, setTransactions] = useState<SparePartTransaction[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);

  // RBAC Edit permission for Modul 6
  const canEdit = canUserEditModule(currentUser, 6);

  // Load data dari storage
  const loadData = () => {
    setSpareParts(getStoredSpareParts());
    setTransactions(getStoredSparePartTransactions());
    setPurchaseRequests(getStoredPurchaseRequests());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: Tambah / Edit Part
  const handleAddOrUpdatePart = (
    data: Omit<SparePartItem, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    const res = saveSparePartItem(data, id);
    if (res.success) {
      loadData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Tambah Stok Cepat (+)
  const handleAddStock = (partId: string, qtyToAdd: number, keterangan?: string) => {
    const res = addSparePartStock(partId, qtyToAdd, keterangan);
    if (res.success) {
      loadData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Hapus Part
  const handleDeletePart = (id: string) => {
    const res = deleteSparePartItem(id);
    if (res.success) {
      loadData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Transaksi Order Part (Potong Stok atau Catat Shortage)
  const handleRecordTransaction = (
    data: Omit<SparePartTransaction, 'id' | 'noTransaksi' | 'createdAt' | 'status'>
  ) => {
    const res = recordSparePartTransaction(data);
    if (res.success) {
      loadData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Buat Form Permintaan Barang (SPB)
  const handleSubmitPurchaseRequest = (
    data: Omit<PurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'status'>
  ) => {
    const res = createPurchaseRequest(data);
    if (res.success) {
      loadData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Update Status PR
  const handleUpdatePRStatus = (id: string, status: PurchaseRequest['status']) => {
    updatePurchaseRequestStatus(id, status);
    loadData();
    if (onRefreshData) onRefreshData();
  };

  // Statistik Cepat
  const totalSku = spareParts.length;
  const criticalStock = spareParts.filter((s) => s.qty <= (s.minStock || 2)).length;
  const activePRCount = purchaseRequests.filter((p) => p.status === 'DIAJUKAN' || p.status === 'DISETUJUI').length;
  const activeBreakdowns = breakdowns.filter((b) => b.statusUnit !== 'READY').length;

  return (
    <div className="space-y-6">
      {/* HEADER MODUL 6 */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-bold">
                  MODUL 6
                </span>
                <span className="text-xs text-stone-400 font-mono">BKWA Plant Workshop</span>
              </div>
              <h2 className="text-lg sm:text-xl font-mono font-bold text-stone-100 tracking-wide mt-0.5">
                INVENTORY MANAGEMENT
              </h2>
              <p className="text-xs text-stone-400 font-sans mt-0.5">
                Pengelolaan stok suku cadang, transaksi order part per unit breakdown, dan pengajuan form permintaan barang.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-2 self-start md:self-center px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold border border-stone-700 transition"
            title="Refresh data inventory"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Refresh</span>
          </button>
        </div>

        {/* METRICS SUMMARY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-800 font-mono">
          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Total SKU Suku Cadang</span>
            <span className="text-lg font-bold text-stone-100">{totalSku} Item</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Stok Kritis / Habis</span>
            <span className={`text-lg font-bold ${criticalStock > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {criticalStock} Item
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Unit Butuh Perbaikan</span>
            <span className="text-lg font-bold text-amber-400">{activeBreakdowns} Unit</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Form SPB Aktif</span>
            <span className="text-lg font-bold text-blue-400">{activePRCount} Pengajuan</span>
          </div>
        </div>

        {/* SUB MODUL NAVIGATION TABS */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('INPUT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition ${
              activeSubTab === 'INPUT'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. Input Spare Part (Incoming Part / Component)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('TRANSAKSI')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition ${
              activeSubTab === 'TRANSAKSI'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>2. Transaksi Spare Part &amp; Order Part</span>
          </button>
        </div>
      </div>

      {/* SUB MODUL CONTENT */}
      {activeSubTab === 'INPUT' ? (
        <InputSparePartSubView
          spareParts={spareParts}
          currentUser={currentUser}
          canEdit={canEdit}
          onAddOrUpdatePart={handleAddOrUpdatePart}
          onAddStock={handleAddStock}
          onDeletePart={handleDeletePart}
        />
      ) : (
        <TransaksiSparePartSubView
          breakdowns={breakdowns}
          spareParts={spareParts}
          transactions={transactions}
          purchaseRequests={purchaseRequests}
          currentUser={currentUser}
          canEdit={canEdit}
          onRecordTransaction={handleRecordTransaction}
          onSubmitPurchaseRequest={handleSubmitPurchaseRequest}
          onUpdatePRStatus={handleUpdatePRStatus}
        />
      )}
    </div>
  );
};
