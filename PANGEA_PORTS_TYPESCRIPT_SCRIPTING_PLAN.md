# Plan: TypeScript Scripting Support for the Eight Pangea Ports

## Purpose

Add TypeScript-authored scripting support across all eight imported games in `games/pangea-ports` while respecting how each port actually works today. Scripts should let level authors extend levels, add custom item behavior, reuse items outside their original level-specific contexts where safe, and override hardcoded level-number behavior through data-driven configuration.

The eight games reviewed:

- `BillyFrontier-Android`
- `Bugdom-android`
- `Bugdom2-Android`
- `CroMagRally-Android`
- `MightyMike-Android`
- `Nanosaur-android`
- `Nanosaur2-Android`
- `OttoMatic-Android`

## Executive Summary

The ports are similar enough to share a TypeScript scripting host, but not similar enough to share one binding layer.

Seven games use 3D `ObjNode`-style gameplay objects, terrain item records, and callback-driven movement. `MightyMike-Android` is the outlier: it is a 2D fixed-point game with different map item records and a different object manager. `CroMagRally-Android` and `Nanosaur2-Android` include active network/multiplayer paths, so simulation-affecting scripts must be restricted there at first.

Recommended approach:

1. Treat TypeScript as the authoring language.
2. Compile scripts to sandboxed JavaScript before packaging or editor injection.
3. Run the compiled scripts in an embedded JavaScript engine such as QuickJS for native, Android, and WebAssembly parity.
4. Add per-game `TypeScriptBindings.c` or `ScriptBindings.c` adapters.
5. Start with `Bugdom2-Android` because it has representative terrain/spline/object systems and existing browser smoke coverage.
6. Add lifecycle hooks, item hooks, safe object handles, cross-level item manifests, and config overrides before adding deep object mutation.
7. Defer multiplayer simulation scripting until deterministic script hashing, host approval, and desync reporting are implemented.

This plan intentionally does not promise that every native item can be dropped into every level and work automatically. Many item functions assume level-specific art, globals, object groups, collision categories, skeletons, terrain features, or player modes. The plan supports a path to cross-level item loading through explicit dependency manifests and compatibility checks, not blind invocation.

## Current Architecture Review

### Monorepo and Build Model

`games/pangea-ports` is a monorepo import of eight formerly independent Android/web/native ports. Every game keeps its own:

- `CMakeLists.txt`
- source tree, usually `Source/` or `src/`
- `Data/` assets
- `extern/Pomme`
- WebAssembly shell/export list
- build script

Repository-level metadata in `games/pangea-ports/scripts/ports.py` describes native/WASM tasks, staging paths, direct-launch support, browser smoke coverage, and current editor integration examples.

The scripting host should therefore be an optional shared static library that each game links explicitly, not a global top-level build assumption.

### Common 3D Game Pattern

Most ports share this pattern:

- `Boot.cpp` initializes Pomme/SDL and parses direct-launch parameters.
- `System/Main.c` or equivalent runs menus, initializes levels, frame loops, and cleanup.
- `System/Objects.c` owns `MoveObjects`.
- `Terrain/Terrain2.c` owns terrain item dispatch through `gTerrainItemAddRoutines`.
- `Terrain/SplineItems.c` owns spline item dispatch through `gSplineItemPrimeRoutines`.
- `System/File.c` or `System/LoadLevel.c` loads level art and terrain.
- Gameplay objects are `ObjNode` records with `MoveCall` callbacks.

Good TypeScript insertion points:

- after engine managers are initialized
- after level art/terrain loads
- after terrain/spline items are primed
- once per gameplay frame near `MoveObjects`
- during level completion and cleanup
- inside item dispatch tables for reserved scripted item types
- inside web command files for script injection/reload/status

### Existing Web/Editor Pattern

The ports already support editor-like workflows:

- direct level launch through argv or URL parameters
- terrain/map override in several games
- Emscripten `EXPORTED_FUNCTIONS` for web control/debug functions
- virtual filesystem injection before boot

TypeScript scripting should reuse this model:

- bundled source/config lives under `Data/Scripts`
- compiled JavaScript lives under `Data/Scripts/dist`
- editor-injected scripts are written into Emscripten FS before boot
- web shells call `_PangeaScript_SetStartupScript`, `_PangeaScript_Reload`, `_PangeaScript_GetLastError`, and `_PangeaScript_IsEnabled`

