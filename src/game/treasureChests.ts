import * as THREE from 'three';
import { getVoxel, isFoliagePlantVoxel } from './terrain';
import { VOXEL_ID, VoxelId } from './types';

export interface TreasureChestSpot {
  id: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  zone: 'forest' | 'city';
  hint: string;
}

export const CHEST_REWARD_OPTIONS = [10, 15, 20] as const;
export type ChestRewardAmount = (typeof CHEST_REWARD_OPTIONS)[number];

/** All Coin Chests refresh, close, restock with new coins, and move every 20 minutes. */
export const CHEST_REFRESH_INTERVAL_MS = 20 * 60 * 1000;
export const ACTIVE_CHEST_COUNT = 36;
const MIN_RELOCATION_DISTANCE_BLOCKS = 6;

const OPENED_CHESTS_STORAGE_KEY = 'spc_city_opened_chests_v1';
const CHEST_STATE_STORAGE_KEY = 'spc_city_chest_state_v2';

export interface PersistentChestRecord extends TreasureChestSpot {
  opened: boolean;
  coins: ChestRewardAmount;
  openedAt: number | null;
  spotKey: string;
}

export interface PersistentChestCycleState {
  version: 2;
  lastRefreshAt: number;
  nextRefreshAt: number;
  chests: PersistentChestRecord[];
}

export function rollChestReward(): ChestRewardAmount {
  const idx = Math.floor(Math.random() * CHEST_REWARD_OPTIONS.length);
  return CHEST_REWARD_OPTIONS[idx] ?? 15;
}

function sanitizeRewardAmount(raw: unknown): ChestRewardAmount {
  if (raw === 10 || raw === 15 || raw === 20) return raw;
  return rollChestReward();
}

export function makeSpotKey(x: number, z: number): string {
  return `${Math.round(x)},${Math.round(z)}`;
}

export function loadOpenedChests(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OPENED_CHESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0,
        ),
      ),
    );
  } catch {
    return [];
  }
}

export function saveOpenedChests(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(
      new Set(ids.filter((id) => typeof id === 'number' && Number.isInteger(id) && id > 0)),
    );
    window.localStorage.setItem(OPENED_CHESTS_STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // Ignore storage quota errors
  }
}

interface RawChestSeed {
  id: number;
  gx: number;
  gz: number;
  yaw: number;
  zone: 'forest' | 'city';
  hint: string;
}

// Initial 36 chest seeds (strictly inside walkable forest, city, and outer exploration bounds).
const RAW_CHEST_SEEDS: readonly RawChestSeed[] = [
  // North Whispering Woods
  { id: 1, gx: -118, gz: -124, yaw: 0.4, zone: 'forest', hint: 'North Woods' },
  { id: 2, gx: -92, gz: -126, yaw: 0.0, zone: 'forest', hint: 'North Woods' },
  { id: 3, gx: -78, gz: -117, yaw: 0.9, zone: 'forest', hint: 'North Pond' },
  { id: 4, gx: -48, gz: -124, yaw: -0.3, zone: 'forest', hint: 'North Woods' },
  { id: 5, gx: -14, gz: -123, yaw: 0.1, zone: 'forest', hint: 'North Woods' },
  { id: 6, gx: 24, gz: -126, yaw: -0.6, zone: 'forest', hint: 'North Woods' },
  { id: 7, gx: 58, gz: -121, yaw: 0.5, zone: 'forest', hint: 'North Woods' },
  { id: 8, gx: 90, gz: -125, yaw: -0.8, zone: 'forest', hint: 'North East Pond' },
  { id: 9, gx: 122, gz: -123, yaw: -0.4, zone: 'forest', hint: 'North Woods' },
  // NW & NE Woodland Groves
  { id: 10, gx: -79, gz: -76, yaw: 1.1, zone: 'forest', hint: 'NW Grove' },
  { id: 11, gx: -55, gz: -64, yaw: 2.2, zone: 'forest', hint: 'NW Grove' },
  { id: 12, gx: 77, gz: -77, yaw: -1.2, zone: 'forest', hint: 'NE Grove' },
  { id: 13, gx: 95, gz: -62, yaw: -2.1, zone: 'forest', hint: 'NE Grove' },
  // West Emerald Forest
  { id: 14, gx: -125, gz: -46, yaw: 1.5, zone: 'forest', hint: 'West Woods' },
  { id: 15, gx: -126, gz: 22, yaw: 1.2, zone: 'forest', hint: 'West Pond' },
  { id: 16, gx: -121, gz: 68, yaw: 0.8, zone: 'forest', hint: 'West Woods' },
  { id: 17, gx: -78, gz: 12, yaw: 1.6, zone: 'forest', hint: 'West Thicket' },
  // East Sunlit Forest
  { id: 18, gx: 134, gz: -64, yaw: -1.5, zone: 'forest', hint: 'East Woods' },
  { id: 19, gx: 139, gz: -12, yaw: -1.4, zone: 'forest', hint: 'East Pond' },
  { id: 20, gx: 134, gz: 46, yaw: -1.7, zone: 'forest', hint: 'East Woods' },
  { id: 21, gx: 86, gz: -32, yaw: -1.5, zone: 'forest', hint: 'East Thicket' },
  // SW & SE Woodland Groves
  { id: 22, gx: -84, gz: 74, yaw: 0.3, zone: 'forest', hint: 'SW Grove' },
  { id: 23, gx: -46, gz: 88, yaw: -0.4, zone: 'forest', hint: 'SW Grove' },
  { id: 24, gx: 72, gz: 84, yaw: 2.6, zone: 'forest', hint: 'SE Grove' },
  { id: 25, gx: 96, gz: 68, yaw: -2.4, zone: 'forest', hint: 'SE Grove' },
  // Secret City & Coastal Cove Alcoves
  { id: 26, gx: -44, gz: 20, yaw: 1.57, zone: 'city', hint: 'Park Shrubs' },
  { id: 27, gx: 48, gz: 36, yaw: -1.57, zone: 'city', hint: 'Villa Garden' },
  { id: 28, gx: -115, gz: 148, yaw: 0.25, zone: 'city', hint: 'West Cove' },
  { id: 29, gx: 118, gz: 148, yaw: -0.25, zone: 'city', hint: 'East Cove' },
  { id: 30, gx: 36, gz: -46, yaw: 3.14, zone: 'city', hint: 'North Alley' },
  // Outer Exploration Groves & Landmarks
  { id: 31, gx: -166, gz: -66, yaw: 0.7, zone: 'forest', hint: 'West Horizon Pond' },
  { id: 32, gx: -162, gz: -160, yaw: 0.4, zone: 'forest', hint: 'Far NW Pines' },
  { id: 33, gx: 90, gz: -172, yaw: -0.5, zone: 'forest', hint: 'Lodge Pond' },
  { id: 34, gx: 170, gz: -68, yaw: -1.4, zone: 'forest', hint: 'Outer East Pines' },
  { id: 35, gx: 162, gz: 10, yaw: -1.5, zone: 'city', hint: 'Fashion Plaza Garden' },
  { id: 36, gx: -158, gz: -24, yaw: 1.5, zone: 'city', hint: 'Observatory Overlook' },
];

