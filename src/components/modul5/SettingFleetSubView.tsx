import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  P2HRecord, 
  FleetSettingRecord, 
  UserAccount 
} from '../../types';
import { 
  getAllFleetSettings, 
  saveAllFleetSettings, 
  addOrUpdateFleetSetting, 
  deleteFleetSetting, 
  syncFleetFromP2H,
  getAllP2HRecords
} from '../../utils/storage';
import { 
  Truck, 
  Users, 
  MapPin, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Download, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileSpreadsheet, 
  Layers, 
  Compass, 
  Sparkles,
  Info,
  Check,
  ChevronRight,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { TimeInput24Hour } from '../common/TimeInput24Hour';

interface SettingFleetSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  p2hRecords: P2HRecord[];
  currentUser: UserAccount;
}

const LOKASI_KERJA_PRESETS = [
  'Pabrik-Crusher',
  'Tambang -Front Pit',
  'Workshop Quarry',
  'Other - Area Lain',
];

const SHIFT_OPTIONS = ['Shift 1', 'Shift 2', 'Non-Shift'];

export const SettingFleetSubView: React.FC<SettingFleetSubViewProps> = ({
  units,
  manpowerList,
  p2hRecords: propP2HRecords,
  currentUser,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // State Fleet
  const [fleetList, setFleetList] = useState<FleetSettingRecord[]>(() => getAllFleetSettings());

  // Filter states
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterLokasi, setFilterLokasi] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<'ALL' | 'MANUAL' | 'SYNC_P2H'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Manual Input / Edit
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [editingFleetId, setEditingFleetId] = useState<string | null>(null);

  // Modal Sinkronisasi dari P2H
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [syncTargetDate, setSyncTargetDate] = useState<string>(todayStr);
  const [syncTargetShift, setSyncTargetShift] = useState<string>('Shift 1');
  const [syncDefaultLokasi, setSyncDefaultLokasi] = useState<string>('Tambang -Front Pit');
  const [syncResultMsg, setSyncResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Print Preview
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Opsi Mode Pengisian Penugasan Fleet (MANUAL | SYNC | COLLAPSED)
  const [activeEntryMode, setActiveEntryMode] = useState<'MANUAL' | 'SYNC' | 'COLLAPSED'>('MANUAL');
  const [inlineFeedback, setInlineFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State Manual sesuai 8 Spesifikasi Menu Setting Fleet:
  // 1. Tanggal
  // 2. Jam Start Operasi
  // 3. Jam Finish Operasi
  // 4. Jenis (berdasarkan "JENIS" di modul 1)
  // 5. CN_NEW (Pilihan dikelompokkan berdasarkan JENIS)
  // 6. Nama Operator (Dropdown Jabatan Operator dan Sopir saja)
  // 7. Lokasi Kerja
  // 8. Catatan
  const [formData, setFormData] = useState({
    tanggal: todayStr,
    jamStartOperasi: '07:00',
    jamFinishOperasi: '17:00',
    shift: 'Shift 1',
    noUnit: '',
    namaAlat: '',
    jenisAlat: '',
    namaOperator: '',
    operatorJabatan: '',
    lokasiKerja: 'Tambang -Front Pit',
    fleetGroup: 'Fleet Operasi 01',
    statusFleet: 'OPERASI',
    catatan: '',
  });

  const refreshFleetData = () => {
    setFleetList(getAllFleetSettings());
  };

  // 1. JENIS ALAT unik berdasarkan Modul 1 (Registrasi Asset)
  const availableJenisList = useMemo(() => {
    const list = units.map((u) => (u.jenis || '').trim()).filter(Boolean);
    const unique = Array.from(new Set(list));
    if (unique.length === 0) {
      return ['Excavator', 'Dump Truck', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support'];
    }
    return unique.sort();
  }, [units]);

  // 2. CN_NEW (Unit) yang dikelompokkan berdasarkan JENIS terpilih
  const availableUnitsForSelectedJenis = useMemo(() => {
    if (!formData.jenisAlat) return units;
    return units.filter(
      (u) => (u.jenis || '').trim().toLowerCase() === formData.jenisAlat.trim().toLowerCase()
    );
  }, [units, formData.jenisAlat]);

  // 3. Nama Operator (Dropdown) Jabatan: Khusus Operator dan Sopir saja
  const operatorAndSopirList = useMemo(() => {
    const filtered = manpowerList.filter((m) => {
      const j = (m.jabatan || '').toLowerCase();
      return j.includes('operator') || j.includes('sopir') || j.includes('driver');
    });
    // Fallback jika belum ada manpower dengan jabatan operator/sopir di Modul 2
    if (filtered.length > 0) return filtered;
    if (manpowerList.length > 0) return manpowerList;
    return [
      { id: 'demo-op-1', nama: 'Budi Santoso', jabatan: 'OPERATOR EXCA', nik: '', noWa: '', statusKaryawan: 'TETAP', tglMasukKerja: '', keterangan: '', createdAt: '', updatedAt: '' },
      { id: 'demo-op-2', nama: 'Agus Susanto', jabatan: 'OPERATOR LOADER', nik: '', noWa: '', statusKaryawan: 'TETAP', tglMasukKerja: '', keterangan: '', createdAt: '', updatedAt: '' },
      { id: 'demo-op-3', nama: 'Dedi Kurniawan', jabatan: 'SOPIR LOKASI', nik: '', noWa: '', statusKaryawan: 'TETAP', tglMasukKerja: '', keterangan: '', createdAt: '', updatedAt: '' },
      { id: 'demo-op-4', nama: 'Hadi Saputra', jabatan: 'DRIVER FUEL TRUCK', nik: '', noWa: '', statusKaryawan: 'TETAP', tglMasukKerja: '', keterangan: '', createdAt: '', updatedAt: '' },
    ];
  }, [manpowerList]);

  // Handle pilih jenis alat (otomatis reset CN_NEW jika tidak cocok dengan jenis baru)
  const handleSelectJenis = (selectedJenis: string) => {
    setFormData((prev) => {
      const unitMatches = units.find(
        (u) => u.cnNew === prev.noUnit && (u.jenis || '').trim().toLowerCase() === selectedJenis.trim().toLowerCase()
      );
      return {
        ...prev,
        jenisAlat: selectedJenis,
        noUnit: unitMatches ? prev.noUnit : '',
        namaAlat: unitMatches ? prev.namaAlat : '',
      };
    });
  };

  // Handle unit selection in form
  const handleSelectUnit = (cnSelected: string) => {
    const matched = units.find((u) => u.cnNew.toLowerCase().trim() === cnSelected.toLowerCase().trim());
    setFormData((prev) => ({
      ...prev,
      noUnit: cnSelected,
      namaAlat: matched?.namaAlat || cnSelected,
      jenisAlat: matched?.jenis || prev.jenisAlat,
      lokasiKerja: matched?.loc || prev.lokasiKerja || 'Tambang -Front Pit',
    }));
  };

  // Handle operator selection in form (otomatis update jabatan)
  const handleSelectOperator = (namaSelected: string) => {
    const matched = operatorAndSopirList.find((m) => m.nama.toLowerCase().trim() === namaSelected.toLowerCase().trim());
    setFormData((prev) => ({
      ...prev,
      namaOperator: namaSelected,
      operatorJabatan: matched?.jabatan || prev.operatorJabatan || 'OPERATOR',
    }));
  };

  // Open Add Manual Modal
  const handleOpenAddManual = () => {
    setEditingFleetId(null);
    setFormData({
      tanggal: filterDate || todayStr,
      jamStartOperasi: '07:00',
      jamFinishOperasi: '17:00',
      shift: filterShift !== 'ALL' ? filterShift : 'Shift 1',
      noUnit: '',
      namaAlat: '',
      jenisAlat: '',
      namaOperator: '',
      operatorJabatan: '',
      lokasiKerja: 'Tambang -Front Pit',
      fleetGroup: 'Fleet Operasi 01',
      statusFleet: 'OPERASI',
      catatan: '',
    });
    setShowManualModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: FleetSettingRecord) => {
    setEditingFleetId(rec.id);
    setFormData({
      tanggal: rec.tanggal,
      jamStartOperasi: rec.jamStartOperasi || '07:00',
      jamFinishOperasi: rec.jamFinishOperasi || '17:00',
      shift: rec.shift || 'Shift 1',
      noUnit: rec.noUnit,
      namaAlat: rec.namaAlat || '',
      jenisAlat: rec.jenisAlat || '',
      namaOperator: rec.namaOperator,
      operatorJabatan: rec.operatorJabatan || '',
      lokasiKerja: rec.lokasiKerja,
      fleetGroup: rec.fleetGroup || 'Fleet Operasi 01',
      statusFleet: rec.statusFleet || 'OPERASI',
      catatan: rec.catatan || '',
    });
    setShowManualModal(true);
  };

  // Submit Manual Form (Modal)
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noUnit.trim() || !formData.namaOperator.trim()) {
      alert('Harap lengkapi No Unit dan Nama Operator!');
      return;
    }

    const payload = {
      tanggal: formData.tanggal,
      jamStartOperasi: formData.jamStartOperasi || '07:00',
      jamFinishOperasi: formData.jamFinishOperasi || '17:00',
      shift: formData.shift,
      noUnit: formData.noUnit.trim(),
      namaAlat: formData.namaAlat.trim() || formData.noUnit.trim(),
      jenisAlat: formData.jenisAlat.trim() || 'Heavy Equipment',
      namaOperator: formData.namaOperator.trim(),
      operatorJabatan: formData.operatorJabatan.trim(),
      lokasiKerja: formData.lokasiKerja.trim() || 'Tambang -Front Pit',
      fleetGroup: formData.fleetGroup.trim() || 'Fleet Operasi',
      statusFleet: formData.statusFleet,
      catatan: formData.catatan.trim(),
      source: 'MANUAL' as const,
    };

    const res = addOrUpdateFleetSetting(payload, editingFleetId || undefined);
    if (res.success) {
      refreshFleetData();
      setShowManualModal(false);
    } else {
      alert(res.message);
    }
  };

  // Delete fleet item
  const handleDelete = (id: string, noUnit: string) => {
    if (window.confirm(`Yakin ingin menghapus setting fleet untuk unit ${noUnit}?`)) {
      const res = deleteFleetSetting(id);
      if (res.success) {
        refreshFleetData();
      } else {
        alert(res.message);
      }
    }
  };

  // Submit Inline Manual Form (Opsi 1)
  const handleInlineSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noUnit.trim() || !formData.namaOperator.trim()) {
      setInlineFeedback({
        type: 'error',
        message: 'Harap lengkapi No Unit (CN_NEW) dan Nama Operator!',
      });
      return;
    }

    const payload = {
      tanggal: formData.tanggal,
      jamStartOperasi: formData.jamStartOperasi || '07:00',
      jamFinishOperasi: formData.jamFinishOperasi || '17:00',
      shift: formData.shift,
      noUnit: formData.noUnit.trim(),
      namaAlat: formData.namaAlat.trim() || formData.noUnit.trim(),
      jenisAlat: formData.jenisAlat.trim() || 'Heavy Equipment',
      namaOperator: formData.namaOperator.trim(),
      operatorJabatan: formData.operatorJabatan.trim(),
      lokasiKerja: formData.lokasiKerja.trim() || 'Tambang -Front Pit',
      fleetGroup: formData.fleetGroup.trim() || 'Fleet Operasi',
      statusFleet: formData.statusFleet,
      catatan: formData.catatan.trim(),
      source: 'MANUAL' as const,
    };

    const res = addOrUpdateFleetSetting(payload, editingFleetId || undefined);
    if (res.success) {
      refreshFleetData();
      setInlineFeedback({
        type: 'success',
        message: `Setting Fleet unit ${formData.noUnit} (Operator: ${formData.namaOperator}) jam ${payload.jamStartOperasi}-${payload.jamFinishOperasi} di ${formData.lokasiKerja} berhasil disimpan!`,
      });
      // Reset input unit & operator untuk kemudahan penambahan unit berikutnya
      setFormData((prev) => ({
        ...prev,
        noUnit: '',
        namaAlat: '',
        namaOperator: '',
        operatorJabatan: '',
        catatan: '',
      }));
      setEditingFleetId(null);
    } else {
      setInlineFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  // Sync P2H Execution
  const handleExecuteSync = () => {
    setSyncResultMsg(null);
    const res = syncFleetFromP2H(syncTargetDate, syncTargetShift, syncDefaultLokasi);
    if (res.success) {
      setSyncResultMsg({ type: 'success', text: res.message });
      refreshFleetData();
      // Otomatis sinkronkan filter date ke target sync agar user langsung melihat hasilnya
      setFilterDate(syncTargetDate);
    } else {
      setSyncResultMsg({ type: 'error', text: res.message });
    }
  };

  // Available P2H for sync preview
  const previewP2HRecords = useMemo(() => {
    const allP2H = getAllP2HRecords();
    return allP2H.filter((p) => p.tanggal === syncTargetDate);
  }, [syncTargetDate, showSyncModal, activeEntryMode, fleetList]);

  // Filtered Fleet List
  const filteredFleetList = useMemo(() => {
    return fleetList.filter((item) => {
      // Filter Tanggal
      if (filterDate && item.tanggal !== filterDate) return false;
      // Filter Shift
      if (filterShift !== 'ALL' && item.shift !== filterShift) return false;
      // Filter Lokasi
      if (filterLokasi !== 'ALL' && item.lokasiKerja !== filterLokasi) return false;
      // Filter Source
      if (filterSource !== 'ALL' && item.source !== filterSource) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUnit = item.noUnit.toLowerCase().includes(q);
        const matchOperator = item.namaOperator.toLowerCase().includes(q);
        const matchLokasi = item.lokasiKerja.toLowerCase().includes(q);
        const matchAlat = (item.namaAlat || '').toLowerCase().includes(q);
        if (!matchUnit && !matchOperator && !matchLokasi && !matchAlat) return false;
      }
      return true;
    });
  }, [fleetList, filterDate, filterShift, filterLokasi, filterSource, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOnDisplay = filteredFleetList.length;
    const totalUnitOperasi = filteredFleetList.filter((f) => f.statusFleet === 'OPERASI').length;
    const totalUnitBreakdown = filteredFleetList.filter((f) => f.statusFleet === 'BREAKDOWN').length;
    const totalManual = filteredFleetList.filter((f) => f.source === 'MANUAL').length;
    const totalSync = filteredFleetList.filter((f) => f.source === 'SYNC_P2H').length;

    const uniqueLokasi = new Set(filteredFleetList.map((f) => f.lokasiKerja)).size;
    const uniqueOperator = new Set(filteredFleetList.map((f) => f.namaOperator)).size;

    return {
      totalOnDisplay,
      totalUnitOperasi,
      totalUnitBreakdown,
      totalManual,
      totalSync,
      uniqueLokasi,
      uniqueOperator,
    };
  }, [filteredFleetList]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredFleetList.length === 0) {
      alert('Tidak ada data setting fleet untuk diexport.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Jam Start Operasi',
      'Jam Finish Operasi',
      'Shift',
      'Jenis (Modul 1)',
      'CN_NEW (No Unit)',
      'Nama Alat',
      'Nama Operator',
      'Jabatan Operator',
      'Lokasi Kerja',
      'Catatan',
      'Sumber Data',
      'Status',
      'No Reff P2H',
    ];

    const rows = filteredFleetList.map((f, idx) => [
      idx + 1,
      `"${f.tanggal}"`,
      `"${f.jamStartOperasi || '07:00'}"`,
      `"${f.jamFinishOperasi || '17:00'}"`,
      `"${f.shift || 'Shift 1'}"`,
      `"${f.jenisAlat || '-'}"`,
      `"${f.noUnit}"`,
      `"${f.namaAlat || '-'}"`,
      `"${f.namaOperator}"`,
      `"${f.operatorJabatan || '-'}"`,
      `"${f.lokasiKerja}"`,
      `"${f.catatan ? f.catatan.replace(/"/g, '""') : '-'}"`,
      `"${f.source === 'SYNC_P2H' ? 'SINKRONISASI P2H' : 'INPUT MANUAL'}"`,
      `"${f.statusFleet || 'OPERASI'}"`,
      `"${f.p2hNo || '-'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Setting_Fleet_Operasi_${filterDate || 'Semua'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Action Controls */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                    SUB MODUL 2: SETTING FLEET UNIT
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    DIVISI OPERATION
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Alokasi Penjadwalan No Unit, Nama Operator, dan Lokasi Kerja Operasional Tambang • Opsi <strong className="text-amber-400">Input Manual</strong> &amp; <strong className="text-teal-400">Sinkronisasi Otomatis dari P2H</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Manual + Sync P2H + Export */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddManual}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold font-mono shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Manual Fleet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSyncTargetDate(filterDate || todayStr);
                setSyncResultMsg(null);
                setShowSyncModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-stone-100 text-xs font-bold font-mono shadow-lg shadow-teal-600/20 transition active:scale-95 border border-teal-400/40"
              title="Tarik & Sinkronkan data otomatis dari pengisian checklist P2H unit"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronkan dari Data P2H</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-semibold shadow transition active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-semibold shadow transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-800/80">
          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-mono uppercase text-stone-400">Total Unit Terdaftar</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-mono font-black text-amber-400">{metrics.totalOnDisplay}</span>
              <span className="text-[11px] text-stone-500 font-mono">Unit</span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-mono uppercase text-stone-400">Operator Bertugas</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-mono font-black text-blue-400">{metrics.uniqueOperator}</span>
              <span className="text-[11px] text-stone-500 font-mono">Personil</span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-mono uppercase text-stone-400">Sebaran Lokasi</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-mono font-black text-emerald-400">{metrics.uniqueLokasi}</span>
              <span className="text-[11px] text-stone-500 font-mono">Titik Kerja</span>
            </div>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-mono uppercase text-stone-400">Sumber Alokasi</span>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
              <span className="text-amber-400 font-bold">{metrics.totalManual} Manual</span>
              <span className="text-stone-600">•</span>
              <span className="text-teal-400 font-bold">{metrics.totalSync} Sync P2H</span>
            </div>
          </div>
        </div>
      </div>

      {/* OPSI METODE PENGATURAN FLEET: INPUT MANUAL & SINKRONISASI P2H */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2">
                <span>Opsi Metode Penugasan Fleet</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Atur penempatan No Unit, Nama Operator, dan Lokasi Kerja dengan <strong>Form Input Manual</strong> atau <strong>Sinkronisasi dari Data P2H Unit</strong>.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
            <button
              id="btn-opt-manual-fleet"
              type="button"
              onClick={() => {
                setActiveEntryMode('MANUAL');
                setInlineFeedback(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeEntryMode === 'MANUAL'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Opsi 1: Form Input Manual</span>
            </button>

            <button
              id="btn-opt-sync-fleet"
              type="button"
              onClick={() => {
                setActiveEntryMode('SYNC');
                setSyncResultMsg(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeEntryMode === 'SYNC'
                  ? 'bg-teal-500 text-stone-950 shadow-md shadow-teal-500/20 font-black'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Opsi 2: Sinkronkan Data P2H</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEntryMode(activeEntryMode === 'COLLAPSED' ? 'MANUAL' : 'COLLAPSED')}
              className="px-2.5 py-2 rounded-xl text-stone-500 hover:text-stone-300 hover:bg-stone-900 text-xs font-mono transition"
              title={activeEntryMode === 'COLLAPSED' ? 'Buka Panel Form' : 'Sembunyikan Panel Form'}
            >
              {activeEntryMode === 'COLLAPSED' ? 'Buka Form ↓' : 'Sembunyikan ↑'}
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {inlineFeedback && (
          <div
            className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-medium animate-fadeIn ${
              inlineFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/80 border-rose-700 text-rose-200'
            }`}
          >
            {inlineFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{inlineFeedback.message}</span>
            <button
              type="button"
              onClick={() => setInlineFeedback(null)}
              className="text-stone-400 hover:text-stone-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. KONTEN OPSI 1: FORM INPUT MANUAL */}
        {activeEntryMode === 'MANUAL' && (
          <form onSubmit={handleInlineSubmitManual} className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Form Input Manual Setting Penugasan Fleet (8 Menu Revisi)</span>
              </span>
              <span className="text-[11px] font-mono text-stone-500">
                Unit dikelompokkan sesuai JENIS &bull; Operator khusus jabatan Operator &amp; Sopir
              </span>
            </div>

            {/* 1, 2, 3: Tanggal, Jam Start Operasi, Jam Finish Operasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
              {/* 1. Tanggal */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Tanggal <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* 2. Jam Start Operasi */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>2. Jam Start Operasi (24 Jam) <span className="text-rose-400">*</span></span>
                </label>
                <TimeInput24Hour
                  value={formData.jamStartOperasi}
                  onChange={(val) => setFormData({ ...formData, jamStartOperasi: val })}
                  placeholder="07:00"
                />
              </div>

              {/* 3. Jam Finish Operasi */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>3. Jam Finish Operasi (24 Jam) <span className="text-rose-400">*</span></span>
                </label>
                <TimeInput24Hour
                  value={formData.jamFinishOperasi}
                  onChange={(val) => setFormData({ ...formData, jamFinishOperasi: val })}
                  placeholder="17:00"
                />
              </div>
            </div>

            {/* 4 & 5: Jenis (Modul 1) & CN_NEW (dikelompokkan berdasarkan pilihan pada JENIS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
              {/* 4. Jenis (berdasarkan "JENIS" di modul 1) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>4. Jenis (Berdasarkan "JENIS" di Modul 1)</span>
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.jenisAlat}
                  onChange={(e) => handleSelectJenis(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                  {availableJenisList.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
                <p className="text-[10.5px] text-stone-500">
                  Mengelompokkan dan memfilter pilihan CN_NEW di sebelah kanan.
                </p>
              </div>

              {/* 5. CN_NEW (Pilihan di kelompok kan berdasarkan pilihan pada JENIS) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-teal-400" />
                    <span>5. CN_NEW (Dikelompokkan Berdasarkan JENIS)</span>
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.noUnit}
                  onChange={(e) => handleSelectUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">
                    {formData.jenisAlat 
                      ? `-- Pilih CN_NEW (Kelompok: ${formData.jenisAlat}) --` 
                      : '-- Pilih CN_NEW (Dikelompokkan Sesuai JENIS) --'}
                  </option>
                  {formData.jenisAlat ? (
                    availableUnitsForSelectedJenis.length > 0 ? (
                      availableUnitsForSelectedJenis.map((u) => (
                        <option key={u.id} value={u.cnNew}>
                          {u.cnNew} — {u.namaAlat} [{u.jenis}]
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        (Belum ada unit terdaftar di Modul 1 dengan jenis {formData.jenisAlat})
                      </option>
                    )
                  ) : (
                    availableJenisList.map((j) => {
                      const matchUnits = units.filter((u) => (u.jenis || '').trim().toLowerCase() === j.toLowerCase());
                      if (matchUnits.length === 0) return null;
                      return (
                        <optgroup key={j} label={`Kelompok JENIS: ${j}`}>
                          {matchUnits.map((u) => (
                            <option key={u.id} value={u.cnNew}>
                              {u.cnNew} — {u.namaAlat}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Atau ketik CN_NEW manual..."
                    value={formData.noUnit}
                    onChange={(e) => setFormData({ ...formData, noUnit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
                  />
                  {formData.namaAlat && (
                    <span className="text-[10.5px] text-stone-400 truncate max-w-[170px] shrink-0 font-mono">
                      {formData.namaAlat}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 6 & 7: Nama Operator (DropDown Jabatan Operator dan sopir saja) & Lokasi Kerja */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
              {/* 6. Nama Operator (DropDown) Jabatan (Operator dan sopir saja) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>6. Nama Operator (DropDown) Jabatan (Operator dan sopir saja)</span>
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.namaOperator}
                  onChange={(e) => handleSelectOperator(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Operator / Sopir (Modul 2) --</option>
                  {operatorAndSopirList.map((m) => (
                    <option key={m.id || m.nama} value={m.nama}>
                      {m.nama} — [{m.jabatan || 'OPERATOR'}]
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-mono text-stone-400">Jabatan:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10.5px] font-mono font-bold">
                      {formData.operatorJabatan || 'Khusus Operator & Sopir'}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">
                    * Khusus personil jabatan Operator &amp; Sopir
                  </span>
                </div>
              </div>

              {/* 7. Lokasi Kerja */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>7. Lokasi Kerja</span>
                  </span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.lokasiKerja}
                  onChange={(e) => setFormData({ ...formData, lokasiKerja: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-emerald-400 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {LOKASI_KERJA_PRESETS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Atau ketik lokasi kerja spesifik..."
                  value={formData.lokasiKerja}
                  onChange={(e) => setFormData({ ...formData, lokasiKerja: e.target.value })}
                  className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-stone-600"
                />
              </div>
            </div>

            {/* 8. Catatan */}
            <div className="bg-stone-950/70 p-4 rounded-2xl border border-stone-800 space-y-1.5">
              <label className="block text-xs font-mono font-bold text-stone-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>8. Catatan</span>
              </label>
              <textarea
                rows={2}
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                placeholder="Catatan tugas operasional, target ritase, kondisi jalan / front loading, instruksi khusus..."
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500 italic">
                * Sumber data tercatat sebagai "INPUT MANUAL"
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      noUnit: '',
                      namaAlat: '',
                      jenisAlat: '',
                      namaOperator: '',
                      operatorJabatan: '',
                      catatan: '',
                    }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-semibold transition"
                >
                  Reset Form
                </button>
                <button
                  id="btn-simpan-fleet-manual"
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Setting Fleet</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 2. KONTEN OPSI 2: SINKRONKAN DATA P2H */}
        {activeEntryMode === 'SYNC' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Opsi Sinkronisasi Otomatis dari Hasil Checklist P2H Unit</span>
              </span>
              <span className="text-[11px] font-mono text-stone-500">
                Sistem membaca laporan P2H yang diisi operator
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
              <div>
                <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-400" />
                  <span>Target Tanggal P2H:</span>
                </label>
                <input
                  type="date"
                  value={syncTargetDate}
                  onChange={(e) => setSyncTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-mono text-stone-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span>Shift Penugasan:</span>
                </label>
                <select
                  value={syncTargetShift}
                  onChange={(e) => setSyncTargetShift(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Lokasi Penugasan Default:</span>
                </label>
                <select
                  value={syncDefaultLokasi}
                  onChange={(e) => setSyncDefaultLokasi(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {LOKASI_KERJA_PRESETS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview Checklist P2H yang tersedia */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Data P2H Pada Tanggal {syncTargetDate}:</span>
                </span>
                <span className="text-[11px] font-mono text-teal-400 font-bold">
                  {previewP2HRecords.length} Unit Tersedia
                </span>
              </div>

              {previewP2HRecords.length === 0 ? (
                <div className="py-4 text-center text-xs text-stone-500 font-mono">
                  Belum ada checklist P2H yang diisi untuk tanggal {syncTargetDate}.
                  <br />
                  <span className="text-[10px] text-stone-600">
                    (Operator dapat mengisi form checklist di Sub Modul 1: Form P2H Unit terlebih dahulu)
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {previewP2HRecords.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-amber-400">{p.noUnit}</div>
                        <div className="text-[11px] text-stone-300">{p.operatorName}</div>
                        <div className="text-[10px] text-stone-500 font-mono">No. {p.noP2H}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.statusKelayakan === 'LAYAK_OPERASI'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.statusKelayakan === 'LAYAK_OPERASI' ? 'Layak' : 'Rusak'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync execution result message */}
            {syncResultMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono ${
                  syncResultMsg.type === 'success'
                    ? 'bg-teal-950/80 border-teal-700 text-teal-200'
                    : 'bg-rose-950/80 border-rose-700 text-rose-200'
                }`}
              >
                {syncResultMsg.text}
              </div>
            )}

            {/* Sync Action Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500 italic">
                * Sumber data hasil sinkronisasi akan diberi tanda "SINKRONISASI P2H"
              </span>
              <button
                id="btn-jalankan-sync-p2h"
                type="button"
                onClick={handleExecuteSync}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 font-black text-xs shadow-lg shadow-teal-500/20 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>⚡ Jalankan Sinkronisasi dari Data P2H Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. KONTEN COLLAPSED */}
        {activeEntryMode === 'COLLAPSED' && (
          <div className="flex items-center justify-between text-xs text-stone-400 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800">
            <span>Panel pengisian form penugasan disembunyikan. Anda dapat fokus melihat dan mengelola tabel di bawah.</span>
            <button
              type="button"
              onClick={() => setActiveEntryMode('MANUAL')}
              className="text-amber-400 hover:text-amber-300 font-bold underline decoration-dotted"
            >
              Buka Form Input Manual →
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900/80 border border-stone-800/90 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Filter Tanggal */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>Tanggal Kerja:</span>
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Filter Shift */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Shift:</span>
            </label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Shift</option>
              {SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filter Lokasi */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Lokasi Kerja:</span>
            </label>
            <select
              value={filterLokasi}
              onChange={(e) => setFilterLokasi(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Lokasi</option>
              {LOKASI_KERJA_PRESETS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Filter Source (Manual vs Sync) */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-teal-400" />
              <span>Sumber Data:</span>
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Sumber</option>
              <option value="MANUAL">Input Manual</option>
              <option value="SYNC_P2H">Hasil Sinkronisasi P2H</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-stone-400" />
              <span>Pencarian:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Unit / Operator / Lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 pl-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Quick Reset & Total Found */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 text-xs text-stone-400 font-mono">
          <div>
            Menampilkan: <strong className="text-amber-400">{filteredFleetList.length}</strong> penempatan armada pada tanggal <strong className="text-stone-200">{filterDate || 'Semua'}</strong>
          </div>
          {(filterDate !== todayStr || filterShift !== 'ALL' || filterLokasi !== 'ALL' || filterSource !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterDate(todayStr);
                setFilterShift('ALL');
                setFilterLokasi('ALL');
                setFilterSource('ALL');
                setSearchQuery('');
              }}
              className="text-stone-400 hover:text-amber-400 underline decoration-dotted text-[11px]"
            >
              Reset Filter ke Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Main Table: Setting Fleet List */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-200">
              Daftar Penempatan Armada & Operator (Setting Fleet)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            {filteredFleetList.length} Unit Terjadwal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 uppercase font-mono text-[10.5px] border-b border-stone-800">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">Tanggal &amp; Jam Operasi</th>
                <th className="py-3 px-3">Jenis (Modul 1)</th>
                <th className="py-3 px-3">CN_NEW (No Unit)</th>
                <th className="py-3 px-3">Nama Operator &amp; Jabatan</th>
                <th className="py-3 px-3">Lokasi Kerja</th>
                <th className="py-3 px-3">Catatan</th>
                <th className="py-3 px-3 text-center">Sumber</th>
                <th className="py-3 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredFleetList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="w-8 h-8 text-stone-600 stroke-[1.5]" />
                      <span>Belum ada data Setting Fleet untuk kriteria tanggal / filter ini.</span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleOpenAddManual}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition"
                        >
                          + Tambah Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSyncTargetDate(filterDate || todayStr);
                            setShowSyncModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 text-stone-100 font-bold text-xs hover:bg-teal-500 transition"
                        >
                          Sinkronkan dari P2H
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFleetList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-3 text-center text-stone-500 font-mono">{idx + 1}</td>
                    
                    {/* Tanggal & Jam Operasi */}
                    <td className="py-3 px-3 font-mono">
                      <div className="text-stone-200 font-bold">{item.tanggal}</div>
                      <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{item.jamStartOperasi || '07:00'} - {item.jamFinishOperasi || '17:00'}</span>
                      </div>
                    </td>

                    {/* Jenis (Modul 1) */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-stone-800/90 text-stone-300 font-mono font-medium text-[11px] border border-stone-700/60">
                        {item.jenisAlat || 'Alat Berat'}
                      </span>
                    </td>

                    {/* CN_NEW (No Unit) & Nama Alat */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-black text-amber-400 text-sm tracking-wide">
                        {item.noUnit}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate max-w-[170px]">
                        {item.namaAlat || item.noUnit}
                      </div>
                    </td>

                    {/* Operator & Jabatan */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-stone-100">
                        <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{item.namaOperator}</span>
                      </div>
                      <div className="pl-5 mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
                          {item.operatorJabatan || 'OPERATOR'}
                        </span>
                      </div>
                    </td>

                    {/* Lokasi Kerja */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{item.lokasiKerja}</span>
                      </div>
                    </td>

                    {/* Catatan */}
                    <td className="py-3 px-3 text-stone-300 text-[11px] max-w-[200px]" title={item.catatan || ''}>
                      {item.catatan || <span className="text-stone-600">-</span>}
                    </td>

                    {/* Sumber: Manual vs Sync P2H */}
                    <td className="py-3 px-3 text-center">
                      {item.source === 'SYNC_P2H' ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30"
                          title={`Disinkronkan otomatis dari P2H No. ${item.p2hNo || '-'}`}
                        >
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          <span>SYNC P2H</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          MANUAL
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 hover:bg-stone-700 transition"
                          title="Edit Setting Fleet"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.noUnit)}
                          className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-rose-400 hover:bg-stone-700 transition"
                          title="Hapus Setting Fleet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: FORM INPUT / EDIT MANUAL SETTING FLEET */}
      {/* ========================================================= */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingFleetId ? 'Edit Setting Fleet Unit' : 'Input Manual Setting Fleet Unit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* 1, 2, 3: Tanggal, Jam Start Operasi, Jam Finish Operasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
                {/* 1. Tanggal */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Tanggal <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* 2. Jam Start Operasi */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>2. Jam Start Operasi (24 Jam) <span className="text-rose-400">*</span></span>
                  </label>
                  <TimeInput24Hour
                    value={formData.jamStartOperasi}
                    onChange={(val) => setFormData({ ...formData, jamStartOperasi: val })}
                    placeholder="07:00"
                  />
                </div>

                {/* 3. Jam Finish Operasi */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>3. Jam Finish Operasi (24 Jam) <span className="text-rose-400">*</span></span>
                  </label>
                  <TimeInput24Hour
                    value={formData.jamFinishOperasi}
                    onChange={(val) => setFormData({ ...formData, jamFinishOperasi: val })}
                    placeholder="17:00"
                  />
                </div>
              </div>

              {/* 4 & 5: Jenis (Modul 1) & CN_NEW (dikelompokkan sesuai JENIS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
                {/* 4. Jenis (berdasarkan "JENIS" di modul 1) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>4. Jenis (Berdasarkan "JENIS" Modul 1)</span>
                    </span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.jenisAlat}
                    onChange={(e) => handleSelectJenis(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                    {availableJenisList.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                {/* 5. CN_NEW (Pilihan dikelompokkan berdasarkan pilihan pada JENIS) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-teal-400" />
                      <span>5. CN_NEW (Dikelompokkan Sesuai JENIS)</span>
                    </span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.noUnit}
                    onChange={(e) => handleSelectUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">
                      {formData.jenisAlat 
                        ? `-- Pilih CN_NEW (Kelompok: ${formData.jenisAlat}) --` 
                        : '-- Pilih CN_NEW (Dikelompokkan Sesuai JENIS) --'}
                    </option>
                    {formData.jenisAlat ? (
                      availableUnitsForSelectedJenis.length > 0 ? (
                        availableUnitsForSelectedJenis.map((u) => (
                          <option key={u.id} value={u.cnNew}>
                            {u.cnNew} — {u.namaAlat} [{u.jenis}]
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          (Belum ada unit terdaftar di Modul 1 dengan jenis {formData.jenisAlat})
                        </option>
                      )
                    ) : (
                      availableJenisList.map((j) => {
                        const matchUnits = units.filter((u) => (u.jenis || '').trim().toLowerCase() === j.toLowerCase());
                        if (matchUnits.length === 0) return null;
                        return (
                          <optgroup key={j} label={`Kelompok JENIS: ${j}`}>
                            {matchUnits.map((u) => (
                              <option key={u.id} value={u.cnNew}>
                                {u.cnNew} — {u.namaAlat}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    )}
                  </select>
                  <input
                    type="text"
                    placeholder="Atau ketik CN_NEW manual..."
                    value={formData.noUnit}
                    onChange={(e) => setFormData({ ...formData, noUnit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* 6 & 7: Nama Operator (DropDown Jabatan Operator dan sopir saja) & Lokasi Kerja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
                {/* 6. Nama Operator (DropDown) Jabatan (Operator dan sopir saja) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>6. Nama Operator (DropDown) Jabatan (Operator dan sopir saja)</span>
                    </span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.namaOperator}
                    onChange={(e) => handleSelectOperator(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Operator / Sopir (Modul 2) --</option>
                    {operatorAndSopirList.map((m) => (
                      <option key={m.id || m.nama} value={m.nama}>
                        {m.nama} — [{m.jabatan || 'OPERATOR'}]
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-stone-400">Jabatan:</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                        {formData.operatorJabatan || 'Khusus Operator & Sopir'}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-stone-500 font-mono">
                      * Khusus jabatan Operator &amp; Sopir
                    </span>
                  </div>
                </div>

                {/* 7. Lokasi Kerja */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>7. Lokasi Kerja</span>
                    </span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.lokasiKerja}
                    onChange={(e) => setFormData({ ...formData, lokasiKerja: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-emerald-400 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
                  >
                    {LOKASI_KERJA_PRESETS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Atau masukkan lokasi kerja spesifik..."
                    value={formData.lokasiKerja}
                    onChange={(e) => setFormData({ ...formData, lokasiKerja: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 8. Catatan */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-1">
                <label className="block text-[11px] font-mono font-bold text-stone-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>8. Catatan</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Catatan tugas, target ritase, kondisi jalan / front loading, instruksi operasional..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  {editingFleetId ? 'Simpan Perubahan' : 'Simpan Setting Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SINKRONISASI DATA FLEET DARI P2H UNIT */}
      {/* ========================================================= */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-teal-500/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Sinkronkan Setting Fleet dari Data P2H Unit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-stone-300 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-400 font-bold font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SINKRONISASI OTOMATIS DATA OPERASI</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Sistem akan mengambil data pengisian form pemeriksaan P2H harian pada tanggal yang dipilih, lalu memetakan <strong>No Unit</strong>, <strong>Nama Operator</strong>, dan <strong>Kelayakan Unit</strong> ke dalam tabel Setting Fleet secara otomatis.
                </p>
              </div>

              {syncResultMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    syncResultMsg.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                      : 'bg-rose-950/70 border-rose-600 text-rose-300'
                  }`}
                >
                  {syncResultMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  )}
                  <span>{syncResultMsg.text}</span>
                </div>
              )}

              {/* Parameter Sinkronisasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-stone-950/70 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-[10.5px] font-mono uppercase text-stone-400 mb-1">
                    Tanggal P2H:
                  </label>
                  <input
                    type="date"
                    value={syncTargetDate}
                    onChange={(e) => {
                      setSyncTargetDate(e.target.value);
                      setSyncResultMsg(null);
                    }}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs font-mono text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono uppercase text-stone-400 mb-1">
                    Shift Tujuan:
                  </label>
                  <select
                    value={syncTargetShift}
                    onChange={(e) => setSyncTargetShift(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-100"
                  >
                    {SHIFT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono uppercase text-stone-400 mb-1">
                    Default Lokasi:
                  </label>
                  <select
                    value={syncDefaultLokasi}
                    onChange={(e) => setSyncDefaultLokasi(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-100"
                  >
                    {LOKASI_KERJA_PRESETS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview P2H Data Terdeteksi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-stone-300 font-bold">
                    Data P2H Terdeteksi ({previewP2HRecords.length} Laporan):
                  </span>
                  <span className="text-teal-400">
                    {previewP2HRecords.filter((p) => p.statusKelayakan === 'LAYAK_OPERASI').length} Layak Operasi
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-stone-800 rounded-xl divide-y divide-stone-800 bg-stone-950/60">
                  {previewP2HRecords.length === 0 ? (
                    <div className="p-4 text-center text-stone-500 font-mono text-xs">
                      Tidak ada laporan P2H untuk tanggal {syncTargetDate}.
                    </div>
                  ) : (
                    previewP2HRecords.map((p) => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{p.noUnit}</span>
                          <span className="text-stone-400 truncate max-w-[150px]">{p.namaAlat}</span>
                        </div>
                        <div className="text-stone-300 font-medium truncate max-w-[150px]">
                          {p.operatorName}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              p.statusKelayakan === 'LAYAK_OPERASI'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {p.statusKelayakan === 'LAYAK_OPERASI' ? 'LAYAK' : 'RUSAK'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSync}
                  disabled={previewP2HRecords.length === 0}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-stone-100 font-bold text-xs shadow-lg shadow-teal-600/20 transition active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan Sekarang ({previewP2HRecords.length} Unit)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CETAK LAPORAN SETTING FLEET HARIAN */}
      {/* ========================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Print Preview: Laporan Setting Fleet Operasional
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-white text-stone-950 font-sans text-xs">
              {/* Kop Surat Resmi */}
              <div className="border-b-2 border-stone-950 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-wider uppercase">PT. BUKIT KELAM WANA AGUNG</h2>
                  <p className="text-[10px] text-stone-600 font-mono">DIVISI OPERATION • QUARRY PURWOSARI</p>
                  <h3 className="text-sm font-bold text-stone-800 mt-1 uppercase">
                    LAPORAN SETTING FLEET &amp; ALOKASI ARMADA
                  </h3>
                </div>
                <div className="text-right text-[10px] font-mono text-stone-600">
                  <div>Tanggal: <strong>{filterDate || todayStr}</strong></div>
                  <div>Shift: <strong>{filterShift}</strong></div>
                  <div>Waktu Cetak: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* Tabel Cetak */}
              <table className="w-full border-collapse border border-stone-300 text-[10px]">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-300 font-mono font-bold text-stone-800">
                    <th className="border border-stone-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-stone-300 p-1.5">Tanggal</th>
                    <th className="border border-stone-300 p-1.5">Jam Operasi</th>
                    <th className="border border-stone-300 p-1.5">Jenis (Modul 1)</th>
                    <th className="border border-stone-300 p-1.5">CN_NEW (No Unit)</th>
                    <th className="border border-stone-300 p-1.5">Nama Operator</th>
                    <th className="border border-stone-300 p-1.5">Jabatan</th>
                    <th className="border border-stone-300 p-1.5">Lokasi Kerja</th>
                    <th className="border border-stone-300 p-1.5">Catatan</th>
                    <th className="border border-stone-300 p-1.5 text-center">Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleetList.map((f, i) => (
                    <tr key={f.id} className="border-b border-stone-200">
                      <td className="border border-stone-300 p-1.5 text-center font-mono">{i + 1}</td>
                      <td className="border border-stone-300 p-1.5 font-mono">{f.tanggal}</td>
                      <td className="border border-stone-300 p-1.5 font-mono">{f.jamStartOperasi || '07:00'} - {f.jamFinishOperasi || '17:00'}</td>
                      <td className="border border-stone-300 p-1.5">{f.jenisAlat || '-'}</td>
                      <td className="border border-stone-300 p-1.5 font-mono font-bold">{f.noUnit} {f.namaAlat ? `(${f.namaAlat})` : ''}</td>
                      <td className="border border-stone-300 p-1.5 font-bold">{f.namaOperator}</td>
                      <td className="border border-stone-300 p-1.5">{f.operatorJabatan || '-'}</td>
                      <td className="border border-stone-300 p-1.5">{f.lokasiKerja}</td>
                      <td className="border border-stone-300 p-1.5">{f.catatan || '-'}</td>
                      <td className="border border-stone-300 p-1.5 text-center font-mono text-[9px]">
                        {f.source === 'SYNC_P2H' ? 'SYNC P2H' : 'MANUAL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-[10px]">
                <div>
                  <p className="text-stone-600 mb-12">Disiapkan Oleh (Dispatcher/Admin):</p>
                  <p className="font-bold underline uppercase">{currentUser.fullName || currentUser.username}</p>
                </div>
                <div>
                  <p className="text-stone-600 mb-12">Diperiksa Oleh (Pengawas Lapangan):</p>
                  <p className="font-bold underline">___________________________</p>
                </div>
                <div>
                  <p className="text-stone-600 mb-12">Mengetahui (Kabag Operasi):</p>
                  <p className="font-bold underline">___________________________</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 p-4 border-t border-stone-800 bg-stone-950">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-stone-100 font-bold text-xs shadow-lg shadow-blue-600/20 transition active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Dokumen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