## Runtime Design

Use TypeScript for authoring and compiled JavaScript for runtime execution.

Recommended runtime:

- TypeScript source is compiled to plain JavaScript with a project-owned build step.
- Native, Android, and WASM builds execute the compiled JavaScript in embedded QuickJS or another small embeddable ECMAScript engine.
- The in-browser shell can still use the same compiled JavaScript bundle, but game simulation scripts should go through the same host API so behavior matches native builds.

Do not embed the TypeScript compiler in the games. Compilation should happen during packaging or editor export.

Proposed shared layout:

```text
games/pangea-ports/shared/script/
  CMakeLists.txt
  pangea_script.c
  pangea_script.h
  pangea_script_api.c
  pangea_script_api.h
  pangea_script_handles.c
  pangea_script_handles.h
  pangea_script_manifest.c
  pangea_script_manifest.h
  pangea_script_config.c
  pangea_script_config.h
  third_party/quickjs/

games/pangea-ports/shared/script-types/
  package.json
  tsconfig.json
  src/pangea.ts
  src/games/*.ts
```

Shared responsibilities:

- create/destroy sandboxed JS runtime
- load compiled scripts from game data paths
- call named hooks
- route `console.log`, `console.warn`, and `console.error` to `SDL_Log`
- expose a stable `pangea` API
- enforce execution budgets
- store last error and error counts
- manage generation-based handles
- parse script manifests and config files
- provide C status codes instead of crashing

Do not expose raw `ObjNode*`, `TerrainItemEntryType*`, `SplineItemType*`, or `ObjectEntryType*` to scripts. Scripts should receive handles and plain data objects.

## Error and Safety Contract

Use explicit status values:

```c
typedef enum PangeaScriptStatus
{
    PANGEA_SCRIPT_OK,
    PANGEA_SCRIPT_NOT_ENABLED,
    PANGEA_SCRIPT_FILE_NOT_FOUND,
    PANGEA_SCRIPT_PARSE_ERROR,
    PANGEA_SCRIPT_RUNTIME_ERROR,
    PANGEA_SCRIPT_BAD_ARGUMENT,
    PANGEA_SCRIPT_BUDGET_EXCEEDED,
    PANGEA_SCRIPT_INCOMPATIBLE_ITEM,
    PANGEA_SCRIPT_CONFIG_ERROR,
} PangeaScriptStatus;
```

Rules:

- script failures must not call fatal alert paths
- missing scripts are non-fatal
- malformed scripts/configs log and disable only the offending module
- bad handles return `undefined` or a typed error result
- repeated object callback failures disable that object's script binding
- no script API should terminate the process

Sandbox:

- no filesystem access from scripts
- no network access from scripts
- no dynamic native module loading
- no browser globals in simulation scripts
- deterministic random helpers supplied by the game adapter
- `console.*` routed to game logging

Budgets:

- `onFrame`: low budget
- item creation hooks: medium budget
- level load scripts: higher budget
- no render-loop script callbacks in v1

## TypeScript API Shape

Expose a typed `pangea` module to scripts.

```ts
import { pangea } from "pangea";

pangea.api.version;
pangea.game.id;
pangea.game.name;
pangea.level.current();
pangea.time.delta();
pangea.log.info("hello");
```

Core object API:

```ts
const player = pangea.player.get(1);
const position = pangea.object.position(player);

pangea.object.setPosition(handle, { x, y, z });
pangea.object.setVelocity(handle, { x: dx, y: dy, z: dz });
pangea.object.setHealth(handle, value);
pangea.object.delete(handle);
```

Spawn API:

```ts
pangea.spawn.native("pickup.health", { x, z }, { amount: 25 });
pangea.spawn.scripted("custom.movingPlatform", { x, y, z }, { speed: 120 });
```

Lifecycle hooks:

```ts
export function onGameStart(ctx: GameContext): void {}
export function onLevelLoad(ctx: LevelContext): void {}
export function onLevelStart(ctx: LevelContext): void {}
export function onFrame(ctx: FrameContext): void {}
export function onLevelComplete(ctx: LevelContext): void {}
export function onLevelUnload(ctx: LevelContext): void {}
export function onGameShutdown(ctx: GameContext): void {}
```

Terrain/spline hooks:

