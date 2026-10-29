import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { fingerprintAssetSource, importAssetSource } from "../src/assetSources.ts";
import { scanProject } from "../src/files.ts";
import { copyAuthoringSources } from "../src/authoringStorage.ts";
import { ProjectStore } from "../src/projectStore.ts";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "pangea-source-")));
  temporary.push(root);
  const project = path.join(root, "project");
  const source = path.join(root, "source");
  await fs.mkdir(project); await fs.mkdir(source);
  return { root, project, source };
}

describe("managed authoring sources", () => {
  it("copies glTF resources with their hierarchy and excludes authoring bytes from runtime snapshots", async () => {
    const { project, source } = await fixture();
    await fs.mkdir(path.join(source, "textures"));
    await fs.writeFile(path.join(source, "robot.gltf"), JSON.stringify({ buffers: [{ uri: "robot.bin" }], images: [{ uri: "textures/robot%20skin.png" }, { uri: "data:image/png;base64,AA==" }] }));
    await fs.writeFile(path.join(source, "robot.bin"), "mesh");
    await fs.writeFile(path.join(source, "textures/robot skin.png"), "pixels");
    await fs.writeFile(path.join(project, "runtime.bg3d"), "converted");
    const result = await importAssetSource(project, { sourcePath: path.join(source, "robot.gltf"), mode: "managed", assetId: randomUUID() });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.dependencies).toEqual(["robot.bin", "textures/robot skin.png"]);
    expect(await fs.readFile(path.join(path.dirname(result.value.entryPath), "textures/robot skin.png"), "utf8")).toBe("pixels");
    expect(result.value.path.startsWith("AuthoringSources/")).toBe(true);
    const snapshot = await scanProject(project);
    expect(snapshot.isOk()).toBe(true);
    if (snapshot.isOk()) expect(snapshot.value.map((file) => file.path)).toEqual(["runtime.bg3d"]);
  });

  it("preserves native model companions and creates independent source revisions", async () => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.bg3d"), "model-one");
    await fs.writeFile(path.join(source, "robot.skeleton.rsrc"), "rig");
    const request = { sourcePath: path.join(source, "robot.bg3d"), mode: "managed", assetId: randomUUID() };
    const first = await importAssetSource(project, { ...request, mode: "managed" });
    await fs.writeFile(path.join(source, "robot.bg3d"), "model-two");
    const second = await importAssetSource(project, { ...request, mode: "managed" });
    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value.path).not.toBe(second.value.path);
    expect(first.value.fingerprint).not.toBe(second.value.fingerprint);
    expect(await fs.readFile(first.value.entryPath, "utf8")).toBe("model-one");
    expect(await fs.readFile(path.join(path.dirname(second.value.entryPath), "robot.skeleton.rsrc"), "utf8")).toBe("rig");
  });

  it("links external sources without copying and fingerprints dependency changes", async () => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.blend"), "blend");
    await fs.writeFile(path.join(source, "skin.png"), "first");
    const request = { sourcePath: path.join(source, "robot.blend"), assetId: randomUUID(), dependencies: ["skin.png"] };
    const first = await importAssetSource(project, { ...request, mode: "external" });
    await fs.writeFile(path.join(source, "skin.png"), "second");
    const second = await importAssetSource(project, { ...request, mode: "external" });
    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value.path).toBe(request.sourcePath);
    expect(first.value.fingerprint).not.toBe(second.value.fingerprint);
    expect(await fs.readdir(project)).toEqual([]);
  });

  it("tracks Blender dependencies outside the source directory without allowing unmanaged glTF traversal", async () => {
    const { project, source, root } = await fixture();
    const texture = path.join(root, "shared-texture.png");
    await fs.writeFile(path.join(source, "robot.blend"), "blend");
    await fs.writeFile(texture, "first");
    const imported = await importAssetSource(project, { sourcePath: path.join(source, "robot.blend"),
      assetId: randomUUID(), mode: "external", dependencies: [texture] });
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.dependencies).toEqual([texture]);
    await fs.writeFile(texture, "updated");
    const changed = await fingerprintAssetSource(project, imported.value);
    expect(changed.isOk() && changed.value).not.toBe(imported.value.fingerprint);
    const managed = await importAssetSource(project, { sourcePath: path.join(source, "robot.blend"),
      assetId: randomUUID(), mode: "managed", dependencies: [texture] });
    expect(managed.isErr()).toBe(true);
  });

  it.each(["../secret.bin", "%2e%2e/secret.bin", "https://example.com/model.bin", "/secret.bin"])("rejects escaping glTF dependency %s", async (uri) => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.gltf"), JSON.stringify({ buffers: [{ uri }] }));
    const result = await importAssetSource(project, { sourcePath: path.join(source, "robot.gltf"), mode: "managed", assetId: randomUUID() });
    expect(result.isErr()).toBe(true);
    expect(await fs.readdir(project)).toEqual([]);
  });

  it("rejects missing dependencies without creating a partial revision", async () => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.gltf"), JSON.stringify({ images: [{ uri: "absent.png" }] }));
    const result = await importAssetSource(project, { sourcePath: path.join(source, "robot.gltf"), mode: "managed", assetId: randomUUID() });
    expect(result.isErr()).toBe(true);
    expect(await fs.readdir(project)).toEqual([]);
  });

  it("cancels source collection before copying authoring files", async () => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.glb"), "geometry");
    const controller = new AbortController();
    controller.abort();
    const imported = await importAssetSource(project, { sourcePath: path.join(source, "robot.glb"),
      assetId: randomUUID(), mode: "managed", signal: controller.signal });
    expect(imported.isErr() && imported.error.code).toBe("cancelled");
    expect(await fs.readdir(project)).toEqual([]);
  });

  it("rejects a source reached through a symbolic-link directory", async () => {
    const { root, project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.glb"), "mesh");
    await fs.symlink(source, path.join(root, "linked"), "junction");
    const result = await importAssetSource(project, { sourcePath: path.join(root, "linked/robot.glb"), mode: "managed", assetId: randomUUID() });
    expect(result.isErr()).toBe(true);
  });

  it("uses a separate authoring budget rather than the 128 MiB runtime file cap", async () => {
    const { project, source } = await fixture();
    const file = path.join(source, "large.blend");
    await fs.writeFile(file, ""); await fs.truncate(file, 1024 * 1024 * 1024 + 1);
    const result = await importAssetSource(project, { sourcePath: file, mode: "managed", assetId: randomUUID() });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("limit");
  });

  it("fingerprints managed dependencies while rejecting managed paths outside source storage", async () => {
    const { project, source } = await fixture();
    await fs.writeFile(path.join(source, "robot.glb"), "mesh");
    const imported = await importAssetSource(project, { sourcePath: path.join(source, "robot.glb"), mode: "managed", assetId: randomUUID() });
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    const first = await fingerprintAssetSource(project, imported.value);
    expect(first.isOk() && first.value).toBe(imported.value.fingerprint);
    await fs.writeFile(imported.value.entryPath, "changed");
    const second = await fingerprintAssetSource(project, imported.value);
    expect(second.isOk() && second.value).not.toBe(imported.value.fingerprint);
    expect((await fingerprintAssetSource(project, { mode: "managed", path: "Data/robot.glb", dependencies: [] })).isErr()).toBe(true);
  });

  it("Save As preserves managed sources despite their exclusion from runtime snapshots", async () => {
    const { root, project, source } = await fixture();
    const store = new ProjectStore(path.join(root, "recovery"));
    const created = await store.create(project, "Robot project", "OttoMatic");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    await fs.writeFile(path.join(source, "robot.blend"), "authoring");
    const imported = await importAssetSource(project, { sourcePath: path.join(source, "robot.blend"), mode: "managed", assetId: randomUUID() });
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    const destination = path.join(root, "copy");
    await fs.mkdir(destination);
    const copied = await store.copy(destination, created.value.revision);
    expect(copied.isOk()).toBe(true);
    expect(await fs.readFile(path.join(destination, imported.value.path), "utf8")).toBe("authoring");
    if (copied.isOk()) expect(copied.value.files.some((file) => file.path.startsWith("AuthoringSources/"))).toBe(false);
  });

  it("rejects symlinks in managed storage before copying any source files", async () => {
    const { project, source } = await fixture();
    await fs.mkdir(path.join(project, "AuthoringSources"));
    await fs.symlink(source, path.join(project, "AuthoringSources/linked"), "junction");
    const result = await copyAuthoringSources(project, source);
    expect(result.isErr()).toBe(true);
  });
});
