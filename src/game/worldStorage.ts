import {
  PlacedFurnitureRecord,
  savePlacedFurniture,
  STARTER_VILLA_ID,
} from './homeFurniture';
import {
  BAG_SIZE,
  createStarterInventory,
  getItemDef,
  HOTBAR_SIZE,
  InventorySlot,
  InventoryState,
  loadInventoryState,
  saveInventoryState,
} from './inventory';
import {
  CITY_LOCATIONS,
  CityLocationId,
  loadDiscoveredLocations,
  saveDiscoveredLocations,
} from './locations';
import {
  loadCoinBalance,
  loadCollectedWorldCoins,
  saveCoinBalance,
  saveCollectedWorldCoins,
} from './shop';
import {
  isStarterFurnitureSeeded,
  loadPlayerState,
  markStarterFurnitureSeeded,
  PlayerSaveState,
  savePlayerState,
  STARTER_HOME_SPAWN,
} from './starterHome';
import {
  DEFAULT_START_CYCLE_SEC,
  loadSavedDayTime,
  saveDayTime,
  wrapCycleTime,
} from './dayNightCycle';
import {
  loadChestCycleState,
  loadOpenedChests,
  PersistentChestCycleState,
  sanitizeChestCycleState,
  saveChestCycleState,
  saveOpenedChests,
} from './treasureChests';
import {
  loadAdProgressMap,
  sanitizeAdProgressMap,
  saveAdProgressMap,
} from './rewardedAds';
import {
  EquippedOutfitLoadout,
  getXSuitItemDef,
  loadXSuitState,
  sanitizeEquippedLoadout,
  saveXSuitState,
} from './xSuits';
import { GameSettings } from './types';

export interface WorldSaveXSuitSnapshot {
  unlockedIds: string[];
  equipped: EquippedOutfitLoadout;
  adProgress: Record<string, number>;
}

export interface WorldSaveSnapshot {
  version: 2;
  savedAt: number;
  dayTimeSec?: number;
  gridMin?: number;
  gridSize?: number;
  player: PlayerSaveState & { isFlying?: boolean };
  coins: number;
  collectedWorldCoins: number[];
  openedChests?: number[];
  chestState?: PersistentChestCycleState;
  inventory: InventoryState;
  placedFurniture: PlacedFurnitureRecord[];
  starterFurnitureSeeded: boolean;
  discoveredLocations: CityLocationId[];
  settings?: GameSettings;
  xSuits?: WorldSaveXSuitSnapshot;
  voxelIndices: Uint32Array;
  voxelIds: Uint16Array;
}

export interface WorldSaveMetadata {
  exists: boolean;
  savedAt: number | null;
  customBlockCount: number;
  furnitureCount: number;
  coins: number;
  hasStartedOnce: boolean;
}

export interface WorldSaveBackend {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: unknown) => Promise<void>;
}

const DB_NAME = 'spc_abandoned_city_world_db';
const DB_VERSION = 1;
const STORE_NAME = 'worlds';
export const MAIN_WORLD_KEY = 'main_world';
const BACKUP_WORLD_KEY = 'backup_world';
const LEGACY_VOXEL_EDITS_KEY = 'spc_city_voxel_edits_v2';
const LEGACY_FURNITURE_KEY = 'spc_city_placed_furniture_v1';

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openWorldDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });

  return cachedDbPromise;
}

const browserIndexedDbBackend: WorldSaveBackend = {
  async get(key: string): Promise<unknown> {
    const db = await openWorldDb();
    if (!db) return null;
    return new Promise<unknown>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async put(key: string, value: unknown): Promise<void> {
    const db = await openWorldDb();
    if (!db) {
      throw new Error('IndexedDB unavailable');
    }
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      } catch (err) {
        reject(err);
      }
    });
  },
};

