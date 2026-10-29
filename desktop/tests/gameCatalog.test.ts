import { afterEach, describe, expect, it, vi } from "vitest";
import { gameIdSchema, releaseAssetSchema, type ReleaseManifest } from "@pangea/desktop-contracts";
import { completeRelease, fetchCatalog, releaseUrl } from "../src/gameCatalog.ts";

function manifest(tag = "v1"): ReleaseManifest {
  return { version: 1, tag, sourceRevision: "abc", assetRootVersion: 2, scriptContractVersion: 2,
    assets: gameIdSchema.options.flatMap((game) => [
      { game, kind: "editor-assets", platform: "web", arch: "wasm", filename: `${game}-assets.zip`, size: 42, sha256: "a".repeat(64), format: "zip" },
      ...["linux", "win32", "darwin"].map((platform) => ({ game, kind: "runtime", platform, arch: "x64", filename: `${game}-${platform}.zip`, size: 42, sha256: "a".repeat(64), format: "zip" })),
    ]).flatMap((asset) => {
      const parsed = releaseAssetSchema.safeParse(asset);
      expect(parsed.success).toBe(true);
      return parsed.success ? [parsed.data] : [];
    }),
  };
}

function listing(release: ReleaseManifest, prerelease = false, draft = false) {
  return { tag_name: release.tag, prerelease, draft, assets: [
    { name: "pangea-games.json", size: 10 }, ...release.assets.map((asset) => ({ name: asset.filename, size: asset.size })),
  ] };
}

afterEach(() => vi.unstubAllGlobals());

describe("release catalog boundary", () => {
  it("requires all games and three runtime platforms, without requiring editor packs", () => {
    const full = manifest();
    expect(completeRelease(full)).toBe(true);
    expect(completeRelease({ ...full, assets: full.assets.filter((asset) => asset.kind === "runtime") })).toBe(true);
    for (const asset of full.assets.filter((entry) => entry.kind === "runtime"))
      expect(completeRelease({ ...full, assets: full.assets.filter((entry) => entry !== asset) })).toBe(false);
  });

  it.each([false, true])("filters drafts and respects prerelease preference %s", async (prerelease) => {
    const stable = manifest("v1");
    const preview = manifest("v2-beta");
    const draft = manifest("draft");
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("api.github.com")) return Response.json([listing(stable), listing(preview, true), listing(draft, false, true)]);
      return Response.json(url.includes("v2-beta") ? preview : stable);
    });
    vi.stubGlobal("fetch", fetch);
    const result = await fetchCatalog(prerelease);
    expect(result.isOk() && result.value.map((release) => release.tag)).toEqual(prerelease ? ["v1", "v2-beta"] : ["v1"]);
    expect(fetch).toHaveBeenCalledTimes(prerelease ? 3 : 2);
  });

  it.each(["wrong-tag", "wrong-size", "missing-package", "incompatible", "incomplete", "invalid-json", "unavailable"])
  ("skips an unusable release and still offers later valid releases: %s", async (reason) => {
    const bad = manifest("bad");
    const good = manifest("good");
    const badListing = listing(bad);
    if (reason === "wrong-size") badListing.assets = badListing.assets.map((asset) => ({ ...asset, size: asset.size + 1 }));
    if (reason === "missing-package") badListing.assets = badListing.assets.slice(0, -1);
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("api.github.com")) return Response.json([badListing, listing(good)]);
      if (url.includes("/good/")) return Response.json(good);
      if (reason === "unavailable") return new Response(null, { status: 404 });
      if (reason === "invalid-json") return new Response("invalid JSON");
      return Response.json({ ...bad,
        tag: reason === "wrong-tag" ? "another-tag" : bad.tag,
        scriptContractVersion: reason === "incompatible" ? 99 : 2,
        assets: reason === "incomplete" ? [] : bad.assets,
      });
    });
    const result = await fetchCatalog(false);
    expect(result.isOk() && result.value).toEqual([{ ...good, assets: good.assets.filter((asset) => asset.kind === "runtime") }]);
  });

  it.each([401, 403, 429, 500])("returns a network failure for HTTP %s", async (status) => {
    vi.stubGlobal("fetch", async () => new Response(null, { status }));
    const result = await fetchCatalog(false);
    expect(result.isErr() && result.error.code).toBe("network");
  });

  it("returns a typed offline failure", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    const result = await fetchCatalog(false);
    expect(result.isErr() && result.error.message).toContain("offline");
  });

  it.each([{}, [{ tag_name: "v1" }]])("rejects malformed release listings: %j", async (payload) => {
    vi.stubGlobal("fetch", async () => Response.json(payload));
    const result = await fetchCatalog(false);
    expect(result.isErr() && result.error.code).toBe("invalid");
  });

  it("escapes tag and filename URL segments", () => {
    expect(releaseUrl("tag/with space", "file?name.zip")).toContain("tag%2Fwith%20space/file%3Fname.zip");
  });
});
