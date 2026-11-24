export type CityLocationId =
  | 'school'
  | 'cinema'
  | 'dance_club'
  | 'coffee_shop'
  | 'shopping_mall'
  | 'supermarket'
  | 'hospital'
  | 'police_station'
  | 'fire_station'
  | 'restaurant'
  | 'hotel'
  | 'park'
  | 'gym'
  | 'library'
  | 'car_showroom'
  | 'beach'
  | 'game_center'
  | 'xsuit_arena'
  | 'observatory'
  | 'pine_lodge';

export type LocationCategory = 'all' | 'civic' | 'shopping' | 'leisure' | 'dining';

export type CardinalFacing = 'N' | 'S' | 'E' | 'W';

export interface CityLocation {
  id: CityLocationId;
  name: string;
  category: Exclude<LocationCategory, 'all'>;
  district: string;
  description: string;
  accentHex: string;
  roofHex: string;
  wallHex: string;
  heightLevel: 1 | 2 | 3;
  bounds: readonly [number, number, number, number]; // [x0, z0, x1, z1]
  spawn: {
    x: number;
    z: number;
    facing: CardinalFacing;
  };
  discoverRadius: number;
}

export const LOCATION_CATEGORY_TABS: Array<{
  id: LocationCategory;
  label: string;
  accent: string;
}> = [
  { id: 'all', label: 'All Places', accent: '#38bdf8' },
  { id: 'civic', label: 'City Services', accent: '#ef4444' },
  { id: 'shopping', label: 'Shops & Cars', accent: '#f59e0b' },
  { id: 'dining', label: 'Food & Stay', accent: '#fb7185' },
  { id: 'leisure', label: 'Fun & Outdoors', accent: '#34d399' },
];

