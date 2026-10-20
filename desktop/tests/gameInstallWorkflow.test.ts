import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Result, ok } from "neverthrow";
import { zipSync } from "fflate";
import type { ReleaseAsset, ReleaseManifest } from "@pangea/desktop-contracts";
import { GameStore } from "../src/gameStore.ts";
import * as catalog from "../src/gameCatalog.ts";
import { hash, io, statOrMissing } from "../src/files.ts";
import { bytes, readFixture, useTemporaryDirectory } from "./fixtures.ts";

const root = useTemporaryDirectory();

async function prepareInstall() {
  const packed = Result.fromThrowable(() => zipSync({ "OttoMatic/Data/level.ter": bytes("stock terrain") }), () => "Cannot zip fixture")();
  expect(packed.isOk()).toBe(true);
  const payload = packed.isOk() ? packed.value : new Uint8Array();
  const asset: ReleaseAsset = { game: "OttoMatic", kind: "editor-assets", platform: "web", arch: "wasm", filename: "otto-assets.zip",
    format: "zip", size: payload.length, sha256: hash(payload) };
  const release: ReleaseManifest = { version: 1, tag: "v1", sourceRevision: "abc", assetRootVersion: 1, scriptContractVersion: 1, assets: [asset] };
  vi.spyOn(catalog, "fetchCatalog").mockResolvedValue(ok([release]));
  const progress = vi.fn();
  const store = new GameStore(root(), progress);
  expect((await store.releases(false)).isOk()).toBe(true);
  return { store, payload, progress };
}

describe("download-to-install orchestration", () => {
  it("verifies, extracts, registers, and reloads optional assets without a runtime", async () => {
    const { store, payload, progress } = await prepareInstall();
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1", "editor-assets")).isOk()).toBe(true);
    expect(progress).toHaveBeenCalledWith("OttoMatic", payload.length, payload.length);
    const reopened = new GameStore(root(), () => undefined);
    expect((await reopened.assets.load()).isOk()).toBe(true);
    const location = await reopened.assets.resolve("OttoMatic/Data/level.ter");
    expect(location).not.toBeNull();
    if (!location) return;
    const content = await io(() => fs.readFile(location, "utf8"), "Cannot read installed asset");
    expect(content.isOk() && content.value).toBe("stock terrain");
    const archive = await statOrMissing(path.join(path.dirname(path.dirname(path.dirname(location))), "otto-assets.zip"));
    expect(archive.isOk() && archive.value).toBeNull();
    const games = await reopened.load();
    expect(games.isOk() && games.value).toEqual([]);
  });

  it("cleans an integrity failure, leaves the registry unchanged, and permits retry", async () => {
    const { store, payload } = await prepareInstall();
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
    const failed = await store.install("OttoMatic", "v1", "editor-assets");
    expect(failed.isErr() && failed.error.code).toBe("integrity");
    const listing = await io(() => fs.readdir(path.join(root(), "editor-assets/OttoMatic")), "Cannot list fixture");
    expect(listing.isOk() && listing.value).toEqual([]);
    const registry = await statOrMissing(path.join(root(), "assets.json"));
    expect(registry.isOk() && registry.value).toBeNull();
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1", "editor-assets")).isOk()).toBe(true);
    expect(await readFixture(root(), "assets.json")).toContain("OttoMatic");
  });

  it("blocks overlapping installs and cancellation releases the download slot", async () => {
    const { store, payload } = await prepareInstall();
    const fetch = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    const pending = store.install("OttoMatic", "v1", "editor-assets");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const overlapping = await store.install("OttoMatic", "v1", "editor-assets");
    expect(overlapping.isErr() && overlapping.error.code).toBe("busy");
    expect(store.cancel("OttoMatic").isOk()).toBe(true);
    expect((await pending).isErr()).toBe(true);
    vi.stubGlobal("fetch", async () => new Response(Uint8Array.from(payload)));
    expect((await store.install("OttoMatic", "v1", "editor-assets")).isOk()).toBe(true);
  });
});
