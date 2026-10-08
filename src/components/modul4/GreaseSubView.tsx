import React, { useState, useMemo } from 'react';
import { 
  HeavyEquipment, 
  ManpowerData, 
  GreaseStockRecord, 
  GreaseDistributionRecord, 
  UserAccount,
  DEFAULT_GREASE_TYPES,
  SupplierRecord
} from '../../types';
import { 
  isDeveloper, 
  canUserInsertModule, 
  canUserEditModule, 
  canUserDeleteModule, 
  canUserExportModule 
} from '../../utils/storage';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Truck, 
  Edit3, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Package, 
  Wrench,
  Layers,
  Building2,
  Lock,
  Eye
} from 'lucide-react';

interface GreaseSubViewProps {
  units: HeavyEquipment[];
  manpowerList: ManpowerData[];
  suppliers: SupplierRecord[];
  greaseStocks: GreaseStockRecord[];
  greaseDistributions: GreaseDistributionRecord[];
  currentUser: UserAccount;
  onSaveStock: (
    data: Omit<GreaseStockRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseStockRecord };
  onDeleteStock: (id: string) => { success: boolean; message: string };
  onSaveDistribution: (
    data: Omit<GreaseDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: GreaseDistributionRecord };
  onDeleteDistribution: (id: string) => { success: boolean; message: string };
}

const GREASE_LOKASI_PRESETS = [
  'Pin & Bushing Bucket',
  'Boom & Arm Cylinder Pin',
  'Swing Bearing & Gear',
  'Chassis & Propeller Shaft',
  'Wheel Hub & Kingpin',
  'Track Tensioner / Idler',
  'Trunnion & Equalizer Bar',
  'Drive Shaft Universal Joint',
  'General Greasing Unit',
];

