# Scripting Roadmap

## Purpose

This document is the authoritative plan for extending Pangea Ports scripting.
It replaces the historical TypeScript migration, Lua migration, implementation
completion, per-game integration, and gameplay-extensibility plans.

For the current stabilization evidence and the remaining acceptance work, see
[`SCRIPTING_REMAINING_WORK.md`](SCRIPTING_REMAINING_WORK.md).

The Lua migration itself is complete enough to build on. The remaining work is
to turn the existing bounded Lua runtime and custom-object prototype into a
reliable gameplay-authoring system without pretending that generic scripted
objects automatically reproduce every native game's internal behavior.

## Current Baseline

The repository currently provides:

- a vendored Lua 5.4 runtime shared by native and WebAssembly builds;
- sandboxing, memory limits, instruction budgets, tracebacks, and reload
  recovery;
- deterministic random APIs, timers, tasks, events, and runtime diagnostics;
- Lua source packaging, preview, export, Monaco integration, and a LuaLS bridge;
- lifecycle and frame hooks across all eight games;
- terrain, spline, or map-item hooks according to each game's map format;
- trigger, pickup, weapon-hit, and scripted-object events;
- generation-checked object handles and limited transform, velocity, state, and
  deletion operations;
- native and scripted spawn entry points;
- custom static models in all eight games;
- custom skeletal models in the seven 3D games that use the skeleton system;
- collision presets for solid objects, triggers, pickups, enemies, and
  platforms;
- editor workflows for custom-object definitions, asset upload, placement, and
  selected terrain or spline item replacement; and
- shared runtime integration tests plus a scripting sample test for every game.

The passing shared and sample tests prove the host contract and adapter smoke
paths. They do not yet prove that arbitrary custom assets or replacements work
correctly through a complete level, every native item lifecycle, or every
supported platform and mode.

## Product Direction

Use two complementary extension paths:

1. Scripted custom objects for new, self-contained objects whose behavior can be
   expressed through supported Lua events and typed engine commands.
2. Native objects with script hooks for complex game-owned mechanics that rely
   on existing AI, objectives, inventory, race state, particles, child objects,
   save data, or other internal systems.

Do not make replacing every native constructor with Lua a release requirement.
Native items often embody hidden contracts beyond their model and collision
flags. Replacement support must be based on audited behavior, not visual
similarity.

## Design Constraints

- Lua receives stable handles and validated snapshots, never native pointers.
- Mutations use typed, capability-checked operations.
- Commands that are unsafe during callbacks are queued for documented engine
  phases.
- Engine events are preferred over scanning every object every frame.
- Each adapter advertises only behavior backed by real engine call sites.
- Custom assets use validated engine-compatible formats.
- Missing or invalid scripts remain non-fatal to native gameplay.
- Multiplayer-changing scripts remain disabled until authority,
  synchronization, and determinism requirements are satisfied.
- The runtime contract, editor declarations, capability metadata,
  documentation, and conformance fixtures must not drift independently.

## Phase 1: Contract and Documentation Alignment

Establish one machine-readable scripting contract containing:

- API and feature versions;
- hooks, event payloads, and result records;
- functions, arguments, failure codes, and numeric constraints;
- object capabilities, tags, and categories;
- native spawn descriptors and option schemas;
- custom-object visual and collision schemas;
- per-game and per-mode availability;
- asset dependencies; and
- multiplayer safety classifications.

Generate or validate the following from that contract:

- LuaLS annotations;
- frontend API descriptions and completion metadata;
- C binding registration metadata where practical;
- user documentation; and
- native/WASM conformance fixtures.

Acceptance criteria:

- CI detects differences between documented and runtime APIs.
- Unavailable game APIs are absent or explicitly marked unavailable.
- Every result and failure shape is documented and tested.
- Historical references to active TypeScript or JavaScript game scripting are
  removed from normal documentation and build paths.

## Phase 2: Custom Asset Pipeline

Make custom models a supported workflow rather than a raw-file escape hatch.

Work:

- document the exact supported BG3D, Shapes, skeleton, texture, material, and
  animation constraints;
- add preflight validation for uploaded engine-native assets;
- report missing textures, invalid object indices, incompatible skeleton data,
  animation mapping errors, and unsafe paths before preview;
- define deterministic asset paths and collision-safe naming rules;
- investigate a conversion path from a constrained modern interchange format,
  preferably glTF 2.0, into each required native format;
