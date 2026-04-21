# Porting SDL Games to WebAssembly (Emscripten)

A comprehensive guide for porting SDL2/SDL3-based C/C++ games to run in the browser via Emscripten and WebAssembly (WASM).

## Table of Contents

1. [Overview](#overview)
2. [Build System Setup](#build-system-setup)
3. [Main Loop Architecture](#main-loop-architecture)
4. [OpenGL / WebGL Compatibility](#opengl--webgl-compatibility)
5. [Exception Handling](#exception-handling)
6. [Asset Loading & Virtual Filesystem](#asset-loading--virtual-filesystem)
7. [Audio](#audio)
8. [Input Handling](#input-handling)
9. [Memory Management](#memory-management)
10. [HTML Shell & JavaScript Integration](#html-shell--javascript-integration)
11. [Debugging & Troubleshooting](#debugging--troubleshooting)
12. [CI/CD Deployment](#cicd-deployment)
13. [Common Pitfalls](#common-pitfalls)

---

## Overview

Emscripten compiles C/C++ code to WebAssembly, which runs in the browser. SDL provides a cross-platform abstraction layer that Emscripten supports natively. However, the browser environment has fundamental differences from native platforms:

- **No blocking**: The browser's main thread must not be blocked for long periods.
- **WebGL only**: Browsers support WebGL (based on OpenGL ES 2.0/3.0), not desktop OpenGL.
- **Virtual filesystem**: There is no real filesystem; assets must be preloaded or fetched.
- **Single-threaded**: The main thread is shared with the browser UI.

## Build System Setup

### CMake Configuration

Use `emcmake` to wrap CMake so it picks up the Emscripten toolchain:

```bash
emcmake cmake -S . -B build-wasm \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SDL_FROM_SOURCE=ON \
  -DSDL_STATIC=ON
```

SDL3 must be built from source for Emscripten (static library only):

```cmake
if(EMSCRIPTEN)
    # SDL3 source must be available
    set(SDL_STATIC ON)
    add_subdirectory(extern/SDL3-source)
endif()
```

### Key Emscripten Link Flags

```cmake
if(EMSCRIPTEN)
    target_link_options(${TARGET} PRIVATE
        # ASYNCIFY: Allows blocking C loops to yield to the browser event loop.
        # Required if your game uses while-loops instead of emscripten_set_main_loop.
        "SHELL:-sASYNCIFY=1"
        # Increase stack size for complex games (default 4096 is too small).
        "SHELL:-sASYNCIFY_STACK_SIZE=65536"
        # Enable C++ exception catching (JS-based, compatible with ASYNCIFY).
        "SHELL:-sDISABLE_EXCEPTION_CATCHING=0"
        # Provide GLES2 functions for WebGL. Use FULL_ES2 (not LEGACY_GL_EMULATION)
        # when using a custom GL compat layer, to avoid conflicting emulation hooks.
        "SHELL:-sFULL_ES2=1"
        # Allow heap to grow dynamically.
        "SHELL:-sALLOW_MEMORY_GROWTH=1"
        # Initial heap size (256 MB example for a large game).
        "SHELL:-sINITIAL_MEMORY=268435456"
        # Preload game assets into the virtual filesystem.
        "SHELL:--preload-file ${CMAKE_SOURCE_DIR}/Data@/Data"
        # Export functions callable from JavaScript.
        "SHELL:-sEXPORTED_FUNCTIONS=['_main']"
        "SHELL:-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','FS']"
        # Custom HTML shell template.
        "SHELL:--shell-file ${CMAKE_SOURCE_DIR}/shell.html"
    )
endif()
```

## Main Loop Architecture

### The Problem

Browsers require the main thread to return control frequently. A traditional game loop:

```c
while (running) {
    processInput();
    update();
    render();
}
```

...will **freeze the browser tab**.

### Solution A: `emscripten_set_main_loop` (Recommended for new code)

Restructure the loop into a callback:

```c
void mainloop(void) {
    processInput();
    update();
    render();
}

int main() {
    init();
#ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(mainloop, 0, 1);
#else
    while (running) mainloop();
#endif
}
```

### Solution B: ASYNCIFY with `emscripten_sleep` (For porting existing code)

If restructuring every loop is impractical, use ASYNCIFY. This allows existing blocking loops to work by yielding to the browser:

```c
// In game.h - portable yield macro
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define GAME_YIELD_BROWSER() emscripten_sleep(0)
#else
#define GAME_YIELD_BROWSER() ((void)0)
#endif
```

Add `GAME_YIELD_BROWSER()` to **every** blocking while/do-while loop:

```c
while (gameRunning) {
    GAME_YIELD_BROWSER();  // Must be first in the loop
    processInput();
    update();
    render();
}
```

**Critical**: You must add yields to ALL blocking loops, including:
- Main game loop
- Menu loops
- Screen transition loops (fade in/out)
- Score entry loops
- Cutscene/intro loops
- Any busy-wait loops

Missing even one loop will freeze the browser.

### Solution C: SDL3 Main Callbacks (Best for SDL3)

SDL3 provides built-in callback infrastructure:

```c
SDL_AppResult SDL_AppInit(void **appstate, int argc, char *argv[]);
SDL_AppResult SDL_AppIterate(void *appstate);
SDL_AppResult SDL_AppEvent(void *appstate, SDL_Event *event);
void SDL_AppQuit(void *appstate, SDL_AppResult result);
```

SDL handles `emscripten_set_main_loop` internally.

## OpenGL / WebGL Compatibility

### WebGL Limitations

WebGL is based on OpenGL ES 2.0, which lacks:

- **Fixed-function pipeline**: No `glBegin`/`glEnd`, `glVertex`, `glColor`, etc.
- **`GL_QUADS`**: Not supported; convert to triangles.
- **`glClientActiveTexture`**: Not available.
- **Matrix stack**: No `glPushMatrix`/`glPopMatrix`.
- **Alpha test**: No `glAlphaFunc`; implement in shaders.
- **Fixed-function lighting**: Must be done in shaders.

### Approach 1: Use `LEGACY_GL_EMULATION`

Add `-sLEGACY_GL_EMULATION=1` to link flags. Emscripten provides limited emulation of legacy GL calls. This is the quickest path but has limitations and performance overhead.

**Warning**: `LEGACY_GL_EMULATION` should **not** be combined with a custom GL compatibility layer. The two will conflict: Emscripten's hooks intercept the same GL calls your macros redirect, leading to double-handling, null pointer crashes in `getCurTexUnit`, and rendering that silently produces no output (black screen). If you implement a custom compat layer (Approach 2), use `-sFULL_ES2=1` instead.

### Approach 2: Custom Compatibility Layer (Recommended for Complex Games)

Use `-sFULL_ES2=1` (provides standard GLES2 functions without legacy emulation hooks) and create a shader-based compatibility layer that intercepts legacy GL calls via macros:

```c
// gl_compat.h - Redirect legacy calls to modern implementations
#ifdef __EMSCRIPTEN__
#define glBegin(mode) ModernGL_BeginImmediateMode(mode)
#define glEnd()       ModernGL_EndImmediateMode()
#define glVertex3f(x,y,z) ModernGL_ImmediateVertex(x,y,z)
#define glColor4f(r,g,b,a) ModernGL_ImmediateColor(r,g,b,a)
// ... etc
#endif
```

Implement these with a vertex buffer + shader program.

### Custom Compat Layer: Key State Tracking Requirements

When implementing a custom GL compat layer with `-sFULL_ES2=1`, you must manually track and sync all emulated state to shader uniforms. Critical areas:

1. **Per-texture-unit `GL_TEXTURE_2D` state**: Track `glEnable(GL_TEXTURE_2D)` / `glDisable(GL_TEXTURE_2D)` separately for each texture unit. Sync to shader uniforms (`useTexture0`, `useTexture1`) before every draw call.

2. **Vertex color state**: Set a `useVertexColor` uniform when the game enables `GL_COLOR_ARRAY` via `glEnableClientState`. Both immediate mode (`glBegin/glEnd`) and vertex array draws need this.

3. **`glBlendFunc` / `glDepthMask` tracking**: WebGL's `glGetIntegerv(GL_BLEND_SRC)` and `glGetBooleanv(GL_DEPTH_WRITEMASK)` may not return correct values for state set through your compat layer. Track these in C variables and intercept the query functions.

4. **`glClientActiveTextureARB`**: This legacy function selects which texture unit receives subsequent `glTexCoordPointer` calls. Route it through your vertex array compat layer instead of making it a no-op.

5. **Sphere map reset**: When `glDisable(GL_TEXTURE_GEN_S)` or `glDisable(GL_TEXTURE_GEN_T)` is called, reset any `useSphereMap` shader uniform.

6. **Indexed draw safety**: When converting `glDrawElements` to non-indexed draws, compute `maxIndex` from the index array and use that (not `count`) to convert the source vertex arrays. Using `count` directly causes out-of-bounds reads when `count` (number of indices) exceeds the number of source vertices.

7. **Column-major matrix multiplication**: OpenGL stores matrices in **column-major** order (element `(row, col)` is at index `col*4+row`). If your compat layer emulates the matrix stack (`glPushMatrix`/`glPopMatrix`/`glMultMatrixf` etc.) and computes the MVP matrix for shaders, the matrix multiply **must** use column-major indexing. A common bug is using a row-major multiply loop:
   ```c
   // WRONG — row-major multiply on column-major data gives b*a instead of a*b
   out[i*4+j] += a[i*4+k] * b[k*4+j];
   ```
   The correct loop for column-major `out = a * b` is:
   ```c
   // CORRECT — column-major multiply: C(row,col) = sum_k A(row,k) * B(k,col)
   out[col*4+row] += a[k*4+row] * b[col*4+k];
   ```
   Getting this wrong means `MVP = ModelView * Projection` instead of `MVP = Projection * ModelView`. All 3D geometry ends up transformed to completely wrong clip-space coordinates and is invisible — you see UI (drawn with identity matrices) but **zero** 3D geometry.

8. **Sync game globals to shader state**: If the game uses global variables for transparency (`gGlobalTransparency`) or color filters (`gGlobalColorFilter`), these must be synced into the shader uniform state before every draw call. Forgetting this means effects like object fade-in/fade-out, lens flare transparency, and color tinting won't work — they'll always use the initial values (typically 1.0 / white).

9. **`glActiveTextureARB` vs `glActiveTexture` macro coverage**: Many legacy games define `glActiveTextureARB` as a function pointer (`procptr_glActiveTextureARB`) via a header like `ogl_functions.h`. If your compat layer only macro-redirects `glActiveTexture` → `CompatGL_ActiveTexture`, calls to `glActiveTextureARB` bypass the compat layer's texture-unit tracking. Fix: also `#undef glActiveTextureARB` and `#define glActiveTextureARB CompatGL_ActiveTexture` in your compat header (which must be included **after** the function-pointer header). Without this, `gCurrentTextureUnit` never updates, and per-unit `GL_TEXTURE_2D` enable/disable tracking breaks.

### WebGL Texture Format Restrictions

WebGL only supports a small set of `format`/`type` combinations for `glTexImage2D`:

| format | type | Notes |
|--------|------|-------|
| `GL_RGBA` | `GL_UNSIGNED_BYTE` | Most common |
| `GL_RGB` | `GL_UNSIGNED_BYTE` | No alpha |
| `GL_RGBA` | `GL_UNSIGNED_SHORT_4_4_4_4` | |
| `GL_RGBA` | `GL_UNSIGNED_SHORT_5_5_5_1` | |
| `GL_RGB` | `GL_UNSIGNED_SHORT_5_6_5` | |
| `GL_LUMINANCE` | `GL_UNSIGNED_BYTE` | Grayscale |
| `GL_LUMINANCE_ALPHA` | `GL_UNSIGNED_BYTE` | Grayscale+alpha |
| `GL_ALPHA` | `GL_UNSIGNED_BYTE` | Alpha only |

Desktop OpenGL combos that are **NOT supported** in WebGL:
- `GL_BGRA_EXT` + `GL_UNSIGNED_SHORT_1_5_5_5_REV` (common in Mac-era games)
- `GL_BGRA` + `GL_UNSIGNED_BYTE`
- `GL_RGB5_A1` as `internalFormat` with `GL_UNSIGNED_BYTE` data (desktop GL auto-converts; WebGL rejects)
- Mismatched `internalFormat` / `format` (e.g. `src=GL_RGBA, dest=GL_RGB` — desktop GL drops alpha silently, WebGL errors)

**Fix**: Add a texture conversion function that runs before `glTexImage2D` on Emscripten:

```c
#ifdef __EMSCRIPTEN__
static void* ConvertTextureForWebGL(const void* src, int w, int h,
                                     GLint* ioSrc, GLint* ioDest, GLint* ioType)
{
    // Convert 16-bit BGRA-1555-REV → 32-bit RGBA-8888
    if (*ioType == GL_UNSIGNED_SHORT_1_5_5_5_REV && *ioSrc == GL_BGRA_EXT) {
        uint8_t* rgba = malloc(w * h * 4);
        const uint16_t* s = src;
        for (int i = 0; i < w * h; i++) {
            uint16_t p = s[i];
            rgba[i*4+0] = ((p>>10)&0x1F) * 255 / 31;
            rgba[i*4+1] = ((p>> 5)&0x1F) * 255 / 31;
            rgba[i*4+2] = ((p>> 0)&0x1F) * 255 / 31;
            rgba[i*4+3] = (p >> 15) ? 255 : 0;
        }
        *ioSrc = *ioDest = GL_RGBA; *ioType = GL_UNSIGNED_BYTE;
        return rgba;  // caller must free()
    }
    // Force internalFormat == format (WebGL requirement)
    if (*ioType == GL_UNSIGNED_BYTE) {
        // GL_RGB5_A1 is desktop-only with UNSIGNED_BYTE data
        if (*ioDest == GL_RGB5_A1)
            *ioDest = (*ioSrc == GL_RGBA) ? GL_RGBA : GL_RGB;
        if (*ioSrc == GL_RGBA && *ioDest == GL_RGB)  *ioDest = GL_RGBA;
        if (*ioSrc == GL_RGB  && *ioDest == GL_RGBA) *ioDest = GL_RGB;
        // Catch-all: force src == dest
        if (*ioSrc != *ioDest) *ioDest = *ioSrc;
    }
    return NULL;
}
#endif
```

### Canvas Sizing for SDL3 on Emscripten

SDL3 reads the canvas element's CSS-computed dimensions when creating a window. If the canvas is hidden with `display: none` or `height: 0`, SDL will create a 0×0 drawing surface.

**Do**: Use an overlay pattern — keep the canvas visible with real dimensions, and overlay a loading card on top:

```html
<div id="game-wrap" style="position: relative;">
  <div id="loading-card" style="position: absolute; z-index: 10;">Loading…</div>
  <canvas id="canvas" width="640" height="480"></canvas>
</div>
```

When loading completes, hide the overlay:
```javascript
document.getElementById('loading-card').style.display = 'none';
```

**Don't**: Hide the canvas with `display: none`, `visibility: hidden`, `height: 0`, or any CSS that collapses its layout box before SDL creates the window.

### GL Error Queue Pollution from LEGACY_GL_EMULATION

Emscripten's `LEGACY_GL_EMULATION` internally calls `getParameter()` with enum values that WebGL doesn't support, generating `GL_INVALID_ENUM` (0x500) errors that accumulate in the GL error queue. These are harmless but will be picked up by any subsequent `glGetError()` call.

**Fix**: On Emscripten, drain the error queue in your error-checking function and return `GL_NO_ERROR`:

```c
GLenum CheckGLError(void) {
#ifdef __EMSCRIPTEN__
    GLenum err;
    while ((err = glGetError()) != GL_NO_ERROR) { /* drain */ }
    return GL_NO_ERROR;  // prevent callers from crashing
#else
    return glGetError();
#endif
}
```

Rate-limit any error logging to avoid flooding the console (thousands of errors per second during the game loop).

### OpenGL ES Context Setup

```c
#ifdef __EMSCRIPTEN__
SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
#endif
SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
```

## Exception Handling

### Critical: ASYNCIFY + Exception Compatibility

**`-fwasm-exceptions` is NOT compatible with ASYNCIFY.** If you use ASYNCIFY, you must use JS-based exception handling instead:

```cmake
# WRONG: Will cause silent failures with ASYNCIFY
if(EMSCRIPTEN)
    add_compile_options(-fwasm-exceptions)
    add_link_options(-fwasm-exceptions)
endif()

# CORRECT: JS-based exceptions, compatible with ASYNCIFY
if(EMSCRIPTEN)
    add_compile_options(-fexceptions)
    add_link_options(-fexceptions)
    target_link_options(${TARGET} PRIVATE "SHELL:-sDISABLE_EXCEPTION_CATCHING=0")
endif()
```

The `-fexceptions` flag must be set globally (before `add_subdirectory` calls) so all translation units use the same ABI.

### If You Don't Need ASYNCIFY

If using `emscripten_set_main_loop` instead of ASYNCIFY, you can safely use `-fwasm-exceptions` for better performance.

## Asset Loading & Virtual Filesystem

### Preloading Assets

Use `--preload-file` to embed assets into a `.data` file:

```cmake
"SHELL:--preload-file ${CMAKE_SOURCE_DIR}/Data@/Data"
```

This creates `Game.data` alongside the `.wasm` file. The virtual filesystem mounts files at the specified path (`/Data`).

### Large Asset Files

For games with large assets (>50MB), consider:

- **Lazy loading**: Use `--use-preload-plugins` and fetch assets on demand.
- **Compression**: The `.data` file can be gzip-compressed by the web server.
- **Splitting**: Break assets into multiple packages loaded progressively.

### Config Directory

Create the config directory in `preRun`:

```javascript
Module.preRun = [function() {
    FS.mkdir('/home');
    FS.mkdir('/home/web_user');
    FS.mkdir('/home/web_user/.config');
    FS.mkdir('/home/web_user/.config/MyGame');
}];
```

## Audio

SDL's audio backend for Emscripten uses the Web Audio API. Key considerations:

- **Autoplay policy**: Browsers block audio until user interaction. Start audio on first click/keypress.
- **ScriptProcessorNode deprecation**: SDL currently uses the deprecated ScriptProcessorNode. This produces console warnings but works fine. SDL will migrate to AudioWorklet in a future release.
- **Sample rates**: Web Audio may resample; ensure your audio files are compatible.

## Input Handling

- **Mouse capture**: `SDL_SetRelativeMouseMode` works but requires user gesture (click) to engage.
- **Keyboard**: All standard SDL keyboard events work. Be aware of browser shortcuts (Ctrl+W, etc.).
- **Gamepad**: SDL gamepad support works via the Gamepad API.
- **Touch**: SDL touch events map to browser touch events.
- **Non-passive event listeners**: SDL registers non-passive listeners for wheel/touch events to prevent default browser behavior. This produces console warnings but is necessary for game input.

## Memory Management

```cmake
# Allow heap to grow (essential for games that allocate dynamically)
"SHELL:-sALLOW_MEMORY_GROWTH=1"
# Set initial memory (must be multiple of 64KB page size)
"SHELL:-sINITIAL_MEMORY=268435456"  # 256 MB
```

If you see `Cannot enlarge memory arrays` errors, increase `INITIAL_MEMORY` or ensure `ALLOW_MEMORY_GROWTH=1` is set.

## HTML Shell & JavaScript Integration

### Custom Shell Template

Create a shell HTML file with the Emscripten Module object:

```html
<canvas id="canvas" tabindex="-1"></canvas>
<script>
var Module = {
    canvas: document.getElementById('canvas'),
    print: function(t) { console.log('[Game]', t); },
    printErr: function(t) { console.warn('[Game stderr]', t); },
    onAbort: function(what) { console.error('[Game] ABORT:', what); },
    onRuntimeInitialized: function() { console.log('Runtime ready'); },
    setStatus: function(text) { /* Update loading UI */ },
    preRun: [function() { /* Setup virtual FS */ }]
};
</script>
<script async src="Game.js"></script>
```

### Exporting C Functions to JavaScript

```c
// In C code
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
EMSCRIPTEN_KEEPALIVE void MyExportedFunction(int param) { /* ... */ }
#endif
```

```cmake
"SHELL:-sEXPORTED_FUNCTIONS=['_main','_MyExportedFunction']"
"SHELL:-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','FS']"
```

```javascript
// Call from JavaScript
Module.ccall('MyExportedFunction', null, ['number'], [42]);
```

## Debugging & Troubleshooting

### Verbose Logging

Always enable verbose logging for Emscripten builds:

```c
#ifdef __EMSCRIPTEN__
SDL_SetLogPriorities(SDL_LOG_PRIORITY_VERBOSE);
#endif
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ASYNCIFY=1 is not compatible with -fwasm-exceptions` | Using both flags | Use `-fexceptions` + `-sDISABLE_EXCEPTION_CATCHING=0` instead |
| Page freezes/unresponsive | Blocking loop without yield | Add `emscripten_sleep(0)` to all blocking loops |
| `unreachable executed` | ASYNCIFY_STACK_SIZE too small | Increase to 65536 or higher |
| `function signature mismatch` | ABI mismatch in exception handling | Ensure all TUs use same exception flags |
| `Cannot enlarge memory arrays` | Heap too small | Set `ALLOW_MEMORY_GROWTH=1` and increase `INITIAL_MEMORY` |
| Black screen, no GL errors | GL context not created | Check `SDL_GL_CONTEXT_PROFILE_ES` is set |
| 3D geometry invisible, UI works | MVP matrix wrong (column-major multiply bug) | Ensure matrix multiply uses column-major indexing: `out[col*4+row] += a[k*4+row] * b[col*4+k]` |
| `WARNING: using emscripten GL emulation` | `LEGACY_GL_EMULATION=1` active | Switch to `FULL_ES2=1` if using a custom GL compat layer. Only use `LEGACY_GL_EMULATION` if you have no custom layer. |
| Black screen with custom compat layer | `LEGACY_GL_EMULATION` conflicts with custom layer | Remove `LEGACY_GL_EMULATION`, use `FULL_ES2=1` instead |
| `texImage2D: invalid internalformat` | Desktop-only internalFormat (e.g. `GL_RGB5_A1` with `GL_UNSIGNED_BYTE`) | Add format conversion; force `internalFormat == format` for `GL_UNSIGNED_BYTE` data |
| Infinite hang at GL initialization | `glEnable`/`glDisable` macro recursion | `#undef` the macros in the compat `.c` file before the function implementations |
| `InternalError: too much recursion` | Compat layer calls itself via macro | Same as above—ensure default/passthrough cases call the real GL function |

### Browser Developer Tools

- **Console**: Check for JavaScript errors and WASM traps.
- **Network tab**: Verify `.data`, `.wasm`, and `.js` files load correctly.
- **Performance tab**: Profile to find bottlenecks in WASM execution.

## CI/CD Deployment

### GitHub Pages Workflow

```yaml
- name: Install Emscripten
  run: |
    git clone --depth=1 https://github.com/emscripten-core/emsdk.git .emsdk
    .emsdk/emsdk install latest
    .emsdk/emsdk activate latest
    source .emsdk/emsdk_env.sh

- name: Build WASM
  run: |
    emcmake cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build

- name: Assemble site
  run: |
    mkdir -p _site
    cp build/Game.html _site/index.html
    cp build/Game.js build/Game.wasm build/Game.data _site/
    touch _site/.nojekyll
```

### Important Notes

- Add `.nojekyll` to prevent GitHub Pages from processing files.
- The `.data` file can be very large (100MB+). GitHub Pages has a 1GB limit per site.
- Cache the Emscripten SDK in CI to speed up builds.

## Common Pitfalls

1. **Forgetting to yield in ALL loops**: Even one missing yield freezes the browser.
2. **Mixing `-fwasm-exceptions` with ASYNCIFY**: They are incompatible. Choose one.
3. **Not setting OpenGL ES profile**: Desktop GL calls will fail silently on WebGL.
4. **Blocking during initialization**: Long init phases block the browser. Add yields between heavy init steps.
5. **Assuming filesystem access**: All file I/O goes through Emscripten's virtual FS.
6. **Not testing with different browsers**: WebGL support varies between Chrome, Firefox, and Safari.
7. **Forgetting to set exception flags globally**: All translation units (including libraries like Pomme, SDL) must use the same exception-handling ABI.
8. **Macro-redirect recursion in GL compatibility layers**: When using `#define glEnable CompatGL_Enable` to intercept legacy GL calls, the compat implementation itself must NOT call `glEnable` in its default/passthrough case—that would recurse infinitely via the same macro. Fix: `#undef glEnable` at the top of the `.c` file that implements `CompatGL_Enable`, so the default case calls the real Emscripten-provided `glEnable`.
9. **Dual GL emulation conflict**: When both a custom GL compatibility layer AND Emscripten's `LEGACY_GL_EMULATION=1` are active, they can conflict. Ensure macros intercept all relevant calls before they reach Emscripten's emulation, and that non-intercepted calls properly fall through to Emscripten's implementations.
10. **Unsupported GL state enums**: WebGL does not support `glEnable/glDisable` with `GL_NORMALIZE`, `GL_RESCALE_NORMAL`, `GL_COLOR_MATERIAL`, `GL_TEXTURE_GEN_S/T`, or `GL_ALPHA_TEST`. A compat layer must catch these and handle them (e.g., track state internally for shader use, or silently ignore).
11. **`glIsEnabled` and `glGetFloatv` for emulated states**: When emulating `glEnable/glDisable` for unsupported states, also wrap `glIsEnabled` and `glGetFloatv(GL_CURRENT_COLOR, ...)` so push/pop state functions can query the emulated state correctly.
12. **`glPolygonMode` and `glHint(GL_FOG_HINT)`**: These don't exist in WebGL/GLES2. Redirect to no-ops.
13. **Unsupported texture formats in WebGL**: Desktop OpenGL supports `GL_BGRA_EXT` + `GL_UNSIGNED_SHORT_1_5_5_5_REV` and format mismatches (e.g. uploading RGBA pixels as RGB internal format). WebGL rejects these with `GL_INVALID_OPERATION`. Add a conversion layer that runs before `glTexImage2D` to convert to WebGL-compatible format/type combos. See [WebGL Texture Format Restrictions](#webgl-texture-format-restrictions).
14. **Canvas hidden during SDL window creation**: SDL3 on Emscripten queries the canvas's CSS dimensions when creating a window. If the canvas is hidden (`display: none`, `height: 0`), the window will be 0×0 pixels. Use an overlay pattern instead. See [Canvas Sizing for SDL3 on Emscripten](#canvas-sizing-for-sdl3-on-emscripten).
15. **GL error queue pollution**: `LEGACY_GL_EMULATION` generates spurious `GL_INVALID_ENUM` errors that accumulate in the error queue. Any `glGetError()`-based assertion will pick these up and falsely report errors from unrelated GL calls. Drain the queue on Emscripten builds. See [GL Error Queue Pollution from LEGACY_GL_EMULATION](#gl-error-queue-pollution-from-legacy_gl_emulation).
16. **`getCurTexUnit` crash from LEGACY_GL_EMULATION hooks**: When both a custom GL compat layer AND `LEGACY_GL_EMULATION` are active, the compat layer's default/passthrough case for `glEnable`/`glDisable` calls Emscripten's hooked version. Before the first draw call, the emulation's `GLImmediate.currentRenderer` is null, causing a crash in `getCurTexUnit`. Fix: bypass the hooks by calling WebGL directly via `EM_ASM({ GLctx.enable($0); }, cap)`.
17. **FULL_ES2 vs LEGACY_GL_EMULATION**: When using a custom GL compat layer with `#define glBegin`, `#define glEnable`, etc., **always** use `-sFULL_ES2=1` instead of `-sLEGACY_GL_EMULATION=1`. `LEGACY_GL_EMULATION` installs JS-side hooks on the same GL functions your macros intercept, causing double-handling and rendering to silently produce black output. `FULL_ES2` provides clean GLES2 functions without hooks.
18. **Missing `glTexCoord2fv` and similar variants**: `FULL_ES2` does not provide any legacy GL functions. Every variant (`glTexCoord2fv`, `glVertex3fv`, `glColor4fv`, `glNormal3fv`, etc.) must be macro-redirected in your compat layer. Missing even one will cause linker errors like `undefined symbol: glTexCoord2fv`.
19. **Per-texture-unit state tracking**: Desktop OpenGL tracks `GL_TEXTURE_2D` enable/disable per texture unit. A compat layer must do the same — use an array indexed by the active texture unit (set via `glActiveTexture`). Failing to do this causes textures to not appear (useTexture0/useTexture1 shader uniforms stuck at false).
20. **`GL_RGB5_A1` as internalFormat with `GL_UNSIGNED_BYTE`**: Desktop OpenGL silently accepts `glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB5_A1, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data)` and converts on the fly. WebGL rejects this with `INVALID_VALUE`. Always add a catch-all in your texture conversion function to force `internalFormat == format` when `type` is `GL_UNSIGNED_BYTE`.
21. **Column-major matrix multiply in compat layer**: When emulating the OpenGL matrix stack, the matrix multiply function **must** account for column-major storage. Using a naive `out[i*4+j] += a[i*4+k] * b[k*4+j]` loop computes the wrong matrix product (`b*a` instead of `a*b` for column-major data). This causes the MVP matrix to be wrong (`ModelView * Projection` instead of `Projection * ModelView`), making all 3D geometry invisible while 2D/UI elements (drawn with identity matrices) still appear. See [Custom Compat Layer: Key State Tracking Requirements](#custom-compat-layer-key-state-tracking-requirements) item 7.
22. **Game globals not synced to shader uniforms**: If a game uses C globals for transparency/color filter values and your shader has corresponding uniforms, you must copy the globals into the shader state struct before every draw call. Without this, shader-side transparency and color filtering always use their initial values (1.0 / white) regardless of what the game code sets.
23. **`glActiveTextureARB` bypassing compat layer**: Legacy games often define `glActiveTextureARB` as a function pointer macro. If your compat layer only redirects `glActiveTexture`, calls to `glActiveTextureARB` bypass texture-unit tracking entirely. The fix is to `#undef` and `#define` the ARB variant in the compat header as well. See item 9 under Key State Tracking Requirements.
24. **Zero-initialized matrix stacks break texture sampling**: In C, `static` matrix stacks are zero-initialized. If you have a texture matrix stack, its initial value will be the all-zeros matrix, not the identity matrix. When a shader transforms UVs with `texCoord = uTextureMatrix * vec4(uv, 0, 1)`, all texture coordinates collapse to `(0,0)`, causing every pixel to sample the corner texel. Models appear untextured (solid material color only) even though textures are correctly bound and `useTexture0` is true. Fix: ensure all matrix stacks (modelview, projection, **and texture**) are initialized to the identity matrix before first use.

---

*This guide was originally created as part of the OttoMatic WebAssembly port and adapted for Cro-Mag Rally. For the reference implementation, see the [OttoMatic-Android repository](https://github.com/LachlanBWWright/OttoMatic-Android).*
