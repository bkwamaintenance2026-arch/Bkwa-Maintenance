import React, { useMemo } from 'react';
import { 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  UserAccount 
} from '../../types';
import { getAllSparePartTransactions, getAllManpower } from '../../utils/storage';
import { exportPartRequirementToPDF } from '../../utils/pdfGenerator';
import { resolveReportSignatories } from '../../utils/reportSignatories';
import { 
  X, 
  Printer, 
  Download, 
  Wrench, 
  Package, 
  FileText, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar, 
  Building2,
  AlertTriangle
} from 'lucide-react';

interface PartRequirementModalProps {
  breakdown: BreakdownRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const PartRequirementModal: React.FC<PartRequirementModalProps> = ({
  breakdown,
  isOpen,
  onClose,
  currentUser,
}) => {
  if (!isOpen || !breakdown) return null;

  const moNumber = breakdown.noMaintenanceOrder || breakdown.noNotifikasi;
  const notifNumber = breakdown.noNotifikasi;
  const unitInfo = `${breakdown.noUnit}${breakdown.namaAlat ? ` - ${breakdown.namaAlat}` : ''}`;

  // Kumpulkan semua part dari record breakdown, riwayat update, dan transaksi gudang Modul 6
  const allNeededParts = useMemo(() => {
    const list: BreakdownPartJasaItem[] = [];
    const seen = new Set<string>();

    const addItems = (items?: BreakdownPartJasaItem[]) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach((item) => {
        const key = `${item.jenis}-${(item.partNumber || '').trim().toLowerCase()}-${(item.namaPart || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      });
    };

    // 1. Dari record level teratas
    addItems(breakdown.partsJasa);

    // 2. Dari riwayat update breakdown
    if (breakdown.riwayatUpdate && Array.isArray(breakdown.riwayatUpdate)) {
      breakdown.riwayatUpdate.forEach((entry) => {
        addItems(entry.partsJasa);
      });
    }

    // 3. Dari transaksi gudang spare part Modul 6 yang mereferensikan MO / Notif ini
    try {
      const warehouseTrx = getAllSparePartTransactions();
      const moClean = (moNumber || '').trim().toLowerCase();
      const notifClean = (notifNumber || '').trim().toLowerCase();
      const unitClean = (breakdown.noUnit || '').trim().toLowerCase();

      const matchingTrx = warehouseTrx.filter((trx) => {
        const trxMo = (trx.noMaintenanceOrder || '').trim().toLowerCase();
        const trxUnit = (trx.noUnit || '').trim().toLowerCase();
        return (moClean && trxMo === moClean) || 
               (notifClean && trxMo === notifClean) ||
               (trxUnit === unitClean && (trxMo === moClean || trxMo === notifClean));
      });

      matchingTrx.forEach((trx) => {
        if (trx.items && Array.isArray(trx.items)) {
          trx.items.forEach((it) => {
            const itemNama = it.namaBarang || '';
            const key = `Part-${(it.partNumber || '').trim().toLowerCase()}-${itemNama.trim().toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              list.push({
                no: list.length + 1,
                jenis: 'Part',
                namaPart: itemNama,
                partNumber: it.partNumber || '-',
                qty: it.qtyDiminta || it.qtyDikeluarkan || 1,
                satuan: it.satuan || 'Pcs',
              });
            }
          });
        }
      });
    } catch (e) {
      console.error('Error fetching warehouse trx for part requirements:', e);
    }

    return list;
  }, [breakdown, moNumber, notifNumber]);

  // Resolusi penandatangan resmi:
  // - Yang Membuat: Admin yang ditunjuk sesuai otoritas di Modul 2 Manpower (Jabatan Administrasi)
  // - Diperiksa Oleh: Otomatis SPV, jika tidak ada fallback ke Kabag Workshop
  // - Diketahui Oleh: Kabag Workshop
  const signatories = useMemo(() => {
    const mpList = getAllManpower();
    return resolveReportSignatories(mpList, currentUser);
  }, [currentUser]);

  // Handler Export PDF: Meng-generate file PDF asli PT BATU KALI WELANG AMPUH untuk dikirim ke Head Office Malang
  const handleExportPDF = () => {
    try {
      exportPartRequirementToPDF(breakdown, allNeededParts, currentUser, signatories);
    } catch (e) {
      console.error('Error generating PDF with jsPDF, falling back to window.print', e);
      const originalTitle = document.title;
      const dateStr = new Date().toISOString().split('T')[0];
      document.title = `Permintaan_Part_MO_${moNumber}_Unit_${breakdown.noUnit}_PT_BATU_KALI_WELANG_AMPUH_${dateStr}`;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().split('T')[0];
    document.title = `Permintaan_Part_MO_${moNumber}_Unit_${breakdown.noUnit}_PT_BATU_KALI_WELANG_AMPUH_${dateStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Handler Export Word: Dokumen .doc yang dapat dibuka di MS Word
  const handleExportWord = () => {
    const nowStr = new Date().toLocaleString('id-ID');
    const wordHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Permintaan Spare Part MO ${moNumber} - PT BATU KALI WELANG AMPUH</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #222; margin: 20px; }
          h1 { font-size: 15pt; color: #b45309; text-align: center; margin-bottom: 2px; }
          h2 { font-size: 11pt; color: #1e293b; text-align: center; margin-top: 2px; }
          p.subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
          th { background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 5px; }
          .sig-table { width: 100%; margin-top: 30px; text-align: center; border: none; }
          .sig-table td { border: none; padding-top: 40px; }
        </style>
      </head>
      <body>
        <h1>PT BATU KALI WELANG AMPUH</h1>
        <h2>FORMULIR PERMINTAAN &amp; KEBUTUHAN SPARE PART UNIT (LAPORAN KE MALANG)</h2>
        <p class='subtitle'>Quarry Purwosari • Divisi Maintenance &amp; Alat Berat<br>Waktu Cetak: ${nowStr} | Dibuat Oleh: ${signatories.pembuatName} (${signatories.pembuatJabatan})</p>

        <table>
          <tr><td style="width: 25%; background:#f8fafc;"><strong>No. Maintenance Order (MO):</strong></td><td><strong>${moNumber}</strong> (Notif: ${notifNumber})</td></tr>
          <tr><td style="background:#f8fafc;"><strong>No Unit &amp; Nama Alat:</strong></td><td><strong>${breakdown.noUnit}</strong> - ${breakdown.namaAlat || breakdown.noLama || '-'} (${breakdown.jenis || '-'})</td></tr>
          <tr><td style="background:#f8fafc;"><strong>Tanggal &amp; Waktu Breakdown:</strong></td><td>${breakdown.tanggal} ${breakdown.jamBreakdown ? `(Pukul ${breakdown.jamBreakdown})` : ''} | Jam Kerja: ${breakdown.jamStart || '-'} s/d ${breakdown.jamFinish || 'Proses'}</td></tr>
          <tr><td style="background:#f8fafc;"><strong>Komponen Rusak:</strong></td><td>${breakdown.component || '-'}</td></tr>
          <tr><td style="background:#f8fafc;"><strong>Keluhan Awal / Problem:</strong></td><td>${breakdown.detailProblem || '-'}</td></tr>
          <tr><td style="background:#f8fafc;"><strong>Detail Tindakan Perbaikan:</strong></td><td>${breakdown.detailKerusakan || '-'}</td></tr>
          <tr><td style="background:#f8fafc;"><strong>PIC Teknisi / Mekanik:</strong></td><td>${[breakdown.pic1, breakdown.pic2, breakdown.pic3].filter(Boolean).join(', ') || breakdown.pelapor || '-'}</td></tr>
          <tr><td style="background:#f8fafc;"><strong>Status Unit &amp; Progress:</strong></td><td>${breakdown.statusUnit || 'BREAKDOWN'} (${breakdown.progress || 'On Progress'})</td></tr>
        </table>

        <h3 style="margin-top: 15px; font-size: 11pt; color: #1e293b;">DAFTAR SPARE PART &amp; JASA YANG DIBUTUHKAN</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th style="width: 60px;">Jenis</th>
              <th>Nama Part / Material</th>
              <th>Part Number (P/N)</th>
              <th style="text-align: right; width: 60px;">Qty</th>
              <th style="width: 70px;">Satuan</th>
            </tr>
          </thead>
          <tbody>
            ${allNeededParts.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">Belum ada part yang diinput untuk perbaikan unit ini.</td></tr>' :
              allNeededParts.map((p, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${p.jenis}</td>
                  <td><strong>${p.namaPart}</strong></td>
                  <td>${p.partNumber || '-'}</td>
                  <td style="text-align: right; font-weight: bold;">${p.qty}</td>
                  <td>${p.satuan || 'Pcs'}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <table class="sig-table">
          <tr>
            <td>
              Yang Membuat,<br><br><br><br>
              <strong>( ${signatories.pembuatName} )</strong><br>
              ${signatories.pembuatJabatan || 'Administrasi'}
            </td>
            <td>
              Diperiksa Oleh,<br><br><br><br>
              <strong>( ${signatories.diperiksaName} )</strong><br>
              ${signatories.diperiksaJabatan || 'Supervisor Maintenance'}
            </td>
            <td>
              Diketahui Oleh,<br><br><br><br>
              <strong>( ${signatories.diketahuiName} )</strong><br>
              ${signatories.diketahuiJabatan || 'Kabag Workshop'}
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
    link.setAttribute('download', `Permintaan_Part_MO_${moNumber}_Unit_${breakdown.noUnit}_PT_BATU_KALI_WELANG_AMPUH.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const mechanicsStr = [breakdown.pic1, breakdown.pic2, breakdown.pic3].filter(Boolean).join(', ') || breakdown.pelapor || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Top Toolbar (Tidak Tercetak) */}
        <div className="p-4 sm:p-5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MO: {moNumber}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  Unit: <strong className="text-stone-200">{breakdown.noUnit}</strong>
                </span>
              </div>
              <h3 className="text-sm font-bold text-stone-100 font-mono mt-0.5">
                Kebutuhan Spare Part &amp; Jasa Unit (Laporan ke Malang)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Export PDF */}
            <button
              id="btn-export-pdf-part-requirement"
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg shadow-rose-600/20 transition active:scale-95 cursor-pointer"
              title="Download File PDF Resmi (.pdf) untuk dikirim ke Head Office Malang"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF (Kirim ke Malang)</span>
            </button>

            {/* Tombol Print Langsung */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono font-bold text-xs transition"
              title="Cetak Langsung via Printer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak</span>
            </button>

            {/* Tombol Export Word */}
            <button
              type="button"
              onClick={handleExportWord}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono font-bold text-xs transition"
              title="Download format Word (.doc)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content Area */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 bg-stone-900 text-stone-200 print:bg-white print:text-black print:p-0 print:m-0 print:overflow-visible">
          
          {/* Printable Document Sheet Wrapper */}
          <div className="p-6 sm:p-8 bg-white text-stone-900 rounded-2xl shadow-xl print:shadow-none print:p-0 border border-stone-200 print:border-none space-y-5">
            
            {/* 1. KOP SURAT RESMI */}
            <div className="border-b-2 border-stone-900 pb-3 text-center">
              <div className="flex items-center justify-between pb-1">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block">
                    DIVISI MAINTENANCE &amp; ALAT BERAT
                  </span>
                  <span className="text-xs font-bold text-stone-800 font-mono">
                    SITE QUARRY PURWOSARI
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-stone-500 block">
                    TUJUAN LAPORAN:
                  </span>
                  <span className="text-xs font-bold text-rose-700 font-mono uppercase">
                    HEAD OFFICE MALANG
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-amber-700 tracking-wide font-mono uppercase mt-1">
                PT BATU KALI WELANG AMPUH
              </h1>
              <h2 className="text-xs sm:text-sm font-bold text-stone-800 font-mono uppercase tracking-wider mt-0.5">
                FORMULIR PERMINTAAN &amp; KEBUTUHAN SPARE PART UNIT BREAKDOWN
              </h2>
              <div className="text-[11px] text-stone-600 mt-1 flex flex-wrap items-center justify-center gap-3 font-mono">
                <span>No. MO: <strong>{moNumber}</strong></span>
                <span>•</span>
                <span>No. Notifikasi: <strong>{notifNumber}</strong></span>
                <span>•</span>
                <span>Tanggal Laporan: <strong>{breakdown.tanggal}</strong></span>
              </div>
            </div>

            {/* 2. IDENTITAS DETAIL UNIT & PROBLEM */}
            <div className="border border-stone-300 rounded-xl p-4 bg-stone-50/70 text-xs space-y-2.5">
              <div className="text-[11px] font-bold font-mono uppercase tracking-wider text-stone-700 border-b border-stone-200 pb-1">
                A. IDENTITAS UNIT &amp; INDIKASI KERUSAKAN
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">No. Unit (CN):</span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{breakdown.noUnit}</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Nama Alat / Merk:</span>
                  <span className="font-bold text-stone-900">{breakdown.namaAlat || breakdown.noLama || '-'}</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Jenis Unit:</span>
                  <span className="font-semibold text-stone-800">{breakdown.jenis || '-'}</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Komponen Rusak:</span>
                  <span className="font-bold text-rose-700">[{breakdown.component || 'Komponen'}]</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Jam Mulai Breakdown:</span>
                  <span className="font-mono text-stone-800">{breakdown.jamBreakdown || '-'}</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Jam Kerja Perbaikan:</span>
                  <span className="font-mono text-stone-800">{breakdown.jamStart ? `${breakdown.jamStart} - ${breakdown.jamFinish || 'Proses'}` : '-'}</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">Status &amp; Progres:</span>
                  <span className="font-bold text-amber-700">{breakdown.statusUnit || 'BREAKDOWN'} ({breakdown.progress || 'On Progress'})</span>
                </div>
                <div className="flex items-baseline justify-between py-0.5 border-b border-dashed border-stone-200">
                  <span className="text-stone-600 font-mono">PIC Teknisi Mekanik:</span>
                  <span className="font-semibold text-stone-800">{mechanicsStr}</span>
                </div>
              </div>

              <div className="pt-2 space-y-1.5">
                <div>
                  <span className="text-[11px] font-mono text-stone-500 font-semibold block">Problem / Keluhan Awal:</span>
                  <p className="text-stone-800 bg-white p-2 rounded border border-stone-200 text-xs leading-relaxed">
                    {breakdown.detailProblem || '-'}
                  </p>
                </div>
                {breakdown.detailKerusakan && (
                  <div>
                    <span className="text-[11px] font-mono text-stone-500 font-semibold block">Detail Kerusakan &amp; Analisa Tindakan:</span>
                    <p className="text-stone-800 bg-white p-2 rounded border border-stone-200 text-xs leading-relaxed">
                      {breakdown.detailKerusakan}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. TABEL DAFTAR KEBUTUHAN SPARE PART & JASA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold font-mono uppercase tracking-wider text-stone-800">
                  B. RINCIAN KEBUTUHAN SPARE PART &amp; JASA (DIKIRIM KE MALANG)
                </div>
                <span className="text-xs font-mono font-bold text-amber-800">
                  Total Item: {allNeededParts.length}
                </span>
              </div>

              <div className="overflow-x-auto border border-stone-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 text-stone-800 font-mono text-[10.5px] uppercase border-b border-stone-300">
                      <th className="py-2.5 px-3 text-center w-10 border-r border-stone-300">No</th>
                      <th className="py-2.5 px-3 w-16 border-r border-stone-300">Tipe</th>
                      <th className="py-2.5 px-3 border-r border-stone-300">Nama Part / Deskripsi Material</th>
                      <th className="py-2.5 px-3 border-r border-stone-300">Part Number (P/N)</th>
                      <th className="py-2.5 px-3 text-right w-16 border-r border-stone-300">Qty</th>
                      <th className="py-2.5 px-3 w-20 border-r border-stone-300">Satuan</th>
                      <th className="py-2.5 px-3">Keterangan / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {allNeededParts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-stone-500 italic bg-stone-50">
                          Belum ada daftar part yang dicatat untuk perbaikan unit ini. 
                          <span className="block text-[11px] text-stone-400 mt-0.5">
                            (Anda dapat menambahkan part yang dibutuhkan melalui menu Sub Modul 2: Update Breakdown).
                          </span>
                        </td>
                      </tr>
                    ) : (
                      allNeededParts.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="py-2 px-3 text-center font-mono text-stone-500 border-r border-stone-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-stone-200">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              item.jenis === 'Part' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.jenis}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-stone-900 border-r border-stone-200">
                            {item.namaPart}
                          </td>
                          <td className="py-2 px-3 font-mono text-amber-800 font-bold border-r border-stone-200">
                            {item.partNumber || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono font-black text-stone-900 text-right border-r border-stone-200">
                            {item.qty}
                          </td>
                          <td className="py-2 px-3 font-mono text-stone-700 border-r border-stone-200">
                            {item.satuan || 'Pcs'}
                          </td>
                          <td className="py-2 px-3 text-stone-600 text-[11px]">
                            {breakdown.statusUnit === 'READY' ? 'Sudah Terpasang' : 'Dibutuhkan Segera (Urgent)'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. CATATAN TAMBAHAN / REMARK */}
            {breakdown.remark && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                <span className="font-bold text-amber-900 font-mono block">Catatan Tambahan Lapangan:</span>
                <p className="text-amber-800 mt-0.5">{breakdown.remark}</p>
              </div>
            )}

            {/* 5. LEMBAR PENGESAHAN DOKUMEN RESMI (KIRIM KE MALANG) */}
            <div className="pt-6 border-t-2 border-stone-300">
              <div className="grid grid-cols-3 gap-4 text-center font-mono text-[11px] text-stone-800">
                <div className="space-y-1">
                  <span className="block font-bold">Yang Membuat,</span>
                  <span className="text-[10px] text-stone-500 block">{signatories.pembuatJabatan || 'Administrasi'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">
                    ( {signatories.pembuatName} )
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="block font-bold">Diperiksa Oleh,</span>
                  <span className="text-[10px] text-stone-500 block">{signatories.diperiksaJabatan || 'Supervisor Maintenance'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">
                    ( {signatories.diperiksaName} )
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="block font-bold">Diketahui Oleh,</span>
                  <span className="text-[10px] text-rose-700 font-bold block uppercase">{signatories.diketahuiJabatan || 'Kabag Workshop'}</span>
                  <div className="h-16 flex items-end justify-center">
                    <span className="text-[10px] text-stone-400 italic">( Tanda Tangan / Stempel )</span>
                  </div>
                  <strong className="block border-t border-stone-400 pt-1">
                    ( {signatories.diketahuiName} )
                  </strong>
                </div>
              </div>

              <div className="text-[10px] text-stone-500 text-center font-mono mt-5">
                Dokumen Resmi Permintaan Part &amp; Perbaikan Unit • PT BATU KALI WELANG AMPUH Quarry Purwosari
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Close Button (Tidak Tercetak) */}
        <div className="p-4 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-stone-400 font-mono">
            Klik tombol <strong className="text-rose-400">Export PDF</strong> di atas untuk mengunduh dokumen siap kirim ke Malang.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs font-mono transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
