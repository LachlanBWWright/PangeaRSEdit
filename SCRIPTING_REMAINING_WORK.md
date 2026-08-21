# Scripting: Remaining Work

Status captured on 2026-08-21. This document is a stabilization handoff for
the scripting refactor. It records what is still required before the roadmap
can be called complete; it does not turn passing contract or smoke tests into
phase-completion claims.

## Verified baseline

The following checks currently pass:

- Native shared CTest: 9/9 tests.
- WebAssembly shared CTest: 9/9 tests.
- Frontend scripting contract drift check.
- Frontend staged WebAssembly artifact check for all eight targets.
- Frontend scripting contract tests: 11/11.
- Frontend scripting workspace tests: 45/45.
- Frontend production VFS asset fixtures: 8/8. These write the real checked-in
  terrain and custom-asset bytes through the preview VFS boundary.
- Frontend asset validation tests: 28/28.
- Frontend asset-path tests: 2/2.
- Frontend glTF conversion tests: 4/4, including deterministic native/source
  bytes and malformed-input rejection.
- Frontend package-validator tests: 3/3.
- Failed scripted-spawn cleanup is covered at the shared public host
  boundary; direct adapter spawn paths now reject failed or self-removed
  `spawn` callbacks and clear the returned handle before strict replacement
  fallback is evaluated.
- Focused native rebuilds for the seven 3D adapters touched by the latest
  custom-model cache safety change.
- The focused preview-runtime loader tests pass, including the VFS mock type
  boundary. The full frontend TypeScript check no longer reports a scripting
  preview error; it still reports unrelated errors in the dirty item-model and
  Storybook worktree files listed below.

A resumed all-target WebAssembly build passed and staged all eight targets
after the final native custom-model cache guards, including the Nanosaur 2
adapter correction. The complete native matrix passed before those guards; the
seven changed 3D adapter build trees were then rebuilt directly. Mighty Mike
was unchanged by the latest adapter edits.

## Remaining work by roadmap phase

### Phase 1: Contract and documentation alignment

Still required:

- Make the machine-readable contract the actual generation source for the C
  metadata header, LuaLS declarations, frontend completion metadata, and
  documentation, instead of maintaining several hand-authored projections.
- Replace source-text drift checks with generation or compile-time checks where
  practical. The current checker is useful, but it does not prove that every
  generated artifact was produced from one source in a clean build.
- Add a clean checkout generation check to CI and verify generated output is
  deterministic.

Current boundary: the runtime, frontend contract, LuaLS declarations, adapter
metadata, documentation identifiers, and binding registrations are checked for
drift, but cross-target generation is not complete.

### Phase 2: Custom asset pipeline

Still required:

- Add production loading fixtures that invoke each native model/skeleton or
  Shapes loader, not only parser, package, preview-VFS, and artifact checks.
- Verify malformed assets at the native loading boundary without corrupting
  model, skeleton, or texture registries.
- Complete constrained glTF conversion coverage for every applicable native
  asset path, including runtime-load validation after conversion. The frontend
  conversion unit now covers negative inputs and deterministic output.
- Verify preview and exported runtime bytes through an actual game runtime for
  every applicable adapter.

The latest native changes now validate the post-import registry slot before a
custom BG3D/3DMF path enters the adapter cache. That is a stability fix, not
evidence of complete native asset-loader coverage.

### Phase 3: Scripted object lifecycle

Still required:

- Exercise deterministic recreation through real adapter streaming boundaries,
  not only shared-runtime lifecycle calls and sample entry points.
- Preserve and test native-owned checkpoint/save state where the native game
  owns that state.
- Add real stream-out/stream-in and checkpoint fixtures for the adapters whose
  native boundaries are not currently wired.
- Verify child-object, timer, task, subscription, and private-state cleanup in
  representative game-owned object lifecycles.
- Test failure and native-fallback behavior with actual missing or invalid
  runtime assets.

Failed scripted-spawn callbacks now clean up through the shared public spawn
boundary, and all eight adapter spawn paths return the callback failure (or a
runtime failure when the callback self-removes) after attempting native
cleanup. Native loader and factory failures still require per-adapter fixtures.

