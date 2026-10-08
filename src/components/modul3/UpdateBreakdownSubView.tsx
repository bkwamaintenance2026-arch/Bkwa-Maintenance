import React, { useState, useEffect, useMemo } from 'react';
import { 
  BreakdownRecord, 
  BreakdownPartJasaItem, 
  BreakdownProgressOption, 
  BREAKDOWN_PROGRESS_OPTIONS, 
  BreakdownStatusUnitOption, 
  BREAKDOWN_STATUS_UNIT_OPTIONS, 
  PART_SATUAN_OPTIONS, 
  PartSatuanOption, 
  ManpowerData, 
  UserAccount 
} from '../../types';
import { 
  Edit3, 
  Save, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
  Layers, 
  RotateCcw,
  Sparkles,
  Package,
  Wrench,
  Archive,
  ExternalLink
} from 'lucide-react';
import { TimeInput24Hour } from '../common/TimeInput24Hour';
import { isDeveloper } from '../../utils/storage';
import { PartRequirementModal } from './PartRequirementModal';

interface UpdateBreakdownSubViewProps {
  breakdowns: BreakdownRecord[];
  selectedBreakdownToUpdate: BreakdownRecord | null;
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onUpdateActivity: (
    id: string,
    updateData: {
      startJob?: string;
      jamStart?: string;
      jamFinish?: string;
      detailKerusakan?: string;
      progress?: BreakdownProgressOption | string;
      statusUnit?: BreakdownStatusUnitOption | string;
      pic1?: string;
      pic2?: string;
      pic3?: string;
      remark?: string;
      partsJasa?: BreakdownPartJasaItem[];
    }
  ) => { success: boolean; message: string; record?: BreakdownRecord };
  onSelectBreakdown: (record: BreakdownRecord | null) => void;
  onDeleteBreakdown?: (id: string) => { success: boolean; message: string };
}

