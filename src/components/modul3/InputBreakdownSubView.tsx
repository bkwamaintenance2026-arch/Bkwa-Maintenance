import React, { useState, useMemo } from 'react';
import { 
  AssetUnit, 
  BreakdownRecord, 
  BreakdownComponentOption, 
  BREAKDOWN_COMPONENT_OPTIONS, 
  BreakdownProgressOption,
  BREAKDOWN_PROGRESS_OPTIONS,
  BreakdownStatusUnitOption,
  BREAKDOWN_STATUS_UNIT_OPTIONS,
  BreakdownTypeOption,
  BREAKDOWN_TYPE_OPTIONS,
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
  X,
  ArrowRight,
  Trash2,
  Search,
  History,
  Sparkles
} from 'lucide-react';
import { isDeveloper, canUserDeleteModule } from '../../utils/storage';

interface InputBreakdownSubViewProps {
  units: AssetUnit[];
  manpowerList: ManpowerData[];
  breakdowns: BreakdownRecord[];
  currentUser: UserAccount;
  onSaveBreakdown: (
    data: Omit<BreakdownRecord, 'id' | 'noNotifikasi' | 'createdAt' | 'updatedAt' | 'riwayatUpdate'>
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onNavigateToUpdate: (record: BreakdownRecord) => void;
  onDeleteBreakdown?: (id: string) => { success: boolean; message: string };
}

export const InputBreakdownSubView: React.FC<InputBreakdownSubViewProps> = ({
  units,
  manpowerList,
  breakdowns,
  currentUser,
  onSaveBreakdown,
  onNavigateToUpdate,
  onDeleteBreakdown,
}) => {
  const isDev = isDeveloper(currentUser);
  const canDelete = isDev || canUserDeleteModule(currentUser, 3) || currentUser.role === 'ADMIN' || currentUser.accountTier === 'ADMIN';
  // Ambil daftar unik jenis unit dari Modul 1
  const availableJenisList = Array.from(
    new Set(units.map((u) => u.jenis).filter((j) => Boolean(j && j.trim())))
  );

  // Helper jam 24 jam Indonesia saat ini (HH:mm)
  const getCurrent24HourTime = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Pilihan Jam (00 - 23) dan Menit (00 - 59) sederhana format 24 jam
  const JAM_24_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MENIT_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    jamBreakdown: getCurrent24HourTime(),
    hm: '',
    jenis: '',
    noUnit: '',
    noLama: '',
    lokasi: '',
    pelapor: '',
    jabatan: '',
    component: '' as BreakdownComponentOption | '',
    breakdownType: 'UNSCHEDULE' as BreakdownTypeOption,
    detailProblem: '',
    statusUnit: 'BREAKDOWN' as BreakdownStatusUnitOption,
    progress: 'On Progress' as BreakdownProgressOption,
  });

  // Nilai Jam dan Menit yang saat ini terpilih pada dropdown 24 jam (format Indonesia HH:mm)
  const [selectedHour, selectedMinute] = useMemo(() => {
    const parts = (formData.jamBreakdown || '07:35').split(':');
    const h = parts[0] ? parts[0].padStart(2, '0') : '07';
    const m = parts[1] ? parts[1].padStart(2, '0') : '35';
    return [h, m];
  }, [formData.jamBreakdown]);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    noNotifikasi?: string;
  } | null>(null);

  // Modal View Detail Notifikasi
  const [viewingRecord, setViewingRecord] = useState<BreakdownRecord | null>(null);

  // Modal Konfirmasi Hapus Breakdown
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BreakdownRecord | null>(null);

  // Tab filter tampilan tabel di bawah: ACTIVE (sedang breakdown) vs ALL (semua riwayat)
  const [tableFilterTab, setTableFilterTab] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  // State pencarian tabel hasil input breakdown
  const [searchQuery, setSearchQuery] = useState<string>('');
  // State ID record yang baru saja diinput/diupdate agar langsung di-highlight
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Filter unit yang berstatus aktif breakdown (belum READY)
  const activeBreakdownRecords = useMemo(() => {
    return breakdowns.filter(
      (b) => (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
    );
  }, [breakdowns]);

  const rawDisplayedRecords = tableFilterTab === 'ACTIVE' ? activeBreakdownRecords : breakdowns;

  // Filter berdasarkan kata kunci pencarian
  const displayedBreakdownRecords = useMemo(() => {
    if (!searchQuery.trim()) return rawDisplayedRecords;
    const q = searchQuery.toLowerCase().trim();
    return rawDisplayedRecords.filter((b) => {
      const mo = (b.noMaintenanceOrder || b.noNotifikasi || '').toLowerCase();
      const unit = (b.noUnit || '').toLowerCase();
      const noLama = (b.namaAlat || b.noLama || '').toLowerCase();
      const jenis = (b.jenis || '').toLowerCase();
      const pelapor = (b.pelapor || '').toLowerCase();
      const problem = (b.detailProblem || '').toLowerCase();
      const update = (b.detailKerusakan || '').toLowerCase();
      const comp = (b.component || '').toLowerCase();
      return (
        mo.includes(q) ||
        unit.includes(q) ||
        noLama.includes(q) ||
        jenis.includes(q) ||
        pelapor.includes(q) ||
        problem.includes(q) ||
        update.includes(q) ||
        comp.includes(q)
      );
    });
  }, [rawDisplayedRecords, searchQuery]);

  // Urutkan data: jika ada record yang baru saja di-input/update, tempatkan di paling atas; sisanya urut tanggal & waktu terbaru
  const sortedBreakdownRecords = useMemo(() => {
    return [...displayedBreakdownRecords].sort((a, b) => {
      if (lastSavedId) {
        if (a.id === lastSavedId) return -1;
        if (b.id === lastSavedId) return 1;
      }
      const dateA = a.updatedAt || a.createdAt || `${a.tanggal} ${a.jamBreakdown || '00:00'}`;
      const dateB = b.updatedAt || b.createdAt || `${b.tanggal} ${b.jamBreakdown || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [displayedBreakdownRecords, lastSavedId]);

  // Cek apakah unit terpilih saat ini sedang aktif breakdown (status belum READY)
  const norm = (s: string = '') => s.toLowerCase().replace(/[\s\-_]/g, '').trim();
  const activeBreakdownForSelectedUnit = formData.noUnit
    ? breakdowns.find(
        (b) =>
          Boolean(b.noUnit) &&
          (norm(b.noUnit) === norm(formData.noUnit) || b.noUnit.toLowerCase().trim() === formData.noUnit.toLowerCase().trim()) &&
          (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
      )
    : undefined;

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

  // Handler saat NO UNIT dipilih (Reff Modul 1: CN New)
  const handleSelectNoUnit = (cn: string) => {
    const selectedAsset = units.find((u) => u.cnNew.toLowerCase().trim() === cn.toLowerCase().trim());
    const existingActive = breakdowns.find(
      (b) =>
        Boolean(b.noUnit) &&
        (norm(b.noUnit) === norm(cn) || b.noUnit.toLowerCase().trim() === cn.toLowerCase().trim()) &&
        (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
    );

    setFormData((prev) => ({
      ...prev,
      noUnit: cn,
      jenis: prev.jenis || selectedAsset?.jenis || existingActive?.jenis || '',
      // NO LAMA ganti reff NAMA ALAT dari Modul 1
      noLama: selectedAsset ? selectedAsset.namaAlat : (existingActive?.namaAlat || existingActive?.noLama || ''),
      component: existingActive ? (existingActive.component as BreakdownComponentOption) : prev.component,
      statusUnit: (existingActive?.statusUnit as BreakdownStatusUnitOption) || 'BREAKDOWN',
      progress: (existingActive?.progress as BreakdownProgressOption) || 'On Progress',
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
      jamBreakdown: getCurrent24HourTime(),
      hm: '',
      jenis: '',
      noUnit: '',
      noLama: '',
      lokasi: '',
      pelapor: '',
      jabatan: '',
      component: '',
      breakdownType: 'UNSCHEDULE',
      detailProblem: '',
      statusUnit: 'BREAKDOWN',
      progress: 'On Progress',
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
      setFeedback({ type: 'error', message: 'Detail Problem / Pekerjaan wajib diisi!' });
      return;
    }

    const payload = {
      tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
      jamBreakdown: formData.jamBreakdown ? formData.jamBreakdown.trim() : getCurrent24HourTime(),
      hm: formData.hm ? Number(formData.hm) || formData.hm : '',
      jenis: formData.jenis.trim(),
      noUnit: formData.noUnit.trim(),
      noLama: formData.noLama.trim(),
      lokasi: formData.lokasi.trim() || 'Quarry Purwosari',
      pelapor: formData.pelapor.trim() || currentUser.fullName || currentUser.username,
      jabatan: formData.jabatan.trim() || 'OPERATOR',
      component: formData.component || 'Other',
      breakdownType: formData.breakdownType || 'UNSCHEDULE',
      detailProblem: formData.detailProblem.trim(),
      statusUnit: formData.statusUnit || 'BREAKDOWN',
      progress: formData.progress || 'On Progress',
      startJob: formData.tanggal || new Date().toISOString().split('T')[0],
    };

    const res = onSaveBreakdown(payload);
    if (res.success && res.record) {
      setFeedback({
        type: 'success',
        message: res.message,
        noNotifikasi: res.record.noMaintenanceOrder || res.record.noNotifikasi,
      });
      setLastSavedId(res.record.id);
      // Jika statusnya READY dan sedang di tab ACTIVE, otomatis pindah ke tab ALL agar record tetap terlihat
      if (res.record.statusUnit === 'READY') {
        setTableFilterTab('ALL');
      }
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
                  <span className="text-[11px] text-stone-300">No. Maintenance Order:</span>
                  <span className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 text-xs font-mono font-black tracking-wider">
                    {feedback.noNotifikasi}
                  </span>
                  <span className="text-[11px] text-emerald-400">(Format: 2 digit th + 4 digit no urut)</span>
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

              {/* Jam Breakdown (Model Dropdown 24 Jam Indonesia - Sederhana) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Jam Breakdown <span className="text-amber-400">*</span></span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, jamBreakdown: '07:35' }))}
                      className="text-[10px] font-mono text-stone-300 hover:text-amber-300 font-bold transition px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 hover:border-amber-500/40 active:scale-95 cursor-pointer"
                      title="Set contoh jam 07:35"
                    >
                      07:35
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, jamBreakdown: getCurrent24HourTime() }))}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-bold transition px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 active:scale-95 cursor-pointer"
                      title="Set ke jam saat ini"
                    >
                      Jam Sekarang
                    </button>
                  </div>
                </div>

                {/* Dropdown Container: Jam (00 - 23) dan Menit (00 - 59) */}
                <div className="flex items-center gap-2 bg-stone-800/90 border border-stone-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-500">
                  <span className="text-xs font-mono font-bold text-stone-400 pl-1">Jam</span>

                  {/* Dropdown Pilihan Jam (00 s/d 23) */}
                  <div className="flex-1">
                    <select
                      id="field-breakdown-jam-hour"
                      value={selectedHour}
                      onChange={(e) => {
                        const newH = e.target.value;
                        const m = selectedMinute || '00';
                        setFormData((prev) => ({ ...prev, jamBreakdown: `${newH}:${m}` }));
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-stone-100 text-center focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {JAM_24_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="font-mono font-black text-amber-400 text-sm">:</span>

                  {/* Dropdown Pilihan Menit (00 s/d 59) */}
                  <div className="flex-1">
                    <select
                      id="field-breakdown-jam-minute"
                      value={selectedMinute}
                      onChange={(e) => {
                        const newM = e.target.value;
                        const h = selectedHour || '07';
                        setFormData((prev) => ({ ...prev, jamBreakdown: `${h}:${newM}` }));
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-stone-100 text-center focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {MENIT_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] font-mono text-stone-400 mt-1">
                  Jam: <strong className="text-amber-300 font-bold">{formData.jamBreakdown || '07:35'}</strong>
                </p>
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

              {/* NO UNIT (Dropdown CN New dari Modul 1) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>NO UNIT (CN NEW) <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-stone-400 font-normal lowercase">
                    (reff Modul 1 CN New: {filteredUnitsByJenis.length} unit)
                  </span>
                </label>
                <select
                  id="field-breakdown-nounit"
                  required
                  value={formData.noUnit}
                  onChange={(e) => handleSelectNoUnit(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih No Unit (CN New Modul 1) --</option>
                  {filteredUnitsByJenis.map((u, uIdx) => {
                    const isBD = breakdowns.some(
                      (b) => b.noUnit.toLowerCase().trim() === u.cnNew.toLowerCase().trim() && b.statusUnit !== 'READY'
                    );
                    return (
                      <option key={`${u.id}_${uIdx}`} value={u.cnNew}>
                        {u.cnNew} - {u.namaAlat} ({u.jenis}) {isBD ? '⚠️ [SEDANG BREAKDOWN]' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Daftar CN New teregistrasi di Modul 1</p>

                {/* Banner Deteksi Unit Sedang Breakdown */}
                {activeBreakdownForSelectedUnit && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 animate-fade-in">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-stone-100 text-xs font-mono">
                              Unit Sedang Breakdown:
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-mono font-black text-xs">
                              MO: {activeBreakdownForSelectedUnit.noMaintenanceOrder || activeBreakdownForSelectedUnit.noNotifikasi}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-mono text-[10px] border border-amber-500/40 font-bold">
                              Status: {activeBreakdownForSelectedUnit.statusUnit}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                            Unit ini dalam perbaikan sejak tanggal <strong>{activeBreakdownForSelectedUnit.tanggal}</strong> (Problem awal: <span className="italic text-stone-200 font-sans">"{activeBreakdownForSelectedUnit.detailProblem}"</span>).
                            Pembaruan pekerjaan pada hari berikutnya ini otomatis <strong>tetap mereferensikan Maintenance Order {activeBreakdownForSelectedUnit.noMaintenanceOrder || activeBreakdownForSelectedUnit.noNotifikasi}</strong>.
                          </p>
                          <p className="text-[10px] text-amber-400/90 mt-1 font-mono">
                            ✓ No. Maintenance Order baru HANYA akan dibuat jika status unit sebelumnya sudah dinyatakan 'READY'.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateToUpdate(activeBreakdownForSelectedUnit)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold transition shadow"
                        title="Buka di Sub Modul 2 untuk update penugasan mekanik atau penambahan part/jasa"
                      >
                        <span>Ke Sub Modul 2</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* NO LAMA (Reff NAMA ALAT dari Modul 1) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center justify-between">
                  <span>NO LAMA (NAMA ALAT)</span>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">(reff Modul 1)</span>
                </label>
                <input
                  id="field-breakdown-nolama"
                  type="text"
                  readOnly
                  value={formData.noLama}
                  placeholder="Terisi otomatis NAMA ALAT dari Modul 1"
                  className="w-full bg-stone-800/50 border border-stone-700/70 rounded-xl px-3 py-2.5 text-xs text-amber-200 font-mono font-semibold cursor-not-allowed"
                />
                <p className="text-[10px] text-stone-500 mt-1">Referensi otomatis NAMA ALAT dari Modul 1</p>
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

          {/* GRID 3: Klasifikasi Breakdown Type & Detail Problem */}
          <div className="pt-2 border-t border-stone-800/80">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4" />
              <span>
                {activeBreakdownForSelectedUnit
                  ? `3. Pembaruan Pekerjaan & Status Unit (Reff MO: ${activeBreakdownForSelectedUnit.noMaintenanceOrder || activeBreakdownForSelectedUnit.noNotifikasi})`
                  : '3. Klasifikasi Kerusakan & Detail Problem Awal'}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Breakdown Type: SCHEDULE, UNSCHEDULE, ACCIDENT */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
                  <span>Breakdown Type <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-stone-400 font-normal">Klasifikasi</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-950/80 border border-stone-700/80 rounded-xl">
                  {BREAKDOWN_TYPE_OPTIONS.map((type) => {
                    const isSelected = (formData.breakdownType || 'UNSCHEDULE') === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, breakdownType: type })}
                        className={`py-2 px-1 text-center rounded-lg text-[11px] font-mono font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? type === 'UNSCHEDULE'
                              ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                              : type === 'SCHEDULE'
                              ? 'bg-blue-600 text-white shadow-md font-black'
                              : 'bg-rose-600 text-white shadow-md font-black'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <span>{type === 'SCHEDULE' ? 'SC' : type === 'ACCIDENT' ? 'Acc' : 'Uns'}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          {type === 'UNSCHEDULE' ? 'Unschedule' : type === 'SCHEDULE' ? 'Schedule' : 'Accident'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-stone-500 mt-1">Default: UNSCHEDULE (Pilihan: SC, Uns, Acc)</p>
              </div>

              {/* Jika unit sedang breakdown, tampilkan pilihan Status Unit & Progress */}
              {activeBreakdownForSelectedUnit && (
                <>
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                      Status Unit Terkini <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="field-breakdown-statusunit"
                      value={formData.statusUnit}
                      onChange={(e) => setFormData({ ...formData, statusUnit: e.target.value as BreakdownStatusUnitOption })}
                      className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {BREAKDOWN_STATUS_UNIT_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st} {st === 'READY' ? '(Selesai diperbaiki - Siap Operasi)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-stone-500 mt-1">
                      {formData.statusUnit === 'READY'
                        ? 'Unit dinyatakan selesai. Laporan kerusakan berikutnya akan membuat No MO baru.'
                        : 'Tetap status BREAKDOWN, MO tidak berubah.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                      Progress Pengerjaan
                    </label>
                    <select
                      id="field-breakdown-progress"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: e.target.value as BreakdownProgressOption })}
                      className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {BREAKDOWN_PROGRESS_OPTIONS.map((pr) => (
                        <option key={pr} value={pr}>
                          {pr}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-stone-500 mt-1">Tahapan proses perbaikan saat ini</p>
                  </div>
                </>
              )}

              {/* Detail Problem / Catatan Pekerjaan Hari Ini */}
              <div className={activeBreakdownForSelectedUnit ? 'sm:col-span-3' : 'sm:col-span-2'}>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center justify-between">
                  <span>
                    {activeBreakdownForSelectedUnit
                      ? 'Catatan Pembaruan Pekerjaan Hari Ini'
                      : 'Detail Problem'} <span className="text-rose-400">*</span>
                  </span>
                  {activeBreakdownForSelectedUnit && (
                    <span className="text-[10px] text-amber-400 font-mono">
                      (Akan ditambahkan ke riwayat pekerjaan MO {activeBreakdownForSelectedUnit.noMaintenanceOrder || activeBreakdownForSelectedUnit.noNotifikasi})
                    </span>
                  )}
                </label>
                <textarea
                  id="field-breakdown-detailproblem"
                  required
                  rows={2}
                  value={formData.detailProblem}
                  onChange={(e) => setFormData({ ...formData, detailProblem: e.target.value })}
                  placeholder={
                    activeBreakdownForSelectedUnit
                      ? 'Deskripsikan progres pekerjaan hari ini (contoh: Lanjut perbaikan transmisi, penggantian seal, tes kelistrikan...)'
                      : 'Deskripsikan laporan awal masalah/kerusakan unit...'
                  }
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  {activeBreakdownForSelectedUnit
                    ? 'Catatan ini akan tersimpan dalam riwayat timeline perbaikan unit ini.'
                    : 'Catatan problem awal ini akan bersifat tetap (read-only) saat proses update'}
                </p>
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
              <span>
                {activeBreakdownForSelectedUnit
                  ? `SIMPAN UPDATE PEKERJAAN (REFF MO: ${activeBreakdownForSelectedUnit.noMaintenanceOrder || activeBreakdownForSelectedUnit.noNotifikasi})`
                  : 'SIMPAN LAPORAN BREAKDOWN BARU'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* LIST DI BAWAHNYA: Unit yang sudah berhasil di Input */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-stone-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Daftar Laporan Breakdown Hasil Input</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Menampilkan {displayedBreakdownRecords.length} dari {breakdowns.length} total laporan kerusakan terdaftar di database
                {searchQuery && (
                  <span className="text-amber-400 ml-1.5 font-mono font-bold">
                    (Filter pencarian: &quot;{searchQuery}&quot;)
                  </span>
                )}
              </p>
            </div>

            {/* Tab Filter: Unit Sedang Breakdown vs Semua Riwayat */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setTableFilterTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableFilterTab === 'ACTIVE'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Sedang Breakdown</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tableFilterTab === 'ACTIVE'
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {activeBreakdownRecords.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTableFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  tableFilterTab === 'ALL'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>Semua Riwayat (Termasuk READY)</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tableFilterTab === 'ALL'
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {breakdowns.length}
                </span>
              </button>
            </div>
          </div>

          {/* Baris Pencarian Cepat & Tombol Reset Sorotan */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No Unit, MO, Jenis, Pelapor, Kerusakan..."
                className="w-full bg-stone-950 border border-stone-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-200 text-xs px-1 cursor-pointer"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            {lastSavedId && (
              <button
                type="button"
                onClick={() => setLastSavedId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono hover:bg-amber-500/30 transition self-start sm:self-center cursor-pointer"
                title="Hapus sorotan item yang baru disimpan"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Baru Disimpan (Klik untuk reset sorotan)</span>
              </button>
            )}
          </div>
        </div>

        {displayedBreakdownRecords.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-stone-800 rounded-xl bg-stone-950/40">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                <p className="text-xs text-stone-200 font-mono font-bold">
                  Tidak ditemukan laporan breakdown dengan kata kunci &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1 rounded bg-stone-800 text-stone-300 hover:text-stone-100 text-xs font-mono"
                >
                  Reset Pencarian
                </button>
              </>
            ) : tableFilterTab === 'ACTIVE' ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-stone-200 font-mono font-bold">
                  Tidak ada unit yang sedang berstatus Breakdown aktif.
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Seluruh unit telah selesai diperbaiki dan berstatus READY. Klik tab &quot;Semua Riwayat&quot; di atas untuk melihat arsip data.
                </p>
              </>
            ) : (
              <>
                <Wrench className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p className="text-xs text-stone-400 font-mono">Belum ada unit breakdown yang di-input.</p>
                <p className="text-[11px] text-stone-500 mt-1">Gunakan formulir di atas untuk mencatat laporan kerusakan unit.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/80 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-3">No. Maintenance Order</th>
                  <th className="px-3 py-3">Tanggal &amp; Waktu</th>
                  <th className="px-3 py-3">Jenis</th>
                  <th className="px-3 py-3">No Unit (CN New)</th>
                  <th className="px-3 py-3">Nama Alat (No Lama)</th>
                  <th className="px-3 py-3">Pelapor / Jabatan</th>
                  <th className="px-3 py-3">Component</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 min-w-[200px]">Problem &amp; Update Terkini</th>
                  <th className="px-3 py-3 text-center">Riwayat</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {sortedBreakdownRecords.map((b) => {
                  const isJustSaved = lastSavedId === b.id;
                  const updatesCount = b.riwayatUpdate?.length || 1;
                  const latestUpdate = b.riwayatUpdate && b.riwayatUpdate.length > 0 ? b.riwayatUpdate[0] : null;
                  const hasDistinctUpdate =
                    latestUpdate &&
                    latestUpdate.detailKerusakan &&
                    latestUpdate.detailKerusakan.trim() !== b.detailProblem.trim();

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-stone-800/40 transition ${
                        isJustSaved
                          ? 'bg-amber-500/10 border-l-4 border-l-amber-400'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-bold text-amber-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{b.noMaintenanceOrder || b.noNotifikasi}</span>
                          {isJustSaved && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-black uppercase tracking-wider animate-pulse">
                              Baru
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-stone-300">
                        <div>{b.tanggal}</div>
                        {b.jamBreakdown && (
                          <div className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">
                            Jam {b.jamBreakdown}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-stone-300 font-sans">{b.jenis || '-'}</td>
                      <td className="px-3 py-3 font-bold text-stone-100 whitespace-nowrap">{b.noUnit}</td>
                      <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{b.namaAlat || b.noLama || '-'}</td>
                      <td className="px-3 py-3 font-sans">
                        <div className="font-semibold text-stone-200">{b.pelapor}</div>
                        <div className="text-[10px] text-stone-400">{b.jabatan}</div>
                      </td>
                      <td className="px-3 py-3 text-amber-300 whitespace-nowrap font-sans font-semibold">
                        {b.component || 'Other'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {(() => {
                          const t = (b.breakdownType || 'UNSCHEDULE').toUpperCase().trim();
                          const shortCode = t === 'SCHEDULE' ? 'SC' : t === 'ACCIDENT' ? 'Acc' : 'Uns';
                          const fullLabel = t === 'SCHEDULE' ? 'Schedule' : t === 'ACCIDENT' ? 'Accident' : 'Unschedule';
                          const colorClass =
                            t === 'SCHEDULE'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : t === 'ACCIDENT'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono inline-block border ${colorClass}`}
                              title={`Breakdown Type: ${fullLabel} (${shortCode})`}
                            >
                              {shortCode}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 font-sans max-w-[260px]">
                        <div className="text-stone-200 text-xs" title={b.detailProblem}>
                          <span className="text-[9.5px] font-mono text-stone-400 block font-bold uppercase tracking-wider">
                            Problem Awal:
                          </span>
                          <span className="line-clamp-2">{b.detailProblem}</span>
                        </div>
                        {hasDistinctUpdate && (
                          <div className="mt-1.5 pt-1.5 border-t border-stone-800 text-amber-300 text-[11px]" title={latestUpdate?.detailKerusakan}>
                            <span className="text-[9px] font-mono text-amber-400 font-bold block uppercase tracking-wider">
                              Update Terkini:
                            </span>
                            <span className="line-clamp-2 italic">{latestUpdate?.detailKerusakan}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => setViewingRecord(b)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-amber-500/20 hover:border-amber-500/40 text-stone-300 hover:text-amber-300 border border-stone-700/80 text-[11px] font-mono font-bold transition cursor-pointer"
                          title="Klik untuk membuka detail kronologi riwayat update"
                        >
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          <span>{updatesCount} Catatan</span>
                        </button>
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
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                            title="Update breakdown unit ini di Sub Modul 2"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Update</span>
                          </button>

                          {/* Tombol VIEW -> Modal Detail Lengkap */}
                          <button
                            type="button"
                            onClick={() => setViewingRecord(b)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 border border-stone-700 text-[11px] font-semibold transition cursor-pointer"
                            title="Lihat seluruh informasi sesuai No Notifikasi"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>

                        {canDelete && onDeleteBreakdown && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTarget(b)}
                            className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition cursor-pointer"
                            title="Hapus Laporan Kerusakan Ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                  <span className="text-stone-500 block text-[10px]">TANGGAL &amp; JAM BREAKDOWN:</span>
                  <span className="text-stone-200 font-bold">
                    {viewingRecord.tanggal} {viewingRecord.jamBreakdown ? `Jam ${viewingRecord.jamBreakdown}` : ''}
                  </span>
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
                  <span className="text-stone-500 block text-[10px]">BREAKDOWN TYPE:</span>
                  <span className="text-amber-300 font-bold font-mono">{viewingRecord.breakdownType || 'UNSCHEDULE'}</span>
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
                  <span className="text-stone-400 font-bold block mb-1">KEBUTUHAN PART &amp; JASA:</span>
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

              {/* KRONOLOGI & RIWAYAT UPDATE PEKERJAAN */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-bold font-mono uppercase text-xs flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-400" />
                    <span>Kronologi &amp; Riwayat Update Pekerjaan ({viewingRecord.riwayatUpdate?.length || 1} Catatan)</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">Urutan: Terbaru di atas</span>
                </div>

                {(!viewingRecord.riwayatUpdate || viewingRecord.riwayatUpdate.length === 0) ? (
                  <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-stone-400 text-xs italic">
                    Belum ada riwayat catatan update pekerjaan harian untuk MO ini.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {viewingRecord.riwayatUpdate.map((u, idx) => {
                      const tgl =
                        u.tanggal ||
                        (u.startJob && u.startJob.includes('-') ? u.startJob : viewingRecord.tanggal) ||
                        '-';
                      const jam = u.jamStart
                        ? u.jamFinish
                          ? `${u.jamStart} - ${u.jamFinish}`
                          : `Mulai ${u.jamStart}`
                        : u.jamPekerjaan || '-';
                      const pics = [u.pic1, u.pic2, u.pic3].filter(Boolean).join(', ') || '-';
                      const aksi = u.detailPekerjaan || u.detailKerusakan || viewingRecord.detailProblem;

                      return (
                        <div
                          key={u.id || idx}
                          className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/90 hover:border-amber-500/40 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-800/60">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                                #{viewingRecord.riwayatUpdate ? viewingRecord.riwayatUpdate.length - idx : 1}
                              </span>
                              <span className="text-stone-200 font-bold font-mono text-xs">
                                {tgl} {jam !== '-' ? `(${jam})` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {u.progress || 'On Progress'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  (u.statusUnit || '').toUpperCase().trim() === 'READY'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : (u.statusUnit || '').toUpperCase().trim() === 'LIMIT OPERASI'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {u.statusUnit || viewingRecord.statusUnit}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-stone-200 font-sans leading-relaxed mb-2">
                            {aksi}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-400 pt-1 border-t border-stone-800/40">
                            <div>
                              <span className="text-stone-500">PIC Mekanik: </span>
                              <span className="text-amber-300 font-semibold">{pics}</span>
                            </div>
                            {u.remark && (
                              <div>
                                <span className="text-stone-500">Remark: </span>
                                <span className="text-stone-300 italic">{u.remark}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-3 border-t border-stone-800">
              <div>
                {canDelete && onDeleteBreakdown && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingRecord;
                      setViewingRecord(null);
                      setDeleteConfirmTarget(target);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs font-bold transition cursor-pointer"
                    title="Hapus Laporan Breakdown"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Laporan</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS BREAKDOWN */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100">Konfirmasi Hapus Laporan</h3>
                <p className="text-xs text-stone-400">Tindakan ini permanen dan akan menghapus data dari Firestore.</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">No Notifikasi:</span>
                <span className="font-mono font-bold text-amber-400">{deleteConfirmTarget.noNotifikasi}</span>
              </div>
              {deleteConfirmTarget.noMaintenanceOrder && (
                <div className="flex justify-between">
                  <span className="text-stone-400">No MO:</span>
                  <span className="font-mono font-bold text-stone-200">{deleteConfirmTarget.noMaintenanceOrder}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-400">Unit:</span>
                <span className="font-bold text-stone-200">{deleteConfirmTarget.noUnit} ({deleteConfirmTarget.jenis || '-'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Komponen:</span>
                <span className="text-stone-300">{deleteConfirmTarget.component || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Tanggal:</span>
                <span className="text-stone-300">{deleteConfirmTarget.tanggal}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteBreakdown && deleteConfirmTarget) {
                    const res = onDeleteBreakdown(deleteConfirmTarget.id);
                    if (res && !res.success) {
                      alert(res.message);
                    }
                  }
                  setDeleteConfirmTarget(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