export const CITY_LOCATIONS: CityLocation[] = [
  {
    id: 'park',
    name: 'Park',
    category: 'leisure',
    district: 'Central Plaza',
    description: 'Shady trees, benches, and the glowing city fountain.',
    accentHex: '#22c55e',
    roofHex: '#4ade80',
    wallHex: '#86efac',
    heightLevel: 1,
    bounds: [4, 4, 11, 11],
    spawn: { x: 5, z: 8, facing: 'E' },
    discoverRadius: 9,
  },
  {
    id: 'school',
    name: 'School',
    category: 'civic',
    district: 'North Campus',
    description: 'Classrooms, lockers, study desks, and campus courtyard.',
    accentHex: '#f59e0b',
    roofHex: '#fbbf24',
    wallHex: '#fef3c7',
    heightLevel: 3,
    bounds: [-22, -72, -6, -54],
    spawn: { x: -14, z: -52, facing: 'N' },
    discoverRadius: 12,
  },
  {
    id: 'library',
    name: 'Library',
    category: 'civic',
    district: 'North Campus',
    description: 'Tall bookshelves, reading tables, and quiet study lamps.',
    accentHex: '#0ea5e9',
    roofHex: '#38bdf8',
    wallHex: '#e0f2fe',
    heightLevel: 2,
    bounds: [6, -68, 20, -54],
    spawn: { x: 13, z: -52, facing: 'N' },
    discoverRadius: 11,
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'civic',
    district: 'North-West',
    description: 'Emergency entrance, reception desk, and clean care beds.',
    accentHex: '#f43f5e',
    roofHex: '#ffffff',
    wallHex: '#f8fafc',
    heightLevel: 2,
    bounds: [-44, -70, -28, -54],
    spawn: { x: -36, z: -52, facing: 'N' },
    discoverRadius: 12,
  },
  {
    id: 'police_station',
    name: 'Police Station',
    category: 'civic',
    district: 'North-East',
    description: 'City patrol headquarters with briefing desks and beacon.',
    accentHex: '#2563eb',
    roofHex: '#3b82f6',
    wallHex: '#dbeafe',
    heightLevel: 2,
    bounds: [26, -68, 40, -54],
    spawn: { x: 33, z: -52, facing: 'N' },
    discoverRadius: 11,
  },
  {
    id: 'fire_station',
    name: 'Fire Station',
    category: 'civic',
    district: 'North-East',
    description: 'Red firehouse bay with rescue tower and crew lounge.',
    accentHex: '#dc2626',
    roofHex: '#ef4444',
    wallHex: '#fee2e2',
    heightLevel: 2,
    bounds: [46, -68, 62, -54],
    spawn: { x: 54, z: -52, facing: 'N' },
    discoverRadius: 11,
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    category: 'shopping',
    district: 'East Market',
    description: 'Fresh snacks, chilly aisles, and bright checkout lanes.',
    accentHex: '#10b981',
    roofHex: '#34d399',
    wallHex: '#d1fae5',
    heightLevel: 2,
    bounds: [50, -40, 66, -24],
    spawn: { x: 48, z: -32, facing: 'E' },
    discoverRadius: 11,
  },
  {
    id: 'coffee_shop',
    name: 'Coffee Shop',
    category: 'dining',
    district: 'East Market',
    description: 'Cozy espresso bar, pastry counter, and patio seating.',
    accentHex: '#b45309',
    roofHex: '#d97706',
    wallHex: '#ffedd5',
    heightLevel: 1,
    bounds: [50, -18, 62, -6],
    spawn: { x: 48, z: -12, facing: 'E' },
    discoverRadius: 10,
  },
  {
    id: 'shopping_mall',
    name: 'Shopping Mall',
    category: 'shopping',
    district: 'East Plaza',
    description: 'Two-story glass atrium mall packed with colorful boutiques.',
    accentHex: '#ec4899',
    roofHex: '#f472b6',
    wallHex: '#fce7f3',
    heightLevel: 3,
    bounds: [74, -14, 94, 14],
    spawn: { x: 71, z: 0, facing: 'E' },
    discoverRadius: 14,
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    category: 'dining',
    district: 'East Market',
    description: 'Modern bistro tables, floral centerpieces, and open kitchen.',
    accentHex: '#e11d48',
    roofHex: '#fb7185',
    wallHex: '#ffe4e6',
    heightLevel: 2,
    bounds: [50, 6, 64, 20],
    spawn: { x: 48, z: 13, facing: 'E' },
    discoverRadius: 11,
  },
  {
    id: 'game_center',
    name: 'Game Center',
    category: 'leisure',
    district: 'West Arcade',
    description: 'Glowing arcade cabinets, trophy shelf, and chill booths.',
    accentHex: '#8b5cf6',
    roofHex: '#a78bfa',
    wallHex: '#ede9fe',
    heightLevel: 2,
    bounds: [-64, -40, -50, -26],
    spawn: { x: -48, z: -33, facing: 'W' },
    discoverRadius: 11,
  },
  {
    id: 'cinema',
    name: 'Cinema',
    category: 'leisure',
    district: 'West Arcade',
    description: 'Snack lobby and tiered theater facing a giant movie screen.',
    accentHex: '#ef4444',
    roofHex: '#334155',
    wallHex: '#cbd5e1',
    heightLevel: 3,
    bounds: [-66, -20, -50, -6],
    spawn: { x: -48, z: -13, facing: 'W' },
    discoverRadius: 11,
  },
  {
    id: 'dance_club',
    name: 'Dance Club',
    category: 'leisure',
    district: 'West Arcade',
    description: 'Checkered party floor, DJ booth, and VIP velvet sofas.',
    accentHex: '#d946ef',
    roofHex: '#c026d3',
    wallHex: '#3b0764',
    heightLevel: 2,
    bounds: [-64, 6, -50, 20],
    spawn: { x: -48, z: 13, facing: 'W' },
    discoverRadius: 11,
  },
  {
    id: 'gym',
    name: 'Gym',
    category: 'leisure',
    district: 'South Boulevard',
    description: 'Workout floor mats, locker cabinets, and hydration bar.',
    accentHex: '#14b8a6',
    roofHex: '#2dd4bf',
    wallHex: '#ccfbf1',
    heightLevel: 2,
    bounds: [-22, 52, -6, 66],
    spawn: { x: -14, z: 50, facing: 'S' },
    discoverRadius: 11,
  },
  {
    id: 'hotel',
    name: 'Hotel',
    category: 'dining',
    district: 'South Boulevard',
    description: 'Two-story resort lobby, reception counter, and guest suites.',
    accentHex: '#6366f1',
    roofHex: '#818cf8',
    wallHex: '#e0e7ff',
    heightLevel: 3,
    bounds: [6, 52, 22, 70],
    spawn: { x: 14, z: 50, facing: 'S' },
    discoverRadius: 12,
  },
  {
    id: 'car_showroom',
    name: 'Car Showroom',
    category: 'shopping',
    district: 'South Boulevard',
    description: 'Glass auto pavilion showcasing bright custom blocky cars.',
    accentHex: '#0284c7',
    roofHex: '#38bdf8',
    wallHex: '#e0f2fe',
    heightLevel: 2,
    bounds: [28, 52, 46, 68],
    spawn: { x: 37, z: 50, facing: 'S' },
    discoverRadius: 12,
  },
  {
    id: 'beach',
    name: 'Beach',
    category: 'leisure',
    district: 'South Coast',
    description: 'Expanded golden beach, oceanfront pier, sun loungers & shallow swimming bay with fish.',
    accentHex: '#06b6d4',
    roofHex: '#fde047',
    wallHex: '#fef08a',
    heightLevel: 1,
    bounds: [-64, 130, 64, 186],
    spawn: { x: 0, z: 131, facing: 'S' },
    discoverRadius: 28,
  },
  {
    id: 'xsuit_arena',
    name: 'Fashion Arena',
    category: 'shopping',
    district: 'East Promenade',
    description: 'Two-story Cyber Fashion Plaza showcasing glowing futuristic X-Suits.',
    accentHex: '#a855f7',
    roofHex: '#38bdf8',
    wallHex: '#e0f2fe',
    heightLevel: 3,
    bounds: [152, -20, 170, -2],
    spawn: { x: 149, z: -11, facing: 'E' },
    discoverRadius: 14,
  },
  {
    id: 'observatory',
    name: 'Observatory',
    category: 'civic',
    district: 'West Horizon',
    description: 'Crown Hill Observatory overlooking the western forest trail and stars.',
    accentHex: '#0284c7',
    roofHex: '#475569',
    wallHex: '#f8fafc',
    heightLevel: 3,
    bounds: [-168, -20, -152, -5],
    spawn: { x: -160, z: -3, facing: 'N' },
    discoverRadius: 14,
  },
  {
    id: 'pine_lodge',
    name: 'Woods Lodge',
    category: 'dining',
    district: 'North Woods',
    description: 'Whispering Woods timber lodge tucked along the outer forest boulevard.',
    accentHex: '#b45309',
    roofHex: '#64748b',
    wallHex: '#ffedd5',
    heightLevel: 2,
    bounds: [56, -160, 72, -146],
    spawn: { x: 64, z: -144, facing: 'N' },
    discoverRadius: 13,
  },
];

