# Item-to-Model Mapping Preview Page Plan

## Goal

Create or re-implement a dedicated page for inspecting how terrain items and spline items resolve to rendered 3D models. The page should exercise the same mapping, loading, extraction, cloning, and transform code used by the editor's Three.js item previews instead of maintaining a separate approximation of that behavior.

The page is an experimental diagnostic tool. It must be hidden behind a new feature flag that is off by default. When the flag is disabled, the navigation entry must not be rendered and direct navigation to the route must redirect to the level editor.

## Existing codepaths to preserve and reuse

- `frontend/src/data/items/mappers/index.ts` selects the `GameItemModelMapper` for a game. Its `getMapping` call is the source of truth for terrain-item and spline-item mappings, including parameter- and level-dependent variants.
- `frontend/src/data/items/itemModelTypes.ts` defines `ItemModelKind`, `UniversalItemModelMapping`, multi-part mappings, transforms, lighting mode, parameter domains, citations, and verification metadata.
- `frontend/src/editor/threejs/ItemGeometry.tsx` resolves terrain-item mappings with item parameters, flags, and level number; loads them through `useItemModelCache`; and applies mapping scale, rotation, position offsets, Y offset, and lighting mode.
- `frontend/src/editor/threejs/SplineItemGeometry.tsx` uses the same cache for `splineItem` mappings and applies the spline mapping transforms.
- `frontend/src/editor/threejs/hooks/useOttoItemModelCache.ts` is the current shared runtime pipeline for mapping lookup, URL construction, BG3D conversion, subgroup extraction, and caching. Despite its filename, it supports all mapped games.
- `frontend/src/editor/threejs/hooks/itemModelCacheKey.ts` distinguishes game, item type, params, level, and item kind. The preview page must use the same cache-key inputs as the editor.
- `frontend/src/editor/threejs/hooks/itemModelLoaderUtils.ts` owns file-level GLTF caching, worker conversion, subgroup extraction, and skeleton-safe scene cloning.
- `frontend/src/pages/ItemModelViewer.tsx` already contains useful page behavior such as game/item selection, mapping metadata, automatic camera fitting, capture mode, grid, lighting, and model statistics. Its duplicated model-loading implementation should not remain a second source of truth.
- `frontend/src/pages/ItemAuditPage.tsx` and `itemAuditPageHelpers.ts` are additional preview consumers, but currently contain another conversion/extraction path. They should inform compatibility testing; the new page should not copy that loader.

## Target architecture

Introduce a small, framework-independent item-model preview pipeline and have both editor rendering and the new page consume it.

### 1. Normalize a preview request

Add a typed request model containing:

- game
- item kind (`terrainItem` or `splineItem`)
- item type
- optional level number
- parameters `p0` through `p3`
- optional item flags

Create a pure resolver that accepts this request and a mapper, then returns either a resolved `UniversalItemModelMapping` or a typed “no mapping” result. It must pass `kind`, level, params, and flags to `getMapping` exactly as `ItemGeometry` does. Keep request normalization and mapper lookup out of React components.

### 2. Extract the shared loader from the current cache hook

Refactor the reusable parts of `useItemModelCache` into a service/module with an explicit API such as `loadResolvedItemModel(request): ResultAsync<LoadedItemModel, ItemModelLoadError>`.

The shared loader should own:

- game-to-base-path resolution
- mapper resolution
- file fetch and BG3D-to-GLTF conversion through the existing worker utilities
- file-level caching
- `modelIndex`/`groupSize` extraction
- `modelParts` assembly where present
- skeleton-safe cloning
- all mapping transforms: `scale`, `scaleXZ`, `scaleY`, `rotationY`, `positionOffset`, and `yOffset`
- lighting-mode conversion
- typed status/error information suitable for both the editor and the page

Keep external failures at their boundaries with `Result`/`ResultAsync`. Parse unknown worker and loader payloads with Zod before using them. Do not add throwing internal APIs, type assertions, or `any`.

Rename `useOttoItemModelCache.ts` as part of the refactor, or add a game-neutral replacement and migrate callers, because the implementation is already cross-game. Keep cache ownership independent from the page so multiple instances can share converted files without sharing mutable Three.js scene objects.

### 3. Centralize model presentation transforms

Move the transform and lighting logic currently duplicated in `ItemGeometry.tsx` and `ItemModelViewer.tsx` into named functions in separate modules. Return a safely cloned display scene so page interactions cannot mutate cached scenes or other item instances.

Use the same function for terrain items, spline items, and the standalone page. This is the key parity boundary: given the same request, the page and editor should receive equivalent scene structure and transforms.

### 4. Rebuild the page around the shared pipeline

Create a focused page, preferably by decomposing or replacing `ItemModelViewer.tsx`, with:

- game selector restricted to games returned by `getGamesWithMappers()`
- item-kind selector for terrain and spline items
- searchable item selector showing numeric type, name, and whether a mapping resolves
- semantic parameter controls derived from `paramDomains`: selects for enums, named checkboxes for bitsets, and constrained numeric controls for integer/rotation/scale domains
- level selector only when the selected mapping can be level-dependent
- mapping summary showing file/path, model index/group size, parts, transforms, verification status, warnings, and citations
- a Three.js viewport using the existing camera-fit, orbit-control, lighting, grid, and capture-mode behavior where still useful
- explicit empty, loading, success, and typed failure states
- optional “editor comparison” details displaying the resolved cache key and normalized request, to make parity problems reproducible

