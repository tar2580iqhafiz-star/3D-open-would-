import * as THREE from 'three';
import type { ProceduralAudio } from './audio';
import { getSafeGroundSupportY, getVoxel, isSolidAtWorld } from './terrain';
import { VOXEL_ID } from './types';

export type GroundAnimalSpecies =
  | 'goat'
  | 'cow'
  | 'deer'
  | 'horse'
  | 'rabbit'
  | 'sheep'
  | 'dinosaur';

export type BirdSpecies = 'parrot' | 'eagle' | 'songbird';
export type WildlifeSpecies = GroundAnimalSpecies | BirdSpecies;

export interface ForestWildlifeSystem {
  group: THREE.Group;
  update: (
    elapsed: number,
    dt: number,
    playerX: number,
    playerZ: number,
    soundEnabled: boolean,
  ) => void;
  dispose: () => void;
}

interface ForestZoneSpec {
  id: string;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  pondX: number;
  pondZ: number;
  pondClearRadius: number;
}

const FOREST_ZONES: ReadonlyArray<ForestZoneSpec> = [
  {
    id: 'nw_woods',
    xMin: -182,
    xMax: -44,
    zMin: -182,
    zMax: -110,
    pondX: -72,
    pondZ: -122,
    pondClearRadius: 4.1,
  },
  {
    id: 'ne_woods',
    xMin: 63,
    xMax: 182,
    zMin: -182,
    zMax: -110,
    pondX: 82,
    pondZ: -120,
    pondClearRadius: 4.1,
  },
  {
    id: 'west_emerald',
    xMin: -182,
    xMax: -114,
    zMin: -88,
    zMax: 102,
    pondX: -122,
    pondZ: 32,
    pondClearRadius: 4.1,
  },
  {
    id: 'east_sunlit',
    xMin: 152,
    xMax: 182,
    zMin: -88,
    zMax: 102,
    pondX: 136,
    pondZ: -22,
    pondClearRadius: 4.1,
  },
  {
    id: 'sw_grove',
    xMin: -102,
    xMax: -30,
    zMin: 56,
    zMax: 99,
    pondX: -62,
    pondZ: 76,
    pondClearRadius: 3.9,
  },
  {
    id: 'outer_west_horizon',
    xMin: -184,
    xMax: -148,
    zMin: -130,
    zMax: -30,
    pondX: -168,
    pondZ: -56,
    pondClearRadius: 4.0,
  },
  {
    id: 'north_lodge_woods',
    xMin: 52,
    xMax: 142,
    zMin: -184,
    zMax: -146,
    pondX: 84,
    pondZ: -166,
    pondClearRadius: 4.0,
  },
];

type AnimalBehaviorState = 'walk' | 'eat' | 'drink' | 'idle';

interface GroundAnimalActor {
  species: GroundAnimalSpecies;
  zone: ForestZoneSpec;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  neckPivot: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group | null;
  legPivots: THREE.Group[]; // [fl, fr, bl, br]
  x: number;
  y: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  state: AnimalBehaviorState;
  stateTimer: number;
  gaitPhase: number;
  walkSpeed: number;
  scale: number;
  baseNeckPitch: number;
  eatNeckPitch: number;
  drinkNeckPitch: number;
  bodyBaseY: number;
  isHopper: boolean;
  seed: number;
}

interface BirdActor {
  species: BirdSpecies;
  zone: ForestZoneSpec;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  tailPivot: THREE.Group;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  baseY: number;
  bobAmp: number;
  angularSpeed: number;
  angle: number;
  wingPhase: number;
  flapRate: number;
  x: number;
  y: number;
  z: number;
}

function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = normalizeAngle(target - current);
  return normalizeAngle(current + diff * (1 - Math.exp(-lambda * dt)));
}

/**
 * Lightweight Minecraft-inspired Forest Wildlife & Flying Bird System:
 * - 35 Ground Animals across Goats, Cows, Deer, Horses, Rabbits, Sheep & Dinosaurs
 * - 18 Flying Birds across Parrots, Eagles & Forest Songbirds
 * - Natural walking/hopping, grass-eating, forest pond-drinking & thermal soaring behaviors
 * - Shared pooled unit geometries & cached materials for Android 4GB RAM efficiency
 */
