import React, { useState, useMemo, useEffect } from 'react';
import {
  AssetUnit,
  MasterPartItem,
  RplPackage,
  RplPackageItem,
  RPL_INTERVAL_OPTIONS,
  UserAccount,
} from '../../types';
import {
  getAllRplPackages,
  addOrUpdateRplPackage,
  deleteRplPackage,
  getAllManpower,
  isDeveloper,
  canUserInsertModule,
  canUserEditModule,
  canUserDeleteModule,
  canUserExportModule,
  canUserPrintPreviewModule,
} from '../../utils/storage';
import { generateRplPackagePDF } from '../../utils/pdfGenerator';
import { resolveReportSignatories } from '../../utils/reportSignatories';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import {
  Package,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Layers,
  Lock,
  ArrowRightLeft,
} from 'lucide-react';

interface RplSubViewProps {
  units: AssetUnit[];
  masterParts: MasterPartItem[];
  currentUser: UserAccount;
}

export const RplSubView: React.FC<RplSubViewProps> = ({
  units,
  masterParts,
  currentUser,
}) => {
  const isDev = isDeveloper(currentUser);
  const canInsert = canUserInsertModule(currentUser, 8) || isDev;
  const canEdit = canUserEditModule(currentUser, 8) || isDev;
  const canDelete = canUserDeleteModule(currentUser, 8) || isDev;
  const canExport = canUserExportModule(currentUser, 8) || isDev;
  const canPrintPreview = canUserPrintPreviewModule(currentUser, 8) || isDev;

  const [packages, setPackages] = useState<RplPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPackages = () => {
    setIsLoading(true);
    setPackages(getAllRplPackages());
    setIsLoading(false);
  };

  useEffect(() => {
    loadPackages();
    const handleSync = () => loadPackages();
    window.addEventListener('bkwa-rpl-packages-changed', handleSync);
    window.addEventListener('bkwa-firestore-synced', handleSync);
    return () => {
      window.removeEventListener('bkwa-rpl-packages-changed', handleSync);
      window.removeEventListener('bkwa-firestore-synced', handleSync);
    };
  }, []);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Quick package caller state
  const [callerQuery, setCallerQuery] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [expandedInterchangePartIds, setExpandedInterchangePartIds] = useState<
    Record<string, boolean>
  >({});

  // List search/filter
  const [listSearch, setListSearch] = useState('');
  const [listIntervalFilter, setListIntervalFilter] = useState('ALL');

  // Form create/edit state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [packagePn, setPackagePn] = useState('');
  const [packageName, setPackageName] = useState('');
  const [serviceInterval, setServiceInterval] = useState<string>('250 HM');
  const [targetJenisUnit, setTargetJenisUnit] = useState<string>('Semua Unit');
  const [targetNoUnit, setTargetNoUnit] = useState<string>('');
  const [packageNotes, setPackageNotes] = useState<string>('');
  const [draftItems, setDraftItems] = useState<RplPackageItem[]>([]);

  // Master Part Picker inside form
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerJenisFilter, setPickerJenisFilter] = useState('');
  const [pickerKategoriFilter, setPickerKategoriFilter] = useState('ALL');

  // Delete confirmation modal state
  const [deletingPkg, setDeletingPkg] = useState<{
    id: string;
    pn: string;
    name: string;
  } | null>(null);

  // PDF Preview state
  const [pdfPreview, setPdfPreview] = useState<{
    isOpen: boolean;
    blobUrl: string | null;
    filename: string;
    title: string;
    downloadFn?: () => void;
  }>({
    isOpen: false,
    blobUrl: null,
    filename: '',
    title: '',
  });

  const masterPartsMap = useMemo(() => {
    const map = new Map<string, MasterPartItem>();
    masterParts.forEach((p) => map.set(p.id, p));
    return map;
  }, [masterParts]);

  const availableJenisOptions = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.jenis && u.jenis.trim()) set.add(u.jenis.trim());
    });
    masterParts.forEach((p) => {
      if (p.jenisUnit && p.jenisUnit.trim()) set.add(p.jenisUnit.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [units, masterParts]);

  const matchingCallerPackages = useMemo(() => {
    const q = callerQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.packagePn.toLowerCase().includes(q) ||
        p.packageName.toLowerCase().includes(q) ||
        p.serviceInterval.toLowerCase().includes(q) ||
        (p.jenisUnit || '').toLowerCase().includes(q) ||
        (p.noUnit || '').toLowerCase().includes(q)
    );
  }, [packages, callerQuery]);

  const activePackage = useMemo(() => {
    if (selectedPackageId) {
      return packages.find((p) => p.id === selectedPackageId) || null;
    }
    if (callerQuery.trim()) {
      const exact = packages.find(
        (p) => p.packagePn.trim().toLowerCase() === callerQuery.trim().toLowerCase()
      );
      if (exact) return exact;
    }
    return null;
  }, [packages, selectedPackageId, callerQuery]);

  const filteredPackageList = useMemo(() => {
    return packages.filter((p) => {
      if (listIntervalFilter !== 'ALL' && p.serviceInterval !== listIntervalFilter) {
        return false;
      }
      if (listSearch.trim()) {
        const q = listSearch.toLowerCase();
        const hay = `${p.packagePn} ${p.packageName} ${p.serviceInterval} ${p.jenisUnit} ${p.noUnit || ''} ${p.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [packages, listIntervalFilter, listSearch]);

  const filteredMasterPickerParts = useMemo(() => {
    return masterParts.filter((p) => {
      if (pickerJenisFilter && (p.jenisUnit || '').toLowerCase() !== pickerJenisFilter.toLowerCase()) {
        return false;
      }
      if (pickerKategoriFilter !== 'ALL' && p.kategori !== pickerKategoriFilter) {
        return false;
      }
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const hay = `${p.pn} ${p.namaPart} ${p.merk} ${p.noUnit} ${p.jenisUnit}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [masterParts, pickerSearch, pickerJenisFilter, pickerKategoriFilter]);

  const resetBuilderForm = () => {
    setEditingPkgId(null);
    setPackagePn('');
    setPackageName('');
    setServiceInterval('250 HM');
    setTargetJenisUnit('Semua Unit');
    setTargetNoUnit('');
    setPackageNotes('');
    setDraftItems([]);
    setPickerSearch('');
  };

  const handleOpenNewBuilder = () => {
    if (!canInsert) return;
    resetBuilderForm();
    setShowBuilder(true);
  };

  const handleOpenEditPackage = (pkg: RplPackage) => {
    if (!canEdit) return;
    setEditingPkgId(pkg.id);
    setPackagePn(pkg.packagePn);
    setPackageName(pkg.packageName);
    setServiceInterval(pkg.serviceInterval || '250 HM');
    setTargetJenisUnit(pkg.jenisUnit || 'Semua Unit');
    setTargetNoUnit(pkg.noUnit || '');
    setPackageNotes(pkg.notes || '');
    setDraftItems(pkg.items.map((item) => ({ ...item })));
    setShowBuilder(true);
  };

  const handleAddMasterPartToDraft = (part: MasterPartItem) => {
    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.masterPartId === part.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qtyNeeded: updated[existingIdx].qtyNeeded + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `RPLI-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          masterPartId: part.id,
          pn: part.pn || '-',
          namaPart: part.namaPart,
          merk: part.merk || 'Universal',
          kategori: part.kategori,
          jenisPart: part.jenisPart,
          fungsi: part.fungsi,
          satuan: part.satuan || 'Pcs',
          qtyNeeded: 1,
          notes: '',
        },
      ];
    });
  };

  const handleUpdateDraftItem = (
    idx: number,
    field: 'qtyNeeded' | 'notes',
    value: number | string
  ) => {
    setDraftItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveDraftItem = (idx: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (editingPkgId && !canEdit) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Anda tidak memiliki izin Edit Paket RPL.' });
      return;
    }
    if (!editingPkgId && !canInsert) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Anda tidak memiliki izin Buat Paket RPL.' });
      return;
    }

    const res = addOrUpdateRplPackage(
      {
        packagePn: packagePn.trim().toUpperCase(),
        packageName: packageName.trim(),
        serviceInterval,
        jenisUnit: targetJenisUnit || 'Semua Unit',
        noUnit: targetNoUnit.trim(),
        notes: packageNotes.trim(),
        items: draftItems,
        createdBy: currentUser.fullName || currentUser.username,
      },
      editingPkgId || undefined
    );

    if (res.success && res.record) {
      setFeedback({ type: 'success', message: res.message });
      loadPackages();
      setSelectedPackageId(res.record.id);
      setCallerQuery(res.record.packagePn);
      setShowBuilder(false);
      resetBuilderForm();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleConfirmDeletePackage = () => {
    if (!canDelete || !deletingPkg) return;
    const res = deleteRplPackage(deletingPkg.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      if (selectedPackageId === deletingPkg.id) {
        setSelectedPackageId('');
        setCallerQuery('');
      }
      loadPackages();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    setDeletingPkg(null);
  };

  const handlePrintRplPackage = (pkg: RplPackage) => {
    if (!canPrintPreview) {
      setFeedback({
        type: 'error',
        message: 'Akses ditolak: Anda tidak memiliki izin Print Preview pada Modul 8.',
      });
      return;
    }
    if (!pkg.items || pkg.items.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Paket RPL tidak memiliki daftar part untuk dicetak.',
      });
      return;
    }

    const manpower = getAllManpower();
    const signatories = resolveReportSignatories(manpower, currentUser);
    const pdfRes = generateRplPackagePDF({
      pkg,
      masterParts,
      currentUser,
      signatories,
    });

    setPdfPreview({
      isOpen: true,
      blobUrl: pdfRes.blobUrl,
      filename: pdfRes.filename,
      title: `Print Preview RPL — ${pkg.packagePn}`,
      downloadFn: pdfRes.download,
    });
  };

  const handleClosePdfPreview = () => {
    if (pdfPreview.blobUrl) {
      URL.revokeObjectURL(pdfPreview.blobUrl);
    }
    setPdfPreview({ isOpen: false, blobUrl: null, filename: '', title: '' });
  };

  const handleExportRplCsv = (pkg: RplPackage) => {
    if (!canExport) {
      setFeedback({
        type: 'error',
        message: 'Akses ditolak: Anda tidak memiliki izin Ekspor CSV pada Modul 8.',
      });
      return;
    }

    const headers = [
      'No',
      'PN Paket',
      'Nama Paket',
      'Interval Service',
      'Target Unit',
      'Part Number (PN)',
      'Nama Part',
      'Merk',
      'Kategori',
      'Jenis Part',
      'Tipe Part',
      'Qty Paket',
      'Stok Master',
      'Min Stock',
      'Satuan',
      'Catatan Item',
    ];

    const rows = pkg.items.map((item, idx) => {
      const live = masterPartsMap.get(item.masterPartId);
      const tipe = live?.partRelationType || 'In Line';
      const qtyStok = live ? live.qty : 0;
      const minStock = live ? Number(live.minStock ?? 0) : 0;

      return [
        idx + 1,
        `"${pkg.packagePn}"`,
        `"${pkg.packageName.replace(/"/g, '""')}"`,
        `"${pkg.serviceInterval}"`,
        `"${pkg.jenisUnit}${pkg.noUnit ? ` (${pkg.noUnit})` : ''}"`,
        `"${(live?.pn || item.pn || '-').replace(/"/g, '""')}"`,
        `"${(live?.namaPart || item.namaPart).replace(/"/g, '""')}"`,
        `"${(live?.merk || item.merk || '-').replace(/"/g, '""')}"`,
        `"${live?.kategori || item.kategori}"`,
        `"${live?.jenisPart || item.jenisPart}"`,
        `"${tipe}"`,
        item.qtyNeeded,
        qtyStok,
        minStock,
        `"${live?.satuan || item.satuan || 'Pcs'}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `RPL_${pkg.packagePn.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCallPackage = (pkg: RplPackage) => {
    setSelectedPackageId(pkg.id);
    setCallerQuery(pkg.packagePn);
    setExpandedInterchangePartIds({});
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: PEMANGGIL CEPAT PN PAKET RPL (SERVICE PERIODIC) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-stone-100 font-semibold text-sm">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Panggil PN Paket RPL (Service Periodic)</span>
            <span className="text-xs text-stone-400 font-normal">
              · Ketik atau pilih PN Paket untuk memunculkan seluruh rincian Part Number
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canInsert ? (
              <button
                type="button"
                onClick={handleOpenNewBuilder}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Paket RPL Baru</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-stone-500 bg-stone-950 border border-stone-800 rounded-lg whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                <span>View Only</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Quick Call Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Cari / Panggil PN Paket
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={callerQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCallerQuery(val);
                    const exact = packages.find(
                      (p) => p.packagePn.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (exact) setSelectedPackageId(exact.id);
                    else if (!val.trim()) setSelectedPackageId('');
                  }}
                  placeholder="Ketik PN Paket (contoh: RPL-EX200-250HM)..."
                  className="w-full bg-stone-950 border border-stone-700 text-amber-300 font-mono text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Atau Pilih Langsung dari Daftar Paket ({matchingCallerPackages.length})
              </label>
              <select
                value={selectedPackageId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPackageId(id);
                  const found = packages.find((p) => p.id === id);
                  if (found) setCallerQuery(found.packagePn);
                  setExpandedInterchangePartIds({});
                }}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">-- Pilih PN Paket Service Periodic --</option>
                {matchingCallerPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.packagePn} — {pkg.packageName} ({pkg.serviceInterval}) [{pkg.items.length} PN]
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={() => {
                  setCallerQuery('');
                  setSelectedPackageId('');
                  setExpandedInterchangePartIds({});
                }}
                className="w-full px-3 py-2 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Reset Pilihan
              </button>
            </div>
          </div>

          {/* Active Called Package Detail */}
          {activePackage ? (
            <div className="border border-stone-800 rounded-xl bg-stone-950/70 overflow-hidden">
              <div className="p-4 border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-base text-amber-400">
                      {activePackage.packagePn}
                    </span>
                    <span className="text-stone-500">·</span>
                    <span className="font-semibold text-sm text-stone-100">
                      {activePackage.packageName}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                    <span>Interval: <strong className="text-stone-200 font-mono">{activePackage.serviceInterval}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Target: <strong className="text-stone-200">{activePackage.jenisUnit}</strong>
                      {activePackage.noUnit ? ` (${activePackage.noUnit})` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Total Item: <strong className="text-amber-400 font-mono tabular-nums">{activePackage.items.length} Part</strong>
                    </span>
                    {activePackage.notes && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Catatan: {activePackage.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(activePackage)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Paket</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePrintRplPackage(activePackage)}
                    disabled={!canPrintPreview}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      canPrintPreview
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-stone-800 text-stone-600 border-stone-800 cursor-not-allowed'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportRplCsv(activePackage)}
                    disabled={!canExport}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      canExport
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/40'
                        : 'bg-stone-800 text-stone-600 border-stone-800 cursor-not-allowed'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                  <thead>
                    <tr className="bg-stone-900 text-stone-300 border-b border-stone-800 font-mono">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-36">Part Number (PN)</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Nama Part</th>
                      <th className="py-2.5 px-3 w-28">Merk</th>
                      <th className="py-2.5 px-3 w-28">Kategori</th>
                      <th className="py-2.5 px-3 w-28">Jenis Part</th>
                      <th className="py-2.5 px-3 w-32">Tipe</th>
                      <th className="py-2.5 px-3 w-24 text-center">Qty Paket</th>
                      <th className="py-2.5 px-3 w-24 text-center">Stok Master</th>
                      <th className="py-2.5 px-3 w-20 text-center">Min Stock</th>
                      <th className="py-2.5 px-3 w-40">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/70">
                    {activePackage.items.map((item, idx) => {
                      const live = masterPartsMap.get(item.masterPartId);
                      const tipe = live?.partRelationType || 'In Line';
                      const subParts = live?.interchangeParts || [];
                      const isInterchange = tipe === 'Interchange' || subParts.length > 0;
                      const isExpanded = Boolean(expandedInterchangePartIds[item.id]);
                      const liveQty = live ? Number(live.qty || 0) : 0;
                      const minStock = live ? Number(live.minStock ?? 0) : 0;
                      const isShortage = live ? liveQty < item.qtyNeeded : true;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-stone-900/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums text-stone-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-amber-300">
                              {live?.pn || item.pn || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-100 font-medium">
                              {live?.namaPart || item.namaPart}
                              {!live && (
                                <span className="block text-[10px] text-amber-400">
                                  Data master part tidak ditemukan (snapshot)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-stone-300">
                              {live?.merk || item.merk || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-300">
                              {live?.kategori || item.kategori}
                            </td>
                            <td className="py-2.5 px-3 text-stone-300">
                              {live?.jenisPart || item.jenisPart}
                            </td>
                            <td className="py-2.5 px-3">
                              {isInterchange ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedInterchangePartIds((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-950/60 text-sky-300 border border-sky-800/80 hover:bg-sky-900/60 transition-colors whitespace-nowrap"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  <span>Interchange ({subParts.length})</span>
                                </button>
                              ) : (
                                <span className="text-stone-400 text-[11px]">In Line</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-amber-400">
                              {item.qtyNeeded}{' '}
                              <span className="text-[10px] font-normal text-stone-400">
                                {live?.satuan || item.satuan || 'Pcs'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              <span
                                className={`font-bold ${
                                  isShortage ? 'text-red-400' : 'text-emerald-400'
                                }`}
                              >
                                {live ? liveQty : '-'}
                              </span>
                              {live && isShortage && (
                                <span className="block text-[9px] text-red-400">Kurang</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums text-stone-300">
                              {live ? minStock : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-400">
                              {item.notes || '-'}
                            </td>
                          </tr>

                          {/* Interchange preview sub-rows if expanded */}
                          {isInterchange && isExpanded && (
                            <tr className="bg-stone-950/90">
                              <td colSpan={11} className="p-3 pl-10 border-b border-stone-800">
                                <div className="border border-sky-900/50 rounded-lg overflow-hidden bg-stone-900/60">
                                  <div className="px-3 py-1.5 bg-sky-950/30 border-b border-sky-900/40 flex items-center gap-2 text-[11px] font-semibold text-sky-300">
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span>
                                      Sub-Tabel Interchange untuk {live?.namaPart || item.namaPart} ({subParts.length} alternatif)
                                    </span>
                                  </div>
                                  {subParts.length === 0 ? (
                                    <div className="p-3 text-[11px] text-stone-400">
                                      Belum ada part pengganti yang terdaftar pada item ini.
                                    </div>
                                  ) : (
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead>
                                        <tr className="bg-stone-900/90 text-stone-400 border-b border-stone-800 font-mono">
                                          <th className="py-1.5 px-2.5 w-10 text-center">No</th>
                                          <th className="py-1.5 px-2.5">Kategori</th>
                                          <th className="py-1.5 px-2.5">Jenis Part</th>
                                          <th className="py-1.5 px-2.5">Merk</th>
                                          <th className="py-1.5 px-2.5">Fungsi</th>
                                          <th className="py-1.5 px-2.5">Nama Part Pengganti</th>
                                          <th className="py-1.5 px-2.5">Part Number (PN)</th>
                                          <th className="py-1.5 px-2.5 text-center">Qty</th>
                                          <th className="py-1.5 px-2.5 text-center">Min Stock</th>
                                          <th className="py-1.5 px-2.5">Remark</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-800/60">
                                        {subParts.map((sub, sIdx) => (
                                          <tr key={sub.id} className="hover:bg-stone-800/30">
                                            <td className="py-1.5 px-2.5 text-center font-mono text-stone-400">
                                              {sub.noUrut || sIdx + 1}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-stone-300">{sub.kategori}</td>
                                            <td className="py-1.5 px-2.5 text-stone-300">{sub.jenisPart}</td>
                                            <td className="py-1.5 px-2.5 text-stone-300">{sub.merk || '-'}</td>
                                            <td className="py-1.5 px-2.5 text-stone-300">{sub.fungsi}</td>
                                            <td className="py-1.5 px-2.5 text-stone-100 font-medium">{sub.namaPart}</td>
                                            <td className="py-1.5 px-2.5 font-mono text-sky-300">{sub.pn || '-'}</td>
                                            <td className="py-1.5 px-2.5 text-center font-mono text-stone-200">
                                              {sub.qty} {sub.satuan || 'Pcs'}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-center font-mono text-amber-300">
                                              {Number(sub.minStock ?? 0)}
                                            </td>
                                            <td className="py-1.5 px-2.5 text-stone-400">{sub.remark || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-stone-800 rounded-xl p-8 text-center text-stone-400 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-sm font-medium text-stone-300">
                Belum ada PN Paket RPL yang dipanggil
              </p>
              <p className="mt-1 text-stone-500">
                Ketik atau pilih PN Paket di atas, atau klik tombol Panggil pada daftar paket di bawah untuk melihat rincian Part Number service periodic.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: FORM BUAT / EDIT PAKET RPL */}
      {showBuilder && (canInsert || canEdit) && (
        <form
          onSubmit={handleSavePackage}
          className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-100 font-semibold text-sm">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>
                {editingPkgId ? `Edit Paket RPL — ${packagePn}` : 'Buat Paket RPL (Recommended Part List) Baru'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBuilder(false);
                resetBuilderForm();
              }}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Metadata Paket */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  PN Paket RPL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={packagePn}
                  onChange={(e) => setPackagePn(e.target.value.toUpperCase())}
                  placeholder="Misal: RPL-EX200-250HM"
                  className="w-full bg-stone-950 border border-stone-700 text-amber-400 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nama Paket Service <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="Misal: Paket Service Periodic 250 HM Komatsu PC200"
                  className="w-full bg-stone-950 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Interval Service <span className="text-red-400">*</span>
                </label>
                <select
                  value={serviceInterval}
                  onChange={(e) => setServiceInterval(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  {RPL_INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Target Jenis Unit
                </label>
                <select
                  value={targetJenisUnit}
                  onChange={(e) => setTargetJenisUnit(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Semua Unit">Semua Unit</option>
                  <option value="Non Unit">Non Unit</option>
                  {availableJenisOptions
                    .filter((j) => j !== 'Non Unit')
                    .map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  No Unit / Model Spesifik (Opsional)
                </label>
                <input
                  type="text"
                  value={targetNoUnit}
                  onChange={(e) => setTargetNoUnit(e.target.value)}
                  placeholder="Misal: EX-01 / PC200-8"
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Catatan Paket (Opsional)
                </label>
                <input
                  type="text"
                  value={packageNotes}
                  onChange={(e) => setPackageNotes(e.target.value)}
                  placeholder="Keterangan tambahan mengenai service periodic paket ini..."
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Split Grid: Master Part Picker (Kiri) & Item Terpilih (Kanan) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Picker Master Part Terdaftar */}
              <div className="lg:col-span-6 border border-stone-800 rounded-xl bg-stone-950/70 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-200">
                      Pilih Part dari Katalog Master Part Terdaftar
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {filteredMasterPickerParts.length} Part
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="Cari PN / Nama Part..."
                        className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <select
                      value={pickerJenisFilter}
                      onChange={(e) => setPickerJenisFilter(e.target.value)}
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Semua Jenis Unit</option>
                      {availableJenisOptions.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pickerKategoriFilter}
                      onChange={(e) => setPickerKategoriFilter(e.target.value)}
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                    >
                      <option value="ALL">Semua Kategori</option>
                      <option value="Fast Moving">Fast Moving</option>
                      <option value="Slow Moving">Slow Moving</option>
                      <option value="Death Stock">Death Stock</option>
                    </select>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-stone-800/60">
                  {filteredMasterPickerParts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500">
                      Tidak ada part di Katalog Master Part yang cocok. Daftarkan part terlebih dahulu di Tab Katalog Master Part.
                    </div>
                  ) : (
                    filteredMasterPickerParts.map((part) => {
                      const alreadyAdded = draftItems.some((i) => i.masterPartId === part.id);
                      return (
                        <div
                          key={part.id}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-stone-900/50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-amber-400 shrink-0">
                                {part.pn || '-'}
                              </span>
                              <span className="font-medium text-stone-100 truncate">
                                {part.namaPart}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{part.noUnit}</span>
                              <span>·</span>
                              <span>{part.merk || '-'}</span>
                              <span>·</span>
                              <span>Stok: {part.qty} {part.satuan || 'Pcs'}</span>
                              <span>·</span>
                              <span>{part.partRelationType || 'In Line'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMasterPartToDraft(part)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                              alreadyAdded
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                          >
                            {alreadyAdded ? '+1 Qty' : '+ Pilih'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Daftar Part Dalam Paket */}
              <div className="lg:col-span-6 border border-stone-800 rounded-xl bg-stone-950/70 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-200">
                    Daftar Part dalam Paket ({draftItems.length} PN)
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">
                    Total Qty: {draftItems.reduce((a, b) => a + (Number(b.qtyNeeded) || 0), 0)}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {draftItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500">
                      Pilih satu atau beberapa item dari panel Katalog Master Part di sebelah kiri.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-900 text-stone-400 border-b border-stone-800 font-mono">
                          <th className="py-2 px-2.5">PN & Nama Part</th>
                          <th className="py-2 px-2 w-20 text-center">Qty</th>
                          <th className="py-2 px-2 w-32">Catatan</th>
                          <th className="py-2 px-2 w-10 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/60">
                        {draftItems.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-2 px-2.5">
                              <span className="font-mono text-amber-400 font-semibold block">
                                {item.pn}
                              </span>
                              <span className="text-stone-200 block text-[11px]">
                                {item.namaPart} ({item.satuan})
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.qtyNeeded}
                                onChange={(e) =>
                                  handleUpdateDraftItem(
                                    idx,
                                    'qtyNeeded',
                                    Math.max(1, Number(e.target.value) || 1)
                                  )
                                }
                                className="w-16 bg-stone-900 border border-stone-700 text-stone-100 text-center rounded px-1.5 py-1 font-mono text-xs focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) =>
                                  handleUpdateDraftItem(idx, 'notes', e.target.value)
                                }
                                placeholder="Catatan..."
                                className="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftItem(idx)}
                                className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                                title="Keluarkan dari paket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setShowBuilder(false);
                  resetBuilderForm();
                }}
                className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingPkgId ? 'Simpan Perubahan Paket' : 'Simpan Paket RPL'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SECTION 3: DAFTAR PAKET RPL TERDAFTAR */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Daftar Paket RPL Service Periodic Terdaftar</span>
            <span className="text-xs font-mono text-amber-400">
              · {filteredPackageList.length} Paket
            </span>
          </div>

          <button
            type="button"
            onClick={loadPackages}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="p-4 bg-stone-950/60 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Cari PN Paket, nama paket, atau target unit..."
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={listIntervalFilter}
              onChange={(e) => setListIntervalFilter(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Interval Service</option>
              {RPL_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-44">PN Paket</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Paket</th>
                <th className="py-3 px-3 w-28 text-center">Interval</th>
                <th className="py-3 px-3 w-40">Target Unit</th>
                <th className="py-3 px-3 w-24 text-center">Jumlah PN</th>
                <th className="py-3 px-3 w-24 text-center">Total Qty</th>
                <th className="py-3 px-3 w-48 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredPackageList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-500">
                    Belum ada Paket RPL Service Periodic yang terdaftar.
                  </td>
                </tr>
              ) : (
                filteredPackageList.map((pkg, idx) => {
                  const totalQty = pkg.items.reduce((a, b) => a + (Number(b.qtyNeeded) || 0), 0);
                  const isActive = activePackage?.id === pkg.id;
                  return (
                    <tr
                      key={pkg.id}
                      className={`hover:bg-stone-900/50 transition-colors ${
                        isActive ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-stone-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {pkg.packagePn}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-stone-100 block">
                          {pkg.packageName}
                        </span>
                        {pkg.notes && (
                          <span className="text-[10px] text-stone-400 block truncate max-w-[260px]">
                            {pkg.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-stone-200">
                        {pkg.serviceInterval}
                      </td>
                      <td className="py-3 px-3 text-stone-300">
                        <span>{pkg.jenisUnit || 'Semua Unit'}</span>
                        {pkg.noUnit && (
                          <span className="block font-mono text-[10px] text-stone-400">
                            {pkg.noUnit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-stone-200 font-semibold">
                        {pkg.items.length}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-amber-300 font-semibold">
                        {totalQty}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCallPackage(pkg)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded transition-colors whitespace-nowrap"
                          >
                            Panggil
                          </button>
                          {canPrintPreview && (
                            <button
                              type="button"
                              onClick={() => handlePrintRplPackage(pkg)}
                              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                              title="Print Preview PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canExport && (
                            <button
                              type="button"
                              onClick={() => handleExportRplCsv(pkg)}
                              className="p-1.5 text-stone-400 hover:text-emerald-400 hover:bg-stone-800 rounded transition-colors"
                              title="Ekspor CSV"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditPackage(pkg)}
                              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                              title="Edit Paket RPL"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeletingPkg({
                                  id: pkg.id,
                                  pn: pkg.packagePn,
                                  name: pkg.packageName,
                                })
                              }
                              className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                              title="Hapus Paket RPL"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Modal Konfirmasi Hapus Paket RPL */}
      {deletingPkg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100">Hapus Paket RPL?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Yakin ingin menghapus paket{' '}
                <strong className="font-mono text-amber-400">{deletingPkg.pn}</strong> (
                {deletingPkg.name})?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPkg(null)}
                className="px-4 py-2 text-xs text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePackage}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Print Preview PDF Resmi */}
      <PdfPreviewModal
        isOpen={pdfPreview.isOpen}
        onClose={handleClosePdfPreview}
        title={pdfPreview.title || 'Print Preview Paket RPL'}
        pdfBlobUrl={pdfPreview.blobUrl}
        filename={pdfPreview.filename}
        onDownload={pdfPreview.downloadFn}
      />
    </div>
  );
};
