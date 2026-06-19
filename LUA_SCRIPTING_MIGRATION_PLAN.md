# Plan: Replace TypeScript Game Scripting with Lua

## Objective

Replace the TypeScript-authored/JavaScript-executed scripting system across all eight games in `games/pangea-ports` with Lua, while preserving the existing shared C host and per-game binding work where practical.

The editor must provide real Lua IntelliSense: syntax and semantic diagnostics, completion, hover documentation, signature help, symbol navigation, and project-aware references. Static snippets alone do not satisfy this requirement.

## Current State

The existing implementation already provides most of the engine-facing architecture:

- `games/pangea-ports/shared/script` owns the shared host, configuration, object handles, status reporting, and JavaScript backends.
- Each game has a `Scripting/ScriptBindings.c` adapter.
- Native desktop builds use Duktape when available.
- WebAssembly builds execute JavaScript through an Emscripten backend.
- `games/pangea-ports/shared/script-types` describes the TypeScript API and examples.
- The frontend Scripts workspace stores `.ts` source, compiles it in the browser, emits `Data/Scripts/dist/main.js`, and injects the result into the game preview.
- Monaco currently uses the TypeScript worker, generated `.d.ts` files, and custom snippets.
- Script package metadata and level bindings are JSON sidecars under `Data/Scripts/config`.

The migration should retain the language-neutral parts of this system instead of rebuilding scripting from scratch.

## Target Architecture

```text
Lua source in editor or Data/Scripts/src/*.lua
                  |
                  +--> LuaLS through LSP for editor IntelliSense
                  |
                  +--> package validation and optional bytecode compilation
                                   |
                         Data/Scripts/dist/main.lua
                                   |
                      shared C PangeaScript host
                                   |
                         embedded Lua 5.4 VM
                                   |
                  existing per-game ScriptBindings.c adapters
```

Use the same embedded Lua implementation for native, Android, and WebAssembly builds. Do not use browser JavaScript as a separate Lua runtime path. A single C runtime avoids the native/WASM behavior drift present in the Duktape and Emscripten backends.

Use Lua 5.4 unless an early platform spike identifies a concrete incompatibility. Vendor a pinned Lua release under the shared scripting component so builds do not depend on a system Lua installation.

## Lua API Shape

Expose a global, read-only `pangea` table and return a module table from each script:

```lua
---@type Pangea
local pangea = require("pangea")

local module = {}

---@param ctx Pangea.FrameContext
function module.onFrame(ctx)
    pangea.log.info("frame " .. ctx.frameNum)
end

return module
```

Prefer plain Lua tables and explicit result records:

```lua
function module.onTerrainItem(ctx)
    return {
        handled = false,
    }
end
```

Keep the current C-facing concepts stable:

- level, frame, terrain item, spline item, map item, and object-frame contexts
- generation-based object handles
- native and scripted spawn operations
- object capability levels
- non-fatal status and error reporting
- game-specific capability matrices

Do not expose native pointers, Lua userdata wrapping engine objects, unrestricted filesystem access, operating-system libraries, package loading from arbitrary paths, or network APIs.

## Phase 0: Runtime and IntelliSense Spikes

Complete two bounded prototypes before broad conversion.

### Runtime spike

Build Lua 5.4 as part of `games/pangea-ports/shared/script` for:

- one native desktop target
- one Emscripten target
- one Android target if Android remains a supported distribution target

Load a script, call `onLevelLoad` and `onFrame`, return an item-hook result, and surface a Lua traceback through the existing script status API.

### IntelliSense spike

Connect Monaco to LuaLS using the Language Server Protocol and validate:

- completion for `pangea.object.*`
- hover and signature help from generated annotations
- diagnostics for an invalid hook return value
- go-to-definition from a project script to another project script
- project-wide rename and references
- isolation between two open script workspaces

The recommended production route is:

- Monaco editor with Lua language registration
- `monaco-languageclient` in the browser
- a backend WebSocket LSP gateway
- a pinned LuaLS process per active workspace/session
- virtual workspace files synchronized from the browser

The existing .NET backend can host authentication, session limits, workspace isolation, and the WebSocket bridge. LuaLS remains a separate pinned executable/container dependency.

Investigate a browser-hosted LuaLS/WASM build only as an optional offline enhancement. Do not make the migration depend on it unless the spike proves full LSP behavior, acceptable download size, and acceptable memory use. When the LSP service is unavailable, Monaco may retain syntax coloring and snippets, but the UI must clearly report that semantic IntelliSense is offline.

### Exit criteria

