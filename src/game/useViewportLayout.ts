import { useEffect, useState } from 'react';

export interface ViewportLayout {
  width: number;
  height: number;
  isLandscape: boolean;
  isCompactLandscape: boolean;
  isNarrowPortrait: boolean;
  isTouchDevice: boolean;
}

function readViewportMetrics(): ViewportLayout {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 720,
      isLandscape: true,
      isCompactLandscape: false,
      isNarrowPortrait: false,
      isTouchDevice: false,
    };
  }

  const vv = window.visualViewport;
  const width = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const height = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  const isLandscape = width > height;
  const isTouchDevice =
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    window.matchMedia?.('(pointer: coarse)').matches === true;

  return {
    width,
    height,
    isLandscape,
    isCompactLandscape: isLandscape && height <= 520,
    isNarrowPortrait: !isLandscape && width < 440,
    isTouchDevice,
  };
}

export function useViewportLayout(): ViewportLayout {
  const [layout, setLayout] = useState<ViewportLayout>(() => readViewportMetrics());

  useEffect(() => {
    const sync = () => {
      const next = readViewportMetrics();
      setLayout((prev) =>
        prev.width === next.width &&
        prev.height === next.height &&
        prev.isCompactLandscape === next.isCompactLandscape &&
        prev.isNarrowPortrait === next.isNarrowPortrait &&
        prev.isTouchDevice === next.isTouchDevice
          ? prev
          : next,
      );
    };

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.visualViewport?.addEventListener('resize', sync);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, []);

  return layout;
}
