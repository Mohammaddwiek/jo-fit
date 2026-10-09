// Copies the MediaPipe WASM runtime into public/ so the tracker works without a CDN.
import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const target = join(root, 'public', 'mediapipe', 'wasm');

if (!existsSync(source)) {
  console.warn(`[copy-mediapipe] ${source} not found; skipping.`);
  process.exit(0);
}

cpSync(source, target, { recursive: true });
console.log(`[copy-mediapipe] Copied MediaPipe WASM to ${target}`);
