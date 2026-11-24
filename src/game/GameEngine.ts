import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ProceduralAudio } from './audio';
import { CarInputState, CarSystem, CarWorldPose, createCarSystem } from './carSystem';
import { CityLightSystem, createCityLightSystem } from './cityLights';
import { createDanceClubStage, DanceClubStage } from './danceClub';
import { DanceMusicController } from './danceMusic';
import {
  createDayNightState,
  DAY_PRESET_CYCLE_SEC,
  DayNightState,
  evaluateDayNightCycle,
  loadSavedDayTime,
  NIGHT_PRESET_CYCLE_SEC,
  saveDayTime,
  wrapCycleTime,
} from './dayNightCycle';
import { createForestWildlifeSystem, ForestWildlifeSystem } from './forestWildlife';
import { createFurnitureMesh, FurnitureMeshHandle } from './furnitureModels';
import {
  boxesOverlapXZ,
  findHouseAt,
  getRotatedHalfExtents,
  loadPlacedFurniture,
  PlacedFurnitureRecord,
  savePlacedFurniture,
} from './homeFurniture';
import { getItemDef } from './inventory';
import { createNpcSystem, NpcSystem } from './npcSystem';
import {
  BEACH_SWIM_MAX_X,
  BEACH_SWIM_MAX_Z,
  BEACH_SWIM_MIN_X,
  BEACH_SWIM_START_Z,
  createOceanLifeSystem,
  getLagoonFloorY,
  OceanLifeSystem,
  SHALLOW_WATER_SURFACE_Y,
} from './oceanLife';
import { createPlayerRig, PlayerRig } from './player';
import {
  WORLD_COIN_SPOTS,
  WORLD_COIN_VALUE,
} from './shop';
import {
  BEACH_LOUNGER_PLACEMENTS,
  isStarterFurnitureSeeded,
  loadPlayerState,
  markStarterFurnitureSeeded,
  PlayerSaveState,
  savePlayerState,
  seedStarterVillaFurnitureIfNeeded,
  STARTER_HOME_SPAWN,
  STARTER_VILLA_ID,
} from './starterHome';
import {
  AnimatedDoorRig,
  applyVoxelEditsBinary,
  buildIslandEnvironment,
  canAutoStepOntoBlock,
  createCrackAtlasTexture,
  doorAnimKey,
  exportPlayerVoxelEditsBinary,
  getBlockParticleColor,
  getSafeGroundSupportY,
  getSupportHeightAt,
  getVoxel,
  isDoorOpen,
  isDoorVoxel,
  isFixedVoxel,
  IslandEnvironmentResult,
  isInVoxelBounds,
  isSolidAtWorld,
  LEGACY_GRID_MIN,
  LEGACY_GRID_SIZE,
  MAX_HEIGHT,
  recordPlayerVoxelEdit,
  setDoorOpenState,
  setVoxel,
  VOXEL_GRID_META,
} from './terrain';
import {
  createTreasureChestSystem,
  loadChestCycleState,
  PersistentChestCycleState,
  TreasureChestSpot,
  TreasureChestSystem,
} from './treasureChests';
import {
  CameraMode,
  GameSettings,
  HudSnapshot,
  JoystickVector,
  MovementGait,
  PlaceableBlock,
  PlayerPoseMode,
  VOXEL_ID,
  VoxelId,
} from './types';
import { EquippedOutfitLoadout } from './xSuits';

// Pre-allocated scratch math objects for zero GC pressure in the 60fps loop
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _camWorldPos = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _rayPivot = new THREE.Vector3();
const _rayNdc = new THREE.Vector2(0, 0);
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _particleColor = new THREE.Color();
const _projVec = new THREE.Vector3();

const MAX_PARTICLES = 64;
const BLOCK_REACH_DISTANCE = 8.2;
const SHORT_BREAK_DURATION = 0.24;

// Outer playable city & wilderness boundary covering full expanded island & South Beach lagoon
const CITY_BOUND_MIN_X = -190;
const CITY_BOUND_MAX_X = 190;
const CITY_BOUND_MIN_Z = -190;
const CITY_BOUND_MAX_Z = 202.0;
const CITY_SHORE_DEFAULT_MAX_Z = 188.5;
const PLAYABLE_MIN_Y = 2.0;

interface BlockTarget {
  gx: number;
  by: number;
  gz: number;
  nx: number;
  ny: number;
  nz: number;
  blockId: VoxelId;
}

interface BreakState {
  gx: number;
  by: number;
  gz: number;
  blockId: VoxelId;
  progress: number;
  duration: number;
  tickAccum: number;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
  colorHex: number;
}

interface ActiveDoorAnim {
  key: string;
  gx: number;
  yBot: number;
  gz: number;
  rig: AnimatedDoorRig;
  progress: number;
  duration: number;
  currentVal: number;
}

interface NearbyFurnitureTarget {
  id: string;
  itemId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  seatY: number;
  interaction: 'sit' | 'sleep' | 'tv_toggle' | 'pc_use' | 'lamp_toggle' | 'open_storage' | 'appliance_use';
  actionLabel: string;
  isMovable: boolean;
  isVoxel: boolean;
  stateOn?: boolean;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private sunLight: THREE.DirectionalLight;
  private islandEnv: IslandEnvironmentResult;
  private cityLights: CityLightSystem;
  private playerRig: PlayerRig;
  private npcSystem: NpcSystem;
  private carSystem: CarSystem;
  private oceanLife: OceanLifeSystem;
  private forestWildlife: ForestWildlifeSystem;
  private danceClubStage: DanceClubStage;
  private danceMusic: DanceMusicController;
  private audio: ProceduralAudio;
  private isSoftwareGl: boolean;
  private isTouchDevice: boolean;
  private resizeObserver: ResizeObserver | null = null;

  // Voxel interaction visuals (reused, zero per-frame allocations)
  private raycaster = new THREE.Raycaster();
  private targetOutline: THREE.LineSegments;
  private crackTex: THREE.CanvasTexture;
  private crackMesh: THREE.Mesh;
  private particlesMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private worldCoinsMesh: THREE.InstancedMesh;
  private collectedCoinSet = new Set<number>();
  private lastFixedFeedbackTime = -10;
  private lastSwimBoundaryToast = -10;
  private lastSaveStateTime = 0;
  private hasStartedGameplay = false;
  private inShallowWater = false;
  private isUnderwater = false;
  private dayCycleTimeSec = loadSavedDayTime();
  private dayNightState: DayNightState = createDayNightState();
  private readonly surfaceSkyColor = new THREE.Color('#b6daf5');
  private surfaceFogDensity = 0.0068;
  private readonly underwaterTintColor = new THREE.Color('#1f86a3');

  private currentTarget: BlockTarget | null = null;
  private activeBreak: BreakState | null = null;
  private breakButtonHeld = false;
  private breakCooldown = 0;
  private selectedBlock: PlaceableBlock = 'grass';
  private equippedVoxelId: VoxelId | null = VOXEL_ID.GRASS;
  private fastBreakActive = false;
  private speedBuffTimer = 0;
  private activeDoorAnims: ActiveDoorAnim[] = [];
  private autoOpenedDoors = new Map<string, { gx: number; yBot: number; gz: number }>();
  private manualClosedCooldown = new Map<string, number>();

  // Home Furniture Placement, Edit & Interaction System (plus built-in chairs/sofas/beds & beach loungers)
  private furnitureGroup = new THREE.Group();
  private placedRecords: PlacedFurnitureRecord[] = [];
  private placedMeshes = new Map<string, FurnitureMeshHandle>();
  private publicMeshes = new Map<string, FurnitureMeshHandle>();
  private nearbyTarget: NearbyFurnitureTarget | null = null;
  private interactingFurniture: {
    recordId: string;
    name: string;
    mode: 'sit' | 'sleep';
    isMovable: boolean;
    targetPos: THREE.Vector3;
    targetFacing: number;
    prevPos: THREE.Vector3;
  } | null = null;
  private placementSession: {
    mode: 'new' | 'edit';
    itemId: string;
    editRecordId?: string;
    houseId: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    valid: boolean;
    reason: string | null;
    originalRecord?: PlacedFurnitureRecord;
    ghost: FurnitureMeshHandle;
  } | null = null;

  // Drivable Open-World Cars & Treasure Chests state
  private activeCarId: string | null = null;
  private nearbyCar: CarWorldPose | null = null;
  private carControls: CarInputState = { throttle: 0, brake: 0, steer: 0 };
  private carCamManualUntil = -10;
  private chestSystem: TreasureChestSystem;
  private nearbyChest: TreasureChestSpot | null = null;

  private frameId = 0;
  private destroyed = false;
  private paused = false;
  private lastTimeMs = 0;
  private simElapsed = 0;
  private lastHudPush = 0;

  // Player physics state
  private playerPos = new THREE.Vector3(0, 2, 4);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerFacing = Math.PI; // Facing -Z (into the island clearing)
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;

  // Attached follow-camera rig (child of playerRig.root: zero drift, zero lag)
  private cameraPivot: THREE.Group;
  private pitchPivot: THREE.Group;
  private cameraMode: CameraMode = 'back';
  private cameraOrbitInput: -1 | 0 | 1 = 0;
  private camYaw = 0;
  private camPitch = 0.34;
  private camDistance = 5.6;
  private camActualDist = 5.6;
  private camPivotY = 1.74;
  private camShoulderOffset = 0;

  // Input state
  private joystick: JoystickVector = { x: 0, y: 0 };
  private keys = new Set<string>();
  private sprintToggle = false;
  private isDancing = false;
  private isFlying = false;
  private isAutoLanding = false;
  private flyVerticalInput: -1 | 0 | 1 = 0;
  private settings: GameSettings = {
    cameraSensitivity: 1.0,
    soundEnabled: true,
    invertCameraY: false,
  };

  private onHudUpdate?: (snapshot: HudSnapshot) => void;
  private onContextLostCallback?: (lost: boolean) => void;
  private onCollectVoxel?: (voxelId: VoxelId) => void;
  private onConsumeEquipped?: () => void;
  private onCollectWorldCoin?: (coinId: number, amount: number) => void;
  private onFixedBlockHit?: () => void;
  private onConsumeFurnitureItem?: (itemId: string) => void;
  private onReturnFurnitureItem?: (itemId: string) => void;
  private onSwapFurnitureItem?: (oldItemId: string, newItemId: string) => void;
  private onFurnitureToast?: (message: string) => void;
  private onWorldDirty?: (reason: string) => void;
  private onCollectChestReward?: (
    chestId: number,
    amount: number,
    chestState: PersistentChestCycleState,
  ) => void;
  private onChestsRefreshed?: (chestState: PersistentChestCycleState) => void;

  private readonly WALK_SPEED = 3.5;
  private readonly RUN_SPEED = 7.4;
  private readonly JUMP_VELOCITY = 8.8;
  private readonly GRAVITY = -23.0;
  private readonly FLY_HORIZ_SPEED = 9.5;
  private readonly FLY_SPRINT_SPEED = 14.0;
  private readonly FLY_VERT_SPEED = 7.5;
  private readonly MAX_FLY_Y = 58.0;

  constructor(
    container: HTMLElement,
    options?: {
      onHudUpdate?: (snapshot: HudSnapshot) => void;
      onContextLost?: (lost: boolean) => void;
      onCollectVoxel?: (voxelId: VoxelId) => void;
      onConsumeEquipped?: () => void;
      onCollectWorldCoin?: (coinId: number, amount: number) => void;
      onFixedBlockHit?: () => void;
      onConsumeFurnitureItem?: (itemId: string) => void;
      onReturnFurnitureItem?: (itemId: string) => void;
      onSwapFurnitureItem?: (oldItemId: string, newItemId: string) => void;
      onFurnitureToast?: (message: string) => void;
      onWorldDirty?: (reason: string) => void;
      onCollectChestReward?: (
        chestId: number,
        amount: number,
        chestState: PersistentChestCycleState,
      ) => void;
      onChestsRefreshed?: (chestState: PersistentChestCycleState) => void;
    },
  ) {
    this.container = container;
    this.onHudUpdate = options?.onHudUpdate;
    this.onContextLostCallback = options?.onContextLost;
    this.onCollectVoxel = options?.onCollectVoxel;
    this.onConsumeEquipped = options?.onConsumeEquipped;
    this.onCollectWorldCoin = options?.onCollectWorldCoin;
    this.onFixedBlockHit = options?.onFixedBlockHit;
    this.onConsumeFurnitureItem = options?.onConsumeFurnitureItem;
    this.onReturnFurnitureItem = options?.onReturnFurnitureItem;
    this.onSwapFurnitureItem = options?.onSwapFurnitureItem;
    this.onFurnitureToast = options?.onFurnitureToast;
    this.onWorldDirty = options?.onWorldDirty;
    this.onCollectChestReward = options?.onCollectChestReward;
    this.onChestsRefreshed = options?.onChestsRefreshed;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.isTouchDevice =
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      window.matchMedia?.('(pointer: coarse)').matches === true;
    this.audio = new ProceduralAudio();

    // 1. Renderer setup (clamped pixel ratio for crisp visuals & 4GB RAM Android thermals)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    const maxDpr = this.isTouchDevice ? 1.6 : 2.0;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 2. Scene, Horizon Fog & Studio Environment Reflection
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9db1c0');
    this.scene.fog = new THREE.FogExp2('#9db1c0', 0.004);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3. Camera (wide far plane for expanded island vista + responsive portrait compensation)
    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    const initialPortraitBoost =
      aspect < 1 ? THREE.MathUtils.clamp((1 - aspect) * 18, 0, 12) : 0;
    this.camera = new THREE.PerspectiveCamera(57 + initialPortraitBoost, aspect, 0.15, 560);

    // 4. Dynamic Day/Night Key Light + Hemisphere Sky Fill + Subtle Rim Light
    this.hemiLight = new THREE.HemisphereLight('#d8eeff', '#8e9c9a', 1.15);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff5e0', 1.85);
    this.sunLight.position.set(22, 30, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 96;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight('#cfe7ff', 0.65);
    this.rimLight.position.set(-18, 14, -20);
    this.scene.add(this.rimLight);

    // 5. Voxel World, City Streetlights & Player Character
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.islandEnv = buildIslandEnvironment(maxAniso);
    this.scene.add(this.islandEnv.group);

    this.cityLights = createCityLightSystem();
    this.scene.add(this.cityLights.group);

    this.playerRig = createPlayerRig(this.islandEnv.atlasTex);
    this.playerRig.setHeldBlock(this.selectedBlock);
    this.scene.add(this.playerRig.root);

    this.danceClubStage = createDanceClubStage();
    this.scene.add(this.danceClubStage.group);

    this.npcSystem = createNpcSystem(this.islandEnv.atlasTex);
    this.scene.add(this.npcSystem.group);

    this.carSystem = createCarSystem();
    this.scene.add(this.carSystem.group);

    this.oceanLife = createOceanLifeSystem();
    this.scene.add(this.oceanLife.group);

    this.forestWildlife = createForestWildlifeSystem(this.audio);
    this.scene.add(this.forestWildlife.group);

    this.danceMusic = new DanceMusicController(() => {
      this.pushHudSnapshot(
        Math.hypot(this.playerVel.x, this.playerVel.z),
        this.currentTarget !== null,
      );
    });

    // Attach follow-camera rig directly onto the player root so camera & player never separate
    this.cameraPivot = new THREE.Group();
    this.pitchPivot = new THREE.Group();
    this.pitchPivot.position.set(0, 1.76, 0);
    this.cameraPivot.add(this.pitchPivot);
    this.pitchPivot.add(this.camera);
    this.playerRig.root.add(this.cameraPivot);

    // 6. Crisp Target Outline, Crack Overlay & Particle Pool
    const outlineBoxGeo = new THREE.BoxGeometry(1.014, 1.014, 1.014);
    const outlineEdges = new THREE.EdgesGeometry(outlineBoxGeo);
    outlineBoxGeo.dispose();
    const outlineMat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
    });
    this.targetOutline = new THREE.LineSegments(outlineEdges, outlineMat);
    this.targetOutline.visible = false;
    this.scene.add(this.targetOutline);