// Additional relocation candidate spots around houses, villas, city sidewalks, plazas, beach & woods
// so every 20-minute refresh moves chests cleanly to fresh, never-repeating locations.
const EXTRA_RELOCATION_SEEDS: ReadonlyArray<Omit<RawChestSeed, 'id'>> = [
  // Houses & Residential Yards
  { gx: 39, gz: 92, yaw: -1.5, zone: 'city', hint: 'Dream Villa East Yard' },
  { gx: 22, gz: 109, yaw: 0.0, zone: 'city', hint: 'Dream Villa Back Lawn' },
  { gx: 4, gz: 98, yaw: 1.5, zone: 'city', hint: 'Dream Villa Garden Gate' },
  { gx: -38, gz: -102, yaw: 1.5, zone: 'city', hint: 'Maple Cottage Yard' },
  { gx: -14, gz: -112, yaw: 0.0, zone: 'city', hint: 'Lavender Villa Lawn' },
  { gx: 61, gz: -102, yaw: -1.5, zone: 'city', hint: 'Pinecrest Villa Yard' },
  { gx: -114, gz: -33, yaw: 1.5, zone: 'city', hint: 'Sunset Mint Villa Yard' },
  { gx: -113, gz: 12, yaw: 1.5, zone: 'city', hint: 'Garden Oak Bungalow Yard' },
  { gx: 88, gz: -36, yaw: -1.5, zone: 'city', hint: 'Sunny Corner Cottage Yard' },
  { gx: 34, gz: 36, yaw: 0.5, zone: 'city', hint: 'East Villa Lawn' },
  { gx: -36, gz: 36, yaw: -0.5, zone: 'city', hint: 'West Villa Lawn' },
  { gx: -35, gz: -35, yaw: 0.8, zone: 'city', hint: 'North-West Residence Garden' },
  { gx: 35, gz: -35, yaw: -0.8, zone: 'city', hint: 'North-East Residence Garden' },
  // City Plazas, Civic Buildings & Courtyards
  { gx: 14, gz: 14, yaw: 0.4, zone: 'city', hint: 'Central Park Bench' },
  { gx: -14, gz: -14, yaw: -0.4, zone: 'city', hint: 'Central Plaza Corner' },
  { gx: -25, gz: -62, yaw: 1.5, zone: 'city', hint: 'School Courtyard' },
  { gx: 22, gz: -62, yaw: -1.5, zone: 'city', hint: 'Library Garden' },
  { gx: -46, gz: -62, yaw: 1.5, zone: 'city', hint: 'Hospital West Walk' },
  { gx: 42, gz: -62, yaw: -1.5, zone: 'city', hint: 'Police Side Lawn' },
  { gx: 64, gz: -62, yaw: -1.5, zone: 'city', hint: 'Fire Station Yard' },
  { gx: 69, gz: -32, yaw: -1.5, zone: 'city', hint: 'Supermarket Alley' },
  { gx: 65, gz: -12, yaw: -1.5, zone: 'city', hint: 'Coffee Shop Patio' },
  { gx: 97, gz: 0, yaw: -1.5, zone: 'city', hint: 'Shopping Mall East Plaza' },
  { gx: 67, gz: 14, yaw: -1.5, zone: 'city', hint: 'Restaurant Patio' },
  { gx: -68, gz: -32, yaw: 1.5, zone: 'city', hint: 'Game Center Alley' },
  { gx: -69, gz: -12, yaw: 1.5, zone: 'city', hint: 'Cinema Sidewalk' },
  { gx: -68, gz: 14, yaw: 1.5, zone: 'city', hint: 'Dance Club Courtyard' },
  { gx: -26, gz: 59, yaw: 1.5, zone: 'city', hint: 'Gym Courtyard' },
  { gx: 25, gz: 60, yaw: -1.5, zone: 'city', hint: 'Hotel Palm Garden' },
  { gx: 48, gz: 60, yaw: -1.5, zone: 'city', hint: 'Car Showroom Plaza' },
  { gx: 127, gz: -10, yaw: -1.5, zone: 'city', hint: 'Flower Boutique Yard' },
  { gx: 173, gz: -11, yaw: -1.5, zone: 'city', hint: 'Fashion Arena Terrace' },
  { gx: -171, gz: -12, yaw: 1.5, zone: 'city', hint: 'Observatory West Trail' },
  { gx: 76, gz: -153, yaw: -1.5, zone: 'city', hint: 'Woods Lodge Porch' },
  // Coastal Beach & Waterfront Promenades
  { gx: -42, gz: 136, yaw: 0.2, zone: 'city', hint: 'West Beach Palms' },
  { gx: 44, gz: 136, yaw: -0.2, zone: 'city', hint: 'East Beach Palms' },
  { gx: -78, gz: 140, yaw: 0.4, zone: 'city', hint: 'West Coast Dunes' },
  { gx: 78, gz: 140, yaw: -0.4, zone: 'city', hint: 'East Coast Dunes' },
  { gx: 16, gz: 142, yaw: 0.0, zone: 'city', hint: 'Pier Boardwalk' },
  // Additional Forest Groves & Clearings
  { gx: -136, gz: -108, yaw: 0.8, zone: 'forest', hint: 'Deep NW Woods' },
  { gx: 126, gz: -108, yaw: -0.8, zone: 'forest', hint: 'Deep NE Woods' },
  { gx: -102, gz: -162, yaw: 0.3, zone: 'forest', hint: 'North Outer Timber' },
  { gx: -22, gz: -162, yaw: -0.2, zone: 'forest', hint: 'North Boundary Pines' },
  { gx: 26, gz: -162, yaw: 0.2, zone: 'forest', hint: 'North Meadow Pines' },
  { gx: 128, gz: -162, yaw: -0.5, zone: 'forest', hint: 'NE Pine Ridge' },
  { gx: -158, gz: -108, yaw: 1.1, zone: 'forest', hint: 'Far West Pines' },
  { gx: -160, gz: 36, yaw: 1.4, zone: 'forest', hint: 'Outer West Trail' },
  { gx: -152, gz: 84, yaw: 0.9, zone: 'forest', hint: 'SW Horizon Woods' },
  { gx: 164, gz: -112, yaw: -1.1, zone: 'forest', hint: 'Far East Timber' },
  { gx: 164, gz: 36, yaw: -1.4, zone: 'forest', hint: 'Outer East Meadow' },
  { gx: 152, gz: 84, yaw: -0.9, zone: 'forest', hint: 'SE Horizon Woods' },
  { gx: -68, gz: 98, yaw: 0.5, zone: 'forest', hint: 'South-West Pines' },
  { gx: 68, gz: 102, yaw: -0.5, zone: 'forest', hint: 'South-East Pines' },
  { gx: -108, gz: 108, yaw: 0.6, zone: 'forest', hint: 'West Coastal Grove' },
];

