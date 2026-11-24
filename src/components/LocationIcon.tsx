import React from 'react';
import { CityLocationId } from '../game/locations';

interface LocationIconProps {
  locationId: CityLocationId;
  className?: string;
}

export const LocationIcon: React.FC<LocationIconProps> = ({
  locationId,
  className = 'w-6 h-6',
}) => {
  switch (locationId) {
    case 'school':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M16 3L3 12h26L16 3z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="6" y="12" width="20" height="16" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="16" cy="9" r="2.6" fill="#ffffff" stroke="#b45309" strokeWidth="1.2" />
          <path d="M16 7.8v1.4l1 .7" stroke="#1e293b" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          <rect x="13" y="19" width="6" height="9" rx="1" fill="#0284c7" stroke="#0369a1" strokeWidth="1.2" />
          <rect x="8.5" y="15" width="3.5" height="3.5" rx="0.6" fill="#38bdf8" />
          <rect x="20" y="15" width="3.5" height="3.5" rx="0.6" fill="#38bdf8" />
        </svg>
      );

    case 'cinema':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="4" y="10" width="24" height="17" rx="3" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.6" />
          <path d="M5 10l3-5h5l-3 5H5zm8 0l3-5h5l-3 5h-5zm8 0l3-5h3l2 5h-8z" fill="#fb7185" stroke="#be123c" strokeWidth="1" />
          <polygon points="13,15 13,23 21,19" fill="#fde047" />
        </svg>
      );

    case 'dance_club':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <line x1="16" y1="2" x2="16" y2="7" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16" cy="17" r="9.5" fill="#d946ef" stroke="#f5d0fe" strokeWidth="1.5" />
          <path d="M7 17h18M16 7.5v19M9.5 11.5h13M9.5 22.5h13" stroke="#f0abfc" strokeWidth="1.1" opacity="0.85" />
          <circle cx="12.5" cy="14.5" r="1.4" fill="#fde047" />
          <circle cx="19.5" cy="19.5" r="1.4" fill="#38bdf8" />
          <path d="M5 8l2 2M27 8l-2 2M5 26l2-2M27 26l-2-2" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'coffee_shop':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M12 7c0-2 2-2 2-4M18 7c0-2 2-2 2-4" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M6 12h15v10a6 6 0 01-6 6h-3a6 6 0 01-6-6V12z" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
          <path d="M21 14h3a3 3 0 010 6h-3" fill="none" stroke="#b45309" strokeWidth="2.2" />
          <rect x="8" y="13.5" width="11" height="2.4" rx="1" fill="#fef3c7" />
        </svg>
      );

    case 'shopping_mall':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M11 11V8a5 5 0 0110 0v3" fill="none" stroke="#fbcfe8" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="5" y="11" width="22" height="17" rx="3.5" fill="#ec4899" stroke="#9d174d" strokeWidth="1.5" />
          <polygon points="16,15 17.8,18.8 22,19.4 19,22.2 19.7,26.2 16,24.2 12.3,26.2 13,22.2 10,19.4 14.2,18.8" fill="#fde047" />
        </svg>
      );

    case 'supermarket':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M5 12h22l-2.4 13H7.4L5 12z" fill="#10b981" stroke="#065f46" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 12l4-6M22 12l-4-6" stroke="#a7f3d0" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="11" r="3" fill="#ef4444" />
          <circle cx="19" cy="11" r="3" fill="#fbbf24" />
          <path d="M10 17h12M11 21h10" stroke="#d1fae5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'hospital':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="4" y="4" width="24" height="24" rx="5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="13" y="8" width="6" height="16" rx="1.4" fill="#f43f5e" />
          <rect x="8" y="13" width="16" height="6" rx="1.4" fill="#f43f5e" />
        </svg>
      );

    case 'police_station':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M16 3l10 4v8c0 6.5-4.3 11.4-10 13.5C10.3 26.4 6 21.5 6 15V7l10-4z" fill="#2563eb" stroke="#93c5fd" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="16,9.5 17.8,13.4 22,14 19,16.9 19.7,21 16,19 12.3,21 13,16.9 10,14 14.2,13.4" fill="#fde047" />
        </svg>
      );

    case 'fire_station':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="12" fill="#dc2626" stroke="#fecaca" strokeWidth="1.5" />
          <path d="M16 6c2.5 3.4 5.5 6.4 5.5 10.6a5.5 5.5 0 01-11 0c0-2.5 1.1-4.8 2.6-6.8.5 1.8 1.7 2.4 2.3 1.4.8-1.4.6-3.3.6-5.2z" fill="#fde047" />
          <path d="M16 14c1.3 1.8 2.4 3.2 2.4 5a2.4 2.4 0 01-4.8 0c0-1.4.9-3.1 2.4-5z" fill="#fb923c" />
        </svg>
      );

    case 'restaurant':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle cx="16" cy="6" r="2" fill="#fde047" />
          <path d="M5 20a11 11 0 0122 0H5z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.5" />
          <rect x="4" y="21" width="24" height="4" rx="2" fill="#fef2f2" stroke="#e11d48" strokeWidth="1.4" />
        </svg>
      );

    case 'hotel':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="6" y="6" width="20" height="22" rx="2.5" fill="#6366f1" stroke="#312e81" strokeWidth="1.5" />
          <rect x="9.5" y="10" width="4" height="3.5" rx="0.7" fill="#fde047" />
          <rect x="18.5" y="10" width="4" height="3.5" rx="0.7" fill="#fde047" />
          <rect x="9.5" y="16" width="4" height="3.5" rx="0.7" fill="#fde047" />
          <rect x="18.5" y="16" width="4" height="3.5" rx="0.7" fill="#fde047" />
          <rect x="13" y="22" width="6" height="6" rx="1" fill="#38bdf8" />
          <polygon points="16,1.5 17,3.5 19.2,3.8 17.6,5.3 18,7.4 16,6.4 14,7.4 14.4,5.3 12.8,3.8 15,3.5" fill="#fde047" />
        </svg>
      );

    case 'park':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="14" y="18" width="4" height="10" rx="1" fill="#92400e" />
          <circle cx="16" cy="13" r="8" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
          <circle cx="11" cy="14" r="4.5" fill="#4ade80" />
          <circle cx="21" cy="14" r="4.5" fill="#4ade80" />
          <rect x="6" y="26" width="20" height="3" rx="1.5" fill="#86efac" />
        </svg>
      );

    case 'gym':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="4" y="10" width="4" height="12" rx="1.5" fill="#14b8a6" stroke="#134e4a" strokeWidth="1.4" />
          <rect x="8" y="12" width="3" height="8" rx="1" fill="#2dd4bf" stroke="#134e4a" strokeWidth="1.2" />
          <rect x="11" y="14.5" width="10" height="3" fill="#e2e8f0" />
          <rect x="21" y="12" width="3" height="8" rx="1" fill="#2dd4bf" stroke="#134e4a" strokeWidth="1.2" />
          <rect x="24" y="10" width="4" height="12" rx="1.5" fill="#14b8a6" stroke="#134e4a" strokeWidth="1.4" />
        </svg>
      );

    case 'library':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="6" y="5" width="6" height="22" rx="1.5" fill="#0ea5e9" stroke="#0c4a6e" strokeWidth="1.4" />
          <rect x="13" y="7" width="6" height="20" rx="1.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.4" />
          <rect x="20" y="6" width="6" height="21" rx="1.5" fill="#f43f5e" stroke="#881337" strokeWidth="1.4" />
          <line x1="7.5" y1="10" x2="10.5" y2="10" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14.5" y1="12" x2="17.5" y2="12" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="21.5" y1="11" x2="24.5" y2="11" stroke="#ffe4e6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'car_showroom':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M7 15l3.5-5.5h11L25 15h2.5a2 2 0 012 2v5h-25v-5a2 2 0 012-2H7z" fill="#0284c7" stroke="#075985" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9.5 14.5l2.2-3.5h8.6l2.2 3.5h-13z" fill="#bae6fd" />
          <circle cx="9.5" cy="22" r="3.2" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.2" />
          <circle cx="22.5" cy="22" r="3.2" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.2" />
          <circle cx="6.5" cy="18" r="1.2" fill="#fde047" />
          <circle cx="25.5" cy="18" r="1.2" fill="#fde047" />
        </svg>
      );

    case 'beach':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle cx="23" cy="8" r="4" fill="#fde047" />
          <path d="M4 15c3.5-5.5 12.5-5.5 16 0H4z" fill="#fb7185" stroke="#be123c" strokeWidth="1.3" />
          <line x1="12" y1="15" x2="14" y2="25" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 24c4-2.5 8-2.5 13 0s9 2.5 13 0v5H3v-5z" fill="#38bdf8" />
          <path d="M3 22h26v3H3z" fill="#fcd34d" opacity="0.65" />
        </svg>
      );

    case 'game_center':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="3" y="9" width="26" height="15" rx="7" fill="#8b5cf6" stroke="#4c1d95" strokeWidth="1.5" />
          <path d="M10 13.5v6M7 16.5h6" stroke="#f8fafc" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="21.5" cy="14.5" r="1.7" fill="#fde047" />
          <circle cx="24" cy="18" r="1.7" fill="#34d399" />
          <circle cx="19" cy="18" r="1.7" fill="#fb7185" />
        </svg>
      );

    case 'xsuit_arena':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="16,3 27,9 24,25 16,29 8,25 5,9" fill="#4c1d95" stroke="#c084fc" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="16,8 21,15 16,23 11,15" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.1" />
          <circle cx="16" cy="15" r="2.2" fill="#fde047" />
        </svg>
      );

    case 'observatory':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M7 16a9 9 0 0118 0H7z" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.5" />
          <rect x="6" y="16" width="20" height="11" rx="2" fill="#f8fafc" stroke="#475569" strokeWidth="1.4" />
          <path d="M18 11l7-5 2 2.5-7 5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.1" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="1.4" fill="#fde047" />
        </svg>
      );

    case 'pine_lodge':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M16 4L4 14h24L16 4z" fill="#475569" stroke="#1e293b" strokeWidth="1.4" strokeLinejoin="round" />
          <rect x="6" y="14" width="20" height="13" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
          <rect x="13" y="19" width="6" height="8" rx="1" fill="#fde68a" />
          <rect x="8.5" y="16.5" width="3.5" height="3.5" rx="0.6" fill="#fef08a" />
          <rect x="20" y="16.5" width="3.5" height="3.5" rx="0.6" fill="#fef08a" />
        </svg>
      );
  }
};
