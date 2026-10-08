import React, { useState, useMemo } from 'react';
import { 
  OilDistributionRecord, 
  HeavyEquipment, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Droplet, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  FileText,
  AlertTriangle,
  Download
} from 'lucide-react';

interface OilDistributionSubViewProps {
  oilDistributions: OilDistributionRecord[];
  equipmentList: HeavyEquipment[];
  manpowerList: ManpowerData[];
  availableOilTypes: string[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<OilDistributionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: OilDistributionRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const OilDistributionSubView: React.FC<OilDistributionSubViewProps> = ({
  oilDistributions,
  equipmentList,
  manpowerList,
  availableOilTypes,
  currentUser,
  onSave,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Sesuai Instruksi User:
  // 1. No Unit (Dropdown sesuai CN di Modul 1)
  // 2. HM unit
  // 3. Jenis Oli (dropdown TURALIK 52 PERTAMINA, RORED HDA SAE 90, SAE 15W 40, ATF, dll.)
  // 4. Qty
  // 5. Rincian Kerusakan
  // 6. PIC Mekanik (dropdown reff Manpower di modul 2)
  // 7. PIC Gudang Material (dropdown reff Manpower di modul 2)
  const [noBon, setNoBon] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');
  const [noUnit, setNoUnit] = useState('');
  const [namaUnit, setNamaUnit] = useState('');
  const [hmUnit, setHmUnit] = useState<number | ''>('');
  const [jenisOli, setJenisOli] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [satuan, setSatuan] = useState('Ltr');
  const [rincianKerusakan, setRincianKerusakan] = useState('');
  const [picMekanik, setPicMekanik] = useState('');
  const [picMekanikJabatan, setPicMekanikJabatan] = useState('');
  const [picGudangMaterial, setPicGudangMaterial] = useState('');
  const [picGudangJabatan, setPicGudangJabatan] = useState('');
  const [remark, setRemark] = useState('');

  // Unit Helper
  const getUnitCn = (u: any): string => u?.cnNew || u?.codeNumber || u?.kodeUnit || '';
  const getUnitJenis = (u: any): string => (u?.jenis || u?.category || '').trim();
  const getUnitName = (u: any): string => u?.namaAlat || `${u?.brandMerk || u?.brand || ''} ${u?.modelUnit || u?.model || ''}`.trim() || getUnitCn(u);

  // 1. Daftar Jenis Alat berdasarkan "JENIS" di Modul 1
  const availableJenisList = useMemo(() => {
    const set = new Set<string>();
    equipmentList.forEach((u: any) => {
      const j = getUnitJenis(u);
      if (j) set.add(j);
    });
    if (set.size === 0) {
      return ['Dump Truck', 'Excavator', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support'];
    }
    return Array.from(set).sort();
  }, [equipmentList]);

  // 2. Daftar Unit yang terfilter berdasarkan Jenis yang dipilih
  const availableUnitsForSelectedJenis = useMemo(() => {
    if (!selectedJenis) return equipmentList;
    return equipmentList.filter((u: any) => {
      const j = getUnitJenis(u);
      return j.toLowerCase() === selectedJenis.trim().toLowerCase();
    });
  }, [equipmentList, selectedJenis]);

  // Filter mekanik: HANYA jabatan Mekanik / Helper Mekanik
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const mechanics = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').toUpperCase();
      return jab === 'MEKANIK' || 
             jab === 'HELPER MEKANIK' || 
             jab.includes('MEKANIK') || 
             jab.includes('MECHANIC') ||
             jab.includes('TEKNISI');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '');
    });
  }, [manpowerList]);

  const effectiveMechanics = mechanics.length > 0 ? mechanics : [...manpowerList].sort((a, b) => {
    const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '');
    if (cmpJabatan !== 0) return cmpJabatan;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  // Filter gudang: HANYA jabatan Administrasi dan Kabag
  // Diurutkan berdasarkan Jabatan terlebih dahulu, lalu sesuai Abjad Nama
  const warehouseStaff = useMemo(() => {
    const list = manpowerList.filter((m) => {
      const jab = (m.jabatan || '').toUpperCase();
      return jab === 'ADMINISTRASI' || 
             jab === 'KABAG WORKSHOP' || 
             jab.includes('ADMINISTRASI') || 
             jab.includes('ADMIN') || 
             jab.includes('KABAG');
    });
    return list.sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '');
    });
  }, [manpowerList]);

  const effectiveWarehouse = warehouseStaff.length > 0 ? warehouseStaff : [...manpowerList].sort((a, b) => {
    const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '');
    if (cmpJabatan !== 0) return cmpJabatan;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  const handleJenisChange = (newJenis: string) => {
    setSelectedJenis(newJenis);
    // User requested: "Jenis baru , CN_NEW baru nama alat otomatis"
    // Reset CN_NEW dan Nama Alat saat memilih Jenis Alat baru agar user memilih CN_NEW yang sesuai
    setNoUnit('');
    setNamaUnit('');
    setHmUnit('');
  };

  const handleNoUnitChange = (cn: string) => {
    setNoUnit(cn);
    const eq = equipmentList.find((e) => getUnitCn(e).trim().toUpperCase() === cn.trim().toUpperCase());
    if (eq) {
      setNamaUnit(getUnitName(eq));
      const j = getUnitJenis(eq);
      if (j && (!selectedJenis || selectedJenis.toLowerCase() !== j.toLowerCase())) {
        setSelectedJenis(j);
      }
      const hours = (eq as any).currentHours || (eq as any).lastHm || (eq as any).hm;
      if (hours && (!hmUnit || hmUnit === 0)) {
        setHmUnit(hours);
      }
    } else {
      setNamaUnit('');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const bonNumber = `BON-OLI-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`;
    setNoBon(bonNumber);

    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));

    // Dimulai dari Jenis kosong agar alur cascade berjalan: Jenis -> CN_NEW -> Nama Alat Otomatis
    setSelectedJenis('');
    setNoUnit('');
    setNamaUnit('');
    setHmUnit('');

    // Input manual bebas jenis oli
    setJenisOli('');
    setQty('');
    setSatuan('Ltr');
    setRincianKerusakan('');

    const defaultMekanik = effectiveMechanics[0];
    setPicMekanik(defaultMekanik?.nama || '');
    setPicMekanikJabatan(defaultMekanik?.jabatan || 'MEKANIK');

    const defaultGudang = effectiveWarehouse[0];
    setPicGudangMaterial(defaultGudang?.nama || currentUser.fullName || currentUser.username);
    setPicGudangJabatan(defaultGudang?.jabatan || 'ADMINISTRASI');

    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: OilDistributionRecord) => {
    setEditingId(item.id);
    setNoBon(item.noBon || '');
    setTanggal(item.tanggal);
    setJam(item.jam || '');
    const eq = equipmentList.find((e) => getUnitCn(e) === item.noUnit);
    if (eq) {
      setSelectedJenis(getUnitJenis(eq));
    }
    setNoUnit(item.noUnit);
    setNamaUnit(item.namaUnit || (eq ? getUnitName(eq) : item.noUnit));
    setHmUnit(item.hmUnit);
    setJenisOli(item.jenisOli);
    setQty(item.qty);
    setSatuan(item.satuan || 'Ltr');
    setRincianKerusakan(item.rincianKerusakan);
    setPicMekanik(item.picMekanik);
    setPicMekanikJabatan(item.picMekanikJabatan || '');
    setPicGudangMaterial(item.picGudangMaterial);
    setPicGudangJabatan(item.picGudangJabatan || '');
    setRemark(item.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleMekanikChange = (nama: string) => {
    setPicMekanik(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicMekanikJabatan(found.jabatan);
    }
  };

  const handleGudangChange = (nama: string) => {
    setPicGudangMaterial(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicGudangJabatan(found.jabatan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noUnit.trim()) {
      setErrorMsg('1. No Unit wajib dipilih dari Modul 1 Asset!');
      return;
    }
    if (hmUnit === '' || Number(hmUnit) < 0) {
      setErrorMsg('2. HM Unit wajib diisi angka valid!');
      return;
    }
    if (!jenisOli) {
      setErrorMsg('3. Jenis Oli wajib dipilih!');
      return;
    }
    if (qty === '' || Number(qty) <= 0) {
      setErrorMsg('4. Qty pengeluaran oli harus lebih dari 0!');
      return;
    }
    if (!rincianKerusakan.trim()) {
      setErrorMsg('5. Rincian Kerusakan / Keperluan perbaikan wajib dijelaskan!');
      return;
    }
    if (!picMekanik) {
      setErrorMsg('6. PIC Mekanik wajib dipilih!');
      return;
    }
    if (!picGudangMaterial) {
      setErrorMsg('7. PIC Gudang Material wajib dipilih!');
      return;
    }

    const res = onSave(
      {
        noBon: noBon.trim(),
        tanggal,
        jam,
        noUnit,
        namaUnit,
        hmUnit: Number(hmUnit),
        jenisOli,
        qty: Number(qty),
        satuan,
        rincianKerusakan: rincianKerusakan.trim(),
        picMekanik,
        picMekanikJabatan,
        picGudangMaterial,
        picGudangJabatan,
        remark: remark.trim(),
      },
      editingId || undefined
    );

    if (res.success) {
      setShowModal(false);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const filteredList = oilDistributions.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.noUnit.toLowerCase().includes(q) ||
      (item.namaUnit || '').toLowerCase().includes(q) ||
      item.jenisOli.toLowerCase().includes(q) ||
      item.rincianKerusakan.toLowerCase().includes(q) ||
      item.picMekanik.toLowerCase().includes(q) ||
      (item.noBon || '').toLowerCase().includes(q)
    );
  });

  const totalOliDistribusi = oilDistributions.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

  // Export CSV dengan Kop PT BATU KALI WELANG AMPUH
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data pengeluaran oli untuk diexport.');
      return;
    }
    const headers = ['NO BON', 'TANGGAL', 'JAM', 'NO UNIT (CN)', 'NAMA ALAT', 'HM UNIT', 'JENIS OLI', 'QTY', 'SATUAN', 'RINCIAN KERUSAKAN', 'PIC MEKANIK', 'JABATAN MEKANIK', 'PIC GUDANG', 'JABATAN GUDANG', 'REMARK'];
    const rows = filteredList.map((item) => [
      `"${item.noBon || ''}"`,
      `"${item.tanggal}"`,
      `"${item.jam || ''}"`,
      `"${item.noUnit}"`,
      `"${(item.namaUnit || '').replace(/"/g, '""')}"`,
      `"${item.hmUnit ?? (item as any).hm ?? ''}"`,
      `"${item.jenisOli}"`,
      `"${item.qty}"`,
      `"${item.satuan || 'Ltr'}"`,
      `"${(item.rincianKerusakan || '').replace(/"/g, '""')}"`,
      `"${item.picMekanik}"`,
      `"${item.picMekanikJabatan || 'MEKANIK'}"`,
      `"${item.picGudangMaterial}"`,
      `"${item.picGudangJabatan || 'ADMINISTRASI'}"`,
      `"${(item.remark || '').replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [
      `"PT BATU KALI WELANG AMPUH - LAPORAN PENGELUARAN OLI KE ALAT BERAT"`,
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredList.length} | Dicetak oleh: ${currentUser.fullName || currentUser.username}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Pengeluaran_Oli_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                6. DISTRIBUTION OLI (PENGELUARAN KE ALAT & MEKANIK)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pengeluaran pelumas gudang untuk service rutin, pergantian oli hydraulic/engine, atau perbaikan breakdown unit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari Unit, Kerusakan, Mekanik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50 w-56 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold text-xs transition active:scale-95"
            title="Export CSV Laporan Pengeluaran Oli (PT BATU KALI WELANG AMPUH)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-add-oil-distribution"
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Oli</span>
          </button>
        </div>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Total Oli Keluar</div>
            <div className="text-lg font-black font-mono text-amber-400">
              {(totalOliDistribusi ?? 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Liter</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">Frekuensi Service / Kerusakan</div>
            <div className="text-lg font-black font-mono text-stone-100">
              {oilDistributions.length} <span className="text-xs font-normal text-stone-400">Kasus Service</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-stone-400">PIC Mekanik Aktif</div>
            <div className="text-lg font-black font-mono text-emerald-400">
              {new Set(oilDistributions.map(o => o.picMekanik)).size} <span className="text-xs font-normal text-stone-400">Teknisi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Data Distribusi Oli */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            LOG PENGELUARAN OLI KE ALAT BERAT (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">Tanggal / Bon</th>
                <th className="py-3 px-3">1. No Unit (CN)</th>
                <th className="py-3 px-3 text-right">2. HM Unit</th>
                <th className="py-3 px-3">3. Jenis Oli</th>
                <th className="py-3 px-3 text-right">4. Qty</th>
                <th className="py-3 px-3">5. Rincian Kerusakan</th>
                <th className="py-3 px-3">6. PIC Mekanik</th>
                <th className="py-3 px-3">7. PIC Gudang</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                    <div>{item.tanggal}</div>
                    <div className="text-[10px] text-amber-500 font-bold">{item.noBon || '-'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.noUnit}
                    </span>
                    <div className="text-[10px] text-stone-400 mt-0.5">{item.namaUnit}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-stone-200 text-right">
                    {(item.hmUnit ?? (item as any).hm ?? 0).toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">HM</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    {item.jenisOli}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-amber-400 text-right text-sm">
                    {(item.qty ?? 0).toLocaleString('id-ID')} <span className="text-[10px] text-stone-400 font-normal">{item.satuan || 'Ltr'}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-stone-200 text-[11px] font-medium max-w-xs flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item.rincianKerusakan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-200">{item.picMekanik}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.picMekanikJabatan || 'Mekanik'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-stone-300">{item.picGudangMaterial}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{item.picGudangJabatan || 'Gudang'}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-500">
                    Belum ada data pengeluaran oli untuk perbaikan unit alat berat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM INPUT / EDIT DISTRIBUSI OLI */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Pengeluaran Oli' : 'Form Pengeluaran Oli Unit Alat (Gudang-Mekanik)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* No Bon & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    No Bon / Reff Permintaan
                  </label>
                  <input
                    type="text"
                    required
                    value={noBon}
                    onChange={(e) => setNoBon(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Tanggal Pengeluaran <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam
                  </label>
                  <input
                    type="time"
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* 1. Cascading Unit Selection (Jenis -> CN_NEW -> Nama Alat Otomatis & HM) */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Reff Unit Alat Berat (Modul 1 Asset)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      1. Jenis Alat (Modul 1) <span className="text-amber-400">*</span>
                    </label>
                    <select
                      value={selectedJenis}
                      onChange={(e) => handleJenisChange(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 font-bold font-mono text-xs focus:outline-none focus:border-amber-500/60"
                    >
                      <option value="">-- Pilih Jenis Alat di Modul 1 --</option>
                      {availableJenisList.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      Memfilter daftar pilihan CN_NEW di samping
                    </span>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      2. CN_NEW (Unit Terkelompok sesuai Jenis) <span className="text-amber-400">*</span>
                    </label>
                    <select
                      required
                      value={noUnit}
                      onChange={(e) => handleNoUnitChange(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 font-mono font-bold text-xs focus:outline-none focus:border-amber-500/60"
                    >
                      <option value="">
                        {selectedJenis 
                          ? `-- Pilih CN_NEW (Kelompok: ${selectedJenis}) --` 
                          : '-- Pilih CN_NEW (Dikelompokkan Sesuai Jenis) --'}
                      </option>
                      {selectedJenis ? (
                        availableUnitsForSelectedJenis.length > 0 ? (
                          availableUnitsForSelectedJenis.map((eq: any) => {
                            const cn = getUnitCn(eq);
                            return (
                              <option key={eq.id || cn} value={cn}>
                                {cn} — {getUnitName(eq)}
                              </option>
                            );
                          })
                        ) : (
                          <option value="" disabled>(Belum ada unit terdaftar di Modul 1 untuk {selectedJenis})</option>
                        )
                      ) : (
                        availableJenisList.map((j) => {
                          const matchUnits = equipmentList.filter((u: any) => getUnitJenis(u).toLowerCase() === j.toLowerCase());
                          if (matchUnits.length === 0) return null;
                          return (
                            <optgroup key={j} label={`Kelompok: ${j}`}>
                              {matchUnits.map((eq: any) => {
                                const cn = getUnitCn(eq);
                                return (
                                  <option key={eq.id || cn} value={cn}>
                                    {cn} — {getUnitName(eq)}
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        })
                      )}
                    </select>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Atau ketik CN_NEW manual..."
                        value={noUnit}
                        onChange={(e) => handleNoUnitChange(e.target.value)}
                        className="w-full px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500/60 placeholder:text-stone-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Nama Alat (Otomatis dari CN_NEW)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={namaUnit}
                      className="w-full px-3 py-2 bg-stone-900/60 border border-stone-800/80 rounded-xl text-stone-200 font-medium cursor-not-allowed text-xs font-mono"
                      placeholder="Otomatis dari CN_NEW terpilih"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      HM Unit Saat Ini <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="Hour meter unit"
                      value={hmUnit}
                      onChange={(e) => setHmUnit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold text-xs focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Jenis Oli (Input Bebas Manual) & 4. Qty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-stone-300 font-semibold mb-1">
                    3. Jenis Oli / Pelumas (Input Bebas Manual) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="oil-dist-types-list"
                    placeholder="Ketik manual jenis oli (contoh: TURALIK 52, SAE 15W-40, ATF, dll.)"
                    value={jenisOli}
                    onChange={(e) => setJenisOli(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500/60"
                  />
                  <datalist id="oil-dist-types-list">
                    {availableOilTypes.map((oil) => (
                      <option key={oil} value={oil} />
                    ))}
                    <option value="TURALIK 52 PERTAMINA" />
                    <option value="RORED HDA SAE 90" />
                    <option value="MEDITRAN S SAE 40" />
                    <option value="MEDITRAN SX SAE 15W-40" />
                    <option value="RORED HDA SAE 140" />
                    <option value="TELLUS S2 M 68" />
                    <option value="RIMULA R4X 15W-40" />
                    <option value="ATF DEXRON III" />
                  </datalist>
                  <span className="text-[10px] text-stone-500 block mt-1">
                    Input bebas secara manual atau pilih saran dari daftar pelumas
                  </span>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    4. Qty Diambil <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Jumlah"
                      value={qty}
                      onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500/60"
                    />
                    <select
                      value={satuan}
                      onChange={(e) => setSatuan(e.target.value)}
                      className="px-2 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono text-xs"
                    >
                      <option value="Ltr">Ltr</option>
                      <option value="Drum">Drum</option>
                      <option value="Pail">Pail</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Rincian Kerusakan */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  5. Rincian Kerusakan / Keperluan Penggantian <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Kebocoran O-ring hose hydraulic cylinder boom arm, atau Service periodik 250 jam pergantian oli engine filter"
                  value={rincianKerusakan}
                  onChange={(e) => setRincianKerusakan(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* 6. PIC Mekanik (Hanya Jabatan Mekanik) & 7. PIC Gudang Material (Hanya Administrasi & Kabag) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 font-semibold">
                      6. PIC Mekanik (Peminta / Eksekutor) <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">Khusus Mekanik</span>
                  </div>
                  <select
                    value={picMekanik}
                    onChange={(e) => handleMekanikChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono text-xs"
                  >
                    <option value="">-- Pilih PIC Mekanik (Hanya Mekanik - Urut Abjad) --</option>
                    {effectiveMechanics.map((m) => (
                      <option key={m.id} value={m.nama}>
                        [{m.jabatan}] {m.nama}
                      </option>
                    ))}
                  </select>
                  {picMekanikJabatan && (
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                      Jabatan: {picMekanikJabatan}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-300 font-semibold">
                      7. PIC Gudang Material (Pemberi) <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-blue-400 font-mono">Administrasi &amp; Kabag</span>
                  </div>
                  <select
                    value={picGudangMaterial}
                    onChange={(e) => handleGudangChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono text-xs"
                  >
                    <option value="">-- Pilih PIC Gudang (Hanya Administrasi &amp; Kabag - Urut Abjad) --</option>
                    {effectiveWarehouse.map((m) => (
                      <option key={m.id} value={m.nama}>
                        [{m.jabatan}] {m.nama}
                      </option>
                    ))}
                  </select>
                  {picGudangJabatan && (
                    <span className="text-[10px] text-blue-400 font-mono mt-1 block">
                      Jabatan: {picGudangJabatan}
                    </span>
                  )}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Remark / Catatan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan shift kerja atau rekomendasi part pengganti"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingId ? 'Simpan Perubahan' : 'Catat Pengeluaran Oli'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Catatan Pengeluaran Oli?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data ini akan dihapus dan mempengaruhi total konsumsi oli unit serta saldo stock gudang material.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
