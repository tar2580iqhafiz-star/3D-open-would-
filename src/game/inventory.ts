import {
  EXTENDED_INVENTORY_ITEMS,
  EXTENDED_VOXEL_START,
  getExtendedBlockByVoxelId,
} from './blockCatalog';
import { PlaceableBlock, VOXEL_ID, VoxelId } from './types';
import { EXCLUSIVE_XSUIT_CATALOG } from './xSuits';

export type ItemCategory = 'all' | 'blocks' | 'furniture' | 'doors' | 'food' | 'tools' | 'outfits';

export type ConsumableEffect = 'speed' | 'snack' | 'energy';
export type ToolBehavior = 'fast_break';

export type FurnitureInteractionType =
  | 'sit'
  | 'sleep'
  | 'tv_toggle'
  | 'pc_use'
  | 'lamp_toggle'
  | 'open_storage'
  | 'appliance_use';

export interface FurnitureSpec {
  halfW: number;
  height: number;
  halfD: number;
  isCarpet?: boolean;
  interaction?: FurnitureInteractionType;
  actionLabel?: string;
  seatY?: number; // height offset from floor surface when sitting or sleeping
}

export interface InventoryItemDef {
  id: string;
  name: string;
  category: Exclude<ItemCategory, 'all'>;
  description: string;
  accentHex: string;
  bgHex: string;
  voxelId?: VoxelId;
  previewBlock: PlaceableBlock;
  consumableEffect?: ConsumableEffect;
  toolBehavior?: ToolBehavior;
  isHomeFurniture?: boolean;
  isAdExclusive?: boolean;
  furnitureSpec?: FurnitureSpec;
  maxStack: number;
}

export interface InventorySlot {
  itemId: string | null;
  qty: number;
}

export interface InventoryState {
  hotbar: InventorySlot[];
  bag: InventorySlot[];
  selectedHotbarIndex: number;
}

export const HOTBAR_SIZE = 5;
export const BAG_SIZE = 100;
const STORAGE_KEY = 'spc_city_backpack_v1';

export const CATEGORY_TABS: Array<{
  id: ItemCategory;
  label: string;
  accent: string;
}> = [
  { id: 'all', label: 'All', accent: '#38bdf8' },
  { id: 'outfits', label: 'X-Suits', accent: '#ec4899' },
  { id: 'furniture', label: 'Furniture', accent: '#f472b6' },
  { id: 'blocks', label: 'Blocks', accent: '#34d399' },
  { id: 'doors', label: 'Doors', accent: '#fb923c' },
  { id: 'food', label: 'Food', accent: '#facc15' },
  { id: 'tools', label: 'Tools', accent: '#a78bfa' },
];

