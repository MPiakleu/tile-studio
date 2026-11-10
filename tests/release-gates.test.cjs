'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const sp = require('../config/package-solution.json');

test('publishing always runs regression tests, zero-warning lint, a production build and Heft package', () => {
  const command = pkg.scripts.package;
  const stages = [
    'node scripts/prepare-package.mjs', 'npm run test', 'npm run lint',
    'npm run build', 'heft package-solution --production', 'node scripts/assert-package.mjs'
  ];
  assert.equal(stages.every(stage => command.includes(stage)), true);
  for (let i = 1; i < stages.length; i++) {
    assert.ok(command.indexOf(stages[i - 1]) < command.indexOf(stages[i]), `release gate order: ${stages[i]}`);
  }
  assert.match(pkg.scripts.lint, /--max-warnings\s+0/);
  assert.match(pkg.scripts.build, /heft build --clean --production/);
});

test('SPFx solution, feature, and npm package share the release version', () => {
  assert.equal(sp.solution.version, `${pkg.version}.0`);
  assert.equal(sp.solution.features[0].version, sp.solution.version);
  const lock = require('../package-lock.json');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('CI runs the same release command and checks compiled package contents', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows/spfx-release-check.yml'), 'utf8');
  assert.match(ci, /npm ci --no-audit --no-fund/);
  assert.match(ci, /npm run package/);
  assert.match(ci, /python3 tests\/verify-package\.py/);
  assert.match(ci, /if-no-files-found: error/);
});
