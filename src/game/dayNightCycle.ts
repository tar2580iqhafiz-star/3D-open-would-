import * as THREE from 'three';

export const DAY_DURATION_SEC = 12 * 60; // Exactly 12 minutes of daytime
export const NIGHT_DURATION_SEC = 12 * 60; // Exactly 12 minutes of nighttime
export const FULL_CYCLE_SEC = DAY_DURATION_SEC + NIGHT_DURATION_SEC; // 24 minutes full cycle
export const DEFAULT_START_CYCLE_SEC = 180; // 09:00 bright morning sky at initial world launch
export const DAY_PRESET_CYCLE_SEC = 240; // 10:00 clear sunlit daytime preset for instant SUN toggle
export const NIGHT_PRESET_CYCLE_SEC = 960; // 22:00 starry moonlit nighttime preset for instant MOON toggle

const DAY_TIME_STORAGE_KEY = 'spc_city_day_time_v1';

export type DayNightPhase = 'dawn' | 'day' | 'sunset' | 'night';

export interface DayNightState {
  cycleTimeSec: number;
  normalizedPhase: number;
  isDay: boolean;
  phase: DayNightPhase;
  phaseLabel: string;
  formattedClock: string;
  sunElevation: number;
  moonElevation: number;
  dayFactor: number;
  nightFactor: number;
  twilightFactor: number;
  cityLightsLevel: number;
  starOpacity: number;
  sunDiskOpacity: number;
  moonDiskOpacity: number;
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  activeShadowDir: THREE.Vector3;
  skyTopColor: THREE.Color;
  skyMidColor: THREE.Color;
  skyHorizonColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  cloudColor: THREE.Color;
  cloudOpacity: number;
  sunDiskColor: THREE.Color;
  sunGlowColor: THREE.Color;
  keyLightColor: THREE.Color;
  keyLightIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  rimColor: THREE.Color;
  rimIntensity: number;
  waterTintColor: THREE.Color;
  toneExposure: number;
  envIntensity: number;
}

// Pre-allocated keyframe palette (zero runtime allocation)
const COL_DAY_TOP = new THREE.Color('#1a66d8');
const COL_DAY_MID = new THREE.Color('#5caef6');
const COL_DAY_HOR = new THREE.Color('#c2e4ff');
const COL_DAY_FOG = new THREE.Color('#b6daf5');
const COL_DAY_CLOUD = new THREE.Color('#ffffff');
const COL_DAY_KEY = new THREE.Color('#fff5e0');
const COL_DAY_HEMI_SKY = new THREE.Color('#d8eeff');
const COL_DAY_HEMI_GND = new THREE.Color('#8e9c9a');
const COL_DAY_RIM = new THREE.Color('#cfe7ff');
const COL_DAY_WATER = new THREE.Color('#ffffff');

const COL_TWILIGHT_TOP = new THREE.Color('#273d78');
const COL_TWILIGHT_MID = new THREE.Color('#b85d63');
const COL_TWILIGHT_HOR = new THREE.Color('#ff9d52');
const COL_TWILIGHT_FOG = new THREE.Color('#d98862');
const COL_TWILIGHT_CLOUD = new THREE.Color('#ffc499');
const COL_TWILIGHT_KEY = new THREE.Color('#ff9c54');
const COL_TWILIGHT_HEMI_SKY = new THREE.Color('#f4a27e');
const COL_TWILIGHT_HEMI_GND = new THREE.Color('#6a5861');
const COL_TWILIGHT_RIM = new THREE.Color('#ffad7a');
const COL_TWILIGHT_WATER = new THREE.Color('#ffd3b0');

const COL_NIGHT_TOP = new THREE.Color('#040817');
const COL_NIGHT_MID = new THREE.Color('#0a1530');
const COL_NIGHT_HOR = new THREE.Color('#162952');
const COL_NIGHT_FOG = new THREE.Color('#101d3b');
const COL_NIGHT_CLOUD = new THREE.Color('#253759');
const COL_NIGHT_KEY = new THREE.Color('#8bb4f8');
const COL_NIGHT_HEMI_SKY = new THREE.Color('#304b82');
const COL_NIGHT_HEMI_GND = new THREE.Color('#192238');
const COL_NIGHT_RIM = new THREE.Color('#5677b8');
const COL_NIGHT_WATER = new THREE.Color('#7ca3d8');

const COL_SUN_DISK_NOON = new THREE.Color('#fff9d6');
const COL_SUN_DISK_HOR = new THREE.Color('#ff8b3d');
const COL_SUN_GLOW_DAY = new THREE.Color('#ffe89e');
const COL_SUN_GLOW_HOR = new THREE.Color('#ff7338');

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function wrapCycleTime(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_START_CYCLE_SEC;
  const wrapped = ((seconds % FULL_CYCLE_SEC) + FULL_CYCLE_SEC) % FULL_CYCLE_SEC;
  return wrapped;
}

