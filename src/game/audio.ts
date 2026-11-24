import { VOXEL_ID, VoxelId } from './types';

// 100% offline procedural Web Audio synthesizer dedicated strictly to block breaking sounds

function isMasonryBlock(blockId: VoxelId): boolean {
  return (
    blockId === VOXEL_ID.STONE ||
    blockId === VOXEL_ID.MOSS_STONE ||
    blockId === VOXEL_ID.ASPHALT ||
    blockId === VOXEL_ID.ROAD_LINE ||
    blockId === VOXEL_ID.ROAD_LINE_EW ||
    blockId === VOXEL_ID.ROAD_EDGE_W ||
    blockId === VOXEL_ID.ROAD_EDGE_E ||
    blockId === VOXEL_ID.ROAD_EDGE_N ||
    blockId === VOXEL_ID.ROAD_EDGE_S ||
    blockId === VOXEL_ID.ROAD_CROSSWALK_NS ||
    blockId === VOXEL_ID.ROAD_CROSSWALK_EW ||
    blockId === VOXEL_ID.SIDEWALK ||
    blockId === VOXEL_ID.ROAD_DRAIN ||
    blockId === VOXEL_ID.BRICK ||
    blockId === VOXEL_ID.CONCRETE ||
    blockId === VOXEL_ID.WHITE_WALL ||
    blockId === VOXEL_ID.CREAM_WALL ||
    blockId === VOXEL_ID.MINT_WALL ||
    blockId === VOXEL_ID.SKY_WALL ||
    blockId === VOXEL_ID.CORAL_WALL ||
    blockId === VOXEL_ID.CHARCOAL_TRIM ||
    blockId === VOXEL_ID.TILE_FLOOR ||
    blockId === VOXEL_ID.SLATE_ROOF ||
    blockId === VOXEL_ID.RED_ROOF ||
    blockId === VOXEL_ID.STOVE ||
    blockId === VOXEL_ID.FRIDGE ||
    blockId === VOXEL_ID.TOILET ||
    blockId === VOXEL_ID.BATHTUB ||
    blockId === VOXEL_ID.SINK_COUNTER
  );
}

function isWoodBlock(blockId: VoxelId): boolean {
  return (
    blockId === VOXEL_ID.LOG ||
    blockId === VOXEL_ID.BIRCH_LOG ||
    blockId === VOXEL_ID.PINE_LOG ||
    blockId === VOXEL_ID.PLANKS ||
    blockId === VOXEL_ID.OAK_FLOOR ||
    blockId === VOXEL_ID.TABLE ||
    blockId === VOXEL_ID.KITCHEN_COUNTER ||
    blockId === VOXEL_ID.BOOKSHELF ||
    blockId === VOXEL_ID.BED_HEAD ||
    blockId === VOXEL_ID.BED_FOOT ||
    blockId === VOXEL_ID.DOOR_WOOD_CLOSED ||
    blockId === VOXEL_ID.DOOR_WOOD_OPEN ||
    blockId === VOXEL_ID.DOOR_WHITE_CLOSED ||
    blockId === VOXEL_ID.DOOR_WHITE_OPEN ||
    blockId === VOXEL_ID.DOOR_MINT_CLOSED ||
    blockId === VOXEL_ID.DOOR_MINT_OPEN ||
    blockId === VOXEL_ID.DOOR_SKY_CLOSED ||
    blockId === VOXEL_ID.DOOR_SKY_OPEN ||
    blockId === VOXEL_ID.DOOR_CORAL_CLOSED ||
    blockId === VOXEL_ID.DOOR_CORAL_OPEN
  );
}

