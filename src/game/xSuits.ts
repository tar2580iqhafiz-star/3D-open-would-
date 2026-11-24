export type OutfitSlot = 'suit' | 'helmet' | 'boots' | 'accessory';

export type XSuitRarity = 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export type AdUnlockTier = 2 | 3 | 4;

export type HelmetGeometryStyle =
  | 'visor'
  | 'valkyrie'
  | 'wyrm'
  | 'pharaoh_crown'
  | 'abyss_crest'
  | 'starlight_tiara';

export type AccessoryGeometryStyle =
  | 'cape'
  | 'halo'
  | 'thrusters'
  | 'seraph_wings';

export interface XSuitItemDef {
  id: string;
  name: string;
  slot: OutfitSlot;
  rarity: XSuitRarity;
  requiredAds: AdUnlockTier;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  glowHex: string;
  accentHex: string;
  visorHex: string;
  bgHex: string;
  helmetStyle?: HelmetGeometryStyle;
  accessoryStyle?: AccessoryGeometryStyle;
  hasShoulderPads?: boolean;
  chestCoreShape?: 'diamond' | 'hex' | 'star';
  tag: string;
}

export interface EquippedOutfitLoadout {
  suitId: string | null;
  helmetId: string | null;
  bootsId: string | null;
  accessoryId: string | null;
}

export interface XSuitPersistenceState {
  unlockedIds: string[];
  equipped: EquippedOutfitLoadout;
}

export const RARITY_STYLE: Record<
  XSuitRarity,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    cardGlow: string;
  }
> = {
  Rare: {
    label: 'Rare',
    badgeBg: '#0284c7',
    badgeText: '#f0f9ff',
    border: '#38bdf8',
    cardGlow: 'rgba(56, 189, 248, 0.22)',
  },
  Epic: {
    label: 'Epic',
    badgeBg: '#7c3aed',
    badgeText: '#f5f3ff',
    border: '#a855f7',
    cardGlow: 'rgba(168, 85, 247, 0.26)',
  },
  Legendary: {
    label: 'Legendary',
    badgeBg: '#d97706',
    badgeText: '#fffbeb',
    border: '#fbbf24',
    cardGlow: 'rgba(251, 191, 36, 0.28)',
  },
  Mythic: {
    label: 'Mythic X-Suit',
    badgeBg: '#be123c',
    badgeText: '#fff1f2',
    border: '#fb7185',
    cardGlow: 'rgba(244, 63, 94, 0.34)',
  },
};

export const OUTFIT_SLOT_LABELS: Record<OutfitSlot, string> = {
  suit: 'X-Suit Armor',
  helmet: 'Cyber Helmet',
  boots: 'Thruster Boots',
  accessory: 'Wings & Cape',
};

