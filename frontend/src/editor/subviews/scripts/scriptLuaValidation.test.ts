import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLuaWorkspace, type LuaValidationWorker } from "./scriptLuaValidation";

function makeWorker(): LuaValidationWorker {
  return {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
}

const input = { modules: [{ path: "enemy.lua", source: "return {}" }], behaviors: [] };

afterEach(() => vi.useRealTimers());

describe("isolated Lua validation", () => {
  it("sends workspace sources and terminates after successful validation", async () => {
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    expect(worker.postMessage).toHaveBeenCalledWith(input);
    worker.onmessage?.(new MessageEvent("message", { data: { ok: true } }));
    expect((await pending).isOk()).toBe(true);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessage).toBeNull();
  });

  it("preserves source diagnostics returned by the worker", async () => {
    const worker = makeWorker();
    const diagnostics = [{ filePath: "enemy.lua", message: "expected end", phase: "syntax", line: 3 }];
    const pending = validateLuaWorkspace(input, () => worker);
    worker.onmessage?.(new MessageEvent("message", { data: { ok: false, diagnostics } }));
    const result = await pending;
    expect(result.isErr() && result.error).toEqual(diagnostics);
  });

  it("rejects malformed worker responses", async () => {
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    worker.onmessage?.(new MessageEvent("message", { data: { ok: false, diagnostics: [] } }));
    const result = await pending;
    expect(result.isErr() && result.error[0]?.message).toContain("invalid response");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("terminates module initialization that never completes", async () => {
    vi.useFakeTimers();
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    worker.onmessage?.(new MessageEvent("message", { data: { ready: true } }));
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;
    expect(result.isErr() && result.error[0]?.message).toContain("timed out");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("allows engine startup separately from the user-code deadline", async () => {
    vi.useFakeTimers();
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.onmessage?.(new MessageEvent("message", { data: { ready: true } }));
    await vi.advanceTimersByTimeAsync(4_999);
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.onmessage?.(new MessageEvent("message", { data: { ok: true } }));
    expect((await pending).isOk()).toBe(true);
  });

  it("terminates an engine that never becomes ready", async () => {
    vi.useFakeTimers();
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await pending;
    expect(result.isErr() && result.error[0]?.message).toContain("starting");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("cannot extend execution by sending repeated ready messages", async () => {
    vi.useFakeTimers();
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    worker.onmessage?.(new MessageEvent("message", { data: { ready: true } }));
    await vi.advanceTimersByTimeAsync(4_000);
    worker.onmessage?.(new MessageEvent("message", { data: { ready: true } }));
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await pending).isErr()).toBe(true);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("reports worker crashes as engine failures", async () => {
    const worker = makeWorker();
    const pending = validateLuaWorkspace(input, () => worker);
    worker.onerror?.(new ErrorEvent("error"));
    const result = await pending;
    expect(result.isErr() && result.error[0]?.phase).toBe("engine");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
