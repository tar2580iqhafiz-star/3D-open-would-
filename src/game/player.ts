import * as THREE from 'three';
import { PlaceableBlock, PlayerPoseMode } from './types';
import {
  AccessoryGeometryStyle,
  EMPTY_OUTFIT_LOADOUT,
  EquippedOutfitLoadout,
  getXSuitItemDef,
  HelmetGeometryStyle,
  XSuitItemDef,
} from './xSuits';

function createRadialShadowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(10, 22, 14, 0.52)');
  grad.addColorStop(0.58, 'rgba(10, 22, 14, 0.22)');
  grad.addColorStop(1, 'rgba(10, 22, 14, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BoxFaces {
  right: PixelRect; // +X
  left: PixelRect; // -X
  top: PixelRect; // +Y
  bottom: PixelRect; // -Y
  front: PixelRect; // +Z
  back: PixelRect; // -Z
}

/**
 * Maps pixel-art atlas rectangles onto a Three.js BoxGeometry's 6 faces
 * with a tiny sub-pixel inset to prevent edge bleeding on mobile GPUs.
 */
function applyPixelBoxUVs(
  geometry: THREE.BoxGeometry,
  texW: number,
  texH: number,
  faces: BoxFaces,
): void {
  const uv = geometry.attributes.uv;
  const order: PixelRect[] = [
    faces.right,
    faces.left,
    faces.top,
    faces.bottom,
    faces.front,
    faces.back,
  ];
  const eps = 0.04;

  for (let f = 0; f < 6; f++) {
    const r = order[f];
    const u0 = (r.x + eps) / texW;
    const u1 = (r.x + r.w - eps) / texW;
    const vTop = 1 - (r.y + eps) / texH;
    const vBot = 1 - (r.y + r.h - eps) / texH;

    const base = f * 4;
    uv.setXY(base + 0, u0, vTop);
    uv.setXY(base + 1, u1, vTop);
    uv.setXY(base + 2, u0, vBot);
    uv.setXY(base + 3, u1, vBot);
  }
  uv.needsUpdate = true;
}

export interface CharacterColorStyle {
  skin: string[];
  hair: string[];
  shirt: string[];
  pants: string[];
  boots: string[];
  eyes?: string;
  undershirt?: string;
  belt?: string;
  buckle?: string;
}

export const DEFAULT_PLAYER_STYLE: CharacterColorStyle = {
  skin: ['#ebb892', '#e6b189', '#efbe9a', '#dfa880'],
  hair: ['#3b271d', '#493124', '#2e1e16', '#583c2c'],
  shirt: ['#d86526', '#cc5c20', '#e37130', '#be521a'],
  pants: ['#2b4157', '#25394d', '#314961', '#213345'],
  boots: ['#4b3222', '#3d281b', '#583b28'],
  eyes: '#1d4ed8',
  undershirt: '#f2ece1',
  belt: '#3b2619',
  buckle: '#eab308',
};

export const NPC_CHARACTER_STYLES: CharacterColorStyle[] = [
  // DJ Neon (Purple/Cyan party look)
  {
    skin: ['#e8b38b', '#dfa880', '#efbe9a', '#d79e76'],
    hair: ['#1e1b4b', '#312e81', '#0f172a', '#4338ca'],
    shirt: ['#7c3aed', '#6d28d9', '#8b5cf6', '#5b21b6'],
    pants: ['#1e293b', '#0f172a', '#334155', '#1e293b'],
    boots: ['#06b6d4', '#0891b2', '#22d3ee'],
    eyes: '#22d3ee',
    undershirt: '#22d3ee',
    belt: '#0f172a',
    buckle: '#38bdf8',
  },
  // Coral Party Dancer
  {
    skin: ['#f0c4a0', '#e8b992', '#f5cdb0', '#dfb08a'],
    hair: ['#eab308', '#facc15', '#ca8a04', '#fde047'],
    shirt: ['#ec4899', '#db2777', '#f472b6', '#be185d'],
    pants: ['#312e81', '#3730a3', '#1e1b4b', '#4338ca'],
    boots: ['#f43f5e', '#e11d48', '#fb7185'],
    eyes: '#0284c7',
    undershirt: '#fdf2f8',
    belt: '#831843',
    buckle: '#fde047',
  },
  // Mint Trendy Dancer
  {
    skin: ['#c68b59', '#bd8150', '#d19564', '#b47847'],
    hair: ['#1c1917', '#292524', '#0c0a09', '#44403c'],
    shirt: ['#10b981', '#059669', '#34d399', '#047857'],
    pants: ['#1e293b', '#334155', '#0f172a', '#475569'],
    boots: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    eyes: '#16a34a',
    undershirt: '#ecfdf5',
    belt: '#064e3b',
    buckle: '#34d399',
  },
  // Sky Blue Hoodie
  {
    skin: ['#ebb892', '#e6b189', '#efbe9a', '#dfa880'],
    hair: ['#92400e', '#b45309', '#78350f', '#d97706'],
    shirt: ['#0ea5e9', '#0284c7', '#38bdf8', '#0369a1'],
    pants: ['#334155', '#1e293b', '#475569', '#0f172a'],
    boots: ['#f59e0b', '#d97706', '#fbbf24'],
    eyes: '#2563eb',
    undershirt: '#f0f9ff',
    belt: '#1e293b',
    buckle: '#facc15',
  },
  // Sunshine Tee (Beach/Park)
  {
    skin: ['#8d5524', '#804c1f', '#9a5f2b', '#75441a'],
    hair: ['#18181b', '#27272a', '#09090b', '#3f3f46'],
    shirt: ['#f59e0b', '#d97706', '#fbbf24', '#b45309'],
    pants: ['#0284c7', '#0369a1', '#0ea5e9', '#075985'],
    boots: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    eyes: '#1e293b',
    undershirt: '#fef3c7',
    belt: '#78350f',
    buckle: '#fde047',
  },
  // City Officer / Staff
  {
    skin: ['#e8b38b', '#dfa880', '#efbe9a', '#d79e76'],
    hair: ['#292524', '#3f3f46', '#18181b', '#52525b'],
    shirt: ['#2563eb', '#1d4ed8', '#3b82f6', '#1e40af'],
    pants: ['#1e3a8a', '#172554', '#1e40af', '#0f172a'],
    boots: ['#18181b', '#27272a', '#09090b'],
    eyes: '#1d4ed8',
    undershirt: '#dbeafe',
    belt: '#0f172a',
    buckle: '#facc15',
  },
];

/**
 * Generates a crisp 64x64 Minecraft-layout pixel-art character texture.
 * Extremely lightweight (~16KB VRAM) for smooth mobile performance.
 */
