import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBG3D, type BG3DGeometry, type BG3DGroup } from "../src/modelParsers/parseBG3D";
import { parse3DMFToMetaFile } from "../src/modelParsers/threeDMF/parse3DMF";

const execute = promisify(execFile);
const cli = resolve(import.meta.dirname, "../dist/cli.js");
const fixtures = resolve(import.meta.dirname, "../../../frontend/public/games");
const staticBG3D = resolve(fixtures, "ottomatic/models/mainmenu.bg3d");
const static3DMF = resolve(fixtures, "bugdom1/models/MainMenu.3dmf");
const animated3DMF = resolve(fixtures, "bugdom1/skeletons/Ant.3dmf");
const commandErrorSchema = z.object({ code: z.number(), stdout: z.string(), stderr: z.string() });
const summarySchema = z.object({
  meshes: z.array(z.object({ primitives: z.number(), vertices: z.number() })),
  materials: z.number(), textures: z.number(),
  skins: z.array(z.object({ joints: z.number() })),
  animations: z.array(z.object({ name: z.string(), channels: z.number() })),
});
type Summary = z.infer<typeof summarySchema>;
interface CommandOutput { readonly stdout: string; readonly stderr: string; readonly exitCode: number; }

function boundaryMessage(value: unknown): string {
  const parsed = z.object({ message: z.string() }).safeParse(value);
  return parsed.success ? parsed.data.message : "External operation failed";
}

function runCli(args: readonly string[]): ResultAsync<CommandOutput, CommandOutput> {
  return ResultAsync.fromPromise(execute(process.execPath, [cli, ...args], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 }), value => {
    const parsed = commandErrorSchema.safeParse(value);
    return parsed.success ? { ...parsed.data, exitCode: parsed.data.code }
      : { exitCode: -1, stdout: "", stderr: boundaryMessage(value) };
  }).map(output => ({ ...output, exitCode: 0 }));
}

async function successfulCommand(args: readonly string[]): Promise<CommandOutput> {
  return runCli(args).match(output => output, failure => {
    expect(failure.stderr).toBe("");
    expect(failure.exitCode).toBe(0);
    return failure;
  });
}

function inspect(path: string): ResultAsync<Summary, string> {
  return runCli(["inspect", path]).mapErr(output => output.stderr)
    .andThen(output => Result.fromThrowable((text: string): unknown => JSON.parse(text), boundaryMessage)(output.stdout))
    .andThen(value => {
      const parsed = summarySchema.safeParse(value);
      return parsed.success ? ok(parsed.data) : err(parsed.error.message);
    });
}

async function readSummary(path: string): Promise<Summary | null> {
  const result = await inspect(path);
  expect(result.isOk(), result.isErr() ? result.error : "").toBe(true);
  return result.isOk() ? result.value : null;
}

function geometryTotals(summary: Summary): { meshes: number; primitives: number; vertices: number } {
  return { meshes: summary.meshes.length,
    primitives: summary.meshes.reduce((total, mesh) => total + mesh.primitives, 0),
    vertices: summary.meshes.reduce((total, mesh) => total + mesh.vertices, 0) };
}

type GroupSignature = { readonly children: readonly GroupSignature[] }
  | { readonly points: number; readonly triangles: number; readonly firstVertex?: readonly number[] };

function groupSignature(node: BG3DGroup | BG3DGeometry): GroupSignature {
  if ("children" in node) return { children: node.children.map(groupSignature) };
  return { points: node.numPoints, triangles: node.numTriangles, firstVertex: node.vertices?.[0] };
}

async function expectNativeGroupsPreserved(originalPath: string, restoredPath: string, format: "bg3d" | "3dmf"): Promise<void> {
  const read = (path: string) => ResultAsync.fromPromise(readFile(path), boundaryMessage).map(bytes => new Uint8Array(bytes).buffer);
  if (format === "bg3d") {
    const original = await read(originalPath).andThen(parseBG3D);
    const restored = await read(restoredPath).andThen(parseBG3D);
    expect(original.isOk() && restored.isOk()).toBe(true);
    if (original.isOk() && restored.isOk()) {
      expect(restored.value.groups.map(groupSignature)).toEqual(original.value.groups.map(groupSignature));
    }
    return;
  }
  const original = await read(originalPath).andThen(parse3DMFToMetaFile);
  const restored = await read(restoredPath).andThen(parse3DMFToMetaFile);
  expect(original.isOk() && restored.isOk()).toBe(true);
  if (original.isErr() || restored.isErr()) return;
  const signature = (mesh: { readonly numPoints: number; readonly numTriangles: number; readonly points: readonly { x: number; y: number; z: number }[] }) => ({
    points: mesh.numPoints, triangles: mesh.numTriangles, firstVertex: mesh.points[0],
  });
  expect(restored.value.topLevelGroups.map(group => group.meshes.map(signature)))
    .toEqual(original.value.topLevelGroups.map(group => group.meshes.map(signature)));
}

let outputDirectory = "";

