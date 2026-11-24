import { buildHealthyTree, createProtectedVoxelOps, VoxelWriteOps } from './modernHouses';
import { VOXEL_ID, VoxelId } from './types';

function addStoryShell(
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
  if (x1 - x0 >= 2 && z1 - z0 >= 2) {
    fillBox(x0 + 1, baseY, z0 + 1, x1 - 1, baseY + 3, z1 - 1, VOXEL_ID.AIR);
  }
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
  if (x1 - x0 >= 4 && z1 - z0 >= 4) {
    const midX = Math.floor((x0 + x1) / 2);
    const midZ = Math.floor((z0 + z1) / 2);
    set(midX, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
  }
}

function addEntranceDoor(
  ops: VoxelWriteOps,
  x: number,
  baseY: number,
  z: number,
  wallAlongX: boolean,
  trimId: VoxelId,
  doorId: VoxelId,
): void {
  const { set } = ops;
  if (wallAlongX) {
    for (let dy = 0; dy <= 3; dy++) {
      set(x - 1, baseY + dy, z, trimId);
      set(x + 2, baseY + dy, z, trimId);
    }
    set(x, baseY, z, doorId);
    set(x, baseY + 1, z, doorId);
    set(x + 1, baseY, z, doorId);
    set(x + 1, baseY + 1, z, doorId);
    set(x, baseY + 2, z, trimId);
    set(x + 1, baseY + 2, z, trimId);
    set(x, baseY + 3, z, trimId);
    set(x + 1, baseY + 3, z, trimId);
  } else {
    for (let dy = 0; dy <= 3; dy++) {
      set(x, baseY + dy, z - 1, trimId);
      set(x, baseY + dy, z + 2, trimId);
    }
    set(x, baseY, z, doorId);
    set(x, baseY + 1, z, doorId);
    set(x, baseY, z + 1, doorId);
    set(x, baseY + 1, z + 1, doorId);
    set(x, baseY + 2, z, trimId);
    set(x, baseY + 2, z + 1, trimId);
    set(x, baseY + 3, z, trimId);
    set(x, baseY + 3, z + 1, trimId);
  }
}

function addWindows(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  ops.fillBox(x0, baseY + 1, z0, x1, baseY + 2, z1, VOXEL_ID.GLASS);
}

function addStairs(
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
    fillBox(sx, baseY, sz, xEnd, baseY + 8, zEnd, VOXEL_ID.AIR);
    const minStepY = s === 0 ? baseY : baseY + s - 1;
    fillBox(sx, minStepY, sz, xEnd, baseY + s, zEnd, stepId);
  }
}

function addRoomPartition(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
  wallId: VoxelId,
  doorPos: number,
  doorId: VoxelId = VOXEL_ID.DOOR_WHITE_CLOSED,
): void {
  const { set, fillBox } = ops;
  fillBox(x0, baseY, z0, x1, baseY + 3, z1, wallId);
  if (x0 === x1) {
    set(x0, baseY, doorPos, doorId);
    set(x0, baseY + 1, doorPos, doorId);
    set(x0, baseY + 2, doorPos, VOXEL_ID.CHARCOAL_TRIM);
  } else {
    set(doorPos, baseY, z0, doorId);
    set(doorPos, baseY + 1, z0, doorId);
    set(doorPos, baseY + 2, z0, VOXEL_ID.CHARCOAL_TRIM);
  }
}

function addGableRoof(
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
          set(x, y, z, isEdge || step === layers - 1 || !isEnd ? roofId : gableId);
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
          set(x, y, z, isEdge || step === layers - 1 || !isEnd ? roofId : gableId);
        }
      }
    }
  }
}

function addParapetRoof(
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
 * Builds varied Minecraft-inspired woodland trees (Oak, Fancy Branching Oak, Birch,
 * Tall Conical Pine/Spruce, Dark Oak, and multi-block Woodland Shrubs) cleanly above
 * ground (walkable 3-block clearance beneath full canopies) and completely breakable.
 */
function addMinecraftTreeVariant(
  ops: VoxelWriteOps,
  gx: number,
  gz: number,
  variant: number,
  hash: number,
): void {
  const { set } = ops;
  const species = variant % 6;

  if (species === 0) {
    // 1. Classic Minecraft Oak Tree (chunky rounded crown)
    const trunkH = 4 + (hash % 2); // 4..5
    for (let y = 2; y < 2 + trunkH; y++) {
      set(gx, y, gz, VOXEL_ID.LOG);
    }
    const base = 2 + trunkH - 1;
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && ((hash + dx + dz + dy) & 1) === 0) {
            continue;
          }
          if (dy === 0 && dx === 0 && dz === 0) continue;
          set(gx + dx, base + dy, gz + dz, VOXEL_ID.LEAVES);
        }
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
        set(gx + dx, base + 2, gz + dz, VOXEL_ID.LEAVES);
      }
    }
    set(gx, base + 3, gz, VOXEL_ID.LEAVES);
  } else if (species === 1) {
    // 2. Birch Tree (tall white-bark trunk + airy lime-green birch foliage)
    const trunkH = 5 + (hash % 2); // 5..6
    for (let y = 2; y < 2 + trunkH; y++) {
      set(gx, y, gz, VOXEL_ID.BIRCH_LOG);
    }
    const base = 2 + trunkH - 2;
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dx === 0 && dz === 0 && dy === 0) continue;
          set(gx + dx, base + dy, gz + dz, VOXEL_ID.BIRCH_LEAVES);
        }
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) {
          set(gx, base + 2, gz, VOXEL_ID.BIRCH_LEAVES);
          set(gx, base + 3, gz, VOXEL_ID.BIRCH_LEAVES);
        } else if (Math.abs(dx) + Math.abs(dz) === 1) {
          set(gx + dx, base + 2, gz + dz, VOXEL_ID.BIRCH_LEAVES);
          set(gx + dx, base + 3, gz + dz, VOXEL_ID.BIRCH_LEAVES);
        }
      }
    }
    set(gx, base + 4, gz, VOXEL_ID.BIRCH_LEAVES);
  } else if (species === 2) {
    // 3. Tall Conical Pine / Spruce Tree (dark spruce trunk + tiered needle whorls)
    const trunkH = 6 + (hash % 3); // 6..8
    for (let y = 2; y < 2 + trunkH; y++) {
      set(gx, y, gz, VOXEL_ID.PINE_LOG);
    }
    const startY = 4;
    const topY = 2 + trunkH;
    for (let y = startY; y <= topY + 2; y++) {
      const distFromTop = topY + 2 - y;
      const tier = (y - startY) % 2 === 0 ? 2 : 1;
      const radius =
        distFromTop <= 1 ? 0 : distFromTop === 2 ? 1 : tier === 2 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          if (dx === 0 && dz === 0 && y < topY) continue;
          set(gx + dx, y, gz + dz, VOXEL_ID.PINE_LEAVES);
        }
      }
    }
  } else if (species === 3) {
    // 4. Tall Branching Fancy Oak (split oak boughs + wide asymmetric layered crown)
    const trunkH = 6 + (hash % 2); // 6..7
    for (let y = 2; y < 2 + trunkH; y++) {
      set(gx, y, gz, VOXEL_ID.LOG);
    }
    const b1x = (hash & 1) === 0 ? 1 : -1;
    const b1z = (hash & 2) === 0 ? 1 : -1;
    set(gx + b1x, 2 + trunkH - 3, gz, VOXEL_ID.LOG);
    set(gx + b1x * 2, 2 + trunkH - 2, gz, VOXEL_ID.LOG);
    set(gx, 2 + trunkH - 2, gz + b1z, VOXEL_ID.LOG);

    const crownY = 2 + trunkH - 2;
    for (let dy = 0; dy <= 2; dy++) {
      const r = dy === 1 ? 3 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist > r + 1) continue;
          if (dx === 0 && dz === 0 && dy === 0) continue;
          set(gx + dx, crownY + dy, gz + dz, VOXEL_ID.LEAVES);
        }
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 1) {
          set(gx + dx, crownY + 3, gz + dz, VOXEL_ID.LEAVES);
        }
      }
    }
  } else if (species === 4) {
    // 5. Dark Oak Tree (stout spruce-wood trunk + broad dense deep-emerald canopy)
    const trunkH = 4 + (hash % 2);
    for (let y = 2; y < 2 + trunkH; y++) {
      set(gx, y, gz, VOXEL_ID.PINE_LOG);
    }
    const base = 2 + trunkH - 1;
    for (let dy = 0; dy <= 1; dy++) {
      const r = dy === 0 ? 2 : 3;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue;
          if (Math.abs(dx) === 3 && Math.abs(dz) === 2) continue;
          if (Math.abs(dz) === 3 && Math.abs(dx) === 2) continue;
          if (dy === 0 && dx === 0 && dz === 0) continue;
          set(gx + dx, base + dy, gz + dz, VOXEL_ID.DARK_LEAVES);
        }
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        set(gx + dx, base + 2, gz + dz, VOXEL_ID.DARK_LEAVES);
      }
    }
  } else {
    // 6. Woodland Understory Bush / Sapling (low leafy thicket filling mid-canopy)
    const leafId = (hash & 1) === 0 ? VOXEL_ID.LEAVES : VOXEL_ID.DARK_LEAVES;
    const logId = (hash & 1) === 0 ? VOXEL_ID.LOG : VOXEL_ID.BIRCH_LOG;
    set(gx, 2, gz, logId);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && (hash & 2) === 0) continue;
        if (dx !== 0 || dz !== 0) set(gx + dx, 2, gz + dz, leafId);
        set(gx + dx, 3, gz + dz, leafId);
      }
    }
    set(gx, 4, gz, leafId);
  }
}

