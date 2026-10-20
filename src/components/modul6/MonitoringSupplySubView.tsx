import React, { useState, useEffect, useMemo } from 'react';
import { 
  BreakdownRecord, 
  PartSupplyItemTracking, 
  SupplyFulfillmentStatus, 
  SUPPLY_STATUS_OPTIONS,
  NonUnitPurchaseRequest,
  UserAccount,
  ManpowerData
} from '../../types';
import { 
  getAllPartSupplyTrackings, 
  syncBreakdownPartsToSupplyTrackings,
  updatePartSupplyStatus, 
  quickTogglePartSupplyStatus,
  getAllNonUnitPurchaseRequests,
  createNonUnitPurchaseRequest,
  updateNonUnitSupplyStatus,
  deleteNonUnitPurchaseRequest
} from '../../utils/storage';
import { NonUnitRequestModal } from './NonUnitRequestModal';
import { 
  Boxes, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  RotateCcw, 
  Truck, 
  FileText, 
  ChevronRight, 
  Check, 
  Edit3, 
  X, 
  Save, 
  Printer, 
  ExternalLink,
  Trash2,
  Package
} from 'lucide-react';

interface MonitoringSupplySubViewProps {
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  canEdit: boolean;
  manpowerList?: ManpowerData[];
  onRefreshData?: () => void;
}

