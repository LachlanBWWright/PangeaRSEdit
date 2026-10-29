import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Result, ok } from "neverthrow";
import { zipSync } from "fflate";
import type { ReleaseAsset, ReleaseManifest } from "@pangea/desktop-contracts";
import { GameStore } from "../src/gameStore.ts";
import * as catalog from "../src/gameCatalog.ts";
import * as processes from "../src/processes.ts";
import { hash, io, statOrMissing } from "../src/files.ts";
import { bytes, readFixture, useTemporaryDirectory } from "./fixtures.ts";

const root = useTemporaryDirectory();

async function prepareInstall() {
  const packed = Result.fromThrowable(() => zipSync({ "OttoMatic/Data/System/boot": bytes("stock terrain"),
    "OttoMatic/Data/Terrain/EarthFarm.ter": bytes("native level"), "OttoMatic/Data/Models/Main.bg3d": bytes("native model"),
    "OttoMatic/OttoMatic": bytes("executable fixture") }), () => "Cannot zip fixture")();
  expect(packed.isOk()).toBe(true);
  const payload = packed.isOk() ? packed.value : new Uint8Array();
  const asset: ReleaseAsset = { game: "OttoMatic", kind: "runtime", platform: process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux", arch: process.arch === "arm64" ? "arm64" : "x64", filename: "otto-runtime.zip",
    format: "zip", size: payload.length, sha256: hash(payload) };
  const release: ReleaseManifest = { version: 1, tag: "v1", sourceRevision: "abc", assetRootVersion: 2, scriptContractVersion: 2, assets: [asset] };
  vi.spyOn(catalog, "fetchCatalog").mockResolvedValue(ok([release]));
  vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2"));
  const progress = vi.fn();
  const store = new GameStore(root(), progress);
  expect((await store.releases(false)).isOk()).toBe(true);
  return { store, payload, progress };
}

describe("download-to-install orchestration", () => {
  it("rejects an epoch-one executable from a download and local selection", async () => {
    const { store, payload } = await prepareInstall();
    vi.spyOn(processes, "runProcess").mockResolvedValue(ok("1"));
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    const downloaded = await store.install("OttoMatic", "v1");
    expect(downloaded.isErr() && downloaded.error.code).toBe("incompatible");
    const local = path.join(root(), "old-local-game");
    await fs.mkdir(path.join(local, "Data/System"), { recursive: true });
    await fs.writeFile(path.join(local, "OttoMatic"), "old executable fixture");
    const located = await store.locate("OttoMatic", local);
    expect(located.isErr() && located.error.code).toBe("incompatible");
    const registry = await statOrMissing(path.join(root(), "installed.json"));
    expect(registry.isOk() && registry.value).toBeNull();
  });

  it("verifies, extracts, registers, and reloads a compatible runtime", async () => {
    const { store, payload, progress } = await prepareInstall();
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1")).isOk()).toBe(true);
    expect(progress).toHaveBeenCalledWith("OttoMatic", payload.length, payload.length);
    const reopened = new GameStore(root(), () => undefined);
    const games = await reopened.load();
    expect(games.isOk() && games.value[0]?.managed).toBe(true);
    const installation = games.isOk() ? games.value[0] : undefined;
    if (!installation) return;
    const content = await io(() => fs.readFile(path.join(installation.data, "System/boot"), "utf8"), "Cannot read installed asset");
    expect(content.isOk() && content.value).toBe("stock terrain");
    const archive = await statOrMissing(path.join(path.dirname(installation.data), "..", "otto-runtime.zip"));
    expect(archive.isOk() && archive.value).toBeNull();
    expect((await reopened.assets.load()).isOk()).toBe(true);
    expect(await reopened.assets.resolve("assets/ottoMatic/terrain/EarthFarm.ter")).toBe(path.join(installation.data, "Terrain/EarthFarm.ter"));
    expect(await reopened.assets.resolve("games/ottomatic/models/Main.bg3d")).toBe(path.join(installation.data, "Models/Main.bg3d"));
    expect((await reopened.assetFiles("OttoMatic")).isOk()).toBe(true);
    expect((await reopened.remove("OttoMatic")).isOk()).toBe(true);
    expect(await reopened.assets.resolve("games/ottomatic/models/Main.bg3d")).toBeNull();
  });

  it("locates local stock data, serves it offline, and forgets it without deleting files", async () => {
    const folder = path.join(root(), "local-game");
    await fs.mkdir(path.join(folder, "Data/System"), { recursive: true });
    await fs.mkdir(path.join(folder, "Data/Terrain"));
    await fs.writeFile(path.join(folder, "OttoMatic"), "trusted executable fixture");
    await fs.writeFile(path.join(folder, "Data/System/boot"), "boot");
    await fs.writeFile(path.join(folder, "Data/Terrain/EarthFarm.ter"), "local stock");
    vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2"));
    const store = new GameStore(root(), vi.fn());
    expect((await store.locate("OttoMatic", folder)).isOk()).toBe(true);
    const reopened = new GameStore(root(), vi.fn());
    expect((await reopened.load()).isOk()).toBe(true);
    expect(await reopened.assets.resolve("assets/ottoMatic/terrain/EarthFarm.ter")).toBe(path.join(folder, "Data/Terrain/EarthFarm.ter"));
    expect((await reopened.remove("OttoMatic")).isOk()).toBe(true);
    expect(await reopened.assets.resolve("assets/ottoMatic/terrain/EarthFarm.ter")).toBeNull();
    expect(await readFixture(folder, "Data/Terrain/EarthFarm.ter")).toBe("local stock");
  });

  it("cleans an integrity failure, leaves the registry unchanged, and permits retry", async () => {
    const { store, payload } = await prepareInstall();
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
    const failed = await store.install("OttoMatic", "v1");
    expect(failed.isErr() && failed.error.code).toBe("integrity");
    const listing = await io(() => fs.readdir(path.join(root(), "OttoMatic")), "Cannot list fixture");
    expect(listing.isOk() && listing.value).toEqual([]);
    const registry = await statOrMissing(path.join(root(), "installed.json"));
    expect(registry.isOk() && registry.value).toBeNull();
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1")).isOk()).toBe(true);
    expect(await readFixture(root(), "installed.json")).toContain("OttoMatic");
  });

  it("blocks overlapping installs and cancellation releases the download slot", async () => {
    const { store, payload } = await prepareInstall();
    const fetch = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    const pending = store.install("OttoMatic", "v1");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const overlapping = await store.install("OttoMatic", "v1");
    expect(overlapping.isErr() && overlapping.error.code).toBe("busy");
    const removal = await store.remove("OttoMatic");
    expect(removal.isErr() && removal.error.code).toBe("busy");
    expect(store.cancel("OttoMatic").isOk()).toBe(true);
    expect((await pending).isErr()).toBe(true);
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1")).isOk()).toBe(true);
  });
});