export const EXCLUSIVE_XSUIT_CATALOG: readonly XSuitItemDef[] = [
  // =========================================================================
  // 2 COMPLETED ADS TIER — Selected Gear, Helmets, Cyber Boots & Back Gear
  // =========================================================================
  {
    id: 'xgear_helm_neon',
    name: 'Neon Cyber Helmet',
    slot: 'helmet',
    rarity: 'Rare',
    requiredAds: 2,
    description: 'Carbon exo-helmet with an illuminated cyan tactical visor.',
    primaryHex: '#0f172a',
    secondaryHex: '#334155',
    glowHex: '#22d3ee',
    accentHex: '#38bdf8',
    visorHex: '#67e8f9',
    bgHex: '#cffafe',
    helmetStyle: 'visor',
    tag: '2 Ads',
  },
  {
    id: 'xgear_helm_cryo',
    name: 'Cryo Valkyrie Helm',
    slot: 'helmet',
    rarity: 'Epic',
    requiredAds: 2,
    description: 'Glacier-forged winged helm with frosty sapphire optics.',
    primaryHex: '#e2e8f0',
    secondaryHex: '#475569',
    glowHex: '#38bdf8',
    accentHex: '#93c5fd',
    visorHex: '#bae6fd',
    bgHex: '#e0f2fe',
    helmetStyle: 'valkyrie',
    tag: '2 Ads',
  },
  {
    id: 'xgear_boots_photon',
    name: 'Photon Strider Boots',
    slot: 'boots',
    rarity: 'Rare',
    requiredAds: 2,
    description: 'Sleek plated boots with electric teal heel thrusters.',
    primaryHex: '#1e293b',
    secondaryHex: '#475569',
    glowHex: '#2dd4bf',
    accentHex: '#5eead4',
    visorHex: '#2dd4bf',
    bgHex: '#ccfbf1',
    tag: '2 Ads',
  },
  {
    id: 'xgear_boots_void',
    name: 'Voidfire Jet Boots',
    slot: 'boots',
    rarity: 'Epic',
    requiredAds: 2,
    description: 'Obsidian cyber greaves pulsing with violet plasma trim.',
    primaryHex: '#18181b',
    secondaryHex: '#581c87',
    glowHex: '#c084fc',
    accentHex: '#e879f9',
    visorHex: '#d946ef',
    bgHex: '#f3e8ff',
    tag: '2 Ads',
  },
  {
    id: 'xgear_acc_holo_cape',
    name: 'Holo-Matrix Wing Cape',
    slot: 'accessory',
    rarity: 'Epic',
    requiredAds: 2,
    description: 'Energy-woven cybernetic cape with glowing violet edge circuit.',
    primaryHex: '#1e1b4b',
    secondaryHex: '#4c1d95',
    glowHex: '#a855f7',
    accentHex: '#38bdf8',
    visorHex: '#c084fc',
    bgHex: '#ede9fe',
    accessoryStyle: 'cape',
    tag: '2 Ads',
  },
  {
    id: 'xgear_acc_solar_halo',
    name: 'Solar Arc Halo',
    slot: 'accessory',
    rarity: 'Epic',
    requiredAds: 2,
    description: 'Radiant golden orbital ring that floats behind your hero.',
    primaryHex: '#78350f',
    secondaryHex: '#b45309',
    glowHex: '#fde047',
    accentHex: '#facc15',
    visorHex: '#fef08a',
    bgHex: '#fef9c3',
    accessoryStyle: 'halo',
    tag: '2 Ads',
  },

  // =========================================================================
  // 3 COMPLETED ADS TIER — Special Futuristic Outfits & Apex Helmets
  // =========================================================================
  {
    id: 'xsuit_crimson_vanguard',
    name: 'Crimson Vanguard Suit',
    slot: 'suit',
    rarity: 'Epic',
    requiredAds: 3,
    description: 'Armored ruby combat exo-suit with ember reactor core.',
    primaryHex: '#991b1b',
    secondaryHex: '#1e293b',
    glowHex: '#fb7185',
    accentHex: '#f59e0b',
    visorHex: '#fda4af',
    bgHex: '#ffe4e6',
    hasShoulderPads: true,
    chestCoreShape: 'diamond',
    tag: '3 Ads',
  },
  {
    id: 'xsuit_glacier_sentinel',
    name: 'Glacier Aegis Suit',
    slot: 'suit',
    rarity: 'Epic',
    requiredAds: 3,
    description: 'Titanium arctic cyber-suit with luminous ice-blue conduits.',
    primaryHex: '#1e3a8a',
    secondaryHex: '#cbd5e1',
    glowHex: '#38bdf8',
    accentHex: '#7dd3fc',
    visorHex: '#bae6fd',
    bgHex: '#e0f2fe',
    hasShoulderPads: true,
    chestCoreShape: 'hex',
    tag: '3 Ads',
  },
  {
    id: 'xsuit_volt_striker',
    name: 'Volt Striker Suit',
    slot: 'suit',
    rarity: 'Legendary',
    requiredAds: 3,
    description: 'High-voltage emerald carbon suit with hyper-charged pauldrons.',
    primaryHex: '#064e3b',
    secondaryHex: '#0f172a',
    glowHex: '#34d399',
    accentHex: '#a3e635',
    visorHex: '#6ee7b7',
    bgHex: '#d1fae5',
    hasShoulderPads: true,
    chestCoreShape: 'star',
    tag: '3 Ads',
  },
  {
    id: 'xgear_helm_apex_wyrm',
    name: 'Apex Wyrm Helmet',
    slot: 'helmet',
    rarity: 'Legendary',
    requiredAds: 3,
    description: 'Swept dragon-horned tactical helm with molten gold visor.',
    primaryHex: '#450a0a',
    secondaryHex: '#b45309',
    glowHex: '#fbbf24',
    accentHex: '#f97316',
    visorHex: '#fde047',
    bgHex: '#fef3c7',
    helmetStyle: 'wyrm',
    tag: '3 Ads',
  },

  // =========================================================================
  // 4 COMPLETED ADS TIER — Premium Mythic X-Suits & Seraph Wings
  // =========================================================================
  {
    id: 'xsuit_pharaoh_x',
    name: 'Golden Sun-King X-Suit',
    slot: 'suit',
    rarity: 'Mythic',
    requiredAds: 4,
    description: 'Mythic gold & obsidian solar armor crowned with pharaonic glow.',
    primaryHex: '#92400e',
    secondaryHex: '#1c1917',
    glowHex: '#fde047',
    accentHex: '#f59e0b',
    visorHex: '#fef08a',
    bgHex: '#fef3c7',
    hasShoulderPads: true,
    chestCoreShape: 'star',
    helmetStyle: 'pharaoh_crown',
    accessoryStyle: 'thrusters',
    tag: '4 Ads · Mythic',
  },
  {
    id: 'xsuit_abyssal_x',
    name: 'Abyssal Leviathan X-Suit',
    slot: 'suit',
    rarity: 'Mythic',
    requiredAds: 4,
    description: 'Bio-luminescent abyssal obsidian suit with plasma crimson veins.',
    primaryHex: '#0f172a',
    secondaryHex: '#134e4a',
    glowHex: '#f43f5e',
    accentHex: '#2dd4bf',
    visorHex: '#fb7185',
    bgHex: '#fce7f3',
    hasShoulderPads: true,
    chestCoreShape: 'diamond',
    helmetStyle: 'abyss_crest',
    accessoryStyle: 'thrusters',
    tag: '4 Ads · Mythic',
  },
  {
    id: 'xsuit_valkyrie_x',
    name: 'Starlight Valkyrie X-Suit',
    slot: 'suit',
    rarity: 'Mythic',
    requiredAds: 4,
    description: 'Celestial pearl & ultraviolet Mythic X-Suit with astral armor.',
    primaryHex: '#4c1d95',
    secondaryHex: '#f8fafc',
    glowHex: '#e879f9',
    accentHex: '#fbbf24',
    visorHex: '#f0abfc',
    bgHex: '#fae8ff',
    hasShoulderPads: true,
    chestCoreShape: 'star',
    helmetStyle: 'starlight_tiara',
    accessoryStyle: 'halo',
    tag: '4 Ads · Mythic',
  },
  {
    id: 'xgear_acc_seraph_wings',
    name: 'Prism Seraph Cyber Wings',
    slot: 'accessory',
    rarity: 'Mythic',
    requiredAds: 4,
    description: 'Six-feather holographic cyber wings with dual plasma turbines.',
    primaryHex: '#312e81',
    secondaryHex: '#0ea5e9',
    glowHex: '#38bdf8',
    accentHex: '#f472b6',
    visorHex: '#e0f2fe',
    bgHex: '#e0f2fe',
    accessoryStyle: 'seraph_wings',
    tag: '4 Ads · Mythic',
  },
];

