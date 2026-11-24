import {
  loadPlacedFurniture,
  PlacedFurnitureRecord,
  savePlacedFurniture,
  STARTER_VILLA_HOUSE_DEF,
  STARTER_VILLA_ID,
} from './homeFurniture';
import { createProtectedVoxelOps, VoxelWriteOps } from './modernHouses';
import { VOXEL_ID, VoxelId } from './types';

export { STARTER_VILLA_HOUSE_DEF, STARTER_VILLA_ID };

export interface PlayerSaveState {
  x: number;
  y: number;
  z: number;
  camYaw: number;
  homeId: string;
  hasStartedOnce: boolean;
  isFlying?: boolean;
}

export const STARTER_HOME_SPAWN = {
  x: 14.5,
  y: 2,
  z: 91,
  camYaw: Math.PI * 0.48, // Look into cozy living room & working front door
  homeId: STARTER_VILLA_ID,
};

const PLAYER_STATE_KEY = 'spc_city_player_state_v1';
const STARTER_FURNITURE_SEEDED_KEY = 'spc_city_starter_villa_seeded_v1';

export function loadPlayerState(): PlayerSaveState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerSaveState>;
    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.z === 'number' &&
      typeof parsed.camYaw === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y) &&
      Number.isFinite(parsed.z) &&
      Number.isFinite(parsed.camYaw)
    ) {
      return {
        x: parsed.x,
        y: parsed.y,
        z: parsed.z,
        camYaw: parsed.camYaw,
        homeId: typeof parsed.homeId === 'string' ? parsed.homeId : STARTER_VILLA_ID,
        hasStartedOnce: Boolean(parsed.hasStartedOnce),
        isFlying: Boolean(parsed.isFlying),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function savePlayerState(state: PlayerSaveState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

/**
 * Default cozy starter 3D furniture inside Player's Dream Villa (seeded once so
 * players can immediately sit, sleep, use lamps/TV/PC, or rearrange everything freely).
 */
export const STARTER_VILLA_FURNITURE: PlacedFurnitureRecord[] = [
  // 1F Living Room & Dining (y = 2)
  { id: 'villa_1f_rug', itemId: 'carpet_coral', houseId: STARTER_VILLA_ID, x: 17.5, y: 2, z: 95.5, rotY: 0, stateOn: true },
  { id: 'villa_1f_sofa', itemId: 'sofa_coral', houseId: STARTER_VILLA_ID, x: 17.5, y: 2, z: 93.2, rotY: 0, stateOn: true },
  { id: 'villa_1f_coffee_tbl', itemId: 'table_glass', houseId: STARTER_VILLA_ID, x: 17.5, y: 2, z: 95.6, rotY: 0, stateOn: true },
  { id: 'villa_1f_tv', itemId: 'tv_modern', houseId: STARTER_VILLA_ID, x: 17.5, y: 2, z: 99.6, rotY: Math.PI, stateOn: true },
  { id: 'villa_1f_lamp', itemId: 'floor_lamp', houseId: STARTER_VILLA_ID, x: 14.5, y: 2, z: 99.6, rotY: 0, stateOn: true },
  { id: 'villa_1f_plant', itemId: 'plant_pot', houseId: STARTER_VILLA_ID, x: 12.2, y: 2, z: 99.6, rotY: 0, stateOn: true },
  { id: 'villa_1f_dining', itemId: 'dining_table_white', houseId: STARTER_VILLA_ID, x: 17.0, y: 2, z: 84.5, rotY: 0, stateOn: true },
  { id: 'villa_1f_chair_w', itemId: 'chair_mint', houseId: STARTER_VILLA_ID, x: 15.2, y: 2, z: 84.5, rotY: Math.PI / 2, stateOn: true },
  { id: 'villa_1f_chair_e', itemId: 'chair_sky', houseId: STARTER_VILLA_ID, x: 18.8, y: 2, z: 84.5, rotY: -Math.PI / 2, stateOn: true },
  { id: 'villa_1f_chair_guest', itemId: 'chair_pink', houseId: STARTER_VILLA_ID, x: 29.0, y: 2, z: 97.5, rotY: -Math.PI / 2, stateOn: true },
  { id: 'villa_1f_bed_guest', itemId: 'bed', houseId: STARTER_VILLA_ID, x: 31.0, y: 2, z: 98.5, rotY: Math.PI, stateOn: true },

  // 2F Master Bedroom & Balcony Lounge (y = 7)
  { id: 'villa_2f_rug', itemId: 'carpet_blue', houseId: STARTER_VILLA_ID, x: 16.5, y: 7, z: 95.5, rotY: 0, stateOn: true },
  { id: 'villa_2f_bed', itemId: 'bed_mint', houseId: STARTER_VILLA_ID, x: 15.0, y: 7, z: 98.5, rotY: Math.PI, stateOn: true },
  { id: 'villa_2f_wardrobe', itemId: 'wardrobe_white', houseId: STARTER_VILLA_ID, x: 20.5, y: 7, z: 99.5, rotY: Math.PI, stateOn: true },
  { id: 'villa_2f_sofa', itemId: 'sofa_cream', houseId: STARTER_VILLA_ID, x: 16.0, y: 7, z: 84.5, rotY: 0, stateOn: true },
  { id: 'villa_2f_desk', itemId: 'table_white', houseId: STARTER_VILLA_ID, x: 30.5, y: 7, z: 83.5, rotY: 0, stateOn: true },
  { id: 'villa_2f_swivel', itemId: 'swivel_chair', houseId: STARTER_VILLA_ID, x: 30.5, y: 7, z: 85.2, rotY: Math.PI, stateOn: true },
  { id: 'villa_2f_lamp', itemId: 'desk_lamp', houseId: STARTER_VILLA_ID, x: 12.2, y: 7, z: 99.5, rotY: 0, stateOn: true },
];

/**
 * Permanent ocean-facing 3D beach loungers along South Coast Beach (+Z faces the ocean).
 */
export const BEACH_LOUNGER_PLACEMENTS: PlacedFurnitureRecord[] = [
  { id: 'beach_lounger_1', itemId: 'beach_lounger', houseId: 'public_beach', x: -50, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_2', itemId: 'beach_lounger', houseId: 'public_beach', x: -46, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_3', itemId: 'beach_lounger', houseId: 'public_beach', x: -34, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_4', itemId: 'beach_lounger', houseId: 'public_beach', x: -30, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_5', itemId: 'beach_lounger', houseId: 'public_beach', x: -18, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_6', itemId: 'beach_lounger', houseId: 'public_beach', x: -14, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_7', itemId: 'beach_lounger', houseId: 'public_beach', x: 14, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_8', itemId: 'beach_lounger', houseId: 'public_beach', x: 18, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_9', itemId: 'beach_lounger', houseId: 'public_beach', x: 30, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_10', itemId: 'beach_lounger', houseId: 'public_beach', x: 34, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_11', itemId: 'beach_lounger', houseId: 'public_beach', x: 46, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_12', itemId: 'beach_lounger', houseId: 'public_beach', x: 50, y: 2, z: 142, rotY: 0, stateOn: true },
  { id: 'beach_lounger_13', itemId: 'beach_lounger', houseId: 'public_beach', x: -24, y: 2, z: 150, rotY: 0, stateOn: true },
  { id: 'beach_lounger_14', itemId: 'beach_lounger', houseId: 'public_beach', x: -20, y: 2, z: 150, rotY: 0, stateOn: true },
  { id: 'beach_lounger_15', itemId: 'beach_lounger', houseId: 'public_beach', x: 20, y: 2, z: 150, rotY: 0, stateOn: true },
  { id: 'beach_lounger_16', itemId: 'beach_lounger', houseId: 'public_beach', x: 24, y: 2, z: 150, rotY: 0, stateOn: true },
];

export function isStarterFurnitureSeeded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STARTER_FURNITURE_SEEDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markStarterFurnitureSeeded(seeded = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (seeded) {
      window.localStorage.setItem(STARTER_FURNITURE_SEEDED_KEY, '1');
    } else {
      window.localStorage.removeItem(STARTER_FURNITURE_SEEDED_KEY);
    }
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function seedStarterVillaFurnitureIfNeeded(): PlacedFurnitureRecord[] {
  const existing = loadPlacedFurniture();
  if (typeof window === 'undefined') return existing;
  try {
    const alreadySeeded = window.localStorage.getItem(STARTER_FURNITURE_SEEDED_KEY) === '1';
    if (alreadySeeded) return existing;

    const existingIds = new Set(existing.map((r) => r.id));
    const merged = [...existing];
    for (const item of STARTER_VILLA_FURNITURE) {
      if (!existingIds.has(item.id)) {
        merged.push({ ...item });
      }
    }
    savePlacedFurniture(merged);
    window.localStorage.setItem(STARTER_FURNITURE_SEEDED_KEY, '1');
    return merged;
  } catch {
    return existing;
  }
}

function markFixedBox(
  ops: VoxelWriteOps,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const minZ = Math.min(z0, z1);
  const maxZ = Math.max(z0, z1);
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        ops.markFixed?.(x, y, z);
      }
    }
  }
}

function buildVillaStory(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
  wallId: VoxelId,
  trimId: VoxelId,
  floorId: VoxelId,
  ceilingId: VoxelId,
): void {
  const { set, fillBox } = ops;
  fillBox(x0, baseY - 1, z0, x1, baseY - 1, z1, floorId);
  fillBox(x0 + 1, baseY, z0 + 1, x1 - 1, baseY + 3, z1 - 1, VOXEL_ID.AIR);

  for (let y = baseY; y <= baseY + 3; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const onX = x === x0 || x === x1;
        const onZ = z === z0 || z === z1;
        if (!onX && !onZ) continue;
        set(x, y, z, onX && onZ ? trimId : wallId);
      }
    }
  }

  fillBox(x0, baseY + 4, z0, x1, baseY + 4, z1, ceilingId);
  for (let x = x0; x <= x1; x++) {
    set(x, baseY + 4, z0, trimId);
    set(x, baseY + 4, z1, trimId);
  }
  for (let z = z0; z <= z1; z++) {
    set(x0, baseY + 4, z, trimId);
    set(x1, baseY + 4, z, trimId);
  }

  // Bright recessed ceiling lighting
  for (const lx of [x0 + 5, Math.floor((x0 + x1) / 2), x1 - 5]) {
    for (const lz of [z0 + 4, Math.floor((z0 + z1) / 2), z1 - 4]) {
      set(lx, baseY + 4, lz, VOXEL_ID.LAMP_BLOCK);
    }
  }
}

