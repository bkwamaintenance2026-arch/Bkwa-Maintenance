import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  ExternalLink,
  Eye,
  CheckCircle2,
  FileText,
  RefreshCw,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  pdfBlobUrl?: string | null;
  filename?: string;
  onDownload?: () => void;
  isLoading?: boolean;
  totalPages?: number;
  signatoriesSummary?: {
    pembuat?: string;
    diperiksa?: string;
    diketahui?: string;
  };
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'PT BATU KALI WELANG AMPUH • Site Quarry Purwosari',
  pdfBlobUrl,
  filename = 'Dokumen_Laporan_Resmi.pdf',
  onDownload,
  isLoading = false,
  signatoriesSummary,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    try {
      const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch {
      // Fallback
    }
    if (onDownload) {
      onDownload();
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div
        className={`bg-stone-900 border border-stone-800 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'fixed inset-2 z-[65] max-w-none h-[calc(100vh-16px)]' : 'max-w-6xl h-[94vh]'
        }`}
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800/90 bg-stone-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono tracking-tight truncate">
                  {title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pratinjau PDF
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-800 text-stone-400 border border-stone-700">
                  Resmi PT BKWA
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate mt-0.5">
                {subtitle} • <span className="font-mono text-stone-300">{filename}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Action: Open in New Tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              disabled={!pdfBlobUrl || isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 text-xs font-mono transition"
              title="Buka PDF di tab baru browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </button>

            {/* Action: Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfBlobUrl || isLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 text-xs font-mono transition"
              title="Print dokumen PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Action: Reload Preview */}
            <button
              type="button"
              onClick={handleReload}
              disabled={!pdfBlobUrl || isLoading}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition"
              title="Muat ulang pratinjau"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Action: Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition"
              title={isFullscreen ? 'Perkecil tampilan' : 'Tampilan layar penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Action: Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition ml-1"
              title="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB-TOOLBAR INFORMASI */}
        <div className="px-5 py-2.5 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Kop &amp; Format Resmi Siap Download
            </span>
            {signatoriesSummary?.pembuat && (
              <span className="text-stone-400">
                Pembuat: <strong className="text-stone-200">{signatoriesSummary.pembuat}</strong>
              </span>
            )}
            {signatoriesSummary?.diperiksa && (
              <span className="text-stone-400">
                Pemeriksa: <strong className="text-stone-200">{signatoriesSummary.diperiksa}</strong>
              </span>
            )}
            {signatoriesSummary?.diketahui && (
              <span className="text-stone-400">
                Menyetujui: <strong className="text-stone-200">{signatoriesSummary.diketahui}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 hidden md:inline">
              Periksa isi tabel dan lembar pengesahan sebelum mendownload file:
            </span>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs font-mono shadow-md shadow-amber-500/20 transition active:scale-95"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF (.pdf)</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEWPORT PRATINJAU PDF */}
        <div className="flex-1 bg-stone-950 relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <div className="w-12 h-12 rounded-2xl border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-mono font-bold text-stone-200">
                  Sedang Men-generate Pratinjau Dokumen PDF...
                </p>
                <p className="text-xs text-stone-500 font-mono">
                  Menyiapkan halaman resmi, tabel transaksi &amp; format lembar pengesahan
                </p>
              </div>
            </div>
          ) : pdfBlobUrl ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                id="pdf-preview-iframe"
                key={iframeKey}
                src={`${pdfBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full flex-1 rounded-2xl border border-stone-800 bg-stone-900 shadow-inner"
                title={title}
              />
              <div className="pt-2 px-2 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-stone-500 gap-1">
                <span>
                  Tips: Anda dapat menggulir halaman, memperbesar zoom, atau membuka di tab baru jika browser mendukung.
                </span>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka di Layar Penuh Browser</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center p-8 max-w-md">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-mono font-bold text-stone-200">
                Pratinjau PDF Belum Tersedia
              </p>
              <p className="text-xs text-stone-400 font-mono">
                Silakan muat ulang atau gunakan tombol Download langsung di bawah ini.
              </p>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs font-mono"
                >
                  Download Dokumen Sekarang
                </button>
              )}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 py-3.5 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-stone-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Dokumen Terverifikasi • Divisi Maintenance &amp; Logistik PT BATU KALI WELANG AMPUH
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs font-mono transition"
            >
              Tutup
            </button>

            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-black text-xs font-mono shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Dokumen PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