function isWalkableChestGroundVoxel(id: VoxelId): boolean {
  return (
    id === VOXEL_ID.GRASS ||
    id === VOXEL_ID.DIRT ||
    id === VOXEL_ID.SAND ||
    id === VOXEL_ID.SIDEWALK ||
    id === VOXEL_ID.STONE ||
    id === VOXEL_ID.MOSS_STONE ||
    id === VOXEL_ID.CONCRETE ||
    id === VOXEL_ID.OAK_FLOOR
  );
}

function findGroundSurfaceY(gx: number, gz: number): number | null {
  for (let by = 1; by <= 3; by++) {
    const id = getVoxel(gx, by, gz);
    if (!isWalkableChestGroundVoxel(id)) continue;
    const a1 = getVoxel(gx, by + 1, gz);
    const a2 = getVoxel(gx, by + 2, gz);
    if (
      (a1 === VOXEL_ID.AIR || isFoliagePlantVoxel(a1)) &&
      (a2 === VOXEL_ID.AIR || isFoliagePlantVoxel(a2))
    ) {
      return by + 1;
    }
  }
  return null;
}

function hasWalkableApproachNeighbor(gx: number, gz: number): boolean {
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < dirs.length; i++) {
    const nx = gx + dirs[i][0];
    const nz = gz + dirs[i][1];
    if (findGroundSurfaceY(nx, nz) !== null) return true;
  }
  return false;
}

