# Tile Studio release gates — mandatory for every future handoff

## Why this exists

The v1.4.0 modularization handoff passed offline tests but the real `npm run package` on the customer's development machine reported eight ESLint warnings and a blocking `@typescript-eslint/no-use-before-define` error. Offline TypeScript and unit tests do **not** execute the SPFx/ESLint rig. Release readiness must be proven with the actual build and not inferred from source parsing.

## Automated contract

Run from the project root on Node 22.14+:

```powershell
npm ci
npm run package
```

The `package` command first removes an existing `.sppkg` so a previous artifact cannot be mistaken for a new release. It must pass **every stage**: Node tests (esbuild), `eslint "src/**/*.{ts,tsx}" --max-warnings 0`, clean production Heft/TypeScript/Webpack build, Heft package-solution, and package presence/ZIP header check. Exit nonzero at the first failure. `Build.ps1` delegates to this command.

CI: `.github/workflows/spfx-release-check.yml` applies the same gates to every PR/push. In GitHub branch protection / rulesets, require the check **SPFx production package** before merging. CI additionally runs `python3 tests/verify-package.py` for ZIP integrity, embedded manifests, versions, relationships, assets and permissions. The pipeline's archive artifact contains the generated package only when checks pass.

## Handoff evidence template

- Node and npm versions, `npm ci`: PASS/FAIL/BLOCKED
- Tests: count, PASS/FAIL/BLOCKED
- ESLint zero warnings: PASS/FAIL/BLOCKED
- Heft production build: PASS/FAIL/BLOCKED
- `.sppkg` packaging: PASS/FAIL/BLOCKED, package name/size/hash when present
- Browser/keyboard/responsive/a11y: PASS/FAIL/NOT TESTED
- SharePoint tenant save/reload, editor, permissions: PASS/FAIL/NOT TESTED
- Source ZIP verified: PASS/FAIL

**Any BLOCKED/NOT TESTED production build gate = source-only handoff; no verified `.sppkg` claim.** CI green and lint clean do not certify actual SharePoint tenant behavior.

## Developer workflow

Run `npm run lint` and `npm test` after each code edit. Run `npm run package` on the **same exact code** before making any source ZIP. Do not silence lint failures globally or use temporary shims to represent production verification. Where a specific external API contract forces a lint exception, document it narrowly at the declaration. Keep native SPFx versions pinned to the lockfile.

## Mandatory live-preview/persistence integration gate (v1.4.3+)

The v1.4.2 release passed 111 offline unit tests but failed the user-critical workflow: editor changes did not appear in the SharePoint page preview or persist after saving. The test suite now drives a representative setting through the custom-property-pane callback, preview render and simulated serialization. **That does not replace actual tenant validation.**

Before calling a release deployable, test an actual SharePoint page in edit mode: change a heading, tile and appearance setting, verify **immediate page preview**, choose **Done editing**, save/publish, hard reload and verify the **final** edit. Repeat after reopening the pane, including 20+ consecutive changes, and check the native Visibility group does not duplicate. Record tenant test results and environment. If tenant access is unavailable, mark **tenant behavior unverified** and deliver source-only/build-verified artifacts as applicable. See [v1.4.3 Acceptance](V1.4.3-LIVE-PREVIEW-PERSISTENCE.md).


## v1.4.4 additional release checks — do not regress the property-pane lifecycle

SharePoint invokes `onPropertyPaneConfigurationComplete` after an idle timeout even while the pane is open; it must **not** be treated as an unconditional React unmount. Keep `tests/property-pane-lifecycle.test.cjs` covering edit → idle completion(s) → more edits → genuine close and re-open. For the real staging site, leave the property pane untouched for at least 10–15 seconds after every settings change, then verify it remains editable and saves correctly.

All ten layouts must visibly work with both the classic/legacy and modern composed renderers. `tests/layout-contract.test.cjs` covers distinct structural profiles and composed CSS selectors; `tests/browser.cjs` additionally exercises the five reported layout buttons and compares computed properties. Browser tests require an installed Playwright runtime and Chromium. The default package pipeline cannot substitute for tenant lifecycle tests.
