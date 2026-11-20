import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { enginePreviewFilesSchema } from "@pangea/desktop-contracts";
import { EnginePreview } from "../src/enginePreview.ts";
import { io } from "../src/files.ts";

const previews: EnginePreview[] = [];
const roots: string[] = [];
afterEach(async () => {
  for (const preview of previews.splice(0)) { await preview.stop(); preview.dispose(); }
  for (const root of roots.splice(0)) await io(() => fs.rm(root, { recursive: true, force: true }), "Cleanup failed");
});

const encode = (text: string) => new TextEncoder().encode(text);
const files = [
  { path: "package.json", bytes: encode(JSON.stringify({ version: 1, id: "preview.test", name: "Preview test", entry: "main.lua", tickRate: 60,
    initialScene: "test", scenes: [{ id: "test", name: "Test", file: "scene.json", controller: "main" }] })) },
  { path: "main.lua", bytes: encode("return {}") },
  { path: "scene.json", bytes: encode(JSON.stringify({ version: 1, terrain: { samplesX: 2, samplesZ: 2, sizeX: 100, sizeZ: 100,
    chunkSize: 100, cellsPerChunk: 2, heights: [0, 0, 0, 0] }, colliders: [], assets: [] })) },
];

describe("native engine preview", () => {
  it("gives installation guidance rather than source build commands in packaged apps", async () => {
    const preview = new EnginePreview([], os.tmpdir(), os.tmpdir(), false, true);
    const result = await preview.launch(files);
    expect(result.isErr() && result.error.message).toContain("Install an editor release");
    expect(result.isErr() && result.error.message).not.toContain("build.py");
  });
  it("rejects traversal, case collisions, missing manifests and oversized packages", () => {
    expect(enginePreviewFilesSchema.safeParse([{ path: "../package.json", bytes: encode("{}") }]).success).toBe(false);
    expect(enginePreviewFilesSchema.safeParse([...files, { path: "MAIN.lua", bytes: encode("") }]).success).toBe(false);
    expect(enginePreviewFilesSchema.safeParse(files.slice(1)).success).toBe(false);
    expect(enginePreviewFilesSchema.safeParse([...files, { path: "main.lua/child", bytes: encode("") }]).success).toBe(false);
    expect(enginePreviewFilesSchema.safeParse([...files, ...Array.from({ length: 130 }, (_, index) => ({ path: `file${index}`, bytes: encode("") }))]).success).toBe(false);
  });

  it("returns concrete build instructions when the engine is missing", async () => {
    const preview = new EnginePreview([path.join(os.tmpdir(), "missing-pangea-engine")], os.tmpdir(), os.tmpdir());
    previews.push(preview);
    const status = await preview.status();
    expect(status.isOk() && status.value.available).toBe(false);
    const launch = await preview.launch(files);
    expect(launch.isErr() && launch.error.code).toBe("unavailable");
    expect(launch.isErr() && launch.error.message).toContain("build.py --dependencies --configure --build");
  });

  it.runIf(process.env.PANGEA_SANDBOX_NATIVE_TEST === "1")("launches the actual engine, replaces one preview, and removes staged files", async () => {
    const directory = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-engine-preview-test-")), "Fixture failed");
    expect(directory.isOk()).toBe(true);
    if (directory.isErr()) return;
    roots.push(directory.value);
    const executable = path.resolve("../.tmp/pangea-sandbox/PangeaSandbox");
    const preview = new EnginePreview([executable], path.join(directory.value, "runs"), path.join(directory.value, "saves"), true);
    previews.push(preview);
    const first = await preview.launch(files);
    expect(first.isOk() && first.value.running).toBe(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const running = await preview.status();
    expect(running.isOk() && running.value.running, running.isOk() ? running.value.message : "Status failed").toBe(true);
    const staged = await io(() => fs.readdir(path.join(directory.value, "runs")), "Cannot inspect staging");
    expect(staged.isOk() && staged.value.length).toBe(1);
    const second = await preview.launch(files);
    expect(second.isOk() && second.value.running).toBe(true);
    expect(second.isOk() && second.value.pid).not.toBe(first.isOk() && first.value.pid);
    await preview.shutdown();
    const stopped = await preview.status();
    expect(stopped.isOk() && stopped.value.running).toBe(false);
    const remaining = await io(() => fs.readdir(path.join(directory.value, "runs")), "Cannot inspect cleanup");
    expect(remaining.isOk() && remaining.value).toEqual([]);
    preview.dispose();
    expect((await preview.launch(files)).isErr()).toBe(true);
  });
});
