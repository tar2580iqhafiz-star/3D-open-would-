import { EXTENDED_SHOP_LISTINGS } from './blockCatalog';

export type ShopCategory =
  | 'all'
  | 'blocks'
  | 'chairs'
  | 'sofas'
  | 'beds'
  | 'tables'
  | 'dining'
  | 'wardrobes'
  | 'cupboards'
  | 'tvs'
  | 'computers'
  | 'fridges'
  | 'lamps'
  | 'carpets'
  | 'kitchen'
  | 'bathroom'
  | 'decor'
  | 'household';

export interface ShopListing {
  id: string;
  itemId: string;
  category: Exclude<ShopCategory, 'all'>;
  price: number;
  bundleQty: number;
  tag?: string;
}

export interface WorldCoinSpot {
  id: number;
  x: number;
  y: number;
  z: number;
  value?: number;
}

const COIN_STORAGE_KEY = 'spc_city_coins_v1';
const WORLD_COINS_KEY = 'spc_city_collected_coins_v1';

export const STARTER_COINS = 350;
export const WORLD_COIN_VALUE = 25;

export const SHOP_CATEGORIES: Array<{
  id: ShopCategory;
  label: string;
  accent: string;
}> = [
  { id: 'all', label: 'All Items', accent: '#38bdf8' },
  { id: 'blocks', label: 'Blocks (255)', accent: '#10b981' },
  { id: 'chairs', label: 'Chairs', accent: '#f472b6' },
  { id: 'sofas', label: 'Sofas', accent: '#34d399' },
  { id: 'beds', label: 'Beds', accent: '#fb7185' },
  { id: 'tables', label: 'Tables', accent: '#f59e0b' },
  { id: 'dining', label: 'Dining Tables', accent: '#d97706' },
  { id: 'wardrobes', label: 'Wardrobes', accent: '#92400e' },
  { id: 'cupboards', label: 'Cupboards', accent: '#a78bfa' },
  { id: 'tvs', label: 'TVs', accent: '#334155' },
  { id: 'computers', label: 'Computers', accent: '#0ea5e9' },
  { id: 'fridges', label: 'Refrigerators', accent: '#0284c7' },
  { id: 'lamps', label: 'Lamps', accent: '#facc15' },
  { id: 'carpets', label: 'Carpets', accent: '#ec4899' },
  { id: 'kitchen', label: 'Kitchen', accent: '#ea580c' },
  { id: 'bathroom', label: 'Bathroom', accent: '#06b6d4' },
  { id: 'decor', label: 'Decorations', accent: '#22c55e' },
  { id: 'household', label: 'Household & Doors', accent: '#fb923c' },
];