- One script behaves equivalently in native and WASM builds.
- Lua errors cannot terminate the game.
- The editor demonstrates all IntelliSense capabilities listed above.
- Runtime and LuaLS versions are pinned and reproducible.

## Phase 1: Introduce a Lua Backend Behind the Existing Host

Refactor `shared/script` so the public `pangea_script.h` API remains language-neutral.

Add:

```text
games/pangea-ports/shared/script/
  pangea_script_backend_lua.c
  pangea_script_lua_api.c
  pangea_script_lua_api.h
  third_party/lua/
```

Actions:

1. Replace the backend selection in `CMakeLists.txt` with the Lua backend on every supported platform.
2. Create one isolated `lua_State` per game scripting host.
3. Open only approved standard libraries. Exclude `io`, `os`, `debug`, and unrestricted native module loading.
4. Install a constrained module loader that accepts normalized paths under `Data/Scripts/`.
5. Translate Lua stack failures into `PangeaScriptStatus` values and store tracebacks in the existing last-error/status fields.
6. Use protected calls for all script execution.
7. Restore the Lua stack to a known depth after every host operation.
8. Add memory accounting through a custom Lua allocator.
9. Add instruction budgets through a hook, with separate limits for load, item, frame, and object-frame callbacks.
10. Seed script randomness through a game-provided deterministic API rather than exposing uncontrolled randomness to simulation scripts.

Keep `pangea_script_backend_duktape.c` and `pangea_script_backend_emscripten.c` during the compatibility period, but stop adding features to them.

### Acceptance criteria

- All existing host calls have Lua-backed implementations.
- Native and WASM use `pangea_script_backend_lua.c`.
- Missing scripts, syntax errors, runtime errors, budget failures, and memory-limit failures remain non-fatal.
- Repeated callback failures disable the smallest practical scope: object, hook, module, then host.

## Phase 2: Bind the Engine API to Lua

Implement the stable API before converting editor templates.

Initial modules:

- `pangea.api`
- `pangea.game`
- `pangea.level`
- `pangea.time`
- `pangea.log`
- `pangea.player`
- `pangea.object`
- `pangea.spawn`

Rules:

1. Convert C contexts into fresh Lua tables with documented fields.
2. Validate all Lua arguments explicitly before calling game adapters.
3. Return `nil, errorTable` for recoverable API failures where the caller needs detail.
4. Use object handle tables containing only `id` and `generation`.
5. Freeze API tables or reject writes through metatables.
6. Avoid hidden dependence on Lua global state in per-game adapters.
7. Ensure unsupported game capabilities return a stable error code rather than silently succeeding.

Generate both runtime bindings and editor annotations from one language-neutral API schema. The schema should describe:

- modules and functions
- parameters and return values
- record fields
- hook signatures
- game restrictions
- capability requirements
- documentation
- API version and deprecation state

Do not hand-maintain the C binding names, LuaLS annotations, frontend capability descriptions, and documentation independently.

### Acceptance criteria

- Generated Lua annotations match the runtime API.
- Every exposed function has runtime argument validation and a documented failure contract.
- Existing per-game `ScriptBindings.c` files require only targeted changes.
- API conformance tests run the same Lua fixtures against native and WASM.

## Phase 3: Define the Lua Project and Package Format

Change source and runtime paths to:

```text
Data/Scripts/
  src/
    main.lua
    hooks/*.lua
    bindings/*.lua
    objects/*.lua
  dist/
    main.lua
  types/
    pangea.lua
    pangea-games.lua
  config/
    project.json
    levels.json
    bindings/*.json
    placements/*.json
    objects.json
    params.json
```

Keep JSON for declarative configuration. Lua replaces executable TypeScript/JavaScript, not the validated sidecar data model.

Update `project.json` with a schema version and explicit language/runtime fields:

```json
{
  "schemaVersion": 2,
  "language": "lua",
  "runtime": "lua-5.4",
  "entry": "Data/Scripts/dist/main.lua"
}
```

Source packages should normally contain readable Lua. Optional Lua bytecode may be offered for release packaging only when it is produced by the exact pinned runtime and source is retained for debugging. Do not use bytecode as the editor-preview interchange format.

### Acceptance criteria

- Package validation rejects `.ts`, `.tsx`, and `.js` executable sources for schema version 2.
- All script and module paths are normalized and constrained under `Data/Scripts/`.
- Preview and exported packages use the same entry path and module resolution rules.
- Old schema version 1 packages produce an actionable migration message.

## Phase 4: Replace the Frontend TypeScript Compiler Pipeline

