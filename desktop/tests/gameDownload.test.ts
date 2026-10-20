import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
import { Result } from "neverthrow";
import type { ReleaseAsset } from "@pangea/desktop-contracts";
import { downloadGame, unpackGame } from "../src/gameDownload.ts";
import { io, statOrMissing } from "../src/files.ts";

let root = "";
beforeEach(async () => {
  const fixture = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-download-")), "Fixture failed");
  expect(fixture.isOk()).toBe(true);
  if (fixture.isOk()) root = fixture.value;
});
afterEach(async () => {
  vi.unstubAllGlobals();
  if (root) await io(() => fs.rm(root, { recursive: true, force: true }), "Cleanup failed");
});

function asset(bytes: Uint8Array): ReleaseAsset {
  return { game: "OttoMatic", kind: "editor-assets", platform: "web", arch: "wasm", filename: "assets.zip",
    size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), format: "zip" };
}

describe("game package integrity", () => {
  it("accepts only the exact declared size and SHA-256", async () => {
    const payload = new TextEncoder().encode("verified game package");
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    const download = (packageAsset: ReleaseAsset, name: string) => downloadGame(packageAsset, "v1", path.join(root, name), new AbortController().signal, () => undefined);
    expect((await download(asset(payload), "valid")).isOk()).toBe(true);
    const corrupt = await download({ ...asset(payload), sha256: "0".repeat(64) }, "corrupt");
    expect(corrupt.isErr() && corrupt.error.code).toBe("integrity");
    const oversized = await download({ ...asset(payload), size: payload.length - 1 }, "oversized");
    expect(oversized.isErr() && oversized.error.code).toBe("integrity");
  });

  it("rejects archive traversal before writing outside the installation", async () => {
    const zipped = Result.fromThrowable(() => zipSync({ "../escaped": new Uint8Array([1]) }), () => "Fixture failed")();
    expect(zipped.isOk()).toBe(true);
    if (zipped.isErr()) return;
    const archive = path.join(root, "archive.zip");
    const destination = path.join(root, "installation");
    await io(() => fs.mkdir(destination), "Fixture failed");
    await io(() => fs.writeFile(archive, zipped.value), "Fixture failed");
    expect((await unpackGame(asset(zipped.value), archive, destination)).isErr()).toBe(true);
    const escaped = await statOrMissing(path.join(root, "escaped"));
    expect(escaped.isOk() && escaped.value).toBeNull();
  });

  it.each([404, 429, 500])("rejects HTTP %s before creating a download file", async (status) => {
    vi.stubGlobal("fetch", async () => new Response(null, { status }));
    const destination = path.join(root, "download");
    const result = await downloadGame(asset(new Uint8Array([1])), "v1", destination, new AbortController().signal, vi.fn());
    expect(result.isErr() && result.error.code).toBe("network");
    const file = await statOrMissing(destination);
    expect(file.isOk() && file.value).toBeNull();
  });

  it("detects truncated downloads and reports cumulative chunk progress", async () => {
    const first = new Uint8Array([1, 2]);
    const second = new Uint8Array([3]);
    vi.stubGlobal("fetch", async () => new Response(new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(first);
      controller.enqueue(second);
      controller.close();
    } })));
    const progress = vi.fn();
    const result = await downloadGame(asset(new Uint8Array([1, 2, 3, 4])), "v1", path.join(root, "short"), new AbortController().signal, progress);
    expect(result.isErr() && result.error.code).toBe("integrity");
    expect(progress.mock.calls).toEqual([[2], [3]]);
  });

  it("returns a failure for cancellation and passes the cancellation signal to fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn(() => Promise.reject(new Error("cancelled")));
    vi.stubGlobal("fetch", fetch);
    const result = await downloadGame(asset(new Uint8Array([1])), "v1", path.join(root, "cancelled"), controller.signal, vi.fn());
    expect(result.isErr()).toBe(true);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/v1/assets.zip"), { signal: controller.signal });
  });

  it("does not overwrite an existing download destination", async () => {
    const destination = path.join(root, "existing");
    expect((await io(() => fs.writeFile(destination, "original"), "Cannot create fixture")).isOk()).toBe(true);
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
    const result = await downloadGame(asset(new Uint8Array([1])), "v1", destination, new AbortController().signal, vi.fn());
    expect(result.isErr()).toBe(true);
    const read = await io(() => fs.readFile(destination, "utf8"), "Cannot read fixture");
    expect(read.isOk() && read.value).toBe("original");
  });

  it("extracts nested binary assets and refuses overwriting extracted files", async () => {
    const payload = new Uint8Array([0, 255, 128]);
    const zipped = Result.fromThrowable(() => zipSync({ "Data/Models/custom.bg3d": payload }), () => "Cannot zip fixture")();
    expect(zipped.isOk()).toBe(true);
    if (zipped.isErr()) return;
    const archive = path.join(root, "valid.zip");
    const destination = path.join(root, "extracted");
    expect((await io(() => fs.writeFile(archive, zipped.value), "Cannot write fixture")).isOk()).toBe(true);
    expect((await unpackGame(asset(zipped.value), archive, destination)).isOk()).toBe(true);
    const extracted = await io(() => fs.readFile(path.join(destination, "Data/Models/custom.bg3d")), "Cannot read asset");
    expect(extracted.isOk() && Uint8Array.from(extracted.value)).toEqual(payload);
    expect((await unpackGame(asset(zipped.value), archive, destination)).isErr()).toBe(true);
  });

  it("rejects malformed zip bytes", async () => {
    const archive = path.join(root, "invalid.zip");
    expect((await io(() => fs.writeFile(archive, "invalid zip"), "Cannot write fixture")).isOk()).toBe(true);
    const result = await unpackGame(asset(new Uint8Array([1])), archive, root);
    expect(result.isErr() && result.error.code).toBe("invalid");
  });
});
