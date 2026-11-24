import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { createFurnitureMesh } from '../game/furnitureModels';
import { ItemIcon } from './ItemIcon';

const previewCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;

function ensurePreviewRenderer(): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (sharedRenderer && sharedScene && sharedCamera) {
    return { renderer: sharedRenderer, scene: sharedScene, camera: sharedCamera };
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
    renderer.setSize(220, 176, false);

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.4);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.65);
    key.position.set(3.2, 4.8, 3.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(34, 220 / 176, 0.1, 30);

    sharedRenderer = renderer;
    sharedScene = scene;
    sharedCamera = camera;
    return { renderer, scene, camera };
  } catch {
    return null;
  }
}

export function renderFurnitureThumbnailUrl(itemId: string): string | null {
  const existing = previewCache.get(itemId);
  if (existing) return existing;

  const studio = ensurePreviewRenderer();
  if (!studio) return null;

  const { renderer, scene, camera } = studio;
  const handle = createFurnitureMesh(itemId);
  // Subtle hero turntable angle for attractive 3/4 product presentation
  handle.group.rotation.y = -0.56;
  scene.add(handle.group);
  handle.group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(handle.group);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(0.55, size.x, size.y * 1.08, size.z);
  const dist = (maxDim / 2) / Math.tan(THREE.MathUtils.degToRad(34 / 2)) * 1.48;

  camera.position.set(
    center.x + dist * 0.16,
    center.y + size.y * 0.26 + dist * 0.24,
    center.z + dist,
  );
  camera.lookAt(center.x, center.y, center.z);
  camera.updateProjectionMatrix();

  renderer.clear();
  renderer.render(scene, camera);

  let dataUrl: string | null = null;
  try {
    dataUrl = renderer.domElement.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 64) {
      previewCache.set(itemId, dataUrl);
    }
  } catch {
    dataUrl = null;
  }

  scene.remove(handle.group);
  handle.dispose();
  return dataUrl;
}

interface FurniturePreview3DProps {
  itemId: string;
  alt: string;
  className?: string;
  fallbackSize?: 'sm' | 'md' | 'lg';
}

export const FurniturePreview3D: React.FC<FurniturePreview3DProps> = ({
  itemId,
  alt,
  className = 'w-full h-full object-contain',
  fallbackSize = 'lg',
}) => {
  const [src, setSrc] = useState<string | null>(() => previewCache.get(itemId) ?? null);

  useEffect(() => {
    const cached = previewCache.get(itemId);
    if (cached) {
      setSrc(cached);
      return;
    }
    const url = renderFurnitureThumbnailUrl(itemId);
    if (url) {
      setSrc(url);
    }
  }, [itemId]);

  if (!src) {
    return <ItemIcon itemId={itemId} size={fallbackSize} />;
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