export const INVENTORY_ITEMS: Record<string, InventoryItemDef> = {
  // ---------------- BLOCKS ----------------
  grass: {
    id: 'grass',
    name: 'Grass Block',
    category: 'blocks',
    description: 'Lush green turf over rich soil for lawns and parks.',
    accentHex: '#5aa838',
    bgHex: '#dcfce7',
    voxelId: VOXEL_ID.GRASS,
    previewBlock: 'grass',
    maxStack: 99,
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt Block',
    category: 'blocks',
    description: 'Packed earth for gardens, paths, and terraforming.',
    accentHex: '#865d3b',
    bgHex: '#fef3c7',
    voxelId: VOXEL_ID.DIRT,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  stone: {
    id: 'stone',
    name: 'Stone Block',
    category: 'blocks',
    description: 'Solid grey masonry for foundations and driveways.',
    accentHex: '#84898e',
    bgHex: '#f1f5f9',
    voxelId: VOXEL_ID.STONE,
    previewBlock: 'stone',
    maxStack: 99,
  },
  planks: {
    id: 'planks',
    name: 'Oak Planks',
    category: 'blocks',
    description: 'Warm timber flooring and cozy modern wall trim.',
    accentHex: '#b8834d',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.PLANKS,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  white_wall: {
    id: 'white_wall',
    name: 'White Stucco',
    category: 'blocks',
    description: 'Crisp bright stucco used in modern city homes.',
    accentHex: '#cbd5e1',
    bgHex: '#f8fafc',
    voxelId: VOXEL_ID.WHITE_WALL,
    previewBlock: 'stone',
    maxStack: 99,
  },
  cream_wall: {
    id: 'cream_wall',
    name: 'Cream Wall',
    category: 'blocks',
    description: 'Soft sunlit cream plaster for warm room interiors.',
    accentHex: '#e7c998',
    bgHex: '#fef9c3',
    voxelId: VOXEL_ID.CREAM_WALL,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  mint_wall: {
    id: 'mint_wall',
    name: 'Mint Wall',
    category: 'blocks',
    description: 'Pastel mint accent wall in School Party Craft style.',
    accentHex: '#34d399',
    bgHex: '#d1fae5',
    voxelId: VOXEL_ID.MINT_WALL,
    previewBlock: 'grass',
    maxStack: 99,
  },
  sky_wall: {
    id: 'sky_wall',
    name: 'Sky Wall',
    category: 'blocks',
    description: 'Fresh sky-blue exterior siding for cheerful houses.',
    accentHex: '#38bdf8',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.SKY_WALL,
    previewBlock: 'stone',
    maxStack: 99,
  },
  coral_wall: {
    id: 'coral_wall',
    name: 'Coral Wall',
    category: 'blocks',
    description: 'Playful coral-pink wall block for modern bedrooms.',
    accentHex: '#fb7185',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.CORAL_WALL,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  brick: {
    id: 'brick',
    name: 'Red Brick',
    category: 'blocks',
    description: 'Classic stacked clay bricks for facades and patios.',
    accentHex: '#c25243',
    bgHex: '#fee2e2',
    voxelId: VOXEL_ID.BRICK,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  slate_roof: {
    id: 'slate_roof',
    name: 'Slate Roof',
    category: 'blocks',
    description: 'Dark architectural roof tile for sleek city roofs.',
    accentHex: '#475569',
    bgHex: '#e2e8f0',
    voxelId: VOXEL_ID.SLATE_ROOF,
    previewBlock: 'stone',
    maxStack: 99,
  },
  red_roof: {
    id: 'red_roof',
    name: 'Terracotta Roof',
    category: 'blocks',
    description: 'Warm red shingle roof block for suburban cottages.',
    accentHex: '#dc4f3e',
    bgHex: '#fee2e2',
    voxelId: VOXEL_ID.RED_ROOF,
    previewBlock: 'dirt',
    maxStack: 99,
  },
  glass: {
    id: 'glass',
    name: 'Clear Glass',
    category: 'blocks',
    description: 'Transparent framed window pane for sunlit rooms.',
    accentHex: '#67e8f9',
    bgHex: '#ecfeff',
    voxelId: VOXEL_ID.GLASS,
    previewBlock: 'stone',
    maxStack: 99,
  },
  asphalt: {
    id: 'asphalt',
    name: 'Road Asphalt',
    category: 'blocks',
    description: 'Smooth dark street paving for city avenues.',
    accentHex: '#334155',
    bgHex: '#e2e8f0',
    voxelId: VOXEL_ID.ASPHALT,
    previewBlock: 'stone',
    maxStack: 99,
  },
  sidewalk: {
    id: 'sidewalk',
    name: 'Sidewalk Tile',
    category: 'blocks',
    description: 'Clean concrete paver block for walkways and plazas.',
    accentHex: '#94a3b8',
    bgHex: '#f1f5f9',
    voxelId: VOXEL_ID.SIDEWALK,
    previewBlock: 'stone',
    maxStack: 99,
  },

  // ---------------- BEDS ----------------
  bed: {
    id: 'bed',
    name: 'Cozy Sky Bed',
    category: 'furniture',
    description: 'Soft modern bed with oak headboard, fluffy pillow, and quilt.',
    accentHex: '#0284c7',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.BED_HEAD,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.56, height: 0.92, halfD: 0.92, interaction: 'sleep', actionLabel: 'SLEEP', seatY: 0.56 },
    maxStack: 32,
  },
  bed_coral: {
    id: 'bed_coral',
    name: 'Coral Dream Bed',
    category: 'furniture',
    description: 'Quilted coral-pink bed with headboard and soft pillow.',
    accentHex: '#fb7185',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.BED_CORAL,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.56, height: 0.92, halfD: 0.92, interaction: 'sleep', actionLabel: 'SLEEP', seatY: 0.56 },
    maxStack: 16,
  },
  bed_mint: {
    id: 'bed_mint',
    name: 'Mint Double Bed',
    category: 'furniture',
    description: 'Fresh pastel mint bed for bright modern bedrooms.',
    accentHex: '#34d399',
    bgHex: '#d1fae5',
    voxelId: VOXEL_ID.BED_MINT,
    previewBlock: 'grass',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.62, height: 0.92, halfD: 0.94, interaction: 'sleep', actionLabel: 'SLEEP', seatY: 0.56 },
    maxStack: 16,
  },

  // ---------------- SOFAS ----------------
  sofa: {
    id: 'sofa',
    name: 'Modern Blue Sofa',
    category: 'furniture',
    description: 'Plush living-room couch with padded armrests and back.',
    accentHex: '#3b82f6',
    bgHex: '#dbeafe',
    voxelId: VOXEL_ID.SOFA,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.85, height: 0.86, halfD: 0.44, interaction: 'sit', actionLabel: 'SIT', seatY: 0.44 },
    maxStack: 32,
  },
  sofa_coral: {
    id: 'sofa_coral',
    name: 'Coral Velvet Sofa',
    category: 'furniture',
    description: 'Plush coral-pink living room sofa for cozy hangouts.',
    accentHex: '#f43f5e',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.SOFA_CORAL,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.85, height: 0.86, halfD: 0.44, interaction: 'sit', actionLabel: 'SIT', seatY: 0.44 },
    maxStack: 16,
  },
  sofa_mint: {
    id: 'sofa_mint',
    name: 'Mint Lounge Sofa',
    category: 'furniture',
    description: 'Soft mint-green lounge couch with wood legs.',
    accentHex: '#10b981',
    bgHex: '#d1fae5',
    voxelId: VOXEL_ID.SOFA_MINT,
    previewBlock: 'grass',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.85, height: 0.86, halfD: 0.44, interaction: 'sit', actionLabel: 'SIT', seatY: 0.44 },
    maxStack: 16,
  },
  sofa_cream: {
    id: 'sofa_cream',
    name: 'Cream Sectional Sofa',
    category: 'furniture',
    description: 'Warm sunlit cream couch with oak trim.',
    accentHex: '#d97706',
    bgHex: '#fef3c7',
    voxelId: VOXEL_ID.SOFA_CREAM,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.85, height: 0.86, halfD: 0.44, interaction: 'sit', actionLabel: 'SIT', seatY: 0.44 },
    maxStack: 16,
  },

  // ---------------- CHAIRS ----------------
  chair_oak: {
    id: 'chair_oak',
    name: 'Oak Dining Chair',
    category: 'furniture',
    description: 'Classic warm oak chair for dining rooms and desks.',
    accentHex: '#b8834d',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.CHAIR_OAK,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.34, height: 0.92, halfD: 0.34, interaction: 'sit', actionLabel: 'SIT', seatY: 0.46 },
    maxStack: 32,
  },
  chair_pink: {
    id: 'chair_pink',
    name: 'Pink Study Chair',
    category: 'furniture',
    description: 'Pastel rose-pink cushioned chair with sleek legs.',
    accentHex: '#ec4899',
    bgHex: '#fce7f3',
    voxelId: VOXEL_ID.CHAIR_PINK,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.34, height: 0.92, halfD: 0.34, interaction: 'sit', actionLabel: 'SIT', seatY: 0.46 },
    maxStack: 32,
  },
  chair_sky: {
    id: 'chair_sky',
    name: 'Sky Lounge Chair',
    category: 'furniture',
    description: 'Bright sky-blue padded chair for bedrooms and studies.',
    accentHex: '#0ea5e9',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.CHAIR_SKY,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.34, height: 0.92, halfD: 0.34, interaction: 'sit', actionLabel: 'SIT', seatY: 0.46 },
    maxStack: 32,
  },
  chair_mint: {
    id: 'chair_mint',
    name: 'Mint Accent Chair',
    category: 'furniture',
    description: 'Fresh mint-green chair with crisp white legs.',
    accentHex: '#10b981',
    bgHex: '#d1fae5',
    voxelId: VOXEL_ID.CHAIR_MINT,
    previewBlock: 'grass',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.34, height: 0.92, halfD: 0.34, interaction: 'sit', actionLabel: 'SIT', seatY: 0.46 },
    maxStack: 32,
  },
  swivel_chair: {
    id: 'swivel_chair',
    name: 'Gaming Swivel Chair',
    category: 'furniture',
    description: 'Ergonomic rolling office & computer chair.',
    accentHex: '#6366f1',
    bgHex: '#e0e7ff',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.38, height: 1.05, halfD: 0.38, interaction: 'sit', actionLabel: 'SIT', seatY: 0.48 },
    maxStack: 16,
  },
  beach_lounger: {
    id: 'beach_lounger',
    name: 'Ocean Beach Chair',
    category: 'furniture',
    description: 'Sunlit poolside and beach lounger facing the ocean breeze.',
    accentHex: '#06b6d4',
    bgHex: '#cffafe',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.4, height: 0.85, halfD: 0.72, interaction: 'sit', actionLabel: 'SIT', seatY: 0.44 },
    maxStack: 16,
  },

  // ---------------- TABLES & DINING TABLES ----------------
  table: {
    id: 'table',
    name: 'Oak Study Table',
    category: 'furniture',
    description: 'Sturdy warm oak desk or side table.',
    accentHex: '#c28549',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.TABLE,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.58, height: 0.78, halfD: 0.42 },
    maxStack: 64,
  },
  table_white: {
    id: 'table_white',
    name: 'White Modern Desk',
    category: 'furniture',
    description: 'Minimalist white study desk with sleek drawers.',
    accentHex: '#94a3b8',
    bgHex: '#f8fafc',
    voxelId: VOXEL_ID.TABLE_WHITE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.6, height: 0.78, halfD: 0.42 },
    maxStack: 32,
  },
  table_glass: {
    id: 'table_glass',
    name: 'Glass Coffee Table',
    category: 'furniture',
    description: 'Clear tempered-glass living room coffee table.',
    accentHex: '#06b6d4',
    bgHex: '#ecfeff',
    voxelId: VOXEL_ID.TABLE_GLASS,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.56, height: 0.5, halfD: 0.4 },
    maxStack: 32,
  },
  dining_table_oak: {
    id: 'dining_table_oak',
    name: 'Oak Dining Table',
    category: 'furniture',
    description: 'Wide family oak dining table for feasts & parties.',
    accentHex: '#b45309',
    bgHex: '#fef3c7',
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.88, height: 0.8, halfD: 0.52 },
    maxStack: 16,
  },
  dining_table_white: {
    id: 'dining_table_white',
    name: 'White Dining Table',
    category: 'furniture',
    description: 'Bright modern dining table with tabletop centerpiece.',
    accentHex: '#38bdf8',
    bgHex: '#f0f9ff',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.88, height: 0.8, halfD: 0.52 },
    maxStack: 16,
  },

  // ---------------- WARDROBES & CUPBOARDS ----------------
  wardrobe_oak: {
    id: 'wardrobe_oak',
    name: 'Oak Wardrobe',
    category: 'furniture',
    description: 'Tall double-door oak closet wardrobe with brass handles.',
    accentHex: '#92400e',
    bgHex: '#ffedd5',
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.62, height: 1.92, halfD: 0.36, interaction: 'open_storage', actionLabel: 'Open Wardrobe' },
    maxStack: 16,
  },
  wardrobe_white: {
    id: 'wardrobe_white',
    name: 'White Closet Wardrobe',
    category: 'furniture',
    description: 'Tall sleek white bedroom wardrobe with full mirror trim.',
    accentHex: '#64748b',
    bgHex: '#f8fafc',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.62, height: 1.92, halfD: 0.36, interaction: 'open_storage', actionLabel: 'Open Wardrobe' },
    maxStack: 16,
  },
  cupboard_oak: {
    id: 'cupboard_oak',
    name: 'Oak Cupboard',
    category: 'furniture',
    description: 'Twin-door oak storage cupboard for kitchens & hallways.',
    accentHex: '#b45309',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.CUPBOARD_OAK,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.48, height: 1.05, halfD: 0.34, interaction: 'open_storage', actionLabel: 'Open' },
    maxStack: 32,
  },
  cupboard_white: {
    id: 'cupboard_white',
    name: 'White Cupboard',
    category: 'furniture',
    description: 'Crisp white modern storage cabinet with silver handles.',
    accentHex: '#94a3b8',
    bgHex: '#f8fafc',
    voxelId: VOXEL_ID.CUPBOARD_WHITE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.48, height: 1.05, halfD: 0.34, interaction: 'open_storage', actionLabel: 'Open' },
    maxStack: 32,
  },
  cupboard_sky: {
    id: 'cupboard_sky',
    name: 'Sky Cupboard',
    category: 'furniture',
    description: 'Pastel sky-blue storage cupboard for stylish rooms.',
    accentHex: '#0284c7',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.CUPBOARD_SKY,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.48, height: 1.05, halfD: 0.34, interaction: 'open_storage', actionLabel: 'Open' },
    maxStack: 32,
  },
  bookshelf: {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'furniture',
    description: 'Tall bookcase filled with colorful novels & school books.',
    accentHex: '#a16207',
    bgHex: '#fef3c7',
    voxelId: VOXEL_ID.BOOKSHELF,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.52, height: 1.65, halfD: 0.28, interaction: 'open_storage', actionLabel: 'Browse Books' },
    maxStack: 64,
  },

  // ---------------- TVS & COMPUTERS ----------------
  tv: {
    id: 'tv',
    name: 'Smart TV Stand',
    category: 'furniture',
    description: 'Wide-screen interactive television on a modern media stand.',
    accentHex: '#1e293b',
    bgHex: '#e2e8f0',
    voxelId: VOXEL_ID.TV_SCREEN,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.72, height: 1.28, halfD: 0.32, interaction: 'tv_toggle', actionLabel: 'TV Power' },
    maxStack: 16,
  },
  computer: {
    id: 'computer',
    name: 'Desktop Computer',
    category: 'furniture',
    description: 'Complete PC workstation with glowing monitor, keyboard & tower.',
    accentHex: '#0ea5e9',
    bgHex: '#e0f2fe',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.62, height: 1.22, halfD: 0.38, interaction: 'pc_use', actionLabel: 'Use PC' },
    maxStack: 16,
  },

  // ---------------- REFRIGERATORS & KITCHEN FURNITURE ----------------
  fridge: {
    id: 'fridge',
    name: 'Mini Fridge',
    category: 'furniture',
    description: 'Compact stainless steel fridge for drinks and snacks.',
    accentHex: '#38bdf8',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.FRIDGE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.42, height: 1.15, halfD: 0.38, interaction: 'open_storage', actionLabel: 'Open Fridge' },
    maxStack: 16,
  },
  fridge_tall: {
    id: 'fridge_tall',
    name: 'Double-Door Fridge',
    category: 'furniture',
    description: 'Tall family freezer & smart refrigerator with water dispenser.',
    accentHex: '#0284c7',
    bgHex: '#f0f9ff',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.48, height: 1.9, halfD: 0.42, interaction: 'open_storage', actionLabel: 'Open Fridge' },
    maxStack: 16,
  },
  counter: {
    id: 'counter',
    name: 'Kitchen Counter',
    category: 'furniture',
    description: 'Sleek marble-top kitchen prep cabinet.',
    accentHex: '#64748b',
    bgHex: '#f1f5f9',
    voxelId: VOXEL_ID.KITCHEN_COUNTER,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.5, height: 0.92, halfD: 0.38, interaction: 'open_storage', actionLabel: 'Open Drawer' },
    maxStack: 64,
  },
  stove: {
    id: 'stove',
    name: 'Kitchen Stove',
    category: 'furniture',
    description: 'Modern 4-burner range oven for home cooking.',
    accentHex: '#ea580c',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.STOVE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.48, height: 0.96, halfD: 0.4, interaction: 'appliance_use', actionLabel: 'Cook' },
    maxStack: 16,
  },
  kitchen_sink: {
    id: 'kitchen_sink',
    name: 'Kitchen Sink Cabinet',
    category: 'furniture',
    description: 'Stainless basin & chrome faucet over wood cabinets.',
    accentHex: '#0ea5e9',
    bgHex: '#ecfeff',
    voxelId: VOXEL_ID.SINK_COUNTER,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.5, height: 1.08, halfD: 0.38, interaction: 'appliance_use', actionLabel: 'Wash' },
    maxStack: 16,
  },

  // ---------------- BATHROOM FURNITURE ----------------
  bathtub: {
    id: 'bathtub',
    name: 'Porcelain Bathtub',
    category: 'furniture',
    description: 'Relaxing deep soaking tub with chrome faucet.',
    accentHex: '#06b6d4',
    bgHex: '#cffafe',
    voxelId: VOXEL_ID.BATHTUB,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.78, height: 0.72, halfD: 0.44, interaction: 'appliance_use', actionLabel: 'Fill Tub' },
    maxStack: 16,
  },
  toilet: {
    id: 'toilet',
    name: 'Modern Toilet',
    category: 'furniture',
    description: 'Clean white porcelain bathroom toilet with tank.',
    accentHex: '#94a3b8',
    bgHex: '#f8fafc',
    voxelId: VOXEL_ID.TOILET,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.32, height: 0.85, halfD: 0.38, interaction: 'appliance_use', actionLabel: 'Flush' },
    maxStack: 16,
  },
  bath_sink: {
    id: 'bath_sink',
    name: 'Bathroom Vanity',
    category: 'furniture',
    description: 'Sleek vanity sink with wall mirror for bathrooms.',
    accentHex: '#38bdf8',
    bgHex: '#f0f9ff',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.44, height: 1.48, halfD: 0.32, interaction: 'appliance_use', actionLabel: 'Use Sink' },
    maxStack: 16,
  },

  // ---------------- LAMPS & CARPETS ----------------
  desk_lamp: {
    id: 'desk_lamp',
    name: 'Bedside Lamp',
    category: 'furniture',
    description: 'Warm glowing shade lamp with toggleable light.',
    accentHex: '#eab308',
    bgHex: '#fef9c3',
    voxelId: VOXEL_ID.DESK_LAMP,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.24, height: 0.62, halfD: 0.24, interaction: 'lamp_toggle', actionLabel: 'Lamp' },
    maxStack: 32,
  },
  floor_lamp: {
    id: 'floor_lamp',
    name: 'Standing Floor Lamp',
    category: 'furniture',
    description: 'Tall cozy living room standing lamp.',
    accentHex: '#f59e0b',
    bgHex: '#fef3c7',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.28, height: 1.72, halfD: 0.28, interaction: 'lamp_toggle', actionLabel: 'Lamp' },
    maxStack: 16,
  },
  lamp: {
    id: 'lamp',
    name: 'Cube Glow Lamp',
    category: 'furniture',
    description: 'Warm modern cube accent light for rooms.',
    accentHex: '#eab308',
    bgHex: '#fef9c3',
    voxelId: VOXEL_ID.LAMP_BLOCK,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.26, height: 0.52, halfD: 0.26, interaction: 'lamp_toggle', actionLabel: 'Lamp' },
    maxStack: 64,
  },
  carpet_blue: {
    id: 'carpet_blue',
    name: 'Sky Blue Rug',
    category: 'furniture',
    description: 'Soft sky-blue woven area rug for bedrooms & lounges.',
    accentHex: '#2563eb',
    bgHex: '#dbeafe',
    voxelId: VOXEL_ID.CARPET_BLUE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 1.05, height: 0.05, halfD: 0.78, isCarpet: true },
    maxStack: 99,
  },
  carpet_coral: {
    id: 'carpet_coral',
    name: 'Coral Woven Rug',
    category: 'furniture',
    description: 'Warm coral-pink patterned area rug for cozy living rooms.',
    accentHex: '#f43f5e',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.CARPET_CORAL,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 1.05, height: 0.05, halfD: 0.78, isCarpet: true },
    maxStack: 99,
  },
  carpet_mint: {
    id: 'carpet_mint',
    name: 'Mint Pastel Rug',
    category: 'furniture',
    description: 'Soft mint-green striped rug for modern interiors.',
    accentHex: '#10b981',
    bgHex: '#d1fae5',
    previewBlock: 'grass',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 1.05, height: 0.05, halfD: 0.78, isCarpet: true },
    maxStack: 99,
  },

  // ---------------- DECORATIONS & OTHER HOUSEHOLD ITEMS ----------------
  plant_pot: {
    id: 'plant_pot',
    name: 'Potted Plant',
    category: 'furniture',
    description: 'Lush leafy indoor houseplant in a terracotta pot.',
    accentHex: '#16a34a',
    bgHex: '#dcfce7',
    voxelId: VOXEL_ID.PLANT_POT,
    previewBlock: 'grass',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.28, height: 0.92, halfD: 0.28 },
    maxStack: 32,
  },
  flower_vase: {
    id: 'flower_vase',
    name: 'Flower Vase',
    category: 'furniture',
    description: 'Ceramic sky-blue vase with colorful blooms.',
    accentHex: '#ec4899',
    bgHex: '#fce7f3',
    voxelId: VOXEL_ID.FLOWER_VASE,
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.22, height: 0.58, halfD: 0.22 },
    maxStack: 32,
  },
  plush_decor: {
    id: 'plush_decor',
    name: 'Gold Star Trophy',
    category: 'furniture',
    description: 'Shiny golden star decor award on an oak pedestal.',
    accentHex: '#f59e0b',
    bgHex: '#fef3c7',
    voxelId: VOXEL_ID.PLUSH_DECOR,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.24, height: 0.62, halfD: 0.24 },
    maxStack: 32,
  },
  gift_box: {
    id: 'gift_box',
    name: 'Party Gift Box',
    category: 'furniture',
    description: 'Festive pink gift box wrapped with a bright gold ribbon.',
    accentHex: '#e11d48',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.GIFT_BOX,
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.26, height: 0.48, halfD: 0.26, interaction: 'open_storage', actionLabel: 'Open Gift' },
    maxStack: 32,
  },
  wall_clock: {
    id: 'wall_clock',
    name: 'Grandfather Clock',
    category: 'furniture',
    description: 'Classic standing home clock with golden chime face.',
    accentHex: '#d97706',
    bgHex: '#fef3c7',
    previewBlock: 'dirt',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.28, height: 1.8, halfD: 0.24, interaction: 'appliance_use', actionLabel: 'Chime' },
    maxStack: 16,
  },
  washer: {
    id: 'washer',
    name: 'Washing Machine',
    category: 'furniture',
    description: 'Front-load home laundry washer with glass door.',
    accentHex: '#38bdf8',
    bgHex: '#f1f5f9',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.42, height: 0.94, halfD: 0.4, interaction: 'appliance_use', actionLabel: 'Start Wash' },
    maxStack: 16,
  },
  trash_bin: {
    id: 'trash_bin',
    name: 'Pedal Trash Bin',
    category: 'furniture',
    description: 'Neat brushed-steel kitchen & study bin.',
    accentHex: '#64748b',
    bgHex: '#f1f5f9',
    previewBlock: 'stone',
    isHomeFurniture: true,
    furnitureSpec: { halfW: 0.22, height: 0.56, halfD: 0.22, interaction: 'open_storage', actionLabel: 'Open' },
    maxStack: 32,
  },

  // ---------------- DOORS ----------------
  door_wood: {
    id: 'door_wood',
    name: 'Oak Door',
    category: 'doors',
    description: 'Classic hinged wooden door that swings open automatically.',
    accentHex: '#b45309',
    bgHex: '#ffedd5',
    voxelId: VOXEL_ID.DOOR_WOOD_CLOSED,
    previewBlock: 'dirt',
    maxStack: 16,
  },
  door_white: {
    id: 'door_white',
    name: 'White Door',
    category: 'doors',
    description: 'Clean white modern interior door with smooth swing.',
    accentHex: '#94a3b8',
    bgHex: '#f8fafc',
    voxelId: VOXEL_ID.DOOR_WHITE_CLOSED,
    previewBlock: 'stone',
    maxStack: 16,
  },
  door_mint: {
    id: 'door_mint',
    name: 'Mint Door',
    category: 'doors',
    description: 'Fresh mint paneled house door for colorful rooms.',
    accentHex: '#10b981',
    bgHex: '#d1fae5',
    voxelId: VOXEL_ID.DOOR_MINT_CLOSED,
    previewBlock: 'grass',
    maxStack: 16,
  },
  door_sky: {
    id: 'door_sky',
    name: 'Sky Door',
    category: 'doors',
    description: 'Bright sky-blue entryway door with auto-latch.',
    accentHex: '#0284c7',
    bgHex: '#e0f2fe',
    voxelId: VOXEL_ID.DOOR_SKY_CLOSED,
    previewBlock: 'stone',
    maxStack: 16,
  },
  door_coral: {
    id: 'door_coral',
    name: 'Coral Door',
    category: 'doors',
    description: 'Stylish coral door matching modern neighborhood homes.',
    accentHex: '#e11d48',
    bgHex: '#ffe4e6',
    voxelId: VOXEL_ID.DOOR_CORAL_CLOSED,
    previewBlock: 'dirt',
    maxStack: 16,
  },

  // ---------------- FOOD & DRINKS ----------------
  soda: {
    id: 'soda',
    name: 'Turbo Soda',
    category: 'food',
    description: 'Fizzy citrus soda that grants a 12s Speed Boost!',
    accentHex: '#0ea5e9',
    bgHex: '#e0f2fe',
    previewBlock: 'stone',
    consumableEffect: 'speed',
    maxStack: 32,
  },
  milk: {
    id: 'milk',
    name: 'Berry Milk',
    category: 'food',
    description: 'Sweet strawberry milk carton for an 8s Energy Dash.',
    accentHex: '#ec4899',
    bgHex: '#fce7f3',
    previewBlock: 'dirt',
    consumableEffect: 'energy',
    maxStack: 32,
  },
  pizza: {
    id: 'pizza',
    name: 'Cheese Pizza',
    category: 'food',
    description: 'Hot pepperoni slice ready for an afternoon snack.',
    accentHex: '#f59e0b',
    bgHex: '#fef3c7',
    previewBlock: 'dirt',
    consumableEffect: 'snack',
    maxStack: 32,
  },
  apple: {
    id: 'apple',
    name: 'Crisp Apple',
    category: 'food',
    description: 'Fresh orchard apple for exploring the city streets.',
    accentHex: '#ef4444',
    bgHex: '#fee2e2',
    previewBlock: 'grass',
    consumableEffect: 'snack',
    maxStack: 64,
  },
  donut: {
    id: 'donut',
    name: 'Glazed Donut',
    category: 'food',
    description: 'Sprinkled bakery treat for quick party energy.',
    accentHex: '#d946ef',
    bgHex: '#fae8ff',
    previewBlock: 'dirt',
    consumableEffect: 'snack',
    maxStack: 32,
  },

  // ---------------- TOOLS ----------------
  pickaxe: {
    id: 'pickaxe',
    name: 'Builder Pickaxe',
    category: 'tools',
    description: 'Hold in hotbar to break city blocks nearly 2x faster.',
    accentHex: '#6366f1',
    bgHex: '#e0e7ff',
    previewBlock: 'stone',
    toolBehavior: 'fast_break',
    maxStack: 1,
  },
  hammer: {
    id: 'hammer',
    name: 'Craft Hammer',
    category: 'tools',
    description: 'Heavy builder mallet for fast block demolition.',
    accentHex: '#8b5cf6',
    bgHex: '#ede9fe',
    previewBlock: 'stone',
    toolBehavior: 'fast_break',
    maxStack: 1,
  },
  ...EXTENDED_INVENTORY_ITEMS,
  ...Object.fromEntries(
    EXCLUSIVE_XSUIT_CATALOG.map((outfit) => [
      outfit.id,
      {
        id: outfit.id,
        name: outfit.name,
        category: 'outfits' as const,
        description: `${outfit.rarity} · ${outfit.description}`,
        accentHex: outfit.glowHex,
        bgHex: outfit.bgHex,
        previewBlock: 'stone' as PlaceableBlock,
        isAdExclusive: true,
        maxStack: 1,
      },
    ]),
  ),
};

