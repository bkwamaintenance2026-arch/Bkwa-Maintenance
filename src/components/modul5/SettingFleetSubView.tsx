import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  P2HRecord, 
  FleetSettingRecord, 
  UserAccount,
  KategoriRitaseTambang,
  KATEGORI_RITASE_TAMBANG
} from '../../types';
import { 
  getAllFleetSettings, 
  saveAllFleetSettings, 
  addOrUpdateFleetSetting, 
  deleteFleetSetting, 
  syncFleetFromP2H,
  getAllP2HRecords,
  updateFleetRitaseCounter
} from '../../utils/storage';
import { 
  Truck, 
  Users, 
  MapPin, 
  Plus, 
  Minus,
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
  FileText,
  Mountain,
  BarChart3,
  CheckSquare
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
  const [showCheckerPrintModal, setShowCheckerPrintModal] = useState<boolean>(false);

  // Validasi Laporan Manual (diketik sendiri oleh Checker: Nama Checker & Nama Kepala Tehnik Tambang)
  const [validatorChecker, setValidatorChecker] = useState<string>(
    currentUser.fullName || currentUser.username || 'Checker Lapangan'
  );
  const [validatorKTT, setValidatorKTT] = useState<string>('Kepala Tehnik Tambang (KTT)');

  // Quick Tally Modal & Toast
  const [quickTallyTarget, setQuickTallyTarget] = useState<FleetSettingRecord | null>(null);
  const [tallyToast, setTallyToast] = useState<{ message: string; unit: string } | null>(null);
  const [checkerOnlyDumpTruck, setCheckerOnlyDumpTruck] = useState<boolean>(true);

  // Opsi Mode Pengisian Penugasan Fleet (MANUAL | SYNC | COLLAPSED)
  const [activeEntryMode, setActiveEntryMode] = useState<'MANUAL' | 'SYNC' | 'COLLAPSED'>('MANUAL');
  const [inlineFeedback, setInlineFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mode View: 'FLEET' (Alokasi Penugasan Fleet) vs 'CHECKER' (Tally Checker Tambang & Rekap Ritase)
  const [activeViewTab, setActiveViewTab] = useState<'FLEET' | 'CHECKER'>('FLEET');

  // Form State Manual sesuai 8 Spesifikasi Menu Setting Fleet + Fitur Hitung Ritase Checker Tambang:
  // 1. Tanggal
  // 2. Jam Start Operasi
  // 3. Jam Finish Operasi
  // 4. Jenis (berdasarkan "JENIS" di modul 1)
  // 5. CN_NEW (Pilihan dikelompokkan berdasarkan JENIS)
  // 6. Nama Operator (Dropdown Jabatan Operator dan Sopir saja)
  // 7. Lokasi Kerja
  // 8. Catatan
  // + FITUR HITUNG RITASE DUMP TRUCK (CHECKER TAMBANG)
  //   - Batu Baik
  //   - Batu Pecelan
  //   - Imbal Plant
  //   - Imbal Tanah
  //   - Lokasian
  //   - Nama Checker & Catatan Checker
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
    ritaseBatuBaik: 0,
    ritaseBatuPecelan: 0,
    ritaseImbalPlant: 0,
    ritaseImbalTanah: 0,
    ritaseLokasian: 0,
    namaChecker: '',
    catatanChecker: '',
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
      ritaseBatuBaik: 0,
      ritaseBatuPecelan: 0,
      ritaseImbalPlant: 0,
      ritaseImbalTanah: 0,
      ritaseLokasian: 0,
      namaChecker: currentUser.fullName || currentUser.username || '',
      catatanChecker: '',
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
      ritaseBatuBaik: rec.ritaseBatuBaik || 0,
      ritaseBatuPecelan: rec.ritaseBatuPecelan || 0,
      ritaseImbalPlant: rec.ritaseImbalPlant || 0,
      ritaseImbalTanah: rec.ritaseImbalTanah || 0,
      ritaseLokasian: rec.ritaseLokasian || 0,
      namaChecker: rec.namaChecker || currentUser.fullName || currentUser.username || '',
      catatanChecker: rec.catatanChecker || '',
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

    const totalRit = 
      Number(formData.ritaseBatuBaik || 0) +
      Number(formData.ritaseBatuPecelan || 0) +
      Number(formData.ritaseImbalPlant || 0) +
      Number(formData.ritaseImbalTanah || 0) +
      Number(formData.ritaseLokasian || 0);

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
      ritaseBatuBaik: Number(formData.ritaseBatuBaik || 0),
      ritaseBatuPecelan: Number(formData.ritaseBatuPecelan || 0),
      ritaseImbalPlant: Number(formData.ritaseImbalPlant || 0),
      ritaseImbalTanah: Number(formData.ritaseImbalTanah || 0),
      ritaseLokasian: Number(formData.ritaseLokasian || 0),
      totalRitase: totalRit,
      namaChecker: formData.namaChecker.trim(),
      catatanChecker: formData.catatanChecker.trim(),
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

    const totalRit = 
      Number(formData.ritaseBatuBaik || 0) +
      Number(formData.ritaseBatuPecelan || 0) +
      Number(formData.ritaseImbalPlant || 0) +
      Number(formData.ritaseImbalTanah || 0) +
      Number(formData.ritaseLokasian || 0);

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
      ritaseBatuBaik: Number(formData.ritaseBatuBaik || 0),
      ritaseBatuPecelan: Number(formData.ritaseBatuPecelan || 0),
      ritaseImbalPlant: Number(formData.ritaseImbalPlant || 0),
      ritaseImbalTanah: Number(formData.ritaseImbalTanah || 0),
      ritaseLokasian: Number(formData.ritaseLokasian || 0),
      totalRitase: totalRit,
      namaChecker: formData.namaChecker.trim(),
      catatanChecker: formData.catatanChecker.trim(),
      source: 'MANUAL' as const,
    };

    const res = addOrUpdateFleetSetting(payload, editingFleetId || undefined);
    if (res.success) {
      refreshFleetData();
      setInlineFeedback({
        type: 'success',
        message: `Setting Fleet unit ${formData.noUnit} (Operator: ${formData.namaOperator}) jam ${payload.jamStartOperasi}-${payload.jamFinishOperasi} di ${formData.lokasiKerja} berhasil disimpan! ${totalRit > 0 ? `(Total Ritase: ${totalRit} Rit)` : ''}`,
      });
      // Reset input unit & operator untuk kemudahan penambahan unit berikutnya
      setFormData((prev) => ({
        ...prev,
        noUnit: '',
        namaAlat: '',
        namaOperator: '',
        operatorJabatan: '',
        catatan: '',
        ritaseBatuBaik: 0,
        ritaseBatuPecelan: 0,
        ritaseImbalPlant: 0,
        ritaseImbalTanah: 0,
        ritaseLokasian: 0,
        catatanChecker: '',
      }));
      setEditingFleetId(null);
    } else {
      setInlineFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  // Quick increment ritase dari tampilan Checker Tambang
  const handleQuickIncrementRitase = (
    fleetId: string,
    kategoriKey: 'ritaseBatuBaik' | 'ritaseBatuPecelan' | 'ritaseImbalPlant' | 'ritaseImbalTanah' | 'ritaseLokasian',
    delta: number = 1
  ) => {
    const checkerName = currentUser.fullName || currentUser.username || 'Checker Tambang';
    const res = updateFleetRitaseCounter(fleetId, kategoriKey, delta, false, checkerName);
    if (res.success) {
      refreshFleetData();
      if (quickTallyTarget && quickTallyTarget.id === fleetId && res.record) {
        setQuickTallyTarget(res.record);
      }
      const labelMap: Record<string, string> = {
        ritaseBatuBaik: 'Batu Baik',
        ritaseBatuPecelan: 'Batu Pecelan',
        ritaseImbalPlant: 'Imbal Plant',
        ritaseImbalTanah: 'Imbal Tanah',
        ritaseLokasian: 'Lokasian',
      };
      setTallyToast({
        unit: res.record?.noUnit || 'Dump Truck',
        message: `${delta > 0 ? '+' : ''}${delta} Rit ${labelMap[kategoriKey] || 'Ritase'} (Total: ${res.record?.totalRitase || 0} Rit)`,
      });
      setTimeout(() => setTallyToast(null), 2500);
    }
  };

  // Helper cek apakah unit yang dipilih adalah Dump Truck
  const isDumpTruckForm = useMemo(() => {
    const j = (formData.jenisAlat || '').toLowerCase();
    const u = (formData.noUnit || '').toLowerCase();
    const n = (formData.namaAlat || '').toLowerCase();
    return j.includes('dump') || j.includes('dt') || u.startsWith('dt') || n.includes('dump');
  }, [formData.jenisAlat, formData.noUnit, formData.namaAlat]);

  // Render Box Input Ritase dengan Tombol [+] dan [-] serta Direct Number
  const renderCounterBox = (
    title: string,
    subtitle: string,
    textColor: string,
    borderColor: string,
    value: number,
    onChange: (val: number) => void
  ) => (
    <div className={`p-3 rounded-2xl border ${borderColor} bg-stone-900/90 flex flex-col justify-between gap-2 shadow-md hover:border-amber-500/50 transition`}>
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-xs font-mono font-bold ${textColor}`}>{title}</span>
          <p className="text-[10px] text-stone-400 truncate max-w-[150px]">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono font-black text-stone-100">
            {value || 0}
          </span>
          <span className="text-[10px] text-stone-400 font-mono ml-1">Rit</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        {/* Tombol [-] */}
        <button
          type="button"
          onClick={() => onChange(Math.max(0, (value || 0) - 1))}
          disabled={(value || 0) <= 0}
          className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 transition active:scale-95"
          title="Kurangi 1 Rit (-)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Input number langsung */}
        <input
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => {
            const parsed = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
            onChange(parsed);
          }}
          className="w-full text-center px-2 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
        />

        {/* Tombol [+] besar sesuai permintaan user */}
        <button
          type="button"
          onClick={() => onChange((value || 0) + 1)}
          className="flex items-center justify-center p-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-amber-500/20"
          title="Tambah 1 Rit (+)"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Tombol [+5] quick add */}
        <button
          type="button"
          onClick={() => onChange((value || 0) + 5)}
          className="px-2 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-mono font-bold transition active:scale-95"
          title="Tambah 5 Rit (+5)"
        >
          +5
        </button>
      </div>
    </div>
  );

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

  // Metrics Ritase Checker Tambang (Khususnya Dump Truck & Hasil Pekerjaan Tambang)
  const ritaseMetrics = useMemo(() => {
    let totalRitase = 0;
    let totalBatuBaik = 0;
    let totalBatuPecelan = 0;
    let totalImbalPlant = 0;
    let totalImbalTanah = 0;
    let totalLokasian = 0;

    const dumpTrucks = filteredFleetList.filter((f) => {
      const isDT = (f.jenisAlat || '').toLowerCase().includes('dump') || 
                   (f.jenisAlat || '').toLowerCase().includes('dt') ||
                   (f.namaAlat || '').toLowerCase().includes('dump') ||
                   f.noUnit.toLowerCase().startsWith('dt');
      return isDT;
    });

    filteredFleetList.forEach((f) => {
      totalRitase += Number(f.totalRitase || 0);
      totalBatuBaik += Number(f.ritaseBatuBaik || 0);
      totalBatuPecelan += Number(f.ritaseBatuPecelan || 0);
      totalImbalPlant += Number(f.ritaseImbalPlant || 0);
      totalImbalTanah += Number(f.ritaseImbalTanah || 0);
      totalLokasian += Number(f.ritaseLokasian || 0);
    });

    return {
      totalRitase,
      totalBatuBaik,
      totalBatuPecelan,
      totalImbalPlant,
      totalImbalTanah,
      totalLokasian,
      dumpTrucksCount: dumpTrucks.length,
      dumpTrucks,
    };
  }, [filteredFleetList]);

  // Export CSV Setting Fleet & Ritase
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
      'Batu Baik (Rit)',
      'Batu Pecelan (Rit)',
      'Imbal Plant (Rit)',
      'Imbal Tanah (Rit)',
      'Lokasian (Rit)',
      'Total Ritase (Rit)',
      'Nama Checker',
      'Catatan Checker',
      'Catatan Fleet',
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
      f.ritaseBatuBaik || 0,
      f.ritaseBatuPecelan || 0,
      f.ritaseImbalPlant || 0,
      f.ritaseImbalTanah || 0,
      f.ritaseLokasian || 0,
      f.totalRitase || 0,
      `"${f.namaChecker ? f.namaChecker.replace(/"/g, '""') : '-'}"`,
      `"${f.catatanChecker ? f.catatanChecker.replace(/"/g, '""') : '-'}"`,
      `"${f.catatan ? f.catatan.replace(/"/g, '""') : '-'}"`,
      `"${f.source === 'SYNC_P2H' ? 'SINKRONISASI P2H' : 'INPUT MANUAL'}"`,
      `"${f.statusFleet || 'OPERASI'}"`,
      `"${f.p2hNo || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [
      `"PT BATU KALI WELANG AMPUH (ETIKA) - LAPORAN SETTING FLEET & HASIL RITASE CHECKER TAMBANG"`,
      `"Tanggal Filter: ${filterDate || 'Semua Tanggal'} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Armada: ${filteredFleetList.length} | Total Ritase: ${ritaseMetrics.totalRitase} Rit"`,
      '',
      headers.join(','), 
      ...rows.map((r) => r.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Setting_Fleet_Operasi_PT_BATU_KALI_WELANG_AMPUH_ETIKA_${filterDate || 'Semua'}.csv`;
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

      {/* NAVIGATION TABS: SETTING FLEET vs MENU CHECKER TAMBANG */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800/80">
          <button
            id="tab-view-fleet"
            type="button"
            onClick={() => setActiveViewTab('FLEET')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition font-mono ${
              activeViewTab === 'FLEET'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>1. Penugasan Armada (Setting Fleet)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-stone-900 text-stone-300 font-bold border border-stone-800">
              {filteredFleetList.length} Unit
            </span>
          </button>

          <button
            id="tab-view-checker"
            type="button"
            onClick={() => setActiveViewTab('CHECKER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition font-mono ${
              activeViewTab === 'CHECKER'
                ? 'bg-teal-500 text-stone-950 shadow-md font-black shadow-teal-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>2. Menu Checker Tambang (Tally Ritase)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-black border border-teal-500/30">
              {ritaseMetrics.totalRitase} Rit
            </span>
          </button>
        </div>

        {/* View Description */}
        <div className="flex items-center gap-2 px-3 text-xs font-mono">
          {activeViewTab === 'FLEET' ? (
            <span className="text-stone-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Mode Dispatcher / Supervisor: Pengaturan Penempatan &amp; Alokasi Alat</span>
            </span>
          ) : (
            <span className="text-teal-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>Mode Checker Tambang: Tap tombol [+] untuk Tally Ritase Cepat di Lapangan</span>
            </span>
          )}
        </div>
      </div>

      {/* VIEW 1: SETTING FLEET (PENUGASAN ARMADA & OPERATOR) */}
      {activeViewTab === 'FLEET' && (
        <div className="space-y-6 animate-fadeIn">
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
                <span>8. Catatan Tugas Operasional</span>
              </label>
              <textarea
                rows={2}
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                placeholder="Catatan tugas operasional, target ritase, kondisi jalan / front loading, instruksi khusus..."
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
              />
            </div>

            {/* FITUR HITUNG RITASE OLEH CHECKER TAMBANG (KHUSUSNYA DUMP TRUCK) */}
            <div className="bg-stone-950/90 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
                        Fitur Hitung Ritase (Khusus Dump Truck &bull; Checker Tambang)
                      </h4>
                      {isDumpTruckForm && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Dump Truck Terdeteksi
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Kategori muat: <strong>Batu Baik</strong>, <strong>Batu Pecelan</strong>, <strong>Imbal Plant</strong>, <strong>Imbal Tanah</strong>, dan <strong>Lokasian</strong>. Gunakan tombol <strong className="text-amber-400 font-mono">[+]</strong> di sampingnya untuk memasukkan jumlah ritase.
                    </p>
                  </div>
                </div>

                {/* Total Ritase Summary Badge */}
                <div className="flex items-center gap-2.5 bg-stone-900 px-3.5 py-2 rounded-xl border border-stone-800 shrink-0 self-start sm:self-auto">
                  <span className="text-[11px] font-mono uppercase text-stone-400">Total Akumulasi:</span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    {(Number(formData.ritaseBatuBaik || 0) +
                      Number(formData.ritaseBatuPecelan || 0) +
                      Number(formData.ritaseImbalPlant || 0) +
                      Number(formData.ritaseImbalTanah || 0) +
                      Number(formData.ritaseLokasian || 0))} Rit
                  </span>
                </div>
              </div>

              {/* 5 Kategori Muat dengan Tombol [+] dan [-] serta Direct Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Batu Baik */}
                {renderCounterBox(
                  '1. Batu Baik',
                  'Batu Belah Standar / Berkualitas',
                  'text-amber-400',
                  'border-amber-500/30',
                  formData.ritaseBatuBaik,
                  (val) => setFormData({ ...formData, ritaseBatuBaik: val })
                )}

                {/* 2. Batu Pecelan */}
                {renderCounterBox(
                  '2. Batu Pecelan',
                  'Batu Pecelan / Reject Crusher',
                  'text-orange-400',
                  'border-orange-500/30',
                  formData.ritaseBatuPecelan,
                  (val) => setFormData({ ...formData, ritaseBatuPecelan: val })
                )}

                {/* 3. Imbal Plant */}
                {renderCounterBox(
                  '3. Imbal Plant',
                  'Material Imbal ke Plant Crusher',
                  'text-teal-400',
                  'border-teal-500/30',
                  formData.ritaseImbalPlant,
                  (val) => setFormData({ ...formData, ritaseImbalPlant: val })
                )}

                {/* 4. Imbal Tanah */}
                {renderCounterBox(
                  '4. Imbal Tanah',
                  'Overburden / Kupasan Tanah',
                  'text-emerald-400',
                  'border-emerald-500/30',
                  formData.ritaseImbalTanah,
                  (val) => setFormData({ ...formData, ritaseImbalTanah: val })
                )}

                {/* 5. Lokasian */}
                {renderCounterBox(
                  '5. Lokasian',
                  'Pekerjaan Angkut Lokasian Quarry',
                  'text-purple-400',
                  'border-purple-500/30',
                  formData.ritaseLokasian,
                  (val) => setFormData({ ...formData, ritaseLokasian: val })
                )}
              </div>

              {/* Checker Tambang Identity & Catatan Checker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-800/80">
                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-teal-400" />
                    <span>Petugas Checker Tambang:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Checker Tambang bertugas (contoh: Pos Front Pit)..."
                    value={formData.namaChecker}
                    onChange={(e) => setFormData({ ...formData, namaChecker: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>Catatan Checker Tambang:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Kondisi loading, antrian ritase, material basah/kering, dll..."
                    value={formData.catatanChecker}
                    onChange={(e) => setFormData({ ...formData, catatanChecker: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
                  />
                </div>
              </div>
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
                <th className="py-3 px-3">Ritase (Checker Tambang)</th>
                <th className="py-3 px-3">Catatan</th>
                <th className="py-3 px-3 text-center">Sumber</th>
                <th className="py-3 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredFleetList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500 font-mono">
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
                filteredFleetList.map((item, idx) => {
                  const isDT = (item.jenisAlat || '').toLowerCase().includes('dump') || 
                               (item.jenisAlat || '').toLowerCase().includes('dt') ||
                               (item.namaAlat || '').toLowerCase().includes('dump') ||
                               item.noUnit.toLowerCase().startsWith('dt');
                  const totalRit = item.totalRitase || 0;

                  return (
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

                      {/* Ritase (Checker Tambang) */}
                      <td className="py-3 px-3">
                        {isDT || totalRit > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                  totalRit > 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-stone-800/80 text-stone-400 border border-stone-700/60'
                                }`}
                              >
                                {totalRit} Rit
                              </span>
                              <button
                                type="button"
                                onClick={() => setQuickTallyTarget(item)}
                                className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-teal-400 hover:text-teal-300 font-mono text-[10.5px] font-bold border border-stone-700 transition active:scale-95 flex items-center gap-1 shadow-sm"
                                title="Tally Ritase Cepat (+)"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Rit</span>
                              </button>
                            </div>
                            {totalRit > 0 && (
                              <div className="text-[9.5px] font-mono text-stone-400 flex flex-wrap gap-1 max-w-[200px]">
                                {item.ritaseBatuBaik ? <span className="text-amber-400">Baik:{item.ritaseBatuBaik}</span> : null}
                                {item.ritaseBatuPecelan ? <span className="text-orange-400">Pcl:{item.ritaseBatuPecelan}</span> : null}
                                {item.ritaseImbalPlant ? <span className="text-teal-400">Plt:{item.ritaseImbalPlant}</span> : null}
                                {item.ritaseImbalTanah ? <span className="text-emerald-400">Tnh:{item.ritaseImbalTanah}</span> : null}
                                {item.ritaseLokasian ? <span className="text-purple-400">Lok:{item.ritaseLokasian}</span> : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-600 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Catatan */}
                      <td className="py-3 px-3 text-stone-300 text-[11px] max-w-[180px]" title={item.catatan || ''}>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* ========================================================= */}
  {/* VIEW 2: MENU CHECKER TAMBANG (HITUNG & MONITORING RITASE PEKERJAAN) */}
  {/* ========================================================= */}
  {activeViewTab === 'CHECKER' && (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner Khusus Pos Checker Tambang */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-teal-950/60 border border-teal-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 shadow-md shadow-teal-500/10">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase">
                    POS CHECKER TAMBANG &bull; MONITORING RITASE
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse">
                    LIVE TALLY
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Menu penginputan ritase armada Dump Truck di lapangan &bull; Tap tombol <strong className="text-amber-400 font-mono">[+]</strong> untuk mencatat ritase muatan per kategori secara instan.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons checker */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCheckerPrintModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-stone-100 text-xs font-bold font-mono shadow-lg shadow-teal-600/20 transition active:scale-95 border border-teal-400/40"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Ritase Checker</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddManual}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold font-mono shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Setting DT Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Pos Checker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-stone-800/80">
          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>Tanggal Kerja:</span>
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-stone-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Shift Operasi:</span>
            </label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">Semua Shift</option>
              {SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Pos / Lokasi Loading:</span>
            </label>
            <select
              value={filterLokasi}
              onChange={(e) => setFilterLokasi(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-emerald-400 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Titik Loading</option>
              {LOKASI_KERJA_PRESETS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* RITASE KPI DASHBOARD: 5 KATEGORI MUAT */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Ritase */}
        <div className="bg-gradient-to-br from-amber-500/20 via-stone-900 to-stone-950 p-4 rounded-2xl border-2 border-amber-500/40 shadow-xl">
          <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">TOTAL RITASE HARI INI</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400">
              {ritaseMetrics.totalRitase}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block">
            {filteredFleetList.length} Dump Truck
          </span>
        </div>

        {/* 1. Batu Baik */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-amber-500/30">
          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">1. BATU BAIK</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-mono font-black text-stone-100">
              {ritaseMetrics.totalBatuBaik}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
            Batu Berkualitas
          </span>
        </div>

        {/* 2. Batu Pecelan */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-orange-500/30">
          <span className="text-[10px] font-mono uppercase text-orange-400 font-bold block">2. BATU PECELAN</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-mono font-black text-stone-100">
              {ritaseMetrics.totalBatuPecelan}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
            Reject / Pecelan
          </span>
        </div>

        {/* 3. Imbal Plant */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-teal-500/30">
          <span className="text-[10px] font-mono uppercase text-teal-400 font-bold block">3. IMBAL PLANT</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-mono font-black text-stone-100">
              {ritaseMetrics.totalImbalPlant}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
            Stock ke Crusher
          </span>
        </div>

        {/* 4. Imbal Tanah */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-emerald-500/30">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">4. IMBAL TANAH</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-mono font-black text-stone-100">
              {ritaseMetrics.totalImbalTanah}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
            Overburden / Tanah
          </span>
        </div>

        {/* 5. Lokasian */}
        <div className="bg-stone-900/90 p-4 rounded-2xl border border-purple-500/30">
          <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">5. LOKASIAN</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-mono font-black text-stone-100">
              {ritaseMetrics.totalLokasian}
            </span>
            <span className="text-xs font-mono text-stone-400">Rit</span>
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-1 block truncate">
            Angkut Quarry
          </span>
        </div>
      </div>

      {/* SECTION 1: KARTU TALLY INSTAN LAPANGAN UNTUK SETIAP DUMP TRUCK */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2">
              <span>Kartu Tally Lapangan Dump Truck (Tombol Cepat [+])</span>
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Tap tombol <strong className="text-amber-400 font-mono">[+]</strong> untuk menambahkan 1 ritase secara langsung saat unit melintas pos checker.
          </p>
        </div>

        {filteredFleetList.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center text-stone-500 space-y-3">
            <Truck className="w-10 h-10 mx-auto text-stone-600" />
            <p className="text-sm font-medium">Belum ada unit Dump Truck yang terdaftar untuk filter ini.</p>
            <button
              type="button"
              onClick={handleOpenAddManual}
              className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
            >
              + Input Manual Setting Fleet Unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFleetList.map((dt) => {
              const totalDtRit = (dt.ritaseBatuBaik || 0) +
                (dt.ritaseBatuPecelan || 0) +
                (dt.ritaseImbalPlant || 0) +
                (dt.ritaseImbalTanah || 0) +
                (dt.ritaseLokasian || 0);

              return (
                <div
                  key={dt.id}
                  className="bg-stone-900 border border-stone-800 hover:border-teal-500/40 rounded-3xl p-4 sm:p-5 shadow-xl transition space-y-3.5 flex flex-col justify-between"
                >
                  {/* Card Header: Unit & Total Rit */}
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black font-mono text-amber-400 tracking-wide">
                              {dt.noUnit}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-300 border border-stone-700">
                              {dt.jenisAlat || 'Dump Truck'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 truncate max-w-[170px]">
                            {dt.namaAlat || 'Hino 500'}
                          </p>
                        </div>
                      </div>

                      {/* Badge Total Rit */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-stone-500 block">TOTAL RIT</span>
                        <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-lg inline-block">
                          {totalDtRit} <span className="text-xs font-normal text-amber-400">Rit</span>
                        </div>
                      </div>
                    </div>

                    {/* Driver & Location info */}
                    <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
                      <div className="bg-stone-950/70 p-2 rounded-xl border border-stone-800">
                        <span className="text-[9.5px] font-mono uppercase text-stone-500 block">Sopir / Operator</span>
                        <span className="font-bold text-stone-200 block truncate mt-0.5">{dt.namaOperator}</span>
                      </div>
                      <div className="bg-stone-950/70 p-2 rounded-xl border border-stone-800">
                        <span className="text-[9.5px] font-mono uppercase text-stone-500 block">Lokasi Kerja</span>
                        <span className="font-bold text-emerald-400 block truncate mt-0.5">{dt.lokasiKerja}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5 Row Tally Counters */}
                  <div className="space-y-2 bg-stone-950/90 p-3 rounded-2xl border border-stone-800/90">
                    {/* 1. Batu Baik */}
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="truncate">
                        <span className="text-[11px] font-mono font-bold text-amber-400 block truncate">1. Batu Baik</span>
                        <span className="text-[9px] text-stone-500 block">Batu Belah</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-black text-stone-100 text-sm w-7 text-center">
                          {dt.ritaseBatuBaik || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseBatuBaik', -1)}
                          disabled={(dt.ritaseBatuBaik || 0) <= 0}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-400 flex items-center justify-center font-bold text-xs"
                          title="Kurangi 1 rit"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseBatuBaik', 1)}
                          className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-mono text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition"
                          title="Tambah 1 rit Batu Baik"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+1</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Batu Pecelan */}
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="truncate">
                        <span className="text-[11px] font-mono font-bold text-orange-400 block truncate">2. Pecelan</span>
                        <span className="text-[9px] text-stone-500 block">Reject</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-black text-stone-100 text-sm w-7 text-center">
                          {dt.ritaseBatuPecelan || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseBatuPecelan', -1)}
                          disabled={(dt.ritaseBatuPecelan || 0) <= 0}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-400 flex items-center justify-center font-bold text-xs"
                          title="Kurangi 1 rit"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseBatuPecelan', 1)}
                          className="h-7 px-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-stone-950 font-black font-mono text-xs flex items-center gap-1 shadow-md shadow-orange-500/20 active:scale-95 transition"
                          title="Tambah 1 rit Pecelan"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+1</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Imbal Plant */}
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="truncate">
                        <span className="text-[11px] font-mono font-bold text-teal-400 block truncate">3. Imbal Plant</span>
                        <span className="text-[9px] text-stone-500 block">Crusher</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-black text-stone-100 text-sm w-7 text-center">
                          {dt.ritaseImbalPlant || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseImbalPlant', -1)}
                          disabled={(dt.ritaseImbalPlant || 0) <= 0}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-400 flex items-center justify-center font-bold text-xs"
                          title="Kurangi 1 rit"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseImbalPlant', 1)}
                          className="h-7 px-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-stone-950 font-black font-mono text-xs flex items-center gap-1 shadow-md shadow-teal-500/20 active:scale-95 transition"
                          title="Tambah 1 rit Imbal Plant"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+1</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. Imbal Tanah */}
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="truncate">
                        <span className="text-[11px] font-mono font-bold text-emerald-400 block truncate">4. Imbal Tanah</span>
                        <span className="text-[9px] text-stone-500 block">Overburden</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-black text-stone-100 text-sm w-7 text-center">
                          {dt.ritaseImbalTanah || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseImbalTanah', -1)}
                          disabled={(dt.ritaseImbalTanah || 0) <= 0}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-400 flex items-center justify-center font-bold text-xs"
                          title="Kurangi 1 rit"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseImbalTanah', 1)}
                          className="h-7 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black font-mono text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                          title="Tambah 1 rit Imbal Tanah"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+1</span>
                        </button>
                      </div>
                    </div>

                    {/* 5. Lokasian */}
                    <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-stone-900 border border-stone-800">
                      <div className="truncate">
                        <span className="text-[11px] font-mono font-bold text-purple-400 block truncate">5. Lokasian</span>
                        <span className="text-[9px] text-stone-500 block">Quarry</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-black text-stone-100 text-sm w-7 text-center">
                          {dt.ritaseLokasian || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseLokasian', -1)}
                          disabled={(dt.ritaseLokasian || 0) <= 0}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-400 flex items-center justify-center font-bold text-xs"
                          title="Kurangi 1 rit"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementRitase(dt.id, 'ritaseLokasian', 1)}
                          className="h-7 px-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-stone-950 font-black font-mono text-xs flex items-center gap-1 shadow-md shadow-purple-500/20 active:scale-95 transition"
                          title="Tambah 1 rit Lokasian"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+1</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card: Catatan & Tombol Modal */}
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-stone-400 truncate max-w-[170px]" title={dt.catatanChecker || dt.catatan || ''}>
                      {dt.catatanChecker ? `📝 ${dt.catatanChecker}` : (dt.catatan || 'Tanpa catatan')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dt)}
                      className="text-[10.5px] font-mono font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0"
                    >
                      Edit Form Lengkap &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TABEL REKAPITULASI HASIL PEKERJAAN CHECKER TAMBANG */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-mono font-bold uppercase text-stone-100">
              Tabel Rekapitulasi Ritase Tambang (Hasil Kerja Lapangan)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span>Checker: <strong className="text-teal-400">{currentUser.fullName || currentUser.username || 'Checker'}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-[11px] font-mono uppercase text-stone-400 bg-stone-950/60">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3">No Unit (CN_NEW)</th>
                <th className="py-3 px-3">Nama Sopir</th>
                <th className="py-3 px-3">Lokasi Kerja</th>
                <th className="py-3 px-3 text-right text-amber-400">Batu Baik</th>
                <th className="py-3 px-3 text-right text-orange-400">Pecelan</th>
                <th className="py-3 px-3 text-right text-teal-400">Imbal Plant</th>
                <th className="py-3 px-3 text-right text-emerald-400">Imbal Tanah</th>
                <th className="py-3 px-3 text-right text-purple-400">Lokasian</th>
                <th className="py-3 px-3 text-right text-amber-400 font-bold">Total Rit</th>
                <th className="py-3 px-3">Catatan Checker</th>
                <th className="py-3 px-3 text-center">Aksi Tally</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredFleetList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-stone-500 font-mono">
                    Tidak ada data ritase untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredFleetList.map((dt, idx) => {
                  const totalDtRit = (dt.ritaseBatuBaik || 0) +
                    (dt.ritaseBatuPecelan || 0) +
                    (dt.ritaseImbalPlant || 0) +
                    (dt.ritaseImbalTanah || 0) +
                    (dt.ritaseLokasian || 0);

                  return (
                    <tr key={dt.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3 text-center font-mono text-stone-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-black text-amber-400 block">{dt.noUnit}</span>
                        <span className="text-[10px] text-stone-500">{dt.namaAlat || 'Dump Truck'}</span>
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-200">{dt.namaOperator}</td>
                      <td className="py-3 px-3 text-emerald-400">{dt.lokasiKerja}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">{dt.ritaseBatuBaik || 0}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-orange-300">{dt.ritaseBatuPecelan || 0}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-300">{dt.ritaseImbalPlant || 0}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-300">{dt.ritaseImbalTanah || 0}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-purple-300">{dt.ritaseLokasian || 0}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {totalDtRit} Rit
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-400 text-[11px] max-w-[160px] truncate" title={dt.catatanChecker || dt.catatan || ''}>
                        {dt.catatanChecker || dt.catatan || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setQuickTallyTarget(dt)}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-stone-100 font-mono text-[11px] font-bold shadow transition active:scale-95 inline-flex items-center gap-1"
                          title="Buka Popup Tally Cepat (+)"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Tally (+)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredFleetList.length > 0 && (
              <tfoot>
                <tr className="bg-stone-950 font-mono font-bold border-t-2 border-stone-800 text-stone-200">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-stone-400">
                    TOTAL HASIL RITASE:
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400">{ritaseMetrics.totalBatuBaik}</td>
                  <td className="py-3 px-3 text-right text-orange-400">{ritaseMetrics.totalBatuPecelan}</td>
                  <td className="py-3 px-3 text-right text-teal-400">{ritaseMetrics.totalImbalPlant}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{ritaseMetrics.totalImbalTanah}</td>
                  <td className="py-3 px-3 text-right text-purple-400">{ritaseMetrics.totalLokasian}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-xs shadow-md shadow-amber-500/20">
                      {ritaseMetrics.totalRitase} Rit
                    </span>
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-stone-500 text-[10px]">
                    ({filteredFleetList.length} Unit Dump Truck)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )}

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
                  <span>8. Catatan Tugas Operasional</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Catatan tugas, target ritase, kondisi jalan / front loading, instruksi operasional..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-stone-600"
                />
              </div>

              {/* FITUR HITUNG RITASE DUMP TRUCK (CHECKER TAMBANG) */}
              <div className="bg-stone-950 p-4 rounded-2xl border border-amber-500/30 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Truck className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <span>Fitur Hitung Ritase (Khusus Dump Truck)</span>
                        {isDumpTruckForm && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Dump Truck
                          </span>
                        )}
                      </h4>
                      <p className="text-[10.5px] text-stone-400">
                        Tekan tombol <strong className="text-amber-400 font-mono">[+]</strong> di samping setiap kategori muatan untuk memasukkan ritase.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 shrink-0 self-start sm:self-auto">
                    <span className="text-[10.5px] font-mono uppercase text-stone-400">Total Ritase:</span>
                    <span className="text-base font-mono font-black text-amber-400">
                      {(Number(formData.ritaseBatuBaik || 0) +
                        Number(formData.ritaseBatuPecelan || 0) +
                        Number(formData.ritaseImbalPlant || 0) +
                        Number(formData.ritaseImbalTanah || 0) +
                        Number(formData.ritaseLokasian || 0))} Rit
                    </span>
                  </div>
                </div>

                {/* 5 Kategori Muat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Batu Baik */}
                  {renderCounterBox(
                    '1. Batu Baik',
                    'Batu Belah Standar / Berkualitas',
                    'text-amber-400',
                    'border-amber-500/30',
                    formData.ritaseBatuBaik,
                    (val) => setFormData({ ...formData, ritaseBatuBaik: val })
                  )}

                  {/* 2. Batu Pecelan */}
                  {renderCounterBox(
                    '2. Batu Pecelan',
                    'Batu Pecelan / Reject Crusher',
                    'text-orange-400',
                    'border-orange-500/30',
                    formData.ritaseBatuPecelan,
                    (val) => setFormData({ ...formData, ritaseBatuPecelan: val })
                  )}

                  {/* 3. Imbal Plant */}
                  {renderCounterBox(
                    '3. Imbal Plant',
                    'Material Imbal ke Plant Crusher',
                    'text-teal-400',
                    'border-teal-500/30',
                    formData.ritaseImbalPlant,
                    (val) => setFormData({ ...formData, ritaseImbalPlant: val })
                  )}

                  {/* 4. Imbal Tanah */}
                  {renderCounterBox(
                    '4. Imbal Tanah',
                    'Overburden / Kupasan Tanah',
                    'text-emerald-400',
                    'border-emerald-500/30',
                    formData.ritaseImbalTanah,
                    (val) => setFormData({ ...formData, ritaseImbalTanah: val })
                  )}

                  {/* 5. Lokasian */}
                  <div className="sm:col-span-2">
                    {renderCounterBox(
                      '5. Lokasian',
                      'Pekerjaan Angkut Lokasian Quarry',
                      'text-purple-400',
                      'border-purple-500/30',
                      formData.ritaseLokasian,
                      (val) => setFormData({ ...formData, ritaseLokasian: val })
                    )}
                  </div>
                </div>

                {/* Checker Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-stone-800">
                  <div>
                    <label className="block text-[10.5px] font-mono text-stone-300 mb-1 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-teal-400" />
                      <span>Nama Checker Tambang:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Checker Tambang..."
                      value={formData.namaChecker}
                      onChange={(e) => setFormData({ ...formData, namaChecker: e.target.value })}
                      className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-mono text-stone-300 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-amber-400" />
                      <span>Catatan Checker Tambang:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan hasil muatan / antrian..."
                      value={formData.catatanChecker}
                      onChange={(e) => setFormData({ ...formData, catatanChecker: e.target.value })}
                      className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
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

            {/* Input Manual Label Validasi Laporan (diketik sendiri oleh Checker) */}
            <div className="p-3.5 bg-stone-950 border-b border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>PENGATURAN LABEL VALIDASI LAPORAN (KETIK MANUAL OLEH CHECKER):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>1. Nama Checker (Petugas Validasi):</span>
                  </label>
                  <input
                    type="text"
                    value={validatorChecker}
                    onChange={(e) => setValidatorChecker(e.target.value)}
                    placeholder="Ketik nama Checker..."
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">
                    * Diketik manual oleh petugas checker sebelum cetak
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 font-bold flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Nama Kepala Tehnik Tambang (KTT):</span>
                  </label>
                  <input
                    type="text"
                    value={validatorKTT}
                    onChange={(e) => setValidatorKTT(e.target.value)}
                    placeholder="Ketik nama Kepala Tehnik Tambang (KTT)..."
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">
                    * Diketik manual untuk pengesahan KTT
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-white text-stone-950 font-sans text-xs">
              {/* Kop Surat Resmi PT BATU KALI WELANG AMPUH (ETIKA) */}
              <div className="border-b-2 border-stone-950 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-wider uppercase">PT BATU KALI WELANG AMPUH (ETIKA)</h2>
                  <p className="text-[10px] text-stone-600 font-mono">DIVISI OPERATION &bull; QUARRY &amp; MINING PURWOSARI</p>
                  <h3 className="text-sm font-bold text-stone-800 mt-1 uppercase">
                    LAPORAN SETTING FLEET &amp; HASIL KEGIATAN TAMBANG
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
                    <th className="border border-stone-300 p-1.5">No Unit (CN_NEW)</th>
                    <th className="border border-stone-300 p-1.5">Nama Unit</th>
                    <th className="border border-stone-300 p-1.5">Operator/Sopir</th>
                    <th className="border border-stone-300 p-1.5">Lokasi Kerja</th>
                    <th className="border border-stone-300 p-1.5 text-right">Batu Baik</th>
                    <th className="border border-stone-300 p-1.5 text-right">Pecelan</th>
                    <th className="border border-stone-300 p-1.5 text-right">Imbal Plant</th>
                    <th className="border border-stone-300 p-1.5 text-right">Imbal Tanah</th>
                    <th className="border border-stone-300 p-1.5 text-right">Lokasian</th>
                    <th className="border border-stone-300 p-1.5 text-right font-black">Total Rit</th>
                    <th className="border border-stone-300 p-1.5">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleetList.map((f, i) => (
                    <tr key={f.id} className="border-b border-stone-200">
                      <td className="border border-stone-300 p-1.5 text-center font-mono">{i + 1}</td>
                      <td className="border border-stone-300 p-1.5 font-mono font-bold">{f.noUnit}</td>
                      <td className="border border-stone-300 p-1.5">{f.namaAlat || f.jenisAlat || '-'}</td>
                      <td className="border border-stone-300 p-1.5 font-bold">{f.namaOperator}</td>
                      <td className="border border-stone-300 p-1.5">{f.lokasiKerja}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseBatuBaik || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseBatuPecelan || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseImbalPlant || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseImbalTanah || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseLokasian || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono font-black">{f.totalRitase || 0}</td>
                      <td className="border border-stone-300 p-1.5">{f.catatanChecker || f.catatan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-bold border-t-2 border-stone-950 font-mono">
                    <td colSpan={5} className="border border-stone-300 p-1.5 text-right">
                      TOTAL HASIL RITASE:
                    </td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalBatuBaik}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalBatuPecelan}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalImbalPlant}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalImbalTanah}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalLokasian}</td>
                    <td className="border border-stone-300 p-1.5 text-right font-black text-xs">
                      {ritaseMetrics.totalRitase} Rit
                    </td>
                    <td className="border border-stone-300 p-1.5 text-stone-500 text-[9px] font-normal">
                      ({filteredFleetList.length} Unit)
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Tanda Tangan: 2 Pihak Validasi Manual Saja */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                <div>
                  <p className="text-stone-700 font-medium mb-14">Petugas Checker Tambang:</p>
                  <p className="font-bold underline uppercase text-stone-900 tracking-wide text-[11px]">
                    {validatorChecker.trim() || '....................................'}
                  </p>
                  <p className="text-[9px] text-stone-500 font-mono mt-0.5">Checker Lapangan / Tallyman</p>
                </div>
                <div>
                  <p className="text-stone-700 font-medium mb-14">Mengetahui &amp; Menyetujui:</p>
                  <p className="font-bold underline uppercase text-stone-900 tracking-wide text-[11px]">
                    {validatorKTT.trim() || '....................................'}
                  </p>
                  <p className="text-[9px] text-stone-500 font-mono mt-0.5">Kepala Tehnik Tambang (KTT)</p>
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

      {/* ========================================================= */}
      {/* MODAL 4: QUICK TALLY POPUP (CEPAT TAP DI LAPANGAN) */}
      {/* ========================================================= */}
      {quickTallyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-teal-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-amber-400 font-mono tracking-wide">
                      {quickTallyTarget.noUnit}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                      {quickTallyTarget.jenisAlat || 'Dump Truck'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    Sopir: <strong className="text-stone-200">{quickTallyTarget.namaOperator}</strong> &bull; {quickTallyTarget.lokasiKerja}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickTallyTarget(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Grand Total Counter Header */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-950 border border-amber-500/30">
                <span className="text-xs font-mono uppercase text-stone-400">Total Akumulasi Ritase:</span>
                <span className="text-2xl font-mono font-black text-amber-400">
                  {quickTallyTarget.totalRitase || 0} <span className="text-xs text-stone-500 font-normal">Rit</span>
                </span>
              </div>

              {/* 5 Tombol Hitung Ritase Cepat dengan [+] dan [-] */}
              <div className="space-y-2.5">
                {/* 1. Batu Baik */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-amber-500/30">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-300 block">1. Batu Baik</span>
                    <span className="text-[10px] text-stone-500">Batu Belah Berkualitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-stone-100 text-lg w-10 text-center">
                      {quickTallyTarget.ritaseBatuBaik || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseBatuBaik', -1)}
                      disabled={(quickTallyTarget.ritaseBatuBaik || 0) <= 0}
                      className="p-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseBatuBaik', 1)}
                      className="flex items-center gap-1.5 p-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-amber-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="font-mono text-sm">+1</span>
                    </button>
                  </div>
                </div>

                {/* 2. Batu Pecelan */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-orange-500/30">
                  <div>
                    <span className="text-xs font-mono font-bold text-orange-300 block">2. Batu Pecelan</span>
                    <span className="text-[10px] text-stone-500">Reject Crusher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-stone-100 text-lg w-10 text-center">
                      {quickTallyTarget.ritaseBatuPecelan || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseBatuPecelan', -1)}
                      disabled={(quickTallyTarget.ritaseBatuPecelan || 0) <= 0}
                      className="p-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseBatuPecelan', 1)}
                      className="flex items-center gap-1.5 p-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-orange-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="font-mono text-sm">+1</span>
                    </button>
                  </div>
                </div>

                {/* 3. Imbal Plant */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-teal-500/30">
                  <div>
                    <span className="text-xs font-mono font-bold text-teal-300 block">3. Imbal Plant</span>
                    <span className="text-[10px] text-stone-500">Material Stock ke Crusher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-stone-100 text-lg w-10 text-center">
                      {quickTallyTarget.ritaseImbalPlant || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseImbalPlant', -1)}
                      disabled={(quickTallyTarget.ritaseImbalPlant || 0) <= 0}
                      className="p-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseImbalPlant', 1)}
                      className="flex items-center gap-1.5 p-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-teal-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="font-mono text-sm">+1</span>
                    </button>
                  </div>
                </div>

                {/* 4. Imbal Tanah */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-emerald-500/30">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-300 block">4. Imbal Tanah</span>
                    <span className="text-[10px] text-stone-500">Overburden / Tanah</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-stone-100 text-lg w-10 text-center">
                      {quickTallyTarget.ritaseImbalTanah || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseImbalTanah', -1)}
                      disabled={(quickTallyTarget.ritaseImbalTanah || 0) <= 0}
                      className="p-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseImbalTanah', 1)}
                      className="flex items-center gap-1.5 p-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="font-mono text-sm">+1</span>
                    </button>
                  </div>
                </div>

                {/* 5. Lokasian */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-purple-500/30">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-300 block">5. Lokasian</span>
                    <span className="text-[10px] text-stone-500">Angkut Lokasian Quarry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-stone-100 text-lg w-10 text-center">
                      {quickTallyTarget.ritaseLokasian || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseLokasian', -1)}
                      disabled={(quickTallyTarget.ritaseLokasian || 0) <= 0}
                      className="p-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickIncrementRitase(quickTallyTarget.id, 'ritaseLokasian', 1)}
                      className="flex items-center gap-1.5 p-2 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-stone-950 font-black transition active:scale-95 shadow-md shadow-purple-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span className="font-mono text-sm">+1</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-mono">
                Checker: <strong className="text-stone-300">{quickTallyTarget.namaChecker || currentUser.fullName || 'Checker'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setQuickTallyTarget(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition active:scale-95"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CETAK LEMBAR DOKUMEN CHECKER TAMBANG */}
      {/* ========================================================= */}
      {showCheckerPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-teal-500/50 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  Print Preview: Lembar Hasil Ritase Checker Tambang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckerPrintModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Manual Label Validasi Laporan (diketik sendiri oleh Checker) */}
            <div className="p-3.5 bg-stone-950 border-b border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-teal-400">
                <CheckSquare className="w-4 h-4" />
                <span>PENGATURAN LABEL VALIDASI LAPORAN (KETIK MANUAL OLEH CHECKER):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    <span>1. Nama Checker (Petugas Validasi):</span>
                  </label>
                  <input
                    type="text"
                    value={validatorChecker}
                    onChange={(e) => setValidatorChecker(e.target.value)}
                    placeholder="Ketik nama Checker..."
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">
                    * Diketik manual oleh petugas checker sebelum cetak
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-300 mb-1 font-bold flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. Nama Kepala Tehnik Tambang (KTT):</span>
                  </label>
                  <input
                    type="text"
                    value={validatorKTT}
                    onChange={(e) => setValidatorKTT(e.target.value)}
                    placeholder="Ketik nama Kepala Tehnik Tambang (KTT)..."
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">
                    * Diketik manual untuk pengesahan KTT
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-white text-stone-950 font-sans text-xs">
              {/* Kop Surat Resmi PT BATU KALI WELANG AMPUH (ETIKA) */}
              <div className="border-b-2 border-stone-950 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-wider uppercase">PT BATU KALI WELANG AMPUH (ETIKA)</h2>
                  <p className="text-[10px] text-stone-600 font-mono">DIVISI OPERATION &bull; QUARRY &amp; MINING PURWOSARI</p>
                  <h3 className="text-sm font-bold text-stone-900 mt-1 uppercase">
                    LAPORAN HASIL KEGIATAN &amp; RITASE CHECKER TAMBANG
                  </h3>
                </div>
                <div className="text-right text-[10px] font-mono text-stone-600">
                  <div>Tanggal: <strong>{filterDate || todayStr}</strong></div>
                  <div>Shift: <strong>{filterShift}</strong></div>
                  <div>Pos Lokasi: <strong>{filterLokasi === 'ALL' ? 'Seluruh Pos Tambang' : filterLokasi}</strong></div>
                  <div>Waktu Cetak: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* Tabel Cetak Ritase */}
              <table className="w-full border-collapse border border-stone-300 text-[10px]">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-300 font-mono font-bold text-stone-800">
                    <th className="border border-stone-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-stone-300 p-1.5">No Unit (CN_NEW)</th>
                    <th className="border border-stone-300 p-1.5">Nama Unit</th>
                    <th className="border border-stone-300 p-1.5">Operator/Sopir</th>
                    <th className="border border-stone-300 p-1.5">Lokasi Kerja</th>
                    <th className="border border-stone-300 p-1.5 text-right">Batu Baik</th>
                    <th className="border border-stone-300 p-1.5 text-right">Pecelan</th>
                    <th className="border border-stone-300 p-1.5 text-right">Imbal Plant</th>
                    <th className="border border-stone-300 p-1.5 text-right">Imbal Tanah</th>
                    <th className="border border-stone-300 p-1.5 text-right">Lokasian</th>
                    <th className="border border-stone-300 p-1.5 text-right font-black">Total Rit</th>
                    <th className="border border-stone-300 p-1.5">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleetList.map((f, i) => (
                    <tr key={f.id} className="border-b border-stone-200">
                      <td className="border border-stone-300 p-1.5 text-center font-mono">{i + 1}</td>
                      <td className="border border-stone-300 p-1.5 font-mono font-bold">{f.noUnit}</td>
                      <td className="border border-stone-300 p-1.5">{f.namaAlat || f.jenisAlat || '-'}</td>
                      <td className="border border-stone-300 p-1.5 font-bold">{f.namaOperator}</td>
                      <td className="border border-stone-300 p-1.5">{f.lokasiKerja}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseBatuBaik || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseBatuPecelan || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseImbalPlant || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseImbalTanah || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono">{f.ritaseLokasian || 0}</td>
                      <td className="border border-stone-300 p-1.5 text-right font-mono font-black">{f.totalRitase || 0}</td>
                      <td className="border border-stone-300 p-1.5">{f.catatanChecker || f.catatan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 font-bold border-t-2 border-stone-950 font-mono">
                    <td colSpan={5} className="border border-stone-300 p-1.5 text-right">
                      TOTAL HASIL PEKERJAAN:
                    </td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalBatuBaik}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalBatuPecelan}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalImbalPlant}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalImbalTanah}</td>
                    <td className="border border-stone-300 p-1.5 text-right">{ritaseMetrics.totalLokasian}</td>
                    <td className="border border-stone-300 p-1.5 text-right font-black text-xs">
                      {ritaseMetrics.totalRitase} Rit
                    </td>
                    <td className="border border-stone-300 p-1.5 text-stone-500 text-[9px] font-normal">
                      ({filteredFleetList.length} Armada)
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Tanda Tangan: 2 Pihak Validasi Manual Saja */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                <div>
                  <p className="text-stone-700 font-medium mb-14">Petugas Checker Tambang:</p>
                  <p className="font-bold underline uppercase text-stone-900 tracking-wide text-[11px]">
                    {validatorChecker.trim() || '....................................'}
                  </p>
                  <p className="text-[9px] text-stone-500 font-mono mt-0.5">Checker Lapangan / Tallyman</p>
                </div>
                <div>
                  <p className="text-stone-700 font-medium mb-14">Mengetahui &amp; Menyetujui:</p>
                  <p className="font-bold underline uppercase text-stone-900 tracking-wide text-[11px]">
                    {validatorKTT.trim() || '....................................'}
                  </p>
                  <p className="text-[9px] text-stone-500 font-mono mt-0.5">Kepala Tehnik Tambang (KTT)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 p-4 border-t border-stone-800 bg-stone-950">
              <button
                type="button"
                onClick={() => setShowCheckerPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-stone-100 font-bold text-xs shadow-lg shadow-teal-600/20 transition active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Dokumen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Toast Notification saat Menambah Ritase */}
      {tallyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-stone-950 px-4 py-3 rounded-2xl shadow-2xl font-mono text-xs font-bold flex items-center gap-2.5 animate-bounce border-2 border-stone-950">
          <CheckCircle2 className="w-5 h-5 text-stone-950 shrink-0" />
          <div>
            <span className="font-black text-sm block">{tallyToast.unit}</span>
            <span className="text-[11px] font-medium">{tallyToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
