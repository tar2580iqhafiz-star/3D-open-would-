import { getXSuitItemDef } from './xSuits';

/**
 * Production Google AdMob IDs for the Android game project.
 * Test ads are strictly forbidden in production builds.
 */
export const PRODUCTION_ADMOB_APP_ID = 'ca-app-pub-1097647548047380~4558161173';
export const PRODUCTION_ADMOB_REWARDED_AD_UNIT_ID = 'ca-app-pub-1097647548047380/8090212075';

/**
 * Official Google Mobile Ads Android Test Rewarded Ad Unit ID.
 * Used automatically in local development builds (never in production).
 */
export const GOOGLE_TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

export interface CoinRewardOption {
  id: string;
  title: string;
  coins: number;
  requiredAds: number;
  accentHex: string;
  description: string;
}

export const COIN_REWARD_OPTIONS: readonly CoinRewardOption[] = [
  {
    id: 'coin_pack_75',
    title: 'Quick Coin Pouch',
    coins: 75,
    requiredAds: 1,
    accentHex: '#10b981',
    description: 'Watch 1 full rewarded ad to collect +75 bonus coins.',
  },
  {
    id: 'coin_pack_180',
    title: 'Builder Coin Stash',
    coins: 180,
    requiredAds: 2,
    accentHex: '#0ea5e9',
    description: 'Watch 2 completed ads for +180 coins toward city furniture.',
  },
  {
    id: 'coin_pack_320',
    title: 'Architect Gold Chest',
    coins: 320,
    requiredAds: 3,
    accentHex: '#f59e0b',
    description: 'Watch 3 completed ads to claim a +320 coin vault payout.',
  },
  {
    id: 'coin_pack_500',
    title: 'Mega City Vault',
    coins: 500,
    requiredAds: 4,
    accentHex: '#ec4899',
    description: 'Watch 4 completed ads to unlock the huge +500 coin reward.',
  },
];

const COIN_OPTION_BY_ID = new Map<string, CoinRewardOption>(
  COIN_REWARD_OPTIONS.map((opt) => [opt.id, opt]),
);

export function getCoinRewardOption(id: string): CoinRewardOption | undefined {
  return COIN_OPTION_BY_ID.get(id);
}

export type AdWatchOutcome = 'completed' | 'skipped' | 'closed_early' | 'unavailable' | 'error';

export type AdRewardTarget =
  | {
      kind: 'coins';
      id: string;
      title: string;
      requiredAds: number;
      coins: number;
    }
  | {
      kind: 'outfit';
      id: string;
      title: string;
      requiredAds: number;
      itemId: string;
    };

export interface AdWatchResolution {
  credited: boolean;
  unlockedNow: boolean;
  coinsAwarded: number;
  nextProgress: Record<string, number>;
  nextUnlockedIds: string[];
  watchedAfter: number;
  remainingAfter: number;
  message: string;
}

export function resolveRewardedAdConfig(): {
  appId: string;
  adUnitId: string;
  isTestMode: boolean;
  isProduction: boolean;
} {
  const env =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env
      ? (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env
      : {};

  const rawAppId =
    typeof env.VITE_ADMOB_APP_ID === 'string' ? env.VITE_ADMOB_APP_ID.trim() : '';
  const rawUnitId =
    typeof env.VITE_ADMOB_REWARDED_AD_UNIT_ID === 'string'
      ? env.VITE_ADMOB_REWARDED_AD_UNIT_ID.trim()
      : '';

  const isProd =
    env.PROD === true ||
    env.PROD === 'true' ||
    env.MODE === 'production' ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

  const nativeBridge =
    typeof window !== 'undefined'
      ? (window as unknown as NativeAdMobWindow).AndroidAdMob
      : undefined;
  const nativeDebugTestMode =
    typeof nativeBridge?.isTestMode === 'function' && nativeBridge.isTestMode() === true;

  // Debug Android APKs always use Google's official test rewarded ad unit
  if (nativeDebugTestMode) {
    return {
      appId: rawAppId || PRODUCTION_ADMOB_APP_ID,
      adUnitId: GOOGLE_TEST_REWARDED_AD_UNIT_ID,
      isTestMode: true,
      isProduction: false,
    };
  }

  // Production / Release builds NEVER use test ads
  if (isProd) {
    const safeUnitId =
      rawUnitId && rawUnitId !== GOOGLE_TEST_REWARDED_AD_UNIT_ID
        ? rawUnitId
        : PRODUCTION_ADMOB_REWARDED_AD_UNIT_ID;
    return {
      appId: rawAppId || PRODUCTION_ADMOB_APP_ID,
      adUnitId: safeUnitId,
      isTestMode: false,
      isProduction: true,
    };
  }

  // Local browser development builds keep Google's test rewarded ad unit enabled by default
  const devTestDisabled =
    env.VITE_ADMOB_USE_TEST_ADS === 'false' || env.VITE_ADMOB_USE_TEST_ADS === false;

  if (!devTestDisabled) {
    return {
      appId: rawAppId || PRODUCTION_ADMOB_APP_ID,
      adUnitId: GOOGLE_TEST_REWARDED_AD_UNIT_ID,
      isTestMode: true,
      isProduction: false,
    };
  }

  return {
    appId: rawAppId || PRODUCTION_ADMOB_APP_ID,
    adUnitId: rawUnitId || PRODUCTION_ADMOB_REWARDED_AD_UNIT_ID,
    isTestMode: false,
    isProduction: false,
  };
}

const AD_PROGRESS_STORAGE_KEY = 'spc_city_ad_progress_v1';

export function sanitizeAdProgressMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      (COIN_OPTION_BY_ID.has(key) || Boolean(getXSuitItemDef(key))) &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
    ) {
      out[key] = Math.min(10, Math.floor(value));
    }
  }
  return out;
}

