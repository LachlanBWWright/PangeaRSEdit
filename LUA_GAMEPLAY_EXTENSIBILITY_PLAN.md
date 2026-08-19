# Lua Gameplay Extensibility Plan

## Objective

Extend the Lua system from lifecycle callbacks and limited transform control into
a supported gameplay-authoring layer for all eight Pangea Ports games.

The target is that a Lua package can implement substantial gameplay changes,
including:

- new objectives and win or loss conditions;
- enemy, hazard, pickup, and trigger behavior;
- scripted encounters and level progression;
- player abilities, health, inventory, weapons, and movement modifiers;
- spawning and removing supported native objects;
- collision, damage, interaction, checkpoint, and collection responses;
- camera, audio, effects, UI messages, and level transitions;
- persistent per-level and per-save script state;
- deterministic local simulation and, later, explicitly supported multiplayer
  simulation.

This must be achieved through stable, validated engine APIs. Lua must not receive
raw engine pointers or unrestricted access to game structs.

## Current Baseline

The repository already provides:

- one vendored Lua runtime shared by native and WebAssembly builds;
- bounded Lua memory and instruction execution;
- filesystem-backed Lua modules under `Data/Scripts/src`;
- lifecycle hooks for game, level, and frame events;
- terrain, spline, or map item hooks where each game supports them;
- generation-checked object handles;
- object position, velocity, deletion, and transient position offsets;
- a native spawn registry, with only limited game implementations;
- per-level configuration and asset dependency declarations;
- player registration and object-frame support in every game adapter;
- editor packaging, preview, status, logging, and a capability matrix.

The system is not yet a comprehensive gameplay API:

- most registered objects are players or a small pilot set;
- object data is largely limited to position and tags;
- object-frame polling is the primary live-object extension point;
- collision, interaction, damage, death, collection, and objective events are
  not exposed;
- health, animation, inventory, weapons, AI, collision, audio, effects, camera,
  UI, and level flow have no shared supported APIs;
- native spawning is stubbed or narrowly implemented in most games;
- scripted-object definitions advertise callbacks that the runtime does not
  fully implement;
- the editor and type metadata are not generated from the runtime contract;
- multiplayer scripts are disabled or unsafe because determinism and script
  synchronization are not implemented.

## Design Rules

### Stable handles, not native memory

Lua operates on generation-checked handles and immutable event snapshots.
Adapters translate validated commands into game-specific engine operations.
Never expose `ObjNode*`, object slots, arbitrary struct fields, or writable
native memory.

### Explicit capabilities

Every object handle carries a capability set. Capabilities are operation based,
for example:

- `transform.read`
- `transform.write`
- `motion.write`
- `health.read`
- `health.write`
- `damage.receive`
- `animation.play`
- `inventory.write`
- `lifecycle.delete`

An API call must fail predictably when the target lacks the required
capability. Broad ordinal levels such as `READ_ONLY`, `BASE`, and `FULL` should
be migrated to capability flags because gameplay operations do not form a safe
linear hierarchy.

### Commands at safe engine boundaries

Mutation APIs enqueue typed commands rather than modifying engine state at an
arbitrary point inside a Lua callback. Each game applies commands at documented
safe points, such as before movement, after collision, or at end of frame.

Commands must define:

- validation rules;
- authority requirements;
- application phase;
- result or failure code;
- behavior when the target disappears before application.

Immediate operations may remain only where every adapter can prove they are
safe.

### Events instead of universal polling

Use event callbacks for gameplay transitions and reserve frame hooks for
continuous behavior. Events should include:

- object spawned and removed;
- collision entered, stayed, and exited;
- trigger entered and exited;
- interaction requested;
- damage before and after application;
- object death;
- pickup collected;
- animation marker or completion;
- checkpoint reached;
- objective updated;
- player respawned;
- level completion requested.

Adapters emit only events backed by real engine call sites. The API schema must
not advertise synthetic hooks that are not wired.

### Shared mechanics, game-owned semantics

The shared runtime owns Lua execution, handles, schemas, event dispatch,
commands, state storage, budgets, and diagnostics.

