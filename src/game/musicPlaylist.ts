export interface DeveloperTrackMetadata {
  /** Exact filename inside src/assets/music/, e.g. 'club_anthem.mp3' */
  fileName: string;
  title?: string;
  artist?: string;
  bpm?: number;
}

export interface BundledDeveloperTrack {
  id: string;
  fileName: string;
  title: string;
  artist: string;
  bpm: number;
  url: string;
}

/**
 * DEVELOPER-ONLY PLAYLIST CONFIGURATION
 *
 * How to manage music inside Google AI Studio:
 * 1. Drop any number of .mp3 files into `src/assets/music/`.
 * 2. All .mp3 files in `src/assets/music/` are automatically bundled into the offline build.
 * 3. (Optional) List filenames below to customize track order, display title, artist, or BPM.
 *    Any extra .mp3 files in `src/assets/music/` not listed here are appended automatically.
 */
export const DEVELOPER_PLAYLIST_CONFIG: DeveloperTrackMetadata[] = [
  // Example:
  // { fileName: 'party_beat.mp3', title: 'Party Beat', artist: 'City DJ', bpm: 126 },
];

/**
 * When true, keeps built-in synthesized offline dance tracks active whenever
 * `src/assets/music/` has no .mp3 files yet (or appends them after custom developer MP3s).
 * Set to `false` once you add your own .mp3 files if you only want your custom tracks.
 */
export const INCLUDE_BUILTIN_OFFLINE_GROOVES_WHEN_EMPTY = true;

// Auto-discovers all developer music files in src/assets/music/ at build time for 100% offline playback.
const BUNDLED_AUDIO_MODULES = import.meta.glob<string>(
  '../assets/music/*.{mp3,MP3,wav,WAV,ogg,OGG,m4a,M4A}',
  {
    eager: true,
    import: 'default',
  },
);

function formatTitleFromFilename(fileName: string): string {
  const stem = fileName.replace(/\.[^/.]+$/, '');
  const spaced = stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return 'Club Track';
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getBundledDeveloperTracks(): BundledDeveloperTrack[] {
  const discoveredByFile = new Map<string, string>();
  for (const [modulePath, assetUrl] of Object.entries(BUNDLED_AUDIO_MODULES)) {
    if (typeof assetUrl !== 'string' || !assetUrl) continue;
    const parts = modulePath.split('/');
    const fileName = parts[parts.length - 1] ?? modulePath;
    discoveredByFile.set(fileName, assetUrl);
  }

  const ordered: BundledDeveloperTrack[] = [];
  const usedFiles = new Set<string>();

  // 1. Add tracks explicitly ordered by the developer in DEVELOPER_PLAYLIST_CONFIG
  for (const entry of DEVELOPER_PLAYLIST_CONFIG) {
    const url = discoveredByFile.get(entry.fileName);
    if (!url) continue;
    usedFiles.add(entry.fileName);
    ordered.push({
      id: `dev-${entry.fileName}`,
      fileName: entry.fileName,
      title: entry.title ?? formatTitleFromFilename(entry.fileName),
      artist: entry.artist ?? 'City DJ',
      bpm: entry.bpm ?? 124,
      url,
    });
  }

  // 2. Automatically append any remaining bundled files alphabetically
  const remainingFiles = Array.from(discoveredByFile.keys())
    .filter((f) => !usedFiles.has(f))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of remainingFiles) {
    const url = discoveredByFile.get(fileName);
    if (!url) continue;
    ordered.push({
      id: `dev-${fileName}`,
      fileName,
      title: formatTitleFromFilename(fileName),
      artist: 'City DJ',
      bpm: 124,
      url,
    });
  }

  return ordered;
}
