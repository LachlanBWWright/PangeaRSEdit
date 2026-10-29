import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Result } from "neverthrow";
import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { assetInstallationSchema, upstreamDataReleaseSchema, type UpstreamDataRelease } from "@pangea/desktop-contracts";
import { upstreamCatalog } from "../src/upstreamCatalog.ts";
import * as catalogModule from "../src/upstreamCatalog.ts";
import { downloadUpstream, unpackUpstream } from "../src/upstreamDownload.ts";
import { GameStore } from "../src/gameStore.ts";
import { EditorAssets } from "../src/editorAssets.ts";
import { io, statOrMissing } from "../src/files.ts";
import { bytes, readFixture, useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

function fixtureRelease(payload: Uint8Array): UpstreamDataRelease {
  return { game: "OttoMatic", version: "4.0.1", repository: "Jorio/OttoMatic", tag: "4.0.1", filename: "stock.zip",
    dataPrefix: "OttoMatic-4.0.1/Data", size: payload.length, sha256: createHash("sha256").update(payload).digest("hex"),
    releaseUrl: "https://github.com/Jorio/OttoMatic/releases/tag/4.0.1",
    downloadUrl: "https://github.com/Jorio/OttoMatic/releases/download/4.0.1/stock.zip" };
}

async function archive(entries: Record<string, Uint8Array>) {
  const zipped = Result.fromThrowable(() => zipSync(entries), () => "Cannot create ZIP fixture")();
  expect(zipped.isOk()).toBe(true);
  const payload = zipped.isOk() ? zipped.value : new Uint8Array();
  await writeFixture(root(), "stock.zip", payload);
  return { payload, release: fixtureRelease(payload), location: path.join(root(), "stock.zip"), destination: path.join(root(), "extracted") };
}

describe("pinned Jorio stock distributions", () => {
  it("pins exactly eight official releases including the Mighty Mike hotfix", () => {
    const catalog = upstreamCatalog();
    expect(new Set(catalog.map((item) => item.game)).size).toBe(8);
    for (const release of catalog) {
      expect(upstreamDataReleaseSchema.safeParse(release).success).toBe(true);
      expect(release.downloadUrl).toBe(`https://github.com/${release.repository}/releases/download/${release.tag}/${release.filename}`);
      expect(release.repository).toBe(`Jorio/${release.game}`);
      expect(release.dataPrefix).toBe(`${release.game}-${release.version}/Data`);
    }
    expect(catalog.find((item) => item.game === "MightyMike")?.filename).toContain("hotfix");
  });

  it("downloads verified bytes and reports progress from a trusted pinned URL", async () => {
    const payload = bytes("archive bytes");
    const release = fixtureRelease(payload);
    const fetch = vi.fn(async () => new Response(Uint8Array.from(payload)));
    vi.stubGlobal("fetch", fetch);
    const progress = vi.fn();
    const controller = new AbortController();
    expect((await downloadUpstream(release, path.join(root(), "download"), controller.signal, progress)).isOk()).toBe(true);
    expect(fetch).toHaveBeenCalledWith(release.downloadUrl, { signal: controller.signal });
    expect(progress).toHaveBeenCalledWith(payload.length);
    expect(await readFixture(root(), "download")).toBe("archive bytes");
  });

  it.each(["digest", "truncated", "oversized"])("rejects %s upstream downloads", async (problem) => {
    const payload = bytes("archive bytes");
    const pinned = fixtureRelease(payload);
    const release = problem === "digest" ? { ...pinned, sha256: "0".repeat(64) }
      : { ...pinned, size: pinned.size + (problem === "truncated" ? 1 : -1) };
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    const downloaded = await downloadUpstream(release, path.join(root(), "download"), new AbortController().signal, vi.fn());
    expect(downloaded.isErr() && downloaded.error.code).toBe("integrity");
  });

  it("cancels before network access and during streamed transfer", async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => new Response(bytes("abc")));
    vi.stubGlobal("fetch", fetch);
    controller.abort();
    const first = await downloadUpstream(fixtureRelease(bytes("abc")), path.join(root(), "first"), controller.signal, vi.fn());
    expect(first.isErr() && first.error.code).toBe("cancelled");
    expect(fetch).not.toHaveBeenCalled();
    const second = new AbortController();
    const result = await downloadUpstream(fixtureRelease(bytes("abc")), path.join(root(), "second"), second.signal, () => second.abort());
    expect(result.isErr() && result.error.code).toBe("cancelled");
  });

  it.each([404, 429, 500])("rejects HTTP %s without creating a destination", async (status) => {
    vi.stubGlobal("fetch", async () => new Response(null, { status }));
    const result = await downloadUpstream(fixtureRelease(bytes("abc")), path.join(root(), "download"), new AbortController().signal, vi.fn());
    expect(result.isErr() && result.error.code).toBe("network");
    const file = await statOrMissing(path.join(root(), "download"));
    expect(file.isOk() && file.value).toBeNull();
  });

  it("normalizes fetch rejection after cancellation", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", () => { controller.abort(); return Promise.reject(new Error("AbortError")); });
    const result = await downloadUpstream(fixtureRelease(bytes("abc")), path.join(root(), "download"), controller.signal, vi.fn());
    expect(result.isErr() && result.error.code).toBe("cancelled");
  });

  it("extracts only stock data and upstream attribution as non-executable files", async () => {
    const fixture = await archive({
      "OttoMatic-4.0.1/Data/System/boot": bytes("boot"), "OttoMatic-4.0.1/Data/Models/custom.bg3d": bytes("model"),
      "OttoMatic-4.0.1/License.txt": bytes("license"), "OttoMatic-4.0.1/ReadMe.txt": bytes("readme"),
      "OttoMatic-4.0.1/OttoMatic.exe": bytes("never execute"), "OttoMatic-4.0.1/SDL3.dll": bytes("unused"),
      "Other/Data/System/foreign": bytes("foreign"),
    });
    const extracted = await unpackUpstream(fixture.release, fixture.location, fixture.destination, new AbortController().signal);
    expect(extracted.isOk() && extracted.value).toBe(path.join(fixture.destination, "Data"));
    expect(await readFixture(fixture.destination, "Data/Models/custom.bg3d")).toBe("model");
    expect(await readFixture(fixture.destination, "License.txt")).toBe("license");
    expect(await readFixture(fixture.destination, "ReadMe.txt")).toBe("readme");
    const files = await io(() => fs.readdir(fixture.destination), "Cannot inspect fixture");
    expect(files.isOk() && files.value.sort()).toEqual(["Data", "License.txt", "ReadMe.txt"]);
    const info = await io(() => fs.stat(path.join(fixture.destination, "Data/Models/custom.bg3d")), "Cannot inspect mode");
    if (process.platform !== "win32") expect(info.isOk() && (info.value.mode & 0o111)).toBe(0);
  });

  it.each(["../escaped", "Models/../../escaped", "Models/back\\slash", "Models/CON.txt"])("rejects unsafe stock path %s", async (unsafe) => {
    const fixture = await archive({ "OttoMatic-4.0.1/Data/System/boot": bytes("boot"), [`OttoMatic-4.0.1/Data/${unsafe}`]: bytes("unsafe") });
    const extracted = await unpackUpstream(fixture.release, fixture.location, fixture.destination, new AbortController().signal);
    expect(extracted.isErr()).toBe(true);
    const directory = await statOrMissing(fixture.destination);
    expect(directory.isOk() && directory.value).toBeNull();
  });

  it("rejects wrong layouts, malformed ZIPs, cancellation, and overwrites", async () => {
    const fixture = await archive({ "Other/Data/System/boot": bytes("wrong") });
    expect((await unpackUpstream(fixture.release, fixture.location, fixture.destination, new AbortController().signal)).isErr()).toBe(true);
    await writeFixture(root(), "stock.zip", "not a ZIP");
    expect((await unpackUpstream(fixture.release, fixture.location, fixture.destination, new AbortController().signal)).isErr()).toBe(true);
    const valid = await archive({ "OttoMatic-4.0.1/Data/System/boot": bytes("boot") });
    const cancelled = new AbortController(); cancelled.abort();
    expect((await unpackUpstream(valid.release, valid.location, valid.destination, cancelled.signal)).isErr()).toBe(true);
    expect((await unpackUpstream(valid.release, valid.location, valid.destination, new AbortController().signal)).isOk()).toBe(true);
    expect((await unpackUpstream(valid.release, valid.location, valid.destination, new AbortController().signal)).isErr()).toBe(true);
  });
});

