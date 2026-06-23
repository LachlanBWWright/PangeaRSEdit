# Per-Game Lua Scripting and Editor IntelliSense Plan

## Purpose

Complete the Lua migration by defining the work that belongs in each game rather than relying on the shared scripting host to infer eight different game models.

The shared host should own Lua execution, sandboxing, common value conversion, object handles, configuration parsing, and common status reporting. Each game must own its lifecycle semantics, supported hooks, object categories, native operations, level metadata, asset requirements, and editor-facing API description.

This plan also replaces the current snippets-only Monaco integration with actual Lua IntelliSense.

## Findings From the Current Changes

The current branch has made a useful start, but it is not yet a complete Lua implementation:

- `shared/script/pangea_script_backend_lua.c` implements common hook dispatch and common API tables.
- Native CMake builds use a system Lua 5.4 installation when found.
- Emscripten still selects `pangea_script_backend_emscripten.c`, which is the JavaScript backend. Browser previews therefore do not yet execute the new Lua source.
- No per-game `ScriptBindings.c` file has been changed as part of the Lua work.
- Most per-game adapters share nearly identical wrappers even where the games have different lifecycle and coordinate models.
- The shared Lua context currently omits important game-specific fields such as game ID, area mode, player mode, race mode, network state, and useful level names.
- The frontend now labels files as Lua, but `scriptMonaco.ts` still starts the TypeScript worker, configures TypeScript compiler defaults, and feeds Lua annotation text to `typescriptDefaults.addExtraLib`.
- The registered Lua completion provider still inserts TypeScript syntax such as `export function`, typed parameters, object literals, and semicolons.
- The generated Lua annotation files only declare broad `table` fields, so they cannot provide meaningful member completion or diagnostics.
- The editor advertises race and game-specific hooks that the shared C hook enum and per-game call sites do not currently invoke.

The migration should not remove shared code. It should narrow shared code to mechanics and make each game publish an explicit scripting contract.

## Required Architecture Boundary

### Shared host responsibilities

- Own and sandbox the Lua VM.
- Load modules and call hooks safely.
- Enforce memory and instruction budgets.
- Convert common scalar, vector, handle, and array values.
- Manage object handles and invalidation.
- Parse common package/config envelopes.
- Report structured errors and runtime status.
- Provide common APIs only when their semantics are genuinely common.

### Per-game responsibilities

Each game must provide a `PangeaScriptGameAdapter` containing:

- stable game ID and display name
- game-specific lifecycle callback mapping
- level/area/track identity and display metadata
- game mode and multiplayer state
- coordinate-system description
- supported hook bitset
- object category and capability registry
- native spawn registry and implementations
- asset dependency validation/loading
- player lookup
- deterministic random source where scripting is allowed
- game-specific read and mutation operations
- API metadata used to generate editor annotations

The shared host must not claim a hook or API is available merely because another game implements it.

## Common Per-Game Refactor

Before handling individual games, refactor the eight adapters to a consistent structure:

```text
Scripting/
  ScriptBindings.c
  ScriptBindings.h
  ScriptAdapter.c
  ScriptAdapter.h
  ScriptCapabilities.c
  ScriptCapabilities.h
  ScriptNativeItems.c
  ScriptNativeItems.h
```

Small games may combine files where practical, but lifecycle wiring, capability data, and native item implementations should not remain one large generic-looking file.

For every game:

1. Define an explicit context struct for its actual game model.
2. Populate all context fields at the real lifecycle call site.
3. Register only objects with known-safe operations.
4. Give every registered object a stable native ID, category, and capability level.
5. Implement native spawn functions or mark native spawning unsupported.
6. Validate required models, skeletons, sprites, terrain state, and globals before spawning.
7. Add game-specific fixture scripts and C-level tests.
8. Export the same capability data to runtime status and editor metadata.
9. Verify native and WASM preview behavior with the same Lua fixture.

## Otto Matic

Otto Matic currently has the deepest special-case integration, especially for human rescue targets.

Required changes:

- Add `playerMode` (`robot` or `saucer`) to level, frame, and object contexts.
- Expose level identity and the active mission type.
- Preserve the human subtype tags for farmer, bee woman, scientist, and skirt lady.
- Replace human-only visual offset special handling with a documented object-frame result contract that can also serve other safe objects.
- Audit whether object-frame callbacks run once or twice for humans when both global and attached behaviors are enabled.
- Register the player robot and saucer with distinct tags and appropriate capabilities.
- Implement or explicitly reject native spawn IDs for humans, power-up pods, checkpoints, and teleporters after checking their level asset dependencies.
- Add item-specific annotations for human subtype, rescue state, and supported mutations.
- Test robot levels, saucer levels, human rescue behavior, terrain items, and spline items.

Editor contract:

