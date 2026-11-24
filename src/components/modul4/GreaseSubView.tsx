import React, { useState, useMemo } from 'react';
import { 
  HeavyEquipment, 
  ManpowerData, 
  GreaseStockRecord, 
  GreaseDistributionRecord, 
  UserAccount,
  DEFAULT_GREASE_TYPES,
  SupplierRecord
} from '../../types';
import { 
  isDeveloper, 
  canUserInsertModule, 
  canUserEditModule, 
  canUserDeleteModule, 
  canUserExportModule,
  canUserPrintPreviewModule
} from '../../utils/storage';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Truck, 
  Edit3, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Package, 
  Wrench,
  Layers,
  Building2,
  Lock,
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

interface GreaseSubViewProps {
  units: HeavyEquipment[];
  manpowerList: ManpowerData[];
  suppliers: SupplierRecord[];
  greaseStocks: GreaseStockRecord[];
  greaseDistributions: GreaseDistributionRecord[];
  currentUser: UserAccount;
  onSaveStock: (
    data: Omit<GreaseStockRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseStockRecord };
  onDeleteStock: (id: string) => { success: boolean; message: string };
  onSaveDistribution: (
    data: Omit<GreaseDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseDistributionRecord };
  onDeleteDistribution: (id: string) => { success: boolean; message: string };
}

const GREASE_LOKASI_PRESETS = [
  'Pin & Bushing Bucket',
  'Boom & Arm Cylinder Pin',
  'Swing Bearing & Gear',
  'Chassis & Propeller Shaft',
  'Wheel Hub & Kingpin',
  'Track Tensioner / Idler',
  'Trunnion & Equalizer Bar',
  'Drive Shaft Universal Joint',
  'General Greasing Unit',
];

