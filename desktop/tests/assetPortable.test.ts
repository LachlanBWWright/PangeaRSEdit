import path from "node:path";
import * as fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { exportPortableAssets, importPortableAssets } from "../src/assetPortable.ts";
import { io } from "../src/files.ts";
import { useTemporaryDirectory } from "./fixtures.ts";

const temporary = useTemporaryDirectory();
async function createProject(name: string) {
  const folder = path.join(temporary(), name);
  await io(() => fs.mkdir(folder), "Create fixture directory");
  const project = new ProjectStore(path.join(temporary(), `${name}-recovery`));
  expect((await project.create(folder, name, "OttoMatic")).isOk()).toBe(true);
  return { project, folder };
}
async function setup() {
  const source = await createProject("source");
  const imported = await source.project.assets.importSource("Otto", path.resolve("../frontend/public/games/ottomatic/skeletons/Otto.bg3d"), "external");
  expect(imported.isOk(), imported.isErr() ? imported.error.message : "").toBe(true);
  return { ...source, asset: imported.isOk() ? imported.value.asset : null };
}

describe("portable editable project assets", () => {
  it("restores source, skeleton and stable identity into a fresh project and reimports", async () => {
    const { folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], true);
    expect(exported.isOk(), exported.isErr() ? exported.error.message : "").toBe(true);
    if (exported.isErr()) return;
    expect(exported.value.assets[0]?.source.path).not.toContain(path.resolve(".."));
    expect(exported.value.files.some((file) => file.path.endsWith("Otto.skeleton.rsrc") && file.path.startsWith("AuthoringSources/"))).toBe(true);
    const destination = await createProject("destination");
    const restored = await importPortableAssets(destination.project, exported.value);
    expect(restored.isOk(), restored.isErr() ? restored.error.message : "").toBe(true);
    if (restored.isErr()) return;
    expect(restored.value[0]?.id).toBe(asset.id);
    const source = await destination.project.assets.source(asset.id);
    if (source.isErr()) { expect.fail(source.error.message); return; }
    const next = await destination.project.assets.importSource(asset.name, source.value, "managed", undefined, restored.value[0]);
    expect(next.isOk(), next.isErr() ? next.error.message : "").toBe(true);
  });

  it("keeps runtime outputs when sources are omitted and reports that reimport needs relocation", async () => {
    const { folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], false);
    if (exported.isErr()) { expect.fail(exported.error.message); return; }
    expect(exported.value.files.map((file) => file.path)).toEqual(asset.outputs.files);
    expect(exported.value.warnings[0]).toContain("omitted");
    const destination = await createProject("destination");
    expect((await importPortableAssets(destination.project, exported.value)).isOk()).toBe(true);
    expect((await destination.project.assets.preview(asset.id)).isOk()).toBe(true);
    const source = await destination.project.assets.source(asset.id);
    if (source.isErr()) return;
    expect((await destination.project.assets.importSource(asset.name, source.value, "managed", undefined, exported.value.assets[0])).isErr()).toBe(true);
  });

  it("rejects duplicate identities and unsafe source metadata before writing", async () => {
    const { folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], false);
    if (exported.isErr()) return;
    const destination = await createProject("destination");
    expect((await importPortableAssets(destination.project, { ...exported.value, assets: [asset, asset] })).isErr()).toBe(true);
    const portable = exported.value.assets[0];
    if (!portable) return;
    const unsafe = { ...portable, source: { ...portable.source, path: `AuthoringSources/${asset.id}/../../outside.blend` } };
    expect((await importPortableAssets(destination.project, { ...exported.value, assets: [unsafe] })).isErr()).toBe(true);
    const listed = await destination.project.assets.list();
    expect(listed.isOk() && listed.value).toEqual([]);
  });

  it("rejects altered output bytes claiming an already registered revision", async () => {
    const { project, folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], false);
    if (exported.isErr()) { expect.fail(exported.error.message); return; }
    const changed = { ...exported.value, files: exported.value.files.map((file) => file.path === asset.outputs.model
      ? { ...file, bytes: new Uint8Array([1, 2, 3]) } : file) };
    const result = await importPortableAssets(project, changed);
    expect(result.isErr() && result.error.code).toBe("conflict");
    expect((await project.assets.preview(asset.id)).isOk()).toBe(true);
  });

  it("preserves an existing external source link when the same revision omits sources", async () => {
    const { project, folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], false);
    if (exported.isErr()) { expect.fail(exported.error.message); return; }
    const restored = await importPortableAssets(project, exported.value);
    if (restored.isErr()) { expect.fail(restored.error.message); return; }
    expect(restored.value.find((entry) => entry.id === asset.id)?.source).toEqual(asset.source);
    const located = await project.assets.source(asset.id);
    expect(located.isOk() && located.value).toBe(asset.source.path);
  });

  it("rejects incomplete authoring dependencies before registering the asset", async () => {
    const { folder, asset } = await setup();
    if (!asset) return;
    const exported = await exportPortableAssets(folder, [asset.id], true);
    if (exported.isErr()) { expect.fail(exported.error.message); return; }
    const portable = exported.value.assets[0];
    if (!portable) { expect.fail("Missing portable asset"); return; }
    const destination = await createProject("destination");
    const result = await importPortableAssets(destination.project, { ...exported.value,
      assets: [{ ...portable, source: { ...portable.source, dependencies: ["missing-texture.png"] } }] });
    expect(result.isErr() && result.error.code).toBe("missing");
    const listed = await destination.project.assets.list();
    expect(listed.isOk() && listed.value).toEqual([]);
  });
});
