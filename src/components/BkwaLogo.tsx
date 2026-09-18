import React, { useState, useEffect } from 'react';
import defaultLogoAsset from '../assets/images/bkwa_logo_emblem_1789455762105.jpg';
import { getCustomLogo } from '../utils/storage';

interface BkwaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'dominant';
  showText?: boolean;
  className?: string;
  variant?: 'card' | 'transparent';
  allowUpload?: boolean;
}

export const BkwaLogo: React.FC<BkwaLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  variant = 'card',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    return getCustomLogo() || defaultLogoAsset;
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleLogoUpdate = () => {
      const custom = getCustomLogo();
      setLogoSrc(custom || defaultLogoAsset);
      setImgError(false);
    };

    window.addEventListener('bkwa-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('bkwa-logo-updated', handleLogoUpdate);
  }, []);

  // Dimensions based on size
  const dimensions = {
    sm: { width: 38, height: 38, textSize: 'text-xs', subSize: 'text-[10px]' },
    md: { width: 56, height: 56, textSize: 'text-sm', subSize: 'text-xs' },
    lg: { width: 92, height: 92, textSize: 'text-base', subSize: 'text-xs' },
    xl: { width: 130, height: 130, textSize: 'text-xl', subSize: 'text-sm' },
    dominant: { width: 190, height: 190, textSize: 'text-2xl', subSize: 'text-sm' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      {/* Official Company Logo Container */}
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-300 ${
          variant === 'card'
            ? 'bg-stone-900 border-2 border-amber-600/30 shadow-2xl shadow-stone-950/80'
            : ''
        }`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: Math.max(12, Math.round(dimensions.width * 0.22)),
        }}
      >
        {!imgError ? (
          <img
            src={logoSrc}
            alt="Logo Resmi PT Batu Kali Welang Ampuh"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center select-none"
          />
        ) : (
          /* High-contrast stylized vector fallback */
          <div className="w-full h-full bg-stone-950 flex flex-col items-center justify-center p-2 text-center">
            <span className="font-mono font-black text-amber-400 text-lg leading-none">PT BKWA</span>
            <span className="text-[8px] text-stone-400 font-mono tracking-widest mt-1">BATU KALI</span>
          </div>
        )}
      </div>

      {/* Optional Accompanying Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <span
            className={`font-black tracking-wider text-stone-100 uppercase ${dimensions.textSize} font-mono`}
          >
            PT BKWA
          </span>
          <span
            className={`font-semibold text-amber-500 uppercase tracking-wider ${dimensions.subSize}`}
          >
            Batu Kali Welang Ampuh
          </span>
          <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
            Mining Equipment & Quarry Fleet Maintenance
          </span>
        </div>
      )}
    </div>
  );
};
