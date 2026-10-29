import path from "node:path";
import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { err } from "neverthrow";
import { spriteReadSchema } from "@pangea/desktop-contracts";
import { ProjectStore } from "../src/projectStore.ts";
import { failure, io } from "../src/files.ts";
import { listAuthoringSources } from "../src/authoringStorage.ts";
import { SPRITE_REGISTRY } from "../src/spriteAssets.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const temporary = useTemporaryDirectory();
const nativePath = "Assets/Sprites/creature.shapes";
const bytes = (text: string) => new TextEncoder().encode(text);
async function projectRevision(project: ProjectStore): Promise<string> {
  const snapshot = await project.inspect();
  expect(snapshot.isOk()).toBe(true);
  return snapshot.isOk() ? snapshot.value.revision : "missing";
}
async function setup() {
  const folder = path.join(temporary(), "project");
  await io(() => fs.mkdir(folder), "create project fixture");
  const project = new ProjectStore(path.join(temporary(), "recovery"));
  const created = await project.create(folder, "Sprites", "MightyMike");
  if (created.isOk()) await project.save(created.value.revision, created.value.manifest, [{ path: nativePath, bytes: bytes("original") }], []);
  const imagePath = path.join(temporary(), "source/export.png");
  const metadataPath = path.join(temporary(), "source/export.json");
  await writeFixture(temporary(), "source/export.png", "image pixels");
  await writeFixture(temporary(), "source/export.json", '{"frames":[]}');
  return { project, folder, imagePath, metadataPath };
}

