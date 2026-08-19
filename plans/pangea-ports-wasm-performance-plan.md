# Pangea Ports WASM Performance Plan

## Scope

Review the games in `games/pangea-ports`, compare their current rendering paths,
and plan the next WASM performance work. The main target is avoiding per-frame
geometry buffer transfers in WebGL/WebAssembly builds, with profiling improvements
that make regressions and wins measurable. The plan also covers keeping the
Android ports healthy, aligning player-facing UI across ports, and making builds
easy to run consistently.

## Game Comparison

| Game | Rendering path | Current WASM bottleneck profile | Buffer-cache status |
| --- | --- | --- | --- |
| Nanosaur 2 | OpenGL compatibility layer in `Source/3D/gl_compat.c` | Terrain, static models, skeletons, particles, and UI all pass through legacy client-array emulation. | Has a 128-entry draw cache keyed by client-array pointers and draw shape. Dynamic systems call `COMPAT_GL_InvalidateCachePtr`. This is the most complete implementation. |
| Bugdom 2 | GLES3 compatibility layer in `Source/3D/GLES3Compat.c` | Similar static terrain/model pressure, plus water, fences, snake, particles, and confetti. | Has a 128-entry packed VBO/EBO cache and invalidation calls via `GLES3_InvalidateCachePtr`. Also has `GLES3_SetVertexCount` to avoid index scans. |
| Cro-Mag Rally | `Source/3D/vertex_array_compat.c` plus `modern_gl.c` | Racing scenes have high repeated terrain/track geometry and split-screen multiplies draw load. | Has a 128-entry cache and invalidation calls, but the file appears to contain both an active EMSCRIPTEN/ANDROID implementation and a native no-op `CompatGL_InvalidateCachePtr` at the end. Verify preprocessor structure before touching this path. |
| Billy Frontier | `Source/3D/vertex_array_compat.c` plus `modern_gl.c` | Smaller arena scenes than Cro-Mag, but repeated geometry and skeletons still benefit from caching. | Has the same cache family as Cro-Mag and invalidates terrain, fences, water, and skeleton buffers. |
| Otto Matic | `src/3D/vertex_array_compat.c` plus `modern_gl.c` | Still streams attribute VBOs and index buffers per draw. This is the largest remaining 3D candidate. | No draw cache found. It uses persistent VBO names, but still calls `glBufferData` every draw. |
| Nanosaur | QD3D compatibility layer in `src/QD3D/gl_compat.c` | Still streams interleaved arrays and index buffers per draw in WebGL. | No draw cache found. It has the same core WebGL limitation as Nanosaur 2 did before caching. |
| Bugdom | Custom QD3D renderer in `src/QD3D/Renderer.c` | WebGL path uploads each mesh attribute and index buffer when drawing. Mesh queueing may make caching possible at a lower level. | No draw cache found. Candidate for a renderer-specific static mesh cache rather than a generic GL1 wrapper cache. |
| Mighty Mike | Mostly 2D framebuffer path in `src/Drivers/SDLRender.c`; optional GL renderer exists. | The main WASM cost is likely indexed-framebuffer conversion plus `SDL_UpdateTexture`, not 3D geometry upload. | Geometry caching is not the primary lever. Profiling should focus on conversion, texture upload, scaling, and present. |

## Main Findings

The ports split into three optimization groups.

First, Nanosaur 2, Bugdom 2, Cro-Mag Rally, and Billy Frontier already use the
right broad strategy: cache static client-array draws into GPU buffers and
invalidate only when fixed-address CPU buffers are mutated. These games now need
verification, counters, and correctness hardening more than a new architecture.

Second, Otto Matic, Nanosaur, and Bugdom still have per-draw or per-frame
`glBufferData` paths for geometry. These should inherit the cache strategy, but
not blindly. Otto Matic can likely share the Cro-Mag/Billy `vertex_array_compat`
approach. Nanosaur can likely share the Nanosaur 2 `gl_compat` approach. Bugdom
has a custom renderer and should cache at the `MeshQueueEntry`/TriMesh level so
the renderer can preserve its sorting and pass structure.

Third, Mighty Mike is a different problem. It presents a CPU-rendered framebuffer
through SDL, so the equivalent WASM transfer is texture upload rather than mesh
upload. The priority there is measuring conversion and upload cost, then reducing
full-frame work only if profiling proves it matters.

