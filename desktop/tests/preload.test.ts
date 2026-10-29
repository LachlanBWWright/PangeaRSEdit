import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DesktopBridge } from "@pangea/desktop-contracts";

const boundary = vi.hoisted(() => ({
  expose: vi.fn<(name: string, bridge: DesktopBridge) => void>(),
  invoke: vi.fn(async () => ({ ok: true, value: undefined })),
  on: vi.fn<(channel: string, listener: (event: unknown, payload: unknown) => void) => void>(),
  removeListener: vi.fn(),
}));
vi.mock("electron", () => ({ contextBridge: { exposeInMainWorld: boundary.expose }, ipcRenderer: boundary }));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  await import("../src/preload.ts");
});

describe("sandbox preload bridge", () => {
  it("exposes the restricted bridge and forwards requests on its fixed channel", async () => {
    const [name, bridge] = boundary.expose.mock.calls[0] ?? [];
    expect(name).toBe("pangeaDesktop");
    expect(Object.keys(bridge ?? {}).sort()).toEqual(["onAssetProgress", "onCommand", "onGameRun", "onProjectChange", "onTransfer", "platform", "request", "security"]);
    await bridge?.request({ operation: "host.info" });
    expect(boundary.invoke).toHaveBeenCalledWith("pangea:request", { operation: "host.info" });
  });

  it.each([["project", "pangea:project-change"], ["transfer", "pangea:transfer"], ["command", "pangea:command"], ["run", "pangea:game-runs"], ["asset", "pangea:asset-progress"]])("forwards %s payloads without leaking the Electron event and unsubscribes precisely", (event, expectedChannel) => {
    const bridge = boundary.expose.mock.calls[0]?.[1];
    expect(bridge).toBeDefined();
    if (!bridge) return;
    const listener = vi.fn();
    const unsubscribe = event === "project" ? bridge.onProjectChange(listener)
      : event === "transfer" ? bridge.onTransfer(listener) : event === "run" ? bridge.onGameRun?.(listener)
        : event === "asset" ? bridge.onAssetProgress?.(listener) : bridge.onCommand?.(listener);
    const subscription = boundary.on.mock.lastCall;
    expect(subscription).toBeDefined();
    if (!subscription) return;
    const [channel, handler] = subscription;
    expect(channel).toBe(expectedChannel);
    const payload = { value: 42 };
    handler({ privileged: true }, payload);
    expect(listener).toHaveBeenCalledExactlyOnceWith(payload);
    unsubscribe?.();
    expect(boundary.removeListener).toHaveBeenCalledExactlyOnceWith(channel, handler);
  });
});