- preserve source assets alongside generated runtime assets when conversion is
  provided; and
- add representative static and skeletal fixtures for every applicable game.

Acceptance criteria:

- Invalid assets fail with an actionable editor diagnostic.
- A documented fixture can be imported, previewed, exported, and loaded by each
  applicable game.
- Preview and export contain identical generated runtime assets.
- Asset loading failures cannot corrupt native model or skeleton registries.

## Phase 3: Scripted Object Lifecycle

Complete the object lifecycle before expanding gameplay breadth.

Work:

- define spawn, activation, deactivation, removal, and destruction semantics;
- associate replacements with their source terrain, spline, or map item;
- support streaming out and deterministic recreation where the native game
  streams items;
- define level reset, checkpoint restart, and unload behavior;
- clean up child objects, timers, tasks, subscriptions, and private state;
- define animation completion and marker delivery consistently;
- validate custom collision bounds and supported shapes; and
- define failure behavior when assets or Lua behavior cannot be created.

Acceptance criteria:

- Replaced items survive the same load, stream, reset, and unload scenarios as
  their declared replacement class.
- Failed strict and non-strict replacements have tested fallback behavior.
- No scripted object or callback survives its owning level or object.
- Handle generations reject stale references after every removal path.

## Phase 4: Event and Command API

Replace broad frame polling with real events and typed commands.

Events, where supported by real call sites:

- collision enter, stay, and exit;
- trigger enter and exit;
- interaction requested;
- damage before and after application;
- death and removal;
- pickup collection;
- animation completion or markers;
- checkpoint and objective changes;
- player spawn and respawn; and
- level completion, failure, restart, and transition requests.

Typed command domains:

- transform and teleportation;
- motion, impulse, and movement modifiers;
- health, damage, healing, and invulnerability;
- animation selection, blending, speed, and looping;
- collision enablement and validated presets;
- visibility, activation, and deletion;
- audio and effects;
- camera and UI messages; and
- objectives and level flow.

Acceptance criteria:

- Every command declares validation, capability, authority, and application
  phase.
- Unsupported operations return stable error records.
- Commands are safe when targets disappear before application.
- Per-frame scripting is no longer required for ordinary discrete gameplay
  transitions.

## Phase 5: Native Item and Replacement Audit

Audit each game's native item table and classify every item family as:

- directly replaceable by a generic scripted object;
- replaceable after specific capabilities are implemented;
- best extended as a native object with script hooks; or
- unsupported because of engine, mode, or multiplayer constraints.

For each replaceable family, record:

- required assets and native registries;
- collision and streaming behavior;
- global systems it updates;
- child objects and cleanup rules;
- save, checkpoint, and respawn behavior;
- allowed modes; and
- the minimum capabilities required for parity.

Add batch replacement rules only after this audit. Rules must be semantic and
constrained, such as replacing all instances of a compatible item family in a
specific level. They must not silently replace arbitrary numeric item types.

Acceptance criteria:

- The editor shows compatibility before accepting a replacement.
- Selected and batch replacements share the same validation path.
- Native fallback behavior is defined for every failure stage.
- Tests cover representative decoration, pickup, trigger, hazard, platform,
  enemy, objective, and spline families where applicable.

## Phase 6: Per-Game Gameplay Coverage

Apply the shared contract to all eight adapters without inventing false
cross-game uniformity.

For each game:

- expose meaningful level, area, race, scene, player, and mode metadata;
- define stable tags and object capabilities;
- complete vetted native spawn descriptors;
- wire supported event call sites;
- identify game-specific namespaces and mechanics;
- verify custom static and skeletal assets where applicable;
- test placement and replacement in representative levels; and
- document unsupported modes and asset dependencies.

Recommended implementation order:

1. Bugdom 2 as the reference 3D adapter.
2. Bugdom and Nanosaur for related terrain-item patterns.
3. Otto Matic for broader object and weapon behavior.
4. Nanosaur 2 for multiplayer-aware constraints.
5. Mighty Mike for its 2D map and Shapes pipeline.
6. Billy Frontier for area and combat semantics.
7. Cro-Mag Rally for race, spline, and multiplayer semantics.

Acceptance criteria:

- Each game has an end-to-end fixture using a real level and production asset
  loading path.
- Capability metadata matches runtime behavior.
- No adapter claims an event or command without a native implementation.

## Phase 7: Editor Authoring Experience