There is also a product/platform consistency problem. Several ports have similar
WASM and Android needs, but their build scripts, menus, launch flows, debug
surfaces, and platform wrappers differ. Performance work should not deepen that
drift; each rendering improvement should leave the Android port buildable and the
browser/Android user experience more consistent, not less.

## Performance Plan

### 1. Establish Comparable Profiling

Add one shared profiling vocabulary across all games, even if each port keeps its
own local C files:

| Metric | Purpose |
| --- | --- |
| frame ms, simulation ms, render ms, present ms | Preserve existing high-level timing. |
| draw calls | Compare scene/rendering pressure across games. |
| vertices and indices submitted | Separate draw-count problems from geometry-size problems. |
| buffer upload calls | Directly track the problem being removed. |
| uploaded vertex bytes and index bytes | Quantify CPU-to-GPU traffic per frame. |
| cache lookups, hits, misses, evictions | Prove whether static geometry is actually staying resident. |
| invalidation calls and invalidated entries | Catch dynamic systems that churn the cache. |
| index-scan count and scanned index count | Detect hidden CPU work in compatibility layers. |
| immediate-mode or draw-array upload bytes | Keep dynamic UI/effects separate from cached indexed geometry. |
| UI dirty events and UI cache invalidations | Catch stale HUD and counter bugs, such as ammo or score displays not refreshing. |

The existing `profiling.c` implementations time broad phases only. Extend them
with a per-frame counter struct, reset at the same point as phase timings, and
render it in the existing debug overlay. For browser automation, also expose the
latest frame metrics through the JS game API or an Emscripten exported function.

### 2. Add Baseline Scenarios

Create repeatable browser profiling scenarios before more renderer changes:

| Game | Scenario |
| --- | --- |
| Nanosaur 2 | Level 1 flying over dense terrain; a skeleton-heavy combat moment; one multiplayer split-screen view if available. |
| Bugdom 2 | Garden terrain start; water/fence-heavy area; snake/particles area. |
| Cro-Mag Rally | Outdoor track single-player and 2-player split-screen. |
| Billy Frontier | Shootout, stampede, and duel, since scene composition differs sharply. |
| Otto Matic | First level outdoor terrain and an enemy/effect-heavy area. |
| Nanosaur | Main level start with terrain plus enemies. |
| Bugdom | Garden start and a dense mesh scene. |
| Mighty Mike | Normal gameplay with many sprites and one scaling mode stress case. |

Each run should capture at least 20 warm frames after loading, then report median,
p95, max frame time, upload bytes/frame, cache hit rate, and draw calls/frame.
Warm frames matter because first-use buffer uploads are expected and should not be
confused with steady-state frame cost.

### 3. Harden Existing Geometry Caches

For Nanosaur 2, Bugdom 2, Cro-Mag Rally, and Billy Frontier:

1. Add cache counters in the compatibility layers.
2. Confirm cache keys include every state that changes vertex interpretation:
   pointers, vertex count, index count, index type, attribute mask, color type,
   color component count, and relevant stride/state.
3. Audit dynamic geometry writes by searching for mutations of `points`,
   `normals`, `colorsByte`, `colorsFloat`, `uvs`, and `triangles` followed by
   indexed draws.
4. Keep invalidation close to the mutation site, not the draw site, so stale-data
   bugs are easier to reason about.
5. Treat UI/HUD geometry as high-risk dynamic data. Ammo counters, score digits,
   health/fuel gauges, selected weapon icons, timer digits, menu highlights, and
   any scrolling UV gauge must either stay uncached or invalidate every buffer
   they mutate: points, colors, UVs, and indices if applicable.
6. Add focused UI regression scenarios. Change ammo/weapon/score/health/fuel
   values while cache is enabled, then compare against cache-disabled rendering
   or sampled overlay pixels. This specifically guards the past failure mode
   where geometry buffers were cached correctly for world meshes but HUD elements
   stopped updating.
7. Add a debug mode that can force cache misses every frame. A scene should look
   identical with cache enabled and disabled.
8. Verify Cro-Mag Rally's duplicate-looking `CompatGL_InvalidateCachePtr`
   declarations/definitions before further work.

The target steady-state profile for mostly static scenes is near-zero indexed
geometry upload bytes after warm-up, except for explicitly dynamic systems.

### 4. Review Fixed-Function Shader Fill-Ins

