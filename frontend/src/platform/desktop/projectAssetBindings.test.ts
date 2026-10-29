import { afterEach, expect, it } from "vitest";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import { readBoundAssets } from "./projectAssetBindings";

const previous = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = previous; });
function project(): ProjectSnapshot {
  return { folder: "/project", revision: "saved", recoveryAvailable: false, files: [], manifest: {
    kind: "pangea-editor-project", version: 1, name: "Assigned images", game: "OttoMatic", levels: [], assetBindings: [
      { source: "Assets/all.png", target: "Data/Images/all.png", levels: [] },
      { source: "Assets/one.png", target: "Data/Images/scoped.png", levels: ["one"] },
    ],
  } };
}

it("stages global and selected-level replacements at their native paths", async () => {
  window.pangeaDesktop = { onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
    request: async (request) => request.operation === "project.read" ? { ok: true, value: request.paths.map((path) => ({ path, bytes: new Uint8Array([0, 255]) })) }
      : { ok: false, error: { code: "test", message: "Unexpected request" } } };
  const one = await readBoundAssets(project(), "one");
  expect(one.isOk() && one.value.map((file) => file.path)).toEqual(["Data/Images/all.png", "Data/Images/scoped.png"]);
  const two = await readBoundAssets(project(), "two");
  expect(two.isOk() && two.value.map((file) => file.path)).toEqual(["Data/Images/all.png"]);
});

it("rejects overlapping replacements and incompatible file types before staging", async () => {
  const p = project();
  p.manifest.assetBindings?.push({ source: "Assets/other.png", target: "Data/Images/all.png", levels: ["one"] });
  expect((await readBoundAssets(p, "one")).isErr()).toBe(true);
  p.manifest.assetBindings = [{ source: "Assets/not-model.png", target: "Data/Models/model.bg3d", levels: [] }];
  expect((await readBoundAssets(p, "one")).isErr()).toBe(true);
});
