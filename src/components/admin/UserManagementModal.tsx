import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { 
  X, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  HardHat, 
  Key, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Briefcase
} from 'lucide-react';
import { registerKaryawanUser, updateUserAccount, deleteUserAccount } from '../../utils/storage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onRefreshUsers: () => void;
  currentUser: UserAccount;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onRefreshUsers,
  currentUser,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    department: 'Mekanik Lapangan',
    phone: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm">
        <div className="p-6 bg-stone-900 border border-stone-700 rounded-2xl max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-stone-100">Akses Ditolak</h3>
          <p className="text-xs text-stone-400">
            Hanya Admin Developer yang berhak mendaftarkan dan mengelola akun Karyawan.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 rounded-xl text-xs font-semibold text-stone-200"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleCreateKaryawan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.password.trim()) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi' });
      return;
    }

    const res = registerKaryawanUser({
      username: formData.username.trim().toLowerCase(),
      fullName: formData.fullName.trim(),
      password: formData.password.trim(),
      role: 'KARYAWAN',
      department: formData.department,
      phone: formData.phone.trim() || '-',
      status: 'AKTIF',
    });

    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      setFormData({
        username: '',
        fullName: '',
        password: '',
        department: 'Mekanik Lapangan',
        phone: '',
      });
      setShowAddForm(false);
      onRefreshUsers();
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  const handleToggleStatus = (targetUser: UserAccount) => {
    if (targetUser.role === 'ADMIN') return;
    const nextStatus = targetUser.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    updateUserAccount(targetUser.id, { status: nextStatus });
    onRefreshUsers();
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Hapus akun karyawan: ${name}?`)) {
      const res = deleteUserAccount(id);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        onRefreshUsers();
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl shadow-stone-950/90 my-8 overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-mono">
                KELOLA AKUN KARYAWAN (ADMIN DEVELOPER)
              </h3>
              <p className="text-xs text-stone-400">
                Pendaftaran & Pengaturan Otorisasi User Maintenance PT BKWA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Notification Banner */}
        <div className="p-6 space-y-4">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                message.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-700 text-rose-300'
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-300">
              Total Pengguna Terdaftar: <strong className="text-amber-400">{users.length} Akun</strong>
            </div>
            <button
              id="btn-toggle-add-karyawan"
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-md shadow-amber-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Tutup Form' : 'Daftarkan Karyawan Baru'}</span>
            </button>
          </div>

          {/* Form Registrasi Karyawan Baru */}
          {showAddForm && (
            <form
              onSubmit={handleCreateKaryawan}
              className="p-4 bg-stone-950/70 border border-stone-800 rounded-xl space-y-3"
            >
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                Pendaftaran Karyawan Baru (Hanya oleh Developer)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-300 mb-1">
                    Nama Lengkap Karyawan <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="input-karyawan-fullname"
                    type="text"
                    required
                    placeholder="misal: Hendra Kurniawan"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-300 mb-1">
                    Username Login <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="input-karyawan-username"
                    type="text"
                    required
                    placeholder="misal: hendra_bkwa"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-300 mb-1">
                    Password Akun Karyawan <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="input-karyawan-password"
                    type="text"
                    required
                    placeholder="Password akun"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-300 mb-1">
                    Jabatan / Departemen
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Mekanik Lapangan">Mekanik Alat Berat Lapangan</option>
                    <option value="Staff Administrasi Workshop">Staff Administrasi Workshop</option>
                    <option value="Pengawas Pit Tambang">Pengawas Pit Tambang</option>
                    <option value="Operator Plant Crusher">Operator Plant Crusher</option>
                    <option value="Logistik Sparepart">Logistik Sparepart</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-300 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="misal: 0812-xxxx-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:bg-stone-800"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-new-karyawan"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition"
                >
                  Simpan & Daftarkan
                </button>
              </div>
            </form>
          )}

          {/* User List Table */}
          <div className="border border-stone-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 font-mono uppercase text-[10px] border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Password</th>
                  <th className="py-2.5 px-3">Departemen</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {users.map((u) => {
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-stone-800/40">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isAdmin
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-stone-700 text-stone-300'
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-stone-100">{u.fullName}</p>
                            <p className="text-[10px] font-mono text-stone-400">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isAdmin
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {isAdmin ? 'ADMIN DEVELOPER' : 'KARYAWAN'}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-mono text-[11px] text-stone-300">
                        {isAdmin ? (
                          <span className="text-stone-400 italic">•••••••• (Rahasia)</span>
                        ) : (
                          <span>{u.password || '••••••'}</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-stone-300 truncate max-w-[140px]">
                        {u.department || '-'}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            u.status === 'AKTIF'
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : 'text-stone-400 bg-stone-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right">
                        {!isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className="px-2 py-1 rounded text-[10px] font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300"
                            >
                              {u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              className="p-1 text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                              title="Hapus Akun Karyawan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-500 italic">Sistem Utama</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-900/90 text-xs text-stone-400">
          <span>Karyawan hanya dapat didaftarkan lewat otorisasi Admin Developer ini</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
