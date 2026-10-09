import React, { useState, useMemo } from 'react';
import { 
  HeavyEquipment, 
  ManpowerData, 
  OutFieldFuelJobType, 
  OUT_FIELD_FUEL_JOBS, 
  OutFieldFuelRecord, 
  UserAccount,
  MANPOWER_JABATAN_OPTIONS 
} from '../../types';
import { 
  isDeveloper, 
  canUserInsertModule, 
  canUserEditModule, 
  canUserDeleteModule, 
  canUserExportModule 
} from '../../utils/storage';
import { TimeInput24Hour } from '../common/TimeInput24Hour';
import { 
  Fuel, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  Lock, 
  DollarSign, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Settings2,
  Building2,
  Eye,
  Wallet,
  Receipt,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface OutFieldFuelSubViewProps {
  units: HeavyEquipment[];
  manpowerList: ManpowerData[];
  outFieldFuelRecords: OutFieldFuelRecord[];
  currentUser: UserAccount;
  onSaveRecord: (
    data: Omit<OutFieldFuelRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OutFieldFuelRecord };
  onDeleteRecord: (id: string) => { success: boolean; message: string };
  standardSolarPrice: number;
  onUpdateSolarPrice: (newPrice: number) => void;
  onBackToMainMenu?: () => void;
}

const COMMON_SPBU_PRESETS = [
  'SPBU 44.571.01 (Purwosari)',
  'SPBU 44.571.08 (Jl. Raya Quarry)',
  'SPBU Pertamina Simpang',
  'SPBU Jalur Tambang',
  'SPBU Mitra Luar',
];

export const OutFieldFuelSubView: React.FC<OutFieldFuelSubViewProps> = ({
  units,
  manpowerList,
  outFieldFuelRecords,
  currentUser,
  onSaveRecord,
  onDeleteRecord,
  standardSolarPrice,
  onUpdateSolarPrice,
}) => {
  const isDev = isDeveloper(currentUser);
  const canInput = isDev || canUserInsertModule(currentUser, 4);
  const canEdit = isDev || canUserEditModule(currentUser, 4);
  const canDelete = isDev || canUserDeleteModule(currentUser, 4);
  const canExport = isDev || canUserExportModule(currentUser, 4);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJob, setFilterJob] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<OutFieldFuelRecord | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Atur Harga Solar (Developer Only)
  const [showPriceSettingModal, setShowPriceSettingModal] = useState(false);
  const [tempSolarPrice, setTempSolarPrice] = useState<number>(standardSolarPrice || 6800);

  // Form Fields:
  // 1. Tanggal dan Jam
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jam, setJam] = useState<string>('08:00');
  // 2. Jenis (dari Modul 1)
  const [selectedJenis, setSelectedJenis] = useState<string>('');
  // 3. Kode SPBU
  const [kodeSpbu, setKodeSpbu] = useState<string>('SPBU 44.571.01 (Purwosari)');
  // 4. CN_NEW & Nama Alat
  const [cnNew, setCnNew] = useState<string>('');
  const [namaAlat, setNamaAlat] = useState<string>('');
  // 5. Jml (Ltr)
  const [jmlLtr, setJmlLtr] = useState<number | ''>(100);
  // 6. Job & Ritase di masing-masing pilihan
  const [selectedJob, setSelectedJob] = useState<OutFieldFuelJobType>('Batu Baik');
  const [ritaseBatuBaik, setRitaseBatuBaik] = useState<number | ''>(5);
  const [ritaseBatuPecelan, setRitaseBatuPecelan] = useState<number | ''>('');
  const [ritaseImbalTanah, setRitaseImbalTanah] = useState<number | ''>('');
  const [ritaseImbalPlant, setRitaseImbalPlant] = useState<number | ''>('');
  const [ritaseLokasian, setRitaseLokasian] = useState<number | ''>('');
  // 7. Harga solar & Pembelian Solar
  const [customHargaSolar, setCustomHargaSolar] = useState<number>(standardSolarPrice || 6800);
  // 8. Angka Pembulatan Solar SPBU (+/- Rp)
  const [angkaPembulatan, setAngkaPembulatan] = useState<number | ''>(0);
  // 9. Lain-lain (Text) & Nominal Lain-lain
  const [lainLain, setLainLain] = useState<string>('');
  const [nominalLainLain, setNominalLainLain] = useState<number | ''>('');
  // 10. Pembayaran Cash ke Sopir (Rp)
  const [nominalCashSopir, setNominalCashSopir] = useState<number | ''>(700000);
  // Tambahan info operator & catatan
  const [namaOperator, setNamaOperator] = useState<string>('');
  const [jabatanOperator, setJabatanOperator] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  // Sinkronisasi customHargaSolar saat standardSolarPrice dari prop berubah
  React.useEffect(() => {
    if (!editingId) {
      setCustomHargaSolar(standardSolarPrice || 6800);
      setTempSolarPrice(standardSolarPrice || 6800);
    }
  }, [standardSolarPrice, editingId]);

  // Daftar unik Jenis dari Modul 1
  const availableJenisList = useMemo(() => {
    const list = units.map((u) => (u.jenis || (u as any).category || '').trim()).filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.length > 0 ? unique.sort() : ['Dump Truck', 'Excavator', 'Wheel Loader', 'Support'];
  }, [units]);

  // Unit CN helper
  const getUnitCn = (u: any): string => u.cnNew || u.codeNumber || u.kodeUnit || '';
  const getUnitName = (u: any): string => u.namaAlat || `${u.brandMerk || ''} ${u.modelUnit || ''}`.trim() || getUnitCn(u);

  // Filter unit yang sesuai Jenis terpilih
  const availableUnitsForJenis = useMemo(() => {
    if (!selectedJenis) return units;
    return units.filter((u) => (u.jenis || (u as any).category || '').trim().toUpperCase() === selectedJenis.trim().toUpperCase());
  }, [units, selectedJenis]);

  // Hitung Total Ritase otomatis dari penjumlahan kolom Job
  const calculatedRitaseTotal = useMemo(() => {
    const bb = Number(ritaseBatuBaik) || 0;
    const bp = Number(ritaseBatuPecelan) || 0;
    const it = Number(ritaseImbalTanah) || 0;
    const ip = Number(ritaseImbalPlant) || 0;
    const lk = Number(ritaseLokasian) || 0;
    return bb + bp + it + ip + lk;
  }, [ritaseBatuBaik, ritaseBatuPecelan, ritaseImbalTanah, ritaseImbalPlant, ritaseLokasian]);

  // Subtotal Pembelian Fuel = Harga Solar x Jml (Ltr)
  const calculatedSubtotalFuel = useMemo(() => {
    const ltr = Number(jmlLtr) || 0;
    const price = Number(customHargaSolar) || 0;
    return ltr * price;
  }, [jmlLtr, customHargaSolar]);

  // Nominal Solar Setelah Pembulatan = Subtotal + Angka Pembulatan
  const calculatedFuelSetelahPembulatan = useMemo(() => {
    const subtotal = calculatedSubtotalFuel;
    const roundVal = Number(angkaPembulatan) || 0;
    return subtotal + roundVal;
  }, [calculatedSubtotalFuel, angkaPembulatan]);

  // Pengeluaran Total = Nominal Solar Setelah Pembulatan + Nominal Lain-lain
  const calculatedTotalPengeluaran = useMemo(() => {
    const fuelFinal = calculatedFuelSetelahPembulatan;
    const otherNominal = Number(nominalLainLain) || 0;
    return fuelFinal + otherNominal;
  }, [calculatedFuelSetelahPembulatan, nominalLainLain]);

  // Sisa Selisih Cash Sopir = (Nominal Cash yang Diberikan Sopir) - (Pengeluaran Total)
  const calculatedSisaSelisihCash = useMemo(() => {
    const cashSopir = Number(nominalCashSopir) || 0;
    return cashSopir - calculatedTotalPengeluaran;
  }, [nominalCashSopir, calculatedTotalPengeluaran]);

  // Tombol bantuan pembulatan cepat
  const handleAutoRound = (type: 'round_1k' | 'ceil_1k' | 'round_10k' | 'zero') => {
    const subtotal = calculatedSubtotalFuel;
    if (type === 'zero') {
      setAngkaPembulatan(0);
      return;
    }
    if (type === 'round_1k') {
      const target = Math.round(subtotal / 1000) * 1000;
      setAngkaPembulatan(target - subtotal);
      return;
    }
    if (type === 'ceil_1k') {
      const target = Math.ceil(subtotal / 1000) * 1000;
      setAngkaPembulatan(target - subtotal);
      return;
    }
    if (type === 'round_10k') {
      const target = Math.round(subtotal / 10000) * 10000;
      setAngkaPembulatan(target - subtotal);
      return;
    }
  };

  // Helper pencocokan data Manpower Modul 2 untuk nama dan jabatan driver
  const getMatchedManpower = (name?: string): ManpowerData | undefined => {
    if (!name || !name.trim()) return undefined;
    const clean = name.trim().toLowerCase();
    return manpowerList.find((m) => m.nama?.trim().toLowerCase() === clean);
  };

  const resolveDriverJabatan = (name?: string, fallbackJabatan?: string): string => {
    const mp = getMatchedManpower(name);
    if (mp && mp.jabatan && mp.jabatan.trim()) {
      return mp.jabatan;
    }
    // Jika cocok dengan user yang sedang login
    if (name && currentUser.fullName && name.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) {
      return currentUser.jabatan || currentUser.department || 'Staff BKWA';
    }
    if (fallbackJabatan && fallbackJabatan.trim()) {
      return fallbackJabatan;
    }
    return 'SOPIR LOKASI';
  };

  const handleDriverNameChange = (selectedName: string) => {
    setNamaOperator(selectedName);
    const matched = getMatchedManpower(selectedName);
    if (matched && matched.jabatan) {
      setJabatanOperator(matched.jabatan);
    } else if (currentUser.fullName && selectedName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) {
      setJabatanOperator(currentUser.jabatan || 'SOPIR LOKASI');
    }
  };

  // Handler CN Unit Change
  const handleCnChange = (cn: string) => {
    setCnNew(cn);
    const found = units.find((u) => getUnitCn(u) === cn);
    if (found) {
      setNamaAlat(getUnitName(found));
      if (!selectedJenis && found.jenis) {
        setSelectedJenis(found.jenis);
      }
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    setJam('08:00');
    const firstJenis = availableJenisList[0] || 'Dump Truck';
    setSelectedJenis(firstJenis);
    const matching = units.filter((u) => (u.jenis || (u as any).category || '').trim().toUpperCase() === firstJenis.trim().toUpperCase());
    const initialUnit = matching[0] || units[0];
    setCnNew(initialUnit ? getUnitCn(initialUnit) : '');
    setNamaAlat(initialUnit ? getUnitName(initialUnit) : '');
    setKodeSpbu('SPBU 44.571.01 (Purwosari)');
    setJmlLtr(100);
    setSelectedJob('Batu Baik');
    setRitaseBatuBaik(5);
    setRitaseBatuPecelan('');
    setRitaseImbalTanah('');
    setRitaseImbalPlant('');
    setRitaseLokasian('');
    const basePrice = standardSolarPrice || 6800;
    setCustomHargaSolar(basePrice);
    setAngkaPembulatan(0);
    setLainLain('');
    setNominalLainLain('');
    // Default cash sopir diberikan: perkiraan pembelian solar (100 * 6800 = 680.000 dibulatkan ke 700.000)
    setNominalCashSopir(700000);
    
    // Cari driver dari manpowerList yang jabatannya SOPIR LOKASI / DRIVER / OPERATOR
    const foundDriver = manpowerList.find((m) => 
      (m.jabatan || '').toUpperCase().includes('SOPIR') || 
      (m.jabatan || '').toUpperCase().includes('DRIVER') || 
      (m.jabatan || '').toUpperCase().includes('OPERATOR')
    ) || manpowerList[0];

    const initialDriverName = foundDriver?.nama || currentUser.fullName || 'Slamet Riyadi';
    const initialDriverJabatan = foundDriver?.jabatan || currentUser.jabatan || 'SOPIR LOKASI';
    setNamaOperator(initialDriverName);
    setJabatanOperator(initialDriverJabatan);

    setCatatan('Pengisian solar di SPBU luar untuk operasional quarry');
    setFeedback(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: OutFieldFuelRecord) => {
    setEditingId(item.id);
    setTanggal(item.tanggal);
    setJam(item.jam || '08:00');
    setSelectedJenis(item.jenisAlat || '');
    setKodeSpbu(item.kodeSpbu);
    setCnNew(item.cnNew);
    setNamaAlat(item.namaAlat);
    setJmlLtr(item.jmlLtr);
    setSelectedJob((item.job as OutFieldFuelJobType) || 'Batu Baik');
    setRitaseBatuBaik(item.ritaseBatuBaik || '');
    setRitaseBatuPecelan(item.ritaseBatuPecelan || '');
    setRitaseImbalTanah(item.ritaseImbalTanah || '');
    setRitaseImbalPlant(item.ritaseImbalPlant || '');
    setRitaseLokasian(item.ritaseLokasian || '');
    setCustomHargaSolar(item.hargaSolarPerLiter || standardSolarPrice || 6800);
    setAngkaPembulatan(item.angkaPembulatan !== undefined ? item.angkaPembulatan : 0);
    setLainLain(item.lainLain || '');
    setNominalLainLain(item.nominalLainLain || '');
    setNominalCashSopir(item.nominalCashSopir !== undefined ? item.nominalCashSopir : (item.totalNominal || 0));
    setNamaOperator(item.namaOperator || '');
    setJabatanOperator(resolveDriverJabatan(item.namaOperator, item.jabatanOperator));
    setCatatan(item.catatan || '');
    setFeedback(null);
    setShowModal(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cnNew.trim()) {
      setFeedback({ type: 'error', text: 'Silakan pilih CN Unit!' });
      return;
    }
    if (!jmlLtr || Number(jmlLtr) <= 0) {
      setFeedback({ type: 'error', text: 'Jumlah liter solar harus lebih dari 0!' });
      return;
    }
    if (!kodeSpbu.trim()) {
      setFeedback({ type: 'error', text: 'Kode SPBU wajib diisi!' });
      return;
    }

    const finalJabatan = jabatanOperator.trim() || resolveDriverJabatan(namaOperator, 'SOPIR LOKASI');

    const payload: Omit<OutFieldFuelRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      noTransaksi: editingId
        ? outFieldFuelRecords.find((r) => r.id === editingId)?.noTransaksi || `OFF-${Date.now().toString().slice(-4)}`
        : `OFF-${Date.now().toString().slice(-4)}`,
      tanggal,
      jam,
      jenisAlat: selectedJenis || 'Dump Truck',
      kodeSpbu: kodeSpbu.trim(),
      cnNew: cnNew.trim(),
      namaAlat: namaAlat.trim() || cnNew.trim(),
      jmlLtr: Number(jmlLtr),
      job: selectedJob,
      ritaseBatuBaik: Number(ritaseBatuBaik) || 0,
      ritaseBatuPecelan: Number(ritaseBatuPecelan) || 0,
      ritaseImbalTanah: Number(ritaseImbalTanah) || 0,
      ritaseImbalPlant: Number(ritaseImbalPlant) || 0,
      ritaseLokasian: Number(ritaseLokasian) || 0,
      ritaseTotal: calculatedRitaseTotal,
      hargaSolarPerLiter: Number(customHargaSolar) || 6800,
      nominalPembelianFuel: calculatedSubtotalFuel,
      angkaPembulatan: Number(angkaPembulatan) || 0,
      nominalFuelSetelahPembulatan: calculatedFuelSetelahPembulatan,
      lainLain: lainLain.trim(),
      nominalLainLain: Number(nominalLainLain) || 0,
      totalNominal: calculatedTotalPengeluaran,
      nominalCashSopir: Number(nominalCashSopir) || 0,
      sisaSelisihCash: calculatedSisaSelisihCash,
      namaOperator: namaOperator.trim(),
      jabatanOperator: finalJabatan,
      catatan: catatan.trim(),
    };

    const res = onSaveRecord(payload, editingId || undefined);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setShowModal(false);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Simpan Pengaturan Harga Solar Baku (Developer)
  const handleSaveStandardSolarPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSolarPrice || tempSolarPrice <= 0) {
      alert('Harga solar per liter harus berupa angka valid di atas 0!');
      return;
    }
    onUpdateSolarPrice(Number(tempSolarPrice));
    setCustomHargaSolar(Number(tempSolarPrice));
    setShowPriceSettingModal(false);
  };

  // Format Tanggal Gform Style
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d} ${months[parseInt(m, 10) - 1] || m} ${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Filter Periode Metrics: BULAN_BERJALAN (Default: Akumulasi Tgl 1 - 30/31) vs ALL
  const [metricsMode, setMetricsMode] = useState<'BULAN_BERJALAN' | 'ALL'>('BULAN_BERJALAN');

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const labelBulanAktif = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Summary Metrics (Bulan Berjalan vs All Time)
  const metrics = useMemo(() => {
    const targetSource = metricsMode === 'BULAN_BERJALAN'
      ? outFieldFuelRecords.filter((r) => r.tanggal?.startsWith(currentYearMonth))
      : outFieldFuelRecords;

    const totalRecords = targetSource.length;
    const totalLiter = targetSource.reduce((acc, curr) => acc + (Number(curr.jmlLtr) || 0), 0);
    const totalRitase = targetSource.reduce((acc, curr) => acc + (Number(curr.ritaseTotal) || 0), 0);
    const totalBiayaFuelNet = targetSource.reduce(
      (acc, curr) => acc + (Number(curr.nominalFuelSetelahPembulatan) || Number(curr.nominalPembelianFuel) || 0),
      0
    );
    const totalBiayaKeseluruhan = targetSource.reduce((acc, curr) => acc + (Number(curr.totalNominal) || 0), 0);
    const totalCashSopir = targetSource.reduce((acc, curr) => acc + (Number(curr.nominalCashSopir) || 0), 0);
    const totalSisaCash = targetSource.reduce((acc, curr) => acc + (Number(curr.sisaSelisihCash) || 0), 0);

    return { 
      totalRecords, 
      totalLiter, 
      totalRitase, 
      totalBiayaFuelNet, 
      totalBiayaKeseluruhan, 
      totalCashSopir, 
      totalSisaCash 
    };
  }, [outFieldFuelRecords, metricsMode, currentYearMonth]);

  // Filtered Table Records
  const filteredRecords = useMemo(() => {
    return outFieldFuelRecords.filter((rec) => {
      const matchSearch =
        rec.noTransaksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.cnNew.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.namaAlat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.kodeSpbu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.namaOperator || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchJob = filterJob === 'ALL' || rec.job === filterJob;
      const matchDate = !filterDate || rec.tanggal === filterDate;

      return matchSearch && matchJob && matchDate;
    });
  }, [outFieldFuelRecords, searchTerm, filterJob, filterDate]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data Out Field Fuel untuk di-export.');
      return;
    }

    const headers = [
      'No Transaksi',
      'Tanggal',
      'Jam',
      'Jenis Alat',
      'Kode SPBU',
      'CN NEW',
      'Nama Alat',
      'Jumlah (Ltr)',
      'Job Utama',
      'Rit Batu Baik',
      'Rit Batu Pecelan',
      'Rit Imbal Tanah',
      'Rit Imbal Plant',
      'Rit Lokasian',
      'Total Ritase',
      'Harga Solar/Ltr',
      'Subtotal Pembelian Solar',
      'Angka Pembulatan',
      'Nominal Solar Setelah Pembulatan',
      'Lain Lain',
      'Nominal Lain Lain',
      'Pengeluaran Total',
      'Nominal Cash Sopir Diberikan',
      'Sisa Selisih Cash Sopir',
      'Operator/Driver'
    ];

    const rows = filteredRecords.map((r) => [
      r.noTransaksi,
      r.tanggal,
      r.jam,
      `"${r.jenisAlat || ''}"`,
      `"${r.kodeSpbu || ''}"`,
      r.cnNew,
      `"${r.namaAlat || ''}"`,
      r.jmlLtr,
      `"${r.job || ''}"`,
      r.ritaseBatuBaik || 0,
      r.ritaseBatuPecelan || 0,
      r.ritaseImbalTanah || 0,
      r.ritaseImbalPlant || 0,
      r.ritaseLokasian || 0,
      r.ritaseTotal,
      r.hargaSolarPerLiter,
      r.nominalPembelianFuel,
      r.angkaPembulatan || 0,
      r.nominalFuelSetelahPembulatan || r.nominalPembelianFuel,
      `"${r.lainLain || ''}"`,
      r.nominalLainLain || 0,
      r.totalNominal,
      r.nominalCashSopir || 0,
      r.sisaSelisihCash || 0,
      `"${r.namaOperator || ''}"`
    ]);

    const csvLines = [
      `"PT BATU KALI WELANG AMPUH - LAPORAN PEMBELIAN SOLAR SPBU LUAR (OUT FIELD FUEL)"`,
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Transaksi: ${filteredRecords.length}"`,
      ``,
      headers.join(','),
      ...rows.map((e) => e.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OutField_Fuel_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SUB MODUL OUT FIELD FUEL
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Logistik &amp; Pembelian Solar SPBU Luar
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide flex items-center gap-2.5">
              <Fuel className="w-6 h-6 text-amber-400" />
              <span>OUT FIELD FUEL USED (SPBU LUAR)</span>
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Pencatatan pengisian solar SPBU luar, ritase job, angka pembulatan struk solar, dan rekonsiliasi pembayaran cash uang jalan sopir (Nominal Cash - Pengeluaran Total).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Setting Harga Solar (Akun Developer yang bisa merubah harga solar) */}
            {isDev && (
              <button
                type="button"
                onClick={() => {
                  setTempSolarPrice(standardSolarPrice || 6800);
                  setShowPriceSettingModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold shadow-md transition"
                title="Atur Standar Harga Solar per Liter (Khusus Developer)"
              >
                <Settings2 className="w-4 h-4 text-purple-400" />
                <span>Harga Solar Acuan (Rp {Number(standardSolarPrice || 6800).toLocaleString('id-ID')}/L)</span>
              </button>
            )}

            {/* Export CSV */}
            {canExport && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 text-xs font-mono font-bold transition shadow-md"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            )}

            {/* Tambah Pencatatan Baru */}
            {canInput ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Input Out Field Fuel</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800/60 text-stone-500 text-xs font-mono border border-stone-800 cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>Input Dibatasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Toggle Mode: Bulan Berjalan (Tgl 1 - 30/31) vs Semua Periode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-5 pt-3 border-t border-stone-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-stone-400">Akumulasi:</span>
            <div className="inline-flex rounded-xl bg-stone-950 p-1 border border-stone-800">
              <button
                type="button"
                onClick={() => setMetricsMode('BULAN_BERJALAN')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                  metricsMode === 'BULAN_BERJALAN'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>📅 Bulan Berjalan ({labelBulanAktif})</span>
              </button>
              <button
                type="button"
                onClick={() => setMetricsMode('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                  metricsMode === 'ALL'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>🌐 Semua Riwayat</span>
              </button>
            </div>
          </div>
          <span className="text-[10px] font-mono text-stone-400">
            {metricsMode === 'BULAN_BERJALAN' 
              ? `* Akumulasi Tgl 1 - 30/31 ${labelBulanAktif}` 
              : `* Total seluruh transaksi historis`}
          </span>
        </div>

        {/* 5 Cards Ringkasan Finansial & Operasional */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Transaksi</span>
            <div className="text-lg font-mono font-bold text-stone-100 mt-0.5">
              {metrics.totalRecords} <span className="text-xs text-stone-500 font-normal">Bon SPBU</span>
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block truncate">
              Total Rit: {metrics.totalRitase.toLocaleString('id-ID')} Rit
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-amber-400 block">Total Solar Terpakai</span>
            <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">
              {metrics.totalLiter.toLocaleString('id-ID')} <span className="text-xs text-stone-400 font-normal">Liter</span>
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block truncate">
              Net Solar: Rp {metrics.totalBiayaFuelNet.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-rose-400 block">Pengeluaran Total</span>
            <div className="text-lg font-mono font-bold text-rose-300 mt-0.5 truncate">
              Rp {metrics.totalBiayaKeseluruhan.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block truncate">
              Solar + Pembulatan + Lain-lain
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-blue-400 block">Cash Diberikan Sopir</span>
            <div className="text-lg font-mono font-bold text-blue-300 mt-0.5 truncate">
              Rp {metrics.totalCashSopir.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block truncate">
              Total Uang Kas Jalan
            </span>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            metrics.totalSisaCash >= 0 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <span className="text-[10px] font-mono uppercase block text-stone-400">
              Sisa Kas Sopir (Cash - Keluar)
            </span>
            <div className="text-lg font-mono font-bold mt-0.5 truncate">
              {metrics.totalSisaCash >= 0 ? '+' : ''}Rp {metrics.totalSisaCash.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] block mt-1 truncate">
              {metrics.totalSisaCash >= 0 ? '✓ Sisa dikembalikan kasir' : '⚠ Defisit / Nombor sopir'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari CN Unit, No Transaksi, SPBU, atau Operator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Job */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-500 font-mono uppercase">Job:</span>
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="bg-transparent text-xs text-stone-300 font-mono focus:outline-none"
            >
              <option value="ALL">Semua Job</option>
              {OUT_FIELD_FUEL_JOBS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-xs text-stone-300 font-mono focus:outline-none"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="text-stone-500 hover:text-stone-200"
                title="Hapus filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Data Out Field Fuel Used dengan Kolom Finansial & Rekonsiliasi Cash */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-stone-800">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">Tanggal &amp; Jam</th>
                <th className="py-3 px-3">Kode SPBU</th>
                <th className="py-3 px-3">Unit CN &amp; Jenis</th>
                <th className="py-3 px-3 text-right">Solar (Ltr)</th>
                <th className="py-3 px-3">Job &amp; Ritase</th>
                <th className="py-3 px-3 text-right">Pembelian Solar &amp; Pembulatan</th>
                <th className="py-3 px-3 text-right font-bold text-amber-300">Pengeluaran Total</th>
                <th className="py-3 px-3 text-right text-blue-300">Cash ke Sopir</th>
                <th className="py-3 px-3 text-right">Sisa Kas Sopir</th>
                <th className="py-3 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-mono">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-500 text-xs">
                    Belum ada catatan pemakaian solar SPBU luar yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const fuelNet = Number(r.nominalFuelSetelahPembulatan) || Number(r.nominalPembelianFuel) || 0;
                  const pembulatan = Number(r.angkaPembulatan) || 0;
                  const totalKeluar = Number(r.totalNominal) || 0;
                  const cashSopir = Number(r.nominalCashSopir) || 0;
                  const sisaCash = Number(r.sisaSelisihCash) !== undefined ? Number(r.sisaSelisihCash) : (cashSopir - totalKeluar);

                  return (
                    <tr key={r.id} className="hover:bg-stone-850/60 transition">
                      <td className="py-3 px-3 text-center text-stone-500">{idx + 1}</td>
                      
                      {/* Tanggal & Jam */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-stone-200 font-bold">{formatIndoDate(r.tanggal)}</div>
                        <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{r.jam || '08:00'}</span>
                          <span className="text-stone-600">•</span>
                          <span className="text-[10px] text-stone-500">{r.noTransaksi}</span>
                        </div>
                      </td>

                      {/* Kode SPBU */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{r.kodeSpbu}</span>
                        </div>
                        {r.namaOperator && (
                          <div className="text-[10px] text-stone-400 truncate max-w-[140px] mt-0.5 flex items-center gap-1">
                            <span className="text-stone-300 font-semibold">{r.namaOperator}</span>
                            <span className="text-stone-600">•</span>
                            <span className="text-amber-400 font-medium">
                              {resolveDriverJabatan(r.namaOperator, r.jabatanOperator)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Unit CN & Jenis */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-amber-400">{r.cnNew}</div>
                        <div className="text-[11px] text-stone-400 truncate max-w-[130px]">{r.namaAlat}</div>
                        <span className="text-[9.5px] text-stone-500 px-1.5 py-0.2 rounded bg-stone-950 border border-stone-800 inline-block mt-0.5">
                          {r.jenisAlat || 'Dump Truck'}
                        </span>
                      </td>

                      {/* Jml Solar (Ltr) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="text-sm font-bold text-stone-100">{r.jmlLtr.toLocaleString('id-ID')}</span>
                        <span className="text-[10px] text-stone-500 block">Ltr</span>
                      </td>

                      {/* Job & Ritase */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-block mb-1">
                          {r.job || 'Batu Baik'}
                        </span>
                        <div className="text-[11px] text-stone-300 font-bold">
                          {r.ritaseTotal || 0} Ritase
                        </div>
                      </td>

                      {/* Pembelian Solar & Angka Pembulatan */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-stone-200">
                          Rp {fuelNet.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center justify-end gap-1 mt-0.5">
                          {pembulatan !== 0 ? (
                            <span className={pembulatan > 0 ? 'text-amber-400 font-semibold' : 'text-blue-400 font-semibold'}>
                              {pembulatan > 0 ? `+Rp ${pembulatan.toLocaleString('id-ID')}` : `-Rp ${Math.abs(pembulatan).toLocaleString('id-ID')}`} (bulat)
                            </span>
                          ) : (
                            <span className="text-stone-500">Pas (bulat 0)</span>
                          )}
                        </div>
                        <div className="text-[9px] text-stone-600">
                          @ Rp {Number(r.hargaSolarPerLiter || 6800).toLocaleString('id-ID')}/L
                        </div>
                      </td>

                      {/* Pengeluaran Total */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-extrabold text-amber-400 text-sm">
                          Rp {totalKeluar.toLocaleString('id-ID')}
                        </div>
                        {r.nominalLainLain > 0 && (
                          <div className="text-[9.5px] text-stone-400 mt-0.5 truncate max-w-[120px]" title={r.lainLain}>
                            +Lain Rp {r.nominalLainLain.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Cash Diberikan ke Sopir */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-blue-300 text-xs">
                          Rp {cashSopir.toLocaleString('id-ID')}
                        </div>
                        <span className="text-[9.5px] text-stone-500 block">Uang Jalan</span>
                      </td>

                      {/* Sisa Kas Sopir: (Cash Diberikan Sopir - Pengeluaran Total) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className={`font-bold text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                          sisaCash > 0
                            ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                            : sisaCash === 0
                            ? 'bg-stone-800 border-stone-700 text-stone-300'
                            : 'bg-rose-950/60 border-rose-600/40 text-rose-300'
                        }`}>
                          <span>{sisaCash > 0 ? '+' : ''}Rp {sisaCash.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="text-[9px] text-stone-500 mt-0.5">
                          {sisaCash > 0 ? 'Sisa Kembalian' : sisaCash === 0 ? 'Klop / Pas' : 'Kurang Bayar'}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setViewingRecord(r)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
                            title="Lihat Detail Bon & Finansial"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          {/* Edit Button */}
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 transition"
                              title="Edit Data Out Field Fuel"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                              title="Edit dibatasi"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus catatan Out Field Fuel ${r.noTransaksi} untuk unit ${r.cnNew}?`)) {
                                  onDeleteRecord(r.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-400 border border-rose-800/40 transition"
                              title="Hapus Data (Developer Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed"
                              title="Hapus dibatasi"
                            >
                              <Lock className="w-3.5 h-3.5" />
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

      {/* ============================================================ */}
      {/* MODAL DETAIL / STRUK OUT FIELD FUEL (VIEW ONLY)              */}
      {/* ============================================================ */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto my-auto animate-fadeIn font-mono">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100">
                    RINCIAN BON SPBU LUAR
                  </h3>
                  <p className="text-xs text-stone-400">
                    {viewingRecord.noTransaksi} • {formatIndoDate(viewingRecord.tanggal)} ({viewingRecord.jam || '08:00'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* Unit & Lokasi */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Unit CN &amp; Jenis:</span>
                  <span className="font-bold text-amber-400">{viewingRecord.cnNew} ({viewingRecord.jenisAlat || 'Dump Truck'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Nama Alat:</span>
                  <span className="text-stone-200">{viewingRecord.namaAlat}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Lokasi / Kode SPBU:</span>
                  <span className="font-semibold text-blue-300">{viewingRecord.kodeSpbu}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Driver / Operator:</span>
                  <div className="text-right">
                    <div className="text-stone-100 font-bold">{viewingRecord.namaOperator || '-'}</div>
                    <div className="text-[11px] font-mono flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                        {resolveDriverJabatan(viewingRecord.namaOperator, viewingRecord.jabatanOperator)}
                      </span>
                      {getMatchedManpower(viewingRecord.namaOperator)?.statusKaryawan && (
                        <span className="text-[10px] text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                          {getMatchedManpower(viewingRecord.namaOperator)?.statusKaryawan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job & Ritase */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Job Utama:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {viewingRecord.job}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-850 text-[11px]">
                  <div>Batu Baik: <span className="font-bold text-stone-200">{viewingRecord.ritaseBatuBaik || 0}</span></div>
                  <div>Batu Pecelan: <span className="font-bold text-stone-200">{viewingRecord.ritaseBatuPecelan || 0}</span></div>
                  <div>Imbal Tanah: <span className="font-bold text-stone-200">{viewingRecord.ritaseImbalTanah || 0}</span></div>
                  <div>Imbal Plant: <span className="font-bold text-stone-200">{viewingRecord.ritaseImbalPlant || 0}</span></div>
                  <div>Lokasian: <span className="font-bold text-stone-200">{viewingRecord.ritaseLokasian || 0}</span></div>
                  <div className="text-amber-400 font-bold">Total: {viewingRecord.ritaseTotal} Rit</div>
                </div>
              </div>

              {/* Rincian Finansial & Rekonsiliasi Cash Sopir */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/30 space-y-2.5">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Kalkulasi Pembelian Solar &amp; Rekonsiliasi Cash
                </span>

                <div className="flex justify-between items-center text-stone-300">
                  <span>Volume Solar:</span>
                  <span className="font-bold">{viewingRecord.jmlLtr} Liter @ Rp {Number(viewingRecord.hargaSolarPerLiter || 6800).toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center text-stone-300">
                  <span>Subtotal Solar:</span>
                  <span>Rp {viewingRecord.nominalPembelianFuel.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center text-stone-300">
                  <span className="flex items-center gap-1">
                    <span>Angka Pembulatan SPBU:</span>
                  </span>
                  <span className={Number(viewingRecord.angkaPembulatan || 0) >= 0 ? 'text-amber-300 font-bold' : 'text-blue-300 font-bold'}>
                    {Number(viewingRecord.angkaPembulatan || 0) >= 0 ? '+' : ''}Rp {Number(viewingRecord.angkaPembulatan || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-stone-200 font-semibold pt-1 border-t border-stone-850">
                  <span>Nominal Solar Aktual (Setelah Pembulatan):</span>
                  <span className="text-amber-300">
                    Rp {Number(viewingRecord.nominalFuelSetelahPembulatan || viewingRecord.nominalPembelianFuel).toLocaleString('id-ID')}
                  </span>
                </div>

                {viewingRecord.nominalLainLain > 0 && (
                  <div className="flex justify-between items-center text-stone-300">
                    <span>Lain-lain ({viewingRecord.lainLain || 'Tambahan'}):</span>
                    <span>Rp {viewingRecord.nominalLainLain.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-stone-100 font-bold text-sm pt-2 border-t border-stone-800">
                  <span>PENGELUARAN TOTAL:</span>
                  <span className="text-rose-400">Rp {viewingRecord.totalNominal.toLocaleString('id-ID')}</span>
                </div>

                <div className="flex justify-between items-center text-blue-300 font-bold text-sm pt-1">
                  <span>CASH DIBERIKAN KE SOPIR:</span>
                  <span>Rp {Number(viewingRecord.nominalCashSopir || 0).toLocaleString('id-ID')}</span>
                </div>

                {/* Sisa Kas Sopir */}
                <div className={`p-3 rounded-xl border flex items-center justify-between mt-2 ${
                  Number(viewingRecord.sisaSelisihCash || 0) >= 0
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold block">
                      SISA CASH (CASH SOPIR - PENGELUARAN TOTAL):
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {Number(viewingRecord.sisaSelisihCash || 0) > 0 
                        ? 'Sisa uang disetor kembali ke kasir kantor'
                        : Number(viewingRecord.sisaSelisihCash || 0) === 0
                        ? 'Pengeluaran klop dengan uang jalan yang diberikan'
                        : 'Sopir nombor / kurang bayar (perlu diganti perusahaan)'}
                    </span>
                  </div>
                  <div className="text-base font-extrabold">
                    {Number(viewingRecord.sisaSelisihCash || 0) >= 0 ? '+' : ''}Rp {Number(viewingRecord.sisaSelisihCash || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {viewingRecord.catatan && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-400">
                  <span className="text-[10px] text-stone-500 block uppercase font-bold mb-1">Catatan:</span>
                  {viewingRecord.catatan}
                </div>
              )}

              <div className="pt-3 border-t border-stone-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL INPUT / EDIT OUT FIELD FUEL USED                       */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto my-auto animate-fadeIn">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100 font-mono">
                    {editingId ? 'EDIT DATA OUT FIELD FUEL' : 'FORM INPUT OUT FIELD FUEL USED'}
                  </h3>
                  <p className="text-xs text-stone-400 font-mono">
                    SPBU Luar Lapangan • PT BATU KALI WELANG AMPUH
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs font-mono">
              {/* 1. Tanggal dan Jam (Gform style & 24 jam) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
                <div>
                  <label className="block text-stone-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Tanggal Pengisian (Gform Style) *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">
                    Terpilih: {formatIndoDate(tanggal)}
                  </span>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Jam Pengisian (Format 24 Jam) *</span>
                  </label>
                  <TimeInput24Hour
                    value={jam}
                    onChange={(newJam) => setJam(newJam)}
                    className="w-full"
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">
                    Waktu operasi 00:00 s/d 23:59
                  </span>
                </div>
              </div>

              {/* 2 & 3. Jenis Alat & Kode SPBU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    2. Jenis Alat (Berdasarkan Modul 1) *
                  </label>
                  <select
                    value={selectedJenis}
                    onChange={(e) => {
                      const newJ = e.target.value;
                      setSelectedJenis(newJ);
                      const matching = units.filter((u) => (u.jenis || (u as any).category || '').trim().toUpperCase() === newJ.trim().toUpperCase());
                      if (matching.length > 0) {
                        setCnNew(getUnitCn(matching[0]));
                        setNamaAlat(getUnitName(matching[0]));
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="">-- Pilih Jenis Alat --</option>
                    {availableJenisList.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>3. Kode SPBU / Lokasi Pengisian *</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="spbu-preset-list"
                    value={kodeSpbu}
                    onChange={(e) => setKodeSpbu(e.target.value)}
                    placeholder="Contoh: SPBU 44.571.01 atau nama SPBU"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <datalist id="spbu-preset-list">
                    {COMMON_SPBU_PRESETS.map((sp) => (
                      <option key={sp} value={sp} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 4 & CN_NEW (dikelompokkan sesuai Jenis) & Nama Alat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    4. CN_NEW (Unit Terkelompok sesuai Jenis) *
                  </label>
                  <select
                    value={cnNew}
                    onChange={(e) => handleCnChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Pilih CN_NEW --</option>
                    {availableUnitsForJenis.map((u) => {
                      const cn = getUnitCn(u);
                      return (
                        <option key={cn} value={cn}>
                          {cn} - {getUnitName(u)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    Nama Alat (Otomatis Muncul)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={namaAlat}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-400 font-mono cursor-not-allowed"
                    placeholder="Otomatis dari CN_NEW terpilih"
                  />
                </div>
              </div>

              {/* Jml (Ltr) */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <label className="block text-amber-300 font-bold mb-1.5 text-xs">
                  Jumlah Pengisian Fuel (Liter) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={jmlLtr}
                    onChange={(e) => setJmlLtr(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 100"
                    className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 text-sm font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-300 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800">
                    LITER
                  </span>
                </div>
              </div>

              {/* 5 & 6. Job & Ritase di masing-masing pilihan */}
              <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-stone-300 font-bold text-xs">
                    5. Job Utama &amp; Jumlah Ritase di Masing-masing Pilihan *
                  </label>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    6. Total Ritase: {calculatedRitaseTotal} Rit
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">
                    Pilihan Job Dropdown:
                  </label>
                  <select
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value as OutFieldFuelJobType)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    {OUT_FIELD_FUEL_JOBS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-stone-850">
                  <span className="text-[10.5px] text-stone-400 block mb-2 font-mono">
                    Isi Ritase pada Job Terkait (Otomatis dijumlahkan):
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Batu Baik */}
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block truncate">Batu Baik</span>
                      <input
                        type="number"
                        min="0"
                        value={ritaseBatuBaik}
                        onChange={(e) => setRitaseBatuBaik(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Batu Pecelan */}
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block truncate">Batu Pecelan</span>
                      <input
                        type="number"
                        min="0"
                        value={ritaseBatuPecelan}
                        onChange={(e) => setRitaseBatuPecelan(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Imbal Tanah */}
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block truncate">Imbal Tanah</span>
                      <input
                        type="number"
                        min="0"
                        value={ritaseImbalTanah}
                        onChange={(e) => setRitaseImbalTanah(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Imbal Plant */}
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block truncate">Imbal Plant</span>
                      <input
                        type="number"
                        min="0"
                        value={ritaseImbalPlant}
                        onChange={(e) => setRitaseImbalPlant(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Lokasian */}
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block truncate">Lokasian</span>
                      <input
                        type="number"
                        min="0"
                        value={ritaseLokasian}
                        onChange={(e) => setRitaseLokasian(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Total Ritase Box */}
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col justify-center">
                      <span className="text-[10px] text-amber-300 font-bold block uppercase">Total Ritase</span>
                      <span className="text-base font-extrabold text-amber-400">{calculatedRitaseTotal} Rit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Subtotal Pembelian Fuel: Harga Solar x Jml (Ltr) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
                <div>
                  <label className="block text-stone-300 font-bold mb-1.5 flex items-center justify-between">
                    <span>7. Harga Solar per Liter (Rp)</span>
                    {isDev && (
                      <span className="text-[9px] text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/40">
                        Developer Access
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="100"
                    readOnly={!isDev}
                    value={customHargaSolar}
                    onChange={(e) => setCustomHargaSolar(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-xl text-stone-200 font-mono ${
                      isDev 
                        ? 'bg-stone-950 border-purple-500/60 focus:border-purple-400' 
                        : 'bg-stone-900 border-stone-800 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">
                    {isDev ? 'Akun Developer dapat merubah harga solar acuan ini' : 'Harga solar standar acuan'}
                  </span>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    Subtotal Solar (Jml Ltr x Harga)
                  </label>
                  <div className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 text-sm font-bold font-mono">
                    Rp {calculatedSubtotalFuel.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-stone-500 block mt-1">
                    {Number(jmlLtr) || 0} Ltr x Rp {Number(customHargaSolar || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* ANGKA PEMBULATAN DARI PEMBELIAN SOLAR SPBU */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block text-amber-300 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Angka Pembulatan dari Pembelian Solar (+/- Rp)</span>
                    </label>
                    <span className="text-[10.5px] text-stone-400 block">
                      Sesuaikan selisih pembulatan kasir/struk SPBU (bisa ketik angka atau tombol cepat di bawah)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block uppercase">Nominal Solar Setelah Pembulatan</span>
                    <span className="text-sm font-extrabold text-amber-400">
                      Rp {calculatedFuelSetelahPembulatan.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10.5px] text-stone-400 block mb-1">
                      Input Angka Pembulatan (+/- Rp):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={angkaPembulatan}
                        onChange={(e) => setAngkaPembulatan(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Contoh: 400 atau 1000 atau -200"
                        className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-stone-400 px-2 py-2 rounded-xl bg-stone-950 border border-stone-800">
                        Rp
                      </span>
                    </div>
                  </div>

                  {/* Tombol Cepat Pembulatan Otomatis */}
                  <div>
                    <span className="text-[10.5px] text-stone-400 block mb-1">
                      Pilihan Cepat Pembulatan:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAutoRound('ceil_1k')}
                        className="px-2 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10.5px] text-amber-300 border border-stone-800 text-left truncate transition"
                        title="Bulatkan ke atas ke kelipatan Rp 1.000 terdekat"
                      >
                        + Ceil Rp 1.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoRound('round_1k')}
                        className="px-2 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10.5px] text-stone-300 border border-stone-800 text-left truncate transition"
                        title="Bulatkan ke kelipatan Rp 1.000 terdekat"
                      >
                        ~ Round Rp 1.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoRound('round_10k')}
                        className="px-2 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10.5px] text-stone-300 border border-stone-800 text-left truncate transition"
                        title="Bulatkan ke kelipatan Rp 10.000 terdekat"
                      >
                        ~ Round Rp 10.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoRound('zero')}
                        className="px-2 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10.5px] text-stone-400 border border-stone-800 text-left truncate transition"
                        title="Reset pembulatan ke Rp 0"
                      >
                        Reset (Rp 0)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8 & 9. Lain Lain (Text) & Nominal Lain-lain (Currency Rp) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800">
                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    8. Lain Lain (Keterangan Pengeluaran Tambahan)
                  </label>
                  <input
                    type="text"
                    value={lainLain}
                    onChange={(e) => setLainLain(e.target.value)}
                    placeholder="Contoh: Parkir, toll, tambah angin, dll."
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1.5">
                    9. Nominal Lain Lain (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nominalLainLain}
                    onChange={(e) => setNominalLainLain(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 10. TOTAL PENGELUARAN (Solar Net + Lain-lain) */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-mono text-stone-400 uppercase block">
                    10. PENGELUARAN TOTAL (SOLAR + PEMBULATAN + LAIN-LAIN)
                  </span>
                  <span className="text-xs text-stone-500">
                    Rp {calculatedFuelSetelahPembulatan.toLocaleString('id-ID')} + Rp {(Number(nominalLainLain) || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-400">
                  Rp {calculatedTotalPengeluaran.toLocaleString('id-ID')}
                </div>
              </div>

              {/* PEMBAYARAN CASH KE SOPIR & REKONSILIASI KAS */}
              {/* Formula: Nominal cash yg di berikan sopir - pengeluaran total */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-stone-950 to-stone-950 border border-blue-500/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                    PEMBAYARAN CASH KE SOPIR &amp; REKONSILIASI KAS JALAN
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-300 font-bold mb-1.5">
                      Nominal Uang Cash yang Diberikan ke Sopir (Rp) *
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-blue-300 font-bold">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={nominalCashSopir}
                        onChange={(e) => setNominalCashSopir(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Contoh: 700000"
                        className="flex-1 px-3 py-2 bg-stone-900 border border-blue-500/40 rounded-xl text-blue-300 text-sm font-bold font-mono focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <span className="text-[10px] text-stone-500 block mt-1">
                      Uang jalan / kasbon pembelian solar yang diserahkan ke driver
                    </span>
                  </div>

                  {/* Box Rekonsiliasi: Nominal Cash - Pengeluaran Total */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    calculatedSisaSelisihCash > 0
                      ? 'bg-emerald-950/50 border-emerald-500/50'
                      : calculatedSisaSelisihCash === 0
                      ? 'bg-stone-900/80 border-stone-700'
                      : 'bg-rose-950/50 border-rose-500/50'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          Sisa Selisih Kas Sopir:
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          calculatedSisaSelisihCash > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : calculatedSisaSelisihCash === 0
                            ? 'bg-stone-700 text-stone-300'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {calculatedSisaSelisihCash > 0 ? 'Sisa Kembali' : calculatedSisaSelisihCash === 0 ? 'Pas / Klop' : 'Kurang Bayar'}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-stone-500 block mt-0.5">
                        (Nominal Cash Sopir - Pengeluaran Total)
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs text-stone-400">
                        Rp {Number(nominalCashSopir || 0).toLocaleString('id-ID')} - Rp {calculatedTotalPengeluaran.toLocaleString('id-ID')} =
                      </span>
                      <span className={`text-base font-black ${
                        calculatedSisaSelisihCash > 0
                          ? 'text-emerald-400'
                          : calculatedSisaSelisihCash === 0
                          ? 'text-stone-300'
                          : 'text-rose-400'
                      }`}>
                        {calculatedSisaSelisihCash > 0 ? '+' : ''}Rp {calculatedSisaSelisihCash.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Driver / Operator & Sinkronisasi Jabatan Modul 2 */}
              <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Data Driver / Operator (Sinkron Modul 2 Manpower)
                  </span>
                  {getMatchedManpower(namaOperator)?.statusKaryawan && (
                    <span className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                      Status: {getMatchedManpower(namaOperator)?.statusKaryawan}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">
                      Nama Operator / Driver *
                    </label>
                    {manpowerList.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={namaOperator}
                          onChange={(e) => handleDriverNameChange(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                        >
                          <option value="">-- Pilih dari Data Manpower --</option>
                          {manpowerList.map((m) => (
                            <option key={m.id} value={m.nama}>
                              {m.nama} — {m.jabatan || 'Tanpa Jabatan'} {m.statusKaryawan ? `(${m.statusKaryawan})` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-stone-500 shrink-0">Atau manual:</span>
                          <input
                            type="text"
                            value={namaOperator}
                            onChange={(e) => handleDriverNameChange(e.target.value)}
                            placeholder="Ketik nama sopir..."
                            className="flex-1 px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={namaOperator}
                        onChange={(e) => handleDriverNameChange(e.target.value)}
                        placeholder="Contoh: Slamet Riyadi"
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-stone-300 font-bold mb-1">
                      Jabatan Driver / Operator *
                    </label>
                    <select
                      value={jabatanOperator}
                      onChange={(e) => setJabatanOperator(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="">-- Pilih Jabatan --</option>
                      {MANPOWER_JABATAN_OPTIONS.map((jab) => (
                        <option key={jab} value={jab}>{jab}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-stone-500 block mt-1">
                      {getMatchedManpower(namaOperator) 
                        ? '✓ Otomatis cocok dengan database Modul 2 Manpower' 
                        : 'Pilih jabatan yang sesuai'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Catatan Tambahan:</label>
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Keterangan opsional pengisian solar SPBU"
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-mono tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Data Out Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL SETTING HARGA SOLAR BAKU (DEVELOPER ACCESS ONLY)      */}
      {/* ============================================================ */}
      {showPriceSettingModal && isDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-stone-900 border border-purple-500/40 rounded-3xl shadow-2xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-stone-100 font-mono">
                  SETTING HARGA SOLAR ACUAN
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPriceSettingModal(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStandardSolarPrice} className="space-y-4 pt-4 text-xs font-mono">
              <p className="text-stone-400 leading-relaxed">
                Akun Developer memiliki hak merubah harga solar acuan per liter yang akan otomatis dijadikan default pada saat input transaksi SPBU luar.
              </p>

              <div>
                <label className="block text-stone-300 font-bold mb-1.5">
                  Harga Solar per Liter (Rp) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-purple-300 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={tempSolarPrice}
                    onChange={(e) => setTempSolarPrice(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-stone-950 border border-purple-500/50 rounded-xl text-stone-100 text-sm font-bold font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPriceSettingModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-600/30"
                >
                  Simpan Harga Solar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
