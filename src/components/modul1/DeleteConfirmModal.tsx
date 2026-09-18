import React from 'react';
import { AssetUnit, UserAccount } from '../../types';
import { AlertTriangle, ShieldAlert, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  unit: AssetUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (unitId: string) => void;
  currentUser: UserAccount;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  unit,
  isOpen,
  onClose,
  onConfirm,
  currentUser,
}) => {
  if (!isOpen || !unit) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAdmin
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isAdmin ? <Trash2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-mono">
                {isAdmin ? 'KONFIRMASI HAPUS UNIT' : 'AKSES DITOLAK'}
              </h3>
              <p className="text-xs text-stone-400">
                {isAdmin ? 'Tindakan ini memerlukan otorisasi Developer' : 'Otorisasi Khusus Akun Developer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isAdmin ? (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Peringatan Penghapusan Unit:</p>
                  <p>
                    Anda akan menghapus unit <strong className="text-white font-mono">{unit.kodeUnit}</strong> - {unit.namaUnit}. Seluruh riwayat dan nomor registrasi unit ini akan dihilangkan dari sistem fleet BKWA.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/80 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-stone-400">Kode Unit:</span>
                  <span className="font-bold text-stone-100">{unit.kodeUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Nama Alat:</span>
                  <span className="text-stone-200 truncate max-w-[200px]">{unit.namaUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Chassis No:</span>
                  <span className="text-stone-200">{unit.noSeriRangka}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-800/70 rounded-xl text-xs text-amber-200 space-y-2">
              <p className="font-bold text-amber-300">
                Otoritas Hapus Unit Dibatasi:
              </p>
              <p>
                Sesuai kebijakan hak akses sistem PT Batu Kali Welang Ampuh, akun role <strong>Karyawan</strong> hanya berwenang untuk <strong>Input Unit Baru</strong>, <strong>Monitoring Unit & Laporan</strong>, serta <strong>Update Pekerjaan</strong>.
              </p>
              <p className="text-stone-300">
                Penghapusan unit merupakan otorisasi eksklusif akun <strong>Developer</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-800 bg-stone-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
          >
            {isAdmin ? 'Batal' : 'Saya Mengerti'}
          </button>
          {isAdmin && (
            <button
              id="btn-confirm-delete-unit"
              type="button"
              onClick={() => onConfirm(unit.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-900/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Ya, Hapus Unit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
