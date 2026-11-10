/** Fail the release unless Heft actually generated a nonempty SPFx package. */
import { existsSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'sharepoint', 'solution', 'imberon-tile-studio.sppkg');
if (!existsSync(path) || statSync(path).size < 22) {
  console.error(`RELEASE BLOCKED: Missing or empty SPFx package: ${path}`);
  process.exit(1);
}
const fd = openSync(path, 'r');
const header = Buffer.alloc(4);
try { readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
if (!header.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
  console.error(`RELEASE BLOCKED: Expected a ZIP-format .sppkg file: ${path}`);
  process.exit(1);
}
console.log(`RELEASE PACKAGE VERIFIED: ${path} (${statSync(path).size} bytes)`);
