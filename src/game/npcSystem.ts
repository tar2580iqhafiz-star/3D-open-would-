import * as THREE from 'three';
import {
  CharacterColorStyle,
  createPlayerRig,
  NPC_CHARACTER_STYLES,
  PlayerRig,
} from './player';
import { getSafeGroundSupportY, isSolidAtWorld } from './terrain';

interface NpcDefinition {
  id: string;
  x: number;
  z: number;
  facing: number;
  behavior: 'dance' | 'dj' | 'patrol' | 'idle';
  patrolAxis?: 'x' | 'z';
  patrolRange?: number;
  speed?: number;
  styleIndex: number;
  phaseOffset: number;
}

interface NpcActor {
  def: NpcDefinition;
  rig: PlayerRig;
  pos: THREE.Vector3;
  facing: number;
  patrolDir: 1 | -1;
  pauseTimer: number;
  walkDistance: number;
}

const NPC_DEFINITIONS: NpcDefinition[] = [
  // Dance Club: DJ + 4 automatic beat dancers!
  {
    id: 'dj-neon',
    x: -62.4,
    z: 13,
    facing: Math.PI / 2,
    behavior: 'dj',
    styleIndex: 0,
    phaseOffset: 0,
  },
  {
    id: 'club-dancer-1',
    x: -57.2,
    z: 11.2,
    facing: -Math.PI / 2,
    behavior: 'dance',
    styleIndex: 1,
    phaseOffset: 0.4,
  },
  {
    id: 'club-dancer-2',
    x: -54.6,
    z: 14.8,
    facing: -Math.PI * 0.65,
    behavior: 'dance',
    styleIndex: 2,
    phaseOffset: 1.3,
  },
  {
    id: 'club-dancer-3',
    x: -58.4,
    z: 15.2,
    facing: -Math.PI * 0.35,
    behavior: 'dance',
    styleIndex: 3,
    phaseOffset: 2.1,
  },
  {
    id: 'club-dancer-4',
    x: -54.2,
    z: 11.4,
    facing: -Math.PI * 0.55,
    behavior: 'dance',
    styleIndex: 4,
    phaseOffset: 3.0,
  },

  // Central Plaza & Park
  {
    id: 'park-stroller',
    x: 6.5,
    z: 7.5,
    facing: 0,
    behavior: 'patrol',
    patrolAxis: 'x',
    patrolRange: 3.2,
    speed: 1.5,
    styleIndex: 2,
    phaseOffset: 0.7,
  },
  {
    id: 'avenue-walker-west',
    x: -3.2,
    z: -8,
    facing: Math.PI,
    behavior: 'patrol',
    patrolAxis: 'z',
    patrolRange: 9.0,
    speed: 1.75,
    styleIndex: 3,
    phaseOffset: 1.1,
  },
  {
    id: 'avenue-walker-east',
    x: 3.2,
    z: 12,
    facing: 0,
    behavior: 'patrol',
    patrolAxis: 'z',
    patrolRange: 8.5,
    speed: 1.65,
    styleIndex: 1,
    phaseOffset: 1.9,
  },

  // School & Police Civic Campus
  {
    id: 'school-student',
    x: -14,
    z: -51.2,
    facing: Math.PI / 2,
    behavior: 'patrol',
    patrolAxis: 'x',
    patrolRange: 6.5,
    speed: 1.6,
    styleIndex: 3,
    phaseOffset: 0.5,
  },
  {
    id: 'police-officer',
    x: 33,
    z: -51.4,
    facing: 0,
    behavior: 'idle',
    styleIndex: 5,
    phaseOffset: 1.4,
  },

  // East Market & Shopping Mall
  {
    id: 'coffee-patron',
    x: 47.6,
    z: -12,
    facing: -Math.PI / 2,
    behavior: 'idle',
    styleIndex: 4,
    phaseOffset: 2.3,
  },
  {
    id: 'mall-shopper',
    x: 70.5,
    z: 0,
    facing: 0,
    behavior: 'patrol',
    patrolAxis: 'z',
    patrolRange: 4.5,
    speed: 1.55,
    styleIndex: 1,
    phaseOffset: 2.8,
  },

  // South Coast Beach Boardwalk
  {
    id: 'beach-walker',
    x: 0,
    z: 141,
    facing: Math.PI,
    behavior: 'patrol',
    patrolAxis: 'z',
    patrolRange: 8.0,
    speed: 1.5,
    styleIndex: 4,
    phaseOffset: 0.9,
  },
  {
    id: 'beach-dancer',
    x: -4.2,
    z: 136,
    facing: Math.PI * 0.85,
    behavior: 'dance',
    styleIndex: 2,
    phaseOffset: 1.7,
  },
];

export interface NpcSystem {
  group: THREE.Group;
  update: (dt: number, playerX: number, playerZ: number) => void;
  resolvePlayerCollision: (playerPos: THREE.Vector3, playerRadius: number) => void;
  dispose: () => void;
}

