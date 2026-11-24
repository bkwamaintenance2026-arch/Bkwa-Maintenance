import React from 'react';
import { ArrowUpDown, Calendar, RotateCcw } from 'lucide-react';

export type DatePresetKey = 'ALL' | 'TODAY' | 'LAST_7' | 'THIS_MONTH' | 'LAST_MONTH';

export interface SortOption {
  value: string;
  label: string;
}

export function matchesDateRange(
  tanggal: string | undefined,
  startDate: string,
  endDate: string
): boolean {
  if (!startDate && !endDate) return true;
  if (!tanggal) return false;
  const clean = tanggal.trim().split('T')[0];
  if (startDate && clean < startDate) return false;
  if (endDate && clean > endDate) return false;
  return true;
}

export function formatPeriodeLabel(startDate: string, endDate: string): string {
  if (startDate && endDate) {
    return startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
  }
  if (startDate) return `Mulai ${startDate}`;
  if (endDate) return `Sampai ${endDate}`;
  return 'Semua Periode';
}

export function getTimestampMs(tanggal?: string, jam?: string): number {
  if (!tanggal) return 0;
  const cleanDate = tanggal.trim().split('T')[0];
  const cleanJam = (jam || '00:00').trim().slice(0, 5);
  const ts = new Date(`${cleanDate}T${cleanJam}:00`).getTime();
  return Number.isNaN(ts) ? new Date(cleanDate).getTime() || 0 : ts;
}

interface FogDateSortToolbarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOptions: SortOption[];
  extraFilters?: React.ReactNode;
  resultSummary?: React.ReactNode;
  onResetAll?: () => void;
  hasActiveFilter?: boolean;
}

export const FogDateSortToolbar: React.FC<FogDateSortToolbarProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  sortBy,
  onSortByChange,
  sortOptions,
  extraFilters,
  resultSummary,
  onResetAll,
  hasActiveFilter,
}) => {
  const applyPreset = (preset: DatePresetKey) => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = String(now.getMonth() + 1).padStart(2, '0');
    const curD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${curY}-${curM}-${curD}`;

    if (preset === 'ALL') {
      onStartDateChange('');
      onEndDateChange('');
    } else if (preset === 'TODAY') {
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === 'LAST_7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      const pY = past.getFullYear();
      const pM = String(past.getMonth() + 1).padStart(2, '0');
      const pD = String(past.getDate()).padStart(2, '0');
      onStartDateChange(`${pY}-${pM}-${pD}`);
      onEndDateChange(todayStr);
    } else if (preset === 'THIS_MONTH') {
      onStartDateChange(`${curY}-${curM}-01`);
      onEndDateChange(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const prevStart = new Date(curY, now.getMonth() - 1, 1);
      const prevEnd = new Date(curY, now.getMonth(), 0);
      const pY = prevStart.getFullYear();
      const pM = String(prevStart.getMonth() + 1).padStart(2, '0');
      const lastD = String(prevEnd.getDate()).padStart(2, '0');
      onStartDateChange(`${pY}-${pM}-01`);
      onEndDateChange(`${pY}-${pM}-${lastD}`);
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
      {/* Row 1: Filter Tanggal di Awal + Quick Presets */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>Filter Tanggal:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              title="Tanggal Mulai"
              className="px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-[11px] font-mono text-stone-500">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              title="Tanggal Selesai"
              className="px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => applyPreset('ALL')}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition whitespace-nowrap ${
                !startDate && !endDate
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => applyPreset('TODAY')}
              className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition whitespace-nowrap"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_7')}
              className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition whitespace-nowrap"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset('THIS_MONTH')}
              className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition whitespace-nowrap"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_MONTH')}
              className="px-2 py-1 rounded-lg text-[11px] font-mono font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition whitespace-nowrap"
            >
              Bulan Lalu
            </button>
          </div>
        </div>

        {/* Row 1 Right: Sort By Dropdown & Extra Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10.5px] text-stone-400 font-mono uppercase whitespace-nowrap">
              Urutkan / Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-stone-950 text-xs text-amber-300 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {extraFilters}

          {onResetAll && hasActiveFilter && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-[11px] font-mono font-bold transition whitespace-nowrap"
              title="Reset semua filter & urutan"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Status Row */}
      {resultSummary && (
        <div className="pt-2 border-t border-stone-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-400">
          {resultSummary}
        </div>
      )}
    </div>
  );
};
