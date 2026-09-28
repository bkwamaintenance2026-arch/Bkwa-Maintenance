import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetUnit, 
  HeavyEquipment, 
  ManpowerData, 
  TyreInstallRecord, 
  TyreRegistration, 
  TyreRemoveRecord, 
  UserAccount 
} from '../../types';
import { 
  getAllTyreRegistrations, 
  addOrUpdateTyreRegistration, 
  deleteTyreRegistration, 
  generateNextTyreCode,
  getAllTyreInstalls,
  addOrUpdateTyreInstall,
  deleteTyreInstall,
  getAllTyreRemoves,
  addOrUpdateTyreRemove,
  deleteTyreRemove,
  isDeveloper
} from '../../utils/storage';
import { TyreRegistrationSubView } from './TyreRegistrationSubView';
import { TyreInstallSubView } from './TyreInstallSubView';
import { TyreRemoveSubView } from './TyreRemoveSubView';
import { TyreDashboardSubView } from './TyreDashboardSubView';
import { 
  Disc, 
  Wrench, 
  RotateCcw, 
  Gauge, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';

interface TyreManagementViewProps {
  units: (AssetUnit | HeavyEquipment)[];
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onBackToMainMenu?: () => void;
}

export const TyreManagementView: React.FC<TyreManagementViewProps> = ({
  units,
  manpowerList,
  currentUser,
  onBackToMainMenu,
}) => {
  const isDev = isDeveloper(currentUser);

  // Tab State: 1 = Registrasi, 2 = Install, 3 = Remove, 4 = Dashboard Monitoring
  const [activeSubModule, setActiveSubModule] = useState<1 | 2 | 3 | 4>(4); // default langsung buka Dashboard Monitoring!

  // Data States
  const [tyreRegistrations, setTyreRegistrations] = useState<TyreRegistration[]>([]);
  const [tyreInstalls, setTyreInstalls] = useState<TyreInstallRecord[]>([]);
  const [tyreRemoves, setTyreRemoves] = useState<TyreRemoveRecord[]>([]);
  const [selectedTyreToEdit, setSelectedTyreToEdit] = useState<TyreRegistration | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Initial Data
  const refreshAllData = () => {
    setTyreRegistrations(getAllTyreRegistrations());
    setTyreInstalls(getAllTyreInstalls());
    setTyreRemoves(getAllTyreRemoves());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Dismiss Toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Hitung jumlah ban yang Kritis (< 25% Sisa) untuk alert badge di Tab
  const criticalTyreCount = useMemo(() => {
    return tyreRegistrations.filter((t) => {
      if (t.status !== 'INSTALLED' || !t.currentUnit) return false;
      const initial = t.initialDepthThread && t.initialDepthThread > 0 ? t.initialDepthThread : 25;
      const current = t.currentDepthThread !== undefined ? t.currentDepthThread : initial;
      const pct = (current / initial) * 100;
      return pct <= 25;
    }).length;
  }, [tyreRegistrations]);

  // Handlers for Registrations
  const handleSaveRegistration = (
    data: Omit<TyreRegistration, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateTyreRegistration(data, idToEdit);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  const handleDeleteRegistration = (id: string) => {
    const res = deleteTyreRegistration(id);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  // Handlers for Installs
  const handleSaveInstall = (
    data: Omit<TyreInstallRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateTyreInstall(data, idToEdit);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  const handleDeleteInstall = (id: string) => {
    const res = deleteTyreInstall(id);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  // Handlers for Removes
  const handleSaveRemove = (
    data: Omit<TyreRemoveRecord, 'id' | 'createdAt' | 'updatedAt'>,
    idToEdit?: string
  ) => {
    const res = addOrUpdateTyreRemove(data, idToEdit);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  const handleDeleteRemove = (id: string) => {
    const res = deleteTyreRemove(id);
    if (res.success) {
      refreshAllData();
      setToastMessage({ type: 'success', text: res.message });
    } else {
      setToastMessage({ type: 'error', text: res.message });
    }
    return res;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation */}
      {onBackToMainMenu && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToMainMenu}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 text-xs font-semibold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Kembali ke Menu Utama</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-stone-400">
              Modul 7: Tyre Management System
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AKTIF
            </span>
          </div>
        </div>
      )}

      {/* Sub Module Tabs Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-2 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Sub Modul 1: Registrasi Tyre */}
          <button
            type="button"
            onClick={() => setActiveSubModule(1)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubModule === 1
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span className="truncate">1. Registrasi Tyre</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-stone-950/60 font-mono">
              {tyreRegistrations.length}
            </span>
          </button>

          {/* Sub Modul 2.a: Install */}
          <button
            type="button"
            onClick={() => setActiveSubModule(2)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubModule === 2
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="truncate">2.a Install (Pasang)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-stone-950/60 font-mono">
              {tyreInstalls.length}
            </span>
          </button>

          {/* Sub Modul 2.b: Remove */}
          <button
            type="button"
            onClick={() => setActiveSubModule(3)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubModule === 3
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="truncate">2.b Remove (Lepas)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-stone-950/60 font-mono">
              {tyreRemoves.length}
            </span>
          </button>

          {/* Sub Modul 2.c: Dashboard Tyre Management */}
          <button
            type="button"
            onClick={() => setActiveSubModule(4)}
            className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubModule === 4
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Gauge className="w-4 h-4 text-rose-300" />
            <span className="truncate">2.c Dashboard Tyre</span>
            {criticalTyreCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-950 text-rose-200 font-mono font-bold animate-pulse border border-rose-400">
                {criticalTyreCount} Kritis
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 font-mono text-xs shadow-lg animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-emerald-950/50'
              : 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-rose-950/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sub Module Content */}
      {activeSubModule === 1 && (
        <TyreRegistrationSubView
          tyreRegistrations={tyreRegistrations}
          currentUser={currentUser}
          onSaveRegistration={handleSaveRegistration}
          onDeleteRegistration={handleDeleteRegistration}
          generateNextCode={generateNextTyreCode}
          onNavigateToInstall={(code) => {
            setActiveSubModule(2);
          }}
        />
      )}

      {activeSubModule === 2 && (
        <TyreInstallSubView
          units={units}
          manpowerList={manpowerList}
          tyreRegistrations={tyreRegistrations}
          tyreInstalls={tyreInstalls}
          currentUser={currentUser}
          onSaveInstall={handleSaveInstall}
          onDeleteInstall={handleDeleteInstall}
          onBackToMainMenu={onBackToMainMenu}
        />
      )}

      {activeSubModule === 3 && (
        <TyreRemoveSubView
          units={units}
          manpowerList={manpowerList}
          tyreRegistrations={tyreRegistrations}
          tyreRemoves={tyreRemoves}
          currentUser={currentUser}
          onSaveRemove={handleSaveRemove}
          onDeleteRemove={handleDeleteRemove}
        />
      )}

      {activeSubModule === 4 && (
        <TyreDashboardSubView
          units={units}
          tyreRegistrations={tyreRegistrations}
          tyreInstalls={tyreInstalls}
          tyreRemoves={tyreRemoves}
          currentUser={currentUser}
          onEditTyre={(t) => {
            setActiveSubModule(1);
          }}
          onDeleteTyre={handleDeleteRegistration}
          onNavigateToInstall={() => setActiveSubModule(2)}
          onNavigateToRemove={() => setActiveSubModule(3)}
        />
      )}
    </div>
  );
};