Work:

- provide semantic controls for collision, animation, replacement compatibility,
  and native spawn options;
- display required assets and unsupported modes before preview;
- distinguish source validation, LuaLS diagnostics, packaging failures, runtime
  tracebacks, and native adapter failures;
- provide object templates built from supported capabilities;
- show whether an object uses native hooks or a fully scripted lifecycle;
- add migration diagnostics for legacy TypeScript/JavaScript packages; and
- test the actual production editor screens through Storybook and integration
  tests.

Acceptance criteria:

- A user can create, validate, place, preview, export, reopen, and edit a custom
  object without hand-editing JSON.
- Controls expose semantic fields rather than raw flags or numeric blobs.
- LuaLS degradation is clearly reported without blocking basic editing.

## Phase 8: Multiplayer and Persistence

Do not enable simulation-changing scripts in network modes until all of the
following exist:

- package, config, asset, API-version, and runtime-version hashing;
- peer agreement before simulation begins;
- deterministic iteration, timers, randomness, and command ordering;
- explicit host or owner authority rules;
- synchronized spawn and deletion identities;
- save-state schemas and migration rules;
- bounded persistent storage; and
- desync detection and actionable diagnostics.

Acceptance criteria:

- Peers reject mismatched scripting packages before gameplay.
- Identical fixtures produce identical command streams.
- Unsupported scripts cannot accidentally run in network modes.
- Persistent data is versioned, size-limited, and validated before use.

## Verification

Maintain four layers of evidence:

1. Shared native runtime tests for sandboxing, budgets, conversions, handles,
   events, commands, lifecycle, and reload recovery.
2. Native/WASM conformance tests using identical Lua packages and expected
   command/event traces.
3. Per-game integration fixtures that load actual assets and exercise actual
   map-item entry points.
4. Editor tests covering authoring, upload validation, preview injection,
   export, import, LuaLS synchronization, and compatibility reporting.

Android builds must be compiled for supported ABIs before declaring a runtime
or asset change complete. Networked behavior requires separate deterministic
simulation tests and is not implied by local sample tests.

## Near-Term Milestone

The next deliverable should be one production-quality custom object in Bugdom 2
that:

- imports a validated custom static or skeletal model;
- has configured collision bounds;
- receives spawn, collision, damage, animation, and destruction events;
- uses typed commands rather than native memory access;
- replaces a compatible selected terrain item;
- streams, resets, and unloads safely;
- previews and exports through the editor; and
- passes native and WebAssembly integration tests with the same package.

Completing that vertical slice will establish the contract and lifecycle needed
to scale custom-item support across the other games.

## Implementation Status

This status is intentionally separate from the acceptance criteria above. It
describes the current refactor state; a phase remains incomplete until all of
its acceptance criteria are evidenced.

- Phase 1: Partial. Shared runtime contracts, generated C command/event/object-event
  descriptor tables, generated per-game Lua hook arrays, frontend/LuaLS declarations, native command and global event
  descriptors plus lifecycle metadata, documentation, explicit
  network execution gating, explicit runtime rejection for unsupported
  terrain/spline/map entry points, dedicated terrain/spline/map replacement
  configuration schemas, and a CI drift check now exist; CI also compares
  every contract API with the namespace-qualified Lua binding registrations,
  including the replacement-object source query.
  Cross-target generation remains pending. The
  retained TypeScript package is now explicitly legacy-only, while generated
  LuaLS declarations are the production authoring path. The drift check also
  compares every semantic native spawn ID, type, and category with each
  adapter's registered native-item table.
- Phase 2: Partial. BG3D, Shapes, and skeleton assets are preflighted on upload,
  preview, export, and package import, with actionable parser diagnostics;
  deterministic safe asset paths are enforced; constrained glTF uploads are
  normalized and converted to BG3D while retaining the normalized source;
  synchronous export helpers now reject formats that require asynchronous deep
  parsing instead of allowing unparsed bytes through;
  asynchronous preflight also compares model and skeleton joint, limb, and
  animation-table metadata when both assets expose it; a checked-in production
  asset fixture now exercises asynchronous preview/export/import byte retention
  for all eight game contexts, including the Shapes pipeline; skeletal
  compatibility coverage now also validates paired production BG3D/skeleton
  resources for Otto Matic, Bugdom 2, Nanosaur 2, Cro-Mag Rally, and Billy
  Frontier; actual in-game asset loading fixtures remain incomplete. Preview
  runtime integration now injects real terrain, resource,
  texture, Lua, and custom-asset bytes into the Emscripten VFS for all eight
  game paths, with the production path exercised by focused tests. The shared
  production fixture manifest is also checked against all staged scripting
  targets; the non-Android artifact gate compiles every staged WebAssembly
  module, verifies each generated HTML entrypoint references its matching
  runtime script, and rejects missing or empty fixture bytes. A dedicated
  non-Android fixture suite now independently writes the real production bytes
  for all eight game configurations into a VFS double and verifies the exact
  runtime paths, including Mighty Mike's case variants and each custom asset
  namespace; this remains asset/VFS coverage rather than a claim of full game
  launch coverage.
