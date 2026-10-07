import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { createCustomObjectFromStarter } from "./scriptObjectStarters";
import { createObjectVisual } from "./scriptObjectVisualDefaults";
import { applyPreparedObjectAsset, commitPreparedObjectAsset } from "./scriptObjectAssetUpload";

function fixture() {
  const empty = ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 1));
  const created = createCustomObjectFromStarter(empty, "enemy", "Robot");
  if (created.isErr()) return null;
  const original = created.value.customObjects[0];
  if (!original) return null;
  const definition = { ...original, visual: createObjectVisual("customDisplayGroup", "Bugdom2-Android") };
  return { definition, state: { ...created.value, customObjects: [definition] } };
}

describe("asynchronous custom model attachment", () => {
  it("keeps edits made while asset conversion was in progress", () => {
    const initial = fixture();
    expect(initial).not.toBeNull();
    if (!initial || initial.definition.visual.kind !== "customDisplayGroup") return;
    const live = { ...initial.definition, label: "Renamed robot", visual: { ...initial.definition.visual, modelObject: 3, scale: 2 } };
    const next = applyPreparedObjectAsset({ ...initial.state, customObjects: [live] }, {
      definition: initial.definition, role: "model", manifestPath: "Data/Scripts/assets/models/robot.bg3d", assetPath: "Data/Scripts/assets/models/robot.bg3d",
      sourceName: "robot.bg3d", sourceBytes: new Uint8Array([1]), runtimeBytes: new Uint8Array([2]),
    });
    expect(next.customObjects[0]?.label).toBe("Renamed robot");
    expect(next.customObjects[0]?.visual).toMatchObject({ modelObject: 3, scale: 2, modelPath: "Data/Scripts/assets/models/robot.bg3d" });
    expect(next.assets["Data/Scripts/assets/models/robot.bg3d"]?.bytes).toEqual(new Uint8Array([2]));
  });
  it("drops an obsolete upload after the item was deleted", () => {
    const initial = fixture();
    expect(initial).not.toBeNull();
    if (!initial) return;
    const deleted = { ...initial.state, customObjects: [] };
    expect(applyPreparedObjectAsset(deleted, {
      definition: initial.definition, role: "model", manifestPath: "Data/Scripts/assets/models/robot.bg3d", assetPath: "Data/Scripts/assets/models/robot.bg3d",
      sourceName: "robot.bg3d", sourceBytes: new Uint8Array([1]), runtimeBytes: new Uint8Array([2]),
    })).toBe(deleted);
  });
  it("reports a stale upload and retains conversion warnings only after a successful commit", () => {
    const initial = fixture();
    expect(initial).not.toBeNull(); if (!initial) return;
    const asset = {
      definition: initial.definition, role: "model", manifestPath: "Data/Scripts/assets/models/robot.bg3d", assetPath: "Data/Scripts/assets/models/robot.bg3d",
      sourceName: "robot.bg3d", sourceBytes: new Uint8Array([1]), runtimeBytes: new Uint8Array([2]), warnings: ["Animation needs review"],
    } satisfies Parameters<typeof commitPreparedObjectAsset>[1];
    expect(commitPreparedObjectAsset({ ...initial.state, customObjects: [] }, asset).isErr()).toBe(true);
    const committed = commitPreparedObjectAsset(initial.state, asset);
    expect(committed.isOk()).toBe(true);
    if (committed.isOk()) expect(committed.value.diagnostics).toContainEqual(expect.objectContaining({ severity: "warning", message: "Animation needs review" }));
  });
});
