import type { PathLike } from "node:fs";
import { access, link, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { external } from "./boundaries";
import { convertModelFiles } from "./conversion";
import { writeOutputFiles } from "./files";

const fault = vi.hoisted(() => ({ destination: "", persistent: false }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, link: (source: PathLike, destination: PathLike) => {
    if (destination !== fault.destination) return original.link(source, destination);
    if (!fault.persistent) fault.destination = "";
    return Promise.reject(new Error("Simulated output publication failure"));
  } };
});

let directory = "";
const bytes = new TextEncoder().encode("replacement");

beforeEach(async () => {
  const result = await external(() => mkdtemp(join(tmpdir(), "pangea-output-test-")));
  expect(result.isOk()).toBe(true);
  if (result.isOk()) directory = result.value;
});

afterEach(async () => {
  fault.destination = "";
  fault.persistent = false;
  if (directory) expect((await external(() => rm(directory, { recursive: true, force: true }))).isOk()).toBe(true);
  directory = "";
});

async function seed(name: string, content = "original"): Promise<string> {
  const path = join(directory, name);
  expect((await external(() => writeFile(path, content))).isOk()).toBe(true);
  return path;
}

async function contents(path: string): Promise<string | null> {
  return (await external(() => readFile(path, "utf8"))).match((text) => text, () => null);
}

describe("safe model export", () => {
  it("protects direct input paths even with force", async () => {
    const input = await seed("input.bg3d");
    expect((await writeOutputFiles([{ path: input, bytes }], [input], true)).isErr()).toBe(true);
    expect(await contents(input)).toBe("original");
  });

  it.each(["symbolic", "hard"])("protects inputs through %s links", async (kind) => {
    const input = await seed("input.bg3d");
    const alias = join(directory, "alias.bg3d");
    expect((await external(() => kind === "symbolic" ? symlink(input, alias) : link(input, alias))).isOk()).toBe(true);
    expect((await writeOutputFiles([{ path: alias, bytes }], [input], true)).isErr()).toBe(true);
    expect(await contents(input)).toBe("original");
  });

  it("detects duplicate destinations through linked directories", async () => {
    const alias = join(directory, "alias");
    expect((await external(() => symlink(directory, alias))).isOk()).toBe(true);
    const first = join(directory, "model.glb");
    const second = join(alias, "model.glb");
    expect((await writeOutputFiles([{ path: first, bytes }, { path: second, bytes }], [], false)).isErr()).toBe(true);
    expect((await external(() => access(first))).isErr()).toBe(true);
  });

  it("preflights the entire bundle before creating output files", async () => {
    const first = join(directory, "model.glb");
    const second = await seed("existing.glb");
    expect((await writeOutputFiles([{ path: first, bytes }, { path: second, bytes }], [], false)).isErr()).toBe(true);
    expect((await external(() => access(first))).isErr()).toBe(true);
    expect(await contents(second)).toBe("original");
  });

  it.each([false, true])("rolls back a failed bundle with force=%s", async (force) => {
    const first = force ? await seed("model.glb", "old model") : join(directory, "model.glb");
    const second = force ? await seed("skeleton.rsrc", "old skeleton") : join(directory, "skeleton.rsrc");
    fault.destination = second;
    const result = await writeOutputFiles([{ path: first, bytes }, { path: second, bytes }], [], force);
    expect(result.isErr()).toBe(true);
    expect(await contents(first)).toBe(force ? "old model" : null);
    expect(await contents(second)).toBe(force ? "old skeleton" : null);
    const remaining = await external(() => readdir(directory));
    expect(remaining.isOk()).toBe(true);
    if (remaining.isOk()) expect(remaining.value.filter((name) => name.startsWith(".pangea-export-"))).toEqual([]);
  });

  it("publishes a complete bundle when force is explicit", async () => {
    const first = await seed("model.glb");
    const second = await seed("skeleton.rsrc");
    expect((await writeOutputFiles([{ path: first, bytes }, { path: second, bytes }], [], true)).isOk()).toBe(true);
    expect(await contents(first)).toBe("replacement");
    expect(await contents(second)).toBe("replacement");
  });

  it("retains the original backup and reports its location if rollback fails", async () => {
    const first = await seed("model.glb", "old model");
    const second = await seed("skeleton.rsrc", "old skeleton");
    fault.destination = second;
    fault.persistent = true;
    const result = await writeOutputFiles([{ path: first, bytes }, { path: second, bytes }], [], true);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("Backup retained at");
    expect(await contents(first)).toBe("old model");
    const remaining = await external(() => readdir(directory));
    expect(remaining.isOk()).toBe(true);
    if (remaining.isErr()) return;
    const backupDirectory = remaining.value.find((name) => name.startsWith(".pangea-export-"));
    expect(backupDirectory).toBeDefined();
    if (backupDirectory) expect(await contents(join(directory, backupDirectory, "backup"))).toBe("old skeleton");
  });

  it("protects external glTF buffer inputs during native conversion", async () => {
    const buffer = join(directory, "geometry.bg3d");
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect((await external(() => writeFile(buffer, new Uint8Array(positions.buffer)))).isOk()).toBe(true);
    const input = await seed("mesh.gltf", JSON.stringify({
      asset: { version: "2.0" }, buffers: [{ uri: "geometry.bg3d", byteLength: 36 }],
      bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
    }));
    const result = await convertModelFiles(input, buffer, { force: true, allowLossy: true });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("overwrite an input");
    const after = await external(() => readFile(buffer));
    expect(after.isOk()).toBe(true);
    if (after.isOk()) expect([...after.value]).toEqual([...new Uint8Array(positions.buffer)]);
  });
});
