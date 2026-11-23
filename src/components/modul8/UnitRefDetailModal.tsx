import React, { useState, useMemo } from 'react';
import { Truck, X, Search, Trash2 } from 'lucide-react';

export interface UnitRefEntry {
  key: string;
  recordId?: string;
  noUnit: string;
  jenisUnit: string;
  brandMerk: string;
  modelUnit: string;
  qty?: number;
  minStock?: number;
  satuan?: string;
  isNonUnit?: boolean;
}

interface UnitRefDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entries: UnitRefEntry[];
  showStockColumns?: boolean;
  canRemoveEntry?: boolean;
  onRemoveEntry?: (entry: UnitRefEntry) => void;
}

export const UnitRefDetailModal: React.FC<UnitRefDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  entries,
  showStockColumns = false,
  canRemoveEntry = false,
  onRemoveEntry,
}) => {
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.noUnit} ${e.jenisUnit} ${e.brandMerk} ${e.modelUnit}`.toLowerCase().includes(q)
    );
  }, [entries, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-3xl w-full max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        {/* Sticky Header */}
        <div className="p-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 bg-stone-900">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-stone-100 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Quick Search */}
        {entries.length > 5 && (
          <div className="px-4 py-2.5 border-b border-stone-800 bg-stone-950/60 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari No Unit, Jenis, Brand, atau Model..."
                className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {filteredEntries.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-500">
              Tidak ada unit referensi yang sesuai pencarian.
            </div>
          ) : (
            <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950/50">
              <table className="w-full text-left text-xs border-collapse min-w-[520px]">
                <thead>
                  <tr className="bg-stone-900 text-stone-300 border-b border-stone-800 font-mono">
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">No Unit (CN)</th>
                    <th className="py-2 px-3">Jenis Unit</th>
                    <th className="py-2 px-3">Brand</th>
                    <th className="py-2 px-3">Model Unit</th>
                    {showStockColumns && (
                      <>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-center">Min Stock</th>
                      </>
                    )}
                    {canRemoveEntry && onRemoveEntry && (
                      <th className="py-2 px-3 w-16 text-center">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/70">
                  {filteredEntries.map((entry, idx) => (
                    <tr key={entry.key} className="hover:bg-stone-900/50 transition-colors">
                      <td className="py-2 px-3 text-center font-mono tabular-nums text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        <span className={entry.isNonUnit ? 'text-sky-400' : 'text-amber-400'}>
                          {entry.noUnit || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-stone-300">{entry.jenisUnit || '-'}</td>
                      <td className="py-2 px-3 text-stone-300">{entry.brandMerk || '-'}</td>
                      <td className="py-2 px-3 font-mono text-stone-200">{entry.modelUnit || '-'}</td>
                      {showStockColumns && (
                        <>
                          <td className="py-2 px-3 text-center font-mono tabular-nums text-stone-200">
                            {entry.qty ?? '-'}{' '}
                            {entry.qty !== undefined && (
                              <span className="text-[10px] text-stone-400">{entry.satuan || 'Pcs'}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono tabular-nums text-amber-300">
                            {entry.minStock ?? 0}
                          </td>
                        </>
                      )}
                      {canRemoveEntry && onRemoveEntry && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveEntry(entry)}
                            className="p-1 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                            title={`Hapus part ini dari unit ${entry.noUnit}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-4 py-3 border-t border-stone-800 bg-stone-900 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-stone-400 font-mono tabular-nums">
            Total: <strong className="text-stone-200">{filteredEntries.length}</strong> Reff Unit
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
