import * as THREE from 'three';
import {
  EXTENDED_VOXEL_START,
  getExtendedBlockByVoxelId,
  MAX_VOXEL_ID,
} from './blockCatalog';
import { buildAbandonedCity } from './cityBuilder';
import type { DayNightState } from './dayNightCycle';
import { getLagoonFloorY, SHALLOW_WATER_SURFACE_Y } from './oceanLife';
import { VOXEL_ID, VoxelId } from './types';

export const CHUNK_SIZE = 16;
export const CHUNK_MIN = -13; // 27x27 chunks of 16x16 covering modestly expanded city, outer woods & coastal bay
export const CHUNK_MAX = 13;
export const CHUNK_SPAN = CHUNK_MAX - CHUNK_MIN + 1;
export const GRID_MIN = CHUNK_MIN * CHUNK_SIZE; // -208
export const GRID_MAX = (CHUNK_MAX + 1) * CHUNK_SIZE - 1; // +223
export const GRID_SIZE = GRID_MAX - GRID_MIN + 1; // 432
export const LEGACY_GRID_SIZE = 368;
export const LEGACY_GRID_MIN = -176;
export const VOXEL_GRID_META = { gridMin: GRID_MIN, gridSize: GRID_SIZE } as const;
export const CHUNK_LOAD_RADIUS = 4; // 9x9 active chunk window (144x144 blocks) streamed around player (4GB RAM safe)
export const MAX_HEIGHT = 24; // y in [0..23] for multi-story buildings
export const PLAYABLE_RADIUS = 192.5;
export const SEA_LEVEL = 1.56;

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 12;

// Tile indices in the 8x12 (128x192) pixel-art block atlas (~98KB total)
export const TILE = {
  GRASS_TOP: [0, 0],
  GRASS_SIDE: [1, 0],
  DIRT: [2, 0],
  STONE: [3, 0],
  SAND: [0, 1],
  LOG_SIDE: [1, 1],
  LOG_TOP: [2, 1],
  LEAVES: [3, 1],
  MOSS_STONE: [0, 2],
  WATER: [1, 2],
  ASPHALT: [2, 2],
  ROAD_LINE: [3, 2],
  BRICK: [0, 3],
  PLANKS: [1, 3],
  CONCRETE: [2, 3],
  GLASS: [3, 3],
  ROAD_WHITE_EDGE: [4, 0],
  ROAD_CROSSWALK: [5, 0],
  SIDEWALK: [6, 0],
  ROAD_DRAIN: [7, 0],
  // Modern School Party Craft architectural & interior furniture tiles
  WHITE_WALL: [4, 1],
  CREAM_WALL: [5, 1],
  MINT_WALL: [6, 1],
  SKY_WALL: [7, 1],
  CORAL_WALL: [4, 2],
  CHARCOAL_TRIM: [5, 2],
  OAK_FLOOR: [6, 2],
  TILE_FLOOR: [7, 2],
  SLATE_ROOF: [4, 3],
  RED_ROOF: [5, 3],
  CARPET_BLUE: [6, 3],
  CARPET_CORAL: [7, 3],
  BED_HEAD_TOP: [0, 4],
  BED_FOOT_TOP: [1, 4],
  BED_SIDE: [2, 4],
  SOFA_TOP: [3, 4],
  SOFA_SIDE: [4, 4],
  TABLE_TOP: [5, 4],
  TABLE_SIDE: [6, 4],
  COUNTER_TOP: [7, 4],
  COUNTER_SIDE: [0, 5],
  STOVE_TOP: [1, 5],
  STOVE_SIDE: [2, 5],
  FRIDGE_SIDE: [3, 5],
  SINK_TOP: [4, 5],
  TOILET_TOP: [5, 5],
  TOILET_SIDE: [6, 5],
  BATHTUB_TOP: [7, 5],
  BATHTUB_SIDE: [0, 6],
  TV_SIDE: [1, 6],
  TV_TOP: [2, 6],
  BOOKSHELF_SIDE: [3, 6],
  LAMP_FACE: [4, 6],
  DOOR_FACE: [5, 6],
  FRIDGE_TOP: [6, 6],
  LAMP_SIDE: [7, 6],
  DOOR_WOOD_TOP: [0, 7],
  DOOR_WOOD_BOT: [1, 7],
  DOOR_WHITE_TOP: [2, 7],
  DOOR_WHITE_BOT: [3, 7],
  DOOR_MINT_TOP: [4, 7],
  DOOR_MINT_BOT: [5, 7],
  DOOR_SKY_TOP: [6, 7],
  DOOR_SKY_BOT: [7, 7],
  // Forest tree varieties & crossed-quad flora
  BIRCH_LOG_SIDE: [0, 8],
  BIRCH_LOG_TOP: [1, 8],
  PINE_LOG_SIDE: [2, 8],
  PINE_LOG_TOP: [3, 8],
  BIRCH_LEAVES: [4, 8],
  PINE_LEAVES: [5, 8],
  DARK_LEAVES: [6, 8],
  FLOWER_RED: [0, 9],
  FLOWER_YELLOW: [1, 9],
  TALL_GRASS: [2, 9],
  FERN_BUSH: [3, 9],
} as const;

export type TileCoord = readonly [number, number];

// Compact 3D voxel grid (Uint16Array supports up to 65,535 block types) + packed fixed-block bitfield for Android 4GB RAM
const voxelGrid = new Uint16Array(GRID_SIZE * MAX_HEIGHT * GRID_SIZE);
const chunkMaxY = new Uint8Array(CHUNK_SPAN * CHUNK_SPAN);
const fixedVoxelBits = new Uint8Array(Math.ceil((GRID_SIZE * MAX_HEIGHT * GRID_SIZE) / 8));
const VOXEL_EDITS_KEY = 'spc_city_voxel_edits_v2';
const VOXEL_EDITS_META_KEY = 'spc_city_voxel_edits_meta_v2';
const playerVoxelEdits = new Map<number, VoxelId>();

function voxelIndex(gx: number, by: number, gz: number): number {
  return (by * GRID_SIZE + (gz - GRID_MIN)) * GRID_SIZE + (gx - GRID_MIN);
}

function decodeVoxelIndex(
  idx: number,
  gridSize: number,
  gridMin: number,
): { gx: number; by: number; gz: number } | null {
  if (!Number.isInteger(idx) || idx < 0 || gridSize <= 0) return null;
  const layer = gridSize * gridSize;
  const maxTotal = layer * MAX_HEIGHT;
  if (idx >= maxTotal) return null;
  const by = Math.floor(idx / layer);
  if (by < 1 || by >= MAX_HEIGHT) return null;
  const rem = idx - by * layer;
  const gz = Math.floor(rem / gridSize) + gridMin;
  const gx = (rem % gridSize) + gridMin;
  return { gx, by, gz };
}

function isFixedIndex(idx: number): boolean {
  return (fixedVoxelBits[idx >>> 3] & (1 << (idx & 7))) !== 0;
}

function chunkGridIndex(cx: number, cz: number): number {
  return (cz - CHUNK_MIN) * CHUNK_SPAN + (cx - CHUNK_MIN);
}

export function isInVoxelBounds(gx: number, by: number, gz: number): boolean {
  return (
    gx >= GRID_MIN &&
    gx <= GRID_MAX &&
    gz >= GRID_MIN &&
    gz <= GRID_MAX &&
    by >= 0 &&
    by < MAX_HEIGHT
  );
}

export function markFixedVoxel(gx: number, by: number, gz: number): void {
  if (by < 1 || !isInVoxelBounds(gx, by, gz)) return;
  const idx = voxelIndex(gx, by, gz);
  fixedVoxelBits[idx >>> 3] |= 1 << (idx & 7);
}

export function unmarkFixedVoxel(gx: number, by: number, gz: number): void {
  if (by < 1 || !isInVoxelBounds(gx, by, gz)) return;
  const idx = voxelIndex(gx, by, gz);
  fixedVoxelBits[idx >>> 3] &= ~(1 << (idx & 7));
}

export function isFixedVoxel(gx: number, by: number, gz: number): boolean {
  if (!isInVoxelBounds(gx, by, gz)) return false;
  return isFixedIndex(voxelIndex(gx, by, gz));
}

export function getVoxel(gx: number, by: number, gz: number): VoxelId {
  if (!isInVoxelBounds(gx, by, gz)) return VOXEL_ID.AIR;
  return voxelGrid[voxelIndex(gx, by, gz)] as VoxelId;
}

export function setVoxel(gx: number, by: number, gz: number, id: VoxelId): boolean {
  // Keep y = 0 foundation intact so player never falls into empty void
  if (by < 1 || !isInVoxelBounds(gx, by, gz)) return false;
  voxelGrid[voxelIndex(gx, by, gz)] = id;
  if (id !== VOXEL_ID.AIR) {
    const ci = chunkGridIndex(Math.floor(gx / CHUNK_SIZE), Math.floor(gz / CHUNK_SIZE));
    if (by > chunkMaxY[ci]) chunkMaxY[ci] = by;
  }
  return true;
}

function savePlayerVoxelEdits(): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep fast localStorage fallback for up to 6,000 edits; IndexedDB handles unlimited world builds
    if (playerVoxelEdits.size > 6000) return;
    const entries = Array.from(playerVoxelEdits.entries());
    window.localStorage.setItem(VOXEL_EDITS_KEY, JSON.stringify(entries));
    window.localStorage.setItem(
      VOXEL_EDITS_META_KEY,
      JSON.stringify({ gridMin: GRID_MIN, gridSize: GRID_SIZE }),
    );
  } catch {
    // Ignore storage quota errors gracefully (IndexedDB retains full save)
  }
}

export function getPlayerVoxelEditCount(): number {
  return playerVoxelEdits.size;
}

export function exportPlayerVoxelEditsBinary(): { indices: Uint32Array; ids: Uint16Array } {
  const count = playerVoxelEdits.size;
  const indices = new Uint32Array(count);
  const ids = new Uint16Array(count);
  let i = 0;
  for (const [idx, id] of playerVoxelEdits.entries()) {
    indices[i] = idx;
    ids[i] = id;
    i++;
  }
  return { indices, ids };
}

export function recordPlayerVoxelEdit(gx: number, by: number, gz: number, id: VoxelId): void {
  if (by < 1 || !isInVoxelBounds(gx, by, gz)) return;
  const idx = voxelIndex(gx, by, gz);
  if (isFixedIndex(idx)) return;
  playerVoxelEdits.set(idx, id);
  savePlayerVoxelEdits();
}

function applySavedPlayerVoxelEdits(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(VOXEL_EDITS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;

    let srcGridSize = LEGACY_GRID_SIZE;
    let srcGridMin = LEGACY_GRID_MIN;
    const metaRaw = window.localStorage.getItem(VOXEL_EDITS_META_KEY);
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw) as { gridMin?: number; gridSize?: number };
        if (
          typeof meta.gridSize === 'number' &&
          Number.isInteger(meta.gridSize) &&
          meta.gridSize > 0 &&
          typeof meta.gridMin === 'number' &&
          Number.isInteger(meta.gridMin)
        ) {
          srcGridSize = meta.gridSize;
          srcGridMin = meta.gridMin;
        }
      } catch {
        // Fallback to legacy dimensions
      }
    }

    for (const pair of parsed) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const rawIdx = Number(pair[0]);
      const id = Number(pair[1]) as VoxelId;
      if (!Number.isInteger(id) || id < 0 || id > MAX_VOXEL_ID) continue;
      const coords = decodeVoxelIndex(rawIdx, srcGridSize, srcGridMin);
      if (!coords || !isInVoxelBounds(coords.gx, coords.by, coords.gz)) continue;
      const targetIdx = voxelIndex(coords.gx, coords.by, coords.gz);
      if (isFixedIndex(targetIdx)) continue;
      setVoxel(coords.gx, coords.by, coords.gz, id);
      playerVoxelEdits.set(targetIdx, id);
    }
  } catch {
    // Ignore corrupted edit cache
  }
}

export function getColumnTopHeight(gx: number, gz: number): number {
  if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
    return 0;
  }
  const top = chunkMaxY[chunkGridIndex(Math.floor(gx / CHUNK_SIZE), Math.floor(gz / CHUNK_SIZE))];
  for (let by = top; by >= 0; by--) {
    if (voxelGrid[voxelIndex(gx, by, gz)] !== VOXEL_ID.AIR) {
      return by + 1;
    }
  }
  return 0;
}

function rebuildBaseCityVoxels(): void {
  voxelGrid.fill(VOXEL_ID.AIR);
  chunkMaxY.fill(0);
  fixedVoxelBits.fill(0);
  playerVoxelEdits.clear();
  buildAbandonedCity(
    (gx, by, gz, id) => {
      if (!isInVoxelBounds(gx, by, gz)) return;
      voxelGrid[voxelIndex(gx, by, gz)] = id;
      if (id !== VOXEL_ID.AIR) {
        const ci = chunkGridIndex(Math.floor(gx / CHUNK_SIZE), Math.floor(gz / CHUNK_SIZE));
        if (by > chunkMaxY[ci]) chunkMaxY[ci] = by;
      }
    },
    getVoxel,
    markFixedVoxel,
    unmarkFixedVoxel,
  );
}

/**
 * Restores saved binary player block edits cleanly on top of the deterministic base city.
 * Automatically migrates coordinates when loading snapshots created on legacy grid sizes.
 */
export function applyVoxelEditsBinary(
  indices: ArrayLike<number>,
  ids: ArrayLike<number>,
  resetWorldFirst = true,
  sourceGridSize = GRID_SIZE,
  sourceGridMin = GRID_MIN,
): number {
  if (resetWorldFirst) {
    rebuildBaseCityVoxels();
  }
  const len = Math.min(indices.length, ids.length);
  let applied = 0;
  for (let i = 0; i < len; i++) {
    const rawIdx = Number(indices[i]);
    const id = Number(ids[i]) as VoxelId;
    if (!Number.isInteger(id) || id < 0 || id > MAX_VOXEL_ID) {
      continue;
    }
    const coords = decodeVoxelIndex(rawIdx, sourceGridSize, sourceGridMin);
    if (!coords || !isInVoxelBounds(coords.gx, coords.by, coords.gz)) {
      continue;
    }
    const targetIdx = voxelIndex(coords.gx, coords.by, coords.gz);
    if (isFixedIndex(targetIdx)) {
      continue;
    }
    setVoxel(coords.gx, coords.by, coords.gz, id);
    playerVoxelEdits.set(targetIdx, id);
    applied++;
  }
  savePlayerVoxelEdits();
  return applied;
}

/**
 * Populates the 3D voxel grid with the abandoned city and 400ft N/S/E/W flat expansion.
 */
export function initVoxelWorld(): void {
  rebuildBaseCityVoxels();
  applySavedPlayerVoxelEdits();
}

initVoxelWorld();

export function isDoorVoxel(id: VoxelId): boolean {
  return (
    id === VOXEL_ID.DOOR_WOOD_CLOSED ||
    id === VOXEL_ID.DOOR_WOOD_OPEN ||
    id === VOXEL_ID.DOOR_WHITE_CLOSED ||
    id === VOXEL_ID.DOOR_WHITE_OPEN ||
    id === VOXEL_ID.DOOR_MINT_CLOSED ||
    id === VOXEL_ID.DOOR_MINT_OPEN ||
    id === VOXEL_ID.DOOR_SKY_CLOSED ||
    id === VOXEL_ID.DOOR_SKY_OPEN ||
    id === VOXEL_ID.DOOR_CORAL_CLOSED ||
    id === VOXEL_ID.DOOR_CORAL_OPEN
  );
}

export function isDoorOpen(id: VoxelId): boolean {
  return (
    id === VOXEL_ID.DOOR_WOOD_OPEN ||
    id === VOXEL_ID.DOOR_WHITE_OPEN ||
    id === VOXEL_ID.DOOR_MINT_OPEN ||
    id === VOXEL_ID.DOOR_SKY_OPEN ||
    id === VOXEL_ID.DOOR_CORAL_OPEN
  );
}

function getDoorVariantId(id: VoxelId, open: boolean): VoxelId {
  switch (id) {
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
      return open ? VOXEL_ID.DOOR_WHITE_OPEN : VOXEL_ID.DOOR_WHITE_CLOSED;
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
      return open ? VOXEL_ID.DOOR_MINT_OPEN : VOXEL_ID.DOOR_MINT_CLOSED;
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
      return open ? VOXEL_ID.DOOR_SKY_OPEN : VOXEL_ID.DOOR_SKY_CLOSED;
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
      return open ? VOXEL_ID.DOOR_CORAL_OPEN : VOXEL_ID.DOOR_CORAL_CLOSED;
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
    default:
      return open ? VOXEL_ID.DOOR_WOOD_OPEN : VOXEL_ID.DOOR_WOOD_CLOSED;
  }
}

export function isFurnitureVoxel(id: VoxelId): boolean {
  return (
    (id >= VOXEL_ID.BED_HEAD && id <= VOXEL_ID.LAMP_BLOCK) ||
    (id >= VOXEL_ID.CHAIR_OAK && id <= VOXEL_ID.GIFT_BOX)
  );
}

function isShapedFurnitureVoxel(id: VoxelId): boolean {
  return (
    id === VOXEL_ID.SOFA ||
    id === VOXEL_ID.TABLE ||
    (id >= VOXEL_ID.CHAIR_OAK && id <= VOXEL_ID.GIFT_BOX)
  );
}

export function isFoliagePlantVoxel(id: VoxelId): boolean {
  return id >= VOXEL_ID.FLOWER_RED && id <= VOXEL_ID.FERN_BUSH;
}

function isOpaqueBlock(id: VoxelId): boolean {
  if (id >= EXTENDED_VOXEL_START) {
    const ext = getExtendedBlockByVoxelId(id);
    return ext ? !ext.isGlass : false;
  }
  return (
    id !== VOXEL_ID.AIR &&
    id !== VOXEL_ID.GLASS &&
    !isDoorVoxel(id) &&
    !isShapedFurnitureVoxel(id) &&
    !isFoliagePlantVoxel(id)
  );
}

export function isPassableAt(gx: number, by: number, gz: number): boolean {
  const id = getVoxel(gx, by, gz);
  return id === VOXEL_ID.AIR || isDoorOpen(id) || isFoliagePlantVoxel(id);
}

export function canAutoStepOntoBlock(gx: number, by: number, gz: number): boolean {
  const id = getVoxel(gx, by, gz);
  if (id === VOXEL_ID.AIR || isDoorVoxel(id) || isFurnitureVoxel(id) || isFoliagePlantVoxel(id)) return false;
  // Architectural walls, windows, and roof shingles cannot be auto-climbed
  if (
    id === VOXEL_ID.WHITE_WALL ||
    id === VOXEL_ID.CREAM_WALL ||
    id === VOXEL_ID.MINT_WALL ||
    id === VOXEL_ID.SKY_WALL ||
    id === VOXEL_ID.CORAL_WALL ||
    id === VOXEL_ID.CHARCOAL_TRIM ||
    id === VOXEL_ID.BRICK ||
    id === VOXEL_ID.GLASS ||
    id === VOXEL_ID.SLATE_ROOF ||
    id === VOXEL_ID.RED_ROOF
  ) {
    return false;
  }
  // Require full standing headroom above the step
  return isPassableAt(gx, by + 1, gz) && isPassableAt(gx, by + 2, gz);
}

export interface ToggledDoorLeaf {
  gx: number;
  gz: number;
  yBot: number;
  id: VoxelId;
}

