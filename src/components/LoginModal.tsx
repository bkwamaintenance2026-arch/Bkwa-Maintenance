import React, { useState } from 'react';
import { UserAccount, AccountTier } from '../types';
import { BkwaLogo } from './BkwaLogo';
import { getAllUsers, setCurrentUser } from '../utils/storage';
import crusherBg from '../assets/images/quarry_crusher_bg_1789456202821.jpg';
import { 
  KeyRound, 
  Mail, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Award,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Helper Preset untuk testing cepat di HP karyawan
  const handleSelectPreset = (email: string, pass: string) => {
    setEmailOrUsername(email);
    setPassword(pass);
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanInput || !cleanPassword) {
      setError('Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    const users = getAllUsers();

    // 1. Cek Developer Account (Full access)
    if (
      (cleanInput === 'developer@bkwa.co.id' ||
        cleanInput === 'adminbkwa09@bkwa.co.id' ||
        cleanInput === 'adminbkwa09' ||
        cleanInput === 'developer' ||
        cleanInput === 'bkwa.maintenance2026@gmail.com') &&
      cleanPassword === 'bkwa09'
    ) {
      const devUser = users.find((u) => u.accountTier === 'DEVELOPER' || u.username === 'adminbkwa09');
      if (devUser) {
        devUser.lastLogin = new Date().toISOString();
        setCurrentUser(devUser);
        onLoginSuccess(devUser);
        return;
      }
    }

    // 2. Cek Berdasarkan Email atau Username
    const matched = users.find((u) => {
      const emailMatch = u.email && u.email.toLowerCase().trim() === cleanInput;
      const userMatch = u.username && u.username.toLowerCase().trim() === cleanInput;
      return (emailMatch || userMatch) && u.password === cleanPassword;
    });

    if (!matched) {
      setError('Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      return;
    }

    if (matched.status === 'NONAKTIF') {
      setError('Akun Anda dinonaktifkan. Silakan hubungi Developer.');
      return;
    }

    matched.lastLogin = new Date().toISOString();
    setCurrentUser(matched);
    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background Crusher Quarry Batu Pecah PT BKWA */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 filter blur-[2px] transition-transform duration-1000"
        style={{
          backgroundImage: `url(${crusherBg})`,
        }}
      />
      {/* Dark & Earth Tone Ambient Overlay to Ensure Premium Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-stone-900/80" />
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[1px]" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-lg bg-stone-900/95 border border-stone-700/90 rounded-3xl shadow-2xl shadow-stone-950/95 overflow-hidden backdrop-blur-xl my-4">
        {/* Dominant Company Logo Section */}
        <div className="pt-6 sm:pt-8 pb-5 px-5 sm:px-6 flex flex-col items-center text-center border-b border-stone-800/80 bg-stone-900/80">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2.5 bg-gradient-to-r from-amber-600/40 via-amber-500/30 to-amber-700/40 rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition duration-500" />
            <BkwaLogo size="dominant" variant="card" className="relative shadow-2xl" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Smartphone className="w-3 h-3 text-amber-400" />
                Login Email Mobile Karyawan
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide mt-1">
              PT BATU KALI WELANG AMPUH
            </h1>
            <p className="text-xs text-stone-300 mt-1 max-w-sm mx-auto font-medium">
              Maintenance Fleet, Manpower, Inventory & P2H Alat Berat Quarry Purwosari
            </p>
          </div>
        </div>

        {/* Clean Form Section */}
        <div className="p-5 sm:p-7">
          {/* Quick Account Selector for Mobile Device Ease */}
          <div className="mb-5 bg-stone-950/80 p-3 rounded-2xl border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Pilih Akun Cepat (4 Hak Akses):
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset('developer@bkwa.co.id', 'bkwa09')}
                className="px-2 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 text-[11px] font-bold text-left transition flex flex-col"
              >
                <span className="flex items-center gap-1 text-[10px] text-purple-400">
                  <ShieldCheck className="w-3 h-3" /> Developer
                </span>
                <span className="truncate text-stone-200">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('admin@bkwa.co.id', 'user123')}
                className="px-2 py-1.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-700/50 text-blue-300 text-[11px] font-bold text-left transition flex flex-col"
              >
                <span className="flex items-center gap-1 text-[10px] text-blue-400">
                  <Award className="w-3 h-3" /> Admin
                </span>
                <span className="truncate text-stone-200">Input/Export 3,4,5</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('khusus@bkwa.co.id', 'user123')}
                className="px-2 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold text-left transition flex flex-col"
              >
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <UserCheck className="w-3 h-3" /> Khusus
                </span>
                <span className="truncate text-stone-200">Export 1,2,3,4,5</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('operator@bkwa.co.id', 'user123')}
                className="px-2 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/50 text-amber-300 text-[11px] font-bold text-left transition flex flex-col"
              >
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <UserCheck className="w-3 h-3" /> Member
                </span>
                <span className="truncate text-stone-200">Viewer 3 & Form P2H</span>
              </button>
            </div>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email Karyawan di HP / Username</span>
              </label>
              <input
                id="input-login-email"
                type="text"
                required
                autoComplete="email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Contoh: operator@bkwa.co.id atau admin@bkwa.co.id"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Kata Sandi (Password)</span>
              </label>
              <input
                id="input-login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/25 active:scale-[0.99]"
            >
              <span>Masuk Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Clean Footer Bar */}
        <div className="px-6 py-3.5 bg-stone-950/85 border-t border-stone-800/80 text-center text-[10px] text-stone-400 flex items-center justify-center gap-2 font-mono">
          <span>PT Batu Kali Welang Ampuh</span>
          <span>•</span>
          <span className="text-amber-500 font-semibold">Crusher & Quarry Fleet System</span>
        </div>
      </div>
    </div>
  );
};