export const HOME_VILLA_WAYPOINT = {
  name: "My Dream Villa",
  district: 'South Avenue',
  bounds: [10, 80, 34, 102] as const,
  spawn: { x: 14.5, z: 91, facing: 'W' as CardinalFacing },
};

export function facingToCamYaw(facing: CardinalFacing): number {
  switch (facing) {
    case 'N':
      return 0;
    case 'S':
      return Math.PI;
    case 'E':
      return -Math.PI / 2;
    case 'W':
      return Math.PI / 2;
  }
}

export function getLocationById(id: CityLocationId): CityLocation | undefined {
  return CITY_LOCATIONS.find((loc) => loc.id === id);
}

const DISCOVERED_LOCATIONS_KEY = 'spc_city_discovered_locations_v1';

export function loadDiscoveredLocations(): CityLocationId[] {
  if (typeof window === 'undefined') return ['park'];
  try {
    const raw = window.localStorage.getItem(DISCOVERED_LOCATIONS_KEY);
    if (!raw) return ['park'];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ['park'];
    const valid = new Set<CityLocationId>(CITY_LOCATIONS.map((l) => l.id));
    const filtered = parsed.filter(
      (item): item is CityLocationId =>
        typeof item === 'string' && valid.has(item as CityLocationId),
    );
    return filtered.length > 0 ? Array.from(new Set(filtered)) : ['park'];
  } catch {
    return ['park'];
  }
}

export function saveDiscoveredLocations(ids: CityLocationId[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISCOVERED_LOCATIONS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function findNearbyLocation(
  px: number,
  pz: number,
): CityLocation | null {
  for (let i = 0; i < CITY_LOCATIONS.length; i++) {
    const loc = CITY_LOCATIONS[i];
    const [x0, z0, x1, z1] = loc.bounds;
    const pad = loc.discoverRadius * 0.45;
    const insideBounds =
      px >= x0 - pad && px <= x1 + pad && pz >= z0 - pad && pz <= z1 + pad;
    const dx = px - loc.spawn.x;
    const dz = pz - loc.spawn.z;
    if (insideBounds || dx * dx + dz * dz <= loc.discoverRadius * loc.discoverRadius) {
      return loc;
    }
  }
  return null;
}
