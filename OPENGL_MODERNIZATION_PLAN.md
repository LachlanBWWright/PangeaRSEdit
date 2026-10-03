# Pangea game rendering modernization plan

## Goal and platform target

Move each port toward a shader based renderer that can support better depth aware effects, including soft particles that fade where they meet world geometry (often called z feathering). A context version change alone does not implement these effects: the renderer must expose scene depth to the effect shader and preserve correct depth, blend, and draw order.

There is no single newest OpenGL version that works across desktop, browsers, and Android. Use **OpenGL 3.3 core as the desktop baseline where supported**, **OpenGL ES 3.0 on Android**, and **WebGL 2 in browsers**. A platform may use a newer context after feature checks, but game rendering must work on these baselines. WebGL 2 corresponds broadly to ES 3.0, not desktop OpenGL 4.6. Preserve a fallback only where a supported target genuinely needs it; record that target and test it. Do not request a core profile until all active draw paths for that build have stopped calling removed fixed function APIs.

## Parallel agent contract

Assign **one agent per row** below. Each agent owns only its named game directory and reports its findings and changed files. Agents can work simultaneously without editing shared files. If a shared build script or common interface must change, describe the proposed change in the handoff and let one integration agent apply it after the game branches are ready. Do not edit `games/originals/` or any `games/pangea-ports/games/*/extern/Pomme/`. Do not commit. Follow the root `AGENTS.md` for all changes.

Each game agent should complete these steps in order:

1. **Inventory:** Record the requested and actual GL context/profile for desktop, Android, and WASM; shader language version; renderer entry point; use of fixed function calls, client arrays, immediate mode, framebuffers, and alpha effects. Search the game source and its `CMakeLists.txt`. Treat build flags and comments as clues, then verify the created context at runtime.
2. **Baseline:** Capture a representative scene screenshot and frame timing on every available target. Record missing target environments instead of guessing. Include UI, transparent effects, terrain, and context creation/recreation where relevant.
3. **Modernize the renderer:** Make the ES 3.0/WebGL 2 path explicit, compile shaders suitable for that context, and replace legacy calls that prevent a core profile. Keep existing matrix, lighting, fog, texture, and alpha behavior visually equivalent. Use VBOs/VAOs and preserve the existing cache invalidation rules for mutable meshes.
4. **Add depth aware feathering where useful:** Render opaque geometry into a depth texture attached to the scene framebuffer, then render selected translucent effects with depth sampling. Compare linearized scene depth with particle depth using the same projection and viewport; apply a clamped fade distance to alpha. Avoid reading a depth attachment while it is attached to the framebuffer being written: use a separate pass, depth copy/blit, or another legal read/write arrangement. Keep the existing effect path for unsupported or inappropriate scenes.
5. **Verify:** Check shader compile/link logs, framebuffer completeness, resize, fullscreen, context recreation, depth precision, alpha sorting, UI overlays, and performance. Compare effects on/off and cached/forced-cache-miss rendering where that mode exists. Deliver screenshots and measurements plus a short list of remaining limitations.

Depth feathering is an **effect feature**, not a blanket change to every translucent surface. Start with smoke, dust, sparks, glow, or similar intersection artifacts. Do not apply it blindly to HUD, hard cutout foliage, water, or glass. Preserve near/far plane handling and split-screen viewport coordinates. Guard the extra depth pass by a quality setting if measurements show a meaningful cost.

## Independent game assignments

| Agent / game directory | Existing entry points and first investigation | Game-specific result |
| --- | --- | --- |
| **Billy Frontier** `BillyFrontier-Android` | `Source/Boot.cpp`, `Source/3D/modern_gl.c`, `Source/3D/vertex_array_compat.c`, `Source/3D/state_compat.c`, `CMakeLists.txt`. The browser build already requires WebGL 2, but the boot path requests an ES 2 context. | Align context, shaders, and compatibility layer with ES 3/WebGL 2; test shootout, stampede, duel, and sparkle/glow intersections. |
| **Bugdom** `Bugdom-android` | `src/Boot.cpp`, `src/QD3D/Renderer.c`, `CMakeLists.txt`. Custom QD3D renderer and mesh cache; browser build allows WebGL 2. | Modernize the renderer itself and its scene target; test terrain, water, foliage, particles, and sprite overlays. Preserve the QD3D mesh cache. |
| **Bugdom 2** `Bugdom2-Android` | `Source/Boot.cpp`, `Source/3D/GLES3Compat.c`, `Source/3D/OGL_Support.c`, `CMakeLists.txt`. ES 3 shader compatibility layer already exists. | Confirm actual ES 3/WebGL 2 context and finish depth texture/effect integration; test garden, water/fences, snake, particles, and HUD. |
| **Cro-Mag Rally** `CroMagRally-Android` | `Source/Boot.cpp`, `Source/3D/modern_gl.c`, `Source/3D/vertex_array_compat.c`, `CMakeLists.txt`. Boot requests ES 3, while CMake permits a WebGL 1 minimum. | Decide and enforce the supported browser minimum, then make shader/context behavior match it; test track effects in single player and split-screen, including each viewport's depth sampling. |
| **Mighty Mike** `MightyMike-Android` | `src/Boot.cpp`, `src/Drivers/SDLRender.c`, optional GL presentation driver, `CMakeLists.txt`. Gameplay primarily presents a CPU rendered 2D framebuffer; browser minimum is WebGL 2. | Modernize only the active presentation path if needed. Measure conversion/upload/scale/present; document that z feathering is inapplicable unless actual layered 3D effects are added. |
| **Nanosaur** `Nanosaur-android` | `src/Boot.cpp`, `src/QD3D/gl_compat.c`, `CMakeLists.txt`. Compatibility shaders use GLSL ES 1.00 and boot requests ES 2, though WebGL 2 is allowed. | Port the QD3D compatibility shader/path to ES 3/WebGL 2, preserving terrain and model cache behavior; test terrain, enemies, particles, and UI. |
| **Nanosaur 2** `Nanosaur2-Android` | `Source/Boot.cpp`, `Source/3D/gl_compat.c`, `Source/3D/OGL_Support.c`, `CMakeLists.txt`. Browser build requires WebGL 2 and boot requests ES 3, but compatibility shader source still uses GLSL ES 1.00. | Update shader features and scene depth path without breaking terrain cache, fog, water, and effects; test jungle, combat, flying, and any stereo or split view. |
| **Otto Matic** `OttoMatic-Android` | `src/Boot.cpp`, `src/3D/modern_gl.c`, `src/3D/vertex_array_compat.c`, `src/3D/state_compat.c`, `CMakeLists.txt`. Existing WebGL modernization is described in `docs/WEBGL_MODERNIZATION.md`; verify current platform branches rather than assuming the document reflects current code. | Align browser/Android context and shader versions, then add depth aware effects to a terrain/effects scene while preserving existing animated textures and mesh cache behavior. |

All paths in the table are relative to `games/pangea-ports/games/`.

## Integration order and acceptance

Game agents work in parallel. The integration agent reviews each handoff for profile/shader compatibility, consistent effect controls, and evidence that no changes crossed another game's ownership boundary. Integrate one game at a time so regressions remain attributable. A game is done when its supported targets create the intended context, representative scenes match baseline except for intentional effect improvements, depth feathering works where selected, and measured frame time remains acceptable. For Mighty Mike, completion means the presentation path is verified and the absence of a depth effect is documented.

Existing cache behavior and profiling context: `games/pangea-ports/docs/webgl-performance-optimizations.md` and `plans/pangea-ports-wasm-performance-plan.md`. Those documents may describe earlier states; verify current source before making changes.