export function getItemDef(itemId: string | null | undefined): InventoryItemDef | null {
  if (!itemId) return null;
  return INVENTORY_ITEMS[itemId] ?? null;
}

/**
 * Maps any broken voxel in the 3D city/terrain back to a collectible backpack item.
 */
export function voxelIdToItemId(voxelId: VoxelId): string | null {
  if (voxelId >= EXTENDED_VOXEL_START) {
    return getExtendedBlockByVoxelId(voxelId)?.id ?? 'stone';
  }
  switch (voxelId) {
    case VOXEL_ID.AIR:
      return null;
    case VOXEL_ID.GRASS:
    case VOXEL_ID.LEAVES:
    case VOXEL_ID.BIRCH_LEAVES:
    case VOXEL_ID.PINE_LEAVES:
    case VOXEL_ID.DARK_LEAVES:
    case VOXEL_ID.TALL_GRASS:
    case VOXEL_ID.FERN_BUSH:
      return 'grass';
    case VOXEL_ID.FLOWER_RED:
    case VOXEL_ID.FLOWER_YELLOW:
      return 'flower_vase';
    case VOXEL_ID.DIRT:
    case VOXEL_ID.SAND:
      return 'dirt';
    case VOXEL_ID.STONE:
    case VOXEL_ID.MOSS_STONE:
    case VOXEL_ID.CONCRETE:
    case VOXEL_ID.CHARCOAL_TRIM:
      return 'stone';
    case VOXEL_ID.PLANKS:
    case VOXEL_ID.LOG:
    case VOXEL_ID.BIRCH_LOG:
    case VOXEL_ID.PINE_LOG:
    case VOXEL_ID.OAK_FLOOR:
      return 'planks';
    case VOXEL_ID.WHITE_WALL:
    case VOXEL_ID.TILE_FLOOR:
      return 'white_wall';
    case VOXEL_ID.SINK_COUNTER:
      return 'kitchen_sink';
    case VOXEL_ID.TOILET:
      return 'toilet';
    case VOXEL_ID.CREAM_WALL:
      return 'cream_wall';
    case VOXEL_ID.MINT_WALL:
      return 'mint_wall';
    case VOXEL_ID.SKY_WALL:
      return 'sky_wall';
    case VOXEL_ID.CORAL_WALL:
      return 'coral_wall';
    case VOXEL_ID.BRICK:
      return 'brick';
    case VOXEL_ID.SLATE_ROOF:
      return 'slate_roof';
    case VOXEL_ID.RED_ROOF:
      return 'red_roof';
    case VOXEL_ID.GLASS:
      return 'glass';
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
      return 'asphalt';
    case VOXEL_ID.SIDEWALK:
      return 'sidewalk';
    case VOXEL_ID.BED_HEAD:
    case VOXEL_ID.BED_FOOT:
      return 'bed';
    case VOXEL_ID.SOFA:
      return 'sofa';
    case VOXEL_ID.TABLE:
      return 'table';
    case VOXEL_ID.BOOKSHELF:
      return 'bookshelf';
    case VOXEL_ID.LAMP_BLOCK:
      return 'lamp';
    case VOXEL_ID.TV_SCREEN:
      return 'tv';
    case VOXEL_ID.KITCHEN_COUNTER:
      return 'counter';
    case VOXEL_ID.STOVE:
      return 'stove';
    case VOXEL_ID.FRIDGE:
      return 'fridge';
    case VOXEL_ID.BATHTUB:
      return 'bathtub';
    case VOXEL_ID.CARPET_BLUE:
      return 'carpet_blue';
    case VOXEL_ID.CARPET_CORAL:
      return 'carpet_coral';
    case VOXEL_ID.CHAIR_OAK:
      return 'chair_oak';
    case VOXEL_ID.CHAIR_PINK:
      return 'chair_pink';
    case VOXEL_ID.CHAIR_SKY:
      return 'chair_sky';
    case VOXEL_ID.CHAIR_MINT:
      return 'chair_mint';
    case VOXEL_ID.TABLE_WHITE:
      return 'table_white';
    case VOXEL_ID.TABLE_GLASS:
      return 'table_glass';
    case VOXEL_ID.SOFA_CORAL:
      return 'sofa_coral';
    case VOXEL_ID.SOFA_MINT:
      return 'sofa_mint';
    case VOXEL_ID.SOFA_CREAM:
      return 'sofa_cream';
    case VOXEL_ID.BED_CORAL:
      return 'bed_coral';
    case VOXEL_ID.BED_MINT:
      return 'bed_mint';
    case VOXEL_ID.CUPBOARD_OAK:
      return 'cupboard_oak';
    case VOXEL_ID.CUPBOARD_WHITE:
      return 'cupboard_white';
    case VOXEL_ID.CUPBOARD_SKY:
      return 'cupboard_sky';
    case VOXEL_ID.PLANT_POT:
      return 'plant_pot';
    case VOXEL_ID.FLOWER_VASE:
      return 'flower_vase';
    case VOXEL_ID.DESK_LAMP:
      return 'desk_lamp';
    case VOXEL_ID.PLUSH_DECOR:
      return 'plush_decor';
    case VOXEL_ID.GIFT_BOX:
      return 'gift_box';
    case VOXEL_ID.DOOR_WOOD_CLOSED:
    case VOXEL_ID.DOOR_WOOD_OPEN:
      return 'door_wood';
    case VOXEL_ID.DOOR_WHITE_CLOSED:
    case VOXEL_ID.DOOR_WHITE_OPEN:
      return 'door_white';
    case VOXEL_ID.DOOR_MINT_CLOSED:
    case VOXEL_ID.DOOR_MINT_OPEN:
      return 'door_mint';
    case VOXEL_ID.DOOR_SKY_CLOSED:
    case VOXEL_ID.DOOR_SKY_OPEN:
      return 'door_sky';
    case VOXEL_ID.DOOR_CORAL_CLOSED:
    case VOXEL_ID.DOOR_CORAL_OPEN:
      return 'door_coral';
    default:
      return 'stone';
  }
}

