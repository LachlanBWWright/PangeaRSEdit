import { describe, expect, it } from "vitest";
import { addEngineFiles, createEngineSource, removeEngineFile, renameEngineFile } from "./engineFiles";
import { engineFile, parseScene, replaceEngineJSON, validateEnginePackage } from "./enginePackage";
import { createWorkshopPackage } from "./workshopPackage";

describe("engine package file authoring", () => {
  it("creates source modules without overwriting files or accepting traversal", () => {
    const sample = createWorkshopPackage();
    const created = createEngineSource(sample, "modules/encounters.lua");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    expect(validateEnginePackage(created.value).isOk()).toBe(true);
    expect(createEngineSource(created.value, "modules/encounters.lua").isErr()).toBe(true);
    expect(createEngineSource(sample, "../escape.lua").isErr()).toBe(true);
    expect(createEngineSource(sample, "image.png").isErr()).toBe(true);
  });
  it("protects live scene and entry dependencies during file operations", () => {
    const sample = createWorkshopPackage();
    for (const path of ["package.json", "main.lua", "scenes/arena.lua", "scenes/arena.json"]) {
      expect(removeEngineFile(sample, path).isErr()).toBe(true);
      expect(renameEngineFile(sample, path, "moved.lua").isErr()).toBe(true);
    }
    const added = createEngineSource(sample, "unused.lua");
    if (added.isErr()) return;
    const removed = removeEngineFile(added.value, "unused.lua");
    expect(removed.isOk() && !engineFile(removed.value, "unused.lua")).toBe(true);
  });
  it("updates declared scene model references atomically on rename", () => {
    const sample = createWorkshopPackage();
    const added = addEngineFiles(sample, [{ path: "assets/robot.bg3d", bytes: new Uint8Array([1, 2, 3]) }]);
    if (added.isErr()) return;
    const sceneFile = engineFile(sample, "scenes/arena.json");
    if (!sceneFile) return;
    const scene = parseScene(sceneFile);
    if (scene.isErr()) return;
    const declared = replaceEngineJSON(added.value, sceneFile.path, { ...scene.value, assets: [{ id: "robot", file: "assets/robot.bg3d" }] });
    expect(removeEngineFile(declared, "assets/robot.bg3d").isErr()).toBe(true);
    const renamed = renameEngineFile(declared, "assets/robot.bg3d", "models/robot.bg3d");
    expect(renamed.isOk()).toBe(true);
    if (renamed.isErr()) return;
    expect(validateEnginePackage(renamed.value).isOk()).toBe(true);
    const nextFile = engineFile(renamed.value, sceneFile.path);
    const nextScene = nextFile ? parseScene(nextFile) : undefined;
    expect(nextScene?.isOk() && nextScene.value.assets[0]?.file).toBe("models/robot.bg3d");
    expect(renameEngineFile(renamed.value, "models/robot.bg3d", "models/robot.lua").isErr()).toBe(true);
  });
  it("reserves archive schema slots and rejects duplicate assets in the same import", () => {
    const sample = createWorkshopPackage();
    const asset = { path: "assets/robot.bg3d", bytes: new Uint8Array() };
    expect(addEngineFiles(sample, [asset, asset]).isErr()).toBe(true);
    expect(addEngineFiles(sample, Array.from({ length: 511 }, (_, index) => ({ path: `assets/${index}.bg3d`, bytes: new Uint8Array() }))).isErr()).toBe(true);
  });
});
