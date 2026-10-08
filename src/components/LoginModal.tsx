import React, { useState } from 'react';
import { UserAccount } from '../types';
import { BkwaLogo } from './BkwaLogo';
import { getAllUsers, setCurrentUser } from '../utils/storage';
import crusherBg from '../assets/images/quarry_crusher_bg_1789456202821.jpg';
import { 
  KeyRound, 
  Mail, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanInput || !cleanPassword) {
      setError('Silakan masukkan Username / No WA dan Kata Sandi / NIK Anda.');
      return;
    }

    const users = getAllUsers();

    // 1. Cek Developer Account (Username "Admin BKWA", Password "Etika09")
    const isDevUserMatch =
      cleanInput === 'admin bkwa' ||
      cleanInput === 'adminbkwa' ||
      cleanInput === 'adminbkwa09' ||
      cleanInput === 'developer' ||
      cleanInput === 'developer@bkwa.co.id' ||
      cleanInput === 'bkwa.maintenance2026@gmail.com';
    const isDevPassMatch = cleanPassword === 'Etika09' || cleanPassword === 'bkwa09';

    if (isDevUserMatch && isDevPassMatch) {
      const devUser = users.find((u) => u.accountTier === 'DEVELOPER' || u.username === 'Admin BKWA') || users[0];
      devUser.lastLogin = new Date().toISOString();
      setCurrentUser(devUser);
      onLoginSuccess(devUser);
      return;
    }

    // 2. Cek Akun Karyawan (Username = No WA, Password = NIK) atau Email / Username
    const matched = users.find((u) => {
      const userMatch = u.username && u.username.toLowerCase().trim() === cleanInput;
      const emailMatch = u.email && u.email.toLowerCase().trim() === cleanInput;
      const phoneClean = (u.phone || '').replace(/[^0-9]/g, '');
      const inputClean = cleanInput.replace(/[^0-9]/g, '');
      const phoneMatch = phoneClean && inputClean && phoneClean === inputClean;
      return (userMatch || emailMatch || phoneMatch) && u.password === cleanPassword;
    });

    if (!matched) {
      setError('Username / No WA atau Kata Sandi / NIK tidak sesuai. Hubungi Akun Developer untuk mendaftarkan akun Anda di Modul 2.');
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
        <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center border-b border-stone-800/80 bg-stone-900/80">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-amber-700/30 rounded-3xl blur-md opacity-80" />
            <BkwaLogo size="dominant" variant="card" className="relative shadow-2xl" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide mt-1">
              PT BATU KALI WELANG AMPUH
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto font-medium">
              Maintenance Fleet, Manpower, Inventory & P2H Alat Berat Quarry Purwosari
            </p>
          </div>
        </div>

        {/* Clean Form Section */}
        <div className="p-6 sm:p-8">
          {/* Error Notification */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Username</span>
              </label>
              <input
                id="input-login-email"
                type="text"
                required
                autoComplete="username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Kata Sandi</span>
              </label>
              <input
                id="input-login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata Sandi"
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/25 active:scale-[0.99]"
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