function sanitizeSlots(raw: unknown, length: number): InventorySlot[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length }, (_, idx) => {
    const entry = arr[idx] as Partial<InventorySlot> | undefined;
    if (!entry || typeof entry.itemId !== 'string') return { itemId: null, qty: 0 };
    const def = getItemDef(entry.itemId);
    if (!def) return { itemId: null, qty: 0 };
    const qty =
      typeof entry.qty === 'number' && Number.isFinite(entry.qty)
        ? Math.min(def.maxStack, Math.max(0, Math.floor(entry.qty)))
        : 0;
    return qty > 0 ? { itemId: def.id, qty } : { itemId: null, qty: 0 };
  });
}

function sanitizeInventory(raw: unknown): InventoryState {
  if (!raw || typeof raw !== 'object') return createStarterInventory();
  const parsed = raw as Partial<InventoryState>;
  const idx =
    typeof parsed.selectedHotbarIndex === 'number' &&
    parsed.selectedHotbarIndex >= 0 &&
    parsed.selectedHotbarIndex < HOTBAR_SIZE
      ? Math.floor(parsed.selectedHotbarIndex)
      : 0;
  return {
    hotbar: sanitizeSlots(parsed.hotbar, HOTBAR_SIZE),
    bag: sanitizeSlots(parsed.bag, BAG_SIZE),
    selectedHotbarIndex: idx,
  };
}

function sanitizePlacedFurniture(raw: unknown): PlacedFurnitureRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: PlacedFurnitureRecord[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i] as Partial<PlacedFurnitureRecord> | null;
    if (!entry || typeof entry !== 'object') continue;
    if (
      typeof entry.id === 'string' &&
      typeof entry.itemId === 'string' &&
      typeof entry.houseId === 'string' &&
      typeof entry.x === 'number' &&
      typeof entry.y === 'number' &&
      typeof entry.z === 'number' &&
      typeof entry.rotY === 'number' &&
      Number.isFinite(entry.x) &&
      Number.isFinite(entry.y) &&
      Number.isFinite(entry.z) &&
      Number.isFinite(entry.rotY)
    ) {
      out.push({
        id: entry.id,
        itemId: entry.itemId,
        houseId: entry.houseId,
        x: entry.x,
        y: entry.y,
        z: entry.z,
        rotY: entry.rotY,
        stateOn: typeof entry.stateOn === 'boolean' ? entry.stateOn : true,
      });
    }
  }
  return out;
}

const VALID_LOCATION_IDS = new Set<CityLocationId>(CITY_LOCATIONS.map((loc) => loc.id));

function sanitizeLocations(raw: unknown): CityLocationId[] {
  if (!Array.isArray(raw)) return ['park'];
  const filtered = raw.filter(
    (item): item is CityLocationId =>
      typeof item === 'string' && VALID_LOCATION_IDS.has(item as CityLocationId),
  );
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ['park'];
}

function normalizeBinaryVoxels(
  rawIndices: unknown,
  rawIds: unknown,
): { voxelIndices: Uint32Array; voxelIds: Uint16Array } {
  if (
    rawIndices instanceof Uint32Array &&
    (rawIds instanceof Uint16Array || rawIds instanceof Uint8Array)
  ) {
    const len = Math.min(rawIndices.length, rawIds.length);
    const voxelIds = new Uint16Array(len);
    for (let i = 0; i < len; i++) {
      voxelIds[i] = rawIds[i];
    }
    return {
      voxelIndices: rawIndices.slice(0, len),
      voxelIds,
    };
  }
  if (Array.isArray(rawIndices) && Array.isArray(rawIds)) {
    const len = Math.min(rawIndices.length, rawIds.length);
    const voxelIndices = new Uint32Array(len);
    const voxelIds = new Uint16Array(len);
    for (let i = 0; i < len; i++) {
      voxelIndices[i] = Number(rawIndices[i]) >>> 0;
      voxelIds[i] = Number(rawIds[i]) & 0xffff;
    }
    return { voxelIndices, voxelIds };
  }
  return { voxelIndices: new Uint32Array(0), voxelIds: new Uint16Array(0) };
}

