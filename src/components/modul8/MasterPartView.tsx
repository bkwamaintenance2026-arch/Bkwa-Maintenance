import React, { useState, useMemo, useEffect } from 'react';
import { 
  AssetUnit, 
  MasterPartItem, 
  MasterPartKategori, 
  MasterPartJenis, 
  MasterPartFungsi,
  MasterPartRelationType,
  MasterPartInterchangeItem,
  MASTER_PART_KATEGORI_OPTIONS,
  MASTER_PART_JENIS_OPTIONS,
  MASTER_PART_FUNGSI_OPTIONS,
  MASTER_PART_RELATION_OPTIONS,
  UserAccount 
} from '../../types';
import { 
  getAllMasterParts, 
  consolidateLegacyMasterParts,
  getNormalizedMasterPartKey,
  updateMasterPartGroupSpecs,
  batchAddMasterParts, 
  deleteMasterPart,
  deleteMasterPartGroup,
  addOrUpdateMasterPartInterchange,
  deleteMasterPartInterchange,
  getAllRplPackages,
  isDeveloper,
  canUserInsertModule,
  canUserEditModule,
  canUserDeleteModule,
  canUserExportModule
} from '../../utils/storage';
import { RplSubView } from './RplSubView';
import { UnitRefDetailModal, UnitRefEntry } from './UnitRefDetailModal';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Layers, 
  Truck, 
  Wrench, 
  FileSpreadsheet, 
  Copy,
  Info,
  Lock,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Package
} from 'lucide-react';

interface MasterPartViewProps {
  units: AssetUnit[];
  currentUser: UserAccount;
}

interface DraftInterchangeRow {
  noUrut: number;
  kategori: MasterPartKategori;
  jenisPart: MasterPartJenis;
  merk: string;
  fungsi: MasterPartFungsi;
  namaPart: string;
  pn: string;
  qty: number;
  minStock: number;
  satuan: string;
  remark: string;
}

interface DraftPartRow {
  noUrut: number;
  kategori: MasterPartKategori;
  jenisPart: MasterPartJenis;
  merk: string;
  fungsi: MasterPartFungsi;
  namaPart: string;
  pn: string;
  qty: number;
  minStock: number;
  satuan: string;
  partRelationType: MasterPartRelationType;
  interchangeDrafts: DraftInterchangeRow[];
  remark: string;
}

const createEmptyInterchangeDraft = (noUrut = 1, defaultMerk = ''): DraftInterchangeRow => ({
  noUrut,
  kategori: 'Fast Moving',
  jenisPart: 'OEM',
  merk: defaultMerk,
  fungsi: 'Part Service',
  namaPart: '',
  pn: '',
  qty: 1,
  minStock: 0,
  satuan: 'Pcs',
  remark: '',
});

const createEmptyDraftRow = (noUrut = 1, defaultMerk = ''): DraftPartRow => ({
  noUrut,
  kategori: 'Fast Moving',
  jenisPart: 'Genuine Part',
  merk: defaultMerk,
  fungsi: 'Part Service',
  namaPart: '',
  pn: '',
  qty: 1,
  minStock: 0,
  satuan: 'Pcs',
  partRelationType: 'In Line',
  interchangeDrafts: [],
  remark: '',
});

const COMMON_SATUAN_OPTIONS = ['Pcs', 'Set', 'Ea', 'Assy', 'Roll', 'Unit', 'Box', 'Liter', 'Can'];
const NON_UNIT_JENIS = 'Non Unit';
const NON_UNIT_CODE = 'NON-UNIT';

interface GroupedMasterPart {
  groupKey: string;
  primary: MasterPartItem;
  entries: MasterPartItem[];
  entryIds: string[];
  unitRefs: UnitRefEntry[];
  unitCount: number;
  isAllNonUnit: boolean;
  unitSummaryLabel: string;
  reffUnitText: string;
  mergedInterchangeParts: MasterPartInterchangeItem[];
  isInterchange: boolean;
}

