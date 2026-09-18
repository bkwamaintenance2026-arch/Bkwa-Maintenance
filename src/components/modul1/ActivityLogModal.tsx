import React, { useState } from 'react';
import { ActivityLog, UserAccount } from '../../types';
import { 
  X, 
  History, 
  Search, 
  ShieldCheck, 
  HardHat, 
  Filter,
  RefreshCw,
  Clock
} from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onRefresh: () => void;
  currentUser: UserAccount;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onRefresh,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    const matchSearch =
      l.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.detailUnit && l.detailUnit.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchAction = actionFilter === 'ALL' || l.aksi === actionFilter;

    return matchSearch && matchAction;
  });

  const getAksiBadge = (aksi: string) => {
    switch (aksi) {
      case 'REGISTRASI':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'HAPUS':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'STATUS_CHANGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-stone-700 text-stone-300 border-stone-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-mono">
                LOG TRANSAKSI & AKTIVITAS SISTEM
              </h3>
              <p className="text-xs text-stone-400">
                Audit Trail Registrasi, Pembaruan, dan Operasi Asset BKWA
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

        {/* Filter Bar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari transaksi unit, user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Jenis Aksi</option>
              <option value="REGISTRASI">Registrasi Unit</option>
              <option value="UPDATE">Update Data</option>
              <option value="HAPUS">Hapus Unit</option>
              <option value="STATUS_CHANGE">Perubahan Status</option>
            </select>

            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 transition"
              title="Perbarui Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs Content List */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-2.5">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-stone-800/70 border border-stone-800 hover:border-stone-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase ${getAksiBadge(
                        log.aksi
                      )}`}
                    >
                      {log.aksi}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-100">
                      {log.keterangan}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-1">
                      <span className="flex items-center gap-1">
                        {log.role === 'ADMIN' ? (
                          <ShieldCheck className="w-3 h-3 text-amber-400" />
                        ) : (
                          <HardHat className="w-3 h-3 text-blue-400" />
                        )}
                        <strong className="text-stone-300">{log.user}</strong> ({log.role})
                      </span>
                      {log.detailUnit && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-amber-400 font-bold">
                            Unit: {log.detailUnit}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono whitespace-nowrap self-end sm:self-center">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>{log.tanggal}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-stone-400 text-xs">
              Tidak ada log transaksi yang cocok dengan kriteria pencarian.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/90 text-xs text-stone-400">
          <span>Menampilkan {filteredLogs.length} dari {logs.length} transaksi</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