The shader code is part of the same performance surface because these shaders are
replacement implementations for the original fixed-function pipeline. Before
optimizing individual ports further, compare shader behavior and remove accidental
differences.

Current comparison:

| Game family | Shader path | Notes |
| --- | --- | --- |
| Cro-Mag Rally and Billy Frontier | `Source/3D/modern_gl.c` | These files are byte-identical. Treat them as one implementation. |
| Otto Matic | `src/3D/modern_gl.c` plus `src/3D/Shaders/basic.*` | Mostly the same as Cro-Mag/Billy. The meaningful shader difference found is sphere-map handling: Otto uses `normalize(vNormal)`, while Cro-Mag/Billy re-applies `uNormalMatrix` in the fragment shader. Decide which is correct and standardize it. The other difference is profiling-counter externs, not shader behavior. |
| Nanosaur 2 | `Source/3D/gl_compat.c` | Shader fill-in is the most advanced of the Nanosaur wrappers: texture matrices, dirty uniform tracking, software texture state, and draw caching are folded into the compatibility layer. |
| Nanosaur | `src/QD3D/gl_compat.c` | Similar fixed-function emulation to Nanosaur 2, but missing the newer cache/state-tracking work. Port cache improvements carefully and compare shader semantics at the same time. |
| Bugdom | `src/QD3D/Renderer.c` | Separate renderer-level shader with a smaller QD3D-oriented feature set: texture enable, alpha test, fog, vertex colors, diffuse color, and up to two lights. It should not be forced into the modern_gl shape unless a behavior comparison proves equivalence. |

Shader review checklist:

1. Inventory fixed-function features per game: lighting count, ambient/diffuse
   handling, vertex colors, texture units, texture matrix, texture-env combine,
   sphere mapping, fog modes, alpha test, global transparency, and color filter.
2. Mark each shader difference as required game behavior, missing feature, or
   accidental divergence.
3. Prefer one shared `modern_gl` shader for the Cro-Mag/Billy/Otto family unless
   Otto has a documented need for different sphere-map math.
4. For Nanosaur and Nanosaur 2, compare output for texture matrix, sphere map,
   alpha test, fog, and multi-texture scenes before copying implementation code.
5. Add shader-state metrics to profiling: uniform uploads per frame, program
   binds, texture binds, and expensive state queries avoided.
6. Avoid shader specialization until profiling proves branchy fixed-function
   emulation is fragment-bound. The first wins should come from removing CPU-side
   geometry transfers and redundant uniform/state work.

### 5. Port the Cache to Otto Matic

Otto Matic is the clearest next win. Its `vertex_array_compat.c` already uploads
separate attribute VBOs directly, so it is structurally close to Cro-Mag/Billy.

Implementation plan:

1. Introduce a 128-entry LRU draw cache in `src/3D/vertex_array_compat.c`.
2. Key by client pointers, vertex count, index count, index type, active attribute
   mask, color type, and texture-coordinate state.
3. Store per-entry VBOs for position, normal, color, texcoord0, texcoord1, plus
   an IBO.
4. Keep `CompatGL_DrawArrays` streaming initially; most immediate-mode-like draws
   are naturally dynamic.
5. Add `CompatGL_InvalidateCachePtr` to the header and call it from terrain,
   water, fences, particles, skeleton deformation, and any effect system that
   mutates fixed-address mesh buffers.
6. Add `CompatGL_SetVertexCount` if Otto currently scans indices to infer vertex
   count.
7. Include infobar/HUD state in the first invalidation audit. Otto draws the
   infobar late in the frame, and stale counters are easy to miss if validation
   only flies through world geometry.

Do this before larger architectural renderer changes because it is low-risk and
matches already-proven ports.

### 6. Port the Cache to Nanosaur

Original Nanosaur's `src/QD3D/gl_compat.c` still streams interleaved vertex data
and element arrays. The Nanosaur 2 cache is the best reference because the wrapper
shape is similar.

Implementation plan:

1. Add a draw cache around indexed client-array draws.
2. Preserve the existing interleaved upload path for cache misses and draw-array
   paths.
3. Add cache invalidation for terrain supertile rebuilds, skeleton deformation,
   effects, UI meshes, and any fixed-address animated geometry.
4. Add a vertex-count hint for BG3D/static model draws where the caller already
   knows the point count.