Loading should respond to selection changes without a separate “Load Model” button unless manual loading is required for performance. Prevent stale requests from replacing a newer selection, and terminate page-owned workers on teardown.

Keep the page component primarily responsible for composition. Put request state transitions, item-list construction, parameter control derivation, and mapping-summary formatting in named, tested modules so the page does not repeat the current large-component shape.

## Feature flag and routing

Add `itemModelMappingPreview` to `frontend/src/config/featureFlags.ts`.

- Default it from `VITE_ITEM_MODEL_MAPPING_PREVIEW_ENABLED === "true"`; absence of the environment variable therefore means `false`.
- Include it in the Zod schema and `DEFAULT_FEATURE_FLAGS`, preserving safe migration of previously stored flag objects through schema defaults.
- Add a toggle to `FeatureFlagsPage` with language identifying the page as experimental.
- Add a navigation link only when `featureFlags.itemModelMappingPreview` is true. Do not reuse the hard-coded `showExperimentalLinks` constant.
- Guard the route in `App.tsx` with the same flag and redirect disabled direct visits to `/` with `replace`, matching the multiplayer route pattern.
- Prefer a descriptive route such as `/item-model-mapping-preview`. If `/item-models` must remain for existing screenshot tooling, make it a guarded compatibility redirect or document it as the guarded canonical route; do not leave an unguarded alias.
- Preserve `?capture=1` only if current thumbnail/screenshot generation depends on it, and test that capture access is also feature-gated.

## Implementation sequence

1. Add characterization tests around the current terrain-item and spline-item resolution paths. Cover a static mapping, parameter-dependent mapping, level-dependent mapping, multi-group mapping, multi-part mapping, transformed mapping, unlit mapping, and missing mapping.
2. Extract shared request resolution, cache-key construction usage, scene loading, cloning, and transform application without changing editor behavior.
3. Migrate `ItemGeometry` and `SplineItemGeometry` to the shared pipeline and verify their existing fallback/loading behavior remains intact.
4. Rebuild the mapping-preview page on the shared pipeline, retaining only useful viewport and camera code from `ItemModelViewer`.
5. Add the off-by-default feature flag, settings toggle, guarded route, guarded navigation link, and any guarded compatibility route.
6. Remove obsolete duplicated page loading code after parity tests pass. Consider migrating `ItemAuditPage` to the shared loader in a follow-up or in the same change if its requirements match cleanly.
7. Add Storybook coverage only for production page components that can be mounted with realistic mapper data and provider setup; do not substitute lookalike controls or a fake viewport.

## Test plan

### Unit tests

- Feature flag defaults to false when its environment variable is absent.
- Stored feature-flag data from before this flag existed parses with the new flag disabled.
- Request normalization passes kind, level, params, and flags to the mapper correctly.
- Terrain and spline requests with the same numeric type produce distinct cache keys.
- Mapping transforms produce expected scale, rotation, and offsets without mutating cached scenes.
- Multi-part and skeleton-bearing models clone and assemble correctly.
- Unknown worker responses and network/loader failures become typed errors rather than thrown internal failures.
- Parameter domains create the correct semantic control model.

### Component and routing tests

- Disabled flag hides the navigation link and redirects a direct route visit.
- Enabled flag exposes the link and mounts the page.
- Changing game, kind, item, level, params, or flags resolves the expected mapping.
- A stale load cannot overwrite the currently selected preview.
- Loading, unmapped, conversion-error, extraction-error, and success states are accessible and readable.
- Capture mode uses the same resolved model and remains guarded by the flag.

### Visual and integration tests

- Compare representative page previews against the same requests rendered by `ItemGeometry` and `SplineItemGeometry`.
- Cover at least one representative mapping per supported game, plus the special mapping categories listed in the characterization tests.
- Verify auto-fit, large/small models, non-uniform scale, offsets, unlit materials, and multi-part bounds.
- Check worker cleanup and repeated selection changes for leaked workers, object URLs, or mutated cached scenes.

## Acceptance criteria

- The page is off by default in a normal build.
- With the flag off, there is no navigation affordance and direct URL access redirects to the level editor.
- With the flag on, users can select every mapped game and both item kinds, configure valid mapping inputs, and inspect the resolved model and metadata.
- The page, terrain-item preview, and spline-item preview use the same mapping resolver, model loader, subgroup/part extraction, scene cloning, and transform application code.
- The page does not contain its own fetch/worker/GLTF conversion pipeline.
- Missing and invalid mappings fail visibly without breaking the page or editor.
- New logic follows the repository's Zod, `neverthrow`, TypeScript, React-size, and no-throw standards.
- Unit, routing, component, and representative visual parity tests pass.

## Risks and mitigations

- **Existing behavior differs between terrain and spline previews.** Characterize those differences first, then make intentional parity decisions rather than silently choosing one implementation.
- **The current loader utilities expose Promise rejection internally.** Introduce a typed `ResultAsync` facade at the external boundary and migrate callers incrementally.
- **Cached Three.js objects can be mutated by transforms.** Cache source GLTF data and always return skeleton-safe, material-safe clones for presentation.
- **Level- and parameter-dependent mappings can show misleading results.** Make all mapping inputs explicit and display the normalized request next to the resolved mapping.
- **Large model files can make selector changes expensive.** Retain file-level conversion caching, deduplicate in-flight work, and ignore stale UI completions.
- **Old experimental routes are currently unguarded.** Audit `/item-models`, `/test-models`, and `/item-audit` while wiring the new flag; at minimum ensure every alias that reaches the new page uses the same route guard.