function sanitizeSnapshot(raw: unknown): WorldSaveSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const p = (obj.player && typeof obj.player === 'object' ? obj.player : null) as Partial<
    PlayerSaveState & { isFlying?: boolean }
  > | null;

  const player: PlayerSaveState & { isFlying?: boolean } =
    p &&
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    typeof p.z === 'number' &&
    typeof p.camYaw === 'number' &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    Number.isFinite(p.z) &&
    Number.isFinite(p.camYaw)
      ? {
          x: p.x,
          y: p.y,
          z: p.z,
          camYaw: p.camYaw,
          homeId: typeof p.homeId === 'string' ? p.homeId : STARTER_VILLA_ID,
          hasStartedOnce: Boolean(p.hasStartedOnce),
          isFlying: Boolean(p.isFlying),
        }
      : {
          x: STARTER_HOME_SPAWN.x,
          y: STARTER_HOME_SPAWN.y,
          z: STARTER_HOME_SPAWN.z,
          camYaw: STARTER_HOME_SPAWN.camYaw,
          homeId: STARTER_VILLA_ID,
          hasStartedOnce: false,
          isFlying: false,
        };

  const { voxelIndices, voxelIds } = normalizeBinaryVoxels(obj.voxelIndices, obj.voxelIds);

  const coins =
    typeof obj.coins === 'number' && Number.isFinite(obj.coins) && obj.coins >= 0
      ? Math.floor(obj.coins)
      : loadCoinBalance();

  const collectedWorldCoins = Array.isArray(obj.collectedWorldCoins)
    ? obj.collectedWorldCoins.filter(
        (id): id is number => typeof id === 'number' && Number.isInteger(id),
      )
    : [];

  const rawOpenedChests = Array.isArray(obj.openedChests)
    ? Array.from(
        new Set(
          obj.openedChests.filter(
            (id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0,
          ),
        ),
      )
    : loadOpenedChests();

  const savedAt =
    typeof obj.savedAt === 'number' && Number.isFinite(obj.savedAt) ? obj.savedAt : Date.now();
  const { state: chestState } = sanitizeChestCycleState(
    obj.chestState,
    rawOpenedChests,
    savedAt,
  );
  const openedChests = chestState.chests.filter((c) => c.opened).map((c) => c.id);

  let settings: GameSettings | undefined;
  if (obj.settings && typeof obj.settings === 'object') {
    const s = obj.settings as Partial<GameSettings>;
    if (
      typeof s.cameraSensitivity === 'number' &&
      Number.isFinite(s.cameraSensitivity) &&
      typeof s.soundEnabled === 'boolean' &&
      typeof s.invertCameraY === 'boolean'
    ) {
      settings = {
        cameraSensitivity: Math.max(0.4, Math.min(2.0, s.cameraSensitivity)),
        soundEnabled: s.soundEnabled,
        invertCameraY: s.invertCameraY,
      };
    }
  }

  const dayTimeSec =
    typeof obj.dayTimeSec === 'number' && Number.isFinite(obj.dayTimeSec)
      ? wrapCycleTime(obj.dayTimeSec)
      : loadSavedDayTime();

  const gridMin =
    typeof obj.gridMin === 'number' && Number.isInteger(obj.gridMin)
      ? obj.gridMin
      : undefined;
  const gridSize =
    typeof obj.gridSize === 'number' && Number.isInteger(obj.gridSize) && obj.gridSize > 0
      ? obj.gridSize
      : undefined;

  let xSuits: WorldSaveXSuitSnapshot;
  if (obj.xSuits && typeof obj.xSuits === 'object') {
    const rawX = obj.xSuits as Partial<WorldSaveXSuitSnapshot>;
    const unlockedIds = Array.isArray(rawX.unlockedIds)
      ? Array.from(
          new Set(
            rawX.unlockedIds.filter(
              (id): id is string => typeof id === 'string' && Boolean(getXSuitItemDef(id)),
            ),
          ),
        )
      : loadXSuitState().unlockedIds;
    const equipped = sanitizeEquippedLoadout(rawX.equipped, unlockedIds);
    const adProgress = rawX.adProgress
      ? sanitizeAdProgressMap(rawX.adProgress)
      : loadAdProgressMap();
    xSuits = { unlockedIds, equipped, adProgress };
  } else {
    const lsX = loadXSuitState();
    xSuits = {
      unlockedIds: lsX.unlockedIds,
      equipped: lsX.equipped,
      adProgress: loadAdProgressMap(),
    };
  }

  return {
    version: 2,
    savedAt,
    dayTimeSec,
    gridMin,
    gridSize,
    player,
    coins,
    collectedWorldCoins,
    openedChests,
    chestState,
    inventory: sanitizeInventory(obj.inventory),
    placedFurniture: sanitizePlacedFurniture(obj.placedFurniture),
    starterFurnitureSeeded: Boolean(obj.starterFurnitureSeeded),
    discoveredLocations: sanitizeLocations(obj.discoveredLocations),
    settings,
    xSuits,
    voxelIndices,
    voxelIds,
  };
}

