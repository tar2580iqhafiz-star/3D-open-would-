import React, { useCallback, useRef, useState } from 'react';
import { JoystickVector } from '../game/types';

interface VirtualJoystickProps {
  disabled?: boolean;
  sizePx?: number;
  onChange: (vec: JoystickVector) => void;
  onInteractStart?: () => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  disabled = false,
  sizePx = 136,
  onChange,
  onInteractStart,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [isRunningZone, setIsRunningZone] = useState(false);

  const maxRadius = Math.max(28, Math.round(sizePx * 0.34));
  const knobPx = Math.max(42, Math.round(sizePx * 0.44));
  const centerDotPx = Math.max(14, Math.round(sizePx * 0.145));
  const compactLabels = sizePx <= 114;

  const updateFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = clientX - centerX;
      const rawDy = clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(rawDy, rawDx);

      const offsetX = dist > 0.001 ? Math.cos(angle) * clampedDist : 0;
      const offsetY = dist > 0.001 ? Math.sin(angle) * clampedDist : 0;

      setKnobOffset({ x: offsetX, y: offsetY });

      const normX = offsetX / maxRadius;
      const normY = -offsetY / maxRadius; // Up on screen = +1 forward
      const mag = Math.hypot(normX, normY);
      setIsRunningZone(mag >= 0.62);
      onChange({ x: normX, y: normY });
    },
    [maxRadius, onChange],
  );

  const resetStick = useCallback(() => {
    activePointerId.current = null;
    setIsActive(false);
    setIsRunningZone(false);
    setKnobOffset({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  }, [onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onInteractStart?.();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsActive(true);
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetStick();
  };

  return (
    <div
      ref={padRef}
      role="slider"
      aria-label="Movement joystick"
      aria-valuetext={isRunningZone ? 'Running' : isActive ? 'Walking' : 'Idle'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ width: sizePx, height: sizePx, touchAction: 'none' }}
      className="relative rounded-full flex items-center justify-center cursor-pointer select-none"
    >
      {/* Outer tactile ring (solid rgba, zero backdrop-filter over WebGL) */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-colors duration-150 ${
          isActive
            ? isRunningZone
              ? 'bg-slate-950/55 border-amber-400/80'
              : 'bg-slate-950/50 border-white/55'
            : 'bg-slate-950/38 border-white/30'
        }`}
      />

      {/* Inner Walk/Run threshold ring */}
      <div
        className={`w-[62%] h-[62%] rounded-full border border-dashed pointer-events-none transition-colors duration-150 ${
          isRunningZone ? 'border-amber-300/60' : 'border-white/25'
        }`}
      />

      {/* Directional tick marks */}
      <span
        className={`absolute ${compactLabels ? 'top-1.5 text-[9px]' : 'top-2.5 text-[10px]'} font-semibold tracking-wide text-white/55 pointer-events-none`}
      >
        W
      </span>
      <span
        className={`absolute ${compactLabels ? 'bottom-1.5 text-[9px]' : 'bottom-2.5 text-[10px]'} font-semibold tracking-wide text-white/45 pointer-events-none`}
      >
        S
      </span>
      <span
        className={`absolute ${compactLabels ? 'left-2 text-[9px]' : 'left-3 text-[10px]'} font-semibold tracking-wide text-white/45 pointer-events-none`}
      >
        A
      </span>
      <span
        className={`absolute ${compactLabels ? 'right-2 text-[9px]' : 'right-3 text-[10px]'} font-semibold tracking-wide text-white/45 pointer-events-none`}
      >
        D
      </span>

      {/* Thumb knob */}
      <div
        style={{
          width: knobPx,
          height: knobPx,
          transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
        }}
        className={`absolute rounded-full border-2 shadow-lg pointer-events-none transition-colors duration-100 flex items-center justify-center ${
          isActive
            ? isRunningZone
              ? 'bg-amber-500 border-amber-200'
              : 'bg-white border-slate-200'
            : 'bg-white/90 border-white'
        }`}
      >
        <div
          style={{ width: centerDotPx, height: centerDotPx }}
          className={`rounded-full ${
            isRunningZone ? 'bg-amber-900/30' : 'bg-slate-900/15'
          }`}
        />
      </div>
    </div>
  );
};
