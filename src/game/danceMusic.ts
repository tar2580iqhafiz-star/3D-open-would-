import {
  getBundledDeveloperTracks,
  INCLUDE_BUILTIN_OFFLINE_GROOVES_WHEN_EMPTY,
} from './musicPlaylist';

export interface DanceTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  url: string;
  isObjectUrl: boolean;
}

interface TrackPattern {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  bassNotes: number[];
  leadNotes: number[];
  chordNotes: number[][];
  waveform: 'sawtooth' | 'square' | 'triangle';
}

const BUILTIN_OFFLINE_PATTERNS: TrackPattern[] = [
  {
    id: 'neon-pulse',
    title: 'Neon Pulse',
    artist: 'DJ Voxel',
    bpm: 124,
    bassNotes: [110, 110, 220, 110, 87.31, 87.31, 174.61, 87.31, 98, 98, 196, 98, 82.41, 82.41, 164.81, 123.47],
    leadNotes: [440, 0, 523.25, 659.25, 587.33, 0, 523.25, 440, 392, 0, 493.88, 587.33, 659.25, 587.33, 523.25, 493.88],
    chordNotes: [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [164.81, 196, 246.94],
    ],
    waveform: 'sawtooth',
  },
  {
    id: 'midnight-arcade',
    title: 'Midnight Arcade',
    artist: 'City Synth',
    bpm: 128,
    bassNotes: [130.81, 0, 261.63, 130.81, 98, 0, 196, 98, 110, 0, 220, 110, 87.31, 174.61, 87.31, 98],
    leadNotes: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99, 587.33, 659.25, 523.25, 440, 523.25, 698.46, 659.25, 587.33, 523.25],
    chordNotes: [
      [261.63, 329.63, 392],
      [196, 246.94, 293.66],
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
    ],
    waveform: 'square',
  },
  {
    id: 'starlight-groove',
    title: 'Starlight Groove',
    artist: 'Club Nova',
    bpm: 120,
    bassNotes: [146.83, 146.83, 0, 220, 116.54, 116.54, 0, 174.61, 130.81, 130.81, 0, 196, 110, 130.81, 146.83, 164.81],
    leadNotes: [587.33, 0, 698.46, 880, 783.99, 698.46, 587.33, 0, 659.25, 587.33, 523.25, 659.25, 587.33, 523.25, 440, 523.25],
    chordNotes: [
      [293.66, 349.23, 440],
      [233.08, 293.66, 349.23],
      [261.63, 329.63, 392],
      [220, 277.18, 329.63],
    ],
    waveform: 'triangle',
  },
];

function encodeWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function synthesizeDanceLoopUrl(pattern: TrackPattern): string {
  const sampleRate = 22050;
  const beatDur = 60 / pattern.bpm;
  const totalBeats = 16;
  const totalSamples = Math.floor(totalBeats * beatDur * sampleRate);
  const samples = new Float32Array(totalSamples);

  const stepDur = beatDur / 2;
  const totalSteps = 32;

  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatPos = t / beatDur;
    const beatFrac = beatPos - Math.floor(beatPos);
    const stepIdx = Math.min(totalSteps - 1, Math.floor(t / stepDur));
    const stepFrac = (t - stepIdx * stepDur) / stepDur;

    let kick = 0;
    if (beatFrac < 0.24) {
      const kEnv = Math.exp(-beatFrac * 24);
      const kFreq = 48 + 115 * Math.exp(-beatFrac * 35);
      kick = Math.sin(2 * Math.PI * kFreq * beatFrac * beatDur) * kEnv * 0.55;
    }

    let clap = 0;
    const isBackBeat = Math.floor(beatPos) % 2 === 1;
    if (isBackBeat && beatFrac < 0.18) {
      clap = nextRand() * Math.exp(-beatFrac * 28) * 0.24;
    }

    let hat = 0;
    if (beatFrac > 0.45 && beatFrac < 0.65) {
      const hEnv = Math.exp(-(beatFrac - 0.45) * 32);
      hat = nextRand() * hEnv * 0.1;
    }

    const bassFreq = pattern.bassNotes[stepIdx % pattern.bassNotes.length];
    let bass = 0;
    if (bassFreq > 0) {
      const bEnv = Math.exp(-stepFrac * 3.8);
      const phase = (t * bassFreq) % 1;
      const saw = phase * 2 - 1;
      const sub = Math.sin(2 * Math.PI * bassFreq * t);
      bass = (saw * 0.45 + sub * 0.55) * bEnv * 0.28;
    }

    const leadFreq = pattern.leadNotes[stepIdx % pattern.leadNotes.length];
    let lead = 0;
    if (leadFreq > 0) {
      const lEnv = Math.min(1, stepFrac * 14) * Math.exp(-stepFrac * 2.6);
      const p = (t * leadFreq) % 1;
      let osc = 0;
      if (pattern.waveform === 'square') {
        osc = p < 0.5 ? 0.8 : -0.8;
      } else if (pattern.waveform === 'sawtooth') {
        osc = (p * 2 - 1) * 0.85;
      } else {
        osc = 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
      }
      lead = osc * lEnv * 0.16;
    }

    const barIdx = Math.floor(beatPos / 4) % pattern.chordNotes.length;
    const chord = pattern.chordNotes[barIdx];
    const sidechain = Math.min(1, 0.3 + beatFrac * 1.15);
    let pad = 0;
    for (let c = 0; c < chord.length; c++) {
      pad += Math.sin(2 * Math.PI * chord[c] * t);
    }
    pad = (pad / chord.length) * sidechain * 0.11;

    const edgeFade = Math.min(1, i / 120, (totalSamples - 1 - i) / 120);
    samples[i] = Math.tanh((kick + clap + hat + bass + lead + pad) * 1.1) * edgeFade;
  }

  const blob = encodeWavBlob(samples, sampleRate);
  return URL.createObjectURL(blob);
}