describe("sprite authoring source registry", () => {
  it("keeps managed sources portable and separate from runtime files across reopen", async () => {
    const { project, folder, imagePath, metadataPath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, metadataPath, "managed");
    expect(linked.isOk(), linked.isErr() ? linked.error.message : "").toBe(true);
    if (linked.isErr()) return;
    expect(linked.value.source.imagePath).toMatch(/^AuthoringSources\//);
    await io(() => fs.rm(path.dirname(imagePath), { recursive: true }), "remove original export");
    const read = await project.sprites.read(linked.value.id);
    expect(read.isOk() && spriteReadSchema.safeParse(read.value).success).toBe(true);
    expect(read.isOk() && new TextDecoder().decode(read.value.imageBytes)).toBe("image pixels");
    const snapshot = await project.inspect();
    expect(snapshot.isOk() && snapshot.value.files.some((file) => file.path.startsWith("AuthoringSources/"))).toBe(false);
    const reopened = new ProjectStore(path.join(temporary(), "second-recovery"));
    expect((await reopened.open(folder)).isOk()).toBe(true);
    const records = await reopened.sprites.list();
    expect(records.isOk() && records.value).toEqual([linked.value]);
  });

  it("keeps stable identity when relocating a source for the same shape", async () => {
    const { project, imagePath, metadataPath } = await setup();
    const first = await project.sprites.link("Creature", nativePath, 2, imagePath, metadataPath, "external");
    const second = await project.sprites.link("Renamed creature", nativePath, 2, imagePath, null, "managed");
    expect(first.isOk() && second.isOk() && first.value.id === second.value.id).toBe(true);
    const third = await project.sprites.link("Another shape", nativePath, 3, imagePath, null, "external");
    expect(second.isOk() && third.isOk() && second.value.id !== third.value.id).toBe(true);
    const records = await project.sprites.list();
    expect(records.isOk() && records.value.length).toBe(2);
  });

  it("detects changed exports without mutating the last accepted fingerprint or native output", async () => {
    const { project, imagePath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external");
    if (linked.isErr()) { expect(linked.isOk()).toBe(true); return; }
    await io(() => fs.writeFile(imagePath, "new pixels"), "update export");
    const read = await project.sprites.read(linked.value.id);
    expect(read.isOk() && read.value.fingerprint !== linked.value.source.fingerprint).toBe(true);
    expect(read.isOk() && read.value.asset.source.fingerprint).toBe(linked.value.source.fingerprint);
    const native = await project.read([nativePath]);
    expect(native.isOk() && new TextDecoder().decode(native.value[0]?.bytes)).toBe("original");
    const stale = await project.sprites.commit(linked.value.id, linked.value.source.fingerprint, await projectRevision(project), [{ path: nativePath, bytes: bytes("bad") }], []);
    expect(stale.isErr() && stale.error.code).toBe("conflict");
  });

  it("atomically saves native output, editor companions and accepted frame metadata", async () => {
    const { project, imagePath, metadataPath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, metadataPath, "external");
    if (linked.isErr()) { expect(linked.isOk()).toBe(true); return; }
    const frames = [{ name: "Walk", durationMs: 80 }];
    const saved = await project.sprites.commit(linked.value.id, linked.value.source.fingerprint, await projectRevision(project),
      [{ path: nativePath, bytes: bytes("converted") }, { path: "Assets/Sprites/creature.sprite.json", bytes: bytes("snapshot") },
        { path: "Assets/Sprites/creature.palette.tga", bytes: bytes("palette") }], frames);
    expect(saved.isOk(), saved.isErr() ? saved.error.message : "").toBe(true);
    const read = await project.sprites.read(linked.value.id);
    expect(read.isOk() && read.value.asset.frames).toEqual(frames);
    const native = await project.read([nativePath]);
    expect(native.isOk() && new TextDecoder().decode(native.value[0]?.bytes)).toBe("converted");
  });

  it("rejects unrelated files and missing native output", async () => {
    const { project, imagePath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external");
    if (linked.isErr()) return;
    for (const files of [[{ path: "other.shapes", bytes: bytes("other") }], [{ path: "Assets/Sprites/creature.sprite.json", bytes: bytes("snapshot") }]]) {
      const result = await project.sprites.commit(linked.value.id, linked.value.source.fingerprint, await projectRevision(project), files, []);
      expect(result.isErr() && result.error.code).toBe("invalid");
    }
  });

  it("cleans copied sources when registry save conflicts", async () => {
    const { project, folder, imagePath, metadataPath } = await setup();
    const save = vi.spyOn(project, "save").mockResolvedValue(err(failure("Changed on disk", "conflict")));
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, metadataPath, "managed");
    expect(linked.isErr() && linked.error.code).toBe("conflict");
    const sources = await listAuthoringSources(folder);
    expect(sources.isOk() && sources.value).toEqual([]);
    save.mockRestore();
    const records = await project.sprites.list();
    expect(records.isOk() && records.value).toEqual([]);
  });

  it("rejects symbolic source paths and corrupt registry ownership", async () => {
    const { project, folder, imagePath } = await setup();
    const symlink = path.join(temporary(), "linked.png");
    await io(() => fs.symlink(imagePath, symlink), "make symlink fixture");
    const unsafe = await project.sprites.link("Creature", nativePath, 0, symlink, null, "external");
    expect(unsafe.isErr() && unsafe.error.code).toBe("invalid");
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "managed");
    if (linked.isErr()) return;
    await writeFixture(folder, SPRITE_REGISTRY, JSON.stringify([{ ...linked.value, source: { ...linked.value.source, imagePath: "AuthoringSources/another/source.png" } }]));
    const invalid = await project.sprites.list();
    expect(invalid.isErr() && invalid.error.code).toBe("invalid");
  });

  it("retains the previous working output and metadata when native save fails", async () => {
    const { project, imagePath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external");
    if (linked.isErr()) return;
    const save = vi.spyOn(project, "save").mockResolvedValue(err(failure("Changed on disk", "conflict")));
    const failed = await project.sprites.commit(linked.value.id, linked.value.source.fingerprint, await projectRevision(project),
      [{ path: nativePath, bytes: bytes("new") }], [{ name: "Walk", durationMs: 90 }]);
    expect(failed.isErr()).toBe(true);
    save.mockRestore();
    const read = await project.sprites.read(linked.value.id);
    expect(read.isOk() && read.value.asset.frames).toEqual([]);
    const native = await project.read([nativePath]);
    expect(native.isOk() && new TextDecoder().decode(native.value[0]?.bytes)).toBe("original");
  });

  it("rejects source reads when the active project changes during registry loading", async () => {
    const { project, imagePath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external");
    expect(linked.isOk()).toBe(true);
    if (linked.isErr()) return;
    const otherFolder = path.join(temporary(), "other-project");
    await io(() => fs.mkdir(otherFolder), "create second project");
    const other = new ProjectStore(path.join(temporary(), "other-recovery"));
    expect((await other.create(otherFolder, "Other sprites", "MightyMike")).isOk()).toBe(true);
    const list = project.sprites.list.bind(project.sprites);
    vi.spyOn(project.sprites, "list").mockImplementationOnce(async () => {
      const records = await list();
      await project.open(otherFolder);
      return records;
    });
    const read = await project.sprites.read(linked.value.id);
    expect(read.isErr() && read.error.code).toBe("conflict");
  });

  it("rejects converted native snapshots based on an outdated project revision", async () => {
    const { project, imagePath } = await setup();
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external");
    expect(linked.isOk()).toBe(true);
    if (linked.isErr()) return;
    const snapshot = await project.inspect();
    if (snapshot.isErr()) return;
    expect((await project.save(snapshot.value.revision, snapshot.value.manifest,
      [{ path: nativePath, bytes: bytes("another edit") }], [])).isOk()).toBe(true);
    const stale = await project.sprites.commit(linked.value.id, linked.value.source.fingerprint, snapshot.value.revision,
      [{ path: nativePath, bytes: bytes("old converted snapshot") }], [{ name: "Stale", durationMs: 80 }]);
    expect(stale.isErr() && stale.error.code).toBe("conflict");
    const native = await project.read([nativePath]);
    expect(native.isOk() && new TextDecoder().decode(native.value[0]?.bytes)).toBe("another edit");
    const records = await project.sprites.list();
    expect(records.isOk() && records.value[0]?.frames).toEqual([]);
  });

  it("preserves managed Aseprite documents for editing and Save As", async () => {
    const { project, folder, imagePath, metadataPath } = await setup();
    const authoringPath = path.join(temporary(), "source/creature.aseprite");
    await writeFixture(temporary(), "source/creature.aseprite", "editable document");
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, metadataPath, "managed", authoringPath);
    expect(linked.isOk(), linked.isErr() ? linked.error.message : "").toBe(true);
    if (linked.isErr()) return;
    const source = await project.sprites.source(linked.value.id);
    expect(source.isOk() && source.value).toBe(path.join(folder, linked.value.source.authoringPath ?? ""));
    expect(linked.value.source.authoringPath).toMatch(/source\.aseprite$/);
    await io(() => fs.rm(path.dirname(imagePath), { recursive: true }), "remove original sources");
    const destination = path.join(temporary(), "copied-project");
    await io(() => fs.mkdir(destination), "create project copy destination");
    const snapshot = await project.inspect();
    if (snapshot.isErr()) return;
    expect((await project.copy(destination, snapshot.value.revision)).isOk()).toBe(true);
    const copied = await project.sprites.source(linked.value.id);
    const read = copied.isOk() ? await io(() => fs.readFile(copied.value, "utf8"), "read copied authoring document") : copied;
    expect(read.isOk() && read.value).toBe("editable document");
  });

  it("opens the external authoring document without treating document edits as exported pixel updates", async () => {
    const { project, imagePath } = await setup();
    const authoringPath = path.join(temporary(), "source/creature.ase");
    await writeFixture(temporary(), "source/creature.ase", "document revision one");
    const linked = await project.sprites.link("Creature", nativePath, 0, imagePath, null, "external", authoringPath);
    expect(linked.isOk()).toBe(true);
    if (linked.isErr()) return;
    const source = await project.sprites.source(linked.value.id);
    expect(source.isOk() && source.value).toBe(authoringPath);
    await io(() => fs.writeFile(authoringPath, "document revision two"), "edit original document");
    const read = await project.sprites.read(linked.value.id);
    expect(read.isOk() && read.value.fingerprint).toBe(linked.value.source.fingerprint);
    const records = await project.sprites.list();
    expect(records.isOk() && records.value[0]?.source.authoringPath).toBe(authoringPath);
  });
});