Refactor the Scripts workspace around Lua source files.

Primary files affected include:

- `scriptWorkspaceStateRuntime.ts`
- `scriptWorkspaceStateTypes.ts`
- `scriptPackageValidator.ts`
- `scriptPreviewExportActions.ts`
- `scriptTypeDeclarations.ts`
- `scriptMonaco.ts`
- `ScriptCodeModal.tsx`
- templates and sample definitions in the scripts subview

Actions:

1. Change source-file language and extensions from TypeScript to Lua.
2. Remove browser TypeScript transpilation from script compilation.
3. Build `dist/main.lua` as a deterministic generated entry module that requires and combines selected Lua modules.
4. Replace `.d.ts` generation with LuaLS-compatible annotation files.
5. Convert hook, behavior, object, and placement templates to Lua.
6. Update validators, file pickers, labels, generated paths, downloads, and preview injection.
7. Preserve TypeScript for the React application itself; only user-authored game scripting changes language.
8. Keep all unknown package/config data behind the existing Zod parsing boundary.
9. Return frontend compilation, validation, synchronization, and LSP failures through typed `Result`/`ResultAsync` flows.

### Acceptance criteria

- No game-script build path imports the TypeScript compiler.
- Creating, editing, previewing, exporting, importing, and reopening a Lua project works in each editor.
- Generated entry files are stable for identical workspace state.
- Validation points to the Lua source file and line where possible.

## Phase 5: Implement Proper Monaco IntelliSense

Split the current `scriptMonaco.ts` responsibilities into focused modules:

```text
scripts/language/
  configureLuaMonaco.ts
  luaLanguageClient.ts
  luaWorkspaceSync.ts
  luaSnippetProvider.ts
  luaDiagnosticsState.ts
  generatedLuaAnnotations.ts
```

Required behavior:

1. Register Lua models with stable `file:///Data/Scripts/src/...` URIs.
2. Synchronize file create, edit, rename, and delete operations to the isolated LuaLS workspace.
3. Load generated common and per-game annotations without exposing APIs unsupported by the selected game.
4. Configure LuaLS for Lua 5.4 and the project module path.
5. Convert LSP diagnostics and connection failures into editor state without throwing.
6. Dispose language clients, models, providers, and backend sessions when workspaces close.
7. Keep snippets game-aware, but let LuaLS provide semantic completion.
8. Show runtime tracebacks separately from static LuaLS diagnostics.
9. Debounce document synchronization without delaying local editor updates.
10. Prevent one user's source or symbols from entering another user's workspace.

Generated annotation files should use LuaLS annotations such as `---@class`, `---@field`, `---@param`, `---@return`, `---@alias`, and `---@overload`.

### Acceptance criteria

- Completion, hover, signature help, diagnostics, definitions, references, document symbols, and rename work for project files.
- Game-specific hooks and APIs are suggested only where supported.
- API documentation appears in completion and hover details.
- LSP restart recovers without losing editor source.
- The UI distinguishes “LuaLS connected,” “reconnecting,” and “semantic IntelliSense unavailable.”

## Phase 6: Convert Existing Scripts and Templates

Convert:

- all `script-types/examples/*.ts`
- frontend starter behaviors
- generated global hook templates
- item-binding templates
- scripted-object templates
- `main.ts` entry generation
- documentation examples
- test fixtures

Provide a one-time importer for existing editor projects:

1. Detect schema version 1.
2. Preserve JSON sidecars.
3. Create a new Lua workspace alongside the original files.
4. Convert only known generated templates mechanically.
5. Mark arbitrary user TypeScript modules as requiring manual conversion.
6. Produce a migration report listing every converted and unresolved module.

Do not attempt a general TypeScript-to-Lua transpiler. The APIs and module semantics are different enough that silent mistranslation is more dangerous than an explicit manual step.

### Acceptance criteria

- Every built-in sample is Lua and passes static and runtime tests.
- Import never overwrites the original TypeScript project.
- Unsupported source constructs are reported, not guessed.

## Phase 7: Roll Out Across the Eight Games

Use Bugdom 2 as the first complete vertical slice, then roll out based on engine similarity:

1. Bugdom 2
2. Otto Matic
3. Bugdom
4. Nanosaur
5. Billy Frontier
6. Mighty Mike
7. Nanosaur 2
8. Cro-Mag Rally

For each game:

1. Enable the Lua backend in native and WASM builds.
2. Run lifecycle and item-hook conformance fixtures.
3. Verify object registration and invalidation.
4. Verify editor preview injection and reload.
5. Generate game-specific Lua annotations.
6. Audit the capability matrix against real runtime behavior.
7. Test packaged script loading from game data paths.

