import React, { useState, useMemo, useEffect } from 'react';
import { 
  AssetUnit, 
  MasterPartItem, 
  MasterPartKategori, 
  MasterPartJenis, 
  MasterPartFungsi,
  MASTER_PART_KATEGORI_OPTIONS,
  MASTER_PART_JENIS_OPTIONS,
  MASTER_PART_FUNGSI_OPTIONS,
  UserAccount 
} from '../../types';
import { 
  getAllMasterParts, 
  addOrUpdateMasterPart, 
  batchAddMasterParts, 
  deleteMasterPart, 
  isDeveloper,
  canUserInsertModule,
  canUserEditModule,
  canUserDeleteModule,
  canUserExportModule
} from '../../utils/storage';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Download, 
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
  Info
} from 'lucide-react';

interface MasterPartViewProps {
  units: AssetUnit[];
  currentUser: UserAccount;
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
  satuan: string;
  remark: string;
}

const COMMON_SATUAN_OPTIONS = ['Pcs', 'Set', 'Ea', 'Assy', 'Roll', 'Unit', 'Box', 'Liter', 'Can'];

export const MasterPartView: React.FC<MasterPartViewProps> = ({ units, currentUser }) => {
  const isDev = isDeveloper(currentUser);
  const canInsert = canUserInsertModule(currentUser, 8) || isDev;
  const canEdit = canUserEditModule(currentUser, 8) || isDev;
  const canDelete = canUserDeleteModule(currentUser, 8) || isDev;
  const canExport = canUserExportModule(currentUser, 8) || isDev;

  // Master parts list state
  const [masterParts, setMasterParts] = useState<MasterPartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reload master parts from storage
  const loadParts = () => {
    setIsLoading(true);
    const data = getAllMasterParts();
    setMasterParts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadParts();
    const handleStorageChange = () => loadParts();
    window.addEventListener('bkwa-master-parts-changed', handleStorageChange);
    window.addEventListener('bkwa-firestore-synced', handleStorageChange);
    return () => {
      window.removeEventListener('bkwa-master-parts-changed', handleStorageChange);
      window.removeEventListener('bkwa-firestore-synced', handleStorageChange);
    };
  }, []);

  // --- UNIT SELECTION (JENIS DAHULU, BARU NO UNIT) ---
  const availableJenisList = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.jenis && u.jenis.trim()) {
        set.add(u.jenis.trim());
      }
    });
    return Array.from(set).sort();
  }, [units]);

  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [selectedNoUnit, setSelectedNoUnit] = useState<string>('');

  // Filter unit yang sesuai jenis terpilih
  const filteredUnits = useMemo(() => {
    if (!selectedJenis) return [];
    return units.filter((u) => (u.jenis || '').trim().toLowerCase() === selectedJenis.toLowerCase());
  }, [units, selectedJenis]);

  // Object unit yang sedang terpilih
  const activeUnit = useMemo(() => {
    if (!selectedNoUnit) return null;
    return units.find((u) => (u.cnNew || u.nomorLambung || u.kodeUnit || '') === selectedNoUnit) || null;
  }, [units, selectedNoUnit]);

  // Reset No Unit saat Jenis berubah
  const handleJenisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJenis(val);
    setSelectedNoUnit('');
  };

  // --- MULTI-ROW DRAFT PARTS INPUT ---
  const [draftRows, setDraftRows] = useState<DraftPartRow[]>([
    {
      noUrut: 1,
      kategori: 'Fast Moving',
      jenisPart: 'Genuine Part',
      merk: '',
      fungsi: 'Part Service',
      namaPart: '',
      pn: '',
      qty: 1,
      satuan: 'Pcs',
      remark: '',
    },
  ]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  } | null>(null);

  const handleAddDraftRow = () => {
    setDraftRows((prev) => [
      ...prev,
      {
        noUrut: prev.length + 1,
        kategori: 'Fast Moving',
        jenisPart: 'Genuine Part',
        merk: prev.length > 0 ? prev[prev.length - 1].merk : '',
        fungsi: 'Part Service',
        namaPart: '',
        pn: '',
        qty: 1,
        satuan: 'Pcs',
        remark: '',
      },
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
        namaPart: `${source.namaPart}`,
      },
    ]);
  };

  const handleRemoveDraftRow = (index: number) => {
    if (draftRows.length <= 1) {
      setDraftRows([
        {
          noUrut: 1,
          kategori: 'Fast Moving',
          jenisPart: 'Genuine Part',
          merk: '',
          fungsi: 'Part Service',
          namaPart: '',
          pn: '',
          qty: 1,
          satuan: 'Pcs',
          remark: '',
        },
      ]);
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
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Simpan baris-baris draft ke Master Part
  const handleSaveDraftParts = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedJenis) {
      setFeedback({ type: 'error', message: 'Silakan pilih Jenis Alat terlebih dahulu!' });
      return;
    }
    if (!selectedNoUnit) {
      setFeedback({ type: 'error', message: 'Silakan pilih No Unit (CN New) terlebih dahulu!' });
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

    const payloadItems = validRows.map((r, idx) => ({
      unitId: activeUnit?.id || selectedNoUnit,
      jenisUnit: selectedJenis,
      noUnit: selectedNoUnit,
      namaAlat: activeUnit?.namaAlat || '',
      modelUnit: activeUnit?.modelUnit || '',
      noUrut: r.noUrut || idx + 1,
      kategori: r.kategori,
      jenisPart: r.jenisPart,
      merk: r.merk.trim() || activeUnit?.brandMerk || 'Universal',
      fungsi: r.fungsi,
      namaPart: r.namaPart.trim() || 'Part Tanpa Nama',
      pn: r.pn.trim() || '-',
      qty: Number(r.qty) || 1,
      satuan: r.satuan || 'Pcs',
      remark: r.remark.trim() || '',
    }));

    const result = batchAddMasterParts(payloadItems);
    if (result.success) {
      setFeedback({
        type: 'success',
        message: `Berhasil menyimpan ${result.count} item Master Part untuk unit ${selectedNoUnit}!`,
      });
      // Reset rows to single empty
      setDraftRows([
        {
          noUrut: 1,
          kategori: 'Fast Moving',
          jenisPart: 'Genuine Part',
          merk: activeUnit?.brandMerk || '',
          fungsi: 'Part Service',
          namaPart: '',
          pn: '',
          qty: 1,
          satuan: 'Pcs',
          remark: '',
        },
      ]);
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

  // Filtered master parts
  const filteredMasterParts = useMemo(() => {
    return masterParts.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText = (
          (item.namaPart || '') +
          ' ' +
          (item.pn || '') +
          ' ' +
          (item.merk || '') +
          ' ' +
          (item.noUnit || '') +
          ' ' +
          (item.jenisUnit || '') +
          ' ' +
          (item.remark || '')
        ).toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      // Filter Jenis
      if (filterJenis && item.jenisUnit.toLowerCase() !== filterJenis.toLowerCase()) {
        return false;
      }
      // Filter No Unit
      if (filterNoUnit && item.noUnit.toLowerCase() !== filterNoUnit.toLowerCase()) {
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
      return true;
    });
  }, [
    masterParts,
    searchQuery,
    filterJenis,
    filterNoUnit,
    filterKategori,
    filterJenisPart,
    filterFungsi,
  ]);

  // Units list found in master parts for table filtering
  const uniqueMasterUnits = useMemo(() => {
    const map = new Map<string, string>();
    masterParts.forEach((p) => {
      if (p.noUnit) map.set(p.noUnit, p.jenisUnit || '');
    });
    return Array.from(map.entries()).map(([noUnit, jenis]) => ({ noUnit, jenis }));
  }, [masterParts]);

  // --- STATS SUMMARY ---
  const stats = useMemo(() => {
    let fastMoving = 0;
    let slowMoving = 0;
    let deathStock = 0;
    let totalQty = 0;

    masterParts.forEach((p) => {
      if (p.kategori === 'Fast Moving') fastMoving++;
      else if (p.kategori === 'Slow Moving') slowMoving++;
      else if (p.kategori === 'Death Stock') deathStock++;
      totalQty += Number(p.qty) || 0;
    });

    return {
      totalItems: masterParts.length,
      fastMoving,
      slowMoving,
      deathStock,
      totalQty,
    };
  }, [masterParts]);

  // --- MODAL EDIT STATE ---
  const [editingPart, setEditingPart] = useState<MasterPartItem | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<MasterPartItem>>({});

  const handleOpenEdit = (part: MasterPartItem) => {
    setEditingPart(part);
    setEditFormData({ ...part });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    const res = addOrUpdateMasterPart(
      {
        unitId: editFormData.unitId || editingPart.unitId,
        jenisUnit: editFormData.jenisUnit || editingPart.jenisUnit,
        noUnit: editFormData.noUnit || editingPart.noUnit,
        namaAlat: editFormData.namaAlat || editingPart.namaAlat,
        modelUnit: editFormData.modelUnit || editingPart.modelUnit,
        noUrut: Number(editFormData.noUrut) || editingPart.noUrut,
        kategori: (editFormData.kategori as MasterPartKategori) || editingPart.kategori,
        jenisPart: (editFormData.jenisPart as MasterPartJenis) || editingPart.jenisPart,
        merk: editFormData.merk || editingPart.merk,
        fungsi: (editFormData.fungsi as MasterPartFungsi) || editingPart.fungsi,
        namaPart: editFormData.namaPart || editingPart.namaPart,
        pn: editFormData.pn || editingPart.pn,
        qty: Number(editFormData.qty) || editingPart.qty,
        satuan: editFormData.satuan || editingPart.satuan,
        remark: editFormData.remark || '',
      },
      editingPart.id
    );

    if (res.success) {
      setEditingPart(null);
      loadParts();
    } else {
      alert(res.message);
    }
  };

  // --- DELETE ACTION ---
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string, nama: string) => {
    if (!window.confirm(`Yakin ingin menghapus master part: "${nama}"?`)) return;
    const res = deleteMasterPart(id);
    if (res.success) {
      loadParts();
    } else {
      alert(res.message);
    }
  };

  // --- EXPORT TO CSV ---
  const handleExportCSV = () => {
    if (filteredMasterParts.length === 0) {
      alert('Tidak ada data yang dapat diekspor!');
      return;
    }

    const headers = [
      'No Urut',
      'Jenis Unit',
      'No Unit (CN)',
      'Model Unit',
      'Kategori Part',
      'Jenis Part',
      'Merk Part',
      'Fungsi',
      'Nama Part',
      'Part Number (PN)',
      'Qty',
      'Satuan',
      'Remark',
    ];

    const rows = filteredMasterParts.map((p, idx) => [
      p.noUrut || idx + 1,
      `"${p.jenisUnit || ''}"`,
      `"${p.noUnit || ''}"`,
      `"${p.modelUnit || ''}"`,
      `"${p.kategori || ''}"`,
      `"${p.jenisPart || ''}"`,
      `"${p.merk || ''}"`,
      `"${p.fungsi || ''}"`,
      `"${p.namaPart.replace(/"/g, '""')}"`,
      `"${p.pn.replace(/"/g, '""')}"`,
      p.qty,
      `"${p.satuan || ''}"`,
      `"${(p.remark || '').replace(/"/g, '""')}"`,
    ]);

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
        // 1. Kategori, Jenis Part, Merk, Fungsi, Nama Part, PN, Qty, Satuan, Remark
        // 2. Atau No, Kategori, Jenis Part, Merk, Fungsi, Nama Part, PN, Qty, Satuan, Remark
        let noUrut = idx + 1;
        let kategori: MasterPartKategori = 'Fast Moving';
        let jenisPart: MasterPartJenis = 'Genuine Part';
        let merk = 'Universal';
        let fungsi: MasterPartFungsi = 'Part Service';
        let namaPart = '';
        let pn = '-';
        let qty = 1;
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
          remark = cols[offset + 8] || '';
        } else if (cols.length >= 2) {
          // Minimal format: Nama Part, PN
          namaPart = cols[0];
          pn = cols[1];
          if (cols[2]) qty = Number(cols[2]) || 1;
          if (cols[3]) satuan = cols[3];
          if (cols[4]) merk = cols[4];
        }

        if (namaPart) {
          itemsToImport.push({
            unitId: activeUnit?.id || selectedNoUnit || 'ALL',
            jenisUnit: selectedJenis || 'Alat Berat',
            noUnit: selectedNoUnit || 'UNIT-ALL',
            namaAlat: activeUnit?.namaAlat || '',
            modelUnit: activeUnit?.modelUnit || '',
            noUrut,
            kategori,
            jenisPart,
            merk,
            fungsi,
            namaPart,
            pn,
            qty,
            satuan,
            remark,
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
        alert(`Sukses mengimpor ${res.count} item Master Part!`);
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

      {/* SECTION 1: FORM INPUT BREAKDOWN-STYLE UNIT SELECTOR & MULTI-ROW PART ENTRY */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>Form Registrasi Master Part per Unit</span>
            <span className="text-xs text-stone-400 font-normal">
              (Pilih Jenis dahulu &rarr; kemudian No Unit)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
              title="Import banyak data dari teks CSV / Excel"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import CSV / Teks</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveDraftParts} className="p-5 space-y-5">
          {/* Unit Selection Card (Mirip Input Breakdown Modul 3) */}
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Pilih Jenis Unit */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  1. Pilih Jenis Unit <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedJenis}
                  onChange={handleJenisChange}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 font-medium"
                  required
                >
                  <option value="">-- Pilih Jenis Dahulu --</option>
                  {availableJenisList.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Data diambil dari Registrasi Aset Modul 1
                </span>
              </div>

              {/* 2. Pilih No Unit (CN New) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-500" />
                  2. Pilih No Unit (CN NEW) <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedNoUnit}
                  onChange={(e) => setSelectedNoUnit(e.target.value)}
                  disabled={!selectedJenis}
                  className={`w-full bg-stone-900 border text-sm rounded-lg px-3 py-2 focus:outline-none font-mono font-medium ${
                    !selectedJenis
                      ? 'border-stone-800 text-stone-600 cursor-not-allowed'
                      : 'border-stone-700 text-stone-100 focus:border-amber-500'
                  }`}
                  required
                >
                  <option value="">
                    {!selectedJenis ? '-- Pilih Jenis Dahulu --' : '-- Pilih No Unit --'}
                  </option>
                  {filteredUnits.map((u, idx) => {
                    const cn = u.cnNew || u.nomorLambung || u.kodeUnit || '';
                    return (
                      <option key={`${u.id}_${idx}`} value={cn}>
                        {cn} {u.namaAlat ? `— ${u.namaAlat}` : ''} {u.modelUnit ? `(${u.modelUnit})` : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {filteredUnits.length} unit terdaftar untuk {selectedJenis || 'kategori ini'}
                </span>
              </div>

              {/* 3. Detail Alat (Auto Filled) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Nama Alat & Model
                </label>
                <input
                  type="text"
                  readOnly
                  value={activeUnit ? `${activeUnit.namaAlat || '-'} / ${activeUnit.modelUnit || '-'}` : '-'}
                  className="w-full bg-stone-900/50 border border-stone-800 text-stone-300 text-sm rounded-lg px-3 py-2 cursor-default"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Otomatis terisi dari Aset
                </span>
              </div>

              {/* 4. Brand / Merek Unit (Auto Filled) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Merek Pabrikan Unit
                </label>
                <input
                  type="text"
                  readOnly
                  value={activeUnit ? `${activeUnit.brandMerk || 'Standar'} (SN: ${activeUnit.serialNumber || '-'})` : '-'}
                  className="w-full bg-stone-900/50 border border-stone-800 text-stone-300 text-sm rounded-lg px-3 py-2 cursor-default"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Referensi suku cadang unit
                </span>
              </div>
            </div>
          </div>

          {/* Feedback message banner */}
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
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                    <th className="py-2.5 px-3 w-14 text-center">No</th>
                    <th className="py-2.5 px-3 w-36">Kategori Part</th>
                    <th className="py-2.5 px-3 w-32">Jenis Part</th>
                    <th className="py-2.5 px-3 w-32">Merk Part</th>
                    <th className="py-2.5 px-3 w-32">Fungsi</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Nama Part <span className="text-red-400">*</span></th>
                    <th className="py-2.5 px-3 w-36">Part Number (PN)</th>
                    <th className="py-2.5 px-3 w-24 text-center">Qty & Satuan</th>
                    <th className="py-2.5 px-3 w-40">Remark / Keterangan</th>
                    <th className="py-2.5 px-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {draftRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-900/40 transition-colors">
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
                  setDraftRows([
                    {
                      noUrut: 1,
                      kategori: 'Fast Moving',
                      jenisPart: 'Genuine Part',
                      merk: '',
                      fungsi: 'Part Service',
                      namaPart: '',
                      pn: '',
                      qty: 1,
                      satuan: 'Pcs',
                      remark: '',
                    },
                  ]);
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
      </div>

      {/* SECTION 2: TABEL MASTER MATERIAL & PART LENGKAP DENGAN FILTER & SEARCH */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-stone-800 bg-stone-900/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
            <Boxes className="w-4 h-4 text-amber-500" />
            <span>Katalog Master Material & Suku Cadang Terdaftar</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-400 font-mono font-bold">
              {filteredMasterParts.length} Part
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
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama part, PN, merk, unit..."
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
              {availableJenisList.map((j) => (
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
        </div>

        {/* Master Part Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-stone-900/90 text-stone-300 border-b border-stone-800 font-mono">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-28">No Unit (CN)</th>
                <th className="py-3 px-3 w-32">Kategori Part</th>
                <th className="py-3 px-3 w-28">Jenis Part</th>
                <th className="py-3 px-3 w-28">Merk Part</th>
                <th className="py-3 px-3 w-28">Fungsi</th>
                <th className="py-3 px-4 min-w-[220px]">Nama Part</th>
                <th className="py-3 px-3 w-36">Part Number (PN)</th>
                <th className="py-3 px-3 w-20 text-center">Qty</th>
                <th className="py-3 px-3 w-36">Remark</th>
                <th className="py-3 px-3 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredMasterParts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-500">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
                    <p className="text-sm font-medium">Belum ada data Master Part yang sesuai.</p>
                    <p className="text-xs text-stone-600 mt-1">
                      Pilih unit di atas dan masukkan part baru, atau gunakan fitur Import CSV.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMasterParts.map((item, idx) => {
                  // Badge kategori styling
                  let badgeKategoriClass = 'bg-stone-800 text-stone-300 border-stone-700';
                  if (item.kategori === 'Fast Moving') {
                    badgeKategoriClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
                  } else if (item.kategori === 'Slow Moving') {
                    badgeKategoriClass = 'bg-blue-950/60 text-blue-400 border-blue-800/80';
                  } else if (item.kategori === 'Death Stock') {
                    badgeKategoriClass = 'bg-red-950/60 text-red-400 border-red-800/80';
                  }

                  // Badge jenis part styling
                  const badgeJenisClass =
                    item.jenisPart === 'Genuine Part'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/70'
                      : 'bg-stone-800 text-stone-300 border-stone-700';

                  return (
                    <tr key={item.id} className="hover:bg-stone-900/40 transition-colors">
                      {/* No Urut */}
                      <td className="py-3 px-3 text-center font-mono text-stone-400">
                        {item.noUrut || idx + 1}
                      </td>

                      {/* No Unit */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-amber-400 block">
                          {item.noUnit || '-'}
                        </span>
                        <span className="text-[10px] text-stone-400 block truncate max-w-[100px]">
                          {item.jenisUnit || ''}
                        </span>
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
                        {item.modelUnit && (
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
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-stone-200">{item.qty}</span>{' '}
                        <span className="text-stone-400 text-[10px]">{item.satuan}</span>
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
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                              title="Edit Part"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id, item.namaPart)}
                              className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                              title="Hapus Part"
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

      {/* MODAL EDIT MASTER PART */}
      {editingPart && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-stone-100">
                  Edit Master Part — {editingPart.namaPart}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPart(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

                {/* Qty & Satuan */}
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
                  <label className="block text-stone-400 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={editFormData.satuan || 'Pcs'}
                    onChange={(e) => setEditFormData({ ...editFormData, satuan: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded p-2"
                  />
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

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingPart(null)}
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
                  No, Kategori Part, Jenis Part, Merk Part, Fungsi, Nama Part, PN, Qty, Satuan, Remark
                </span>
                <br />
                <span className="text-stone-400">
                  1,Fast Moving,Genuine Part,Komatsu,Part Service,Oil Filter,600-185-5100,2,Pcs,Standar
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
                Unit target: <strong className="text-amber-400">{selectedNoUnit || 'Semua Unit'}</strong>
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
    </div>
  );
};
