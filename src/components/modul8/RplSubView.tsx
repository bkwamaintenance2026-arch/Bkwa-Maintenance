import React, { useState, useMemo, useEffect } from 'react';
import {
  AssetUnit,
  MasterPartItem,
  PurchaseRequest,
  RplPackage,
  RplPackageItem,
  RPL_INTERVAL_OPTIONS,
  UserAccount,
} from '../../types';
import {
  getAllRplPackages,
  addOrUpdateRplPackage,
  deleteRplPackage,
  createPurchaseRequest,
  getAllManpower,
  isDeveloper,
  canUserInsertModule,
  canUserEditModule,
  canUserDeleteModule,
  canUserExportModule,
  canUserPrintPreviewModule,
} from '../../utils/storage';
import {
  generateRplPackagePDF,
  generatePurchaseRequestPDF,
} from '../../utils/pdfGenerator';
import { resolveReportSignatories } from '../../utils/reportSignatories';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { PermintaanBarangModal } from '../modul6/PermintaanBarangModal';
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
  FileText,
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
  const canCreateSpb =
    canInsert || canUserInsertModule(currentUser, 6) || isDev;

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
    createdPr?: PurchaseRequest;
  } | null>(null);

  // Quick package caller state & Tab RPL Jenis -> Model Unit filter
  const [callerQuery, setCallerQuery] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [tabJenisFilter, setTabJenisFilter] = useState<string>('ALL');
  const [tabModelFilter, setTabModelFilter] = useState<string>('ALL');
  const [expandedInterchangePartIds, setExpandedInterchangePartIds] = useState<
    Record<string, boolean>
  >({});

  // List search/filter
  const [listSearch, setListSearch] = useState('');
  const [listIntervalFilter, setListIntervalFilter] = useState('ALL');

  // Form create/edit state (1. PN Paket RPL, 2. Nama Paket Service, 3. Interval Service, 4. JENIS, 5. MODEL UNIT, 6. Catatan Paket)
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [packagePn, setPackagePn] = useState('');
  const [packageName, setPackageName] = useState('');
  const [serviceInterval, setServiceInterval] = useState<string>('250 HM');
  const [targetJenisUnit, setTargetJenisUnit] = useState<string>('Semua Unit');
  const [targetModelUnit, setTargetModelUnit] = useState<string>('');
  const [packageNotes, setPackageNotes] = useState<string>('');
  const [draftItems, setDraftItems] = useState<RplPackageItem[]>([]);

  // Secondary filter on filtered Master Part catalog list inside Form RPL
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerKategoriFilter, setPickerKategoriFilter] = useState('ALL');
  const [includeNonUnitInPicker, setIncludeNonUnitInPicker] = useState(false);

  // Delete confirmation modal state
  const [deletingPkg, setDeletingPkg] = useState<{
    id: string;
    pn: string;
    name: string;
  } | null>(null);

  // Create SPB Modal state
  const [spbModalState, setSpbModalState] = useState<{
    isOpen: boolean;
    key: number;
    noMaintenanceOrder: string;
    noUnit: string;
    namaAlat: string;
    defaultAlasan: string;
    items: Array<{
      partNumber: string;
      namaBarang: string;
      qtyDiminta: number;
      satuan: string;
      keterangan?: string;
    }>;
  }>({
    isOpen: false,
    key: 0,
    noMaintenanceOrder: '',
    noUnit: '',
    namaAlat: '',
    defaultAlasan: '',
    items: [],
  });

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

  // Lookup cepat unit berdasarkan No Unit (cnNew) dari Modul 1
  const unitByCnMap = useMemo(() => {
    const map = new Map<string, AssetUnit>();
    units.forEach((u) => {
      const cn = (u.cnNew || '').trim().toLowerCase();
      if (cn) map.set(cn, u);
    });
    return map;
  }, [units]);

  // Pengelompokan JENIS berdasarkan Modul 1
  const jenisCountsModul1 = useMemo(() => {
    const map = new Map<string, number>();
    units.forEach((u) => {
      const j = (u.jenis || '').trim();
      if (j) map.set(j, (map.get(j) || 0) + 1);
    });
    return map;
  }, [units]);

  const availableJenisOptions = useMemo(() => {
    const set = new Set<string>(Array.from(jenisCountsModul1.keys()));
    masterParts.forEach((p) => {
      if (p.jenisUnit && p.jenisUnit.trim() && p.jenisUnit.trim() !== 'Non Unit') {
        set.add(p.jenisUnit.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jenisCountsModul1, masterParts]);

  // Helper: daftar unit Modul 1 untuk kombinasi (jenis, modelUnit)
  const getUnitsByJenisAndModel = (jenisVal: string, modelVal: string): AssetUnit[] => {
    if (jenisVal === 'Non Unit') return [];
    const filterAllJenis = !jenisVal || jenisVal === 'ALL' || jenisVal === 'Semua Unit';
    const filterAllModel = !modelVal || modelVal === 'ALL';

    const list = units.filter((u) => {
      if (!filterAllJenis && (u.jenis || '').trim().toLowerCase() !== jenisVal.trim().toLowerCase()) {
        return false;
      }
      if (!filterAllModel) {
        const uModel = (u.modelUnit || '').trim() || 'Tanpa Model';
        if (uModel.toLowerCase() !== modelVal.trim().toLowerCase()) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a, b) => (a.cnNew || '').localeCompare(b.cnNew || ''));
  };

  // Helper: daftar opsi Model Unit yang tersedia berdasarkan Jenis terpilih (Modul 1 + fallback Master Part)
  const buildModelOptionsForJenis = (jenisVal: string) => {
    if (jenisVal === 'Non Unit') return [];
    const filterAllJenis = !jenisVal || jenisVal === 'ALL' || jenisVal === 'Semua Unit';
    const map = new Map<string, { model: string; count: number; unitNumbers: string[] }>();

    units.forEach((u) => {
      if (!filterAllJenis && (u.jenis || '').trim().toLowerCase() !== jenisVal.trim().toLowerCase()) {
        return;
      }
      const model = (u.modelUnit || '').trim() || 'Tanpa Model';
      const entry = map.get(model) || { model, count: 0, unitNumbers: [] };
      entry.count += 1;
      if (u.cnNew && !entry.unitNumbers.includes(u.cnNew)) {
        entry.unitNumbers.push(u.cnNew);
      }
      map.set(model, entry);
    });

    // Sertakan juga modelUnit dari Master Part jika belum ada di unit Modul 1
    masterParts.forEach((p) => {
      const pJenis = (p.jenisUnit || '').trim();
      if (pJenis === 'Non Unit') return;
      if (!filterAllJenis && pJenis.toLowerCase() !== jenisVal.trim().toLowerCase()) return;
      const pModel = (p.modelUnit || '').trim();
      if (pModel && !map.has(pModel)) {
        map.set(pModel, { model: pModel, count: 0, unitNumbers: [] });
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        unitNumbers: [...item.unitNumbers].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.model.localeCompare(b.model));
  };

  // --- DERIVASI FILTER TAB RPL UTAMA (JENIS -> MODEL UNIT -> KETERANGAN NO UNIT) ---
  const tabModelOptions = useMemo(
    () => buildModelOptionsForJenis(tabJenisFilter),
    [units, masterParts, tabJenisFilter]
  );

  const tabMatchingUnits = useMemo(
    () => getUnitsByJenisAndModel(tabJenisFilter, tabModelFilter),
    [units, tabJenisFilter, tabModelFilter]
  );

  // --- DERIVASI FILTER FORM + PAKET RPL BARU (JENIS -> MODEL UNIT -> KETERANGAN NO UNIT) ---
  const builderModelOptions = useMemo(
    () => buildModelOptionsForJenis(targetJenisUnit),
    [units, masterParts, targetJenisUnit]
  );

  const builderMatchingUnits = useMemo(
    () => getUnitsByJenisAndModel(targetJenisUnit, targetModelUnit),
    [units, targetJenisUnit, targetModelUnit]
  );

  // Helper resolve Model Unit & daftar No Unit untuk sebuah RplPackage (support data baru & legacy)
  const resolvePackageTargetInfo = (pkg: RplPackage) => {
    const jenis = pkg.jenisUnit || 'Semua Unit';
    if (jenis === 'Non Unit') {
      return {
        jenis: 'Non Unit',
        modelUnit: '',
        matchingUnits: [] as AssetUnit[],
        noUnitSummary: 'NON-UNIT',
      };
    }

    let resolvedModel = (pkg.modelUnit || '').trim();
    if (!resolvedModel && pkg.noUnit && pkg.noUnit !== 'NON-UNIT') {
      const firstCn = pkg.noUnit.split(',')[0]?.trim().toLowerCase();
      if (firstCn) {
        const matched = unitByCnMap.get(firstCn);
        if (matched?.modelUnit) resolvedModel = matched.modelUnit.trim();
      }
    }

    const matchingUnits = resolvedModel
      ? getUnitsByJenisAndModel(jenis, resolvedModel)
      : jenis !== 'Semua Unit'
      ? getUnitsByJenisAndModel(jenis, '')
      : [];

    const cnList = matchingUnits.map((u) => u.cnNew).filter(Boolean);
    const noUnitSummary =
      cnList.length > 0 ? cnList.join(', ') : (pkg.noUnit || '').trim();

    return {
      jenis,
      modelUnit: resolvedModel,
      matchingUnits,
      noUnitSummary,
    };
  };

  const doesPackageMatchTabFilter = (pkg: RplPackage): boolean => {
    const info = resolvePackageTargetInfo(pkg);
    if (tabJenisFilter !== 'ALL') {
      if (tabJenisFilter === 'Non Unit') {
        if (info.jenis !== 'Non Unit') return false;
      } else if (info.jenis.toLowerCase() !== tabJenisFilter.toLowerCase()) {
        return false;
      }
    }
    if (tabModelFilter !== 'ALL' && tabJenisFilter !== 'Non Unit') {
      if (!info.modelUnit) return false;
      if (info.modelUnit.toLowerCase() !== tabModelFilter.toLowerCase()) {
        return false;
      }
    }
    return true;
  };

  const matchingCallerPackages = useMemo(() => {
    const byTarget = packages.filter((p) => doesPackageMatchTabFilter(p));
    const q = callerQuery.trim().toLowerCase();
    if (!q) return byTarget;
    return byTarget.filter((p) => {
      const info = resolvePackageTargetInfo(p);
      return (
        p.packagePn.toLowerCase().includes(q) ||
        p.packageName.toLowerCase().includes(q) ||
        p.serviceInterval.toLowerCase().includes(q) ||
        info.jenis.toLowerCase().includes(q) ||
        info.modelUnit.toLowerCase().includes(q) ||
        info.noUnitSummary.toLowerCase().includes(q)
      );
    });
  }, [packages, callerQuery, tabJenisFilter, tabModelFilter, units]);

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
      if (!doesPackageMatchTabFilter(p)) return false;
      if (listIntervalFilter !== 'ALL' && p.serviceInterval !== listIntervalFilter) {
        return false;
      }
      if (listSearch.trim()) {
        const q = listSearch.toLowerCase();
        const info = resolvePackageTargetInfo(p);
        const hay = `${p.packagePn} ${p.packageName} ${p.serviceInterval} ${info.jenis} ${info.modelUnit} ${info.noUnitSummary} ${p.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [packages, listIntervalFilter, listSearch, tabJenisFilter, tabModelFilter, units]);

  // List Katalog Master Part Terdaftar yang sudah terfilter sesuai JENIS (#4) dan MODEL UNIT (#5)
  const filteredMasterPickerParts = useMemo(() => {
    const matchingCnSet = new Set(
      builderMatchingUnits.map((u) => (u.cnNew || '').trim().toLowerCase()).filter(Boolean)
    );
    const hasSpecificModel = Boolean(targetModelUnit.trim() && targetModelUnit !== 'ALL');

    return masterParts.filter((p) => {
      const partJenis = (p.jenisUnit || '').trim().toLowerCase();
      const partNoUnit = (p.noUnit || '').trim().toLowerCase();
      const unitMeta = unitByCnMap.get(partNoUnit);
      const partModel = ((p.modelUnit || unitMeta?.modelUnit || '').trim() || 'Tanpa Model').toLowerCase();
      const isPartNonUnit = partJenis === 'non unit' || partNoUnit === 'non-unit';

      // Filter berdasar 4. JENIS & 5. MODEL UNIT
      if (targetJenisUnit === 'Non Unit') {
        if (!isPartNonUnit) return false;
      } else if (targetJenisUnit !== 'Semua Unit') {
        const matchesJenis = partJenis === targetJenisUnit.toLowerCase();
        if (!(matchesJenis || (includeNonUnitInPicker && isPartNonUnit))) {
          return false;
        }
        if (hasSpecificModel && !(includeNonUnitInPicker && isPartNonUnit)) {
          const matchesModel = partModel === targetModelUnit.trim().toLowerCase();
          const matchesUnitCn = matchingCnSet.has(partNoUnit);
          if (!matchesModel && !matchesUnitCn) {
            return false;
          }
        }
      } else if (hasSpecificModel) {
        // Semua Unit, tapi user memilih spesifik Model Unit
        const matchesModel = partModel === targetModelUnit.trim().toLowerCase();
        const matchesUnitCn = matchingCnSet.has(partNoUnit);
        if (!matchesModel && !matchesUnitCn && !(includeNonUnitInPicker && isPartNonUnit)) {
          return false;
        }
      }

      if (pickerKategoriFilter !== 'ALL' && p.kategori !== pickerKategoriFilter) {
        return false;
      }
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const subText = (p.interchangeParts || [])
          .map((s) => `${s.pn} ${s.namaPart} ${s.merk}`)
          .join(' ');
        const hay = `${p.pn} ${p.namaPart} ${p.merk} ${p.noUnit} ${p.jenisUnit} ${p.modelUnit || ''} ${unitMeta?.modelUnit || ''} ${subText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    masterParts,
    targetJenisUnit,
    targetModelUnit,
    builderMatchingUnits,
    unitByCnMap,
    includeNonUnitInPicker,
    pickerSearch,
    pickerKategoriFilter,
  ]);

  const draftItemsMap = useMemo(() => {
    const map = new Map<string, RplPackageItem>();
    draftItems.forEach((item) => map.set(item.masterPartId, item));
    return map;
  }, [draftItems]);

  const resetBuilderForm = () => {
    setEditingPkgId(null);
    setPackagePn('');
    setPackageName('');
    setServiceInterval('250 HM');
    setTargetJenisUnit('Semua Unit');
    setTargetModelUnit('');
    setPackageNotes('');
    setDraftItems([]);
    setPickerSearch('');
    setPickerKategoriFilter('ALL');
    setIncludeNonUnitInPicker(false);
  };

  const handleOpenNewBuilder = () => {
    if (!canInsert) return;
    resetBuilderForm();
    if (tabJenisFilter !== 'ALL') {
      setTargetJenisUnit(tabJenisFilter);
      if (tabJenisFilter !== 'Non Unit' && tabModelFilter !== 'ALL') {
        setTargetModelUnit(tabModelFilter);
      }
    } else if (tabModelFilter !== 'ALL') {
      setTargetModelUnit(tabModelFilter);
    }
    setShowBuilder(true);
  };

  const handleOpenEditPackage = (pkg: RplPackage) => {
    if (!canEdit) return;
    const info = resolvePackageTargetInfo(pkg);
    setEditingPkgId(pkg.id);
    setPackagePn(pkg.packagePn);
    setPackageName(pkg.packageName);
    setServiceInterval(pkg.serviceInterval || '250 HM');
    setTargetJenisUnit(info.jenis || 'Semua Unit');
    setTargetModelUnit(info.jenis === 'Non Unit' ? '' : info.modelUnit);
    setPackageNotes(pkg.notes || '');
    setDraftItems(pkg.items.map((item) => ({ ...item })));
    setShowBuilder(true);
  };

  const handleToggleMasterPartCheckbox = (part: MasterPartItem) => {
    setDraftItems((prev) => {
      const exists = prev.some((i) => i.masterPartId === part.id);
      if (exists) {
        return prev.filter((i) => i.masterPartId !== part.id);
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

  const handleToggleAllFilteredCheckboxes = () => {
    if (filteredMasterPickerParts.length === 0) return;
    const allFilteredChecked = filteredMasterPickerParts.every((p) =>
      draftItemsMap.has(p.id)
    );
    if (allFilteredChecked) {
      const filteredSet = new Set(filteredMasterPickerParts.map((p) => p.id));
      setDraftItems((prev) => prev.filter((item) => !filteredSet.has(item.masterPartId)));
    } else {
      setDraftItems((prev) => {
        const existingSet = new Set(prev.map((i) => i.masterPartId));
        const additions: RplPackageItem[] = filteredMasterPickerParts
          .filter((p) => !existingSet.has(p.id))
          .map((part, idx) => ({
            id: `RPLI-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
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
          }));
        return [...prev, ...additions];
      });
    }
  };

  const handleUpdateDraftItemByMasterId = (
    masterPartId: string,
    field: 'qtyNeeded' | 'notes',
    value: number | string
  ) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.masterPartId === masterPartId ? { ...item, [field]: value } : item
      )
    );
  };

  const buildDerivedNoUnitSummary = () => {
    if (targetJenisUnit === 'Non Unit') return 'NON-UNIT';
    if (!targetModelUnit.trim()) return '';
    return builderMatchingUnits.map((u) => u.cnNew).filter(Boolean).join(', ');
  };

  const buildDraftPreviewPackage = (): RplPackage => {
    const now = new Date().toISOString();
    return {
      id: editingPkgId || 'DRAFT-RPL',
      packagePn: packagePn.trim().toUpperCase() || 'DRAFT-RPL',
      packageName: packageName.trim() || `Paket Service Periodic ${serviceInterval}`,
      serviceInterval,
      jenisUnit: targetJenisUnit || 'Semua Unit',
      modelUnit: targetJenisUnit === 'Non Unit' ? 'NON-UNIT' : targetModelUnit.trim(),
      noUnit: buildDerivedNoUnitSummary(),
      notes: packageNotes.trim(),
      items: draftItems,
      createdBy: currentUser.fullName || currentUser.username,
      createdAt: now,
      updatedAt: now,
    };
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

    if (draftItems.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Centang minimal 1 part dari Katalog Master Part terlebih dahulu sebelum menyimpan RPL!',
      });
      return;
    }

    const res = addOrUpdateRplPackage(
      {
        packagePn: packagePn.trim().toUpperCase(),
        packageName: packageName.trim(),
        serviceInterval,
        jenisUnit: targetJenisUnit || 'Semua Unit',
        modelUnit: targetJenisUnit === 'Non Unit' ? 'NON-UNIT' : targetModelUnit.trim(),
        noUnit: buildDerivedNoUnitSummary(),
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

  const handlePrintSpbDocument = (pr: PurchaseRequest) => {
    if (!canPrintPreview) {
      setFeedback({
        type: 'error',
        message: 'Akses ditolak: Anda tidak memiliki izin Print Preview pada Modul 8.',
      });
      return;
    }
    const manpower = getAllManpower();
    const signatories = resolveReportSignatories(manpower, currentUser);
    const pdfRes = generatePurchaseRequestPDF({
      pr,
      currentUser,
      signatories,
    });
    setSpbModalState((prev) => ({ ...prev, isOpen: false }));
    setPdfPreview({
      isOpen: true,
      blobUrl: pdfRes.blobUrl,
      filename: pdfRes.filename,
      title: `Print Preview SPB — ${pr.noPermintaan}`,
      downloadFn: pdfRes.download,
    });
  };

  const handleOpenCreateSpbFromPackage = (pkg: RplPackage) => {
    if (!canCreateSpb) {
      setFeedback({
        type: 'error',
        message: 'Akses ditolak: Anda tidak memiliki izin membuat SPB (Modul 6 / Modul 8).',
      });
      return;
    }
    if (!pkg.items || pkg.items.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Centang atau pilih minimal 1 part di paket RPL sebelum membuat SPB.',
      });
      return;
    }

    const info = resolvePackageTargetInfo(pkg);
    const resolvedNoUnit =
      info.jenis === 'Non Unit'
        ? 'NON-UNIT'
        : info.noUnitSummary || info.modelUnit || info.jenis || 'ALL';
    const resolvedNamaAlat =
      info.modelUnit
        ? `${info.jenis} — Model ${info.modelUnit}`
        : info.matchingUnits[0]
        ? `${info.matchingUnits[0].namaAlat}${info.matchingUnits[0].modelUnit ? ` (${info.matchingUnits[0].modelUnit})` : ''}`
        : `${info.jenis || 'Service Periodic'} — ${pkg.serviceInterval}`;

    setSpbModalState({
      isOpen: true,
      key: Date.now(),
      noMaintenanceOrder: `${pkg.packagePn} (${pkg.serviceInterval})`,
      noUnit: resolvedNoUnit,
      namaAlat: resolvedNamaAlat,
      defaultAlasan: `Pengadaan suku cadang Service Periodic ${pkg.serviceInterval} — Paket RPL ${pkg.packagePn} (${pkg.packageName})${info.modelUnit ? ` untuk Model ${info.modelUnit}` : ''}.`,
      items: pkg.items.map((item) => {
        const live = masterPartsMap.get(item.masterPartId);
        return {
          partNumber: live?.pn || item.pn || '-',
          namaBarang: live?.namaPart || item.namaPart,
          qtyDiminta: Math.max(1, Number(item.qtyNeeded) || 1),
          satuan: live?.satuan || item.satuan || 'Pcs',
          keterangan: item.notes || `Paket ${pkg.packagePn} (${pkg.serviceInterval})`,
        };
      }),
    });
  };

  const handleSubmitSpb = (
    data: Omit<PurchaseRequest, 'id' | 'noPermintaan' | 'createdAt' | 'status'>
  ) => {
    if (!canCreateSpb) {
      return {
        success: false,
        message: 'Akses ditolak: Anda tidak memiliki izin membuat SPB.',
      };
    }
    const res = createPurchaseRequest(data);
    if (res.success && res.request) {
      setFeedback({
        type: 'success',
        message: `${res.message} Tersimpan juga ke Modul 6 (Inventory Management).`,
        createdPr: res.request,
      });
    }
    return res;
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

    const info = resolvePackageTargetInfo(pkg);
    const targetLabel = `${info.jenis}${info.modelUnit ? ` · ${info.modelUnit}` : ''}${info.noUnitSummary && info.noUnitSummary !== 'NON-UNIT' ? ` (${info.noUnitSummary})` : ''}`;

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
        `"${targetLabel.replace(/"/g, '""')}"`,
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

  const allFilteredChecked =
    filteredMasterPickerParts.length > 0 &&
    filteredMasterPickerParts.every((p) => draftItemsMap.has(p.id));

  const totalDraftQty = draftItems.reduce((a, b) => a + (Number(b.qtyNeeded) || 0), 0);

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm ${
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

          <div className="flex items-center gap-2">
            {feedback.createdPr && canPrintPreview && (
              <button
                type="button"
                onClick={() => handlePrintSpbDocument(feedback.createdPr!)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500 text-stone-950 hover:bg-amber-400 rounded-md transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print SPB ({feedback.createdPr.noPermintaan})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: PEMANGGIL CEPAT PN PAKET RPL (SERVICE PERIODIC) */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-stone-100 font-semibold text-sm">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Panggil PN Paket RPL (Service Periodic)</span>
            <span className="text-xs text-stone-400 font-normal">
              · Filter Jenis &amp; Model Unit (Modul 1) atau ketik langsung PN Paket
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
                <span>Paket RPL Baru</span>
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
          {/* Filter Jenis -> Model Unit di Tab RPL + Keterangan Hasil Filter No Unit */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Filter Jenis Alat (Modul 1)
                </label>
                <select
                  value={tabJenisFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTabJenisFilter(val);
                    setTabModelFilter('ALL');
                  }}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Jenis Unit ({units.length} unit)</option>
                  <option value="Non Unit">Non Unit (Umum / Workshop)</option>
                  {availableJenisOptions.map((j) => (
                    <option key={j} value={j}>
                      {j} ({jenisCountsModul1.get(j) || 0} unit)
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Pilih Model Unit (Berdasarkan Jenis)
                </label>
                <select
                  value={tabModelFilter}
                  onChange={(e) => setTabModelFilter(e.target.value)}
                  disabled={tabJenisFilter === 'Non Unit'}
                  className={`w-full bg-stone-900 border text-sm rounded-lg px-3 py-2 focus:outline-none ${
                    tabJenisFilter === 'Non Unit'
                      ? 'border-stone-800 text-stone-500 cursor-not-allowed'
                      : 'border-stone-700 text-stone-100 focus:border-amber-500'
                  }`}
                >
                  {tabJenisFilter === 'Non Unit' ? (
                    <option value="ALL">NON-UNIT (Umum / Workshop)</option>
                  ) : (
                    <>
                      <option value="ALL">
                        Semua Model Unit ({tabModelOptions.length} model · {tabMatchingUnits.length} unit)
                      </option>
                      {tabModelOptions.map((m) => (
                        <option key={m.model} value={m.model}>
                          {m.model} ({m.count} unit)
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setTabJenisFilter('ALL');
                    setTabModelFilter('ALL');
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Reset Filter
                </button>
              </div>
            </div>

            {/* Keterangan / Hasil Filter No Unit di Bawah Pilihan Jenis & Model Unit */}
            <div className="pt-2.5 border-t border-stone-800/80 text-xs">
              {tabJenisFilter === 'Non Unit' ? (
                <div className="text-stone-300">
                  <span className="font-semibold text-sky-300">Hasil Filter Target:</span>{' '}
                  Kategori <span className="font-mono text-stone-100">Non Unit (NON-UNIT)</span> — Berlaku untuk kebutuhan umum / workshop tanpa unit spesifik.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-stone-300">
                      <strong className="text-amber-400">Hasil Filter No Unit (Modul 1):</strong>{' '}
                      {tabModelFilter !== 'ALL' ? (
                        <>
                          Model <strong className="text-stone-100 font-mono">{tabModelFilter}</strong>
                          {tabJenisFilter !== 'ALL' ? ` (${tabJenisFilter})` : ''} mencakup{' '}
                          <strong className="text-emerald-400 font-mono tabular-nums">
                            {tabMatchingUnits.length} No Unit
                          </strong>
                        </>
                      ) : tabJenisFilter !== 'ALL' ? (
                        <>
                          Jenis <strong className="text-stone-100">{tabJenisFilter}</strong> mencakup{' '}
                          <strong className="text-emerald-400 font-mono tabular-nums">
                            {tabMatchingUnits.length} No Unit
                          </strong>{' '}
                          <span className="text-stone-400">
                            (Pilih Model Unit untuk menyaring ke unit dengan model yang sama)
                          </span>
                        </>
                      ) : (
                        <>
                          Menampilkan seluruh{' '}
                          <strong className="text-stone-100 font-mono tabular-nums">
                            {tabMatchingUnits.length} Unit
                          </strong>{' '}
                          terdaftar · Pilih Jenis &amp; Model Unit untuk melihat daftar No Unit yang sama.
                        </>
                      )}
                    </span>
                  </div>

                  {(tabJenisFilter !== 'ALL' || tabModelFilter !== 'ALL') && (
                    tabMatchingUnits.length === 0 ? (
                      <p className="text-stone-500 text-[11px]">
                        Belum ada No Unit terdaftar di Modul 1 untuk filter Jenis / Model Unit ini.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {tabMatchingUnits.map((u) => (
                          <div
                            key={u.id}
                            className="bg-stone-900/90 border border-stone-800 rounded-md px-2.5 py-1.5 text-[11px]"
                          >
                            <div className="font-mono font-bold text-amber-300 truncate">
                              {u.cnNew}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {u.modelUnit || '-'} · {u.brandMerk || u.namaAlat || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

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
                {matchingCallerPackages.map((pkg) => {
                  const info = resolvePackageTargetInfo(pkg);
                  return (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packagePn} — {pkg.packageName} ({pkg.serviceInterval}
                      {info.modelUnit ? ` · ${info.modelUnit}` : ''}) [{pkg.items.length} PN]
                    </option>
                  );
                })}
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
          {activePackage ? (() => {
            const activeInfo = resolvePackageTargetInfo(activePackage);
            return (
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
                      Jenis: <strong className="text-stone-200">{activeInfo.jenis}</strong>
                    </span>
                    {activeInfo.modelUnit && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          Model Unit: <strong className="text-amber-300 font-mono">{activeInfo.modelUnit}</strong>
                        </span>
                      </>
                    )}
                    {activeInfo.noUnitSummary && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          Cakupan No Unit ({activeInfo.matchingUnits.length || (activeInfo.jenis === 'Non Unit' ? 0 : 1)}):{' '}
                          <strong className="text-emerald-300 font-mono">{activeInfo.noUnitSummary}</strong>
                        </span>
                      </>
                    )}
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

                  {canCreateSpb && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateSpbFromPackage(activePackage)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 transition-colors whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Create SPB</span>
                    </button>
                  )}

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
            );
          })() : (
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

      {/* SECTION 2: FORM BUAT / EDIT PAKET RPL BARU (1-6 + KATALOG TERFILTER DENGAN KOTAK CENTANG SISI KIRI) */}
      {showBuilder && (canInsert || canEdit) && (
        <form
          onSubmit={handleSavePackage}
          className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-100 font-semibold text-sm">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>
                {editingPkgId
                  ? `Edit Paket RPL — ${packagePn}`
                  : 'Buat Paket RPL (Recommended Part List) Baru'}
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
            {/* 6 Field Metadata Paket RPL Sesuai Urutan Spesifikasi */}
            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. PN Paket RPL */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    1. PN Paket RPL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={packagePn}
                    onChange={(e) => setPackagePn(e.target.value.toUpperCase())}
                    placeholder="Misal: RPL-EX200-250HM"
                    className="w-full bg-stone-900 border border-stone-700 text-amber-400 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* 2. Nama Paket Service */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    2. Nama Paket Service <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="Misal: Paket Service Periodic 250 HM PC200-8"
                    className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* 3. Interval Service */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    3. Interval Service <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={serviceInterval}
                    onChange={(e) => setServiceInterval(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    {RPL_INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. JENIS (Dikelompokkan dari Modul 1) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    4. JENIS (Modul 1)
                  </label>
                  <select
                    value={targetJenisUnit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetJenisUnit(val);
                      setTargetModelUnit('');
                    }}
                    className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Semua Unit">Semua Jenis Unit ({units.length} unit)</option>
                    <option value="Non Unit">Non Unit (Umum / Workshop)</option>
                    {availableJenisOptions.map((j) => (
                      <option key={j} value={j}>
                        {j} ({jenisCountsModul1.get(j) || 0} unit)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. MODEL UNIT (Dikelompokkan dari Modul 1 berdasar JENIS) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    5. MODEL UNIT (Modul 1)
                  </label>
                  <select
                    value={targetModelUnit}
                    onChange={(e) => setTargetModelUnit(e.target.value)}
                    disabled={targetJenisUnit === 'Non Unit'}
                    className={`w-full bg-stone-900 border text-sm rounded-lg px-3 py-2 focus:outline-none font-mono ${
                      targetJenisUnit === 'Non Unit'
                        ? 'border-stone-800 text-sky-300 cursor-not-allowed'
                        : 'border-stone-700 text-stone-100 focus:border-amber-500'
                    }`}
                  >
                    {targetJenisUnit === 'Non Unit' ? (
                      <option value="">NON-UNIT (Umum / Workshop)</option>
                    ) : (
                      <>
                        <option value="">
                          Semua Model Unit ({builderModelOptions.length} model · {builderMatchingUnits.length} unit)
                        </option>
                        {builderModelOptions.map((m) => (
                          <option key={m.model} value={m.model}>
                            {m.model} ({m.count} unit)
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* 6. Catatan Paket (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    6. Catatan Paket (Opsional)
                  </label>
                  <input
                    type="text"
                    value={packageNotes}
                    onChange={(e) => setPackageNotes(e.target.value)}
                    placeholder="Keterangan tambahan mengenai paket service ini..."
                    className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Keterangan / Hasil Filter No Unit Berdasarkan Model Unit yang Sama */}
              <div className="mt-4 pt-3 border-t border-stone-800/80 text-xs space-y-2">
                {targetJenisUnit === 'Non Unit' ? (
                  <div className="text-stone-300">
                    <strong className="text-sky-300">Hasil Filter Target:</strong>{' '}
                    Kategori <span className="font-mono text-stone-100">Non Unit (NON-UNIT)</span> — Paket berlaku untuk item umum / workshop.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-stone-300">
                        <strong className="text-amber-400">Keterangan Hasil Filter No Unit (Modul 1):</strong>{' '}
                        {targetModelUnit ? (
                          <>
                            Model Unit <strong className="font-mono text-stone-100">{targetModelUnit}</strong>
                            {targetJenisUnit !== 'Semua Unit' ? ` (${targetJenisUnit})` : ''} berlaku untuk{' '}
                            <strong className="text-emerald-400 font-mono tabular-nums">
                              {builderMatchingUnits.length} No Unit
                            </strong>{' '}
                            berikut:
                          </>
                        ) : targetJenisUnit !== 'Semua Unit' ? (
                          <>
                            Jenis <strong className="text-stone-100">{targetJenisUnit}</strong> memiliki{' '}
                            <strong className="text-emerald-400 font-mono tabular-nums">
                              {builderMatchingUnits.length} No Unit
                            </strong>{' '}
                            <span className="text-stone-400">
                              — Pilih Model Unit di kolom 5 untuk mengelompokkan RPL berdasarkan model unit yang sama.
                            </span>
                          </>
                        ) : (
                          <>
                            Total terdaftar{' '}
                            <strong className="text-stone-100 font-mono tabular-nums">
                              {builderMatchingUnits.length} No Unit
                            </strong>{' '}
                            — Pilih Jenis &amp; Model Unit di atas untuk melihat daftar No Unit yang dicakup paket RPL ini.
                          </>
                        )}
                      </span>
                    </div>

                    {builderMatchingUnits.length === 0 ? (
                      <p className="text-[11px] text-stone-500">
                        Belum ada No Unit terdaftar di Modul 1 untuk kombinasi Jenis dan Model Unit ini.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {builderMatchingUnits.map((u) => (
                          <div
                            key={u.id}
                            className="bg-stone-900 border border-stone-800 rounded-md px-2.5 py-1.5 text-[11px]"
                          >
                            <div className="font-mono font-bold text-amber-300 truncate">
                              {u.cnNew}
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {u.modelUnit || '-'} · {u.brandMerk || u.namaAlat || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* List Katalog Master Terdaftar Sesuai Filtrasi dengan Kotak Centang di Sisi Kiri */}
            <div className="border border-stone-800 rounded-xl bg-stone-950/70 overflow-hidden">
              <div className="p-4 border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-stone-100 uppercase tracking-wider">
                      Daftar Katalog Master Part Terdaftar
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                      {filteredMasterPickerParts.length} Part Tampil
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      {draftItems.length} Part Dicentang · Total Qty: {totalDraftQty}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Menampilkan part sesuai filter <strong className="text-stone-200">{targetJenisUnit}</strong>
                    {targetModelUnit ? ` · Model ${targetModelUnit}` : ''}. Centang kotak di sisi kiri untuk memasukkan part ke paket RPL.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Cari PN / Nama Part..."
                      className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <select
                    value={pickerKategoriFilter}
                    onChange={(e) => setPickerKategoriFilter(e.target.value)}
                    className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="Fast Moving">Fast Moving</option>
                    <option value="Slow Moving">Slow Moving</option>
                    <option value="Death Stock">Death Stock</option>
                  </select>

                  {targetJenisUnit !== 'Semua Unit' && targetJenisUnit !== 'Non Unit' && (
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNonUnitInPicker}
                        onChange={(e) => setIncludeNonUnitInPicker(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                      />
                      <span>Sertakan Non Unit</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                  <thead className="sticky top-0 z-10 bg-stone-900 text-stone-300 border-b border-stone-800 font-mono">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allFilteredChecked}
                          onChange={handleToggleAllFilteredCheckboxes}
                          disabled={filteredMasterPickerParts.length === 0}
                          title="Centang / Batal Centang Semua Part Tampil"
                          className="w-4 h-4 accent-amber-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-36">Model / No Unit</th>
                      <th className="py-2.5 px-3 w-36">Part Number (PN)</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nama Part</th>
                      <th className="py-2.5 px-3 w-28">Merk</th>
                      <th className="py-2.5 px-3 w-32">Kategori &amp; Jenis</th>
                      <th className="py-2.5 px-3 w-28">Tipe</th>
                      <th className="py-2.5 px-3 w-24 text-center">Stok Master</th>
                      <th className="py-2.5 px-3 w-24 text-center">Qty Paket</th>
                      <th className="py-2.5 px-3 w-44">Catatan Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {filteredMasterPickerParts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-stone-500 text-xs">
                          Tidak ada part terdaftar di Katalog Master Part untuk filter{' '}
                          <strong className="text-stone-300">{targetJenisUnit}</strong>
                          {targetModelUnit ? ` · Model ${targetModelUnit}` : ''}. Daftarkan part terlebih dahulu di Tab Katalog Master Part.
                        </td>
                      </tr>
                    ) : (
                      filteredMasterPickerParts.map((part, idx) => {
                        const selectedItem = draftItemsMap.get(part.id);
                        const isChecked = Boolean(selectedItem);
                        const tipe = part.partRelationType || 'In Line';
                        const resolvedPartModel =
                          part.modelUnit || unitByCnMap.get((part.noUnit || '').trim().toLowerCase())?.modelUnit || '';

                        return (
                          <tr
                            key={part.id}
                            className={`transition-colors ${
                              isChecked ? 'bg-amber-500/10' : 'hover:bg-stone-900/50'
                            }`}
                          >
                            {/* Kotak Centang di Sisi Kiri */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleMasterPartCheckbox(part)}
                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-stone-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-amber-400 block">
                                {resolvedPartModel || part.noUnit || '-'}
                              </span>
                              <span className="text-[10px] text-stone-400 block truncate max-w-[130px] font-mono">
                                {part.noUnit || '-'} · {part.jenisUnit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-amber-300">
                              {part.pn || '-'}
                            </td>
                            <td
                              onClick={() => handleToggleMasterPartCheckbox(part)}
                              className="py-2.5 px-3 font-medium text-stone-100 cursor-pointer"
                            >
                              {part.namaPart}
                            </td>
                            <td className="py-2.5 px-3 text-stone-300">{part.merk || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className="block text-stone-200">{part.kategori}</span>
                              <span className="text-[10px] text-stone-400 block">{part.jenisPart}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[11px] font-medium ${
                                  tipe === 'Interchange' ? 'text-sky-300' : 'text-stone-400'
                                }`}
                              >
                                {tipe}
                                {tipe === 'Interchange' && part.interchangeParts?.length
                                  ? ` (${part.interchangeParts.length})`
                                  : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums text-stone-200">
                              {part.qty}{' '}
                              <span className="text-[10px] text-stone-400">{part.satuan || 'Pcs'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isChecked && selectedItem ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={selectedItem.qtyNeeded}
                                  onChange={(e) =>
                                    handleUpdateDraftItemByMasterId(
                                      part.id,
                                      'qtyNeeded',
                                      Math.max(1, Number(e.target.value) || 1)
                                    )
                                  }
                                  className="w-16 bg-stone-900 border border-amber-500/60 text-amber-300 text-center rounded px-1.5 py-1 font-mono text-xs font-bold focus:outline-none focus:border-amber-400"
                                />
                              ) : (
                                <span className="text-stone-600 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {isChecked && selectedItem ? (
                                <input
                                  type="text"
                                  value={selectedItem.notes || ''}
                                  onChange={(e) =>
                                    handleUpdateDraftItemByMasterId(part.id, 'notes', e.target.value)
                                  }
                                  placeholder="Catatan item..."
                                  className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                                />
                              ) : (
                                <span className="text-stone-600">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer: Setelah Centang -> Simpan RPL, Print Preview, Create SPB */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-800">
              <div className="text-xs text-stone-400">
                {draftItems.length === 0 ? (
                  <span className="text-amber-400">
                    Centang minimal 1 part di sisi kiri tabel katalog untuk mengaktifkan Simpan RPL, Print, dan Create SPB.
                  </span>
                ) : (
                  <span>
                    <strong className="text-emerald-400 font-mono">{draftItems.length} Part</strong> dipilih{' '}
                    (Total Qty: <strong className="text-amber-400 font-mono">{totalDraftQty}</strong>) — siap disimpan, dicetak, atau dibuatkan SPB.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
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
                  type="button"
                  onClick={() => handlePrintRplPackage(buildDraftPreviewPackage())}
                  disabled={draftItems.length === 0 || !canPrintPreview}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    draftItems.length > 0 && canPrintPreview
                      ? 'bg-stone-800 text-amber-300 border-amber-500/40 hover:bg-stone-700'
                      : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateSpbFromPackage(buildDraftPreviewPackage())}
                  disabled={draftItems.length === 0 || !canCreateSpb}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    draftItems.length > 0 && canCreateSpb
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Create SPB</span>
                </button>

                <button
                  type="submit"
                  disabled={draftItems.length === 0}
                  className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-colors ${
                    draftItems.length > 0
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingPkgId ? 'Simpan Perubahan RPL' : 'Simpan Paket RPL'}</span>
                </button>
              </div>
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
          <table className="w-full text-left text-xs border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-44">PN Paket</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Paket</th>
                <th className="py-3 px-3 w-28 text-center">Interval</th>
                <th className="py-3 px-3 w-52">Target Jenis / Model &amp; No Unit</th>
                <th className="py-3 px-3 w-24 text-center">Jumlah PN</th>
                <th className="py-3 px-3 w-24 text-center">Total Qty</th>
                <th className="py-3 px-3 w-56 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredPackageList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-500">
                    Belum ada Paket RPL Service Periodic yang sesuai filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredPackageList.map((pkg, idx) => {
                  const totalQty = pkg.items.reduce((a, b) => a + (Number(b.qtyNeeded) || 0), 0);
                  const isActive = activePackage?.id === pkg.id;
                  const info = resolvePackageTargetInfo(pkg);
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
                        <span className="font-medium text-stone-200">
                          {info.jenis}
                          {info.modelUnit ? (
                            <span className="text-amber-300 font-mono"> · {info.modelUnit}</span>
                          ) : null}
                        </span>
                        {info.noUnitSummary && (
                          <span className="block font-mono text-[10px] text-stone-400 mt-0.5 break-words">
                            Unit: {info.noUnitSummary}
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
                          {canCreateSpb && (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateSpbFromPackage(pkg)}
                              className="px-2 py-1 text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 rounded transition-colors whitespace-nowrap"
                              title="Buat Surat Permintaan Barang (SPB) dari Paket RPL ini"
                            >
                              SPB
                            </button>
                          )}
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

      {/* Modal Create SPB (Surat Permintaan Barang) dari Paket RPL */}
      {spbModalState.isOpen && (
        <PermintaanBarangModal
          key={spbModalState.key}
          isOpen={spbModalState.isOpen}
          onClose={() => setSpbModalState((prev) => ({ ...prev, isOpen: false }))}
          noMaintenanceOrder={spbModalState.noMaintenanceOrder}
          noUnit={spbModalState.noUnit}
          namaAlat={spbModalState.namaAlat}
          defaultAlasan={spbModalState.defaultAlasan}
          refLabel="Reff Paket RPL / Service"
          initialItems={spbModalState.items}
          currentUser={currentUser}
          onSubmitPR={handleSubmitSpb}
          onPrintPR={canPrintPreview ? handlePrintSpbDocument : undefined}
        />
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
