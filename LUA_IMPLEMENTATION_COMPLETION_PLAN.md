# Lua Implementation Completion Plan

## Objective

Complete the Lua migration so editor-authored Lua runs consistently in native, Android, and WebAssembly builds with a bounded runtime, accurate APIs, executable exported packages, and real Lua IntelliSense.

The migration is complete only when the same generated Lua fixture passes against every supported runtime target and the editor's declarations match the native API exposed by each game.

## Current State

- The frontend creates `.lua` source paths and Lua-oriented templates.
- A native Lua backend exists in `games/pangea-ports/shared/script`.
- Native CMake builds use a system Lua 5.4 installation when one is available.
- WebAssembly still uses the JavaScript/Emscripten backend.
- Generated Lua bundles are not currently valid or executable Lua 5.4 packages.
- The shared runtime API, generated annotations, and per-game contexts disagree.
- Monaco provides static snippets rather than semantic Lua IntelliSense.
- Runtime limits, strict result validation, tracebacks, and cross-platform execution tests are incomplete.

## Completion Principles

1. Use one pinned Lua 5.4 implementation on native, Android, and WebAssembly.
2. Keep the shared host responsible for VM lifecycle, sandboxing, budgets, value conversion, hook invocation, and status reporting.
3. Keep game-specific hooks, context fields, native item definitions, modes, and capabilities in each game's adapter.
4. Generate runtime bindings, LuaLS annotations, frontend capability metadata, and documentation from one schema.
5. Treat Lua input and output as untrusted data. Validate it explicitly and return script statuses rather than crashing the game.
6. Test generated editor output by executing it in the real runtime, not by checking strings alone.

## Phase 1: Repair Package Generation

### Work

- Replace the current string-table bundle format with a valid Lua 5.4 module bundle.
- Use `load(source, chunkName, "t", environment)` rather than `loadstring`.
- Implement deterministic module IDs and relative `require` resolution.
- Cache loaded modules and detect circular dependencies.
- Permit only bundled modules and the host-provided `pangea` module.
- Build one entry module table, attach every supported hook, and return the table once.
- Preserve `markInUse` when item hooks return an unhandled result.
- Restore generated placement and scripted-object initialization behavior removed during the syntax conversion.
- Add source chunk names that map runtime errors back to `Data/Scripts/src/...`.
- Add lightweight Lua syntax validation during preview/export, using the pinned runtime or LuaLS parser.

### Tests

- Execute an empty generated package.
- Execute packages containing one and multiple source modules.
- Resolve sibling, parent, and index-style module imports.
- Verify module caching and circular-import errors.
- Verify every generated hook is present on the returned entry module.
- Verify syntax and module errors report the original source path.
- Replace remaining `.ts` package tests with `.lua` fixtures.

### Acceptance Criteria

- `Data/Scripts/dist/main.lua` loads successfully in Lua 5.4.
- Editor preview and exported packages use the same generated bundle bytes.
- No JavaScript or TypeScript compiler behavior remains in Lua package generation.

## Phase 2: Harden the Shared Lua Runtime

### Work

- Introduce a single helper for creating and configuring `lua_State`.
- Open only approved standard libraries instead of calling `luaL_openlibs`.
- Exclude filesystem, operating-system, native module loading, unrestricted package loading, and debug APIs.
- Decide whether dynamic `load` is private to the generated bundle or unavailable to user modules.
- Add a custom Lua allocator with configurable memory accounting and a hard limit.
- Add an instruction-count hook with per-load and per-hook budgets.
- Translate memory and instruction exhaustion to `PANGEA_SCRIPT_BUDGET_EXCEEDED`.
- Add a traceback error handler to script loading and every protected call.
- Record and restore Lua stack depth at every backend boundary.
- Clear the VM cleanly after failed loads.
- Validate all host API arguments before calling engine functions.
- Validate all hook result records and reject invalid field types or non-finite numbers.
- Return explicit Lua values for failed host operations rather than returning no values inconsistently.
- Split logging into correctly bound `info`, `warn`, and `error` callbacks.
- Implement or remove placeholder APIs such as `pangea.level.current`.

### Tests

