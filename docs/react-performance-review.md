# React performance improvements

This pass applies Vercel React Best Practices to the Vite/React application.
React Compiler is already enabled; the changes address module loading,
subscription boundaries and repeated work rather than adding blanket memoization.

## Changes

- `App.tsx` loads feature pages on demand and keeps the navigation visible while
  they load. The desktop project controller loads only when the bridge exists.
- `IntroPrompt.tsx` defers the terrain and tunnel editors until corresponding
  data exists. Document state and history stay above the loading boundaries.
- `Items.tsx` passes immutable individual items to `Item`, allowing unchanged
  items to skip rendering when another item moves.
- `Fence.tsx` shares one snap-target collection across its handles, reuses it
  during drag previews, and skips building it when snapping is disabled.
- `itemScreenshotManifest.ts` validates bundled data once and indexes exact and
  fallback screenshots by manifest identity. The weak cache allows unused
  imported manifests to be collected. Exact-first and first-duplicate behavior
  are preserved.
- Sprite Viewer requests independent sprite/tileset and palette inputs in
  parallel. Cancelled and superseded operations cannot commit stale results.

## Evidence and checks

Desktop production builds before/after this pass were served locally and opened
in fresh Chromium contexts. At the default landing screen, requested JavaScript
fell from 9,394,381 to 3,220,801 bytes (66%). Summed per-file gzip sizes fell from
2,572,856 to 924,247 bytes (64%). These count requested JavaScript assets, not
elapsed loading time, textures, WASM or game data. The browser confirmed that
`EditorView` was absent before creating a level and loaded afterward. Production
smoke checks covered blank Otto level creation and sprite/model/custom-object
routes without page errors.

The 390-entry screenshot manifest was also exercised with 1,000 lookups in a
local Node microbenchmark: repeated validation plus linear lookup took about
260 ms; shared validation and indexed lookup took about 0.9 ms. This isolates
lookup work and is not an application-wide frame-rate measurement.

`canvasRenderPerformance.test.tsx` mounts the production Items and Fence
components with Konva and asset boundaries mocked. Moving one of 500 items
executes one item render; switching selection updates two. A 100-handle fence
builds its targets once, reuses them during preview, and invalidates on data
changes. This checks render work, not browser frame time.

`useSpriteViewerLoadersOwnership.test.tsx` verifies concurrent requests start
before either resolves, successful palette/data delivery, and cancellation.
Manifest tests cover shared validation, exact/default selection, duplicate
precedence and isolation between manifests.

```sh
pnpm --dir frontend exec vitest run --coverage.enabled=false \
  tests/items/itemScreenshotManifest.test.ts \
  src/editor/subviews/canvasRenderPerformance.test.tsx \
  src/pages/SpriteViewer/hooks/useSpriteViewerLoadersOwnership.test.tsx
pnpm --dir frontend exec tsc -p tsconfig.app.json --noEmit
pnpm --dir frontend exec vite build --mode desktop
```

Potential further work: cache parsed custom-thumbnail model banks after checking
parser mutation and model resource ownership. Existing asset byte/model loaders
already share in-flight requests. No additional fetching library is needed for
this pass. The editor still loads its scripting and 3D dependencies when opened;
further tab-level splitting should be assessed separately.