Shared generation checks, source identity, stale handles, lifecycle callbacks,
owner cleanup, checkpoint snapshots, and adapter smoke paths are implemented;
they do not establish full native lifecycle parity.

### Phase 4: Event and command API

Still required:

- Finish the command and event matrix only where real adapter call sites exist.
- Add real collision-exit and trigger-exit call sites before advertising those
  events. Do not emulate exit by polling and do not expose unsupported events.
- Cover the remaining typed domains: movement modifiers, health effects,
  animation control, audio/effects, camera/UI, objectives, and level flow where
  the native adapter can apply them safely.
- Add application-phase and stale-target tests for commands that can be queued
  or applied after the originating callback.

The current typed result records, metadata, validation, authority gating,
damage/death/player events, animation events, pickup path, and command traces
are stable but intentionally partial.

### Phase 5: Native item and replacement audit

Still required:

- Audit each native item family for child objects, save/checkpoint behavior,
  mode restrictions, required registries, and asset dependencies.
- Add representative audited fixtures for decoration, pickup, trigger, hazard,
  platform, enemy, objective, and spline families where applicable.
- Define and test native fallback at every replacement failure stage.
- Keep unknown audit fields explicitly `not-audited`; do not infer parity from
  a model or collision match.

The native replacement implementation remains a preserved robustness benchmark
and isolated support for the currently audited source surfaces. Replacing every
native constructor is not a completion requirement.

### Phase 6: Per-game gameplay coverage

Still required:

- Add an end-to-end fixture for each game that loads a real level, production
  assets, the script package, and the adapter's actual map/terrain entry points.
- Verify runtime capability metadata against observed behavior for every
  advertised hook and command.
- Cover each game's meaningful level, area, race, player, and mode metadata.
- Run a fresh all-target native and WebAssembly build after the latest shared or
  adapter scripting change before calling the matrix verified.

The eight sample processes and current artifact gates prove compilation and
host-boundary behavior. They are not full game-level fixtures.

### Phase 7: Editor authoring experience

Still required:

- Test the actual production screens for create, validate, place, preview,
  export, reopen, and edit workflows across representative game contexts.
- Complete native level-file archive compatibility and round-trip verification.
- Ensure every diagnostic category is surfaced consistently in the production
  UI, including native loader failures and runtime tracebacks.
- Expand Storybook/integration coverage without replacing production components
  with lookalike fixtures.

The current semantic custom-object controls, package round trips, preview
fixtures, asset diagnostics, migration diagnostics, and focused Storybook
fixtures cover important paths but not the complete screen workflow.

## Existing non-scripting type-check failures

The full frontend TypeScript check currently remains red in unrelated files:

- `src/editor/gameViews/MenuSection.stories.tsx`
- `src/editor/threejs/hooks/itemModelPreviewLoader.ts`
- `src/pages/ItemModelViewer.tsx`

These errors are outside the scripting runtime and contract changes. They must
be resolved before the frontend can claim a clean repository-wide type check.

### Phase 8: Multiplayer and persistence

Multiplayer is intentionally out of the current stabilization focus. Before
this phase can be enabled, it still needs:

- Transport-level peer agreement before simulation.
- Synchronized spawn/deletion identities and authority rules.
- Deterministic command-stream exchange and desync diagnostics.
- Persistence migration rules and bounded validated storage across peers.

The current implementation correctly keeps networked scripting disabled while
manifest comparison, local persistence, and command-trace safety checks remain
incomplete as a complete network protocol.

## Stabilization checklist

Before the next feature pass:

1. Run the staged artifact gate after every fresh all-target WebAssembly build.
2. Run the full native matrix after the same edits, or record the exact target
   build evidence if dependency setup prevents a clean matrix run.
3. Keep native and WebAssembly shared CTest at 9/9.
4. Keep the frontend contract and package/asset tests green.
5. Run `git diff --check` at the root and inside `games/pangea-ports`.
6. Update this document and `SCRIPTING_ROADMAP.md` only with evidence from the
   current tree and current build outputs.