export function loadSavedDayTime(): number {
  if (typeof window === 'undefined') return DEFAULT_START_CYCLE_SEC;
  try {
    const raw = window.localStorage.getItem(DAY_TIME_STORAGE_KEY);
    if (!raw) return DEFAULT_START_CYCLE_SEC;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? wrapCycleTime(parsed) : DEFAULT_START_CYCLE_SEC;
  } catch {
    return DEFAULT_START_CYCLE_SEC;
  }
}

export function saveDayTime(cycleTimeSec: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAY_TIME_STORAGE_KEY, wrapCycleTime(cycleTimeSec).toFixed(2));
  } catch {
    // Ignore storage write quota errors
  }
}

export function createDayNightState(): DayNightState {
  return {
    cycleTimeSec: DEFAULT_START_CYCLE_SEC,
    normalizedPhase: DEFAULT_START_CYCLE_SEC / FULL_CYCLE_SEC,
    isDay: true,
    phase: 'day',
    phaseLabel: 'Day',
    formattedClock: '09:00',
    sunElevation: 0.7,
    moonElevation: -0.7,
    dayFactor: 1,
    nightFactor: 0,
    twilightFactor: 0,
    cityLightsLevel: 0,
    starOpacity: 0,
    sunDiskOpacity: 1,
    moonDiskOpacity: 0,
    sunDir: new THREE.Vector3(0.7, 0.7, 0.2),
    moonDir: new THREE.Vector3(-0.7, -0.7, -0.2),
    activeShadowDir: new THREE.Vector3(0.65, 0.72, 0.24),
    skyTopColor: new THREE.Color(COL_DAY_TOP),
    skyMidColor: new THREE.Color(COL_DAY_MID),
    skyHorizonColor: new THREE.Color(COL_DAY_HOR),
    fogColor: new THREE.Color(COL_DAY_FOG),
    fogDensity: 0.0068,
    cloudColor: new THREE.Color(COL_DAY_CLOUD),
    cloudOpacity: 0.9,
    sunDiskColor: new THREE.Color(COL_SUN_DISK_NOON),
    sunGlowColor: new THREE.Color(COL_SUN_GLOW_DAY),
    keyLightColor: new THREE.Color(COL_DAY_KEY),
    keyLightIntensity: 1.85,
    hemiSkyColor: new THREE.Color(COL_DAY_HEMI_SKY),
    hemiGroundColor: new THREE.Color(COL_DAY_HEMI_GND),
    hemiIntensity: 1.15,
    rimColor: new THREE.Color(COL_DAY_RIM),
    rimIntensity: 0.65,
    waterTintColor: new THREE.Color(COL_DAY_WATER),
    toneExposure: 1.08,
    envIntensity: 0.85,
  };
}