const XSUIT_BY_ID = new Map<string, XSuitItemDef>(
  EXCLUSIVE_XSUIT_CATALOG.map((item) => [item.id, item]),
);

export function getXSuitItemDef(id: string | null | undefined): XSuitItemDef | undefined {
  if (!id) return undefined;
  return XSUIT_BY_ID.get(id);
}

export function isExclusiveXSuitItemId(id: string | null | undefined): boolean {
  return Boolean(id && XSUIT_BY_ID.has(id));
}

export const EMPTY_OUTFIT_LOADOUT: EquippedOutfitLoadout = {
  suitId: null,
  helmetId: null,
  bootsId: null,
  accessoryId: null,
};

const XSUITS_STORAGE_KEY = 'spc_city_xsuits_v1';

export function sanitizeEquippedLoadout(
  raw: Partial<EquippedOutfitLoadout> | null | undefined,
  unlockedIds: readonly string[],
): EquippedOutfitLoadout {
  const unlocked = new Set(unlockedIds);
  const checkSlot = (id: unknown, expectedSlot: OutfitSlot): string | null => {
    if (typeof id !== 'string' || !unlocked.has(id)) return null;
    const def = getXSuitItemDef(id);
    return def && def.slot === expectedSlot ? def.id : null;
  };
  return {
    suitId: checkSlot(raw?.suitId, 'suit'),
    helmetId: checkSlot(raw?.helmetId, 'helmet'),
    bootsId: checkSlot(raw?.bootsId, 'boots'),
    accessoryId: checkSlot(raw?.accessoryId, 'accessory'),
  };
}

