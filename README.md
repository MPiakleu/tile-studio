# Imberon Tile Studio v1.4.5 — SharePoint Framework web part

An enterprise-ready **tile designer** with 10 layouts, seven composition templates, and a native SharePoint property-pane editor. It supports manual tiles, read-only SharePoint list content, responsive layouts, design presets and safely validated links/images.

**Release status: source-only; native ESLint/Heft and live SharePoint tenant validation are unverified.** Version 1.4.5 fixes the v1.4.4 SPFx property-pane compile error (TS2554) and adds a regression guard for the API method arity. All existing v1.4.4 layout/editor changes are retained. Run the production pipeline on a machine with SPFx dependencies before deployment.

## 1.4.5: SPFx property-pane API compile fix

- Replaced `this.context.propertyPane.isPropertyPaneOpen(this.instanceId)` with the supported zero-argument `isPropertyPaneOpen()` call in `TileStudioWebPart.ts`.
- Updated the editor lifecycle test double to throw if the method receives an argument, avoiding this specific regression in future offline runs.
- Preserved the v1.4.4 idle-editor and layout fixes without changes to saved configuration or permissions.
- See [v1.4.5 release notes](docs/V1.4.5-API-COMPILE-FIX.md).

## 1.4.4: editor idle lifecycle and truly distinct layouts

- **Editor stability:** `onPropertyPaneConfigurationComplete()` can run after a few seconds of inactivity even while the property pane remains open. We previously unmounted the editor and cleared its session on every completion. We now use the supported `propertyPane.isPropertyPaneOpen(instanceId)` API; an idle completion leaves the editor, selected tab, draft and change callback intact. Cleanup only happens on actual close or disposal.
- **Layout fidelity:** all ten layout presets now style the newer composed renderer, not only legacy `cardInner` markup. Compact Tiles, Resource List, Icon Grid, Minimal Links and Action Cards have distinct structures; status/featured/KPI cards also receive matching composed styles. Resource List and Minimal Links get full-width rows; mobile row modes wrap instead of overflowing.
- **Unified gallery/editor:** a shared `layoutSelectionPatch` is used when selecting a layout in SharePoint and in the local gallery. Selecting a layout applies its structural defaults (columns, spacing, height, icon arrangement, etc.), while retaining tile content, data sources, colors, link behavior, composition templates and per-tile overrides. Previously, the gallery applied these settings but the real editor didn't. If you manually customized structural sizes, choosing a new layout intentionally replaces those particular sizes; you can customize them again afterward.
- **Error recovery:** the settings editor now has its own error boundary with an accessible retry action instead of a blank property pane.
- **Regression coverage:** tests simulate repeated idle-completion events and verify that editing continues, ensure distinct layout profiles and composed-specific CSS, and check that gallery and native selector share the same settings. Browser integration tests now exercise the five reported layout buttons against computed styles, but running them requires installing dependencies.

See [v1.4.4 root-cause analysis and test plan](docs/V1.4.4-LAYOUT-AND-EDITOR-REPAIR.md). No new Graph scopes, backend, SharePoint list schema or saved configuration migration are required.

## 1.4.3: live preview and SharePoint save lifecycle repair

The 1.4.2 custom editor invoked `onPropertyPaneFieldChanged` without notifying the native custom property-pane `changeCallback`, and no longer explicitly called `render()` after edits. This could leave the page unmarked as changed and its preview stale. Version 1.4.3 fixes both paths:

- Notify SharePoint's currently mounted **custom-field change callback before replacing the previous property-bag value**, then synchronize `properties.config` with the normalized configuration.
- Explicitly repaint the live web part and editor after each semantic change; don't assume a particular SharePoint callback will render the page.
- Preserve edits made while SharePoint replaces the custom-field host, retrying the newest pending change after reattachment.
- Keep the stable editor key, lifecycle cleanup, existing stored properties, and supported native Visibility controls.
- Add regression tests for the actual mounted React editor → notification → visible preview → serialization path, plus rapid consecutive changes, callback replacement, save/reload, and callback failures.

**Important:** Earlier SharePoint hosts exhibited duplicated native Visibility controls after repeated callback notifications. The v1.4.3 solution uses fresh configuration arrays and retains supported APIs, but only **staging-tenant testing** can verify that the host does not repeat this issue. See [v1.4.3 release notes and tenant acceptance](docs/V1.4.3-LIVE-PREVIEW-PERSISTENCE.md). No new permissions or config migration are necessary.

**Validation:** 117/117 offline Node regression tests passed. `npm ci` failed with npm registry DNS `EAI_AGAIN`, so ESLint, Heft, `.sppkg` creation, and actual SharePoint save/reload have **not** been verified here. This ZIP is source-only, not a production-certified release.

## 1.4.2: retry timer lint correction

