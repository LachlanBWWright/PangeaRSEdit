import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { inspectCustomObjectPlacementAtom, startCustomObjectPlacementAtom } from "./scriptPlacementNavigation";
import { SelectedCustomPlacementAtom } from "./scriptPlacementSelectionState";
import { openCustomObjectEditorAtom, scriptAuthoringSelectionAtom, updateScriptAuthoringSelectionAtom } from "./scriptAuthoringNavigation";

describe("custom object authoring navigation", () => {
  it.each(["appearance", "behavior", "usage", "collision"] satisfies readonly ("appearance" | "behavior" | "usage" | "collision")[])("opens the selected definition's %s inspector", (tab) => {
    const store = createStore();
    store.set(openCustomObjectEditorAtom, { gameId: "otto", definitionId: "moving-platform", tab });
    expect(store.get(ActiveView)).toBe(View.scripts);
    expect(store.get(scriptAuthoringSelectionAtom).otto).toEqual({ selectedId: "moving-platform", tab, section: "objects" });
  });

  it("keeps definition and inspector selection when placing or locating instances", () => {
    const store = createStore();
    store.set(openCustomObjectEditorAtom, { gameId: "otto", definitionId: "moving-platform", tab: "usage" });
    store.set(startCustomObjectPlacementAtom, "moving-platform");
    store.set(inspectCustomObjectPlacementAtom, "platform-instance-2");
    expect(store.get(ActiveView)).toBe(View.items);
    expect(store.get(SelectedCustomPlacementAtom)).toBe("platform-instance-2");
    expect(store.get(scriptAuthoringSelectionAtom).otto).toEqual({ selectedId: "moving-platform", tab: "usage", section: "objects" });
  });

  it("retains independent authoring context per game across source and test navigation", () => {
    const store = createStore();
    store.set(openCustomObjectEditorAtom, { gameId: "otto", definitionId: "platform", tab: "collision" });
    store.set(openCustomObjectEditorAtom, { gameId: "bugdom", definitionId: "trigger", tab: "behavior" });
    store.set(updateScriptAuthoringSelectionAtom, { gameId: "otto", selection: { section: "test" } });
    store.set(updateScriptAuthoringSelectionAtom, { gameId: "otto", selection: { section: "objects" } });
    expect(store.get(scriptAuthoringSelectionAtom).otto).toEqual({ selectedId: "platform", tab: "collision", section: "objects" });
    expect(store.get(scriptAuthoringSelectionAtom).bugdom).toEqual({ selectedId: "trigger", tab: "behavior", section: "objects" });
  });
});