export const MasterPartView: React.FC<MasterPartViewProps> = ({ units, currentUser }) => {
  const isDev = isDeveloper(currentUser);
  const canInsert = canUserInsertModule(currentUser, 8) || isDev;
  const canEdit = canUserEditModule(currentUser, 8) || isDev;
  const canDelete = canUserDeleteModule(currentUser, 8) || isDev;
  const canExport = canUserExportModule(currentUser, 8) || isDev;

  const [activeTab, setActiveTab] = useState<'katalog' | 'rpl'>('katalog');
  const [rplPackageCount, setRplPackageCount] = useState(0);

  // Master parts list state
  const [masterParts, setMasterParts] = useState<MasterPartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Unit detail popup state
  const [unitModalState, setUnitModalState] = useState<{
    isOpen: boolean;
    groupKey: string;
    title: string;
    subtitle: string;
    entries: UnitRefEntry[];
  }>({
    isOpen: false,
    groupKey: '',
    title: '',
    subtitle: '',
    entries: [],
  });

  // Reload master parts from storage
  const loadParts = () => {
    setIsLoading(true);
    const data = getAllMasterParts();
    setMasterParts(data);
    setRplPackageCount(getAllRplPackages().length);
    setIsLoading(false);
  };

  useEffect(() => {
    const consolidated = consolidateLegacyMasterParts();
    loadParts();
    if (consolidated.mergedCount > 0) {
      setFeedback({
        type: 'success',
        message: `${consolidated.mergedCount} data Master Part duplikat lama ber-PN sama berhasil digabungkan otomatis.`,
      });
    }
    const handleStorageChange = () => loadParts();
    window.addEventListener('bkwa-master-parts-changed', handleStorageChange);
    window.addEventListener('bkwa-rpl-packages-changed', handleStorageChange);
    window.addEventListener('bkwa-firestore-synced', handleStorageChange);
    return () => {
      window.removeEventListener('bkwa-master-parts-changed', handleStorageChange);
      window.removeEventListener('bkwa-rpl-packages-changed', handleStorageChange);
      window.removeEventListener('bkwa-firestore-synced', handleStorageChange);
    };
  }, []);

  // --- CASCADING GROUPED UNIT SELECTION DARI MODUL 1 (1. JENIS -> 2. BRAND -> 3. MODEL UNIT -> 4. NO UNIT CENTANG) ---
  const jenisCounts = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    units.forEach((u) => {
      const j = (u.jenis || '').trim();
      if (j) map.set(j, (map.get(j) || 0) + 1);
    });
    return map;
  }, [units]);

  const availableJenisList = useMemo<string[]>(() => {
    return Array.from(jenisCounts.keys()).sort((a: string, b: string) => a.localeCompare(b));
  }, [jenisCounts]);

  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedModelUnit, setSelectedModelUnit] = useState<string>('ALL');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const isNonUnitSelected = selectedJenis === NON_UNIT_JENIS;

  // Step 2: Kelompok Brand berdasarkan Jenis terpilih (Modul 1)
  const unitsByJenis = useMemo(() => {
    if (!selectedJenis || isNonUnitSelected) return [];
    return units.filter((u) => (u.jenis || '').trim().toLowerCase() === selectedJenis.toLowerCase());
  }, [units, selectedJenis, isNonUnitSelected]);

  const brandGroups = useMemo(() => {
    const map = new Map<string, number>();
    unitsByJenis.forEach((u) => {
      const b = (u.brandMerk || '').trim() || 'Tanpa Brand';
      map.set(b, (map.get(b) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [unitsByJenis]);

  // Step 3: Kelompok Model Unit berdasarkan Jenis & Brand terpilih (Modul 1)
  const unitsByJenisAndBrand = useMemo(() => {
    if (!selectedJenis || isNonUnitSelected) return [];
    if (!selectedBrand || selectedBrand === 'ALL') return unitsByJenis;
    return unitsByJenis.filter(
      (u) => ((u.brandMerk || '').trim() || 'Tanpa Brand').toLowerCase() === selectedBrand.toLowerCase()
    );
  }, [unitsByJenis, selectedJenis, selectedBrand, isNonUnitSelected]);

  const modelGroups = useMemo(() => {
    const map = new Map<string, number>();
    unitsByJenisAndBrand.forEach((u) => {
      const m = (u.modelUnit || '').trim() || '-';
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [unitsByJenisAndBrand]);

  // Step 4: Daftar No Unit (Opsi Centang) berdasarkan Jenis, Brand & Model Unit (Modul 1)
  const filteredUnitsForCheckboxes = useMemo(() => {
    if (!selectedJenis || isNonUnitSelected) return [];
    const list =
      !selectedModelUnit || selectedModelUnit === 'ALL'
        ? unitsByJenisAndBrand
        : unitsByJenisAndBrand.filter(
            (u) => ((u.modelUnit || '').trim() || '-').toLowerCase() === selectedModelUnit.toLowerCase()
          );
    return [...list].sort((a, b) => (a.cnNew || '').localeCompare(b.cnNew || ''));
  }, [unitsByJenisAndBrand, selectedJenis, selectedModelUnit, isNonUnitSelected]);

  const checkedUnits = useMemo(() => {
    if (isNonUnitSelected) return [];
    const idSet = new Set(selectedUnitIds);
    return filteredUnitsForCheckboxes.filter((u) => idSet.has(u.id));
  }, [filteredUnitsForCheckboxes, selectedUnitIds, isNonUnitSelected]);

  const handleJenisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJenis(val);
    setSelectedBrand('ALL');
    setSelectedModelUnit('ALL');
    setSelectedUnitIds([]);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBrand(val);
    setSelectedModelUnit('ALL');
    setSelectedUnitIds([]);
  };

  const handleModelUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModelUnit(val);
    setSelectedUnitIds([]);
  };

  const handleToggleUnitCheckbox = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleToggleAllUnitCheckboxes = () => {
    const visibleIds = filteredUnitsForCheckboxes.map((u) => u.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedUnitIds.includes(id));
    if (allChecked) {
      setSelectedUnitIds([]);
    } else {
      setSelectedUnitIds(visibleIds);
    }
  };

  // --- MULTI-ROW DRAFT PARTS INPUT ---
  const [draftRows, setDraftRows] = useState<DraftPartRow[]>([createEmptyDraftRow(1)]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  } | null>(null);

  const handleAddDraftRow = () => {
    setDraftRows((prev) => [
      ...prev,
      createEmptyDraftRow(prev.length + 1, prev.length > 0 ? prev[prev.length - 1].merk : ''),
    ]);
  };

  const handleDuplicateDraftRow = (index: number) => {
    const source = draftRows[index];
    if (!source) return;
    setDraftRows((prev) => [
      ...prev,
      {
        ...source,
        noUrut: prev.length + 1,
        interchangeDrafts: source.interchangeDrafts.map((sub) => ({ ...sub })),
      },
    ]);
  };

  const handleRemoveDraftRow = (index: number) => {
    if (draftRows.length <= 1) {
      setDraftRows([createEmptyDraftRow(1)]);
      return;
    }
    const updated = draftRows.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      noUrut: i + 1,
    }));
    setDraftRows(updated);
  };

  const handleDraftChange = (index: number, field: keyof DraftPartRow, value: any) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      const nextRow = { ...copy[index], [field]: value };
      if (field === 'partRelationType' && value === 'Interchange' && nextRow.interchangeDrafts.length === 0) {
        nextRow.interchangeDrafts = [createEmptyInterchangeDraft(1)];
      }
      copy[index] = nextRow;
      return copy;
    });
  };

  const handleAddDraftInterchange = (rowIndex: number) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      const subs = copy[rowIndex].interchangeDrafts || [];
      copy[rowIndex] = {
        ...copy[rowIndex],
        partRelationType: 'Interchange',
        interchangeDrafts: [...subs, createEmptyInterchangeDraft(subs.length + 1)],
      };
      return copy;
    });
  };

  const handleDraftInterchangeChange = (
    rowIndex: number,
    subIndex: number,
    field: keyof DraftInterchangeRow,
    value: any
  ) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      const subs = [...(copy[rowIndex].interchangeDrafts || [])];
      subs[subIndex] = { ...subs[subIndex], [field]: value };
      copy[rowIndex] = { ...copy[rowIndex], interchangeDrafts: subs };
      return copy;
    });
  };

  const handleRemoveDraftInterchange = (rowIndex: number, subIndex: number) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      const subs = (copy[rowIndex].interchangeDrafts || [])
        .filter((_, i) => i !== subIndex)
        .map((sub, idx) => ({ ...sub, noUrut: idx + 1 }));
      copy[rowIndex] = { ...copy[rowIndex], interchangeDrafts: subs };
      return copy;
    });
  };

  // Simpan baris-baris draft ke Master Part
  const handleSaveDraftParts = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!canInsert) {
      setFeedback({ type: 'error', message: 'Akses ditolak: Anda tidak memiliki izin Tambah Data (Insert) pada Modul 8.' });
      return;
    }

    if (!selectedJenis) {
      setFeedback({ type: 'error', message: 'Silakan pilih 1. Jenis Unit atau Non Unit terlebih dahulu!' });
      return;
    }

    if (!isNonUnitSelected && checkedUnits.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan centang minimal satu No Unit (CN New) pada langkah 4!',
      });
      return;
    }

    // Validasi baris draft
    const validRows = draftRows.filter((r) => r.namaPart.trim() !== '' || r.pn.trim() !== '');
    if (validRows.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Minimal isi satu nama part atau Part Number (PN) yang valid!',
      });
      return;
    }

    const now = new Date().toISOString();
    const targetUnits: Array<{
      unitId: string;
      jenisUnit: string;
      noUnit: string;
      namaAlat: string;
      modelUnit: string;
      brandMerk: string;
    }> = isNonUnitSelected
      ? [
          {
            unitId: NON_UNIT_CODE,
            jenisUnit: NON_UNIT_JENIS,
            noUnit: NON_UNIT_CODE,
            namaAlat: 'Non Unit / Material Umum',
            modelUnit: '-',
            brandMerk: 'Universal',
          },
        ]
      : checkedUnits.map((u) => ({
          unitId: u.id,
          jenisUnit: u.jenis || selectedJenis,
          noUnit: u.cnNew || u.id,
          namaAlat: u.namaAlat || '',
          modelUnit: u.modelUnit || '-',
          brandMerk: u.brandMerk || '',
        }));

    const payloadItems: Omit<MasterPartItem, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    targetUnits.forEach((unitTarget, uIdx) => {
      validRows.forEach((r, idx) => {
        const validSubs: MasterPartInterchangeItem[] =
          r.partRelationType === 'Interchange'
            ? (r.interchangeDrafts || [])
                .filter((sub) => sub.namaPart.trim() !== '' || sub.pn.trim() !== '')
                .map((sub, subIdx) => ({
                  id: `MPINT-${Date.now()}-${uIdx}-${idx}-${subIdx}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  noUrut: sub.noUrut || subIdx + 1,
                  kategori: sub.kategori,
                  jenisPart: sub.jenisPart,
                  merk: sub.merk.trim() || 'Universal',
                  fungsi: sub.fungsi,
                  namaPart: sub.namaPart.trim() || 'Part Interchange',
                  pn: sub.pn.trim() || '-',
                  qty: Number(sub.qty) || 1,
                  minStock: Math.max(0, Number(sub.minStock) || 0),
                  satuan: sub.satuan || 'Pcs',
                  remark: sub.remark.trim() || '',
                  createdAt: now,
                  updatedAt: now,
                }))
            : [];

        payloadItems.push({
          unitId: unitTarget.unitId,
          jenisUnit: unitTarget.jenisUnit,
          noUnit: unitTarget.noUnit,
          namaAlat: unitTarget.namaAlat,
          modelUnit: unitTarget.modelUnit,
          brandMerk: unitTarget.brandMerk,
          noUrut: r.noUrut || idx + 1,
          kategori: r.kategori,
          jenisPart: r.jenisPart,
          merk:
            r.merk.trim() ||
            (isNonUnitSelected
              ? 'Universal'
              : unitTarget.brandMerk || (selectedBrand !== 'ALL' ? selectedBrand : 'Universal')),
          fungsi: r.fungsi,
          namaPart: r.namaPart.trim() || 'Part Tanpa Nama',
          pn: r.pn.trim() || '-',
          qty: Number(r.qty) || 1,
          minStock: Math.max(0, Number(r.minStock) || 0),
          satuan: r.satuan || 'Pcs',
          partRelationType: r.partRelationType || 'In Line',
          interchangeParts: validSubs,
          remark: r.remark.trim() || '',
        });
      });
    });

    const result = batchAddMasterParts(payloadItems);
    if (result.success) {
      const unitNames = targetUnits.map((u) => u.noUnit).join(', ');
      setFeedback({
        type: 'success',
        message: isNonUnitSelected
          ? `Berhasil menyimpan ${result.count} item Master Part kategori Non Unit (${NON_UNIT_CODE})!`
          : `Berhasil menyimpan ${validRows.length} part × ${targetUnits.length} unit (${result.count} item Master Part) untuk: ${unitNames}!`,
      });
      const defaultBrand = selectedBrand !== 'ALL' ? selectedBrand : checkedUnits[0]?.brandMerk || '';
      setDraftRows([createEmptyDraftRow(1, defaultBrand)]);
      loadParts();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // --- FILTER & SEARCH TABLE STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterNoUnit, setFilterNoUnit] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterJenisPart, setFilterJenisPart] = useState<string>('ALL');
  const [filterFungsi, setFilterFungsi] = useState<string>('ALL');
  const [filterRelationType, setFilterRelationType] = useState<string>('ALL');
  const [expandedInterchangeIds, setExpandedInterchangeIds] = useState<Record<string, boolean>>({});

  const unitByCnMap = useMemo(() => {
    const map = new Map<string, AssetUnit>();
    units.forEach((u) => {
      const cn = (u.cnNew || '').trim().toLowerCase();
      if (cn) map.set(cn, u);
    });
    return map;
  }, [units]);

  // Pengelompokan data Master Part berdasarkan PN yang sama (1 PN = 1 baris katalog)
  const groupedMasterParts = useMemo<GroupedMasterPart[]>(() => {
    const buckets = new Map<string, MasterPartItem[]>();
    masterParts.forEach((item) => {
      const key = getNormalizedMasterPartKey(item);
      const list = buckets.get(key) || [];
      list.push(item);
      buckets.set(key, list);
    });

    const groups: GroupedMasterPart[] = [];
    buckets.forEach((entries, groupKey) => {
      const sortedEntries = [...entries].sort((a, b) =>
        (a.noUnit || '').localeCompare(b.noUnit || '')
      );
      const primary = [...entries].sort((a, b) => {
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        return tB - tA;
      })[0];

      const unitRefs: UnitRefEntry[] = sortedEntries.map((e) => {
        const matchedUnit = unitByCnMap.get((e.noUnit || '').trim().toLowerCase());
        const isNonUnit =
          (e.jenisUnit || '').toLowerCase() === NON_UNIT_JENIS.toLowerCase() ||
          (e.noUnit || '').toUpperCase() === NON_UNIT_CODE;
        return {
          key: e.id,
          recordId: e.id,
          noUnit: e.noUnit || '-',
          jenisUnit: e.jenisUnit || matchedUnit?.jenis || '-',
          brandMerk: e.brandMerk || matchedUnit?.brandMerk || '-',
          modelUnit: e.modelUnit && e.modelUnit !== '-' ? e.modelUnit : matchedUnit?.modelUnit || '-',
          qty: Number(e.qty) || 0,
          minStock: Number(e.minStock ?? 0),
          satuan: e.satuan || 'Pcs',
          isNonUnit,
        };
      });

      const subDedup = new Map<string, MasterPartInterchangeItem>();
      entries.forEach((e) => {
        (e.interchangeParts || []).forEach((s) => {
          const sKey = `${(s.pn || '').trim().toUpperCase()}::${(s.namaPart || '').trim().toLowerCase()}`;
          if (!subDedup.has(sKey)) {
            subDedup.set(sKey, s);
          }
        });
      });
      const mergedInterchangeParts = Array.from(subDedup.values()).map((s, idx) => ({
        ...s,
        noUrut: idx + 1,
      }));
      const isInterchange =
        entries.some((e) => e.partRelationType === 'Interchange') ||
        mergedInterchangeParts.length > 0;

      const isAllNonUnit = unitRefs.every((u) => u.isNonUnit);
      const unitCount = unitRefs.length;
      const unitSummaryLabel = isAllNonUnit
        ? NON_UNIT_CODE
        : unitCount === 1
        ? unitRefs[0].noUnit
        : `${unitCount} Unit`;
      const reffUnitText = unitRefs
        .map((u) => `${u.noUnit} ${u.jenisUnit} ${u.brandMerk} ${u.modelUnit}`)
        .join(' ');

      groups.push({
        groupKey,
        primary,
        entries: sortedEntries,
        entryIds: sortedEntries.map((e) => e.id),
        unitRefs,
        unitCount,
        isAllNonUnit,
        unitSummaryLabel,
        reffUnitText,
        mergedInterchangeParts,
        isInterchange,
      });
    });

    return groups;
  }, [masterParts, unitByCnMap]);

  // Filtered grouped master parts
  const filteredMasterParts = useMemo(() => {
    return groupedMasterParts.filter((group) => {
      const item = group.primary;
      // Search query (cek induk, sub-part interchange, dan daftar unit cakupan)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const subText = group.mergedInterchangeParts
          .map((s) => `${s.namaPart} ${s.pn} ${s.merk} ${s.remark || ''}`)
          .join(' ');
        const matchText = (
          (item.namaPart || '') +
          ' ' +
          (item.pn || '') +
          ' ' +
          (item.merk || '') +
          ' ' +
          (item.remark || '') +
          ' ' +
          group.reffUnitText +
          ' ' +
          subText
        ).toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      // Filter Jenis (cocok jika minimal 1 unit di grup PN ini punya jenis tersebut)
      if (
        filterJenis &&
        !group.entries.some(
          (e) => (e.jenisUnit || '').toLowerCase() === filterJenis.toLowerCase()
        )
      ) {
        return false;
      }
      // Filter No Unit (cocok jika minimal 1 unit di grup PN ini punya noUnit tersebut)
      if (
        filterNoUnit &&
        !group.entries.some(
          (e) => (e.noUnit || '').toLowerCase() === filterNoUnit.toLowerCase()
        )
      ) {
        return false;
      }
      // Filter Kategori
      if (filterKategori !== 'ALL' && item.kategori !== filterKategori) {
        return false;
      }
      // Filter Jenis Part
      if (filterJenisPart !== 'ALL' && item.jenisPart !== filterJenisPart) {
        return false;
      }
      // Filter Fungsi
      if (filterFungsi !== 'ALL' && item.fungsi !== filterFungsi) {
        return false;
      }
      // Filter Tipe In Line / Interchange
      if (filterRelationType !== 'ALL') {
        const itemRelation = group.isInterchange ? 'Interchange' : 'In Line';
        if (itemRelation !== filterRelationType) return false;
      }
      return true;
    });
  }, [
    groupedMasterParts,
    searchQuery,
    filterJenis,
    filterNoUnit,
    filterKategori,
    filterJenisPart,
    filterFungsi,
    filterRelationType,
  ]);

  // Units list & jenis list found in master parts for table filtering
  const uniqueMasterUnits = useMemo(() => {
    const map = new Map<string, string>();
    masterParts.forEach((p) => {
      if (p.noUnit) map.set(p.noUnit, p.jenisUnit || '');
    });
    return Array.from(map.entries()).map(([noUnit, jenis]) => ({ noUnit, jenis }));
  }, [masterParts]);

  const catalogJenisOptions = useMemo(() => {
    const set = new Set<string>(availableJenisList);
    set.add(NON_UNIT_JENIS);
    masterParts.forEach((p) => {
      if (p.jenisUnit && p.jenisUnit.trim()) {
        set.add(p.jenisUnit.trim());
      }
    });
    return Array.from(set).sort((a, b) => {
      if (a === NON_UNIT_JENIS) return -1;
      if (b === NON_UNIT_JENIS) return 1;
      return a.localeCompare(b);
    });
  }, [availableJenisList, masterParts]);

  // --- STATS SUMMARY (Dihitung per PN unik agar ringkas dan akurat) ---
  const stats = useMemo(() => {
    let fastMoving = 0;
    let slowMoving = 0;
    let deathStock = 0;
    let totalQty = 0;

    groupedMasterParts.forEach((g) => {
      const p = g.primary;
      if (p.kategori === 'Fast Moving') fastMoving++;
      else if (p.kategori === 'Slow Moving') slowMoving++;
      else if (p.kategori === 'Death Stock') deathStock++;
      totalQty += Number(p.qty) || 0;
    });

    return {
      totalItems: groupedMasterParts.length,
      fastMoving,
      slowMoving,
      deathStock,
      totalQty,
    };
  }, [groupedMasterParts]);

  // --- MODAL EDIT STATE ---
  const [editingGroup, setEditingGroup] = useState<GroupedMasterPart | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<MasterPartItem>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (group: GroupedMasterPart) => {
    if (!canEdit) return;
    setEditError(null);
    setEditingGroup(group);
    setEditFormData({
      ...group.primary,
      minStock: Number(group.primary.minStock ?? 0),
      partRelationType: group.isInterchange ? 'Interchange' : 'In Line',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !editingGroup) return;
    setEditError(null);

    const isSingle = editingGroup.entryIds.length === 1;
    const res = updateMasterPartGroupSpecs(editingGroup.entryIds, {
      noUrut: Number(editFormData.noUrut) || editingGroup.primary.noUrut,
      kategori: (editFormData.kategori as MasterPartKategori) || editingGroup.primary.kategori,
      jenisPart: (editFormData.jenisPart as MasterPartJenis) || editingGroup.primary.jenisPart,
      merk: editFormData.merk || editingGroup.primary.merk,
      fungsi: (editFormData.fungsi as MasterPartFungsi) || editingGroup.primary.fungsi,
      namaPart: editFormData.namaPart || editingGroup.primary.namaPart,
      pn: editFormData.pn || editingGroup.primary.pn,
      qty: Number(editFormData.qty) || editingGroup.primary.qty,
      minStock: Math.max(0, Number(editFormData.minStock ?? 0) || 0),
      satuan: editFormData.satuan || editingGroup.primary.satuan || 'Pcs',
      partRelationType:
        (editFormData.partRelationType as MasterPartRelationType) ||
        (editingGroup.isInterchange ? 'Interchange' : 'In Line'),
      remark: editFormData.remark || '',
      ...(isSingle
        ? {
            unitId: editFormData.unitId || editingGroup.primary.unitId,
            jenisUnit: editFormData.jenisUnit || editingGroup.primary.jenisUnit,
            noUnit: editFormData.noUnit || editingGroup.primary.noUnit,
            namaAlat: editFormData.namaAlat ?? editingGroup.primary.namaAlat,
            modelUnit: editFormData.modelUnit ?? editingGroup.primary.modelUnit,
          }
        : {}),
    });

    if (res.success) {
      setEditingGroup(null);
      setEditError(null);
      setFeedback({ type: 'success', message: res.message });
      loadParts();
    } else {
      setEditError(res.message);
    }
  };

  // --- MODAL ADD / EDIT SUB-ITEM INTERCHANGE ---
  const [interchangeModal, setInterchangeModal] = useState<{
    groupKey: string;
    parent: MasterPartItem;
    siblingIds: string[];
    editingSub: MasterPartInterchangeItem | null;
  } | null>(null);
  const [subFormData, setSubFormData] = useState<DraftInterchangeRow>(createEmptyInterchangeDraft(1));
  const [subError, setSubError] = useState<string | null>(null);
  const [deletingInterchange, setDeletingInterchange] = useState<{
    parentId: string;
    siblingIds: string[];
    subId: string;
    nama: string;
  } | null>(null);

  const handleOpenInterchangeModal = (
    group: GroupedMasterPart,
    editingSub: MasterPartInterchangeItem | null = null
  ) => {
    if (!canInsert && !canEdit) return;
    setSubError(null);
    setInterchangeModal({
      groupKey: group.groupKey,
      parent: group.primary,
      siblingIds: group.entryIds,
      editingSub,
    });
    if (editingSub) {
      setSubFormData({
        noUrut: editingSub.noUrut || 1,
        kategori: editingSub.kategori,
        jenisPart: editingSub.jenisPart,
        merk: editingSub.merk || '',
        fungsi: editingSub.fungsi,
        namaPart: editingSub.namaPart || '',
        pn: editingSub.pn || '',
        qty: Number(editingSub.qty) || 1,
        minStock: Number(editingSub.minStock ?? 0),
        satuan: editingSub.satuan || 'Pcs',
        remark: editingSub.remark || '',
      });
    } else {
      const nextNo = (group.mergedInterchangeParts.length || 0) + 1;
      setSubFormData(createEmptyInterchangeDraft(nextNo));
    }
  };

  const handleSaveInterchangeModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interchangeModal) return;
    setSubError(null);

    if (!subFormData.namaPart.trim() && !subFormData.pn.trim()) {
      setSubError('Minimal isi Nama Part atau Part Number (PN) pengganti!');
      return;
    }

    const res = addOrUpdateMasterPartInterchange(
      interchangeModal.parent.id,
      {
        noUrut: Number(subFormData.noUrut) || 1,
        kategori: subFormData.kategori,
        jenisPart: subFormData.jenisPart,
        merk: subFormData.merk.trim() || 'Universal',
        fungsi: subFormData.fungsi,
        namaPart: subFormData.namaPart.trim() || 'Part Interchange',
        pn: subFormData.pn.trim() || '-',
        qty: Number(subFormData.qty) || 1,
        minStock: Math.max(0, Number(subFormData.minStock) || 0),
        satuan: subFormData.satuan || 'Pcs',
        remark: subFormData.remark.trim() || '',
      },
      interchangeModal.editingSub?.id,
      interchangeModal.siblingIds
    );

    if (res.success) {
      setExpandedInterchangeIds((prev) => ({ ...prev, [interchangeModal.groupKey]: true }));
      setInterchangeModal(null);
      setFeedback({ type: 'success', message: res.message });
      loadParts();
    } else {
      setSubError(res.message);
    }
  };

  const handleConfirmDeleteInterchange = () => {
    if (!canDelete || !deletingInterchange) return;
    const res = deleteMasterPartInterchange(
      deletingInterchange.parentId,
      deletingInterchange.subId,
      deletingInterchange.siblingIds
    );
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      loadParts();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    setDeletingInterchange(null);
  };

  // --- DELETE ACTION ---
  const [deletingGroup, setDeletingGroup] = useState<{
    ids: string[];
    nama: string;
    pn: string;
    unitCount: number;
  } | null>(null);

  const handleRequestDelete = (group: GroupedMasterPart) => {
    if (!canDelete) return;
    setDeletingGroup({
      ids: group.entryIds,
      nama: group.primary.namaPart,
      pn: group.primary.pn,
      unitCount: group.unitCount,
    });
  };

  const handleConfirmDelete = () => {
    if (!canDelete || !deletingGroup) return;
    const res = deleteMasterPartGroup(deletingGroup.ids);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      loadParts();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    setDeletingGroup(null);
  };

  const handleOpenUnitDetailModal = (group: GroupedMasterPart) => {
    setUnitModalState({
      isOpen: true,
      groupKey: group.groupKey,
      title: `Reff Unit — ${group.primary.pn || '-'} (${group.primary.namaPart})`,
      subtitle: `${group.unitCount} unit terdaftar menggunakan part ini`,
      entries: group.unitRefs,
    });
  };

  const handleRemoveSingleUnitFromModal = (entry: UnitRefEntry) => {
    if (!canDelete || !entry.recordId) return;
    const res = deleteMasterPart(entry.recordId);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setUnitModalState((prev) => {
        const remaining = prev.entries.filter((e) => e.recordId !== entry.recordId);
        if (remaining.length === 0) {
          return { ...prev, isOpen: false, entries: [] };
        }
        return {
          ...prev,
          subtitle: `${remaining.length} unit terdaftar menggunakan part ini`,
          entries: remaining,
        };
      });
      loadParts();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // --- EXPORT TO CSV ---
  const handleExportCSV = () => {
    if (!canExport) return;
    if (filteredMasterParts.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada data yang dapat diekspor!' });
      return;
    }

    const headers = [
      'No Urut',
      'Reff Unit',
      'Jumlah Unit',
      'Daftar No Unit (CN)',
      'Kategori Part',
      'Jenis Part',
      'Merk Part',
      'Fungsi',
      'Nama Part',
      'Part Number (PN)',
      'Qty',
      'Min Stock',
      'Satuan',
      'Tipe Part',
      'Jml Interchange',
      'Remark',
    ];

    const rows = filteredMasterParts.map((group, idx) => {
      const p = group.primary;
      const cnJoined = group.unitRefs.map((u) => u.noUnit).join('; ');
      return [
        p.noUrut || idx + 1,
        `"${group.unitSummaryLabel}"`,
        group.unitCount,
        `"${cnJoined.replace(/"/g, '""')}"`,
        `"${p.kategori || ''}"`,
        `"${p.jenisPart || ''}"`,
        `"${p.merk || ''}"`,
        `"${p.fungsi || ''}"`,
        `"${p.namaPart.replace(/"/g, '""')}"`,
        `"${p.pn.replace(/"/g, '""')}"`,
        p.qty,
        Number(p.minStock ?? 0),
        `"${p.satuan || ''}"`,
        `"${group.isInterchange ? 'Interchange' : 'In Line'}"`,
        group.mergedInterchangeParts.length,
        `"${(p.remark || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Master_Part_BKWA_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPORT CSV MODAL / FEATURE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const handleProcessImport = () => {
    if (!canInsert) {
      setImportNotice('Akses ditolak: Anda tidak memiliki izin Tambah Data (Insert) pada Modul 8.');
      return;
    }
    if (!csvText.trim()) {
      setImportNotice('Silakan tempel (paste) data teks CSV atau format tabel terlebih dahulu.');
      return;
    }

    try {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length <= 1) {
        setImportNotice('Data tidak memiliki baris konten yang valid.');
        return;
      }

      // Deteksi separator (, atau ;)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';

      // Jika baris pertama adalah header, kita lewati
      const hasHeader =
        firstLine.toLowerCase().includes('part') ||
        firstLine.toLowerCase().includes('kategori') ||
        firstLine.toLowerCase().includes('nama');
      const dataRows = hasHeader ? lines.slice(1) : lines;

      const itemsToImport: Omit<MasterPartItem, 'id' | 'createdAt' | 'updatedAt'>[] = [];

      dataRows.forEach((line, idx) => {
        if (!line.trim()) return;
        // Split with regex handling quotes
        const cols = line.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1'));

        // Format yang didukung:
        // 1. Kategori, Jenis Part, Merk, Fungsi, Nama Part, PN, Qty, Satuan, [Min Stock], Remark
        // 2. Atau No, Kategori, Jenis Part, Merk, Fungsi, Nama Part, PN, Qty, Satuan, [Min Stock], Remark
        let noUrut = idx + 1;
        let kategori: MasterPartKategori = 'Fast Moving';
        let jenisPart: MasterPartJenis = 'Genuine Part';
        let merk = 'Universal';
        let fungsi: MasterPartFungsi = 'Part Service';
        let namaPart = '';
        let pn = '-';
        let qty = 1;
        let minStock = 0;
        let satuan = 'Pcs';
        let remark = '';

        if (cols.length >= 9) {
          // If first column is a number, it's No Urut
          const isFirstColNumber = !isNaN(Number(cols[0])) && cols[0] !== '';
          const offset = isFirstColNumber ? 1 : 0;

          if (isFirstColNumber) noUrut = Number(cols[0]);

          const rawKat = (cols[offset] || '').toLowerCase();
          if (rawKat.includes('slow')) kategori = 'Slow Moving';
          else if (rawKat.includes('death')) kategori = 'Death Stock';
          else kategori = 'Fast Moving';

          const rawJenis = (cols[offset + 1] || '').toLowerCase();
          if (rawJenis.includes('oem')) jenisPart = 'OEM';
          else jenisPart = 'Genuine Part';

          merk = cols[offset + 2] || 'Universal';

          const rawFungsi = (cols[offset + 3] || '').toLowerCase();
          if (rawFungsi.includes('consumable')) fungsi = 'Consumable';
          else if (rawFungsi.includes('tool')) fungsi = 'Tool';
          else fungsi = 'Part Service';

          namaPart = cols[offset + 4] || `Part Import ${idx + 1}`;
          pn = cols[offset + 5] || '-';
          qty = Number(cols[offset + 6]) || 1;
          satuan = cols[offset + 7] || 'Pcs';

          // Jika tersedia kolom Min Stock (format 10+ kolom setelah No)
          if (cols.length >= offset + 10) {
            minStock = Math.max(0, Number(cols[offset + 8]) || 0);
            remark = cols[offset + 9] || '';
          } else {
            remark = cols[offset + 8] || '';
          }
        } else if (cols.length >= 2) {
          // Minimal format: Nama Part, PN, [Qty], [Satuan], [Merk], [Min Stock]
          namaPart = cols[0];
          pn = cols[1];
          if (cols[2]) qty = Number(cols[2]) || 1;
          if (cols[3]) satuan = cols[3];
          if (cols[4]) merk = cols[4];
          if (cols[5]) minStock = Math.max(0, Number(cols[5]) || 0);
        }

        if (namaPart) {
          const importTargets = isNonUnitSelected
            ? [
                {
                  unitId: NON_UNIT_CODE,
                  jenisUnit: NON_UNIT_JENIS,
                  noUnit: NON_UNIT_CODE,
                  namaAlat: 'Non Unit / Material Umum',
                  modelUnit: '-',
                  brandMerk: 'Universal',
                },
              ]
            : checkedUnits.length > 0
            ? checkedUnits.map((u) => ({
                unitId: u.id,
                jenisUnit: u.jenis || selectedJenis || 'Alat Berat',
                noUnit: u.cnNew || u.id,
                namaAlat: u.namaAlat || '',
                modelUnit: u.modelUnit || '-',
                brandMerk: u.brandMerk || '',
              }))
            : [
                {
                  unitId: 'ALL',
                  jenisUnit: selectedJenis || 'Alat Berat',
                  noUnit: 'UNIT-ALL',
                  namaAlat: '',
                  modelUnit: '-',
                  brandMerk: selectedBrand !== 'ALL' ? selectedBrand : '',
                },
              ];

          importTargets.forEach((tgt) => {
            itemsToImport.push({
              unitId: tgt.unitId,
              jenisUnit: tgt.jenisUnit,
              noUnit: tgt.noUnit,
              namaAlat: tgt.namaAlat,
              modelUnit: tgt.modelUnit,
              brandMerk: tgt.brandMerk,
              noUrut,
              kategori,
              jenisPart,
              merk,
              fungsi,
              namaPart,
              pn,
              qty,
              minStock,
              satuan,
              remark,
            });
          });
        }
      });

      if (itemsToImport.length === 0) {
        setImportNotice('Tidak ada data part yang berhasil diekstrak.');
        return;
      }

      const res = batchAddMasterParts(itemsToImport);
      if (res.success) {
        setShowImportModal(false);
        setCsvText('');
        setImportNotice(null);
        setFeedback({ type: 'success', message: `Sukses mengimpor ${res.count} item Master Part!` });
        loadParts();
      } else {
        setImportNotice(`Gagal impor: ${res.message}`);
      }
    } catch (err: any) {
      setImportNotice(`Format tidak valid: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-md">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  MODUL 08
                </span>
                <h1 className="text-xl font-bold text-stone-100 tracking-wide">
                  Master Part & Material Katalog
                </h1>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Katalog master suku cadang, material, dan komponen alat berat PT Bukit Kencana Wijaya
              </p>
            </div>
          </div>

          {/* Quick Counter Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-stone-950/70 border border-stone-800 rounded-lg px-3 py-1.5 text-center">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Total Part</span>
              <span className="text-base font-bold text-amber-400 font-mono">{stats.totalItems}</span>
            </div>
            <div className="bg-stone-950/70 border border-emerald-900/40 rounded-lg px-3 py-1.5 text-center">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Fast Moving</span>
              <span className="text-base font-bold text-emerald-400 font-mono">{stats.fastMoving}</span>
            </div>
            <div className="bg-stone-950/70 border border-blue-900/40 rounded-lg px-3 py-1.5 text-center">
              <span className="text-[10px] text-blue-400 uppercase tracking-wider block">Slow Moving</span>
              <span className="text-base font-bold text-blue-400 font-mono">{stats.slowMoving}</span>
            </div>
            <div className="bg-stone-950/70 border border-red-900/40 rounded-lg px-3 py-1.5 text-center">
              <span className="text-[10px] text-red-400 uppercase tracking-wider block">Death Stock</span>
              <span className="text-base font-bold text-red-400 font-mono">{stats.deathStock}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Modul 8 */}
      <div className="flex flex-wrap items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('katalog')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'katalog'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Katalog Master Part & Interchange</span>
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
              activeTab === 'katalog'
                ? 'bg-stone-950/20 text-stone-950 font-bold'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            {groupedMasterParts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rpl')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rpl'
              ? 'bg-amber-500 text-stone-950 shadow'
              : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/70'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>RPL (Recommended Part List)</span>
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
              activeTab === 'rpl'
                ? 'bg-stone-950/20 text-stone-950 font-bold'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            {rplPackageCount}
          </span>
        </button>
      </div>

      {activeTab === 'rpl' ? (
        <RplSubView
          units={units}
          masterParts={masterParts}
          currentUser={currentUser}
        />
      ) : (
        <>
      {/* Global feedback message banner */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
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

      {/* SECTION 1: FORM INPUT BREAKDOWN-STYLE UNIT SELECTOR & MULTI-ROW PART ENTRY */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>Form Registrasi Master Part per Unit / Non Unit</span>
            <span className="text-xs text-stone-400 font-normal">
              (1. Jenis &rarr; 2. Brand &rarr; 3. Model Unit &rarr; 4. Centang No Unit)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canInsert ? (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
                title="Import banyak data dari teks CSV / Excel"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Import CSV / Teks</span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-stone-500 bg-stone-950 border border-stone-800 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                <span>View Only (Insert Terkunci)</span>
              </span>
            )}
          </div>
        </div>

        {!canInsert ? (
          <div className="p-6 text-center text-xs text-stone-400 font-mono">
            Mode View Only: Anda tidak memiliki hak akses Tambah Data (Insert) pada Modul 8 untuk mendaftarkan atau mengimpor Master Part baru.
          </div>
        ) : (
          <form onSubmit={handleSaveDraftParts} className="p-5 space-y-5">
          {/* Cascading Grouped Unit Selection Card dari Modul 1 */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. JENIS (Dikelompokkan dari Modul 1) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  1. JENIS <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedJenis}
                  onChange={handleJenisChange}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 font-medium"
                  required
                >
                  <option value="">-- Pilih Jenis Unit (Modul 1) --</option>
                  <option value={NON_UNIT_JENIS}>Non Unit (Umum / Workshop / General)</option>
                  {availableJenisList.map((j) => (
                    <option key={j} value={j}>
                      {j} ({jenisCounts.get(j) || 0} unit)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {isNonUnitSelected
                    ? 'Kategori Non Unit aktif untuk material/part umum'
                    : 'Dikelompokkan otomatis dari Registrasi Aset Modul 1'}
                </span>
              </div>

              {/* 2. BRAND (Dikelompokkan dari Modul 1 berdasar Jenis) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  2. BRAND <span className="text-red-400">*</span>
                </label>
                <select
                  value={isNonUnitSelected ? 'Universal' : selectedBrand}
                  onChange={handleBrandChange}
                  disabled={!selectedJenis || isNonUnitSelected}
                  className={`w-full bg-stone-900 border text-sm rounded-lg px-3 py-2 focus:outline-none font-medium ${
                    !selectedJenis || isNonUnitSelected
                      ? 'border-stone-800 text-stone-500 cursor-not-allowed'
                      : 'border-stone-700 text-stone-100 focus:border-amber-500'
                  }`}
                >
                  {isNonUnitSelected ? (
                    <option value="Universal">Universal / General</option>
                  ) : (
                    <>
                      <option value="ALL">
                        Semua Brand ({unitsByJenis.length} unit)
                      </option>
                      {brandGroups.map((bg) => (
                        <option key={bg.brand} value={bg.brand}>
                          {bg.brand} ({bg.count} unit)
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {isNonUnitSelected
                    ? 'Otomatis Universal untuk Non Unit'
                    : `${brandGroups.length} brand tersedia pada ${selectedJenis || 'jenis ini'}`}
                </span>
              </div>

              {/* 3. MODEL UNIT (Dikelompokkan dari Modul 1 berdasar Jenis & Brand) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  3. MODEL UNIT <span className="text-red-400">*</span>
                </label>
                <select
                  value={isNonUnitSelected ? '-' : selectedModelUnit}
                  onChange={handleModelUnitChange}
                  disabled={!selectedJenis || isNonUnitSelected}
                  className={`w-full bg-stone-900 border text-sm rounded-lg px-3 py-2 focus:outline-none font-medium ${
                    !selectedJenis || isNonUnitSelected
                      ? 'border-stone-800 text-stone-500 cursor-not-allowed'
                      : 'border-stone-700 text-stone-100 focus:border-amber-500'
                  }`}
                >
                  {isNonUnitSelected ? (
                    <option value="-">Material Umum / Non Unit</option>
                  ) : (
                    <>
                      <option value="ALL">
                        Semua Model Unit ({unitsByJenisAndBrand.length} unit)
                      </option>
                      {modelGroups.map((mg) => (
                        <option key={mg.model} value={mg.model}>
                          {mg.model} ({mg.count} unit)
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {isNonUnitSelected
                    ? 'Tidak terikat model alat berat'
                    : `${modelGroups.length} model unit sesuai filter Brand`}
                </span>
              </div>
            </div>

            {/* 4. NO UNIT (Opsi Centang karena ada beberapa unit yang sama) */}
            <div className="pt-3 border-t border-stone-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  <span>4. NO UNIT — Opsi Centang (Modul 1)</span>
                  <span className="text-red-400">*</span>
                  {selectedJenis && !isNonUnitSelected && (
                    <span className="ml-1 font-mono text-[11px] text-amber-400">
                      ({checkedUnits.length} dari {filteredUnitsForCheckboxes.length} unit dicentang)
                    </span>
                  )}
                </label>

                {selectedJenis && !isNonUnitSelected && filteredUnitsForCheckboxes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleAllUnitCheckboxes}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded transition-colors"
                    >
                      {filteredUnitsForCheckboxes.every((u) => selectedUnitIds.includes(u.id))
                        ? 'Batal Centang Semua'
                        : 'Centang Semua Unit Ini'}
                    </button>
                    {checkedUnits.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUnitIds([])}
                        className="px-2.5 py-1 text-[11px] font-medium text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-700 rounded transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!selectedJenis ? (
                <div className="p-3 rounded-lg bg-stone-900/60 border border-dashed border-stone-800 text-xs text-stone-500">
                  Pilih <strong>1. JENIS</strong> terlebih dahulu untuk menampilkan daftar No Unit (opsi centang) dari Modul 1.
                </div>
              ) : isNonUnitSelected ? (
                <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/60 flex items-center gap-3 text-xs">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="w-4 h-4 accent-sky-400"
                  />
                  <div>
                    <span className="font-mono font-bold text-sky-300">NON-UNIT</span>
                    <span className="text-stone-300 ml-2">— Material Umum / Consumable / Workshop Support</span>
                  </div>
                </div>
              ) : filteredUnitsForCheckboxes.length === 0 ? (
                <div className="p-3 rounded-lg bg-stone-900/60 border border-dashed border-stone-800 text-xs text-stone-500">
                  Tidak ada No Unit terdaftar di Modul 1 untuk kombinasi Jenis, Brand, dan Model Unit tersebut.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredUnitsForCheckboxes.map((u) => {
                    const isChecked = selectedUnitIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-500/15 border-amber-500/60 text-stone-100'
                            : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleUnitCheckbox(u.id)}
                          className="w-4 h-4 mt-0.5 accent-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 leading-tight">
                          <span className="font-mono font-bold text-xs text-amber-400 block">
                            {u.cnNew}
                          </span>
                          <span className="text-[11px] text-stone-200 block truncate">
                            {u.namaAlat || u.jenis}
                          </span>
                          <span className="text-[10px] text-stone-400 block truncate">
                            {u.brandMerk || '-'} · {u.modelUnit || '-'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Feedback moved to global top banner above */}

          {/* Tabel Input Baris Part (Multi-Row Builder) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                  Daftar Part yang Akan Dimasukkan ke Master Material
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 font-mono">
                  {draftRows.length} Baris
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddDraftRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Part</span>
                </button>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto border border-stone-800 rounded-xl bg-stone-950/80">
              <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                    <th className="py-2.5 px-3 w-14 text-center">No</th>
                    <th className="py-2.5 px-3 w-36">Kategori Part</th>
                    <th className="py-2.5 px-3 w-32">Jenis Part</th>
                    <th className="py-2.5 px-3 w-32">Merk Part</th>
                    <th className="py-2.5 px-3 w-32">Fungsi</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Nama Part <span className="text-red-400">*</span></th>
                    <th className="py-2.5 px-3 w-36">Part Number (PN)</th>
                    <th className="py-2.5 px-3 w-28 text-center">Qty & Satuan</th>
                    <th className="py-2.5 px-3 w-24 text-center">Min Stock</th>
                    <th className="py-2.5 px-3 w-32">Tipe Part</th>
                    <th className="py-2.5 px-3 w-40">Remark / Keterangan</th>
                    <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {draftRows.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-stone-900/40 transition-colors">
                        {/* No Urut */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={row.noUrut}
                            onChange={(e) => handleDraftChange(idx, 'noUrut', Number(e.target.value))}
                            className="w-12 bg-stone-900 border border-stone-700 text-stone-200 text-center rounded px-1.5 py-1 font-mono text-xs focus:border-amber-500 focus:outline-none"
                            min="1"
                          />
                        </td>

                        {/* Kategori Part */}
                        <td className="py-2 px-3">
                          <select
                            value={row.kategori}
                            onChange={(e) => handleDraftChange(idx, 'kategori', e.target.value as MasterPartKategori)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none font-medium"
                          >
                            {MASTER_PART_KATEGORI_OPTIONS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Jenis Part */}
                        <td className="py-2 px-3">
                          <select
                            value={row.jenisPart}
                            onChange={(e) => handleDraftChange(idx, 'jenisPart', e.target.value as MasterPartJenis)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                          >
                            {MASTER_PART_JENIS_OPTIONS.map((j) => (
                              <option key={j} value={j}>
                                {j}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Merk Part */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Merek part..."
                            value={row.merk}
                            onChange={(e) => handleDraftChange(idx, 'merk', e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                          />
                        </td>

                        {/* Fungsi */}
                        <td className="py-2 px-3">
                          <select
                            value={row.fungsi}
                            onChange={(e) => handleDraftChange(idx, 'fungsi', e.target.value as MasterPartFungsi)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                          >
                            {MASTER_PART_FUNGSI_OPTIONS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Nama Part */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Contoh: Oil Filter Element, V-Belt, Seal..."
                            value={row.namaPart}
                            onChange={(e) => handleDraftChange(idx, 'namaPart', e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-medium text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                            required={idx === 0}
                          />
                        </td>

                        {/* PN (Part Number) */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Contoh: 600-185-5100"
                            value={row.pn}
                            onChange={(e) => handleDraftChange(idx, 'pn', e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 text-amber-400 font-mono text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                          />
                        </td>

                        {/* Qty & Satuan */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={row.qty}
                              onChange={(e) => handleDraftChange(idx, 'qty', Math.max(1, Number(e.target.value)))}
                              className="w-12 bg-stone-900 border border-stone-700 text-stone-200 text-center rounded px-1 py-1 font-mono text-xs focus:border-amber-500 focus:outline-none"
                              min="1"
                            />
                            <select
                              value={row.satuan}
                              onChange={(e) => handleDraftChange(idx, 'satuan', e.target.value)}
                              className="w-16 bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded px-1 py-1 focus:border-amber-500 focus:outline-none"
                            >
                              {COMMON_SATUAN_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Min Stock */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={row.minStock}
                            onChange={(e) => handleDraftChange(idx, 'minStock', Math.max(0, Number(e.target.value) || 0))}
                            className="w-16 bg-stone-900 border border-stone-700 text-amber-300 text-center rounded px-1.5 py-1 font-mono text-xs focus:border-amber-500 focus:outline-none"
                            min="0"
                            placeholder="0"
                            title="Minimum Stock (Safety Stock)"
                          />
                        </td>

                        {/* Tipe Part: In Line / Interchange */}
                        <td className="py-2 px-3">
                          <select
                            value={row.partRelationType}
                            onChange={(e) =>
                              handleDraftChange(idx, 'partRelationType', e.target.value as MasterPartRelationType)
                            }
                            className={`w-full bg-stone-900 border text-xs rounded px-2 py-1 focus:outline-none font-medium ${
                              row.partRelationType === 'Interchange'
                                ? 'border-sky-700 text-sky-300 focus:border-sky-500'
                                : 'border-stone-700 text-stone-200 focus:border-amber-500'
                            }`}
                          >
                            {MASTER_PART_RELATION_OPTIONS.map((rel) => (
                              <option key={rel} value={rel}>
                                {rel}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Remark */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Keterangan tambahan..."
                            value={row.remark}
                            onChange={(e) => handleDraftChange(idx, 'remark', e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                          />
                        </td>

                        {/* Action buttons */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateDraftRow(idx)}
                              className="p-1 text-stone-400 hover:text-amber-400 transition-colors"
                              title="Duplikat baris"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftRow(idx)}
                              className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-Tabel Draft Interchange jika Tipe Part === Interchange */}
                      {row.partRelationType === 'Interchange' && (
                        <tr className="bg-stone-950/90">
                          <td colSpan={12} className="p-3 pl-8 border-b border-stone-800">
                            <div className="border border-sky-900/60 rounded-lg overflow-hidden bg-stone-900/60">
                              <div className="px-3 py-2 bg-sky-950/30 border-b border-sky-900/50 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-sky-300">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>
                                    Sub-Tabel Part Interchange untuk Baris #{row.noUrut}{' '}
                                    {row.namaPart ? `(${row.namaPart})` : ''}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddDraftInterchange(idx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tambah Part Interchange</span>
                                </button>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] border-collapse min-w-[980px]">
                                  <thead>
                                    <tr className="bg-stone-900 text-stone-400 border-b border-stone-800 font-mono">
                                      <th className="py-1.5 px-2 w-12 text-center">No</th>
                                      <th className="py-1.5 px-2 w-32">Kategori Part</th>
                                      <th className="py-1.5 px-2 w-28">Jenis Part</th>
                                      <th className="py-1.5 px-2 w-28">Merk Part</th>
                                      <th className="py-1.5 px-2 w-28">Fungsi</th>
                                      <th className="py-1.5 px-2 min-w-[180px]">Nama Part Pengganti</th>
                                      <th className="py-1.5 px-2 w-32">Part Number (PN)</th>
                                      <th className="py-1.5 px-2 w-28 text-center">Qty & Satuan</th>
                                      <th className="py-1.5 px-2 w-20 text-center">Min Stock</th>
                                      <th className="py-1.5 px-2 w-32">Remark</th>
                                      <th className="py-1.5 px-2 w-12 text-center">Hapus</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-800/60">
                                    {(row.interchangeDrafts || []).map((sub, subIdx) => (
                                      <tr key={subIdx}>
                                        <td className="py-1.5 px-2 text-center">
                                          <input
                                            type="number"
                                            min={1}
                                            value={sub.noUrut}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(
                                                idx,
                                                subIdx,
                                                'noUrut',
                                                Number(e.target.value)
                                              )
                                            }
                                            className="w-10 bg-stone-900 border border-stone-700 text-stone-200 text-center rounded px-1 py-1 font-mono"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <select
                                            value={sub.kategori}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(
                                                idx,
                                                subIdx,
                                                'kategori',
                                                e.target.value as MasterPartKategori
                                              )
                                            }
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded px-1.5 py-1"
                                          >
                                            {MASTER_PART_KATEGORI_OPTIONS.map((k) => (
                                              <option key={k} value={k}>
                                                {k}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <select
                                            value={sub.jenisPart}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(
                                                idx,
                                                subIdx,
                                                'jenisPart',
                                                e.target.value as MasterPartJenis
                                              )
                                            }
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded px-1.5 py-1"
                                          >
                                            {MASTER_PART_JENIS_OPTIONS.map((j) => (
                                              <option key={j} value={j}>
                                                {j}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={sub.merk}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(idx, subIdx, 'merk', e.target.value)
                                            }
                                            placeholder="Merk..."
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded px-1.5 py-1"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <select
                                            value={sub.fungsi}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(
                                                idx,
                                                subIdx,
                                                'fungsi',
                                                e.target.value as MasterPartFungsi
                                              )
                                            }
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded px-1.5 py-1"
                                          >
                                            {MASTER_PART_FUNGSI_OPTIONS.map((f) => (
                                              <option key={f} value={f}>
                                                {f}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={sub.namaPart}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(idx, subIdx, 'namaPart', e.target.value)
                                            }
                                            placeholder="Nama part pengganti..."
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-100 rounded px-1.5 py-1"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={sub.pn}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(idx, subIdx, 'pn', e.target.value)
                                            }
                                            placeholder="PN pengganti..."
                                            className="w-full bg-stone-900 border border-stone-700 text-sky-300 font-mono rounded px-1.5 py-1"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              min={1}
                                              value={sub.qty}
                                              onChange={(e) =>
                                                handleDraftInterchangeChange(
                                                  idx,
                                                  subIdx,
                                                  'qty',
                                                  Math.max(1, Number(e.target.value) || 1)
                                                )
                                              }
                                              className="w-11 bg-stone-900 border border-stone-700 text-stone-200 text-center rounded px-1 py-1 font-mono"
                                            />
                                            <select
                                              value={sub.satuan}
                                              onChange={(e) =>
                                                handleDraftInterchangeChange(idx, subIdx, 'satuan', e.target.value)
                                              }
                                              className="w-14 bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-1"
                                            >
                                              {COMMON_SATUAN_OPTIONS.map((s) => (
                                                <option key={s} value={s}>
                                                  {s}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          <input
                                            type="number"
                                            min={0}
                                            value={sub.minStock}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(
                                                idx,
                                                subIdx,
                                                'minStock',
                                                Math.max(0, Number(e.target.value) || 0)
                                              )
                                            }
                                            className="w-14 bg-stone-900 border border-stone-700 text-amber-300 text-center rounded px-1 py-1 font-mono"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={sub.remark}
                                            onChange={(e) =>
                                              handleDraftInterchangeChange(idx, subIdx, 'remark', e.target.value)
                                            }
                                            placeholder="Remark..."
                                            className="w-full bg-stone-900 border border-stone-700 text-stone-300 rounded px-1.5 py-1"
                                          />
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveDraftInterchange(idx, subIdx)}
                                            className="p-1 text-stone-400 hover:text-red-400"
                                            title="Hapus part interchange"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer: Tombol Simpan Part */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800">
            <div className="text-xs text-stone-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>
                Data yang disimpan akan langsung masuk ke tabel katalog Master Part dan tersinkronisasi ke Cloud.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setDraftRows([createEmptyDraftRow(1)]);
                }}
                className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
              >
                Reset Baris
              </button>

              <button
                type="submit"
                disabled={!canInsert}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg shadow-md transition-all ${
                  canInsert
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20 active:scale-95'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SIMPAN MASTER PART KE KATALOG</span>
              </button>
            </div>
          </div>
        </form>
        )}
      </div>

      {/* SECTION 2: TABEL MASTER MATERIAL & PART LENGKAP DENGAN FILTER & SEARCH */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-stone-200 font-semibold text-sm">
            <Boxes className="w-4 h-4 text-amber-500" />
            <span>Katalog Master Material & Suku Cadang Terdaftar</span>
            <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-mono font-bold tabular-nums">
              {filteredMasterParts.length} PN Unik
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!canExport || filteredMasterParts.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                canExport && filteredMasterParts.length > 0
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/40'
                  : 'bg-stone-800 text-stone-600 border-stone-800 cursor-not-allowed'
              }`}
              title="Ekspor data part yang tampil ke file CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={loadParts}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
              title="Segarkan data dari penyimpanan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama part, PN, merk, unit, interchange..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Jenis Unit */}
          <div>
            <select
              value={filterJenis}
              onChange={(e) => {
                setFilterJenis(e.target.value);
                setFilterNoUnit('');
              }}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="">Semua Jenis Unit</option>
              {catalogJenisOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Filter No Unit */}
          <div>
            <select
              value={filterNoUnit}
              onChange={(e) => setFilterNoUnit(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="">Semua No Unit</option>
              {uniqueMasterUnits
                .filter((u) => !filterJenis || u.jenis.toLowerCase() === filterJenis.toLowerCase())
                .map((u) => (
                  <option key={u.noUnit} value={u.noUnit}>
                    {u.noUnit}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter Kategori Part */}
          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Kategori</option>
              {MASTER_PART_KATEGORI_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Fungsi */}
          <div>
            <select
              value={filterFungsi}
              onChange={(e) => setFilterFungsi(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Fungsi</option>
              {MASTER_PART_FUNGSI_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tipe Part (In Line / Interchange) */}
          <div>
            <select
              value={filterRelationType}
              onChange={(e) => setFilterRelationType(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Tipe Part</option>
              {MASTER_PART_RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Master Part Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1260px]">
            <thead>
              <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-36">Reff Unit</th>
                <th className="py-3 px-3 w-32">Kategori Part</th>
                <th className="py-3 px-3 w-28">Jenis Part</th>
                <th className="py-3 px-3 w-28">Merk Part</th>
                <th className="py-3 px-3 w-28">Fungsi</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Part</th>
                <th className="py-3 px-3 w-36">Part Number (PN)</th>
                <th className="py-3 px-3 w-20 text-center">Qty</th>
                <th className="py-3 px-3 w-24 text-center">Min Stock</th>
                <th className="py-3 px-3 w-36">In Line / Interchange</th>
                <th className="py-3 px-3 w-32">Remark</th>
                <th className="py-3 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredMasterParts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-stone-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
                    <p className="text-sm font-medium">Belum ada data Master Part yang sesuai.</p>
                    <p className="text-xs text-stone-600 mt-1">
                      Pilih unit di atas dan masukkan part baru, atau gunakan fitur Import CSV.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMasterParts.map((group, idx) => {
                  const item = group.primary;
                  let badgeKategoriClass = 'bg-stone-800 text-stone-300 border-stone-700';
                  if (item.kategori === 'Fast Moving') {
                    badgeKategoriClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
                  } else if (item.kategori === 'Slow Moving') {
                    badgeKategoriClass = 'bg-blue-950/60 text-blue-400 border-blue-800/80';
                  } else if (item.kategori === 'Death Stock') {
                    badgeKategoriClass = 'bg-red-950/60 text-red-400 border-red-800/80';
                  }

                  const badgeJenisClass =
                    item.jenisPart === 'Genuine Part'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/70'
                      : 'bg-stone-800 text-stone-300 border-stone-700';

                  const minStockVal = Number(item.minStock ?? 0);
                  const isLowStock = minStockVal > 0 && Number(item.qty || 0) <= minStockVal;
                  const subParts = group.mergedInterchangeParts;
                  const isInterchange = group.isInterchange;
                  const isExpanded = Boolean(expandedInterchangeIds[group.groupKey]);

                  return (
                    <React.Fragment key={group.groupKey}>
                      <tr className="hover:bg-stone-900/40 transition-colors">
                        {/* No Urut */}
                        <td className="py-3 px-3 text-center font-mono text-stone-400 tabular-nums">
                          {item.noUrut || idx + 1}
                        </td>

                        {/* Reff Unit (Ringkas & Klik untuk Detail) */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleOpenUnitDetailModal(group)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold transition-colors whitespace-nowrap ${
                              group.isAllNonUnit
                                ? 'bg-sky-950/50 text-sky-300 border-sky-800/70 hover:bg-sky-900/50'
                                : 'bg-stone-950 text-amber-300 border-stone-700 hover:border-amber-500/60 hover:bg-stone-800'
                            }`}
                            title="Klik untuk melihat daftar unit cakupan part ini"
                          >
                            <Truck className="w-3 h-3 shrink-0" />
                            <span className="tabular-nums">{group.unitSummaryLabel}</span>
                          </button>
                          {group.unitCount === 1 && group.unitRefs[0]?.jenisUnit && !group.isAllNonUnit && (
                            <span className="text-[10px] text-stone-400 block truncate max-w-[120px] mt-0.5">
                              {group.unitRefs[0].jenisUnit}
                            </span>
                          )}
                          {group.unitCount > 1 && (
                            <span className="text-[10px] text-stone-400 block truncate max-w-[130px] mt-0.5 font-mono">
                              {group.unitRefs[0]?.noUnit} (+{group.unitCount - 1})
                            </span>
                          )}
                        </td>

                        {/* Kategori Part */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeKategoriClass}`}
                          >
                            {item.kategori}
                          </span>
                        </td>

                        {/* Jenis Part */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${badgeJenisClass}`}
                          >
                            {item.jenisPart}
                          </span>
                        </td>

                        {/* Merk Part */}
                        <td className="py-3 px-3 text-stone-300 font-medium">
                          {item.merk || '-'}
                        </td>

                        {/* Fungsi */}
                        <td className="py-3 px-3">
                          <span className="text-stone-300 text-xs block">{item.fungsi}</span>
                        </td>

                        {/* Nama Part */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-100 block">
                            {item.namaPart}
                          </span>
                          {group.unitCount === 1 && item.modelUnit && item.modelUnit !== '-' && (
                            <span className="text-[10px] text-stone-400 block">
                              Model: {item.modelUnit}
                            </span>
                          )}
                        </td>

                        {/* PN (Part Number) */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs text-amber-300 bg-stone-950/80 px-2 py-0.5 rounded border border-stone-800">
                            {item.pn || '-'}
                          </span>
                        </td>

                        {/* Qty & Satuan */}
                        <td className="py-3 px-3 text-center font-mono tabular-nums">
                          <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-stone-200'}`}>
                            {item.qty}
                          </span>{' '}
                          <span className="text-stone-400 text-[10px]">{item.satuan}</span>
                        </td>

                        {/* Min Stock */}
                        <td className="py-3 px-3 text-center font-mono tabular-nums">
                          <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-amber-300'}`}>
                            {minStockVal}
                          </span>{' '}
                          <span className="text-stone-400 text-[10px]">{item.satuan || 'Pcs'}</span>
                          {isLowStock && (
                            <span className="block text-[9px] text-red-400 font-semibold mt-0.5">
                              Stok Min
                            </span>
                          )}
                        </td>

                        {/* In Line / Interchange */}
                        <td className="py-3 px-3">
                          {isInterchange ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedInterchangeIds((prev) => ({
                                    ...prev,
                                    [group.groupKey]: !prev[group.groupKey],
                                  }))
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/80 hover:bg-sky-900/60 transition-colors whitespace-nowrap"
                                title="Buka / Tutup Sub-Tabel Interchange"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                                <span>Interchange ({subParts.length})</span>
                              </button>
                              {(canInsert || canEdit) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInterchangeModal(group, null)}
                                  className="p-1 text-sky-300 hover:text-sky-200 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/70 rounded transition-colors"
                                  title="Tambah Part Interchange"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-stone-800/80 text-stone-300 border border-stone-700">
                              In Line
                            </span>
                          )}
                        </td>

                        {/* Remark */}
                        <td className="py-3 px-3 text-stone-400 text-xs">
                          {item.remark || '-'}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(group)}
                                className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                                title="Edit Part"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleRequestDelete(group)}
                                className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                                title="Hapus Part"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!canEdit && !canDelete && (
                              <span className="text-[10px] font-mono text-stone-600">-</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* SUB-TABEL INTERCHANGE DI BAWAH BARIS INDUK DENGAN MENU SAMA */}
                      {isInterchange && isExpanded && (
                        <tr className="bg-stone-950/90">
                          <td colSpan={13} className="p-3 pl-8 border-b border-stone-800">
                            <div className="border border-sky-900/60 rounded-xl overflow-hidden bg-stone-900/70">
                              <div className="px-3.5 py-2.5 bg-sky-950/30 border-b border-sky-900/50 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                                  <ArrowRightLeft className="w-4 h-4" />
                                  <span>
                                    Sub-Tabel Part Interchange — {item.namaPart} ({item.pn})
                                  </span>
                                  <span className="text-[11px] font-mono text-stone-400">
                                    · {subParts.length} Part Pengganti
                                  </span>
                                </div>

                                {(canInsert || canEdit) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInterchangeModal(group, null)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tambah Part Interchange</span>
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse min-w-[1140px]">
                                  <thead>
                                    <tr className="bg-stone-900 text-stone-400 border-b border-stone-800 font-mono">
                                      <th className="py-2 px-3 w-12 text-center">No</th>
                                      <th className="py-2 px-3 w-28">Ref Unit</th>
                                      <th className="py-2 px-3 w-28">Kategori Part</th>
                                      <th className="py-2 px-3 w-28">Jenis Part</th>
                                      <th className="py-2 px-3 w-28">Merk Part</th>
                                      <th className="py-2 px-3 w-28">Fungsi</th>
                                      <th className="py-2 px-3 min-w-[200px]">Nama Part Interchange</th>
                                      <th className="py-2 px-3 w-36">Part Number (PN)</th>
                                      <th className="py-2 px-3 w-20 text-center">Qty</th>
                                      <th className="py-2 px-3 w-24 text-center">Min Stock</th>
                                      <th className="py-2 px-3 w-32">Remark</th>
                                      <th className="py-2 px-3 w-24 text-center">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-800/60">
                                    {subParts.length === 0 ? (
                                      <tr>
                                        <td colSpan={12} className="py-6 text-center text-stone-500 text-xs">
                                          Belum ada part pengganti (Interchange) terdaftar. Klik Tambah Part Interchange di atas.
                                        </td>
                                      </tr>
                                    ) : (
                                      subParts.map((sub, subIdx) => {
                                        const subMin = Number(sub.minStock ?? 0);
                                        const subLow = subMin > 0 && Number(sub.qty || 0) <= subMin;
                                        return (
                                          <tr key={sub.id} className="hover:bg-stone-800/30 transition-colors">
                                            <td className="py-2.5 px-3 text-center font-mono text-stone-400 tabular-nums">
                                              {sub.noUrut || subIdx + 1}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-[11px] text-sky-400">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenUnitDetailModal(group)}
                                                className="hover:underline text-left"
                                                title="Lihat detail reff unit"
                                              >
                                                {group.unitSummaryLabel}
                                              </button>
                                            </td>
                                            <td className="py-2.5 px-3 text-stone-300">
                                              {sub.kategori}
                                            </td>
                                            <td className="py-2.5 px-3 text-stone-300">
                                              {sub.jenisPart}
                                            </td>
                                            <td className="py-2.5 px-3 text-stone-300 font-medium">
                                              {sub.merk || '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-stone-300">
                                              {sub.fungsi}
                                            </td>
                                            <td className="py-2.5 px-3 font-semibold text-stone-100">
                                              {sub.namaPart}
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <span className="font-mono text-xs text-sky-300 bg-stone-950/80 px-2 py-0.5 rounded border border-stone-800">
                                                {sub.pn || '-'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                              <span className={`font-bold ${subLow ? 'text-red-400' : 'text-stone-200'}`}>
                                                {sub.qty}
                                              </span>{' '}
                                              <span className="text-stone-400 text-[10px]">
                                                {sub.satuan || 'Pcs'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                              <span className={`font-bold ${subLow ? 'text-red-400' : 'text-amber-300'}`}>
                                                {subMin}
                                              </span>{' '}
                                              <span className="text-stone-400 text-[10px]">
                                                {sub.satuan || 'Pcs'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-stone-400">
                                              {sub.remark || '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                {canEdit && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenInterchangeModal(group, sub)}
                                                    className="p-1 text-stone-400 hover:text-sky-400 hover:bg-stone-800 rounded transition-colors"
                                                    title="Edit Part Interchange"
                                                  >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                {canDelete && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDeletingInterchange({
                                                        parentId: item.id,
                                                        siblingIds: group.entryIds,
                                                        subId: sub.id,
                                                        nama: sub.namaPart,
                                                      })
                                                    }
                                                    className="p-1 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                                                    title="Hapus Part Interchange"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                {!canEdit && !canDelete && (
                                                  <span className="text-[10px] font-mono text-stone-600">-</span>
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
        </>
      )}

      {/* MODAL EDIT MASTER PART */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-2xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 pb-3 flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Edit3 className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 className="text-base font-bold text-stone-100 truncate">
                  Edit Master Part — {editingGroup.primary.namaPart}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-stone-400 hover:text-stone-200 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {editError && (
                  <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {editingGroup.entryIds.length > 1 ? (
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 bg-stone-950/70 border border-stone-800 rounded-lg px-3 py-2.5">
                      <div>
                        <span className="font-semibold text-stone-200 block">
                          Reff Unit Cakupan PN Ini
                        </span>
                        <span className="text-[10px] text-stone-400">
                          Perubahan spesifikasi akan diterapkan ke seluruh unit terkait
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenUnitDetailModal(editingGroup)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-stone-700 bg-stone-900 hover:bg-stone-800 text-amber-300 font-mono text-xs font-semibold whitespace-nowrap"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{editingGroup.unitSummaryLabel}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Toggle Non Unit */}
                      <div className="sm:col-span-2 flex items-center justify-between bg-stone-950/70 border border-stone-800 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-semibold text-stone-200 block">Kategori Non Unit (Umum / Workshop)</span>
                          <span className="text-[10px] text-stone-400">Aktifkan jika material/part ini tidak terikat nomor unit alat berat</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            (editFormData.jenisUnit || '').toLowerCase() === NON_UNIT_JENIS.toLowerCase() ||
                            (editFormData.noUnit || '').toUpperCase() === NON_UNIT_CODE
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({
                                ...editFormData,
                                unitId: NON_UNIT_CODE,
                                jenisUnit: NON_UNIT_JENIS,
                                noUnit: NON_UNIT_CODE,
                                namaAlat: 'Non Unit / Material Umum',
                                modelUnit: '-',
                              });
                            } else {
                              setEditFormData({
                                ...editFormData,
                                jenisUnit:
                                  editingGroup.primary.jenisUnit === NON_UNIT_JENIS
                                    ? ''
                                    : editingGroup.primary.jenisUnit,
                                noUnit:
                                  editingGroup.primary.noUnit === NON_UNIT_CODE
                                    ? ''
                                    : editingGroup.primary.noUnit,
                              });
                            }
                          }}
                          className="w-4 h-4 accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* No Unit & Jenis */}
                      <div>
                        <label className="block text-stone-400 mb-1">No Unit</label>
                        <input
                          type="text"
                          value={editFormData.noUnit || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, noUnit: e.target.value })}
                          className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2 font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-stone-400 mb-1">Jenis Unit</label>
                        <input
                          type="text"
                          value={editFormData.jenisUnit || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, jenisUnit: e.target.value })}
                          className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* No Urut */}
                  <div>
                    <label className="block text-stone-400 mb-1">No Urut</label>
                    <input
                      type="number"
                      value={editFormData.noUrut || 1}
                      onChange={(e) => setEditFormData({ ...editFormData, noUrut: Number(e.target.value) })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2 font-mono"
                    />
                  </div>

                  {/* Kategori Part */}
                  <div>
                    <label className="block text-stone-400 mb-1">Kategori Part</label>
                    <select
                      value={editFormData.kategori}
                      onChange={(e) => setEditFormData({ ...editFormData, kategori: e.target.value as MasterPartKategori })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    >
                      {MASTER_PART_KATEGORI_OPTIONS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Jenis Part */}
                  <div>
                    <label className="block text-stone-400 mb-1">Jenis Part</label>
                    <select
                      value={editFormData.jenisPart}
                      onChange={(e) => setEditFormData({ ...editFormData, jenisPart: e.target.value as MasterPartJenis })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    >
                      {MASTER_PART_JENIS_OPTIONS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Merk Part */}
                  <div>
                    <label className="block text-stone-400 mb-1">Merk Part</label>
                    <input
                      type="text"
                      value={editFormData.merk || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, merk: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    />
                  </div>

                  {/* Fungsi */}
                  <div>
                    <label className="block text-stone-400 mb-1">Fungsi</label>
                    <select
                      value={editFormData.fungsi}
                      onChange={(e) => setEditFormData({ ...editFormData, fungsi: e.target.value as MasterPartFungsi })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    >
                      {MASTER_PART_FUNGSI_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PN */}
                  <div>
                    <label className="block text-stone-400 mb-1">Part Number (PN)</label>
                    <input
                      type="text"
                      value={editFormData.pn || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, pn: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 text-amber-400 rounded p-2 font-mono"
                    />
                  </div>

                  {/* Nama Part */}
                  <div className="sm:col-span-2">
                    <label className="block text-stone-400 mb-1">Nama Part</label>
                    <input
                      type="text"
                      value={editFormData.namaPart || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, namaPart: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded p-2 font-medium"
                      required
                    />
                  </div>

                  {/* Qty, Min Stock & Satuan */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Qty</label>
                      <input
                        type="number"
                        value={editFormData.qty || 1}
                        onChange={(e) => setEditFormData({ ...editFormData, qty: Math.max(1, Number(e.target.value)) })}
                        className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2 font-mono"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-1">Min Stock</label>
                      <input
                        type="number"
                        value={editFormData.minStock ?? 0}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            minStock: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-stone-950 border border-stone-700 text-amber-300 rounded p-2 font-mono"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-1">Satuan</label>
                      <input
                        type="text"
                        value={editFormData.satuan || 'Pcs'}
                        onChange={(e) => setEditFormData({ ...editFormData, satuan: e.target.value })}
                        className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-1">Tipe Part</label>
                      <select
                        value={editFormData.partRelationType || 'In Line'}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            partRelationType: e.target.value as MasterPartRelationType,
                          })
                        }
                        className="w-full bg-stone-950 border border-stone-700 text-sky-300 rounded p-2"
                      >
                        {MASTER_PART_RELATION_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="sm:col-span-2">
                    <label className="block text-stone-400 mb-1">Remark / Keterangan</label>
                    <input
                      type="text"
                      value={editFormData.remark || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 flex justify-end gap-2 border-t border-stone-800 bg-stone-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT BATCH CSV / TEKS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-stone-100">
                  Import Batch Master Part (CSV / Format Teks)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportNotice(null);
                }}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-400 space-y-2">
              <p>
                Tempelkan baris data dari Excel / CSV (dipisahkan koma atau titik-koma) untuk
                memasukkan puluhan atau ratusan part sekaligus ke master:
              </p>
              <div className="bg-stone-950 p-2.5 rounded border border-stone-800 font-mono text-[11px] text-stone-300">
                Contoh urutan kolom:<br />
                <span className="text-amber-400">
                  No, Kategori Part, Jenis Part, Merk Part, Fungsi, Nama Part, PN, Qty, Satuan, Min Stock, Remark
                </span>
                <br />
                <span className="text-stone-400">
                  1,Fast Moving,Genuine Part,Komatsu,Part Service,Oil Filter,600-185-5100,2,Pcs,1,Standar
                </span>
              </div>
            </div>

            {importNotice && (
              <div className="p-3 bg-amber-950/40 border border-amber-800 text-amber-300 rounded text-xs">
                {importNotice}
              </div>
            )}

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Tempel (paste) baris data CSV di sini..."
              className="w-full bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg p-3 font-mono focus:outline-none focus:border-amber-500"
            />

            <div className="flex justify-between items-center pt-2 border-t border-stone-800">
              <span className="text-[11px] text-stone-400">
                Unit target:{' '}
                <strong className={isNonUnitSelected ? 'text-sky-400' : 'text-amber-400'}>
                  {isNonUnitSelected
                    ? 'Non Unit (NON-UNIT)'
                    : checkedUnits.length > 0
                    ? `${checkedUnits.length} Unit (${checkedUnits[0].cnNew}${checkedUnits.length > 1 ? ` +${checkedUnits.length - 1}` : ''})`
                    : 'Semua Unit'}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportNotice(null);
                  }}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg shadow"
                >
                  Proses & Simpan ke Master
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL TAMBAH / EDIT SUB-PART INTERCHANGE */}
      {interchangeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-bold text-stone-100">
                    {interchangeModal.editingSub
                      ? 'Edit Part Interchange'
                      : 'Tambah Part Interchange'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Induk: <span className="text-amber-400 font-mono">{interchangeModal.parent.pn}</span> — {interchangeModal.parent.namaPart}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInterchangeModal(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{subError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInterchangeModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-400 mb-1">No Urut</label>
                  <input
                    type="number"
                    min={1}
                    value={subFormData.noUrut}
                    onChange={(e) => setSubFormData({ ...subFormData, noUrut: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Kategori Part</label>
                  <select
                    value={subFormData.kategori}
                    onChange={(e) =>
                      setSubFormData({ ...subFormData, kategori: e.target.value as MasterPartKategori })
                    }
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  >
                    {MASTER_PART_KATEGORI_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Jenis Part</label>
                  <select
                    value={subFormData.jenisPart}
                    onChange={(e) =>
                      setSubFormData({ ...subFormData, jenisPart: e.target.value as MasterPartJenis })
                    }
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  >
                    {MASTER_PART_JENIS_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Merk Part</label>
                  <input
                    type="text"
                    value={subFormData.merk}
                    onChange={(e) => setSubFormData({ ...subFormData, merk: e.target.value })}
                    placeholder="Contoh: Donaldson, Fleetguard, Sakti..."
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Fungsi</label>
                  <select
                    value={subFormData.fungsi}
                    onChange={(e) =>
                      setSubFormData({ ...subFormData, fungsi: e.target.value as MasterPartFungsi })
                    }
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  >
                    {MASTER_PART_FUNGSI_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Part Number (PN)</label>
                  <input
                    type="text"
                    value={subFormData.pn}
                    onChange={(e) => setSubFormData({ ...subFormData, pn: e.target.value })}
                    placeholder="Contoh: P550588"
                    className="w-full bg-stone-950 border border-stone-700 text-sky-300 rounded p-2 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-stone-400 mb-1">Nama Part Pengganti</label>
                  <input
                    type="text"
                    value={subFormData.namaPart}
                    onChange={(e) => setSubFormData({ ...subFormData, namaPart: e.target.value })}
                    placeholder="Contoh: Oil Filter Donaldson"
                    className="w-full bg-stone-950 border border-stone-700 text-stone-100 rounded p-2 font-medium"
                    required
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-400 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={subFormData.qty}
                      onChange={(e) =>
                        setSubFormData({ ...subFormData, qty: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Min Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={subFormData.minStock}
                      onChange={(e) =>
                        setSubFormData({
                          ...subFormData,
                          minStock: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-700 text-amber-300 rounded p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Satuan</label>
                    <input
                      type="text"
                      value={subFormData.satuan}
                      onChange={(e) => setSubFormData({ ...subFormData, satuan: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-stone-400 mb-1">Remark / Keterangan</label>
                  <input
                    type="text"
                    value={subFormData.remark}
                    onChange={(e) => setSubFormData({ ...subFormData, remark: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setInterchangeModal(null)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-stone-950 rounded-lg shadow"
                >
                  {interchangeModal.editingSub ? 'Simpan Perubahan Interchange' : 'Tambahkan Interchange'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SUB-PART INTERCHANGE */}
      {deletingInterchange && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100">Hapus Part Interchange?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Yakin ingin menghapus part pengganti{' '}
                <strong className="text-stone-200">&ldquo;{deletingInterchange.nama}&rdquo;</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingInterchange(null)}
                className="px-4 py-2 text-xs text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInterchange}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MASTER PART */}
      {deletingGroup && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100">Hapus Master Part?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Yakin ingin menghapus master part{' '}
                <strong className="text-stone-200">&ldquo;{deletingGroup.nama}&rdquo;</strong>{' '}
                (PN: <span className="font-mono text-amber-400">{deletingGroup.pn}</span>) dari{' '}
                <strong className="text-stone-200">{deletingGroup.unitCount} reff unit</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGroup(null)}
                className="px-4 py-2 text-xs text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL REFF UNIT (KLIK DARI RINGKASAN UNIT) */}
      <UnitRefDetailModal
        isOpen={unitModalState.isOpen}
        onClose={() => setUnitModalState((prev) => ({ ...prev, isOpen: false }))}
        title={unitModalState.title}
        subtitle={unitModalState.subtitle}
        entries={unitModalState.entries}
        showStockColumns={true}
        canRemoveEntry={canDelete && unitModalState.entries.length > 1}
        onRemoveEntry={handleRemoveSingleUnitFromModal}
      />
    </div>
  );
};
