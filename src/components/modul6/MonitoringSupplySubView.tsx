import React, { useState, useEffect, useMemo } from 'react';
import { 
  BreakdownRecord, 
  PartSupplyItemTracking, 
  SupplyFulfillmentStatus, 
  NonUnitPurchaseRequest,
  UserAccount,
  ManpowerData
} from '../../types';
import { 
  syncBreakdownPartsToSupplyTrackings,
  updatePartSupplyStatus, 
  quickTogglePartSupplyStatus,
  getAllNonUnitPurchaseRequests,
  createNonUnitPurchaseRequest,
  deleteNonUnitPurchaseRequest,
  isDeveloper,
  canUserPrintPreviewModule
} from '../../utils/storage';
import { NonUnitRequestModal } from './NonUnitRequestModal';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Minus,
  RotateCcw, 
  Truck, 
  FileText, 
  Check, 
  Edit3, 
  X, 
  Save, 
  Printer, 
  Trash2,
  Package,
  Calendar
} from 'lucide-react';

interface MonitoringSupplySubViewProps {
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  canInsert: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canPrintPreview?: boolean;
  manpowerList?: ManpowerData[];
  onRefreshData?: () => void;
}

interface UnitSupplyGroup {
  groupKey: string;
  sourceType: 'UNIT_BREAKDOWN' | 'NON_UNIT';
  refNumber: string;
  noUnit: string;
  namaAlat: string;
  earliestReqDate: string;
  items: PartSupplyItemTracking[];
  partCount: number;
  jasaCount: number;
  completedCount: number;
  partialCount: number;
  pendingCount: number;
  overallStatus: SupplyFulfillmentStatus;
}

