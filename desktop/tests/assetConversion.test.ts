import path from "node:path";
import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { GameId } from "@pangea/desktop-contracts";
import { convertAsset, type AssetConversionOptions } from "../src/assetConversion.ts";
import { io } from "../src/files.ts";
import { readGltf } from "@pangea/model-codec/node";
import * as codec from "@pangea/model-codec/node";
import { okAsync } from "neverthrow";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

async function triangle() {
  await writeFixture(root(), "source/geometry.bin", new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer));
  await writeFixture(root(), "source/mesh.gltf", JSON.stringify({
    asset: { version: "2.0" }, buffers: [{ uri: "geometry.bin", byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
  }));
  return path.join(root(), "source/mesh.gltf");
}

function options(sourcePath: string, game: GameId = "OttoMatic"): AssetConversionOptions {
  return { sourcePath, game, stagingDirectory: path.join(root(), "stage"), signal: new AbortController().signal,
    allowLossy: true, onProgress: vi.fn() };
}

describe("shared model-codec asset conversion", () => {
  it.each<GameId>(["OttoMatic", "Bugdom", "Bugdom2", "Nanosaur", "Nanosaur2", "CroMagRally", "BillyFrontier"])
  ("converts external-buffer glTF to %s game output and previews that native result", async (game) => {
    const input = await triangle();
    const configuration = options(input, game);
    const result = await convertAsset(configuration);
    expect(result.isOk(), result.isErr() ? result.error.message : "").toBe(true);
    if (result.isErr()) return;
    expect(path.extname(result.value.modelPath)).toBe(game === "Bugdom" || game === "Nanosaur" ? ".3dmf" : ".bg3d");
    expect(result.value.skeletonPath).toBeNull();
    const preview = await io(() => fs.readFile(result.value.previewPath), "read preview");
    expect(preview.isOk() && preview.value.subarray(0, 4).toString()).toBe("glTF");
    expect(configuration.onProgress).toHaveBeenLastCalledWith({ stage: "complete", message: "Converted model ready for review" });
    expect((await io(() => fs.readFile(input, "utf8"), "read source")).isOk()).toBe(true);
  });

  it("preserves matching native bytes and uses explicit skeleton companions", async () => {
    const native = path.resolve("../frontend/public/games/ottomatic/skeletons/Otto.bg3d");
    const skeleton = path.resolve("../frontend/public/games/ottomatic/skeletons/Otto.skeleton.rsrc");
    const result = await convertAsset({ ...options(native), skeletonPath: skeleton });
    expect(result.isOk(), result.isErr() ? result.error.message : "").toBe(true);
    if (result.isErr()) return;
    expect(result.value.skeletonPath).toBe(path.join(root(), "stage/model.skeleton.rsrc"));
    for (const [source, output] of [[native, result.value.modelPath], [skeleton, result.value.skeletonPath]]) {
      if (!source || !output) continue;
      const before = await io(() => fs.readFile(source), "read original");
      const after = await io(() => fs.readFile(output), "read staged");
      expect(before.isOk() && after.isOk() && before.value.equals(after.value)).toBe(true);
    }
    expect(result.value.animationClips.length).toBeGreaterThan(0);
  });

  it("does not overwrite staged outputs or source files", async () => {
    const input = await triangle();
    await writeFixture(root(), "stage/model.bg3d", "working model");
    const result = await convertAsset(options(input));
    expect(result.isErr()).toBe(true);
    const unchanged = await io(() => fs.readFile(path.join(root(), "stage/model.bg3d"), "utf8"), "read output");
    expect(unchanged.isOk() && unchanged.value).toBe("working model");
  });

  it("applies persistent scale and orientation recipes to actual native geometry", async () => {
    const result = await convertAsset({ ...options(await triangle()), recipe: { scale: 2, rotation: [0, 0, 90] } });
    expect(result.isOk(), result.isErr() ? result.error.message : "").toBe(true);
    if (result.isErr()) return;
    const preview = await readGltf(result.value.previewPath);
    expect(preview.isOk()).toBe(true);
    if (preview.isErr()) return;
    const positions = preview.value.getRoot().listMeshes()[0]?.listPrimitives()[0]?.getAttribute("POSITION");
    expect(positions).toBeDefined();
    expect(positions?.getElement(1, [])[0]).toBeCloseTo(0);
    expect(positions?.getElement(1, [])[1]).toBeCloseTo(2);
    expect(positions?.getElement(2, [])[0]).toBeCloseTo(-2);
  });

  it("rejects unsupported animated transform recipes instead of silently ignoring them", async () => {
    const native = path.resolve("../frontend/public/games/ottomatic/skeletons/Otto.bg3d");
    const result = await convertAsset({ ...options(native), recipe: { scale: 2, rotation: [0, 0, 0] } });
    expect(result.isErr() && result.error.message).toContain("authoring tool");
  });

  it("gives unnamed clips stable display names without changing native indices", async () => {
    vi.spyOn(codec, "inspectModelFile").mockReturnValue(okAsync({ animations: [{ name: "" }, { name: " Walk " }, { name: " " }], materialNames: [], meshes: [{ primitives: 1, vertices: 3 }] }));
    const result = await convertAsset(options(await triangle()));
    expect(result.isOk() && result.value.animationClips).toEqual(["Animation 1", "Walk", "Animation 3"]);
  });

  it("requires resolving duplicate converted clip names before publication", async () => {
    vi.spyOn(codec, "inspectModelFile").mockReturnValue(okAsync({ animations: [{ name: "Attack" }, { name: " Attack " }], materialNames: [], meshes: [{ primitives: 1, vertices: 3 }] }));
    const result = await convertAsset(options(await triangle()));
    expect(result.isErr() && result.error.message).toContain("Animation names collide");
  });

  it("rejects cancellation before any filesystem or conversion work", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await convertAsset({ ...options("missing.glb"), signal: controller.signal });
    expect(result.isErr() && result.error.code).toBe("cancelled");
  });

  it("rejects successful conversions that contain no drawable geometry", async () => {
    vi.spyOn(codec, "inspectModelFile").mockReturnValue(okAsync({ animations: [], materialNames: [], meshes: [] }));
    const result = await convertAsset(options(await triangle()));
    expect(result.isErr() && result.error.message).toContain("no drawable geometry");
  });

  it("stops between conversion and preview when cancelled by progress", async () => {
    const controller = new AbortController();
    const result = await convertAsset({ ...options(await triangle()), signal: controller.signal,
      onProgress: (progress) => { if (progress.stage === "convert") controller.abort(); } });
    expect(result.isErr() && result.error.code).toBe("cancelled");
  });

  it("reports configuration and unsupported-game errors without starting Blender", async () => {
    const blend = await convertAsset(options(path.join(root(), "enemy.blend")));
    expect(blend.isErr() && blend.error.code).toBe("configuration");
    const shapes = await convertAsset(options("unused.gltf", "MightyMike"));
    expect(shapes.isErr() && shapes.error.code).toBe("unsupported");
  });
});
