import React, { useState } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  BreakdownProgressOption, 
  BreakdownStatusUnitOption, 
  ManpowerData, 
  UserAccount,
  P2HRecord
} from '../../types';
import { InputBreakdownSubView } from './InputBreakdownSubView';
import { UpdateBreakdownSubView } from './UpdateBreakdownSubView';
import { DashboardMaintenanceSubView } from './DashboardMaintenanceSubView';
import { DetailBreakdownHistorySubView } from './DetailBreakdownHistorySubView';
import { LaporanHarianReadyBreakdownSubView } from './LaporanHarianReadyBreakdownSubView';
import { Wrench, Edit3, BarChart3, Layers, ArrowLeft, History, ClipboardCheck } from 'lucide-react';

interface MaintenanceDatabaseViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  breakdowns: BreakdownRecord[];
  p2hRecords?: P2HRecord[];
  currentUser: UserAccount;
  onSaveBreakdown: (
    data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onUpdateActivity: (
    id: string,
    updateData: {
      startJob?: string;
      jamStart?: string;
      jamFinish?: string;
      detailKerusakan?: string;
      progress?: BreakdownProgressOption | string;
      statusUnit?: BreakdownStatusUnitOption | string;
      pic1?: string;
      pic2?: string;
      pic3?: string;
      remark?: string;
      partsJasa?: BreakdownPartJasaItem[];
    }
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onDeleteBreakdown: (id: string) => { success: boolean; message: string };
  onBackToMainMenu?: () => void;
  onNavigateToP2H?: () => void;
}

export const MaintenanceDatabaseView: React.FC<MaintenanceDatabaseViewProps> = ({
  units,
  manpowerList,
  breakdowns,
  p2hRecords,
  currentUser,
  onSaveBreakdown,
  onUpdateActivity,
  onDeleteBreakdown,
  onBackToMainMenu,
  onNavigateToP2H,
}) => {
  // 5 Sub Modul: 1 = Input Breakdown, 2 = Update Breakdown, 3 = Dashboard Maintenance, 4 = Detail Breakdown & History Part, 5 = Laporan Harian (Ready & Breakdown)
  const [activeSubModule, setActiveSubModule] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Target record yang dipilih dari Sub Modul 1 / 4 untuk dibuka langsung di Sub Modul 2
  const [selectedBreakdownForUpdate, setSelectedBreakdownForUpdate] = useState<BreakdownRecord | null>(null);

  // Hitung unit aktif breakdown (semua unit yang belum READY)
  const activeBreakdownCount = breakdowns.filter(
    (b) => (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
  ).length;

  const handleNavigateToUpdate = (record: BreakdownRecord) => {
    setSelectedBreakdownForUpdate(record);
    setActiveSubModule(2);
  };

  return (
    <div className="space-y-6">
      {/* Top Back to Main Menu */}
      {onBackToMainMenu && (
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-menu-modul3"
            type="button"
            onClick={onBackToMainMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold transition shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Kembali ke Menu Utama</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500">
            Modul 3: Database &amp; Dashboard Maintenance
          </span>
        </div>
      )}

      {/* Sub Modul Navigation Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODUL 3
            </span>
            <h1 className="text-lg sm:text-xl font-black text-stone-100 font-mono tracking-wide uppercase">
              DASHBOARD MAINTENANCE
            </h1>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Sistem Database Maintenance, Pelaporan Kerusakan, Update Activity, Analisis PA &amp; Riwayat Penggantian Part.
          </p>
        </div>

        {/* 4 Sub Module Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-950/80 p-1.5 rounded-2xl border border-stone-800 self-start md:self-auto">
          {/* Sub Modul 1: Input Breakdown */}
          <button
            id="tab-submodul-1"
            type="button"
            onClick={() => setActiveSubModule(1)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubModule === 1
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Sub Modul 1: Input Breakdown</span>
          </button>

          {/* Sub Modul 2: Update Breakdown */}
          <button
            id="tab-submodul-2"
            type="button"
            onClick={() => setActiveSubModule(2)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition relative ${
              activeSubModule === 2
                ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Sub Modul 2: Update Breakdown</span>
            {activeBreakdownCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeSubModule === 2
                    ? 'bg-stone-950 text-amber-300'
                    : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                }`}
              >
                {activeBreakdownCount}
              </span>
            )}
          </button>

          {/* Sub Modul 3: Dashboard Maintenance */}
          <button
            id="tab-submodul-3"
            type="button"
            onClick={() => setActiveSubModule(3)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubModule === 3
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sub Modul 3: Dashboard Maintenance</span>
          </button>

          {/* Sub Modul 4: Detail Breakdown & History Part */}
          <button
            id="tab-submodul-4"
            type="button"
            onClick={() => setActiveSubModule(4)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubModule === 4
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sub Modul 4: Detail Breakdown &amp; History Part</span>
          </button>

          {/* Sub Modul 5: Laporan Harian (Ready & Breakdown) */}
          <button
            id="tab-submodul-5"
            type="button"
            onClick={() => setActiveSubModule(5)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubModule === 5
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Sub Modul 5: Laporan Harian Ready &amp; Breakdown</span>
          </button>
        </div>
      </div>

      {/* Sub Module Content Display */}
      {activeSubModule === 1 && (
        <InputBreakdownSubView
          units={units}
          manpowerList={manpowerList}
          breakdowns={breakdowns}
          currentUser={currentUser}
          onSaveBreakdown={onSaveBreakdown}
          onNavigateToUpdate={handleNavigateToUpdate}
          onDeleteBreakdown={onDeleteBreakdown}
        />
      )}

      {activeSubModule === 2 && (
        <UpdateBreakdownSubView
          breakdowns={breakdowns}
          selectedBreakdownToUpdate={selectedBreakdownForUpdate}
          manpowerList={manpowerList}
          currentUser={currentUser}
          onUpdateActivity={onUpdateActivity}
          onSelectBreakdown={(rec) => setSelectedBreakdownForUpdate(rec)}
          onDeleteBreakdown={onDeleteBreakdown}
        />
      )}

      {activeSubModule === 3 && (
        <DashboardMaintenanceSubView
          breakdowns={breakdowns}
          units={units}
          currentUser={currentUser}
          onBackToMainMenu={onBackToMainMenu}
          onOpenLaporanHarian={() => setActiveSubModule(5)}
        />
      )}

      {activeSubModule === 4 && (
        <DetailBreakdownHistorySubView
          units={units}
          breakdowns={breakdowns}
          currentUser={currentUser}
          manpowerList={manpowerList}
          onNavigateToUpdate={handleNavigateToUpdate}
          onDeleteBreakdown={onDeleteBreakdown}
        />
      )}

      {activeSubModule === 5 && (
        <LaporanHarianReadyBreakdownSubView
          units={units}
          breakdowns={breakdowns}
          p2hRecords={p2hRecords}
          manpowerList={manpowerList}
          currentUser={currentUser}
          onNavigateToUpdate={handleNavigateToUpdate}
          onNavigateToP2H={onNavigateToP2H}
        />
      )}
    </div>
  );
};