export const MonitoringSupplySubView: React.FC<MonitoringSupplySubViewProps> = ({
  breakdowns,
  currentUser,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  canPrintPreview,
  manpowerList = [],
  onRefreshData,
}) => {
  const hasPrintAccess = canPrintPreview ?? (isDeveloper(currentUser) || canUserPrintPreviewModule(currentUser, 6));

  // State data tracking & non-unit SPB
  const [supplyTrackings, setSupplyTrackings] = useState<PartSupplyItemTracking[]>([]);
  const [nonUnitRequests, setNonUnitRequests] = useState<NonUnitPurchaseRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Collapsible Per-Unit State (Konsep sama seperti Modul 3 Update BD)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [activeSourceTab, setActiveSourceTab] = useState<'ALL' | 'UNIT' | 'NON_UNIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupplyFulfillmentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal SPB Non Unit & Konfirmasi Hapus (no window.confirm)
  const [showNonUnitModal, setShowNonUnitModal] = useState<boolean>(false);
  const [confirmDeletePr, setConfirmDeletePr] = useState<NonUnitPurchaseRequest | null>(null);

  // Modal Print Preview
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Modal Catat Kedatangan Supply & Tanggal Req / Datang
  const [selectedTrackingForUpdate, setSelectedTrackingForUpdate] = useState<PartSupplyItemTracking | null>(null);
  const [updateFormData, setUpdateFormData] = useState<{
    status: SupplyFulfillmentStatus;
    qtyDiterima: number;
    tanggalRequest: string;
    tanggalSupply: string;
    noSuratJalanMalang: string;
    catatan: string;
  }>({
    status: 'TERPENUHI',
    qtyDiterima: 1,
    tanggalRequest: '',
    tanggalSupply: new Date().toISOString().split('T')[0],
    noSuratJalanMalang: '',
    catatan: '',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAndSyncData = () => {
    setIsSyncing(true);
    try {
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

  useEffect(() => {
    const handleSyncEvent = () => {
      loadAndSyncData();
    };
    window.addEventListener('bkwa-firestore-synced', handleSyncEvent);
    return () => {
      window.removeEventListener('bkwa-firestore-synced', handleSyncEvent);
    };
  }, [breakdowns]);

  // Checklist Cepat (1-Klik toggle Belum Supply <-> Terpenuhi per Item)
  const handleQuickChecklist = (item: PartSupplyItemTracking) => {
    if (!canEdit) {
      setFeedback({ type: 'error', message: 'Anda tidak memiliki izin edit untuk memverifikasi supply barang/jasa!' });
      setTimeout(() => setFeedback(null), 3500);
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

  // Buka Modal Detail Tanggal Req, Tgl Datang, Qty Parsial & No DO
  const handleOpenUpdateModal = (item: PartSupplyItemTracking) => {
    if (!canEdit) {
      setFeedback({ type: 'error', message: 'Akses Ditolak: Anda tidak memiliki izin mengedit status supply.' });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    setSelectedTrackingForUpdate(item);
    setUpdateFormData({
      status: item.status === 'PENDING' ? 'TERPENUHI' : item.status,
      qtyDiterima: item.qtyDiterima > 0 ? item.qtyDiterima : item.qtyDiminta,
      tanggalRequest: item.tanggalRequest || '',
      tanggalSupply: item.tanggalSupply || new Date().toISOString().split('T')[0],
      noSuratJalanMalang: item.noSuratJalanMalang || '',
      catatan: item.catatan || '',
    });
  };

  // Simpan Detail Kedatangan & Tanggal Req
  const handleSaveSupplyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedback({ type: 'error', message: 'Akses Ditolak: Anda tidak memiliki izin menyimpan perubahan supply.' });
      setSelectedTrackingForUpdate(null);
      return;
    }
    if (!selectedTrackingForUpdate) return;

    const res = updatePartSupplyStatus(selectedTrackingForUpdate.id, updateFormData.status, {
      qtyDiterima: updateFormData.qtyDiterima,
      tanggalRequest: updateFormData.tanggalRequest || undefined,
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

  const handleCreateNonUnitPR = (data: any) => {
    if (!canInsert) {
      return {
        success: false,
        message: 'Akses Ditolak: Anda tidak memiliki izin membuat SPB Non-Unit.',
      };
    }
    const res = createNonUnitPurchaseRequest(data);
    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
    }
    return res;
  };

  const handleConfirmDeleteNonUnitPR = () => {
    if (!confirmDeletePr) return;
    if (!canDelete) {
      setFeedback({ type: 'error', message: 'Akses Ditolak: Anda tidak memiliki izin menghapus SPB Non-Unit.' });
      setConfirmDeletePr(null);
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    const res = deleteNonUnitPurchaseRequest(confirmDeletePr.id);
    setConfirmDeletePr(null);
    if (res.success) {
      loadAndSyncData();
      if (onRefreshData) onRefreshData();
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Filter item tracking sesuai Source, Status & Search
  const filteredTrackings = useMemo(() => {
    return supplyTrackings.filter((item) => {
      if (activeSourceTab === 'UNIT' && item.sourceType !== 'UNIT_BREAKDOWN') return false;
      if (activeSourceTab === 'NON_UNIT' && item.sourceType !== 'NON_UNIT') return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = (item.refNumber || '').toLowerCase().includes(q);
        const matchUnit = (item.noUnit || '').toLowerCase().includes(q);
        const matchAlat = (item.namaAlat || '').toLowerCase().includes(q);
        const matchPart = (item.namaPart || '').toLowerCase().includes(q);
        const matchPn = (item.partNumber || '').toLowerCase().includes(q);
        const matchDO = (item.noSuratJalanMalang || '').toLowerCase().includes(q);
        const matchJenis = (item.jenis || 'Part').toLowerCase().includes(q);
        if (!matchRef && !matchUnit && !matchAlat && !matchPart && !matchPn && !matchDO && !matchJenis) {
          return false;
        }
      }
      return true;
    });
  }, [supplyTrackings, activeSourceTab, statusFilter, searchQuery]);

  // Kelompokkan Per Unit / No MO (atau Per SPB Non-Unit) — Konsep sama dengan Update BD
  const groupedUnits = useMemo<UnitSupplyGroup[]>(() => {
    const map = new Map<string, PartSupplyItemTracking[]>();

    filteredTrackings.forEach((item) => {
      const gKey =
        item.sourceType === 'UNIT_BREAKDOWN'
          ? `UNIT_${item.breakdownId || item.refNumber}_${item.noUnit || '-'}`
          : `NONUNIT_${item.refNumber}`;
      const existing = map.get(gKey) || [];
      existing.push(item);
      map.set(gKey, existing);
    });

    const groups: UnitSupplyGroup[] = [];
    map.forEach((items, groupKey) => {
      const first = items[0];
      const partCount = items.filter((i) => (i.jenis || 'Part') === 'Part').length;
      const jasaCount = items.filter((i) => i.jenis === 'Jasa').length;
      const completedCount = items.filter((i) => i.status === 'TERPENUHI').length;
      const partialCount = items.filter((i) => i.status === 'PARSIAL').length;
      const pendingCount = items.filter((i) => i.status === 'PENDING').length;

      let overallStatus: SupplyFulfillmentStatus = 'PENDING';
      if (completedCount === items.length && items.length > 0) {
        overallStatus = 'TERPENUHI';
      } else if (completedCount > 0 || partialCount > 0) {
        overallStatus = 'PARSIAL';
      }

      const reqDates = items.map((i) => i.tanggalRequest).filter((d): d is string => Boolean(d)).sort();

      groups.push({
        groupKey,
        sourceType: first.sourceType,
        refNumber: first.refNumber,
        noUnit: first.sourceType === 'NON_UNIT' ? 'NON-UNIT WORKSHOP' : (first.noUnit || '-'),
        namaAlat: first.namaAlat || '-',
        earliestReqDate: reqDates[0] || '-',
        items,
        partCount,
        jasaCount,
        completedCount,
        partialCount,
        pendingCount,
        overallStatus,
      });
    });

    // Prioritaskan unit yang belum selesai di atas agar mudah dikontrol
    return groups.sort((a, b) => {
      const rank = (st: SupplyFulfillmentStatus) => (st === 'PENDING' ? 0 : st === 'PARSIAL' ? 1 : 2);
      const diff = rank(a.overallStatus) - rank(b.overallStatus);
      if (diff !== 0) return diff;
      return b.refNumber.localeCompare(a.refNumber);
    });
  }, [filteredTrackings]);

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedGroupKeys.size === groupedUnits.length && groupedUnits.length > 0) {
      setExpandedGroupKeys(new Set());
    } else {
      setExpandedGroupKeys(new Set(groupedUnits.map((g) => g.groupKey)));
    }
  };

  // Print WYSIWYG via hidden iframe (aman di iframe preview & tanpa dark artifact)
  const handleDirectPrint = () => {
    const targetEl = document.getElementById('printable-monitoring-supply-area');
    if (!targetEl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Monitoring Supply Part & Jasa - PT BKWA</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 10px; background: #fff; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
            th { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 6px; margin-bottom: 8px; }
            .header h2 { margin: 0; font-size: 15px; font-weight: 900; }
            .header h3 { margin: 3px 0 0 0; font-size: 12px; font-weight: bold; }
            .header p { margin: 2px 0 0 0; font-size: 9px; color: #555; }
          </style>
        </head>
        <body>${targetEl.innerHTML}</body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }, 250);
  };

  // Statistik KPI
  const stats = useMemo(() => {
    const totalItems = supplyTrackings.length;
    const pendingItems = supplyTrackings.filter((i) => i.status === 'PENDING').length;
    const partialItems = supplyTrackings.filter((i) => i.status === 'PARSIAL').length;
    const completedItems = supplyTrackings.filter((i) => i.status === 'TERPENUHI').length;
    const unitItems = supplyTrackings.filter((i) => i.sourceType === 'UNIT_BREAKDOWN').length;
    const nonUnitItems = supplyTrackings.filter((i) => i.sourceType === 'NON_UNIT').length;
    const jasaCount = supplyTrackings.filter((i) => i.jenis === 'Jasa').length;
    const partCount = totalItems - jasaCount;
    const fulfillmentRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      pendingItems,
      partialItems,
      completedItems,
      unitItems,
      nonUnitItems,
      partCount,
      jasaCount,
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
              <span>Monitoring Supply &amp; Outstanding Part / Jasa (Per Unit)</span>
            </h3>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Klik tombol <strong className="text-amber-400 font-mono">+</strong> pada No. Unit untuk melihat daftar kebutuhan Part &amp; Jasa, cek tanggal request, dan verifikasi checklist kapan supply datang.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadAndSyncData}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold border border-stone-700 transition cursor-pointer"
              title="Sinkronisasi ulang dengan Modul 3"
            >
              <RotateCcw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Data'}</span>
            </button>

            {canInsert && (
              <button
                type="button"
                onClick={() => setShowNonUnitModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
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
            <span className="text-[10px] text-stone-500 block uppercase">Total Kebutuhan</span>
            <span className="text-lg font-bold text-stone-100 tabular-nums">
              {stats.totalItems} <span className="text-xs font-normal text-stone-400">Item</span>
            </span>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {stats.partCount} Part · {stats.jasaCount} Jasa
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Outstanding (Belum Datang)</span>
            <span className="text-lg font-bold text-rose-400 tabular-nums">
              {stats.pendingItems} <span className="text-xs font-normal text-rose-300">Item</span>
            </span>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Menunggu Supply / Jasa</div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Supply Parsial</span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              {stats.partialItems} <span className="text-xs font-normal text-amber-300">Item</span>
            </span>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Tiba Sebagian</div>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[10px] text-stone-500 block uppercase">Terpenuhi Lengkap</span>
            <span className="text-lg font-bold text-emerald-400 tabular-nums">
              {stats.completedItems} <span className="text-xs font-normal text-emerald-300">Item</span>
            </span>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">Terverifikasi</div>
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

      {/* FILTER, SEARCH & EXPAND ALL CONTROLS */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* SEGMENTED SOURCE TABS */}
          <div className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-xl border border-stone-800 self-start flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSourceTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSourceTab === 'ALL'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua ({stats.totalItems})
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceTab('UNIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSourceTab === 'UNIT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Unit Breakdown ({stats.unitItems})
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceTab('NON_UNIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSourceTab === 'NON_UNIT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              SPB Non-Unit ({stats.nonUnitItems})
            </button>
          </div>

          {/* EXPAND ALL, STATUS FILTER, SEARCH, PRINT */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-700 hover:border-amber-500 text-stone-300 hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              title="Buka atau tutup rincian Part & Jasa semua unit sekaligus"
            >
              {expandedGroupKeys.size === groupedUnits.length && groupedUnits.length > 0 ? (
                <>
                  <Minus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tutup Semua (-)</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buka Semua (+)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Outstanding</option>
                <option value="PARSIAL">Supply Parsial</option>
                <option value="TERPENUHI">Terpenuhi</option>
              </select>
            </div>

            <div className="relative w-full sm:w-auto sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Unit, No MO, Part, Jasa..."
                className="w-full pl-8 pr-6 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs placeholder:text-stone-500 focus:ring-1 focus:ring-amber-500"
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

            {hasPrintAccess && (
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700 transition cursor-pointer"
                title="Print Preview Monitoring Supply Per Unit"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Preview</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABEL PER UNIT COLLAPSIBLE (+) — KONSEP SAMA SEPERTI UPDATE BD */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="px-5 py-3 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
              Kontrol Supply Part &amp; Jasa Per Unit
            </span>
            <span className="text-xs text-stone-500">
              ({groupedUnits.length} Unit/SPB · {filteredTrackings.length} Item)
            </span>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <span>Klik tombol</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-stone-800 border border-stone-700 text-amber-400 font-bold text-[10px]">+</span>
            <span>untuk verifikasi checklist (<Check className="w-3.5 h-3.5 text-emerald-400 inline" />) kapan barang/jasa req &amp; datang</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-950/80 text-stone-400 text-[10px] uppercase tracking-wider border-b border-stone-800">
              <tr>
                <th className="px-3 py-3 w-12 text-center">+</th>
                <th className="px-3 py-3 w-10 text-center">No</th>
                <th className="px-3 py-3 min-w-[160px]">No. Unit &amp; Alat</th>
                <th className="px-3 py-3 w-40">Reff No. MO / SPB</th>
                <th className="px-3 py-3 w-32">Tgl Req Awal</th>
                <th className="px-3 py-3 w-40">Kebutuhan</th>
                <th className="px-3 py-3 w-48">Progress Supply</th>
                <th className="px-3 py-3 w-36 text-center">Status Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-200">
              {groupedUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-500">
                    <Package className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-stone-400">
                      Tidak ada data kebutuhan Part atau Jasa yang sesuai dengan filter.
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Kebutuhan Part &amp; Jasa dari Modul 3 Update Breakdown otomatis muncul terkelompok per unit di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                groupedUnits.map((group, gIdx) => {
                  const isExpanded = expandedGroupKeys.has(group.groupKey);
                  const pct = group.items.length > 0 ? Math.round((group.completedCount / group.items.length) * 100) : 0;

                  return (
                    <React.Fragment key={group.groupKey}>
                      {/* LEVEL 1: BARIS PER UNIT / NO MO */}
                      <tr
                        className={`hover:bg-stone-800/40 transition ${
                          isExpanded ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : ''
                        }`}
                      >
                        {/* Tombol Collapse / Expand (+) */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.groupKey)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition mx-auto cursor-pointer ${
                              isExpanded
                                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                                : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700'
                            }`}
                            title={isExpanded ? 'Tutup List Kebutuhan Part & Jasa' : 'Buka List Kebutuhan Part & Jasa (+)'}
                          >
                            {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </td>

                        <td className="px-3 py-3 text-center text-stone-500 tabular-nums">
                          {gIdx + 1}
                        </td>

                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.groupKey)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-stone-100 group-hover:text-amber-300 transition flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{group.noUnit}</span>
                            </div>
                            <div className="text-[10px] text-stone-400 font-sans truncate max-w-[200px]">
                              {group.namaAlat}
                            </div>
                          </button>
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-bold text-amber-400 tabular-nums">{group.refNumber}</div>
                          <div className="text-[10px] text-stone-500">
                            {group.sourceType === 'UNIT_BREAKDOWN' ? 'Update BD Modul 3' : 'SPB Non-Unit'}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-stone-300 tabular-nums text-[11px]">
                          {group.earliestReqDate}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {group.partCount > 0 && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                {group.partCount} Part
                              </span>
                            )}
                            {group.jasaCount > 0 && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                {group.jasaCount} Jasa
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-stone-200 tabular-nums">
                              {group.completedCount} / {group.items.length} Terpenuhi
                            </span>
                            <span className="text-stone-400 tabular-nums">{pct}%</span>
                          </div>
                          <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                group.overallStatus === 'TERPENUHI'
                                  ? 'bg-emerald-500'
                                  : group.overallStatus === 'PARSIAL'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              group.overallStatus === 'TERPENUHI'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : group.overallStatus === 'PARSIAL'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {group.overallStatus === 'TERPENUHI'
                              ? 'TERPENUHI'
                              : group.overallStatus === 'PARSIAL'
                              ? 'PARSIAL'
                              : 'OUTSTANDING'}
                          </span>
                        </td>
                      </tr>

                      {/* LEVEL 2: LIST KEBUTUHAN PART & JASA UNIT INI (EXPANDED) */}
                      {isExpanded && (
                        <tr className="bg-stone-950/90 border-b border-stone-800">
                          <td colSpan={8} className="p-3 sm:p-4">
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 border-l-4 border-l-amber-500 space-y-3 shadow-2xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    MO / SPB: {group.refNumber}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                                    List Kebutuhan Part &amp; Jasa — {group.noUnit} ({group.namaAlat})
                                  </h4>
                                </div>
                                <span className="text-[11px] text-stone-400">
                                  Verifikasi tiap item via tombol Checklist (<Check className="w-3 h-3 text-emerald-400 inline" />) atau Edit Detail Tanggal
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-stone-800">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-stone-950 text-[10px] uppercase text-stone-400 border-b border-stone-800">
                                    <tr>
                                      <th className="px-2.5 py-2 w-10 text-center">No</th>
                                      <th className="px-2.5 py-2 w-20 text-center">Jenis</th>
                                      <th className="px-2.5 py-2 min-w-[180px]">Nama Part / Jasa</th>
                                      <th className="px-2.5 py-2 w-32">Part Number</th>
                                      <th className="px-2.5 py-2 w-20 text-right">Diminta</th>
                                      <th className="px-2.5 py-2 w-20 text-right">Disupply</th>
                                      <th className="px-2.5 py-2 w-28">Tgl Req</th>
                                      <th className="px-2.5 py-2 w-28">Tgl Datang</th>
                                      <th className="px-2.5 py-2 w-32">No Surat Jalan</th>
                                      <th className="px-2.5 py-2 w-28 text-center">Status</th>
                                      <th className="px-2.5 py-2 w-28 text-center">Verifikasi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-800/60">
                                    {group.items.map((item, idx) => {
                                      const isCompleted = item.status === 'TERPENUHI';
                                      const isPartial = item.status === 'PARSIAL';
                                      const isJasa = item.jenis === 'Jasa';

                                      return (
                                        <tr
                                          key={item.id}
                                          className={`hover:bg-stone-800/40 transition ${
                                            isCompleted ? 'bg-emerald-950/15' : isPartial ? 'bg-amber-950/15' : ''
                                          }`}
                                        >
                                          <td className="px-2.5 py-2.5 text-center text-stone-500 tabular-nums">
                                            {idx + 1}
                                          </td>
                                          <td className="px-2.5 py-2.5 text-center">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                isJasa
                                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                              }`}
                                            >
                                              {item.jenis || 'Part'}
                                            </span>
                                          </td>
                                          <td className="px-2.5 py-2.5 font-sans font-semibold text-stone-100">
                                            <div>{item.namaPart}</div>
                                            {item.catatan && (
                                              <div className="text-[10px] text-stone-400 italic mt-0.5">
                                                Catatan: {item.catatan}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-2.5 py-2.5 text-amber-300 font-bold">
                                            {item.partNumber || '-'}
                                          </td>
                                          <td className="px-2.5 py-2.5 text-right font-bold text-stone-200 tabular-nums">
                                            {item.qtyDiminta} <span className="text-[10px] text-stone-400 font-normal">{item.satuan}</span>
                                          </td>
                                          <td className="px-2.5 py-2.5 text-right font-bold tabular-nums">
                                            <span className={isCompleted ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-stone-500'}>
                                              {item.qtyDiterima || 0}
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-normal ml-0.5">{item.satuan}</span>
                                          </td>
                                          <td className="px-2.5 py-2.5 text-stone-300 tabular-nums text-[11px]">
                                            {item.tanggalRequest || '-'}
                                          </td>
                                          <td className="px-2.5 py-2.5 tabular-nums text-[11px]">
                                            {item.tanggalSupply ? (
                                              <span className="text-emerald-300 font-bold">{item.tanggalSupply}</span>
                                            ) : (
                                              <span className="text-stone-500">-</span>
                                            )}
                                          </td>
                                          <td className="px-2.5 py-2.5 text-stone-300 text-[11px]">
                                            {item.noSuratJalanMalang || '-'}
                                          </td>
                                          <td className="px-2.5 py-2.5 text-center">
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
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
                                          <td className="px-2.5 py-2.5 text-center">
                                            {canEdit ? (
                                              <div className="flex items-center justify-center gap-1.5">
                                                {/* Checklist Verifikasi 1-Klik */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleQuickChecklist(item)}
                                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                                    isCompleted
                                                      ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-sm shadow-emerald-500/30'
                                                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50'
                                                  }`}
                                                  title={isCompleted ? 'Terverifikasi Lengkap (Klik untuk batal)' : 'Verifikasi Checklist Terpenuhi (1-Klik)'}
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Edit Detail Tanggal Req / Tgl Datang / Parsial / DO */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenUpdateModal(item)}
                                                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 hover:text-amber-400 transition cursor-pointer"
                                                  title="Atur Tgl Req, Tgl Datang, Qty Parsial & No Surat Jalan"
                                                >
                                                  <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="text-[10px] text-stone-500">View Only</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                  <div className="text-[11px] text-stone-400 mt-1 line-clamp-2 font-sans">
                    {req.alasanPermintaan}
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                    <div>Pemohon: <span className="text-stone-200 font-bold">{req.pemohon}</span> ({req.jabatanPemohon})</div>
                    <div>Tanggal Req: <span className="text-stone-200">{req.tanggal}</span></div>
                    <div>Item: <span className="text-amber-400 font-bold">{req.items.length} Barang</span></div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500">
                    {req.noSuratJalanMalang ? `DO: ${req.noSuratJalanMalang}` : 'Belum ada DO'}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePr(req)}
                      className="p-1 text-stone-500 hover:text-rose-400 transition cursor-pointer"
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

      {/* MODAL KONFIRMASI HAPUS SPB NON-UNIT (INLINE MODAL TANPA window.confirm) */}
      {confirmDeletePr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-stone-100">Hapus SPB Non-Unit?</h4>
            </div>
            <p className="text-xs font-sans text-stone-300">
              Apakah Anda yakin ingin menghapus pengajuan <strong className="text-amber-400 font-mono">{confirmDeletePr.noPermintaan}</strong> beserta seluruh item monitoring-nya?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setConfirmDeletePr(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNonUnitPR}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI DETAIL SUPPLY (TGL REQ, TGL DATANG, PARSIAL, SURAT JALAN) */}
      {selectedTrackingForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-stone-100">
                  Verifikasi Supply &amp; Tanggal Request / Kedatangan
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

            <form onSubmit={handleSaveSupplyDetails} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">No Reff / No MO:</span>
                  <span className="font-bold text-amber-400">{selectedTrackingForUpdate.refNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Unit &amp; Jenis:</span>
                  <span className="font-bold text-stone-200">
                    {selectedTrackingForUpdate.noUnit || '-'} · {selectedTrackingForUpdate.jenis || 'Part'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Nama Part / Jasa:</span>
                  <span className="font-bold text-stone-100 text-right max-w-[260px] truncate">
                    {selectedTrackingForUpdate.namaPart}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Jumlah Diminta:</span>
                  <span className="font-bold text-stone-200">
                    {selectedTrackingForUpdate.qtyDiminta} {selectedTrackingForUpdate.satuan}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Status Pemenuhan *
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

                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Qty Diterima / Selesai *
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Tanggal Req (Kapan Req-nya)
                  </label>
                  <input
                    type="date"
                    value={updateFormData.tanggalRequest}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, tanggalRequest: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 font-bold mb-1">
                    Tanggal Datang / Disupply
                  </label>
                  <input
                    type="date"
                    value={updateFormData.tanggalSupply}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, tanggalSupply: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">
                  No Surat Jalan / DO / Resi Malang
                </label>
                <input
                  type="text"
                  value={updateFormData.noSuratJalanMalang}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, noSuratJalanMalang: e.target.value })}
                  placeholder="Contoh: DO-MLG-260199 atau Vendor Jasa"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-bold mb-1">
                  Catatan Penerimaan / Verifikasi
                </label>
                <input
                  type="text"
                  value={updateFormData.catatan}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, catatan: e.target.value })}
                  placeholder="Kondisi barang, kekurangan part, keterangan jasa..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                />
              </div>

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
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Verifikasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT PREVIEW MONITORING SUPPLY PER UNIT */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-stone-100">
                    PRINT PREVIEW MONITORING SUPPLY PART &amp; JASA PER UNIT
                  </h3>
                  <p className="text-[10px] text-stone-400 font-sans">
                    PT BATU KALI WELANG AMPUH (ETIKA09) • {groupedUnits.length} Unit/SPB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-stone-950">
              <div id="printable-monitoring-supply-area" className="bg-white text-stone-950 p-5 rounded-xl space-y-4">
                <div className="header text-center border-b-2 border-stone-800 pb-2">
                  <h2 className="text-base font-black uppercase font-mono">
                    PT. BATU KALI WELANG AMPUH (ETIKA09)
                  </h2>
                  <h3 className="text-xs font-bold font-mono text-amber-700">
                    LAPORAN MONITORING SUPPLY &amp; OUTSTANDING PART / JASA PER UNIT
                  </h3>
                  <p className="text-[9px] text-stone-600 font-mono">
                    Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {groupedUnits.map((group) => (
                  <div key={group.groupKey} className="border border-stone-400 rounded p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold bg-stone-100 p-1.5 border border-stone-300">
                      <span>
                        UNIT: {group.noUnit} ({group.namaAlat}) — REFF: {group.refNumber}
                      </span>
                      <span>
                        {group.completedCount}/{group.items.length} TERPENUHI ({group.overallStatus})
                      </span>
                    </div>
                    <table className="w-full text-left text-[10px] font-mono border-collapse">
                      <thead>
                        <tr className="bg-stone-50">
                          <th className="p-1 w-8 text-center">No</th>
                          <th className="p-1 w-14">Jenis</th>
                          <th className="p-1">Nama Part / Jasa</th>
                          <th className="p-1 w-28">Part Number</th>
                          <th className="p-1 w-14 text-right">Diminta</th>
                          <th className="p-1 w-14 text-right">Supply</th>
                          <th className="p-1 w-22">Tgl Req</th>
                          <th className="p-1 w-22">Tgl Datang</th>
                          <th className="p-1 w-24">No SJ</th>
                          <th className="p-1 w-22 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((it, i) => (
                          <tr key={it.id}>
                            <td className="p-1 text-center">{i + 1}</td>
                            <td className="p-1 font-bold">{it.jenis || 'Part'}</td>
                            <td className="p-1 font-sans">{it.namaPart}</td>
                            <td className="p-1">{it.partNumber || '-'}</td>
                            <td className="p-1 text-right">{it.qtyDiminta} {it.satuan}</td>
                            <td className="p-1 text-right font-bold">{it.qtyDiterima || 0} {it.satuan}</td>
                            <td className="p-1">{it.tanggalRequest || '-'}</td>
                            <td className="p-1">{it.tanggalSupply || '-'}</td>
                            <td className="p-1">{it.noSuratJalanMalang || '-'}</td>
                            <td className="p-1 text-center font-bold">
                              {it.status === 'TERPENUHI' ? 'TERPENUHI' : it.status === 'PARSIAL' ? 'PARSIAL' : 'OUTSTANDING'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPB NON-UNIT */}
      <NonUnitRequestModal
        isOpen={showNonUnitModal}
        onClose={() => setShowNonUnitModal(false)}
        currentUser={currentUser}
        canExport={canExport}
        canPrintPreview={hasPrintAccess}
        manpowerList={manpowerList}
        onSubmitPR={handleCreateNonUnitPR}
      />
    </div>
  );
};
