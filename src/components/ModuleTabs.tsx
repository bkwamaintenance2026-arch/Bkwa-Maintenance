import React from 'react';
import { 
  Truck, 
  Users, 
  Wrench, 
  Fuel, 
  ClipboardCheck,
  Boxes,
  Disc,
  ArrowRight,
  Lock
} from 'lucide-react';
import { ModuleInfo, UserAccount } from '../types';
import { canUserViewModule, isDeveloper } from '../utils/storage';

interface ModuleTabsProps {
  activeModuleId: number;
  onSelectModule: (id: number) => void;
  modules: ModuleInfo[];
  currentUser?: UserAccount | null;
  totalAssetCount?: number;
  totalManpowerCount?: number;
  totalBreakdownCount?: number;
  totalP2HCount?: number;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({
  activeModuleId,
  onSelectModule,
  modules,
  currentUser,
  totalAssetCount = 0,
  totalManpowerCount = 0,
  totalBreakdownCount = 0,
  totalP2HCount = 0,
}) => {
  const getIcon = (id: number) => {
    switch (id) {
      case 1:
        return <Truck className="w-5 h-5" />;
      case 2:
        return <Users className="w-5 h-5" />;
      case 3:
        return <Wrench className="w-5 h-5" />;
      case 4:
        return <Fuel className="w-5 h-5" />;
      case 5:
        return <ClipboardCheck className="w-5 h-5" />;
      case 6:
        return <Boxes className="w-5 h-5" />;
      case 7:
        return <Disc className="w-5 h-5" />;
      case 8:
        return <Boxes className="w-5 h-5" />;
      default:
        return <Truck className="w-5 h-5" />;
    }
  };

  const getModuleShortLabel = (id: number) => {
    switch (id) {
      case 1:
        return { label: 'REGISTRASI ASSET', statusText: 'Modul 1 (Aktif)', sub: 'Unit & Heavy Equipment BKWA' };
      case 2:
        return { label: 'DATA MANPOWER', statusText: 'Modul 2 (Aktif)', sub: 'Personil & Tenaga Kerja Workshop' };
      case 3:
        return { label: 'DASHBOARD MAINTENANCE', statusText: 'Modul 3 (Aktif)', sub: 'Breakdown & Analisis PA Unit' };
      case 4:
        return { label: 'FOG (FUEL, OIL & GREASE)', statusText: 'Modul 4 (Aktif)', sub: 'Kolom Fuel (SPBU Luar), Oil & Grease' };
      case 5:
        return { label: 'DIVISI OPERATION', statusText: 'Modul 5 (Aktif)', sub: 'P2H Harian & Setting Fleet' };
      case 6:
        return { label: 'INVENTORY MANAGEMENT', statusText: 'Modul 6 (Aktif)', sub: 'Spare Part & Order Part' };
      case 7:
        return { label: 'TYRE MANAGEMENT', statusText: 'Modul 7 (Aktif)', sub: 'Registrasi & Utilisasi Ban Unit' };
      case 8:
        return { label: 'MASTER PART', statusText: 'Modul 8 (Aktif)', sub: 'Katalog Master Part & Suku Cadang' };
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
              Modul Terintegrasi BKWA
            </h2>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            Fokus Aktif: <strong className="text-amber-400">
              {activeModuleId === 1 
                ? 'Modul 1 (Registrasi Asset)' 
                : activeModuleId === 2 
                ? 'Modul 2 (Data Manpower)' 
                : activeModuleId === 3 
                ? 'Modul 3 (Dashboard Maintenance)'
                : activeModuleId === 4 
                ? 'Modul 4 (FOG)'
                : activeModuleId === 5
                ? 'Modul 5 (Divisi Operation)'
                : activeModuleId === 6
                ? 'Modul 6 (Inventory Management)'
                : activeModuleId === 7
                ? 'Modul 7 (Tyre Management)'
                : activeModuleId === 8
                ? 'Modul 8 (Master Part)'
                : `Modul ${activeModuleId}`}
            </strong>
          </span>
        </div>

        {/* Module Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {modules.map((m) => {
            const isActive = m.id === activeModuleId;
            const isDev = isDeveloper(currentUser);
            const isAccessible = isDev || (currentUser ? canUserViewModule(currentUser, m.id) : true);
            const isModul1 = m.id === 1;
            const isModul2 = m.id === 2;
            const isModul3 = m.id === 3;
            const isModul4 = m.id === 4;
            const isModul5 = m.id === 5;
            const isModul6 = m.id === 6;
            const meta = getModuleShortLabel(m.id);

            return (
              <button
                key={m.id}
                id={`btn-modul-besar-${m.id}`}
                type="button"
                onClick={() => {
                  if (!isAccessible) {
                    alert(`Akses Dibatasi: Akun Anda tidak memiliki izin untuk membuka ${meta.label}. Hubungi Administrator untuk penyesuaian hak akses.`);
                    return;
                  }
                  onSelectModule(m.id);
                }}
                className={`group relative text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-200 border flex flex-col justify-between ${
                  !isAccessible
                    ? 'opacity-50 cursor-not-allowed bg-stone-950/70 border-stone-850 hover:border-stone-800'
                    : isActive
                    ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40 cursor-pointer'
                    : 'bg-stone-900/90 border-stone-800 hover:border-amber-500/40 hover:bg-stone-850 cursor-pointer'
                }`}
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        !isAccessible
                          ? 'bg-stone-900 text-stone-600'
                          : isActive
                          ? 'bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/30'
                          : 'bg-stone-800 text-amber-400 group-hover:bg-stone-700'
                      }`}
                    >
                      {getIcon(m.id)}
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                        !isAccessible
                          ? 'bg-stone-900 text-rose-400/80 border border-stone-800'
                          : isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}
                    >
                      {!isAccessible && <Lock className="w-2.5 h-2.5 text-rose-400" />}
                      MODUL {m.id}
                    </span>
                  </div>

                  {/* Title & Sub */}
                  <h3
                    className={`font-black text-xs sm:text-sm font-mono tracking-wide leading-tight ${
                      !isAccessible ? 'text-stone-500' : isActive ? 'text-amber-300' : 'text-stone-100 group-hover:text-amber-200'
                    }`}
                  >
                    {meta.label}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">
                    {!isAccessible ? 'Akses dibatasi untuk akun Anda' : meta.sub}
                  </p>
                </div>

                {/* Card Bottom Indicator */}
                <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {!isAccessible ? (
                      <span className="text-[10px] font-bold text-rose-400/70 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Terkunci
                      </span>
                    ) : isModul1 ? (
                      <span className="text-[10px] font-bold text-emerald-400">
                        {totalAssetCount > 0 ? `${totalAssetCount} Unit` : 'Siap Input'}
                      </span>
                    ) : isModul2 ? (
                      <span className="text-[10px] font-bold text-emerald-400">
                        {totalManpowerCount > 0 ? `${totalManpowerCount} Personil` : 'Siap Input'}
                      </span>
                    ) : isModul3 ? (
                      <span className={`text-[10px] font-bold ${totalBreakdownCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {totalBreakdownCount > 0 ? `${totalBreakdownCount} Breakdown` : 'Normal'}
                      </span>
                    ) : isModul4 ? (
                      <span className="text-[10px] font-bold text-amber-400">
                        FOG & Solar
                      </span>
                    ) : isModul5 ? (
                      <span className="text-[10px] font-bold text-teal-400">
                        {totalP2HCount > 0 ? `${totalP2HCount} P2H` : 'Form Standar'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-purple-400">
                        Spare Part
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 transition ${
                      !isAccessible
                        ? 'text-stone-600'
                        : isActive
                        ? 'text-amber-400'
                        : 'text-stone-400 group-hover:text-stone-200'
                    }`}
                  >
                    <span>{!isAccessible ? 'Terkunci' : isActive ? 'Buka' : 'Pilih'}</span>
                    <ArrowRight className="w-3 h-3" />
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