- Phase 3: Partial. Generation-safe reset behavior, reusable scripted-object
  slots, owner-scoped runtime cleanup on object release and level transitions,
  replacement validation, surface-aware replacement selection, safe deletion, animation completion/destruction
  hooks, stable failure outputs, an allowlisted object-event surface, and explicit
  activate/deactivate/stream/checkpoint lifecycle transitions now have shared
  semantics and tests, including self-removal during destructive lifecycle
  callbacks; direct adapter deletion paths now use the same destroy transition,
  source-backed terrain and spline replacements retain their native source
  records where the adapter exposes them, and source-backed deletion delivers
  `streamOut` in Bugdom, Bugdom 2, Cro-Mag Rally, Nanosaur, Nanosaur 2, Billy
  Frontier, and Otto Matic; source-backed replacement entry points now deliver
  `streamIn` after associating their native terrain or spline record; spline
  replacements also join the native spline object list so culling and deletion
  can recreate them through the original map entry point. Real
  checkpoint respawn boundaries are wired for Bugdom,
  Bugdom 2, Nanosaur, Nanosaur 2, and Otto Matic. Reinitialization, shutdown,
  and direct level-config reloads now attempt the same destructive lifecycle;
  direct scripted deletion now delivers the same guarded `destroy` callback;
  destructive cleanup continues across later objects when one callback fails;
  failed `streamIn` callbacks now release the partially created scripted object;
  adapter replacement entry points return strict failure or native fallback
  according to the replacement policy instead of silently ignoring callback
  errors;
  replacement objects now retain a validated shared-runtime source identity
  for terrain, spline, and map records; map replacements now have a dedicated
  map-coordinate lookup path in the shared config loader and Mighty Mike adapter;
  every supported adapter is checked
  for that association at its replacement entry point;
  Lua can inspect that identity through the read-only `pangea.object.source`
  API, which returns nil for ordinary or stale handles;
  adapters can query the validated source identity before creating a replacement,
  preventing duplicate scripted objects when a native source callback is replayed;
  shared tests cover terrain and map lookup plus invalid-source rejection;
  re-registration of an existing native object preserves its source identity
  and generation, while teardown callbacks can still complete with a zero
  position snapshot when a native object no longer exposes readable position;
  both cases are covered by shared conformance tests;
  the contract gate now audits every adapter's replacement entry points,
  source-kind association, stream-in transition, stream-out transition,
  destructive registry cleanup, and reset path so lifecycle wiring cannot drift
  silently between the eight adapters;
  direct shared-runtime level-load transitions now deliver destructive
  `destroy` callbacks before clearing the old registry, with the new level hook
  unable to observe a surviving old handle;
  shared conformance also covers stale-handle rejection, generation changes,
  and private-state clearing when a streamed object is recreated.
  Every per-game native and WebAssembly sample process now also loads a
  startup script through the public host boundary and exercises source-backed
  spawn, stream-out, generation-changing recreation, stream-in, and level
  unload cleanup using that game's context metadata; this strengthens adapter
  contract coverage without claiming a full native level simulation.
  Scripted objects spawned during an object callback now retain an internal
  owner handle; destructive parent release recursively delivers child
  destruction, clears descendant runtime state, and invalidates descendant
  generations. Native and WebAssembly conformance cover this parent/child
  teardown path.
  Semantic collision bounds are now validated in the editor and shared config,
  emitted as explicit width/height/depth values, and applied by all eight game
  adapters with native bounds retained as the fallback. Shared checkpoint reset
  now atomically captures a deterministic deep-copy private-state baseline,
  restores it for later resets of surviving objects, and clears their owned
  timers, tasks, and subscriptions; unsupported or cyclic values cannot publish
  a partial snapshot, and stream recreation still uses a fresh generation and
  state.
  Failed scripted spawn callbacks now clean up through the shared public spawn
  boundary, while every adapter's direct spawn path rejects a failed or
  self-removed spawn callback and clears its returned handle before replacement
  fallback is evaluated.
  Adapter-level deterministic recreation, checkpoint persistence for native-
  owned state, stream-in recreation, and broader native lifecycle coverage are
  not finished. Real skeleton animation
  marker call sites now deliver the native marker integer as
  `ctx.eventValue` through Otto Matic, Bugdom, Bugdom 2, Cro-Mag Rally,
  Nanosaur, Nanosaur 2, and Billy Frontier; Mighty Mike remains explicitly
  completion-only because its Shapes animation system has no equivalent
  skeleton marker call site. Generated custom-object dispatch now maps every
  allowlisted lifecycle event (`activate`, `deactivate`, `streamIn`,
  `streamOut`, and `checkpointReset`) to typed Lua behavior handlers. Otto Matic,
  Bugdom, Bugdom 2, Nanosaur, and Nanosaur 2 now dispatch typed player-spawn
  lifecycle events after the native object is registered; those same five
  adapters dispatch checkpoint-respawn after the native reset. Typed
  `onDeath` dispatch is also wired at the native death-state transition for
  all seven damage-capable adapters: Bugdom, Bugdom 2, Nanosaur, Nanosaur 2,
  Otto Matic, Cro-Mag Rally, and Billy Frontier; broader adapter recreation
  and persistence evidence remains outstanding.
