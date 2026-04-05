# In-Game Preview Setup

PangeaRSEdit includes a **Test in Game** dialog that lets you launch the current level directly inside the original Pangea game engine running in WebAssembly (via the [Pangea Ports](https://github.com/jorio/pangea-ports) project).

The feature requires the Pangea Ports game builds to be served from the same origin as PangeaRSEdit. When these files are absent the preview buttons are disabled and an explanatory message is shown.

---

## How it Works

At runtime, PangeaRSEdit checks for the presence of each game's main JavaScript bundle at:

```
<origin>/games/pangea-ports/<GameDir>/<Game>.js
```

For example, for Otto Matic running at `http://localhost:5173`:

```
http://localhost:5173/games/pangea-ports/OttoMatic-Android/OttoMatic.js
```

If this file is present (and the response is `Content-Type: application/javascript`), the bundled launcher is used. Otherwise the preview is unavailable.

---

## Local Development Setup

1. Clone (or symlink) the Pangea Ports repository into the correct public directory:

   ```bash
   cd frontend/public/games
   git clone https://github.com/LachlanBWWright/Pangea-Ports pangea-ports
   ```

   Or if you already have it cloned elsewhere, create a symlink:

   ```bash
   ln -s /path/to/Pangea-Ports frontend/public/games/pangea-ports
   ```

2. Start the dev server as usual:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open the editor, load a level, and use the **Test in Game** button. The dialog will detect the bundled launcher automatically.

---

## CI / GitHub Pages Deployment

The `deploy.yml` workflow clones the Pangea Ports repository into `frontend/public/games/pangea-ports/` before the Vite build so the deployed GitHub Pages site includes the game binaries.

> **Note:** The Pangea Ports WebAssembly binaries can be large (tens of MB per game). GitHub Pages has a 1 GB soft limit. If the combined repository exceeds that, consider cloning only the games you need, or hosting the WASM assets on a CDN and updating `buildLocalPangeaPortsBaseUrl()` in `TestGameDialog.tsx` accordingly.

### Expected directory layout after cloning

```
frontend/public/games/pangea-ports/
  OttoMatic-Android/
    OttoMatic.html
    OttoMatic.js
    OttoMatic.wasm
    …
  Bugdom-android/
    game.html
    …
  Bugdom2-Android/
    Bugdom2.html
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
| "Pangea Ports launcher is not available" on local dev | The `pangea-ports/` directory is missing or misnamed inside `public/games/` |
| "not available" on the deployed site | The CI clone step in `deploy.yml` failed, or the repository name/branch changed |
| Blank iframe after clicking Start Preview | CORS or `allow="fullscreen"` issue; try **Open in New Tab** instead |
| Level loads but starts at level 0, not the selected level | The `buildLaunchQuery` for that game in `gamePortConfig.ts` may need updating |
