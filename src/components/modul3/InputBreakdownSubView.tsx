import React, { useState } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownComponentOption, 
  BREAKDOWN_COMPONENT_OPTIONS, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Wrench, 
  Save, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Briefcase, 
  Cpu, 
  FileText, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Edit, 
  AlertTriangle,
  Layers,
  X
} from 'lucide-react';

interface InputBreakdownSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onSaveBreakdown: (
    data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onNavigateToUpdate: (record: BreakdownRecord) => void;
}

export const InputBreakdownSubView: React.FC<InputBreakdownSubViewProps> = ({
  units,
  manpowerList,
  breakdowns,
  currentUser,
  onSaveBreakdown,
  onNavigateToUpdate,
}) => {
  // Ambil daftar unik jenis unit dari Modul 1
  const availableJenisList = Array.from(
    new Set(units.map((u) => u.jenis).filter((j) => Boolean(j && j.trim())))
  );

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    hm: '',
    jenis: '',
    noUnit: '',
    noLama: '',
    lokasi: '',
    pelapor: '',
    jabatan: '',
    component: '' as BreakdownComponentOption | '',
    detailProblem: '',
  });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    noNotifikasi?: string;
  } | null>(null);

  // Modal View Detail Notifikasi
  const [viewingRecord, setViewingRecord] = useState<BreakdownRecord | null>(null);

  // Filter daftar unit berdasarkan "JENIS" yang dipilih
  const filteredUnitsByJenis = formData.jenis
    ? units.filter((u) => u.jenis.toLowerCase().trim() === formData.jenis.toLowerCase().trim())
    : units;

  // Handler saat JENIS dipilih
  const handleSelectJenis = (selectedJenis: string) => {
    setFormData((prev) => ({
      ...prev,
      jenis: selectedJenis,
      noUnit: '', // Reset No Unit agar user memilih sesuai jenis yang baru
      noLama: '',
    }));
  };

  // Handler saat NO UNIT dipilih
  const handleSelectNoUnit = (cn: string) => {
    const selectedAsset = units.find((u) => u.cnNew.toLowerCase().trim() === cn.toLowerCase().trim());
    setFormData((prev) => ({
      ...prev,
      noUnit: cn,
      jenis: prev.jenis || selectedAsset?.jenis || '',
      // NO LAMA menampilkan secara otomatis (mengambil dari snUnit / modelUnit atau no lama pada aset)
      noLama: selectedAsset ? (selectedAsset.snUnit || selectedAsset.modelUnit || selectedAsset.namaAlat) : '',
    }));
  };

  // Handler saat PELAPOR dipilih dari Manpower Modul 2
  const handleSelectPelapor = (namaPelapor: string) => {
    const person = manpowerList.find(
      (m) => m.nama.toLowerCase().trim() === namaPelapor.toLowerCase().trim()
    );
    setFormData((prev) => ({
      ...prev,
      pelapor: namaPelapor,
      // Jabatan munculkan secara Otomatis ketika nama Pelapor di Pilih
      jabatan: person ? person.jabatan : prev.jabatan,
    }));
  };

  // Reset Form
  const handleResetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      hm: '',
      jenis: '',
      noUnit: '',
      noLama: '',
      lokasi: '',
      pelapor: '',
      jabatan: '',
      component: '',
      detailProblem: '',
    });
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.noUnit.trim()) {
      setFeedback({ type: 'error', message: 'NO UNIT wajib dipilih!' });
      return;
    }
    if (!formData.detailProblem.trim()) {
      setFeedback({ type: 'error', message: 'Detail Problem wajib diisi!' });
      return;
    }

    const payload = {
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      hm: formData.hm ? Number(formData.hm) || formData.hm : '',
      jenis: formData.jenis.trim(),
      noUnit: formData.noUnit.trim(),
      noLama: formData.noLama.trim(),
      lokasi: formData.lokasi.trim() || 'Quarry Purwosari',
      pelapor: formData.pelapor.trim() || currentUser.fullName || currentUser.username,
      jabatan: formData.jabatan.trim() || 'OPERATOR',
      component: formData.component || 'Other',
      detailProblem: formData.detailProblem.trim(),
      statusUnit: 'BREAKDOWN',
      progress: 'On Progress',
      startJob: formData.tanggal || new Date().toISOString().split('T')[0],
    };

    const res = onSaveBreakdown(payload);
    if (res.success && res.record) {
      setFeedback({
        type: 'success',
        message: res.message,
        noNotifikasi: res.record.noNotifikasi,
      });
      handleResetForm();
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Gagal menyimpan laporan breakdown.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold font-mono tracking-wide">{feedback.message}</p>
              {feedback.noNotifikasi && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-stone-300">No Laporan Kerusakan:</span>
                  <span className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 text-xs font-mono font-black tracking-wider">
                    {feedback.noNotifikasi}
                  </span>
                  <span className="text-[11px] text-emerald-400">(Format: 26 Th, 09 Bln, 5 digit urut)</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-200 text-sm font-mono px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORM INPUT BREAKDOWN (SUB MODUL 1) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono uppercase tracking-wider">
                Sub Modul 1: Input Breakdown
              </h2>
              <p className="text-xs text-stone-400">
                Pencatatan laporan awal unit mulai breakdown di Quarry Purwosari.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-700 text-xs transition font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GRID 1: Tanggal, HM, Jenis, No Unit, No Lama, Lokasi */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <span>1. Informasi Waktu & Identitas Unit</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tanggal Mulai Breakdown */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  Tanggal <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="field-breakdown-tanggal"
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">Tanggal unit mulai breakdown</p>
              </div>

              {/* HM (Hours Meter) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  HM (Hours Meter)
                </label>
                <input
                  id="field-breakdown-hm"
                  type="text"
                  value={formData.hm}
                  onChange={(e) => setFormData({ ...formData, hm: e.target.value })}
                  placeholder="Contoh: 12500.5"
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">Angka HM saat unit breakdown</p>
              </div>

              {/* JENIS (Pilihan Ganda Reff dari Modul 1) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>JENIS</span>
                  <span className="text-[10px] text-stone-400 font-normal lowercase">(reff Modul 1)</span>
                </label>
                <select
                  id="field-breakdown-jenis"
                  value={formData.jenis}
                  onChange={(e) => handleSelectJenis(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Jenis Unit --</option>
                  {availableJenisList.length > 0 ? (
                    availableJenisList.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="EXCAVATOR">EXCAVATOR</option>
                      <option value="DUMP TRUCK">DUMP TRUCK</option>
                      <option value="WHEEL LOADER">WHEEL LOADER</option>
                      <option value="BULLDOZER">BULLDOZER</option>
                      <option value="STONE CRUSHER">STONE CRUSHER</option>
                    </>
                  )}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Pilih kategori untuk memfilter No Unit</p>
              </div>

              {/* NO UNIT (Dropdown sesuai Jenis Unit terpilih) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>NO UNIT <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-stone-400 font-normal lowercase">
                    ({filteredUnitsByJenis.length} unit tersedia)
                  </span>
                </label>
                <select
                  id="field-breakdown-nounit"
                  required
                  value={formData.noUnit}
                  onChange={(e) => handleSelectNoUnit(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih No Unit (CN_NEW) --</option>
                  {filteredUnitsByJenis.map((u) => (
                    <option key={u.id} value={u.cnNew}>
                      {u.cnNew} - {u.namaAlat} ({u.jenis})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Dropdown sesuai JENIS yang dipilih</p>
              </div>

              {/* NO LAMA (Menampilkan secara otomatis ketika NO UNIT dipilih) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center justify-between">
                  <span>NO LAMA</span>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">(otomatis)</span>
                </label>
                <input
                  id="field-breakdown-nolama"
                  type="text"
                  readOnly
                  value={formData.noLama}
                  placeholder="Terisi otomatis saat No Unit dipilih"
                  className="w-full bg-stone-800/50 border border-stone-700/70 rounded-xl px-3 py-2.5 text-xs text-amber-200 font-mono font-semibold cursor-not-allowed"
                />
                <p className="text-[10px] text-stone-500 mt-1">Nomor seri/lambung lama dari registrasi asset</p>
              </div>

              {/* Lokasi (Text bebas karena lokasi breakdown bervariasi) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  Lokasi
                </label>
                <div className="relative">
                  <input
                    id="field-breakdown-lokasi"
                    type="text"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    placeholder="Contoh: Pit Utara / Crusher Plant / Disposal / Workshop"
                    className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">Lokasi posisi alat saat terjadi kerusakan</p>
              </div>
            </div>
          </div>

          {/* GRID 2: Pelapor & Jabatan */}
          <div className="pt-2 border-t border-stone-800/80">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <User className="w-4 h-4" />
              <span>2. Informasi Pelapor (Data Manpower Modul 2)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PELAPOR (Sesuai pilihan NAMA di Modul 2) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>PELAPOR</span>
                  <span className="text-[10px] text-stone-400 font-normal lowercase">(reff Modul 2)</span>
                </label>
                <div className="relative">
                  <select
                    id="field-breakdown-pelapor"
                    value={formData.pelapor}
                    onChange={(e) => handleSelectPelapor(e.target.value)}
                    className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Pilih Nama Pelapor --</option>
                    {manpowerList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} ({m.jabatan})
                      </option>
                    ))}
                  </select>
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">Pilih personil pelapor dari database manpower</p>
              </div>

              {/* Jabatan (Muncul otomatis ketika nama Pelapor dipilih) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center justify-between">
                  <span>Jabatan</span>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">(otomatis)</span>
                </label>
                <div className="relative">
                  <input
                    id="field-breakdown-jabatan"
                    type="text"
                    readOnly
                    value={formData.jabatan}
                    placeholder="Terisi otomatis saat nama Pelapor dipilih"
                    className="w-full bg-stone-800/50 border border-stone-700/70 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-200 font-semibold cursor-not-allowed"
                  />
                  <Briefcase className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">Jabatan resmi terhubung dari Modul 2</p>
              </div>
            </div>
          </div>

          {/* GRID 3: Component Rusak & Detail Problem */}
          <div className="pt-2 border-t border-stone-800/80">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4" />
              <span>3. Gejala & Komponen Kerusakan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Component Pilihan Dropdown */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Component Rusak <span className="text-rose-400">*</span>
                </label>
                <select
                  id="field-breakdown-component"
                  required
                  value={formData.component}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value as BreakdownComponentOption })}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Komponen --</option>
                  {BREAKDOWN_COMPONENT_OPTIONS.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Data komponen untuk analisis Pareto</p>
              </div>

              {/* Detail Problem (Type Text bebas) */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  Detail Problem <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="field-breakdown-detailproblem"
                  required
                  rows={2}
                  value={formData.detailProblem}
                  onChange={(e) => setFormData({ ...formData, detailProblem: e.target.value })}
                  placeholder="Deskripsikan laporan awal masalah/kerusakan unit..."
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Catatan problem awal ini akan bersifat tetap (read-only) saat proses update</p>
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              id="btn-simpan-breakdown"
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-mono font-black text-xs uppercase tracking-wider hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>SIMPAN LAPORAN BREAKDOWN</span>
            </button>
          </div>
        </form>
      </div>

      {/* LIST DI BAWAHNYA: Unit yang sudah berhasil di Input */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Daftar Laporan Breakdown Hasil Input</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Total {breakdowns.length} laporan kerusakan terdaftar di database
            </p>
          </div>
        </div>

        {breakdowns.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-stone-800 rounded-xl bg-stone-950/40">
            <Wrench className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-xs text-stone-400 font-mono">Belum ada unit breakdown yang di-input.</p>
            <p className="text-[11px] text-stone-500 mt-1">Gunakan formulir di atas untuk mencatat laporan kerusakan unit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-3">No Notifikasi</th>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-3 py-3">Jenis</th>
                  <th className="px-3 py-3">No Unit</th>
                  <th className="px-3 py-3">No Lama</th>
                  <th className="px-3 py-3">Pelapor / Jabatan</th>
                  <th className="px-3 py-3">Component</th>
                  <th className="px-3 py-3">Problem Awal</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {breakdowns.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-800/40 transition">
                    <td className="px-3 py-3 font-bold text-amber-400 whitespace-nowrap">
                      {b.noNotifikasi}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-300">{b.tanggal}</td>
                    <td className="px-3 py-3 text-stone-300 font-sans">{b.jenis || '-'}</td>
                    <td className="px-3 py-3 font-bold text-stone-100 whitespace-nowrap">{b.noUnit}</td>
                    <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{b.noLama || '-'}</td>
                    <td className="px-3 py-3 font-sans">
                      <div className="font-semibold text-stone-200">{b.pelapor}</div>
                      <div className="text-[10px] text-stone-400">{b.jabatan}</div>
                    </td>
                    <td className="px-3 py-3 text-amber-300 whitespace-nowrap font-sans font-semibold">
                      {b.component || 'Other'}
                    </td>
                    <td className="px-3 py-3 font-sans text-stone-300 max-w-[200px] truncate" title={b.detailProblem}>
                      {b.detailProblem}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.statusUnit === 'READY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : b.statusUnit === 'LIMIT OPERASI'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {b.statusUnit}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5 font-sans">
                        {/* Tombol UPDATE -> langsung mengarahkan ke Sub Modul 2 */}
                        <button
                          type="button"
                          onClick={() => onNavigateToUpdate(b)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30 text-[11px] font-bold transition"
                          title="Update breakdown unit ini di Sub Modul 2"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Update</span>
                        </button>

                        {/* Tombol VIEW -> Modal Detail Lengkap */}
                        <button
                          type="button"
                          onClick={() => setViewingRecord(b)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 border border-stone-700 text-[11px] font-semibold transition"
                          title="Lihat seluruh informasi sesuai No Notifikasi"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL VIEW: Tampilkan Semua Informasi sesuai No Notifikasi */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-mono font-bold text-stone-100">
                    DETAIL LAPORAN KERUSAKAN
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    No Notifikasi: {viewingRecord.noNotifikasi}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <div>
                  <span className="text-stone-500 block text-[10px]">TANGGAL MULAI:</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.tanggal}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">HM (HOURS METER):</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.hm || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">JENIS UNIT:</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.jenis || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">NO UNIT / NO LAMA:</span>
                  <span className="text-amber-400 font-bold">
                    {viewingRecord.noUnit} {viewingRecord.noLama ? `(No Lama: ${viewingRecord.noLama})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">LOKASI:</span>
                  <span className="text-stone-200 font-bold">{viewingRecord.lokasi || 'Quarry Purwosari'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">PELAPOR & JABATAN:</span>
                  <span className="text-stone-200 font-bold">
                    {viewingRecord.pelapor} - {viewingRecord.jabatan}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">KOMPONEN RUSAK:</span>
                  <span className="text-rose-400 font-bold">{viewingRecord.component || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">STATUS UNIT:</span>
                  <span className="font-bold text-amber-300">{viewingRecord.statusUnit}</span>
                </div>
              </div>

              <div>
                <span className="text-stone-400 font-bold block mb-1">DETAIL PROBLEM (LAPORAN AWAL):</span>
                <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 text-stone-200 font-sans leading-relaxed">
                  {viewingRecord.detailProblem}
                </div>
              </div>

              {viewingRecord.detailKerusakan && (
                <div>
                  <span className="text-stone-400 font-bold block mb-1">DETAIL KERUSAKAN (UPDATE PEKERJAAN):</span>
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 text-stone-200 font-sans leading-relaxed">
                    {viewingRecord.detailKerusakan}
                  </div>
                </div>
              )}

              {/* PIC Info */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-stone-950/40 border border-stone-800">
                <div>
                  <span className="text-stone-500 block text-[10px]">PIC 1:</span>
                  <span className="text-stone-200 font-semibold">{viewingRecord.pic1 || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">PIC 2:</span>
                  <span className="text-stone-200 font-semibold">{viewingRecord.pic2 || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">PIC 3:</span>
                  <span className="text-stone-200 font-semibold">{viewingRecord.pic3 || '-'}</span>
                </div>
              </div>

              {/* Riwayat Part / Jasa */}
              {viewingRecord.partsJasa && viewingRecord.partsJasa.length > 0 && (
                <div>
                  <span className="text-stone-400 font-bold block mb-1">KEBUTUHAN PART & JASA:</span>
                  <div className="overflow-x-auto rounded-xl border border-stone-800">
                    <table className="w-full text-left text-[11px] text-stone-300">
                      <thead className="bg-stone-950 text-stone-500">
                        <tr>
                          <th className="p-2">No</th>
                          <th className="p-2">Jenis</th>
                          <th className="p-2">Nama Part/Jasa</th>
                          <th className="p-2">Part Number</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800">
                        {viewingRecord.partsJasa.map((pj) => (
                          <tr key={pj.no}>
                            <td className="p-2">{pj.no}</td>
                            <td className="p-2 font-bold text-amber-400">{pj.jenis}</td>
                            <td className="p-2">{pj.namaPart}</td>
                            <td className="p-2 font-mono text-stone-400">{pj.partNumber || '-'}</td>
                            <td className="p-2 text-right font-bold">{pj.qty}</td>
                            <td className="p-2">{pj.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  const target = viewingRecord;
                  setViewingRecord(null);
                  onNavigateToUpdate(target);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Buka Form Update</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
