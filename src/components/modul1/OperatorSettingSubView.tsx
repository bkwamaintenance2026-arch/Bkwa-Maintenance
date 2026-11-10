import React, { useState, useMemo, useEffect } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  UserAccount, 
  BarcodeFuelStatus, 
  BARCODE_FUEL_STATUS_OPTIONS,
  OperationalStatus,
  ASSET_STATUS_OPTIONS 
} from '../../types';
import { 
  UserCheck, 
  Truck, 
  Search, 
  Save, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  FileSpreadsheet, 
  Printer, 
  UserX, 
  Filter, 
  Check, 
  Edit3, 
  PlusCircle, 
  Trash2, 
  ArrowRight,
  ListFilter,
  Layers,
  Wrench,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  FileDown,
  FileText,
  CheckCheck
} from 'lucide-react';
import { canAccessRegistrationForm, updateUnitOperatorSetting } from '../../utils/storage';
import { generateOperatorSettingPDF, exportOperatorSettingToPDF } from '../../utils/pdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

export interface OperatorDocSignatories {
  pembuatName: string;
  pembuatJabatan: string;
  disetujuiName: string;
  disetujuiJabatan: string;
  diketahuiName: string;
  diketahuiJabatan: string;
}

export const STORAGE_KEY_OPERATOR_SIGNATORIES = 'bkwa_operator_setting_signatories_v1';

export type OperatorSortField = 
  | 'cnNew' 
  | 'namaAlat' 
  | 'jenis' 
  | 'loc' 
  | 'status'
  | 'operatorName' 
  | 'operatorJabatan' 
  | 'operatorJob' 
  | 'barcodeFuelStatus' 
  | 'operatorRemark';

interface OperatorSettingSubViewProps {
  units?: AssetUnit[];
  manpowerList?: ManpowerData[];
  currentUser?: UserAccount | null;
  onUpdateOperatorSetting: (
    unitId: string,
    setting: {
      operatorName?: string;
      operatorManpowerId?: string;
      operatorJabatan?: string;
      operatorJob?: string;
      barcodeFuelStatus?: BarcodeFuelStatus | string;
      operatorRemark?: string;
    }
  ) => { success: boolean; message: string; unit?: AssetUnit };
}

// Rekomendasi job umum di tambang/quarry untuk quick click / datalist
const COMMON_JOB_SUGGESTIONS = [
  'Hauling Batu Quarry',
  'Loading Crusher Plant',
  'Stripping Overburden (OB)',
  'Spreading Disposal',
  'Stockpile Rehandling',
  'Ripping & Dozing Pit',
  'Gali Parit & Sump Drainage',
  'Maintenance / Standby',
  'General Quarry Support'
];

/**
 * Helper untuk mendeteksi apakah suatu unit armada memiliki permasalahan barcode fuel
 * (Status RUSAK, HILANG, PUDAR, LEPAS, atau catatan kendala/pinjam barcode pada remark).
 * Memastikan semua 6 unit bermasalah terdeteksi dengan presisi dan konsisten.
 */
export const isBarcodeIssue = (u?: AssetUnit | null): boolean => {
  if (!u) return false;
  const s = (u.barcodeFuelStatus || '').trim().toUpperCase();
  const r = (u.operatorRemark || '').toUpperCase();
  return (
    s === 'RUSAK' ||
    s === 'HILANG' ||
    s.includes('RUSAK') ||
    s.includes('HILANG') ||
    s.includes('PUDAR') ||
    s.includes('LEPAS') ||
    r.includes('BARCODE SERING ERROR') ||
    r.includes('BARCODE EXPIRED') ||
    r.includes('TIDAK ADA BARCODE') ||
    r.includes('BARCODE PINJAM') ||
    r.includes('PINJAM DARI DTT') ||
    r.includes('PAKAI BARCODE PUNYA')
  );
};

export const isBarcodeActive = (u?: AssetUnit | null): boolean => {
  if (!u) return false;
  const s = (u.barcodeFuelStatus || '').trim().toUpperCase();
  return s === 'TERPASANG' || s === 'AKTIF' || s.includes('PASANG') || s.includes('NORMAL');
};

