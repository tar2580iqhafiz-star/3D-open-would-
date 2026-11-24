import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist');
const androidAssetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');

const distIndex = path.join(distDir, 'index.html');
if (!fs.existsSync(distIndex)) {
  console.error('[sync-android-assets] Missing dist/index.html. Run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(androidAssetsDir, { recursive: true, force: true });
fs.mkdirSync(androidAssetsDir, { recursive: true });
fs.cpSync(distDir, androidAssetsDir, { recursive: true });

const copiedIndex = path.join(androidAssetsDir, 'index.html');
if (!fs.existsSync(copiedIndex)) {
  console.error('[sync-android-assets] Verification failed: android/app/src/main/assets/index.html missing.');
  process.exit(1);
}

const copiedEntries = fs.readdirSync(androidAssetsDir);
console.log(
  `[sync-android-assets] Synced Vite production bundle (${copiedEntries.join(', ')}) -> android/app/src/main/assets/`
);
