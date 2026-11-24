import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackpackModal } from './components/BackpackModal';
import { CityMapModal } from './components/CityMapModal';
import { GameHud } from './components/GameHud';
import { LocationIcon } from './components/LocationIcon';
import { RewardedAdModal } from './components/RewardedAdModal';
import { ShopModal } from './components/ShopModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import type { CarInputState } from './game/carSystem';
import { GameEngine } from './game/GameEngine';
import {
  addItemToInventory,
  clearSlotItem,
  consumeOneItemById,
  consumeSlotItem,
  createStarterInventory,
  equipBagItemToHotbar,
  getItemDef,
  HOTBAR_SIZE,
  InventoryState,
  loadInventoryState,
  moveOrSwapSlots,
  saveInventoryState,
  sortBagItems,
  storeHotbarItemToBag,
  voxelIdToItemId,
} from './game/inventory';
import { FolderOpen, Home, Play, Save } from 'lucide-react';
import {
  CityLocation,
  CityLocationId,
  facingToCamYaw,
  findNearbyLocation,
  HOME_VILLA_WAYPOINT,
  loadDiscoveredLocations,
  saveDiscoveredLocations,
} from './game/locations';
import {
  AdRewardTarget,
  AdWatchOutcome,
  applyAdWatchOutcome,
  checkRewardedAdAvailability,
  loadAdProgressMap,
  resolveRewardedAdConfig,
  saveAdProgressMap,
  tryShowNativeRewardedAd,
} from './game/rewardedAds';
import {
  loadCoinBalance,
  loadCollectedWorldCoins,
  saveCoinBalance,
  saveCollectedWorldCoins,
  ShopListing,
} from './game/shop';
import { loadPlayerState, PlayerSaveState } from './game/starterHome';
import {
  loadChestCycleState,
  PersistentChestCycleState,
  saveChestCycleState,
} from './game/treasureChests';
import {
  GameSettings,
  HudSnapshot,
  JoystickVector,
  VoxelId,
} from './game/types';
import {
  extractWorldMetadata,
  loadWorldSnapshotFromDb,
  saveWorldSnapshotToDb,
  WorldSaveMetadata,
  WorldSaveSnapshot,
} from './game/worldStorage';
import {
  EquippedOutfitLoadout,
  getXSuitItemDef,
  isExclusiveXSuitItemId,
  loadXSuitState,
  sanitizeEquippedLoadout,
  saveXSuitState,
} from './game/xSuits';
import { useViewportLayout } from './game/useViewportLayout';

