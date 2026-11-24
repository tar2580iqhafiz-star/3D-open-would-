import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  Box,
  Camera,
  Car,
  Check,
  Disc3,
  Feather,
  FolderOpen,
  Footprints,
  Gem,
  Home,
  Lock,
  Map as MapIcon,
  Moon,
  Move,
  Music,
  Paintbrush,
  Pause,
  Pickaxe,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  SkipBack,
  SkipForward,
  Sparkles,
  Store,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import type { CarInputState } from '../game/carSystem';
import { getItemDef, InventorySlot } from '../game/inventory';
import { CameraMode, GameSettings, HudSnapshot } from '../game/types';
import { useViewportLayout } from '../game/useViewportLayout';
import { CoinBadgeIcon, ItemIcon } from './ItemIcon';

interface GameHudProps {
  paused: boolean;
  backpackOpen: boolean;
  shopOpen: boolean;
  mapOpen: boolean;
  coins: number;
  hud: HudSnapshot;
  sprintLocked: boolean;
  decorateMode: boolean;
  hotbar: InventorySlot[];
  selectedHotbarIndex: number;
  feedbackToast: string | null;
  settings: GameSettings;
  onTogglePause: () => void;
  onOpenBackpack: () => void;
  onOpenShop: () => void;
  onOpenMap: () => void;
  onResetPlayer: () => void;
  onJump: () => void;
  onDive: () => void;
  onSurface: () => void;
  onBreakPress: () => void;
  onBreakRelease: () => void;
  onPlaceOrUse: () => void;
  onSelectHotbarSlot: (index: number) => void;
  onToggleSprint: () => void;
  onToggleDance: () => void;
  onToggleDecorateMode: () => void;
  onToggleClubMusic: () => void;
  onToggleClubMusicPower: () => void;
  onPrevClubTrack: () => void;
  onNextClubTrack: () => void;
  onChangeClubVolume: (vol: number) => void;
  onNudgePlacement: (screenRight: number, screenForward: number) => void;
  onRotatePlacement: (dir: -1 | 1) => void;
  onConfirmPlacement: () => void;
  onCancelPlacement: () => void;
  onInteractFurniture: () => void;
  onStartEditFurniture: () => void;
  onStartReplaceFurniture: () => void;
  onRemoveFurniture: () => void;
  onCycleCameraMode: () => void;
  onCameraOrbitInput: (dir: -1 | 0 | 1) => void;
  onEnterCar: () => void;
  onExitCar: () => void;
  onOpenChest: () => void;
  onCarControlChange: (partial: Partial<CarInputState>) => void;
  onToggleFlyMode: () => void;
  onFlyVerticalInput: (dir: -1 | 0 | 1) => void;
  onLand: () => void;
  onSetTimeOfDay: (mode: 'day' | 'night') => void;
  onUpdateSettings: (next: GameSettings) => void;
  lastSavedAt: number | null;
  customBlockCount: number;
  hasSavedWorld: boolean;
  onSaveWorld: () => void;
  onLoadWorld: () => void;
}

const cameraModeShortMap: Record<CameraMode, string> = {
  back: 'Back',
  front: 'Front',
  orbit: 'Orbit',
};

const cameraModeLabelMap: Record<CameraMode, string> = {
  back: 'Back View',
  front: 'Front Face',
  orbit: 'Orbit 360°',
};

const gaitLabelMap = {
  idle: 'Standing',
  walk: 'Walking',
  run: 'Running',
  jump: 'Jumping',
} as const;

