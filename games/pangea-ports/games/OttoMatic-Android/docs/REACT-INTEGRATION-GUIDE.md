# Integrating Otto Matic (Emscripten/WASM) into a React Application

This guide covers embedding the Otto Matic WebAssembly build inside a React
application, including launching specific levels, injecting custom terrain
files, and using the Level Editor API from React components.

---

## 1. Build Artifacts

After running `python3 build.py --wasm --build`, the `build/` directory
contains:

| File | Purpose |
|---|---|
| `OttoMatic.js` | Emscripten glue / Module loader |
| `OttoMatic.wasm` | Compiled game binary |
| `OttoMatic.data` | Prepackaged game data (sprites, models, terrain) |
| `OttoMatic.html` | Reference shell (not used in React) |

Copy `OttoMatic.js`, `OttoMatic.wasm`, and `OttoMatic.data` into your React
app's `public/` directory (or serve them from a CDN).

---

## 2. React Component

```tsx
// OttoMatic.tsx
import { useEffect, useRef, useCallback } from 'react';

interface OttoMaticProps {
  /** Level to launch directly (0–9). Omit to show the main menu. */
  level?: number;
  /** Path to a custom .ter file in the WASM VFS. */
  terrainPath?: string;
  /** Width of the canvas element. */
  width?: number;
  /** Height of the canvas element. */
  height?: number;
}

declare global {
  interface Window {
    Module: any;
  }
}

export default function OttoMatic({
  level,
  terrainPath,
  width = 960,
  height = 640,
}: OttoMaticProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moduleRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Build command-line arguments
    const args: string[] = [];
    if (level !== undefined && level >= 0) {
      args.push('--level', String(level));
    }
    if (terrainPath) {
      args.push('--terrain', terrainPath);
    }

    // Configure the Emscripten Module object BEFORE loading the script
    window.Module = {
      canvas: canvasRef.current,
      arguments: args,
      print: (text: string) => console.log('[OttoMatic]', text),
      printErr: (text: string) => console.warn('[OttoMatic]', text),
      onRuntimeInitialized: () => {
        console.log('[OttoMatic] Runtime ready');
        moduleRef.current = window.Module;
      },
    };

    // Dynamically load the Emscripten glue script
    const script = document.createElement('script');
    script.src = '/OttoMatic.js';   // adjust path as needed
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount (optional — WASM can't be fully unloaded)
      document.body.removeChild(script);
    };
  }, [level, terrainPath]);

  return (
    <canvas
      ref={canvasRef}
      id="canvas"
      width={width}
      height={height}
      style={{ display: 'block', margin: '0 auto' }}
      tabIndex={0}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
```

### Usage

```tsx
<OttoMatic level={3} width={1280} height={720} />
```

---

## 3. Calling the Level Editor API from React

All exported `OttoMatic_*` functions are available via `Module.ccall()` /
`Module.cwrap()` once the runtime has initialized.

```tsx
// hooks/useOttoMaticAPI.ts
import { useCallback } from 'react';

export function useOttoMaticAPI() {
  const ccall = useCallback(
    (name: string, ret: string | null, argTypes: string[], args: any[]) => {
      if (!window.Module?.ccall) {
        console.warn('Module not ready');
        return undefined;
      }
      return window.Module.ccall(name, ret, argTypes, args);
    },
    []
  );

  return {
    /** Toggle god mode (immortality). */
    setGodMode: (on: boolean) =>
      ccall('OttoMatic_SetGodMode', null, ['number'], [on ? 1 : 0]),

    /** Set movement speed multiplier (0.1 – 10.0). */
    setSpeedMultiplier: (mult: number) =>
      ccall('OttoMatic_SetSpeedMultiplier', null, ['number'], [mult]),

    /** Skip to a specific level (0–9). */
    skipToLevel: (lvl: number) =>
      ccall('OttoMatic_SkipToLevel', null, ['number'], [lvl]),

    /** Teleport the player to world coordinates. */
    warpTo: (x: number, y: number, z: number) =>
      ccall('OttoMatic_WarpToCoord', null, ['number', 'number', 'number'], [x, y, z]),

    /** Toggle fence collisions. */
    setFenceCollisions: (on: boolean) =>
      ccall('OttoMatic_SetFenceCollisions', null, ['number'], [on ? 1 : 0]),

    /** Set terrain override path in WASM VFS. */
    setTerrainPath: (path: string) =>
      ccall('OttoMatic_SetTerrainPath', null, ['string'], [path]),

    /** Get current level number. */
    getCurrentLevel: () =>
      ccall('OttoMatic_GetCurrentLevel', 'number', [], []) as number,

    /** Get player state: { x, y, z, health, lives }. */
    getPlayerState: () => {
      return {
        x: ccall('OttoMatic_GetPlayerX', 'number', [], []) as number,
        y: ccall('OttoMatic_GetPlayerY', 'number', [], []) as number,
        z: ccall('OttoMatic_GetPlayerZ', 'number', [], []) as number,
        health: ccall('OttoMatic_GetPlayerHealth', 'number', [], []) as number,
        lives: ccall('OttoMatic_GetPlayerLives', 'number', [], []) as number,
      };
    },
  };
}
```

