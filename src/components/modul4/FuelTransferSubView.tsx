import React, { useState, useMemo } from 'react';
import { 
  FuelTransferRecord, 
  FuelDistributionRecord,
  ManpowerData, 
  UserAccount,
  InventoryPeriodBalance
} from '../../types';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Gauge, 
  Calendar, 
  Clock, 
  User, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  Warehouse,
  Lock,
  Sparkles,
  DollarSign,
  FileDown,
  Eye
} from 'lucide-react';
import { TimeInput24Hour } from '../common/TimeInput24Hour';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { FogValidationBar, useFogSignatories } from './FogValidationBar';
import {
  FogDateSortToolbar,
  matchesDateRange,
  formatPeriodeLabel,
  getTimestampMs,
} from './FogDateRangeBar';
import { generateFogTableReportPDF } from '../../utils/pdfGenerator';
import {
  isDeveloper,
  canUserInsertModule,
  canUserEditModule,
  canUserDeleteModule,
  canUserExportModule,
  canUserPrintPreviewModule,
} from '../../utils/storage';

interface FuelTransferSubViewProps {
  fuelTransfers: FuelTransferRecord[];
  fuelDistributions?: FuelDistributionRecord[];
  periodBalance?: InventoryPeriodBalance;
  standardSolarPrice?: number;
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onOpenExportPDF?: () => void;
  onSave: (
    data: Omit<FuelTransferRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelTransferRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const FuelTransferSubView: React.FC<FuelTransferSubViewProps> = ({
  fuelTransfers,
  fuelDistributions = [],
  periodBalance,
  standardSolarPrice = 6800,
  manpowerList,
  currentUser,
  onOpenExportPDF,
  onSave,
  onDelete,
}) => {
  const isDev = isDeveloper(currentUser);
  const canInsert = isDev || canUserInsertModule(currentUser, 4);
  const canEdit = isDev || canUserEditModule(currentUser, 4);
  const canDelete = isDev || canUserDeleteModule(currentUser, 4);
  const canExport = isDev || canUserExportModule(currentUser, 4);
  const canPrintPreview = isDev || canUserPrintPreviewModule(currentUser, 4);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'DRIVER' | 'DATE' | 'QTY_DESC'>('DATE_DESC');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canSubmitForm = editingId ? canEdit : canInsert;
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Validasi 3 Pihak & Direct Print Preview (seperti Modul 3)
  const { signatories, resolved: resolvedSig, updateSignatories, saveSignatories } = useFogSignatories(manpowerList, currentUser);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewDownloadFn, setPreviewDownloadFn] = useState<(() => void) | null>(null);

  // Form states:
  // a. Tanggal & jam
  // b. Nama Driver FT (dropdown reff seluruh nama Manpower di modul 2)
  // c. PIC FOG (dropdown reff nama Manpower di modul 2)
  // d. Flowmeter Start
  // e. Flowmeter STop
  // f. Qty
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [namaDriverFt, setNamaDriverFt] = useState('');
  const [driverFtJabatan, setDriverFtJabatan] = useState('');
  const [picFog, setPicFog] = useState('');
  const [picFogJabatan, setPicFogJabatan] = useState('');
  const [flowmeterStart, setFlowmeterStart] = useState<number | ''>('');
  const [flowmeterStop, setFlowmeterStop] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>('');
  const [remark, setRemark] = useState('');

  // DAFTAR SELURUH NAMA KARYAWAN (Dari Modul 2 Manpower)
  // Memuat seluruh nama karyawan tanpa memfilter jabatan agar driver FT dapat dipilih bebas
  const allEmployeesList = useMemo(() => {
    return [...manpowerList].sort((a, b) => {
      const cmpNama = (a.nama || '').localeCompare(b.nama || '', 'id');
      if (cmpNama !== 0) return cmpNama;
      return (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
    });
  }, [manpowerList]);

  // Logika Saldo Solar Tanki Truck FT-01 (Jumlah Qty solar pada Tanki Truck):
  // Saldo FT periode sebelumnya + data Transfer Fuel baru dikurangi pengisian ke unit di lapangan (Distribusi Fuel)
  // (Tanpa nominal uang karena solar industri)
  const saldoFTLalu = Number(periodBalance?.sisaPeriodeLaluFuelFT || 0);
  const totalTransferFuel = useMemo(() => {
    return fuelTransfers.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [fuelTransfers]);

  const totalDistribusiFuel = useMemo(() => {
    return fuelDistributions.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [fuelDistributions]);

  const stokSolarTankiTruck = saldoFTLalu + totalTransferFuel - totalDistribusiFuel;

  const handleOpenAdd = () => {
    if (!canInsert) return;
    setEditingId(null);
    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));

    setNamaDriverFt('');
    setDriverFtJabatan('');

    const defaultPic = manpowerList[0];
    setPicFog(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicFogJabatan(defaultPic?.jabatan || 'Staff Logistik');

    setFlowmeterStart('');
    setFlowmeterStop('');
    setQty('');
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: FuelTransferRecord) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setTanggal(item.tanggal);
    setJam(item.jam);
    setNamaDriverFt(item.namaDriverFt);
    setDriverFtJabatan(item.driverFtJabatan || '');
    setPicFog(item.picFog);
    setPicFogJabatan(item.picFogJabatan || '');
    setFlowmeterStart(item.flowmeterStart);
    setFlowmeterStop(item.flowmeterStop);
    setQty(item.qty);
    setRemark(item.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFlowmeterChange = (startVal: number | '', stopVal: number | '') => {
    setFlowmeterStart(startVal);
    setFlowmeterStop(stopVal);
    if (typeof startVal === 'number' && typeof stopVal === 'number') {
      const diff = stopVal - startVal;
      if (diff >= 0) {
        setQty(diff);
      }
    }
  };

  const handleDriverChange = (nama: string) => {
    setNamaDriverFt(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setDriverFtJabatan(found.jabatan);
    }
  };

  const handlePicChange = (nama: string) => {
    setPicFog(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicFogJabatan(found.jabatan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitForm) {
      setErrorMsg('Akses Ditolak: Anda tidak memiliki izin untuk menyimpan atau mengubah transfer fuel.');
      return;
    }
    if (!namaDriverFt) {
      setErrorMsg('Nama Driver FT wajib dipilih!');
      return;
    }
    if (!picFog) {
      setErrorMsg('PIC FOG wajib dipilih!');
      return;
    }
    if (qty === '' || Number(qty) <= 0) {
      setErrorMsg('Qty volume transfer harus lebih dari 0 Liter!');
      return;
    }

    const res = onSave(
      {
        tanggal,
        jam,
        namaDriverFt,
        driverFtJabatan,
        picFog,
        picFogJabatan,
        flowmeterStart: Number(flowmeterStart) || 0,
        flowmeterStop: Number(flowmeterStop) || 0,
        qty: Number(qty),
        remark: remark.trim(),
      },
      editingId || undefined
    );

    if (res.success) {
      setShowModal(false);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const filteredList = useMemo(() => {
    const base = fuelTransfers.filter((item) => {
      if (!matchesDateRange(item.tanggal, startDate, endDate)) return false;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        item.namaDriverFt.toLowerCase().includes(q) ||
        item.picFog.toLowerCase().includes(q) ||
        (item.remark || '').toLowerCase().includes(q)
      );
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'DATE_ASC') {
        return getTimestampMs(a.tanggal, a.jam) - getTimestampMs(b.tanggal, b.jam);
      }
      if (sortBy === 'QTY_DESC') {
        return (Number(b.qty) || 0) - (Number(a.qty) || 0);
      }
      if (sortBy === 'DRIVER') {
        const cmp = (a.namaDriverFt || '').localeCompare(b.namaDriverFt || '', 'id');
        if (cmp !== 0) return cmp;
      }
      return getTimestampMs(b.tanggal, b.jam) - getTimestampMs(a.tanggal, a.jam);
    });
  }, [fuelTransfers, startDate, endDate, searchTerm, sortBy]);

  const groupedList = useMemo(() => {
    if (sortBy !== 'DRIVER' && sortBy !== 'DATE') return null;
    const map = new Map<string, { key: string; label: string; items: FuelTransferRecord[]; subtotalQty: number }>();
    filteredList.forEach((item) => {
      const key = sortBy === 'DRIVER' ? (item.namaDriverFt || 'LAINNYA').trim().toUpperCase() : (item.tanggal || '-');
      const label = sortBy === 'DRIVER' ? `Driver FT: ${item.namaDriverFt || 'LAINNYA'}` : `Tanggal: ${item.tanggal}`;
      const cur = map.get(key) || { key, label, items: [], subtotalQty: 0 };
      cur.items.push(item);
      cur.subtotalQty += Number(item.qty) || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) =>
      sortBy === 'DATE' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)
    );
  }, [filteredList, sortBy]);

  const totalFilteredQty = useMemo(
    () => filteredList.reduce((acc, r) => acc + (Number(r.qty) || 0), 0),
    [filteredList]
  );

  const sortOptionsList = [
    { value: 'DATE_DESC', label: 'Tanggal Terbaru' },
    { value: 'DATE_ASC', label: 'Tanggal Terlama' },
    { value: 'DRIVER', label: 'Per Driver FT (+Subtotal)' },
    { value: 'DATE', label: 'Per Hari (+Subtotal)' },
    { value: 'QTY_DESC', label: 'Qty Transfer Terbesar' },
  ];

  const handleDirectPrintPreview = () => {
    if (!canPrintPreview && !canExport) return;
    const sortLabel = sortOptionsList.find((o) => o.value === sortBy)?.label || 'Tanggal Terbaru';
    const filterInfo = searchTerm.trim() ? `Cari: "${searchTerm.trim()}"` : '';

    const mapRow = (item: FuelTransferRecord, num: number): (string | number)[] => [
      num,
      `${item.tanggal} (${item.jam || '-'})`,
      `${item.namaDriverFt}\n${item.driverFtJabatan || '-'}`,
      `${item.picFog}\n${item.picFogJabatan || '-'}`,
      (Number(item.flowmeterStart) || 0).toLocaleString('id-ID'),
      (Number(item.flowmeterStop) || 0).toLocaleString('id-ID'),
      `${(Number(item.qty) || 0).toLocaleString('id-ID')} Ltr`,
      item.remark || '-',
    ];

    let pdfRows: (string | number)[][] = [];
    let pdfGroups: { headerText: string; rows: (string | number)[][]; subtotalText?: string }[] | undefined;

    if (groupedList) {
      let rowNum = 1;
      pdfGroups = groupedList.map((grp) => ({
        headerText: `${grp.label} (${grp.items.length} Ritase Transfer)`,
        rows: grp.items.map((item) => mapRow(item, rowNum++)),
        subtotalText: `SUBTOTAL ${grp.label} (${grp.items.length} Ritase): ${grp.subtotalQty.toLocaleString('id-ID')} Liter`,
      }));
    } else {
      pdfRows = filteredList.map((item, idx) => mapRow(item, idx + 1));
    }

    const result = generateFogTableReportPDF({
      reportTitle: 'LAPORAN TRANSFER FUEL (TANGKI UTAMA -> FT-01)',
      reportSubtitle: 'Penyaluran BBM Solar dari Tangki Timbun Utama ke Armada Fuel Truck',
      accentColor: [37, 99, 235],
      periodeLabel: formatPeriodeLabel(startDate, endDate),
      sortLabel,
      filterInfo,
      headers: [
        'No',
        'Tanggal & Jam',
        'Nama Driver FT',
        'PIC FOG',
        'Flowmeter Start',
        'Flowmeter Stop',
        'Qty Transfer',
        'Catatan / Keterangan',
      ],
      rows: pdfRows,
      groups: pdfGroups,
      grandTotalRow: [
        {
          content: `GRAND TOTAL TRANSFER FUEL (${filteredList.length} Ritase)`,
          colSpan: 6,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
        },
        {
          content: `${totalFilteredQty.toLocaleString('id-ID')} Ltr`,
          styles: { fillColor: [30, 41, 59], textColor: [147, 197, 253], fontStyle: 'bold', halign: 'right' },
        },
        {
          content: '',
          styles: { fillColor: [30, 41, 59] },
        },
      ],
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 'auto' },
      },
      kpis: [
        { label: 'Total Ritase Transfer', value: `${filteredList.length} Ritase`, accent: 'slate' },
        { label: 'Total Volume Transfer', value: `${totalFilteredQty.toLocaleString('id-ID')} Liter`, accent: 'blue' },
      ],
      signatories,
      currentUser,
      filenamePrefix: 'Laporan_Transfer_Fuel_FT01',
    });

    setPreviewPdfUrl(result.blobUrl);
    setPreviewFilename(result.filename);
    setPreviewDownloadFn(() => result.download);
    setShowPdfPreview(true);
  };

  const totalTransferLiter = fuelTransfers.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                3. DATA TRANSFER FUEL (TANGKI UTAMA - FUEL TRUCK)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pengisian / penyaluran solar dari Tangki Timbun Utama ke unit mobile Fuel Truck (FT) pengantar pit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari Driver FT atau PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-blue-500/50 w-56 sm:w-64"
            />
          </div>

          {(canPrintPreview || canExport) && (
            <button
              id="btn-export-pdf-fuel-transfer"
              type="button"
              onClick={handleDirectPrintPreview}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 font-bold text-xs font-mono transition active:scale-95 whitespace-nowrap"
              title="Buka Print Preview Langsung Sesuai Tabel Transfer Fuel"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Print Preview</span>
            </button>
          )}

          {canInsert ? (
            <button
              id="btn-add-fuel-transfer"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-stone-950 font-bold text-xs shadow-lg shadow-blue-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Transfer Tangki-FT</span>
            </button>
          ) : (
            <button
              id="btn-add-fuel-transfer"
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-500 border border-stone-700 font-bold text-xs cursor-not-allowed opacity-75"
              title="Akun Anda tidak memiliki izin menambah data di Modul 4."
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>+ Catat Transfer (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUMMARY SALDO TANKI TRUCK FT-01 (SOLAR INDUSTRI) */}
      {/* Logika: Data Transfer Fuel dikurangi Pengisian ke Unit di Lapangan */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-950/40 via-stone-900 to-blue-950/20 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <Truck className="w-3 h-3 text-blue-400" />
              <span>STOK SOLAR PADA TANKI TRUCK (FT-01)</span>
            </span>
            <span className="text-xs font-mono font-black text-stone-100 uppercase">
              Solar Industri (Kuantitas Fisik Liter)
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            * Tanpa Nominal Rupiah (Solar Industri)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Saldo FT Periode Lalu */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-stone-400">1. Saldo FT Lalu</span>
            <div className="text-lg font-black font-mono text-stone-300 mt-1">
              {saldoFTLalu.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">Saldo awal armada</span>
          </div>

          {/* 2. Data Transfer Fuel Masuk ke FT */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-blue-400">2. Transfer Masuk FT</span>
            <div className="text-lg font-black font-mono text-blue-400 mt-1">
              +{totalTransferFuel.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">{fuelTransfers.length} rit transfer</span>
          </div>

          {/* 3. Pengisian ke Unit Lapangan (Distribusi Fuel) */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-orange-400">3. Pengisian ke Unit</span>
            <div className="text-lg font-black font-mono text-orange-400 mt-1">
              −{totalDistribusiFuel.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">{fuelDistributions.length} bon pengisian</span>
          </div>

          {/* 4. Sisa Saldo Tanki Truck */}
          <div className="bg-stone-950/90 border border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between shadow-lg shadow-emerald-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <span className="text-[10.5px] font-mono uppercase font-bold text-emerald-400">
              4. Stok Solar Tanki Truck
            </span>
            <div className="text-xl font-black font-mono text-emerald-300 mt-1">
              {stokSolarTankiTruck.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Ltr</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 font-bold">
              (Transfer − Pengisian Unit)
            </span>
          </div>
        </div>

        <div className="text-[10.5px] font-mono text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/60">
          <span>
            * Rumus: Transfer Fuel ({totalTransferFuel.toLocaleString('id-ID')} Ltr) − Pengisian Unit ({totalDistribusiFuel.toLocaleString('id-ID')} Ltr) {saldoFTLalu > 0 ? `+ Saldo Lalu (${saldoFTLalu} Ltr)` : ''} = <strong>{stokSolarTankiTruck.toLocaleString('id-ID')} Liter</strong>
          </span>
          <span className="text-stone-500">
            Total Riwayat Transfer: {fuelTransfers.length} ritase
          </span>
        </div>
      </div>

      {/* Validasi 3 Pihak Inline (Modul 3 Pattern) */}
      <FogValidationBar
        manpowerList={manpowerList}
        signatories={signatories}
        administrasiList={resolvedSig.administrasiList}
        kabagList={resolvedSig.kabagList}
        onChange={updateSignatories}
        onSave={saveSignatories}
        accentColor="blue"
      />

      {/* Filter Tanggal di Awal & Urutkan / Sort By */}
      <FogDateSortToolbar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        sortBy={sortBy}
        onSortByChange={(val) => setSortBy(val as any)}
        sortOptions={sortOptionsList}
        hasActiveFilter={Boolean(startDate || endDate || searchTerm || sortBy !== 'DATE_DESC')}
        onResetAll={() => {
          setStartDate('');
          setEndDate('');
          setSearchTerm('');
          setSortBy('DATE_DESC');
        }}
        resultSummary={
          <>
            <span>
              Periode: <strong className="text-amber-400">{formatPeriodeLabel(startDate, endDate)}</strong> • Urutan:{' '}
              <strong className="text-stone-200">{sortOptionsList.find((o) => o.value === sortBy)?.label}</strong>
            </span>
            <span>
              Total Hasil: <strong className="text-stone-100">{filteredList.length}</strong> ritase •{' '}
              <strong className="text-blue-400">{totalFilteredQty.toLocaleString('id-ID')}</strong> Liter
            </span>
          </>
        }
      />

      {/* Table Data Transfer Fuel */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            RIWAYAT TRANSFER FUEL KE FUEL TRUCK (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">a. Tanggal & Jam</th>
                <th className="py-3 px-3">b. Nama Driver FT</th>
                <th className="py-3 px-3">c. PIC FOG</th>
                <th className="py-3 px-3">d. Flowmeter Start</th>
                <th className="py-3 px-3">e. Flowmeter Stop</th>
                <th className="py-3 px-3 text-right">f. Qty Transfer</th>
                <th className="py-3 px-3">Catatan / Keterangan</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {groupedList ? (
                groupedList.map((grp) => (
                  <React.Fragment key={grp.key}>
                    <tr className="bg-blue-950/40 border-y border-blue-500/30">
                      <td colSpan={8} className="py-2 px-3 font-mono font-bold text-blue-300 text-xs">
                        ▸ {grp.label} ({grp.items.length} Ritase Transfer)
                      </td>
                    </tr>
                    {grp.items.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-800/30 transition">
                        <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-stone-500" />
                            <span>{item.tanggal}</span>
                            <span className="text-stone-500">{item.jam}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-blue-400">{item.namaDriverFt}</div>
                          <div className="text-[10px] text-stone-500 font-mono">{item.driverFtJabatan || '-'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-stone-200 font-semibold">{item.picFog}</div>
                          <div className="text-[10px] text-stone-500 font-mono">{item.picFogJabatan || '-'}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-300">
                          {(item.flowmeterStart ?? 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-300">
                          {(item.flowmeterStop ?? 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-blue-400 text-right text-sm">
                          {(item.qty ?? 0).toLocaleString('id-ID')} Ltr
                        </td>
                        <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                          {item.remark || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => handleOpenEdit(item)}
                              className={`p-1.5 rounded-lg transition border ${
                                canEdit
                                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                                  : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                              }`}
                              title={canEdit ? 'Edit Record' : 'Akun Anda dalam mode Hanya View'}
                            >
                              {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                            </button>
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => canDelete && setDeleteConfirmId(item.id)}
                              className={`p-1.5 rounded-lg transition border ${
                                canDelete
                                  ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-300'
                                  : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                              }`}
                              title={canDelete ? 'Hapus Record' : 'Tidak ada izin Hapus'}
                            >
                              {canDelete ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-500/10 border-b-2 border-blue-500/30 font-mono font-bold text-blue-300">
                      <td colSpan={5} className="py-2 px-3 text-right uppercase text-[11px] tracking-wider">
                        SUBTOTAL {grp.label} ({grp.items.length} Ritase):
                      </td>
                      <td className="py-2 px-3 text-right font-black text-blue-400 text-sm">
                        {grp.subtotalQty.toLocaleString('id-ID')} Ltr
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      <span>{item.tanggal}</span>
                      <span className="text-stone-500">{item.jam}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-blue-400">{item.namaDriverFt}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.driverFtJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-stone-200 font-semibold">{item.picFog}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.picFogJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-stone-300">
                    {(item.flowmeterStart ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-mono text-stone-300">
                    {(item.flowmeterStop ?? 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-blue-400 text-right text-sm">
                    {(item.qty ?? 0).toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3 text-stone-400 text-[11px] max-w-xs truncate">
                    {item.remark || '-'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleOpenEdit(item)}
                        className={`p-1.5 rounded-lg transition border ${
                          canEdit
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Edit Record' : 'Akun Anda dalam mode Hanya View'}
                      >
                        {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                      <button
                        type="button"
                        disabled={!canDelete}
                        onClick={() => canDelete && setDeleteConfirmId(item.id)}
                        className={`p-1.5 rounded-lg transition border ${
                          canDelete
                            ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-300'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canDelete ? 'Hapus Record' : 'Tidak ada izin Hapus'}
                      >
                        {canDelete ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}

              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    Belum ada riwayat transfer Solar Tangki Utama ke Fuel Truck yang sesuai filter.
                  </td>
                </tr>
              ) : (
                <tr className="bg-stone-950 font-mono font-bold text-stone-100 border-t-2 border-stone-700">
                  <td colSpan={5} className="py-3 px-3 text-right uppercase text-xs tracking-wider text-blue-400">
                    GRAND TOTAL TRANSFER ({filteredList.length} Ritase):
                  </td>
                  <td className="py-3 px-3 text-right font-black text-blue-400 text-base">
                    {totalFilteredQty.toLocaleString('id-ID')} Ltr
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT DATA TRANSFER */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90dvh] sm:max-h-[92dvh] flex flex-col my-auto">
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRightLeft className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase truncate">
                  {editingId ? 'Edit Transfer Fuel Tangki-FT' : 'Form Transfer Fuel (Tangki Utama ke FT)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* a. Tanggal & Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    a. Tanggal Transfer <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Transfer (24 Jam) <span className="text-amber-400">*</span>
                  </label>
                  <TimeInput24Hour
                    value={jam}
                    onChange={(val) => setJam(val)}
                    placeholder="08:00"
                  />
                </div>
              </div>

              {/* b. Nama Driver FT */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  b. Nama Driver FT (Daftar Seluruh Nama Karyawan) <span className="text-amber-400">*</span>
                </label>
                <select
                  required
                  value={namaDriverFt}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono text-xs"
                >
                  <option value="">-- Pilih Nama Driver FT (Daftar Seluruh Karyawan) --</option>
                  {allEmployeesList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — [{m.jabatan || 'Karyawan'}]
                    </option>
                  ))}
                </select>
                {driverFtJabatan && (
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    Jabatan Driver: {driverFtJabatan}
                  </span>
                )}
              </div>

              {/* c. PIC FOG */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  c. PIC FOG Petugas Pompa (Reff: Manpower Modul 2) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={picFog}
                  onChange={(e) => handlePicChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-blue-500/60 font-mono text-xs"
                >
                  <option value="">-- Pilih PIC FOG (Daftar Seluruh Karyawan) --</option>
                  {allEmployeesList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — [{m.jabatan || 'Karyawan'}]
                    </option>
                  ))}
                </select>
                {picFogJabatan && (
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    Jabatan PIC: {picFogJabatan}
                  </span>
                )}
              </div>

              {/* Flowmeter Start & Stop & Qty */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Kalkulasi Flowmeter Pengisian FT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      d. Flowmeter Start
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Awal"
                      value={flowmeterStart}
                      onChange={(e) => handleFlowmeterChange(e.target.value === '' ? '' : Number(e.target.value), flowmeterStop)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      e. Flowmeter Stop
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Berhenti"
                      value={flowmeterStop}
                      onChange={(e) => handleFlowmeterChange(flowmeterStart, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-blue-500/60"
                    />
                  </div>
                </div>

                {/* f. Qty */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    f. Qty Transfer (Liter) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Volume solar terisi ke Fuel Truck"
                    value={qty}
                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-blue-500/50 rounded-xl text-blue-400 font-mono font-black text-sm focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    *Kalkulasi otomatis dari Flowmeter Stop dikurangi Flowmeter Start.
                  </span>
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Keterangan / Tujuan Suplai
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Suplai solar FT-01 untuk excavator & dump truck shift sore Pit Batu"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500/60"
                />
              </div>

              </div>

              <div className="shrink-0 flex justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-stone-800 bg-stone-950/95">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs whitespace-nowrap"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-blue-500 hover:bg-blue-400 text-stone-950 font-black text-xs shadow-lg shadow-blue-500/20 whitespace-nowrap"
                >
                  {editingId ? 'Simpan Perubahan' : 'Catat Transfer ke FT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Catatan Transfer?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data transfer ini akan dihapus dan mempengaruhi level stock Fuel Truck dan Tangki Utama.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Print Preview Modal (Tanpa Masuk Sub-Form) */}
      <PdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title="Pratinjau Laporan Transfer Fuel (Tangki Utama -> FT-01)"
        subtitle={`Periode: ${formatPeriodeLabel(startDate, endDate)} • Urutan: ${sortOptionsList.find((o) => o.value === sortBy)?.label}`}
        pdfBlobUrl={previewPdfUrl}
        filename={previewFilename}
        onDownload={canExport && previewDownloadFn ? previewDownloadFn : undefined}
        signatoriesSummary={{
          pembuat: signatories.pembuatName,
          diperiksa: signatories.diperiksaName,
          diketahui: signatories.disetujuiName,
        }}
      />
    </div>
  );
};
