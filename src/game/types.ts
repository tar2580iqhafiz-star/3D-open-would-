export type MovementGait = 'idle' | 'walk' | 'run' | 'jump';

export type PlaceableBlock = 'grass' | 'dirt' | 'stone';

export type CameraMode = 'back' | 'front' | 'orbit';

export type PlayerPoseMode = 'normal' | 'dance' | 'sit' | 'sleep' | 'swim' | 'dive' | 'fly';

export const VOXEL_ID = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG: 5,
  LEAVES: 6,
  MOSS_STONE: 7,
  ASPHALT: 8,
  ROAD_LINE: 9,
  BRICK: 10,
  PLANKS: 11,
  CONCRETE: 12,
  GLASS: 13,
  ROAD_LINE_EW: 14,
  ROAD_EDGE_W: 15,
  ROAD_EDGE_E: 16,
  ROAD_EDGE_N: 17,
  ROAD_EDGE_S: 18,
  ROAD_CROSSWALK_NS: 19,
  ROAD_CROSSWALK_EW: 20,
  SIDEWALK: 21,
  ROAD_DRAIN: 22,
  // Modern School Party Craft architectural & interior furniture blocks
  WHITE_WALL: 23,
  CREAM_WALL: 24,
  MINT_WALL: 25,
  SKY_WALL: 26,
  CORAL_WALL: 27,
  CHARCOAL_TRIM: 28,
  OAK_FLOOR: 29,
  TILE_FLOOR: 30,
  SLATE_ROOF: 31,
  RED_ROOF: 32,
  BED_HEAD: 33,
  BED_FOOT: 34,
  SOFA: 35,
  TABLE: 36,
  KITCHEN_COUNTER: 37,
  STOVE: 38,
  FRIDGE: 39,
  SINK_COUNTER: 40,
  TOILET: 41,
  BATHTUB: 42,
  TV_SCREEN: 43,
  BOOKSHELF: 44,
  LAMP_BLOCK: 45,
  DOOR_BLOCK: 46,
  DOOR_WOOD_CLOSED: 46,
  CARPET_BLUE: 47,
  CARPET_CORAL: 48,
  DOOR_WOOD_OPEN: 49,
  DOOR_WHITE_CLOSED: 50,
  DOOR_WHITE_OPEN: 51,
  DOOR_MINT_CLOSED: 52,
  DOOR_MINT_OPEN: 53,
  DOOR_SKY_CLOSED: 54,
  DOOR_SKY_OPEN: 55,
  DOOR_CORAL_CLOSED: 56,
  DOOR_CORAL_OPEN: 57,
  // Styled furniture & small decorative items (School Party Craft)
  CHAIR_OAK: 58,
  CHAIR_PINK: 59,
  CHAIR_SKY: 60,
  CHAIR_MINT: 61,
  TABLE_WHITE: 62,
  TABLE_GLASS: 63,
  SOFA_CORAL: 64,
  SOFA_MINT: 65,
  SOFA_CREAM: 66,
  BED_CORAL: 67,
  BED_MINT: 68,
  CUPBOARD_OAK: 69,
  CUPBOARD_WHITE: 70,
  CUPBOARD_SKY: 71,
  PLANT_POT: 72,
  FLOWER_VASE: 73,
  DESK_LAMP: 74,
  PLUSH_DECOR: 75,
  GIFT_BOX: 76,
  // Varied forest wood, foliage, wildflowers & tall grass
  BIRCH_LOG: 77,
  PINE_LOG: 78,
  BIRCH_LEAVES: 79,
  PINE_LEAVES: 80,
  DARK_LEAVES: 81,
  FLOWER_RED: 82,
  FLOWER_YELLOW: 83,
  TALL_GRASS: 84,
  FERN_BUSH: 85,
} as const;

export type VoxelId = number;

export interface JoystickVector {
  x: number; // -1 (left) to +1 (right)
  y: number; // -1 (backward) to +1 (forward)
}

export interface GameSettings {
  cameraSensitivity: number; // 0.4 to 2.0
  soundEnabled: boolean;
  invertCameraY: boolean;
}

export interface WorldCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
  baseY: number;
}

export interface HudSnapshot {
  gait: MovementGait;
  speedMs: number;
  grounded: boolean;
  headingDeg: number;
  hasTargetBlock: boolean;
  targetIsFixed: boolean;
  cameraMode: CameraMode;
  playerX: number;
  playerZ: number;
  isDancing: boolean;
  isFlying: boolean;
  inShallowWater: boolean;
  isUnderwater: boolean;
  inDanceClub: boolean;
  danceMusicPlaying: boolean;
  danceMusicPowerOn: boolean;
  danceTrackTitle: string;
  danceVolume: number;
  inFurnitureShop: boolean;
  inHomeHouse: boolean;
  currentHouseName: string | null;
  placementMode: 'none' | 'new' | 'edit';
  placementItemName: string | null;
  placementValid: boolean;
  placementReason: string | null;
  interactingMode: 'none' | 'sit' | 'sleep';
  nearbyActionLabel: string | null;
  nearbyPlacedId: string | null;
  nearbyPlacedName: string | null;
  nearbyIsMovable: boolean;
  nearbyScreenX: number | null;
  nearbyScreenY: number | null;
  inVehicle: boolean;
  vehicleName: string | null;
  vehicleSpeedKmh: number;
  nearbyCarId: string | null;
  nearbyCarName: string | null;
  nearbyCarScreenX: number | null;
  nearbyCarScreenY: number | null;
  nearbyChestId: number | null;
  nearbyChestScreenX: number | null;
  nearbyChestScreenY: number | null;
  dayTimeSec: number;
  dayTimeLabel: string;
  dayPhase: 'dawn' | 'day' | 'sunset' | 'night';
}
