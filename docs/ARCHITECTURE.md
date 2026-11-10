# Architecture decisions

## One product, independent instances

Every Tile Studio instance has a common versioned content schema and a selected layout. Layouts share the same safe tile rendering primitives, status labels, and theme tokens. Templates alter the starting appearance; content and data connections are not tied to a template. Manual content and connected lists can therefore use the same renderer.

## SharePoint owns authorship and persistence

The page's native Edit permission determines who can open the designer. The designer sends configuration changes through the custom property-pane field's `changeCallback`. This lets the SPFx framework update its property bag and page dirty state. The native property pane stays open while the inline designer is active. There are no calls to undocumented SharePoint host methods.

The host retains an unnormalized in-memory editing draft so typed partial URLs are not erased. A separate normalized object enters the SharePoint property bag. Closing the designer uses that stored safe object; the SharePoint Save/Republish controls persist the page. Text, link, and image property metadata are declared for SharePoint's normal page processing.

## Read-only connected data

`ListDataClient` accepts an injected HTTP function for testability. The production adapter supplies `SPHttpClient.get`. Site URLs are restricted to the current SharePoint hostname; list GUIDs and field names are validated before constructing a REST query. Category literals are escaped, `$select` includes mapped fields only, and pagination must remain on the same REST collection. A page-count limit prevents unbounded traversal even when a service returns empty pages.

The interface supports scalar columns and standard Hyperlink/Picture field values. It does not expand person, lookup, taxonomy, or modern Image-column objects. JSON values, rich text, and metric strings are displayed as text, never interpreted as HTML. List storage and permissions are maintained outside the web part.

The host uses request-lifecycle guards to ignore late responses after source changes or unmount. Any current load error removes connected results. Refresh is scheduled after the preceding request finishes. Per-client cached results are memory-only and expire according to the source interval; forced loads bypass them. Authorization errors clear cached results. There is no cross-instance or persistent cache.

## Design controls

CSS is scoped through CSS modules. Visual tokens are derived from the SharePoint theme unless the editor supplies a bounded hex override. No arbitrary stylesheet, script, SVG source, or HTML entry is supported. Icons are a fixed inline SVG set. The renderer handles external image failure with a local decorative placeholder.

Responsive layouts observe the rendered web part width. A narrow SharePoint column uses the same responsive rules as a narrow device. Text wraps rather than being clipped to a fixed line count. Images reserve aspect ratio; controls expose keyboard focus; unlinked cards are noninteractive; new-tab links have a text announcement and `noopener noreferrer`. Operating-system reduced-motion preferences take precedence over configured hover motion.

## Release boundaries

This build is an employee-facing presentation component. It contains no service desk transaction handler, purchasing workflow, provisioning code, Copilot agent, or health-monitoring integration. A source list may be updated by a separately governed automation; Tile Studio only reads the resulting values.

The compiled package and browser tests can be validated outside a tenant. SharePoint page serialization across save/reload, inherited section theme values, tenant content-security settings, and actual list permission trimming require acceptance in the target SharePoint environment. Those checks are recorded separately in VALIDATION.md.

## Modular property-pane editor (v1.4.0)

`StudioEditor.tsx` is now a small SharePoint host shell for five tab panels. Content, Layout, Style, Responsive, and Presets live in individual modules under `components/editor/`, while manual tile ordering, tile detail forms and SharePoint source configuration each have their own editor component. Domain logic is separated into `useEditorDraft` (optimistic SPFx writes), `useEditorHistory`, `createTileActions`, `useSourceEditor`, and `usePresetsEditor`, coordinated by `useEditorController`. Each module keeps an explicit typed boundary through `EditorController`; components do not independently mutate the SharePoint property bag.

One controller remains mounted across editor tab changes, so tabs do not reset pending import review, list fetch status or the selected tile. The host keeps the same `StudioEditor` export and UI state contract as v1.3.0, and existing configuration properties are not reserialized by this refactor. The model is compatible with SharePoint's native property-pane host replacement behavior, subject to tenant testing. See `docs/V1.4.0-MODULARIZATION.md` for the full module map and release verification checklist.
