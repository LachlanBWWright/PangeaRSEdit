# GitHub Pages Deployment

This repository uses GitHub Pages to host the WebAssembly version of Nanosaur, making it playable directly in web browsers.

## Live Site

**Play Nanosaur in your browser:** https://lachlanbwwright.github.io/Nanosaur-android/

## How It Works

The deployment is fully automated via GitHub Actions using OIDC-based Pages deployment:

1. **Build Trigger**: The workflow runs automatically on every push to the `master` branch, or can be triggered manually via workflow dispatch.

2. **Build Process** (`.github/workflows/deploy-pages.yml`):
   - Sets up Emscripten SDK (cached between runs)
   - Downloads and caches SDL3 source
   - Builds Nanosaur to WebAssembly using `build.py --wasm`
   - Assembles the site in `_site/` with landing page and game files
   - Adds `.nojekyll` file to prevent Jekyll processing

3. **Deployment**:
   - Uses `actions/upload-pages-artifact@v3` to upload the site
   - Uses `actions/deploy-pages@v4` for OIDC-based deployment
   - Only deploys from the `master` branch

## Site Structure

```
/ (root)
├── index.html          # Landing page with game info, screenshot, and controls
├── screenshot.png       # Game screenshot
├── Nanosaur.ico        # Favicon
├── Nanosaur.png        # Logo (used in game loading overlay)
├── .nojekyll           # Prevents Jekyll from processing files
└── game/
    ├── index.html      # The actual game (Emscripten shell)
    ├── Nanosaur.js     # Emscripten JavaScript glue code
    ├── Nanosaur.wasm   # Compiled WebAssembly binary
    └── Nanosaur.data   # Embedded game data files
```

## GitHub Pages Settings

To enable GitHub Pages on your fork:

1. Go to repository Settings → Pages
2. Set **Source** to "GitHub Actions"
3. The workflow will automatically deploy when pushed to master

## Local Development

To test the WebAssembly build locally before deploying:

```bash
# Build the WebAssembly version
python3 build.py --wasm

# Serve locally
cd build
python3 -m http.server 8080

# Open http://localhost:8080/Nanosaur.html in your browser
```

## Features

The GitHub Pages deployment includes:
- **Instant play**: No installation or downloads required
- **Cross-platform**: Works on any device with a modern web browser
- **Level editor integration**: Custom terrain file loading via JavaScript
- **Cheat menu**: Debug controls for rapid testing
- **URL parameters**: Direct level loading (e.g., `?level=0&skipMenu=1`)
- **Fullscreen support**: Toggle fullscreen mode from the toolbar
- **Mute control**: Toggle audio from the toolbar

## Troubleshooting

### Site not updating after push

1. Check the GitHub Actions workflow run completed successfully
2. Wait 1-2 minutes for GitHub Pages to rebuild (separate from the workflow)
3. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
4. Check that GitHub Pages source is set to "GitHub Actions" in repository settings

### MIME type errors

The `.nojekyll` file in the deployment prevents Jekyll from interfering with `.js` and `.wasm` files. If you see MIME type errors, ensure this file exists in the deployed site.

### Workflow fails to deploy

1. Verify the repository has Actions enabled
2. Check that the workflow has `pages: write` and `id-token: write` permissions
3. Ensure GitHub Pages source is set to "GitHub Actions"

## Security Notes

- The site is served over HTTPS automatically by GitHub Pages
- No server-side code or databases are required
- All game logic runs client-side in the browser
- Game data is embedded in the WebAssembly bundle
- OIDC-based deployment eliminates the need for personal access tokens

## Credits

WebAssembly port automation and GitHub Pages deployment by the Nanosaur community.
Reference: [OttoMatic-Android SDL-WASM-PORTING-GUIDE](https://github.com/LachlanBWWright/OttoMatic-Android/blob/master/docs/SDL-WASM-PORTING-GUIDE.md)
