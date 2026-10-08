import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BreakdownRecord, BreakdownPartJasaItem, P2HRecord, UserAccount } from '../types';

/**
 * Utility untuk mengekspor Formulir Permintaan Part & Jasa Breakdown ke PDF
 * Ditujukan untuk dikirim ke Head Office Malang sebagai laporan resmi.
 */
export const exportPartRequirementToPDF = (
  breakdown: BreakdownRecord,
  parts: BreakdownPartJasaItem[],
  currentUser: UserAccount
) => {
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

  // Kolom 1: Dibuat Oleh (Pemohon)
  doc.text('Dibuat Oleh (Pemohon),', 42, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text('Mekanik / Admin Workshop', 42, sigBoxY + 4, { align: 'center' });
  doc.line(20, sigBoxY + 22, 64, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${currentUser.fullName || currentUser.username || 'Mekanik Workshop'} )`, 42, sigBoxY + 26, { align: 'center' });

  // Kolom 2: Diperiksa Oleh
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa Oleh,', 105, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text('Supervisor Maintenance Quarry', 105, sigBoxY + 4, { align: 'center' });
  doc.line(83, sigBoxY + 22, 127, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text('( ............................................ )', 105, sigBoxY + 26, { align: 'center' });

  // Kolom 3: Disetujui Oleh (Head Office Malang)
  doc.setFont('helvetica', 'normal');
  doc.text('Disetujui Oleh,', 168, sigBoxY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(190, 18, 60);
  doc.text('Head Office Malang', 168, sigBoxY + 4, { align: 'center' });
  doc.line(146, sigBoxY + 22, 190, sigBoxY + 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text('( ............................................ )', 168, sigBoxY + 26, { align: 'center' });

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

  // Trigger download file PDF langsung
  const cleanMo = String(moNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanUnit = String(breakdown.noUnit).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Permintaan_Part_MO_${cleanMo}_Unit_${cleanUnit}_PT_BATU_KALI_WELANG_AMPUH_${dateStr}.pdf`;
  doc.save(filename);
};

export interface DailyReportSignatoryOptions {
  pembuatName?: string;
  pembuatJabatan?: string;
  diperiksaName?: string;
  diperiksaJabatan?: string;
  diketahuiName?: string;
  diketahuiJabatan?: string;
}

/**
 * Utility untuk mengekspor Laporan Harian Ready & Breakdown ke PDF
 * Ditujukan untuk dikirim setiap hari ke Head Office.
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
}) => {
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

  // 5. LEMBAR PENGESAHAN
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkTextColor);

  const namaPembuat = signatories?.pembuatName || exporterName;
  const jabatanPembuat = signatories?.pembuatJabatan || 'Administrasi';
  const namaDiperiksa = signatories?.diperiksaName || 'Supervisor Maintenance';
  const jabatanDiperiksa = signatories?.diperiksaJabatan || 'Supervisor Maintenance';
  const namaDiketahui = signatories?.diketahuiName || 'Kabag Workshop';
  const jabatanDiketahui = signatories?.diketahuiJabatan || 'Kabag Workshop';

  // Kolom 1: Yang Membuat (Admin yang ditunjuk - Jabatan Administrasi)
  doc.text('Yang Membuat,', 55, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanPembuat, 55, sigY + 4, { align: 'center' });
  doc.line(25, sigY + 18, 85, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaPembuat} )`, 55, sigY + 22, { align: 'center' });

  // Kolom 2: Diperiksa Oleh (SPV / Kabag Workshop)
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa Oleh,', 148.5, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiperiksa, 148.5, sigY + 4, { align: 'center' });
  doc.line(118.5, sigY + 18, 178.5, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiperiksa} )`, 148.5, sigY + 22, { align: 'center' });

  // Kolom 3: Diketahui Oleh (Kabag Workshop)
  doc.setFont('helvetica', 'normal');
  doc.text('Diketahui Oleh,', 242, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiketahui, 242, sigY + 4, { align: 'center' });
  doc.line(212, sigY + 18, 272, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiketahui} )`, 242, sigY + 22, { align: 'center' });

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

  // Trigger download file PDF
  const cleanDate = (selectedDate || 'Semua').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Laporan_Harian_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${cleanDate}.pdf`;
  doc.save(filename);
};

/**
 * Utility untuk mengekspor Laporan Detail Riwayat Breakdown ke PDF
 */
export const exportDetailHistoryToPDF = (
  breakdowns: BreakdownRecord[],
  selectedUnit: string,
  currentUser: UserAccount,
  signatories?: DailyReportSignatoryOptions
) => {
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
  const namaDiperiksa = signatories?.diperiksaName || 'Supervisor Maintenance';
  const jabatanDiperiksa = signatories?.diperiksaJabatan || 'Supervisor Maintenance';
  const namaDiketahui = signatories?.diketahuiName || 'Kabag Workshop';
  const jabatanDiketahui = signatories?.diketahuiJabatan || 'Kabag Workshop';

  // Kolom 1: Yang Membuat (Admin yang ditunjuk - Jabatan Administrasi)
  doc.text('Yang Membuat,', 55, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanPembuat, 55, sigY + 4, { align: 'center' });
  doc.line(25, sigY + 18, 85, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaPembuat} )`, 55, sigY + 22, { align: 'center' });

  // Kolom 2: Diperiksa Oleh (SPV / Kabag Workshop)
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa Oleh,', 148.5, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiperiksa, 148.5, sigY + 4, { align: 'center' });
  doc.line(118.5, sigY + 18, 178.5, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiperiksa} )`, 148.5, sigY + 22, { align: 'center' });

  // Kolom 3: Diketahui Oleh (Kabag Workshop)
  doc.setFont('helvetica', 'normal');
  doc.text('Diketahui Oleh,', 242, sigY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(...grayTextColor);
  doc.text(jabatanDiketahui, 242, sigY + 4, { align: 'center' });
  doc.line(212, sigY + 18, 272, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkTextColor);
  doc.text(`( ${namaDiketahui} )`, 242, sigY + 22, { align: 'center' });

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

  const cleanUnit = (selectedUnit || 'Semua_Unit').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Laporan_Detail_Breakdown_PT_BATU_KALI_WELANG_AMPUH_${cleanUnit}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