- Phase 4: Partial. Typed trigger payload handles, structured result records
  for object commands, explicit validation/authority/application-phase metadata,
  native registration validation, native command/event descriptors, and
  per-game command fixtures are wired through the shared runtime. Object-local
  trigger contacts now distinguish first contact from same/next-frame continued
  contact with `triggerEnter` and `triggerStay`; exit remains explicitly
  unsupported until an adapter exposes a real collision-exit call site. Unsupported
  item-hook calls now return the stable `incompatible-item` status at the
  shared boundary instead of reaching an unavailable backend hook. The
  declarations are checked against the runtime descriptors. The contract
  checker now audits every advertised per-game hook,
  semantic native spawn registration, and direct spawn, respawn, death, and
  weapon-hit integration against the adapter's native call sites;
  unsupported weapon-hit hooks remain unadvertised by adapters; Bugdom 2 now
  dispatches a typed `onWeaponHit` event at its native projectile-versus-
  enemy collision boundary, including script-controlled damage, suppression,
  and target destruction. The frontend capability matrix now distinguishes
  trigger, pickup, animation completion, animation marker, checkpoint, and
  weapon-hit support instead of
  treating all of them as generic object-frame support. The skeletal animation
  marker event is now a real event with a typed integer
  payload, and the contract checker verifies every advertised skeletal marker
  call site. Animation completion is now contract-checked at all eight adapter
  call sites, including duplicate-delivery guards; shared native and WebAssembly
  conformance asserts that completion callbacks omit `eventValue`, and frontend
  generated-entry coverage asserts both animation handler routes. LuaLS now
  emits event-specific animation contexts, requiring an integer marker value
  for `onAnimationEvent` and an absent value for `onAnimationComplete`. A configured
  custom pickup object now exercises the shared
  trigger-to-pickup path, consumption result, and stale-handle rejection in
  both native and WebAssembly conformance suites. The complete command and
  event matrix is not finished. The shared object command surface now also
  exposes a generation-checked `setActive`/`setActiveResult` enabled-state
  transition; native lifecycle entry points remain responsible for lifecycle
  callbacks so this command is safe to invoke from a Lua callback. All seven
  adapters with a safe player health boundary now expose typed `onDamage` and
  post-application `onDamageApplied` events with non-negative replacement
  validation. All seven adapters with a safe player health boundary now
  dispatch typed `onDeath` at their native death or elimination boundary where
  that mode has one. Otto Matic, Bugdom, Bugdom 2, Nanosaur, and Nanosaur 2 now
  dispatch typed `onPlayerSpawn` contexts at their native player registration
  call sites, and those same five adapters dispatch typed `onPlayerRespawn`
  contexts after native checkpoint reset. Cro-Mag Rally and Billy Frontier
  now also dispatch `onPlayerSpawn` at their native player registration
  boundaries; their checkpoint respawn paths remain unsupported. The player
  events are wired to real player health, death, and registration call sites.
  Malformed and negative damage results are covered by native and WebAssembly
  conformance. Mighty Mike remains unsupported because its health path is a
  fixed integer-heart transition without a safe replacement-damage boundary.
  The remaining command and event matrix is still incomplete.