export const SHOP_CATALOG: ShopListing[] = [
  // Chairs
  { id: 'shop_chair_oak', itemId: 'chair_oak', category: 'chairs', price: 25, bundleQty: 1 },
  { id: 'shop_chair_pink', itemId: 'chair_pink', category: 'chairs', price: 30, bundleQty: 1, tag: 'Popular' },
  { id: 'shop_chair_sky', itemId: 'chair_sky', category: 'chairs', price: 30, bundleQty: 1 },
  { id: 'shop_chair_mint', itemId: 'chair_mint', category: 'chairs', price: 30, bundleQty: 1 },
  { id: 'shop_swivel_chair', itemId: 'swivel_chair', category: 'chairs', price: 55, bundleQty: 1, tag: 'New' },

  // Sofas
  { id: 'shop_sofa_blue', itemId: 'sofa', category: 'sofas', price: 75, bundleQty: 1 },
  { id: 'shop_sofa_coral', itemId: 'sofa_coral', category: 'sofas', price: 85, bundleQty: 1, tag: 'Popular' },
  { id: 'shop_sofa_mint', itemId: 'sofa_mint', category: 'sofas', price: 85, bundleQty: 1 },
  { id: 'shop_sofa_cream', itemId: 'sofa_cream', category: 'sofas', price: 90, bundleQty: 1 },

  // Beds
  { id: 'shop_bed_classic', itemId: 'bed', category: 'beds', price: 95, bundleQty: 1 },
  { id: 'shop_bed_coral', itemId: 'bed_coral', category: 'beds', price: 110, bundleQty: 1, tag: 'Cozy' },
  { id: 'shop_bed_mint', itemId: 'bed_mint', category: 'beds', price: 110, bundleQty: 1 },

  // Tables
  { id: 'shop_table_oak', itemId: 'table', category: 'tables', price: 45, bundleQty: 1 },
  { id: 'shop_table_white', itemId: 'table_white', category: 'tables', price: 50, bundleQty: 1 },
  { id: 'shop_table_glass', itemId: 'table_glass', category: 'tables', price: 65, bundleQty: 1, tag: 'Modern' },

  // Dining Tables
  { id: 'shop_dining_oak', itemId: 'dining_table_oak', category: 'dining', price: 95, bundleQty: 1, tag: 'Family' },
  { id: 'shop_dining_white', itemId: 'dining_table_white', category: 'dining', price: 105, bundleQty: 1 },

  // Wardrobes
  { id: 'shop_wardrobe_oak', itemId: 'wardrobe_oak', category: 'wardrobes', price: 115, bundleQty: 1 },
  { id: 'shop_wardrobe_white', itemId: 'wardrobe_white', category: 'wardrobes', price: 125, bundleQty: 1, tag: 'Closet' },

  // Cupboards
  { id: 'shop_cupboard_oak', itemId: 'cupboard_oak', category: 'cupboards', price: 65, bundleQty: 1 },
  { id: 'shop_cupboard_white', itemId: 'cupboard_white', category: 'cupboards', price: 70, bundleQty: 1 },
  { id: 'shop_cupboard_sky', itemId: 'cupboard_sky', category: 'cupboards', price: 70, bundleQty: 1 },
  { id: 'shop_bookshelf', itemId: 'bookshelf', category: 'cupboards', price: 55, bundleQty: 1 },

  // TVs
  { id: 'shop_tv', itemId: 'tv', category: 'tvs', price: 120, bundleQty: 1, tag: 'Smart 4K' },

  // Computers
  { id: 'shop_computer', itemId: 'computer', category: 'computers', price: 135, bundleQty: 1, tag: 'Pro PC' },

  // Refrigerators
  { id: 'shop_fridge', itemId: 'fridge', category: 'fridges', price: 95, bundleQty: 1 },
  { id: 'shop_fridge_tall', itemId: 'fridge_tall', category: 'fridges', price: 145, bundleQty: 1, tag: 'Deluxe' },

  // Lamps
  { id: 'shop_desk_lamp', itemId: 'desk_lamp', category: 'lamps', price: 35, bundleQty: 1 },
  { id: 'shop_floor_lamp', itemId: 'floor_lamp', category: 'lamps', price: 55, bundleQty: 1, tag: 'Bright' },
  { id: 'shop_glow_lamp', itemId: 'lamp', category: 'lamps', price: 35, bundleQty: 1 },

  // Carpets
  { id: 'shop_carpet_blue', itemId: 'carpet_blue', category: 'carpets', price: 35, bundleQty: 1 },
  { id: 'shop_carpet_coral', itemId: 'carpet_coral', category: 'carpets', price: 35, bundleQty: 1 },
  { id: 'shop_carpet_mint', itemId: 'carpet_mint', category: 'carpets', price: 35, bundleQty: 1, tag: 'Soft' },

  // Kitchen Furniture
  { id: 'shop_counter', itemId: 'counter', category: 'kitchen', price: 60, bundleQty: 1 },
  { id: 'shop_stove', itemId: 'stove', category: 'kitchen', price: 90, bundleQty: 1, tag: 'Chef' },
  { id: 'shop_kitchen_sink', itemId: 'kitchen_sink', category: 'kitchen', price: 80, bundleQty: 1 },

  // Bathroom Furniture
  { id: 'shop_bathtub', itemId: 'bathtub', category: 'bathroom', price: 125, bundleQty: 1, tag: 'Spa' },
  { id: 'shop_toilet', itemId: 'toilet', category: 'bathroom', price: 65, bundleQty: 1 },
  { id: 'shop_bath_sink', itemId: 'bath_sink', category: 'bathroom', price: 75, bundleQty: 1 },

  // Decorations
  { id: 'shop_plant_pot', itemId: 'plant_pot', category: 'decor', price: 30, bundleQty: 1 },
  { id: 'shop_flower_vase', itemId: 'flower_vase', category: 'decor', price: 35, bundleQty: 1 },
  { id: 'shop_plush_decor', itemId: 'plush_decor', category: 'decor', price: 55, bundleQty: 1, tag: 'Star' },
  { id: 'shop_gift_box', itemId: 'gift_box', category: 'decor', price: 40, bundleQty: 1 },
  { id: 'shop_wall_clock', itemId: 'wall_clock', category: 'decor', price: 75, bundleQty: 1 },

  // Other Household Items & Doors
  { id: 'shop_washer', itemId: 'washer', category: 'household', price: 110, bundleQty: 1, tag: 'Home' },
  { id: 'shop_trash_bin', itemId: 'trash_bin', category: 'household', price: 25, bundleQty: 1 },
  { id: 'shop_door_wood', itemId: 'door_wood', category: 'household', price: 40, bundleQty: 1 },
  { id: 'shop_door_white', itemId: 'door_white', category: 'household', price: 45, bundleQty: 1 },
  { id: 'shop_door_mint', itemId: 'door_mint', category: 'household', price: 50, bundleQty: 1 },
  { id: 'shop_door_sky', itemId: 'door_sky', category: 'household', price: 50, bundleQty: 1 },
  { id: 'shop_door_coral', itemId: 'door_coral', category: 'household', price: 50, bundleQty: 1 },

  // Classic & Building Blocks
  { id: 'shop_blk_grass', itemId: 'grass', category: 'blocks', price: 8, bundleQty: 16 },
  { id: 'shop_blk_dirt', itemId: 'dirt', category: 'blocks', price: 8, bundleQty: 16 },
  { id: 'shop_blk_stone', itemId: 'stone', category: 'blocks', price: 10, bundleQty: 16 },
  { id: 'shop_blk_planks', itemId: 'planks', category: 'blocks', price: 10, bundleQty: 16 },
  { id: 'shop_blk_white_wall', itemId: 'white_wall', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_cream_wall', itemId: 'cream_wall', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_mint_wall', itemId: 'mint_wall', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_sky_wall', itemId: 'sky_wall', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_coral_wall', itemId: 'coral_wall', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_brick', itemId: 'brick', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_slate_roof', itemId: 'slate_roof', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_red_roof', itemId: 'red_roof', category: 'blocks', price: 12, bundleQty: 16 },
  { id: 'shop_blk_glass', itemId: 'glass', category: 'blocks', price: 15, bundleQty: 16 },
  { id: 'shop_blk_asphalt', itemId: 'asphalt', category: 'blocks', price: 10, bundleQty: 16 },
  { id: 'shop_blk_sidewalk', itemId: 'sidewalk', category: 'blocks', price: 10, bundleQty: 16 },
  ...EXTENDED_SHOP_LISTINGS,
];

/**
 * Loose road coins removed in favor of hidden treasure chests across forests and secret city alcoves.
 */
export const WORLD_COIN_SPOTS: WorldCoinSpot[] = [];

export function loadCoinBalance(): number {
  if (typeof window === 'undefined') return STARTER_COINS;
  try {
    const raw = window.localStorage.getItem(COIN_STORAGE_KEY);
    if (raw === null) return STARTER_COINS;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return STARTER_COINS;
    return Math.floor(parsed);
  } catch {
    return STARTER_COINS;
  }
}

export function saveCoinBalance(coins: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      COIN_STORAGE_KEY,
      String(Math.max(0, Math.floor(coins))),
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadCollectedWorldCoins(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WORLD_COINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === 'number' && Number.isInteger(id));
  } catch {
    return [];
  }
}

export function saveCollectedWorldCoins(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORLD_COINS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