export const MonitoringSupplySubView: React.FC<MonitoringSupplySubViewProps> = ({
  breakdowns,
  currentUser,
  canEdit,
  manpowerList = [],
  onRefreshData,
}) => {
  // State data tracking & non-unit SPB
  const [supplyTrackings, setSupplyTrackings] = useState<PartSupplyItemTracking[]>([]);
  const [nonUnitRequests, setNonUnitRequests] = useState<NonUnitPurchaseRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filter & Search states
  const [activeSourceTab, setActiveSourceTab] = useState<'ALL' | 'UNIT' | 'NON_UNIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupplyFulfillmentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal SPB Non Unit
  const [showNonUnitModal, setShowNonUnitModal] = useState<boolean>(false);

  // Modal / Drawer Catat Kedatangan Supply dari Malang
  const [selectedTrackingForUpdate, setSelectedTrackingForUpdate] = useState<PartSupplyItemTracking | null>(null);
  const [updateFormData, setUpdateFormData] = useState<{
    status: SupplyFulfillmentStatus;
    qtyDiterima: number;
    tanggalSupply: string;
    noSuratJalanMalang: string;
    catatan: string;
  }>({
    status: 'TERPENUHI',
    qtyDiterima: 1,
    tanggalSupply: new Date().toISOString().split('T')[0],
    noSuratJalanMalang: '',
    catatan: '',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load and auto-sync data dari Modul 3 BreakdownRecord & Storage
  const loadAndSyncData = () => {
    setIsSyncing(true);
    try {
      // Sinkronkan part dari Modul 3 breakdown
      const synced = syncBreakdownPartsToSupplyTrackings(breakdowns);
      setSupplyTrackings(synced);
      setNonUnitRequests(getAllNonUnitPurchaseRequests());
    } catch (e) {
      console.error('Error syncing supply data:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAndSyncData();
  }, [breakdowns]);

  // Handler: Checklist Cepat (1-Klik toggle Belum Supply <-> Terpenuhi)
  const handleQuickChecklist = (item: PartSupplyItemTracking) => {
    if (!canEdit) {
      alert('Anda tidak memiliki izin edit untuk memverifikasi supply barang!');
      return;
    }
    const res = quickTogglePartSupplyStatus(item.id, currentUser.fullName || currentUser.username);
    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Handler: Buka Form Catat Kedatangan Malang
  const handleOpenUpdateModal = (item: PartSupplyItemTracking) => {
    setSelectedTrackingForUpdate(item);
    setUpdateFormData({
      status: item.status === 'PENDING' ? 'TERPENUHI' : item.status,
      qtyDiterima: item.qtyDiterima > 0 ? item.qtyDiterima : item.qtyDiminta,
      tanggalSupply: item.tanggalSupply || new Date().toISOString().split('T')[0],
      noSuratJalanMalang: item.noSuratJalanMalang || '',
      catatan: item.catatan || '',
    });
  };

  // Handler: Simpan Detail Kedatangan Malang
  const handleSaveSupplyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackingForUpdate) return;

    const res = updatePartSupplyStatus(selectedTrackingForUpdate.id, updateFormData.status, {
      qtyDiterima: updateFormData.qtyDiterima,
      tanggalSupply: updateFormData.tanggalSupply,
      noSuratJalanMalang: updateFormData.noSuratJalanMalang,
      catatan: updateFormData.catatan,
      updatedBy: currentUser.fullName || currentUser.username,
    });

    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
      setSelectedTrackingForUpdate(null);
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Handler: Buat SPB Non-Unit
  const handleCreateNonUnitPR = (data: any) => {
    const res = createNonUnitPurchaseRequest(data);
    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  // Handler: Hapus SPB Non-Unit
  const handleDeleteNonUnitPR = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus SPB Non-Unit ini?')) return;
    const res = deleteNonUnitPurchaseRequest(id);
    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Data Filtering
  const filteredTrackings = useMemo(() => {
    return supplyTrackings.filter((item) => {
      // Filter Source Type
      if (activeSourceTab === 'UNIT' && item.sourceType !== 'UNIT_BREAKDOWN') return false;
      if (activeSourceTab === 'NON_UNIT' && item.sourceType !== 'NON_UNIT') return false;

      // Filter Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Filter Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = (item.refNumber || '').toLowerCase().includes(q);
        const matchUnit = (item.noUnit || '').toLowerCase().includes(q);
        const matchAlat = (item.namaAlat || '').toLowerCase().includes(q);
        const matchPart = (item.namaPart || '').toLowerCase().includes(q);
        const matchPn = (item.partNumber || '').toLowerCase().includes(q);
        const matchDO = (item.noSuratJalanMalang || '').toLowerCase().includes(q);
        if (!matchRef && !matchUnit && !matchAlat && !matchPart && !matchPn && !matchDO) {
          return false;
        }
      }

      return true;
    });
  }, [supplyTrackings, activeSourceTab, statusFilter, searchQuery]);

  // Statistik KPI
  const stats = useMemo(() => {
    const totalItems = supplyTrackings.length;
    const pendingItems = supplyTrackings.filter((i) => i.status === 'PENDING').length;
    const partialItems = supplyTrackings.filter((i) => i.status === 'PARSIAL').length;
    const completedItems = supplyTrackings.filter((i) => i.status === 'TERPENUHI').length;
    const unitItems = supplyTrackings.filter((i) => i.sourceType === 'UNIT_BREAKDOWN').length;
    const nonUnitItems = supplyTrackings.filter((i) => i.sourceType === 'NON_UNIT').length;

    const fulfillmentRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      pendingItems,
      partialItems,
      completedItems,
      unitItems,
      nonUnitItems,
      fulfillmentRate,
    };
  }, [supplyTrackings]);

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR HEADER SUB-MODUL 3 */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                SUB-MODUL 3
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Terintegrasi Modul 3 (Update Breakdown) &amp; Modul 6 (Inventory)
              </span>
            </div>
            <h3 className="text-lg font-mono font-bold text-stone-100 mt-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <span>Monitoring Supply &amp; Outstanding Part (Kiriman Malang)</span>
            </h3>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Kontrol pemenuhan suku cadang breakdown unit via No MO yang sama dan pencatatan penerimaan barang dari Malang.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAndSyncData}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold border border-stone-700 transition"
              title="Sinkronisasi ulang dengan Modul 3"
            >
              <RotateCcw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Data'}</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowNonUnitModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold shadow-lg shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat SPB Non-Unit</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-stone-800 font-mono">
          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Total Kebutuhan Part</span>
            <span className="text-lg font-bold text-stone-100 tabular-nums">
              {stats.totalItems} <span className="text-xs font-normal text-stone-400">Item</span>
            </span>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Unit: {stats.unitItems} · Non-Unit: {stats.nonUnitItems}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Belum Disupply (Outstanding)</span>
            <span className="text-lg font-bold text-rose-400 tabular-nums">
              {stats.pendingItems} <span className="text-xs font-normal text-rose-300">Item</span>
            </span>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Menunggu Supply Malang</div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Supply Parsial (Sebagian)</span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              {stats.partialItems} <span className="text-xs font-normal text-amber-300">Item</span>
            </span>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Tiba Bertahap</div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Terpenuhi Lengkap</span>
            <span className="text-lg font-bold text-emerald-400 tabular-nums">
              {stats.completedItems} <span className="text-xs font-normal text-emerald-300">Item</span>
            </span>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">Siap Pasang di Unit</div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Tingkat Pemenuhan</span>
            <span className="text-lg font-bold text-blue-400 tabular-nums">
              {stats.fulfillmentRate}%
            </span>
            <div className="w-full bg-stone-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.fulfillmentRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* SEGMENTED SOURCE TABS (ANTI-PILL DISCIPLINE) */}
          <div className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-xl border border-stone-800 self-start">
            <button
              type="button"
              onClick={() => setActiveSourceTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSourceTab === 'ALL'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua Kebutuhan Part ({stats.totalItems})
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceTab('UNIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSourceTab === 'UNIT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Unit Breakdown (No MO) ({stats.unitItems})
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceTab('NON_UNIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSourceTab === 'NON_UNIT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              SPB Non-Unit Workshop ({stats.nonUnitItems})
            </button>
          </div>

          {/* SEARCH & STATUS FILTER */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Belum Disupply (Outstanding)</option>
                <option value="PARSIAL">Supply Parsial</option>
                <option value="TERPENUHI">Terpenuhi Lengkap</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No MO, Part, Unit, DO..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs placeholder:text-stone-500 focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700 transition"
              title="Cetak ringkasan"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABEL DATA MONITORING SUPPLY OUTSTANDING */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
              Daftar Kebutuhan &amp; Kedatangan Suku Cadang dari Malang
            </span>
            <span className="text-xs text-stone-500">
              ({filteredTrackings.length} item ditampilkan)
            </span>
          </div>

          <div className="text-[11px] text-stone-400">
            Klik ikon checklist (<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline mx-0.5" />) untuk update pemenuhan kilat
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-950/80 text-stone-400 text-[10px] uppercase tracking-wider border-b border-stone-800">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-32">No Reff / No MO</th>
                <th className="px-3.5 py-3 w-36">Unit / Kategori</th>
                <th className="px-3.5 py-3 min-w-[180px]">Nama Part / Barang</th>
                <th className="px-3.5 py-3 w-32">Part Number / Spek</th>
                <th className="px-3.5 py-3 text-right w-20">Diminta</th>
                <th className="px-3.5 py-3 text-right w-20">Disupply</th>
                <th className="px-3.5 py-3 text-center w-36">Status Supply</th>
                <th className="px-3.5 py-3 w-28">Tgl Tiba</th>
                <th className="px-3.5 py-3 w-36">No Surat Jalan Malang</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-200">
              {filteredTrackings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-stone-500">
                    <Package className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-stone-400">
                      Tidak ada data suku cadang yang sesuai dengan filter.
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Kebutuhan suku cadang dari Modul 3 Update Breakdown otomatis tersinkronisasi di tabel ini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrackings.map((item, index) => {
                  const isCompleted = item.status === 'TERPENUHI';
                  const isPartial = item.status === 'PARSIAL';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-stone-800/40 transition ${
                        isCompleted ? 'bg-emerald-950/10' : isPartial ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="px-3.5 py-3 text-center text-stone-500 tabular-nums">
                        {index + 1}
                      </td>

                      {/* No Reff / No MO */}
                      <td className="px-3.5 py-3 font-bold">
                        <span className="text-amber-400 tabular-nums">
                          {item.refNumber}
                        </span>
                        <div className="text-[10px] text-stone-500">
                          {item.sourceType === 'UNIT_BREAKDOWN' ? 'Modul 3 Breakdown' : 'SPB Non-Unit'}
                        </div>
                      </td>

                      {/* Unit / Kategori */}
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-stone-100">
                          {item.noUnit || '-'}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[130px]">
                          {item.namaAlat || '-'}
                        </div>
                      </td>

                      {/* Nama Part / Barang */}
                      <td className="px-3.5 py-3 font-medium text-stone-100">
                        {item.namaPart}
                        {item.catatan && (
                          <div className="text-[10px] text-stone-400 italic mt-0.5">
                            Catatan: {item.catatan}
                          </div>
                        )}
                      </td>

                      {/* Part Number */}
                      <td className="px-3.5 py-3 text-stone-400">
                        {item.partNumber || '-'}
                      </td>

                      {/* Qty Diminta */}
                      <td className="px-3.5 py-3 text-right font-bold text-stone-200 tabular-nums">
                        {item.qtyDiminta} <span className="text-[10px] text-stone-400 font-normal">{item.satuan}</span>
                      </td>

                      {/* Qty Disupply */}
                      <td className="px-3.5 py-3 text-right font-bold tabular-nums">
                        <span className={isCompleted ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-stone-500'}>
                          {item.qtyDiterima || 0}
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal ml-0.5">{item.satuan}</span>
                      </td>

                      {/* Status Supply Badge (Clean Unboxed or Subtle Tint) */}
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : isPartial
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isCompleted ? 'TERPENUHI' : isPartial ? 'PARSIAL' : 'OUTSTANDING'}
                        </span>
                      </td>

                      {/* Tgl Tiba */}
                      <td className="px-3.5 py-3 text-stone-300 tabular-nums text-[11px]">
                        {item.tanggalSupply || '-'}
                      </td>

                      {/* No Surat Jalan Malang */}
                      <td className="px-3.5 py-3 text-stone-300">
                        {item.noSuratJalanMalang || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1-Click Quick Toggle Checklist */}
                          <button
                            type="button"
                            onClick={() => handleQuickChecklist(item)}
                            className={`p-1.5 rounded-lg border transition ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-emerald-400 hover:border-emerald-500/50'
                            }`}
                            title={isCompleted ? 'Tandai Belum Terpenuhi' : 'Tandai Terpenuhi Penuh (1-Klik)'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* Catat Detail / Parsial Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenUpdateModal(item)}
                            className="p-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 hover:text-amber-400 transition"
                            title="Update Detail Supply (Parsial / Surat Jalan Malang)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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

      {/* SECTION SUB-TAB KHUSUS: REKAP FORM SPB NON-UNIT */}
      {activeSourceTab !== 'UNIT' && nonUnitRequests.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-stone-100 uppercase">
                Daftar Formulir Surat Permintaan Barang (SPB) Non-Unit
              </h4>
            </div>
            <span className="text-xs text-stone-400">
              {nonUnitRequests.length} Pengajuan Tersimpan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nonUnitRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-stone-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 tabular-nums">
                      {req.noPermintaan}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.statusSupply === 'TERPENUHI'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : req.statusSupply === 'PARSIAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {req.statusSupply}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-stone-200">
                    {req.kategori.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                    {req.alasanPermintaan}
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                    <div>Pemohon: <span className="text-stone-200 font-bold">{req.pemohon}</span> ({req.jabatanPemohon})</div>
                    <div>Tanggal: <span className="text-stone-200">{req.tanggal}</span></div>
                    <div>Item: <span className="text-amber-400 font-bold">{req.items.length} Barang</span></div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">
                    {req.noSuratJalanMalang ? `DO: ${req.noSuratJalanMalang}` : 'Belum ada DO'}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNonUnitPR(req.id)}
                      className="p-1 text-stone-500 hover:text-rose-400 transition"
                      title="Hapus SPB Non-Unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL UPDATE DETAIL KEDATANGAN DARI MALANG */}
      {selectedTrackingForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-stone-100">
                  Catat Penerimaan Supply dari Malang
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrackingForUpdate(null)}
                className="p-1 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSupplyDetails} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">No Reff / No MO:</span>
                  <span className="font-bold text-amber-400">{selectedTrackingForUpdate.refNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Unit:</span>
                  <span className="font-bold text-stone-200">{selectedTrackingForUpdate.noUnit || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Nama Part:</span>
                  <span className="font-bold text-stone-100">{selectedTrackingForUpdate.namaPart}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Jumlah Diminta:</span>
                  <span className="font-bold text-stone-200">
                    {selectedTrackingForUpdate.qtyDiminta} {selectedTrackingForUpdate.satuan}
                  </span>
                </div>
              </div>

              {/* Status Supply */}
              <div>
                <label className="block text-stone-400 font-bold mb-1">
                  Status Pemenuhan Barang *
                </label>
                <select
                  value={updateFormData.status}
                  onChange={(e) => {
                    const st = e.target.value as SupplyFulfillmentStatus;
                    setUpdateFormData({
                      ...updateFormData,
                      status: st,
                      qtyDiterima: st === 'TERPENUHI' 
                        ? selectedTrackingForUpdate.qtyDiminta 
                        : st === 'PENDING' 
                        ? 0 
                        : updateFormData.qtyDiterima,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold focus:ring-1 focus:ring-amber-500"
                >
                  <option value="PENDING">Belum Disupply (Outstanding)</option>
                  <option value="PARSIAL">Supply Parsial / Sebagian</option>
                  <option value="TERPENUHI">Terpenuhi Lengkap</option>
                </select>
              </div>

              {/* Qty Diterima */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Qty Diterima di Site *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedTrackingForUpdate.qtyDiminta}
                    value={updateFormData.qtyDiterima}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, qtyDiterima: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Tanggal Tiba di Workshop
                  </label>
                  <input
                    type="date"
                    value={updateFormData.tanggalSupply}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, tanggalSupply: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                  />
                </div>
              </div>

              {/* No Surat Jalan Malang */}
              <div>
                <label className="block text-stone-400 font-bold mb-1">
                  No Surat Jalan / DO / Resi Malang
                </label>
                <input
                  type="text"
                  value={updateFormData.noSuratJalanMalang}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, noSuratJalanMalang: e.target.value })}
                  placeholder="Contoh: DO-MLG-260199 atau Resi Cargo"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-stone-400 font-bold mb-1">
                  Catatan Penerimaan
                </label>
                <input
                  type="text"
                  value={updateFormData.catatan}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, catatan: e.target.value })}
                  placeholder="Kondisi barang, kekurangan part, dll."
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setSelectedTrackingForUpdate(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SPB NON-UNIT */}
      <NonUnitRequestModal
        isOpen={showNonUnitModal}
        onClose={() => setShowNonUnitModal(false)}
        currentUser={currentUser}
        manpowerList={manpowerList}
        onSubmitPR={handleCreateNonUnitPR}
      />
    </div>
  );
};
