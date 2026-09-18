import React from 'react';
import { UserAccount } from '../types';
import { BkwaLogo } from './BkwaLogo';
import { Home, LogOut, MapPin, ShieldCheck, Eye, Edit3, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onGoHome?: () => void;
  onOpenAccessControl?: () => void;
  isSimulating?: boolean;
  onExitSimulation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onGoHome,
  onOpenAccessControl,
  isSimulating,
  onExitSimulation,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const isViewer = !isAdmin && currentUser.accessLevel === 'HANYA_VIEW';

  // Greeting logic: Sapa "Developer" untuk mode Developer, atau sesuai nama untuk akun lainnya
  const displayName = isAdmin ? 'Developer' : (currentUser.fullName || currentUser.username);

  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-xl shadow-stone-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand & Clean Header: Logo + "Maintenance Management System" + PT Batu Kaliwelang Ampuh + Quarry Purwosari */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onGoHome}
              title="Kembali ke Menu Utama"
              className="text-left focus:outline-none group"
            >
              <BkwaLogo size="md" variant="card" />
            </button>
            <div className="flex flex-col">
              <h1 className="font-extrabold tracking-tight text-stone-100 text-base sm:text-lg font-mono">
                Maintenance Management System
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-500">
                  PT Batu Kaliwelang Ampuh
                </span>
                <span className="text-stone-600 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                  <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                  Quarry Purwosari
                </span>
              </div>
            </div>
          </div>

          {/* User Controls, Tombol Hak Akses Developer, Home/Menu Utama & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tombol Simulasi: Kembali ke Akun Developer */}
            {isSimulating && onExitSimulation && (
              <button
                id="btn-nav-exit-simulation"
                type="button"
                onClick={onExitSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md transition active:scale-95 animate-pulse"
                title="Kembali ke akun Developer utama"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Kembali ke Akun Developer</span>
                <span className="md:hidden">Kembali</span>
              </button>
            )}

            {/* Tombol Home / Menu Utama */}
            {onGoHome && (
              <button
                id="btn-nav-home"
                type="button"
                onClick={onGoHome}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 border border-stone-700 transition active:scale-95 shadow-md"
                title="Kembali ke Menu Home / Menu Utama"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Menu Utama</span>
              </button>
            )}

            {/* KHUSUS AKUN DEVELOPER: MENU TAMBAHAN PENGATURAN HAK AKSES USER */}
            {isAdmin && onOpenAccessControl && (
              <button
                id="btn-nav-access-control"
                type="button"
                onClick={onOpenAccessControl}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-500 hover:text-stone-950 border border-amber-600/70 transition active:scale-95 shadow-lg shadow-amber-950/50 group"
                title="Menu Pengaturan Hak Akses: Atur Siapa Saja yang Bisa Mengisi & Siapa yang Hanya View"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:text-stone-950" />
                <span className="hidden md:inline">Hak Akses User</span>
                <span className="md:hidden">Akses</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 group-hover:bg-stone-950 group-hover:text-amber-400">
                  Dev
                </span>
              </button>
            )}

            {/* Profile Info & Access Badge */}
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
                  Selamat Datang,
                </span>
                {/* Badge Hak Akses */}
                {isAdmin ? (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Developer
                  </span>
                ) : isViewer ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    <Eye className="w-2.5 h-2.5" />
                    Hanya View
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <Edit3 className="w-2.5 h-2.5" />
                    Bisa Mengisi
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-stone-100 font-mono leading-tight">
                {displayName}
              </p>
            </div>

            {/* Logout Button */}
            <button
              id="btn-nav-logout"
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-xl text-stone-400 hover:text-red-400 hover:bg-stone-800 border border-stone-800 transition"
              title="Keluar / Ganti Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
