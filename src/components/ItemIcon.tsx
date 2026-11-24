import React from 'react';
import { ExtendedBlockStyleId, getExtendedBlockByItemId } from '../game/blockCatalog';
import { getItemDef } from '../game/inventory';
import { getXSuitItemDef } from '../game/xSuits';

interface ItemIconProps {
  itemId: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-14 h-14',
};

export const CoinBadgeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#92400e" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="7" fill="#fde047" stroke="#ca8a04" strokeWidth="1.2" />
    <rect x="10.7" y="7.5" width="2.6" height="9" rx="1" fill="#b45309" />
  </svg>
);

function shadeHexColor(hex: string, factor: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = Number.parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * factor)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function mixWithWhite(hex: string, ratio: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = Number.parseInt(clean, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * (1 - ratio) + 255 * ratio));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * (1 - ratio) + 255 * ratio));
  const b = Math.min(255, Math.round((num & 0xff) * (1 - ratio) + 255 * ratio));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function renderExtendedBlockDetail(style: ExtendedBlockStyleId, hex: string): React.ReactNode {
  const darkLine = shadeHexColor(hex, 0.56);
  const hiLine = mixWithWhite(hex, 0.45);
  switch (style) {
    case 'brick':
    case 'stone_brick':
      return (
        <>
          <line x1="4" y1="16" x2="16" y2="22.5" stroke={darkLine} strokeWidth="1" opacity="0.55" />
          <line x1="16" y1="22.5" x2="28" y2="16" stroke={darkLine} strokeWidth="1" opacity="0.55" />
          <line x1="10" y1="13" x2="10" y2="19.2" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
          <line x1="22" y1="13" x2="22" y2="19.2" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
        </>
      );
    case 'planks':
      return (
        <>
          <line x1="4" y1="14" x2="16" y2="20.5" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
          <line x1="4" y1="18.5" x2="16" y2="25" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
          <line x1="16" y1="20.5" x2="28" y2="14" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
          <line x1="16" y1="25" x2="28" y2="18.5" stroke={darkLine} strokeWidth="0.9" opacity="0.45" />
        </>
      );
    case 'tile':
      return (
        <>
          <line x1="10" y1="6.3" x2="22" y2="12.8" stroke={hiLine} strokeWidth="0.9" opacity="0.7" />
          <line x1="22" y1="6.3" x2="10" y2="12.8" stroke={hiLine} strokeWidth="0.9" opacity="0.7" />
          <line x1="10" y1="12.8" x2="10" y2="25.8" stroke={darkLine} strokeWidth="0.8" opacity="0.35" />
          <line x1="22" y1="12.8" x2="22" y2="25.8" stroke={darkLine} strokeWidth="0.8" opacity="0.35" />
        </>
      );
    case 'shingle':
      return (
        <>
          <path d="M5,14 L10,17.5 L15,14 M17,19.5 L22,16 L27,19.5" fill="none" stroke={darkLine} strokeWidth="1" opacity="0.48" />
        </>
      );
    case 'ribbed':
      return (
        <>
          <line x1="8" y1="11.7" x2="8" y2="24.5" stroke={darkLine} strokeWidth="1.1" opacity="0.42" />
          <line x1="12" y1="13.8" x2="12" y2="26.8" stroke={hiLine} strokeWidth="1" opacity="0.55" />
          <line x1="20" y1="13.8" x2="20" y2="26.8" stroke={darkLine} strokeWidth="1.1" opacity="0.42" />
          <line x1="24" y1="11.7" x2="24" y2="24.5" stroke={hiLine} strokeWidth="1" opacity="0.55" />
        </>
      );
    case 'mosaic':
      return (
        <>
          <polygon points="16,6 22,9.5 16,13 10,9.5" fill={hiLine} opacity="0.7" />
          <circle cx="10" cy="19" r="1.8" fill={hiLine} opacity="0.65" />
          <circle cx="22" cy="19" r="1.8" fill={hiLine} opacity="0.65" />
        </>
      );
    case 'cobble':
      return (
        <>
          <circle cx="13" cy="9.5" r="2" fill={darkLine} opacity="0.28" />
          <circle cx="19" cy="10" r="1.6" fill={hiLine} opacity="0.45" />
          <rect x="7" y="15" width="3.5" height="2.5" rx="0.8" fill={darkLine} opacity="0.3" />
          <rect x="20" y="18" width="4" height="2.8" rx="0.8" fill={hiLine} opacity="0.35" />
        </>
      );
    case 'glass':
      return (
        <>
          <line x1="11" y1="8.5" x2="20" y2="11" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <line x1="7" y1="15" x2="12" y2="22" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <line x1="21" y1="15.5" x2="25" y2="20" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </>
      );
    case 'glow':
      return (
        <>
          <polygon points="16,5.5 23,9.5 16,13.5 9,9.5" fill="#ffffff" opacity="0.6" />
          <polygon points="7,13.5 13,16.8 13,24.5 7,21" fill="#ffffff" opacity="0.45" />
        </>
      );
    case 'wool':
      return (
        <>
          <circle cx="16" cy="9.5" r="1.4" fill={hiLine} opacity="0.55" />
          <circle cx="9.5" cy="18.5" r="1.3" fill={hiLine} opacity="0.45" />
          <circle cx="22.5" cy="18.5" r="1.3" fill={hiLine} opacity="0.45" />
        </>
      );
    default:
      return null;
  }
}

