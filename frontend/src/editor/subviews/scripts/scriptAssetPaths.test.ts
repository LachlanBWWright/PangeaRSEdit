import { describe, expect, it } from "vitest";
import {
  buildScriptAssetPaths,
  applyUploadedAssetPath,
} from "./scriptAssetPaths";
import { scriptCustomObjectDefinitionSchema } from "./scriptWorkspaceStateTypes";

function displayGroupDefinition() {
  const result = scriptCustomObjectDefinitionSchema.safeParse({
    id: "custom.crate",
    label: "Crate",
    sourceFilePath: "Data/Scripts/src/objects/crate.lua",
    exportName: "crate",
    tags: [],
    compatibility: "extended-only",
    description: "A test crate.",
    visual: {
      kind: "customDisplayGroup",
      modelPath: "Data/Scripts/assets/models/placeholder.bg3d",
      modelObject: 0,
      scale: 1,
      slot: 0,
    },
    collision: { kind: "none" },
  });
  expect(result.success).toBe(true);
  if (!result.success) {
    expect.fail(result.error.message);
  }
  return result.data;
}

describe("scriptAssetPaths", () => {
  it("canonicalizes modern source names and avoids native collisions", () => {
    const definition = displayGroupDefinition();
    const glb = buildScriptAssetPaths(definition, "Crate.glb", "model");
    const gltf = buildScriptAssetPaths(definition, "crate.gltf", "model");

    expect(glb).toEqual({
      assetPath: "Data/Scripts/assets/models/crate-glb.bg3d",
      manifestPath: "Data/Scripts/assets/models/crate-glb.bg3d",
      sourcePath: "Data/Scripts/assets/source/crate.glb",
    });
    expect(gltf?.assetPath).toBe("Data/Scripts/assets/models/crate-gltf.bg3d");
    expect(glb?.assetPath).not.toBe(gltf?.assetPath);
  });

  it("updates only the selected visual asset role", () => {
    const definition = displayGroupDefinition();
    const result = applyUploadedAssetPath(
      definition,
      "Data/Scripts/assets/models/new.bg3d",
      "model",
    );
    expect(result.visual.kind === "customDisplayGroup" ? result.visual.modelPath : "").toBe(
      "Data/Scripts/assets/models/new.bg3d",
    );
  });
});