function emptySlot(): InventorySlot {
  return { itemId: null, qty: 0 };
}

export function createStarterInventory(): InventoryState {
  const hotbar: InventorySlot[] = [
    { itemId: 'grass', qty: 64 },
    { itemId: 'planks', qty: 32 },
    { itemId: 'white_wall', qty: 32 },
    { itemId: 'door_wood', qty: 4 },
    { itemId: 'pickaxe', qty: 1 },
  ];

  const starterBagEntries: InventorySlot[] = [
    { itemId: 'chair_pink', qty: 2 },
    { itemId: 'sofa_coral', qty: 1 },
    { itemId: 'bed', qty: 1 },
    { itemId: 'table_white', qty: 2 },
    { itemId: 'tv', qty: 1 },
    { itemId: 'desk_lamp', qty: 2 },
    { itemId: 'carpet_blue', qty: 1 },
    { itemId: 'plant_pot', qty: 2 },
    { itemId: 'dirt', qty: 64 },
    { itemId: 'stone', qty: 64 },
    { itemId: 'brick', qty: 32 },
    { itemId: 'mint_wall', qty: 24 },
    { itemId: 'sky_wall', qty: 24 },
    { itemId: 'glass', qty: 24 },
    { itemId: 'bookshelf', qty: 2 },
    { itemId: 'door_mint', qty: 2 },
    { itemId: 'door_sky', qty: 2 },
    { itemId: 'soda', qty: 5 },
    { itemId: 'milk', qty: 4 },
    { itemId: 'pizza', qty: 4 },
    { itemId: 'apple', qty: 6 },
    { itemId: 'hammer', qty: 1 },
  ];

  const bag: InventorySlot[] = Array.from({ length: BAG_SIZE }, (_, idx) =>
    starterBagEntries[idx] ? { ...starterBagEntries[idx] } : emptySlot(),
  );

  return {
    hotbar,
    bag,
    selectedHotbarIndex: 0,
  };
}