    this.crackTex = createCrackAtlasTexture();
    const crackGeo = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const crackMat = new THREE.MeshBasicMaterial({
      map: this.crackTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.crackMesh = new THREE.Mesh(crackGeo, crackMat);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);

    const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const particleMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
      metalness: 0.02,
    });
    this.particlesMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    this.particlesMesh.frustumCulled = false;
    this.particlesMesh.visible = false;
    _particleColor.setHex(0xffffff);
    this.particlesMesh.setColorAt(0, _particleColor);
    if (this.particlesMesh.instanceColor) {
      this.particlesMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particlesMesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        life: 0,
        maxLife: 0.5,
        colorHex: 0xffffff,
      });
    }

    // 7. Single-draw-call instanced collectible world gold coins
    const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
    coinGeo.rotateZ(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: '#b45309',
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.72,
    });
    this.worldCoinsMesh = new THREE.InstancedMesh(
      coinGeo,
      coinMat,
      Math.max(1, WORLD_COIN_SPOTS.length),
    );
    this.worldCoinsMesh.frustumCulled = false;
    this.worldCoinsMesh.count = 0;
    this.scene.add(this.worldCoinsMesh);

    this.chestSystem = createTreasureChestSystem(
      loadChestCycleState(),
      (nextState) => {
        this.nearbyChest = null;
        this.onChestsRefreshed?.(nextState);
      },
    );
    this.scene.add(this.chestSystem.group);

    this.scene.add(this.furnitureGroup);
    this.initSavedPlacedFurniture();

    // Preview inside permanent Player's Dream Villa until START GAMEPLAY is pressed
    this.spawnAtStarterHome(false);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(container);
    }
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.lastTimeMs = performance.now();
    this.startLoop();
  }

  public setTimeOfDay(mode: 'day' | 'night'): void {
    this.dayCycleTimeSec =
      mode === 'day' ? DAY_PRESET_CYCLE_SEC : NIGHT_PRESET_CYCLE_SEC;
    saveDayTime(this.dayCycleTimeSec);
    this.applyDayNightLighting();
    this.audio.unlock();
    this.audio.playUiPop();
    this.onWorldDirty?.('day_night_toggle');
    this.pushHudSnapshot(
      Math.hypot(this.playerVel.x, this.playerVel.z),
      this.currentTarget !== null,
    );
  }

  public setJoystick(vec: JoystickVector): void {
    this.joystick.x = THREE.MathUtils.clamp(vec.x, -1, 1);
    this.joystick.y = THREE.MathUtils.clamp(vec.y, -1, 1);
  }

  public triggerJump(): void {
    this.audio.unlock();
    this.danceMusic.unlockAndSync();
    this.isDancing = false;
    this.jumpBufferTimer = 0.14;
  }

  public triggerDive(): void {
    if (this.paused || !this.inShallowWater || this.isUnderwater) return;
    this.audio.unlock();
    this.isDancing = false;
    this.isUnderwater = true;
    this.playerVel.y = -3.8;
    // Gently clear ultra-shallow 0.5m shoreline lip so diving submerges smoothly
    if (this.playerPos.z < 159.8) {
      this.playerPos.z = Math.min(BEACH_SWIM_MAX_Z - 1.5, 159.8);
    }
    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public triggerSurface(): void {
    if (this.paused || !this.inShallowWater || !this.isUnderwater) return;
    this.audio.unlock();
    this.isUnderwater = false;
    this.playerVel.y = 3.8;
    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public setFlyMode(enabled: boolean): void {
    if (enabled && (this.paused || this.activeCarId)) return;
    if (enabled === this.isFlying) return;

    if (enabled) {
      this.stopFurnitureInteraction();
      this.isDancing = false;
      this.inShallowWater = false;
      this.isUnderwater = false;
      this.isAutoLanding = false;
      this.flyVerticalInput = 0;

      const supportY = this.getFootprintSupportY(
        this.playerPos.x,
        this.playerPos.z,
        this.playerPos.y + 0.35,
      );
      if (
        this.playerPos.y <= supportY + 0.25 &&
        !isSolidAtWorld(this.playerPos.x, this.playerPos.y + 2.1, this.playerPos.z)
      ) {
        this.playerPos.y = Math.max(this.playerPos.y, supportY + 0.55);
      }
      this.grounded = false;
      this.playerVel.y = 0;
    } else {
      this.isAutoLanding = false;
      this.flyVerticalInput = 0;
    }

    this.isFlying = enabled;
    this.audio.unlock();
    this.audio.playFlyToggle(enabled);
    this.onFurnitureToast?.(
      enabled ? 'Fly Mode ON — use UP, DOWN, Move, or LAND' : 'Fly Mode OFF',
    );
    this.pushHudSnapshot(
      Math.hypot(this.playerVel.x, this.playerVel.z),
      this.currentTarget !== null,
    );
  }

  public toggleFlyMode(): void {
    if (this.paused || this.activeCarId) return;
    this.setFlyMode(!this.isFlying);
  }

  public setFlyVerticalInput(dir: -1 | 0 | 1): void {
    if (!this.isFlying) return;
    if (dir !== 0) {
      this.isAutoLanding = false;
    }
    this.flyVerticalInput = dir;
  }

  public triggerLand(): void {
    if (this.paused || !this.isFlying) return;
    this.audio.unlock();
    this.isAutoLanding = true;
    this.flyVerticalInput = 0;
    this.audio.playUiPop();
    this.onFurnitureToast?.('Landing...');
  }

  public rotateCamera(deltaX: number, deltaY: number): void {
    // Guard against abnormal OS/WebView pointer jump glitches while keeping fast swipes crisp
    const dx = THREE.MathUtils.clamp(deltaX, -220, 220);
    const dy = THREE.MathUtils.clamp(deltaY, -220, 220);

    // Responsive Minecraft-mobile horizontal & vertical touch sensitivity
    const yawSens = 0.0095 * this.settings.cameraSensitivity;
    const pitchSens = 0.0085 * this.settings.cameraSensitivity;
    const ySign = this.settings.invertCameraY ? -1 : 1;

    this.camYaw -= dx * yawSens;
    // Full vertical look range: -79° up toward the sky to +79° down toward the ground
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + dy * pitchSens * ySign,
      -1.38,
      1.38,
    );
    if (this.activeCarId) {
      this.carCamManualUntil = this.simElapsed + 2.0;
    }
  }

  public setCameraMode(mode: CameraMode): void {
    if (this.cameraMode === mode) return;
    this.cameraMode = mode;

    if (mode === 'front') {
      // Face camera directly at character's front face (+Z in character local space)
      this.camYaw = this.playerFacing;
      this.camPitch = 0.14;
    } else if (mode === 'back') {
      // Return smoothly behind character facing their direction
      this.camYaw = this.playerFacing - Math.PI;
      this.camPitch = 0.34;
    } else {
      // Orbit 360 around character's head and body
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.85, 0.85);
    }

    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public cycleCameraMode(): void {
    const next: CameraMode =
      this.cameraMode === 'back' ? 'front' : this.cameraMode === 'front' ? 'orbit' : 'back';
    this.setCameraMode(next);
  }

  public setCameraOrbitInput(dir: -1 | 0 | 1): void {
    this.cameraOrbitInput = dir;
    if (dir !== 0 && this.cameraMode === 'back') {
      this.cameraMode = 'orbit';
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.85, 0.85);
      this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    }
  }

  public setSprintToggle(enabled: boolean): void {
    this.sprintToggle = enabled;
  }

  public setDancing(enabled: boolean): void {
    this.isDancing = enabled;
    this.pushHudSnapshot(
      Math.hypot(this.playerVel.x, this.playerVel.z),
      this.currentTarget !== null,
    );
  }

  public toggleDance(): void {
    this.audio.unlock();
    this.danceMusic.unlockAndSync();
    if (this.interactingFurniture) {
      this.stopFurnitureInteraction();
    }
    this.setDancing(!this.isDancing);
  }

  public toggleClubMusic(): void {
    this.audio.unlock();
    this.danceMusic.togglePlayPause();
  }

  public nextClubTrack(): void {
    this.audio.unlock();
    this.danceMusic.nextTrack(true);
  }

  public prevClubTrack(): void {
    this.audio.unlock();
    this.danceMusic.prevTrack(true);
  }

  public toggleClubMusicPower(): void {
    this.audio.unlock();
    this.danceMusic.setMusicPower(!this.danceMusic.isMusicPowerOn());
  }

  public setClubVolume(vol: number): void {
    this.audio.unlock();
    this.danceMusic.setVolume(vol);
  }

  public setSelectedBlock(block: PlaceableBlock): void {
    this.selectedBlock = block;
    this.equippedVoxelId =
      block === 'stone'
        ? VOXEL_ID.STONE
        : block === 'dirt'
          ? VOXEL_ID.DIRT
          : VOXEL_ID.GRASS;
    this.fastBreakActive = false;
    this.playerRig.setHeldBlock(block);
  }

  public setEquippedLoadout(config: {
    voxelId: VoxelId | null;
    previewBlock: PlaceableBlock;
    fastBreak: boolean;
  }): void {
    this.selectedBlock = config.previewBlock;
    this.equippedVoxelId = config.voxelId;
    this.fastBreakActive = config.fastBreak;
    this.playerRig.setHeldBlock(config.previewBlock);
  }

  public setEquippedOutfit(loadout: EquippedOutfitLoadout): void {
    this.playerRig.setOutfitLoadout(loadout);
  }

  public triggerConsumableEffect(effect: 'speed' | 'snack' | 'energy'): void {
    this.audio.unlock();
    this.audio.playConsumableUse();
    if (!this.paused) {
      this.playerRig.triggerArmSwing();
    }
    if (effect === 'speed') {
      this.speedBuffTimer = 12;
    } else if (effect === 'energy') {
      this.speedBuffTimer = 8;
    }
  }

  public playUiSound(): void {
    this.audio.unlock();
    this.audio.playUiPop();
  }

  public playPurchaseSound(): void {
    this.audio.unlock();
    this.audio.playShopPurchase();
  }

  public playTeleportSound(): void {
    this.audio.unlock();
    this.audio.playTeleport();
  }

  public playDiscoverySound(): void {
    this.audio.unlock();
    this.audio.playLocationDiscovered();
  }

  public setCollectedWorldCoins(ids: number[]): void {
    this.collectedCoinSet = new Set(ids);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    this.danceMusic.setGlobalSoundEnabled(paused ? false : this.settings.soundEnabled);
    if (!paused) {
      this.lastTimeMs = performance.now();
    } else {
      this.keys.clear();
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.carControls.throttle = 0;
      this.carControls.brake = 0;
      this.carControls.steer = 0;
      this.cameraOrbitInput = 0;
      this.flyVerticalInput = 0;
      this.breakButtonHeld = false;
      this.activeBreak = null;
      this.crackMesh.visible = false;
    }
  }

  public setCarControlState(partial: Partial<CarInputState>): void {
    if (typeof partial.throttle === 'number') {
      this.carControls.throttle = THREE.MathUtils.clamp(partial.throttle, 0, 1);
    }
    if (typeof partial.brake === 'number') {
      this.carControls.brake = THREE.MathUtils.clamp(partial.brake, 0, 1);
    }
    if (typeof partial.steer === 'number') {
      this.carControls.steer = THREE.MathUtils.clamp(partial.steer, -1, 1);
    }
  }

  public enterNearbyCar(): boolean {
    if (this.paused || this.activeCarId || !this.nearbyCar) return false;
    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }
    if (!this.carSystem.claimCar(this.nearbyCar.id)) return false;

    const carInfo = this.nearbyCar;
    this.activeCarId = carInfo.id;
    this.nearbyCar = null;
    this.nearbyTarget = null;
    this.isDancing = false;
    this.isFlying = false;
    this.isAutoLanding = false;
    this.flyVerticalInput = 0;
    this.inShallowWater = false;
    this.isUnderwater = false;
    this.carControls = { throttle: 0, brake: 0, steer: 0 };
    this.playerRig.setShowHeldBlock(false);
    this.playerRig.contactShadow.visible = false;
    this.targetOutline.visible = false;
    this.crackMesh.visible = false;
    this.activeBreak = null;

    this.audio.unlock();
    this.audio.playCarDoor(true);

    const seat = this.carSystem.getDriverSeatPose(carInfo.id);
    if (seat) {
      this.playerPos.set(seat.x, seat.y, seat.z);
      this.playerFacing = seat.yaw;
      this.cameraMode = 'back';
      this.camYaw = seat.yaw - Math.PI;
      this.camPitch = 0.24;
    }
    this.playerVel.set(0, 0, 0);
    this.grounded = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.visualRoot.rotation.y = this.playerFacing;
    this.carCamManualUntil = -10;
    this.applyCameraRig(0.016, true);
    this.onFurnitureToast?.(`Driving ${carInfo.name}`);
    this.pushHudSnapshot(0, false);
    return true;
  }

  public exitCurrentCar(silent = false): boolean {
    if (!this.activeCarId) return false;
    const carId = this.activeCarId;
    const carPose = this.carSystem.getCarPose(carId);
    const exitPos = this.carSystem.getSafeExitPosition(carId);
    this.carSystem.releaseCar(carId);
    this.activeCarId = null;
    this.carControls = { throttle: 0, brake: 0, steer: 0 };
    this.playerRig.setShowHeldBlock(true);
    this.playerRig.contactShadow.visible = true;

    if (exitPos) {
      this.playerPos.set(exitPos.x, exitPos.y, exitPos.z);
    }
    this.playerVel.set(0, 0, 0);
    this.grounded = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.applyCameraRig(0.016, false);

    if (!silent) {
      this.audio.unlock();
      this.audio.playCarDoor(false);
      this.onFurnitureToast?.(carPose ? `Exited ${carPose.name}` : 'Exited car');
    }
    this.pushHudSnapshot(0, false);
    return true;
  }

  public setOpenedChests(ids: number[]): void {
    this.chestSystem.setOpenedChests(ids);
  }

  public getChestCycleState(): PersistentChestCycleState {
    return this.chestSystem.getChestState();
  }

  public setChestCycleState(state: PersistentChestCycleState): void {
    this.chestSystem.setChestState(state);
    this.nearbyChest = null;
  }

  public checkChestRefresh(): boolean {
    return this.chestSystem.checkAndRefreshIfDue(Date.now());
  }

  public openNearbyChest(): boolean {
    if (this.paused || this.activeCarId) return false;
    const target =
      this.nearbyChest ??
      this.chestSystem.findNearestOpenableChest(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        2.9,
      );
    if (!target) return false;
    const reward = this.chestSystem.openChest(target.id);
    if (reward === null) return false;
    this.audio.unlock();
    this.audio.playCoinCollect();
    this.nearbyChest = null;
    this.onCollectChestReward?.(target.id, reward, this.chestSystem.getChestState());
    this.onWorldDirty?.('chest_open');
    this.pushHudSnapshot(
      Math.hypot(this.playerVel.x, this.playerVel.z),
      this.currentTarget !== null,
    );
    return true;
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    this.audio.setEnabled(next.soundEnabled);
    this.danceMusic.setGlobalSoundEnabled(this.paused ? false : next.soundEnabled);
  }

  public unlockAudio(): void {
    this.audio.unlock();
    this.danceMusic.unlockAndSync();
  }

  public resetPlayer(): void {
    this.spawnAtStarterHome(true);
  }

  public spawnAtStarterHome(markStarted = true): void {
    this.exitCurrentCar(true);
    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }
    const { x, z, camYaw } = STARTER_HOME_SPAWN;
    this.islandEnv.preloadChunksAround(x, z);
    const startY = Math.max(PLAYABLE_MIN_Y, getSafeGroundSupportY(x, z));

    this.playerPos.set(x, startY, z);
    this.playerVel.set(0, 0, 0);
    this.grounded = true;
    this.inShallowWater = false;
    this.isUnderwater = false;
    this.isDancing = false;
    this.isFlying = false;
    this.isAutoLanding = false;
    this.flyVerticalInput = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    this.cameraMode = 'back';
    this.cameraOrbitInput = 0;
    this.camYaw = camYaw;
    this.camPitch = 0.28;
    this.camDistance = 5.4;
    this.camActualDist = 5.4;
    this.camPivotY = 1.74;
    this.camShoulderOffset = 0;
    this.playerFacing = this.camYaw + Math.PI;

    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.visualRoot.rotation.y = this.playerFacing;
    this.applyDayNightLighting();
    this.npcSystem.update(0.016, this.playerPos.x, this.playerPos.z);
    this.oceanLife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z);
    this.forestWildlife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z, false);
    this.danceMusic.updateClubProximity(this.playerPos.x, this.playerPos.z);
    this.applyCameraRig(0.016, true);
    if (markStarted) {
      this.hasStartedGameplay = true;
      this.persistPlayerState();
    }
    this.pushHudSnapshot(0, false);
  }

  public exportWorldRuntimeState(): {
    player: PlayerSaveState & { isFlying: boolean };
    placedFurniture: PlacedFurnitureRecord[];
    starterFurnitureSeeded: boolean;
    voxelIndices: Uint32Array;
    voxelIds: Uint16Array;
    gridMin: number;
    gridSize: number;
    openedChests: number[];
    chestState: PersistentChestCycleState;
    dayTimeSec: number;
  } {
    const { indices, ids } = exportPlayerVoxelEditsBinary();
    const chestState = this.chestSystem.getChestState();
    return {
      player: {
        x: Number(this.playerPos.x.toFixed(2)),
        y: Number(this.playerPos.y.toFixed(2)),
        z: Number(this.playerPos.z.toFixed(2)),
        camYaw: Number(this.camYaw.toFixed(4)),
        homeId: STARTER_VILLA_ID,
        hasStartedOnce: this.hasStartedGameplay,
        isFlying: this.isFlying,
      },
      placedFurniture: this.placedRecords.map((r) => ({ ...r })),
      starterFurnitureSeeded: isStarterFurnitureSeeded(),
      voxelIndices: indices,
      voxelIds: ids,
      gridMin: VOXEL_GRID_META.gridMin,
      gridSize: VOXEL_GRID_META.gridSize,
      openedChests: this.chestSystem.getOpenedChestIds(),
      chestState,
      dayTimeSec: Number(this.dayCycleTimeSec.toFixed(2)),
    };
  }

  public applyLoadedWorldState(payload: {
    voxelIndices: ArrayLike<number>;
    voxelIds: ArrayLike<number>;
    gridMin?: number;
    gridSize?: number;
    placedFurniture: PlacedFurnitureRecord[];
    starterFurnitureSeeded: boolean;
    player: PlayerSaveState & { isFlying?: boolean };
    collectedWorldCoins: number[];
    openedChests?: number[];
    chestState?: PersistentChestCycleState;
    dayTimeSec?: number;
    restorePlayerPosition: boolean;
  }): void {
    if (typeof payload.dayTimeSec === 'number' && Number.isFinite(payload.dayTimeSec)) {
      this.dayCycleTimeSec = wrapCycleTime(payload.dayTimeSec);
      this.applyDayNightLighting();
    }
    if (payload.restorePlayerPosition) {
      this.exitCurrentCar(true);
      this.stopFurnitureInteraction();
      if (this.placementSession) {
        this.cancelFurniturePlacement();
      }
    }

    this.activeBreak = null;
    this.breakButtonHeld = false;
    this.crackMesh.visible = false;
    for (let i = 0; i < this.activeDoorAnims.length; i++) {
      this.activeDoorAnims[i].rig.dispose();
    }
    this.activeDoorAnims.length = 0;
    this.autoOpenedDoors.clear();

    applyVoxelEditsBinary(
      payload.voxelIndices,
      payload.voxelIds,
      true,
      payload.gridSize ?? LEGACY_GRID_SIZE,
      payload.gridMin ?? LEGACY_GRID_MIN,
    );

    for (const handle of this.placedMeshes.values()) {
      this.furnitureGroup.remove(handle.group);
      handle.dispose();
    }
    this.placedMeshes.clear();
    this.placedRecords = [];

    if (payload.starterFurnitureSeeded) {
      markStarterFurnitureSeeded(true);
    }
    savePlacedFurniture(payload.placedFurniture);
    const recordsToMount = payload.starterFurnitureSeeded
      ? payload.placedFurniture
      : seedStarterVillaFurnitureIfNeeded();
    for (let i = 0; i < recordsToMount.length; i++) {
      const rec = recordsToMount[i];
      if (!getItemDef(rec.itemId)) continue;
      const copy = { ...rec };
      this.placedRecords.push(copy);
      this.mountFurnitureRecordMesh(copy);
    }

    this.collectedCoinSet = new Set(payload.collectedWorldCoins);
    if (payload.chestState) {
      this.chestSystem.setChestState(payload.chestState);
    } else if (Array.isArray(payload.openedChests)) {
      this.chestSystem.setOpenedChests(payload.openedChests);
    }
    this.chestSystem.checkAndRefreshIfDue(Date.now());

    if (payload.restorePlayerPosition) {
      this.hasStartedGameplay = true;
      this.restoreSavedPlayerExact(payload.player);
    } else {
      this.islandEnv.rebuildLoadedChunksAround(this.playerPos.x, this.playerPos.z);
      this.pushHudSnapshot(
        Math.hypot(this.playerVel.x, this.playerVel.z),
        this.currentTarget !== null,
      );
    }
  }

  private restoreSavedPlayerExact(state: PlayerSaveState & { isFlying?: boolean }): void {
    this.exitCurrentCar(true);
    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }

    const targetX = THREE.MathUtils.clamp(state.x, CITY_BOUND_MIN_X, CITY_BOUND_MAX_X);
    const maxZForX =
      Math.abs(targetX) <= BEACH_SWIM_MAX_X ? CITY_BOUND_MAX_Z : CITY_SHORE_DEFAULT_MAX_Z;
    const targetZ = THREE.MathUtils.clamp(state.z, CITY_BOUND_MIN_Z, maxZForX);

    this.islandEnv.rebuildLoadedChunksAround(targetX, targetZ);

    const inSwimBay =
      Math.abs(targetX) <= BEACH_SWIM_MAX_X && targetZ >= BEACH_SWIM_START_Z;
    const minY = inSwimBay ? getLagoonFloorY(targetX, targetZ) : PLAYABLE_MIN_Y;

    let targetY = Math.max(minY, getSafeGroundSupportY(targetX, targetZ));
    let restoredFlying = false;

    if (state.isFlying) {
      targetY = THREE.MathUtils.clamp(state.y, PLAYABLE_MIN_Y, this.MAX_FLY_Y);
      if (isSolidAtWorld(targetX, targetY + 0.35, targetZ)) {
        targetY = Math.max(minY, getSafeGroundSupportY(targetX, targetZ));
      } else {
        restoredFlying = true;
      }
    } else if (Number.isFinite(state.y)) {
      const supportNearSaved = getSupportHeightAt(targetX, targetZ, state.y + 0.48);
      if (
        supportNearSaved >= minY &&
        Math.abs(supportNearSaved - state.y) <= 1.25 &&
        !isSolidAtWorld(targetX, supportNearSaved + 0.35, targetZ) &&
        !isSolidAtWorld(targetX, supportNearSaved + 1.45, targetZ)
      ) {
        targetY = supportNearSaved;
      }
    }

    this.playerPos.set(targetX, targetY, targetZ);
    this.playerVel.set(0, 0, 0);
    this.grounded = !restoredFlying;
    this.inShallowWater = !restoredFlying && inSwimBay && targetY <= 1.25;
    this.isUnderwater = false;
    this.isDancing = false;
    this.isFlying = restoredFlying;
    this.isAutoLanding = false;
    this.flyVerticalInput = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    if (typeof state.camYaw === 'number' && Number.isFinite(state.camYaw)) {
      this.camYaw = state.camYaw;
    }
    this.playerFacing =
      this.cameraMode === 'front' ? this.camYaw : this.camYaw + Math.PI;

    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.visualRoot.rotation.y = this.playerFacing;
    this.applyDayNightLighting();
    this.npcSystem.update(0.016, this.playerPos.x, this.playerPos.z);
    this.oceanLife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z);
    this.forestWildlife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z, false);
    this.danceMusic.updateClubProximity(this.playerPos.x, this.playerPos.z);
    this.applyCameraRig(0.016, true);
    this.persistPlayerState();
    this.pushHudSnapshot(0, false);
  }

  public resumeSavedPosition(saved?: PlayerSaveState | null): void {
    const state = saved ?? loadPlayerState();
    if (!state) {
      this.spawnAtStarterHome(true);
      return;
    }
    this.hasStartedGameplay = true;
    this.restoreSavedPlayerExact(state);
  }

  private persistPlayerState(): void {
    if (!this.hasStartedGameplay) return;
    saveDayTime(this.dayCycleTimeSec);
    savePlayerState({
      x: Number(this.playerPos.x.toFixed(2)),
      y: Number(this.playerPos.y.toFixed(2)),
      z: Number(this.playerPos.z.toFixed(2)),
      camYaw: Number(this.camYaw.toFixed(4)),
      homeId: STARTER_VILLA_ID,
      hasStartedOnce: true,
      isFlying: this.isFlying,
    });
  }

  public teleportTo(x: number, z: number, camYaw?: number): void {
    this.exitCurrentCar(true);
    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }
    const targetX = THREE.MathUtils.clamp(x, CITY_BOUND_MIN_X, CITY_BOUND_MAX_X);
    const maxZForX =
      Math.abs(targetX) <= BEACH_SWIM_MAX_X ? CITY_BOUND_MAX_Z : CITY_SHORE_DEFAULT_MAX_Z;
    const targetZ = THREE.MathUtils.clamp(z, CITY_BOUND_MIN_Z, maxZForX);

    this.islandEnv.preloadChunksAround(targetX, targetZ);
    const inSwimBay =
      Math.abs(targetX) <= BEACH_SWIM_MAX_X && targetZ >= BEACH_SWIM_START_Z;
    const minY = inSwimBay ? getLagoonFloorY(targetX, targetZ) : PLAYABLE_MIN_Y;
    const targetY = Math.max(minY, getSafeGroundSupportY(targetX, targetZ));

    this.playerPos.set(targetX, targetY, targetZ);
    this.playerVel.set(0, 0, 0);
    this.grounded = true;
    this.inShallowWater = inSwimBay && targetY <= 1.25;
    this.isUnderwater = false;
    this.isDancing = false;
    this.isFlying = false;
    this.isAutoLanding = false;
    this.flyVerticalInput = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    if (typeof camYaw === 'number') {
      this.camYaw = camYaw;
    }
    if (this.cameraMode === 'front') {
      this.playerFacing = this.camYaw;
    } else {
      this.playerFacing = this.camYaw + Math.PI;
    }

    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.visualRoot.rotation.y = this.playerFacing;
    this.applyDayNightLighting();
    this.npcSystem.update(0.016, this.playerPos.x, this.playerPos.z);
    this.oceanLife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z);
    this.forestWildlife.update(this.simElapsed, 0.016, this.playerPos.x, this.playerPos.z, false);
    this.danceMusic.updateClubProximity(this.playerPos.x, this.playerPos.z);
    this.applyCameraRig(0.016, true);
    this.persistPlayerState();
    this.pushHudSnapshot(0, false);
  }

  // ------------------------------------------------------------------
  // Home Furniture Spawning, Placement, Edit & Interaction System
  // ------------------------------------------------------------------
  private initSavedPlacedFurniture(): void {
    const saved = seedStarterVillaFurnitureIfNeeded();
    for (let i = 0; i < saved.length; i++) {
      const rec = saved[i];
      if (!getItemDef(rec.itemId)) continue;
      this.placedRecords.push(rec);
      this.mountFurnitureRecordMesh(rec);
    }

    // Permanent ocean-facing 3D beach loungers along South Coast Beach
    for (let i = 0; i < BEACH_LOUNGER_PLACEMENTS.length; i++) {
      const rec = BEACH_LOUNGER_PLACEMENTS[i];
      const handle = createFurnitureMesh(rec.itemId);
      handle.group.position.set(rec.x, rec.y, rec.z);
      handle.group.rotation.y = rec.rotY;
      this.furnitureGroup.add(handle.group);
      this.publicMeshes.set(rec.id, handle);
    }
  }

  private mountFurnitureRecordMesh(rec: PlacedFurnitureRecord): FurnitureMeshHandle {
    const existing = this.placedMeshes.get(rec.id);
    if (existing) {
      this.furnitureGroup.remove(existing.group);
      existing.dispose();
    }
    const handle = createFurnitureMesh(rec.itemId);
    handle.group.position.set(rec.x, rec.y, rec.z);
    handle.group.rotation.y = rec.rotY;
    handle.setStateOn(rec.stateOn ?? true);
    this.furnitureGroup.add(handle.group);
    this.placedMeshes.set(rec.id, handle);
    return handle;
  }

  private validateFurniturePlacement(
    itemId: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    ignoreRecordId?: string,
  ): { valid: boolean; houseId: string | null; floorY: number; reason: string | null } {
    const def = getItemDef(itemId);
    const spec = def?.furnitureSpec;
    if (!def || !def.isHomeFurniture || !spec) {
      return { valid: false, houseId: null, floorY: y, reason: 'Item cannot be placed as furniture' };
    }

    const houseMatch = findHouseAt(x, y, z);
    if (!houseMatch) {
      return { valid: false, houseId: null, floorY: y, reason: 'Must be inside a house room' };
    }

    const floorY = houseMatch.floorSurfaceY;
    const { rx, rz } = getRotatedHalfExtents(spec.halfW, spec.halfD, rotY);
    const { bounds } = houseMatch;

    // Keep safely clear of exterior house walls
    if (
      x - rx < bounds.x0 + 0.54 ||
      x + rx > bounds.x1 - 0.54 ||
      z - rz < bounds.z0 + 0.54 ||
      z + rz > bounds.z1 - 0.54
    ) {
      return { valid: false, houseId: houseMatch.house.id, floorY, reason: 'Too close to outer wall' };
    }

    // Check interior partition walls, closed doors, stairs, or fixed room furniture
    const sampleXs = [x, x - rx * 0.86, x + rx * 0.86];
    const sampleZs = [z, z - rz * 0.86, z + rz * 0.86];
    const maxSlabOffset = spec.isCarpet ? 0 : Math.min(1, Math.floor(Math.max(0.2, spec.height - 0.05)));

    for (let sx = 0; sx < sampleXs.length; sx++) {
      for (let sz = 0; sz < sampleZs.length; sz++) {
        const gx = Math.round(sampleXs[sx]);
        const gz = Math.round(sampleZs[sz]);
        for (let dy = 0; dy <= maxSlabOffset; dy++) {
          const id = getVoxel(gx, floorY + dy, gz);
          if (id !== VOXEL_ID.AIR && !(spec.isCarpet && (id === VOXEL_ID.CARPET_BLUE || id === VOXEL_ID.CARPET_CORAL))) {
            return {
              valid: false,
              houseId: houseMatch.house.id,
              floorY,
              reason: isDoorVoxel(id) ? 'Keep doorway clear' : 'Blocked by wall or fixed fixture',
            };
          }
        }
      }
    }

    // Also keep swing zone right in front of doors clear for non-carpet furniture
    if (!spec.isCarpet) {
      const minGx = Math.floor(x - rx - 0.7);
      const maxGx = Math.ceil(x + rx + 0.7);
      const minGz = Math.floor(z - rz - 0.7);
      const maxGz = Math.ceil(z + rz + 0.7);
      for (let gz = minGz; gz <= maxGz; gz++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const id = getVoxel(gx, floorY, gz);
          if (isDoorVoxel(id)) {
            if (Math.hypot(x - gx, z - gz) < Math.max(rx, rz) + 0.82) {
              return { valid: false, houseId: houseMatch.house.id, floorY, reason: 'Keep doorway path clear' };
            }
          }
        }
      }
    }

    // Check bounding-box collisions against already placed furniture
    for (let i = 0; i < this.placedRecords.length; i++) {
      const other = this.placedRecords[i];
      if (other.id === ignoreRecordId) continue;
      if (Math.abs(other.y - floorY) > 0.5) continue;
      const otherSpec = getItemDef(other.itemId)?.furnitureSpec;
      if (!otherSpec) continue;

      // Rugs allow regular furniture on top of them, but rugs shouldn't overlap other rugs
      if (Boolean(spec.isCarpet) !== Boolean(otherSpec.isCarpet)) continue;

      const { rx: orx, rz: orz } = getRotatedHalfExtents(otherSpec.halfW, otherSpec.halfD, other.rotY);
      if (boxesOverlapXZ(x, z, rx, rz, other.x, other.z, orx, orz)) {
        return {
          valid: false,
          houseId: houseMatch.house.id,
          floorY,
          reason: 'Overlaps existing furniture',
        };
      }
    }

    return { valid: true, houseId: houseMatch.house.id, floorY, reason: null };
  }

  public startFurniturePlacement(itemId: string): boolean {
    const def = getItemDef(itemId);
    if (!def || !def.isHomeFurniture || !def.furnitureSpec) return false;

    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }

    const houseMatch = findHouseAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    if (!houseMatch) {
      this.audio.playFixedLocked();
      this.onFurnitureToast?.('Enter any house first to place furniture!');
      return false;
    }

    // Start 1.4m in front of character inside the room
    const dirX = Math.sin(this.playerFacing);
    const dirZ = Math.cos(this.playerFacing);
    let initX = Math.round((this.playerPos.x + dirX * 1.45) * 4) / 4;
    let initZ = Math.round((this.playerPos.z + dirZ * 1.45) * 4) / 4;

    const { bounds, floorSurfaceY } = houseMatch;
    const { rx, rz } = getRotatedHalfExtents(def.furnitureSpec.halfW, def.furnitureSpec.halfD, 0);
    initX = THREE.MathUtils.clamp(initX, bounds.x0 + 0.6 + rx, bounds.x1 - 0.6 - rx);
    initZ = THREE.MathUtils.clamp(initZ, bounds.z0 + 0.6 + rz, bounds.z1 - 0.6 - rz);

    // Snap rotation to nearest 90° facing the player
    const snappedRotY = Math.round((this.playerFacing + Math.PI) / (Math.PI / 2)) * (Math.PI / 2);
    const check = this.validateFurniturePlacement(itemId, initX, floorSurfaceY, initZ, snappedRotY);

    const ghost = createFurnitureMesh(itemId);
    ghost.group.position.set(initX, floorSurfaceY, initZ);
    ghost.group.rotation.y = snappedRotY;
    ghost.setGhostState(true, check.valid);
    this.scene.add(ghost.group);

    this.placementSession = {
      mode: 'new',
      itemId,
      houseId: houseMatch.house.id,
      x: initX,
      y: floorSurfaceY,
      z: initZ,
      rotY: snappedRotY,
      valid: check.valid,
      reason: check.reason,
      ghost,
    };

    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    return true;
  }

  public startEditPlacedFurniture(recordId?: string): boolean {
    const fallbackId = this.nearbyTarget?.isMovable ? this.nearbyTarget.id : undefined;
    const id = recordId ?? fallbackId;
    if (!id) return false;
    const rec = this.placedRecords.find((r) => r.id === id);
    if (!rec) return false;

    this.stopFurnitureInteraction();
    if (this.placementSession) {
      this.cancelFurniturePlacement();
    }

    const existingMesh = this.placedMeshes.get(rec.id);
    if (existingMesh) {
      existingMesh.group.visible = false;
    }

    const check = this.validateFurniturePlacement(rec.itemId, rec.x, rec.y, rec.z, rec.rotY, rec.id);
    const ghost = createFurnitureMesh(rec.itemId);
    ghost.group.position.set(rec.x, rec.y, rec.z);
    ghost.group.rotation.y = rec.rotY;
    ghost.setGhostState(true, check.valid);
    this.scene.add(ghost.group);

    this.placementSession = {
      mode: 'edit',
      itemId: rec.itemId,
      editRecordId: rec.id,
      houseId: rec.houseId,
      x: rec.x,
      y: rec.y,
      z: rec.z,
      rotY: rec.rotY,
      valid: check.valid,
      reason: check.reason,
      originalRecord: { ...rec },
      ghost,
    };

    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    return true;
  }

  public nudgePlacement(screenRight: number, screenForward: number): void {
    const ps = this.placementSession;
    if (!ps) return;

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    const step = 0.25;
    let dx = rightX * screenRight + fwdX * screenForward;
    let dz = rightZ * screenRight + fwdZ * screenForward;
    // Axis-align lightly along dominant screen axis for crisp room alignment
    if (Math.abs(dx) > Math.abs(dz)) {
      dx = Math.sign(dx) * step;
      dz = 0;
    } else if (Math.abs(dz) > 0) {
      dz = Math.sign(dz) * step;
      dx = 0;
    }

    const nextX = Math.round((ps.x + dx) * 4) / 4;
    const nextZ = Math.round((ps.z + dz) * 4) / 4;

    const match = findHouseAt(nextX, ps.y, nextZ);
    if (match) {
      ps.x = nextX;
      ps.z = nextZ;
      ps.y = match.floorSurfaceY;
      ps.houseId = match.house.id;
    }

    const check = this.validateFurniturePlacement(
      ps.itemId,
      ps.x,
      ps.y,
      ps.z,
      ps.rotY,
      ps.editRecordId,
    );
    ps.valid = check.valid;
    ps.reason = check.reason;
    ps.ghost.group.position.set(ps.x, ps.y, ps.z);
    ps.ghost.setGhostState(true, ps.valid);
    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public rotatePlacement(dir: -1 | 1): void {
    const ps = this.placementSession;
    if (!ps) return;
    ps.rotY += dir * (Math.PI / 4);
    const check = this.validateFurniturePlacement(
      ps.itemId,
      ps.x,
      ps.y,
      ps.z,
      ps.rotY,
      ps.editRecordId,
    );
    ps.valid = check.valid;
    ps.reason = check.reason;
    ps.ghost.group.rotation.y = ps.rotY;
    ps.ghost.setGhostState(true, ps.valid);
    this.audio.playUiPop();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public confirmFurniturePlacement(): boolean {
    const ps = this.placementSession;
    if (!ps) return false;

    const check = this.validateFurniturePlacement(
      ps.itemId,
      ps.x,
      ps.y,
      ps.z,
      ps.rotY,
      ps.editRecordId,
    );
    ps.valid = check.valid;
    ps.reason = check.reason;

    if (!check.valid || !check.houseId) {
      ps.ghost.setGhostState(true, false);
      this.audio.playFixedLocked();
      this.onFurnitureToast?.(check.reason ?? 'Cannot place here');
      this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
      return false;
    }

    const def = getItemDef(ps.itemId);
    if (ps.mode === 'new') {
      const rec: PlacedFurnitureRecord = {
        id: `pf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        itemId: ps.itemId,
        houseId: check.houseId,
        x: ps.x,
        y: check.floorY,
        z: ps.z,
        rotY: ps.rotY,
        stateOn: true,
      };
      this.placedRecords.push(rec);
      const handle = this.mountFurnitureRecordMesh(rec);
      handle.pulseInteract();
      savePlacedFurniture(this.placedRecords);
      this.onConsumeFurnitureItem?.(ps.itemId);
      this.onFurnitureToast?.(`Placed ${def?.name ?? 'furniture'}!`);
      this.onWorldDirty?.('furniture_place');
    } else if (ps.editRecordId) {
      const rec = this.placedRecords.find((r) => r.id === ps.editRecordId);
      if (rec) {
        rec.x = ps.x;
        rec.y = check.floorY;
        rec.z = ps.z;
        rec.rotY = ps.rotY;
        rec.houseId = check.houseId;
        const mesh = this.placedMeshes.get(rec.id);
        if (mesh) {
          mesh.group.position.set(rec.x, rec.y, rec.z);
          mesh.group.rotation.y = rec.rotY;
          mesh.group.visible = true;
          mesh.pulseInteract();
        }
        savePlacedFurniture(this.placedRecords);
        this.onFurnitureToast?.(`Updated ${def?.name ?? 'furniture'}`);
        this.onWorldDirty?.('furniture_edit');
      }
    }

    this.scene.remove(ps.ghost.group);
    ps.ghost.dispose();
    this.placementSession = null;
    this.audio.playItemCollect();
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    return true;
  }

  public cancelFurniturePlacement(): void {
    const ps = this.placementSession;
    if (!ps) return;
    if (ps.mode === 'edit' && ps.editRecordId) {
      const mesh = this.placedMeshes.get(ps.editRecordId);
      if (mesh) {
        mesh.group.visible = true;
      }
    }
    this.scene.remove(ps.ghost.group);
    ps.ghost.dispose();
    this.placementSession = null;
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
  }

  public removePlacedFurniture(recordId?: string): boolean {
    const fallbackId = this.nearbyTarget?.isMovable ? this.nearbyTarget.id : undefined;
    const id = recordId ?? fallbackId;
    if (!id) return false;
    const idx = this.placedRecords.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    if (this.interactingFurniture?.recordId === id) {
      this.stopFurnitureInteraction();
    }

    const [removed] = this.placedRecords.splice(idx, 1);
    const mesh = this.placedMeshes.get(removed.id);
    if (mesh) {
      this.furnitureGroup.remove(mesh.group);
      mesh.dispose();
      this.placedMeshes.delete(removed.id);
    }
    savePlacedFurniture(this.placedRecords);
    const def = getItemDef(removed.itemId);
    this.onReturnFurnitureItem?.(removed.itemId);
    this.audio.playBreakTick(VOXEL_ID.PLANKS);
    this.onFurnitureToast?.(`Removed ${def?.name ?? 'furniture'} to Inventory`);
    this.onWorldDirty?.('furniture_remove');
    this.nearbyTarget = null;
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    return true;
  }

  public replacePlacedFurniture(recordId: string, newItemId: string): boolean {
    const rec = this.placedRecords.find((r) => r.id === recordId);
    const newDef = getItemDef(newItemId);
    if (!rec || !newDef || !newDef.isHomeFurniture) return false;

    const oldItemId = rec.itemId;
    const check = this.validateFurniturePlacement(newItemId, rec.x, rec.y, rec.z, rec.rotY, rec.id);
    if (!check.valid) {
      this.audio.playFixedLocked();
      this.onFurnitureToast?.(check.reason ?? 'Not enough room here to replace');
      return false;
    }

    rec.itemId = newItemId;
    rec.stateOn = true;
    const handle = this.mountFurnitureRecordMesh(rec);
    handle.pulseInteract();
    savePlacedFurniture(this.placedRecords);
    this.onSwapFurnitureItem?.(oldItemId, newItemId);
    this.audio.playShopPurchase();
    this.onFurnitureToast?.(`Replaced with ${newDef.name}!`);
    this.onWorldDirty?.('furniture_replace');
    this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
    return true;
  }

  public stopFurnitureInteraction(): void {
    if (!this.interactingFurniture) return;
    const { prevPos, targetPos } = this.interactingFurniture;
    this.interactingFurniture = null;

    let standX = prevPos.x;
    let standZ = prevPos.z;
    let standY = Math.max(
      PLAYABLE_MIN_Y,
      getSupportHeightAt(standX, standZ, prevPos.y + 0.55),
    );

    // Ensure standing spot is on the same floor and clear of bed/chair collision boxes
    if (
      Math.abs(standY - prevPos.y) > 0.75 ||
      this.hitsSolidWall(standX, standZ, standY)
    ) {
      const candidates: Array<[number, number]> = [];
      const baseDx = prevPos.x - targetPos.x;
      const baseDz = prevPos.z - targetPos.z;
      const baseAng =
        Math.hypot(baseDx, baseDz) > 0.05
          ? Math.atan2(baseDx, baseDz)
          : this.playerFacing;
      for (const dist of [0.95, 1.25, 1.55]) {
        for (let step = 0; step < 8; step++) {
          const ang = baseAng + (step * Math.PI) / 4;
          candidates.push([
            targetPos.x + Math.sin(ang) * dist,
            targetPos.z + Math.cos(ang) * dist,
          ]);
        }
      }
      for (let i = 0; i < candidates.length; i++) {
        const [cx, cz] = candidates[i];
        const cy = Math.max(
          PLAYABLE_MIN_Y,
          getSupportHeightAt(cx, cz, prevPos.y + 0.55),
        );
        if (
          Math.abs(cy - prevPos.y) <= 0.65 &&
          !this.hitsSolidWall(cx, cz, cy)
        ) {
          standX = cx;
          standZ = cz;
          standY = cy;
          break;
        }
      }
    }

    this.playerPos.set(standX, standY, standZ);
    this.playerVel.set(0, 0, 0);
    this.grounded = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.pushHudSnapshot(0, this.currentTarget !== null);
  }

  public interactNearbyFurniture(): boolean {
    if (this.paused) return false;
    if (this.interactingFurniture) {
      this.stopFurnitureInteraction();
      this.audio.playUiPop();
      return true;
    }
    const target = this.nearbyTarget;
    if (!target) return false;

    const rec = target.isMovable
      ? this.placedRecords.find((r) => r.id === target.id)
      : undefined;
    const mesh =
      this.placedMeshes.get(target.id) ?? this.publicMeshes.get(target.id);
    this.audio.unlock();

    if (target.interaction === 'sit') {
      this.isDancing = false;
      this.isFlying = false;
      this.isAutoLanding = false;
      this.flyVerticalInput = 0;
      const prevPos = this.playerPos.clone();
      const targetPos = new THREE.Vector3(
        target.x,
        target.y + target.seatY - 0.19,
        target.z,
      );
      this.interactingFurniture = {
        recordId: target.id,
        name: target.name,
        mode: 'sit',
        isMovable: target.isMovable,
        targetPos,
        targetFacing: target.rotY,
        prevPos,
      };
      this.playerVel.set(0, 0, 0);
      this.grounded = true;
      mesh?.pulseInteract();
      this.audio.playUiPop();
      this.onFurnitureToast?.(`Sitting on ${target.name}`);
      this.pushHudSnapshot(0, this.currentTarget !== null);
      return true;
    }

    if (target.interaction === 'sleep') {
      this.isDancing = false;
      this.isFlying = false;
      this.isAutoLanding = false;
      this.flyVerticalInput = 0;
      const prevPos = this.playerPos.clone();
      // Align sleeper's feet toward the bed's foot end (+Z local) so head lands on the pillow (-Z local)
      const footOffset =
        target.isVoxel && (target.itemId === 'bed_coral' || target.itemId === 'bed_mint')
          ? 0.52
          : 0.96;
      const targetPos = new THREE.Vector3(
        target.x + Math.sin(target.rotY) * footOffset,
        target.y + target.seatY,
        target.z + Math.cos(target.rotY) * footOffset,
      );
      this.interactingFurniture = {
        recordId: target.id,
        name: target.name,
        mode: 'sleep',
        isMovable: target.isMovable,
        targetPos,
        targetFacing: target.rotY,
        prevPos,
      };
      this.playerVel.set(0, 0, 0);
      this.grounded = true;
      mesh?.pulseInteract();
      this.audio.playUiPop();
      this.onFurnitureToast?.(`Resting in ${target.name}`);
      this.pushHudSnapshot(0, this.currentTarget !== null);
      return true;
    }

    if (
      rec &&
      (target.interaction === 'tv_toggle' ||
        target.interaction === 'pc_use' ||
        target.interaction === 'lamp_toggle')
    ) {
      rec.stateOn = !(rec.stateOn ?? true);
      mesh?.setStateOn(rec.stateOn);
      mesh?.pulseInteract();
      savePlacedFurniture(this.placedRecords);
      this.audio.playUiPop();
      const label =
        target.interaction === 'tv_toggle'
          ? rec.stateOn ? 'Smart TV Turned On' : 'Smart TV Turned Off'
          : target.interaction === 'pc_use'
            ? rec.stateOn ? 'Computer Screen On' : 'Computer Asleep'
            : rec.stateOn ? `${target.name} Light On` : `${target.name} Light Off`;
      this.onFurnitureToast?.(label);
      this.onWorldDirty?.('furniture_toggle');
      this.pushHudSnapshot(Math.hypot(this.playerVel.x, this.playerVel.z), this.currentTarget !== null);
      return true;
    }

    // open_storage / appliance_use
    mesh?.pulseInteract();
    this.playerRig.triggerArmSwing();
    this.audio.playDoorToggle(true);
    this.onFurnitureToast?.(
      target.interaction === 'open_storage'
        ? `Opened ${target.name}`
        : `Using ${target.name}`,
    );
    return true;
  }

  private resolveVoxelFurnitureTarget(
    gx: number,
    by: number,
    gz: number,
    id: VoxelId,
  ): NearbyFurnitureTarget | null {
    // Chairs
    if (
      id === VOXEL_ID.CHAIR_OAK ||
      id === VOXEL_ID.CHAIR_PINK ||
      id === VOXEL_ID.CHAIR_SKY ||
      id === VOXEL_ID.CHAIR_MINT
    ) {
      const name =
        id === VOXEL_ID.CHAIR_PINK
          ? 'Pink Chair'
          : id === VOXEL_ID.CHAIR_SKY
            ? 'Sky Chair'
            : id === VOXEL_ID.CHAIR_MINT
              ? 'Mint Chair'
              : 'Oak Chair';
      return {
        id: `vox_chair_${gx}_${by}_${gz}`,
        itemId: 'chair_oak',
        name,
        x: gx,
        y: by,
        z: gz,
        rotY: 0,
        seatY: 0.54,
        interaction: 'sit',
        actionLabel: 'SIT',
        isMovable: false,
        isVoxel: true,
      };
    }

    // Sofas
    if (
      id === VOXEL_ID.SOFA ||
      id === VOXEL_ID.SOFA_CORAL ||
      id === VOXEL_ID.SOFA_MINT ||
      id === VOXEL_ID.SOFA_CREAM
    ) {
      const name =
        id === VOXEL_ID.SOFA_CORAL
          ? 'Coral Sofa'
          : id === VOXEL_ID.SOFA_MINT
            ? 'Mint Sofa'
            : id === VOXEL_ID.SOFA_CREAM
              ? 'Cream Sofa'
              : 'Modern Sofa';
      return {
        id: `vox_sofa_${gx}_${by}_${gz}`,
        itemId: 'sofa',
        name,
        x: gx,
        y: by,
        z: gz,
        rotY: 0,
        seatY: 0.46,
        interaction: 'sit',
        actionLabel: 'SIT',
        isMovable: false,
        isVoxel: true,
      };
    }

    // Beds (1-block Coral/Mint beds + 2-block BED_HEAD/BED_FOOT pairs)
    if (id === VOXEL_ID.BED_CORAL || id === VOXEL_ID.BED_MINT) {
      return {
        id: `vox_bed_${gx}_${by}_${gz}`,
        itemId: id === VOXEL_ID.BED_CORAL ? 'bed_coral' : 'bed_mint',
        name: id === VOXEL_ID.BED_CORAL ? 'Coral Bed' : 'Mint Bed',
        x: gx,
        y: by,
        z: gz,
        rotY: 0,
        seatY: 0.52,
        interaction: 'sleep',
        actionLabel: 'SLEEP',
        isMovable: false,
        isVoxel: true,
      };
    }

    if (id === VOXEL_ID.BED_HEAD || id === VOXEL_ID.BED_FOOT) {
      let hx = gx;
      let hz = gz;
      let fx = gx;
      let fz = gz;
      const partnerId = id === VOXEL_ID.BED_HEAD ? VOXEL_ID.BED_FOOT : VOXEL_ID.BED_HEAD;
      const adjDirs: ReadonlyArray<[number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      let hasPartner = false;
      for (let i = 0; i < adjDirs.length; i++) {
        const nx = gx + adjDirs[i][0];
        const nz = gz + adjDirs[i][1];
        if (getVoxel(nx, by, nz) === partnerId) {
          hasPartner = true;
          if (id === VOXEL_ID.BED_HEAD) {
            fx = nx;
            fz = nz;
          } else {
            hx = nx;
            hz = nz;
          }
          break;
        }
      }
      const rotY = hasPartner ? Math.atan2(fx - hx, fz - hz) : 0;
      const cx = (hx + fx) * 0.5;
      const cz = (hz + fz) * 0.5;
      return {
        id: `vox_bed_${Math.min(hx, fx)}_${by}_${Math.min(hz, fz)}`,
        itemId: 'bed',
        name: 'Cozy Bed',
        x: cx,
        y: by,
        z: cz,
        rotY,
        seatY: 0.56,
        interaction: 'sleep',
        actionLabel: 'SLEEP',
        isMovable: false,
        isVoxel: true,
      };
    }

    return null;
  }

  private updateNearbyFurniture(): void {
    let bestTarget: NearbyFurnitureTarget | null = null;
    let bestScore = Infinity;

    const considerRecord = (rec: PlacedFurnitureRecord, isMovable: boolean) => {
      if (this.placementSession?.editRecordId === rec.id) return;
      if (Math.abs(rec.y - this.playerPos.y) > 1.35) return;
      const d = Math.hypot(rec.x - this.playerPos.x, rec.z - this.playerPos.z);
      if (d > 2.35) return;
      const def = getItemDef(rec.itemId);
      const spec = def?.furnitureSpec;
      if (!def || !spec || !spec.interaction) return;

      const penalty = spec.isCarpet ? 0.9 : 0;
      const score = d + penalty;
      if (score < bestScore) {
        bestScore = score;
        let actionLabel = spec.actionLabel ?? 'Use';
        if (spec.interaction === 'tv_toggle') actionLabel = rec.stateOn ? 'TV Off' : 'TV On';
        else if (spec.interaction === 'pc_use') actionLabel = rec.stateOn ? 'PC Off' : 'Use PC';
        else if (spec.interaction === 'lamp_toggle') actionLabel = rec.stateOn ? 'Light Off' : 'Light On';

        bestTarget = {
          id: rec.id,
          itemId: rec.itemId,
          name: def.name,
          x: rec.x,
          y: rec.y,
          z: rec.z,
          rotY: rec.rotY,
          seatY: spec.seatY ?? (spec.interaction === 'sleep' ? 0.52 : 0.45),
          interaction: spec.interaction,
          actionLabel,
          isMovable,
          isVoxel: false,
          stateOn: rec.stateOn,
        };
      }
    };

    for (let i = 0; i < this.placedRecords.length; i++) {
      considerRecord(this.placedRecords[i], true);
    }
    for (let i = 0; i < BEACH_LOUNGER_PLACEMENTS.length; i++) {
      considerRecord(BEACH_LOUNGER_PLACEMENTS[i], false);
    }

    // Also detect ALL built-in voxel chairs, sofas, and beds city-wide (all houses, hotels, cafe, cinema, beach)
    const px = Math.round(this.playerPos.x);
    const py = Math.floor(this.playerPos.y);
    const pz = Math.round(this.playerPos.z);
    for (let dy = 0; dy <= 1; dy++) {
      const by = py + dy;
      for (let dz = -2; dz <= 2; dz++) {
        const gz = pz + dz;
        for (let dx = -2; dx <= 2; dx++) {
          const gx = px + dx;
          const id = getVoxel(gx, by, gz);
          if (id === VOXEL_ID.AIR) continue;
          const voxTarget = this.resolveVoxelFurnitureTarget(gx, by, gz, id);
          if (!voxTarget) continue;
          const d = Math.hypot(voxTarget.x - this.playerPos.x, voxTarget.z - this.playerPos.z);
          if (d <= 2.35 && d + 0.12 < bestScore) {
            bestScore = d + 0.12;
            bestTarget = voxTarget;
          }
        }
      }
    }

    this.nearbyTarget = bestTarget;
  }

  // ------------------------------------------------------------------
  // Exact Center Crosshair Raycast, Break Button & Place Button
  // ------------------------------------------------------------------
  private raycastNdc(ndcX: number, ndcY: number, maxReach: number): BlockTarget | null {
    _rayNdc.set(ndcX, ndcY);
    this.raycaster.setFromCamera(_rayNdc, this.camera);
    this.raycaster.far = 26;

    const hits = this.raycaster.intersectObject(this.islandEnv.terrainGroup, true);
    if (hits.length === 0) return null;

    // Projected distance along view ray from world camera to player's upper-torso plane
    this.camera.getWorldPosition(_camWorldPos);
    _rayPivot.set(this.playerPos.x, this.playerPos.y + 1.45, this.playerPos.z);
    const camToPlayerPlane = _rayPivot
      .sub(_camWorldPos)
      .dot(this.raycaster.ray.direction);
    const minHitDist = Math.max(0.25, camToPlayerPlane - 0.65);

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (!hit.face) continue;
      if (hit.distance < minHitDist) continue;

      _hitNormal.copy(hit.face.normal);
      _hitPoint.copy(hit.point).addScaledVector(_hitNormal, -0.05);

      let targetGx = Math.round(_hitPoint.x);
      const targetBy = Math.floor(_hitPoint.y);
      let targetGz = Math.round(_hitPoint.z);
      if (!isInVoxelBounds(targetGx, targetBy, targetGz)) continue;

      let blockId = getVoxel(targetGx, targetBy, targetGz);
      if (blockId === VOXEL_ID.AIR) {
        // An open hinged glass door leaf protrudes into adjacent air: resolve back to its door voxel
        const adj: ReadonlyArray<[number, number]> = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        let bestDist = Infinity;
        for (let a = 0; a < adj.length; a++) {
          const nx = targetGx + adj[a][0];
          const nz = targetGz + adj[a][1];
          const adjId = getVoxel(nx, targetBy, nz);
          if (isDoorVoxel(adjId) && isDoorOpen(adjId)) {
            const dSq = (_hitPoint.x - nx) * (_hitPoint.x - nx) + (_hitPoint.z - nz) * (_hitPoint.z - nz);
            if (dSq < bestDist) {
              bestDist = dSq;
              targetGx = nx;
              targetGz = nz;
              blockId = adjId;
            }
          }
        }
      }
      if (blockId === VOXEL_ID.AIR) continue;

      // Reach check from player's eye/upper chest
      const reachDist = Math.hypot(
        targetGx - this.playerPos.x,
        targetBy + 0.5 - (this.playerPos.y + 1.45),
        targetGz - this.playerPos.z,
      );
      if (reachDist > maxReach) return null;

      return {
        gx: targetGx,
        by: targetBy,
        gz: targetGz,
        nx: Math.round(_hitNormal.x),
        ny: Math.round(_hitNormal.y),
        nz: Math.round(_hitNormal.z),
        blockId,
      };
    }

    return null;
  }

  private raycastCenterCrosshair(): BlockTarget | null {
    return this.raycastNdc(0, 0, BLOCK_REACH_DISTANCE);
  }

  private applyDoorTransition(
    gx: number,
    by: number,
    gz: number,
    shouldOpen: boolean,
    isManual: boolean,
  ): boolean {
    const res = setDoorOpenState(gx, by, gz, shouldOpen);
    if (!res.changed) return false;

    const animDuration = 0.24;
    for (let i = 0; i < res.affectedLeaves.length; i++) {
      const leaf = res.affectedLeaves[i];
      const key = doorAnimKey(leaf.gx, leaf.yBot, leaf.gz);

      if (res.opened) {
        this.autoOpenedDoors.set(key, { gx: leaf.gx, yBot: leaf.yBot, gz: leaf.gz });
        this.manualClosedCooldown.delete(key);
      } else {
        this.autoOpenedDoors.delete(key);
        if (isManual) {
          this.manualClosedCooldown.set(key, this.simElapsed + 2.6);
        }
      }

      let resumeVal: number | undefined;
      for (let j = this.activeDoorAnims.length - 1; j >= 0; j--) {
        if (this.activeDoorAnims[j].key === key) {
          resumeVal = this.activeDoorAnims[j].currentVal;
          this.activeDoorAnims[j].rig.dispose();
          this.activeDoorAnims.splice(j, 1);
        }
      }

      this.islandEnv.setDoorAnimating(leaf.gx, leaf.yBot, leaf.gz, true);
      const rig = this.islandEnv.createAnimatedDoorRig(leaf.gx, leaf.yBot, leaf.gz, leaf.id);
      if (resumeVal !== undefined) {
        rig.startVal = resumeVal;
        rig.group.rotation.y = resumeVal;
      }
      this.activeDoorAnims.push({
        key,
        gx: leaf.gx,
        yBot: leaf.yBot,
        gz: leaf.gz,
        rig,
        progress: 0,
        duration: animDuration,
        currentVal: rig.startVal,
      });
    }

    let playerDoorChanged = false;
    for (let i = 0; i < res.affectedLeaves.length; i++) {
      const leaf = res.affectedLeaves[i];
      if (!isFixedVoxel(leaf.gx, leaf.yBot, leaf.gz)) {
        recordPlayerVoxelEdit(leaf.gx, leaf.yBot, leaf.gz, leaf.id);
        if (isDoorVoxel(getVoxel(leaf.gx, leaf.yBot + 1, leaf.gz))) {
          recordPlayerVoxelEdit(leaf.gx, leaf.yBot + 1, leaf.gz, leaf.id);
        }
        playerDoorChanged = true;
      }
    }

    for (let i = 0; i < res.affectedCoords.length; i++) {
      const [ax, az] = res.affectedCoords[i];
      this.islandEnv.rebuildTerrainAt(ax, az);
    }
    if (playerDoorChanged) {
      this.onWorldDirty?.('door_toggle');
    }
    this.audio.playDoorToggle(res.opened);
    return true;
  }

  private toggleDoorAtTarget(gx: number, by: number, gz: number): boolean {
    const id = getVoxel(gx, by, gz);
    if (!isDoorVoxel(id)) return false;
    const ok = this.applyDoorTransition(gx, by, gz, !isDoorOpen(id), true);
    if (ok) this.playerRig.triggerArmSwing();
    return ok;
  }

  private updateProximityDoors(): void {
    const px = Math.round(this.playerPos.x);
    const py = Math.floor(this.playerPos.y);
    const pz = Math.round(this.playerPos.z);

    // 1. Auto-open closed doors as the player approaches
    for (let dx = -2; dx <= 2; dx++) {
      const gx = px + dx;
      for (let dz = -2; dz <= 2; dz++) {
        const gz = pz + dz;
        const hDistSq =
          (gx - this.playerPos.x) * (gx - this.playerPos.x) +
          (gz - this.playerPos.z) * (gz - this.playerPos.z);
        if (hDistSq > 5.0625) continue; // radius = 2.25 blocks

        for (let dy = -1; dy <= 2; dy++) {
          const by = py + dy;
          const id = getVoxel(gx, by, gz);
          if (!isDoorVoxel(id) || isDoorOpen(id)) continue;

          const yBot = isDoorVoxel(getVoxel(gx, by - 1, gz)) ? by - 1 : by;
          if (this.playerPos.y < yBot - 1.35 || this.playerPos.y > yBot + 1.85) continue;

          const key = doorAnimKey(gx, yBot, gz);
          const cooldownUntil = this.manualClosedCooldown.get(key);
          if (cooldownUntil !== undefined && this.simElapsed < cooldownUntil) continue;

          this.applyDoorTransition(gx, yBot, gz, true, false);
          break;
        }
      }
    }

    // 2. Auto-close opened doors when the player moves away (hysteresis >= 2.95 blocks)
    if (this.autoOpenedDoors.size > 0) {
      for (const [key, info] of this.autoOpenedDoors.entries()) {
        const id = getVoxel(info.gx, info.yBot, info.gz);
        if (!isDoorVoxel(id) || !isDoorOpen(id)) {
          this.autoOpenedDoors.delete(key);
          continue;
        }

        // Check distance against this leaf & any adjacent partner double-door leaf
        let minDistSq =
          (info.gx - this.playerPos.x) * (info.gx - this.playerPos.x) +
          (info.gz - this.playerPos.z) * (info.gz - this.playerPos.z);

        const adjDirs: ReadonlyArray<[number, number]> = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        for (let i = 0; i < adjDirs.length; i++) {
          const nx = info.gx + adjDirs[i][0];
          const nz = info.gz + adjDirs[i][1];
          const nId = getVoxel(nx, info.yBot, nz);
          if (isDoorVoxel(nId) && isDoorOpen(nId)) {
            const ndSq =
              (nx - this.playerPos.x) * (nx - this.playerPos.x) +
              (nz - this.playerPos.z) * (nz - this.playerPos.z);
            if (ndSq < minDistSq) minDistSq = ndSq;
          }
        }

        const vDist = Math.abs(this.playerPos.y - info.yBot);
        if (minDistSq >= 8.7025 || vDist > 2.35) {
          this.applyDoorTransition(info.gx, info.yBot, info.gz, false, false);
        }
      }
    }

    // 3. Clear manual close cooldowns once the player steps away
    if (this.manualClosedCooldown.size > 0) {
      for (const [key, until] of this.manualClosedCooldown.entries()) {
        if (this.simElapsed >= until) {
          this.manualClosedCooldown.delete(key);
          continue;
        }
        const parts = key.split(',');
        const kx = Number(parts[0]);
        const kz = Number(parts[2]);
        const distSq =
          (kx - this.playerPos.x) * (kx - this.playerPos.x) +
          (kz - this.playerPos.z) * (kz - this.playerPos.z);
        if (distSq > 7.5625) {
          this.manualClosedCooldown.delete(key);
        }
      }
    }
  }

  private updateDoorAnimations(dt: number): void {
    if (this.activeDoorAnims.length === 0) return;

    for (let i = this.activeDoorAnims.length - 1; i >= 0; i--) {
      const anim = this.activeDoorAnims[i];
      if (!isDoorVoxel(getVoxel(anim.gx, anim.yBot, anim.gz))) {
        this.islandEnv.setDoorAnimating(anim.gx, anim.yBot, anim.gz, false);
        anim.rig.dispose();
        this.activeDoorAnims.splice(i, 1);
        continue;
      }

      anim.progress = Math.min(1, anim.progress + dt / anim.duration);
      const inv = 1 - anim.progress;
      const eased = 1 - inv * inv * inv; // smooth cubic ease-out
      const val = THREE.MathUtils.lerp(anim.rig.startVal, anim.rig.targetVal, eased);
      anim.currentVal = val;
      anim.rig.group.rotation.y = val;

      if (anim.progress >= 1) {
        this.islandEnv.setDoorAnimating(anim.gx, anim.yBot, anim.gz, false);
        anim.rig.dispose();
        this.activeDoorAnims.splice(i, 1);
        this.islandEnv.rebuildTerrainAt(anim.gx, anim.gz);
      }
    }
  }

  public handleScreenTap(ndcX: number, ndcY: number): boolean {
    if (this.paused) return false;
    this.audio.unlock();
    const hit = this.raycastNdc(ndcX, ndcY, BLOCK_REACH_DISTANCE + 0.8);
    if (!hit || !isDoorVoxel(hit.blockId)) return false;
    return this.toggleDoorAtTarget(hit.gx, hit.by, hit.gz);
  }

  private notifyFixedBlockBlocked(): void {
    if (this.simElapsed - this.lastFixedFeedbackTime < 0.65) return;
    this.lastFixedFeedbackTime = this.simElapsed;
    this.audio.playFixedLocked();
    this.onFixedBlockHit?.();
  }

  private startBreakOnTarget(target: BlockTarget): void {
    if (target.by < 1) return; // Protect y=0 seabed floor
    if (isFixedVoxel(target.gx, target.by, target.gz)) {
      this.notifyFixedBlockBlocked();
      return;
    }
    this.activeBreak = {
      gx: target.gx,
      by: target.by,
      gz: target.gz,
      blockId: target.blockId,
      progress: 0,
      duration: this.fastBreakActive ? 0.13 : SHORT_BREAK_DURATION,
      tickAccum: 0.06,
    };
    this.playerRig.triggerArmSwing();
    this.audio.playBreakTick(target.blockId);
  }

  public triggerBreakPress(): void {
    if (this.paused) return;
    this.audio.unlock();
    this.breakButtonHeld = true;

    const target = this.currentTarget ?? this.raycastCenterCrosshair();
    if (!target || target.by < 1) return;
    if (isFixedVoxel(target.gx, target.by, target.gz)) {
      this.notifyFixedBlockBlocked();
      return;
    }

    // Start short breaking animation on ONLY the block selected by the crosshair
    if (
      !this.activeBreak ||
      this.activeBreak.gx !== target.gx ||
      this.activeBreak.by !== target.by ||
      this.activeBreak.gz !== target.gz
    ) {
      this.startBreakOnTarget(target);
    }
  }

  public triggerBreakRelease(): void {
    this.breakButtonHeld = false;
  }

  public placeSelectedBlock(): boolean {
    if (this.paused) return false;
    this.audio.unlock();

    const target = this.currentTarget ?? this.raycastCenterCrosshair();
    if (!target) return false;

    // Tapping Place/Use while aiming at a door opens or closes it
    if (isDoorVoxel(target.blockId)) {
      return this.toggleDoorAtTarget(target.gx, target.by, target.gz);
    }

    if (this.equippedVoxelId === null) return false;

    const px = target.gx + target.nx;
    const py = target.by + target.ny;
    const pz = target.gz + target.nz;

    if (py < 1 || py >= MAX_HEIGHT || !isInVoxelBounds(px, py, pz)) return false;
    if (getVoxel(px, py, pz) !== VOXEL_ID.AIR) return false;

    const placingDoor = isDoorVoxel(this.equippedVoxelId);
    if (placingDoor) {
      if (py + 1 >= MAX_HEIGHT || getVoxel(px, py + 1, pz) !== VOXEL_ID.AIR) {
        return false;
      }
    }

    // Prevent placing a block inside the player's own body
    const overlapsPlayerXZ =
      Math.abs(px - this.playerPos.x) < 0.68 && Math.abs(pz - this.playerPos.z) < 0.68;
    const overlapsPlayerY =
      py >= Math.floor(this.playerPos.y + 0.08) &&
      py <= Math.floor(this.playerPos.y + 1.72);
    const overlapsDoorTopY =
      placingDoor &&
      py + 1 >= Math.floor(this.playerPos.y + 0.08) &&
      py + 1 <= Math.floor(this.playerPos.y + 1.72);
    if (overlapsPlayerXZ && (overlapsPlayerY || overlapsDoorTopY)) return false;

    if (!setVoxel(px, py, pz, this.equippedVoxelId)) return false;
    recordPlayerVoxelEdit(px, py, pz, this.equippedVoxelId);
    if (placingDoor) {
      setVoxel(px, py + 1, pz, this.equippedVoxelId);
      recordPlayerVoxelEdit(px, py + 1, pz, this.equippedVoxelId);
    }

    this.islandEnv.rebuildTerrainAt(px, pz);
    this.playerRig.triggerArmSwing();
    this.onConsumeEquipped?.();
    this.onWorldDirty?.('block_place');
    return true;
  }

  private spawnBreakParticles(gx: number, by: number, gz: number, blockId: VoxelId): void {
    const colorHex = getBlockParticleColor(blockId);
    let spawned = 0;

    for (let i = 0; i < MAX_PARTICLES && spawned < 14; i++) {
      const p = this.particles[i];
      if (p.active) continue;

      p.active = true;
      p.x = gx + (Math.random() - 0.5) * 0.65;
      p.y = by + 0.25 + Math.random() * 0.55;
      p.z = gz + (Math.random() - 0.5) * 0.65;
      p.vx = (Math.random() - 0.5) * 3.8;
      p.vy = 2.0 + Math.random() * 3.0;
      p.vz = (Math.random() - 0.5) * 3.8;
      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.maxLife = 0.42 + Math.random() * 0.22;
      p.life = p.maxLife;
      p.colorHex = colorHex;
      spawned++;
    }
  }

  private updateParticles(dt: number): void {
    let activeCount = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vy -= 18.0 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += 5.5 * dt;
      p.ry += 4.2 * dt;

      const floorY = getSupportHeightAt(p.x, p.z, p.y + 0.2);
      if (p.y < floorY + 0.08) {
        p.y = floorY + 0.08;
        p.vy = Math.abs(p.vy) * 0.35;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }

      const scale = Math.max(0.05, p.life / p.maxLife);
      _dummyObj.position.set(p.x, p.y, p.z);
      _dummyObj.rotation.set(p.rx, p.ry, 0);
      _dummyObj.scale.setScalar(scale);
      _dummyObj.updateMatrix();

      this.particlesMesh.setMatrixAt(activeCount, _dummyObj.matrix);
      _particleColor.setHex(p.colorHex);
      this.particlesMesh.setColorAt(activeCount, _particleColor);
      activeCount++;
    }

    if (activeCount > 0) {
      this.particlesMesh.visible = true;
      this.particlesMesh.count = activeCount;
      this.particlesMesh.instanceMatrix.needsUpdate = true;
      if (this.particlesMesh.instanceColor) {
        this.particlesMesh.instanceColor.needsUpdate = true;
      }
    } else {
      this.particlesMesh.visible = false;
    }
  }

  private updateCrosshairAndBreaking(dt: number): boolean {
    if (this.breakCooldown > 0) {
      this.breakCooldown = Math.max(0, this.breakCooldown - dt);
    }

    this.currentTarget = this.raycastCenterCrosshair();

    // Start next break automatically if Break button is still held down
    if (!this.activeBreak && this.breakButtonHeld && this.breakCooldown <= 0) {
      if (this.currentTarget && this.currentTarget.by >= 1) {
        this.startBreakOnTarget(this.currentTarget);
      }
    }

    // Advance short breaking animation on the locked crosshair block
    if (this.activeBreak) {
      this.activeBreak.progress += dt / this.activeBreak.duration;
      this.activeBreak.tickAccum += dt;

      if (this.activeBreak.tickAccum >= 0.12) {
        this.activeBreak.tickAccum = 0;
        this.playerRig.triggerArmSwing();
        this.audio.playBreakTick(this.activeBreak.blockId);
      }

      const stage = Math.min(5, Math.floor(this.activeBreak.progress * 6));
      this.crackTex.offset.x = stage / 6;
      this.crackMesh.position.set(
        this.activeBreak.gx,
        this.activeBreak.by + 0.5,
        this.activeBreak.gz,
      );
      this.crackMesh.visible = true;

      if (this.activeBreak.progress >= 1) {
        const { gx, by, gz, blockId } = this.activeBreak;
        if (getVoxel(gx, by, gz) !== VOXEL_ID.AIR && !isFixedVoxel(gx, by, gz)) {
          setVoxel(gx, by, gz, VOXEL_ID.AIR);
          recordPlayerVoxelEdit(gx, by, gz, VOXEL_ID.AIR);
          this.islandEnv.rebuildTerrainAt(gx, gz);
          this.spawnBreakParticles(gx, by, gz, blockId);
          this.audio.playBlockBreak(blockId);
          this.audio.playItemCollect();
          this.onCollectVoxel?.(blockId);
          this.onWorldDirty?.('block_break');
        }

        this.activeBreak = null;
        this.crackMesh.visible = false;
        this.breakCooldown = 0.14;
        this.currentTarget = this.raycastCenterCrosshair();
      }
    } else {
      this.crackMesh.visible = false;
    }

    // Show highlighted outline around the targeted block
    const outlineTarget = this.activeBreak ?? this.currentTarget;
    if (outlineTarget) {
      this.targetOutline.position.set(
        outlineTarget.gx,
        outlineTarget.by + 0.5,
        outlineTarget.gz,
      );
      this.targetOutline.visible = true;
      return true;
    }

    this.targetOutline.visible = false;
    return false;
  }

  private handleResize = (): void => {
    if (this.destroyed) return;
    const vv = window.visualViewport;
    const w = Math.max(1, this.container.clientWidth || vv?.width || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || vv?.height || window.innerHeight);
    const maxDpr = this.isTouchDevice ? 1.6 : 2.0;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr),
    );
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.paused) return;
    if (this.activeCarId) {
      if (e.code === 'Space') {
        e.preventDefault();
      } else if (e.code === 'KeyE' || e.code === 'KeyV') {
        this.exitCurrentCar();
      } else if (e.code === 'KeyC') {
        this.cycleCameraMode();
      } else if (e.code === 'KeyQ') {
        this.setCameraOrbitInput(-1);
      } else if (e.code === 'KeyR') {
        this.setCameraOrbitInput(1);
      }
      this.keys.add(e.code);
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.isFlying) {
        this.triggerJump();
      } else {
        this.isAutoLanding = false;
      }
    } else if (e.code === 'KeyY') {
      this.toggleFlyMode();
    } else if (e.code === 'KeyL' && this.isFlying) {
      this.triggerLand();
    } else if (e.code === 'KeyV') {
      this.enterNearbyCar();
    } else if (e.code === 'KeyE') {
      if (this.nearbyChest) {
        this.openNearbyChest();
      } else {
        this.placeSelectedBlock();
      }
    } else if (e.code === 'KeyF') {
      this.triggerBreakPress();
    } else if (e.code === 'KeyC') {
      this.cycleCameraMode();
    } else if (e.code === 'KeyQ') {
      this.setCameraOrbitInput(-1);
    } else if (e.code === 'KeyR') {
      this.setCameraOrbitInput(1);
    } else if (e.code === 'KeyG') {
      this.toggleDance();
    }
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'KeyF') {
      this.triggerBreakRelease();
    } else if (e.code === 'KeyQ' || e.code === 'KeyR') {
      this.setCameraOrbitInput(0);
    }
    this.keys.delete(e.code);
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLostCallback?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLostCallback?.(false);
  };

  private applyCameraRig(dt: number, snapDist: boolean): void {
    const targetPivotY =
      this.activeCarId
        ? 2.15
        : this.interactingFurniture?.mode === 'sleep'
          ? 0.65
          : this.inShallowWater && this.isUnderwater
            ? 0.78
            : this.cameraMode === 'back'
              ? 1.74
              : 1.52;
    const targetBaseDist = this.activeCarId
      ? this.cameraMode === 'front'
        ? 4.4
        : this.cameraMode === 'orbit'
          ? 5.6
          : 6.9
      : this.cameraMode === 'front'
        ? 3.75
        : this.cameraMode === 'orbit'
          ? 4.35
          : 5.6;

    if (snapDist) {
      this.camPivotY = targetPivotY;
      this.camDistance = targetBaseDist;
    } else {
      this.camPivotY = THREE.MathUtils.damp(this.camPivotY, targetPivotY, 12, dt);
      this.camDistance = THREE.MathUtils.damp(this.camDistance, targetBaseDist, 10, dt);
    }

    const pivotY = this.playerPos.y + this.camPivotY;

    // Unit ray from head/body look target toward camera at exact (camYaw, camPitch)
    const cosPitch = Math.cos(this.camPitch);
    const backX = Math.sin(this.camYaw) * cosPitch;
    const backY = Math.sin(this.camPitch);
    const backZ = Math.cos(this.camYaw) * cosPitch;

    // Center character's face & body cleanly in Front/Orbit modes; subtle shoulder clear in Back mode
    _camRight.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    let targetShoulderOffset = 0;
    if (this.cameraMode === 'back') {
      const upBlend = THREE.MathUtils.clamp((-this.camPitch - 0.12) / 0.55, 0, 1);
      const downBlend = THREE.MathUtils.clamp((this.camPitch - 0.68) / 0.55, 0, 1);
      const closeBlend = THREE.MathUtils.clamp((2.8 - this.camActualDist) / 1.4, 0, 1);
      targetShoulderOffset = 0.46 * Math.max(upBlend, downBlend, closeBlend);

      if (targetShoulderOffset > 0.05) {
        const checkX = this.playerPos.x + _camRight.x * (targetShoulderOffset + 0.18);
        const checkZ = this.playerPos.z + _camRight.z * (targetShoulderOffset + 0.18);
        if (isSolidAtWorld(checkX, pivotY, checkZ)) {
          const leftX = this.playerPos.x - _camRight.x * (targetShoulderOffset + 0.18);
          const leftZ = this.playerPos.z - _camRight.z * (targetShoulderOffset + 0.18);
          targetShoulderOffset = isSolidAtWorld(leftX, pivotY, leftZ)
            ? 0.12
            : -targetShoulderOffset;
        }
      }
    }

    if (snapDist) {
      this.camShoulderOffset = targetShoulderOffset;
    } else {
      this.camShoulderOffset = THREE.MathUtils.damp(
        this.camShoulderOffset,
        targetShoulderOffset,
        16,
        dt,
      );
    }

    const lookWorldX = this.playerPos.x + _camRight.x * this.camShoulderOffset;
    const lookWorldZ = this.playerPos.z + _camRight.z * this.camShoulderOffset;

    // Pull camera distance inward along view ray if terrain or walls intersect
    const minSafeDist = this.cameraMode === 'back' ? 0.45 : 0.9;
    let safeDist = this.camDistance;
    const step = 0.28;
    for (let t = 0.38; t <= this.camDistance; t += step) {
      const sx = lookWorldX + backX * t;
      const sy = pivotY + backY * t;
      const sz = lookWorldZ + backZ * t;

      if (
        isSolidAtWorld(sx, sy, sz) ||
        isSolidAtWorld(sx, sy - 0.18, sz) ||
        isSolidAtWorld(sx, sy + 0.18, sz)
      ) {
        safeDist = Math.max(minSafeDist, t - 0.26);
        break;
      }

      const floorClearY =
        getSupportHeightAt(sx, sz, Math.max(pivotY, sy) + 0.2) + 0.28;
      if (sy < floorClearY && backY < -0.02) {
        const exactT = (floorClearY - pivotY) / backY;
        safeDist = Math.min(safeDist, Math.max(minSafeDist, exactT));
        break;
      }
    }

    if (snapDist) {
      this.camActualDist = safeDist;
    } else if (safeDist < this.camActualDist) {
      this.camActualDist = THREE.MathUtils.damp(this.camActualDist, safeDist, 32, dt);
      this.camActualDist = Math.min(this.camActualDist, safeDist + 0.08);
    } else {
      this.camActualDist = THREE.MathUtils.damp(this.camActualDist, safeDist, 10, dt);
    }

    // Apply transforms directly on the player-attached camera rig
    this.cameraPivot.rotation.y = this.camYaw;
    this.pitchPivot.position.set(this.camShoulderOffset, this.camPivotY, 0);
    this.pitchPivot.rotation.x = -this.camPitch;
    this.camera.position.set(0, 0, this.camActualDist);
    this.playerRig.root.updateMatrixWorld(true);

    // Tint atmospheric fog to clear underwater turquoise when the camera lens dips below sea level
    this.camera.getWorldPosition(_camWorldPos);
    const camSubmerged = _camWorldPos.y < SHALLOW_WATER_SURFACE_Y - 0.04;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (camSubmerged) {
      if (fog) {
        fog.color.copy(this.underwaterTintColor);
        fog.density = 0.032;
      }
      (this.scene.background as THREE.Color).copy(this.underwaterTintColor);
    } else {
      if (fog) {
        fog.color.copy(this.surfaceSkyColor);
        fog.density = this.surfaceFogDensity;
      }
      (this.scene.background as THREE.Color).copy(this.surfaceSkyColor);
    }
  }

  private applyDayNightLighting(): void {
    const state = evaluateDayNightCycle(this.dayCycleTimeSec, this.dayNightState);

    this.surfaceSkyColor.copy(state.fogColor);
    this.surfaceFogDensity = state.fogDensity;

    this.hemiLight.color.copy(state.hemiSkyColor);
    this.hemiLight.groundColor.copy(state.hemiGroundColor);
    this.hemiLight.intensity = state.hemiIntensity;

    this.sunLight.color.copy(state.keyLightColor);
    this.sunLight.intensity = state.keyLightIntensity;
    this.sunLight.position.set(
      this.playerPos.x + state.activeShadowDir.x * 44,
      this.playerPos.y + state.activeShadowDir.y * 44,
      this.playerPos.z + state.activeShadowDir.z * 44,
    );
    this.sunLight.target.position.copy(this.playerPos);

    this.rimLight.color.copy(state.rimColor);
    this.rimLight.intensity = state.rimIntensity;

    this.renderer.toneMappingExposure = state.toneExposure;
    this.scene.environmentIntensity = state.envIntensity;

    const activeCarPose = this.activeCarId
      ? this.carSystem.getCarPose(this.activeCarId)
      : null;
    this.cityLights.update(
      state.cityLightsLevel,
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      Boolean(activeCarPose),
      activeCarPose?.yaw ?? this.playerFacing,
    );
    this.carSystem.setNightLightLevel(state.cityLightsLevel);
    this.islandEnv.update(this.simElapsed, this.playerPos.x, this.playerPos.z, state);
  }

  private getFootprintSupportY(x: number, z: number, maxFootY: number): number {
    const r = 0.22;
    let best = getSupportHeightAt(x, z, maxFootY);
    best = Math.max(best, getSupportHeightAt(x - r, z - r, maxFootY));
    best = Math.max(best, getSupportHeightAt(x + r, z - r, maxFootY));
    best = Math.max(best, getSupportHeightAt(x - r, z + r, maxFootY));
    best = Math.max(best, getSupportHeightAt(x + r, z + r, maxFootY));
    return best;
  }

  private hitsSolidAtSlice(cx: number, y: number, cz: number, r = 0.26): boolean {
    if (
      isSolidAtWorld(cx - r, y, cz - r) ||
      isSolidAtWorld(cx + r, y, cz - r) ||
      isSolidAtWorld(cx - r, y, cz + r) ||
      isSolidAtWorld(cx + r, y, cz + r)
    ) {
      return true;
    }

    // Also collide cleanly against player-placed solid 3D furniture
    for (let i = 0; i < this.placedRecords.length; i++) {
      const rec = this.placedRecords[i];
      if (rec.id === this.interactingFurniture?.recordId) continue;
      if (rec.id === this.placementSession?.editRecordId) continue;
      const spec = getItemDef(rec.itemId)?.furnitureSpec;
      if (!spec || spec.isCarpet) continue;
      if (y < rec.y + 0.05 || y > rec.y + spec.height - 0.03) continue;
      const { rx, rz } = getRotatedHalfExtents(spec.halfW, spec.halfD, rec.rotY);
      if (
        Math.abs(cx - rec.x) < rx + r * 0.85 &&
        Math.abs(cz - rec.z) < rz + r * 0.85
      ) {
        return true;
      }
    }

    return false;
  }

  private hitsSolidWall(cx: number, cz: number, footY: number): boolean {
    return (
      this.hitsSolidAtSlice(cx, footY + 0.32, cz) ||
      this.hitsSolidAtSlice(cx, footY + 1.05, cz) ||
      this.hitsSolidAtSlice(cx, footY + 1.66, cz)
    );
  }

  private tryMoveWithStairStep(
    nextX: number,
    nextZ: number,
    footY: number,
  ): { allowed: boolean; steppedY: number | null } {
    // Reject immediately if waist or head intersects any wall or tall furniture
    if (
      this.hitsSolidAtSlice(nextX, footY + 1.05, nextZ) ||
      this.hitsSolidAtSlice(nextX, footY + 1.66, nextZ)
    ) {
      return { allowed: false, steppedY: null };
    }

    const yShin = footY + 0.32;
    if (!this.hitsSolidAtSlice(nextX, yShin, nextZ)) {
      return { allowed: true, steppedY: null };
    }

    // Only permit smooth auto-stepping onto genuine stairs when grounded
    if (!this.grounded && this.playerVel.y > 1.2) {
      return { allowed: false, steppedY: null };
    }

    const byShin = Math.floor(yShin);
    const stepTopY = byShin + 1;
    const maxStep = this.inShallowWater && stepTopY <= 2.05 ? 1.38 : 1.08;
    if (stepTopY - footY > maxStep) {
      return { allowed: false, steppedY: null };
    }

    const r = 0.26;
    const corners: ReadonlyArray<[number, number]> = [
      [nextX - r, nextZ - r],
      [nextX + r, nextZ - r],
      [nextX - r, nextZ + r],
      [nextX + r, nextZ + r],
    ];
    for (let i = 0; i < corners.length; i++) {
      const [px, pz] = corners[i];
      if (isSolidAtWorld(px, yShin, pz)) {
        if (!canAutoStepOntoBlock(Math.round(px), byShin, Math.round(pz))) {
          return { allowed: false, steppedY: null };
        }
      }
    }

    // Ensure full body & head clearance atop the stepped stair block
    if (
      this.hitsSolidWall(nextX, nextZ, stepTopY) ||
      this.hitsSolidAtSlice(nextX, stepTopY + 1.78, nextZ, 0.22) ||
      isSolidAtWorld(nextX, stepTopY + 1.78, nextZ)
    ) {
      return { allowed: false, steppedY: null };
    }

    return { allowed: true, steppedY: stepTopY };
  }

  private resolveIslandBoundary(): void {
    const inSwimBayX = Math.abs(this.playerPos.x) <= BEACH_SWIM_MAX_X;
    const inSwimWaterZ = this.playerPos.z >= BEACH_SWIM_START_Z;

    this.playerPos.x = THREE.MathUtils.clamp(
      this.playerPos.x,
      inSwimWaterZ ? BEACH_SWIM_MIN_X : CITY_BOUND_MIN_X,
      inSwimWaterZ ? BEACH_SWIM_MAX_X : CITY_BOUND_MAX_X,
    );

    const maxZ = inSwimBayX ? BEACH_SWIM_MAX_Z : CITY_SHORE_DEFAULT_MAX_Z;
    if (this.playerPos.z > maxZ) {
      this.playerPos.z = maxZ;
      if (this.playerVel.z > 0) this.playerVel.z = 0;
      if (inSwimBayX && this.simElapsed - this.lastSwimBoundaryToast > 2.4) {
        this.lastSwimBoundaryToast = this.simElapsed;
        this.onFurnitureToast?.('Swim buoy boundary — safe swimming lagoon!');
      }
    }
    if (this.playerPos.z < CITY_BOUND_MIN_Z) {
      this.playerPos.z = CITY_BOUND_MIN_Z;
      if (this.playerVel.z < 0) this.playerVel.z = 0;
    }

    const minY =
      inSwimBayX && inSwimWaterZ
        ? getLagoonFloorY(this.playerPos.x, this.playerPos.z)
        : PLAYABLE_MIN_Y;
    if (this.playerPos.y < minY) {
      this.playerPos.y = minY;
      if (this.playerVel.y < 0) this.playerVel.y = 0;
    }
  }

  private dampAngle(current: number, target: number, lambda: number, dt: number): number {
    const diff = ((((target - current) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return current + diff * (1 - Math.exp(-lambda * dt));
  }

  private pushHudSnapshot(horizSpeed: number, hasTargetBlock: boolean): void {
    if (!this.onHudUpdate) return;
    let gait: MovementGait = 'idle';
    if (!this.grounded && !this.inShallowWater) gait = 'jump';
    else if (horizSpeed > 4.6) gait = 'run';
    else if (horizSpeed > 0.35) gait = 'walk';

    const deg = ((THREE.MathUtils.radToDeg(-this.camYaw) % 360) + 360) % 360;
    const targetIsFixed = Boolean(
      this.currentTarget &&
        isFixedVoxel(
          this.currentTarget.gx,
          this.currentTarget.by,
          this.currentTarget.gz,
        ),
    );
    const inDanceClub =
      this.playerPos.x >= -67.5 &&
      this.playerPos.x <= -46.5 &&
      this.playerPos.z >= 2.5 &&
      this.playerPos.z <= 23.5;

    const inFurnitureShop =
      this.playerPos.x >= 72.5 &&
      this.playerPos.x <= 94.5 &&
      this.playerPos.z >= -14.5 &&
      this.playerPos.z <= 14.5;

    const houseMatch = findHouseAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);

    let nearbyActionLabel: string | null = null;
    let nearbyPlacedName: string | null = null;
    let nearbyIsMovable = false;
    let nearbyScreenX: number | null = null;
    let nearbyScreenY: number | null = null;
    if (this.interactingFurniture) {
      nearbyActionLabel = 'STAND UP';
      nearbyPlacedName = this.interactingFurniture.name;
      nearbyIsMovable = this.interactingFurniture.isMovable;
    } else if (this.nearbyTarget) {
      nearbyActionLabel = this.nearbyTarget.actionLabel;
      nearbyPlacedName = this.nearbyTarget.name;
      nearbyIsMovable = this.nearbyTarget.isMovable;
      _projVec.set(this.nearbyTarget.x, this.nearbyTarget.y + 1.05, this.nearbyTarget.z);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        nearbyScreenX = THREE.MathUtils.clamp(_projVec.x * 0.5 + 0.5, 0.18, 0.82);
        nearbyScreenY = THREE.MathUtils.clamp(-_projVec.y * 0.5 + 0.5, 0.18, 0.56);
      }
    }

    const placementDef = this.placementSession
      ? getItemDef(this.placementSession.itemId)
      : null;

    const activeCarPose = this.activeCarId
      ? this.carSystem.getCarPose(this.activeCarId)
      : null;

    let nearbyCarScreenX: number | null = null;
    let nearbyCarScreenY: number | null = null;
    if (!this.activeCarId && this.nearbyCar) {
      _projVec.set(this.nearbyCar.x, this.nearbyCar.y + 1.85, this.nearbyCar.z);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        nearbyCarScreenX = THREE.MathUtils.clamp(_projVec.x * 0.5 + 0.5, 0.16, 0.84);
        nearbyCarScreenY = THREE.MathUtils.clamp(-_projVec.y * 0.5 + 0.5, 0.16, 0.56);
      }
    }

    let nearbyChestScreenX: number | null = null;
    let nearbyChestScreenY: number | null = null;
    if (!this.activeCarId && this.nearbyChest) {
      _projVec.set(this.nearbyChest.x, this.nearbyChest.y + 1.15, this.nearbyChest.z);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        nearbyChestScreenX = THREE.MathUtils.clamp(_projVec.x * 0.5 + 0.5, 0.16, 0.84);
        nearbyChestScreenY = THREE.MathUtils.clamp(-_projVec.y * 0.5 + 0.5, 0.16, 0.56);
      }
    }

    this.onHudUpdate({
      gait,
      speedMs: horizSpeed,
      grounded: this.grounded,
      inShallowWater: this.inShallowWater,
      isUnderwater: this.isUnderwater,
      headingDeg: Math.round(deg),
      hasTargetBlock,
      targetIsFixed,
      cameraMode: this.cameraMode,
      playerX: this.playerPos.x,
      playerZ: this.playerPos.z,
      isDancing: this.isDancing,
      isFlying: this.isFlying,
      inDanceClub,
      danceMusicPlaying: this.danceMusic.isUserPlayEnabled(),
      danceMusicPowerOn: this.danceMusic.isMusicPowerOn(),
      danceTrackTitle: this.danceMusic.getCurrentTrack().title,
      danceVolume: this.danceMusic.getVolume(),
      inFurnitureShop,
      inHomeHouse: Boolean(houseMatch),
      currentHouseName: houseMatch?.house.name ?? null,
      placementMode: this.placementSession?.mode ?? 'none',
      placementItemName: placementDef?.name ?? null,
      placementValid: this.placementSession?.valid ?? true,
      placementReason: this.placementSession?.reason ?? null,
      interactingMode: this.interactingFurniture?.mode ?? 'none',
      nearbyActionLabel,
      nearbyPlacedId: this.interactingFurniture?.recordId ?? this.nearbyTarget?.id ?? null,
      nearbyPlacedName,
      nearbyIsMovable,
      nearbyScreenX,
      nearbyScreenY,
      inVehicle: Boolean(activeCarPose),
      vehicleName: activeCarPose?.name ?? null,
      vehicleSpeedKmh: activeCarPose ? Math.round(Math.abs(activeCarPose.speed) * 3.6) : 0,
      nearbyCarId: this.nearbyCar?.id ?? null,
      nearbyCarName: this.nearbyCar?.name ?? null,
      nearbyCarScreenX,
      nearbyCarScreenY,
      nearbyChestId: this.nearbyChest?.id ?? null,
      nearbyChestScreenX,
      nearbyChestScreenY,
      dayTimeSec: this.dayNightState.cycleTimeSec,
      dayTimeLabel: `${this.dayNightState.formattedClock} · ${this.dayNightState.phaseLabel}`,
      dayPhase: this.dayNightState.phase,
    });
  }

  private stepSimulation(dt: number): void {
    this.simElapsed += dt;
    this.dayCycleTimeSec = wrapCycleTime(this.dayCycleTimeSec + dt);
    this.applyDayNightLighting();

    // Easy HUD camera orbit control rotation around head and body
    if (this.cameraOrbitInput !== 0) {
      this.camYaw += this.cameraOrbitInput * 2.1 * this.settings.cameraSensitivity * dt;
    }

    // Combine virtual joystick and keyboard directional input
    let inX = this.joystick.x;
    let inY = this.joystick.y;

    let keyX = 0;
    let keyY = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) keyX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) keyX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) keyY += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) keyY -= 1;

    if (keyX !== 0 || keyY !== 0) {
      const len = Math.hypot(keyX, keyY);
      inX = keyX / len;
      inY = keyY / len;
    }

    const inputMag = Math.min(1, Math.hypot(inX, inY));
    if (inputMag > 0.15 && this.isDancing) {
      this.isDancing = false;
    }
    if ((inputMag > 0.25 || this.jumpBufferTimer > 0) && this.interactingFurniture) {
      this.stopFurnitureInteraction();
    }

    const shiftHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);

    const rawCurrSupportY = this.getFootprintSupportY(
      this.playerPos.x,
      this.playerPos.z,
      this.playerPos.y + 0.35,
    );
    const inSwimBayCurr =
      Math.abs(this.playerPos.x) <= BEACH_SWIM_MAX_X &&
      this.playerPos.z >= BEACH_SWIM_START_Z &&
      rawCurrSupportY <= 1.25;

    let targetSpeed = 0;
    if (inputMag > 0.08 && !this.interactingFurniture) {
      if (keyX !== 0 || keyY !== 0) {
        targetSpeed = shiftHeld || this.sprintToggle ? this.RUN_SPEED : this.WALK_SPEED * 1.15;
      } else if (this.sprintToggle) {
        targetSpeed = THREE.MathUtils.lerp(this.WALK_SPEED, this.RUN_SPEED, inputMag);
      } else if (inputMag < 0.62) {
        const t = (inputMag - 0.08) / (0.62 - 0.08);
        targetSpeed = THREE.MathUtils.lerp(1.4, this.WALK_SPEED, t);
      } else {
        const t = (inputMag - 0.62) / (1 - 0.62);
        targetSpeed = THREE.MathUtils.lerp(this.WALK_SPEED, this.RUN_SPEED, t);
      }
      if (this.speedBuffTimer > 0) {
        targetSpeed *= 1.28;
      }
      if (inSwimBayCurr) {
        targetSpeed = Math.min(targetSpeed, this.isUnderwater ? 3.8 : 3.6);
      }
    }

    // Camera-relative world movement direction:
    if (this.cameraMode === 'front') {
      _fwd.set(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    } else {
      _fwd.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    }
    _right.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    _moveDir.set(0, 0, 0).addScaledVector(_right, inX).addScaledVector(_fwd, inY);
    if (_moveDir.lengthSq() > 0.0001) {
      _moveDir.normalize();
    }

    let supportY = PLAYABLE_MIN_Y;
    let horizSpeed = 0;

    if (this.activeCarId) {
      // Combine on-screen driving pedals + steering with keyboard WASD/Arrow driving keys
      const keyThrottle = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0;
      const keyBrake =
        this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.keys.has('Space') ? 1 : 0;
      let keySteer = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) keySteer += 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) keySteer -= 1;

      const combinedControls: CarInputState = {
        throttle: Math.max(this.carControls.throttle, keyThrottle),
        brake: Math.max(this.carControls.brake, keyBrake),
        steer: THREE.MathUtils.clamp(
          keySteer !== 0 ? keySteer : this.carControls.steer,
          -1,
          1,
        ),
      };

      this.carSystem.update(dt, this.playerPos, true, this.activeCarId, combinedControls);

      const seat = this.carSystem.getDriverSeatPose(this.activeCarId);
      const carPose = this.carSystem.getCarPose(this.activeCarId);
      if (seat && carPose) {
        this.playerPos.set(seat.x, seat.y, seat.z);
        this.playerFacing = seat.yaw;
        supportY = seat.y;
        horizSpeed = Math.abs(carPose.speed);
        if (
          this.cameraMode === 'back' &&
          this.cameraOrbitInput === 0 &&
          this.simElapsed > this.carCamManualUntil &&
          Math.abs(carPose.speed) > 0.65
        ) {
          this.camYaw = this.dampAngle(this.camYaw, carPose.yaw - Math.PI, 3.6, dt);
        }
      }
      this.playerVel.set(0, 0, 0);
      this.grounded = true;
      this.inShallowWater = false;
      this.isUnderwater = false;
      this.playerRig.contactShadow.visible = false;
    } else {
      this.playerRig.contactShadow.visible = true;

      if (!this.interactingFurniture) {
        if (this.isFlying) {
          // Creative-mode free 3D flight with UP, DOWN, FORWARD, BACKWARD, LEFT, RIGHT & LAND
          let flySpeed = 0;
          if (inputMag > 0.08) {
            if (keyX !== 0 || keyY !== 0) {
              flySpeed =
                shiftHeld || this.sprintToggle ? this.FLY_SPRINT_SPEED : this.FLY_HORIZ_SPEED;
            } else if (this.sprintToggle) {
              flySpeed = THREE.MathUtils.lerp(5.0, this.FLY_SPRINT_SPEED, inputMag);
            } else {
              flySpeed = THREE.MathUtils.lerp(4.0, this.FLY_HORIZ_SPEED, inputMag);
            }
            if (this.speedBuffTimer > 0) {
              flySpeed *= 1.2;
            }
          }

          const targetVx = _moveDir.x * flySpeed;
          const targetVz = _moveDir.z * flySpeed;
          this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, 11, dt);
          this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, 11, dt);

          let keyFlyVert = 0;
          if (this.keys.has('Space')) keyFlyVert += 1;
          if (this.keys.has('KeyX') || this.keys.has('ControlLeft')) keyFlyVert -= 1;
          if (keyFlyVert !== 0) {
            this.isAutoLanding = false;
          }

          const verticalDir = this.flyVerticalInput !== 0 ? this.flyVerticalInput : keyFlyVert;
          const targetVy = this.isAutoLanding ? -9.5 : verticalDir * this.FLY_VERT_SPEED;
          this.playerVel.y = THREE.MathUtils.damp(this.playerVel.y, targetVy, 12, dt);

          // Axis-separated wall collision so the flying player cannot clip into buildings or walls
          const nextX = this.playerPos.x + this.playerVel.x * dt;
          if (!this.hitsSolidWall(nextX, this.playerPos.z, this.playerPos.y)) {
            this.playerPos.x = nextX;
          } else {
            this.playerVel.x = 0;
          }

          const nextZ = this.playerPos.z + this.playerVel.z * dt;
          if (!this.hitsSolidWall(this.playerPos.x, nextZ, this.playerPos.y)) {
            this.playerPos.z = nextZ;
          } else {
            this.playerVel.z = 0;
          }

          if (this.playerPos.y < 4.5) {
            this.npcSystem.resolvePlayerCollision(this.playerPos, 0.28);
            this.carSystem.resolvePlayerCollision(this.playerPos, 0.3);
          }
          this.resolveIslandBoundary();

          // Vertical flight integration with strict sky ceiling, solid roof & ground landing guards
          this.playerPos.y += this.playerVel.y * dt;
          if (this.playerPos.y > this.MAX_FLY_Y) {
            this.playerPos.y = this.MAX_FLY_Y;
            if (this.playerVel.y > 0) this.playerVel.y = 0;
          }

          if (this.playerVel.y > 0) {
            const headY = this.playerPos.y + 1.78;
            if (
              isSolidAtWorld(this.playerPos.x, headY, this.playerPos.z) ||
              this.hitsSolidAtSlice(this.playerPos.x, headY, this.playerPos.z, 0.22)
            ) {
              const ceilingBy = Math.floor(headY);
              this.playerPos.y = Math.min(this.playerPos.y, ceilingBy - 1.8);
              this.playerVel.y = 0;
            }
          }

          const rawSupportY = this.getFootprintSupportY(
            this.playerPos.x,
            this.playerPos.z,
            this.playerPos.y + 0.35,
          );
          const inSwimBayPost =
            Math.abs(this.playerPos.x) <= BEACH_SWIM_MAX_X &&
            this.playerPos.z >= BEACH_SWIM_START_Z &&
            rawSupportY <= 1.25;
          const seabedPostY = getLagoonFloorY(this.playerPos.x, this.playerPos.z);
          const minFloorY = inSwimBayPost ? seabedPostY : PLAYABLE_MIN_Y;
          supportY = Math.max(minFloorY, rawSupportY);

          if (this.playerPos.y <= supportY + 0.04) {
            this.playerPos.y = supportY;
            this.playerVel.y = 0;
            if (this.isAutoLanding || verticalDir < 0) {
              this.isFlying = false;
              this.isAutoLanding = false;
              this.flyVerticalInput = 0;
              this.grounded = true;
              this.inShallowWater = inSwimBayPost;
              this.isUnderwater = false;
              this.audio.playFlyToggle(false);
            } else {
              this.grounded = false;
              this.inShallowWater = false;
              this.isUnderwater = false;
            }
          } else {
            this.grounded = false;
            this.inShallowWater = false;
            this.isUnderwater = false;
          }

          this.resolveIslandBoundary();
        } else {
          const accel = inSwimBayCurr ? 8.5 : this.grounded ? 14 : 5.5;
          const targetVx = _moveDir.x * targetSpeed;
          const targetVz = _moveDir.z * targetSpeed;
          this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, accel, dt);
          this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, accel, dt);

          // Jump & Gravity / Surface Swim & Underwater Dive Buoyancy
          if (this.grounded || inSwimBayCurr) {
            this.coyoteTimer = 0.12;
          } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
          }
          this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

          if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            if (inSwimBayCurr && this.isUnderwater) {
              this.isUnderwater = false;
            }
            this.playerVel.y = inSwimBayCurr ? 4.4 : this.JUMP_VELOCITY;
            this.grounded = false;
            this.isDancing = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
          }

          if (!inSwimBayCurr) {
            this.playerVel.y += this.GRAVITY * dt;
          } else {
            const movingInWater = Math.hypot(this.playerVel.x, this.playerVel.z) > 0.28;
            const seabedY = getLagoonFloorY(this.playerPos.x, this.playerPos.z);
            if (this.isUnderwater) {
              const targetDiveY = THREE.MathUtils.clamp(
                seabedY + (movingInWater ? 0.36 : 0.28),
                seabedY + 0.08,
                SHALLOW_WATER_SURFACE_Y - 1.28,
              );
              this.playerVel.y += (targetDiveY - this.playerPos.y) * 10 * dt;
              this.playerVel.y *= Math.exp(-5.5 * dt);
            } else {
              const surfaceFloatY = Math.max(
                seabedY,
                movingInWater
                  ? SHALLOW_WATER_SURFACE_Y - 0.56
                  : SHALLOW_WATER_SURFACE_Y - 0.62,
              );
              this.playerVel.y += (surfaceFloatY - this.playerPos.y) * 14 * dt;
              this.playerVel.y *= Math.exp(-6.5 * dt);
            }
          }

          // Axis-separated 3D voxel wall collision + guarded stair / beach-shore auto-step
          const nextX = this.playerPos.x + this.playerVel.x * dt;
          const stepX = this.tryMoveWithStairStep(nextX, this.playerPos.z, this.playerPos.y);
          if (stepX.allowed) {
            this.playerPos.x = nextX;
            if (stepX.steppedY !== null) {
              this.playerPos.y = stepX.steppedY;
              this.playerVel.y = 0;
              this.grounded = true;
            }
          } else {
            this.playerVel.x = 0;
          }

          const nextZ = this.playerPos.z + this.playerVel.z * dt;
          const stepZ = this.tryMoveWithStairStep(this.playerPos.x, nextZ, this.playerPos.y);
          if (stepZ.allowed) {
            this.playerPos.z = nextZ;
            if (stepZ.steppedY !== null) {
              this.playerPos.y = stepZ.steppedY;
              this.playerVel.y = 0;
              this.grounded = true;
            }
          } else {
            this.playerVel.z = 0;
          }

          // Softly push player out of nearby NPCs & cars and clamp inside playable city boundaries
          this.npcSystem.resolvePlayerCollision(this.playerPos, 0.28);
          this.carSystem.resolvePlayerCollision(this.playerPos, 0.3);
          this.resolveIslandBoundary();

          // Vertical integration with strict ceiling & ground containment
          this.playerPos.y += this.playerVel.y * dt;

          if (this.playerVel.y > 0) {
            const headY = this.playerPos.y + 1.78;
            if (
              isSolidAtWorld(this.playerPos.x, headY, this.playerPos.z) ||
              this.hitsSolidAtSlice(this.playerPos.x, headY, this.playerPos.z, 0.22)
            ) {
              const ceilingBy = Math.floor(headY);
              this.playerPos.y = Math.min(this.playerPos.y, ceilingBy - 1.8);
              this.playerVel.y = 0;
            }
          }

          const rawSupportY = this.getFootprintSupportY(
            this.playerPos.x,
            this.playerPos.z,
            this.playerPos.y + 0.35,
          );
          const inSwimBayPost =
            Math.abs(this.playerPos.x) <= BEACH_SWIM_MAX_X &&
            this.playerPos.z >= BEACH_SWIM_START_Z &&
            rawSupportY <= 1.25;
          this.inShallowWater = inSwimBayPost;

          const seabedPostY = getLagoonFloorY(this.playerPos.x, this.playerPos.z);
          if (!inSwimBayPost || seabedPostY >= SHALLOW_WATER_SURFACE_Y - 0.72) {
            this.isUnderwater = false;
          }

          const minFloorY = inSwimBayPost ? seabedPostY : PLAYABLE_MIN_Y;
          supportY = Math.max(minFloorY, rawSupportY);

          if (this.playerPos.y <= supportY) {
            this.playerPos.y = supportY;
            this.playerVel.y = 0;
            this.grounded = true;
          } else if (inSwimBayPost) {
            this.grounded = true;
          } else if (this.playerPos.y > supportY + 0.08) {
            this.grounded = false;
          }

          this.resolveIslandBoundary();
        }
      } else {
        // Smooth glide into exact aligned chair / sofa / bed position without clipping
        this.inShallowWater = false;
        this.isUnderwater = false;
        this.playerPos.x = THREE.MathUtils.damp(this.playerPos.x, this.interactingFurniture.targetPos.x, 18, dt);
        this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, this.interactingFurniture.targetPos.y, 18, dt);
        this.playerPos.z = THREE.MathUtils.damp(this.playerPos.z, this.interactingFurniture.targetPos.z, 18, dt);
        this.playerFacing = this.dampAngle(this.playerFacing, this.interactingFurniture.targetFacing, 18, dt);
        this.playerVel.set(0, 0, 0);
        this.grounded = true;
        supportY = this.playerPos.y;
      }

      this.carSystem.update(dt, this.playerPos, false, null, this.carControls);

      // Character orientation per camera mode / pose
      horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      if (!this.interactingFurniture) {
        if (this.cameraMode === 'back') {
          this.playerFacing = this.camYaw + Math.PI;
        } else if (this.cameraMode === 'front') {
          this.playerFacing = this.camYaw;
        } else if (horizSpeed > 0.35) {
          const moveAngle = Math.atan2(this.playerVel.x, this.playerVel.z);
          this.playerFacing = this.dampAngle(this.playerFacing, moveAngle, 12, dt);
        }
      }
    }

    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.visualRoot.rotation.y = this.playerFacing;

    const heightAboveGround = Math.max(0, this.playerPos.y - supportY);
    this.playerRig.contactShadow.position.y = -heightAboveGround + 0.025;
    const shadowScale = Math.max(0.45, 1 - heightAboveGround * 0.16);
    this.playerRig.contactShadow.scale.setScalar(shadowScale);
    (this.playerRig.contactShadow.material as THREE.MeshBasicMaterial).opacity =
      (this.inShallowWater ? 0.32 : 0.68) * Math.max(0.25, 1 - heightAboveGround * 0.25);

    const poseMode: PlayerPoseMode = this.activeCarId
      ? 'sit'
      : this.interactingFurniture
        ? this.interactingFurniture.mode
        : this.isFlying
          ? 'fly'
          : this.inShallowWater
            ? this.isUnderwater
              ? 'dive'
              : 'swim'
            : this.isDancing
              ? 'dance'
              : 'normal';

    this.playerRig.updateAnimation(
      dt,
      this.activeCarId ? 0 : horizSpeed,
      this.isFlying ? this.FLY_SPRINT_SPEED : this.RUN_SPEED,
      this.grounded,
      this.playerVel.y,
      this.isDancing,
      0,
      poseMode,
    );

    // Animate placed & public furniture interaction pulses + nearby scan
    for (const handle of this.placedMeshes.values()) {
      handle.update(dt);
    }
    for (const handle of this.publicMeshes.values()) {
      handle.update(dt);
    }
    if (this.activeCarId) {
      this.nearbyTarget = null;
      this.nearbyCar = null;
      this.nearbyChest = null;
    } else {
      this.updateNearbyFurniture();
      this.nearbyCar =
        !this.interactingFurniture && !this.placementSession && !this.inShallowWater && !this.isFlying
          ? this.carSystem.findNearestEnterableCar(
              this.playerPos.x,
              this.playerPos.y,
              this.playerPos.z,
              3.8,
            )
          : null;
      this.nearbyChest =
        !this.interactingFurniture && !this.placementSession && !this.inShallowWater
          ? this.chestSystem.findNearestOpenableChest(
              this.playerPos.x,
              this.playerPos.y,
              this.playerPos.z,
              2.9,
            )
          : null;
    }

    // Update city NPCs, coastal ocean fish & waves, forest animals & flying birds, chests, Dance Club music proximity & DJ FX
    this.chestSystem.update(this.simElapsed, dt, this.playerPos);
    this.npcSystem.update(dt, this.playerPos.x, this.playerPos.z);
    this.oceanLife.update(this.simElapsed, dt, this.playerPos.x, this.playerPos.z);
    this.forestWildlife.update(
      this.simElapsed,
      dt,
      this.playerPos.x,
      this.playerPos.z,
      this.settings.soundEnabled,
    );
    this.danceMusic.updateClubProximity(this.playerPos.x, this.playerPos.z);
    const nearClubFx =
      this.playerPos.x >= -78 &&
      this.playerPos.x <= -34 &&
      this.playerPos.z >= -8 &&
      this.playerPos.z <= 34;
    this.danceClubStage.update(
      this.simElapsed,
      dt,
      this.danceMusic.isPlaying(),
      this.danceMusic.getCurrentBpm(),
      nearClubFx,
    );

    // Update attached third-person follow camera (compensate slightly in tall portrait so view never feels cropped)
    const portraitBoost =
      this.camera.aspect < 1
        ? THREE.MathUtils.clamp((1 - this.camera.aspect) * 18, 0, 12)
        : 0;
    const targetFov =
      portraitBoost +
      (this.activeCarId
        ? THREE.MathUtils.lerp(59, 68, THREE.MathUtils.clamp(horizSpeed / 16, 0, 1))
        : this.isFlying
          ? THREE.MathUtils.lerp(60, 66, THREE.MathUtils.clamp(horizSpeed / this.FLY_SPRINT_SPEED, 0, 1))
          : THREE.MathUtils.lerp(
              57,
              63,
              THREE.MathUtils.clamp(horizSpeed / this.RUN_SPEED, 0, 1),
            ));
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    this.applyCameraRig(dt, false);

    // Update automatic proximity doors, collectible world coins, crosshair raycast, breaking & particles
    this.updateProximityDoors();
    this.updateWorldCoins();
    const hasTargetBlock = this.activeCarId ? false : this.updateCrosshairAndBreaking(dt);
    if (this.activeCarId) {
      this.targetOutline.visible = false;
      this.crackMesh.visible = false;
    }
    this.updateDoorAnimations(dt);
    this.updateParticles(dt);

    // Periodically persist player position locally
    if (this.hasStartedGameplay && this.simElapsed - this.lastSaveStateTime > 1.5) {
      this.lastSaveStateTime = this.simElapsed;
      this.persistPlayerState();
    }

    // Throttled HUD telemetry snapshot (30fps when projecting nearby prompt or driving, 12.5fps otherwise)
    const hudInterval =
      this.nearbyTarget || this.nearbyCar || this.nearbyChest || this.activeCarId ? 0.033 : 0.08;
    if (this.onHudUpdate && this.simElapsed - this.lastHudPush > hudInterval) {
      this.lastHudPush = this.simElapsed;
      this.pushHudSnapshot(horizSpeed, hasTargetBlock);
    }
  }

  private updateWorldCoins(): void {
    let instanceCount = 0;
    const playerCenterY = this.playerPos.y + 0.9;

    for (let i = 0; i < WORLD_COIN_SPOTS.length; i++) {
      const spot = WORLD_COIN_SPOTS[i];
      if (this.collectedCoinSet.has(spot.id)) continue;

      const dx = spot.x - this.playerPos.x;
      const dz = spot.z - this.playerPos.z;
      const dy = Math.abs(spot.y - playerCenterY);
      if (dx * dx + dz * dz <= 1.56 && dy <= 1.35) {
        this.collectedCoinSet.add(spot.id);
        this.audio.unlock();
        this.audio.playCoinCollect();
        this.onCollectWorldCoin?.(spot.id, spot.value ?? WORLD_COIN_VALUE);
        continue;
      }

      const bobY = Math.sin(this.simElapsed * 3.1 + spot.id * 0.7) * 0.11;
      const spinY = this.simElapsed * 2.4 + spot.id * 0.5;
      _dummyObj.position.set(spot.x, spot.y + bobY, spot.z);
      _dummyObj.rotation.set(0, spinY, 0);
      _dummyObj.scale.setScalar(spot.value && spot.value >= 50 ? 1.24 : 1.0);
      _dummyObj.updateMatrix();
      this.worldCoinsMesh.setMatrixAt(instanceCount, _dummyObj.matrix);
      instanceCount++;
    }

    if (instanceCount > 0) {
      this.worldCoinsMesh.visible = true;
      this.worldCoinsMesh.count = instanceCount;
      this.worldCoinsMesh.instanceMatrix.needsUpdate = true;
    } else {
      this.worldCoinsMesh.visible = false;
      this.worldCoinsMesh.count = 0;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimeMs) / 1000));
      this.lastTimeMs = now;

      if (!this.paused) {
        this.stepSimulation(dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.persistPlayerState();
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    for (let i = 0; i < this.activeDoorAnims.length; i++) {
      this.activeDoorAnims[i].rig.dispose();
    }
    this.activeDoorAnims.length = 0;

    for (const handle of this.placedMeshes.values()) {
      handle.dispose();
    }
    this.placedMeshes.clear();
    for (const handle of this.publicMeshes.values()) {
      handle.dispose();
    }
    this.publicMeshes.clear();
    if (this.placementSession) {
      this.placementSession.ghost.dispose();
      this.placementSession = null;
    }

    this.islandEnv.dispose();
    this.cityLights.dispose();
    this.chestSystem.dispose();
    this.npcSystem.dispose();
    this.carSystem.dispose();
    this.oceanLife.dispose();
    this.forestWildlife.dispose();
    this.danceClubStage.dispose();
    this.danceMusic.dispose();
    this.playerRig.dispose();

    this.targetOutline.geometry.dispose();
    (this.targetOutline.material as THREE.Material).dispose();
    this.crackMesh.geometry.dispose();
    (this.crackMesh.material as THREE.Material).dispose();
    this.crackTex.dispose();
    this.particlesMesh.geometry.dispose();
    (this.particlesMesh.material as THREE.Material).dispose();
    this.worldCoinsMesh.geometry.dispose();
    (this.worldCoinsMesh.material as THREE.Material).dispose();

    this.envRT.dispose();
    this.audio.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
