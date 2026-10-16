import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  P2HRecord, 
  UserAccount,
  FuelStockInputRecord,
  FuelTransferRecord,
  FuelDistributionRecord,
  OutFieldFuelRecord,
  OilDistributionRecord,
  OilStockInputRecord,
  InventoryPeriodBalance
} from '../types';
import { ReportSignatories } from './reportSignatories';

export interface GeneratedPDFResult {
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  filename: string;
  download: () => void;
}

/**
 * Utility untuk men-generate Dokumen Permintaan Part & Jasa Breakdown ke PDF
 * Ditujukan untuk dikirim ke Head Office Malang sebagai laporan resmi.
 * Mengembalikan objek GeneratedPDFResult yang dapat digunakan untuk Pratinjau (Preview) maupun Download.
 */
export const generatePartRequirementPDF = (
  breakdown: BreakdownRecord,
  parts: BreakdownPartJasaItem[],
  currentUser: UserAccount,
  signatories?: Partial<ReportSignatories>
): GeneratedPDFResult => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const moNumber = breakdown.noMaintenanceOrder || breakdown.noNotifikasi || '-';
  const notifNumber = breakdown.noNotifikasi || '-';
  const nowStr = new Date().toLocaleString('id-ID');
  const dateStr = breakdown.tanggal || new Date().toISOString().split('T')[0];

  // Primary colors
  const primaryColor: [number, number, number] = [180, 83, 9]; // Amber-700
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const grayTextColor: [number, number, number] = [100, 116, 139]; // Slate-500

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...grayTextColor);
  doc.text('DIVISI MAINTENANCE & ALAT BERAT • SITE QUARRY PURWOSARI', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(190, 18, 60); // Rose-700
  doc.text('TUJUAN LAPORAN: HEAD OFFICE MALANG', 196, 15, { align: 'right' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('PT BATU KALI WELANG AMPUH', 105, 23, { align: 'center' });

  // Document Title
  doc.setFontSize(11);
  doc.setTextColor(...darkTextColor);
  doc.text('FORMULIR PERMINTAAN & KEBUTUHAN SPARE PART ALAT BERAT', 105, 29, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...grayTextColor);
  doc.text(
    `No. MO: ${moNumber}  |  No. Notifikasi: ${notifNumber}  |  Tanggal Kejadian: ${dateStr}  |  Waktu Cetak: ${nowStr}`,
    105,
    34,
    { align: 'center' }
  );

  // Line separator
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.6);
  doc.line(14, 37, 196, 37);

  // 2. IDENTITAS DETAIL UNIT & PROBLEM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkTextColor);
  doc.text('A. IDENTITAS UNIT & DETAIL KERUSAKAN', 14, 43);

  const mechanicsStr =
    [breakdown.pic1, breakdown.pic2, breakdown.pic3].filter(Boolean).join(', ') ||
    breakdown.pelapor ||
    '-';

  const unitDetails = [
    [
      { content: 'No. Unit (CN):', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.noUnit || '-', styles: { fontStyle: 'bold' as const, textColor: [217, 119, 6] as [number, number, number] } },
      { content: 'Nama Alat / Merk:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.namaAlat || breakdown.noLama || '-' },
    ],
    [
      { content: 'Jenis Alat:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.jenis || '-' },
      { content: 'Komponen Rusak:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.component || '-', styles: { fontStyle: 'bold' as const, textColor: [225, 29, 72] as [number, number, number] } },
    ],
    [
      { content: 'Jam Mulai Breakdown:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.jamBreakdown ? `Pukul ${breakdown.jamBreakdown}` : '-' },
      { content: 'Jam Kerja Perbaikan:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.jamStart ? `${breakdown.jamStart} s/d ${breakdown.jamFinish || 'Proses'}` : '-' },
    ],
    [
      { content: 'Status Unit:', styles: { fontStyle: 'bold' as const } },
      { content: `${breakdown.statusUnit || 'BREAKDOWN'} (${breakdown.progress || 'On Progress'})` },
      { content: 'Teknisi Mekanik (PIC):', styles: { fontStyle: 'bold' as const } },
      { content: mechanicsStr },
    ],
    [
      { content: 'Keluhan / Problem Awal:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.detailProblem || '-', colSpan: 3 },
    ],
    [
      { content: 'Detail Kerusakan / Tindakan:', styles: { fontStyle: 'bold' as const } },
      { content: breakdown.detailKerusakan || '-', colSpan: 3 },
    ],
  ];

  autoTable(doc, {
    startY: 46,
    body: unitDetails,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 35, fillColor: [248, 250, 252] },
      1: { cellWidth: 55 },
      2: { cellWidth: 35, fillColor: [248, 250, 252] },
      3: { cellWidth: 57 },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  const afterUnitY = doc.lastAutoTable.finalY + 6;

  // 3. TABEL DAFTAR KEBUTUHAN SPARE PART & JASA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...darkTextColor);
  doc.text(`B. RINCIAN KEBUTUHAN SPARE PART & JASA (TOTAL: ${parts.length} ITEM)`, 14, afterUnitY);

  const partsRows =
    parts.length > 0
      ? parts.map((item, idx) => [
          idx + 1,
          item.jenis || 'Part',
          item.namaPart || '-',
          item.partNumber || '-',
          item.qty,
          item.satuan || 'Pcs',
          breakdown.statusUnit === 'READY' ? 'Sudah Terpasang' : 'Dibutuhkan Segera (Urgent)',
        ])
      : [
          [
            {
              content: 'Belum ada daftar part/jasa yang dicatat untuk perbaikan unit ini.',
              colSpan: 7,
              styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
            },
          ],
        ];

  autoTable(doc, {
    startY: afterUnitY + 3,
    head: [
      ['No', 'Tipe', 'Nama Part / Deskripsi Material', 'Part Number (P/N)', 'Qty', 'Satuan', 'Keterangan'],
    ],
    body: partsRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 62 },
      3: { cellWidth: 35, fontStyle: 'bold', textColor: [180, 83, 9] },
      4: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 29 },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let currentY = doc.lastAutoTable.finalY + 4;

  // Catatan Tambahan jika ada
  if (breakdown.remark) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text('Catatan Tambahan Lapangan:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkTextColor);
    doc.text(breakdown.remark, 14, currentY + 4);
    currentY += 10;
  }

  // Cek apakah halaman cukup untuk tanda tangan
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  // 4. LEMBAR PENGESAHAN (SIGNATURES)
  const sigBoxY = Math.max(currentY + 5, 240);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  const namaPembuat = signatories?.pembuatName || currentUser.fullName || currentUser.username || 'Admin Workshop';
  const jabatanPembuat = signatories?.pembuatJabatan || 'Administrasi';
  const namaDiperiksa = signatories?.diperiksaName || 'Staff Administrasi';
  const jabatanDiperiksa = signatories?.diperiksaJabatan || 'Administrasi';
  const namaDisetujui = signatories?.disetujuiName || signatories?.diketahuiName || 'Dodik Mariyadi';
  const jabatanDisetujui = signatories?.disetujuiJabatan || signatories?.diketahuiJabatan || 'Kabag Workshop';

  // Kolom 1: Di Buat Oleh (Dropdown Modul 2 Jabatan Administrasi)
  doc.text('Di Buat Oleh,', 42, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanPembuat, 42, sigBoxY + 4, { align: 'center' });
  doc.line(20, sigBoxY + 22, 64, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaPembuat} )`, 42, sigBoxY + 26, { align: 'center' });

  // Kolom 2: Diperiksa Oleh (Dropdown Modul 2 Jabatan Administrasi)
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa Oleh,', 105, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiperiksa, 105, sigBoxY + 4, { align: 'center' });
  doc.line(83, sigBoxY + 22, 127, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiperiksa} )`, 105, sigBoxY + 26, { align: 'center' });

  // Kolom 3: Disetujui Oleh (Kabag Workshop - Dodik Mariyadi)
  doc.setFont('helvetica', 'normal');
  doc.text('Disetujui Oleh,', 168, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDisetujui, 168, sigBoxY + 4, { align: 'center' });
  doc.line(146, sigBoxY + 22, 190, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDisetujui} )`, 168, sigBoxY + 26, { align: 'center' });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...grayTextColor);
    doc.text(
      `PT BATU KALI WELANG AMPUH • Laporan Kebutuhan Part MO: ${moNumber} (Unit ${breakdown.noUnit}) • Halaman ${i} dari ${totalPages}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Generate blob URL & filename
  const cleanMo = String(moNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanUnit = String(breakdown.noUnit).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Permintaan_Part_MO_${cleanMo}_Unit_${cleanUnit}_PT_BATU_KALI_WELANG_AMPUH_${dateStr}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const download = () => doc.save(filename);

  return { doc, blob, blobUrl, filename, download };
};

/**
 * Utility untuk mengekspor Formulir Permintaan Part & Jasa Breakdown langsung ke file PDF
 */
export const exportPartRequirementToPDF = (
  breakdown: BreakdownRecord,
  parts: BreakdownPartJasaItem[],
  currentUser: UserAccount,
  signatories?: Partial<ReportSignatories>
): GeneratedPDFResult => {
  const result = generatePartRequirementPDF(breakdown, parts, currentUser, signatories);
  result.download();
  return result;
};

export interface DailyReportSignatoryOptions {
  pembuatName?: string;
  pembuatJabatan?: string;
  diperiksaName?: string;
  diperiksaJabatan?: string;
  diketahuiName?: string;
  diketahuiJabatan?: string;
  disetujuiName?: string;
  disetujuiJabatan?: string;
}

/**
 * Utility untuk men-generate Dokumen Laporan Harian Ready & Breakdown ke PDF
 * Ditujukan untuk dikirim setiap hari ke Head Office.
 * Mengembalikan GeneratedPDFResult untuk Preview maupun Download.
 */
export const generateDailyBreakdownPDF = (options: {
  selectedDate: string;
  formattedDate: string;
  totalMaster: number;
  readyCount: number;
  breakdownCount: number;
  availabilityRate: number;
  breakdownList: BreakdownRecord[];
  readyList: P2HRecord[];
  currentUser: UserAccount;
  signatories?: DailyReportSignatoryOptions;
}): GeneratedPDFResult => {
  const {
    selectedDate,
    formattedDate,
    totalMaster,
    readyCount,
    breakdownCount,
    availabilityRate,
    breakdownList,
    readyList,
    currentUser,
    signatories,
  } = options;

  // Menggunakan orientation landscape agar tabel operasional muat dengan baik dan mudah dibaca
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleString('id-ID');
  const exporterName = currentUser?.fullName || currentUser?.username || 'Staff Maintenance';

  const primaryColor: [number, number, number] = [180, 83, 9]; // Amber-700
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const grayTextColor: [number, number, number] = [100, 116, 139];

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...grayTextColor);
  doc.text('DIVISI MAINTENANCE & OPERASIONAL • QUARRY PURWOSARI', 14, 12);

  doc.setFontSize(9);
  doc.setTextColor(190, 18, 60);
  doc.text('LAPORAN HARIAN KE: HEAD OFFICE', 283, 12, { align: 'right' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('PT BATU KALI WELANG AMPUH', 148.5, 18, { align: 'center' });

  // Document Title
  doc.setFontSize(11);
  doc.setTextColor(...darkTextColor);
  doc.text('LAPORAN HARIAN KESIAPAN UNIT OPERASIONAL (READY & BREAKDOWN)', 148.5, 23.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayTextColor);
  doc.text(
    `Tanggal Laporan: ${formattedDate}   |   Waktu Cetak: ${nowStr}   |   Dibuat Oleh: ${exporterName}`,
    148.5,
    28,
    { align: 'center' }
  );

  // Line separator
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(14, 30.5, 283, 30.5);

  // 2. METRIK KPI RINGKASAN
  const kpiData = [
    [
      { content: 'Total Unit Terdaftar', styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
      { content: 'Unit Ready Operasi (P2H)', styles: { fontStyle: 'bold' as const, halign: 'center' as const, textColor: [22, 101, 52] as [number, number, number] } },
      { content: 'Unit Breakdown / Perbaikan', styles: { fontStyle: 'bold' as const, halign: 'center' as const, textColor: [153, 27, 27] as [number, number, number] } },
      { content: 'Kesiapan Armada (Availability)', styles: { fontStyle: 'bold' as const, halign: 'center' as const, textColor: [29, 78, 216] as [number, number, number] } },
    ],
    [
      { content: `${totalMaster} Unit`, styles: { fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 10 } },
      { content: `${readyCount} Unit`, styles: { fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 10, textColor: [22, 101, 52] as [number, number, number] } },
      { content: `${breakdownCount} Unit`, styles: { fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 10, textColor: [153, 27, 27] as [number, number, number] } },
      { content: `${availabilityRate}%`, styles: { fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 10, textColor: [29, 78, 216] as [number, number, number] } },
    ],
  ];

  autoTable(doc, {
    startY: 33,
    body: kpiData,
    theme: 'plain',
    styles: {
      cellPadding: 2,
      textColor: [30, 41, 59],
      fillColor: [248, 250, 252],
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let tableStartY = doc.lastAutoTable.finalY + 5;

  // 3. TABEL 1: DAFTAR UNIT BREAKDOWN (MODUL 3 MAINTENANCE)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // Dark red
  doc.text(`1. DAFTAR UNIT BREAKDOWN & PERBAIKAN (${breakdownList.length} UNIT)`, 14, tableStartY);

  const breakdownRows =
    breakdownList.length > 0
      ? breakdownList.map((b, idx) => {
          const pic = [b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || '-';
          const jamKerja = b.jamStart ? `${b.jamStart} - ${b.jamFinish || 'Proses'}` : '-';
          return [
            idx + 1,
            b.noMaintenanceOrder || b.noNotifikasi || '-',
            b.noUnit || '-',
            b.namaAlat || b.noLama || '-',
            b.tanggal ? `${b.tanggal} ${b.jamBreakdown || ''}` : '-',
            jamKerja,
            b.component || '-',
            b.detailKerusakan || b.detailProblem || '-',
            pic,
            `${b.statusUnit || 'BREAKDOWN'} (${b.progress || 'On Progress'})`,
            b.downtimeHours != null ? `${b.downtimeHours} Jam` : '-',
          ];
        })
      : [
          [
            {
              content: 'Tidak ada unit yang mengalami breakdown pada tanggal laporan ini.',
              colSpan: 11,
              styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
            },
          ],
        ];

  autoTable(doc, {
    startY: tableStartY + 2.5,
    head: [
      [
        'No',
        'No MO / Notif',
        'No Unit',
        'Nama Alat',
        'Tgl / Jam BD',
        'Jam Kerja',
        'Komponen Rusak',
        'Detail Masalah & Tindakan',
        'PIC Mekanik',
        'Status Unit & Progress',
        'Downtime',
      ],
    ],
    body: breakdownRows,
    theme: 'grid',
    headStyles: {
      fillColor: [153, 27, 27],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 18, fontStyle: 'bold', textColor: [180, 83, 9] },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 24, fontStyle: 'bold', textColor: [153, 27, 27] },
      7: { cellWidth: 55 },
      8: { cellWidth: 28 },
      9: { cellWidth: 26 },
      10: { cellWidth: 16, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let afterBDY = doc.lastAutoTable.finalY + 6;

  // Jika posisi Y sudah melewati 140 mm, pindah halaman baru untuk Bagian 2
  if (afterBDY > 140) {
    doc.addPage();
    afterBDY = 15;
  }

  // 4. TABEL 2: DAFTAR UNIT READY OPERASI (FORM P2H MODUL 5)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // Dark green
  doc.text(`2. DAFTAR UNIT READY OPERASIONAL (HASIL INSPEKSI FORM P2H MODUL 5: ${readyList.length} UNIT)`, 14, afterBDY);

  const readyRows =
    readyList.length > 0
      ? readyList.map((r, idx) => [
          idx + 1,
          r.noP2H || '-',
          r.noUnit || '-',
          r.namaAlat || '-',
          r.jenisAlat || '-',
          r.jam || '-',
          `${r.operatorName || '-'}${r.operatorJabatan ? ` (${r.operatorJabatan})` : ''}`,
          r.hmKm || 0,
          'LAYAK OPERASI (READY)',
          r.catatanUmum || '-',
        ])
      : [
          [
            {
              content: 'Belum ada data pengisian formulir P2H yang berstatus Layak Operasi pada tanggal ini.',
              colSpan: 10,
              styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
            },
          ],
        ];

  autoTable(doc, {
    startY: afterBDY + 2.5,
    head: [
      [
        'No',
        'No P2H',
        'No Unit (CN)',
        'Nama Alat',
        'Jenis Alat',
        'Jam P2H',
        'Operator / Inspektor',
        'HM / KM',
        'Status Kelayakan',
        'Catatan Temuan P2H',
      ],
    ],
    body: readyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 20, fontStyle: 'bold', textColor: [22, 101, 52] },
      3: { cellWidth: 32 },
      4: { cellWidth: 24 },
      5: { cellWidth: 16 },
      6: { cellWidth: 40 },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 35, fontStyle: 'bold', textColor: [22, 101, 52] },
      9: { cellWidth: 50 },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let sigY = doc.lastAutoTable.finalY + 6;

  // Cek apakah muat untuk tanda tangan (landscape tinggi 210mm)
  if (sigY > 165) {
    doc.addPage();
    sigY = 20;
  }

  // 5. LEMBAR PENGESAHAN (VALIDASI 3 PIHAK SERAGAM SESUAI INSTRUKSI USER):
  // 1. Di Buat Oleh = Dropdown modul 2 jabatan administrasi
  // 2. Diperiksa Oleh = Dropdown modul 2 jabatan administrasi
  // 3. Disetujui Oleh = Kabag Workshop (Dodik Mariyadi)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  const namaPembuat = signatories?.pembuatName || exporterName;
  const jabatanPembuat = signatories?.pembuatJabatan || 'Administrasi';
  const namaDiperiksa = signatories?.diperiksaName || 'Staff Administrasi';
  const jabatanDiperiksa = signatories?.diperiksaJabatan || 'Administrasi';
  const namaDisetujui = signatories?.disetujuiName || signatories?.diketahuiName || 'Dodik Mariyadi';
  const jabatanDisetujui = signatories?.disetujuiJabatan || signatories?.diketahuiJabatan || 'Kabag Workshop';

  // Kolom 1 (x=55): Di Buat Oleh (Administrasi)
  doc.text('Di Buat Oleh,', 55, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanPembuat, 55, sigY + 4, { align: 'center' });
  doc.line(25, sigY + 18, 85, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaPembuat} )`, 55, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop', 55, sigY + 26, { align: 'center' });

  // Kolom 2 (x=148.5): Diperiksa Oleh (Administrasi)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text('Diperiksa Oleh,', 148.5, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiperiksa, 148.5, sigY + 4, { align: 'center' });
  doc.line(118.5, sigY + 18, 178.5, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiperiksa} )`, 148.5, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop', 148.5, sigY + 26, { align: 'center' });

  // Kolom 3 (x=242): Disetujui Oleh (Kabag Workshop)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text('Disetujui Oleh,', 242, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDisetujui, 242, sigY + 4, { align: 'center' });
  doc.line(212, sigY + 18, 272, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDisetujui} )`, 242, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Kabag Workshop PT BKWA', 242, sigY + 26, { align: 'center' });

  // Footer di semua halaman
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...grayTextColor);
    doc.text(
      `PT BATU KALI WELANG AMPUH • Laporan Harian Dikirim ke Head Office (${formattedDate}) • Halaman ${i} dari ${totalPages}`,
      148.5,
      203,
      { align: 'center' }
    );
  }

  // Generate blob URL & filename
  const cleanDate = (selectedDate || 'Semua').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Laporan_Harian_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${cleanDate}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const download = () => doc.save(filename);

  return { doc, blob, blobUrl, filename, download };
};

/**
 * Utility untuk mengekspor Laporan Harian Ready & Breakdown langsung ke file PDF
 */
export const exportDailyBreakdownToPDF = (options: {
  selectedDate: string;
  formattedDate: string;
  totalMaster: number;
  readyCount: number;
  breakdownCount: number;
  availabilityRate: number;
  breakdownList: BreakdownRecord[];
  readyList: P2HRecord[];
  currentUser: UserAccount;
  signatories?: DailyReportSignatoryOptions;
}): GeneratedPDFResult => {
  const result = generateDailyBreakdownPDF(options);
  result.download();
  return result;
};

/**
 * Utility untuk men-generate Dokumen Laporan Detail Riwayat Breakdown ke PDF
 * Mengembalikan GeneratedPDFResult untuk Preview maupun Download.
 */
export const generateDetailHistoryPDF = (
  breakdowns: BreakdownRecord[],
  selectedUnit: string,
  currentUser: UserAccount,
  signatories?: DailyReportSignatoryOptions
): GeneratedPDFResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleString('id-ID');
  const exporterName = currentUser?.fullName || currentUser?.username || 'Staff Maintenance';
  const primaryColor: [number, number, number] = [180, 83, 9];
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const grayTextColor: [number, number, number] = [100, 116, 139];

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...grayTextColor);
  doc.text('DIVISI MAINTENANCE & ALAT BERAT • QUARRY PURWOSARI', 14, 12);

  doc.setFontSize(9);
  doc.setTextColor(190, 18, 60);
  doc.text('LAPORAN DETAIL KE: HEAD OFFICE', 283, 12, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('PT BATU KALI WELANG AMPUH', 148.5, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(...darkTextColor);
  doc.text('LAPORAN DETAIL RIWAYAT KERUSAKAN & PERBAIKAN ALAT BERAT', 148.5, 23.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayTextColor);
  doc.text(
    `Unit Filter: ${selectedUnit || 'Semua Unit'}   |   Total Kasus: ${breakdowns.length}   |   Waktu Cetak: ${nowStr}   |   Oleh: ${exporterName}`,
    148.5,
    28,
    { align: 'center' }
  );

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(14, 30.5, 283, 30.5);

  const rows = breakdowns.map((b, idx) => {
    const pics = [b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || b.pelapor || '-';
    const jamKerja = b.jamStart ? `${b.jamStart} - ${b.jamFinish || 'Proses'}` : '-';
    return [
      idx + 1,
      b.noMaintenanceOrder || b.noNotifikasi || '-',
      b.noUnit || '-',
      b.namaAlat || b.noLama || '-',
      b.tanggal || '-',
      jamKerja,
      b.component || '-',
      b.detailProblem || '-',
      b.detailKerusakan || '-',
      pics,
      b.statusUnit || 'BREAKDOWN',
      b.progress || 'On Progress',
    ];
  });

  autoTable(doc, {
    startY: 33,
    head: [
      [
        'No',
        'No MO / Notif',
        'No Unit',
        'Nama Alat',
        'Tgl BD',
        'Jam Kerja',
        'Komponen',
        'Problem Awal',
        'Tindakan Perbaikan',
        'PIC Mekanik',
        'Status Unit',
        'Progress',
      ],
    ],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-', '-', '-', 'Tidak ada data.', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 18, fontStyle: 'bold', textColor: [180, 83, 9] },
      3: { cellWidth: 26 },
      4: { cellWidth: 18 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, fontStyle: 'bold' },
      7: { cellWidth: 35 },
      8: { cellWidth: 42 },
      9: { cellWidth: 25 },
      10: { cellWidth: 16 },
      11: { cellWidth: 16 },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let sigY = doc.lastAutoTable.finalY + 6;
  if (sigY > 165) {
    doc.addPage();
    sigY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  const namaPembuat = signatories?.pembuatName || exporterName;
  const jabatanPembuat = signatories?.pembuatJabatan || 'Administrasi';
  const namaDiperiksa = signatories?.diperiksaName || 'Staff Administrasi';
  const jabatanDiperiksa = signatories?.diperiksaJabatan || 'Administrasi';
  const namaDisetujui = signatories?.disetujuiName || signatories?.diketahuiName || 'Dodik Mariyadi';
  const jabatanDisetujui = signatories?.disetujuiJabatan || signatories?.diketahuiJabatan || 'Kabag Workshop';

  // Kolom 1 (x=55): Di Buat Oleh (Administrasi)
  doc.text('Di Buat Oleh,', 55, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanPembuat, 55, sigY + 4, { align: 'center' });
  doc.line(25, sigY + 18, 85, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaPembuat} )`, 55, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop', 55, sigY + 26, { align: 'center' });

  // Kolom 2 (x=148.5): Diperiksa Oleh (Administrasi)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text('Diperiksa Oleh,', 148.5, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiperiksa, 148.5, sigY + 4, { align: 'center' });
  doc.line(118.5, sigY + 18, 178.5, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiperiksa} )`, 148.5, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop', 148.5, sigY + 26, { align: 'center' });

  // Kolom 3 (x=242): Disetujui Oleh (Kabag Workshop)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkTextColor);
  doc.text('Disetujui Oleh,', 242, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDisetujui, 242, sigY + 4, { align: 'center' });
  doc.line(212, sigY + 18, 272, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDisetujui} )`, 242, sigY + 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Kabag Workshop PT BKWA', 242, sigY + 26, { align: 'center' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...grayTextColor);
    doc.text(
      `PT BATU KALI WELANG AMPUH • Laporan Detail Riwayat Breakdown • Halaman ${i} dari ${totalPages}`,
      148.5,
      203,
      { align: 'center' }
    );
  }

  // Generate blob URL & filename
  const cleanUnit = (selectedUnit || 'Semua_Unit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Laporan_Detail_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${cleanUnit}_${new Date().toISOString().split('T')[0]}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const download = () => doc.save(filename);

  return { doc, blob, blobUrl, filename, download };
};

/**
 * Utility untuk mengekspor Laporan Detail Riwayat Breakdown langsung ke file PDF
 */
export const exportDetailHistoryToPDF = (
  breakdowns: BreakdownRecord[],
  selectedUnit: string,
  currentUser: UserAccount,
  signatories?: DailyReportSignatoryOptions
): GeneratedPDFResult => {
  const result = generateDetailHistoryPDF(breakdowns, selectedUnit, currentUser, signatories);
  result.download();
  return result;
};

export interface ExportFuelOilReportParams {
  startDate?: string;
  endDate?: string;
  reportCategory?: 'ALL' | 'TANGKI_UTAMA' | 'FUEL_TRUCK' | 'SPBU_LUAR' | 'OLI_PER_TIPE';
  // Lembar Pengesahan FOG (3 Pihak sesuai instruksi user):
  // 1. Petugas FOG = yang membuat Laporan
  // 2. Petugas Inventory = Diperiksa oleh
  // 3. Kabag Workshop = Mengetahui & Menyetujui
  petugasFog?: string;
  petugasFogJabatan?: string;
  petugasInventory?: string;
  petugasInventoryJabatan?: string;
  kabagWorkshop?: string;
  kabagWorkshopJabatan?: string;
  // Legacy fallback
  petugasChecker?: string;
  kttName?: string;
  currentUser?: UserAccount;
  fuelStockInputs: FuelStockInputRecord[];
  fuelTransfers: FuelTransferRecord[];
  fuelDistributions: FuelDistributionRecord[];
  outFieldFuelRecords: OutFieldFuelRecord[];
  oilDistributions: OilDistributionRecord[];
  periodBalance?: InventoryPeriodBalance;
}

/**
 * Utility Resmi untuk Men-generate Laporan Rekapitulasi ke PDF:
 * 1. Transaksi Tangki Utama (Solar Masuk & Transfer)
 * 2. Transaksi Fuel Truck (Distribusi Solar ke Unit)
 * 3. Pembelian Solar di Luar (SPBU Luar / Out-Field Fuel)
 * 4. Penggunaan Oli Setiap Tipe
 * 
 * Dilengkapi Filter Tanggal, Ringkasan Eksekutif, dan Format Lembar Pengesahan FOG (3 Pihak):
 * 1. Petugas FOG = Yang membuat Laporan
 * 2. Petugas Inventory = Diperiksa oleh
 * 3. Kabag Workshop = Mengetahui & Menyetujui
 * 
 * Mengembalikan GeneratedPDFResult untuk Preview maupun Download.
 */
export const generateFuelOilTransactionsPDF = ({
  startDate,
  endDate,
  reportCategory = 'ALL',
  petugasFog,
  petugasFogJabatan,
  petugasInventory,
  petugasInventoryJabatan,
  kabagWorkshop,
  kabagWorkshopJabatan,
  petugasChecker,
  kttName,
  currentUser,
  fuelStockInputs = [],
  fuelTransfers = [],
  fuelDistributions = [],
  outFieldFuelRecords = [],
  oilDistributions = [],
  periodBalance,
}: ExportFuelOilReportParams): GeneratedPDFResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleString('id-ID');
  const exporterName = currentUser?.fullName || currentUser?.username || 'Admin FOG / Maintenance';

  // Helper filter tanggal
  const matchDate = (tgl?: string) => {
    if (!tgl) return true;
    const cleanTgl = tgl.trim().split('T')[0];
    if (startDate && cleanTgl < startDate) return false;
    if (endDate && cleanTgl > endDate) return false;
    return true;
  };

  // 1. Filter data berdasarkan rentang tanggal
  const filteredStockInputs = fuelStockInputs.filter((item) => matchDate(item.tanggal));
  const filteredTransfers = fuelTransfers.filter((item) => matchDate(item.tanggal));
  const filteredDistributions = fuelDistributions.filter((item) => matchDate(item.tanggal));
  const filteredOutField = outFieldFuelRecords.filter((item) => matchDate(item.tanggal));
  const filteredOilDist = oilDistributions.filter((item) => matchDate(item.tanggal));

  // 2. Kalkulasi Metrik Utama
  const totalMasukTangki = filteredStockInputs.reduce(
    (acc, r) => acc + (Number(r.actualQtyFlowmeter) || Number(r.qtySupplier) || 0),
    0
  );
  const totalTransferFT = filteredTransfers.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  const totalDistribusiFT = filteredDistributions.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
  const totalOutFieldLiter = filteredOutField.reduce((acc, r) => acc + (Number(r.jmlLtr) || 0), 0);
  const totalOutFieldNominal = filteredOutField.reduce(
    (acc, r) => acc + (Number(r.totalNominal) || Number(r.nominalFuelSetelahPembulatan) || 0),
    0
  );
  const totalKonsumsiSolarQuarry = totalDistribusiFT + totalOutFieldLiter;

  // Rekapitulasi Oli per Tipe
  const oliPerTipeMap = new Map<string, { totalLiter: number; count: number }>();
  filteredOilDist.forEach((r) => {
    const tipe = (r.jenisOli || 'LAINNYA').trim();
    const cur = oliPerTipeMap.get(tipe) || { totalLiter: 0, count: 0 };
    cur.totalLiter += Number(r.qty) || 0;
    cur.count += 1;
    oliPerTipeMap.set(tipe, cur);
  });
  const totalSemuaOliLiter = Array.from(oliPerTipeMap.values()).reduce((acc, v) => acc + v.totalLiter, 0);

  // Label Rentang Tanggal
  let periodeLabel = 'Semua Periode Data';
  if (startDate && endDate) {
    periodeLabel = startDate === endDate ? `${startDate}` : `${startDate} s/d ${endDate}`;
  } else if (startDate) {
    periodeLabel = `Mulai ${startDate}`;
  } else if (endDate) {
    periodeLabel = `Sampai ${endDate}`;
  }

  // Label Kategori
  const categoryLabels: Record<string, string> = {
    ALL: 'Semua Kategori (Tangki Utama, Fuel Truck, SPBU Luar & Oli)',
    TANGKI_UTAMA: 'Khusus Transaksi Tangki Utama Solar',
    FUEL_TRUCK: 'Khusus Transaksi Tangki Fuel Truck FT-01',
    SPBU_LUAR: 'Khusus Pembelian Solar SPBU Luar',
    OLI_PER_TIPE: 'Khusus Penggunaan Oli Setiap Tipe',
  };
  const kategoriLabel = categoryLabels[reportCategory] || 'Semua Kategori';

  // Warna Dokumen
  const primaryColor: [number, number, number] = [180, 83, 9]; // Amber-700
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate-800
  const grayTextColor: [number, number, number] = [100, 116, 139]; // Slate-500

  // ==========================================
  // HEADER KOP SURAT
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...grayTextColor);
  doc.text('PT BATU KALI WELANG AMPUH • DIVISI MAINTENANCE & OPERASIONAL', 14, 11);
  doc.text('SITE QUARRY PURWOSARI - PASURUAN', 283, 11, { align: 'right' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LAPORAN TRANSAKSI BAHAN BAKAR & PELUMAS (FOG)', 148.5, 17, { align: 'center' });

  // Report Subtitle
  doc.setFontSize(9);
  doc.setTextColor(...darkTextColor);
  doc.text(
    'REKAPITULASI PEMAKAIAN SOLAR (TANGKI UTAMA & FUEL TRUCK), PEMBELIAN SPBU LUAR & PENGGUNAAN OLI PER TIPE',
    148.5,
    22,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(
    `Periode Data: ${periodeLabel}  |  Kategori: ${kategoriLabel}  |  Waktu Cetak: ${nowStr}  |  Operator: ${exporterName}`,
    148.5,
    27,
    { align: 'center' }
  );

  // Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 29.5, 283, 29.5);

  // ==========================================
  // RINGKASAN EKSEKUTIF (EXECUTIVE KPI SUMMARY)
  // ==========================================
  autoTable(doc, {
    startY: 31.5,
    head: [
      [
        'Total Solar Masuk (Tangki)',
        'Solar Transfer ke FT',
        'Distribusi Solar ke Unit (FT)',
        'Pembelian Solar di Luar',
        'Total Solar Quarry (FT + SPBU)',
        'Total Penggunaan Oli',
      ],
    ],
    body: [
      [
        `${totalMasukTangki.toLocaleString('id-ID')} Liter\n(${filteredStockInputs.length} Penerimaan)`,
        `${totalTransferFT.toLocaleString('id-ID')} Liter\n(${filteredTransfers.length} Transfer)`,
        `${totalDistribusiFT.toLocaleString('id-ID')} Liter\n(${filteredDistributions.length} Bon Unit)`,
        `${totalOutFieldLiter.toLocaleString('id-ID')} Liter\nRp ${totalOutFieldNominal.toLocaleString('id-ID')}`,
        `${totalKonsumsiSolarQuarry.toLocaleString('id-ID')} Liter\nTotal Konsumsi Fleet`,
        `${totalSemuaOliLiter.toLocaleString('id-ID')} Liter\n(${filteredOilDist.length} Bon, ${oliPerTipeMap.size} Varian)`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [248, 250, 252],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [15, 23, 42],
      cellPadding: 2.5,
      fillColor: [248, 250, 252],
    },
    styles: {
      lineColor: [203, 213, 225],
      lineWidth: 0.3,
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let curY = doc.lastAutoTable.finalY + 5;

  // Helper untuk cek kebutuhan addPage
  const ensurePageSpace = (neededHeight: number) => {
    if (curY + neededHeight > 195) {
      doc.addPage();
      curY = 14;
    }
  };

  // =========================================================================
  // 1. SECTION: TRANSAKSI TANGKI UTAMA (PENERIMAAN DARI SUPPLIER & TRANSFER KE FT)
  // =========================================================================
  if (reportCategory === 'ALL' || reportCategory === 'TANGKI_UTAMA') {
    ensurePageSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // Amber
    doc.text(
      `1. TRANSAKSI TANGKI UTAMA (SOLAR) • PENERIMAAN SUPPLIER (${filteredStockInputs.length} Transaksi) & TRANSFER KE FT (${filteredTransfers.length} Transaksi)`,
      14,
      curY
    );

    // Tabel 1A: Riwayat Masuk Tangki Utama dari Supplier
    const stockRows =
      filteredStockInputs.length > 0
        ? filteredStockInputs.map((r, idx) => [
            idx + 1,
            `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
            r.snReffNo || '-',
            r.distributor || '-',
            `${r.platNomor || '-'}\n${r.driverName || '-'}`,
            (Number(r.qtySupplier) || 0).toLocaleString('id-ID'),
            (Number(r.flowmeterStart) || 0).toLocaleString('id-ID'),
            (Number(r.flowmeterEnd) || 0).toLocaleString('id-ID'),
            (Number(r.actualQtyFlowmeter) || Number(r.qtySupplier) || 0).toLocaleString('id-ID'),
            r.hasilUkurStickSebelum || r.hasilUkurTangkiUtama || '-',
            r.picFogName || '-',
            r.remark || '-',
          ])
        : [
            [
              {
                content: 'Tidak ada data penerimaan solar tangki utama pada periode ini.',
                colSpan: 12,
                styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
              },
            ],
          ];

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Tanggal & Jam',
          'No DO / Reff',
          'Supplier / Vendor',
          'No Plat / Driver',
          'Qty DO (L)',
          'FM Start',
          'FM End',
          'Actual (L)',
          'Level Sounding',
          'PIC FOG',
          'Catatan / Remark',
        ],
      ],
      body: stockRows,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 24, fontStyle: 'bold' },
        3: { cellWidth: 32 },
        4: { cellWidth: 26 },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
        9: { cellWidth: 22, halign: 'center' },
        10: { cellWidth: 24 },
        11: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 4;

    // Tabel 1B: Transfer Tangki Utama ke Fuel Truck
    ensurePageSpace(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(`Penyaluran Transfer: Tangki Utama -> Fuel Truck FT-01 (${filteredTransfers.length} Transaksi)`, 14, curY);

    const transferRows =
      filteredTransfers.length > 0
        ? filteredTransfers.map((r, idx) => [
            idx + 1,
            `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
            r.namaDriverFt || '-',
            r.picFog || '-',
            (Number(r.flowmeterStart) || 0).toLocaleString('id-ID'),
            (Number(r.flowmeterStop) || 0).toLocaleString('id-ID'),
            (Number(r.qty) || 0).toLocaleString('id-ID'),
            r.remark || '-',
          ])
        : [
            [
              {
                content: 'Tidak ada data transfer solar dari tangki utama ke FT pada periode ini.',
                colSpan: 8,
                styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
              },
            ],
          ];

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Tanggal & Jam',
          'Driver Fuel Truck',
          'PIC FOG',
          'Flowmeter Start',
          'Flowmeter Stop',
          'Qty Transfer (Ltr)',
          'Catatan / Keterangan',
        ],
      ],
      body: transferRows,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 38 },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] },
        7: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 2. SECTION: TRANSAKSI TANGKI FUEL TRUCK (FT-01) - DISTRIBUSI KE UNIT
  // =========================================================================
  if (reportCategory === 'ALL' || reportCategory === 'FUEL_TRUCK') {
    ensurePageSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text(
      `2. TRANSAKSI TANGKI FUEL TRUCK (FT-01) • PENGISIAN KE UNIT ALAT BERAT & DUMP TRUCK (${filteredDistributions.length} Transaksi, Total: ${totalDistribusiFT.toLocaleString('id-ID')} Liter)`,
      14,
      curY
    );

    const distRows =
      filteredDistributions.length > 0
        ? filteredDistributions.map((r, idx) => [
            idx + 1,
            `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
            r.noBon || '-',
            r.cnAlat || '-',
            r.namaAlat || '-',
            `${r.operatorName || '-'}${r.operatorJabatan ? ` (${r.operatorJabatan})` : ''}`,
            (Number(r.hm) || Number(r.hmPengisian) || 0).toLocaleString('id-ID'),
            (Number(r.flowmeterStart) || 0).toLocaleString('id-ID'),
            (Number(r.flowmeterStop) || 0).toLocaleString('id-ID'),
            (Number(r.qty) || 0).toLocaleString('id-ID'),
            r.driverFtName || r.picFogName || '-',
            r.lokasi || r.remark || '-',
          ])
        : [
            [
              {
                content: 'Tidak ada data transaksi distribusi solar fuel truck ke unit pada periode ini.',
                colSpan: 12,
                styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
              },
            ],
          ];

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Tanggal & Jam',
          'No Bon',
          'CN Unit',
          'Nama Alat Berat',
          'Operator / Penerima',
          'HM Unit',
          'FM Start',
          'FM Stop',
          'Qty (Ltr)',
          'Driver FT / PIC',
          'Lokasi / Remark',
        ],
      ],
      body: distRows,
      theme: 'grid',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 20, fontStyle: 'bold' },
        3: { cellWidth: 20, fontStyle: 'bold', textColor: [234, 88, 12] },
        4: { cellWidth: 32 },
        5: { cellWidth: 34 },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [234, 88, 12] },
        10: { cellWidth: 26 },
        11: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 3. SECTION: PEMBELIAN SOLAR DI LUAR (SPBU LUAR / OUT-FIELD FUEL)
  // =========================================================================
  if (reportCategory === 'ALL' || reportCategory === 'SPBU_LUAR') {
    ensurePageSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(225, 29, 72); // Rose
    doc.text(
      `3. PEMBELIAN SOLAR DI LUAR (SPBU LUAR / OUT-FIELD FUEL) • ${filteredOutField.length} Transaksi (Total: ${totalOutFieldLiter.toLocaleString('id-ID')} Liter, Nilai: Rp ${totalOutFieldNominal.toLocaleString('id-ID')})`,
      14,
      curY
    );

    const outFieldRows =
      filteredOutField.length > 0
        ? filteredOutField.map((r, idx) => [
            idx + 1,
            `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
            r.noTransaksi || '-',
            r.kodeSpbu || '-',
            r.cnNew || '-',
            r.namaAlat || '-',
            r.jenisAlat || '-',
            (Number(r.jmlLtr) || 0).toLocaleString('id-ID'),
            `Rp ${(Number(r.hargaSolarPerLiter) || 6800).toLocaleString('id-ID')}`,
            `Rp ${(Number(r.nominalFuelSetelahPembulatan) || Number(r.nominalPembelianFuel) || 0).toLocaleString('id-ID')}`,
            `Rp ${(Number(r.totalNominal) || 0).toLocaleString('id-ID')}`,
            r.job || (r.ritaseTotal ? `${r.ritaseTotal} Rit` : '-'),
            r.lainLain || '-',
          ])
        : [
            [
              {
                content: 'Tidak ada data transaksi pembelian solar di SPBU luar pada periode ini.',
                colSpan: 13,
                styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
              },
            ],
          ];

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Tanggal & Jam',
          'No Transaksi',
          'Kode SPBU',
          'CN Unit',
          'Nama Alat',
          'Jenis Alat',
          'Liter (L)',
          'Harga/Ltr',
          'Nominal Solar',
          'Total Biaya (Rp)',
          'Job / Ritase',
          'Catatan / Lain-lain',
        ],
      ],
      body: outFieldRows,
      theme: 'grid',
      headStyles: {
        fillColor: [225, 29, 72],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 20, fontStyle: 'bold' },
        3: { cellWidth: 18 },
        4: { cellWidth: 18, fontStyle: 'bold', textColor: [225, 29, 72] },
        5: { cellWidth: 26 },
        6: { cellWidth: 22 },
        7: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 24, halign: 'right' },
        10: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
        11: { cellWidth: 24 },
        12: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 4. SECTION: PENGGUNAAN OLI SETIAP TIPE (REKAPITULASI & RINCIAN)
  // =========================================================================
  if (reportCategory === 'ALL' || reportCategory === 'OLI_PER_TIPE') {
    ensurePageSpace(18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(
      `4. PENGGUNAAN OLI SETIAP TIPE • REKAPITULASI PER TIPE & RINCIAN DISTRIBUSI KE UNIT (${filteredOilDist.length} Bon, Total: ${totalSemuaOliLiter.toLocaleString('id-ID')} Liter)`,
      14,
      curY
    );

    // 4A: Tabel Rekapitulasi per Tipe Oli
    const oliSummaryRows = Array.from(oliPerTipeMap.entries()).map(([tipe, val], idx) => {
      const persentase = totalSemuaOliLiter > 0 ? ((val.totalLiter / totalSemuaOliLiter) * 100).toFixed(1) : '0';
      return [
        idx + 1,
        tipe,
        `${val.totalLiter.toLocaleString('id-ID')} Liter`,
        `${val.count} Bon Transaksi`,
        `${persentase} %`,
        'Terdistribusi',
      ];
    });

    if (oliSummaryRows.length === 0) {
      oliSummaryRows.push([
        {
          content: 'Tidak ada data pengeluaran oli pada periode ini.',
          colSpan: 6,
          styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
        } as any,
      ]);
    } else {
      // Baris Total
      oliSummaryRows.push([
        '',
        'TOTAL PENGGUNAAN KESELURUHAN OLI',
        `${totalSemuaOliLiter.toLocaleString('id-ID')} Liter`,
        `${filteredOilDist.length} Bon Transaksi`,
        '100 %',
        'Semua Varian',
      ]);
    }

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Nama / Jenis Tipe Oli',
          'Total Volume Digunakan (Liter)',
          'Frekuensi Bon',
          'Persentase Beban',
          'Keterangan',
        ],
      ],
      body: oliSummaryRows,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.6,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70, fontStyle: 'bold' },
        2: { cellWidth: 50, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 4;

    // 4B: Tabel Rincian Distribusi Bon Oli ke Unit
    ensurePageSpace(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(`Rincian Bon Pengeluaran Oli ke Unit Alat Berat & Workshop (${filteredOilDist.length} Transaksi)`, 14, curY);

    const oilDetailRows =
      filteredOilDist.length > 0
        ? filteredOilDist.map((r, idx) => [
            idx + 1,
            `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
            r.noBon || '-',
            r.noUnit || '-',
            r.namaAlat || r.namaUnit || '-',
            (Number(r.hmUnit) || 0).toLocaleString('id-ID'),
            r.jenisOli || '-',
            (Number(r.qty) || 0).toLocaleString('id-ID'),
            r.rincianKerusakan || '-',
            r.picMekanik || '-',
            r.picGudangMaterial || '-',
          ])
        : [
            [
              {
                content: 'Tidak ada data rincian pengeluaran oli pada periode ini.',
                colSpan: 11,
                styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
              },
            ],
          ];

    autoTable(doc, {
      startY: curY + 2,
      head: [
        [
          'No',
          'Tanggal & Jam',
          'No Bon',
          'CN Unit',
          'Nama Alat Berat',
          'HM Unit',
          'Jenis / Tipe Oli',
          'Qty (Ltr)',
          'Rincian Kerusakan / Kompartemen',
          'PIC Mekanik',
          'PIC Gudang',
        ],
      ],
      body: oilDetailRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 20, fontStyle: 'bold' },
        3: { cellWidth: 20, fontStyle: 'bold', textColor: [5, 150, 105] },
        4: { cellWidth: 32 },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 34, fontStyle: 'bold' },
        7: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
        8: { cellWidth: 42 },
        9: { cellWidth: 26 },
        10: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 6;
  }

  // =========================================================================
  // 5. FORMAT LEMBAR PENGESAHAN FOG (3 PIHAK SESUAI INSTRUKSI USER):
  // 1. Petugas FOG = yang membuat Laporan (Kiri)
  // 2. Petugas Inventory = Diperiksa oleh (Tengah)
  // 3. Kabag Workshop = Mengetahui & Menyetujui (Kanan)
  // =========================================================================
  if (curY > 162) {
    doc.addPage();
    curY = 20;
  }

  const fogClean = (petugasFog || petugasChecker || '').trim() || '....................................';
  const fogJabatan = (petugasFogJabatan || 'Petugas FOG').trim();
  const inventoryClean = (petugasInventory || '').trim() || '....................................';
  const inventoryJabatan = (petugasInventoryJabatan || 'Petugas Inventory').trim();
  const kabagClean = (kabagWorkshop || kttName || '').trim() || '....................................';
  const kabagJabatan = (kabagWorkshopJabatan || 'Kabag Workshop').trim();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  // Kolom 1 (Kiri - x=55): 1. Di Buat Oleh (Dropdown Modul 2 Administrasi)
  doc.text('Di Buat Oleh,', 55, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(fogJabatan || 'Administrasi FOG', 55, curY + 8, { align: 'center' });
  doc.line(25, curY + 22, 85, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${fogClean} )`, 55, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop / FOG', 55, curY + 30, { align: 'center' });

  // Kolom 2 (Tengah - x=148.5): 2. Diperiksa Oleh (Dropdown Modul 2 Administrasi)
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);
  doc.text('Diperiksa Oleh,', 148.5, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(inventoryJabatan || 'Administrasi Inventory', 148.5, curY + 8, { align: 'center' });
  doc.line(118.5, curY + 22, 178.5, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${inventoryClean} )`, 148.5, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop / Inventory', 148.5, curY + 30, { align: 'center' });

  // Kolom 3 (Kanan - x=242): 3. Disetujui Oleh (Kabag Workshop)
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);
  doc.text('Disetujui Oleh,', 242, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(kabagJabatan || 'Kabag Workshop', 242, curY + 8, { align: 'center' });
  doc.line(212, curY + 22, 272, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${kabagClean} )`, 242, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Kabag Workshop PT BKWA', 242, curY + 30, { align: 'center' });

  // ==========================================
  // FOOTER HALAMAN OTOMATIS
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...grayTextColor);
    doc.text(
      `PT BATU KALI WELANG AMPUH • Laporan Transaksi Bahan Bakar & Pelumas (${periodeLabel}) • Halaman ${i} dari ${totalPages}`,
      148.5,
      203,
      { align: 'center' }
    );
  }

  // Generate blob URL & filename
  const cleanStartDate = (startDate || 'Awal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanEndDate = (endDate || 'Akhir').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Laporan_Transaksi_Fuel_Oli_PT_BKWA_${cleanStartDate}_sd_${cleanEndDate}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const download = () => doc.save(filename);

  return { doc, blob, blobUrl, filename, download };
};

/**
 * Utility Resmi untuk Mengekspor Laporan Rekapitulasi Bahan Bakar & Pelumas langsung ke file PDF
 */
export const exportFuelOilTransactionsToPDF = (params: ExportFuelOilReportParams): GeneratedPDFResult => {
  const result = generateFuelOilTransactionsPDF(params);
  result.download();
  return result;
};

/**
 * Parameter untuk Export & Preview Laporan Summary Penggunaan Oli Per Tipe
 */
export interface ExportOilSummaryReportParams {
  startDate?: string;
  endDate?: string;
  selectedOilType?: string;
  // Validasi 3 Pihak:
  // 1. PIC FOG - Pembuat laporan (Dropdown Manpower jabatan Administrasi)
  // 2. Inventory - Di Check Oleh (Dropdown Manpower jabatan Administrasi)
  // 3. Kabag Workshop - Disetujui Oleh (Dodik Mariyadi)
  picFogName: string;
  picFogJabatan?: string;
  inventoryName: string;
  inventoryJabatan?: string;
  kabagWorkshopName: string;
  kabagWorkshopJabatan?: string;
  currentUser?: UserAccount;
  oilDistributions: OilDistributionRecord[];
  oilStockInputs: OilStockInputRecord[];
  periodBalance?: InventoryPeriodBalance;
  availableOilTypes?: string[];
}

/**
 * Utility Resmi untuk Men-generate Laporan Summary Penggunaan Oli Setiap Tipe / Kategori ke PDF:
 * - Filter Tanggal & Filter Tipe Oli
 * - Informasi Saldo Awal, Penerimaan Masuk, Distribusi Keluar, dan Saldo Akhir
 * - Rincian Distribusi per masing-masing Jenis Oli
 * - Format Pengesahan 3 Pihak (PIC FOG, Inventory, Kabag Workshop Dodik Mariyadi)
 */
export const generateOilSummaryReportPDF = ({
  startDate,
  endDate,
  selectedOilType = 'ALL',
  picFogName,
  picFogJabatan = 'Administrasi',
  inventoryName,
  inventoryJabatan = 'Administrasi',
  kabagWorkshopName = 'Dodik Mariyadi',
  kabagWorkshopJabatan = 'Kabag Workshop',
  currentUser,
  oilDistributions = [],
  oilStockInputs = [],
  periodBalance,
  availableOilTypes = [],
}: ExportOilSummaryReportParams): GeneratedPDFResult => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nowStr = new Date().toLocaleString('id-ID');
  const exporterName = currentUser?.fullName || currentUser?.username || 'Staff Administrasi FOG';

  // Helper filter tanggal
  const matchDate = (tgl?: string) => {
    if (!tgl) return true;
    const cleanTgl = tgl.trim().split('T')[0];
    if (startDate && cleanTgl < startDate) return false;
    if (endDate && cleanTgl > endDate) return false;
    return true;
  };

  const isBeforeStart = (tgl?: string) => {
    if (!startDate || !tgl) return false;
    const cleanTgl = tgl.trim().split('T')[0];
    return cleanTgl < startDate;
  };

  // 1. Daftar semua tipe oli unik
  const defaultTypes = [
    'TURALIK 52 PERTAMINA',
    'RORED HDA SAE 90',
    'SAE 15W 40',
    'MEDITRAN SX 15W-40',
    'TURALIK 48',
    'RORED HDA SAE 140',
    'ATF AUTOMATIC TRANSMISSION',
    'HYDRAULIC OIL ISO VG 68',
  ];
  const distinctOilTypes = Array.from(
    new Set([
      ...availableOilTypes,
      ...oilStockInputs.map((i) => i.namaOli),
      ...oilDistributions.map((d) => d.jenisOli),
      ...defaultTypes,
    ])
  ).filter(Boolean);

  const oilTypesToReport =
    selectedOilType && selectedOilType !== 'ALL'
      ? distinctOilTypes.filter((t) => t.trim().toUpperCase() === selectedOilType.trim().toUpperCase())
      : distinctOilTypes;

  // 2. Filter distribusi oli sesuai filter tanggal dan tipe
  const filteredDistributions = oilDistributions.filter((d) => {
    if (!matchDate(d.tanggal)) return false;
    if (selectedOilType && selectedOilType !== 'ALL') {
      return d.jenisOli?.trim().toUpperCase() === selectedOilType.trim().toUpperCase();
    }
    return true;
  });

  // 3. Kalkulasi Saldo per Tipe Oli
  const oilSummaryList = oilTypesToReport.map((tipe) => {
    const tipeUpper = tipe.trim().toUpperCase();

    // Baseline saldo awal dari period balance
    const baseline = Number(periodBalance?.sisaPeriodeLaluOli?.[tipe]) || 0;

    // Mutasi sebelum startDate untuk akurasi saldo awal periode
    const priorMasuk = oilStockInputs
      .filter((i) => i.namaOli?.trim().toUpperCase() === tipeUpper && isBeforeStart(i.tanggal))
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const priorKeluar = oilDistributions
      .filter((d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && isBeforeStart(d.tanggal))
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const saldoAwal = Math.max(0, baseline + priorMasuk - priorKeluar);

    // Mutasi dalam periode terpilih
    const masuk = oilStockInputs
      .filter((i) => i.namaOli?.trim().toUpperCase() === tipeUpper && matchDate(i.tanggal))
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const keluar = oilDistributions
      .filter((d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && matchDate(d.tanggal))
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const saldoAkhir = Math.max(0, saldoAwal + masuk - keluar);

    const bonCount = oilDistributions.filter(
      (d) => d.jenisOli?.trim().toUpperCase() === tipeUpper && matchDate(d.tanggal)
    ).length;

    let status = 'Aman';
    if (saldoAkhir === 0) status = 'Kosong';
    else if (saldoAkhir < 20) status = 'Kritis';
    else if (saldoAkhir < 50) status = 'Menipis';

    return {
      tipe,
      saldoAwal,
      masuk,
      keluar,
      saldoAkhir,
      bonCount,
      status,
    };
  });

  // Urutkan: yang ada aktivitas mutasi atau saldo di atas
  oilSummaryList.sort((a, b) => b.keluar - a.keluar || b.saldoAkhir - a.saldoAkhir);

  const totalSaldoAwal = oilSummaryList.reduce((acc, c) => acc + c.saldoAwal, 0);
  const totalMasuk = oilSummaryList.reduce((acc, c) => acc + c.masuk, 0);
  const totalKeluar = oilSummaryList.reduce((acc, c) => acc + c.keluar, 0);
  const totalSaldoAkhir = oilSummaryList.reduce((acc, c) => acc + c.saldoAkhir, 0);

  // Label Rentang Tanggal
  let periodeLabel = 'Semua Periode Transaksi';
  if (startDate && endDate) {
    periodeLabel = `${startDate} s/d ${endDate}`;
  } else if (startDate) {
    periodeLabel = `Mulai ${startDate}`;
  } else if (endDate) {
    periodeLabel = `Sampai ${endDate}`;
  }

  // Formatting Colors
  const darkTextColor: [number, number, number] = [15, 23, 42];
  const grayTextColor: [number, number, number] = [100, 116, 139];
  const emeraldColor: [number, number, number] = [5, 150, 105];

  // Helper Ensure Page Space
  const ensurePageSpace = (requiredMm: number) => {
    if (curY + requiredMm > 195) {
      doc.addPage();
      curY = 16;
    }
  };

  // =========================================================================
  // HEADER KOP SURAT RESMI PT BKWA
  // =========================================================================
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(14, 10, 270, 22, 'F');

  // Emblem Kotak Logo
  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(17, 12, 18, 18, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BKWA', 26, 21.5, { align: 'center' });
  doc.setFontSize(5);
  doc.text('OIL FOG', 26, 25.5, { align: 'center' });

  // Teks Kop Perusahaan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('PT BATU KALI WELANG AMPUH', 39, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153); // Emerald light
  doc.text('LAPORAN SUMMARY PENGGUNAAN OLI SETIAP TYPE / KATEGORI', 39, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'Quarry Purwosari • Divisi Maintenance & Logistik Pelumas • Monitoring Saldo Awal, Penerimaan, Distribusi & Sisa Stok',
    39,
    26.5
  );

  // Metadata Dokumen di Kanan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DOKUMEN RESMI PELUMAS (OIL)', 280, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Periode: ${periodeLabel}`, 280, 20.5, { align: 'right' });
  doc.text(`Kategori: ${selectedOilType === 'ALL' ? 'Semua Jenis Oli' : selectedOilType}`, 280, 24.5, {
    align: 'right',
  });
  doc.text(`Cetak: ${nowStr} • Oleh: ${exporterName}`, 280, 28.5, { align: 'right' });

  let curY = 36;

  // =========================================================================
  // METRIC HIGHLIGHT CARDS
  // =========================================================================
  const cardWidth = 63.5;
  const cardHeight = 13.5;
  const cards = [
    { label: 'TOTAL SALDO AWAL', val: `${totalSaldoAwal.toLocaleString('id-ID')} Liter`, col: [59, 130, 246] as [number, number, number], sub: 'Sisa stok periode lalu' },
    { label: 'TOTAL PENERIMAAN (MASUK)', val: `${totalMasuk.toLocaleString('id-ID')} Liter`, col: [16, 185, 129] as [number, number, number], sub: 'Drop supplier / gudang' },
    { label: 'TOTAL PENGGUNAAN (KELUAR)', val: `${totalKeluar.toLocaleString('id-ID')} Liter`, col: [249, 115, 22] as [number, number, number], sub: `${filteredDistributions.length} bon distribusi unit` },
    { label: 'TOTAL SALDO AKHIR', val: `${totalSaldoAkhir.toLocaleString('id-ID')} Liter`, col: [139, 92, 246] as [number, number, number], sub: 'Sisa fisik siap pakai' },
  ];

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardWidth + 5);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, curY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, curY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFillColor(...c.col);
    doc.rect(x, curY, 2.5, cardHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...grayTextColor);
    doc.text(c.label, x + 5, curY + 4);

    doc.setFontSize(9);
    doc.setTextColor(...darkTextColor);
    doc.text(c.val, x + 5, curY + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + 5, curY + 11.8);
  });

  curY += cardHeight + 5;

  // =========================================================================
  // SECTION 1: TABEL REKAPITULASI SALDO & MUTASI OLI PER TIPE
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...emeraldColor);
  doc.text(
    `1. REKAPITULASI INFORMASI SALDO OLI SETIAP TYPE / KATEGORI (${oilSummaryList.length} Varian Oli)`,
    14,
    curY
  );

  const summaryTableRows = oilSummaryList.map((item, idx) => {
    const pct = totalKeluar > 0 ? ((item.keluar / totalKeluar) * 100).toFixed(1) : '0';
    return [
      idx + 1,
      item.tipe,
      `${item.saldoAwal.toLocaleString('id-ID')} L`,
      `${item.masuk.toLocaleString('id-ID')} L`,
      `${item.keluar.toLocaleString('id-ID')} L`,
      `${item.saldoAkhir.toLocaleString('id-ID')} L`,
      `${pct} %`,
      `${item.bonCount} Bon`,
      item.status,
    ];
  });

  // Baris Total Keseluruhan
  summaryTableRows.push([
    '',
    'TOTAL KESELURUHAN OLI',
    `${totalSaldoAwal.toLocaleString('id-ID')} L`,
    `${totalMasuk.toLocaleString('id-ID')} L`,
    `${totalKeluar.toLocaleString('id-ID')} L`,
    `${totalSaldoAkhir.toLocaleString('id-ID')} L`,
    '100 %',
    `${filteredDistributions.length} Bon`,
    'Rangkuman',
  ]);

  autoTable(doc, {
    startY: curY + 2,
    head: [
      [
        'No',
        'Jenis / Varian Oli',
        'Saldo Awal',
        'Masuk (Penerimaan)',
        'Keluar (Penggunaan)',
        'Saldo Akhir',
        '% Pemakaian',
        'Frekuensi',
        'Status Stok',
      ],
    ],
    body: summaryTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1.6,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 72, fontStyle: 'bold' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 32, halign: 'right', textColor: [16, 185, 129] },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: [234, 88, 12] },
      5: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Baris total highlight
      if (data.row.index === summaryTableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  curY = doc.lastAutoTable.finalY + 6;

  // =========================================================================
  // SECTION 2: TABEL RINCIAN DISTRIBUSI PENGGUNAAN OLI KE UNIT
  // =========================================================================
  ensurePageSpace(20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...emeraldColor);
  doc.text(
    `2. RINCIAN DISTRIBUSI PENGGUNAAN OLI PER UNIT ALAT BERAT (${filteredDistributions.length} Bon Transaksi, Total: ${totalKeluar.toLocaleString('id-ID')} Liter)`,
    14,
    curY
  );

  const detailRows =
    filteredDistributions.length > 0
      ? filteredDistributions.map((r, idx) => [
          idx + 1,
          `${r.tanggal || '-'} ${r.jam ? `(${r.jam})` : ''}`,
          r.noBon || '-',
          r.jenisOli || '-',
          r.noUnit || '-',
          r.namaAlat || r.namaUnit || '-',
          (Number(r.hmUnit) || 0).toLocaleString('id-ID'),
          `${(Number(r.qty) || 0).toLocaleString('id-ID')} L`,
          r.rincianKerusakan || '-',
          r.picMekanik || '-',
          r.picGudangMaterial || '-',
        ])
      : [
          [
            {
              content: 'Tidak ada transaksi distribusi oli yang tercatat pada rentang tanggal terpilih.',
              colSpan: 11,
              styles: { halign: 'center' as const, fontStyle: 'italic' as const, textColor: [148, 163, 184] as [number, number, number] },
            },
          ],
        ];

  autoTable(doc, {
    startY: curY + 2,
    head: [
      [
        'No',
        'Tanggal & Jam',
        'No Bon',
        'Jenis / Tipe Oli',
        'CN Unit',
        'Nama Alat Berat',
        'HM Unit',
        'Qty (Ltr)',
        'Rincian Kerusakan / Kompartemen',
        'PIC Mekanik',
        'PIC Gudang',
      ],
    ],
    body: detailRows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1.6,
    },
    styles: {
      fontSize: 6.7,
      cellPadding: 1.4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 20, fontStyle: 'bold' },
      3: { cellWidth: 36, fontStyle: 'bold', textColor: [5, 150, 105] },
      4: { cellWidth: 18, fontStyle: 'bold' },
      5: { cellWidth: 30 },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 18, halign: 'right', fontStyle: 'bold', textColor: [234, 88, 12] },
      8: { cellWidth: 44 },
      9: { cellWidth: 26 },
      10: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  curY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // SECTION 3: LEMBAR PENGESAHAN LAPORAN (3 PIHAK SESUAI INSTRUKSI USER):
  // 1. PIC FOG - Pembuat laporan (Dropdown Manpower jabatan Administrasi)
  // 2. Inventory - Di Check Oleh (Dropdown Manpower jabatan Administrasi)
  // 3. Kabag Workshop - Disetujui Oleh (Dodik Mariyadi)
  // =========================================================================
  if (curY > 160) {
    doc.addPage();
    curY = 20;
  }

  const cleanPicFog = (picFogName || '').trim() || '....................................';
  const cleanInventory = (inventoryName || '').trim() || '....................................';
  const cleanKabag = (kabagWorkshopName || 'Dodik Mariyadi').trim() || 'Dodik Mariyadi';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  // Kolom 1 (Kiri - x=55): Di Buat Oleh (Dropdown Modul 2 Administrasi)
  doc.text('Di Buat Oleh,', 55, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(picFogJabatan || 'Administrasi', 55, curY + 8, { align: 'center' });
  doc.setDrawColor(148, 163, 184);
  doc.line(25, curY + 22, 85, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${cleanPicFog} )`, 55, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop / FOG', 55, curY + 30, { align: 'center' });

  // Kolom 2 (Tengah - x=148.5): Diperiksa Oleh (Dropdown Modul 2 Administrasi)
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);
  doc.text('Diperiksa Oleh,', 148.5, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(inventoryJabatan || 'Administrasi', 148.5, curY + 8, { align: 'center' });
  doc.line(118.5, curY + 22, 178.5, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${cleanInventory} )`, 148.5, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Administrasi Workshop / Inventory', 148.5, curY + 30, { align: 'center' });

  // Kolom 3 (Kanan - x=242): Disetujui Oleh (Kabag Workshop)
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);
  doc.text('Disetujui Oleh,', 242, curY + 4, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(kabagWorkshopJabatan || 'Kabag Workshop', 242, curY + 8, { align: 'center' });
  doc.line(212, curY + 22, 272, curY + 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${cleanKabag} )`, 242, curY + 26, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayTextColor);
  doc.text('Kabag Workshop PT BKWA', 242, curY + 30, { align: 'center' });

  // =========================================================================
  // FOOTER NOMOR HALAMAN DI SELURUH HALAMAN
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 200, 284, 200);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...grayTextColor);
    doc.text(
      `PT BATU KALI WELANG AMPUH • Laporan Summary Penggunaan Oli Per Tipe (${periodeLabel}) • Halaman ${i} dari ${totalPages}`,
      148.5,
      204,
      { align: 'center' }
    );
  }

  // Generate blob URL & filename
  const cleanStartDate = (startDate || 'Awal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanEndDate = (endDate || 'Akhir').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTipe = (selectedOilType && selectedOilType !== 'ALL' ? selectedOilType : 'Semua_Tipe').replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
  const filename = `Laporan_Summary_Penggunaan_Oli_PT_BKWA_${cleanTipe}_${cleanStartDate}_sd_${cleanEndDate}.pdf`;
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const download = () => doc.save(filename);

  return { doc, blob, blobUrl, filename, download };
};

/**
 * Utility Resmi untuk Mengekspor Laporan Summary Penggunaan Oli langsung download ke PDF
 */
export const exportOilSummaryReportToPDF = (params: ExportOilSummaryReportParams): GeneratedPDFResult => {
  const result = generateOilSummaryReportPDF(params);
  result.download();
  return result;
};