export const OperatorSettingSubView: React.FC<OperatorSettingSubViewProps> = ({
  units = [],
  manpowerList = [],
  currentUser = null,
  onUpdateOperatorSetting,
}) => {
  // Safe edit permission check
  const canEdit = currentUser
    ? Boolean(canAccessRegistrationForm(currentUser) || currentUser?.role === 'ADMIN' || currentUser?.accountTier === 'ADMIN' || currentUser?.role === 'DEVELOPER')
    : true;

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // ==========================================
  // STEP-BY-STEP CASCADING FORM STATE
  // Step 1: Pilih Jenis -> Step 2: Pilih No Unit -> Step 3: Pilih Operator & Detail
  // ==========================================
  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [formOperatorName, setFormOperatorName] = useState<string>('');
  const [formOperatorManpowerId, setFormOperatorManpowerId] = useState<string>('');
  const [formOperatorJabatan, setFormOperatorJabatan] = useState<string>('');
  const [formOperatorJob, setFormOperatorJob] = useState<string>('');
  const [formBarcodeStatus, setFormBarcodeStatus] = useState<BarcodeFuelStatus | string>('BELUM ADA');
  const [formRemark, setFormRemark] = useState<string>('');
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  // Filter & Search states untuk Tabel List di bawah
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableFilterJenis, setTableFilterJenis] = useState<string>('ALL');
  const [tableFilterStatus, setTableFilterStatus] = useState<string>('ALL');
  const [tableFilterBarcode, setTableFilterBarcode] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'ASSIGNED_ONLY' | 'ALL_UNITS'>('ASSIGNED_ONLY');

  // Sorting state untuk Header Kolom Tabel
  const [sortField, setSortField] = useState<OperatorSortField>('cnNew');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // PDF Preview Modal States
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');

  // ==========================================
  // SIGNATORIES (LEMBAR PENGESAHAN DOKUMEN CETAK)
  // 1. Dibuat Oleh :
  // 2. Di Setujui Oleh : Kabag Workshop
  // 3. diKetahui Oleh : KTT
  // ==========================================
  const [operatorSignatories, setOperatorSignatories] = useState<OperatorDocSignatories>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPERATOR_SIGNATORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            pembuatName: parsed.pembuatName || currentUser?.fullName || currentUser?.username || '',
            pembuatJabatan: parsed.pembuatJabatan || 'Admin / Dispatcher',
            disetujuiName: parsed.disetujuiName || 'Dodik Mariyadi',
            disetujuiJabatan: parsed.disetujuiJabatan || 'Kabag Workshop',
            diketahuiName: parsed.diketahuiName || 'KTT / Project Manager',
            diketahuiJabatan: parsed.diketahuiJabatan || 'KTT',
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      pembuatName: currentUser?.fullName || currentUser?.username || '',
      pembuatJabatan: 'Admin / Dispatcher',
      disetujuiName: 'Dodik Mariyadi',
      disetujuiJabatan: 'Kabag Workshop',
      diketahuiName: 'KTT / Project Manager',
      diketahuiJabatan: 'KTT',
    };
  });
  const [signatoriesSavedFeedback, setSignatoriesSavedFeedback] = useState<boolean>(false);

  // Daftar lengkap semua manpower tersortir
  const sortedAllManpower = useMemo(() => {
    return [...(manpowerList || [])].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [manpowerList]);

  // Kandidat Kabag Workshop (Modul 2)
  const kabagCandidates = useMemo(() => {
    return sortedAllManpower.filter((m) => {
      const j = (m.jabatan || '').toUpperCase();
      const n = (m.nama || '').toUpperCase();
      return j.includes('KABAG') || j.includes('WORKSHOP') || j.includes('BENGKEL') || n.includes('DODIK');
    });
  }, [sortedAllManpower]);

  // Kandidat KTT / Management (Modul 2)
  const kttCandidates = useMemo(() => {
    return sortedAllManpower.filter((m) => {
      const j = (m.jabatan || '').toUpperCase();
      return j.includes('KTT') || j.includes('KEPALA TEKNIK') || j.includes('PROJECT MANAGER') || j.includes('PM');
    });
  }, [sortedAllManpower]);

  // Simpan pengaturan tanda tangan ke local storage
  const handleSaveSignatories = () => {
    try {
      localStorage.setItem(STORAGE_KEY_OPERATOR_SIGNATORIES, JSON.stringify(operatorSignatories));
      setSignatoriesSavedFeedback(true);
      setTimeout(() => setSignatoriesSavedFeedback(false), 3000);
      setFeedback({
        type: 'success',
        message: '✓ Pengaturan Tanda Tangan Validasi Dokumen Cetak berhasil disimpan!',
      });
    } catch (e) {
      console.error('Failed to save signatories:', e);
    }
  };

  // Handler toggle sort kolom
  const handleSort = (field: OperatorSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper render header dengan Sort By indikator
  const renderSortHeader = (label: string, field: OperatorSortField, minWidth?: string, align: 'left' | 'center' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-3.5 py-3.5 whitespace-nowrap cursor-pointer hover:bg-stone-900 transition select-none group text-${align} ${
          minWidth || ''
        }`}
        title={`Klik untuk mengurutkan (Sort by ${label})`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
          <span className={isSorted ? 'text-amber-400 font-black' : 'text-stone-400 group-hover:text-stone-200'}>
            {label}
          </span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-400 shrink-0 transition" />
          )}
        </div>
      </th>
    );
  };

  // Daftar jenis unit unik dari database armada
  const uniqueJenisList = useMemo(() => {
    const s = new Set<string>();
    (units || []).forEach((u) => {
      if (u && u.jenis && u.jenis.trim()) {
        s.add(u.jenis.trim());
      }
    });
    return Array.from(s).sort();
  }, [units]);

  // Daftar status unit unik dari database armada Registrasi Asset
  const uniqueStatusList = useMemo(() => {
    const s = new Set<string>();
    (units || []).forEach((u) => {
      if (u && u.status && u.status.trim()) {
        s.add(u.status.trim());
      }
    });
    // Sertakan opsi standar resmi registrasi asset
    ASSET_STATUS_OPTIONS.forEach((opt) => s.add(opt));
    return Array.from(s).sort();
  }, [units]);

  // Helper styling badge status unit resmi dari Modul Registrasi Asset
  const getAssetStatusBadge = (status?: string) => {
    switch (status) {
      case 'Operasi Etika 05':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Operasi Etika 09':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
      case 'Breakdown':
      case 'BREAKDOWN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'Stanby':
      case 'STANDBY':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'OPERASI':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  // Unit yang tersedia berdasarkan Jenis yang dipilih pada form step 1
  const unitsOfSelectedJenis = useMemo(() => {
    if (!selectedJenis) return [];
    return (units || []).filter(
      (u) => u && (u.jenis || '').trim().toLowerCase() === selectedJenis.trim().toLowerCase()
    );
  }, [units, selectedJenis]);

  // Data unit yang sedang dipilih saat ini di Form step 2
  const currentSelectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return (units || []).find((u) => u && u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  // Kelompok Manpower dari Modul 2: Operator & Sopir diprioritaskan di atas
  const { operatorAndDrivers, otherManpower } = useMemo(() => {
    const opDrivers: ManpowerData[] = [];
    const others: ManpowerData[] = [];

    (manpowerList || []).forEach((m) => {
      if (!m) return;
      const j = (m.jabatan || '').toUpperCase();
      if (j.includes('OPERATOR') || j.includes('SOPIR') || j.includes('DRIVER')) {
        opDrivers.push(m);
      } else {
        others.push(m);
      }
    });

    const sortFn = (a: ManpowerData, b: ManpowerData) => (a.nama || '').localeCompare(b.nama || '');
    return {
      operatorAndDrivers: opDrivers.sort(sortFn),
      otherManpower: others.sort(sortFn),
    };
  }, [manpowerList]);

  // Ketika Jenis berubah, reset nomor unit yang dipilih
  const handleJenisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newJenis = e.target.value;
    setSelectedJenis(newJenis);
    setSelectedUnitId('');
    resetFormFields();
  };

  // Ketika Nomor Unit dipilih, otomatis isi form dengan data yang sudah ada sebelumnya (jika pernah disetting)
  const handleUnitSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitId = e.target.value;
    setSelectedUnitId(unitId);

    if (!unitId) {
      resetFormFields();
      return;
    }

    const unit = (units || []).find((u) => u && u.id === unitId);
    if (unit) {
      const hasPriorSetting = Boolean(unit.operatorName || unit.operatorJob || (unit.barcodeFuelStatus && unit.barcodeFuelStatus !== 'BELUM ADA') || unit.operatorRemark);
      setIsEditingExisting(hasPriorSetting);
      setFormOperatorName(unit.operatorName || '');
      setFormOperatorManpowerId(unit.operatorManpowerId || '');
      setFormOperatorJabatan(unit.operatorJabatan || '');
      setFormOperatorJob(unit.operatorJob || '');
      setFormBarcodeStatus((unit.barcodeFuelStatus as BarcodeFuelStatus) || 'BELUM ADA');
      setFormRemark(unit.operatorRemark || '');
    }
  };

  // Ketika Nama Operator dipilih dari dropdown Modul 2
  const handleOperatorNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setFormOperatorName(name);

    if (!name) {
      setFormOperatorManpowerId('');
      setFormOperatorJabatan('');
      return;
    }

    const matched = (manpowerList || []).find(
      (m) => m && (m.nama || '').toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (matched) {
      setFormOperatorManpowerId(matched.id || '');
      setFormOperatorJabatan(matched.jabatan || '');
    }
  };

  // Reset form helper
  const resetFormFields = () => {
    setFormOperatorName('');
    setFormOperatorManpowerId('');
    setFormOperatorJabatan('');
    setFormOperatorJob('');
    setFormBarcodeStatus('BELUM ADA');
    setFormRemark('');
    setIsEditingExisting(false);
  };

  const handleFullReset = () => {
    setSelectedJenis('');
    setSelectedUnitId('');
    resetFormFields();
  };

  // Handler Submit / Simpan Penugasan Operator
  const handleSubmitSetting = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJenis) {
      setFeedback({ type: 'error', message: 'Silakan pilih Jenis Unit terlebih dahulu.' });
      return;
    }

    if (!selectedUnitId) {
      setFeedback({ type: 'error', message: 'Silakan pilih Nomor Unit (CN New) yang akan disetting.' });
      return;
    }

    const unit = (units || []).find((u) => u && u.id === selectedUnitId);
    if (!unit) {
      setFeedback({ type: 'error', message: 'Unit tidak ditemukan dalam sistem.' });
      return;
    }

    const settingPayload = {
      operatorName: formOperatorName.trim(),
      operatorManpowerId: formOperatorManpowerId,
      operatorJabatan: formOperatorJabatan,
      operatorJob: formOperatorJob.trim(),
      barcodeFuelStatus: formBarcodeStatus,
      operatorRemark: formRemark.trim(),
    };

    const saveFunc = onUpdateOperatorSetting || updateUnitOperatorSetting;
    const res = saveFunc(selectedUnitId, settingPayload);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `✓ Sukses! Pengaturan Operator & Barcode Unit [${unit.cnNew}] berhasil disimpan dan masuk ke list.`,
      });
      // Pastikan viewMode aktif menampilkan list yang ditugaskan
      setViewMode('ASSIGNED_ONLY');
      // Scroll to table smoothly
      setTimeout(() => {
        const tableEl = document.getElementById('table-operator-assigned-list');
        if (tableEl) {
          tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Gagal menyimpan pengaturan operator.',
      });
    }
  };

  // Handler Edit dari Baris Tabel (Load kembali ke Form atas)
  const handleEditFromTable = (unit: AssetUnit) => {
    setSelectedJenis(unit.jenis || '');
    setSelectedUnitId(unit.id);
    setIsEditingExisting(true);
    setFormOperatorName(unit.operatorName || '');
    setFormOperatorManpowerId(unit.operatorManpowerId || '');
    setFormOperatorJabatan(unit.operatorJabatan || '');
    setFormOperatorJob(unit.operatorJob || '');
    setFormBarcodeStatus((unit.barcodeFuelStatus as BarcodeFuelStatus) || 'BELUM ADA');
    setFormRemark(unit.operatorRemark || '');

    // Scroll up ke Form
    const formEl = document.getElementById('form-input-setting-operator');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handler Hapus / Lepas Penugasan Operator Unit
  const handleRemoveAssignment = (unit: AssetUnit) => {
    if (!window.confirm(`Lepaskan penugasan operator dari unit [${unit.cnNew}]? Unit akan dikeluarkan dari list penugasan.`)) {
      return;
    }

    const saveFunc = onUpdateOperatorSetting || updateUnitOperatorSetting;
    const res = saveFunc(unit.id, {
      operatorName: '',
      operatorManpowerId: '',
      operatorJabatan: '',
      operatorJob: '',
      barcodeFuelStatus: 'BELUM ADA',
      operatorRemark: '',
    });

    if (res.success) {
      setFeedback({
        type: 'info',
        message: `Penugasan operator untuk unit [${unit.cnNew}] telah dilepas / dikosongkan.`,
      });
      if (selectedUnitId === unit.id) {
        resetFormFields();
      }
    } else {
      setFeedback({ type: 'error', message: res.message || 'Gagal melepaskan penugasan.' });
    }
  };

  // ==========================================
  // FILTERED & SORTED UNITS UNTUK TABEL DI BAWAH
  // ==========================================
  const displayedUnits = useMemo(() => {
    const filtered = (units || []).filter((u) => {
      if (!u) return false;

      // Filter berdasarkan Mode: Hanya yang sudah di-setting vs Semua Unit
      const isAssigned = Boolean(
        (u.operatorName && u.operatorName.trim()) ||
        (u.operatorJob && u.operatorJob.trim()) ||
        (u.barcodeFuelStatus && u.barcodeFuelStatus !== 'BELUM ADA') ||
        (u.operatorRemark && u.operatorRemark.trim()) ||
        isBarcodeIssue(u)
      );

      if (viewMode === 'ASSIGNED_ONLY' && !isAssigned) {
        return false;
      }

      // Filter Jenis Unit pada tabel
      if (tableFilterJenis !== 'ALL' && (u.jenis || '').trim().toLowerCase() !== tableFilterJenis.trim().toLowerCase()) {
        return false;
      }

      // Filter Status Unit pada tabel (dari Registrasi Asset)
      if (tableFilterStatus !== 'ALL' && (u.status || '').trim().toLowerCase() !== tableFilterStatus.trim().toLowerCase()) {
        return false;
      }

      // Filter Barcode Status pada tabel
      if (tableFilterBarcode !== 'ALL') {
        if (tableFilterBarcode === 'RUSAK_HILANG') {
          if (!isBarcodeIssue(u)) return false;
        } else if (tableFilterBarcode === 'TERPASANG') {
          if (!isBarcodeActive(u)) return false;
        } else if (tableFilterBarcode === 'RUSAK') {
          const isR = u.barcodeFuelStatus === 'RUSAK' || (isBarcodeIssue(u) && u.barcodeFuelStatus !== 'HILANG');
          if (!isR) return false;
        } else if (tableFilterBarcode === 'HILANG') {
          const isH = u.barcodeFuelStatus === 'HILANG' || (u.operatorRemark || '').toUpperCase().includes('TIDAK ADA BARCODE');
          if (!isH) return false;
        } else if (tableFilterBarcode === 'BELUM ADA') {
          if (isBarcodeIssue(u) || isBarcodeActive(u)) return false;
        } else if ((u.barcodeFuelStatus || 'BELUM ADA') !== tableFilterBarcode) {
          return false;
        }
      }

      // Search keyword filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const cn = (u.cnNew || '').toLowerCase();
        const nama = (u.namaAlat || '').toLowerCase();
        const jenis = (u.jenis || '').toLowerCase();
        const status = (u.status || '').toLowerCase();
        const op = (u.operatorName || '').toLowerCase();
        const job = (u.operatorJob || '').toLowerCase();
        const bc = (u.barcodeFuelStatus || '').toLowerCase();
        const rmk = (u.operatorRemark || '').toLowerCase();

        return (
          cn.includes(q) ||
          nama.includes(q) ||
          jenis.includes(q) ||
          status.includes(q) ||
          op.includes(q) ||
          job.includes(q) ||
          bc.includes(q) ||
          rmk.includes(q)
        );
      }

      return true;
    });

    // Urutkan (Sorting) secara dinamis sesuai sortField dan sortOrder
    return [...filtered].sort((a, b) => {
      let aVal = (a[sortField] || '').toString().toLowerCase();
      let bVal = (b[sortField] || '').toString().toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [units, viewMode, tableFilterJenis, tableFilterStatus, tableFilterBarcode, searchTerm, sortField, sortOrder]);

  // Statistik Ringkas Akurat
  const stats = useMemo(() => {
    const totalArmada = (units || []).length;
    let assignedCount = 0;
    let barcodeActiveCount = 0;
    let barcodeIssueCount = 0;
    let barcodeBelumAdaCount = 0;

    (units || []).forEach((u) => {
      if (!u) return;
      if (u.operatorName && u.operatorName.trim()) assignedCount++;
      if (isBarcodeIssue(u)) {
        barcodeIssueCount++;
      } else if (isBarcodeActive(u)) {
        barcodeActiveCount++;
      } else {
        barcodeBelumAdaCount++;
      }
    });

    return {
      totalArmada,
      assignedCount,
      unassignedCount: totalArmada - assignedCount,
      barcodeActiveCount,
      barcodeIssueCount,
      barcodeBelumAdaCount,
    };
  }, [units]);

  // Handler Pratinjau Dokumen PDF Resmi
  const handleOpenPdfPreview = () => {
    if (displayedUnits.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada data untuk ditampilkan pada Pratinjau Dokumen PDF.' });
      return;
    }
    try {
      const result = generateOperatorSettingPDF({
        units: displayedUnits,
        allUnits: units,
        currentUser,
        filterInfo: {
          jenisFilter: tableFilterJenis,
          statusFilter: tableFilterStatus,
          barcodeFilter: tableFilterBarcode,
          viewMode,
        },
        signatories: {
          pembuat: operatorSignatories.pembuatName,
          pembuatName: operatorSignatories.pembuatName,
          pembuatJabatan: operatorSignatories.pembuatJabatan,
          diperiksa: operatorSignatories.disetujuiName,
          disetujuiName: operatorSignatories.disetujuiName,
          disetujuiJabatan: operatorSignatories.disetujuiJabatan || 'Kabag Workshop',
          diketahui: operatorSignatories.diketahuiName,
          diketahuiName: operatorSignatories.diketahuiName,
          diketahuiJabatan: operatorSignatories.diketahuiJabatan || 'KTT',
        },
      });
      setPreviewPdfUrl(result.blobUrl);
      setPreviewFilename(result.filename);
      setShowPdfPreview(true);
      setFeedback({
        type: 'success',
        message: '✓ Dokumen Pratinjau PDF Penugasan Operator & Barcode siap diperiksa & dicetak.',
      });
    } catch (e) {
      console.error('Error generating Operator Setting PDF preview:', e);
      setFeedback({ type: 'error', message: 'Gagal membuat pratinjau dokumen PDF.' });
    }
  };

  // Handler Download PDF Langsung
  const handleDownloadPdfDirect = () => {
    if (displayedUnits.length === 0) return;
    try {
      exportOperatorSettingToPDF({
        units: displayedUnits,
        allUnits: units,
        currentUser,
        filterInfo: {
          jenisFilter: tableFilterJenis,
          statusFilter: tableFilterStatus,
          barcodeFilter: tableFilterBarcode,
          viewMode,
        },
        signatories: {
          pembuat: operatorSignatories.pembuatName,
          pembuatName: operatorSignatories.pembuatName,
          pembuatJabatan: operatorSignatories.pembuatJabatan,
          diperiksa: operatorSignatories.disetujuiName,
          disetujuiName: operatorSignatories.disetujuiName,
          disetujuiJabatan: operatorSignatories.disetujuiJabatan || 'Kabag Workshop',
          diketahui: operatorSignatories.diketahuiName,
          diketahuiName: operatorSignatories.diketahuiName,
          diketahuiJabatan: operatorSignatories.diketahuiJabatan || 'KTT',
        },
      });
    } catch (e) {
      console.error('Error downloading Operator Setting PDF:', e);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (displayedUnits.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada data untuk diekspor.' });
      return;
    }

    const headers = [
      'NO',
      'CN_NEW',
      'NAMA ALAT',
      'JENIS',
      'LOKASI',
      'STATUS UNIT',
      'OPERATOR/SOPIR',
      'JABATAN',
      'JOB (PEKERJAAN)',
      'STATUS BARCODE FUEL',
      'REMARK',
      'TERAKHIR UPDATE'
    ];

    const rows = displayedUnits.map((u, i) => [
      i + 1,
      `"${u.cnNew || ''}"`,
      `"${(u.namaAlat || '').replace(/"/g, '""')}"`,
      `"${(u.jenis || '').replace(/"/g, '""')}"`,
      `"${(u.loc || '').replace(/"/g, '""')}"`,
      `"${u.status || ''}"`,
      `"${(u.operatorName || '').replace(/"/g, '""')}"`,
      `"${(u.operatorJabatan || '').replace(/"/g, '""')}"`,
      `"${(u.operatorJob || '').replace(/"/g, '""')}"`,
      `"${u.barcodeFuelStatus || 'BELUM ADA'}"`,
      `"${(u.operatorRemark || '').replace(/"/g, '""')}"`,
      `"${u.operatorUpdatedAt || u.terakhirDiperbarui || ''}"`,
    ]);

    const csvContent = '\uFEFF' +
      `"PT BATU KALI WELANG AMPUH - DAFTAR SETTING OPERATOR & BARCODE FUEL ARMADA"\r\n` +
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Unit: ${displayedUnits.length} Unit | Filter Status: ${tableFilterStatus} | Sort By: ${sortField} (${sortOrder.toUpperCase()})"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Setting_Operator_BKWA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-mono">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-white px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Datalist saran pekerjaan / job */}
      <datalist id="common-operator-jobs">
        {COMMON_JOB_SUGGESTIONS.map((job) => (
          <option key={job} value={job} />
        ))}
      </datalist>

      {/* ======================================================== */}
      {/* 1. FORM INPUT BERTAHAP (CASCADING SETTING OPERATOR)       */}
      {/* Pilih Jenis -> Pilih No Unit -> Pilih Operator & Detail  */}
      {/* ======================================================== */}
      <section
        id="form-input-setting-operator"
        className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Form */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                MODUL 1 • SUB MENU 2
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>FORM SETTING OPERATOR &amp; STATUS BARCODE FUEL</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Alur bertahap: <strong>1. Pilih Jenis Unit</strong> &rarr; <strong>2. Pilih Nomor Unit</strong> &rarr; <strong>3. Tentukan Operator (Reff Modul 2) &amp; Barcode</strong>. Unit yang disetting otomatis masuk ke tabel list di bawah.
            </p>
          </div>

          {selectedUnitId && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isEditingExisting ? (
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Mode: Perbarui Penugasan
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  Mode: Penugasan Baru
                </span>
              )}
              <button
                type="button"
                onClick={handleFullReset}
                className="text-xs font-mono text-stone-400 hover:text-stone-200 underline cursor-pointer px-2"
              >
                Reset Form
              </button>
            </div>
          )}
        </div>

        {/* Form Inputs Flow */}
        <form onSubmit={handleSubmitSetting} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* STEP 1: PILIH JENIS DULU */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-stone-950/70 border border-stone-800">
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span>Pilih Jenis Unit *</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">
                  {uniqueJenisList.length} Jenis Tersedia
                </span>
              </label>

              <select
                id="select-jenis-unit-setting"
                value={selectedJenis}
                onChange={handleJenisChange}
                disabled={!canEdit}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="">-- Pilih Jenis Unit / Alat --</option>
                {uniqueJenisList.map((j) => {
                  const count = (units || []).filter((u) => u && (u.jenis || '').trim().toLowerCase() === j.toLowerCase()).length;
                  return (
                    <option key={j} value={j}>
                      {j} ({count} Unit Armada)
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-stone-400 font-mono">
                Pilih kategori alat terlebih dahulu agar pilihan unit terfilter rapi.
              </p>
            </div>

            {/* STEP 2: BARU PILIH NOMOR UNIT */}
            <div className={`space-y-1.5 p-3 rounded-2xl transition ${
              selectedJenis ? 'bg-stone-950/70 border border-stone-800' : 'bg-stone-950/30 border border-stone-900 opacity-60'
            }`}>
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span>Pilih Nomor Unit (CN New) *</span>
                </span>
                {selectedJenis && (
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {unitsOfSelectedJenis.length} Unit [{selectedJenis}]
                  </span>
                )}
              </label>

              <select
                id="select-nomor-unit-setting"
                value={selectedUnitId}
                onChange={handleUnitSelectChange}
                disabled={!canEdit || !selectedJenis}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-black focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedJenis ? '-- Pilih Nomor Unit (CN New) --' : '-- Pilih Jenis Terlebih Dahulu --'}
                </option>
                {unitsOfSelectedJenis.map((u, uIdx) => {
                  const hasOp = u.operatorName && u.operatorName.trim();
                  return (
                    <option key={`${u.id}_${uIdx}`} value={u.id}>
                      {u.cnNew} - {u.namaAlat} {hasOp ? `✓ [Op: ${u.operatorName}]` : '[Belum Ada Operator]'}
                    </option>
                  );
                })}
              </select>

              {currentSelectedUnit ? (
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-0.5">
                  <span className="truncate max-w-[170px]" title={currentSelectedUnit.namaAlat}>
                    {currentSelectedUnit.namaAlat}
                  </span>
                  <span className="text-amber-400 font-bold shrink-0">
                    {currentSelectedUnit.status || 'Operasi'}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-stone-500 font-mono">
                  Nomor unit muncul berdasarkan jenis yang dipilih pada langkah 1.
                </p>
              )}
            </div>

            {/* STEP 3: NAMA OPERATOR / SOPIR (REFF MODUL 2) */}
            <div className={`space-y-1.5 p-3 rounded-2xl transition ${
              selectedUnitId ? 'bg-stone-950/70 border border-stone-800' : 'bg-stone-950/30 border border-stone-900 opacity-60'
            }`}>
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    3
                  </span>
                  <span>Nama Operator / Sopir</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">Reff Modul 2</span>
              </label>

              <select
                id="select-operator-manpower-setting"
                value={formOperatorName}
                onChange={handleOperatorNameChange}
                disabled={!canEdit || !selectedUnitId}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">-- Kosongkan / Belum Ada Operator --</option>

                {/* Prioritas: Operator & Driver */}
                {operatorAndDrivers.length > 0 && (
                  <optgroup label="── OPERATOR &amp; SOPIR (MODUL 2) ──">
                    {operatorAndDrivers.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan} {m.nik ? `(${m.nik})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Manpower Lainnya */}
                {otherManpower.length > 0 && (
                  <optgroup label="── MANPOWER LAINNYA ──">
                    {otherManpower.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {formOperatorJabatan ? (
                <span className="text-[10px] font-mono text-emerald-400 block pt-0.5">
                  ✓ Jabatan: <strong>{formOperatorJabatan}</strong>
                </span>
              ) : (
                <p className="text-[10px] text-stone-500 font-mono">
                  Personil otomatis tersinkron dari Data Manpower Modul 2.
                </p>
              )}
            </div>

            {/* STEP 4: JOB (TUGAS PEKERJAAN MANUAL) */}
            <div className={`space-y-1.5 p-3 rounded-2xl transition ${
              selectedUnitId ? 'bg-stone-950/70 border border-stone-800' : 'bg-stone-950/30 border border-stone-900 opacity-60'
            }`}>
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    4
                  </span>
                  <span>Job (Tugas Pekerjaan)</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">Ketik Bebas</span>
              </label>

              <input
                type="text"
                list="common-operator-jobs"
                value={formOperatorJob}
                onChange={(e) => setFormOperatorJob(e.target.value)}
                placeholder="Ketik job manual (Hauling, Loading, dll.)..."
                disabled={!canEdit || !selectedUnitId}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed font-sans"
              />

              {/* Quick suggestion pills */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {['Hauling Batu', 'Loading Crusher', 'Stripping OB', 'Disposal'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={!selectedUnitId}
                    onClick={() => setFormOperatorJob(sug)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 hover:text-amber-300 hover:bg-stone-700 font-mono transition cursor-pointer disabled:opacity-40"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 5: STATUS BARCODE FUEL */}
            <div className={`space-y-1.5 p-3 rounded-2xl transition ${
              selectedUnitId ? 'bg-stone-950/70 border border-stone-800' : 'bg-stone-950/30 border border-stone-900 opacity-60'
            }`}>
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    5
                  </span>
                  <span>Status Barcode Fuel</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">BBM Unit</span>
              </label>

              <select
                id="select-barcode-status-setting"
                value={formBarcodeStatus}
                onChange={(e) => setFormBarcodeStatus(e.target.value)}
                disabled={!canEdit || !selectedUnitId}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {BARCODE_FUEL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="pt-0.5">
                {(() => {
                  const opt = BARCODE_FUEL_STATUS_OPTIONS.find((o) => o.value === formBarcodeStatus) || BARCODE_FUEL_STATUS_OPTIONS[3];
                  return (
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${opt.badgeClass}`}>
                      ● Status: {opt.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* STEP 6: REMARK OPERASIONAL */}
            <div className={`space-y-1.5 p-3 rounded-2xl transition ${
              selectedUnitId ? 'bg-stone-950/70 border border-stone-800' : 'bg-stone-950/30 border border-stone-900 opacity-60'
            }`}>
              <label className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">
                    6
                  </span>
                  <span>Remark / Catatan Khusus</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">Opsional</span>
              </label>

              <input
                type="text"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                placeholder="Catatan shift / kondisi khusus..."
                disabled={!canEdit || !selectedUnitId}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed font-sans"
              />
              <p className="text-[10px] text-stone-500 font-mono">
                Catatan operasional khusus yang relevan untuk unit ini.
              </p>
            </div>
          </div>

          {/* Tombol Aksi Submit Form */}
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-stone-800 gap-3">
            <div className="text-xs text-stone-400 font-mono">
              {currentSelectedUnit ? (
                <span>
                  Unit dipilih: <strong className="text-amber-400">{currentSelectedUnit.cnNew}</strong> ({currentSelectedUnit.namaAlat})
                </span>
              ) : (
                <span className="text-stone-500">
                  Silakan lengkapi langkah 1 dan 2 untuk mengaktifkan tombol simpan.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-mono font-bold transition cursor-pointer"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={!canEdit || !selectedUnitId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-xs font-mono font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan &amp; Masukkan ke List</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ======================================================== */}
      {/* 2. LEMBAR PENGESAHAN DOKUMEN CETAK (VALIDASI DATA MANPOWER) */}
      {/* Kolom 1: Dibuat Oleh :                                  */}
      {/* Kolom 2: Di Setujui Oleh : Kabag Workshop               */}
      {/* Kolom 3: diKetahui Oleh : KTT                           */}
      {/* ======================================================== */}
      <section className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section Pengesahan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                LEMBAR PENGESAHAN
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>VALIDASI DOKUMEN LAPORAN (PILIHAN DARI DATA MANPOWER)</span>
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Validasi dokumen ini dibuat manual dengan pemilihan langsung dari <strong>Data Manpower (Modul 2)</strong> untuk tanda tangan cetak PDF.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {signatoriesSavedFeedback && (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/70 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 animate-fade-in">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tersimpan di Browser</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveSignatories}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold border border-stone-700 transition cursor-pointer"
              title="Simpan susunan tanda tangan ke preferensi browser agar tidak hilang saat reload"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Simpan Format</span>
            </button>
          </div>
        </div>

        {/* Grid 3 Kolom Penandatangan Dokumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          
          {/* KOLOM 1: Dibuat Oleh : */}
          <div className="space-y-3 p-4 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-800/80">
              <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                Dibuat Oleh :
              </label>
              <span className="text-[10px] text-stone-500 font-mono">Penyusun</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-stone-400 font-mono uppercase flex items-center justify-between">
                <span>Nama Manpower (Modul 2):</span>
                <span className="text-amber-400/80">Pilihan Manual</span>
              </label>
              <select
                id="select-penandatangan-pembuat"
                value={operatorSignatories.pembuatName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = (manpowerList || []).find((m) => m && m.nama === val);
                  setOperatorSignatories((prev) => ({
                    ...prev,
                    pembuatName: val,
                    pembuatJabatan: matched?.jabatan || prev.pembuatJabatan || 'Admin / Dispatcher',
                  }));
                }}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih dari Data Manpower --</option>
                {currentUser?.fullName && (
                  <option value={currentUser.fullName}>
                    {currentUser.fullName} ({currentUser.username || 'User Login Saat Ini'})
                  </option>
                )}
                <optgroup label="── DATA MANPOWER (MODUL 2) ──">
                  {sortedAllManpower.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — {m.jabatan || 'Staff'} {m.nik ? `(${m.nik})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-stone-400 font-mono uppercase">Jabatan di Dokumen:</label>
              <input
                type="text"
                value={operatorSignatories.pembuatJabatan}
                onChange={(e) =>
                  setOperatorSignatories((prev) => ({ ...prev, pembuatJabatan: e.target.value }))
                }
                placeholder="Admin / Dispatcher"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
            
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>Di Tanda Tangan:</span>
              <span className="text-amber-300 font-bold truncate max-w-[150px]">
                {operatorSignatories.pembuatName || '(Belum dipilih)'}
              </span>
            </div>
          </div>

          {/* KOLOM 2: Di Setujui Oleh : Kabag Workshop */}
          <div className="space-y-3 p-4 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-800/80">
              <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                Di Setujui Oleh : Kabag Workshop
              </label>
              <span className="text-[10px] text-stone-500 font-mono">Pemeriksa</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-stone-400 font-mono uppercase flex items-center justify-between">
                <span>Nama Kabag (Modul 2):</span>
                <span className="text-amber-400/80">Pilihan Manual</span>
              </label>
              <select
                id="select-penandatangan-kabag"
                value={operatorSignatories.disetujuiName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = (manpowerList || []).find((m) => m && m.nama === val);
                  setOperatorSignatories((prev) => ({
                    ...prev,
                    disetujuiName: val,
                    disetujuiJabatan: matched?.jabatan || 'Kabag Workshop',
                  }));
                }}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih dari Data Manpower --</option>
                {kabagCandidates.length > 0 && (
                  <optgroup label="── REKOMENDASI KABAG WORKSHOP ──">
                    {kabagCandidates.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="── SEMUA DATA MANPOWER ──">
                  {sortedAllManpower.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — {m.jabatan || 'Staff'}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-stone-400 font-mono uppercase">Jabatan di Dokumen:</label>
              <input
                type="text"
                value={operatorSignatories.disetujuiJabatan}
                onChange={(e) =>
                  setOperatorSignatories((prev) => ({ ...prev, disetujuiJabatan: e.target.value }))
                }
                placeholder="Kabag Workshop"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>Di Tanda Tangan:</span>
              <span className="text-amber-300 font-bold truncate max-w-[150px]">
                {operatorSignatories.disetujuiName || '(Belum dipilih)'}
              </span>
            </div>
          </div>

          {/* KOLOM 3: diKetahui Oleh : KTT */}
          <div className="space-y-3 p-4 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-800/80">
              <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                diKetahui Oleh : KTT
              </label>
              <span className="text-[10px] text-stone-500 font-mono">Pimpinan</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-stone-400 font-mono uppercase flex items-center justify-between">
                <span>Nama KTT / PM (Modul 2):</span>
                <span className="text-amber-400/80">Pilihan Manual</span>
              </label>
              <select
                id="select-penandatangan-ktt"
                value={operatorSignatories.diketahuiName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = (manpowerList || []).find((m) => m && m.nama === val);
                  setOperatorSignatories((prev) => ({
                    ...prev,
                    diketahuiName: val,
                    diketahuiJabatan: matched?.jabatan || 'KTT',
                  }));
                }}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih dari Data Manpower --</option>
                {kttCandidates.length > 0 && (
                  <optgroup label="── REKOMENDASI KTT / MANAGEMENT ──">
                    {kttCandidates.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} — {m.jabatan}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="── SEMUA DATA MANPOWER ──">
                  {sortedAllManpower.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} — {m.jabatan || 'Staff'}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-stone-400 font-mono uppercase">Jabatan di Dokumen:</label>
              <input
                type="text"
                value={operatorSignatories.diketahuiJabatan}
                onChange={(e) =>
                  setOperatorSignatories((prev) => ({ ...prev, diketahuiJabatan: e.target.value }))
                }
                placeholder="KTT"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>Di Tanda Tangan:</span>
              <span className="text-amber-300 font-bold truncate max-w-[150px]">
                {operatorSignatories.diketahuiName || '(Belum dipilih)'}
              </span>
            </div>
          </div>

        </div>

        {/* Live Signatory Status Indicator */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-stone-400 gap-2 bg-stone-950/40 px-3.5 py-2.5 rounded-xl border border-stone-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-500">Validasi Terpasang:</span>
            <span className="text-stone-300">
              [Dibuat: <strong className="text-amber-400">{operatorSignatories.pembuatName || '-'}</strong>]
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-300">
              [Di Setujui: <strong className="text-amber-400">{operatorSignatories.disetujuiName || '-'}</strong>]
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-300">
              [diKetahui: <strong className="text-amber-400">{operatorSignatories.diketahuiName || '-'}</strong>]
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenPdfPreview}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Hasil pada Print Preview &rarr;</span>
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. TABEL DAFTAR HASIL PENUGASAN OPERATOR & BARCODE      */}
      {/* Menampilkan unit yang telah disetting (atau semua jika dipilih) */}
      {/* ======================================================== */}
      <section
        id="table-operator-assigned-list"
        className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
      >
        {/* Header Tabel & Switch Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black font-mono text-stone-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>DAFTAR UNIT YANG SUDAH DI-SETTING OPERATOR</span>
              </h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {stats.assignedCount} Unit Ditugaskan
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Hanya menampilkan unit armada yang telah disetting penugasannya agar daftar rapi dan efisien.
            </p>
          </div>

          {/* Toggle View Mode & Export */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Toggle Mode: Hanya yang Ditugaskan vs Semua Unit */}
            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setViewMode('ASSIGNED_ONLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'ASSIGNED_ONLY'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Sudah Disetting ({stats.assignedCount})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALL_UNITS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'ALL_UNITS'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Semua Armada ({stats.totalArmada})
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow cursor-pointer"
              title="Export data ke CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPdfPreview}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-xs font-mono font-black transition shadow-lg shadow-amber-500/20 cursor-pointer"
              title="Buka Dokumen Pratinjau PDF Resmi untuk Cetak & Download"
            >
              <Eye className="w-3.5 h-3.5 text-stone-950" />
              <Printer className="w-3.5 h-3.5 text-stone-950" />
              <span>Print Preview</span>
            </button>
          </div>
        </div>

        {/* 5-KARTU STATISTIK RINGKAS INTERAKTIF (KLIK UNTUK QUICK FILTER) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Card 1: Total Armada */}
          <button
            type="button"
            onClick={() => {
              setViewMode('ALL_UNITS');
              setTableFilterBarcode('ALL');
              setTableFilterJenis('ALL');
              setTableFilterStatus('ALL');
            }}
            className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-stone-700 text-left transition cursor-pointer group"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 group-hover:text-stone-300 block">
              TOTAL ARMADA
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-black text-stone-100 group-hover:text-amber-400">
                {stats.totalArmada}
              </span>
              <span className="text-[10px] font-mono text-stone-500">Unit</span>
            </div>
          </button>

          {/* Card 2: Sudah Ada Operator */}
          <button
            type="button"
            onClick={() => {
              setViewMode('ASSIGNED_ONLY');
              setTableFilterBarcode('ALL');
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer group ${
              viewMode === 'ASSIGNED_ONLY' && tableFilterBarcode === 'ALL'
                ? 'bg-amber-500/10 border-amber-500/50'
                : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/30'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 block">
              DITUGASKAN OPERATOR
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-black text-amber-400">
                {stats.assignedCount}
              </span>
              <span className="text-[10px] font-mono text-stone-500">Unit</span>
            </div>
          </button>

          {/* Card 3: Barcode Aktif / Terpasang */}
          <button
            type="button"
            onClick={() => {
              setTableFilterBarcode(tableFilterBarcode === 'TERPASANG' ? 'ALL' : 'TERPASANG');
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer group ${
              tableFilterBarcode === 'TERPASANG'
                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-950/50'
                : 'bg-stone-950/80 border-stone-800 hover:border-emerald-500/30'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
              BARCODE AKTIF / PASANG
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-black text-emerald-400">
                {stats.barcodeActiveCount}
              </span>
              <span className="text-[10px] font-mono text-emerald-500/70">Unit</span>
            </div>
          </button>

          {/* Card 4: Barcode Rusak / Hilang (6 Unit!) */}
          <button
            type="button"
            onClick={() => {
              setTableFilterBarcode(tableFilterBarcode === 'RUSAK_HILANG' ? 'ALL' : 'RUSAK_HILANG');
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer group relative overflow-hidden ${
              tableFilterBarcode === 'RUSAK_HILANG'
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-xl shadow-rose-950/60 ring-2 ring-rose-500/40'
                : 'bg-stone-950/90 border-rose-500/40 hover:border-rose-500 text-stone-200'
            }`}
            title="Klik untuk filter langsung ke 6 unit dengan kendala Barcode Rusak atau Hilang"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-black flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>RUSAK / HILANG</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono font-bold">
                Cek
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-black text-rose-400">
                {stats.barcodeIssueCount}
              </span>
              <span className="text-[10px] font-mono text-rose-400/80 font-bold">Unit</span>
            </div>
          </button>

          {/* Card 5: Belum Ada Barcode */}
          <button
            type="button"
            onClick={() => {
              setTableFilterBarcode(tableFilterBarcode === 'BELUM ADA' ? 'ALL' : 'BELUM ADA');
            }}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer group ${
              tableFilterBarcode === 'BELUM ADA'
                ? 'bg-stone-800 border-stone-600'
                : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 group-hover:text-stone-300 block">
              BELUM ADA BARCODE
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-mono font-black text-stone-300">
                {stats.barcodeBelumAdaCount}
              </span>
              <span className="text-[10px] font-mono text-stone-500">Unit</span>
            </div>
          </button>
        </div>

        {/* Notifikasi Filter Aktif Khusus Barcode Rusak / Hilang */}
        {tableFilterBarcode === 'RUSAK_HILANG' && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-200 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Menampilkan <strong>{displayedUnits.length} Unit</strong> dengan status kendala Barcode BBM (Rusak, Hilang, Pudar, atau Catatan Pinjam / Tanpa Barcode).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTableFilterBarcode('ALL')}
              className="text-[11px] underline text-rose-400 hover:text-white cursor-pointer px-2"
            >
              Reset Filter Barcode
            </button>
          </div>
        )}

        {/* Filter Bar & Sort Controls Tabel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari CN Unit, Nama Alat, Operator, Job, Barcode, Remark..."
              className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Sort By Selector */}
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 font-mono">
              <span className="text-[10px] text-stone-500 uppercase font-bold flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span>Sort By:</span>
              </span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as OperatorSortField)}
                className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value="cnNew" className="bg-stone-900 text-stone-200">No. Unit (CN New)</option>
                <option value="namaAlat" className="bg-stone-900 text-stone-200">Nama Alat</option>
                <option value="jenis" className="bg-stone-900 text-stone-200">Jenis Unit</option>
                <option value="status" className="bg-stone-900 text-stone-200">Status Unit (Registrasi)</option>
                <option value="operatorName" className="bg-stone-900 text-stone-200">Nama Operator</option>
                <option value="operatorJob" className="bg-stone-900 text-stone-200">Job (Pekerjaan)</option>
                <option value="barcodeFuelStatus" className="bg-stone-900 text-stone-200">Status Barcode</option>
                <option value="operatorRemark" className="bg-stone-900 text-stone-200">Remark</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold text-[10px] transition cursor-pointer"
                title={`Urutan: ${sortOrder === 'asc' ? 'Menaik (A-Z)' : 'Menurun (Z-A)'}`}
              >
                {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
              </button>
            </div>

            {/* Filter Jenis Unit */}
            <select
              value={tableFilterJenis}
              onChange={(e) => setTableFilterJenis(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Jenis Unit</option>
              {uniqueJenisList.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            {/* Filter Status Unit dari Data Registrasi Asset */}
            <select
              id="filter-status-unit-registrasi"
              value={tableFilterStatus}
              onChange={(e) => setTableFilterStatus(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer"
              title="Filter unit berdasarkan Status Operasional dari data Registrasi Asset"
            >
              <option value="ALL" className="bg-stone-900 text-stone-200">Semua Status (Registrasi Asset)</option>
              {uniqueStatusList.map((st) => (
                <option key={st} value={st} className="bg-stone-900 text-stone-200">
                  Status: {st}
                </option>
              ))}
            </select>

            {/* Filter Barcode */}
            <select
              value={tableFilterBarcode}
              onChange={(e) => setTableFilterBarcode(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer transition ${
                tableFilterBarcode === 'RUSAK_HILANG'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-stone-900 border-stone-700 text-stone-300'
              }`}
            >
              <option value="ALL" className="bg-stone-900 text-stone-200">Semua Status Barcode BBM</option>
              <option value="RUSAK_HILANG" className="bg-stone-900 text-rose-400 font-bold">
                ⚠️ Rusak &amp; Hilang ({stats.barcodeIssueCount} Unit)
              </option>
              <option value="TERPASANG" className="bg-stone-900 text-emerald-400">
                ✓ Terpasang / Aktif ({stats.barcodeActiveCount} Unit)
              </option>
              <option value="RUSAK" className="bg-stone-900 text-rose-300">
                Rusak Saja
              </option>
              <option value="HILANG" className="bg-stone-900 text-red-300">
                Hilang Saja
              </option>
              <option value="BELUM ADA" className="bg-stone-900 text-stone-400">
                Belum Ada Barcode ({stats.barcodeBelumAdaCount} Unit)
              </option>
            </select>
          </div>
        </div>

        {/* Tabel Data List */}
        <div className="border border-stone-800 rounded-2xl overflow-hidden bg-stone-950/40">
          {displayedUnits.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-stone-800 m-5 rounded-2xl bg-stone-950/40">
              <UserX className="w-12 h-12 text-stone-600 mx-auto mb-2" />
              <h4 className="text-sm font-mono font-bold text-stone-200">
                {viewMode === 'ASSIGNED_ONLY'
                  ? 'Belum Ada Unit yang Di-setting Penugasan Operator'
                  : 'Tidak Ada Unit yang Cocok dengan Pencarian / Filter'}
              </h4>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                {viewMode === 'ASSIGNED_ONLY'
                  ? 'Gunakan form di atas: Pilih Jenis Unit, pilih Nomor Unit, tentukan Operator & Barcode, lalu klik "Simpan & Masukkan ke List".'
                  : 'Ubah kata kunci pencarian atau sesuaikan filter jenis, status, dan barcode.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="px-3.5 py-3.5 w-10 text-center">No</th>
                    {renderSortHeader('No. Unit (CN New)', 'cnNew', 'min-w-[170px]')}
                    {renderSortHeader('Jenis Unit', 'jenis', 'min-w-[130px]')}
                    {renderSortHeader('Status Unit', 'status', 'min-w-[140px]')}
                    {renderSortHeader('Nama Operator / Sopir', 'operatorName', 'min-w-[200px]')}
                    {renderSortHeader('Job (Pekerjaan)', 'operatorJob', 'min-w-[180px]')}
                    {renderSortHeader('Status Barcode Fuel', 'barcodeFuelStatus', 'min-w-[150px]')}
                    {renderSortHeader('Remark', 'operatorRemark', 'min-w-[160px]')}
                    <th className="px-3.5 py-3.5 text-center whitespace-nowrap w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                  {displayedUnits.map((u, idx) => {
                    const isSelectedInForm = selectedUnitId === u.id;
                    const opt = BARCODE_FUEL_STATUS_OPTIONS.find((o) => o.value === u.barcodeFuelStatus) || BARCODE_FUEL_STATUS_OPTIONS[3];

                    return (
                      <tr
                        key={`${u.id}_${idx}`}
                        className={`transition ${
                          isSelectedInForm
                            ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                            : 'hover:bg-stone-800/40'
                        }`}
                      >
                        {/* No */}
                        <td className="px-3.5 py-3 text-center text-stone-500 font-mono">
                          {idx + 1}
                        </td>

                        {/* No. Unit (CN New) */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5 font-bold text-stone-100 text-xs">
                            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-mono text-amber-300 font-black">{u.cnNew}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[160px]" title={u.namaAlat}>
                            {u.namaAlat}
                          </div>
                          <div className="text-[9px] text-stone-500 font-sans flex items-center gap-1 mt-0.5">
                            <span>Loc: {u.loc || '-'}</span>
                          </div>
                        </td>

                        {/* Jenis Unit */}
                        <td className="px-3.5 py-3">
                          <span className="text-stone-200 font-bold block truncate max-w-[130px]" title={u.jenis}>
                            {u.jenis || '-'}
                          </span>
                        </td>

                        {/* Status Unit (dari Registrasi Asset) */}
                        <td className="px-3.5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getAssetStatusBadge(u.status)} font-mono`}>
                            ● {u.status || 'Operasi'}
                          </span>
                        </td>

                        {/* Nama Operator / Sopir */}
                        <td className="px-3.5 py-3">
                          {u.operatorName ? (
                            <div>
                              <strong className="text-stone-100 block text-xs">
                                {u.operatorName}
                              </strong>
                              {u.operatorJabatan && (
                                <span className="text-[10px] text-amber-400/90 font-mono block">
                                  {u.operatorJabatan}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-500 italic text-[10px]">
                              -- Belum Ada Operator --
                            </span>
                          )}
                        </td>

                        {/* Job */}
                        <td className="px-3.5 py-3">
                          {u.operatorJob ? (
                            <span className="text-stone-200 font-semibold block truncate max-w-[180px]" title={u.operatorJob}>
                              {u.operatorJob}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>

                        {/* Status Barcode Fuel */}
                        <td className="px-3.5 py-3">
                          {isBarcodeIssue(u) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{u.barcodeFuelStatus === 'HILANG' ? 'HILANG' : (u.barcodeFuelStatus === 'RUSAK' ? 'RUSAK' : `KENDALA (${u.barcodeFuelStatus || 'RUSAK'})`)}</span>
                            </span>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold border ${opt.badgeClass}`}>
                              ● {opt.label}
                            </span>
                          )}
                        </td>

                        {/* Remark */}
                        <td className="px-3.5 py-3">
                          {u.operatorRemark ? (
                            <span className="text-stone-300 block truncate max-w-[160px]" title={u.operatorRemark}>
                              {u.operatorRemark}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditFromTable(u)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 font-mono text-[10px] font-bold transition cursor-pointer border border-stone-700"
                              title="Edit atau perbarui setting unit ini di form"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>Edit</span>
                            </button>

                            {(u.operatorName || u.operatorJob || u.operatorRemark) && canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAssignment(u)}
                                className="p-1 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-400 transition cursor-pointer border border-stone-700"
                                title="Lepas penugasan operator unit ini"
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* MODAL PRATINJAU DOKUMEN PDF RESMI */}
      <PdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title="PRATINJAU DOKUMEN - SETTING OPERATOR & BARCODE FUEL ARMADA"
        subtitle={`PT BATU KALI WELANG AMPUH • Site Quarry Purwosari • Total ${displayedUnits.length} Unit Armada`}
        pdfBlobUrl={previewPdfUrl}
        filename={previewFilename}
        onDownload={handleDownloadPdfDirect}
        signatoriesSummary={{
          pembuat: `${operatorSignatories.pembuatName || '-'} (${operatorSignatories.pembuatJabatan || 'Admin / Dispatcher'})`,
          diperiksa: `${operatorSignatories.disetujuiName || '-'} (${operatorSignatories.disetujuiJabatan || 'Kabag Workshop'})`,
          diketahui: `${operatorSignatories.diketahuiName || '-'} (${operatorSignatories.diketahuiJabatan || 'KTT'})`,
        }}
      />
    </div>
  );
};
