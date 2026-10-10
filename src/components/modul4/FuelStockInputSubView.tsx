import React, { useState, useMemo } from 'react';
import { 
  FuelStockInputRecord, 
  FuelTransferRecord,
  SupplierRecord, 
  ManpowerData, 
  UserAccount,
  InventoryPeriodBalance
} from '../../types';
import { 
  Fuel, 
  Plus, 
  Search, 
  History, 
  FileText, 
  Gauge, 
  Calendar, 
  Clock, 
  User, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  TrendingDown,
  Building2,
  Ruler,
  Lock,
  Download,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { canUserEdit } from '../../utils/storage';

interface FuelStockInputSubViewProps {
  fuelStockInputs: FuelStockInputRecord[];
  fuelTransfers?: FuelTransferRecord[];
  periodBalance?: InventoryPeriodBalance;
  standardSolarPrice?: number;
  suppliers: SupplierRecord[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onSave: (
    data: Omit<FuelStockInputRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => { success: boolean; message: string; record?: FuelStockInputRecord };
  onDelete: (id: string) => { success: boolean; message: string };
}

export const FuelStockInputSubView: React.FC<FuelStockInputSubViewProps> = ({
  fuelStockInputs,
  fuelTransfers = [],
  periodBalance,
  standardSolarPrice = 6800,
  suppliers,
  manpowerList,
  currentUser,
  onSave,
  onDelete,
}) => {
  const canEdit = canUserEdit(currentUser, 4);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Logika Saldo Solar Tangki Utama (Solar Industri):
  // Saldo solar periode sebelumnya + Input fuel dari distributor - Qty Transfer Fuel
  // (Tanpa nominal uang karena solar industri)
  const saldoTangkiLalu = Number(periodBalance?.sisaPeriodeLaluFuelTangki || 0);
  const totalInputDistributor = useMemo(() => {
    return fuelStockInputs.reduce(
      (sum, r) => sum + (Number(r.actualQtyFlowmeter) || Number(r.qtySupplier) || 0),
      0
    );
  }, [fuelStockInputs]);

  const totalTransferFuel = useMemo(() => {
    return fuelTransfers.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  }, [fuelTransfers]);

  const saldoAkhirTangkiUtama = saldoTangkiLalu + totalInputDistributor - totalTransferFuel;

  // Form states sesuai instruksi:
  // a. Distributor (Dropdown reff by "Data SUplier")
  // b. SN/Reff No
  // c. Plat Nomor
  // d. Driver Name
  // e. qty (Suplier)
  // f. Flowmeter Start
  // g. Flowmeter End
  // h. Actual Qty Flowmeter
  // i. Hasil Ukur Stick (Sebelum)
  // j. Hasil Ukur Stick (Sesudah)
  // k. PIC FOG Name : (dropdown reff nama Manpower di modul 2)
  // l. Tanggal dan jam Input
  // m. Remark
  const [distributor, setDistributor] = useState('');
  const [snReffNo, setSnReffNo] = useState('');
  const [platNomor, setPlatNomor] = useState('');
  const [driverName, setDriverName] = useState('');
  const [qtySupplier, setQtySupplier] = useState<number | ''>('');
  const [flowmeterStart, setFlowmeterStart] = useState<number | ''>('');
  const [flowmeterEnd, setFlowmeterEnd] = useState<number | ''>('');
  const [actualQtyFlowmeter, setActualQtyFlowmeter] = useState<number | ''>('');
  
  // i. Hasil Ukur Tangki Utama (Level Sounding)
  const [hasilUkurTangkiUtama, setHasilUkurTangkiUtama] = useState<string>('');
  
  // j. Hasil Timbang (Gross, Tare, Nett) - Proses Timbang Sebelum & Sesudah di PT BKWA
  const [timbangGross, setTimbangGross] = useState<number | ''>('');
  const [timbangTare, setTimbangTare] = useState<number | ''>('');
  const [timbangNett, setTimbangNett] = useState<number | ''>('');
  
  const [picFogName, setPicFogName] = useState('');
  const [picFogJabatan, setPicFogJabatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [remark, setRemark] = useState('');

  // Filter distributor yang relevan dengan BBM / Solar
  const fuelSuppliers = suppliers.filter(
    (s) => s.itemName.toLowerCase().includes('solar') || s.itemName.toLowerCase().includes('bbm') || s.namaDistributor.toLowerCase().includes('pertamina')
  );
  const effectiveSuppliers = fuelSuppliers.length > 0 ? fuelSuppliers : suppliers;

  // Daftar manpower diurutkan berdasarkan Jabatan terlebih dahulu baru sesuai Abjad Nama
  const sortedManpowerList = useMemo(() => {
    return [...manpowerList].sort((a, b) => {
      const cmpJabatan = (a.jabatan || '').localeCompare(b.jabatan || '', 'id');
      if (cmpJabatan !== 0) return cmpJabatan;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [manpowerList]);

  // Kalkulasi otomatis Timbang Nett = Gross - Tare
  const handleGrossTareChange = (grossVal: number | '', tareVal: number | '') => {
    setTimbangGross(grossVal);
    setTimbangTare(tareVal);
    if (typeof grossVal === 'number' && typeof tareVal === 'number') {
      const diff = grossVal - tareVal;
      setTimbangNett(diff >= 0 ? diff : 0);
    } else {
      setTimbangNett('');
    }
  };

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingId(null);
    setDistributor(effectiveSuppliers[0]?.namaDistributor || '');
    setSnReffNo(`DO-BBM-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`);
    setPlatNomor('');
    setDriverName('');
    setQtySupplier('');
    setFlowmeterStart('');
    setFlowmeterEnd('');
    setActualQtyFlowmeter('');
    setHasilUkurTangkiUtama('');
    setTimbangGross('');
    setTimbangTare('');
    setTimbangNett('');
    
    // Default PIC dari manpower
    const defaultPic = manpowerList[0];
    setPicFogName(defaultPic?.nama || currentUser.fullName || currentUser.username);
    setPicFogJabatan(defaultPic?.jabatan || 'Staff Logistik');

    const now = new Date();
    setTanggal(now.toISOString().split('T')[0]);
    setJam(now.toTimeString().substring(0, 5));
    setRemark('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (record: FuelStockInputRecord) => {
    if (!canEdit) return;
    setEditingId(record.id);
    setDistributor(record.distributor);
    setSnReffNo(record.snReffNo);
    setPlatNomor(record.platNomor);
    setDriverName(record.driverName);
    setQtySupplier(record.qtySupplier);
    setFlowmeterStart(record.flowmeterStart);
    setFlowmeterEnd(record.flowmeterEnd);
    setActualQtyFlowmeter(record.actualQtyFlowmeter);
    setHasilUkurTangkiUtama(record.hasilUkurTangkiUtama?.toString() || record.hasilUkurStickSebelum?.toString() || '');
    setTimbangGross(record.timbangGross !== undefined && record.timbangGross !== '' ? Number(record.timbangGross) : '');
    setTimbangTare(record.timbangTare !== undefined && record.timbangTare !== '' ? Number(record.timbangTare) : '');
    setTimbangNett(record.timbangNett !== undefined && record.timbangNett !== '' ? Number(record.timbangNett) : '');
    setPicFogName(record.picFogName);
    setPicFogJabatan(record.picFogJabatan || '');
    setTanggal(record.tanggal);
    setJam(record.jam);
    setRemark(record.remark || '');
    setErrorMsg('');
    setShowModal(true);
  };

  // Auto calculate Actual Qty Flowmeter saat Start dan End terisi
  const handleFlowmeterChange = (startVal: number | '', endVal: number | '') => {
    setFlowmeterStart(startVal);
    setFlowmeterEnd(endVal);
    if (typeof startVal === 'number' && typeof endVal === 'number') {
      const diff = endVal - startVal;
      if (diff >= 0) {
        setActualQtyFlowmeter(diff);
      }
    }
  };

  const handlePicChange = (nama: string) => {
    setPicFogName(nama);
    const found = manpowerList.find((m) => m.nama === nama);
    if (found) {
      setPicFogJabatan(found.jabatan);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg('Akses Ditolak: Akun Anda dalam mode "Hanya View". Penambahan/perubahan input stock BBM tidak diizinkan.');
      return;
    }
    if (!distributor) {
      setErrorMsg('Distributor wajib dipilih!');
      return;
    }
    if (!snReffNo.trim()) {
      setErrorMsg('SN/Reff No (Surat Jalan / DO) wajib diisi!');
      return;
    }
    if (qtySupplier === '' || Number(qtySupplier) <= 0) {
      setErrorMsg('Qty (Suplier) harus berupa angka lebih dari 0!');
      return;
    }
    if (actualQtyFlowmeter === '' || Number(actualQtyFlowmeter) <= 0) {
      setErrorMsg('Actual Qty Flowmeter wajib diisi atau dihitung!');
      return;
    }

    const formattedTimbang = (timbangGross !== '' || timbangTare !== '')
      ? `Gross: ${Number(timbangGross || 0).toLocaleString('id-ID')} kg | Tare: ${Number(timbangTare || 0).toLocaleString('id-ID')} kg | Nett: ${Number(timbangNett || 0).toLocaleString('id-ID')} kg`
      : '';

    const res = onSave(
      {
        distributor,
        snReffNo: snReffNo.trim(),
        platNomor: platNomor.trim(),
        driverName: driverName.trim(),
        qtySupplier: Number(qtySupplier),
        flowmeterStart: Number(flowmeterStart) || 0,
        flowmeterEnd: Number(flowmeterEnd) || 0,
        actualQtyFlowmeter: Number(actualQtyFlowmeter),
        hasilUkurStickSebelum: hasilUkurTangkiUtama.trim(),
        hasilUkurTangkiUtama: hasilUkurTangkiUtama.trim(),
        hasilUkurStickSesudah: formattedTimbang,
        timbangGross: timbangGross !== '' ? Number(timbangGross) : undefined,
        timbangTare: timbangTare !== '' ? Number(timbangTare) : undefined,
        timbangNett: timbangNett !== '' ? Number(timbangNett) : undefined,
        hasilTimbang: formattedTimbang,
        picFogName,
        picFogJabatan,
        tanggal,
        jam,
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
    if (!canEdit) return;
    onDelete(id);
    setDeleteConfirmId(null);
  };

  // ==========================================
  // TOP 5 LAST TRANSAKSI INPUT STOCK
  // Berisi: Tanggal, Nama Distributor, Flowmeter Start-End, Qty(Suplier), Actual Qty Flowmeter
  // ==========================================
  const top5LastTransactions = [...fuelStockInputs]
    .sort((a, b) => {
      const tA = new Date(`${a.tanggal}T${a.jam || '00:00'}`).getTime();
      const tB = new Date(`${b.tanggal}T${b.jam || '00:00'}`).getTime();
      return tB - tA;
    })
    .slice(0, 5);

  const filteredList = fuelStockInputs.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.distributor.toLowerCase().includes(q) ||
      item.snReffNo.toLowerCase().includes(q) ||
      item.platNomor.toLowerCase().includes(q) ||
      item.driverName.toLowerCase().includes(q) ||
      item.picFogName.toLowerCase().includes(q)
    );
  });

  // Export CSV dengan Kop PT BATU KALI WELANG AMPUH
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data penerimaan stock fuel untuk diexport.');
      return;
    }
    const headers = ['TANGGAL', 'JAM', 'DISTRIBUTOR', 'NO REFF/PO', 'PLAT NOMOR', 'SUPIR', 'STICK AWAL', 'STICK AKHIR', 'FLOWMETER AWAL', 'FLOWMETER AKHIR', 'QTY SUPPLIER', 'ACTUAL FLOWMETER', 'SELISIH', 'PIC FOG'];
    const rows = filteredList.map((item) => {
      const diff = (Number(item.actualQtyFlowmeter) || 0) - (Number(item.qtySupplier) || 0);
      return [
        `"${item.tanggal}"`,
        `"${item.jam || ''}"`,
        `"${(item.distributor || '').replace(/"/g, '""')}"`,
        `"${item.snReffNo}"`,
        `"${item.platNomor || '-'}"`,
        `"${(item.driverName || '').replace(/"/g, '""')}"`,
        `"${item.stickAwal ?? ''}"`,
        `"${item.stickAkhir ?? ''}"`,
        `"${item.flowmeterStart ?? ''}"`,
        `"${item.flowmeterEnd ?? ''}"`,
        `"${item.qtySupplier ?? ''}"`,
        `"${item.actualQtyFlowmeter ?? ''}"`,
        `"${diff}"`,
        `"${item.picFogName || '-'}"`,
      ];
    });
    const csv = '\uFEFF' + [
      `"PT BATU KALI WELANG AMPUH - LAPORAN PENERIMAAN STOK BBM SOLAR"`,
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Catatan: ${filteredList.length} | Dicetak oleh: ${currentUser.fullName || currentUser.username}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Penerimaan_Stok_Solar_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`;
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
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                2. INPUT STOCK (FUEL) - TANGKI UTAMA
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Penerimaan BBM Solar industri ke Tangki Timbun Utama Quarry Purwosari.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari Reff, Distributor, Plat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50 w-56 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold text-xs transition active:scale-95"
            title="Export CSV Penerimaan Stok Solar (PT BATU KALI WELANG AMPUH)"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>

          {canEdit ? (
            <button
              id="btn-add-fuel-stock"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Stock Fuel</span>
            </button>
          ) : (
            <button
              id="btn-add-fuel-stock"
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-stone-500 border border-stone-700 font-bold text-xs cursor-not-allowed opacity-75"
              title="Akun Anda dalam mode Hanya View. Hubungi Developer untuk izin pengisian data."
            >
              <Lock className="w-4 h-4 text-stone-500" />
              <span>+ Input Stock Fuel (Terkunci)</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUMMARY SALDO SOLAR TANGKI UTAMA (SOLAR INDUSTRI) */}
      {/* Logika: Saldo Periode Sebelumnya + Input Distributor - Qty Transfer Fuel */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Fuel className="w-3 h-3 text-amber-400" />
              <span>SUMMARY SALDO TANGKI UTAMA</span>
            </span>
            <span className="text-xs font-mono font-black text-stone-100 uppercase">
              Solar Industri (Kuantitas Fisik Liter)
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            * Tanpa Nominal Rupiah (Solar Industri)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Saldo Periode Sebelumnya */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-stone-400">1. Saldo Periode Lalu</span>
            <div className="text-lg font-black font-mono text-stone-300 mt-1">
              {saldoTangkiLalu.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">Saldo awal tangki</span>
          </div>

          {/* 2. Input Fuel dari Distributor */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-amber-400">2. Input Fuel Distributor</span>
            <div className="text-lg font-black font-mono text-amber-400 mt-1">
              +{totalInputDistributor.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">{fuelStockInputs.length} penerimaan masuk</span>
          </div>

          {/* 3. Qty Transfer Fuel ke FT */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10.5px] font-mono uppercase text-blue-400">3. Transfer ke FT-01</span>
            <div className="text-lg font-black font-mono text-blue-400 mt-1">
              −{totalTransferFuel.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">Ltr</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono mt-0.5">{fuelTransfers.length} ritase transfer</span>
          </div>

          {/* 4. Sisa Saldo Tangki Utama */}
          <div className="bg-stone-950/90 border border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between shadow-lg shadow-emerald-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <span className="text-[10.5px] font-mono uppercase font-bold text-emerald-400">
              4. Saldo Solar Tangki Utama
            </span>
            <div className="text-xl font-black font-mono text-emerald-300 mt-1">
              {saldoAkhirTangkiUtama.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-400">Ltr</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 font-bold">
              (Lalu + Input − Transfer)
            </span>
          </div>
        </div>

        <div className="text-[10.5px] font-mono text-stone-400 flex items-center justify-between pt-1 border-t border-stone-800/60">
          <span>
            * Rumus: Saldo Lalu ({saldoTangkiLalu.toLocaleString('id-ID')} Ltr) + Input Distributor ({totalInputDistributor.toLocaleString('id-ID')} Ltr) − Qty Transfer ({totalTransferFuel.toLocaleString('id-ID')} Ltr) = <strong>{saldoAkhirTangkiUtama.toLocaleString('id-ID')} Liter</strong>
          </span>
          <span className="text-stone-500">
            Total Riwayat Penerimaan: {fuelStockInputs.length} batch
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET: TOP 5 LAST TRANSAKSI INPUT STOCK */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
              TOP 5 LAST TRANSAKSI INPUT STOCK (FUEL)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
            5 Transaksi Penerimaan Solar Terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/80 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-2.5 px-3">Tanggal & Jam</th>
                <th className="py-2.5 px-3">Nama Distributor</th>
                <th className="py-2.5 px-3">Flowmeter Start - End</th>
                <th className="py-2.5 px-3 text-right">Qty (Suplier)</th>
                <th className="py-2.5 px-3 text-right">Actual Qty Flowmeter</th>
                <th className="py-2.5 px-3 text-center">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {top5LastTransactions.map((tx, idx) => {
                const diff = (Number(tx.actualQtyFlowmeter) || 0) - (Number(tx.qtySupplier) || 0);
                return (
                  <tr key={tx.id || idx} className="hover:bg-stone-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-stone-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>{tx.tanggal}</span>
                        <span className="text-stone-500">{tx.jam}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>{tx.distributor}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block">
                        Reff: {tx.snReffNo} • Plat: {tx.platNomor || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-300">
                      {(tx.flowmeterStart ?? 0).toLocaleString('id-ID')} → {(tx.flowmeterEnd ?? 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-200 text-right">
                      {(tx.qtySupplier ?? 0).toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">Ltr</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-right">
                      {(tx.actualQtyFlowmeter ?? 0).toLocaleString('id-ID')} <span className="text-[10px] text-stone-500 font-normal">Ltr</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          diff === 0
                            ? 'bg-stone-800 text-stone-300'
                            : diff > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff} Ltr
                      </span>
                    </td>
                  </tr>
                );
              })}

              {top5LastTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    Belum ada riwayat transaksi Input Stock Fuel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DAFTAR LENGKAP INPUT STOCK (FUEL) */}
      {/* ========================================================================= */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
            SEMUA DATA PENERIMAAN STOCK FUEL (TOTAL: {filteredList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-[11px] font-mono uppercase text-stone-400 border-y border-stone-800">
              <tr>
                <th className="py-3 px-3">Tanggal / Jam</th>
                <th className="py-3 px-3">Distributor / Reff</th>
                <th className="py-3 px-3">Armada & Supir</th>
                <th className="py-3 px-3">Hasil Ukur Tangki Utama</th>
                <th className="py-3 px-3">Hasil Timbang (Gross, Tare, Nett)</th>
                <th className="py-3 px-3">Flowmeter (Start / End)</th>
                <th className="py-3 px-3 text-right">Qty Suplier</th>
                <th className="py-3 px-3 text-right">Actual Flowmeter</th>
                <th className="py-3 px-3">PIC FOG</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-stone-800/30 transition">
                  <td className="py-3 px-3 font-mono text-stone-200 whitespace-nowrap">
                    <div>{item.tanggal}</div>
                    <div className="text-[10px] text-stone-500">{item.jam}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-amber-400">{item.distributor}</div>
                    <div className="text-[10px] font-mono text-stone-400">SN: {item.snReffNo}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-stone-200">Plat: {item.platNomor || '-'}</div>
                    <div className="text-stone-400">Supir: {item.driverName || '-'}</div>
                  </td>
                  {/* i. Hasil Ukur Tangki Utama */}
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold text-stone-200">
                        {item.hasilUkurTangkiUtama || item.hasilUkurStickSebelum || '-'}
                      </span>
                    </div>
                  </td>
                  {/* j. Hasil Timbang (Gross, Tare, Nett) */}
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    {item.timbangGross !== undefined && item.timbangGross !== '' ? (
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-stone-400">
                          G: {Number(item.timbangGross).toLocaleString('id-ID')} kg | T: {Number(item.timbangTare || 0).toLocaleString('id-ID')} kg
                        </div>
                        <div className="text-emerald-400 font-bold">
                          Nett: {Number(item.timbangNett || (Number(item.timbangGross) - Number(item.timbangTare || 0))).toLocaleString('id-ID')} kg
                        </div>
                      </div>
                    ) : item.hasilTimbang ? (
                      <span className="text-stone-300 font-semibold">{item.hasilTimbang}</span>
                    ) : item.hasilUkurStickSesudah ? (
                      <span className="text-stone-400">{item.hasilUkurStickSesudah}</span>
                    ) : (
                      <span className="text-stone-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-300">
                    <div>Start: {(item.flowmeterStart ?? 0).toLocaleString('id-ID')}</div>
                    <div>End: {(item.flowmeterEnd ?? 0).toLocaleString('id-ID')}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-stone-200 text-right">
                    {(item.qtySupplier ?? 0).toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400 text-right">
                    {(item.actualQtyFlowmeter ?? 0).toLocaleString('id-ID')} Ltr
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-stone-200 font-semibold">{item.picFogName}</div>
                    <div className="text-[10px] text-stone-500">{item.picFogJabatan || '-'}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleOpenEdit(item)}
                        className={`p-1.5 rounded-lg transition border ${
                          canEdit
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Edit Record' : 'Akun Anda dalam mode Hanya View'}
                      >
                        {canEdit ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setDeleteConfirmId(item.id)}
                        className={`p-1.5 rounded-lg transition border ${
                          canEdit
                            ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/40 text-rose-300'
                            : 'bg-stone-900/60 text-stone-600 border-stone-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Hapus Record' : 'Akun Anda dalam mode Hanya View'}
                      >
                        {canEdit ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-stone-600" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-500">
                    Tidak ada catatan Input Stock Fuel yang sesuai filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL INPUT / EDIT INPUT STOCK (FUEL) */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  {editingId ? 'Edit Input Stock (Fuel)' : 'Form Input Stock (Fuel) Tangki Utama'}
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

              {/* Baris 1: a. Distributor & b. SN/Reff No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    a. Distributor (Reff: Data Suplier) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={distributor}
                    onChange={(e) => setDistributor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60"
                  >
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.namaDistributor}>
                        {sup.namaDistributor} ({sup.itemName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    b. SN/Reff No (Surat Jalan / DO) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SJ-PTM-2026/09/088"
                    value={snReffNo}
                    onChange={(e) => setSnReffNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Baris 2: c. Plat Nomor & d. Driver Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    c. Plat Nomor Armada Pengirim
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: L 9821 UA"
                    value={platNomor}
                    onChange={(e) => setPlatNomor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    d. Driver Name (Pengemudi Truk Tangki)
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Supir Tangki Vendor"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Baris 3: e. qty (Suplier) & f, g Flowmeter */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Kalkulasi Volume & Flowmeter Tangki Utama</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      e. Qty (Suplier) - Ltr <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Volume DO Vendor"
                      value={qtySupplier}
                      onChange={(e) => setQtySupplier(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono font-bold focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      f. Flowmeter Start
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Awal"
                      value={flowmeterStart}
                      onChange={(e) => handleFlowmeterChange(e.target.value === '' ? '' : Number(e.target.value), flowmeterEnd)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      g. Flowmeter End
                    </label>
                    <input
                      type="number"
                      placeholder="Angka Akhir"
                      value={flowmeterEnd}
                      onChange={(e) => handleFlowmeterChange(flowmeterStart, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>

                {/* h. Actual Qty Flowmeter */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    h. Actual Qty Flowmeter (Liter) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Hasil kalkulasi Flowmeter End - Start"
                    value={actualQtyFlowmeter}
                    onChange={(e) => setActualQtyFlowmeter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-amber-500/40 rounded-xl text-amber-400 font-mono font-black text-sm focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    *Otomatis terhitung dari selisih Flowmeter End dikurangi Flowmeter Start.
                  </span>
                </div>
              </div>

              {/* Baris 4: i. Hasil Ukur Tangki Utama & j. Hasil Timbang (Gross, Tare, Nett) */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3.5">
                {/* i. Hasil Ukur Tangki Utama */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    i. Hasil Ukur Tangki Utama
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan Hasil Ukur Tangki Utama (contoh: 185 cm / Level Sounding)"
                    value={hasilUkurTangkiUtama}
                    onChange={(e) => setHasilUkurTangkiUtama(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                  <span className="text-[10.5px] text-stone-400 mt-1 block">
                    * Keterangan hasil ukur / sounding level solar di Tangki Utama sebelum &amp; sesudah pembongkaran.
                  </span>
                </div>

                {/* j. Hasil Timbang (Gross, Tare, Nett) */}
                <div className="pt-3 border-t border-stone-800/70 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-stone-300 font-semibold text-xs flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">j. Hasil Timbang (Gross, Tare, Nett)</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">
                      * Proses timbang sebelum &amp; sesudah bongkar muatan di jembatan timbang BKWA
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-stone-400 font-mono mb-1">
                        Gross (Truk + Solar) - Kg
                      </label>
                      <input
                        type="number"
                        placeholder="Berat Isi (Kg)"
                        value={timbangGross}
                        onChange={(e) => handleGrossTareChange(e.target.value === '' ? '' : Number(e.target.value), timbangTare)}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-400 font-mono mb-1">
                        Tare (Truk Kosong) - Kg
                      </label>
                      <input
                        type="number"
                        placeholder="Berat Kosong (Kg)"
                        value={timbangTare}
                        onChange={(e) => handleGrossTareChange(timbangGross, e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-emerald-400 font-mono font-bold mb-1">
                        Nett (Berat Bersih) - Kg
                      </label>
                      <input
                        type="number"
                        readOnly
                        placeholder="Gross − Tare"
                        value={timbangNett}
                        className="w-full px-3 py-2 bg-stone-900/90 border border-emerald-500/40 rounded-xl text-emerald-400 font-mono font-black focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500 flex items-center justify-between">
                    <span>Kalkulasi Otomatis: Nett = Gross − Tare</span>
                    {timbangGross !== '' && timbangTare !== '' && (
                      <span className="text-emerald-400 font-bold">
                        Nett: {Number(timbangNett || 0).toLocaleString('id-ID')} Kg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Baris 5: k. PIC FOG Name (Dropdown Reff Manpower Modul 2) */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  k. PIC FOG Name (Reff: Manpower Modul 2) <span className="text-amber-400">*</span>
                </label>
                <select
                  value={picFogName}
                  onChange={(e) => handlePicChange(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono text-xs"
                >
                  <option value="">-- Pilih PIC FOG (Urut Jabatan &amp; Nama) --</option>
                  {sortedManpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      [{m.jabatan}] {m.nama} ({m.nik})
                    </option>
                  ))}
                </select>
                {picFogJabatan && (
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    Jabatan Terpilih: {picFogJabatan}
                  </span>
                )}
              </div>

              {/* Baris 6: l. Tanggal dan jam Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    l. Tanggal Input <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Jam Input <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={jam}
                    onChange={(e) => setJam(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Baris 7: m. Remark */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Remark / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi BBM solar, density, segel transportir dll"
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
                  {editingId ? 'Simpan Perubahan' : 'Catat Input Stock Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-stone-100 font-mono">Hapus Transaksi Penerimaan Fuel?</h4>
              <p className="text-xs text-stone-400 mt-1">
                Data penerimaan ini akan dihapus dan mempengaruhi total perhitungan stock tangki utama.
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
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
