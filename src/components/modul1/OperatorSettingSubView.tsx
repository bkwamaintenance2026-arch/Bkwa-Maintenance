import React, { useState, useMemo, useEffect } from 'react';
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
  Edit3, 
  PlusCircle, 
  Trash2, 
  ArrowRight,
  ListFilter,
  Layers,
  Wrench
} from 'lucide-react';
import { canAccessRegistrationForm, updateUnitOperatorSetting } from '../../utils/storage';

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
  const [tableFilterBarcode, setTableFilterBarcode] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'ASSIGNED_ONLY' | 'ALL_UNITS'>('ASSIGNED_ONLY');

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
  // FILTERED UNITS UNTUK TABEL DI BAWAH
  // ==========================================
  const displayedUnits = useMemo(() => {
    return (units || []).filter((u) => {
      if (!u) return false;

      // Filter berdasarkan Mode: Hanya yang sudah di-setting vs Semua Unit
      const isAssigned = Boolean(
        (u.operatorName && u.operatorName.trim()) ||
        (u.operatorJob && u.operatorJob.trim()) ||
        (u.barcodeFuelStatus && u.barcodeFuelStatus !== 'BELUM ADA') ||
        (u.operatorRemark && u.operatorRemark.trim())
      );

      if (viewMode === 'ASSIGNED_ONLY' && !isAssigned) {
        return false;
      }

      // Filter Jenis Unit pada tabel
      if (tableFilterJenis !== 'ALL' && (u.jenis || '').trim().toLowerCase() !== tableFilterJenis.trim().toLowerCase()) {
        return false;
      }

      // Filter Barcode Status pada tabel
      if (tableFilterBarcode !== 'ALL' && (u.barcodeFuelStatus || 'BELUM ADA') !== tableFilterBarcode) {
        return false;
      }

      // Search keyword filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const cn = (u.cnNew || '').toLowerCase();
        const nama = (u.namaAlat || '').toLowerCase();
        const jenis = (u.jenis || '').toLowerCase();
        const op = (u.operatorName || '').toLowerCase();
        const job = (u.operatorJob || '').toLowerCase();
        const bc = (u.barcodeFuelStatus || '').toLowerCase();
        const rmk = (u.operatorRemark || '').toLowerCase();

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
  }, [units, viewMode, tableFilterJenis, tableFilterBarcode, searchTerm]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const totalArmada = (units || []).length;
    let assignedCount = 0;
    let barcodeActiveCount = 0;

    (units || []).forEach((u) => {
      if (!u) return;
      if (u.operatorName && u.operatorName.trim()) assignedCount++;
      if (u.barcodeFuelStatus === 'TERPASANG' || u.barcodeFuelStatus === 'AKTIF') barcodeActiveCount++;
    });

    return {
      totalArmada,
      assignedCount,
      unassignedCount: totalArmada - assignedCount,
      barcodeActiveCount,
    };
  }, [units]);

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
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Unit: ${displayedUnits.length} Unit"\r\n\r\n` +
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
                {unitsOfSelectedJenis.map((u) => {
                  const hasOp = u.operatorName && u.operatorName.trim();
                  return (
                    <option key={u.id} value={u.id}>
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
      {/* 2. TABEL DAFTAR HASIL PENUGASAN OPERATOR & BARCODE      */}
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
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/40 text-xs font-mono font-bold transition shadow cursor-pointer"
              title="Cetak lembar operator"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filter Bar Tabel */}
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
            {/* Filter Jenis Unit */}
            <select
              value={tableFilterJenis}
              onChange={(e) => setTableFilterJenis(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">Semua Jenis Unit</option>
              {uniqueJenisList.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            {/* Filter Barcode */}
            <select
              value={tableFilterBarcode}
              onChange={(e) => setTableFilterBarcode(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-300 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">Semua Barcode BBM</option>
              {BARCODE_FUEL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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
                  : 'Tidak Ada Unit yang Cocok dengan Pencarian'}
              </h4>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                {viewMode === 'ASSIGNED_ONLY'
                  ? 'Gunakan form di atas: Pilih Jenis Unit, pilih Nomor Unit, tentukan Operator & Barcode, lalu klik "Simpan & Masukkan ke List".'
                  : 'Ubah kata kunci pencarian atau sesuaikan filter jenis/barcode.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="px-3.5 py-3.5 w-10 text-center">No</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[170px]">No. Unit (CN New)</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[130px]">Jenis Unit</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[200px]">Nama Operator / Sopir</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[180px]">Job (Pekerjaan)</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[150px]">Status Barcode Fuel</th>
                    <th className="px-3.5 py-3.5 whitespace-nowrap min-w-[160px]">Remark</th>
                    <th className="px-3.5 py-3.5 text-center whitespace-nowrap w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                  {displayedUnits.map((u, idx) => {
                    const isSelectedInForm = selectedUnitId === u.id;
                    const opt = BARCODE_FUEL_STATUS_OPTIONS.find((o) => o.value === u.barcodeFuelStatus) || BARCODE_FUEL_STATUS_OPTIONS[3];

                    return (
                      <tr
                        key={u.id}
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
                            <span>•</span>
                            <span className="text-stone-400">{u.status || 'Operasi'}</span>
                          </div>
                        </td>

                        {/* Jenis Unit */}
                        <td className="px-3.5 py-3">
                          <span className="text-stone-200 font-bold block truncate max-w-[130px]" title={u.jenis}>
                            {u.jenis || '-'}
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
                          <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold border ${opt.badgeClass}`}>
                            ● {opt.label}
                          </span>
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
    </div>
  );
};
