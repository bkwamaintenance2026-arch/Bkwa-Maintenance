import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ManpowerData, UserAccount } from '../../types';
import { resolveFogSignatories } from '../../utils/reportSignatories';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const STORAGE_KEY_FOG_PEMBUAT = 'bkwa_fog_sig_pembuat';
export const STORAGE_KEY_FOG_PEMBUAT_JABATAN = 'bkwa_fog_sig_pembuat_jabatan';
export const STORAGE_KEY_FOG_DIPERIKSA = 'bkwa_fog_sig_diperiksa';
export const STORAGE_KEY_FOG_DIPERIKSA_JABATAN = 'bkwa_fog_sig_diperiksa_jabatan';
export const STORAGE_KEY_FOG_KABAG = 'bkwa_fog_sig_kabag';
export const STORAGE_KEY_FOG_KABAG_JABATAN = 'bkwa_fog_sig_kabag_jabatan';
const FOG_SIG_EVENT = 'bkwa_fog_signatories_updated';

export interface FogSignatoryState {
  pembuatName: string;
  pembuatJabatan: string;
  diperiksaName: string;
  diperiksaJabatan: string;
  disetujuiName: string;
  disetujuiJabatan: string;
}

export function useFogSignatories(manpowerList: ManpowerData[], currentUser: UserAccount) {
  const resolved = useMemo(
    () => resolveFogSignatories(manpowerList, currentUser),
    [manpowerList, currentUser]
  );

  const readFromStorage = useCallback((): FogSignatoryState => {
    try {
      return {
        pembuatName:
          localStorage.getItem(STORAGE_KEY_FOG_PEMBUAT) ||
          resolved.petugasFogName ||
          'Staff Administrasi FOG',
        pembuatJabatan:
          localStorage.getItem(STORAGE_KEY_FOG_PEMBUAT_JABATAN) ||
          resolved.petugasFogJabatan ||
          'Administrasi',
        diperiksaName:
          localStorage.getItem(STORAGE_KEY_FOG_DIPERIKSA) ||
          resolved.petugasInventoryName ||
          'Staff Administrasi Inventory',
        diperiksaJabatan:
          localStorage.getItem(STORAGE_KEY_FOG_DIPERIKSA_JABATAN) ||
          resolved.petugasInventoryJabatan ||
          'Administrasi',
        disetujuiName:
          localStorage.getItem(STORAGE_KEY_FOG_KABAG) ||
          resolved.kabagWorkshopName ||
          'Dodik Mariyadi',
        disetujuiJabatan:
          localStorage.getItem(STORAGE_KEY_FOG_KABAG_JABATAN) ||
          resolved.kabagWorkshopJabatan ||
          'Kabag Workshop',
      };
    } catch {
      return {
        pembuatName: resolved.petugasFogName || 'Staff Administrasi FOG',
        pembuatJabatan: resolved.petugasFogJabatan || 'Administrasi',
        diperiksaName: resolved.petugasInventoryName || 'Staff Administrasi Inventory',
        diperiksaJabatan: resolved.petugasInventoryJabatan || 'Administrasi',
        disetujuiName: resolved.kabagWorkshopName || 'Dodik Mariyadi',
        disetujuiJabatan: resolved.kabagWorkshopJabatan || 'Kabag Workshop',
      };
    }
  }, [resolved]);

  const [signatories, setSignatories] = useState<FogSignatoryState>(readFromStorage);

  useEffect(() => {
    const syncHandler = () => {
      setSignatories(readFromStorage());
    };
    window.addEventListener(FOG_SIG_EVENT, syncHandler);
    return () => window.removeEventListener(FOG_SIG_EVENT, syncHandler);
  }, [readFromStorage]);

  const persistSignatories = useCallback((next: FogSignatoryState) => {
    try {
      if (next.pembuatName) localStorage.setItem(STORAGE_KEY_FOG_PEMBUAT, next.pembuatName);
      if (next.pembuatJabatan)
        localStorage.setItem(STORAGE_KEY_FOG_PEMBUAT_JABATAN, next.pembuatJabatan);
      if (next.diperiksaName) localStorage.setItem(STORAGE_KEY_FOG_DIPERIKSA, next.diperiksaName);
      if (next.diperiksaJabatan)
        localStorage.setItem(STORAGE_KEY_FOG_DIPERIKSA_JABATAN, next.diperiksaJabatan);
      if (next.disetujuiName) localStorage.setItem(STORAGE_KEY_FOG_KABAG, next.disetujuiName);
      if (next.disetujuiJabatan)
        localStorage.setItem(STORAGE_KEY_FOG_KABAG_JABATAN, next.disetujuiJabatan);
      window.dispatchEvent(new Event(FOG_SIG_EVENT));
    } catch (err) {
      console.error('Gagal menyimpan validasi FOG:', err);
    }
  }, []);

  const updateSignatories = useCallback(
    (updater: FogSignatoryState | ((prev: FogSignatoryState) => FogSignatoryState)) => {
      setSignatories((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistSignatories(next);
        return next;
      });
    },
    [persistSignatories]
  );

  return {
    signatories,
    resolved,
    updateSignatories,
    saveSignatories: () => persistSignatories(signatories),
  };
}

