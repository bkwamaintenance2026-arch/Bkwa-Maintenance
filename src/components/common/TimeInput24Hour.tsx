import React from 'react';
import { Clock } from 'lucide-react';

interface TimeInput24HourProps {
  id?: string;
  value: string; // Format: "HH:mm" (24 jam: 00:00 - 23:59) atau ""
  onChange: (timeStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TimeInput24Hour: React.FC<TimeInput24HourProps> = ({
  id,
  value,
  onChange,
  placeholder = '00:00',
  disabled = false,
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
    } else if (raw.length === 2 && !raw.includes(':') && (e.nativeEvent as any)?.inputType !== 'deleteContentBackward') {
      raw = `${raw}:`;
    }

    if (raw.length > 5) {
      raw = raw.slice(0, 5);
    }

    // Validasi nilai jam (00-23) dan menit (00-59)
    if (raw.includes(':')) {
      const [h, m] = raw.split(':');
      let validH = h;
      let validM = m;

      if (h.length === 2) {
        const numH = parseInt(h, 10);
        if (numH > 23) validH = '23';
      }
      if (m && m.length === 2) {
        const numM = parseInt(m, 10);
        if (numM > 59) validM = '59';
      }
      raw = `${validH}:${validM !== undefined ? validM : ''}`;
    }

    onChange(raw);
  };

  // Handler dropdown jam
  const handleHourSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newH = e.target.value;
    if (!newH) {
      onChange('');
      return;
    }
    const m = currentMinute || '00';
    onChange(`${newH}:${m}`);
  };

  // Handler dropdown menit
  const handleMinuteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newM = e.target.value;
    const h = currentHour || '08';
    onChange(`${h}:${newM}`);
  };

  return (
    <div className="space-y-1.5">
      {/* Baris Input Utama: Text Box 24 Jam + Dropdown Jam:Menit */}
      <div className="flex items-center gap-1.5">
        {/* Input Text Bebas 24 Jam (Tanpa AM/PM) */}
        <div className="relative flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold tracking-wider placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <Clock className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Dropdown Pemilih Jam (00 - 23) */}
        <select
          value={currentHour}
          onChange={handleHourSelect}
          disabled={disabled}
          title="Pilih Jam (00 - 23)"
          className="bg-stone-900 border border-stone-700 rounded-xl px-2 py-2 text-xs text-stone-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
        >
          <option value="">Jam</option>
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="font-mono font-bold text-amber-400 text-xs">:</span>

        {/* Dropdown Pemilih Menit (00 - 59) */}
        <select
          value={currentMinute}
          onChange={handleMinuteSelect}
          disabled={disabled}
          title="Pilih Menit (00 - 59)"
          className="bg-stone-900 border border-stone-700 rounded-xl px-2 py-2 text-xs text-stone-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
        >
          <option value="">Mnt</option>
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
