import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { BugdomGlobals, OttoGlobals } from "@/data/globals/globals";
import {
  buildScriptDefinitionBundle,
  importScriptDefinitionBundle,
} from "./scriptDefinitionBundle";
import { updateNativeModelGroup } from "./scriptNativeVisualEdits";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
  addScriptAsset,
  updateCustomObjectDefinition,
} from "./scriptWorkspaceState";

describe("script definition bundles", () => {
  it("round-trips game-scoped definitions without level placements", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(workspace);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;

    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      context,
    );
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) return;

    expect(importedResult.value.gameId).toBe(context.gameId);
    expect(importedResult.value.definitions).toHaveLength(1);
    expect(Object.keys(importedResult.value.sources)).toHaveLength(1);
  });

  it("rejects definitions imported into a different game", () => {
    const sourceContext = createScriptWorkspaceContext(OttoGlobals, 0);
    const sourceWorkspace = loadScriptSample(sourceContext, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(sourceWorkspace);
    const targetContext = createScriptWorkspaceContext(BugdomGlobals, 0);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;
    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      targetContext,
    );
    expect(importedResult.isErr()).toBe(true);
  });

  it("preserves cross-level model banks and rejects banks from other games", () => {
    const context = createScriptWorkspaceContext(BugdomGlobals, 0);
    let workspace = loadScriptSample(context, "hover-beacon");
    const definition = workspace.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const nativeDefinition = {
      ...definition,
      visual: {
        kind: "nativeDisplayGroup", group: "global", modelObject: 0, scale: 1, slot: 100,
      },
    } satisfies typeof definition;
    const forestDefinition = updateNativeModelGroup(nativeDefinition, "forest", context.gameId);
    expect(updateNativeModelGroup(forestDefinition, "park", context.gameId)).toBe(forestDefinition);
    expect(updateNativeModelGroup(forestDefinition, "unknown", context.gameId)).toBe(forestDefinition);
    workspace = updateCustomObjectDefinition(workspace, forestDefinition);
    const bundle = buildScriptDefinitionBundle(workspace);
    expect(bundle.isOk()).toBe(true);
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.definitions[0]?.visual).toEqual(forestDefinition.visual);
  });

  it("carries skeleton resource forks when reusing animated items", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let workspace = loadScriptSample(context, "hover-beacon");
    const definition = workspace.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const modelPath = "Data/Scripts/assets/skeletons/robot.bg3d";
    const skeletonPath = "Data/Scripts/assets/skeletons/robot.skeleton";
    workspace = updateCustomObjectDefinition(workspace, {
      ...definition,
      visual: {
        kind: "customSkeleton", modelPath, skeletonPath,
        animations: { idle: 0 }, initialAnimation: "idle",
        animationSpeed: 1, scale: 1, slot: 100,
      },
    });
    const model = new Uint8Array([1, 2, 3]);
    const skeleton = new Uint8Array([4, 5, 6]);
    workspace = addScriptAsset(workspace, modelPath, model, "robot.bg3d");
    const missingResource = buildScriptDefinitionBundle(workspace);
    expect(missingResource.isErr()).toBe(true);
    if (missingResource.isErr()) expect(missingResource.error).toContain(`${skeletonPath}.rsrc`);
    workspace = addScriptAsset(workspace, `${skeletonPath}.rsrc`, skeleton, "robot.skeleton.rsrc");
    const bundle = buildScriptDefinitionBundle(workspace);
    expect(bundle.isOk()).toBe(true);
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.assets[modelPath]).toEqual(model);
    expect(imported.value.assets[`${skeletonPath}.rsrc`]).toEqual(skeleton);
  });

  it("rejects bundles whose manifest omits a definition's source", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const bytes = zipSync({
      "manifest.json": strToU8(JSON.stringify({
        schemaVersion: 1, gameId: context.gameId,
        definitions: workspace.customObjects, sourcePaths: [], assetPaths: [],
      })),
    });
    const result = importScriptDefinitionBundle(bytes, context);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("omits source");
  });
});