const IsometricCube: React.FC<{
  top: string;
  left: string;
  right: string;
  detail?: React.ReactNode;
}> = ({ top, left, right, detail }) => (
  <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-sm" aria-hidden="true">
    {/* Top face */}
    <polygon points="16,3 28,9.5 16,16 4,9.5" fill={top} stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Left face */}
    <polygon points="4,9.5 16,16 16,29 4,22.5" fill={left} stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Right face */}
    <polygon points="16,16 28,9.5 28,22.5 16,29" fill={right} stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
    {detail}
  </svg>
);

export const ItemIcon: React.FC<ItemIconProps> = ({ itemId, size = 'md' }) => {
  const cls = SIZE_CLASSES[size];

  const renderSvg = () => {
    switch (itemId) {
      case 'grass':
        return (
          <IsometricCube
            top="#65be40"
            left="#865d3b"
            right="#6d492d"
            detail={
              <>
                <polygon points="4,9.5 16,16 16,19.5 4,13" fill="#549e34" />
                <polygon points="16,16 28,9.5 28,13 16,19.5" fill="#46852a" />
              </>
            }
          />
        );
      case 'dirt':
        return (
          <IsometricCube
            top="#966a44"
            left="#805736"
            right="#6b472b"
            detail={
              <>
                <rect x="7" y="15" width="3" height="2" fill="#5e3d23" />
                <rect x="20" y="16" width="3" height="2.5" fill="#a87950" />
              </>
            }
          />
        );
      case 'stone':
        return (
          <IsometricCube
            top="#a1a6ac"
            left="#858a90"
            right="#6c7177"
            detail={
              <>
                <line x1="6" y1="15" x2="12" y2="18" stroke="#5b6066" strokeWidth="1.3" />
                <line x1="19" y1="20" x2="25" y2="17" stroke="#b6bbc1" strokeWidth="1.3" />
              </>
            }
          />
        );
      case 'planks':
        return (
          <IsometricCube
            top="#d19a5d"
            left="#b8834d"
            right="#9c6c3b"
            detail={
              <>
                <line x1="5" y1="14" x2="15" y2="19.5" stroke="#85582d" strokeWidth="1.1" />
                <line x1="5" y1="19" x2="15" y2="24.5" stroke="#85582d" strokeWidth="1.1" />
                <line x1="17" y1="19.5" x2="27" y2="14" stroke="#754c24" strokeWidth="1.1" />
              </>
            }
          />
        );
      case 'white_wall':
        return <IsometricCube top="#ffffff" left="#e2e8f0" right="#cbd5e1" />;
      case 'cream_wall':
        return <IsometricCube top="#fef3c7" left="#f3dfb0" right="#dfca97" />;
      case 'mint_wall':
        return <IsometricCube top="#6ee7b7" left="#34d399" right="#10b981" />;
      case 'sky_wall':
        return <IsometricCube top="#7dd3fc" left="#38bdf8" right="#0ea5e9" />;
      case 'coral_wall':
        return <IsometricCube top="#fda4af" left="#fb7185" right="#f43f5e" />;
      case 'brick':
        return (
          <IsometricCube
            top="#d86858"
            left="#c25243"
            right="#a13d30"
            detail={
              <>
                <line x1="5" y1="15" x2="15" y2="20" stroke="#e2d5cf" strokeWidth="1" />
                <line x1="5" y1="19.5" x2="15" y2="24.5" stroke="#e2d5cf" strokeWidth="1" />
                <line x1="17" y1="20" x2="27" y2="15" stroke="#e2d5cf" strokeWidth="1" />
              </>
            }
          />
        );
      case 'slate_roof':
        return <IsometricCube top="#64748b" left="#475569" right="#334155" />;
      case 'red_roof':
        return <IsometricCube top="#f87171" left="#dc4f3e" right="#b93829" />;
      case 'glass':
        return (
          <IsometricCube
            top="#cffafe"
            left="#a5f3fc"
            right="#67e8f9"
            detail={
              <>
                <line x1="8" y1="14" x2="13" y2="23" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="20" y1="17" x2="24" y2="13" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
              </>
            }
          />
        );
      case 'asphalt':
        return (
          <IsometricCube
            top="#3b424d"
            left="#272c35"
            right="#1e222a"
            detail={<line x1="12" y1="7.5" x2="20" y2="11.5" stroke="#facc15" strokeWidth="1.8" />}
          />
        );
      case 'sidewalk':
        return <IsometricCube top="#cbd5e1" left="#94a3b8" right="#788699" />;

      // ---------------- FURNITURE ----------------
      case 'bed':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="13" width="24" height="10" rx="2" fill="#b45309" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="4" y="9" width="6" height="14" rx="1.5" fill="#92400e" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="10" y="12" width="17" height="7" rx="1.5" fill="#fb7185" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="9.5" y="10.5" width="6" height="4" rx="1" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />
            <rect x="6" y="23" width="3" height="3" fill="#78350f" />
            <rect x="23" y="23" width="3" height="3" fill="#78350f" />
          </svg>
        );
      case 'sofa':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="5" y="9" width="22" height="10" rx="2.5" fill="#3b82f6" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="3.5" y="14" width="5" height="9" rx="1.5" fill="#2563eb" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="23.5" y="14" width="5" height="9" rx="1.5" fill="#2563eb" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="8.5" y="15.5" width="15" height="6.5" rx="1" fill="#60a5fa" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="6" y="23" width="3" height="3" fill="#475569" />
            <rect x="23" y="23" width="3" height="3" fill="#475569" />
          </svg>
        );
      case 'table':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="10" width="24" height="5" rx="1.5" fill="#d97706" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="6.5" y="15" width="3.5" height="11" fill="#92400e" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="22" y="15" width="3.5" height="11" fill="#92400e" stroke="#1e293b" strokeWidth="1.2" />
          </svg>
        );
      case 'bookshelf':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="5" y="4" width="22" height="24" rx="2" fill="#92400e" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="7.5" y="6.5" width="17" height="8" fill="#451a03" />
            <rect x="8.5" y="7.5" width="3" height="7" fill="#ef4444" />
            <rect x="12" y="8" width="3" height="6.5" fill="#38bdf8" />
            <rect x="15.5" y="7" width="3" height="7.5" fill="#22c55e" />
            <rect x="19" y="8" width="4" height="6.5" fill="#facc15" />
            <rect x="7.5" y="17" width="17" height="8" fill="#451a03" />
            <rect x="9" y="18" width="4" height="7" fill="#a855f7" />
            <rect x="14" y="18.5" width="3" height="6.5" fill="#fb923c" />
            <rect x="18" y="18" width="4" height="7" fill="#ec4899" />
          </svg>
        );
      case 'lamp':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="10,6 22,6 25,16 7,16" fill="#fde047" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="14.5" y="16" width="3" height="8" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="10" y="24" width="12" height="3.5" rx="1.5" fill="#64748b" stroke="#1e293b" strokeWidth="1.2" />
          </svg>
        );
      case 'tv':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="6" width="24" height="16" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1.4" />
            <rect x="6.5" y="8.5" width="19" height="11" rx="1" fill="#38bdf8" />
            <polygon points="8,17 14,11 19,15 24,10 24,18 8,18" fill="#0284c7" />
            <rect x="14" y="22" width="4" height="3" fill="#475569" />
            <rect x="10" y="25" width="12" height="2.5" rx="1" fill="#334155" />
          </svg>
        );
      case 'counter':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="6" width="24" height="5" rx="1.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="5" y="11" width="22" height="15" rx="1" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.3" />
            <line x1="16" y1="11" x2="16" y2="26" stroke="#475569" strokeWidth="1.2" />
            <circle cx="13" cy="18" r="1.3" fill="#1e293b" />
            <circle cx="19" cy="18" r="1.3" fill="#1e293b" />
          </svg>
        );
      case 'fridge':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="8" y="4" width="16" height="24" rx="2.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.3" />
            <line x1="8" y1="14" x2="24" y2="14" stroke="#64748b" strokeWidth="1.3" />
            <rect x="20" y="7" width="1.8" height="4.5" rx="0.8" fill="#475569" />
            <rect x="20" y="16.5" width="1.8" height="6" rx="0.8" fill="#475569" />
          </svg>
        );
      case 'bathtub':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="13" width="24" height="11" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="3" y="11" width="26" height="3.5" rx="1.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="7" y="7" width="3" height="4" rx="1" fill="#38bdf8" stroke="#1e293b" strokeWidth="1.1" />
            <circle cx="9.5" cy="25.5" r="1.8" fill="#94a3b8" />
            <circle cx="22.5" cy="25.5" r="1.8" fill="#94a3b8" />
          </svg>
        );
      case 'carpet_blue':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="16,9 28,15 16,22 4,15" fill="#3b82f6" stroke="#1e293b" strokeWidth="1.3" />
            <polygon points="16,11.5 23.5,15.2 16,19.5 8.5,15.2" fill="#93c5fd" />
          </svg>
        );
      case 'carpet_coral':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="16,9 28,15 16,22 4,15" fill="#f43f5e" stroke="#1e293b" strokeWidth="1.3" />
            <polygon points="16,11.5 23.5,15.2 16,19.5 8.5,15.2" fill="#fda4af" />
          </svg>
        );
      case 'chair_oak':
      case 'chair_pink':
      case 'chair_sky':
      case 'chair_mint': {
        const chairColor =
          itemId === 'chair_pink'
            ? { seat: '#f472b6', back: '#ec4899', leg: '#9d174d' }
            : itemId === 'chair_sky'
              ? { seat: '#38bdf8', back: '#0ea5e9', leg: '#0369a1' }
              : itemId === 'chair_mint'
                ? { seat: '#34d399', back: '#10b981', leg: '#047857' }
                : { seat: '#d97706', back: '#b45309', leg: '#78350f' };
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="9" y="5" width="14" height="11" rx="2" fill={chairColor.back} stroke="#1e293b" strokeWidth="1.3" />
            <rect x="7" y="15.5" width="18" height="4.5" rx="1.5" fill={chairColor.seat} stroke="#1e293b" strokeWidth="1.3" />
            <rect x="9" y="20" width="3" height="7" fill={chairColor.leg} stroke="#1e293b" strokeWidth="1.1" />
            <rect x="20" y="20" width="3" height="7" fill={chairColor.leg} stroke="#1e293b" strokeWidth="1.1" />
          </svg>
        );
      }
      case 'beach_lounger':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="5,10 11,8 15,17 9,19" fill="#06b6d4" stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
            <rect x="10" y="16" width="17" height="4.5" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="14" y="16" width="8" height="4.5" fill="#fb7185" />
            <rect x="10" y="20.5" width="2.5" height="5" fill="#b45309" />
            <rect x="23" y="20.5" width="2.5" height="5" fill="#b45309" />
          </svg>
        );
      case 'table_white':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="10" width="24" height="5" rx="1.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="6.5" y="15" width="3.5" height="11" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="22" y="15" width="3.5" height="11" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.2" />
          </svg>
        );
      case 'table_glass':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="10" width="24" height="4.5" rx="1.5" fill="#a5f3fc" stroke="#1e293b" strokeWidth="1.3" />
            <line x1="8" y1="11.5" x2="14" y2="13.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="6.5" y="14.5" width="3.5" height="11.5" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="22" y="14.5" width="3.5" height="11.5" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
          </svg>
        );
      case 'sofa_coral':
      case 'sofa_mint':
      case 'sofa_cream': {
        const sc =
          itemId === 'sofa_coral'
            ? { back: '#f43f5e', arm: '#e11d48', seat: '#fda4af' }
            : itemId === 'sofa_mint'
              ? { back: '#10b981', arm: '#059669', seat: '#6ee7b7' }
              : { back: '#eab308', arm: '#b45309', seat: '#fef3c7' };
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="5" y="9" width="22" height="10" rx="2.5" fill={sc.back} stroke="#1e293b" strokeWidth="1.3" />
            <rect x="3.5" y="14" width="5" height="9" rx="1.5" fill={sc.arm} stroke="#1e293b" strokeWidth="1.2" />
            <rect x="23.5" y="14" width="5" height="9" rx="1.5" fill={sc.arm} stroke="#1e293b" strokeWidth="1.2" />
            <rect x="8.5" y="15.5" width="15" height="6.5" rx="1" fill={sc.seat} stroke="#1e293b" strokeWidth="1.2" />
            <rect x="6" y="23" width="3" height="3" fill="#475569" />
            <rect x="23" y="23" width="3" height="3" fill="#475569" />
          </svg>
        );
      }
      case 'bed_coral':
      case 'bed_mint': {
        const blanket = itemId === 'bed_coral' ? '#fda4af' : '#6ee7b7';
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="13" width="24" height="10" rx="2" fill="#b45309" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="4" y="9" width="6" height="14" rx="1.5" fill="#78350f" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="10" y="12" width="17" height="7" rx="1.5" fill={blanket} stroke="#1e293b" strokeWidth="1.2" />
            <rect x="9.5" y="10.5" width="6" height="4" rx="1" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />
            <rect x="6" y="23" width="3" height="3" fill="#78350f" />
            <rect x="23" y="23" width="3" height="3" fill="#78350f" />
          </svg>
        );
      }
      case 'cupboard_oak':
      case 'cupboard_white':
      case 'cupboard_sky': {
        const cp =
          itemId === 'cupboard_white'
            ? { body: '#ffffff', door: '#e2e8f0', knob: '#475569' }
            : itemId === 'cupboard_sky'
              ? { body: '#38bdf8', door: '#7dd3fc', knob: '#fef08a' }
              : { body: '#b45309', door: '#d97706', knob: '#fef08a' };
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="6" y="4" width="20" height="24" rx="2" fill={cp.body} stroke="#1e293b" strokeWidth="1.3" />
            <rect x="8" y="6" width="7" height="20" rx="1" fill={cp.door} stroke="#1e293b" strokeWidth="1" />
            <rect x="17" y="6" width="7" height="20" rx="1" fill={cp.door} stroke="#1e293b" strokeWidth="1" />
            <circle cx="13.5" cy="16" r="1.2" fill={cp.knob} />
            <circle cx="18.5" cy="16" r="1.2" fill={cp.knob} />
          </svg>
        );
      }
      case 'plant_pot':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="10,18 22,18 20,28 12,28" fill="#c25243" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="8.5" y="16" width="15" height="3" rx="1" fill="#d97757" stroke="#1e293b" strokeWidth="1.2" />
            <ellipse cx="16" cy="10" rx="4.5" ry="6" fill="#22c55e" stroke="#1e293b" strokeWidth="1.2" />
            <ellipse cx="11" cy="12" rx="3.5" ry="4" fill="#4ade80" stroke="#1e293b" strokeWidth="1.1" />
            <ellipse cx="21" cy="12" rx="3.5" ry="4" fill="#16a34a" stroke="#1e293b" strokeWidth="1.1" />
          </svg>
        );
      case 'flower_vase':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="14.8" y="10" width="2.4" height="8" fill="#16a34a" />
            <path d="M11,17 L21,17 L23,24 C23,27 19,28 16,28 C13,28 9,27 9,24 Z" fill="#e0f2fe" stroke="#1e293b" strokeWidth="1.3" />
            <circle cx="16" cy="9" r="3.5" fill="#f472b6" stroke="#1e293b" strokeWidth="1.1" />
            <circle cx="12" cy="11.5" r="2.6" fill="#fb7185" stroke="#1e293b" strokeWidth="1" />
            <circle cx="20" cy="11.5" r="2.6" fill="#c084fc" stroke="#1e293b" strokeWidth="1" />
            <circle cx="16" cy="9" r="1.4" fill="#facc15" />
          </svg>
        );
      case 'desk_lamp':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="10,7 22,7 24.5,16 7.5,16" fill="#fde047" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="14.5" y="16" width="3" height="8" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.1" />
            <rect x="10" y="24" width="12" height="3.5" rx="1.5" fill="#475569" stroke="#1e293b" strokeWidth="1.2" />
          </svg>
        );
      case 'plush_decor':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon
              points="16,4 19.2,10.8 26.5,11.6 21,16.6 22.5,23.8 16,20.2 9.5,23.8 11,16.6 5.5,11.6 12.8,10.8"
              fill="#facc15"
              stroke="#1e293b"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <rect x="11" y="24" width="10" height="4" rx="1" fill="#78350f" stroke="#1e293b" strokeWidth="1.1" />
          </svg>
        );
      case 'gift_box':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="6" y="12" width="20" height="15" rx="2" fill="#f43f5e" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="5" y="9" width="22" height="4.5" rx="1.2" fill="#fb7185" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="14.2" y="9" width="3.6" height="18" fill="#fde047" stroke="#1e293b" strokeWidth="0.9" />
            <circle cx="13.5" cy="7" r="2.4" fill="#fde047" stroke="#1e293b" strokeWidth="1" />
            <circle cx="18.5" cy="7" r="2.4" fill="#fde047" stroke="#1e293b" strokeWidth="1" />
          </svg>
        );

      // ---------------- DOORS ----------------
      case 'door_wood':
      case 'door_white':
      case 'door_mint':
      case 'door_sky':
      case 'door_coral': {
        const doorPalette =
          itemId === 'door_white'
            ? { frame: '#cbd5e1', body: '#f8fafc', inset: '#e2e8f0', knob: '#64748b' }
            : itemId === 'door_mint'
              ? { frame: '#059669', body: '#34d399', inset: '#6ee7b7', knob: '#fef08a' }
              : itemId === 'door_sky'
                ? { frame: '#0284c7', body: '#38bdf8', inset: '#7dd3fc', knob: '#fef08a' }
                : itemId === 'door_coral'
                  ? { frame: '#be123c', body: '#fb7185', inset: '#fda4af', knob: '#fef08a' }
                  : { frame: '#78350f', body: '#b45309', inset: '#92400e', knob: '#facc15' };
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="8" y="3" width="16" height="26" rx="1.5" fill={doorPalette.frame} stroke="#1e293b" strokeWidth="1.3" />
            <rect x="9.5" y="4.5" width="13" height="23" fill={doorPalette.body} />
            <rect x="11.5" y="6.5" width="9" height="7.5" rx="0.8" fill={doorPalette.inset} stroke="#1e293b" strokeWidth="0.8" />
            <rect x="11.5" y="16.5" width="9" height="8" rx="0.8" fill={doorPalette.inset} stroke="#1e293b" strokeWidth="0.8" />
            <circle cx="20.5" cy="15.5" r="1.5" fill={doorPalette.knob} stroke="#1e293b" strokeWidth="0.8" />
          </svg>
        );
      }

      // ---------------- FOOD & DRINKS ----------------
      case 'soda':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="9" y="6" width="14" height="21" rx="3" fill="#0ea5e9" stroke="#1e293b" strokeWidth="1.3" />
            <rect x="10" y="6" width="12" height="3" rx="1" fill="#e2e8f0" />
            <rect x="9.5" y="12" width="13" height="7" fill="#fef08a" />
            <polygon points="17,12.5 14,15.8 16.2,15.8 15,18.5 18.5,15 16.3,15" fill="#ea580c" />
          </svg>
        );
      case 'milk':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="10,9 16,4 22,9 22,27 10,27" fill="#ffffff" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="10.5" y="15" width="11" height="8" fill="#f472b6" />
            <circle cx="16" cy="19" r="2.3" fill="#be185d" />
            <line x1="16" y1="4" x2="16" y2="9" stroke="#1e293b" strokeWidth="1.1" />
          </svg>
        );
      case 'pizza':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <polygon points="16,27 5,9 27,9" fill="#facc15" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M5,9 Q16,5 27,9 L26,12 Q16,9 6,12 Z" fill="#d97706" stroke="#1e293b" strokeWidth="1.2" />
            <circle cx="13.5" cy="15" r="2" fill="#ef4444" />
            <circle cx="18.5" cy="14" r="1.8" fill="#ef4444" />
            <circle cx="16" cy="20" r="1.8" fill="#ef4444" />
          </svg>
        );
      case 'apple':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <rect x="15" y="4" width="2.5" height="5" rx="1" fill="#78350f" />
            <ellipse cx="20" cy="7" rx="3.5" ry="2" fill="#22c55e" stroke="#1e293b" strokeWidth="1" />
            <path
              d="M16,9.5 C12,8 6,11 7,17.5 C7.8,23 12,27 15.5,26.5 C16,26.5 16.5,26.5 17,26.5 C20.5,27 24.2,23 25,17.5 C26,11 20,8 16,9.5 Z"
              fill="#ef4444"
              stroke="#1e293b"
              strokeWidth="1.3"
            />
            <ellipse cx="11.5" cy="14" rx="1.6" ry="2.8" fill="#fca5a5" opacity="0.7" />
          </svg>
        );
      case 'donut':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <circle cx="16" cy="16" r="10.5" fill="#d97706" stroke="#1e293b" strokeWidth="1.3" />
            <path d="M7,13 C8,8 24,8 25,13 C25,17 22,19 16,19 C10,19 7,17 7,13 Z" fill="#f472b6" />
            <circle cx="16" cy="16" r="3.5" fill="#fef3c7" stroke="#1e293b" strokeWidth="1.2" />
            <rect x="10.5" y="10.5" width="2.5" height="1.2" rx="0.5" fill="#fef08a" />
            <rect x="19" y="10.5" width="2.5" height="1.2" rx="0.5" fill="#38bdf8" />
            <rect x="15" y="9" width="2.5" height="1.2" rx="0.5" fill="#ffffff" />
          </svg>
        );

      // ---------------- TOOLS ----------------
      case 'pickaxe':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <line x1="7" y1="25" x2="21" y2="11" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
            <path
              d="M11,6 Q21,6 26,21 L22.5,21 Q19,12.5 11,10 Z"
              fill="#38bdf8"
              stroke="#1e293b"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'hammer':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" aria-hidden="true">
            <line x1="7" y1="25" x2="19" y2="13" stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" />
            <rect
              x="14"
              y="6"
              width="12"
              height="7"
              rx="1.5"
              transform="rotate(45 20 9.5)"
              fill="#a78bfa"
              stroke="#1e293b"
              strokeWidth="1.3"
            />
          </svg>
        );

      default: {
        const xSuit = getXSuitItemDef(itemId);
        if (xSuit) {
          if (xSuit.slot === 'suit') {
            return (
              <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-sm" aria-hidden="true">
                <polygon
                  points="8,6 13,4 19,4 24,6 27,13 23,15 21,11 21,27 11,27 11,11 9,15 5,13"
                  fill={xSuit.primaryHex}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <polygon points="12,10 20,10 19,19 13,19" fill={xSuit.secondaryHex} />
                <polygon points="16,11.5 18.5,14.5 16,17.5 13.5,14.5" fill={xSuit.glowHex} />
                <rect x="11" y="21" width="10" height="2.4" fill={xSuit.accentHex} />
              </svg>
            );
          }
          if (xSuit.slot === 'helmet') {
            return (
              <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-sm" aria-hidden="true">
                <path
                  d="M7,16 C7,8 25,8 25,16 L24,25 L20,25 L19,21 L13,21 L12,25 L8,25 Z"
                  fill={xSuit.primaryHex}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <polygon points="9.5,14.5 22.5,14.5 21.5,18.5 10.5,18.5" fill={xSuit.visorHex} />
                <polygon points="15,6 17,6 18,11 14,11" fill={xSuit.accentHex} />
              </svg>
            );
          }
          if (xSuit.slot === 'boots') {
            return (
              <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-sm" aria-hidden="true">
                <path
                  d="M9,7 L18,7 L18,19 L25,21 L25,26 L8,26 Z"
                  fill={xSuit.primaryHex}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <rect x="9" y="10" width="9" height="3" fill={xSuit.accentHex} />
                <rect x="8" y="23.5" width="17" height="2.6" fill={xSuit.glowHex} />
              </svg>
            );
          }
          // accessory (wings / cape / halo)
          return (
            <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-sm" aria-hidden="true">
              <polygon points="14,13 4,6 6,15 12,18" fill={xSuit.glowHex} stroke="#0f172a" strokeWidth="1" />
              <polygon points="18,13 28,6 26,15 20,18" fill={xSuit.glowHex} stroke="#0f172a" strokeWidth="1" />
              <polygon points="13,17 6,21 10,25 14,20" fill={xSuit.accentHex} stroke="#0f172a" strokeWidth="1" />
              <polygon points="19,17 26,21 22,25 18,20" fill={xSuit.accentHex} stroke="#0f172a" strokeWidth="1" />
              <circle cx="16" cy="16" r="3" fill={xSuit.primaryHex} stroke={xSuit.glowHex} strokeWidth="1.4" />
            </svg>
          );
        }

        const ext = getExtendedBlockByItemId(itemId);
        if (ext) {
          const top = ext.isGlow ? mixWithWhite(ext.hex, 0.35) : mixWithWhite(ext.hex, 0.16);
          const left = ext.hex;
          const right = shadeHexColor(ext.hex, ext.isGlass ? 0.86 : 0.76);
          return (
            <IsometricCube
              top={top}
              left={left}
              right={right}
              detail={renderExtendedBlockDetail(ext.style, ext.hex)}
            />
          );
        }
        const def = getItemDef(itemId);
        return (
          <IsometricCube
            top={def?.bgHex ?? '#e2e8f0'}
            left={def?.accentHex ?? '#94a3b8'}
            right="#64748b"
          />
        );
      }
    }
  };

  return <div className={`${cls} shrink-0 flex items-center justify-center`}>{renderSvg()}</div>;
};