/**
 * Constructs the player's large, permanent, luxury Starting Villa estate
 * right off South Avenue (x in [6..36], z in [76..106]):
 * - Driveway connecting directly to South Avenue (x = 3)
 * - Landscaped front & back gardens with hedge border, lanterns, and patio seating
 * - 2 spacious stories with working front double door, back patio door, kitchen, bathroom,
 *   living room, guest room, interior staircase, 2F bedrooms, and walkable 2F front balcony.
 */
export function buildPlayerDreamVilla(rawOps: VoxelWriteOps): void {
  const ops = createProtectedVoxelOps(rawOps);
  const { set, fillBox, markFixed } = ops;
  const x0 = 10;
  const x1 = 34;
  const z0 = 80;
  const z1 = 102;

  // 1. Estate Yard & Landscaped Front/Back Gardens (x in [6..36], z in [76..106])
  // Outer yard grass, hedges, and driveway stay normal breakable terrain
  rawOps.fillBox(6, 1, 76, 36, 1, 106, VOXEL_ID.GRASS);
  // Manicured low garden border hedge (leave open driveway mouth on West edge z = 88..93)
  for (let x = 6; x <= 36; x++) {
    rawOps.set(x, 2, 76, VOXEL_ID.LEAVES);
    rawOps.set(x, 2, 106, VOXEL_ID.LEAVES);
  }
  for (let z = 76; z <= 106; z++) {
    if (z < 88 || z > 93) {
      rawOps.set(6, 2, z, VOXEL_ID.LEAVES);
    }
    rawOps.set(36, 2, z, VOXEL_ID.LEAVES);
  }
  // Entrance driveway pillar lanterns framing the open driveway
  rawOps.set(6, 2, 87, VOXEL_ID.CHARCOAL_TRIM);
  rawOps.set(6, 3, 87, VOXEL_ID.LAMP_BLOCK);
  rawOps.set(6, 2, 94, VOXEL_ID.CHARCOAL_TRIM);
  rawOps.set(6, 3, 94, VOXEL_ID.LAMP_BLOCK);

  // Paved Stone/Sidewalk Driveway seamlessly joining South Ave sidewalk (x = 3) to Villa front door (x = 10)
  rawOps.fillBox(4, 1, 88, 9, 1, 93, VOXEL_ID.SIDEWALK);
  rawOps.fillBox(4, 1, 89, 9, 1, 92, VOXEL_ID.CONCRETE);
  // Garden floral accents flanking front walkway
  rawOps.set(8, 2, 85, VOXEL_ID.FLOWER_VASE);
  rawOps.set(8, 2, 96, VOXEL_ID.FLOWER_VASE);
  rawOps.set(8, 2, 81, VOXEL_ID.PLANT_POT);
  rawOps.set(8, 2, 100, VOXEL_ID.PLANT_POT);

  // Back Patio Terrace (z = 103..105) — part of protected Villa structure
  fillBox(13, 1, 103, 33, 1, 105, VOXEL_ID.OAK_FLOOR);
  set(22, 2, 104, VOXEL_ID.TABLE_WHITE);
  set(20, 2, 104, VOXEL_ID.CHAIR_MINT);
  set(24, 2, 104, VOXEL_ID.CHAIR_MINT);
  set(31, 2, 104, VOXEL_ID.PLANT_POT);

  // 2. 1st Floor Main Villa Structure (y = 2..5, ceiling slab at y = 6)
  buildVillaStory(
    ops,
    x0,
    2,
    z0,
    x1,
    z1,
    VOXEL_ID.WHITE_WALL,
    VOXEL_ID.CHARCOAL_TRIM,
    VOXEL_ID.OAK_FLOOR,
    VOXEL_ID.WHITE_WALL,
  );
  // Subtle accent facade strip on West front wall
  fillBox(x0, 2, z0 + 1, x0, 5, z0 + 3, VOXEL_ID.SKY_WALL);
  fillBox(x0, 2, z1 - 3, x0, 5, z1 - 1, VOXEL_ID.SKY_WALL);

  // Working Double Front Door on West Wall (x = 10, z = 90..91)
  for (let dy = 0; dy <= 3; dy++) {
    set(x0, 2 + dy, 89, VOXEL_ID.CHARCOAL_TRIM);
    set(x0, 2 + dy, 92, VOXEL_ID.CHARCOAL_TRIM);
  }
  set(x0, 2, 90, VOXEL_ID.DOOR_WHITE_CLOSED);
  set(x0, 3, 90, VOXEL_ID.DOOR_WHITE_CLOSED);
  set(x0, 2, 91, VOXEL_ID.DOOR_WHITE_CLOSED);
  set(x0, 3, 91, VOXEL_ID.DOOR_WHITE_CLOSED);
  set(x0, 4, 90, VOXEL_ID.GLASS);
  set(x0, 4, 91, VOXEL_ID.GLASS);
  set(x0, 5, 90, VOXEL_ID.CHARCOAL_TRIM);
  set(x0, 5, 91, VOXEL_ID.CHARCOAL_TRIM);

  // Back Patio Garden Door on South Wall (x = 22, z = 102)
  set(22, 2, z1, VOXEL_ID.DOOR_MINT_CLOSED);
  set(22, 3, z1, VOXEL_ID.DOOR_MINT_CLOSED);
  set(22, 4, z1, VOXEL_ID.CHARCOAL_TRIM);

  // 1F Panoramic Windows
  fillBox(x0, 3, 83, x0, 4, 87, VOXEL_ID.GLASS);
  fillBox(x0, 3, 94, x0, 4, 98, VOXEL_ID.GLASS);
  fillBox(13, 3, z0, 20, 4, z0, VOXEL_ID.GLASS);
  fillBox(25, 3, z0, 31, 4, z0, VOXEL_ID.GLASS);
  fillBox(13, 3, z1, 19, 4, z1, VOXEL_ID.GLASS);
  fillBox(25, 3, z1, 31, 4, z1, VOXEL_ID.GLASS);
  fillBox(x1, 3, 84, x1, 4, 88, VOXEL_ID.GLASS);
  fillBox(x1, 3, 94, x1, 4, 98, VOXEL_ID.GLASS);

  // 1F Interior Partitions (Kitchen/Dining North, Bathroom NE, Guest Suite SE)
  // North partition separating Living/Entry from Kitchen/Dining along z = 87
  fillBox(11, 2, 87, 22, 5, 87, VOXEL_ID.CREAM_WALL);
  fillBox(15, 2, 87, 17, 4, 87, VOXEL_ID.AIR); // Wide dining archway
  // Kitchenette appliances along North wall
  fillBox(11, 1, 81, 22, 1, 86, VOXEL_ID.TILE_FLOOR);
  fillBox(11, 2, 81, 15, 2, 81, VOXEL_ID.KITCHEN_COUNTER);
  set(16, 2, 81, VOXEL_ID.STOVE);
  set(17, 2, 81, VOXEL_ID.SINK_COUNTER);
  set(19, 2, 81, VOXEL_ID.FRIDGE);
  set(19, 3, 81, VOXEL_ID.FRIDGE);
  markFixedBox(ops, 11, 2, 81, 19, 3, 81);

  // NE Full Bathroom [x=23..33, z=81..87]
  fillBox(23, 1, 81, 33, 1, 86, VOXEL_ID.TILE_FLOOR);
  fillBox(23, 2, 81, 23, 5, 87, VOXEL_ID.CREAM_WALL);
  fillBox(23, 2, 87, 33, 5, 87, VOXEL_ID.CREAM_WALL);
  // Bathroom door at (28, 87)
  set(28, 2, 87, VOXEL_ID.DOOR_SKY_CLOSED);
  set(28, 3, 87, VOXEL_ID.DOOR_SKY_CLOSED);
  set(28, 4, 87, VOXEL_ID.CHARCOAL_TRIM);
  fillBox(30, 2, 81, 32, 2, 82, VOXEL_ID.BATHTUB);
  set(25, 2, 81, VOXEL_ID.TOILET);
  set(27, 2, 81, VOXEL_ID.SINK_COUNTER);
  markFixedBox(ops, 25, 2, 81, 32, 2, 82);

  // SE Guest Suite partition along x = 23, z = 93..101 (doorway at z = 96)
  fillBox(23, 2, 93, 23, 5, 101, VOXEL_ID.CREAM_WALL);
  set(23, 2, 96, VOXEL_ID.DOOR_WOOD_CLOSED);
  set(23, 3, 96, VOXEL_ID.DOOR_WOOD_CLOSED);
  set(23, 4, 96, VOXEL_ID.CHARCOAL_TRIM);

  // 3. 2nd Floor Structure (y = 7..10, ceiling slab at y = 11)
  buildVillaStory(
    ops,
    x0,
    7,
    z0,
    x1,
    z1,
    VOXEL_ID.WHITE_WALL,
    VOXEL_ID.CHARCOAL_TRIM,
    VOXEL_ID.OAK_FLOOR,
    VOXEL_ID.WHITE_WALL,
  );
  fillBox(x0, 7, z0 + 1, x0, 10, z0 + 3, VOXEL_ID.MINT_WALL);
  fillBox(x0, 7, z1 - 3, x0, 10, z1 - 1, VOXEL_ID.MINT_WALL);

  // Grand Interior Staircase (climbing East x = 24..27, z = 90..91 from 1F y=2 up to 2F y=7)
  for (let s = 0; s < 4; s++) {
    const sx = 24 + s;
    fillBox(sx, 2, 90, sx, 10, 91, VOXEL_ID.AIR);
    const minStepY = s === 0 ? 2 : 2 + s - 1;
    fillBox(sx, minStepY, 90, sx, 2 + s, 91, VOXEL_ID.OAK_FLOOR);
    markFixedBox(ops, sx, minStepY, 90, sx, 2 + s, 91);
  }
  // Open stairwell landing at x = 28, z = 90..91 so 2F floor stays smooth & clear
  fillBox(28, 6, 90, 28, 6, 91, VOXEL_ID.OAK_FLOOR);
  // Subtle stairwell safety rail along 2F opening sides
  fillBox(24, 7, 89, 27, 7, 89, VOXEL_ID.CHARCOAL_TRIM);
  fillBox(24, 7, 92, 27, 7, 92, VOXEL_ID.CHARCOAL_TRIM);
  fillBox(23, 7, 89, 23, 7, 92, VOXEL_ID.CHARCOAL_TRIM);

  // 2F Master Bedroom Partition (z = 88, x = 11..22, door at x = 17)
  fillBox(11, 7, 88, 22, 10, 88, VOXEL_ID.CREAM_WALL);
  set(17, 7, 88, VOXEL_ID.DOOR_MINT_CLOSED);
  set(17, 8, 88, VOXEL_ID.DOOR_MINT_CLOSED);
  set(17, 9, 88, VOXEL_ID.CHARCOAL_TRIM);

  // 2F Panoramic Windows
  fillBox(x0, 8, 83, x0, 9, 86, VOXEL_ID.GLASS);
  fillBox(x0, 8, 95, x0, 9, 98, VOXEL_ID.GLASS);
  fillBox(13, 8, z0, 20, 9, z0, VOXEL_ID.GLASS);
  fillBox(25, 8, z0, 31, 9, z0, VOXEL_ID.GLASS);
  fillBox(13, 8, z1, 20, 9, z1, VOXEL_ID.GLASS);
  fillBox(25, 8, z1, 31, 9, z1, VOXEL_ID.GLASS);
  fillBox(x1, 8, 84, x1, 9, 88, VOXEL_ID.GLASS);
  fillBox(x1, 8, 94, x1, 9, 98, VOXEL_ID.GLASS);

  // 4. Walkable 2nd-Floor Front Balcony (x in [7..10], z in [86..95]) above the front porch
  // Balcony floor slab at y = 6 (walkable surface y = 7), also forms welcoming covered front porch overhang!
  fillBox(7, 6, 86, 9, 6, 95, VOXEL_ID.OAK_FLOOR);
  // Balcony support columns standing on front porch apron
  fillBox(7, 2, 86, 7, 5, 86, VOXEL_ID.WHITE_WALL);
  fillBox(7, 2, 95, 7, 5, 95, VOXEL_ID.WHITE_WALL);
  markFixedBox(ops, 7, 2, 86, 7, 5, 86);
  markFixedBox(ops, 7, 2, 95, 7, 5, 95);
  // Glass & trim safety railings on the 2F balcony
  for (let bz = 86; bz <= 95; bz++) {
    set(7, 7, bz, VOXEL_ID.GLASS);
  }
  for (let bx = 7; bx <= 9; bx++) {
    set(bx, 7, 86, VOXEL_ID.GLASS);
    set(bx, 7, 95, VOXEL_ID.GLASS);
  }
  set(7, 7, 86, VOXEL_ID.CHARCOAL_TRIM);
  set(7, 7, 95, VOXEL_ID.CHARCOAL_TRIM);
  // Balcony door from 2F Master Bedroom / Hallway (x = 10, z = 90..91)
  set(x0, 7, 90, VOXEL_ID.DOOR_SKY_CLOSED);
  set(x0, 8, 90, VOXEL_ID.DOOR_SKY_CLOSED);
  set(x0, 7, 91, VOXEL_ID.DOOR_SKY_CLOSED);
  set(x0, 8, 91, VOXEL_ID.DOOR_SKY_CLOSED);
  set(x0, 9, 90, VOXEL_ID.CHARCOAL_TRIM);
  set(x0, 9, 91, VOXEL_ID.CHARCOAL_TRIM);

  // 5. Grand Sealed Pitched Roof (starting at y = 11)
  const span = z1 - z0 + 1;
  const layers = Math.ceil(span / 2);
  for (let step = 0; step < layers; step++) {
    const ry = 11 + step;
    const pz0 = z0 + step;
    const pz1 = z1 - step;
    if (pz0 > pz1) break;
    for (let x = x0; x <= x1; x++) {
      set(x, ry, pz0, VOXEL_ID.SLATE_ROOF);
      set(x, ry, pz1, VOXEL_ID.SLATE_ROOF);
    }
    if (step > 0 && pz1 - pz0 >= 2) {
      for (let z = pz0 + 1; z <= pz1 - 1; z++) {
        set(x0, ry, z, VOXEL_ID.WHITE_WALL);
        set(x1, ry, z, VOXEL_ID.WHITE_WALL);
      }
    }
  }
  // Roof parapet accent finial
  markFixed?.(x0, 11, z0);
}
