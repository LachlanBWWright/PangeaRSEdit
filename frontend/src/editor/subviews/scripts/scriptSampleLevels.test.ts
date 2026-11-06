// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createEarthFarmSpawnerWorkspace } from "./scriptSampleLevels";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { createEarthFarmTransportWorkspace } from "./scriptTransportSample";
import { compileScriptWorkspace, buildScriptPackageZip, importScriptPackageZip } from "./scriptWorkspaceState";

describe("Earth Farm Brain Alien sample", () => {
  it("keeps transport choreography in editable level-scoped Lua with reusable helper modules", async () => {
    const created = createEarthFarmTransportWorkspace();
    expect(created.isErr() ? created.error : null).toBeNull();
    if (created.isErr()) return;
    const state = created.value;
    const path = "Data/Scripts/src/levels/earth-farm-transports.lua";
    expect(state.sourceFiles[path]?.executionScope).toBe("helper");
    expect(state.levels["0"]?.globalHooks.map((hook) => hook.hookId)).toEqual(["onLevelStart", "onFrame", "onLevelUnload", "onPlayerRespawn"]);
    expect(state.levels["1"]?.globalHooks ?? []).toEqual([]);
    expect(state.customObjects.map((object) => object.id)).toEqual(["custom.transport-top", "custom.transport-bottom", "custom.transport-beam"]);
    const compiled = compileScriptWorkspace(state);
    expect(compiled.isErr() ? compiled.error : null).toBeNull();
    if (compiled.isErr()) return;
    expect(compiled.value.compiledFiles["Data/Scripts/dist/main.lua"]?.content).toContain('["0"]');
    const archive = await buildScriptPackageZip(state);
    expect(archive.isErr() ? archive.error : null).toBeNull();
    if (archive.isErr()) return;
    const restored = importScriptPackageZip(archive.value, state.context);
    expect(restored.isErr() ? restored.error : null).toBeNull();
    if (restored.isErr()) return;
    expect(restored.value.levels["0"]?.globalHooks).toEqual(state.levels["0"]?.globalHooks);
    expect(restored.value.sourceFiles[path]?.content).toEqual(state.sourceFiles[path]?.content);
  });
  it("packages the editable starter, port model, settings and near-start placement for level 1", async () => {
    const model = new Uint8Array(await readFile("public/games/ottomatic/models/level10_brainboss.bg3d"));
    const created = createEarthFarmSpawnerWorkspace(model);
    expect(created.isOk(), created.isErr() ? created.error : "").toBe(true);
    if (created.isErr()) return;
    const workspace = created.value;
    const definition = workspace.customObjects[0];
    expect(workspace.context).toMatchObject({ gameId: "OttoMatic-Android", levelNumber: 0 });
    expect(workspace.customObjects).toHaveLength(1);
    expect(definition).toMatchObject({ label: "Brain Port", visual: { kind: "customDisplayGroup", modelObject: 5, scale: 3.5, slot: 209 } });
    expect(definition?.parameterDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "quota", defaultValue: 0 }),
      expect.objectContaining({ id: "maxAlive", defaultValue: 3 }),
    ]));
    const placements = workspace.levels[workspace.context.levelKey]?.customPlacements;
    expect(placements).toHaveLength(1);
    expect(placements?.[0]).toMatchObject({ objectId: definition?.id, position: { x: 340, y: 0, z: 2150 }, activation: { kind: "always" } });
    const source = workspace.sourceFiles[definition?.sourceFilePath ?? ""]?.content;
    expect(source).toContain('pangea.spawn.nativeResult("ottomatic.brainAlien"');
    expect(source).not.toContain("__PANGEA_CUSTOM_OBJECT_EXPORT__");
    const archived = buildScriptDefinitionBundle(workspace);
    expect(archived.isOk(), archived.isErr() ? archived.error : "").toBe(true);
    if (archived.isErr()) return;
    const restored = importScriptDefinitionBundle(archived.value, workspace.context);
    expect(restored.isOk(), restored.isErr() ? restored.error : "").toBe(true);
    if (restored.isErr()) return;
    expect(restored.value.definitions[0]?.visual).toEqual(definition?.visual);
    expect(restored.value.assets["Data/Scripts/assets/models/brain-port.bg3d"]).toEqual(model);
  });
});