function paintMinecraftSkinCanvas(
  canvas: HTMLCanvasElement,
  style: CharacterColorStyle = DEFAULT_PLAYER_STYLE,
  loadout?: EquippedOutfitLoadout,
): void {
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };

  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const shadeNoise = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    palette: string[],
    seedInit: number,
  ) => {
    let s = seedInit;
    for (let yy = 0; yy < rh; yy++) {
      for (let xx = 0; xx < rw; xx++) {
        s = (s * 16807) % 2147483647;
        const idx = s % palette.length;
        px(rx + xx, ry + yy, palette[idx]);
      }
    }
  };

  const skinPalette = style.skin;
  const hairPalette = style.hair;
  const jacketPalette = style.shirt;
  const pantsPalette = style.pants;
  const bootPalette = style.boots;
  const eyeColor = style.eyes ?? '#1d4ed8';
  const undershirtColor = style.undershirt ?? '#f2ece1';
  const beltColor = style.belt ?? '#3b2619';
  const buckleColor = style.buckle ?? '#eab308';

  // ------------------------------------------------------------------
  // 1. HEAD BASE (8x8x8)
  // ------------------------------------------------------------------
  // Top (8,0,8,8) - Hair crown
  shadeNoise(8, 0, 8, 8, hairPalette, 101);
  // Bottom (16,0,8,8) - Chin shadow
  rect(16, 0, 8, 8, '#cf946a');

  // Sides & Back Hair + Skin
  // Right side of head (-X) at (0,8,8,8)
  shadeNoise(0, 8, 8, 8, skinPalette, 202);
  shadeNoise(0, 8, 8, 3, hairPalette, 203);
  shadeNoise(0, 11, 5, 2, hairPalette, 204);
  px(1, 13, '#3b271d');
  px(2, 13, '#493124');
  px(4, 12, '#d59c74'); // subtle ear shadow

  // Left side of head (+X) at (16,8,8,8)
  shadeNoise(16, 8, 8, 8, skinPalette, 302);
  shadeNoise(16, 8, 8, 3, hairPalette, 303);
  shadeNoise(19, 11, 5, 2, hairPalette, 304);
  px(22, 13, '#3b271d');
  px(21, 13, '#493124');
  px(19, 12, '#d59c74');

  // Back of head (-Z) at (24,8,8,8)
  shadeNoise(24, 8, 8, 8, hairPalette, 404);
  rect(25, 15, 6, 1, '#d59c74'); // nape skin edge
  rect(26, 14, 4, 1, '#2e1e16');

  // Front face (+Z) at (8,8,8,8)
  shadeNoise(8, 8, 8, 8, skinPalette, 505);
  // Forehead hair bangs
  shadeNoise(8, 8, 8, 2, hairPalette, 506);
  px(8, 10, '#3b271d');
  px(9, 10, '#493124');
  px(14, 10, '#493124');
  px(15, 10, '#3b271d');
  // Subtle forehead shadow under bangs
  rect(9, 10, 6, 1, '#dfa880');
  px(9, 10, '#493124');
  px(14, 10, '#493124');
  // Eyebrows (row y=11)
  rect(9, 11, 2, 1, hairPalette[0]);
  rect(13, 11, 2, 1, hairPalette[0]);
  // Crisp Minecraft Eyes (row y=12)
  px(9, 12, '#f8fafc');
  px(10, 12, eyeColor);
  px(13, 12, eyeColor);
  px(14, 12, '#f8fafc');
  // Subtle eye sparkle / lower lid & rosy cheeks (row y=13)
  px(9, 13, '#e4a382');
  px(14, 13, '#e4a382');
  px(11, 13, '#d3966e'); // nose bridge
  px(12, 13, '#d3966e');
  // Warm friendly mouth & chin shading (rows 14-15)
  px(11, 14, '#b57452');
  px(12, 14, '#b57452');
  rect(9, 15, 6, 1, skinPalette[3] ?? skinPalette[0]);

  // ------------------------------------------------------------------
  // 2. 3D HAIR OVERLAY LAYER (alpha-masked at x=32..63, y=0..15)
  // ------------------------------------------------------------------
  // Top (40,0,8,8)
  shadeNoise(40, 0, 8, 8, hairPalette, 601);
  // Front hair bangs (40,8,8,8) — leaves face clear!
  shadeNoise(40, 8, 8, 2, hairPalette, 602);
  px(40, 10, hairPalette[0]);
  px(41, 10, hairPalette[3] ?? hairPalette[0]);
  px(43, 10, hairPalette[1] ?? hairPalette[0]);
  px(47, 10, hairPalette[0]);
  px(46, 10, hairPalette[1] ?? hairPalette[0]);
  // Right side hair overlay (32,8,8,8)
  shadeNoise(32, 8, 8, 3, hairPalette, 603);
  shadeNoise(32, 11, 4, 2, hairPalette, 604);
  px(32, 13, hairPalette[2] ?? hairPalette[0]);
  // Left side hair overlay (48,8,8,8)
  shadeNoise(48, 8, 8, 3, hairPalette, 605);
  shadeNoise(52, 11, 4, 2, hairPalette, 606);
  px(55, 13, hairPalette[2] ?? hairPalette[0]);
  // Back hair overlay (56,8,8,8)
  shadeNoise(56, 8, 8, 6, hairPalette, 607);
  px(57, 14, hairPalette[0]);
  px(59, 14, hairPalette[1] ?? hairPalette[0]);
  px(61, 14, hairPalette[0]);
  px(62, 14, hairPalette[2] ?? hairPalette[0]);

  // ------------------------------------------------------------------
  // 3. TORSO (8x12x4) — Adventurer Jacket, Undershirt, Belt & Strap
  // ------------------------------------------------------------------
  // Top (20,16,8,4)
  shadeNoise(20, 16, 8, 4, jacketPalette, 701);
  rect(22, 16, 4, 2, pantsPalette[0]); // collar back
  // Bottom (28,16,8,4)
  rect(28, 16, 8, 4, pantsPalette[1] ?? pantsPalette[0]);

  // Front Torso (20,20,8,12)
  shadeNoise(20, 20, 8, 12, jacketPalette, 702);
  // Crisp collar & undershirt V-neck
  rect(22, 20, 4, 2, undershirtColor);
  rect(23, 22, 2, 3, undershirtColor);
  px(21, 20, pantsPalette[0]);
  px(26, 20, pantsPalette[0]);
  px(22, 21, pantsPalette[0]);
  px(25, 21, pantsPalette[0]);
  // Diagonal leather satchel strap across chest
  px(20, 20, '#5a3a26');
  px(21, 21, '#5a3a26');
  px(22, 22, '#6b4730');
  px(23, 23, '#5a3a26');
  px(24, 24, '#5a3a26');
  px(25, 25, '#6b4730');
  px(26, 26, '#5a3a26');
  px(27, 27, '#5a3a26');
  // Jacket chest pocket & vertical center trim
  rect(25, 23, 2, 2, jacketPalette[3] ?? jacketPalette[1]);
  rect(20, 29, 8, 1, jacketPalette[3] ?? jacketPalette[1]);
  // Dark belt + buckle (row y=30..31)
  rect(20, 30, 8, 2, beltColor);
  rect(23, 30, 2, 2, buckleColor);

  // Back Torso (32,20,8,12)
  shadeNoise(32, 20, 8, 12, jacketPalette, 703);
  rect(33, 20, 6, 1, '#2a3d52'); // back collar
  rect(33, 22, 6, 1, '#b84c18'); // shoulder yoke seam
  // Strap continuing on back
  px(39, 20, '#5a3a26');
  px(38, 21, '#5a3a26');
  px(37, 22, '#6b4730');
  px(36, 23, '#5a3a26');
  px(35, 24, '#5a3a26');
  px(34, 25, '#6b4730');
  px(33, 26, '#5a3a26');
  px(32, 27, '#5a3a26');
  rect(32, 30, 8, 2, '#3b2619'); // back belt

  // Torso Sides (16,20,4,12) & (28,20,4,12)
  shadeNoise(16, 20, 4, 12, jacketPalette, 704);
  rect(16, 30, 4, 2, '#3b2619');
  shadeNoise(28, 20, 4, 12, jacketPalette, 705);
  rect(28, 30, 4, 2, '#3b2619');

  // ------------------------------------------------------------------
  // 4. ARMS (4x12x4) — Rolled Jacket Sleeves, Cuffs & Shaded Hands
  // ------------------------------------------------------------------
  // Top (44,16,4,4)
  shadeNoise(44, 16, 4, 4, jacketPalette, 801);
  // Bottom (48,16,4,4) — palm
  rect(48, 16, 4, 4, '#d99e75');

  const armFacesX = [40, 44, 48, 52];
  for (let i = 0; i < armFacesX.length; i++) {
    const ax = armFacesX[i];
    // Upper sleeve (5px)
    shadeNoise(ax, 20, 4, 5, jacketPalette, 810 + i);
    // Rolled shirt/cuff band (1px)
    rect(ax, 25, 4, 1, '#e8e0d2');
    // Forearm & hand skin (6px)
    shadeNoise(ax, 26, 4, 6, skinPalette, 820 + i);
    // Finger/knuckle shading at wrist/bottom
    rect(ax, 31, 4, 1, '#d3966e');
  }

  // ------------------------------------------------------------------
  // 5. LEGS (4x12x4) — Cargo Trousers & Rugged Leather Hiking Boots
  // ------------------------------------------------------------------
  // Top (4,16,4,4)
  rect(4, 16, 4, 4, '#25394d');
  // Bottom (8,16,4,4) — dark boot sole
  rect(8, 16, 4, 4, '#1b1d22');

  const legFacesX = [0, 4, 8, 12];
  for (let i = 0; i < legFacesX.length; i++) {
    const lx = legFacesX[i];
    // Trousers (8px)
    shadeNoise(lx, 20, 4, 8, pantsPalette, 910 + i);
    // Subtle knee highlight/pocket detail on front & sides
    if (i === 1) {
      rect(lx + 1, 23, 2, 1, '#3a5670');
    }
    // Boot cuff & leather upper (3px)
    shadeNoise(lx, 28, 4, 3, bootPalette, 920 + i);
    px(lx + 1, 28, '#6c4932'); // lace / tongue accent
    // Boot sole (1px)
    rect(lx, 31, 4, 1, '#1b1d22');
  }

  const suitDef = loadout?.suitId ? getXSuitItemDef(loadout.suitId) : undefined;
  const bootsDef = loadout?.bootsId ? getXSuitItemDef(loadout.bootsId) : undefined;

  if (suitDef) {
    // Paint armored futuristic X-Suit torso + gauntlets + armored leg plates
    const p1 = suitDef.primaryHex;
    const p2 = suitDef.secondaryHex;
    const acc = suitDef.accentHex;
    const glow = suitDef.glowHex;

    // Torso top/bottom
    rect(20, 16, 8, 4, p2);
    rect(28, 16, 8, 4, p2);

    // Front torso (20,20,8,12)
    rect(20, 20, 8, 12, p1);
    rect(20, 20, 8, 2, p2); // collar shoulder yoke
    rect(21, 22, 6, 6, p2); // chest armor plate
    // Glowing chest seam & core highlight
    rect(23, 23, 2, 3, glow);
    px(22, 24, acc);
    px(25, 24, acc);
    rect(20, 29, 8, 1, acc); // trim line
    rect(20, 30, 8, 2, p2); // belt
    rect(23, 30, 2, 2, glow); // belt buckle core

    // Back torso (32,20,8,12)
    rect(32, 20, 8, 12, p1);
    rect(33, 22, 6, 7, p2);
    rect(35, 23, 2, 5, glow); // spine power conduit
    rect(32, 30, 8, 2, p2);

    // Torso sides
    rect(16, 20, 4, 12, p2);
    rect(17, 23, 2, 5, acc);
    rect(28, 20, 4, 12, p2);
    rect(29, 23, 2, 5, acc);

    // Arms (gauntlets + armored pauldrons)
    rect(44, 16, 4, 4, p1);
    rect(48, 16, 4, 4, p2);
    const armFacesX = [40, 44, 48, 52];
    for (let i = 0; i < armFacesX.length; i++) {
      const ax = armFacesX[i];
      rect(ax, 20, 4, 4, p1);
      rect(ax, 24, 4, 1, acc);
      rect(ax, 25, 4, 5, p2); // cyber bracer
      px(ax + 1, 27, glow);
      px(ax + 2, 27, glow);
      rect(ax, 30, 4, 2, p1); // armored glove
    }

    // Armored legs
    rect(4, 16, 4, 4, p2);
    rect(8, 16, 4, 4, '#090d16');
    const legFacesX = [0, 4, 8, 12];
    for (let i = 0; i < legFacesX.length; i++) {
      const lx = legFacesX[i];
      rect(lx, 20, 4, 8, p2);
      rect(lx + 1, 21, 2, 5, p1);
      px(lx + 1, 23, glow); // knee energy node
    }
  }

  // Paint Cyber Boots (standalone boots slot overrides suit boots, else suit paints matching boots)
  const effectiveBoots = bootsDef ?? suitDef;
  if (effectiveBoots) {
    const bp1 = effectiveBoots.primaryHex;
    const bp2 = effectiveBoots.secondaryHex;
    const bglow = effectiveBoots.glowHex;
    const bacc = effectiveBoots.accentHex;
    rect(8, 16, 4, 4, '#090d16');
    const legFacesX = [0, 4, 8, 12];
    for (let i = 0; i < legFacesX.length; i++) {
      const lx = legFacesX[i];
      rect(lx, 27, 4, 1, bacc); // glowing cuff band
      rect(lx, 28, 4, 3, bp1); // armored boot upper
      px(lx + 1, 29, bglow);
      px(lx + 2, 29, bp2);
      rect(lx, 31, 4, 1, bglow); // glowing hover sole rim
    }
  }
}

