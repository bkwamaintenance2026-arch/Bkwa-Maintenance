import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  P2HRecord, 
  P2HCheckItem, 
  P2HCheckStatus, 
  P2HKelayakanStatus, 
  UserAccount 
} from '../../types';
import { canUserEditModule, canUserExportModule, isDeveloper } from '../../utils/storage';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  Trash2, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Truck, 
  User, 
  CheckSquare, 
  Square, 
  ArrowLeft, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  Upload,
  CheckCircle,
  HelpCircle,
  X,
  FileText,
  BarChart3,
  Edit3
} from 'lucide-react';

interface P2HViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  p2hRecords: P2HRecord[];
  currentUser: UserAccount;
  onSaveP2H: (
    data: Omit<P2HRecord, 'id' | 'noP2H' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => { success: boolean; message: string; record?: P2HRecord };
  onDeleteP2H: (id: string) => { success: boolean; message: string };
  onBackToMainMenu: () => void;
  isSubModule?: boolean;
}

// 9 Standar Pemeriksaan P2H PT BKWA sesuai instruksi:
// a. WalkAround Check (6 items)
// b. Pemeriksaan Kabin & Operational (3 items)
const INITIAL_CHECKLIST_ITEMS: P2HCheckItem[] = [
  // a. WalkAround Check
  {
    id: 'wa-1',
    itemNo: 1,
    category: 'WALKAROUND',
    title: 'Kondisi Fisik & Struktur',
    description: 'Cek ada/tidaknya retak, penyok, atau kerusakan pada bodi, attachment (bucket/blade/dump), dan undercarriage/ban.',
    status: 'OK',
  },
  {
    id: 'wa-2',
    itemNo: 2,
    category: 'WALKAROUND',
    title: 'Pemeriksaan Kebocoran',
    description: 'Periksa apakah ada ceceran/tetesan oli, bahan bakar, atau air coolant di bawah unit atau kebocoran angin sistem rem.',
    status: 'OK',
  },
  {
    id: 'wa-3',
    itemNo: 3,
    category: 'WALKAROUND',
    title: 'Level Fluida (Cairan)',
    description: 'Cek level oli mesin, oli hidrolik, dan coolant radiator (melalui sight glass atau stick dipstick).',
    status: 'OK',
  },
  {
    id: 'wa-4',
    itemNo: 4,
    category: 'WALKAROUND',
    title: 'Bahan Bakar & Water Separator',
    description: 'Pastikan bahan bakar cukup, buang air/endapan pada water separator jika ada, serta buang angin/drain pada tangki angin.',
    status: 'OK',
  },
  {
    id: 'wa-5',
    itemNo: 5,
    category: 'WALKAROUND',
    title: 'Kekencangan V-Belt & Terminal Battery',
    description: 'Cek kekencangan tali kipas / V-Belt alternator, kebersihan dan kekencangan terminal pole battery.',
    status: 'OK',
  },
  {
    id: 'wa-6',
    itemNo: 6,
    category: 'WALKAROUND',
    title: 'Ban / Track & Baut Roda / Shoe',
    description: 'Cek tekanan/kondisi fisik ban atau ketegangan track link, serta pastikan tidak ada baut roda/shoe yang kendor atau hilang.',
    status: 'OK',
  },

  // b. Pemeriksaan Kabin & Operational
  {
    id: 'kb-1',
    itemNo: 7,
    category: 'KABIN_OPERASIONAL',
    title: 'Indikator & Panel Dashboard',
    description: 'Nyalakan mesin, periksa apakah ada error code atau lampu peringatan (warning light / check engine) yang menyala di monitor dashboard.',
    status: 'OK',
  },
  {
    id: 'kb-2',
    itemNo: 8,
    category: 'KABIN_OPERASIONAL',
    title: 'Fungsi Rem & Steering (Kemudi)',
    description: 'Tes fungsi rem kerja (service brake), rem parkir (parking brake), dan respons kemudi/steering merespons dengan presisi.',
    status: 'OK',
  },
  {
    id: 'kb-3',
    itemNo: 9,
    category: 'KABIN_OPERASIONAL',
    title: 'Fungsi Kontrol / Work Equipment',
    description: 'Gerakkan hidrolik attachment (bucket/blade/mast/dump) untuk memastikan respons lancar tanpa suara yang tidak wajar.',
    status: 'OK',
  },
];