export function loadAdProgressMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AD_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeAdProgressMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveAdProgressMap(progress: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AD_PROGRESS_STORAGE_KEY,
      JSON.stringify(sanitizeAdProgressMap(progress)),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function checkRewardedAdAvailability(): { available: boolean; reason?: string } {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      available: false,
      reason: 'No internet connection. Connect online to load a rewarded ad.',
    };
  }
  return { available: true };
}

export interface NativeAndroidBridge {
  showRewardedAd?: (adUnitId: string, requestId: string) => Promise<boolean> | boolean | void;
  preloadRewardedAd?: (adUnitId: string) => void;
  isRewardedAdReady?: () => boolean;
  isTestMode?: () => boolean;
}

type NativeResultResolver = (outcome: AdWatchOutcome) => void;

interface NativeAdMobWindow extends Window {
  AndroidAdMob?: NativeAndroidBridge;
  __pendingRewardedAdCallbacks?: Record<string, NativeResultResolver>;
  __onNativeRewardedAdResult?: (
    requestId: string,
    outcome: AdWatchOutcome,
    rewardAmount?: number,
    rewardType?: string,
  ) => void;
}

function ensureNativeResultDispatcher(win: NativeAdMobWindow): void {
  if (!win.__pendingRewardedAdCallbacks) {
    win.__pendingRewardedAdCallbacks = {};
  }
  if (!win.__onNativeRewardedAdResult) {
    win.__onNativeRewardedAdResult = (requestId, outcome, rewardAmount) => {
      const cb = win.__pendingRewardedAdCallbacks?.[requestId];
      if (!cb) return;
      delete win.__pendingRewardedAdCallbacks![requestId];
      // Grant completion ONLY when native Android OnUserEarnedRewardListener explicitly confirms completion + reward
      if (
        outcome === 'completed' &&
        (typeof rewardAmount !== 'number' || rewardAmount > 0)
      ) {
        cb('completed');
      } else if (outcome === 'closed_early' || outcome === 'skipped') {
        cb(outcome);
      } else if (outcome === 'completed') {
        cb('closed_early');
      } else {
        cb(outcome || 'unavailable');
      }
    };
  }
}

export function isNativeAndroidAdBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as NativeAdMobWindow;
  return typeof win.AndroidAdMob?.showRewardedAd === 'function';
}

/**
 * Triggers native Google Mobile Ads SDK rewarded ad playback via the custom
 * Kotlin Android WebView `AndroidAdMob` JavascriptInterface bridge (`MainActivity.kt`).
 *
 * NOTE: Does NOT rely on `Function.length` (Android Chromium Java method proxies often report length === 0).
 * Always passes `(adUnitId, requestId)` and waits for `__onNativeRewardedAdResult(requestId, ...)`
 * unless the bridge explicitly returns a synchronous/Promise boolean.
 *
 * Returns `null` when running in a standard desktop/mobile browser without the Android WebView bridge.
 */