function sanitizeSlots(raw: unknown, length: number): InventorySlot[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length }, (_, idx) => {
    const entry = arr[idx] as Partial<InventorySlot> | undefined;
    if (!entry || typeof entry.itemId !== 'string') return emptySlot();
    const def = getItemDef(entry.itemId);
    if (!def) return emptySlot();
    const qty =
      typeof entry.qty === 'number' && Number.isFinite(entry.qty)
        ? Math.min(def.maxStack, Math.max(0, Math.floor(entry.qty)))
        : 0;
    return qty > 0 ? { itemId: def.id, qty } : emptySlot();
  });
}

export function loadInventoryState(): InventoryState {
  if (typeof window === 'undefined') return createStarterInventory();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterInventory();
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    const hotbar = sanitizeSlots(parsed.hotbar, HOTBAR_SIZE);
    const bag = sanitizeSlots(parsed.bag, BAG_SIZE);
    const idx =
      typeof parsed.selectedHotbarIndex === 'number' &&
      parsed.selectedHotbarIndex >= 0 &&
      parsed.selectedHotbarIndex < HOTBAR_SIZE
        ? Math.floor(parsed.selectedHotbarIndex)
        : 0;
    return {
      hotbar,
      bag,
      selectedHotbarIndex: idx,
    };
  } catch {
    return createStarterInventory();
  }
}