export function createNpcSystem(atlasTex: THREE.CanvasTexture): NpcSystem {
  const group = new THREE.Group();
  const actors: NpcActor[] = [];

  for (let i = 0; i < NPC_DEFINITIONS.length; i++) {
    const def = NPC_DEFINITIONS[i];
    const style: CharacterColorStyle =
      NPC_CHARACTER_STYLES[def.styleIndex % NPC_CHARACTER_STYLES.length];
    const rig = createPlayerRig(atlasTex, {
      style,
      showHeldBlock: false,
      castShadow: false,
    });

    const groundY = getSafeGroundSupportY(def.x, def.z);
    const pos = new THREE.Vector3(def.x, groundY, def.z);
    rig.root.position.copy(pos);
    rig.visualRoot.rotation.y = def.facing;
    group.add(rig.root);

    actors.push({
      def,
      rig,
      pos,
      facing: def.facing,
      patrolDir: 1,
      pauseTimer: 0,
      walkDistance: 0,
    });
  }

  const hitsWallOrObstacle = (x: number, y: number, z: number): boolean => {
    const r = 0.26;
    return (
      isSolidAtWorld(x - r, y + 0.35, z - r) ||
      isSolidAtWorld(x + r, y + 0.35, z - r) ||
      isSolidAtWorld(x - r, y + 0.35, z + r) ||
      isSolidAtWorld(x + r, y + 0.35, z + r) ||
      isSolidAtWorld(x - r, y + 1.15, z - r) ||
      isSolidAtWorld(x + r, y + 1.15, z + r)
    );
  };

  const update = (dt: number, playerX: number, playerZ: number) => {
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      const dx = a.pos.x - playerX;
      const dz = a.pos.z - playerZ;
      const distSq = dx * dx + dz * dz;

      // Skip animation math for very distant NPCs (> 58m) to keep 4GB RAM Android smooth
      if (distSq > 3364) {
        a.rig.root.visible = false;
        continue;
      }
      a.rig.root.visible = true;

      let speedNow = 0;
      const isDancing = a.def.behavior === 'dance' || a.def.behavior === 'dj';

      if (a.def.behavior === 'patrol') {
        if (a.pauseTimer > 0) {
          a.pauseTimer = Math.max(0, a.pauseTimer - dt);
        } else {
          const speed = a.def.speed ?? 1.6;
          const step = speed * dt * a.patrolDir;
          const nextX = a.def.patrolAxis === 'x' ? a.pos.x + step : a.pos.x;
          const nextZ = a.def.patrolAxis === 'z' ? a.pos.z + step : a.pos.z;
          const range = a.def.patrolRange ?? 5;
          const offsetFromAnchor =
            a.def.patrolAxis === 'x' ? nextX - a.def.x : nextZ - a.def.z;

          if (
            Math.abs(offsetFromAnchor) > range ||
            hitsWallOrObstacle(nextX, a.pos.y, nextZ)
          ) {
            a.patrolDir = a.patrolDir === 1 ? -1 : 1;
            a.pauseTimer = 1.2 + (i % 3) * 0.45;
          } else {
            a.pos.x = nextX;
            a.pos.z = nextZ;
            a.pos.y = getSafeGroundSupportY(a.pos.x, a.pos.z);
            speedNow = speed;
            a.facing =
              a.def.patrolAxis === 'x'
                ? a.patrolDir > 0
                  ? Math.PI / 2
                  : -Math.PI / 2
                : a.patrolDir > 0
                  ? 0
                  : Math.PI;
          }
        }
      } else if (a.def.behavior === 'dj') {
        // DJ subtle head/shoulder sway behind booth
        a.facing = a.def.facing + Math.sin(dt * 0.5) * 0.01;
      }

      a.rig.root.position.copy(a.pos);
      a.rig.visualRoot.rotation.y = a.facing;
      a.rig.updateAnimation(
        dt,
        speedNow,
        3.5,
        true,
        0,
        isDancing,
        a.def.phaseOffset,
      );
    }
  };

  const resolvePlayerCollision = (playerPos: THREE.Vector3, playerRadius: number) => {
    const minDist = playerRadius + 0.34;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      if (Math.abs(playerPos.y - a.pos.y) > 1.65) continue;
      const dx = playerPos.x - a.pos.x;
      const dz = playerPos.z - a.pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > 0.0001 && dSq < minDistSq) {
        const d = Math.sqrt(dSq);
        const push = minDist - d;
        playerPos.x += (dx / d) * push;
        playerPos.z += (dz / d) * push;
      }
    }
  };

  const dispose = () => {
    for (let i = 0; i < actors.length; i++) {
      actors[i].rig.dispose();
    }
    actors.length = 0;
  };

  return { group, update, resolvePlayerCollision, dispose };
}
