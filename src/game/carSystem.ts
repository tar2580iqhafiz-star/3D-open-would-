import * as THREE from 'three';
import { getSafeGroundSupportY, isSolidAtWorld } from './terrain';

export type CarBodyStyle = 'sedan' | 'sport' | 'suv' | 'compact' | 'van' | 'rickshaw';

export interface CarInputState {
  throttle: number; // 0..1 forward gas
  brake: number; // 0..1 brake / reverse
  steer: number; // -1 (right) .. +1 (left)
}

export interface CarWorldPose {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
}

export interface CarSystem {
  group: THREE.Group;
  update: (
    dt: number,
    playerPos: THREE.Vector3,
    playerInVehicle: boolean,
    activeCarId: string | null,
    controls: CarInputState,
  ) => void;
  findNearestEnterableCar: (
    px: number,
    py: number,
    pz: number,
    maxDist?: number,
  ) => CarWorldPose | null;
  getCarPose: (carId: string) => CarWorldPose | null;
  getDriverSeatPose: (carId: string) => { x: number; y: number; z: number; yaw: number } | null;
  getSafeExitPosition: (carId: string) => { x: number; y: number; z: number } | null;
  claimCar: (carId: string) => boolean;
  releaseCar: (carId: string) => void;
  setNightLightLevel: (level: number) => void;
  resolvePlayerCollision: (playerPos: THREE.Vector3, playerRadius: number) => void;
  dispose: () => void;
}

interface CarRuntime {
  id: string;
  name: string;
  style: CarBodyStyle;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  flPivot: THREE.Group;
  frPivot: THREE.Group;
  wheelMeshes: THREE.Group[];
  steeringWheelMesh: THREE.Group;
  driverGroup: THREE.Group | null;
  driverHeadPivot: THREE.Group | null;
  driverSeatLocalX: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  wheelSpin: number;
  halfW: number;
  halfL: number;
  maxSpeed: number;
  accel: number;
  isTraffic: boolean;
  playerOwned: boolean;
  loopWaypoints: ReadonlyArray<readonly [number, number]> | null;
  waypointIdx: number;
  trafficBaseSpeed: number;
  laneOffset: number;
  stuckTimer: number;
  bypassOffset: number;
  bypassTimer: number;
  yieldTimer: number;
  recoveryCooldown: number;
}

interface SignalIntersection {
  id: string;
  x: number;
  z: number;
  phaseOffset: number; // 0 or 9s for green-wave coordination
  halfBox: number;
}

interface ParkingLotSpec {
  id: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  bayAxis: 'x' | 'z'; // direction bays run along
  bayRowCoord: number; // fixed center coordinate of parked cars along perpendicular axis
  bayStarts: readonly number[]; // 5 stall centers
  carYaw: number;
  lineSpanMin: number;
  lineSpanMax: number;
}

function createCarShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.14,
    size / 2,
    size / 2,
    size * 0.49,
  );
  grad.addColorStop(0, 'rgba(8, 12, 20, 0.54)');
  grad.addColorStop(0.65, 'rgba(8, 12, 20, 0.26)');
  grad.addColorStop(1, 'rgba(8, 12, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ============================================================================
// VERIFIED 100% ASPHALT CITY ROAD NETWORK & BOUNDARY CORRIDORS
// (Cars stay strictly on city roads; never enter beach, ocean, buildings, or woods)
// ============================================================================
const ROAD_CORRIDORS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-2.45, -142.0, 2.45, 127.0], // Central North-South Avenue (Jinnah Ave + North Ext)
  [-166.5, -2.45, 148.5, 2.45], // Central East-West Avenue (Mall Rd + West & East Ext)
  [-23.4, -41.2, -20.6, 41.2], // Inner Ring West
  [20.6, -41.2, 23.4, 41.2], // Inner Ring East
  [-41.2, -23.4, 41.2, -20.6], // Inner Ring North
  [-41.2, 20.6, 41.2, 23.4], // Inner Ring South
  [-48.2, -51.5, 148.5, -48.5], // North Civic Connector Blvd (extended East)
  [-24.2, 45.5, 148.5, 48.5], // South Boulevard Connector (extended East)
  [-93.5, -93.5, 148.5, -90.5], // Upper North Blvd (extended East)
  [44.5, -51.5, 47.5, 24.2], // East Market Connector
  [-47.5, -51.5, -44.5, 24.2], // West Arcade Connector
  [105.5, -93.5, 108.5, 48.5], // Outer East Grand Ave
  [-93.5, -93.5, -90.5, 48.5], // Outer West St
  [-146.5, -141.5, 148.5, -138.5], // Outer North Woodland Blvd
  [144.5, -141.5, 147.5, 48.5], // Outer East Promenade Blvd
];

function isOnCityRoad(x: number, z: number): boolean {
  for (let i = 0; i < ROAD_CORRIDORS.length; i++) {
    const [x0, z0, x1, z1] = ROAD_CORRIDORS[i];
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return true;
  }
  return false;
}

function clampToNearestRoad(x: number, z: number): { x: number; z: number } {
  let bestX = x;
  let bestZ = z;
  let bestDistSq = Infinity;
  for (let i = 0; i < ROAD_CORRIDORS.length; i++) {
    const [x0, z0, x1, z1] = ROAD_CORRIDORS[i];
    const cx = THREE.MathUtils.clamp(x, x0 + 0.35, x1 - 0.35);
    const cz = THREE.MathUtils.clamp(z, z0 + 0.35, z1 - 0.35);
    const dSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = cx;
      bestZ = cz;
    }
  }
  return { x: bestX, z: bestZ };
}

// Closed city traffic loops along verified continuous asphalt avenues
const LOOP_INNER_RING: ReadonlyArray<readonly [number, number]> = [
  [-22, -22],
  [22, -22],
  [22, 22],
  [-22, 22],
];

const LOOP_INNER_NE: ReadonlyArray<readonly [number, number]> = [
  [0, -22],
  [22, -22],
  [22, 0],
  [0, 0],
];

const LOOP_INNER_SW: ReadonlyArray<readonly [number, number]> = [
  [-22, 0],
  [0, 0],
  [0, 22],
  [-22, 22],
];

const LOOP_NORTH_EAST_CIVIC: ReadonlyArray<readonly [number, number]> = [
  [0, -50],
  [46, -50],
  [46, 0],
  [0, 0],
];

const LOOP_WEST_ARCADE: ReadonlyArray<readonly [number, number]> = [
  [-46, -50],
  [0, -50],
  [0, 0],
  [-46, 0],
];

const LOOP_OUTER_EAST_GRAND: ReadonlyArray<readonly [number, number]> = [
  [0, -92],
  [107, -92],
  [107, 47],
  [0, 47],
];

const LOOP_EAST_MID_LOOP: ReadonlyArray<readonly [number, number]> = [
  [0, -50],
  [107, -50],
  [107, 47],
  [0, 47],
];

const LOOP_OUTER_NORTH_WEST: ReadonlyArray<readonly [number, number]> = [
  [-92, -92],
  [0, -92],
  [0, 0],
  [-92, 0],
];

const LOOP_OUTER_NORTH_LOOP: ReadonlyArray<readonly [number, number]> = [
  [0, -140],
  [146, -140],
  [146, -92],
  [0, -92],
];

const LOOP_OUTER_EAST_PROMENADE: ReadonlyArray<readonly [number, number]> = [
  [107, -50],
  [146, -50],
  [146, 47],
  [107, 47],
];

// Synchronized Signalized Pakistani City Chowks (Intersections)
const TRAFFIC_SIGNALS: ReadonlyArray<SignalIntersection> = [
  { id: 'sig_center', x: 0, z: 0, phaseOffset: 0, halfBox: 3.1 },
  { id: 'sig_south', x: 0, z: 47, phaseOffset: 9, halfBox: 3.1 },
  { id: 'sig_north', x: 0, z: -50, phaseOffset: 9, halfBox: 3.1 },
  { id: 'sig_upper_north', x: 0, z: -92, phaseOffset: 0, halfBox: 3.1 },
  { id: 'sig_outer_north', x: 0, z: -140, phaseOffset: 9, halfBox: 3.1 },
  { id: 'sig_east', x: 46, z: 0, phaseOffset: 9, halfBox: 3.1 },
  { id: 'sig_west', x: -46, z: 0, phaseOffset: 9, halfBox: 3.1 },
  { id: 'sig_east_promenade', x: 146, z: 0, phaseOffset: 0, halfBox: 2.8 },
  { id: 'sig_east_north_conn', x: 146, z: -50, phaseOffset: 9, halfBox: 2.8 },
  { id: 'sig_east_south_conn', x: 146, z: 47, phaseOffset: 9, halfBox: 2.8 },
  { id: 'sig_east_upper', x: 146, z: -92, phaseOffset: 0, halfBox: 2.8 },
  { id: 'sig_east_outer_ne', x: 146, z: -140, phaseOffset: 9, halfBox: 2.8 },
];

const SIGNAL_CYCLE_SEC = 18.0;

function getSignalAspect(
  cycleClock: number,
  phaseOffset: number,
  axis: 'ns' | 'ew',
): 'green' | 'amber' | 'red' {
  const t = (cycleClock + phaseOffset) % SIGNAL_CYCLE_SEC;
  if (axis === 'ns') {
    if (t < 7.5) return 'green';
    if (t < 9.0) return 'amber';
    return 'red';
  }
  if (t >= 9.0 && t < 16.5) return 'green';
  if (t >= 16.5) return 'amber';
  return 'red';
}