export function saveInventoryState(state: InventoryState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/private-mode storage errors gracefully
  }
}

export function addItemToInventory(
  state: InventoryState,
  itemId: string,
  amount = 1,
): { state: InventoryState; added: number } {
  const def = getItemDef(itemId);
  if (!def || amount <= 0) return { state, added: 0 };

  const hotbar = state.hotbar.map((s) => ({ ...s }));
  const bag = state.bag.map((s) => ({ ...s }));
  let remaining = amount;

  // 1. Top up existing stacks in hotbar then bag
  for (const list of [hotbar, bag]) {
    for (let i = 0; i < list.length && remaining > 0; i++) {
      const slot = list[i];
      if (slot.itemId === def.id && slot.qty < def.maxStack) {
        const space = def.maxStack - slot.qty;
        const give = Math.min(space, remaining);
        slot.qty += give;
        remaining -= give;
      }
    }
  }

  // 2. Fill empty bag slots first, then empty hotbar slots
  for (const list of [bag, hotbar]) {
    for (let i = 0; i < list.length && remaining > 0; i++) {
      const slot = list[i];
      if (!slot.itemId || slot.qty <= 0) {
        const give = Math.min(def.maxStack, remaining);
        slot.itemId = def.id;
        slot.qty = give;
        remaining -= give;
      }
    }
  }

  const added = amount - remaining;
  if (added === 0) return { state, added: 0 };
  return {
    state: {
      ...state,
      hotbar,
      bag,
    },
    added,
  };
}