- Phase 5: Partial and isolated. Every registered native spawn now carries
  authoritative replacement metadata: classification, replacement surface,
  required capabilities/assets, lifecycle family, declared-mode coverage,
  streaming ownership, child-object status, save behavior, and an audit basis.
  source-backed terrain and Mighty Mike map entries are the generic replacement
  surfaces currently marked replaceable; native pickups, triggers, NPCs, powerups, and other game-owned
  spawns remain native-only until their behavior is individually evidenced.
  The editor reports compatibility before selected replacements, including
  terrain/spline/map surface matching when native type IDs collide, and
  selected/batch package validation shares the same surface-aware decision path.
  Batch validation now rejects a type that is registered only on another source
  surface instead of silently selecting a colliding native descriptor. This
  remains a benchmark for runtime robustness rather than a requirement to
  replace every native constructor. Full per-game child-object,
  save/checkpoint, mode, and asset audit remains, with unknown fields exposed
  as not-audited rather than inferred.
- Phase 6: Partial. Shared adapter conformance covers all eight games,
  including lifecycle vocabularies, explicit adapter-declared terrain/spline/map
  capabilities, audited supported hooks, gameplay results, handles, mutation,
  deletion, and failure recovery. All eight scripting-enabled WASM game
  targets also compile and stage against the current shared runtime; the shared
  native and WebAssembly conformance suites pass all nine tests; and the async
  editor package path round-trips a real Lua workspace and production asset
  bytes for every game. A dedicated artifact gate now verifies the staged WASM
  outputs for all eight targets. Production-level end-to-end level fixtures and
  broader capability parity are incomplete. The current WASM build verifies
  that every adapter compiles with the shared collision-bounds and animation
  marker-value contracts, but it does not replace the missing runtime launch
  fixtures for each game. A fresh forced all-target WASM build now passes,
  including the Bugdom Pomme/SDL3 dependency boundary, and stages every target;
  the artifact gate covers those outputs. This still does not replace the
  missing runtime launch fixtures for each game.
  Fresh native builds for all eight adapters pass. Cro-Mag
  Rally's respawn event remains explicitly unsupported; its death event is now
  covered by the adapter and shared conformance work.
- Phase 7: Partial. Authoring, validation, preview, packaging, and LuaLS
  workflows exist; diagnostics now retain source-validation, LuaLS, packaging,
  runtime-traceback, and native-adapter categories. The production custom-object
  panel has a realistic Storybook fixture covering semantic visual, collision,
  animation, replacement, and native-fallback compatibility controls, while
  workspace warnings identify missing required assets before preview/export;
  asynchronous package export/import is now tested across all eight production
  game contexts, and legacy TypeScript/JavaScript packages receive an explicit
  migration diagnostic pointing to the Lua 5.4 authoring path.
  Package export/import now preserves every authored level's bindings,
  placements, and runtime replacement configuration instead of only the active
  level; validation rejects packages whose declared levels are missing their
  sidecar files.
  Collision presets now expose semantic width, height, and depth controls and
  export those values through the package contract; the production Storybook
  fixtures now exercise preview, compile, package download, collision-bound
  authoring interactions, and package upload/reopen with an imported Lua file.
  Full screen-level import/export compatibility is now covered for the script
  sidecars; native level-file archive coverage and broader screen workflow
  coverage remain incomplete.
- Phase 8: Partial safety gate. Built packages now carry a deterministic
  content/runtime/contract manifest, typed peer-manifest comparison rejects
  mismatched game or package identity before the runtime gate, and network
  eligibility explicitly rejects packages until deterministic authority exists.
  The local runtime now exposes bounded versioned scalar persistence, tested
  across multiple keys, Lua-state reload, malformed-record rejection, and
  deletion isolation; it also exposes a deterministic command trace with
  bounded per-command entries, structured cross-trace mismatch diagnostics,
  and an explicit host-controlled network-mode execution gate. Transport-level
  peer agreement, synchronized identities, and command-stream exchange across
  actual network peers remain incomplete.