function readLegacyLocalStorageWorld(): WorldSaveSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawVoxels = window.localStorage.getItem(LEGACY_VOXEL_EDITS_KEY);
    const rawFurniture = window.localStorage.getItem(LEGACY_FURNITURE_KEY);
    const player = loadPlayerState();
    const hasLegacy =
      Boolean(rawVoxels) ||
      Boolean(rawFurniture) ||
      Boolean(player?.hasStartedOnce) ||
      isStarterFurnitureSeeded();
    if (!hasLegacy) return null;

    let voxelIndices = new Uint32Array(0);
    let voxelIds = new Uint16Array(0);
    if (rawVoxels) {
      const parsed = JSON.parse(rawVoxels) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const tmpIdx: number[] = [];
        const tmpId: number[] = [];
        for (const pair of parsed) {
          if (Array.isArray(pair) && pair.length === 2) {
            tmpIdx.push(Number(pair[0]) >>> 0);
            tmpId.push(Number(pair[1]) & 0xffff);
          }
        }
        voxelIndices = new Uint32Array(tmpIdx);
        voxelIds = new Uint16Array(tmpId);
      }
    }

    const placedFurniture = rawFurniture ? sanitizePlacedFurniture(JSON.parse(rawFurniture)) : [];

    const legacyChestState = loadChestCycleState();
    return {
      version: 2,
      savedAt: Date.now(),
      dayTimeSec: loadSavedDayTime() ?? DEFAULT_START_CYCLE_SEC,
      player: player ?? {
        x: STARTER_HOME_SPAWN.x,
        y: STARTER_HOME_SPAWN.y,
        z: STARTER_HOME_SPAWN.z,
        camYaw: STARTER_HOME_SPAWN.camYaw,
        homeId: STARTER_VILLA_ID,
        hasStartedOnce: false,
        isFlying: false,
      },
      coins: loadCoinBalance(),
      collectedWorldCoins: loadCollectedWorldCoins(),
      openedChests: legacyChestState.chests.filter((c) => c.opened).map((c) => c.id),
      chestState: legacyChestState,
      inventory: loadInventoryState(),
      placedFurniture,
      starterFurnitureSeeded: isStarterFurnitureSeeded(),
      discoveredLocations: loadDiscoveredLocations(),
      xSuits: {
        ...loadXSuitState(),
        adProgress: loadAdProgressMap(),
      },
      voxelIndices,
      voxelIds,
    };
  } catch {
    return null;
  }
}

export function syncLocalStorageMirrorsFromSnapshot(snapshot: WorldSaveSnapshot): void {
  savePlayerState(snapshot.player);
  saveCoinBalance(snapshot.coins);
  saveCollectedWorldCoins(snapshot.collectedWorldCoins);
  if (snapshot.chestState) {
    saveChestCycleState(snapshot.chestState);
  } else if (Array.isArray(snapshot.openedChests)) {
    saveOpenedChests(snapshot.openedChests);
  }
  saveInventoryState(snapshot.inventory);
  savePlacedFurniture(snapshot.placedFurniture);
  if (snapshot.starterFurnitureSeeded) {
    markStarterFurnitureSeeded(true);
  }
  saveDiscoveredLocations(snapshot.discoveredLocations);
  if (typeof snapshot.dayTimeSec === 'number') {
    saveDayTime(snapshot.dayTimeSec);
  }
  if (snapshot.xSuits) {
    saveXSuitState({
      unlockedIds: snapshot.xSuits.unlockedIds,
      equipped: snapshot.xSuits.equipped,
    });
    saveAdProgressMap(snapshot.xSuits.adProgress);
  }
}