describe("upstream stock registry and native asset access", () => {
  it("installs a verified distribution, records its origin, and switches back to editor assets atomically", async () => {
    const fixture = await archive({ "OttoMatic-4.0.1/Data/System/boot": bytes("boot"),
      "OttoMatic-4.0.1/Data/Models/native.bg3d": bytes("model"), "OttoMatic-4.0.1/OttoMatic.exe": bytes("unused") });
    vi.spyOn(catalogModule, "upstreamCatalog").mockReturnValue([fixture.release]);
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(fixture.payload)));
    const progress = vi.fn();
    const games = new GameStore(root(), progress);
    const installed = await games.installUpstreamData("OttoMatic");
    expect(installed.isOk()).toBe(true);
    const assets = new EditorAssets(root());
    const loaded = await assets.load();
    expect(loaded.isOk() && loaded.value[0]).toEqual(expect.objectContaining({ game: "OttoMatic", source: "upstream",
      version: fixture.release.version, releaseUrl: fixture.release.releaseUrl }));
    const oldRoot = loaded.isOk() ? loaded.value[0]?.root : undefined;
    expect(progress).toHaveBeenCalledWith("OttoMatic", fixture.payload.length, fixture.payload.length);
    expect((await games.load()).isOk()).toBe(true);
    expect((await games.launch("OttoMatic")).isErr()).toBe(true);
    const nextRoot = path.join(root(), "editor-assets/OttoMatic/87654321-1234-1234-1234-123456789abc");
    await writeFixture(nextRoot, "assets/test.png", "image");
    expect((await assets.register("OttoMatic", "editor-v1", nextRoot)).isOk()).toBe(true);
    if (oldRoot) {
      const old = await statOrMissing(oldRoot);
      expect(old.isOk() && old.value).toBeNull();
    }
    expect(await assets.resolve("assets/test.png")).toBe(path.join(nextRoot, "assets/test.png"));
    expect(assets.dataRoot("OttoMatic")).toBeNull();
  });

  it("reads and lists stock assets offline without registering an executable", async () => {
    const directory = path.join(root(), "editor-assets/OttoMatic/12345678-1234-1234-1234-123456789abc");
    const dataRoot = path.join(directory, "Data");
    await writeFixture(dataRoot, "Models/native.bg3d", "model");
    await writeFixture(dataRoot, "Images/palette.tga", "image");
    const assets = new EditorAssets(root());
    expect((await assets.register("OttoMatic", "4.0.1", directory, { source: "upstream", dataRoot,
      releaseUrl: "https://github.com/Jorio/OttoMatic/releases/tag/4.0.1" })).isOk()).toBe(true);
    const games = new GameStore(root(), vi.fn());
    const loaded = await games.assets.load();
    expect(loaded.isOk() && loaded.value[0]?.source).toBe("upstream");
    const files = await games.assetFiles("OttoMatic");
    expect(files.isOk() && files.value).toEqual([{ path: "Data/Images/palette.tga", size: 5 }, { path: "Data/Models/native.bg3d", size: 5 }]);
    const read = await games.readAsset("OttoMatic", "Data/Models/native.bg3d");
    expect(read.isOk() && read.value.bytes).toEqual(bytes("model"));
    expect((await games.readAsset("OttoMatic", "Data/../assets.json")).isErr()).toBe(true);
    expect((await games.launch("OttoMatic")).isErr()).toBe(true);
    expect((await games.removeAssets("OttoMatic")).isOk()).toBe(true);
    expect((await games.assetFiles("OttoMatic")).isErr()).toBe(true);
  });

  it("migrates existing editor registries and preserves previous stock after a failed update", async () => {
    expect(assetInstallationSchema.safeParse({ game: "OttoMatic", version: "v1", root: "/stock" }).data?.source).toBe("editor");
    const games = new GameStore(root(), vi.fn());
    const previous = path.join(root(), "editor-assets/OttoMatic/12345678-1234-1234-1234-123456789abc");
    await writeFixture(previous, "Data/System/stock", "retained");
    await games.assets.register("OttoMatic", "old", previous);
    vi.stubGlobal("fetch", async () => new Response(bytes("wrong hash")));
    const result = await games.installUpstreamData("OttoMatic");
    expect(result.isErr() && result.error.code).toBe("integrity");
    expect(await readFixture(previous, "Data/System/stock")).toBe("retained");
    const directories = await io(() => fs.readdir(path.dirname(previous)), "Cannot list installation fixture");
    expect(directories.isOk() && directories.value).toEqual([path.basename(previous)]);
    expect((await games.assets.load()).isOk()).toBe(true);
  });

  it("locks concurrent stock transfers and prevents removal while downloading", async () => {
    let finish: (response: Response) => void = () => undefined;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    const games = new GameStore(root(), vi.fn());
    const first = games.installUpstreamData("OttoMatic");
    const second = await games.installUpstreamData("Bugdom");
    expect(second.isErr() && second.error.code).toBe("busy");
    const removed = await games.removeAssets("OttoMatic");
    expect(removed.isErr() && removed.error.code).toBe("busy");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    games.cancel("OttoMatic");
    finish(new Response(bytes("cancelled")));
    expect((await first).isErr()).toBe(true);
    expect((await games.removeAssets("OttoMatic")).isOk()).toBe(true);
  });
});

const archiveDirectory = process.env.PANGEA_UPSTREAM_ARCHIVES;
describe.skipIf(!archiveDirectory)("cached official distribution integration", () => {
  it.each(upstreamCatalog())("verifies and extracts $game $version using the production paths", async (release) => {
    if (!archiveDirectory) return;
    const source = await io(() => fs.readFile(path.join(archiveDirectory, release.filename)), "Cannot read cached upstream archive");
    expect(source.isOk()).toBe(true);
    if (source.isErr()) return;
    expect(source.value.byteLength).toBe(release.size);
    expect(createHash("sha256").update(source.value).digest("hex")).toBe(release.sha256);
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(source.value)));
    const downloaded = path.join(root(), release.filename);
    expect((await downloadUpstream(release, downloaded, new AbortController().signal, vi.fn())).isOk()).toBe(true);
    const extracted = await unpackUpstream(release, downloaded, path.join(root(), "stock"), new AbortController().signal);
    expect(extracted.isOk()).toBe(true);
    expect(await readFixture(path.join(root(), "stock"), "License.txt")).toBeTruthy();
    const executable = await statOrMissing(path.join(root(), "stock", `${release.game}.exe`));
    expect(executable.isOk() && executable.value).toBeNull();
  }, 60000);
});