export function evaluateDayNightCycle(
  rawCycleTimeSec: number,
  out: DayNightState = createDayNightState(),
): DayNightState {
  const cycleTimeSec = wrapCycleTime(rawCycleTimeSec);
  const normalizedPhase = cycleTimeSec / FULL_CYCLE_SEC;
  const isDay = cycleTimeSec < DAY_DURATION_SEC;

  // Map 0..1440s onto 24h game clock starting at 06:00 sunrise (0s = 06:00, 720s = 18:00, 1080s = 00:00)
  const clockMinutesTotal = Math.floor(((cycleTimeSec / FULL_CYCLE_SEC) * 1440 + 360) % 1440);
  const hours = Math.floor(clockMinutesTotal / 60);
  const mins = clockMinutesTotal % 60;
  const formattedClock = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  // Celestial orbit angle: 0 at sunrise East (+X), PI/2 at noon zenith, PI at sunset West (-X)
  const sunTheta = normalizedPhase * Math.PI * 2;
  const cosSun = Math.cos(sunTheta);
  const sinSun = Math.sin(sunTheta);

  // Subtle Z tilt keeps directional shadows dynamic even at solar noon
  out.sunDir.set(cosSun * 0.94, sinSun, 0.34).normalize();
  out.moonDir.copy(out.sunDir).negate();

  const sunElev = out.sunDir.y;
  const moonElev = out.moonDir.y;
  out.sunElevation = sunElev;
  out.moonElevation = moonElev;

  // Smooth blend curves for sunrise, full day, sunset, and night
  const dayFactor = smoothstep(-0.1, 0.16, sunElev);
  const nightFactor = 1 - dayFactor;
  const twilightFactor = Math.max(
    0,
    Math.exp(-Math.pow((sunElev - 0.03) / 0.14, 2)) * 0.95,
  );

  // City lights (streetlights, building windows, house lamps) switch ON before full dark and OFF cleanly after sunrise
  const cityLightsLevel = smoothstep(0.06, -0.06, sunElev);
  const starOpacity = smoothstep(-0.04, -0.26, sunElev);
  const sunDiskOpacity = smoothstep(-0.06, 0.05, sunElev);
  const moonDiskOpacity = smoothstep(-0.04, 0.08, moonElev);

  let phase: DayNightPhase = 'day';
  let phaseLabel = 'Day';
  if (cycleTimeSec < 65 || cycleTimeSec >= FULL_CYCLE_SEC - 35) {
    phase = 'dawn';
    phaseLabel = 'Sunrise';
  } else if (cycleTimeSec >= DAY_DURATION_SEC - 65 && cycleTimeSec < DAY_DURATION_SEC + 35) {
    phase = 'sunset';
    phaseLabel = 'Sunset';
  } else if (!isDay) {
    phase = 'night';
    phaseLabel = 'Night';
  }

  out.cycleTimeSec = cycleTimeSec;
  out.normalizedPhase = normalizedPhase;
  out.isDay = isDay;
  out.phase = phase;
  out.phaseLabel = phaseLabel;
  out.formattedClock = formattedClock;
  out.dayFactor = dayFactor;
  out.nightFactor = nightFactor;
  out.twilightFactor = twilightFactor;
  out.cityLightsLevel = cityLightsLevel;
  out.starOpacity = starOpacity;
  out.sunDiskOpacity = sunDiskOpacity;
  out.moonDiskOpacity = moonDiskOpacity;

  // Sky colors: Night -> Day, then Sunset/Sunrise horizon warmth blended cleanly on top
  out.skyTopColor
    .copy(COL_NIGHT_TOP)
    .lerp(COL_DAY_TOP, dayFactor)
    .lerp(COL_TWILIGHT_TOP, twilightFactor * 0.55);
  out.skyMidColor
    .copy(COL_NIGHT_MID)
    .lerp(COL_DAY_MID, dayFactor)
    .lerp(COL_TWILIGHT_MID, twilightFactor * 0.72);
  out.skyHorizonColor
    .copy(COL_NIGHT_HOR)
    .lerp(COL_DAY_HOR, dayFactor)
    .lerp(COL_TWILIGHT_HOR, twilightFactor * 0.92);

  out.fogColor
    .copy(COL_NIGHT_FOG)
    .lerp(COL_DAY_FOG, dayFactor)
    .lerp(COL_TWILIGHT_FOG, twilightFactor * 0.7);
  out.fogDensity = THREE.MathUtils.lerp(0.0068, 0.0030, dayFactor) + twilightFactor * 0.0009;

  out.cloudColor
    .copy(COL_NIGHT_CLOUD)
    .lerp(COL_DAY_CLOUD, dayFactor)
    .lerp(COL_TWILIGHT_CLOUD, twilightFactor * 0.85);
  out.cloudOpacity = THREE.MathUtils.lerp(0.56, 0.9, dayFactor);

  out.sunDiskColor.copy(COL_SUN_DISK_HOR).lerp(COL_SUN_DISK_NOON, smoothstep(-0.02, 0.35, sunElev));
  out.sunGlowColor.copy(COL_SUN_GLOW_HOR).lerp(COL_SUN_GLOW_DAY, smoothstep(-0.02, 0.3, sunElev));

  out.hemiSkyColor
    .copy(COL_NIGHT_HEMI_SKY)
    .lerp(COL_DAY_HEMI_SKY, dayFactor)
    .lerp(COL_TWILIGHT_HEMI_SKY, twilightFactor * 0.65);
  out.hemiGroundColor
    .copy(COL_NIGHT_HEMI_GND)
    .lerp(COL_DAY_HEMI_GND, dayFactor)
    .lerp(COL_TWILIGHT_HEMI_GND, twilightFactor * 0.45);
  out.hemiIntensity = THREE.MathUtils.lerp(0.42, 1.18, dayFactor) + twilightFactor * 0.1;

  out.rimColor
    .copy(COL_NIGHT_RIM)
    .lerp(COL_DAY_RIM, dayFactor)
    .lerp(COL_TWILIGHT_RIM, twilightFactor * 0.55);
  out.rimIntensity = THREE.MathUtils.lerp(0.32, 0.68, dayFactor);

  out.waterTintColor
    .copy(COL_NIGHT_WATER)
    .lerp(COL_DAY_WATER, dayFactor)
    .lerp(COL_TWILIGHT_WATER, twilightFactor * 0.52);

  // Active directional key/shadow light tracks Sun during day and smoothly hands off to Moon at night
  const useSunShadow = sunElev >= -0.02;
  if (useSunShadow) {
    out.activeShadowDir.copy(out.sunDir);
    if (out.activeShadowDir.y < 0.2) {
      out.activeShadowDir.y = 0.2;
      out.activeShadowDir.normalize();
    }
    const sunStrength = smoothstep(-0.02, 0.22, sunElev);
    out.keyLightColor
      .copy(COL_TWILIGHT_KEY)
      .lerp(COL_DAY_KEY, smoothstep(0.02, 0.32, sunElev));
    out.keyLightIntensity = 0.18 + sunStrength * 1.75;
  } else {
    out.activeShadowDir.copy(out.moonDir);
    if (out.activeShadowDir.y < 0.24) {
      out.activeShadowDir.y = 0.24;
      out.activeShadowDir.normalize();
    }
    const moonStrength = smoothstep(-0.02, -0.22, sunElev);
    out.keyLightColor.copy(COL_NIGHT_KEY);
    out.keyLightIntensity = 0.16 + moonStrength * 0.44;
  }

  out.toneExposure = THREE.MathUtils.lerp(0.92, 1.1, dayFactor);
  out.envIntensity = THREE.MathUtils.lerp(0.28, 0.88, dayFactor);

  return out;
}