export function consumeOneItemById(
  state: InventoryState,
  itemId: string,
): { state: InventoryState; consumed: boolean } {
  const bagIdx = state.bag.findIndex((s) => s.itemId === itemId && s.qty > 0);
  if (bagIdx !== -1) {
    return { state: consumeSlotItem(state, 'bag', bagIdx), consumed: true };
  }
  const hbIdx = state.hotbar.findIndex((s) => s.itemId === itemId && s.qty > 0);
  if (hbIdx !== -1) {
    return { state: consumeSlotItem(state, 'hotbar', hbIdx), consumed: true };
  }
  return { state, consumed: false };
}

export function consumeSlotItem(
  state: InventoryState,
  zone: 'hotbar' | 'bag',
  index: number,
): InventoryState {
  const list = zone === 'hotbar' ? state.hotbar : state.bag;
  const target = list[index];
  if (!target || !target.itemId || target.qty <= 0) return state;

  const nextList = list.map((s, idx) => {
    if (idx !== index) return s;
    const nextQty = s.qty - 1;
    return nextQty > 0 ? { itemId: s.itemId, qty: nextQty } : emptySlot();
  });

  return zone === 'hotbar'
    ? { ...state, hotbar: nextList }
    : { ...state, bag: nextList };
}

export function moveOrSwapSlots(
  state: InventoryState,
  fromZone: 'hotbar' | 'bag',
  fromIndex: number,
  toZone: 'hotbar' | 'bag',
  toIndex: number,
): InventoryState {
  if (fromZone === toZone && fromIndex === toIndex) return state;

  const hotbar = state.hotbar.map((s) => ({ ...s }));
  const bag = state.bag.map((s) => ({ ...s }));
  const srcList = fromZone === 'hotbar' ? hotbar : bag;
  const dstList = toZone === 'hotbar' ? hotbar : bag;

  const src = srcList[fromIndex];
  const dst = dstList[toIndex];
  if (!src || !dst || !src.itemId || src.qty <= 0) return state;

  // Stack together if same stackable item
  if (dst.itemId === src.itemId) {
    const def = getItemDef(src.itemId);
    const maxStack = def?.maxStack ?? 99;
    if (dst.qty < maxStack) {
      const moveAmt = Math.min(maxStack - dst.qty, src.qty);
      dst.qty += moveAmt;
      src.qty -= moveAmt;
      if (src.qty <= 0) {
        srcList[fromIndex] = emptySlot();
      }
      return { ...state, hotbar, bag };
    }
  }

  // Otherwise swap cleanly
  srcList[fromIndex] = { ...dst };
  dstList[toIndex] = { ...src };
  return { ...state, hotbar, bag };
}

