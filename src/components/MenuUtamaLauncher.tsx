import React from 'react';
import { UserAccount, AssetUnit, ManpowerData, BreakdownRecord, P2HRecord } from '../types';
import { canUserViewModule, canUserEditModule, canUserExportModule, canAccessRegistrationForm } from '../utils/storage';
import { BkwaLogo } from './BkwaLogo';
import { 
  Truck, 
  Users, 
  Wrench, 
  Fuel, 
  ClipboardCheck, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  CloudCheck, 
  FileSpreadsheet, 
  Award, 
  UserCheck, 
  AlertTriangle,
  Sparkles,
  BarChart3,
  Calendar,
  Boxes,
  Disc
} from 'lucide-react';

interface MenuUtamaLauncherProps {
  currentUser: UserAccount;
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  breakdowns: BreakdownRecord[];
  p2hRecords: P2HRecord[];
  onSelectModule: (moduleId: number) => void;
  onOpenSheetsSync: () => void;
  onOpenAccessControl: () => void;
  sheetsConnected: boolean;
}

export const MenuUtamaLauncher: React.FC<MenuUtamaLauncherProps> = ({
  currentUser,
  units,
  manpowerList,
  breakdowns,
  p2hRecords,
  onSelectModule,
  onOpenSheetsSync,
  onOpenAccessControl,
  sheetsConnected,
}) => {
  const tier = currentUser.accountTier || (currentUser.role === 'ADMIN' ? 'DEVELOPER' : 'MEMBER');

  // Hitung metrik singkat untuk dashboard overview
  const totalUnits = units.length;
  const activeBreakdowns = breakdowns.filter((b) => b.statusUnit === 'BREAKDOWN').length;
  const totalManpower = manpowerList.length;
  const totalP2H = p2hRecords.length;

  const modules = [
    {
      id: 1,
      code: 'MOD-01',
      title: 'Modul 1: Registrasi & Daftar Aset',
      subtitle: 'Inventaris Heavy Equipment & Stone Crusher Plant',
      desc: 'Pendaftaran unit baru (Khusus Akun Developer) dan Daftar Aset Unit quarry dengan filter serta export data.',
      icon: Truck,
      color: 'amber',
      accentBg: 'from-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      statLabel: `${totalUnits} Unit Terdaftar`,
      isViewable: canUserViewModule(currentUser, 1),
      canEdit: canUserEditModule(currentUser, 1),
      canExport: canUserExportModule(currentUser, 1),
      devOnlyForm: true,
    },
    {
      id: 2,
      code: 'MOD-02',
      title: 'Modul 2: Data Manpower',
      subtitle: 'Personil Workshop, Operator & Driver',
      desc: 'Database NIK, Nama, Jabatan, Kontak, Status Karyawan, & Masa Kerja. Dilengkapi sorting header & export.',
      icon: Users,
      color: 'blue',
      accentBg: 'from-blue-500/10 to-transparent',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      statLabel: `${totalManpower} Personil`,
      isViewable: canUserViewModule(currentUser, 2),
      canEdit: canUserEditModule(currentUser, 2),
      canExport: canUserExportModule(currentUser, 2),
      devOnlyForm: false,
    },
    {
      id: 3,
      code: 'MOD-03',
      title: 'Modul 3: Database Maintenance',
      subtitle: 'Input Breakdown, Update Progres, Analisis PA & Riwayat Part',
      desc: 'Pelaporan kerusakan unit, update progres, analisis PA, serta Sub Modul Riwayat Detail Breakdown & Spare Part yang pernah diganti.',
      icon: Wrench,
      color: 'rose',
      accentBg: 'from-rose-500/10 to-transparent',
      borderColor: 'border-rose-500/30',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      statLabel: activeBreakdowns > 0 ? `${activeBreakdowns} Unit Breakdown` : 'Semua Unit Normal',
      isViewable: canUserViewModule(currentUser, 3),
      canEdit: canUserEditModule(currentUser, 3),
      canExport: canUserExportModule(currentUser, 3),
      devOnlyForm: false,
    },
    {
      id: 4,
      code: 'MOD-04',
      title: 'Modul 4: FOG',
      subtitle: 'Logistik FOG (Fuel, Oil & Grease)',
      desc: 'Pengelolaan 6 sub modul logistik: Suplier, Stok Solar Tangki, Transfer Tangki-FT, Stok Oli, & Distribusi ke Unit.',
      icon: Fuel,
      color: 'emerald',
      accentBg: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      statLabel: '6 Sub Modul FOG',
      isViewable: canUserViewModule(currentUser, 4),
      canEdit: canUserEditModule(currentUser, 4),
      canExport: canUserExportModule(currentUser, 4),
      devOnlyForm: false,
    },
    {
      id: 5,
      code: 'MOD-05',
      title: 'Modul 5: Divisi Operation',
      subtitle: 'Form P2H Unit & Setting Fleet Operasional',
      desc: 'Sub Modul 1: Form P2H Unit harian pra-operasi. Sub Modul 2: Setting Fleet (Alokasi No Unit, Operator, Lokasi Kerja, Opsi Manual & Sinkronisasi P2H).',
      icon: ClipboardCheck,
      color: 'teal',
      accentBg: 'from-teal-500/10 to-transparent',
      borderColor: 'border-teal-500/30',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      statLabel: `${totalP2H} Laporan P2H Terisi`,
      isViewable: canUserViewModule(currentUser, 5),
      canEdit: canUserEditModule(currentUser, 5),
      canExport: canUserExportModule(currentUser, 5),
      devOnlyForm: false,
    },
    {
      id: 6,
      code: 'MOD-06',
      title: 'Modul 6: Inventory Management',
      subtitle: 'Manajemen Spare Part & Transaksi Suku Cadang',
      desc: 'Input Spare Part (Incoming Part, Stock PN, Qty & Satuan) dan Transaksi Spare Part (Reff Maintenance Order, Order Part, Potong Stok & Permintaan Barang).',
      icon: Boxes,
      color: 'purple',
      accentBg: 'from-purple-500/10 to-transparent',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      statLabel: 'Spare Part & Order Part',
      isViewable: canUserViewModule(currentUser, 6),
      canEdit: canUserEditModule(currentUser, 6),
      canExport: canUserExportModule(currentUser, 6),
      devOnlyForm: false,
    },
    {
      id: 7,
      code: 'MOD-07',
      title: 'Modul 7: Tyre Management System',
      subtitle: 'Registrasi & Utilisasi Ban Unit Quarry',
      desc: 'Sub Modul 1 Registrasi (Generate Kode ET09-xxxx, Merk, Ukuran, Expired). Sub Modul 2 Utilisasi (Install, Remove, Dashboard Monitoring & Persentase Keausan untuk Penggantian).',
      icon: Disc,
      color: 'emerald',
      accentBg: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      statLabel: 'Manajemen Ban Unit',
      isViewable: canUserViewModule(currentUser, 7),
      canEdit: canUserEditModule(currentUser, 7),
      canExport: canUserExportModule(currentUser, 7),
      devOnlyForm: false,
    },
  ];

  // Role Badge Renderer
  const renderRoleBadge = () => {
    switch (tier) {
      case 'DEVELOPER':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>AKUN DEVELOPER (FULL ACCESS)</span>
          </div>
        );
      case 'ADMIN':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>AKUN ADMIN (INPUT & EXPORT MODUL 3, 4, 5)</span>
          </div>
        );
      case 'KHUSUS':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AKUN KHUSUS (EXPORT MODUL 1, 2, 3, 4, 5)</span>
          </div>
        );
      case 'MEMBER':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>AKUN MEMBER (VIEWER MODUL 3 & INPUT FORM P2H)</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Header Profile & Role Overview Banner */}
      <div className="relative overflow-hidden bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="shrink-0 p-1 bg-stone-950 rounded-2xl border border-stone-800 shadow-xl">
              <BkwaLogo size="md" variant="card" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {renderRoleBadge()}
                <span className="text-[11px] font-mono text-stone-400 px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                  {currentUser.email}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide">
                MENU UTAMA APLIKASI
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl">
                Selamat datang, <span className="text-amber-400 font-bold">{currentUser.fullName}</span>. 
                Pilih modul di bawah untuk mulai mengelola unit, pemeriksaan harian P2H, atau memantau pemeliharaan quarry.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Google Sheets Sync Indicator */}
            <button
              id="btn-main-sheets-sync"
              type="button"
              onClick={onOpenSheetsSync}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                sheetsConnected
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-700/60 text-emerald-300'
                  : 'bg-stone-800/80 hover:bg-stone-700/80 border-stone-700 text-stone-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{sheetsConnected ? 'Google Sheets Terhubung' : 'Sinkronisasi Sheets'}</span>
            </button>

            {/* Developer Access Control Modal */}
            {tier === 'DEVELOPER' && (
              <button
                id="btn-main-access-control"
                type="button"
                onClick={onOpenAccessControl}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-950/60 hover:bg-purple-900/70 border border-purple-700/60 text-purple-300 transition"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Kelola Otorisasi Akun</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="mt-6 pt-6 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-950/60 border border-stone-800/70 rounded-2xl p-3">
            <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider block">Total Aset Unit</span>
            <span className="text-lg font-black text-amber-400 font-mono">{totalUnits}</span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Heavy Equipment & Plant</span>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/70 rounded-2xl p-3">
            <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider block">Manpower Personil</span>
            <span className="text-lg font-black text-blue-400 font-mono">{totalManpower}</span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Operator, Driver & Mekanik</span>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/70 rounded-2xl p-3">
            <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider block">Status Maintenance</span>
            <span className={`text-lg font-black font-mono ${activeBreakdowns > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {activeBreakdowns > 0 ? `${activeBreakdowns} Breakdown` : 'Semua Siap'}
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Physical Availability (PA)</span>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/70 rounded-2xl p-3">
            <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider block">Pemeriksaan P2H</span>
            <span className="text-lg font-black text-teal-400 font-mono">{totalP2H}</span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Laporan Harian Tersimpan</span>
          </div>
        </div>
      </div>

      {/* 2. Grid of 5 Modules - Clean & Structured */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-300">
              Daftar Modul Operasional PT BKWA
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            Klik kartu untuk membuka modul
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {modules.map((m) => {
            const Icon = m.icon;
            const isAccessible = m.isViewable;

            return (
              <div
                key={m.id}
                id={`card-module-${m.id}`}
                onClick={() => {
                  if (isAccessible) {
                    onSelectModule(m.id);
                  }
                }}
                className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  isAccessible
                    ? 'bg-stone-900/90 hover:bg-stone-850 border-stone-800 hover:border-stone-700 cursor-pointer shadow-xl hover:shadow-2xl hover:translate-y-[-2px]'
                    : 'bg-stone-950/60 border-stone-850 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Ambient Top Glow */}
                <div className={`absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${m.accentBg} pointer-events-none`} />

                <div className="p-5 sm:p-6 relative z-10">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
                        isAccessible ? m.borderColor + ' bg-stone-950' : 'border-stone-800 bg-stone-950'
                      }`}>
                        <Icon className={`w-5 h-5 ${isAccessible ? 'text-' + m.color + '-400' : 'text-stone-500'}`} />
                      </div>
                      <div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${m.badgeColor}`}>
                          {m.code}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400 block mt-0.5">
                          {m.statLabel}
                        </span>
                      </div>
                    </div>

                    {!isAccessible && (
                      <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
                        <Lock className="w-3 h-3 text-stone-400" />
                        <span>Terkunci</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base font-black text-stone-100 font-mono group-hover:text-amber-400 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs font-semibold text-stone-300 mt-0.5">
                    {m.subtitle}
                  </p>
                  <p className="text-xs text-stone-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                {/* Bottom Access Status & Action Bar */}
                <div className="px-5 sm:px-6 py-3.5 bg-stone-950/80 border-t border-stone-800/80 flex items-center justify-between text-xs font-mono relative z-10">
                  <div className="flex items-center gap-2 text-[11px]">
                    {isAccessible ? (
                      <>
                        <span className="text-stone-400">Hak Akses:</span>
                        {m.id === 1 && (
                          <span className={tier === 'DEVELOPER' ? 'text-amber-400 font-bold' : 'text-stone-300'}>
                            {tier === 'DEVELOPER' ? 'Form & Daftar' : (m.canExport ? 'Daftar & Export' : 'Lihat Saja')}
                          </span>
                        )}
                        {m.id === 2 && (
                          <span className={m.canExport ? 'text-blue-400 font-bold' : 'text-stone-300'}>
                            {m.canExport ? 'Viewer & Export' : 'Lihat Saja'}
                          </span>
                        )}
                        {m.id === 3 && (
                          <span className="text-rose-400 font-bold">
                            {tier === 'MEMBER' ? 'Viewer Saja' : (m.canEdit ? 'Input & Export' : 'Viewer & Export')}
                          </span>
                        )}
                        {m.id === 4 && (
                          <span className="text-emerald-400 font-bold">
                            {m.canEdit ? 'Input & Export' : 'Viewer & Export'}
                          </span>
                        )}
                        {m.id === 5 && (
                          <span className="text-teal-400 font-bold">
                            {m.canEdit ? 'Bisa Input Form P2H' : 'Monitoring & Export'}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-stone-400">Terkunci untuk Akun Member</span>
                    )}
                  </div>

                  {isAccessible ? (
                    <div className="flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="text-stone-400 text-[10px]">Perlu Otorisasi</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