export const GameHud: React.FC<GameHudProps> = ({
  paused,
  backpackOpen,
  shopOpen,
  mapOpen,
  coins,
  hud,
  sprintLocked,
  decorateMode,
  hotbar,
  selectedHotbarIndex,
  feedbackToast,
  settings,
  onTogglePause,
  onOpenBackpack,
  onOpenShop,
  onOpenMap,
  onResetPlayer,
  onJump,
  onDive,
  onSurface,
  onBreakPress,
  onBreakRelease,
  onPlaceOrUse,
  onSelectHotbarSlot,
  onToggleSprint,
  onToggleDance,
  onToggleDecorateMode,
  onToggleClubMusic,
  onToggleClubMusicPower,
  onPrevClubTrack,
  onNextClubTrack,
  onChangeClubVolume,
  onNudgePlacement,
  onRotatePlacement,
  onConfirmPlacement,
  onCancelPlacement,
  onInteractFurniture,
  onStartEditFurniture,
  onStartReplaceFurniture,
  onRemoveFurniture,
  onCycleCameraMode,
  onCameraOrbitInput,
  onEnterCar,
  onExitCar,
  onOpenChest,
  onCarControlChange,
  onToggleFlyMode,
  onFlyVerticalInput,
  onLand,
  onSetTimeOfDay,
  onUpdateSettings,
  lastSavedAt,
  customBlockCount,
  hasSavedWorld,
  onSaveWorld,
  onLoadWorld,
}) => {
  const { isCompactLandscape, isNarrowPortrait } = useViewportLayout();
  const overlayHidden = paused || backpackOpen || shopOpen || mapOpen;
  const activeSlot = hotbar[selectedHotbarIndex];
  const activeDef = getItemDef(activeSlot?.itemId);
  const holdingConsumable = Boolean(activeDef?.consumableEffect && activeSlot && activeSlot.qty > 0);
  const isNightActive = hud.dayTimeSec >= 720 || hud.dayPhase === 'night';

  const renderSunMoonToggle = (compact = false) => (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Instant day and night toggle"
      className="pointer-events-auto flex items-center gap-0.5 bg-slate-950/78 border border-white/25 rounded-xl p-0.5 shadow-lg shrink-0"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSetTimeOfDay('day');
        }}
        onKeyDown={(e) => {
          if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            onSetTimeOfDay('day');
          }
        }}
        aria-label="Switch instantly to Day (Sun)"
        aria-pressed={!isNightActive}
        style={{ touchAction: 'none' }}
        className={`${
          compact ? 'h-8 px-2 text-[10px]' : 'h-8 sm:h-9 px-2 sm:px-2.5 text-[11px]'
        } rounded-lg font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
          !isNightActive
            ? 'bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 shadow'
            : 'text-amber-200/80 hover:bg-slate-800/80'
        }`}
      >
        <Sun className="w-3.5 h-3.5 stroke-[2.6] shrink-0" />
        <span>SUN</span>
      </button>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSetTimeOfDay('night');
        }}
        onKeyDown={(e) => {
          if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            onSetTimeOfDay('night');
          }
        }}
        aria-label="Switch instantly to Night (Moon)"
        aria-pressed={isNightActive}
        style={{ touchAction: 'none' }}
        className={`${
          compact ? 'h-8 px-2 text-[10px]' : 'h-8 sm:h-9 px-2 sm:px-2.5 text-[11px]'
        } rounded-lg font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
          isNightActive
            ? 'bg-gradient-to-b from-indigo-400 to-sky-400 text-slate-950 shadow'
            : 'text-sky-200/80 hover:bg-slate-800/80'
        }`}
      >
        <Moon className="w-3.5 h-3.5 stroke-[2.6] shrink-0" />
        <span>MOON</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Exact Center White Crosshair (+) — hidden in Front/Orbit view, driving, or modals */}
      {!overlayHidden && hud.cameraMode === 'back' && !hud.inVehicle && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <span
              className="absolute w-4 h-[2px] bg-white rounded-[1px]"
              style={{ boxShadow: '0 0 2px rgba(0,0,0,0.85)' }}
            />
            <span
              className="absolute h-4 w-[2px] bg-white rounded-[1px]"
              style={{ boxShadow: '0 0 2px rgba(0,0,0,0.85)' }}
            />
          </div>
        </div>
      )}

      {/* Quiet Floating Item Collection / Buff Toast */}
      {!overlayHidden && feedbackToast && (
        <div
          aria-live="polite"
          className={`pointer-events-none fixed ${
            isCompactLandscape
              ? 'top-[max(3rem,calc(env(safe-area-inset-top)+2.75rem))]'
              : 'top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))]'
          } left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-xl bg-slate-950/85 border border-sky-400/50 text-white text-xs sm:text-sm font-bold shadow-lg whitespace-nowrap max-w-[calc(100vw-24px)] truncate`}
        >
          {feedbackToast}
        </div>
      )}

      {/* Compact Dance Club DJ Music Bar (Developer-curated bundled soundtrack; player controls only) */}
      {!overlayHidden && hud.inDanceClub && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          role="region"
          aria-label="Dance Club DJ music player"
          className={`fixed ${
            isCompactLandscape
              ? 'top-[max(3rem,calc(env(safe-area-inset-top)+2.75rem))] max-w-[310px]'
              : 'top-[max(6.5rem,calc(env(safe-area-inset-top)+6rem))] sm:top-[max(1rem,env(safe-area-inset-top))] max-w-[360px]'
          } left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-24px)] bg-slate-950/88 border-2 border-fuchsia-400/65 rounded-2xl px-2.5 py-2 text-white shadow-xl`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Disc3
                className={`w-5 h-5 text-fuchsia-400 shrink-0 ${
                  hud.danceMusicPlaying && hud.danceMusicPowerOn && settings.soundEnabled
                    ? 'animate-spin'
                    : ''
                }`}
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 leading-none">
                  Club DJ Deck
                </div>
                <div className="text-xs font-extrabold truncate leading-tight mt-0.5">
                  {hud.danceMusicPowerOn ? hud.danceTrackTitle : 'Music Off'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleClubMusicPower();
                }}
                aria-label={hud.danceMusicPowerOn ? 'Turn music off' : 'Turn music on'}
                aria-pressed={hud.danceMusicPowerOn}
                style={{ touchAction: 'none' }}
                className={`min-w-[44px] min-h-[44px] px-2 h-11 rounded-xl border text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform ${
                  hud.danceMusicPowerOn
                    ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                    : 'bg-slate-800 border-white/20 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{hud.danceMusicPowerOn ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPrevClubTrack();
                }}
                aria-label="Previous club song"
                style={{ touchAction: 'none' }}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleClubMusic();
                }}
                aria-label={hud.danceMusicPlaying ? 'Pause club music' : 'Play club music'}
                style={{ touchAction: 'none' }}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
                  hud.danceMusicPlaying && hud.danceMusicPowerOn
                    ? 'bg-fuchsia-500 border-fuchsia-200 text-slate-950'
                    : 'bg-slate-800 border-white/20 text-white hover:bg-slate-700'
                }`}
              >
                {hud.danceMusicPlaying && hud.danceMusicPowerOn ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNextClubTrack();
                }}
                aria-label="Next club song"
                style={{ touchAction: 'none' }}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <input
              type="range"
              aria-label="Club music volume"
              min={0}
              max={1}
              step={0.05}
              value={hud.danceVolume}
              onChange={(e) => onChangeClubVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 accent-fuchsia-400 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-300 tabular-nums w-8 text-right">
              {Math.round(hud.danceVolume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Small Contextual SHOP button shown ONLY when inside the Shopping Mall / Furniture Shop */}
      {!overlayHidden && hud.inFurnitureShop && hud.placementMode === 'none' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`fixed ${
            isCompactLandscape
              ? 'top-[max(3.1rem,calc(env(safe-area-inset-top)+2.85rem))]'
              : 'top-[max(6.75rem,calc(env(safe-area-inset-top)+6.25rem))] sm:top-[max(1.25rem,env(safe-area-inset-top))]'
          } left-1/2 -translate-x-1/2 z-20`}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenShop();
            }}
            aria-label="Open furniture store shop"
            style={{ touchAction: 'none' }}
            className="min-h-[38px] px-3.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 active:scale-95 border-2 border-white text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl cursor-pointer transition-transform"
          >
            <Store className="w-4 h-4 stroke-[2.5]" />
            <span>SHOP</span>
          </button>
        </div>
      )}

      {/* Top Bar: Minimal title, coin balance & Map left; SUN/MOON toggle, Camera controls & Pause right */}
      {!backpackOpen && !shopOpen && !mapOpen && (
        <div
          className={`pointer-events-none fixed top-0 left-0 right-0 z-20 flex items-start justify-between gap-2 ${
            isCompactLandscape
              ? 'pt-[max(0.45rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]'
              : isNarrowPortrait
                ? 'pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.6rem,env(safe-area-inset-left))] pr-[max(0.6rem,env(safe-area-inset-right))]'
                : 'pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]'
          }`}
        >
          <div className="flex flex-col items-start gap-1 shrink-0 min-w-0">
            <div
              className={`bg-slate-950/68 border border-white/15 rounded-xl text-white ${
                isCompactLandscape ? 'px-2.5 py-1' : 'px-2.5 py-1.5 sm:px-3.5 sm:py-2'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`${
                    isCompactLandscape ? 'text-[11px]' : 'text-xs sm:text-sm'
                  } font-semibold tracking-tight leading-tight`}
                >
                  Abandoned City
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold tabular-nums text-amber-200/95">
                  {hud.dayPhase === 'dawn' ? (
                    <Sunrise className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  ) : hud.dayPhase === 'sunset' ? (
                    <Sunset className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  ) : hud.dayPhase === 'night' ? (
                    <Moon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  )}
                  <span className={hud.dayPhase === 'night' ? 'text-sky-200' : undefined}>
                    {hud.dayTimeLabel}
                  </span>
                </div>
              </div>
              <div
                className={`mt-0.5 flex items-center gap-1.5 text-slate-200/85 tabular-nums ${
                  isCompactLandscape ? 'text-[10px]' : 'text-[11px] sm:text-xs'
                }`}
              >
                <span
                  className={
                    hud.inVehicle
                      ? 'text-amber-300 font-semibold'
                      : hud.isFlying
                        ? 'text-sky-300 font-semibold'
                        : hud.inShallowWater
                          ? 'text-cyan-300 font-semibold'
                          : undefined
                  }
                >
                  {hud.inVehicle
                    ? 'Driving'
                    : hud.isFlying
                      ? 'Flying'
                      : hud.inShallowWater
                        ? hud.isUnderwater
                          ? 'Diving'
                          : 'Swimming'
                        : gaitLabelMap[hud.gait]}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {hud.inVehicle
                    ? `${hud.vehicleSpeedKmh} km/h`
                    : `${hud.speedMs.toFixed(1)} m/s`}
                </span>
                {!isCompactLandscape && (
                  <>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{hud.headingDeg}°</span>
                  </>
                )}
              </div>
            </div>

            {!paused && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-1.5"
              >
                <div
                  aria-label={`Coin balance: ${coins} coins`}
                  className={`${
                    isCompactLandscape ? 'min-h-[34px] px-2' : 'min-h-[40px] sm:min-h-[44px] px-2 sm:px-3'
                  } rounded-xl bg-slate-950/80 border-2 border-amber-400/75 text-amber-300 flex items-center gap-1 shadow-lg`}
                >
                  <CoinBadgeIcon className={isCompactLandscape ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} />
                  <span className="text-xs sm:text-sm font-extrabold tabular-nums">
                    {coins.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenMap();
                  }}
                  aria-label="Open city map"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape ? 'min-h-[34px] px-2.5 text-[11px]' : 'min-w-[42px] min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 text-xs sm:text-sm'
                  } rounded-xl bg-gradient-to-b from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 active:scale-95 border-2 border-white text-slate-950 font-extrabold flex items-center gap-1 shadow-lg cursor-pointer transition-transform`}
                >
                  <MapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  <span>Map</span>
                </button>
              </div>
            )}

            {!paused && hud.inHomeHouse && hud.currentHouseName && (
              <div className="px-2 py-0.5 rounded-lg bg-emerald-950/85 border border-emerald-400/60 text-emerald-200 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow">
                <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-xs">
                  {hud.currentHouseName}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {/* Instant SUN / MOON Toggle (inline when wide enough, moves to row 2 on narrow portrait) */}
              {!paused && !isNarrowPortrait && renderSunMoonToggle(isCompactLandscape)}

              {/* Easy Camera Rotation & Front/Back/Orbit Mode Controls */}
              {!paused && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="pointer-events-auto flex items-center gap-0.5 bg-slate-950/72 border border-white/20 rounded-xl p-0.5 sm:p-1"
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCameraOrbitInput(1);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onCameraOrbitInput(0);
                    }}
                    onPointerLeave={() => onCameraOrbitInput(0)}
                    onPointerCancel={() => onCameraOrbitInput(0)}
                    aria-label="Rotate camera left around character"
                    style={{ touchAction: 'none' }}
                    className={`${
                      isCompactLandscape || isNarrowPortrait ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
                    } rounded-lg bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center cursor-pointer`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCycleCameraMode();
                    }}
                    aria-label={`Switch camera mode (current: ${cameraModeLabelMap[hud.cameraMode]})`}
                    style={{ touchAction: 'none' }}
                    className={`${
                      isCompactLandscape || isNarrowPortrait ? 'h-7 px-1.5 text-[10px]' : 'h-8 sm:h-9 px-2 sm:px-2.5 text-[11px] sm:text-xs'
                    } rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      hud.cameraMode === 'front'
                        ? 'bg-sky-500 text-slate-950'
                        : hud.cameraMode === 'orbit'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span className={isCompactLandscape ? 'inline' : 'sm:hidden'}>
                      {cameraModeShortMap[hud.cameraMode]}
                    </span>
                    {!isCompactLandscape && (
                      <span className="hidden sm:inline">{cameraModeLabelMap[hud.cameraMode]}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCameraOrbitInput(-1);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onCameraOrbitInput(0);
                    }}
                    onPointerLeave={() => onCameraOrbitInput(0)}
                    onPointerCancel={() => onCameraOrbitInput(0)}
                    aria-label="Rotate camera right around character"
                    style={{ touchAction: 'none' }}
                    className={`${
                      isCompactLandscape || isNarrowPortrait ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
                    } rounded-lg bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center cursor-pointer`}
                  >
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}

              {/* Pause Button */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onTogglePause}
                aria-label={paused ? 'Resume game' : 'Pause game'}
                className={`pointer-events-auto ${
                  isCompactLandscape || isNarrowPortrait ? 'w-9 h-9 min-w-[36px] min-h-[36px]' : 'min-w-[44px] min-h-[44px] w-11 h-11'
                } rounded-xl bg-slate-950/75 hover:bg-slate-900/90 active:scale-95 border border-white/20 text-white flex items-center justify-center transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer shrink-0`}
              >
                {paused ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>

            {/* Narrow Portrait Row 2: SUN / MOON toggle fits neatly inside top-right stack */}
            {!paused && isNarrowPortrait && renderSunMoonToggle(true)}

            {/* Corner Context Action Buttons under Top-Right Row (never overlap top bar or bottom controls) */}
            {!paused && (hud.interactingMode === 'sit' || hud.interactingMode === 'sleep') && (
              <div onPointerDown={(e) => e.stopPropagation()} className="pointer-events-auto">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInteractFurniture();
                  }}
                  aria-label="Stand up"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape ? 'min-h-[34px] px-3 text-[11px]' : 'min-h-[38px] px-3.5 text-xs'
                  } rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 border-2 border-white text-slate-950 font-black tracking-wide shadow-lg cursor-pointer transition-transform`}
                >
                  STAND UP
                </button>
              </div>
            )}

            {!paused && hud.inVehicle && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex flex-col items-end gap-1"
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onExitCar();
                  }}
                  aria-label="Exit car"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape ? 'min-h-[34px] px-3 text-[11px]' : 'min-h-[40px] px-3.5 text-xs'
                  } rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 border-2 border-white text-white font-black tracking-wide shadow-xl cursor-pointer flex items-center gap-1.5 transition-transform`}
                >
                  <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  <span>EXIT CAR</span>
                </button>

                <div className="px-2 py-0.5 rounded-lg bg-slate-950/80 border border-amber-400/50 text-amber-200 text-[10px] sm:text-[11px] font-bold tabular-nums shadow">
                  {hud.vehicleName ?? 'Car'} · {hud.vehicleSpeedKmh} km/h
                </div>
              </div>
            )}

            {!paused &&
              !hud.inVehicle &&
              hud.placementMode === 'none' &&
              hud.interactingMode === 'none' && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="pointer-events-auto flex flex-col items-end gap-1"
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFlyMode();
                    }}
                    aria-label={hud.isFlying ? 'Turn fly mode off' : 'Turn fly mode on'}
                    aria-pressed={hud.isFlying}
                    style={{ touchAction: 'none' }}
                    className={`${
                      isCompactLandscape || isNarrowPortrait
                        ? 'min-h-[34px] px-2.5 text-[11px]'
                        : 'min-h-[40px] px-3.5 text-xs'
                    } rounded-xl border-2 font-black tracking-wide flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-transform ${
                      hud.isFlying
                        ? 'bg-sky-400 hover:bg-sky-300 border-white text-slate-950'
                        : 'bg-slate-950/80 hover:bg-slate-900 border-sky-300/70 text-sky-200'
                    }`}
                  >
                    <Feather className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    <span>{hud.isFlying ? 'FLY: ON' : 'FLY MODE'}</span>
                  </button>

                  {hud.inShallowWater && !hud.isFlying && (
                    !hud.isUnderwater ? (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDive();
                        }}
                        aria-label="Dive underwater"
                        style={{ touchAction: 'none' }}
                        className={`${
                          isCompactLandscape || isNarrowPortrait
                            ? 'min-h-[34px] px-2.5 text-[11px]'
                            : 'min-h-[40px] px-3.5 text-xs'
                        } rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-95 border-2 border-white text-slate-950 font-black tracking-wide flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform`}
                      >
                        <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.8]" />
                        <span>DIVE</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSurface();
                        }}
                        aria-label="Swim back up to water surface"
                        style={{ touchAction: 'none' }}
                        className={`${
                          isCompactLandscape || isNarrowPortrait
                            ? 'min-h-[34px] px-2.5 text-[11px]'
                            : 'min-h-[40px] px-3.5 text-xs'
                        } rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-white text-slate-950 font-black tracking-wide flex items-center gap-1.5 shadow-lg cursor-pointer transition-transform`}
                      >
                        <Waves className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.6]" />
                        <span>SURFACE</span>
                      </button>
                    )
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Small, Clean Green SIT / SLEEP Prompt Label Near Chair, Sofa, or Bed */}
      {!overlayHidden &&
        hud.placementMode === 'none' &&
        hud.interactingMode === 'none' &&
        hud.nearbyPlacedId &&
        hud.nearbyActionLabel && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              left: `${(hud.nearbyScreenX ?? 0.5) * 100}%`,
              top: `${(hud.nearbyScreenY ?? 0.52) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="fixed z-20"
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInteractFurniture();
              }}
              aria-label={hud.nearbyActionLabel}
              style={{ touchAction: 'none' }}
              className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 border-2 border-white text-slate-950 text-xs font-black tracking-wide shadow-lg cursor-pointer whitespace-nowrap transition-transform"
            >
              {hud.nearbyActionLabel}
            </button>
          </div>
        )}

      {/* Small Floating ENTER CAR Icon near any Parked or City Traffic Car */}
      {!overlayHidden &&
        !hud.inVehicle &&
        hud.placementMode === 'none' &&
        hud.interactingMode === 'none' &&
        hud.nearbyCarId && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              left: `${(hud.nearbyCarScreenX ?? 0.5) * 100}%`,
              top: `${(hud.nearbyCarScreenY ?? 0.48) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="fixed z-20"
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEnterCar();
              }}
              aria-label={`Enter ${hud.nearbyCarName ?? 'car'}`}
              style={{ touchAction: 'none' }}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-white text-slate-950 text-xs font-black tracking-wide shadow-xl cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-transform"
            >
              <Car className="w-4 h-4 stroke-[2.5]" />
              <span>ENTER CAR</span>
            </button>
          </div>
        )}

      {/* Golden Floating OPEN CHEST Prompt near Hidden Treasure Chests */}
      {!overlayHidden &&
        !hud.inVehicle &&
        hud.placementMode === 'none' &&
        hud.interactingMode === 'none' &&
        hud.nearbyChestId !== null && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              left: `${(hud.nearbyChestScreenX ?? 0.5) * 100}%`,
              top: `${(hud.nearbyChestScreenY ?? 0.44) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="fixed z-20"
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChest();
              }}
              aria-label="Open treasure chest"
              style={{ touchAction: 'none' }}
              className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hover:brightness-105 active:scale-95 border-2 border-white text-slate-950 text-xs font-black tracking-wide shadow-xl cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-transform"
            >
              <Gem className="w-4 h-4 stroke-[2.5]" />
              <span>OPEN CHEST</span>
            </button>
          </div>
        )}

      {/* Drivable Car Touch Controls: Bottom-Left Steering & Bottom-Right Brake + Gas */}
      {!overlayHidden && hud.inVehicle && (
        <>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            role="group"
            aria-label="Car steering controls"
            className={`fixed z-20 flex items-center gap-2 ${
              isCompactLandscape
                ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))]'
                : 'bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] sm:bottom-[max(2rem,env(safe-area-inset-bottom))] sm:left-[max(2rem,env(safe-area-inset-left))]'
            }`}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCarControlChange({ steer: 1 });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCarControlChange({ steer: 0 });
              }}
              onPointerLeave={() => onCarControlChange({ steer: 0 })}
              onPointerCancel={() => onCarControlChange({ steer: 0 })}
              aria-label="Steer left"
              style={{ touchAction: 'none' }}
              className={`${
                isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16 sm:w-[72px] sm:h-[72px]'
              } rounded-2xl bg-slate-950/80 hover:bg-slate-900 active:scale-92 active:bg-sky-500 active:text-slate-950 border-2 border-white/35 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform`}
            >
              <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8]" />
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCarControlChange({ steer: -1 });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCarControlChange({ steer: 0 });
              }}
              onPointerLeave={() => onCarControlChange({ steer: 0 })}
              onPointerCancel={() => onCarControlChange({ steer: 0 })}
              aria-label="Steer right"
              style={{ touchAction: 'none' }}
              className={`${
                isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16 sm:w-[72px] sm:h-[72px]'
              } rounded-2xl bg-slate-950/80 hover:bg-slate-900 active:scale-92 active:bg-sky-500 active:text-slate-950 border-2 border-white/35 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform`}
            >
              <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8]" />
            </button>
          </div>

          <div
            onPointerDown={(e) => e.stopPropagation()}
            role="group"
            aria-label="Car throttle and brake pedals"
            className={`fixed z-20 flex items-end gap-2 ${
              isCompactLandscape
                ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))]'
                : 'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] sm:bottom-[max(2rem,env(safe-area-inset-bottom))] sm:right-[max(2rem,env(safe-area-inset-right))]'
            }`}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCarControlChange({ brake: 1 });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCarControlChange({ brake: 0 });
              }}
              onPointerLeave={() => onCarControlChange({ brake: 0 })}
              onPointerCancel={() => onCarControlChange({ brake: 0 })}
              aria-label="Brake or reverse"
              style={{ touchAction: 'none' }}
              className={`${
                isCompactLandscape ? 'w-14 h-14' : 'w-16 h-16 sm:w-[72px] sm:h-[72px]'
              } rounded-2xl bg-rose-600/95 hover:bg-rose-500 active:scale-92 border-2 border-rose-200 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform`}
            >
              <ArrowDown className="w-5 h-5 stroke-[2.8]" />
              <span className="text-[10px] sm:text-[11px] font-black tracking-wide">BRAKE</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCarControlChange({ throttle: 1 });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCarControlChange({ throttle: 0 });
              }}
              onPointerLeave={() => onCarControlChange({ throttle: 0 })}
              onPointerCancel={() => onCarControlChange({ throttle: 0 })}
              aria-label="Accelerate forward"
              style={{ touchAction: 'none' }}
              className={`${
                isCompactLandscape ? 'w-16 h-[70px]' : 'w-[72px] h-20 sm:w-20 sm:h-24'
              } rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-92 border-2 border-white text-slate-950 shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform`}
            >
              <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
              <span className="text-[11px] sm:text-xs font-black tracking-wide">GAS</span>
            </button>
          </div>
        </>
      )}

      {/* Separate Furniture Editing Bar (Only visible inside houses when Decorate Mode is explicitly enabled) */}
      {!overlayHidden &&
        decorateMode &&
        hud.inHomeHouse &&
        hud.placementMode === 'none' &&
        hud.interactingMode === 'none' &&
        hud.nearbyPlacedId &&
        hud.nearbyIsMovable && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            role="region"
            aria-label="Decorate furniture controls"
            className={`fixed ${
              isCompactLandscape
                ? 'bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))]'
                : isNarrowPortrait
                  ? 'bottom-[max(16rem,calc(env(safe-area-inset-bottom)+15.5rem))]'
                  : 'bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5.75rem))]'
            } left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-20px)] bg-slate-950/90 border border-emerald-400/70 rounded-xl px-2 py-1 text-white shadow-xl flex items-center gap-1.5`}
          >
            {hud.nearbyPlacedName && (
              <span className="text-[11px] font-bold text-emerald-200 px-1 truncate max-w-[120px]">
                {hud.nearbyPlacedName}
              </span>
            )}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartEditFurniture();
              }}
              aria-label="Move or rotate placed furniture"
              style={{ touchAction: 'none' }}
              className="min-h-[34px] px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Move className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Move</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartReplaceFurniture();
              }}
              aria-label="Replace placed furniture"
              style={{ touchAction: 'none' }}
              className="min-h-[34px] px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Replace</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveFurniture();
              }}
              aria-label="Remove furniture to inventory"
              style={{ touchAction: 'none' }}
              className="min-h-[34px] px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Remove</span>
            </button>
          </div>
        )}

      {/* Furniture Ghost Placement / Move / Rotate Controls */}
      {!overlayHidden && hud.placementMode !== 'none' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          role="region"
          aria-label="Furniture placement controls"
          className={`fixed ${
            isCompactLandscape
              ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] max-w-[350px]'
              : isNarrowPortrait
                ? 'bottom-[max(11.5rem,calc(env(safe-area-inset-bottom)+11rem))] max-w-[360px]'
                : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))] max-w-[390px]'
          } left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-20px)] bg-slate-950/92 border-2 border-emerald-400 rounded-2xl p-2 sm:p-2.5 text-white shadow-2xl space-y-2`}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-extrabold truncate">
              {hud.placementMode === 'edit' ? 'Moving: ' : 'Placing: '}
              {hud.placementItemName}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                hud.placementValid
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {hud.placementValid ? 'Ready' : hud.placementReason ?? 'Blocked'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {/* Nudge Move Pad */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNudgePlacement(-1, 0);
                }}
                aria-label="Move furniture left"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/25 flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNudgePlacement(0, 1);
                }}
                aria-label="Move furniture forward"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/25 flex items-center justify-center cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNudgePlacement(0, -1);
                }}
                aria-label="Move furniture backward"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/25 flex items-center justify-center cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNudgePlacement(1, 0);
                }}
                aria-label="Move furniture right"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/25 flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate Left / Right */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRotatePlacement(-1);
                }}
                aria-label="Rotate furniture left"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 border border-white/30 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRotatePlacement(1);
                }}
                aria-label="Rotate furniture right"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 border border-white/30 flex items-center justify-center cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Confirm Place & Cancel */}
            <div className="flex items-center gap-1 flex-1 justify-end">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfirmPlacement();
                }}
                aria-label="Confirm place furniture"
                style={{ touchAction: 'none' }}
                className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 ${
                  hud.placementValid
                    ? 'bg-emerald-500 hover:bg-emerald-400 border-white text-slate-950'
                    : 'bg-slate-700 border-rose-400 text-rose-200'
                }`}
              >
                <Check className="w-4 h-4 stroke-[2.8]" />
                <span>Place</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancelPlacement();
                }}
                aria-label="Cancel furniture placement"
                style={{ touchAction: 'none' }}
                className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 border border-white/40 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.8]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Hotbar (Slots 1-5) + Dedicated Inventory Button */}
      {!overlayHidden && !hud.inVehicle && hud.placementMode === 'none' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`fixed ${
            isCompactLandscape
              ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))]'
              : isNarrowPortrait
                ? 'bottom-[max(11.35rem,calc(env(safe-area-inset-bottom)+11rem))]'
                : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
          } left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1`}
        >
          {activeDef && !isCompactLandscape && (
            <div className="px-2.5 py-0.5 rounded-md bg-slate-950/70 text-[11px] font-bold text-white/95 tracking-tight max-w-[240px] truncate">
              {activeDef.name}
            </div>
          )}

          <div
            role="toolbar"
            aria-label="Quick inventory hotbar"
            className={`flex items-center ${
              isCompactLandscape ? 'gap-1 p-1 rounded-xl' : 'gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl'
            } bg-slate-950/82 border-2 border-white/25 shadow-xl`}
          >
            {hotbar.map((slot, idx) => {
              const def = getItemDef(slot.itemId);
              const active = selectedHotbarIndex === idx;
              return (
                <button
                  key={`hud-slot-${idx}`}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectHotbarSlot(idx);
                  }}
                  aria-pressed={active}
                  aria-label={
                    def
                      ? `Hotbar slot ${idx + 1}: ${def.name}, quantity ${slot.qty}`
                      : `Empty hotbar slot ${idx + 1}`
                  }
                  style={{ touchAction: 'none' }}
                  className={`relative ${
                    isCompactLandscape
                      ? 'w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg'
                      : 'min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-xl'
                  } border-2 flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-sky-500/30 border-amber-400 shadow-md scale-[1.03]'
                      : 'bg-slate-900/75 hover:bg-slate-800/80 border-white/15'
                  }`}
                >
                  {!isCompactLandscape && (
                    <span className="hidden sm:block absolute top-0.5 left-1 text-[9px] font-bold text-slate-400 leading-none">
                      {idx + 1}
                    </span>
                  )}
                  {def && slot.qty > 0 ? (
                    <>
                      <ItemIcon itemId={def.id} size="sm" />
                      <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-extrabold text-white drop-shadow leading-none tabular-nums">
                        {slot.qty}
                      </span>
                    </>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white/15" />
                  )}
                </button>
              );
            })}

            {/* Dedicated Inventory Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenBackpack();
              }}
              aria-label="Open inventory"
              style={{ touchAction: 'none' }}
              className={`${
                isCompactLandscape
                  ? 'h-9 min-w-[44px] px-1.5 rounded-lg'
                  : 'min-w-[52px] min-h-[44px] h-11 sm:h-12 px-2 sm:px-3 rounded-xl'
              } bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 border-2 border-white text-slate-950 flex flex-col items-center justify-center gap-0.5 shadow-md cursor-pointer transition-transform ml-0.5`}
            >
              <Backpack className={isCompactLandscape ? 'w-4 h-4 stroke-[2.5]' : 'w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]'} />
              {!isCompactLandscape && (
                <span className="text-[9px] sm:text-[10px] font-extrabold leading-none tracking-tight">
                  Bag
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom-Right Controls: Ergonomic layout for Compact Landscape, Narrow Portrait, and Tablet/Desktop */}
      {!overlayHidden && !hud.inVehicle && (
        <div
          className={`pointer-events-none fixed z-20 flex flex-col items-end ${
            isCompactLandscape
              ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] gap-1.5'
              : isNarrowPortrait
                ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.6rem,env(safe-area-inset-right))] gap-1.5'
                : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] gap-2'
          }`}
        >
          {/* Compact Run & Dance Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleDance();
              }}
              aria-label={hud.isDancing ? 'Stop dancing' : 'Dance'}
              aria-pressed={hud.isDancing}
              style={{ touchAction: 'none' }}
              className={`pointer-events-auto ${
                isCompactLandscape
                  ? 'h-8 px-2.5 text-[11px] rounded-lg'
                  : isNarrowPortrait
                    ? 'min-w-[40px] h-9 px-2.5 text-[11px] rounded-xl'
                    : 'min-w-[44px] min-h-[44px] h-11 px-3 text-xs rounded-xl'
              } border-2 flex items-center justify-center gap-1 font-bold transition-transform duration-100 active:scale-95 cursor-pointer shadow-lg ${
                hud.isDancing
                  ? 'bg-fuchsia-500 border-fuchsia-200 text-slate-950'
                  : 'bg-slate-950/75 border-white/25 text-white hover:bg-slate-950/90'
              }`}
            >
              <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{hud.isDancing ? 'Dancing' : 'Dance'}</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSprint();
              }}
              aria-label={sprintLocked ? 'Disable run lock' : 'Enable run lock'}
              aria-pressed={sprintLocked}
              style={{ touchAction: 'none' }}
              className={`pointer-events-auto ${
                isCompactLandscape
                  ? 'h-8 px-2.5 text-[11px] rounded-lg'
                  : isNarrowPortrait
                    ? 'min-w-[40px] h-9 px-2.5 text-[11px] rounded-xl'
                    : 'min-w-[44px] min-h-[44px] h-11 px-3 text-xs rounded-xl'
              } border-2 flex items-center justify-center gap-1 font-bold transition-transform duration-100 active:scale-95 cursor-pointer shadow-lg ${
                sprintLocked
                  ? 'bg-amber-500 border-amber-200 text-slate-950'
                  : 'bg-slate-950/75 border-white/25 text-white hover:bg-slate-950/90'
              }`}
            >
              <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{sprintLocked ? 'Running' : 'Run'}</span>
            </button>
          </div>

          {/* In Compact Landscape, keep Break/Place + Jump (or Fly controls) on a single low horizontal row */}
          <div
            className={`flex ${
              isCompactLandscape ? 'flex-row items-end gap-1.5' : 'flex-col items-end gap-1.5 sm:gap-2'
            }`}
          >
            {/* Separate BREAK and PLACE/USE buttons side-by-side */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBreakPress();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onBreakRelease();
                }}
                onPointerCancel={onBreakRelease}
                onPointerLeave={onBreakRelease}
                onKeyDown={(e) => {
                  if (e.code === 'Enter' || e.code === 'Space') {
                    e.preventDefault();
                    onBreakPress();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.code === 'Enter' || e.code === 'Space') {
                    onBreakRelease();
                  }
                }}
                aria-label={hud.targetIsFixed ? 'Fixed room furniture' : 'Break targeted block'}
                style={{ touchAction: 'none' }}
                className={`pointer-events-auto ${
                  isCompactLandscape
                    ? 'w-12 h-12 rounded-xl'
                    : isNarrowPortrait
                      ? 'w-[52px] h-[52px] rounded-2xl'
                      : 'w-15 h-15 sm:w-16 sm:h-16 rounded-2xl'
                } border-2 shadow-xl flex flex-col items-center justify-center gap-0.5 transition-transform duration-100 active:scale-92 focus-visible:outline-2 focus-visible:outline-white cursor-pointer ${
                  hud.targetIsFixed
                    ? 'bg-slate-900/90 border-amber-400/70 text-amber-300'
                    : hud.hasTargetBlock
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white'
                      : 'bg-slate-800/85 border-white/25 text-slate-300'
                }`}
              >
                {hud.targetIsFixed ? (
                  <>
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-wide">Fixed</span>
                  </>
                ) : (
                  <>
                    <Pickaxe className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-wide">Break</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPlaceOrUse();
                }}
                onKeyDown={(e) => {
                  if (e.code === 'Enter' || e.code === 'Space') {
                    e.preventDefault();
                    onPlaceOrUse();
                  }
                }}
                aria-label={holdingConsumable ? `Use ${activeDef?.name}` : 'Place selected block'}
                style={{ touchAction: 'none' }}
                className={`pointer-events-auto ${
                  isCompactLandscape
                    ? 'w-12 h-12 rounded-xl'
                    : isNarrowPortrait
                      ? 'w-[52px] h-[52px] rounded-2xl'
                      : 'w-15 h-15 sm:w-16 sm:h-16 rounded-2xl'
                } border-2 shadow-xl flex flex-col items-center justify-center gap-0.5 transition-transform duration-100 active:scale-92 focus-visible:outline-2 focus-visible:outline-white cursor-pointer ${
                  holdingConsumable
                    ? 'bg-sky-400 hover:bg-sky-300 border-white text-slate-950'
                    : hud.hasTargetBlock && activeDef?.voxelId
                      ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-200 text-slate-950'
                      : 'bg-slate-800/85 border-white/25 text-slate-300'
                }`}
              >
                {holdingConsumable ? (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-wide">Use</span>
                  </>
                ) : (
                  <>
                    <Box className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-wide">Place</span>
                  </>
                )}
              </button>
            </div>

            {/* Primary Jump Button (or Creative Flight UP / DOWN / LAND Controls when Flying) */}
            {hud.isFlying ? (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                role="group"
                aria-label="Flight altitude and landing controls"
                className="pointer-events-auto flex items-end gap-1.5 sm:gap-2"
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLand();
                  }}
                  aria-label="Land smoothly on ground"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape
                      ? 'h-12 px-2.5 rounded-xl'
                      : isNarrowPortrait
                        ? 'h-13 px-2.5 rounded-2xl'
                        : 'h-14 sm:h-16 px-3.5 rounded-2xl'
                  } bg-emerald-400 hover:bg-emerald-300 active:scale-92 border-2 border-white text-slate-950 shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform`}
                >
                  <ArrowDown className="w-4 h-4 stroke-[2.8]" />
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wide">LAND</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFlyVerticalInput(-1);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onFlyVerticalInput(0);
                  }}
                  onPointerLeave={() => onFlyVerticalInput(0)}
                  onPointerCancel={() => onFlyVerticalInput(0)}
                  aria-label="Fly down"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape
                      ? 'w-12 h-12 rounded-xl'
                      : isNarrowPortrait
                        ? 'w-[52px] h-[52px] rounded-2xl'
                        : 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl'
                  } bg-slate-900/90 hover:bg-slate-800 active:scale-92 active:bg-sky-400 active:text-slate-950 border-2 border-sky-300/80 text-white shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform`}
                >
                  <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
                  <span className="text-[9px] sm:text-[10px] font-black tracking-wide">DOWN</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFlyVerticalInput(1);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    onFlyVerticalInput(0);
                  }}
                  onPointerLeave={() => onFlyVerticalInput(0)}
                  onPointerCancel={() => onFlyVerticalInput(0)}
                  aria-label="Fly up"
                  style={{ touchAction: 'none' }}
                  className={`${
                    isCompactLandscape
                      ? 'w-14 h-14'
                      : isNarrowPortrait
                        ? 'w-16 h-16'
                        : 'w-15 h-15 sm:w-[68px] sm:h-[68px]'
                  } rounded-full bg-sky-400 hover:bg-sky-300 active:scale-92 border-2 border-white text-slate-950 shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform`}
                >
                  <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.8]" />
                  <span className="text-[10px] sm:text-[11px] font-black tracking-wide">UP</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onJump();
                }}
                aria-label="Jump"
                style={{ touchAction: 'none' }}
                className={`pointer-events-auto ${
                  isCompactLandscape
                    ? 'w-14 h-14'
                    : isNarrowPortrait
                      ? 'w-16 h-16'
                      : 'w-[72px] h-[72px] sm:w-20 sm:h-20'
                } rounded-full bg-amber-500 hover:bg-amber-400 active:scale-92 border-2 border-amber-200 text-slate-950 shadow-xl flex flex-col items-center justify-center gap-0.5 transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-white cursor-pointer`}
              >
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.6]" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wide">Jump</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pause Modal Overlay */}
      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-30 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-slate-900 border border-white/15 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Game Paused</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Offline Voxel Sandbox
                </p>
              </div>
              <button
                type="button"
                onClick={onTogglePause}
                className="min-w-[44px] min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-white/10 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="cam-sens" className="text-slate-200 font-medium">
                    Camera Sensitivity
                  </label>
                  <span className="text-xs text-amber-300 font-medium tabular-nums">
                    {Math.abs(settings.cameraSensitivity - 1.0) < 0.05
                      ? 'Normal (1.0x)'
                      : Math.abs(settings.cameraSensitivity - 0.6) < 0.05
                        ? 'Low (0.6x)'
                        : Math.abs(settings.cameraSensitivity - 1.5) < 0.05
                          ? 'High (1.5x)'
                          : `${settings.cameraSensitivity.toFixed(1)}x`}
                  </span>
                </div>
                <input
                  id="cam-sens"
                  type="range"
                  min={0.4}
                  max={2.0}
                  step={0.1}
                  value={settings.cameraSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      cameraSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-amber-500 h-2 rounded-lg cursor-pointer"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Low', value: 0.6 },
                    { label: 'Normal', value: 1.0 },
                    { label: 'High', value: 1.5 },
                  ].map((preset) => {
                    const active = Math.abs(settings.cameraSensitivity - preset.value) < 0.05;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            cameraSensitivity: preset.value,
                          })
                        }
                        className={`min-h-[36px] rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-800/70 border-white/10 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      soundEnabled: !settings.soundEnabled,
                    })
                  }
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    settings.soundEnabled
                      ? 'bg-slate-800 border-amber-400/50 text-white'
                      : 'bg-slate-950 border-white/10 text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  <span>{settings.soundEnabled ? 'Sound On' : 'Sound Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      invertCameraY: !settings.invertCameraY,
                    })
                  }
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center cursor-pointer ${
                    settings.invertCameraY
                      ? 'bg-slate-800 border-amber-400/50 text-white'
                      : 'bg-slate-950 border-white/10 text-slate-300'
                  }`}
                >
                  <span>{settings.invertCameraY ? 'Invert Y: On' : 'Invert Y: Off'}</span>
                </button>
              </div>

              {hud.inHomeHouse && (
                <button
                  type="button"
                  onClick={onToggleDecorateMode}
                  aria-pressed={decorateMode}
                  className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    decorateMode
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                  }`}
                >
                  <Paintbrush className="w-4 h-4" />
                  <span>{decorateMode ? 'House Decorate Mode: On' : 'House Decorate Mode: Off'}</span>
                </button>
              )}

              {/* World Save & Load Controls */}
              <div className="rounded-xl bg-slate-950/75 border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    World Auto-Save
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {customBlockCount} blocks
                    {lastSavedAt
                      ? ` · ${new Date(lastSavedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}`
                      : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onSaveWorld}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-97 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow cursor-pointer transition-transform"
                  >
                    <Save className="w-4 h-4 stroke-[2.4]" />
                    <span>SAVE WORLD</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLoadWorld}
                    disabled={!hasSavedWorld}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-sky-500/90 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 active:scale-97 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:cursor-not-allowed transition-transform"
                  >
                    <FolderOpen className="w-4 h-4 stroke-[2.4]" />
                    <span>LOAD WORLD</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onResetPlayer();
                  onTogglePause();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-medium text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return to Dream Villa</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-white">Controls</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Move, Run &amp; Dance</span>
                <span>Joystick / WASD + Shift / Key G</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Camera &amp; Orbit</span>
                <span>Drag Screen / Top Camera Bar / Key C, Q, R</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Break Block</span>
                <span>Break Button / Key F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Place / Use Item</span>
                <span>Place Button / Key E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inventory, Shop &amp; Map</span>
                <span>Keys B / I · M · N</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Drive Car</span>
                <span>Enter/Exit Key V · Brake Space</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fly Mode</span>
                <span>Toggle Y · Up Space · Down X · Land L</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
