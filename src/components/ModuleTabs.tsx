import React from 'react';
import { 
  Truck, 
  Users, 
  Wrench, 
  FileSpreadsheet, 
  ArrowRight
} from 'lucide-react';
import { ModuleInfo } from '../types';

interface ModuleTabsProps {
  activeModuleId: number;
  onSelectModule: (id: number) => void;
  modules: ModuleInfo[];
  totalAssetCount?: number;
  totalManpowerCount?: number;
  totalBreakdownCount?: number;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  activeModuleId,
  onSelectModule,
  modules,
  totalAssetCount = 0,
  totalManpowerCount = 0,
  totalBreakdownCount = 0,
}) => {
  const getIcon = (id: number) => {
    switch (id) {
      case 1:
        return <Truck className="w-6 h-6" />;
      case 2:
        return <Users className="w-6 h-6" />;
      case 3:
        return <Wrench className="w-6 h-6" />;
      case 4:
        return <FileSpreadsheet className="w-6 h-6" />;
      default:
        return <Truck className="w-6 h-6" />;
    }
  };

  const getModuleShortLabel = (id: number) => {
    switch (id) {
      case 1:
        return { label: 'REGISTRASI ASSET', statusText: 'Modul 1 (Aktif)', sub: 'Unit & Heavy Equipment BKWA' };
      case 2:
        return { label: 'DATA MANPOWER', statusText: 'Modul 2 (Aktif)', sub: 'Personil & Tenaga Kerja Workshop' };
      case 3:
        return { label: 'DASHBOARD MAINTENANCE', statusText: 'Modul 3 (Aktif)', sub: 'Input, Update & Dashboard Maintenance' };
      case 4:
        return { label: 'INVENTORY MANAGEMENT', statusText: 'Modul 4 (Aktif)', sub: 'Sub Modul 1 FOG (Input Stock & Distribution)' };
      default:
        return { label: `MODUL ${id}`, statusText: 'Tersedia', sub: '' };
    }
  };

  return (
    <section className="w-full bg-stone-900/60 border-b border-stone-800/80 py-4 sm:py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-400">
              4 Modul Terintegrasi BKWA
            </h2>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            Fokus Aktif: <strong className="text-amber-400">
              {activeModuleId === 1 ? 'Modul 1 (Registrasi Asset)' : activeModuleId === 2 ? 'Modul 2 (Data Manpower)' : `Modul ${activeModuleId}`}
            </strong>
          </span>
        </div>

        {/* 4 Large Module Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {modules.map((m) => {
            const isActive = m.id === activeModuleId;
            const isModul1 = m.id === 1;
            const isModul2 = m.id === 2;
            const isModul3 = m.id === 3;
            const meta = getModuleShortLabel(m.id);

            return (
              <button
                key={m.id}
                id={`btn-modul-besar-${m.id}`}
                type="button"
                onClick={() => onSelectModule(m.id)}
                className={`group relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 border flex flex-col justify-between ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40'
                    : 'bg-stone-900/90 border-stone-800 hover:border-amber-500/40 hover:bg-stone-850'
                }`}
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/30'
                          : 'bg-stone-800 text-amber-400 group-hover:bg-stone-700'
                      }`}
                    >
                      {getIcon(m.id)}
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}
                    >
                      MODUL {m.id}
                    </span>
                  </div>

                  {/* Title & Sub */}
                  <h3
                    className={`font-black text-sm sm:text-base font-mono tracking-wide leading-tight ${
                      isActive ? 'text-amber-300' : 'text-stone-100 group-hover:text-amber-200'
                    }`}
                  >
                    {meta.label}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-1">
                    {meta.sub}
                  </p>
                </div>

                {/* Card Bottom Indicator */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {isModul1 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">
                          {totalAssetCount > 0 ? `${totalAssetCount} Unit Terdaftar` : 'Siap Input'}
                        </span>
                      </>
                    ) : isModul2 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">
                          {totalManpowerCount > 0 ? `${totalManpowerCount} Personil` : 'Siap Input'}
                        </span>
                      </>
                    ) : isModul3 ? (
                      <>
                        <span className={`w-2 h-2 rounded-full ${totalBreakdownCount > 0 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className={`text-[11px] font-bold ${totalBreakdownCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {totalBreakdownCount > 0 ? `${totalBreakdownCount} Unit Breakdown` : 'Normal (Siap Input)'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-bold text-amber-400">
                          Sub Modul 1: FOG
                        </span>
                      </>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-bold flex items-center gap-1 transition ${
                      isActive ? 'text-amber-400' : 'text-stone-400 group-hover:text-stone-200'
                    }`}
                  >
                    <span>{isActive ? 'Buka' : 'Pilih'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
