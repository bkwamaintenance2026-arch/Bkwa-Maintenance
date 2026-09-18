import React, { useState } from 'react';
import { UserAccount } from '../types';
import { BkwaLogo } from './BkwaLogo';
import { getAllUsers, setCurrentUser } from '../utils/storage';
import crusherBg from '../assets/images/quarry_crusher_bg_1789456202821.jpg';
import { 
  KeyRound, 
  User, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Silakan masukkan username dan kata sandi.');
      return;
    }

    // 1. Check Developer Account (Full access to all features)
    // Username: adminbkwa09, Password: bkwa09
    if (
      (cleanUsername === 'adminbkwa09' || cleanUsername === 'admin' || cleanUsername === 'developer') &&
      cleanPassword === 'bkwa09'
    ) {
      const users = getAllUsers();
      const adminUser: UserAccount =
        users.find((u) => u.role === 'ADMIN') || {
          id: 'usr-admin-01',
          username: 'adminbkwa09',
          fullName: 'Developer BKWA',
          role: 'ADMIN',
          password: 'bkwa09',
          department: 'System Developer & Maintenance Management',
          status: 'AKTIF',
          createdAt: new Date().toISOString(),
        };

      adminUser.username = 'adminbkwa09';
      setCurrentUser(adminUser);
      onLoginSuccess(adminUser);
      return;
    }

    // 2. Check Other Users (Karyawan registered via Admin)
    const users = getAllUsers();
    const matched = users.find(
      (u) =>
        u.username.toLowerCase().trim() === cleanUsername &&
        u.password === cleanPassword
    );

    if (!matched) {
      setError('Username atau kata sandi yang Anda masukkan tidak valid. Silakan periksa kembali.');
      return;
    }

    if (matched.status === 'NONAKTIF') {
      setError('Akun Anda saat ini sedang dinonaktifkan. Silakan hubungi Developer.');
      return;
    }

    setCurrentUser(matched);
    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Crusher Quarry Batu Pecah PT BKWA */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 filter blur-[2px] transition-transform duration-1000"
        style={{
          backgroundImage: `url(${crusherBg})`,
        }}
      />
      {/* Industrial Dark & Earth Tone Ambient Overlay to Ensure Premium Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-900/75" />
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[1px]" />

      {/* Main Login Card - Clean & Focused */}
      <div className="relative z-10 w-full max-w-md bg-stone-900/90 border border-stone-700/80 rounded-3xl shadow-2xl shadow-stone-950/95 overflow-hidden backdrop-blur-xl">
        {/* Dominant Company Logo Section */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center border-b border-stone-800/80 bg-stone-900/70">
          <div className="relative mb-3 group">
            {/* Subtle warm amber halo behind dominant logo */}
            <div className="absolute -inset-2.5 bg-gradient-to-r from-amber-600/40 via-amber-500/30 to-amber-700/40 rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition duration-500" />
            <BkwaLogo size="dominant" variant="card" className="relative shadow-2xl" />
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 inline-block shadow-sm">
              BKWA Maintenance Management System
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide mt-3">
              PT BATU KALI WELANG AMPUH
            </h1>
            <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto font-medium">
              Portal Pengelolaan Alat Berat & Stone Crusher Plant
            </p>
          </div>
        </div>

        {/* Clean Form Section */}
        <div className="p-6 sm:p-8">
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
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Username Akun</span>
              </label>
              <input
                id="input-login-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username akun"
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

            {/* Clean Submit Button without cluttered bottom captions */}
            <button
              id="btn-submit-login"
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/25 active:scale-[0.99]"
            >
              <span>Log In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Clean Footer Bar */}
        <div className="px-6 py-3.5 bg-stone-950/80 border-t border-stone-800/80 text-center text-[10px] text-stone-400 flex items-center justify-center gap-2 font-mono">
          <span>PT Batu Kali Welang Ampuh</span>
          <span>•</span>
          <span className="text-amber-500 font-semibold">Crusher & Quarry Fleet</span>
        </div>
      </div>
    </div>
  );
};
