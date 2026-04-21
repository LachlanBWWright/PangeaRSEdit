# Integrating Bugdom (Emscripten/WASM) into a React Application

This guide covers embedding the Bugdom WebAssembly build inside a React
application, including launching specific levels, injecting custom terrain
files, and using the JavaScript API from React components.

---

## 1. Build Artifacts

After running `python3 build_wasm.py`, the `dist-wasm/` directory
contains:

| File | Purpose |
|---|---|
| `Bugdom.js` | Emscripten glue / Module loader |
| `Bugdom.wasm` | Compiled game binary |
| `Bugdom.data` | Prepackaged game data (sprites, models, terrain) |
| `Bugdom.html` | Reference shell (not used in React) |

Copy `Bugdom.js`, `Bugdom.wasm`, and `Bugdom.data` into your React
app's `public/` directory (or serve them from a CDN).

---

## 2. React Component

```tsx
// Bugdom.tsx
import { useEffect, useRef, useCallback } from 'react';

interface BugdomProps {
  /** Level to launch directly (0–9). Omit to show the main menu. */
  level?: number;
  /** Path to a custom .ter file (colon-path, e.g. ':Terrain:Custom.ter'). */
  terrainFile?: string;
  /** Disable fence collisions for unobstructed exploration. */
  noFenceCollision?: boolean;
  /** Width of the canvas element. */
  width?: number;
  /** Height of the canvas element. */
  height?: number;
}

declare global {
  interface Window {
    Module: any;
    BUGDOM_START_LEVEL?: number;
    BUGDOM_TERRAIN_FILE?: string;
    BUGDOM_NO_FENCE_COLLISION?: boolean;
  }
}

export default function Bugdom({
  level,
  terrainFile,
  noFenceCollision,
  width = 960,
  height = 640,
}: BugdomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moduleRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Set window globals BEFORE the Module loads — Boot.cpp reads these
    if (level !== undefined && level >= 0) {
      window.BUGDOM_START_LEVEL = level;
    }
    if (terrainFile) {
      window.BUGDOM_TERRAIN_FILE = terrainFile;
    }
    if (noFenceCollision) {
      window.BUGDOM_NO_FENCE_COLLISION = true;
    }

    // Configure the Emscripten Module object BEFORE loading the script
    window.Module = {
      canvas: canvasRef.current,
      print: (text: string) => console.log('[Bugdom]', text),
      printErr: (text: string) => console.warn('[Bugdom]', text),
      onRuntimeInitialized: () => {
        console.log('[Bugdom] Runtime ready');
        moduleRef.current = window.Module;
      },
    };

    // Dynamically load the Emscripten glue script
    const script = document.createElement('script');
    script.src = '/Bugdom.js';   // adjust path as needed
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount (optional — WASM can't be fully unloaded)
      document.body.removeChild(script);
    };
  }, [level, terrainFile, noFenceCollision]);

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
<Bugdom level={3} width={1280} height={720} />
```

---

## 3. Calling the JavaScript API from React

All exported `Bugdom*` functions are available via `Module.ccall()` /
`Module.cwrap()` once the runtime has initialized.

```tsx
// hooks/useBugdomAPI.ts
import { useCallback } from 'react';

export function useBugdomAPI() {
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
    /** Toggle fence collisions. */
    setFenceCollision: (on: boolean) =>
      ccall('BugdomSetFenceCollision', null, ['number'], [on ? 1 : 0]),

    /** Query fence collision state (1=enabled, 0=disabled). */
    getFenceCollision: () =>
      ccall('BugdomGetFenceCollision', 'number', [], []) as number,

    /** Get current level number (0–9). */
    getCurrentLevel: () =>
      ccall('BugdomGetCurrentLevel', 'number', [], []) as number,

    /** Set terrain override path for the next level load. */
    setTerrainOverride: (path: string) =>
      ccall('BugdomSetTerrainOverride', null, ['string'], [path]),
  };
}
```

### Example control panel

```tsx
function GameControls() {
  const api = useBugdomAPI();

  return (
    <div>
      <button onClick={() => api.setFenceCollision(false)}>
        Disable Fences
      </button>
      <button onClick={() => api.setFenceCollision(true)}>
        Enable Fences
      </button>
      <button onClick={() => {
        const lvl = api.getCurrentLevel();
        alert(`Current level: ${lvl}`);
      }}>
        Show Level
      </button>
      <button onClick={() =>
        api.setTerrainOverride(':Terrain:Custom.ter')
      }>
        Use Custom Terrain
      </button>
    </div>
  );
}
```

---

## 4. Injecting Custom Terrain Files

To load user-provided `.ter` files into the game at runtime:

```tsx
async function injectTerrainFile(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const vfsPath = `/Data/Terrain/${file.name}`;

  // Write the file into Emscripten's virtual filesystem
  window.Module.FS.writeFile(vfsPath, data);

  // Set it as the active terrain override
  if (file.name.endsWith('.ter')) {
    window.Module.ccall('BugdomSetTerrainOverride', null, ['string'],
                        [`:Terrain:${file.name}`]);
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
      Upload .ter file:
      <input type="file" accept=".ter" onChange={handleFiles} />
    </label>
  );
}
```

---

## 5. Launching a Specific Level on Startup

### Option A: URL parameters

The game supports `?level=N` directly:

```
https://your-site.com/game?level=3
```

This reads `level` from the URL in Boot.cpp via `EM_ASM` and sets
`gDirectLevelNum = 3`, skipping the main menu.

### Option B: React prop

```tsx
<Bugdom level={3} />
```

This sets `window.BUGDOM_START_LEVEL = 3` before the module loads.

### Option C: Window globals

```html
<script>
  window.BUGDOM_START_LEVEL = 3;
  window.BUGDOM_TERRAIN_FILE = ':Terrain:My.ter';
  window.BUGDOM_NO_FENCE_COLLISION = true;
</script>
```

---

## 6. Important Notes

- **Single instance**: Only one Emscripten Module can run per page. Do not
  mount multiple `<Bugdom>` components simultaneously.
- **Canvas focus**: The game captures keyboard/mouse input. Call
  `canvasRef.current.focus()` to ensure the game receives input events.
- **Audio autoplay**: Browsers require a user gesture before playing audio.
  Call `Module.SDL2.audioContext.resume()` inside a click handler if audio
  doesn't start automatically.
- **Memory**: The game allocates up to 512 MB of WebAssembly memory. Ensure
  your hosting environment's `Content-Security-Policy` allows `wasm-eval`.
- **CORS**: `Bugdom.wasm` and `Bugdom.data` must be served with
  appropriate CORS headers if loaded from a different origin.
- **Cleanup**: WASM modules cannot be fully unloaded. If you need to
  restart the game, reload the page.

---

## 7. Available URL Parameters

| Parameter | Example | Description |
|---|---|---|
| `level` | `?level=3` | Start at level N (0=Training, 1=Lawn, … 9=Ant King) |
| `terrainFile` | `?terrainFile=:Terrain:Custom.ter` | Override terrain file |
| `noFenceCollision` | `?noFenceCollision=1` | Disable fence collisions |
| `dev` | `?dev` | Show developer tools panel (on the shell page) |

## 8. Exported WASM Functions

| Function | Returns | Args | Description |
|---|---|---|---|
| `BugdomSetFenceCollision` | void | (int) | Set fence collision (1=on, 0=off) |
| `BugdomGetFenceCollision` | int | () | Query fence collision state |
| `BugdomGetCurrentLevel` | int | () | Get current level number (0–9) |
| `BugdomSetTerrainOverride` | void | (string) | Override terrain file path |
