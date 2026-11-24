import { VOXEL_ID, VoxelId } from './types';

export interface VoxelWriteOps {
  set: (gx: number, by: number, gz: number, id: VoxelId) => void;
  fillBox: (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: VoxelId,
  ) => void;
  markFixed?: (gx: number, by: number, gz: number) => void;
  unmarkFixed?: (gx: number, by: number, gz: number) => void;
}

/**
 * Wraps VoxelWriteOps so every placed non-air block belonging to a pre-built house
 * or ready-made room (walls, floors, ceilings, roofs, windows, doors, chairs, beds, furniture)
 * is marked permanently fixed/indestructible, while carved AIR openings stay clear.
 */
export function createProtectedVoxelOps(ops: VoxelWriteOps): VoxelWriteOps {
  return {
    set: (gx, by, gz, id) => {
      ops.set(gx, by, gz, id);
      if (id === VOXEL_ID.AIR) {
        ops.unmarkFixed?.(gx, by, gz);
      } else {
        ops.markFixed?.(gx, by, gz);
      }
    },
    fillBox: (x0, y0, z0, x1, y1, z1, id) => {
      ops.fillBox(x0, y0, z0, x1, y1, z1, id);
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);
      const minZ = Math.min(z0, z1);
      const maxZ = Math.max(z0, z1);
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let x = minX; x <= maxX; x++) {
            if (id === VOXEL_ID.AIR) {
              ops.unmarkFixed?.(x, y, z);
            } else {
              ops.markFixed?.(x, y, z);
            }
          }
        }
      }
    },
    markFixed: ops.markFixed,
    unmarkFixed: ops.unmarkFixed,
  };
}

/**
 * Builds a single enclosed story with floor slab, 4-block-high perimeter walls,
 * dark architectural corner pillars, solid ceiling slab, and recessed ceiling lamps.
 * - Floor slab is at `baseY - 1` (so walking surface is `baseY`)
 * - Interior space is `baseY .. baseY + 3`
 * - Ceiling slab is at `baseY + 4`
 */
function buildStoryShell(
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
  addLamps = true,
): void {
  const { set, fillBox } = ops;
  // Floor slab
  fillBox(x0, baseY - 1, z0, x1, baseY - 1, z1, floorId);
  // Clear interior air
  if (x1 - x0 >= 2 && z1 - z0 >= 2) {
    fillBox(x0 + 1, baseY, z0 + 1, x1 - 1, baseY + 3, z1 - 1, VOXEL_ID.AIR);
  }
  // Walls & corner trim pillars
  for (let y = baseY; y <= baseY + 3; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const onX = x === x0 || x === x1;
        const onZ = z === z0 || z === z1;
        if (!onX && !onZ) continue;
        if (onX && onZ) {
          set(x, y, z, trimId);
        } else {
          set(x, y, z, wallId);
        }
      }
    }
  }
  // Solid ceiling slab + outer cornice trim
  fillBox(x0, baseY + 4, z0, x1, baseY + 4, z1, ceilingId);
  for (let x = x0; x <= x1; x++) {
    set(x, baseY + 4, z0, trimId);
    set(x, baseY + 4, z1, trimId);
  }
  for (let z = z0; z <= z1; z++) {
    set(x0, baseY + 4, z, trimId);
    set(x1, baseY + 4, z, trimId);
  }

  // Bright modern recessed ceiling lamps
  if (addLamps && x1 - x0 >= 4 && z1 - z0 >= 4) {
    const midX = Math.floor((x0 + x1) / 2);
    const midZ = Math.floor((z0 + z1) / 2);
    set(midX, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
    if (x1 - x0 >= 9) {
      set(x0 + 3, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
      set(x1 - 3, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
    }
    if (z1 - z0 >= 9) {
      set(midX, baseY + 4, z0 + 3, VOXEL_ID.LAMP_BLOCK);
      set(midX, baseY + 4, z1 - 3, VOXEL_ID.LAMP_BLOCK);
    }
  }
}

/**
 * Builds a complete 2-block-tall framed exterior door (wooden or modern, single or double)
 * with architectural jamb pillars, header lintel, and (on double entrances) a glass transom.
 */
function addExteriorDoor(
  ops: VoxelWriteOps,
  x: number,
  baseY: number,
  z: number,
  wallAlongX: boolean,
  width: 1 | 2,
  trimId: VoxelId,
  doorId: VoxelId = VOXEL_ID.DOOR_WOOD_CLOSED,
): void {
  const { set } = ops;
  if (wallAlongX) {
    // Wall runs along X (fixed z)
    set(x - 1, baseY, z, trimId);
    set(x - 1, baseY + 1, z, trimId);
    set(x - 1, baseY + 2, z, trimId);
    set(x - 1, baseY + 3, z, trimId);
    if (width === 2) {
      set(x, baseY, z, doorId);
      set(x, baseY + 1, z, doorId);
      set(x, baseY + 2, z, trimId);
      set(x, baseY + 3, z, trimId);
      set(x + 1, baseY, z, doorId);
      set(x + 1, baseY + 1, z, doorId);
      set(x + 1, baseY + 2, z, trimId);
      set(x + 1, baseY + 3, z, trimId);
      set(x + 2, baseY, z, trimId);
      set(x + 2, baseY + 1, z, trimId);
      set(x + 2, baseY + 2, z, trimId);
      set(x + 2, baseY + 3, z, trimId);
    } else {
      set(x, baseY, z, doorId);
      set(x, baseY + 1, z, doorId);
      set(x, baseY + 2, z, trimId);
      set(x, baseY + 3, z, trimId);
      set(x + 1, baseY, z, trimId);
      set(x + 1, baseY + 1, z, trimId);
      set(x + 1, baseY + 2, z, trimId);
      set(x + 1, baseY + 3, z, trimId);
    }
  } else {
    // Wall runs along Z (fixed x)
    set(x, baseY, z - 1, trimId);
    set(x, baseY + 1, z - 1, trimId);
    set(x, baseY + 2, z - 1, trimId);
    set(x, baseY + 3, z - 1, trimId);
    if (width === 2) {
      set(x, baseY, z, doorId);
      set(x, baseY + 1, z, doorId);
      set(x, baseY + 2, z, trimId);
      set(x, baseY + 3, z, trimId);
      set(x, baseY, z + 1, doorId);
      set(x, baseY + 1, z + 1, doorId);
      set(x, baseY + 2, z + 1, trimId);
      set(x, baseY + 3, z + 1, trimId);
      set(x, baseY, z + 2, trimId);
      set(x, baseY + 1, z + 2, trimId);
      set(x, baseY + 2, z + 2, trimId);
      set(x, baseY + 3, z + 2, trimId);
    } else {
      set(x, baseY, z, doorId);
      set(x, baseY + 1, z, doorId);
      set(x, baseY + 2, z, trimId);
      set(x, baseY + 3, z, trimId);
      set(x, baseY, z + 1, trimId);
      set(x, baseY + 1, z + 1, trimId);
      set(x, baseY + 2, z + 1, trimId);
      set(x, baseY + 3, z + 1, trimId);
    }
  }
}

/**
 * Adds clean intact modern architectural glass windows (2 blocks tall at baseY+1..baseY+2).
 */
function addWindowSpan(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  ops.fillBox(x0, baseY + 1, z0, x1, baseY + 2, z1, VOXEL_ID.GLASS);
}

/**
 * Builds a 4-step walkable interior staircase from `baseY` up to `baseY + 5` landing
 * (`nextFloorSlab = baseY + 4`), with solid steps, 4+ blocks of headroom carved through
 * the upper floor slab, and optional sleek safety guardrail around the upper opening.
 */
function buildStaircase(
  ops: VoxelWriteOps,
  startX: number,
  baseY: number,
  startZ: number,
  dx: number,
  dz: number,
  widthX: number,
  widthZ: number,
  stepId: VoxelId,
): void {
  const { fillBox } = ops;
  for (let s = 0; s < 4; s++) {
    const sx = startX + dx * s;
    const sz = startZ + dz * s;
    const xEnd = sx + widthX - 1;
    const zEnd = sz + widthZ - 1;
    // Clear interior + upper floor slab up to upper ceiling without breaking upper roof/ceiling
    fillBox(sx, baseY, sz, xEnd, baseY + 8, zEnd, VOXEL_ID.AIR);
    // Diagonal stair tread + riser backing so stacked stairs maintain 3+ blocks headroom below
    const minStepY = s === 0 ? baseY : baseY + s - 1;
    fillBox(sx, minStepY, sz, xEnd, baseY + s, zEnd, stepId);
  }
}

/**
 * Builds an interior partition wall with a complete 2-block-tall framed doorway (single or double).
 */
function addPartition(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
  wallId: VoxelId,
  doorPos: number,
  doorWidth: 1 | 2 = 1,
  doorId: VoxelId = VOXEL_ID.DOOR_WHITE_CLOSED,
): void {
  const { set, fillBox } = ops;
  const frameId = VOXEL_ID.CHARCOAL_TRIM;
  fillBox(x0, baseY, z0, x1, baseY + 3, z1, wallId);
  if (x0 === x1) {
    // Wall along Z
    for (let d = 0; d < doorWidth; d++) {
      set(x0, baseY, doorPos + d, doorId);
      set(x0, baseY + 1, doorPos + d, doorId);
      set(x0, baseY + 2, doorPos + d, frameId);
    }
  } else {
    // Wall along X
    for (let d = 0; d < doorWidth; d++) {
      set(doorPos + d, baseY, z0, doorId);
      set(doorPos + d, baseY + 1, z0, doorId);
      set(doorPos + d, baseY + 2, z0, frameId);
    }
  }
}

/**
 * Adds a 100% sealed modern pitched gabled roof with solid gable end walls and zero holes.
 */
function addCompletePitchedRoof(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
  roofId: VoxelId,
  gableId: VoxelId,
  alongZ: boolean,
): void {
  const { set } = ops;
  const span = alongZ ? x1 - x0 + 1 : z1 - z0 + 1;
  const layers = Math.ceil(span / 2);
  for (let step = 0; step < layers; step++) {
    const y = baseY + step;
    if (alongZ) {
      const lx0 = x0 + step;
      const lx1 = x1 - step;
      if (lx0 > lx1) break;
      for (let z = z0; z <= z1; z++) {
        for (let x = lx0; x <= lx1; x++) {
          const isEnd = z === z0 || z === z1;
          const isEdge = x === lx0 || x === lx1;
          if (isEdge || step === layers - 1) {
            set(x, y, z, roofId);
          } else if (isEnd) {
            set(x, y, z, gableId);
          } else {
            set(x, y, z, roofId);
          }
        }
      }
    } else {
      const lz0 = z0 + step;
      const lz1 = z1 - step;
      if (lz0 > lz1) break;
      for (let z = lz0; z <= lz1; z++) {
        for (let x = x0; x <= x1; x++) {
          const isEnd = x === x0 || x === x1;
          const isEdge = z === lz0 || z === lz1;
          if (isEdge || step === layers - 1) {
            set(x, y, z, roofId);
          } else if (isEnd) {
            set(x, y, z, gableId);
          } else {
            set(x, y, z, roofId);
          }
        }
      }
    }
  }
}

/**
 * Adds a crisp flat modern architectural roof with a 1-block parapet rim & skylights/solar panels.
 */
function addModernFlatRoof(
  ops: VoxelWriteOps,
  x0: number,
  roofY: number,
  z0: number,
  x1: number,
  z1: number,
  deckId: VoxelId,
  parapetId: VoxelId,
): void {
  const { set, fillBox } = ops;
  fillBox(x0, roofY, z0, x1, roofY, z1, deckId);
  for (let x = x0; x <= x1; x++) {
    set(x, roofY + 1, z0, parapetId);
    set(x, roofY + 1, z1, parapetId);
  }
  for (let z = z0; z <= z1; z++) {
    set(x0, roofY + 1, z, parapetId);
    set(x1, roofY + 1, z, parapetId);
  }
}

/**
 * Places a lush green School Party Craft-style decorative yard tree or garden shrub.
 */
export function buildHealthyTree(
  ops: VoxelWriteOps,
  gx: number,
  gz: number,
  trunkH: number,
): void {
  const { set } = ops;
  const baseY = 2;
  for (let ty = 0; ty < trunkH; ty++) {
    set(gx, baseY + ty, gz, VOXEL_ID.LOG);
  }
  const top = baseY + trunkH - 1;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      set(gx + dx, top, gz + dz, VOXEL_ID.LEAVES);
      if (Math.abs(dx) + Math.abs(dz) <= 1) {
        set(gx + dx, top + 1, gz + dz, VOXEL_ID.LEAVES);
      }
    }
  }
  set(gx, top + 2, gz, VOXEL_ID.LEAVES);
}