export function extractWorldMetadata(snapshot: WorldSaveSnapshot | null): WorldSaveMetadata {
  if (!snapshot) {
    return {
      exists: false,
      savedAt: null,
      customBlockCount: 0,
      furnitureCount: 0,
      coins: loadCoinBalance(),
      hasStartedOnce: false,
    };
  }
  return {
    exists: true,
    savedAt: snapshot.savedAt,
    customBlockCount: snapshot.voxelIndices.length,
    furnitureCount: snapshot.placedFurniture.length,
    coins: snapshot.coins,
    hasStartedOnce: snapshot.player.hasStartedOnce,
  };
}

// Coalesced single-writer queue prevents concurrent IndexedDB write bursts on 4GB RAM Android
let saveInFlight = false;
let pendingSaveSnapshot: WorldSaveSnapshot | null = null;
let pendingSaveBackend: WorldSaveBackend = browserIndexedDbBackend;
let pendingResolvers: Array<(ok: boolean) => void> = [];

async function flushQueuedSaves(): Promise<void> {
  if (saveInFlight) return;
  saveInFlight = true;
  try {
    while (pendingSaveSnapshot) {
      const snap = pendingSaveSnapshot;
      const backend = pendingSaveBackend;
      const resolvers = pendingResolvers;
      pendingSaveSnapshot = null;
      pendingResolvers = [];

      syncLocalStorageMirrorsFromSnapshot(snap);
      let ok = false;
      try {
        await backend.put(MAIN_WORLD_KEY, snap);
        // Mirror secondary backup key atomically in case of sudden tab termination
        await backend.put(BACKUP_WORLD_KEY, snap);
        ok = true;
      } catch {
        ok = false;
      }
      for (let i = 0; i < resolvers.length; i++) {
        resolvers[i](ok);
      }
    }
  } finally {
    saveInFlight = false;
  }
}

export function saveWorldSnapshotToDb(
  snapshot: WorldSaveSnapshot,
  backend: WorldSaveBackend = browserIndexedDbBackend,
): Promise<boolean> {
  pendingSaveSnapshot = snapshot;
  pendingSaveBackend = backend;
  return new Promise<boolean>((resolve) => {
    pendingResolvers.push(resolve);
    void flushQueuedSaves();
  });
}

export async function loadWorldSnapshotFromDb(
  backend: WorldSaveBackend = browserIndexedDbBackend,
): Promise<WorldSaveSnapshot | null> {
  try {
    const primaryRaw = await backend.get(MAIN_WORLD_KEY);
    const primary = sanitizeSnapshot(primaryRaw);
    if (primary) {
      syncLocalStorageMirrorsFromSnapshot(primary);
      return primary;
    }

    const backupRaw = await backend.get(BACKUP_WORLD_KEY);
    const backup = sanitizeSnapshot(backupRaw);
    if (backup) {
      syncLocalStorageMirrorsFromSnapshot(backup);
      return backup;
    }
  } catch {
    // Fall back to localStorage migration
  }

  // Seamless one-time migration from earlier localStorage-only saves into IndexedDB
  const legacy = readLegacyLocalStorageWorld();
  if (legacy) {
    try {
      await backend.put(MAIN_WORLD_KEY, legacy);
      await backend.put(BACKUP_WORLD_KEY, legacy);
    } catch {
      // Ignore if DB blocked
    }
    return legacy;
  }

  return null;
}

export function createInMemoryWorldBackend(): WorldSaveBackend {
  const store = new Map<string, unknown>();
  return {
    async get(key: string): Promise<unknown> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: unknown): Promise<void> {
      store.set(key, value);
    },
  };
}
