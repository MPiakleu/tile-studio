# Tile Studio 1.3.0 — Validation evidence

**Date:** 28 October 2026

| Gate | Result | Evidence / qualification |
|---|---|---|
| Configuration/data TypeScript `--strict` compile | **PASS** | Global TypeScript compiler, DOM/ES2020 libraries; dependency-free `tests/core.entry.ts` |
| Node regression/unit suite | **PASS: 98/98** | `node --test tests/*.test.cjs` with global TypeScript core compiled to CommonJS; not the official npm/esbuild script |
| TS/TSX syntax parse | **PASS** | All 15 application TypeScript/TSX files parse without diagnostics |
| Link, normalization, migration, privacy, contrast, settings search | **PASS** | Included in offline 98-test suite; 1.3.0-specific tests exercise image privacy and navigation |
| Property change handler and native pane config shape | **PASS in mocked source tests** | 50 consecutive notifications; does not certify native SharePoint save/reload or Visibility rendering |
| Native production typecheck / ESLint / Heft build | **BLOCKED** | `npm ci --ignore-scripts --fetch-retries=0` failed: `EAI_AGAIN registry.npmjs.org` |
| `npm test` via esbuild | **NOT RUN** | `esbuild` was not available because dependencies could not be installed |
| Real React/SharePoint browser and axe checks | **NOT RUN** | Dependent on installation and accessible tenant/browser harness |
| Built `.sppkg` | **NOT GENERATED** | Requires `npm run package` to pass on a connected workstation |
| Live SharePoint/Teams host and permissions | **NOT TESTED** | Requires tenant and end-user/editor account access |

The offline suite was executed using the repository's test files and global `tsc` to compile dependency-free source. The standard project `npm test` uses esbuild and must be rerun when dependencies are installed.

Build on a connected Windows/Linux development workstation with Node 22.14+ and SPFx 1.23.2 by running:

```sh
npm ci
npm test
npm run build
npm run package
```

Then use [the 1.3.0 tenant acceptance checklist](V1.3.0-TENANT-ACCEPTANCE.md), especially repeat-edit save, native Visibility and keyboard/zoom checks, before production rollout.