/**
 * Replaces the old abandoned buildings with a complete collection of finished,
 * colorful, School Party Craft-inspired modern houses (Small, Medium, and Large)
 * plus a clean modern plaza park with a blue-tiled water fountain.
 */
export function buildModernNeighborhood(rawOps: VoxelWriteOps): void {
  const ops = createProtectedVoxelOps(rawOps);
  const { set, fillBox, markFixed } = ops;

  const setFixed = (gx: number, by: number, gz: number, id: VoxelId) => {
    set(gx, by, gz, id);
    markFixed?.(gx, by, gz);
  };

  const fillFixed = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    id: VoxelId,
  ) => {
    fillBox(x0, y0, z0, x1, y1, z1, id);
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const minZ = Math.min(z0, z1);
    const maxZ = Math.max(z0, z1);
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          markFixed?.(x, y, z);
        }
      }
    }
  };

  // Helper to lay clean manicured green lawn on each house lot (normal breakable ground)
  const paveLawn = (x0: number, z0: number, x1: number, z1: number) => {
    rawOps.fillBox(x0, 1, z0, x1, 1, z1, VOXEL_ID.GRASS);
  };

  // =========================================================================
  // 1. LARGE 3-STORY MODERN HOUSES (4 Architectural Designs)
  // =========================================================================

  // (1) 3-Story Luxury White & Sky-Blue Villa — NE Inner [5..18, -18..-5]
  // Prominent corner villa right ahead-right of spawn (0, 2, 4)!
  {
    const x0 = 5, x1 = 18, z0 = -18, z1 = -5;
    paveLawn(4, -19, 19, -4);
    // Walkways from sidewalks to doors
    rawOps.fillBox(4, 1, -11, 5, 1, -10, VOXEL_ID.SIDEWALK);
    rawOps.fillBox(10, 1, -5, 11, 1, -4, VOXEL_ID.SIDEWALK);

    // Floor 1 (by = 2..5): Living Room, Kitchen/Dining, Powder Bath, Staircase
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    // Floor 2 (by = 7..10): 2 Bedrooms + Full Bathroom + Staircase
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    // Floor 3 (by = 12..15): Master Suite + Study + Ensuite Bathroom + Front Glass Balcony
    buildStoryShell(ops, x0, 12, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    // Architectural accent stripe & sky facade
    fillBox(x0 + 1, 6, z1, x1 - 1, 6, z1, VOXEL_ID.CHARCOAL_TRIM);
    fillBox(x0 + 1, 11, z1, x1 - 1, 11, z1, VOXEL_ID.CHARCOAL_TRIM);

    // Solid modern block entrances facing Main NS Ave (x0 = 5) & Main EW Ave (z1 = -5)
    addExteriorDoor(ops, x0, 2, -11, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WOOD_CLOSED);
    addExteriorDoor(ops, 10, 2, z1, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);

    // Windows across all 3 floors (never overlapping corners or doors)
    for (const fy of [2, 7, 12]) {
      addWindowSpan(ops, 7, fy, z1, 8, z1);
      addWindowSpan(ops, 13, fy, z1, 16, z1);
      addWindowSpan(ops, 7, fy, z0, 9, z0);
      addWindowSpan(ops, 13, fy, z0, 15, z0);
      addWindowSpan(ops, x0, fy, -16, x0, -14);
      addWindowSpan(ops, x0, fy, -8, x0, -7);
      addWindowSpan(ops, x1, fy, -15, x1, -13);
      addWindowSpan(ops, x1, fy, -9, x1, -7);
    }

    // --- Floor 1 Interior ---
    // Modern Kitchen (NE zone: x=13..17, z=-17..-13) — built-in fixtures fixed in place
    fillBox(12, 1, -17, 17, 1, -12, VOXEL_ID.TILE_FLOOR);
    fillFixed(13, 2, -17, 16, 2, -17, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(14, 2, -17, VOXEL_ID.STOVE);
    setFixed(15, 2, -17, VOXEL_ID.SINK_COUNTER);
    setFixed(17, 2, -17, VOXEL_ID.FRIDGE);
    setFixed(17, 3, -17, VOXEL_ID.FRIDGE);
    setFixed(17, 2, -15, VOXEL_ID.CUPBOARD_WHITE);
    fillFixed(14, 2, -14, 15, 2, -14, VOXEL_ID.TABLE); // Dining table (fixed)
    set(14, 2, -13, VOXEL_ID.CHAIR_OAK);
    set(15, 2, -13, VOXEL_ID.CHAIR_SKY);
    set(14, 3, -14, VOXEL_ID.FLOWER_VASE);

    // Downstairs Bathroom (NW enclosed corner: x=6..9, z=-17..-14)
    fillBox(6, 1, -17, 9, 1, -14, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 9, 2, -17, 9, -14, VOXEL_ID.WHITE_WALL, -15, 1);
    fillBox(6, 2, -14, 8, 5, -14, VOXEL_ID.WHITE_WALL);
    setFixed(6, 2, -17, VOXEL_ID.TOILET);
    setFixed(7, 2, -17, VOXEL_ID.SINK_COUNTER);

    // Living Room (SW zone: x=7..11, z=-9..-6)
    fillBox(7, 1, -9, 10, 1, -7, VOXEL_ID.CARPET_BLUE);
    fillFixed(7, 2, -8, 7, 2, -7, VOXEL_ID.SOFA);
    setFixed(9, 2, -8, VOXEL_ID.TABLE_GLASS);
    set(9, 3, -8, VOXEL_ID.DESK_LAMP);
    setFixed(11, 2, -8, VOXEL_ID.TV_SCREEN);
    setFixed(11, 3, -8, VOXEL_ID.TV_SCREEN);
    setFixed(11, 2, -9, VOXEL_ID.BOOKSHELF);
    set(6, 2, -6, VOXEL_ID.PLANT_POT);

    // Staircase 1->2 along east wall
    buildStaircase(ops, 15, 2, -11, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    // Stairwell guardrail on Floor 2
    fillBox(14, 7, -11, 14, 7, -8, VOXEL_ID.GLASS);
    set(14, 7, -7, VOXEL_ID.CHARCOAL_TRIM);

    // --- Floor 2 Interior ---
    // Full Bathroom (NW corner: x=6..9, z=-17..-13)
    fillBox(6, 6, -17, 9, 6, -13, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 9, 7, -17, 9, -13, VOXEL_ID.WHITE_WALL, -14, 1);
    fillBox(6, 7, -13, 8, 10, -13, VOXEL_ID.WHITE_WALL);
    setFixed(6, 7, -17, VOXEL_ID.BATHTUB);
    setFixed(7, 7, -17, VOXEL_ID.BATHTUB);
    setFixed(6, 7, -15, VOXEL_ID.TOILET);
    setFixed(6, 7, -14, VOXEL_ID.SINK_COUNTER);

    // Bedroom A (NE: x=11..17, z=-17..-13)
    addPartition(ops, 11, 7, -12, 17, -12, VOXEL_ID.WHITE_WALL, 12, 2, VOXEL_ID.DOOR_WOOD_CLOSED);
    fillBox(13, 6, -16, 15, 6, -14, VOXEL_ID.CARPET_CORAL);
    setFixed(16, 7, -17, VOXEL_ID.BED_HEAD);
    setFixed(15, 7, -17, VOXEL_ID.BED_FOOT);
    setFixed(13, 7, -17, VOXEL_ID.CUPBOARD_WHITE);
    set(17, 7, -16, VOXEL_ID.TABLE_WHITE);
    set(17, 8, -16, VOXEL_ID.DESK_LAMP);
    set(12, 7, -16, VOXEL_ID.CHAIR_PINK);
    set(17, 7, -15, VOXEL_ID.BOOKSHELF);
    set(17, 7, -14, VOXEL_ID.GIFT_BOX);

    // Bedroom B (SW: x=6..12, z=-10..-6)
    addPartition(ops, 6, 7, -10, 12, -10, VOXEL_ID.WHITE_WALL, 10, 2, VOXEL_ID.DOOR_SKY_CLOSED);
    addPartition(ops, 12, 7, -10, 12, -6, VOXEL_ID.WHITE_WALL, -8, 1, VOXEL_ID.DOOR_WHITE_CLOSED);
    fillBox(8, 6, -8, 10, 6, -7, VOXEL_ID.CARPET_BLUE);
    setFixed(6, 7, -6, VOXEL_ID.BED_HEAD);
    setFixed(7, 7, -6, VOXEL_ID.BED_FOOT);
    setFixed(11, 7, -9, VOXEL_ID.CUPBOARD_SKY);
    set(6, 7, -8, VOXEL_ID.TABLE);
    set(6, 8, -8, VOXEL_ID.FLOWER_VASE);
    set(7, 7, -8, VOXEL_ID.CHAIR_SKY);
    setFixed(11, 7, -6, VOXEL_ID.TV_SCREEN);

    // Staircase 2->3 stacked cleanly at x=15..16, z=-11..-8
    buildStaircase(ops, 15, 7, -11, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(14, 12, -11, 14, 12, -8, VOXEL_ID.GLASS);

    // --- Floor 3 Interior (Master Suite + Ensuite Bath + Study) ---
    fillBox(6, 11, -17, 10, 11, -13, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 10, 12, -17, 10, -13, VOXEL_ID.WHITE_WALL, -14, 1);
    fillBox(6, 12, -13, 9, 15, -13, VOXEL_ID.WHITE_WALL);
    setFixed(6, 12, -17, VOXEL_ID.BATHTUB);
    setFixed(7, 12, -17, VOXEL_ID.BATHTUB);
    setFixed(6, 12, -15, VOXEL_ID.TOILET);
    setFixed(8, 12, -17, VOXEL_ID.SINK_COUNTER);

    // Master Bed + Lounge + Study Desk
    fillBox(12, 11, -16, 15, 11, -14, VOXEL_ID.CARPET_BLUE);
    setFixed(16, 12, -17, VOXEL_ID.BED_HEAD);
    setFixed(15, 12, -17, VOXEL_ID.BED_FOOT);
    setFixed(16, 12, -16, VOXEL_ID.BED_HEAD);
    setFixed(15, 12, -16, VOXEL_ID.BED_FOOT);
    setFixed(17, 12, -17, VOXEL_ID.CUPBOARD_OAK);
    set(17, 12, -15, VOXEL_ID.BOOKSHELF);
    fillFixed(7, 12, -6, 8, 12, -6, VOXEL_ID.SOFA_CREAM);
    set(8, 12, -8, VOXEL_ID.TABLE_WHITE);
    set(8, 13, -8, VOXEL_ID.PLUSH_DECOR);
    set(9, 12, -8, VOXEL_ID.CHAIR_MINT);
    set(13, 12, -6, VOXEL_ID.PLANT_POT);
    setFixed(11, 12, -7, VOXEL_ID.TV_SCREEN);
    setFixed(11, 13, -7, VOXEL_ID.TV_SCREEN);

    // Complete Modern Flat Parapet Roof + Recessed Skylight Glass Band
    addModernFlatRoof(ops, x0, 16, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL);
    fillBox(10, 16, -13, 12, 16, -11, VOXEL_ID.GLASS);
  }

  // (2) 3-Story Modern Mint & White Family Mansion — Outer N-Central-West [-18..-5, -38..-25]
  {
    const x0 = -18, x1 = -5, z0 = -38, z1 = -25;
    paveLawn(-19, -39, -4, -25);
    rawOps.fillBox(-12, 1, -25, -11, 1, -25, VOXEL_ID.SIDEWALK);

    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0 + 1, 12, z0 + 1, x1 - 1, z1 - 1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    // Front Porch & Mint Block Entrance facing South Ring St (z1 = -25)
    addExteriorDoor(ops, -12, 2, z1, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);
    for (const fy of [2, 7]) {
      addWindowSpan(ops, -16, fy, z1, -14, z1);
      addWindowSpan(ops, -8, fy, z1, -7, z1);
      addWindowSpan(ops, -15, fy, z0, -13, z0);
      addWindowSpan(ops, -9, fy, z0, -7, z0);
      addWindowSpan(ops, x0, fy, -35, x0, -33);
      addWindowSpan(ops, x0, fy, -29, x0, -27);
      addWindowSpan(ops, x1, fy, -35, x1, -33);
      addWindowSpan(ops, x1, fy, -29, x1, -27);
    }
    addWindowSpan(ops, -15, 12, z1 - 1, -13, z1 - 1);
    addWindowSpan(ops, -9, 12, z1 - 1, -7, z1 - 1);
    addWindowSpan(ops, -15, 12, z0 + 1, -13, z0 + 1);
    addWindowSpan(ops, -9, 12, z0 + 1, -7, z0 + 1);

    // Floor 1: Living, Kitchen, Bathroom, Staircase
    fillBox(-17, 1, -37, -13, 1, -33, VOXEL_ID.TILE_FLOOR);
    fillFixed(-17, 2, -37, -15, 2, -37, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(-14, 2, -37, VOXEL_ID.STOVE);
    setFixed(-13, 2, -37, VOXEL_ID.SINK_COUNTER);
    setFixed(-17, 2, -35, VOXEL_ID.FRIDGE);
    setFixed(-17, 3, -35, VOXEL_ID.FRIDGE);
    setFixed(-17, 2, -33, VOXEL_ID.CUPBOARD_WHITE);
    setFixed(-14, 2, -34, VOXEL_ID.TABLE_WHITE);
    set(-14, 3, -34, VOXEL_ID.FLOWER_VASE);
    set(-14, 2, -33, VOXEL_ID.CHAIR_MINT);
    set(-13, 2, -34, VOXEL_ID.CHAIR_MINT);

    // Enclosed Floor 1 Bath (NE: -9..-6, -37..-34)
    fillBox(-9, 1, -37, -6, 1, -34, VOXEL_ID.TILE_FLOOR);
    fillBox(-10, 2, -37, -10, 5, -34, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -10, 2, -34, -6, -34, VOXEL_ID.WHITE_WALL, -8, 1);
    setFixed(-6, 2, -37, VOXEL_ID.TOILET);
    setFixed(-8, 2, -37, VOXEL_ID.SINK_COUNTER);

    // Floor 1 Living Room (SW: -17..-13, -30..-26)
    fillBox(-16, 1, -29, -14, 1, -27, VOXEL_ID.CARPET_BLUE);
    fillFixed(-17, 2, -29, -17, 2, -27, VOXEL_ID.SOFA_MINT);
    set(-15, 2, -28, VOXEL_ID.TABLE_GLASS);
    setFixed(-13, 2, -28, VOXEL_ID.TV_SCREEN);
    set(-13, 2, -29, VOXEL_ID.BOOKSHELF);
    set(-13, 2, -26, VOXEL_ID.PLANT_POT);

    // Staircase 1->2 & 2->3 along east interior (x=-8..-7, z=-32..-29)
    buildStaircase(ops, -8, 2, -32, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-9, 7, -32, -9, 7, -29, VOXEL_ID.GLASS);
    buildStaircase(ops, -8, 7, -32, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-9, 12, -32, -9, 12, -29, VOXEL_ID.GLASS);

    // Floor 2: 2 Bedrooms + Full Bathroom
    fillBox(-9, 6, -37, -6, 6, -34, VOXEL_ID.TILE_FLOOR);
    fillBox(-10, 7, -37, -10, 10, -34, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -10, 7, -34, -6, -34, VOXEL_ID.WHITE_WALL, -8, 1);
    setFixed(-6, 7, -37, VOXEL_ID.BATHTUB);
    setFixed(-7, 7, -37, VOXEL_ID.BATHTUB);
    setFixed(-6, 7, -35, VOXEL_ID.TOILET);
    setFixed(-9, 7, -37, VOXEL_ID.SINK_COUNTER);

    addPartition(ops, -17, 7, -32, -11, -32, VOXEL_ID.WHITE_WALL, -13, 2, VOXEL_ID.DOOR_WOOD_CLOSED);
    fillBox(-16, 6, -36, -13, 6, -34, VOXEL_ID.CARPET_CORAL);
    setFixed(-17, 7, -37, VOXEL_ID.BED_HEAD);
    setFixed(-16, 7, -37, VOXEL_ID.BED_FOOT);
    setFixed(-11, 7, -37, VOXEL_ID.CUPBOARD_OAK);
    set(-17, 7, -35, VOXEL_ID.TABLE);
    set(-17, 8, -35, VOXEL_ID.DESK_LAMP);
    set(-12, 7, -37, VOXEL_ID.BOOKSHELF);

    fillBox(-16, 6, -29, -13, 6, -27, VOXEL_ID.CARPET_BLUE);
    set(-17, 7, -26, VOXEL_ID.BED_MINT);
    set(-14, 7, -26, VOXEL_ID.TABLE_WHITE);
    set(-13, 7, -26, VOXEL_ID.CHAIR_MINT);

    // Floor 3 Penthouse Loft & Ensuite Bath
    fillBox(-16, 11, -36, -13, 11, -33, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, -12, 12, -36, -12, -33, VOXEL_ID.WHITE_WALL, -34, 1);
    fillBox(-16, 12, -33, -13, 15, -33, VOXEL_ID.WHITE_WALL);
    setFixed(-16, 12, -36, VOXEL_ID.BATHTUB);
    setFixed(-15, 12, -36, VOXEL_ID.BATHTUB);
    setFixed(-16, 12, -34, VOXEL_ID.TOILET);
    setFixed(-14, 12, -36, VOXEL_ID.SINK_COUNTER);

    fillBox(-16, 11, -29, -13, 11, -27, VOXEL_ID.CARPET_CORAL);
    setFixed(-16, 12, -27, VOXEL_ID.BED_CORAL);
    set(-13, 12, -27, VOXEL_ID.BOOKSHELF);
    set(-11, 12, -36, VOXEL_ID.TABLE);
    set(-11, 13, -36, VOXEL_ID.PLUSH_DECOR);
    set(-11, 12, -35, VOXEL_ID.CHAIR_SKY);
    set(-10, 12, -26, VOXEL_ID.GIFT_BOX);
    setFixed(-9, 12, -36, VOXEL_ID.TV_SCREEN);

    // Complete Gabled Slate Roof on 3rd floor setback
    addCompletePitchedRoof(ops, x0 + 1, 16, z0 + 1, x1 - 1, z1 - 1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, false);
  }

  // (3) 3-Story Pastel Sky & Coral Modern Villa — Outer SW [-38..-25, 25..38]
  {
    const x0 = -38, x1 = -25, z0 = 25, z1 = 38;
    paveLawn(-39, 25, -25, 39);
    rawOps.fillBox(-32, 1, 25, -31, 1, 25, VOXEL_ID.SIDEWALK);

    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 12, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    // Pastel Block Entrances facing North Ring St (z0 = 25) & East Ring St (x1 = -25)
    addExteriorDoor(ops, -32, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addExteriorDoor(ops, x1, 2, 31, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_CORAL_CLOSED);

    for (const fy of [2, 7, 12]) {
      addWindowSpan(ops, -36, fy, z0, -34, z0);
      addWindowSpan(ops, -28, fy, z0, -27, z0);
      addWindowSpan(ops, -35, fy, z1, -33, z1);
      addWindowSpan(ops, -29, fy, z1, -27, z1);
      addWindowSpan(ops, x0, fy, 27, x0, 29);
      addWindowSpan(ops, x0, fy, 33, x0, 35);
      addWindowSpan(ops, x1, fy, 27, x1, 28);
      addWindowSpan(ops, x1, fy, 34, x1, 36);
    }

    // Floor 1: Living, Kitchen, Bath, Staircase
    fillBox(-37, 1, 27, -34, 1, 30, VOXEL_ID.CARPET_CORAL);
    fillFixed(-37, 2, 27, -37, 2, 29, VOXEL_ID.SOFA_CORAL);
    setFixed(-35, 2, 28, VOXEL_ID.TABLE_WHITE);
    set(-35, 3, 28, VOXEL_ID.FLOWER_VASE);
    setFixed(-33, 2, 28, VOXEL_ID.TV_SCREEN);
    set(-33, 2, 27, VOXEL_ID.BOOKSHELF);

    fillBox(-37, 1, 33, -32, 1, 37, VOXEL_ID.TILE_FLOOR);
    fillFixed(-37, 2, 37, -34, 2, 37, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(-36, 2, 37, VOXEL_ID.STOVE);
    setFixed(-35, 2, 37, VOXEL_ID.SINK_COUNTER);
    setFixed(-37, 2, 35, VOXEL_ID.FRIDGE);
    setFixed(-37, 3, 35, VOXEL_ID.FRIDGE);
    set(-33, 2, 34, VOXEL_ID.TABLE);
    set(-33, 2, 33, VOXEL_ID.CHAIR_PINK);
    set(-31, 2, 37, VOXEL_ID.PLANT_POT);

    fillBox(-29, 1, 34, -26, 1, 37, VOXEL_ID.TILE_FLOOR);
    fillBox(-30, 2, 34, -30, 5, 37, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -30, 2, 34, -26, 34, VOXEL_ID.WHITE_WALL, -28, 1);
    setFixed(-26, 2, 37, VOXEL_ID.TOILET);
    setFixed(-28, 2, 37, VOXEL_ID.SINK_COUNTER);

    // Staircases 1->2 and 2->3 along East wall
    buildStaircase(ops, -27, 2, 27, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-28, 7, 27, -28, 7, 30, VOXEL_ID.GLASS);
    buildStaircase(ops, -27, 7, 27, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-28, 12, 27, -28, 12, 30, VOXEL_ID.GLASS);

    // Floor 2: 2 Bedrooms + Full Bath
    fillBox(-37, 6, 27, -33, 6, 30, VOXEL_ID.CARPET_BLUE);
    setFixed(-37, 7, 26, VOXEL_ID.BED_HEAD);
    setFixed(-36, 7, 26, VOXEL_ID.BED_FOOT);
    setFixed(-31, 7, 26, VOXEL_ID.CUPBOARD_SKY);
    set(-37, 7, 28, VOXEL_ID.TABLE_WHITE);
    set(-37, 8, 28, VOXEL_ID.DESK_LAMP);
    set(-36, 7, 28, VOXEL_ID.CHAIR_SKY);
    addPartition(ops, -37, 7, 31, -31, 31, VOXEL_ID.WHITE_WALL, -33, 2, VOXEL_ID.DOOR_CORAL_CLOSED);

    fillBox(-37, 6, 33, -33, 6, 36, VOXEL_ID.CARPET_CORAL);
    set(-37, 7, 37, VOXEL_ID.BED_CORAL);
    set(-34, 7, 37, VOXEL_ID.BOOKSHELF);

    fillBox(-29, 6, 34, -26, 6, 37, VOXEL_ID.TILE_FLOOR);
    fillBox(-30, 7, 34, -30, 10, 37, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -30, 7, 34, -26, 34, VOXEL_ID.WHITE_WALL, -28, 1);
    setFixed(-26, 7, 37, VOXEL_ID.BATHTUB);
    setFixed(-27, 7, 37, VOXEL_ID.BATHTUB);
    setFixed(-26, 7, 35, VOXEL_ID.TOILET);
    setFixed(-29, 7, 37, VOXEL_ID.SINK_COUNTER);

    // Floor 3: Master Bedroom + Lounge + Ensuite
    fillBox(-37, 11, 27, -32, 11, 30, VOXEL_ID.CARPET_BLUE);
    setFixed(-37, 12, 26, VOXEL_ID.BED_HEAD);
    setFixed(-36, 12, 26, VOXEL_ID.BED_FOOT);
    setFixed(-37, 12, 27, VOXEL_ID.BED_HEAD);
    setFixed(-36, 12, 27, VOXEL_ID.BED_FOOT);
    setFixed(-33, 12, 26, VOXEL_ID.TV_SCREEN);
    setFixed(-37, 12, 34, VOXEL_ID.SOFA_MINT);
    set(-35, 12, 34, VOXEL_ID.TABLE_GLASS);
    set(-32, 12, 37, VOXEL_ID.GIFT_BOX);
    set(-34, 12, 37, VOXEL_ID.BOOKSHELF);

    fillBox(-29, 11, 34, -26, 11, 37, VOXEL_ID.TILE_FLOOR);
    fillBox(-30, 12, 34, -30, 15, 37, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -30, 12, 34, -26, 34, VOXEL_ID.WHITE_WALL, -28, 1);
    setFixed(-26, 12, 37, VOXEL_ID.BATHTUB);
    setFixed(-27, 12, 37, VOXEL_ID.BATHTUB);
    setFixed(-26, 12, 35, VOXEL_ID.TOILET);
    setFixed(-29, 12, 37, VOXEL_ID.SINK_COUNTER);

    addModernFlatRoof(ops, x0, 16, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL);
  }

  // (4) 3-Story Sleek Coral & Cream Townhouse — SE Inner Corner [12..19, 12..19]
  {
    const x0 = 12, x1 = 19, z0 = 12, z1 = 19;
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 12, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    // Double Entrance facing Plaza (x0 = 12)
    addExteriorDoor(ops, x0, 2, 15, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_CORAL_CLOSED);
    for (const fy of [2, 7, 12]) {
      addWindowSpan(ops, 14, fy, z0, 17, z0);
      addWindowSpan(ops, 14, fy, z1, 17, z1);
      addWindowSpan(ops, x1, fy, 14, x1, 17);
      if (fy > 2) addWindowSpan(ops, x0, fy, 14, x0, 17);
    }

    // F1: Kitchenette + Compact Living + Stair
    fillBox(13, 1, 13, 16, 1, 14, VOXEL_ID.TILE_FLOOR);
    setFixed(13, 2, 13, VOXEL_ID.FRIDGE);
    setFixed(13, 3, 13, VOXEL_ID.FRIDGE);
    setFixed(14, 2, 13, VOXEL_ID.STOVE);
    setFixed(15, 2, 13, VOXEL_ID.SINK_COUNTER);
    setFixed(16, 2, 13, VOXEL_ID.KITCHEN_COUNTER);
    fillBox(13, 1, 17, 15, 1, 18, VOXEL_ID.CARPET_CORAL);
    setFixed(13, 2, 18, VOXEL_ID.SOFA_CORAL);
    setFixed(14, 2, 18, VOXEL_ID.SOFA_CORAL);
    set(15, 2, 18, VOXEL_ID.TABLE_GLASS);
    set(15, 3, 18, VOXEL_ID.FLOWER_VASE);
    setFixed(15, 2, 17, VOXEL_ID.TV_SCREEN);

    buildStaircase(ops, 18, 2, 14, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(17, 7, 14, 17, 7, 17, VOXEL_ID.GLASS);
    buildStaircase(ops, 18, 7, 14, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(17, 12, 14, 17, 12, 17, VOXEL_ID.GLASS);

    // F2: Full Bathroom + Bedroom
    fillBox(13, 6, 16, 15, 6, 18, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 16, 7, 16, 16, 18, VOXEL_ID.WHITE_WALL, 17, 1);
    fillBox(13, 7, 16, 15, 10, 16, VOXEL_ID.WHITE_WALL);
    setFixed(13, 7, 18, VOXEL_ID.TOILET);
    setFixed(14, 7, 18, VOXEL_ID.SINK_COUNTER);
    setFixed(15, 7, 18, VOXEL_ID.BATHTUB);
    setFixed(13, 7, 13, VOXEL_ID.BED_HEAD);
    setFixed(14, 7, 13, VOXEL_ID.BED_FOOT);
    setFixed(17, 7, 13, VOXEL_ID.CUPBOARD_WHITE);
    set(16, 7, 13, VOXEL_ID.BOOKSHELF);
    set(18, 7, 13, VOXEL_ID.PLANT_POT);

    // F3: Master Bedroom + Study
    fillBox(13, 11, 14, 15, 11, 16, VOXEL_ID.CARPET_BLUE);
    set(13, 12, 13, VOXEL_ID.BED_CORAL);
    set(13, 12, 18, VOXEL_ID.TABLE_WHITE);
    set(13, 13, 18, VOXEL_ID.DESK_LAMP);
    set(13, 12, 17, VOXEL_ID.CHAIR_PINK);
    set(14, 12, 18, VOXEL_ID.BOOKSHELF);
    set(14, 13, 18, VOXEL_ID.PLUSH_DECOR);
    setFixed(16, 12, 18, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 16, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, true);
  }

  // =========================================================================
  // 2. MEDIUM 2-STORY MODERN HOUSES (7 Distinct Designs)
  // =========================================================================

  // (5) 2-Story Contemporary Cream & Charcoal Home — Outer East-North [26..38, -18..-5]
  {
    const x0 = 26, x1 = 38, z0 = -18, z1 = -5;
    paveLawn(25, -19, 39, -4);
    rawOps.fillBox(25, 1, -12, 26, 1, -11, VOXEL_ID.SIDEWALK);

    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, x0, 2, -12, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WOOD_CLOSED);

    for (const fy of [2, 7]) {
      addWindowSpan(ops, 28, fy, z0, 30, z0);
      addWindowSpan(ops, 34, fy, z0, 36, z0);
      addWindowSpan(ops, 28, fy, z1, 30, z1);
      addWindowSpan(ops, 34, fy, z1, 36, z1);
      addWindowSpan(ops, x0, fy, -16, x0, -15);
      addWindowSpan(ops, x0, fy, -8, x0, -7);
      addWindowSpan(ops, x1, fy, -15, x1, -13);
      addWindowSpan(ops, x1, fy, -9, x1, -7);
    }

    // Floor 1: Kitchen, Bath, Living, Staircase
    fillBox(27, 1, -17, 32, 1, -14, VOXEL_ID.TILE_FLOOR);
    fillFixed(27, 2, -17, 30, 2, -17, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(28, 2, -17, VOXEL_ID.STOVE);
    setFixed(29, 2, -17, VOXEL_ID.SINK_COUNTER);
    setFixed(31, 2, -17, VOXEL_ID.FRIDGE);
    setFixed(31, 3, -17, VOXEL_ID.FRIDGE);
    setFixed(32, 2, -17, VOXEL_ID.CUPBOARD_OAK);
    set(29, 2, -14, VOXEL_ID.TABLE_WHITE);
    set(29, 3, -14, VOXEL_ID.FLOWER_VASE);
    set(28, 2, -14, VOXEL_ID.CHAIR_OAK);

    fillBox(34, 1, -17, 37, 1, -14, VOXEL_ID.TILE_FLOOR);
    fillBox(33, 2, -17, 33, 5, -14, VOXEL_ID.WHITE_WALL);
    addPartition(ops, 33, 2, -14, 37, -14, VOXEL_ID.WHITE_WALL, 35, 1);
    setFixed(37, 2, -17, VOXEL_ID.TOILET);
    setFixed(35, 2, -17, VOXEL_ID.SINK_COUNTER);

    fillBox(27, 1, -9, 31, 1, -6, VOXEL_ID.CARPET_BLUE);
    fillFixed(27, 2, -7, 27, 2, -6, VOXEL_ID.SOFA_CREAM);
    set(29, 2, -7, VOXEL_ID.TABLE_GLASS);
    set(29, 3, -7, VOXEL_ID.DESK_LAMP);
    setFixed(31, 2, -7, VOXEL_ID.TV_SCREEN);
    set(31, 2, -8, VOXEL_ID.BOOKSHELF);
    set(32, 2, -6, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, 36, 2, -11, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(35, 7, -11, 35, 7, -8, VOXEL_ID.GLASS);

    // Floor 2: 2 Bedrooms + Bath
    addPartition(ops, 27, 7, -12, 33, -12, VOXEL_ID.WHITE_WALL, 31, 2, VOXEL_ID.DOOR_WOOD_CLOSED);
    fillBox(28, 6, -16, 31, 6, -14, VOXEL_ID.CARPET_CORAL);
    setFixed(27, 7, -17, VOXEL_ID.BED_HEAD);
    setFixed(28, 7, -17, VOXEL_ID.BED_FOOT);
    setFixed(30, 7, -17, VOXEL_ID.CUPBOARD_WHITE);
    set(27, 7, -15, VOXEL_ID.TABLE);
    set(27, 8, -15, VOXEL_ID.DESK_LAMP);
    set(28, 7, -15, VOXEL_ID.CHAIR_OAK);

    fillBox(34, 6, -17, 37, 6, -14, VOXEL_ID.TILE_FLOOR);
    fillBox(33, 7, -17, 33, 10, -14, VOXEL_ID.WHITE_WALL);
    addPartition(ops, 33, 7, -14, 37, -14, VOXEL_ID.WHITE_WALL, 35, 1);
    setFixed(37, 7, -17, VOXEL_ID.BATHTUB);
    setFixed(36, 7, -17, VOXEL_ID.BATHTUB);
    setFixed(37, 7, -15, VOXEL_ID.TOILET);
    setFixed(34, 7, -17, VOXEL_ID.SINK_COUNTER);

    fillBox(28, 6, -9, 31, 6, -7, VOXEL_ID.CARPET_BLUE);
    setFixed(27, 7, -6, VOXEL_ID.BED_HEAD);
    setFixed(28, 7, -6, VOXEL_ID.BED_FOOT);
    set(30, 7, -6, VOXEL_ID.BOOKSHELF);
    set(30, 8, -6, VOXEL_ID.PLUSH_DECOR);
    set(27, 7, -8, VOXEL_ID.CHAIR_PINK);
    setFixed(32, 7, -6, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (6) 2-Story Modern Coral & Cream Corner Townhouse — NW Inner [-13..-4, -13..-4]
  {
    const x0 = -13, x1 = -4, z0 = -13, z1 = -4;
    paveLawn(-19, -19, -4, -4);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    addExteriorDoor(ops, -9, 2, z1, true, 2, VOXEL_ID.CHARCOAL_TRIM);
    for (const fy of [2, 7]) {
      addWindowSpan(ops, -11, fy, z1, -11, z1);
      addWindowSpan(ops, -6, fy, z1, -6, z1);
      addWindowSpan(ops, -11, fy, z0, -10, z0);
      addWindowSpan(ops, -7, fy, z0, -6, z0);
      addWindowSpan(ops, x0, fy, -11, x0, -10);
      addWindowSpan(ops, x0, fy, -7, x0, -6);
      addWindowSpan(ops, x1, fy, -11, x1, -10);
      addWindowSpan(ops, x1, fy, -7, x1, -6);
    }

    // F1: Living + Kitchen + Staircase
    fillBox(-12, 1, -12, -9, 1, -10, VOXEL_ID.TILE_FLOOR);
    setFixed(-12, 2, -12, VOXEL_ID.FRIDGE);
    setFixed(-12, 3, -12, VOXEL_ID.FRIDGE);
    setFixed(-11, 2, -12, VOXEL_ID.STOVE);
    setFixed(-10, 2, -12, VOXEL_ID.SINK_COUNTER);
    setFixed(-9, 2, -12, VOXEL_ID.KITCHEN_COUNTER);
    set(-8, 2, -12, VOXEL_ID.CUPBOARD_WHITE);

    fillBox(-12, 1, -7, -10, 1, -5, VOXEL_ID.CARPET_CORAL);
    setFixed(-12, 2, -6, VOXEL_ID.SOFA_CORAL);
    setFixed(-12, 2, -7, VOXEL_ID.SOFA_CORAL);
    set(-11, 2, -5, VOXEL_ID.TABLE_WHITE);
    set(-11, 3, -5, VOXEL_ID.FLOWER_VASE);
    setFixed(-10, 2, -7, VOXEL_ID.TV_SCREEN);
    set(-5, 2, -5, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, -6, 2, -11, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-7, 7, -11, -7, 7, -8, VOXEL_ID.GLASS);

    // F2: Bedroom + Full Bathroom
    fillBox(-12, 6, -8, -9, 6, -5, VOXEL_ID.TILE_FLOOR);
    fillBox(-9, 7, -8, -9, 10, -5, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -12, 7, -8, -9, -8, VOXEL_ID.WHITE_WALL, -11, 1);
    setFixed(-12, 7, -5, VOXEL_ID.TOILET);
    setFixed(-11, 7, -5, VOXEL_ID.SINK_COUNTER);
    setFixed(-10, 7, -5, VOXEL_ID.BATHTUB);

    fillBox(-12, 6, -12, -9, 6, -10, VOXEL_ID.CARPET_BLUE);
    setFixed(-12, 7, -12, VOXEL_ID.BED_HEAD);
    setFixed(-11, 7, -12, VOXEL_ID.BED_FOOT);
    set(-9, 7, -12, VOXEL_ID.TABLE);
    set(-9, 8, -12, VOXEL_ID.DESK_LAMP);
    set(-10, 7, -11, VOXEL_ID.CHAIR_PINK);
    set(-9, 7, -11, VOXEL_ID.BOOKSHELF);
    set(-8, 7, -12, VOXEL_ID.GIFT_BOX);

    addModernFlatRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL);
  }

  // (7) 2-Story Brick & White Modern Suburban Home — SW Inner [-19..-9, 10..19]
  {
    const x0 = -19, x1 = -9, z0 = 10, z1 = 19;
    fillBox(-19, 1, 10, -9, 1, 19, VOXEL_ID.GRASS);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.BRICK, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    addExteriorDoor(ops, -15, 2, z1, true, 2, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_WOOD_CLOSED);
    for (const fy of [2, 7]) {
      addWindowSpan(ops, -17, fy, z1, -17, z1);
      addWindowSpan(ops, -12, fy, z1, -11, z1);
      addWindowSpan(ops, -17, fy, z0, -15, z0);
      addWindowSpan(ops, -12, fy, z0, -11, z0);
      addWindowSpan(ops, x0, fy, 12, x0, 13);
      addWindowSpan(ops, x0, fy, 16, x0, 17);
      addWindowSpan(ops, x1, fy, 12, x1, 13);
      addWindowSpan(ops, x1, fy, 16, x1, 17);
    }

    // F1: Kitchen + Living + Staircase
    fillBox(-18, 1, 11, -14, 1, 13, VOXEL_ID.TILE_FLOOR);
    setFixed(-18, 2, 11, VOXEL_ID.FRIDGE);
    setFixed(-18, 3, 11, VOXEL_ID.FRIDGE);
    setFixed(-17, 2, 11, VOXEL_ID.STOVE);
    setFixed(-16, 2, 11, VOXEL_ID.SINK_COUNTER);
    setFixed(-15, 2, 11, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(-14, 2, 11, VOXEL_ID.CUPBOARD_OAK);
    set(-15, 2, 13, VOXEL_ID.TABLE);
    set(-15, 3, 13, VOXEL_ID.FLOWER_VASE);
    set(-14, 2, 13, VOXEL_ID.CHAIR_OAK);

    fillBox(-18, 1, 15, -16, 1, 17, VOXEL_ID.CARPET_BLUE);
    fillFixed(-18, 2, 15, -18, 2, 17, VOXEL_ID.SOFA);
    setFixed(-16, 2, 16, VOXEL_ID.TV_SCREEN);
    set(-16, 2, 15, VOXEL_ID.BOOKSHELF);
    set(-18, 2, 18, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, -11, 2, 12, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-12, 7, 12, -12, 7, 15, VOXEL_ID.GLASS);

    // F2: Bedroom + Full Bathroom
    fillBox(-18, 6, 15, -14, 6, 18, VOXEL_ID.TILE_FLOOR);
    fillBox(-14, 7, 15, -14, 10, 18, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -18, 7, 15, -14, 15, VOXEL_ID.WHITE_WALL, -16, 1);
    setFixed(-18, 7, 18, VOXEL_ID.BATHTUB);
    setFixed(-17, 7, 18, VOXEL_ID.BATHTUB);
    setFixed(-15, 7, 18, VOXEL_ID.TOILET);
    setFixed(-18, 7, 16, VOXEL_ID.SINK_COUNTER);

    fillBox(-18, 6, 11, -14, 6, 13, VOXEL_ID.CARPET_CORAL);
    setFixed(-18, 7, 11, VOXEL_ID.BED_HEAD);
    setFixed(-17, 7, 11, VOXEL_ID.BED_FOOT);
    set(-15, 7, 11, VOXEL_ID.TABLE_WHITE);
    set(-15, 8, 11, VOXEL_ID.DESK_LAMP);
    set(-14, 7, 11, VOXEL_ID.BOOKSHELF);
    set(-14, 8, 11, VOXEL_ID.PLUSH_DECOR);
    set(-14, 7, 13, VOXEL_ID.CHAIR_MINT);

    addCompletePitchedRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (8) 2-Story L-Shaped Mint & Oak Modern House — Outer NE [26..37, -36..-25]
  {
    const x0 = 26, x1 = 37, z0 = -36, z1 = -25;
    paveLawn(25, -38, 39, -25);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    addExteriorDoor(ops, 31, 2, z1, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);
    for (const fy of [2, 7]) {
      addWindowSpan(ops, 28, fy, z1, 29, z1);
      addWindowSpan(ops, 34, fy, z1, 35, z1);
      addWindowSpan(ops, 28, fy, z0, 30, z0);
      addWindowSpan(ops, 33, fy, z0, 35, z0);
      addWindowSpan(ops, x0, fy, -34, x0, -32);
      addWindowSpan(ops, x0, fy, -29, x0, -27);
      addWindowSpan(ops, x1, fy, -34, x1, -32);
      addWindowSpan(ops, x1, fy, -29, x1, -27);
    }

    // F1: Kitchen + Living + Stair
    fillBox(27, 1, -35, 31, 1, -32, VOXEL_ID.TILE_FLOOR);
    setFixed(27, 2, -35, VOXEL_ID.FRIDGE);
    setFixed(27, 3, -35, VOXEL_ID.FRIDGE);
    setFixed(28, 2, -35, VOXEL_ID.STOVE);
    setFixed(29, 2, -35, VOXEL_ID.SINK_COUNTER);
    setFixed(30, 2, -35, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(31, 2, -35, VOXEL_ID.CUPBOARD_WHITE);
    set(29, 2, -32, VOXEL_ID.TABLE_WHITE);
    set(29, 3, -32, VOXEL_ID.FLOWER_VASE);
    set(28, 2, -32, VOXEL_ID.CHAIR_MINT);

    fillBox(27, 1, -29, 30, 1, -27, VOXEL_ID.CARPET_BLUE);
    fillFixed(27, 2, -28, 27, 2, -27, VOXEL_ID.SOFA_MINT);
    setFixed(30, 2, -27, VOXEL_ID.TV_SCREEN);
    set(30, 2, -28, VOXEL_ID.BOOKSHELF);
    set(27, 2, -26, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, 35, 2, -32, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(34, 7, -32, 34, 7, -29, VOXEL_ID.GLASS);

    // F2: 2 Bedrooms + Full Bathroom
    fillBox(33, 6, -35, 36, 6, -33, VOXEL_ID.TILE_FLOOR);
    fillBox(32, 7, -35, 32, 10, -33, VOXEL_ID.WHITE_WALL);
    addPartition(ops, 32, 7, -33, 36, -33, VOXEL_ID.WHITE_WALL, 34, 1);
    setFixed(36, 7, -35, VOXEL_ID.BATHTUB);
    setFixed(35, 7, -35, VOXEL_ID.BATHTUB);
    setFixed(33, 7, -35, VOXEL_ID.TOILET);
    setFixed(36, 7, -34, VOXEL_ID.SINK_COUNTER);

    fillBox(27, 6, -35, 30, 6, -33, VOXEL_ID.CARPET_CORAL);
    setFixed(27, 7, -35, VOXEL_ID.BED_HEAD);
    setFixed(28, 7, -35, VOXEL_ID.BED_FOOT);
    set(27, 7, -33, VOXEL_ID.TABLE);
    set(27, 8, -33, VOXEL_ID.DESK_LAMP);
    set(30, 7, -35, VOXEL_ID.CUPBOARD_OAK);

    fillBox(27, 6, -29, 30, 6, -27, VOXEL_ID.CARPET_BLUE);
    set(27, 7, -26, VOXEL_ID.BED_MINT);
    set(30, 7, -26, VOXEL_ID.BOOKSHELF);
    set(30, 8, -26, VOXEL_ID.GIFT_BOX);
    set(29, 7, -26, VOXEL_ID.CHAIR_MINT);

    addCompletePitchedRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.MINT_WALL, false);
  }

  // (9) 2-Story Sky-Blue & White Suburban Residence — Outer West-North [-37..-26, -18..-7]
  {
    const x0 = -37, x1 = -26, z0 = -18, z1 = -7;
    paveLawn(-39, -19, -25, -5);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    addExteriorDoor(ops, x1, 2, -13, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    for (const fy of [2, 7]) {
      addWindowSpan(ops, -35, fy, z0, -33, z0);
      addWindowSpan(ops, -30, fy, z0, -28, z0);
      addWindowSpan(ops, -35, fy, z1, -33, z1);
      addWindowSpan(ops, -30, fy, z1, -28, z1);
      addWindowSpan(ops, x0, fy, -15, x0, -13);
      addWindowSpan(ops, x0, fy, -10, x0, -9);
      addWindowSpan(ops, x1, fy, -16, x1, -15);
      addWindowSpan(ops, x1, fy, -9, x1, -9);
    }

    // F1: Kitchen + Living + Stair
    fillBox(-36, 1, -17, -32, 1, -14, VOXEL_ID.TILE_FLOOR);
    setFixed(-36, 2, -17, VOXEL_ID.FRIDGE);
    setFixed(-36, 3, -17, VOXEL_ID.FRIDGE);
    setFixed(-35, 2, -17, VOXEL_ID.STOVE);
    setFixed(-34, 2, -17, VOXEL_ID.SINK_COUNTER);
    setFixed(-33, 2, -17, VOXEL_ID.KITCHEN_COUNTER);
    set(-34, 2, -14, VOXEL_ID.TABLE_WHITE);
    set(-34, 3, -14, VOXEL_ID.FLOWER_VASE);
    set(-33, 2, -14, VOXEL_ID.CHAIR_SKY);

    fillBox(-36, 1, -10, -32, 1, -8, VOXEL_ID.CARPET_BLUE);
    fillFixed(-36, 2, -9, -36, 2, -8, VOXEL_ID.SOFA);
    setFixed(-33, 2, -8, VOXEL_ID.TV_SCREEN);
    set(-32, 2, -8, VOXEL_ID.BOOKSHELF);
    set(-35, 2, -8, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, -28, 2, -17, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(-29, 7, -17, -29, 7, -14, VOXEL_ID.GLASS);

    // F2: Bedroom + Full Bathroom
    fillBox(-36, 6, -11, -32, 6, -8, VOXEL_ID.TILE_FLOOR);
    fillBox(-32, 7, -11, -32, 10, -8, VOXEL_ID.WHITE_WALL);
    addPartition(ops, -36, 7, -11, -32, -11, VOXEL_ID.WHITE_WALL, -34, 1);
    setFixed(-36, 7, -8, VOXEL_ID.BATHTUB);
    setFixed(-35, 7, -8, VOXEL_ID.BATHTUB);
    setFixed(-33, 7, -8, VOXEL_ID.TOILET);
    setFixed(-36, 7, -10, VOXEL_ID.SINK_COUNTER);

    fillBox(-36, 6, -16, -32, 6, -14, VOXEL_ID.CARPET_CORAL);
    setFixed(-36, 7, -17, VOXEL_ID.BED_HEAD);
    setFixed(-35, 7, -17, VOXEL_ID.BED_FOOT);
    setFixed(-34, 7, -17, VOXEL_ID.CUPBOARD_SKY);
    set(-33, 7, -17, VOXEL_ID.TABLE);
    set(-33, 8, -17, VOXEL_ID.DESK_LAMP);
    set(-32, 7, -17, VOXEL_ID.CHAIR_SKY);
    set(-31, 7, -17, VOXEL_ID.BOOKSHELF);
    set(-31, 8, -17, VOXEL_ID.PLUSH_DECOR);

    addCompletePitchedRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, false);
  }

  // (10) 2-Story Twin Pastel Modern Duplex — Outer S-Central-East [5..18, 25..36]
  {
    const x0 = 5, x1 = 18, z0 = 25, z1 = 36;
    paveLawn(4, 25, 19, 39);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);

    // Center dividing wall separating West & East duplex units (with interior connecting door on F1)
    addPartition(ops, 11, 2, 26, 11, 35, VOXEL_ID.WHITE_WALL, 30, 1);
    fillBox(11, 7, 26, 11, 10, 35, VOXEL_ID.WHITE_WALL);

    // Twin Colored Block Entrances facing North Ring St (z0 = 25)
    addExteriorDoor(ops, 7, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_CORAL_CLOSED);
    addExteriorDoor(ops, 14, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);

    for (const fy of [2, 7]) {
      addWindowSpan(ops, 7, fy, z1, 9, z1);
      addWindowSpan(ops, 13, fy, z1, 16, z1);
      addWindowSpan(ops, x0, fy, 27, x0, 29);
      addWindowSpan(ops, x0, fy, 32, x0, 34);
      addWindowSpan(ops, x1, fy, 27, x1, 29);
      addWindowSpan(ops, x1, fy, 32, x1, 34);
      if (fy > 2) {
        addWindowSpan(ops, 7, fy, z0, 9, z0);
        addWindowSpan(ops, 14, fy, z0, 16, z0);
      }
    }

    // West Unit: Kitchen, Living, Stair + Upstairs Bed & Bath
    fillBox(6, 1, 32, 9, 1, 35, VOXEL_ID.TILE_FLOOR);
    setFixed(6, 2, 35, VOXEL_ID.FRIDGE);
    setFixed(6, 3, 35, VOXEL_ID.FRIDGE);
    setFixed(7, 2, 35, VOXEL_ID.STOVE);
    setFixed(8, 2, 35, VOXEL_ID.SINK_COUNTER);
    set(9, 2, 35, VOXEL_ID.CUPBOARD_WHITE);
    setFixed(6, 2, 29, VOXEL_ID.SOFA_CORAL);
    set(7, 2, 29, VOXEL_ID.TABLE_WHITE);
    set(7, 3, 29, VOXEL_ID.FLOWER_VASE);
    set(8, 2, 29, VOXEL_ID.CHAIR_PINK);
    setFixed(9, 2, 29, VOXEL_ID.TV_SCREEN);
    set(6, 2, 31, VOXEL_ID.PLANT_POT);
    buildStaircase(ops, 10, 2, 27, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(9, 7, 27, 9, 7, 30, VOXEL_ID.GLASS);

    fillBox(6, 6, 26, 8, 6, 28, VOXEL_ID.CARPET_CORAL);
    setFixed(6, 7, 26, VOXEL_ID.BED_HEAD);
    setFixed(7, 7, 26, VOXEL_ID.BED_FOOT);
    set(8, 7, 26, VOXEL_ID.TABLE_WHITE);
    set(8, 8, 26, VOXEL_ID.DESK_LAMP);
    fillBox(6, 6, 32, 9, 6, 35, VOXEL_ID.TILE_FLOOR);
    setFixed(6, 7, 35, VOXEL_ID.TOILET);
    setFixed(7, 7, 35, VOXEL_ID.SINK_COUNTER);
    setFixed(9, 7, 35, VOXEL_ID.BATHTUB);

    // East Unit: Kitchen, Living, Stair + Upstairs Bed & Bath
    fillBox(13, 1, 32, 17, 1, 35, VOXEL_ID.TILE_FLOOR);
    setFixed(17, 2, 35, VOXEL_ID.FRIDGE);
    setFixed(17, 3, 35, VOXEL_ID.FRIDGE);
    setFixed(16, 2, 35, VOXEL_ID.STOVE);
    setFixed(15, 2, 35, VOXEL_ID.SINK_COUNTER);
    set(14, 2, 35, VOXEL_ID.CUPBOARD_SKY);
    setFixed(17, 2, 29, VOXEL_ID.SOFA);
    set(16, 2, 29, VOXEL_ID.TABLE_GLASS);
    set(15, 2, 29, VOXEL_ID.CHAIR_SKY);
    setFixed(14, 2, 29, VOXEL_ID.TV_SCREEN);
    set(17, 2, 31, VOXEL_ID.PLANT_POT);
    buildStaircase(ops, 12, 2, 27, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(13, 7, 27, 13, 7, 30, VOXEL_ID.GLASS);

    fillBox(15, 6, 26, 17, 6, 28, VOXEL_ID.CARPET_BLUE);
    setFixed(17, 7, 26, VOXEL_ID.BED_HEAD);
    setFixed(16, 7, 26, VOXEL_ID.BED_FOOT);
    set(15, 7, 26, VOXEL_ID.GIFT_BOX);
    fillBox(14, 6, 32, 17, 6, 35, VOXEL_ID.TILE_FLOOR);
    setFixed(17, 7, 35, VOXEL_ID.TOILET);
    setFixed(16, 7, 35, VOXEL_ID.SINK_COUNTER);
    setFixed(14, 7, 35, VOXEL_ID.BATHTUB);

    addModernFlatRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL);
  }

  // (11) 2-Story White & Mint Courtyard Villa — Outer SE [26..37, 26..36]
  {
    const x0 = 26, x1 = 37, z0 = 26, z1 = 36;
    paveLawn(25, 25, 39, 39);
    rawOps.fillBox(30, 1, 25, 31, 1, 26, VOXEL_ID.SIDEWALK);

    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    buildStoryShell(ops, x0, 7, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, 30, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);

    for (const fy of [2, 7]) {
      addWindowSpan(ops, 28, fy, z1, 30, z1);
      addWindowSpan(ops, 33, fy, z1, 35, z1);
      addWindowSpan(ops, x0, fy, 28, x0, 30);
      addWindowSpan(ops, x0, fy, 32, x0, 34);
      addWindowSpan(ops, x1, fy, 28, x1, 30);
      addWindowSpan(ops, x1, fy, 32, x1, 34);
      if (fy > 2) {
        addWindowSpan(ops, 28, fy, z0, 29, z0);
        addWindowSpan(ops, 33, fy, z0, 35, z0);
      }
    }

    // F1: Kitchen + Living + Stair
    fillBox(27, 1, 32, 31, 1, 35, VOXEL_ID.TILE_FLOOR);
    setFixed(27, 2, 35, VOXEL_ID.FRIDGE);
    setFixed(27, 3, 35, VOXEL_ID.FRIDGE);
    setFixed(28, 2, 35, VOXEL_ID.STOVE);
    setFixed(29, 2, 35, VOXEL_ID.SINK_COUNTER);
    setFixed(30, 2, 35, VOXEL_ID.KITCHEN_COUNTER);
    setFixed(31, 2, 35, VOXEL_ID.CUPBOARD_WHITE);
    set(29, 2, 32, VOXEL_ID.TABLE_WHITE);
    set(29, 3, 32, VOXEL_ID.FLOWER_VASE);
    set(28, 2, 32, VOXEL_ID.CHAIR_MINT);

    fillBox(33, 1, 28, 35, 1, 30, VOXEL_ID.CARPET_BLUE);
    fillFixed(36, 2, 28, 36, 2, 30, VOXEL_ID.SOFA_MINT);
    setFixed(33, 2, 29, VOXEL_ID.TV_SCREEN);
    set(33, 2, 28, VOXEL_ID.BOOKSHELF);
    set(27, 2, 27, VOXEL_ID.PLANT_POT);

    buildStaircase(ops, 35, 2, 31, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);
    fillBox(34, 7, 31, 34, 7, 34, VOXEL_ID.GLASS);

    // F2: Bedroom + Full Bathroom
    fillBox(27, 6, 32, 30, 6, 35, VOXEL_ID.TILE_FLOOR);
    fillBox(31, 7, 32, 31, 10, 35, VOXEL_ID.WHITE_WALL);
    addPartition(ops, 27, 7, 32, 31, 32, VOXEL_ID.WHITE_WALL, 29, 1);
    setFixed(27, 7, 35, VOXEL_ID.BATHTUB);
    setFixed(28, 7, 35, VOXEL_ID.BATHTUB);
    setFixed(30, 7, 35, VOXEL_ID.TOILET);
    setFixed(27, 7, 33, VOXEL_ID.SINK_COUNTER);

    fillBox(27, 6, 27, 31, 6, 29, VOXEL_ID.CARPET_CORAL);
    setFixed(27, 7, 27, VOXEL_ID.BED_HEAD);
    setFixed(28, 7, 27, VOXEL_ID.BED_FOOT);
    set(30, 7, 27, VOXEL_ID.TABLE);
    set(30, 8, 27, VOXEL_ID.DESK_LAMP);
    set(29, 7, 27, VOXEL_ID.CHAIR_MINT);
    set(31, 7, 27, VOXEL_ID.BOOKSHELF);

    addCompletePitchedRoof(ops, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // =========================================================================
  // 3. SMALL 1-STORY MODERN HOUSES (8 Cozy, Fully Furnished Designs)
  // =========================================================================

  // (12) Small Coral & Cream Studio Cottage — NW Inner Corner [-19..-11, -19..-14]
  {
    const x0 = -19, x1 = -11, z0 = -19, z1 = -14;
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, -15, 2, z0, true, 1, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_CORAL_CLOSED);
    addWindowSpan(ops, -17, 2, z0, -17, z0);
    addWindowSpan(ops, -13, 2, z0, -13, z0);
    addWindowSpan(ops, -17, 2, z1, -15, z1);
    addWindowSpan(ops, x0, 2, -17, x0, -16);
    addWindowSpan(ops, x1, 2, -17, x1, -16);

    // Kitchenette + Bath + Bed + TV Lounge
    fillBox(-18, 1, -18, -16, 1, -17, VOXEL_ID.TILE_FLOOR);
    setFixed(-18, 2, -18, VOXEL_ID.FRIDGE);
    setFixed(-18, 3, -18, VOXEL_ID.FRIDGE);
    setFixed(-17, 2, -18, VOXEL_ID.STOVE);
    setFixed(-16, 2, -18, VOXEL_ID.SINK_COUNTER);

    fillBox(-14, 1, -18, -12, 1, -17, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, -14, 2, -18, -14, -17, VOXEL_ID.WHITE_WALL, -17, 1);
    setFixed(-12, 2, -18, VOXEL_ID.TOILET);
    setFixed(-13, 2, -18, VOXEL_ID.SINK_COUNTER);

    setFixed(-18, 2, -15, VOXEL_ID.BED_HEAD);
    setFixed(-17, 2, -15, VOXEL_ID.BED_FOOT);
    set(-16, 2, -15, VOXEL_ID.CUPBOARD_WHITE);
    set(-15, 2, -15, VOXEL_ID.CHAIR_PINK);
    setFixed(-13, 2, -15, VOXEL_ID.SOFA_CORAL);
    set(-12, 2, -16, VOXEL_ID.FLOWER_VASE);
    setFixed(-12, 2, -15, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, false);
  }

  // (13) Small Modern Mint & White Glass Studio House — SW Inner near Spawn [-12..-4, 4..9]
  {
    const x0 = -12, x1 = -4, z0 = 4, z1 = 9;
    paveLawn(-19, 4, -4, 9);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, x1, 2, 6, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);
    addWindowSpan(ops, -10, 2, z0, -6, z0);
    addWindowSpan(ops, -10, 2, z1, -6, z1);
    addWindowSpan(ops, x0, 2, 6, x0, 7);

    // Compact furnished modern studio (SW Inner House near Spawn)
    fillBox(-11, 1, 5, -9, 1, 6, VOXEL_ID.TILE_FLOOR);
    setFixed(-11, 2, 5, VOXEL_ID.FRIDGE);
    setFixed(-11, 3, 5, VOXEL_ID.FRIDGE);
    setFixed(-10, 2, 5, VOXEL_ID.STOVE);
    setFixed(-9, 2, 5, VOXEL_ID.SINK_COUNTER);

    fillBox(-7, 1, 5, -5, 1, 6, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, -7, 2, 5, -7, 6, VOXEL_ID.WHITE_WALL, 6, 1);
    setFixed(-5, 2, 5, VOXEL_ID.TOILET);
    setFixed(-6, 2, 5, VOXEL_ID.SINK_COUNTER);

    setFixed(-11, 2, 8, VOXEL_ID.BED_HEAD);
    setFixed(-10, 2, 8, VOXEL_ID.BED_FOOT);
    set(-9, 2, 8, VOXEL_ID.CUPBOARD_OAK);
    setFixed(-8, 2, 8, VOXEL_ID.SOFA_MINT);
    set(-6, 2, 8, VOXEL_ID.TABLE_WHITE);
    set(-6, 3, 8, VOXEL_ID.DESK_LAMP);
    set(-7, 2, 8, VOXEL_ID.CHAIR_MINT);
    set(-5, 2, 7, VOXEL_ID.PLANT_POT);
    setFixed(-5, 2, 8, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, false);
  }

  // (14) Small Cream & Brick Modern Bungalow — Outer N-Central-East [4..10, -34..-26]
  {
    const x0 = 4, x1 = 10, z0 = -34, z1 = -26;
    paveLawn(4, -38, 19, -25);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.BRICK, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, 7, 2, z1, true, 1, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindowSpan(ops, 5, 2, z1, 5, z1);
    addWindowSpan(ops, 9, 2, z1, 9, z1);
    addWindowSpan(ops, 6, 2, z0, 8, z0);
    addWindowSpan(ops, x0, 2, -31, x0, -29);
    addWindowSpan(ops, x1, 2, -31, x1, -29);

    fillBox(5, 1, -33, 7, 1, -31, VOXEL_ID.TILE_FLOOR);
    setFixed(5, 2, -33, VOXEL_ID.FRIDGE);
    setFixed(6, 2, -33, VOXEL_ID.STOVE);
    setFixed(7, 2, -33, VOXEL_ID.SINK_COUNTER);
    setFixed(9, 2, -33, VOXEL_ID.TOILET);
    setFixed(9, 2, -32, VOXEL_ID.SINK_COUNTER);
    setFixed(5, 2, -28, VOXEL_ID.BED_HEAD);
    setFixed(6, 2, -28, VOXEL_ID.BED_FOOT);
    set(5, 2, -27, VOXEL_ID.CUPBOARD_OAK);
    set(8, 2, -27, VOXEL_ID.CHAIR_OAK);
    set(8, 2, -28, VOXEL_ID.TABLE_WHITE);
    set(8, 3, -28, VOXEL_ID.DESK_LAMP);
    setFixed(9, 2, -27, VOXEL_ID.SOFA_CREAM);
    setFixed(9, 2, -29, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, true);
  }

  // (15) Small Sky-Blue Modern Cottage — Outer N-Central-East [12..19, -36..-27]
  {
    const x0 = 12, x1 = 19, z0 = -36, z1 = -27;
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, 15, 2, z1, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addWindowSpan(ops, 14, 2, z0, 17, z0);
    addWindowSpan(ops, x0, 2, -33, x0, -30);
    addWindowSpan(ops, x1, 2, -33, x1, -30);

    fillBox(13, 1, -35, 15, 1, -33, VOXEL_ID.TILE_FLOOR);
    setFixed(13, 2, -35, VOXEL_ID.FRIDGE);
    setFixed(14, 2, -35, VOXEL_ID.STOVE);
    setFixed(15, 2, -35, VOXEL_ID.SINK_COUNTER);
    fillBox(17, 1, -35, 18, 1, -33, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 17, 2, -35, 17, -33, VOXEL_ID.WHITE_WALL, -33, 1);
    setFixed(18, 2, -35, VOXEL_ID.TOILET);
    setFixed(18, 2, -34, VOXEL_ID.SINK_COUNTER);
    setFixed(13, 2, -29, VOXEL_ID.BED_HEAD);
    setFixed(14, 2, -29, VOXEL_ID.BED_FOOT);
    set(13, 2, -28, VOXEL_ID.CUPBOARD_SKY);
    set(14, 2, -28, VOXEL_ID.CHAIR_SKY);
    set(17, 2, -28, VOXEL_ID.PLANT_POT);
    setFixed(18, 2, -29, VOXEL_ID.SOFA);
    setFixed(18, 2, -30, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (16) Small Mint-Accent Starter House — Outer West-South [-34..-25, 5..11]
  {
    const x0 = -34, x1 = -25, z0 = 5, z1 = 11;
    paveLawn(-39, 4, -25, 19);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.MINT_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, x1, 2, 7, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);
    addWindowSpan(ops, -31, 2, z0, -28, z0);
    addWindowSpan(ops, -31, 2, z1, -28, z1);
    addWindowSpan(ops, x0, 2, 7, x0, 9);

    fillBox(-33, 1, 6, -31, 1, 7, VOXEL_ID.TILE_FLOOR);
    setFixed(-33, 2, 6, VOXEL_ID.FRIDGE);
    setFixed(-32, 2, 6, VOXEL_ID.STOVE);
    setFixed(-31, 2, 6, VOXEL_ID.SINK_COUNTER);
    setFixed(-27, 2, 10, VOXEL_ID.TOILET);
    setFixed(-26, 2, 10, VOXEL_ID.SINK_COUNTER);
    setFixed(-33, 2, 10, VOXEL_ID.BED_HEAD);
    setFixed(-32, 2, 10, VOXEL_ID.BED_FOOT);
    set(-31, 2, 10, VOXEL_ID.CUPBOARD_WHITE);
    set(-30, 2, 9, VOXEL_ID.CHAIR_MINT);
    set(-28, 2, 6, VOXEL_ID.TABLE_WHITE);
    set(-28, 3, 6, VOXEL_ID.FLOWER_VASE);
    setFixed(-29, 2, 10, VOXEL_ID.SOFA_MINT);
    setFixed(-29, 2, 6, VOXEL_ID.TV_SCREEN);

    addModernFlatRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.MINT_WALL);
  }

  // (17) Small Warm-Oak & White Cottage — Outer West-South [-38..-28, 13..19]
  {
    const x0 = -38, x1 = -28, z0 = 13, z1 = 19;
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, -34, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindowSpan(ops, -36, 2, z1, -30, z1);
    addWindowSpan(ops, x0, 2, 15, x0, 17);
    addWindowSpan(ops, x1, 2, 15, x1, 17);

    fillBox(-37, 1, 16, -35, 1, 18, VOXEL_ID.TILE_FLOOR);
    setFixed(-37, 2, 18, VOXEL_ID.FRIDGE);
    setFixed(-36, 2, 18, VOXEL_ID.STOVE);
    setFixed(-35, 2, 18, VOXEL_ID.SINK_COUNTER);
    setFixed(-30, 2, 18, VOXEL_ID.TOILET);
    setFixed(-29, 2, 18, VOXEL_ID.SINK_COUNTER);
    setFixed(-37, 2, 14, VOXEL_ID.BED_HEAD);
    setFixed(-36, 2, 14, VOXEL_ID.BED_FOOT);
    set(-35, 2, 14, VOXEL_ID.CUPBOARD_OAK);
    set(-32, 2, 17, VOXEL_ID.TABLE);
    set(-32, 3, 17, VOXEL_ID.DESK_LAMP);
    set(-31, 2, 17, VOXEL_ID.CHAIR_OAK);
    set(-29, 2, 17, VOXEL_ID.PLANT_POT);
    setFixed(-30, 2, 14, VOXEL_ID.SOFA_CREAM);
    setFixed(-29, 2, 15, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.WHITE_WALL, false);
    buildHealthyTree(rawOps, -26, 17, 4);
  }

  // (18) Small Oak & Sky-Blue Family Bungalow — Outer S-Central-West [-16..-6, 26..35]
  {
    const x0 = -16, x1 = -6, z0 = 26, z1 = 35;
    paveLawn(-19, 25, -4, 39);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, -12, 2, z0, true, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addWindowSpan(ops, -14, 2, z1, -8, z1);
    addWindowSpan(ops, x0, 2, 29, x0, 32);
    addWindowSpan(ops, x1, 2, 29, x1, 32);

    fillBox(-15, 1, 31, -12, 1, 34, VOXEL_ID.TILE_FLOOR);
    setFixed(-15, 2, 34, VOXEL_ID.FRIDGE);
    setFixed(-15, 3, 34, VOXEL_ID.FRIDGE);
    setFixed(-14, 2, 34, VOXEL_ID.STOVE);
    setFixed(-13, 2, 34, VOXEL_ID.SINK_COUNTER);
    setFixed(-12, 2, 34, VOXEL_ID.KITCHEN_COUNTER);

    fillBox(-9, 1, 32, -7, 1, 34, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, -9, 2, 32, -9, 34, VOXEL_ID.WHITE_WALL, 32, 1);
    setFixed(-7, 2, 34, VOXEL_ID.TOILET);
    setFixed(-8, 2, 34, VOXEL_ID.SINK_COUNTER);

    fillBox(-15, 1, 28, -13, 1, 30, VOXEL_ID.CARPET_BLUE);
    setFixed(-15, 2, 27, VOXEL_ID.BED_HEAD);
    setFixed(-14, 2, 27, VOXEL_ID.BED_FOOT);
    set(-13, 2, 27, VOXEL_ID.CUPBOARD_SKY);
    setFixed(-7, 2, 28, VOXEL_ID.SOFA);
    set(-9, 2, 28, VOXEL_ID.TABLE_GLASS);
    set(-9, 3, 28, VOXEL_ID.FLOWER_VASE);
    set(-8, 2, 28, VOXEL_ID.CHAIR_SKY);
    set(-7, 2, 27, VOXEL_ID.GIFT_BOX);
    setFixed(-9, 2, 27, VOXEL_ID.TV_SCREEN);

    addCompletePitchedRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (19) Small Coral & Slate Modern House — Outer East-South [26..36, 8..16]
  {
    const x0 = 26, x1 = 36, z0 = 8, z1 = 16;
    paveLawn(25, 4, 39, 19);
    buildStoryShell(ops, x0, 2, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addExteriorDoor(ops, x0, 2, 11, false, 2, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_CORAL_CLOSED);
    addWindowSpan(ops, 28, 2, z0, 34, z0);
    addWindowSpan(ops, 28, 2, z1, 34, z1);
    addWindowSpan(ops, x1, 2, 10, x1, 14);

    fillBox(27, 1, 13, 30, 1, 15, VOXEL_ID.TILE_FLOOR);
    setFixed(27, 2, 15, VOXEL_ID.FRIDGE);
    setFixed(28, 2, 15, VOXEL_ID.STOVE);
    setFixed(29, 2, 15, VOXEL_ID.SINK_COUNTER);
    setFixed(30, 2, 15, VOXEL_ID.KITCHEN_COUNTER);

    fillBox(33, 1, 13, 35, 1, 15, VOXEL_ID.TILE_FLOOR);
    addPartition(ops, 33, 2, 13, 33, 15, VOXEL_ID.WHITE_WALL, 13, 1);
    setFixed(35, 2, 15, VOXEL_ID.TOILET);
    setFixed(34, 2, 15, VOXEL_ID.SINK_COUNTER);

    setFixed(27, 2, 9, VOXEL_ID.BED_HEAD);
    setFixed(28, 2, 9, VOXEL_ID.BED_FOOT);
    set(29, 2, 9, VOXEL_ID.CUPBOARD_WHITE);
    set(30, 2, 9, VOXEL_ID.TABLE_WHITE);
    set(30, 3, 9, VOXEL_ID.PLUSH_DECOR);
    set(31, 2, 9, VOXEL_ID.CHAIR_PINK);
    setFixed(34, 2, 9, VOXEL_ID.SOFA_CORAL);
    set(35, 2, 9, VOXEL_ID.PLANT_POT);
    setFixed(32, 2, 9, VOXEL_ID.TV_SCREEN);

    addModernFlatRoof(ops, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL);
  }

  // =========================================================================
  // 4. CLEAN MODERN PARK PLAZA & FOUNTAIN — SE Inner [4..11, 4..11]
  // =========================================================================
  {
    // Clean tiled square plaza next to spawn (0, 2, 4)
    rawOps.fillBox(4, 1, 4, 11, 1, 11, VOXEL_ID.TILE_FLOOR);
    // Clean white & sky-blue fountain basin centered at (8, 2, 8)
    for (let z = 6; z <= 10; z++) {
      for (let x = 6; x <= 10; x++) {
        const onEdge = x === 6 || x === 10 || z === 6 || z === 10;
        if (onEdge) {
          setFixed(x, 2, z, VOXEL_ID.WHITE_WALL);
        } else {
          setFixed(x, 1, z, VOXEL_ID.SKY_WALL);
        }
      }
    }
    setFixed(8, 2, 8, VOXEL_ID.WHITE_WALL);
    setFixed(8, 3, 8, VOXEL_ID.SKY_WALL);
    setFixed(8, 4, 8, VOXEL_ID.GLASS);

    // Park benches (fixed plaza seating) & lush green plaza trees
    setFixed(4, 2, 5, VOXEL_ID.SOFA_CREAM);
    setFixed(4, 2, 10, VOXEL_ID.SOFA_MINT);
    rawOps.set(5, 2, 5, VOXEL_ID.PLANT_POT);
    rawOps.set(5, 2, 10, VOXEL_ID.PLANT_POT);
    buildHealthyTree(rawOps, 7, 16, 4);
    buildHealthyTree(rawOps, 16, 7, 4);
  }

  // Lush green neighborhood park trees on verified open lawn areas (clear of houses & sidewalks)
  buildHealthyTree(rawOps, -35, -35, 5);
  buildHealthyTree(rawOps, -28, -33, 4);
  buildHealthyTree(rawOps, -33, -28, 4);
  buildHealthyTree(rawOps, 31, 5, 4);
  buildHealthyTree(rawOps, -16, 6, 4);
  buildHealthyTree(rawOps, -16, -6, 4);
  buildHealthyTree(rawOps, 16, 38, 4);
  buildHealthyTree(rawOps, -8, 37, 4);
}
