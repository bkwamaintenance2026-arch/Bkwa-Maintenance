import React, { useState, useEffect } from 'react';
import { UserAccount, UserAccessLevel, UserModulePermissions, GranularUserPermissions } from '../../types';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Edit3, 
  HardHat, 
  Lock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  KeyRound, 
  Phone, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Save, 
  Sparkles,
  RefreshCw,
  UserX
} from 'lucide-react';
import { 
  updateUserPassword,
  updateUserAccount,
  deleteUserAccount,
  registerKaryawanUser,
  saveAccessControlSettings,
  getAllManpower
} from '../../utils/storage';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onRefreshUsers: () => void;
  onSwitchUser?: (user: UserAccount) => void;
  manpowerCount?: number;
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  isOpen,
  onClose,
  users: initialUsers,
  currentUser,
  onRefreshUsers,
  onSwitchUser,
}) => {
  // Local state of users for immediate batch editing
  const [usersList, setUsersList] = useState<UserAccount[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BISA_MENGISI' | 'HANYA_VIEW' | 'NONAKTIF'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Password visibility & edit states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Saving state & feedback
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Non-Karyawan Registration Form state
  const [newNonKaryawanData, setNewNonKaryawanData] = useState({
    username: '',
    fullName: '',
    password: 'user123',
    department: 'Manajemen Eksternal',
    phone: '',
    accessLevel: 'HANYA_VIEW' as UserAccessLevel,
  });

  // Sinkronisasi data awal jika prop berubah
  useEffect(() => {
    setUsersList(initialUsers);
  }, [initialUsers]);

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

  // Identifikasi personil manpower yang belum memiliki No HP
  const allManpower = getAllManpower();
  const manpowerWithoutPhone = allManpower.filter((m) => !(m.noWa && m.noWa.trim()));

  // Filter list pengguna
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterType === 'BISA_MENGISI') {
      return u.role === 'ADMIN' || u.accessLevel === 'BISA_MENGISI';
    }
    if (filterType === 'HANYA_VIEW') {
      return u.role !== 'ADMIN' && u.accessLevel === 'HANYA_VIEW';
    }
    if (filterType === 'NONAKTIF') {
      return u.status === 'NONAKTIF';
    }
    return true;
  });

  // Toggle visibilitas password
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const copyPassword = (userId: string, passwordText: string) => {
    navigator.clipboard.writeText(passwordText);
    setCopiedPasswordId(userId);
    setTimeout(() => setCopiedPasswordId(null), 2000);
  };

  // Ubah Level Akses Global (Bisa Mengisi vs Hanya View)
  const handleToggleAccessLevel = (targetId: string, newLevel: UserAccessLevel) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== targetId || u.role === 'ADMIN') return u;

        const isFill = newLevel === 'BISA_MENGISI';
        const updatedModulePerms: UserModulePermissions = {
          modul1Asset: isFill,
          modul2Manpower: isFill,
          modul3Maintenance: isFill,
          modul4Inventory: isFill,
          modul5P2H: isFill,
          modul6SparePart: isFill,
          modul7Tyre: isFill,
        };

        const updatedGranular: GranularUserPermissions = {
          modul1: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul2: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul3: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul4: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul5: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul6: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
          modul7: { viewer: true, input: isFill, edit: isFill, delete: false, export: isFill },
        };

        return {
          ...u,
          accessLevel: newLevel,
          modulePermissions: updatedModulePerms,
          permissions: updatedGranular,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Ubah Izin Spesifik Per-Modul (Modul 1 s/d Modul 7)
  const handleToggleModulePermission = (targetId: string, moduleNum: number, mode: 'VIEW' | 'EDIT' | 'LOCKED') => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== targetId || u.role === 'ADMIN') return u;

        const modKey = `modul${moduleNum}` as keyof GranularUserPermissions;
        const currentModPerm = u.permissions?.[modKey] || {
          viewer: true,
          input: false,
          edit: false,
          delete: false,
          export: false,
        };

        let newModPerm = { ...currentModPerm };
        if (mode === 'EDIT') {
          newModPerm = { viewer: true, input: true, edit: true, delete: false, export: true };
        } else if (mode === 'VIEW') {
          newModPerm = { viewer: true, input: false, edit: false, delete: false, export: false };
        } else {
          // LOCKED / HIDE
          newModPerm = { viewer: false, input: false, edit: false, delete: false, export: false };
        }

        const updatedPermissions: GranularUserPermissions = {
          ...(u.permissions || {}),
          [modKey]: newModPerm,
        };

        // Cek apakah ada setidaknya satu modul yang bisa diedit
        const anyEditable = Object.values(updatedPermissions).some((p) => p && (p.input || p.edit));
        const newAccessLevel: UserAccessLevel = anyEditable ? 'BISA_MENGISI' : 'HANYA_VIEW';

        return {
          ...u,
          accessLevel: newAccessLevel,
          permissions: updatedPermissions,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Toggle Status Pengguna (Aktif / Nonaktif)
  const handleToggleStatus = (targetId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== targetId || u.role === 'ADMIN') return u;
        return {
          ...u,
          status: u.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF',
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Simpan Password Baru
  const handleSaveNewPassword = (targetUser: UserAccount) => {
    if (!newPasswordInput.trim()) {
      setFeedback({ type: 'error', text: 'Password tidak boleh kosong!' });
      return;
    }

    const res = updateUserPassword(targetUser.id, newPasswordInput.trim());
    if (res.success) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, password: newPasswordInput.trim() } : u))
      );
      setFeedback({ type: 'success', text: `Password untuk ${targetUser.fullName} berhasil diperbarui!` });
      setEditingPasswordUserId(null);
      setNewPasswordInput('');
      onRefreshUsers();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Hapus Pengguna
  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus akun: ${name}?`)) {
      const res = deleteUserAccount(id);
      if (res.success) {
        setUsersList((prev) => prev.filter((u) => u.id !== id));
        setFeedback({ type: 'success', text: res.message });
        onRefreshUsers();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
  };

  // Pendaftaran Pengguna Non-Karyawan / Eksternal
  const handleCreateNonKaryawan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newNonKaryawanData.phone.replace(/[^0-9]/g, '');
    const cleanUsername = (cleanPhone || newNonKaryawanData.username.trim() || newNonKaryawanData.fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase();

    if (!cleanUsername || !newNonKaryawanData.fullName.trim() || !newNonKaryawanData.password.trim()) {
      setFeedback({ type: 'error', text: 'Nama lengkap, Username / No HP, dan Password wajib diisi!' });
      return;
    }

    const res = registerKaryawanUser({
      username: cleanUsername,
      fullName: newNonKaryawanData.fullName.trim(),
      password: newNonKaryawanData.password.trim(),
      role: 'KARYAWAN',
      department: newNonKaryawanData.department,
      phone: newNonKaryawanData.phone.trim() || cleanUsername,
      status: 'AKTIF',
      accessLevel: newNonKaryawanData.accessLevel,
      permissions: {
        modul1: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul2: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul3: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul4: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul5: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul6: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
        modul7: { viewer: true, input: newNonKaryawanData.accessLevel === 'BISA_MENGISI', edit: false, delete: false, export: false },
      },
    });

    if (res.success && res.user) {
      setUsersList((prev) => [res.user!, ...prev]);
      setFeedback({
        type: 'success',
        text: `Akun non-karyawan ${res.user.fullName} berhasil didaftarkan (Username: "${res.user.username}")!`,
      });
      setNewNonKaryawanData({
        username: '',
        fullName: '',
        password: 'user123',
        department: 'Manajemen Eksternal',
        phone: '',
        accessLevel: 'HANYA_VIEW',
      });
      setShowAddForm(false);
      onRefreshUsers();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // TOMBOL UTAMA: SIMPAN PENGATURAN HAK AKSES KE CLOUD FIRESTORE SECARA REALTIME
  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    setFeedback({ type: 'info', text: 'Menyimpan pengaturan hak akses ke database cloud Firestore secara realtime...' });

    const res = await saveAccessControlSettings(usersList);
    setIsSaving(false);

    if (res.success) {
      setHasUnsavedChanges(false);
      setFeedback({
        type: 'success',
        text: '✅ Pengaturan hak akses berhasil disimpan dan langsung aktif secara realtime!',
      });
      onRefreshUsers();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const moduleNames = [
    { num: 1, title: 'Modul 1: Asset', desc: 'Registrasi Unit Alat Berat' },
    { num: 2, title: 'Modul 2: Manpower', desc: 'Data Personil & Jabatan' },
    { num: 3, title: 'Modul 3: Maintenance', desc: 'Laporan Breakdown & WO' },
    { num: 4, title: 'Modul 4: FOG Logistik', desc: 'BBM, Oli, Grease & SPBU Luar' },
    { num: 5, title: 'Modul 5: Divisi Operation', desc: 'Pemeriksaan Harian Form P2H' },
    { num: 6, title: 'Modul 6: Spare Part', desc: 'Inventory Suku Cadang & PR' },
    { num: 7, title: 'Modul 7: Tyre System', desc: 'Manajemen Ban Alat Berat' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex justify-center items-start">
      <div className="relative w-full max-w-5xl bg-stone-900 border border-stone-700 rounded-3xl shadow-2xl shadow-stone-950/95 my-2 sm:my-4 text-stone-100 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-100 font-mono tracking-wide">
                  PENGATURAN OTORISASI &amp; HAK AKSES PENGGUNA
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                  Full Control Developer
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Otoritas penuh 1 akun Developer. Seluruh karyawan Viewer secara default, kontrol izin Modul 1 - Modul 7 per orang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Simpan Cepat di Header */}
            <button
              type="button"
              onClick={handleSaveAllSettings}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg active:scale-95 ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/30 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
              }`}
              title="Simpan pengaturan hak akses ke sistem & Cloud Firestore"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSaving ? 'Menyimpan...' : hasUnsavedChanges ? 'Simpan Perubahan' : 'Simpan Hak Akses'}
              </span>
            </button>

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
        </div>

        {/* FEEDBACK NOTIFICATION */}
        {feedback && (
          <div
            className={`mx-6 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                : 'bg-sky-950/80 border-sky-700 text-sky-300'
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

        {/* MODAL BODY (Spacious, clean, direct access list) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          
          {/* SEARCH & ACTION TOOLBAR (Clean, Wide & Flat) */}
          <div className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur-md py-2 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Cari nama, No HP, jabatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center bg-stone-950/80 p-1 border border-stone-800 rounded-xl text-[11px] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    filterType === 'ALL' ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Semua ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('BISA_MENGISI')}
                  className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    filterType === 'BISA_MENGISI' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-stone-400 hover:text-emerald-400'
                  }`}
                >
                  Bisa Mengisi ({usersList.filter((u) => u.role === 'ADMIN' || u.accessLevel === 'BISA_MENGISI').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('HANYA_VIEW')}
                  className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    filterType === 'HANYA_VIEW' ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'text-stone-400 hover:text-sky-400'
                  }`}
                >
                  Viewer ({usersList.filter((u) => u.role !== 'ADMIN' && u.accessLevel === 'HANYA_VIEW').length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-tambah-user-nonkaryawan"
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-200 bg-stone-800 hover:bg-stone-750 border border-stone-700 transition active:scale-95 whitespace-nowrap"
                title="Khusus mendaftarkan akun yang bukan karyawan (Manajemen eksternal, Tamu, Auditor)"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{showAddForm ? 'Tutup Form' : '+ Akun Non-Karyawan'}</span>
              </button>
            </div>
          </div>

          {/* FORM PENDAFTARAN KHUSUS NON-KARYAWAN / EKSTERNAL */}
          {showAddForm && (
            <form
              onSubmit={handleCreateNonKaryawan}
              className="p-4 bg-stone-950/90 border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn shadow-xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Akun Baru (Khusus Non-Karyawan / Manajemen Eksternal)</span>
                </h4>
                <span className="text-[10px] text-stone-400 font-mono">
                  Untuk personil internal workshop, gunakan Modul 2 Manpower dengan mengisi No HP.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Pak Hendra (Auditor)"
                    value={newNonKaryawanData.fullName}
                    onChange={(e) => setNewNonKaryawanData({ ...newNonKaryawanData, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">No HP (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="08xxxxxxxx"
                    value={newNonKaryawanData.phone}
                    onChange={(e) => setNewNonKaryawanData({ ...newNonKaryawanData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Password akun"
                    value={newNonKaryawanData.password}
                    onChange={(e) => setNewNonKaryawanData({ ...newNonKaryawanData, password: e.target.value })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Hak Akses Awal</label>
                  <select
                    value={newNonKaryawanData.accessLevel}
                    onChange={(e) => setNewNonKaryawanData({ ...newNonKaryawanData, accessLevel: e.target.value as UserAccessLevel })}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="HANYA_VIEW">Hanya View (Viewer)</option>
                    <option value="BISA_MENGISI">Bisa Mengisi (Editor)</option>
                  </select>
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
                  Simpan Akun Non-Karyawan
                </button>
              </div>
            </form>
          )}

          {/* DAFTAR PERSONIL MANPOWER TANPA NO HP (Pemberitahuan bahwa tidak memiliki akses) */}
          {manpowerWithoutPhone.length > 0 && (
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-stone-400">
                <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Terdapat <strong className="text-amber-400">{manpowerWithoutPhone.length} personil</strong> di Modul 2 yang belum memiliki No HP terdaftar (otomatis tidak memiliki akses login ke sistem).
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                Isi No HP di Modul 2 untuk memberikan akses login.
              </span>
            </div>
          )}

          {/* DAFTAR UTAMA PENGGUNA (CLEAN, WIDE & POWERFUL) */}
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const isDev = user.role === 'ADMIN';
              const isEditor = isDev || user.accessLevel === 'BISA_MENGISI';
              const isViewer = !isDev && user.accessLevel === 'HANYA_VIEW';
              const isExpanded = expandedUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`border rounded-2xl transition duration-200 overflow-hidden ${
                    isDev
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isEditor
                      ? 'bg-stone-900/90 border-emerald-900/40'
                      : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* BARIS UTAMA PENGGUNA */}
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Profil & Akun */}
                    <div className="flex items-start gap-3.5 min-w-[280px]">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md mt-0.5 ${
                          isDev
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : isEditor
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                            : 'bg-stone-950 text-sky-400 border-sky-900/60'
                        }`}
                      >
                        {isDev ? (
                          <ShieldCheck className="w-6 h-6" />
                        ) : isEditor ? (
                          <Edit3 className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-100 text-sm font-mono">
                            {user.fullName}
                          </h4>
                          {isDev ? (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                              Developer (Full Access)
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                user.accessLevel === 'BISA_MENGISI'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                  : 'bg-sky-950/80 text-sky-300 border-sky-800'
                              }`}
                            >
                              {user.accessLevel === 'BISA_MENGISI' ? 'Bisa Mengisi' : 'Hanya View (Viewer)'}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 font-mono">
                            {user.department || user.jabatan || 'Karyawan'}
                          </span>
                        </div>

                        {/* NO HP & USERNAME DISPLAY */}
                        <div className="flex items-center gap-2 text-xs text-stone-300 flex-wrap">
                          <span className="font-mono text-amber-300 font-bold bg-stone-950 px-2 py-0.5 rounded border border-stone-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-amber-400" />
                            <span>Username (No HP): @{user.username}</span>
                          </span>

                          {/* PASSWORD DISPLAY: DEVELOPER BISA MELIHAT PASSWORD TERBARU KAPAN SAJA */}
                          <div className="flex items-center gap-1.5 font-mono text-xs bg-stone-950 px-2.5 py-0.5 rounded border border-stone-800">
                            <KeyRound className="w-3 h-3 text-stone-400" />
                            <span className="text-stone-400 text-[11px]">Password:</span>
                            {visiblePasswords[user.id] ? (
                              <span className="text-amber-300 font-bold tracking-normal select-all">
                                {user.password || 'bkwa123'}
                              </span>
                            ) : (
                              <span className="text-stone-400 tracking-widest text-[11px]">••••••••</span>
                            )}

                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="p-1 text-stone-400 hover:text-stone-100 transition"
                              title={visiblePasswords[user.id] ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {visiblePasswords[user.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => copyPassword(user.id, user.password || 'bkwa123')}
                              className="p-1 text-stone-400 hover:text-amber-400 transition"
                              title="Salin password ke clipboard"
                            >
                              {copiedPasswordId === user.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Tombol Ubah Password oleh Developer */}
                          {editingPasswordUserId === user.id ? (
                            <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-amber-500">
                              <input
                                type="text"
                                placeholder="Password baru..."
                                value={newPasswordInput}
                                onChange={(e) => setNewPasswordInput(e.target.value)}
                                className="bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-xs text-stone-100 font-mono w-28 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveNewPassword(user)}
                                className="px-2 py-0.5 bg-amber-500 text-stone-950 font-bold text-[10px] rounded"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPasswordUserId(null)}
                                className="px-1.5 py-0.5 text-stone-400 text-[10px]"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasswordUserId(user.id);
                                setNewPasswordInput(user.password || '');
                              }}
                              className="text-[10px] text-amber-400 hover:underline"
                            >
                              Ganti Password
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* KONTROL GLOBAL & AKSI */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isDev ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Otoritas Penuh Mutlak</span>
                        </div>
                      ) : (
                        <div className="flex items-center bg-stone-950 p-1 border border-stone-800 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleToggleAccessLevel(user.id, 'HANYA_VIEW')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isViewer
                                ? 'bg-sky-600 text-white shadow-md'
                                : 'text-stone-400 hover:text-sky-400'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Hanya View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleAccessLevel(user.id, 'BISA_MENGISI')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isEditor
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-stone-400 hover:text-emerald-400'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Bisa Mengisi</span>
                          </button>
                        </div>
                      )}

                      {/* Tombol Buka Rincian Kontrol Modul 1 - 7 */}
                      {!isDev && (
                        <button
                          type="button"
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                            isExpanded
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                              : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                          }`}
                          title="Buka kontrol spesifik Modul 1 s/d Modul 7 untuk orang ini"
                        >
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Kontrol Modul 1 - 7</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Uji Akun Ini (Simulasi Developer) */}
                      {!isDev && onSwitchUser && (
                        <button
                          type="button"
                          onClick={() => onSwitchUser(user)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-stone-300 bg-stone-800 hover:bg-stone-750 border border-stone-700 transition"
                          title={`Uji coba tampilan aplikasi sebagai ${user.fullName}`}
                        >
                          <RefreshCw className="w-3 h-3 text-amber-400 inline mr-1" />
                          <span>Simulasi</span>
                        </button>
                      )}

                      {/* Status Aktif / Nonaktif */}
                      {!isDev && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                            user.status === 'AKTIF'
                              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                              : 'text-stone-500 bg-stone-950 border-stone-800'
                          }`}
                        >
                          {user.status}
                        </button>
                      )}

                      {/* Hapus Akun */}
                      {!isDev && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.fullName)}
                          className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition"
                          title="Hapus akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KONTROL RINCIAN MODUL 1 - 7 PER ORANG */}
                  {isExpanded && !isDev && (
                    <div className="px-5 py-4 bg-stone-950/95 border-t border-stone-800 space-y-3 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-800 gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>PENGATURAN AKSES MODUL 1 S/D 7 UNTUK {user.fullName.toUpperCase()}:</span>
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Klik status untuk beralih antara <strong className="text-sky-400">Hanya View</strong> dan <strong className="text-emerald-400">Bisa Mengisi</strong>.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {moduleNames.map((mod) => {
                          const modKey = `modul${mod.num}` as keyof GranularUserPermissions;
                          const perm = user.permissions?.[modKey] || {
                            viewer: true,
                            input: user.accessLevel === 'BISA_MENGISI',
                            edit: user.accessLevel === 'BISA_MENGISI',
                            delete: false,
                            export: user.accessLevel === 'BISA_MENGISI',
                          };

                          const isCanEdit = Boolean(perm.input || perm.edit);
                          const isLocked = !perm.viewer;

                          return (
                            <div
                              key={mod.num}
                              className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-2 ${
                                isLocked
                                  ? 'bg-stone-950/60 border-stone-850 opacity-60'
                                  : isCanEdit
                                  ? 'bg-emerald-950/20 border-emerald-800/50 shadow-sm'
                                  : 'bg-stone-900/90 border-stone-800'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-stone-200 font-mono">
                                    {mod.title}
                                  </span>
                                  {isLocked ? (
                                    <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.2 rounded font-mono">
                                      Terkunci
                                    </span>
                                  ) : isCanEdit ? (
                                    <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                                      Bisa Input/Edit
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.2 rounded font-bold">
                                      Hanya View
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                                  {mod.desc}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1 border-t border-stone-800/80">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePermission(user.id, mod.num, 'VIEW')}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                                    !isLocked && !isCanEdit
                                      ? 'bg-sky-600 text-white shadow-sm'
                                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                                  }`}
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePermission(user.id, mod.num, 'EDIT')}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                                    !isLocked && isCanEdit
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                                  }`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Isi &amp; Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePermission(user.id, mod.num, isLocked ? 'VIEW' : 'LOCKED')}
                                  className={`p-1 rounded-lg text-[10px] transition ${
                                    isLocked
                                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                      : 'bg-stone-800 text-stone-500 hover:text-stone-300'
                                  }`}
                                  title={isLocked ? 'Buka Kunci Modul' : 'Kunci / Sembunyikan Modul'}
                                >
                                  <Lock className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* MODAL FOOTER DENGAN TOMBOL SIMPAN REALTIME */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/95 shrink-0 gap-3">
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {hasUnsavedChanges
                ? 'Ada perubahan izin yang belum disimpan. Klik "Simpan Pengaturan Hak Akses".'
                : 'Semua perubahan hak akses tersimpan rapi dan aktif secara realtime di Cloud Firestore.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveAllSettings}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition active:scale-95 shadow-xl ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Hak Akses'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