function snapChestSeedToOpenFloor(seed: RawChestSeed): TreasureChestSpot {
  const clampX = (x: number) => Math.max(-186, Math.min(186, x));
  const clampZ = (z: number) => Math.max(-186, Math.min(160, z));

  // Search spiral offsets (prefer clean air without foliage and a walkable approach side, then allow foliage)
  let fallback: TreasureChestSpot | null = null;
  for (let r = 0; r <= 5; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const gx = clampX(seed.gx + dx);
        const gz = clampZ(seed.gz + dz);
        const surfaceY = findGroundSurfaceY(gx, gz);
        if (surfaceY === null) continue;
        if (!hasWalkableApproachNeighbor(gx, gz)) continue;
        const by = surfaceY - 1;
        const a1 = getVoxel(gx, by + 1, gz);
        const a2 = getVoxel(gx, by + 2, gz);
        if (a1 === VOXEL_ID.AIR && a2 === VOXEL_ID.AIR) {
          return {
            id: seed.id,
            x: gx,
            y: surfaceY,
            z: gz,
            yaw: seed.yaw,
            zone: seed.zone,
            hint: seed.hint,
          };
        }
        if (!fallback) {
          fallback = {
            id: seed.id,
            x: gx,
            y: surfaceY,
            z: gz,
            yaw: seed.yaw,
            zone: seed.zone,
            hint: seed.hint,
          };
        }
      }
    }
  }

  return (
    fallback ?? {
      id: seed.id,
      x: clampX(seed.gx),
      y: 2,
      z: clampZ(seed.gz),
      yaw: seed.yaw,
      zone: seed.zone,
      hint: seed.hint,
    }
  );
}

export const TREASURE_CHEST_SPOTS: TreasureChestSpot[] = RAW_CHEST_SEEDS.map(
  snapChestSeedToOpenFloor,
);

let cachedRelocationPool: TreasureChestSpot[] | null = null;

/**
 * Returns the deduplicated pool of validated walkable spots across forests,
 * house yards, city plazas, landmarks, and coastal coves.
 */
