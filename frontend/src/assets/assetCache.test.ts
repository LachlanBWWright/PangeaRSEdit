import { afterEach, expect, it, vi } from "vitest";
import { errAsync, okAsync, ResultAsync, ok, type Result } from "neverthrow";
import { AssetCache } from "./assetCache";
import { getAssetState, resetAssets, updateAssetSources, versionedAssetUrl, type AssetFailure } from "./assetState";

afterEach(resetAssets);

it("derives URLs from an explicit revision so compiled React consumers can track changes", () => {
  const url = "/game-assets/OttoMatic/preview/home.glb?assetRevision=1";
  expect(versionedAssetUrl(url, 2)).toBe("/game-assets/OttoMatic/preview/home.glb?assetRevision=2");
  expect(versionedAssetUrl(url, 3)).toBe("/game-assets/OttoMatic/preview/home.glb?assetRevision=3");
});

it("shares in-flight loads and retries failures instead of caching errors", async () => {
  const cache = new AssetCache<number>(() => 1);
  const load = vi.fn(() => okAsync(42));
  expect(await cache.get("asset", load)).toEqual(await cache.get("asset", load));
  expect(load).toHaveBeenCalledTimes(1);
  const failed = await cache.get("broken", () => errAsync({ code: "missing", url: "broken", message: "Missing texture" }));
  expect(failed.isErr()).toBe(true);
  expect(getAssetState().failures).toContainEqual({ code: "missing", url: "broken", message: "Missing texture" });
  expect(await cache.get("broken", () => okAsync(7))).toMatchObject({ value: 7 });
});

it("rejects late results after a source change and clears all registered caches", async () => {
  const cache = new AssetCache<number>(() => 1);
  let complete: (value: Result<number, AssetFailure>) => void = vi.fn();
  const pending = cache.get("asset", () => ResultAsync.fromSafePromise(new Promise<Result<number, AssetFailure>>((resolve) => {
    complete = resolve;
  })).andThen((result) => result));
  resetAssets();
  complete(ok(1));
  const result = await pending;
  expect(result.isErr() ? result.error.code : null).toBe("stale");
  expect(getAssetState().failures).toHaveLength(0);
  expect(await cache.get("asset", () => okAsync(2))).toMatchObject({ value: 2 });
});

it("evicts least recently used entries within the configured memory budget", async () => {
  const cache = new AssetCache<number>((value) => value, 10);
  const load = vi.fn(() => okAsync(6));
  await cache.get("first", load);
  await cache.get("second", load);
  await cache.get("first", load);
  expect(load).toHaveBeenCalledTimes(3);
});

it("invalidates only when source identity changes", () => {
  updateAssetSources("first source");
  const revision = getAssetState().revision;
  updateAssetSources("first source");
  expect(getAssetState().revision).toBe(revision);
  updateAssetSources("second source");
  expect(getAssetState().revision).toBe(revision + 1);
});
