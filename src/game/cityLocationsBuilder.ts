import { createProtectedVoxelOps, VoxelWriteOps } from './modernHouses';
import { VOXEL_ID, VoxelId } from './types';

function addFlatRoof(
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

function buildVenueStory(
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

  // Interior ceiling illumination
  if (x1 - x0 >= 4 && z1 - z0 >= 4) {
    const midX = Math.floor((x0 + x1) / 2);
    const midZ = Math.floor((z0 + z1) / 2);
    set(midX, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
    if (x1 - x0 >= 10) {
      set(x0 + 3, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
      set(x1 - 3, baseY + 4, midZ, VOXEL_ID.LAMP_BLOCK);
    }
    if (z1 - z0 >= 10) {
      set(midX, baseY + 4, z0 + 3, VOXEL_ID.LAMP_BLOCK);
      set(midX, baseY + 4, z1 - 3, VOXEL_ID.LAMP_BLOCK);
    }
  }
}

function addDoubleDoor(
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
    set(x, baseY + 2, z, VOXEL_ID.GLASS);
    set(x + 1, baseY + 2, z, VOXEL_ID.GLASS);
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
    set(x, baseY + 2, z, VOXEL_ID.GLASS);
    set(x, baseY + 2, z + 1, VOXEL_ID.GLASS);
    set(x, baseY + 3, z, trimId);
    set(x, baseY + 3, z + 1, trimId);
  }
}

function addGlassSpan(
  ops: VoxelWriteOps,
  x0: number,
  baseY: number,
  z0: number,
  x1: number,
  z1: number,
): void {
  ops.fillBox(x0, baseY + 1, z0, x1, baseY + 2, z1, VOXEL_ID.GLASS);
}

function addVenueStairs(
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
  const { fillBox, markFixed } = ops;
  for (let s = 0; s < 4; s++) {
    const sx = startX + dx * s;
    const sz = startZ + dz * s;
    const xEnd = sx + widthX - 1;
    const zEnd = sz + widthZ - 1;
    fillBox(sx, baseY, sz, xEnd, baseY + 8, zEnd, VOXEL_ID.AIR);
    const minStepY = s === 0 ? baseY : baseY + s - 1;
    fillBox(sx, minStepY, sz, xEnd, baseY + s, zEnd, stepId);
    for (let y = minStepY; y <= baseY + s; y++) {
      for (let z = sz; z <= zEnd; z++) {
        for (let x = sx; x <= xEnd; x++) {
          markFixed?.(x, y, z);
        }
      }
    }
  }
}

function placeFixedBox(
  ops: VoxelWriteOps,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  id: VoxelId,
): void {
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
        ops.markFixed?.(x, y, z);
      }
    }
  }
}

function placeFixedBlock(ops: VoxelWriteOps, x: number, y: number, z: number, id: VoxelId): void {
  ops.set(x, y, z, id);
  ops.markFixed?.(x, y, z);
}

function addPalmTree(ops: VoxelWriteOps, gx: number, gz: number): void {
  const { set } = ops;
  for (let y = 2; y <= 6; y++) {
    set(gx, y, gz, VOXEL_ID.LOG);
  }
  for (let dx = -2; dx <= 2; dx++) {
    set(gx + dx, 7, gz, VOXEL_ID.LEAVES);
    if (Math.abs(dx) === 2) set(gx + dx, 6, gz, VOXEL_ID.LEAVES);
  }
  for (let dz = -2; dz <= 2; dz++) {
    set(gx, 7, gz + dz, VOXEL_ID.LEAVES);
    if (Math.abs(dz) === 2) set(gx, 6, gz + dz, VOXEL_ID.LEAVES);
  }
  set(gx - 1, 7, gz - 1, VOXEL_ID.LEAVES);
  set(gx + 1, 7, gz - 1, VOXEL_ID.LEAVES);
  set(gx - 1, 7, gz + 1, VOXEL_ID.LEAVES);
  set(gx + 1, 7, gz + 1, VOXEL_ID.LEAVES);
  set(gx, 8, gz, VOXEL_ID.LEAVES);
}

