import React, { useState } from 'react';
import { UserAccount, UserAccessLevel, UserModulePermissions } from '../../types';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Eye, 
  Edit3, 
  HardHat, 
  Lock, 
  Unlock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  KeyRound,
  RefreshCw,
  UserCheck,
  Building2,
  Phone,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  registerKaryawanUser, 
  updateUserAccount, 
  updateUserAccessLevel, 
  deleteUserAccount,
  setCurrentUser 
} from '../../utils/storage';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onRefreshUsers: () => void;
  onSwitchUser?: (user: UserAccount) => void;
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onRefreshUsers,
  onSwitchUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BISA_MENGISI' | 'HANYA_VIEW'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // New user form state
  const [newUserData, setNewUserData] = useState({
    username: '',
    fullName: '',
    password: '',
    department: 'Mekanik Lapangan',
    phone: '',
    accessLevel: 'BISA_MENGISI' as UserAccessLevel,
    modulePermissions: {
      modul1Asset: true,
      modul2Manpower: true,
      modul3Maintenance: true,
      modul4Inventory: true,
    } as UserModulePermissions,
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Hanya Developer (Role ADMIN) yang berhak mengakses menu ini
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm">
        <div className="p-6 bg-stone-900 border border-stone-700 rounded-2xl max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-stone-100 font-mono">Akses Khusus Developer</h3>
          <p className="text-xs text-stone-400">
            Hanya akun Developer yang memiliki wewenang untuk mengatur hak akses pengisian dan pembacaan pengguna.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-semibold text-stone-200 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Statistik Otorisasi
  const totalUsers = users.length;
  const countBisaMengisi = users.filter((u) => u.role === 'ADMIN' || u.accessLevel === 'BISA_MENGISI').length;
  const countHanyaView = users.filter((u) => u.role !== 'ADMIN' && u.accessLevel === 'HANYA_VIEW').length;

  // Filter list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'BISA_MENGISI') {
      return u.role === 'ADMIN' || u.accessLevel === 'BISA_MENGISI';
    }
    if (filterType === 'HANYA_VIEW') {
      return u.role !== 'ADMIN' && u.accessLevel === 'HANYA_VIEW';
    }
    return true;
  });

  // Handler Ubah Level Global Akses (Bisa Mengisi vs Hanya View)
  const handleToggleAccessLevel = (targetUser: UserAccount, newLevel: UserAccessLevel) => {
    if (targetUser.role === 'ADMIN') {
      setFeedback({ type: 'error', text: 'Hak akses Akun Developer selalu Full Access (Bisa Mengisi).' });
      return;
    }

    const newModulePerms: UserModulePermissions = {
      modul1Asset: newLevel === 'BISA_MENGISI',
      modul2Manpower: newLevel === 'BISA_MENGISI',
      modul3Maintenance: newLevel === 'BISA_MENGISI',
      modul4Inventory: newLevel === 'BISA_MENGISI',
    };

    const res = updateUserAccessLevel(targetUser.id, newLevel, newModulePerms);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      onRefreshUsers();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Handler Ubah Izin Spesifik Per-Modul
  const handleToggleModulePerm = (
    targetUser: UserAccount, 
    moduleKey: keyof UserModulePermissions
  ) => {
    if (targetUser.role === 'ADMIN') return;

    const currentPerms = targetUser.modulePermissions || {
      modul1Asset: targetUser.accessLevel === 'BISA_MENGISI',
      modul2Manpower: targetUser.accessLevel === 'BISA_MENGISI',
      modul3Maintenance: targetUser.accessLevel === 'BISA_MENGISI',
      modul4Inventory: targetUser.accessLevel === 'BISA_MENGISI',
    };

    const updatedPerms: UserModulePermissions = {
      ...currentPerms,
      [moduleKey]: !currentPerms[moduleKey],
    };

    // If at least one is true, user is BISA_MENGISI, otherwise HANYA_VIEW
    const anyTrue = Object.values(updatedPerms).some(Boolean);
    const newGlobalLevel: UserAccessLevel = anyTrue ? 'BISA_MENGISI' : 'HANYA_VIEW';

    const res = updateUserAccessLevel(targetUser.id, newGlobalLevel, updatedPerms);
    if (res.success) {
      setFeedback({ 
        type: 'success', 
        text: `Izin modul untuk ${targetUser.fullName} diperbarui.` 
      });
      onRefreshUsers();
    }
  };

  // Handler Toggle Status Aktif / Nonaktif
  const handleToggleStatus = (targetUser: UserAccount) => {
    if (targetUser.role === 'ADMIN') return;
    const nextStatus = targetUser.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    updateUserAccount(targetUser.id, { status: nextStatus });
    setFeedback({ 
      type: 'success', 
      text: `Status akun ${targetUser.fullName} diubah menjadi ${nextStatus}.` 
    });
    onRefreshUsers();
  };

  // Handler Hapus User
  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus akun pengguna: ${name}?`)) {
      const res = deleteUserAccount(id);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        onRefreshUsers();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
  };

  // Handler Register Karyawan Baru
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username.trim() || !newUserData.fullName.trim() || !newUserData.password.trim()) {
      setFeedback({ type: 'error', text: 'Nama lengkap, username, dan password wajib diisi!' });
      return;
    }

    const res = registerKaryawanUser({
      username: newUserData.username.trim().toLowerCase(),
      fullName: newUserData.fullName.trim(),
      password: newUserData.password.trim(),
      role: 'KARYAWAN',
      department: newUserData.department,
      phone: newUserData.phone.trim() || '-',
      status: 'AKTIF',
      accessLevel: newUserData.accessLevel,
      modulePermissions: newUserData.modulePermissions,
    });

    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setNewUserData({
        username: '',
        fullName: '',
        password: '',
        department: 'Mekanik Lapangan',
        phone: '',
        accessLevel: 'BISA_MENGISI',
        modulePermissions: {
          modul1Asset: true,
          modul2Manpower: true,
          modul3Maintenance: true,
          modul4Inventory: true,
        },
      });
      setShowAddForm(false);
      onRefreshUsers();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-700 rounded-3xl shadow-2xl shadow-stone-950/95 my-6 overflow-hidden text-stone-100 flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 bg-stone-900/95 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-100 font-mono tracking-wide">
                  PENGATURAN OTORISASI & HAK AKSES USER
                </h3>
                <span className="hidden sm:inline-flex text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                  Developer Mode
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Atur secara instan siapa saja yang dapat <strong className="text-emerald-400 font-semibold">Mengisi (Input/Edit)</strong> dan siapa yang <strong className="text-sky-400 font-semibold">Hanya View (Lihat Saja)</strong>.
              </p>
            </div>
          </div>
          <button
            id="btn-close-access-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK NOTIFICATION */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/70 border-rose-700 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STATISTIK RINGKASAN */}
        <div className="p-6 pb-2 space-y-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Akun */}
            <div className="p-3.5 bg-stone-950/60 border border-stone-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase text-stone-400">Total Akun</p>
                <p className="text-xl font-bold font-mono text-stone-100">{totalUsers} Pengguna</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-stone-300">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Bisa Mengisi */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase text-emerald-400">Bisa Mengisi (Editor)</p>
                <p className="text-xl font-bold font-mono text-emerald-300">{countBisaMengisi} Pengguna</p>
                <p className="text-[10px] text-emerald-500/90">Akses Input, Edit & Simpan</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                <Edit3 className="w-4 h-4" />
              </div>
            </div>

            {/* Hanya View */}
            <div className="p-3.5 bg-sky-950/20 border border-sky-800/40 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase text-sky-400">Hanya View (Viewer)</p>
                <p className="text-xl font-bold font-mono text-sky-300">{countHanyaView} Pengguna</p>
                <p className="text-[10px] text-sky-500/90">Hanya Membaca / Monitoring</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-900/40 border border-sky-700/50 flex items-center justify-center text-sky-400">
                <Eye className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* FILTER & TOMBOL TAMBAH PENGGUNA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Cari user berdasarkan nama / username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center bg-stone-950/80 p-1 border border-stone-800 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterType === 'ALL' ? 'bg-stone-800 text-stone-100 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Semua ({totalUsers})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('BISA_MENGISI')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterType === 'BISA_MENGISI' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-stone-400 hover:text-emerald-400'
                  }`}
                >
                  Bisa Mengisi ({countBisaMengisi})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('HANYA_VIEW')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    filterType === 'HANYA_VIEW' ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800' : 'text-stone-400 hover:text-sky-400'
                  }`}
                >
                  Hanya View ({countHanyaView})
                </button>
              </div>
            </div>

            <button
              id="btn-tambah-user-baru"
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Tutup Pendaftaran' : '+ Daftarkan Akun Baru'}</span>
            </button>
          </div>

          {/* FORM PENDAFTARAN PENGGUNA BARU DENGAN PILIHAN AKSES LANGSUNG */}
          {showAddForm && (
            <form
              onSubmit={handleCreateNewUser}
              className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-3 mt-2 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Akun Pengguna Baru & Atur Hak Aksesnya</span>
                </h4>
                <span className="text-[11px] text-stone-400">Otorisasi oleh Developer</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Nama Lengkap <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Wahyu Hidayat"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Username Login <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: wahyu_bkwa"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Password <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: pass123"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Departemen / Bagian
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Workshop Quarry"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* PILIHAN OTORISASI AWAL LANGSUNG DI FORM */}
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Tingkat Akses Pengguna <span className="text-amber-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserData({
                        ...newUserData,
                        accessLevel: 'BISA_MENGISI',
                        modulePermissions: {
                          modul1Asset: true,
                          modul2Manpower: true,
                          modul3Maintenance: true,
                          modul4Inventory: true,
                        }
                      })}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 ${
                        newUserData.accessLevel === 'BISA_MENGISI'
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-300 shadow-sm'
                          : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bisa Mengisi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewUserData({
                        ...newUserData,
                        accessLevel: 'HANYA_VIEW',
                        modulePermissions: {
                          modul1Asset: false,
                          modul2Manpower: false,
                          modul3Maintenance: false,
                          modul4Inventory: false,
                        }
                      })}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 ${
                        newUserData.accessLevel === 'HANYA_VIEW'
                          ? 'bg-sky-950 border-sky-600 text-sky-300 shadow-sm'
                          : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hanya View</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 rounded-xl text-xs text-stone-400 hover:bg-stone-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow"
                >
                  Simpan Akun Baru
                </button>
              </div>
            </form>
          )}
        </div>

        {/* DAFTAR PENGGUNA & KONTROL HAK AKSES */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Daftar Pengguna & Status Otorisasi ({filteredUsers.length})</span>
            <span className="text-stone-500 text-[10px]">Klik tombol akses untuk mengubah izin secara instan</span>
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const isAdmin = user.role === 'ADMIN';
              const isCurrentUser = currentUser.id === user.id;
              const isEditor = isAdmin || user.accessLevel === 'BISA_MENGISI';
              const isViewer = !isAdmin && user.accessLevel === 'HANYA_VIEW';
              const isExpanded = expandedUserId === user.id;

              const perms = user.modulePermissions || {
                modul1Asset: isEditor,
                modul2Manpower: isEditor,
                modul3Maintenance: isEditor,
                modul4Inventory: isEditor,
              };

              return (
                <div
                  key={user.id}
                  className={`border rounded-2xl transition duration-200 overflow-hidden ${
                    isAdmin
                      ? 'bg-amber-950/15 border-amber-800/40'
                      : isViewer
                      ? 'bg-stone-900/90 border-sky-900/30'
                      : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* MAIN USER ROW */}
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User Profile */}
                    <div className="flex items-center gap-3.5 min-w-[240px]">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : isViewer
                            ? 'bg-sky-950 text-sky-400 border-sky-800/60'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                        }`}
                      >
                        {isAdmin ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : isViewer ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <HardHat className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-100 text-sm font-mono">
                            {user.fullName}
                          </h4>
                          {isAdmin && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              Developer
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">
                              (Anda)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                          <span className="font-mono text-stone-400 font-semibold">@{user.username}</span>
                          <span>•</span>
                          <span className="truncate max-w-[180px]">{user.department || 'Operasional'}</span>
                          {user.phone && user.phone !== '-' && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-stone-500">{user.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* KONTROL HAK AKSES: BISA MENGISI vs HANYA VIEW */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAdmin ? (
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Otoritas Penuh (Full Access)</span>
                        </div>
                      ) : (
                        <div className="flex items-center bg-stone-950 p-1 border border-stone-800 rounded-xl">
                          {/* Tombol Opsi: BISA MENGISI */}
                          <button
                            id={`btn-perm-fill-${user.username}`}
                            type="button"
                            onClick={() => handleToggleAccessLevel(user, 'BISA_MENGISI')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isEditor
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                                : 'text-stone-400 hover:text-emerald-400 hover:bg-stone-900'
                            }`}
                            title="Berikan izin mengisi form, mengedit data, dan menghapus di semua modul"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Bisa Mengisi</span>
                          </button>

                          {/* Tombol Opsi: HANYA VIEW */}
                          <button
                            id={`btn-perm-view-${user.username}`}
                            type="button"
                            onClick={() => handleToggleAccessLevel(user, 'HANYA_VIEW')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isViewer
                                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                                : 'text-stone-400 hover:text-sky-400 hover:bg-stone-900'
                            }`}
                            title="Batasi akun ini hanya dapat membaca dan memantau (View Only)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Hanya View</span>
                          </button>
                        </div>
                      )}

                      {/* Detail Otorisasi Per-Modul Toggle */}
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition ${
                            isExpanded
                              ? 'bg-stone-800 text-amber-400 border-stone-700'
                              : 'bg-stone-950/60 text-stone-400 hover:text-stone-200 border-stone-800'
                          }`}
                          title="Lihat / Atur Izin Per Modul"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Izin Modul</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Simulasi Login Akun Ini (Fitur Khusus Developer) */}
                      {onSwitchUser && !isAdmin && (
                        <button
                          type="button"
                          onClick={() => onSwitchUser(user)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 hover:text-white border border-stone-700 transition"
                          title={`Uji coba tampilan aplikasi sebagai ${user.fullName} (${user.accessLevel})`}
                        >
                          <RefreshCw className="w-3 h-3 text-amber-400 inline mr-1" />
                          <span className="text-[11px]">Uji Akun Ini</span>
                        </button>
                      )}

                      {/* Toggle Status Aktif / Nonaktif */}
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                            user.status === 'AKTIF'
                              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/50'
                              : 'text-stone-500 bg-stone-950 border-stone-800 hover:text-stone-300'
                          }`}
                          title={user.status === 'AKTIF' ? 'Klik untuk nonaktifkan akun' : 'Klik untuk aktifkan akun'}
                        >
                          {user.status}
                        </button>
                      )}

                      {/* Hapus Akun */}
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.fullName)}
                          className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition"
                          title="Hapus akun pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED VIEW: RINCIAN IZIN MODUL 1, 2, 3, 4 */}
                  {isExpanded && !isAdmin && (
                    <div className="px-4 py-3 bg-stone-950/90 border-t border-stone-800/80 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] text-stone-400 uppercase font-semibold">
                          Otorisasi Spesifik per Modul untuk {user.fullName}:
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Status Password: <span className="font-mono text-stone-300 font-bold">{user.password}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Modul 1: Asset */}
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-200 text-[11px]">Modul 1: Asset</p>
                            <p className="text-[10px] text-stone-400">Registrasi Unit</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePerm(user, 'modul1Asset')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              perms.modul1Asset
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-sky-950 text-sky-400 border border-sky-800'
                            }`}
                          >
                            {perms.modul1Asset ? 'Bisa Mengisi' : 'Hanya View'}
                          </button>
                        </div>

                        {/* Modul 2: Manpower */}
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-200 text-[11px]">Modul 2: Manpower</p>
                            <p className="text-[10px] text-stone-400">Tenaga Kerja</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePerm(user, 'modul2Manpower')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              perms.modul2Manpower
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-sky-950 text-sky-400 border border-sky-800'
                            }`}
                          >
                            {perms.modul2Manpower ? 'Bisa Mengisi' : 'Hanya View'}
                          </button>
                        </div>

                        {/* Modul 3: Maintenance */}
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-200 text-[11px]">Modul 3: Maintenance</p>
                            <p className="text-[10px] text-stone-400">Input Breakdown</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePerm(user, 'modul3Maintenance')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              perms.modul3Maintenance
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-sky-950 text-sky-400 border border-sky-800'
                            }`}
                          >
                            {perms.modul3Maintenance ? 'Bisa Mengisi' : 'Hanya View'}
                          </button>
                        </div>

                        {/* Modul 4: Inventory */}
                        <div className="p-2 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-200 text-[11px]">Modul 4: Inventory</p>
                            <p className="text-[10px] text-stone-400">FOG & Suplier</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePerm(user, 'modul4Inventory')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              perms.modul4Inventory
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : 'bg-sky-950 text-sky-400 border border-sky-800'
                            }`}
                          >
                            {perms.modul4Inventory ? 'Bisa Mengisi' : 'Hanya View'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/95 shrink-0 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Perubahan hak akses disimpan otomatis ke sistem dan berlaku real-time.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-700 hover:text-white transition shadow"
          >
            Selesai & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