function createMinecraftSkinTexture(
  style: CharacterColorStyle = DEFAULT_PLAYER_STYLE,
  loadout?: EquippedOutfitLoadout,
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  paintMinecraftSkinCanvas(canvas, style, loadout);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { canvas, texture: tex };
}

function createHeldBlockGeometries(blockSize: number): Record<PlaceableBlock, THREE.BoxGeometry> {
  // Exact 16x16 pixel rects in the 128x128 terrain block atlas
  const GRASS_TOP: PixelRect = { x: 0, y: 0, w: 16, h: 16 };
  const GRASS_SIDE: PixelRect = { x: 16, y: 0, w: 16, h: 16 };
  const DIRT_TILE: PixelRect = { x: 32, y: 0, w: 16, h: 16 };
  const STONE_TILE: PixelRect = { x: 48, y: 0, w: 16, h: 16 };

  const grassGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
  applyPixelBoxUVs(grassGeo, 128, 128, {
    right: GRASS_SIDE,
    left: GRASS_SIDE,
    top: GRASS_TOP,
    bottom: DIRT_TILE,
    front: GRASS_SIDE,
    back: GRASS_SIDE,
  });

  const dirtGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
  applyPixelBoxUVs(dirtGeo, 128, 128, {
    right: DIRT_TILE,
    left: DIRT_TILE,
    top: DIRT_TILE,
    bottom: DIRT_TILE,
    front: DIRT_TILE,
    back: DIRT_TILE,
  });

  const stoneGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
  applyPixelBoxUVs(stoneGeo, 128, 128, {
    right: STONE_TILE,
    left: STONE_TILE,
    top: STONE_TILE,
    bottom: STONE_TILE,
    front: STONE_TILE,
    back: STONE_TILE,
  });

  return {
    grass: grassGeo,
    dirt: dirtGeo,
    stone: stoneGeo,
  };
}

export interface PlayerRig {
  root: THREE.Group;
  visualRoot: THREE.Group;
  contactShadow: THREE.Mesh;
  setHeldBlock: (block: PlaceableBlock) => void;
  setOutfitLoadout: (loadout: EquippedOutfitLoadout) => void;
  triggerArmSwing: () => void;
  updateAnimation: (
    dt: number,
    horizontalSpeed: number,
    maxRunSpeed: number,
    grounded: boolean,
    verticalVel: number,
    isDancing?: boolean,
    dancePhaseOffset?: number,
    poseMode?: PlayerPoseMode,
  ) => void;
  setShowHeldBlock: (visible: boolean) => void;
  dispose: () => void;
}

export interface CreateCharacterRigOptions {
  style?: CharacterColorStyle;
  showHeldBlock?: boolean;
  castShadow?: boolean;
  initialOutfit?: EquippedOutfitLoadout;
}

/**
 * Builds a polished, ultra-low-poly Minecraft-style blocky 3D human character.
 * Classic 32-pixel proportions (1 px = 0.056m => 1.79m tall), pivoted at bottom-center (y = 0).
 */