export function getChestRelocationPool(): TreasureChestSpot[] {
  if (cachedRelocationPool) return cachedRelocationPool;
  const allSeeds: RawChestSeed[] = [
    ...RAW_CHEST_SEEDS,
    ...EXTRA_RELOCATION_SEEDS.map((seed, idx) => ({
      id: RAW_CHEST_SEEDS.length + idx + 1,
      ...seed,
    })),
  ];
  const deduped: TreasureChestSpot[] = [];
  const usedCoords = new Set<string>();
  for (let i = 0; i < allSeeds.length; i++) {
    const snapped = snapChestSeedToOpenFloor(allSeeds[i]);
    const key = makeSpotKey(snapped.x, snapped.z);
    if (usedCoords.has(key)) continue;
    // Keep at least 4 blocks spacing between candidate pool points so two chests never stack
    let tooClose = false;
    for (let j = 0; j < deduped.length; j++) {
      const dx = deduped[j].x - snapped.x;
      const dz = deduped[j].z - snapped.z;
      if (dx * dx + dz * dz < 16) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    usedCoords.add(key);
    deduped.push(snapped);
  }
  cachedRelocationPool = deduped;
  return deduped;
}

function createSeededDefaultChests(openedIds: readonly number[] = [], openedTimestamp: number | null = null): PersistentChestRecord[] {
  const openedSet = new Set(openedIds);
  const spots = RAW_CHEST_SEEDS.map(snapChestSeedToOpenFloor);
  return spots.map((spot) => {
    const isOpened = openedSet.has(spot.id);
    return {
      ...spot,
      opened: isOpened,
      coins: rollChestReward(),
      openedAt: isOpened ? openedTimestamp : null,
      spotKey: makeSpotKey(spot.x, spot.z),
    };
  });
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Picks 36 distinct validated spots for a full refresh, ensuring no chest remains
 * at its previous spot and no two chests occupy the same spot.
 */
function pickRelocatedChestSpots(previousChests: readonly PersistentChestRecord[]): PersistentChestRecord[] {
  const pool = getChestRelocationPool();
  const prevById = new Map<number, PersistentChestRecord>();
  for (let i = 0; i < previousChests.length; i++) {
    prevById.set(previousChests[i].id, previousChests[i]);
  }

  const shuffledIndices = shuffleInPlace(pool.map((_, idx) => idx));
  const usedCandidateIndices = new Set<number>();
  const usedSpotKeys = new Set<string>();
  const nextChests: PersistentChestRecord[] = [];
  const minDistSq = MIN_RELOCATION_DISTANCE_BLOCKS * MIN_RELOCATION_DISTANCE_BLOCKS;

  for (let id = 1; id <= ACTIVE_CHEST_COUNT; id++) {
    const prev = prevById.get(id);
    let chosenIdx = -1;

    // Pass 1: pick a shuffled spot strictly far (>= 6 blocks) from this chest's previous spot
    for (let k = 0; k < shuffledIndices.length; k++) {
      const idx = shuffledIndices[k];
      if (usedCandidateIndices.has(idx)) continue;
      const cand = pool[idx];
      const key = makeSpotKey(cand.x, cand.z);
      if (usedSpotKeys.has(key)) continue;
      if (prev) {
        if (key === prev.spotKey) continue;
        const dx = cand.x - prev.x;
        const dz = cand.z - prev.z;
        if (dx * dx + dz * dz < minDistSq) continue;
      }
      chosenIdx = idx;
      break;
    }

    // Pass 2 fallback: pick the farthest unused spot from previous spot (still never identical)
    if (chosenIdx < 0) {
      let bestDistSq = -1;
      for (let k = 0; k < shuffledIndices.length; k++) {
        const idx = shuffledIndices[k];
        if (usedCandidateIndices.has(idx)) continue;
        const cand = pool[idx];
        const key = makeSpotKey(cand.x, cand.z);
        if (usedSpotKeys.has(key)) continue;
        if (!prev) {
          chosenIdx = idx;
          break;
        }
        const dx = cand.x - prev.x;
        const dz = cand.z - prev.z;
        const dSq = dx * dx + dz * dz;
        if (key !== prev.spotKey && dSq > bestDistSq) {
          bestDistSq = dSq;
          chosenIdx = idx;
        }
      }
    }

    const baseSpot =
      chosenIdx >= 0
        ? pool[chosenIdx]
        : TREASURE_CHEST_SPOTS[(id - 1) % TREASURE_CHEST_SPOTS.length];
    if (chosenIdx >= 0) {
      usedCandidateIndices.add(chosenIdx);
    }

    // Re-snap dynamically against live world blocks in case player built over the candidate spot
    const liveSnapped = snapChestSeedToOpenFloor({
      id,
      gx: Math.round(baseSpot.x),
      gz: Math.round(baseSpot.z),
      yaw: baseSpot.yaw,
      zone: baseSpot.zone,
      hint: baseSpot.hint,
    });
    const finalSpot = usedSpotKeys.has(makeSpotKey(liveSnapped.x, liveSnapped.z))
      ? baseSpot
      : liveSnapped;
    const finalKey = makeSpotKey(finalSpot.x, finalSpot.z);
    usedSpotKeys.add(finalKey);

    nextChests.push({
      id,
      x: finalSpot.x,
      y: finalSpot.y,
      z: finalSpot.z,
      yaw: finalSpot.yaw,
      zone: finalSpot.zone,
      hint: finalSpot.hint,
      opened: false,
      coins: rollChestReward(),
      openedAt: null,
      spotKey: finalKey,
    });
  }

  return nextChests;
}

export function createInitialChestCycleState(now = Date.now()): PersistentChestCycleState {
  return {
    version: 2,
    lastRefreshAt: now,
    nextRefreshAt: now + CHEST_REFRESH_INTERVAL_MS,
    chests: createSeededDefaultChests([], null),
  };
}

/**
 * Checks whether the 20-minute chest refresh deadline has elapsed
 * (or if any opened chest has exceeded 20 minutes without refresh).
 */
export function isChestRefreshDue(
  state: PersistentChestCycleState,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(state.nextRefreshAt) || state.nextRefreshAt <= 0) {
    return true;
  }
  if (now >= state.nextRefreshAt) {
    return true;
  }
  // Safety invariant: never allow any opened/empty chest to stay open past 20 minutes
  for (let i = 0; i < state.chests.length; i++) {
    const chest = state.chests[i];
    if (!chest.opened) continue;
    const refTime = chest.openedAt ?? state.lastRefreshAt;
    if (!Number.isFinite(refTime) || now - refTime >= CHEST_REFRESH_INTERVAL_MS) {
      return true;
    }
  }
  return false;
}

export function refreshChestCycleState(
  state: PersistentChestCycleState,
  now = Date.now(),
): PersistentChestCycleState {
  const relocatedChests = pickRelocatedChestSpots(state.chests);
  return {
    version: 2,
    lastRefreshAt: now,
    nextRefreshAt: now + CHEST_REFRESH_INTERVAL_MS,
    chests: relocatedChests,
  };
}

export function refreshChestStateIfDue(
  state: PersistentChestCycleState,
  now = Date.now(),
): { state: PersistentChestCycleState; refreshed: boolean } {
  if (!isChestRefreshDue(state, now)) {
    return { state, refreshed: false };
  }
  return { state: refreshChestCycleState(state, now), refreshed: true };
}

export function sanitizeChestCycleState(
  raw: unknown,
  legacyOpenedIds: readonly number[] = [],
  legacySavedAt?: number,
  now = Date.now(),
): { state: PersistentChestCycleState; refreshed: boolean } {
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<PersistentChestCycleState>;
    const lastRefreshAt =
      typeof obj.lastRefreshAt === 'number' && Number.isFinite(obj.lastRefreshAt) && obj.lastRefreshAt > 0
        ? Math.min(now, obj.lastRefreshAt)
        : typeof legacySavedAt === 'number' && Number.isFinite(legacySavedAt)
          ? Math.min(now, legacySavedAt)
          : now;
    const nextRefreshAt =
      typeof obj.nextRefreshAt === 'number' && Number.isFinite(obj.nextRefreshAt) && obj.nextRefreshAt > 0
        ? obj.nextRefreshAt
        : lastRefreshAt + CHEST_REFRESH_INTERVAL_MS;

    if (Array.isArray(obj.chests) && obj.chests.length > 0) {
      const byId = new Map<number, PersistentChestRecord>();
      const usedSpots = new Set<string>();
      for (let i = 0; i < obj.chests.length; i++) {
        const entry = obj.chests[i] as Partial<PersistentChestRecord> | null;
        if (!entry || typeof entry !== 'object') continue;
        if (
          typeof entry.id !== 'number' ||
          !Number.isInteger(entry.id) ||
          entry.id < 1 ||
          entry.id > ACTIVE_CHEST_COUNT ||
          byId.has(entry.id)
        ) {
          continue;
        }
        if (
          typeof entry.x !== 'number' ||
          typeof entry.y !== 'number' ||
          typeof entry.z !== 'number' ||
          !Number.isFinite(entry.x) ||
          !Number.isFinite(entry.y) ||
          !Number.isFinite(entry.z)
        ) {
          continue;
        }
        const spotKey =
          typeof entry.spotKey === 'string' && entry.spotKey
            ? entry.spotKey
            : makeSpotKey(entry.x, entry.z);
        if (usedSpots.has(spotKey)) continue;
        usedSpots.add(spotKey);

        const opened = Boolean(entry.opened);
        byId.set(entry.id, {
          id: entry.id,
          x: Math.max(-186, Math.min(186, entry.x)),
          y: Math.max(1, Math.min(12, entry.y)),
          z: Math.max(-186, Math.min(160, entry.z)),
          yaw: typeof entry.yaw === 'number' && Number.isFinite(entry.yaw) ? entry.yaw : 0,
          zone: entry.zone === 'city' ? 'city' : 'forest',
          hint: typeof entry.hint === 'string' && entry.hint ? entry.hint : 'City Treasure',
          opened,
          coins: sanitizeRewardAmount(entry.coins),
          openedAt:
            opened && typeof entry.openedAt === 'number' && Number.isFinite(entry.openedAt)
              ? entry.openedAt
              : opened
                ? lastRefreshAt
                : null,
          spotKey,
        });
      }

      if (byId.size === ACTIVE_CHEST_COUNT) {
        const chests = Array.from({ length: ACTIVE_CHEST_COUNT }, (_, i) => byId.get(i + 1)!);
        return refreshChestStateIfDue(
          {
            version: 2,
            lastRefreshAt,
            nextRefreshAt,
            chests,
          },
          now,
        );
      }
    }
  }

  // Legacy save migration: convert earlier openedChests[] + savedAt into v2 cycle state
  const openedList =
    legacyOpenedIds.length > 0 ? legacyOpenedIds : loadOpenedChests();
  const baseTimestamp =
    typeof legacySavedAt === 'number' && Number.isFinite(legacySavedAt) && legacySavedAt > 0
      ? Math.min(now, legacySavedAt)
      : now;

  const migrated: PersistentChestCycleState = {
    version: 2,
    lastRefreshAt: baseTimestamp,
    nextRefreshAt: baseTimestamp + CHEST_REFRESH_INTERVAL_MS,
    chests: createSeededDefaultChests(openedList, openedList.length > 0 ? baseTimestamp : null),
  };
  return refreshChestStateIfDue(migrated, now);
}

