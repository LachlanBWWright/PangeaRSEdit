import path from "node:path";
import * as fs from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { zipSync, unzipSync } from "fflate";
import { ok } from "neverthrow";
import type { PackLevelInput } from "@pangea/desktop-contracts";
import { PackStore } from "../src/packStore.ts";
import { ProjectStore } from "../src/projectStore.ts";
import { GameStore } from "../src/gameStore.ts";
import { buildPackArchive, readPackArchive } from "../src/packArchive.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";
import { io } from "../src/files.ts";

const root = useTemporaryDirectory();
const bytes = (text: string) => new TextEncoder().encode(text);
async function projectFixture() {
  const folder = path.join(root(), "project");
  await io(() => fs.mkdir(folder), "Fixture failed");
  const project = new ProjectStore(path.join(root(), "recovery"));
  const created = await project.create(folder, "Two missions", "OttoMatic");
  if (created.isErr()) return null;
  const levels = ["one", "two"].map((id) => ({ id, name: id, baseLevel: 0, primary: `.pangea/levels/${id}/level.ter.rsrc`, files: [`.pangea/levels/${id}/level.ter.rsrc`] }));
  const saved = await project.save(created.value.revision, { ...created.value.manifest, levels }, levels.map((level) => ({ path: level.primary, bytes: bytes(level.id) })), []);
  if (saved.isErr()) return null;
  const source = await project.read(saved.value.files.map((file) => file.path));
  if (source.isErr()) return null;
  const native: PackLevelInput[] = levels.map((level) => ({ id: level.id, name: level.name, args: ["--level", "0"], files: [
    { path: "Data/Terrain/EarthFarm.ter.rsrc", bytes: bytes(`terrain-${level.id}`) },
    { path: "Data/Scripts/dist/main.lua", bytes: bytes(`return { name = '${level.id}' }`) },
  ] }));
  return { project, snapshot: saved.value, source: source.value, native };
}

it("exports independent runtime roots for levels sharing a native slot and round-trips editable sources", async () => {
  const f = await projectFixture(); if (!f) return;
  const encoded = buildPackArchive(f.snapshot, f.source, f.native);
  expect(encoded.isOk()).toBe(true); if (encoded.isErr()) return;
  const decoded = readPackArchive(encoded.value);
  expect(decoded.isOk()).toBe(true); if (decoded.isErr()) return;
  expect(decoded.value.manifest.levels.map((level) => level.root)).toEqual(["Runtime/one", "Runtime/two"]);
  expect(new TextDecoder().decode(decoded.value.entries["Runtime/two/Data/Scripts/dist/main.lua"])).toContain("two");
  expect(decoded.value.entries["Project/pangea.project.json"]).toBeDefined();
  expect(new TextDecoder().decode(decoded.value.entries["README.txt"])).toContain("--data-dir");
});

it("keeps linked sprite sources portable in editable packs and excludes them from runtime-only packs", async () => {
  const f = await projectFixture(); if (!f) return;
  const saved = await f.project.save(f.snapshot.revision, f.snapshot.manifest, [{ path: "Assets/sprites/robot.shapes", bytes: bytes("native") }], []);
  if (saved.isErr()) { expect.fail(saved.error.message); return; }
  await writeFixture(root(), "external/robot.png", "PNG export");
  await writeFixture(root(), "external/robot.json", "{\"frames\":[]}");
  await writeFixture(root(), "external/robot.aseprite", "Aseprite source");
  const linked = await f.project.sprites.link("Robot", "Assets/sprites/robot.shapes", 0,
    path.join(root(), "external/robot.png"), path.join(root(), "external/robot.json"), "external", path.join(root(), "external/robot.aseprite"));
  if (linked.isErr()) { expect.fail(linked.error.message); return; }
  const snapshot = await f.project.inspect();
  if (snapshot.isErr()) return;
  const packs = new PackStore(path.join(root(), "packs"));
  const destination = path.join(root(), "portable.pangeapack");
  const exported = await packs.export(f.project, snapshot.value.revision, f.native, destination, true, true);
  expect(exported.isOk(), exported.isErr() ? exported.error.message : "").toBe(true);
  const decoded = readPackArchive(await fs.readFile(destination));
  if (decoded.isErr()) { expect.fail(decoded.error.message); return; }
  expect(Object.keys(decoded.value.entries).filter((name) => name.startsWith("Project/AuthoringSources/"))).toHaveLength(3);
  expect(new TextDecoder().decode(decoded.value.entries["Project/.pangea/sprites.json"])).not.toContain(root());
  const opened = await packs.open(destination);
  if (opened.isErr()) return;
  const folder = path.join(root(), "imported"); await fs.mkdir(folder);
  const restored = await packs.importProject(opened.value.id, folder, f.project);
  expect(restored.isOk()).toBe(true);
  const source = await f.project.sprites.read(linked.value.id);
  expect(source.isOk() && new TextDecoder().decode(source.value.imageBytes)).toBe("PNG export");
  if (restored.isErr()) return;
  const runtime = path.join(root(), "runtime.pangeapack");
  expect((await packs.export(f.project, restored.value.revision, f.native, runtime, false, false)).isOk()).toBe(true);
  const runtimeArchive = readPackArchive(await fs.readFile(runtime));
  expect(runtimeArchive.isOk() && Object.keys(runtimeArchive.value.entries).some((name) => name.startsWith("Project/") || name.includes("AuthoringSources/"))).toBe(false);
});