export function createPlayerRig(
  atlasTex: THREE.CanvasTexture,
  options?: CreateCharacterRigOptions,
): PlayerRig {
  const style = options?.style ?? DEFAULT_PLAYER_STYLE;
  const showHeldBlock = options?.showHeldBlock ?? true;
  const castShadows = options?.castShadow ?? true;

  const root = new THREE.Group();
  const visualRoot = new THREE.Group();
  visualRoot.rotation.order = 'YXZ';
  root.add(visualRoot);

  const disposables: Array<{ dispose: () => void }> = [];

  // 1 pixel unit = 0.056m (8px head = 0.448m, 12px torso = 0.672m, 12px legs = 0.672m)
  const PX = 0.056;
  const HEAD_SIZE = 8 * PX;
  const HAIR_LAYER_SIZE = 8.48 * PX;
  const TORSO_W = 8 * PX;
  const TORSO_H = 12 * PX;
  const TORSO_D = 4 * PX;
  const LIMB_W = 4 * PX;
  const LIMB_H = 12 * PX;
  const LIMB_D = 4 * PX;

  const skinPack = createMinecraftSkinTexture(style, options?.initialOutfit);
  const skinCanvas = skinPack.canvas;
  const skinTex = skinPack.texture;
  const bodyMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const hairOverlayMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    alphaTest: 0.5,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.02,
  });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: style.buckle ?? '#eab308',
    roughness: 0.28,
    metalness: 0.84,
  });
  const bootTrimMat = new THREE.MeshStandardMaterial({
    color: style.boots[0] ?? '#3c271a',
    roughness: 0.52,
    metalness: 0.06,
  });

  // Geometries (total < 190 triangles for ultra-smooth Android performance)
  const headGeo = new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE);
  headGeo.translate(0, HEAD_SIZE / 2, 0);
  applyPixelBoxUVs(headGeo, 64, 64, {
    right: { x: 16, y: 8, w: 8, h: 8 },
    left: { x: 0, y: 8, w: 8, h: 8 },
    top: { x: 8, y: 0, w: 8, h: 8 },
    bottom: { x: 16, y: 0, w: 8, h: 8 },
    front: { x: 8, y: 8, w: 8, h: 8 },
    back: { x: 24, y: 8, w: 8, h: 8 },
  });

  const hairOverlayGeo = new THREE.BoxGeometry(
    HAIR_LAYER_SIZE,
    HAIR_LAYER_SIZE,
    HAIR_LAYER_SIZE,
  );
  hairOverlayGeo.translate(0, HEAD_SIZE / 2, 0);
  applyPixelBoxUVs(hairOverlayGeo, 64, 64, {
    right: { x: 48, y: 8, w: 8, h: 8 },
    left: { x: 32, y: 8, w: 8, h: 8 },
    top: { x: 40, y: 0, w: 8, h: 8 },
    bottom: { x: 48, y: 0, w: 8, h: 8 },
    front: { x: 40, y: 8, w: 8, h: 8 },
    back: { x: 56, y: 8, w: 8, h: 8 },
  });

  const torsoGeo = new THREE.BoxGeometry(TORSO_W, TORSO_H, TORSO_D);
  torsoGeo.translate(0, TORSO_H / 2, 0);
  applyPixelBoxUVs(torsoGeo, 64, 64, {
    right: { x: 28, y: 20, w: 4, h: 12 },
    left: { x: 16, y: 20, w: 4, h: 12 },
    top: { x: 20, y: 16, w: 8, h: 4 },
    bottom: { x: 28, y: 16, w: 8, h: 4 },
    front: { x: 20, y: 20, w: 8, h: 12 },
    back: { x: 32, y: 20, w: 8, h: 12 },
  });

  const armGeo = new THREE.BoxGeometry(LIMB_W, LIMB_H, LIMB_D);
  armGeo.translate(0, -LIMB_H / 2 + 1.5 * PX, 0);
  applyPixelBoxUVs(armGeo, 64, 64, {
    right: { x: 48, y: 20, w: 4, h: 12 },
    left: { x: 40, y: 20, w: 4, h: 12 },
    top: { x: 44, y: 16, w: 4, h: 4 },
    bottom: { x: 48, y: 16, w: 4, h: 4 },
    front: { x: 44, y: 20, w: 4, h: 12 },
    back: { x: 52, y: 20, w: 4, h: 12 },
  });

  const legGeo = new THREE.BoxGeometry(LIMB_W, LIMB_H, LIMB_D);
  legGeo.translate(0, -LIMB_H / 2, 0);
  applyPixelBoxUVs(legGeo, 64, 64, {
    right: { x: 8, y: 20, w: 4, h: 12 },
    left: { x: 0, y: 20, w: 4, h: 12 },
    top: { x: 4, y: 16, w: 4, h: 4 },
    bottom: { x: 8, y: 16, w: 4, h: 4 },
    front: { x: 4, y: 20, w: 4, h: 12 },
    back: { x: 12, y: 20, w: 4, h: 12 },
  });

  // Subtle 3D blocky clothing accents (buckle & boot cuff trim)
  const buckleGeo = new THREE.BoxGeometry(2.2 * PX, 1.8 * PX, 0.45 * PX);
  const bootTrimGeo = new THREE.BoxGeometry(4.35 * PX, 1.3 * PX, 4.35 * PX);

  // Held block resources (shares world atlasTex — zero extra textures!)
  const heldBlockMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    roughness: 0.88,
    metalness: 0.02,
  });
  const heldBlockGeos = createHeldBlockGeometries(4.5 * PX);

  const shadowTex = createRadialShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1.05, 1.05);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.68,
  });

  disposables.push(
    skinTex,
    bodyMat,
    hairOverlayMat,
    buckleMat,
    bootTrimMat,
    heldBlockMat,
    heldBlockGeos.grass,
    heldBlockGeos.dirt,
    heldBlockGeos.stone,
    headGeo,
    hairOverlayGeo,
    torsoGeo,
    armGeo,
    legGeo,
    buckleGeo,
    bootTrimGeo,
    shadowTex,
    shadowGeo,
    shadowMat,
  );

  // Contact shadow disc grounded just above terrain
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  root.add(contactShadow);

  // Body root pivot at hip height (y = 12px = 0.672m)
  const hipsPivot = new THREE.Group();
  hipsPivot.position.y = LIMB_H;
  visualRoot.add(hipsPivot);

  // Torso pivot
  const torsoPivot = new THREE.Group();
  hipsPivot.add(torsoPivot);

  const torsoMesh = new THREE.Mesh(torsoGeo, bodyMat);
  torsoMesh.castShadow = castShadows;
  torsoMesh.receiveShadow = true;
  torsoPivot.add(torsoMesh);

  // Raised metallic belt buckle on torso front
  const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
  buckleMesh.position.set(0, 1.1 * PX, TORSO_D / 2 + 0.12 * PX);
  torsoPivot.add(buckleMesh);

  // Head pivot at top of torso (neck)
  const headPivot = new THREE.Group();
  headPivot.position.y = TORSO_H;
  torsoPivot.add(headPivot);

  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.castShadow = castShadows;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  const hairOverlayMesh = new THREE.Mesh(hairOverlayGeo, hairOverlayMat);
  hairOverlayMesh.castShadow = false;
  hairOverlayMesh.receiveShadow = true;
  headPivot.add(hairOverlayMesh);

  // Left & Right Arms pivoted at shoulder joints
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-TORSO_W / 2 - LIMB_W / 2 - 0.08 * PX, TORSO_H - 1.5 * PX, 0);
  torsoPivot.add(leftArmPivot);
  const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
  leftArmMesh.castShadow = castShadows;
  leftArmMesh.receiveShadow = true;
  leftArmPivot.add(leftArmMesh);

  // Visible held block attached to the player's right hand (optional for NPCs)
  const heldBlockBasePos = new THREE.Vector3(-0.75 * PX, -LIMB_H + 1.9 * PX, 2.6 * PX);
  const heldBlockBaseRot = new THREE.Euler(0.24, -0.56, 0.12);

  const heldBlockPivot = new THREE.Group();
  heldBlockPivot.position.copy(heldBlockBasePos);
  heldBlockPivot.rotation.copy(heldBlockBaseRot);
  heldBlockPivot.visible = showHeldBlock;
  leftArmPivot.add(heldBlockPivot);

  const heldBlockMesh = new THREE.Mesh(heldBlockGeos.grass, heldBlockMat);
  heldBlockMesh.castShadow = false;
  heldBlockMesh.receiveShadow = true;
  heldBlockPivot.add(heldBlockMesh);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(TORSO_W / 2 + LIMB_W / 2 + 0.08 * PX, TORSO_H - 1.5 * PX, 0);
  torsoPivot.add(rightArmPivot);
  const rightArmMesh = new THREE.Mesh(armGeo, bodyMat);
  rightArmMesh.castShadow = castShadows;
  rightArmMesh.receiveShadow = true;
  rightArmPivot.add(rightArmMesh);

  // Left & Right Legs pivoted at hip joints
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-LIMB_W / 2, 0, 0);
  hipsPivot.add(leftLegPivot);
  const leftLegMesh = new THREE.Mesh(legGeo, bodyMat);
  leftLegMesh.castShadow = castShadows;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);
  const leftBootTrim = new THREE.Mesh(bootTrimGeo, bootTrimMat);
  leftBootTrim.position.y = -LIMB_H + 2.8 * PX;
  leftBootTrim.castShadow = castShadows;
  leftLegPivot.add(leftBootTrim);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(LIMB_W / 2, 0, 0);
  hipsPivot.add(rightLegPivot);
  const rightLegMesh = new THREE.Mesh(legGeo, bodyMat);
  rightLegMesh.castShadow = castShadows;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);
  const rightBootTrim = new THREE.Mesh(bootTrimGeo, bootTrimMat);
  rightBootTrim.position.y = -LIMB_H + 2.8 * PX;
  rightBootTrim.castShadow = castShadows;
  rightLegPivot.add(rightBootTrim);

  // ------------------------------------------------------------------
  // EXCLUSIVE X-SUIT 3D ARMOR, HELMET, BOOTS & WINGS MOUNT GROUPS
  // ------------------------------------------------------------------
  const outfitHeadGroup = new THREE.Group();
  headPivot.add(outfitHeadGroup);
  const outfitTorsoGroup = new THREE.Group();
  torsoPivot.add(outfitTorsoGroup);
  const outfitLeftArmGroup = new THREE.Group();
  leftArmPivot.add(outfitLeftArmGroup);
  const outfitRightArmGroup = new THREE.Group();
  rightArmPivot.add(outfitRightArmGroup);
  const outfitLeftLegGroup = new THREE.Group();
  leftLegPivot.add(outfitLeftLegGroup);
  const outfitRightLegGroup = new THREE.Group();
  rightLegPivot.add(outfitRightLegGroup);

  const outfitUnitBox = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(outfitUnitBox);
  let outfitDisposables: Array<{ dispose: () => void }> = [];
  let wingLeftPivot: THREE.Group | null = null;
  let wingRightPivot: THREE.Group | null = null;
  let haloPivot: THREE.Group | null = null;

  const clearOutfitAttachments = () => {
    outfitHeadGroup.clear();
    outfitTorsoGroup.clear();
    outfitLeftArmGroup.clear();
    outfitRightArmGroup.clear();
    outfitLeftLegGroup.clear();
    outfitRightLegGroup.clear();
    wingLeftPivot = null;
    wingRightPivot = null;
    haloPivot = null;
    for (let i = 0; i < outfitDisposables.length; i++) {
      outfitDisposables[i].dispose();
    }
    outfitDisposables = [];
  };

  const applyOutfitLoadout = (loadout: EquippedOutfitLoadout) => {
    clearOutfitAttachments();
    paintMinecraftSkinCanvas(skinCanvas, style, loadout);
    skinTex.needsUpdate = true;

    const suitDef = loadout.suitId ? getXSuitItemDef(loadout.suitId) : undefined;
    const helmetDef = loadout.helmetId ? getXSuitItemDef(loadout.helmetId) : undefined;
    const bootsDef = loadout.bootsId ? getXSuitItemDef(loadout.bootsId) : undefined;
    const accessoryDef = loadout.accessoryId ? getXSuitItemDef(loadout.accessoryId) : undefined;

    const activeHelmetDef =
      helmetDef ?? (suitDef?.helmetStyle ? suitDef : undefined);
    const activeAccessoryDef =
      accessoryDef ?? (suitDef?.accessoryStyle ? suitDef : undefined);
    const activeBootsDef = bootsDef ?? suitDef;

    // Hide classic hair overlay when wearing a 3D cyber helmet so no hair pokes through
    hairOverlayMesh.visible = !activeHelmetDef;

    // Update buckle & boot trim materials to harmonize with equipped suit/boots
    if (suitDef) {
      buckleMat.color.set(suitDef.glowHex);
      buckleMat.emissive.set(suitDef.glowHex);
      buckleMat.emissiveIntensity = 0.65;
    } else {
      buckleMat.color.set(style.buckle ?? '#eab308');
      buckleMat.emissive.set('#000000');
      buckleMat.emissiveIntensity = 0;
    }

    if (activeBootsDef) {
      bootTrimMat.color.set(activeBootsDef.accentHex);
      bootTrimMat.emissive.set(activeBootsDef.glowHex);
      bootTrimMat.emissiveIntensity = 0.42;
    } else {
      bootTrimMat.color.set(style.boots[0] ?? '#3c271a');
      bootTrimMat.emissive.set('#000000');
      bootTrimMat.emissiveIntensity = 0;
    }

    const outfitMatCache = new Map<string, THREE.MeshStandardMaterial>();
    const makeMat = (
      hex: string,
      emissiveHex?: string,
      emissiveIntensity = 0,
      metalness = 0.45,
      roughness = 0.34,
      transparent = false,
      opacity = 1,
    ) => {
      const key = `${hex}|${emissiveHex ?? ''}|${emissiveIntensity}|${metalness}|${roughness}|${opacity}`;
      const existing = outfitMatCache.get(key);
      if (existing) return existing;
      const mat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: emissiveHex ?? '#000000',
        emissiveIntensity,
        metalness,
        roughness,
        transparent,
        opacity,
      });
      outfitMatCache.set(key, mat);
      outfitDisposables.push(mat);
      return mat;
    };

    const addBox = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.MeshStandardMaterial,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const m = new THREE.Mesh(outfitUnitBox, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      parent.add(m);
      return m;
    };

    // 1. Chest Armor Core & Shoulder Pauldrons
    if (suitDef) {
      const armorMat = makeMat(suitDef.secondaryHex, undefined, 0, 0.55, 0.32);
      const plateMat = makeMat(suitDef.primaryHex, undefined, 0, 0.48, 0.36);
      const coreGlowMat = makeMat(suitDef.glowHex, suitDef.glowHex, 1.35, 0.25, 0.18);
      const trimMat = makeMat(suitDef.accentHex, suitDef.accentHex, 0.4, 0.65, 0.24);

      // Front Chest Reactor Frame & Core
      addBox(
        outfitTorsoGroup,
        4.8 * PX,
        4.4 * PX,
        0.55 * PX,
        0,
        TORSO_H * 0.64,
        TORSO_D * 0.5 + 0.24 * PX,
        armorMat,
      );
      addBox(
        outfitTorsoGroup,
        2.1 * PX,
        2.1 * PX,
        0.72 * PX,
        0,
        TORSO_H * 0.64,
        TORSO_D * 0.5 + 0.35 * PX,
        coreGlowMat,
        0,
        0,
        suitDef.chestCoreShape === 'diamond' ? Math.PI / 4 : 0,
      );
      // Spine conduit bar
      addBox(
        outfitTorsoGroup,
        1.6 * PX,
        6.8 * PX,
        0.48 * PX,
        0,
        TORSO_H * 0.56,
        -TORSO_D * 0.5 - 0.22 * PX,
        coreGlowMat,
      );

      // Pauldrons on Shoulders
      if (suitDef.hasShoulderPads) {
        for (const [armGrp, sign] of [
          [outfitLeftArmGroup, -1],
          [outfitRightArmGroup, 1],
        ] as const) {
          addBox(
            armGrp,
            LIMB_W + 1.15 * PX,
            3.0 * PX,
            LIMB_D + 1.0 * PX,
            sign * 0.25 * PX,
            0.35 * PX,
            0,
            plateMat,
            0,
            0,
            sign * -0.14,
          );
          addBox(
            armGrp,
            LIMB_W + 1.3 * PX,
            0.65 * PX,
            LIMB_D + 1.12 * PX,
            sign * 0.25 * PX,
            1.65 * PX,
            0,
            trimMat,
            0,
            0,
            sign * -0.14,
          );
        }
      }
    }

    // 2. 3D Cyber Helmet / Crown / Horns
    if (activeHelmetDef) {
      const hStyle: HelmetGeometryStyle = activeHelmetDef.helmetStyle ?? 'visor';
      const hMainMat = makeMat(activeHelmetDef.primaryHex, undefined, 0, 0.55, 0.28);
      const hSecMat = makeMat(activeHelmetDef.secondaryHex, undefined, 0, 0.62, 0.28);
      const hGlowMat = makeMat(activeHelmetDef.glowHex, activeHelmetDef.glowHex, 1.3, 0.2, 0.15);
      const hVisorMat = makeMat(
        activeHelmetDef.visorHex,
        activeHelmetDef.visorHex,
        1.1,
        0.2,
        0.1,
        true,
        0.86,
      );
      const hAccMat = makeMat(activeHelmetDef.accentHex, activeHelmetDef.accentHex, 0.45, 0.72, 0.22);

      // Top & side exo-shell framing head cleanly without obscuring identity
      addBox(outfitHeadGroup, HEAD_SIZE + 0.9 * PX, 2.8 * PX, HEAD_SIZE + 0.9 * PX, 0, HEAD_SIZE - 0.8 * PX, 0, hMainMat);
      addBox(outfitHeadGroup, HEAD_SIZE + 0.92 * PX, 6.2 * PX, 1.4 * PX, 0, HEAD_SIZE * 0.42, -HEAD_SIZE * 0.44, hSecMat);
      for (const sx of [-1, 1]) {
        addBox(outfitHeadGroup, 0.9 * PX, 5.2 * PX, HEAD_SIZE + 0.4 * PX, sx * (HEAD_SIZE * 0.5 + 0.2 * PX), HEAD_SIZE * 0.45, -0.2 * PX, hSecMat);
        // Ear sensor pod
        addBox(outfitHeadGroup, 0.7 * PX, 2.0 * PX, 2.0 * PX, sx * (HEAD_SIZE * 0.5 + 0.72 * PX), HEAD_SIZE * 0.48, 0, hGlowMat);
      }
      // Illuminated Front Cyber Visor
      addBox(outfitHeadGroup, HEAD_SIZE + 0.55 * PX, 2.15 * PX, 0.85 * PX, 0, HEAD_SIZE * 0.53, HEAD_SIZE * 0.5 + 0.25 * PX, hVisorMat);

      if (hStyle === 'valkyrie') {
        for (const sx of [-1, 1]) {
          addBox(outfitHeadGroup, 0.55 * PX, 3.8 * PX, 2.2 * PX, sx * (HEAD_SIZE * 0.5 + 0.95 * PX), HEAD_SIZE * 0.82, -0.8 * PX, hGlowMat, -0.35, 0, sx * -0.25);
          addBox(outfitHeadGroup, 0.45 * PX, 2.6 * PX, 1.5 * PX, sx * (HEAD_SIZE * 0.5 + 1.25 * PX), HEAD_SIZE * 1.05, -1.3 * PX, hAccMat, -0.45, 0, sx * -0.32);
        }
      } else if (hStyle === 'wyrm') {
        addBox(outfitHeadGroup, 1.4 * PX, 1.6 * PX, 7.6 * PX, 0, HEAD_SIZE + 0.75 * PX, -0.4 * PX, hAccMat);
        for (const sx of [-1, 1]) {
          addBox(outfitHeadGroup, 1.0 * PX, 4.4 * PX, 1.1 * PX, sx * 3.8 * PX, HEAD_SIZE + 1.45 * PX, -0.5 * PX, hGlowMat, -0.48, 0, sx * -0.38);
        }
      } else if (hStyle === 'pharaoh_crown') {
        addBox(outfitHeadGroup, 6.2 * PX, 3.0 * PX, 1.4 * PX, 0, HEAD_SIZE + 1.4 * PX, 0.8 * PX, hAccMat);
        addBox(outfitHeadGroup, 2.4 * PX, 2.4 * PX, 1.7 * PX, 0, HEAD_SIZE + 1.6 * PX, 1.05 * PX, hGlowMat, 0, 0, Math.PI / 4);
      } else if (hStyle === 'abyss_crest') {
        addBox(outfitHeadGroup, 1.1 * PX, 3.4 * PX, 7.8 * PX, 0, HEAD_SIZE + 1.1 * PX, -0.6 * PX, hGlowMat, -0.2, 0, 0);
      } else if (hStyle === 'starlight_tiara') {
        addBox(outfitHeadGroup, 7.4 * PX, 1.2 * PX, 1.2 * PX, 0, HEAD_SIZE + 0.7 * PX, 3.2 * PX, hAccMat);
        addBox(outfitHeadGroup, 2.1 * PX, 2.6 * PX, 1.1 * PX, 0, HEAD_SIZE + 1.5 * PX, 3.4 * PX, hGlowMat, 0, 0, Math.PI / 4);
      }
    }

    // 3. 3D Cyber Boot Jet Cuffs & Glow Soles
    if (bootsDef) {
      const bPlateMat = makeMat(bootsDef.primaryHex, undefined, 0, 0.52, 0.3);
      const bGlowMat = makeMat(bootsDef.glowHex, bootsDef.glowHex, 1.2, 0.25, 0.2);
      for (const legGrp of [outfitLeftLegGroup, outfitRightLegGroup]) {
        addBox(legGrp, LIMB_W + 0.7 * PX, 3.8 * PX, LIMB_D + 0.7 * PX, 0, -LIMB_H + 1.9 * PX, 0, bPlateMat);
        // Rear micro-thruster + glowing hover sole rim
        addBox(legGrp, 1.8 * PX, 1.8 * PX, 1.0 * PX, 0, -LIMB_H + 2.2 * PX, -LIMB_D * 0.5 - 0.55 * PX, bGlowMat, 0.22, 0, 0);
        addBox(legGrp, LIMB_W + 0.8 * PX, 0.75 * PX, LIMB_D + 0.85 * PX, 0, -LIMB_H + 0.38 * PX, 0, bGlowMat);
      }
    }

    // 4. 3D Back Accessory (Cape / Halo / Thrusters / Seraph Wings)
    if (activeAccessoryDef) {
      const aStyle: AccessoryGeometryStyle = activeAccessoryDef.accessoryStyle ?? 'cape';
      const aPrimaryMat = makeMat(activeAccessoryDef.primaryHex, undefined, 0, 0.45, 0.32);
      const aGlowMat = makeMat(
        activeAccessoryDef.glowHex,
        activeAccessoryDef.glowHex,
        1.35,
        0.25,
        0.18,
        true,
        0.9,
      );
      const aAccMat = makeMat(activeAccessoryDef.accentHex, activeAccessoryDef.accentHex, 0.65, 0.55, 0.22);

      if (aStyle === 'cape') {
        addBox(outfitTorsoGroup, 8.8 * PX, 12.6 * PX, 0.55 * PX, 0, TORSO_H * 0.36, -TORSO_D * 0.5 - 0.85 * PX, aPrimaryMat, 0.14, 0, 0);
        addBox(outfitTorsoGroup, 0.8 * PX, 12.6 * PX, 0.62 * PX, -4.1 * PX, TORSO_H * 0.36, -TORSO_D * 0.5 - 0.85 * PX, aGlowMat, 0.14, 0, 0);
        addBox(outfitTorsoGroup, 0.8 * PX, 12.6 * PX, 0.62 * PX, 4.1 * PX, TORSO_H * 0.36, -TORSO_D * 0.5 - 0.85 * PX, aGlowMat, 0.14, 0, 0);
      } else if (aStyle === 'halo') {
        haloPivot = new THREE.Group();
        haloPivot.position.set(0, TORSO_H + HEAD_SIZE * 0.72, -TORSO_D * 0.5 - 2.6 * PX);
        outfitTorsoGroup.add(haloPivot);
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2;
          const rad = 5.4 * PX;
          addBox(
            haloPivot,
            2.4 * PX,
            0.9 * PX,
            0.9 * PX,
            Math.cos(ang) * rad,
            Math.sin(ang) * rad,
            0,
            k % 2 === 0 ? aGlowMat : aAccMat,
            0,
            0,
            ang + Math.PI / 2,
          );
        }
      } else if (aStyle === 'thrusters') {
        addBox(outfitTorsoGroup, 6.2 * PX, 5.2 * PX, 2.2 * PX, 0, TORSO_H * 0.6, -TORSO_D * 0.5 - 1.15 * PX, aPrimaryMat);
        for (const sx of [-1, 1]) {
          addBox(outfitTorsoGroup, 2.1 * PX, 4.4 * PX, 2.3 * PX, sx * 2.4 * PX, TORSO_H * 0.54, -TORSO_D * 0.5 - 1.6 * PX, aPrimaryMat, 0.16, 0, sx * -0.1);
          addBox(outfitTorsoGroup, 1.5 * PX, 1.3 * PX, 1.6 * PX, sx * 2.5 * PX, TORSO_H * 0.25, -TORSO_D * 0.5 - 1.9 * PX, aGlowMat, 0.16, 0, sx * -0.1);
        }
      } else if (aStyle === 'seraph_wings') {
        addBox(outfitTorsoGroup, 4.4 * PX, 4.2 * PX, 2.0 * PX, 0, TORSO_H * 0.68, -TORSO_D * 0.5 - 1.0 * PX, aPrimaryMat);
        wingLeftPivot = new THREE.Group();
        wingLeftPivot.position.set(-1.6 * PX, TORSO_H * 0.74, -TORSO_D * 0.5 - 1.4 * PX);
        wingLeftPivot.rotation.y = 0.22;
        outfitTorsoGroup.add(wingLeftPivot);

        wingRightPivot = new THREE.Group();
        wingRightPivot.position.set(1.6 * PX, TORSO_H * 0.74, -TORSO_D * 0.5 - 1.4 * PX);
        wingRightPivot.rotation.y = -0.22;
        outfitTorsoGroup.add(wingRightPivot);

        const featherSpecs = [
          { len: 12.2 * PX, y: 2.8 * PX, rz: 0.42, mat: aGlowMat },
          { len: 10.4 * PX, y: 0.4 * PX, rz: 0.16, mat: aAccMat },
          { len: 8.2 * PX, y: -2.0 * PX, rz: -0.12, mat: aGlowMat },
        ];
        for (const f of featherSpecs) {
          addBox(wingLeftPivot, f.len, 2.1 * PX, 0.55 * PX, -f.len * 0.5, f.y, 0, f.mat, 0, 0, -f.rz);
          addBox(wingRightPivot, f.len, 2.1 * PX, 0.55 * PX, f.len * 0.5, f.y, 0, f.mat, 0, 0, f.rz);
        }
      }
    }
  };

  if (options?.initialOutfit) {
    applyOutfitLoadout(options.initialOutfit);
  }

  // Animation state
  let gaitPhase = 0;
  let idleTime = 0;
  let landSquash = 0;
  let wasGrounded = true;

  // Held block switching & arm swing animation state
  let currentHeldBlock: PlaceableBlock = 'grass';
  let pendingHeldBlock: PlaceableBlock = 'grass';
  let switchAnimProgress = 1;
  let switchSwapped = true;
  const SWITCH_DURATION = 0.24;

  let swingProgress = 1;
  const SWING_DURATION = 0.21;
  let isShowingHeldBlock = showHeldBlock;

  const setShowHeldBlock = (visible: boolean) => {
    isShowingHeldBlock = visible;
    heldBlockPivot.visible = visible;
  };

  const setHeldBlock = (block: PlaceableBlock) => {
    if (block === pendingHeldBlock && switchAnimProgress < 1) return;
    if (block === currentHeldBlock && switchAnimProgress >= 1) return;
    pendingHeldBlock = block;
    switchAnimProgress = 0;
    switchSwapped = false;
  };

  const triggerArmSwing = () => {
    swingProgress = 0;
  };

  const updateAnimation = (
    dt: number,
    horizontalSpeed: number,
    maxRunSpeed: number,
    grounded: boolean,
    verticalVel: number,
    isDancing = false,
    dancePhaseOffset = 0,
    poseMode: PlayerPoseMode = 'normal',
  ) => {
    idleTime += dt;
    const isMoving = horizontalSpeed > 0.2;
    const speedRatio = THREE.MathUtils.clamp(horizontalSpeed / maxRunSpeed, 0, 1);

    const targetVisualRotX =
      poseMode === 'sleep'
        ? -Math.PI / 2
        : poseMode === 'dive'
          ? THREE.MathUtils.lerp(1.14, 1.38, THREE.MathUtils.clamp(horizontalSpeed / 3.5, 0, 1))
          : poseMode === 'swim'
            ? THREE.MathUtils.lerp(0.18, 0.92, THREE.MathUtils.clamp(horizontalSpeed / 3.5, 0, 1))
            : poseMode === 'fly'
              ? THREE.MathUtils.lerp(0.05, 0.34, speedRatio)
              : 0;
    const targetVisualPosY =
      poseMode === 'sleep'
        ? 0.14
        : poseMode === 'dive'
          ? 0.62 + Math.sin(idleTime * 2.5) * 0.04
          : poseMode === 'swim'
            ? 0.14 + Math.sin(idleTime * 3.1) * 0.04
            : poseMode === 'fly'
              ? Math.sin(idleTime * 3.0) * 0.045
              : 0;
    const targetVisualPosZ = 0;
    visualRoot.rotation.x = THREE.MathUtils.damp(visualRoot.rotation.x, targetVisualRotX, 12, dt);
    visualRoot.position.y = THREE.MathUtils.damp(visualRoot.position.y, targetVisualPosY, 12, dt);
    visualRoot.position.z = THREE.MathUtils.damp(visualRoot.position.z, targetVisualPosZ, 14, dt);

    if (grounded && !wasGrounded) {
      landSquash = 1.0;
    }
    wasGrounded = grounded;
    landSquash = THREE.MathUtils.damp(landSquash, 0, 13, dt);

    // Advance block switching dip-swap-pop animation
    let switchArmOffsetX = 0;
    let switchBlockOffsetY = 0;
    let switchBlockOffsetZ = 0;
    let switchScale = 1;
    let switchSpinY = 0;

    if (switchAnimProgress < 1) {
      switchAnimProgress = Math.min(1, switchAnimProgress + dt / SWITCH_DURATION);
      if (switchAnimProgress < 0.45) {
        const t = switchAnimProgress / 0.45;
        const easeIn = t * t;
        switchArmOffsetX = 0.46 * easeIn;
        switchBlockOffsetY = -0.075 * easeIn;
        switchBlockOffsetZ = -0.03 * easeIn;
        switchScale = THREE.MathUtils.lerp(1, 0.45, easeIn);
        switchSpinY = -0.22 * easeIn;
      } else {
        if (!switchSwapped) {
          heldBlockMesh.geometry = heldBlockGeos[pendingHeldBlock];
          currentHeldBlock = pendingHeldBlock;
          switchSwapped = true;
        }
        const t = (switchAnimProgress - 0.45) / 0.55;
        const easeOut = 1 - Math.pow(1 - t, 3);
        const pop = Math.sin(t * Math.PI) * 0.14;
        switchArmOffsetX = 0.46 * (1 - easeOut);
        switchBlockOffsetY = -0.075 * (1 - easeOut) + pop * 0.16;
        switchBlockOffsetZ = -0.03 * (1 - easeOut);
        switchScale = THREE.MathUtils.lerp(0.45, 1, easeOut) + pop;
        switchSpinY = 0.18 * (1 - easeOut);
      }
    }

    heldBlockPivot.position.set(
      heldBlockBasePos.x,
      heldBlockBasePos.y + switchBlockOffsetY,
      heldBlockBasePos.z + switchBlockOffsetZ,
    );
    heldBlockPivot.rotation.set(
      heldBlockBaseRot.x,
      heldBlockBaseRot.y + switchSpinY,
      heldBlockBaseRot.z,
    );
    heldBlockPivot.scale.setScalar(switchScale);

    // Advance snappy arm swing animation (breaking / placing)
    let swingOffsetX = 0;
    let swingOffsetZ = 0;
    if (swingProgress < 1) {
      swingProgress = Math.min(1, swingProgress + dt / SWING_DURATION);
      const wave = Math.sin(swingProgress * Math.PI);
      swingOffsetX = -0.92 * wave;
      swingOffsetZ = 0.24 * wave;
    }

    if ((grounded || poseMode === 'swim') && isMoving) {
      const freq = THREE.MathUtils.lerp(7.2, 12.8, speedRatio);
      gaitPhase += dt * freq;
    }

    const s = Math.sin(gaitPhase);
    const c = Math.cos(gaitPhase);
    const moveBlend = THREE.MathUtils.smoothstep(horizontalSpeed, 0.15, 2.2);

    // Hold bias keeps the right hand slightly forward only when showing held block
    const holdBiasX = isShowingHeldBlock ? -0.34 : 0;

    if (poseMode === 'sit') {
      // Relaxed seated chair/sofa pose (hips aligned so character sits flush on seat)
      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H * 0.44, 16, dt);
      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, -0.05, 14, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, 0, 14, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, 0, 14, dt);

      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, -1.42, 16, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -1.42, 16, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, -0.07, 14, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0.07, 14, dt);

      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, -0.45 + swingOffsetX, 14, dt);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, -0.45, 14, dt);
      leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -0.14 + swingOffsetZ, 14, dt);
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 0.14, 14, dt);

      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, Math.sin(idleTime * 0.7) * 0.12, 8, dt);
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, 0.04, 12, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 12, dt);
    } else if (poseMode === 'sleep') {
      // Cozy supine horizontal bed sleeping pose (back on mattress, face & chest up, head on pillow)
      const breath = 0.015 + Math.sin(idleTime * 1.9) * 0.015;
      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H, 14, dt);
      torsoPivot.rotation.set(breath, 0, 0);
      leftLegPivot.rotation.set(-0.02, 0, -0.05);
      rightLegPivot.rotation.set(-0.02, 0, 0.05);
      leftArmPivot.rotation.set(-0.05, 0, -0.14);
      rightArmPivot.rotation.set(-0.05, 0, 0.14);
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, 0.08 + breath * 0.5, 10, dt);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, 0, 8, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 10, dt);
    } else if (poseMode === 'dive') {
      // Streamlined underwater diving pose: horizontal breaststroke / flutter kick
      const divePhase = idleTime * (isMoving ? 5.6 : 2.6);
      const kick = Math.sin(divePhase * 1.9) * (isMoving ? 0.56 : 0.2);
      const sweep = Math.sin(divePhase);
      const sweepCos = Math.cos(divePhase);

      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H, 14, dt);
      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, 0.08, 12, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, sweep * (isMoving ? 0.12 : 0.04), 12, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, 0, 12, dt);

      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, kick, 14, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -kick, 14, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, -0.07, 12, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0.07, 12, dt);

      const armFwd = isMoving ? -2.35 + sweep * 0.55 : -1.15 + sweep * 0.2;
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, armFwd + swingOffsetX, 14, dt);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, armFwd, 14, dt);
      leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -0.32 - Math.max(0, sweepCos) * 0.45, 12, dt);
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 0.32 + Math.max(0, sweepCos) * 0.45, 12, dt);

      // Look ahead cleanly through underwater view
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -0.92, 12, dt);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, Math.sin(idleTime * 0.8) * 0.08, 10, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 12, dt);
    } else if (poseMode === 'swim') {
      // Shallow water wade/swim: gentle treading when idle, alternating stroke + flutter kick when moving
      const swimPhase = idleTime * (isMoving ? 6.4 : 2.8);
      const kick = Math.sin(swimPhase * 1.8) * (isMoving ? 0.52 : 0.22);
      const stroke = Math.sin(swimPhase);
      const strokeOut = Math.cos(swimPhase);

      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H, 14, dt);
      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, isMoving ? 0.14 : 0.04, 12, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, strokeOut * (isMoving ? 0.22 : 0.06), 12, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, stroke * (isMoving ? 0.08 : 0.03), 12, dt);

      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, kick, 14, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -kick, 14, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, -0.08, 12, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0.08, 12, dt);

      const armPitch = isMoving ? -1.45 + stroke * 0.95 : -0.58 + stroke * 0.22;
      const armPitchR = isMoving ? -1.45 - stroke * 0.95 : -0.58 - stroke * 0.22;
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, armPitch + swingOffsetX, 14, dt);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, armPitchR, 14, dt);
      leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, -0.34 - Math.abs(strokeOut) * 0.24, 12, dt);
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 0.34 + Math.abs(strokeOut) * 0.24, 12, dt);

      // Keep head tilted up cleanly above the water surface
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, isMoving ? -0.68 : -0.18, 12, dt);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, Math.sin(idleTime * 0.9) * 0.1, 10, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 12, dt);
    } else if (poseMode === 'fly') {
      // Smooth Minecraft Creative-style airborne hover & forward flight glide
      const hoverWave = Math.sin(idleTime * 2.8);
      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H + 0.04, 12, dt);
      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, 0.06, 12, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, 0, 12, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, 0, 12, dt);

      const legTrail = 0.22 + speedRatio * 0.28;
      leftLegPivot.rotation.x = THREE.MathUtils.damp(
        leftLegPivot.rotation.x,
        -legTrail + hoverWave * 0.07,
        12,
        dt,
      );
      rightLegPivot.rotation.x = THREE.MathUtils.damp(
        rightLegPivot.rotation.x,
        -legTrail * 0.72 - hoverWave * 0.07,
        12,
        dt,
      );
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, -0.06, 12, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0.06, 12, dt);

      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        holdBiasX * 0.4 + 0.26 * speedRatio + hoverWave * 0.06 + switchArmOffsetX + swingOffsetX,
        14,
        dt,
      );
      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        0.26 * speedRatio - hoverWave * 0.06,
        12,
        dt,
      );
      leftArmPivot.rotation.z = THREE.MathUtils.damp(
        leftArmPivot.rotation.z,
        -0.22 - speedRatio * 0.14 + swingOffsetZ,
        12,
        dt,
      );
      rightArmPivot.rotation.z = THREE.MathUtils.damp(
        rightArmPivot.rotation.z,
        0.22 + speedRatio * 0.14,
        12,
        dt,
      );

      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -targetVisualRotX * 0.45, 12, dt);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, Math.sin(idleTime * 0.8) * 0.07, 10, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 12, dt);
    } else if (!grounded) {
      // Crisp blocky mid-air jump pose
      const airLift = THREE.MathUtils.clamp(verticalVel * 0.05, -0.35, 0.35);
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, -0.5 + airLift, 11, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0.42 - airLift * 0.5, 11, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, 0, 10, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0, 10, dt);

      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        -0.58 + switchArmOffsetX + swingOffsetX,
        14,
        dt,
      );
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, -0.38, 11, dt);
      leftArmPivot.rotation.z = THREE.MathUtils.damp(
        leftArmPivot.rotation.z,
        -0.2 + swingOffsetZ,
        12,
        dt,
      );
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, 0.22, 10, dt);

      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, 0.08, 10, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, 0, 10, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, 0, 10, dt);
      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H + 0.02, 12, dt);
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -0.08, 10, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 10, dt);
    } else if ((isDancing || poseMode === 'dance') && horizontalSpeed < 0.35) {
      // Energetic Minecraft / School Party Craft beat dance groove!
      const beat = idleTime * 6.5 + dancePhaseOffset;
      const halfBeat = beat * 0.5;
      const bounce = Math.abs(Math.sin(beat)) * 0.075;
      const sway = Math.sin(halfBeat);

      hipsPivot.position.y = THREE.MathUtils.damp(hipsPivot.position.y, LIMB_H + bounce, 18, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, sway * 0.32, 14, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, sway * 0.11, 14, dt);
      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, 0.06 + Math.sin(beat) * 0.06, 14, dt);

      // Alternating upbeat arm waves & party pumps
      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        -1.95 + Math.sin(beat) * 0.48 + swingOffsetX,
        16,
        dt,
      );
      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        -1.95 - Math.sin(beat) * 0.48,
        16,
        dt,
      );
      leftArmPivot.rotation.z = THREE.MathUtils.damp(
        leftArmPivot.rotation.z,
        -0.42 - Math.cos(halfBeat) * 0.25 + swingOffsetZ,
        14,
        dt,
      );
      rightArmPivot.rotation.z = THREE.MathUtils.damp(
        rightArmPivot.rotation.z,
        0.42 - Math.cos(halfBeat) * 0.25,
        14,
        dt,
      );

      // Rhythmic stepping leg bounce
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, Math.max(0, Math.sin(beat)) * 0.38, 16, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, Math.max(0, -Math.sin(beat)) * 0.38, 16, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, -0.06 - sway * 0.08, 14, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0.06 - sway * 0.08, 14, dt);

      // Head groove nod
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, Math.sin(beat) * 0.16, 16, dt);
      headPivot.rotation.y = THREE.MathUtils.damp(headPivot.rotation.y, sway * 0.18, 14, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, -sway * 0.1, 14, dt);
    } else {
      // Smooth Minecraft-style alternating walk/run pendulum + idle breathing
      const legSwing = THREE.MathUtils.lerp(0.56, 0.96, speedRatio) * moveBlend;
      const armSwing = THREE.MathUtils.lerp(0.52, 0.98, speedRatio) * moveBlend;
      const forwardLean = THREE.MathUtils.lerp(0.04, 0.18, speedRatio) * moveBlend;

      const idleArmSway = Math.sin(idleTime * 1.8) * 0.04 * (1 - moveBlend);
      const idleArmOut = (0.05 + Math.cos(idleTime * 1.4) * 0.02) * (1 - moveBlend);

      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, s * legSwing, 17, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -s * legSwing, 17, dt);
      leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, 0, 14, dt);
      rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, 0, 14, dt);

      const targetHeldArmX =
        holdBiasX + -s * armSwing * 0.65 + idleArmSway + switchArmOffsetX + swingOffsetX;
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, targetHeldArmX, 18, dt);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, s * armSwing - idleArmSway, 17, dt);

      const runArmFlare = THREE.MathUtils.lerp(0.06, 0.14, speedRatio) * moveBlend;
      leftArmPivot.rotation.z = THREE.MathUtils.damp(
        leftArmPivot.rotation.z,
        -(idleArmOut + runArmFlare + 0.03) + swingOffsetZ,
        14,
        dt,
      );
      rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, idleArmOut + runArmFlare, 12, dt);

      // Subtle vertical stride bounce & landing absorb
      const strideBob = Math.abs(c) * THREE.MathUtils.lerp(0.028, 0.062, speedRatio) * moveBlend;
      const breathBob = Math.sin(idleTime * 2.2) * 0.008 * (1 - moveBlend);
      hipsPivot.position.y = THREE.MathUtils.damp(
        hipsPivot.position.y,
        LIMB_H + strideBob + breathBob - landSquash * 0.055,
        18,
        dt,
      );

      torsoPivot.rotation.x = THREE.MathUtils.damp(torsoPivot.rotation.x, forwardLean + landSquash * 0.12, 14, dt);
      torsoPivot.rotation.y = THREE.MathUtils.damp(torsoPivot.rotation.y, -s * 0.075 * moveBlend, 14, dt);
      torsoPivot.rotation.z = THREE.MathUtils.damp(torsoPivot.rotation.z, 0, 14, dt);

      headPivot.rotation.y = THREE.MathUtils.damp(
        headPivot.rotation.y,
        s * 0.045 * moveBlend + Math.sin(idleTime * 0.75) * 0.065 * (1 - moveBlend),
        10,
        dt,
      );
      headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -forwardLean * 0.5, 12, dt);
      headPivot.rotation.z = THREE.MathUtils.damp(headPivot.rotation.z, 0, 14, dt);
    }

    // Subtle idle/flight flutter on equipped X-Suit wings & floating halo
    if (wingLeftPivot && wingRightPivot) {
      const flapAmp = poseMode === 'fly' ? 0.24 : 0.08;
      const flapRate = poseMode === 'fly' ? 8.5 : 2.8;
      const flap = Math.sin(idleTime * flapRate) * flapAmp;
      wingLeftPivot.rotation.y = 0.22 + flap;
      wingRightPivot.rotation.y = -0.22 - flap;
    }
    if (haloPivot) {
      haloPivot.rotation.z = idleTime * 0.65;
    }
  };

  const dispose = () => {
    clearOutfitAttachments();
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    root,
    visualRoot,
    contactShadow,
    setHeldBlock,
    setOutfitLoadout: applyOutfitLoadout,
    setShowHeldBlock,
    triggerArmSwing,
    updateAnimation,
    dispose,
  };
}