export function setDoorOpenState(
  gx: number,
  by: number,
  gz: number,
  shouldOpen: boolean,
): {
  changed: boolean;
  opened: boolean;
  affectedCoords: Array<[number, number]>;
  affectedLeaves: ToggledDoorLeaf[];
} {
  const id = getVoxel(gx, by, gz);
  if (!isDoorVoxel(id)) {
    return { changed: false, opened: false, affectedCoords: [], affectedLeaves: [] };
  }

  const wasOpen = isDoorOpen(id);
  if (wasOpen === shouldOpen) {
    return { changed: false, opened: wasOpen, affectedCoords: [], affectedLeaves: [] };
  }

  const nextId = getDoorVariantId(id, shouldOpen);
  const yBot = isDoorVoxel(getVoxel(gx, by - 1, gz)) ? by - 1 : by;
  const yTop = isDoorVoxel(getVoxel(gx, yBot + 1, gz)) ? yBot + 1 : yBot;

  const affectedCoords: Array<[number, number]> = [[gx, gz]];
  const affectedLeaves: ToggledDoorLeaf[] = [{ gx, gz, yBot, id: nextId }];
  for (let y = yBot; y <= yTop; y++) {
    if (isDoorVoxel(getVoxel(gx, y, gz))) {
      setVoxel(gx, y, gz, nextId);
    }
  }

  // Synchronize matching double-door partner leaf when adjacent
  const dirs: ReadonlyArray<[number, number]> = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dx, dz] of dirs) {
    const nx = gx + dx;
    const nz = gz + dz;
    const nId = getVoxel(nx, yBot, nz);
    if (isDoorVoxel(nId) && isDoorOpen(nId) === wasOpen) {
      const nextPartnerId = getDoorVariantId(nId, shouldOpen);
      const nTop = isDoorVoxel(getVoxel(nx, yBot + 1, nz)) ? yBot + 1 : yBot;
      for (let y = yBot; y <= nTop; y++) {
        if (isDoorVoxel(getVoxel(nx, y, nz))) {
          setVoxel(nx, y, nz, nextPartnerId);
        }
      }
      affectedCoords.push([nx, nz]);
      affectedLeaves.push({ gx: nx, gz: nz, yBot, id: nextPartnerId });
    }
  }

  return { changed: true, opened: shouldOpen, affectedCoords, affectedLeaves };
}

export function toggleDoorAt(
  gx: number,
  by: number,
  gz: number,
): {
  toggled: boolean;
  opened: boolean;
  affectedCoords: Array<[number, number]>;
  affectedLeaves: ToggledDoorLeaf[];
} {
  const id = getVoxel(gx, by, gz);
  if (!isDoorVoxel(id)) {
    return { toggled: false, opened: false, affectedCoords: [], affectedLeaves: [] };
  }
  const res = setDoorOpenState(gx, by, gz, !isDoorOpen(id));
  return {
    toggled: res.changed,
    opened: res.opened,
    affectedCoords: res.affectedCoords,
    affectedLeaves: res.affectedLeaves,
  };
}

/**
 * Finds highest solid block surface at or below (maxFootY) for standing/stepping.
 */
export function getSupportHeightAt(x: number, z: number, maxFootY: number): number {
  const gx = Math.round(x);
  const gz = Math.round(z);
  if (Math.abs(x) <= 64.5 && z >= 158.5 && z <= 190.5) {
    const topBlock = Math.min(MAX_HEIGHT - 1, Math.max(0, Math.floor(maxFootY)));
    if (gx >= GRID_MIN && gx <= GRID_MAX && gz >= GRID_MIN && gz <= GRID_MAX) {
      for (let by = topBlock; by >= 0; by--) {
        const id = voxelGrid[voxelIndex(gx, by, gz)] as VoxelId;
        if (id !== VOXEL_ID.AIR && !isDoorOpen(id) && !isFoliagePlantVoxel(id)) {
          return by + 1;
        }
      }
    }
    return getLagoonFloorY(x, z);
  }
  if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
    return 0.35;
  }
  const topBlock = Math.min(MAX_HEIGHT - 1, Math.floor(maxFootY));
  for (let by = topBlock; by >= 0; by--) {
    const id = voxelGrid[voxelIndex(gx, by, gz)] as VoxelId;
    if (id !== VOXEL_ID.AIR && !isDoorOpen(id) && !isFoliagePlantVoxel(id)) {
      return by + 1;
    }
  }
  return 0.35;
}

/**
 * Finds the safest lowest ground-floor standing Y at (x, z) with >= 2 blocks of clear air headroom,
 * preventing teleports/spawns from ever landing on rooftops or inside ceilings.
 */
export function getSafeGroundSupportY(x: number, z: number): number {
  const gx = Math.round(x);
  const gz = Math.round(z);
  if (Math.abs(x) <= 64.5 && z >= 158.5 && z <= 190.5) {
    return Math.max(getLagoonFloorY(x, z), SHALLOW_WATER_SURFACE_Y - 0.56);
  }
  if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
    return 2;
  }
  for (let by = 0; by <= MAX_HEIGHT - 4; by++) {
    const floorId = getVoxel(gx, by, gz);
    if (
      floorId !== VOXEL_ID.AIR &&
      !isDoorOpen(floorId) &&
      !isFurnitureVoxel(floorId) &&
      !isFoliagePlantVoxel(floorId)
    ) {
      if (isPassableAt(gx, by + 1, gz) && isPassableAt(gx, by + 2, gz)) {
        return by + 1;
      }
    }
  }
  return 2;
}

/**
 * Checks if any solid voxel overlaps world coordinate (x, y, z).
 */
export function isSolidAtWorld(x: number, y: number, z: number): boolean {
  const gx = Math.round(x);
  const by = Math.floor(y);
  const gz = Math.round(z);
  const id = getVoxel(gx, by, gz);
  return id !== VOXEL_ID.AIR && !isDoorOpen(id) && !isFoliagePlantVoxel(id);
}

/**
 * Topmost solid block Y at world (x, z) — used for camera terrain clearance.
 */
export function groundHeightAt(x: number, z: number): number {
  const h = getColumnTopHeight(Math.round(x), Math.round(z));
  return h > 0 ? h : 0.35;
}

export function getBlockBreakDuration(id: VoxelId): number {
  if (id >= EXTENDED_VOXEL_START) {
    const ext = getExtendedBlockByVoxelId(id);
    if (!ext) return 0.45;
    if (ext.isGlass || ext.isGlow) return 0.28;
    return ext.isMasonry ? 0.56 : 0.44;
  }
  switch (id) {
    case VOXEL_ID.STONE:
    case VOXEL_ID.MOSS_STONE:
    case VOXEL_ID.BRICK:
    case VOXEL_ID.CONCRETE:
    case VOXEL_ID.WHITE_WALL:
    case VOXEL_ID.CREAM_WALL:
    case VOXEL_ID.MINT_WALL:
    case VOXEL_ID.SKY_WALL:
    case VOXEL_ID.CORAL_WALL:
    case VOXEL_ID.CHARCOAL_TRIM:
    case VOXEL_ID.TILE_FLOOR:
    case VOXEL_ID.SLATE_ROOF:
    case VOXEL_ID.RED_ROOF:
    case VOXEL_ID.STOVE:
    case VOXEL_ID.FRIDGE:
    case VOXEL_ID.SINK_COUNTER:
    case VOXEL_ID.TOILET:
    case VOXEL_ID.BATHTUB:
    case VOXEL_ID.ASPHALT:
    case VOXEL_ID.ROAD_LINE:
    case VOXEL_ID.ROAD_LINE_EW:
    case VOXEL_ID.ROAD_EDGE_W:
    case VOXEL_ID.ROAD_EDGE_E:
    case VOXEL_ID.ROAD_EDGE_N:
    case VOXEL_ID.ROAD_EDGE_S:
    case VOXEL_ID.ROAD_CROSSWALK_NS:
    case VOXEL_ID.ROAD_CROSSWALK_EW:
    case VOXEL_ID.SIDEWALK:
    case VOXEL_ID.ROAD_DRAIN:
      return 0.72;
    case VOXEL_ID.LOG:
    case VOXEL_ID.BIRCH_LOG:
    case VOXEL_ID.PINE_LOG:
    case VOXEL_ID.PLANKS:
    case VOXEL_ID.OAK_FLOOR:
    case VOXEL_ID.TABLE:
    case VOXEL_ID.TABLE_WHITE:
    case VOXEL_ID.CHAIR_OAK:
    case VOXEL_ID.CHAIR_PINK:
    case VOXEL_ID.CHAIR_SKY:
    case VOXEL_ID.CHAIR_MINT:
    case VOXEL_ID.KITCHEN_COUNTER:
    case VOXEL_ID.BOOKSHELF:
    case VOXEL_ID.CUPBOARD_OAK:
    case VOXEL_ID.CUPBOARD_WHITE:
    case VOXEL_ID.CUPBOARD_SKY:
    case VOXEL_ID.BED_HEAD:
    case VOXEL_ID.BED_FOOT:
    case VOXEL_ID.BED_CORAL:
    case VOXEL_ID.BED_MINT:
    case VOXEL_ID.SOFA:
    case VOXEL_ID.SOFA_CORAL:
    case VOXEL_ID.SOFA_MINT:
    case VOXEL_ID.SOFA_CREAM:
      return 0.44;
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
      return 0.48;
    case VOXEL_ID.GLASS:
    case VOXEL_ID.TABLE_GLASS:
    case VOXEL_ID.TV_SCREEN:
    case VOXEL_ID.LAMP_BLOCK:
    case VOXEL_ID.DESK_LAMP:
    case VOXEL_ID.PLANT_POT:
    case VOXEL_ID.FLOWER_VASE:
    case VOXEL_ID.PLUSH_DECOR:
    case VOXEL_ID.GIFT_BOX:
    case VOXEL_ID.LEAVES:
    case VOXEL_ID.BIRCH_LEAVES:
    case VOXEL_ID.PINE_LEAVES:
    case VOXEL_ID.DARK_LEAVES:
    case VOXEL_ID.FLOWER_RED:
    case VOXEL_ID.FLOWER_YELLOW:
    case VOXEL_ID.TALL_GRASS:
    case VOXEL_ID.FERN_BUSH:
      return 0.24;
    case VOXEL_ID.CARPET_BLUE:
    case VOXEL_ID.CARPET_CORAL:
    case VOXEL_ID.SAND:
    case VOXEL_ID.DIRT:
    case VOXEL_ID.GRASS:
    default:
      return 0.45;
  }
}

export function getBlockParticleColor(id: VoxelId): number {
  if (id >= EXTENDED_VOXEL_START) {
    return getExtendedBlockByVoxelId(id)?.particleHex ?? 0x888888;
  }
  switch (id) {
    case VOXEL_ID.GRASS:
      return 0x528f38;
    case VOXEL_ID.DIRT:
      return 0x7c5738;
    case VOXEL_ID.STONE:
      return 0x7e8388;
    case VOXEL_ID.SAND:
      return 0xd6c792;
    case VOXEL_ID.LOG:
      return 0x61442a;
    case VOXEL_ID.BIRCH_LOG:
      return 0xdad6cd;
    case VOXEL_ID.PINE_LOG:
      return 0x3b2718;
    case VOXEL_ID.LEAVES:
    case VOXEL_ID.PLANT_POT:
    case VOXEL_ID.TALL_GRASS:
      return 0x397631;
    case VOXEL_ID.BIRCH_LEAVES:
      return 0x5fb848;
    case VOXEL_ID.PINE_LEAVES:
      return 0x26593d;
    case VOXEL_ID.DARK_LEAVES:
    case VOXEL_ID.FERN_BUSH:
      return 0x245622;
    case VOXEL_ID.FLOWER_RED:
      return 0xe5484d;
    case VOXEL_ID.FLOWER_YELLOW:
      return 0xfacc15;
    case VOXEL_ID.MOSS_STONE:
      return 0x597352;
    case VOXEL_ID.ASPHALT:
    case VOXEL_ID.ROAD_LINE:
    case VOXEL_ID.ROAD_LINE_EW:
    case VOXEL_ID.ROAD_EDGE_W:
    case VOXEL_ID.ROAD_EDGE_E:
    case VOXEL_ID.ROAD_EDGE_N:
    case VOXEL_ID.ROAD_EDGE_S:
    case VOXEL_ID.ROAD_CROSSWALK_NS:
    case VOXEL_ID.ROAD_CROSSWALK_EW:
    case VOXEL_ID.ROAD_DRAIN:
      return 0x2d323a;
    case VOXEL_ID.SIDEWALK:
      return 0x9ca4ac;
    case VOXEL_ID.BRICK:
      return 0xb85a47;
    case VOXEL_ID.PLANKS:
    case VOXEL_ID.OAK_FLOOR:
    case VOXEL_ID.TABLE:
    case VOXEL_ID.CHAIR_OAK:
    case VOXEL_ID.CUPBOARD_OAK:
    case VOXEL_ID.BOOKSHELF:
      return 0xc89254;
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
      return 0xa46c36;
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
    case VOXEL_ID.TABLE_WHITE:
    case VOXEL_ID.CUPBOARD_WHITE:
      return 0xeef2f6;
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
    case VOXEL_ID.CHAIR_MINT:
    case VOXEL_ID.SOFA_MINT:
    case VOXEL_ID.BED_MINT:
      return 0x6dd5c2;
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
    case VOXEL_ID.CHAIR_SKY:
    case VOXEL_ID.CUPBOARD_SKY:
      return 0x6cb6f5;
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
    case VOXEL_ID.CHAIR_PINK:
    case VOXEL_ID.SOFA_CORAL:
    case VOXEL_ID.BED_CORAL:
    case VOXEL_ID.FLOWER_VASE:
    case VOXEL_ID.GIFT_BOX:
      return 0xef7c8e;
    case VOXEL_ID.CONCRETE:
      return 0xcfd5db;
    case VOXEL_ID.GLASS:
    case VOXEL_ID.TABLE_GLASS:
      return 0x8fd3f0;
    case VOXEL_ID.WHITE_WALL:
    case VOXEL_ID.TILE_FLOOR:
    case VOXEL_ID.TOILET:
    case VOXEL_ID.BATHTUB:
    case VOXEL_ID.KITCHEN_COUNTER:
    case VOXEL_ID.SINK_COUNTER:
      return 0xeef2f6;
    case VOXEL_ID.CREAM_WALL:
    case VOXEL_ID.SOFA_CREAM:
      return 0xf0e2ca;
    case VOXEL_ID.MINT_WALL:
      return 0x6dd5c2;
    case VOXEL_ID.SKY_WALL:
    case VOXEL_ID.CARPET_BLUE:
    case VOXEL_ID.BED_HEAD:
    case VOXEL_ID.BED_FOOT:
      return 0x6cb6f5;
    case VOXEL_ID.CORAL_WALL:
    case VOXEL_ID.CARPET_CORAL:
      return 0xef7c8e;
    case VOXEL_ID.CHARCOAL_TRIM:
    case VOXEL_ID.SLATE_ROOF:
    case VOXEL_ID.STOVE:
    case VOXEL_ID.TV_SCREEN:
      return 0x3b4454;
    case VOXEL_ID.RED_ROOF:
      return 0xc75b48;
    case VOXEL_ID.SOFA:
      return 0x5c7ca3;
    case VOXEL_ID.FRIDGE:
      return 0xdce3ea;
    case VOXEL_ID.LAMP_BLOCK:
    case VOXEL_ID.DESK_LAMP:
    case VOXEL_ID.PLUSH_DECOR:
      return 0xfff3c4;
    default:
      return 0x888888;
  }
}

/**
 * Generates a single crisp 128x160 pixel-art block texture atlas (8x10 grid of 16x16 tiles)
 * covering terrain, asphalt roads, varied forest trees/flora, and modern house furniture.
 */
