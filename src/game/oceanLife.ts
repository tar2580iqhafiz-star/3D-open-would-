import * as THREE from 'three';

export const BEACH_SWIM_MIN_X = -78;
export const BEACH_SWIM_MAX_X = 78;
export const BEACH_SWIM_START_Z = 156.2;
export const BEACH_SWIM_MAX_Z = 188.0;
export const SHALLOW_WATER_SURFACE_Y = 1.56;
export const LAGOON_DEEP_FLOOR_Y = -0.55;

/**
 * Returns the exact sandy seabed height across the playable coastal bay:
 * - z <= 158.5: shallow wading shelf at y = 1.0 (flush with sand blocks)
 * - 158.5..163.0: smooth sandy slope down to y = -0.55 (~2.1m dive depth under SEA_LEVEL = 1.56)
 * - z >= 163.0: comfortable underwater sandy floor at y = -0.55
 */
export function getLagoonFloorY(x: number, z: number): number {
  if (Math.abs(x) > 80.5 || z <= 158.5) return 1.0;
  if (z >= 163.0) return LAGOON_DEEP_FLOOR_Y;
  const t = (z - 158.5) / (163.0 - 158.5);
  const smooth = t * t * (3 - 2 * t);
  return 1.0 + (LAGOON_DEEP_FLOOR_Y - 1.0) * smooth;
}

interface FishActor {
  group: THREE.Group;
  tailPivot: THREE.Group;
  centerX: number;
  centerZ: number;
  baseY: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
  figureEight: boolean;
}

export interface OceanLifeSystem {
  group: THREE.Group;
  update: (elapsed: number, dt: number, playerX: number, playerZ: number) => void;
  dispose: () => void;
}

const FISH_PALETTES: ReadonlyArray<{ body: number; fin: number; accent: number }> = [
  { body: 0xff6b35, fin: 0xffffff, accent: 0xfde047 }, // Clownfish
  { body: 0x0ea5e9, fin: 0xfacc15, accent: 0x0369a1 }, // Blue Tang
  { body: 0xfacc15, fin: 0xfef9c3, accent: 0x1e293b }, // Lemon Butterfly
  { body: 0xfb7185, fin: 0xfecdd3, accent: 0xffffff }, // Coral Chromis
  { body: 0x34d399, fin: 0xa7f3d0, accent: 0x059669 }, // Mint Damselfish
  { body: 0xf59e0b, fin: 0xfde68a, accent: 0xb45309 }, // Amber Reef Fish
];

/**
 * Builds lightweight coastal ocean life for Android 4GB RAM:
 * - Sloped golden-sand lagoon floor allowing surface wading AND underwater diving
 * - 24 colorful animated 3D fish swimming at both shallow and underwater depths
 * - Shoreline surf foam bands
 * - Floating swim-zone boundary buoys & rope perimeter
 */
