import { afterEach, expect, it, vi } from "vitest";
import { closeAssetWorker, convertBg3dToGltf } from "./modelAssets";
import { z } from "zod";

const posted = vi.fn<(message: unknown) => void>();
const terminated = vi.fn();
class FixtureWorker extends EventTarget {
  postMessage = posted;
  terminate = terminated;
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.clearAllMocks(); });

function worker() {
  vi.stubGlobal("Worker", FixtureWorker);
  return new Worker("fixture");
}

it("cancels pending conversion immediately when its owner closes", async () => {
  const converter = worker();
  const pending = convertBg3dToGltf(converter, new ArrayBuffer(4));
  closeAssetWorker(converter);
  const result = await pending;
  expect(result.isErr() ? result.error : null).toBe("Model worker cancelled");
  expect(terminated).toHaveBeenCalledTimes(1);
});

it("does not send a late download to an already closed converter", async () => {
  const converter = worker();
  closeAssetWorker(converter);
  const result = await convertBg3dToGltf(converter, new ArrayBuffer(4));
  expect(result.isErr() ? result.error : null).toBe("Model worker cancelled");
  expect(posted).not.toHaveBeenCalled();
});

it("rejects malformed worker responses and removes conversion listeners", async () => {
  const converter = worker();
  const removed = vi.spyOn(converter, "removeEventListener");
  const pending = convertBg3dToGltf(converter, new ArrayBuffer(4));
  const request = z.object({ type: z.string(), requestId: z.string() }).safeParse(posted.mock.calls[0]?.[0]);
  expect(request.success).toBe(true);
  if (!request.success) return;
  converter.dispatchEvent(new MessageEvent("message", { data: { ...request.data, result: "not binary" } }));
  const result = await pending;
  expect(result.isErr() ? result.error : null).toBe("Invalid model worker response");
  expect(removed).toHaveBeenCalledTimes(2);
});

it("times out a stalled worker without leaving a pending request", async () => {
  vi.useFakeTimers();
  const converter = worker();
  const pending = convertBg3dToGltf(converter, new ArrayBuffer(4));
  await vi.advanceTimersByTimeAsync(60_000);
  const result = await pending;
  expect(result.isErr() ? result.error : null).toBe("Native model conversion timed out");
  expect(vi.getTimerCount()).toBe(0);
});
