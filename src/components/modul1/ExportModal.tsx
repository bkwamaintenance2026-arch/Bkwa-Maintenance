import React, { useState } from 'react';
import { AssetUnit, UserAccount } from '../../types';
import { BkwaLogo } from '../BkwaLogo';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  Calendar,
  Building2
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: AssetUnit[];
  currentUser: UserAccount;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  units,
  currentUser,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [viewMode, setViewMode] = useState<'dialog' | 'printPreview'>('dialog');

  if (!isOpen) return null;

  // Generate CSV data for Excel
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Kode Unit',
      'Nama Unit',
      'Kategori',
      'Merk & Model',
      'No Seri Rangka (VIN)',
      'No Mesin',
      'Tahun Pembuatan',
      'Status Operasional',
      'Hour Meter (Jam Kerja)',
      'Lokasi Kerja',
      'PIC Operator',
      'Tanggal Masuk Fleet',
      'Terakhir Update',
      'Catatan',
    ];

    const rows = units.map((u, idx) => [
      idx + 1,
      `"${u.kodeUnit}"`,
      `"${u.namaUnit.replace(/"/g, '""')}"`,
      `"${u.kategori}"`,
      `"${u.merkModel.replace(/"/g, '""')}"`,
      `"${u.noSeriRangka}"`,
      `"${u.noMesin}"`,
      u.tahunPembuatan,
      `"${u.statusOperasional}"`,
      u.hourMeter,
      `"${u.lokasiKerja.replace(/"/g, '""')}"`,
      `"${u.picOperator.replace(/"/g, '""')}"`,
      `"${u.tanggalRegistrasi}"`,
      `"${u.terakhirDiperbarui}"`,
      `"${(u.catatan || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM so Excel opens accents and symbols cleanly
      'PT BATU KALI WELANG AMPUH - LAPORAN REGISTRASI ASSET FLEET ALAT BERAT\n' +
      `Dicetak oleh: ${currentUser.fullName} (${currentUser.role}) | Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
      `Total Armada: ${units.length} Unit Terdaftar\n\n` +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Laporan_Asset_Unit_BKWA_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-mono">
                EXPORT LAPORAN ASSET UNIT BKWA
              </h3>
              <p className="text-xs text-stone-400">
                Fitur Ekspor Laporan Resmi untuk Karyawan & Admin Developer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Selector */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CSV / Excel Card */}
            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex flex-col justify-between hover:border-amber-500/50 transition">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-100 font-mono">
                  Format Excel / Spreadsheet (.CSV)
                </h4>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Ekspor seluruh data spesifikasi teknis, nomor rangka, nomor mesin, status, dan jam kerja (HM) {units.length} unit ke file CSV kompatibel Microsoft Excel.
                </p>
              </div>

              <button
                id="btn-download-csv-asset"
                type="button"
                onClick={handleExportCSV}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20"
              >
                {downloaded ? (
                  <>
                    <Check className="w-4 h-4 text-stone-950" />
                    <span>File CSV Berhasil Diunduh!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh Excel (.CSV)</span>
                  </>
                )}
              </button>
            </div>

            {/* Print / PDF Formal Report Card */}
            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex flex-col justify-between hover:border-amber-500/50 transition">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
                  <Printer className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-100 font-mono">
                  Cetak / Print PDF Laporan Resmi
                </h4>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Pratinjau format cetak dokumen resmi dengan Kop Surat PT Batu Kali Welang Ampuh, stempel legalitas, dan kolom tanda tangan pengawas maintenance.
                </p>
              </div>

              <button
                id="btn-trigger-print-report"
                type="button"
                onClick={handleTriggerPrint}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Cetak ke PDF</span>
              </button>
            </div>
          </div>

          {/* Live Document Preview with Official Letterhead (Kop Surat) */}
          <div className="bg-stone-950 p-5 sm:p-7 rounded-2xl border border-stone-800 space-y-4 print:bg-white print:text-black">
            {/* Kop Surat PT BKWA */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-700">
              <div className="flex items-center gap-3">
                <BkwaLogo size="md" variant="card" />
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-wider text-stone-100 font-mono">
                    PT BATU KALI WELANG AMPUH
                  </h2>
                  <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                    Mining, Quarry Stone Crusher & Heavy Equipment Maintenance
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Jalan Raya Kali Welang Pasuruan - Jawa Timur | Email: bkwa.maintenance2026@gmail.com
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-stone-400 hidden sm:block">
                <p className="font-bold text-stone-200">DOKUMEN REGISTER ASSET</p>
                <p>Ref: BKWA/REG-FLEET/{new Date().getFullYear()}</p>
                <p>Status: RESMI / VALID</p>
              </div>
            </div>

            {/* Document Meta */}
            <div className="flex flex-wrap items-center justify-between text-xs text-stone-300 gap-2 bg-stone-900/80 p-3 rounded-xl border border-stone-800">
              <div>
                <span className="text-stone-400">Dicetak Oleh: </span>
                <strong className="text-stone-100">{currentUser.fullName}</strong> ({currentUser.role})
              </div>
              <div>
                <span className="text-stone-400">Tanggal: </span>
                <strong className="text-stone-100">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</strong>
              </div>
              <div>
                <span className="text-stone-400">Total Unit: </span>
                <strong className="text-amber-400 font-bold">{units.length} Unit Armada</strong>
              </div>
            </div>

            {/* Compact Preview Table */}
            <div className="max-h-56 overflow-y-auto border border-stone-800 rounded-xl">
              <table className="w-full text-left text-xs text-stone-200">
                <thead className="bg-stone-800/90 text-stone-400 uppercase text-[10px] tracking-wider font-mono sticky top-0">
                  <tr>
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Kode Unit</th>
                    <th className="py-2 px-3">Nama Alat</th>
                    <th className="py-2 px-3">Kategori</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Hour Meter</th>
                    <th className="py-2 px-3">Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 text-[11px]">
                  {units.map((u, i) => (
                    <tr key={u.id} className="hover:bg-stone-800/40">
                      <td className="py-1.5 px-3 text-stone-400">{i + 1}</td>
                      <td className="py-1.5 px-3 font-mono font-bold text-amber-400">{u.kodeUnit}</td>
                      <td className="py-1.5 px-3 font-medium text-stone-200 truncate max-w-[150px]">{u.namaUnit}</td>
                      <td className="py-1.5 px-3 text-stone-400">{u.kategori}</td>
                      <td className="py-1.5 px-3 font-bold text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            u.statusOperasional === 'OPERASI'
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : u.statusOperasional === 'MAINTENANCE'
                              ? 'text-amber-400 bg-amber-950/40'
                              : u.statusOperasional === 'BREAKDOWN'
                              ? 'text-rose-400 bg-rose-950/40'
                              : 'text-blue-400 bg-blue-950/40'
                          }`}
                        >
                          {u.statusOperasional}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-stone-200">
                        {u.hourMeter.toLocaleString('id-ID')} Jam
                      </td>
                      <td className="py-1.5 px-3 text-stone-400 truncate max-w-[120px]">{u.lokasiKerja}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 pt-4 border-t border-stone-800 text-center text-xs text-stone-300">
              <div>
                <p className="text-[11px] text-stone-400">Petugas Input / Admin Lapangan</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold underline text-stone-200">{currentUser.fullName}</span>
                </div>
                <p className="text-[10px] text-stone-400">PT Batu Kali Welang Ampuh</p>
              </div>

              <div>
                <p className="text-[11px] text-stone-400">Kepala Mekanik / Developer Sistem</p>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold underline text-stone-200">Developer PT BKWA</span>
                </div>
                <p className="text-[10px] text-stone-400">Penanggung Jawab Pemeliharaan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/90">
          <span className="text-xs text-stone-400">
            Hak Akses: Karyawan & Admin diizinkan melakukan Export Laporan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