```ts
export function onTerrainItem(item: TerrainItemContext): ItemSpawnResult | void {}
export function onSplineItem(item: SplineItemContext): ItemSpawnResult | void {}
```

Script-defined object behavior:

```ts
import type { ScriptedObjectDefinition } from "pangea";

export const movingPlatform: ScriptedObjectDefinition = {
  onSpawn(self, ctx) {},
  onUpdate(self, ctx) {},
  onCollision(self, other, ctx) {},
  onDamage(self, amount, ctx) {
    return amount;
  },
  onDelete(self, ctx) {},
};
```

## Cross-Level Native Item Loading

The plan should support reusing native items in levels where they were not originally available, but only through explicit compatibility declarations.

Many Pangea item functions are level-specific. A terrain item add routine may assume:

- a model group was loaded by that level's `LoadLevelArt`
- a skeleton type exists in that level
- a texture/material is present
- a collision category has a specific meaning
- global level variables have been initialized
- the current player mode matches the item
- terrain/water/fence data exists
- an item id maps to a level-local enum

Therefore, "load any item in any level" should be a controlled capability:

1. Build a per-game native item registry.
2. Record dependencies for each item.
3. Allow config/script manifests to request additional item dependencies before level start.
4. Validate dependencies before item creation.
5. Fail gracefully if an item is incompatible.

Example item registry entry:

```json
{
  "id": "ottomatic.teleporter",
  "nativeType": 42,
  "addRoutine": "AddTeleporter",
  "requires": {
    "modelGroups": ["GLOBAL", "TELEPORTER"],
    "sounds": ["TELEPORTER"],
    "playerModes": ["robot"],
    "systems": ["terrain", "collision"]
  },
  "allowedGames": ["OttoMatic-Android"],
  "defaultLevels": [1, 2, 3],
  "crossLevel": "allowedWithDependencies"
}
```

Config can then opt into cross-level support:

```json
{
  "levels": {
    "7": {
      "extraNativeItems": [
        "ottomatic.teleporter",
        "ottomatic.powerup.freeze"
      ]
    }
  }
}
```

Implementation steps:

- add a native item registry per game
- add dependency preload hooks before `LoadLevelArt` completes, or a second resource-load pass immediately after
- add a safe `pangea.spawn.native(itemId, position, params)` wrapper
- add diagnostics that explain missing dependencies
- keep unsupported items disabled rather than crashing

V1 scope:

- support a whitelist of simple pickups, powerups, boosts, and trigger-like items
- do not support bosses, mode-specific vehicles, or items with deep level globals until their dependencies are fully mapped

## Script-Defined Items and Behaviors

The plan should also support entirely new script-defined behavior, not only native item reuse.

Two categories are useful:

1. Script-defined item records: terrain/map/spline item ids reserved for script dispatch.
2. Script-defined object behaviors: runtime object logic implemented in TypeScript and attached to a native host object.

Reserved item ranges:

- 3D terrain items: `SCRIPT_ITEM_BASE` through `SCRIPT_ITEM_BASE + 255`
- 3D spline items: `SCRIPT_SPLINE_ITEM_BASE` through `SCRIPT_SPLINE_ITEM_BASE + 255`
- Mighty Mike map items: `SCRIPT_MAP_ITEM_BASE` through `SCRIPT_MAP_ITEM_BASE + 255`

Example TypeScript:

```ts
import { defineTerrainItem, pangea } from "pangea";

export const bouncingHealth = defineTerrainItem({
  id: "custom.bouncingHealth",
  nativeType: 240,
  onSpawn(item) {
    return pangea.spawn.scripted("custom.bouncingPickup", item.position, {
      amount: item.params[0] + 10,
    });
  },
});
```

Script-defined behavior can use a native host object with safe properties:

```ts
export const bouncingPickup = {
  onSpawn(self) {
    self.state.baseY = pangea.object.position(self.handle).y;
  },
  onUpdate(self, ctx) {
    const pos = pangea.object.position(self.handle);
    pangea.object.setPosition(self.handle, {
      ...pos,
      y: self.state.baseY + Math.sin(ctx.time * 4) * 30,
    });
  },
};
```

V1 should include:

- scripted pickup host
- scripted trigger volume host
- scripted moving display object host
- scripted frame callback with strict budget

V1 should not include:

- arbitrary native pointer mutation
- script-created skeleton definitions
- script-created renderer materials
- script access to direct filesystem/network APIs

## Config-Driven Level Behavior Overrides

The ports contain many hardcoded level-number branches in `LoadLevelArt`, `InitArea`, player setup, music, lighting, goal logic, and direct-launch handling. A scripting system should include config files that override selected level-number behavior without requiring C edits.

Recommended file layout:

```text
Data/Scripts/config/game.json
Data/Scripts/config/levels.json
Data/Scripts/config/items.json
Data/Scripts/config/scripts.json
```

Example:

```json
{
  "levels": {
    "3": {
      "script": "Data/Scripts/dist/levels/gardenChallenge.js",
      "music": "alternate_garden",
      "skipIntro": true,
      "extraNativeItems": ["bugdom2.pickup.clover", "bugdom2.trap.mouse"],
      "itemOverrides": {
        "12": {
          "mapTo": "custom.bouncingHealth"
        }
      },
      "rules": {
        "startingHealth": 75,
        "completionMode": "scripted"
      }
    }
  }
}
```

Config responsibilities:

- select a script by level/area/race mode
- override direct level intro/menu behavior
- request extra native item dependencies
- remap terrain/map item ids
- override music, lighting presets, completion rules, spawn rules, and simple mode flags
- define script-defined item ids

Do not start by making every C branch configurable. Start with:

- script path per level
- extra native item dependencies per level
- item id remapping per level
- direct-launch/skip-intro flags
- simple gameplay rule values

Validation:

- configs should be parsed before level load
- invalid configs should log precise errors and fall back to native behavior
- config schema should be versioned
- generated TypeScript types should match config schema

## Per-Game Review and Integration Plan

### 1. BillyFrontier-Android

Relevant structure:

- `Source/Boot.cpp` parses `--level`, `--terrain`, and URL direct-launch values into `gDirectLaunchLevel` and `gDirectTerrainPath`.
- `Source/Wasm.c` exposes `BF_SetDirectLaunchLevel`, `BF_SetTerrainFile`, and `BF_LoadTerrainData`.
- `Source/System/Main.c` owns arcade flow and `StartLevelCompletion`.
- Area-specific gameplay is split into `Source/System/Areas/Duel.c`, `Shootout.c`, `Stampede.c`, and `TargetPractice.c`.
- `Source/System/LoadLevel.c` applies direct terrain override.
- `Source/Terrain/Terrain2.c` dispatches terrain items through `gTerrainItemAddRoutines`.
- `Source/Terrain/SplineItems.c` dispatches spline items through `gSplineItemPrimeRoutines`.
- `Source/System/Objects.c` owns `MoveObjects`.

TypeScript implications:

- Billy is mode-based, not a simple linear level game.
- Scripts should receive `area` and `mode` context.
- Duel, Shootout, Stampede, and TargetPractice need distinct hook aliases.
- `StartLevelCompletion` is a useful API endpoint.
- Stampede spline hooks are valuable because moving stampede actors are spline-driven.

Recommended hooks:

```ts
export function onAreaLoad(ctx: BillyAreaContext): void {}
export function onDuelStart(ctx: BillyAreaContext): void {}
export function onShootoutStart(ctx: BillyAreaContext): void {}
export function onStampedeStart(ctx: BillyAreaContext): void {}
export function onTargetPracticeStart(ctx: BillyAreaContext): void {}
export function onAreaFrame(ctx: FrameContext): void {}
export function onAreaComplete(ctx: BillyAreaContext): void {}
```

Cross-level item support:

- Start with boosts, simple pickups, and target-practice/shootout props.
- Require per-area dependency declarations because Duel/Shootout/Stampede/TargetPractice load different assets and globals.
- Do not allow duel enemies or stampede actors in unrelated modes until their mode globals are mapped.

Config support:

- map `gDirectLaunchLevel` values to named area configs
- override terrain path, area script, completion timer, target counts, and allowed scripted item ranges

### 2. Bugdom-android

Relevant structure:

- `src/Boot.cpp` parses `--level` and web `?level=`.
- `src/System/Main.c` owns `PlayGame`, `InitArea`, `PlayArea`, and `CleanupLevel`.
- `src/System/File.c` owns `LoadLevelArt`.
- `src/System/Objects.c` owns `MoveObjects`.
- `src/Terrain/Terrain2.c` dispatches terrain items through `gTerrainItemAddRoutines`.
- `src/Terrain/SplineItems.c` dispatches spline items through `gSplineItemPrimeRoutines`.
- `src/Items/Triggers.c`, `Triggers2.c`, `Traps.c`, and `Items*.c` are useful script-adjacent systems.
- `src/Player/Player_Bug.c`, `Player_Ball.c`, and `Player_Control.c` split player modes.

TypeScript implications:

- Good candidate after Bugdom 2 because the architecture is similar but older.
- Terrain item hooks are the best first extension point.
- Ride systems should be exposed only after object handles are stable.

Cross-level item support:

- Start with pickups, traps, and simple triggers.
- Model/skeleton-heavy enemies need dependency checks against `LoadLevelArt`.
- Ball/bug player-mode-specific items should declare required player modes.

Config support:

- override level script path, music, intro skip, item id remaps, and simple completion rules
- support extra model/sound dependency declarations only after the registry exists

### 3. Bugdom2-Android

Relevant structure:

- `Source/Boot.cpp` owns `gStartLevel` and direct-launch parsing.
- `Source/System/WebInterface.c` already exposes web debug/control functions including `SetStartLevel`.
- `Source/System/Main.c` owns `PlayGame`, `InitArea`, `InitArea_Exploration`, `PlayArea`, `PlayArea_Terrain`, `CleanupLevel`, and `StartLevelCompletion`.
- `Source/System/LoadLevel.c` owns per-level art loading.
- `Source/Terrain/Terrain2.c` dispatches terrain items through `gTerrainItemAddRoutines`.
- `Source/Terrain/SplineItems.c` dispatches spline items through `gSplineItemPrimeRoutines`.
- `Source/System/Objects.c` owns `MoveObjects`.
- `Source/Items/Pickups.c`, `Powerups.c`, `Traps.c`, `BeeHive.c`, and `Items*.c` provide useful safe spawn candidates.

TypeScript implications:

- This should be the first implementation target.
- It has current browser smoke coverage and a clean web control file.
- It exercises both terrain and tunnel/exploration flows.
- It has many simple object categories to expose gradually.

Recommended hooks:

```ts
export function onLevelLoad(ctx: LevelContext): void {}
export function onLevelStart(ctx: LevelContext): void {}
export function onTerrainItem(item: TerrainItemContext): ItemSpawnResult | void {}
export function onSplineItem(item: SplineItemContext): ItemSpawnResult | void {}
export function onFrame(ctx: FrameContext): void {}
export function onLevelComplete(ctx: LevelContext): void {}
export function onLevelUnload(ctx: LevelContext): void {}
```

Cross-level item support:

- First whitelist: pickups, powerups, simple props, simple traps, and selected trigger-like objects.
- Tunnel-specific and boss-like items remain level/mode locked initially.
- Add diagnostics for missing model groups and level art assumptions.

Config support:

- `levels.json` should map level number to script, extra native items, item remaps, starting player state, skip intro, and completion mode.
- Add `_PangeaScript_*` exports to `Source/System/WebInterface.c`.

### 4. CroMagRally-Android

Relevant structure:

- `Source/Boot.cpp` contains substantial Emscripten networking bridge code.
- `Source/System/Main.c` owns race/game flow.
- `Source/System/network.c` and `Source/System/pangea_net.c` handle networking and match lifecycle.
- `Source/Terrain/Checkpoints.c` owns checkpoint/lap progression.
- `Source/Terrain/Paths.c`, `Fences.c`, `SplineItems.c`, and `Terrain2.c` drive race world placement.
- `Source/Player/Player_Car.c`, `Player_Submarine.c`, and `Player_Weapons.c` are core simulation paths.
- `Source/Terrain/Terrain2.c` uses `AddTerrainItemsOnSuperTile(row, col, playerNum)`, which is player-aware.

TypeScript implications:

- Treat this as a race scripting API, not a generic object-mod API at first.
- Network mode is the major constraint.
- Local/practice scripts can handle lap counts, checkpoint events, powerup rules, and race completion.

Recommended hooks:

