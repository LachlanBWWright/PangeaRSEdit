// @vitest-environment node
import { describe, expect, it } from "vitest";
import "../../../../tests/setup/scriptLuaValidation";
import { LuaFactory } from "wasmoon";
import { Result, ResultAsync } from "neverthrow";
import { OttoGlobals, MightyMikeGlobals } from "@/data/globals/globals";
import { buildPlacementActivationRuntime } from "./scriptPlacementActivationLua";
import { setCustomPlacementActivation } from "./scriptPlacementActivation";
import { buildLevelPlacementSpawns } from "./scriptLevelRouting";
import { createScriptWorkspaceContext, loadScriptSample, compileScriptWorkspace, buildScriptPackageZip, importScriptPackageZip, updateWorkspaceLevel, updateCustomObjectDefinition } from "./scriptWorkspaceState";

function fixture() {
  const sample = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const definition = sample.customObjects[0];
  const workspace = definition ? updateCustomObjectDefinition(sample, { ...definition, parameterDefinitions: [{ kind: "number", id: "quota", label: "Quota", defaultValue: 3 }] }) : sample;
  return updateWorkspaceLevel(workspace, workspace.context.levelKey, (level) => ({
    ...level,
    customPlacements: level.customPlacements.map((entry) => ({ ...entry, position: { x: 0, y: 0, z: 0 }, parameterOverrides: { quota: 7 } })),
  }));
}

describe("placement activation", () => {
  it("keeps legacy placements always active and validates radius changes", () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    expect(placement).toBeDefined();
    if (!placement) return;
    expect(buildLevelPlacementSpawns(workspace, "onLevelStart").join("\n")).toContain("__spawnPlacement(");
    for (const radius of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(setCustomPlacementActivation(workspace, placement.id, { kind: "near-player", radius }).isErr()).toBe(true);
    }
    expect(setCustomPlacementActivation(workspace, "missing", { kind: "always" }).isErr()).toBe(true);
  });

  it("preserves activation through compilation and package roundtrip", async () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    if (!placement) return;
    const activation = { kind: "near-player", radius: 100 };
    const changed = setCustomPlacementActivation(workspace, placement.id, activation)._unsafeUnwrap();
    expect(buildLevelPlacementSpawns(changed, "onLevelStart").join("\n")).not.toContain("__spawnPlacement(");
    const compiled = compileScriptWorkspace(changed)._unsafeUnwrap();
    expect(compiled.levels[workspace.context.levelKey]?.customPlacements[0]?.activation).toEqual(activation);
    const archive = (await buildScriptPackageZip(changed))._unsafeUnwrap();
    const imported = importScriptPackageZip(archive, workspace.context)._unsafeUnwrap();
    expect(imported.levels[workspace.context.levelKey]?.customPlacements[0]?.activation).toEqual(activation);
    expect(imported.levels[workspace.context.levelKey]?.customPlacements[0]?.parameterOverrides).toEqual({ quota: 7 });
  });

  it("executes horizontal activation, hysteresis, return reset and external deletion in Lua 5.4", async () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    if (!placement) return;
    const changed = setCustomPlacementActivation(workspace, placement.id, { kind: "near-player", radius: 100 })._unsafeUnwrap();
    const factory = Result.fromThrowable(() => new LuaFactory(), String)()._unsafeUnwrap();
    const engine = (await ResultAsync.fromPromise(factory.createEngine(), String))._unsafeUnwrap();
    const program = `
      local spawned, deleted, players = 0, 0, {}
      local live = {}
      local last
      local pangea = {
        player = { count = function() return #players end, get = function(index) return players[index + 1] end },
        object = {
          exists = function(handle) return live[handle.id] == true end,
          delete = function(handle) live[handle.id] = false; deleted = deleted + 1; return true end,
        },
      }
      local function __spawnPlacement(objectId, position, values, id, level)
        spawned = spawned + 1
        last = { id = spawned, generation = 1 }
        live[last.id] = true
        assert(id == ${JSON.stringify(placement.id)} and level == ${JSON.stringify(workspace.context.levelKey)})
        assert(values.quota == 7)
        return last
      end
      ${buildPlacementActivationRuntime(changed)}
      local ctx = { levelNum = ${Number(workspace.context.levelKey)} }
      __updateNearPlacements(ctx)
      assert(spawned == 0)
      players = { { position = { x = 200, y = 0, z = 0 } } }
      __updateNearPlacements(ctx)
      assert(spawned == 0)
      players[2] = { position = { x = 90, y = 9999, z = 0 } }
      __updateNearPlacements(ctx)
      assert(spawned == 1)
      players[2].position.x = 115
      __updateNearPlacements(ctx)
      assert(deleted == 0)
      players[2].position.x = 125
      __updateNearPlacements(ctx)
      assert(deleted == 1)
      players[2].position.x = 90
      __updateNearPlacements(ctx)
      assert(spawned == 2)
      live[last.id] = false
      __updateNearPlacements(ctx)
      assert(spawned == 2)
      players[2].position.x = 125
      __updateNearPlacements(ctx)
      players[2].position.x = 90
      __updateNearPlacements(ctx)
      assert(spawned == 3)
      __resetNearPlacements()
      assert(deleted == 2)
      __updateNearPlacements({ levelNum = ctx.levelNum + 1 })
      assert(spawned == 3)
      return "activation passed"
    `;
    const executed = await ResultAsync.fromPromise(engine.doString(program), String);
    const closed = Result.fromThrowable(() => engine.global.close(), String)();
    expect(executed._unsafeUnwrap()).toBe("activation passed");
    expect(closed.isOk()).toBe(true);
  });

  it("uses Mighty Mike's planar X/Y world coordinates rather than its depth layer", async () => {
    const initial = fixture();
    const workspace = { ...initial, context: createScriptWorkspaceContext(MightyMikeGlobals, 0) };
    const placed = updateWorkspaceLevel(workspace, workspace.context.levelKey, (level) => ({
      ...level, customPlacements: level.customPlacements.map((entry) => ({ ...entry, position: { x: 0, y: 999, z: 1000 } })),
    }));
    const placement = placed.levels[placed.context.levelKey]?.customPlacements[0];
    if (!placement) return;
    const changed = setCustomPlacementActivation(placed, placement.id, { kind: "near-player", radius: 100 })._unsafeUnwrap();
    const factory = Result.fromThrowable(() => new LuaFactory(), String)()._unsafeUnwrap();
    const engine = (await ResultAsync.fromPromise(factory.createEngine(), String))._unsafeUnwrap();
    const executed = await ResultAsync.fromPromise(engine.doString(`
      local spawned = false
      local pangea = { player = { count = function() return 1 end, get = function() return { position = { x = 0, y = 950, z = -9999 } } end } }
      local function __spawnPlacement(objectId, position)
        assert(position.x == 0 and position.y == 1000 and position.z == 999)
        spawned = true
        return { id = 1, generation = 1 }
      end
      ${buildPlacementActivationRuntime(changed)}
      __updateNearPlacements({ levelNum = ${Number(workspace.context.levelKey)} })
      return spawned
    `), String);
    const closed = Result.fromThrowable(() => engine.global.close(), String)();
    expect(executed._unsafeUnwrap()).toBe(true);
    expect(closed.isOk()).toBe(true);
  });
});