export function loadChestCycleState(now = Date.now()): PersistentChestCycleState {
  if (typeof window === 'undefined') {
    return createInitialChestCycleState(now);
  }
  try {
    const raw = window.localStorage.getItem(CHEST_STATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      const { state, refreshed } = sanitizeChestCycleState(parsed, loadOpenedChests(), undefined, now);
      if (refreshed) {
        saveChestCycleState(state);
      }
      return state;
    }
  } catch {
    // Fallback to legacy opened list migration
  }

  const legacyOpened = loadOpenedChests();
  const initial: PersistentChestCycleState = {
    version: 2,
    lastRefreshAt: now,
    nextRefreshAt: now + CHEST_REFRESH_INTERVAL_MS,
    chests: createSeededDefaultChests(legacyOpened, legacyOpened.length > 0 ? now : null),
  };
  saveChestCycleState(initial);
  return initial;
}

export function saveChestCycleState(state: PersistentChestCycleState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHEST_STATE_STORAGE_KEY, JSON.stringify(state));
    const openedIds = state.chests.filter((c) => c.opened).map((c) => c.id);
    saveOpenedChests(openedIds);
  } catch {
    // Ignore storage quota errors
  }
}

export function cloneChestCycleState(state: PersistentChestCycleState): PersistentChestCycleState {
  return {
    version: 2,
    lastRefreshAt: state.lastRefreshAt,
    nextRefreshAt: state.nextRefreshAt,
    chests: state.chests.map((c) => ({ ...c })),
  };
}

