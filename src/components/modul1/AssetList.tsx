import React, { useState, useMemo } from 'react';
import { AssetUnit, OperationalStatus, UnitCategory, UserAccount } from '../../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  Truck, 
  Activity, 
  Clock, 
  MapPin, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ChevronDown
} from 'lucide-react';

interface AssetListProps {
  units: AssetUnit[];
  currentUser: UserAccount;
  onOpenCreate: () => void;
  onOpenDetail: (unit: AssetUnit) => void;
  onOpenEdit: (unit: AssetUnit) => void;
  onOpenDelete: (unit: AssetUnit) => void;
  onOpenExport: () => void;
  onOpenActivityLogs: () => void;
  onResetData: () => void;
}

export const AssetList: React.FC<AssetListProps> = ({
  units,
  currentUser,
  onOpenCreate,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  onOpenExport,
  onOpenActivityLogs,
  onResetData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const isAdmin = currentUser.role === 'ADMIN';

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = units.length;
    const operasi = units.filter((u) => u.statusOperasional === 'OPERASI').length;
    const standby = units.filter((u) => u.statusOperasional === 'STANDBY').length;
    const maintenance = units.filter((u) => u.statusOperasional === 'MAINTENANCE').length;
    const breakdown = units.filter((u) => u.statusOperasional === 'BREAKDOWN').length;
    const totalHM = units.reduce((acc, curr) => acc + (curr.hourMeter || 0), 0);

    return { total, operasi, standby, maintenance, breakdown, totalHM };
  }, [units]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchSearch =
        unit.kodeUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.namaUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.noSeriRangka.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.noMesin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.lokasiKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.picOperator.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        selectedCategory === 'ALL' || unit.kategori === selectedCategory;

      const matchStatus =
        selectedStatus === 'ALL' || unit.statusOperasional === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [units, searchTerm, selectedCategory, selectedStatus]);

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'OPERASI':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'STANDBY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'MAINTENANCE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'BREAKDOWN':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-stone-700 text-stone-300 border-stone-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Statistics Banner in Earth Tone Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Unit */}
        <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">
            Total Armada BKWA
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-stone-100 font-mono">
              {metrics.total}
            </span>
            <span className="text-xs text-stone-400 font-semibold">Unit</span>
          </div>
          <p className="text-[11px] text-amber-400/90 mt-1 font-mono">
            {metrics.totalHM.toLocaleString('id-ID')} Total HM
          </p>
        </div>

        {/* Unit Operasi */}
        <div className="bg-stone-900/90 border border-emerald-950/60 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Operasional Aktif
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
              {metrics.operasi}
            </span>
            <span className="text-xs text-emerald-500/80 font-semibold">Bekerja</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Pit Welang & Plant Crusher
          </p>
        </div>

        {/* Unit Standby */}
        <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">
            Standby / Cadangan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-blue-300 font-mono">
              {metrics.standby}
            </span>
            <span className="text-xs text-blue-500/80 font-semibold">Siap Kerja</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Ready to deploy
          </p>
        </div>

        {/* Maintenance */}
        <div className="bg-stone-900/90 border border-amber-950/60 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
            Dalam Perawatan
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {metrics.maintenance}
            </span>
            <span className="text-xs text-amber-500/80 font-semibold">Servis</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Di Workshop Sentral
          </p>
        </div>

        {/* Breakdown */}
        <div className="bg-stone-900/90 border border-rose-950/60 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
              Breakdown
            </span>
            {metrics.breakdown > 0 && (
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-rose-300 font-mono">
              {metrics.breakdown}
            </span>
            <span className="text-xs text-rose-500/80 font-semibold">Rusak</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Perlu Tindakan Mekanik
          </p>
        </div>
      </div>

      {/* Action Header & Filter Controls */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Module Heading */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                MODUL 1
              </span>
              <h2 className="text-lg sm:text-xl font-black text-stone-100 font-mono tracking-wide">
                REGISTRASI ASSET & UNIT PT BKWA
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Daftar seluruh unit armada alat berat, crusher plant, dan support vehicle tambang Batu Kali Welang.
            </p>
          </div>

          {/* Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Registrasi Unit Baru (Accessible by both Admin & Karyawan as part of "Input") */}
            <button
              id="btn-registrasi-unit-baru"
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrasi Unit Baru</span>
            </button>

            {/* Export Laporan */}
            <button
              id="btn-action-export"
              type="button"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Laporan</span>
            </button>

            {/* Reset Database Button (Admin only fallback helper) */}
            {isAdmin && (
              <button
                type="button"
                onClick={onResetData}
                className="p-2.5 rounded-xl text-stone-400 hover:text-amber-400 hover:bg-stone-800 border border-stone-800 transition"
                title="Reset ke Data Standar Unit Fleet BKWA"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Fast Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="input-search-unit"
              type="text"
              placeholder="Cari No Lambung, tipe alat, serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Kategori Filter */}
          <div>
            <select
              id="filter-kategori-unit"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Kategori Unit</option>
              <option value="Excavator">Excavator</option>
              <option value="Dump Truck">Dump Truck</option>
              <option value="Wheel Loader">Wheel Loader</option>
              <option value="Stone Crusher Plant">Stone Crusher Plant</option>
              <option value="Bulldozer">Bulldozer</option>
              <option value="Genset & Power">Genset & Power</option>
              <option value="Vibro Roller">Vibro Roller</option>
              <option value="Support & Utility">Support & Utility</option>
            </select>
          </div>

          {/* Status Operasional Filter */}
          <div>
            <select
              id="filter-status-unit"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Semua Status Operasi</option>
              <option value="OPERASI">OPERASI (Ready)</option>
              <option value="STANDBY">STANDBY (Siap Kerja)</option>
              <option value="MAINTENANCE">MAINTENANCE (Servis)</option>
              <option value="BREAKDOWN">BREAKDOWN (Rusak)</option>
            </select>
          </div>

          {/* Result Counter & View Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-stone-400 font-mono">
            <span>Ditemukan: <strong className="text-amber-400">{filteredUnits.length}</strong> Unit</span>
            <div className="flex rounded-lg bg-stone-800 p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded text-xs ${
                  viewMode === 'table' ? 'bg-stone-700 text-stone-100 font-bold' : 'text-stone-400'
                }`}
              >
                Tabel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded text-xs ${
                  viewMode === 'cards' ? 'bg-stone-700 text-stone-100 font-bold' : 'text-stone-400'
                }`}
              >
                Kartu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Card View */}
      {viewMode === 'table' ? (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">No. Lambung</th>
                  <th className="py-3 px-4">Nama & Tipe Alat</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">No. Rangka / VIN</th>
                  <th className="py-3 px-4">Hour Meter (HM)</th>
                  <th className="py-3 px-4">Lokasi Operasi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Menu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-stone-800/40 transition group"
                    >
                      {/* Kode Unit / No Lambung */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-amber-400 font-mono font-black border border-stone-700">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono font-black text-sm text-stone-100 block">
                              {u.kodeUnit}
                            </span>
                            <span className="text-[10px] text-stone-400">Thn {u.tahunPembuatan}</span>
                          </div>
                        </div>
                      </td>

                      {/* Nama & Tipe Alat */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-stone-100 text-xs">{u.namaUnit}</p>
                        <p className="text-[11px] text-stone-400 truncate max-w-[200px]">
                          {u.merkModel || u.namaUnit}
                        </p>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4 text-stone-300 font-medium">
                        {u.kategori}
                      </td>

                      {/* No Rangka */}
                      <td className="py-3 px-4 font-mono text-stone-300 text-[11px]">
                        <div>{u.noSeriRangka}</div>
                        <div className="text-[10px] text-stone-500">Msn: {u.noMesin}</div>
                      </td>

                      {/* Hour Meter */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-mono font-bold text-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                          <span>{u.hourMeter.toLocaleString('id-ID')} Jam</span>
                        </div>
                      </td>

                      {/* Lokasi */}
                      <td className="py-3 px-4 text-stone-300">
                        <div className="flex items-center gap-1 text-[11px] truncate max-w-[160px]" title={u.lokasiKerja}>
                          <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>{u.lokasiKerja}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 pl-4 truncate max-w-[160px]">
                          PIC: {u.picOperator}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                            u.statusOperasional
                          )}`}
                        >
                          {u.statusOperasional}
                        </span>
                      </td>

                      {/* Actions: Detail, Update, Hapus */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail Button */}
                          <button
                            id={`btn-detail-${u.kodeUnit}`}
                            type="button"
                            onClick={() => onOpenDetail(u)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
                            title="Detail Spesifikasi Unit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Update Unit Button */}
                          <button
                            id={`btn-update-${u.kodeUnit}`}
                            type="button"
                            onClick={() => onOpenEdit(u)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded transition"
                            title="Update Data Unit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Hapus Unit Button (with visual role awareness) */}
                          <button
                            id={`btn-hapus-${u.kodeUnit}`}
                            type="button"
                            onClick={() => onOpenDelete(u)}
                            className={`p-1.5 rounded-lg transition ${
                              isAdmin
                                ? 'text-stone-400 hover:text-rose-400 hover:bg-rose-950/40'
                                : 'text-stone-600 hover:text-rose-400 hover:bg-stone-800'
                            }`}
                            title={
                              isAdmin
                                ? 'Hapus Unit (Admin Developer)'
                                : 'Hapus Unit (Memerlukan Hak Akses Admin)'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400 text-xs">
                      Tidak ada unit yang ditemukan sesuai filter atau pencarian Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((u) => (
            <div
              key={u.id}
              className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-500/40 transition group"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400 font-mono font-black border border-stone-700">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono font-black text-lg text-stone-100">
                        {u.kodeUnit}
                      </span>
                      <p className="text-[10px] text-stone-400">{u.kategori} • Thn {u.tahunPembuatan}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                      u.statusOperasional
                    )}`}
                  >
                    {u.statusOperasional}
                  </span>
                </div>

                <h3 className="font-bold text-stone-200 text-sm mt-3 line-clamp-1">
                  {u.namaUnit}
                </h3>

                {/* Specs List */}
                <div className="mt-3 space-y-1.5 text-xs text-stone-400 border-t border-stone-800 pt-3">
                  <div className="flex justify-between">
                    <span>Hour Meter:</span>
                    <strong className="text-amber-300 font-mono">
                      {u.hourMeter.toLocaleString('id-ID')} Jam
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>No. Rangka:</span>
                    <span className="font-mono text-stone-300 text-[11px]">{u.noSeriRangka}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lokasi:</span>
                    <span className="text-stone-300 truncate max-w-[160px]">{u.lokasiKerja}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PIC:</span>
                    <span className="text-stone-300">{u.picOperator}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenDetail(u)}
                  className="flex items-center gap-1 text-xs text-stone-300 hover:text-white"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detail</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEdit(u)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Update</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDelete(u)}
                    className="p-1 text-stone-500 hover:text-rose-400 rounded transition"
                    title="Hapus Unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