interface FogValidationBarProps {
  manpowerList: ManpowerData[];
  signatories: FogSignatoryState;
  administrasiList: ManpowerData[];
  kabagList: ManpowerData[];
  onChange: (updater: FogSignatoryState | ((prev: FogSignatoryState) => FogSignatoryState)) => void;
  onSave?: () => void;
  accentColor?: 'amber' | 'orange' | 'blue' | 'emerald' | 'rose';
}

export const FogValidationBar: React.FC<FogValidationBarProps> = ({
  manpowerList,
  signatories,
  administrasiList,
  kabagList,
  onChange,
  onSave,
  accentColor = 'amber',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [customPembuat, setCustomPembuat] = useState(false);
  const [customDiperiksa, setCustomDiperiksa] = useState(false);
  const [customDisetujui, setCustomDisetujui] = useState(false);

  const adminChoices = administrasiList.length > 0 ? administrasiList : manpowerList;
  const kabagChoices = kabagList.length > 0 ? kabagList : manpowerList;

  const badgeStyleMap: Record<string, string> = {
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    rose: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  };

  const handleClickSave = () => {
    if (onSave) onSave();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Compact Header Summary Bar (Always visible, click to expand setup) */}
      <div
        onClick={() => setIsOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
        }}
        className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 cursor-pointer hover:bg-stone-800/40 transition select-none"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`p-1.5 rounded-lg border ${badgeStyleMap[accentColor]}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-stone-100 uppercase tracking-wide">
              Validasi &amp; Lembar Pengesahan Cetak (3 Pihak)
            </div>
            <div className="text-[10.5px] font-mono text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span>
                1. Dibuat: <strong className="text-stone-200">{signatories.pembuatName || '-'}</strong>
              </span>
              <span className="text-stone-600">•</span>
              <span>
                2. Diperiksa: <strong className="text-stone-200">{signatories.diperiksaName || '-'}</strong>
              </span>
              <span className="text-stone-600">•</span>
              <span>
                3. Disetujui: <strong className="text-stone-200">{signatories.disetujuiName || '-'}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          {savedToast && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-1 rounded-lg">
              <Check className="w-3 h-3" />
              Pengesahan Disimpan
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-300 text-[11px] font-mono font-bold whitespace-nowrap">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{isOpen ? 'Tutup Validasi' : 'Atur Validasi'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>

      {/* Expandable 3-Party Signatory Picker */}
      {isOpen && (
        <div className="p-4 pt-3 border-t border-stone-800 bg-stone-950/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-stone-400">
              Pilih penandatangan dari data Manpower Modul 2 atau ketik manual. Tersimpan otomatis untuk seluruh laporan FOG &amp; SPBU Luar.
            </span>
            <button
              type="button"
              onClick={handleClickSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] transition shrink-0 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pengesahan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Di Buat Oleh */}
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono font-bold text-amber-400 uppercase">
                  1. Di Buat Oleh (Petugas FOG)
                </span>
                <button
                  type="button"
                  onClick={() => setCustomPembuat((v) => !v)}
                  className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1 shrink-0"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{customPembuat ? 'Dropdown' : 'Manual'}</span>
                </button>
              </div>

              {customPembuat ? (
                <input
                  type="text"
                  value={signatories.pembuatName}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, pembuatName: e.target.value }))
                  }
                  placeholder="Ketik nama pembuat..."
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              ) : (
                <select
                  value={signatories.pembuatName}
                  onChange={(e) => {
                    const chosen = manpowerList.find((m) => m.nama === e.target.value);
                    onChange((prev) => ({
                      ...prev,
                      pembuatName: e.target.value,
                      pembuatJabatan: chosen?.jabatan || prev.pembuatJabatan || 'Administrasi',
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Manpower --</option>
                  {signatories.pembuatName &&
                    !adminChoices.some((m) => m.nama === signatories.pembuatName) && (
                      <option value={signatories.pembuatName}>{signatories.pembuatName}</option>
                    )}
                  {adminChoices.map((m) => (
                    <option key={`p_${m.id}`} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={signatories.pembuatJabatan}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, pembuatJabatan: e.target.value }))
                }
                placeholder="Jabatan (cth: Administrasi FOG)"
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 2. Diperiksa Oleh */}
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono font-bold text-blue-400 uppercase">
                  2. Diperiksa Oleh (Inventory)
                </span>
                <button
                  type="button"
                  onClick={() => setCustomDiperiksa((v) => !v)}
                  className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1 shrink-0"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{customDiperiksa ? 'Dropdown' : 'Manual'}</span>
                </button>
              </div>

              {customDiperiksa ? (
                <input
                  type="text"
                  value={signatories.diperiksaName}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, diperiksaName: e.target.value }))
                  }
                  placeholder="Ketik nama pemeriksa..."
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-blue-500"
                />
              ) : (
                <select
                  value={signatories.diperiksaName}
                  onChange={(e) => {
                    const chosen = manpowerList.find((m) => m.nama === e.target.value);
                    onChange((prev) => ({
                      ...prev,
                      diperiksaName: e.target.value,
                      diperiksaJabatan: chosen?.jabatan || prev.diperiksaJabatan || 'Administrasi',
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Manpower --</option>
                  {signatories.diperiksaName &&
                    !adminChoices.some((m) => m.nama === signatories.diperiksaName) && (
                      <option value={signatories.diperiksaName}>{signatories.diperiksaName}</option>
                    )}
                  {adminChoices.map((m) => (
                    <option key={`d_${m.id}`} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={signatories.diperiksaJabatan}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, diperiksaJabatan: e.target.value }))
                }
                placeholder="Jabatan (cth: Administrasi Inventory)"
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-300 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 3. Disetujui Oleh */}
            <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono font-bold text-emerald-400 uppercase">
                  3. Disetujui Oleh (Kabag)
                </span>
                <button
                  type="button"
                  onClick={() => setCustomDisetujui((v) => !v)}
                  className="text-[10px] font-mono text-stone-400 hover:text-stone-200 flex items-center gap-1 shrink-0"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{customDisetujui ? 'Dropdown' : 'Manual'}</span>
                </button>
              </div>

              {customDisetujui ? (
                <input
                  type="text"
                  value={signatories.disetujuiName}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, disetujuiName: e.target.value }))
                  }
                  placeholder="Ketik nama penyetuju..."
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <select
                  value={signatories.disetujuiName}
                  onChange={(e) => {
                    const chosen = manpowerList.find((m) => m.nama === e.target.value);
                    onChange((prev) => ({
                      ...prev,
                      disetujuiName: e.target.value,
                      disetujuiJabatan: chosen?.jabatan || prev.disetujuiJabatan || 'Kabag Workshop',
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pilih Kabag Workshop --</option>
                  {signatories.disetujuiName &&
                    !kabagChoices.some((m) => m.nama === signatories.disetujuiName) && (
                      <option value={signatories.disetujuiName}>{signatories.disetujuiName}</option>
                    )}
                  {kabagChoices.map((m) => (
                    <option key={`k_${m.id}`} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={signatories.disetujuiJabatan}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, disetujuiJabatan: e.target.value }))
                }
                placeholder="Jabatan (cth: Kabag Workshop)"
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
