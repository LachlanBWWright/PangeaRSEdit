import path from "node:path";
import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { err } from "neverthrow";
import { projectAssetSchema } from "@pangea/desktop-contracts";
import { readNativeAsset } from "@pangea/model-codec/node";
import { ProjectStore } from "../src/projectStore.ts";
import { failure, io } from "../src/files.ts";
import { listAuthoringSources } from "../src/authoringStorage.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const temporary = useTemporaryDirectory();
async function setup() {
  const folder = path.join(temporary(), "project");
  await io(() => fs.mkdir(folder), "create project fixture");
  const project = new ProjectStore(path.join(temporary(), "recovery"));
  expect((await project.create(folder, "Asset project", "OttoMatic")).isOk()).toBe(true);
  const source = path.join(temporary(), "source");
  await io(() => fs.mkdir(source), "create source fixture");
  for (const name of ["Otto.bg3d", "Otto.skeleton.rsrc"]) {
    await io(() => fs.copyFile(path.resolve(`../frontend/public/games/ottomatic/skeletons/${name}`), path.join(source, name)), "copy native fixture");
  }
  return { project, folder, source: path.join(source, "Otto.bg3d") };
}

describe("project asset pipeline", () => {
  it("imports real animated native companions atomically and survives host restart", async () => {
    const { project, folder, source } = await setup();
    const imported = await project.assets.importSource("Reusable robot", source, "managed");
    expect(imported.isOk(), imported.isErr() ? imported.error.message : "").toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.needsReview).toBe(false);
    const asset = imported.value.asset;
    expect(projectAssetSchema.safeParse(asset).success).toBe(true);
    expect(asset.animations.length).toBeGreaterThan(0);
    expect(asset.outputs.skeleton).not.toBeNull();
    expect(asset.source.path).toMatch(/^AuthoringSources\//);
    const snapshot = await project.inspect();
    expect(snapshot.isOk() && snapshot.value.files.some((file) => file.path.startsWith("AuthoringSources/"))).toBe(false);
    const preview = await project.assets.preview(asset.id);
    expect(preview.isOk() && new TextDecoder().decode(preview.value.slice(0, 4))).toBe("glTF");
    const restarted = new ProjectStore(path.join(temporary(), "recovery"));
    expect((await restarted.open(folder)).isOk()).toBe(true);
    const listed = await restarted.assets.list();
    expect(listed.isOk() && listed.value).toEqual([asset]);
  });

  it("preserves identity and previous working output during reimport and undo", async () => {
    const { project, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "managed");
    if (first.isErr()) { expect(first.error.message).toBe(""); return; }
    const original = first.value.asset;
    const importedSource = await project.assets.source(original.id);
    if (importedSource.isErr()) return;
    const second = await project.assets.importSource(original.name, importedSource.value, "managed", undefined, original);
    expect(second.isOk(), second.isErr() ? second.error.message : "").toBe(true);
    if (second.isErr()) return;
    expect(second.value.asset.id).toBe(original.id);
    expect(second.value.asset.revision).not.toBe(original.revision);
    expect(second.value.asset.previousRevision).toBe(original.revision);
    const undone = await project.assets.undo(original.id);
    expect(undone.isOk() && undone.value).toEqual(original);
    const oldFiles = await project.read(original.outputs.files);
    expect(oldFiles.isOk()).toBe(true);
  });

  it("preserves material and animation-event adjustments through real native reimport", async () => {
    const { project, source, folder } = await setup();
    const original = await readNativeAsset(source);
    expect(original.isOk()).toBe(true);
    if (original.isErr()) return;
    const clip = original.value.parsed.skeleton?.animations[0]?.name;
    expect(clip).toBeTruthy();
    if (!clip) return;
    const first = await project.assets.importSource("Adjusted robot", source, "managed", undefined, undefined, {
      scale: 1, rotation: [0, 0, 0], materialMappings: [{ material: "Material_0000", clampU: true, alwaysBlend: true, diffuseColor: [0.25, 0.5, 0.75, 1] }],
      animationEvents: [{ clip, events: [{ time: 2, type: 6, value: 0 }] }],
    });
    expect(first.isOk(), first.isErr() ? first.error.message : "").toBe(true);
    if (first.isErr()) return;
    const linked = await project.assets.source(first.value.asset.id);
    expect(linked.isOk()).toBe(true);
    if (linked.isErr()) return;
    const reimported = await project.assets.importSource("Adjusted robot", linked.value, "managed", undefined, first.value.asset);
    expect(reimported.isOk(), reimported.isErr() ? reimported.error.message : "").toBe(true);
    if (reimported.isErr()) return;
    expect(reimported.value.asset.recipe).toEqual(first.value.asset.recipe);
    const native = await readNativeAsset(path.join(folder, reimported.value.asset.outputs.model));
    expect(native.isOk(), native.isErr() ? native.error : "").toBe(true);
    if (native.isErr()) return;
    expect((native.value.parsed.materials[0]?.flags ?? 0) & 6).toBe(6);
    expect(native.value.parsed.materials[0]?.diffuseColor.slice(0, 3)).toEqual([0.25, 0.5, 0.75]);
    expect(native.value.parsed.skeleton?.animations[0]?.events).toEqual([{ time: 2, type: 6, value: 0 }]);
  });

  it("keeps the previous asset when source conversion fails", async () => {
    const { project, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "external");
    if (first.isErr()) return;
    await writeFixture(temporary(), "broken.bg3d", "invalid native file");
    const failed = await project.assets.importSource("Robot", path.join(temporary(), "broken.bg3d"), "external", undefined, first.value.asset);
    expect(failed.isErr()).toBe(true);
    const listed = await project.assets.list();
    expect(listed.isOk() && listed.value).toEqual([first.value.asset]);
    expect((await project.assets.preview(first.value.asset.id)).isOk()).toBe(true);
  });

  it("creates independent managed duplicates with distinct identity and source", async () => {
    const { project, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "external");
    if (first.isErr()) return;
    const duplicate = await project.assets.duplicate(first.value.asset.id, "Independent robot");
    expect(duplicate.isOk(), duplicate.isErr() ? duplicate.error.message : "").toBe(true);
    if (duplicate.isErr()) return;
    expect(duplicate.value.id).not.toBe(first.value.asset.id);
    expect(duplicate.value.source.mode).toBe("managed");
    expect(duplicate.value.source.path).not.toBe(first.value.asset.source.path);
  });

  it("cannot publish an old project's asset when projects switch during an awaited snapshot", async () => {
    const { project, folder, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "external");
    expect(first.isOk()).toBe(true);
    if (first.isErr()) return;
    const second = await project.assets.importSource("Robot", source, "external", undefined, first.value.asset);
    expect(second.isOk()).toBe(true);
    if (second.isErr()) return;
    const other = path.join(temporary(), "other-project");
    await fs.mkdir(other);
    expect((await project.create(other, "Other project", "OttoMatic")).isOk()).toBe(true);
    expect((await project.open(folder)).isOk()).toBe(true);
    const inspect = project.inspect.bind(project);
    const switched = vi.spyOn(project, "inspect").mockImplementationOnce(async () => {
      await project.open(other);
      return inspect();
    });
    const result = await project.assets.undo(second.value.asset.id);
    expect(result.isErr() && result.error.code).toBe("conflict");
    switched.mockRestore();
    const assets = await project.assets.list();
    expect(assets.isOk() && assets.value).toEqual([]);
    const snapshot = await project.inspect();
    expect(snapshot.isOk() && snapshot.value.files.some((file) => file.path.startsWith("Assets/"))).toBe(false);
  });

  it("cancels conversion without registering an incomplete asset", async () => {
    const { project, source, folder } = await setup();
    project.assets.onProgress((progress) => { if (progress.stage === "convert") project.assets.cancel(progress.id); });
    const imported = await project.assets.importSource("Robot", source, "managed");
    expect(imported.isErr() && imported.error.code).toBe("cancelled");
    const listed = await project.assets.list();
    expect(listed.isOk() && listed.value).toEqual([]);
    const sources = await listAuthoringSources(folder);
    expect(sources.isOk() && sources.value).toEqual([]);
  });

  it("watches source changes and retains working assets when an external source breaks", async () => {
    const { project, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "external");
    if (first.isErr()) return;
    await project.assets.checkSources();
    await io(() => fs.writeFile(source, "broken native output"), "change source");
    await project.assets.checkSources();
    const listed = await project.assets.list();
    expect(listed.isOk() && listed.value).toEqual([first.value.asset]);
    expect((await project.assets.preview(first.value.asset.id)).isOk()).toBe(true);
  });

  it("retries a changed source after a concurrent save temporarily blocks automatic reimport", async () => {
    const { project, source } = await setup();
    const first = await project.assets.importSource("Robot", source, "external");
    expect(first.isOk()).toBe(true);
    if (first.isErr()) return;
    await project.assets.checkSources();
    await fs.appendFile(source, new Uint8Array([0]));
    const blocked = vi.spyOn(project.assets, "importSource").mockResolvedValueOnce(err(failure("Project is saving", "busy")));
    await project.assets.checkSources();
    expect(blocked).toHaveBeenCalledOnce();
    blocked.mockRestore();
    await project.assets.checkSources();
    const assets = await project.assets.list();
    expect(assets.isOk() && assets.value[0]?.revision).not.toBe(first.value.asset.revision);
  });

  it("stages lossy conversions for explicit review and discards them without changing working assets", async () => {
    const { project } = await setup();
    await writeFixture(temporary(), "triangle.bin", new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer));
    await writeFixture(temporary(), "triangle.gltf", JSON.stringify({
      asset: { version: "2.0" }, buffers: [{ uri: "triangle.bin", byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
      materials: [{ pbrMetallicRoughness: { metallicFactor: 0.5, roughnessFactor: 0.2 } }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
    }));
    const imported = await project.assets.importSource("Lossy model", path.join(temporary(), "triangle.gltf"), "managed");
    expect(imported.isOk(), imported.isErr() ? imported.error.message : "").toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.needsReview).toBe(true);
    expect(imported.value.reasons.some((reason) => reason.includes("material"))).toBe(true);
    const list = await project.assets.list();
    expect(list.isOk() && list.value).toEqual([]);
    expect((await project.assets.preview(imported.value.asset.id, imported.value.asset.revision)).isOk()).toBe(true);
    expect((await project.assets.discard(imported.value.asset.id, imported.value.asset.revision)).isOk()).toBe(true);
    expect(project.assets.pendingImports()).toEqual([]);
    expect((await project.assets.preview(imported.value.asset.id)).isErr()).toBe(true);
    expect((await project.assets.accept(imported.value.asset.id, imported.value.asset.revision)).isErr()).toBe(true);
  });

  it("serializes concurrent pending accepts without losing either asset registry entry", async () => {
    const { project } = await setup();
    await writeFixture(temporary(), "review.bin", new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer));
    await writeFixture(temporary(), "review.gltf", JSON.stringify({ asset: { version: "2.0" },
      buffers: [{ uri: "review.bin", byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
      materials: [{ pbrMetallicRoughness: { metallicFactor: 0.5 } }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
    }));
    const first = await project.assets.importSource("First", path.join(temporary(), "review.gltf"), "managed");
    const second = await project.assets.importSource("Second", path.join(temporary(), "review.gltf"), "managed");
    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value.needsReview && second.value.needsReview).toBe(true);
    const accepting = project.assets.accept(first.value.asset.id, first.value.asset.revision);
    const blocked = await project.assets.accept(second.value.asset.id, second.value.asset.revision);
    expect(blocked.isErr() && blocked.error.code).toBe("busy");
    expect((await accepting).isOk()).toBe(true);
    expect((await project.assets.accept(second.value.asset.id, second.value.asset.revision)).isOk()).toBe(true);
    const assets = await project.assets.list();
    expect(assets.isOk() && assets.value.map((asset) => asset.name).sort()).toEqual(["First", "Second"]);
  });
});
