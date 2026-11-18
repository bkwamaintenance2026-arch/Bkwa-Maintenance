import React, { useState } from 'react';
import { 
  BreakdownRecord, 
  SparePartItem, 
  SparePartTransaction, 
  SparePartTransactionItem,
  PurchaseRequest,
  UserAccount 
} from '../../types';
import { 
  Wrench, 
  ShoppingCart, 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Truck, 
  Hash, 
  Eye, 
  ArrowRight,
  ExternalLink,
  Layers,
  Check,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import {
  extractBreakdownPartsJasa,
  getAllPartSupplyTrackings
} from '../../utils/storage';
import { OrderPartModal } from './OrderPartModal';
import { PermintaanBarangModal } from './PermintaanBarangModal';

interface TransaksiSparePartSubViewProps {
  breakdowns: BreakdownRecord[];
  spareParts: SparePartItem[];
  transactions: SparePartTransaction[];
  purchaseRequests: PurchaseRequest[];
  currentUser: UserAccount;
  canInsert: boolean;
  canEdit: boolean;
  onRecordTransaction: (data: Omit<SparePartTransaction, 'id' | 'noTransaksi' | 'createdAt' | 'status'>) => {
    success: boolean;
    message: string;
    transaction?: SparePartTransaction;
    shortageItems?: SparePartTransactionItem[];
  };
  onSubmitPurchaseRequest: (data: Omit<PurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'status'>) => {
    success: boolean;
    message: string;
    request?: PurchaseRequest;
  };
  onUpdatePRStatus?: (id: string, status: PurchaseRequest['status']) => void;
}

export const TransaksiSparePartSubView: React.FC<TransaksiSparePartSubViewProps> = ({
  breakdowns,
  spareParts,
  transactions,
  purchaseRequests,
  currentUser,
  canInsert,
  canEdit,
  onRecordTransaction,
  onSubmitPurchaseRequest,
  onUpdatePRStatus,
}) => {
  const canOrderPart = canInsert || canEdit;
  // Search & Filters for Breakdown List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL' | 'BREAKDOWN' | 'LIMIT OPERASI' | 'READY'>('ACTIVE');

  // Selected No MO to immediately display Daftar Kebutuhan Part & Jasa
  const [selectedMoBreakdownId, setSelectedMoBreakdownId] = useState<string | null>(null);

  // Modal State: Order Part
  const [selectedBreakdownForOrder, setSelectedBreakdownForOrder] = useState<BreakdownRecord | null>(null);
  const [isOrderPartOpen, setIsOrderPartOpen] = useState(false);

  // Modal State: Permintaan Barang (SPB)
  const [isPermintaanBarangOpen, setIsPermintaanBarangOpen] = useState(false);
  const [prInitialData, setPrInitialData] = useState<{
    noMaintenanceOrder: string;
    noUnit: string;
    namaAlat?: string;
    items: Array<{
      partNumber: string;
      namaBarang: string;
      qtyDiminta: number;
      satuan: string;
      keterangan?: string;
    }>;
  }>({
    noMaintenanceOrder: '',
    noUnit: '',
    namaAlat: '',
    items: [],
  });

  // Modal Detail Transaksi / PR
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<SparePartTransaction | null>(null);
  const [selectedPRDetail, setSelectedPRDetail] = useState<PurchaseRequest | null>(null);

  // Filter List Breakdown
  const filteredBreakdowns = breakdowns.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const mo = (b.noMaintenanceOrder || b.noNotifikasi || '').toLowerCase();
    const matchSearch =
      !q ||
      b.noUnit.toLowerCase().includes(q) ||
      mo.includes(q) ||
      (b.namaAlat && b.namaAlat.toLowerCase().includes(q)) ||
      (b.jenis && b.jenis.toLowerCase().includes(q)) ||
      (b.detailProblem && b.detailProblem.toLowerCase().includes(q));

    const isReady = (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() === 'READY';
    const matchStatus =
      statusFilter === 'ACTIVE'
        ? !isReady
        : statusFilter === 'ALL'
        ? true
        : b.statusUnit === statusFilter;
    return matchSearch && matchStatus;
  });

  // Handler klik No Maintenance Order -> Tampilkan Daftar List Kebutuhan Part & Jasa secara langsung
  const handleSelectMo = (b: BreakdownRecord) => {
    setSelectedMoBreakdownId((prev) => (prev === b.id ? null : b.id));
  };

  // Handler tombol Order Part -> Langsung buka modal Order Part dengan Part & Jasa terisi
  const handleOpenOrderPart = (b: BreakdownRecord) => {
    if (!canOrderPart) return;
    setSelectedMoBreakdownId(b.id);
    setSelectedBreakdownForOrder(b);
    setIsOrderPartOpen(true);
  };

  const selectedMoBreakdown = selectedMoBreakdownId
    ? breakdowns.find((b) => b.id === selectedMoBreakdownId) || null
    : null;
  const selectedMoPartsJasa = selectedMoBreakdown
    ? extractBreakdownPartsJasa(selectedMoBreakdown)
    : [];
  const allSupplyTrackings = getAllPartSupplyTrackings();

  // Handler pemicu Form Permintaan Barang dari Order Part Modal
  const handleTriggerPermintaanBarang = (params: {
    noMaintenanceOrder: string;
    noUnit: string;
    namaAlat?: string;
    items: Array<{
      partNumber: string;
      namaBarang: string;
      qtyDiminta: number;
      satuan: string;
      keterangan?: string;
    }>;
  }) => {
    if (!canInsert) return;
    setPrInitialData(params);
    setIsPermintaanBarangOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: LIST NO UNIT BREAKDOWN & REFF NO MAINTENANCE ORDER */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-mono font-bold text-stone-100 uppercase tracking-wide">
                Daftar Unit Breakdown &amp; Maintenance Order
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Pilih / klik <strong className="text-amber-400 font-mono">No. Maintenance Order</strong> untuk langsung menampilkan Daftar Kebutuhan Part &amp; Jasa sesuai Update Breakdown, lalu proses Order Part atau SPB.
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No MO / CN Unit / Alat..."
                className="w-full pl-9 pr-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ACTIVE">⚠️ Unit Sedang Breakdown (Aktif)</option>
              <option value="ALL">Semua Status (Termasuk READY)</option>
              <option value="BREAKDOWN">Status BREAKDOWN</option>
              <option value="LIMIT OPERASI">Status LIMIT OPERASI</option>
              <option value="READY">Status READY (Selesai)</option>
            </select>
          </div>
        </div>

        {/* Tabel Breakdown */}
        {filteredBreakdowns.length === 0 ? (
          <div className="py-10 text-center text-stone-500 font-mono text-xs">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30 text-stone-400" />
            <p>Tidak ada laporan breakdown unit yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-3 w-40">Reff No. Maintenance Order</th>
                  <th className="px-3 py-3 w-32">No. Unit (CN New)</th>
                  <th className="px-3 py-3 w-36">Nama Alat</th>
                  <th className="px-3 py-3 w-28">Jenis</th>
                  <th className="px-3 py-3 w-28">Tgl Masuk</th>
                  <th className="px-3 py-3">Problem Awal / Kerusakan</th>
                  <th className="px-3 py-3 w-28 text-center">Status Unit</th>
                  <th className="px-3 py-3 w-32 text-center">Aksi Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {filteredBreakdowns.map((b) => {
                  const moNumber = b.noMaintenanceOrder || b.noNotifikasi;
                  const isMoSelected = selectedMoBreakdownId === b.id;
                  const bParts = extractBreakdownPartsJasa(b);
                  const partCount = bParts.filter((p) => p.jenis !== 'Jasa').length;
                  const jasaCount = bParts.filter((p) => p.jenis === 'Jasa').length;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-stone-800/40 transition ${
                        isMoSelected ? 'bg-amber-950/25 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      {/* Klik No Maintenance Order -> Tampilkan Daftar List Kebutuhan Part & Jasa */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSelectMo(b)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition group active:scale-95 cursor-pointer ${
                            isMoSelected
                              ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                              : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border-amber-500/30'
                          }`}
                          title="Klik No MO untuk menampilkan Daftar Kebutuhan Part & Jasa dari Update Breakdown"
                        >
                          <Hash className={`w-3.5 h-3.5 ${isMoSelected ? 'text-stone-950' : 'text-amber-500 group-hover:text-stone-950'}`} />
                          <span>{moNumber}</span>
                          {bParts.length > 0 && (
                            <span
                              className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono ${
                                isMoSelected
                                  ? 'bg-stone-950/20 text-stone-950'
                                  : 'bg-stone-900 text-stone-200 border border-stone-700'
                              }`}
                            >
                              {partCount}P{jasaCount > 0 ? `/${jasaCount}J` : ''}
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-3 font-bold text-stone-100 whitespace-nowrap">
                        {b.noUnit}
                      </td>

                      <td className="px-3 py-3 text-stone-300 font-sans whitespace-nowrap">
                        {b.namaAlat || b.noLama || '-'}
                      </td>

                      <td className="px-3 py-3 text-stone-400 font-sans whitespace-nowrap">
                        {b.jenis || '-'}
                      </td>

                      <td className="px-3 py-3 text-stone-400 whitespace-nowrap">
                        {b.tanggal}
                      </td>

                      <td className="px-3 py-3 font-sans text-stone-300 max-w-xs truncate" title={b.detailProblem}>
                        <span className="text-amber-400 font-semibold mr-1">[{b.component}]</span>
                        {b.detailProblem}
                      </td>

                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.statusUnit === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : b.statusUnit === 'LIMIT OPERASI'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {b.statusUnit}
                        </span>
                      </td>

                      {/* Tombol Aksi Order Part */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {canOrderPart ? (
                          <button
                            type="button"
                            onClick={() => handleOpenOrderPart(b)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold shadow transition mx-auto cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Order Part</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectMo(b)}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 cursor-pointer"
                          >
                            {isMoSelected ? 'Tutup Detail' : 'Lihat Part'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PANEL LANGSUNG: DAFTAR LIST KEBUTUHAN PART & JASA SESUAI UPDATE BREAKDOWN UNTUK NO MO TERPILIH */}
        {selectedMoBreakdown && (
          <div className="mt-4 bg-stone-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-mono text-[10px] font-black">
                    MO: {selectedMoBreakdown.noMaintenanceOrder || selectedMoBreakdown.noNotifikasi}
                  </span>
                  <span className="text-sm font-mono font-bold text-stone-100">
                    Daftar Kebutuhan Part &amp; Jasa — Unit {selectedMoBreakdown.noUnit} ({selectedMoBreakdown.namaAlat || selectedMoBreakdown.jenis || '-'})
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-sans">
                  Sesuai input pada Modul 3 Update Breakdown · Komponen:{' '}
                  <span className="text-amber-300 font-semibold">{selectedMoBreakdown.component}</span> · Problem:{' '}
                  <span className="text-stone-200">{selectedMoBreakdown.detailProblem || '-'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canOrderPart && (
                  <button
                    type="button"
                    onClick={() => handleOpenOrderPart(selectedMoBreakdown)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold shadow transition cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Proses Order Part (Isi Otomatis)</span>
                  </button>
                )}

                {canInsert && selectedMoPartsJasa.some((p) => p.jenis !== 'Jasa') && (
                  <button
                    type="button"
                    onClick={() => {
                      const partItems = selectedMoPartsJasa
                        .filter((p) => p.jenis !== 'Jasa')
                        .map((p) => {
                          const stockMatch = spareParts.find(
                            (sp) =>
                              (p.partNumber && p.partNumber !== '-' && sp.partNumber.trim().toLowerCase() === p.partNumber.trim().toLowerCase()) ||
                              sp.namaBarang.trim().toLowerCase() === p.namaPart.trim().toLowerCase()
                          );
                          const currentStock = stockMatch ? stockMatch.qty : 0;
                          const shortage = currentStock < p.qty ? p.qty - currentStock : p.qty;
                          return {
                            partNumber: p.partNumber === '-' ? '' : p.partNumber,
                            namaBarang: p.namaPart,
                            qtyDiminta: shortage,
                            satuan: p.satuan,
                            keterangan: currentStock <= 0 ? 'Stok Gudang Kosong (Reff MO)' : `Stok Gudang: ${currentStock} ${p.satuan}`,
                          };
                        });

                      handleTriggerPermintaanBarang({
                        noMaintenanceOrder: selectedMoBreakdown.noMaintenanceOrder || selectedMoBreakdown.noNotifikasi,
                        noUnit: selectedMoBreakdown.noUnit,
                        namaAlat: selectedMoBreakdown.namaAlat || selectedMoBreakdown.noLama,
                        items: partItems,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buat SPB dari List Ini</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedMoBreakdownId(null)}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {selectedMoPartsJasa.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-stone-800 rounded-xl text-stone-500 font-mono text-xs">
                Belum ada daftar kebutuhan Spare Part maupun Jasa yang dicatat pada Update Breakdown untuk No. MO ini.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-stone-900 text-[10px] uppercase text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">No</th>
                      <th className="px-3 py-2.5 w-20 text-center">Jenis</th>
                      <th className="px-3 py-2.5">Nama Spare Part / Jasa</th>
                      <th className="px-3 py-2.5 w-36">Part Number (PN)</th>
                      <th className="px-3 py-2.5 w-24 text-right">Qty Diminta</th>
                      <th className="px-3 py-2.5 w-20">Satuan</th>
                      <th className="px-3 py-2.5 w-28">Tgl Req BD</th>
                      <th className="px-3 py-2.5 w-44">Cek Stok Gudang</th>
                      <th className="px-3 py-2.5 w-36 text-center">Status Supply Malang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {selectedMoPartsJasa.map((item, idx) => {
                      const isJasa = item.jenis === 'Jasa';
                      const matchedStock = !isJasa
                        ? spareParts.find(
                            (sp) =>
                              (item.partNumber && item.partNumber !== '-' && sp.partNumber.trim().toLowerCase() === item.partNumber.trim().toLowerCase()) ||
                              sp.namaBarang.trim().toLowerCase() === item.namaPart.trim().toLowerCase()
                          )
                        : undefined;
                      const stockQty = matchedStock ? matchedStock.qty : 0;
                      const isEnough = stockQty >= item.qty;

                      const moRef = selectedMoBreakdown.noMaintenanceOrder || selectedMoBreakdown.noNotifikasi;
                      const tracked = allSupplyTrackings.find(
                        (t) =>
                          (t.breakdownId === selectedMoBreakdown.id || t.refNumber === moRef) &&
                          t.namaPart.trim().toLowerCase() === item.namaPart.trim().toLowerCase()
                      );

                      return (
                        <tr key={`${item.namaPart}_${item.partNumber}_${idx}`} className="hover:bg-stone-900/60">
                          <td className="px-3 py-2.5 text-center text-stone-500">{idx + 1}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isJasa
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {item.jenis}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-sans font-bold text-stone-100">
                            {item.namaPart}
                          </td>
                          <td className="px-3 py-2.5 text-amber-300 font-bold">
                            {item.partNumber || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-stone-100 tabular-nums">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2.5 text-stone-300">
                            {item.satuan}
                          </td>
                          <td className="px-3 py-2.5 text-stone-400 tabular-nums">
                            {item.tanggalRequest || selectedMoBreakdown.tanggal}
                          </td>
                          <td className="px-3 py-2.5">
                            {isJasa ? (
                              <span className="text-[11px] text-purple-300">Jasa / Pekerjaan Luar</span>
                            ) : matchedStock ? (
                              stockQty <= 0 ? (
                                <span className="text-[11px] text-rose-400 font-bold">Kosong (0 {matchedStock.satuan})</span>
                              ) : isEnough ? (
                                <span className="text-[11px] text-emerald-400 font-bold">Tersedia: {stockQty} {matchedStock.satuan}</span>
                              ) : (
                                <span className="text-[11px] text-amber-400 font-bold">Kurang (Sisa {stockQty})</span>
                              )
                            ) : (
                              <span className="text-[11px] text-stone-500 italic">Belum ada di Master Stok</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tracked?.status === 'TERPENUHI'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : tracked?.status === 'PARSIAL'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {tracked?.status === 'TERPENUHI'
                                ? 'TERPENUHI'
                                : tracked?.status === 'PARSIAL'
                                ? 'PARSIAL'
                                : 'OUTSTANDING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: RIWAYAT TRANSAKSI PENGELUARAN SPARE PART */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-mono font-bold text-stone-100 uppercase tracking-wide">
                Riwayat Transaksi Spare Part ({transactions.length})
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Log pengeluaran suku cadang workshop yang telah diproses untuk perbaikan unit
              </p>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-stone-500 font-mono text-xs">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
            <p>Belum ada transaksi pengeluaran spare part tercatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-2.5 w-32">No. Transaksi</th>
                  <th className="px-3 py-2.5 w-28">Tgl / Jam</th>
                  <th className="px-3 py-2.5 w-36">Reff Maintenance Order</th>
                  <th className="px-3 py-2.5 w-28">No. Unit</th>
                  <th className="px-3 py-2.5">Suku Cadang Dikeluarkan</th>
                  <th className="px-3 py-2.5 w-32">Mekanik</th>
                  <th className="px-3 py-2.5 w-28 text-center">Status</th>
                  <th className="px-3 py-2.5 w-16 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-stone-800/40">
                    <td className="px-3 py-2.5 font-bold text-amber-400 whitespace-nowrap">
                      {trx.noTransaksi}
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">
                      {trx.tanggal} <span className="text-stone-500 text-[10px]">{trx.jam}</span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap font-bold">
                      {trx.noMaintenanceOrder}
                    </td>
                    <td className="px-3 py-2.5 text-stone-100 whitespace-nowrap font-bold">
                      {trx.noUnit}
                    </td>
                    <td className="px-3 py-2.5 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {trx.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-stone-800 text-[11px] text-stone-200 border border-stone-700/60"
                          >
                            <strong className="text-amber-400 font-mono">{it.partNumber || '-'}</strong>:{' '}
                            {it.namaBarang} ({it.qtyDiminta} {it.satuan})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 font-sans whitespace-nowrap">
                      {trx.pemohonMekanik}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trx.status === 'TERPENUHI'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : trx.status === 'SEBAGIAN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {trx.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedTransactionDetail(trx)}
                        className="p-1 rounded-lg bg-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-700 transition"
                        title="Lihat detail transaksi"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: DAFTAR PERMINTAAN BARANG / PURCHASE REQUEST (SPB) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-mono font-bold text-stone-100 uppercase tracking-wide">
                Daftar Form Permintaan Barang ({purchaseRequests.length})
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Pengajuan pengadaan suku cadang yang stoknya kosong atau tidak mencukupi di inventory
              </p>
            </div>
          </div>

          {canInsert && (
            <button
              type="button"
              onClick={() => {
                setPrInitialData({
                  noMaintenanceOrder: '',
                  noUnit: '',
                  namaAlat: '',
                  items: [],
                });
                setIsPermintaanBarangOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-mono font-bold transition"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Buat Form SPB Manual</span>
            </button>
          )}
        </div>

        {purchaseRequests.length === 0 ? (
          <div className="py-8 text-center text-stone-500 font-mono text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
            <p>Belum ada form permintaan barang yang diajukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-2.5 w-32">No. SPB</th>
                  <th className="px-3 py-2.5 w-28">Tanggal</th>
                  <th className="px-3 py-2.5 w-36">Reff MO</th>
                  <th className="px-3 py-2.5 w-28">No. Unit</th>
                  <th className="px-3 py-2.5">Suku Cadang yang Diajukan</th>
                  <th className="px-3 py-2.5 w-28">Urgensi</th>
                  <th className="px-3 py-2.5 w-32">Pemohon</th>
                  <th className="px-3 py-2.5 w-28 text-center">Status SPB</th>
                  <th className="px-3 py-2.5 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {purchaseRequests.map((pr) => (
                  <tr key={pr.id} className="hover:bg-stone-800/40">
                    <td className="px-3 py-2.5 font-bold text-amber-400 whitespace-nowrap">
                      {pr.noPermintaan}
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">
                      {pr.tanggal}
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap font-bold">
                      {pr.noMaintenanceOrder || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-stone-100 whitespace-nowrap font-bold">
                      {pr.noUnit || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-sans">
                      <div className="flex flex-wrap gap-1">
                        {pr.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-stone-800 text-[11px] text-stone-200 border border-stone-700/60"
                          >
                            <strong className="text-amber-400 font-mono">{it.partNumber || '-'}</strong>:{' '}
                            {it.namaBarang} ({it.qtyDiminta} {it.satuan})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.urgensi === 'EMERGENCY'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : pr.urgensi === 'URGENT'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {pr.urgensi}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 font-sans whitespace-nowrap">
                      {pr.pemohon}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.status === 'SELESAI'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : pr.status === 'DIBELI'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : pr.status === 'DISETUJUI'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedPRDetail(pr)}
                        className="p-1 rounded-lg bg-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-700 transition"
                        title="Lihat detail SPB"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ORDER PART (DENGAN PEMOTONGAN STOK & AKSI PERMINTAAN BARANG) */}
      <OrderPartModal
        isOpen={isOrderPartOpen}
        onClose={() => {
          setIsOrderPartOpen(false);
          setSelectedBreakdownForOrder(null);
        }}
        breakdown={selectedBreakdownForOrder}
        availableSpareParts={spareParts}
        currentUser={currentUser}
        canCreatePR={canInsert}
        onRecordTransaction={onRecordTransaction}
        onRequestPermintaanBarang={handleTriggerPermintaanBarang}
      />

      {/* MODAL 2: FORM PERMINTAAN BARANG */}
      <PermintaanBarangModal
        isOpen={isPermintaanBarangOpen}
        onClose={() => setIsPermintaanBarangOpen(false)}
        noMaintenanceOrder={prInitialData.noMaintenanceOrder}
        noUnit={prInitialData.noUnit}
        namaAlat={prInitialData.namaAlat}
        initialItems={prInitialData.items}
        currentUser={currentUser}
        onSubmitPR={onSubmitPurchaseRequest}
      />

      {/* MODAL DETAIL TRANSAKSI */}
      {selectedTransactionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold text-stone-100">
                  DETAIL TRANSAKSI: {selectedTransactionDetail.noTransaksi}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransactionDetail(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 text-xs font-mono">
              <div>
                <span className="text-stone-500 block text-[10px]">TANGGAL &amp; JAM:</span>
                <span className="text-stone-200 font-bold">{selectedTransactionDetail.tanggal} {selectedTransactionDetail.jam}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">NO. MAINTENANCE ORDER:</span>
                <span className="text-amber-400 font-bold">{selectedTransactionDetail.noMaintenanceOrder}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">NO. UNIT &amp; ALAT:</span>
                <span className="text-stone-200 font-bold">{selectedTransactionDetail.noUnit} - {selectedTransactionDetail.namaAlat || '-'}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">MEKANIK PEMOHON:</span>
                <span className="text-stone-200 font-bold">{selectedTransactionDetail.pemohonMekanik}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold text-stone-300 uppercase mb-2">Item Suku Cadang:</h4>
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-stone-950 text-[10px] text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">No</th>
                      <th className="px-3 py-2">Part Number</th>
                      <th className="px-3 py-2">Nama Barang</th>
                      <th className="px-3 py-2 text-center">Qty Diminta</th>
                      <th className="px-3 py-2 text-center">Qty Dikeluarkan</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {selectedTransactionDetail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-center text-stone-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-amber-400">{it.partNumber || '-'}</td>
                        <td className="px-3 py-2 text-stone-200 font-sans">{it.namaBarang}</td>
                        <td className="px-3 py-2 text-center text-stone-300">{it.qtyDiminta} {it.satuan}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-400">{it.qtyDikeluarkan} {it.satuan}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            it.statusKetersediaan === 'TERSEDIA'
                              ? 'text-emerald-400'
                              : it.statusKetersediaan === 'SEBAGIAN'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}>
                            {it.statusKetersediaan}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PR */}
      {selectedPRDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-mono font-bold text-stone-100">
                  DETAIL FORM SPB: {selectedPRDetail.noPermintaan}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPRDetail(null)}
                className="text-stone-400 hover:text-stone-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 text-xs font-mono">
              <div>
                <span className="text-stone-500 block text-[10px]">TANGGAL PENGAJUAN:</span>
                <span className="text-stone-200 font-bold">{selectedPRDetail.tanggal} {selectedPRDetail.jam}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">REFF MAINTENANCE ORDER:</span>
                <span className="text-amber-400 font-bold">{selectedPRDetail.noMaintenanceOrder || '-'}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">NO. UNIT &amp; ALAT:</span>
                <span className="text-stone-200 font-bold">{selectedPRDetail.noUnit || '-'} ({selectedPRDetail.namaAlat || '-'})</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">PEMOHON &amp; URGENSI:</span>
                <span className="text-stone-200 font-bold">{selectedPRDetail.pemohon} ({selectedPRDetail.urgensi})</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold text-stone-300 uppercase mb-2">Item yang Diajukan:</h4>
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-stone-950 text-[10px] text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">No</th>
                      <th className="px-3 py-2">Part Number</th>
                      <th className="px-3 py-2">Nama Barang</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {selectedPRDetail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-center text-stone-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-amber-400">{it.partNumber || '-'}</td>
                        <td className="px-3 py-2 text-stone-200 font-sans">{it.namaBarang}</td>
                        <td className="px-3 py-2 text-center font-bold text-stone-100">{it.qtyDiminta} {it.satuan}</td>
                        <td className="px-3 py-2 text-stone-400 text-[11px] font-sans">{it.keterangan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {onUpdatePRStatus && canEdit && (
              <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs font-mono">
                <span className="text-stone-400">Update Status Pengadaan:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePRStatus(selectedPRDetail.id, 'DISETUJUI');
                      setSelectedPRDetail(null);
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 transition font-bold"
                  >
                    Setujui SPB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePRStatus(selectedPRDetail.id, 'DIBELI');
                      setSelectedPRDetail(null);
                    }}
                    className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white transition font-bold"
                  >
                    Tandai Dibeli
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePRStatus(selectedPRDetail.id, 'SELESAI');
                      setSelectedPRDetail(null);
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-stone-950 transition font-bold"
                  >
                    Selesai (Diterima)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
