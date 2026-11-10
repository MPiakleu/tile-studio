/** Prevent stale .sppkg files from being mistaken for a successful new build. */
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
rmSync(join(root, 'sharepoint', 'solution', 'imberon-tile-studio.sppkg'), { force: true });
console.log('Removed any previously generated Tile Studio .sppkg before release validation.');