export const GreaseSubView: React.FC<GreaseSubViewProps> = ({
  units,
  manpowerList,
  suppliers,
  greaseStocks,
  greaseDistributions,
  currentUser,
  onSaveStock,
  onDeleteStock,
  onSaveDistribution,
  onDeleteDistribution,
}) => {
  const isDev = isDeveloper(currentUser);
  const canInput = isDev || canUserInsertModule(currentUser, 4);
  const canEdit = isDev || canUserEditModule(currentUser, 4);
  const canDelete = isDev || canUserDeleteModule(currentUser, 4);
  const canExport = isDev || canUserExportModule(currentUser, 4);

  // Tab internal: 'dist' (Pemakaian Unit) or 'stock' (Penerimaan Gudang)
  const [activeTab, setActiveTab] = useState<'dist' | 'stock'>('dist');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields for Grease Distribution
  const [distTanggal, setDistTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [distJam, setDistJam] = useState('08:00');
  const [distSelectedJenis, setDistSelectedJenis] = useState('');
  const [distNoUnit, setDistNoUnit] = useState('');
  const [distNamaAlat, setDistNamaAlat] = useState('');
  const [distHmUnit, setDistHmUnit] = useState<number | ''>(0);
  const [distNamaGrease, setDistNamaGrease] = useState('');
  const [distQty, setDistQty] = useState<number | ''>(2);
  const [distSatuan, setDistSatuan] = useState<'Kg' | 'Pail' | 'Tube'>('Kg');
  const [distLokasi, setDistLokasi] = useState('Pin & Bushing Bucket');
  const [distPicMekanik, setDistPicMekanik] = useState('');
  const [distRemark, setDistRemark] = useState('');

  // Form Fields for Grease Stock Input
  const [stockDistributor, setStockDistributor] = useState(suppliers[0]?.nama || 'PT Pertamina Lubricants');
  const [stockTanggal, setStockTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [stockJam, setStockJam] = useState('09:00');
  const [stockNamaGrease, setStockNamaGrease] = useState('');
  const [stockQty, setStockQty] = useState<number | ''>(1);
  const [stockSatuan, setStockSatuan] = useState<'Kg' | 'Pail' | 'Drum'>('Pail');
  const [stockPicGudang, setStockPicGudang] = useState('');
  const [stockRemark, setStockRemark] = useState('');

  // Unit helper
  const getUnitCn = (u: any): string => u?.cnNew || u?.codeNumber || u?.kodeUnit || '';
  const getUnitJenis = (u: any): string => (u?.jenis || u?.category || '').trim();
  const getUnitName = (u: any): string => u?.namaAlat || `${u?.brandMerk || u?.brand || ''} ${u?.modelUnit || u?.model || ''}`.trim() || getUnitCn(u);

  // 1. Daftar Jenis Alat berdasarkan "JENIS" di Modul 1
  const availableJenisList = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u: any) => {
      const j = getUnitJenis(u);
      if (j) set.add(j);
    });
    if (set.size === 0) {
      return ['Dump Truck', 'Excavator', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support'];
    }
    return Array.from(set).sort();
  }, [units]);

  // 2. Daftar Unit terfilter per jenis
  const availableUnitsForDistJenis = useMemo(() => {
    if (!distSelectedJenis) return units;
    return units.filter((u: any) => getUnitJenis(u).toLowerCase() === distSelectedJenis.trim().toLowerCase());
  }, [units, distSelectedJenis]);

  const handleDistJenisChange = (newJenis: string) => {
    setDistSelectedJenis(newJenis);
    // User requested: "Jenis baru , CN_NEW baru nama alat otomatis"
    setDistNoUnit('');
    setDistNamaAlat('');
    setDistHmUnit('');
  };

  const handleUnitSelect = (cn: string) => {
    setDistNoUnit(cn);
    const target = units.find((u: any) => getUnitCn(u).trim().toUpperCase() === cn.trim().toUpperCase());
    if (target) {
      setDistNamaAlat(getUnitName(target));
      const j = getUnitJenis(target);
      if (j && (!distSelectedJenis || distSelectedJenis.toLowerCase() !== j.toLowerCase())) {
        setDistSelectedJenis(j);
      }
      const hours = (target as any).currentHours || (target as any).lastHm || (target as any).hm || 0;
      if (hours && (!distHmUnit || distHmUnit === 0)) {
        setDistHmUnit(hours);
      }
    } else {
      setDistNamaAlat('');
    }
  };

  // Filter PIC Mekanik: HANYA jabatan Mekanik / Helper Mekanik
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const greaseMechanics = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').trim().toUpperCase();
      return jab === 'MEKANIK' || 
             jab === 'HELPER MEKANIK' || 
             jab.includes('MEKANIK') || 
             jab.includes('MECHANIC');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [manpowerList]);

  const effectiveGreaseMechanics = greaseMechanics.length > 0 
    ? greaseMechanics 
    : [...manpowerList].sort((a, b) => {
        const cmp = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
        if (cmp !== 0) return cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });

  // Filter PIC Gudang: HANYA jabatan Administrasi dan Kabag Workshop
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const greaseWarehouseStaff = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').trim().toUpperCase();
      return jab === 'ADMINISTRASI' || 
             jab === 'KABAG WORKSHOP' || 
             jab.includes('ADMINISTRASI') || 
             jab.includes('ADMIN') || 
             jab.includes('KABAG');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [manpowerList]);

  const effectiveGreaseWarehouse = greaseWarehouseStaff.length > 0 
    ? greaseWarehouseStaff 
    : [...manpowerList].sort((a, b) => {
        const cmp = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
        if (cmp !== 0) return cmp;
        return (a.nama || '').localeCompare(b.nama || '', 'id');
      });

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingId(null);
    if (activeTab === 'dist') {
      setDistTanggal(new Date().toISOString().split('T')[0]);
      setDistJam('08:00');
      setDistSelectedJenis('');
      setDistNoUnit('');
      setDistNamaAlat('');
      setDistHmUnit('');
      setDistNamaGrease('');
      setDistQty(2);
      setDistSatuan('Kg');
      setDistLokasi(GREASE_LOKASI_PRESETS[0]);
      const defaultMek = effectiveGreaseMechanics[0];
      setDistPicMekanik(defaultMek?.nama || '');
      setDistRemark('');
    } else {
      setStockTanggal(new Date().toISOString().split('T')[0]);
      setStockJam('09:00');
      setStockDistributor(suppliers[0]?.nama || 'PT Pertamina Lubricants');
      setStockNamaGrease('');
      setStockQty(1);
      setStockSatuan('Pail');
      const defaultGud = effectiveGreaseWarehouse[0];
      setStockPicGudang(defaultGud?.nama || currentUser.fullName || currentUser.username);
      setStockRemark('');
    }
    setShowModal(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'dist') {
      if (!distNoUnit || !distQty) {
        setFeedback({ type: 'error', text: 'Unit dan Jumlah Qty wajib diisi!' });
        return;
      }
      const res = onSaveDistribution({
        tanggal: distTanggal,
        jam: distJam,
        noUnit: distNoUnit,
        namaAlat: distNamaAlat,
        hmUnit: Number(distHmUnit) || 0,
        namaGrease: distNamaGrease,
        qty: Number(distQty) || 0,
        satuan: distSatuan,
        lokasiPelumasan: distLokasi,
        picMekanik: distPicMekanik,
        remark: distRemark,
      }, editingId || undefined);

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setShowModal(false);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } else {
      if (!stockDistributor || !stockQty) {
        setFeedback({ type: 'error', text: 'Distributor dan Jumlah Qty wajib diisi!' });
        return;
      }
      const res = onSaveStock({
        distributor: stockDistributor,
        tanggal: stockTanggal,
        jam: stockJam,
        namaGrease: stockNamaGrease,
        qty: Number(stockQty) || 0,
        satuan: stockSatuan,
        picGudang: stockPicGudang,
        remark: stockRemark,
      }, editingId || undefined);

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setShowModal(false);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
  };

  // Filtered lists
  const filteredDistributions = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return greaseDistributions.filter(d => 
      d.noUnit.toLowerCase().includes(q) ||
      d.namaAlat.toLowerCase().includes(q) ||
      d.namaGrease.toLowerCase().includes(q) ||
      (d.picMekanik || '').toLowerCase().includes(q) ||
      (d.lokasiPelumasan || '').toLowerCase().includes(q)
    );
  }, [greaseDistributions, searchTerm]);

  const filteredStocks = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return greaseStocks.filter(s => 
      s.distributor.toLowerCase().includes(q) ||
      s.namaGrease.toLowerCase().includes(q) ||
      (s.picGudang || '').toLowerCase().includes(q)
    );
  }, [greaseStocks, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'dist') {
      const headers = ['NO BON', 'TANGGAL', 'JAM', 'NO UNIT', 'NAMA ALAT', 'HM', 'NAMA GREASE', 'QTY', 'SATUAN', 'LOKASI PELUMASAN', 'PIC MEKANIK', 'REMARK'];
      const rows = filteredDistributions.map(d => [
        `"${d.noBon || ''}"`,
        `"${d.tanggal}"`,
        `"${d.jam}"`,
        `"${d.noUnit}"`,
        `"${d.namaAlat}"`,
        `"${d.hmUnit}"`,
        `"${d.namaGrease}"`,
        `"${d.qty}"`,
        `"${d.satuan}"`,
        `"${d.lokasiPelumasan}"`,
        `"${d.picMekanik}"`,
        `"${d.remark || ''}"`,
      ]);
      const csv = '\uFEFF' + [
        `"PT BATU KALI WELANG AMPUH - LAPORAN DISTRIBUSI & PEMAKAIAN GREASE"`,
        `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredDistributions.length}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Distribusi_Grease_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const headers = ['DISTRIBUTOR', 'TANGGAL', 'JAM', 'NAMA GREASE', 'QTY', 'SATUAN', 'PIC GUDANG', 'REMARK'];
      const rows = filteredStocks.map(s => [
        `"${s.distributor}"`,
        `"${s.tanggal}"`,
        `"${s.jam}"`,
        `"${s.namaGrease}"`,
        `"${s.qty}"`,
        `"${s.satuan}"`,
        `"${s.picGudang}"`,
        `"${s.remark || ''}"`,
      ]);
      const csv = '\uFEFF' + [
        `"PT BATU KALI WELANG AMPUH - LAPORAN PENERIMAAN STOK GREASE GUDANG"`,
        `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredStocks.length}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stok_Grease_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' 
            : 'bg-red-950/80 border-red-800 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:bg-stone-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                KOLOM GREASE
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>MANAJEMEN GREASE (GEMUK PELUMAS PADAT)</span>
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              Penerimaan stok gudang (Drum/Pail) dan pencatatan bon pemakaian pelumasan grease per komponen unit alat berat (Pin & Bushing, Chassis, Wheel Hub).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canExport && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono font-bold border border-stone-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-stone-400" />
                <span>Export CSV</span>
              </button>
            )}

            {canInput && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold font-mono transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{activeTab === 'dist' ? '+ Catat Bon Pemakaian' : '+ Input Stok Masuk'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Pemakaian vs Stok Masuk */}
        <div className="flex items-center gap-2 mt-5 border-t border-stone-800/80 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('dist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
              activeTab === 'dist'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>1. Bon Pemakaian Grease Unit ({greaseDistributions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Input Stok Masuk Gudang ({greaseStocks.length})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'dist' ? 'Cari unit alat, jenis grease, mekanik...' : 'Cari distributor, nama grease, PIC...'}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Main Table: Distribution or Stock */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {activeTab === 'dist' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3.5">NO BON</th>
                  <th className="py-3 px-3.5">WAKTU</th>
                  <th className="py-3 px-3.5">CN UNIT & ALAT</th>
                  <th className="py-3 px-3.5">HM</th>
                  <th className="py-3 px-3.5">JENIS GREASE</th>
                  <th className="py-3 px-3.5">QTY</th>
                  <th className="py-3 px-3.5">LOKASI PELUMASAN</th>
                  <th className="py-3 px-3.5">MEKANIK</th>
                  <th className="py-3 px-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-500 text-xs">
                      Belum ada data bon pemakaian grease. Klik tombol "+ Catat Bon Pemakaian" di atas.
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map((d) => (
                    <tr key={d.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3.5 font-bold text-amber-400">{d.noBon || '-'}</td>
                      <td className="py-3 px-3.5 text-stone-400">{d.tanggal} {d.jam}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-stone-100">{d.noUnit}</span>
                        <span className="block text-[10px] text-stone-400 truncate max-w-[140px]">{d.namaAlat}</span>
                      </td>
                      <td className="py-3 px-3.5 text-stone-300">{d.hmUnit}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-semibold">
                          {d.namaGrease}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-amber-300">{d.qty} {d.satuan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{d.lokasiPelumasan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{d.picMekanik}</td>
                      <td className="py-3 px-3.5 text-center">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus bon grease unit ${d.noUnit}?`)) {
                                const res = onDeleteDistribution(d.id);
                                if (res.success) setFeedback({ type: 'success', text: res.message });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3.5">DISTRIBUTOR / VENDOR</th>
                  <th className="py-3 px-3.5">TANGGAL & JAM</th>
                  <th className="py-3 px-3.5">NAMA GREASE</th>
                  <th className="py-3 px-3.5">JUMLAH STOK MASUK</th>
                  <th className="py-3 px-3.5">PIC GUDANG</th>
                  <th className="py-3 px-3.5">REMARK</th>
                  <th className="py-3 px-3.5 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500 text-xs">
                      Belum ada data stok masuk grease. Klik tombol "+ Input Stok Masuk" di atas.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-3 px-3.5 font-bold text-stone-100">{s.distributor}</td>
                      <td className="py-3 px-3.5 text-stone-400">{s.tanggal} {s.jam}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-semibold">
                          {s.namaGrease}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-emerald-400">{s.qty} {s.satuan}</td>
                      <td className="py-3 px-3.5 text-stone-300">{s.picGudang}</td>
                      <td className="py-3 px-3.5 text-stone-400 text-[11px] truncate max-w-xs">{s.remark || '-'}</td>
                      <td className="py-3 px-3.5 text-center">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus stok masuk grease ${s.namaGrease}?`)) {
                                const res = onDeleteStock(s.id);
                                if (res.success) setFeedback({ type: 'success', text: res.message });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-stone-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>{activeTab === 'dist' ? 'FORM BON PEMAKAIAN GREASE' : 'FORM INPUT STOK GREASE MASUK'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {activeTab === 'dist' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={distTanggal}
                        onChange={(e) => setDistTanggal(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Jam</label>
                      <input
                        type="time"
                        required
                        value={distJam}
                        onChange={(e) => setDistJam(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                  </div>

                  {/* Reff Unit Alat Berat (Modul 1 Asset) */}
                  <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 space-y-3">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                      Reff Unit Alat Berat (Modul 1 Asset)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-400 mb-1">1. Jenis Alat (Modul 1) *</label>
                        <select
                          value={distSelectedJenis}
                          onChange={(e) => handleDistJenisChange(e.target.value)}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                        >
                          <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                          {availableJenisList.map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-stone-400 mb-1">2. CN_NEW (Unit) *</label>
                        <select
                          required
                          value={distNoUnit}
                          onChange={(e) => handleUnitSelect(e.target.value)}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                        >
                          <option value="">
                            {distSelectedJenis 
                              ? `-- Pilih CN_NEW (${distSelectedJenis}) --` 
                              : '-- Pilih CN_NEW (Semua Jenis) --'}
                          </option>
                          {distSelectedJenis ? (
                            availableUnitsForDistJenis.map((u: any) => {
                              const cn = getUnitCn(u);
                              return (
                                <option key={u.id || cn} value={cn}>
                                  {cn} — {getUnitName(u)}
                                </option>
                              );
                            })
                          ) : (
                            availableJenisList.map((j) => {
                              const matches = units.filter((u: any) => getUnitJenis(u).toLowerCase() === j.toLowerCase());
                              if (matches.length === 0) return null;
                              return (
                                <optgroup key={j} label={`Kelompok: ${j}`}>
                                  {matches.map((u: any) => {
                                    const cn = getUnitCn(u);
                                    return (
                                      <option key={u.id || cn} value={cn}>
                                        {cn} — {getUnitName(u)}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              );
                            })
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-400 mb-1">Nama Alat (Otomatis)</label>
                        <input
                          type="text"
                          readOnly
                          value={distNamaAlat}
                          placeholder="Otomatis dari CN_NEW terpilih"
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-300 font-medium cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-400 mb-1">HM Unit Saat Greasing</label>
                        <input
                          type="number"
                          value={distHmUnit}
                          onChange={(e) => setDistHmUnit(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-stone-400 mb-1">Nama Jenis Grease (Input Bebas Manual) *</label>
                      <input
                        type="text"
                        required
                        list="grease-dist-types-list"
                        placeholder="Ketik manual jenis grease (contoh: Pertamina Grease Chassis, Shell Gadus, dll.)"
                        value={distNamaGrease}
                        onChange={(e) => setDistNamaGrease(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                      />
                      <datalist id="grease-dist-types-list">
                        {DEFAULT_GREASE_TYPES.map((g) => (
                          <option key={g} value={g} />
                        ))}
                        <option value="Pertamina Grease Chassis NLGI 2" />
                        <option value="Pertamina EP Grease NLGI 2" />
                        <option value="Shell Gadus S2 V220 2" />
                        <option value="Mobilgrease XHP 222" />
                        <option value="Castrol Spheerol EPL 2" />
                        <option value="Total Multis EP 2" />
                      </datalist>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        Bebas diketik manual atau klik saran jenis grease
                      </span>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Qty Pemakaian</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={distQty}
                          onChange={(e) => setDistQty(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-center font-bold"
                        />
                        <span className="text-stone-400 text-xs">Kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Titik / Lokasi Pelumasan</label>
                      <select
                        value={distLokasi}
                        onChange={(e) => setDistLokasi(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      >
                        {GREASE_LOKASI_PRESETS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-1 flex items-center justify-between">
                        <span>PIC Mekanik *</span>
                        <span className="text-[10px] text-amber-400 font-mono">Khusus Mekanik</span>
                      </label>
                      <select
                        value={distPicMekanik}
                        onChange={(e) => setDistPicMekanik(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs"
                      >
                        <option value="">-- Pilih PIC Mekanik (Hanya Mekanik - Urut Abjad) --</option>
                        {effectiveGreaseMechanics.map((m) => (
                          <option key={m.id} value={m.nama}>
                            [{m.jabatan}] {m.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Keterangan / Remark</label>
                    <input
                      type="text"
                      value={distRemark}
                      onChange={(e) => setDistRemark(e.target.value)}
                      placeholder="Catatan servis rutin, grease gun manual/pneumatic..."
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={stockTanggal}
                        onChange={(e) => setStockTanggal(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Jam</label>
                      <input
                        type="time"
                        required
                        value={stockJam}
                        onChange={(e) => setStockJam(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Distributor / Suplier</label>
                    <select
                      value={stockDistributor}
                      onChange={(e) => setStockDistributor(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.nama}>{s.nama} ({s.telepon})</option>
                      ))}
                      <option value="PT Pertamina Lubricants">PT Pertamina Lubricants</option>
                      <option value="PT Shell Indonesia">PT Shell Indonesia</option>
                      <option value="PT Traktor Nusantara">PT Traktor Nusantara</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-stone-400 mb-1">Jenis Grease (Input Bebas Manual) *</label>
                      <input
                        type="text"
                        required
                        list="grease-stock-types-list"
                        placeholder="Ketik manual jenis grease (contoh: Pertamina Grease Chassis, Shell Gadus, dll.)"
                        value={stockNamaGrease}
                        onChange={(e) => setStockNamaGrease(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-amber-400 font-bold"
                      />
                      <datalist id="grease-stock-types-list">
                        {DEFAULT_GREASE_TYPES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                        <option value="Pertamina Grease Chassis NLGI 2" />
                        <option value="Pertamina EP Grease NLGI 2" />
                        <option value="Shell Gadus S2 V220 2" />
                        <option value="Mobilgrease XHP 222" />
                        <option value="Castrol Spheerol EPL 2" />
                        <option value="Total Multis EP 2" />
                      </datalist>
                      <span className="text-[10px] text-stone-500 mt-1 block">
                        Bebas diketik manual atau klik saran jenis grease
                      </span>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">Qty</label>
                      <input
                        type="number"
                        required
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">Satuan Kemasan</label>
                      <select
                        value={stockSatuan}
                        onChange={(e) => setStockSatuan(e.target.value as any)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                      >
                        <option value="Pail">Pail (15 Kg)</option>
                        <option value="Drum">Drum (180 Kg)</option>
                        <option value="Kg">Kg</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1 flex items-center justify-between">
                        <span>PIC Penerima Gudang *</span>
                        <span className="text-[10px] text-blue-400 font-mono">Administrasi &amp; Kabag</span>
                      </label>
                      <select
                        value={stockPicGudang}
                        onChange={(e) => setStockPicGudang(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs"
                      >
                        <option value="">-- Pilih PIC Gudang (Hanya Administrasi &amp; Kabag - Urut Abjad) --</option>
                        {effectiveGreaseWarehouse.map((m) => (
                          <option key={m.id} value={m.nama}>
                            [{m.jabatan}] {m.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">Keterangan / No Surat Jalan</label>
                    <input
                      type="text"
                      value={stockRemark}
                      onChange={(e) => setStockRemark(e.target.value)}
                      placeholder="No PO / DO pengiriman supplier..."
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-100"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
