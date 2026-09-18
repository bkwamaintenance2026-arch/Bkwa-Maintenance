import React, { useState } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  BreakdownProgressOption, 
  BreakdownStatusUnitOption, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { InputBreakdownSubView } from './InputBreakdownSubView';
import { UpdateBreakdownSubView } from './UpdateBreakdownSubView';
import { DashboardMaintenanceSubView } from './DashboardMaintenanceSubView';
import { Wrench, Edit3, BarChart3, Layers } from 'lucide-react';

interface MaintenanceDatabaseViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onSaveBreakdown: (
    data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onUpdateActivity: (
    id: string,
    updateData: {
      startJob?: string;
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
}

export const MaintenanceDatabaseView: React.FC<MaintenanceDatabaseViewProps> = ({
  units,
  manpowerList,
  breakdowns,
  currentUser,
  onSaveBreakdown,
  onUpdateActivity,
}) => {
  // 3 Sub Modul: 1 = Input Breakdown, 2 = Update Breakdown, 3 = Dashboard Maintenance
  const [activeSubModule, setActiveSubModule] = useState<1 | 2 | 3>(1);

  // Target record yang dipilih dari Sub Modul 1 untuk dibuka langsung di Sub Modul 2
  const [selectedBreakdownForUpdate, setSelectedBreakdownForUpdate] = useState<BreakdownRecord | null>(null);

  // Hitung unit aktif breakdown
  const activeBreakdownCount = breakdowns.filter((b) => b.statusUnit === 'BREAKDOWN').length;

  const handleNavigateToUpdate = (record: BreakdownRecord) => {
    setSelectedBreakdownForUpdate(record);
    setActiveSubModule(2);
  };

  return (
    <div className="space-y-6">
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
            Sistem Database Maintenance, Pelaporan Kerusakan, Update Activity & Analisis PA Unit Quarry Purwosari.
          </p>
        </div>

        {/* 3 Sub Module Navigation Tabs */}
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
        />
      )}

      {activeSubModule === 3 && (
        <DashboardMaintenanceSubView
          breakdowns={breakdowns}
          units={units}
        />
      )}
    </div>
  );
};
