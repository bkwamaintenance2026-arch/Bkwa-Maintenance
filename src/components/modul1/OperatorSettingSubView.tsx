import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  UserAccount,
  BarcodeFuelStatus,
  BARCODE_FUEL_STATUS_OPTIONS 
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
  Tag
} from 'lucide-react';
import { canAccessRegistrationForm } from '../../utils/storage';

interface OperatorSettingSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
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

interface RowState {
  operatorName: string;
  operatorManpowerId: string;
  operatorJabatan: string;
  operatorJob: string;
  barcodeFuelStatus: BarcodeFuelStatus | string;
  operatorRemark: string;
  isDirty: boolean;
  savedRecently: boolean;
}

export const OperatorSettingSubView: React.FC<OperatorSettingSubViewProps> = ({
  units,
  manpowerList,
  currentUser,
  onUpdateOperatorSetting,
}) => {
  const canEdit = canAccessRegistrationForm(currentUser) || currentUser.role === 'ADMIN' || currentUser.accountTier === 'ADMIN';

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [filterBarcode, setFilterBarcode] = useState<string>('ALL');
  const [filterAssignment, setFilterAssignment] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // In-memory edit state per unit id
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    units.forEach((u) => {
      initial[u.id] = {
        operatorName: u.operatorName || '',
        operatorManpowerId: u.operatorManpowerId || '',
        operatorJabatan: u.operatorJabatan || '',
        operatorJob: u.operatorJob || '',
        barcodeFuelStatus: (u.barcodeFuelStatus as BarcodeFuelStatus) || 'BELUM ADA',
        operatorRemark: u.operatorRemark || '',
        isDirty: false,
        savedRecently: false,
      };
    });
    return initial;
  });

  // Keep rowStates in sync if units array props update externally
  React.useEffect(() => {
    setRowStates((prev) => {
      const next = { ...prev };
      units.forEach((u) => {
        if (!next[u.id] || !next[u.id].isDirty) {
          next[u.id] = {
            operatorName: u.operatorName || '',
            operatorManpowerId: u.operatorManpowerId || '',
            operatorJabatan: u.operatorJabatan || '',
            operatorJob: u.operatorJob || '',
            barcodeFuelStatus: (u.barcodeFuelStatus as BarcodeFuelStatus) || 'BELUM ADA',
            operatorRemark: u.operatorRemark || '',
            isDirty: false,
            savedRecently: false,
          };
        }
      });
      return next;
    });
  }, [units]);

  // Daftar manpower dikelompokkan: Operator & Sopir diprioritaskan di atas
  const { operatorAndDrivers, otherManpower } = useMemo(() => {
    const opDrivers: ManpowerData[] = [];
    const others: ManpowerData[] = [];

    manpowerList.forEach((m) => {
      const j = (m.jabatan || '').toUpperCase();
      if (j.includes('OPERATOR') || j.includes('SOPIR') || j.includes('DRIVER')) {
        opDrivers.push(m);
      } else {
        others.push(m);
      }
    });

    const sortFn = (a: ManpowerData, b: ManpowerData) => a.nama.localeCompare(b.nama);
    return {
      operatorAndDrivers: opDrivers.sort(sortFn),
      otherManpower: others.sort(sortFn),
    };
  }, [manpowerList]);

  // Daftar jenis unit unik
  const uniqueJenisList = useMemo(() => {
    const s = new Set<string>();
    units.forEach((u) => {
      if (u.jenis) s.add(u.jenis.trim());
    });
    return Array.from(s).sort();
  }, [units]);

  // Filtered unit list
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const state = rowStates[u.id] || {
        operatorName: u.operatorName || '',
        operatorJob: u.operatorJob || '',
        barcodeFuelStatus: u.barcodeFuelStatus || 'BELUM ADA',
        operatorRemark: u.operatorRemark || '',
      };

      if (filterJenis !== 'ALL' && (u.jenis || '').toLowerCase().trim() !== filterJenis.toLowerCase().trim()) {
        return false;
      }

      if (filterBarcode !== 'ALL' && state.barcodeFuelStatus !== filterBarcode) {
        return false;
      }

      if (filterAssignment === 'ASSIGNED' && !state.operatorName) {
        return false;
      }
      if (filterAssignment === 'UNASSIGNED' && Boolean(state.operatorName)) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const cn = (u.cnNew || '').toLowerCase();
        const nama = (u.namaAlat || '').toLowerCase();
        const jenis = (u.jenis || '').toLowerCase();
        const op = (state.operatorName || '').toLowerCase();
        const job = (state.operatorJob || '').toLowerCase();
        const bc = (state.barcodeFuelStatus || '').toLowerCase();
        const rmk = (state.operatorRemark || '').toLowerCase();

        return (
          cn.includes(q) ||
          nama.includes(q) ||
          jenis.includes(q) ||
          op.includes(q) ||
          job.includes(q) ||
          bc.includes(q) ||
          rmk.includes(q)
        );
      }

      return true;
    });
  }, [units, rowStates, filterJenis, filterBarcode, filterAssignment, searchTerm]);

  // Statistik Unit
  const stats = useMemo(() => {
    const total = units.length;
    let assignedCount = 0;
    let barcodeActiveCount = 0;
    let barcodeIssueCount = 0;

    units.forEach((u) => {
      const state = rowStates[u.id];
      const op = state ? state.operatorName : u.operatorName;
      const bc = state ? state.barcodeFuelStatus : u.barcodeFuelStatus;

      if (op && op.trim()) assignedCount++;
      if (bc === 'TERPASANG' || bc === 'AKTIF') barcodeActiveCount++;
      if (bc === 'RUSAK' || bc === 'HILANG') barcodeIssueCount++;
    });

    const unassignedCount = Math.max(0, total - assignedCount);

    return {
      total,
      assignedCount,
      unassignedCount,
      barcodeActiveCount,
      barcodeIssueCount,
    };
  }, [units, rowStates]);

  // Handler update field per baris
  const handleFieldChange = (unitId: string, field: keyof RowState, value: any) => {
    setRowStates((prev) => {
      const current = prev[unitId] || {
        operatorName: '',
        operatorManpowerId: '',
        operatorJabatan: '',
        operatorJob: '',
        barcodeFuelStatus: 'BELUM ADA',
        operatorRemark: '',
        isDirty: false,
        savedRecently: false,
      };

      const updated = {
        ...current,
        [field]: value,
        isDirty: true,
        savedRecently: false,
      };

      // Jika memilih nama operator, sinkronkan jabatan & manpower ID otomatis dari database Modul 2
      if (field === 'operatorName') {
        const selectedPerson = manpowerList.find(
          (m) => m.nama.toLowerCase().trim() === String(value).toLowerCase().trim()
        );
        updated.operatorManpowerId = selectedPerson?.id || '';
        updated.operatorJabatan = selectedPerson?.jabatan || '';
      }

      return {
        ...prev,
        [unitId]: updated,
      };
    });
  };

  // Handler Simpan 1 Baris
  const handleSaveRow = (unit: AssetUnit) => {
    const state = rowStates[unit.id];
    if (!state) return;

    const res = onUpdateOperatorSetting(unit.id, {
      operatorName: state.operatorName.trim(),
      operatorManpowerId: state.operatorManpowerId,
      operatorJabatan: state.operatorJabatan,
      operatorJob: state.operatorJob.trim(),
      barcodeFuelStatus: state.barcodeFuelStatus,
      operatorRemark: state.operatorRemark.trim(),
    });

    if (res.success) {
      setRowStates((prev) => ({
        ...prev,
        [unit.id]: {
          ...prev[unit.id],
          isDirty: false,
          savedRecently: true,
        },
      }));
      setFeedback({
        type: 'success',
        message: `✓ Pengaturan Operator Unit [${unit.cnNew}] berhasil disimpan!`,
      });
      setTimeout(() => {
        setRowStates((prev) => ({
          ...prev,
          [unit.id]: {
            ...prev[unit.id],
            savedRecently: false,
          },
        }));
      }, 3000);
    } else {
      setFeedback({ type: 'error', message: res.message || 'Gagal menyimpan pengaturan.' });
    }
  };

  // Handler Reset/Kosongkan Baris
  const handleClearRow = (unit: AssetUnit) => {
    if (!window.confirm(`Kosongkan penugasan operator untuk unit [${unit.cnNew}]?`)) return;

    handleFieldChange(unit.id, 'operatorName', '');
    handleFieldChange(unit.id, 'operatorJob', '');
    handleFieldChange(unit.id, 'operatorRemark', '');
  };

  // Handler Simpan Semua Perubahan yang Dirty
  const handleSaveAllDirty = () => {
    const dirtyUnitIds = Object.keys(rowStates).filter((id) => rowStates[id].isDirty);
    if (dirtyUnitIds.length === 0) {
      setFeedback({ type: 'info', message: 'Tidak ada perubahan baru yang perlu disimpan.' });
      return;
    }

    let successCount = 0;
    dirtyUnitIds.forEach((id) => {
      const state = rowStates[id];
      const res = onUpdateOperatorSetting(id, {
        operatorName: state.operatorName.trim(),
        operatorManpowerId: state.operatorManpowerId,
        operatorJabatan: state.operatorJabatan,
        operatorJob: state.operatorJob.trim(),
        barcodeFuelStatus: state.barcodeFuelStatus,
        operatorRemark: state.operatorRemark.trim(),
      });
      if (res.success) successCount++;
    });

    setRowStates((prev) => {
      const next = { ...prev };
      dirtyUnitIds.forEach((id) => {
        next[id] = { ...next[id], isDirty: false, savedRecently: true };
      });
      return next;
    });

    setFeedback({
      type: 'success',
      message: `✓ Berhasil menyimpan pengaturan operator untuk ${successCount} unit armada!`,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredUnits.length === 0) {
      alert('Tidak ada data untuk di-export.');
      return;
    }

    const headers = [
      'NO',
      'CN_NEW',
      'NAMA ALAT',
      'JENIS',
      'NAMA OPERATOR / SOPIR',
      'JABATAN',
      'JOB / PEKERJAAN',
      'STATUS BARCODE FUEL',
      'REMARK',
      'STATUS OPERASIONAL'
    ];

    const rows = filteredUnits.map((u, i) => {
      const state = rowStates[u.id] || {
        operatorName: u.operatorName || '',
        operatorJabatan: u.operatorJabatan || '',
        operatorJob: u.operatorJob || '',
        barcodeFuelStatus: u.barcodeFuelStatus || 'BELUM ADA',
        operatorRemark: u.operatorRemark || '',
      };
      return [
        i + 1,
        `"${u.cnNew || ''}"`,
        `"${(u.namaAlat || '').replace(/"/g, '""')}"`,
        `"${(u.jenis || '').replace(/"/g, '""')}"`,
        `"${(state.operatorName || '').replace(/"/g, '""')}"`,
        `"${(state.operatorJabatan || '').replace(/"/g, '""')}"`,
        `"${(state.operatorJob || '').replace(/"/g, '""')}"`,
        `"${state.barcodeFuelStatus || ''}"`,
        `"${(state.operatorRemark || '').replace(/"/g, '""')}"`,
        `"${u.status || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + 
      `"PT BATU KALI WELANG AMPUH - DAFTAR SETTING OPERATOR & BARCODE FUEL UNIT"\r\n` +
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Unit: ${filteredUnits.length} Armada"\r\n\r\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Setting_Operator_Unit_PT_BKWA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Preview
  const handlePrint = () => {
    window.print();
  };

  const dirtyCount = (Object.values(rowStates) as RowState[]).filter((s) => s.isDirty).length;

  return (
    <div className="space-y-5 animate-fade-in">
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
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-mono">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Datalist untuk autocomplete saran pekerjaan / job */}
      <datalist id="common-operator-jobs">
        {COMMON_JOB_SUGGESTIONS.map((job) => (
          <option key={job} value={job} />
        ))}
      </datalist>

      {/* Header Panel & Metric Cards */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                MODUL 1 • SUB MENU 2
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                Terhubung Database Manpower (Modul 2)
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black font-mono text-stone-100 tracking-wide mt-1.5 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-amber-500" />
              <span>SETTING OPERATOR, DRIVER &amp; BARCODE FUEL UNIT</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-3xl leading-relaxed">
              Atur penugasan Operator/Sopir unit armada tambang (pilihan personil dari database <strong>Data Manpower Modul 2</strong>), isi deskripsi tugas (Job) secara manual, pantau status Barcode BBM unit, dan catat remark khusus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {dirtyCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAllDirty}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 font-mono text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse"
                title="Simpan semua baris yang telah diedit"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Semua ({dirtyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow cursor-pointer"
              title="Export data setting operator ke file CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow cursor-pointer"
              title="Cetak lembar penugasan operator unit"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* 4 Ringkasan Metrik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 border-t border-stone-800/80 mt-5">
          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-stone-400 block mb-1">TOTAL UNIT ARMADA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-stone-100">{stats.total}</span>
              <span className="text-[11px] font-mono text-stone-500">Unit Terdaftar</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-emerald-400 block mb-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span>SUDAH ADA OPERATOR</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-300">{stats.assignedCount}</span>
              <span className="text-[11px] font-mono text-stone-500">
                ({stats.total > 0 ? Math.round((stats.assignedCount / stats.total) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-amber-400 block mb-1 flex items-center gap-1">
              <UserX className="w-3 h-3 text-amber-400" />
              <span>BELUM ADA OPERATOR</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-300">{stats.unassignedCount}</span>
              <span className="text-[11px] font-mono text-stone-500">Unit Standby/Kosong</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono text-sky-400 block mb-1 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-sky-400" />
              <span>BARCODE FUEL TERPASANG</span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-sky-300">{stats.barcodeActiveCount}</span>
              <span className="text-[11px] font-mono text-rose-400 font-bold">
                {stats.barcodeIssueCount > 0 ? `(${stats.barcodeIssueCount} Bermasalah)` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Kontrol Pencarian */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No Unit, Nama Alat, Operator, Job, Barcode, Remark..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Jenis Unit */}
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Jenis Unit</option>
            {uniqueJenisList.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>

          {/* Filter Status Penugasan Operator */}
          <select
            value={filterAssignment}
            onChange={(e) => setFilterAssignment(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Status Penugasan</option>
            <option value="ASSIGNED">Sudah Ada Operator</option>
            <option value="UNASSIGNED">Belum Ada Operator</option>
          </select>

          {/* Filter Status Barcode */}
          <select
            value={filterBarcode}
            onChange={(e) => setFilterBarcode(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Barcode Fuel</option>
            {BARCODE_FUEL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Utama Setting Operator */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredUnits.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-stone-800 m-5 rounded-2xl bg-stone-950/40">
            <UserX className="w-12 h-12 text-stone-600 mx-auto mb-2" />
            <h3 className="text-base font-mono font-bold text-stone-100">Tidak Ada Data Unit yang Cocok</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
              Tidak ditemukan unit dengan kata kunci atau filter saat ini. Ubah kata kunci pencarian atau reset filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3.5 py-3.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[170px]">No. Unit (CN New)</th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[220px]">
                    Nama Operator / Sopir <span className="text-amber-400">*</span>
                  </th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[200px]">
                    Job (Pekerjaan Manual) <span className="text-amber-400">*</span>
                  </th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[160px]">
                    Status Barcode Fuel <span className="text-amber-400">*</span>
                  </th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[180px]">Remark</th>
                  <th className="px-3.5 py-3.5 text-center whitespace-nowrap w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                {filteredUnits.map((u, idx) => {
                  const state = rowStates[u.id] || {
                    operatorName: u.operatorName || '',
                    operatorManpowerId: u.operatorManpowerId || '',
                    operatorJabatan: u.operatorJabatan || '',
                    operatorJob: u.operatorJob || '',
                    barcodeFuelStatus: (u.barcodeFuelStatus as BarcodeFuelStatus) || 'BELUM ADA',
                    operatorRemark: u.operatorRemark || '',
                    isDirty: false,
                    savedRecently: false,
                  };

                  const isRowDirty = state.isDirty;
                  const isSavedRecently = state.savedRecently;

                  return (
                    <tr
                      key={u.id}
                      className={`transition ${
                        isRowDirty
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : isSavedRecently
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'hover:bg-stone-800/40'
                      }`}
                    >
                      {/* 1. No */}
                      <td className="px-3.5 py-3 text-center text-stone-500">
                        {idx + 1}
                      </td>

                      {/* 2. No. Unit (CN New) */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5 font-bold text-stone-100 text-xs">
                          <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-mono text-amber-300 font-black">{u.cnNew}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[160px]" title={u.namaAlat}>
                          {u.namaAlat}
                        </div>
                        <div className="text-[9px] text-stone-500 font-sans flex items-center gap-1.5 mt-0.5">
                          <span>{u.jenis || '-'}</span>
                          <span>•</span>
                          <span className="text-stone-400">{u.status || 'Operasi'}</span>
                        </div>
                      </td>

                      {/* 3. Nama Operator / Sopir (Reff Modul 2) */}
                      <td className="px-3.5 py-3">
                        <select
                          id={`operator-select-${u.id}`}
                          value={state.operatorName}
                          onChange={(e) => handleFieldChange(u.id, 'operatorName', e.target.value)}
                          disabled={!canEdit}
                          className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-60"
                        >
                          <option value="">-- Belum Ada Operator --</option>
                          
                          {/* Group 1: Operator & Sopir */}
                          {operatorAndDrivers.length > 0 && (
                            <optgroup label="── OPERATOR &amp; SOPIR (MODUL 2) ──">
                              {operatorAndDrivers.map((m) => (
                                <option key={m.id} value={m.nama}>
                                  {m.nama} ({m.jabatan})
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {/* Group 2: Manpower Lainnya */}
                          {otherManpower.length > 0 && (
                            <optgroup label="── MANPOWER LAINNYA ──">
                              {otherManpower.map((m) => (
                                <option key={m.id} value={m.nama}>
                                  {m.nama} ({m.jabatan})
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {state.operatorJabatan && (
                          <span className="text-[9.5px] font-mono text-amber-400/80 block mt-1">
                            Jabatan: {state.operatorJabatan}
                          </span>
                        )}
                      </td>

                      {/* 4. Job (Pekerjaan / Tugas Manual) */}
                      <td className="px-3.5 py-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            list="common-operator-jobs"
                            value={state.operatorJob}
                            onChange={(e) => handleFieldChange(u.id, 'operatorJob', e.target.value)}
                            placeholder="Ketik job (cth: Hauling Batu, Loading)..."
                            disabled={!canEdit}
                            className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans disabled:opacity-60"
                          />
                          {/* Quick suggestions pills */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {['Hauling', 'Loading', 'Stripping OB', 'Disposal'].map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => handleFieldChange(u.id, 'operatorJob', sug)}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 hover:text-amber-300 hover:bg-stone-700 font-mono transition"
                              >
                                + {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* 5. Status Barcode Fuel */}
                      <td className="px-3.5 py-3">
                        <select
                          id={`barcode-select-${u.id}`}
                          value={state.barcodeFuelStatus}
                          onChange={(e) => handleFieldChange(u.id, 'barcodeFuelStatus', e.target.value)}
                          disabled={!canEdit}
                          className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-60"
                        >
                          {BARCODE_FUEL_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {/* Status visual badge indicator */}
                        <div className="mt-1">
                          {(() => {
                            const opt = BARCODE_FUEL_STATUS_OPTIONS.find((o) => o.value === state.barcodeFuelStatus) || BARCODE_FUEL_STATUS_OPTIONS[3];
                            return (
                              <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold border ${opt.badgeClass}`}>
                                ● {opt.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 6. Remark */}
                      <td className="px-3.5 py-3">
                        <input
                          type="text"
                          value={state.operatorRemark}
                          onChange={(e) => handleFieldChange(u.id, 'operatorRemark', e.target.value)}
                          placeholder="Catatan / remark unit..."
                          disabled={!canEdit}
                          className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans disabled:opacity-60"
                        />
                        {u.operatorUpdatedAt && (
                          <span className="text-[9px] text-stone-500 font-mono block mt-0.5 truncate max-w-[180px]">
                            Update: {u.operatorUpdatedAt.split('T')[0]} {u.operatorUpdatedBy ? `(${u.operatorUpdatedBy})` : ''}
                          </span>
                        )}
                      </td>

                      {/* 7. Aksi Cepat */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveRow(u)}
                            disabled={!canEdit}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow cursor-pointer disabled:opacity-50 ${
                              isSavedRecently
                                ? 'bg-emerald-600 text-white font-black'
                                : isRowDirty
                                ? 'bg-amber-500 text-stone-950 font-black hover:bg-amber-400 animate-pulse'
                                : 'bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 border border-stone-700'
                            }`}
                            title="Simpan pengaturan unit ini"
                          >
                            {isSavedRecently ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>OK</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Simpan</span>
                              </>
                            )}
                          </button>

                          {(state.operatorName || state.operatorJob || state.operatorRemark) && canEdit && (
                            <button
                              type="button"
                              onClick={() => handleClearRow(u)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-400 border border-stone-700 transition cursor-pointer"
                              title="Kosongkan penugasan operator unit ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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
    </div>
  );
};
