import type { InventoryItemDef } from './inventory';
import type { ShopListing } from './shop';
import type { PlaceableBlock, VoxelId } from './types';

export type ExtendedBlockStyleId =
  | 'concrete'
  | 'brick'
  | 'stone_brick'
  | 'planks'
  | 'tile'
  | 'wool'
  | 'shingle'
  | 'ribbed'
  | 'mosaic'
  | 'cobble'
  | 'glass'
  | 'glow';

export interface BlockColorDef {
  id: string;
  label: string;
  hex: string;
  bgHex: string;
  previewBlock: PlaceableBlock;
}

export interface BlockStyleDef {
  id: ExtendedBlockStyleId;
  label: string;
  tile: readonly [number, number];
  isGlass?: boolean;
  isGlow?: boolean;
  isMasonry?: boolean;
  price: number;
  bundleQty: number;
  descSuffix: string;
}

export interface ExtendedBlockDef {
  id: string;
  voxelId: number;
  name: string;
  colorId: string;
  colorLabel: string;
  style: ExtendedBlockStyleId;
  styleLabel: string;
  hex: string;
  bgHex: string;
  particleHex: number;
  tint: readonly [number, number, number];
  tile: readonly [number, number];
  isGlass: boolean;
  isGlow: boolean;
  isMasonry: boolean;
  previewBlock: PlaceableBlock;
  price: number;
  bundleQty: number;
  description: string;
}

export const EXTENDED_VOXEL_START = 100;

