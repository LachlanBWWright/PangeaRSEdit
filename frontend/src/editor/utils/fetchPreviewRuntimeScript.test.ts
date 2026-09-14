import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPreviewRuntimeScript } from "./fetchPreviewRuntimeScript";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchPreviewRuntimeScript", () => {
  it("times out when headers arrive but the script body stalls", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          options.signal?.addEventListener("abort", () => {
            controller.error(new Error("aborted"));
          });
        },
      });
      return Promise.resolve(new Response(body));
    }));

    const pending = fetchPreviewRuntimeScript("https://example.com/game.js");
    await vi.advanceTimersByTimeAsync(20_000);
    const result = await pending;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("Timed out downloading");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns the complete script and clears the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("runtime source")));
    const result = await fetchPreviewRuntimeScript("https://example.com/game.js");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toBe("runtime source");
    expect(vi.getTimerCount()).toBe(0);
  });
});