export function createVoxelAtlasTexture(): THREE.CanvasTexture {
  const tileSize = 16;
  const width = ATLAS_COLS * tileSize;
  const height = ATLAS_ROWS * tileSize;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const paintNoiseTile = (
    tx: number,
    ty: number,
    palette: string[],
    seedInit: number,
  ) => {
    const ox = tx * tileSize;
    const oy = ty * tileSize;
    let s = seedInit;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        s = (s * 16807) % 2147483647;
        ctx.fillStyle = palette[s % palette.length];
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  };

  // (0,0) Grass Top (slightly muted overgrown city grass)
  paintNoiseTile(0, 0, ['#549936', '#5ea63e', '#498b2e', '#65af44'], 101);

  // (2,0) Dirt
  const dirtPalette = ['#865d3b', '#795232', '#946945', '#6b472b'];
  paintNoiseTile(2, 0, dirtPalette, 202);
  ctx.fillStyle = '#5e4c41';
  ctx.fillRect(2 * 16 + 3, 4, 2, 1);
  ctx.fillRect(2 * 16 + 11, 10, 2, 1);
  ctx.fillRect(2 * 16 + 6, 13, 1, 2);

  // (1,0) Grass Side
  paintNoiseTile(1, 0, dirtPalette, 303);
  const grassSidePalette = ['#549936', '#5ea63e', '#498b2e'];
  const fringeDepths = [3, 4, 3, 2, 4, 5, 3, 3, 4, 2, 3, 4, 3, 2, 4, 3];
  for (let x = 0; x < tileSize; x++) {
    const depth = fringeDepths[x];
    for (let y = 0; y < depth; y++) {
      ctx.fillStyle = grassSidePalette[(x + y * 3) % grassSidePalette.length];
      ctx.fillRect(16 + x, y, 1, 1);
    }
    ctx.fillStyle = '#5a3b23';
    ctx.fillRect(16 + x, depth, 1, 1);
  }

  // (3,0) Stone / Sidewalk Slab
  paintNoiseTile(3, 0, ['#84898e', '#797e83', '#90959a', '#6d7277'], 404);
  ctx.fillStyle = '#62676c';
  ctx.fillRect(3 * 16 + 1, 3, 5, 1);
  ctx.fillRect(3 * 16 + 8, 7, 6, 1);
  ctx.fillRect(3 * 16 + 2, 12, 7, 1);
  ctx.fillStyle = '#9ea3a8';
  ctx.fillRect(3 * 16 + 2, 2, 4, 1);
  ctx.fillRect(3 * 16 + 9, 6, 4, 1);

  // (0,1) Sand
  paintNoiseTile(0, 1, ['#ded09b', '#d4c48e', '#e7d9a6', '#c8b882'], 505);

  // (1,1) Log Side
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const ridge = (x + ((y * 7) % 3 === 0 ? 1 : 0)) % 4;
      const col =
        ridge === 0
          ? '#4e351e'
          : ridge === 1
            ? '#65472b'
            : ridge === 2
              ? '#735233'
              : '#583d23';
      ctx.fillStyle = col;
      ctx.fillRect(16 + x, 16 + y, 1, 1);
    }
  }

  // (2,1) Log Top
  ctx.fillStyle = '#65472b';
  ctx.fillRect(32, 16, 16, 16);
  ctx.fillStyle = '#ba9266';
  ctx.fillRect(34, 18, 12, 12);
  ctx.fillStyle = '#a67f52';
  ctx.fillRect(36, 20, 8, 8);
  ctx.fillStyle = '#ba9266';
  ctx.fillRect(38, 22, 4, 4);
  ctx.fillStyle = '#855e39';
  ctx.fillRect(39, 23, 2, 2);

  // (3,1) Overgrown Leaves
  paintNoiseTile(3, 1, ['#3a7e32', '#458f3b', '#2b6324', '#519d45'], 606);
  ctx.fillStyle = '#1d4919';
  ctx.fillRect(48 + 2, 16 + 3, 2, 2);
  ctx.fillRect(48 + 10, 16 + 2, 2, 1);
  ctx.fillRect(48 + 6, 16 + 9, 2, 2);
  ctx.fillRect(48 + 12, 16 + 12, 2, 2);

  // (0,2) Mossy Cobblestone
  paintNoiseTile(0, 2, ['#6d7375', '#616668', '#7a8082', '#555a5c'], 707);
  ctx.fillStyle = '#4f7a3d';
  ctx.fillRect(2, 32 + 2, 4, 3);
  ctx.fillRect(9, 32 + 5, 5, 3);
  ctx.fillRect(3, 32 + 10, 4, 4);
  ctx.fillStyle = '#62914b';
  ctx.fillRect(3, 32 + 3, 2, 1);
  ctx.fillRect(10, 32 + 6, 3, 1);
  ctx.fillRect(4, 32 + 11, 2, 2);

  // (1,2) Muted Water
  paintNoiseTile(1, 2, ['#2b6b8f', '#32779c', '#245d7d', '#3a82a8'], 808);

  // (2,2) Realistic Dark Grey Asphalt
  const asphaltPalette = ['#262a31', '#22262c', '#2b3038', '#202329'];
  paintNoiseTile(2, 2, asphaltPalette, 909);

  // (3,2) Dark Grey Asphalt + Crisp Dashed Yellow Center Marking
  paintNoiseTile(3, 2, asphaltPalette, 1010);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(48 + 7, 32 + 1, 2, 5);
  ctx.fillRect(48 + 7, 32 + 10, 2, 5);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(48 + 7, 32 + 5, 2, 1);
  ctx.fillRect(48 + 7, 32 + 14, 2, 1);

  // (0,3) Clean Modern Architectural Brick
  paintNoiseTile(0, 3, ['#b85c48', '#ad523f', '#c26652', '#a34a37'], 1111);
  ctx.fillStyle = '#ddd7cf'; // crisp clean mortar lines
  for (let row = 0; row < 16; row += 4) {
    ctx.fillRect(0, 48 + row, 16, 1);
    const offset = (row / 4) % 2 === 0 ? 3 : 7;
    ctx.fillRect(offset, 48 + row, 1, 4);
    ctx.fillRect((offset + 8) % 16, 48 + row, 1, 4);
  }

  // (1,3) Clean Modern Oak Wood Planks
  paintNoiseTile(1, 3, ['#b98750', '#ad7b46', '#c49159', '#9f703d'], 1212);
  ctx.fillStyle = '#855a2e';
  for (let row = 0; row < 16; row += 4) {
    ctx.fillRect(16, 48 + row, 16, 1);
  }
  ctx.fillRect(16 + 5, 48, 1, 4);
  ctx.fillRect(16 + 11, 48 + 4, 1, 4);
  ctx.fillRect(16 + 3, 48 + 8, 1, 4);
  ctx.fillRect(16 + 12, 48 + 12, 1, 4);

  // (2,3) Clean Modern Smooth Concrete
  paintNoiseTile(2, 3, ['#d2d7dc', '#c9cfd5', '#dae0e5', '#c1c8cf'], 1313);
  ctx.fillStyle = '#b4bcc4';
  ctx.fillRect(32, 48 + 15, 16, 1);
  ctx.fillRect(32, 48, 1, 16);

  // (3,3) Transparent Architectural Minecraft Window Glass + Crisp Frame
  ctx.clearRect(48, 48, 16, 16);
  ctx.fillStyle = 'rgba(155, 222, 250, 0.26)';
  ctx.fillRect(48 + 1, 48 + 1, 14, 14);
  // Sleek outer dark charcoal frame
  ctx.fillStyle = '#334155';
  ctx.fillRect(48, 48, 16, 1);
  ctx.fillRect(48, 48 + 15, 16, 1);
  ctx.fillRect(48, 48, 1, 16);
  ctx.fillRect(48 + 15, 48, 1, 16);
  // Subtle inner aluminum highlight bevel
  ctx.fillStyle = 'rgba(226, 244, 255, 0.62)';
  ctx.fillRect(48 + 1, 48 + 1, 14, 1);
  ctx.fillRect(48 + 1, 48 + 1, 1, 14);
  // Crisp diagonal specular window shine streaks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.fillRect(48 + 3, 48 + 3, 4, 1);
  ctx.fillRect(48 + 3, 48 + 4, 1, 3);
  ctx.fillRect(48 + 9, 48 + 11, 4, 1);
  ctx.fillRect(48 + 12, 48 + 8, 1, 3);

  // (4,0) Dark Asphalt + Curb Gutter & Solid White Road Edge Line (on left edge)
  paintNoiseTile(4, 0, asphaltPalette, 1515);
  ctx.fillStyle = '#5a6068';
  ctx.fillRect(64, 0, 1, 16);
  ctx.fillStyle = '#191c22';
  ctx.fillRect(65, 0, 1, 16);
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(67, 0, 2, 16);
  ctx.fillStyle = '#cbd4dc';
  ctx.fillRect(68, 0, 1, 16);

  // (5,0) Dark Asphalt + Crisp White Zebra Crosswalk Stripes
  paintNoiseTile(5, 0, asphaltPalette, 1616);
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(80 + 2, 2, 4, 12);
  ctx.fillRect(80 + 10, 2, 4, 12);
  ctx.fillStyle = '#cfd7df';
  ctx.fillRect(80 + 2, 13, 4, 1);
  ctx.fillRect(80 + 10, 13, 4, 1);

  // (6,0) Concrete Sidewalk Pavers
  paintNoiseTile(6, 0, ['#9aa2aa', '#a2aab2', '#929aa2', '#8a929a'], 1717);
  ctx.fillStyle = '#70777e';
  ctx.fillRect(96, 0, 16, 1);
  ctx.fillRect(96, 8, 16, 1);
  ctx.fillRect(96, 0, 1, 16);
  ctx.fillRect(96 + 8, 0, 1, 16);
  ctx.fillStyle = '#b4bcc4';
  ctx.fillRect(96 + 1, 1, 6, 1);
  ctx.fillRect(96 + 9, 9, 6, 1);

  // (7,0) Dark Asphalt + Cast-Iron Storm Drain / Manhole Grate
  paintNoiseTile(7, 0, asphaltPalette, 1818);
  ctx.fillStyle = '#474e58';
  ctx.fillRect(112 + 3, 3, 10, 10);
  ctx.fillStyle = '#181b20';
  ctx.fillRect(112 + 5, 5, 2, 6);
  ctx.fillRect(112 + 9, 5, 2, 6);

  // ------------------------------------------------------------------
  // SCHOOL PARTY CRAFT MODERN ARCHITECTURE & INTERIOR FURNITURE TILES
  // ------------------------------------------------------------------
  const txX = (tx: number) => tx * 16;
  const txY = (ty: number) => ty * 16;

  // (4,1) White Plaster Wall
  paintNoiseTile(4, 1, ['#f2f5f9', '#edf1f6', '#f7f9fc', '#e7ecf3'], 1901);
  ctx.fillStyle = '#dfe5ee';
  ctx.fillRect(txX(4), txY(1) + 15, 16, 1);

  // (5,1) Warm Cream Stucco Wall
  paintNoiseTile(5, 1, ['#f3e6cf', '#ede0c8', '#f7ebd6', '#e6d8be'], 1902);
  ctx.fillStyle = '#dccbb0';
  ctx.fillRect(txX(5), txY(1) + 15, 16, 1);

  // (6,1) Pastel Mint Wall
  paintNoiseTile(6, 1, ['#6ed6c3', '#64ccb9', '#7addcb', '#5ec3b0'], 1903);
  ctx.fillStyle = '#4fb3a0';
  ctx.fillRect(txX(6), txY(1) + 15, 16, 1);

  // (7,1) Pastel Sky-Blue Wall
  paintNoiseTile(7, 1, ['#72b9f5', '#67b0ee', '#80c3f9', '#5da6e6'], 1904);
  ctx.fillStyle = '#5097d6';
  ctx.fillRect(txX(7), txY(1) + 15, 16, 1);

  // (4,2) Pastel Coral-Rose Wall
  paintNoiseTile(4, 2, ['#ef7d8f', '#e77184', '#f4899a', '#de677a'], 1905);
  ctx.fillStyle = '#cc586b';
  ctx.fillRect(txX(4), txY(2) + 15, 16, 1);

  // (5,2) Sleek Charcoal Modern Trim
  paintNoiseTile(5, 2, ['#333b48', '#2e3541', '#394250', '#29303b'], 1906);
  ctx.fillStyle = '#485364';
  ctx.fillRect(txX(5) + 1, txY(2) + 1, 14, 1);

  // (6,2) Polished Honey-Oak Hardwood Floor
  paintNoiseTile(6, 2, ['#cf995c', '#c79053', '#d6a165', '#be874b'], 1907);
  ctx.fillStyle = '#a46f38';
  for (let r = 0; r < 16; r += 4) {
    ctx.fillRect(txX(6), txY(2) + r, 16, 1);
    ctx.fillRect(txX(6) + ((r * 3 + 4) % 14), txY(2) + r, 1, 4);
  }

  // (7,2) Modern Checkered Kitchen & Bathroom Ceramic Tile Floor
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const check = ((x >> 3) + (y >> 3)) % 2 === 0;
      ctx.fillStyle = check ? '#f1f5f9' : '#d2dce6';
      ctx.fillRect(txX(7) + x, txY(2) + y, 1, 1);
    }
  }
  ctx.fillStyle = '#b9c6d4';
  ctx.fillRect(txX(7), txY(2) + 7, 16, 1);
  ctx.fillRect(txX(7) + 7, txY(2), 1, 16);

  // (4,3) Modern Slate Roof Shingles
  paintNoiseTile(4, 3, ['#475569', '#3f4c5e', '#4f5e73', '#384454'], 1908);
  ctx.fillStyle = '#2d3745';
  for (let r = 3; r < 16; r += 4) {
    ctx.fillRect(txX(4), txY(3) + r, 16, 1);
  }

  // (5,3) Modern Terracotta Roof Shingles
  paintNoiseTile(5, 3, ['#cc5d49', '#c15440', '#d56753', '#b54c39'], 1909);
  ctx.fillStyle = '#993d2d';
  for (let r = 3; r < 16; r += 4) {
    ctx.fillRect(txX(5), txY(3) + r, 16, 1);
  }

  // (6,3) Soft Blue Area Rug
  paintNoiseTile(6, 3, ['#64aee8', '#5ba4de', '#6fb6ee'], 1910);
  ctx.fillStyle = '#a3d5fa';
  ctx.fillRect(txX(6) + 2, txY(3) + 2, 12, 1);
  ctx.fillRect(txX(6) + 2, txY(3) + 13, 12, 1);
  ctx.fillRect(txX(6) + 2, txY(3) + 2, 1, 12);
  ctx.fillRect(txX(6) + 13, txY(3) + 2, 1, 12);

  // (7,3) Soft Coral Area Rug
  paintNoiseTile(7, 3, ['#ea7d8f', '#e17385', '#f18899'], 1911);
  ctx.fillStyle = '#fac0ca';
  ctx.fillRect(txX(7) + 2, txY(3) + 2, 12, 1);
  ctx.fillRect(txX(7) + 2, txY(3) + 13, 12, 1);
  ctx.fillRect(txX(7) + 2, txY(3) + 2, 1, 12);
  ctx.fillRect(txX(7) + 13, txY(3) + 2, 1, 12);

  // (0,4) Bed Head Top (Oak headboard + crisp white pillow + teal sheet)
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(txX(0), txY(4), 16, 16);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(txX(0), txY(4), 16, 3);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(0) + 2, txY(4) + 3, 12, 6);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(txX(0) + 2, txY(4) + 8, 12, 1);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(txX(0), txY(4) + 10, 16, 2);

  // (1,4) Bed Foot Top (Vibrant modern sky-teal quilted duvet)
  paintNoiseTile(1, 4, ['#2bb8d6', '#25add0', '#33c1df'], 1912);
  ctx.fillStyle = '#7be0f4';
  ctx.fillRect(txX(1) + 2, txY(4) + 3, 12, 1);
  ctx.fillRect(txX(1) + 2, txY(4) + 8, 12, 1);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(txX(1), txY(4) + 14, 16, 2);

  // (2,4) Bed Side (Duvet overhang + white mattress + oak frame & legs)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(2), txY(4), 16, 8);
  ctx.fillStyle = '#2bb8d6';
  ctx.fillRect(txX(2), txY(4), 16, 4);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(txX(2), txY(4) + 8, 16, 4);
  ctx.fillStyle = '#5c3a1b';
  ctx.fillRect(txX(2) + 1, txY(4) + 12, 3, 4);
  ctx.fillRect(txX(2) + 12, txY(4) + 12, 3, 4);

  // (3,4) Sofa Top (Modern slate-blue tufted cushions & backrest)
  paintNoiseTile(3, 4, ['#5878a0', '#506f96', '#6182aa'], 1913);
  ctx.fillStyle = '#3f5878';
  ctx.fillRect(txX(3), txY(4), 16, 4);
  ctx.fillRect(txX(3), txY(4) + 10, 16, 1);
  ctx.fillStyle = '#7395bf';
  ctx.fillRect(txX(3) + 2, txY(4) + 5, 5, 4);
  ctx.fillRect(txX(3) + 9, txY(4) + 5, 5, 4);

  // (4,4) Sofa Side (Upholstered cushions + oak leg base)
  ctx.fillStyle = '#5878a0';
  ctx.fillRect(txX(4), txY(4), 16, 12);
  ctx.fillStyle = '#476385';
  ctx.fillRect(txX(4), txY(4) + 6, 16, 1);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(txX(4), txY(4) + 12, 16, 4);

  // (5,4) Modern Oak Table Top
  paintNoiseTile(5, 4, ['#d49f63', '#cc9658', '#dba76c'], 1914);
  ctx.fillStyle = '#b47e42';
  ctx.fillRect(txX(5), txY(4), 16, 1);
  ctx.fillRect(txX(5), txY(4) + 15, 16, 1);
  ctx.fillRect(txX(5), txY(4), 1, 16);
  ctx.fillRect(txX(5) + 15, txY(4), 1, 16);

  // (6,4) Modern Table Side (Wood apron + sleek charcoal legs)
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(txX(6), txY(4), 16, 16);
  ctx.fillStyle = '#c48d51';
  ctx.fillRect(txX(6), txY(4), 16, 4);
  ctx.fillStyle = '#333b48';
  ctx.fillRect(txX(6) + 1, txY(4) + 4, 2, 12);
  ctx.fillRect(txX(6) + 13, txY(4) + 4, 2, 12);

  // (7,4) Quartz Kitchen Countertop
  paintNoiseTile(7, 4, ['#f5f7fa', '#edf1f5', '#ffffff', '#e3e8ee'], 1915);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(7), txY(4) + 15, 16, 1);

  // (0,5) Modern Kitchen Cabinet Side (Quartz lip + oak/slate drawers + silver handles)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(txX(0), txY(5), 16, 3);
  ctx.fillStyle = '#c89256';
  ctx.fillRect(txX(0), txY(5) + 3, 16, 13);
  ctx.fillStyle = '#9e6b35';
  ctx.fillRect(txX(0) + 1, txY(5) + 4, 14, 4);
  ctx.fillRect(txX(0) + 1, txY(5) + 9, 14, 6);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(txX(0) + 6, txY(5) + 5, 4, 1);
  ctx.fillRect(txX(0) + 6, txY(5) + 11, 4, 1);

  // (1,5) Induction Stove Cooktop
  ctx.fillStyle = '#1e2430';
  ctx.fillRect(txX(1), txY(5), 16, 16);
  ctx.fillStyle = '#475569';
  ctx.fillRect(txX(1) + 2, txY(5) + 2, 5, 5);
  ctx.fillRect(txX(1) + 9, txY(5) + 2, 5, 5);
  ctx.fillRect(txX(1) + 2, txY(5) + 9, 5, 5);
  ctx.fillRect(txX(1) + 9, txY(5) + 9, 5, 5);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(txX(1) + 4, txY(5) + 4, 1, 1);
  ctx.fillRect(txX(1) + 11, txY(5) + 11, 1, 1);

  // (2,5) Modern Stainless Oven Front/Side
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(2), txY(5), 16, 16);
  ctx.fillStyle = '#334155';
  ctx.fillRect(txX(2) + 2, txY(5) + 1, 12, 3);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(txX(2) + 2, txY(5) + 6, 12, 7);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(txX(2) + 4, txY(5) + 5, 8, 1);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(txX(2) + 4, txY(5) + 9, 8, 2);

  // (3,5) Modern Silver-White Fridge Door
  paintNoiseTile(3, 5, ['#e2e8f0', '#dbe3ec', '#eaf0f6'], 1916);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(txX(3), txY(5) + 6, 16, 1);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(txX(3) + 12, txY(5) + 2, 1, 3);
  ctx.fillRect(txX(3) + 12, txY(5) + 8, 1, 6);

  // (4,5) Porcelain Sink Vanity Top
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(4), txY(5), 16, 16);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(txX(4) + 3, txY(5) + 4, 10, 9);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(txX(4) + 4, txY(5) + 5, 8, 7);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(txX(4) + 7, txY(5) + 2, 2, 4);

  // (5,5) White Porcelain Toilet Top
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(txX(5), txY(5), 16, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(5) + 3, txY(5) + 1, 10, 4);
  ctx.fillRect(txX(5) + 4, txY(5) + 6, 8, 8);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(5) + 6, txY(5) + 8, 4, 4);

  // (6,5) Clean Ceramic Fixture Side
  paintNoiseTile(6, 5, ['#f8fafc', '#f1f5f9', '#e2e8f0'], 1917);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(6), txY(5) + 7, 16, 1);

  // (7,5) Modern Bathtub Top (White rim + crystal aqua water)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(7), txY(5), 16, 16);
  ctx.fillStyle = '#67d3ee';
  ctx.fillRect(txX(7) + 2, txY(5) + 2, 12, 12);
  ctx.fillStyle = '#a5f3fc';
  ctx.fillRect(txX(7) + 4, txY(5) + 4, 5, 3);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(txX(7) + 7, txY(5) + 1, 2, 2);

  // (0,6) White Subway-Tiled Bathtub Side
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(0), txY(6), 16, 16);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(0), txY(6) + 5, 16, 1);
  ctx.fillRect(txX(0), txY(6) + 11, 16, 1);
  ctx.fillRect(txX(0) + 7, txY(6), 1, 6);
  ctx.fillRect(txX(0) + 12, txY(6) + 6, 1, 6);

  // (1,6) Smart Flat-Screen TV Front/Side
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(txX(1), txY(6), 16, 16);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(txX(1) + 2, txY(6) + 2, 12, 10);
  ctx.fillStyle = '#818cf8';
  ctx.fillRect(txX(1) + 4, txY(6) + 4, 8, 6);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(txX(1) + 3, txY(6) + 3, 3, 1);

  // (2,6) TV Frame Top
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(txX(2), txY(6), 16, 16);
  ctx.fillStyle = '#334155';
  ctx.fillRect(txX(2) + 2, txY(6) + 5, 12, 6);

  // (3,6) Colorful Modern Bookshelf
  ctx.fillStyle = '#b98750';
  ctx.fillRect(txX(3), txY(6), 16, 16);
  ctx.fillStyle = '#3b2616';
  ctx.fillRect(txX(3) + 1, txY(6) + 2, 14, 5);
  ctx.fillRect(txX(3) + 1, txY(6) + 9, 14, 5);
  const bookCols = ['#ef4444', '#38bdf8', '#22c55e', '#facc15', '#ec4899', '#a855f7'];
  for (let b = 0; b < 6; b++) {
    ctx.fillStyle = bookCols[b];
    ctx.fillRect(txX(3) + 2 + b * 2, txY(6) + 3, 2, 4);
    ctx.fillStyle = bookCols[(b + 2) % bookCols.length];
    ctx.fillRect(txX(3) + 2 + b * 2, txY(6) + 10, 2, 4);
  }

  // (4,6) Warm Glowing Ceiling Lamp Face
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(txX(4), txY(6), 16, 16);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(txX(4) + 2, txY(6) + 2, 12, 12);
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(txX(4) + 4, txY(6) + 4, 8, 8);

  // (5,6) Classic Oak Wood Minecraft Door Icon
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(txX(5), txY(6), 16, 16);
  ctx.fillStyle = '#b47b43';
  ctx.fillRect(txX(5) + 1, txY(6) + 1, 14, 14);
  ctx.fillStyle = '#71461f';
  ctx.fillRect(txX(5) + 3, txY(6) + 2, 10, 5);
  ctx.fillRect(txX(5) + 3, txY(6) + 9, 10, 5);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(txX(5) + 12, txY(6) + 7, 2, 2);

  // (6,6) Brushed Light-Steel Fridge Top
  paintNoiseTile(6, 6, ['#e2e8f0', '#dbe3ec', '#eef3f8'], 1918);

  // (7,6) Lamp Side Trim
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(txX(7), txY(6), 16, 16);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(txX(7) + 2, txY(6) + 13, 12, 3);

  // Helper to paint crisp solid Minecraft-style paneled door top & bottom halves (no glass)
  const paintSolidBlockDoor = (
    topCol: number,
    botCol: number,
    frameCol: string,
    panelCol: string,
    insetCol: string,
    plankLineCol: string,
    knobCol: string,
  ) => {
    // Top half: raised solid top panel + wood/painted vertical stiles
    ctx.fillStyle = frameCol;
    ctx.fillRect(txX(topCol), txY(7), 16, 16);
    ctx.fillStyle = panelCol;
    ctx.fillRect(txX(topCol) + 1, txY(7) + 1, 14, 15);
    ctx.fillStyle = plankLineCol;
    ctx.fillRect(txX(topCol) + 7, txY(7) + 1, 1, 15);
    ctx.fillStyle = insetCol;
    ctx.fillRect(txX(topCol) + 3, txY(7) + 3, 10, 10);
    ctx.fillStyle = panelCol;
    ctx.fillRect(txX(topCol) + 4, txY(7) + 4, 8, 8);
    // Iron hinge strap top
    ctx.fillStyle = '#334155';
    ctx.fillRect(txX(topCol), txY(7) + 3, 2, 3);

    // Bottom half: raised solid lower panel + kickplate + knob + hinge
    ctx.fillStyle = frameCol;
    ctx.fillRect(txX(botCol), txY(7), 16, 16);
    ctx.fillStyle = panelCol;
    ctx.fillRect(txX(botCol) + 1, txY(7), 14, 15);
    ctx.fillStyle = plankLineCol;
    ctx.fillRect(txX(botCol) + 7, txY(7), 1, 15);
    ctx.fillStyle = insetCol;
    ctx.fillRect(txX(botCol) + 3, txY(7) + 3, 10, 9);
    ctx.fillStyle = panelCol;
    ctx.fillRect(txX(botCol) + 4, txY(7) + 4, 8, 7);
    ctx.fillStyle = knobCol;
    ctx.fillRect(txX(botCol) + 12, txY(7) + 1, 2, 3);
    ctx.fillStyle = '#334155';
    ctx.fillRect(txX(botCol), txY(7) + 10, 2, 3);
  };

  // (0,7)-(1,7) Classic Oak Wood Block Door
  paintSolidBlockDoor(0, 1, '#6e451e', '#a9723c', '#7d4f24', '#8e5d2d', '#facc15');
  // (2,7)-(3,7) Crisp White Painted Block Door (also tinted for Coral door)
  paintSolidBlockDoor(2, 3, '#cbd5e1', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8');
  // (4,7)-(5,7) Pastel Mint Colored Block Door
  paintSolidBlockDoor(4, 5, '#3b9685', '#6fd7c4', '#4eb8a5', '#42a392', '#f8fafc');
  // (6,7)-(7,7) Pastel Sky-Blue Colored Block Door
  paintSolidBlockDoor(6, 7, '#3f7eb8', '#75bbf5', '#529cdb', '#478bc7', '#f8fafc');

  // ------------------------------------------------------------------
  // MINECRAFT-INSPIRED FOREST VARIETY: BIRCH, PINE, DARK OAK & FLORA
  // ------------------------------------------------------------------
  // (0,8) Birch Log Side (crisp white bark + horizontal dark charcoal markings)
  paintNoiseTile(0, 8, ['#ecebe5', '#e4e2da', '#f2f1ec', '#dcdad0'], 2101);
  ctx.fillStyle = '#33363b';
  ctx.fillRect(txX(0) + 1, txY(8) + 2, 5, 2);
  ctx.fillRect(txX(0) + 9, txY(8) + 4, 6, 1);
  ctx.fillRect(txX(0) + 3, txY(8) + 7, 7, 2);
  ctx.fillRect(txX(0) + 11, txY(8) + 10, 4, 2);
  ctx.fillRect(txX(0) + 2, txY(8) + 13, 6, 1);

  // (1,8) Birch Log Top
  ctx.fillStyle = '#e4e2da';
  ctx.fillRect(txX(1), txY(8), 16, 16);
  ctx.fillStyle = '#c8b89a';
  ctx.fillRect(txX(1) + 2, txY(8) + 2, 12, 12);
  ctx.fillStyle = '#b4a282';
  ctx.fillRect(txX(1) + 4, txY(8) + 4, 8, 8);
  ctx.fillStyle = '#8b7756';
  ctx.fillRect(txX(1) + 7, txY(8) + 7, 2, 2);

  // (2,8) Pine / Spruce Log Side (rich dark conifer bark)
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const ridge = (x + ((y * 5) % 3 === 0 ? 1 : 0)) % 4;
      ctx.fillStyle =
        ridge === 0 ? '#2b1b10' : ridge === 1 ? '#3b2618' : ridge === 2 ? '#472f1e' : '#322014';
      ctx.fillRect(txX(2) + x, txY(8) + y, 1, 1);
    }
  }

  // (3,8) Pine / Spruce Log Top
  ctx.fillStyle = '#3b2618';
  ctx.fillRect(txX(3), txY(8), 16, 16);
  ctx.fillStyle = '#8e6b46';
  ctx.fillRect(txX(3) + 2, txY(8) + 2, 12, 12);
  ctx.fillStyle = '#795936';
  ctx.fillRect(txX(3) + 5, txY(8) + 5, 6, 6);

  // (4,8) Sunlit Birch Leaves
  paintNoiseTile(4, 8, ['#64bd4b', '#74cc58', '#53ab3c', '#82d664'], 2102);
  ctx.fillStyle = '#397c28';
  ctx.fillRect(txX(4) + 2, txY(8) + 4, 2, 2);
  ctx.fillRect(txX(4) + 11, txY(8) + 2, 2, 2);
  ctx.fillRect(txX(4) + 7, txY(8) + 10, 2, 2);

  // (5,8) Deep Evergreen Pine / Spruce Needles
  paintNoiseTile(5, 8, ['#285d3f', '#214f34', '#316c4a', '#1b422b'], 2103);
  ctx.fillStyle = '#13321f';
  ctx.fillRect(txX(5) + 3, txY(8) + 2, 2, 2);
  ctx.fillRect(txX(5) + 10, txY(8) + 7, 2, 2);
  ctx.fillRect(txX(5) + 4, txY(8) + 12, 2, 2);

  // (6,8) Deep Woodland Dark Oak Leaves
  paintNoiseTile(6, 8, ['#255b22', '#2e692a', '#1d4a1b', '#387633'], 2104);
  ctx.fillStyle = '#143813';
  ctx.fillRect(txX(6) + 1, txY(8) + 3, 2, 2);
  ctx.fillRect(txX(6) + 9, txY(8) + 6, 2, 2);
  ctx.fillRect(txX(6) + 5, txY(8) + 11, 2, 2);

  // (0,9) Transparent Cutout: Red Wildflower Poppy
  ctx.clearRect(txX(0), txY(9), 16, 16);
  ctx.fillStyle = '#2d7a2b';
  ctx.fillRect(txX(0) + 7, txY(9) + 7, 2, 9);
  ctx.fillRect(txX(0) + 5, txY(9) + 11, 2, 2);
  ctx.fillRect(txX(0) + 9, txY(9) + 10, 2, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(txX(0) + 5, txY(9) + 3, 6, 4);
  ctx.fillRect(txX(0) + 6, txY(9) + 2, 4, 6);
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(txX(0) + 6, txY(9) + 3, 2, 2);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(txX(0) + 7, txY(9) + 4, 2, 2);

  // (1,9) Transparent Cutout: Yellow Dandelion / Sunbloom
  ctx.clearRect(txX(1), txY(9), 16, 16);
  ctx.fillStyle = '#388e34';
  ctx.fillRect(txX(1) + 7, txY(9) + 8, 2, 8);
  ctx.fillRect(txX(1) + 4, txY(9) + 12, 3, 2);
  ctx.fillRect(txX(1) + 9, txY(9) + 11, 3, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(txX(1) + 4, txY(9) + 4, 8, 4);
  ctx.fillRect(txX(1) + 5, txY(9) + 3, 6, 6);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(txX(1) + 6, txY(9) + 4, 3, 2);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(txX(1) + 7, txY(9) + 5, 2, 2);

  // (2,9) Transparent Cutout: Multi-blade Minecraft Forest Tall Grass
  ctx.clearRect(txX(2), txY(9), 16, 16);
  const blades: ReadonlyArray<[number, number, number, string]> = [
    [2, 7, 9, '#499131'],
    [4, 4, 12, '#62b346'],
    [6, 6, 10, '#3e8028'],
    [8, 3, 13, '#6cc24e'],
    [10, 5, 11, '#509e37'],
    [12, 6, 10, '#448a2d'],
    [14, 8, 8, '#5eb142'],
  ];
  for (const [bx, byTop, bh, col] of blades) {
    ctx.fillStyle = col;
    ctx.fillRect(txX(2) + bx, txY(9) + byTop, 1, bh);
    if (bx + 1 < 16) ctx.fillRect(txX(2) + bx + 1, txY(9) + byTop + 2, 1, bh - 2);
  }

  // (3,9) Transparent Cutout: Lush Woodland Fern
  ctx.clearRect(txX(3), txY(9), 16, 16);
  ctx.fillStyle = '#2b6b28';
  ctx.fillRect(txX(3) + 7, txY(9) + 6, 2, 10);
  ctx.fillStyle = '#3b8c34';
  ctx.fillRect(txX(3) + 3, txY(9) + 9, 10, 2);
  ctx.fillRect(txX(3) + 4, txY(9) + 6, 8, 2);
  ctx.fillRect(txX(3) + 2, txY(9) + 12, 12, 2);
  ctx.fillStyle = '#57b048';
  ctx.fillRect(txX(3) + 5, txY(9) + 4, 6, 2);
  ctx.fillRect(txX(3) + 2, txY(9) + 8, 3, 2);
  ctx.fillRect(txX(3) + 11, txY(9) + 8, 3, 2);
  ctx.fillRect(txX(3) + 1, txY(9) + 11, 3, 2);
  ctx.fillRect(txX(3) + 12, txY(9) + 11, 3, 2);

  // Extended Colorable School Craft Tiles (Rows 10 & 11 — Neutral grayscale multiplied by vertex tints)
  // (0,10) Smooth Architectural Concrete
  paintNoiseTile(0, 10, ['#f4f4f6', '#ffffff', '#e8eaee', '#eef0f4'], 1101);
  ctx.fillStyle = '#dcdfe6';
  ctx.fillRect(txX(0), txY(10) + 15, 16, 1);
  ctx.fillRect(txX(0) + 15, txY(10), 1, 16);

  // (1,10) Painted Masonry Bricks
  paintNoiseTile(1, 10, ['#f2f2f2', '#e4e4e4', '#fafafa', '#dadada'], 1102);
  ctx.fillStyle = '#a8a8a8';
  for (const rY of [0, 4, 8, 12]) {
    ctx.fillRect(txX(1), txY(10) + rY, 16, 1);
  }
  for (const [rY, sx] of [
    [1, 3],
    [1, 11],
    [5, 7],
    [5, 15],
    [9, 3],
    [9, 11],
    [13, 7],
    [13, 15],
  ] as const) {
    ctx.fillRect(txX(1) + sx, txY(10) + rY, 1, 3);
  }

  // (2,10) Carved Stone Bricks
  paintNoiseTile(2, 10, ['#efefef', '#e0e0e0', '#f7f7f7', '#d5d5d5'], 1103);
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(txX(2), txY(10), 16, 1);
  ctx.fillRect(txX(2), txY(10) + 8, 16, 1);
  ctx.fillRect(txX(2) + 7, txY(10) + 1, 1, 7);
  ctx.fillRect(txX(2) + 15, txY(10) + 9, 1, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(2), txY(10) + 1, 16, 1);
  ctx.fillRect(txX(2), txY(10) + 9, 16, 1);

  // (3,10) Stained Timber Planks
  paintNoiseTile(3, 10, ['#f4f4f5', '#e4e4e7', '#fafafa', '#dcdce0'], 1104);
  ctx.fillStyle = '#a1a1aa';
  for (const rY of [0, 4, 8, 12]) {
    ctx.fillRect(txX(3), txY(10) + rY, 16, 1);
  }
  ctx.fillRect(txX(3) + 5, txY(10) + 1, 1, 3);
  ctx.fillRect(txX(3) + 12, txY(10) + 5, 1, 3);
  ctx.fillRect(txX(3) + 3, txY(10) + 9, 1, 3);
  ctx.fillRect(txX(3) + 10, txY(10) + 13, 1, 3);

  // (4,10) Glazed Ceramic Tile Squares
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(4), txY(10), 16, 16);
  ctx.fillStyle = '#b4b8c2';
  for (let i = 0; i < 16; i += 4) {
    ctx.fillRect(txX(4), txY(10) + i, 16, 1);
    ctx.fillRect(txX(4) + i, txY(10), 1, 16);
  }
  ctx.fillStyle = '#ffffff';
  for (let y = 1; y < 16; y += 4) {
    for (let x = 1; x < 16; x += 4) {
      ctx.fillRect(txX(4) + x, txY(10) + y, 2, 1);
    }
  }

  // (5,10) Soft Woven Craft Wool
  paintNoiseTile(5, 10, ['#fafafa', '#ececee', '#e2e2e6', '#f4f4f6'], 1105);
  ctx.fillStyle = '#d4d4d8';
  for (let y = 2; y < 16; y += 4) {
    for (let x = y % 8 === 2 ? 1 : 3; x < 16; x += 4) {
      ctx.fillRect(txX(5) + x, txY(10) + y, 2, 1);
    }
  }

  // (6,10) Layered Roof Shingles
  paintNoiseTile(6, 10, ['#f3f4f6', '#e5e7eb', '#d4d4d8'], 1106);
  ctx.fillStyle = '#9ca3af';
  for (const rY of [3, 7, 11, 15]) {
    ctx.fillRect(txX(6), txY(10) + rY, 16, 1);
  }
  ctx.fillStyle = '#ffffff';
  for (const rY of [0, 4, 8, 12]) {
    ctx.fillRect(txX(6), txY(10) + rY, 16, 1);
  }

  // (7,10) Fluted Ribbed Pillar
  for (let x = 0; x < 16; x++) {
    ctx.fillStyle = x % 4 === 0 ? '#a8adb8' : x % 4 === 1 ? '#ffffff' : '#e6e8ed';
    ctx.fillRect(txX(7) + x, txY(10), 1, 16);
  }

  // (0,11) Mosaic Decorative Tile
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(txX(0), txY(11), 16, 16);
  ctx.fillStyle = '#b4b8c2';
  ctx.fillRect(txX(0), txY(11), 16, 2);
  ctx.fillRect(txX(0), txY(11) + 14, 16, 2);
  ctx.fillRect(txX(0), txY(11), 2, 16);
  ctx.fillRect(txX(0) + 14, txY(11), 2, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(0) + 4, txY(11) + 4, 8, 8);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(0) + 6, txY(11) + 6, 4, 4);

  // (1,11) Cobblestone Craft Block
  paintNoiseTile(1, 11, ['#d4d4d8', '#ececee', '#a1a1aa', '#e4e4e7'], 1107);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(1) + 2, txY(11) + 2, 5, 4);
  ctx.fillRect(txX(1) + 9, txY(11) + 3, 5, 5);
  ctx.fillRect(txX(1) + 2, txY(11) + 9, 6, 5);
  ctx.fillRect(txX(1) + 10, txY(11) + 10, 4, 4);

  // (2,11) Stained Craft Glass (semi-transparent center + bright border)
  ctx.clearRect(txX(2), txY(11), 16, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillRect(txX(2) + 1, txY(11) + 1, 14, 14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(txX(2), txY(11), 16, 1);
  ctx.fillRect(txX(2), txY(11) + 15, 16, 1);
  ctx.fillRect(txX(2), txY(11), 1, 16);
  ctx.fillRect(txX(2) + 15, txY(11), 1, 16);
  ctx.fillRect(txX(2) + 3, txY(11) + 3, 3, 1);
  ctx.fillRect(txX(2) + 4, txY(11) + 4, 3, 1);
  ctx.fillRect(txX(2) + 9, txY(11) + 11, 3, 1);

  // (3,11) Luminous Neon Glow Block
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(txX(3), txY(11), 16, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(txX(3) + 2, txY(11) + 2, 12, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(txX(3) + 4, txY(11) + 4, 8, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an emissive mask atlas highlighting city ceiling lamps, desk lamps, and screens
 * so building & house lights turn ON automatically at night and OFF during daytime.
 */
function createVoxelEmissiveAtlasTexture(): THREE.CanvasTexture {
  const tileSize = 16;
  const width = ATLAS_COLS * tileSize;
  const height = ATLAS_ROWS * tileSize;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const txX = (tx: number) => tx * tileSize;
  const txY = (ty: number) => ty * tileSize;

  // (4,6) Warm Glowing Ceiling / Street Lamp Face
  ctx.fillStyle = '#ffd978';
  ctx.fillRect(txX(4) + 2, txY(6) + 2, 12, 12);
  ctx.fillStyle = '#fff8cf';
  ctx.fillRect(txX(4) + 4, txY(6) + 4, 8, 8);

  // (7,6) Lamp Side Diffuser Trim
  ctx.fillStyle = '#ffcf66';
  ctx.fillRect(txX(7) + 2, txY(6) + 12, 12, 4);

  // (1,6) Smart Flat-Screen TV Soft Glow
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(txX(1) + 2, txY(6) + 2, 12, 10);

  // (3,11) Craft Glow Block soft night luminescence (subtle so vertex tint stays vivid)
  ctx.fillStyle = '#52525b';
  ctx.fillRect(txX(3) + 3, txY(11) + 3, 10, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a 6-stage (96x16) transparent pixel-art crack overlay texture.
 */
export function createCrackAtlasTexture(): THREE.CanvasTexture {
  const frames = 6;
  const tile = 16;
  const canvas = document.createElement('canvas');
  canvas.width = frames * tile;
  canvas.height = tile;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const crackSegments: Array<Array<[number, number]>> = [
    [[7, 7], [8, 8], [7, 8]],
    [[6, 6], [7, 6], [9, 8], [9, 9], [6, 9]],
    [[5, 5], [5, 7], [10, 7], [10, 10], [5, 10], [8, 5]],
    [[4, 4], [4, 6], [11, 5], [12, 8], [8, 12], [4, 11], [9, 4]],
    [[3, 3], [2, 5], [12, 3], [13, 7], [11, 12], [6, 13], [2, 11], [9, 2]],
    [[1, 2], [2, 8], [13, 2], [14, 10], [12, 14], [4, 14], [1, 13], [7, 1], [14, 5]],
  ];

  for (let f = 0; f < frames; f++) {
    const ox = f * tile;
    ctx.fillStyle = `rgba(10, 10, 14, ${0.06 + f * 0.035})`;
    ctx.fillRect(ox, 0, tile, tile);

    for (let s = 0; s <= f; s++) {
      for (const [px, py] of crackSegments[s]) {
        ctx.fillStyle = 'rgba(18, 18, 22, 0.85)';
        ctx.fillRect(ox + px, py, 1, 1);
        if (f >= 2 && px + 1 < tile) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(ox + px + 1, py, 1, 1);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(1 / frames, 1);
  tex.needsUpdate = true;
  return tex;
}

function getTileForFace(id: VoxelId, face: 'top' | 'bottom' | 'side'): TileCoord {
  switch (id) {
    case VOXEL_ID.GRASS:
      if (face === 'top') return TILE.GRASS_TOP;
      if (face === 'bottom') return TILE.DIRT;
      return TILE.GRASS_SIDE;
    case VOXEL_ID.DIRT:
      return TILE.DIRT;
    case VOXEL_ID.STONE:
      return TILE.STONE;
    case VOXEL_ID.SAND:
      return TILE.SAND;
    case VOXEL_ID.LOG:
      return face === 'top' || face === 'bottom' ? TILE.LOG_TOP : TILE.LOG_SIDE;
    case VOXEL_ID.BIRCH_LOG:
      return face === 'top' || face === 'bottom' ? TILE.BIRCH_LOG_TOP : TILE.BIRCH_LOG_SIDE;
    case VOXEL_ID.PINE_LOG:
      return face === 'top' || face === 'bottom' ? TILE.PINE_LOG_TOP : TILE.PINE_LOG_SIDE;
    case VOXEL_ID.LEAVES:
      return TILE.LEAVES;
    case VOXEL_ID.BIRCH_LEAVES:
      return TILE.BIRCH_LEAVES;
    case VOXEL_ID.PINE_LEAVES:
      return TILE.PINE_LEAVES;
    case VOXEL_ID.DARK_LEAVES:
      return TILE.DARK_LEAVES;
    case VOXEL_ID.FLOWER_RED:
      return TILE.FLOWER_RED;
    case VOXEL_ID.FLOWER_YELLOW:
      return TILE.FLOWER_YELLOW;
    case VOXEL_ID.TALL_GRASS:
      return TILE.TALL_GRASS;
    case VOXEL_ID.FERN_BUSH:
      return TILE.FERN_BUSH;
    case VOXEL_ID.MOSS_STONE:
      return TILE.MOSS_STONE;
    case VOXEL_ID.ASPHALT:
    case VOXEL_ID.ROAD_LINE:
    case VOXEL_ID.ROAD_LINE_EW:
    case VOXEL_ID.ROAD_EDGE_W:
    case VOXEL_ID.ROAD_EDGE_E:
    case VOXEL_ID.ROAD_EDGE_N:
    case VOXEL_ID.ROAD_EDGE_S:
    case VOXEL_ID.ROAD_CROSSWALK_NS:
    case VOXEL_ID.ROAD_CROSSWALK_EW:
    case VOXEL_ID.ROAD_DRAIN:
      if (face === 'top') {
        if (id === VOXEL_ID.ROAD_LINE || id === VOXEL_ID.ROAD_LINE_EW) return TILE.ROAD_LINE;
        if (
          id === VOXEL_ID.ROAD_EDGE_W ||
          id === VOXEL_ID.ROAD_EDGE_E ||
          id === VOXEL_ID.ROAD_EDGE_N ||
          id === VOXEL_ID.ROAD_EDGE_S
        ) {
          return TILE.ROAD_WHITE_EDGE;
        }
        if (id === VOXEL_ID.ROAD_CROSSWALK_NS || id === VOXEL_ID.ROAD_CROSSWALK_EW) {
          return TILE.ROAD_CROSSWALK;
        }
        if (id === VOXEL_ID.ROAD_DRAIN) return TILE.ROAD_DRAIN;
      }
      return TILE.ASPHALT;
    case VOXEL_ID.SIDEWALK:
      return face === 'top' ? TILE.SIDEWALK : TILE.STONE;
    case VOXEL_ID.BRICK:
      return TILE.BRICK;
    case VOXEL_ID.PLANKS:
      return TILE.PLANKS;
    case VOXEL_ID.CONCRETE:
      return TILE.CONCRETE;
    case VOXEL_ID.GLASS:
      return TILE.GLASS;
    case VOXEL_ID.WHITE_WALL:
      return TILE.WHITE_WALL;
    case VOXEL_ID.CREAM_WALL:
      return TILE.CREAM_WALL;
    case VOXEL_ID.MINT_WALL:
      return TILE.MINT_WALL;
    case VOXEL_ID.SKY_WALL:
      return TILE.SKY_WALL;
    case VOXEL_ID.CORAL_WALL:
      return TILE.CORAL_WALL;
    case VOXEL_ID.CHARCOAL_TRIM:
      return TILE.CHARCOAL_TRIM;
    case VOXEL_ID.OAK_FLOOR:
      return TILE.OAK_FLOOR;
    case VOXEL_ID.TILE_FLOOR:
      return TILE.TILE_FLOOR;
    case VOXEL_ID.SLATE_ROOF:
      return TILE.SLATE_ROOF;
    case VOXEL_ID.RED_ROOF:
      return TILE.RED_ROOF;
    case VOXEL_ID.CARPET_BLUE:
      return TILE.CARPET_BLUE;
    case VOXEL_ID.CARPET_CORAL:
      return TILE.CARPET_CORAL;
    case VOXEL_ID.BED_HEAD:
      return face === 'top' ? TILE.BED_HEAD_TOP : TILE.BED_SIDE;
    case VOXEL_ID.BED_FOOT:
      return face === 'top' ? TILE.BED_FOOT_TOP : TILE.BED_SIDE;
    case VOXEL_ID.SOFA:
      return face === 'top' ? TILE.SOFA_TOP : TILE.SOFA_SIDE;
    case VOXEL_ID.TABLE:
      return face === 'top' ? TILE.TABLE_TOP : TILE.TABLE_SIDE;
    case VOXEL_ID.KITCHEN_COUNTER:
      return face === 'top' ? TILE.COUNTER_TOP : TILE.COUNTER_SIDE;
    case VOXEL_ID.STOVE:
      return face === 'top' ? TILE.STOVE_TOP : TILE.STOVE_SIDE;
    case VOXEL_ID.FRIDGE:
      return face === 'top' || face === 'bottom' ? TILE.FRIDGE_TOP : TILE.FRIDGE_SIDE;
    case VOXEL_ID.SINK_COUNTER:
      return face === 'top' ? TILE.SINK_TOP : TILE.COUNTER_SIDE;
    case VOXEL_ID.TOILET:
      return face === 'top' ? TILE.TOILET_TOP : TILE.TOILET_SIDE;
    case VOXEL_ID.BATHTUB:
      return face === 'top' ? TILE.BATHTUB_TOP : TILE.BATHTUB_SIDE;
    case VOXEL_ID.TV_SCREEN:
      return face === 'top' || face === 'bottom' ? TILE.TV_TOP : TILE.TV_SIDE;
    case VOXEL_ID.BOOKSHELF:
      return face === 'top' || face === 'bottom' ? TILE.OAK_FLOOR : TILE.BOOKSHELF_SIDE;
    case VOXEL_ID.LAMP_BLOCK:
      return face === 'bottom' || face === 'top' ? TILE.LAMP_FACE : TILE.LAMP_SIDE;
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
      return face === 'top' || face === 'bottom' ? TILE.OAK_FLOOR : TILE.DOOR_WOOD_TOP;
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
      return face === 'top' || face === 'bottom' ? TILE.WHITE_WALL : TILE.DOOR_WHITE_TOP;
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
      return face === 'top' || face === 'bottom' ? TILE.MINT_WALL : TILE.DOOR_MINT_TOP;
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
      return face === 'top' || face === 'bottom' ? TILE.SKY_WALL : TILE.DOOR_SKY_TOP;
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
      return face === 'top' || face === 'bottom' ? TILE.CORAL_WALL : TILE.DOOR_FACE;
    case VOXEL_ID.CUPBOARD_OAK:
      return face === 'top' || face === 'bottom' ? TILE.OAK_FLOOR : TILE.COUNTER_SIDE;
    case VOXEL_ID.CUPBOARD_WHITE:
      return face === 'top' || face === 'bottom' ? TILE.WHITE_WALL : TILE.FRIDGE_SIDE;
    case VOXEL_ID.CUPBOARD_SKY:
      return face === 'top' || face === 'bottom' ? TILE.SKY_WALL : TILE.MINT_WALL;
    default:
      return TILE.DIRT;
  }
}

function getTopUvRotation(id: VoxelId): number {
  switch (id) {
    case VOXEL_ID.ROAD_LINE_EW:
    case VOXEL_ID.ROAD_EDGE_N:
    case VOXEL_ID.ROAD_CROSSWALK_EW:
      return 1;
    case VOXEL_ID.ROAD_EDGE_E:
      return 2;
    case VOXEL_ID.ROAD_EDGE_S:
      return 3;
    default:
      return 0;
  }
}

function pushVoxelQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  colors: number[],
  indices: number[],
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number],
  v3: [number, number, number],
  normal: [number, number, number],
  tile: TileCoord,
  shade: number,
  uvRot = 0,
  tint: readonly [number, number, number] = [1, 1, 1],
): void {
  const baseIndex = positions.length / 3;

  positions.push(...v0, ...v1, ...v2, ...v3);
  const r = shade * tint[0];
  const g = shade * tint[1];
  const b = shade * tint[2];
  for (let i = 0; i < 4; i++) {
    normals.push(...normal);
    colors.push(r, g, b);
  }

  const gridX = ATLAS_COLS;
  const gridY = ATLAS_ROWS;
  const epsU = 0.001;
  const epsV = 0.001;
  const u0 = tile[0] / gridX + epsU;
  const u1 = (tile[0] + 1) / gridX - epsU;
  const vTop = 1 - tile[1] / gridY - epsV;
  const vBot = 1 - (tile[1] + 1) / gridY + epsV;

  if (uvRot === 1) {
    uvs.push(u1, vBot, u1, vTop, u0, vTop, u0, vBot);
  } else if (uvRot === 2) {
    uvs.push(u1, vTop, u0, vTop, u0, vBot, u1, vBot);
  } else if (uvRot === 3) {
    uvs.push(u0, vTop, u0, vBot, u1, vBot, u1, vTop);
  } else {
    uvs.push(u0, vBot, u1, vBot, u1, vTop, u0, vTop);
  }
  indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
}

function pushVoxelQuadUV(
  positions: number[],
  normals: number[],
  uvs: number[],
  colors: number[],
  indices: number[],
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number],
  v3: [number, number, number],
  normal: [number, number, number],
  tile: TileCoord,
  shade: number,
  flipU: boolean,
): void {
  const baseIndex = positions.length / 3;

  positions.push(...v0, ...v1, ...v2, ...v3);
  for (let i = 0; i < 4; i++) {
    normals.push(...normal);
    colors.push(shade, shade, shade);
  }

  const gridX = ATLAS_COLS;
  const gridY = ATLAS_ROWS;
  const epsU = 0.001;
  const epsV = 0.001;
  const uLeft = tile[0] / gridX + epsU;
  const uRight = (tile[0] + 1) / gridX - epsU;
  const u0 = flipU ? uRight : uLeft;
  const u1 = flipU ? uLeft : uRight;
  const vTop = 1 - tile[1] / gridY - epsV;
  const vBot = 1 - (tile[1] + 1) / gridY + epsV;

  uvs.push(u0, vBot, u1, vBot, u1, vTop, u0, vTop);
  indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
}

export interface DoorPlacementInfo {
  alongX: boolean;
  hingePositive: boolean;
  hingeU: number;
  height: number;
}

export function doorAnimKey(gx: number, yBot: number, gz: number): string {
  return `${gx},${yBot},${gz}`;
}

export function resolveDoorPlacement(gx: number, yBot: number, gz: number): DoorPlacementInfo {
  const leftWall = isOpaqueBlock(getVoxel(gx - 1, yBot, gz));
  const rightWall = isOpaqueBlock(getVoxel(gx + 1, yBot, gz));
  const northWall = isOpaqueBlock(getVoxel(gx, yBot, gz - 1));
  const southWall = isOpaqueBlock(getVoxel(gx, yBot, gz + 1));

  const leftDoor = isDoorVoxel(getVoxel(gx - 1, yBot, gz));
  const rightDoor = isDoorVoxel(getVoxel(gx + 1, yBot, gz));
  const northDoor = isDoorVoxel(getVoxel(gx, yBot, gz - 1));
  const southDoor = isDoorVoxel(getVoxel(gx, yBot, gz + 1));

  const xConn = (leftWall ? 1 : 0) + (rightWall ? 1 : 0) + (leftDoor ? 2 : 0) + (rightDoor ? 2 : 0);
  const zConn = (northWall ? 1 : 0) + (southWall ? 1 : 0) + (northDoor ? 2 : 0) + (southDoor ? 2 : 0);
  const alongX = xConn >= zConn;

  const hingePositive = alongX
    ? (rightWall && !leftWall) || (rightWall && leftDoor)
    : (southWall && !northWall) || (southWall && northDoor);
  const hingeU = hingePositive ? 0.44 : -0.44;
  const height = isDoorVoxel(getVoxel(gx, yBot + 1, gz)) ? 2 : 1;

  return { alongX, hingePositive, hingeU, height };
}

interface DoorMeshBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
}

function getDoorTilesAndTint(id: VoxelId): {
  topTile: TileCoord;
  botTile: TileCoord;
  tint: readonly [number, number, number];
  isWood: boolean;
} {
  switch (id) {
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
      return { topTile: TILE.DOOR_WHITE_TOP, botTile: TILE.DOOR_WHITE_BOT, tint: [1, 1, 1], isWood: false };
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
      return { topTile: TILE.DOOR_MINT_TOP, botTile: TILE.DOOR_MINT_BOT, tint: [1, 1, 1], isWood: false };
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
      return { topTile: TILE.DOOR_SKY_TOP, botTile: TILE.DOOR_SKY_BOT, tint: [1, 1, 1], isWood: false };
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
      return { topTile: TILE.DOOR_WHITE_TOP, botTile: TILE.DOOR_WHITE_BOT, tint: [0.96, 0.52, 0.6], isWood: false };
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
    default:
      return { topTile: TILE.DOOR_WOOD_TOP, botTile: TILE.DOOR_WOOD_BOT, tint: [1, 1, 1], isWood: true };
  }
}

function pushDoorBox(
  buf: DoorMeshBuffers,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  w0: number,
  w1: number,
  tile: TileCoord,
  alongX: boolean,
  pivotU: number,
  originX: number,
  originY: number,
  originZ: number,
  rotY: number,
  tint: readonly [number, number, number] = [1, 1, 1],
): void {
  const cosR = rotY !== 0 ? Math.cos(rotY) : 1;
  const sinR = rotY !== 0 ? Math.sin(rotY) : 0;

  const xPt = (u: number, v: number, w: number): [number, number, number] => {
    const lu = u - pivotU;
    const lx = alongX ? lu : -w;
    const lz = alongX ? w : lu;
    const rx = rotY !== 0 ? lx * cosR + lz * sinR : lx;
    const rz = rotY !== 0 ? -lx * sinR + lz * cosR : lz;
    return [originX + rx, originY + v, originZ + rz];
  };

  const xNorm = (nu: number, nv: number, nw: number): [number, number, number] => {
    const lx = alongX ? nu : -nw;
    const lz = alongX ? nw : nu;
    const rx = rotY !== 0 ? lx * cosR + lz * sinR : lx;
    const rz = rotY !== 0 ? -lx * sinR + lz * cosR : lz;
    return [rx, nv, rz];
  };

  const { positions: pos, normals: norm, uvs: uvArr, colors: col, indices: idx } = buf;

  const emitFace = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    n: [number, number, number],
    shade: number,
  ) => {
    const baseIndex = pos.length / 3;
    pos.push(...p0, ...p1, ...p2, ...p3);
    const cr = shade * tint[0];
    const cg = shade * tint[1];
    const cb = shade * tint[2];
    for (let i = 0; i < 4; i++) {
      norm.push(...n);
      col.push(cr, cg, cb);
    }
    const eps = 0.002;
    const tu0 = tile[0] / ATLAS_COLS + eps;
    const tu1 = (tile[0] + 1) / ATLAS_COLS - eps;
    const tvTop = 1 - tile[1] / ATLAS_ROWS - eps;
    const tvBot = 1 - (tile[1] + 1) / ATLAS_ROWS + eps;
    uvArr.push(tu0, tvBot, tu1, tvBot, tu1, tvTop, tu0, tvTop);
    idx.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
  };

  // +v top
  emitFace(xPt(u0, v1, w1), xPt(u1, v1, w1), xPt(u1, v1, w0), xPt(u0, v1, w0), xNorm(0, 1, 0), 1.0);
  // -v bottom
  emitFace(xPt(u0, v0, w0), xPt(u1, v0, w0), xPt(u1, v0, w1), xPt(u0, v0, w1), xNorm(0, -1, 0), 0.72);
  // +u right
  emitFace(xPt(u1, v0, w1), xPt(u1, v0, w0), xPt(u1, v1, w0), xPt(u1, v1, w1), xNorm(1, 0, 0), 0.88);
  // -u left
  emitFace(xPt(u0, v0, w0), xPt(u0, v0, w1), xPt(u0, v1, w1), xPt(u0, v1, w0), xNorm(-1, 0, 0), 0.88);
  // +w front
  emitFace(xPt(u0, v0, w1), xPt(u1, v0, w1), xPt(u1, v1, w1), xPt(u0, v1, w1), xNorm(0, 0, 1), 0.96);
  // -w back
  emitFace(xPt(u1, v0, w0), xPt(u0, v0, w0), xPt(u0, v1, w0), xPt(u1, v1, w0), xNorm(0, 0, -1), 0.96);
}

function emitBlockDoorBoxes(
  buf: DoorMeshBuffers,
  info: DoorPlacementInfo,
  doorId: VoxelId,
  originX: number,
  originY: number,
  originZ: number,
  pivotU: number,
  rotY: number,
): void {
  const h = info.height;
  const { topTile, botTile, tint, isWood } = getDoorTilesAndTint(doorId);
  const hingeEdge0 = info.hingePositive ? 0.42 : -0.5;
  const hingeEdge1 = info.hingePositive ? 0.5 : -0.42;
  const latchU = info.hingePositive ? -0.34 : 0.34;
  const knobTile = isWood ? TILE.LAMP_FACE : TILE.FRIDGE_TOP;

  // Solid 0.16-thick Minecraft-style wooden/colored block door slab (bottom half + top half)
  if (h >= 2) {
    pushDoorBox(buf, -0.5, 0.5, 0, 1, -0.075, 0.075, botTile, info.alongX, pivotU, originX, originY, originZ, rotY, tint);
    pushDoorBox(buf, -0.5, 0.5, 1, 2, -0.075, 0.075, topTile, info.alongX, pivotU, originX, originY, originZ, rotY, tint);
    // Iron hinge plates & 3D door handle lever protruding on both sides
    pushDoorBox(buf, hingeEdge0, hingeEdge1, 0.28, 0.44, -0.088, 0.088, TILE.CHARCOAL_TRIM, info.alongX, pivotU, originX, originY, originZ, rotY);
    pushDoorBox(buf, hingeEdge0, hingeEdge1, 1.48, 1.64, -0.088, 0.088, TILE.CHARCOAL_TRIM, info.alongX, pivotU, originX, originY, originZ, rotY);
    pushDoorBox(buf, latchU - 0.05, latchU + 0.05, 0.88, 1.0, -0.105, 0.105, knobTile, info.alongX, pivotU, originX, originY, originZ, rotY);
  } else {
    pushDoorBox(buf, -0.5, 0.5, 0, 1, -0.075, 0.075, topTile, info.alongX, pivotU, originX, originY, originZ, rotY, tint);
    pushDoorBox(buf, hingeEdge0, hingeEdge1, 0.35, 0.55, -0.088, 0.088, TILE.CHARCOAL_TRIM, info.alongX, pivotU, originX, originY, originZ, rotY);
    pushDoorBox(buf, latchU - 0.05, latchU + 0.05, 0.42, 0.54, -0.105, 0.105, knobTile, info.alongX, pivotU, originX, originY, originZ, rotY);
  }
}

interface ChunkBuildOutput {
  opaqueGeo: THREE.BufferGeometry | null;
  glassGeo: THREE.BufferGeometry | null;
}

/**
 * Builds face-culled opaque BufferGeometry + separate transparent glass pane BufferGeometry
 * for one 16x16 chunk (cx, cz).
 */
function buildChunkGeometry(
  cx: number,
  cz: number,
  animatingDoorKeys?: ReadonlySet<string>,
): ChunkBuildOutput {
  const minX = cx * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const minZ = cz * CHUNK_SIZE;
  const maxZ = minZ + CHUNK_SIZE - 1;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const gPos: number[] = [];
  const gNorm: number[] = [];
  const gUv: number[] = [];
  const gCol: number[] = [];
  const gIdx: number[] = [];

  const doorBuf: DoorMeshBuffers = {
    positions,
    normals,
    uvs,
    colors,
    indices,
  };

  const emitDoorGeometry = (gx: number, by: number, gz: number, id: VoxelId) => {
    // Render the full 2-block-tall solid door seamlessly from its bottom voxel
    if (isDoorVoxel(getVoxel(gx, by - 1, gz))) return;
    if (animatingDoorKeys?.has(doorAnimKey(gx, by, gz))) return;

    const info = resolveDoorPlacement(gx, by, gz);
    const open = isDoorOpen(id);
    const hingeWorldX = info.alongX ? gx + info.hingeU : gx;
    const hingeWorldZ = info.alongX ? gz : gz + info.hingeU;
    const targetAngle = info.alongX
      ? (info.hingePositive ? -1 : 1) * (Math.PI / 2)
      : (info.hingePositive ? 1 : -1) * (Math.PI / 2);
    const rotY = open ? targetAngle : 0;
    emitBlockDoorBoxes(doorBuf, info, id, hingeWorldX, by, hingeWorldZ, info.hingeU, rotY);
  };

  const emitGlassPaneGeometry = (gx: number, by: number, gz: number) => {
    const nW = getVoxel(gx - 1, by, gz);
    const nE = getVoxel(gx + 1, by, gz);
    const nN = getVoxel(gx, by, gz - 1);
    const nS = getVoxel(gx, by, gz + 1);
    const nUp = getVoxel(gx, by + 1, gz);
    const nDn = getVoxel(gx, by - 1, gz);

    const connW = nW !== VOXEL_ID.AIR;
    const connE = nE !== VOXEL_ID.AIR;
    const connN = nN !== VOXEL_ID.AIR;
    const connS = nS !== VOXEL_ID.AIR;

    const isSkylight = nUp === VOXEL_ID.AIR && nDn === VOXEL_ID.AIR && (connW || connE) && (connN || connS);
    const xSpan = (connW ? 1 : 0) + (connE ? 1 : 0);
    const zSpan = (connN ? 1 : 0) + (connS ? 1 : 0);
    const halfT = 0.08;

    let gx0 = gx - 0.5;
    let gx1 = gx + 0.5;
    let gy0 = by;
    let gy1 = by + 1;
    let gz0 = gz - 0.5;
    let gz1 = gz + 0.5;

    if (isSkylight) {
      gy0 = by + 0.42;
      gy1 = by + 0.58;
    } else if (xSpan >= zSpan && xSpan > 0) {
      gz0 = gz - halfT;
      gz1 = gz + halfT;
    } else if (zSpan > xSpan) {
      gx0 = gx - halfT;
      gx1 = gx + halfT;
    }

    // Top +Y (skip seam between vertically stacked window panes unless skylight)
    if (isSkylight || nUp !== VOXEL_ID.GLASS) {
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx0, gy1, gz1], [gx1, gy1, gz1], [gx1, gy1, gz0], [gx0, gy1, gz0],
        [0, 1, 0], isSkylight ? TILE.GLASS : TILE.CHARCOAL_TRIM, 1.0);
    }
    // Bottom -Y
    if (isSkylight || nDn !== VOXEL_ID.GLASS) {
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx0, gy0, gz0], [gx1, gy0, gz0], [gx1, gy0, gz1], [gx0, gy0, gz1],
        [0, -1, 0], isSkylight ? TILE.GLASS : TILE.CHARCOAL_TRIM, 0.85);
    }
    // +X
    if (nE !== VOXEL_ID.GLASS) {
      const sideTile = !isSkylight && zSpan > xSpan ? TILE.GLASS : TILE.CHARCOAL_TRIM;
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx1, gy0, gz1], [gx1, gy0, gz0], [gx1, gy1, gz0], [gx1, gy1, gz1],
        [1, 0, 0], sideTile, 0.94);
    }
    // -X
    if (nW !== VOXEL_ID.GLASS) {
      const sideTile = !isSkylight && zSpan > xSpan ? TILE.GLASS : TILE.CHARCOAL_TRIM;
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx0, gy0, gz0], [gx0, gy0, gz1], [gx0, gy1, gz1], [gx0, gy1, gz0],
        [-1, 0, 0], sideTile, 0.94);
    }
    // +Z
    if (nS !== VOXEL_ID.GLASS) {
      const frontTile = !isSkylight && (xSpan >= zSpan || xSpan === 0) ? TILE.GLASS : TILE.CHARCOAL_TRIM;
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx0, gy0, gz1], [gx1, gy0, gz1], [gx1, gy1, gz1], [gx0, gy1, gz1],
        [0, 0, 1], frontTile, 0.96);
    }
    // -Z
    if (nN !== VOXEL_ID.GLASS) {
      const backTile = !isSkylight && (xSpan >= zSpan || xSpan === 0) ? TILE.GLASS : TILE.CHARCOAL_TRIM;
      pushVoxelQuad(gPos, gNorm, gUv, gCol, gIdx,
        [gx1, gy0, gz0], [gx0, gy0, gz0], [gx0, gy1, gz0], [gx1, gy1, gz0],
        [0, 0, -1], backTile, 0.96);
    }
  };

  const emitPartBox = (
    buf: DoorMeshBuffers,
    gx: number,
    by: number,
    gz: number,
    lx0: number,
    ly0: number,
    lz0: number,
    lx1: number,
    ly1: number,
    lz1: number,
    tile: TileCoord,
    tint: readonly [number, number, number] = [1, 1, 1],
  ) => {
    const x0 = gx + lx0;
    const x1 = gx + lx1;
    const y0 = by + ly0;
    const y1 = by + ly1;
    const z0 = gz + lz0;
    const z1 = gz + lz1;
    const { positions: pos, normals: norm, uvs: uvArr, colors: col, indices: idx } = buf;

    const emitQuad = (
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      shade: number,
    ) => {
      const baseIndex = pos.length / 3;
      pos.push(...p0, ...p1, ...p2, ...p3);
      const cr = shade * tint[0];
      const cg = shade * tint[1];
      const cb = shade * tint[2];
      for (let i = 0; i < 4; i++) {
        norm.push(...n);
        col.push(cr, cg, cb);
      }
      const eps = 0.002;
      const tu0 = tile[0] / ATLAS_COLS + eps;
      const tu1 = (tile[0] + 1) / ATLAS_COLS - eps;
      const tvTop = 1 - tile[1] / ATLAS_ROWS - eps;
      const tvBot = 1 - (tile[1] + 1) / ATLAS_ROWS + eps;
      uvArr.push(tu0, tvBot, tu1, tvBot, tu1, tvTop, tu0, tvTop);
      idx.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
    };

    emitQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1.0);
    emitQuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], 0.72);
    emitQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], 0.86);
    emitQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], 0.86);
    emitQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], 0.94);
    emitQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], 0.94);
  };

  const glassBuf: DoorMeshBuffers = {
    positions: gPos,
    normals: gNorm,
    uvs: gUv,
    colors: gCol,
    indices: gIdx,
  };

  const emitFurnitureGeometry = (gx: number, by: number, gz: number, id: VoxelId) => {
    const legTint: readonly [number, number, number] = [0.68, 0.48, 0.3];
    const whiteTint: readonly [number, number, number] = [0.98, 0.99, 1.0];
    const oakTint: readonly [number, number, number] = [0.82, 0.6, 0.36];

    switch (id) {
      case VOXEL_ID.CHAIR_OAK:
      case VOXEL_ID.CHAIR_PINK:
      case VOXEL_ID.CHAIR_SKY:
      case VOXEL_ID.CHAIR_MINT: {
        const seatTint: readonly [number, number, number] =
          id === VOXEL_ID.CHAIR_PINK
            ? [0.97, 0.58, 0.74]
            : id === VOXEL_ID.CHAIR_SKY
              ? [0.46, 0.76, 0.98]
              : id === VOXEL_ID.CHAIR_MINT
                ? [0.42, 0.86, 0.75]
                : oakTint;
        const chairLegTint = id === VOXEL_ID.CHAIR_OAK ? legTint : whiteTint;
        // 4 legs
        emitPartBox(doorBuf, gx, by, gz, -0.26, 0, -0.26, -0.17, 0.42, -0.17, TILE.WHITE_WALL, chairLegTint);
        emitPartBox(doorBuf, gx, by, gz, 0.17, 0, -0.26, 0.26, 0.42, -0.17, TILE.WHITE_WALL, chairLegTint);
        emitPartBox(doorBuf, gx, by, gz, -0.26, 0, 0.17, -0.17, 0.42, 0.26, TILE.WHITE_WALL, chairLegTint);
        emitPartBox(doorBuf, gx, by, gz, 0.17, 0, 0.17, 0.26, 0.42, 0.26, TILE.WHITE_WALL, chairLegTint);
        // Cushioned seat
        emitPartBox(doorBuf, gx, by, gz, -0.28, 0.42, -0.28, 0.28, 0.54, 0.28, TILE.WHITE_WALL, seatTint);
        // Backrest posts + panel
        emitPartBox(doorBuf, gx, by, gz, -0.27, 0.54, -0.27, 0.27, 0.98, -0.17, TILE.WHITE_WALL, seatTint);
        break;
      }

      case VOXEL_ID.TABLE:
      case VOXEL_ID.TABLE_WHITE:
      case VOXEL_ID.TABLE_GLASS: {
        const topTint: readonly [number, number, number] =
          id === VOXEL_ID.TABLE_WHITE ? whiteTint : oakTint;
        const tLegTint: readonly [number, number, number] =
          id === VOXEL_ID.TABLE_GLASS ? [0.28, 0.34, 0.42] : id === VOXEL_ID.TABLE_WHITE ? [0.85, 0.88, 0.92] : legTint;
        // 4 sturdy legs
        emitPartBox(doorBuf, gx, by, gz, -0.42, 0, -0.42, -0.31, 0.78, -0.31, TILE.WHITE_WALL, tLegTint);
        emitPartBox(doorBuf, gx, by, gz, 0.31, 0, -0.42, 0.42, 0.78, -0.31, TILE.WHITE_WALL, tLegTint);
        emitPartBox(doorBuf, gx, by, gz, -0.42, 0, 0.31, -0.31, 0.78, 0.42, TILE.WHITE_WALL, tLegTint);
        emitPartBox(doorBuf, gx, by, gz, 0.31, 0, 0.31, 0.42, 0.78, 0.42, TILE.WHITE_WALL, tLegTint);
        // Tabletop
        if (id === VOXEL_ID.TABLE_GLASS) {
          emitPartBox(glassBuf, gx, by, gz, -0.48, 0.78, -0.48, 0.48, 0.9, 0.48, TILE.GLASS, [1, 1, 1]);
        } else {
          emitPartBox(doorBuf, gx, by, gz, -0.48, 0.78, -0.48, 0.48, 0.92, 0.48, id === VOXEL_ID.TABLE ? TILE.TABLE_TOP : TILE.WHITE_WALL, topTint);
        }
        break;
      }

      case VOXEL_ID.SOFA:
      case VOXEL_ID.SOFA_CORAL:
      case VOXEL_ID.SOFA_MINT:
      case VOXEL_ID.SOFA_CREAM: {
        const fabricTint: readonly [number, number, number] =
          id === VOXEL_ID.SOFA_CORAL
            ? [0.95, 0.48, 0.56]
            : id === VOXEL_ID.SOFA_MINT
              ? [0.44, 0.85, 0.76]
              : id === VOXEL_ID.SOFA_CREAM
                ? [0.96, 0.9, 0.78]
                : [0.38, 0.54, 0.76];
        // Wooden base plinth
        emitPartBox(doorBuf, gx, by, gz, -0.48, 0, -0.46, 0.48, 0.14, 0.44, TILE.OAK_FLOOR, [1, 1, 1]);
        // Plush seat cushions
        emitPartBox(doorBuf, gx, by, gz, -0.48, 0.14, -0.46, 0.48, 0.46, 0.44, TILE.WHITE_WALL, fabricTint);
        // Padded backrest
        emitPartBox(doorBuf, gx, by, gz, -0.48, 0.46, -0.46, 0.48, 0.88, -0.2, TILE.WHITE_WALL, fabricTint);
        // Side armrests
        emitPartBox(doorBuf, gx, by, gz, -0.48, 0.46, -0.2, -0.32, 0.68, 0.42, TILE.WHITE_WALL, fabricTint);
        emitPartBox(doorBuf, gx, by, gz, 0.32, 0.46, -0.2, 0.48, 0.68, 0.42, TILE.WHITE_WALL, fabricTint);
        break;
      }

      case VOXEL_ID.BED_CORAL:
      case VOXEL_ID.BED_MINT: {
        const duvetTint: readonly [number, number, number] =
          id === VOXEL_ID.BED_CORAL ? [0.96, 0.46, 0.58] : [0.38, 0.86, 0.76];
        // Legs + oak frame
        emitPartBox(doorBuf, gx, by, gz, -0.46, 0, -0.46, 0.46, 0.24, 0.46, TILE.OAK_FLOOR, [1, 1, 1]);
        // White mattress
        emitPartBox(doorBuf, gx, by, gz, -0.44, 0.24, -0.42, 0.44, 0.48, 0.44, TILE.WHITE_WALL, whiteTint);
        // Colored quilted duvet covering lower 60%
        emitPartBox(doorBuf, gx, by, gz, -0.45, 0.26, -0.05, 0.45, 0.52, 0.46, TILE.WHITE_WALL, duvetTint);
        // Crisp white pillow
        emitPartBox(doorBuf, gx, by, gz, -0.32, 0.48, -0.38, 0.32, 0.6, -0.14, TILE.WHITE_WALL, whiteTint);
        // Tall headboard
        emitPartBox(doorBuf, gx, by, gz, -0.46, 0.24, -0.48, 0.46, 0.92, -0.38, TILE.OAK_FLOOR, [1, 1, 1]);
        break;
      }

      case VOXEL_ID.CUPBOARD_OAK:
      case VOXEL_ID.CUPBOARD_WHITE:
      case VOXEL_ID.CUPBOARD_SKY: {
        const bodyTint: readonly [number, number, number] =
          id === VOXEL_ID.CUPBOARD_SKY
            ? [0.46, 0.74, 0.96]
            : id === VOXEL_ID.CUPBOARD_WHITE
              ? [0.95, 0.97, 0.99]
              : [0.78, 0.56, 0.34];
        const doorTint: readonly [number, number, number] = [
          bodyTint[0] * 0.9,
          bodyTint[1] * 0.9,
          bodyTint[2] * 0.9,
        ];
        // Main cupboard cabinet body
        emitPartBox(doorBuf, gx, by, gz, -0.44, 0, -0.38, 0.44, 0.98, 0.36, TILE.WHITE_WALL, bodyTint);
        // Twin paneled doors on front face
        emitPartBox(doorBuf, gx, by, gz, -0.4, 0.08, 0.36, -0.03, 0.92, 0.41, TILE.WHITE_WALL, doorTint);
        emitPartBox(doorBuf, gx, by, gz, 0.03, 0.08, 0.36, 0.4, 0.92, 0.41, TILE.WHITE_WALL, doorTint);
        // Silver handles
        emitPartBox(doorBuf, gx, by, gz, -0.11, 0.42, 0.41, -0.06, 0.58, 0.44, TILE.CHARCOAL_TRIM, [1, 1, 1]);
        emitPartBox(doorBuf, gx, by, gz, 0.06, 0.42, 0.41, 0.11, 0.58, 0.44, TILE.CHARCOAL_TRIM, [1, 1, 1]);
        break;
      }

      case VOXEL_ID.PLANT_POT: {
        // Terracotta pot + soil
        emitPartBox(doorBuf, gx, by, gz, -0.22, 0, -0.22, 0.22, 0.34, 0.22, TILE.WHITE_WALL, [0.82, 0.44, 0.3]);
        emitPartBox(doorBuf, gx, by, gz, -0.25, 0.32, -0.25, 0.25, 0.4, 0.25, TILE.WHITE_WALL, [0.88, 0.48, 0.34]);
        // Woody stem + lush leafy canopy
        emitPartBox(doorBuf, gx, by, gz, -0.05, 0.4, -0.05, 0.05, 0.58, 0.05, TILE.LOG_SIDE, [1, 1, 1]);
        emitPartBox(doorBuf, gx, by, gz, -0.26, 0.54, -0.26, 0.26, 0.84, 0.26, TILE.LEAVES, [1, 1, 1]);
        emitPartBox(doorBuf, gx, by, gz, -0.16, 0.84, -0.16, 0.16, 0.96, 0.16, TILE.LEAVES, [1.05, 1.05, 1.05]);
        break;
      }

      case VOXEL_ID.FLOWER_VASE: {
        // Sky ceramic vase
        emitPartBox(doorBuf, gx, by, gz, -0.16, 0, -0.16, 0.16, 0.36, 0.16, TILE.WHITE_WALL, [0.55, 0.82, 0.98]);
        emitPartBox(doorBuf, gx, by, gz, -0.11, 0.36, -0.11, 0.11, 0.44, 0.11, TILE.WHITE_WALL, [0.68, 0.88, 1.0]);
        // Green stem & leaves
        emitPartBox(doorBuf, gx, by, gz, -0.03, 0.44, -0.03, 0.03, 0.68, 0.03, TILE.LEAVES, [1, 1, 1]);
        // Pink & yellow blooms
        emitPartBox(doorBuf, gx, by, gz, -0.16, 0.64, -0.1, 0.02, 0.82, 0.08, TILE.WHITE_WALL, [0.98, 0.46, 0.66]);
        emitPartBox(doorBuf, gx, by, gz, 0.0, 0.68, -0.06, 0.17, 0.85, 0.12, TILE.WHITE_WALL, [0.99, 0.84, 0.3]);
        break;
      }

      case VOXEL_ID.DESK_LAMP: {
        // Weighted base + sleek stem
        emitPartBox(doorBuf, gx, by, gz, -0.18, 0, -0.18, 0.18, 0.08, 0.18, TILE.CHARCOAL_TRIM, [1, 1, 1]);
        emitPartBox(doorBuf, gx, by, gz, -0.04, 0.08, -0.04, 0.04, 0.44, 0.04, TILE.WHITE_WALL, [0.85, 0.88, 0.92]);
        // Warm glowing lampshade
        emitPartBox(doorBuf, gx, by, gz, -0.22, 0.44, -0.22, 0.22, 0.78, 0.22, TILE.LAMP_FACE, [1.05, 0.98, 0.78]);
        break;
      }

      case VOXEL_ID.PLUSH_DECOR: {
        // Pedestal + shiny golden star trophy
        emitPartBox(doorBuf, gx, by, gz, -0.18, 0, -0.18, 0.18, 0.14, 0.18, TILE.CHARCOAL_TRIM, [1, 1, 1]);
        emitPartBox(doorBuf, gx, by, gz, -0.06, 0.14, -0.06, 0.06, 0.3, 0.06, TILE.WHITE_WALL, [0.98, 0.78, 0.22]);
        emitPartBox(doorBuf, gx, by, gz, -0.2, 0.3, -0.14, 0.2, 0.68, 0.14, TILE.WHITE_WALL, [1.0, 0.84, 0.26]);
        emitPartBox(doorBuf, gx, by, gz, -0.12, 0.68, -0.1, 0.12, 0.8, 0.1, TILE.WHITE_WALL, [1.0, 0.9, 0.45]);
        break;
      }

      case VOXEL_ID.GIFT_BOX: {
        // Coral-pink gift box + gold ribbon cross + bow
        emitPartBox(doorBuf, gx, by, gz, -0.28, 0, -0.28, 0.28, 0.48, 0.28, TILE.WHITE_WALL, [0.96, 0.42, 0.58]);
        emitPartBox(doorBuf, gx, by, gz, -0.3, 0.42, -0.3, 0.3, 0.54, 0.3, TILE.WHITE_WALL, [0.98, 0.52, 0.66]);
        emitPartBox(doorBuf, gx, by, gz, -0.06, 0, -0.31, 0.06, 0.56, 0.31, TILE.WHITE_WALL, [0.99, 0.82, 0.25]);
        emitPartBox(doorBuf, gx, by, gz, -0.31, 0, -0.06, 0.31, 0.56, 0.06, TILE.WHITE_WALL, [0.99, 0.82, 0.25]);
        emitPartBox(doorBuf, gx, by, gz, -0.12, 0.56, -0.08, 0.12, 0.64, 0.08, TILE.WHITE_WALL, [0.99, 0.86, 0.3]);
        break;
      }
    }
  };

  const emitCrossPlantGeometry = (gx: number, by: number, gz: number, id: VoxelId) => {
    const tile =
      id === VOXEL_ID.FLOWER_RED
        ? TILE.FLOWER_RED
        : id === VOXEL_ID.FLOWER_YELLOW
          ? TILE.FLOWER_YELLOW
          : id === VOXEL_ID.FERN_BUSH
            ? TILE.FERN_BUSH
            : TILE.TALL_GRASS;

    // Slight deterministic micro-offset so dense woodland flora looks organic rather than grid-stiff
    const hash = (((gx * 73856093) ^ (gz * 19349663)) >>> 0);
    const ox = ((hash & 7) - 3.5) * 0.025;
    const oz = (((hash >> 3) & 7) - 3.5) * 0.025;
    const h = id === VOXEL_ID.TALL_GRASS ? 0.86 : id === VOXEL_ID.FERN_BUSH ? 0.78 : 0.72;
    const r = id === VOXEL_ID.FLOWER_RED || id === VOXEL_ID.FLOWER_YELLOW ? 0.34 : 0.42;

    const cx0 = gx - r + ox;
    const cx1 = gx + r + ox;
    const cz0 = gz - r + oz;
    const cz1 = gz + r + oz;
    const y0 = by;
    const y1 = by + h;
    const invSqrt2 = 0.7071;

    // Diagonal 1 (both sides)
    pushVoxelQuadUV(
      positions, normals, uvs, colors, indices,
      [cx0, y0, cz0], [cx1, y0, cz1], [cx1, y1, cz1], [cx0, y1, cz0],
      [-invSqrt2, 0.3, invSqrt2], tile, 0.98, false,
    );
    pushVoxelQuadUV(
      positions, normals, uvs, colors, indices,
      [cx1, y0, cz1], [cx0, y0, cz0], [cx0, y1, cz0], [cx1, y1, cz1],
      [invSqrt2, 0.3, -invSqrt2], tile, 0.94, true,
    );
    // Diagonal 2 (both sides)
    pushVoxelQuadUV(
      positions, normals, uvs, colors, indices,
      [cx0, y0, cz1], [cx1, y0, cz0], [cx1, y1, cz0], [cx0, y1, cz1],
      [invSqrt2, 0.3, invSqrt2], tile, 0.96, false,
    );
    pushVoxelQuadUV(
      positions, normals, uvs, colors, indices,
      [cx1, y0, cz0], [cx0, y0, cz1], [cx0, y1, cz1], [cx1, y1, cz0],
      [-invSqrt2, 0.3, -invSqrt2], tile, 0.92, true,
    );
  };

  const topY = chunkMaxY[chunkGridIndex(cx, cz)];
  for (let by = 0; by <= topY; by++) {
    const y0 = by;
    const y1 = by + 1;
    for (let gz = minZ; gz <= maxZ; gz++) {
      const z0 = gz - 0.5;
      const z1 = gz + 0.5;
      for (let gx = minX; gx <= maxX; gx++) {
        const id = voxelGrid[voxelIndex(gx, by, gz)] as VoxelId;
        if (id === VOXEL_ID.AIR) continue;

        if (id === VOXEL_ID.GLASS) {
          emitGlassPaneGeometry(gx, by, gz);
          continue;
        }
        if (isDoorVoxel(id)) {
          emitDoorGeometry(gx, by, gz, id);
          continue;
        }
        if (isFoliagePlantVoxel(id)) {
          emitCrossPlantGeometry(gx, by, gz, id);
          continue;
        }
        if (isShapedFurnitureVoxel(id)) {
          emitFurnitureGeometry(gx, by, gz, id);
          continue;
        }

        const x0 = gx - 0.5;
        const x1 = gx + 0.5;

        if (id >= EXTENDED_VOXEL_START) {
          const ext = getExtendedBlockByVoxelId(id);
          if (!ext) continue;
          if (ext.isGlass) {
            if (getVoxel(gx, by + 1, gz) !== id && !isOpaqueBlock(getVoxel(gx, by + 1, gz))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
                [0, 1, 0], ext.tile, 1.0, 0, ext.tint,
              );
            }
            if (by > 0 && getVoxel(gx, by - 1, gz) !== id && !isOpaqueBlock(getVoxel(gx, by - 1, gz))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
                [0, -1, 0], ext.tile, 0.85, 0, ext.tint,
              );
            }
            if (getVoxel(gx + 1, by, gz) !== id && !isOpaqueBlock(getVoxel(gx + 1, by, gz))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
                [1, 0, 0], ext.tile, 0.92, 0, ext.tint,
              );
            }
            if (getVoxel(gx - 1, by, gz) !== id && !isOpaqueBlock(getVoxel(gx - 1, by, gz))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
                [-1, 0, 0], ext.tile, 0.92, 0, ext.tint,
              );
            }
            if (getVoxel(gx, by, gz + 1) !== id && !isOpaqueBlock(getVoxel(gx, by, gz + 1))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
                [0, 0, 1], ext.tile, 0.96, 0, ext.tint,
              );
            }
            if (getVoxel(gx, by, gz - 1) !== id && !isOpaqueBlock(getVoxel(gx, by, gz - 1))) {
              pushVoxelQuad(
                gPos, gNorm, gUv, gCol, gIdx,
                [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
                [0, 0, -1], ext.tile, 0.96, 0, ext.tint,
              );
            }
            continue;
          }

          if (!isOpaqueBlock(getVoxel(gx, by + 1, gz))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
              [0, 1, 0], ext.tile, 1.0, 0, ext.tint,
            );
          }
          if (by > 0 && !isOpaqueBlock(getVoxel(gx, by - 1, gz))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
              [0, -1, 0], ext.tile, 0.72, 0, ext.tint,
            );
          }
          if (!isOpaqueBlock(getVoxel(gx + 1, by, gz))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
              [1, 0, 0], ext.tile, 0.86, 0, ext.tint,
            );
          }
          if (!isOpaqueBlock(getVoxel(gx - 1, by, gz))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
              [-1, 0, 0], ext.tile, 0.86, 0, ext.tint,
            );
          }
          if (!isOpaqueBlock(getVoxel(gx, by, gz + 1))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
              [0, 0, 1], ext.tile, 0.93, 0, ext.tint,
            );
          }
          if (!isOpaqueBlock(getVoxel(gx, by, gz - 1))) {
            pushVoxelQuad(
              positions, normals, uvs, colors, indices,
              [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
              [0, 0, -1], ext.tile, 0.93, 0, ext.tint,
            );
          }
          continue;
        }

        // Cull only against full opaque blocks so rooms remain visible through glass & open doors
        // +Y Top
        if (!isOpaqueBlock(getVoxel(gx, by + 1, gz))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
            [0, 1, 0], getTileForFace(id, 'top'), 1.0, getTopUvRotation(id),
          );
        }
        // -Y Bottom (skip y=0 underside)
        if (by > 0 && !isOpaqueBlock(getVoxel(gx, by - 1, gz))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
            [0, -1, 0], getTileForFace(id, 'bottom'), 0.72,
          );
        }
        // +X
        if (!isOpaqueBlock(getVoxel(gx + 1, by, gz))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
            [1, 0, 0], getTileForFace(id, 'side'), 0.86,
          );
        }
        // -X
        if (!isOpaqueBlock(getVoxel(gx - 1, by, gz))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
            [-1, 0, 0], getTileForFace(id, 'side'), 0.86,
          );
        }
        // +Z
        if (!isOpaqueBlock(getVoxel(gx, by, gz + 1))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
            [0, 0, 1], getTileForFace(id, 'side'), 0.93,
          );
        }
        // -Z
        if (!isOpaqueBlock(getVoxel(gx, by, gz - 1))) {
          pushVoxelQuad(
            positions, normals, uvs, colors, indices,
            [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
            [0, 0, -1], getTileForFace(id, 'side'), 0.93,
          );
        }
      }
    }
  }

  let opaqueGeo: THREE.BufferGeometry | null = null;
  if (positions.length > 0) {
    opaqueGeo = new THREE.BufferGeometry();
    opaqueGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    opaqueGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    opaqueGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    opaqueGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    opaqueGeo.setIndex(indices);
    opaqueGeo.computeBoundingBox();
    opaqueGeo.computeBoundingSphere();
  }

  let glassGeo: THREE.BufferGeometry | null = null;
  if (gPos.length > 0) {
    glassGeo = new THREE.BufferGeometry();
    glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
    glassGeo.setAttribute('normal', new THREE.Float32BufferAttribute(gNorm, 3));
    glassGeo.setAttribute('uv', new THREE.Float32BufferAttribute(gUv, 2));
    glassGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCol, 3));
    glassGeo.setIndex(gIdx);
    glassGeo.computeBoundingBox();
    glassGeo.computeBoundingSphere();
  }

  return { opaqueGeo, glassGeo };
}