Each game owns:

- which objects are visible;
- object tags and capabilities;
- property and command implementations;
- spawnable native object IDs and dependencies;
- lifecycle and event call sites;
- coordinate conventions and simulation phases;
- multiplayer authority and determinism restrictions.

### Safe defaults

Missing scripts remain non-fatal. Invalid commands reject only the command.
Repeated script failures disable the affected behavior or package according to
a documented policy without corrupting native game state.

## Target Lua API

The exact names should be finalized in the authoritative API schema. The
following shape defines the required scope.

### Object discovery and identity

```lua
local player = pangea.players.localPlayer()
local enemies = pangea.objects.find({ tags = { "enemy" } })
local object = pangea.objects.get(handle)
```

Required operations:

- look up local and indexed players;
- find objects by exact tag, tag prefix, category, native ID, owner, or radius;
- inspect stable metadata, capabilities, position, rotation, scale, velocity,
  visibility, and active state;
- compare handles and detect stale handles;
- subscribe a behavior to selected objects without scanning every object every
  frame.

Queries must have bounded result counts and deterministic ordering.

### Object properties and commands

Provide typed APIs grouped by domain:

- `transform`: position, rotation, scale, facing, teleport;
- `motion`: velocity, impulse, movement enablement, movement modifiers;
- `health`: current, maximum, heal, damage, invulnerability;
- `animation`: current animation, play, blend, speed, completion events;
- `collision`: enablement, category, trigger state, supported shape presets;
- `lifecycle`: activate, deactivate, delete;
- `ownership`: player/team/creator metadata where applicable.

Do not create one untyped `getProperty` or `setProperty` escape hatch. Each
operation needs schema validation and a game adapter implementation.

### Spawning

Support two distinct spawn paths:

1. `pangea.spawn.native(id, position, options)` creates a vetted native object.
2. `pangea.spawn.scripted(definitionId, transform, params)` creates a
   ports-only object with a registered visual/collision definition and Lua-owned
   behavior.

Each native spawn descriptor must declare:

- valid game and modes;
- option schema and defaults;
- required assets;
- resulting tags and capabilities;
- whether the object participates in save/load or multiplayer;
- cleanup and ownership rules.

Scripted objects need a real runtime implementation for spawn, update, events,
state, and deletion. Definitions must use validated native-format assets.

### Gameplay domains

Add common facades where semantics are genuinely portable:

- `pangea.players`: lookup, health, lives, inventory, input lock, respawn;
- `pangea.objectives`: create, update, complete, fail, and query objectives;
- `pangea.level`: metadata, pause state, completion, failure, restart, and
  transition requests;
- `pangea.time`: delta, elapsed time, timers, delayed callbacks, and fixed-step
  scheduling;
- `pangea.random`: seeded deterministic random streams;
- `pangea.audio`: sound, music, volume, and positional playback;
- `pangea.effects`: particles, flashes, trails, and game-supported effects;
- `pangea.camera`: targets, shakes, temporary scripted cameras, and restoration;
- `pangea.ui`: messages, counters, objective text, and game-supported HUD data;
- `pangea.save`: namespaced persistent values with schema and size limits.

Game-specific systems belong under game namespaces, for example race laps in
Cro-Mag Rally or saucer-beam state in Otto Matic. They must still use the same
schema, validation, capability, and error conventions.

### State and behavior composition

Provide three state scopes:

- behavior state: private to one behavior attachment;
- level state: reset on level unload;
- save state: explicitly persisted and versioned.

Behavior attachment must support:

- attaching a named behavior to an object or tag query;
- per-instance parameters validated against a declared schema;
- multiple behaviors on one object with deterministic priority;
- cleanup when an object or level is removed;
- explicit conflict rules for competing commands.

Avoid storing native handles in save state. Persist stable authored IDs or
script-owned data and resolve runtime handles after load.

## Authoritative API Schema

Before substantially expanding bindings, introduce one machine-readable schema
that describes:

- API version and feature versions;
- hooks and event payloads;
- context and result records;
- commands, arguments, result codes, and required capabilities;
- object properties, tags, and categories;
- native spawn descriptors and option schemas;
- game and mode availability;
- multiplayer safety classification;
- deprecation metadata and documentation.