void buildHealthyTree;

function addRoadStripEW(
  ops: VoxelWriteOps,
  zStart: number,
  x0: number,
  x1: number,
): void {
  const { set } = ops;
  // 5-wide boulevard: sidewalks at zStart & zStart+4, road lanes zStart+1..zStart+3
  for (let x = x0; x <= x1; x++) {
    const onNSMain = x >= -2 && x <= 2;
    const onNSWest = x >= -93 && x <= -91;
    const onNSEast = x >= 106 && x <= 108;
    const onNSWestConn = x >= -47 && x <= -45;
    const onNSEastConn = x >= 45 && x <= 47;
    const onRoadNS = onNSMain || onNSWest || onNSEast || onNSWestConn || onNSEastConn;
    const onSidewalkNS =
      x === -3 ||
      x === 3 ||
      x === -94 ||
      x === -90 ||
      x === 105 ||
      x === 109 ||
      x === -48 ||
      x === -44 ||
      x === 44 ||
      x === 48;

    for (let dz = 0; dz < 5; dz++) {
      const z = zStart + dz;
      const isSw = dz === 0 || dz === 4;
      if (onRoadNS && !isSw) {
        set(x, 1, z, VOXEL_ID.ASPHALT);
      } else if (onRoadNS && isSw) {
        set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
      } else if (onSidewalkNS && !isSw) {
        set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
      } else if (isSw) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (dz === 1) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      } else if (dz === 3) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      }
    }
  }
}

function addRoadStripNS(
  ops: VoxelWriteOps,
  xStart: number,
  z0: number,
  z1: number,
): void {
  const { set } = ops;
  // 5-wide boulevard: sidewalks at xStart & xStart+4, lanes xStart+1..xStart+3
  for (let z = z0; z <= z1; z++) {
    const onEWMain = z >= -2 && z <= 2;
    const onUpperNorth = z >= -93 && z <= -91;
    const onNorthOuter = z >= -141 && z <= -139;
    const onNorthConn = z >= -51 && z <= -49;
    const onSouthConn = z >= 46 && z <= 48;
    const onRoadEW = onEWMain || onUpperNorth || onNorthOuter || onNorthConn || onSouthConn;
    const onSidewalkEW =
      z === -3 ||
      z === 3 ||
      z === -94 ||
      z === -90 ||
      z === -142 ||
      z === -138 ||
      z === -52 ||
      z === -48 ||
      z === 45 ||
      z === 49;

    for (let dx = 0; dx < 5; dx++) {
      const x = xStart + dx;
      const isSw = dx === 0 || dx === 4;
      if (onRoadEW && !isSw) {
        set(x, 1, z, VOXEL_ID.ASPHALT);
      } else if (onRoadEW && isSw) {
        set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
      } else if (onSidewalkEW && !isSw) {
        set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
      } else if (isSw) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (dx === 1) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      } else if (dx === 3) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE);
      }
    }
  }
}