```ts
export function onRaceConfig(ctx: RaceConfigContext): void {}
export function onRaceStart(ctx: RaceContext): void {}
export function onCheckpoint(player: RacePlayer, checkpoint: number, ctx: RaceContext): void {}
export function onLapComplete(player: RacePlayer, lap: number, ctx: RaceContext): void {}
export function onPowerupCollected(player: RacePlayer, powerup: PowerupContext, ctx: RaceContext): void {}
export function onRaceFinish(results: RaceResults, ctx: RaceContext): void {}
```

Cross-level item support:

- Prefer race-safe categories: powerups, hazards, checkpoint helpers, visual props.
- Do not move car/submarine-specific systems across modes without explicit mode checks.
- Terrain item scripts must include `playerNum` context.

Config support:

- override lap count, race mode defaults, track script, allowed powerups, starting inventory, and local-only rule variants
- network matches must reject simulation-affecting config unless all peers share the same hash

### 5. MightyMike-Android

Relevant structure:

- `src/Boot.cpp` parses `--level scene:area`, `--map-override`, URL `?level=`, and `?mapOverride=`.
- `src/WebCheat.cpp` exposes Emscripten commands.
- `src/Heart/Main.c` owns `InitArea`, `PlayArea`, direct boot, and scene/area progression.
- `src/Drivers/ObjectManager.c` owns `MoveObjects`.
- `src/Playfield/Playfield.c` loads object/map data into `ObjectEntryType` records and tracks `gMasterItemList`.
- `src/Headers/structures.h` defines the 2D `ObjNode`, `ObjectEntryType`, fixed-point coordinates, and player save structures.

TypeScript implications:

- This is not a 3D terrain/spline adapter.
- Expose coordinates as 2D `x, y`.
- Convert fixed-point values inside the C adapter.
- Map item hooks should be based on `ObjectEntryType`, not `TerrainItemEntryType`.
- Scene/area naming should be first-class.

Recommended hooks:

```ts
export function onSceneLoad(ctx: MikeSceneContext): void {}
export function onAreaLoad(ctx: MikeAreaContext): void {}
export function onAreaStart(ctx: MikeAreaContext): void {}
export function onMapItem(item: MikeMapItemContext): ItemSpawnResult | void {}
export function onAreaFrame(ctx: FrameContext): void {}
export function onAreaUnload(ctx: MikeAreaContext): void {}
```

Cross-level item support:

- Start with simple 2D pickups, traps, and props.
- Enemy and weapon items need scene dependency checks because art, animation, and object type assumptions vary.
- `ObjectEntryType` item remapping should be separate from 3D terrain item remapping.

Config support:

- override scene/area script, map override path, item id remaps, player starting state, coin/health rules, and scene-specific extra items

### 6. Nanosaur-android

Relevant structure:

- `src/Boot.cpp` parses `--level`, `--skip-menu`, terrain override, and web parameters.
- `src/System/Main.c` owns `InitLevel`, `PlayLevel`, `CleanupLevel`, and an Emscripten main loop path through `emscripten_set_main_loop_arg`.
- `src/System/WebAPI.c` exposes web/editor-facing functions.
- `src/System/File.c` owns `LoadLevelArt(short levelNum)`.
- `src/System/Objects.c` owns `MoveObjects`.
- `src/Terrain/Terrain2.c` dispatches terrain items.
- There is no separate `SplineItems.c` in the reviewed source listing, so scripting should start with terrain/items and frame hooks.
- `src/Items/TimePortal.c`, `Pickups.c`, `Traps.c`, and `Triggers.c` are useful binding candidates.

TypeScript implications:

- The Emscripten loop path means script lifecycle must be placed around `InitLevel`/`CleanupLevel`.
- Time portal and goal state should be exposed as high-level APIs later.

Cross-level item support:

- Start with pickups, traps, and trigger helpers.
- Dinosaurs and portal logic should be dependency-checked because skeletons, animations, and goal state are level-sensitive.

Config support:

- override level script, terrain override, skip menu/intro behavior, item remaps, portal/goal rule values, and extra simple native items

### 7. Nanosaur2-Android

Relevant structure:

- `Source/System/Main.c` owns `PlayGame_Adventure`, `PlayGame_Versus`, `InitLevel`, `PlayLevel`, `CleanupLevel`, and `StartLevelCompletion`.
- `Source/System/WebCommands.c` is a large web command/network bridge and already contains match config, terrain override, debug input scripting, and network packet handling.
- `Source/System/LoadLevel.c` owns level art loading.
- `Source/Terrain/Terrain2.c` dispatches terrain items.
- `Source/Terrain/SplineItems.c` dispatches spline items.
- `Source/3D/SplineManager.c` exists in addition to terrain spline item priming.
- `Source/Player/Player_Race.c` owns race marker/lap completion behavior.
- `Source/System/Main.c` has separate network frame phases.

TypeScript implications:

- This game has adventure and race/versus modes.
- It already has a web debug input script function; the new scripting API should not conflict with it.
- Local adventure scripting can follow the Bugdom2 model.
- Race scripting should mirror Cro-Mag concepts.

Cross-level item support:

- Whitelist simple pickups/items first.
- Egg/crystal/wormhole/race-marker behavior needs typed high-level APIs and mode checks.
- Networked play must reject simulation-affecting scripts/config unless all peers share the same hash.

Config support:

- override adventure script, versus/race script, extra native item dependencies, item remaps, starting inventory, lap/race rules, and local-only mode rules
- add script/config hash to network match metadata before enabling network simulation scripting

### 8. OttoMatic-Android

Relevant structure:

- `src/Boot.cpp` owns `gDirectLevelNum` and direct level parsing.
- `src/System/GameMain.c` owns `PlayGame`, `InitArea`, `PlayArea`, `CleanupLevel`, direct-level boot, and browser yielding.
- `src/System/File.c` owns `LoadLevelArt`.
- `src/System/Objects.c` owns `MoveObjects`.
- `src/Terrain/Terrain2.c` dispatches terrain items.
- `src/Terrain/SplineItems.c` dispatches spline items.
- `src/Items/` is broad and level-specific: humans, powerups, teleporters, volcanoes, ziplines, cannons, bumper cars, traps, triggers.
- `src/Player/Player_Robot.c`, `Player_Saucer.c`, and `Player_Weapons.c` represent distinct player modes.

TypeScript implications:

- Otto has many level-specific mechanics and should get richer bindings only after the generic adapter is mature.
- Initial scripting should target lifecycle hooks, item scripting, and simple spawn/trigger behavior.
- Player mode APIs should be explicit: robot vs saucer.

Cross-level item support:

- Start with powerups, simple triggers, humans where dependencies are clear, and selected props.
- Teleporters, ziplines, cannons, vehicles, volcanoes, and level-specific mechanisms need explicit dependency manifests.
- Do not expose all `src/Items` functions at once.

Config support:

- override level script, skip fluff/direct launch behavior, item remaps, extra native items, player mode restrictions, and simple completion rules

## Build Integration Plan

Add a shared CMake option:

```cmake
option(PANGEA_ENABLE_SCRIPTING "Enable TypeScript-authored scripting support" OFF)
```

Each game CMake should:

- add `games/pangea-ports/shared/script` when enabled
- compile its own `ScriptBindings.c`
- link `PangeaScript`
- define `PANGEA_ENABLE_SCRIPTING=1`
- append standard Emscripten exports

Standard web exports:

```text
_PangeaScript_IsEnabled
_PangeaScript_SetStartupScript
_PangeaScript_Reload
_PangeaScript_GetLastError
_PangeaScript_GetErrorCount
```

Because each port has its own `EXPORTED_FUNCTIONS` list, update each CMake file explicitly.

## Script Packaging and Editor Injection

Bundled scripts and configs:

```text
Data/Scripts/src/main.ts
Data/Scripts/src/levels/<level>.ts
Data/Scripts/dist/main.js
Data/Scripts/dist/levels/<level>.js
Data/Scripts/config/game.json
Data/Scripts/config/levels.json
Data/Scripts/config/items.json
```

Development overrides:

- native: `--script Data/Scripts/dist/dev.js`
- web: `?script=Data/Scripts/dist/dev.js`
- config: `--script-config Data/Scripts/config/dev-levels.json`
- editor injection: compile TypeScript in the editor, write JavaScript/config into Emscripten FS before boot, then call `_PangeaScript_SetStartupScript`

Do not load arbitrary remote script URLs in v1.

## Rollout Plan

### Phase 1: Bugdom 2 Runtime Foundation

Tasks:

- vendor an embedded JavaScript runtime
- add shared script host and CMake option
- add TypeScript type package
- add Bugdom 2 adapter
- load `Data/Scripts/dist/main.js`
- parse `Data/Scripts/config/levels.json`
- expose `console.*`, error getters, and reload
- call `onLevelLoad`, `onLevelStart`, and `onFrame`

Exit criteria:

- native build works with scripting on and off
- WASM build works with scripting on
- missing script/config is non-fatal
- malformed script/config is reported without crash
- simple script logs current level

### Phase 2: Bugdom 2 Terrain Items, Config Overrides, and Handles

Tasks:

- add generation object handles
- reserve scripted terrain item ids
- call `onTerrainItem`
- implement level config item remapping
- implement one `extraNativeItems` whitelist path
- expose player position read-only
- spawn one whitelisted pickup/object

Exit criteria:

- scripted terrain item works in a level
- config can remap a terrain item id to a script-defined behavior
- config can enable one safe cross-level native item
- invalid script return is logged and ignored
- stale handles are rejected

### Phase 3: Script-Defined Object Movement

Tasks:

- add native `MoveCall` shim
- add `onSpawn`, `onUpdate`, `onDelete`
- enforce per-object callback budgets
- disable failing scripts per object

Exit criteria:

- a scripted object moves every frame
- errors affect only that object binding
- deleting object invalidates handle

### Phase 4: Expand to Similar 3D Adventure Ports

Order:

1. `Nanosaur-android`
2. `Bugdom-android`
3. `OttoMatic-Android`
4. `BillyFrontier-Android`

### Phase 5: Nanosaur 2 Local Scripting

Tasks:

- implement adventure-mode hooks
- implement local race event hooks
- add terrain/spline hooks
- add config hash plumbing
- explicitly disable simulation scripts/config in network mode

### Phase 6: Mighty Mike Adapter

Tasks:

- implement 2D map item hooks
- implement fixed-point position conversion
- implement 2D object handles
- expose scene/area lifecycle
- support `ObjectEntryType` remapping config

### Phase 7: Cro-Mag Rally Local Race Scripting

Tasks:

- implement local/practice race hooks
- expose checkpoint/lap/race result hooks
- expose safe pre-race configuration
- support local-only race config overrides
- explicitly disable simulation scripts/config in network matches

## Test Plan

Build tests:

- each game builds with scripting disabled
- each game builds with scripting enabled
- TypeScript compiles to JavaScript during packaging
- WASM builds include compiled scripts and config files
- Emscripten export lists include standard script functions

Runtime tests:

- missing script does not crash
- malformed script reports parse error
- malformed config reports precise config error
- runtime error reports hook name
- infinite loop hits execution budget
- stale object handle is rejected
- script reload clears old level references
- item remap fallback preserves native behavior when config is invalid
- incompatible cross-level native item logs dependency diagnostics and is skipped

Browser tests:

- Bugdom 2 first: boot no script, boot valid script, boot syntax-error script, boot invalid config
- later add one smoke per game
- verify `Module.ccall('PangeaScript_GetLastError', ...)` reports expected errors

Network tests:

- Cro-Mag and Nanosaur 2 reject simulation scripts/config in network mode
- future deterministic mode includes script/config hash in match setup

## Documentation Plan

Add:

```text
games/pangea-ports/docs/typescript-scripting.md
games/pangea-ports/docs/typescript-api.md
games/pangea-ports/docs/script-config.md
games/pangea-ports/docs/script-game-matrix.md
games/pangea-ports/docs/script-examples.md
```

Document per game:

- supported hooks
- unsupported hooks
- direct launch/script injection examples
- safe object categories
- cross-level native item support level
- script-defined item support
- config override support
- multiplayer restrictions
- known limitations

## Recommended First Implementation Slice

Implement only this first:

- shared JavaScript runtime host for TypeScript-compiled scripts
- TypeScript type package
- Bugdom 2 lifecycle hooks
- `Data/Scripts/dist/main.js`
- `Data/Scripts/config/levels.json`
- `console.*` logging
- error reporting
- web reload/status exports
- one terrain item hook
- one config item remap
- one safe cross-level native item whitelist entry
- one safe script-defined spawn wrapper

Do not start by exposing every object field or every native item function. The ports are old, pointer-heavy C/C++ codebases with many bespoke assumptions. A small, explicit TypeScript API with manifests and config validation will survive expansion across all eight games; a broad raw binding layer will not.