export default function App() {
  const viewportLayout = useViewportLayout();
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const cameraPointerId = useRef<number | null>(null);
  const lastCamPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tapStartMeta = useRef<{ time: number; travel: number }>({ time: 0, travel: 0 });
  const toastTimerRef = useRef<number | null>(null);
  const travelTimerRef = useRef<number | null>(null);

  const worldHydratedRef = useRef(false);
  const startedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [savedPlayerState, setSavedPlayerState] = useState<PlayerSaveState | null>(() =>
    loadPlayerState(),
  );
  const [worldMeta, setWorldMeta] = useState<WorldSaveMetadata>(() =>
    extractWorldMetadata(null),
  );
  const [paused, setPaused] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [travelingTo, setTravelingTo] = useState<{
    id: CityLocationId | 'home_villa';
    name: string;
    district: string;
  } | null>(null);
  const [discoveredLocations, setDiscoveredLocations] = useState<CityLocationId[]>(() =>
    loadDiscoveredLocations(),
  );
  const [sprintLocked, setSprintLocked] = useState(false);
  const [decorateMode, setDecorateMode] = useState(false);
  const [coins, setCoins] = useState<number>(() => loadCoinBalance());
  const [collectedCoins, setCollectedCoins] = useState<number[]>(() =>
    loadCollectedWorldCoins(),
  );
  const [initialChestState] = useState<PersistentChestCycleState>(() =>
    loadChestCycleState(),
  );
  const [chestState, setChestState] = useState<PersistentChestCycleState>(initialChestState);
  const [openedChests, setOpenedChests] = useState<number[]>(() =>
    initialChestState.chests.filter((c) => c.opened).map((c) => c.id),
  );
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventoryState());
  const [initialXSuitState] = useState(() => loadXSuitState());
  const [unlockedOutfits, setUnlockedOutfits] = useState<string[]>(initialXSuitState.unlockedIds);
  const [equippedOutfit, setEquippedOutfit] = useState<EquippedOutfitLoadout>(
    initialXSuitState.equipped,
  );
  const [adProgress, setAdProgress] = useState<Record<string, number>>(() => loadAdProgressMap());
  const [activeAdTarget, setActiveAdTarget] = useState<AdRewardTarget | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    cameraSensitivity: 1.0,
    soundEnabled: true,
    invertCameraY: false,
  });
  const [replacingRecord, setReplacingRecord] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const latestStateRef = useRef({
    coins,
    collectedCoins,
    openedChests,
    inventory,
    unlockedOutfits,
    equippedOutfit,
    adProgress,
    discoveredLocations,
    settings,
  });
  latestStateRef.current = {
    coins,
    collectedCoins,
    openedChests,
    inventory,
    unlockedOutfits,
    equippedOutfit,
    adProgress,
    discoveredLocations,
    settings,
  };
  startedRef.current = started;
  const [hud, setHud] = useState<HudSnapshot>({
    gait: 'idle',
    speedMs: 0,
    grounded: true,
    inShallowWater: false,
    isUnderwater: false,
    headingDeg: 0,
    hasTargetBlock: false,
    targetIsFixed: false,
    cameraMode: 'back',
    playerX: 14.5,
    playerZ: 91,
    isDancing: false,
    isFlying: false,
    inDanceClub: false,
    danceMusicPlaying: true,
    danceMusicPowerOn: true,
    danceTrackTitle: 'Neon Pulse',
    danceVolume: 0.65,
    inFurnitureShop: false,
    inHomeHouse: true,
    currentHouseName: "Player's Dream Villa",
    placementMode: 'none',
    placementItemName: null,
    placementValid: true,
    placementReason: null,
    interactingMode: 'none',
    nearbyActionLabel: null,
    nearbyPlacedId: null,
    nearbyPlacedName: null,
    nearbyIsMovable: false,
    nearbyScreenX: null,
    nearbyScreenY: null,
    inVehicle: false,
    vehicleName: null,
    vehicleSpeedKmh: 0,
    nearbyCarId: null,
    nearbyCarName: null,
    nearbyCarScreenX: null,
    nearbyCarScreenY: null,
    nearbyChestId: null,
    nearbyChestScreenX: null,
    nearbyChestScreenY: null,
    dayTimeSec: 180,
    dayTimeLabel: '09:00 · Day',
    dayPhase: 'day',
  });

  const showToast = useCallback((message: string) => {
    setFeedbackToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setFeedbackToast(null);
      toastTimerRef.current = null;
    }, 1700);
  }, []);

  const persistWorldNow = useCallback(
    async (manual = false, forceStartedOnce = false): Promise<boolean> => {
      const engine = engineRef.current;
      if (!engine || !worldHydratedRef.current) return false;
      const runtime = engine.exportWorldRuntimeState();
      const state = latestStateRef.current;
      const snapshot: WorldSaveSnapshot = {
        version: 2,
        savedAt: Date.now(),
        dayTimeSec: runtime.dayTimeSec,
        player: forceStartedOnce
          ? { ...runtime.player, hasStartedOnce: true }
          : runtime.player,
        coins: state.coins,
        collectedWorldCoins: [...state.collectedCoins],
        openedChests: [...state.openedChests],
        chestState: runtime.chestState,
        inventory: state.inventory,
        placedFurniture: runtime.placedFurniture,
        starterFurnitureSeeded: runtime.starterFurnitureSeeded,
        discoveredLocations: [...state.discoveredLocations],
        settings: state.settings,
        voxelIndices: runtime.voxelIndices,
        voxelIds: runtime.voxelIds,
        gridMin: runtime.gridMin,
        gridSize: runtime.gridSize,
        xSuits: {
          unlockedIds: [...state.unlockedOutfits],
          equipped: { ...state.equippedOutfit },
          adProgress: { ...state.adProgress },
        },
      };
      const ok = await saveWorldSnapshotToDb(snapshot);
      setWorldMeta(extractWorldMetadata(snapshot));
      setSavedPlayerState(snapshot.player);
      if (manual) {
        showToast(ok ? 'World saved!' : 'Save failed — check storage');
      }
      return ok;
    },
    [showToast],
  );

  const persistWorldNowRef = useRef(persistWorldNow);
  persistWorldNowRef.current = persistWorldNow;

  // Immediate IndexedDB auto-save whenever coins, chests, inventory, X-Suits, locations, or settings change
  useEffect(() => {
    if (!worldHydratedRef.current || !started) return;
    void persistWorldNow(false);
  }, [
    coins,
    collectedCoins,
    openedChests,
    inventory,
    unlockedOutfits,
    equippedOutfit,
    adProgress,
    discoveredLocations,
    settings,
    started,
    persistWorldNow,
  ]);

  // Periodic auto-save (every 5s) + pagehide / beforeunload / visibilitychange safety flush
  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (!worldHydratedRef.current || !startedRef.current) return;
      void persistWorldNowRef.current(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleVisibilityOrUnload();
      } else if (document.visibilityState === 'visible') {
        engineRef.current?.checkChestRefresh();
      }
    };

    window.addEventListener('pagehide', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let intervalId: number | null = null;
    if (started) {
      intervalId = window.setInterval(() => {
        engineRef.current?.checkChestRefresh();
        void persistWorldNowRef.current(false);
      }, 5000);
    }

    return () => {
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [started]);

  // Persist coin balance & collected world coins locally
  useEffect(() => {
    saveCoinBalance(coins);
  }, [coins]);

  useEffect(() => {
    saveCollectedWorldCoins(collectedCoins);
    engineRef.current?.setCollectedWorldCoins(collectedCoins);
  }, [collectedCoins]);

  useEffect(() => {
    saveChestCycleState(chestState);
  }, [chestState]);

  // Persist inventory state locally & sync active equipped loadout to the 3D engine
  useEffect(() => {
    saveInventoryState(inventory);

    const activeSlot = inventory.hotbar[inventory.selectedHotbarIndex];
    const def = activeSlot && activeSlot.qty > 0 ? getItemDef(activeSlot.itemId) : null;
    engineRef.current?.setEquippedLoadout({
      voxelId: def?.voxelId ?? null,
      previewBlock: def?.previewBlock ?? 'grass',
      fastBreak: def?.toolBehavior === 'fast_break',
    });
  }, [inventory]);

  // Persist X-Suits wardrobe, ad progress & sync live 3D outfit onto the player rig
  useEffect(() => {
    saveXSuitState({ unlockedIds: unlockedOutfits, equipped: equippedOutfit });
    engineRef.current?.setEquippedOutfit(equippedOutfit);
  }, [unlockedOutfits, equippedOutfit]);

  useEffect(() => {
    saveAdProgressMap(adProgress);
  }, [adProgress]);

  // Persist discovered city locations locally
  useEffect(() => {
    saveDiscoveredLocations(discoveredLocations);
  }, [discoveredLocations]);

  // Auto-discover locations as the player walks near them
  useEffect(() => {
    if (!started || paused || backpackOpen || shopOpen || mapOpen || travelingTo) return;
    const nearby = findNearbyLocation(hud.playerX, hud.playerZ);
    if (nearby && !discoveredLocations.includes(nearby.id)) {
      setDiscoveredLocations((prev) =>
        prev.includes(nearby.id) ? prev : [...prev, nearby.id],
      );
      engineRef.current?.playDiscoverySound();
      showToast(`Discovered: ${nearby.name}!`);
    }
  }, [
    backpackOpen,
    discoveredLocations,
    hud.playerX,
    hud.playerZ,
    mapOpen,
    paused,
    shopOpen,
    showToast,
    started,
    travelingTo,
  ]);

  // Keep engine pause state synced with Start Screen, Pause, Backpack, Shop, Map, Rewarded Ad, and Teleport
  useEffect(() => {
    engineRef.current?.setPaused(
      !started || paused || backpackOpen || shopOpen || mapOpen || Boolean(travelingTo) || Boolean(activeAdTarget),
    );
  }, [started, paused, backpackOpen, shopOpen, mapOpen, travelingTo, activeAdTarget]);

  // Mount Three.js engine once inside isolated container & hydrate persistent world from IndexedDB
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;
    let cancelled = false;
    worldHydratedRef.current = false;

    const engine = new GameEngine(container, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onContextLost: (lost) => setContextLost(lost),
      onCollectVoxel: (voxelId: VoxelId) => {
        const itemId = voxelIdToItemId(voxelId);
        if (!itemId) return;
        const def = getItemDef(itemId);
        setInventory((prev) => {
          const { state, added } = addItemToInventory(prev, itemId, 1);
          if (added > 0 && def) {
            showToast(`+1 ${def.name}`);
          } else if (added === 0) {
            showToast('Backpack full');
          }
          return state;
        });
      },
      onConsumeEquipped: () => {
        setInventory((prev) => consumeSlotItem(prev, 'hotbar', prev.selectedHotbarIndex));
      },
      onCollectWorldCoin: (coinId: number, amount: number) => {
        setCollectedCoins((prev) => (prev.includes(coinId) ? prev : [...prev, coinId]));
        setCoins((prev) => prev + amount);
        showToast(amount >= 50 ? `+${amount} Bonus Coins!` : `+${amount} Coins!`);
      },
      onCollectChestReward: (
        chestId: number,
        amount: number,
        nextChestState: PersistentChestCycleState,
      ) => {
        setChestState(nextChestState);
        setOpenedChests((prev) => (prev.includes(chestId) ? prev : [...prev, chestId]));
        setCoins((prev) => prev + amount);
        showToast(`Treasure Chest! +${amount} Coins!`);
      },
      onChestsRefreshed: (nextChestState: PersistentChestCycleState) => {
        setChestState(nextChestState);
        setOpenedChests(nextChestState.chests.filter((c) => c.opened).map((c) => c.id));
        if (startedRef.current) {
          showToast('Coin Chests refreshed in new locations!');
        }
        if (worldHydratedRef.current) {
          void persistWorldNowRef.current(false);
        }
      },
      onFixedBlockHit: () => {
        showToast('Protected building — house & room blocks cannot be broken');
      },
      onConsumeFurnitureItem: (itemId: string) => {
        setInventory((prev) => consumeOneItemById(prev, itemId).state);
      },
      onReturnFurnitureItem: (itemId: string) => {
        setInventory((prev) => addItemToInventory(prev, itemId, 1).state);
      },
      onSwapFurnitureItem: (oldItemId: string, newItemId: string) => {
        setInventory((prev) => {
          const afterConsume = consumeOneItemById(prev, newItemId).state;
          return addItemToInventory(afterConsume, oldItemId, 1).state;
        });
      },
      onFurnitureToast: (message: string) => {
        showToast(message);
      },
      onWorldDirty: () => {
        void persistWorldNowRef.current(false);
      },
    });
    engineRef.current = engine;
    engine.setCollectedWorldCoins(loadCollectedWorldCoins());

    // Apply initial equipped loadout & X-Suit outfit immediately upon mount
    const initial = loadInventoryState();
    const activeSlot = initial.hotbar[initial.selectedHotbarIndex];
    const def = activeSlot && activeSlot.qty > 0 ? getItemDef(activeSlot.itemId) : null;
    engine.setEquippedLoadout({
      voxelId: def?.voxelId ?? null,
      previewBlock: def?.previewBlock ?? 'grass',
      fastBreak: def?.toolBehavior === 'fast_break',
    });
    engine.setEquippedOutfit(latestStateRef.current.equippedOutfit);

    // Hydrate permanent world state from IndexedDB
    void (async () => {
      const snap = await loadWorldSnapshotFromDb();
      if (cancelled || engineRef.current !== engine) return;

      if (snap) {
        const nextChestState = snap.chestState ?? loadChestCycleState();
        const nextChests = nextChestState.chests.filter((c) => c.opened).map((c) => c.id);
        setCoins(snap.coins);
        setCollectedCoins(snap.collectedWorldCoins);
        setChestState(nextChestState);
        setOpenedChests(nextChests);
        setInventory(snap.inventory);
        setDiscoveredLocations(snap.discoveredLocations);
        setSavedPlayerState(snap.player);
        setWorldMeta(extractWorldMetadata(snap));
        if (snap.xSuits) {
          const cleanUnlocked = snap.xSuits.unlockedIds;
          const cleanEquipped = sanitizeEquippedLoadout(snap.xSuits.equipped, cleanUnlocked);
          setUnlockedOutfits(cleanUnlocked);
          setEquippedOutfit(cleanEquipped);
          setAdProgress(snap.xSuits.adProgress);
          engine.setEquippedOutfit(cleanEquipped);
        }
        if (snap.settings) {
          setSettings(snap.settings);
          engine.updateSettings(snap.settings);
        }
        engine.applyLoadedWorldState({
          voxelIndices: snap.voxelIndices,
          voxelIds: snap.voxelIds,
          gridMin: snap.gridMin,
          gridSize: snap.gridSize,
          placedFurniture: snap.placedFurniture,
          starterFurnitureSeeded: snap.starterFurnitureSeeded,
          player: snap.player,
          collectedWorldCoins: snap.collectedWorldCoins,
          openedChests: nextChests,
          chestState: nextChestState,
          dayTimeSec: snap.dayTimeSec,
          restorePlayerPosition: false,
        });
      } else {
        const runtime = engine.exportWorldRuntimeState();
        setWorldMeta({
          exists: false,
          savedAt: null,
          customBlockCount: runtime.voxelIndices.length,
          furnitureCount: runtime.placedFurniture.length,
          coins: latestStateRef.current.coins,
          hasStartedOnce: false,
        });
      }
      worldHydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
      if (worldHydratedRef.current && startedRef.current) {
        void persistWorldNowRef.current(false);
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (travelTimerRef.current !== null) {
        window.clearTimeout(travelTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
  }, [showToast]);

  const handleUseSlotItem = useCallback(
    (zone: 'hotbar' | 'bag', index: number) => {
      setInventory((prev) => {
        const list = zone === 'hotbar' ? prev.hotbar : prev.bag;
        const slot = list[index];
        const def = slot && slot.qty > 0 ? getItemDef(slot.itemId) : null;
        if (!def || !def.consumableEffect) return prev;

        engineRef.current?.triggerConsumableEffect(def.consumableEffect);
        if (def.consumableEffect === 'speed') {
          showToast(`${def.name} · 12s Speed Boost!`);
        } else if (def.consumableEffect === 'energy') {
          showToast(`${def.name} · 8s Energy Dash!`);
        } else {
          showToast(`Enjoyed ${def.name}!`);
        }
        return consumeSlotItem(prev, zone, index);
      });
    },
    [showToast],
  );

  // Keyboard shortcuts: Pause (Esc/P), Backpack (B/I), Shop (M), City Map (N), Hotbar (1-5)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!started) return;
      if (e.code === 'Escape') {
        if (mapOpen) {
          setMapOpen(false);
        } else if (shopOpen) {
          setShopOpen(false);
        } else if (backpackOpen) {
          setBackpackOpen(false);
        } else {
          setPaused((prev) => !prev);
        }
      } else if (e.code === 'KeyP' && !backpackOpen && !shopOpen && !mapOpen) {
        setPaused((prev) => !prev);
      } else if ((e.code === 'KeyB' || e.code === 'KeyI') && !paused && !travelingTo) {
        engineRef.current?.playUiSound();
        setShopOpen(false);
        setMapOpen(false);
        setBackpackOpen((prev) => !prev);
      } else if (e.code === 'KeyM' && !paused && !travelingTo && hud.inFurnitureShop) {
        engineRef.current?.playUiSound();
        setBackpackOpen(false);
        setMapOpen(false);
        setShopOpen((prev) => !prev);
      } else if (e.code === 'KeyN' && !paused && !travelingTo) {
        engineRef.current?.playUiSound();
        setBackpackOpen(false);
        setShopOpen(false);
        setMapOpen((prev) => !prev);
      } else if (
        e.code === 'Digit1' ||
        e.code === 'Digit2' ||
        e.code === 'Digit3' ||
        e.code === 'Digit4' ||
        e.code === 'Digit5'
      ) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        if (idx >= 0 && idx < HOTBAR_SIZE) {
          setInventory((prev) => ({ ...prev, selectedHotbarIndex: idx }));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [backpackOpen, hud.inFurnitureShop, mapOpen, paused, shopOpen, started, travelingTo]);

  const handleTogglePause = useCallback(() => {
    setPaused((prev) => !prev);
  }, []);

  const handleOpenBackpack = useCallback(() => {
    engineRef.current?.playUiSound();
    setReplacingRecord(null);
    setShopOpen(false);
    setMapOpen(false);
    setBackpackOpen(true);
  }, []);

  const handleCloseBackpack = useCallback(() => {
    setReplacingRecord(null);
    setBackpackOpen(false);
  }, []);

  const handleOpenShop = useCallback(() => {
    engineRef.current?.playUiSound();
    setReplacingRecord(null);
    setBackpackOpen(false);
    setMapOpen(false);
    setShopOpen(true);
  }, []);

  const handleCloseShop = useCallback(() => {
    setShopOpen(false);
  }, []);

  const handleOpenMap = useCallback(() => {
    engineRef.current?.playUiSound();
    setBackpackOpen(false);
    setShopOpen(false);
    setMapOpen(true);
  }, []);

  const handleCloseMap = useCallback(() => {
    setMapOpen(false);
  }, []);

  const handleStartGameplay = useCallback(() => {
    engineRef.current?.unlockAudio();
    engineRef.current?.playUiSound();
    engineRef.current?.checkChestRefresh();
    engineRef.current?.spawnAtStarterHome(true);
    setPaused(false);
    setStarted(true);
    window.setTimeout(() => {
      void persistWorldNowRef.current(false, true);
    }, 0);
    showToast("Welcome home to Player's Dream Villa!");
  }, [showToast]);

  const handleSaveWorld = useCallback(async () => {
    engineRef.current?.playUiSound();
    await persistWorldNow(true, true);
  }, [persistWorldNow]);

  const handleLoadWorld = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.unlockAudio();
    engine.playUiSound();

    const snap = await loadWorldSnapshotFromDb();
    if (!snap) {
      if (savedPlayerState) {
        engine.resumeSavedPosition(savedPlayerState);
        setPaused(false);
        setStarted(true);
        showToast('Resumed your saved location');
      } else {
        showToast('No saved world found yet');
      }
      return;
    }

    const nextChestState = snap.chestState ?? loadChestCycleState();
    const nextChests = nextChestState.chests.filter((c) => c.opened).map((c) => c.id);
    worldHydratedRef.current = true;
    setCoins(snap.coins);
    setCollectedCoins(snap.collectedWorldCoins);
    setChestState(nextChestState);
    setOpenedChests(nextChests);
    setInventory(snap.inventory);
    setDiscoveredLocations(snap.discoveredLocations);
    setSavedPlayerState(snap.player);
    setWorldMeta(extractWorldMetadata(snap));
    if (snap.xSuits) {
      const cleanUnlocked = snap.xSuits.unlockedIds;
      const cleanEquipped = sanitizeEquippedLoadout(snap.xSuits.equipped, cleanUnlocked);
      setUnlockedOutfits(cleanUnlocked);
      setEquippedOutfit(cleanEquipped);
      setAdProgress(snap.xSuits.adProgress);
      engine.setEquippedOutfit(cleanEquipped);
    }
    if (snap.settings) {
      setSettings(snap.settings);
      engine.updateSettings(snap.settings);
    }

    engine.applyLoadedWorldState({
      voxelIndices: snap.voxelIndices,
      voxelIds: snap.voxelIds,
      gridMin: snap.gridMin,
      gridSize: snap.gridSize,
      placedFurniture: snap.placedFurniture,
      starterFurnitureSeeded: snap.starterFurnitureSeeded,
      player: snap.player,
      collectedWorldCoins: snap.collectedWorldCoins,
      openedChests: nextChests,
      chestState: nextChestState,
      dayTimeSec: snap.dayTimeSec,
      restorePlayerPosition: true,
    });

    setPaused(false);
    setBackpackOpen(false);
    setShopOpen(false);
    setMapOpen(false);
    setStarted(true);
    showToast(
      `World loaded! (${snap.voxelIndices.length} saved blocks)`,
    );
  }, [savedPlayerState, showToast]);

  const handleTravelHome = useCallback(() => {
    if (travelTimerRef.current !== null) {
      window.clearTimeout(travelTimerRef.current);
    }
    engineRef.current?.playTeleportSound();
    setMapOpen(false);
    setBackpackOpen(false);
    setShopOpen(false);
    setPaused(false);
    setTravelingTo({
      id: 'home_villa',
      name: HOME_VILLA_WAYPOINT.name,
      district: HOME_VILLA_WAYPOINT.district,
    });

    window.setTimeout(() => {
      engineRef.current?.spawnAtStarterHome(true);
    }, 190);

    travelTimerRef.current = window.setTimeout(() => {
      setTravelingTo(null);
      travelTimerRef.current = null;
      showToast("Arrived at Player's Dream Villa");
    }, 620);
  }, [showToast]);

  const handleTravelToLocation = useCallback(
    (location: CityLocation) => {
      if (travelTimerRef.current !== null) {
        window.clearTimeout(travelTimerRef.current);
      }
      engineRef.current?.playTeleportSound();
      setMapOpen(false);
      setBackpackOpen(false);
      setShopOpen(false);
      setPaused(false);
      setTravelingTo({
        id: location.id,
        name: location.name,
        district: location.district,
      });

      const isNewDiscovery = !discoveredLocations.includes(location.id);
      if (isNewDiscovery) {
        setDiscoveredLocations((prev) =>
          prev.includes(location.id) ? prev : [...prev, location.id],
        );
      }

      // Teleport smoothly once loading transition covers viewport
      window.setTimeout(() => {
        engineRef.current?.teleportTo(
          location.spawn.x,
          location.spawn.z,
          facingToCamYaw(location.spawn.facing),
        );
      }, 190);

      travelTimerRef.current = window.setTimeout(() => {
        setTravelingTo(null);
        travelTimerRef.current = null;
        showToast(
          isNewDiscovery
            ? `Discovered ${location.name}!`
            : `Arrived at ${location.name}`,
        );
      }, 620);
    },
    [discoveredLocations, showToast],
  );

  const handlePurchaseListing = useCallback(
    (listing: ShopListing) => {
      // Ad-exclusive X-Suits can NEVER be bought with coins
      if (isExclusiveXSuitItemId(listing.itemId)) {
        showToast('Exclusive X-Suits can only be unlocked via Rewarded Ads');
        return;
      }
      const def = getItemDef(listing.itemId);
      if (!def) return;
      if (coins < listing.price) {
        showToast(`Need ${listing.price - coins} more coins`);
        return;
      }

      const { state: nextInventory, added } = addItemToInventory(
        inventory,
        listing.itemId,
        listing.bundleQty,
      );
      if (added === 0) {
        showToast('Backpack is full! Free a slot first.');
        return;
      }

      setCoins((prev) => Math.max(0, prev - listing.price));
      setInventory(nextInventory);
      engineRef.current?.playPurchaseSound();
      showToast(`Purchased ${added}× ${def.name}!`);
    },
    [coins, inventory, showToast],
  );

  const handleToggleEquipOutfit = useCallback(
    (itemId: string) => {
      if (!unlockedOutfits.includes(itemId)) {
        showToast('Unlock this X-Suit first by watching Rewarded Ads!');
        return;
      }
      const def = getXSuitItemDef(itemId);
      if (!def) return;

      setEquippedOutfit((prev) => {
        const next: EquippedOutfitLoadout = { ...prev };
        let equippedNow = false;
        if (def.slot === 'suit') {
          equippedNow = prev.suitId !== def.id;
          next.suitId = equippedNow ? def.id : null;
        } else if (def.slot === 'helmet') {
          equippedNow = prev.helmetId !== def.id;
          next.helmetId = equippedNow ? def.id : null;
        } else if (def.slot === 'boots') {
          equippedNow = prev.bootsId !== def.id;
          next.bootsId = equippedNow ? def.id : null;
        } else {
          equippedNow = prev.accessoryId !== def.id;
          next.accessoryId = equippedNow ? def.id : null;
        }
        showToast(equippedNow ? `Equipped ${def.name}!` : `Removed ${def.name}`);
        return next;
      });
    },
    [showToast, unlockedOutfits],
  );

  const finalizeRewardedAdOutcome = useCallback(
    (target: AdRewardTarget, outcome: AdWatchOutcome) => {
      setActiveAdTarget(null);
      const state = latestStateRef.current;
      const res = applyAdWatchOutcome(
        state.adProgress,
        state.unlockedOutfits,
        target,
        outcome,
      );

      if (!res.credited) {
        showToast(res.message);
        return;
      }

      setAdProgress(res.nextProgress);
      if (res.coinsAwarded > 0) {
        setCoins((prev) => prev + res.coinsAwarded);
        engineRef.current?.playPurchaseSound();
      } else if (target.kind === 'outfit' && res.unlockedNow) {
        setUnlockedOutfits(res.nextUnlockedIds);
        setInventory((prev) => addItemToInventory(prev, target.itemId, 1).state);
        const def = getXSuitItemDef(target.itemId);
        if (def) {
          setEquippedOutfit((prev) => ({
            ...prev,
            suitId: def.slot === 'suit' ? def.id : prev.suitId,
            helmetId: def.slot === 'helmet' ? def.id : prev.helmetId,
            bootsId: def.slot === 'boots' ? def.id : prev.bootsId,
            accessoryId: def.slot === 'accessory' ? def.id : prev.accessoryId,
          }));
        }
        engineRef.current?.playDiscoverySound();
      } else {
        engineRef.current?.playUiSound();
      }

      showToast(res.message);
    },
    [showToast],
  );

  const adSessionBusyRef = useRef(false);

  const handleWatchRewardedAd = useCallback(
    async (target: AdRewardTarget) => {
      if (adSessionBusyRef.current) return;
      const avail = checkRewardedAdAvailability();
      if (!avail.available) {
        showToast(avail.reason ?? 'Rewarded ad unavailable right now.');
        return;
      }

      const cfg = resolveRewardedAdConfig();
      adSessionBusyRef.current = true;
      try {
        const nativeOutcome = await tryShowNativeRewardedAd(cfg.adUnitId);
        if (nativeOutcome !== null) {
          finalizeRewardedAdOutcome(target, nativeOutcome);
          return;
        }
        // Production builds must NEVER replace real Google AdMob ads with fake countdown ads
        if (cfg.isProduction) {
          finalizeRewardedAdOutcome(target, 'unavailable');
          showToast('Real Google AdMob Rewarded Ads require the Android APK.');
          return;
        }
        // Local browser dev preview only (when Android WebView AdMob bridge is unavailable)
        setActiveAdTarget(target);
      } finally {
        adSessionBusyRef.current = false;
      }
    },
    [finalizeRewardedAdOutcome, showToast],
  );

  const handleJoystickChange = useCallback((vec: JoystickVector) => {
    engineRef.current?.setJoystick(vec);
  }, []);

  const handleJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleDive = useCallback(() => {
    engineRef.current?.triggerDive();
  }, []);

  const handleSurface = useCallback(() => {
    engineRef.current?.triggerSurface();
  }, []);

  const handleBreakPress = useCallback(() => {
    engineRef.current?.triggerBreakPress();
  }, []);

  const handleBreakRelease = useCallback(() => {
    engineRef.current?.triggerBreakRelease();
  }, []);

  const handlePlaceOrUse = useCallback(() => {
    const activeSlot = inventory.hotbar[inventory.selectedHotbarIndex];
    const def = activeSlot && activeSlot.qty > 0 ? getItemDef(activeSlot.itemId) : null;
    if (def?.consumableEffect) {
      handleUseSlotItem('hotbar', inventory.selectedHotbarIndex);
      return;
    }
    engineRef.current?.placeSelectedBlock();
  }, [handleUseSlotItem, inventory.hotbar, inventory.selectedHotbarIndex]);

  const handleSelectHotbarSlot = useCallback((index: number) => {
    engineRef.current?.playUiSound();
    setInventory((prev) => ({
      ...prev,
      selectedHotbarIndex: Math.max(0, Math.min(HOTBAR_SIZE - 1, index)),
    }));
  }, []);

  const handleEquipFromBag = useCallback((bagIndex: number, targetHotbarIndex: number) => {
    setInventory((prev) => equipBagItemToHotbar(prev, bagIndex, targetHotbarIndex));
  }, []);

  const handleStoreToBag = useCallback(
    (hotbarIndex: number) => {
      setInventory((prev) => {
        const next = storeHotbarItemToBag(prev, hotbarIndex);
        if (next === prev) {
          showToast('No free bag space');
        }
        return next;
      });
    },
    [showToast],
  );

  const handleMoveOrSwap = useCallback(
    (
      fromZone: 'hotbar' | 'bag',
      fromIndex: number,
      toZone: 'hotbar' | 'bag',
      toIndex: number,
    ) => {
      setInventory((prev) => moveOrSwapSlots(prev, fromZone, fromIndex, toZone, toIndex));
    },
    [],
  );

  const handleDropItem = useCallback((zone: 'hotbar' | 'bag', index: number) => {
    setInventory((prev) => clearSlotItem(prev, zone, index));
  }, []);

  const handleSortBag = useCallback(() => {
    setInventory((prev) => sortBagItems(prev));
    showToast('Backpack sorted');
  }, [showToast]);

  const handleRestockStarter = useCallback(() => {
    setInventory(createStarterInventory());
    showToast('Starter supplies refilled');
  }, [showToast]);

  const handleToggleSprint = useCallback(() => {
    setSprintLocked((prev) => {
      const next = !prev;
      engineRef.current?.setSprintToggle(next);
      return next;
    });
  }, []);

  const handleToggleDance = useCallback(() => {
    engineRef.current?.toggleDance();
  }, []);

  const handleToggleDecorateMode = useCallback(() => {
    setDecorateMode((prev) => {
      const next = !prev;
      showToast(next ? 'Decorate Mode ON: move or edit house furniture' : 'Decorate Mode OFF');
      return next;
    });
  }, [showToast]);

  const handleToggleClubMusic = useCallback(() => {
    engineRef.current?.toggleClubMusic();
  }, []);

  const handleToggleClubMusicPower = useCallback(() => {
    engineRef.current?.toggleClubMusicPower();
  }, []);

  const handlePrevClubTrack = useCallback(() => {
    engineRef.current?.prevClubTrack();
  }, []);

  const handleNextClubTrack = useCallback(() => {
    engineRef.current?.nextClubTrack();
  }, []);

  const handleChangeClubVolume = useCallback((vol: number) => {
    engineRef.current?.setClubVolume(vol);
  }, []);

  const handlePlaceFurnitureFromInventory = useCallback((itemId: string) => {
    if (engineRef.current?.startFurniturePlacement(itemId)) {
      setBackpackOpen(false);
    }
  }, []);

  const handleNudgePlacement = useCallback((screenRight: number, screenForward: number) => {
    engineRef.current?.nudgePlacement(screenRight, screenForward);
  }, []);

  const handleRotatePlacement = useCallback((dir: -1 | 1) => {
    engineRef.current?.rotatePlacement(dir);
  }, []);

  const handleConfirmPlacement = useCallback(() => {
    engineRef.current?.confirmFurniturePlacement();
  }, []);

  const handleCancelPlacement = useCallback(() => {
    engineRef.current?.cancelFurniturePlacement();
  }, []);

  const handleInteractFurniture = useCallback(() => {
    engineRef.current?.interactNearbyFurniture();
  }, []);

  const handleStartEditFurniture = useCallback(() => {
    engineRef.current?.startEditPlacedFurniture();
  }, []);

  const handleRemoveFurniture = useCallback(() => {
    engineRef.current?.removePlacedFurniture();
  }, []);

  const handleStartReplaceFurniture = useCallback(() => {
    if (!hud.nearbyPlacedId) return;
    engineRef.current?.playUiSound();
    setReplacingRecord({
      id: hud.nearbyPlacedId,
      name: hud.nearbyPlacedName ?? 'Furniture',
    });
    setShopOpen(false);
    setMapOpen(false);
    setBackpackOpen(true);
  }, [hud.nearbyPlacedId, hud.nearbyPlacedName]);

  const handleSelectReplacementItem = useCallback(
    (newItemId: string) => {
      if (!replacingRecord) return;
      if (engineRef.current?.replacePlacedFurniture(replacingRecord.id, newItemId)) {
        setReplacingRecord(null);
        setBackpackOpen(false);
      }
    },
    [replacingRecord],
  );

  const handleCycleCameraMode = useCallback(() => {
    engineRef.current?.cycleCameraMode();
  }, []);

  const handleCameraOrbitInput = useCallback((dir: -1 | 0 | 1) => {
    engineRef.current?.setCameraOrbitInput(dir);
  }, []);

  const handleEnterCar = useCallback(() => {
    engineRef.current?.enterNearbyCar();
  }, []);

  const handleExitCar = useCallback(() => {
    engineRef.current?.exitCurrentCar();
  }, []);

  const handleOpenChest = useCallback(() => {
    engineRef.current?.openNearbyChest();
  }, []);

  const handleCarControlChange = useCallback((partial: Partial<CarInputState>) => {
    engineRef.current?.setCarControlState(partial);
  }, []);

  const handleToggleFlyMode = useCallback(() => {
    engineRef.current?.toggleFlyMode();
  }, []);

  const handleFlyVerticalInput = useCallback((dir: -1 | 0 | 1) => {
    engineRef.current?.setFlyVerticalInput(dir);
  }, []);

  const handleLand = useCallback(() => {
    engineRef.current?.triggerLand();
  }, []);

  const handleSetTimeOfDay = useCallback(
    (mode: 'day' | 'night') => {
      engineRef.current?.setTimeOfDay(mode);
      showToast(mode === 'day' ? 'Switched to Daytime (Sun)' : 'Switched to Nighttime (Moon)');
    },
    [showToast],
  );

  const handleResetPlayer = useCallback(() => {
    engineRef.current?.resetPlayer();
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleUnlockAudio = useCallback(() => {
    engineRef.current?.unlockAudio();
  }, []);

  const handleUiSound = useCallback(() => {
    engineRef.current?.playUiSound();
  }, []);

  const inputLocked =
    !started || paused || backpackOpen || shopOpen || mapOpen || Boolean(travelingTo) || Boolean(activeAdTarget);

  // Touch/mouse drag handlers for 360-degree camera orbit + quick tap to toggle doors
  const handleCameraDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inputLocked) return;
    e.preventDefault();
    handleUnlockAudio();
    cameraPointerId.current = e.pointerId;
    lastCamPointer.current = { x: e.clientX, y: e.clientY };
    tapStartMeta.current = { time: performance.now(), travel: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCameraDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inputLocked || cameraPointerId.current !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - lastCamPointer.current.x;
    const dy = e.clientY - lastCamPointer.current.y;
    lastCamPointer.current = { x: e.clientX, y: e.clientY };
    tapStartMeta.current.travel += Math.hypot(dx, dy);
    engineRef.current?.rotateCamera(dx, dy);
  };

  const handleCameraDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraPointerId.current !== e.pointerId) return;
    cameraPointerId.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (
      !inputLocked &&
      e.type === 'pointerup' &&
      tapStartMeta.current.travel < 12 &&
      performance.now() - tapStartMeta.current.time < 320
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        engineRef.current?.handleScreenTap(ndcX, ndcY);
      }
    }
  };

  return (
    <main
      className="relative w-screen h-[100dvh] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Isolated WebGL canvas mount outside React HUD re-renders */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Open-screen touch/mouse drag surface behind z-20 joystick & HUD buttons */}
      <div
        aria-label="Camera rotation drag area"
        onPointerDown={handleCameraDragDown}
        onPointerMove={handleCameraDragMove}
        onPointerUp={handleCameraDragEnd}
        onPointerCancel={handleCameraDragEnd}
        style={{ touchAction: 'none' }}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
      />

      {/* Bottom-left Virtual Joystick (hidden while driving) */}
      {!inputLocked && !hud.inVehicle && (
        <div
          className={`fixed z-20 ${
            viewportLayout.isCompactLandscape
              ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))]'
              : viewportLayout.isNarrowPortrait
                ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.6rem,env(safe-area-inset-left))]'
                : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))]'
          }`}
        >
          <VirtualJoystick
            disabled={inputLocked}
            sizePx={
              viewportLayout.isCompactLandscape
                ? 104
                : viewportLayout.isNarrowPortrait
                  ? 112
                  : 136
            }
            onChange={handleJoystickChange}
            onInteractStart={handleUnlockAudio}
          />
        </div>
      )}

      {/* HUD: Crosshair, Coins, Map, Pause, Camera Controls, Hotbar + Backpack Button, Break/Place/Jump/Sprint */}
      {started && (
        <GameHud
          paused={paused}
          backpackOpen={backpackOpen}
          shopOpen={shopOpen}
          mapOpen={mapOpen}
          coins={coins}
          hud={hud}
          sprintLocked={sprintLocked}
          decorateMode={decorateMode}
          hotbar={inventory.hotbar}
          selectedHotbarIndex={inventory.selectedHotbarIndex}
          feedbackToast={feedbackToast}
          settings={settings}
          onTogglePause={handleTogglePause}
          onOpenBackpack={handleOpenBackpack}
          onOpenShop={handleOpenShop}
          onOpenMap={handleOpenMap}
          onResetPlayer={handleResetPlayer}
          onJump={handleJump}
          onDive={handleDive}
          onSurface={handleSurface}
          onBreakPress={handleBreakPress}
          onBreakRelease={handleBreakRelease}
          onPlaceOrUse={handlePlaceOrUse}
          onSelectHotbarSlot={handleSelectHotbarSlot}
          onToggleSprint={handleToggleSprint}
          onToggleDance={handleToggleDance}
          onToggleDecorateMode={handleToggleDecorateMode}
          onToggleClubMusic={handleToggleClubMusic}
          onToggleClubMusicPower={handleToggleClubMusicPower}
          onPrevClubTrack={handlePrevClubTrack}
          onNextClubTrack={handleNextClubTrack}
          onChangeClubVolume={handleChangeClubVolume}
          onNudgePlacement={handleNudgePlacement}
          onRotatePlacement={handleRotatePlacement}
          onConfirmPlacement={handleConfirmPlacement}
          onCancelPlacement={handleCancelPlacement}
          onInteractFurniture={handleInteractFurniture}
          onStartEditFurniture={handleStartEditFurniture}
          onStartReplaceFurniture={handleStartReplaceFurniture}
          onRemoveFurniture={handleRemoveFurniture}
          onCycleCameraMode={handleCycleCameraMode}
          onCameraOrbitInput={handleCameraOrbitInput}
          onEnterCar={handleEnterCar}
          onExitCar={handleExitCar}
          onOpenChest={handleOpenChest}
          onCarControlChange={handleCarControlChange}
          onToggleFlyMode={handleToggleFlyMode}
          onFlyVerticalInput={handleFlyVerticalInput}
          onLand={handleLand}
          onSetTimeOfDay={handleSetTimeOfDay}
          onUpdateSettings={handleUpdateSettings}
          lastSavedAt={worldMeta.savedAt}
          customBlockCount={worldMeta.customBlockCount}
          hasSavedWorld={
            worldMeta.exists ||
            Boolean(savedPlayerState?.hasStartedOnce)
          }
          onSaveWorld={handleSaveWorld}
          onLoadWorld={handleLoadWorld}
        />
      )}

      {/* Full-Screen School Party Craft-Inspired Inventory Overlay */}
      <BackpackModal
        open={backpackOpen}
        coins={coins}
        inventory={inventory}
        equippedOutfit={equippedOutfit}
        onToggleEquipOutfit={handleToggleEquipOutfit}
        inHomeHouse={hud.inHomeHouse}
        inFurnitureShop={hud.inFurnitureShop}
        decorateMode={decorateMode}
        onToggleDecorateMode={handleToggleDecorateMode}
        replacingTargetName={replacingRecord?.name ?? null}
        onCancelReplace={() => setReplacingRecord(null)}
        onPlaceFurniture={handlePlaceFurnitureFromInventory}
        onSelectReplacement={handleSelectReplacementItem}
        onClose={handleCloseBackpack}
        onOpenShop={handleOpenShop}
        onSelectHotbarIndex={handleSelectHotbarSlot}
        onEquipFromBag={handleEquipFromBag}
        onStoreToBag={handleStoreToBag}
        onMoveOrSwap={handleMoveOrSwap}
        onUseItem={handleUseSlotItem}
        onDropItem={handleDropItem}
        onSortBag={handleSortBag}
        onRestockStarter={handleRestockStarter}
        onUiSound={handleUiSound}
      />

      {/* Full-Screen Shopping Market & Rewarded X-Suit Vault */}
      <ShopModal
        open={shopOpen}
        coins={coins}
        inventory={inventory}
        unlockedOutfits={unlockedOutfits}
        equippedOutfit={equippedOutfit}
        adProgress={adProgress}
        onClose={handleCloseShop}
        onOpenBackpack={handleOpenBackpack}
        onPurchase={handlePurchaseListing}
        onWatchRewardedAd={(target) => {
          void handleWatchRewardedAd(target);
        }}
        onEquipOutfitItem={handleToggleEquipOutfit}
        onUiSound={handleUiSound}
      />

      {/* Google Test Rewarded Ad Player */}
      <RewardedAdModal
        target={activeAdTarget}
        watchedBefore={activeAdTarget ? (adProgress[activeAdTarget.id] ?? 0) : 0}
        onComplete={(outcome) => {
          if (activeAdTarget) {
            finalizeRewardedAdOutcome(activeAdTarget, outcome);
          }
        }}
      />

      {/* Full-Screen School Party Craft-Inspired Interactive 3D City Map & Fast Travel */}
      <CityMapModal
        open={mapOpen}
        playerX={hud.playerX}
        playerZ={hud.playerZ}
        headingDeg={hud.headingDeg}
        discoveredIds={discoveredLocations}
        onClose={handleCloseMap}
        onTravelTo={handleTravelToLocation}
        onTravelHome={handleTravelHome}
        onUiSound={handleUiSound}
      />

      {/* Start Screen Overlay over Live 3D Villa Interior */}
      {!started && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Start gameplay"
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-40 bg-gradient-to-b from-sky-950/65 via-indigo-950/55 to-slate-950/85 backdrop-blur-[3px] flex items-center justify-center p-[max(0.75rem,env(safe-area-inset-top))] px-[max(0.75rem,env(safe-area-inset-left))] text-white"
        >
          <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-3xl bg-slate-950/88 border-2 border-white/25 p-5 sm:p-7 shadow-2xl text-center">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border-2 border-white flex items-center justify-center shadow-xl">
              <Home className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Abandoned City
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-sky-200/90 font-medium">
              Build custom houses &amp; blocks with automatic IndexedDB saving, drive Pakistani traffic, explore forests &amp; wildlife, and swim at South Coast Beach!
            </p>

            {(worldMeta.exists && (worldMeta.hasStartedOnce || worldMeta.customBlockCount > 0)) ? (
              <div className="mt-5 space-y-2.5">
                <div className="rounded-xl bg-slate-900/90 border border-emerald-400/30 px-3.5 py-2 text-xs text-emerald-200 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    Saved World Ready
                  </span>
                  <span className="text-slate-300 tabular-nums">
                    {worldMeta.customBlockCount} blocks · {worldMeta.coins} coins
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLoadWorld}
                  className="w-full min-h-[54px] px-5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 active:scale-97 border-2 border-white text-slate-950 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-transform"
                >
                  <FolderOpen className="w-5 h-5 stroke-[2.5]" />
                  <span>LOAD WORLD</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartGameplay}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-97 border border-white/25 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform"
                >
                  <Home className="w-4 h-4 text-amber-300" />
                  <span>Spawn at Dream Villa (Keeps All Builds)</span>
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={handleStartGameplay}
                  className="w-full min-h-[54px] px-5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 active:scale-97 border-2 border-white text-slate-950 text-base sm:text-lg font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-transform"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START GAMEPLAY</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smooth Fast-Travel Loading & Teleport Transition Overlay */}
      {travelingTo && (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-50 bg-gradient-to-b from-sky-900/95 via-indigo-950/95 to-slate-950/95 text-white flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border-4 border-amber-400 shadow-2xl flex items-center justify-center animate-bounce">
            {travelingTo.id === 'home_villa' ? (
              <Home className="w-11 h-11 text-amber-300 stroke-[2.4]" />
            ) : (
              <LocationIcon locationId={travelingTo.id} className="w-12 h-12" />
            )}
          </div>
          <div className="mt-4 text-xs font-extrabold uppercase tracking-widest text-sky-300">
            Fast Traveling
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-white">
            {travelingTo.name}
          </div>
          <p className="mt-1 text-xs text-slate-300 max-w-xs">
            {travelingTo.district} · Loading area...
          </p>
        </div>
      )}

      {/* WebGL Context Lost Recovery Notice */}
      {contextLost && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-2">
            <div className="text-base font-semibold">Graphics Context Paused</div>
            <p className="text-xs text-slate-300">
              Waiting for the device GPU to restore the 3D viewport.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
