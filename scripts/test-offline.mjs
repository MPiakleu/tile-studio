/**
 * Offline regression fallback: compiles only dependency-free modules and runs
 * the Node tests without esbuild, Heft, SharePoint, or a browser.
 * This does NOT replace the production SPFx build or tenant validation.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
let tscExecutable;
try { tscExecutable = require.resolve('typescript/bin/tsc'); } catch { /* global tsc fallback */ }
const compilation = tscExecutable
  ? spawnSync(process.execPath, [tscExecutable, '--target', 'ES2020', '--module', 'commonjs', '--lib', 'ES2020,DOM', '--skipLibCheck', '--esModuleInterop', '--rootDir', '.', '--outDir', '.test-build', 'tests/core.entry.ts'], { stdio: 'inherit' })
  : spawnSync('tsc', ['--target', 'ES2020', '--module', 'commonjs', '--lib', 'ES2020,DOM', '--skipLibCheck', '--esModuleInterop', '--rootDir', '.', '--outDir', '.test-build', 'tests/core.entry.ts'], { stdio: 'inherit' });
if (compilation.error || compilation.status !== 0) {
  console.error('Offline TypeScript compilation failed. Install TypeScript 5.8.x or run npm ci.');
  process.exit(1);
}
mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/core.cjs', "module.exports = require('./tests/core.entry.js');\n");
const tests = readdirSync('tests').filter(file => file.endsWith('.test.cjs')).sort().map(file => `tests/${file}`);
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(result.status ?? 1);
