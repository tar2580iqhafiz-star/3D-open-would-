import * as THREE from 'three';

export interface DanceClubStage {
  group: THREE.Group;
  update: (elapsed: number, dt: number, musicActive: boolean, bpm: number, nearClub: boolean) => void;
  dispose: () => void;
}

const DISCO_PALETTE = [
  new THREE.Color('#f43f5e'),
  new THREE.Color('#38bdf8'),
  new THREE.Color('#a855f7'),
  new THREE.Color('#22d3ee'),
  new THREE.Color('#facc15'),
];

/**
 * Builds the interactive 3D DJ Booth, speaker towers, spinning disco ball,
 * lightweight additive laser beams, and dynamic beat light inside the Dance Club
 * located at world bounds x in [-64..-50], z in [6..20].
 */
export function createDanceClubStage(): DanceClubStage {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // ------------------------------------------------------------------
  // 1. DJ Turntable Console & Illuminated Mixer atop DJ Booth (-61.2, 3.0, 13)
  // ------------------------------------------------------------------
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.35,
    metalness: 0.65,
  });
  const platterMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.22,
    metalness: 0.85,
  });
  const neonTrimMat = new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    emissive: '#06b6d4',
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.2,
  });
  const laserMatA = new THREE.MeshBasicMaterial({
    color: '#e879f9',
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const laserMatB = new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const deckGeo = new THREE.BoxGeometry(0.9, 0.12, 2.2);
  const platterGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 14);
  const mixerBarGeo = new THREE.BoxGeometry(0.14, 0.08, 0.55);

  const djConsole = new THREE.Group();
  djConsole.position.set(-61.15, 3.06, 13);
  group.add(djConsole);

  const deckBase = new THREE.Mesh(deckGeo, deckMat);
  djConsole.add(deckBase);

  const leftPlatter = new THREE.Mesh(platterGeo, platterMat);
  leftPlatter.position.set(0, 0.08, -0.65);
  djConsole.add(leftPlatter);

  const rightPlatter = new THREE.Mesh(platterGeo, platterMat);
  rightPlatter.position.set(0, 0.08, 0.65);
  djConsole.add(rightPlatter);

  const mixerGlow = new THREE.Mesh(mixerBarGeo, neonTrimMat);
  mixerGlow.position.set(0, 0.08, 0);
  djConsole.add(mixerGlow);

  // ------------------------------------------------------------------
  // 2. Twin Floor-Standing DJ Speaker Stacks flanking the booth
  // ------------------------------------------------------------------
  const cabinetGeo = new THREE.BoxGeometry(0.85, 1.85, 0.95);
  const wooferGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.08, 12);
  wooferGeo.rotateZ(Math.PI / 2);

  const speakerMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.5,
    metalness: 0.35,
  });
  const coneMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    emissive: '#7c3aed',
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.7,
  });

  const woofers: THREE.Mesh[] = [];
  const speakerPositions: ReadonlyArray<[number, number, number]> = [
    [-61.5, 2.92, 8.6],
    [-61.5, 2.92, 17.4],
  ];

  for (const [sx, sy, sz] of speakerPositions) {
    const cab = new THREE.Mesh(cabinetGeo, speakerMat);
    cab.position.set(sx, sy, sz);
    cab.castShadow = true;
    cab.receiveShadow = true;
    group.add(cab);

    const lowCone = new THREE.Mesh(wooferGeo, coneMat);
    lowCone.position.set(sx + 0.44, sy - 0.34, sz);
    group.add(lowCone);
    woofers.push(lowCone);

    const highCone = new THREE.Mesh(wooferGeo, coneMat);
    highCone.scale.setScalar(0.68);
    highCone.position.set(sx + 0.44, sy + 0.4, sz);
    group.add(highCone);
    woofers.push(highCone);
  }

  // ------------------------------------------------------------------
  // 3. Spinning Faceted Disco Ball suspended over dance floor (-56, 5.2, 13)
  // ------------------------------------------------------------------
  const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
  const rodMesh = new THREE.Mesh(rodGeo, platterMat);
  rodMesh.position.set(-56, 5.65, 13);
  group.add(rodMesh);

  const discoBallGeo = new THREE.IcosahedronGeometry(0.48, 1);
  const discoBallMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    emissive: '#38bdf8',
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.95,
    flatShading: true,
  });
  const discoBall = new THREE.Mesh(discoBallGeo, discoBallMat);
  discoBall.position.set(-56, 5.15, 13);
  group.add(discoBall);

  // ------------------------------------------------------------------
  // 4. Lightweight Sweeping Disco Laser Cones (Additive, zero post-process)
  // ------------------------------------------------------------------
  const beamGeo = new THREE.ConeGeometry(0.95, 7.6, 8, 1, true);
  beamGeo.translate(0, -3.8, 0);

  const laserBeams: Array<{ mesh: THREE.Mesh; baseYaw: number; speed: number; phase: number }> = [];
  const beamConfigs: ReadonlyArray<[number, number, number, number, THREE.Material]> = [
    [-60.8, 5.5, 10.5, 0.15, laserMatA],
    [-60.8, 5.5, 15.5, -0.15, laserMatB],
    [-56.0, 5.15, 13.0, 0.0, laserMatA],
  ];

  for (let i = 0; i < beamConfigs.length; i++) {
    const [bx, by, bz, baseYaw, mat] = beamConfigs[i];
    const beam = new THREE.Mesh(beamGeo, mat);
    beam.position.set(bx, by, bz);
    beam.rotation.z = i === 2 ? 0.55 : 0.85;
    group.add(beam);
    laserBeams.push({
      mesh: beam,
      baseYaw,
      speed: 1.4 + i * 0.45,
      phase: i * 2.1,
    });
  }

  // ------------------------------------------------------------------
  // 5. Single Dynamic Colored Club Light (active only when near Dance Club)
  // ------------------------------------------------------------------
  const clubLight = new THREE.PointLight('#e879f9', 4.5, 16, 1.5);
  clubLight.position.set(-56, 4.75, 13);
  group.add(clubLight);

  disposables.push(
    deckMat,
    platterMat,
    neonTrimMat,
    laserMatA,
    laserMatB,
    speakerMat,
    coneMat,
    discoBallMat,
    deckGeo,
    platterGeo,
    mixerBarGeo,
    cabinetGeo,
    wooferGeo,
    rodGeo,
    discoBallGeo,
    beamGeo,
  );

  const colorA = new THREE.Color();
  const colorB = new THREE.Color();

  const update = (
    elapsed: number,
    dt: number,
    musicActive: boolean,
    bpm: number,
    nearClub: boolean,
  ) => {
    group.visible = nearClub;
    if (!nearClub) {
      clubLight.intensity = 0;
      return;
    }

    const beatRate = (bpm / 60) * Math.PI * 2;
    const pulse = musicActive ? 0.5 + 0.5 * Math.sin(elapsed * beatRate) : 0.2;

    // Spin turntables & disco ball
    discoBall.rotation.y += dt * (musicActive ? 1.45 : 0.35);
    leftPlatter.rotation.y += dt * (musicActive ? 3.2 : 0.4);
    rightPlatter.rotation.y -= dt * (musicActive ? 3.2 : 0.4);

    // Pulse speaker woofers to the beat
    const kickScale = 1 + pulse * (musicActive ? 0.16 : 0.02);
    for (let i = 0; i < woofers.length; i++) {
      const baseScale = i % 2 === 0 ? 1 : 0.68;
      woofers[i].scale.setScalar(baseScale * kickScale);
    }

    // Cycle vibrant disco colors smoothly
    const palFloat = elapsed * (musicActive ? 1.35 : 0.35);
    const idxA = Math.floor(palFloat) % DISCO_PALETTE.length;
    const idxB = (idxA + 1) % DISCO_PALETTE.length;
    const mix = palFloat - Math.floor(palFloat);

    colorA.copy(DISCO_PALETTE[idxA]).lerp(DISCO_PALETTE[idxB], mix);
    colorB.copy(DISCO_PALETTE[idxB]).lerp(DISCO_PALETTE[(idxB + 1) % DISCO_PALETTE.length], mix);

    clubLight.color.copy(colorA);
    clubLight.intensity = musicActive ? 4.2 + pulse * 3.4 : 2.2;
    discoBallMat.emissive.copy(colorA);
    discoBallMat.emissiveIntensity = musicActive ? 0.45 + pulse * 0.45 : 0.2;
    coneMat.emissive.copy(colorB);
    coneMat.emissiveIntensity = musicActive ? 0.4 + pulse * 0.7 : 0.15;

    // Sweep laser beams across the dance floor
    laserMatA.color.copy(colorA);
    laserMatB.color.copy(colorB);
    laserMatA.opacity = musicActive ? 0.18 + pulse * 0.14 : 0.08;
    laserMatB.opacity = musicActive ? 0.16 + (1 - pulse) * 0.14 : 0.08;

    for (let i = 0; i < laserBeams.length; i++) {
      const b = laserBeams[i];
      if (i === 2) {
        b.mesh.rotation.y = elapsed * 1.1;
        b.mesh.rotation.z = 0.45 + Math.sin(elapsed * 2.1) * 0.18;
      } else {
        b.mesh.rotation.y = b.baseYaw + Math.sin(elapsed * b.speed + b.phase) * 0.55;
        b.mesh.rotation.z = 0.88 + Math.cos(elapsed * (b.speed * 0.8) + b.phase) * 0.22;
      }
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, update, dispose };
}