export async function tryShowNativeRewardedAd(
  adUnitId: string,
): Promise<AdWatchOutcome | null> {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as NativeAdMobWindow;
  const bridge = win.AndroidAdMob;

  if (!bridge || typeof bridge.showRewardedAd !== 'function') {
    return null;
  }

  ensureNativeResultDispatcher(win);

  const requestId = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return new Promise<AdWatchOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: AdWatchOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (win.__pendingRewardedAdCallbacks) {
        delete win.__pendingRewardedAdCallbacks[requestId];
      }
      resolve(outcome);
    };

    const timeoutId = window.setTimeout(() => {
      finish('unavailable');
    }, 90_000);

    win.__pendingRewardedAdCallbacks![requestId] = finish;

    try {
      const ret = bridge.showRewardedAd!(adUnitId, requestId);
      // Support Promise or explicit boolean returns in test environments;
      // on real Android @JavascriptInterface (returns Unit/void -> undefined), await __onNativeRewardedAdResult.
      if (typeof ret === 'boolean') {
        finish(ret ? 'completed' : 'closed_early');
      } else if (ret && typeof (ret as Promise<boolean>).then === 'function') {
        (ret as Promise<boolean>).then(
          (ok) => finish(ok === true ? 'completed' : 'closed_early'),
          () => finish('unavailable'),
        );
      }
    } catch {
      finish('error');
    }
  });
}

/**
 * Strictly validates the rewarded ad session outcome.
 * Progress, coins, and X-Suit unlocks are ONLY granted when outcome === 'completed'.
 * Skipped, closed-early, unavailable, or failed ads grant ZERO progress and ZERO rewards.
 */
export function applyAdWatchOutcome(
  progressMap: Record<string, number>,
  unlockedIds: readonly string[],
  target: AdRewardTarget,
  outcome: AdWatchOutcome,
): AdWatchResolution {
  const prevWatched = progressMap[target.id] ?? 0;

  if (outcome !== 'completed') {
    const remaining = Math.max(0, target.requiredAds - prevWatched);
    const reasonMsg =
      outcome === 'skipped' || outcome === 'closed_early'
        ? 'Ad closed before finishing — no progress or reward granted.'
        : 'Rewarded ad failed or unavailable right now — please try again.';
    return {
      credited: false,
      unlockedNow: false,
      coinsAwarded: 0,
      nextProgress: { ...progressMap },
      nextUnlockedIds: [...unlockedIds],
      watchedAfter: prevWatched,
      remainingAfter: remaining,
      message: reasonMsg,
    };
  }

  // Already unlocked outfit does not consume further progress
  if (target.kind === 'outfit' && unlockedIds.includes(target.itemId)) {
    return {
      credited: false,
      unlockedNow: false,
      coinsAwarded: 0,
      nextProgress: { ...progressMap },
      nextUnlockedIds: [...unlockedIds],
      watchedAfter: target.requiredAds,
      remainingAfter: 0,
      message: `${target.title} is already unlocked!`,
    };
  }

  const nextWatched = Math.min(target.requiredAds, prevWatched + 1);
  const nextProgress = { ...progressMap };
  const nextUnlockedIds = [...unlockedIds];

  if (target.kind === 'coins') {
    if (nextWatched >= target.requiredAds) {
      // Repeatable coin pack completed -> award coins & reset counter cleanly for future watches
      nextProgress[target.id] = 0;
      return {
        credited: true,
        unlockedNow: true,
        coinsAwarded: target.coins,
        nextProgress,
        nextUnlockedIds,
        watchedAfter: target.requiredAds,
        remainingAfter: 0,
        message: `+${target.coins} Coins earned from rewarded ad!`,
      };
    }

    nextProgress[target.id] = nextWatched;
    const rem = target.requiredAds - nextWatched;
    return {
      credited: true,
      unlockedNow: false,
      coinsAwarded: 0,
      nextProgress,
      nextUnlockedIds,
      watchedAfter: nextWatched,
      remainingAfter: rem,
      message: `Ad completed (${nextWatched}/${target.requiredAds}). Watch ${rem} more ad${rem === 1 ? '' : 's'} for +${target.coins} coins!`,
    };
  }

  // Exclusive X-Suit / Gear tier
  nextProgress[target.id] = nextWatched;
  if (nextWatched >= target.requiredAds) {
    if (!nextUnlockedIds.includes(target.itemId)) {
      nextUnlockedIds.push(target.itemId);
    }
    return {
      credited: true,
      unlockedNow: true,
      coinsAwarded: 0,
      nextProgress,
      nextUnlockedIds,
      watchedAfter: target.requiredAds,
      remainingAfter: 0,
      message: `Unlocked ${target.title}! Added to Inventory & Wardrobe.`,
    };
  }

  const rem = target.requiredAds - nextWatched;
  return {
    credited: true,
    unlockedNow: false,
    coinsAwarded: 0,
    nextProgress,
    nextUnlockedIds,
    watchedAfter: nextWatched,
    remainingAfter: rem,
    message: `Ad completed (${nextWatched}/${target.requiredAds}). Watch ${rem} more ad${rem === 1 ? '' : 's'} to unlock ${target.title}!`,
  };
}