- `services/listData.ts`: retry-backoff timer is now initialized with `const` before its cancellation callback, satisfying both ESLint's `prefer-const` and `@typescript-eslint/no-use-before-define` rules while preserving prompt cancellation on disposal.
- The release remains source-only until native lint with zero warnings and the production Heft pipeline succeed on the exact source being shipped.
- See [v1.4.2 verification and build instructions](docs/V1.4.2-PREFER-CONST-FIX.md).

## 1.4.1: lint fixes and release gates

- Added explicit TypeScript return contracts for all six newly modularized hooks/controller/commands.
- Escaped JSX text in the Content editor, fixed the backoff cancellation timer initialization, and narrowly documented the browser-native `Headers.get` null type.
- Made `npm run package` fail on **any ESLint warning** and verify the resulting `.sppkg`; added GitHub Actions production packaging, including a package-content verifier.

## Modularization in 1.4.0

- The former 570-line `StudioEditor.tsx` is a small host component, with the five editor panels, manual tile navigation/detail editing and SharePoint data connection UI in dedicated typed React modules.
- SharePoint draft changes, undo, tile operations, list/field discovery and presets/import/export each have independently testable logic modules.
- Multiple rapid edits persist through local editor rerenders before the SharePoint property pane sends updated props.
- Changing a source site invalidates previous list/connection requests; old asynchronous import reads cannot overwrite newer JSON input, and invalid JSON clears pending confirmation.
- All **126 existing named setting field IDs**, native editor tabs, layouts, templates, stored settings and editor controls remain intact. No visual redesign, new external service, migration or new API permission is required.

See [modularization notes and acceptance checklist](docs/V1.4.0-MODULARIZATION.md) and [architecture](docs/ARCHITECTURE.md). The earlier [1.3.0 release notes](docs/V1.3.0-RELEASE-NOTES.md) remain available for upgrade history.

## Build and deploy

Requires **Node.js 22.14+**, npm, SharePoint Online and App Catalog deployment privileges. The package pins SPFx **1.23.2**, React **17.0.1** and compatible dependencies; do not upgrade them independently.

```powershell
npm ci
npm run package
Get-Item .\sharepoint\solution\imberon-tile-studio.sppkg
```

`./Build.ps1` installs dependencies and runs the same fail-closed package command. `npm run test:offline` runs core offline Node tests without esbuild/Heft if TypeScript is locally available; it **does not** verify a production web-part package. After building, perform tenant staging tests before organization-wide rollout.

**Upgrade:** Back up your 1.3.0 package, export the configuration from a live Tile Studio instance, and preserve the SharePoint page version. Upgrade the *same* App Catalog entry (solution GUID unchanged) to **1.4.5.0**. No added Graph permissions or list schema migration are required. If staging fails, redeploy the previous package and restore the page version as needed.

## Editor reference

Select **Edit page → Tile Studio → Edit web part**. Use **Content** for titles, manual tiles, approved image hosts and list sources; **Layout** for templates, composition and link behavior; **Style** for color and typography; **Responsive** for column and motion rules; **Presets** for reusable designs and import/export. Edit rights come from SharePoint. Tile visibility is a visual control, **not authorization**; list permissions must protect sensitive data.

See [editor guide](docs/EDITOR-GUIDE.md), [list setup](docs/LIST-SETUP.md), [shared preset governance](docs/SHARED-PRESETS.md), and [1.3.0 tenant acceptance](docs/V1.3.0-TENANT-ACCEPTANCE.md).

**Distribution limitation:** Developer metadata in `config/package-solution.json` still requires actual Imberon website/privacy/terms URLs (and partner ID, if applicable) before marketplace distribution. Never populate these with invented URLs.

## Required release checks (added after the lint failure)

**Do not deliver or deploy a new ZIP as build-verified unless the full validation runs in the actual SPFx environment.** The quick offline checks validate only the dependency-free TypeScript modules and cannot catch ESLint or all React/SharePoint compilation issues.

1. `npm ci` with the committed lockfile.
2. `npm run package` now runs the Node regression suite, strict ESLint (`--max-warnings 0`), production Heft/TypeScript/Webpack build, Heft packaging, removes stale packages, and checks the resulting `.sppkg` exists and starts with a valid ZIP header. Any warning/error from ESLint blocks packaging.
3. `npm run test:browser` and the [tenant acceptance checklist](docs/V1.3.0-TENANT-ACCEPTANCE.md) must be recorded separately where infrastructure permits.
4. CI runs `npm ci` + `npm run package` on all pushes, pull requests, and manual dispatches (see `.github/workflows/spfx-release-check.yml`). Require the `SPFx production package` job to pass before merging/releasing.

If npm dependencies, CI, or tenant access are unavailable, the handoff must prominently say **build unverified; source-only**. Never label the `.sppkg` deliverable complete until the compiled package exists. See [Release Gates](docs/RELEASE-GATES.md).