5. Audit `Screens/Infobar.c` before enabling cache broadly. Score, health, fuel,
   impact-time, egg, weapon, and GPS display updates should have explicit cache
   behavior.
6. Use the profiling counters to confirm warm steady-state uploads drop sharply.

### 7. Add a Renderer-Level Cache to Bugdom

Bugdom's custom renderer queues meshes and then sends geometry through
`VertexAttribVBO` and `DrawElementsVBO`. A generic GL wrapper cache is less
attractive here because the renderer already sees mesh identity.

Implementation plan:

1. Add a GPU cache keyed by the `TQ3TriMeshData` pointer and the arrays used for
   position, normal, color, texcoord, and triangles.
2. Store VBOs/EBOs per cached mesh.
3. Add dirty/invalidation hooks when mesh data is rebuilt or modified.
4. Keep transient/generated meshes streaming.
5. Keep infobar texture updates separate from mesh caching. Bugdom already tracks
   dirty rectangles for the infobar texture; a mesh cache must not mask texture
   updates or dynamic UI quads.
6. Instrument the mesh queue to report queued meshes, cached mesh hits, and upload
   bytes by pass.

This should reduce repeated uploads while preserving Bugdom's existing draw
ordering and multi-pass shading behavior.

### 8. Treat Mighty Mike Separately

For Mighty Mike, first add measurements around:

1. `ConvertFramebufferMT`
2. `SDL_UpdateTexture`
3. `SDL_RenderTexture`
4. `SDL_RenderPresent`

Then decide whether to optimize. Candidate changes are dirty-rect texture updates,
worker-assisted indexed-to-RGBA conversion, lower-cost scaling modes on WebGL, or
a shader palette path that uploads an indexed texture plus palette. Those are only
worth doing if profiling shows the full-frame texture path is the limiting cost.

### 9. Re-Implement and Maintain Android Ports

Keep Android as a first-class target while improving WASM. The current Android
folders should be reviewed as platform wrappers around the same core game code,
not one-off forks that slowly diverge.

Android plan:

1. Inventory each Android project: Gradle version, Android plugin version, NDK
   version, SDL dependency, Java/Kotlin activity wrapper, native library build,
   asset packaging, signing/debug setup, and controller/touch input support.
2. Define a shared Android wrapper contract for all 3D ports: lifecycle handling,
   pause/resume audio, GL context creation, fullscreen/immersive mode, safe-area
   handling, gamepad input, touch affordances, save-data location, and crash/log
   output.
3. Re-implement ports that have drifted too far from the shared contract rather
   than patching each independently. The goal is a thin per-game Android project
   with shared conventions and minimal game-specific platform code.
4. Keep rendering compatibility code common in behavior across WASM and Android.
   Cache invalidation, shader semantics, texture state, and profiling counters
   should be validated on both platforms.
5. Add Android smoke tests or scripted launch checks where possible: app starts,
   reaches menu, enters gameplay, renders non-black frames, responds to input,
   pauses/resumes, and exits cleanly.
6. Track Android performance separately from WASM. Android may benefit from the
   same cache work, but GL driver behavior differs enough that the profiling
   output should identify platform, device, renderer, and build type.

### 10. Align User Interface Across Ports

The games should keep their original in-game identity, but platform-level UI
should be consistent so users do not have to relearn each port.

Shared UI plan:

1. Standardize the launch/menu shell across ports: start game, continue, settings,
   controls, credits/about, quit/back behavior, and direct level/test entry where
   supported.
2. Standardize settings names and behavior: resolution/canvas scale, fullscreen,
   render quality, audio/music/effects volume, gamepad settings, mouse/touch
   sensitivity, accessibility toggles, and debug/profiling overlays.
3. Keep debug and profiling UI consistent: same hotkey/menu entry, same metric
   names, same ordering, and same units on WASM and Android.
4. Standardize browser-facing controls: query parameters, JS game API names,
   cheat/test hooks, level override hooks, and profiling export.
5. Standardize Android-facing controls: back button behavior, pause handling,
   gamepad mapping, touch controls where needed, and settings persistence.
6. Make all platform overlays visually consistent and well-spaced. Profiling,
   debug, pause, settings, cheat/test, touch-control, and browser integration
   overlays should use the same margins, padding, typography scale, contrast,
   row spacing, safe-area handling, and z-order rules across ports.
