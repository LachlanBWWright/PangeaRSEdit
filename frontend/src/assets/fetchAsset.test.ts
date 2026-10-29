import { afterEach, expect, it, vi } from "vitest";
import { fetchAsset } from "./fetchAsset";
import { resetAssets } from "./assetState";

afterEach(() => { resetAssets(); vi.unstubAllGlobals(); });
it("preserves the host's actionable missing-data error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    code: "missing", message: "Missing OttoMatic asset: Models/level.bg3d",
  }), { status: 404, headers: { "Content-Type": "application/json" } })));
  const result = await fetchAsset("/game-assets/OttoMatic/Data/Models/level.bg3d");
  expect(result.isErr() ? result.error.message : null).toBe("Missing OttoMatic asset: Models/level.bg3d");
});

it("rejects an HTML fallback before passing it to a binary parser", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } })));
  const result = await fetchAsset("/missing.bg3d");
  expect(result.isErr() ? result.error.code : null).toBe("invalid");
});

it("makes a fresh versioned request after source reset", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]))));
  vi.stubGlobal("fetch", fetch);
  expect((await fetchAsset("/game-assets/OttoMatic/Data/Models/level.bg3d")).isOk()).toBe(true);
  resetAssets();
  expect((await fetchAsset("/game-assets/OttoMatic/Data/Models/level.bg3d")).isOk()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1]?.[0]).toContain("assetRevision=");
});