export function loadXSuitState(): XSuitPersistenceState {
  if (typeof window === 'undefined') {
    return { unlockedIds: [], equipped: { ...EMPTY_OUTFIT_LOADOUT } };
  }
  try {
    const raw = window.localStorage.getItem(XSUITS_STORAGE_KEY);
    if (!raw) return { unlockedIds: [], equipped: { ...EMPTY_OUTFIT_LOADOUT } };
    const parsed = JSON.parse(raw) as Partial<XSuitPersistenceState>;
    const unlockedIds = Array.isArray(parsed.unlockedIds)
      ? Array.from(
          new Set(
            parsed.unlockedIds.filter(
              (id): id is string => typeof id === 'string' && XSUIT_BY_ID.has(id),
            ),
          ),
        )
      : [];
    const equipped = sanitizeEquippedLoadout(parsed.equipped, unlockedIds);
    return { unlockedIds, equipped };
  } catch {
    return { unlockedIds: [], equipped: { ...EMPTY_OUTFIT_LOADOUT } };
  }
}

export function saveXSuitState(state: XSuitPersistenceState): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanUnlocked = Array.from(
      new Set(state.unlockedIds.filter((id) => XSUIT_BY_ID.has(id))),
    );
    const cleanEquipped = sanitizeEquippedLoadout(state.equipped, cleanUnlocked);
    window.localStorage.setItem(
      XSUITS_STORAGE_KEY,
      JSON.stringify({ unlockedIds: cleanUnlocked, equipped: cleanEquipped }),
    );
  } catch {
    // Ignore quota errors
  }
}

/**
 * Returns a clean full-character showcase loadout for 3D previews of an individual X-Suit or gear item.
 */
export function getPreviewLoadoutForItem(item: XSuitItemDef): EquippedOutfitLoadout {
  switch (item.slot) {
    case 'suit':
      return {
        suitId: item.id,
        helmetId: null,
        bootsId: null,
        accessoryId: null,
      };
    case 'helmet':
      return {
        suitId: null,
        helmetId: item.id,
        bootsId: null,
        accessoryId: null,
      };
    case 'boots':
      return {
        suitId: null,
        helmetId: null,
        bootsId: item.id,
        accessoryId: null,
      };
    case 'accessory':
      return {
        suitId: null,
        helmetId: null,
        bootsId: null,
        accessoryId: item.id,
      };
  }
}