function buildExpandedNetworkRoads(ops: VoxelWriteOps): void {
  const { set } = ops;

  // Extend North Avenue northward (-142..-77) to Outer North Woodland Blvd
  for (let z = -142; z <= -77; z++) {
    const inCross = z >= -141 && z <= -139;
    for (let x = -3; x <= 3; x++) {
      if (inCross && Math.abs(x) <= 2) set(x, 1, z, VOXEL_ID.ASPHALT);
      else if (x === -3 || x === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (x === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE);
      else if (x === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      else if (x === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // Extend West Avenue westward (-166..-69) toward Crown Hill Observatory
  for (let x = -166; x <= -69; x++) {
    for (let z = -3; z <= 3; z++) {
      if (z === -3 || z === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (z === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      else if (z === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      else if (z === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // Extend Central Mall Road Eastward through outer residential belt (109..148)
  for (let x = 109; x <= 148; x++) {
    const inCross = x >= 145 && x <= 147;
    for (let z = -3; z <= 3; z++) {
      if (inCross && Math.abs(z) <= 2) set(x, 1, z, VOXEL_ID.ASPHALT);
      else if (z === -3 || z === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (z === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      else if (z === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      else if (z === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // Extend North Connector Eastward (65..148) & South Connector Eastward (50..148)
  addRoadStripEW(ops, -52, 65, 148);
  addRoadStripEW(ops, 45, 50, 148);

  // Outer East Street (x = 105..109, z = -94..49) behind Shopping Mall
  addRoadStripNS(ops, 105, -94, 49);

  // Outer West Street (x = -94..-90, z = -94..49)
  addRoadStripNS(ops, -94, -94, 49);

  // Upper North Boulevard (z = -94..-90, x = -94..148)
  addRoadStripEW(ops, -94, -94, 148);

  // Outer North Woodland Blvd (z = -142..-138, x = -146..148) & Outer East Promenade Blvd (x = 144..148, z = -142..49)
  addRoadStripEW(ops, -142, -146, 148);
  addRoadStripNS(ops, 144, -142, 49);
}

/**
 * Builds the expanded city roads, several new protected houses & small city buildings
 * with enclosed furnished rooms, and lush surrounding forests on the North, West,
 * and East sides while leaving the South Beach side completely untouched.
 */
export function buildExpandedDistrictAndForests(ops: VoxelWriteOps): void {
  const pOps = createProtectedVoxelOps(ops);

  // 1. Expand road & sidewalk network cleanly on North, West, and East sides
  buildExpandedNetworkRoads(ops);

  // =========================================================================
  // 2. EXPANDED NORTH DISTRICT HOUSES & SMALL CITY BUILDINGS (z in [-108..-96])
  // =========================================================================

  // (N1) Maple Oak Cottage [-34..-22, -106..-96] — 1-Story Cozy Home
  {
    const x0 = -34, x1 = -22, z0 = -106, z1 = -96;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(-29, 1, z1 + 1, -28, 1, -95, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.PLANKS, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, -29, 2, z1, true, VOXEL_ID.PLANKS, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindows(pOps, -32, 2, z1, -31, z1);
    addWindows(pOps, -26, 2, z1, -24, z1);
    addWindows(pOps, -32, 2, z0, -24, z0);
    addWindows(pOps, x0, 2, -103, x0, -99);
    addWindows(pOps, x1, 2, -103, x1, -99);

    // Kitchenette (NE)
    pOps.fillBox(-26, 1, -105, -23, 1, -102, VOXEL_ID.TILE_FLOOR);
    pOps.set(-23, 2, -105, VOXEL_ID.FRIDGE);
    pOps.set(-23, 3, -105, VOXEL_ID.FRIDGE);
    pOps.set(-24, 2, -105, VOXEL_ID.STOVE);
    pOps.set(-25, 2, -105, VOXEL_ID.SINK_COUNTER);
    pOps.set(-26, 2, -105, VOXEL_ID.KITCHEN_COUNTER);
    pOps.set(-24, 2, -101, VOXEL_ID.TABLE);
    pOps.set(-25, 2, -101, VOXEL_ID.CHAIR_OAK);
    pOps.set(-23, 2, -101, VOXEL_ID.CHAIR_MINT);

    // Enclosed Bedroom (NW)
    addRoomPartition(pOps, -29, 2, -105, -29, -101, VOXEL_ID.CREAM_WALL, -101, VOXEL_ID.DOOR_WHITE_CLOSED);
    pOps.fillBox(-33, 1, -105, -30, 1, -102, VOXEL_ID.CARPET_CORAL);
    pOps.set(-33, 2, -105, VOXEL_ID.BED_HEAD);
    pOps.set(-32, 2, -105, VOXEL_ID.BED_FOOT);
    pOps.set(-30, 2, -105, VOXEL_ID.CUPBOARD_OAK);
    pOps.set(-33, 2, -103, VOXEL_ID.DESK_LAMP);

    // Bathroom (SW)
    pOps.fillBox(-33, 1, -99, -31, 1, -97, VOXEL_ID.TILE_FLOOR);
    addRoomPartition(pOps, -30, 2, -99, -30, -97, VOXEL_ID.WHITE_WALL, -98, VOXEL_ID.DOOR_WHITE_CLOSED);
    pOps.set(-33, 2, -97, VOXEL_ID.TOILET);
    pOps.set(-32, 2, -97, VOXEL_ID.SINK_COUNTER);

    // Living corner (SE)
    pOps.set(-24, 2, -98, VOXEL_ID.SOFA_CORAL);
    pOps.set(-25, 2, -98, VOXEL_ID.SOFA_CORAL);
    pOps.set(-24, 2, -97, VOXEL_ID.PLANT_POT);
    pOps.set(-26, 2, -98, VOXEL_ID.TABLE_GLASS);

    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, false);
  }

  // (N2) Lavender & Sky 2-Story Residence [-18..-5, -108..-96]
  {
    const x0 = -18, x1 = -5, z0 = -108, z1 = -96;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(-12, 1, z1 + 1, -11, 1, -95, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addStoryShell(pOps, x0, 7, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, -12, 2, z1, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    for (const fy of [2, 7]) {
      addWindows(pOps, -16, fy, z1, -14, z1);
      addWindows(pOps, -9, fy, z1, -7, z1);
      addWindows(pOps, -15, fy, z0, -8, z0);
      addWindows(pOps, x0, fy, -105, x0, -99);
      addWindows(pOps, x1, fy, -105, x1, -99);
    }

    // Stairs along east wall
    addStairs(pOps, -7, 2, -105, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);

    // 1F Kitchen & Living Room
    pOps.fillBox(-17, 1, -107, -13, 1, -103, VOXEL_ID.TILE_FLOOR);
    pOps.set(-17, 2, -107, VOXEL_ID.FRIDGE);
    pOps.set(-17, 3, -107, VOXEL_ID.FRIDGE);
    pOps.set(-16, 2, -107, VOXEL_ID.STOVE);
    pOps.set(-15, 2, -107, VOXEL_ID.SINK_COUNTER);
    pOps.set(-14, 2, -107, VOXEL_ID.CUPBOARD_WHITE);
    pOps.set(-15, 2, -103, VOXEL_ID.TABLE_WHITE);
    pOps.set(-14, 2, -103, VOXEL_ID.CHAIR_SKY);
    pOps.fillBox(-12, 1, -101, -9, 1, -98, VOXEL_ID.CARPET_BLUE);
    pOps.set(-11, 2, -100, VOXEL_ID.SOFA_CREAM);
    pOps.set(-10, 2, -100, VOXEL_ID.SOFA_CREAM);
    pOps.set(-11, 2, -98, VOXEL_ID.TV_SCREEN);

    // 2F Bedrooms & Desk
    pOps.fillBox(-17, 6, -107, -14, 6, -104, VOXEL_ID.CARPET_CORAL);
    pOps.set(-17, 7, -107, VOXEL_ID.BED_CORAL);
    pOps.set(-16, 7, -107, VOXEL_ID.DESK_LAMP);
    pOps.set(-14, 7, -107, VOXEL_ID.CUPBOARD_SKY);
    pOps.set(-17, 7, -98, VOXEL_ID.TABLE_WHITE);
    pOps.set(-16, 7, -98, VOXEL_ID.CHAIR_PINK);
    pOps.set(-12, 7, -107, VOXEL_ID.BED_MINT);

    addGableRoof(pOps, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (C1) Community Bakery & Pastry Shop [6..19, -106..-96] — Small City Building
  {
    const x0 = 6, x1 = 19, z0 = -106, z1 = -96;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CORAL_WALL, VOXEL_ID.TILE_FLOOR, VOXEL_ID.WHITE_WALL);
    addParapetRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.CORAL_WALL);
    pOps.fillBox(9, 5, -95, 16, 5, -95, VOXEL_ID.CORAL_WALL); // Awning
    addEntranceDoor(pOps, 12, 2, z1, true, VOXEL_ID.CORAL_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    addWindows(pOps, 8, 2, z1, 10, z1);
    addWindows(pOps, 15, 2, z1, 17, z1);
    addWindows(pOps, x0, 2, -103, x0, -99);

    pOps.fillBox(8, 2, -103, 17, 2, -103, VOXEL_ID.KITCHEN_COUNTER);
    pOps.set(11, 2, -105, VOXEL_ID.STOVE);
    pOps.set(13, 2, -105, VOXEL_ID.STOVE);
    pOps.set(17, 2, -105, VOXEL_ID.FRIDGE);
    pOps.set(17, 3, -105, VOXEL_ID.FRIDGE);
    pOps.set(8, 2, -99, VOXEL_ID.TABLE_WHITE);
    pOps.set(8, 3, -99, VOXEL_ID.FLOWER_VASE);
    pOps.set(9, 2, -99, VOXEL_ID.CHAIR_PINK);
    pOps.set(16, 2, -99, VOXEL_ID.TABLE_WHITE);
    pOps.set(15, 2, -99, VOXEL_ID.CHAIR_MINT);
  }

  // (C2) Neighborhood Vet & Pet Clinic [24..38, -106..-96] — Small City Building
  {
    const x0 = 24, x1 = 38, z0 = -106, z1 = -96;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.MINT_WALL, VOXEL_ID.TILE_FLOOR, VOXEL_ID.WHITE_WALL);
    addParapetRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, 30, 2, z1, true, VOXEL_ID.MINT_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    addWindows(pOps, 26, 2, z1, 28, z1);
    addWindows(pOps, 34, 2, z1, 36, z1);

    pOps.fillBox(28, 2, -101, 33, 2, -101, VOXEL_ID.SINK_COUNTER);
    pOps.set(30, 3, -101, VOXEL_ID.DESK_LAMP);
    pOps.set(26, 2, -98, VOXEL_ID.SOFA_MINT);
    pOps.set(27, 2, -98, VOXEL_ID.SOFA_MINT);
    addRoomPartition(pOps, 33, 2, -105, 33, -102, VOXEL_ID.WHITE_WALL, -102, VOXEL_ID.DOOR_MINT_CLOSED);
    pOps.set(36, 2, -105, VOXEL_ID.BED_MINT);
    pOps.set(35, 2, -105, VOXEL_ID.CUPBOARD_WHITE);
    pOps.set(36, 2, -98, VOXEL_ID.PLUSH_DECOR);
  }

  // (N3) Pinecrest Woodland 2-Story Villa [44..58, -107..-96]
  {
    const x0 = 44, x1 = 58, z0 = -107, z1 = -96;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(50, 1, z1 + 1, 51, 1, -95, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.PLANKS, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.CREAM_WALL);
    addStoryShell(pOps, x0, 7, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, 50, 2, z1, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WOOD_CLOSED);
    for (const fy of [2, 7]) {
      addWindows(pOps, 46, fy, z1, 48, z1);
      addWindows(pOps, 53, fy, z1, 56, z1);
      addWindows(pOps, 47, fy, z0, 55, z0);
      addWindows(pOps, x1, fy, -104, x1, -99);
    }

    addStairs(pOps, 56, 2, -104, 0, 1, 1, 1, VOXEL_ID.OAK_FLOOR);
    pOps.fillBox(45, 1, -106, 49, 1, -103, VOXEL_ID.TILE_FLOOR);
    pOps.set(45, 2, -106, VOXEL_ID.FRIDGE);
    pOps.set(46, 2, -106, VOXEL_ID.STOVE);
    pOps.set(47, 2, -106, VOXEL_ID.SINK_COUNTER);
    pOps.set(49, 2, -103, VOXEL_ID.TABLE);
    pOps.set(49, 2, -102, VOXEL_ID.CHAIR_OAK);
    pOps.set(46, 2, -98, VOXEL_ID.SOFA);
    pOps.set(47, 2, -98, VOXEL_ID.SOFA);
    // 2F Master Bedroom
    pOps.fillBox(45, 6, -106, 49, 6, -102, VOXEL_ID.CARPET_BLUE);
    pOps.set(45, 7, -106, VOXEL_ID.BED_HEAD);
    pOps.set(46, 7, -106, VOXEL_ID.BED_FOOT);
    pOps.set(48, 7, -106, VOXEL_ID.CUPBOARD_OAK);
    pOps.set(50, 7, -98, VOXEL_ID.SOFA_CREAM);

    addGableRoof(pOps, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.PLANKS, false);
  }

  // =========================================================================
  // 3. EXPANDED WEST DISTRICT HOUSES & BUILDINGS (x in [-110..-72])
  // =========================================================================

  // (W1) Sunset Mint 2-Story Villa [-110..-97, -40..-26]
  {
    const x0 = -110, x1 = -97, z0 = -40, z1 = -26;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(x1 + 1, 1, -34, -95, 1, -33, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addStoryShell(pOps, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.MINT_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, x1, 2, -34, false, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    for (const fy of [2, 7]) {
      addWindows(pOps, x1, fy, -38, x1, -36);
      addWindows(pOps, x1, fy, -30, x1, -28);
      addWindows(pOps, x0, fy, -37, x0, -29);
      addWindows(pOps, -107, fy, z0, -100, z0);
      addWindows(pOps, -107, fy, z1, -100, z1);
    }

    addStairs(pOps, -107, 2, -28, 1, 0, 1, 1, VOXEL_ID.OAK_FLOOR);
    pOps.fillBox(-109, 1, -39, -105, 1, -35, VOXEL_ID.TILE_FLOOR);
    pOps.set(-109, 2, -39, VOXEL_ID.FRIDGE);
    pOps.set(-108, 2, -39, VOXEL_ID.STOVE);
    pOps.set(-107, 2, -39, VOXEL_ID.SINK_COUNTER);
    pOps.set(-102, 2, -37, VOXEL_ID.SOFA_MINT);
    pOps.set(-101, 2, -37, VOXEL_ID.SOFA_MINT);
    pOps.set(-101, 2, -39, VOXEL_ID.TV_SCREEN);
    // 2F Bedroom & Bath
    pOps.fillBox(-109, 6, -39, -104, 6, -35, VOXEL_ID.CARPET_BLUE);
    pOps.set(-109, 7, -39, VOXEL_ID.BED_HEAD);
    pOps.set(-108, 7, -39, VOXEL_ID.BED_FOOT);
    pOps.set(-105, 7, -39, VOXEL_ID.CUPBOARD_WHITE);
    addRoomPartition(pOps, -101, 7, -39, -101, -36, VOXEL_ID.WHITE_WALL, -36, VOXEL_ID.DOOR_MINT_CLOSED);
    pOps.set(-98, 7, -39, VOXEL_ID.TOILET);
    pOps.set(-99, 7, -39, VOXEL_ID.SINK_COUNTER);

    addParapetRoof(pOps, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.MINT_WALL);
  }

  // (C3) Art & Music Studio [-109..-97, -18..-5] — Small City Building
  {
    const x0 = -109, x1 = -97, z0 = -18, z1 = -5;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.SKY_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addParapetRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.CORAL_WALL);
    addEntranceDoor(pOps, x1, 2, -12, false, VOXEL_ID.SKY_WALL, VOXEL_ID.DOOR_SKY_CLOSED);
    addWindows(pOps, x1, 2, -16, x1, -14);
    addWindows(pOps, x1, 2, -9, x1, -7);
    addWindows(pOps, -106, 2, z1, -100, z1);

    pOps.fillBox(-107, 2, -16, -104, 3, -16, VOXEL_ID.BOOKSHELF);
    pOps.set(-107, 3, -11, VOXEL_ID.TV_SCREEN);
    pOps.set(-104, 2, -11, VOXEL_ID.SOFA_CREAM);
    pOps.set(-103, 2, -11, VOXEL_ID.SOFA_CREAM);
    pOps.set(-106, 2, -7, VOXEL_ID.TABLE_WHITE);
    pOps.set(-106, 3, -7, VOXEL_ID.DESK_LAMP);
    pOps.set(-105, 2, -7, VOXEL_ID.CHAIR_PINK);
  }

  // (W2) Garden Oak Bungalow [-109..-97, 6..18] — 1-Story Home
  {
    const x0 = -109, x1 = -97, z0 = 6, z1 = 18;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(x1 + 1, 1, 11, -95, 1, 12, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, x1, 2, 11, false, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindows(pOps, x1, 2, 8, x1, 9);
    addWindows(pOps, x1, 2, 15, x1, 16);
    addWindows(pOps, -106, 2, z0, -100, z0);
    addWindows(pOps, -106, 2, z1, -100, z1);

    pOps.fillBox(-108, 1, 14, -105, 1, 17, VOXEL_ID.TILE_FLOOR);
    pOps.set(-108, 2, 17, VOXEL_ID.FRIDGE);
    pOps.set(-107, 2, 17, VOXEL_ID.STOVE);
    pOps.set(-106, 2, 17, VOXEL_ID.SINK_COUNTER);
    pOps.fillBox(-108, 1, 7, -105, 1, 10, VOXEL_ID.CARPET_CORAL);
    pOps.set(-108, 2, 7, VOXEL_ID.BED_CORAL);
    pOps.set(-106, 2, 7, VOXEL_ID.CUPBOARD_OAK);
    pOps.set(-101, 2, 8, VOXEL_ID.SOFA);
    pOps.set(-100, 2, 8, VOXEL_ID.TABLE_GLASS);
    pOps.set(-100, 3, 8, VOXEL_ID.FLOWER_VASE);
    addRoomPartition(pOps, -101, 2, 15, -101, 17, VOXEL_ID.WHITE_WALL, 15, VOXEL_ID.DOOR_WHITE_CLOSED);
    pOps.set(-98, 2, 17, VOXEL_ID.TOILET);

    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (C4) Westside Book & Tea Nook [-85..-72, 6..18] — Small City Building
  {
    const x0 = -85, x1 = -72, z0 = 6, z1 = 18;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(-89, 1, 11, x0 - 1, 1, 12, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.PLANKS, VOXEL_ID.OAK_FLOOR, VOXEL_ID.CREAM_WALL);
    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, false);
    addEntranceDoor(pOps, x0, 2, 11, false, VOXEL_ID.PLANKS, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindows(pOps, x0, 2, 8, x0, 9);
    addWindows(pOps, x0, 2, 15, x0, 16);
    addWindows(pOps, x1, 2, 9, x1, 15);

    pOps.fillBox(-76, 2, 7, -73, 4, 7, VOXEL_ID.BOOKSHELF);
    pOps.fillBox(-76, 2, 17, -73, 4, 17, VOXEL_ID.BOOKSHELF);
    pOps.set(-79, 2, 9, VOXEL_ID.TABLE);
    pOps.set(-79, 3, 9, VOXEL_ID.DESK_LAMP);
    pOps.set(-80, 2, 9, VOXEL_ID.CHAIR_OAK);
    pOps.set(-78, 2, 9, VOXEL_ID.CHAIR_MINT);
    pOps.set(-79, 2, 15, VOXEL_ID.SOFA_CREAM);
    pOps.set(-78, 2, 15, VOXEL_ID.SOFA_CREAM);
    pOps.set(-74, 2, 12, VOXEL_ID.PLANT_POT);
  }

  // =========================================================================
  // 4. EXPANDED EAST DISTRICT HOUSES & BUILDINGS (x in [72..126])
  // =========================================================================

  // (E1) Emerald 2-Story Townhouse [112..125, -42..-28]
  {
    const x0 = 112, x1 = 125, z0 = -42, z1 = -28;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(110, 1, -36, x0 - 1, 1, -35, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addStoryShell(pOps, x0, 7, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, x0, 2, -36, false, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_MINT_CLOSED);
    for (const fy of [2, 7]) {
      addWindows(pOps, x0, fy, -40, x0, -38);
      addWindows(pOps, x0, fy, -32, x0, -30);
      addWindows(pOps, x1, fy, -39, x1, -31);
      addWindows(pOps, 115, fy, z0, 122, z0);
      addWindows(pOps, 115, fy, z1, 122, z1);
    }

    addStairs(pOps, 120, 2, -30, 1, 0, 1, 1, VOXEL_ID.OAK_FLOOR);
    pOps.fillBox(119, 1, -41, 124, 1, -37, VOXEL_ID.TILE_FLOOR);
    pOps.set(124, 2, -41, VOXEL_ID.FRIDGE);
    pOps.set(124, 3, -41, VOXEL_ID.FRIDGE);
    pOps.set(123, 2, -41, VOXEL_ID.STOVE);
    pOps.set(122, 2, -41, VOXEL_ID.SINK_COUNTER);
    pOps.set(114, 2, -30, VOXEL_ID.SOFA_MINT);
    pOps.set(115, 2, -30, VOXEL_ID.SOFA_MINT);
    pOps.set(114, 2, -32, VOXEL_ID.TABLE_GLASS);
    // 2F Bedroom & Bath
    pOps.fillBox(119, 6, -41, 124, 6, -37, VOXEL_ID.CARPET_CORAL);
    pOps.set(123, 7, -41, VOXEL_ID.BED_HEAD);
    pOps.set(124, 7, -41, VOXEL_ID.BED_FOOT);
    pOps.set(120, 7, -41, VOXEL_ID.CUPBOARD_WHITE);
    addRoomPartition(pOps, 115, 7, -41, 115, -38, VOXEL_ID.WHITE_WALL, -38, VOXEL_ID.DOOR_WHITE_CLOSED);
    pOps.set(113, 7, -41, VOXEL_ID.TOILET);

    addGableRoof(pOps, x0, 11, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // (C5) Flower & Plant Boutique [112..124, -16..-4] — Small Glass-Front City Shop
  {
    const x0 = 112, x1 = 124, z0 = -16, z1 = -4;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.MINT_WALL, VOXEL_ID.TILE_FLOOR, VOXEL_ID.WHITE_WALL);
    addParapetRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL);
    pOps.fillBox(116, 6, -13, 120, 6, -7, VOXEL_ID.GLASS); // Greenhouse skylight
    addEntranceDoor(pOps, x0, 2, -11, false, VOXEL_ID.MINT_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    addWindows(pOps, x0, 2, -14, x0, -13);
    addWindows(pOps, x0, 2, -7, x0, -6);

    pOps.fillBox(120, 2, -14, 122, 2, -7, VOXEL_ID.TABLE_WHITE);
    pOps.set(121, 3, -13, VOXEL_ID.FLOWER_VASE);
    pOps.set(121, 3, -9, VOXEL_ID.FLOWER_VASE);
    pOps.set(115, 2, -14, VOXEL_ID.PLANT_POT);
    pOps.set(115, 2, -6, VOXEL_ID.PLANT_POT);
    pOps.set(118, 2, -6, VOXEL_ID.GIFT_BOX);
    pOps.set(118, 2, -14, VOXEL_ID.CHAIR_MINT);
  }

  // (E2) Pastel Coral Family 2-Story Home [112..126, 8..22]
  {
    const x0 = 112, x1 = 126, z0 = 8, z1 = 22;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(110, 1, 14, x0 - 1, 1, 15, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CORAL_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addStoryShell(pOps, x0, 7, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.WHITE_WALL, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, x0, 2, 14, false, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    for (const fy of [2, 7]) {
      addWindows(pOps, x0, fy, 10, x0, 12);
      addWindows(pOps, x0, fy, 17, x0, 20);
      addWindows(pOps, x1, fy, 11, x1, 19);
      addWindows(pOps, 115, fy, z0, 123, z0);
      addWindows(pOps, 115, fy, z1, 123, z1);
    }

    addStairs(pOps, 121, 2, 20, 1, 0, 1, 1, VOXEL_ID.OAK_FLOOR);
    pOps.fillBox(119, 1, 9, 125, 1, 13, VOXEL_ID.TILE_FLOOR);
    pOps.set(125, 2, 9, VOXEL_ID.FRIDGE);
    pOps.set(125, 3, 9, VOXEL_ID.FRIDGE);
    pOps.set(124, 2, 9, VOXEL_ID.STOVE);
    pOps.set(123, 2, 9, VOXEL_ID.SINK_COUNTER);
    pOps.set(115, 2, 19, VOXEL_ID.SOFA_CORAL);
    pOps.set(116, 2, 19, VOXEL_ID.SOFA_CORAL);
    pOps.set(115, 2, 17, VOXEL_ID.TABLE_WHITE);
    // 2F Master Bedroom
    pOps.fillBox(113, 6, 9, 118, 6, 13, VOXEL_ID.CARPET_CORAL);
    pOps.set(113, 7, 9, VOXEL_ID.BED_CORAL);
    pOps.set(115, 7, 9, VOXEL_ID.CUPBOARD_WHITE);
    pOps.set(124, 7, 10, VOXEL_ID.TABLE_WHITE);
    pOps.set(123, 7, 10, VOXEL_ID.CHAIR_PINK);

    addGableRoof(pOps, x0, 11, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, false);
  }

  // (E3) Sunny Corner Cottage [72..84, -42..-30] — 1-Story Home north of Mall
  {
    const x0 = 72, x1 = 84, z0 = -42, z1 = -30;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.GRASS);
    ops.fillBox(77, 1, -47, 78, 1, z0 - 1, VOXEL_ID.SIDEWALK);

    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, 77, 2, z0, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addWindows(pOps, 74, 2, z0, 75, z0);
    addWindows(pOps, 80, 2, z0, 82, z0);
    addWindows(pOps, 74, 2, z1, 82, z1);
    addWindows(pOps, x0, 2, -39, x0, -33);
    addWindows(pOps, x1, 2, -39, x1, -33);

    pOps.fillBox(73, 1, -35, 76, 1, -31, VOXEL_ID.TILE_FLOOR);
    pOps.set(73, 2, -31, VOXEL_ID.FRIDGE);
    pOps.set(74, 2, -31, VOXEL_ID.STOVE);
    pOps.set(75, 2, -31, VOXEL_ID.SINK_COUNTER);
    pOps.fillBox(79, 1, -35, 83, 1, -31, VOXEL_ID.CARPET_BLUE);
    pOps.set(82, 2, -31, VOXEL_ID.BED_HEAD);
    pOps.set(83, 2, -31, VOXEL_ID.BED_FOOT);
    pOps.set(80, 2, -31, VOXEL_ID.CUPBOARD_SKY);
    pOps.set(75, 2, -38, VOXEL_ID.SOFA_CREAM);
    pOps.set(76, 2, -38, VOXEL_ID.TABLE_GLASS);

    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.WHITE_WALL, true);
  }

  // =========================================================================
  // 4B. 7 DEDICATED PAKISTANI CITY ROADSIDE PARKING AREAS (4-5 spaces each)
  // =========================================================================
  const buildParkingLot = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    entryX0: number,
    entryZ0: number,
    entryX1: number,
    entryZ1: number,
    signX: number,
    signZ: number,
  ) => {
    // Concrete border sidewalk + smooth asphalt parking surface flush at y = 1
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);
    ops.fillBox(x0, 1, z0, x1, 1, z1, VOXEL_ID.ASPHALT);
    // Open road-to-lot asphalt driveway mouth across the roadside sidewalk
    ops.fillBox(entryX0, 1, entryZ0, entryX1, 1, entryZ1, VOXEL_ID.ASPHALT);
    // Protected Pakistani blue/white "P" Parking signpost on corner curb
    pOps.set(signX, 2, signZ, VOXEL_ID.CHARCOAL_TRIM);
    pOps.set(signX, 3, signZ, VOXEL_ID.CHARCOAL_TRIM);
    pOps.set(signX, 4, signZ, VOXEL_ID.SKY_WALL);
    pOps.set(signX, 5, signZ, VOXEL_ID.WHITE_WALL);
  };

  // 1. Showroom & Hotel South Parking [50..69, 50..61] off South Connector
  buildParkingLot(50, 50, 69, 61, 57, 49, 62, 50, 50, 49);
  // 2. Shopping Mall South Parking [74..93, 32..44] off South Connector
  buildParkingLot(74, 32, 93, 44, 81, 44, 86, 45, 74, 45);
  // 3. Hospital & School North Parking [-39..-20, -89..-77] off Upper North Blvd
  buildParkingLot(-39, -89, -20, -77, -32, -90, -27, -89, -39, -90);
  // 4. Police & Fire Civic Parking [24..43, -89..-77] off Upper North Blvd
  buildParkingLot(24, -89, 43, -77, 31, -90, 36, -89, 24, -90);
  // 5. Cinema & Game Center West Parking [-89..-77, -38..-19] off Outer West St
  buildParkingLot(-89, -38, -77, -19, -90, -31, -89, -26, -90, -38);
  // 6. East Bazaar & Cottages Parking [68..87, -65..-53] off North Connector
  buildParkingLot(68, -65, 87, -53, 75, -53, 80, -52, 68, -52);
  // 7. Beachway & Dream Villa Parking [-20..-4, 78..97] off South Avenue
  buildParkingLot(-20, 78, -4, 97, -4, 85, -3, 90, -3, 78);

  // =========================================================================
  // 4C. CONNECTED OUTER WOODLAND PROMENADE LOOP, SCENIC CABINS & 3 NEW LANDMARKS
  //     (Connects expanded North, West, East forests seamlessly to city roads & beach)
  // =========================================================================
  // Outer Woodland Loop Trails [±175..±177] + Coastal Links
  ops.fillBox(-176, 1, -176, 176, 1, -174, VOXEL_ID.SIDEWALK);
  ops.fillBox(-176, 1, -176, -174, 1, 118, VOXEL_ID.SIDEWALK);
  ops.fillBox(-176, 1, 116, -78, 1, 118, VOXEL_ID.SIDEWALK);
  ops.fillBox(-80, 1, 118, -78, 1, 133, VOXEL_ID.SIDEWALK);
  ops.fillBox(174, 1, -176, 176, 1, 118, VOXEL_ID.SIDEWALK);
  ops.fillBox(78, 1, 116, 176, 1, 118, VOXEL_ID.SIDEWALK);
  ops.fillBox(78, 1, 118, 80, 1, 133, VOXEL_ID.SIDEWALK);
  // Trail spurs connecting roads & cabins cleanly
  ops.fillBox(-1, 1, -174, 1, 1, -142, VOXEL_ID.SIDEWALK);
  ops.fillBox(-174, 1, -1, -166, 1, 1, VOXEL_ID.SIDEWALK);
  ops.fillBox(148, 1, 25, 174, 1, 27, VOXEL_ID.SIDEWALK);

  // NW Ranger Woodland Cabin [-159..-149, -159..-149]
  {
    const x0 = -159, x1 = -149, z0 = -159, z1 = -149;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.MOSS_STONE);
    ops.fillBox(-148, 1, -154, -145, 1, -153, VOXEL_ID.SIDEWALK);
    ops.fillBox(-146, 1, -154, -144, 1, -142, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.PLANKS, VOXEL_ID.LOG, VOXEL_ID.OAK_FLOOR, VOXEL_ID.PLANKS);
    addEntranceDoor(pOps, x1, 2, -154, false, VOXEL_ID.LOG, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindows(pOps, x1, 2, -157, x1, -156);
    addWindows(pOps, x1, 2, -152, x1, -151);
    addWindows(pOps, -156, 2, z1, -152, z1);
    pOps.set(-157, 2, -157, VOXEL_ID.BED_CORAL);
    pOps.set(-157, 2, -151, VOXEL_ID.TABLE_WHITE);
    pOps.set(-156, 2, -151, VOXEL_ID.CHAIR_OAK);
    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.PLANKS, true);
  }

  // North Overlook Woodland Pavilion [-5..5, -157..-149]
  {
    const x0 = -5, x1 = 5, z0 = -157, z1 = -149;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);
    ops.fillBox(-2, 1, -149, 2, 1, -142, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, -1, 2, z1, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WHITE_CLOSED);
    addWindows(pOps, -4, 2, z1, -3, z1);
    addWindows(pOps, 2, 2, z1, 4, z1);
    addWindows(pOps, -3, 2, z0, 3, z0);
    pOps.set(-3, 2, -154, VOXEL_ID.SOFA_MINT);
    pOps.set(-2, 2, -154, VOXEL_ID.SOFA_MINT);
    pOps.set(2, 2, -154, VOXEL_ID.TABLE_GLASS);
    pOps.set(3, 2, -154, VOXEL_ID.CHAIR_MINT);
    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL, false);
  }

  // East Woodland Tea Hut [152..161, -78..-66]
  {
    const x0 = 152, x1 = 161, z0 = -78, z1 = -66;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 1, VOXEL_ID.SIDEWALK);
    ops.fillBox(149, 1, -73, x0 - 1, 1, -71, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.MINT_WALL, VOXEL_ID.TILE_FLOOR, VOXEL_ID.WHITE_WALL);
    addEntranceDoor(pOps, x0, 2, -73, false, VOXEL_ID.MINT_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    addWindows(pOps, x0, 2, -76, x0, -75);
    addWindows(pOps, x0, 2, -70, x0, -68);
    addWindows(pOps, 154, 2, z0, 159, z0);
    addWindows(pOps, 154, 2, z1, 159, z1);
    pOps.fillBox(158, 2, -76, 159, 2, -68, VOXEL_ID.KITCHEN_COUNTER);
    pOps.set(155, 2, -69, VOXEL_ID.TABLE_WHITE);
    pOps.set(154, 2, -69, VOXEL_ID.CHAIR_SKY);
    addParapetRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL);
  }

  // NEW LANDMARK 1: Cyber Fashion Plaza (X-Suit Arena) [152..170, -20..-2] off Outer East Blvd
  {
    const x0 = 152, x1 = 170, z0 = -20, z1 = -2;
    ops.fillBox(x0 - 2, 1, z0 - 2, x1 + 1, 1, z1 + 2, VOXEL_ID.SIDEWALK);
    ops.fillBox(149, 1, -13, x0 - 1, 1, -9, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.WHITE_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.TILE_FLOOR, VOXEL_ID.SKY_WALL);
    addStoryShell(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SKY_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.TILE_FLOOR, VOXEL_ID.SKY_WALL);
    addEntranceDoor(pOps, x0, 2, -11, false, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addWindows(pOps, x0, 2, -18, x0, -14);
    addWindows(pOps, x0, 2, -8, x0, -4);
    addWindows(pOps, x0, 6, -17, x0, -5);
    addWindows(pOps, 155, 2, z1, 167, z1);
    addWindows(pOps, 155, 2, z0, 167, z0);
    // Open central X-Suit showcase runway & stair access
    pOps.fillBox(157, 5, -14, 165, 5, -8, VOXEL_ID.AIR);
    pOps.set(167, 2, -17, VOXEL_ID.LAMP_BLOCK);
    pOps.set(167, 2, -5, VOXEL_ID.LAMP_BLOCK);
    pOps.set(162, 2, -11, VOXEL_ID.CARPET_CORAL);
    pOps.set(161, 2, -11, VOXEL_ID.CARPET_BLUE);
    pOps.set(158, 2, -17, VOXEL_ID.SOFA_CREAM);
    pOps.set(159, 2, -17, VOXEL_ID.SOFA_CREAM);
    pOps.set(158, 2, -5, VOXEL_ID.SOFA_CORAL);
    pOps.set(166, 2, -11, VOXEL_ID.GIFT_BOX);
    pOps.set(166, 2, -9, VOXEL_ID.PLUSH_DECOR);
    addParapetRoof(pOps, x0, 10, z0, x1, z1, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.SKY_WALL);
  }

  // NEW LANDMARK 2: Crown Hill Observatory [-168..-152, -20..-5] off West Ave Extension
  {
    const x0 = -168, x1 = -152, z0 = -20, z1 = -5;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 2, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.CREAM_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.OAK_FLOOR, VOXEL_ID.WHITE_WALL);
    addStoryShell(pOps, x0 + 2, 6, z0 + 2, x1 - 2, z1 - 2, VOXEL_ID.SKY_WALL, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.TILE_FLOOR, VOXEL_ID.SKY_WALL);
    addEntranceDoor(pOps, -160, 2, z1, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_WHITE_CLOSED);
    addWindows(pOps, -165, 2, z1, -162, z1);
    addWindows(pOps, -158, 2, z1, -155, z1);
    addWindows(pOps, x0, 2, -17, x0, -8);
    addWindows(pOps, x1, 2, -17, x1, -8);
    pOps.fillBox(-165, 2, -18, -162, 4, -18, VOXEL_ID.BOOKSHELF);
    pOps.set(-157, 2, -15, VOXEL_ID.TABLE_GLASS);
    pOps.set(-156, 2, -15, VOXEL_ID.CHAIR_SKY);
    pOps.set(-160, 2, -12, VOXEL_ID.CARPET_BLUE);
    pOps.set(-155, 2, -18, VOXEL_ID.LAMP_BLOCK);
    addParapetRoof(pOps, x0 + 2, 10, z0 + 2, x1 - 2, z1 - 2, VOXEL_ID.SLATE_ROOF, VOXEL_ID.SKY_WALL);
  }

  // NEW LANDMARK 3: Whispering Woods Lodge [56..72, -160..-146] off Outer North Blvd
  {
    const x0 = 56, x1 = 72, z0 = -160, z1 = -146;
    ops.fillBox(x0 - 1, 1, z0 - 1, x1 + 1, 1, z1 + 4, VOXEL_ID.SIDEWALK);
    addStoryShell(pOps, x0, 2, z0, x1, z1, VOXEL_ID.PLANKS, VOXEL_ID.LOG, VOXEL_ID.OAK_FLOOR, VOXEL_ID.PLANKS);
    addEntranceDoor(pOps, 64, 2, z1, true, VOXEL_ID.LOG, VOXEL_ID.DOOR_WOOD_CLOSED);
    addWindows(pOps, 59, 2, z1, 61, z1);
    addWindows(pOps, 67, 2, z1, 69, z1);
    addWindows(pOps, 59, 2, z0, 69, z0);
    addWindows(pOps, x0, 2, -157, x0, -149);
    addWindows(pOps, x1, 2, -157, x1, -149);
    pOps.set(59, 2, -157, VOXEL_ID.BED_CORAL);
    pOps.set(60, 2, -157, VOXEL_ID.LAMP_BLOCK);
    pOps.set(69, 2, -157, VOXEL_ID.SOFA_CREAM);
    pOps.set(68, 2, -157, VOXEL_ID.SOFA_CREAM);
    pOps.set(68, 2, -154, VOXEL_ID.TABLE_WHITE);
    pOps.set(69, 2, -154, VOXEL_ID.CHAIR_OAK);
    addGableRoof(pOps, x0, 6, z0, x1, z1, VOXEL_ID.SLATE_ROOF, VOXEL_ID.PLANKS, true);
  }

  // =========================================================================
  // 5. DENSE MINECRAFT-STYLE FORESTS WITH VARIED TREES, BUSHES, GRASS & FLOWERS
  //    PLUS 7 NATURAL FOREST WATERING PONDS FOR WILDLIFE
  //    (Trees, bushes, wildflowers, ferns & grass stay 100% breakable/normal)
  // =========================================================================
  const FOREST_PONDS: ReadonlyArray<{ x: number; z: number; rx: number; rz: number }> = [
    { x: -72, z: -122, rx: 3.4, rz: 2.8 },  // North-West Woods Spring
    { x: 82, z: -120, rx: 3.4, rz: 2.8 },   // North-East Woods Spring
    { x: -122, z: 32, rx: 2.8, rz: 3.4 },   // West Emerald Forest Spring
    { x: 136, z: -22, rx: 2.8, rz: 3.4 },   // East Sunlit Forest Spring
    { x: -62, z: 76, rx: 3.2, rz: 2.8 },    // South-West Grove Spring
    { x: -168, z: -56, rx: 3.4, rz: 2.8 },  // Outer West Observatory Spring
    { x: 84, z: -166, rx: 3.6, rz: 2.8 },   // Whispering Lodge Spring
  ];

  const PROTECTED_BOXES: Array<readonly [number, number, number, number]> = [
    [-42, -42, 42, 42], // Original city core neighborhood & park
    // Forest Watering Pond Clearings (keep tree trunks clear of pond basins)
    [-77, -126, -67, -118],
    [77, -124, 87, -116],
    [-126, 27, -118, 37],
    [132, -27, 140, -17],
    [-67, 72, -57, 80],
    [-173, -61, -163, -51],
    [79, -171, 89, -161],
    // North Civic Strip
    [-45, -71, -27, -53], // Hospital
    [-23, -73, -5, -53], // School
    [5, -69, 21, -53], // Library
    [25, -69, 41, -53], // Police Station
    [45, -69, 63, -53], // Fire Station
    // East Market & Plaza
    [49, -41, 67, -23], // Supermarket
    [49, -19, 63, -5], // Coffee Shop
    [68, -15, 95, 15], // Shopping Mall & Apron
    [49, 5, 65, 21], // Restaurant
    // West Arcade
    [-65, -41, -49, -25], // Game Center
    [-67, -21, -49, -5], // Cinema
    [-65, 5, -49, 21], // Dance Club
    // South Boulevard & Villa
    [-23, 51, -5, 67], // Gym
    [5, 51, 23, 71], // Hotel
    [27, 51, 47, 69], // Car Showroom
    [5, 75, 37, 107], // Player's Dream Villa Estate
    // 7 Dedicated City Parking Areas
    [49, 49, 70, 62], // Lot 1: Showroom & Hotel Parking
    [73, 31, 94, 45], // Lot 2: Shopping Mall Parking
    [-40, -90, -19, -76], // Lot 3: Hospital & School Parking
    [23, -90, 44, -76], // Lot 4: Police & Fire Parking
    [-90, -39, -76, -18], // Lot 5: Cinema & Arcade West Parking
    [67, -66, 88, -52], // Lot 6: East Bazaar Parking
    [-21, 77, -3, 98], // Lot 7: Beachway & Dream Villa Parking
    // Expanded Houses & Small Buildings
    [-35, -107, -21, -95], // N1 Maple Oak Cottage
    [-19, -109, -4, -95], // N2 Lavender & Sky Villa
    [5, -107, 20, -95], // C1 Community Bakery
    [23, -107, 39, -95], // C2 Vet & Pet Clinic
    [43, -108, 59, -95], // N3 Pinecrest Villa
    [-111, -41, -96, -25], // W1 Sunset Mint Villa
    [-110, -19, -96, -4], // C3 Art & Music Studio
    [-110, 5, -96, 19], // W2 Garden Oak Bungalow
    [-86, 5, -71, 19], // C4 Book & Tea Nook
    [111, -43, 126, -27], // E1 Emerald Townhouse
    [111, -17, 125, -3], // C5 Flower Boutique
    [111, 7, 127, 23], // E2 Pastel Coral Home
    [71, -43, 85, -29], // E3 Sunny Corner Cottage
    // Outer Woodland Overlook Cabins, New Landmarks & Promenades
    [-160, -160, -144, -142], // NW Ranger Cabin + spur
    [-6, -158, 6, -142], // North Overlook Pavilion + spur
    [149, -79, 162, -65], // East Woodland Tea Hut
    [149, -22, 171, 0], // Cyber Fashion Plaza (X-Suit Arena)
    [-170, -22, -151, -3], // Crown Hill Observatory
    [55, -161, 73, -142], // Whispering Woods Lodge
    [-177, -177, 177, -173], // North Outer Woodland Trail
    [-177, -177, -173, 119], // West Outer Woodland Trail
    [173, -177, 177, 119], // East Outer Woodland Trail
    [-1, -175, 1, -142], // North Ave Trail Link
    [-175, -1, -166, 1], // West Ave Trail Link
    [148, 24, 175, 28], // East Forest Connector Trail
    // Road & Sidewalk Corridors
    [-3, -143, 3, 134], // Central North-South Ave
    [-167, -3, 149, 3], // Central East-West St & Extensions
    [-147, -143, 149, -137], // Outer North Woodland Blvd
    [-94, -94, 149, -90], // Upper North Blvd
    [-49, -52, 149, -48], // North Connector Blvd
    [-24, 45, 149, 51], // South Connector Blvd
    [-94, -94, -90, 49], // Outer West St
    [-49, -48, -44, 24], // West Connector St
    [44, -48, 49, 24], // East Connector St
    [105, -94, 109, 49], // Outer East St
    [144, -143, 149, 49], // Outer East Promenade Blvd
  ];

  const isBlockedForForest = (x: number, z: number, pad: number): boolean => {
    if (x < -189 || x > 189 || z < -189 || z >= 106 - pad) return true; // Outer island rim + South Coast Beach untouched
    for (let i = 0; i < PROTECTED_BOXES.length; i++) {
      const [x0, z0, x1, z1] = PROTECTED_BOXES[i];
      if (x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad) {
        return true;
      }
    }
    return false;
  };

  // Track placed trunks so dense trees interlock organically without fusing trunks
  const trunkCellKey = (x: number, z: number) => (x + 256) * 1024 + (z + 256);
  const placedTrunks = new Set<number>();
  const hasNearbyTrunk = (tx: number, tz: number, minGap: number): boolean => {
    for (let dz = -minGap; dz <= minGap; dz++) {
      for (let dx = -minGap; dx <= minGap; dx++) {
        if (placedTrunks.has(trunkCellKey(tx + dx, tz + dz))) return true;
      }
    }
    return false;
  };

  const plantForestZone = (
    xMin: number,
    zMin: number,
    xMax: number,
    zMax: number,
    seedBase: number,
  ) => {
    // Pass 1: Dense multi-species Minecraft trees on staggered ~3-block grid with organic openings
    let idx = 0;
    for (let z = zMin; z <= zMax; z += 3) {
      const rowOffset = (Math.floor(z / 3) & 1) === 0 ? 0 : 1;
      for (let x = xMin + rowOffset; x <= xMax; x += 3) {
        idx++;
        const hash = (((x * 73856093) ^ (z * 19349663) ^ seedBase) >>> 0);
        const tx = x + ((hash % 3) - 1);
        const tz = z + (((hash >> 3) % 3) - 1);
        if (isBlockedForForest(tx, tz, 3)) continue;

        // Smooth woodland density wave creates dense groves with tiny sunlit clearings
        const wave = Math.sin(tx * 0.085 + seedBase * 0.1) + Math.cos(tz * 0.095 - seedBase * 0.07);
        const skipChance = wave < -0.95 ? 58 : 26; // ~74% tree coverage in groves!
        if (hash % 100 < skipChance) continue;

        if (hasNearbyTrunk(tx, tz, 2)) continue;
        placedTrunks.add(trunkCellKey(tx, tz));

        // Regional biome blend + variety
        const speciesPick = ((hash >> 6) + idx) % 6;
        addMinecraftTreeVariant(ops, tx, tz, speciesPick, hash >> 2);
      }
    }

    // Pass 2: Lush forest floor — tall grass, ferns, wildflowers, moss patches, and low bushes
    for (let z = zMin - 1; z <= zMax + 1; z++) {
      for (let x = xMin - 1; x <= xMax + 1; x++) {
        if (isBlockedForForest(x, z, 1)) continue;
        if (hasNearbyTrunk(x, z, 0)) continue;

        const hash = (((x * 83492791) ^ (z * 2971215073) ^ (seedBase * 17)) >>> 0);
        // Natural mossy stone accents under canopy shade
        if (hash % 29 === 0 && !hasNearbyTrunk(x, z, 1)) {
          ops.set(x, 1, z, VOXEL_ID.MOSS_STONE);
          continue;
        }

        const roll = hash % 100;
        if (roll < 36) {
          ops.set(x, 2, z, VOXEL_ID.TALL_GRASS);
        } else if (roll < 52) {
          ops.set(x, 2, z, VOXEL_ID.FERN_BUSH);
        } else if (roll < 59) {
          ops.set(x, 2, z, VOXEL_ID.FLOWER_YELLOW);
        } else if (roll < 65) {
          ops.set(x, 2, z, VOXEL_ID.FLOWER_RED);
        } else if (roll < 69 && !hasNearbyTrunk(x, z, 1)) {
          ops.set(x, 2, z, (hash & 1) === 0 ? VOXEL_ID.LEAVES : VOXEL_ID.DARK_LEAVES);
        }
      }
    }
  };

  // North Whispering Woods (expanded outer northern woodland belt)
  plantForestZone(-186, -186, 186, -112, 101);
  // North Side Pockets between North Blvd & Upper houses/corners
  plantForestZone(-186, -110, -40, -96, 202);
  plantForestZone(62, -110, 186, -96, 303);

  // NW & NE Woodland Corner Groves (inside city ring blocks)
  plantForestZone(-87, -87, -47, -55, 404);
  plantForestZone(66, -87, 102, -55, 505);

  // West Emerald & Outer Horizon Forest
  plantForestZone(-186, -94, -114, 102, 606);
  plantForestZone(-87, -45, -69, 42, 657);
  plantForestZone(-87, 22, -68, 42, 699);

  // East Sunlit & Cyber Promenade Forest
  plantForestZone(129, -94, 186, 102, 808);
  plantForestZone(112, -87, 128, -46, 845);
  plantForestZone(112, 26, 128, 102, 877);
  plantForestZone(69, -45, 102, -19, 909);
  plantForestZone(69, 18, 102, 42, 945);

  // SW & SE Woodland Groves (strictly north of z = 106, keeping Dream Villa & Beach clear)
  plantForestZone(-186, 54, -26, 104, 1111);
  plantForestZone(-22, 70, -6, 104, 1155);
  plantForestZone(49, 54, 186, 104, 1212);

  // Carve crystal-clear forest watering ponds down to SEA_LEVEL (1.56) with mossy banks
  for (let p = 0; p < FOREST_PONDS.length; p++) {
    const pond = FOREST_PONDS[p];
    const minX = Math.floor(pond.x - pond.rx - 2);
    const maxX = Math.ceil(pond.x + pond.rx + 2);
    const minZ = Math.floor(pond.z - pond.rz - 2);
    const maxZ = Math.ceil(pond.z + pond.rz + 2);
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - pond.x) / pond.rx;
        const nz = (z - pond.z) / pond.rz;
        const dSq = nx * nx + nz * nz;
        if (dSq <= 1.0) {
          ops.set(x, 0, z, dSq < 0.55 ? VOXEL_ID.SAND : VOXEL_ID.MOSS_STONE);
          for (let y = 1; y <= 6; y++) {
            ops.set(x, y, z, VOXEL_ID.AIR);
          }
        } else if (dSq <= 1.55) {
          ops.set(x, 1, z, ((x + z) & 1) === 0 ? VOXEL_ID.MOSS_STONE : VOXEL_ID.GRASS);
          const bankRoll = Math.abs((x * 31 + z * 17) % 10);
          if (bankRoll === 0) ops.set(x, 2, z, VOXEL_ID.FLOWER_YELLOW);
          else if (bankRoll === 2) ops.set(x, 2, z, VOXEL_ID.FERN_BUSH);
          else if (bankRoll === 4) ops.set(x, 2, z, VOXEL_ID.TALL_GRASS);
        }
      }
    }
  }
}

