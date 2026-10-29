import path from "node:path";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PortableAssets } from "@pangea/desktop-contracts";
import { remapPortableAssets } from "@pangea/desktop-contracts";
import { ProjectStore } from "../src/projectStore.ts";
import { importReversibleAssets, undoAssetImport } from "../src/assetImportTransaction.ts";
import { useTemporaryDirectory } from "./fixtures.ts";

const temporary = useTemporaryDirectory();
vi.mock("node:fs/promises", async (importOriginal) => ({ ...await importOriginal<typeof import("node:fs/promises")>() }));
function bundle(id: string = randomUUID(), revision: string = randomUUID()): PortableAssets {
  const model = `Assets/Models/${id}/${revision}/model.bg3d`;
  const preview = `Assets/Models/${id}/${revision}/preview.glb`;
  const source = `AuthoringSources/${id}/${revision}/source.bg3d`;
  return { version: 1, warnings: [], assets: [{ version: 1, id, revision, name: "Fixture", game: "OttoMatic",
    importedAt: "2026-10-28", previousRevision: null, recipe: { scale: 1, rotation: [0, 0, 0] }, animations: [], warnings: [],
    source: { mode: "managed", path: source, originalName: "source.bg3d", format: "bg3d", dependencies: [], fingerprint: "fixture" },
    outputs: { model, preview, skeleton: null, files: [model, preview] } }],
    files: [model, preview, source].map((name) => ({ path: name, bytes: new Uint8Array([1, 2, 3]) })) };
}
async function setup() {
  const root = path.join(temporary(), randomUUID());
  await fs.mkdir(root);
  const project = new ProjectStore(path.join(temporary(), randomUUID()));
  expect((await project.create(root, "Fixture", "OttoMatic")).isOk()).toBe(true);
  return { project, root };
}

describe("reversible editable asset imports", () => {
  it("restores source bytes and previous records without removing unrelated edits", async () => {
    const { project, root } = await setup();
    const original = bundle();
    const initial = await importReversibleAssets(project, original);
    if (initial.isErr()) return expect.fail(initial.error.message);
    const replaced = { ...original, files: original.files.map((file) => ({ ...file, bytes: new Uint8Array([4]) })) };
    const imported = await importReversibleAssets(project, replaced);
    if (imported.isErr()) return expect.fail(imported.error.message);
    const unrelated = await importReversibleAssets(project, bundle());
    expect(unrelated.isOk()).toBe(true);
    await fs.writeFile(path.join(root, "notes.txt"), "Keep this edit");
    const undone = await undoAssetImport(project, imported.value.id);
    if (undone.isErr()) return expect.fail(undone.error.message);
    expect(undone.value).toHaveLength(2);
    for (const file of original.files) expect(new Uint8Array(await fs.readFile(path.join(root, file.path)))).toEqual(file.bytes);
    expect(await fs.readFile(path.join(root, "notes.txt"), "utf8")).toBe("Keep this edit");
  });

  it("rejects undo after an authoring source is edited", async () => {
    const { project, root } = await setup();
    const incoming = bundle();
    const imported = await importReversibleAssets(project, incoming);
    if (imported.isErr()) return expect.fail(imported.error.message);
    const source = incoming.assets[0]?.source.path;
    if (!source) return expect.fail("Missing source fixture");
    await fs.writeFile(path.join(root, source), "Edited in Blender");
    const undone = await undoAssetImport(project, imported.value.id);
    expect(undone.isErr() && undone.error.code).toBe("conflict");
    expect(await fs.readFile(path.join(root, source), "utf8")).toBe("Edited in Blender");
  });

  it("replaces a different revision and restores the previous editable record on undo", async () => {
    const { project, root } = await setup();
    const original = bundle();
    const previous = original.assets[0];
    if (!previous) return expect.fail("Missing original asset");
    expect((await importReversibleAssets(project, original)).isOk()).toBe(true);
    const incoming = bundle(previous.id);
    const replacement = await importReversibleAssets(project, incoming);
    if (replacement.isErr()) return expect.fail(replacement.error.message);
    expect(replacement.value.assets[0]?.revision).toBe(incoming.assets[0]?.revision);
    const undone = await undoAssetImport(project, replacement.value.id);
    if (undone.isErr()) return expect.fail(undone.error.message);
    expect(undone.value[0]).toEqual(previous);
    for (const file of incoming.files) expect(await fs.stat(path.join(root, file.path)).then(() => true, () => false)).toBe(false);
    expect(new Uint8Array(await fs.readFile(path.join(root, previous.source.path)))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("imports copies with independent identities and removes all copied files on undo", async () => {
    const { project, root } = await setup();
    const incoming = bundle();
    const originalId = incoming.assets[0]?.id;
    if (!originalId) return expect.fail("Missing identity");
    expect((await importReversibleAssets(project, incoming)).isOk()).toBe(true);
    const copied = remapPortableAssets(incoming, new Map([[originalId, randomUUID()]]));
    const imported = await importReversibleAssets(project, copied);
    if (imported.isErr()) return expect.fail(imported.error.message);
    expect(imported.value.assets).toHaveLength(2);
    expect((await undoAssetImport(project, imported.value.id)).isOk()).toBe(true);
    for (const file of copied.files) expect(await fs.stat(path.join(root, file.path)).then(() => true, () => false)).toBe(false);
    for (const file of incoming.files) expect(new Uint8Array(await fs.readFile(path.join(root, file.path)))).toEqual(file.bytes);
  });

  it("rejects unsafe destinations atomically before any asset registration", async () => {
    const { project } = await setup();
    const incoming = bundle();
    const invalid = { ...incoming, files: [...incoming.files, { path: "../escape", bytes: new Uint8Array([1]) }] };
    expect((await importReversibleAssets(project, invalid)).isErr()).toBe(true);
    const assets = await project.assets.list();
    expect(assets.isOk() && assets.value).toEqual([]);
  });

  it("rolls back source and output writes if registry replacement fails", async () => {
    const { project, root } = await setup();
    const incoming = bundle();
    const rename = fs.rename;
    let failed = false;
    const injected = vi.spyOn(fs, "rename").mockImplementation((previous, target) => {
      if (!failed && target === path.join(root, ".pangea/assets.json")) {
        failed = true;
        return Promise.reject({ code: "EIO" });
      }
      return rename(previous, target);
    });
    const result = await importReversibleAssets(project, incoming);
    injected.mockRestore();
    expect(result.isErr()).toBe(true);
    for (const file of incoming.files) expect(await fs.stat(path.join(root, file.path)).then(() => true, () => false)).toBe(false);
    const assets = await project.assets.list();
    expect(assets.isOk() && assets.value).toEqual([]);
  });
});
