export interface HouseDefinition {
  id: string;
  name: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  floors: number[]; // walkable floor surface Ys (2, 7, 12)
  // Optional setback for Floor 3 roof-floor variants
  topFloorBounds?: { x0: number; x1: number; z0: number; z1: number };
  doorSpawn: { x: number; z: number; yaw: number };
}

export interface PlacedFurnitureRecord {
  id: string;
  itemId: string;
  houseId: string;
  x: number;
  y: number; // floorSurfaceY (2, 7, or 12)
  z: number;
  rotY: number; // radians
  stateOn?: boolean;
}

const PLACED_FURNITURE_STORAGE_KEY = 'spc_city_placed_furniture_v1';

export const STARTER_VILLA_ID = 'house_0_dream_villa';

export const STARTER_VILLA_HOUSE_DEF: HouseDefinition = {
  id: STARTER_VILLA_ID,
  name: "Player's Dream Villa",
  x0: 10,
  x1: 34,
  z0: 80,
  z1: 102,
  floors: [2, 7],
  doorSpawn: { x: 7.5, z: 90.5, yaw: -Math.PI / 2 },
};

/**
 * Exact interior footprints matching Player's Dream Villa + all 19 neighborhood houses.
 */
export const PLAYER_HOUSES: HouseDefinition[] = [
  STARTER_VILLA_HOUSE_DEF,
  {
    id: 'house_1_ne_villa',
    name: 'Sky Villa',
    x0: 5,
    x1: 18,
    z0: -18,
    z1: -5,
    floors: [2, 7, 12],
    doorSpawn: { x: 3.2, z: -10.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_2_mint_mansion',
    name: 'Mint Mansion',
    x0: -18,
    x1: -5,
    z0: -38,
    z1: -25,
    floors: [2, 7, 12],
    topFloorBounds: { x0: -17, x1: -6, z0: -37, z1: -26 },
    doorSpawn: { x: -11.5, z: -23.2, yaw: 0 },
  },
  {
    id: 'house_3_pastel_villa',
    name: 'Pastel Sky Villa',
    x0: -38,
    x1: -25,
    z0: 25,
    z1: 38,
    floors: [2, 7, 12],
    doorSpawn: { x: -31.5, z: 23.2, yaw: Math.PI },
  },
  {
    id: 'house_4_coral_townhouse',
    name: 'Coral Townhouse',
    x0: 12,
    x1: 19,
    z0: 12,
    z1: 19,
    floors: [2, 7, 12],
    doorSpawn: { x: 10.2, z: 15.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_5_cream_home',
    name: 'Cream Residence',
    x0: 26,
    x1: 38,
    z0: -18,
    z1: -5,
    floors: [2, 7],
    doorSpawn: { x: 24.2, z: -11.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_6_nw_coral_town',
    name: 'Corner Coral House',
    x0: -13,
    x1: -4,
    z0: -13,
    z1: -4,
    floors: [2, 7],
    doorSpawn: { x: -8.5, z: -2.2, yaw: 0 },
  },
  {
    id: 'house_7_brick_suburban',
    name: 'Brick Family Home',
    x0: -19,
    x1: -9,
    z0: 10,
    z1: 19,
    floors: [2, 7],
    doorSpawn: { x: -14.5, z: 20.8, yaw: 0 },
  },
  {
    id: 'house_8_mint_house',
    name: 'Mint & Oak House',
    x0: 26,
    x1: 37,
    z0: -36,
    z1: -25,
    floors: [2, 7],
    doorSpawn: { x: 31.5, z: -23.2, yaw: 0 },
  },
  {
    id: 'house_9_sky_west',
    name: 'West Sky House',
    x0: -37,
    x1: -26,
    z0: -18,
    z1: -7,
    floors: [2, 7],
    doorSpawn: { x: -24.2, z: -12.5, yaw: Math.PI / 2 },
  },
  {
    id: 'house_10_twin_duplex',
    name: 'Pastel Duplex',
    x0: 5,
    x1: 18,
    z0: 25,
    z1: 36,
    floors: [2, 7],
    doorSpawn: { x: 7.5, z: 23.2, yaw: Math.PI },
  },
  {
    id: 'house_11_se_courtyard',
    name: 'Courtyard Villa',
    x0: 26,
    x1: 37,
    z0: 26,
    z1: 36,
    floors: [2, 7],
    doorSpawn: { x: 30.5, z: 24.2, yaw: Math.PI },
  },
  {
    id: 'house_12_nw_studio',
    name: 'Coral Studio',
    x0: -19,
    x1: -11,
    z0: -19,
    z1: -14,
    floors: [2],
    doorSpawn: { x: -15, z: -20.8, yaw: Math.PI },
  },
  {
    id: 'house_13_starter_mint',
    name: 'Starter Mint Home',
    x0: -12,
    x1: -4,
    z0: 4,
    z1: 9,
    floors: [2],
    doorSpawn: { x: -2.2, z: 6.5, yaw: Math.PI / 2 },
  },
  {
    id: 'house_14_cream_bungalow',
    name: 'Cream Bungalow',
    x0: 4,
    x1: 10,
    z0: -34,
    z1: -26,
    floors: [2],
    doorSpawn: { x: 7, z: -24.2, yaw: 0 },
  },
  {
    id: 'house_15_sky_cottage',
    name: 'Sky Cottage',
    x0: 12,
    x1: 19,
    z0: -36,
    z1: -27,
    floors: [2],
    doorSpawn: { x: 15.5, z: -25.2, yaw: 0 },
  },
  {
    id: 'house_16_west_mint_starter',
    name: 'West Mint Home',
    x0: -34,
    x1: -25,
    z0: 5,
    z1: 11,
    floors: [2],
    doorSpawn: { x: -23.2, z: 7.5, yaw: Math.PI / 2 },
  },
  {
    id: 'house_17_oak_cottage',
    name: 'Oak Cottage',
    x0: -38,
    x1: -28,
    z0: 13,
    z1: 19,
    floors: [2],
    doorSpawn: { x: -33.5, z: 11.2, yaw: Math.PI },
  },
  {
    id: 'house_18_south_sky_bungalow',
    name: 'South Sky Bungalow',
    x0: -16,
    x1: -6,
    z0: 26,
    z1: 35,
    floors: [2],
    doorSpawn: { x: -11.5, z: 24.2, yaw: Math.PI },
  },
  {
    id: 'house_19_east_coral_house',
    name: 'East Coral House',
    x0: 26,
    x1: 36,
    z0: 8,
    z1: 16,
    floors: [2],
    doorSpawn: { x: 24.2, z: 11.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_20_maple_oak_cottage',
    name: 'Maple Oak Cottage',
    x0: -34,
    x1: -22,
    z0: -106,
    z1: -96,
    floors: [2],
    doorSpawn: { x: -28.5, z: -94, yaw: Math.PI },
  },
  {
    id: 'house_21_lavender_sky_res',
    name: 'Lavender & Sky Residence',
    x0: -18,
    x1: -5,
    z0: -108,
    z1: -96,
    floors: [2, 7],
    doorSpawn: { x: -11.5, z: -94, yaw: Math.PI },
  },
  {
    id: 'house_22_pinecrest_villa',
    name: 'Pinecrest Woodland Villa',
    x0: 44,
    x1: 58,
    z0: -107,
    z1: -96,
    floors: [2, 7],
    doorSpawn: { x: 50.5, z: -94, yaw: Math.PI },
  },
  {
    id: 'house_23_sunset_mint_villa',
    name: 'Sunset Mint Villa',
    x0: -110,
    x1: -97,
    z0: -40,
    z1: -26,
    floors: [2, 7],
    doorSpawn: { x: -95, z: -33.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_24_garden_oak_bungalow',
    name: 'Garden Oak Bungalow',
    x0: -109,
    x1: -97,
    z0: 6,
    z1: 18,
    floors: [2],
    doorSpawn: { x: -95, z: 11.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'house_25_emerald_townhouse',
    name: 'Emerald Townhouse',
    x0: 112,
    x1: 125,
    z0: -42,
    z1: -28,
    floors: [2, 7],
    doorSpawn: { x: 110, z: -35.5, yaw: Math.PI / 2 },
  },
  {
    id: 'house_26_pastel_coral_home',
    name: 'Pastel Coral Home',
    x0: 112,
    x1: 126,
    z0: 8,
    z1: 22,
    floors: [2, 7],
    doorSpawn: { x: 110, z: 14.5, yaw: Math.PI / 2 },
  },
  {
    id: 'house_27_sunny_corner_cottage',
    name: 'Sunny Corner Cottage',
    x0: 72,
    x1: 84,
    z0: -42,
    z1: -30,
    floors: [2],
    doorSpawn: { x: 77.5, z: -44, yaw: 0 },
  },
];

export interface HouseMatch {
  house: HouseDefinition;
  floorSurfaceY: number;
  bounds: { x0: number; x1: number; z0: number; z1: number };
}

/**
 * Returns active house & floor level if (x, y, z) is inside any of the 19 neighborhood houses.
 */
export function findHouseAt(x: number, y: number, z: number): HouseMatch | null {
  for (let i = 0; i < PLAYER_HOUSES.length; i++) {
    const h = PLAYER_HOUSES[i];
    // Quick outer bounds filter (allow slight door-threshold margin)
    if (x < h.x0 + 0.35 || x > h.x1 - 0.35 || z < h.z0 + 0.35 || z > h.z1 - 0.35) {
      continue;
    }

    // Match closest story floor <= y + 0.8 (must be below roof level)
    let matchedFloor: number | null = null;
    for (let f = h.floors.length - 1; f >= 0; f--) {
      const fy = h.floors[f];
      if (y >= fy - 0.45 && y <= fy + 3.6) {
        matchedFloor = fy;
        break;
      }
    }
    if (matchedFloor === null) continue;

    const bounds =
      matchedFloor >= 12 && h.topFloorBounds
        ? h.topFloorBounds
        : { x0: h.x0, x1: h.x1, z0: h.z0, z1: h.z1 };

    if (
      x < bounds.x0 + 0.35 ||
      x > bounds.x1 - 0.35 ||
      z < bounds.z0 + 0.35 ||
      z > bounds.z1 - 0.35
    ) {
      continue;
    }

    return {
      house: h,
      floorSurfaceY: matchedFloor,
      bounds,
    };
  }
  return null;
}

export function getRotatedHalfExtents(
  halfW: number,
  halfD: number,
  rotY: number,
): { rx: number; rz: number } {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  return {
    rx: halfW * c + halfD * s,
    rz: halfW * s + halfD * c,
  };
}

export function boxesOverlapXZ(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number,
): boolean {
  return Math.abs(ax - bx) < ahx + bhx - 0.04 && Math.abs(az - bz) < ahz + bhz - 0.04;
}

export function loadPlacedFurniture(): PlacedFurnitureRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PLACED_FURNITURE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PlacedFurnitureRecord[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const r = entry as Partial<PlacedFurnitureRecord>;
      if (
        typeof r.id === 'string' &&
        typeof r.itemId === 'string' &&
        typeof r.houseId === 'string' &&
        typeof r.x === 'number' &&
        typeof r.y === 'number' &&
        typeof r.z === 'number' &&
        typeof r.rotY === 'number' &&
        Number.isFinite(r.x) &&
        Number.isFinite(r.y) &&
        Number.isFinite(r.z) &&
        Number.isFinite(r.rotY)
      ) {
        out.push({
          id: r.id,
          itemId: r.itemId,
          houseId: r.houseId,
          x: r.x,
          y: r.y,
          z: r.z,
          rotY: r.rotY,
          stateOn: typeof r.stateOn === 'boolean' ? r.stateOn : true,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function savePlacedFurniture(records: PlacedFurnitureRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLACED_FURNITURE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