// 7 Dedicated City Roadside Parking Lots matching expandedDistrictBuilder.ts
const PARKING_LOTS: ReadonlyArray<ParkingLotSpec> = [
  {
    id: 'lot_showroom',
    x0: 50,
    z0: 50,
    x1: 69,
    z1: 61,
    bayAxis: 'x',
    bayRowCoord: 57.6,
    bayStarts: [52.5, 56.0, 59.5, 63.0, 66.5],
    carYaw: Math.PI,
    lineSpanMin: 55.2,
    lineSpanMax: 60.4,
  },
  {
    id: 'lot_mall',
    x0: 74,
    z0: 32,
    x1: 93,
    z1: 44,
    bayAxis: 'x',
    bayRowCoord: 35.4,
    bayStarts: [76.5, 80.0, 83.5, 87.0, 90.5],
    carYaw: 0,
    lineSpanMin: 32.6,
    lineSpanMax: 37.8,
  },
  {
    id: 'lot_school',
    x0: -39,
    z0: -89,
    x1: -20,
    z1: -77,
    bayAxis: 'x',
    bayRowCoord: -80.4,
    bayStarts: [-36.5, -33.0, -29.5, -26.0, -22.5],
    carYaw: Math.PI,
    lineSpanMin: -82.8,
    lineSpanMax: -77.6,
  },
  {
    id: 'lot_police',
    x0: 24,
    z0: -89,
    x1: 43,
    z1: -77,
    bayAxis: 'x',
    bayRowCoord: -80.4,
    bayStarts: [26.5, 30.0, 33.5, 37.0, 40.5],
    carYaw: Math.PI,
    lineSpanMin: -82.8,
    lineSpanMax: -77.6,
  },
  {
    id: 'lot_cinema',
    x0: -89,
    z0: -38,
    x1: -77,
    z1: -19,
    bayAxis: 'z',
    bayRowCoord: -80.4,
    bayStarts: [-35.5, -32.0, -28.5, -25.0, -21.5],
    carYaw: -Math.PI / 2,
    lineSpanMin: -82.8,
    lineSpanMax: -77.6,
  },
  {
    id: 'lot_bazaar',
    x0: 68,
    z0: -65,
    x1: 87,
    z1: -53,
    bayAxis: 'x',
    bayRowCoord: -61.6,
    bayStarts: [70.5, 74.0, 77.5, 81.0, 84.5],
    carYaw: 0,
    lineSpanMin: -64.4,
    lineSpanMax: -59.2,
  },
  {
    id: 'lot_beachway',
    x0: -20,
    z0: 78,
    x1: -4,
    z1: 97,
    bayAxis: 'z',
    bayRowCoord: -15.4,
    bayStarts: [80.5, 84.0, 87.5, 91.0, 94.5],
    carYaw: Math.PI / 2,
    lineSpanMin: -18.2,
    lineSpanMax: -12.6,
  },
];

// Authentic Pakistani Driver Kurta / Shalwar Kameez / Waistcoat Wardrobe Palettes
const DRIVER_OUTFITS = [
  { skin: '#c88a60', hair: '#18181b', shirt: '#f8fafc', vest: '#334155', cap: '#f8fafc' }, // White Kurta + Charcoal Waistcoat + Kufi
  { skin: '#b87950', hair: '#1e1b18', shirt: '#0f766e', vest: '#0f766e', cap: '' }, // Teal Shalwar Kameez
  { skin: '#d69b72', hair: '#18181b', shirt: '#1e3a8a', vest: '#0f172a', cap: '' }, // Navy Collar Shirt
  { skin: '#a66a46', hair: '#111827', shirt: '#e2e8f0', vest: '#78350f', cap: '#92400e' }, // Cream Kameez + Brown Waistcoat + Pakol
  { skin: '#c6885e', hair: '#18181b', shirt: '#0284c7', vest: '#0284c7', cap: '' }, // Sky Blue Kurta
  { skin: '#bd7e54', hair: '#27201c', shirt: '#991b1b', vest: '#1f2937', cap: '' }, // Maroon Shirt + Vest
];