/**
 * Developer-controlled Dance Club music playlist player.
 * Uses developer-bundled MP3 assets from `src/assets/music/` (`musicPlaylist.ts`),
 * falling back to built-in offline dance grooves if no custom MP3 files exist yet.
 * Players can ONLY control Play, Pause, Next, Previous, Volume, and Music ON/OFF.
 */
export class DanceMusicController {
  private audioEl: HTMLAudioElement | null = null;
  private tracks: DanceTrack[] = [];
  private currentIndex = 0;
  private musicPowerOn = true; // Explicit player Music ON/OFF switch
  private userPlayRequested = true; // Play vs Pause state
  private userVolume = 0.65;
  private clubProximity = 0; // 0 (outside) to 1 (inside Dance Club)
  private globalSoundEnabled = true;
  private initialized = false;
  private autoStartedForClub = false;
  private onStateChange?: () => void;

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange;
  }

  private ensureInitialized(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const developerTracks = getBundledDeveloperTracks();
    this.tracks = developerTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      bpm: t.bpm,
      url: t.url,
      isObjectUrl: false,
    }));

    if (
      this.tracks.length === 0 &&
      INCLUDE_BUILTIN_OFFLINE_GROOVES_WHEN_EMPTY
    ) {
      this.tracks = BUILTIN_OFFLINE_PATTERNS.map((p) => ({
        id: p.id,
        title: p.title,
        artist: p.artist,
        bpm: p.bpm,
        url: synthesizeDanceLoopUrl(p),
        isObjectUrl: true,
      }));
    }

    if (this.tracks.length === 0) return;

    const el = new Audio();
    el.preload = 'auto';
    el.loop = false;
    el.src = this.tracks[0].url;
    el.volume = 0;
    el.addEventListener('ended', () => {
      if (this.musicPowerOn) {
        this.nextTrack(true);
      }
    });
    this.audioEl = el;
  }

  public getCurrentTrack(): DanceTrack {
    if (this.tracks.length === 0) {
      const devFirst = getBundledDeveloperTracks()[0];
      if (devFirst) {
        return {
          id: devFirst.id,
          title: devFirst.title,
          artist: devFirst.artist,
          bpm: devFirst.bpm,
          url: devFirst.url,
          isObjectUrl: false,
        };
      }
      const fallback = BUILTIN_OFFLINE_PATTERNS[0];
      return {
        id: fallback.id,
        title: fallback.title,
        artist: fallback.artist,
        bpm: fallback.bpm,
        url: '',
        isObjectUrl: false,
      };
    }
    return this.tracks[this.currentIndex] ?? this.tracks[0];
  }

  public getCurrentBpm(): number {
    return this.getCurrentTrack().bpm || 124;
  }

  public isPlaying(): boolean {
    return Boolean(
      this.audioEl &&
        !this.audioEl.paused &&
        this.musicPowerOn &&
        this.userPlayRequested &&
        this.clubProximity > 0.02,
    );
  }

  public isUserPlayEnabled(): boolean {
    return this.musicPowerOn && this.userPlayRequested;
  }

  public isMusicPowerOn(): boolean {
    return this.musicPowerOn;
  }

  public getVolume(): number {
    return this.userVolume;
  }

  public setGlobalSoundEnabled(enabled: boolean): void {
    this.globalSoundEnabled = enabled;
    this.syncPlaybackAndVolume();
  }

  public setVolume(vol: number): void {
    this.userVolume = Math.max(0, Math.min(1, vol));
    this.syncPlaybackAndVolume();
    this.onStateChange?.();
  }

  public setMusicPower(on: boolean): void {
    this.musicPowerOn = on;
    if (!on) {
      this.userPlayRequested = false;
      if (this.audioEl) {
        this.audioEl.pause();
        try {
          this.audioEl.currentTime = 0;
        } catch {
          // Ignore seek errors if metadata not loaded
        }
      }
    } else {
      this.ensureInitialized();
      this.userPlayRequested = true;
      this.syncPlaybackAndVolume();
    }
    this.onStateChange?.();
  }

  public play(): void {
    this.ensureInitialized();
    this.musicPowerOn = true;
    this.userPlayRequested = true;
    this.syncPlaybackAndVolume();
    this.onStateChange?.();
  }

  public pause(): void {
    this.userPlayRequested = false;
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
    this.onStateChange?.();
  }

  public togglePlayPause(): void {
    if (this.musicPowerOn && this.userPlayRequested && this.audioEl && !this.audioEl.paused) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack(forcePlay = false): void {
    this.ensureInitialized();
    if (this.tracks.length === 0 || !this.audioEl) return;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    this.audioEl.src = this.tracks[this.currentIndex].url;
    this.audioEl.currentTime = 0;
    if (forcePlay) {
      this.musicPowerOn = true;
      this.userPlayRequested = true;
    }
    this.syncPlaybackAndVolume();
    this.onStateChange?.();
  }

  public prevTrack(forcePlay = false): void {
    this.ensureInitialized();
    if (this.tracks.length === 0 || !this.audioEl) return;
    this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    this.audioEl.src = this.tracks[this.currentIndex].url;
    this.audioEl.currentTime = 0;
    if (forcePlay) {
      this.musicPowerOn = true;
      this.userPlayRequested = true;
    }
    this.syncPlaybackAndVolume();
    this.onStateChange?.();
  }

  public updateClubProximity(playerX: number, playerZ: number): void {
    // Dance Club bounds: [-64, 6] to [-50, 20]
    const dxOut = Math.max(0, -64 - playerX, playerX - -50);
    const dzOut = Math.max(0, 6 - playerZ, playerZ - 20);
    const outsideDist = Math.hypot(dxOut, dzOut);

    const nextProx = outsideDist <= 0.1 ? 1 : Math.max(0, 1 - outsideDist / 5.5);

    if (nextProx > 0.15 && !this.autoStartedForClub) {
      this.autoStartedForClub = true;
      this.ensureInitialized();
    }

    if (Math.abs(nextProx - this.clubProximity) > 0.02 || (nextProx > 0 && !this.audioEl?.paused)) {
      this.clubProximity = nextProx;
      if (this.initialized) {
        this.syncPlaybackAndVolume();
      }
    } else {
      this.clubProximity = nextProx;
    }
  }

  public unlockAndSync(): void {
    if (this.clubProximity > 0.04 && this.musicPowerOn) {
      this.ensureInitialized();
      this.syncPlaybackAndVolume();
    }
  }

  private syncPlaybackAndVolume(): void {
    if (!this.audioEl) return;

    const effectiveVolume =
      this.globalSoundEnabled && this.musicPowerOn && this.userPlayRequested
        ? Math.max(0, Math.min(1, this.userVolume * this.clubProximity))
        : 0;

    this.audioEl.volume = effectiveVolume;

    const shouldPlay =
      this.globalSoundEnabled &&
      this.musicPowerOn &&
      this.userPlayRequested &&
      this.clubProximity > 0.04;

    if (shouldPlay) {
      if (this.audioEl.paused) {
        void this.audioEl.play().catch(() => {
          // Browser autoplay waits for next user tap/key press
        });
      }
    } else if (!this.audioEl.paused) {
      this.audioEl.pause();
    }
  }

  public dispose(): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.removeAttribute('src');
      this.audioEl = null;
    }
    for (const track of this.tracks) {
      if (track.isObjectUrl && track.url) {
        URL.revokeObjectURL(track.url);
      }
    }
    this.tracks = [];
  }
}
