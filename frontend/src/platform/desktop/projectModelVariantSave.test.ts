import { afterEach, describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import type { HostRequest, ProjectAsset, ProjectSnapshot } from "@pangea/desktop-contracts";
import { acceptProjectModelVariant, saveProjectModelVariant } from "./projectModelVariantSave";

const id = "00000000-0000-4000-8000-000000000001";
const revision = "00000000-0000-4000-8000-000000000002";
const path = `Assets/Models/${id}/${revision}/model.bg3d`;
const asset: ProjectAsset = {
  version: 1, id, revision, name: "Robot", game: "OttoMatic", importedAt: "2026-10-22", previousRevision: null,
  source: { mode: "managed", path: "AuthoringSources/robot.glb", originalName: "robot.glb", format: "glb", dependencies: [], fingerprint: "source" },
  outputs: { model: path, skeleton: null, preview: path.replace("bg3d", "glb"), files: [path, path.replace("bg3d", "glb")] },
  animations: [], warnings: [], recipe: { scale: 1, rotation: [0, 0, 0] },
};
const snapshot: ProjectSnapshot = { folder: "/project", revision: "new", recoveryAvailable: false,
  manifest: { kind: "pangea-editor-project", version: 1, name: "Model project", game: "OttoMatic", levels: [] }, files: [],
};
const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

function installBridge(needsReview = false) {
  const requests: HostRequest[] = [];
  window.pangeaDesktop = {
    onTransfer: () => () => undefined, onProjectChange: () => () => undefined,
    request: async (request) => {
      requests.push(request);
      if (request.operation === "assets.list") return { ok: true, value: [asset] };
      if (request.operation === "assets.import-buffer") return { ok: true, value: { asset: { ...asset, id: "00000000-0000-4000-8000-000000000003", parentAssetId: id }, needsReview, reasons: needsReview ? ["Material simplified"] : [] } };
      if (request.operation === "assets.accept") return { ok: true, value: asset };
      if (request.operation === "project.inspect") return { ok: true, value: snapshot };
      return { ok: false, error: { code: "invalid", message: "Unexpected operation" } };
    },
  };
  return requests;
}

describe("model viewer asset variants", () => {
  it("imports edited GLB as a new identity with its original parent, never saves shared files", async () => {
    const requests = installBridge();
    const bytes = new Uint8Array([1, 2, 3]);
    const exportFiles = vi.fn(async () => ok([{ path: "edited.glb", bytes }, { path: "edited.bg3d", bytes: new Uint8Array([4]) }]));
    const result = await saveProjectModelVariant("Robot variant", path, exportFiles);
    expect(result.isOk()).toBe(true);
    expect(requests).toContainEqual({ operation: "assets.import-buffer", name: "Robot variant", bytes, format: "glb", sourceAssetId: id });
    expect(requests.map((request) => request.operation)).toEqual(["assets.list", "assets.import-buffer", "project.inspect"]);
  });

  it("requires explicit acceptance of a staged conversion", async () => {
    const requests = installBridge(true);
    const result = await saveProjectModelVariant("Robot variant", path, async () => ok([{ path: "edited.glb", bytes: new Uint8Array([1]) }]));
    expect(result.isOk() && result.value.imported.needsReview).toBe(true);
    expect(requests.some((request) => request.operation === "assets.accept")).toBe(false);
    if (result.isOk()) expect((await acceptProjectModelVariant(result.value.imported)).isOk()).toBe(true);
    expect(requests.map((request) => request.operation).slice(-2)).toEqual(["assets.accept", "project.inspect"]);
  });

  it("retains legacy model opening while saving its edits as an independent asset", async () => {
    const requests = installBridge();
    await saveProjectModelVariant("Legacy variant", "Assets/models/legacy.bg3d", async () => ok([{ path: "legacy.glb", bytes: new Uint8Array([1]) }]));
    expect(requests).toContainEqual({ operation: "assets.import-buffer", name: "Legacy variant", bytes: new Uint8Array([1]), format: "glb", sourceAssetId: undefined });
  });

  it("rejects exports without an editable GLB before modifying the project", async () => {
    const requests = installBridge();
    const result = await saveProjectModelVariant("Robot", path, async () => ok([{ path: "edited.bg3d", bytes: new Uint8Array([1]) }]));
    expect(result.isErr()).toBe(true);
    expect(requests).toEqual([]);
  });
});
