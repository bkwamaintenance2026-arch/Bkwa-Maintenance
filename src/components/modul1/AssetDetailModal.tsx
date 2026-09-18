import React from 'react';
import { AssetUnit, UserAccount } from '../../types';
import { 
  X, 
  Truck, 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  Wrench, 
  ShieldCheck,
  History,
  QrCode
} from 'lucide-react';

interface AssetDetailModalProps {
  unit: AssetUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (unit: AssetUnit) => void;
  currentUser: UserAccount;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  unit,
  isOpen,
  onClose,
  onEdit,
  currentUser,
}) => {
  if (!isOpen || !unit) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPERASI':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'STANDBY':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'MAINTENANCE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'BREAKDOWN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-stone-700 text-stone-300 border-stone-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-xl text-stone-100">
                  {unit.kodeUnit}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                    unit.statusOperasional
                  )}`}
                >
                  {unit.statusOperasional}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-semibold">{unit.namaUnit}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Hour Meter (HM)
              </span>
              <p className="text-base font-black text-amber-300 font-mono mt-1">
                {unit.hourMeter.toLocaleString('id-ID')} Jam
              </p>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                Tahun Unit
              </span>
              <p className="text-base font-black text-stone-100 font-mono mt-1">
                {unit.tahunPembuatan}
              </p>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Kategori
              </span>
              <p className="text-xs font-bold text-stone-200 mt-1 truncate">
                {unit.kategori}
              </p>
            </div>

            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                Lokasi
              </span>
              <p className="text-xs font-semibold text-stone-300 mt-1 truncate" title={unit.lokasiKerja}>
                {unit.lokasiKerja}
              </p>
            </div>
          </div>

          {/* Technical Specs Table */}
          <div className="bg-stone-800/50 rounded-xl border border-stone-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-800/90 border-b border-stone-700/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
                Identitas Teknis & Nomor Registrasi
              </span>
              <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                <QrCode className="w-3.5 h-3.5 text-stone-300" />
                ID: {unit.id}
              </div>
            </div>
            <div className="divide-y divide-stone-800 text-xs">
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium">Merk & Model</span>
                <span className="col-span-2 text-stone-100 font-semibold">{unit.merkModel || unit.namaUnit}</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium">No. Seri Rangka (VIN)</span>
                <span className="col-span-2 text-amber-300 font-mono font-bold tracking-wider">
                  {unit.noSeriRangka}
                </span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium">No. Mesin (Engine No)</span>
                <span className="col-span-2 text-stone-200 font-mono font-bold">
                  {unit.noMesin}
                </span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  Operator Penanggung Jawab
                </span>
                <span className="col-span-2 text-stone-200 font-semibold">
                  {unit.picOperator}
                </span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium">Tanggal Masuk Fleet</span>
                <span className="col-span-2 text-stone-300 font-mono">
                  {unit.tanggalRegistrasi} (Terakhir update: {unit.terakhirDiperbarui})
                </span>
              </div>
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-stone-400 font-medium flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-stone-400" />
                  Catatan Lapangan
                </span>
                <span className="col-span-2 text-stone-300 italic">
                  {unit.catatan || 'Tidak ada catatan khusus.'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log / Riwayat Transaksi Unit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5 font-mono">
                <History className="w-3.5 h-3.5 text-amber-400" />
                Riwayat Pembaruan & Transaksi Unit
              </h4>
              <span className="text-[10px] text-stone-400">
                Total {unit.riwayatLog?.length || 0} entri
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {unit.riwayatLog && unit.riwayatLog.length > 0 ? (
                unit.riwayatLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-stone-800/60 border border-stone-800 flex items-start justify-between text-xs gap-3"
                  >
                    <div>
                      <p className="font-semibold text-stone-200">{log.keterangan}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Oleh: <span className="text-amber-400 font-medium">{log.user}</span> ({log.role})
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 whitespace-nowrap">
                      {log.tanggal}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-stone-800/40 rounded-lg text-center text-xs text-stone-400">
                  Belum ada catatan riwayat perubahan tambahan.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>PT Batu Kali Welang Ampuh Asset Management</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
            >
              Tutup
            </button>
            <button
              id="btn-edit-unit-from-detail"
              type="button"
              onClick={() => {
                onClose();
                onEdit(unit);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition"
            >
              <Wrench className="w-4 h-4" />
              <span>Update Data Unit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
