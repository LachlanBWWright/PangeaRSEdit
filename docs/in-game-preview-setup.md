# In-Game Preview Setup

PangeaRSEdit includes a **Test in Game** dialog that lets you launch the current level directly inside the original Pangea game engine running in WebAssembly (via the [Pangea Ports](https://github.com/jorio/pangea-ports) project).

The feature requires the Pangea Ports game builds to be served from the same origin as PangeaRSEdit. When these files are absent the preview buttons are disabled and an explanatory message is shown.

---

## How it Works

At runtime, PangeaRSEdit checks for the presence of each game's main JavaScript bundle at:

```
<origin>/.generated/pangea-ports/wasm/<game>/<Game>.js
```

For example, for Otto Matic running at `http://localhost:5173`:

```
http://localhost:5173/.generated/pangea-ports/wasm/ottomatic/OttoMatic.js
```

If this file is present (and the response is `Content-Type: application/javascript`), the bundled launcher is used. Otherwise the preview is unavailable.

---

## Local Development Setup

1. Make sure the `pangea-ports` submodule is checked out at the monorepo root:

   ```bash
   git submodule update --init --recursive
   ```

2. Build and stage the WASM assets into the frontend's generated public tree:

   ```bash
   scripts/build-pangea-ports.sh
   ```

3. Start the dev server as usual:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open the editor, load a level, and use the **Test in Game** button. The dialog will detect the bundled launcher automatically.

---

## CI / GitHub Pages Deployment

The build pipeline stages the compiled binaries into `frontend/public/.generated/pangea-ports/wasm/` before the Vite build so the deployed GitHub Pages site includes the game binaries without checking them into git.

> **Note:** The Pangea Ports WebAssembly binaries can be large (tens of MB per game). GitHub Pages has a 1 GB soft limit. If the combined repository exceeds that, consider cloning only the games you need, or hosting the WASM assets on a CDN and updating `buildLocalPangeaPortsBaseUrl()` in `TestGameDialog.tsx` accordingly.

### Expected directory layout after cloning

```
frontend/public/.generated/pangea-ports/wasm/
  ottomatic/
    OttoMatic.js
    OttoMatic.wasm
    …
  bugdom/
    Bugdom.js
    Bugdom.wasm
    …
  bugdom2/
    Bugdom2.js
    Bugdom2.wasm
    …
  (etc.)
```

The exact directory names and HTML entry-points are defined in:

```
frontend/src/editor/utils/gamePortConfig.ts  →  siteLaunchPath / mainJs fields
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| "Pangea Ports launcher is not available" on local dev | The `games/pangea-ports/` submodule is missing, or the generated `frontend/public/.generated/pangea-ports/wasm/` directory has not been built |
| "not available" on the deployed site | The CI clone step in `deploy.yml` failed, or the repository name/branch changed |
| Blank iframe after clicking Start Preview | CORS or `allow="fullscreen"` issue; try **Open in New Tab** instead |
| Level loads but starts at level 0, not the selected level | The `buildLaunchQuery` for that game in `gamePortConfig.ts` may need updating |