Generate or validate the following from that schema:

- Lua binding registration tables;
- LuaLS annotations;
- frontend completion and capability metadata;
- user-facing API documentation;
- adapter conformance tests;
- runtime capability introspection.

The runtime must return its actual capability document to the editor preview.
Static editor metadata may be used as a build-time baseline but cannot be the
sole source of truth.

## Runtime Architecture Work

### Split the shared host into focused modules

Refactor `games/pangea-ports/shared/script` into modules with clear ownership:

```text
runtime/
  pangea_script_runtime.*
  pangea_script_lua.*
  pangea_script_modules.*
api/
  pangea_script_api.*
  pangea_script_schema.*
objects/
  pangea_script_handles.*
  pangea_script_queries.*
  pangea_script_behaviors.*
events/
  pangea_script_events.*
commands/
  pangea_script_commands.*
state/
  pangea_script_state.*
diagnostics/
  pangea_script_diagnostics.*
```

Keep files focused and keep game-specific engine logic out of this directory.

### Replace direct callbacks with an adapter interface

Replace the single `spawnNative` callback in `PangeaScriptGameInfo` with a
versioned adapter containing:

- capability and descriptor enumeration;
- player lookup;
- object query metadata;
- property readers;
- command validation and application;
- native spawning;
- level, audio, effect, camera, and UI services;
- save-state integration;
- network authority and deterministic-mode information.

The adapter should return typed status values and never rely on Lua stack
details.

### Event queue

Add a bounded event queue:

- native code emits immutable typed events;
- the runtime dispatches them in a documented order;
- recursive events are deferred to a later dispatch pass;
- queue overflow produces diagnostics and a deterministic drop policy;
- object handles are revalidated immediately before callback dispatch.

### Command queue

Add a bounded command buffer:

- validate Lua values when commands are created;
- revalidate target lifetime and authority when commands are applied;
- apply commands in deterministic phase and insertion order;
- expose command IDs and optional completion events for deferred operations;
- reject conflicting or unsupported commands with structured error codes.

### Scheduling

Implement timers and delayed work in the shared host rather than requiring
scripts to count frames:

- one-shot and repeating timers;
- cancellation handles;
- level-time and real-time clock selection;
- per-level cleanup;
- bounded callbacks per frame;
- deterministic timing for simulation-affecting callbacks.

### Diagnostics

Extend status reporting with:

- active package and API versions;
- events dispatched and dropped;
- commands accepted, rejected, and failed;
- Lua memory high-water mark;
- instruction use per callback;
- callback duration in development builds;
- object and behavior counts;
- last structured error with source path, line, hook, object, and event.

Add an editor inspector for live objects, tags, capabilities, attached
behaviors, queued commands, events, and script-owned state.

## Per-Game Adapter Plan

Use Bugdom 2 as the first full reference adapter because it already has asset
dependency loading and several spawn implementations. Apply the proven adapter
shape to the other games rather than developing eight independent APIs.

### Bugdom 2 reference slice

Implement end to end:

- player, selected enemies, pickups, projectiles, checkpoints, and triggers;
- health, damage, transform, animation, lifecycle, and collision capabilities;
- collision, damage, death, collection, checkpoint, and level-complete events;
- vetted spawning for D-cells, acorns, powerups, glider parts, and selected
  enemies;
- player lookup, objectives, audio, effects, UI messages, and level flow;
- one scripted encounter and one replacement pickup behavior as fixtures.

Completion of this slice establishes the shared interfaces and tests.

### Otto Matic

- register robot, saucer, humans, enemies, pickups, weapons, projectiles,
  teleporters, and mission triggers;
- expose rescue, saucer-beam, weapon, fuel, and mission events;
- support controlled robot and saucer movement/ability changes;
- retain human subtype and rescue-state metadata;
- validate cross-level skeleton and model dependencies for spawning.

### Bugdom

- register player modes, enemies, buddies, pickups, projectiles, checkpoints,
  hazards, and spline objects;