export const GreaseSubView: React.FC<GreaseSubViewProps> = ({
  units,
  manpowerList,
  suppliers,
  greaseStocks,
  greaseDistributions,
  currentUser,
  onSaveStock,
  onDeleteStock,
  onSaveDistribution,
  onDeleteDistribution,
}) => {
  const isDev = isDeveloper(currentUser);
  const canInput = isDev || canUserInsertModule(currentUser, 4);
  const canEdit = isDev || canUserEditModule(currentUser, 4);
  const canDelete = isDev || canUserDeleteModule(currentUser, 4);
  const canExport = isDev || canUserExportModule(currentUser, 4);
  const canPrintPreview = isDev || canUserPrintPreviewModule(currentUser, 4);

  // Tab internal: 'dist' (Pemakaian Unit) or 'stock' (Penerimaan Gudang)
  const [activeTab, setActiveTab] = useState<'dist' | 'stock'>('dist');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'GROUP_ENTITY' | 'DATE' | 'QTY_DESC'>('DATE_DESC');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Validasi 3 Pihak & Direct Print Preview (seperti Modul 3)
  const { signatories, resolved: resolvedSig, updateSignatories, saveSignatories } = useFogSignatories(manpowerList, currentUser);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewDownloadFn, setPreviewDownloadFn] = useState<(() => void) | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields for Grease Distribution
  const [distTanggal, setDistTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [distJam, setDistJam] = useState('08:00');
  const [distSelectedJenis, setDistSelectedJenis] = useState('');
  const [distNoUnit, setDistNoUnit] = useState('');
  const [distNamaAlat, setDistNamaAlat] = useState('');
  const [distHmUnit, setDistHmUnit] = useState<number | ''>(0);
  const [distNamaGrease, setDistNamaGrease] = useState('');
  const [distQty, setDistQty] = useState<number | ''>(2);
  const [distSatuan, setDistSatuan] = useState<'Kg' | 'Pail' | 'Tube'>('Kg');
  const [distLokasi, setDistLokasi] = useState('Pin & Bushing Bucket');
  const [distPicMekanik, setDistPicMekanik] = useState('');
  const [distRemark, setDistRemark] = useState('');

  // Form Fields for Grease Stock Input
  const [stockDistributor, setStockDistributor] = useState(suppliers[0]?.nama || 'PT Pertamina Lubricants');
  const [stockTanggal, setStockTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [stockJam, setStockJam] = useState('09:00');
  const [stockNamaGrease, setStockNamaGrease] = useState('');
  const [stockQty, setStockQty] = useState<number | ''>(1);
  const [stockSatuan, setStockSatuan] = useState<'Kg' | 'Pail' | 'Drum'>('Pail');
  const [stockPicGudang, setStockPicGudang] = useState('');
  const [stockRemark, setStockRemark] = useState('');

  // Unit helper
  const getUnitCn = (u: any): string => u?.cnNew || u?.codeNumber || u?.kodeUnit || '';
  const getUnitJenis = (u: any): string => (u?.jenis || u?.category || '').trim();
  const getUnitName = (u: any): string => u?.namaAlat || `${u?.brandMerk || u?.brand || ''} ${u?.modelUnit || u?.model || ''}`.trim() || getUnitCn(u);

  // 1. Daftar Jenis Alat berdasarkan "JENIS" di Modul 1
  const availableJenisList = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u: any) => {
      const j = getUnitJenis(u);
      if (j) set.add(j);
    });
    if (set.size === 0) {
      return ['Dump Truck', 'Excavator', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support'];
    }
    return Array.from(set).sort();
  }, [units]);

  // 2. Daftar Unit terfilter per jenis
  const availableUnitsForDistJenis = useMemo(() => {
    if (!distSelectedJenis) return units;
    return units.filter((u: any) => getUnitJenis(u).toLowerCase() === distSelectedJenis.trim().toLowerCase());
  }, [units, distSelectedJenis]);

  const handleDistJenisChange = (newJenis: string) => {
    setDistSelectedJenis(newJenis);
    // User requested: "Jenis baru , CN_NEW baru nama alat otomatis"
    setDistNoUnit('');
    setDistNamaAlat('');
    setDistHmUnit('');
  };

  const handleUnitSelect = (cn: string) => {
    setDistNoUnit(cn);
    const target = units.find((u: any) => getUnitCn(u).trim().toUpperCase() === cn.trim().toUpperCase());
    if (target) {
      setDistNamaAlat(getUnitName(target));
      const j = getUnitJenis(target);
      if (j && (!distSelectedJenis || distSelectedJenis.toLowerCase() !== j.toLowerCase())) {
        setDistSelectedJenis(j);
      }
      const hours = (target as any).currentHours || (target as any).lastHm || (target as any).hm || 0;
      if (hours && (!distHmUnit || distHmUnit === 0)) {
        setDistHmUnit(hours);
      }
    } else {
      setDistNamaAlat('');
    }
  };

  // Filter PIC Mekanik: HANYA jabatan Mekanik / Helper Mekanik
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const greaseMechanics = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').trim().toUpperCase();
      return jab === 'MEKANIK' || 
             jab === 'HELPER MEKANIK' || 
             jab.includes('MEKANIK') || 
             jab.includes('MECHANIC');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [manpowerList]);

  const effectiveGreaseMechanics = greaseMechanics.length > 0 
    ? greaseMechanics 
    : [...manpowerList].sort((a, b) => {
        const cmp = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
        if (cmp !== 0) return cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });

  // Filter PIC Gudang: HANYA jabatan Administrasi dan Kabag Workshop
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const greaseWarehouseStaff = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').trim().toUpperCase();
      return jab === 'ADMINISTRASI' || 
             jab === 'KABAG WORKSHOP' || 
             jab.includes('ADMINISTRASI') || 
             jab.includes('ADMIN') || 
             jab.includes('KABAG');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [manpowerList]);

  const effectiveGreaseWarehouse = greaseWarehouseStaff.length > 0 
    ? greaseWarehouseStaff 
    : [...manpowerList].sort((a, b) => {
        const cmp = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
        if (cmp !== 0) return cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingId(null);
    if (activeTab === 'dist') {
      setDistTanggal(new Date().toISOString().split('T')[0]);
      setDistJam('08:00');
      setDistSelectedJenis('');
      setDistNoUnit('');
      setDistNamaAlat('');
      setDistHmUnit('');
      setDistNamaGrease('');
      setDistQty(2);
      setDistSatuan('Kg');
      setDistLokasi(GREASE_LOKASI_PRESETS[0]);
      const defaultMek = effectiveGreaseMechanics[0];
      setDistPicMekanik(defaultMek?.nama || '');
      setDistRemark('');
    } else {
      setStockTanggal(new Date().toISOString().split('T')[0]);
      setStockJam('09:00');
      setStockDistributor(suppliers[0]?.nama || 'PT Pertamina Lubricants');
      setStockNamaGrease('');
      setStockQty(1);
      setStockSatuan('Pail');
      const defaultGud = effectiveGreaseWarehouse[0];
      setStockPicGudang(defaultGud?.nama || currentUser.fullName || currentUser.username);
      setStockRemark('');
    }
    setShowModal(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'dist') {
      if (!distNoUnit || !distQty) {
        setFeedback({ type: 'error', text: 'Unit dan Jumlah Qty wajib diisi!' });
        return;
      }
      const res = onSaveDistribution({
        tanggal: distTanggal,
        jam: distJam,
        noUnit: distNoUnit,
        namaAlat: distNamaAlat,
        hmUnit: Number(distHmUnit) || 0,
        namaGrease: distNamaGrease,
        qty: Number(distQty) || 0,
        satuan: distSatuan,
        lokasiPelumasan: distLokasi,
        picMekanik: distPicMekanik,
        remark: distRemark,
      }, editingId || undefined);

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setShowModal(false);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } else {
      if (!stockDistributor || !stockQty) {
        setFeedback({ type: 'error', text: 'Distributor dan Jumlah Qty wajib diisi!' });
        return;
      }
      const res = onSaveStock({
        distributor: stockDistributor,
        tanggal: stockTanggal,
        jam: stockJam,
        namaGrease: stockNamaGrease,
        qty: Number(stockQty) || 0,
        satuan: stockSatuan,
        picGudang: stockPicGudang,
        remark: stockRemark,
      }, editingId || undefined);

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setShowModal(false);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
  };

  // Filtered & sorted lists
  const filteredDistributions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const base = greaseDistributions.filter((d) => {
      const matchSearch =
        !q ||
        d.noUnit.toLowerCase().includes(q) ||
        d.namaAlat.toLowerCase().includes(q) ||
        d.namaGrease.toLowerCase().includes(q) ||
        (d.picMekanik || '').toLowerCase().includes(q) ||
        (d.lokasiPelumasan || '').toLowerCase().includes(q) ||
        (d.noBon || '').toLowerCase().includes(q);
      const matchRange = matchesDateRange(d.tanggal, startDate, endDate);
      return matchSearch && matchRange;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'DATE_ASC') {
        return getTimestampMs(a.tanggal, a.jam) - getTimestampMs(b.tanggal, b.jam);
      }
      if (sortBy === 'QTY_DESC') {
        return (Number(b.qty) || 0) - (Number(a.qty) || 0);
      }
      if (sortBy === 'GROUP_ENTITY') {
        const cmp = (a.noUnit || '').localeCompare(b.noUnit || '', 'id');
        if (cmp !== 0) return cmp;
      }
      return getTimestampMs(b.tanggal, b.jam) - getTimestampMs(a.tanggal, a.jam);
    });
  }, [greaseDistributions, searchTerm, startDate, endDate, sortBy]);

  const filteredStocks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const base = greaseStocks.filter((s) => {
      const matchSearch =
        !q ||
        s.distributor.toLowerCase().includes(q) ||
        s.namaGrease.toLowerCase().includes(q) ||
        (s.picGudang || '').toLowerCase().includes(q) ||
        (s.remark || '').toLowerCase().includes(q);
      const matchRange = matchesDateRange(s.tanggal, startDate, endDate);
      return matchSearch && matchRange;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'DATE_ASC') {
        return getTimestampMs(a.tanggal, a.jam) - getTimestampMs(b.tanggal, b.jam);
      }
      if (sortBy === 'QTY_DESC') {
        return (Number(b.qty) || 0) - (Number(a.qty) || 0);
      }
      if (sortBy === 'GROUP_ENTITY') {
        const cmp = (a.distributor || '').localeCompare(b.distributor || '', 'id');
        if (cmp !== 0) return cmp;
      }
      return getTimestampMs(b.tanggal, b.jam) - getTimestampMs(a.tanggal, a.jam);
    });
  }, [greaseStocks, searchTerm, startDate, endDate, sortBy]);

  const groupedDistributions = useMemo(() => {
    if (sortBy !== 'GROUP_ENTITY' && sortBy !== 'DATE') return null;
    const map = new Map<string, { key: string; label: string; items: GreaseDistributionRecord[]; subtotalQty: number }>();
    filteredDistributions.forEach((d) => {
      const key = sortBy === 'GROUP_ENTITY' ? (d.noUnit || 'LAINNYA').trim().toUpperCase() : (d.tanggal || '-');
      const label = sortBy === 'GROUP_ENTITY'
        ? `${d.noUnit || 'LAINNYA'}${d.namaAlat ? ` • ${d.namaAlat}` : ''}`
        : `Tanggal: ${d.tanggal}`;
      const cur = map.get(key) || { key, label, items: [], subtotalQty: 0 };
      cur.items.push(d);
      cur.subtotalQty += Number(d.qty) || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) =>
      sortBy === 'DATE' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)
    );
  }, [filteredDistributions, sortBy]);

  const groupedStocks = useMemo(() => {
    if (sortBy !== 'GROUP_ENTITY' && sortBy !== 'DATE') return null;
    const map = new Map<string, { key: string; label: string; items: GreaseStockRecord[]; subtotalQty: number }>();
    filteredStocks.forEach((s) => {
      const key = sortBy === 'GROUP_ENTITY' ? (s.distributor || 'LAINNYA').trim() : (s.tanggal || '-');
      const label = sortBy === 'GROUP_ENTITY' ? `Distributor: ${s.distributor || 'LAINNYA'}` : `Tanggal: ${s.tanggal}`;
      const cur = map.get(key) || { key, label, items: [], subtotalQty: 0 };
      cur.items.push(s);
      cur.subtotalQty += Number(s.qty) || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) =>
      sortBy === 'DATE' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)
    );
  }, [filteredStocks, sortBy]);

  const totalDistQty = useMemo(
    () => filteredDistributions.reduce((sum, d) => sum + (Number(d.qty) || 0), 0),
    [filteredDistributions]
  );

  const totalStockQty = useMemo(
    () => filteredStocks.reduce((sum, s) => sum + (Number(s.qty) || 0), 0),
    [filteredStocks]
  );

  const sortOptionsList = useMemo(
    () => [
      { value: 'DATE_DESC', label: 'Tanggal Terbaru' },
      { value: 'DATE_ASC', label: 'Tanggal Terlama' },
      { value: 'GROUP_ENTITY', label: activeTab === 'dist' ? 'Per Unit (+Subtotal)' : 'Per Distributor (+Subtotal)' },
      { value: 'DATE', label: 'Per Hari (+Subtotal)' },
      { value: 'QTY_DESC', label: 'Qty Terbanyak' },
    ],
    [activeTab]
  );

  // Direct Print Preview Sesuai Tabel & Tab Aktif
  const handleDirectPrintPreview = () => {
    if (!canPrintPreview && !canExport) return;
    const sortLabel = sortOptionsList.find((o) => o.value === sortBy)?.label || 'Tanggal Terbaru';
    const filterInfo = searchTerm.trim() ? `Cari: "${searchTerm.trim()}"` : '';

    if (activeTab === 'dist') {
      const mapRow = (d: GreaseDistributionRecord, num: number): (string | number)[] => [
        num,
        d.noBon || '-',
        `${d.tanggal} ${d.jam || ''}`.trim(),
        `${d.noUnit}\n${d.namaAlat || ''}`,
        (Number(d.hmUnit) || 0).toLocaleString('id-ID'),
        d.namaGrease || '-',
        `${(Number(d.qty) || 0).toLocaleString('id-ID')} ${d.satuan || 'Kg'}`,
        d.lokasiPelumasan || '-',
        d.picMekanik || '-',
      ];

      let pdfRows: (string | number)[][] = [];
      let pdfGroups: { headerText: string; rows: (string | number)[][]; subtotalText?: string }[] | undefined;

      if (groupedDistributions) {
        let rowNum = 1;
        pdfGroups = groupedDistributions.map((grp) => ({
          headerText: `${sortBy === 'GROUP_ENTITY' ? `UNIT: ${grp.label}` : grp.label} (${grp.items.length} Bon)`,
          rows: grp.items.map((item) => mapRow(item, rowNum++)),
          subtotalText: `SUBTOTAL ${grp.key} (${grp.items.length} Bon): ${grp.subtotalQty.toLocaleString('id-ID')} Kg`,
        }));
      } else {
        pdfRows = filteredDistributions.map((item, idx) => mapRow(item, idx + 1));
      }

      const result = generateFogTableReportPDF({
        reportTitle: 'LAPORAN PEMAKAIAN GREASE UNIT ALAT BERAT',
        reportSubtitle: 'Bon Pengeluaran & Pelumasan Grease (Pin & Bushing, Chassis, Wheel Hub)',
        accentColor: [217, 119, 6],
        periodeLabel: formatPeriodeLabel(startDate, endDate),
        sortLabel,
        filterInfo,
        headers: ['No', 'No Bon', 'Waktu', 'CN Unit & Alat', 'HM', 'Jenis Grease', 'Qty', 'Lokasi Pelumasan', 'Mekanik'],
        rows: pdfRows,
        groups: pdfGroups,
        grandTotalRow: [
          {
            content: `GRAND TOTAL PEMAKAIAN GREASE (${filteredDistributions.length} Bon)`,
            colSpan: 6,
            styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
          },
          {
            content: `${totalDistQty.toLocaleString('id-ID')} Kg`,
            styles: { fillColor: [30, 41, 59], textColor: [251, 191, 36], fontStyle: 'bold', halign: 'right' },
          },
          { content: '', colSpan: 2, styles: { fillColor: [30, 41, 59] } },
        ],
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 26, fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 34 },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 40 },
          6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 'auto' },
          8: { cellWidth: 28 },
        },
        kpis: [
          { label: 'Total Bon Pemakaian', value: `${filteredDistributions.length} Bon`, accent: 'slate' },
          { label: 'Total Grease Terpakai', value: `${totalDistQty.toLocaleString('id-ID')} Kg`, accent: 'amber' },
          { label: 'Unit Dilumasi', value: `${new Set(filteredDistributions.map((r) => r.noUnit)).size} Unit`, accent: 'emerald' },
        ],
        signatories,
        currentUser,
        filenamePrefix: 'Laporan_Pemakaian_Grease_Unit',
      });

      setPreviewPdfUrl(result.blobUrl);
      setPreviewFilename(result.filename);
      setPreviewDownloadFn(() => result.download);
      setShowPdfPreview(true);
    } else {
      const mapRow = (s: GreaseStockRecord, num: number): (string | number)[] => [
        num,
        s.distributor || '-',
        `${s.tanggal} ${s.jam || ''}`.trim(),
        s.namaGrease || '-',
        `${(Number(s.qty) || 0).toLocaleString('id-ID')} ${s.satuan || 'Pail'}`,
        s.picGudang || '-',
        s.remark || '-',
      ];

      let pdfRows: (string | number)[][] = [];
      let pdfGroups: { headerText: string; rows: (string | number)[][]; subtotalText?: string }[] | undefined;

      if (groupedStocks) {
        let rowNum = 1;
        pdfGroups = groupedStocks.map((grp) => ({
          headerText: `${grp.label} (${grp.items.length} Penerimaan)`,
          rows: grp.items.map((item) => mapRow(item, rowNum++)),
          subtotalText: `SUBTOTAL ${grp.key} (${grp.items.length} Penerimaan): ${grp.subtotalQty.toLocaleString('id-ID')} Kemasan`,
        }));
      } else {
        pdfRows = filteredStocks.map((item, idx) => mapRow(item, idx + 1));
      }

      const result = generateFogTableReportPDF({
        reportTitle: 'LAPORAN PENERIMAAN STOK GREASE GUDANG',
        reportSubtitle: 'Rekapitulasi Masuk Pelumas Padat (Drum / Pail / Kg) Gudang Material',
        accentColor: [217, 119, 6],
        periodeLabel: formatPeriodeLabel(startDate, endDate),
        sortLabel,
        filterInfo,
        headers: ['No', 'Distributor / Vendor', 'Tanggal & Jam', 'Nama Grease', 'Jumlah Masuk', 'PIC Gudang', 'Remark'],
        rows: pdfRows,
        groups: pdfGroups,
        grandTotalRow: [
          {
            content: `GRAND TOTAL PENERIMAAN STOK GREASE (${filteredStocks.length} Penerimaan)`,
            colSpan: 4,
            styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
          },
          {
            content: `${totalStockQty.toLocaleString('id-ID')} Kemasan`,
            styles: { fillColor: [30, 41, 59], textColor: [52, 211, 153], fontStyle: 'bold', halign: 'right' },
          },
          { content: '', colSpan: 2, styles: { fillColor: [30, 41, 59] } },
        ],
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 48, fontStyle: 'bold' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 52 },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 35 },
          6: { cellWidth: 'auto' },
        },
        kpis: [
          { label: 'Total Penerimaan', value: `${filteredStocks.length} DO / Masuk`, accent: 'slate' },
          { label: 'Total Qty Kemasan', value: `${totalStockQty.toLocaleString('id-ID')} Unit`, accent: 'emerald' },
          { label: 'Distributor Aktif', value: `${new Set(filteredStocks.map((r) => r.distributor)).size} Vendor`, accent: 'amber' },
        ],
        signatories,
        currentUser,
        filenamePrefix: 'Laporan_Stok_Masuk_Grease',
      });

      setPreviewPdfUrl(result.blobUrl);
      setPreviewFilename(result.filename);
      setPreviewDownloadFn(() => result.download);
      setShowPdfPreview(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'dist') {
      const headers = ['NO BON', 'TANGGAL', 'JAM', 'NO UNIT', 'NAMA ALAT', 'HM', 'NAMA GREASE', 'QTY', 'SATUAN', 'LOKASI PELUMASAN', 'PIC MEKANIK', 'REMARK'];
      const rows = filteredDistributions.map(d => [
        `"${d.noBon || ''}"`,
        `"${d.tanggal}"`,
        `"${d.jam}"`,
        `"${d.noUnit}"`,
        `"${d.namaAlat}"`,
        `"${d.hmUnit}"`,
        `"${d.namaGrease}"`,
        `"${d.qty}"`,
        `"${d.satuan}"`,
        `"${d.lokasiPelumasan}"`,
        `"${d.picMekanik}"`,
        `"${d.remark || ''}"`,
      ]);
      const csv = '\uFEFF' + [
        `"PT BATU KALI WELANG AMPUH - LAPORAN DISTRIBUSI & PEMAKAIAN GREASE"`,
        `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredDistributions.length}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Distribusi_Grease_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const headers = ['DISTRIBUTOR', 'TANGGAL', 'JAM', 'NAMA GREASE', 'QTY', 'SATUAN', 'PIC GUDANG', 'REMARK'];
      const rows = filteredStocks.map(s => [
        `"${s.distributor}"`,
        `"${s.tanggal}"`,
        `"${s.jam}"`,
        `"${s.namaGrease}"`,
        `"${s.qty}"`,
        `"${s.satuan}"`,
        `"${s.picGudang}"`,
        `"${s.remark || ''}"`,
      ]);
      const csv = '\uFEFF' + [
        `"PT BATU KALI WELANG AMPUH - LAPORAN PENERIMAAN STOK GREASE GUDANG"`,
        `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredStocks.length}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stok_Grease_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' 
            : 'bg-red-950/80 border-red-800 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:bg-stone-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                KOLOM GREASE
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>MANAJEMEN GREASE (GEMUK PELUMAS PADAT)</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              Penerimaan stok gudang (Drum/Pail) dan pencatatan bon pemakaian pelumasan grease per komponen unit alat berat (Pin & Bushing, Chassis, Wheel Hub).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold border border-stone-700 transition whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-stone-400" />
                <span>Export CSV</span>
              </button>
            )}

            {(canPrintPreview || canExport) && (
              <button
                id="btn-print-preview-grease"
                type="button"
                onClick={handleDirectPrintPreview}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/50 transition whitespace-nowrap shrink-0"
                title="Print Preview langsung sesuai tabel aktif"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Preview</span>
              </button>
            )}

            {canInput && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold font-mono transition shadow-lg shadow-amber-500/20 active:scale-95 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{activeTab === 'dist' ? '+ Catat Bon Pemakaian' : '+ Input Stok Masuk'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Pemakaian vs Stok Masuk */}
        <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-stone-800/80 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('dist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition whitespace-nowrap shrink-0 ${
              activeTab === 'dist'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>1. Bon Pemakaian Grease Unit ({greaseDistributions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition whitespace-nowrap shrink-0 ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Input Stok Masuk Gudang ({greaseStocks.length})</span>
          </button>
        </div>
      </div>

      {/* Inline 3-Party Validation Bar (seperti Modul 3) */}
      <FogValidationBar
        manpowerList={manpowerList}
        signatories={signatories}
        resolved={resolvedSig}
        onChange={updateSignatories}
        onSave={saveSignatories}
        canEdit={canEdit}
        accentColor="amber"
      />

      {/* Search + Filter Tanggal di Awal & Urutkan (Sort By) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'dist' ? 'Cari unit alat, no bon, jenis grease, mekanik...' : 'Cari distributor, nama grease, PIC...'}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
        </div>

        <FogDateSortToolbar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          sortBy={sortBy}
          onSortByChange={(val) => setSortBy(val as any)}
          sortOptions={sortOptionsList}
          onReset={() => {
            setStartDate('');
            setEndDate('');
            setSortBy('DATE_DESC');
            setSearchTerm('');
          }}
          accentColor="amber"
          resultSummary={
            activeTab === 'dist'
              ? `${filteredDistributions.length} Bon • Total ${totalDistQty.toLocaleString('id-ID')} Kg`
              : `${filteredStocks.length} Penerimaan • Total ${totalStockQty.toLocaleString('id-ID')} Kemasan`
          }
        />
      </div>

      {/* Main Table: Distribution or Stock */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {activeTab === 'dist' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3.5">NO BON</th>
                  <th className="py-3 px-3.5">WAKTU</th>
                  <th className="py-3 px-3.5">CN UNIT & ALAT</th>
                  <th className="py-3 px-3.5">HM</th>
                  <th className="py-3 px-3.5">JENIS GREASE</th>
                  <th className="py-3 px-3.5">QTY</th>
                  <th className="py-3 px-3.5">LOKASI PELUMASAN</th>
                  <th className="py-3 px-3.5">MEKANIK</th>
                  <th className="py-3 px-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {(() => {
                  const renderDistRow = (d: GreaseDistributionRecord) => (
                    <tr key={d.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3.5 font-bold text-amber-400">{d.noBon || '-'}</td>
                      <td className="py-3 px-3.5 text-stone-400 whitespace-nowrap">{d.tanggal} {d.jam}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-stone-100">{d.noUnit}</span>
                        <span className="block text-[10px] text-stone-400 truncate max-w-[140px]">{d.namaAlat}</span>
                      </td>
                      <td className="py-3 px-3.5 text-stone-300 tabular-nums">{d.hmUnit}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-semibold">
                          {d.namaGrease}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-amber-300 tabular-nums">{d.qty} {d.satuan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{d.lokasiPelumasan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{d.picMekanik}</td>
                      <td className="py-3 px-3.5 text-center">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus bon grease unit ${d.noUnit}?`)) {
                                const res = onDeleteDistribution(d.id);
                                if (res.success) setFeedback({ type: 'success', text: res.message });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );

                  if (filteredDistributions.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-stone-500 text-xs">
                          Belum ada data bon pemakaian grease sesuai filter yang dipilih.
                        </td>
                      </tr>
                    );
                  }

                  if (groupedDistributions) {
                    return groupedDistributions.map((grp) => (
                      <React.Fragment key={grp.key}>
                        <tr className="bg-amber-950/30 border-y border-amber-500/20">
                          <td colSpan={9} className="py-2 px-3.5 text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wide">
                            {grp.label} ({grp.items.length} Bon)
                          </td>
                        </tr>
                        {grp.items.map(renderDistRow)}
                        <tr className="bg-stone-950/90 border-b border-amber-500/30">
                          <td colSpan={5} className="py-2 px-3.5 text-right text-[11px] font-bold text-stone-300">
                            SUBTOTAL {grp.key} ({grp.items.length} Bon):
                          </td>
                          <td className="py-2 px-3.5 font-black text-amber-400 text-xs tabular-nums">
                            {grp.subtotalQty.toLocaleString('id-ID')} Kg
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </React.Fragment>
                    ));
                  }

                  return filteredDistributions.map(renderDistRow);
                })()}
              </tbody>
              {filteredDistributions.length > 0 && (
                <tfoot className="bg-stone-950 border-t-2 border-amber-500/40 font-mono">
                  <tr>
                    <td colSpan={5} className="py-3 px-3.5 text-right text-xs font-black text-stone-200 uppercase">
                      GRAND TOTAL PEMAKAIAN ({filteredDistributions.length} Bon):
                    </td>
                    <td className="py-3 px-3.5 text-sm font-black text-amber-400 tabular-nums">
                      {totalDistQty.toLocaleString('id-ID')} Kg
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3.5">DISTRIBUTOR / VENDOR</th>
                  <th className="py-3 px-3.5">TANGGAL & JAM</th>
                  <th className="py-3 px-3.5">NAMA GREASE</th>
                  <th className="py-3 px-3.5">JUMLAH STOK MASUK</th>
                  <th className="py-3 px-3.5">PIC GUDANG</th>
                  <th className="py-3 px-3.5">REMARK</th>
                  <th className="py-3 px-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {(() => {
                  const renderStockRow = (s: GreaseStockRecord) => (
                    <tr key={s.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3.5 font-bold text-stone-100">{s.distributor}</td>
                      <td className="py-3 px-3.5 text-stone-400 whitespace-nowrap">{s.tanggal} {s.jam}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-semibold">
                          {s.namaGrease}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-emerald-400 tabular-nums">{s.qty} {s.satuan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{s.picGudang}</td>
                      <td className="py-3 px-3.5 text-stone-400 text-[11px] truncate max-w-xs">{s.remark || '-'}</td>
                      <td className="py-3 px-3.5 text-center">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus stok masuk grease ${s.namaGrease}?`)) {
                                const res = onDeleteStock(s.id);
                                if (res.success) setFeedback({ type: 'success', text: res.message });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );

                  if (filteredStocks.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-500 text-xs">
                          Belum ada data stok masuk grease sesuai filter yang dipilih.
                        </td>
                      </tr>
                    );
                  }

                  if (groupedStocks) {
                    return groupedStocks.map((grp) => (
                      <React.Fragment key={grp.key}>
                        <tr className="bg-amber-950/30 border-y border-amber-500/20">
                          <td colSpan={7} className="py-2 px-3.5 text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wide">
                            {grp.label} ({grp.items.length} Penerimaan)
                          </td>
                        </tr>
                        {grp.items.map(renderStockRow)}
                        <tr className="bg-stone-950/90 border-b border-amber-500/30">
                          <td colSpan={3} className="py-2 px-3.5 text-right text-[11px] font-bold text-stone-300">
                            SUBTOTAL {grp.key} ({grp.items.length} DO):
                          </td>
                          <td className="py-2 px-3.5 font-black text-emerald-400 text-xs tabular-nums">
                            {grp.subtotalQty.toLocaleString('id-ID')} Kemasan
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </React.Fragment>
                    ));
                  }

                  return filteredStocks.map(renderStockRow);
                })()}
              </tbody>
              {filteredStocks.length > 0 && (
                <tfoot className="bg-stone-950 border-t-2 border-amber-500/40 font-mono">
                  <tr>
                    <td colSpan={3} className="py-3 px-3.5 text-right text-xs font-black text-stone-200 uppercase">
                      GRAND TOTAL PENERIMAAN ({filteredStocks.length} DO):
                    </td>
                    <td className="py-3 px-3.5 text-sm font-black text-emerald-400 tabular-nums">
                      {totalStockQty.toLocaleString('id-ID')} Kemasan
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] sm:max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl my-auto">
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <h3 className="text-sm font-bold font-mono text-stone-100 flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{activeTab === 'dist' ? 'FORM BON PEMAKAIAN GREASE' : 'FORM INPUT STOK GREASE MASUK'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 shrink-0"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs font-mono">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-5 space-y-4">
              {activeTab === 'dist' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={distTanggal}
                        onChange={(e) => setDistTanggal(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Jam (24 Jam)</label>
                      <TimeInput24Hour
                        value={distJam}
                        onChange={(val) => setDistJam(val)}
                        placeholder="08:00"
                      />
                    </div>
                  </div>

                  {/* Reff Unit Alat Berat (Modul 1 Asset) */}
                  <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 space-y-3">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      Reff Unit Alat Berat (Modul 1 Asset)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-400 mb-1">1. Jenis Alat (Modul 1) *</label>
                        <select
                          value={distSelectedJenis}
                          onChange={(e) => handleDistJenisChange(e.target.value)}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                        >
                          <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                          {availableJenisList.map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 mb-1">2. CN_NEW (Unit) *</label>
                        <select
                          required
                          value={distNoUnit}
                          onChange={(e) => handleUnitSelect(e.target.value)}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                        >
                          <option value="">
                            {distSelectedJenis 
                              ? `-- Pilih CN_NEW (${distSelectedJenis}) --` 
                              : '-- Pilih CN_NEW (Semua Jenis) --'}
                          </option>
                          {distSelectedJenis ? (
                            availableUnitsForDistJenis.map((u: any) => {
                              const cn = getUnitCn(u);
                              return (
                                <option key={u.id || cn} value={cn}>
                                  {cn} — {getUnitName(u)}
                                </option>
                              );
                            })
                          ) : (
                            availableJenisList.map((j) => {
                              const matches = units.filter((u: any) => getUnitJenis(u).toLowerCase() === j.toLowerCase());
                              if (matches.length === 0) return null;
                              return (
                                <optgroup key={j} label={`Kelompok: ${j}`}>
                                  {matches.map((u: any) => {
                                    const cn = getUnitCn(u);
                                    return (
                                      <option key={u.id || cn} value={cn}>
                                        {cn} — {getUnitName(u)}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-400 mb-1">Nama Alat (Otomatis)</label>
                        <input
                          type="text"
                          readOnly
                          value={distNamaAlat}
                          placeholder="Otomatis dari CN_NEW terpilih"
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-300 font-medium cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-400 mb-1">HM Unit Saat Greasing</label>
                        <input
                          type="number"
                          value={distHmUnit}
                          onChange={(e) => setDistHmUnit(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-stone-400 mb-1">Nama Jenis Grease (Input Bebas Manual) *</label>
                      <input
                        type="text"
                        required
                        list="grease-dist-types-list"
                        placeholder="Ketik manual jenis grease (contoh: Pertamina Grease Chassis, Shell Gadus, dll.)"
                        value={distNamaGrease}
                        onChange={(e) => setDistNamaGrease(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                      />
                      <datalist id="grease-dist-types-list">
                        {DEFAULT_GREASE_TYPES.map((g) => (
                          <option key={g} value={g} />
                        ))}
                        <option value="Pertamina Grease Chassis NLGI 2" />
                        <option value="Pertamina EP Grease NLGI 2" />
                        <option value="Shell Gadus S2 V220 2" />
                        <option value="Mobilgrease XHP 222" />
                        <option value="Castrol Spheerol EPL 2" />
                        <option value="Total Multis EP 2" />
                      </datalist>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        Bebas diketik manual atau klik saran jenis grease
                      </span>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Qty Pemakaian</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={distQty}
                          onChange={(e) => setDistQty(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-center font-bold"
                        />
                        <span className="text-stone-400 text-xs">Kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Titik / Lokasi Pelumasan</label>
                      <select
                        value={distLokasi}
                        onChange={(e) => setDistLokasi(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      >
                        {GREASE_LOKASI_PRESETS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-1 flex items-center justify-between">
                        <span>PIC Mekanik *</span>
                        <span className="text-[10px] text-amber-400 font-mono">Khusus Mekanik</span>
                      </label>
                      <select
                        value={distPicMekanik}
                        onChange={(e) => setDistPicMekanik(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs"
                      >
                        <option value="">-- Pilih PIC Mekanik (Hanya Mekanik - Urut Abjad) --</option>
                        {effectiveGreaseMechanics.map((m) => (
                          <option key={m.id} value={m.nama}>
                            [{m.jabatan}] {m.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Keterangan / Remark</label>
                    <input
                      type="text"
                      value={distRemark}
                      onChange={(e) => setDistRemark(e.target.value)}
                      placeholder="Catatan servis rutin, grease gun manual/pneumatic..."
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={stockTanggal}
                        onChange={(e) => setStockTanggal(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Jam (24 Jam)</label>
                      <TimeInput24Hour
                        value={stockJam}
                        onChange={(val) => setStockJam(val)}
                        placeholder="08:00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Distributor / Suplier</label>
                    <select
                      value={stockDistributor}
                      onChange={(e) => setStockDistributor(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.nama}>{s.nama} ({s.telepon})</option>
                      ))}
                      <option value="PT Pertamina Lubricants">PT Pertamina Lubricants</option>
                      <option value="PT Shell Indonesia">PT Shell Indonesia</option>
                      <option value="PT Traktor Nusantara">PT Traktor Nusantara</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-stone-400 mb-1">Jenis Grease (Input Bebas Manual) *</label>
                      <input
                        type="text"
                        required
                        list="grease-stock-types-list"
                        placeholder="Ketik manual jenis grease (contoh: Pertamina Grease Chassis, Shell Gadus, dll.)"
                        value={stockNamaGrease}
                        onChange={(e) => setStockNamaGrease(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                      />
                      <datalist id="grease-stock-types-list">
                        {DEFAULT_GREASE_TYPES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                        <option value="Pertamina Grease Chassis NLGI 2" />
                        <option value="Pertamina EP Grease NLGI 2" />
                        <option value="Shell Gadus S2 V220 2" />
                        <option value="Mobilgrease XHP 222" />
                        <option value="Castrol Spheerol EPL 2" />
                        <option value="Total Multis EP 2" />
                      </datalist>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        Bebas diketik manual atau klik saran jenis grease
                      </span>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Qty</label>
                      <input
                        type="number"
                        required
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Satuan Kemasan</label>
                      <select
                        value={stockSatuan}
                        onChange={(e) => setStockSatuan(e.target.value as any)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      >
                        <option value="Pail">Pail (15 Kg)</option>
                        <option value="Drum">Drum (180 Kg)</option>
                        <option value="Kg">Kg</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1 flex items-center justify-between">
                        <span>PIC Penerima Gudang *</span>
                        <span className="text-[10px] text-blue-400 font-mono">Administrasi &amp; Kabag</span>
                      </label>
                      <select
                        value={stockPicGudang}
                        onChange={(e) => setStockPicGudang(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs"
                      >
                        <option value="">-- Pilih PIC Gudang (Hanya Administrasi &amp; Kabag - Urut Abjad) --</option>
                        {effectiveGreaseWarehouse.map((m) => (
                          <option key={m.id} value={m.nama}>
                            [{m.jabatan}] {m.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Keterangan / No Surat Jalan</label>
                    <input
                      type="text"
                      value={stockRemark}
                      onChange={(e) => setStockRemark(e.target.value)}
                      placeholder="No PO / DO pengiriman supplier..."
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                    />
                  </div>
                </>
              )}

              </div>

              <div className="shrink-0 flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-stone-800 bg-stone-950/95">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 min-h-[40px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold whitespace-nowrap"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 whitespace-nowrap"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU PDF RESMI */}
      <PdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title={
          activeTab === 'dist'
            ? 'PRATINJAU PRINT - PEMAKAIAN GREASE UNIT'
            : 'PRATINJAU PRINT - STOK MASUK GREASE GUDANG'
        }
        subtitle="PT BATU KALI WELANG AMPUH • Site Quarry Purwosari"
        pdfBlobUrl={previewPdfUrl}
        filename={previewFilename}
        onDownload={canExport && previewDownloadFn ? previewDownloadFn : undefined}
        signatoriesSummary={{
          pembuat: `${signatories.pembuat} (${signatories.pembuatJabatan})`,
          diperiksa: `${signatories.diperiksa} (${signatories.diperiksaJabatan})`,
          diketahui: `${signatories.kabag} (${signatories.kabagJabatan})`,
        }}
      />
    </div>
  );
};
