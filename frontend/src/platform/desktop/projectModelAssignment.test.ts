import { describe, expect, it } from "vitest";
import type { ProjectAsset } from "@pangea/desktop-contracts";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { createObjectDefinition } from "@/editor/subviews/scripts/scriptObjectActions";
import { OttoGlobals } from "@/data/globals/globals";
import { applyProjectAsset, projectModelRuntimePaths } from "./projectModelAssignment";
import { changeObjectVisual } from "@/editor/subviews/scripts/scriptObjectVisuals";
import { readFileSync } from "node:fs";
import { Result } from "neverthrow";
import { z } from "zod";
import { scriptCustomObjectDefinitionSchema } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";

const asset: ProjectAsset = {
  version: 1, id: "00000000-0000-4000-8000-000000000001", name: "Rescue robot", game: "OttoMatic",
  revision: "00000000-0000-4000-8000-000000000002", importedAt: "2026-10-22T00:00:00.000Z", previousRevision: null,
  source: { mode: "managed", path: "AuthoringSources/robot.glb", originalName: "robot.glb", format: "glb", dependencies: [], fingerprint: "source" },
  outputs: { model: "Assets/Models/robot/model.bg3d", skeleton: "Assets/Models/robot/model.skeleton.rsrc", preview: "Assets/Models/robot/preview.glb", files: [] },
  animations: [{ name: "Standing", index: 0 }, { name: "Running", index: 1 }], warnings: [], recipe: { scale: 1, rotation: [0, 0, 0] },
};

function definition() {
  const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)), "Rescue robot", "blank");
  expect(created.isOk()).toBe(true);
  if (created.isErr()) return;
  const first = created.value.state.customObjects[0];
  expect(first).toBeDefined();
  return first;
}

