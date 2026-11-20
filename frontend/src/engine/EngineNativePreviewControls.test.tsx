import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesktopBridge } from "@pangea/desktop-contracts";
import { EngineNativePreviewControls } from "./EngineNativePreviewControls";
import { createWorkshopPackage } from "./workshopPackage";

afterEach(() => { delete window.pangeaDesktop; vi.useRealTimers(); });

describe("native preview process lifetime controls", () => {
  it("observes an external window closing and disposes its process polling", async () => {
    vi.useFakeTimers();
    let running = true, requests = 0;
    const bridge: DesktopBridge = { request: async () => { requests++; return { ok: true, value: { available: true, running, pid: running ? 44 : null, message: running ? "Native game running." : "Native game closed." } }; }, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    window.pangeaDesktop = bridge;
    const container = document.createElement("div");
    const root = createRoot(container);
    const dispatch = vi.fn();
    await act(async () => root.render(<EngineNativePreviewControls packageData={createWorkshopPackage()} dispatch={dispatch} />));
    const buttons = container.querySelectorAll("button");
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(false);
    running = false;
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(true);
    expect(container.textContent).toContain("Native game closed.");
    expect(dispatch).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    const completedRequests = requests;
    await vi.advanceTimersByTimeAsync(3000);
    expect(requests).toBe(completedRequests);
  });
  it("keeps actionable launch errors visible across unchanged status refreshes", async () => {
    const bridge: DesktopBridge = { request: async (request) => request.operation === "engine.preview" ? { ok: false, error: { code: "unavailable", message: "Build the native engine with scripts/build-games.sh --game sandbox --native." } } : { ok: true, value: { available: false, running: false, pid: null, message: "Native engine is not built." } }, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    window.pangeaDesktop = bridge;
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<EngineNativePreviewControls packageData={createWorkshopPackage()} dispatch={vi.fn()} />));
    expect(container.textContent).toContain("Native engine is not built.");
    await act(async () => container.querySelector("button")?.click());
    expect(container.textContent).toContain("Build the native engine with scripts/build-games.sh --game sandbox --native.");
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(container.textContent).toContain("Build the native engine with scripts/build-games.sh --game sandbox --native.");
    expect(container.querySelectorAll("button")[1]?.disabled).toBe(true);
    await act(async () => root.unmount());
  });
});
