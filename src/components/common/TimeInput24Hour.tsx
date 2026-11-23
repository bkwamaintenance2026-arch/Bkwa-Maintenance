import React from 'react';
import { Clock } from 'lucide-react';

interface TimeInput24HourProps {
  id?: string;
  value: string; // Format: "HH:mm" (24 jam: 01:00 - 24:00 atau 00:xx) atau ""
  onChange: (timeStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

// Daftar Jam 01 s/d 24 (Format 24 Jam Indonesia tanpa AM/PM), plus 00 untuk menit setelah tengah malam (00:xx)
export const HOUR_01_24_OPTIONS: string[] = [
  ...Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0')),
  '00',
];

export const MINUTE_00_59_OPTIONS: string[] = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

export const getCurrentTime24Hour = (): string => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h === 0 && m === 0) return '24:00';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const TimeInput24Hour: React.FC<TimeInput24HourProps> = ({
  id,
  value,
  onChange,
  placeholder = '08:00',
  disabled = false,
  compact = false,
  className = '',
}) => {
  // Parsing jam dan menit dari value
  const parts = (value || '').split(':');
  const currentHour = parts[0] !== undefined && parts[0] !== '' ? parts[0].padStart(2, '0') : '';
  const currentMinute = parts[1] !== undefined && parts[1] !== '' ? parts[1].padStart(2, '0') : '';

  // Handler jika user mengetik langsung di text input
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:.]/g, '').replace('.', ':');

    // Jika user mengetik 4 angka tanpa titik dua, misal "0830" -> "08:30"
    if (raw.length === 4 && !raw.includes(':')) {
      raw = `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
    } else if (
      raw.length === 2 &&
      !raw.includes(':') &&
      (e.nativeEvent as any)?.inputType !== 'deleteContentBackward'
    ) {
      raw = `${raw}:`;
    }

    if (raw.length > 5) {
      raw = raw.slice(0, 5);
    }

    // Validasi nilai jam (00-24) dan menit (00-59)
    if (raw.includes(':')) {
      const [h, m] = raw.split(':');
      let validH = h;
      let validM = m;

      if (h.length === 2) {
        const numH = parseInt(h, 10);
        if (numH > 24) validH = '24';
      }
      if (m && m.length === 2) {
        const numM = parseInt(m, 10);
        if (validH === '24') {
          validM = '00';
        } else if (numM > 59) {
          validM = '59';
        }
      }
      raw = `${validH}:${validM !== undefined ? validM : ''}`;
    }

    onChange(raw);
  };

  // Handler dropdown jam (01 - 24)
  const handleHourSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newH = e.target.value;
    if (!newH) {
      onChange('');
      return;
    }
    const m = newH === '24' ? '00' : currentMinute || '00';
    onChange(`${newH}:${m}`);
  };

  // Handler dropdown menit (00 - 59)
  const handleMinuteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newM = e.target.value;
    const h = currentHour || '08';
    onChange(`${h}:${h === '24' ? '00' : newM}`);
  };

  return (
    <div className={`${compact ? '' : 'space-y-1'} ${className}`.trim()}>
      {/* Baris Input Utama: Text Box + Dropdown Jam (01-24) : Menit (00-59) Tanpa AM/PM */}
      <div className="flex items-center gap-1 min-w-0">
        {!compact && (
          <div className="relative flex-1 min-w-[68px]">
            <input
              id={id}
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={value}
              onChange={handleTextChange}
              placeholder={placeholder}
              disabled={disabled}
              title="Format 24 Jam (01:00 - 24:00, Tanpa AM/PM)"
              className="w-full bg-stone-800/90 border border-stone-700 rounded-xl pl-2.5 pr-7 py-2 text-xs text-amber-300 font-mono font-bold tracking-wider placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
            <Clock className="w-3.5 h-3.5 text-stone-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Dropdown Pemilih Jam (01 - 24) */}
        <select
          id={compact ? id : undefined}
          value={currentHour}
          onChange={handleHourSelect}
          disabled={disabled}
          title="Pilih Jam (01 - 24, Tanpa AM/PM)"
          className={`bg-stone-900 border border-stone-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50 ${
            compact
              ? 'flex-1 min-w-[54px] rounded-lg px-1.5 py-1.5 text-[11px] text-amber-300'
              : 'rounded-xl px-2 py-2 text-xs text-stone-200'
          }`}
        >
          <option value="">Jam</option>
          {HOUR_01_24_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="font-mono font-bold text-amber-400 text-xs shrink-0">:</span>

        {/* Dropdown Pemilih Menit (00 - 59) */}
        <select
          value={currentHour === '24' ? '00' : currentMinute}
          onChange={handleMinuteSelect}
          disabled={disabled || currentHour === '24'}
          title="Pilih Menit (00 - 59)"
          className={`bg-stone-900 border border-stone-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50 ${
            compact
              ? 'flex-1 min-w-[54px] rounded-lg px-1.5 py-1.5 text-[11px] text-stone-200'
              : 'rounded-xl px-2 py-2 text-xs text-stone-200'
          }`}
        >
          <option value="">Mnt</option>
          {MINUTE_00_59_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
