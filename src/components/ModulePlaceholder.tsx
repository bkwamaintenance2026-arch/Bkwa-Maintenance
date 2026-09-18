import React from 'react';
import { ModuleInfo, UserAccount } from '../types';
import { 
  Wrench, 
  Layers, 
  BarChart3, 
  ShieldCheck, 
  Lock, 
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ModulePlaceholderProps {
  module: ModuleInfo;
  currentUser: UserAccount;
  onGoToModule1: () => void;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  module,
  currentUser,
  onGoToModule1,
}) => {
  const getIcon = (id: number) => {
    switch (id) {
      case 2:
        return <Wrench className="w-10 h-10 text-amber-400" />;
      case 3:
        return <Layers className="w-10 h-10 text-amber-400" />;
      case 4:
        return <BarChart3 className="w-10 h-10 text-amber-400" />;
      default:
        return <Sparkles className="w-10 h-10 text-amber-400" />;
    }
  };

  const getUpcomingFeatures = (id: number) => {
    switch (id) {
      case 2:
        return [
          'Work Order Perawatan Preventif & Servis Berkala (250h, 500h, 1000h, 2000h)',
          'Pencatatan Trouble Report & Log Breakdown Armada Lapangan',
          'Notifikasi Warning Pergantian Oli Mesin, Gardan, dan Hidrolik',
          'Assign Mekanik Lapangan & Status Pengerjaan (Open, In Progress, Done)',
        ];
      case 3:
        return [
          'Katalog Suku Cadang & Filter Kit Alat Berat BKWA',
          'Monitoring Stok Kritis Sparepart & Jaw Plate Crusher',
          'Pencatatan Pemakaian Part per Nomor Lambung Unit',
          'Integrasi Permintaan Barang (Purchase Request) ke Gudang',
        ];
      case 4:
        return [
          'Kalkulasi Biaya Perawatan per Unit (Cost per Hour)',
          'Analisis Mechanical Availability (MA) & Physical Availability (PA)',
          'Rekapitulasi Konsumsi Bahan Bakar (Solar) & Efisiensi Jam Kerja',
          'Laporan Bulanan Executive Summary untuk Manajemen BKWA',
        ];
      default:
        return [];
    }
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-stone-100 max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
        {/* Module Badge & Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10">
          {getIcon(module.id)}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 border border-stone-700 text-xs font-mono font-bold text-amber-400 mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>SLOT MODULAR SIAP PASANG ({module.code})</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-stone-100 font-mono tracking-wide">
          {module.title}
        </h2>
        <p className="text-sm font-semibold text-amber-400/90 mt-1">
          {module.subtitle}
        </p>

        <p className="text-xs sm:text-sm text-stone-300 mt-3 leading-relaxed">
          {module.description}
        </p>

        {/* Technical Slot Notice */}
        <div className="w-full mt-6 p-4 rounded-xl bg-stone-950/70 border border-stone-800 text-left text-xs space-y-2">
          <div className="flex items-center gap-2 text-stone-200 font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Arsitektur Sistem Terstruktur & Terisolasi</span>
          </div>
          <p className="text-stone-400 text-[11px] leading-relaxed">
            Slot arsitektur untuk <strong>{module.title}</strong> telah terpasang dengan struktur state data terpisah. Sesuai instruksi Anda, perintah dan arsitektur fondasi ini dijaga tetap stabil sehingga ketika script baru untuk modul ini dimasukkan, sistem akan langsung terhubung secara mulus tanpa merubah registrasi unit pada Modul 1.
          </p>
        </div>

        {/* Planned Features List */}
        <div className="w-full mt-6 text-left">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400 mb-3">
            Rencana Kemampuan Modul:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {getUpcomingFeatures(module.id).map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-800/60 border border-stone-800 text-xs text-stone-300"
              >
                <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Module 1 Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={onGoToModule1}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
          >
            <span>Kembali ke Modul 1: Registrasi Asset</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
