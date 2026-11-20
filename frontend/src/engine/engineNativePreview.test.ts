import { afterEach, describe, expect, it } from "vitest";
import type { DesktopBridge, HostRequest } from "@pangea/desktop-contracts";
import { startEngineNativePreview } from "./engineNativePreview";
import { createWorkshopPackage } from "./workshopPackage";
import { parseManifest } from "./enginePackage";

describe("native engine preview authoring boundary", () => {
  afterEach(() => { delete window.pangeaDesktop; });
  it("launches the selected scene without changing the authored start scene", async () => {
    const requests: HostRequest[] = [];
    const bridge: DesktopBridge = { request: async (request) => { requests.push(request); return { ok: true, value: { running: true, pid: 123, available: true, message: "Native game running." } }; }, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    window.pangeaDesktop = bridge;
    const sample = createWorkshopPackage();
    const result = await startEngineNativePreview(sample, "arena");
    expect(result.isOk()).toBe(true);
    const operation = requests[0];
    expect(operation?.operation).toBe("engine.preview");
    if (operation?.operation !== "engine.preview") return;
    const manifest = parseManifest({ files: operation.files });
    expect(manifest.isOk() && manifest.value.initialScene).toBe("arena");
    const original = parseManifest(sample);
    expect(original.isOk() && original.value.initialScene).toBe("menu");
  });
  it("rejects missing scene IDs before calling desktop transport", async () => {
    const result = await startEngineNativePreview(createWorkshopPackage(), "missing");
    expect(result.isErr() && result.error.code).toBe("invalid");
  });
});
