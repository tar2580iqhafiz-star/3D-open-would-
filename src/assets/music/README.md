# Developer-Only Dance Club Music Folder

Add, remove, replace, or rename `.mp3` music files in this folder (`src/assets/music/`) inside Google AI Studio.

- Every `.mp3` (and optional `.wav`, `.ogg`, `.m4a`) file placed here is **automatically discovered and bundled into the offline game build** by Vite (`src/game/musicPlaylist.ts`).
- Players cannot upload, import, or edit the playlist in the game—they can only use **Play**, **Pause**, **Next**, **Previous**, **Volume**, and **Music ON / OFF**.
- To customize song display names, artists, BPM (for Dance Club disco beat sync), or track order, edit `DEVELOPER_PLAYLIST_CONFIG` in `src/game/musicPlaylist.ts`.
