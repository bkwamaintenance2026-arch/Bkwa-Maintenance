import React, { useState, useEffect } from 'react';
import { ModuleInfo, UserAccount } from '../types';
import { BkwaLogo } from './BkwaLogo';
import {
  Home,
  LogOut,
  MapPin,
  ShieldCheck,
  ArrowLeft,
  FileSpreadsheet,
  Cloud,
  Menu,
  X,
  Lock,
  ChevronRight,
  Truck,
  Users,
  Wrench,
  Fuel,
  ClipboardCheck,
  Boxes,
  Disc,
} from 'lucide-react';
import { getSavedSpreadsheetId } from '../services/googleSheets';
import { canUserViewModule, isDeveloper } from '../utils/storage';

interface NavbarProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onGoHome?: () => void;
  onOpenAccessControl?: () => void;
  onOpenGoogleSheetsSync?: () => void;
  onOpenCloudSync?: () => void;
  isSimulating?: boolean;
  onExitSimulation?: () => void;
  activeModuleId?: number;
  modules?: ModuleInfo[];
  onSelectModule?: (id: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onGoHome,
  onOpenAccessControl,
  onOpenGoogleSheetsSync,
  onOpenCloudSync,
  isSimulating,
  onExitSimulation,
  activeModuleId = 0,
  modules = [],
  onSelectModule,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';
  const displayName = isAdmin ? 'Developer' : (currentUser.fullName || currentUser.username);
  const tier = currentUser.accountTier || (currentUser.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');
  const hasSpreadsheet = !!getSavedSpreadsheetId();

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const getModuleIcon = (id: number) => {
    switch (id) {
      case 1:
        return <Truck className="w-4 h-4" />;
      case 2:
        return <Users className="w-4 h-4" />;
      case 3:
        return <Wrench className="w-4 h-4" />;
      case 4:
        return <Fuel className="w-4 h-4" />;
      case 5:
        return <ClipboardCheck className="w-4 h-4" />;
      case 6:
      case 8:
        return <Boxes className="w-4 h-4" />;
      case 7:
        return <Disc className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  const renderTierBadge = () => {
    if (tier === 'DEVELOPER') {
      return (
        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
          Developer
        </span>
      );
    }
    if (tier === 'ADMIN') {
      return (
        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap">
          Admin
        </span>
      );
    }
    if (tier === 'KHUSUS') {
      return (
        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
          Akun Khusus
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 whitespace-nowrap">
        Member
      </span>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-xl shadow-stone-950/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 lg:h-20 min-w-0">
            {/* Brand & Header Title */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onGoHome}
                title="Kembali ke Menu Utama"
                className="text-left focus:outline-none group shrink-0"
              >
                <div className="scale-90 sm:scale-100 origin-left">
                  <BkwaLogo size="md" variant="card" />
                </div>
              </button>
              <div className="flex flex-col min-w-0">
                <h1 className="font-extrabold tracking-tight text-stone-100 text-xs sm:text-base lg:text-lg font-mono truncate">
                  Maintenance Management System
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-500 truncate">
                    PT BATU KALI WELANG AMPUH
                  </span>
                  <span className="text-stone-600 hidden sm:inline">•</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-stone-400 font-medium whitespace-nowrap shrink-0">
                    <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                    Quarry Purwosari
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Controls (>= lg) */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0">
              {isSimulating && onExitSimulation && (
                <button
                  id="btn-nav-exit-simulation"
                  type="button"
                  onClick={onExitSimulation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition active:scale-95 animate-pulse whitespace-nowrap shrink-0"
                  title="Kembali ke akun Developer utama"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Akun Developer</span>
                </button>
              )}

              {onGoHome && (
                <button
                  id="btn-nav-home"
                  type="button"
                  onClick={onGoHome}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-700 transition active:scale-95 shadow-md whitespace-nowrap shrink-0"
                  title="Kembali ke Menu Home / Menu Utama"
                >
                  <Home className="w-4 h-4" />
                  <span>Menu Utama</span>
                </button>
              )}

              {onOpenGoogleSheetsSync && (
                <button
                  id="btn-nav-google-sheets"
                  type="button"
                  onClick={onOpenGoogleSheetsSync}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg group relative whitespace-nowrap shrink-0 ${
                    hasSpreadsheet
                      ? 'text-emerald-300 bg-emerald-950/70 hover:bg-emerald-500 hover:text-stone-950 border border-emerald-600/70 shadow-emerald-950/40'
                      : 'text-amber-300 bg-amber-950/80 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/80 shadow-amber-950/50'
                  }`}
                  title={hasSpreadsheet ? 'Google Sheets Terhubung: Sinkronkan & Buka File' : 'Klik untuk Hubungkan & Buat File di Google Drive'}
                >
                  <FileSpreadsheet className={`w-4 h-4 ${hasSpreadsheet ? 'text-emerald-400 group-hover:text-stone-950' : 'text-amber-400 group-hover:text-stone-950'}`} />
                  <span>Google Sheets</span>
                  {!hasSpreadsheet && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-stone-950 ml-0.5">
                      Klik Disini
                    </span>
                  )}
                </button>
              )}

              {onOpenCloudSync && (
                <button
                  id="btn-nav-cloud-firestore"
                  type="button"
                  onClick={onOpenCloudSync}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/70 hover:bg-sky-500 hover:text-stone-950 border border-sky-600/70 transition active:scale-95 shadow-lg shadow-sky-950/40 group relative whitespace-nowrap shrink-0"
                  title="Cloud Firebase Firestore Terhubung: Realtime Multi-Device & Kapasitas Database"
                >
                  <div className="relative">
                    <Cloud className="w-4 h-4 text-sky-400 group-hover:text-stone-950" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  <span>Cloud DB</span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-stone-950 ml-0.5">
                    Live
                  </span>
                </button>
              )}

              {isAdmin && onOpenAccessControl && (
                <button
                  id="btn-nav-access-control"
                  type="button"
                  onClick={onOpenAccessControl}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-500 hover:text-stone-950 border border-amber-600/70 transition active:scale-95 shadow-lg shadow-amber-950/50 group whitespace-nowrap shrink-0"
                  title="Menu Pengaturan Hak Akses"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:text-stone-950" />
                  <span>Hak Akses User</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 group-hover:bg-stone-950 group-hover:text-amber-400">
                    Dev
                  </span>
                </button>
              )}

              <div className="text-right flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-medium">Selamat Datang,</span>
                  {renderTierBadge()}
                </div>
                <p className="text-sm font-bold text-stone-100 font-mono leading-tight max-w-[160px] truncate">
                  {displayName}
                </p>
              </div>

              <button
                id="btn-nav-logout"
                type="button"
                onClick={onLogout}
                className="p-2.5 rounded-xl text-stone-400 hover:text-red-400 hover:bg-stone-800 border border-stone-800 transition shrink-0"
                title="Keluar / Ganti Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile & Tablet Compact Controls (< lg) */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              {isSimulating && onExitSimulation && (
                <button
                  id="btn-nav-exit-simulation-mobile"
                  type="button"
                  onClick={onExitSimulation}
                  className="min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition active:scale-95"
                  title="Kembali ke akun Developer utama"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dev</span>
                </button>
              )}

              {onGoHome && activeModuleId !== 0 && (
                <button
                  id="btn-nav-home-mobile"
                  type="button"
                  onClick={onGoHome}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1 px-2.5 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-700 transition active:scale-95"
                  title="Menu Utama"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              )}

              <button
                id="btn-nav-mobile-drawer"
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-xs font-bold text-amber-300 bg-stone-800/90 hover:bg-stone-700 border border-stone-700 transition active:scale-95"
                title="Buka Menu Navigasi & Pengaturan"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[86vw] max-w-sm h-full bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <BkwaLogo size="sm" variant="card" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-stone-100 font-mono truncate">{displayName}</p>
                    {renderTierBadge()}
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-stone-800 text-stone-300 hover:text-white border border-stone-700"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Quick Home & Utilities */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block px-1">
                  Navigasi & Sinkronisasi
                </span>

                {onGoHome && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGoHome();
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
                      activeModuleId === 0
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Home className="w-4 h-4 text-amber-400" />
                      <span>Menu Utama Aplikasi</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-500" />
                  </button>
                )}

                {onOpenCloudSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCloudSync();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-sky-300 bg-sky-950/60 border border-sky-700/60 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Cloud className="w-4 h-4 text-sky-400" />
                      <span>Cloud DB (Realtime)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-stone-950">
                      Live
                    </span>
                  </button>
                )}

                {onOpenGoogleSheetsSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenGoogleSheetsSync();
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
                      hasSpreadsheet
                        ? 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60'
                        : 'text-amber-300 bg-amber-950/60 border-amber-700/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{hasSpreadsheet ? 'Google Sheets Terhubung' : 'Hubungkan Google Sheets'}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                )}

                {isAdmin && onOpenAccessControl && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAccessControl();
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/50 border border-amber-600/60 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Hak Akses User (Dev)</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </button>
                )}
              </div>

              {/* 8 Modules Switcher */}
              {modules.length > 0 && onSelectModule && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block px-1">
                    Pindah Modul Cepat (1 - 8)
                  </span>
                  <div className="space-y-1.5">
                    {modules.map((m) => {
                      const isDev = isDeveloper(currentUser);
                      const isAccessible = isDev || canUserViewModule(currentUser, m.id);
                      const isActive = activeModuleId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!isAccessible}
                          onClick={() => {
                            if (!isAccessible) return;
                            setMobileMenuOpen(false);
                            onSelectModule(m.id);
                          }}
                          className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs border transition ${
                            !isAccessible
                              ? 'opacity-45 cursor-not-allowed bg-stone-950/60 border-stone-800 text-stone-500'
                              : isActive
                              ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                              : 'bg-stone-950/70 border-stone-800 text-stone-200 hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isActive ? 'text-stone-950' : 'text-amber-400'}>
                              {getModuleIcon(m.id)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-mono font-bold truncate">
                                M{m.id}: {m.name}
                              </div>
                            </div>
                          </div>
                          {!isAccessible ? (
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-stone-950' : 'text-stone-500'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/70 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar / Ganti Akun</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
