import { VOXEL_ID, VoxelId } from './types';
import { buildModernNeighborhood } from './modernHouses';
import { buildCityLocationsDistrict } from './cityLocationsBuilder';
import { buildExpandedDistrictAndForests } from './expandedDistrictBuilder';
import { buildPlayerDreamVilla } from './starterHome';

export type CityVoxelSetter = (gx: number, by: number, gz: number, id: VoxelId) => void;
export type CityVoxelGetter = (gx: number, by: number, gz: number) => VoxelId;

export const CITY_MIN = -44;
export const CITY_MAX = 44;
export const EXPANSION_MIN = -196;
export const EXPANSION_MAX = 196;

function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * Constructs the modern Minecraft-style blocky city into the 3D voxel grid:
 * - Preserves the smooth asphalt road & sidewalk network with lane markings and crosswalks
 * - Builds finished, modern School Party Craft-inspired 1-story, 2-story, and 3-story houses
 *   with enclosed rooms, walkable staircases, doors, windows, and modern furniture
 * - Builds expanded N/W/E streets, additional houses & city buildings, and surrounding forests
 *   while preserving the South Beach unchanged.
 */
export function buildAbandonedCity(
  setVoxelRaw: (gx: number, by: number, gz: number, id: VoxelId) => void,
  _getVoxelRaw: CityVoxelGetter,
  markFixedRaw?: (gx: number, by: number, gz: number) => void,
  unmarkFixedRaw?: (gx: number, by: number, gz: number) => void,
): void {
  const rand = createRng(48271);

  const set = (gx: number, by: number, gz: number, id: VoxelId) => {
    if (gx < CITY_MIN || gx > CITY_MAX || gz < CITY_MIN || gz > CITY_MAX) return;
    if (by < 0 || by > 23) return;
    setVoxelRaw(gx, by, gz, id);
  };

  const markFixed = (gx: number, by: number, gz: number) => {
    if (gx < CITY_MIN || gx > CITY_MAX || gz < CITY_MIN || gz > CITY_MAX) return;
    if (by < 1 || by > 23) return;
    markFixedRaw?.(gx, by, gz);
  };

  const unmarkFixed = (gx: number, by: number, gz: number) => {
    if (gx < CITY_MIN || gx > CITY_MAX || gz < CITY_MIN || gz > CITY_MAX) return;
    if (by < 1 || by > 23) return;
    unmarkFixedRaw?.(gx, by, gz);
  };

  const fillBox = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: VoxelId,
  ) => {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const minZ = Math.min(z0, z1);
    const maxZ = Math.max(z0, z1);
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          set(x, y, z, id);
        }
      }
    }
  };

  // =========================================================================
  // 1. CITY BASE, ASPHALT ROADS, MARKINGS, CURBS & SIDEWALKS (y = 0..1)
  // =========================================================================
  for (let gz = CITY_MIN; gz <= CITY_MAX; gz++) {
    for (let gx = CITY_MIN; gx <= CITY_MAX; gx++) {
      // Solid bedrock & coastal stone rim
      set(gx, 0, gz, VOXEL_ID.STONE);

      const absX = Math.abs(gx);
      const absZ = Math.abs(gz);

      // Outer perimeter waterfront seawall edge
      if (absX >= 42 || absZ >= 42) {
        set(gx, 1, gz, rand() < 0.45 ? VOXEL_ID.MOSS_STONE : VOXEL_ID.STONE);
        continue;
      }

      // Perimeter waterfront concrete promenade connecting all road ends
      if (absX === 41 || absZ === 41) {
        set(gx, 1, gz, VOXEL_ID.SIDEWALK);
        continue;
      }

      // Main Central Avenues: 5-wide carriageway [-2..2] + sidewalks at ±3
      const onMainRoadNS = absX <= 2;
      const onMainRoadEW = absZ <= 2;
      const onMainSidewalkNS = absX === 3;
      const onMainSidewalkEW = absZ === 3;

      // Secondary Ring Streets: 3-wide carriageway [±21..±23] + sidewalks at ±20, ±24
      const onRingRoadNS = absX >= 21 && absX <= 23;
      const onRingRoadEW = absZ >= 21 && absZ <= 23;
      const onRingSidewalkNS = absX === 20 || absX === 24;
      const onRingSidewalkEW = absZ === 20 || absZ === 24;

      const onRoadNS = onMainRoadNS || onRingRoadNS;
      const onRoadEW = onMainRoadEW || onRingRoadEW;
      const onSidewalkNS = onMainSidewalkNS || onRingSidewalkNS;
      const onSidewalkEW = onMainSidewalkEW || onRingSidewalkEW;

      if (onRoadNS && onRoadEW) {
        // Open smooth intersection box
        set(gx, 1, gz, VOXEL_ID.ASPHALT);
      } else if (onRoadNS && onSidewalkEW) {
        // Zebra crosswalk across N-S roads
        set(gx, 1, gz, VOXEL_ID.ROAD_CROSSWALK_NS);
      } else if (onRoadEW && onSidewalkNS) {
        // Zebra crosswalk across E-W roads
        set(gx, 1, gz, VOXEL_ID.ROAD_CROSSWALK_EW);
      } else if (onMainRoadNS) {
        if (gx === 0) {
          set(gx, 1, gz, VOXEL_ID.ROAD_LINE);
        } else if (gx === -2) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_W);
        } else if (gx === 2) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_E);
        } else if (absX === 1 && (absZ === 6 || absZ === 17 || absZ === 27 || absZ === 37)) {
          set(gx, 1, gz, VOXEL_ID.ROAD_DRAIN);
        } else {
          set(gx, 1, gz, VOXEL_ID.ASPHALT);
        }
      } else if (onMainRoadEW) {
        if (gz === 0) {
          set(gx, 1, gz, VOXEL_ID.ROAD_LINE_EW);
        } else if (gz === -2) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_N);
        } else if (gz === 2) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_S);
        } else if (absZ === 1 && (absX === 6 || absX === 17 || absX === 27 || absX === 37)) {
          set(gx, 1, gz, VOXEL_ID.ROAD_DRAIN);
        } else {
          set(gx, 1, gz, VOXEL_ID.ASPHALT);
        }
      } else if (onRingRoadNS) {
        if (absX === 22) {
          set(gx, 1, gz, VOXEL_ID.ROAD_LINE);
        } else if (gx === -23 || gx === 21) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_W);
        } else {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_E);
        }
      } else if (onRingRoadEW) {
        if (absZ === 22) {
          set(gx, 1, gz, VOXEL_ID.ROAD_LINE_EW);
        } else if (gz === -23 || gz === 21) {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_N);
        } else {
          set(gx, 1, gz, VOXEL_ID.ROAD_EDGE_S);
        }
      } else if (onSidewalkNS || onSidewalkEW) {
        // Continuous concrete sidewalks & corner aprons on both sides of all roads
        set(gx, 1, gz, VOXEL_ID.SIDEWALK);
      } else {
        // Clean manicured neighborhood lawn ground
        set(gx, 1, gz, VOXEL_ID.GRASS);
      }
    }
  }

  // =========================================================================
  // 2-5. MODERN SCHOOL PARTY CRAFT-INSPIRED HOUSES & CLEAN PLAZA PARK
  // =========================================================================
  buildModernNeighborhood({ set, fillBox, markFixed, unmarkFixed });

  // =========================================================================
  // 6. SEAMLESS FLAT EXPANSION IN NORTH, SOUTH, EAST, WEST
  // =========================================================================
  for (let gz = EXPANSION_MIN; gz <= EXPANSION_MAX; gz++) {
    for (let gx = EXPANSION_MIN; gx <= EXPANSION_MAX; gx++) {
      const absX = Math.abs(gx);
      const absZ = Math.abs(gz);
      // Keep the entire existing city core, roads, sidewalks (up to ±41), and structures untouched
      if (absX <= 41 && absZ <= 41) continue;

      setVoxelRaw(gx, 0, gz, VOXEL_ID.STONE);
      if (absX >= 193 || absZ >= 193) {
        // Outer island coastal stone rim
        const hash = ((gx * 73856093) ^ (gz * 19349663)) >>> 0;
        setVoxelRaw(gx, 1, gz, hash % 10 < 4 ? VOXEL_ID.MOSS_STONE : VOXEL_ID.STONE);
      } else {
        // Flat, unobstructed grass terrain flush with city ground (y = 2)
        setVoxelRaw(gx, 1, gz, VOXEL_ID.GRASS);
      }
    }
  }

  // =========================================================================
  // 7. SCHOOL PARTY CRAFT CITY LOCATIONS DISTRICT + STARTING VILLA + FORESTS
  // =========================================================================
  const inExtendedBeachSeabed = (gx: number, gz: number) =>
    Math.abs(gx) <= 84 && gz >= 130 && gz <= 204;

  const setExpansion = (gx: number, by: number, gz: number, id: VoxelId) => {
    if (Math.abs(gx) <= 41 && Math.abs(gz) <= 41) return;
    if (
      !inExtendedBeachSeabed(gx, gz) &&
      (gx < EXPANSION_MIN || gx > EXPANSION_MAX || gz < EXPANSION_MIN || gz > EXPANSION_MAX)
    ) {
      return;
    }
    if (by < 0 || by > 23) return;
    setVoxelRaw(gx, by, gz, id);
  };

  const markExpansionFixed = (gx: number, by: number, gz: number) => {
    if (Math.abs(gx) <= 41 && Math.abs(gz) <= 41) return;
    if (
      !inExtendedBeachSeabed(gx, gz) &&
      (gx < EXPANSION_MIN || gx > EXPANSION_MAX || gz < EXPANSION_MIN || gz > EXPANSION_MAX)
    ) {
      return;
    }
    if (by < 1 || by > 23) return;
    markFixedRaw?.(gx, by, gz);
  };

  const unmarkExpansionFixed = (gx: number, by: number, gz: number) => {
    if (Math.abs(gx) <= 41 && Math.abs(gz) <= 41) return;
    if (
      !inExtendedBeachSeabed(gx, gz) &&
      (gx < EXPANSION_MIN || gx > EXPANSION_MAX || gz < EXPANSION_MIN || gz > EXPANSION_MAX)
    ) {
      return;
    }
    if (by < 1 || by > 23) return;
    unmarkFixedRaw?.(gx, by, gz);
  };

  const fillExpansionBox = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: VoxelId,
  ) => {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const minZ = Math.min(z0, z1);
    const maxZ = Math.max(z0, z1);
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          setExpansion(x, y, z, id);
        }
      }
    }
  };

  const expansionOps = {
    set: setExpansion,
    fillBox: fillExpansionBox,
    markFixed: markExpansionFixed,
    unmarkFixed: unmarkExpansionFixed,
  };

  buildCityLocationsDistrict(expansionOps);

  // Permanent Player's Dream Villa right off South Avenue [x=6..36, z=76..106]
  buildPlayerDreamVilla(expansionOps);

  // Expanded North, West & East streets, new houses & buildings, and surrounding forests
  buildExpandedDistrictAndForests(expansionOps);
}