interface ChestRuntime {
  record: PersistentChestRecord;
  group: THREE.Group;
  lidPivot: THREE.Group;
  gemMesh: THREE.Mesh;
  lidAngle: number;
}

export interface TreasureChestSystem {
  group: THREE.Group;
  getChestState: () => PersistentChestCycleState;
  setChestState: (state: PersistentChestCycleState) => void;
  setOpenedChests: (ids: Iterable<number>) => void;
  getOpenedChestIds: () => number[];
  isChestOpened: (id: number) => boolean;
  checkAndRefreshIfDue: (now?: number) => boolean;
  findNearestOpenableChest: (
    px: number,
    py: number,
    pz: number,
    maxDist?: number,
  ) => TreasureChestSpot | null;
  openChest: (id: number) => ChestRewardAmount | null;
  update: (elapsed: number, dt: number, playerPos: THREE.Vector3) => void;
  dispose: () => void;
}

export function createTreasureChestSystem(
  initialStateOrIds: PersistentChestCycleState | Iterable<number> = loadChestCycleState(),
  onRefreshed?: (nextState: PersistentChestCycleState) => void,
): TreasureChestSystem {
  const group = new THREE.Group();

  let currentState: PersistentChestCycleState;
  if (
    initialStateOrIds &&
    typeof initialStateOrIds === 'object' &&
    'chests' in initialStateOrIds &&
    Array.isArray(initialStateOrIds.chests)
  ) {
    currentState = sanitizeChestCycleState(initialStateOrIds).state;
  } else {
    const ids = Array.from(initialStateOrIds as Iterable<number>);
    currentState = {
      version: 2,
      lastRefreshAt: Date.now(),
      nextRefreshAt: Date.now() + CHEST_REFRESH_INTERVAL_MS,
      chests: createSeededDefaultChests(ids, ids.length > 0 ? Date.now() : null),
    };
  }

  // Shared geometries & materials for minimal 4GB RAM memory footprint (unchanged visual design)
  const baseGeo = new THREE.BoxGeometry(0.92, 0.44, 0.66);
  const lidGeo = new THREE.BoxGeometry(0.94, 0.24, 0.68);
  const bandGeo = new THREE.BoxGeometry(0.95, 0.08, 0.70);
  const buckleGeo = new THREE.BoxGeometry(0.16, 0.16, 0.08);
  const gemGeo = new THREE.OctahedronGeometry(0.13, 0);

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#9a5b25',
    roughness: 0.78,
    metalness: 0.05,
  });
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: '#6b3b14',
    roughness: 0.82,
    metalness: 0.06,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    emissive: '#a16207',
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.78,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: '#fde047',
    emissive: '#f59e0b',
    emissiveIntensity: 0.65,
    roughness: 0.18,
    metalness: 0.65,
  });

  const runtimes: ChestRuntime[] = [];
  const runtimeById = new Map<number, ChestRuntime>();

  for (const record of currentState.chests) {
    const chestGroup = new THREE.Group();
    chestGroup.position.set(record.x, record.y, record.z);
    chestGroup.rotation.y = record.yaw;

    const baseMesh = new THREE.Mesh(baseGeo, woodMat);
    baseMesh.position.y = 0.22;
    chestGroup.add(baseMesh);

    const trimMesh = new THREE.Mesh(bandGeo, woodDarkMat);
    trimMesh.position.y = 0.40;
    chestGroup.add(trimMesh);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.44, -0.33);

    const lidMesh = new THREE.Mesh(lidGeo, woodMat);
    lidMesh.position.set(0, 0.12, 0.33);
    lidPivot.add(lidMesh);

    const lidBand = new THREE.Mesh(bandGeo, goldMat);
    lidBand.position.set(0, 0.21, 0.33);
    lidPivot.add(lidBand);

    const buckleMesh = new THREE.Mesh(buckleGeo, goldMat);
    buckleMesh.position.set(0, 0.02, 0.68);
    lidPivot.add(buckleMesh);

    chestGroup.add(lidPivot);

    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.set(0, 1.02, 0);
    chestGroup.add(gemMesh);

    const initialLidAngle = record.opened ? -1.15 : 0;
    lidPivot.rotation.x = initialLidAngle;
    gemMesh.visible = !record.opened;

    group.add(chestGroup);
    const rt: ChestRuntime = {
      record,
      group: chestGroup,
      lidPivot,
      gemMesh,
      lidAngle: initialLidAngle,
    };
    runtimes.push(rt);
    runtimeById.set(record.id, rt);
  }

  const syncRuntimeTransforms = (snapToStateAngle: boolean) => {
    for (let i = 0; i < currentState.chests.length; i++) {
      const rec = currentState.chests[i];
      const rt = runtimeById.get(rec.id);
      if (!rt) continue;
      rt.record = rec;
      rt.group.position.set(rec.x, rec.y, rec.z);
      rt.group.rotation.y = rec.yaw;
      rt.gemMesh.visible = !rec.opened;
      if (snapToStateAngle) {
        rt.lidAngle = rec.opened ? -1.15 : 0;
        rt.lidPivot.rotation.x = rt.lidAngle;
      } else if (!rec.opened) {
        rt.lidAngle = 0;
        rt.lidPivot.rotation.x = 0;
      }
    }
  };

  const setChestState = (nextState: PersistentChestCycleState) => {
    const checked = refreshChestStateIfDue(sanitizeChestCycleState(nextState).state);
    currentState = cloneChestCycleState(checked.state);
    syncRuntimeTransforms(true);
    saveChestCycleState(currentState);
    if (checked.refreshed) {
      onRefreshed?.(cloneChestCycleState(currentState));
    }
  };

  const setOpenedChests = (ids: Iterable<number>) => {
    const openedSet = new Set<number>();
    for (const id of ids) {
      if (typeof id === 'number' && Number.isInteger(id)) {
        openedSet.add(id);
      }
    }
    const now = Date.now();
    for (let i = 0; i < currentState.chests.length; i++) {
      const rec = currentState.chests[i];
      const shouldBeOpened = openedSet.has(rec.id);
      if (shouldBeOpened && !rec.opened) {
        rec.opened = true;
        rec.openedAt = now;
      } else if (!shouldBeOpened && rec.opened) {
        rec.opened = false;
        rec.openedAt = null;
      }
    }
    syncRuntimeTransforms(false);
    saveChestCycleState(currentState);
  };

  const checkAndRefreshIfDue = (now = Date.now()): boolean => {
    const checked = refreshChestStateIfDue(currentState, now);
    if (!checked.refreshed) return false;
    currentState = cloneChestCycleState(checked.state);
    syncRuntimeTransforms(true);
    saveChestCycleState(currentState);
    onRefreshed?.(cloneChestCycleState(currentState));
    return true;
  };

  const findNearestOpenableChest = (
    px: number,
    py: number,
    pz: number,
    maxDist = 2.9,
  ): TreasureChestSpot | null => {
    let best: TreasureChestSpot | null = null;
    let bestDistSq = maxDist * maxDist;
    for (let i = 0; i < runtimes.length; i++) {
      const rt = runtimes[i];
      if (rt.record.opened) continue;
      if (Math.abs(rt.record.y - py) > 2.6) continue;
      const dx = rt.record.x - px;
      const dz = rt.record.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = rt.record;
      }
    }
    return best;
  };

  const openChest = (id: number): ChestRewardAmount | null => {
    const rt = runtimeById.get(id);
    if (!rt || rt.record.opened) return null;
    const reward = sanitizeRewardAmount(rt.record.coins);
    rt.record.opened = true;
    rt.record.openedAt = Date.now();
    rt.gemMesh.visible = false;
    saveChestCycleState(currentState);
    return reward;
  };

  let refreshCheckAccumSec = 0;

  const update = (elapsed: number, dt: number, playerPos: THREE.Vector3) => {
    refreshCheckAccumSec += dt;
    if (refreshCheckAccumSec >= 1.0) {
      refreshCheckAccumSec = 0;
      checkAndRefreshIfDue(Date.now());
    }

    const cullDistSq = 88 * 88;
    for (let i = 0; i < runtimes.length; i++) {
      const rt = runtimes[i];
      const dx = rt.record.x - playerPos.x;
      const dz = rt.record.z - playerPos.z;
      const visible = dx * dx + dz * dz <= cullDistSq;
      rt.group.visible = visible;
      if (!visible) continue;

      const targetAngle = rt.record.opened ? -1.15 : 0;
      if (Math.abs(rt.lidAngle - targetAngle) > 0.005) {
        rt.lidAngle = THREE.MathUtils.damp(rt.lidAngle, targetAngle, 9.5, dt);
        rt.lidPivot.rotation.x = rt.lidAngle;
      }

      if (!rt.record.opened) {
        rt.gemMesh.position.y = 1.02 + Math.sin(elapsed * 2.8 + rt.record.id) * 0.09;
        rt.gemMesh.rotation.y = elapsed * 1.9 + rt.record.id;
      }
    }
  };

  const dispose = () => {
    baseGeo.dispose();
    lidGeo.dispose();
    bandGeo.dispose();
    buckleGeo.dispose();
    gemGeo.dispose();
    woodMat.dispose();
    woodDarkMat.dispose();
    goldMat.dispose();
    gemMat.dispose();
  };

  return {
    group,
    getChestState: () => cloneChestCycleState(currentState),
    setChestState,
    setOpenedChests,
    getOpenedChestIds: () =>
      currentState.chests.filter((c) => c.opened).map((c) => c.id),
    isChestOpened: (id: number) => Boolean(runtimeById.get(id)?.record.opened),
    checkAndRefreshIfDue,
    findNearestOpenableChest,
    openChest,
    update,
    dispose,
  };
}
