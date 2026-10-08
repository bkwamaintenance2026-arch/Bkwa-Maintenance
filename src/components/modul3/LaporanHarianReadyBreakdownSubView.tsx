import React, { useState, useMemo, useEffect } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  P2HRecord, 
  UserAccount,
  ManpowerData 
} from '../../types';
import { getAllP2HRecords, getAllManpower } from '../../utils/storage';
import { 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  Download, 
  RotateCcw, 
  Eye, 
  X, 
  ClipboardCheck, 
  Wrench, 
  Clock, 
  User, 
  Layers, 
  Truck, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Users
} from 'lucide-react';
import { PartRequirementModal } from './PartRequirementModal';
import { exportDailyBreakdownToPDF } from '../../utils/pdfGenerator';
import { resolveReportSignatories } from '../../utils/reportSignatories';

interface LaporanHarianReadyBreakdownSubViewProps {
  units: AssetUnit[];
  breakdowns: BreakdownRecord[];
  p2hRecords?: P2HRecord[];
  manpowerList?: ManpowerData[];
  currentUser: UserAccount;
  onNavigateToUpdate?: (record: BreakdownRecord) => void;
  onNavigateToP2H?: () => void;
}

export const LaporanHarianReadyBreakdownSubView: React.FC<LaporanHarianReadyBreakdownSubViewProps> = ({
  units,
  breakdowns,
  p2hRecords: propP2HRecords,
  manpowerList: propManpowerList,
  currentUser,
  onNavigateToUpdate,
  onNavigateToP2H,
}) => {
  // Tanggal hari ini dalam format YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [activeTabSection, setActiveTabSection] = useState<'ALL' | 'READY' | 'BREAKDOWN'>('ALL');

  // Modal Detail P2H
  const [selectedP2HModal, setSelectedP2HModal] = useState<P2HRecord | null>(null);

  // Modal Print Preview
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Modal Kebutuhan Spare Part (Popup saat No Notifikasi / MO diklik)
  const [selectedBreakdownForParts, setSelectedBreakdownForParts] = useState<BreakdownRecord | null>(null);
  const [showPartsModal, setShowPartsModal] = useState<boolean>(false);

  // Data P2H: Kombinasikan props atau baca dari localStorage
  const [localP2HList, setLocalP2HList] = useState<P2HRecord[]>([]);

  useEffect(() => {
    try {
      const records = getAllP2HRecords();
      setLocalP2HList(records);
    } catch (e) {
      console.error('Error loading P2H records in Laporan Harian', e);
    }
  }, [propP2HRecords]);

  const p2hList = useMemo(() => {
    if (propP2HRecords && propP2HRecords.length > 0) {
      return propP2HRecords;
    }
    return localP2HList;
  }, [propP2HRecords, localP2HList]);

  // Data Manpower Modul 2
  const [manpowerData, setManpowerData] = useState<ManpowerData[]>(propManpowerList || []);

  useEffect(() => {
    if (propManpowerList && propManpowerList.length > 0) {
      setManpowerData(propManpowerList);
    } else {
      try {
        const stored = getAllManpower();
        setManpowerData(stored);
      } catch (e) {
        console.error('Error loading manpower in Laporan Harian', e);
      }
    }
  }, [propManpowerList]);

  // Resolusi otomatis penandatangan resmi sesuai instruksi:
  // - Yang Membuat: Admin yang ditunjuk sesuai otoritas di Modul 2 Manpower (Jabatan Administrasi)
  // - Diperiksa Oleh: SPV, jika tidak ada pilih Kabag Workshop
  // - Diketahui Oleh: Kabag Workshop
  const resolvedSig = useMemo(() => {
    return resolveReportSignatories(manpowerData, currentUser);
  }, [manpowerData, currentUser]);

  const [signatories, setSignatories] = useState({
    pembuatName: '',
    pembuatJabatan: 'Administrasi',
    diperiksaName: '',
    diperiksaJabatan: 'Supervisor Maintenance',
    diketahuiName: '',
    diketahuiJabatan: 'Kabag Workshop',
  });

  // Sinkronisasi otomatis saat personil Manpower terdeteksi
  useEffect(() => {
    setSignatories((prev) => ({
      pembuatName: prev.pembuatName || resolvedSig.pembuatName,
      pembuatJabatan: prev.pembuatJabatan || resolvedSig.pembuatJabatan,
      diperiksaName: prev.diperiksaName || resolvedSig.diperiksaName,
      diperiksaJabatan: prev.diperiksaJabatan || resolvedSig.diperiksaJabatan,
      diketahuiName: prev.diketahuiName || resolvedSig.diketahuiName,
      diketahuiJabatan: prev.diketahuiJabatan || resolvedSig.diketahuiJabatan,
    }));
  }, [resolvedSig]);

  // List kandidat personil dari data Manpower Modul 2
  const administrasiCandidates = useMemo(() => {
    return manpowerData.filter((m) => {
      const j = (m.jabatan || '').toUpperCase().trim();
      return j === 'ADMINISTRASI' || j.includes('ADMIN');
    });
  }, [manpowerData]);

  const spvCandidates = useMemo(() => {
    return manpowerData.filter((m) => {
      const j = (m.jabatan || '').toUpperCase().trim();
      return j === 'SPV' || j.includes('SPV') || j.includes('SUPERVISOR');
    });
  }, [manpowerData]);

  const kabagCandidates = useMemo(() => {
    return manpowerData.filter((m) => {
      const j = (m.jabatan || '').toUpperCase().trim();
      return (
        j === 'KABAG WORKSHOP' ||
        j.includes('KABAG') ||
        j.includes('KEPALA BAGIAN') ||
        j.includes('HEAD WORKSHOP') ||
        j.includes('KEPALA BENGKEL')
      );
    });
  }, [manpowerData]);

  // Diperiksa Oleh: cari SPV, jika tidak ada fallback ke Kabag Workshop
  const diperiksaCandidates = useMemo(() => {
    if (spvCandidates.length > 0) return spvCandidates;
    return kabagCandidates;
  }, [spvCandidates, kabagCandidates]);

  // Cek otorisasi export
  const canExport = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.accountTier === 'DEVELOPER' || currentUser.accountTier === 'ADMIN' || currentUser.accountTier === 'KHUSUS') return true;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.modulePermissions?.canExportModul3 || currentUser.modulePermissions?.modul3Maintenance) return true;
    return false;
  }, [currentUser]);

  // Daftar Pilihan Jenis Alat unik
  const availableJenisList = useMemo(() => {
    const setJenis = new Set<string>();
    units.forEach((u) => {
      if (u.jenis) setJenis.add(u.jenis.toUpperCase());
    });
    breakdowns.forEach((b) => {
      if (b.jenis) setJenis.add(b.jenis.toUpperCase());
    });
    p2hList.forEach((p) => {
      if (p.jenisAlat) setJenis.add(p.jenisAlat.toUpperCase());
    });
    return Array.from(setJenis).sort();
  }, [units, breakdowns, p2hList]);

  // 1. DATA UNIT READY: Diambil dari Form Pengisian P2H (Modul 5) yang Layak Operasi
  const readyUnitsFromP2H = useMemo(() => {
    return p2hList.filter((p) => {
      // Filter tanggal jika dipilih
      const matchDate = !selectedDate || p.tanggal === selectedDate;
      // Filter status kelayakan P2H harus LAYAK_OPERASI
      const isLayak = p.statusKelayakan === 'LAYAK_OPERASI';
      
      // Filter Search No Unit / Operator / Nama Alat
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (p.noUnit && p.noUnit.toLowerCase().includes(q)) ||
        (p.namaAlat && p.namaAlat.toLowerCase().includes(q)) ||
        (p.operatorName && p.operatorName.toLowerCase().includes(q)) ||
        (p.noP2H && p.noP2H.toLowerCase().includes(q));

      // Filter Jenis
      const matchJenis = filterJenis === 'ALL' || (p.jenisAlat && p.jenisAlat.toUpperCase() === filterJenis);

      return matchDate && isLayak && matchSearch && matchJenis;
    });
  }, [p2hList, selectedDate, searchQuery, filterJenis]);

  // 2. DATA UNIT BREAKDOWN: Diambil dari Modul 3 Breakdown
  const breakdownUnitsList = useMemo(() => {
    return breakdowns.filter((b) => {
      const statusUpper = (b.statusUnit || 'BREAKDOWN').toUpperCase().trim();
      // Kriteria breakdown: status bukan READY atau tanggal kejadian sesuai tanggal filter
      const isBreakdownStatus = statusUpper !== 'READY';
      const matchDate = !selectedDate || b.tanggal === selectedDate || isBreakdownStatus;

      // Filter Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (b.noUnit && b.noUnit.toLowerCase().includes(q)) ||
        (b.namaAlat && b.namaAlat.toLowerCase().includes(q)) ||
        (b.pelapor && b.pelapor.toLowerCase().includes(q)) ||
        (b.pic1 && b.pic1.toLowerCase().includes(q)) ||
        (b.noNotifikasi && b.noNotifikasi.toLowerCase().includes(q)) ||
        (b.noMaintenanceOrder && b.noMaintenanceOrder.toLowerCase().includes(q));

      // Filter Jenis
      const matchJenis = filterJenis === 'ALL' || (b.jenis && b.jenis.toUpperCase() === filterJenis);

      return matchDate && isBreakdownStatus && matchSearch && matchJenis;
    });
  }, [breakdowns, selectedDate, searchQuery, filterJenis]);

  // 3. STATISTIK KPI HARIAN
  const totalUnitMaster = units.length || (readyUnitsFromP2H.length + breakdownUnitsList.length) || 1;
  const totalReadyCount = readyUnitsFromP2H.length;
  const totalBreakdownCount = breakdownUnitsList.length;
  const availabilityRate = totalUnitMaster > 0 ? Math.round((totalReadyCount / totalUnitMaster) * 100) : 0;

  // Format Tanggal Indonesia
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return 'Semua Tanggal';
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // ==========================================
  // HANDLER EXPORT EXCEL (.csv format dengan UTF-8 BOM)
  // ==========================================
  const handleExportCSV = () => {
    if (!canExport) {
      alert('Akses Ditolak: Anda tidak memiliki izin ekspor laporan.');
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID');
    const exporterName = currentUser?.nama || currentUser?.username || 'User';

    const lines: string[] = [
      `"PT BATU KALI WELANG AMPUH"`,
      `"LAPORAN HARIAN KESIAPAN UNIT OPERASIONAL (READY & BREAKDOWN)"`,
      `"Tanggal Laporan:","${formattedSelectedDate}"`,
      `"Waktu Export:","${nowStr}"`,
      `"Diexport Oleh:","${exporterName} (${currentUser?.accountTier || currentUser?.role})"`,
      `""`,
      `"=== RINGKASAN METRIK KESIAPAN ARMADA ==="`,
      `"Total Unit Terdaftar:","${totalUnitMaster} Unit"`,
      `"Total Unit Ready Operasi (P2H):","${totalReadyCount} Unit"`,
      `"Total Unit Breakdown / Perbaikan:","${totalBreakdownCount} Unit"`,
      `"Tingkat Kesiapan Armada (Availability Rate):","${availabilityRate}%"`,
      `""`,
      `"=== BAGIAN 1: DAFTAR UNIT READY OPERASI (SUMBER DATA: HASIL INSPEKSI FORM P2H) ==="`,
      [
        `"No"`,
        `"No P2H"`,
        `"No Unit (CN)"`,
        `"Nama Alat"`,
        `"Jenis Alat"`,
        `"Tanggal P2H"`,
        `"Jam P2H"`,
        `"Operator / Inspektor"`,
        `"Jabatan"`,
        `"HM/KM Terakhir"`,
        `"Status Kelayakan"`,
        `"Catatan Temuan P2H"`,
        `"Konfirmasi Tanda Tangan"`,
      ].join(','),
    ];

    if (readyUnitsFromP2H.length === 0) {
      lines.push(`"Belum ada data pengisian P2H yang berstatus Layak Operasi pada tanggal ini."`);
    } else {
      readyUnitsFromP2H.forEach((r, idx) => {
        lines.push([
          `"${idx + 1}"`,
          `"${r.noP2H || '-'}"`,
          `"${r.noUnit || '-'}"`,
          `"${(r.namaAlat || '-').replace(/"/g, '""')}"`,
          `"${(r.jenisAlat || '-').replace(/"/g, '""')}"`,
          `"${r.tanggal || '-'}"`,
          `"${r.jam || '-'}"`,
          `"${(r.operatorName || '-').replace(/"/g, '""')}"`,
          `"${(r.operatorJabatan || '-').replace(/"/g, '""')}"`,
          `"${r.hmKm || 0}"`,
          `"${r.statusKelayakan === 'LAYAK_OPERASI' ? 'LAYAK OPERASI (READY)' : r.statusKelayakan}"`,
          `"${(r.catatanUmum || '-').replace(/"/g, '""')}"`,
          `"${(r.operatorSignatureName || r.operatorName || '-').replace(/"/g, '""')}"`,
        ].join(','));
      });
    }

    lines.push(`""`);
    lines.push(`"=== BAGIAN 2: DAFTAR UNIT BREAKDOWN & DALAM PERBAIKAN (SUMBER DATA: MODUL 3 MAINTENANCE) ==="`);
    lines.push([
      `"No"`,
      `"No Notifikasi"`,
      `"Reff MO"`,
      `"No Unit"`,
      `"Nama Alat"`,
      `"Tgl Mulai Breakdown"`,
      `"Jam Breakdown"`,
      `"Jam Start Kerja"`,
      `"Jam Finish Kerja"`,
      `"Komponen Rusak"`,
      `"Detail Kerusakan / Problem"`,
      `"PIC Mekanik"`,
      `"Status Progres"`,
      `"Status Unit"`,
      `"Downtime (Jam)"`,
    ].join(','));

    if (breakdownUnitsList.length === 0) {
      lines.push(`"Tidak ada unit yang mengalami breakdown pada tanggal laporan ini."`);
    } else {
      breakdownUnitsList.forEach((b, idx) => {
        const pic = [b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || '-';
        lines.push([
          `"${idx + 1}"`,
          `"${b.noNotifikasi || '-'}"`,
          `"${b.noMaintenanceOrder || b.noNotifikasi || '-'}"`,
          `"${b.noUnit || '-'}"`,
          `"${(b.namaAlat || b.noLama || '-').replace(/"/g, '""')}"`,
          `"${b.tanggal || '-'}"`,
          `"${b.jamBreakdown || '-'}"`,
          `"${b.jamStart || '-'}"`,
          `"${b.jamFinish || '-'}"`,
          `"${(b.component || '-').replace(/"/g, '""')}"`,
          `"${(b.detailKerusakan || b.detailProblem || '-').replace(/"/g, '""')}"`,
          `"${pic.replace(/"/g, '""')}"`,
          `"${(b.progress || 'On Progress').replace(/"/g, '""')}"`,
          `"${(b.statusUnit || 'BREAKDOWN').replace(/"/g, '""')}"`,
          `"${b.downtimeHours ?? '-'}"`,
        ].join(','));
      });
    }

    lines.push(`""`);
    lines.push(`"=== LEMBAR PENGESAHAN LAPORAN ==="`);
    lines.push(`"Yang Membuat:","Diperiksa Oleh:","Diketahui Oleh:"`);
    lines.push(`"${signatories.pembuatJabatan || 'Administrasi'}","${signatories.diperiksaJabatan || 'Supervisor Maintenance'}","${signatories.diketahuiJabatan || 'Kabag Workshop'}"`);
    lines.push(`"( ${signatories.pembuatName || 'Admin Workshop'} )","( ${signatories.diperiksaName || 'Supervisor Maintenance'} )","( ${signatories.diketahuiName || 'Kabag Workshop'} )"`);

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Harian_Unit_Ready_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${selectedDate || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // HANDLER EXPORT WORD (.doc format)
  // ==========================================
  const handleExportWord = () => {
    if (!canExport) {
      alert('Akses Ditolak: Anda tidak memiliki izin ekspor laporan.');
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID');
    const exporterName = currentUser?.nama || currentUser?.username || 'User';

    const wordHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Laporan Harian Kesiapan Unit - PT BATU KALI WELANG AMPUH</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #222; margin: 20px; }
          h1 { font-size: 15pt; color: #b45309; text-align: center; margin-bottom: 2px; }
          h2 { font-size: 11pt; color: #1e293b; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; margin-top: 14px; }
          p.subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
          th { background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 5px; }
          .badge-ready { background-color: #dcfce7; color: #166534; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
          .badge-breakdown { background-color: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
          .kpi-box { display: inline-block; width: 23%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; margin-right: 1%; text-align: center; border-radius: 6px; }
          .sig-table { width: 100%; margin-top: 30px; text-align: center; border: none; }
          .sig-table td { border: none; padding-top: 40px; }
        </style>
      </head>
      <body>
        <h1>PT BATU KALI WELANG AMPUH</h1>
        <p class='subtitle'>LAPORAN HARIAN KESIAPAN UNIT OPERASIONAL (READY &amp; BREAKDOWN)<br>
        Tanggal Laporan: <strong>${formattedSelectedDate}</strong> | Waktu Cetak: ${nowStr} | Oleh: ${exporterName}</p>
        
        <div style="margin: 12px 0;">
          <div class="kpi-box"><strong>Total Unit</strong><br><span style="font-size: 14pt; color: #0f172a;">${totalUnitMaster}</span> Unit</div>
          <div class="kpi-box"><strong>Unit Ready (P2H)</strong><br><span style="font-size: 14pt; color: #16a34a;">${totalReadyCount}</span> Unit</div>
          <div class="kpi-box"><strong>Unit Breakdown</strong><br><span style="font-size: 14pt; color: #dc2626;">${totalBreakdownCount}</span> Unit</div>
          <div class="kpi-box"><strong>Kesiapan (PA %)</strong><br><span style="font-size: 14pt; color: #2563eb;">${availabilityRate}%</span></div>
        </div>

        <h2>1. DAFTAR UNIT READY OPERASIONAL (SUMBER: P2H MODUL 5)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>No P2H</th>
              <th>No Unit</th>
              <th>Nama Alat</th>
              <th>Jam P2H</th>
              <th>Operator / Inspektor</th>
              <th>HM/KM</th>
              <th>Status Kelayakan</th>
              <th>Catatan P2H</th>
            </tr>
          </thead>
          <tbody>
            ${readyUnitsFromP2H.length === 0 ? '<tr><td colspan="9" style="text-align: center; color: #94a3b8;">Belum ada pengisian formulir P2H yang berstatus Layak Operasi pada tanggal ini.</td></tr>' : 
              readyUnitsFromP2H.map((r, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${r.noP2H || '-'}</strong></td>
                  <td><span style="font-weight: bold; color: #d97706;">${r.noUnit || '-'}</span></td>
                  <td>${r.namaAlat || '-'}</td>
                  <td>${r.jam || '-'}</td>
                  <td>${r.operatorName || '-'}<br><small style="color:#64748b;">${r.operatorJabatan || ''}</small></td>
                  <td style="text-align: right;">${r.hmKm || 0}</td>
                  <td><span class="badge-ready">LAYAK OPERASI (READY)</span></td>
                  <td>${r.catatanUmum || '-'}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <h2>2. DAFTAR UNIT BREAKDOWN &amp; PERBAIKAN (SUMBER: MODUL 3 MAINTENANCE)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>No MO / Notifikasi</th>
              <th>No Unit</th>
              <th>Nama Alat</th>
              <th>Mulai BD</th>
              <th>Jam Start - Finish</th>
              <th>Komponen Rusak</th>
              <th>Detail Masalah / Tindakan</th>
              <th>PIC Mekanik</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${breakdownUnitsList.length === 0 ? '<tr><td colspan="10" style="text-align: center; color: #94a3b8;">Tidak ada unit yang mengalami breakdown pada tanggal laporan ini.</td></tr>' :
              breakdownUnitsList.map((b, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${b.noMaintenanceOrder || b.noNotifikasi || '-'}</strong></td>
                  <td><span style="font-weight: bold; color: #dc2626;">${b.noUnit || '-'}</span></td>
                  <td>${b.namaAlat || b.noLama || '-'}</td>
                  <td>${b.tanggal} ${b.jamBreakdown || ''}</td>
                  <td>${b.jamStart ? `${b.jamStart} - ${b.jamFinish || 'Proses'}` : '-'}</td>
                  <td>${b.component || '-'}</td>
                  <td>${b.detailKerusakan || b.detailProblem || '-'}</td>
                  <td>${[b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || '-'}</td>
                  <td><span class="badge-breakdown">${b.statusUnit || 'BREAKDOWN'} (${b.progress || 'On Progress'})</span></td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <table class="sig-table">
          <tr>
            <td>
              Yang Membuat,<br>
              <span style="font-size: 8.5pt; color: #64748b;">${signatories.pembuatJabatan || 'Administrasi'}</span><br><br><br><br>
              <strong>( ${signatories.pembuatName || 'Admin Workshop'} )</strong>
            </td>
            <td>
              Diperiksa Oleh,<br>
              <span style="font-size: 8.5pt; color: #64748b;">${signatories.diperiksaJabatan || 'Supervisor Maintenance'}</span><br><br><br><br>
              <strong>( ${signatories.diperiksaName || 'Supervisor Maintenance'} )</strong>
            </td>
            <td>
              Diketahui Oleh,<br>
              <span style="font-size: 8.5pt; color: #64748b;">${signatories.diketahuiJabatan || 'Kabag Workshop'}</span><br><br><br><br>
              <strong>( ${signatories.diketahuiName || 'Kabag Workshop'} )</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + wordHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Harian_Unit_Ready_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${selectedDate || 'Semua'}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // HANDLER PRINT DIRECT / CETAK KE PDF
  // ==========================================
  const handlePrint = () => {
    const originalTitle = document.title;
    const dateFormatted = selectedDate || todayStr;
    document.title = `Laporan_Harian_Ready_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${dateFormatted}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Handler Export PDF: Meng-generate file PDF resmi PT BATU KALI WELANG AMPUH untuk dikirim ke Head Office
  const handleExportPDF = () => {
    if (!canExport) {
      alert('Akses Ditolak: Anda tidak memiliki izin ekspor laporan.');
      return;
    }

    try {
      exportDailyBreakdownToPDF({
        selectedDate,
        formattedDate: formattedSelectedDate,
        totalMaster: totalUnitMaster,
        readyCount: totalReadyCount,
        breakdownCount: totalBreakdownCount,
        availabilityRate,
        breakdownList: breakdownUnitsList,
        readyList: readyUnitsFromP2H,
        currentUser,
        signatories,
      });
    } catch (e) {
      console.error('Error generating PDF with jsPDF, falling back to print modal', e);
      setShowPrintModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
              SUB MODUL 5
            </span>
            <h2 className="text-base sm:text-lg font-black text-stone-100 font-mono tracking-wide uppercase flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-400" />
              <span>LAPORAN HARIAN UNIT READY &amp; BREAKDOWN</span>
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-3xl">
            Integrasi pelaporan harian kesiapan unit operasional: Data <strong>Unit Ready</strong> diambil otomatis dari hasil pemeriksaan <strong>Form P2H (Modul 5)</strong>, dan data <strong>Unit Breakdown</strong> diambil dari <strong>Database Maintenance (Modul 3)</strong>.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <>
              {/* Tombol Export PDF untuk Head Office */}
              <button
                id="btn-export-pdf-laporan-harian"
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition shadow-lg shadow-rose-600/25 active:scale-95 cursor-pointer"
                title="Buka & Cetak/Simpan PDF Laporan Harian Lengkap untuk dikirim ke Head Office"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Export PDF (Head Office)</span>
              </button>

              {/* Tombol Pratinjau & Cetak */}
              <button
                id="btn-print-laporan-harian"
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition shadow"
                title="Buka Pratinjau Cetak Resmi / PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Pratinjau Cetak</span>
              </button>

              {/* Tombol Export Excel */}
              <button
                id="btn-export-excel-laporan-harian"
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-800 text-xs font-bold transition shadow"
                title="Download Laporan Harian dalam format Excel (.csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Excel</span>
              </button>

              {/* Tombol Export Word */}
              <button
                id="btn-export-word-laporan-harian"
                type="button"
                onClick={handleExportWord}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900/90 text-blue-200 border border-blue-800 text-xs font-bold transition shadow"
                title="Download Laporan Harian dalam format Word (.doc)"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export Word</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-400 text-xs font-mono">
              <span>Mode Viewer (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar Interaktif */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Pemilih Tanggal Laporan */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 uppercase font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Tanggal Laporan</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                id="input-filter-date-laporan"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-[10px] font-mono font-bold rounded-lg text-stone-300 whitespace-nowrap transition"
                title="Set ke Hari Ini"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* 2. Filter Jenis Alat */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 uppercase font-semibold mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Filter Jenis Alat</span>
            </label>
            <select
              id="select-filter-jenis-laporan"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Jenis Alat ({units.length} Unit Master)</option>
              {availableJenisList.map((jenis) => (
                <option key={jenis} value={jenis}>
                  {jenis}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pencarian Kata Kunci */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-stone-400 uppercase font-semibold mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Pencarian Cepat</span>
            </label>
            <div className="relative">
              <input
                id="input-search-laporan-harian"
                type="text"
                placeholder="Cari No Unit (CN), nama alat, operator P2H, atau kerusakan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Filter Tampilan: Semua / Unit Ready Saja / Unit Breakdown Saja */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTabSection('ALL')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition ${
                activeTabSection === 'ALL'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua ({readyUnitsFromP2H.length + breakdownUnitsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSection('READY')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 transition ${
                activeTabSection === 'READY'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Unit Ready P2H ({readyUnitsFromP2H.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSection('BREAKDOWN')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 transition ${
                activeTabSection === 'BREAKDOWN'
                  ? 'bg-rose-500 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Unit Breakdown ({breakdownUnitsList.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            Laporan Tanggal: <strong className="text-amber-400">{formattedSelectedDate}</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards Ringkasan Eksekutif */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Unit Master */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Total Armada</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-stone-100">
              {totalUnitMaster} <span className="text-xs font-normal text-stone-400">Unit</span>
            </div>
          </div>
        </div>

        {/* Total Ready dari P2H */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Ready (P2H)</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {totalReadyCount} <span className="text-xs font-normal text-stone-400">Unit</span>
            </div>
          </div>
        </div>

        {/* Total Breakdown */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Breakdown Aktif</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
              {totalBreakdownCount} <span className="text-xs font-normal text-stone-400">Unit</span>
            </div>
          </div>
        </div>

        {/* Kesiapan Armada % */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Kesiapan Armada</div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {availabilityRate}% <span className="text-xs font-normal text-stone-400">PA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKSI 1: TABEL UNIT READY OPERASIONAL (SUMBER DATA: P2H MODUL 5) */}
      {/* ========================================================================= */}
      {(activeTabSection === 'ALL' || activeTabSection === 'READY') && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  BAGIAN 1: DAFTAR UNIT READY OPERASIONAL
                </h3>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Data divalidasi dari hasil inspeksi <strong>Form P2H (Modul 5)</strong> dengan status <em>LAYAK OPERASI</em>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {readyUnitsFromP2H.length} Unit Siap Kerja
              </span>
              {onNavigateToP2H && (
                <button
                  type="button"
                  onClick={onNavigateToP2H}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono transition"
                  title="Ke Modul 5 untuk mengisi P2H"
                >
                  <span>+ Input P2H</span>
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                </button>
              )}
            </div>
          </div>

          {readyUnitsFromP2H.length === 0 ? (
            <div className="text-center py-10 bg-stone-950/40 rounded-xl border border-dashed border-stone-800 p-6 space-y-3">
              <ClipboardCheck className="w-10 h-10 text-stone-600 mx-auto" />
              <div className="text-stone-300 font-mono font-bold text-sm">
                Belum ada pengisian formulir P2H berstatus "LAYAK OPERASI" untuk tanggal {formattedSelectedDate}.
              </div>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Ketika operator mengisi checklist P2H di <strong>Modul 5</strong> sebelum shift dimulai dan unit dinyatakan layak kerja, unit tersebut otomatis muncul di tabel ini.
              </p>
              {onNavigateToP2H && (
                <button
                  type="button"
                  onClick={onNavigateToP2H}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-lg"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Buka Modul 5 (Input Form P2H)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-950/60 font-mono text-stone-400 uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">No P2H &amp; Waktu</th>
                    <th className="py-2.5 px-3">No Unit &amp; Nama Alat</th>
                    <th className="py-2.5 px-3">Jenis Alat</th>
                    <th className="py-2.5 px-3">Operator / Inspektor</th>
                    <th className="py-2.5 px-3 text-right">HM/KM</th>
                    <th className="py-2.5 px-3">Status Kelayakan</th>
                    <th className="py-2.5 px-3">Catatan / Temuan</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {readyUnitsFromP2H.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-stone-800/30 transition">
                      <td className="py-2.5 px-3 font-mono text-stone-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-amber-400">{p.noP2H || '-'}</div>
                        <div className="text-[10px] text-stone-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-600" />
                          <span>{p.tanggal} • {p.jam || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {p.noUnit}
                        </span>
                        <div className="text-[11px] text-stone-300 font-semibold mt-0.5">
                          {p.namaAlat || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-400 text-[11px]">
                        {p.jenisAlat || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-200">{p.operatorName}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{p.operatorJabatan || 'Operator'}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-200 text-right">
                        {(Number(p.hmKm) || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>LAYAK OPERASI</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-300 text-[11px] max-w-xs">
                        {p.catatanUmum ? (
                          <span className="truncate block" title={p.catatanUmum}>{p.catatanUmum}</span>
                        ) : (
                          <span className="text-stone-500 italic">Semua 9 Item Normal (OK)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedP2HModal(p)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-mono font-semibold transition inline-flex items-center gap-1 shadow"
                          title="Lihat Detail Checklist 9 Item P2H"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail P2H</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKSI 2: TABEL UNIT BREAKDOWN & PERBAIKAN (SUMBER DATA: MODUL 3 MAINTENANCE) */}
      {/* ========================================================================= */}
      {(activeTabSection === 'ALL' || activeTabSection === 'BREAKDOWN') && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-stone-100 font-mono tracking-wide uppercase">
                  BAGIAN 2: DAFTAR UNIT BREAKDOWN &amp; DALAM PERBAIKAN
                </h3>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Data diambil dari <strong>Database Maintenance (Modul 3)</strong> mencakup unit yang sedang mengalami breakdown atau dalam proses perbaikan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                {breakdownUnitsList.length} Unit Breakdown
              </span>
            </div>
          </div>

          {breakdownUnitsList.length === 0 ? (
            <div className="text-center py-8 bg-stone-950/40 rounded-xl border border-dashed border-stone-800 p-6 space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
              <div className="text-emerald-400 font-mono font-bold text-sm">
                Nihil Breakdown (Semua Unit Aman Terkendali)
              </div>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Tidak ada laporan unit breakdown yang aktif atau tercatat pada tanggal {formattedSelectedDate}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-950/60 font-mono text-stone-400 uppercase text-[10.5px]">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">No Notifikasi / MO</th>
                    <th className="py-2.5 px-3">No Unit &amp; Nama Alat</th>
                    <th className="py-2.5 px-3">Waktu Breakdown</th>
                    <th className="py-2.5 px-3">Jam Kerja (24 Jam)</th>
                    <th className="py-2.5 px-3">Komponen &amp; Kerusakan</th>
                    <th className="py-2.5 px-3">PIC Mekanik</th>
                    <th className="py-2.5 px-3">Status &amp; Progres</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {breakdownUnitsList.map((b, idx) => {
                    const pics = [b.pic1, b.pic2, b.pic3].filter(Boolean);
                    return (
                      <tr key={b.id} className="hover:bg-stone-800/30 transition">
                        <td className="py-2.5 px-3 font-mono text-stone-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBreakdownForParts(b);
                              setShowPartsModal(true);
                            }}
                            className="text-left group/btn"
                            title="Klik untuk melihat rincian part yang dibutuhkan unit & export PDF ke Malang"
                          >
                            <div className="font-bold text-rose-400 group-hover/btn:text-rose-300 group-hover/btn:underline flex items-center gap-1">
                              <span>{b.noMaintenanceOrder || b.noNotifikasi}</span>
                              <ExternalLink className="w-3 h-3 text-rose-400/80" />
                            </div>
                            {b.noMaintenanceOrder && b.noMaintenanceOrder !== b.noNotifikasi && (
                              <div className="text-[10px] text-stone-400">Notif: {b.noNotifikasi}</div>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {b.noUnit}
                          </span>
                          <div className="text-[11px] text-stone-300 font-semibold mt-0.5">
                            {b.namaAlat || b.noLama || '-'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-300">
                          <div>{b.tanggal}</div>
                          <div className="text-[10px] text-stone-500">{b.jamBreakdown || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-300">
                          {b.jamStart ? (
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 font-bold">{b.jamStart}</span>
                              <span className="text-stone-500">→</span>
                              <span className="text-emerald-400 font-bold">{b.jamFinish || 'Proses'}</span>
                            </div>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <span className="font-mono font-bold text-amber-300 text-[11px] block">
                            [{b.component || 'Komponen'}]
                          </span>
                          <span className="text-[11px] text-stone-300 line-clamp-1">
                            {b.detailKerusakan || b.detailProblem || '-'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBreakdownForParts(b);
                              setShowPartsModal(true);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                            title="Klik untuk melihat daftar part yang dibutuhkan unit ini"
                          >
                            <Wrench className="w-2.5 h-2.5" />
                            <span>{b.partsJasa && b.partsJasa.length > 0 ? `${b.partsJasa.length} Part Dibutuhkan` : 'Cek Kebutuhan Part'}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          {pics.length > 0 ? (
                            <div className="text-stone-200 font-medium">
                              <div>{pics[0]}</div>
                              {pics.length > 1 && (
                                <div className="text-[10px] text-stone-500 font-mono">
                                  +{pics.length - 1} mekanik lain
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-600 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {b.statusUnit || 'BREAKDOWN'}
                          </span>
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                            {b.progress || 'On Progress'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBreakdownForParts(b);
                                setShowPartsModal(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-[11px] font-mono font-semibold transition inline-flex items-center gap-1 shadow"
                              title="Lihat Kebutuhan Part & Export PDF ke Malang"
                            >
                              <FileText className="w-3 h-3 text-rose-400" />
                              <span>Part PDF</span>
                            </button>
                            {onNavigateToUpdate && (
                              <button
                                type="button"
                                onClick={() => onNavigateToUpdate(b)}
                                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-mono font-semibold transition inline-flex items-center gap-1 shadow"
                                title="Update Progress Breakdown di Sub Modul 2"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>Update</span>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETAIL LENGKAP CHECKLIST P2H (9 ITEM & TTD) */}
      {/* ========================================================================= */}
      {selectedP2HModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-100 font-mono">
                    DETAIL HASIL PEMERIKSAAN P2H ({selectedP2HModal.noP2H})
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Unit: <strong className="text-amber-400">{selectedP2HModal.noUnit}</strong> • {selectedP2HModal.namaAlat}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedP2HModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Ringkasan Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                <div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Tanggal &amp; Jam</span>
                  <span className="font-mono text-stone-200 font-bold">{selectedP2HModal.tanggal} {selectedP2HModal.jam}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Operator</span>
                  <span className="font-semibold text-stone-200">{selectedP2HModal.operatorName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">HM / KM</span>
                  <span className="font-mono text-amber-400 font-bold">{(Number(selectedP2HModal.hmKm) || 0).toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Kelayakan</span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    {selectedP2HModal.statusKelayakan === 'LAYAK_OPERASI' ? 'LAYAK OPERASI' : selectedP2HModal.statusKelayakan}
                  </span>
                </div>
              </div>

              {/* Daftar 9 Item Checklist P2H */}
              <div>
                <h4 className="font-mono font-bold text-stone-300 text-xs uppercase mb-2">
                  Checklist 9 Item Standar P2H:
                </h4>
                <div className="space-y-1.5">
                  {selectedP2HModal.items && selectedP2HModal.items.length > 0 ? (
                    selectedP2HModal.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${
                          item.status === 'OK'
                            ? 'bg-stone-950/40 border-stone-800'
                            : 'bg-rose-950/20 border-rose-800/40'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                            <span className="text-amber-500 font-mono font-bold">{item.itemNo}.</span>
                            <span>{item.title}</span>
                          </div>
                          <p className="text-[11px] text-stone-400">{item.description}</p>
                          {item.catatanKerusakan && (
                            <div className="text-[11px] text-amber-300 mt-1 font-mono">
                              Temuan: {item.catatanKerusakan}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            item.status === 'OK'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-stone-500 italic p-3 text-center">
                      Semua item walkaround dan kabin dinyatakan OK oleh operator.
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Tambahan Operator */}
              {selectedP2HModal.catatanUmum && (
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block font-bold mb-1">
                    Catatan Khusus Operator:
                  </span>
                  <p className="text-stone-300 text-xs italic">{selectedP2HModal.catatanUmum}</p>
                </div>
              )}

              {/* Tanda Tangan Konfirmasi Digital */}
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-stone-500 block">
                    Tanda Tangan Digital Operator
                  </span>
                  <span className="text-stone-200 font-bold font-mono text-xs">
                    {selectedP2HModal.operatorSignatureName || selectedP2HModal.operatorName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-400 block font-bold flex items-center gap-1 justify-end">
                    <Check className="w-3 h-3" />
                    <span>Tervalidasi Digital</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    {selectedP2HModal.confirmedAt || selectedP2HModal.timestamp}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedP2HModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRATINJAU CETAK RESMI (PRINT PREVIEW / EXPORT PDF READY) */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Control */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-stone-100 font-mono text-sm">
                  PRATINJAU CETAK LAPORAN HARIAN (SIAP PRINT / PDF)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs font-mono transition flex items-center gap-1.5 shadow"
                  title="Download File PDF Resmi (.pdf) untuk dikirim ke Head Office"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF Resmi</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs font-mono transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cetak Browser</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Print Area */}
            <div className="p-6 overflow-y-auto bg-white text-stone-900 font-sans text-xs space-y-5">
              {/* Kop Surat Resmi PT BATU KALI WELANG AMPUH */}
              <div className="border-b-2 border-stone-800 pb-3 text-center">
                <h1 className="text-xl font-black text-amber-700 tracking-wide font-mono uppercase">
                  PT BATU KALI WELANG AMPUH
                </h1>
                <h2 className="text-xs font-bold text-stone-800 font-mono uppercase tracking-widest mt-0.5">
                  LAPORAN HARIAN KESIAPAN UNIT OPERASIONAL (READY &amp; BREAKDOWN)
                </h2>
                <div className="text-[11px] text-stone-600 mt-1 flex items-center justify-center gap-4 font-mono">
                  <span>Tanggal Laporan: <strong>{formattedSelectedDate}</strong></span>
                  <span>•</span>
                  <span>Waktu Cetak: {new Date().toLocaleString('id-ID')}</span>
                  <span>•</span>
                  <span>Oleh: {currentUser?.nama || currentUser?.username}</span>
                </div>
              </div>

              {/* KPI Ringkasan Box */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 border border-stone-300 rounded bg-stone-50">
                  <span className="text-[10px] text-stone-500 uppercase block">Total Unit</span>
                  <span className="text-base font-black text-stone-800">{totalUnitMaster} Unit</span>
                </div>
                <div className="p-2 border border-emerald-300 rounded bg-emerald-50">
                  <span className="text-[10px] text-emerald-700 uppercase block font-bold">Unit Ready (P2H)</span>
                  <span className="text-base font-black text-emerald-800">{totalReadyCount} Unit</span>
                </div>
                <div className="p-2 border border-rose-300 rounded bg-rose-50">
                  <span className="text-[10px] text-rose-700 uppercase block font-bold">Unit Breakdown</span>
                  <span className="text-base font-black text-rose-800">{totalBreakdownCount} Unit</span>
                </div>
                <div className="p-2 border border-amber-300 rounded bg-amber-50">
                  <span className="text-[10px] text-amber-700 uppercase block font-bold">Kesiapan Armada</span>
                  <span className="text-base font-black text-amber-800">{availabilityRate}%</span>
                </div>
              </div>

              {/* Tabel 1: Unit Ready (P2H) */}
              <div>
                <h3 className="font-mono font-bold text-xs uppercase bg-emerald-100 text-emerald-900 px-2 py-1 rounded">
                  1. DAFTAR UNIT READY OPERASIONAL (SUMBER DATA: FORM INSPEKSI P2H MODUL 5)
                </h3>
                <table className="w-full mt-2 border-collapse border border-stone-300 text-[10.5px]">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 font-mono text-[10px]">
                      <th className="border border-stone-300 p-1.5 text-center w-8">No</th>
                      <th className="border border-stone-300 p-1.5">No P2H</th>
                      <th className="border border-stone-300 p-1.5">No Unit &amp; Alat</th>
                      <th className="border border-stone-300 p-1.5">Jam P2H</th>
                      <th className="border border-stone-300 p-1.5">Operator</th>
                      <th className="border border-stone-300 p-1.5 text-right">HM/KM</th>
                      <th className="border border-stone-300 p-1.5">Status</th>
                      <th className="border border-stone-300 p-1.5">Temuan / Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyUnitsFromP2H.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-stone-500 italic border border-stone-300">
                          Belum ada pengisian formulir P2H berstatus Layak Operasi pada tanggal ini.
                        </td>
                      </tr>
                    ) : (
                      readyUnitsFromP2H.map((r, idx) => (
                        <tr key={r.id}>
                          <td className="border border-stone-300 p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="border border-stone-300 p-1.5 font-mono font-bold">{r.noP2H || '-'}</td>
                          <td className="border border-stone-300 p-1.5">
                            <strong>{r.noUnit}</strong> - {r.namaAlat}
                          </td>
                          <td className="border border-stone-300 p-1.5 font-mono">{r.jam || '-'}</td>
                          <td className="border border-stone-300 p-1.5">{r.operatorName}</td>
                          <td className="border border-stone-300 p-1.5 font-mono text-right">
                            {(Number(r.hmKm) || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="border border-stone-300 p-1.5 font-bold text-emerald-700">
                            LAYAK OPERASI
                          </td>
                          <td className="border border-stone-300 p-1.5">{r.catatanUmum || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tabel 2: Unit Breakdown */}
              <div>
                <h3 className="font-mono font-bold text-xs uppercase bg-rose-100 text-rose-900 px-2 py-1 rounded">
                  2. DAFTAR UNIT BREAKDOWN &amp; DALAM PERBAIKAN (SUMBER DATA: MODUL 3 MAINTENANCE)
                </h3>
                <table className="w-full mt-2 border-collapse border border-stone-300 text-[10.5px]">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 font-mono text-[10px]">
                      <th className="border border-stone-300 p-1.5 text-center w-8">No</th>
                      <th className="border border-stone-300 p-1.5">No MO / Notifikasi</th>
                      <th className="border border-stone-300 p-1.5">No Unit &amp; Alat</th>
                      <th className="border border-stone-300 p-1.5">Waktu BD</th>
                      <th className="border border-stone-300 p-1.5">Jam Kerja (24 Jam)</th>
                      <th className="border border-stone-300 p-1.5">Kerusakan &amp; Kebutuhan Part</th>
                      <th className="border border-stone-300 p-1.5">PIC Mekanik</th>
                      <th className="border border-stone-300 p-1.5">Status Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownUnitsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-stone-500 italic border border-stone-300">
                          Tidak ada unit yang mengalami breakdown pada tanggal laporan ini.
                        </td>
                      </tr>
                    ) : (
                      breakdownUnitsList.map((b, idx) => (
                        <tr key={b.id}>
                          <td className="border border-stone-300 p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="border border-stone-300 p-1.5 font-mono font-bold text-rose-800">
                            {b.noMaintenanceOrder || b.noNotifikasi || '-'}
                          </td>
                          <td className="border border-stone-300 p-1.5">
                            <strong>{b.noUnit}</strong> - {b.namaAlat || b.noLama}
                          </td>
                          <td className="border border-stone-300 p-1.5 font-mono">
                            {b.tanggal} {b.jamBreakdown || ''}
                          </td>
                          <td className="border border-stone-300 p-1.5 font-mono">
                            {b.jamStart ? `${b.jamStart} - ${b.jamFinish || 'Proses'}` : '-'}
                          </td>
                          <td className="border border-stone-300 p-1.5">
                            <div><strong>[{b.component || 'Komponen'}]</strong> {b.detailKerusakan || b.detailProblem}</div>
                            {b.partsJasa && b.partsJasa.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-dotted border-stone-300 text-[10px] text-stone-800">
                                <strong className="text-amber-800 font-mono">Part Dibutuhkan:</strong>{' '}
                                {b.partsJasa.map((p) => `${p.namaPart} (${p.partNumber || '-'}) x${p.qty} ${p.satuan}`).join('; ')}
                              </div>
                            )}
                          </td>
                          <td className="border border-stone-300 p-1.5">
                            {[b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || '-'}
                          </td>
                          <td className="border border-stone-300 p-1.5 font-bold text-rose-700">
                            {b.statusUnit || 'BREAKDOWN'} ({b.progress || 'On Progress'})
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lembar Tanda Tangan */}
              <div className="pt-6 border-t border-stone-300 grid grid-cols-3 gap-4 text-center font-mono text-[11px]">
                <div>
                  Yang Membuat,<br />
                  <span className="text-[10px] text-stone-500">{signatories.pembuatJabatan || 'Administrasi'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">( {signatories.pembuatName || 'Admin Workshop'} )</strong>
                </div>
                <div>
                  Diperiksa Oleh,<br />
                  <span className="text-[10px] text-stone-500">{signatories.diperiksaJabatan || 'Supervisor Maintenance'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">( {signatories.diperiksaName || 'Supervisor Maintenance'} )</strong>
                </div>
                <div>
                  Diketahui Oleh,<br />
                  <span className="text-[10px] text-stone-500">{signatories.diketahuiJabatan || 'Kabag Workshop'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">( {signatories.diketahuiName || 'Kabag Workshop'} )</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kebutuhan Spare Part (Popup saat No MO / Notif diklik & Export PDF ke Malang) */}
      <PartRequirementModal
        breakdown={selectedBreakdownForParts}
        isOpen={showPartsModal}
        onClose={() => {
          setShowPartsModal(false);
          setSelectedBreakdownForParts(null);
        }}
        currentUser={currentUser}
      />
    </div>
  );
};