function buildExpandedRoads(ops: VoxelWriteOps): void {
  const { set } = ops;

  // 1. North Avenue extension (-76..-42)
  for (let z = -76; z <= -42; z++) {
    for (let x = -3; x <= 3; x++) {
      if (x === -3 || x === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (x === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE);
      else if (x === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      else if (x === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // North Connector boulevard along z in [-52..-48], x in [-48..64]
  for (let z = -52; z <= -48; z++) {
    for (let x = -48; x <= 64; x++) {
      const inNS = x >= -2 && x <= 2;
      if (inNS) {
        if (z === -52 || z === -48) set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
        else set(x, 1, z, VOXEL_ID.ASPHALT);
      } else if (x === -3 || x === 3) {
        if (z >= -51 && z <= -49) set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
        else set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (z === -52 || z === -48) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (z === -51) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      } else if (z === -49) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      }
    }
  }

  // 2. East Avenue extension (42..72)
  for (let x = 42; x <= 72; x++) {
    for (let z = -3; z <= 3; z++) {
      if (z === -3 || z === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (z === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      else if (z === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      else if (z === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // East Connector street along x in [44..49], z in [-48..24]
  // Roadway at x=45..47, sidewalks at x=44 & x=48..49 so east venue spawns (x=48) sit on sidewalk
  for (let z = -48; z <= 24; z++) {
    for (let x = 44; x <= 49; x++) {
      const inEW = z >= -2 && z <= 2;
      if (inEW) {
        if (x >= 45 && x <= 47) set(x, 1, z, VOXEL_ID.ASPHALT);
        else set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
      } else if (z === -3 || z === 3) {
        if (x >= 45 && x <= 47) set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
        else set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (x === 44 || x >= 48) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (x === 45) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      } else if (x === 47) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE);
      }
    }
  }

  // Shopping Mall Plaza apron at x in [69..73], z in [-7..7]
  ops.fillBox(69, 1, -7, 73, 1, 7, VOXEL_ID.SIDEWALK);

  // 3. West Avenue extension (-68..-42)
  for (let x = -68; x <= -42; x++) {
    for (let z = -3; z <= 3; z++) {
      if (z === -3 || z === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (z === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      else if (z === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      else if (z === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // West Connector street along x in [-49..-44], z in [-48..24]
  // Roadway at x=-47..-45, sidewalks at x=-49..-48 & x=-44 so west venue spawns (x=-48) sit on sidewalk
  for (let z = -48; z <= 24; z++) {
    for (let x = -49; x <= -44; x++) {
      const inEW = z >= -2 && z <= 2;
      if (inEW) {
        if (x >= -47 && x <= -45) set(x, 1, z, VOXEL_ID.ASPHALT);
        else set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
      } else if (z === -3 || z === 3) {
        if (x >= -47 && x <= -45) set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
        else set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (x <= -48 || x === -44) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (x === -47) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      } else if (x === -45) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE);
      }
    }
  }

  // 4. South Avenue extension (42..129) down to the Beach
  for (let z = 42; z <= 129; z++) {
    for (let x = -3; x <= 3; x++) {
      if (x === -3 || x === 3) set(x, 1, z, VOXEL_ID.SIDEWALK);
      else if (x === 0) set(x, 1, z, VOXEL_ID.ROAD_LINE);
      else if (x === -2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_W);
      else if (x === 2) set(x, 1, z, VOXEL_ID.ROAD_EDGE_E);
      else set(x, 1, z, VOXEL_ID.ASPHALT);
    }
  }

  // South Connector boulevard along z in [45..51], x in [-24..49]
  // Roadway z=46..48, sidewalks z=45 & z=49..51 so south venue spawns (z=50) sit on sidewalk
  for (let z = 45; z <= 51; z++) {
    for (let x = -24; x <= 49; x++) {
      const inNS = x >= -2 && x <= 2;
      if (inNS) {
        if (z >= 46 && z <= 48) set(x, 1, z, VOXEL_ID.ASPHALT);
        else set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_NS);
      } else if (x === -3 || x === 3) {
        if (z >= 46 && z <= 48) set(x, 1, z, VOXEL_ID.ROAD_CROSSWALK_EW);
        else set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (z === 45 || z >= 49) {
        set(x, 1, z, VOXEL_ID.SIDEWALK);
      } else if (z === 46) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_N);
      } else if (z === 48) {
        set(x, 1, z, VOXEL_ID.ROAD_EDGE_S);
      } else {
        set(x, 1, z, VOXEL_ID.ROAD_LINE_EW);
      }
    }
  }
}

export function buildCityLocationsDistrict(rawOps: VoxelWriteOps): void {
  // Connect outer districts with clean asphalt roads & sidewalks (unprotected ground)
  buildExpandedRoads(rawOps);

  // Use protected ops for all ready-made city buildings & interior rooms
  const ops = createProtectedVoxelOps(rawOps);
  const { set, fillBox } = ops;

  // =========================================================================
  // NORTH CAMPUS & CIVIC STRIP (Faces South z1 = -54 -> spawns at z = -52)
  // =========================================================================

  // 1. HOSPITAL [-44, -70, -28, -54], spawn (-36, -52, N)
  {
    buildVenueStory(
      ops,
      -44,
      2,
      -70,
      -28,
      -54,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, -44, 6, -70, -28, -54, VOXEL_ID.WHITE_WALL, VOXEL_ID.RED_ROOF);
    // Rooftop Red Cross emblem
    fillBox(-37, 7, -64, -35, 7, -60, VOXEL_ID.CORAL_WALL);
    fillBox(-39, 7, -62, -33, 7, -62, VOXEL_ID.CORAL_WALL);
    addDoubleDoor(ops, -37, 2, -54, true, VOXEL_ID.SKY_WALL, VOXEL_ID.DOOR_WHITE_CLOSED);
    addGlassSpan(ops, -42, 2, -54, -40, -54);
    addGlassSpan(ops, -33, 2, -54, -30, -54);
    addGlassSpan(ops, -44, 2, -65, -44, -59);
    addGlassSpan(ops, -28, 2, -65, -28, -59);
    // Reception desk & care rooms
    placeFixedBox(ops, -39, 2, -59, -34, 2, -59, VOXEL_ID.SINK_COUNTER);
    placeFixedBlock(ops, -36, 2, -59, VOXEL_ID.DESK_LAMP);
    placeFixedBlock(ops, -42, 2, -67, VOXEL_ID.BED_HEAD);
    placeFixedBlock(ops, -42, 2, -66, VOXEL_ID.BED_FOOT);
    placeFixedBlock(ops, -30, 2, -67, VOXEL_ID.BED_MINT);
    placeFixedBlock(ops, -30, 2, -66, VOXEL_ID.BED_MINT);
    set(-42, 2, -56, VOXEL_ID.SOFA_MINT);
    set(-41, 2, -56, VOXEL_ID.SOFA_MINT);
    set(-31, 2, -56, VOXEL_ID.CHAIR_SKY);
    set(-30, 2, -56, VOXEL_ID.PLANT_POT);
  }

  // 2. SCHOOL [-22, -72, -6, -54], spawn (-14, -52, N) — 2-Story Modern Campus
  {
    buildVenueStory(
      ops,
      -22,
      2,
      -72,
      -6,
      -54,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.OAK_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    buildVenueStory(
      ops,
      -22,
      7,
      -72,
      -6,
      -54,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.OAK_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, -22, 11, -72, -6, -54, VOXEL_ID.SLATE_ROOF, VOXEL_ID.RED_ROOF);
    // Clock tower accent above main entrance
    fillBox(-16, 12, -56, -12, 14, -54, VOXEL_ID.CREAM_WALL);
    set(-14, 13, -54, VOXEL_ID.LAMP_BLOCK);

    addDoubleDoor(ops, -15, 2, -54, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addGlassSpan(ops, -20, 2, -54, -18, -54);
    addGlassSpan(ops, -11, 2, -54, -8, -54);
    addGlassSpan(ops, -20, 7, -54, -8, -54);
    addGlassSpan(ops, -22, 2, -67, -22, -59);
    addGlassSpan(ops, -6, 2, -67, -6, -59);

    // Interior staircase on west wing up to 2nd floor classrooms
    addVenueStairs(ops, -20, 2, -62, 0, -1, 2, 1, VOXEL_ID.OAK_FLOOR);

    // 1F Classroom desks, chalkboard & lockers
    placeFixedBox(ops, -15, 2, -70, -11, 4, -70, VOXEL_ID.MINT_WALL);
    placeFixedBlock(ops, -13, 2, -68, VOXEL_ID.TABLE_WHITE);
    for (let cx = -15; cx <= -9; cx += 2) {
      set(cx, 2, -65, VOXEL_ID.CHAIR_OAK);
      set(cx, 2, -64, VOXEL_ID.TABLE);
      set(cx, 2, -61, VOXEL_ID.CHAIR_OAK);
      set(cx, 2, -60, VOXEL_ID.TABLE);
    }
    placeFixedBox(ops, -8, 2, -70, -8, 3, -64, VOXEL_ID.CUPBOARD_SKY);
    // 2F Study library & lockers
    placeFixedBox(ops, -17, 7, -70, -9, 9, -70, VOXEL_ID.BOOKSHELF);
    set(-14, 7, -62, VOXEL_ID.TABLE_WHITE);
    set(-13, 7, -62, VOXEL_ID.TABLE_WHITE);
    set(-14, 7, -63, VOXEL_ID.CHAIR_SKY);
    set(-13, 7, -63, VOXEL_ID.CHAIR_SKY);
    set(-9, 7, -58, VOXEL_ID.FLOWER_VASE);
  }

  // 3. LIBRARY [6, -68, 20, -54], spawn (13, -52, N)
  {
    buildVenueStory(
      ops,
      6,
      2,
      -68,
      20,
      -54,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.CARPET_BLUE,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 6, 6, -68, 20, -54, VOXEL_ID.SLATE_ROOF, VOXEL_ID.SKY_WALL);
    addDoubleDoor(ops, 13, 2, -54, true, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_WOOD_CLOSED);
    addGlassSpan(ops, 8, 2, -54, 11, -54);
    addGlassSpan(ops, 16, 2, -54, 18, -54);
    addGlassSpan(ops, 6, 2, -64, 6, -58);
    addGlassSpan(ops, 20, 2, -64, 20, -58);
    // Tall bookshelf aisles + reading desks
    placeFixedBox(ops, 8, 2, -66, 11, 4, -66, VOXEL_ID.BOOKSHELF);
    placeFixedBox(ops, 15, 2, -66, 18, 4, -66, VOXEL_ID.BOOKSHELF);
    placeFixedBox(ops, 8, 2, -62, 11, 3, -62, VOXEL_ID.BOOKSHELF);
    set(15, 2, -60, VOXEL_ID.TABLE);
    set(16, 2, -60, VOXEL_ID.TABLE);
    set(15, 3, -60, VOXEL_ID.DESK_LAMP);
    set(15, 2, -59, VOXEL_ID.CHAIR_OAK);
    set(16, 2, -59, VOXEL_ID.CHAIR_OAK);
    set(9, 2, -57, VOXEL_ID.SOFA_CREAM);
    set(10, 2, -57, VOXEL_ID.SOFA_CREAM);
  }

  // 4. POLICE STATION [26, -68, 40, -54], spawn (33, -52, N)
  {
    buildVenueStory(
      ops,
      26,
      2,
      -68,
      40,
      -54,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 26, 6, -68, 40, -54, VOXEL_ID.SLATE_ROOF, VOXEL_ID.SKY_WALL);
    // Blue/Red patrol rooftop light bar
    fillBox(31, 7, -56, 32, 7, -56, VOXEL_ID.SKY_WALL);
    fillBox(33, 7, -56, 34, 7, -56, VOXEL_ID.LAMP_BLOCK);
    fillBox(35, 7, -56, 36, 7, -56, VOXEL_ID.CORAL_WALL);

    addDoubleDoor(ops, 33, 2, -54, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addGlassSpan(ops, 28, 2, -54, 31, -54);
    addGlassSpan(ops, 36, 2, -54, 38, -54);
    placeFixedBox(ops, 30, 2, -60, 36, 2, -60, VOXEL_ID.KITCHEN_COUNTER);
    placeFixedBlock(ops, 33, 3, -66, VOXEL_ID.TV_SCREEN);
    set(29, 2, -64, VOXEL_ID.TABLE_WHITE);
    set(29, 2, -63, VOXEL_ID.CHAIR_SKY);
    set(37, 2, -64, VOXEL_ID.TABLE_WHITE);
    set(37, 2, -63, VOXEL_ID.CHAIR_SKY);
    placeFixedBox(ops, 27, 2, -66, 27, 3, -64, VOXEL_ID.CUPBOARD_SKY);
  }

  // 5. FIRE STATION [46, -68, 62, -54], spawn (54, -52, N)
  {
    buildVenueStory(
      ops,
      46,
      2,
      -68,
      62,
      -54,
      VOXEL_ID.BRICK,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.CONCRETE,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 46, 6, -68, 62, -54, VOXEL_ID.RED_ROOF, VOXEL_ID.WHITE_WALL);
    // Rescue watchtower on corner
    fillBox(58, 7, -67, 61, 9, -64, VOXEL_ID.BRICK);
    fillBox(58, 10, -67, 61, 10, -64, VOXEL_ID.RED_ROOF);
    set(59, 8, -64, VOXEL_ID.GLASS);
    set(60, 8, -64, VOXEL_ID.GLASS);

    addDoubleDoor(ops, 53, 2, -54, true, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    addGlassSpan(ops, 48, 2, -54, 51, -54);
    addGlassSpan(ops, 57, 2, -54, 60, -54);
    // Mini blocky red rescue rig parked inside bay!
    placeFixedBox(ops, 49, 2, -65, 52, 2, -59, VOXEL_ID.CHARCOAL_TRIM);
    placeFixedBox(ops, 49, 3, -65, 52, 4, -59, VOXEL_ID.CORAL_WALL);
    placeFixedBox(ops, 49, 4, -60, 52, 4, -59, VOXEL_ID.GLASS);
    set(50, 5, -62, VOXEL_ID.LAMP_BLOCK);
    // Crew kitchen & rest lounge
    placeFixedBox(ops, 57, 2, -66, 60, 2, -66, VOXEL_ID.KITCHEN_COUNTER);
    set(59, 2, -60, VOXEL_ID.SOFA_CORAL);
    set(60, 2, -60, VOXEL_ID.SOFA_CORAL);
  }

  // =========================================================================
  // EAST MARKET & PLAZA (Faces West x0 = 50/74 -> spawns at x = 48 / 71)
  // =========================================================================

  // 6. SUPERMARKET [50, -40, 66, -24], spawn (48, -32, E)
  {
    buildVenueStory(
      ops,
      50,
      2,
      -40,
      66,
      -24,
      VOXEL_ID.MINT_WALL,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 50, 6, -40, 66, -24, VOXEL_ID.MINT_WALL, VOXEL_ID.WHITE_WALL);
    addDoubleDoor(ops, 50, 2, -33, false, VOXEL_ID.WHITE_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    addGlassSpan(ops, 50, 2, -38, 50, -35);
    addGlassSpan(ops, 50, 2, -29, 50, -26);
    // Checkout counter & grocery shelves + fridge wall
    placeFixedBox(ops, 53, 2, -28, 55, 2, -26, VOXEL_ID.KITCHEN_COUNTER);
    placeFixedBox(ops, 58, 2, -38, 63, 3, -38, VOXEL_ID.CUPBOARD_OAK);
    placeFixedBox(ops, 58, 2, -34, 63, 3, -34, VOXEL_ID.CUPBOARD_WHITE);
    placeFixedBox(ops, 58, 2, -29, 63, 3, -29, VOXEL_ID.CUPBOARD_SKY);
    placeFixedBox(ops, 64, 2, -38, 64, 4, -27, VOXEL_ID.FRIDGE);
  }

  // 7. COFFEE SHOP [50, -18, 62, -6], spawn (48, -12, E)
  {
    buildVenueStory(
      ops,
      50,
      2,
      -18,
      62,
      -6,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.PLANKS,
      VOXEL_ID.OAK_FLOOR,
      VOXEL_ID.CREAM_WALL,
    );
    addFlatRoof(ops, 50, 6, -18, 62, -6, VOXEL_ID.SLATE_ROOF, VOXEL_ID.PLANKS);
    // Warm striped awning above entrance
    fillBox(49, 5, -15, 49, 5, -9, VOXEL_ID.CORAL_WALL);
    addDoubleDoor(ops, 50, 2, -13, false, VOXEL_ID.PLANKS, VOXEL_ID.DOOR_WOOD_CLOSED);
    addGlassSpan(ops, 50, 2, -16, 50, -15);
    addGlassSpan(ops, 50, 2, -9, 50, -8);
    // Espresso bar & cafe booths
    placeFixedBox(ops, 57, 2, -16, 60, 2, -11, VOXEL_ID.KITCHEN_COUNTER);
    placeFixedBlock(ops, 60, 3, -14, VOXEL_ID.STOVE);
    set(53, 2, -16, VOXEL_ID.TABLE_WHITE);
    set(53, 2, -15, VOXEL_ID.CHAIR_PINK);
    set(53, 2, -8, VOXEL_ID.TABLE_WHITE);
    set(54, 2, -8, VOXEL_ID.CHAIR_OAK);
    set(55, 2, -8, VOXEL_ID.PLANT_POT);
  }

  // 8. SHOPPING MALL [74, -14, 94, 14], spawn (71, 0, E) — Grand 2-Story Atrium Mall
  {
    buildVenueStory(
      ops,
      74,
      2,
      -14,
      94,
      14,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.CORAL_WALL,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    buildVenueStory(
      ops,
      74,
      7,
      -14,
      94,
      14,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.CORAL_WALL,
      VOXEL_ID.CARPET_CORAL,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 74, 11, -14, 94, 14, VOXEL_ID.SLATE_ROOF, VOXEL_ID.CORAL_WALL);
    // Skylight glass atrium ceiling over center
    fillBox(80, 11, -5, 88, 11, 5, VOXEL_ID.GLASS);
    // Open central atrium view from 2F floor slab
    fillBox(81, 6, -4, 87, 6, 4, VOXEL_ID.AIR);

    addDoubleDoor(ops, 74, 2, -1, false, VOXEL_ID.CORAL_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    addGlassSpan(ops, 74, 2, -11, 74, -4);
    addGlassSpan(ops, 74, 2, 3, 74, 11);
    addGlassSpan(ops, 74, 7, -10, 74, 10);

    // Grand mall staircase on north atrium side up to 2nd floor
    addVenueStairs(ops, 82, 2, -8, 1, 0, 1, 2, VOXEL_ID.CONCRETE);

    // Central mall fountain & Furniture Store showroom displays (fixed showcase furniture)
    placeFixedBox(ops, 83, 2, -1, 85, 2, 1, VOXEL_ID.SKY_WALL);
    placeFixedBlock(ops, 84, 3, 0, VOXEL_ID.FLOWER_VASE);
    // North Furniture Showroom Bay (Living, Bedroom & Electronics)
    fillBox(76, 1, -12, 80, 1, -10, VOXEL_ID.CARPET_BLUE);
    placeFixedBox(ops, 76, 2, -13, 79, 2, -13, VOXEL_ID.SOFA_CORAL);
    placeFixedBlock(ops, 77, 2, -11, VOXEL_ID.TABLE_GLASS);
    placeFixedBlock(ops, 80, 2, -12, VOXEL_ID.DESK_LAMP);
    placeFixedBlock(ops, 80, 2, -11, VOXEL_ID.TV_SCREEN);
    placeFixedBox(ops, 87, 2, -13, 88, 2, -13, VOXEL_ID.BED_CORAL);
    placeFixedBox(ops, 91, 2, -13, 92, 2, -13, VOXEL_ID.BED_MINT);
    placeFixedBox(ops, 92, 2, -10, 92, 3, -9, VOXEL_ID.CUPBOARD_OAK);

    // South Furniture Showroom Bay (Dining, Kitchen, Chairs & Bathroom)
    fillBox(76, 1, 8, 82, 1, 12, VOXEL_ID.CARPET_CORAL);
    placeFixedBlock(ops, 77, 2, 9, VOXEL_ID.CHAIR_PINK);
    placeFixedBlock(ops, 78, 2, 9, VOXEL_ID.TABLE_WHITE);
    placeFixedBlock(ops, 79, 2, 9, VOXEL_ID.CHAIR_SKY);
    placeFixedBlock(ops, 80, 2, 9, VOXEL_ID.CHAIR_MINT);
    placeFixedBox(ops, 77, 2, 12, 80, 2, 12, VOXEL_ID.SOFA_MINT);
    placeFixedBox(ops, 86, 2, 12, 87, 2, 12, VOXEL_ID.KITCHEN_COUNTER);
    placeFixedBlock(ops, 88, 2, 12, VOXEL_ID.STOVE);
    placeFixedBlock(ops, 89, 2, 12, VOXEL_ID.FRIDGE);
    placeFixedBox(ops, 91, 2, 12, 92, 2, 12, VOXEL_ID.BATHTUB);
    placeFixedBlock(ops, 92, 2, 9, VOXEL_ID.TOILET);
    placeFixedBlock(ops, 84, 2, 12, VOXEL_ID.CUPBOARD_WHITE);
    placeFixedBlock(ops, 83, 2, 8, VOXEL_ID.PLANT_POT);

    // 2F Food court & toy corner
    set(88, 7, -10, VOXEL_ID.TABLE_GLASS);
    set(87, 7, -10, VOXEL_ID.CHAIR_PINK);
    set(89, 7, -10, VOXEL_ID.CHAIR_SKY);
    set(90, 7, 9, VOXEL_ID.PLUSH_DECOR);
    set(90, 7, 10, VOXEL_ID.GIFT_BOX);
  }

  // 9. RESTAURANT [50, 6, 64, 20], spawn (48, 13, E)
  {
    buildVenueStory(
      ops,
      50,
      2,
      6,
      64,
      20,
      VOXEL_ID.CORAL_WALL,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.OAK_FLOOR,
      VOXEL_ID.CREAM_WALL,
    );
    addFlatRoof(ops, 50, 6, 6, 64, 20, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL);
    addDoubleDoor(ops, 50, 2, 12, false, VOXEL_ID.CREAM_WALL, VOXEL_ID.DOOR_WHITE_CLOSED);
    addGlassSpan(ops, 50, 2, 8, 50, 10);
    addGlassSpan(ops, 50, 2, 15, 50, 18);
    // Open chef kitchen + dining tables with flowers
    placeFixedBox(ops, 60, 2, 8, 62, 2, 18, VOXEL_ID.KITCHEN_COUNTER);
    placeFixedBlock(ops, 62, 2, 11, VOXEL_ID.STOVE);
    placeFixedBlock(ops, 62, 2, 15, VOXEL_ID.FRIDGE);
    set(55, 2, 9, VOXEL_ID.TABLE_WHITE);
    set(55, 3, 9, VOXEL_ID.FLOWER_VASE);
    set(54, 2, 9, VOXEL_ID.CHAIR_PINK);
    set(56, 2, 9, VOXEL_ID.CHAIR_PINK);
    set(55, 2, 17, VOXEL_ID.TABLE_WHITE);
    set(55, 3, 17, VOXEL_ID.FLOWER_VASE);
    set(54, 2, 17, VOXEL_ID.CHAIR_MINT);
    set(56, 2, 17, VOXEL_ID.CHAIR_MINT);
  }

  // =========================================================================
  // WEST ARCADE & NIGHTLIFE (Faces East x1 = -50 -> spawns at x = -48)
  // =========================================================================

  // 10. GAME CENTER [-64, -40, -50, -26], spawn (-48, -33, W)
  {
    buildVenueStory(
      ops,
      -64,
      2,
      -40,
      -50,
      -26,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.CARPET_BLUE,
      VOXEL_ID.CHARCOAL_TRIM,
    );
    addFlatRoof(ops, -64, 6, -40, -50, -26, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.SKY_WALL);
    addDoubleDoor(ops, -50, 2, -34, false, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    addGlassSpan(ops, -50, 2, -38, -50, -36);
    addGlassSpan(ops, -50, 2, -30, -50, -28);
    // Glowing arcade cabinets along the walls!
    for (let az = -38; az <= -28; az += 2) {
      placeFixedBlock(ops, -62, 2, az, VOXEL_ID.CHARCOAL_TRIM);
      placeFixedBlock(ops, -62, 3, az, VOXEL_ID.TV_SCREEN);
    }
    placeFixedBlock(ops, -56, 2, -38, VOXEL_ID.GIFT_BOX);
    placeFixedBlock(ops, -55, 2, -38, VOXEL_ID.PLUSH_DECOR);
    set(-56, 2, -30, VOXEL_ID.SOFA_CORAL);
    set(-55, 2, -30, VOXEL_ID.SOFA_CORAL);
  }

  // 11. CINEMA [-66, -20, -50, -6], spawn (-48, -13, W)
  {
    buildVenueStory(
      ops,
      -66,
      2,
      -20,
      -50,
      -6,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.CORAL_WALL,
      VOXEL_ID.CARPET_CORAL,
      VOXEL_ID.CHARCOAL_TRIM,
    );
    addFlatRoof(ops, -66, 6, -20, -50, -6, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.CORAL_WALL);
    // Illuminated cinema marquee over entrance
    fillBox(-49, 5, -16, -49, 5, -10, VOXEL_ID.LAMP_BLOCK);
    addDoubleDoor(ops, -50, 2, -14, false, VOXEL_ID.CORAL_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    addGlassSpan(ops, -50, 2, -18, -50, -16);
    addGlassSpan(ops, -50, 2, -10, -50, -8);
    // Giant movie screen on far west wall + red theater seating rows
    placeFixedBox(ops, -64, 3, -17, -64, 5, -9, VOXEL_ID.TV_SCREEN);
    for (let z = -16; z <= -10; z += 2) {
      set(-59, 2, z, VOXEL_ID.CHAIR_PINK);
      set(-56, 2, z, VOXEL_ID.CHAIR_PINK);
    }
    placeFixedBox(ops, -53, 2, -18, -52, 2, -17, VOXEL_ID.KITCHEN_COUNTER);
  }

  // 12. DANCE CLUB [-64, 6, -50, 20], spawn (-48, 13, W)
  {
    buildVenueStory(
      ops,
      -64,
      2,
      6,
      -50,
      20,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.CORAL_WALL,
      VOXEL_ID.CARPET_BLUE,
      VOXEL_ID.CHARCOAL_TRIM,
    );
    addFlatRoof(ops, -64, 6, 6, -50, 20, VOXEL_ID.SLATE_ROOF, VOXEL_ID.SKY_WALL);
    addDoubleDoor(ops, -50, 2, 12, false, VOXEL_ID.SKY_WALL, VOXEL_ID.DOOR_CORAL_CLOSED);
    addGlassSpan(ops, -50, 2, 8, -50, 10);
    addGlassSpan(ops, -50, 2, 15, -50, 18);
    // Glowing checkered dance floor + DJ stage
    for (let dz = 10; dz <= 16; dz++) {
      for (let dx = -59; dx <= -53; dx++) {
        set(dx, 1, dz, (dx + dz) % 2 === 0 ? VOXEL_ID.SKY_WALL : VOXEL_ID.CORAL_WALL);
      }
    }
    placeFixedBox(ops, -62, 2, 10, -61, 2, 16, VOXEL_ID.LAMP_BLOCK);
    placeFixedBlock(ops, -62, 3, 13, VOXEL_ID.TV_SCREEN);
    set(-57, 5, 13, VOXEL_ID.LAMP_BLOCK);
    set(-56, 2, 8, VOXEL_ID.SOFA_CORAL);
    set(-55, 2, 8, VOXEL_ID.SOFA_CORAL);
    set(-56, 2, 18, VOXEL_ID.SOFA_MINT);
    set(-55, 2, 18, VOXEL_ID.SOFA_MINT);
  }

  // =========================================================================
  // SOUTH BOULEVARD & COAST (Faces North z0 = 52 -> spawns at z = 50)
  // =========================================================================

  // 13. GYM [-22, 52, -6, 66], spawn (-14, 50, S)
  {
    buildVenueStory(
      ops,
      -22,
      2,
      52,
      -6,
      66,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.MINT_WALL,
      VOXEL_ID.CONCRETE,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, -22, 6, 52, -6, 66, VOXEL_ID.SLATE_ROOF, VOXEL_ID.MINT_WALL);
    addDoubleDoor(ops, -15, 2, 52, true, VOXEL_ID.MINT_WALL, VOXEL_ID.DOOR_MINT_CLOSED);
    addGlassSpan(ops, -20, 2, 52, -18, 52);
    addGlassSpan(ops, -11, 2, 52, -8, 52);
    // Blue exercise mats, locker wall, and hydration counter
    fillBox(-19, 1, 56, -15, 1, 62, VOXEL_ID.CARPET_BLUE);
    placeFixedBox(ops, -20, 2, 64, -16, 3, 64, VOXEL_ID.CUPBOARD_SKY);
    placeFixedBox(ops, -11, 2, 57, -9, 2, 61, VOXEL_ID.CHARCOAL_TRIM);
    placeFixedBlock(ops, -9, 2, 55, VOXEL_ID.SINK_COUNTER);
    set(-19, 2, 54, VOXEL_ID.CHAIR_MINT);
  }

  // 14. HOTEL [6, 52, 22, 70], spawn (14, 50, S) — 2-Story Resort Hotel
  {
    buildVenueStory(
      ops,
      6,
      2,
      52,
      22,
      70,
      VOXEL_ID.CREAM_WALL,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    buildVenueStory(
      ops,
      6,
      7,
      52,
      22,
      70,
      VOXEL_ID.WHITE_WALL,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.CARPET_CORAL,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 6, 11, 52, 22, 70, VOXEL_ID.RED_ROOF, VOXEL_ID.CREAM_WALL);
    addDoubleDoor(ops, 13, 2, 52, true, VOXEL_ID.SKY_WALL, VOXEL_ID.DOOR_WHITE_CLOSED);
    addGlassSpan(ops, 8, 2, 52, 11, 52);
    addGlassSpan(ops, 17, 2, 52, 20, 52);
    addGlassSpan(ops, 8, 7, 52, 20, 52);

    // Grand lobby staircase to 2F suites
    addVenueStairs(ops, 8, 2, 59, 0, 1, 2, 1, VOXEL_ID.OAK_FLOOR);

    // 1F Reception & lobby lounge
    placeFixedBox(ops, 16, 2, 56, 19, 2, 58, VOXEL_ID.KITCHEN_COUNTER);
    set(18, 3, 57, VOXEL_ID.FLOWER_VASE);
    set(12, 2, 64, VOXEL_ID.SOFA_CREAM);
    set(13, 2, 64, VOXEL_ID.SOFA_CREAM);
    set(15, 2, 64, VOXEL_ID.TABLE_GLASS);
    // 2F Cozy Guest Suites
    placeFixedBlock(ops, 18, 7, 67, VOXEL_ID.BED_CORAL);
    placeFixedBlock(ops, 17, 7, 67, VOXEL_ID.DESK_LAMP);
    placeFixedBlock(ops, 10, 7, 67, VOXEL_ID.BED_MINT);
    set(14, 7, 67, VOXEL_ID.TV_SCREEN);
    set(14, 7, 56, VOXEL_ID.PLANT_POT);
  }

  // 15. CAR SHOWROOM [28, 52, 46, 68], spawn (37, 50, S)
  {
    buildVenueStory(
      ops,
      28,
      2,
      52,
      46,
      68,
      VOXEL_ID.SKY_WALL,
      VOXEL_ID.CHARCOAL_TRIM,
      VOXEL_ID.TILE_FLOOR,
      VOXEL_ID.WHITE_WALL,
    );
    addFlatRoof(ops, 28, 6, 52, 46, 68, VOXEL_ID.SLATE_ROOF, VOXEL_ID.SKY_WALL);
    addDoubleDoor(ops, 36, 2, 52, true, VOXEL_ID.CHARCOAL_TRIM, VOXEL_ID.DOOR_SKY_CLOSED);
    // Panoramic floor-to-ceiling showroom display windows
    addGlassSpan(ops, 30, 2, 52, 34, 52);
    addGlassSpan(ops, 40, 2, 52, 44, 52);
    addGlassSpan(ops, 28, 2, 55, 28, 64);
    addGlassSpan(ops, 46, 2, 55, 46, 64);
    // Two blocky showroom display cars on turntables!
    // Car 1 (Sport Red)
    placeFixedBox(ops, 31, 2, 58, 34, 2, 63, VOXEL_ID.CORAL_WALL);
    placeFixedBox(ops, 32, 3, 59, 33, 3, 61, VOXEL_ID.GLASS);
    // Car 2 (Mint GT)
    placeFixedBox(ops, 40, 2, 58, 43, 2, 63, VOXEL_ID.MINT_WALL);
    placeFixedBox(ops, 41, 3, 59, 42, 3, 61, VOXEL_ID.GLASS);
    placeFixedBox(ops, 36, 2, 65, 38, 2, 65, VOXEL_ID.TABLE_WHITE);
  }

  // 16. EXPANDED BEACH & SHALLOW OCEAN BAY [-78, 130, 78, 175], spawn (0, 131, S)
  //     (Beach sand, boardwalk, and palm trees remain unchanged & normal; kiosk/lamps/umbrellas fixed)
  {
    // Boardwalk promenade strip connecting South Ave cleanly across wide coastline
    rawOps.fillBox(-78, 1, 130, 78, 1, 133, VOXEL_ID.SIDEWALK);
    for (const lx of [-72, -58, -40, -20, -3, 3, 20, 40, 58, 72]) {
      placeFixedBlock(rawOps, lx, 2, 133, VOXEL_ID.LAMP_BLOCK);
    }

    // Wide golden sandy beach shoreline (dry beach walk surface y = 2)
    rawOps.fillBox(-78, 1, 134, 78, 1, 155, VOXEL_ID.SAND);

    // Shallow wading shelf (z = 156..158 at y = 1) tapering into deeper dive basin (z = 159..190)
    rawOps.fillBox(-78, 0, 156, 78, 0, 158, VOXEL_ID.SAND);
    rawOps.fillBox(-78, 1, 156, 78, 1, 158, VOXEL_ID.AIR);
    rawOps.fillBox(-78, 0, 159, 78, 0, 190, VOXEL_ID.AIR);
    rawOps.fillBox(-78, 1, 159, 78, 1, 190, VOXEL_ID.AIR);

    // Central wooden pier extending out over the sand and slightly into clear shallow water
    rawOps.fillBox(-2, 1, 134, 2, 1, 157, VOXEL_ID.PLANKS);
    placeFixedBlock(rawOps, -3, 2, 155, VOXEL_ID.LAMP_BLOCK);
    placeFixedBlock(rawOps, 3, 2, 155, VOXEL_ID.LAMP_BLOCK);

    // Colorful beach umbrellas with white side tables between permanent ocean-facing 3D loungers
    const addUmbrellaStation = (ux: number, uz: number, canopyId: VoxelId) => {
      placeFixedBox(rawOps, ux, 2, uz, ux, 4, uz, VOXEL_ID.CHARCOAL_TRIM);
      placeFixedBox(rawOps, ux - 1, 5, uz - 1, ux + 1, 5, uz + 1, canopyId);
      placeFixedBlock(rawOps, ux, 2, uz - 1, VOXEL_ID.TABLE_WHITE);
    };
    addUmbrellaStation(-68, 142, VOXEL_ID.SKY_WALL);
    addUmbrellaStation(-48, 142, VOXEL_ID.CORAL_WALL);
    addUmbrellaStation(-32, 142, VOXEL_ID.SKY_WALL);
    addUmbrellaStation(-16, 142, VOXEL_ID.MINT_WALL);
    addUmbrellaStation(16, 142, VOXEL_ID.RED_ROOF);
    addUmbrellaStation(32, 142, VOXEL_ID.SKY_WALL);
    addUmbrellaStation(48, 142, VOXEL_ID.CORAL_WALL);
    addUmbrellaStation(68, 142, VOXEL_ID.MINT_WALL);
    addUmbrellaStation(-22, 150, VOXEL_ID.MINT_WALL);
    addUmbrellaStation(22, 150, VOXEL_ID.CORAL_WALL);

    // Coastal palm trees framing the expanded beach
    addPalmTree(rawOps, -72, 138);
    addPalmTree(rawOps, -58, 138);
    addPalmTree(rawOps, -41, 137);
    addPalmTree(rawOps, -10, 139);
    addPalmTree(rawOps, 10, 139);
    addPalmTree(rawOps, 41, 137);
    addPalmTree(rawOps, 58, 138);
    addPalmTree(rawOps, 72, 138);
    addPalmTree(rawOps, -69, 151);
    addPalmTree(rawOps, -54, 151);
    addPalmTree(rawOps, 54, 151);
    addPalmTree(rawOps, 69, 151);

    // Beach snack bar kiosk & ocean-facing seating (+Z faces the waves)
    rawOps.fillBox(7, 2, 134, 12, 2, 134, VOXEL_ID.KITCHEN_COUNTER);
    rawOps.fillBox(7, 5, 134, 12, 5, 136, VOXEL_ID.RED_ROOF);
    rawOps.set(7, 3, 134, VOXEL_ID.CHARCOAL_TRIM);
    rawOps.set(7, 4, 134, VOXEL_ID.CHARCOAL_TRIM);
    rawOps.set(12, 3, 134, VOXEL_ID.CHARCOAL_TRIM);
    rawOps.set(12, 4, 134, VOXEL_ID.CHARCOAL_TRIM);
    // All beach patio chairs strictly face +Z (south toward the ocean)
    rawOps.set(8, 2, 136, VOXEL_ID.CHAIR_OAK);
    rawOps.set(9, 2, 137, VOXEL_ID.TABLE_WHITE);
    rawOps.set(10, 2, 136, VOXEL_ID.CHAIR_OAK);
    rawOps.set(11, 2, 136, VOXEL_ID.CHAIR_MINT);

    // Lifeguard watch platform on west beach with ocean-facing chair
    rawOps.fillBox(-26, 2, 136, -24, 2, 136, VOXEL_ID.PLANKS);
    rawOps.set(-25, 2, 137, VOXEL_ID.CHAIR_SKY);
  }
}
