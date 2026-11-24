import * as THREE from 'three';

export interface FurnitureMeshHandle {
  group: THREE.Group;
  setGhostState: (ghost: boolean, valid?: boolean) => void;
  setStateOn: (on: boolean) => void;
  pulseInteract: () => void;
  update: (dt: number) => void;
  dispose: () => void;
}

interface MaterialMeta {
  mat: THREE.MeshStandardMaterial;
  baseColor: number;
  baseEmissive: number;
  baseEmissiveIntensity: number;
  baseTransparent: boolean;
  baseOpacity: number;
  isInteractiveScreen?: boolean;
  isInteractiveLight?: boolean;
}

export function createFurnitureMesh(itemId: string): FurnitureMeshHandle {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const metas: MaterialMeta[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const makeMat = (
    color: number,
    opts?: {
      roughness?: number;
      metalness?: number;
      emissive?: number;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
      isInteractiveScreen?: boolean;
      isInteractiveLight?: boolean;
    },
  ): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts?.roughness ?? 0.62,
      metalness: opts?.metalness ?? 0.08,
      emissive: opts?.emissive ?? 0x000000,
      emissiveIntensity: opts?.emissiveIntensity ?? 0,
      transparent: opts?.transparent ?? false,
      opacity: opts?.opacity ?? 1,
    });
    metas.push({
      mat,
      baseColor: color,
      baseEmissive: opts?.emissive ?? 0x000000,
      baseEmissiveIntensity: opts?.emissiveIntensity ?? 0,
      baseTransparent: opts?.transparent ?? false,
      baseOpacity: opts?.opacity ?? 1,
      isInteractiveScreen: opts?.isInteractiveScreen,
      isInteractiveLight: opts?.isInteractiveLight,
    });
    return mat;
  };

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = group,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addCyl = (
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    segs = 12,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rt, rb, h, segs)), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Shared friendly School Party Craft palette
  const oakMat = makeMat(0xc58b52);
  const darkWoodMat = makeMat(0x85532c);
  const whiteMat = makeMat(0xf8fafc, { roughness: 0.45 });
  const creamMat = makeMat(0xfef3c7, { roughness: 0.65 });
  const charcoalMat = makeMat(0x334155, { roughness: 0.4, metalness: 0.25 });
  const chromeMat = makeMat(0xcbd5e1, { roughness: 0.25, metalness: 0.78 });
  const goldMat = makeMat(0xfacc15, { roughness: 0.28, metalness: 0.72 });
  const glassMat = makeMat(0xbae6fd, {
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.56,
  });

  switch (itemId) {
    // ---------------- CHAIRS ----------------
    case 'chair_oak':
    case 'chair_pink':
    case 'chair_sky':
    case 'chair_mint': {
      const cushionColor =
        itemId === 'chair_pink'
          ? 0xf472b6
          : itemId === 'chair_sky'
            ? 0x38bdf8
            : itemId === 'chair_mint'
              ? 0x34d399
              : 0xd99b5e;
      const legMat = itemId === 'chair_oak' ? darkWoodMat : whiteMat;
      const cushionMat = makeMat(cushionColor, { roughness: 0.72 });
      // 4 legs
      addBox(0.06, 0.42, 0.06, -0.22, 0.21, -0.22, legMat);
      addBox(0.06, 0.42, 0.06, 0.22, 0.21, -0.22, legMat);
      addBox(0.06, 0.42, 0.06, -0.22, 0.21, 0.22, legMat);
      addBox(0.06, 0.42, 0.06, 0.22, 0.21, 0.22, legMat);
      // Seat
      addBox(0.56, 0.08, 0.54, 0, 0.44, 0, cushionMat);
      // Backrest posts & panel
      addBox(0.06, 0.46, 0.06, -0.22, 0.7, -0.23, legMat);
      addBox(0.06, 0.46, 0.06, 0.22, 0.7, -0.23, legMat);
      addBox(0.52, 0.34, 0.07, 0, 0.74, -0.22, cushionMat);
      break;
    }
    case 'swivel_chair': {
      const seatMat = makeMat(0x6366f1, { roughness: 0.55 });
      const stripeMat = makeMat(0x38bdf8, { roughness: 0.45 });
      addCyl(0.04, 0.05, 0.34, 0, 0.2, 0, chromeMat, 10);
      // 5-star wheel base bars
      addBox(0.58, 0.04, 0.05, 0, 0.05, 0, charcoalMat);
      addBox(0.05, 0.04, 0.58, 0, 0.05, 0, charcoalMat);
      addBox(0.56, 0.09, 0.54, 0, 0.42, 0, seatMat);
      addBox(0.05, 0.16, 0.34, -0.27, 0.56, 0.02, charcoalMat);
      addBox(0.05, 0.16, 0.34, 0.27, 0.56, 0.02, charcoalMat);
      addBox(0.5, 0.58, 0.09, 0, 0.75, -0.23, seatMat);
      addBox(0.24, 0.52, 0.1, 0, 0.76, -0.22, stripeMat);
      break;
    }
    case 'beach_lounger': {
      const skyFabricMat = makeMat(0x06b6d4, { roughness: 0.72 });
      const coralPillowMat = makeMat(0xfb7185, { roughness: 0.72 });
      // White frame legs
      addBox(0.07, 0.34, 0.07, -0.32, 0.17, -0.58, whiteMat);
      addBox(0.07, 0.34, 0.07, 0.32, 0.17, -0.58, whiteMat);
      addBox(0.07, 0.34, 0.07, -0.32, 0.17, 0.56, whiteMat);
      addBox(0.07, 0.34, 0.07, 0.32, 0.17, 0.56, whiteMat);
      // Horizontal lounge frame + striped beach cushion facing +Z
      addBox(0.74, 0.08, 1.32, 0, 0.34, 0, whiteMat);
      addBox(0.66, 0.08, 1.24, 0, 0.41, 0.02, skyFabricMat);
      // White center stripe & coral pillow
      addBox(0.22, 0.09, 1.22, 0, 0.415, 0.02, whiteMat);
      // Reclined backrest at -Z facing +Z (ocean)
      const backFrame = addBox(0.72, 0.52, 0.09, 0, 0.63, -0.52, whiteMat);
      backFrame.rotation.x = -0.34;
      const backCushion = addBox(0.64, 0.46, 0.09, 0, 0.64, -0.48, skyFabricMat);
      backCushion.rotation.x = -0.34;
      const pillow = addBox(0.46, 0.16, 0.12, 0, 0.77, -0.45, coralPillowMat);
      pillow.rotation.x = -0.34;
      // Sleek armrests
      addBox(0.07, 0.06, 0.76, -0.34, 0.54, -0.05, whiteMat);
      addBox(0.07, 0.06, 0.76, 0.34, 0.54, -0.05, whiteMat);
      break;
    }

    // ---------------- SOFAS ----------------
    case 'sofa':
    case 'sofa_coral':
    case 'sofa_mint':
    case 'sofa_cream': {
      const fabricColor =
        itemId === 'sofa_coral'
          ? 0xf43f5e
          : itemId === 'sofa_mint'
            ? 0x10b981
            : itemId === 'sofa_cream'
              ? 0xfde68a
              : 0x3b82f6;
      const pillColor =
        itemId === 'sofa_cream' ? 0xf59e0b : 0xfef9c3;
      const fabMat = makeMat(fabricColor, { roughness: 0.76 });
      const pillowMat = makeMat(pillColor, { roughness: 0.72 });
      // Legs
      addBox(0.08, 0.12, 0.08, -0.74, 0.06, -0.32, darkWoodMat);
      addBox(0.08, 0.12, 0.08, 0.74, 0.06, -0.32, darkWoodMat);
      addBox(0.08, 0.12, 0.08, -0.74, 0.06, 0.32, darkWoodMat);
      addBox(0.08, 0.12, 0.08, 0.74, 0.06, 0.32, darkWoodMat);
      // Base frame & cushions
      addBox(1.62, 0.18, 0.76, 0, 0.2, 0, darkWoodMat);
      addBox(0.7, 0.16, 0.68, -0.36, 0.36, 0.03, fabMat);
      addBox(0.7, 0.16, 0.68, 0.36, 0.36, 0.03, fabMat);
      // Armrests
      addBox(0.16, 0.44, 0.78, -0.74, 0.44, 0, fabMat);
      addBox(0.16, 0.44, 0.78, 0.74, 0.44, 0, fabMat);
      // High back + throw pillows
      addBox(1.62, 0.56, 0.18, 0, 0.58, -0.3, fabMat);
      addBox(0.24, 0.24, 0.1, -0.5, 0.54, -0.16, pillowMat);
      addBox(0.24, 0.24, 0.1, 0.5, 0.54, -0.16, pillowMat);
      break;
    }

    // ---------------- BEDS ----------------
    case 'bed':
    case 'bed_coral':
    case 'bed_mint': {
      const quiltColor =
        itemId === 'bed_coral' ? 0xfb7185 : itemId === 'bed_mint' ? 0x34d399 : 0x38bdf8;
      const bedW = itemId === 'bed_mint' ? 1.16 : 1.04;
      const quiltMat = makeMat(quiltColor, { roughness: 0.75 });
      const sheetMat = whiteMat;
      // Frame legs + platform
      addBox(0.1, 0.18, 0.1, -bedW * 0.42, 0.09, -0.8, darkWoodMat);
      addBox(0.1, 0.18, 0.1, bedW * 0.42, 0.09, -0.8, darkWoodMat);
      addBox(0.1, 0.18, 0.1, -bedW * 0.42, 0.09, 0.8, darkWoodMat);
      addBox(0.1, 0.18, 0.1, bedW * 0.42, 0.09, 0.8, darkWoodMat);
      addBox(bedW, 0.16, 1.76, 0, 0.22, 0, oakMat);
      // Headboard & footboard
      addBox(bedW + 0.06, 0.88, 0.1, 0, 0.46, -0.85, darkWoodMat);
      addBox(bedW + 0.04, 0.42, 0.08, 0, 0.25, 0.86, darkWoodMat);
      // Mattress + blanket fold + pillows
      addBox(bedW - 0.08, 0.22, 1.62, 0, 0.41, 0, sheetMat);
      addBox(bedW - 0.06, 0.24, 1.12, 0, 0.43, 0.25, quiltMat);
      addBox(bedW * 0.36, 0.12, 0.3, -bedW * 0.22, 0.56, -0.58, whiteMat);
      addBox(bedW * 0.36, 0.12, 0.3, bedW * 0.22, 0.56, -0.58, whiteMat);
      break;
    }

    // ---------------- TABLES & DINING TABLES ----------------
    case 'table':
    case 'table_white': {
      const topMat = itemId === 'table_white' ? whiteMat : oakMat;
      const legMat = itemId === 'table_white' ? makeMat(0xe2e8f0) : darkWoodMat;
      addBox(0.08, 0.72, 0.08, -0.5, 0.36, -0.34, legMat);
      addBox(0.08, 0.72, 0.08, 0.5, 0.36, -0.34, legMat);
      addBox(0.08, 0.72, 0.08, -0.5, 0.36, 0.34, legMat);
      addBox(0.08, 0.72, 0.08, 0.5, 0.36, 0.34, legMat);
      addBox(1.14, 0.08, 0.8, 0, 0.74, 0, topMat);
      if (itemId === 'table_white') {
        addBox(0.42, 0.14, 0.72, 0.32, 0.63, 0, legMat);
      }
      break;
    }
    case 'table_glass': {
      addBox(0.07, 0.44, 0.07, -0.48, 0.22, -0.32, charcoalMat);
      addBox(0.07, 0.44, 0.07, 0.48, 0.22, -0.32, charcoalMat);
      addBox(0.07, 0.44, 0.07, -0.48, 0.22, 0.32, charcoalMat);
      addBox(0.07, 0.44, 0.07, 0.48, 0.22, 0.32, charcoalMat);
      addBox(1.06, 0.05, 0.74, 0, 0.46, 0, glassMat);
      addBox(0.9, 0.03, 0.58, 0, 0.2, 0, oakMat);
      break;
    }
    case 'dining_table_oak':
    case 'dining_table_white': {
      const topMat = itemId === 'dining_table_white' ? whiteMat : oakMat;
      const legMat = itemId === 'dining_table_white' ? oakMat : darkWoodMat;
      addBox(0.1, 0.74, 0.1, -0.76, 0.37, -0.4, legMat);
      addBox(0.1, 0.74, 0.1, 0.76, 0.37, -0.4, legMat);
      addBox(0.1, 0.74, 0.1, -0.76, 0.37, 0.4, legMat);
      addBox(0.1, 0.74, 0.1, 0.76, 0.37, 0.4, legMat);
      addBox(1.72, 0.09, 0.98, 0, 0.76, 0, topMat);
      // Runner & centerpiece bowl
      const runnerMat = makeMat(itemId === 'dining_table_white' ? 0x38bdf8 : 0xf43f5e);
      addBox(1.5, 0.02, 0.28, 0, 0.815, 0, runnerMat);
      addCyl(0.14, 0.1, 0.09, 0, 0.87, 0, goldMat, 12);
      break;
    }

    // ---------------- WARDROBES & CUPBOARDS ----------------
    case 'wardrobe_oak':
    case 'wardrobe_white': {
      const bodyMat = itemId === 'wardrobe_white' ? whiteMat : oakMat;
      const trimMat = itemId === 'wardrobe_white' ? makeMat(0xe2e8f0) : darkWoodMat;
      addBox(1.2, 1.88, 0.66, 0, 0.94, 0, bodyMat);
      addBox(1.24, 0.08, 0.7, 0, 1.88, 0, trimMat);
      addBox(0.55, 1.66, 0.04, -0.29, 0.95, 0.335, trimMat);
      addBox(0.55, 1.66, 0.04, 0.29, 0.95, 0.335, trimMat);
      if (itemId === 'wardrobe_white') {
        addBox(0.32, 1.15, 0.02, 0.29, 1.05, 0.36, glassMat);
      }
      addBox(0.04, 0.18, 0.05, -0.08, 0.96, 0.37, goldMat);
      addBox(0.04, 0.18, 0.05, 0.08, 0.96, 0.37, goldMat);
      break;
    }
    case 'cupboard_oak':
    case 'cupboard_white':
    case 'cupboard_sky': {
      const bodyMat =
        itemId === 'cupboard_sky'
          ? makeMat(0x7dd3fc)
          : itemId === 'cupboard_white'
            ? whiteMat
            : oakMat;
      const doorMat =
        itemId === 'cupboard_sky'
          ? makeMat(0x38bdf8)
          : itemId === 'cupboard_white'
            ? makeMat(0xe2e8f0)
            : darkWoodMat;
      addBox(0.92, 1.02, 0.62, 0, 0.51, 0, bodyMat);
      addBox(0.96, 0.06, 0.66, 0, 1.02, 0, doorMat);
      addBox(0.4, 0.82, 0.04, -0.22, 0.52, 0.31, doorMat);
      addBox(0.4, 0.82, 0.04, 0.22, 0.52, 0.31, doorMat);
      addBox(0.03, 0.14, 0.04, -0.06, 0.62, 0.34, chromeMat);
      addBox(0.03, 0.14, 0.04, 0.06, 0.62, 0.34, chromeMat);
      break;
    }
    case 'bookshelf': {
      addBox(1.0, 1.62, 0.48, 0, 0.81, -0.02, darkWoodMat);
      const bookCols = [0xf43f5e, 0x38bdf8, 0xfacc15, 0x34d399, 0xa855f7];
      for (let shelf = 0; shelf < 3; shelf++) {
        const sy = 0.26 + shelf * 0.48;
        addBox(0.92, 0.05, 0.46, 0, sy, 0.02, oakMat);
        for (let b = 0; b < 5; b++) {
          const bMat = makeMat(bookCols[(b + shelf * 2) % bookCols.length]);
          addBox(0.14, 0.32, 0.34, -0.34 + b * 0.17, sy + 0.18, 0.06, bMat);
        }
      }
      break;
    }

    // ---------------- TVS & COMPUTERS ----------------
    case 'tv': {
      // Modern TV media console + flat screen
      addBox(1.36, 0.42, 0.54, 0, 0.21, 0, oakMat);
      addBox(0.58, 0.28, 0.04, -0.34, 0.22, 0.28, whiteMat);
      addBox(0.58, 0.28, 0.04, 0.34, 0.22, 0.28, whiteMat);
      addBox(0.14, 0.2, 0.1, 0, 0.5, -0.05, charcoalMat);
      // TV Bezel + Glowing Screen
      addBox(1.26, 0.76, 0.08, 0, 0.9, -0.05, charcoalMat);
      const tvScreenMat = makeMat(0x0ea5e9, {
        emissive: 0x38bdf8,
        emissiveIntensity: 0.9,
        roughness: 0.18,
        isInteractiveScreen: true,
      });
      addBox(1.16, 0.66, 0.03, 0, 0.9, 0.0, tvScreenMat);
      break;
    }
    case 'computer': {
      // Desk + monitor + keyboard + mouse + RGB PC tower
      addBox(1.2, 0.07, 0.68, 0, 0.72, 0, whiteMat);
      addBox(0.06, 0.7, 0.06, -0.54, 0.35, -0.28, charcoalMat);
      addBox(0.06, 0.7, 0.06, 0.54, 0.35, -0.28, charcoalMat);
      addBox(0.06, 0.7, 0.06, -0.54, 0.35, 0.28, charcoalMat);
      addBox(0.06, 0.7, 0.06, 0.54, 0.35, 0.28, charcoalMat);
      // Monitor stand & glowing screen
      addBox(0.12, 0.16, 0.08, -0.1, 0.83, -0.16, charcoalMat);
      addBox(0.68, 0.44, 0.06, -0.1, 1.04, -0.14, charcoalMat);
      const pcScreenMat = makeMat(0x22d3ee, {
        emissive: 0x0284c7,
        emissiveIntensity: 0.95,
        roughness: 0.18,
        isInteractiveScreen: true,
      });
      addBox(0.62, 0.38, 0.02, -0.1, 1.04, -0.1, pcScreenMat);
      // Keyboard & Mouse
      addBox(0.38, 0.03, 0.14, -0.12, 0.77, 0.12, charcoalMat);
      addBox(0.08, 0.03, 0.11, 0.16, 0.77, 0.12, charcoalMat);
      // PC Tower
      addBox(0.22, 0.46, 0.42, 0.42, 0.98, -0.05, charcoalMat);
      const rgbMat = makeMat(0xf472b6, {
        emissive: 0xe879f9,
        emissiveIntensity: 0.8,
        isInteractiveScreen: true,
      });
      addBox(0.04, 0.36, 0.03, 0.42, 0.98, 0.165, rgbMat);
      break;
    }

    // ---------------- REFRIGERATORS & KITCHEN ----------------
    case 'fridge':
    case 'fridge_tall': {
      const h = itemId === 'fridge_tall' ? 1.84 : 1.12;
      const w = itemId === 'fridge_tall' ? 0.88 : 0.78;
      const steelMat = makeMat(0xe2e8f0, { roughness: 0.28, metalness: 0.5 });
      addBox(w, h, 0.76, 0, h / 2, 0, steelMat);
      // Top/bottom split gap line & chrome handles
      addBox(w + 0.02, 0.03, 0.78, 0, h * 0.66, 0, charcoalMat);
      addBox(0.04, h * 0.24, 0.05, -w * 0.34, h * 0.8, 0.4, chromeMat);
      addBox(0.04, h * 0.4, 0.05, -w * 0.34, h * 0.36, 0.4, chromeMat);
      if (itemId === 'fridge_tall') {
        const dispMat = makeMat(0x0ea5e9, { emissive: 0x38bdf8, emissiveIntensity: 0.45 });
        addBox(0.22, 0.32, 0.04, 0.12, 1.05, 0.38, charcoalMat);
        addBox(0.16, 0.08, 0.03, 0.12, 1.16, 0.395, dispMat);
      }
      break;
    }
    case 'counter': {
      addBox(0.96, 0.82, 0.7, 0, 0.41, 0, oakMat);
      addBox(1.0, 0.09, 0.74, 0, 0.86, 0, whiteMat);
      addBox(0.4, 0.32, 0.04, -0.22, 0.26, 0.36, darkWoodMat);
      addBox(0.4, 0.32, 0.04, 0.22, 0.26, 0.36, darkWoodMat);
      addBox(0.84, 0.18, 0.04, 0, 0.64, 0.36, darkWoodMat);
      break;
    }
    case 'stove': {
      const stoveMat = makeMat(0xf1f5f9, { roughness: 0.35, metalness: 0.35 });
      addBox(0.9, 0.88, 0.74, 0, 0.44, 0, stoveMat);
      // Oven glass door
      addBox(0.7, 0.46, 0.04, 0, 0.34, 0.37, charcoalMat);
      addBox(0.56, 0.3, 0.03, 0, 0.35, 0.39, glassMat);
      addBox(0.58, 0.04, 0.06, 0, 0.62, 0.4, chromeMat);
      // 4 glowing burners
      const burnerMat = makeMat(0xf97316, {
        emissive: 0xea580c,
        emissiveIntensity: 0.75,
        isInteractiveLight: true,
      });
      addCyl(0.11, 0.11, 0.03, -0.22, 0.9, -0.16, burnerMat);
      addCyl(0.11, 0.11, 0.03, 0.22, 0.9, -0.16, burnerMat);
      addCyl(0.11, 0.11, 0.03, -0.22, 0.9, 0.16, burnerMat);
      addCyl(0.11, 0.11, 0.03, 0.22, 0.9, 0.16, burnerMat);
      break;
    }
    case 'kitchen_sink': {
      addBox(0.96, 0.82, 0.7, 0, 0.41, 0, oakMat);
      addBox(1.0, 0.08, 0.74, 0, 0.85, 0, whiteMat);
      addBox(0.58, 0.06, 0.46, 0, 0.89, 0.02, chromeMat);
      // Chrome swan-neck faucet
      addBox(0.06, 0.24, 0.06, 0, 1.0, -0.24, chromeMat);
      addBox(0.06, 0.06, 0.18, 0, 1.1, -0.16, chromeMat);
      break;
    }

    // ---------------- BATHROOM ----------------
    case 'bathtub': {
      addBox(1.48, 0.56, 0.82, 0, 0.28, 0, whiteMat);
      const waterMat = makeMat(0x38bdf8, {
        transparent: true,
        opacity: 0.78,
        roughness: 0.12,
      });
      addBox(1.26, 0.06, 0.62, 0, 0.55, 0, waterMat);
      // Rim + faucet
      addBox(1.54, 0.07, 0.88, 0, 0.58, 0, makeMat(0xe2e8f0));
      addBox(0.07, 0.18, 0.07, -0.68, 0.68, 0, chromeMat);
      addBox(0.14, 0.06, 0.06, -0.62, 0.76, 0, chromeMat);
      break;
    }
    case 'toilet': {
      addCyl(0.2, 0.15, 0.36, 0, 0.18, 0.08, whiteMat, 12);
      addBox(0.42, 0.08, 0.48, 0, 0.39, 0.1, whiteMat);
      addBox(0.44, 0.44, 0.24, 0, 0.62, -0.22, whiteMat);
      addBox(0.1, 0.04, 0.06, 0, 0.86, -0.22, chromeMat);
      break;
    }
    case 'bath_sink': {
      addBox(0.84, 0.76, 0.56, 0, 0.38, 0, makeMat(0xbae6fd));
      addBox(0.88, 0.08, 0.6, 0, 0.78, 0, whiteMat);
      addBox(0.06, 0.16, 0.06, 0, 0.88, -0.2, chromeMat);
      // Mirror above vanity
      addBox(0.7, 0.6, 0.04, 0, 1.24, -0.24, whiteMat);
      addBox(0.6, 0.5, 0.02, 0, 1.24, -0.21, glassMat);
      break;
    }

    // ---------------- LAMPS & CARPETS ----------------
    case 'desk_lamp': {
      const shadeMat = makeMat(0xfef08a, {
        emissive: 0xfacc15,
        emissiveIntensity: 0.85,
        roughness: 0.4,
        isInteractiveLight: true,
      });
      addCyl(0.13, 0.16, 0.06, 0, 0.03, 0, darkWoodMat);
      addCyl(0.035, 0.035, 0.28, 0, 0.19, 0, goldMat, 10);
      addCyl(0.12, 0.22, 0.24, 0, 0.44, 0, shadeMat);
      break;
    }
    case 'floor_lamp': {
      const shadeMat = makeMat(0xfef08a, {
        emissive: 0xfacc15,
        emissiveIntensity: 0.85,
        roughness: 0.4,
        isInteractiveLight: true,
      });
      addCyl(0.22, 0.24, 0.06, 0, 0.03, 0, charcoalMat);
      addCyl(0.035, 0.04, 1.28, 0, 0.68, 0, goldMat, 10);
      addCyl(0.16, 0.28, 0.36, 0, 1.48, 0, shadeMat);
      break;
    }
    case 'lamp': {
      const shadeMat = makeMat(0xfde047, {
        emissive: 0xfacc15,
        emissiveIntensity: 0.9,
        isInteractiveLight: true,
      });
      addBox(0.42, 0.42, 0.42, 0, 0.24, 0, shadeMat);
      addBox(0.46, 0.06, 0.46, 0, 0.03, 0, charcoalMat);
      break;
    }
    case 'carpet_blue':
    case 'carpet_coral':
    case 'carpet_mint': {
      const rugColor =
        itemId === 'carpet_coral'
          ? 0xf43f5e
          : itemId === 'carpet_mint'
            ? 0x10b981
            : 0x3b82f6;
      const borderMat = makeMat(0xf8fafc, { roughness: 0.9 });
      const rugMat = makeMat(rugColor, { roughness: 0.9 });
      addBox(2.04, 0.035, 1.5, 0, 0.018, 0, borderMat);
      addBox(1.86, 0.045, 1.32, 0, 0.023, 0, rugMat);
      break;
    }

    // ---------------- DECORATIONS & OTHER HOUSEHOLD ----------------
    case 'plant_pot': {
      const potMat = makeMat(0xc2410c, { roughness: 0.72 });
      const leafMat = makeMat(0x22c55e, { roughness: 0.72 });
      const leafDark = makeMat(0x16a34a, { roughness: 0.72 });
      addCyl(0.2, 0.14, 0.34, 0, 0.17, 0, potMat);
      addCyl(0.04, 0.05, 0.28, 0, 0.44, 0, darkWoodMat, 8);
      addBox(0.36, 0.36, 0.36, 0, 0.68, 0, leafMat);
      addBox(0.46, 0.18, 0.22, 0, 0.64, 0, leafDark);
      addBox(0.22, 0.18, 0.46, 0, 0.64, 0, leafDark);
      break;
    }
    case 'flower_vase': {
      const vaseMat = makeMat(0x38bdf8, { roughness: 0.3 });
      const stemMat = makeMat(0x16a34a);
      const pinkBloom = makeMat(0xf472b6);
      const goldBloom = makeMat(0xfacc15);
      addCyl(0.11, 0.14, 0.26, 0, 0.13, 0, vaseMat);
      addBox(0.03, 0.22, 0.03, -0.04, 0.35, 0, stemMat);
      addBox(0.03, 0.24, 0.03, 0.05, 0.36, 0.03, stemMat);
      addBox(0.13, 0.13, 0.13, -0.05, 0.48, 0, pinkBloom);
      addBox(0.12, 0.12, 0.12, 0.06, 0.5, 0.03, goldBloom);
      break;
    }
    case 'plush_decor': {
      addBox(0.32, 0.14, 0.32, 0, 0.07, 0, darkWoodMat);
      addCyl(0.05, 0.08, 0.18, 0, 0.23, 0, goldMat, 10);
      addBox(0.26, 0.26, 0.12, 0, 0.44, 0, goldMat);
      break;
    }
    case 'gift_box': {
      const boxMat = makeMat(0xe11d48, { roughness: 0.55 });
      addBox(0.46, 0.38, 0.46, 0, 0.19, 0, boxMat);
      addBox(0.5, 0.08, 0.5, 0, 0.38, 0, boxMat);
      addBox(0.52, 0.44, 0.1, 0, 0.22, 0, goldMat);
      addBox(0.1, 0.44, 0.52, 0, 0.22, 0, goldMat);
      break;
    }
    case 'wall_clock': {
      addBox(0.48, 1.72, 0.38, 0, 0.86, 0, darkWoodMat);
      addBox(0.32, 0.72, 0.04, 0, 0.65, 0.19, glassMat);
      addCyl(0.05, 0.05, 0.04, 0, 0.46, 0.17, goldMat);
      addBox(0.34, 0.34, 0.05, 0, 1.38, 0.19, whiteMat);
      addBox(0.03, 0.12, 0.03, 0, 1.42, 0.22, charcoalMat);
      addBox(0.1, 0.03, 0.03, 0.04, 1.38, 0.22, charcoalMat);
      break;
    }
    case 'washer': {
      addBox(0.78, 0.9, 0.74, 0, 0.45, 0, whiteMat);
      addBox(0.74, 0.14, 0.04, 0, 0.8, 0.36, makeMat(0xe2e8f0));
      addCyl(0.22, 0.22, 0.08, 0, 0.42, 0.36, chromeMat, 14);
      const drumMat = makeMat(0x0284c7, { transparent: true, opacity: 0.68 });
      const drumMesh = addCyl(0.16, 0.16, 0.09, 0, 0.42, 0.37, drumMat, 14);
      drumMesh.rotation.x = Math.PI / 2;
      break;
    }
    case 'trash_bin': {
      addCyl(0.19, 0.16, 0.48, 0, 0.24, 0, chromeMat, 14);
      addCyl(0.2, 0.2, 0.06, 0, 0.51, 0, charcoalMat, 14);
      addBox(0.1, 0.03, 0.08, 0, 0.03, 0.2, charcoalMat);
      break;
    }
    case 'door_wood':
    case 'door_white':
    case 'door_mint':
    case 'door_sky':
    case 'door_coral': {
      const doorColor =
        itemId === 'door_white'
          ? 0xf8fafc
          : itemId === 'door_mint'
            ? 0x34d399
            : itemId === 'door_sky'
              ? 0x38bdf8
              : itemId === 'door_coral'
                ? 0xfb7185
                : 0xb45309;
      const dMat = makeMat(doorColor, { roughness: 0.55 });
      const panelMat = makeMat(0x1e293b, { roughness: 0.5 });
      addBox(0.92, 1.88, 0.14, 0, 0.94, 0, panelMat);
      addBox(0.78, 1.76, 0.16, 0, 0.92, 0, dMat);
      addBox(0.5, 0.52, 0.18, 0, 1.38, 0, glassMat);
      addBox(0.05, 0.16, 0.22, 0.28, 0.92, 0, goldMat);
      break;
    }
    default: {
      addBox(0.65, 0.65, 0.65, 0, 0.325, 0, oakMat);
      break;
    }
  }

  let pulseTimer = 0;

  const setGhostState = (ghost: boolean, valid = true) => {
    for (let i = 0; i < metas.length; i++) {
      const m = metas[i];
      if (ghost) {
        m.mat.color.setHex(valid ? 0x10b981 : 0xf43f5e);
        m.mat.emissive.setHex(valid ? 0x059669 : 0xe11d48);
        m.mat.emissiveIntensity = 0.45;
        m.mat.transparent = true;
        m.mat.opacity = 0.58;
      } else {
        m.mat.color.setHex(m.baseColor);
        m.mat.emissive.setHex(m.baseEmissive);
        m.mat.emissiveIntensity = m.baseEmissiveIntensity;
        m.mat.transparent = m.baseTransparent;
        m.mat.opacity = m.baseOpacity;
      }
      m.mat.needsUpdate = true;
    }
  };

  const setStateOn = (on: boolean) => {
    for (let i = 0; i < metas.length; i++) {
      const m = metas[i];
      if (m.isInteractiveScreen) {
        m.mat.color.setHex(on ? m.baseColor : 0x0f172a);
        m.mat.emissiveIntensity = on ? m.baseEmissiveIntensity : 0;
        m.mat.needsUpdate = true;
      } else if (m.isInteractiveLight) {
        m.mat.emissiveIntensity = on ? m.baseEmissiveIntensity : 0;
        m.mat.needsUpdate = true;
      }
    }
  };

  const pulseInteract = () => {
    pulseTimer = 0.28;
  };

  const update = (dt: number) => {
    if (pulseTimer > 0) {
      pulseTimer = Math.max(0, pulseTimer - dt);
      const s = 1 + Math.sin((pulseTimer / 0.28) * Math.PI) * 0.08;
      group.scale.set(s, 1 + (s - 1) * 1.2, s);
    } else if (group.scale.x !== 1 || group.scale.y !== 1 || group.scale.z !== 1) {
      group.scale.set(1, 1, 1);
    }
  };

  const dispose = () => {
    for (const g of geos) g.dispose();
    for (const m of metas) m.mat.dispose();
  };

  return {
    group,
    setGhostState,
    setStateOn,
    pulseInteract,
    update,
    dispose,
  };
}
