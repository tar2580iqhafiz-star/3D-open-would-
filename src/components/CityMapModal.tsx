import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Compass,
  Home,
  Layers,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  X,
} from 'lucide-react';
import {
  CITY_LOCATIONS,
  CityLocation,
  CityLocationId,
  HOME_VILLA_WAYPOINT,
  LOCATION_CATEGORY_TABS,
  LocationCategory,
} from '../game/locations';
import { LocationIcon } from './LocationIcon';
import { useViewportLayout } from '../game/useViewportLayout';

interface CityMapModalProps {
  open: boolean;
  playerX: number;
  playerZ: number;
  headingDeg: number;
  discoveredIds: CityLocationId[];
  onClose: () => void;
  onTravelTo: (location: CityLocation) => void;
  onTravelHome: () => void;
  onUiSound: () => void;
}

// World-to-board projection constants covering the slightly expanded island, outer forests, trails & South Beach
const WORLD_MIN_X = -196;
const WORLD_MAX_X = 196; // span = 392
const WORLD_MIN_Z = -196;
const WORLD_MAX_Z = 204; // span = 400

const BOARD_W = 840;
const BOARD_H = 900;

function worldToBoardX(wx: number): number {
  return ((wx - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * BOARD_W;
}

function worldToBoardZ(wz: number): number {
  return ((wz - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * BOARD_H;
}

function rectStyle(x0: number, z0: number, x1: number, z1: number) {
  const left = worldToBoardX(x0);
  const top = worldToBoardZ(z0);
  const width = worldToBoardX(x1) - left;
  const height = worldToBoardZ(z1) - top;
  return { left, top, width, height };
}

// Lightweight woodland patches representing surrounding small & outer dense forests
const FOREST_PATCHES: ReadonlyArray<[number, number, number, number]> = [
  [-186, -186, -30, -112],
  [-16, -186, 54, -112],
  [76, -186, 186, -112],
  [-88, -84, -56, -60],
  [66, -84, 98, -60],
  [-186, -104, -114, -40],
  [-186, -28, -114, 114],
  [129, -104, 142, -38],
  [152, -104, 186, -32],
  [129, 26, 186, 114],
  [-186, 56, -42, 104],
  [52, 56, 186, 104],
];

// Lightweight background blocks representing central neighborhood & expanded district houses
const CORE_HOUSE_FOOTPRINTS: ReadonlyArray<[number, number, number, number, string]> = [
  [-17, -17, -6, -6, '#fef3c7'],
  [-38, -17, -27, -6, '#d1fae5'],
  [6, -17, 17, -6, '#e0f2fe'],
  [27, -17, 38, -6, '#fce7f3'],
  [-17, 6, -6, 17, '#e0e7ff'],
  [-38, 6, -27, 17, '#fef3c7'],
  [27, 6, 38, 17, '#d1fae5'],
  [-17, -38, -6, -27, '#ffe4e6'],
  [6, -38, 17, -27, '#fef3c7'],
  [-38, -38, -27, -27, '#e0f2fe'],
  [27, -38, 38, -27, '#d1fae5'],
  [-17, 27, -6, 38, '#fce7f3'],
  [6, 27, 17, 38, '#e0f2fe'],
  [-38, 27, -27, 38, '#d1fae5'],
  [27, 27, 38, 38, '#fef3c7'],
  // Expanded North, West, and East Houses & Small City Buildings
  [-34, -106, -22, -96, '#fef3c7'],
  [-18, -108, -5, -96, '#e0f2fe'],
  [6, -106, 19, -96, '#ffe4e6'],
  [24, -106, 38, -96, '#d1fae5'],
  [44, -107, 58, -96, '#fef3c7'],
  [-110, -40, -97, -26, '#d1fae5'],
  [-109, -18, -97, -5, '#ffe4e6'],
  [-109, 6, -97, 18, '#e0f2fe'],
  [-85, 6, -72, 18, '#fef3c7'],
  [112, -42, 125, -28, '#d1fae5'],
  [112, -16, 124, -4, '#ecfdf5'],
  [112, 8, 126, 22, '#ffe4e6'],
  [72, -42, 84, -30, '#e0f2fe'],
  // Scenic Outer Forest Cabins & Overlook Pavilions
  [-159, -159, -149, -149, '#fde68a'],
  [-5, -157, 5, -149, '#d1fae5'],
  [152, -78, 161, -66, '#cffafe'],
];

const TRAIL_SEGMENTS: ReadonlyArray<[number, number, number, number]> = [
  [-176, -176, 176, -174],
  [-176, -176, -174, 118],
  [-176, 116, -78, 118],
  [-80, 118, -78, 133],
  [174, -176, 176, 118],
  [78, 116, 176, 118],
  [78, 118, 80, 133],
  [-1, -174, 1, -142],
  [-174, -1, -166, 1],
  [148, 25, 174, 27],
];

const ROAD_SEGMENTS: ReadonlyArray<{
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  vertical: boolean;
}> = [
  // Main Avenues + Expanded North/West/East Extensions
  { x0: -2.5, z0: -142, x1: 2.5, z1: 130, vertical: true },
  { x0: -166, z0: -2.5, x1: 148, z1: 2.5, vertical: false },
  // Central City Ring Roads
  { x0: -23.5, z0: -41, x1: -20.5, z1: 41, vertical: true },
  { x0: 20.5, z0: -41, x1: 23.5, z1: 41, vertical: true },
  { x0: -41, z0: -23.5, x1: 41, z1: -20.5, vertical: false },
  { x0: -41, z0: 20.5, x1: 41, z1: 23.5, vertical: false },
  // Outer District & Expanded Connectors
  { x0: -48, z0: -51.5, x1: 148, z1: -48.5, vertical: false },
  { x0: 44.5, z0: -48, x1: 47.5, z1: 24, vertical: true },
  { x0: -47.5, z0: -48, x1: -44.5, z1: 24, vertical: true },
  { x0: -24, z0: 45.5, x1: 148, z1: 48.5, vertical: false },
  { x0: -94, z0: -94, x1: 148, z1: -90, vertical: false },
  { x0: -146, z0: -142, x1: 148, z1: -138, vertical: false },
  { x0: -94, z0: -94, x1: -90, z1: 49, vertical: true },
  { x0: 105, z0: -94, x1: 109, z1: 49, vertical: true },
  { x0: 144, z0: -142, x1: 148, z1: 49, vertical: true },
];

export const CityMapModal: React.FC<CityMapModalProps> = ({
  open,
  playerX,
  playerZ,
  headingDeg,
  discoveredIds,
  onClose,
  onTravelTo,
  onTravelHome,
  onUiSound,
}) => {
  const { isLandscape, isCompactLandscape } = useViewportLayout();
  const [category, setCategory] = useState<LocationCategory>('all');
  const [selectedId, setSelectedId] = useState<CityLocationId>('school');
  const [is3DMode, setIs3DMode] = useState(true);
  const [zoom, setZoom] = useState(0.62);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 12 });

  const dragRef = useRef<{
    pointerId: number | null;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ pointerId: null, lastX: 0, lastY: 0, moved: false });

  const discoveredSet = useMemo(() => new Set(discoveredIds), [discoveredIds]);

  const filteredLocations = useMemo(() => {
    if (category === 'all') return CITY_LOCATIONS;
    return CITY_LOCATIONS.filter((loc) => loc.category === category);
  }, [category]);

  const selectedLocation = useMemo(
    () =>
      CITY_LOCATIONS.find((l) => l.id === selectedId) ??
      filteredLocations[0] ??
      CITY_LOCATIONS[0],
    [filteredLocations, selectedId],
  );

  if (!open) return null;

  const focusOnWorld = (wx: number, wz: number) => {
    const bx = worldToBoardX(wx);
    const bz = worldToBoardZ(wz);
    setPan({
      x: (BOARD_W / 2 - bx) * zoom,
      y: (BOARD_H / 2 - bz) * zoom,
    });
  };

  const handleSelectPin = (loc: CityLocation) => {
    onUiSound();
    setSelectedId(loc.id);
    focusOnWorld(
      (loc.bounds[0] + loc.bounds[2]) / 2,
      (loc.bounds[1] + loc.bounds[3]) / 2,
    );
  };

  const handleDirectoryClick = (loc: CityLocation) => {
    onUiSound();
    setSelectedId(loc.id);
    focusOnWorld(
      (loc.bounds[0] + loc.bounds[2]) / 2,
      (loc.bounds[1] + loc.bounds[3]) / 2,
    );
  };

  const playerBoardX = worldToBoardX(playerX);
  const playerBoardZ = worldToBoardZ(playerZ);
  const distToSelected = Math.round(
    Math.hypot(
      selectedLocation.spawn.x - playerX,
      selectedLocation.spawn.z - playerZ,
    ),
  );

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setPan((prev) => ({
      x: Math.max(-540, Math.min(540, prev.x + dx)),
      y: Math.max(-560, Math.min(560, prev.y + dy)),
    }));
  };

  const handleBoardPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.pointerId = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive City Location Map"
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-40 bg-gradient-to-b from-sky-900 via-indigo-950 to-slate-950 flex flex-col text-white overflow-hidden"
    >
      {/* Top Map Header */}
      <header
        className={`shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] ${
          isCompactLandscape ? 'pb-1.5' : 'pb-2.5 sm:px-6 sm:py-3.5'
        } bg-slate-950/60 border-b border-white/15 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`${
              isCompactLandscape ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'
            } bg-gradient-to-br from-sky-400 to-indigo-500 border-2 border-white flex items-center justify-center shadow-md shrink-0`}
          >
            <Compass className={isCompactLandscape ? 'w-4 h-4 text-slate-950 stroke-[2.5]' : 'w-5 h-5 text-slate-950 stroke-[2.5]'} />
          </div>
          <div className="min-w-0">
            <h1 className={`${isCompactLandscape ? 'text-sm' : 'text-base sm:text-xl'} font-extrabold tracking-tight leading-none truncate`}>
              City Map
            </h1>
            <p className="text-[10px] sm:text-xs text-sky-200/90 mt-0.5 font-medium tabular-nums truncate">
              {discoveredIds.length} / {CITY_LOCATIONS.length} Discovered · Tap any place to fast travel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onUiSound();
              setIs3DMode((v) => !v);
            }}
            aria-label={is3DMode ? 'Switch to 2D top map' : 'Switch to 3D tilted map'}
            className={`${
              isCompactLandscape ? 'min-h-[36px] px-2' : 'min-h-[44px] px-2.5 sm:px-3'
            } rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap`}
          >
            <Layers className="w-4 h-4 text-sky-300" />
            <span>{is3DMode ? '3D' : '2D'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onUiSound();
              onTravelHome();
            }}
            aria-label="Fast travel to My Dream Villa"
            className={`${
              isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3'
            } rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-white text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap`}
          >
            <Home className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">My Villa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onUiSound();
              focusOnWorld(playerX, playerZ);
            }}
            aria-label="Center map on player"
            className={`${
              isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3'
            } rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 border-2 border-white text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap`}
          >
            <LocateFixed className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">You</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onUiSound();
              onClose();
            }}
            aria-label="Close city map"
            className={`${
              isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2.5' : 'min-w-[44px] min-h-[44px] px-3'
            } rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 border-2 border-white text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 shadow-md cursor-pointer`}
          >
            <X className="w-5 h-5 stroke-[2.6]" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace: Interactive 3D Map Viewport + All-17 Directory Panel */}
      <div className={`flex-1 min-h-0 flex ${isLandscape ? 'flex-row' : 'flex-col lg:flex-row'}`}>
        {/* Left/Top: Interactive Colorful 3D City Map Viewport */}
        <div
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerEnd}
          onPointerCancel={handleBoardPointerEnd}
          style={{ touchAction: 'none' }}
          className={`relative flex-1 ${
            isLandscape ? 'min-h-0' : 'min-h-[44%] lg:min-h-0'
          } overflow-hidden bg-gradient-to-b from-cyan-500/35 via-sky-500/25 to-blue-600/40 select-none cursor-grab active:cursor-grabbing flex items-center justify-center`}
        >
          {/* Floating Zoom Controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                onUiSound();
                setZoom((z) => Math.min(1.45, Number((z + 0.16).toFixed(2))));
              }}
              aria-label="Zoom in map"
              className="w-11 h-11 rounded-xl bg-slate-950/80 hover:bg-slate-900 active:scale-95 border border-white/25 text-white flex items-center justify-center shadow-lg cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onUiSound();
                setZoom((z) => Math.max(0.48, Number((z - 0.16).toFixed(2))));
              }}
              aria-label="Zoom out map"
              className="w-11 h-11 rounded-xl bg-slate-950/80 hover:bg-slate-900 active:scale-95 border border-white/25 text-white flex items-center justify-center shadow-lg cursor-pointer"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          {/* Floating Compass Rose */}
          <div className="pointer-events-none absolute top-3 left-3 z-20 px-2.5 py-1.5 rounded-xl bg-slate-950/75 border border-white/20 text-[11px] font-bold text-sky-200 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-amber-300" />
            <span>North ↑</span>
          </div>

          {/* 3D Perspective Mapboard */}
          <div
            style={{
              perspective: is3DMode ? '1250px' : 'none',
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="relative transition-transform duration-75"
          >
            <div
              style={{
                width: BOARD_W,
                height: BOARD_H,
                transform: is3DMode ? 'rotateX(36deg) rotateZ(-4deg)' : 'none',
                transformStyle: 'preserve-3d',
                boxShadow: is3DMode
                  ? '0 26px 0 #1e3a5f, 0 40px 60px rgba(0,0,0,0.65)'
                  : '0 18px 40px rgba(0,0,0,0.45)',
              }}
              className="relative rounded-3xl bg-gradient-to-b from-emerald-500 via-green-500 to-emerald-600 border-4 border-emerald-200/70 transition-transform duration-300"
            >
              {/* Coastal Turquoise Ocean Strip & Shallow Lagoon along South Edge */}
              <div
                style={{
                  left: 0,
                  top: worldToBoardZ(156),
                  width: BOARD_W,
                  height: BOARD_H - worldToBoardZ(156),
                }}
                className="absolute bg-gradient-to-b from-cyan-300 via-cyan-400 to-blue-500 rounded-b-[20px] border-t-4 border-cyan-100"
              />

              {/* Wooden Beach Boardwalk */}
              <div
                style={rectStyle(-78, 130, 78, 134)}
                className="absolute bg-amber-700 border-y border-amber-900"
              />

              {/* Expanded Golden Sandy Beach Zone */}
              <div
                style={rectStyle(-78, 134, 78, 156)}
                className="absolute bg-gradient-to-b from-amber-200 to-yellow-300 rounded-b-xl border-2 border-amber-100/80"
              />
              {/* Wooden Oceanfront Pier */}
              <div
                style={rectStyle(-2.5, 134, 2.5, 157)}
                className="absolute bg-amber-600 border-x border-amber-800"
              />

              {/* Surrounding Small & Outer Woodland Forests */}
              {FOREST_PATCHES.map(([x0, z0, x1, z1], idx) => (
                <div
                  key={`forest-${idx}`}
                  style={rectStyle(x0, z0, x1, z1)}
                  className="absolute rounded-2xl bg-emerald-800/45 border border-emerald-200/30"
                />
              ))}

              {/* Connected Outer Woodland Promenade Trails */}
              {TRAIL_SEGMENTS.map(([x0, z0, x1, z1], idx) => (
                <div
                  key={`trail-${idx}`}
                  style={rectStyle(x0, z0, x1, z1)}
                  className="absolute bg-stone-300/80 border border-stone-500/40 rounded-sm"
                />
              ))}

              {/* Subtle Central Neighborhood Core District Pad */}
              <div
                style={rectStyle(-41, -41, 41, 41)}
                className="absolute rounded-2xl bg-emerald-400/35 border border-white/25"
              />

              {/* Asphalt Road Network + Center Yellow Lines */}
              {ROAD_SEGMENTS.map((seg, idx) => {
                const s = rectStyle(seg.x0, seg.z0, seg.x1, seg.z1);
                return (
                  <div
                    key={`road-${idx}`}
                    style={s}
                    className="absolute bg-slate-700 border border-slate-300/60"
                  >
                    <div
                      className={
                        seg.vertical
                          ? 'absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] border-l-2 border-dashed border-amber-300/85'
                          : 'absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] border-t-2 border-dashed border-amber-300/85'
                      }
                    />
                  </div>
                );
              })}

              {/* Existing Neighborhood Houses (visual context footprints) */}
              {CORE_HOUSE_FOOTPRINTS.map(([x0, z0, x1, z1, color], i) => (
                <div
                  key={`core-house-${i}`}
                  style={{
                    ...rectStyle(x0, z0, x1, z1),
                    backgroundColor: color,
                    boxShadow: '0 4px 0 rgba(15,23,42,0.45)',
                  }}
                  className="absolute rounded-md border border-slate-700/40"
                />
              ))}

              {/* Player's Permanent Luxury Starting Villa */}
              <div
                style={{
                  ...rectStyle(
                    HOME_VILLA_WAYPOINT.bounds[0],
                    HOME_VILLA_WAYPOINT.bounds[1],
                    HOME_VILLA_WAYPOINT.bounds[2],
                    HOME_VILLA_WAYPOINT.bounds[3],
                  ),
                  backgroundColor: '#fef08a',
                  boxShadow: '0 14px 0 #d97706, 0 20px 14px rgba(0,0,0,0.35)',
                  transform: 'translateY(-12px)',
                }}
                className="absolute rounded-lg border-2 border-white"
              />
              <button
                type="button"
                onClick={() => {
                  onUiSound();
                  onTravelHome();
                }}
                aria-label="Travel to My Dream Villa"
                style={{
                  left: worldToBoardX(
                    (HOME_VILLA_WAYPOINT.bounds[0] + HOME_VILLA_WAYPOINT.bounds[2]) / 2,
                  ),
                  top: worldToBoardZ(
                    (HOME_VILLA_WAYPOINT.bounds[1] + HOME_VILLA_WAYPOINT.bounds[3]) / 2,
                  ),
                  transform: is3DMode
                    ? 'translate(-50%, -92%) rotateZ(4deg) rotateX(-36deg)'
                    : 'translate(-50%, -82%)',
                }}
                className="absolute z-20 flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
              >
                <div className="w-9 h-9 rounded-2xl bg-amber-400 border-2 border-white shadow-xl flex items-center justify-center text-slate-950">
                  <Home className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="mt-0.5 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 border border-white text-[10px] font-black shadow whitespace-nowrap">
                  My Villa
                </span>
              </button>

              {/* 17 Extruded Colorful Venue Footprints */}
              {CITY_LOCATIONS.map((loc) => {
                const isSelected = loc.id === selectedLocation.id;
                const box = rectStyle(
                  loc.bounds[0],
                  loc.bounds[1],
                  loc.bounds[2],
                  loc.bounds[3],
                );
                const depthPx = loc.heightLevel * 7;
                return (
                  <div
                    key={`bldg-${loc.id}`}
                    style={{
                      ...box,
                      backgroundColor: loc.roofHex,
                      boxShadow: `0 ${depthPx}px 0 ${loc.accentHex}, 0 ${depthPx + 6}px 12px rgba(0,0,0,0.35)`,
                      transform: isSelected
                        ? `translateY(-${depthPx + 4}px)`
                        : `translateY(-${depthPx - 2}px)`,
                    }}
                    className={`absolute rounded-lg border-2 transition-transform ${
                      isSelected ? 'border-white ring-4 ring-amber-300/70' : 'border-slate-900/45'
                    }`}
                  />
                );
              })}

              {/* Live Animated Player Marker */}
              <div
                style={{
                  left: playerBoardX,
                  top: playerBoardZ,
                  transform: is3DMode
                    ? 'translate(-50%, -100%) rotateZ(4deg) rotateX(-36deg)'
                    : 'translate(-50%, -50%)',
                }}
                className="absolute z-30 pointer-events-none flex flex-col items-center"
              >
                <div className="px-2 py-0.5 rounded-md bg-amber-400 border-2 border-white text-slate-950 text-[11px] font-black shadow-lg whitespace-nowrap">
                  YOU
                </div>
                <div className="mt-0.5 w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow-xl flex items-center justify-center">
                  <div
                    style={{ transform: `rotate(${headingDeg}deg)` }}
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[11px] border-b-slate-950"
                  />
                </div>
              </div>

              {/* 17 Interactive Map Pins with Unique Icon + Name */}
              {CITY_LOCATIONS.map((loc) => {
                const cx = (loc.bounds[0] + loc.bounds[2]) / 2;
                const cz = (loc.bounds[1] + loc.bounds[3]) / 2;
                const px = worldToBoardX(cx);
                const pz = worldToBoardZ(cz);
                const isSelected = loc.id === selectedLocation.id;
                const discovered = discoveredSet.has(loc.id);
                const dimmed =
                  category !== 'all' && loc.category !== category && !isSelected;

                return (
                  <button
                    key={`pin-${loc.id}`}
                    type="button"
                    onClick={() => handleSelectPin(loc)}
                    aria-label={`Select ${loc.name} on map`}
                    style={{
                      left: px,
                      top: pz,
                      transform: is3DMode
                        ? `translate(-50%, -92%) rotateZ(4deg) rotateX(-36deg) scale(${isSelected ? 1.16 : 1})`
                        : `translate(-50%, -82%) scale(${isSelected ? 1.14 : 1})`,
                      opacity: dimmed ? 0.38 : 1,
                    }}
                    className={`absolute z-20 flex flex-col items-center cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-amber-300 ${
                      isSelected ? 'z-30' : ''
                    }`}
                  >
                    <div
                      style={{ borderColor: isSelected ? '#fde047' : '#ffffff' }}
                      className={`relative w-10 h-10 rounded-2xl border-2 shadow-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-slate-900 ring-4 ring-amber-400/50'
                          : 'bg-slate-900/90 hover:bg-slate-800'
                      }`}
                    >
                      <LocationIcon locationId={loc.id} className="w-7 h-7" />
                      {discovered && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-400 border border-white text-slate-950 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold leading-tight shadow-md whitespace-nowrap border ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-white'
                          : 'bg-slate-950/90 text-white border-white/25'
                      }`}
                    >
                      {loc.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right/Bottom: Location Directory & Fast Travel Card */}
        <aside
          className={`shrink-0 ${
            isCompactLandscape
              ? 'w-[290px] max-h-none border-t-0 border-l'
              : isLandscape
                ? 'w-[340px] lg:w-[390px] xl:w-[420px] max-h-none border-t-0 border-l'
                : 'w-full lg:w-[390px] xl:w-[420px] max-h-[54%] lg:max-h-none border-t lg:border-t-0 lg:border-l'
          } pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] bg-slate-950/85 border-white/15 flex flex-col min-h-0`}
        >
          {/* Category Filter Bar */}
          <div className="shrink-0 px-2.5 pt-2 pb-1.5 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto">
            {LOCATION_CATEGORY_TABS.map((tab) => {
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onUiSound();
                    setCategory(tab.id);
                  }}
                  className={`${
                    isCompactLandscape ? 'min-h-[32px] px-2.5 text-[11px]' : 'min-h-[38px] px-3 text-xs'
                  } rounded-xl font-extrabold whitespace-nowrap border transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-slate-200 border-white/15 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* All Selectable Locations List */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 grid ${
              isCompactLandscape ? 'grid-cols-1 gap-1.5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2'
            } content-start`}
          >
            {filteredLocations.map((loc) => {
              const isSelected = loc.id === selectedLocation.id;
              const discovered = discoveredSet.has(loc.id);
              const dist = Math.round(
                Math.hypot(loc.spawn.x - playerX, loc.spawn.z - playerZ),
              );
              return (
                <button
                  key={`dir-${loc.id}`}
                  type="button"
                  onClick={() => handleDirectoryClick(loc)}
                  onDoubleClick={() => onTravelTo(loc)}
                  aria-pressed={isSelected}
                  className={`${
                    isCompactLandscape ? 'min-h-[46px] p-1.5' : 'min-h-[56px] p-2'
                  } rounded-xl border-2 text-left flex items-center gap-2 transition-all active:scale-97 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/25 border-amber-400 shadow-md'
                      : 'bg-slate-900/80 border-white/12 hover:bg-slate-800/85'
                  }`}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-950/75 border border-white/15 flex items-center justify-center shrink-0">
                    <LocationIcon locationId={loc.id} className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-extrabold text-white truncate">
                        {loc.name}
                      </span>
                      {discovered && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[3]" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300/80 font-medium tabular-nums truncate">
                      {loc.district} · {dist}m
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Destination & Primary Fast Travel CTA */}
          <div className="shrink-0 p-2.5 sm:p-4 bg-slate-900/95 border-t border-white/15 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border-2 border-white/20 flex items-center justify-center shrink-0">
                <LocationIcon locationId={selectedLocation.id} className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                    {selectedLocation.name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 tabular-nums shrink-0">
                    {distToSelected}m
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-1">
                  {selectedLocation.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTravelTo(selectedLocation)}
              aria-label={`Travel to ${selectedLocation.name}`}
              className={`shrink-0 ${
                isCompactLandscape
                  ? 'min-w-[100px] min-h-[40px] px-3 text-xs'
                  : 'min-w-[112px] min-h-[46px] px-3.5 sm:px-4 text-xs sm:text-sm'
              } rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 active:scale-95 border-2 border-white text-slate-950 font-black flex items-center justify-center gap-1.5 shadow-lg cursor-pointer whitespace-nowrap`}
            >
              <MapPin className="w-4 h-4 stroke-[2.6]" />
              <span>Travel Here</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