7. Size overlays for the actual target surfaces. They must be readable on phones,
   tablets, desktop browsers, and high-DPI devices without covering core gameplay
   or HUD information unnecessarily. Long metric names and values should wrap or
   truncate predictably rather than overlapping.
8. Conform virtual controls to platform standards. Touch targets should meet
   Android accessibility sizing expectations, stay inside safe areas, support
   left/right-handed layouts where relevant, avoid edge gesture conflicts, and
   use familiar analog stick, D-pad, button, pause, and menu affordances.
9. Keep virtual controls visually compatible across games while allowing
   game-specific actions. Controls should share placement, opacity behavior,
   pressed states, labels/icons, dead-zone behavior, and settings names unless a
   game has a documented reason to differ.
10. Preserve game-specific HUD art and gameplay UI, but document dynamic HUD
   update points as part of the cache invalidation audit.
11. Add screenshots or automated visual checks for shared UI states: main menu,
   settings, pause menu, profiling overlay, virtual controls, and one gameplay HUD
   state at phone, tablet, and desktop viewport sizes.

### 11. Make Builds Easy and Repeatable

The repo should provide a small set of reliable commands that build every target
without needing to remember per-game quirks.

Build script plan:

1. Keep `scripts/build-pangea-ports.sh` as the top-level entry point, but make its
   contract explicit: list games, build one game, build all games, choose target
   (`wasm`, `android`, optionally `desktop`), choose configuration, clean, and
   output paths.
2. Add per-game build metadata so scripts do not encode paths and special cases
   in shell logic. The metadata should cover source directory, build directory,
   dist directory, CMake/Gradle target, asset copy rules, and supported platforms.
3. Add dry-run and verbose modes. Dry-run should print the exact steps and output
   locations without building.
4. Add environment checks up front: Emscripten SDK, CMake, Ninja/Make, Java,
   Android SDK, NDK, Gradle, Node/Playwright for browser smoke tests.
5. Make build output predictable: each game/target writes to a consistent
   `dist`/`dist-wasm`/Android artifact location and prints the artifact path at
   the end.
6. Add smoke-test commands after build: launch WASM in a browser harness, collect
   profiling counters, run Android install/launch when a device is connected, and
   capture a screenshot/non-black-frame check.
7. Document common workflows in `games/pangea-ports/README.md`: build all WASM
   ports, build one Android APK, run profiling scenario, clean generated output,
   and troubleshoot missing SDK/toolchain issues.
8. Keep CI aligned with local scripts so a passing local command means the same
   thing as a passing GitHub Action.

## Acceptance Criteria

For each 3D game after optimization:

1. Warm steady-state indexed geometry upload bytes are near zero for static scenes.
2. Dynamic systems still render correctly with cache enabled.
3. UI/HUD changes render correctly with cache enabled, including ammo or weapon
   counters, score, health, fuel, timers, menu highlights, and UV-scrolled gauges.
4. Cache-disabled debug mode renders the same scene.
5. Profiling overlay exposes draw calls, upload calls, upload bytes, cache hit
   rate, cache evictions, and invalidations.
6. Browser automation records median and p95 frame time plus upload metrics for at
   least one repeatable scenario.
7. Shader behavior differences are documented as intentional or removed.
8. Android builds still compile and can launch after rendering-layer changes.
9. Shared platform UI states behave consistently across ports.
10. UI overlays are well-spaced, readable, safe-area aware, and do not overlap
    critical game HUD or controls at supported viewport/device sizes.
11. Virtual controls follow Android/touch control sizing and interaction
    conventions while remaining visually consistent across ports.
12. Build scripts can build one port or all ports for WASM and Android with clear
    artifact paths.
13. No quality settings are reduced to hide performance issues.

## Recommended Order

1. Add shared-style profiling counters to the four games that already have caches.
2. Build browser profiling scripts and capture baselines.
3. Add UI/HUD invalidation tests for cached games before changing more cache code.
4. Compare and normalize fixed-function shader fill-ins where differences are not
   game-specific.
5. Harden and verify existing caches.
6. Port the cache to Otto Matic.
7. Port the cache to original Nanosaur.
8. Add Bugdom's renderer-level mesh cache.
9. Review Android wrapper drift and define the shared Android contract.
10. Align shared menus/settings/debug/profiling UI across ports.
11. Normalize build scripts and metadata for WASM and Android.
12. Profile Mighty Mike and decide whether texture-upload optimization is necessary.