- Attempt access to `io`, `os`, `debug`, `package`, `dofile`, `loadfile`, and native module loading.
- Run infinite loops during module load and hook execution.
- Exhaust the Lua memory limit.
- Pass malformed vectors, handles, spawn options, and hook results.
- Assert stack depth remains stable over repeated hook calls.
- Assert tracebacks contain source chunk names and Lua line numbers.
- Assert a failed reload cannot leave a partially active module.

### Acceptance Criteria

- Untrusted scripts cannot access host files, processes, environment variables, or native modules.
- Infinite or memory-heavy scripts cannot freeze or terminate the game.
- All runtime failures are surfaced through `PangeaScriptStatus` and status details.

## Phase 3: Pin Lua and Unify Platform Builds

### Work

- Vendor a specific Lua 5.4 patch release under `games/pangea-ports/shared/script/third_party/lua`.
- Record the upstream version, source URL, checksum, license, and local build options.
- Build the vendored sources into `PangeaScript` for desktop, Android, and Emscripten.
- Remove automatic dependence on system Lua for normal builds.
- Replace the Emscripten JavaScript backend with the Lua backend.
- Keep any legacy Duktape/JavaScript backend behind an explicit temporary compatibility option, then remove it after migration tests pass.
- Scope Lua compile definitions to the `PangeaScript` target.
- Ensure all game build systems include the same shared runtime configuration.

### Tests

- Clean desktop build without Lua installed system-wide.
- Clean Android build for supported ABIs.
- Clean Emscripten build.
- Run the same Lua fixture against native and WASM.
- Verify the runtime reports the pinned Lua version.

### Acceptance Criteria

- Every target uses the same vendored Lua source and backend.
- Browser preview executes Lua directly and does not translate it through JavaScript.
- Builds are reproducible without installing `liblua5.4-dev`.

## Phase 4: Define One Authoritative API Schema

### Work

- Add a machine-readable shared schema describing:
  - common hooks and their context/result types;
  - common `pangea` APIs;
  - game-specific hooks and context extensions;
  - native spawn IDs and options;
  - object capabilities and tags;
  - level, area, track, scene, player, race, and network metadata.
- Generate from that schema:
  - C binding registration metadata;
  - LuaLS annotation files;
  - frontend capability descriptions and completion metadata;
  - API documentation;
  - conformance-test fixtures or snapshots.
- Remove independently maintained broad `table` declarations.
- Define nullability, numeric ranges, array indexing, and failure return shapes explicitly.
- Ensure API names and field names are identical at runtime and in annotations.

### Acceptance Criteria

- CI fails when runtime bindings and editor annotations diverge.
- Every documented field is present at runtime with the documented type.
- APIs unavailable in a game are absent from that game's generated annotations.

## Phase 5: Complete Per-Game Adapters

### Shared adapter changes

- Extend context structures or add typed game-context extension callbacks.
- Allow game adapters to map shared lifecycle events to public Lua hook names.
- Avoid logging an area/race hook name while dispatching a different level hook.
- Supply stable level, area, scene, track, mode, player, and network metadata.
- Define valid native spawn IDs and validate game-specific options.

### Per-game work

For each of the eight games:

- Define supported lifecycle and item hooks.
- Define exact context fields and meaningful names.
- Audit terrain, spline, map-item, and object-frame support.
- Audit native spawn mappings and asset requirements.
- Define object tags and capability levels.
- Convert bundled examples and `Data/Scripts/config/levels.json` paths to Lua.
- Add one end-to-end fixture covering a lifecycle hook and an item/object operation.

Use Bugdom 2 as the first reference adapter, then apply the established pattern to:

1. Bugdom
2. Otto Matic
3. Nanosaur
4. Nanosaur 2
5. Mighty Mike
6. Billy Frontier
7. Cro-Mag Rally

### Acceptance Criteria

- Every game executes its supported public Lua hook names.
- Every game-specific annotation is backed by runtime data.
- No game package references `main.js` or TypeScript source.

## Phase 6: Add Real Lua IntelliSense

### Backend service

- Pin a LuaLS release and checksum.
- Add a backend boundary that starts or leases bounded LuaLS processes.
- Authenticate editor sessions and create isolated workspaces.
- Synchronize create, update, rename, and delete events.
- Configure Lua 5.4, bundled module paths, and generated annotation paths.
- Limit concurrent sessions, memory, process lifetime, and idle time.
- Return structured errors when LuaLS is unavailable.

