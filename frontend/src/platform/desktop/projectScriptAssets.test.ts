import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectAsset, ProjectFile } from "@pangea/desktop-contracts";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, type ScriptCustomObjectDefinition } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { materializeScriptProjectAssets, resolveDesktopProjectAssets, scriptProjectAssetPaths } from "./projectScriptAssets";

const assetId = "11111111-1111-4111-8111-111111111111";
const revision = "22222222-2222-4222-8222-222222222222";
const stem = `Data/Scripts/assets/project/${assetId}/model`;

function asset(skeletal = false): ProjectAsset {
  const directory = `Assets/Models/${assetId}/${revision}`;
  return {
    version: 1, id: assetId, name: "Robot", game: "OttoMatic", revision,
    source: { mode: "managed", path: `AuthoringSources/${assetId}/robot.glb`, originalName: "robot.glb", format: "glb", dependencies: [], fingerprint: "source-hash" },
    recipe: { scale: 1, rotation: [0, 0, 0] },
    outputs: { model: `${directory}/model.bg3d`, skeleton: skeletal ? `${directory}/model.skeleton.rsrc` : null,
      preview: `${directory}/preview.glb`, files: [`${directory}/model.bg3d`] },
    animations: skeletal ? [{ name: "Idle", index: 2 }, { name: "Walk", index: 5 }] : [],
    warnings: [], importedAt: "2026-10-22T00:00:00Z", previousRevision: null,
  };
}

function workspace(skeletal = false) {
  const base = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  const definition: ScriptCustomObjectDefinition = {
    id: "custom.robot", label: "Robot", sourceFilePath: "Data/Scripts/src/objects/robot.lua", exportName: "robot",
    tags: [], description: "Robot", compatibility: "preview-ready", assetId,
    assetAnimations: skeletal ? { idle: "Idle", walk: "Walk" } : undefined,
    visual: skeletal ? { kind: "customSkeleton", modelPath: `${stem}.bg3d`, skeletonPath: `${stem}.skeleton`,
      scale: 2, slot: 450, animations: { idle: 0, walk: 1 }, initialAnimation: "idle", animationSpeed: 1.5 }
      : { kind: "customDisplayGroup", modelPath: `${stem}.bg3d`, scale: 2, slot: 450, modelObject: 0 },
    collision: { kind: "preset", preset: "enemy", bounds: { width: 20, height: 30, depth: 20 } },
  };
  return { ...base, customObjects: [definition], assets: {
    [`${stem}.bg3d`]: { path: `${stem}.bg3d`, bytes: new Uint8Array([1]), sourceName: "old.glb" },
    "Data/Scripts/assets/retained.png": { path: "Data/Scripts/assets/retained.png", bytes: new Uint8Array([8]), sourceName: "retained.png" },
  } };
}

function files(record: ProjectAsset): ProjectFile[] {
  return [{ path: record.outputs.model, bytes: new Uint8Array([2, 3]) },
    ...(record.outputs.skeleton ? [{ path: record.outputs.skeleton, bytes: new Uint8Array([4, 5]) }] : [])];
}

afterEach(() => { delete window.pangeaDesktop; vi.restoreAllMocks(); });

describe("project model references in runtime packages", () => {
  it("resolves shared users to the latest bytes without changing their settings or the input workspace", () => {
    const input = workspace();
    const first = input.customObjects[0];
    expect(first).toBeDefined();
    if (!first) return;
    const shared = { ...input, customObjects: [first, { ...first, id: "custom.second", label: "Second robot" }] };
    const record = asset();
    const result = materializeScriptProjectAssets(shared, [record], files(record));
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.assets[`${stem}.bg3d`]?.bytes).toEqual(new Uint8Array([2, 3]));
    expect(result.value.customObjects).toEqual(shared.customObjects);
    expect(result.value.assets["Data/Scripts/assets/retained.png"]).toEqual(input.assets["Data/Scripts/assets/retained.png"]);
    expect(input.assets[`${stem}.bg3d`]?.bytes).toEqual(new Uint8Array([1]));
    expect(scriptProjectAssetPaths(shared, [record])).toEqual(expect.objectContaining({ value: [record.outputs.model] }));
  });

  it("reconciles animation indices by source clip name while retaining object aliases and playback settings", () => {
    const input = workspace(true);
    const record = asset(true);
    const result = materializeScriptProjectAssets(input, [record], files(record));
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.customObjects[0]?.visual).toEqual(expect.objectContaining({
      animations: { idle: 2, walk: 5 }, initialAnimation: "idle", scale: 2, animationSpeed: 1.5,
    }));
    expect(result.value.assets[`${stem}.skeleton.rsrc`]?.bytes).toEqual(new Uint8Array([4, 5]));
    expect(input.customObjects[0]?.visual).toEqual(expect.objectContaining({ animations: { idle: 0, walk: 1 } }));
  });

  it.each(["missing", "ambiguous"])("rejects %s clip identities instead of silently changing an action", (failure) => {
    const record = asset(true);
    record.animations = failure === "missing" ? [{ name: "Idle", index: 2 }]
      : [...record.animations, { name: "Walk", index: 6 }];
    const result = materializeScriptProjectAssets(workspace(true), [record], files(record));
    expect(result.isErr() && result.error).toContain("animation 'walk'");
  });

  it("rejects a deleted registry entry even when stale runtime bytes remain", () => {
    const input = workspace();
    expect(scriptProjectAssetPaths(input, []).isErr()).toBe(true);
    const result = materializeScriptProjectAssets(input, [], []);
    expect(result.isErr() && result.error).toContain("project asset is missing");
  });

  it("rejects generated files targeting another game", () => {
    const record = { ...asset(), game: "Bugdom" };
    expect(scriptProjectAssetPaths(workspace(), [record]).isErr()).toBe(true);
    const result = materializeScriptProjectAssets(workspace(), [record], files(record));
    expect(result.isErr() && result.error).toContain("built for another game");
  });

  it("rejects incomplete model/skeleton pairs and incompatible structural changes", () => {
    const record = asset(true);
    const incomplete = materializeScriptProjectAssets(workspace(true), [record], files(record).slice(0, 1));
    expect(incomplete.isErr() && incomplete.error).toContain("skeleton is missing");
    expect(materializeScriptProjectAssets(workspace(true), [record], []).isErr()).toBe(true);
    const changed = materializeScriptProjectAssets(workspace(), [record], files(record));
    expect(changed.isErr() && changed.error).toContain("model now has a skeleton");
  });

  it("hydrates through validated IPC and keeps browser bundle snapshots usable without a desktop host", async () => {
    const input = workspace();
    expect((await resolveDesktopProjectAssets(input)).isOk()).toBe(true);
    const record = asset();
    const request = vi.fn(async (value: { operation: string }) => ({ ok: true,
      value: value.operation === "assets.list" ? [record] : files(record) }));
    window.pangeaDesktop = { request, onProjectChange: () => () => undefined, onTransfer: () => () => undefined };
    const result = await resolveDesktopProjectAssets(input);
    expect(result.isOk() && result.value.assets[`${stem}.bg3d`]?.bytes).toEqual(new Uint8Array([2, 3]));
    expect(request).toHaveBeenCalledWith({ operation: "project.read", paths: [record.outputs.model] });
  });
});
