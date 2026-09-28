import React, { useState } from 'react';
import { 
  AssetUnit, 
  ManpowerData, 
  P2HRecord, 
  UserAccount 
} from '../../types';
import { P2HView } from './P2HView';
import { SettingFleetSubView } from './SettingFleetSubView';
import { 
  ClipboardCheck, 
  Truck, 
  ArrowLeft, 
  Layers, 
  Compass,
  CheckCircle2,
  RefreshCw,
  Edit3
} from 'lucide-react';

interface DivisiOperationViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  p2hRecords: P2HRecord[];
  currentUser: UserAccount;
  onSaveP2H: (
    data: Omit<P2HRecord, 'id' | 'noP2H' | 'createdAt' | 'updatedAt'>,
    existingId?: string | null
  ) => { success: boolean; message: string; record?: P2HRecord };
  onDeleteP2H: (id: string) => { success: boolean; message: string };
  onBackToMainMenu: () => void;
}

export const DivisiOperationView: React.FC<DivisiOperationViewProps> = ({
  units,
  manpowerList,
  p2hRecords,
  currentUser,
  onSaveP2H,
  onDeleteP2H,
  onBackToMainMenu,
}) => {
  // 2 Sub Modul:
  // 1 = Form P2H Unit (Pemeriksaan Harian Pra-Operasi 9 Item & Riwayat)
  // 2 = Setting Fleet (No Unit, Nama Operator, Lokasi Kerja - Opsi Manual & Sinkronisasi P2H)
  const [activeSubModule, setActiveSubModule] = useState<1 | 2>(1);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Back Navigation to Main Menu */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-menu-modul5"
          type="button"
          onClick={onBackToMainMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow hover:border-amber-500/40"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Kembali ke Menu Utama</span>
        </button>
        <span className="text-[11px] font-mono text-stone-500">
          Modul 5: Divisi Operation (PT BKWA)
        </span>
      </div>

      {/* Unified Modul 5 Sub-Module Navigation Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                MODUL 5
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-stone-100 font-mono tracking-wide uppercase">
                DIVISI OPERATION
              </h1>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Sistem Manajemen Lapangan Operasional Tambang &amp; Quarry PT BKWA: Form Pemeriksaan Harian Pra-Operasi (P2H) dan Pengaturan Penempatan Armada (Setting Fleet).
            </p>
          </div>

          {/* 2 Sub Module Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-950/80 p-1.5 rounded-2xl border border-stone-800 self-start lg:self-auto">
            {/* Sub Modul 1: Form P2H Unit */}
            <button
              id="tab-submodul-5-p2h"
              type="button"
              onClick={() => setActiveSubModule(1)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeSubModule === 1
                  ? 'bg-teal-500 text-stone-950 shadow-lg shadow-teal-500/20 font-black'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Sub Modul 1: Form P2H Unit</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeSubModule === 1
                    ? 'bg-stone-950 text-teal-300'
                    : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                }`}
              >
                {p2hRecords.length}
              </span>
            </button>

            {/* Sub Modul 2: Setting Fleet */}
            <button
              id="tab-submodul-5-fleet"
              type="button"
              onClick={() => setActiveSubModule(2)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeSubModule === 2
                  ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20 font-black'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Sub Modul 2: Setting Fleet</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeSubModule === 2
                    ? 'bg-stone-950 text-amber-300'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                Fleet
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Sub Module */}
      {activeSubModule === 1 ? (
        <P2HView
          units={units}
          manpowerList={manpowerList}
          p2hRecords={p2hRecords}
          currentUser={currentUser}
          onSaveP2H={onSaveP2H}
          onDeleteP2H={onDeleteP2H}
          onBackToMainMenu={onBackToMainMenu}
          isSubModule={true}
        />
      ) : (
        <SettingFleetSubView
          units={units}
          manpowerList={manpowerList}
          p2hRecords={p2hRecords}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