export const UpdateBreakdownSubView: React.FC<UpdateBreakdownSubViewProps> = ({
  breakdowns,
  selectedBreakdownToUpdate,
  manpowerList,
  currentUser,
  onUpdateActivity,
  onSelectBreakdown,
  onDeleteBreakdown,
}) => {
  const isDev = isDeveloper(currentUser);
  // Filter teknisi mekanik dari Modul 2 (selain Operator dan Sopir)
  const eligibleMechanics = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase();
    return !j.includes('OPERATOR') && !j.includes('SOPIR');
  });

  // Opsi toggle tampilkan arsip unit yang sudah READY
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  // Filter unit yang masih active breakdown (status selain READY)
  const activeExistingBreakdowns = useMemo(() => {
    return breakdowns.filter(
      (b) => (b.statusUnit || 'BREAKDOWN').toUpperCase().trim() !== 'READY'
    );
  }, [breakdowns]);

  // Daftar opsi unit untuk dropdown selector
  const availableBreakdownOptions = showAllHistory ? breakdowns : activeExistingBreakdowns;

  // Target breakdown yang sedang diedit
  const [selectedId, setSelectedId] = useState<string>(selectedBreakdownToUpdate?.id || '');

  // Form State untuk Sub Modul 2
  const [startJob, setStartJob] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jamStart, setJamStart] = useState<string>('08:00');
  const [jamFinish, setJamFinish] = useState<string>('');
  const [detailKerusakan, setDetailKerusakan] = useState<string>('');
  const [progress, setProgress] = useState<BreakdownProgressOption>('On Progress');
  const [statusUnit, setStatusUnit] = useState<BreakdownStatusUnitOption>('BREAKDOWN');
  const [pic1, setPic1] = useState<string>('');
  const [pic2, setPic2] = useState<string>('');
  const [pic3, setPic3] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // Tabel Kebutuhan Part dan Jasa
  const [partsJasaList, setPartsJasaList] = useState<BreakdownPartJasaItem[]>([]);

  // Baris input tambah item part/jasa baru
  const [newPartItem, setNewPartItem] = useState<{
    jenis: 'Part' | 'Jasa';
    namaPart: string;
    partNumber: string;
    qty: string | number;
    satuan: PartSatuanOption | string;
  }>({
    jenis: 'Part',
    namaPart: '',
    partNumber: '',
    qty: 1,
    satuan: 'Pcs',
  });

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  } | null>(null);

  // Modal Kebutuhan Spare Part (Popup saat No Notif / MO diklik)
  const [selectedModalBreakdown, setSelectedModalBreakdown] = useState<BreakdownRecord | null>(null);
  const [showPartModal, setShowPartModal] = useState<boolean>(false);

  // Modal Konfirmasi Hapus Laporan Breakdown
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<BreakdownRecord | null>(null);

  // Helper hitung durasi jam kerja perbaikan (format 24 jam)
  const calculateWorkDuration = (start: string, finish: string): string | null => {
    if (!start || !finish) return null;
    const [startH, startM] = start.split(':').map(Number);
    const [finishH, finishM] = finish.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(finishH) || isNaN(finishM)) return null;

    let startTotalMins = startH * 60 + startM;
    let finishTotalMins = finishH * 60 + finishM;

    // Jika pekerjaan melewati tengah malam (misal 22:00 s/d 02:00)
    if (finishTotalMins < startTotalMins) {
      finishTotalMins += 24 * 60;
    }

    const diffMins = finishTotalMins - startTotalMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0 && mins > 0) return `${hours} Jam ${mins} Menit`;
    if (hours > 0) return `${hours} Jam`;
    return `${mins} Menit`;
  };

  const getCurrent24HourTime = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const resetForm = () => {
    setStartJob(new Date().toISOString().split('T')[0]);
    setJamStart('08:00');
    setJamFinish('');
    setDetailKerusakan('');
    setProgress('On Progress');
    setStatusUnit('BREAKDOWN');
    setPic1('');
    setPic2('');
    setPic3('');
    setRemark('');
    setPartsJasaList([]);
    setNewPartItem({
      jenis: 'Part',
      namaPart: '',
      partNumber: '',
      qty: 1,
      satuan: 'Pcs',
    });
  };

  const loadBreakdownToForm = (b: BreakdownRecord) => {
    setStartJob(b.startJob || b.tanggal || new Date().toISOString().split('T')[0]);
    setJamStart(b.jamStart || '08:00');
    setJamFinish(b.jamFinish || '');
    setDetailKerusakan(b.detailKerusakan || '');
    setProgress((b.progress as BreakdownProgressOption) || 'On Progress');
    setStatusUnit((b.statusUnit as BreakdownStatusUnitOption) || 'BREAKDOWN');
    setPic1(b.pic1 || '');
    setPic2(b.pic2 || '');
    setPic3(b.pic3 || '');
    setRemark(b.remark || '');
    setPartsJasaList(b.partsJasa || []);
  };

  // Sync state ketika selectedBreakdownToUpdate berubah atau unit berstatus READY
  useEffect(() => {
    if (selectedBreakdownToUpdate) {
      setSelectedId(selectedBreakdownToUpdate.id);
      loadBreakdownToForm(selectedBreakdownToUpdate);
      return;
    }

    if (selectedId) {
      const current = breakdowns.find((b) => b.id === selectedId);
      // Jika record saat ini sudah dinyatakan READY dan mode tampil arsip mati,
      // otomatis keluarkan dari form dan alihkan ke unit aktif berikutnya
      if (!current || (!showAllHistory && current.statusUnit === 'READY')) {
        if (activeExistingBreakdowns.length > 0) {
          const nextTarget = activeExistingBreakdowns[0];
          setSelectedId(nextTarget.id);
          loadBreakdownToForm(nextTarget);
        } else {
          setSelectedId('');
          resetForm();
          onSelectBreakdown(null);
        }
      }
    } else if (activeExistingBreakdowns.length > 0) {
      // Default ke breakdown existing pertama yang masih berstatus belum READY
      const firstActive = activeExistingBreakdowns[0];
      setSelectedId(firstActive.id);
      loadBreakdownToForm(firstActive);
    } else {
      setSelectedId('');
      resetForm();
    }
  }, [selectedBreakdownToUpdate, breakdowns, showAllHistory, activeExistingBreakdowns]);

  const currentActiveRecord = breakdowns.find((b) => b.id === selectedId);

  // Tambah Part/Jasa ke daftar
  const handleAddPartItem = () => {
    if (!newPartItem.namaPart.trim()) {
      alert('Nama Part / Jasa wajib diisi!');
      return;
    }

    const newItem: BreakdownPartJasaItem = {
      no: partsJasaList.length + 1,
      jenis: newPartItem.jenis,
      namaPart: newPartItem.namaPart.trim(),
      partNumber: newPartItem.partNumber.trim(),
      qty: Number(newPartItem.qty) || 1,
      satuan: newPartItem.satuan || 'Pcs',
    };

    setPartsJasaList([...partsJasaList, newItem]);
    setNewPartItem({
      jenis: 'Part',
      namaPart: '',
      partNumber: '',
      qty: 1,
      satuan: 'Pcs',
    });
  };

  // Hapus item dari tabel Part/Jasa
  const handleRemovePartItem = (index: number) => {
    const updated = partsJasaList.filter((_, i) => i !== index);
    // Renumbering
    const renumbered = updated.map((item, i) => ({ ...item, no: i + 1 }));
    setPartsJasaList(renumbered);
  };

  // Submit Handler untuk Update Breakdown
  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedId) {
      setFeedback({ type: 'error', message: 'Silakan pilih unit breakdown yang akan di-update!' });
      return;
    }

    const target = breakdowns.find((b) => b.id === selectedId);

    const res = onUpdateActivity(selectedId, {
      startJob,
      jamStart: jamStart.trim(),
      jamFinish: jamFinish.trim(),
      detailKerusakan: detailKerusakan.trim(),
      progress,
      statusUnit,
      pic1,
      pic2,
      pic3,
      remark: remark.trim(),
      partsJasa: partsJasaList,
    });

    if (res.success) {
      const isNowReady = statusUnit === 'READY';
      setFeedback({
        type: 'success',
        message: isNowReady
          ? `✓ Unit ${target?.noUnit || ''} (MO: ${target?.noMaintenanceOrder || target?.noNotifikasi || ''}) berhasil diubah menjadi READY! Unit selesai diperbaiki dan telah dikeluarkan dari daftar breakdown aktif.`
          : res.message,
      });

      // Buka form baru Update Breakdown (reset form untuk update unit berikutnya)
      onSelectBreakdown(null);
      resetForm();
      if (isNowReady && !showAllHistory) {
        setSelectedId('');
      }
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Gagal menyimpan update breakdown.',
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

      {/* FORM UPDATE BREAKDOWN (SUB MODUL 2) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 font-mono uppercase tracking-wider">
                Sub Modul 2: Update Breakdown
              </h2>
              <p className="text-xs text-stone-400">
                Pencatatan perkembangan perbaikan (progress), part & jasa, dan penugasan teknisi mekanik.
              </p>
            </div>
          </div>

          {/* Unit Selector & Arsip Checkbox */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-stone-400 whitespace-nowrap">Pilih Unit:</label>
              <select
                id="select-breakdown-target"
                value={selectedId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedId(val);
                  const target = breakdowns.find((b) => b.id === val);
                  if (target) {
                    onSelectBreakdown(target);
                    loadBreakdownToForm(target);
                  } else {
                    onSelectBreakdown(null);
                    resetForm();
                  }
                }}
                className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:ring-2 focus:ring-amber-500"
              >
                <option value="">
                  {availableBreakdownOptions.length > 0
                    ? '-- Pilih Unit Breakdown --'
                    : '-- Tidak Ada Unit Breakdown Aktif --'}
                </option>
                {availableBreakdownOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    [MO: {b.noMaintenanceOrder || b.noNotifikasi}] {b.noUnit} ({b.statusUnit})
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox toggle tampilkan arsip yang sudah READY */}
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400 hover:text-stone-200 cursor-pointer bg-stone-950/80 px-2.5 py-1.5 rounded-xl border border-stone-800 select-none">
              <input
                type="checkbox"
                checked={showAllHistory}
                onChange={(e) => setShowAllHistory(e.target.checked)}
                className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0"
              />
              <Archive className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Tampilkan yang READY</span>
            </label>
          </div>
        </div>

        {/* Info Header Read-Only Breakdown Terpilih */}
        {currentActiveRecord ? (
          <>
            <div className="mb-6 p-4 rounded-xl bg-stone-950/70 border border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-stone-500 block text-[10px]">NO MAINTENANCE ORDER:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModalBreakdown(currentActiveRecord);
                    setShowPartModal(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-black inline-flex items-center gap-1.5 underline decoration-amber-500/50 hover:decoration-amber-300 group cursor-pointer text-left"
                  title="Klik untuk melihat kebutuhan spare part unit & export PDF ke Malang"
                >
                  <span>{currentActiveRecord.noMaintenanceOrder || currentActiveRecord.noNotifikasi}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" />
                </button>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">UNIT &amp; JENIS:</span>
                <span className="text-stone-200 font-bold">{currentActiveRecord.noUnit} ({currentActiveRecord.jenis || '-'})</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">NO LAMA:</span>
                <span className="text-stone-300">{currentActiveRecord.noLama || '-'}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">KOMPONEN RUSAK:</span>
                <span className="text-rose-400 font-bold">{currentActiveRecord.component || '-'}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 pt-2 border-t border-stone-800/80">
                <span className="text-stone-500 block text-[10px]">PROBLEM AWAL (READ-ONLY):</span>
                <span className="text-stone-300 font-sans italic">{currentActiveRecord.detailProblem}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 pt-2 border-t border-stone-800/80 flex sm:justify-end items-end">
                {onDeleteBreakdown && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(currentActiveRecord)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-[11px] font-bold transition shadow"
                    title="Hapus Laporan Breakdown ini"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Hapus Laporan</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-6">
          {/* BARIS 1: Start Job (Tanggal), Jam Start (24 Jam), Jam Finish (24 Jam) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Job: di isi Tanggal */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                Start Job (Tanggal) <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="field-update-startjob"
                  type="date"
                  required
                  value={startJob}
                  onChange={(e) => setStartJob(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Calendar className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">Tanggal pekerjaan perbaikan dimulai</p>
            </div>

            {/* Jam Start Pekerjaan (Model 24 Jam: 00:00 - 23:59 Tanpa AM/PM) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Jam Start (24 Jam)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setJamStart(getCurrent24HourTime())}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-semibold transition"
                    title="Isi jam sekarang"
                  >
                    Sekarang
                  </button>
                  <span className="text-stone-600 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setJamStart('08:00')}
                    className="text-[10px] font-mono text-stone-400 hover:text-stone-200 transition"
                  >
                    08:00
                  </button>
                  <span className="text-stone-600 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setJamStart('13:00')}
                    className="text-[10px] font-mono text-stone-400 hover:text-stone-200 transition"
                  >
                    13:00
                  </button>
                </div>
              </div>
              <TimeInput24Hour
                id="field-update-jamstart"
                value={jamStart}
                onChange={(val) => setJamStart(val)}
                placeholder="08:00"
              />
              <p className="text-[10px] text-stone-500 mt-1">Format 24 Jam (00:00 - 23:59)</p>
            </div>

            {/* Jam Finish Pekerjaan (Model 24 Jam: 00:00 - 23:59 Tanpa AM/PM) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Jam Finish (24 Jam)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setJamFinish(getCurrent24HourTime())}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-semibold transition"
                    title="Isi jam sekarang"
                  >
                    Sekarang
                  </button>
                  <span className="text-stone-600 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => setJamFinish('17:00')}
                    className="text-[10px] font-mono text-stone-400 hover:text-stone-200 transition"
                  >
                    17:00
                  </button>
                  {jamFinish && (
                    <>
                      <span className="text-stone-600 text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={() => setJamFinish('')}
                        className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
              <TimeInput24Hour
                id="field-update-jamfinish"
                value={jamFinish}
                onChange={(val) => setJamFinish(val)}
                placeholder="17:00"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                {calculateWorkDuration(jamStart, jamFinish) ? (
                  <span className="text-emerald-400 font-bold font-mono">
                    ✓ Durasi Kerja: {calculateWorkDuration(jamStart, jamFinish)}
                  </span>
                ) : (
                  'Format 24 Jam (00:00 - 23:59)'
                )}
              </p>
            </div>
          </div>

          {/* BARIS 2: PROGRESS & STATUS UNIT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PROGRESS: On Progress, Waiting Mechanic, Waiting Part, Rest Time, Waiting Instruksi, Waiting Transportasi, Cuaca Buruk */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                PROGRESS <span className="text-rose-400">*</span>
              </label>
              <select
                id="field-update-progress"
                required
                value={progress}
                onChange={(e) => setProgress(e.target.value as BreakdownProgressOption)}
                className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {BREAKDOWN_PROGRESS_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-stone-500 mt-1">Status tahapan pengerjaan saat ini</p>
            </div>

            {/* STATUS UNIT: BREAKDOWN, READY, LIMIT OPERASI */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                STATUS UNIT <span className="text-rose-400">*</span>
              </label>
              <select
                id="field-update-statusunit"
                required
                value={statusUnit}
                onChange={(e) => setStatusUnit(e.target.value as BreakdownStatusUnitOption)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 ${
                  statusUnit === 'READY'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 focus:ring-emerald-500'
                    : statusUnit === 'LIMIT OPERASI'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 focus:ring-amber-500'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300 focus:ring-rose-500'
                }`}
              >
                {BREAKDOWN_STATUS_UNIT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-stone-500 mt-1">
                {statusUnit === 'READY' || statusUnit === 'LIMIT OPERASI'
                  ? '⚠️ Unit akan dihilangkan dari daftar existing breakdown'
                  : 'Unit tetap berada dalam daftar breakdown aktif'}
              </p>
            </div>
          </div>

          {/* UPDATE PROGRESS (Type Text saja) */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
              Update Progress
            </label>
            <textarea
              id="field-update-detailkerusakan"
              rows={2}
              value={detailKerusakan}
              onChange={(e) => setDetailKerusakan(e.target.value)}
              placeholder="Catat update progres pengerjaan / perbaikan unit saat ini..."
              className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* PIC 1, PIC 2, PIC 3 (Pilihan Nama sesuai List Modul 2 selain Operator dan Sopir) */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <User className="w-4 h-4" />
              <span>Teknisi & Mekanik Pelaksana (PIC)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PIC#1 */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  PIC#1
                </label>
                <select
                  id="field-update-pic1"
                  value={pic1}
                  onChange={(e) => setPic1(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih PIC#1 --</option>
                  {eligibleMechanics.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Lead mekanik penanggung jawab</p>
              </div>

              {/* PIC#2 */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  PIC#2
                </label>
                <select
                  id="field-update-pic2"
                  value={pic2}
                  onChange={(e) => setPic2(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih PIC#2 --</option>
                  {eligibleMechanics.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Mekanik / Helper pelaksana</p>
              </div>

              {/* PIC#3 */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
                  PIC#3
                </label>
                <select
                  id="field-update-pic3"
                  value={pic3}
                  onChange={(e) => setPic3(e.target.value)}
                  className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih PIC#3 --</option>
                  {eligibleMechanics.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama} ({m.jabatan})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1">Helper / PKL pembantu teknis</p>
              </div>
            </div>
          </div>

          {/* Remark = Catatan */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
              Remark (Catatan Khusus)
            </label>
            <input
              id="field-update-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Catatan tambahan, rekomendasi pergantian, instruksi keselamatan..."
              className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* TABEL KEBUTUHAN PART DAN JASA */}
          <div className="pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Tabel Kebutuhan Part dan Jasa</span>
              </h3>
              <span className="text-[11px] text-stone-400 font-mono">
                {partsJasaList.length} Item Ditambahkan
              </span>
            </div>

            {/* Input Baris Baru Part & Jasa */}
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                {/* Jenis: Part / Jasa */}
                <div>
                  <label className="block text-[10px] font-mono text-stone-400 mb-1">Jenis</label>
                  <select
                    value={newPartItem.jenis}
                    onChange={(e) => setNewPartItem({ ...newPartItem, jenis: e.target.value as 'Part' | 'Jasa' })}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Part">Part</option>
                    <option value="Jasa">Jasa</option>
                  </select>
                </div>

                {/* Nama Part */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono text-stone-400 mb-1">Nama Part / Jasa</label>
                  <input
                    type="text"
                    value={newPartItem.namaPart}
                    onChange={(e) => setNewPartItem({ ...newPartItem, namaPart: e.target.value })}
                    placeholder="Contoh: Filter Oli / Rekondisi Silinder"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Part Number */}
                <div>
                  <label className="block text-[10px] font-mono text-stone-400 mb-1">Part Number</label>
                  <input
                    type="text"
                    value={newPartItem.partNumber}
                    onChange={(e) => setNewPartItem({ ...newPartItem, partNumber: e.target.value })}
                    placeholder="P/N (opsional)"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Qty */}
                <div>
                  <label className="block text-[10px] font-mono text-stone-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={newPartItem.qty}
                    onChange={(e) => setNewPartItem({ ...newPartItem, qty: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                  />
                </div>

                {/* Satuan: Pcs, Set, Ltr, Drum, Pail, Mtr, Pack */}
                <div>
                  <label className="block text-[10px] font-mono text-stone-400 mb-1">Satuan</label>
                  <select
                    value={newPartItem.satuan}
                    onChange={(e) => setNewPartItem({ ...newPartItem, satuan: e.target.value as PartSatuanOption })}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {PART_SATUAN_OPTIONS.map((sat) => (
                      <option key={sat} value={sat}>
                        {sat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddPartItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-stone-950 border border-amber-500/30 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah ke Tabel</span>
                </button>
              </div>
            </div>

            {/* Tabel List Part/Jasa */}
            <div className="overflow-x-auto rounded-xl border border-stone-800">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="px-3 py-2 text-center w-12">No</th>
                    <th className="px-3 py-2 w-20">Jenis</th>
                    <th className="px-3 py-2">Nama Part / Jasa</th>
                    <th className="px-3 py-2">Part Number</th>
                    <th className="px-3 py-2 text-right w-20">Qty</th>
                    <th className="px-3 py-2 w-24">Satuan</th>
                    <th className="px-3 py-2 text-center w-16">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono">
                  {partsJasaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-stone-500 italic">
                        Belum ada part atau jasa yang ditambahkan.
                      </td>
                    </tr>
                  ) : (
                    partsJasaList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-800/40">
                        <td className="px-3 py-2 text-center text-stone-400">{item.no}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.jenis === 'Part'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {item.jenis}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-sans font-semibold text-stone-100">{item.namaPart}</td>
                        <td className="px-3 py-2 text-stone-400">{item.partNumber || '-'}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-400">{item.qty}</td>
                        <td className="px-3 py-2 text-stone-300">{item.satuan}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePartItem(idx)}
                            className="text-stone-500 hover:text-rose-400 p-1"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOMBOL SIMPAN DI PALING BAWAH */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
            <div>
              {onDeleteBreakdown && (currentActiveRecord || selectedBreakdownToUpdate) && (
                <button
                  id="btn-hapus-laporan-breakdown"
                  type="button"
                  onClick={() => {
                    const target = currentActiveRecord || selectedBreakdownToUpdate;
                    if (target) setDeleteConfirmTarget(target);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-bold transition shadow hover:shadow-rose-900/30 active:scale-95 cursor-pointer"
                  title="Hapus Laporan Breakdown yang Sedang Terpilih"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Hapus Laporan Breakdown</span>
                </button>
              )}
            </div>

            <button
              id="btn-simpan-update-breakdown"
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-mono font-black text-xs uppercase tracking-wider hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>SIMPAN UPDATE BREAKDOWN</span>
            </button>
          </div>
        </form>
      </>
    ) : (
      <div className="py-12 px-4 text-center rounded-2xl bg-stone-950/60 border border-stone-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold font-mono text-stone-200 uppercase tracking-wide">
          {activeExistingBreakdowns.length === 0 
            ? 'Semua Unit Telah Berstatus READY (Siap Operasi)' 
            : 'Pilih Unit Breakdown untuk Mulai Update'}
        </h4>
        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
          {activeExistingBreakdowns.length === 0
            ? 'Tidak ada unit yang sedang mengalami breakdown aktif saat ini. Anda dapat mencentang "Tampilkan yang READY" di atas untuk meninjau riwayat unit yang telah selesai.'
            : 'Silakan pilih salah satu unit breakdown dari menu dropdown di atas atau klik tombol "Buka di Form" pada tabel di bawah.'}
        </p>
      </div>
    )}
  </div>

      {/* LIST UNIT YANG SEDANG BREAKDOWN (EXISTING) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-stone-100 font-mono uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-400" />
              <span>Unit yang Sedang Breakdown (Existing)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Menampilkan hanya unit dengan status BREAKDOWN aktif ({activeExistingBreakdowns.length} unit) • Klik No. MO untuk melihat spare part &amp; export PDF
            </p>
          </div>
        </div>

        {activeExistingBreakdowns.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-stone-800 rounded-xl bg-stone-950/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-stone-300 font-mono font-bold">
              Tidak ada unit yang berstatus Breakdown saat ini.
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Seluruh unit telah berstatus READY atau LIMIT OPERASI (historis perbaikan tetap tersimpan di Sub Modul 3).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-[10px] font-mono uppercase text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-3 py-3">No. MO / Notif</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Start Job / Jam</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Update Progress</th>
                  <th className="px-3 py-3">Part/Jasa</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {activeExistingBreakdowns.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-stone-800/40 transition ${
                      selectedId === b.id ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
                    }`}
                  >
                    <td className="px-3 py-3 font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModalBreakdown(b);
                          setShowPartModal(true);
                        }}
                        className="text-left group/btn"
                        title="Klik untuk melihat kebutuhan spare part & export PDF ke Malang"
                      >
                        <span className="text-amber-400 group-hover/btn:text-amber-300 group-hover/btn:underline flex items-center gap-1 font-mono">
                          {b.noMaintenanceOrder || b.noNotifikasi}
                          <ExternalLink className="w-3 h-3 text-amber-400/70" />
                        </span>
                        {b.noMaintenanceOrder && b.noMaintenanceOrder !== b.noNotifikasi && (
                          <span className="text-[10px] text-stone-500 font-normal block font-mono">Notif: {b.noNotifikasi}</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-bold text-stone-100">{b.noUnit}</td>
                    <td className="px-3 py-3 text-stone-300">
                      <div>{b.startJob || b.tanggal}</div>
                      {(b.jamStart || b.jamFinish) && (
                        <div className="text-[10px] font-mono text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{b.jamStart || '--:--'} - {b.jamFinish || '--:--'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-sans font-semibold text-amber-300">
                      {b.progress || 'On Progress'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {b.statusUnit}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-sans text-stone-200 max-w-[240px]">
                      <div className="truncate text-xs" title={b.detailKerusakan || b.remark || '-'}>
                        {b.detailKerusakan || b.remark || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModalBreakdown(b);
                          setShowPartModal(true);
                        }}
                        className="text-left group/part"
                        title="Lihat rincian part & export PDF"
                      >
                        <span className="text-stone-300 group-hover/part:text-amber-400 font-bold text-[11px] underline">
                          {b.partsJasa && b.partsJasa.length > 0 ? `${b.partsJasa.length} item part` : 'Cek part'}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(b.id);
                            onSelectBreakdown(b);
                            loadBreakdownToForm(b);
                          }}
                          className="px-2.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 font-sans font-bold text-[11px] transition"
                          title="Buka data di form update"
                        >
                          Buka di Form
                        </button>
                        {onDeleteBreakdown && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTarget(b)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-[11px] transition cursor-pointer"
                            title="Hapus Laporan Breakdown Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Kebutuhan Spare Part (Popup & Export PDF ke Malang) */}
      <PartRequirementModal
        breakdown={selectedModalBreakdown}
        isOpen={showPartModal}
        onClose={() => {
          setShowPartModal(false);
          setSelectedModalBreakdown(null);
        }}
        currentUser={currentUser}
      />

      {/* Modal Konfirmasi Hapus Laporan Breakdown */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-stone-100 font-mono text-base">Hapus Laporan Breakdown?</h3>
                <p className="text-xs text-stone-400">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">No. MO / Notif:</span>
                <span className="text-amber-400 font-bold">
                  {deleteConfirmTarget.noMaintenanceOrder || deleteConfirmTarget.noNotifikasi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Unit:</span>
                <span className="text-stone-200 font-bold">
                  {deleteConfirmTarget.noUnit} {deleteConfirmTarget.namaAlat ? `(${deleteConfirmTarget.namaAlat})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Komponen:</span>
                <span className="text-rose-400 font-bold">{deleteConfirmTarget.component || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tanggal:</span>
                <span className="text-stone-300">{deleteConfirmTarget.tanggal}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-300/90 leading-relaxed font-sans">
              ⚠️ <strong>Peringatan:</strong> Laporan breakdown ini dan seluruh data riwayat update pekerjaannya akan dihapus permanen dari Database Maintenance.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-semibold transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteBreakdown) {
                    const res = onDeleteBreakdown(deleteConfirmTarget.id);
                    if (res && res.message) {
                      setFeedback({ type: 'success', message: res.message });
                    } else {
                      setFeedback({
                        type: 'success',
                        message: `Laporan breakdown ${deleteConfirmTarget.noMaintenanceOrder || deleteConfirmTarget.noNotifikasi} berhasil dihapus.`,
                      });
                    }
                  }
                  if (selectedId === deleteConfirmTarget.id) {
                    setSelectedId('');
                    onSelectBreakdown(null);
                    resetForm();
                  }
                  setDeleteConfirmTarget(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