describe("shared project model assignment", () => {
  it("keeps all 35 real Otto clips available while creating at most 16 runtime actions", () => {
    const bytes = readFileSync("public/glbModels/OttoMatic.glb");
    const jsonLength = bytes.readUInt32LE(12);
    const json = Result.fromThrowable((): unknown => JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()), () => "Invalid bundled model JSON")();
    expect(json.isOk()).toBe(true);
    if (json.isErr()) return;
    const metadata = z.object({ animations: z.array(z.object({ name: z.string() })) }).safeParse(json.value);
    expect(metadata.success).toBe(true);
    if (!metadata.success) return;
    const animations = metadata.data.animations.map((clip, index) => ({ ...clip, index }));
    expect(animations).toHaveLength(35);
    const original = definition();
    if (!original) return;
    const result = applyProjectAsset(original, { ...asset, animations });
    expect(result.isOk()).toBe(true);
    if (result.isErr() || result.value.visual.kind !== "customSkeleton") return;
    expect(Object.keys(result.value.visual.animations)).toHaveLength(16);
    expect(result.value.visual.initialAnimation).toBe("Standing");
    expect(scriptCustomObjectDefinitionSchema.safeParse(result.value).success).toBe(true);
    expect(animations[34]?.name).toBe("Slide");
  });

  it("uses short aliases for oversized or duplicate names while retaining full source bindings", () => {
    const original = definition();
    if (!original) return;
    const longName = "🦖".repeat(20);
    const result = applyProjectAsset(original, { ...asset, animations: [{ name: longName, index: 0 }, { name: "Duplicate", index: 1 }, { name: "Duplicate", index: 2 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.visual).toMatchObject({ animations: { clip1: 0, clip2: 1, clip3: 2 }, initialAnimation: "clip1" });
    expect(result.value.assetAnimations).toEqual({ clip1: longName, clip2: "Duplicate", clip3: "Duplicate" });
    expect(scriptCustomObjectDefinitionSchema.safeParse(result.value).success).toBe(true);
  });

  it("rejects oversized user action maps and byte lengths at the project schema", () => {
    const original = definition();
    if (!original) return;
    const assignment = applyProjectAsset(original, asset);
    if (assignment.isErr() || assignment.value.visual.kind !== "customSkeleton") return;
    const configured = assignment.value;
    expect(scriptCustomObjectDefinitionSchema.safeParse({ ...configured, visual: { ...configured.visual, animations: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`action${index}`, index])) } }).success).toBe(false);
    const oversized = "é".repeat(32);
    expect(scriptCustomObjectDefinitionSchema.safeParse({ ...configured, visual: { ...configured.visual, animations: { [oversized]: 0 }, initialAnimation: oversized } }).success).toBe(false);
  });

  it("references one asset with stable paired runtime paths instead of copying bytes", () => {
    const original = definition();
    if (!original) return;
    const assignment = applyProjectAsset(original, asset);
    expect(assignment.isOk()).toBe(true);
    if (assignment.isErr()) return;
    const result = assignment.value;
    expect(result.assetId).toBe(asset.id);
    expect(result.assetAnimations).toEqual({ Standing: "Standing", Running: "Running" });
    expect(result.visual).toMatchObject({ kind: "customSkeleton", modelPath: projectModelRuntimePaths(asset).model, skeletonPath: projectModelRuntimePaths(asset).skeleton });
  });

  it("retains named action mappings when clip indices change", () => {
    const original = definition();
    if (!original) return;
    const assignment = applyProjectAsset(original, asset);
    expect(assignment.isOk()).toBe(true);
    if (assignment.isErr()) return;
    const assigned = assignment.value;
    if (assigned.visual.kind !== "customSkeleton") return;
    const configured = { ...assigned, assetAnimations: { walk: "Running" }, visual: { ...assigned.visual, animations: { walk: 1 }, initialAnimation: "walk", scale: 2 } };
    const reimported = applyProjectAsset(configured, { ...asset, animations: [{ name: "Running", index: 0 }, { name: "Standing", index: 1 }] });
    expect(reimported.isOk()).toBe(true);
    if (reimported.isErr()) return;
    expect(reimported.value.visual).toMatchObject({ initialAnimation: "walk", scale: 2, animations: { walk: 0 } });
    if (reimported.value.visual.kind === "customSkeleton") expect(Object.keys(reimported.value.visual.animations)).toEqual(["walk"]);
  });

  it("assigns static models without retaining obsolete animation bindings", () => {
    const original = definition();
    if (!original) return;
    const result = applyProjectAsset({ ...original, assetAnimations: { walk: "Running" } }, { ...asset, outputs: { ...asset.outputs, skeleton: null }, animations: [] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.visual.kind).toBe("customDisplayGroup");
    expect(result.value.assetAnimations).toBeUndefined();
  });

  it("retains a missing named action for explicit repair instead of using a replacement at its old index", () => {
    const original = definition();
    if (!original) return;
    const assignment = applyProjectAsset(original, asset);
    if (assignment.isErr() || assignment.value.visual.kind !== "customSkeleton") return;
    const configured = { ...assignment.value, assetAnimations: { walk: "Running" }, visual: { ...assignment.value.visual, animations: { walk: 1 }, initialAnimation: "walk" } };
    const result = applyProjectAsset(configured, { ...asset, animations: [{ name: "Standing", index: 0 }, { name: "Attack", index: 1 }] });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.assetAnimations?.walk).toBe("Running");
    expect(result.value.visual).toMatchObject({ initialAnimation: "walk", animations: { walk: 1 } });
  });

  it.each(["none", "nativeDisplayGroup", "nativeSkeleton"])("detaches shared asset bindings when choosing %s", (kind) => {
    const original = definition();
    if (!original) return;
    const assignment = applyProjectAsset(original, asset);
    expect(assignment.isOk()).toBe(true);
    if (assignment.isErr()) return;
    const changed = changeObjectVisual(assignment.value, kind, "OttoMatic-Android");
    expect(changed.visual.kind).toBe(kind);
    expect(changed.assetId).toBeUndefined();
    expect(changed.assetAnimations).toBeUndefined();
  });
});