export function createForestWildlifeSystem(audio?: ProceduralAudio): ForestWildlifeSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // Shared unit geometry + reusable flat materials
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(unitBox);

  const shadowTex = (() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(10, 20, 12, 0.45)');
    grad.addColorStop(0.65, 'rgba(10, 20, 12, 0.18)');
    grad.addColorStop(1, 'rgba(10, 20, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  disposables.push(shadowTex, shadowGeo, shadowMat);

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getMat = (color: string, roughness = 0.82, metalness = 0.02): THREE.MeshStandardMaterial => {
    const key = `${color}|${roughness}|${metalness}`;
    let mat = matCache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      matCache.set(key, mat);
      disposables.push(mat);
    }
    return mat;
  };

  const addPart = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.MeshStandardMaterial,
    rotX = 0,
    rotY = 0,
    rotZ = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    if (rotX || rotY || rotZ) m.rotation.set(rotX, rotY, rotZ);
    parent.add(m);
    return m;
  };

  const darkEyeMat = getMat('#0f172a', 0.35, 0.08);
  const hoofMat = getMat('#292524', 0.68, 0.04);
  const hornMat = getMat('#fde68a', 0.52, 0.08);
  const beakMat = getMat('#facc15', 0.45, 0.08);

  const groundAnimals: GroundAnimalActor[] = [];
  const birds: BirdActor[] = [];

  const canAnimalStandAt = (wx: number, wz: number, zone: ForestZoneSpec): boolean => {
    if (wx < zone.xMin || wx > zone.xMax || wz < zone.zMin || wz > zone.zMax) return false;
    const dPond = Math.hypot(wx - zone.pondX, wz - zone.pondZ);
    if (dPond < zone.pondClearRadius) return false;

    const gx = Math.round(wx);
    const gz = Math.round(wz);
    const floorId = getVoxel(gx, 1, gz);
    if (
      floorId !== VOXEL_ID.GRASS &&
      floorId !== VOXEL_ID.MOSS_STONE &&
      floorId !== VOXEL_ID.DIRT
    ) {
      return false;
    }
    // Avoid tree trunks & low leaves blocking torso height (y = 2..3)
    if (isSolidAtWorld(gx, 2, gz) || isSolidAtWorld(gx, 3, gz)) return false;
    if (isSolidAtWorld(gx + 0.4, 2, gz) || isSolidAtWorld(gx - 0.4, 2, gz)) return false;
    if (isSolidAtWorld(gx, 2, gz + 0.4) || isSolidAtWorld(gx, 2, gz - 0.4)) return false;
    return true;
  };

  const findOpenSpotInZone = (zone: ForestZoneSpec, seedInit: number): [number, number] => {
    let s = seedInit >>> 0;
    for (let attempt = 0; attempt < 48; attempt++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const rx = (s & 0xffff) / 0xffff;
      s = (s * 1664525 + 1013904223) >>> 0;
      const rz = (s & 0xffff) / 0xffff;
      const cx = zone.xMin + 2 + rx * Math.max(4, zone.xMax - zone.xMin - 4);
      const cz = zone.zMin + 2 + rz * Math.max(4, zone.zMax - zone.zMin - 4);
      if (canAnimalStandAt(cx, cz, zone)) return [cx, cz];
    }
    // Fallback beside the open pond bank
    return [zone.pondX + zone.pondClearRadius + 0.8, zone.pondZ];
  };

  // =========================================================================
  // COMPOSITE MINECRAFT-INSPIRED GROUND ANIMAL BUILDERS (3-12 parts each)
  // =========================================================================
  const spawnGroundAnimal = (
    species: GroundAnimalSpecies,
    zone: ForestZoneSpec,
    variant: number,
    seed: number,
  ) => {
    const [sx, sz] = findOpenSpotInZone(zone, seed);
    const sy = getSafeGroundSupportY(sx, sz);

    const root = new THREE.Group();
    root.position.set(sx, sy, sz);

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);
    const neckPivot = new THREE.Group();
    const headPivot = new THREE.Group();
    let tailPivot: THREE.Group | null = null;
    const legPivots: THREE.Group[] = [];

    let bodyBaseY = 0.52;
    let baseNeckPitch = 0;
    let eatNeckPitch = 0.65;
    let drinkNeckPitch = 0.82;
    let walkSpeed = 1.6;
    let scale = 1.0;
    let isHopper = false;
    let shadowRadius = 0.9;

    const addFourLegs = (
      legW: number,
      legH: number,
      xOff: number,
      zFront: number,
      zBack: number,
      legMat: THREE.MeshStandardMaterial,
      withHoof = true,
    ) => {
      const coords: Array<[number, number]> = [
        [-xOff, zFront],
        [xOff, zFront],
        [-xOff, zBack],
        [xOff, zBack],
      ];
      for (let i = 0; i < coords.length; i++) {
        const lp = new THREE.Group();
        lp.position.set(coords[i][0], legH, coords[i][1]);
        addPart(lp, legW, legH * 0.82, legW, 0, -legH * 0.41, 0, legMat);
        addPart(
          lp,
          legW * 1.04,
          legH * 0.2,
          legW * 1.04,
          0,
          -legH * 0.9,
          0,
          withHoof ? hoofMat : legMat,
        );
        bodyPivot.add(lp);
        legPivots.push(lp);
      }
    };

    if (species === 'cow') {
      const coats = [
        { base: '#f8fafc', spot: '#1e293b' },
        { base: '#78350f', spot: '#fef3c7' },
        { base: '#f1f5f9', spot: '#92400e' },
      ];
      const pal = coats[variant % coats.length];
      const coatMat = getMat(pal.base, 0.86);
      const spotMat = getMat(pal.spot, 0.84);
      const snoutMat = getMat('#f9a8d4', 0.68);
      const legH = 0.52;
      bodyBaseY = legH;
      walkSpeed = 1.25;
      shadowRadius = 1.25;
      eatNeckPitch = 0.72;
      drinkNeckPitch = 0.88;

      addFourLegs(0.2, legH, 0.24, 0.42, -0.44, coatMat);
      addPart(bodyPivot, 0.72, 0.58, 1.18, 0, legH + 0.29, 0, coatMat);
      // Cow patches + udder
      addPart(bodyPivot, 0.74, 0.28, 0.42, 0, legH + 0.36, -0.1, spotMat);
      addPart(bodyPivot, 0.42, 0.22, 0.46, 0.16, legH + 0.48, 0.24, spotMat);
      addPart(bodyPivot, 0.32, 0.12, 0.3, 0, legH - 0.04, -0.26, snoutMat);

      neckPivot.position.set(0, legH + 0.42, 0.56);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.46, 0.42, 0.44, 0, 0.06, 0.22, coatMat);
      addPart(headPivot, 0.38, 0.18, 0.14, 0, -0.05, 0.46, snoutMat);
      addPart(headPivot, 0.06, 0.06, 0.04, -0.16, 0.12, 0.44, darkEyeMat);
      addPart(headPivot, 0.06, 0.06, 0.04, 0.16, 0.12, 0.44, darkEyeMat);
      addPart(headPivot, 0.08, 0.16, 0.08, -0.22, 0.31, 0.18, hornMat);
      addPart(headPivot, 0.08, 0.16, 0.08, 0.22, 0.31, 0.18, hornMat);
      addPart(headPivot, 0.16, 0.09, 0.09, -0.28, 0.16, 0.16, spotMat);
      addPart(headPivot, 0.16, 0.09, 0.09, 0.28, 0.16, 0.16, spotMat);

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.48, -0.59);
      addPart(tailPivot, 0.07, 0.42, 0.07, 0, -0.2, -0.02, spotMat);
      bodyPivot.add(tailPivot);
    } else if (species === 'sheep') {
      const wools = ['#fef9c3', '#f8fafc', '#e2e8f0'];
      const woolMat = getMat(wools[variant % wools.length], 0.94);
      const faceMat = getMat(variant % 2 === 0 ? '#d6b48c' : '#334155', 0.8);
      const legH = 0.42;
      bodyBaseY = legH;
      walkSpeed = 1.35;
      shadowRadius = 0.95;
      eatNeckPitch = 0.68;
      drinkNeckPitch = 0.85;

      addFourLegs(0.16, legH, 0.19, 0.32, -0.32, faceMat);
      addPart(bodyPivot, 0.66, 0.56, 0.92, 0, legH + 0.28, 0, woolMat);
      addPart(bodyPivot, 0.54, 0.44, 0.78, 0, legH + 0.32, 0, woolMat);

      neckPivot.position.set(0, legH + 0.4, 0.42);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.36, 0.34, 0.38, 0, 0.05, 0.2, faceMat);
      addPart(headPivot, 0.38, 0.14, 0.32, 0, 0.22, 0.14, woolMat);
      addPart(headPivot, 0.14, 0.08, 0.09, -0.22, 0.1, 0.14, faceMat);
      addPart(headPivot, 0.14, 0.08, 0.09, 0.22, 0.1, 0.14, faceMat);
      addPart(headPivot, 0.05, 0.05, 0.04, -0.12, 0.1, 0.39, darkEyeMat);
      addPart(headPivot, 0.05, 0.05, 0.04, 0.12, 0.1, 0.39, darkEyeMat);

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.38, -0.46);
      addPart(tailPivot, 0.16, 0.16, 0.16, 0, -0.05, -0.05, woolMat);
      bodyPivot.add(tailPivot);
    } else if (species === 'goat') {
      const coats = ['#f1f5f9', '#d6d3d1', '#cbd5e1'];
      const coatMat = getMat(coats[variant % coats.length], 0.86);
      const beardMat = getMat('#57534e', 0.82);
      const legH = 0.45;
      bodyBaseY = legH;
      walkSpeed = 1.65;
      shadowRadius = 0.85;
      eatNeckPitch = 0.65;
      drinkNeckPitch = 0.82;

      addFourLegs(0.13, legH, 0.16, 0.34, -0.34, coatMat);
      addPart(bodyPivot, 0.48, 0.46, 0.86, 0, legH + 0.23, 0, coatMat);

      neckPivot.position.set(0, legH + 0.4, 0.38);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.18, 0.26, 0.2, 0, 0.12, 0.08, coatMat, 0.25, 0, 0);
      addPart(headPivot, 0.3, 0.28, 0.38, 0, 0.25, 0.24, coatMat);
      // Goatee beard + curved horns + floppy ears
      addPart(headPivot, 0.1, 0.14, 0.08, 0, 0.06, 0.38, beardMat);
      addPart(headPivot, 0.06, 0.24, 0.08, -0.1, 0.44, 0.14, hornMat, -0.35, 0, -0.1);
      addPart(headPivot, 0.06, 0.24, 0.08, 0.1, 0.44, 0.14, hornMat, -0.35, 0, 0.1);
      addPart(headPivot, 0.14, 0.06, 0.08, -0.2, 0.28, 0.18, coatMat, 0, 0, 0.4);
      addPart(headPivot, 0.14, 0.06, 0.08, 0.2, 0.28, 0.18, coatMat, 0, 0, -0.4);
      addPart(headPivot, 0.05, 0.05, 0.04, -0.11, 0.28, 0.43, darkEyeMat);
      addPart(headPivot, 0.05, 0.05, 0.04, 0.11, 0.28, 0.43, darkEyeMat);

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.42, -0.43);
      addPart(tailPivot, 0.09, 0.16, 0.09, 0, 0.06, -0.04, beardMat, 0.4, 0, 0);
      bodyPivot.add(tailPivot);
    } else if (species === 'deer') {
      const coatMat = getMat(variant % 2 === 0 ? '#b45309' : '#c26e2d', 0.78);
      const bellyMat = getMat('#fef3c7', 0.85);
      const antlerMat = getMat('#e7d3b0', 0.65);
      const legH = 0.66;
      bodyBaseY = legH;
      walkSpeed = 2.05;
      shadowRadius = 0.95;
      eatNeckPitch = 0.76;
      drinkNeckPitch = 0.94;

      addFourLegs(0.11, legH, 0.17, 0.42, -0.42, coatMat);
      addPart(bodyPivot, 0.46, 0.44, 1.02, 0, legH + 0.22, 0, coatMat);
      addPart(bodyPivot, 0.34, 0.12, 0.8, 0, legH + 0.03, 0, bellyMat);
      // Fawn spots on back
      addPart(bodyPivot, 0.48, 0.08, 0.1, 0, legH + 0.34, 0.15, bellyMat);
      addPart(bodyPivot, 0.48, 0.08, 0.1, 0, legH + 0.34, -0.18, bellyMat);

      neckPivot.position.set(0, legH + 0.38, 0.44);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.18, 0.42, 0.2, 0, 0.2, 0.08, coatMat, 0.22, 0, 0);
      addPart(headPivot, 0.28, 0.25, 0.38, 0, 0.44, 0.22, coatMat);
      addPart(headPivot, 0.16, 0.14, 0.14, 0, 0.4, 0.44, bellyMat);
      addPart(headPivot, 0.07, 0.06, 0.05, 0, 0.43, 0.51, darkEyeMat);
      addPart(headPivot, 0.05, 0.05, 0.04, -0.12, 0.47, 0.36, darkEyeMat);
      addPart(headPivot, 0.05, 0.05, 0.04, 0.12, 0.47, 0.36, darkEyeMat);
      addPart(headPivot, 0.08, 0.16, 0.06, -0.16, 0.58, 0.12, coatMat, 0, 0, 0.32);
      addPart(headPivot, 0.08, 0.16, 0.06, 0.16, 0.58, 0.12, coatMat, 0, 0, -0.32);
      // Stags get branching antlers
      if (variant % 2 === 0) {
        addPart(headPivot, 0.05, 0.36, 0.05, -0.12, 0.7, 0.16, antlerMat, 0, 0, 0.25);
        addPart(headPivot, 0.05, 0.36, 0.05, 0.12, 0.7, 0.16, antlerMat, 0, 0, -0.25);
        addPart(headPivot, 0.14, 0.05, 0.05, -0.18, 0.76, 0.2, antlerMat);
        addPart(headPivot, 0.14, 0.05, 0.05, 0.18, 0.76, 0.2, antlerMat);
      }

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.38, -0.52);
      addPart(tailPivot, 0.12, 0.18, 0.1, 0, 0.02, -0.04, bellyMat, 0.5, 0, 0);
      bodyPivot.add(tailPivot);
    } else if (species === 'horse') {
      const breeds = [
        { coat: '#92400e', mane: '#1c1917' },
        { coat: '#d97706', mane: '#fef3c7' },
        { coat: '#27272a', mane: '#09090b' },
      ];
      const pal = breeds[variant % breeds.length];
      const coatMat = getMat(pal.coat, 0.72);
      const maneMat = getMat(pal.mane, 0.85);
      const legH = 0.78;
      bodyBaseY = legH;
      walkSpeed = 2.25;
      shadowRadius = 1.35;
      eatNeckPitch = 0.82;
      drinkNeckPitch = 1.02;

      addFourLegs(0.16, legH, 0.21, 0.52, -0.52, coatMat);
      addPart(bodyPivot, 0.62, 0.58, 1.32, 0, legH + 0.29, 0, coatMat);

      neckPivot.position.set(0, legH + 0.44, 0.56);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.26, 0.56, 0.28, 0, 0.25, 0.14, coatMat, 0.32, 0, 0);
      addPart(headPivot, 0.1, 0.54, 0.14, 0, 0.3, -0.02, maneMat, 0.32, 0, 0);
      addPart(headPivot, 0.3, 0.28, 0.52, 0, 0.5, 0.4, coatMat, 0.24, 0, 0);
      addPart(headPivot, 0.08, 0.14, 0.08, -0.1, 0.67, 0.2, coatMat);
      addPart(headPivot, 0.08, 0.14, 0.08, 0.1, 0.67, 0.2, coatMat);
      addPart(headPivot, 0.06, 0.06, 0.05, -0.13, 0.54, 0.44, darkEyeMat);
      addPart(headPivot, 0.06, 0.06, 0.05, 0.13, 0.54, 0.44, darkEyeMat);

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.48, -0.66);
      addPart(tailPivot, 0.14, 0.62, 0.16, 0, -0.28, -0.08, maneMat, 0.25, 0, 0);
      bodyPivot.add(tailPivot);
    } else if (species === 'rabbit') {
      const coats = ['#f8fafc', '#d6b48c', '#9ca3af'];
      const coatMat = getMat(coats[variant % coats.length], 0.9);
      const pinkMat = getMat('#f9a8d4', 0.65);
      const legH = 0.14;
      bodyBaseY = legH;
      walkSpeed = 1.75;
      isHopper = true;
      shadowRadius = 0.46;
      eatNeckPitch = 0.42;
      drinkNeckPitch = 0.55;

      addFourLegs(0.08, legH, 0.11, 0.12, -0.14, coatMat, false);
      addPart(bodyPivot, 0.28, 0.24, 0.42, 0, legH + 0.12, 0, coatMat);

      neckPivot.position.set(0, legH + 0.2, 0.2);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);
      addPart(headPivot, 0.22, 0.2, 0.22, 0, 0.06, 0.08, coatMat);
      addPart(headPivot, 0.06, 0.04, 0.04, 0, 0.04, 0.2, pinkMat);
      addPart(headPivot, 0.04, 0.04, 0.03, -0.07, 0.09, 0.19, darkEyeMat);
      addPart(headPivot, 0.04, 0.04, 0.03, 0.07, 0.09, 0.19, darkEyeMat);
      // Long articulated rabbit ears
      addPart(headPivot, 0.06, 0.24, 0.05, -0.06, 0.26, 0.04, coatMat, -0.1, 0, 0.08);
      addPart(headPivot, 0.06, 0.24, 0.05, 0.06, 0.26, 0.04, coatMat, -0.1, 0, -0.08);

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.14, -0.22);
      addPart(tailPivot, 0.11, 0.11, 0.11, 0, 0, -0.04, getMat('#ffffff', 0.92));
      bodyPivot.add(tailPivot);
    } else {
      // 'dinosaur': friendly colorful blocky Triceratops or Crested Jungle Dino
      const isTrike = variant % 2 === 0;
      const bodyMat = getMat(isTrike ? '#16a34a' : '#0f766e', 0.72);
      const bellyMat = getMat(isTrike ? '#bef264' : '#5eead4', 0.8);
      const plateMat = getMat(isTrike ? '#fde047' : '#f59e0b', 0.56);
      const legH = 0.62;
      bodyBaseY = legH;
      walkSpeed = 1.5;
      scale = 1.24;
      shadowRadius = 1.75;
      eatNeckPitch = 0.55;
      drinkNeckPitch = 0.72;

      addFourLegs(0.26, legH, 0.34, 0.48, -0.46, bodyMat, false);
      addPart(bodyPivot, 0.86, 0.72, 1.32, 0, legH + 0.36, 0, bodyMat);
      addPart(bodyPivot, 0.66, 0.14, 1.05, 0, legH + 0.04, 0, bellyMat);

      if (!isTrike) {
        // Dorsal spine plates
        for (let d = -2; d <= 2; d++) {
          addPart(bodyPivot, 0.12, 0.24, 0.16, 0, legH + 0.82, d * 0.24, plateMat);
        }
      }

      neckPivot.position.set(0, legH + 0.46, 0.64);
      bodyPivot.add(neckPivot);
      neckPivot.add(headPivot);

      if (isTrike) {
        addPart(headPivot, 0.52, 0.46, 0.56, 0, 0.1, 0.28, bodyMat);
        addPart(headPivot, 0.76, 0.58, 0.12, 0, 0.24, 0.04, bodyMat);
        addPart(headPivot, 0.6, 0.44, 0.14, 0, 0.24, 0.05, plateMat);
        // Brow horns + nose horn
        addPart(headPivot, 0.07, 0.07, 0.32, -0.18, 0.26, 0.58, hornMat, -0.2, 0, 0);
        addPart(headPivot, 0.07, 0.07, 0.32, 0.18, 0.26, 0.58, hornMat, -0.2, 0, 0);
        addPart(headPivot, 0.07, 0.16, 0.07, 0, 0.22, 0.52, hornMat);
        addPart(headPivot, 0.07, 0.07, 0.05, -0.24, 0.18, 0.46, darkEyeMat);
        addPart(headPivot, 0.07, 0.07, 0.05, 0.24, 0.18, 0.46, darkEyeMat);
      } else {
        addPart(headPivot, 0.28, 0.64, 0.28, 0, 0.28, 0.14, bodyMat, 0.22, 0, 0);
        addPart(headPivot, 0.4, 0.32, 0.56, 0, 0.58, 0.34, bodyMat);
        addPart(headPivot, 0.14, 0.1, 0.28, 0, 0.78, 0.26, plateMat);
        addPart(headPivot, 0.07, 0.07, 0.05, -0.18, 0.62, 0.48, darkEyeMat);
        addPart(headPivot, 0.07, 0.07, 0.05, 0.18, 0.62, 0.48, darkEyeMat);
      }

      tailPivot = new THREE.Group();
      tailPivot.position.set(0, legH + 0.42, -0.66);
      addPart(tailPivot, 0.38, 0.34, 0.56, 0, -0.02, -0.28, bodyMat);
      addPart(tailPivot, 0.22, 0.22, 0.52, 0, -0.04, -0.78, bodyMat);
      bodyPivot.add(tailPivot);
    }

    root.scale.setScalar(scale);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    shadow.scale.setScalar(shadowRadius);
    root.add(shadow);

    const initialYaw = ((seed % 628) / 100) - Math.PI;
    root.rotation.y = initialYaw;
    group.add(root);

    groundAnimals.push({
      species,
      zone,
      root,
      bodyPivot,
      neckPivot,
      headPivot,
      tailPivot,
      legPivots,
      x: sx,
      y: sy,
      z: sz,
      yaw: initialYaw,
      targetX: sx,
      targetZ: sz,
      state: 'walk',
      stateTimer: 1.5 + (seed % 4),
      gaitPhase: (seed % 100) * 0.06,
      walkSpeed,
      scale,
      baseNeckPitch,
      eatNeckPitch,
      drinkNeckPitch,
      bodyBaseY,
      isHopper,
      seed,
    });
  };

  // =========================================================================
  // COMPOSITE FLYING BIRD BUILDERS (Parrots, Eagles & Forest Songbirds)
  // =========================================================================
  const spawnBird = (
    species: BirdSpecies,
    zone: ForestZoneSpec,
    variant: number,
    seed: number,
  ) => {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const leftWingPivot = new THREE.Group();
    const rightWingPivot = new THREE.Group();
    const tailPivot = new THREE.Group();

    let birdScale = 1.0;
    let baseY = 12.5;
    let flapRate = 10.5;
    let angularSpeed = 0.36;

    if (species === 'eagle') {
      const featherMat = getMat('#573b26', 0.72);
      const wingTipMat = getMat('#3f2918', 0.76);
      const whiteMat = getMat('#f8fafc', 0.74);
      birdScale = 1.35;
      baseY = 21 + (variant % 3) * 2.5;
      flapRate = 4.6;
      angularSpeed = 0.24;

      addPart(bodyPivot, 0.32, 0.26, 0.62, 0, 0, 0, featherMat);
      addPart(bodyPivot, 0.24, 0.22, 0.26, 0, 0.06, 0.36, whiteMat);
      addPart(bodyPivot, 0.1, 0.08, 0.16, 0, 0.02, 0.54, beakMat);
      addPart(bodyPivot, 0.04, 0.04, 0.04, -0.1, 0.09, 0.44, darkEyeMat);
      addPart(bodyPivot, 0.04, 0.04, 0.04, 0.1, 0.09, 0.44, darkEyeMat);

      leftWingPivot.position.set(-0.16, 0.04, 0.05);
      addPart(leftWingPivot, 0.52, 0.05, 0.3, -0.26, 0, 0, featherMat);
      addPart(leftWingPivot, 0.32, 0.04, 0.24, -0.62, 0, -0.02, wingTipMat);
      bodyPivot.add(leftWingPivot);

      rightWingPivot.position.set(0.16, 0.04, 0.05);
      addPart(rightWingPivot, 0.52, 0.05, 0.3, 0.26, 0, 0, featherMat);
      addPart(rightWingPivot, 0.32, 0.04, 0.24, 0.62, 0, -0.02, wingTipMat);
      bodyPivot.add(rightWingPivot);

      tailPivot.position.set(0, 0.02, -0.32);
      addPart(tailPivot, 0.34, 0.04, 0.32, 0, 0, -0.16, whiteMat);
      bodyPivot.add(tailPivot);
    } else if (species === 'parrot') {
      const macaws = [
        { body: '#ef4444', wing: '#2563eb', crest: '#facc15' }, // Scarlet Macaw
        { body: '#10b981', wing: '#0ea5e9', crest: '#f43f5e' }, // Tropical Emerald
        { body: '#0284c7', wing: '#facc15', crest: '#f97316' }, // Blue-and-Gold Macaw
      ];
      const pal = macaws[variant % macaws.length];
      const bodyMat = getMat(pal.body, 0.64);
      const wingMat = getMat(pal.wing, 0.64);
      const crestMat = getMat(pal.crest, 0.6);
      birdScale = 0.92;
      baseY = 10.5 + (variant % 4) * 1.4;
      flapRate = 11.2;
      angularSpeed = 0.42;

      addPart(bodyPivot, 0.22, 0.22, 0.42, 0, 0, 0, bodyMat);
      addPart(bodyPivot, 0.2, 0.2, 0.22, 0, 0.06, 0.24, bodyMat);
      addPart(bodyPivot, 0.08, 0.12, 0.14, 0, 0.2, 0.2, crestMat);
      addPart(bodyPivot, 0.1, 0.1, 0.12, 0, 0.03, 0.38, beakMat);
      addPart(bodyPivot, 0.04, 0.04, 0.03, -0.09, 0.1, 0.3, darkEyeMat);
      addPart(bodyPivot, 0.04, 0.04, 0.03, 0.09, 0.1, 0.3, darkEyeMat);

      leftWingPivot.position.set(-0.11, 0.04, 0.02);
      addPart(leftWingPivot, 0.38, 0.04, 0.22, -0.19, 0, 0, wingMat);
      bodyPivot.add(leftWingPivot);

      rightWingPivot.position.set(0.11, 0.04, 0.02);
      addPart(rightWingPivot, 0.38, 0.04, 0.22, 0.19, 0, 0, wingMat);
      bodyPivot.add(rightWingPivot);

      tailPivot.position.set(0, 0.0, -0.22);
      addPart(tailPivot, 0.16, 0.04, 0.34, 0, 0, -0.16, crestMat);
      bodyPivot.add(tailPivot);
    } else {
      // 'songbird': agile forest bluejays, cardinals & canaries
      const songPalettes = [
        { body: '#38bdf8', wing: '#1d4ed8', belly: '#f8fafc' }, // Bluejay
        { body: '#fb7185', wing: '#be123c', belly: '#ffe4e6' }, // Forest Cardinal
        { body: '#facc15', wing: '#eab308', belly: '#fef9c3' }, // Forest Canary
      ];
      const pal = songPalettes[variant % songPalettes.length];
      const bodyMat = getMat(pal.body, 0.68);
      const wingMat = getMat(pal.wing, 0.68);
      birdScale = 0.72;
      baseY = 9.0 + (variant % 4) * 1.2;
      flapRate = 14.0;
      angularSpeed = 0.48;

      addPart(bodyPivot, 0.18, 0.16, 0.32, 0, 0, 0, bodyMat);
      addPart(bodyPivot, 0.15, 0.14, 0.16, 0, 0.05, 0.18, bodyMat);
      addPart(bodyPivot, 0.07, 0.06, 0.09, 0, 0.04, 0.28, beakMat);

      leftWingPivot.position.set(-0.09, 0.03, 0);
      addPart(leftWingPivot, 0.28, 0.035, 0.18, -0.14, 0, 0, wingMat);
      bodyPivot.add(leftWingPivot);

      rightWingPivot.position.set(0.09, 0.03, 0);
      addPart(rightWingPivot, 0.28, 0.035, 0.18, 0.14, 0, 0, wingMat);
      bodyPivot.add(rightWingPivot);

      tailPivot.position.set(0, 0, -0.16);
      addPart(tailPivot, 0.12, 0.035, 0.22, 0, 0, -0.11, wingMat);
      bodyPivot.add(tailPivot);
    }

    root.scale.setScalar(birdScale);
    group.add(root);

    const centerX = (zone.xMin + zone.xMax) * 0.5 + ((seed % 7) - 3) * 1.8;
    const centerZ = (zone.zMin + zone.zMax) * 0.5 + (((seed >> 3) % 7) - 3) * 1.8;
    const radiusX = Math.max(8, (zone.xMax - zone.xMin) * 0.34);
    const radiusZ = Math.max(8, (zone.zMax - zone.zMin) * 0.34);
    const dir = (seed & 1) === 0 ? 1 : -1;

    birds.push({
      species,
      zone,
      root,
      bodyPivot,
      leftWingPivot,
      rightWingPivot,
      tailPivot,
      centerX,
      centerZ,
      radiusX,
      radiusZ,
      baseY,
      bobAmp: species === 'eagle' ? 1.15 : 0.75,
      angularSpeed: angularSpeed * dir,
      angle: ((seed % 628) / 100),
      wingPhase: (seed % 100) * 0.1,
      flapRate,
      x: centerX,
      y: baseY,
      z: centerZ,
    });
  };

  // =========================================================================
  // POPULATE ALL 5 FORESTS WITH VARIED ANIMALS & BIRDS
  // =========================================================================
  const zoneRosters: Array<{
    zone: ForestZoneSpec;
    ground: GroundAnimalSpecies[];
    birds: BirdSpecies[];
  }> = [
    {
      zone: FOREST_ZONES[0], // North-West Woods
      ground: ['deer', 'goat', 'sheep', 'rabbit', 'cow', 'horse', 'dinosaur'],
      birds: ['parrot', 'eagle', 'songbird', 'parrot'],
    },
    {
      zone: FOREST_ZONES[1], // North-East Woods
      ground: ['horse', 'cow', 'deer', 'sheep', 'rabbit', 'goat', 'dinosaur'],
      birds: ['eagle', 'parrot', 'songbird', 'songbird'],
    },
    {
      zone: FOREST_ZONES[2], // West Emerald Forest
      ground: ['goat', 'deer', 'rabbit', 'horse', 'cow', 'sheep', 'dinosaur'],
      birds: ['parrot', 'eagle', 'songbird'],
    },
    {
      zone: FOREST_ZONES[3], // East Sunlit Forest
      ground: ['sheep', 'cow', 'deer', 'goat', 'rabbit', 'horse', 'dinosaur'],
      birds: ['parrot', 'eagle', 'songbird'],
    },
    {
      zone: FOREST_ZONES[4], // South-West Grove (closest forest grove to Villa & Mall!)
      ground: ['rabbit', 'sheep', 'goat', 'deer', 'cow', 'horse', 'dinosaur'],
      birds: ['parrot', 'songbird', 'eagle', 'parrot'],
    },
    {
      zone: FOREST_ZONES[5], // Outer West Horizon Woods
      ground: ['deer', 'horse', 'rabbit', 'dinosaur'],
      birds: ['eagle', 'parrot'],
    },
    {
      zone: FOREST_ZONES[6], // North Woods Lodge Meadow
      ground: ['goat', 'cow', 'sheep', 'deer'],
      birds: ['songbird', 'parrot'],
    },
  ];

  let seedCounter = 1041;
  for (let z = 0; z < zoneRosters.length; z++) {
    const roster = zoneRosters[z];
    for (let i = 0; i < roster.ground.length; i++) {
      spawnGroundAnimal(roster.ground[i], roster.zone, i + z, seedCounter);
      seedCounter += 7919;
    }
    for (let b = 0; b < roster.birds.length; b++) {
      spawnBird(roster.birds[b], roster.zone, b + z, seedCounter);
      seedCounter += 6553;
    }
  }

  const pickNextBehavior = (actor: GroundAnimalActor, seedVal: number) => {
    const roll = Math.abs(seedVal) % 100;
    if (roll < 26) {
      // Walk to the forest pond edge to drink water
      const angle = ((seedVal % 628) / 100) - Math.PI;
      const bankDist = actor.zone.pondClearRadius + 0.55;
      const candX = actor.zone.pondX + Math.cos(angle) * bankDist;
      const candZ = actor.zone.pondZ + Math.sin(angle) * bankDist;
      if (canAnimalStandAt(candX, candZ, actor.zone)) {
        actor.targetX = candX;
        actor.targetZ = candZ;
        actor.state = 'drink';
        actor.stateTimer = 8.5;
        return;
      }
    }

    if (roll < 56) {
      // Graze / eat grass or wildflowers nearby
      actor.state = 'eat';
      actor.stateTimer = 3.2 + ((seedVal % 25) * 0.1);
      return;
    }

    if (roll < 70) {
      actor.state = 'idle';
      actor.stateTimer = 2.0 + ((seedVal % 20) * 0.1);
      return;
    }

    // Stroll to another open woodland spot
    const [tx, tz] = findOpenSpotInZone(actor.zone, seedVal);
    actor.targetX = tx;
    actor.targetZ = tz;
    actor.state = 'walk';
    actor.stateTimer = 6.5;
  };

  let soundCooldown = 2.4;
  let audioScanIdx = 0;

  const update = (
    elapsed: number,
    dt: number,
    playerX: number,
    playerZ: number,
    soundEnabled: boolean,
  ) => {
    const safeDt = Math.min(dt, 0.05);

    // Update all ground animals (4GB RAM cull outside 82m radius)
    for (let i = 0; i < groundAnimals.length; i++) {
      const a = groundAnimals[i];
      a.seed = (a.seed + 13) & 0x7fffffff;
      a.stateTimer -= safeDt;

      const distToTarget = Math.hypot(a.targetX - a.x, a.targetZ - a.z);
      let isMoving = false;
      let sippingAtWater = false;

      if (a.state === 'walk') {
        if (distToTarget > 0.75 && a.stateTimer > 0) {
          isMoving = true;
        } else {
          pickNextBehavior(a, a.seed + Math.floor(elapsed * 31));
        }
      } else if (a.state === 'drink') {
        if (distToTarget > 0.85 && a.stateTimer > 3.2) {
          isMoving = true;
        } else {
          sippingAtWater = true;
          const pondAngle = Math.atan2(a.zone.pondX - a.x, a.zone.pondZ - a.z);
          a.yaw = dampAngle(a.yaw, pondAngle, 6, safeDt);
          if (a.stateTimer <= 0) {
            pickNextBehavior(a, a.seed + 97);
          }
        }
      } else if (a.stateTimer <= 0) {
        pickNextBehavior(a, a.seed + 53);
      }

      if (isMoving) {
        const desiredYaw = Math.atan2(a.targetX - a.x, a.targetZ - a.z);
        a.yaw = dampAngle(a.yaw, desiredYaw, 6.5, safeDt);
        const step = a.walkSpeed * safeDt;
        const nx = a.x + Math.sin(a.yaw) * step;
        const nz = a.z + Math.cos(a.yaw) * step;
        if (canAnimalStandAt(nx, nz, a.zone)) {
          a.x = nx;
          a.z = nz;
          a.y = THREE.MathUtils.damp(a.y, getSafeGroundSupportY(a.x, a.z), 12, safeDt);
        } else {
          // Turn cleanly away from tree trunks & pick fresh open path
          a.yaw = normalizeAngle(a.yaw + Math.PI * 0.72);
          pickNextBehavior(a, a.seed + i * 37);
        }
      }

      // 4GB RAM optimization: distance cull visuals beyond 82m from player
      const pdx = a.x - playerX;
      const pdz = a.z - playerZ;
      const visible = pdx * pdx + pdz * pdz < 82 * 82;
      a.root.visible = visible;
      if (!visible) continue;

      a.root.position.set(a.x, a.y, a.z);
      a.root.rotation.y = a.yaw;

      if (isMoving) {
        const freq = a.isHopper ? 9.5 : 6.8;
        a.gaitPhase += safeDt * freq;
        const swing = Math.sin(a.gaitPhase) * (a.isHopper ? 0.65 : 0.48);

        if (a.isHopper) {
          // Bunny hops symmetrically with front/hind legs + vertical arc
          const hopY = Math.max(0, Math.sin(a.gaitPhase)) * 0.24;
          a.bodyPivot.position.y = hopY;
          a.legPivots[0].rotation.x = swing;
          a.legPivots[1].rotation.x = swing;
          a.legPivots[2].rotation.x = -swing * 0.9;
          a.legPivots[3].rotation.x = -swing * 0.9;
        } else {
          a.bodyPivot.position.y = Math.abs(Math.sin(a.gaitPhase)) * 0.025;
          a.legPivots[0].rotation.x = swing;
          a.legPivots[3].rotation.x = swing;
          a.legPivots[1].rotation.x = -swing;
          a.legPivots[2].rotation.x = -swing;
        }
        a.neckPivot.rotation.x = THREE.MathUtils.damp(a.neckPivot.rotation.x, a.baseNeckPitch, 8, safeDt);
        a.headPivot.rotation.y = THREE.MathUtils.damp(a.headPivot.rotation.y, 0, 8, safeDt);
        a.headPivot.rotation.x = THREE.MathUtils.damp(a.headPivot.rotation.x, 0, 8, safeDt);
      } else {
        a.bodyPivot.position.y = THREE.MathUtils.damp(a.bodyPivot.position.y, 0, 12, safeDt);
        for (let l = 0; l < a.legPivots.length; l++) {
          a.legPivots[l].rotation.x = THREE.MathUtils.damp(a.legPivots[l].rotation.x, 0, 10, safeDt);
        }
        if (sippingAtWater) {
          const sipNod = Math.sin(elapsed * 5.2 + i) * 0.08;
          a.neckPivot.rotation.x = THREE.MathUtils.damp(a.neckPivot.rotation.x, a.drinkNeckPitch, 6, safeDt);
          a.headPivot.rotation.x = sipNod;
          a.headPivot.rotation.y = THREE.MathUtils.damp(a.headPivot.rotation.y, 0, 6, safeDt);
        } else if (a.state === 'eat') {
          const chew = Math.sin(elapsed * 8.4 + i * 1.3) * 0.1;
          a.neckPivot.rotation.x = THREE.MathUtils.damp(a.neckPivot.rotation.x, a.eatNeckPitch, 6, safeDt);
          a.headPivot.rotation.x = chew;
          a.headPivot.rotation.y = Math.sin(elapsed * 1.4 + i) * 0.14;
        } else {
          a.neckPivot.rotation.x = THREE.MathUtils.damp(a.neckPivot.rotation.x, a.baseNeckPitch, 6, safeDt);
          a.headPivot.rotation.x = Math.sin(elapsed * 1.8 + i) * 0.04;
          a.headPivot.rotation.y = Math.sin(elapsed * 0.9 + i * 2.1) * 0.25;
        }
      }

      if (a.tailPivot) {
        a.tailPivot.rotation.z = Math.sin(elapsed * 4.5 + i * 1.7) * (a.species === 'dinosaur' ? 0.16 : 0.24);
      }
    }

    // Update all flying birds (parrots, eagles & songbirds)
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      b.angle += b.angularSpeed * safeDt;
      const nx = b.centerX + Math.cos(b.angle) * b.radiusX;
      const nz = b.centerZ + Math.sin(b.angle) * b.radiusZ;
      const ny = b.baseY + Math.sin(elapsed * 0.9 + i * 1.4) * b.bobAmp;

      const vx = -Math.sin(b.angle) * b.radiusX * b.angularSpeed;
      const vz = Math.cos(b.angle) * b.radiusZ * b.angularSpeed;
      const heading = Math.atan2(vx, vz);

      b.x = nx;
      b.y = ny;
      b.z = nz;

      const pdx = nx - playerX;
      const pdz = nz - playerZ;
      const visible = pdx * pdx + pdz * pdz < 92 * 92;
      b.root.visible = visible;
      if (!visible) continue;

      b.root.position.set(nx, ny, nz);
      b.root.rotation.y = heading;
      b.bodyPivot.rotation.z = b.angularSpeed > 0 ? 0.22 : -0.22;

      b.wingPhase += safeDt * b.flapRate;
      // Eagles alternate brisk wingbeats with soaring glides
      const flapEnv =
        b.species === 'eagle'
          ? Math.sin(elapsed * 0.55 + i) > 0.15
            ? 0.65
            : 0.12
          : 0.85;
      const flap = Math.sin(b.wingPhase) * flapEnv;
      b.leftWingPivot.rotation.z = -flap;
      b.rightWingPivot.rotation.z = flap;
      b.tailPivot.rotation.x = Math.sin(elapsed * 2.4 + i) * 0.12;
    }

    // Proximity realistic animal & bird sounds when near forests (throttled cleanly)
    soundCooldown -= safeDt;
    if (soundCooldown <= 0 && soundEnabled && audio) {
      soundCooldown = 3.2 + ((audioScanIdx * 7) % 10) * 0.18;
      let bestSpecies: WildlifeSpecies | null = null;
      let bestDistSq = 36 * 36;

      for (let i = 0; i < groundAnimals.length; i++) {
        const a = groundAnimals[(i + audioScanIdx) % groundAnimals.length];
        const dSq = (a.x - playerX) * (a.x - playerX) + (a.z - playerZ) * (a.z - playerZ);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestSpecies = a.species;
        }
      }

      if (!bestSpecies || audioScanIdx % 3 === 1) {
        let birdBestSq = 44 * 44;
        for (let i = 0; i < birds.length; i++) {
          const b = birds[(i + audioScanIdx) % birds.length];
          const dSq = (b.x - playerX) * (b.x - playerX) + (b.z - playerZ) * (b.z - playerZ);
          if (dSq < birdBestSq) {
            birdBestSq = dSq;
            bestSpecies = b.species;
            bestDistSq = Math.min(bestDistSq, birdBestSq);
          }
        }
      }

      audioScanIdx++;
      if (bestSpecies) {
        const dist = Math.sqrt(bestDistSq);
        const volumeScale = THREE.MathUtils.clamp(1.05 - dist / 42, 0.14, 0.95);
        audio.playAnimalSound(bestSpecies, volumeScale);
      }
    }
  };

  const dispose = () => {
    for (let i = 0; i < disposables.length; i++) {
      disposables[i].dispose();
    }
    matCache.clear();
  };

  return { group, update, dispose };
}