function isFoliageAudio(blockId: VoxelId): boolean {
  return (
    blockId === VOXEL_ID.LEAVES ||
    blockId === VOXEL_ID.BIRCH_LEAVES ||
    blockId === VOXEL_ID.PINE_LEAVES ||
    blockId === VOXEL_ID.DARK_LEAVES ||
    blockId === VOXEL_ID.FLOWER_RED ||
    blockId === VOXEL_ID.FLOWER_YELLOW ||
    blockId === VOXEL_ID.TALL_GRASS ||
    blockId === VOXEL_ID.FERN_BUSH
  );
}

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public unlock(): void {
    if (!this.enabled) return;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.ctx && !this.noiseBuffer) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.45);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
  }

  public playBreakTick(blockId: VoxelId): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const isStone = isMasonryBlock(blockId);
    const isWood = isWoodBlock(blockId);
    const isLeaves = isFoliageAudio(blockId);
    const isGlass =
      blockId === VOXEL_ID.GLASS ||
      blockId === VOXEL_ID.TV_SCREEN ||
      blockId === VOXEL_ID.LAMP_BLOCK;
    const isSand = blockId === VOXEL_ID.SAND;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isGlass ? 'highpass' : 'bandpass';
    const baseFreq = isGlass
      ? 2600
      : isStone
        ? 1650
        : isWood
          ? 680
          : isLeaves
            ? 1250
            : isSand
              ? 1450
              : 820;
    filter.frequency.setValueAtTime(baseFreq + (Math.random() - 0.5) * 260, now);
    filter.Q.setValueAtTime(isGlass ? 2.2 : isStone ? 3.2 : isWood ? 2.4 : 1.5, now);

    const nGain = this.ctx.createGain();
    const peak = isGlass ? 0.08 : isStone ? 0.085 : isLeaves ? 0.07 : 0.09;
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.068);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    src.start(now, Math.random() * 0.22, 0.075);

    if (!isLeaves) {
      const osc = this.ctx.createOscillator();
      osc.type = isGlass ? 'sine' : isStone ? 'triangle' : 'sine';
      const tapFreq = isGlass
        ? 1650 + Math.random() * 380
        : isStone
          ? 620 + Math.random() * 140
          : isWood
            ? 240 + Math.random() * 45
            : 150 + Math.random() * 35;
      osc.frequency.setValueAtTime(tapFreq, now);
      osc.frequency.exponentialRampToValueAtTime(tapFreq * 0.55, now + 0.045);

      const tapGain = this.ctx.createGain();
      tapGain.gain.setValueAtTime(isGlass ? 0.05 : isStone ? 0.055 : 0.045, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(tapGain);
      tapGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    }
  }

  public playBlockBreak(blockId: VoxelId): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const isStone = isMasonryBlock(blockId);
    const isWood = isWoodBlock(blockId);
    const isLeaves = isFoliageAudio(blockId);
    const isGlass =
      blockId === VOXEL_ID.GLASS ||
      blockId === VOXEL_ID.TV_SCREEN ||
      blockId === VOXEL_ID.LAMP_BLOCK;
    const isSand = blockId === VOXEL_ID.SAND;

    // 1. Body resonance (or crystalline ping for glass)
    const bodyOsc = this.ctx.createOscillator();
    bodyOsc.type = isGlass ? 'sine' : isStone || isWood ? 'triangle' : 'sine';
    const startFreq = isGlass
      ? 2200
      : isStone
        ? 310
        : isWood
          ? 235
          : isLeaves
            ? 290
            : 185;
    const endFreq = isGlass ? 1150 : isStone ? 95 : isWood ? 78 : isLeaves ? 115 : 64;
    bodyOsc.frequency.setValueAtTime(startFreq + Math.random() * 40, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.11);

    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(isGlass ? 0.075 : isLeaves ? 0.065 : 0.13, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.13);

    // 2. Primary crisp crunch / shatter burst
    const crunch = this.ctx.createBufferSource();
    crunch.buffer = this.noiseBuffer;

    const crunchFilter = this.ctx.createBiquadFilter();
    crunchFilter.type = isGlass ? 'highpass' : 'bandpass';
    crunchFilter.frequency.setValueAtTime(
      isGlass
        ? 2900
        : isStone
          ? 1850
          : isWood
            ? 760
            : isLeaves
              ? 1450
              : isSand
                ? 1650
                : 920,
      now,
    );
    if (!isGlass) {
      crunchFilter.frequency.exponentialRampToValueAtTime(
        isStone ? 980 : isWood ? 420 : isLeaves ? 780 : 460,
        now + 0.14,
      );
    }
    crunchFilter.Q.setValueAtTime(isStone ? 1.8 : 1.05, now);

    const crunchGain = this.ctx.createGain();
    crunchGain.gain.setValueAtTime(0.001, now);
    crunchGain.gain.exponentialRampToValueAtTime(isGlass ? 0.14 : isStone ? 0.15 : 0.14, now + 0.006);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.155);

    crunch.connect(crunchFilter);
    crunchFilter.connect(crunchGain);
    crunchGain.connect(this.ctx.destination);
    crunch.start(now, Math.random() * 0.08, 0.17);

    // 3. Secondary debris / glass shard scatter tail
    const debris = this.ctx.createBufferSource();
    debris.buffer = this.noiseBuffer;

    const debrisFilter = this.ctx.createBiquadFilter();
    debrisFilter.type = isGlass || isStone || isSand ? 'highpass' : 'bandpass';
    debrisFilter.frequency.setValueAtTime(
      isGlass ? 3600 : isStone ? 2400 : isLeaves ? 1900 : isSand ? 2100 : 1250,
      now + 0.02,
    );
    debrisFilter.Q.setValueAtTime(1.4, now + 0.02);

    const debrisGain = this.ctx.createGain();
    debrisGain.gain.setValueAtTime(0.001, now + 0.018);
    debrisGain.gain.exponentialRampToValueAtTime(
      isGlass ? 0.11 : isStone ? 0.095 : isLeaves ? 0.075 : 0.065,
      now + 0.028,
    );
    debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    debris.connect(debrisFilter);
    debrisFilter.connect(debrisGain);
    debrisGain.connect(this.ctx.destination);
    debris.start(now + 0.018, 0.12 + Math.random() * 0.1, 0.14);
  }

  public playDoorToggle(opened: boolean): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;

    // 1. Classic Minecraft-style wooden door latch/thud
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const startFreq = opened ? 240 : 195;
    const endFreq = opened ? 340 : 112;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.085);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);

    // 2. Warm wooden panel knock / hinge swing
    const knock = this.ctx.createBufferSource();
    knock.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opened ? 740 : 560, now);
    filter.Q.setValueAtTime(2.1, now);

    const knockGain = this.ctx.createGain();
    knockGain.gain.setValueAtTime(0.001, now);
    knockGain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
    knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    knock.connect(filter);
    filter.connect(knockGain);
    knockGain.connect(this.ctx.destination);
    knock.start(now, Math.random() * 0.08, 0.12);
  }

  public playUiPop(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playItemCollect(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [660, 880];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.085);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.09);
    }
  }

  public playConsumableUse(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  public playCoinCollect(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [987.77, 1318.51];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.06;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.085, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    }
  }

  public playShopPurchase(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.05;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    }
  }

  public playFixedLocked(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.075;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i === 0 ? 190 : 155, start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.04, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.055);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.06);
    }
  }

  public playTeleport(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], start);
      osc.frequency.exponentialRampToValueAtTime(notes[i] * 1.06, start + 0.11);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    }
  }

  public playLocationDiscovered(): void {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.065, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.19);
    }
  }

  public playCarDoor(entering: boolean): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const thud = this.ctx.createOscillator();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(entering ? 150 : 125, now);
    thud.frequency.exponentialRampToValueAtTime(52, now + 0.09);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(now);
    thud.stop(now + 0.12);

    if (entering) {
      const rev = this.ctx.createOscillator();
      rev.type = 'sawtooth';
      rev.frequency.setValueAtTime(78, now + 0.06);
      rev.frequency.exponentialRampToValueAtTime(132, now + 0.22);
      rev.frequency.exponentialRampToValueAtTime(86, now + 0.34);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now + 0.06);

      const revGain = this.ctx.createGain();
      revGain.gain.setValueAtTime(0.001, now + 0.06);
      revGain.gain.exponentialRampToValueAtTime(0.06, now + 0.13);
      revGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      rev.connect(filter);
      filter.connect(revGain);
      revGain.connect(this.ctx.destination);
      rev.start(now + 0.06);
      rev.stop(now + 0.37);
    }
  }

  public playFlyToggle(flying: boolean): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(flying ? 320 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(flying ? 640 : 210, now + 0.16);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    const whoosh = this.ctx.createBufferSource();
    whoosh.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(flying ? 900 : 600, now);
    filter.frequency.exponentialRampToValueAtTime(flying ? 1600 : 320, now + 0.16);
    filter.Q.setValueAtTime(1.2, now);

    const wGain = this.ctx.createGain();
    wGain.gain.setValueAtTime(0.001, now);
    wGain.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    whoosh.connect(filter);
    filter.connect(wGain);
    wGain.connect(this.ctx.destination);
    whoosh.start(now, 0.02, 0.18);
  }

  public playAnimalSound(
    species:
      | 'goat'
      | 'cow'
      | 'deer'
      | 'horse'
      | 'rabbit'
      | 'sheep'
      | 'dinosaur'
      | 'parrot'
      | 'eagle'
      | 'songbird',
    volumeScale = 1,
  ): void {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const vol = Math.max(0.08, Math.min(1, volumeScale));
    const now = this.ctx.currentTime;

    if (species === 'cow') {
      // Deep warm bovine "moo"
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(138, now);
      osc.frequency.linearRampToValueAtTime(152, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(106, now + 0.62);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(480, now);
      lp.frequency.exponentialRampToValueAtTime(260, now + 0.62);
      lp.Q.setValueAtTime(2.6, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.095 * vol, now + 0.08);
      g.gain.setValueAtTime(0.085 * vol, now + 0.42);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.66);

      osc.connect(lp);
      lp.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.68);
      return;
    }

    if (species === 'sheep' || species === 'goat') {
      // Expressive bleat ("baa" / "maa") with rapid throat vibrato
      const isGoat = species === 'goat';
      const baseHz = isGoat ? 345 : 265;
      const dur = isGoat ? 0.42 : 0.5;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseHz, now);
      osc.frequency.exponentialRampToValueAtTime(baseHz * 0.82, now + dur);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(isGoat ? 26 : 19, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(isGoat ? 24 : 16, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isGoat ? 1150 : 880, now);
      bp.Q.setValueAtTime(2.0, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.085 * vol, now + 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(bp);
      bp.connect(g);
      g.connect(this.ctx.destination);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur + 0.02);
      osc.stop(now + dur + 0.02);
      return;
    }

    if (species === 'horse') {
      // Crisp whinny / neigh cascade
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.54);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(16, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(32, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1250, now);
      bp.Q.setValueAtTime(1.8, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.09 * vol, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.56);

      osc.connect(bp);
      bp.connect(g);
      g.connect(this.ctx.destination);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.58);
      osc.stop(now + 0.58);
      return;
    }

    if (species === 'deer') {
      // Soft woodland doe call / gentle forest bark
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(490, now);
      osc.frequency.exponentialRampToValueAtTime(610, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.34);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.07 * vol, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
      return;
    }

    if (species === 'rabbit') {
      // Gentle cute double squeak
      for (let i = 0; i < 2; i++) {
        const s = now + i * 0.1;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1320, s);
        osc.frequency.exponentialRampToValueAtTime(1760, s + 0.06);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, s);
        g.gain.exponentialRampToValueAtTime(0.045 * vol, s + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.075);

        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(s);
        osc.stop(s + 0.08);
      }
      return;
    }

    if (species === 'dinosaur') {
      // Resonant deep prehistoric bellow + breathy growl
      const sub = this.ctx.createOscillator();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(92, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 0.72);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(310, now);
      lp.frequency.exponentialRampToValueAtTime(140, now + 0.72);
      lp.Q.setValueAtTime(3.0, now);

      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0.001, now);
      sGain.gain.exponentialRampToValueAtTime(0.115 * vol, now + 0.08);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      sub.connect(lp);
      lp.connect(sGain);
      sGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.78);

      const growl = this.ctx.createBufferSource();
      growl.buffer = this.noiseBuffer;
      const gFilter = this.ctx.createBiquadFilter();
      gFilter.type = 'bandpass';
      gFilter.frequency.setValueAtTime(240, now);
      gFilter.Q.setValueAtTime(2.2, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.exponentialRampToValueAtTime(0.075 * vol, now + 0.1);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      growl.connect(gFilter);
      gFilter.connect(nGain);
      nGain.connect(this.ctx.destination);
      growl.start(now, 0.04, 0.4);
      return;
    }

    if (species === 'eagle') {
      // High soaring eagle screech
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2550, now);
      osc.frequency.exponentialRampToValueAtTime(1580, now + 0.44);

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2250, now);
      bp.Q.setValueAtTime(2.4, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.068 * vol, now + 0.035);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

      osc.connect(bp);
      bp.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
      return;
    }

    if (species === 'parrot') {
      // Cheerful tropical parrot double-squawk
      for (let i = 0; i < 2; i++) {
        const s = now + i * 0.15;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1320 + i * 160, s);
        osc.frequency.exponentialRampToValueAtTime(2150, s + 0.045);
        osc.frequency.exponentialRampToValueAtTime(1120, s + 0.11);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, s);
        g.gain.exponentialRampToValueAtTime(0.065 * vol, s + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.12);

        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(s);
        osc.stop(s + 0.13);
      }
      return;
    }

    // 'songbird': joyful three-note forest chirp
    const notes = [2150, 2720, 2420];
    for (let i = 0; i < notes.length; i++) {
      const s = now + i * 0.075;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], s);
      osc.frequency.exponentialRampToValueAtTime(notes[i] * 1.18, s + 0.045);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, s);
      g.gain.exponentialRampToValueAtTime(0.05 * vol, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.06);

      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(s);
      osc.stop(s + 0.065);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.noiseBuffer = null;
  }
}
