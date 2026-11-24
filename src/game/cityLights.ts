import * as THREE from 'three';
import { getVoxel } from './terrain';
import { VOXEL_ID } from './types';

export interface CityLightAnchor {
  x: number;
  y: number;
  z: number;
  colorHex: number;
  intensity: number;
  distance: number;
}

export interface CityLightSystem {
  group: THREE.Group;
  update: (
    cityLightsLevel: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    inVehicle: boolean,
    carYaw: number,
  ) => void;
  dispose: () => void;
}

function createSoftLightPoolTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 226, 150, 0.95)');
  grad.addColorStop(0.38, 'rgba(255, 198, 102, 0.42)');
  grad.addColorStop(0.75, 'rgba(255, 175, 72, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 165, 60, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const POOL_LIGHT_COUNT = 5;

export function createCityLightSystem(): CityLightSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const streetPoleTransforms: Array<{ x: number; y: number; z: number; rotY: number }> = [];
  const decorBollardPositions: Array<{ x: number; y: number; z: number }> = [];
  const groundPools: Array<{ x: number; y: number; z: number; radius: number }> = [];
  const anchors: CityLightAnchor[] = [];

  const isSpotClear = (x: number, z: number): boolean => {
    const gx = Math.round(x);
    const gz = Math.round(z);
    const floorId = getVoxel(gx, 1, gz);
    if (floorId === VOXEL_ID.AIR) return false;
    for (let y = 2; y <= 5; y++) {
      if (getVoxel(gx, y, gz) !== VOXEL_ID.AIR) return false;
    }
    return true;
  };

  const tryAddStreetlight = (x: number, z: number, rotY: number) => {
    if (!isSpotClear(x, z)) return;
    // Also verify overhanging arm tip clear at y=5
    const tipX = Math.round(x + Math.sin(rotY) * 0.7);
    const tipZ = Math.round(z + Math.cos(rotY) * 0.7);
    if (getVoxel(tipX, 5, tipZ) !== VOXEL_ID.AIR) return;

    // Avoid clustering poles closer than 9m
    for (let i = 0; i < streetPoleTransforms.length; i++) {
      const p = streetPoleTransforms[i];
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < 81) return;
    }

    streetPoleTransforms.push({ x, y: 2, z, rotY });
    const bulbX = x + Math.sin(rotY) * 0.68;
    const bulbZ = z + Math.cos(rotY) * 0.68;
    groundPools.push({ x: bulbX, y: 2.03, z: bulbZ, radius: 5.4 });
    anchors.push({
      x: bulbX,
      y: 5.15,
      z: bulbZ,
      colorHex: 0xffc875,
      intensity: 4.4,
      distance: 17.5,
    });
  };

  const tryAddDecorBollard = (x: number, z: number, colorHex = 0xffe08a) => {
    const gx = Math.round(x);
    const gz = Math.round(z);
    if (getVoxel(gx, 1, gz) === VOXEL_ID.AIR) return;
    if (getVoxel(gx, 2, gz) !== VOXEL_ID.AIR || getVoxel(gx, 3, gz) !== VOXEL_ID.AIR) return;
    decorBollardPositions.push({ x, y: 2, z });
    groundPools.push({ x, y: 2.03, z, radius: 3.1 });
    anchors.push({
      x,
      y: 3.1,
      z,
      colorHex,
      intensity: 2.6,
      distance: 11.5,
    });
  };

  // 1. Central Main Avenues (x = +-3 sidewalks facing road center, z = +-3 sidewalks facing road center)
  for (const z of [-36, -16, -8, 8, 16, 36]) {
    tryAddStreetlight(-3.15, z, Math.PI / 2);
    tryAddStreetlight(3.15, z, -Math.PI / 2);
  }
  for (const x of [-36, -16, -8, 8, 16, 36]) {
    tryAddStreetlight(x, -3.15, 0);
    tryAddStreetlight(x, 3.15, Math.PI);
  }

  // 2. Ring Roads & Mid Connectors
  for (const z of [-32, -12, 12, 32]) {
    tryAddStreetlight(-24.15, z, Math.PI / 2);
    tryAddStreetlight(24.15, z, -Math.PI / 2);
  }
  for (const x of [-32, -12, 12, 32]) {
    tryAddStreetlight(x, -24.15, 0);
    tryAddStreetlight(x, 24.15, Math.PI);
  }

  // 3. Expanded North, West, East, and South Districts
  for (const z of [-102, -84, -64, -48]) {
    tryAddStreetlight(-3.15, z, Math.PI / 2);
    tryAddStreetlight(3.15, z, -Math.PI / 2);
  }
  for (const z of [48, 66, 86, 106, 122]) {
    tryAddStreetlight(-3.15, z, Math.PI / 2);
    tryAddStreetlight(3.15, z, -Math.PI / 2);
  }
  for (const x of [48, 66, 86, 102]) {
    tryAddStreetlight(x, -3.15, 0);
    tryAddStreetlight(x, 3.15, Math.PI);
  }
  for (const x of [-102, -84, -64, -48]) {
    tryAddStreetlight(x, -3.15, 0);
    tryAddStreetlight(x, 3.15, Math.PI);
  }
  // Upper North Blvd & South Connector & Dream Villa Approach
  for (const x of [-66, -38, -16, 16, 38, 66, 92, 122]) {
    tryAddStreetlight(x, -51.8, Math.PI);
    tryAddStreetlight(x, 49.8, 0);
  }
  // Outer North Woodland Blvd & West Ave Extension & Outer East Promenade Blvd
  for (const x of [-124, -84, -44, 44, 84, 124]) {
    tryAddStreetlight(x, -142.2, 0);
  }
  for (const x of [-158, -138, -120, 122, 138]) {
    tryAddStreetlight(x, -3.15, 0);
    tryAddStreetlight(x, 3.15, Math.PI);
  }
  for (const z of [-122, -74, -26, 26]) {
    tryAddStreetlight(143.85, z, -Math.PI / 2);
    tryAddStreetlight(148.15, z, Math.PI / 2);
  }
  // Shopping Mall Plaza Apron
  tryAddStreetlight(69.5, -8.5, Math.PI / 2);
  tryAddStreetlight(69.5, 8.5, Math.PI / 2);

  // 4. Decorative Park, Beach Promenade & Dream Villa Garden Lanterns
  for (const [bx, bz] of [
    [-16, 34],
    [-8, 34],
    [-16, 26],
    [-8, 26],
    // Dream Villa driveway & garden path lanterns
    [5, 80],
    [5, 92],
    [5, 102],
    [13, 107],
    [22, 107],
    // Beach Promenade & Boardwalk lanterns
    [-70, 132],
    [-52, 132],
    [-34, 132],
    [-18, 132],
    [18, 132],
    [34, 132],
    [52, 132],
    [70, 132],
    [-10, 154],
    [10, 154],
    // Outer Woodland Promenade & Cabin Trail Lanterns
    [-144, -143],
    [-100, -143],
    [-50, -143],
    [0, -148],
    [50, -143],
    [100, -143],
    [144, -143],
    [-143, -80],
    [-143, 0],
    [-143, 75],
    [147, -72],
    [147, 26],
    [147, 85],
  ] as const) {
    tryAddDecorBollard(bx, bz, bz >= 130 ? 0xfef08a : 0xffd580);
  }

  // 5. Interior House & Building Light Anchors (Dream Villa, Neighborhood Houses, Civic Buildings, Mall)
  const buildingAnchors: CityLightAnchor[] = [
    // Player's Dream Villa (ground floor living/kitchen, bedrooms, upper floor, front porch)
    { x: 14.5, y: 4.9, z: 91, colorHex: 0xffe4a3, intensity: 4.6, distance: 16 },
    { x: 26, y: 4.9, z: 90, colorHex: 0xffe4a3, intensity: 4.2, distance: 15 },
    { x: 16, y: 9.8, z: 90, colorHex: 0xffe099, intensity: 4.2, distance: 15 },
    { x: 26, y: 9.8, z: 90, colorHex: 0xffe099, intensity: 4.0, distance: 15 },
    { x: 10, y: 4.6, z: 98, colorHex: 0xffd382, intensity: 3.8, distance: 14 },
    // Shopping Mall 1F & 2F Atrium
    { x: 82, y: 5.5, z: 0, colorHex: 0xfff1c9, intensity: 5.2, distance: 20 },
    { x: 84, y: 10.5, z: 0, colorHex: 0xfff1c9, intensity: 4.8, distance: 19 },
    // Hospital, School, Police Station, Hotel, Cafe, Cinema, Restaurant
    { x: -16, y: 5.2, z: -60, colorHex: 0xe0f2fe, intensity: 4.6, distance: 16 },
    { x: 16, y: 5.2, z: -60, colorHex: 0xffe8b3, intensity: 4.5, distance: 16 },
    { x: 48, y: 5.2, z: -20, colorHex: 0xffe4a8, intensity: 4.4, distance: 16 },
    { x: -58, y: 5.0, z: -20, colorHex: 0xfde68a, intensity: 4.2, distance: 16 },
    { x: -58, y: 5.0, z: 14, colorHex: 0xe879f9, intensity: 4.2, distance: 16 },
    { x: 14, y: 5.0, z: 62, colorHex: 0xffd991, intensity: 4.2, distance: 16 },
    { x: -16, y: 5.0, z: 62, colorHex: 0xffd991, intensity: 4.2, distance: 16 },
    // Core Neighborhood Houses
    { x: 12, y: 4.8, z: -12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: -12, y: 4.8, z: -12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 12, y: 4.8, z: 12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: -12, y: 4.8, z: 12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 30, y: 4.8, z: -12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: -30, y: 4.8, z: 12, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 30, y: 4.8, z: 30, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: -30, y: 4.8, z: -30, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    // Expanded Houses (North, West, East) & New Outer Landmarks
    { x: -12, y: 4.8, z: -102, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 50, y: 4.8, z: -101, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: -104, y: 4.8, z: -32, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 78, y: 4.8, z: -36, colorHex: 0xffe099, intensity: 4.0, distance: 14 },
    { x: 161, y: 5.2, z: -11, colorHex: 0xc4b5fd, intensity: 4.8, distance: 18 },
    { x: -160, y: 5.2, z: -12, colorHex: 0xbae6fd, intensity: 4.4, distance: 16 },
    { x: 64, y: 5.0, z: -153, colorHex: 0xffd580, intensity: 4.4, distance: 16 },
  ];
  for (let i = 0; i < buildingAnchors.length; i++) {
    anchors.push(buildingAnchors[i]);
  }

  // Materials (shared for ultra-low GPU overhead)
  const ironPoleMat = new THREE.MeshStandardMaterial({
    color: '#28303d',
    roughness: 0.55,
    metalness: 0.45,
  });
  const lanternBulbMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    emissive: '#ffcf6e',
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.05,
  });
  const poolTex = createSoftLightPoolTexture();
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    color: '#ffd98a',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(ironPoleMat, lanternBulbMat, poolTex, poolMat);

  const dummy = new THREE.Object3D();

  // Instanced Streetlight Poles (vertical shaft + top horizontal arm combined cleanly using 2 instanced meshes: shafts & arms)
  const poleCount = Math.max(1, streetPoleTransforms.length);
  const shaftGeo = new THREE.BoxGeometry(0.18, 3.6, 0.18);
  const armGeo = new THREE.BoxGeometry(0.16, 0.14, 0.85);
  const bulbGeo = new THREE.BoxGeometry(0.36, 0.22, 0.44);
  disposables.push(shaftGeo, armGeo, bulbGeo);

  const shaftMesh = new THREE.InstancedMesh(shaftGeo, ironPoleMat, poleCount);
  const armMesh = new THREE.InstancedMesh(armGeo, ironPoleMat, poleCount);
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, lanternBulbMat, poleCount);
  shaftMesh.castShadow = false;
  armMesh.castShadow = false;
  bulbMesh.castShadow = false;

  for (let i = 0; i < streetPoleTransforms.length; i++) {
    const p = streetPoleTransforms[i];
    dummy.position.set(p.x, p.y + 1.8, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    shaftMesh.setMatrixAt(i, dummy.matrix);

    const offX = Math.sin(p.rotY) * 0.36;
    const offZ = Math.cos(p.rotY) * 0.36;
    dummy.position.set(p.x + offX, p.y + 3.55, p.z + offZ);
    dummy.updateMatrix();
    armMesh.setMatrixAt(i, dummy.matrix);

    const tipX = Math.sin(p.rotY) * 0.68;
    const tipZ = Math.cos(p.rotY) * 0.68;
    dummy.position.set(p.x + tipX, p.y + 3.42, p.z + tipZ);
    dummy.updateMatrix();
    bulbMesh.setMatrixAt(i, dummy.matrix);
  }
  shaftMesh.count = streetPoleTransforms.length;
  armMesh.count = streetPoleTransforms.length;
  bulbMesh.count = streetPoleTransforms.length;
  if (streetPoleTransforms.length > 0) {
    shaftMesh.instanceMatrix.needsUpdate = true;
    armMesh.instanceMatrix.needsUpdate = true;
    bulbMesh.instanceMatrix.needsUpdate = true;
    group.add(shaftMesh, armMesh, bulbMesh);
  }

  // Instanced Decorative Park / Villa / Beach Bollards
  const decorCount = Math.max(1, decorBollardPositions.length);
  const bollardBaseGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
  const bollardLampGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  disposables.push(bollardBaseGeo, bollardLampGeo);
  const bollardBaseMesh = new THREE.InstancedMesh(bollardBaseGeo, ironPoleMat, decorCount);
  const bollardLampMesh = new THREE.InstancedMesh(bollardLampGeo, lanternBulbMat, decorCount);

  for (let i = 0; i < decorBollardPositions.length; i++) {
    const d = decorBollardPositions[i];
    dummy.position.set(d.x, d.y + 0.425, d.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bollardBaseMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(d.x, d.y + 0.98, d.z);
    dummy.updateMatrix();
    bollardLampMesh.setMatrixAt(i, dummy.matrix);
  }
  bollardBaseMesh.count = decorBollardPositions.length;
  bollardLampMesh.count = decorBollardPositions.length;
  if (decorBollardPositions.length > 0) {
    bollardBaseMesh.instanceMatrix.needsUpdate = true;
    bollardLampMesh.instanceMatrix.needsUpdate = true;
    group.add(bollardBaseMesh, bollardLampMesh);
  }

  // Instanced Ground Warm Light Pools (visible ONLY when cityLightsLevel > 0.02)
  const poolPlaneGeo = new THREE.PlaneGeometry(1, 1);
  poolPlaneGeo.rotateX(-Math.PI / 2);
  disposables.push(poolPlaneGeo);
  const poolDecalMesh = new THREE.InstancedMesh(
    poolPlaneGeo,
    poolMat,
    Math.max(1, groundPools.length),
  );
  poolDecalMesh.renderOrder = 2;
  for (let i = 0; i < groundPools.length; i++) {
    const g = groundPools[i];
    dummy.position.set(g.x, g.y, g.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(g.radius * 2, 1, g.radius * 2);
    dummy.updateMatrix();
    poolDecalMesh.setMatrixAt(i, dummy.matrix);
  }
  poolDecalMesh.count = groundPools.length;
  poolDecalMesh.visible = false;
  if (groundPools.length > 0) {
    poolDecalMesh.instanceMatrix.needsUpdate = true;
    group.add(poolDecalMesh);
  }

  // 5-Slot Pooled Real Dynamic PointLights (fixed tiny GPU cost across entire open-world)
  const pointPool: THREE.PointLight[] = [];
  for (let i = 0; i < POOL_LIGHT_COUNT; i++) {
    const pl = new THREE.PointLight('#ffd282', 0, 18, 1.5);
    pl.castShadow = false;
    pl.visible = false;
    group.add(pl);
    pointPool.push(pl);
  }

  // Reusable nearest-5 selection scratch arrays (zero allocation per frame)
  const bestIdx = new Int32Array(POOL_LIGHT_COUNT);
  const bestDistSq = new Float64Array(POOL_LIGHT_COUNT);

  const update = (
    cityLightsLevel: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    inVehicle: boolean,
    carYaw: number,
  ) => {
    const active = cityLightsLevel > 0.015;
    lanternBulbMat.emissiveIntensity = active ? cityLightsLevel * 2.4 : 0;
    poolMat.opacity = active ? cityLightsLevel * 0.42 : 0;
    poolDecalMesh.visible = active && groundPools.length > 0;

    if (!active) {
      for (let i = 0; i < POOL_LIGHT_COUNT; i++) {
        pointPool[i].intensity = 0;
        pointPool[i].visible = false;
      }
      return;
    }

    // Reserve slot 0 for active drivable car headlights at night so driving down streets truly lights the road ahead!
    const anchorSlots = inVehicle ? POOL_LIGHT_COUNT - 1 : POOL_LIGHT_COUNT;
    if (inVehicle) {
      const carLight = pointPool[POOL_LIGHT_COUNT - 1];
      const beamDist = 7.2;
      carLight.position.set(
        playerX + Math.sin(carYaw) * beamDist,
        playerY + 1.35,
        playerZ + Math.cos(carYaw) * beamDist,
      );
      carLight.color.setHex(0xfff1c2);
      carLight.distance = 22;
      carLight.intensity = 5.4 * cityLightsLevel;
      carLight.visible = true;
    }

    for (let k = 0; k < anchorSlots; k++) {
      bestIdx[k] = -1;
      bestDistSq[k] = 30 * 30;
    }

    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const dx = a.x - playerX;
      const dy = (a.y - (playerY + 1.2)) * 1.4;
      const dz = a.z - playerZ;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq >= bestDistSq[anchorSlots - 1]) continue;

      let insertAt = anchorSlots - 1;
      while (insertAt > 0 && dSq < bestDistSq[insertAt - 1]) {
        bestDistSq[insertAt] = bestDistSq[insertAt - 1];
        bestIdx[insertAt] = bestIdx[insertAt - 1];
        insertAt--;
      }
      bestDistSq[insertAt] = dSq;
      bestIdx[insertAt] = i;
    }

    for (let k = 0; k < anchorSlots; k++) {
      const pl = pointPool[k];
      const ai = bestIdx[k];
      if (ai < 0) {
        pl.intensity = 0;
        pl.visible = false;
      } else {
        const a = anchors[ai];
        pl.position.set(a.x, a.y, a.z);
        pl.color.setHex(a.colorHex);
        pl.distance = a.distance;
        pl.intensity = a.intensity * cityLightsLevel;
        pl.visible = true;
      }
    }
  };

  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
  };

  return {
    group,
    update,
    dispose,
  };
}
