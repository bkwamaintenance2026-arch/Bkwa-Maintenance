import React, { useState, useEffect } from 'react';
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
  Wrench
} from 'lucide-react';

interface UpdateBreakdownSubViewProps {
  breakdowns: BreakdownRecord[];
  selectedBreakdownToUpdate: BreakdownRecord | null;
  manpowerList: ManpowerData[];
  currentUser: UserAccount;
  onUpdateActivity: (
    id: string,
    updateData: {
      startJob?: string;
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
}

export const UpdateBreakdownSubView: React.FC<UpdateBreakdownSubViewProps> = ({
  breakdowns,
  selectedBreakdownToUpdate,
  manpowerList,
  currentUser,
  onUpdateActivity,
  onSelectBreakdown,
}) => {
  // Filter teknisi mekanik dari Modul 2 (selain Operator dan Sopir)
  const eligibleMechanics = manpowerList.filter((m) => {
    const j = (m.jabatan || '').toUpperCase();
    return !j.includes('OPERATOR') && !j.includes('SOPIR');
  });

  // Target breakdown yang sedang diedit
  const [selectedId, setSelectedId] = useState<string>(selectedBreakdownToUpdate?.id || '');

  // Form State untuk Sub Modul 2
  const [startJob, setStartJob] = useState<string>(new Date().toISOString().split('T')[0]);
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

  // Sync state ketika selectedBreakdownToUpdate berubah
  useEffect(() => {
    if (selectedBreakdownToUpdate) {
      setSelectedId(selectedBreakdownToUpdate.id);
      loadBreakdownToForm(selectedBreakdownToUpdate);
    } else if (breakdowns.length > 0 && !selectedId) {
      // Default ke breakdown existing pertama yang masih berstatus BREAKDOWN
      const firstActive = breakdowns.find((b) => b.statusUnit === 'BREAKDOWN') || breakdowns[0];
      setSelectedId(firstActive.id);
      loadBreakdownToForm(firstActive);
    }
  }, [selectedBreakdownToUpdate, breakdowns]);

  const loadBreakdownToForm = (b: BreakdownRecord) => {
    setStartJob(b.startJob || b.tanggal || new Date().toISOString().split('T')[0]);
    setDetailKerusakan(b.detailKerusakan || '');
    setProgress((b.progress as BreakdownProgressOption) || 'On Progress');
    setStatusUnit((b.statusUnit as BreakdownStatusUnitOption) || 'BREAKDOWN');
    setPic1(b.pic1 || '');
    setPic2(b.pic2 || '');
    setPic3(b.pic3 || '');
    setRemark(b.remark || '');
    setPartsJasaList(b.partsJasa || []);
  };

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

    const res = onUpdateActivity(selectedId, {
      startJob,
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
      setFeedback({
        type: 'success',
        message: res.message,
      });

      // Buka form baru Update Breakdown (reset form untuk update unit berikutnya)
      onSelectBreakdown(null);
      // Bersihkan form
      setDetailKerusakan('');
      setRemark('');
      setPartsJasaList([]);
      setNewPartItem({
        jenis: 'Part',
        namaPart: '',
        partNumber: '',
        qty: 1,
        satuan: 'Pcs',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Gagal menyimpan update breakdown.',
      });
    }
  };

  // Filter unit yang masih active breakdown untuk pilihan dropdown
  const activeExistingBreakdowns = breakdowns.filter((b) => b.statusUnit === 'BREAKDOWN');

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

          {/* Unit Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-stone-400 whitespace-nowrap">Pilih Unit:</label>
            <select
              id="select-breakdown-target"
              value={selectedId}
              onChange={(e) => {
                const target = breakdowns.find((b) => b.id === e.target.value);
                setSelectedId(e.target.value);
                if (target) {
                  onSelectBreakdown(target);
                  loadBreakdownToForm(target);
                }
              }}
              className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Pilih Unit Breakdown --</option>
              {breakdowns.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.noNotifikasi}] {b.noUnit} ({b.statusUnit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Header Read-Only Breakdown Terpilih */}
        {currentActiveRecord && (
          <div className="mb-6 p-4 rounded-xl bg-stone-950/70 border border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-stone-500 block text-[10px]">NO NOTIFIKASI:</span>
              <span className="text-amber-400 font-black">{currentActiveRecord.noNotifikasi}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">UNIT & JENIS:</span>
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
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-stone-800/80">
              <span className="text-stone-500 block text-[10px]">PROBLEM AWAL (READ-ONLY):</span>
              <span className="text-stone-300 font-sans italic">{currentActiveRecord.detailProblem}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveUpdate} className="space-y-6">
          {/* BARIS 1: Start Job, PROGRESS, STATUS UNIT */}
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

          {/* DETAIL KERUSAKAN (Type Text saja) */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-300 mb-1">
              DETAIL KERUSAKAN (Hasil Pengecekan Mekanik)
            </label>
            <textarea
              id="field-update-detailkerusakan"
              rows={2}
              value={detailKerusakan}
              onChange={(e) => setDetailKerusakan(e.target.value)}
              placeholder="Catat temuan detail kerusakan mekanikal/elektrikal unit..."
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

          {/* TOMBOL SIMPAN DI PALING BAWAH (akan membuka form baru Update Breakdown) */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
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
              Menampilkan hanya unit dengan status BREAKDOWN aktif ({activeExistingBreakdowns.length} unit)
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
                  <th className="px-3 py-3">No Notifikasi</th>
                  <th className="px-3 py-3">Unit</th>
                  <th className="px-3 py-3">Start Job</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">PIC</th>
                  <th className="px-3 py-3">Part/Jasa</th>
                  <th className="px-3 py-3 text-center">Pilih Edit</th>
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
                    <td className="px-3 py-3 font-bold text-amber-400">{b.noNotifikasi}</td>
                    <td className="px-3 py-3 font-bold text-stone-100">{b.noUnit}</td>
                    <td className="px-3 py-3 text-stone-300">{b.startJob || b.tanggal}</td>
                    <td className="px-3 py-3 font-sans font-semibold text-amber-300">
                      {b.progress || 'On Progress'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {b.statusUnit}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-sans text-stone-300">
                      {[b.pic1, b.pic2, b.pic3].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-stone-400 text-[11px]">
                        {b.partsJasa && b.partsJasa.length > 0 ? `${b.partsJasa.length} item` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(b.id);
                          onSelectBreakdown(b);
                          loadBreakdownToForm(b);
                        }}
                        className="px-2.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 font-sans font-bold text-[11px] transition"
                      >
                        Buka di Form
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