export const BLOCK_COLORS: readonly BlockColorDef[] = [
  { id: 'white', label: 'White', hex: '#f8fafc', bgHex: '#f1f5f9', previewBlock: 'stone' },
  { id: 'black', label: 'Black', hex: '#27272a', bgHex: '#e4e4e7', previewBlock: 'stone' },
  { id: 'gray', label: 'Gray', hex: '#71717a', bgHex: '#e4e4e7', previewBlock: 'stone' },
  { id: 'silver', label: 'Silver', hex: '#cbd5e1', bgHex: '#f1f5f9', previewBlock: 'stone' },
  { id: 'red', label: 'Red', hex: '#ef4444', bgHex: '#fee2e2', previewBlock: 'dirt' },
  { id: 'maroon', label: 'Maroon', hex: '#991b1b', bgHex: '#fee2e2', previewBlock: 'dirt' },
  { id: 'pink', label: 'Pink', hex: '#f472b6', bgHex: '#fce7f3', previewBlock: 'dirt' },
  { id: 'magenta', label: 'Magenta', hex: '#d946ef', bgHex: '#fae8ff', previewBlock: 'dirt' },
  { id: 'purple', label: 'Purple', hex: '#8b5cf6', bgHex: '#ede9fe', previewBlock: 'stone' },
  { id: 'lavender', label: 'Lavender', hex: '#c4b5fd', bgHex: '#f3e8ff', previewBlock: 'stone' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6', bgHex: '#dbeafe', previewBlock: 'stone' },
  { id: 'sky', label: 'Sky Blue', hex: '#38bdf8', bgHex: '#e0f2fe', previewBlock: 'stone' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4', bgHex: '#cffafe', previewBlock: 'stone' },
  { id: 'teal', label: 'Teal', hex: '#14b8a6', bgHex: '#ccfbf1', previewBlock: 'grass' },
  { id: 'green', label: 'Green', hex: '#22c55e', bgHex: '#dcfce7', previewBlock: 'grass' },
  { id: 'lime', label: 'Lime', hex: '#84cc16', bgHex: '#ecfccb', previewBlock: 'grass' },
  { id: 'yellow', label: 'Yellow', hex: '#facc15', bgHex: '#fef9c3', previewBlock: 'dirt' },
  { id: 'orange', label: 'Orange', hex: '#f97316', bgHex: '#ffedd5', previewBlock: 'dirt' },
  { id: 'brown', label: 'Brown', hex: '#92400e', bgHex: '#fef3c7', previewBlock: 'dirt' },
  { id: 'beige', label: 'Beige', hex: '#e7d3b0', bgHex: '#fef3c7', previewBlock: 'dirt' },
] as const;

export const BLOCK_STYLES: readonly BlockStyleDef[] = [
  {
    id: 'concrete',
    label: 'Concrete',
    tile: [0, 10],
    isMasonry: true,
    price: 10,
    bundleQty: 16,
    descSuffix: 'smooth architectural concrete for crisp modern builds.',
  },
  {
    id: 'brick',
    label: 'Bricks',
    tile: [1, 10],
    isMasonry: true,
    price: 12,
    bundleQty: 16,
    descSuffix: 'painted masonry brickwork for lively townhouses and cafes.',
  },
  {
    id: 'stone_brick',
    label: 'Stone Bricks',
    tile: [2, 10],
    isMasonry: true,
    price: 12,
    bundleQty: 16,
    descSuffix: 'carved stone brick blocks for sturdy walls and towers.',
  },
  {
    id: 'planks',
    label: 'Wood Planks',
    tile: [3, 10],
    price: 10,
    bundleQty: 16,
    descSuffix: 'stained timber planks for warm cabins, decks, and interiors.',
  },
  {
    id: 'tile',
    label: 'Glazed Tile',
    tile: [4, 10],
    isMasonry: true,
    price: 14,
    bundleQty: 16,
    descSuffix: 'glossy ceramic tile squares for kitchens, pools, and lobbies.',
  },
  {
    id: 'wool',
    label: 'Soft Wool',
    tile: [5, 10],
    price: 10,
    bundleQty: 16,
    descSuffix: 'woven craft wool for cozy carpets, cushions, and pixel art.',
  },
  {
    id: 'shingle',
    label: 'Roof Shingles',
    tile: [6, 10],
    isMasonry: true,
    price: 12,
    bundleQty: 16,
    descSuffix: 'layered roof shingle blocks for pitched roofs and awnings.',
  },
  {
    id: 'ribbed',
    label: 'Ribbed Pillar',
    tile: [7, 10],
    isMasonry: true,
    price: 14,
    bundleQty: 16,
    descSuffix: 'fluted column blocks for porches, shops, and modern facades.',
  },
  {
    id: 'mosaic',
    label: 'Mosaic Decor',
    tile: [0, 11],
    isMasonry: true,
    price: 16,
    bundleQty: 16,
    descSuffix: 'patterned decorative craft tile for accent walls and plazas.',
  },
  {
    id: 'cobble',
    label: 'Cobble Block',
    tile: [1, 11],
    isMasonry: true,
    price: 10,
    bundleQty: 16,
    descSuffix: 'textured cobblestone for garden paths, driveways, and courtyards.',
  },
  {
    id: 'glass',
    label: 'Stained Glass',
    tile: [2, 11],
    isGlass: true,
    price: 16,
    bundleQty: 16,
    descSuffix: 'translucent tinted craft glass for skylights and storefronts.',
  },
  {
    id: 'glow',
    label: 'Glow Block',
    tile: [3, 11],
    isGlow: true,
    price: 18,
    bundleQty: 8,
    descSuffix: 'luminous neon lamp block that glows brightly at night.',
  },
] as const;

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToLinearRgb(hex: string): readonly [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = Number.parseInt(clean, 16);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  return [srgbChannelToLinear(r), srgbChannelToLinear(g), srgbChannelToLinear(b)] as const;
}

function hexToNumber(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  return Number.parseInt(clean, 16);
}

export const EXTENDED_BLOCKS: ExtendedBlockDef[] = [];
const byVoxelId = new Map<number, ExtendedBlockDef>();
const byItemId = new Map<string, ExtendedBlockDef>();

let nextVoxelId = EXTENDED_VOXEL_START;
for (const style of BLOCK_STYLES) {
  for (const color of BLOCK_COLORS) {
    const id = `blk_${color.id}_${style.id}`;
    const voxelId = nextVoxelId++;
    const name = `${color.label} ${style.label}`;
    const def: ExtendedBlockDef = {
      id,
      voxelId,
      name,
      colorId: color.id,
      colorLabel: color.label,
      style: style.id,
      styleLabel: style.label,
      hex: color.hex,
      bgHex: color.bgHex,
      particleHex: hexToNumber(color.hex),
      tint: hexToLinearRgb(color.hex),
      tile: style.tile,
      isGlass: Boolean(style.isGlass),
      isGlow: Boolean(style.isGlow),
      isMasonry: Boolean(style.isMasonry),
      previewBlock: color.previewBlock,
      price: style.price,
      bundleQty: style.bundleQty,
      description: `${name} — ${style.descSuffix}`,
    };
    EXTENDED_BLOCKS.push(def);
    byVoxelId.set(voxelId, def);
    byItemId.set(id, def);
  }
}

export const MAX_VOXEL_ID = nextVoxelId - 1; // 339 (240 blocks: 100..339)

export function getExtendedBlockByVoxelId(voxelId: number): ExtendedBlockDef | null {
  return byVoxelId.get(voxelId) ?? null;
}

export function getExtendedBlockByItemId(itemId: string | null | undefined): ExtendedBlockDef | null {
  if (!itemId) return null;
  return byItemId.get(itemId) ?? null;
}

export const EXTENDED_INVENTORY_ITEMS: Record<string, InventoryItemDef> = Object.fromEntries(
  EXTENDED_BLOCKS.map((blk) => [
    blk.id,
    {
      id: blk.id,
      name: blk.name,
      category: 'blocks' as const,
      description: blk.description,
      accentHex: blk.hex,
      bgHex: blk.bgHex,
      voxelId: blk.voxelId as VoxelId,
      previewBlock: blk.previewBlock,
      maxStack: 99,
    },
  ]),
);

export const EXTENDED_SHOP_LISTINGS: ShopListing[] = EXTENDED_BLOCKS.map((blk) => ({
  id: `shop_${blk.id}`,
  itemId: blk.id,
  category: 'blocks' as const,
  price: blk.price,
  bundleQty: blk.bundleQty,
  tag: blk.isGlow ? 'Glow' : blk.isGlass ? 'Glass' : blk.style === 'mosaic' ? 'Decor' : undefined,
}));