- Suggest `playerMode` only for Otto Matic contexts.
- Offer human tags and native spawn IDs only when Otto Matic is selected.
- Document which objects support visual offset versus full position mutation.

## Bugdom

Bugdom uses `gRealLevel`, has terrain and spline items, and registers a limited set of pickups and skeleton objects.

Required changes:

- Treat `gRealLevel` as the authoritative script level ID and document any difference from internal level indexes.
- Add level names and environment/biome metadata where it affects item compatibility.
- Audit player registration across death, respawn, ball mode, and level transitions.
- Expand object registration deliberately for enemies, buddies, pickups, checkpoints, and hazards.
- Define safe native operations for clovers, nuts, checkpoints, and selected enemies.
- Validate skeleton and model group dependencies before cross-level spawning.
- Confirm terrain and spline hook ordering relative to native item dispatch and “item in use” flags.
- Add tests for a normal terrain level, a spline-bearing level, player recreation, and level completion/unload.

Editor contract:

- Publish Bugdom level names, object tags, native item IDs, and dependency notes.
- Do not suggest APIs for object properties that the Bugdom adapter cannot read or mutate.

## Bugdom 2

Bugdom 2 is the best first complete vertical slice because it already has level asset dependency loading and several registered object types.

Required changes:

- Move asset dependency interpretation from generic assumptions into the Bugdom 2 adapter.
- Define typed dependency kinds for skeletons, model groups, sprites, and level-specific systems.
- Complete native spawn implementations for a narrow supported set such as D-cells, acorns, powerups, and glider parts.
- Register player, pickups, enemies, buddies, projectiles, and triggers with distinct capabilities.
- Add level timer and relevant player-state fields to frame contexts.
- Verify object cleanup through death, level restart, and boss transitions.
- Add collision/damage hooks only after identifying safe engine call sites; do not advertise them before then.
- Use Bugdom 2 as the reference implementation for per-game metadata generation and end-to-end Lua tests.

Editor contract:

- Generate precise Bugdom 2 item IDs and context types.
- Provide hover documentation for each dependency and capability restriction.
- Validate native spawn IDs and options statically through LuaLS aliases and overloads.

## Nanosaur

Nanosaur has simpler terrain-only item scripting but multiple level startup/reload paths in `System/Main.c`.

Required changes:

- Consolidate repeated load/start/frame/unload wiring into one game-owned lifecycle state machine.
- Ensure each logical level load emits hooks exactly once, including restart and direct-launch paths.
- Add player state relevant to scripts: health, fuel, jetpack state, weapon, and egg objective progress where safe.
- Register eggs, crystals, powerups, enemies, and the player with explicit capabilities.
- Keep spline hooks unsupported unless the game adds a real spline call site.
- Define native spawn support for eggs, crystals, and selected powerups only after dependency checks.
- Verify coordinate and terrain-height conventions for spawned objects.
- Add tests for normal startup, direct launch, restart, completion, and unload.

Editor contract:

- Do not expose `onSplineItem`.
- Provide Nanosaur-specific player and objective context fields.
- Offer only terrain-item and supported object hooks.

## Nanosaur 2

Nanosaur 2 combines adventure and multiplayer game modes. A generic level context is insufficient.

Required changes:

- Add explicit mode values for adventure, race, battle, and capture-the-egg.
- Add `networked`, local player number, player count, and host authority fields.
- Split simulation-affecting capabilities from read-only/cosmetic capabilities.
- Disable mutation, spawning, remapping, and simulation callbacks in network matches until deterministic scripting is implemented.
- Ensure duplicate `OnLevelStart` and frame paths represent distinct modes intentionally and cannot double-fire.
- Register each player separately and include player ownership/locality metadata.
- Define mode-specific object categories for eggs, weapons, vehicles/player dinosaurs, projectiles, and objectives.
- Add deterministic script/config hashes before enabling scripts in peer simulation.
- Test adventure, local race/battle, and network-disabled behavior separately.

Editor contract:

- Narrow available hooks and APIs based on selected mode and network state.
- Mark unavailable simulation APIs as errors, not warnings, for network projects.
- Expose player ownership and mode-specific context types.

## Cro-Mag Rally

Cro-Mag Rally is race-centric and calls terrain hooks per player. Its contract should not masquerade as a generic adventure-level API.

Required changes:

- Replace generic level hook naming with race load, race start, race frame, race finish, and race unload semantics.
- Add race mode, track name, lap count, checkpoint count, local player, player count, and network state.
- Implement real call sites for checkpoint, lap-complete, powerup-collected, and race-finish hooks before exposing them to scripts.
- Make the per-player terrain item behavior explicit, including whether a handled result applies globally or only to one player.
- Register cars, submarine players, pickups, tokens, hazards, and track triggers with separate capabilities.
- Keep simulation mutation disabled in network races until deterministic synchronization exists.
- Add local split-screen and network-specific tests.