- expose ball-mode, checkpoint, damage, death, collection, and objective events;
- support vetted spawning with level asset validation;
- verify player handle replacement across death, respawn, and ball transitions.

### Nanosaur

- register player, dinosaurs, eggs, crystals, weapons, projectiles, pickups, and
  extraction objectives;
- expose fuel, jetpack, weapon, egg, damage, death, and extraction state;
- support objective replacement and selected native spawning;
- consolidate lifecycle paths so reload and direct launch do not duplicate
  events.

### Nanosaur 2

- separate adventure, race, battle, and capture-the-egg capability documents;
- register each player with ownership and locality metadata;
- expose mode-specific objectives, weapons, eggs, vehicles, and projectiles;
- keep simulation mutation disabled in network matches until the deterministic
  multiplayer phase is complete.

### Cro-Mag Rally

- model race, lap, checkpoint, finish, powerup, vehicle, and hazard semantics;
- expose cars and submarine racers with player ownership;
- add race-specific events and commands instead of disguising them as generic
  level operations;
- support local and split-screen scripting first;
- keep network mutation disabled until deterministic synchronization exists.

### Billy Frontier

- publish distinct capability documents for duel, shootout, stampede, and target
  practice;
- register mode-specific players, enemies, targets, herd entities, projectiles,
  pickups, and objectives;
- expose accurate area time and mode-specific completion events;
- validate native spawns against the active mode.

### Mighty Mike

- define dedicated 2D transform, motion, collision, and query operations;
- register player, enemies, projectiles, inventory items, keys, health, and map
  triggers;
- expose scene/area transitions and fixed-step timing;
- do not expose unsupported 3D fields or APIs in runtime metadata or LuaLS.

## Editor and Package Work

### Script project model

Extend sidecars to describe:

- behavior definitions and parameter schemas;
- object bindings and stable authored identities;
- ports-only placements;
- required API and feature versions;
- game/mode capability requirements;
- persistent state schema and migration version;
- native asset and spawn dependencies.

All unknown JSON must be parsed with Zod at the frontend/backend boundary and
handled through typed `Result` or `ResultAsync` paths.

### Authoring tools

Add:

- generated game-aware LuaLS annotations;
- event and command browser;
- native spawn catalog with dependencies and option forms;
- object/tag/capability inspector;
- behavior attachment and priority editor;
- objective and timer inspection;
- runtime event log and structured command failures;
- pause, step-frame, reload, and reset-script-state controls;
- compatibility report for game, mode, platform, and multiplayer restrictions.

### Hot reload

Define reload semantics explicitly:

- compile and validate the replacement package before activation;
- retain the old package if loading fails;
- call optional migration hooks for level and behavior state;
- detach removed behaviors cleanly;
- re-resolve authored bindings;
- never retain invalid closures from the old Lua state.

## Multiplayer and Determinism

Do not enable unrestricted gameplay scripting in networked Nanosaur 2 or
Cro-Mag Rally as part of the initial gameplay expansion.

Network support requires:

- identical package, config, and asset hashes for every peer;
- deterministic event ordering and command application;
- deterministic seeded random streams;
- no wall-clock, filesystem, platform-dependent, or unordered-table influence
  on simulation;
- authoritative ownership rules for player and world mutations;
- script state included in synchronization, replay, and desync diagnostics;
- bounded deterministic queries and iteration;
- join-in-progress and save-state behavior where the game supports them.

Ship read-only or cosmetic APIs separately only if they cannot affect
simulation or peer-visible state.

## Testing Strategy

### Shared C tests

Add tests for:

- handle invalidation and capability enforcement;
- schema argument and result validation;
- object query filtering, limits, and ordering;
- event order, recursion deferral, overflow, and stale targets;
- command validation, phases, conflicts, and disappearing targets;
- timer creation, cancellation, ordering, and level cleanup;
- behavior attachment, priority, state, and cleanup;
- hot reload and state migration;
- memory and instruction budgets;
- malformed values, non-finite numbers, and sandbox escape attempts.

### Adapter conformance suite

Every game adapter must pass the same contract tests for each capability it
declares:

- registered object metadata matches runtime behavior;
- unsupported operations reject without mutation;
- spawn descriptors validate options and dependencies;
- events fire once at the documented call site;
- commands apply in the documented phase;
- object removal invalidates handles and behavior state;
- level unload leaves no script-owned native objects or callbacks.

### End-to-end fixtures

Each game needs fixtures proving:

- a scripted objective;
- a player-affecting gameplay modifier;
- an enemy, hazard, pickup, or trigger behavior;
- native or scripted spawning;
- an event-driven interaction;
- reload and cleanup behavior.

Run fixtures in native and WebAssembly builds and compare event/command traces.

### Regression and performance tests

- run scripts for long sessions while checking stack and memory stability;
- measure callback and command costs with representative object counts;
- enforce per-frame event, query, command, and instruction budgets;
- verify scripting disabled and sidecar-free builds retain native behavior;
- verify all eight games build and stage after shared API changes.

## Delivery Phases

### Phase 1: Contract and architecture

- define the authoritative schema;
- replace ordinal object capability levels with capability flags;
- introduce the versioned adapter;
- add structured errors and runtime capability introspection;
- add event and command queue foundations.

Exit criteria: a minimal reference adapter can publish capabilities, emit one
event, and apply one deferred command with generated LuaLS metadata.

### Phase 2: Bugdom 2 vertical slice

- implement the full Bugdom 2 reference scope;
- implement object queries, behavior attachment, events, commands, timers,
  objectives, and selected gameplay facades;
- add editor inspection and end-to-end fixtures.

Exit criteria: scripts can build a complete custom Bugdom 2 encounter without
native code changes.

### Phase 3: Scripted objects and content

- implement ports-only object definitions and placements;
- add native-format model, collision, animation, audio, and effect descriptors;
- implement lifecycle, behavior state, and cleanup;
- add editor placement and parameter workflows.

Exit criteria: an editor-authored scripted object can be placed, interacted
with, saved, reloaded, and removed safely.

### Phase 4: Remaining single-player adapters

- implement Otto Matic, Bugdom, Nanosaur, Billy Frontier, and Mighty Mike;
- add game/mode-specific schemas and fixtures;
- remove stubbed capabilities from the editor matrix.

Exit criteria: each single-player game passes adapter conformance and its
gameplay fixtures in native and WebAssembly builds.

### Phase 5: Local multiplayer modes

- implement local Nanosaur 2 and Cro-Mag Rally capability sets;
- add ownership-aware player and objective APIs;
- test split-screen ordering and isolation.

Exit criteria: supported local modes can run gameplay scripts without exposing
network-unsafe APIs.

### Phase 6: Persistence, reload, and tooling

- implement save-state schemas and migrations;
- complete transactional hot reload;
- add debugger-quality event, command, object, and state inspection;
- generate documentation and editor metadata from the schema.

Exit criteria: substantial projects can be developed and upgraded without
losing state or diagnosing failures from raw logs alone.

### Phase 7: Deterministic network scripting

- implement package synchronization, authority, deterministic APIs, state
  synchronization, replay, and desync reporting;
- enable only capabilities proven deterministic by conformance tests.

Exit criteria: network matches reject mismatched packages and produce identical
script traces and state hashes across peers.

## Definition of Done

The gameplay scripting expansion is complete when:

- all runtime APIs and editor metadata derive from one versioned schema;
- scripts can query and safely mutate supported gameplay state without native
  pointers or untyped property access;
- events cover core gameplay transitions and commands apply at safe phases;
- native and ports-only spawning are implemented with validated dependencies;
- object behaviors, timers, objectives, and state have deterministic lifecycle
  rules;
- every declared capability is implemented and conformance-tested per game and
  mode;
- all eight games have representative gameplay fixtures passing in native and
  WebAssembly builds;
- failures are bounded, structured, inspectable, and cannot corrupt native game
  state;
- multiplayer mutation remains unavailable until synchronization and
  determinism requirements are satisfied;
- removing scripting sidecars still leaves valid native-compatible level data
  and normal native gameplay.
