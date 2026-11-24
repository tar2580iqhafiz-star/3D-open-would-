import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { createPlayerRig } from '../game/player';
import {
  EquippedOutfitLoadout,
  getPreviewLoadoutForItem,
  getXSuitItemDef,
} from '../game/xSuits';
import { ItemIcon } from './ItemIcon';

const outfitPreviewCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;
let dummyAtlasTex: THREE.CanvasTexture | null = null;

function ensureOutfitStudio(): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  atlasTex: THREE.CanvasTexture;
} | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (sharedRenderer && sharedScene && sharedCamera && dummyAtlasTex) {
    return {
      renderer: sharedRenderer,
      scene: sharedScene,
      camera: sharedCamera,
      atlasTex: dummyAtlasTex,
    };
  }
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setSize(210, 250, false);

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.55);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.8);
    key.position.set(2.8, 4.4, 3.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 1.15);
    rim.position.set(-3.2, 2.8, -2.6);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(32, 210 / 250, 0.1, 20);

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const atlasTex = new THREE.CanvasTexture(canvas);

    sharedRenderer = renderer;
    sharedScene = scene;
    sharedCamera = camera;
    dummyAtlasTex = atlasTex;
    return { renderer, scene, camera, atlasTex };
  } catch {
    return null;
  }
}

export function renderOutfitThumbnailUrl(loadout: EquippedOutfitLoadout): string | null {
  const key = `${loadout.suitId ?? ''}|${loadout.helmetId ?? ''}|${loadout.bootsId ?? ''}|${loadout.accessoryId ?? ''}`;
  const existing = outfitPreviewCache.get(key);
  if (existing) return existing;

  const studio = ensureOutfitStudio();
  if (!studio) return null;

  const { renderer, scene, camera, atlasTex } = studio;
  const rig = createPlayerRig(atlasTex, {
    showHeldBlock: false,
    castShadow: false,
    initialOutfit: loadout,
  });
  rig.contactShadow.visible = false;
  rig.visualRoot.rotation.y = -0.42;
  scene.add(rig.root);
  rig.updateAnimation(0.016, 0, 5.5, true, 0, false, 0, 'normal');
  rig.root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(rig.visualRoot);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(1.85, size.y * 1.06, size.x * 0.9);
  const dist = (maxDim / 2) / Math.tan(THREE.MathUtils.degToRad(32 / 2)) * 1.18;

  camera.position.set(
    center.x + dist * 0.14,
    center.y + 0.12,
    center.z + dist,
  );
  camera.lookAt(center.x, center.y + 0.04, center.z);
  camera.updateProjectionMatrix();

  renderer.clear();
  renderer.render(scene, camera);

  let dataUrl: string | null = null;
  try {
    dataUrl = renderer.domElement.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 64) {
      outfitPreviewCache.set(key, dataUrl);
    }
  } catch {
    dataUrl = null;
  }

  scene.remove(rig.root);
  rig.dispose();
  return dataUrl;
}

interface OutfitPreview3DProps {
  itemId?: string;
  loadout?: EquippedOutfitLoadout;
  alt: string;
  className?: string;
  fallbackSize?: 'sm' | 'md' | 'lg';
}

export const OutfitPreview3D: React.FC<OutfitPreview3DProps> = ({
  itemId,
  loadout,
  alt,
  className = 'w-full h-full object-contain',
  fallbackSize = 'lg',
}) => {
  const effectiveLoadout: EquippedOutfitLoadout | null = React.useMemo(() => {
    if (loadout) return loadout;
    if (!itemId) return null;
    const def = getXSuitItemDef(itemId);
    return def ? getPreviewLoadoutForItem(def) : null;
  }, [itemId, loadout]);

  const cacheKey = effectiveLoadout
    ? `${effectiveLoadout.suitId ?? ''}|${effectiveLoadout.helmetId ?? ''}|${effectiveLoadout.bootsId ?? ''}|${effectiveLoadout.accessoryId ?? ''}`
    : '';

  const [src, setSrc] = useState<string | null>(() =>
    cacheKey ? (outfitPreviewCache.get(cacheKey) ?? null) : null,
  );

  useEffect(() => {
    if (!effectiveLoadout) {
      setSrc(null);
      return;
    }
    const cached = outfitPreviewCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }
    const url = renderOutfitThumbnailUrl(effectiveLoadout);
    if (url) {
      setSrc(url);
    }
  }, [cacheKey, effectiveLoadout]);

  if (!src) {
    return itemId ? <ItemIcon itemId={itemId} size={fallbackSize} /> : null;
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={className}
    />
  );
};