Mighty Mike requires dedicated map-item and 2D coordinate fixtures. Nanosaur 2 and Cro-Mag Rally must keep simulation-affecting scripts disabled in network modes until script/config hashing, deterministic APIs, peer agreement, and desync reporting are implemented.

### Acceptance criteria

- Each game passes the same shared contract suite plus its game-specific fixtures.
- Capability metadata, generated annotations, editor suggestions, and runtime behavior agree.
- No game falls back to browser JavaScript execution.

## Phase 8: Remove TypeScript/JavaScript Scripting

Remove the old implementation only after all eight games and editor workflows pass.

Delete or retire:

- `pangea_script_backend_duktape.c`
- `pangea_script_backend_emscripten.c`
- Duktape CMake detection and linking
- `games/pangea-ports/shared/script-types`
- TypeScript script examples and generated `.d.ts` assets
- script-specific TypeScript worker setup
- `Data/Scripts/dist/main.js` packaging assumptions
- schema version 1 creation paths

Keep schema version 1 import support for at least one release cycle, but do not execute imported JavaScript.

### Acceptance criteria

- Repository searches find no active Duktape or JavaScript game-script path.
- The frontend bundle no longer includes TypeScript solely for compiling user scripts.
- Clean builds do not require Duktape or a system Lua package.
- Existing TypeScript projects receive a migration path rather than an ambiguous load failure.

## Testing Strategy

### Shared runtime tests

- Lua state creation and teardown
- module loading and path sandboxing
- context conversion
- hook return parsing
- malformed return values
- syntax and runtime tracebacks
- stack cleanup after every failure
- memory and instruction limits
- object handle generation and invalidation
- reload and module cache reset

### Cross-platform conformance tests

Run identical fixtures against native and Emscripten builds and compare:

- hook call order
- context values
- result records
- error status
- log output
- deterministic random values

### Frontend tests

- Lua workspace state transitions
- deterministic entry generation
- package schema migration and validation
- virtual file synchronization
- LSP diagnostic mapping
- client reconnect/disposal
- per-game annotation selection
- preview VFS injection

### End-to-end tests

For every game, preview a level with a Lua script that:

- logs level start
- receives a frame callback
- observes or modifies one supported object
- handles one supported terrain, spline, or map item hook
- produces a deliberate runtime error and reports it without crashing

## Operational and Security Requirements

- Pin Lua and LuaLS versions.
- Limit active LuaLS sessions per user and expire idle sessions.
- Run LuaLS workspaces in isolated temporary directories or equivalent isolated virtual storage.
- Apply source-size, file-count, CPU, memory, and message-size limits to LSP sessions.
- Do not pass editor-controlled paths directly to the host filesystem.
- Disable Lua C module loading and unapproved standard libraries in game runtimes.
- Hash script source/config for reproducible previews and future multiplayer checks.
- Include runtime version, API version, and script hash in status reports.

## Migration Gates

Do not advance to removal of the old path until all gates pass:

- [ ] Lua 5.4 builds on native, Android, and Emscripten targets.
- [ ] Native and WASM runtime conformance tests pass.
- [ ] Lua memory and instruction budgets are enforced.
- [ ] Runtime bindings and Lua annotations come from one API schema.
- [ ] Monaco is connected to LuaLS with full semantic IntelliSense.
- [ ] LuaLS session isolation and limits are tested.
- [ ] The Scripts workspace no longer compiles user TypeScript.
- [ ] Preview and export use `Data/Scripts/dist/main.lua`.
- [ ] All built-in templates and examples are Lua.
- [ ] All eight games pass scripting smoke tests.
- [ ] Networked scripting remains safely gated.
- [ ] Version 1 projects have a non-destructive migration workflow.
- [ ] Duktape and JavaScript scripting dependencies are removed.

## Recommended Delivery Order

1. Runtime and LuaLS feasibility spikes.
2. Lua backend and sandbox.
3. Generated API schema, C bindings, and Lua annotations.
4. Bugdom 2 runtime/editor vertical slice.
5. Lua workspace, package format, preview, and export migration.
6. Remaining single-player game rollout.
7. Mighty Mike-specific rollout.
8. Nanosaur 2 and Cro-Mag Rally rollout with network gating.
9. TypeScript project importer.
10. Duktape, JavaScript backend, and script-types removal.

This order validates the two highest-risk requirements—the cross-platform Lua runtime and full browser-editor IntelliSense—before committing the entire repository to the migration.