Editor contract:

- Offer race hooks only when their native call sites exist.
- Document per-player terrain context and authority restrictions.
- Provide track and powerup aliases specific to Cro-Mag Rally.

## Billy Frontier

Billy Frontier has four substantially different area modes with separate loops.

Required changes:

- Add explicit mode values for duel, shootout, stampede, and target practice.
- Replace the generic `onAreaStart` abstraction with either mode-specific hooks or one area hook carrying a required discriminated mode field.
- Supply real elapsed area time instead of the current constant `0.0f`.
- Consolidate lifecycle wiring across the four area source files to guarantee consistent ordering.
- Register mode-specific players, enemies, targets, stampede entities, projectiles, pickups, and objectives.
- Define which item and spline hooks apply in each mode.
- Implement native spawn IDs per mode rather than globally.
- Add tests for every mode, including successful completion and early exit.

Editor contract:

- Narrow contexts by mode so duel-only fields are not suggested in stampede scripts.
- Filter hooks, native item IDs, tags, and templates using the selected area mode.

## Mighty Mike

Mighty Mike is not another 3D `ObjNode` game. It uses 2D/fixed-step gameplay, scene/area identity, map items, and a different object manager.

Required changes:

- Create dedicated 2D vector and map item context types rather than adapting common 3D terrain contexts.
- Expose `sceneNum`, `areaNum`, scene name, area name, and a stable combined area ID.
- Document coordinate units, fixed-point conversion, origin, and Y-axis direction.
- Keep the fixed `1/32` frame delta explicit and provide accumulated area time.
- Audit player replacement and registration across character/state transitions.
- Define 2D object operations separately from 3D transform APIs.
- Implement map-item handling semantics, including whether handled items remain consumed or can respawn.
- Validate sprite, shape, inventory, and objective dependencies for bunny, health, and key spawning.
- Avoid advertising terrain, spline, velocity-Z, or 3D position APIs.
- Add tests for map loading, area transitions, player replacement, item handling, and fixed-step object callbacks.

Editor contract:

- Provide `Vector2`, `MikeMapItemContext`, and 2D object APIs.
- Make 3D-only members unavailable to LuaLS, not merely documented as unsupported.
- Suggest scene/area hooks and map item IDs only.

## Shared Runtime Corrections Required by Per-Game Work

The game work depends on several corrections in the shared layer:

1. Vendor and pin Lua rather than relying on a system Lua package.
2. Compile the same Lua backend into Emscripten; remove the JavaScript backend from Lua previews.
3. Add a game adapter pointer and game-owned context builder callbacks to `PangeaScriptGameInfo`.
4. Extend the hook model so games can define supported lifecycle events without pretending all games share one sequence.
5. Add structured API failures rather than boolean-only failures.
6. Enforce stack restoration, protected calls, allocator limits, and instruction budgets.
7. Add module loading under `Data/Scripts` with traversal prevention.
8. Add a capability query that returns the selected game's actual runtime contract.
9. Make context/result parsing strict enough to report malformed Lua return records.
10. Generate editor metadata from the same per-game capability definitions used by the runtime.

## IntelliSense Architecture

### Current problem

Changing Monaco's completion provider language from `"typescript"` to `"lua"` does not provide Lua IntelliSense. The TypeScript worker cannot interpret Lua files or LuaLS annotations.

Proper IntelliSense requires:

- Lua syntax diagnostics
- semantic diagnostics
- member completion
- hover documentation
- signature help
- go-to-definition
- find references
- document/workspace symbols
- rename
- project-aware `require` resolution

### Recommended implementation

Use Monaco as an LSP client connected to LuaLS:

```text
Monaco Lua models
       |
monaco-languageclient
       |
WebSocket JSON-RPC
       |
isolated backend workspace
       |
pinned LuaLS process
```

The .NET backend should authenticate the WebSocket, allocate an isolated workspace, start or reuse a bounded LuaLS process, synchronize virtual files, and clean up idle sessions.

Do not call snippets and manually registered completion items “IntelliSense.” Keep snippets as an additional authoring convenience.

### Frontend work

Replace `scriptMonaco.ts` with focused modules:

```text
scripts/language/
  configureLuaLanguage.ts
  createLuaLanguageClient.ts
  synchronizeLuaWorkspace.ts
  buildLuaAnnotations.ts
  registerLuaSnippets.ts
  mapLuaDiagnostics.ts
  luaLanguageServiceState.ts
```

Actions:

1. Remove the TypeScript worker and all `typescriptDefaults` configuration from the script editor.
2. Register Lua syntax support and create stable Monaco model URIs under `file:///workspace/Data/Scripts/src/`.
3. Synchronize create, update, rename, and delete operations to LuaLS.
4. Send `workspace/didChangeConfiguration` for Lua 5.4, annotation support, and project module paths.
5. Add generated type files as real virtual workspace files, not TypeScript extra libraries.
6. Map LuaLS diagnostics to the existing workspace diagnostic UI.
7. Keep runtime errors separate from static diagnostics.
8. Show connection states: connected, reconnecting, and semantic IntelliSense unavailable.
9. Dispose models, providers, sockets, and sessions when the editor/workspace closes.
10. Preserve source locally while reconnecting so an LSP outage cannot lose edits.

### Generated Lua annotations

Generate one common file and one selected-game file:

```text
Data/Scripts/types/pangea.lua
Data/Scripts/types/games/<game-id>.lua
```

Use LuaLS annotations including:

- `---@class`
- `---@field`
- `---@alias`
- `---@enum`
- `---@param`
- `---@return`
- `---@overload`
- `---@generic`
- `---@nodiscard`

The generated game file must contain only APIs supported by that game and selected mode. For example:

- Mighty Mike receives `Vector2` and map APIs, not 3D terrain APIs.
- Nanosaur receives no spline hook.
- networked Cro-Mag and Nanosaur 2 projects omit simulation mutation APIs.
- Billy Frontier receives mode-narrowed area contexts.

### Single source of truth

Introduce a validated, language-neutral scripting metadata model in the frontend or generated build assets:

- game ID
- modes
- hook definitions
- context records
- object categories and tags
- API functions
- native spawn IDs and options
- capability restrictions
- documentation

Parse this metadata with Zod before using it. Generate:

- LuaLS annotation files
- Monaco snippets
- capability matrix rows
- editor forms and selectors
- package validation rules
- human-readable scripting documentation

The C runtime should export or be checked against the same metadata so editor promises cannot drift from game behavior.

## Backend LuaLS Service

Add a small application boundary around LuaLS rather than exposing arbitrary server processes.

Required controls:

- authenticated workspace/session IDs
- per-user session count limits
- source file count and total byte limits
- message size limits
- CPU, memory, and idle time limits
- isolated temporary directories
- normalized relative paths only
- no access to repository or host files
- pinned LuaLS version and configuration
- cleanup after disconnect and server failure

All backend failures should return typed application results and structured WebSocket errors. LuaLS process failures must not terminate the API host.

## Testing

### Per-game contract tests

Every game needs fixtures that assert:

- lifecycle hook order
- context fields and game/mode identity
- supported and unsupported hooks
- terrain, spline, or map result handling
- player registration and replacement
- object handle invalidation
- native spawn success and dependency failure
- level/area/track restart and unload
- Lua errors remain non-fatal

### IntelliSense tests

Add browser tests that open each game editor and verify:

- `pangea.` returns game-valid members
- context completion includes game-specific fields
- unsupported hooks produce diagnostics
- hover includes capability and dependency documentation
- definition and references work across two Lua modules
- rename updates project files
- Mighty Mike rejects 3D APIs
- Nanosaur rejects spline hooks
- networked race projects reject simulation mutation
- LSP reconnect restores semantic features without losing source

### Runtime/editor conformance

For each game, derive an expected capability snapshot from runtime metadata and compare it with the generated Lua annotations. CI must fail if the editor exposes a hook, API, tag, or native item absent from the game adapter.

## Delivery Order

1. Correct the shared Lua build so native and WASM use the same vendored runtime.
2. Define the per-game adapter and metadata interfaces.
3. Complete Bugdom 2 as the reference vertical slice.
4. Implement Monaco-to-LuaLS integration and generated Bugdom 2 annotations.
5. Complete Otto Matic and Bugdom.
6. Complete Nanosaur and its restart/direct-launch lifecycle audit.
7. Complete Billy Frontier with mode-specific contexts.
8. Complete Mighty Mike with dedicated 2D APIs.
9. Complete Nanosaur 2 and Cro-Mag Rally with network restrictions.
10. Add cross-game runtime/editor conformance gates.
11. Remove TypeScript-worker and JavaScript-backend remnants only after all gates pass.

## Completion Gates

- [ ] All eight games define explicit adapter metadata.
- [ ] Every advertised hook has a real per-game native call site.
- [ ] Every advertised API has a per-game implementation and failure contract.
- [ ] Native spawn registries have dependency validation.
- [ ] Mighty Mike uses dedicated 2D contracts.
- [ ] Billy Frontier contexts discriminate all four modes.
- [ ] Cro-Mag and Nanosaur 2 enforce network-safe capabilities.
- [ ] Native and WASM use the same Lua runtime and fixtures.
- [ ] Monaco no longer configures the TypeScript worker for Lua.
- [ ] LuaLS provides semantic IntelliSense in the in-editor code editor.
- [ ] Generated annotations are precise and game-specific.
- [ ] Runtime capability snapshots and editor metadata agree in CI.
- [ ] Snippets contain valid Lua rather than converted TypeScript syntax.