describe("built model CLI with bundled native assets", () => {
  beforeAll(async () => {
    const result = await ResultAsync.fromPromise(mkdtemp(resolve(tmpdir(), "pangea-model-cli-")), boundaryMessage);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) outputDirectory = result.value;
  });

  afterAll(async () => {
    if (!outputDirectory) return;
    const result = await ResultAsync.fromPromise(rm(outputDirectory, { recursive: true, force: true }), boundaryMessage);
    expect(result.isOk()).toBe(true);
  });

  it("roundtrips a real static BG3D through GLB with native geometry and textures", async () => {
    const glb = resolve(outputDirectory, "static-bg3d.glb");
    const native = resolve(outputDirectory, "static-bg3d.bg3d");
    await successfulCommand(["convert", staticBG3D, glb]);
    await successfulCommand(["convert", glb, native, "--target", "ottomatic"]);
    const original = await readSummary(staticBG3D);
    const restored = await readSummary(native);
    if (!original || !restored) return;
    expect(geometryTotals(restored)).toEqual(geometryTotals(original));
    expect(restored.textures).toBe(original.textures);
    expect(restored.skins).toEqual([]);
    await expectNativeGroupsPreserved(staticBG3D, native, "bg3d");
  }, 30_000);

  it("roundtrips a real static 3DMF through GLB back into native geometry", async () => {
    const glb = resolve(outputDirectory, "static-3dmf.glb");
    const native = resolve(outputDirectory, "static-3dmf.3dmf");
    await successfulCommand(["convert", static3DMF, glb]);
    await successfulCommand(["convert", glb, native, "--target", "bugdom"]);
    const original = await readSummary(static3DMF);
    const restored = await readSummary(native);
    if (!original || !restored) return;
    expect(geometryTotals(restored)).toEqual(geometryTotals(original));
    expect(restored.textures).toBe(original.textures);
    await expectNativeGroupsPreserved(static3DMF, native, "3dmf");
  }, 30_000);

  it("discovers a real animated native companion and exports a readable skeleton pair", async () => {
    const glb = resolve(outputDirectory, "animated-ant.glb");
    const native = resolve(outputDirectory, "animated-ant.3dmf");
    const skeleton = resolve(outputDirectory, "animated-ant.skeleton.rsrc");
    await successfulCommand(["convert", animated3DMF, glb]);
    await successfulCommand(["convert", glb, native, "--target", "bugdom"]);
    const skeletonBytes = await ResultAsync.fromPromise(readFile(skeleton), boundaryMessage);
    expect(skeletonBytes.isOk()).toBe(true);
    if (skeletonBytes.isOk()) expect(skeletonBytes.value.length).toBeGreaterThan(256);
    const original = await readSummary(animated3DMF);
    const restored = await readSummary(native);
    if (!original || !restored) return;
    expect(original.skins.length).toBeGreaterThan(0);
    expect(original.animations.length).toBeGreaterThan(0);
    expect(restored.skins).toEqual(original.skins);
    expect(restored.animations).toEqual(original.animations);
    expect(geometryTotals(restored)).toEqual(geometryTotals(original));
    await expectNativeGroupsPreserved(animated3DMF, native, "3dmf");
  }, 30_000);

  it("writes and reloads external glTF buffers and texture files", async () => {
    const gltf = resolve(outputDirectory, "external.gltf");
    const native = resolve(outputDirectory, "external.bg3d");
    await successfulCommand(["convert", staticBG3D, gltf]);
    const json = await ResultAsync.fromPromise(readFile(gltf, "utf8"), boundaryMessage)
      .andThen(text => Result.fromThrowable((value: string): unknown => JSON.parse(value), boundaryMessage)(text));
    expect(json.isOk()).toBe(true);
    if (json.isErr()) return;
    const asset = z.object({ buffers: z.array(z.object({ uri: z.string() })), images: z.array(z.object({ uri: z.string() })) }).safeParse(json.value);
    expect(asset.success).toBe(true);
    if (!asset.success) return;
    expect(asset.data.buffers.length).toBeGreaterThan(0);
    expect(asset.data.images.length).toBeGreaterThan(0);
    for (const resource of [...asset.data.buffers, ...asset.data.images]) {
      expect(resource.uri).toMatch(/^external\.resources\//);
      const bytes = await ResultAsync.fromPromise(readFile(resolve(outputDirectory, resource.uri)), boundaryMessage);
      expect(bytes.isOk()).toBe(true);
      if (bytes.isOk()) expect(bytes.value.length).toBeGreaterThan(0);
    }
    await successfulCommand(["convert", gltf, native, "--target", "ottomatic"]);
    const original = await readSummary(staticBG3D);
    const restored = await readSummary(native);
    if (original && restored) {
      expect(geometryTotals(restored)).toEqual(geometryTotals(original));
      expect(restored.textures).toBe(original.textures);
    }
  }, 30_000);

  it("refuses overwrite and preserves existing output until --force is requested", async () => {
    const glb = resolve(outputDirectory, "overwrite.glb");
    await successfulCommand(["convert", staticBG3D, glb]);
    const before = await ResultAsync.fromPromise(readFile(glb), boundaryMessage);
    const refused = await runCli(["convert", static3DMF, glb]);
    expect(refused.isErr()).toBe(true);
    if (refused.isErr()) {
      expect(refused.error.exitCode).toBe(1);
      expect(refused.error.stderr).toContain("already exists");
    }
    const after = await ResultAsync.fromPromise(readFile(glb), boundaryMessage);
    expect(before.isOk() && after.isOk()).toBe(true);
    if (before.isOk() && after.isOk()) expect(after.value).toEqual(before.value);
    await successfulCommand(["convert", static3DMF, glb, "--force"]);
  }, 30_000);

  it.each([
    { args: ["convert"] },
    { args: ["convert", "a.bg3d", "b.glb", "--unknown"] },
    { args: ["inspect", "a.bg3d", "extra"] },
  ])("rejects malformed command arguments $args", async ({ args }) => {
    const result = await runCli(args);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.exitCode).toBe(2);
      expect(result.error.stderr.length).toBeGreaterThan(0);
    }
  });
});