### Example control panel

```tsx
function GameControls() {
  const api = useOttoMaticAPI();

  return (
    <div>
      <button onClick={() => api.setGodMode(true)}>God Mode ON</button>
      <button onClick={() => api.setSpeedMultiplier(2.0)}>2× Speed</button>
      <button onClick={() => api.skipToLevel(5)}>Jump to Level 5</button>
      <button onClick={() => {
        const state = api.getPlayerState();
        if (state) alert(JSON.stringify(state, null, 2));
      }}>
        Show Player State
      </button>
    </div>
  );
}
```

---

## 4. Injecting Custom Terrain Files

To load user-provided `.ter` and `.ter.rsrc` files into the game at runtime:

```tsx
async function injectTerrainFile(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const vfsPath = `/Data/Terrain/${file.name}`;

  // Write the file into Emscripten's virtual filesystem
  window.Module.FS.writeFile(vfsPath, data);

  // If this is the .ter data fork, also set it as the active terrain
  if (file.name.endsWith('.ter') && !file.name.endsWith('.rsrc')) {
    window.Module.ccall('OttoMatic_SetTerrainPath', null, ['string'], [vfsPath]);
  }

  console.log(`Injected ${vfsPath} (${data.length} bytes)`);
}
```

### File input component

```tsx
function TerrainUploader() {
  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await injectTerrainFile(file);
    }
  };

  return (
    <label>
      Upload .ter / .ter.rsrc files:
      <input type="file" accept=".ter,.rsrc" multiple onChange={handleFiles} />
    </label>
  );
}
```

---

## 5. Launching a Specific Level on Startup

### Option A: URL parameters

The shell page (and the React component above) supports `?level=N`:

```
https://your-site.com/game?level=3
```

This passes `--level 3` as a command-line argument to the WASM binary, which
sets `gDirectLevelNum = 3` and skips the main menu.

### Option B: React prop

```tsx
<OttoMatic level={3} />
```

### Option C: Runtime API

After the game has started, call:

```ts
api.skipToLevel(3);   // triggers level completion → loads level 3
```

---

## 6. Important Notes

- **Single instance**: Only one Emscripten Module can run per page. Do not
  mount multiple `<OttoMatic>` components simultaneously.
- **Canvas focus**: The game captures keyboard/mouse input. Call
  `canvasRef.current.focus()` to ensure the game receives input events.
- **Audio autoplay**: Browsers require a user gesture before playing audio.
  Call `Module.SDL2.audioContext.resume()` inside a click handler if audio
  doesn't start automatically.
- **Memory**: The game allocates ~256 MB of WebAssembly memory. Ensure
  your hosting environment's `Content-Security-Policy` allows `wasm-eval`.
- **CORS**: `OttoMatic.wasm` and `OttoMatic.data` must be served with
  appropriate CORS headers if loaded from a different origin.
- **Cleanup**: WASM modules cannot be fully unloaded. If you need to
  restart the game, reload the page.