interface ChunkEntry {
  cx: number;
  cz: number;
  mesh: THREE.Mesh | null;
  glassMesh: THREE.Mesh | null;
}

export interface AnimatedDoorRig {
  group: THREE.Group;
  alongX: boolean;
  baseX: number;
  baseY: number;
  baseZ: number;
  startVal: number;
  targetVal: number;
  dispose: () => void;
}

export interface IslandEnvironmentResult {
  group: THREE.Group;
  terrainGroup: THREE.Group;
  waterMesh: THREE.Mesh;
  cloudGroup: THREE.Group;
  atlasTex: THREE.CanvasTexture;
  rebuildTerrainAt: (gx: number, gz: number) => void;
  setDoorAnimating: (gx: number, yBot: number, gz: number, active: boolean) => void;
  createAnimatedDoorRig: (gx: number, yBot: number, gz: number, nextId: VoxelId) => AnimatedDoorRig;
  preloadChunksAround: (playerX: number, playerZ: number) => void;
  rebuildLoadedChunksAround: (playerX: number, playerZ: number) => void;
  update: (
    elapsed: number,
    playerX: number,
    playerZ: number,
    dayNight?: DayNightState,
  ) => void;
  dispose: () => void;
}

export function buildIslandEnvironment(_maxAnisotropy: number): IslandEnvironmentResult {
  const group = new THREE.Group();
  const terrainGroup = new THREE.Group();
  group.add(terrainGroup);

  const disposables: Array<{ dispose: () => void }> = [];
  const animatingDoorKeys = new Set<string>();

  const atlasTex = createVoxelAtlasTexture();
  const emissiveAtlasTex = createVoxelEmissiveAtlasTexture();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    emissive: '#ffffff',
    emissiveMap: emissiveAtlasTex,
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    alphaTest: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    emissive: '#ffd275',
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 0.16,
    metalness: 0.08,
    transparent: true,
    depthWrite: false,
  });
  disposables.push(atlasTex, emissiveAtlasTex, terrainMat, glassMat);

  // Chunk registry for dynamic chunk-based loading & frustum-culled rendering
  const loadedChunks = new Map<string, ChunkEntry>();
  const chunkKey = (cx: number, cz: number) => `${cx},${cz}`;

  const loadOrRebuildChunk = (cx: number, cz: number) => {
    if (cx < CHUNK_MIN || cx > CHUNK_MAX || cz < CHUNK_MIN || cz > CHUNK_MAX) return;
    const key = chunkKey(cx, cz);
    const existing = loadedChunks.get(key);
    const { opaqueGeo, glassGeo } = buildChunkGeometry(cx, cz, animatingDoorKeys);

    if (existing) {
      if (existing.mesh) {
        existing.mesh.geometry.dispose();
        if (opaqueGeo) {
          existing.mesh.geometry = opaqueGeo;
        } else {
          terrainGroup.remove(existing.mesh);
          existing.mesh = null;
        }
      } else if (opaqueGeo) {
        const mesh = new THREE.Mesh(opaqueGeo, terrainMat);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        terrainGroup.add(mesh);
        existing.mesh = mesh;
      }

      if (existing.glassMesh) {
        existing.glassMesh.geometry.dispose();
        if (glassGeo) {
          existing.glassMesh.geometry = glassGeo;
        } else {
          terrainGroup.remove(existing.glassMesh);
          existing.glassMesh = null;
        }
      } else if (glassGeo) {
        const gMesh = new THREE.Mesh(glassGeo, glassMat);
        gMesh.renderOrder = 1;
        gMesh.castShadow = false;
        gMesh.receiveShadow = true;
        terrainGroup.add(gMesh);
        existing.glassMesh = gMesh;
      }
      return;
    }

    let mesh: THREE.Mesh | null = null;
    if (opaqueGeo) {
      mesh = new THREE.Mesh(opaqueGeo, terrainMat);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      terrainGroup.add(mesh);
    }

    let glassMesh: THREE.Mesh | null = null;
    if (glassGeo) {
      glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.renderOrder = 1;
      glassMesh.castShadow = false;
      glassMesh.receiveShadow = true;
      terrainGroup.add(glassMesh);
    }

    loadedChunks.set(key, { cx, cz, mesh, glassMesh });
  };

  const unloadChunk = (key: string, entry: ChunkEntry) => {
    if (entry.mesh) {
      terrainGroup.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      entry.mesh = null;
    }
    if (entry.glassMesh) {
      terrainGroup.remove(entry.glassMesh);
      entry.glassMesh.geometry.dispose();
      entry.glassMesh = null;
    }
    loadedChunks.delete(key);
  };

  // Pre-build initial 5x5 chunk window around spawn (0, 4)
  for (let cz = -CHUNK_LOAD_RADIUS; cz <= CHUNK_LOAD_RADIUS; cz++) {
    for (let cx = -CHUNK_LOAD_RADIUS; cx <= CHUNK_LOAD_RADIUS; cx++) {
      loadOrRebuildChunk(cx, cz);
    }
  }

  const rebuildTerrainAt = (gx: number, gz: number) => {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cz = Math.floor(gz / CHUNK_SIZE);
    loadOrRebuildChunk(cx, cz);

    const lx = gx - cx * CHUNK_SIZE;
    const lz = gz - cz * CHUNK_SIZE;
    if (lx === 0 && loadedChunks.has(chunkKey(cx - 1, cz))) {
      loadOrRebuildChunk(cx - 1, cz);
    } else if (lx === CHUNK_SIZE - 1 && loadedChunks.has(chunkKey(cx + 1, cz))) {
      loadOrRebuildChunk(cx + 1, cz);
    }
    if (lz === 0 && loadedChunks.has(chunkKey(cx, cz - 1))) {
      loadOrRebuildChunk(cx, cz - 1);
    } else if (lz === CHUNK_SIZE - 1 && loadedChunks.has(chunkKey(cx, cz + 1))) {
      loadOrRebuildChunk(cx, cz + 1);
    }
  };

  const pendingCoords: Array<{ cx: number; cz: number; distSq: number }> = [];

  const updateChunkStreaming = (playerX: number, playerZ: number) => {
    const pcx = Math.floor(Math.round(playerX) / CHUNK_SIZE);
    const pcz = Math.floor(Math.round(playerZ) / CHUNK_SIZE);

    for (const [key, entry] of loadedChunks.entries()) {
      if (
        Math.abs(entry.cx - pcx) > CHUNK_LOAD_RADIUS ||
        Math.abs(entry.cz - pcz) > CHUNK_LOAD_RADIUS
      ) {
        unloadChunk(key, entry);
      }
    }

    pendingCoords.length = 0;
    const minCx = Math.max(CHUNK_MIN, pcx - CHUNK_LOAD_RADIUS);
    const maxCx = Math.min(CHUNK_MAX, pcx + CHUNK_LOAD_RADIUS);
    const minCz = Math.max(CHUNK_MIN, pcz - CHUNK_LOAD_RADIUS);
    const maxCz = Math.min(CHUNK_MAX, pcz + CHUNK_LOAD_RADIUS);

    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        if (!loadedChunks.has(chunkKey(cx, cz))) {
          const dx = cx - pcx;
          const dz = cz - pcz;
          pendingCoords.push({ cx, cz, distSq: dx * dx + dz * dz });
        }
      }
    }

    if (pendingCoords.length > 0) {
      pendingCoords.sort((a, b) => a.distSq - b.distSq);
      const count = Math.min(3, pendingCoords.length);
      for (let i = 0; i < count; i++) {
        loadOrRebuildChunk(pendingCoords[i].cx, pendingCoords[i].cz);
      }
    }
  };

  const preloadChunksAround = (playerX: number, playerZ: number) => {
    const pcx = Math.floor(Math.round(playerX) / CHUNK_SIZE);
    const pcz = Math.floor(Math.round(playerZ) / CHUNK_SIZE);

    for (const [key, entry] of loadedChunks.entries()) {
      if (
        Math.abs(entry.cx - pcx) > CHUNK_LOAD_RADIUS ||
        Math.abs(entry.cz - pcz) > CHUNK_LOAD_RADIUS
      ) {
        unloadChunk(key, entry);
      }
    }

    const minCx = Math.max(CHUNK_MIN, pcx - CHUNK_LOAD_RADIUS);
    const maxCx = Math.min(CHUNK_MAX, pcx + CHUNK_LOAD_RADIUS);
    const minCz = Math.max(CHUNK_MIN, pcz - CHUNK_LOAD_RADIUS);
    const maxCz = Math.min(CHUNK_MAX, pcz + CHUNK_LOAD_RADIUS);

    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        if (!loadedChunks.has(chunkKey(cx, cz))) {
          loadOrRebuildChunk(cx, cz);
        }
      }
    }
  };

  const rebuildLoadedChunksAround = (playerX: number, playerZ: number) => {
    const pcx = Math.floor(Math.round(playerX) / CHUNK_SIZE);
    const pcz = Math.floor(Math.round(playerZ) / CHUNK_SIZE);

    for (const [key, entry] of loadedChunks.entries()) {
      if (
        Math.abs(entry.cx - pcx) > CHUNK_LOAD_RADIUS ||
        Math.abs(entry.cz - pcz) > CHUNK_LOAD_RADIUS
      ) {
        unloadChunk(key, entry);
      }
    }

    const minCx = Math.max(CHUNK_MIN, pcx - CHUNK_LOAD_RADIUS);
    const maxCx = Math.min(CHUNK_MAX, pcx + CHUNK_LOAD_RADIUS);
    const minCz = Math.max(CHUNK_MIN, pcz - CHUNK_LOAD_RADIUS);
    const maxCz = Math.min(CHUNK_MAX, pcz + CHUNK_LOAD_RADIUS);

    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        loadOrRebuildChunk(cx, cz);
      }
    }
  };

  // Clear Turquoise Animated Ocean Water Plane covering expanded coastline
  const waterGeo = new THREE.PlaneGeometry(1120, 1120, 56, 56);
  waterGeo.rotateX(-Math.PI / 2);
  const waterCanvas = document.createElement('canvas');
  waterCanvas.width = 16;
  waterCanvas.height = 16;
  const wCtx = waterCanvas.getContext('2d')!;
  const waterColors = ['#22b8cf', '#28c4dc', '#18a3bf', '#3bd0e8'];
  let ws = 808;
  for (let wy = 0; wy < 16; wy++) {
    for (let wx = 0; wx < 16; wx++) {
      ws = (ws * 16807) % 2147483647;
      wCtx.fillStyle = waterColors[ws % waterColors.length];
      wCtx.fillRect(wx, wy, 1, 1);
    }
  }
  const tiledWaterTex = new THREE.CanvasTexture(waterCanvas);
  tiledWaterTex.colorSpace = THREE.SRGBColorSpace;
  tiledWaterTex.wrapS = THREE.RepeatWrapping;
  tiledWaterTex.wrapT = THREE.RepeatWrapping;
  tiledWaterTex.repeat.set(560, 560);
  tiledWaterTex.magFilter = THREE.NearestFilter;
  tiledWaterTex.minFilter = THREE.NearestFilter;
  tiledWaterTex.generateMipmaps = false;

  const waterWaveUniforms = { uTime: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({
    map: tiledWaterTex,
    roughness: 0.22,
    metalness: 0.08,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterWaveUniforms.uTime;
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w1 = sin(position.x * 0.14 + uTime * 1.65) * 0.048;
        float w2 = cos(position.z * 0.18 + uTime * 1.35) * 0.042;
        transformed.y += w1 + w2;`,
      );
  };
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = SEA_LEVEL;
  waterMesh.receiveShadow = true;
  waterMesh.renderOrder = 2;
  group.add(waterMesh);
  disposables.push(waterGeo, waterMat, tiledWaterTex);

  // Dynamic Day-Night Sky Dome with Sunrise/Sunset Horizon Glow
  const skyGeo = new THREE.SphereGeometry(480, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color('#1a66d8') },
      midColor: { value: new THREE.Color('#5caef6') },
      horizonColor: { value: new THREE.Color('#c2e4ff') },
      uSunDir: { value: new THREE.Vector3(0.7, 0.7, 0.2) },
      uSunGlowColor: { value: new THREE.Color('#ff9b4e') },
      uTwilightFactor: { value: 0 },
    },
    vertexShader: `
      varying vec3 vLocalDir;
      void main() {
        vLocalDir = normalize(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunGlowColor;
      uniform float uTwilightFactor;
      varying vec3 vLocalDir;
      void main() {
        vec3 dir = normalize(vLocalDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.22, 0.82, h));

        float sunAlign = max(dot(dir, normalize(uSunDir)), 0.0);
        float horizonBand = 1.0 - smoothstep(0.0, 0.42, abs(dir.y));
        float glow = pow(sunAlign, 4.0) * horizonBand * (0.28 + uTwilightFactor * 0.78);
        col = mix(col, uSunGlowColor, clamp(glow, 0.0, 0.85));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // Soft Radial Celestial Halo Texture (reused for Sun & Moon glow)
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 64;
  haloCanvas.height = 64;
  const hCtx = haloCanvas.getContext('2d')!;
  const haloGrad = hCtx.createRadialGradient(32, 32, 3, 32, 32, 32);
  haloGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  haloGrad.addColorStop(0.28, 'rgba(255, 250, 225, 0.48)');
  haloGrad.addColorStop(0.68, 'rgba(255, 240, 200, 0.12)');
  haloGrad.addColorStop(1.0, 'rgba(255, 240, 200, 0.0)');
  hCtx.fillStyle = haloGrad;
  hCtx.fillRect(0, 0, 64, 64);
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  haloTex.needsUpdate = true;

  // Pixel-crisp Moon Texture with Subtle Lunar Craters (32x32)
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 32;
  moonCanvas.height = 32;
  const mCtx = moonCanvas.getContext('2d')!;
  mCtx.fillStyle = '#eef4ff';
  mCtx.fillRect(0, 0, 32, 32);
  mCtx.fillStyle = '#dbe7fb';
  mCtx.fillRect(2, 2, 28, 28);
  mCtx.fillStyle = '#f8fbff';
  mCtx.fillRect(5, 4, 14, 10);
  // Subtle lunar craters
  mCtx.fillStyle = '#bccce8';
  mCtx.fillRect(6, 7, 5, 4);
  mCtx.fillRect(19, 10, 6, 5);
  mCtx.fillRect(10, 19, 7, 5);
  mCtx.fillRect(21, 21, 4, 4);
  mCtx.fillStyle = '#a4b7d9';
  mCtx.fillRect(7, 8, 3, 2);
  mCtx.fillRect(20, 11, 4, 3);
  mCtx.fillRect(12, 20, 4, 3);
  const moonTex = new THREE.CanvasTexture(moonCanvas);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  moonTex.magFilter = THREE.NearestFilter;
  moonTex.minFilter = THREE.NearestFilter;
  moonTex.generateMipmaps = false;
  moonTex.needsUpdate = true;

  // Sun Group (crisp solar disc + soft glowing corona)
  const sunGroup = new THREE.Group();
  const sunGeo = new THREE.PlaneGeometry(18, 18);
  const sunMat = new THREE.MeshBasicMaterial({
    color: '#fff9d6',
    transparent: true,
    opacity: 1,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sunQuad = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunQuad);

  const sunHaloGeo = new THREE.PlaneGeometry(54, 54);
  const sunHaloMat = new THREE.MeshBasicMaterial({
    map: haloTex,
    color: '#ffe89e',
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
  sunHalo.position.z = -0.2;
  sunGroup.add(sunHalo);
  group.add(sunGroup);

  // Moon Group (crisp lunar surface + cool silvery glow)
  const moonGroup = new THREE.Group();
  const moonGeo = new THREE.PlaneGeometry(15, 15);
  const moonMat = new THREE.MeshBasicMaterial({
    map: moonTex,
    color: '#ffffff',
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const moonQuad = new THREE.Mesh(moonGeo, moonMat);
  moonGroup.add(moonQuad);

  const moonHaloGeo = new THREE.PlaneGeometry(42, 42);
  const moonHaloMat = new THREE.MeshBasicMaterial({
    map: haloTex,
    color: '#93c5fd',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const moonHalo = new THREE.Mesh(moonHaloGeo, moonHaloMat);
  moonHalo.position.z = -0.2;
  moonGroup.add(moonHalo);
  moonGroup.visible = false;
  group.add(moonGroup);

  // Glowing Night Starfield (1 single Points draw call, ~360 stars)
  const STAR_COUNT = 360;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  let starSeed = 918273;
  const nextStarRand = () => {
    starSeed = (starSeed * 1664525 + 1013904223) >>> 0;
    return starSeed / 4294967296;
  };
  const sColor = new THREE.Color();
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = nextStarRand() * Math.PI * 2;
    const elev = 0.12 + nextStarRand() * 0.88; // Upper hemisphere above horizon
    const phi = Math.acos(elev);
    const r = 370;
    starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPositions[i * 3 + 1] = Math.cos(phi) * r;
    starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

    const tintPick = nextStarRand();
    if (tintPick < 0.25) {
      sColor.set('#bae6fd');
    } else if (tintPick < 0.45) {
      sColor.set('#fef08a');
    } else {
      sColor.set('#ffffff');
    }
    const brightness = 0.65 + nextStarRand() * 0.35;
    starColors[i * 3] = sColor.r * brightness;
    starColors[i * 3 + 1] = sColor.g * brightness;
    starColors[i * 3 + 2] = sColor.b * brightness;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.3,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.visible = false;
  group.add(starPoints);

  disposables.push(
    skyGeo,
    skyMat,
    haloTex,
    moonTex,
    sunGeo,
    sunMat,
    sunHaloGeo,
    sunHaloMat,
    moonGeo,
    moonMat,
    moonHaloGeo,
    moonHaloMat,
    starGeo,
    starMat,
  );

  // Realistic Multi-Layered Moving Blocky Clouds (1 single InstancedMesh draw call)
  const cloudGroup = new THREE.Group();
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.9,
    fog: true,
  });
  disposables.push(cloudGeo, cloudMat);

  interface CloudCluster {
    baseX: number;
    z: number;
    y: number;
    speed: number;
    puffs: Array<{ dx: number; dy: number; dz: number; sx: number; sy: number; sz: number }>;
  }
  const cloudClusters: CloudCluster[] = [];
  let totalCloudPuffs = 0;

  for (let i = 0; i < 16; i++) {
    const mainW = 14 + (i % 4) * 5;
    const mainD = 8 + ((i + 1) % 3) * 4;
    const bx = -150 + i * 22;
    const bz = -135 + ((i * 61) % 270);
    const by = 46 + (i % 4) * 5;
    const speed = 0.65 + (i % 3) * 0.25;
    const puffs: CloudCluster['puffs'] = [
      // Broad flat base layer
      { dx: 0, dy: 0, dz: 0, sx: mainW, sy: 1.5, sz: mainD },
      // Soft stepped upper cumulus puff
      { dx: -mainW * 0.14, dy: 1.35, dz: 0.4, sx: mainW * 0.66, sy: 1.45, sz: mainD * 0.72 },
      // Secondary trailing puff
      { dx: mainW * 0.28, dy: 0.65, dz: -0.6, sx: mainW * 0.46, sy: 1.2, sz: mainD * 0.62 },
    ];
    if (i % 2 === 0) {
      puffs.push({
        dx: -mainW * 0.22,
        dy: 2.35,
        dz: 0.2,
        sx: mainW * 0.36,
        sy: 1.0,
        sz: mainD * 0.45,
      });
    }
    totalCloudPuffs += puffs.length;
    cloudClusters.push({ baseX: bx, z: bz, y: by, speed, puffs });
  }

  const cloudInstancedMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, totalCloudPuffs);
  cloudInstancedMesh.frustumCulled = false;
  cloudGroup.add(cloudInstancedMesh);
  group.add(cloudGroup);

  const cloudDummy = new THREE.Object3D();

  const update = (
    elapsed: number,
    playerX: number,
    playerZ: number,
    dayNight?: DayNightState,
  ) => {
    updateChunkStreaming(playerX, playerZ);
    waterWaveUniforms.uTime.value = elapsed;
    waterMesh.position.y = SEA_LEVEL + Math.sin(elapsed * 1.1) * 0.025;
    skyDome.position.set(playerX, 0, playerZ);

    if (dayNight) {
      skyMat.uniforms.topColor.value.copy(dayNight.skyTopColor);
      skyMat.uniforms.midColor.value.copy(dayNight.skyMidColor);
      skyMat.uniforms.horizonColor.value.copy(dayNight.skyHorizonColor);
      skyMat.uniforms.uSunDir.value.copy(dayNight.sunDir);
      skyMat.uniforms.uSunGlowColor.value.copy(dayNight.sunGlowColor);
      skyMat.uniforms.uTwilightFactor.value = dayNight.twilightFactor;

      // Sun arc positioning & visibility
      sunGroup.visible = dayNight.sunDiskOpacity > 0.01;
      if (sunGroup.visible) {
        sunGroup.position.set(
          playerX + dayNight.sunDir.x * 290,
          dayNight.sunDir.y * 290,
          playerZ + dayNight.sunDir.z * 290,
        );
        sunGroup.lookAt(playerX, 0, playerZ);
        sunMat.color.copy(dayNight.sunDiskColor);
        sunMat.opacity = dayNight.sunDiskOpacity;
        sunHaloMat.color.copy(dayNight.sunGlowColor);
        sunHaloMat.opacity = dayNight.sunDiskOpacity * 0.78;
      }

      // Moon arc positioning & visibility
      moonGroup.visible = dayNight.moonDiskOpacity > 0.01;
      if (moonGroup.visible) {
        moonGroup.position.set(
          playerX + dayNight.moonDir.x * 290,
          dayNight.moonDir.y * 290,
          playerZ + dayNight.moonDir.z * 290,
        );
        moonGroup.lookAt(playerX, 0, playerZ);
        moonMat.opacity = dayNight.moonDiskOpacity;
        moonHaloMat.opacity = dayNight.moonDiskOpacity * 0.55;
      }

      // Glowing stars during dusk -> night -> pre-dawn
      starPoints.visible = dayNight.starOpacity > 0.01;
      if (starPoints.visible) {
        starPoints.position.set(playerX, 0, playerZ);
        starPoints.rotation.y = elapsed * 0.0022;
        const twinkle = 0.92 + Math.sin(elapsed * 2.1) * 0.08;
        starMat.opacity = dayNight.starOpacity * twinkle;
      }

      // Clouds tint smoothly across sunrise / day / sunset / night
      cloudMat.color.copy(dayNight.cloudColor);
      cloudMat.opacity = dayNight.cloudOpacity;

      // Coastal water tint
      waterMat.color.copy(dayNight.waterTintColor);

      // Automatic interior/city building lamps + glowing glass windows at night
      terrainMat.emissiveIntensity = dayNight.cityLightsLevel * 1.45;
      glassMat.emissiveIntensity = dayNight.cityLightsLevel * 0.62;
    } else {
      sunGroup.position.set(playerX + 125, 165, playerZ + 105);
      sunGroup.lookAt(playerX, 0, playerZ);
    }

    // Update all volumetric cloud puffs smoothly around the player
    let puffIdx = 0;
    for (let i = 0; i < cloudClusters.length; i++) {
      const c = cloudClusters[i];
      const wrappedX =
        ((((c.baseX + elapsed * c.speed - playerX + 190) % 380) + 380) % 380) -
        190 +
        playerX;
      const wrappedZ =
        ((((c.z - playerZ + 190) % 380) + 380) % 380) - 190 + playerZ;
      for (let p = 0; p < c.puffs.length; p++) {
        const pf = c.puffs[p];
        cloudDummy.position.set(wrappedX + pf.dx, c.y + pf.dy, wrappedZ + pf.dz);
        cloudDummy.scale.set(pf.sx, pf.sy, pf.sz);
        cloudDummy.updateMatrix();
        cloudInstancedMesh.setMatrixAt(puffIdx++, cloudDummy.matrix);
      }
    }
    cloudInstancedMesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    for (const [key, entry] of loadedChunks.entries()) {
      unloadChunk(key, entry);
    }
    for (const d of disposables) {
      d.dispose();
    }
  };

  const setDoorAnimating = (gx: number, yBot: number, gz: number, active: boolean) => {
    const key = doorAnimKey(gx, yBot, gz);
    if (active) {
      animatingDoorKeys.add(key);
    } else {
      animatingDoorKeys.delete(key);
    }
  };

  const createAnimatedDoorRig = (
    gx: number,
    yBot: number,
    gz: number,
    nextId: VoxelId,
  ): AnimatedDoorRig => {
    const info = resolveDoorPlacement(gx, yBot, gz);
    const opening = isDoorOpen(nextId);

    const buf: DoorMeshBuffers = {
      positions: [],
      normals: [],
      uvs: [],
      colors: [],
      indices: [],
    };

    emitBlockDoorBoxes(buf, info, nextId, 0, 0, 0, info.hingeU, 0);

    const leafGroup = new THREE.Group();
    const baseX = info.alongX ? gx + info.hingeU : gx;
    const baseY = yBot;
    const baseZ = info.alongX ? gz : gz + info.hingeU;
    leafGroup.position.set(baseX, baseY, baseZ);

    const opaqueGeo = new THREE.BufferGeometry();
    opaqueGeo.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
    opaqueGeo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.normals, 3));
    opaqueGeo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uvs, 2));
    opaqueGeo.setAttribute('color', new THREE.Float32BufferAttribute(buf.colors, 3));
    opaqueGeo.setIndex(buf.indices);
    const opaqueMesh = new THREE.Mesh(opaqueGeo, terrainMat);
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    leafGroup.add(opaqueMesh);

    const openAngle = info.alongX
      ? (info.hingePositive ? -1 : 1) * (Math.PI / 2)
      : (info.hingePositive ? 1 : -1) * (Math.PI / 2);
    const startVal = opening ? 0 : openAngle;
    const targetVal = opening ? openAngle : 0;
    leafGroup.rotation.y = startVal;

    group.add(leafGroup);

    return {
      group: leafGroup,
      alongX: info.alongX,
      baseX,
      baseY,
      baseZ,
      startVal,
      targetVal,
      dispose: () => {
        group.remove(leafGroup);
        opaqueGeo.dispose();
      },
    };
  };

  return {
    group,
    terrainGroup,
    waterMesh,
    cloudGroup,
    atlasTex,
    rebuildTerrainAt,
    setDoorAnimating,
    createAnimatedDoorRig,
    preloadChunksAround,
    rebuildLoadedChunksAround,
    update,
    dispose,
  };
}