export const P2HView: React.FC<P2HViewProps> = ({
  units,
  manpowerList,
  p2hRecords,
  currentUser,
  onSaveP2H,
  onDeleteP2H,
  onBackToMainMenu,
  isSubModule = false,
}) => {
  // Otorisasi Modul 5:
  // Admin, Member, dan Developer bisa Input Form P2H.
  // Developer, Admin, dan Khusus bisa Export data P2H.
  const canInput = canUserEditModule(currentUser, 5);
  const canExport = canUserExportModule(currentUser, 5);

  const [activeTab, setActiveTab] = useState<'form' | 'riwayat'>('form');

  const get24HourTime = (date: Date = new Date()) => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Real-time auto timestamp clock (Format 24 Jam: 00:00 - 23:59 tanpa AM/PM)
  const [currentRealTime, setCurrentRealTime] = useState({
    date: new Date().toISOString().split('T')[0],
    time: get24HourTime(),
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentRealTime({
        date: now.toISOString().split('T')[0],
        time: get24HourTime(now),
      });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Form State: Bagian 1 Informasi Umum
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNoP2H, setEditingNoP2H] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState(
    currentUser.role === 'KARYAWAN' ? currentUser.fullName : ''
  );
  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [selectedNoUnit, setSelectedNoUnit] = useState<string>('');
  const [hmKmValue, setHmKmValue] = useState<string>('');

  // Form State: Bagian 2 Checklist Items
  const [checklistItems, setChecklistItems] = useState<P2HCheckItem[]>(INITIAL_CHECKLIST_ITEMS);

  // Form State: Bagian 2c Pelaporan & Validasi Akhir
  const [statusKelayakan, setStatusKelayakan] = useState<P2HKelayakanStatus>('LAYAK_OPERASI');
  const [catatanUmum, setCatatanUmum] = useState<string>('');
  const [persetujuanJujur, setPersetujuanJujur] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modal View Detail Record
  const [viewingRecord, setViewingRecord] = useState<P2HRecord | null>(null);

  // Filter Riwayat
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dismiss feedback
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Daftar Jenis Alat unik yang ada di Modul 1
  const availableJenisList = useMemo(() => {
    const list = units.map((u) => (u.jenis || '').trim()).filter(Boolean);
    const unique = Array.from(new Set(list));
    // Default fallback jika belum ada data jenis di asset
    if (unique.length === 0) {
      return ['Excavator', 'Dump Truck', 'Wheel Loader', 'Bulldozer', 'Stone Crusher', 'Support'];
    }
    return unique.sort();
  }, [units]);

  // Daftar Unit (CN_NEW) yang terfilter berdasarkan Jenis yang dipilih
  const availableUnitsForJenis = useMemo(() => {
    if (!selectedJenis) return [];
    return units.filter((u) => (u.jenis || '').trim().toUpperCase() === selectedJenis.trim().toUpperCase());
  }, [units, selectedJenis]);

  // Objek unit yang terpilih
  const selectedUnitObj = useMemo(() => {
    if (!selectedNoUnit) return null;
    return units.find((u) => u.cnNew === selectedNoUnit) || null;
  }, [units, selectedNoUnit]);

  // 1. Tombol Cepat: Check All OK (Sesuai spesifikasi poin 7.d)
  const handleCheckAllOk = () => {
    setChecklistItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'OK',
      }))
    );
    setStatusKelayakan('LAYAK_OPERASI');
    setFeedback({
      type: 'info',
      message: 'Semua 9 item checklist berhasil diatur ke status "OK" (Normal).',
    });
  };

  // Ubah status item individual
  const handleItemStatusChange = (itemId: string, newStatus: P2HCheckStatus) => {
    setChecklistItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            status: newStatus,
          };
        }
        return item;
      })
    );

    // Rekomendasi otomatis: jika ada item Rusak/Abnormal, sarankan Tidak Layak
    if (newStatus === 'RUSAK_ABNORMAL') {
      setStatusKelayakan('TIDAK_LAYAK');
    }
  };

  // Ubah catatan kerusakan pada item
  const handleItemCatatanChange = (itemId: string, catatan: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, catatanKerusakan: catatan } : item))
    );
  };

  // Upload foto kerusakan (Base64)
  const handleItemFotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar/foto yang diperbolehkan.');
      return;
    }

    // Limit 4MB
    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran foto maksimal 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setChecklistItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, fotoKerusakan: base64Url } : item))
      );
    };
    reader.readAsDataURL(file);
  };

  // Hapus foto kerusakan
  const handleRemoveFoto = (itemId: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, fotoKerusakan: undefined } : item))
    );
  };

  // Reset Form
  const handleResetForm = () => {
    setEditingId(null);
    setEditingNoP2H(null);
    setSelectedJenis('');
    setSelectedNoUnit('');
    setHmKmValue('');
    setChecklistItems(INITIAL_CHECKLIST_ITEMS);
    setStatusKelayakan('LAYAK_OPERASI');
    setCatatanUmum('');
    setPersetujuanJujur(true);
  };

  // Open Edit P2H Form (Developer Access)
  const handleOpenEditP2H = (rec: P2HRecord) => {
    setEditingId(rec.id);
    setEditingNoP2H(rec.noP2H);
    setOperatorName(rec.operatorName);
    setSelectedJenis(rec.jenisAlat || '');
    setSelectedNoUnit(rec.noUnit);
    setHmKmValue(String(rec.hmKm));
    setChecklistItems(rec.items && rec.items.length > 0 ? rec.items : INITIAL_CHECKLIST_ITEMS);
    setStatusKelayakan(rec.statusKelayakan);
    setCatatanUmum(rec.catatanUmum || '');
    setPersetujuanJujur(true);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Simpan Form P2H
  const handleSubmitP2H = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canInput) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Anda tidak memiliki izin untuk menginput formulir P2H.',
      });
      return;
    }

    if (!operatorName.trim()) {
      setFeedback({ type: 'error', message: 'Silakan pilih Nama Operator terlebih dahulu.' });
      return;
    }

    if (!selectedNoUnit) {
      setFeedback({ type: 'error', message: 'Silakan pilih Jenis dan No Unit / No Alat.' });
      return;
    }

    if (!hmKmValue || isNaN(Number(hmKmValue))) {
      setFeedback({ type: 'error', message: 'HM / KM harus diisi dengan angka yang valid.' });
      return;
    }

    if (!persetujuanJujur) {
      setFeedback({
        type: 'error',
        message: 'Anda harus mencentang persetujuan pernyataan kejujuran pengecekan aktual.',
      });
      return;
    }

    // Validasi apakah ada item RUSAK_ABNORMAL yang belum diberi catatan kerusakan
    const unannotatedDamages = checklistItems.filter(
      (item) => item.status === 'RUSAK_ABNORMAL' && (!item.catatanKerusakan || !item.catatanKerusakan.trim())
    );

    if (unannotatedDamages.length > 0) {
      setFeedback({
        type: 'error',
        message: `Silakan isi Catatan Kerusakan pada item: ${unannotatedDamages.map((i) => i.title).join(', ')}.`,
      });
      return;
    }

    const matchedOperator = manpowerList.find((m) => m.nama === operatorName);

    const recordData = {
      timestamp: new Date().toISOString(),
      tanggal: currentRealTime.date,
      jam: currentRealTime.time,
      operatorName: operatorName.trim(),
      operatorJabatan: matchedOperator?.jabatan || 'Operator Lapangan',
      jenisAlat: selectedJenis || selectedUnitObj?.jenis || 'Unit',
      noUnit: selectedNoUnit,
      namaAlat: selectedUnitObj?.namaAlat || selectedNoUnit,
      brandMerk: selectedUnitObj?.brandMerk || '',
      modelUnit: selectedUnitObj?.modelUnit || '',
      hmKm: Number(hmKmValue),
      items: checklistItems,
      statusKelayakan,
      catatanUmum: catatanUmum.trim(),
      persetujuanJujur: true,
      operatorSignatureName: operatorName.trim(),
      confirmedAt: new Date().toISOString(),
      createdByUserId: currentUser.id,
      createdByEmail: currentUser.email,
    };

    const res = onSaveP2H(recordData, editingId);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
      });
      handleResetForm();
      setActiveTab('riwayat');
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  // Filter Data Riwayat
  const filteredRiwayat = useMemo(() => {
    return p2hRecords.filter((rec) => {
      if (filterDate && rec.tanggal !== filterDate) return false;
      if (filterUnit && rec.noUnit !== filterUnit) return false;
      if (filterStatus && rec.statusKelayakan !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchOperator = rec.operatorName.toLowerCase().includes(term);
        const matchUnit = rec.noUnit.toLowerCase().includes(term);
        const matchAlat = rec.namaAlat.toLowerCase().includes(term);
        const matchNoP2H = rec.noP2H.toLowerCase().includes(term);
        if (!matchOperator && !matchUnit && !matchAlat && !matchNoP2H) return false;
      }
      return true;
    });
  }, [p2hRecords, filterDate, filterUnit, filterStatus, searchTerm]);

  // Export Riwayat P2H to Excel / CSV
  const handleExportRiwayatCSV = () => {
    if (filteredRiwayat.length === 0) {
      alert('Tidak ada data riwayat P2H untuk di-export.');
      return;
    }

    const headers = [
      'No P2H',
      'Tanggal',
      'Jam',
      'Operator',
      'Jenis Alat',
      'No Unit (CN)',
      'Nama Alat',
      'HM/KM',
      'Status Kelayakan',
      'Jumlah Abnormal',
      'Catatan Kerusakan',
      'Persetujuan Digital',
    ];

    const rows = filteredRiwayat.map((rec) => {
      const abnormalItems = (rec.items || []).filter((i) => i.status === 'RUSAK_ABNORMAL');
      const catatanRingkas = abnormalItems
        .map((i) => `[${i.title}]: ${i.catatanKerusakan || 'Tanpa catatan'}`)
        .join('; ');

      return [
        `"${rec.noP2H}"`,
        `"${rec.tanggal}"`,
        `"${rec.jam}"`,
        `"${rec.operatorName}"`,
        `"${rec.jenisAlat}"`,
        `"${rec.noUnit}"`,
        `"${rec.namaAlat}"`,
        `"${rec.hmKm}"`,
        `"${rec.statusKelayakan === 'LAYAK_OPERASI' ? 'Layak Operasi' : 'Tidak Layak'}"`,
        `"${abnormalItems.length}"`,
        `"${catatanRingkas.replace(/"/g, '""')}"`,
        `"Tervalidasi (${rec.operatorSignatureName})"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [
      `"PT BATU KALI WELANG AMPUH (ETIKA) - LAPORAN PEMERIKSAAN HARIAN PRA-OPERASI (P2H)"`,
      `"Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Riwayat: ${filteredRiwayat.length}"`,
      '',
      headers.join(','),
      ...rows
    ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_P2H_PT_BATU_KALI_WELANG_AMPUH_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cetak Dokumen P2H via Print Browser
  const handlePrintP2HRecord = (rec: P2HRecord) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan di peramban Anda.');
      return;
    }

    const waItems = (rec.items || []).filter((i) => i.category === 'WALKAROUND');
    const kbItems = (rec.items || []).filter((i) => i.category === 'KABIN_OPERASIONAL');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form P2H - ${rec.noP2H} - ${rec.noUnit}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #111; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 15px; }
          .company { font-size: 16px; font-weight: bold; }
          .doc-title { font-size: 14px; font-weight: bold; margin-top: 5px; text-transform: uppercase; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .info-table td { padding: 4px 6px; }
          .check-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .check-table th, .check-table td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
          .check-table th { background: #f0f0f0; }
          .status-ok { color: green; font-weight: bold; }
          .status-bad { color: red; font-weight: bold; }
          .status-na { color: #666; }
          .badge-layak { display: inline-block; padding: 4px 8px; background: #e6ffed; border: 1px solid #52c41a; color: #389e0d; font-weight: bold; }
          .badge-tidak { display: inline-block; padding: 4px 8px; background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; font-weight: bold; }
          .sig-box { margin-top: 20px; display: flex; justify-content: space-between; }
          .sig-col { text-align: center; width: 40%; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">PT BATU KALI WELANG AMPUH (ETIKA)</div>
          <div>DIVISI MAINTENANCE, QUARRY & ALAT BERAT</div>
          <div class="doc-title">LEMBAR PEMERIKSAAN HARIAN (P2H) UNIT</div>
          <div>No. Dokumen: <strong>${rec.noP2H}</strong> | Tanggal: ${rec.tanggal} ${rec.jam} WIB</div>
        </div>

        <table class="info-table">
          <tr>
            <td width="20%"><strong>Nama Operator:</strong></td>
            <td width="30%">${rec.operatorName} (${rec.operatorJabatan || 'Operator'})</td>
            <td width="20%"><strong>Jenis Unit:</strong></td>
            <td width="30%">${rec.jenisAlat}</td>
          </tr>
          <tr>
            <td><strong>No Unit (CN_NEW):</strong></td>
            <td><strong>${rec.noUnit}</strong></td>
            <td><strong>Nama Alat:</strong></td>
            <td>${rec.namaAlat}</td>
          </tr>
          <tr>
            <td><strong>Brand & Model:</strong></td>
            <td>${rec.brandMerk || '-'} / ${rec.modelUnit || '-'}</td>
            <td><strong>HM / KM:</strong></td>
            <td><strong>${rec.hmKm}</strong></td>
          </tr>
        </table>

        <h4>I. WALKAROUND CHECK (SEKELILING UNIT)</h4>
        <table class="check-table">
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="35%">Item Pemeriksaan</th>
              <th width="15%">Hasil Cek</th>
              <th width="45%">Catatan Kerusakan / Abnormalitas</th>
            </tr>
          </thead>
          <tbody>
            ${waItems.map((item, idx) => `
              <tr>
                <td align="center">${idx + 1}</td>
                <td><strong>${item.title}</strong><br><small style="color:#555">${item.description}</small></td>
                <td>
                  <span class="${item.status === 'OK' ? 'status-ok' : (item.status === 'RUSAK_ABNORMAL' ? 'status-bad' : 'status-na')}">
                    ${item.status === 'OK' ? '✓ OK' : (item.status === 'RUSAK_ABNORMAL' ? '✗ RUSAK / ABNORMAL' : '- TIDAK ADA')}
                  </span>
                </td>
                <td>${item.catatanKerusakan || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h4>II. PEMERIKSAAN KABIN & OPERASIONAL</h4>
        <table class="check-table">
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="35%">Item Pemeriksaan</th>
              <th width="15%">Hasil Cek</th>
              <th width="45%">Catatan Kerusakan / Abnormalitas</th>
            </tr>
          </thead>
          <tbody>
            ${kbItems.map((item, idx) => `
              <tr>
                <td align="center">${idx + 1}</td>
                <td><strong>${item.title}</strong><br><small style="color:#555">${item.description}</small></td>
                <td>
                  <span class="${item.status === 'OK' ? 'status-ok' : (item.status === 'RUSAK_ABNORMAL' ? 'status-bad' : 'status-na')}">
                    ${item.status === 'OK' ? '✓ OK' : (item.status === 'RUSAK_ABNORMAL' ? '✗ RUSAK / ABNORMAL' : '- TIDAK ADA')}
                  </span>
                </td>
                <td>${item.catatanKerusakan || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 15px; border: 1px solid #333; padding: 10px;">
          <div><strong>STATUS KELAYAKAN AKHIR:</strong> 
            <span class="${rec.statusKelayakan === 'LAYAK_OPERASI' ? 'badge-layak' : 'badge-tidak'}">
              ${rec.statusKelayakan === 'LAYAK_OPERASI' ? '✓ LAYAK OPERASI (SAFE TO OPERATE)' : '✗ TIDAK LAYAK / PERLU PERBAIKAN (UNSAFE)'}
            </span>
          </div>
          ${rec.catatanUmum ? `<div style="margin-top:5px;"><strong>Catatan Umum Tambahan:</strong> ${rec.catatanUmum}</div>` : ''}
          <div style="margin-top: 8px; font-size: 11px; color: #333;">
            <em>Konfirmasi Digital: "Pengecekan telah dilakukan dengan jujur sesuai kondisi aktual unit di lapangan."</em>
          </div>
        </div>

        <div class="sig-box">
          <div class="sig-col">
            <p>Operator Lapangan</p>
            <br><br><br>
            <p><strong>(${rec.operatorSignatureName})</strong></p>
          </div>
          <div class="sig-col">
            <p>Pengawas / Foreman Maintenance</p>
            <br><br><br>
            <p><strong>( ..................................... )</strong></p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Navigation Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {!isSubModule && (
              <button
                id="btn-p2h-back-menu"
                type="button"
                onClick={onBackToMainMenu}
                className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition mr-2 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Menu Utama</span>
              </button>
            )}
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
              {isSubModule ? 'SUB MODUL 1' : 'MODUL 5'}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-stone-100 font-mono tracking-wide uppercase mt-1">
            {isSubModule ? 'SUB MODUL 1: FORM PEMERIKSAAN HARIAN (P2H) UNIT' : 'FORM PEMERIKSAAN HARIAN (P2H) UNIT'}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Checklist Pra-Operasional Kendaraan &amp; Alat Berat PT BKWA Quarry Purwosari.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
          <button
            id="tab-p2h-form"
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'form'
                ? 'bg-teal-500 text-stone-950 shadow-md shadow-teal-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Form Input P2H</span>
          </button>

          <button
            id="tab-p2h-riwayat"
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'riwayat'
                ? 'bg-teal-500 text-stone-950 shadow-md shadow-teal-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Riwayat P2H ({p2hRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/80 border-rose-700 text-rose-200'
              : 'bg-stone-900 border-amber-500/40 text-amber-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : feedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: FORM INPUT P2H */}
      {/* ============================================================ */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmitP2H} className="space-y-6">
          {/* Edit Mode Alert Banner (Developer Access) */}
          {editingId && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-xs font-mono text-amber-200 shadow-lg">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-white text-sm">Mode Edit Laporan P2H: {editingNoP2H}</span>
                  <p className="text-[11px] text-amber-300 font-sans mt-0.5">
                    Anda sedang memperbarui data P2H ini dengan hak akses Developer. Klik Simpan untuk memperbarui.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition shrink-0"
              >
                Batal Edit
              </button>
            </div>
          )}

          {/* Quick Bar: Tombol Cepat Check All OK (Poin 7.d) */}
          <div className="bg-gradient-to-r from-teal-950/70 via-stone-900 to-teal-950/70 border border-teal-600/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100 font-mono">
                  Mode Cepat Pra-Shift (Fast Check)
                </h3>
                <p className="text-xs text-stone-300">
                  Jika unit dalam kondisi normal, gunakan tombol ini untuk langsung memilih OK pada semua item pemeriksaan.
                </p>
              </div>
            </div>

            <button
              id="btn-p2h-check-all-ok"
              type="button"
              onClick={handleCheckAllOk}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 font-black text-xs transition shadow-lg shadow-teal-500/25 active:scale-95 shrink-0"
            >
              <CheckCircle className="w-4 h-4" />
              <span>⚡ CHECK ALL OK</span>
            </button>
          </div>

          {/* BAGIAN 1: INFORMASI UMUM (Poin 7.a) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-xl">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-stone-800">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                BAGIAN 1
              </span>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                INFORMASI UMUM OPERATOR & UNIT
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Nama Operator (Dropdown dari Data Manpower) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Nama Operator (Wajib)</span>
                </label>
                <select
                  id="select-p2h-operator"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Nama dari Data Manpower --</option>
                  {manpowerList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan || 'Personil'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Timestamp (Otomatis real-time) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>2. Timestamp (Otomatis Real-time)</span>
                </label>
                <div className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs font-mono text-stone-300 flex items-center justify-between">
                  <span>{currentRealTime.date}</span>
                  <span className="text-teal-400 font-bold">{currentRealTime.time} WIB</span>
                </div>
              </div>

              {/* 3. Pilihan Ganda Jenis Alat dari Modul 1 */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Jenis Alat (Modul 1)</span>
                </label>
                <select
                  id="select-p2h-jenis"
                  required
                  value={selectedJenis}
                  onChange={(e) => {
                    setSelectedJenis(e.target.value);
                    setSelectedNoUnit('');
                  }}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                >
                  <option value="">-- Pilih Jenis Alat --</option>
                  {availableJenisList.map((jenis) => (
                    <option key={jenis} value={jenis}>
                      {jenis}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. HM / KM (Type Number) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                  <span>4. HM / KM Saat Ini (Angka)</span>
                </label>
                <input
                  id="input-p2h-hm-km"
                  type="number"
                  step="0.1"
                  required
                  placeholder="Contoh: 12450.5"
                  value={hmKmValue}
                  onChange={(e) => setHmKmValue(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Pilihan Tombol Jenis Alat Secara Visual & Dropdown No Unit */}
            {selectedJenis && (
              <div className="mt-4 p-4 bg-stone-950/70 border border-stone-800 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Pilih No Unit / No Alat ({availableUnitsForJenis.length} Unit Tersedia)
                    </label>
                    <select
                      id="select-p2h-no-unit"
                      required
                      value={selectedNoUnit}
                      onChange={(e) => setSelectedNoUnit(e.target.value)}
                      className="w-full bg-stone-900 border border-amber-500/50 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih No Unit (CN_NEW) --</option>
                      {availableUnitsForJenis.map((u) => (
                        <option key={u.id} value={u.cnNew}>
                          {u.cnNew} - {u.namaAlat} ({u.brandMerk || ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Info Otomatis Nama Alat di Bawahnya */}
                  <div>
                    <span className="block text-[11px] font-mono text-stone-400 mb-1">
                      Nama Alat & Spesifikasi Otomatis:
                    </span>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 font-mono">
                      {selectedUnitObj ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-amber-400 font-bold">{selectedUnitObj.namaAlat}</span>
                          <span className="text-stone-400">| Brand: {selectedUnitObj.brandMerk || '-'}</span>
                          <span className="text-stone-400">| Model: {selectedUnitObj.modelUnit || '-'}</span>
                          <span className="text-stone-400">| Lokasi: {selectedUnitObj.loc || '-'}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Pilih nomor unit untuk menampilkan rincian alat</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BAGIAN 2: CHECKLIST PEMERIKSAAN (Poin 7.b) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  BAGIAN 2
                </span>
                <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                  CHECKLIST PEMERIKSAAN HARIAN (9 POIN)
                </h2>
              </div>
              <span className="text-[11px] text-stone-400 font-mono hidden sm:inline-block">
                Pilih: OK / Rusak / Tidak Ada
              </span>
            </div>

            {/* Sub Bagian 2.a: WalkAround Check (6 items) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-bold text-amber-400 font-mono">
                  A. WalkAround Check (Pemeriksaan Sekeliling Unit - 6 Poin)
                </span>
              </div>

              <div className="space-y-3">
                {checklistItems
                  .filter((i) => i.category === 'WALKAROUND')
                  .map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.status === 'OK'
                          ? 'bg-stone-950/60 border-stone-800'
                          : item.status === 'RUSAK_ABNORMAL'
                          ? 'bg-rose-950/30 border-rose-700/60'
                          : 'bg-stone-950/40 border-stone-850'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-0.5 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-mono flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-[11px] text-stone-400 pl-7 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* 3 Tombol Status Pilihan: OK, Rusak/Abnormal, Tidak Ada */}
                        <div className="flex items-center gap-1.5 pl-7 lg:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'OK')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'OK'
                                ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>OK</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'RUSAK_ABNORMAL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'RUSAK_ABNORMAL'
                                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Rusak / Abnormal</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'TIDAK_ADA')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'TIDAK_ADA'
                                ? 'bg-stone-700 text-stone-100 border-stone-600'
                                : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-stone-800'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tidak Ada</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Section jika status Rusak/Abnormal: Catatan Kerusakan & Upload Foto */}
                      {item.status === 'RUSAK_ABNORMAL' && (
                        <div className="mt-3.5 pt-3.5 border-t border-rose-900/40 pl-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                              Catatan Kerusakan (Wajib dijelaskan):
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={item.catatanKerusakan || ''}
                              onChange={(e) => handleItemCatatanChange(item.id, e.target.value)}
                              placeholder="Deskripsikan bagian yang retak, bocor, aus, atau kendor..."
                              className="w-full bg-stone-900 border border-rose-800/80 rounded-xl p-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-rose-400" />
                              <span>Upload Foto Kerusakan (Kamera / Galeri HP):</span>
                            </label>
                            {item.fotoKerusakan ? (
                              <div className="relative inline-block group">
                                <img
                                  src={item.fotoKerusakan}
                                  alt="Foto Kerusakan"
                                  className="w-24 h-20 object-cover rounded-xl border border-rose-600 shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFoto(item.id)}
                                  className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg"
                                  title="Hapus foto"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-850 border border-dashed border-rose-700/60 rounded-xl cursor-pointer text-xs text-rose-200">
                                <Upload className="w-4 h-4 text-rose-400" />
                                <span>Pilih / Ambil Foto Kerusakan</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handleItemFotoUpload(item.id, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Sub Bagian 2.b: Pemeriksaan Kabin & Operational (3 items) */}
            <div className="space-y-4 pt-4 border-t border-stone-800">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-400 font-mono">
                  B. Pemeriksaan Kabin & Operasional (3 Poin)
                </span>
              </div>

              <div className="space-y-3">
                {checklistItems
                  .filter((i) => i.category === 'KABIN_OPERASIONAL')
                  .map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.status === 'OK'
                          ? 'bg-stone-950/60 border-stone-800'
                          : item.status === 'RUSAK_ABNORMAL'
                          ? 'bg-rose-950/30 border-rose-700/60'
                          : 'bg-stone-950/40 border-stone-850'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-0.5 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-mono flex items-center justify-center font-bold">
                              {index + 7}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-[11px] text-stone-400 pl-7 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* 3 Tombol Status Pilihan */}
                        <div className="flex items-center gap-1.5 pl-7 lg:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'OK')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'OK'
                                ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>OK</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'RUSAK_ABNORMAL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'RUSAK_ABNORMAL'
                                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Rusak / Abnormal</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'TIDAK_ADA')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              item.status === 'TIDAK_ADA'
                                ? 'bg-stone-700 text-stone-100 border-stone-600'
                                : 'bg-stone-850 hover:bg-stone-800 text-stone-400 border-stone-800'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tidak Ada</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Section jika status Rusak/Abnormal */}
                      {item.status === 'RUSAK_ABNORMAL' && (
                        <div className="mt-3.5 pt-3.5 border-t border-rose-900/40 pl-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                              Catatan Kerusakan (Wajib dijelaskan):
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={item.catatanKerusakan || ''}
                              onChange={(e) => handleItemCatatanChange(item.id, e.target.value)}
                              placeholder="Deskripsikan lampu peringatan monitor, rem blong, atau hidrolik macet..."
                              className="w-full bg-stone-900 border border-rose-800/80 rounded-xl p-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-rose-400" />
                              <span>Upload Foto Kerusakan:</span>
                            </label>
                            {item.fotoKerusakan ? (
                              <div className="relative inline-block group">
                                <img
                                  src={item.fotoKerusakan}
                                  alt="Foto Kerusakan"
                                  className="w-24 h-20 object-cover rounded-xl border border-rose-600 shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFoto(item.id)}
                                  className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg"
                                  title="Hapus foto"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-850 border border-dashed border-rose-700/60 rounded-xl cursor-pointer text-xs text-rose-200">
                                <Upload className="w-4 h-4 text-rose-400" />
                                <span>Pilih / Ambil Foto Kerusakan</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handleItemFotoUpload(item.id, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* BAGIAN 2.C: PELAPORAN & VALIDASI AKHIR (Poin 7.c) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                BAGIAN 2.C
              </span>
              <h2 className="text-base font-black text-stone-100 font-mono tracking-wide uppercase">
                PELAPORAN & VALIDASI AKHIR OPERATOR
              </h2>
            </div>

            {/* 1. Status Kelayakan Unit */}
            <div>
              <label className="block text-xs font-bold text-stone-200 mb-2">
                1. Status Kelayakan Operasi Unit:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setStatusKelayakan('LAYAK_OPERASI')}
                  className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                    statusKelayakan === 'LAYAK_OPERASI'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/50'
                      : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:bg-stone-850'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    statusKelayakan === 'LAYAK_OPERASI' ? 'border-emerald-400 bg-emerald-500 text-stone-950' : 'border-stone-700'
                  }`}>
                    {statusKelayakan === 'LAYAK_OPERASI' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block">
                      [ ✓ ] Layak Operasi (Safe to Operate)
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Unit aman untuk digunakan beroperasi di quarry.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setStatusKelayakan('TIDAK_LAYAK')}
                  className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                    statusKelayakan === 'TIDAK_LAYAK'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50'
                      : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:bg-stone-850'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    statusKelayakan === 'TIDAK_LAYAK' ? 'border-rose-400 bg-rose-500 text-white' : 'border-stone-700'
                  }`}>
                    {statusKelayakan === 'TIDAK_LAYAK' && <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block">
                      [ ✗ ] Tidak Layak / Perlu Perbaikan (Unsafe - Stop)
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Unit di-stop sementara menunggu penanganan tim mekanik.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Catatan Umum Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Catatan Umum / Rekomendasi Operator (Opsional):
              </label>
              <textarea
                rows={2}
                value={catatanUmum}
                onChange={(e) => setCatatanUmum(e.target.value)}
                placeholder="Tambahkan catatan khusus terkait pekerjaan, area quarry, atau pesan ke foreman..."
                className="w-full bg-stone-800 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 2. Tanda Tangan Digital / Konfirmasi Persetujuan */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-start gap-3">
              <input
                id="checkbox-persetujuan-jujur"
                type="checkbox"
                required
                checked={persetujuanJujur}
                onChange={(e) => setPersetujuanJujur(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-amber-500 bg-stone-800 border-stone-700 rounded focus:ring-amber-500"
              />
              <label htmlFor="checkbox-persetujuan-jujur" className="text-xs text-stone-300 cursor-pointer leading-relaxed">
                <span className="font-bold text-amber-400">Pernyataan Konfirmasi Operator: </span>
                "Saya menyatakan bahwa pengecekan fisik dan operasional unit telah saya lakukan dengan jujur sesuai kondisi aktual unit sebelum dioperasikan."
              </label>
            </div>

            {/* Action Submit Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <button
                id="btn-submit-p2h-form"
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 text-xs font-black transition shadow-lg shadow-teal-500/25 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>KIRIM / SIMPAN LAPORAN P2H</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* TAB 2: RIWAYAT PEMERIKSAAN P2H */}
      {/* ============================================================ */}
      {activeTab === 'riwayat' && (
        <div className="space-y-5">
          {/* Top Filter & Export Bar */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-stone-100 font-mono uppercase">
                  Filter Riwayat P2H ({filteredRiwayat.length} Data Ditemukan)
                </h3>
              </div>

              {canExport && (
                <button
                  type="button"
                  onClick={handleExportRiwayatCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20 self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel (CSV)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Operator / Unit */}
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">Cari Operator / Unit:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nama, No Unit, No P2H..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Filter Tanggal */}
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">Filter Tanggal:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Filter Unit */}
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">Filter No Unit:</label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                >
                  <option value="">-- Semua Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.cnNew}>
                      {u.cnNew} - {u.namaAlat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status Kelayakan */}
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">Status Kelayakan:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Semua Status --</option>
                  <option value="LAYAK_OPERASI">Layak Operasi</option>
                  <option value="TIDAK_LAYAK">Tidak Layak / Stop</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Riwayat P2H */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
            {filteredRiwayat.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-teal-400" />
                <p className="text-sm font-mono">Belum ada riwayat laporan P2H yang sesuai dengan filter.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="mt-3 px-4 py-2 rounded-xl bg-teal-500 text-stone-950 text-xs font-bold inline-block"
                >
                  Input Form P2H Baru
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">No. P2H</th>
                      <th className="py-3.5 px-4">Tanggal & Jam</th>
                      <th className="py-3.5 px-4">Operator</th>
                      <th className="py-3.5 px-4">Unit / Alat</th>
                      <th className="py-3.5 px-4 text-right">HM / KM</th>
                      <th className="py-3.5 px-4 text-center">Status Kelayakan</th>
                      <th className="py-3.5 px-4 text-center">Temuan Rusak</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono text-stone-300">
                    {filteredRiwayat.map((rec) => {
                      const abnormalCount = (rec.items || []).filter((i) => i.status === 'RUSAK_ABNORMAL').length;

                      return (
                        <tr key={rec.id} className="hover:bg-stone-850/60 transition">
                          <td className="py-3 px-4 font-bold text-teal-400">
                            {rec.noP2H}
                          </td>
                          <td className="py-3 px-4 text-stone-300 text-[11px]">
                            <div>{rec.tanggal}</div>
                            <div className="text-stone-500">{rec.jam} WIB</div>
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-stone-100">
                            {rec.operatorName}
                            <span className="block text-[10px] text-stone-500 font-mono">
                              {rec.operatorJabatan || 'Operator'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-amber-400 block">{rec.noUnit}</span>
                            <span className="text-[10px] text-stone-400 font-sans block">{rec.namaAlat}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-stone-200">
                            {rec.hmKm}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {rec.statusKelayakan === 'LAYAK_OPERASI' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Layak Operasi</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Tidak Layak (Stop)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {abnormalCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-950 border border-rose-700 text-rose-300 font-bold text-[11px]">
                                {abnormalCount} Item
                              </span>
                            ) : (
                              <span className="text-stone-500 text-[11px]">Nihil (Semua OK)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingRecord(rec)}
                                title="Lihat Detail Checklist & Foto"
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-teal-400 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintP2HRecord(rec)}
                                title="Cetak Lembar P2H"
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 transition"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {isDeveloper(currentUser) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditP2H(rec)}
                                    title="Edit Laporan P2H (Developer Only)"
                                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 transition"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Hapus laporan P2H ${rec.noP2H}?`)) {
                                        onDeleteP2H(rec.id);
                                      }
                                    }}
                                    title="Hapus Laporan (Developer Only)"
                                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
      )}

      {/* ============================================================ */}
      {/* MODAL VIEW DETAIL P2H RECORD & FOTO KERUSAKAN */}
      {/* ============================================================ */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  {viewingRecord.noP2H}
                </span>
                <h3 className="text-base font-black text-stone-100 font-mono mt-1">
                  Rincian Hasil P2H Unit: {viewingRecord.noUnit}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintP2HRecord(viewingRecord)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-200 rounded-xl bg-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Summary Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 font-mono">
                <div>
                  <span className="text-stone-500 text-[10px] block">Operator:</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.operatorName}</span>
                </div>
                <div>
                  <span className="text-stone-500 text-[10px] block">Waktu Cek:</span>
                  <span className="text-stone-200">{viewingRecord.tanggal} {viewingRecord.jam}</span>
                </div>
                <div>
                  <span className="text-stone-500 text-[10px] block">No Unit / Alat:</span>
                  <span className="text-amber-400 font-bold">{viewingRecord.noUnit}</span>
                  <span className="text-stone-400 text-[10px] block font-sans">{viewingRecord.namaAlat}</span>
                </div>
                <div>
                  <span className="text-stone-500 text-[10px] block">HM / KM:</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.hmKm}</span>
                </div>
              </div>

              {/* Status Kelayakan Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                viewingRecord.statusKelayakan === 'LAYAK_OPERASI'
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-600 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {viewingRecord.statusKelayakan === 'LAYAK_OPERASI' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>Status: {viewingRecord.statusKelayakan === 'LAYAK_OPERASI' ? 'Layak Operasi (Safe)' : 'Tidak Layak (Unsafe Stop)'}</span>
                </div>
                <span className="text-[11px] font-mono">Tervalidasi Digital</span>
              </div>

              {/* Checklist Results */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-200 font-mono uppercase tracking-wider text-[11px]">
                  Rincian 9 Item Pemeriksaan & Temuan:
                </h4>

                <div className="space-y-2">
                  {(viewingRecord.items || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border ${
                        item.status === 'OK'
                          ? 'bg-stone-950/40 border-stone-800'
                          : item.status === 'RUSAK_ABNORMAL'
                          ? 'bg-rose-950/40 border-rose-800'
                          : 'bg-stone-950/30 border-stone-850'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-stone-200">
                            <span className="text-[10px] font-mono text-stone-500">#{idx + 1}</span>
                            <span>{item.title}</span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">{item.description}</p>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          item.status === 'OK'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'RUSAK_ABNORMAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}>
                          {item.status === 'OK' ? '✓ OK' : (item.status === 'RUSAK_ABNORMAL' ? '✗ Rusak / Abnormal' : '- Tidak Ada')}
                        </span>
                      </div>

                      {/* Tampilkan Catatan & Foto Kerusakan jika ada */}
                      {item.status === 'RUSAK_ABNORMAL' && (
                        <div className="mt-2.5 pt-2.5 border-t border-rose-900/40 space-y-2">
                          <div>
                            <span className="text-[10px] font-mono text-rose-400 font-bold block">Catatan Kerusakan:</span>
                            <p className="text-xs text-stone-200 font-medium bg-stone-900 p-2 rounded-lg border border-rose-900/50">
                              {item.catatanKerusakan || 'Tidak ada catatan tertulis.'}
                            </p>
                          </div>

                          {item.fotoKerusakan && (
                            <div>
                              <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">Bukti Foto Kerusakan:</span>
                              <img
                                src={item.fotoKerusakan}
                                alt="Foto Kerusakan"
                                className="max-w-xs max-h-48 rounded-xl border border-rose-700 object-cover shadow-lg"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