export function createCarSystem(): CarSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // Shared ultra-lightweight pooled geometries across all city vehicles, lines, signals & drivers
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.255, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const steerRingGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.04, 12);
  steerRingGeo.rotateX(Math.PI / 2);
  const shadowTex = createCarShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1, 1);

  const trimMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.72,
    metalness: 0.12,
  });
  const interiorMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.85,
    metalness: 0.04,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.78,
    metalness: 0.02,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.9,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.26,
    metalness: 0.72,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fef08a',
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    emissive: '#ef4444',
    emissiveIntensity: 0.58,
    roughness: 0.25,
  });
  const taxiCapMat = new THREE.MeshStandardMaterial({
    color: '#fde047',
    emissive: '#eab308',
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const rickshawYellowMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    roughness: 0.38,
    metalness: 0.12,
  });
  const rickshawGreenMat = new THREE.MeshStandardMaterial({
    color: '#15803d',
    roughness: 0.42,
    metalness: 0.14,
  });
  const parkingLineMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.7,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const poleYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.48,
    metalness: 0.15,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });

  // 2 Signal Phase Material Triplets (A = phaseOffset 0, B = phaseOffset 9)
  const makeLensMat = (color: string, emissive: string) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.15,
      roughness: 0.25,
    });

  const sigLens = {
    aNsRed: makeLensMat('#7f1d1d', '#ef4444'),
    aNsAmber: makeLensMat('#78350f', '#f59e0b'),
    aNsGreen: makeLensMat('#14532d', '#22c55e'),
    aEwRed: makeLensMat('#7f1d1d', '#ef4444'),
    aEwAmber: makeLensMat('#78350f', '#f59e0b'),
    aEwGreen: makeLensMat('#14532d', '#22c55e'),
    bNsRed: makeLensMat('#7f1d1d', '#ef4444'),
    bNsAmber: makeLensMat('#78350f', '#f59e0b'),
    bNsGreen: makeLensMat('#14532d', '#22c55e'),
    bEwRed: makeLensMat('#7f1d1d', '#ef4444'),
    bEwAmber: makeLensMat('#78350f', '#f59e0b'),
    bEwGreen: makeLensMat('#14532d', '#22c55e'),
  };

  const poolTex = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 8, 2, 32, 36, 32);
    grad.addColorStop(0.0, 'rgba(255, 248, 200, 0.92)');
    grad.addColorStop(0.45, 'rgba(255, 232, 145, 0.42)');
    grad.addColorStop(1.0, 'rgba(255, 220, 120, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  })();

  const headlightBeamMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    color: '#fff3c4',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const headlightBeamGeo = new THREE.PlaneGeometry(3.2, 6.2);
  headlightBeamGeo.rotateX(-Math.PI / 2);

  if (shadowTex) {
    disposables.push(shadowTex);
  }
  disposables.push(
    poolTex,
    headlightBeamMat,
    headlightBeamGeo,
    unitBox,
    tireGeo,
    rimGeo,
    steerRingGeo,
    shadowGeo,
    trimMat,
    interiorMat,
    seatMat,
    tireMat,
    rimMat,
    glassMat,
    headlightMat,
    taillightMat,
    taxiCapMat,
    rickshawYellowMat,
    rickshawGreenMat,
    parkingLineMat,
    poleYellowMat,
    shadowMat,
    sigLens.aNsRed,
    sigLens.aNsAmber,
    sigLens.aNsGreen,
    sigLens.aEwRed,
    sigLens.aEwAmber,
    sigLens.aEwGreen,
    sigLens.bNsRed,
    sigLens.bNsAmber,
    sigLens.bNsGreen,
    sigLens.bEwRed,
    sigLens.bEwAmber,
    sigLens.bEwGreen,
  );

  const flatMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getFlatMat = (hex: string, roughness = 0.72, metalness = 0.05): THREE.MeshStandardMaterial => {
    const key = `${hex}_${roughness}_${metalness}`;
    let mat = flatMatCache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
      flatMatCache.set(key, mat);
      disposables.push(mat);
    }
    return mat;
  };

  const getPaintMat = (hex: string): THREE.MeshStandardMaterial => getFlatMat(hex, 0.28, 0.34);

  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow = false,
    rotX = 0,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(unitBox, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    if (rotX !== 0) mesh.rotation.x = rotX;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ============================================================================
  // VISIBLE PARKING LINES & TRAFFIC SIGNAL POLES + STOP LINES
  // ============================================================================
  const markingsGroup = new THREE.Group();
  group.add(markingsGroup);

  for (let i = 0; i < PARKING_LOTS.length; i++) {
    const lot = PARKING_LOTS[i];
    const halfBay = 1.75;
    if (lot.bayAxis === 'x') {
      const len = lot.lineSpanMax - lot.lineSpanMin;
      const midZ = (lot.lineSpanMin + lot.lineSpanMax) * 0.5;
      // 6 stall divider lines flanking the 5 parking spaces
      for (let s = 0; s <= lot.bayStarts.length; s++) {
        const lx =
          s < lot.bayStarts.length ? lot.bayStarts[s] - halfBay : lot.bayStarts[s - 1] + halfBay;
        addBox(markingsGroup, 0.13, 0.025, len, lx, 2.022, midZ, parkingLineMat);
      }
      // Back wheel-stop bar along the curb side of the bays
      const curbZ = lot.carYaw === 0 ? lot.lineSpanMin + 0.06 : lot.lineSpanMax - 0.06;
      const totalW = lot.bayStarts[lot.bayStarts.length - 1] - lot.bayStarts[0] + halfBay * 2;
      const midX = (lot.bayStarts[0] + lot.bayStarts[lot.bayStarts.length - 1]) * 0.5;
      addBox(markingsGroup, totalW, 0.025, 0.14, midX, 2.022, curbZ, parkingLineMat);
    } else {
      const len = lot.lineSpanMax - lot.lineSpanMin;
      const midX = (lot.lineSpanMin + lot.lineSpanMax) * 0.5;
      for (let s = 0; s <= lot.bayStarts.length; s++) {
        const lz =
          s < lot.bayStarts.length ? lot.bayStarts[s] - halfBay : lot.bayStarts[s - 1] + halfBay;
        addBox(markingsGroup, len, 0.025, 0.13, midX, 2.022, lz, parkingLineMat);
      }
      const curbX = lot.carYaw > 0 ? lot.lineSpanMin + 0.06 : lot.lineSpanMax - 0.06;
      const totalL = lot.bayStarts[lot.bayStarts.length - 1] - lot.bayStarts[0] + halfBay * 2;
      const midZ = (lot.bayStarts[0] + lot.bayStarts[lot.bayStarts.length - 1]) * 0.5;
      addBox(markingsGroup, 0.14, 0.025, totalL, curbX, 2.022, midZ, parkingLineMat);
    }
  }

  // Build 3D Pakistani Traffic Signal Poles + Stop Lines at the 6 Signalized Intersections
  for (let i = 0; i < TRAFFIC_SIGNALS.length; i++) {
    const sig = TRAFFIC_SIGNALS[i];
    const isPhaseA = sig.phaseOffset === 0;
    const nsRed = isPhaseA ? sigLens.aNsRed : sigLens.bNsRed;
    const nsAmber = isPhaseA ? sigLens.aNsAmber : sigLens.bNsAmber;
    const nsGreen = isPhaseA ? sigLens.aNsGreen : sigLens.bNsGreen;
    const ewRed = isPhaseA ? sigLens.aEwRed : sigLens.bEwRed;
    const ewAmber = isPhaseA ? sigLens.aEwAmber : sigLens.bEwAmber;
    const ewGreen = isPhaseA ? sigLens.aEwGreen : sigLens.bEwGreen;

    // White Stop Lines across each road lane right before the crosswalk
    addBox(markingsGroup, 2.2, 0.024, 0.22, sig.x - 1.1, 2.022, sig.z - 3.65, parkingLineMat);
    addBox(markingsGroup, 2.2, 0.024, 0.22, sig.x + 1.1, 2.022, sig.z + 3.65, parkingLineMat);
    addBox(markingsGroup, 0.22, 0.024, 2.2, sig.x - 3.65, 2.022, sig.z + 1.1, parkingLineMat);
    addBox(markingsGroup, 0.22, 0.024, 2.2, sig.x + 3.65, 2.022, sig.z - 1.1, parkingLineMat);

    // Corner sidewalk poles (diagonally opposite so clear of carriageways!)
    const corners: Array<readonly [number, number]> = [
      [sig.x + 3.3, sig.z + 3.3],
      [sig.x - 3.3, sig.z - 3.3],
    ];
    for (let c = 0; c < corners.length; c++) {
      const [px, pz] = corners[c];
      const pole = new THREE.Group();
      pole.position.set(px, 2.0, pz);
      // Striped black/yellow pole shaft
      addBox(pole, 0.22, 1.3, 0.22, 0, 0.65, 0, trimMat, true);
      addBox(pole, 0.24, 0.45, 0.24, 0, 1.5, 0, poleYellowMat);
      addBox(pole, 0.2, 2.3, 0.2, 0, 2.85, 0, trimMat, true);

      // N-S Signal Head (faces along Z)
      addBox(pole, 0.36, 1.05, 0.3, 0, 4.1, 0, trimMat);
      addBox(pole, 0.22, 0.22, 0.34, 0, 4.42, 0, nsRed);
      addBox(pole, 0.22, 0.22, 0.34, 0, 4.1, 0, nsAmber);
      addBox(pole, 0.22, 0.22, 0.34, 0, 3.78, 0, nsGreen);

      // E-W Signal Head (faces along X on cross arm)
      addBox(pole, 0.3, 1.05, 0.36, c === 0 ? -0.34 : 0.34, 4.1, 0, trimMat);
      const xHead = c === 0 ? -0.34 : 0.34;
      addBox(pole, 0.34, 0.22, 0.22, xHead, 4.42, 0, ewRed);
      addBox(pole, 0.34, 0.22, 0.22, xHead, 4.1, 0, ewAmber);
      addBox(pole, 0.34, 0.22, 0.22, xHead, 3.78, 0, ewGreen);

      markingsGroup.add(pole);
    }
  }

  // ============================================================================
  // LIGHTWEIGHT POOLED HUMAN DRIVER BUILDER (Inside Moving Cars)
  // ============================================================================
  const buildDriverVisual = (outfitIdx: number, seatLocalX: number, seatBaseY: number, seatZ: number) => {
    const o = DRIVER_OUTFITS[outfitIdx % DRIVER_OUTFITS.length];
    const skinMat = getFlatMat(o.skin, 0.85, 0.0);
    const hairMat = getFlatMat(o.hair, 0.88, 0.0);
    const shirtMat = getFlatMat(o.shirt, 0.82, 0.02);
    const vestMat = getFlatMat(o.vest, 0.78, 0.04);
    const eyeMat = getFlatMat('#0f172a', 0.4, 0.1);

    const driverGroup = new THREE.Group();
    driverGroup.position.set(seatLocalX, seatBaseY, seatZ);

    // Seated torso (Shalwar Kameez / Waistcoat)
    addBox(driverGroup, 0.4, 0.44, 0.24, 0, 0.32, 0, vestMat);
    addBox(driverGroup, 0.24, 0.34, 0.25, 0, 0.36, 0.01, shirtMat);

    // Seated thighs extending forward
    addBox(driverGroup, 0.16, 0.14, 0.36, -0.1, 0.08, 0.18, shirtMat);
    addBox(driverGroup, 0.16, 0.14, 0.36, 0.1, 0.08, 0.18, shirtMat);

    // Arms reaching forward toward the steering wheel / handlebars
    addBox(driverGroup, 0.11, 0.12, 0.34, -0.22, 0.42, 0.2, shirtMat);
    addBox(driverGroup, 0.11, 0.12, 0.34, 0.22, 0.42, 0.2, shirtMat);
    addBox(driverGroup, 0.09, 0.09, 0.09, -0.2, 0.41, 0.38, skinMat);
    addBox(driverGroup, 0.09, 0.09, 0.09, 0.2, 0.41, 0.38, skinMat);

    // Head pivot for gentle steering glance
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.56, 0.02);
    addBox(headPivot, 0.3, 0.3, 0.3, 0, 0.15, 0, skinMat);
    addBox(headPivot, 0.32, 0.1, 0.32, 0, 0.27, -0.01, hairMat);
    addBox(headPivot, 0.31, 0.18, 0.08, 0, 0.18, -0.13, hairMat);
    addBox(headPivot, 0.05, 0.04, 0.03, -0.07, 0.16, 0.15, eyeMat);
    addBox(headPivot, 0.05, 0.04, 0.03, 0.07, 0.16, 0.15, eyeMat);
    if (o.cap) {
      addBox(headPivot, 0.33, 0.08, 0.33, 0, 0.32, 0, getFlatMat(o.cap, 0.78, 0.02));
    }
    driverGroup.add(headPivot);

    return { driverGroup, headPivot };
  };

  // ============================================================================
  // VEHICLE SPAWNER (All Parked & Moving Pakistani City Cars)
  // ============================================================================
  const cars: CarRuntime[] = [];

  const spawnCar = (cfg: {
    id: string;
    name: string;
    style: CarBodyStyle;
    colorHex: string;
    x: number;
    z: number;
    yaw: number;
    hasTaxiSign?: boolean;
    hasStripe?: boolean;
    driverOutfitIdx?: number;
    loopWaypoints?: ReadonlyArray<readonly [number, number]>;
    waypointIdx?: number;
    trafficBaseSpeed?: number;
    laneOffset?: number;
  }) => {
    const paintMat = getPaintMat(cfg.colorHex);
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const isSport = cfg.style === 'sport';
    const isSuv = cfg.style === 'suv';
    const isCompact = cfg.style === 'compact';
    const isVan = cfg.style === 'van';
    const isRickshaw = cfg.style === 'rickshaw';
    const isMovingTraffic = Boolean(cfg.loopWaypoints && cfg.loopWaypoints.length >= 2);

    const bodyW = isRickshaw
      ? 1.38
      : isSport
        ? 1.9
        : isSuv
          ? 1.88
          : isVan
            ? 1.76
            : isCompact
              ? 1.72
              : 1.82;
    const bodyL = isRickshaw
      ? 2.75
      : isSport
        ? 3.86
        : isSuv
          ? 3.92
          : isVan
            ? 3.65
            : isCompact
              ? 3.22
              : 3.74;
    const wheelBaseZ = isRickshaw ? 0.92 : isCompact ? 1.02 : 1.24;
    const trackX = bodyW * 0.48;
    const clearanceY = isSuv ? 0.34 : isRickshaw ? 0.28 : isSport ? 0.24 : 0.28;
    const driverLocalX = isRickshaw ? 0 : 0.34;

    // Grounded soft shadow
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(bodyW * 1.28, bodyL * 1.15, 1);
    shadow.position.y = 0.025;
    root.add(shadow);

    const flPivot = new THREE.Group();
    const frPivot = new THREE.Group();
    const wheelMeshes: THREE.Group[] = [];
    const buildWheel = (parent: THREE.Object3D, x: number, y: number, z: number, scaleXZ = 1) => {
      const wg = new THREE.Group();
      wg.position.set(x, y, z);
      if (scaleXZ !== 1) wg.scale.set(1, scaleXZ, scaleXZ);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wg.add(tire, rim);
      parent.add(wg);
      wheelMeshes.push(wg);
    };

    const steeringWheelMesh = new THREE.Group();
    let seatBaseY = clearanceY + 0.26;
    let seatZ = -0.18;

    if (isRickshaw) {
      // Iconic Green & Yellow Pakistani Auto-Rickshaw (3-wheeler)
      addBox(bodyPivot, bodyW * 0.9, 0.14, bodyL * 0.9, 0, clearanceY + 0.02, -0.04, trimMat, true);
      // Yellow front nose cowl & mudguard
      addBox(bodyPivot, bodyW * 0.68, 0.56, 0.72, 0, clearanceY + 0.34, bodyL * 0.3, rickshawYellowMat, true);
      // Green rear passenger tub
      addBox(bodyPivot, bodyW, 0.58, 1.38, 0, clearanceY + 0.35, -0.58, rickshawGreenMat, true);
      // Seats (Driver center front, passenger bench rear)
      seatBaseY = clearanceY + 0.24;
      seatZ = 0.08;
      addBox(bodyPivot, 0.52, 0.16, 0.44, 0, clearanceY + 0.2, seatZ, seatMat);
      addBox(bodyPivot, bodyW * 0.78, 0.18, 0.52, 0, clearanceY + 0.24, -0.74, seatMat);
      addBox(bodyPivot, bodyW * 0.78, 0.42, 0.12, 0, clearanceY + 0.48, -0.98, seatMat);
      // Handlebar assembly
      steeringWheelMesh.position.set(0, clearanceY + 0.72, 0.56);
      const bar = new THREE.Mesh(unitBox, trimMat);
      bar.scale.set(0.62, 0.06, 0.06);
      const stem = new THREE.Mesh(unitBox, rimMat);
      stem.scale.set(0.07, 0.24, 0.07);
      stem.position.set(0, -0.12, 0);
      steeringWheelMesh.add(bar, stem);
      bodyPivot.add(steeringWheelMesh);

      // Sloped windshield + open yellow/green canvas canopy roof
      addBox(bodyPivot, bodyW * 0.74, 0.58, 0.05, 0, clearanceY + 0.88, 0.64, glassMat, false, -0.2);
      addBox(bodyPivot, 0.08, 0.88, 0.08, -bodyW * 0.42, clearanceY + 0.96, -1.16, trimMat);
      addBox(bodyPivot, 0.08, 0.88, 0.08, bodyW * 0.42, clearanceY + 0.96, -1.16, trimMat);
      addBox(bodyPivot, 0.08, 0.84, 0.08, -bodyW * 0.36, clearanceY + 0.94, 0.56, trimMat);
      addBox(bodyPivot, 0.08, 0.84, 0.08, bodyW * 0.36, clearanceY + 0.94, 0.56, trimMat);
      addBox(bodyPivot, bodyW * 0.92, 0.11, 2.02, 0, clearanceY + 1.4, -0.28, rickshawYellowMat, true);
      // Single central headlight & rear taillights
      addBox(bodyPivot, 0.24, 0.2, 0.08, 0, clearanceY + 0.44, bodyL * 0.46, headlightMat);
      addBox(bodyPivot, 0.22, 0.12, 0.06, -0.44, clearanceY + 0.36, -1.28, taillightMat);
      addBox(bodyPivot, 0.22, 0.12, 0.06, 0.44, clearanceY + 0.36, -1.28, taillightMat);

      // 1 front central wheel + 2 rear wheels
      flPivot.position.set(0, 0.26, wheelBaseZ);
      frPivot.position.set(0, 0.26, wheelBaseZ);
      root.add(flPivot, frPivot);
      buildWheel(flPivot, 0, 0, 0, 0.78);
      buildWheel(root, trackX, 0.26, -0.78, 0.78);
      buildWheel(root, -trackX, 0.26, -0.78, 0.78);
    } else {
      // Lower chassis & front/rear bumpers
      addBox(bodyPivot, bodyW * 0.94, 0.14, bodyL * 0.96, 0, clearanceY + 0.02, 0, trimMat, true);
      addBox(bodyPivot, bodyW + 0.04, 0.18, 0.18, 0, clearanceY + 0.12, bodyL * 0.5 - 0.04, trimMat);
      addBox(bodyPivot, bodyW + 0.04, 0.18, 0.18, 0, clearanceY + 0.12, -bodyL * 0.5 + 0.04, trimMat);

      const lowerH = isSuv ? 0.56 : isVan ? 0.58 : isSport ? 0.46 : 0.5;
      const hoodTopY = clearanceY + lowerH;
      addBox(bodyPivot, bodyW * 0.88, 0.14, bodyL * 0.54, 0, clearanceY + 0.09, -0.05, interiorMat);

      const hoodL = isVan ? 0.52 : isCompact ? 0.88 : isSport ? 1.26 : 1.12;
      const hoodCenterZ = bodyL * 0.5 - hoodL * 0.5;
      addBox(bodyPivot, bodyW, lowerH, hoodL, 0, clearanceY + lowerH * 0.5, hoodCenterZ, paintMat, true);

      const rearL = isVan ? 0.48 : isCompact ? 0.62 : isSuv ? 0.86 : 0.96;
      const rearCenterZ = -bodyL * 0.5 + rearL * 0.5;
      addBox(bodyPivot, bodyW, lowerH, rearL, 0, clearanceY + lowerH * 0.5, rearCenterZ, paintMat, true);

      const midL = bodyL - hoodL - rearL + 0.14;
      const midCenterZ = (hoodCenterZ - hoodL * 0.5 + (rearCenterZ + rearL * 0.5)) * 0.5;
      const doorH = lowerH * 0.86;
      addBox(bodyPivot, 0.14, doorH, midL, bodyW * 0.5 - 0.07, clearanceY + doorH * 0.5 + 0.06, midCenterZ, paintMat, true);
      addBox(bodyPivot, 0.14, doorH, midL, -bodyW * 0.5 + 0.07, clearanceY + doorH * 0.5 + 0.06, midCenterZ, paintMat, true);

      // Driver (+X) & Passenger (-X) seats
      seatZ = isVan ? 0.22 : -0.18;
      seatBaseY = clearanceY + 0.26;
      addBox(bodyPivot, 0.52, 0.14, 0.5, 0.34, clearanceY + 0.22, seatZ, seatMat);
      addBox(bodyPivot, 0.52, 0.46, 0.14, 0.34, clearanceY + 0.48, seatZ - 0.2, seatMat);
      addBox(bodyPivot, 0.52, 0.14, 0.5, -0.34, clearanceY + 0.22, seatZ, seatMat);
      addBox(bodyPivot, 0.52, 0.46, 0.14, -0.34, clearanceY + 0.48, seatZ - 0.2, seatMat);

      // Dashboard & steering wheel
      const dashZ = isVan ? 0.92 : 0.56;
      addBox(bodyPivot, bodyW - 0.26, 0.26, 0.34, 0, hoodTopY - 0.05, dashZ, trimMat);
      steeringWheelMesh.position.set(0.34, hoodTopY + 0.12, isVan ? 0.72 : 0.34);
      steeringWheelMesh.rotation.x = -0.38;
      const wheelRing = new THREE.Mesh(steerRingGeo, trimMat);
      const wheelHub = new THREE.Mesh(unitBox, rimMat);
      wheelHub.scale.set(0.24, 0.04, 0.045);
      steeringWheelMesh.add(wheelRing, wheelHub);
      bodyPivot.add(steeringWheelMesh);

      // Roof & pillars
      const cabinH = isVan ? 1.02 : isSuv ? 0.92 : isCompact ? 0.84 : isSport ? 0.78 : 0.84;
      const roofY = hoodTopY + cabinH;
      const cabinW = bodyW * 0.9;
      const cabinStartZ = isVan ? -bodyL * 0.46 : isCompact ? -bodyL * 0.42 : isSuv ? -bodyL * 0.44 : -0.96;
      const cabinEndZ = isVan ? bodyL * 0.38 : 0.72;
      const cabinL = cabinEndZ - cabinStartZ;
      const cabinCenterZ = (cabinStartZ + cabinEndZ) * 0.5;

      const pillarW = 0.11;
      for (const sx of [-1, 1]) {
        addBox(
          bodyPivot,
          pillarW,
          cabinH,
          pillarW,
          sx * (cabinW * 0.5 - pillarW * 0.5),
          hoodTopY + cabinH * 0.5,
          cabinEndZ - 0.1,
          trimMat,
          false,
          isVan ? -0.08 : -0.22,
        );
        addBox(
          bodyPivot,
          pillarW,
          cabinH,
          pillarW * 1.4,
          sx * (cabinW * 0.5 - pillarW * 0.5),
          hoodTopY + cabinH * 0.5,
          cabinStartZ + 0.1,
          paintMat,
        );
      }
      addBox(bodyPivot, cabinW, 0.11, cabinL, 0, roofY, cabinCenterZ, paintMat, true);

      // Clear windshield & windows so seated human drivers remain clearly visible!
      addBox(bodyPivot, cabinW - 0.2, cabinH * 0.84, 0.06, 0, hoodTopY + cabinH * 0.46, cabinEndZ - 0.06, glassMat, false, isVan ? -0.08 : -0.24);
      addBox(bodyPivot, cabinW - 0.2, cabinH * 0.78, 0.06, 0, hoodTopY + cabinH * 0.45, cabinStartZ + 0.06, glassMat, false, 0.18);
      for (const sx of [-1, 1]) {
        addBox(bodyPivot, 0.04, cabinH * 0.68, cabinL * 0.76, sx * (cabinW * 0.5 - 0.04), hoodTopY + cabinH * 0.42, cabinCenterZ, glassMat);
      }

      if (cfg.hasTaxiSign) {
        addBox(bodyPivot, 0.48, 0.16, 0.24, 0, roofY + 0.13, cabinCenterZ + 0.12, taxiCapMat);
        // Classic Pakistani yellow-and-black side taxi band
        addBox(bodyPivot, bodyW + 0.03, 0.13, midL * 0.92, 0, clearanceY + 0.28, midCenterZ, trimMat);
      }
      if (cfg.hasStripe) {
        addBox(bodyPivot, 0.28, 0.02, hoodL * 0.88, 0, hoodTopY + 0.015, hoodCenterZ, rimMat);
      }
      if (isSport) {
        addBox(bodyPivot, bodyW * 0.92, 0.07, 0.26, 0, hoodTopY + 0.24, -bodyL * 0.44, trimMat, true);
        addBox(bodyPivot, 0.08, 0.22, 0.12, -0.45, hoodTopY + 0.12, -bodyL * 0.44, trimMat);
        addBox(bodyPivot, 0.08, 0.22, 0.12, 0.45, hoodTopY + 0.12, -bodyL * 0.44, trimMat);
      }
      if (isSuv) {
        addBox(bodyPivot, 0.07, 0.07, cabinL * 0.85, cabinW * 0.36, roofY + 0.08, cabinCenterZ, trimMat);
        addBox(bodyPivot, 0.07, 0.07, cabinL * 0.85, -cabinW * 0.36, roofY + 0.08, cabinCenterZ, trimMat);
        addBox(bodyPivot, 0.48, 0.48, 0.16, 0, hoodTopY - 0.04, -bodyL * 0.5 - 0.06, trimMat);
      }
      if (isVan) {
        addBox(bodyPivot, cabinW * 0.78, 0.06, cabinL * 0.72, 0, roofY + 0.08, cabinCenterZ - 0.1, trimMat);
      }

      addBox(bodyPivot, bodyW * 0.48, 0.2, 0.05, 0, clearanceY + 0.26, bodyL * 0.5 + 0.01, trimMat);
      for (const sx of [-1, 1]) {
        addBox(bodyPivot, 0.28, 0.15, 0.06, sx * (bodyW * 0.35), clearanceY + 0.34, bodyL * 0.5 + 0.01, headlightMat);
        addBox(bodyPivot, 0.3, 0.14, 0.06, sx * (bodyW * 0.34), clearanceY + 0.34, -bodyL * 0.5 - 0.01, taillightMat);
        addBox(bodyPivot, 0.16, 0.1, 0.11, sx * (bodyW * 0.5 + 0.07), hoodTopY + 0.08, isVan ? 0.82 : 0.52, trimMat);
      }

      flPivot.position.set(trackX, 0.33, wheelBaseZ);
      frPivot.position.set(-trackX, 0.33, wheelBaseZ);
      root.add(flPivot, frPivot);
      buildWheel(flPivot, 0, 0, 0);
      buildWheel(frPivot, 0, 0, 0);
      buildWheel(root, trackX, 0.33, -wheelBaseZ);
      buildWheel(root, -trackX, 0.33, -wheelBaseZ);
    }

    // Build visible Human NPC Driver inside EVERY moving car (cars never drive without drivers!)
    let driverGroup: THREE.Group | null = null;
    let driverHeadPivot: THREE.Group | null = null;
    if (isMovingTraffic) {
      const driverBuilt = buildDriverVisual(
        cfg.driverOutfitIdx ?? cars.length,
        driverLocalX,
        seatBaseY,
        seatZ,
      );
      driverGroup = driverBuilt.driverGroup;
      driverHeadPivot = driverBuilt.headPivot;
      bodyPivot.add(driverGroup);
    }

    const startY = getSafeGroundSupportY(cfg.x, cfg.z);
    root.position.set(cfg.x, startY, cfg.z);
    root.rotation.y = cfg.yaw;
    if (isMovingTraffic) {
      const beamMesh = new THREE.Mesh(headlightBeamGeo, headlightBeamMat);
      beamMesh.position.set(0, 0.05, bodyL * 0.5 + 3.0);
      beamMesh.rotation.y = Math.PI;
      beamMesh.renderOrder = 2;
      root.add(beamMesh);
    }
    group.add(root);

    cars.push({
      id: cfg.id,
      name: cfg.name,
      style: cfg.style,
      root,
      bodyPivot,
      flPivot,
      frPivot,
      wheelMeshes,
      steeringWheelMesh,
      driverGroup,
      driverHeadPivot,
      driverSeatLocalX: driverLocalX,
      x: cfg.x,
      y: startY,
      z: cfg.z,
      yaw: cfg.yaw,
      speed: 0,
      steerAngle: 0,
      wheelSpin: 0,
      halfW: bodyW * 0.5,
      halfL: bodyL * 0.5,
      maxSpeed: isSport ? 17.5 : isSuv ? 13.8 : isVan ? 12.2 : isRickshaw ? 11.4 : isCompact ? 13.8 : 15.0,
      accel: isSport ? 16.0 : isRickshaw ? 11.5 : isCompact ? 13.5 : 13.0,
      isTraffic: isMovingTraffic,
      playerOwned: false,
      loopWaypoints: cfg.loopWaypoints ?? null,
      waypointIdx: cfg.waypointIdx ?? 0,
      trafficBaseSpeed: cfg.trafficBaseSpeed ?? 6.8,
      laneOffset: cfg.laneOffset ?? -0.58,
      stuckTimer: 0,
      bypassOffset: 0,
      bypassTimer: 0,
      yieldTimer: 0,
      recoveryCooldown: 0,
    });
  };

  // =========================================================================
  // 1. PARKED CITY VEHICLES (Strictly Inside Dedicated Parking Bays + Villa Driveway)
  // =========================================================================
  spawnCar({
    id: 'car_villa',
    name: 'Mint Alto',
    style: 'compact',
    colorHex: '#10b981',
    x: 6.2,
    z: 92.2,
    yaw: -Math.PI / 2, // Dream Villa private concrete driveway
  });

  const lotVehicleTemplates: Array<{
    name: string;
    style: CarBodyStyle;
    colorHex: string;
    hasTaxiSign?: boolean;
    hasStripe?: boolean;
  }> = [
    { name: 'Pearl Corolla', style: 'sedan', colorHex: '#f8fafc' },
    { name: 'Silver Alto', style: 'compact', colorHex: '#cbd5e1' },
    { name: 'Yellow Cab', style: 'sedan', colorHex: '#eab308', hasTaxiSign: true },
    { name: 'Pak Green Rickshaw', style: 'rickshaw', colorHex: '#15803d' },
    { name: 'Hi-Roof Bolan', style: 'van', colorHex: '#e2e8f0' },
    { name: 'Midnight Civic', style: 'sedan', colorHex: '#1e3a8a' },
    { name: 'Revo 4x4', style: 'suv', colorHex: '#334155' },
    { name: 'Cherry Sport GT', style: 'sport', colorHex: '#e11d48', hasStripe: true },
    { name: 'Emerald Cultus', style: 'compact', colorHex: '#059669' },
    { name: 'White City Cab', style: 'sedan', colorHex: '#f1f5f9', hasTaxiSign: true },
    { name: 'Desert SUV', style: 'suv', colorHex: '#ea580c' },
    { name: 'Royal Coupe', style: 'sport', colorHex: '#7c3aed', hasStripe: true },
  ];

  // Fill 4 of the 5 bays in EVERY one of the 7 parking lots (leaving 1 open marked stall per lot!)
  for (let l = 0; l < PARKING_LOTS.length; l++) {
    const lot = PARKING_LOTS[l];
    const skipBay = (l * 2 + 1) % lot.bayStarts.length;
    for (let b = 0; b < lot.bayStarts.length; b++) {
      if (b === skipBay) continue;
      const tpl = lotVehicleTemplates[(l * 4 + b) % lotVehicleTemplates.length];
      const cx = lot.bayAxis === 'x' ? lot.bayStarts[b] : lot.bayRowCoord;
      const cz = lot.bayAxis === 'z' ? lot.bayStarts[b] : lot.bayRowCoord;
      spawnCar({
        id: `park_${lot.id}_${b}`,
        name: tpl.name,
        style: tpl.style,
        colorHex: tpl.colorHex,
        x: cx,
        z: cz,
        yaw: lot.carYaw,
        hasTaxiSign: tpl.hasTaxiSign,
        hasStripe: tpl.hasStripe,
      });
    }
  }

  // =========================================================================
  // 2. MODERATE PAKISTANI CITY TRAFFIC WITH VISIBLE HUMAN DRIVERS & SIGNAL AI
  // =========================================================================
  const addTraffic = (
    id: string,
    name: string,
    style: CarBodyStyle,
    colorHex: string,
    loop: ReadonlyArray<readonly [number, number]>,
    startSeg: number,
    tAlong: number,
    speed: number,
    driverOutfitIdx: number,
    hasTaxiSign = false,
  ) => {
    const a = loop[startSeg % loop.length];
    const b = loop[(startSeg + 1) % loop.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const fwdX = dx / len;
    const fwdZ = dz / len;
    // Pakistani Left-Hand Lane Offset relative to travel direction
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const isMainAve =
      (Math.abs(fwdZ) > 0.7 && Math.abs(a[0]) < 1) ||
      (Math.abs(fwdX) > 0.7 && Math.abs(a[1]) < 1);
    const laneOffset = isMainAve ? -1.15 : -0.45;
    const x = a[0] + dx * tAlong + rightX * laneOffset;
    const z = a[1] + dz * tAlong + rightZ * laneOffset;
    const yaw = Math.atan2(fwdX, fwdZ);
    spawnCar({
      id,
      name,
      style,
      colorHex,
      x,
      z,
      yaw,
      hasTaxiSign,
      hasStripe: style === 'sport',
      driverOutfitIdx,
      loopWaypoints: loop,
      waypointIdx: (startSeg + 1) % loop.length,
      trafficBaseSpeed: speed,
      laneOffset,
    });
  };

  // 14 Active Pakistani City Vehicles distributed smoothly across 8 road loops
  addTraffic('traffic_1', 'City Yellow Cab', 'sedan', '#eab308', LOOP_INNER_RING, 0, 0.25, 6.2, 0, true);
  addTraffic('traffic_2', 'Pearl Corolla', 'sedan', '#f8fafc', LOOP_INNER_RING, 2, 0.35, 6.5, 1);
  addTraffic('traffic_3', 'Pak Auto Rickshaw', 'rickshaw', '#15803d', LOOP_INNER_NE, 0, 0.45, 5.4, 2);
  addTraffic('traffic_4', 'Hi-Roof Bolan Van', 'van', '#e2e8f0', LOOP_INNER_SW, 1, 0.4, 5.8, 3);
  addTraffic('traffic_5', 'Civic Crimson', 'sedan', '#e11d48', LOOP_NORTH_EAST_CIVIC, 1, 0.45, 6.6, 4);
  addTraffic('traffic_6', 'Karachi Cab', 'sedan', '#eab308', LOOP_NORTH_EAST_CIVIC, 3, 0.35, 6.3, 5, true);
  addTraffic('traffic_7', 'Emerald SUV', 'suv', '#10b981', LOOP_WEST_ARCADE, 0, 0.35, 6.4, 0);
  addTraffic('traffic_8', 'Auto Rickshaw', 'rickshaw', '#15803d', LOOP_WEST_ARCADE, 2, 0.55, 5.5, 1);
  addTraffic('traffic_9', 'White Alto', 'compact', '#f1f5f9', LOOP_OUTER_EAST_GRAND, 0, 0.3, 7.2, 2);
  addTraffic('traffic_10', 'Midnight Cruiser', 'suv', '#1e3a8a', LOOP_OUTER_EAST_GRAND, 1, 0.55, 7.0, 3);
  addTraffic('traffic_11', 'Violet Sport', 'sport', '#7c3aed', LOOP_OUTER_EAST_GRAND, 2, 0.5, 7.3, 4);
  addTraffic('traffic_12', 'Silver Hi-Roof', 'van', '#cbd5e1', LOOP_EAST_MID_LOOP, 0, 0.65, 6.4, 5);
  addTraffic('traffic_13', 'Orange SUV', 'suv', '#f97316', LOOP_OUTER_NORTH_WEST, 1, 0.35, 6.8, 0);
  addTraffic('traffic_14', 'Sky Cultus', 'compact', '#0284c7', LOOP_OUTER_NORTH_WEST, 3, 0.45, 6.5, 1);
  addTraffic('traffic_15', 'Northern Woods Sedan', 'sedan', '#38bdf8', LOOP_OUTER_NORTH_LOOP, 0, 0.4, 7.1, 2);
  addTraffic('traffic_16', 'Fashion Blvd Cruiser', 'sport', '#f43f5e', LOOP_OUTER_EAST_PROMENADE, 1, 0.45, 7.4, 3);

  const isCarBlockingVoxel = (wx: number, wy: number, wz: number): boolean => {
    const gx = Math.round(wx);
    const gz = Math.round(wz);
    const by = Math.floor(wy);
    return isSolidAtWorld(gx, by, gz);
  };

  const canPlaceCarFootprint = (
    car: CarRuntime,
    cx: number,
    cy: number,
    cz: number,
    yaw: number,
    requireCityRoad = false,
  ): boolean => {
    // Keep inside expanded island & strictly north of South Beach sand boardwalk (z <= 128.0)
    if (cx < -190 || cx > 190 || cz < -190 || cz > 128.0) return false;
    if (requireCityRoad && !isOnCityRoad(cx, cz)) return false;

    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const hw = car.halfW * 0.9;
    const hl = car.halfL * 0.92;
    const sampleLocal: Array<readonly [number, number]> = [
      [hw, hl],
      [-hw, hl],
      [hw, -hl],
      [-hw, -hl],
      [0, hl],
      [0, -hl],
    ];
    for (let i = 0; i < sampleLocal.length; i++) {
      const [lx, lz] = sampleLocal[i];
      const wx = cx + lx * cosY + lz * sinY;
      const wz = cz - lx * sinY + lz * cosY;
      if (isCarBlockingVoxel(wx, cy + 0.55, wz) || isCarBlockingVoxel(wx, cy + 1.25, wz)) {
        return false;
      }
    }
    return true;
  };

  const resolveCarVsCars = (movingCar: CarRuntime) => {
    for (let i = 0; i < cars.length; i++) {
      const other = cars[i];
      if (other === movingCar) continue;
      const dx = movingCar.x - other.x;
      const dz = movingCar.z - other.z;
      const minSep = movingCar.halfL + other.halfL + 0.35;
      const distSq = dx * dx + dz * dz;
      if (distSq > 0.0001 && distSq < minSep * minSep) {
        // Gentle lateral/longitudinal check before nudging
        const sinY = Math.sin(movingCar.yaw);
        const cosY = Math.cos(movingCar.yaw);
        const localX = dx * cosY - dz * sinY;
        const localZ = dx * sinY + dz * cosY;
        if (Math.abs(localX) < movingCar.halfW + other.halfW + 0.25 && Math.abs(localZ) < minSep) {
          const dist = Math.sqrt(distSq);
          const push = Math.min(0.25, (minSep - dist) * 0.45);
          const nx = dx / dist;
          const nz = dz / dist;
          if (
            canPlaceCarFootprint(
              movingCar,
              movingCar.x + nx * push,
              movingCar.y,
              movingCar.z + nz * push,
              movingCar.yaw,
            )
          ) {
            movingCar.x += nx * push;
            movingCar.z += nz * push;
          }
          movingCar.speed *= 0.55;
        }
      }
    }
  };

  const carsOverlapOBB = (
    ax: number,
    az: number,
    aYaw: number,
    aHalfW: number,
    aHalfL: number,
    bx: number,
    bz: number,
    bYaw: number,
    bHalfW: number,
    bHalfL: number,
    pad = 0.08,
  ): boolean => {
    const dx = bx - ax;
    const dz = bz - az;
    const maxR = aHalfL + bHalfL + pad + 1.0;
    if (dx * dx + dz * dz > maxR * maxR) return false;

    const aSin = Math.sin(aYaw);
    const aCos = Math.cos(aYaw);
    const bSin = Math.sin(bYaw);
    const bCos = Math.cos(bYaw);

    // Local axes of A: uX = (aCos, -aSin), uZ = (aSin, aCos)
    // Local axes of B: vX = (bCos, -bSin), vZ = (bSin, bCos)
    const rAW = aHalfW + pad;
    const rAL = aHalfL + pad;
    const rBW = bHalfW + pad;
    const rBL = bHalfL + pad;

    const dotUU_XX = Math.abs(aCos * bCos + aSin * bSin);
    const dotUU_XZ = Math.abs(aCos * bSin - aSin * bCos);
    const dotUU_ZX = dotUU_XZ;
    const dotUU_ZZ = dotUU_XX;

    // 1. A local X axis
    const dAx = Math.abs(dx * aCos - dz * aSin);
    if (dAx > rAW + rBW * dotUU_XX + rBL * dotUU_XZ) return false;
    // 2. A local Z axis
    const dAz = Math.abs(dx * aSin + dz * aCos);
    if (dAz > rAL + rBW * dotUU_ZX + rBL * dotUU_ZZ) return false;
    // 3. B local X axis
    const dBx = Math.abs(dx * bCos - dz * bSin);
    if (dBx > rBW + rAW * dotUU_XX + rAL * dotUU_ZX) return false;
    // 4. B local Z axis
    const dBz = Math.abs(dx * bSin + dz * bCos);
    if (dBz > rBL + rAW * dotUU_XZ + rAL * dotUU_ZZ) return false;

    return true;
  };

  const wouldOverlapOtherRoadCar = (
    movingCar: CarRuntime,
    cx: number,
    cz: number,
    yaw: number,
  ): boolean => {
    for (let i = 0; i < cars.length; i++) {
      const other = cars[i];
      if (other === movingCar) continue;
      if (!other.isTraffic && !isOnCityRoad(other.x, other.z)) continue;
      if (
        carsOverlapOBB(
          cx,
          cz,
          yaw,
          movingCar.halfW,
          movingCar.halfL,
          other.x,
          other.z,
          other.yaw,
          other.halfW,
          other.halfL,
          0.08,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  let signalClock = 0;

  const updateSignalMaterials = () => {
    const aNs = getSignalAspect(signalClock, 0, 'ns');
    const aEw = getSignalAspect(signalClock, 0, 'ew');
    const bNs = getSignalAspect(signalClock, 9, 'ns');
    const bEw = getSignalAspect(signalClock, 9, 'ew');

    sigLens.aNsRed.emissiveIntensity = aNs === 'red' ? 1.8 : 0.08;
    sigLens.aNsAmber.emissiveIntensity = aNs === 'amber' ? 1.8 : 0.08;
    sigLens.aNsGreen.emissiveIntensity = aNs === 'green' ? 1.8 : 0.08;
    sigLens.aEwRed.emissiveIntensity = aEw === 'red' ? 1.8 : 0.08;
    sigLens.aEwAmber.emissiveIntensity = aEw === 'amber' ? 1.8 : 0.08;
    sigLens.aEwGreen.emissiveIntensity = aEw === 'green' ? 1.8 : 0.08;

    sigLens.bNsRed.emissiveIntensity = bNs === 'red' ? 1.8 : 0.08;
    sigLens.bNsAmber.emissiveIntensity = bNs === 'amber' ? 1.8 : 0.08;
    sigLens.bNsGreen.emissiveIntensity = bNs === 'green' ? 1.8 : 0.08;
    sigLens.bEwRed.emissiveIntensity = bEw === 'red' ? 1.8 : 0.08;
    sigLens.bEwAmber.emissiveIntensity = bEw === 'amber' ? 1.8 : 0.08;
    sigLens.bEwGreen.emissiveIntensity = bEw === 'green' ? 1.8 : 0.08;
  };

  const updateTrafficCar = (car: CarRuntime, dt: number, playerPos: THREE.Vector3) => {
    const waypoints = car.loopWaypoints;
    if (!waypoints || waypoints.length < 2) return;

    car.recoveryCooldown = Math.max(0, car.recoveryCooldown - dt);
    if (car.bypassTimer > 0) {
      car.bypassTimer = Math.max(0, car.bypassTimer - dt);
    } else if (Math.abs(car.bypassOffset) > 0.01) {
      car.bypassOffset = THREE.MathUtils.damp(car.bypassOffset, 0, 5.5, dt);
    } else {
      car.bypassOffset = 0;
    }

    const targetPt = waypoints[car.waypointIdx];
    const prevPt = waypoints[(car.waypointIdx - 1 + waypoints.length) % waypoints.length];
    const segDx = targetPt[0] - prevPt[0];
    const segDz = targetPt[1] - prevPt[1];
    const segLen = Math.hypot(segDx, segDz) || 1;
    const segFwdX = segDx / segLen;
    const segFwdZ = segDz / segLen;
    const rightX = -segFwdZ;
    const rightZ = segFwdX;
    const segYaw = Math.atan2(segFwdX, segFwdZ);

    // Lane width depends on whether we're on a 5m Central Ave or 3m connector road
    const isMainAve =
      (Math.abs(segFwdZ) > 0.7 && Math.abs(prevPt[0]) < 1) ||
      (Math.abs(segFwdX) > 0.7 && Math.abs(prevPt[1]) < 1);
    const activeLaneOffset = isMainAve ? -1.15 : -0.45;
    const effectiveLaneOffset = THREE.MathUtils.clamp(
      activeLaneOffset + car.bypassOffset,
      isMainAve ? -1.55 : -0.78,
      isMainAve ? 1.55 : 0.78,
    );

    // Project car onto current road segment and steer smoothly along its target lane
    const relX = car.x - prevPt[0];
    const relZ = car.z - prevPt[1];
    const projAlong = THREE.MathUtils.clamp(relX * segFwdX + relZ * segFwdZ, 0, segLen);
    const lookAhead = Math.min(segLen, projAlong + 2.8);
    const goalX = prevPt[0] + segFwdX * lookAhead + rightX * effectiveLaneOffset;
    const goalZ = prevPt[1] + segFwdZ * lookAhead + rightZ * effectiveLaneOffset;

    const nextPt = waypoints[(car.waypointIdx + 1) % waypoints.length];
    const nextSegDx = nextPt[0] - targetPt[0];
    const nextSegDz = nextPt[1] - targetPt[1];
    const nextSegLen = Math.hypot(nextSegDx, nextSegDz) || 1;
    const nextFwdX = nextSegDx / nextSegLen;
    const nextFwdZ = nextSegDz / nextSegLen;
    // Clockwise right turn in left-hand traffic crosses the oncoming lane
    const upcomingRightTurn = segFwdX * nextFwdZ - segFwdZ * nextFwdX > 0.5;

    const cornerGoalX = targetPt[0] + rightX * effectiveLaneOffset;
    const cornerGoalZ = targetPt[1] + rightZ * effectiveLaneOffset;
    const distToCorner = Math.hypot(cornerGoalX - car.x, cornerGoalZ - car.z);
    if (distToCorner < 1.45 || projAlong >= segLen - 0.65) {
      car.waypointIdx = (car.waypointIdx + 1) % waypoints.length;
    }

    const toGoalX = goalX - car.x;
    const toGoalZ = goalZ - car.z;
    const desiredYaw = Math.atan2(toGoalX, toGoalZ);
    const yawDiff = normalizeAngle(desiredYaw - car.yaw);
    car.steerAngle = THREE.MathUtils.clamp(yawDiff * 0.9, -0.46, 0.46);

    let targetSpeed = car.trafficBaseSpeed;
    let waitingAtSignal = false;
    let playerBlocking = false;
    let waitingOnRightTurn = false;
    const fwdX = Math.sin(car.yaw);
    const fwdZ = Math.cos(car.yaw);

    // 1. Traffic Light Obedience: Stop cleanly at red/amber before intersection stop lines
    let redLightAheadOnApproach = false;
    const travelAxis: 'ns' | 'ew' = Math.abs(fwdZ) >= Math.abs(fwdX) ? 'ns' : 'ew';
    for (let s = 0; s < TRAFFIC_SIGNALS.length; s++) {
      const sig = TRAFFIC_SIGNALS[s];
      const aspect = getSignalAspect(signalClock, sig.phaseOffset, travelAxis);
      if (aspect === 'green') continue;

      const dxSig = sig.x - car.x;
      const dzSig = sig.z - car.z;
      const alongSig = dxSig * fwdX + dzSig * fwdZ;
      const sideSig = Math.abs(dxSig * fwdZ - dzSig * fwdX);
      if (sideSig < 2.6) {
        // Stop line sits at sig.halfBox + 0.65m upstream of intersection center; bumper sits car.halfL ahead of car.x/z
        const distToStopLine = alongSig - (sig.halfBox + 0.65 + car.halfL);
        if (distToStopLine >= -0.3 && distToStopLine < 21.0) {
          redLightAheadOnApproach = true;
        }
        if (distToStopLine >= -0.3 && distToStopLine < 8.5) {
          if (distToStopLine <= 1.25) {
            targetSpeed = 0;
            waitingAtSignal = true;
            break;
          }
          const approachLimit = ((distToStopLine - 1.25) / 7.25) * car.trafficBaseSpeed;
          if (approachLimit < targetSpeed) targetSpeed = approachLimit;
        }
      }
    }

    // 2. On-Foot Player Courtesy Yielding (never hit player, always easy to enter!)
    const pDx = playerPos.x - car.x;
    const pDz = playerPos.z - car.z;
    if (pDx * pDx + pDz * pDz < 4.2 * 4.2) {
      targetSpeed = 0;
      playerBlocking = true;
    }

    // 3. Forward Multi-Car Queue, Safe Distance & Deadlock-Safe Right-Turn Yield AI
    const checkingRightTurnYield =
      (upcomingRightTurn && distToCorner < 5.2 && distToCorner > 1.45) || yawDiff < -0.28;
    let blockedByLeadVehicle = false;
    let oncomingNearInBypassStrip = false;
    if (targetSpeed > 0.01) {
      for (let i = 0; i < cars.length; i++) {
        const other = cars[i];
        if (other === car) continue;
        // Skip vehicles neatly parked inside off-road parking lots
        if (!other.isTraffic && !isOnCityRoad(other.x, other.z)) continue;
        const odx = other.x - car.x;
        const odz = other.z - car.z;
        const dSq = odx * odx + odz * odz;
        if (dSq > 18.0 * 18.0) continue;

        const along = odx * fwdX + odz * fwdZ;
        const side = Math.abs(odx * fwdZ - odz * fwdX);
        const dotFwd = fwdX * Math.sin(other.yaw) + fwdZ * Math.cos(other.yaw);

        if (dotFwd < -0.35 && along > 0 && along < 18.0 && side < 2.2) {
          oncomingNearInBypassStrip = true;
        }

        // If turning right across oncoming lane, yield to approaching moving oncoming traffic (with anti-deadlock timeout)
        if (
          checkingRightTurnYield &&
          dotFwd < -0.35 &&
          along > -0.5 &&
          along < 11.0 &&
          side < 3.1
        ) {
          const otherApproaching = other.speed > 0.55 && Math.abs(other.steerAngle) < 0.22;
          if ((otherApproaching || other.id < car.id) && car.yieldTimer < 1.85) {
            targetSpeed = 0;
            waitingOnRightTurn = true;
            break;
          }
        }

        if (dSq > 13.5 * 13.5) continue;

        const sideLimit = dotFwd > 0.35 ? 1.38 : dotFwd < -0.35 ? 0.92 : 1.9;
        const maxCrossAlong = Math.abs(dotFwd) <= 0.35 ? car.halfL + other.halfW + 3.4 : 13.5;
        if (along > 0.2 && along < maxCrossAlong && side < sideLimit) {
          const otherExtent = Math.abs(dotFwd) <= 0.35 ? other.halfW : other.halfL;
          const bumperGap = along - (car.halfL + otherExtent);
          // Hold behind moving traffic normally, or stop closer if bypassing a stopped obstacle
          const minStopGap = car.bypassTimer > 0.1 ? 1.35 : 2.05;
          if (bumperGap < minStopGap) {
            targetSpeed = 0;
            blockedByLeadVehicle = true;
            break;
          }
          if (bumperGap < 7.6) {
            const safeQueueSpeed = ((bumperGap - minStopGap) / (7.6 - minStopGap)) * car.trafficBaseSpeed;
            if (safeQueueSpeed < targetSpeed) targetSpeed = safeQueueSpeed;
          }
        }
      }
    }

    // Tuck promptly back into own left lane if shifted right and oncoming traffic approaches
    if (oncomingNearInBypassStrip && car.bypassOffset > 0.2) {
      car.bypassOffset = 0;
      car.bypassTimer = 0;
    }

    // Treat queuing behind a stopped car at a red/amber light as legitimate signal wait
    if (blockedByLeadVehicle && redLightAheadOnApproach) {
      waitingAtSignal = true;
    }

    if (waitingOnRightTurn) {
      car.yieldTimer += dt;
    } else {
      car.yieldTimer = 0;
    }

    // 4. Slow calmly for tight 90-degree turns
    if (Math.abs(yawDiff) > 0.35 && targetSpeed > 4.0) {
      targetSpeed = 4.0;
    }

    // Track obstacle stalls separately from legitimate signal/player stops so cars NEVER freeze forever
    if (waitingAtSignal || playerBlocking) {
      car.stuckTimer = 0;
    } else if (car.speed < 0.85) {
      car.stuckTimer += dt;
    } else {
      car.stuckTimer = Math.max(0, car.stuckTimer - dt * 2.5);
    }

    // Staggered tie-breaker offset per car so nose-to-nose/intersection jams never mirror forever
    const idTail = Number(car.id.replace(/\D/g, '')) || 0;
    const deadlockThreshold = 1.65 + (idTail % 5) * 0.35;

    // Dynamic alternate-lane bypass probe ONLY when genuinely blocked outside red-light queues
    if (!waitingAtSignal && !playerBlocking && car.stuckTimer > 1.15 && car.recoveryCooldown <= 0) {
      const candidateOffsets = isMainAve
        ? oncomingNearInBypassStrip
          ? [-1.45, -1.2, -0.55]
          : [-1.45, -0.45, 0.85, 1.35]
        : oncomingNearInBypassStrip
          ? [-0.72, -0.58]
          : [-0.72, 0.52];
      for (let c = 0; c < candidateOffsets.length; c++) {
        const candOffset = candidateOffsets[c];
        const probeAlong = THREE.MathUtils.clamp(projAlong + 2.4, 0, segLen);
        const probeX = prevPt[0] + segFwdX * probeAlong + rightX * candOffset;
        const probeZ = prevPt[1] + segFwdZ * probeAlong + rightZ * candOffset;
        if (
          isOnCityRoad(probeX, probeZ) &&
          canPlaceCarFootprint(car, probeX, car.y, probeZ, segYaw, true) &&
          !wouldOverlapOtherRoadCar(car, probeX, probeZ, segYaw)
        ) {
          car.bypassOffset = candOffset - activeLaneOffset;
          car.bypassTimer = 2.6;
          car.recoveryCooldown = 0.65;
          targetSpeed = Math.max(targetSpeed, 2.8);
          break;
        }
      }
    }

    // Staggered deadlock breaker: if two cars stay mutually pinned after timeout, priority car clears cleanly
    const priorityClearance =
      !waitingAtSignal && !playerBlocking && car.stuckTimer > deadlockThreshold;
    if (priorityClearance) {
      targetSpeed = Math.max(targetSpeed, 3.0);
    }

    const rate = targetSpeed < car.speed ? 13.5 : 4.8;
    car.speed = THREE.MathUtils.damp(car.speed, targetSpeed, rate, dt);
    if (car.speed < 0.05 && targetSpeed <= 0.05) car.speed = 0;

    // Ackermann steering normally locks at 0 speed, but unlocks slightly when recovering from a jam/block
    const baseSteerScale = THREE.MathUtils.clamp(car.speed / 1.2, 0, 1);
    const steerMoveScale =
      car.stuckTimer > 0.55 ? Math.max(0.65, baseSteerScale) : baseSteerScale;
    const nextYaw = normalizeAngle(
      car.yaw + THREE.MathUtils.clamp(yawDiff, -3.8 * dt * steerMoveScale, 3.8 * dt * steerMoveScale),
    );
    const stepX = Math.sin(nextYaw) * car.speed * dt;
    const stepZ = Math.cos(nextYaw) * car.speed * dt;
    const candX = car.x + stepX;
    const candZ = car.z + stepZ;

    // 5. Strict City Road Boundary & Non-Overlapping Collision Recovery
    let needsRecovery = false;
    if (!isOnCityRoad(candX, candZ)) {
      const rec = clampToNearestRoad(car.x, car.z);
      car.x = THREE.MathUtils.damp(car.x, rec.x, 8, dt);
      car.z = THREE.MathUtils.damp(car.z, rec.z, 8, dt);
      car.yaw = nextYaw;
      car.speed = Math.min(car.speed, 2.4);
    } else if (
      canPlaceCarFootprint(car, candX, car.y, candZ, nextYaw, true) &&
      !wouldOverlapOtherRoadCar(car, candX, candZ, nextYaw)
    ) {
      car.x = candX;
      car.z = candZ;
      car.yaw = nextYaw;
    } else {
      car.yaw = nextYaw;
      car.speed = 0;
      needsRecovery = true;
    }

    // Smooth recovery when blocked by an obstacle or mutual intersection standoff (never on signal/player)
    if (
      !waitingAtSignal &&
      !playerBlocking &&
      ((needsRecovery && car.stuckTimer > 0.85) || car.stuckTimer > deadlockThreshold + 0.6) &&
      car.recoveryCooldown <= 0
    ) {
      let recovered = false;
      const offsetsToTry = isMainAve
        ? [-1.35, -0.75, 0.9, -1.5, 1.35]
        : [-0.68, -0.45, 0.52, 0];
      for (let k = 0; k < offsetsToTry.length; k++) {
        const lat = offsetsToTry[k];
        for (const fwdDist of [2.2, 3.2, -1.6]) {
          const altAlong = THREE.MathUtils.clamp(projAlong + fwdDist, 0, segLen);
          const altX = prevPt[0] + segFwdX * altAlong + rightX * lat;
          const altZ = prevPt[1] + segFwdZ * altAlong + rightZ * lat;
          if (
            isOnCityRoad(altX, altZ) &&
            canPlaceCarFootprint(car, altX, car.y, altZ, segYaw, true) &&
            !wouldOverlapOtherRoadCar(car, altX, altZ, segYaw)
          ) {
            car.x = THREE.MathUtils.damp(car.x, altX, 11, dt);
            car.z = THREE.MathUtils.damp(car.z, altZ, 11, dt);
            car.yaw = normalizeAngle(
              car.yaw + THREE.MathUtils.clamp(normalizeAngle(segYaw - car.yaw), -3.8 * dt, 3.8 * dt),
            );
            car.bypassOffset = lat - activeLaneOffset;
            car.bypassTimer = 2.4;
            car.speed = 2.6;
            recovered = true;
            break;
          }
        }
        if (recovered) break;
      }
      if (recovered) {
        car.stuckTimer = 0.25;
        car.recoveryCooldown = 0.55;
      } else if (distToCorner < 5.5) {
        car.waypointIdx = (car.waypointIdx + 1) % waypoints.length;
        car.stuckTimer = 0.5;
        car.recoveryCooldown = 0.75;
      }
    }

    const groundY = getSafeGroundSupportY(car.x, car.z);
    car.y = THREE.MathUtils.damp(car.y, groundY, 14, dt);
  };

  const updateActiveCar = (car: CarRuntime, dt: number, controls: CarInputState) => {
    const targetSteer = THREE.MathUtils.clamp(controls.steer, -1, 1) * 0.54;
    car.steerAngle = THREE.MathUtils.damp(car.steerAngle, targetSteer, 12, dt);

    const throttle = THREE.MathUtils.clamp(controls.throttle, 0, 1);
    const brake = THREE.MathUtils.clamp(controls.brake, 0, 1);

    if (throttle > 0.05) {
      if (car.speed < -0.4) {
        car.speed = Math.min(0, car.speed + 26 * dt * throttle);
      } else {
        car.speed = Math.min(car.maxSpeed, car.speed + car.accel * throttle * dt);
      }
    } else if (brake > 0.05) {
      if (car.speed > 0.5) {
        car.speed = Math.max(0, car.speed - 28 * brake * dt);
      } else {
        car.speed = Math.max(-7.5, car.speed - 11.5 * brake * dt);
      }
    } else {
      const drag = Math.abs(car.speed) < 0.15 ? 18 : 4.2;
      car.speed = THREE.MathUtils.damp(car.speed, 0, drag, dt);
      if (Math.abs(car.speed) < 0.04) car.speed = 0;
    }

    if (Math.abs(car.speed) > 0.08 && Math.abs(car.steerAngle) > 0.005) {
      const turnRate = (car.speed / 2.25) * Math.sin(car.steerAngle);
      const nextYaw = normalizeAngle(car.yaw + turnRate * dt);
      if (canPlaceCarFootprint(car, car.x, car.y, car.z, nextYaw, false)) {
        car.yaw = nextYaw;
      }
    }

    const vx = Math.sin(car.yaw) * car.speed;
    const vz = Math.cos(car.yaw) * car.speed;

    const nextX = car.x + vx * dt;
    if (canPlaceCarFootprint(car, nextX, car.y, car.z, car.yaw, false)) {
      car.x = nextX;
    } else {
      car.speed *= 0.35;
    }

    const nextZ = car.z + vz * dt;
    if (canPlaceCarFootprint(car, car.x, car.y, nextZ, car.yaw, false)) {
      car.z = nextZ;
    } else {
      car.speed *= 0.35;
    }

    resolveCarVsCars(car);

    const groundY = getSafeGroundSupportY(car.x, car.z);
    car.y = THREE.MathUtils.damp(car.y, groundY, 16, dt);
  };

  const syncCarTransform = (car: CarRuntime, dt: number, active: boolean, playerPos: THREE.Vector3) => {
    // 4GB RAM optimization: cull distant vehicles from GPU draw calls while AI math stays live
    if (!active) {
      const dx = car.x - playerPos.x;
      const dz = car.z - playerPos.z;
      const nearEnough = dx * dx + dz * dz < 96 * 96;
      car.root.visible = nearEnough;
      if (!nearEnough) return;
    } else {
      car.root.visible = true;
    }

    car.root.position.set(car.x, car.y, car.z);
    car.root.rotation.y = car.yaw;

    car.flPivot.rotation.y = car.steerAngle;
    car.frPivot.rotation.y = car.steerAngle;
    car.wheelSpin += (car.speed * dt) / 0.33;
    for (let i = 0; i < car.wheelMeshes.length; i++) {
      car.wheelMeshes[i].rotation.x = car.wheelSpin;
    }

    car.steeringWheelMesh.rotation.z = car.style === 'rickshaw' ? 0 : -car.steerAngle * 2.1;
    if (car.driverGroup) {
      const hasDriver = car.isTraffic && !car.playerOwned;
      car.driverGroup.visible = hasDriver;
      if (hasDriver && car.driverHeadPivot) {
        car.driverHeadPivot.rotation.y = car.steerAngle * 0.45;
      }
    }

    const targetRoll = THREE.MathUtils.clamp((car.speed / 12) * car.steerAngle * 0.11, -0.055, 0.055);
    const targetPitch = active ? THREE.MathUtils.clamp(-car.speed * 0.0022, -0.03, 0.03) : 0;
    car.bodyPivot.rotation.z = THREE.MathUtils.damp(car.bodyPivot.rotation.z, targetRoll, 10, dt);
    car.bodyPivot.rotation.x = THREE.MathUtils.damp(car.bodyPivot.rotation.x, targetPitch, 10, dt);
  };

  const update = (
    dt: number,
    playerPos: THREE.Vector3,
    playerInVehicle: boolean,
    activeCarId: string | null,
    controls: CarInputState,
  ) => {
    const safeDt = Math.min(dt, 0.05);
    signalClock = (signalClock + safeDt) % SIGNAL_CYCLE_SEC;
    updateSignalMaterials();

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (playerInVehicle && car.id === activeCarId) {
        updateActiveCar(car, safeDt, controls);
        syncCarTransform(car, safeDt, true, playerPos);
      } else if (car.isTraffic && !car.playerOwned) {
        updateTrafficCar(car, safeDt, playerPos);
        syncCarTransform(car, safeDt, false, playerPos);
      } else {
        // Parked / player-parked vehicle settles cleanly
        if (Math.abs(car.speed) > 0.04) {
          car.speed = THREE.MathUtils.damp(car.speed, 0, 8, safeDt);
          const stepX = Math.sin(car.yaw) * car.speed * safeDt;
          const stepZ = Math.cos(car.yaw) * car.speed * safeDt;
          if (canPlaceCarFootprint(car, car.x + stepX, car.y, car.z + stepZ, car.yaw, false)) {
            car.x += stepX;
            car.z += stepZ;
          } else {
            car.speed = 0;
          }
        } else {
          car.speed = 0;
        }
        car.steerAngle = THREE.MathUtils.damp(car.steerAngle, 0, 8, safeDt);
        const groundY = getSafeGroundSupportY(car.x, car.z);
        car.y = THREE.MathUtils.damp(car.y, groundY, 14, safeDt);
        syncCarTransform(car, safeDt, false, playerPos);
      }
    }
  };

  const findNearestEnterableCar = (
    px: number,
    py: number,
    pz: number,
    maxDist = 3.8,
  ): CarWorldPose | null => {
    let best: CarRuntime | null = null;
    let bestScore = maxDist * maxDist;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (Math.abs(py - car.y) > 2.2) continue;
      const dx = car.x - px;
      const dz = car.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq <= bestScore) {
        bestScore = dSq;
        best = car;
      }
    }
    if (!best) return null;
    return {
      id: best.id,
      name: best.name,
      x: best.x,
      y: best.y,
      z: best.z,
      yaw: best.yaw,
      speed: best.speed,
    };
  };

  const getCarPose = (carId: string): CarWorldPose | null => {
    const car = cars.find((c) => c.id === carId);
    if (!car) return null;
    return {
      id: car.id,
      name: car.name,
      x: car.x,
      y: car.y,
      z: car.z,
      yaw: car.yaw,
      speed: car.speed,
    };
  };

  const getDriverSeatPose = (carId: string) => {
    const car = cars.find((c) => c.id === carId);
    if (!car) return null;
    const sinY = Math.sin(car.yaw);
    const cosY = Math.cos(car.yaw);
    const lx = car.driverSeatLocalX;
    const lz = car.style === 'rickshaw' ? 0.14 : car.style === 'van' ? 0.24 : -0.06;
    const wx = car.x + lx * cosY + lz * sinY;
    const wz = car.z - lx * sinY + lz * cosY;
    return {
      x: wx,
      y: car.y + 0.16,
      z: wz,
      yaw: car.yaw,
    };
  };

  const getSafeExitPosition = (carId: string) => {
    const car = cars.find((c) => c.id === carId);
    if (!car) return null;
    const sinY = Math.sin(car.yaw);
    const cosY = Math.cos(car.yaw);
    const localOffsets: Array<readonly [number, number]> = [
      [1.55, 0.0],
      [-1.55, 0.0],
      [1.55, -1.1],
      [1.55, 1.1],
      [-1.55, -1.1],
      [-1.55, 1.1],
      [0, -2.55],
      [0, 2.55],
    ];
    for (let i = 0; i < localOffsets.length; i++) {
      const [lx, lz] = localOffsets[i];
      const wx = THREE.MathUtils.clamp(car.x + lx * cosY + lz * sinY, -163, 163);
      const wz = THREE.MathUtils.clamp(car.z - lx * sinY + lz * cosY, -163, 163);
      const groundY = getSafeGroundSupportY(wx, wz);
      if (Math.abs(groundY - car.y) > 1.3) continue;
      const gx = Math.round(wx);
      const gz = Math.round(wz);
      const footBy = Math.floor(groundY + 0.25);
      const headBy = Math.floor(groundY + 1.35);
      if (!isSolidAtWorld(gx, footBy, gz) && !isSolidAtWorld(gx, headBy, gz)) {
        return { x: wx, y: groundY, z: wz };
      }
    }
    return { x: car.x, y: car.y + 1.8, z: car.z };
  };

  const claimCar = (carId: string): boolean => {
    const car = cars.find((c) => c.id === carId);
    if (!car) return false;
    car.playerOwned = true;
    car.isTraffic = false;
    car.speed = 0;
    if (car.driverGroup) {
      car.driverGroup.visible = false;
    }
    return true;
  };

  const releaseCar = (carId: string): void => {
    const car = cars.find((c) => c.id === carId);
    if (!car) return;
    car.speed = 0;
    car.steerAngle = 0;
    if (car.driverGroup) {
      car.driverGroup.visible = false;
    }
  };

  const resolvePlayerCollision = (playerPos: THREE.Vector3, playerRadius: number) => {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (playerPos.y > car.y + 1.7 || playerPos.y + 1.75 < car.y) continue;
      const dx = playerPos.x - car.x;
      const dz = playerPos.z - car.z;
      if (dx * dx + dz * dz > 9) continue;

      const sinY = Math.sin(car.yaw);
      const cosY = Math.cos(car.yaw);
      const localX = dx * cosY - dz * sinY;
      const localZ = dx * sinY + dz * cosY;

      const limX = car.halfW + playerRadius;
      const limZ = car.halfL + playerRadius;
      if (Math.abs(localX) < limX && Math.abs(localZ) < limZ) {
        const penX = limX - Math.abs(localX);
        const penZ = limZ - Math.abs(localZ);
        let pushLX = 0;
        let pushLZ = 0;
        if (penX < penZ) {
          pushLX = (localX >= 0 ? 1 : -1) * penX;
        } else {
          pushLZ = (localZ >= 0 ? 1 : -1) * penZ;
        }
        playerPos.x += pushLX * cosY + pushLZ * sinY;
        playerPos.z += -pushLX * sinY + pushLZ * cosY;
      }
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
    flatMatCache.clear();
  };

  const setNightLightLevel = (level: number) => {
    const clamped = THREE.MathUtils.clamp(level, 0, 1);
    headlightMat.emissiveIntensity = 0.2 + clamped * 2.3;
    taillightMat.emissiveIntensity = 0.25 + clamped * 1.45;
    taxiCapMat.emissiveIntensity = 0.22 + clamped * 1.1;
    headlightBeamMat.opacity = clamped * 0.34;
    headlightBeamMat.visible = clamped > 0.04;
  };

  updateSignalMaterials();

  return {
    group,
    update,
    findNearestEnterableCar,
    getCarPose,
    getDriverSeatPose,
    getSafeExitPosition,
    claimCar,
    releaseCar,
    setNightLightLevel,
    resolvePlayerCollision,
    dispose,
  };
}
