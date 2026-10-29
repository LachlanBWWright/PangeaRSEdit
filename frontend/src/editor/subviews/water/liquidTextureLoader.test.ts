import { afterEach, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { loadImageAsset as loadLiquidTexture } from "@/assets/imageAssets";

vi.mock("@/utils/tgaImageParser", () => ({
  parseTGAToCanvas: () => ok(document.createElement("canvas")),
}));
afterEach(() => vi.unstubAllGlobals());

it("shares one decoded texture across concurrent pools and later mounts", async () => {
  const request = vi.fn(() => Promise.resolve(new Response(new Uint8Array([1]))));
  vi.stubGlobal("fetch", request);
  const source = { url: "/water-concurrent.tga", format: "tga" } satisfies Parameters<typeof loadLiquidTexture>[0];
  const results = await Promise.all(Array.from({ length: 7 }, () => loadLiquidTexture(source)));
  expect(request).toHaveBeenCalledTimes(1);
  const first = results[0];
  expect(first?.isOk()).toBe(true);
  if (!first?.isOk()) return;
  for (const result of results) expect(result.isOk() && result.value).toBe(first.value);
  const later = await loadLiquidTexture({ ...source });
  expect(later.isOk() && later.value).toBe(first.value);
  expect(request).toHaveBeenCalledTimes(1);
});

it("allows a failed asset load to be retried", async () => {
  const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response(new Uint8Array([1])));
  vi.stubGlobal("fetch", request);
  const source = { url: "/water-retry.tga", format: "tga" } satisfies Parameters<typeof loadLiquidTexture>[0];
  expect((await loadLiquidTexture(source)).isErr()).toBe(true);
  expect((await loadLiquidTexture(source)).isOk()).toBe(true);
  expect(request).toHaveBeenCalledTimes(2);
});