export function createOceanLifeSystem(): OceanLifeSystem {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const fishes: FishActor[] = [];

  // Lightweight sloped sandy lagoon seabed spanning x in [-81..81], z in [158..192]
  const seabedGeo = new THREE.PlaneGeometry(162, 34, 8, 18);
  seabedGeo.rotateX(-Math.PI / 2);
  const seabedCenterZ = 158 + 34 / 2;
  const posAttr = seabedGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i) + seabedCenterZ;
    posAttr.setY(i, getLagoonFloorY(vx, vz) - 0.01);
  }
  seabedGeo.computeVertexNormals();
  const seabedMat = new THREE.MeshStandardMaterial({
    color: 0xe3cc88,
    roughness: 0.94,
    metalness: 0.02,
  });
  const seabedMesh = new THREE.Mesh(seabedGeo, seabedMat);
  seabedMesh.position.set(0, 0, seabedCenterZ);
  seabedMesh.receiveShadow = true;
  group.add(seabedMesh);
  disposables.push(seabedGeo, seabedMat);

  // Shared ultra-lightweight geometries (reused across all 24 fish)
  const bodyGeo = new THREE.BoxGeometry(0.14, 0.16, 0.34);
  const dorsalGeo = new THREE.BoxGeometry(0.03, 0.08, 0.16);
  const tailGeo = new THREE.BoxGeometry(0.03, 0.14, 0.14);
  tailGeo.translate(0, 0, -0.07);
  const eyeGeo = new THREE.BoxGeometry(0.15, 0.035, 0.035);
  disposables.push(bodyGeo, dorsalGeo, tailGeo, eyeGeo);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  disposables.push(eyeMat);

  const paletteMats = FISH_PALETTES.map((p) => {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: p.body,
      roughness: 0.45,
      metalness: 0.05,
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: p.fin,
      roughness: 0.5,
      metalness: 0.05,
    });
    disposables.push(bodyMat, finMat);
    return { bodyMat, finMat };
  });

  // Populate 24 colorful reef fish across the shallow & deeper dive lagoon (z in [161..183])
  for (let i = 0; i < 24; i++) {
    const pal = paletteMats[i % paletteMats.length];
    const fishGroup = new THREE.Group();

    const body = new THREE.Mesh(bodyGeo, pal.bodyMat);
    fishGroup.add(body);

    const dorsal = new THREE.Mesh(dorsalGeo, pal.finMat);
    dorsal.position.set(0, 0.1, -0.02);
    fishGroup.add(dorsal);

    const eyes = new THREE.Mesh(eyeGeo, eyeMat);
    eyes.position.set(0, 0.03, 0.11);
    fishGroup.add(eyes);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0, -0.17);
    const tail = new THREE.Mesh(tailGeo, pal.finMat);
    tailPivot.add(tail);
    fishGroup.add(tailPivot);

    const scale = 0.78 + (i % 4) * 0.14;
    fishGroup.scale.setScalar(scale);

    const laneX = -50 + (i % 8) * 14 + ((i * 7) % 5) - 2;
    const band = Math.floor(i / 8); // 0, 1, 2
    const laneZ = 162.8 + band * 6.4 + (i % 3) * 1.4;
    // Mix shallow-visible & deeper dive-level swimmers
    const baseY = 0.18 + (i % 4) * 0.28;

    fishGroup.position.set(laneX, baseY, laneZ);
    group.add(fishGroup);

    fishes.push({
      group: fishGroup,
      tailPivot,
      centerX: laneX,
      centerZ: laneZ,
      baseY,
      radiusX: 2.8 + (i % 4) * 1.2,
      radiusZ: 1.8 + ((i + 1) % 3) * 0.95,
      speed: 0.55 + (i % 5) * 0.14,
      phase: i * 1.17,
      figureEight: i % 3 === 0,
    });
  }

  // Gentle shoreline white foam crests near beach sand transition (z ~ 156.5)
  const foamGeo = new THREE.PlaneGeometry(156, 1.3);
  foamGeo.rotateX(-Math.PI / 2);
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f7ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const foamBand1 = new THREE.Mesh(foamGeo, foamMat);
  foamBand1.position.set(0, SHALLOW_WATER_SURFACE_Y + 0.03, 156.4);
  group.add(foamBand1);

  const foamBand2 = new THREE.Mesh(foamGeo, foamMat);
  foamBand2.position.set(0, SHALLOW_WATER_SURFACE_Y + 0.025, 158.6);
  group.add(foamBand2);
  disposables.push(foamGeo, foamMat);

  // Floating Swim Safety Boundary Buoys along outer bay limit (z = 185, x = ±62)
  const buoyFloatGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 10);
  const buoyCapGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const redBuoyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
  const whiteBuoyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  disposables.push(buoyFloatGeo, buoyCapGeo, ropeMat, redBuoyMat, whiteBuoyMat);

  const buoyMeshes: Array<{ mesh: THREE.Mesh; phase: number; baseX: number; baseZ: number }> = [];
  const addBuoy = (bx: number, bz: number, idx: number) => {
    const m = new THREE.Mesh(buoyFloatGeo, idx % 2 === 0 ? redBuoyMat : whiteBuoyMat);
    m.position.set(bx, SHALLOW_WATER_SURFACE_Y + 0.02, bz);
    const cap = new THREE.Mesh(buoyCapGeo, idx % 2 === 0 ? whiteBuoyMat : redBuoyMat);
    cap.position.y = 0.22;
    m.add(cap);
    group.add(m);
    buoyMeshes.push({ mesh: m, phase: idx * 0.85, baseX: bx, baseZ: bz });
  };

  let buoyIdx = 0;
  for (let bx = BEACH_SWIM_MIN_X; bx <= BEACH_SWIM_MAX_X; bx += 8) {
    addBuoy(bx, BEACH_SWIM_MAX_Z, buoyIdx++);
  }
  for (let bz = 158; bz < BEACH_SWIM_MAX_Z; bz += 5) {
    addBuoy(BEACH_SWIM_MIN_X, bz, buoyIdx++);
    addBuoy(BEACH_SWIM_MAX_X, bz, buoyIdx++);
  }

  // Thin floating safety rope connecting buoys
  const southRopeGeo = new THREE.BoxGeometry(BEACH_SWIM_MAX_X - BEACH_SWIM_MIN_X, 0.05, 0.05);
  const southRope = new THREE.Mesh(southRopeGeo, ropeMat);
  southRope.position.set(0, SHALLOW_WATER_SURFACE_Y + 0.02, BEACH_SWIM_MAX_Z);
  group.add(southRope);

  const sideLen = BEACH_SWIM_MAX_Z - 156;
  const sideRopeGeo = new THREE.BoxGeometry(0.05, 0.05, sideLen);
  const westRope = new THREE.Mesh(sideRopeGeo, ropeMat);
  westRope.position.set(BEACH_SWIM_MIN_X, SHALLOW_WATER_SURFACE_Y + 0.02, 156 + sideLen / 2);
  const eastRope = new THREE.Mesh(sideRopeGeo, ropeMat);
  eastRope.position.set(BEACH_SWIM_MAX_X, SHALLOW_WATER_SURFACE_Y + 0.02, 156 + sideLen / 2);
  group.add(westRope, eastRope);
  disposables.push(southRopeGeo, sideRopeGeo);

  const update = (elapsed: number, _dt: number, _playerX: number, playerZ: number) => {
    // Save mobile CPU/GPU work when player is far inland
    const nearCoast = playerZ > 85;
    group.visible = nearCoast;
    if (!nearCoast) return;

    // Gentle shoreline wave surge
    const surge1 = Math.sin(elapsed * 1.65);
    const surge2 = Math.sin(elapsed * 1.65 + 1.4);
    foamBand1.position.z = 156.45 + surge1 * 0.42;
    foamBand1.position.y = SHALLOW_WATER_SURFACE_Y + 0.03 + Math.sin(elapsed * 1.8) * 0.025;
    foamBand2.position.z = 158.9 + surge2 * 0.55;
    foamBand2.position.y = SHALLOW_WATER_SURFACE_Y + 0.025 + Math.cos(elapsed * 1.6) * 0.025;

    // Bobbing safety boundary buoys
    for (let i = 0; i < buoyMeshes.length; i++) {
      const b = buoyMeshes[i];
      b.mesh.position.y =
        SHALLOW_WATER_SURFACE_Y +
        0.02 +
        Math.sin(elapsed * 2.1 + b.baseX * 0.14 + b.phase) * 0.055;
      b.mesh.rotation.z = Math.sin(elapsed * 1.7 + b.phase) * 0.09;
    }

    // Smooth underwater 3D fish swimming in varied coastal loops
    for (let i = 0; i < fishes.length; i++) {
      const f = fishes[i];
      const t = elapsed * f.speed + f.phase;
      const dtEps = 0.04;

      const evalPos = (ang: number): [number, number] => {
        if (f.figureEight) {
          const x = f.centerX + Math.sin(ang) * f.radiusX;
          const z = f.centerZ + Math.sin(ang * 2) * (f.radiusZ * 0.72);
          return [x, z];
        }
        const x = f.centerX + Math.cos(ang) * f.radiusX;
        const z = f.centerZ + Math.sin(ang) * f.radiusZ;
        return [x, z];
      };

      const [px, pz] = evalPos(t);
      const [nx, nz] = evalPos(t + dtEps);

      const clampedZ = THREE.MathUtils.clamp(pz, 159.4, BEACH_SWIM_MAX_Z - 1.2);
      const bobY = f.baseY + Math.sin(elapsed * 1.8 + f.phase) * 0.05;
      f.group.position.set(px, bobY, clampedZ);
      f.group.rotation.y = Math.atan2(nx - px, nz - pz);

      // Natural tail fin swimming wiggle
      f.tailPivot.rotation.y = Math.sin(elapsed * (9.5 + (i % 3) * 1.6) + f.phase) * 0.44;
    }
  };

  const dispose = () => {
    for (const d of disposables) d.dispose();
  };

  return { group, update, dispose };
}