### Frontend integration

- Register stable Monaco model URIs under `file:///workspace/Data/Scripts/`.
- Connect Monaco to LuaLS over an authenticated WebSocket/LSP bridge.
- Support diagnostics, completion, hover, signature help, definitions, references, and document symbols.
- Synchronize workspace and generated annotation files.
- Keep snippets game-aware, but use LuaLS for semantic completion.
- Display distinct states for connected, reconnecting, and unavailable.
- Keep runtime tracebacks separate from static diagnostics.
- Remove any remaining TypeScript worker and declaration assumptions.

### Tests

- Syntax and type diagnostics appear on the correct model and line.
- Completion and hover resolve common and game-specific APIs.
- Definition and references work across two bundled modules.
- File rename and deletion update LuaLS state.
- Two editor sessions cannot read each other's workspaces.
- The editor degrades clearly to syntax highlighting and snippets when LuaLS is unavailable.

### Acceptance Criteria

- Static snippets are no longer presented as full IntelliSense.
- Semantic behavior works across project modules and generated declarations.

## Phase 7: Migration, Compatibility, and Cleanup

### Work

- Convert all built-in samples, templates, tests, and package manifests to Lua.
- Reject executable `.ts` and `.js` files in new Lua packages.
- Detect legacy TypeScript packages during import and present a clear migration error.
- Preserve JSON sidecar configuration where it remains declarative.
- Remove obsolete TypeScript scripting dependencies and workers after repository-wide searches are clean.
- Remove obsolete Duktape and Emscripten backend code after all target tests pass.
- Update user documentation and build instructions.

### Acceptance Criteria

- Repository searches find no active TypeScript/JavaScript scripting paths.
- Legacy packages fail with an actionable migration message.
- The normal build and test path contains no Duktape dependency.

## Phase 8: Verification and CI

### Native runtime suite

- VM lifecycle and reload behavior.
- All hook context/result conversions.
- Host API argument and result validation.
- Sandbox escape attempts.
- Memory and instruction budgets.
- Traceback and status reporting.
- Object-handle generation and stale-handle rejection.

### Cross-runtime conformance suite

Run identical fixture packages in native and WASM and compare:

- hooks called and their order;
- context values;
- returned item/object results;
- host API effects;
- logs and normalized errors;
- budget behavior.

### Frontend suite

- Generated bundle execution, not only snapshot checks.
- Workspace create/edit/import/export/reopen behavior.
- Per-game generated annotation snapshots.
- Capability-schema conformance.
- LuaLS protocol and session-isolation tests.

### CI gates

- Desktop, Android, and Emscripten builds.
- Native Lua runtime tests.
- WASM browser execution tests.
- Frontend unit and integration tests.
- LuaLS integration tests.
- Runtime/annotation conformance generation check.
- Repository scan for obsolete script extensions and runtime references.

## Recommended Implementation Order

1. Repair generated Lua packages and add executable bundle tests.
2. Fix immediate runtime API defects, tracebacks, and stack handling.
3. Implement the sandbox, allocator, and instruction budgets.
4. Vendor Lua and switch Emscripten to the shared Lua backend.
5. Create the authoritative API schema and generators.
6. Complete Bugdom 2 as the reference per-game adapter.
7. Implement LuaLS end to end using the reference adapter.
8. Complete and verify the remaining seven game adapters.
9. Convert all remaining packages and remove legacy runtimes.
10. Enable all cross-platform conformance checks as required CI gates.

## Definition of Done

- `Data/Scripts/dist/main.lua` generated by the editor runs without modification.
- Desktop, Android, and WebAssembly use the same pinned Lua runtime.
- Scripts are constrained by memory and instruction budgets.
- Runtime errors include useful Lua source paths, line numbers, and tracebacks.
- Runtime bindings, annotations, completions, and documentation derive from one schema.
- LuaLS provides project-aware semantic IntelliSense.
- All eight games have tested, accurate Lua contexts and capabilities.
- Native and WASM produce equivalent results for the conformance fixtures.
- No active game configuration or editor workflow depends on `main.js`, TypeScript scripting, Duktape, or the JavaScript Emscripten backend.
