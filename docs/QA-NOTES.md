# Tile Studio validation notes

## Executed security and configuration checks

`npm test` passed **37 individual cases**. The core suite checks executable URL schemes, network-path confusion, image-source restrictions, CSS color injection, same-tenant site validation, list/field identifiers, OData apostrophe escaping, cross-instance state isolation, explicit false values, intentionally empty content, missing optional content, unknown input properties, duplicate IDs, count limits, future-schema rejection, import size limits, Unicode round-tripping, and preset preservation of content and data connections.

The data suite uses an injected transport rather than a live SharePoint session. It verifies query projection, collection-confined pagination, SharePoint hyperlink/visibility/status mapping, paginated item limits, duplicate suppression, cache mutation isolation, forced refresh, 401/403 cache eviction, older-request ordering, concurrent-request deduplication, malformed response errors, repeated-page detection, a 20-page request cap, a 500-field discovery cap, legacy JSON, and supported field-type filtering. A mocked-clock test verifies that the timeout also covers a JSON response body that never finishes.

## Executed browser checks

The standalone preview runs the production React components. `tests/browser.cjs` passed **13 grouped checks** in Chromium 141, with **zero uncaught browser errors**. Its results are written to `test-results/browser-results.json`.

- All ten layouts were checked at five outer canvas widths, 280, 390, 520, 768, and 1200 pixels: 50 layout/width combinations. The fixtures include sparse content and a 180-character unbroken title. Each collection adapts to its measured width and has no horizontal overflow.
- Another ten combinations use two mobile columns with 64-pixel icons and 80-pixel configured padding at a 280-pixel outer canvas width.
- Safe links, plain-text rendering, noninteractive informational cards, new-tab attributes, visible keyboard focus, explicit unknown status, hover lift, and both system and administrator reduced-motion settings passed.
- Twenty employee layout/theme scans and ten editor tab/theme scans returned no violations from the selected axe-core WCAG 2 A/AA and WCAG 2.1 AA automated rules. This is automated test coverage, not a complete accessibility conformance assessment.
- Live title and character-by-character URL editing, keyboard tab movement, saving and applying a preset, rejected import preservation, and focus restoration after closing the designer passed.
- An unavailable connected data source showed an error without displaying retained manual sample tiles.
- The ten-instance gallery contained no duplicate element IDs. Employee and editor views had no document overflow at a 390-pixel phone viewport.
- The standalone preview made no external network requests on startup.

An independent editor check also verified duplicate/delete focus restoration, valid configuration import, and downloaded JSON export integrity.

## Findings corrected during QA

- Mobile top-icon variants of the list, status, and minimal layouts allowed flex wrapping to create an unwanted horizontal content column. The top-icon stack now uses a single vertical flow with content-driven bases. The final browser suite passes the formerly failing cases.
- The Remove control in the editor used insufficient text contrast in a dark theme. Dark-theme danger text and hover colors were adjusted while preserving the light confirmation panel's contrast.
- Pagination now stops after 20 pages, including distinct empty responses, and field discovery returns at most 500 fields.
- The response timeout now covers both the HTTP request and response-body reading.
- Keyboard focus is restored after deleting tiles and saved presets, and inactive editor tab relationships remain valid.

## Package verification and tenant acceptance

`python3 tests/verify-package.py` validates the actual SPPKG ZIP CRC, XML relationship targets, solution and component versions, runtime-to-asset references, the lazy editor chunk, React compatibility, and absence of custom API permission requests and preview-only hooks. It must be run on the final rebuilt package after all source changes.

The SharePoint host uses `SPHttpClient` for read-only list requests in the signed-in employee's context. The package does not request a custom delegated API scope. The host's native property-pane callback supplies the validated configuration for SharePoint page persistence; temporary partial input remains in memory while editing.

**Remaining tenant acceptance:** install the final package on a test page, verify save/publish/reopen and multiple instances inside actual SharePoint sections, then test list loading with an authorized employee and an employee who lacks list access. Those live tenant checks have not been performed by these automated suites.