it("rejects modified bytes, traversal, undeclared files, incompatible contracts and invalid launch arguments", async () => {
  const f = await projectFixture(); if (!f) return;
  const encoded = buildPackArchive(f.snapshot, f.source, f.native);
  if (encoded.isErr()) return;
  const entries = unzipSync(encoded.value);
  entries["Runtime/one/Data/Scripts/dist/main.lua"] = bytes("tampered");
  const changed = readPackArchive(zipSync(entries));
  expect(changed.isErr() && changed.error.code).toBe("checksum");
  const unknown = unzipSync(encoded.value); unknown["unknown.txt"] = bytes("undeclared");
  expect(readPackArchive(zipSync(unknown)).isErr()).toBe(true);
  expect(readPackArchive(zipSync({ "../escape": bytes("bad") })).isErr()).toBe(true);
  const invalid = { ...f.native[0], id: "one", name: "one", args: ["--data-dir", "/outside"], files: [] };
  expect(buildPackArchive(f.snapshot, f.source, [invalid, ...f.native.slice(1)]).isErr()).toBe(true);
  const unsupported = unzipSync(encoded.value);
  unsupported["pangea-pack.json"] = bytes('{"version":99}');
  expect(readPackArchive(zipSync(unsupported)).isErr()).toBe(true);
  const first = f.native[0];
  if (!first) return;
  const collision = { ...first, files: [...first.files, { path: "Data/scripts/dist/main.lua", bytes: bytes("case collision") }] };
  expect(buildPackArchive(f.snapshot, f.source, [collision, ...f.native.slice(1)]).isErr()).toBe(true);
});

it("plays the chosen pack snapshot, detects cache tampering, and imports into an empty project folder", async () => {
  const f = await projectFixture(); if (!f) return;
  const encoded = buildPackArchive(f.snapshot, f.source, f.native);
  if (encoded.isErr()) return;
  await writeFixture(root(), "missions.pangeapack", encoded.value);
  const packs = new PackStore(path.join(root(), "packs"));
  const opened = await packs.open(path.join(root(), "missions.pangeapack"));
  expect(opened.isOk()).toBe(true); if (opened.isErr()) return;
  const restarted = new PackStore(path.join(root(), "packs"));
  const restored = await restarted.list();
  expect(restored.isOk() && restored.value.map((pack) => pack.id)).toEqual([opened.value.id]);
  const games = new GameStore(path.join(root(), "games"), () => undefined);
  const launched = vi.spyOn(games, "launch").mockResolvedValue(ok(undefined));
  expect((await packs.play(opened.value.id, "two", games)).isOk()).toBe(true);
  expect(launched).toHaveBeenCalledWith("OttoMatic", expect.arrayContaining([{ path: "Data/Scripts/dist/main.lua", bytes: bytes("return { name = 'two' }") }]), ["--level", "0"]);
  const destination = path.join(root(), "imported"); await io(() => fs.mkdir(destination), "Fixture failed");
  const imported = await new PackStore(path.join(root(), "packs")).importProject(opened.value.id, destination, f.project);
  expect(imported.isOk() && imported.value.manifest.levels).toHaveLength(2);
  expect((await packs.importProject(opened.value.id, destination, f.project)).isErr()).toBe(true);
  await writeFixture(root(), `packs/${opened.value.id}/Runtime/two/Data/Scripts/dist/main.lua`, "tampered");
  const tampered = await packs.play(opened.value.id, "two", games);
  expect(tampered.isErr() && tampered.error.code).toBe("checksum");
  expect(launched).toHaveBeenCalledTimes(1);
  expect((await restarted.remove(opened.value.id)).isOk()).toBe(true);
  const removed = await new PackStore(path.join(root(), "packs")).list();
  expect(removed.isOk() && removed.value).toEqual([]);
});

it("rejects overlapping pack operations and loads persisted packs before playing", async () => {
  const f = await projectFixture(); expect(f).not.toBeNull(); if (!f) return;
  const encoded = buildPackArchive(f.snapshot, f.source, f.native);
  expect(encoded.isOk()).toBe(true); if (encoded.isErr()) return;
  const archive = path.join(root(), "missions.pangeapack");
  await writeFixture(root(), "missions.pangeapack", encoded.value);
  const packs = new PackStore(path.join(root(), "packs"));
  expect((await packs.open(path.join(root(), "missing.pangeapack"))).isErr()).toBe(true);
  const opening = packs.open(archive);
  const overlapping = await packs.open(archive);
  expect(overlapping.isErr() && overlapping.error.code).toBe("busy");
  const opened = await opening;
  expect(opened.isOk()).toBe(true); if (opened.isErr()) return;
  const games = new GameStore(path.join(root(), "games"), () => undefined);
  const launched = vi.spyOn(games, "launch").mockResolvedValue(ok(undefined));
  const restarted = new PackStore(path.join(root(), "packs"));
  expect((await restarted.play(opened.value.id, "one", games)).isOk()).toBe(true);
  expect(launched).toHaveBeenCalledOnce();
});

it("exports outside project sources and refuses to overwrite a managed file", async () => {
  const f = await projectFixture(); expect(f).not.toBeNull(); if (!f) return;
  const packs = new PackStore(path.join(root(), "packs"));
  const manifest = path.join(f.snapshot.folder, "pangea.project.json");
  const before = await fs.readFile(manifest);
  const overwrite = await packs.export(f.project, f.snapshot.revision, f.native, manifest);
  expect(overwrite.isErr() && overwrite.error.code).toBe("invalid");
  expect(await fs.readFile(manifest)).toEqual(before);
  const recursive = await packs.export(f.project, f.snapshot.revision, f.native, path.join(f.snapshot.folder, "missions.pangeapack"));
  expect(recursive.isErr() && recursive.error.message).toContain("outside the project");
  const destination = path.join(root(), "missions.pangeapack");
  expect((await packs.export(f.project, f.snapshot.revision, f.native, destination)).isOk()).toBe(true);
  expect(readPackArchive(await fs.readFile(destination)).isOk()).toBe(true);
});