export function equipBagItemToHotbar(
  state: InventoryState,
  bagIndex: number,
  targetHotbarIndex = state.selectedHotbarIndex,
): InventoryState {
  const safeHotbarIdx = Math.max(0, Math.min(HOTBAR_SIZE - 1, targetHotbarIndex));
  const bagSlot = state.bag[bagIndex];
  if (!bagSlot || !bagSlot.itemId || bagSlot.qty <= 0) return state;

  const moved = moveOrSwapSlots(state, 'bag', bagIndex, 'hotbar', safeHotbarIdx);
  return {
    ...moved,
    selectedHotbarIndex: safeHotbarIdx,
  };
}

export function storeHotbarItemToBag(
  state: InventoryState,
  hotbarIndex: number,
): InventoryState {
  const src = state.hotbar[hotbarIndex];
  if (!src || !src.itemId || src.qty <= 0) return state;
  const def = getItemDef(src.itemId);
  const maxStack = def?.maxStack ?? 99;

  for (let i = 0; i < state.bag.length; i++) {
    const b = state.bag[i];
    if (b.itemId === src.itemId && b.qty < maxStack) {
      return moveOrSwapSlots(state, 'hotbar', hotbarIndex, 'bag', i);
    }
  }
  const emptyIdx = state.bag.findIndex((b) => !b.itemId || b.qty <= 0);
  if (emptyIdx === -1) return state;
  return moveOrSwapSlots(state, 'hotbar', hotbarIndex, 'bag', emptyIdx);
}

export function clearSlotItem(
  state: InventoryState,
  zone: 'hotbar' | 'bag',
  index: number,
): InventoryState {
  if (zone === 'hotbar') {
    return {
      ...state,
      hotbar: state.hotbar.map((s, idx) => (idx === index ? emptySlot() : s)),
    };
  }
  return {
    ...state,
    bag: state.bag.map((s, idx) => (idx === index ? emptySlot() : s)),
  };
}

const CATEGORY_ORDER: Record<Exclude<ItemCategory, 'all'>, number> = {
  outfits: 0,
  furniture: 1,
  blocks: 2,
  doors: 3,
  food: 4,
  tools: 5,
};

export function sortBagItems(state: InventoryState): InventoryState {
  const totals = new Map<string, number>();
  for (const slot of state.bag) {
    if (!slot.itemId || slot.qty <= 0) continue;
    totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.qty);
  }

  const sortedIds = Array.from(totals.keys()).sort((a, b) => {
    const da = getItemDef(a);
    const db = getItemDef(b);
    if (!da || !db) return a.localeCompare(b);
    const catDiff = CATEGORY_ORDER[da.category] - CATEGORY_ORDER[db.category];
    if (catDiff !== 0) return catDiff;
    return da.name.localeCompare(db.name);
  });

  const sortedSlots: InventorySlot[] = [];
  for (const id of sortedIds) {
    const def = getItemDef(id);
    const maxStack = def?.maxStack ?? 99;
    let rem = totals.get(id) ?? 0;
    while (rem > 0 && sortedSlots.length < BAG_SIZE) {
      const take = Math.min(maxStack, rem);
      sortedSlots.push({ itemId: id, qty: take });
      rem -= take;
    }
  }

  while (sortedSlots.length < BAG_SIZE) {
    sortedSlots.push(emptySlot());
  }

  return {
    ...state,
    bag: sortedSlots,
  };
}
